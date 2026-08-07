const fetch = require('node-fetch')

const pluginConfig = {
    name: 'capcut',
    alias: ['capcutdl', 'cc', 'ccdl'],
    category: 'downloader',
    description: 'Download video / template dari CapCut',
    usage: '.capcut <url capcut>',
    example: '.capcut https://www.capcut.com/tv2/ZSXXSAX2q/',
    cooldown: 10,
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

// Fungsi helper untuk mengunduh & mengubah URL media menjadi Buffer (Timeout 1 Menit)
async function getMediaBuffer(url) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 60000
    })
    if (!res.ok) throw new Error(`Gagal mendownload file media (HTTP ${res.status})`)
    const arrayBuf = await res.arrayBuffer()
    return Buffer.from(arrayBuf)
}

async function handler(m, { sock, args }) {
    let ccUrl = args[0] || (m.quoted?.text)
    
    if (!ccUrl) {
        return m.reply(toSmallCaps('⚠️ Masukkan link CapCut!\n\n*Contoh:* .capcut https://www.capcut.com/tv2/ZSXXSAX2q/'))
    }

    if (!ccUrl.includes('capcut.com')) {
        return m.reply(toSmallCaps('⚠️ URL tidak valid! Harap masukkan link CapCut yang benar.'))
    }

    await m.react('⏳')

    try {
        // 1. Panggil API CapCut NexaDev (Timeout 1 Menit)
        const apiUrl = `https://api.nexadev.my.id/api/capcut?url=${encodeURIComponent(ccUrl)}`
        const res = await fetch(apiUrl, { timeout: 60000 })
        
        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)
        
        const json = await res.json()
        
        if (!json || json.status === false) {
            throw new Error(json?.message || json?.error || 'Gagal mengambil data dari API')
        }

        // 2. Ekstraksi data & URL video dari respon API
        const rawData = json.data || json.result || json
        
        let videoUrl = ''
        let title = rawData.title || rawData.name || 'CapCut Video'
        let author = rawData.author?.name || rawData.author || rawData.user || 'Unknown'
        let usage = rawData.usage || rawData.used || rawData.plays || ''

        if (typeof rawData === 'string') {
            videoUrl = rawData
        } else if (typeof rawData === 'object' && rawData !== null) {
            videoUrl = rawData.video || rawData.url || rawData.link || rawData.download_url || rawData.video_url
            if (!videoUrl && Array.isArray(rawData.url)) {
                videoUrl = rawData.url[0]
            }
        }

        if (!videoUrl) {
            throw new Error('URL video CapCut tidak ditemukan pada respon API')
        }

        await m.react('📥')

        // 3. Unduh video dan konversi menjadi Buffer
        const videoBuffer = await getMediaBuffer(videoUrl)

        // 4. Susun caption
        let caption = `🎬 *${toSmallCaps('ᴄᴀᴘᴄᴜᴛ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ')}*\n\n`
        caption += `╭┈┈⬡「 📋 *${toSmallCaps('ɪɴꜰᴏ')}* 」\n`
        caption += `┃ 📌 ${toSmallCaps('ᴛɪᴛʟᴇ')}: *${title}*\n`
        caption += `┃ 👤 ${toSmallCaps('ᴀᴜᴛʜᴏʀ')}: *${author}*\n`
        if (usage) caption += `┃ 📊 ${toSmallCaps('ᴜsᴇᴅ')}: *${usage}*\n`
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
        return m.reply(toSmallCaps(`❌ Gagal mendownload video CapCut: ${err.message}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
