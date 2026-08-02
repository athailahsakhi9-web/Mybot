const path = require("path");
const fs   = require("fs");
const axios = require("axios");
const sharp = require("sharp");
const { getAllPlugins } = require("../../src/lib/plugins");

// Try to import from @whiskeysockets/baileys first, fallback to nexa
let baileysModule;
try {
  baileysModule = require("@whiskeysockets/baileys");
} catch {
  try {
    baileysModule = require("baileys");
  } catch {
    baileysModule = require("nexa");
  }
}

const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = baileysModule;

const LOCAL_IMG = path.join(process.cwd(), "assets", "images", "nexa02.jpg");

const CATEGORY_INFO = {
  main:       { icon: "⬩",  label: "Main" },
  group:      { icon: "◈",  label: "Grup" },
  user:       { icon: "👤",  label: "User" },
  ai:         { icon: "🤖",  label: "AI" },
  download:   { icon: "📥",  label: "Download" },
  downloader: { icon: "📥",  label: "Downloader" },
  tools:      { icon: "🛠",  label: "Tools" },
  media:      { icon: "📸",  label: "Media" },
  sticker:    { icon: "✨",  label: "Sticker" },
  fun:        { icon: "🎮",  label: "Fun & Games" },
  canvas:     { icon: "🎨",  label: "Canvas" },
  search:     { icon: "🔍",  label: "Search" },
  owner:      { icon: "👑",  label: "Owner" },
  other:      { icon: "🧩",  label: "Lainnya" },
};

function getUptimeStr() {
  const connectedAt = global._botConnectedAt || Date.now();
  const ms = Date.now() - connectedAt;
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
  return h > 0 ? `${h}j ${m % 60}m` : `${m}m ${s % 60}s`;
}

function getUniquePlugins() {
  const seen = new Set();
  return getAllPlugins().filter(p => {
    if (!p?.config?.isEnabled) return false;
    const key = Array.isArray(p.config.name) ? p.config.name[0] : p.config.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function runtime(seconds) {
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor(seconds % (3600 * 24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);
  return `${d} Jam ${m} Menit ${s} Detik`;
}

const weatherCode = {
  0: "☀️ Cerah",
  1: "🌤️ Cerah Berawan",
  2: "⛅ Berawan",
  3: "☁️ Mendung",
  45: "🌫️ Berkabut",
  48: "🌫️ Kabut Tebal",
  51: "🌦️ Gerimis",
  61: "🌧️ Hujan Ringan",
  63: "🌧️ Hujan",
  65: "⛈️ Hujan Lebat",
  80: "🌦️ Hujan Lokal",
  95: "⛈️ Badai Petir",
};

async function weatherMenu(city = "Jakarta") {
  try {
    const geo = await axios.get(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
    );
    const loc = geo.data.results?.[0];
    if (!loc) return "Cuaca tidak tersedia";
    const res = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code`
    );
    const current = res.data.current;
    const kondisi = weatherCode[current.weather_code] || "🌍 Tidak diketahui";
    return `${kondisi} | 🌡️ ${Math.round(current.temperature_2m)}°C\n📍 ${loc.name}`;
  } catch {
    return "Cuaca tidak tersedia";
  }
}

async function makeFakeQuoted(botName) {
  const style = Math.floor(Math.random() * 5) + 1; // 1-5

  switch (style) {
    case 1: {
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
              extendedTextMessage: { text: botName || "NexaBot" },
            },
            expiryTimestamp: 0,
          },
        },
      };
    }

    case 2: {
      return {
        key: {
          remoteJid: "0@s.whatsapp.net",
          fromMe: false,
          id: "NexaBotMenu",
          participant: "0@s.whatsapp.net",
        },
        message: {
          contactMessage: {
            displayName: botName || "NexaBot",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;${botName || "NexaBot"};;;\nFN:${botName || "NexaBot"}\nEND:VCARD`,
          },
        },
      };
    }

    case 3: {
      return {
        key: {
          remoteJid: "0@s.whatsapp.net",
          fromMe: false,
          id: "NexaBotMenu",
          participant: "0@s.whatsapp.net",
        },
        message: {
          extendedTextMessage: {
            text: `⏱️ Uptime: ${runtime(process.uptime())}`,
            contextInfo: {
              externalAdReply: {
                title: botName || "NexaBot",
                body: "System Runtime",
                mediaType: 1,
                renderLargerThumbnail: false,
              },
            },
          },
        },
      };
    }

    case 4: {
      return {
        key: {
          remoteJid: "0@s.whatsapp.net",
          fromMe: false,
          id: "NexaBotMenu",
          participant: "0@s.whatsapp.net",
        },
        message: {
          orderMessage: {
            itemCount: 1,
            status: 1,
            surface: 1,
            message: botName || "NexaBot",
            orderTitle: "Nexa Bot Menu",
            thumbnail: fs.existsSync(LOCAL_IMG) ? fs.readFileSync(LOCAL_IMG) : undefined,
            sellerJid: "0@s.whatsapp.net",
          },
        },
      };
    }

    case 5:
    default: {
      const thumbnail = fs.existsSync(LOCAL_IMG)
        ? await sharp(fs.readFileSync(LOCAL_IMG)).resize(300, 300).toBuffer()
        : undefined;

      const cuaca = await weatherMenu();

      return {
        key: {
          fromMe: false,
          participant: "0@s.whatsapp.net",
          remoteJid: "0@s.whatsapp.net",
        },
        message: {
          interactiveMessage: {
            header: {
              hasMediaAttachment: true,
              locationMessage: {
                degreesLatitude: 0,
                degreesLongitude: 0,
                name: botName || "NexaBot",
                address: cuaca,
                jpegThumbnail: thumbnail,
              },
            },
            body: { text: cuaca },
          },
        },
      };
    }
  }
}

async function getImageMedia(sock) {
  const imgBuffer = fs.readFileSync(LOCAL_IMG);
  return prepareWAMessageMedia(
    { image: imgBuffer },
    { upload: sock.waUploadToServer }
  );
}

module.exports = {
  config: {
    name: "menu",
    alias: ["help"],
    category: "main",
    isEnabled: true,
    cooldown: 5,
    skipRegistration: true,
  },

  async handler(m, { sock, config }) {
    const prefix     = m.prefix || ".";
    const allPlugins = getUniquePlugins();

    const categoryMap = {};
    allPlugins.forEach(p => {
      const cat = p.config.category?.toLowerCase() || "other";
      if (!categoryMap[cat]) categoryMap[cat] = [];
      categoryMap[cat].push(p);
    });

    const totalCat  = Object.keys(categoryMap).length;
    const botName   = config.bot?.name      || "NexaBot";
    const ownerName = config.bot?.developer || "NexaDev";

    const bodyText =
      `乂  𝗡𝗘𝗫𝗔 𝗕𝗢𝗧\n\n` +
      `┌  ◦  ᴜᴘᴛɪᴍᴇ   : ${getUptimeStr()}\n` +
      `│  ◦  ᴘʀᴇꜰɪx   : [ ${prefix} ]\n` +
      `│  ◦  ᴛᴏᴛᴀʟ    : ${allPlugins.length} Command\n` +
      `│  ◦  ᴋᴀᴛᴇɢᴏʀɪ : ${totalCat} Kategori\n` +
      `└  ◦  ᴏᴡɴᴇʀ    : ${ownerName}\n\n` +
      `ɢᴜɴᴀᴋᴀɴ ᴛᴏᴍʙᴏʟ ᴅɪ ʙᴀᴡᴀʜ ᴜɴᴛᴜᴋ ɴᴀᴠɪɢᴀꜱɪ 👇`;

    // Build category rows for interactive message
    const categoryRows = Object.entries(categoryMap).map(([cat, plugins]) => {
      const info = CATEGORY_INFO[cat] || { icon: "🧩", label: cat };
      return {
        title: `${info.icon} ${info.label.toUpperCase()}`,
        description: `Memiliki (${plugins.length}) Perintah`,
        id: `${prefix}menucat ${cat}`,
      };
    });

    const buttons = [
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: "⌯⌲ ᴘɪʟɪʜ ᴋᴀᴛᴇɢᴏʀɪ",
          sections: [{ title: "ᴅᴀꜰᴛᴀʀ ᴋᴀᴛᴇɢᴏʀɪ ᴍᴇɴᴜ", rows: categoryRows }],
          icon: "DEFAULT",
        }),
      },
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: "Selengkapnya",
          sections: [{
            title: "Pilihan Lainnya",
            rows: [
              { title: "❀ ʟɪʜᴀᴛ ꜱᴇᴍᴜᴀ ᴍᴇɴᴜ", description: "Tampilkan semua command", id: `${prefix}allmenu` },
              { title: "🤖 Info Bot",          description: "Informasi tentang bot",   id: `${prefix}botinfo` },
              { title: "👤 Profil Kamu",      description: "Lihat data profil kamu",  id: `${prefix}profile` },
                { title: "ⓘ rules",      description: "Lihat Rules",  id: `${prefix}rules` },
            ],
          }],
          icon: "REVIEW",
        }),
      },
      {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({ display_text: "🛒 Dapatkan Script (Gratis)", id: `${prefix}sc` }),
      },
      {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({ display_text: "🜲 Owner", id: `${prefix}owner` }),
      },
    ];

    // ====== METHOD 1: Interactive Message (Modern WhatsApp) ======
    let interactiveSuccess = false;
    try {
      const media = await getImageMedia(sock);

      const interactiveMessage = proto.Message.InteractiveMessage.create({
        header: proto.Message.InteractiveMessage.Header.create({
          hasMediaAttachment: true,
          ...media,
        }),
        body:   proto.Message.InteractiveMessage.Body.create({ text: bodyText }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: `© ${botName}` }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
          messageParamsJson: JSON.stringify({
            bottom_sheet: {
              in_thread_buttons_limit: 2,
              divider_indices: [1, 2, 3, 999],
              list_title: "Silahkan pilih menu yang kamu inginkan",
              button_title: "🍃 Selengkapnya",
            },
          }),
          buttons,
        }),
        contextInfo: {
          mentionedJid: [m.sender],
          forwardingScore: 999,
          isForwarded: true,
        },
      });

      const generated = generateWAMessageFromContent(
        m.chat,
        proto.Message.create({ interactiveMessage }),
        { userJid: sock.user?.id, quoted: await makeFakeQuoted(botName) }
      );

      await sock.relayMessage(m.chat, generated.message, { messageId: generated.key.id });
      interactiveSuccess = true;

    } catch (e) {
      console.error("[Menu] InteractiveMessage gagal:", e.message);
    }

    // ====== METHOD 2: Fallback - HANYA jika METHOD 1 gagal ======
    if (interactiveSuccess) return;

    try {
      const navText =
        `\n\n📋 *NAVIGASI*\n` +
        `› \`${prefix}allmenu\` — Semua command\n` +
        `› \`${prefix}owner\`   — Info owner\n` +
        `› \`${prefix}menucat <kategori>\` — Command per kategori`;

      const fullCaption = bodyText + navText;

      const contextInfo = {
        forwardingScore: 999,
        isForwarded: true,
      };

      if (fs.existsSync(LOCAL_IMG)) {
        await sock.sendMessage(
          m.chat,
          {
            image: fs.readFileSync(LOCAL_IMG),
            caption: fullCaption,
            contextInfo,
          },
          { quoted: await makeFakeQuoted(botName) }
        );
      } else {
        await sock.sendMessage(
          m.chat,
          { text: fullCaption, contextInfo },
          { quoted: await makeFakeQuoted(botName) }
        );
      }
    } catch (e) {
      console.error("[Menu] Fallback gagal:", e.message);
      try {
        await m.reply(bodyText).catch(() => {});
      } catch {}
    }
  },
};