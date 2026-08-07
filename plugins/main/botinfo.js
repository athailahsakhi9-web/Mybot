const os   = require("os");
const fs   = require("fs");
const path = require("path");
const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = require("nexa");

module.exports = {
  config: {
    name: "botinfo",
    alias: ["about", "info"],
    category: "main",
    description: "Informasi lengkap tentang bot",
    usage: "",
    isEnabled: true,
    cooldown: 5,
    skipRegistration: true,
  },

  async handler(m, { sock, config, db }) {
    await m.react("⏰");

    // ── Config (ambil dari config/index.js) ───────────────────
    const botName   = config.bot?.name      || "NexaBot";
    const botVer    = config.bot?.version   || "1.0.0";
    const devName   = config.bot?.developer || "NexaDev";
    const support   = config.bot?.support   || "-";
    const prefix    = m.prefix              || ".";
    const mode      = config.config?.mode   || "public";
    const modeText  = mode === "public" ? "🌍 Publik" : "🔒 Self";
    const ownerNum  = (config.owner?.[0] || "").replace("@s.whatsapp.net", "");
    const saluranLink = config.saluran?.link || config.bot?.support || "-";

    // ── System ───────────────────────────────────────────────
    const memUsed    = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const memTotal   = (os.totalmem() / 1024 / 1024).toFixed(0);
    const memPercent = ((memUsed / memTotal) * 100).toFixed(1);
    const platform   = os.platform();
    const arch       = os.arch();
    const cpuModel   = os.cpus()[0]?.model?.trim().replace(/\s+/g, " ") || "Unknown";
    const cpuShort   = cpuModel.split(" ").slice(0, 4).join(" ");
    const cpuCount   = os.cpus().length;
    const nodeVer    = process.version;

    // ── Stats ────────────────────────────────────────────────
    const totalUsers  = Object.keys(db.getAllUsers()).length;
    const totalGroups = Object.keys(db.getAllGroups()).length;
    const totalCmds   = db.getStat("commandsExecuted") || 0;
    const totalMsg    = db.getStat("messagesReceived")  || 0;

    // ── Uptime ───────────────────────────────────────────────
    const connectedAt = global._botConnectedAt || Date.now();
    const ms = Date.now() - connectedAt;
    const s  = Math.floor(ms / 1000);
    const mi = Math.floor(s / 60);
    const h  = Math.floor(mi / 60);
    const d  = Math.floor(h / 24);
    const uptime = d > 0
      ? `${d}ʜ ${h % 24}ᴊ ${mi % 60}ᴍ`
      : h > 0
      ? `${h}ᴊ ${mi % 60}ᴍ ${s % 60}ᴅ`
      : `${mi}ᴍ ${s % 60}ᴅ`;

    // ── RAM bar ──────────────────────────────────────────────
    const barLen   = 12;
    const filled   = Math.round((memUsed / memTotal) * barLen);
    const ramBar   = "▰".repeat(filled) + "▱".repeat(barLen - filled);
    const ramEmoji = memPercent < 50 ? "🟢" : memPercent < 80 ? "🟡" : "🔴";

    // ── Status & ping ────────────────────────────────────────
    const statusIcon = global._botStatus === "busy" ? "🔴" : "🟢";
    const statusText = global._botStatus === "busy" ? "Sibuk" : "Online";
    const ping = m.messageTimestamp
      ? Math.abs(Date.now() - m.messageTimestamp * 1000)
      : 0;
    const pingEmoji = ping < 500 ? "🟢" : ping < 1500 ? "🟡" : "🔴";

    // ── Waktu WIB ────────────────────────────────────────────
    const now     = new Date();
    const wibOpts = { timeZone: "Asia/Jakarta", hour12: false };
    const dateStr = now.toLocaleDateString("id-ID", {
      ...wibOpts, weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("id-ID", {
      ...wibOpts, hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

    // ── Caption ──────────────────────────────────────────────
    const caption =
      `${botName.toUpperCase()} ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ\n` +
      `━━━━━━━━━━━━━━\n\n` +

      `🤖 *ɪᴅᴇɴᴛɪᴛᴀs*\n` +
      `┌─────────────────\n` +
      `│ 𝖭𝖺𝗆𝖺    : *${botName}*\n` +
      `│ 𝖵𝖾𝗋𝗌𝗂   : *v${botVer}*\n` +
      `│ 𝖯𝗋𝖾𝖿𝗂𝗑  : *${prefix}*\n` +
      `│ 𝖬𝗈𝖽𝖾    : ${modeText}\n` +
      `│ 𝖲𝗍𝖺𝗍𝗎𝗌  : ${statusIcon} *${statusText}*\n` +
      `│ 𝖣𝖾𝗏     : *${devName}*\n` +
      `└─────────────────\n\n` +

      `💻 *sɪsᴛᴇᴍ*\n` +
      `┌─────────────────\n` +
      `│ 𝖮𝖲      : *${platform} ${arch}*\n` +
      `│ 𝖭𝗈𝖽𝖾    : *${nodeVer}*\n` +
      `│ 𝖢𝖯𝖴     : *${cpuShort} ×${cpuCount}*\n` +
      `│ 𝖱𝖠𝖬     : ${ramEmoji} *${memUsed}/${memTotal} MB*\n` +
      `│ ${ramBar} ${memPercent}%\n` +
      `│ 𝖴𝗉𝗍𝗂𝗆𝖾  : *${uptime}*\n` +
      `│ 𝖯𝗂𝗇𝗀    : ${pingEmoji} *${ping}ms*\n` +
      `└─────────────────\n\n` +

      `📊 *sᴛᴀᴛɪsᴛɪᴋ*\n` +
      `┌─────────────────\n` +
      `│ 👤 𝖴𝗌𝖾𝗋   : *${totalUsers.toLocaleString("id-ID")} orang*\n` +
      `│ 👥 𝖦𝗋𝗎𝗉   : *${totalGroups.toLocaleString("id-ID")} grup*\n` +
      `│ ⚡ 𝖢𝗈𝗆𝗆𝖺𝗇𝖽: *${totalCmds.toLocaleString("id-ID")}×*\n` +
      `│ 💬 𝖯𝖾𝗌𝖺𝗇  : *${totalMsg.toLocaleString("id-ID")}×*\n` +
      `└─────────────────\n\n` +

      `🕐 *ᴡᴀᴋᴛᴜ ᴡɪʙ*\n` +
      `┌─────────────────\n` +
      `│ ⏰ *${timeStr}*\n` +
      `│ 📅 *${dateStr}*\n` +
      `└─────────────────\n\n` +

      `> ᴘᴏᴡᴇʀᴇᴅ ʙʏ *${botName}*❀`;

    // ── Interactive Message ───────────────────────────────────
    const imgPath   = path.join(process.cwd(), "assets", "images", "nexa02.jpg");
    const imgBuffer = fs.existsSync(imgPath) ? fs.readFileSync(imgPath) : null;

    const fakeQuoted = {
      key: {
        remoteJid: "0@s.whatsapp.net",
        fromMe: false,
        id: "NexaBotInfo",
        participant: "0@s.whatsapp.net",
      },
      message: {
        requestPaymentMessage: {
          currencyCodeIso4217: "USD",
          amount1000: 0,
          requestFrom: "0@s.whatsapp.net",
          noteMessage: { extendedTextMessage: { text: botName } },
          expiryTimestamp: 0,
        },
      },
    };

    try {
      if (!imgBuffer) throw new Error("Thumbnail tidak ditemukan");
      const media = await prepareWAMessageMedia(
        { image: imgBuffer },
        { upload: sock.waUploadToServer }
      );

      const buttons = [
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Menu",
            id: `${prefix}menu`,
          }),
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "📢 Saluran",
            url: saluranLink,
            merchant_url: saluranLink,
          }),
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "👥 Grup",
            url: "https://chat.whatsapp.com/Figeaa78x9XAa6K6Wkd3d5",
            merchant_url: "https://chat.whatsapp.com/Figeaa78x9XAa6K6Wkd3d5",
          }),
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "📞 Owner",
            url: `https://wa.me/${ownerNum}`,
            merchant_url: `https://wa.me/${ownerNum}`,
          }),
        },
      ];

      const interactiveMessage = proto.Message.InteractiveMessage.fromObject({
        header: proto.Message.InteractiveMessage.Header.fromObject({
          hasMediaAttachment: true,
          ...media,
        }),
        body: proto.Message.InteractiveMessage.Body.fromObject({
          text: caption,
        }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({
          text: `© ${botName} v${botVer} • ${timeStr} WIB`,
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          messageVersion: 1,
          buttons,
        }),
        contextInfo: proto.ContextInfo.fromObject({
          mentionedJid: [m.sender],
        }),
      });

      const generated = generateWAMessageFromContent(
        m.chat,
        proto.Message.fromObject({ interactiveMessage }),
        { userJid: sock.user?.id, quoted: fakeQuoted }
      );

      await sock.relayMessage(m.chat, generated.message, {
        messageId: generated.key.id,
      });

      await m.react("✅");
    } catch {
      // Fallback teks biasa
      await m.reply(caption);
      await m.react("✅");
    }
  },
};
