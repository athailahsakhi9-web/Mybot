const path  = require('path')
const soalList = require(path.join(process.cwd(), 'src', 'data', 'tebakkata.json'))

// Sesi aktif: key = m.chat, value = { jawaban, soal, sender, timeout }
const sesi = new Map()

const WAKTU_MS    = 30_000   // 30 detik untuk jawab
const COIN_REWARD = 100
const EXP_REWARD  = 25
const fmt = n => n.toLocaleString('id-ID')

const pluginConfig = {
    name: 'tebakkata',
    alias: ['tk'],
    category: 'fun',
    description: 'Tebak kata dari petunjuk yang diberikan',
    usage: '.tebakkata',
    example: '.tebakkata',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock, db }) {
    const chat = m.chat

    // Kalau sesi sudah aktif di chat ini
    if (sesi.has(chat)) {
        const aktif = sesi.get(chat)
        return m.reply(
            `🧩 *ᴛᴇʙᴀᴋ ᴋᴀᴛᴀ*\n\n` +
            `Masih ada soal aktif!\n\n` +
            `📝 *Petunjuk:*\n${aktif.soal}\n\n` +
            `> Ketik jawaban kamu atau tunggu waktu habis.`
        )
    }

    // Ambil soal random
    const soal = soalList[Math.floor(Math.random() * soalList.length)]

    // Simpan sesi
    const timeout = setTimeout(async () => {
        if (!sesi.has(chat)) return
        const s = sesi.get(chat)
        sesi.delete(chat)
        await sock.sendMessage(chat, {
            text:
                `⏰ *ᴡᴀᴋᴛᴜ ʜᴀʙɪs!*\n\n` +
                `Tidak ada yang menjawab dengan benar.\n\n` +
                `📖 Jawaban: *${s.jawaban}*\n\n` +
                `> Ketik \`.tebakkata\` untuk soal baru.`
        }).catch(() => {})
    }, WAKTU_MS)

    sesi.set(chat, {
        jawaban: soal.jawaban.toUpperCase(),
        soal:    soal.soal,
        sender:  null,
        timeout
    })

    await m.react('🧩')
    return m.reply(
        `🧩 *ᴛᴇʙᴀᴋ ᴋᴀᴛᴀ*\n\n` +
        `📝 *Petunjuk:*\n${soal.soal}\n\n` +
        `⏰ Waktu: *30 detik*\n` +
        `🪙 Hadiah: *${fmt(COIN_REWARD)} koin + ${EXP_REWARD} exp*\n\n` +
        `> Ketik jawaban kamu sekarang!`
    )
}

// Handler untuk cek jawaban dari pesan biasa (dipanggil dari main handler)
async function checkJawaban(m, { sock, db }) {
    const chat = m.chat
    if (!sesi.has(chat)) return false

    const s = sesi.get(chat)
    const jawaban = m.body?.trim().toUpperCase()
    if (!jawaban) return false

    if (jawaban === s.jawaban) {
        // Jawaban benar
        clearTimeout(s.timeout)
        sesi.delete(chat)

        const sender = m.sender
        const user   = db.getUser(sender) || {}
        const koin   = (user.koin || 0) + COIN_REWARD
        const exp    = (user.exp  || 0) + EXP_REWARD
        db.setUser(sender, { koin, exp })

        await m.react('✅')
        await sock.sendMessage(chat, {
            text:
                `ᴊᴀᴡᴀʙᴀɴ ᴀɴᴅᴀ ʙᴇɴᴀʀ ᴘɪɴᴛᴀʀ ʙɴɢᴛ ᴛᴜᴀɴ ✓\n\n` +
                `📖 Jawaban: *${s.jawaban}*\n\n` +
                `┌─────────────────\n` +
                `│ 🪙 +${fmt(COIN_REWARD)} koin → *${fmt(koin)}*\n` +
                `│ ⭐ +${EXP_REWARD} exp   → *${fmt(exp)}*\n` +
                `└─────────────────\n\n` +
                `> Ketik \`.tebakkata\` untuk soal baru.`,
        }, { quoted: m }).catch(() => {})

        return true
    } else {
        // Jawaban salah — hanya balas kalau seperti jawaban (bukan pesan random)
        // Filter: minimal 2 kata atau 4 huruf biar ga spam tiap pesan
        if (jawaban.length < 4 && !jawaban.includes(' ')) return false

        await m.react('❌')
        await sock.sendMessage(chat, {
            text: `ᴊᴀᴡᴀʙᴀɴ ᴀɴᴅᴀ ꜱᴀʟᴀʜ ᴡᴋᴡᴋᴡᴋᴡ ✗\n\n> Coba lagi! Masih ada waktu.`,
        }, { quoted: m }).catch(() => {})

        return false
    }
}

module.exports = { config: pluginConfig, handler, checkJawaban }