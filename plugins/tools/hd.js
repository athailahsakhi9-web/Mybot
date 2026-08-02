const axios = require('axios')
const FormData = require('form-data')

const pluginConfig = {
    name: 'remini',
    alias: ['hd', 'enhance', 'upscale'],
    category: 'tools',
    description: 'Enhance/upscale gambar menjadi HD',
    usage: '.remini (reply/caption gambar)',
    example: '.remini',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 15,
    energi: 1,
    isEnabled: true
}

const UPLOAD_KEY    = 'AIzaBj7z2z3xBjsk'
const UPLOAD_DOMAIN = 'https://c.termai.cc'

// ── Deteksi mime type tanpa file-type ────────────────────────
function detectMime(buffer) {
    // Cek magic bytes
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) return { mime: 'image/jpeg', ext: 'jpg' }
    if (buffer[0] === 0x89 && buffer[1] === 0x50) return { mime: 'image/png',  ext: 'png' }
    if (buffer[0] === 0x47 && buffer[1] === 0x49) return { mime: 'image/gif',  ext: 'gif' }
    if (buffer[0] === 0x52 && buffer[4] === 0x57) return { mime: 'image/webp', ext: 'webp' }
    return { mime: 'image/jpeg', ext: 'jpg' } // fallback
}

// ── Upload buffer ke c.termai.cc ──────────────────────────────
async function uploadImage(buffer) {
    const { mime, ext } = detectMime(buffer)

    const form = new FormData()
    form.append('file', buffer, {
        filename: `image.${ext}`,
        contentType: mime,
        knownLength: buffer.length,
    })

    const res = await axios.post(
        `${UPLOAD_DOMAIN}/api/upload?key=${UPLOAD_KEY}`,
        form,
        {
            headers: { ...form.getHeaders() },
            timeout: 60000,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        }
    )

    const url = res.data?.path
    if (!url) throw new Error('Upload gagal: tidak ada path di response')

    return url.startsWith('http') ? url : UPLOAD_DOMAIN + url
}

// ── Enhance via api-faa.my.id ─────────────────────────────────
async function enhanceHD(imageUrl) {
    const res = await axios.get(
        `https://api-faa.my.id/faa/hdv4?image=${encodeURIComponent(imageUrl)}`,
        { timeout: 120000 }
    )

    const resultUrl = res.data?.result?.image_upscaled
    if (!resultUrl) throw new Error('API tidak mengembalikan hasil')

    return resultUrl
}

async function handler(m, { sock }) {
    const fromQuoted = m.quoted?.isImage
    const fromDirect = m.isImage

    if (!fromQuoted && !fromDirect) {
        return m.reply(
            `✨ *ʀᴇᴍɪɴɪ ᴇɴʜᴀɴᴄᴇ*\n\n` +
            `> Kirim/reply gambar untuk di-enhance menjadi HD\n\n` +
            `\`${m.prefix}remini\``
        )
    }

    await m.react('⏳')

    try {
        // 1. Download
        const buffer = fromQuoted
            ? await m.quoted.download()
            : await m.download()

        if (!buffer?.length) {
            await m.react('❌')
            return m.reply(`❌ Gagal mendownload gambar`)
        }

        // 2. Upload
        let imageUrl
        try {
            imageUrl = await uploadImage(buffer)
        } catch (e) {
            await m.react('❌')
            return m.reply(`❌ Gagal upload gambar\n\n> ${e.message}`)
        }

        // 3. Enhance
        let resultUrl
        try {
            resultUrl = await enhanceHD(imageUrl)
        } catch (e) {
            await m.react('❌')
            return m.reply(`❌ Gagal enhance gambar\n\n> ${e.message}`)
        }

        // 4. Kirim hasil
        await m.react('✅')
        await sock.sendMessage(m.chat, {
            image: { url: resultUrl },
            caption: `✨ *ʀᴇᴍɪɴɪ ᴇɴʜᴀɴᴄᴇ*\n\n> Gambar berhasil di-enhance ke HD!`,
        }, { quoted: m })

    } catch (error) {
        await m.react('❌')
        await m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}

module.exports = { config: pluginConfig, handler }
