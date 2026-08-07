const FormData = require('form-data')
const fetch = require('node-fetch')
const { downloadMediaMessage, getContentType } = require('nexa')

const pluginConfig = {
    name: 'upscale',
    alias: ['hd', 'remini', 'upscaler', 'enhance'],
    category: 'tools',
    description: 'Meningkatkan kualitas dan resolusi gambar (HD/Upscale)',
    usage: '.hd (reply/kirim gambar)',
    example: '.hd',
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

// Fungsi Upload ke Nexa Clooud
async function uploadToNexaDev(buffer, filename) {
    const form = new FormData()
    form.append('files[]', buffer, { filename, contentType: 'application/octet-stream' })
    
    const res = await fetch('https://clooud.my.id/uploder/', { method: 'POST', body: form, timeout: 30000 })
    if (!res.ok) throw new Error('Gagal mengunggah media ke Nexa Clooud')
    const data = await res.json()
    const url = data?.url || data?.data?.url || data?.files?.[0]?.url
    if (!url) throw new Error('URL upload tidak valid')
    return url
}

// Hanya menerima format Gambar
const ALLOWED_IMAGE_MIMES = [
    'image/jpeg', 
    'image/jpg', 
    'image/png',
    'image/webp'
]

function getFileExtension(mimetype) {
    const mimeMap = {
        'image/jpeg': 'jpg', 
        'image/jpg': 'jpg', 
        'image/png': 'png',
        'image/webp': 'webp'
    }
    return mimeMap[mimetype] || 'jpg'
}

async function handler(m, { sock }) {
    let media = null, mimetype = null, filename = 'image.jpg'
    
    // 1. Deteksi Gambar dari Pesan Quoted maupun Pesan Utama
    if (m.quoted?.message) {
        const type = getContentType(m.quoted.message)
        if (!type || type === 'conversation' || type === 'extendedTextMessage') {
            return m.reply(toSmallCaps('⚠️ Reply gambar yang ingin di-upscale!'))
        }
        const content = m.quoted.message[type]
        mimetype = content?.mimetype || ''
        
        if (!ALLOWED_IMAGE_MIMES.includes(mimetype)) {
            return m.reply(toSmallCaps('⚠️ Format tidak didukung! Hanya menerima gambar (JPG, JPEG, PNG, WEBP).'))
        }
        
        try {
            media = await downloadMediaMessage({ key: m.quoted.key, message: m.quoted.message }, 'buffer', {})
            filename = content?.fileName || `image.${getFileExtension(mimetype)}`
        } catch (e) {
            return m.reply(toSmallCaps(`❌ Gagal download media: ${e.message}`))
        }
    } else if (m.message) {
        const type = getContentType(m.message)
        if (!type || type === 'conversation' || type === 'extendedTextMessage') {
            return m.reply(toSmallCaps('⚠️ Kirim gambar dengan caption .hd atau reply gambarnya'))
        }
        const content = m.message[type]
        mimetype = content?.mimetype || ''
        
        if (!ALLOWED_IMAGE_MIMES.includes(mimetype)) {
            return m.reply(toSmallCaps('⚠️ Format tidak didukung! Hanya menerima gambar (JPG, JPEG, PNG, WEBP).'))
        }
        
        try {
            media = await downloadMediaMessage({ key: m.key, message: m.message }, 'buffer', {})
            filename = content?.fileName || `image.${getFileExtension(mimetype)}`
        } catch (e) {
            return m.reply(toSmallCaps(`❌ Gagal download media: ${e.message}`))
        }
    }
    
    if (!media || media.length === 0) {
        return m.reply(toSmallCaps('⚠️ Gambar tidak ditemukan!'))
    }
    
    await m.react('⏳')
    
    try {
        // 2. Upload Gambar ke Nexa Clooud
        const uploadedUrl = await uploadToNexaDev(media, filename)
        
        await m.react('🪄')
        
        // 3. Panggil API Upscale NexaDev
        const apiUrl = `https://api.nexadev.my.id/api/upscale?url=${encodeURIComponent(uploadedUrl)}`
        const apiRes = await fetch(apiUrl, { timeout: 60000 })
        
        if (!apiRes.ok) throw new Error(`API Error HTTP status ${apiRes.status}`)
        
        const contentType = apiRes.headers.get('content-type') || ''
        let resultImageBuffer = null
        
        // Handling jika API mengembalikan JSON
        if (contentType.includes('application/json')) {
            const json = await apiRes.json()
            const resultUrl = json?.result?.url || json?.result || json?.url || json?.data
            if (!resultUrl || typeof resultUrl !== 'string') {
                throw new Error(json?.message || json?.error || 'Gagal memproses gambar dari API')
            }
            
            const imgFetch = await fetch(resultUrl)
            const arrayBuf = await imgFetch.arrayBuffer()
            resultImageBuffer = Buffer.from(arrayBuf)
        } else {
            // Handling jika API langsung mengembalikan Buffer gambar
            const arrayBuf = await apiRes.arrayBuffer()
            resultImageBuffer = Buffer.from(arrayBuf)
        }
        
        if (!resultImageBuffer || resultImageBuffer.length === 0) {
            throw new Error('Buffer gambar hasil upscale kosong')
        }

        // 4. Kirim Hasil Gambar HD ke User
        const caption = `✨ *${toSmallCaps('ᴜᴘsᴄᴀʟᴇ sᴜᴄᴄᴇss')}*\n\n` +
                        `🖼️ ${toSmallCaps('sᴛᴀᴛᴜs')}: *${toSmallCaps('sᴜᴄᴄᴇss')}*\n` +
                        `⚡ ${toSmallCaps('ᴇɴʜᴀɴᴄᴇᴅ ʙʏ')}: *NexaDev API*`

        await sock.sendMessage(m.chat, {
            image: resultImageBuffer,
            caption: caption
        }, { quoted: m })

        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        return m.reply(toSmallCaps(`❌ Gagal meningkatkan kualitas gambar: ${err.message}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
