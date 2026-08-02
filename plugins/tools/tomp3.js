const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const MIN_VALID_SIZE = 1024; // bytes, di bawah ini dianggap kosong/corrupt

function getArgText(args = []) {
  return Array.isArray(args) ? args.join(" ").trim() : String(args || "").trim();
}

async function react(sock, m, emoji) {
  try {
    if (typeof m.react === "function") {
      await m.react(emoji);
    } else {
      await sock.sendMessage(m.chat, {
        react: { text: emoji, key: m.key },
      });
    }
  } catch (e) {
    // Diamkan saja kalau gagal react, jangan sampai mengganggu flow utama
  }
}

function looksLikeHtmlOrText(buffer) {
  if (!buffer || buffer.length < 5) return false;
  const head = buffer.slice(0, 20).toString("utf8").trim().toLowerCase();
  return (
    head.startsWith("<!doctype") ||
    head.startsWith("<html") ||
    head.startsWith("{") ||
    head.startsWith("[")
  );
}

/**
 * Deteksi ekstensi video dari magic bytes, bukan asumsi/nama file.
 */
function detectVideoExt(buffer) {
  if (!buffer || buffer.length < 8) return null;

  // MP4/MOV/M4V family (ftyp box di offset 4)
  if (buffer.slice(4, 8).toString("utf8") === "ftyp") return ".mp4";

  // WebM/MKV (EBML header)
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return ".webm";
  }

  // AVI (RIFF....AVI )
  if (buffer.slice(0, 4).toString("utf8") === "RIFF" && buffer.slice(8, 12).toString("utf8") === "AVI ") {
    return ".avi";
  }

  return null;
}

function saveBufferAsVideo(buffer, tempDir) {
  if (!Buffer.isBuffer(buffer) || buffer.length < MIN_VALID_SIZE) {
    throw new Error("File video yang di-reply kosong/corrupt.");
  }

  const ext = detectVideoExt(buffer) || ".mp4"; // fallback terakhir saja
  fs.mkdirSync(tempDir, { recursive: true });
  const outPath = path.join(tempDir, `tomp3_${Date.now()}${ext}`);
  fs.writeFileSync(outPath, buffer);
  return outPath;
}

async function downloadToFile(url, tempDir) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
    maxRedirects: 5,
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "*/*",
    },
  });

  const buffer = Buffer.from(res.data);
  const contentType = String(res.headers?.["content-type"] || "").toLowerCase();

  if (buffer.length < MIN_VALID_SIZE) {
    throw new Error("URL tidak mengembalikan file video yang valid (ukuran terlalu kecil/kosong).");
  }

  if (
    looksLikeHtmlOrText(buffer) ||
    contentType.includes("text/html") ||
    contentType.includes("application/json")
  ) {
    throw new Error("URL bukan link langsung ke file video (server mengembalikan halaman/HTML/JSON).");
  }

  return saveBufferAsVideo(buffer, tempDir);
}

async function getQuotedVideoBuffer(m) {
  const quoted = m.quoted || m.msg?.quoted || null;
  if (!quoted) return null;

  if (typeof quoted.download === "function") {
    const downloaded = await quoted.download();
    if (Buffer.isBuffer(downloaded)) return downloaded;
  }

  return null;
}

async function toMp3(inputPath) {
  const outputPath =
    inputPath.replace(/\.(mp4|mov|m4v|webm|avi|mkv)$/i, "") + ".mp3";

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-analyzeduration", "20000000",
      "-probesize", "20000000",
      "-i", inputPath,
      "-vn",
      "-ar", "44100",
      "-ac", "2",
      "-b:a", "192k",
      outputPath,
    ]);
  } catch (e) {
    const stderrTail = String(e.stderr || e.message || "")
      .split("\n")
      .slice(-6)
      .join("\n");
    throw new Error(
      `Gagal konversi video ke MP3 (file mungkin corrupt/tidak punya audio).\n${stderrTail}`
    );
  }

  return outputPath;
}

module.exports = {
  config: {
    name: "tomp3",
    alias: ["mp4tomp3", "videotomp3"],
    category: "tools",
    description: "Reply video MP4 (atau kasih URL) lalu convert ke MP3",
    usage: "[reply mp4 / url mp4]",
    isEnabled: true,
    cooldown: 5,
  },

  async handler(m, { sock, args }) {
    const tempDir = path.join(process.cwd(), "output");
    const tempFiles = [];

    await react(sock, m, "⌛");

    try {
      const argText = getArgText(args);
      let inputPath;

      if (argText && /^https?:\/\//i.test(argText)) {
        inputPath = await downloadToFile(argText.split(/\s+/)[0], tempDir);
      } else {
        const quotedBuffer = await getQuotedVideoBuffer(m);
        if (!quotedBuffer) {
          await react(sock, m, "❌");
          return m.reply(
            "Reply file video MP4 atau kasih URL video.\nContoh: `.tomp3 <url>`"
          );
        }
        inputPath = saveBufferAsVideo(quotedBuffer, tempDir);
      }

      tempFiles.push(inputPath);

      const mp3Path = await toMp3(inputPath);
      tempFiles.push(mp3Path);

      await sock.sendMessage(m.chat, {
        audio: { url: mp3Path },
        mimetype: "audio/mpeg",
        ptt: false,
        fileName: "converted.mp3",
      });

      await react(sock, m, "✅");
      return m.reply("✅ Video berhasil dikonvert ke MP3.");
    } catch (e) {
      await react(sock, m, "❌");
      return m.reply(`❌ Gagal memproses video.\n\n${e.message}`);
    } finally {
      for (const file of tempFiles) {
        try {
          if (file && fs.existsSync(file)) fs.unlinkSync(file);
        } catch {}
      }
    }
  },
};
