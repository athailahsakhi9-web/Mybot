const fetch = require('node-fetch')

const sesi = new Map()

const WAKTU_MS    = 60_000
const COIN_REWARD = 150
const EXP_REWARD  = 35
const fmt = n => n.toLocaleString('id-ID')

const pluginConfig = {
    name: 'tebaklagu',
    alias: ['tl', 'guesssong', 'tebakmusik'],
    category: 'fun',
    description: 'Game Tebak Lagu - Dengarkan audio dan tebak judul lagunya',
    usage: '.tebaklagu',
    example: '.tebaklagu',
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

    // Jika sesi game masih berjalan di chat ini
    if (sesi.has(chat)) {
        return m.reply(
            `🎵 *${toSmallCaps('ᴛᴇʙᴀᴋ ʟᴀɢᴜ')}*\n\n` +
            `Masih ada game aktif di chat ini!\n` +
            `Dengarkan audio di atas lalu ketik jawaban judul lagunya.`
        )
    }

    await m.react('⏳')

    try {
        // Fetch data dari API Siputzx
        const res = await fetch('https://api.siputzx.my.id/api/games/tebaklagu', { timeout: 120000 })
        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)

        const json = await res.json()
        if (!json || !json.status || !json.data) {
            throw new Error(json?.message || 'Gagal mengambil data lagu dari API')
        }

        const { lagu, judul, artis } = json.data

        if (!lagu || !judul) {
            throw new Error('Data audio/judul dari API tidak lengkap')
        }

        // Simpan sesi dengan timeout 60 detik
        const timeout = setTimeout(async () => {
            if (!sesi.has(chat)) return
            const s = sesi.get(chat)
            sesi.delete(chat)
            await sock.sendMessage(chat, {
                text:
                    `⏰ *${toSmallCaps('ᴡᴀᴋᴛᴜ ʜᴀʙɪs')}*\n\n` +
                    `Tidak ada yang berhasil menebak lagu ini!\n\n` +
                    `📖 Judul Lagu: *${s.jawaban}*\n` +
                    `👤 Penyanyi/Artis: *${s.artis}*\n\n` +
                    `> Ketik \`.tebaklagu\` untuk mencoba lagi.`
            }).catch(() => {})
        }, WAKTU_MS)

        sesi.set(chat, {
            jawaban: judul.trim().toUpperCase(),
            artis: artis || 'Tidak Diketahui',
            lagu: lagu,
            timeout
        })

        await m.react('🎵')

        // Kirim audio klip lagu ke WhatsApp (PTT / Voice Note)
        const captionText = 
            `🎵 *${toSmallCaps('ᴛᴇʙᴀᴋ ʟᴀɢᴜ')}*\n\n` +
            `🎧 Dengarkan audio di atas dan tebak judul lagunya!\n\n` +
            `⏰ Waktu: *60 detik*\n` +
            `🪙 Hadiah: *${fmt(COIN_REWARD)} koin + ${EXP_REWARD} exp*\n\n` +
            `> Ketik jawaban kamu sekarang!`

        await sock.sendMessage(chat, {
            audio: { url: lagu },
            mimetype: 'audio/mp4',
            ptt: true
        }, { quoted: m })

        return m.reply(captionText)

    } catch (err) {
        await m.react('❌')
        return m.reply(toSmallCaps(`❌ Gagal mengambil lagu: ${err.message}`))
    }
}

// Handler untuk memeriksa jawaban (dipanggil dari main message handler)
async function checkJawaban(m, { sock, db }) {
    const chat = m.chat
    if (!sesi.has(chat)) return false

    const s = sesi.get(chat)
    const inputJawaban = m.body?.trim().toUpperCase()
    if (!inputJawaban) return false

    // Normalisasi perbandingan teks
    if (inputJawaban === s.jawaban) {
        // Jawaban Benar
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
                `📖 Judul Lagu: *${s.jawaban}*\n` +
                `👤 Artis: *${s.artis}*\n\n` +
                `┌─────────────────\n` +
                `│ 🪙 +${fmt(COIN_REWARD)} koin → *${fmt(koin)}*\n` +
                `│ ⭐ +${EXP_REWARD} exp   → *${fmt(exp)}*\n` +
                `└─────────────────\n\n` +
                `> Ketik \`.tebaklagu\` untuk soal baru.`,
        }, { quoted: m }).catch(() => {})

        return true
    } else {
        // Abaikan jika input pesan terlalu pendek (filter anti-spam)
        if (inputJawaban.length < 2) return false

        await m.react('❌')
        await sock.sendMessage(chat, {
            text: `ᴊᴀᴡᴀʙᴀɴ ᴀɴᴅᴀ ꜱᴀʟᴀʜ ᴡᴋᴡᴋᴡᴋᴡ ✗\n\n> Coba lagi! Masih ada waktu.`,
        }, { quoted: m }).catch(() => {})

        return false
    }
}

module.exports = { config: pluginConfig, handler, checkJawaban }
