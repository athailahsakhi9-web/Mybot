const fs = require('fs')
const path = require('path')

// Thumbnail dari lokal
const THUMB_PATH = path.join(process.cwd(), 'assets', 'images', 'nexa.png')
let thumbBuffer = null
try {
    if (fs.existsSync(THUMB_PATH)) thumbBuffer = fs.readFileSync(THUMB_PATH)
} catch (_) {}

const contextInfo = {
    externalAdReply: {
        title: 'ɴᴇxᴀ ᴍᴅ',
        body: 'ⓘ Nexa Bot',
        sourceUrl: 'https://api.nexadev.my.id',
        mediaType: 1,
        renderLargerThumbnail: false,
        ...(thumbBuffer ? { thumbnail: thumbBuffer } : {}),
    },
}

const pluginConfig = {
    name: 'fakeffduo',
    alias: ['fakefreefireduo'],
    category: 'canvas',
    description: 'Membuat gambar fake duo Free Fire',
    usage: '.fakeffduo <nama1>|<nama2>',
    example: '.fakeffduo Nexa|Cantik',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const parts = m.text?.split('|').map(s => s.trim())

    if (!parts || parts.length < 2 || !parts[0] || !parts[1]) {
        return m.reply(
            `🎮 *ꜰᴀᴋᴇ ᴅᴜᴏ ꜰꜰ*\n\n` +
            `> Masukkan 2 nama dipisah \`|\`\n\n` +
            `\`Contoh: ${m.prefix}fakeffduo Nexa|Cantik\``,
            { contextInfo }
        )
    }

    const [nama1, nama2] = parts

    await m.react('🎮')
    await m.reply('⏳ Tunggu ya, lagi di buatin...', { contextInfo })

    try {
        await sock.sendMessage(m.chat, {
            image: { url: `https://api.ourin.my.id/api/fake-ff-duo-2?name1=${encodeURIComponent(nama1)}&name2=${encodeURIComponent(nama2)}&bg=random` },
            caption: `🎮 *ꜰᴀᴋᴇ ᴅᴜᴏ ꜰꜰ*\n\n> Nama: \`${nama1}\` & \`${nama2}\``
        }, { quoted: m })

        await m.react('✅')
    } catch (error) {
        await m.react('❌')
        await m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`, { contextInfo })
    }
}

module.exports = { config: pluginConfig, handler }