const fetch = require('node-fetch')

const pluginConfig = {
    name: 'rch',
    alias: ['reactch', 'reactionch', 'chreaction'],
    category: 'tools',
    description: 'Suntik reaction ke Pesan Saluran (Owner Only)',
    usage: '.rch <url pesan saluran> <emoji>',
    example: '.rch https://whatsapp.com/channel/0029Vb7TkCcD38CStrAMMb3N/4935 👍',
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
    let targetUrl = args[0] || (m.quoted?.text)
    let reactionEmoji = args[1] || '👍' // Default reaction jika tidak diisi

    if (!targetUrl) {
        return m.reply(toSmallCaps('⚠️ Masukkan link pesan saluran!\n\n*Contoh:* .rch https://whatsapp.com/channel/0029Vb7TkCcD38CStrAMMb3N/4935 👍'))
    }

    // ⛔ Validasi Ketat: Dilarang keras menggunakan link saluran utama, harus link pesan (ada ID angka di akhir link)
    const isChannelMessageLink = /whatsapp\.com\/channel\/[a-zA-Z0-9_-]+\/\d+/i.test(targetUrl)

    if (!isChannelMessageLink) {
        return m.reply(toSmallCaps(
            '⚠️ LINK TIDAK VALID!\n\n' +
            '⛔ Dilarang menggunakan link saluran utama.\n' +
            '✅ Wajib menggunakan LINK PESAN saluran (harus ada ID postingan di akhir link).\n\n' +
            '📌 Contoh Benar:\nhttps://whatsapp.com/channel/0029Vb7TkCcD38CStrAMMb3N/4935'
        ))
    }

    // Ambil Base URL & API Key dari config/index.js
    const baseUrl = config?.api?.apinexa || 'https://api.nexadev.my.id'
    const apiKey = config?.APIkey?.apinexa || config?.APIkey?.nexaai || 'nexa'

    await m.react('⏳')

    try {
        // Panggil API Reaction Channel NexaDev (Timeout 2 Menit = 120.000 ms)
        const apiUrl = `${baseUrl}/api/rch?key=${encodeURIComponent(apiKey)}&url=${encodeURIComponent(targetUrl)}&reaction=${encodeURIComponent(reactionEmoji)}`
        const res = await fetch(apiUrl, { timeout: 120000 })
        
        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)
        
        const json = await res.json()
        
        if (!json || json.status === false) {
            throw new Error(json?.message || json?.error || 'Gagal memproses reaction ke postingan saluran')
        }

        // Ekstraksi hasil respon API
        const rawData = json.data || json.result || json
        let resultMsg = typeof rawData === 'string' ? rawData : (json.message || 'Reaction berhasil dikirim!')

        await m.react('📥')

        // Susun Caption Hasil Operasi
        let caption = `🎭 *${toSmallCaps('ᴄʜᴀɴɴᴇʟ ʀᴇᴀᴄᴛɪᴏɴ ʙᴏᴏsᴛᴇʀ')}*\n\n`
        caption += `╭┈┈⬡「 📋 *${toSmallCaps('ᴏʀᴅᴇʀ ɪɴꜰᴏ')}* 」\n`
        caption += `┃ 🎭 ${toSmallCaps('ʀᴇᴀᴄᴛɪᴏɴ')}: *${reactionEmoji}*\n`
        caption += `┃ 📝 ${toSmallCaps('sᴛᴀᴛᴜs')}: *${resultMsg}*\n`
        caption += `╰┈┈┈┈┈┈┈┈⬡\n\n`
        caption += `⚡ ${toSmallCaps('ᴘᴏᴡᴇʀᴇᴅ ʙʏ')}: *NexaDev API*`

        await m.reply(caption)
        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        return m.reply(toSmallCaps(`❌ Gagal memproses Reaction Channel: ${err.message}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
