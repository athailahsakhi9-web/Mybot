// ╔══════════════════════════════════════╗
// ║       NEXA BOT - SMEME PLUGIN         ║
// ╚══════════════════════════════════════╝

const axios    = require('axios')
const sharp    = require('sharp')
const FormData = require('form-data')

const pluginConfig = {
    name: 'smeme',
    alias: ['memesticker', 'memes'],
    category: 'sticker',
    description: 'Membuat sticker meme dari gambar',
    usage: '.smeme <top>|<bottom>',
    example: '.smeme Ketika|Kamu Lupa',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

// ── Upload buffer ke image host, return URL atau null ────────
async function uploadImage(buffer) {
    // Host 1 — tmpfiles.org
    try {
        const form = new FormData()
        form.append('file', buffer, { filename: 'meme.png', contentType: 'image/png' })
        const res = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
            headers: form.getHeaders(), timeout: 20000
        })
        if (res.data?.data?.url) {
            return res.data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
        }
    } catch {}

    // Host 2 — telegra.ph
    try {
        const form = new FormData()
        form.append('file', buffer, { filename: 'meme.png', contentType: 'image/png' })
        const res = await axios.post('https://telegra.ph/upload', form, {
            headers: form.getHeaders(), timeout: 20000
        })
        if (res.data?.[0]?.src) return 'https://telegra.ph' + res.data[0].src
    } catch {}

    // Host 3 — catbox.moe
    try {
        const form = new FormData()
        form.append('reqtype', 'fileupload')
        form.append('userhash', '')
        form.append('fileToUpload', buffer, { filename: 'meme.png', contentType: 'image/png' })
        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(), timeout: 20000
        })
        if (res.data && res.data.startsWith('https://')) return res.data.trim()
    } catch {}

    return null
}

// ── Encode teks untuk URL memegen.link ───────────────────────
function encodeText(text) {
    if (!text || !text.trim()) return '_'
    return encodeURIComponent(text.trim())
        .replace(/-/g, '--')
        .replace(/_/g, '__')
        .replace(/%20/g, '_')
}

// ── Konversi hasil meme ke sticker webp ──────────────────────
async function toStickerBuffer(buffer) {
    return sharp(buffer)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 80 })
        .toBuffer()
}

async function handler(m, { sock }) {
    // Cek media — di pesan ini atau quoted
    const hasMedia =
        m.isImage || m.isSticker ||
        (m.quoted && (m.quoted.isImage || m.quoted.isSticker))

    if (!hasMedia) {
        return m.reply(
            `😂 *ᴍᴇᴍᴇ sᴛɪᴄᴋᴇʀ*\n\n` +
            `> Reply atau kirim gambar/sticker dengan caption\n\n` +
            `\`Contoh: ${m.prefix}smeme Ketika|Kamu Lupa\``
        )
    }

    const input = m.text?.trim() || m.args.join(' ').trim()
    if (!input || !input.includes('|')) {
        return m.reply(
            `😂 *ᴍᴇᴍᴇ sᴛɪᴄᴋᴇʀ*\n\n` +
            `> Format salah, gunakan pemisah |\n\n` +
            `\`Contoh: ${m.prefix}smeme Ketika|Kamu Lupa\``
        )
    }

    const [top, ...rest] = input.split('|')
    const bottom = rest.join('|') // support bottom text yang ada | juga

    await m.react('😂')

    try {
        // ── Download media ────────────────────────────────────
        let mediaBuffer
        try {
            if (m.quoted?.isImage || m.quoted?.isSticker) {
                mediaBuffer = await m.quoted.download()
            } else if (m.isImage || m.isSticker) {
                mediaBuffer = await m.download()
            }
        } catch (dlErr) {
            throw new Error('Gagal download media: ' + dlErr.message)
        }

        if (!mediaBuffer || !mediaBuffer.length) {
            await m.react('❌')
            return m.reply(`❌ Gagal mengunduh media, coba lagi`)
        }

        // ── Resize ke PNG untuk upload ────────────────────────
        const pngBuffer = await sharp(mediaBuffer)
            .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .png()
            .toBuffer()

        // ── Upload ke image host ──────────────────────────────
        const imageUrl = await uploadImage(pngBuffer)
        if (!imageUrl) {
            await m.react('❌')
            return m.reply(`❌ Semua image host gagal, coba beberapa menit lagi`)
        }

        // ── Build & fetch meme dari memegen.link ──────────────
        const memeUrl =
            `https://api.memegen.link/images/custom/` +
            `${encodeText(top.trim())}/${encodeText(bottom?.trim() || '_')}.png` +
            `?background=${encodeURIComponent(imageUrl)}&watermark=none`

        const { data: memeData } = await axios.get(memeUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        })

        if (!memeData || !memeData.byteLength) {
            throw new Error('Memegen tidak return data')
        }

        // ── Konversi ke sticker lalu kirim ───────────────────
        const stickerBuffer = await toStickerBuffer(Buffer.from(memeData))

        await sock.sendMessage(m.chat, {
            sticker: stickerBuffer,
            stickerName:   '𝗡𝗘𝗫𝗔 𝗕𝗢𝗧',
            stickerAuthor: m.pushName || 'User'
        }, { quoted: m })

        await m.react('✅')

    } catch (error) {
        await m.react('❌')
        await m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}

module.exports = { config: pluginConfig, handler }
