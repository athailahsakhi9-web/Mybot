const fetch = require('node-fetch')

const pluginConfig = {
    name: 'spotify',
    alias: ['spot', 'spotdl', 'spotifydl', 'song'],
    category: 'downloader',
    description: 'Download lagu MP3 dari Spotify',
    usage: '.spotify <url track spotify>',
    example: '.spotify https://open.spotify.com/track/5WOSNVChcadlsCRiqXE45K',
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

// Map manual untuk font Small Caps
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

// Helper untuk mendownload file menjadi Buffer
async function getMediaBuffer(url) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 120000 // Timeout 2 Menit
    })
    if (!res.ok) throw new Error(`Gagal mendownload file audio (HTTP ${res.status})`)
    const arrayBuf = await res.arrayBuffer()
    return Buffer.from(arrayBuf)
}

async function handler(m, { sock, args }) {
    let trackUrl = args[0] || (m.quoted?.text)

    if (!trackUrl) {
        return m.reply(toSmallCaps('⚠️ Masukkan link lagu Spotify!\n\n*Contoh:* .spotify https://open.spotify.com/track/5WOSNVChcadlsCRiqXE45K'))
    }

    if (!trackUrl.includes('spotify.com')) {
        return m.reply(toSmallCaps('⚠️ URL tidak valid! Harap masukkan link track Spotify yang benar.'))
    }

    await m.react('⏳')

    try {
        // 1. Tembak API Nexray
        const apiUrl = `https://api.nexray.eu.cc/downloader/spotify?url=${encodeURIComponent(trackUrl)}`
        const res = await fetch(apiUrl, { timeout: 60000 })

        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)

        const json = await res.json()

        if (!json || json.status === false || !json.result) {
            throw new Error(json?.message || 'Gagal mengambil data lagu dari API Nexray')
        }

        // 2. Ekstraksi data dari JSON response Nexray
        const title = json.result.title || 'Unknown Title'
        const artist = json.result.artist || 'Unknown Artist'
        const downloadUrl = json.result.url

        if (!downloadUrl) {
            throw new Error('Link download MP3 tidak ditemukan dari respons API')
        }

        await m.react('📥')

        // 3. Unduh MP3 direct link menjadi Buffer
        const audioBuffer = await getMediaBuffer(downloadUrl)

        // 4. Buat Caption Informasi Lagu
        let caption = `🎵 *${toSmallCaps('sᴘᴏᴛɪꜰʏ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ')}*\n\n`
        caption += `📌 *${toSmallCaps('ᴛɪᴛʟᴇ')}*: ${title}\n`
        caption += `👤 *${toSmallCaps('ᴀʀᴛɪsᴛ')}*: ${artist}\n\n`
        caption += `⚡ *${toSmallCaps('ᴘᴏᴡᴇʀᴇᴅ ʙʏ')}*: Nexray API`

        // 5. Kirim Audio ke Chat
        await sock.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/mp4',
            ptt: false,
            fileName: `${title} - ${artist}.mp3`,
            caption: caption
        }, { quoted: m })

        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        return m.reply(toSmallCaps(`❌ Gagal mendownload lagu Spotify: ${err.message}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
