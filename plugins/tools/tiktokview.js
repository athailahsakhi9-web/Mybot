const axios = require("axios");
const fs = require("fs");
const path = require("path");
const DB_FILE = path.join(process.cwd(), "base", "ttdata.json");
const pluginConfig = {
  name: "tiktokview",
  alias: ["ttview", "ttv", "viewtt"],
  category: "tools",
  description: "Tambah view TikTok via API",
  usage: ".tiktokview <url_tiktok>",
  example: ".tiktokview https://www.tiktok.com/@user/video/1234567890",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};
function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) return { users: {} };
    const raw = fs.readFileSync(DB_FILE, "utf8");
    if (!raw.trim()) return { users: {} };
    const db = JSON.parse(raw);
    if (!db.users) db.users = {};
    return db;
  } catch {
    return { users: {} };
  }
}
function saveDB(db) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
function extractTikTokUrl(text = "") {
  const match = text.match(/https?:\/\/(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)\/\S+/i);
  return match ? match[0].replace(/[)\],.]+$/g, "") : "";
}
function isValidTikTokUrl(url = "") {
  return /^https?:\/\/(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)\/\S+/i.test(url.trim());
}
async function handler(m, context) {
  const sender = m.sender;
  const argsText = (m.args || []).join(" ").trim();
  const url = extractTikTokUrl(argsText) || (m.args?.[0] ? String(m.args[0]).trim() : "");
  if (!url) {
    await m.reply(
      `⌛ *Format salah*\n\n` +
      `Contoh:\n` +
      `\`.tiktokview https://www.tiktok.com/@user/video/1234567890\``
    );
    return { handled: true };
  }
  if (!isValidTikTokUrl(url)) {
    await m.reply(
      `❌ *URL TikTok tidak valid*\n\n` +
      `Gunakan link video TikTok yang benar.`
    );
    return { handled: true };
  }
  const db = loadDB();
  const user = db.users[sender] || {
    used: false,
    usedAt: null,
    total: 0,
    lastOrderId: null,
  };
  if (user.used) {
    await m.reply(
      `❌ *Limit habis*\n\n` +
      `Kamu hanya bisa memakai fitur ini *1 kali per user*.`
    );
    return { handled: true };
  }
  await m.react("⌛");
  try {
    const apiUrl = `https://clooud.my.id/api/tiktok-view/?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(apiUrl, { timeout: 30000 });
    const orderId = data?.data?.id || null;
    user.used = true;
    user.usedAt = new Date().toISOString();
    user.total += 1;
    user.lastOrderId = orderId;
    db.users[sender] = user;
    saveDB(db);
    await m.react("✅");
    await m.reply(
      `✅ *TikTok View berhasil*\n\n` +
      `╭┈┈⬡「 📋 *Detail* 」\n` +
      `┃ 🔗 URL: \`${url}\`\n` +
      `┃ 🧾 Order ID: *${orderId || "-"}*\n` +
      `┃ 📦 Status: *${data?.status ? "Berhasil" : "Diproses"}*\n` +
      `┃ 🎫 Sisa Pemakaian: *0/1*\n` +
      `╰┈┈⬡`
    );
    return { handled: true };
  } catch (err) {
    await m.react("❌");
    await m.reply(
      `❌ *Gagal menjalankan TikTok View*\n\n` +
      `> ${err.message || "Terjadi kesalahan saat menghubungi API."}`
    );
    return { handled: true };
  }
}
module.exports = { config: pluginConfig, handler };