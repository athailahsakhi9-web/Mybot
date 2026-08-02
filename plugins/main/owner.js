// plugins/main/owner.js
// Carousel 2 card: Developer + Pemilik Bot

const path = require("path");
const fs   = require("fs");
const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = require("nexa");

const LOCAL_IMG = path.join(process.cwd(), "assets", "images", "nexa02.jpg");

module.exports = {
  config: {
    name: "owner",
    alias: ["contact", "creator"],
    category: "main",
    isEnabled: true,
    cooldown: 5,
    skipRegistration: true,
  },

  async handler(m, { sock, config }) {
    const botName   = config.bot?.name      || "NexaBot";
    const ownerName = config.bot?.developer || "NexaDev";
    // Ambil nomor dari config.owner array: ["6287735002469@s.whatsapp.net", ...]
    const ownerJid  = Array.isArray(config.owner) ? config.owner[0] : (config.owner || "");
    const ownerNumber = ownerJid.split("@")[0].split(":")[0];
    const userName  = m.pushName || "Pengguna";

    const headerText =
      `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n` +
      `> *Halo Kak \`${userName}\`, Tekan Tombol Yang bertuliskan Chat Owner Untuk Menghubungi Nomor Owner ku*\n` +
      `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;

    try {
      const imgBuffer = fs.readFileSync(LOCAL_IMG);
      const imgMedia  = await prepareWAMessageMedia(
        { image: imgBuffer },
        { upload: sock.waUploadToServer }
      );

      const headerProto = proto.Message.InteractiveMessage.Header.create({
        ...imgMedia,
        hasMediaAttachment: true,
        gifPlayback: false,
      });

      const msg = generateWAMessageFromContent(
        m.chat,
        {
          viewOnceMessage: {
            message: {
              interactiveMessage: {
                body: { text: headerText },
                carouselMessage: {
                  messageVersion: 1,
                  cards: [
                    // ── Card 1: Developer ──────────────────────────
                    {
                      header: headerProto,
                      body: {
                        text:
                          `┏───────────────┈\n` +
                          `┆     「 *\`[DEVELOPER BOT]\`* 」\n` +
                          `┣───────────────┈\n` +
                          `┣──=[ *\`[ ${ownerName} ]\`* ]==─\n` +
                          `┆ • Jangan Chat Yang Aneh Aneh\n` +
                          `┆ • Jangan Telpon/Call Developer\n` +
                          `┆ • Chat Langsung ke intinya aja\n` +
                          `┆ • Chat Aja Kalo Tanya Fitur\n` +
                          `└────────────┈ ⳹`,
                      },
                      nativeFlowMessage: {
                        buttons: [
                          {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                              display_text: `💬 Chat Owner ( ${ownerName} )`,
                              url: `https://wa.me/${ownerNumber}`,
                              merchant_url: `https://wa.me/${ownerNumber}`,
                            }),
                          },
                        ],
                      },
                    },
                    // ── Card 2: Pemilik Bot ────────────────────────
                    {
                      header: headerProto,
                      body: {
                        text:
                          `┏───────────────┈\n` +
                          `┆     「 *\`[PEMILIK BOT]\`* 」\n` +
                          `┣───────────────┈\n` +
                          `┣──=[ *\`[ ${ownerName} ]\`* ]==─\n` +
                          `┆ • Jangan Spam Bot\n` +
                          `┆ • Jangan Telpon/Call Bot\n` +
                          `┆ • Gausah Chat Yg Aneh Aneh\n` +
                          `┆ • Beli Premium? Chat Owner\n` +
                          `└────────────┈ ⳹`,
                      },
                      nativeFlowMessage: {
                        buttons: [
                          {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                              display_text: `💬 Chat Bot ( ${botName} )`,
                              url: `https://wa.me/${ownerNumber}`,
                              merchant_url: `https://wa.me/${ownerNumber}`,
                            }),
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        { userJid: sock.user?.id }
      );

      await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });

    } catch (e) {
      console.error("[Owner] carousel gagal:", e.message);
      await m.reply(
        `👑 *OWNER INFO*\n\n` +
        `• Nama   : ${ownerName}\n` +
        `• Nomor  : +${ownerNumber}\n` +
        `• Bot    : ${botName}\n\n` +
        `Chat owner: https://wa.me/${ownerNumber}`
      );
    }
  },
};