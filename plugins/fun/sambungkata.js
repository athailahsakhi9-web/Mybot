const path     = require('path')
const soalList = require(path.join(process.cwd(), 'src', 'data', 'sambungkata.json'))

const sesi = new Map()

const WAKTU_MS    = 30_000
const COIN_REWARD = 80
const EXP_REWARD  = 20
const fmt = n => n.toLocaleString('id-ID')

const pluginConfig = {
    name: 'sambungkata',
    alias: ['sk'],
    category: 'fun',
    description: 'Tebak kata dari pola huruf yang disamarkan',
    usage: '.sambungkata',
    example: '.sambungkata',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

function clearSesi(chat) {
    const s = sesi.get(chat)
    if (s?.timeout) clearTimeout(s.timeout)
    sesi.delete(chat)
}

function buatTimeout(chat, sock) {
    return setTimeout(async () => {
        const s = sesi.get(chat)
        if (!s) return
        clearSesi(chat)
        await sock.sendMessage(chat, {
            text:
                `⏰ *ᴡᴀᴋᴛᴜ ʜᴀʙɪs!*\n\n` +
                `Tidak ada yang menjawab dengan benar.\n\n` +
                `📖 Jawaban: *${s.jawaban}*\n` +
                `🔡 Soal tadi: *${s.soal}*\n\n` +
                `> Ketik \`.sambungkata\` untuk soal baru.`
        }).catch(() => {})
    }, WAKTU_MS)
}

async function handler(m, { sock }) {
    const chat = m.chat

    if (sesi.has(chat)) {
        const s = sesi.get(chat)
        return m.reply(
            `🔡 *sᴀᴍʙᴜɴɢ ᴋᴀᴛᴀ*\n\n` +
            `Masih ada soal aktif!\n\n` +
            `📝 Soal: *${s.soal}*\n\n` +
            `> Ketik jawabanmu sekarang!`
        )
    }

    const soal = soalList[Math.floor(Math.random() * soalList.length)]

    sesi.set(chat, {
        soal:    soal.soal,
        jawaban: soal.jawaban.toUpperCase(),
        timeout: null
    })

    const s = sesi.get(chat)
    s.timeout = buatTimeout(chat, sock)

    await m.react('🔡')
    return m.reply(
        `🔡 *sᴀᴍʙᴜɴɢ ᴋᴀᴛᴀ*\n\n` +
        `Tebak kata dari pola berikut!\n` +
        `___ = huruf yang hilang\n\n` +
        `📝 Soal: *${soal.soal}*\n\n` +
        `⏰ Waktu: *30 detik*\n` +
        `🪙 Hadiah: *${fmt(COIN_REWARD)} koin + ${EXP_REWARD} exp*\n\n` +
        `> Ketik jawabanmu sekarang!`
    )
}

async function checkJawaban(m, { sock, db }) {
    const chat   = m.chat
    const sender = m.sender

    if (!sesi.has(chat)) return false
    if (m.isCommand) return false

    const s     = sesi.get(chat)
    const input = m.body?.trim().toUpperCase().replace(/\s+/g, ' ')

    if (!input || input.length < 2) return false

    // Jawaban benar
    if (input === s.jawaban) {
        clearTimeout(s.timeout)
        sesi.delete(chat)

        const user = db.getUser(sender) || {}
        const koin = (user.koin || 0) + COIN_REWARD
        const exp  = (user.exp  || 0) + EXP_REWARD
        db.setUser(sender, { koin, exp })

        await m.react('✅')
        await sock.sendMessage(chat, {
            text:
                `✓ ᴊᴀᴡᴀʙᴀɴ ᴀɴᴅᴀ ʙᴇɴᴀʀ ᴘɪɴᴛᴀʀ ʙɴɢᴛ ᴛᴜᴀɴ ✓\n\n` +
                `📖 Jawaban: *${s.jawaban}*\n\n` +
                `┌─────────────────\n` +
                `│ 🪙 +${fmt(COIN_REWARD)} koin → *${fmt(koin)}*\n` +
                `│ ⭐ +${EXP_REWARD} exp   → *${fmt(exp)}*\n` +
                `└─────────────────\n\n` +
                `> Ketik \`.sambungkata\` untuk soal baru.`,
        }, { quoted: m }).catch(() => {})
        return true
    }

    if (input.length < 3) return false

    await m.react('❌')
    await sock.sendMessage(chat, {
        text: `✗ ᴊᴀᴡᴀʙᴀɴ ᴀɴᴅᴀ ꜱᴀʟᴀʜ ᴡᴋᴡᴋᴡᴋᴡ ✗\n\n> Coba lagi! Soal: *${s.soal}*`,
    }, { quoted: m }).catch(() => {})
    return true
}

async function stopSesi(m) {
    const chat = m.chat
    if (!sesi.has(chat)) return m.reply('❌ Tidak ada sesi sambung kata aktif.')
    const s = sesi.get(chat)
    clearSesi(chat)
    await m.react('🛑')
    return m.reply(
        `🛑 Sesi sambung kata dihentikan.\n\n` +
        `📖 Jawaban: *${s.jawaban}*`
    )
}

module.exports = { config: pluginConfig, handler, checkJawaban, stopSesi }