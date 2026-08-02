const { getAllPlugins } = require("../../src/lib/plugins");

const pluginConfig = {
  name: "totalfitur",
  alias: ["allfitur", "totalfeature", "listfitur", "totalcommand"],
  category: "owner",
  description: "Menampilkan rekap total fitur/command bot dalam bentuk polling WhatsApp",
  usage: "",
  example: ".totalfitur",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const CATEGORY_EMOJI = {
  owner: "👑",
  group: "👥",
  main: "🏠",
  user: "🙋",
  fun: "🎉",
  downloader: "📥",
  ai: "🤖",
  canvas: "🎨",
  search: "🔍",
  sticker: "🖼️",
  tools: "🛠️",
};

function buildCategoryBreakdown(allPlugins) {
  const counts = {};
  for (const plugin of allPlugins) {
    const category = plugin.config?.category || "main";
    counts[category] = (counts[category] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function formatCategoryLabel(category, count) {
  const emoji = CATEGORY_EMOJI[category] || "📦";
  const name = category.charAt(0).toUpperCase() + category.slice(1);
  return `${emoji} ${name} — ${count} fitur`;
}

async function handler(m, { sock }) {
  const allPlugins = getAllPlugins();
  const totalCommands = allPlugins.length;

  if (!totalCommands) {
    return m.reply("⚠️ Belum ada plugin yang ke-load.");
  }

  const breakdown = buildCategoryBreakdown(allPlugins);

  if (breakdown.length < 2) {
    return m.reply(
      `📊 *TOTAL FITUR BOT*\n\n` +
      `Total: *${totalCommands}* command\n` +
      `Kategori: ${breakdown[0]?.[0] || "-"}\n\n` +
      `_Minimal 2 kategori diperlukan untuk mode polling._`
    );
  }

  const pollValues = breakdown
    .slice(0, 12) // WhatsApp poll maksimal 12 opsi
    .map(([category, count]) => formatCategoryLabel(category, count));

  await sock.sendMessage(m.chat, {
    poll: {
      name:
        `📊 *TOTAL FITUR BOT: ${totalCommands} COMMAND*\n\n` +
        `Rekap fitur per kategori — pilih salah satu buat lihat mana yang paling banyak 👇`,
      values: pollValues,
      selectableCount: 1,
    },
  });
}

module.exports = { config: pluginConfig, handler };