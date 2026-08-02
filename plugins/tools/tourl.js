const FormData = require('form-data')
const fetch = require('node-fetch')
const { downloadMediaMessage, getContentType } = require('nexa')

const pluginConfig = {
    name: 'tourl',
    alias: ['upload', 'clooud', 'url'],
    category: 'tools',
    description: 'Upload media ke Nexa Clooud dan dapatkan URL',
    usage: '.tourl (reply/kirim media)',
    example: '.tourl',
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

async function uploadToNexaDev(buffer, filename) {
    const form = new FormData()
    form.append('files[]', buffer, { filename, contentType: 'application/octet-stream' })
    
    const res = await fetch('https://clooud.my.id/uploder/', { method: 'POST', body: form, timeout: 30000 })
    if (!res.ok) throw new Error('NexaDev gagal')
    const data = await res.json()
    const url = data?.url || data?.data?.url || data?.files?.[0]?.url
    if (!url) throw new Error('Invalid response')
    return { host: 'Nexa Clooud', url, expires: 'Permanent' }
}

const ALLOWED_MIMES = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'video/mp4', 
    'audio/mpeg', 
    'audio/mp4'
]

function getFileExtension(mimetype) {
    const mimeMap = {
        'image/jpeg': 'jpg', 
        'image/jpg': 'jpg', 
        'image/png': 'png',
        'video/mp4': 'mp4', 
        'audio/mpeg': 'mp3', 
        'audio/mp4': 'mp3'
    }
    return mimeMap[mimetype] || 'bin'
}

async function handler(m, { sock }) {
    let media = null, mimetype = null, filename = 'file'
    
    // 1. Deteksi Media dari Pesan Quoted maupun Pesan Utama
    if (m.quoted?.message) {
        const type = getContentType(m.quoted.message)
        if (!type || type === 'conversation' || type === 'extendedTextMessage') {
            return m.reply(toSmallCaps('⚠️ Reply media (gambar/video/audio mp3)!'))
        }
        const content = m.quoted.message[type]
        mimetype = content?.mimetype || ''
        
        if (!ALLOWED_MIMES.includes(mimetype)) {
            return m.reply(toSmallCaps('⚠️ Format tidak didukung! Hanya menerima MP4, MP3, JPG, JPEG, dan PNG.'))
        }
        
        try {
            media = await downloadMediaMessage({ key: m.quoted.key, message: m.quoted.message }, 'buffer', {})
            filename = content?.fileName || `file.${getFileExtension(mimetype)}`
        } catch (e) {
            return m.reply(toSmallCaps(`❌ Gagal download: ${e.message}`))
        }
    } else if (m.message) {
        const type = getContentType(m.message)
        if (!type || type === 'conversation' || type === 'extendedTextMessage') {
            return m.reply(toSmallCaps('⚠️ Kirim media dengan caption .tourl atau reply medianya'))
        }
        const content = m.message[type]
        mimetype = content?.mimetype || ''
        
        if (!ALLOWED_MIMES.includes(mimetype)) {
            return m.reply(toSmallCaps('⚠️ Format tidak didukung! Hanya menerima MP4, MP3, JPG, JPEG, dan PNG.'))
        }
        
        try {
            media = await downloadMediaMessage({ key: m.key, message: m.message }, 'buffer', {})
            filename = content?.fileName || `file.${getFileExtension(mimetype)}`
        } catch (e) {
            return m.reply(toSmallCaps(`❌ Gagal download: ${e.message}`))
        }
    }
    
    if (!media || media.length === 0) {
        return m.reply(toSmallCaps('⚠️ Media tidak ditemukan!'))
    }
    
    await m.react('📤')
    
    // 2. Eksekusi Upload (Hanya Nexa Clooud)
    try {
        const result = await uploadToNexaDev(media, filename)
        
        let caption = `📤 *${toSmallCaps('ᴜᴘʟᴏᴀᴅ sᴜᴄᴄᴇss')}*\n\n`
        caption += `╭┈┈⬡「 📋 *${toSmallCaps('ʀᴇsᴜʟᴛ')}* 」\n`
        caption += `┃ 📦 ${toSmallCaps('sɪᴢᴇ')}: *${(media.length / 1024 / 1024).toFixed(2)} MB*\n`
        caption += `┃ 🌐 ${toSmallCaps('ʜᴏsᴛ')}: *${result.host}*\n`
        caption += `┃ ⏱️ ${toSmallCaps('ᴇxᴘɪʀᴇs')}: *${toSmallCaps(result.expires)}*\n`
        caption += `╰┈┈┈┈┈┈┈┈⬡\n\n`
        caption += `*${toSmallCaps('ʟɪɴᴋ')}:*\n> ${result.url}`

        const buttons = [
            {
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: `📋 ${toSmallCaps('ᴄᴏᴘʏ ᴜʀʟ')}`,
                    copy_code: result.url
                })
            },
            {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: `🌐 ${toSmallCaps('ᴏᴘᴇɴ ᴜʀʟ')}`,
                    url: result.url
                })
            }
        ]

        await sock.sendMessage(m.chat, {
            text: caption,
            contextInfo: {
                externalAdReply: {
                    title: `📤 ${toSmallCaps('ᴜᴘʟᴏᴀᴅ ᴄʟᴏᴏᴜᴅ')}`,
                    body: toSmallCaps('berhasil mengunggah file'),
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            },
            interactiveButtons: buttons
        }, { quoted: m })

        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        return m.reply(toSmallCaps(`❌ Gagal mengunggah ke Nexa Clooud: ${err.message}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
