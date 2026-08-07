const fetch = require('node-fetch')

const pluginConfig = {
    name: 'amverif',
    alias: ['verifam', 'vam', 'amverify', 'verifalight'],
    category: 'tools',
    description: 'Verifikasi Link Alight Motion dari Email (Owner Only)',
    usage: '.amverif <email> <link verifikasi>',
    example: '.amverif user@gmail.com https://alight-creative.firebaseapp.com/__/auth/links?link=...',
    cooldown: 15,
    energi: 1,
    isOwner: true, // 🔒 Ditangani langsung oleh checkPermission di handler
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
    let email = args[0]
    let link = args.slice(1).join(' ')

    // Jika user me-reply pesan atau mengetik dalam satu baris
    if (!email || !link) {
        return m.reply(toSmallCaps(
            '⚠️ Masukkan email dan link verifikasi Alight Motion!\n\n' +
            '*Contoh:*\n.amverif user@gmail.com https://alight-creative.firebaseapp.com/__/auth/links?link=...'
        ))
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
        return m.reply(toSmallCaps('⚠️ Format email tidak valid! Harap masukkan email yang benar.'))
    }

    // Validasi domain link verifikasi
    if (!link.includes('alight-creative') && !link.includes('alightcreative')) {
        return m.reply(toSmallCaps('⚠️ Link verifikasi tidak valid! Harus berupa URL verifikasi resmi dari Alight Motion.'))
    }

    const targetEmail = email.trim()
    const targetLink = link.trim()

    // Ambil Base URL & API Key dari config/index.js
    const baseUrl = config?.api?.apinexa || 'https://api.nexadev.my.id'
    const apiKey = config?.APIkey?.apinexa || config?.APIkey?.nexaai || 'nexa'

    await m.react('⏳')

    try {
        // Panggil API Alight Motion Verif NexaDev (Timeout 2 Menit = 120.000 ms)
        const apiUrl = `${baseUrl}/am/verif/?key=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(targetEmail)}&link=${encodeURIComponent(targetLink)}`
        const res = await fetch(apiUrl, { timeout: 120000 })
        
        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)
        
        const json = await res.json()
        
        if (!json || json.status === false) {
            throw new Error(json?.message || json?.error || 'Gagal melakukan verifikasi Alight Motion')
        }

        // Ekstraksi hasil respon API
        const rawData = json.data || json.result || json
        let resultMsg = typeof rawData === 'string' ? rawData : (json.message || 'Verifikasi Alight Motion Berhasil!')

        await m.react('📥')

        // Susun Caption Hasil Operasi
        let caption = `🔐 *${toSmallCaps('ᴀʟɪɢʜᴛ ᴍᴏᴛɪᴏɴ ᴠᴇʀɪꜰɪᴄᴀᴛɪᴏɴ')}*\n\n`
        caption += `╭┈┈⬡「 📋 *${toSmallCaps('ᴠᴇʀɪꜰʏ ɪɴꜰᴏ')}* 」\n`
        caption += `┃ ✉️ ${toSmallCaps('ᴇᴍᴀɪʟ')}: *${targetEmail}*\n`
        caption += `┃ 📝 ${toSmallCaps('sᴛᴀᴛᴜs')}: *${resultMsg}*\n`
        caption += `╰┈┈┈┈┈┈┈┈⬡\n\n`
        caption += `⚡ ${toSmallCaps('ᴘᴏᴡᴇʀᴇᴅ ʙʏ')}: *NexaDev API*`

        await m.reply(caption)
        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        return m.reply(toSmallCaps(`❌ Gagal verifikasi link: ${err.message}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
