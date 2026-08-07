const fetch = require('node-fetch')

const pluginConfig = {
    name: 'felo',
    alias: ['feloai', 'felosearch', 'aiweb'],
    category: 'ai',
    description: 'Pencarian & Tanya Jawab Berbasis Web dengan Felo AI',
    usage: '.felo <pertanyaan/topik>',
    example: '.felo apa itu javascript',
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
        return m.reply(toSmallCaps('⚠️ Masukkan pertanyaan atau topik pencarian!\n\n*Contoh:* .felo apa itu javascript'))
    }

    // Ambil Base URL dari config/index.js
    const baseUrl = config?.api?.apinexa || 'https://api.nexadev.my.id'

    await m.react('⏳')

    try {
        // Panggil API Felo AI NexaDev (Timeout 2 Menit = 120.000 ms)
        const apiUrl = `${baseUrl}/ai/felo?q=${encodeURIComponent(query.trim())}`
        const res = await fetch(apiUrl, { timeout: 120000 })
        
        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)
        
        const json = await res.json()
        
        if (!json || json.status === false) {
            throw new Error(json?.message || json?.error || 'Gagal mengambil respon dari Felo AI')
        }

        // Ekstraksi teks pesan utama dari data
        const data = json.data || {}
        let resultMsg = data.message || json.result || json.message

        if (!resultMsg) {
            throw new Error('Respon dari Felo AI tidak ditemukan')
        }

        await m.react('📥')

        // Susun Format Pesan Balasan
        let responseMsg = `${resultMsg.trim()}\n\n`
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
