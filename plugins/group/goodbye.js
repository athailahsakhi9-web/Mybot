// NEXA BOT — goodbye plugin

const { getDatabase } = require("../../src/lib/database");

async function sendGoodbyeMessage(sock, groupJid, participantJid, groupMeta) {
  const db = getDatabase();
  const groupData = db.getGroup(groupJid) || {};
  if (groupData.goodbye === false) return;

  const name = participantJid.split("@")[0];
  const groupName = groupMeta?.subject || "grup ini";

  await sock.sendMessage(groupJid, {
    text:
      `👋 *Selamat Tinggal!*\n\n` +
      `> @${name} telah meninggalkan *${groupName}*.\n` +
      `> Semoga sukses ya! 🙏`,
    mentions: [participantJid],
  });
}

module.exports = {
  config: {
    name: "setgoodbye",
    alias: ["goodbye"],
    category: "group",
    description: "Atur pesan goodbye",
    usage: "[on/off]",
    isGroup: true,
    isAdmin: true,
    isEnabled: true,
    cooldown: 5,
  },

  async handler(m, { db }) {
    const arg = m.args[0]?.toLowerCase();
    if (!arg || !["on", "off"].includes(arg)) {
      const groupData = db.getGroup(m.chat) || {};
      const status = groupData.goodbye !== false ? "on" : "off";
      return m.reply(`Usage: \`${m.prefix}setgoodbye [on/off]\`\nStatus: *${status}*`);
    }
    db.setGroup(m.chat, { goodbye: arg === "on" });
    await m.reply(`✅ *Goodbye ${arg === "on" ? "diaktifkan" : "dinonaktifkan"}!*`);
  },

  sendGoodbyeMessage,
};
