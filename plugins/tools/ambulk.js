const fetch = require('node-fetch')

const pluginConfig = {
    name: 'ambulk',
    alias: ['bulkam', 'createambulk', 'ambulkcreate'],
    category: 'tools',
    description: 'Bulk Create & Auto Verif Akun Alight Motion (Owner Only)',
    usage: '.ambulk <jumlah (1-20)>',
    example: '.ambulk 5',
    cooldown: 20,
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
    let amount = parseInt(args[0])

    if (isNaN(amount) || amount <= 0) {
        return m.reply(toSmallCaps('⚠️ Masukkan jumlah akun yang ingin dibuat (1 - 20)!\n\n*Contoh:* .ambulk 5'))
    }

    // ⛔ Batasan Maksimal 20 Akun
    if (amount > 20) {
        return m.reply(toSmallCaps('⚠️ Pembuatan akun dibatasi maksimal 20 akun dalam sekali request!'))
    }

    // Ambil Base URL & API Key dari config/index.js
    const baseUrl = config?.api?.apinexa || 'https://api.nexadev.my.id'
    const apiKey = config?.APIkey?.apinexa || config?.APIkey?.nexaai || 'nexa'

    await m.react('⏳')

    try {
        // Panggil API Bulk AM NexaDev (Timeout 5 Menit = 300.000 ms karena butuh proses auto-verif)
        const apiUrl = `${baseUrl}/am/bulk/?key=${encodeURIComponent(apiKey)}&amount=${amount}`
        const res = await fetch(apiUrl, { timeout: 300000 })
        
        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)
        
        const json = await res.json()
        
        if (!json || json.status === false) {
            throw new Error(json?.message || json?.error || 'Gagal membuat bulk akun Alight Motion')
        }

        await m.react('📥')

        const summary = json.summary || {}
        const accountData = json.data || []
        
        // Susun Ringkasan Hasil Respon
        let caption = `📦 *${toSmallCaps('ᴀʟɪɢʜᴛ ᴍᴏᴛɪᴏɴ ʙᴜʟᴋ ᴄʀᴇᴀᴛᴏʀ')}*\n\n`
        caption += `╭┈┈⬡「 📋 *${toSmallCaps('sᴜᴍᴍᴀʀʏ ɪɴꜰᴏ')}* 」\n`
        caption += `┃ 🎯 ${toSmallCaps('ᴛᴏᴛᴀʟ ʀᴇǫᴜᴇsᴛ')}: *${json.amount || amount}*\n`
        caption += `┃ ✅ ${toSmallCaps('sᴜᴄᴄᴇss')}: *${summary.success ?? 0}*\n`
        caption += `┃ ❌ ${toSmallCaps('ꜰᴀɪʟᴇᴅ')}: *${summary.failed ?? 0}*\n`
        if (json.limit_left !== undefined) {
            caption += `┃ 💳 ${toSmallCaps('ʟɪᴍɪᴛ ʟᴇꜰᴛ')}: *${json.limit_left}*\n`
        }
        caption += `╰┈┈┈┈┈┈┈┈⬡\n\n`

        // Susun Daftar Akun Yang Berhasil Dibuat
        if (accountData.length > 0) {
            caption += `📝 *${toSmallCaps('ᴀᴄᴄᴏᴜɴᴛ ʟɪsᴛ')}:*\n\n`
            accountData.forEach((acc, i) => {
                caption += `*${i + 1}.* \`${acc.account || 'N/A'}\`\n`
                if (acc.login_url) {
                    caption += `   🔗 *Inbox:* ${acc.login_url}\n`
                }
                caption += `\n`
            })
        }

        caption += `⚡ ${toSmallCaps('ᴘᴏᴡᴇʀᴇᴅ ʙʏ')}: *NexaDev API*`

        await m.reply(caption.trim())
        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        return m.reply(toSmallCaps(`❌ Gagal membuat Bulk AM: ${err.message}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
