const fetch = require('node-fetch')

const pluginConfig = {
    name: 'mediafire',
    alias: ['mf', 'mfdl', 'mediafiredl'],
    category: 'downloader',
    description: 'Download file dari link Mediafire',
    usage: '.mediafire <url mediafire>',
    example: '.mediafire https://www.mediafire.com/file/v7rlj8ngxj1621f/Nexa_Bot_v1.0.0.zip/file',
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

// Fungsi helper untuk mengunduh & mengubah URL media/file menjadi Buffer (Timeout 1 Menit)
async function getMediaBuffer(url) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 60000
    })
    if (!res.ok) throw new Error(`Gagal mendownload file (HTTP ${res.status})`)
    const arrayBuf = await res.arrayBuffer()
    return Buffer.from(arrayBuf)
}

async function handler(m, { sock, args }) {
    let mfUrl = args[0] || (m.quoted?.text)
    
    if (!mfUrl) {
        return m.reply(toSmallCaps('⚠️ Masukkan link Mediafire!\n\n*Contoh:* .mf https://www.mediafire.com/file/v7rlj8ngxj1621f/Nexa_Bot_v1.0.0.zip/file'))
    }

    if (!mfUrl.includes('mediafire.com')) {
        return m.reply(toSmallCaps('⚠️ URL tidak valid! Harap masukkan link Mediafire yang benar.'))
    }

    await m.react('⏳')

    try {
        // 1. Panggil API Mediafire NexaDev (Timeout 1 Menit)
        const apiUrl = `https://api.nexadev.my.id/api/mediafire?url=${encodeURIComponent(mfUrl)}`
        const res = await fetch(apiUrl, { timeout: 60000 })
        
        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)
        
        const json = await res.json()
        
        if (!json || json.status === false) {
            throw new Error(json?.message || json?.error || 'Gagal mengambil data dari API')
        }

        // 2. Ekstraksi data file & URL download dari respon API
        const rawData = json.data || json.result || json
        
        let fileUrl = ''
        let filename = rawData.filename || rawData.name || rawData.title || rawData.fileName || 'file.zip'
        let filesize = rawData.filesize || rawData.size || rawData.fileSize || 'Unknown'
        let filetype = rawData.ext || rawData.mimetype || rawData.filetype || 'application/octet-stream'

        if (typeof rawData === 'string') {
            fileUrl = rawData
        } else if (typeof rawData === 'object' && rawData !== null) {
            fileUrl = rawData.url || rawData.download || rawData.link || rawData.download_url || rawData.file
            if (!fileUrl && Array.isArray(rawData.url)) {
                fileUrl = rawData.url[0]
            }
        }

        if (!fileUrl) {
            throw new Error('URL download Mediafire tidak ditemukan pada respon API')
        }

        await m.react('📥')

        // 3. Unduh file dan konversi menjadi Buffer
        const fileBuffer = await getMediaBuffer(fileUrl)

        // 4. Susun Caption Informasi File
        let caption = `📁 *${toSmallCaps('ᴍᴇᴅɪᴀꜰɪʀᴇ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ')}*\n\n`
        caption += `╭┈┈⬡「 📋 *${toSmallCaps('ꜰɪʟᴇ ɪɴꜰᴏ')}* 」\n`
        caption += `┃ 📌 ${toSmallCaps('ɴᴀᴍᴇ')}: *${filename}*\n`
        caption += `┃ 📊 ${toSmallCaps('sɪᴢᴇ')}: *${filesize}*\n`
        caption += `╰┈┈┈┈┈┈┈┈⬡\n\n`
        caption += `⚡ ${toSmallCaps('ᴘᴏᴡᴇʀᴇᴅ ʙʏ')}: *NexaDev API*`

        // 5. Kirimkan File dalam Bentuk Document ke WhatsApp
        await sock.sendMessage(m.chat, {
            document: fileBuffer,
            fileName: filename,
            mimetype: filetype,
            caption: caption
        }, { quoted: m })

        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        return m.reply(toSmallCaps(`❌ Gagal mendownload file Mediafire: ${err.message}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
