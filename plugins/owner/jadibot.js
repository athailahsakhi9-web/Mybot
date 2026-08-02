// ╔══════════════════════════════════════════╗
// ║      NEXA BOT - JADIBOT PLUGIN v1.0.0     ║
// ╚══════════════════════════════════════════╝
// .jadibot <nomer> → buat sub-bot baru dari nomor WhatsApp tersebut.
// Sub-bot yang dihasilkan memakai plugin & handler yang sama persis
// seperti bot utama (fitur disamakan 1:1 dengan bot yang aktif).

const { createJadiBotSession, isActive } = require("../../src/lib/jadibotManager");

module.exports = {
  config: {
    name: "jadibot",
    alias: ["createjadibot"],
    category: "owner",
    description: "Buat sub-bot (jadibot) dari sebuah nomor WhatsApp",
    usage: "<nomer>",
    isOwner: true,
    isEnabled: true,
    cooldown: 5,
  },

  async handler(m, { sock, args }) {
    let number = (args[0] || "").replace(/[^0-9]/g, "");

    if (!number && m.quoted?.sender) {
      number = m.quoted.sender.split("@")[0].split(":")[0];
    }

    if (!number || number.length < 10) {
      return m.reply(
        `🤖 *JADIBOT*\n\n` +
        `Buat sub-bot baru dari nomor WhatsApp lain.\n` +
        `Sub-bot akan punya fitur/plugin yang sama persis seperti bot ini.\n\n` +
        `Usage:\n` +
        `• \`${m.prefix}jadibot 6281234567890\`\n` +
        `• \`${m.prefix}listjadibot\`\n` +
        `• \`${m.prefix}deljadibot 6281234567890\``
      );
    }

    if (isActive(number)) {
      return m.reply(`⚠️ Nomor *${number}* sudah punya sesi jadibot yang aktif.`);
    }

    const groupWarning = m.isGroup
      ? `\n\n⚠️ _Chat ini grup — kode pairing akan terlihat oleh semua member grup._`
      : "";

    await m.reply(`⏳ Membuat sesi jadibot untuk *${number}*...\n> Kode pairing akan dikirim ke chat ini.${groupWarning}`);

    try {
      await createJadiBotSession(number, m.chat, sock);
    } catch (err) {
      await m.reply(`❌ *Gagal membuat jadibot*\n\n\`\`\`\n${err.message}\n\`\`\``);
    }
  },
};
