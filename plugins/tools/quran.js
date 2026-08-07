const fetch = require('node-fetch')

const pluginConfig = {
    name: 'quran',
    alias: ['alquran', 'surah', 'ayat'],
    category: 'islamic',
    description: 'Menampilkan ayat Al-Qur\'an berdasarkan surah dan ayat',
    usage: '.quran <surah> <ayat> atau .quran <surah>:<ayat>',
    example: '.quran 5 1 atau .quran 5:1',
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
    let input = args.join(' ').trim() || (m.quoted?.text?.trim())

    if (!input) {
        return m.reply(toSmallCaps('⚠️ Masukkan nomor surah dan ayat!\n\n*Contoh:* .quran 5 1 atau .quran 5:1'))
    }

    // Parsing nomor surah dan ayat
    let surah, verse
    if (input.includes(':')) {
        [surah, verse] = input.split(':').map(v => v.trim())
    } else if (input.includes(' ')) {
        [surah, verse] = input.split(/\s+/).map(v => v.trim())
    } else {
        return m.reply(toSmallCaps('⚠️ Format salah! Gunakan spasi atau titik dua (:)\n\n*Contoh:* .quran 5 1 atau .quran 5:1'))
    }

    if (!surah || !verse || isNaN(surah) || isNaN(verse)) {
        return m.reply(toSmallCaps('⚠️ Nomor surah dan ayat harus berupa angka!\n\n*Contoh:* .quran 5 1'))
    }

    // Ambil Base URL dari config/index.js
    const baseUrl = config?.api?.apinexa || 'https://api.nexadev.my.id'

    await m.react('⏳')

    try {
        // Panggil API Quran NexaDev (Timeout 2 Menit = 120.000 ms)
        const apiUrl = `${baseUrl}/api/quran/?surah=${surah}&verse=${verse}`
        const res = await fetch(apiUrl, { timeout: 120000 })
        
        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)
        
        const json = await res.json()
        
        if (!json || json.status === false) {
            throw new Error(json?.message || json?.error || 'Gagal mengambil data Al-Qur\'an')
        }

        // Ekstraksi data hasil respon API
        const data = json.result || json.data || json
        
        let arabic = data.arabic || data.ar || data.text?.ar || data.ayat || ''
        let latin = data.latin || data.tr || data.transliteration || ''
        let translation = data.translation || data.id || data.text?.id || data.terjemahan || data.meaning || ''
        let surahName = data.surah_name || data.surah || surah

        await m.react('📥')

        // Susun Format Pesan Balasan
        let responseMsg = `📖 *${toSmallCaps('ꜱᴜʀᴀʜ')} ${surahName} : ${toSmallCaps('ᴀʏᴀᴛ')} ${verse}*\n\n`
        
        if (arabic) responseMsg += `${arabic}\n\n`
        if (latin) responseMsg += `_${latin}_\n\n`
        if (translation) responseMsg += `*${toSmallCaps('ᴀʀᴛɪ')}:*\n"${translation}"\n\n`
        
        // Fallback jika format respon berupa objek/string mentah
        if (!arabic && !translation) {
            let rawData = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
            responseMsg = `${rawData.trim()}\n\n`
        }

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
