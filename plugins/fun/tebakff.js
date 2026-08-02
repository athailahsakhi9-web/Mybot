const path = require('path')
const soalList = require(path.join(process.cwd(), 'src', 'data', 'tebakff.json'))

// Sesi aktif: key = m.chat, value = { jawaban, soal, img, sender, timeout }
const sesi = new Map()

const WAKTU_MS    = 45_000   // 45 detik untuk jawab (lebih lama karena tebak gambar)
const COIN_REWARD = 150
const EXP_REWARD  = 35
const fmt = n => n.toLocaleString('id-ID')

const pluginConfig = {
    name: 'tebakff',
    alias: ['tff', 'tebakfreefire'],
    category: 'fun',
    description: 'Tebak karakter Free Fire dari gambar yang diberikan',
    usage: '.tebakff',
    example: '.tebakff',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 2,
    isEnabled: true
}

async function handler(m, { sock, db }) {
    const chat = m.chat

    // Kalau sesi sudah aktif di chat ini
    if (sesi.has(chat)) {
        const aktif = sesi.get(chat)
        return m.reply(
            `🎮 *ᴛᴇʙᴀᴋ ᴋᴀʀᴀᴋᴛᴇʀ ꜰʀᴇᴇ ꜰɪʀᴇ*

` +
            `Masih ada soal aktif!

` +
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
            image: { url: s.img },
            caption:
                `⏰ *ᴡᴀᴋᴛᴜ ʜᴀʙɪs!*

` +
                `Tidak ada yang menjawab dengan benar.

` +
                `📖 Jawaban: *${s.jawaban}*
` +
                `💡 Info: ${s.deskripsi}

` +
                `> Ketik \`.tebakff\` untuk soal baru.`
        }).catch(() => {})
    }, WAKTU_MS)

    sesi.set(chat, {
        jawaban: soal.jawaban.toUpperCase(),
        soal:    soal.deskripsi,
        img:     soal.img,
        deskripsi: soal.deskripsi,
        sender:  null,
        timeout
    })

    await m.react('🎮')

    // Kirim gambar soal
    await sock.sendMessage(chat, {
        image: { url: soal.img },
        caption:
            `🎮 *ᴛᴇʙᴀᴋ ᴋᴀʀᴀᴋᴛᴇʀ ꜰʀᴇᴇ ꜰɪʀᴇ*

` +
            `Siapakah karakter Free Fire ini?

` +
            `⏰ Waktu: *45 detik*
` +
            `🪙 Hadiah: *${fmt(COIN_REWARD)} koin + ${EXP_REWARD} exp*

` +
            `> Ketik nama karakternya sekarang!`
    })
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
            image: { url: s.img },
            caption:
                `ᴊᴀᴡᴀʙᴀɴ ᴀɴᴅᴀ ʙᴇɴᴀʀ ᴘɪɴᴛᴀʀ ʙɴɢᴛ ᴛᴜᴀɴ ✓

` +
                `📖 Jawaban: *${s.jawaban}*
` +
                `💡 Info: ${s.deskripsi}

` +
                `┌─────────────────
` +
                `│ 🪙 +${fmt(COIN_REWARD)} koin → *${fmt(koin)}*
` +
                `│ ⭐ +${EXP_REWARD} exp   → *${fmt(exp)}*
` +
                `└─────────────────

` +
                `> Ketik \`.tebakff\` untuk soal baru.`,
        }, { quoted: m }).catch(() => {})

        return true
    } else {
        // Jawaban salah — hanya balas kalau seperti jawaban (bukan pesan random)
        // Filter: minimal 2 kata atau 4 huruf biar ga spam tiap pesan
        if (jawaban.length < 4 && !jawaban.includes(' ')) return false

        await m.react('❌')
        await sock.sendMessage(chat, {
            text: `ᴊᴀᴡᴀʙᴀɴ ᴀɴᴅᴀ ꜱᴀʟᴀʜ ᴡᴋᴡᴋᴡᴋᴡ ✗

> Coba lagi! Masih ada waktu.`,
        }, { quoted: m }).catch(() => {})

        return false
    }
}

module.exports = { config: pluginConfig, handler, checkJawaban }
