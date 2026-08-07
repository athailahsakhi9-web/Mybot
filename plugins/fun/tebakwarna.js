const fetch = require('node-fetch')

// Sesi aktif: key = m.chat, value = { jawaban, plate, image, timeout }
const sesi = new Map()

const WAKTU_MS    = 30_000   // 30 detik untuk jawab
const COIN_REWARD = 100
const EXP_REWARD  = 25
const fmt = n => n.toLocaleString('id-ID')

const pluginConfig = {
    name: 'tebakwarna',
    alias: ['tw', 'tebakbutawarna', 'ishihara'],
    category: 'fun',
    description: 'Game Tebak Warna / Tes Ishihara - Tebak angka pada gambar',
    usage: '.tebakwarna',
    example: '.tebakwarna',
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
        return m.reply(
            `🎨 *${toSmallCaps('ᴛᴇʙᴀᴋ ᴡᴀʀɴᴀ')}*\n\n` +
            `Masih ada soal aktif di chat ini!\n` +
            `Lihat gambar yang dikirim sebelumnya lalu ketik jawaban angka/warnanya.`
        )
    }

    await m.react('⏳')

    try {
        // Fetch data dari API Siputzx
        const res = await fetch('https://api.siputzx.my.id/api/games/tebakwarna', { timeout: 120000 })
        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)

        const json = await res.json()
        if (!json || !json.status || !json.data) {
            throw new Error(json?.message || 'Gagal mengambil gambar dari API')
        }

        const { plate, correct, image } = json.data

        if (!image || correct === undefined) {
            throw new Error('Data gambar/jawaban dari API tidak lengkap')
        }

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
                    `> Ketik \`.tebakwarna\` untuk mencoba lagi.`
            }).catch(() => {})
        }, WAKTU_MS)

        sesi.set(chat, {
            jawaban: String(correct).trim().toUpperCase(),
            plate: plate || '-',
            image: image,
            timeout
        })

        await m.react('👁️')

        // Format Caption Pesan Gambar
        const captionText = 
            `🎨 *${toSmallCaps('ᴛᴇʙᴀᴋ ᴡᴀʀɴᴀ / ɪꜱʜɪʜᴀʀᴀ')}*\n\n` +
            `👁️ Angka/Warna berapa yang ada pada gambar di atas?\n\n` +
            `⏰ Waktu: *30 detik*\n` +
            `🪙 Hadiah: *${fmt(COIN_REWARD)} koin + ${EXP_REWARD} exp*\n\n` +
            `> Ketik jawaban kamu sekarang!`

        await sock.sendMessage(chat, {
            image: { url: image },
            caption: captionText
        }, { quoted: m })

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
    const jawabanUser = m.body?.trim().toUpperCase()
    if (!jawabanUser) return false

    if (jawabanUser === s.jawaban) {
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
                `🎉 *${toSmallCaps('ᴊᴀᴡᴀʙᴀɴ ʙᴇɴᴀʀ')}*\n\n` +
                `📖 Jawaban: *${s.jawaban}*\n\n` +
                `┌─────────────────\n` +
                `│ 🪙 +${fmt(COIN_REWARD)} koin → *${fmt(koin)}*\n` +
                `│ ⭐ +${EXP_REWARD} exp   → *${fmt(exp)}*\n` +
                `└─────────────────\n\n` +
                `> Ketik \`.tebakwarna\` untuk soal baru.`,
        }, { quoted: m }).catch(() => {})

        return true
    } else {
        // Filter anti-spam: abaikan pesan yang merupakan perintah bot lain
        if (jawabanUser.startsWith('.') || jawabanUser.startsWith('/')) return false

        await m.react('❌')
        await sock.sendMessage(chat, {
            text: `ᴊᴀᴡᴀʙᴀɴ ᴀɴᴅᴀ ꜱᴀʟᴀʜ ᴡᴋᴡᴋᴡᴋᴡ ✗\n\n> Coba lagi! Masih ada waktu.`,
        }, { quoted: m }).catch(() => {})

        return false
    }
}

module.exports = { config: pluginConfig, handler, checkJawaban }
