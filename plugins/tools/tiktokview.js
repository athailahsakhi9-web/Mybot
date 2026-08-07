const fetch = require('node-fetch')

const pluginConfig = {
    name: 'tiktokview',
    alias: ['ttview', 'ttviews', 'tiktokviews', 'viewtt'],
    category: 'tools',
    description: 'Suntik views video TikTok (Owner Only)',
    usage: '.tiktokview <url tiktok> [quantity]',
    example: '.tiktokview https://vt.tiktok.com/ZSXgNLYbL/ 100',
    cooldown: 15,
    energi: 1,
    isOwner: true, // 🔒 Ditangani langsung oleh checkPermission di messageHandler
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

async function handler(m, { sock, args, config }) {
    let ttUrl = args[0] || (m.quoted?.text)
    let quantity = args[1] || '100' // Default 100 jika tidak diisi

    if (!ttUrl) {
        return m.reply(toSmallCaps('⚠️ Masukkan link TikTok!\n\n*Contoh:* .tiktokview https://vt.tiktok.com/ZSXgNLYbL/ 100'))
    }

    if (!ttUrl.includes('tiktok.com')) {
        return m.reply(toSmallCaps('⚠️ URL tidak valid! Harap masukkan link TikTok yang benar.'))
    }

    // Ambil Base URL & API Key dari config/index.js
    const baseUrl = config?.api?.apinexa || 'https://api.nexadev.my.id'
    const apiKey = config?.APIkey?.apinexa || config?.APIkey?.nexaai || 'nexa'

    await m.react('⏳')

    try {
        // Panggil API TikTok View NexaDev (Timeout 2 Menit = 120.000 ms)
        const apiUrl = `${baseUrl}/api/tiktokview?key=${encodeURIComponent(apiKey)}&url=${encodeURIComponent(ttUrl)}&quantity=${encodeURIComponent(quantity)}`
        const res = await fetch(apiUrl, { timeout: 120000 })
        
        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)
        
        const json = await res.json()
        
        if (!json || json.status === false) {
            throw new Error(json?.message || json?.error || 'Gagal memproses views ke TikTok')
        }

        // Ekstraksi hasil respon API
        const rawData = json.data || json.result || json
        let resultMsg = typeof rawData === 'string' ? rawData : (json.message || 'Order views berhasil dikirim!')

        await m.react('📥')

        // Susun Caption Hasil Operasi
        let caption = `👁️ *${toSmallCaps('ᴛɪᴋᴛᴏᴋ ᴠɪᴇᴡs ʙᴏᴏsᴛᴇʀ')}*\n\n`
        caption += `╭┈┈⬡「 📋 *${toSmallCaps('ᴏʀᴅᴇʀ ɪɴꜰᴏ')}* 」\n`
        caption += `┃ 🎯 ${toSmallCaps('ǫᴜᴀɴᴛɪᴛʏ')}: *${quantity} Views*\n`
        caption += `┃ 📝 ${toSmallCaps('sᴛᴀᴛᴜs')}: *${resultMsg}*\n`
        caption += `╰┈┈┈┈┈┈┈┈⬡\n\n`
        caption += `⚡ ${toSmallCaps('ᴘᴏᴡᴇʀᴇᴅ ʙʏ')}: *NexaDev API*`

        await m.reply(caption)
        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        return m.reply(toSmallCaps(`❌ Gagal memproses TikTok Views: ${err.message}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
