const fetch = require('node-fetch')

const pluginConfig = {
    name: 'quotebucin',
    alias: ['bucin', 'quote-bucin', 'quotesbucin'],
    category: 'fun',
    description: 'Mendapatkan kata-kata bucin secara acak',
    usage: '.bucin',
    example: '.bucin',
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

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

async function fetchWithRetry(url, options = {}, retries = 2) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options)
            if (res.ok) return res
        } catch (e) {
            if (i === retries - 1) throw e
        }
    }
    return await fetch(url, options)
}

async function handler(m) {
    await m.react('⏳')

    try {
        const apiUrl = 'https://api.nexadev.my.id/api/random/quotebucin'
        
        const res = await fetchWithRetry(apiUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: 30000
        }, 2)

        if (!res.ok) throw new Error(`HTTP Error ${res.status}`)

        const result = await res.json()

        if (!result || !result.status || !result.quote) {
            throw new Error('Gagal mengambil quote bucin!')
        }

        const quote = result.quote

        let caption = `💖 *${toSmallCaps('ǫᴜᴏᴛᴇ ʙᴜᴄɪɴ')}*\n\n`
        caption += `> "${quote}"`

        await m.reply(caption)
        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        const errMsg = err.message.includes('timeout') 
            ? 'Koneksi ke server API lambat/timeout. Silakan coba lagi.' 
            : err.message
        return m.reply(toSmallCaps(`❌ Gagal mengambil quote bucin: ${errMsg}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
