const { downloadMediaMessage, getContentType } = require("nexa");
const config = require("../../config");
const { getDatabase } = require("./database");
const { applyStyle } = require("./fontStyle");

function parseCommand(body, prefix) {
  if (!body || !prefix) return { isCommand: false };

  const trimmed = String(body).trim();
  if (!trimmed.startsWith(prefix)) return { isCommand: false };

  const withoutPrefix = trimmed.slice(prefix.length).trim();
  const parts = withoutPrefix.split(/\s+/);
  const command = parts[0]?.toLowerCase() || "";
  const args = parts.slice(1);
  const text = args.join(" ");

  return { isCommand: true, prefix, command, args, text };
}

function matchParticipant(participants = [], jidToMatch = "") {
  if (!jidToMatch || !Array.isArray(participants)) return null;

  const raw = String(jidToMatch).split("@")[0].split(":")[0];
  return participants.find(p => {
    const pid = String(p?.id || "").split("@")[0].split(":")[0];
    const plid = String(p?.lid || "").split("@")[0].split(":")[0];
    return pid === raw || plid === raw;
  }) || null;
}

function isAdminRole(participant) {
  return participant?.admin === "admin" || participant?.admin === "superadmin";
}

async function getFreshGroupMetadata(sock, chat) {
  try {
    return await sock.groupMetadata(chat);
  } catch {
    return sock.store?.groupMetadata?.[chat] || null;
  }
}

async function resolveRoles(sock, chat, sender, isGroup) {
  let isAdmin = false;
  let isBotAdmin = false;
  let groupMetadata = null;

  if (!isGroup) return { isAdmin, isBotAdmin, groupMetadata };

  groupMetadata = await getFreshGroupMetadata(sock, chat);

  if (groupMetadata?.participants?.length) {
    const participant = matchParticipant(groupMetadata.participants, sender);
    isAdmin = isAdminRole(participant);

    const botJid = sock.user?.id || "";
    const botParticipant = matchParticipant(groupMetadata.participants, botJid);
    isBotAdmin = isAdminRole(botParticipant);
  }

  return { isAdmin, isBotAdmin, groupMetadata };
}

async function serialize(sock, msg) {
  try {
    if (!msg || !msg.message) return null;

    const db = getDatabase();
    const prefix = config.command?.prefix || ".";

    let message = msg.message;
    if (message.ephemeralMessage?.message) message = message.ephemeralMessage.message;
    if (message.viewOnceMessage?.message) message = message.viewOnceMessage.message;
    if (message.documentWithCaptionMessage?.message) message = message.documentWithCaptionMessage.message;

    const mtype = getContentType(message);
    if (!mtype) return null;

    const content = message[mtype];

    let body = "";
    if (mtype === "conversation") body = content || "";
    else if (mtype === "extendedTextMessage") body = content?.text || "";
    else if (mtype === "imageMessage") body = content?.caption || "";
    else if (mtype === "videoMessage") body = content?.caption || "";
    else if (mtype === "documentMessage") body = content?.caption || "";
    else if (mtype === "audioMessage") body = "";
    else if (mtype === "buttonsResponseMessage") body = content?.selectedButtonId || content?.selectedDisplayText || "";
    else if (mtype === "templateButtonReplyMessage") body = content?.selectedId || content?.selectedDisplayText || "";
    else if (mtype === "listResponseMessage") body = content?.singleSelectReply?.selectedRowId || "";
    else if (mtype === "interactiveResponseMessage") {
      try {
        const nativeFlow = content?.nativeFlowResponseMessage;
        if (nativeFlow?.paramsJson) {
          const params = JSON.parse(nativeFlow.paramsJson);
          body = params?.id || params?.body || "";
        } else {
          body = content?.body || "";
        }
      } catch {
        body = "";
      }
    }

    const parsed = parseCommand(body, prefix);

    const isGroup = msg.key.remoteJid?.endsWith("@g.us");
    const sender = isGroup
      ? (msg.key.participant || msg.participant || msg.key.participantAlt || "")
      : (msg.key.remoteJid || "");

    const chat = msg.key.remoteJid || "";
    const fromMe = !!msg.key.fromMe;

    const senderNumber = sender.split("@")[0].split(":")[0];
    const isOwner = typeof config.isOwner === "function"
      ? (config.isOwner(sender) || config.isOwner(senderNumber))
      : false;
    const isPartner = typeof config.isPartner === "function"
      ? config.isPartner(sender)
      : false;

    const userData = db.getUser(sender) || {};
    const isPremium = !!userData.isPremium;
    const isBanned = !!userData.isBanned;

    const { isAdmin, isBotAdmin, groupMetadata } = await resolveRoles(sock, chat, sender, isGroup);

    let quoted = null;
    const contextInfo = content?.contextInfo;
    if (contextInfo?.quotedMessage) {
      let qMsg = contextInfo.quotedMessage;

      if (qMsg.ephemeralMessage?.message) qMsg = qMsg.ephemeralMessage.message;
      if (qMsg.viewOnceMessage?.message) qMsg = qMsg.viewOnceMessage.message;
      if (qMsg.documentWithCaptionMessage?.message) qMsg = qMsg.documentWithCaptionMessage.message;

      const qType = getContentType(qMsg);
      const qContent = qMsg?.[qType];
      const qMime = qContent?.mimetype || "";

      quoted = {
        id: contextInfo.stanzaId,
        sender: contextInfo.participant || chat,
        type: qType,
        message: qMsg,
        body: typeof qContent === "string" ? qContent : qContent?.text || qContent?.caption || "",
        isImage: qType === "imageMessage",
        isVideo: qType === "videoMessage",
        isAudio: qType === "audioMessage" || qType === "pttMessage" || (qType === "documentMessage" && qMime.includes("audio")),
        isSticker: qType === "stickerMessage",
        isDocument: qType === "documentMessage",
        mimetype: qMime,
        download: async () => downloadMediaMessage(
          { message: qMsg, key: { remoteJid: chat, id: contextInfo.stanzaId } },
          "buffer",
          {}
        ),
      };
    }

    const mentionedJid = contextInfo?.mentionedJid || [];
    const mime = content?.mimetype || "";

    const isButtonResponse = [
      "buttonsResponseMessage",
      "templateButtonReplyMessage",
      "listResponseMessage",
      "interactiveResponseMessage",
    ].includes(mtype);

    return {
      id: msg.key.id,
      chat,
      sender,
      pushName: msg.pushName || sender.split("@")[0],
      fromMe,
      isGroup,
      isOwner,
      isPartner,
      isPremium,
      isBanned,
      isAdmin,
      isBotAdmin,
      isBot: false,
      isButtonResponse,
      key: msg.key,
      message,
      type: mtype,
      body,
      text: parsed.text || "",
      args: parsed.args || [],
      command: parsed.command || "",
      prefix: parsed.prefix || "",
      isCommand: parsed.isCommand || false,
      isImage: mtype === "imageMessage",
      isVideo: mtype === "videoMessage",
      isAudio: mtype === "audioMessage" || mtype === "pttMessage" || (mtype === "documentMessage" && mime.includes("audio")),
      isSticker: mtype === "stickerMessage",
      isDocument: mtype === "documentMessage",
      mimetype: mime,
      quoted,
      mentionedJid,
      groupMetadata,
      messageTimestamp: msg.messageTimestamp,
      reply: async (text, options = {}) => {
        const fontStyle = db.getUser(sender)?.fontStyle || 0;

        if (typeof text === "string") {
          const styled = fontStyle ? applyStyle(text, fontStyle) : text;
          return sock.sendMessage(chat, { text: styled, ...options }, { quoted: msg });
        }

        // Untuk object (media + caption, dsb) hanya field `text`/`caption` yang di-style,
        // supaya tidak merusak field lain seperti buttons/contextInfo/mimetype.
        if (fontStyle && text && typeof text === "object") {
          const styledPayload = { ...text };
          if (typeof styledPayload.text === "string") styledPayload.text = applyStyle(styledPayload.text, fontStyle);
          if (typeof styledPayload.caption === "string") styledPayload.caption = applyStyle(styledPayload.caption, fontStyle);
          return sock.sendMessage(chat, styledPayload, { quoted: msg, ...options });
        }

        return sock.sendMessage(chat, text, { quoted: msg, ...options });
      },
      react: async (emoji) => sock.sendMessage(chat, { react: { text: emoji, key: msg.key } }),
      download: async () => downloadMediaMessage(msg, "buffer", {}),
    };
  } catch (err) {
    console.error("[Serialize] Error:", err.message);
    return null;
  }
}

module.exports = { serialize, parseCommand };