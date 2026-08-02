const { downloadContentFromMessage } = require('nexa')

function buildStickerExif(metadata) {
    const json = Buffer.from(JSON.stringify(metadata), 'utf-8')
    const exif = Buffer.concat([
        Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00]),
        Buffer.alloc(4),
        Buffer.from([0x16, 0x00, 0x00, 0x00]),
        json,
    ])
    exif.writeUInt32LE(json.length, 14)
    return exif
}

function makeChunk(type, data) {
    const typeBuffer = Buffer.from(type)
    const sizeBuffer = Buffer.alloc(4)
    sizeBuffer.writeUInt32LE(data.length, 0)
    const padding = data.length % 2 === 1 ? Buffer.from([0x00]) : Buffer.alloc(0)
    return Buffer.concat([typeBuffer, sizeBuffer, data, padding])
}

function setWebpExif(webpBuffer, metadata) {
    if (webpBuffer.slice(0, 4).toString() !== 'RIFF' || webpBuffer.slice(8, 12).toString() !== 'WEBP') {
        throw new Error('File bukan WEBP valid.')
    }
    const chunks = []
    let offset = 12
    while (offset + 8 <= webpBuffer.length) {
        const type = webpBuffer.slice(offset, offset + 4).toString()
        const size = webpBuffer.readUInt32LE(offset + 4)
        const chunkStart = offset
        const chunkEnd = offset + 8 + size + (size % 2)
        if (chunkEnd > webpBuffer.length) break
        if (type !== 'EXIF') chunks.push(webpBuffer.slice(chunkStart, chunkEnd))
        offset = chunkEnd
    }
    const exifPayload = buildStickerExif(metadata)
    const exifChunk = makeChunk('EXIF', exifPayload)
    const body = Buffer.concat([...chunks, exifChunk])
    const header = Buffer.alloc(12)
    header.write('RIFF', 0)
    header.writeUInt32LE(body.length + 4, 4)
    header.write('WEBP', 8)
    return Buffer.concat([header, body])
}

const pluginConfig = {
    name: 'smeta',
    alias: ['stickerexif', 'addexif'],
    category: 'sticker',
    description: 'Tambahkan metadata & label AI ke sticker (bisa disimpan ke favorit)',
    usage: '.smeta <packname> | <author> (reply sticker)',
    example: '.smeta Nexa Bot | nexadev',
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
            `🎭 *sᴍᴇᴛᴀ*\n\n` +
            `> Reply sticker dengan caption:\n` +
            `\`${m.prefix}smeta packname | author\`\n\n` +
            `Contoh:\n\`${m.prefix}smeta Nexa Bot | nexadev\``
        )
    }

    const parts = m.text?.split('|').map(s => s.trim())
    const packname = parts?.[0] || 'Nexa Bot'
    const author   = parts?.[1] || 'nexadev'

    await m.react('⌛')
    await m.reply('⎋ ᴛᴜɴɢɢᴜ ʏᴀ ʟᴀɢɪ ᴀᴋᴜ ʙᴜᴀᴛɪɴ...')

    try {
        // Download pakai downloadContentFromMessage (bukan m.quoted.download)
        // supaya sticker bisa disimpan ke favorit setelah di-exif
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

        const metadata = {
            'sticker-pack-id': 'NexaBot',
            'sticker-pack-name': packname,
            'sticker-pack-publisher': author,
            'emojis': ['⭐'],
            'is-avatar-sticker': 0,
            'is-ai-sticker': 1,   // ← label AI ✨
        }

        const finalBuffer = setWebpExif(stickerBuffer, metadata)

        await sock.sendMessage(m.chat, { sticker: finalBuffer }, { quoted: m })
        await m.react('✅')
    } catch (error) {
        await m.react('❌')
        await m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}

module.exports = { config: pluginConfig, handler }