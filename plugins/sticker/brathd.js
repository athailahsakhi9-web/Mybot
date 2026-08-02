const axios = require('axios')
const path  = require('path')
const fs    = require('fs')
// ─── Load thumbnail once at startup ───────────────────────────────────────────
const THUMB_PATH  = path.join(process.cwd(), 'assets', 'images', 'nexa.png')
let   thumbBuffer = null
try {
    if (fs.existsSync(THUMB_PATH)) thumbBuffer = fs.readFileSync(THUMB_PATH)
} catch (_) {}
// ─── Plugin config ─────────────────────────────────────────────────────────────
const pluginConfig = {
    name:        'brathd',
    alias:       ['brathdsticker', 'brathds'],
    category:    'sticker',
    description: 'Membuat sticker brat HD',
    usage:       '.brathd <text>',
    example:     '.brathd hello world',
    isOwner:     false,
    isPremium:   false,
    isGroup:     false,
    isPrivate:   false,
    cooldown:    10,
    energi:      1,
    isEnabled:   true
}
// ─── Handler ───────────────────────────────────────────────────────────────────
async function handler(m, { sock }) {
    const text = m.args.join(' ')
    if (!text) {
        return m.reply(
            `⎋ *ʙʀᴀᴛ ʜᴅ sᴛɪᴄᴋᴇʀ*\n\n> Masukkan teks\n\n\`Contoh: ${m.prefix}brathd hello world\``
        )
    }
    m.react('🖼️')
    // Kirim pesan loading dulu (standalone, tidak reply ke command)
    await sock.sendMessage(m.chat, {
        text: '⎋ *ʙʀᴀᴛ ʜᴅ sᴛɪᴄᴋᴇʀ*\n\n> ʙᴇɴᴛᴀʀ ʏᴀ ʟᴀɢɪ ᴀᴋᴜ ʙᴜᴀᴛɪɴ ɴɪᴄʜ'
    })
    try {
        const url = `https://api.nexadev.my.id/api/canvas/brathd?text=${encodeURIComponent(text)}`
        const response     = await axios.get(url, { responseType: 'arraybuffer' })
        const stickerBuffer = Buffer.from(response.data)

        await sock.sendMessage(m.chat, {
            sticker:       stickerBuffer,
            stickerName:   'Nexa Bot',
            stickerAuthor: m.pushName || 'User'
        }, { quoted: m })
        m.react('✅')
    } catch (error) {
        m.react('❌')
        m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}
module.exports = { config: pluginConfig, handler }