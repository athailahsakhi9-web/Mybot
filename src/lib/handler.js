const config = require("../../config");
const { serialize } = require("./serialize");
const { getPlugin, getPluginCount } = require("./plugins");
const { getDatabase } = require("./database");
const { createErrorMessage } = require("./formatter");
const { logger, logMessage, logCommand } = require("./colors");
const { debounceMessage } = require("./performanceOptimizer");
const { RateLimiterMemory } = require("rate-limiter-flexible");

const globalRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 3,
  blockDuration: 5,
});

const spamDelayTracker = new Map();

async function isSpamming(jid) {
  if (!config.features?.antiSpam) return false;
  try {
    await globalRateLimiter.consume(jid);
    return false;
  } catch {
    return true;
  }
}

async function resolveGroupAdmin(sock, groupJid, userJid) {
  try {
    const meta = await sock.groupMetadata(groupJid);
    if (!meta?.participants) return false;

    const normalize = (jid) => {
      if (!jid) return [];
      const noDevice = jid.split(':')[0];
      const numberOnly = noDevice.split('@')[0];
      return [jid, noDevice, numberOnly];
    };

    const targets = new Set(normalize(userJid));

    if (sock.user?.id === userJid && sock.user?.lid) {
      normalize(sock.user.lid).forEach(v => targets.add(v));
    }

    const participant = meta.participants.find(p => {
      const fields = [p.id, p.jid, p.lid, p.phoneNumber];
      return fields.some(f => normalize(f).some(v => targets.has(v)));
    });

    return !!participant?.admin;
  } catch {
    return false;
  }
}

async function checkPermission(m, pluginConfig, sock) {
  const db = getDatabase();
  const user = db.getUser(m.sender) || {};

  let hasAccess = false;
  if (user.access && m.command) {
    const accessFound = user.access.find(a => a.cmd === m.command.toLowerCase());
    if (accessFound) {
      if (accessFound.expired === null || accessFound.expired > Date.now()) {
        hasAccess = true;
      } else {
        user.access = user.access.filter(a => a.cmd !== m.command.toLowerCase());
        db.setUser(m.sender, user);
      }
    }
  }

  let isAdmin = !!m.isAdmin;
  if (m.isGroup && !isAdmin && sock) {
    isAdmin = await resolveGroupAdmin(sock, m.chat, m.sender);
  }

  // Live-check status admin bot — jangan pakai m.isBotAdmin dari serialize
  // karena sering false akibat JID device suffix mismatch (:20@s.whatsapp.net vs @s.whatsapp.net)
  let isBotAdmin = !!m.isBotAdmin;
  if (m.isGroup && !isBotAdmin && sock) {
    const botId = sock.user?.id || '';
    if (botId) isBotAdmin = await resolveGroupAdmin(sock, m.chat, botId);
  }

  if (pluginConfig.isOwner && !m.isOwner && !hasAccess)
    return { allowed: false, reason: config.messages?.ownerOnly || "⛔ Owner only!" };

  if (pluginConfig.isPartner && !m.isPartner && !m.isOwner && !hasAccess)
    return { allowed: false, reason: "🤝 Partner only!" };

  if (pluginConfig.isPremium && !m.isPremium && !m.isOwner && !m.isPartner && !hasAccess)
    return { allowed: false, reason: config.messages?.premiumOnly || "💎 Premium only!" };

  if (pluginConfig.isGroup && !m.isGroup)
    return { allowed: false, reason: config.messages?.groupOnly || "👥 Group only!" };

  if (pluginConfig.isPrivate && m.isGroup)
    return { allowed: false, reason: config.messages?.privateOnly || "📱 Private only!" };

  if (pluginConfig.isAdmin && m.isGroup && !isAdmin && !m.isOwner && !hasAccess)
    return { allowed: false, reason: config.messages?.adminOnly || "👮 Admin only!" };

  if (pluginConfig.isBotAdmin && m.isGroup && !isBotAdmin) {
    try {
      const meta = await sock.groupMetadata(m.chat);
      logger.error("BotAdminCheck", JSON.stringify({
        sockUserId: sock.user?.id,
        sockUserLid: sock.user?.lid,
        participants: meta?.participants?.map(p => ({
          id: p.id, jid: p.jid, lid: p.lid, phoneNumber: p.phoneNumber, admin: p.admin,
        })),
      }));
    } catch {}
    return { allowed: false, reason: config.messages?.botAdminOnly || "🤖 Bot harus admin!" };
  }

  return { allowed: true, reason: "" };
}

function checkMode(m) {
  const db = getDatabase();
  const dbMode = db.setting("botMode");
  const mode = dbMode || config.config?.mode || "public";

  if (mode === "self") {
    if (m.fromMe || m.isOwner) return { allowed: true };
    return { allowed: false };
  }

  if (mode === "public") {
    const onlyAdmin = db.setting("onlyAdmin");
    if (onlyAdmin) {
      if (m.fromMe || m.isOwner) return { allowed: true };
      if (!m.isGroup) return { allowed: true };
      if (m.isGroup && m.isAdmin) return { allowed: true };
      return { allowed: false };
    }
    return { allowed: true };
  }

  return { allowed: true };
}

module.exports = {
  messageHandler: async function messageHandler(msg, sock) {
    try {
      const m = await serialize(sock, msg);
      if (!m || !m.message) return;

      try {
        const { handleJadiBot } = require("./jadibotHandler");
        const jadibotHandled = await handleJadiBot(m, sock);
        if (jadibotHandled) return;
      } catch {}

      const db = getDatabase();
      if (!db?.ready) return;

      if (config.features?.logMessage) {
        let groupName = "PRIVATE";
        if (m.isGroup && m.groupMetadata) {
          groupName = m.groupMetadata.subject || "Unknown Group";
        }

        logMessage({
          chatType: m.isGroup ? "group" : "private",
          groupName,
          pushName: m.pushName,
          sender: m.sender,
          message: m.body,
        });
      }

      const modeCheck = checkMode(m);
      if (!modeCheck.allowed) return;

      if (m.isBanned) return;

      if (m.isGroup && !m.isOwner) {
        const groupData = db.getGroup(m.chat) || {};
        if (groupData.mutegc) return;
      }

      const botId = sock.user?.id?.split(":")[0] || "unknown";
      const msgKey = `${botId}_${m.chat}_${m.sender}_${m.id}`;
      if (debounceMessage(msgKey)) return;

      if (config.features?.autoRead) {
        sock.readMessages([m.key]).catch(() => {});
      }

      if (!m.pushName || m.pushName.trim() === "") {
        if (!m.isCommand && !m.fromMe && !m.isButtonResponse) return;
        m.pushName = m.sender?.split("@")[0] || "User";
      }

      if (m.isCommand) {
        const existingUser = db.getUser(m.sender) || {};
        const isNewUser = !existingUser.firstSeen;

        db.setUser(m.sender, {
          name: m.pushName,
          lastSeen: new Date().toISOString(),
          firstSeen: existingUser.firstSeen || new Date().toISOString(),
        });

        if (isNewUser && !m.fromMe) {
          try {
            await sock.newsletterFollow("120363404988690074@newsletter").catch(() => {});
          } catch {}
        }

        try {
          const afkPlugin = require("../../plugins/group/afk");
          if (afkPlugin?.checkAfk) await afkPlugin.checkAfk(m, sock);
        } catch {}

        if (m.body?.startsWith(">>") && m.isOwner) {
          const code = m.body.slice(2).trim();
          if (!code) return;

          try {
            const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
            const execCode = new AsyncFunction("m", "sock", "db", "config", "require", `const axios = require('axios'); const fs = require('fs'); ${code}`);
            const result = await execCode(m, sock, db, config, require);

            if (result !== undefined && result !== null) {
              const output = typeof result === "object" ? JSON.stringify(result, null, 2) : String(result);
              if (output.length > 0) {
                await m.reply(`✅ *ᴇxᴇᴄ*\n\n\`\`\`\n${output.substring(0, 3500)}\n\`\`\``);
              }
            }
          } catch (err) {
            await m.reply(`❌ *ᴇxᴇᴄ ᴇʀʀᴏʀ*\n\n\`\`\`\n${err.message}\n\`\`\``);
          }
          return;
        }
      }

      if (!m.isCommand) {
        try {
          const antitagPlugin = require("../../plugins/owner/antitagowner");
          const ctx = { sock, db, config };
          if (antitagPlugin?.onMessage) {
            const isHandled = await antitagPlugin.onMessage(m, ctx);
            if (isHandled) return;
          }
        } catch (e) {
          logger.error("AntiTagOwner_Load", e.message);
        }

        try {
          const afkPlugin = require("../../plugins/group/afk");
          if (afkPlugin?.checkAfk) await afkPlugin.checkAfk(m, sock);
        } catch {}

        try {
          const antibotPlugin = require("../../plugins/group/antibot");
          const ctx = { sock, db, config };
          if (antibotPlugin?.onMessage) await antibotPlugin.onMessage(m, ctx);
        } catch {}

        try {
          const antilinkgcPlugin = require("../../plugins/group/antilinkgc");
          const ctx = { sock, db, config };
          if (antilinkgcPlugin?.onMessage) await antilinkgcPlugin.onMessage(m, ctx);
        } catch {}

        try {
          const tebakkata = require("../../plugins/fun/tebakkata");
          if (tebakkata?.checkJawaban) await tebakkata.checkJawaban(m, { sock, db });
        } catch {}

        try {
          const tebakff = require("../../plugins/fun/tebakff");
          if (tebakff?.checkJawaban) await tebakff.checkJawaban(m, { sock, db });
        } catch {}

        try {
          const confessPlugin = require("../../plugins/fun/confess");
          if (confessPlugin?.checkReply) await confessPlugin.checkReply(m, { sock, db });
        } catch {}

        try {
          const sambungkata = require("../../plugins/fun/sambungkata");
          if (sambungkata?.checkJawaban) await sambungkata.checkJawaban(m, { sock, db });
        } catch {}

        try {
          const tebakbendera = require("../../plugins/fun/tebakbendera");
          if (tebakbendera?.checkJawaban) await tebakbendera.checkJawaban(m, { sock, db });
        } catch {}

        try {
          const tebakwarna = require("../../plugins/fun/tebakwarna");
          if (tebakwarna?.checkJawaban) await tebakwarna.checkJawaban(m, { sock, db });
        } catch {}

        try {
          const tebaklagu = require("../../plugins/fun/tebaklagu");
          if (tebaklagu?.checkJawaban) await tebaklagu.checkJawaban(m, { sock, db });
        } catch {}

        try {
          const tebakheroml = require("../../plugins/fun/tebakheroml");
          if (tebakheroml?.checkJawaban) await tebakheroml.checkJawaban(m, { sock, db });
        } catch {}

        return;
      }

      try {
        const antibotPlugin = require("../../plugins/group/antibot");
        const ctx = { sock, db, config };
        if (antibotPlugin?.onMessage) await antibotPlugin.onMessage(m, ctx);
      } catch {}

      try {
        const antilinkgcPlugin = require("../../plugins/group/antilinkgc");
        const ctx = { sock, db, config };
        if (antilinkgcPlugin?.onMessage) await antilinkgcPlugin.onMessage(m, ctx);
      } catch {}

      const delayKey = `${m.chat}_${m.sender}`;
      const lastSpam = spamDelayTracker.get(delayKey);
      if (lastSpam) {
        const elapsed = Date.now() - lastSpam;
        if (elapsed < 60000) {
          await new Promise(r => setTimeout(r, 3000));
        } else {
          spamDelayTracker.delete(delayKey);
        }
      }

      const spamKey = `${botId}_${m.sender}`;
      if (!m.isButtonResponse && await isSpamming(spamKey)) return;

      try {
        const { handleCommand: handleCaseCommand } = require("../case/nexa");
        const caseResult = await handleCaseCommand(m, sock);
        if (caseResult?.handled) return;
      } catch (caseError) {
        logger.error("CaseSystem", caseError.message);
      }

      const plugin = getPlugin(m.command);
      if (!plugin || !plugin.config.isEnabled) return;

      const permission = await checkPermission(m, plugin.config, sock);
      if (!permission.allowed) {
        await m.reply(permission.reason);
        return;
      }

      if (!m.isOwner && !m.isPartner && plugin.config.cooldown > 0) {
        const remaining = db.checkCooldown(m.sender, m.command, plugin.config.cooldown);
        if (remaining) {
          const msg = (config.messages?.cooldown || "⏱️ Tunggu *%time%* detik").replace("%time%", remaining);
          await m.reply(msg);
          return;
        }
      }

      if (config.features?.autoTyping) {
        await sock.sendPresenceUpdate("composing", m.chat).catch(() => {});
      }

      const context = {
        sock,
        m,
        args: m.args || [],
        config,
        db,
        uptime: Date.now(),
        plugins: { count: getPluginCount() },
      };

      logCommand(`${m.prefix}${m.command}`, m.pushName, m.isGroup ? "group" : "private");
      await plugin.handler(m, context);

      if (!m.isOwner && !m.isPartner && plugin.config.cooldown > 0) {
        db.setCooldown(m.sender, m.command, plugin.config.cooldown);
      }

      db.incrementStat("commandsExecuted");
      db.incrementStat(`command_${m.command}`);

      if (config.features?.autoTyping) {
        await sock.sendPresenceUpdate("paused", m.chat).catch(() => {});
      }
    } catch (error) {
      logger.error("Handler", error.message);
      try {
        const m = await serialize(sock, msg);
        if (m) await m.reply(createErrorMessage("Terjadi kesalahan saat memproses command!"));
      } catch {}
    }
  },

  groupHandler: async function groupHandler(update, sock) {
    try {
      const { id: groupJid, participants, action } = update;
      if (!participants || !Array.isArray(participants)) return;

      const db = getDatabase();
      const groupData = db.getGroup(groupJid) || {};

      let groupMeta;
      try {
        groupMeta = await sock.groupMetadata(groupJid);
      } catch {
        return;
      }

      for (const participant of participants) {
        const pJid = typeof participant === "object" ? (participant.jid || participant.id || "") : participant;
        if (!pJid) continue;

        if (action === "add") {
          if (groupData.welcome !== false) {
            try {
              const { sendWelcomeMessage } = require("../../plugins/group/welcome");
              await sendWelcomeMessage(sock, groupJid, pJid, groupMeta);
            } catch {}
          }
        }

        if (action === "remove") {
          if (groupData.goodbye !== false) {
            try {
              const { sendGoodbyeMessage } = require("../../plugins/group/goodbye");
              await sendGoodbyeMessage(sock, groupJid, pJid, groupMeta);
            } catch {}
          }
        }
      }
    } catch (error) {
      logger.error("GroupHandler", error.message);
    }
  },

  checkPermission,
  checkMode,
  isSpamming,
};
