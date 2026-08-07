const fetch = require('node-fetch')

const pluginConfig = {
    name: 'fakeffduo',
    alias: ['ffduo', 'fakeff2', 'duoff'],
    category: 'canvas',
    description: 'Membuat gambar lobby Fake Free Fire Duo',
    usage: '.fakeffduo <nick1> | <nick2>',
    example: '.fakeffduo Nexa 😠 | Xy Pemula',
    cooldown: 10,
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

async function handler(m, { sock, text, args }) {
    // Multi-fallback penangkapan teks input
    let rawInput = text || (args && args.join(' ')) || ''
    if (!rawInput && (m.text || m.body)) {
        const body = m.text || m.body || ''
        rawInput = body.replace(/^[^\s]+\s*/, '')
    }

    // Pemisahan 2 Nickname menggunakan tanda '|'
    const [nick1, nick2] = rawInput.split('|').map(v => v ? v.trim() : '')

    if (!nick1 || !nick2) {
        let helpMsg = `🎮 *${toSmallCaps('ꜰᴀᴋᴇ ꜰꜰ ᴅᴜᴏ')}*\n\n`
        helpMsg += `> ${toSmallCaps('gunakan tanda | untuk memisahkan 2 nickname')}\n\n`
        helpMsg += `*Contoh:* \`${m.prefix || '.'}fakeffduo Nexa 😠 | Xy Pemula\``
        return m.reply(helpMsg)
    }

    await m.react('⏳')

    try {
        const apiUrl = `https://apii.nexadev.my.id/fakeffduo?nickname1=${encodeURIComponent(nick1)}&nickname2=${encodeURIComponent(nick2)}`

        const res = await fetchWithRetry(apiUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/*, application/json'
            },
            timeout: 60000
        }, 2)

        if (!res.ok) throw new Error(`HTTP Error ${res.status}`)

        const contentType = res.headers.get('content-type') || ''
        let caption = `🎮 *${toSmallCaps('ꜰᴀᴋᴇ ꜰꜰ ᴅᴜᴏ')}*\n\n`
        caption += `┃ 👤 ${toSmallCaps('ɴɪᴄᴋɴᴀᴍᴇ')} 1: *${nick1}*\n`
        caption += `┃ 👤 ${toSmallCaps('ɴɪᴄᴋɴᴀᴍᴇ')} 2: *${nick2}*`

        // Pengecekan tipe respon API (JSON atau Direct Buffer Gambar)
        if (contentType.includes('application/json')) {
            const result = await res.json()
            const imgUrl = result.url || result.data?.url || result.result || result.image
            
            if (!imgUrl) {
                throw new Error(result.message || 'Gagal mendapatkan gambar Fake FF Duo!')
            }

            await sock.sendMessage(m.chat, {
                image: { url: imgUrl },
                caption: caption
            }, { quoted: m })
        } else {
            const imageBuffer = await res.buffer()
            
            if (!imageBuffer || !imageBuffer.length) {
                throw new Error('Buffer gambar kosong!')
            }

            await sock.sendMessage(m.chat, {
                image: imageBuffer,
                caption: caption,
                mimetype: 'image/png'
            }, { quoted: m })
        }

        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        const errMsg = err.message.includes('timeout') 
            ? 'Koneksi ke server API lambat/timeout. Silakan coba lagi.' 
            : err.message
        return m.reply(toSmallCaps(`❌ Gagal membuat Fake FF Duo: ${errMsg}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
