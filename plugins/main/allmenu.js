const { getAllPlugins } = require("../../src/lib/plugins");
const path = require("path");
const fs   = require("fs");

const CATEGORY_INFO = {
  main:     { icon: "✨",  label: "Main"        },
  group:    { icon: "👥",  label: "Grup"        },
  user:     { icon: "👤",  label: "User"        },
  ai:       { icon: "🤖",  label: "AI"          },
  download: { icon: "📥",  label: "Download"    },
  tools:    { icon: "🛠️",  label: "Tools"       },
  media:    { icon: "🎬",  label: "Media"       },
  sticker:  { icon: "🎭",  label: "Sticker"     },
  islami:   { icon: "🕌",  label: "Islami"      },
  fun:      { icon: "🎮",  label: "Fun & Games" },
  canvas:   { icon: "🎨",  label: "Canvas"      },
  owner:    { icon: "👑",  label: "Owner"       },
  other:    { icon: "📌",  label: "Lainnya"     },
  anime:    { icon: "🌸",  label: "Anime"       },
  internet: { icon: "🌐",  label: "Internet"    },
  maker:    { icon: "✂️",  label: "Maker"       },
  database: { icon: "🗄️",  label: "Database"    },
  panel:    { icon: "⚙️",  label: "Panel"       },
  game:     { icon: "🎯",  label: "Game"        },
  image:    { icon: "🖼️",  label: "Image"       },
  info:     { icon: "ℹ️",  label: "Info"        },
  quotes:   { icon: "💬",  label: "Quotes"      },
  random:   { icon: "🎲",  label: "Random"      },
  rpg:      { icon: "⚔️",  label: "RPG"         },
  search:   { icon: "🔎",  label: "Search"      },
  sound:    { icon: "🔊",  label: "Sound"       },
  stalker:  { icon: "👁️",  label: "Stalker"     },
  store:    { icon: "🏪",  label: "Store"       },
  tool:     { icon: "🔧",  label: "Tool"        },
  uploader: { icon: "☁️",  label: "Uploader"    },
  voice:    { icon: "🎙️",  label: "Voice"       },
  xp:       { icon: "⭐",  label: "XP"          },
};

const CATEGORY_ORDER = [
  "main", "ai", "download", "tools", "media", "sticker",
  "fun", "game", "anime", "internet", "maker", "group",
  "user", "rpg", "search", "voice", "canvas", "image",
  "info", "quotes", "random", "database", "panel", "store",
  "sound", "stalker", "tool", "uploader", "xp", "islami",
  "owner", "other",
];

const BANNER_IMG = path.join(process.cwd(), "assets", "images", "nexa02.jpg");

function getUniquePlugins(isOwner = false) {
  const seen = new Set();
  return getAllPlugins().filter(p => {
    if (!p?.config?.isEnabled) return false;
    if (p.config.category === "owner" && !isOwner) return false;
    const key = Array.isArray(p.config.name) ? p.config.name[0] : p.config.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getWIBTime() {
  const now = new Date();
  const wibOffset = 7 * 60 * 60 * 1000;
  const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  return new Date(utc + wibOffset);
}

function formatWIBDate(date) {
  const months = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember"
  ];
  const days = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatWIBTime(date) {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  const s = date.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// ====== FAKE QUOTED: WhatsApp Business Style ======
function makeFakeQuoted(botName) {
  return {
    key: {
      remoteJid: "0@s.whatsapp.net",
      fromMe: false,
      id: "NexaBotMenu",
      participant: "0@s.whatsapp.net",
    },
    message: {
      requestPaymentMessage: {
        currencyCodeIso4217: "USD",
        amount1000: 0,
        requestFrom: "0@s.whatsapp.net",
        noteMessage: {
          extendedTextMessage: {
            text: botName || "NexaBot",
          },
        },
        expiryTimestamp: 0,
      },
    },
  };
}

module.exports = {
  config: {
    name: "allmenu",
    alias: ["allcmd", "menuall", "cmdall"],
    category: "main",
    description: "Tampilkan semua command dengan tampilan premium",
    isEnabled: true,
    cooldown: 5,
    skipRegistration: true,
  },

  async handler(m, { config, sock }) {
    const prefix     = m.prefix || ".";
    const allPlugins = getUniquePlugins(m.isOwner);
    const totalCmd   = allPlugins.length;

    // Group plugins by category
    const categoryMap = {};
    allPlugins.forEach(p => {
      const cat = p.config.category?.toLowerCase() || "other";
      if (!categoryMap[cat]) categoryMap[cat] = [];
      categoryMap[cat].push(p);
    });

    // Sort categories
    const extraCats   = Object.keys(categoryMap).filter(c => !CATEGORY_ORDER.includes(c));
    const orderedCats = [...CATEGORY_ORDER, ...extraCats];

    // Waktu WIB
    const wibNow  = getWIBTime();
    const dateStr = formatWIBDate(wibNow);
    const timeStr = formatWIBTime(wibNow);

    // Build menu text
    let menuText = "";
    menuText += `╭━━━〔 𝗡𝗘𝗫𝗔 𝗕𝗢𝗧 〕━━━⬣\n`;
    menuText += `┃ 👤 ᴜꜱᴇʀ    : ${m.pushName || "ᴘᴇɴɢɢᴜɴᴀ"}\n`;
    menuText += `┃ 📅 ᴅᴀᴛᴇ    : ${dateStr}\n`;
    menuText += `┃ ⏰ ᴛɪᴍᴇ    : ${timeStr} WIB\n`;
    menuText += `┃ ⚡ ᴘʀᴇꜰɪx  : ${prefix}\n`;
    menuText += `┃ 📊 ᴛᴏᴛᴀʟ   : ${totalCmd} Command\n`;
    menuText += `┃ 🎭 ᴍᴏᴅᴇ    : ${m.isOwner ? "🜲 ᴏᴡɴᴇʀ" : "👤 ᴜꜱᴇʀ"}\n`;
    menuText += `╰━━━━━━━━━━━━━━━━━━━━━━━⬣\n\n`;

    for (const cat of orderedCats) {
      if (!categoryMap[cat] || categoryMap[cat].length === 0) continue;

      const info    = CATEGORY_INFO[cat] || { icon: "📌", label: cat.toUpperCase() };
      const plugins = categoryMap[cat];

      menuText += `╭─〔 ${info.icon} *${info.label.toUpperCase()}* 〕─⬣\n`;
      plugins.forEach((p, idx) => {
        const name        = Array.isArray(p.config.name) ? p.config.name[0] : p.config.name;
        const hasLimit    = p.config?.limit !== undefined && p.config.limit > 0;
        const limitBadge  = hasLimit ? ` ⓛ` : "";
        menuText += `│ ${(idx + 1).toString().padStart(2)}. \`${prefix}${name}\`${limitBadge}\n`;
      });
      menuText += `╰──────────────⬣\n\n`;
    }

    menuText += `╭───〔 💖 *${config.bot?.name || "NexaBot"}* 〕───⬣\n`;
    menuText += `│  ☘︎ "ʏᴏᴜʀ ʙᴏᴛ, ʏᴏᴜʀ ʀᴜʟᴇꜱ"\n`;
    menuText += `│ ⓘ  ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴᴇxᴀᴅᴇᴠ\n`;
    menuText += `│ ⓘ ᴋᴇᴛɪᴋ \`${prefix}help <command>\` ᴜɴᴛᴜᴋ ɪɴꜰᴏ ᴅᴇᴛᴀɪʟ\n`;
    menuText += `╰──────────────⬣`;

    // ====== HANYA forwardingScore + isForwarded (tanpa externalAdReply) ======
    // Dihilangkan externalAdReply karena user tidak mau tampilan link preview
    const contextInfo = {
      forwardingScore: 999,
      isForwarded: true,
    };

    // ====== Build fake quoted (WhatsApp Business style) ======
    const fakeQuoted = makeFakeQuoted(config.bot?.name || "NexaBot");

    // Try send as image with caption + fake quoted
    const imgExists = fs.existsSync(BANNER_IMG);

    if (imgExists) {
      try {
        const imageBuffer = fs.readFileSync(BANNER_IMG);

        const messageContent = {
          image: imageBuffer,
          caption: menuText,
          contextInfo: contextInfo,
        };

        return await sock.sendMessage(m.chat, messageContent, { quoted: fakeQuoted });
      } catch (err) {
        console.error("[allmenu] Gagal kirim image:", err.message);
      }
    }

    // Fallback 1: text dengan contextInfo + fake quoted
    try {
      return await sock.sendMessage(
        m.chat,
        { text: menuText, contextInfo: contextInfo },
        { quoted: fakeQuoted }
      );
    } catch (err) {
      console.error("[allmenu] Gagal kirim text + contextInfo:", err.message);
    }

    // Fallback 2: plain text + fake quoted
    try {
      return await sock.sendMessage(m.chat, { text: menuText }, { quoted: fakeQuoted });
    } catch (err) {
      console.error("[allmenu] Gagal kirim plain text:", err.message);
      return await sock.sendMessage(m.chat, { text: menuText });
    }
  },
};