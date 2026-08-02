const axios = require('axios')
const FormData = require('form-data')

const pluginConfig = {
    name: 'rvbg',
    alias: ['removebg', 'rmbg'],
    category: 'tools',
    description: 'Hapus background gambar',
    usage: '.rvbg (reply/caption gambar)',
    example: '.rvbg',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    isEnabled: true
}

const UPLOAD_URL = 'https://clooud.my.id/uploder/'
const RMBG_URL   = 'https://api.nexadev.my.id/tools/remove/?url='

async function uploadImage(buffer) {
    const form = new FormData()
    form.append('files[]', buffer, {
        filename: 'image.jpg',
        contentType: 'image/jpeg',
    })

    const res = await axios.post(UPLOAD_URL, form, {
        headers: form.getHeaders(),
        timeout: 30000,
    })

    const url = res.data?.files?.[0]?.url
    if (!url) throw new Error('Upload gagal: tidak ada URL di response')
    return url
}

async function handler(m, { sock }) {
    const fromQuoted = m.quoted?.isImage
    const fromDirect = m.isImage

    if (!fromQuoted && !fromDirect) {
        return m.reply(
            `🖼️ *ʀᴇᴍᴏᴠᴇ ʙɢ*\n\n` +
            `> Kirim/reply gambar untuk dihapus backgroundnya\n\n` +
            `\`${m.prefix}rvbg\``
        )
    }

    await m.react('⌛')

    try {
        // 1. Download
        const buffer = fromQuoted
            ? await m.quoted.download()
            : await m.download()

        if (!buffer?.length) {
            await m.react('❌')
            return m.reply('❌ Gagal mendownload gambar')
        }

        // 2. Upload
        let imageUrl
        try {
            imageUrl = await uploadImage(buffer)
        } catch (e) {
            await m.react('❌')
            return m.reply(`❌ Gagal upload gambar\n\n> ${e.message}`)
        }

        // 3. Remove background
        const rmbgRes = await axios.get(`${RMBG_URL}${encodeURIComponent(imageUrl)}`, {
            responseType: 'arraybuffer',
            timeout: 60000,
        })

        const resultBuffer = Buffer.from(rmbgRes.data)
        if (!resultBuffer?.length) {
            await m.react('❌')
            return m.reply('❌ Gagal remove background')
        }

        // 4. Kirim hasil
        await m.react('✅')
        await sock.sendMessage(m.chat, {
            image: resultBuffer,
            caption: `🖼️ *ʀᴇᴍᴏᴠᴇ ʙɢ*\n\n> Background berhasil dihapus!`,
            mimetype: 'image/png',
        }, { quoted: m })

    } catch (error) {
        await m.react('❌')
        await m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}

module.exports = { config: pluginConfig, handler }
