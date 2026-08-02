// NEXA BOT — tools: base64 encode/decode

module.exports = {
  config: {
    name: "base64",
    alias: ["b64"],
    category: "tools",
    description: "Encode/decode teks ke base64",
    usage: "[encode/decode] <teks>",
    isEnabled: true,
    cooldown: 3,
  },

  async handler(m) {
    const [action, ...rest] = m.args;
    const text = rest.join(" ");

    if (!action || !text) {
      return m.reply(
        `Usage:\n` +
        `• \`${m.prefix}base64 encode <teks>\`\n` +
        `• \`${m.prefix}base64 decode <teks>\``
      );
    }

    try {
      if (action === "encode") {
        const encoded = Buffer.from(text).toString("base64");
        await m.reply(`🔐 *Base64 Encode*\n\n\`\`\`\n${encoded}\n\`\`\``);
      } else if (action === "decode") {
        const decoded = Buffer.from(text, "base64").toString("utf-8");
        await m.reply(`🔓 *Base64 Decode*\n\n\`\`\`\n${decoded}\n\`\`\``);
      } else {
        await m.reply(`Action tidak valid! Gunakan \`encode\` atau \`decode\`.`);
      }
    } catch {
      await m.reply("❌ Gagal proses!");
    }
  },
};
