// plugins/owner/deljadibot.js
// .deljadibot <nomer> → hentikan & hapus sesi jadibot

const { deleteJadiBotSession, isActive } = require("../../src/lib/jadibotManager");

module.exports = {
  config: {
    name: "deljadibot",
    alias: ["delsesijadibot"],
    category: "owner",
    description: "Hentikan & hapus sesi jadibot",
    usage: "<nomer>",
    isOwner: true,
    isEnabled: true,
    cooldown: 3,
  },

  async handler(m, { args }) {
    const number = (args[0] || "").replace(/[^0-9]/g, "");
    if (!number) return m.reply(`Usage: \`${m.prefix}deljadibot 6281234567890\``);

    if (!isActive(number)) return m.reply(`⚠️ Tidak ada sesi jadibot aktif untuk nomor *${number}*.`);

    const ok = await deleteJadiBotSession(number);
    return m.reply(ok ? `✅ Sesi jadibot *${number}* dihentikan & dihapus.` : `❌ Gagal menghapus sesi *${number}*.`);
  },
};
