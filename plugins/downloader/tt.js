// plugins/downloader/tt.js
// .tt <url tiktok> → download video/audio TikTok via ssstik, convert ke MP4/MP3

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const axios = require("axios");
const { URLSearchParams } = require("url");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);
const MIN_VALID_SIZE = 1024;

const pluginConfig = {
  name: "tt",
  alias: ["tiktok", "ttdl"],
  category: "downloader",
  description: "Download video/audio TikTok tanpa watermark",
  usage: ".tt <url tiktok>",
  example: ".tt https://vt.tiktok.com/ZSxgka422/",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const BASE = "https://ssstik.io";
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

function req(url, opts = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === "https:" ? https : http;
    const r = lib.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: opts.method || "GET", headers: opts.headers || {} },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          const loc = res.headers.location.startsWith("http")
            ? res.headers.location
            : `https://${u.hostname}${res.headers.location}`;
          return resolve(req(loc, opts, body));
        }
        let d = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
      }
    );
    r.on("error", reject);
    if (body) r.write(body);
    r.end();
  });
}

async function getToken() {
  const res = await req(`${BASE}/id`, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,*/*;q=0.9",
      "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
      Referer: "https://www.google.com/",
    },
  });
  if (res.status !== 200) throw new Error(`GET /id gagal: HTTP ${res.status}`);

  const tt = (res.body.match(/s_tt\s*=\s*['"]([^'"]+)['"]/) || [])[1] || "";
  const furl = (res.body.match(/s_furl\s*=\s*['"]([^'"]+)['"]/) || [])[1] || "abc";
  const cookie = (res.headers["set-cookie"] || []).map((c) => c.split(";")[0]).join("; ");

  return { tt, furl, cookie };
}

async function fetchData(tiktokUrl, { tt, furl, cookie }) {
  const body = new URLSearchParams({ id: tiktokUrl, locale: "id", tt }).toString();

  const res = await req(`${BASE}/${furl}?url=dl`, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Content-Length": Buffer.byteLength(body).toString(),
      Accept: "text/html, */*; q=0.01",
      "Accept-Language": "id-ID,id;q=0.9",
      Referer: `${BASE}/id`,
      Origin: BASE,
      "HX-Request": "true",
      "HX-Current-URL": `${BASE}/id`,
      "HX-Target": "target",
      "HX-Trigger": "main_page_text",
      ...(cookie ? { Cookie: cookie } : {}),
    },
  }, body);

  if (res.status !== 200) throw new Error(`POST gagal: HTTP ${res.status}`);
  return res.body;
}

function strip(s) {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function classify(label, href) {
  const l = label.toLowerCase();
  if (/tanpa.?tanda.?air.*(hd|high)|no.?watermark.*(hd|high)/i.test(label)) return "video_hd_no_watermark";
  if (/tanpa.?tanda.?air|no.?watermark/i.test(label)) return "video_no_watermark";
  if (/unduh mp3|mp3|audio|musik|music/i.test(l) || /\.mp3/i.test(href)) return "audio_mp3";
  if (/\bhd\b/i.test(l)) return "video_hd";
  if (/watermark/i.test(l)) return "video_watermark";
  if (/\.mp4/i.test(href)) return "video";
  return "video";
}

function parse(html, url) {
  let status = "unknown";
  if (html.includes("ssssuccess")) status = "success";
  else if (html.includes("ssstterror")) status = "tt_error";
  else if (html.includes("sssinvalidlink")) status = "invalid_link";
  else if (html.includes("sssblockedclient")) status = "blocked";
  else if (html.includes("ssserror")) status = "error";

  const authorM = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const author = authorM ? strip(authorM[1]) : null;

  const titleM = html.match(/<h2[\s\S]*?<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/i)
    || html.match(/class="[^"]*maintext[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  const title = titleM ? strip(titleM[1]) : null;

  const thumbM = html.match(/<img[^>]+src="(https:\/\/[^"]+tiktokcdn[^"]+)"/)
    || html.match(/<img[^>]+src="(https:\/\/[^"]+\.(?:jpe?g|png|webp)[^"]*)"[^>]*class="[^"]*result/i);
  const thumbnail = thumbM ? thumbM[1] : null;

  const downloads = [];
  const seen = new Set();
  const aReg = /<a\s([^>]*href="([^"]+)"[^>]*)>([\s\S]*?)<\/a>/gi;
  let m;

  while ((m = aReg.exec(html)) !== null) {
    const attrs = m[1];
    const href = m[2];
    const label = strip(m[3]);

    if (!href.startsWith("http") || seen.has(href)) continue;

    const isDownload =
      href.includes("/d/") ||
      attrs.includes(" download") ||
      /\.(mp4|mp3|webm)/i.test(href) ||
      /tanpa.?tanda|no.?watermark|unduh|download|mp3|mp4|audio|hd/i.test(label);

    if (!isDownload) continue;
    if (/watch.?ads|fitur.?pro|aplikasi/i.test(label)) continue;

    seen.add(href);
    downloads.push({
      type: classify(label, href),
      label: label || "Download",
      url: href,
      quality: (attrs.match(/data-quality="([^"]+)"/i) || [])[1] || null,
    });
  }

  const musicM = html.match(/class="[^"]*music[^"]*"[\s\S]{0,400}?href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
    || html.match(/href="([^"]+\.mp3[^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
  const music = musicM ? { label: strip(musicM[2]), url: musicM[1] } : null;

  const stats = {};
  const sp = {
    likes: /([0-9][0-9.,KMB]*)\s*(?:like|suka)/i,
    views: /([0-9][0-9.,KMB]*)\s*(?:view|tayangan)/i,
    comments: /([0-9][0-9.,KMB]*)\s*(?:comment|komentar)/i,
    shares: /([0-9][0-9.,KMB]*)\s*(?:share|bagikan)/i,
  };
  for (const [k, p] of Object.entries(sp)) {
    const s = html.match(p);
    if (s) stats[k] = s[1];
  }

  if (status === "unknown") status = downloads.length > 0 || title ? "success" : "empty";

  return { status, url, author, title, thumbnail, music, downloads, stats: Object.keys(stats).length ? stats : null };
}

async function scrapeTiktok(url) {
  const token = await getToken();
  const html = await fetchData(url, token);
  return parse(html, url);
}

// ─── Deteksi tipe file dari magic bytes ─────────────────────────
function looksLikeHtmlOrText(buffer) {
  if (!buffer || buffer.length < 5) return false;
  const head = buffer.slice(0, 20).toString("utf8").trim().toLowerCase();
  return head.startsWith("<!doctype") || head.startsWith("<html") || head.startsWith("{") || head.startsWith("[");
}

function detectMediaExt(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer.slice(4, 8).toString("utf8") === "ftyp") return ".mp4";
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return ".webm";
  if (buffer.slice(0, 3).toString("utf8") === "ID3") return ".mp3";
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return ".mp3";
  return null;
}

const SMALL_CAPS_MAP = {
  a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ", i: "ɪ",
  j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ",
  s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ",
};

function smallCaps(str) {
  if (!str) return str;
  return Array.from(String(str))
    .map((ch) => {
      const lower = ch.toLowerCase();
      return SMALL_CAPS_MAP[lower] !== undefined ? SMALL_CAPS_MAP[lower] : ch;
    })
    .join("");
}

async function downloadToBuffer(url) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 60000,
    maxRedirects: 5,
    headers: { "User-Agent": UA, Accept: "*/*" },
  });

  const buffer = Buffer.from(res.data);
  const contentType = String(res.headers?.["content-type"] || "").toLowerCase();

  if (buffer.length < MIN_VALID_SIZE) throw new Error("File hasil download kosong/terlalu kecil.");
  if (looksLikeHtmlOrText(buffer) || contentType.includes("text/html")) {
    throw new Error("Link download bukan file media langsung (server mengembalikan halaman error).");
  }

  return buffer;
}

async function convertMedia(buffer, kind, tempDir) {
  fs.mkdirSync(tempDir, { recursive: true });

  const ext = detectMediaExt(buffer) || (kind === "audio" ? ".mp3" : ".mp4");
  const inputPath = path.join(tempDir, `tt_in_${Date.now()}${ext}`);
  fs.writeFileSync(inputPath, buffer);

  // Kalau sudah format target, tidak perlu convert
  if (kind === "audio" && ext === ".mp3") return inputPath;
  if (kind === "video" && ext === ".mp4") return inputPath;

  const outputPath = inputPath.replace(ext, "") + (kind === "audio" ? "_out.mp3" : "_out.mp4");

  try {
    if (kind === "audio") {
      await execFileAsync("ffmpeg", [
        "-y", "-i", inputPath, "-vn", "-ar", "44100", "-ac", "2", "-b:a", "192k", outputPath,
      ]);
    } else {
      await execFileAsync("ffmpeg", [
        "-y", "-i", inputPath, "-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart", outputPath,
      ]);
    }
  } catch (e) {
    try { fs.unlinkSync(inputPath); } catch {}
    const stderrTail = String(e.stderr || e.message || "").split("\n").slice(-6).join("\n");
    throw new Error(`Gagal convert ke ${kind === "audio" ? "MP3" : "MP4"}.\n${stderrTail}`);
  }

  try { fs.unlinkSync(inputPath); } catch {}
  return outputPath;
}

module.exports = {
  config: pluginConfig,

  async handler(m, { sock }) {
    const url = (m.text || "").trim().split(/\s+/)[0];

    if (!url || !/^https?:\/\//.test(url)) {
      return m.reply(
        `🎵 *ᴛɪᴋᴛᴏᴋ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n` +
        `> ᴅᴏᴡɴʟᴏᴀᴅ ᴠɪᴅᴇᴏ/ᴀᴜᴅɪᴏ ᴛɪᴋᴛᴏᴋ ᴛᴀɴᴘᴀ ᴡᴀᴛᴇʀᴍᴀʀᴋ\n\n` +
        `ᴜsᴀɢᴇ:\n\`${m.prefix}tt <url tiktok>\`\n\n` +
        `ᴄᴏɴᴛᴏʜ:\n\`${m.prefix}tt https://vt.tiktok.com/ZSxgka422/\``
      );
    }

    const tempDir = path.join(process.cwd(), "output");
    const tempFiles = [];

    await m.react("⌛");

    let data;
    try {
      data = await scrapeTiktok(url);
    } catch (err) {
      await m.react("❌");
      return m.reply(`❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴀᴍʙɪʟ ᴅᴀᴛᴀ ᴛɪᴋᴛᴏᴋ*\n\n> ${err.message}`);
    }

    if (data.status !== "success" || !data.downloads?.length) {
      await m.react("❌");
      return m.reply(`❌ ʟɪɴᴋ ᴛɪᴅᴀᴋ ᴠᴀʟɪᴅ ᴀᴛᴀᴜ ᴛɪᴅᴀᴋ ᴀᴅᴀ ᴍᴇᴅɪᴀ ʏᴀɴɢ ᴅɪᴛᴇᴍᴜᴋᴀɴ.\n\n> sᴛᴀᴛᴜs: ${data.status}`);
    }

    const videoLink = data.downloads.find((d) => d.type === "video_hd_no_watermark")
      || data.downloads.find((d) => d.type === "video_no_watermark")
      || data.downloads.find((d) => d.type.startsWith("video"));
    const audioLink = data.downloads.find((d) => d.type === "audio_mp3");

    const caption =
      `🎵 *${smallCaps(data.title || "TikTok")}*\n` +
      `👤 ${smallCaps(data.author || "-")}\n` +
      (data.stats?.likes ? `❤️ ${data.stats.likes}` : "");

    try {
      if (videoLink) {
        const buffer = await downloadToBuffer(videoLink.url);
        const finalPath = await convertMedia(buffer, "video", tempDir);
        tempFiles.push(finalPath);

        await sock.sendMessage(m.chat, {
          video: { url: finalPath },
          caption,
          contextInfo: {
            forwardingScore: 9999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363404988690074@newsletter",
              newsletterName: "Nexa Bot",
              serverMessageId: 127
            }
          }
        }, { quoted: m });
      }

      if (audioLink) {
        const buffer = await downloadToBuffer(audioLink.url);
        const finalPath = await convertMedia(buffer, "audio", tempDir);
        tempFiles.push(finalPath);

        await sock.sendMessage(m.chat, {
          audio: { url: finalPath },
          mimetype: "audio/mpeg",
          ptt: false,
          fileName: `${data.title || "tiktok"}.mp3`,
          contextInfo: {
            forwardingScore: 9999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363404988690074@newsletter",
              newsletterName: "Nexa Bot",
              serverMessageId: 127
            }
          }
        }, { quoted: m });
      }

      if (!videoLink && !audioLink) {
        await m.react("❌");
        return m.reply("❌ ᴛɪᴅᴀᴋ ᴀᴅᴀ ʟɪɴᴋ ᴠɪᴅᴇᴏ/ᴀᴜᴅɪᴏ ʏᴀɴɢ ʙɪsᴀ ᴅɪᴜɴᴅᴜʜ.");
      }

      await m.react("✅");
    } catch (err) {
      await m.react("❌");
      await m.reply(`❌ *ɢᴀɢᴀʟ ᴅᴏᴡɴʟᴏᴀᴅ/ᴄᴏɴᴠᴇʀᴛ*\n\n> ${err.message}`);
    } finally {
      for (const f of tempFiles) {
        try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
      }
    }
  },
};
