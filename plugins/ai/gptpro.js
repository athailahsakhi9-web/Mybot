const fetch = require('node-fetch')

const pluginConfig = {
    name: 'chatgptpro',
    alias: ['gptpro', 'cgptpro', 'gpt4pro', 'chatgpt'],
    category: 'ai',
    description: 'Tanya jawab dengan ChatGPT Pro',
    usage: '.chatgptpro <pertanyaan/teks>',
    example: '.chatgptpro apa itu axios',
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

async function handler(m, { sock, args, config }) {
    let query = args.join(' ') || (m.quoted?.text)

    if (!query) {
        return m.reply(toSmallCaps('⚠️ Masukkan pertanyaan atau teks!\n\n*Contoh:* .chatgptpro apa itu axios'))
    }

    // Ambil Base URL dari config/index.js
    const baseUrl = config?.api?.apinexa || 'https://api.nexadev.my.id'

    await m.react('⏳')

    try {
        // Panggil API ChatGPT Pro NexaDev (Timeout 2 Menit = 120.000 ms)
        const apiUrl = `${baseUrl}/ai/chatgptpro?q=${encodeURIComponent(query.trim())}`
        const res = await fetch(apiUrl, { timeout: 120000 })
        
        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)
        
        const json = await res.json()
        
        if (!json || json.status === false) {
            throw new Error(json?.message || json?.error || 'Gagal mengambil respon dari ChatGPT Pro')
        }

        // Ekstraksi hasil respon API
        const rawData = json.result || json.data || json.response || json.reply || json.message || json
        let resultText = typeof rawData === 'string' ? rawData : JSON.stringify(rawData, null, 2)

        await m.react('📥')

        // Susun Format Pesan Balasan
        let responseMsg = `${resultText.trim()}\n\n`
        responseMsg += `⚡ *${toSmallCaps('ᴘᴏᴡᴇʀᴇᴅ ʙʏ')} NexaDev API*`

        await m.reply(responseMsg)
        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        return m.reply(toSmallCaps(`❌ Gagal merespon: ${err.message}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
