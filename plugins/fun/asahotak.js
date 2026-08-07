const fetch = require('node-fetch')

// Sesi aktif: key = m.chat, value = { jawaban, soal, sender, timeout }
const sesi = new Map()

const WAKTU_MS    = 30_000   // 30 detik untuk jawab
const COIN_REWARD = 100
const EXP_REWARD  = 25
const fmt = n => n.toLocaleString('id-ID')

const pluginConfig = {
    name: 'asahotak',
    alias: ['ao', 'asahotakgame'],
    category: 'fun',
    description: 'Game Asah Otak - Jawab pertanyaan dari API',
    usage: '.asahotak',
    example: '.asahotak',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

// Map manual untuk mengubah teks biasa menjadi Small Caps font style
const SMALL_CAPS_MAP = {
    'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ꜰ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ', 
    'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 
    's': 's', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ',
    'A': 'ᴀ', 'B': 'ʙ', 'C': 'ᴄ', 'D': 'ᴅ', 'E': 'ᴇ', 'F': 'ꜰ', 'G': 'ɢ', 'H': 'ʜ', 'I': 'ɪ', 
    'J': 'ᴊ', 'K': 'ᴋ', 'L': 'ʟ', 'M': 'ᴍ', 'N': 'ɴ', 'O': 'ᴏ', 'P': 'ᴘ', 'Q': 'ǫ', 'R': 'ʀ', 
    'S': 's', 'T': 'ᴛ', 'U': 'ᴜ', 'V': 'ᴠ', 'W': 'ᴡ', 'X': 'x', 'Y': 'ʏ', 'Z': 'ᴢ'
}

function toSmallCaps(text) {
    return text.split('').map(char => SMALL_CAPS_MAP[char] || char).join('')
}

async function handler(m, { sock, db }) {
    const chat = m.chat

    // Kalau sesi sudah aktif di chat ini
    if (sesi.has(chat)) {
        const aktif = sesi.get(chat)
        return m.reply(
            `🧠 *${toSmallCaps('ᴀꜱᴀʜ ᴏᴛᴀᴋ')}*\n\n` +
            `Masih ada soal aktif!\n\n` +
            `📝 *Pertanyaan:*\n${aktif.soal}\n\n` +
            `> Ketik jawaban kamu atau tunggu waktu habis.`
        )
    }

    await m.react('⏳')

    try {
        // Fetch data dari API Siputzx
        const res = await fetch('https://api.siputzx.my.id/api/games/asahotak', { timeout: 120000 })
        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)

        const json = await res.json()
        if (!json || !json.status || !json.data) {
            throw new Error(json?.message || 'Gagal mengambil soal dari API')
        }

        const { soal, jawaban } = json.data

        // Simpan sesi dengan timeout 30 detik
        const timeout = setTimeout(async () => {
            if (!sesi.has(chat)) return
            const s = sesi.get(chat)
            sesi.delete(chat)
            await sock.sendMessage(chat, {
                text:
                    `⏰ *${toSmallCaps('ᴡᴀᴋᴛᴜ ʜᴀʙɪs')}*\n\n` +
                    `Tidak ada yang menjawab dengan benar.\n\n` +
                    `📖 Jawaban: *${s.jawaban}*\n\n` +
                    `> Ketik \`.asahotak\` untuk soal baru.`
            }).catch(() => {})
        }, WAKTU_MS)

        sesi.set(chat, {
            jawaban: jawaban.trim().toUpperCase(),
            soal: soal.trim(),
            sender: null,
            timeout
        })

        await m.react('🧠')
        return m.reply(
            `🧠 *${toSmallCaps('ᴀꜱᴀʜ ᴏᴛᴀᴋ')}*\n\n` +
            `📝 *Pertanyaan:*\n${soal.trim()}\n\n` +
            `⏰ Waktu: *30 detik*\n` +
            `🪙 Hadiah: *${fmt(COIN_REWARD)} koin + ${EXP_REWARD} exp*\n\n` +
            `> Ketik jawaban kamu sekarang!`
        )

    } catch (err) {
        await m.react('❌')
        return m.reply(toSmallCaps(`❌ Gagal mengambil soal: ${err.message}`))
    }
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
                `> Ketik \`.asahotak\` untuk soal baru.`,
        }, { quoted: m }).catch(() => {})

        return true
    } else {
        // Filter agar pesan acak yang terlalu pendek tidak memicu balasan salah
        if (jawaban.length < 2) return false

        await m.react('❌')
        await sock.sendMessage(chat, {
            text: `ᴊᴀᴡᴀʙᴀɴ ᴀɴᴅᴀ ꜱᴀʟᴀʜ ᴡᴋᴡᴋᴡᴋᴡ ✗\n\n> Coba lagi! Masih ada waktu.`,
        }, { quoted: m }).catch(() => {})

        return false
    }
}

module.exports = { config: pluginConfig, handler, checkJawaban }
