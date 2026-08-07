const path = require("path");
const fs   = require("fs");
const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = require("nexa");

const BANNER_IMG = path.join(process.cwd(), "assets", "images", "nexa02.jpg");

function makeFakeQuoted(botName) {
  return {
    key: {
      remoteJid: "0@s.whatsapp.net",
      fromMe: false,
      id: "NexaBotSC",
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

module.exports = {
  config: {
    name: "sc",
    alias: ["script", "source", "sourcecode", "getscript"],
    category: "main",
    description: "Dapatkan script bot secara gratis",
    isEnabled: true,
    cooldown: 5,
    skipRegistration: true,
  },

  async handler(m, { sock, config }) {
    const prefix    = m.prefix || ".";
    const botName   = config.bot?.name      || "NexaBot";
    const botVer    = config.bot?.version   || "1.0.0";
    const devName   = config.bot?.developer || "NexaDev";
    const support   = config.bot?.support   || "https://wa.me/6287876034799";

    const caption =
      `乂  *${botName}* — ꜱᴄʀɪᴘᴛ\n\n` +
      `┌  ◦  ɴᴀᴍᴀ    : *${botName}*\n` +
      `│  ◦  ᴠᴇʀꜱɪ   : *v${botVer}*\n` +
      `│  ◦  ᴅᴇᴠ     : *${devName}*\n` +
      `│  ◦  ʙᴀꜱᴇ    : *Baileys*\n` +
      `│  ◦  ʟɪᴄᴇɴꜱᴇ : *Free / Open Source*\n` +
      `└  ◦  ꜱᴜᴘᴘᴏʀᴛ : *${support}*\n\n` +
      `📦 *ꜱᴄʀɪᴘᴛ ɪɴɪ ʙɪꜱᴀ ᴋᴀᴍᴜ ᴅᴀᴘᴀᴛᴋᴀɴ ɢʀᴀᴛɪꜱ!*\n` +
      `> ᴋʟɪᴋ ᴛᴏᴍʙᴏʟ ᴅɪ ʙᴀᴡᴀʜ ᴜɴᴛᴜᴋ ᴍᴇɴɢᴜɴᴅᴜʜ ᴀᴛᴀᴜ ᴋᴜɴᴊᴜɴɢɪ ᴡᴇʙꜱɪᴛᴇ ɴʏᴀ 👇`;

    const fakeQuoted = makeFakeQuoted(botName);
    const imgExists  = fs.existsSync(BANNER_IMG);

    // ====== METHOD 1: Interactive Message ======
    try {
      let media = {};
      if (imgExists) {
        const imgBuffer = fs.readFileSync(BANNER_IMG);
        media = await prepareWAMessageMedia(
          { image: imgBuffer },
          { upload: sock.waUploadToServer }
        );
      }

      const buttons = [
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "🌐 Kunjungi Website",
            url: "https://nexadev.my.id/nexasource",
            merchant_url: "https://nexadev.my.id/nexasource",
          }),
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "📞 Hubungi Owner",
            url: support,
            merchant_url: support,
          }),
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Menu Utama",
            id: `${prefix}menu`,
          }),
        },
      ];

      const interactiveMessage = proto.Message.InteractiveMessage.create({
        header: proto.Message.InteractiveMessage.Header.create({
          hasMediaAttachment: imgExists,
          ...(imgExists ? media : {}),
        }),
        body:   proto.Message.InteractiveMessage.Body.create({ text: caption }),
        footer: proto.Message.InteractiveMessage.Footer.create({
          text: `© ${botName} v${botVer} • Free Source`,
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
          messageParamsJson: JSON.stringify({
            bottom_sheet: {
              in_thread_buttons_limit: 3,
              list_title: "Pilih aksi di bawah ini",
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
        { userJid: sock.user?.id, quoted: fakeQuoted }
      );

      await sock.relayMessage(m.chat, generated.message, {
        messageId: generated.key.id,
      });

      return;
    } catch (e) {
      console.error("[SC] Interactive gagal:", e.message);
    }

    // ====== METHOD 2: Fallback (image/text) ======
    try {
      const navText =
        `\n\n📌 *Link Script*\n` +
        `› Website: https://nexadev.my.id/nexasource\n` +
        `› Support: ${support}\n\n` +
        `> ᴋᴇᴛɪᴋ \`${prefix}menu\` ᴜɴᴛᴜᴋ ᴋᴇᴍʙᴀʟɪ`;

      const fullCaption = caption + navText;

      if (imgExists) {
        await sock.sendMessage(
          m.chat,
          {
            image: fs.readFileSync(BANNER_IMG),
            caption: fullCaption,
            contextInfo: {
              forwardingScore: 999,
              isForwarded: true,
            },
          },
          { quoted: fakeQuoted }
        );
      } else {
        await sock.sendMessage(
          m.chat,
          {
            text: fullCaption,
            contextInfo: {
              forwardingScore: 999,
              isForwarded: true,
            },
          },
          { quoted: fakeQuoted }
        );
      }
    } catch (e) {
      console.error("[SC] Fallback gagal:", e.message);
      await m.reply(caption).catch(() => {});
    }
  },
};
