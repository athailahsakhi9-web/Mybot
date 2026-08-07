const fetch = require('node-fetch')

const pluginConfig = {
    name: 'channelmem',
    alias: ['chmember', 'channelmember', 'chmem', 'suntikch'],
    category: 'smm',
    description: 'Suntik / Tambah Member Saluran / Channel',
    usage: '.channelmem <url channel> [jumlah]',
    example: '.channelmem https://whatsapp.com/channel/xxxxxx 100',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
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
    let inputUrl = args[0]
    let quantity = args[1] || 100

    if (!inputUrl) {
        return m.reply(toSmallCaps('⚠️ Masukkan link Saluran / Channel!\n\n*Contoh:* .channelmem https://whatsapp.com/channel/xxxxxx 100'))
    }

    // Ambil API Key & Base URL dari config
    const apiKey = config?.APIkey?.apinexa || config?.APIkey?.nexaai || ''
    const baseUrl = config?.api?.apinexa || 'https://api.nexadev.my.id'

    // Validasi jika API Key belum diisi
    if (!apiKey || apiKey.trim() === '') {
        return m.reply(
            `⚠️ *${toSmallCaps('ᴀᴘɪ ᴋᴇʏ ʙᴇʟᴜᴍ ᴅɪɪꜱɪ')}*\n\n` +
            `API Key perlu diisi di \`config/index.js\`\n\n` +
            `📌 *Daftar API Key:* https://api.nexadev.my.id/home\n` +
            `💳 *Topup Limit:* https://topup.nexapanel.my.id`
        )
    }

    await m.react('⏳')

    try {
        const apiUrl = `${baseUrl}/api/channelmem/?key=${encodeURIComponent(apiKey)}&url=${encodeURIComponent(inputUrl)}&quantity=${encodeURIComponent(quantity)}`
        
        const res = await fetch(apiUrl, { timeout: 120000 })
        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)

        const json = await res.json()

        if (!json || json.status === false) {
            throw new Error(json?.message || json?.error || 'Gagal memproses suntik member channel')
        }

        await m.react('✅')

        let message = `🚀 *${toSmallCaps('ᴄʜᴀɴɴᴇʟ ᴍᴇᴍʙᴇʀ ꜱᴜᴄᴄᴇꜱꜱ')}*\n\n`
        message += `🔗 *Link:* ${inputUrl}\n`
        message += `📊 *Jumlah Member:* ${quantity}\n`
        message += `ℹ️ *Status:* ${json.message || json.result || 'Berhasil diproses'}\n\n`
        message += `⚡ *${toSmallCaps('ᴘᴏᴡᴇʀᴇᴅ ʙʏ')} NexaDev API*`

        return m.reply(message)

    } catch (err) {
        await m.react('❌')
        return m.reply(toSmallCaps(`❌ Gagal merespon: ${err.message}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}