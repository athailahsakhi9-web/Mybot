// NEXA BOT — owner plugin collection

module.exports = {
  config: {
    name: "setmode",
    alias: ["botmode"],
    category: "owner",
    description: "Ubah mode bot (public/self)",
    usage: "[public/self]",
    isOwner: true,
    isEnabled: true,
    cooldown: 3,
  },

  async handler(m, { db, config }) {
    const mode = m.args[0]?.toLowerCase();
    if (!mode || !["public", "self"].includes(mode)) {
      const current = db.setting("botMode") || "public";
      return m.reply(
        `⚙ ᴍᴏᴅᴇ ʙᴏᴛ\n\n` +
        `> ᴍᴏᴅᴇ ꜱᴀᴀᴛ ɪɴɪ: *${current}*\n\n` +
        `Usage:\n` +
        `• \`${m.prefix}setmode public\` — Semua bisa pakai\n` +
        `• \`${m.prefix}setmode self\` — Hanya owner`
      );
    }
    db.setting("botMode", mode);
    await m.reply(`✅ *Mode diubah ke: ${mode.toUpperCase()}*`);
  },
};
