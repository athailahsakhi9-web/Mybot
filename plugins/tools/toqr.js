const FormData = require('form-data')
const fetch = require('node-fetch')
const { downloadMediaMessage, getContentType } = require('nexa')

const pluginConfig = {
    name: 'toqr',
    alias: ['qr', 'qrcode', 'makeqr', 'genqr'],
    category: 'tools',
    description: 'Mengubah teks, link, atau media menjadi QR Code',
    usage: '.toqr <teks/link> atau reply media',
    example: '.toqr https://nexadev.my.id',
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

async function uploadToNexaDev(buffer, filename) {
    const form = new FormData()
    form.append('files[]', buffer, { filename, contentType: 'application/octet-stream' })
    
    const res = await fetch('https://clooud.my.id/uploder/', { method: 'POST', body: form, timeout: 30000 })
    if (!res.ok) throw new Error('Gagal unggah ke cloud')
    const data = await res.json()
    const url = data?.url || data?.data?.url || data?.files?.[0]?.url
    if (!url) throw new Error('Response upload tidak valid')
    return url
}

function getFileExtension(mimetype) {
    const mimeMap = {
        'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
        'video/mp4': 'mp4', 'audio/mpeg': 'mp3', 'audio/mp4': 'mp3'
    }
    return mimeMap[mimetype] || 'bin'
}

async function handler(m, { sock, text }) {
    let targetUrl = text ? text.trim() : ''
    let media = null, mimetype = null, filename = 'file'

    // 1. Cek apakah pengguna melakukan Reply / Send Media
    const quotedMsg = m.quoted?.message
    const directMsg = m.message

    if (quotedMsg) {
        const type = getContentType(quotedMsg)
        if (type && type !== 'conversation' && type !== 'extendedTextMessage') {
            const content = quotedMsg[type]
            mimetype = content?.mimetype || ''
            try {
                media = await downloadMediaMessage({ key: m.quoted.key, message: quotedMsg }, 'buffer', {})
                filename = content?.fileName || `file.${getFileExtension(mimetype)}`
            } catch (e) {}
        }
    } else if (directMsg) {
        const type = getContentType(directMsg)
        if (type && type !== 'conversation' && type !== 'extendedTextMessage') {
            const content = directMsg[type]
            mimetype = content?.mimetype || ''
            try {
                media = await downloadMediaMessage({ key: m.key, message: directMsg }, 'buffer', {})
                filename = content?.fileName || `file.${getFileExtension(mimetype)}`
            } catch (e) {}
        }
    }

    // 2. Jika tidak ada media, cek teks quoted
    if (!media && !targetUrl && m.quoted?.text) {
        targetUrl = m.quoted.text.trim()
    }

    if (!media && !targetUrl) {
        return m.reply(toSmallCaps('⚠️ Masukkan teks/URL atau reply media (gambar/video/audio) untuk diubah ke QR Code!'))
    }

    await m.react('⏳')

    try {
        // 3. Jika input berupa media, upload dulu ke Nexa Clooud
        if (media && media.length > 0) {
            targetUrl = await uploadToNexaDev(media, filename)
        }

        // 4. Generate QR Code via NexaDev API
        const apiUrl = `https://api.nexadev.my.id/tools/toqr?url=${encodeURIComponent(targetUrl)}`
        const res = await fetch(apiUrl, { timeout: 30000 })

        if (!res.ok) throw new Error(`HTTP Error ${res.status}`)

        const contentType = res.headers.get('content-type') || ''
        let imageBuffer = null

        if (contentType.includes('application/json')) {
            const data = await res.json()
            const qrUrl = data?.result || data?.url || data?.data?.url || data?.data
            if (!qrUrl || typeof qrUrl !== 'string') {
                throw new Error(data?.message || 'Gagal membuat QR Code!')
            }
            const imgRes = await fetch(qrUrl)
            imageBuffer = await imgRes.buffer()
        } else {
            imageBuffer = await res.buffer()
        }

        if (!imageBuffer || imageBuffer.length === 0) {
            throw new Error('Gambar QR Code kosong!')
        }

        // 5. Kirim Hasil
        let caption = `📱 *${toSmallCaps('ǫʀ ᴄᴏᴅᴇ ɢᴇɴᴇʀᴀᴛᴏʀ')}*\n\n`
        caption += `╰┈┈⬡ ${toSmallCaps('ʙᴇʀʜᴀsɪʟ ᴍᴇᴍʙᴜᴀᴛ ǫʀ ᴄᴏᴅᴇ')}\n`
        if (media) caption += `> *URL Media:* ${targetUrl}`

        await sock.sendMessage(m.chat, {
            image: imageBuffer,
            caption: caption
        }, { quoted: m })

        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        return m.reply(toSmallCaps(`❌ Gagal membuat QR Code: ${err.message}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
