// plugins/main/menucat.js
// Fixed for Baileys v6+ & Regular WhatsApp Compatibility
// FIX: hanya kirim 1 pesan (interactive JIKA sukses, else fallback)

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

function toSmallCaps(text) {
  const smallCaps = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ",
    i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ",
    q: "ǫ", r: "ʀ", s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x",
    y: "ʏ", z: "ᴢ",
  };
  return text.toLowerCase().split("").map(c => smallCaps[c] || c).join("");
}

function createBracketBox(emoji, title, lines = []) {
  let text = `╭─〔 ${emoji} \`${toSmallCaps(title)}\`〕─⬣\n`;
  for (const line of lines) {
    text += `┃ ${line}\n`;
  }
  text += `╰─⬣\n`;
  return text;
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

module.exports = {
  config: {
    name: "menucat",
    alias: [],
    category: "main",
    isEnabled: true,
    cooldown: 3,
    skipRegistration: true,
  },

  async handler(m, { sock, config }) {
    const prefix = m.prefix || ".";
    const catArg = (m.text || "").trim().toLowerCase().split(/\s+/)[0];

    if (!catArg) return m.reply("❌ Sebutkan kategorinya.\nContoh: .menucat main");

    const allPlugins = getUniquePlugins();
    const catPlugins = allPlugins.filter(p =>
      (p.config.category?.toLowerCase() || "other") === catArg
    );

    if (catPlugins.length === 0) {
      return m.reply(`❌ Kategori *${catArg}* tidak ditemukan atau kosong.`);
    }

    const info    = CATEGORY_INFO[catArg] || { icon: "🧩", label: catArg };
    const botName = config.bot?.name || "NexaBot";
    const cuaca   = await weatherMenu();

    // Teks daftar command
    const cmdLines = catPlugins.map(p => {
      const name = Array.isArray(p.config.name) ? p.config.name[0] : p.config.name;
      return `.${name}`;
    });

    const bodyText = createBracketBox(info.icon, `${info.label} — Menu`, cmdLines);

    // Rows for interactive message
    const cmdRows = catPlugins.map(p => {
      const name = Array.isArray(p.config.name) ? p.config.name[0] : p.config.name;
      const desc = p.config.description || "Ketuk untuk menjalankan";
      return {
        title: `.${name}`,
        description: desc.length > 60 ? desc.slice(0, 57) + "..." : desc,
        id: `${prefix}${name}`,
      };
    });

    const buttons = [
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: "📋 LIST MENU BOT",
          sections: [{
            title: `${info.icon} ${info.label} Commands`,
            rows: cmdRows,
          }],
          icon: "DEFAULT",
        }),
      },
      {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: "📜 Rules",
          id: `${prefix}rules`,
        }),
      },
      {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: "🔙 Kembali ke Menu",
          id: `${prefix}menu`,
        }),
      },
    ];

    // ====== METHOD 1: Interactive Message (Modern WhatsApp) ======
    let interactiveSuccess = false;
    try {
      const thumbnail = fs.existsSync(LOCAL_IMG)
        ? await sharp(fs.readFileSync(LOCAL_IMG)).resize(300, 300).toBuffer()
        : undefined;

      const interactiveMessage = proto.Message.InteractiveMessage.create({
        header: proto.Message.InteractiveMessage.Header.create({
          hasMediaAttachment: true,
          locationMessage: {
            degreesLatitude: 0,
            degreesLongitude: 0,
            name: botName,
            address: cuaca,
            jpegThumbnail: thumbnail,
          },
        }),
        body:   proto.Message.InteractiveMessage.Body.create({ text: bodyText }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: `© ${botName} — ${info.label}` }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
          messageParamsJson: JSON.stringify({
            bottom_sheet: {
              in_thread_buttons_limit: 1,
              list_title: `Pilih command ${info.label}`,
              button_title: "📋 LIST MENU BOT",
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
      console.error("[Menucat] InteractiveMessage gagal:", e.message);
    }

    // ====== METHOD 2: Fallback - HANYA jika METHOD 1 gagal ======
    if (interactiveSuccess) return;

    try {
      const navText = `\n\n_Gunakan \`${prefix}menu\` untuk kembali_`;
      const fullCaption = `🌦️ ${cuaca}\n\n` + bodyText + navText;

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
      console.error("[Menucat] Fallback gagal:", e.message);
      try {
        await m.reply(bodyText + `\n\n_Gunakan \`${prefix}menu\` untuk kembali_`).catch(() => {});
      } catch {}
    }
  },
};