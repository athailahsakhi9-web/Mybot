// plugins/owner/style.js
// .style <1-5>   -> set gaya font, otomatis diterapkan ke SEMUA balasan bot
// .style 0/off   -> matikan (kembali ke font normal)
// .style         -> lihat preview & style aktif

const { getDatabase } = require("../../src/lib/database");
const { STYLES, convert } = require("../../src/lib/fontStyle");

module.exports = {
  config: {
    name: "style",
    alias: ["font"],
    category: "owner",
    description: "Ubah tampilan font semua balasan bot (5 pilihan gaya)",
    usage: "<1-5|0>",
    isEnabled: true,
    cooldown: 3,
  },

  async handler(m) {
    const db = getDatabase();
    const args = (m.args || []).map(a => a.toLowerCase());
    const arg = args[0];

    // Reset ke font normal
    if (arg === "0" || arg === "off") {
      db.setUser(m.sender, { fontStyle: 0 });
      return m.reply("✅ Font dikembalikan ke normal.");
    }

    const num = parseInt(arg, 10);

    // Tanpa argumen valid -> tampilkan preview + style aktif
    if (!num || !STYLES[num]) {
      const current = db.getUser(m.sender)?.fontStyle || 0;
      const list = Object.entries(STYLES)
        .map(([n, s]) => `┃ ${n}. ${s.name} — ${convert("Contoh", s)}`)
        .join("\n");
      return m.reply(
        `✨ *STYLE FONT*\n\n` +
        `Style aktif: *${current || "Normal (off)"}*\n\n` +
        `Usage:\n` +
        `\`${m.prefix}style <1-5>\` — aktifkan gaya (berlaku ke semua balasan bot)\n` +
        `\`${m.prefix}style 0\` — matikan\n\n` +
        `${list}`
      );
    }

    db.setUser(m.sender, { fontStyle: num });
    await m.reply(convert(`✅ Style diubah ke: ${STYLES[num].name}`, STYLES[num]));
  },
};
