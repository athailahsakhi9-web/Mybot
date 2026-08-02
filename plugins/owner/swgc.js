const config = require("../../config");
const { downloadContentFromMessage } = require("nexa");

const pluginConfig = {
  name: "swgc",
  alias: ["statusgc", "gstatus"],
  category: "owner",
  description: "Mengirim status (teks/gambar/video/audio) langsung ke sebuah grup",
  usage: ".swgc <teks> atau reply media",
  example: ".swgc Halo semua!",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const pendingSwgc = new Map();
const PENDING_TTL = 5 * 60 * 1000;

const PROMO_CHANNEL = {
  jid: "120363404988690074@newsletter",
  name: "Nexa Info",
};

function cleanupExpiredPending() {
  const now = Date.now();
  for (const [sender, data] of pendingSwgc.entries()) {
    if (now - data.timestamp > PENDING_TTL) pendingSwgc.delete(sender);
  }
}

async function sendGroupStatus(sock, jid, content) {
  return sock.sendMessage(jid, { groupStatusMessage: content });
}

async function downloadFromMsg(msgLike) {
  if (typeof msgLike?.download === "function") {
    return await msgLike.download();
  }

  const node = msgLike?.msg || msgLike;
  const mimetype = node?.mimetype || msgLike?.mimetype || "";
  let type = "image";
  if (/video/i.test(mimetype)) type = "video";
  else if (/audio/i.test(mimetype)) type = "audio";

  const stream = await downloadContentFromMessage(node, type);
  let buffer = Buffer.alloc(0);
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
  return buffer;
}

function isMediaSource(source) {
  return !!(
    source?.isImage ||
    source?.isVideo ||
    source?.isAudio ||
    source?.mimetype?.startsWith("audio")
  );
}

async function extractRawContentFromMedia(source, caption) {
  const buffer = await downloadFromMsg(source);
  if (!buffer) throw new Error("Gagal mengambil media.");

  if (source.isImage) return { image: buffer, caption };
  if (source.isVideo) return { video: buffer, caption };
  return {
    audio: buffer,
    mimetype: source.mimetype || "audio/mpeg",
    ptt: source.msg?.ptt || false,
  };
}

function buildPromoContextInfo() {
  return {
    forwardedNewsletterMessageInfo: {
      newsletterJid: PROMO_CHANNEL.jid,
      newsletterName: PROMO_CHANNEL.name,
      serverMessageId: 1,
    },
  };
}

function buildStatusContent(raw) {
  const contextInfo = buildPromoContextInfo();

  if (raw.image) return { image: raw.image, caption: raw.caption || "", contextInfo };
  if (raw.video) return { video: raw.video, caption: raw.caption || "", contextInfo };
  if (raw.audio) {
    return {
      audio: raw.audio,
      mimetype: raw.mimetype || "audio/mpeg",
      ptt: raw.ptt || false,
      contextInfo,
    };
  }
  if (raw.text) {
    return {
      text: raw.text,
      backgroundColor: raw.backgroundColor || "#128C7E",
      font: raw.font ?? 0,
      contextInfo,
    };
  }
  return {};
}

function formatMediaLabel(raw) {
  if (raw.text) return "Teks";
  if (raw.image) return "Gambar";
  if (raw.video) return "Video";
  if (raw.audio) return "Audio";
  return "Media";
}

function buildGroupRows(groupList, prefix) {
  return groupList.map(([id, meta]) => ({
    title: meta.subject || "Unknown Group",
    description: id,
    id: `${prefix}swgc --confirm ${id}`,
  }));
}

async function handleConfirmStep(m, sock, targetGroupId) {
  const pendingData = pendingSwgc.get(m.sender);

  if (!pendingData) {
    return m.reply("⚠️ *Tidak ada data pending.* Kirim ulang media/teks + `.swgc`");
  }
  if (Date.now() - pendingData.timestamp > PENDING_TTL) {
    pendingSwgc.delete(m.sender);
    return m.reply("⚠️ *Data pending kedaluwarsa.* Silakan kirim ulang `.swgc`");
  }

  let groupName = "Grup";
  try {
    const meta = await sock.groupMetadata(targetGroupId);
    groupName = meta.subject;
  } catch {}

  await m.react("🕕");

  try {
    const content = buildStatusContent(pendingData.rawContent);
    await sendGroupStatus(sock, targetGroupId, content);

    await m.react("✅");
    await m.reply(`✅ Berhasil up story ke grup *${groupName}*`);
    pendingSwgc.delete(m.sender);
  } catch (error) {
    console.error("[SWGC] gagal kirim:", error.message);
    await m.react("❌");
    await m.reply(`❌ *ERROR*\n\n> Gagal posting story.\n> _${error.message}_`);
  }
}

async function handleCollectStep(m, sock, prefix, text) {
  const quotedHasMedia = m.quoted && isMediaSource(m.quoted);
  const directHasMedia = !quotedHasMedia && isMediaSource(m);

  let rawContent;
  try {
    if (quotedHasMedia) {
      rawContent = await extractRawContentFromMedia(m.quoted, text || "");
    } else if (directHasMedia) {
      rawContent = await extractRawContentFromMedia(m, text || "");
    } else if (text && text.trim()) {
      rawContent = { text: text.trim(), font: 0, backgroundColor: "#128C7E" };
    } else {
      return m.reply(
        `⚠️ *CARA PAKAI*\n\n` +
        `> \`${prefix}swgc teks\` — Story teks\n` +
        `> Reply gambar/video/audio + \`${prefix}swgc\`\n` +
        `> Kirim gambar/video + caption \`${prefix}swgc\``
      );
    }
  } catch (error) {
    const label = quotedHasMedia ? " yang di-reply" : "";
    console.error("[SWGC] gagal proses media:", error.message);
    return m.reply(`❌ Gagal mengunduh media${label}.`);
  }

  pendingSwgc.set(m.sender, { rawContent, timestamp: Date.now() });

  try {
    const groups = await sock.groupFetchAllParticipating();
    const groupList = Object.entries(groups);

    if (groupList.length === 0) {
      pendingSwgc.delete(m.sender);
      return m.reply("⚠️ *Bot tidak berada di grup manapun.*");
    }

    await sock.sendMessage(m.chat, {
      text:
        `📋 *PILIH GRUP UNTUK POST STORY*\n\n` +
        `> Media: *${formatMediaLabel(rawContent)}*\n` +
        `> Total Grup: *${groupList.length}*\n\n` +
        `_Pilih grup dari daftar di bawah:_`,
      footer: config.bot?.name || "NexaBot",
      interactiveButtons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "🏠 Pilih Grup",
            sections: [{ title: "Daftar Grup", rows: buildGroupRows(groupList, prefix) }],
          }),
        },
        {
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({ display_text: "❌ Batal", id: `${prefix}cancelswgc` }),
        },
      ],
    });
  } catch (error) {
    console.error("[SWGC] gagal ambil daftar grup:", error.message);
    pendingSwgc.delete(m.sender);
    return m.reply(`❌ *ERROR*\n\n> Gagal mengambil daftar grup.\n> _${error.message}_`);
  }
}

async function handler(m, { sock }) {
  cleanupExpiredPending();

  const args = m.args || [];
  const text = m.text || "";
  const prefix = m.prefix || ".";

  if (args[0] === "--confirm" && args[1]) {
    return handleConfirmStep(m, sock, args[1]);
  }

  return handleCollectStep(m, sock, prefix, text);
}

module.exports = { config: pluginConfig, handler, sendGroupStatus, pendingSwgc };