const fetch = require('node-fetch')

const pluginConfig = {
    name: 'mlstalk',
    alias: ['cekml', 'ml', 'mobilelegends'],
    category: 'stalker',
    description: 'Cek nickname akun Mobile Legends berdasarkan ID dan Zone',
    usage: '.ml <id> <zone>',
    example: '.ml 134972929 2687',
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

async function handler(m, { text, args }) {
    // Multi-fallback penangkapan teks input
    let rawInput = text || (args && args.join(' ')) || ''
    if (!rawInput && (m.text || m.body)) {
        const body = m.text || m.body || ''
        rawInput = body.replace(/^[^\s]+\s*/, '')
    }

    // Ekstrak deretan angka (ID dan Zone)
    const numbers = rawInput.match(/\d+/g) || []
    const id = numbers[0] || ''
    const zone = numbers[1] || ''

    if (!id || !zone) {
        return m.reply(toSmallCaps('⚠️ Masukkan ID dan Zone Mobile Legends!\nContoh: .ml 134972929 2687 atau .ml 134972929|2687'))
    }

    await m.react('⏳')

    try {
        const apiUrl = `https://api.nexadev.my.id/api/ml?id=${encodeURIComponent(id)}&zone=${encodeURIComponent(zone)}`
        const res = await fetch(apiUrl, { timeout: 30000 })

        if (!res.ok) throw new Error(`HTTP Error ${res.status}`)

        const result = await res.json()

        if (!result || !result.status || !result.data?.username) {
            throw new Error('ID atau Zone Mobile Legends tidak ditemukan!')
        }

        const username = result.data.username

        let caption = `🎮 *${toSmallCaps('ᴍᴏʙɪʟᴇ ʟᴇɢᴇɴᴅs sᴛᴀʟᴋ')}*\n\n`
        caption += `╭┈┈⬡「 👤 *${toSmallCaps('ᴀᴄᴄᴏᴜɴᴛ ɪɴꜰᴏ')}* 」\n`
        caption += `┃ 🆔 ${toSmallCaps('ɪᴅ')}: *${id}*\n`
        caption += `┃ 🌐 ${toSmallCaps('ᴢᴏɴᴇ')}: *${zone}*\n`
        caption += `┃ 👤 ${toSmallCaps('ᴜsᴇʀɴᴀᴍᴇ')}: *${username}*\n`
        caption += `╰┈┈┈┈┈┈┈┈⬡`

        await m.reply(caption)
        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        return m.reply(toSmallCaps(`❌ Gagal mengambil data Mobile Legends: ${err.message}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
