const axios = require('axios')
const FormData = require('form-data')

const pluginConfig = {
    name: 'tohitam',
    alias: ['blackify', 'hitamin'],
    category: 'ai',
    description: 'Ubah foto jadi hitam putih/hitam',
    usage: '.tohitam (reply/caption foto)',
    example: '.tohitam',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

const UPLOAD_URL  = 'https://clooud.my.id/uploder/'
const TOHITAM_URL = 'https://api-faa.my.id/faa/tohitam?url='

async function uploadImage(buffer) {
    const form = new FormData()
    form.append('files[]', buffer, {
        filename: 'image.jpg',
        contentType: 'image/jpeg',
    })

    const res = await axios.post(UPLOAD_URL, form, {
        headers: form.getHeaders(),
        timeout: 60000,
    })

    const data = res.data
    if (!data?.success || !Array.isArray(data?.files) || !data.files.length) {
        throw new Error('Upload gagal: response tidak sesuai format yang diharapkan')
    }

    const url = data.files[0]?.url
    if (!url) throw new Error('Upload gagal: tidak ada URL di response')
    return url
}

async function handler(m, { sock }) {
    const fromQuoted = m.quoted?.isImage
    const fromDirect = m.isImage

    if (!fromQuoted && !fromDirect) {
        return m.reply(
            `🖤 *ᴛᴏ ʜɪᴛᴀᴍ*\n\n` +
            `> Kirim/reply foto yang mau diubah jadi hitam\n\n` +
            `\`${m.prefix}tohitam\``
        )
    }

    await m.react('⌛')

    try {
        // 1. Download foto
        const buffer = fromQuoted
            ? await m.quoted.download()
            : await m.download()

        if (!buffer?.length) {
            await m.react('❌')
            return m.reply('aduh maaf tuan kayak nya api nya error deh 😔')
        }

        // 2. Upload ke clooud biar dapet URL publik
        let imageUrl
        try {
            imageUrl = await uploadImage(buffer)
        } catch (e) {
            await m.react('❌')
            return m.reply('aduh maaf tuan kayak nya api nya error deh 😔')
        }

        // 3. Proses tohitam
        const res = await axios.get(`${TOHITAM_URL}${encodeURIComponent(imageUrl)}`, {
            responseType: 'arraybuffer',
            timeout: 60000,
        })

        const resultBuffer = Buffer.from(res.data)
        if (!resultBuffer?.length) {
            await m.react('❌')
            return m.reply('aduh maaf tuan kayak nya api nya error deh 😔')
        }

        await sock.sendMessage(m.chat, {
            image: resultBuffer,
            caption: 'Ini tuan aku udah membuat Poto nya jadi hitam'
        }, { quoted: m })

        await m.react('✅')
    } catch (error) {
        await m.react('❌')
        await m.reply('aduh maaf tuan kayak nya api nya error deh 😔')
    }
}

module.exports = { config: pluginConfig, handler }