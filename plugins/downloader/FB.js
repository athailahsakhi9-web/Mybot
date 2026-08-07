const fetch = require('node-fetch')

const pluginConfig = {
    name: 'facebook',
    alias: ['fb', 'fbdl', 'fbvideo', 'fb reel'],
    category: 'downloader',
    description: 'Download video atau media dari Facebook (Reels/Post/Watch)',
    usage: '.fb <url facebook>',
    example: '.fb https://www.facebook.com/share/r/176Gd2Y3F5/',
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
    if (typeof url !== 'string') return 'video'
    const lower = url.toLowerCase()
    if (lower.includes('.mp3') || lower.includes('.wav') || lower.includes('/audio/')) {
        return 'audio'
    }
    if (lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png') || lower.includes('.webp')) {
        return 'image'
    }
    return 'video'
}

async function handler(m, { sock, args }) {
    let fbUrl = args[0] || (m.quoted?.text)
    
    if (!fbUrl) {
        return m.reply(toSmallCaps('⚠️ Masukkan link Facebook!\n\n*Contoh:* .fb https://www.facebook.com/share/r/176Gd2Y3F5/'))
    }

    if (!fbUrl.includes('facebook.com') && !fbUrl.includes('fb.watch') && !fbUrl.includes('fb.gg')) {
        return m.reply(toSmallCaps('⚠️ URL tidak valid! Harap masukkan link Facebook yang benar.'))
    }

    await m.react('⏳')

    try {
        // 1. Panggil API FB NexaDev (Timeout 1 Menit)
        const apiUrl = `https://api.nexadev.my.id/api/fb?url=${encodeURIComponent(fbUrl)}`
        const res = await fetch(apiUrl, { timeout: 60000 })
        
        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)
        
        const json = await res.json()
        
        if (!json || json.status === false) {
            throw new Error(json?.message || json?.error || 'Gagal mengambil data dari API')
        }

        // 2. Ekstraksi URL media dari respon API (Support format HD/SD, Array, maupun Object)
        let mediaItems = []
        const rawData = json.data || json.result || json.media || json

        if (typeof rawData === 'object' && rawData !== null) {
            if (rawData.hd || rawData.sd) {
                // Utamakan Kualitas HD, jika tidak ada gunakan SD
                const videoUrl = rawData.hd || rawData.sd
                const quality = rawData.hd ? 'HD' : 'SD'
                mediaItems.push({ url: videoUrl, type: 'video', quality })
            } else if (Array.isArray(rawData)) {
                rawData.forEach(item => {
                    if (typeof item === 'string') {
                        mediaItems.push({ url: item, type: detectMediaType(item) })
                    } else if (typeof item === 'object' && item !== null) {
                        const targetUrl = item.url || item.hd || item.sd || item.link
                        const quality = item.hd ? 'HD' : (item.sd ? 'SD' : '')
                        mediaItems.push({ url: targetUrl, type: item.type || detectMediaType(targetUrl), quality })
                    }
                })
            } else if (rawData.url) {
                mediaItems.push({ url: rawData.url, type: detectMediaType(rawData.url) })
            }
        } else if (typeof rawData === 'string') {
            mediaItems.push({ url: rawData, type: detectMediaType(rawData) })
        }

        // Filter media yang valid
        mediaItems = mediaItems.filter(item => item && item.url)

        if (mediaItems.length === 0) {
            throw new Error('Media tidak ditemukan atau link bersifat privat/tidak didukung')
        }

        await m.react('📥')

        const totalMedia = mediaItems.length
        let baseCaption = `📘 *${toSmallCaps('ꜰᴀᴄᴇʙᴏᴏᴋ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ')}*\n\n`
        baseCaption += `📦 ${toSmallCaps('ᴛᴏᴛᴀʟ ᴍᴇᴅɪᴀ')}: *${totalMedia}*\n`
        baseCaption += `⚡ ${toSmallCaps('ᴘᴏᴡᴇʀᴇᴅ ʙʏ')}: *NexaDev API*`

        // 3. Convert URL ke Buffer lalu kirim ke WhatsApp
        for (let i = 0; i < totalMedia; i++) {
            const item = mediaItems[i]
            const mediaBuffer = await getMediaBuffer(item.url)
            
            let itemCaption = totalMedia > 1 ? `${baseCaption}\n\n📄 *${toSmallCaps('ᴍᴇᴅɪᴀ')} ${i + 1}/${totalMedia}*` : baseCaption
            if (item.quality) {
                itemCaption += `\n🎥 ${toSmallCaps('ǫᴜᴀʟɪᴛʏ')}: *${item.quality}*`
            }

            if (item.type === 'video') {
                await sock.sendMessage(m.chat, {
                    video: mediaBuffer,
                    caption: itemCaption,
                    mimetype: 'video/mp4'
                }, { quoted: m })
            } else if (item.type === 'audio') {
                await sock.sendMessage(m.chat, {
                    audio: mediaBuffer,
                    mimetype: 'audio/mp4',
                    ptt: false
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
        return m.reply(toSmallCaps(`❌ Gagal mendownload media Facebook: ${err.message}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
