const fetch = require('node-fetch')

const pluginConfig = {
    name: 'ffstalk',
    alias: ['cekff', 'ff', 'freefire'],
    category: 'stalker',
    description: 'Cek nickname akun Free Fire berdasarkan ID',
    usage: '.ff <id_ff>',
    example: '.ff 7606762852',
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

// Fungsi fetch dengan Retry jika koneksi timeout/gagal
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

async function handler(m, { text, args }) {
    let rawInput = text || (args && args.join(' ')) || ''
    if (!rawInput && (m.text || m.body)) {
        const body = m.text || m.body || ''
        rawInput = body.replace(/^[^\s]+\s*/, '')
    }

    const numbers = rawInput.match(/\d+/g) || []
    const id = numbers[0] || ''

    if (!id) {
        return m.reply(toSmallCaps('⚠️ Masukkan ID Free Fire!\nContoh: .ff 7606762852'))
    }

    await m.react('⏳')

    try {
        const apiUrl = `https://api.nexadev.my.id/api/ff?id=${encodeURIComponent(id)}`
        
        // Panggil API dengan User-Agent browser dan timeout 45 detik
        const res = await fetchWithRetry(apiUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: 45000
        }, 2)

        if (!res.ok) throw new Error(`HTTP Error ${res.status}`)

        const result = await res.json()

        if (!result || !result.status || !result.data?.username) {
            throw new Error('ID Free Fire tidak ditemukan!')
        }

        const nickname = result.data.username

        let caption = `🎮 *${toSmallCaps('ꜰʀᴇᴇ ꜰɪʀᴇ sᴛᴀʟᴋ')}*\n\n`
        caption += `╭┈┈⬡「 👤 *${toSmallCaps('ᴀᴄᴄᴏᴜɴᴛ ɪɴꜰᴏ')}* 」\n`
        caption += `┃ 🆔 ${toSmallCaps('ɪᴅ')}: *${id}*\n`
        caption += `┃ 👤 ${toSmallCaps('ɴɪᴄᴋɴᴀᴍᴇ')}: *${nickname}*\n`
        caption += `╰┈┈┈┈┈┈┈┈⬡`

        await m.reply(caption)
        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        const errMsg = err.message.includes('timeout') 
            ? 'Koneksi ke server API lambat/timeout. Silakan coba lagi.' 
            : err.message
        return m.reply(toSmallCaps(`❌ Gagal mengambil data Free Fire: ${errMsg}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
