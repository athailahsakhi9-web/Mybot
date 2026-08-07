const { downloadContentFromMessage } = require('nexa')
const webpmux = require('node-webpmux')

// ─── Tulis EXIF pakai node-webpmux ──────────────────────────────────────────────
// Kenapa ganti dari manual buffer-editing: cara lama nyusun ulang chunk VP8X/EXIF
// byte-per-byte, dan gampang meleset kalau sticker sumbernya punya struktur WEBP
// yang agak beda (ICC profile, urutan chunk nggak standar, dll) — makanya kadang
// pack-name/author-nya nggak kebaca. node-webpmux parse & nulis ulang container
// WEBP secara benar sesuai spec, jadi lebih reliable buat kasus sticker "asing".
async function setWebpExif(webpBuffer, metadata) {
    const img = new webpmux.Image()
    await img.load(webpBuffer)

    const exifHeader = Buffer.from([
        0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ])
    const json = Buffer.from(JSON.stringify(metadata), 'utf-8')
    const exif = Buffer.concat([exifHeader, json])
    exif.writeUIntLE(json.length, 14, 4)

    img.exif = exif
    return await img.save(null) // null path → return Buffer, tidak nulis ke disk
}

const pluginConfig = {
    name: 'wm',
    alias: ['watermark'],
    category: 'sticker',
    description: 'Set packname & author sticker',
    usage: '.wm [nama] (reply sticker)',
    example: '.wm Nexa',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    if (!m.quoted || !m.quoted.isSticker) {
        return m.reply(
            `🖊️ *ᴡᴍ*\n\n` +
            `> Reply sticker dengan caption:\n` +
            `\`${m.prefix}wm nama\`\n\n` +
            `Contoh:\n\`${m.prefix}wm Nexa\``
        )
    }

    const packname  = m.text?.trim() || m.pushName || m.sender?.split('@')[0] || 'Nexa Bot'
    const publisher = 'Nexa Bot'

    await m.react('⌛')
    await m.reply('⎋ ᴛᴜɴɢɢᴜ ʏᴀ ʟᴀɢɪ ᴀᴋᴜ ʙᴜᴀᴛɪɴ...')

    try {
        const stickerMsg = m.quoted.message?.stickerMessage
            || m.quoted.mediaMessage?.stickerMessage
        if (!stickerMsg) {
            await m.react('❌')
            return m.reply('❌ Gagal membaca data sticker.')
        }

        const stream = await downloadContentFromMessage(stickerMsg, 'sticker')
        const chunks = []
        for await (const chunk of stream) chunks.push(chunk)
        const stickerBuffer = Buffer.concat(chunks)

        if (!stickerBuffer?.length) {
            await m.react('❌')
            return m.reply('❌ Gagal mendownload sticker.')
        }

        const finalBuffer = await setWebpExif(stickerBuffer, {
            'sticker-pack-id':        'NexaBot',
            'sticker-pack-name':      packname,
            'sticker-pack-publisher': publisher,
            'emojis':                 ['⭐'],
            'is-avatar-sticker':      0,
            'is-ai-sticker':          0,
        })

        await sock.sendMessage(m.chat, { sticker: finalBuffer }, { quoted: m })
        await m.react('✅')
    } catch (error) {
        await m.react('❌')
        await m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}

module.exports = { config: pluginConfig, handler }