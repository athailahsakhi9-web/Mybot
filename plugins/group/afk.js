// ╔══════════════════════════════════════╗
// ║        NEXA BOT - AFK PLUGIN          ║
// ╚══════════════════════════════════════╝

const afkStorage = global.afkStorage || (global.afkStorage = new Map())

const pluginConfig = {
    name: 'afk',
    alias: ['away', 'brb'],
    category: 'group',
    description: 'Set status AFK dengan alasan',
    usage: '.afk <alasan>',
    example: '.afk lagi makan',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

function getAfkUser(jid) {
    return afkStorage.get(jid) || null
}

function setAfkUser(jid, reason) {
    afkStorage.set(jid, {
        reason: reason || 'Tidak ada alasan',
        time: Date.now()
    })
}

function removeAfkUser(jid) {
    afkStorage.delete(jid)
}

function isUserAfk(jid) {
    return afkStorage.has(jid)
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) return `${hours} jam ${minutes % 60} menit`
    if (minutes > 0) return `${minutes} menit ${seconds % 60} detik`
    return `${seconds} detik`
}

// ─── Handler: set AFK ──────────────────────────────────────────
async function handler(m, { sock }) {
    const reason = m.args.join(' ') || 'Tidak ada alasan'
    setAfkUser(m.sender, reason)

    await m.reply(
        `╭─「 💤 *AFK AKTIF* 」\n` +
        `│\n` +
        `│ 👤 *${m.pushName}* sekarang AFK\n` +
        `│ 📝 Alasan : *${reason}*\n` +
        `│\n` +
        `╰─ _Ketik apapun untuk menonaktifkan AFK._`,
        { mentions: [m.sender] }
    )
}

// ─── Middleware: cek AFK setiap pesan masuk ────────────────────
async function checkAfk(m, sock) {
    // Cek apakah pengirim sedang AFK
    const afkData = getAfkUser(m.sender)
    if (afkData) {
        // Jangan hapus AFK kalau dia lagi ngetik command .afk lagi
        if (m.isCommand && m.command?.toLowerCase() === 'afk') return

        removeAfkUser(m.sender)
        const duration = formatDuration(Date.now() - afkData.time)

        await m.reply(
            `╭─「 👋 *AFK BERAKHIR* 」\n` +
            `│\n` +
            `│ 👤 *${m.pushName}* sudah kembali!\n` +
            `│ ⏱️ Durasi AFK : *${duration}*\n` +
            `│\n` +
            `╰──────────────────────`,
            { mentions: [m.sender] }
        )
    }

    // Cek apakah ada user yang di-mention sedang AFK
    if (m.isGroup && m.mentionedJid && m.mentionedJid.length > 0) {
        for (const mentioned of m.mentionedJid) {
            const mentionedAfk = getAfkUser(mentioned)
            if (!mentionedAfk) continue

            const duration = formatDuration(Date.now() - mentionedAfk.time)
            await m.reply(
                `╭─「 💤 *USER SEDANG AFK* 」\n` +
                `│\n` +
                `│ 👤 @${mentioned.split('@')[0]} lagi AFK nih!\n` +
                `│ 📝 Alasan : *${mentionedAfk.reason}*\n` +
                `│ ⏱️ Sejak  : *${duration} yang lalu*\n` +
                `│\n` +
                `╰──────────────────────`,
                { mentions: [mentioned] }
            )
        }
    }
}

module.exports = {
    config: pluginConfig,
    handler,
    checkAfk,
    getAfkUser,
    setAfkUser,
    removeAfkUser,
    isUserAfk
}
