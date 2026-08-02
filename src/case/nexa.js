const config = require("../../config");
const { getDatabase } = require("../lib/database");
const { getPluginCount, reloadAllPlugins } = require("../lib/plugins");

async function resolveGroupAdmin(sock, groupJid, userJid) {
  try {
    const meta = await sock.groupMetadata(groupJid);
    const participant = meta?.participants?.find(p => p.id === userJid || p.lid === userJid);
    return !!participant?.admin;
  } catch {
    return false;
  }
}

async function requireOwner(m) {
  if (!m.isOwner) {
    await m.reply(config.messages?.ownerOnly || "⛔ Owner only!");
    return false;
  }
  return true;
}

async function requireAdmin(m, sock) {
  if (!m.isGroup) {
    await m.reply(config.messages?.groupOnly || "👥 Group only!");
    return false;
  }

  const isAdmin = !!m.isAdmin || await resolveGroupAdmin(sock, m.chat, m.sender);
  if (!isAdmin && !m.isOwner) {
    await m.reply(config.messages?.adminOnly || "👮 Admin only!");
    return false;
  }
  return true;
}

async function handleCommand(m, sock) {
  const db = getDatabase();
  const cmd = m.command?.toLowerCase();

  switch (cmd) {
    case "ping": {
      const start = Date.now();
      await m.reply("🏓 *Pinging...*");
      const end = Date.now();
      await m.reply(
        `🏓 *Pong!*\n\n` +
        `> ⚡ Response: *${end - start}ms*\n` +
        `> 🤖 Bot: *${config.bot?.name}*\n` +
        `> 📦 Version: *v${config.bot?.version}*`
      );
      return { handled: true };
    }

    case "uptime":
    case "runtime": {
      const connectedAt = global._botConnectedAt || Date.now();
      const uptime = Date.now() - connectedAt;
      const seconds = Math.floor(uptime / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      const uptimeStr = days > 0 ? `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`
        : hours > 0 ? `${hours}h ${minutes % 60}m ${seconds % 60}s`
        : minutes > 0 ? `${minutes}m ${seconds % 60}s`
        : `${seconds}s`;

      await m.reply(
        `⏱️ *Uptime Nexa Bot*\n\n` +
        `> 🕐 Runtime: *${uptimeStr}*\n` +
        `> 📦 Version: *v${config.bot?.version}*\n` +
        `> 🤖 Status: *Online ✅*`
      );
      return { handled: true };
    }

    case "speed":
    case "speedtest": {
      const t = Date.now();
      await m.reply("🔄 *Testing speed...*");
      const elapsed = Date.now() - t;
      await m.reply(
        `⚡ *Speed Test*\n\n` +
        `> 📡 Response: *${elapsed}ms*\n` +
        `> 🟢 Status: ${elapsed < 500 ? "Sangat Cepat" : elapsed < 1000 ? "Normal" : "Lambat"}`
      );
      return { handled: true };
    }

    case "mode": {
      if (!(await requireOwner(m))) return { handled: true };
      const mode = m.args[0]?.toLowerCase();
      if (!mode || !["public", "self"].includes(mode)) {
        const current = db.setting("botMode") || "public";
        await m.reply(`⚙️ *Bot Mode*\n\n> Mode saat ini: *${current}*\n\nUsage: \`${m.prefix}mode [public/self]\``);
        return { handled: true };
      }
      db.setting("botMode", mode);
      await m.reply(`✅ *Mode diubah ke ${mode}!*`);
      return { handled: true };
    }

    case "reload": {
      if (!(await requireOwner(m))) return { handled: true };
      await m.reply("🔄 *Memuat ulang plugins...*");
      const count = await reloadAllPlugins();
      await m.reply(`✅ *Plugins berhasil dimuat ulang!*\n\n> 📦 Total: *${count} plugin*`);
      return { handled: true };
    }

    case "broadcast":
    case "bc": {
      if (!(await requireOwner(m))) return { handled: true };
      const text = m.text;
      if (!text) {
        await m.reply(`Usage: \`${m.prefix}bc <pesan>\``);
        return { handled: true };
      }
      const groups = db.getAllGroups();
      const groupIds = Object.keys(groups);
      await m.reply(`📢 *Broadcast ke ${groupIds.length} grup...*`);
      let success = 0;
      for (const gid of groupIds) {
        try {
          await sock.sendMessage(gid, { text: `📢 *Broadcast dari Owner*\n\n${text}` });
          success++;
          await new Promise(r => setTimeout(r, 1000));
        } catch {}
      }
      await m.reply(`✅ *Broadcast selesai!*\n\n> Terkirim: *${success}/${groupIds.length}*`);
      return { handled: true };
    }

    case "ban": {
      if (!(await requireOwner(m))) return { handled: true };
      const target = m.mentionedJid?.[0] || m.quoted?.sender;
      if (!target) {
        await m.reply(`Usage: \`${m.prefix}ban @user\``);
        return { handled: true };
      }
      db.setUser(target, { isBanned: true });
      await m.reply(`🔨 *User di-ban!*\n\n> 👤 User: @${target.split("@")[0]}\n> 🚫 Status: *Banned*`, { mentions: [target] });
      return { handled: true };
    }

    case "unban": {
      if (!(await requireOwner(m))) return { handled: true };
      const target = m.mentionedJid?.[0] || m.quoted?.sender;
      if (!target) {
        await m.reply(`Usage: \`${m.prefix}unban @user\``);
        return { handled: true };
      }
      db.setUser(target, { isBanned: false });
      await m.reply(`✅ *User di-unban!*\n\n> 👤 User: @${target.split("@")[0]}\n> ✅ Status: *Aktif*`, { mentions: [target] });
      return { handled: true };
    }

    case "addprem":
    case "addpremium": {
      if (!(await requireOwner(m))) return { handled: true };
      const target = m.mentionedJid?.[0] || m.quoted?.sender;
      if (!target) {
        await m.reply(`Usage: \`${m.prefix}addprem @user\``);
        return { handled: true };
      }
      db.setUser(target, { isPremium: true });
      await m.reply(`💎 *Premium ditambahkan!*\n\n> 👤 User: @${target.split("@")[0]}`, { mentions: [target] });
      return { handled: true };
    }

    case "delprem":
    case "delpremium": {
      if (!(await requireOwner(m))) return { handled: true };
      const target = m.mentionedJid?.[0] || m.quoted?.sender;
      if (!target) {
        await m.reply(`Usage: \`${m.prefix}delprem @user\``);
        return { handled: true };
      }
      db.setUser(target, { isPremium: false });
      await m.reply(`🗑️ *Premium dihapus!*\n\n> 👤 User: @${target.split("@")[0]}`, { mentions: [target] });
      return { handled: true };
    }

    case "stats":
    case "statistik": {
      if (!(await requireOwner(m))) return { handled: true };
      const stats = db.getAllStats();
      const users = Object.keys(db.getAllUsers()).length;
      const groups = Object.keys(db.getAllGroups()).length;
      await m.reply(
        `📊 *Statistik ${config.bot?.name}*\n\n` +
        `╭┈┈⬡「 📈 *Data* 」\n` +
        `┃ 👥 Total User: *${users}*\n` +
        `┃ 🏘️ Total Grup: *${groups}*\n` +
        `┃ ⚡ Command Dijalankan: *${stats.commandsExecuted || 0}*\n` +
        `┃ 📦 Total Plugin: *${getPluginCount()}*\n` +
        `╰┈┈⬡`
      );
      return { handled: true };
    }

    default:
      return { handled: false };
  }
}

module.exports = { handleCommand };