const config = require("../../config");

function normalizeNum(jid = "") {
  return String(jid).split("@")[0].split(":")[0].trim();
}

function isLidFormat(jid = "") {
  return String(jid).includes("@lid");
}

function isRealJidFormat(jid = "") {
  return String(jid).includes("@s.whatsapp.net");
}

function resolveMentionsToJids(mentionedJids = [], participants = []) {
  return mentionedJids.map(mention => {
    const raw = normalizeNum(mention);

    const found = participants.find(p => {
      const fields = [p?.id, p?.jid, p?.lid, p?.phoneNumber, p?.participant].filter(Boolean);
      return fields.some(f => normalizeNum(f) === raw);
    });

    if (!found) return mention;
    
const fields = [found.jid, found.id, found.lid, found.phoneNumber].filter(Boolean);
    const realJid = fields.find(isRealJidFormat);

    return realJid || mention;
  });
}

function isOwnerMentioned(resolvedJids = []) {
  const ownerNums = (config.owner || []).map(o => normalizeNum(o));
  return resolvedJids.some(jid => ownerNums.includes(normalizeNum(jid)));
}

module.exports = {
  config: {
    name: "antitagowner",
    alias: ["antitag"],
    category: "owner",
    description: "Toggle anti tag owner di grup",
    isOwner: true,
    isGroup: true,
    isEnabled: true,
    cooldown: 3,
  },

  async handler(m, { sock, db }) {
    const arg = (m.text || "").trim().toLowerCase();
    const groupData = db.getGroup(m.chat) || {};

    if (!arg || !["on", "off"].includes(arg)) {
      return m.reply(
        `╭─〔 ❀ ᴀɴᴛɪ ᴛᴀɢ ᴏᴡɴᴇʀ 〕\n│\n` +
        `│ › \`${m.prefix}ᴀɴᴛɪᴛᴀɢᴏᴡɴᴇʀ ᴏɴ\`\n` +
        `│ › \`${m.prefix}ᴀɴᴛɪᴛᴀɢᴏᴡɴᴇʀ ᴏꜰꜰ\`\n│\n` +
        `│ Status: *${groupData.antiTagOwner ? "ON ✅" : "OFF ❌"}*\n` +
        `╰─────────────────⬣`
      );
    }

    groupData.antiTagOwner = arg === "on";
    db.setGroup(m.chat, groupData);

    return m.reply(
      arg === "on"
        ? "✅ ᴀɴᴛɪ ᴛᴀɢ ᴏᴡɴᴇʀ ᴅɪᴀᴋᴛɪꜰᴋᴀɴ!"
        : "❌ ᴀɴᴛɪ ᴛᴀɢ ᴏᴡɴᴇʀ ᴅɪɴᴏɴᴀᴋᴛɪꜰᴋᴀɴ!"
    );
  },

  async onMessage(m, { sock, db }) {
    try {
      if (!m.isGroup) return false;
      if (m.isOwner) return false;

      const groupData = db.getGroup(m.chat) || {};
      if (!groupData.antiTagOwner) return false;
      if (!m.mentionedJid || m.mentionedJid.length === 0) return false;

      let participants = [];
      try {
        const freshMeta = await sock.groupMetadata(m.chat);
        participants = freshMeta?.participants || [];
      } catch {
        participants = m.groupMetadata?.participants || [];
      }

      const resolvedJids = resolveMentionsToJids(m.mentionedJid, participants);

      console.log("[AntiTagOwner] mentioned:", m.mentionedJid, "→ resolved:", resolvedJids);

      if (!isOwnerMentioned(resolvedJids)) return false;

      const userName = m.pushName || normalizeNum(m.sender);

      await m.reply(
        `ɪᴅɪʜ ɴɢᴀᴘᴀɪɴ ᴛᴀɢ ᴛᴀɢ ᴏᴡɴᴇʀ ᴀᴋᴜ ʏɢ ʟᴜᴄᴜ ᴅᴀɴ ɪᴍᴜᴛᴛ😤\n\n` +
        `> *${userName}*, ᴏᴡɴᴇʀ ʟᴀɢɪ ꜱɪʙᴜᴋ,\n` +
        `> ᴄʜᴀᴛ ʟᴀɴɢꜱᴜɴɢ ᴀᴊᴀ ʏᴀ ᴋᴀʟᴀᴜ ᴀᴅᴀ ᴋᴇᴘᴇʀʟᴜᴀɴ ᴘᴇɴᴛɪɴɢ~🌸`,
        { mentions: [m.sender] }
      );

      return true;
    } catch (e) {
      console.error("[AntiTagOwner] error:", e.message);
      return false;
    }
  },
};