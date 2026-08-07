const fs   = require('fs')
const path = require('path')

const DB_PATH = path.join(process.cwd(), 'data', 'gcSchedule.json')

function loadDB() {
    try {
        if (!fs.existsSync(DB_PATH)) return {}
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
    } catch {
        return {}
    }
}

function saveDB(db) {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

async function applyGroupLock(sock, groupId, lock) {
    await sock.groupSettingUpdate(groupId, lock ? 'announcement' : 'not_announcement')
}

// Scheduler jalan sekali secara global (pakai `global` biar nggak dobel walau
// offgc/ongc/setgc/listgc/delgc itu module file terpisah-pisah). Command
// apapun yang dipanggil duluan setelah bot nyala bakal nyalain ini.
function ensureScheduler(sock) {
    global.__gcSock = sock // selalu update biar reference socket-nya tetap fresh
    if (global.__gcSchedulerStarted) return
    global.__gcSchedulerStarted = true

    setInterval(async () => {
        const activeSock = global.__gcSock
        if (!activeSock) return

        const db  = loadDB()
        const now = new Date()
        const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

        for (const groupId of Object.keys(db)) {
            for (const sch of (db[groupId] || [])) {
                if (sch.close === nowStr) await applyGroupLock(activeSock, groupId, true).catch(() => {})
                if (sch.open  === nowStr) await applyGroupLock(activeSock, groupId, false).catch(() => {})
            }
        }
    }, 60 * 1000) // cek tiap menit
}

const pluginConfig = {
    name: 'offgc',
    alias: ['closegc', 'lockgc', 'gcoff'],
    category: 'group',
    description: 'Tutup grup sekarang (cuma admin yang bisa kirim pesan)',
    usage: '.offgc',
    example: '.offgc',
    isOwner: true,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    ensureScheduler(sock)

    if (!m.isGroup) {
        return m.reply('❌ Command ini cuma bisa dipakai di dalam grup.')
    }

    await m.react('⌛')
    try {
        await applyGroupLock(sock, m.chat, true)
        await m.react('🔒')
        return m.reply('🔒 *Grup ditutup* — cuma admin yang bisa kirim pesan sekarang.')
    } catch (error) {
        await m.react('❌')
        return m.reply(`❌ *Gagal menutup grup*\n\n> ${error.message}\n\n> Pastikan bot adalah admin grup ini.`)
    }
}

module.exports = { config: pluginConfig, handler }