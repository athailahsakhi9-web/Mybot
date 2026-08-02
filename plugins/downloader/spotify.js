const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const MIN_VALID_SIZE = 1024;
const SPOTIFY_API = "https://api.nexray.eu.cc/downloader/spotifyplay";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const pluginConfig = {
  name: "playspotify",
  alias: ["playsp", "spotifyplay"],
  category: "downloader",
  description: "Cari & download lagu dari Spotify sebagai MP3",
  usage: "<judul lagu>",
  example: "playsp Mojang Priangan",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

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

function detectAudioExt(buffer) {
  if (!buffer || buffer.length < 12) return null;
  
  if (buffer.slice(0, 3).toString("utf8") === "ID3") return ".mp3";
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return ".mp3";
  
  if (buffer.slice(4, 8).toString("utf8") === "ftyp") return ".m4a";

  if (buffer.slice(0, 4).toString("utf8") === "OggS") return ".ogg";

  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return ".webm";
  }

  return null;
}

async function searchSpotify(query) {
  const res = await axios.get(SPOTIFY_API, {
    params: { q: query },
    headers: { "User-Agent": UA },
    timeout: 20000,
  });

  const data = res.data;
  if (!data?.status || !data?.result) {
    throw new Error(`Lagu tidak ditemukan untuk: ${query}`);
  }

  const r = data.result;
  return {
    title: r.title,
    artist: r.artist,
    duration: r.duration,
    thumbnail: r.thumbnail,
    popularity: r.popularity,
    album: r.album,
    releaseAt: r.release_at,
    downloadUrl: r.download_url,
  };
}

async function downloadToFile(url, tempDir) {
  fs.mkdirSync(tempDir, { recursive: true });

  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 60000,
    maxRedirects: 5,
    headers: {
      "User-Agent": UA,
      Accept: "*/*",
    },
  });

  const buffer = Buffer.from(res.data);
  const contentType = String(res.headers?.["content-type"] || "").toLowerCase();

  if (buffer.length < MIN_VALID_SIZE) {
    throw new Error("Server download mengembalikan file kosong/terlalu kecil.");
  }

  if (
    looksLikeHtmlOrText(buffer) ||
    contentType.includes("text/html") ||
    contentType.includes("application/json")
  ) {
    throw new Error("Link download bukan file audio langsung (server mengembalikan halaman/HTML/JSON).");
  }

  const ext = detectAudioExt(buffer) || ".m4a";
  const inputPath = path.join(tempDir, `spotify_${Date.now()}${ext}`);
  fs.writeFileSync(inputPath, buffer);
  return { inputPath, ext };
}

async function toMp3(inputPath) {
  const outputPath = inputPath.replace(/\.(m4a|webm|ogg|mp4|aac|opus)$/i, "") + "_final.mp3";

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
    throw new Error(`Gagal convert ke MP3 (file mungkin corrupt).\n${stderrTail}`);
  }

  return outputPath;
}

module.exports = {
  config: pluginConfig,

  async handler(m, { sock }) {
    const query = m.text?.trim();

    if (!query) {
      return m.reply(
        `🎧 ᴘʟᴀʏ sᴘᴏᴛɪꜰʏ\n\n` +
        `> Cari & download lagu dari Spotify!\n\n` +
        `Usage:\n\`${m.prefix}playsp <judul lagu>\`\n\n` +
        `Contoh:\n\`${m.prefix}playsp Mojang Priangan\``
      );
    }

    const tempDir = path.join(process.cwd(), "output");
    const tempFiles = [];

    await m.react("🎧");
    await m.reply(`⏳ ʟᴀɢɪ ᴀᴋᴜ ᴄᴀʀɪ ɴɪᴄʜ *${query}* ᴅɪ ꜱᴘᴏᴛɪꜰʏ...`);

    let info;
    try {
      info = await searchSpotify(query);
    } catch (err) {
      await m.react("❌");
      return m.reply(`❌ ᴍᴀᴀꜰ ᴛᴜᴀɴ ɢᴀɢᴀʟ ᴍᴇɴᴄᴀʀɪ ʟᴀɢɪ\n\n> ${err.message}`);
    }

    if (!info.downloadUrl) {
      await m.react("❌");
      return m.reply(`❌ ʟᴀɢᴜ ᴅɪᴛᴇᴍᴜᴋᴀɴ ᴛᴀᴘɪ ᴛɪᴅᴀᴋ ᴀᴅᴀ ʟɪɴᴋ ᴅᴏᴡɴʟᴏᴀᴅ\n\n🎵 *${info.title}*`);
    }

    const infoText =
      `🎧 ᴋᴇᴛᴇᴍᴜ ɴɪʜ! ʟᴀɢɪ ᴅᴏᴡɴʟᴏᴀᴅ & ᴄᴏɴᴠᴇʀᴛ ᴋᴇ ᴍᴘ3...\n\n` +
      `🎵 *${info.title}*\n` +
      `👤 ᴀʀᴛɪꜱ: ${info.artist}\n` +
      `💿 ᴀʟʙᴜᴍ: ${info.album}\n` +
      `⏱️ ᴅᴜʀᴀꜱɪ: ${info.duration}\n` +
      `📅 ʀɪʟɪꜱ: ${info.releaseAt}\n` +
      `🔥 ᴘᴏᴘᴜʟᴀʀɪᴛᴀꜱ: ${info.popularity}/100`;

    try {
      if (info.thumbnail) {
        await sock.sendMessage(m.chat, { image: { url: info.thumbnail }, caption: infoText }, { quoted: m });
      } else {
        await sock.sendMessage(m.chat, { text: infoText }, { quoted: m });
      }
    } catch {
      await sock.sendMessage(m.chat, { text: infoText }, { quoted: m }).catch(() => {});
    }

    try {
      const { inputPath, ext } = await downloadToFile(info.downloadUrl, tempDir);
      tempFiles.push(inputPath);

      let finalAudioPath;
      if (ext === ".mp3") {
        finalAudioPath = inputPath;
      } else {
        finalAudioPath = await toMp3(inputPath);
        tempFiles.push(finalAudioPath);
      }

      await sock.sendMessage(m.chat, {
        audio: { url: finalAudioPath },
        mimetype: "audio/mpeg",
        ptt: false,
        fileName: `${info.title}.mp3`,
      }, { quoted: m });

      await m.react("✅");
    } catch (err) {
      await m.react("❌");
      await m.reply(`❌ *Gagal download/convert MP3*\n\n> ${err.message}`);
    } finally {
      for (const file of tempFiles) {
        try {
          if (file && fs.existsSync(file)) fs.unlinkSync(file);
        } catch {}
      }
    }
  },
};