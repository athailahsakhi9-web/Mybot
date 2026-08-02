const axios = require('axios')
const sharp = require('sharp')
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
    name:        'brat',
    alias:       ['brattext'],
    category:    'sticker',
    description: 'Membuat sticker brat',
    usage:       '.brat <text>',
    example:     '.brat Hai semua',
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
            `⎋ *ʙʀᴀᴛ sᴛɪᴄᴋᴇʀ*\n\n> Masukkan teks\n\n\`Contoh: ${m.prefix}brat Hai semua\``
        )
    }
    m.react('🖼️')
    // Kirim pesan loading dulu (standalone, tidak reply ke command)
    await sock.sendMessage(m.chat, {
        text: '⎋ ʙʀᴀᴛ sᴛɪᴄᴋᴇʀ\n\n> ʙᴇɴᴛᴀʀ ʏᴀ ʟᴀɢɪ ᴀᴋᴜ ʙᴜᴀᴛɪɴ ɴɪᴄʜ'
    })
    try {
        const url = `https://api.nexadev.my.id/api/canvas/brat?text=${encodeURIComponent(text)}`
        const response    = await axios.get(url, { responseType: 'arraybuffer' })
        const imageBuffer = Buffer.from(response.data)
        // Convert to WebP 512×512 sticker format
        const stickerBuffer = await sharp(imageBuffer)
            .resize(512, 512, {
                fit:        'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp({ quality: 80 })
            .toBuffer()
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