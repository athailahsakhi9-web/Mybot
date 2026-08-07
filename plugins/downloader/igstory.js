const fetch = require('node-fetch')

const pluginConfig = {
    name: 'igstory',
    alias: ['igs', 'igstories', 'storyig', 'strig'],
    category: 'downloader',
    description: 'Download Instagram Story berdasarkan Username',
    usage: '.igstory <username>',
    example: '.igstory nexadev',
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

// Deteksi tipe media dari URL
function detectMediaType(url) {
    if (typeof url !== 'string') return 'image'
    const lower = url.toLowerCase()
    if (lower.includes('.mp4') || lower.includes('.m3u8') || lower.includes('.mov') || lower.includes('/video/')) {
        return 'video'
    }
    return 'image'
}

async function handler(m, { sock, args }) {
    let input = args[0] || (m.quoted?.text)
    
    if (!input) {
        return m.reply(toSmallCaps('⚠️ Masukkan Username Instagram!\n\n*Contoh:* .igstory nexadev'))
    }

    // Bersihkan username dari karakter @ atau URL penuh jika dimasukkan user
    let username = input.trim().replace(/^@/, '')
    if (username.includes('instagram.com/stories/')) {
        username = username.split('instagram.com/stories/')[1].split('/')[0]
    } else if (username.includes('instagram.com/')) {
        username = username.split('instagram.com/')[1].split('/')[0]
    }

    await m.react('⏳')

    try {
        // 1. Panggil API IG Stories NexaDev (Timeout 1 Menit)
        const apiUrl = `https://api.nexadev.my.id/api/igstories/?username=${encodeURIComponent(username)}`
        const res = await fetch(apiUrl, { timeout: 60000 })
        
        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)
        
        const json = await res.json()
        
        if (!json || json.status === false) {
            throw new Error(json?.message || json?.error || 'Gagal mengambil data story dari API')
        }

        // 2. Ekstraksi daftar story dari respon API
        let storyItems = []
        const rawData = json.data || json.result || json.stories || json

        if (Array.isArray(rawData)) {
            storyItems = rawData
        } else if (typeof rawData === 'string') {
            storyItems = [rawData]
        } else if (typeof rawData === 'object' && rawData !== null) {
            if (Array.isArray(rawData.url)) {
                storyItems = rawData.url
            } else if (Array.isArray(rawData.media)) {
                storyItems = rawData.media
            } else if (rawData.url) {
                storyItems = [rawData.url]
            }
        }

        // Normalisasi format item story
        let parsedStories = storyItems.map(item => {
            if (typeof item === 'string') {
                return { url: item, type: detectMediaType(item) }
            } else if (typeof item === 'object' && item !== null) {
                const targetUrl = item.url || item.link || item.src || item.download_url
                const type = item.type || detectMediaType(targetUrl)
                return { url: targetUrl, type }
            }
            return null
        }).filter(item => item && item.url)

        if (parsedStories.length === 0) {
            throw new Error('Tidak ada story aktif atau akun bersifat privat/tidak ditemukan')
        }

        await m.react('📥')

        const totalStories = parsedStories.length
        let baseCaption = `📖 *${toSmallCaps('ɪɴsᴛᴀɢʀᴀᴍ sᴛᴏʀʏ')}*\n\n`
        baseCaption += `👤 ${toSmallCaps('ᴜsᴇʀɴᴀᴍᴇ')}: *@${username}*\n`
        baseCaption += `📦 ${toSmallCaps('ᴛᴏᴛᴀʟ sᴛᴏʀʏ')}: *${totalStories}*\n`
        baseCaption += `⚡ ${toSmallCaps('ᴘᴏᴡᴇʀᴇᴅ ʙʏ')}: *NexaDev API*`

        // 3. Convert tiap URL story ke Buffer lalu kirim ke WhatsApp
        for (let i = 0; i < totalStories; i++) {
            const item = parsedStories[i]
            const mediaBuffer = await getMediaBuffer(item.url)
            const itemCaption = totalStories > 1 ? `${baseCaption}\n\n📄 *${toSmallCaps('sᴛᴏʀʏ')} ${i + 1}/${totalStories}*` : baseCaption

            if (item.type === 'video') {
                await sock.sendMessage(m.chat, {
                    video: mediaBuffer,
                    caption: itemCaption,
                    mimetype: 'video/mp4'
                }, { quoted: m })
            } else {
                await sock.sendMessage(m.chat, {
                    image: mediaBuffer,
                    caption: itemCaption,
                    mimetype: 'image/jpeg'
                }, { quoted: m })
            }
        }

        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        return m.reply(toSmallCaps(`❌ Gagal mendownload Story Instagram: ${err.message}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
