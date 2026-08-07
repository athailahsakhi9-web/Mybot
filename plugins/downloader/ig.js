const https = require("https");

const pluginConfig = {
  name: "instagram",
  alias: ["ig", "igdl"],
  category: "downloader",
  description: "Download foto/video/carousel dari Instagram",
  usage: ".instagram <url instagram>",
  example: ".instagram https://www.instagram.com/p/DZPlM_3TCkk/",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function getToken() {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "kol.id",
      path: "/download-video/instagram",
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Android 14; Mobile; rv:144.0) Gecko/144.0 Firefox/144.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    }, (res) => {
      let data = "";
      const cookies = (res.headers["set-cookie"] || []).map(c => c.split(";")[0]).join("; ");
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        const tokenMatch = data.match(/name="_token"\s+value="([^"]+)"/) ||
          data.match(/csrf-token"\s+content="([^"]+)"/) ||
          data.match(/"_token":"([^"]+)"/);
        if (!tokenMatch) return reject(new Error("Token tidak ditemukan"));
        resolve({ token: tokenMatch[1], cookie: cookies });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function scrapeInstagram(instagramUrl) {
  const { token, cookie } = await getToken();

  const result = await new Promise((resolve, reject) => {
    const postData = new URLSearchParams({ url: instagramUrl, _token: token }).toString();
    const req = https.request({
      hostname: "kol.id",
      path: "/api/v2/downloader/instagram",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Content-Length": Buffer.byteLength(postData),
        "Accept": "*/*",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Android 14; Mobile; rv:144.0) Gecko/144.0 Firefox/144.0",
        "Referer": "https://kol.id/download-video/instagram",
        "Cookie": cookie,
        "Origin": "https://kol.id",
      },
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("Gagal parse JSON: " + data.substring(0, 300))); }
      });
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });

  // ── Struktur response: { meta: {...}, data: {...} } ──
  const meta = result?.meta || {};
  const isSuccess = meta.success === true || meta.status === "ok";

  if (!isSuccess) {
    return { success: false, error: meta.message || "Gagal mengambil data dari kol.id" };
  }

  const d = result.data || {};
  const cleanUrl = (u) => (u || "").replace(/\\\//g, "/");

  const downloads = [];

  // Carousel (banyak slide)
  if (Array.isArray(d.slides) && d.slides.length > 0) {
    d.slides.forEach((slide, index) => {
      const slideUrl = cleanUrl(slide.video_url || slide.url || slide.image_url || "");
      if (!slideUrl) return;
      const isVideo = slide.type === "video" || slideUrl.includes(".mp4");
      downloads.push({
        url: slideUrl,
        type: isVideo ? "video" : "image",
        label: `Slide ${index + 1}`,
      });
    });
  }

  // Single media (foto/video tunggal)
  if (downloads.length === 0 && d.video_url) {
    downloads.push({
      url: cleanUrl(d.video_url),
      type: d.type === "video" ? "video" : "image",
      label: d.type === "video" ? "Download Video" : "Download Foto",
    });
  }

  return {
    success: true,
    data: {
      title: d.title || "Instagram Download",
      author: d.author || "Instagram",
      thumbnail: cleanUrl(d.thumbnail),
      media_type: downloads.length > 1 ? "carousel" : (d.type || "image"),
      status: d.status || "completed",
      cached: d.cached ?? null,
      request_id: d.request_id || null,
      downloads,
    },
  };
}

async function handler(m, { sock }) {
  const url = (m.text || "").trim().split(/\s+/)[0];

  if (!url || !/instagram\.com/i.test(url)) {
    return m.reply(
      `📸 *ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n` +
      `> Download foto/video/carousel dari Instagram\n\n` +
      `Usage:\n\`${m.prefix}instagram <url instagram>\`\n\n` +
      `Contoh:\n\`${m.prefix}instagram https://www.instagram.com/p/DZPlM_3TCkk/\``
    );
  }

  await m.react("⌛");

  let result;
  try {
    result = await scrapeInstagram(url);
  } catch (err) {
    await m.react("❌");
    return m.reply(`❌ *Gagal mengambil data Instagram*\n\n> ${err.message}`);
  }

  if (!result.success || !result.data.downloads.length) {
    await m.react("❌");
    return m.reply(`❌ *Gagal*\n\n> ${result.error || "Tidak ada media yang ditemukan."}`);
  }

  const { downloads, title, author } = result.data;
  const caption = `📸 *${title}*\n👤 ${author}`;

  try {
    for (const item of downloads) {
      if (item.type === "video") {
        await sock.sendMessage(m.chat, {
          video: { url: item.url },
          caption: downloads.length === 1 ? caption : `${caption}\n\n${item.label}`,
        }, { quoted: m });
      } else {
        await sock.sendMessage(m.chat, {
          image: { url: item.url },
          caption: downloads.length === 1 ? caption : `${caption}\n\n${item.label}`,
        }, { quoted: m });
      }
    }

    await m.react("✅");
  } catch (err) {
    await m.react("❌");
    await m.reply(`❌ *Gagal mengirim media*\n\n> ${err.message}`);
  }
}

module.exports = { config: pluginConfig, handler };