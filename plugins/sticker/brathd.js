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

// ─── Sticker EXIF helpers (sama seperti brat/smeta) ────────────────────────────
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

// brathd tidak melewati sharp/resize, jadi ukuran gambar tidak diketahui di depan.
// Kalau file belum punya chunk VP8X, ambil lebar/tinggi asli langsung dari bitstream VP8/VP8L.
function readDimensionsFromBitstream(chunks) {
    for (const c of chunks) {
        const type    = c.slice(0, 4).toString()
        const payload = c.slice(8)
        if (type === 'VP8L' && payload[0] === 0x2f) {
            const bits = payload.readUInt32LE(1)
            return {
                width:  (bits & 0x3FFF) + 1,
                height: ((bits >> 14) & 0x3FFF) + 1
            }
        }
        if (type === 'VP8 ') {
            const widthWord  = payload.readUInt16LE(6)
            const heightWord = payload.readUInt16LE(8)
            return {
                width:  widthWord & 0x3FFF,
                height: heightWord & 0x3FFF
            }
        }
    }
    return null
}

function setWebpExif(webpBuffer, metadata) {
    if (webpBuffer.slice(0, 4).toString() !== 'RIFF' || webpBuffer.slice(8, 12).toString() !== 'WEBP') {
        throw new Error('File bukan WEBP valid.')
    }

    const chunks = []
    let offset    = 12
    let vp8xFlags = 0
    let width     = 0
    let height    = 0
    let hasAlpha  = false
    let hasAnim   = false

    while (offset + 8 <= webpBuffer.length) {
        const type = webpBuffer.slice(offset, offset + 4).toString()
        const size = webpBuffer.readUInt32LE(offset + 4)
        const chunkStart = offset
        const chunkEnd   = offset + 8 + size + (size % 2)
        if (chunkEnd > webpBuffer.length) break

        if (type === 'VP8X') {
            // Jangan disalin mentah, akan dibangun ulang di bawah biar flags-nya benar
            const payload = webpBuffer.slice(chunkStart + 8, chunkStart + 8 + size)
            vp8xFlags = payload[0]
            width  = 1 + (payload[4] | (payload[5] << 8) | (payload[6] << 16))
            height = 1 + (payload[7] | (payload[8] << 8) | (payload[9] << 16))
        } else if (type === 'EXIF') {
            // dibuang, nanti diganti yang baru
        } else {
            if (type === 'ALPH') hasAlpha = true
            if (type === 'ANIM' || type === 'ANMF') hasAnim = true
            chunks.push(webpBuffer.slice(chunkStart, chunkEnd))
        }
        offset = chunkEnd
    }

    // Kalau belum ada VP8X sama sekali, ambil ukuran asli dari bitstream VP8/VP8L
    if (!width || !height) {
        const dim = readDimensionsFromBitstream(chunks)
        width  = dim?.width  || 512
        height = dim?.height || 512
    }

    // Susun ulang flags VP8X: pertahankan yang lama + WAJIB nyalain bit Exif (0x08)
    let flags = vp8xFlags | 0x08
    if (hasAlpha) flags |= 0x10   // bit Alpha
    if (hasAnim)  flags |= 0x02   // bit Animation

    const vp8xPayload = Buffer.alloc(10)
    vp8xPayload[0] = flags
    vp8xPayload.writeUIntLE(width - 1, 4, 3)
    vp8xPayload.writeUIntLE(height - 1, 7, 3)
    const vp8xChunk = makeChunk('VP8X', vp8xPayload)

    const exifPayload = buildStickerExif(metadata)
    const exifChunk = makeChunk('EXIF', exifPayload)

    const body = Buffer.concat([vp8xChunk, ...chunks, exifChunk])
    const header = Buffer.alloc(12)
    header.write('RIFF', 0)
    header.writeUInt32LE(body.length + 4, 4)
    header.write('WEBP', 8)
    return Buffer.concat([header, body])
}

// ─── Plugin config ─────────────────────────────────────────────────────────────
const pluginConfig = {
    name:        'brathd',
    alias:       ['brathdsticker', 'brathds'],
    category:    'sticker',
    description: 'Membuat sticker brat HD (dengan metadata EXIF custom)',
    usage:       '.brathd <text> | <packname> | <author>',
    example:     '.brathd hello world | Nexa Bot | nexadev',
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
    const raw = m.args.join(' ')
    if (!raw) {
        return m.reply(
            `⎋ *ʙʀᴀᴛ ʜᴅ sᴛɪᴄᴋᴇʀ*\n\n> Masukkan teks\n\n` +
            `\`Contoh: ${m.prefix}brathd hello world\`\n` +
            `> Bisa juga set packname/author:\n` +
            `\`${m.prefix}brathd hello world | Nexa Bot | nexadev\``
        )
    }

    // Format: <text> | <packname> | <author>
    const parts    = raw.split('|').map(s => s.trim())
    const text     = parts[0]
    const packname = parts[1] || 'Nexa Bot'
    const author   = parts[2] || m.pushName || 'User'

    m.react('🖼️')
    // Kirim pesan loading dulu (standalone, tidak reply ke command)
    await sock.sendMessage(m.chat, {
        text: '⎋ *ʙʀᴀᴛ ʜᴅ sᴛɪᴄᴋᴇʀ*\n\n> ʙᴇɴᴛᴀʀ ʏᴀ ʟᴀɢɪ ᴀᴋᴜ ʙᴜᴀᴛɪɴ ɴɪᴄʜ'
    })

    try {
        const url = `https://api.nexray.eu.cc/maker/brathd?text=${encodeURIComponent(text)}`
        const response    = await axios.get(url, { responseType: 'arraybuffer', timeout: 35000 })
        const imageBuffer = Buffer.from(response.data)

        // API ini balikin image binary (PNG/JPG) bukan WEBP langsung,
        // jadi harus dikonversi dulu ke WEBP 512×512 sebelum bisa jadi stiker.
        const rawStickerBuffer = await sharp(imageBuffer)
            .resize(512, 512, {
                fit:        'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp({ quality: 90 })
            .toBuffer()

        // ─── Tambahkan metadata EXIF ala smeta/brat ────────────────────────
        const metadata = {
            'sticker-pack-id':        'NexaBot',
            'sticker-pack-name':      packname,
            'sticker-pack-publisher': author,
            'emojis':                 ['⭐'],
            'is-avatar-sticker':      0,
            'is-ai-sticker':          1,   // ← label AI ✨
        }
        const finalBuffer = setWebpExif(rawStickerBuffer, metadata)

        await sock.sendMessage(m.chat, { sticker: finalBuffer }, { quoted: m })
        m.react('✅')
    } catch (error) {
        m.react('❌')
        m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}

module.exports = { config: pluginConfig, handler }
