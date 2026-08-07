const axios    = require('axios')
const sharp    = require('sharp')
const FormData = require('form-data')

// ─── Sticker EXIF helpers (sama seperti brat/brathd/sticker/wm/bratvid) ────────
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

    if (!width || !height) {
        const dim = readDimensionsFromBitstream(chunks)
        width  = dim?.width  || 512
        height = dim?.height || 512
    }

    let flags = vp8xFlags | 0x08   // 0x08 = bit Exif, WAJIB nyala
    if (hasAlpha) flags |= 0x10    // bit Alpha
    if (hasAnim)  flags |= 0x02    // bit Animation

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

const pluginConfig = {
    name: 'smeme',
    alias: ['stickermeme', 'smaker', 'memesticker'],
    category: 'sticker',
    description: 'Buat sticker meme dengan teks atas & bawah',
    usage: '.smeme <teks atas> | <teks bawah> (reply/kirim gambar)',
    example: '.smeme hallo | jal',
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

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

const UPLOAD_URL = 'https://clooud.my.id/uploder/'

// Uploader khusus Clooud.my.id
async function uploadImage(buffer) {
    const form = new FormData()
    form.append('files[]', buffer, {
        filename: 'smeme_bg.jpg',
        contentType: 'image/jpeg',
    })

    const res = await axios.post(UPLOAD_URL, form, {
        headers: form.getHeaders(),
        timeout: 30000,
    })

    const url = res.data?.files?.[0]?.url
    if (!url) throw new Error('Gagal mengunggah gambar ke uploader!')
    return url
}

async function handler(m, { sock, text, args }) {
    // 1. Validasi Input Media Gambar
    const fromQuoted = m.quoted?.isImage || m.quoted?.mtype === 'imageMessage'
    const fromDirect = m.isImage || m.mtype === 'imageMessage'

    if (!fromQuoted && !fromDirect) {
        let helpMsg = `🖼️ *${toSmallCaps('sᴍᴇᴍᴇ ᴍᴀᴋᴇʀ')}*\n\n`
        helpMsg += `> ${toSmallCaps('reply atau kirim gambar dengan caption .smeme teks_atas | teks_bawah')}\n\n`
        helpMsg += `*Contoh:* \`${m.prefix || '.'}smeme hallo | jal\``
        return m.reply(helpMsg)
    }

    // 2. Parsing Teks Atas & Teks Bawah
    let rawText = text || (args && args.join(' ')) || ''
    if (!rawText && m.quoted?.text) rawText = m.quoted.text

    let [textAtas, textBawah] = rawText.split('|').map(v => v ? v.trim() : '')

    if (!textAtas && !textBawah) {
        textAtas = ' '
        textBawah = ' '
    } else if (!textBawah && textAtas) {
        textBawah = ' '
    }

    await m.react('⏳')

    try {
        // 3. Download Gambar dari WhatsApp
        const imgBuffer = fromQuoted
            ? await m.quoted.download()
            : await m.download()

        if (!imgBuffer || !imgBuffer.length) {
            throw new Error('Gagal mengunduh gambar dari WhatsApp!')
        }

        // 4. Upload Buffer Gambar ke Clooud Uploader
        const bgUrl = await uploadImage(imgBuffer)

        await m.react('📥')

        // 5. Panggil Endpoint API Smeme
        const apiUrl = `https://api.nexray.eu.cc/maker/smeme?text_atas=${encodeURIComponent(textAtas)}&text_bawah=${encodeURIComponent(textBawah)}&background=${encodeURIComponent(bgUrl)}`

        const res = await axios.get(apiUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        })

        const memeBuffer = Buffer.from(res.data)
        if (!memeBuffer || !memeBuffer.length) {
            throw new Error('Buffer gambar dari API kosong!')
        }

        // 6. Konversi hasil meme (JPEG/PNG) → WEBP 512×512 buat sticker
        const rawStickerBuffer = await sharp(memeBuffer)
            .resize(512, 512, {
                fit:        'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp({ quality: 90 })
            .toBuffer()

        // 7. Tambahkan metadata EXIF ala brat/brathd, lalu kirim sebagai sticker
        const metadata = {
            'sticker-pack-id':        'NexaBot',
            'sticker-pack-name':      'Nexa Bot',
            'sticker-pack-publisher': m.pushName || 'User',
            'emojis':                 ['⭐'],
            'is-avatar-sticker':      0,
            'is-ai-sticker':          1,   // ← label AI ✨
        }
        const finalBuffer = setWebpExif(rawStickerBuffer, metadata)

        await sock.sendMessage(m.chat, { sticker: finalBuffer }, { quoted: m })

        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        const errMsg = err.message.includes('timeout')
            ? 'Koneksi ke server API lambat/timeout. Silakan coba lagi.'
            : err.message
        return m.reply(toSmallCaps(`❌ Gagal membuat Smeme: ${errMsg}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
