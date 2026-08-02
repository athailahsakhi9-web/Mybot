// plugins/owner/listjadibot.js
// .listjadibot → lihat semua sesi jadibot aktif

const { listSessions } = require("../../src/lib/jadibotManager");

module.exports = {
  config: {
    name: "listjadibot",
    alias: ["jadibotlist", "listsesi"],
    category: "owner",
    description: "Lihat daftar sesi jadibot aktif",
    isOwner: true,
    isEnabled: true,
    cooldown: 3,
  },

  async handler(m) {
    const list = listSessions();
    if (!list.length) return m.reply("📭 Belum ada sesi jadibot yang aktif.");

    const text = list
      .map((s, i) => {
        const status = s.sock?.user ? "🟢 Connected" : "🟡 Connecting";
        const since = s.connectedAt ? new Date(s.connectedAt).toLocaleString("id-ID") : "-";
        return `${i + 1}. *${s.number}*\n   Status: ${status}\n   Sejak: ${since}`;
      })
      .join("\n\n");

    return m.reply(`🤖 *DAFTAR JADIBOT (${list.length})*\n\n${text}`);
  },
};
