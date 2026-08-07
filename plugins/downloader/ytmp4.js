const fetch = require('node-fetch')

const pluginConfig = {
    name: 'ytmp4',
    alias: ['ytv', 'ytmp4', 'youtubevideo', 'ytvideo'],
    category: 'downloader',
    description: 'Download video YouTube (MP4) dengan pilihan kualitas',
    usage: '.ytmp4 <url youtube> [quality]',
    example: '.ytmp4 https://youtu.be/gQmLrZw5Jlg 720p',
    cooldown: 15,
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

// Fungsi helper untuk mengunduh & mengubah URL media menjadi Buffer (Timeout 2 Menit = 120.000 ms)
async function getMediaBuffer(url) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 120000 // Timeout 2 Menit
    })
    if (!res.ok) throw new Error(`Gagal mendownload file media (HTTP ${res.status})`)
    const arrayBuf = await res.arrayBuffer()
    return Buffer.from(arrayBuf)
}

async function handler(m, { sock, args }) {
    let ytUrl = args[0] || (m.quoted?.text)
    let quality = args[1] || '720p' // Kualitas bawaan 720p

    if (!ytUrl) {
        return m.reply(toSmallCaps('⚠️ Masukkan link YouTube!\n\n*Contoh:* .ytmp4 https://youtu.be/gQmLrZw5Jlg 720p'))
    }

    if (!ytUrl.includes('youtube.com') && !ytUrl.includes('youtu.be')) {
        return m.reply(toSmallCaps('⚠️ URL tidak valid! Harap masukkan link YouTube yang benar.'))
    }

    await m.react('⏳')

    try {
        // 1. Panggil API YTMP4 NexaDev (Timeout 2 Menit = 120.000 ms)
        const apiUrl = `https://api.nexadev.my.id/api/ytmp4?url=${encodeURIComponent(ytUrl)}&type=video&quality=${encodeURIComponent(quality)}`
        const res = await fetch(apiUrl, { timeout: 120000 }) // Timeout 2 Menit
        
        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)
        
        const json = await res.json()
        
        if (!json || json.status === false) {
            throw new Error(json?.message || json?.error || 'Gagal mengambil data dari API')
        }

        // 2. Ekstraksi data & URL video dari respon API
        const rawData = json.data || json.result || json
        
        let videoUrl = ''
        let title = rawData.title || rawData.name || 'YouTube Video'
        let author = rawData.author?.name || rawData.author || rawData.channel || 'Unknown Channel'
        let duration = rawData.duration || rawData.length || ''
        let resQuality = rawData.quality || quality

        if (typeof rawData === 'string') {
            videoUrl = rawData
        } else if (typeof rawData === 'object' && rawData !== null) {
            videoUrl = rawData.video || rawData.url || rawData.dl_url || rawData.download || rawData.download_url || rawData.link
            if (!videoUrl && Array.isArray(rawData.url)) {
                videoUrl = rawData.url[0]
            }
        }

        if (!videoUrl) {
            throw new Error('URL video YouTube tidak ditemukan pada respon API')
        }

        await m.react('📥')

        // 3. Unduh video dan konversi menjadi Buffer (Timeout 2 Menit)
        const videoBuffer = await getMediaBuffer(videoUrl)

        // 4. Susun Caption Informasi Video
        let caption = `🎬 *${toSmallCaps('ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ')}*\n\n`
        caption += `╭┈┈⬡「 📋 *${toSmallCaps('ᴠɪᴅᴇᴏ ɪɴꜰᴏ')}* 」\n`
        caption += `┃ 📌 ${toSmallCaps('ᴛɪᴛʟᴇ')}: *${title}*\n`
        caption += `┃ 👤 ${toSmallCaps('ᴄʜᴀɴɴᴇʟ')}: *${author}*\n`
        if (duration) caption += `┃ ⏱️ ${toSmallCaps('ᴅᴜʀᴀᴛɪᴏɴ')}: *${duration}*\n`
        caption += `┃ 🎥 ${toSmallCaps('ǫᴜᴀʟɪᴛʏ')}: *${resQuality}*\n`
        caption += `╰┈┈┈┈┈┈┈┈⬡\n\n`
        caption += `⚡ ${toSmallCaps('ᴘᴏᴡᴇʀᴇᴅ ʙʏ')}: *NexaDev API*`

        // 5. Kirim video Buffer ke WhatsApp
        await sock.sendMessage(m.chat, {
            video: videoBuffer,
            caption: caption,
            mimetype: 'video/mp4'
        }, { quoted: m })

        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        return m.reply(toSmallCaps(`❌ Gagal mendownload video YouTube: ${err.message}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
