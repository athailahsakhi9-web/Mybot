// NEXA BOT — say plugin

module.exports = {
  config: {
    name: "say",
    alias: ["tts", "text"],
    category: "fun",
    description: "Bot akan mengirim ulang pesanmu",
    usage: "<teks>",
    isEnabled: true,
    cooldown: 3,
    energi: 0,
  },

  async handler(m, { sock }) {
    const text = m.text || m.args.join(" ");
    if (!text) return m.reply(`Usage: \`${m.prefix}say <teks>\``);
    await sock.sendMessage(m.chat, { text });
  },
};
