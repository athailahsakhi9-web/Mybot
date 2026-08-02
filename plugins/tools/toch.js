const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const MIN_VALID_SIZE = 1024; // bytes, di bawah ini dianggap kosong/corrupt

function getArgText(args = []) {
  return Array.isArray(args) ? args.join(" ").trim() : String(args || "").trim();
}

/**
 * Terima salah satu dari:
 * - URL channel: https://whatsapp.com/channel/0029Vb7TkCcD38CStrAMMb3N
 * - Invite code mentah: 0029Vb7TkCcD38CStrAMMb3N
 * - JID newsletter langsung: 1203xxxxxxxxx@newsletter
 */
function parseChannelInput(input) {
  if (!input) return null;
  const trimmed = input.trim();

  if (/@newsletter$/i.test(trimmed)) {
    return { jid: trimmed };
  }

  const urlMatch = trimmed.match(/whatsapp\.com\/channel\/([A-Za-z0-9]+)/i);
  if (urlMatch) {
    return { code: urlMatch[1] };
  }

  if (/^[A-Za-z0-9]{10,}$/.test(trimmed)) {
    return { code: trimmed };
  }

  return null;
}

/**
 * Convert URL/code channel menjadi JID newsletter pakai sock.newsletterMetadata.
 * Fungsi & shape response ini tergantung versi Baileys — sesuaikan kalau berbeda.
 */
async function resolveChannelJid(sock, rawInput) {
  const parsed = parseChannelInput(rawInput);
  if (!parsed) {
    throw new Error(
      "Link/kode channel tidak valid. Contoh: https://whatsapp.com/channel/xxxxxxxx"
    );
  }

  if (parsed.jid) {
    return { jid: parsed.jid, metadata: null };
  }

  if (typeof sock.newsletterMetadata !== "function") {
    throw new Error(
      "Fungsi newsletterMetadata tidak ada di versi Baileys yang dipakai. Update Baileys atau cek nama fungsi yang sesuai."
    );
  }

  let metadata;
  try {
    metadata = await sock.newsletterMetadata("invite", parsed.code);
  } catch (e) {
    throw new Error(
      "Gagal mengambil info channel dari link tersebut. Pastikan link valid dan channel-nya publik."
    );
  }

  if (!metadata || !metadata.id) {
    throw new Error("Channel tidak ditemukan dari link tersebut.");
  }

  return { jid: metadata.id, metadata };
}

/**
 * Best-effort cek apakah bot admin/owner di channel tersebut.
 * Mengembalikan: true (admin), false (bukan admin), null (tidak bisa dipastikan -> skip cek).
 */
function isBotAdminFromMetadata(metadata) {
  if (!metadata) return null;

  const role =
    metadata.viewer_metadata?.role ||
    metadata.viewer_role ||
    metadata.role ||
    null;

  if (!role) return null;

  const normalized = String(role).toUpperCase();
  return normalized === "ADMIN" || normalized === "OWNER";
}

function detectImageExt(buffer) {
  if (!buffer || buffer.length < 4) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return ".jpg";
  if (buffer.slice(0, 8).toString("hex") === "89504e470d0a1a0a") return ".png";
  if (buffer.slice(0, 4).toString("utf8") === "GIF8") return ".gif";
  if (
    buffer.slice(0, 4).toString("utf8") === "RIFF" &&
    buffer.slice(8, 12).toString("utf8") === "WEBP"
  ) {
    return ".webp";
  }

  return null;
}

function detectAudioExt(buffer) {
  if (!buffer || buffer.length < 4) return null;

  if (buffer.slice(0, 3).toString("utf8") === "ID3") return ".mp3";
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return ".mp3";
  if (buffer.slice(0, 4).toString("utf8") === "OggS") return ".ogg";
  if (buffer.slice(0, 4).toString("utf8") === "RIFF") return ".wav";
  if (buffer.slice(4, 8).toString("utf8") === "ftyp") return ".m4a";

  return null;
}

function saveBufferAsAudio(buffer, tempDir) {
  if (!Buffer.isBuffer(buffer) || buffer.length < MIN_VALID_SIZE) {
    throw new Error("File yang di-reply kosong/corrupt.");
  }

  const imageExt = detectImageExt(buffer);
  if (imageExt) {
    throw new Error(
      `File yang berhasil di-download ternyata gambar (${imageExt}), bukan audio.\n` +
        "Kemungkinan: (1) kamu reply ke pesan foto bukan file MP3-nya, atau " +
        "(2) ada bug di fungsi download quoted message yang malah ngambil thumbnail/gambar. " +
        "Pastikan reply langsung ke pesan yang isinya file audio."
    );
  }

  const ext = detectAudioExt(buffer) || ".mp3";
  fs.mkdirSync(tempDir, { recursive: true });
  const outPath = path.join(tempDir, `toch_${Date.now()}${ext}`);
  fs.writeFileSync(outPath, buffer);
  return outPath;
}

async function toOpus(inputPath) {
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, path.extname(inputPath));
  // Pakai suffix unik, JANGAN cuma strip+ganti ekstensi — kalau input-nya
  // udah .ogg (misal voice note WA asli), strip+ganti ekstensi bisa
  // menghasilkan path yang SAMA dengan input, bikin ffmpeg nulis ke file
  // yang masih dia baca sendiri -> output korup tapi proses "sukses" tanpa error.
  const outputPath = path.join(dir, `${base}_opus_${Date.now()}.ogg`);

  if (path.resolve(outputPath) === path.resolve(inputPath)) {
    throw new Error("Output path sama dengan input path, dibatalkan demi keamanan file.");
  }

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-analyzeduration", "20000000",
      "-probesize", "20000000",
      "-i", inputPath,
      "-ac", "1",
      "-ar", "48000",
      "-c:a", "libopus",
      "-b:a", "64k",
      "-vn",
      outputPath,
    ]);
  } catch (e) {
    const stderrTail = String(e.stderr || e.message || "")
      .split("\n")
      .slice(-6)
      .join("\n");
    throw new Error(
      `Gagal konversi audio (file mungkin corrupt/format tidak didukung).\n${stderrTail}`
    );
  }

  return outputPath;
}

async function getQuotedAudioBuffer(m) {
  const quoted = m.quoted || m.msg?.quoted || null;
  if (!quoted) return null;

  if (typeof quoted.download === "function") {
    const downloaded = await quoted.download();
    if (Buffer.isBuffer(downloaded)) return downloaded;
  }

  return null;
}

async function getAudioDurationSeconds(filePath) {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const seconds = Math.round(parseFloat(stdout.trim()));
    return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
  } catch {
    // Kalau ffprobe gak ada/gagal, tetap lanjut tanpa seconds (bukan fatal).
    return undefined;
  }
}

async function sendToChannel(sock, jid, audioPath) {
  // PENTING: baca full file jadi Buffer dulu, JANGAN pakai { url: audioPath }.
  // Kalau pakai url, Baileys upload via stream dari disk — dan karena file ini
  // langsung dihapus di blok finally setelah sendMessage() resolve, ada race
  // condition: kadang stream belum kelar ke-flush/ke-upload sepenuhnya pas
  // promise-nya resolve, hasilnya pesan "terkirim" tapi audionya korup/gak
  // bisa diputar. Pakai Buffer memastikan seluruh isi file sudah di-load ke
  // memori SEBELUM proses upload jalan, jadi aman walau file dihapus setelahnya.
  const buffer = fs.readFileSync(audioPath);
  const seconds = await getAudioDurationSeconds(audioPath);

  await sock.sendMessage(jid, {
    audio: buffer,
    mimetype: "audio/ogg; codecs=opus",
    ptt: false,
    ...(seconds ? { seconds } : {}),
  });
}

module.exports = {
  config: {
    name: "toch",
    alias: ["mp3tochannel", "tochannel"],
    category: "tools",
    description:
      "Reply file MP3 lalu kirim ke channel WhatsApp (auto-convert ke Opus). Bot harus admin di channel tujuan.",
    usage: "<url channel> (reply MP3)",
    isEnabled: true,
    cooldown: 5,
  },

  async handler(m, { sock, args }) {
    const tempDir = path.join(process.cwd(), "output");
    const tempFiles = [];

    try {
      const urlChannel = getArgText(args);
      if (!urlChannel) {
        return m.reply(
          "Reply file MP3 lalu kirim link channel-nya.\nContoh: `.toch https://whatsapp.com/channel/xxxxxxxx`"
        );
      }

      const quotedBuffer = await getQuotedAudioBuffer(m);
      if (!quotedBuffer) {
        return m.reply("Reply pesan yang berisi file MP3 dulu, baru jalankan command ini.");
      }

      // 1. Convert link channel -> JID newsletter
      const { jid, metadata } = await resolveChannelJid(sock, urlChannel);

      // 2. Best-effort cek admin (skip kalau tidak bisa dipastikan dari metadata)
      const adminStatus = isBotAdminFromMetadata(metadata);
      if (adminStatus === false) {
        return m.reply(
          "❌ Bot belum jadi admin di channel ini. Jadikan bot admin dulu, baru kirim ulang."
        );
      }

      // 3. Simpan MP3 hasil reply
      const inputPath = saveBufferAsAudio(quotedBuffer, tempDir);
      tempFiles.push(inputPath);

      // 4. Convert ke Opus
      const opusPath = await toOpus(inputPath);
      tempFiles.push(opusPath);

      // 5. Kirim ke channel
      await sendToChannel(sock, jid, opusPath);

      return m.reply(`✅ Audio berhasil dikirim ke channel.\nJID: ${jid}`);
    } catch (e) {
      return m.reply(`❌ Gagal memproses audio.\n\n${e.message}`);
    } finally {
      for (const file of tempFiles) {
        try {
          if (file && fs.existsSync(file)) fs.unlinkSync(file);
        } catch {}
      }
    }
  },
};
