// plugins/main/rules.js
// Rules dengan format InteractiveMessage (Baileys v6+) — mirip menucat.js
//
// CATATAN JUJUR:
// Tampilan "Pratinjau tabel" kotak (seperti WhatsApp Business Cloud API resmi)
// TIDAK BISA direplikasi identik lewat Baileys/fork manapun — itu render UI
// native yang hanya ada di WhatsApp Business Platform (Meta), bukan di
// protokol Web/Multi-Device yang dipakai Baileys. File ini adalah versi
// terbaik yang benar-benar bisa terkirim & tampil rapi: interactiveMessage
// (list bisa di-scroll via tombol) + tabel teks monospace yang align rapi.

const path  = require("path");
const fs    = require("fs");
const sharp = require("sharp");

// Try to import from @whiskeysockets/baileys first, fallback ke baileys/nexa
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

const { generateWAMessageFromContent, proto } = baileysModule;

const LOCAL_IMG = path.join(process.cwd(), "assets", "images", "nexa02.jpg");

const pluginConfig = {
  name: "rules",
  alias: ["aturanbot", "botrules"],
  category: "main",
  description: "Menampilkan rules/aturan bot",
  usage: ".rules",
  example: ".rules",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

// ===== Daftar rules kamu =====
const DEFAULT_BOT_RULES = [
  { no: "1", rule: "No share Link GB" },
  { no: "2", rule: "No promosi ada link GB" },
  { no: "3", rule: "Toxic" },
  { no: "4", rule: "Dilarang ada bot lain selain Nexa Bot" },
  { no: "5", rule: "Saling menghargai" },
];

// ===== Small caps (konsisten dengan gaya menucat.js) =====
function toSmallCaps(text) {
  const smallCaps = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ",
    i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ",
    q: "ǫ", r: "ʀ", s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x",
    y: "ʏ", z: "ᴢ",
  };
  return text.toLowerCase().split("").map(c => smallCaps[c] || c).join("");
}

// Truncate biasa — hanya dipakai untuk title row list interaktif WhatsApp
// (bukan untuk alignment, jadi tidak perlu hitung display-width)
function truncateSimple(str, maxLen) {
  return str.length > maxLen ? str.slice(0, maxLen - 3) + "..." : str;
}

// ===== Bangun teks rules: bracket-box list bernomor =====
// Sengaja TIDAK pakai tabel berkolom (No | Rule) karena karakter garis kotak
// (─┃╭╮) dan emoji punya lebar render berbeda-beda di tiap HP/font WhatsApp —
// kolom yang kelihatan lurus di satu device bisa geser di device lain.
// List bernomor di dalam bracket box ini tidak punya kolom yang bisa geser,
// jadi hasilnya konsisten rapi di semua device.
function buildRulesText(botName) {
  const title = toSmallCaps(`${botName} — Rules`);

  let text = `╭─〔 📜 \`${title}\`〕─⬣\n`;
  DEFAULT_BOT_RULES.forEach((r) => {
    text += `┃ *${r.no}.* ${r.rule}\n`;
  });
  text += `╰─⬣\n\n`;

  text += `⚠️ *${toSmallCaps("Sistem Pelanggaran")}*\n`;
  text += `🚨 Warning (1x) → Kick (2x) → Ban (3x+)\n`;
  text += `📮 Hubungi owner jika ada keberatan\n`;
  text += `🙏 Terima kasih telah patuhi rules!`;

  return text;
}

async function makeFakeQuoted(botName) {
  const thumbnail = fs.existsSync(LOCAL_IMG)
    ? await sharp(fs.readFileSync(LOCAL_IMG)).resize(300, 300).toBuffer()
    : undefined;

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
            address: "📜 Bot Rules",
            jpegThumbnail: thumbnail,
          },
        },
        body: { text: "📜 Bot Rules" },
      },
    },
  };
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const botName = botConfig.bot?.name || "NexaBot";
    const prefix  = m.prefix || ".";

    const bodyText = buildRulesText(botName);

    // ===== Rows untuk interactive list ("Lihat semua") =====
    const tableRows = DEFAULT_BOT_RULES.map((r) => ({
      title: `${r.no}. ${truncateSimple(r.rule, 55)}`,
      description: "",
      id: `rule_${r.no}`,
    }));

    const buttons = [
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: "📋 LIHAT SEMUA RULES",
          sections: [
            {
              title: "📜 Daftar Rules",
              rows: tableRows,
            },
          ],
          icon: "DEFAULT",
        }),
      },
      {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: "🔙 Kembali ke Menu",
          id: `${prefix}menu`,
        }),
      },
      {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: "👤 Owner",
          id: `${prefix}owner`,
        }),
      },
    ];

    // ===== METHOD 1: InteractiveMessage (Baileys v6+) =====
    let interactiveSuccess = false;
    try {
      const thumbnail = fs.existsSync(LOCAL_IMG)
        ? await sharp(fs.readFileSync(LOCAL_IMG)).resize(300, 300).toBuffer()
        : undefined;

      const interactiveMessage = proto.Message.InteractiveMessage.create({
        header: proto.Message.InteractiveMessage.Header.create({
          hasMediaAttachment: !!thumbnail,
          locationMessage: {
            degreesLatitude: 0,
            degreesLongitude: 0,
            name: botName,
            address: "📜 Bot Rules",
            jpegThumbnail: thumbnail,
          },
        }),
        body:   proto.Message.InteractiveMessage.Body.create({ text: bodyText }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: `© ${botName} — Rules Bot` }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
          messageParamsJson: JSON.stringify({
            bottom_sheet: {
              in_thread_buttons_limit: 1,
              list_title: "Daftar Rules Bot",
              button_title: "📋 LIHAT SEMUA RULES",
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
      console.error("[Rules] InteractiveMessage gagal:", e.message);
    }

    // ===== METHOD 2: Fallback — kirim gambar + caption tabel, atau teks polos =====
    if (interactiveSuccess) return;

    try {
      const contextInfo = {
        forwardingScore: 999,
        isForwarded: true,
      };

      if (fs.existsSync(LOCAL_IMG)) {
        await sock.sendMessage(
          m.chat,
          {
            image: fs.readFileSync(LOCAL_IMG),
            caption: bodyText,
            contextInfo,
          },
          { quoted: await makeFakeQuoted(botName) }
        );
      } else {
        await sock.sendMessage(
          m.chat,
          { text: bodyText, contextInfo },
          { quoted: await makeFakeQuoted(botName) }
        );
      }
    } catch (e2) {
      console.error("[Rules] Fallback gagal:", e2.message);
      try {
        await m.reply(bodyText).catch(() => {});
      } catch {}
    }
  } catch (e) {
    console.error("[Rules] Error:", e.message);
    await m.reply("❌ Terjadi kesalahan saat mengambil rules").catch(() => {});
  }
}

module.exports = {
  config: pluginConfig,
  handler,
};