const axios = require('axios')
const { exec } = require('child_process')
const fs   = require('fs')
const path = require('path')

// ─── Sticker EXIF helpers (sama seperti brat/brathd/sticker/wm) ────────────────
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

// Kalau file belum punya chunk VP8X, ambil lebar/tinggi asli langsung dari bitstream VP8/VP8L
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
    name: 'bratvid',
    alias: ['bratgif', 'bratvideo'],
    category: 'sticker',
    description: 'Membuat sticker brat animated (dengan metadata EXIF custom)',
    usage: '.bratvid <text> | <packname> | <author>',
    example: '.bratvid Hai semua | Nexa Bot | nexadev',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 15,
    energi: 1,
    isEnabled: true
}

// ─── Handler ───────────────────────────────────────────────────────────────────
async function handler(m, { sock }) {
    const raw = m.args.join(' ')
    if (!raw) {
        return m.reply(
            `⎋ ʙʀᴀᴛ ᴀɴɪᴍᴀᴛᴇᴅ\n\n> Masukkan teks\n\n` +
            `\`Contoh: ${m.prefix}bratvid Hai semua\`\n` +
            `> Bisa juga set packname/author:\n` +
            `\`${m.prefix}bratvid Hai semua | Nexa Bot | nexadev\``
        )
    }

    // Format: <text> | <packname> | <author>
    const parts    = raw.split('|').map(s => s.trim())
    const text     = parts[0]
    const packname = parts[1] || 'Nexa Bot'
    const author   = parts[2] || m.pushName || 'User'

    m.react('🎬')

    let inputFile, outputFile
    try {
        const url = `https://api.nexray.eu.cc/maker/bratvid?text=${encodeURIComponent(text)}`
        const response   = await axios.get(url, { responseType: 'arraybuffer' })
        const videoBuffer = Buffer.from(response.data)

        // ── Convert video → animated WEBP 512×512 pakai ffmpeg ─────────────
        const tmpDir = path.join(process.cwd(), 'tmp')
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

        const ts = Date.now()
        inputFile  = path.join(tmpDir, `bratvid_in_${ts}.mp4`)
        outputFile = path.join(tmpDir, `bratvid_out_${ts}.webp`)
        fs.writeFileSync(inputFile, videoBuffer)

        const ffmpegCmd = `ffmpeg -y -i "${inputFile}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0,fps=15" -t 5 -loop 0 -preset default -an -vsync 0 "${outputFile}"`

        await new Promise((resolve, reject) => {
            exec(ffmpegCmd, { timeout: 30000 }, (err) => {
                if (err) reject(err)
                else resolve()
            })
        })

        const rawStickerBuffer = fs.readFileSync(outputFile)

        // ─── Tambahkan metadata EXIF ala smeta/brat/brathd/sticker ─────────
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
    } finally {
        // Cleanup
        ;[inputFile, outputFile].forEach(f => { if (f) { try { fs.unlinkSync(f) } catch {} } })
    }
}

module.exports = { config: pluginConfig, handler }
