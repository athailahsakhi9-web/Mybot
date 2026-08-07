const fetch = require('node-fetch')

const pluginConfig = {
    name: 'amsend',
    alias: ['sendam', 'am', 'alightmotion'],
    category: 'tools',
    description: 'Kirim Preset / Akses Alight Motion ke Email (Owner Only)',
    usage: '.amsend <email>',
    example: '.amsend user@gmail.com',
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
    let email = args[0] || (m.quoted?.text)

    if (!email) {
        return m.reply(toSmallCaps('⚠️ Masukkan email tujuan!\n\n*Contoh:* .amsend user@gmail.com'))
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
        return m.reply(toSmallCaps('⚠️ Format email tidak valid! Harap masukkan email yang benar.'))
    }

    const targetEmail = email.trim()

    // Ambil Base URL & API Key dari config/index.js
    const baseUrl = config?.api?.apinexa || 'https://api.nexadev.my.id'
    const apiKey = config?.APIkey?.apinexa || config?.APIkey?.nexaai || 'nexa'

    await m.react('⏳')

    try {
        // Panggil API Alight Motion Send NexaDev (Timeout 2 Menit = 120.000 ms)
        const apiUrl = `${baseUrl}/am/send/?key=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(targetEmail)}`
        const res = await fetch(apiUrl, { timeout: 120000 })
        
        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)
        
        const json = await res.json()
        
        if (!json || json.status === false) {
            throw new Error(json?.message || json?.error || 'Gagal mengirim data Alight Motion ke email')
        }

        await m.react('📥')

        // Susun teks instruksi verifikasi sesuai template
        let responseMsg = `📋 *Hasil Verifikasi:*\n`
        responseMsg += `✅ Status: *BERHASIL DIKIRIM*\n`
        responseMsg += `📧 Email: *${targetEmail}*\n\n`
        responseMsg += `⚙️ *Cara mendapatkan link verifikasi:*\n`
        responseMsg += `1. Buka Gmail: *${targetEmail}*\n`
        responseMsg += `2. Cek folder SPAM jika tidak ada di Inbox\n`
        responseMsg += `3. Cari email dari Alight Motion\n`
        responseMsg += `4. Klik link "login ke alight creative" di dalam email\n`
        responseMsg += `5. COPY seluruh URL dari browser kamu\n`
        responseMsg += `6. Kirim URL lengkapnya ke bot ini.\n\n`
        responseMsg += `⏰ *Kamu memiliki waktu 5 MENIT untuk mengirim link verifikasi!*`

        await m.reply(responseMsg)
        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        return m.reply(toSmallCaps(`❌ Gagal mengirim ke email: ${err.message}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
