const LINK_PATTERNS = [
  /https?:\/\/\S+/i,
  /(?:www\.)\S+/i,
  /\bchat\.whatsapp\.com\/\S+/i,
  /\bwhatsapp\.com\/channel\/\S+/i,
  /\bwhatsapp\.com\/channels\/\S+/i,
  /\bwhatsapp\.com\/\S+/i,
  /\b(?:t\.me|telegram\.me)\/\S+/i,
  /\bdiscord\.gg\/\S+/i,
  /\bbit\.ly\/\S+/i,
  /\btinyurl\.com\/\S+/i,
  /\bcutt\.ly\/\S+/i,
  /\bs\.id\/\S+/i,
  /\blnk\.to\/\S+/i,
];

const WHITELIST_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am|threads\.net)\/\S*/i,
  /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com|vt\.tiktok\.com)\/\S*/i,
  /(?:https?:\/\/)?(?:www\.)?(?:capcut\.com)\/\S*/i,
  /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.watch|m\.facebook\.com|l\.facebook\.com)\/\S*/i,
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/\S*/i,
  /(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/\S*/i,
  /(?:https?:\/\/)?(?:www\.)?(?:pinterest\.com|pin\.it)\/\S*/i,
  /(?:https?:\/\/)?(?:www\.)?(?:spotify\.com)\/\S*/i,
  /(?:https?:\/\/)?(?:www\.)?(?:s\.shopee\.co\.id|shopee\.co\.id)\/\S*/i,
  /(?:https?:\/\/)?(?:www\.)?(?:tokopedia\.com)\/\S*/i,
  /(?:https?:\/\/)?(?:www\.)?(?:link\.tr\.ee|bio\.site)\/\S*/i,
];

function extractText(m) {
  return [
    m.body,
    m.caption,
    m.text,
    m.message?.conversation,
    m.message?.extendedTextMessage?.text,
    m.message?.imageMessage?.caption,
    m.message?.videoMessage?.caption,
    m.message?.documentMessage?.caption,
  ].filter(Boolean).join(" ");
}

function hasLink(text = "") {
  return LINK_PATTERNS.some((re) => re.test(text));
}

function isWhitelisted(text = "") {
  return WHITELIST_PATTERNS.some((re) => re.test(text));
}

async function resolveGroupAdmin(sock, groupJid, userJid) {
  try {
    const meta = await sock.groupMetadata(groupJid);
    const participant = meta?.participants?.find(
      p => p.id === userJid || p.lid === userJid
    );
    return !!participant?.admin;
  } catch {
    return false;
  }
}

module.exports = {
  config: {
    name: "antilink",
    alias: ["setantilink"],
    category: "group",
    description: "Hapus pesan link di group",
    usage: "[on/off/status]",
    isOwner: true,
    isGroup: true,
    isAdmin: false,
    isEnabled: true,
    cooldown: 5,
  },

  async handler(m, { sock, db }) {
    const arg = m.args?.[0]?.toLowerCase();
    const group = db.getGroup(m.chat) || {};

    if (!arg || arg === "status") {
      const status = group.antilink ? "✅ Aktif" : "❌ Nonaktif";
      return m.reply(
        `🔗 *Anti-Link Status*\n\n` +
        `┃ Status : *${status}*\n\n` +
        `_Ubah dengan:_\n` +
        `› \`.antilink on\` — aktifkan\n` +
        `› \`.antilink off\` — nonaktifkan`
      );
    }

    const senderIsOwner = !!m.isOwner;
    const senderIsAdmin = !!m.isAdmin || await resolveGroupAdmin(sock, m.chat, m.sender);

    if (!senderIsOwner && !senderIsAdmin) {
      return m.reply(`👮 *Admin Only!*\n\n> Command ini hanya untuk admin grup!`);
    }

    if (arg === "on") {
      db.setGroup(m.chat, { ...group, antilink: true });
      return m.reply("✅ *Anti-Link diaktifkan.*");
    }

    if (arg === "off") {
      db.setGroup(m.chat, { ...group, antilink: false });
      return m.reply("❌ *Anti-Link dinonaktifkan.*");
    }

    return m.reply("⚠️ Gunakan: `.antilink on` / `.antilink off` / `.antilink status`");
  },

  async onMessage(m, { sock, db }) {
    if (!m?.isGroup) return false;
    if (m.fromMe) return false;

    const group = db.getGroup(m.chat) || {};
    if (!group.antilink) return false;

    const text = extractText(m);
    if (!hasLink(text)) return false;

    if (isWhitelisted(text)) return false;

    const sender = m.sender || "";
    const senderIsOwner = !!m.isOwner;
    const senderIsAdmin = !!m.isAdmin || await resolveGroupAdmin(sock, m.chat, sender);

    if (senderIsOwner || senderIsAdmin) return false;

    try {
      await sock.sendMessage(m.chat, {
        delete: {
          remoteJid: m.chat,
          fromMe: false,
          id: m.key?.id,
          participant: sender,
        }
      });
    } catch {}

    try {
      await sock.sendMessage(m.chat, {
        text:
          `╭─❖ 「 ANTI LINK 」\n` +
          `│ 🚫 Link terdeteksi\n` +
          `│ 🗑️ Pesan telah dihapus\n` +
          `│ 📜 Harap patuhi aturan grup\n` +
          `╰────────────❖\n\n` +
          `@${sender.split("@")[0]} jangan kirim link sembarangan.`,
        mentions: [sender],
      });
    } catch {}

    return true;
  },
};