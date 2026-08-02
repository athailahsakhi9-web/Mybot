const axios = require('axios')
const FormData = require('form-data')

const pluginConfig = {
    name: 'toblonde',
    alias: ['blonde', 'pirang'],
    category: 'ai',
    description: 'Ubah foto jadi rambut pirang',
    usage: '.toblonde (reply/caption foto)',
    example: '.toblonde',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

const UPLOAD_URL  = 'https://clooud.my.id/uploder/'
const TOBLONDE_URL = 'https://api-faa.my.id/faa/toblonde?url='

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
            `👱‍♂️ ᴛᴏ ʙʟᴏɴᴅᴇ\n\n` +
            `> Kirim/reply foto yang mau diubah jadi rambut pirang\n\n` +
            `\`${m.prefix}toblonde\``
        )
    }

    await m.react('⌛')

    try {
        const buffer = fromQuoted
            ? await m.quoted.download()
            : await m.download()

        if (!buffer?.length) {
            await m.react('❌')
            return m.reply('ᴀᴅᴜʜ ᴍᴀᴀꜰ ᴛᴜᴀɴ ᴋᴀʏᴀᴋ ɴʏᴀ ᴀᴘɪ ɴʏᴀ ᴇʀʀᴏʀ ᴅᴇʜ 😔')
        }

        let imageUrl
        try {
            imageUrl = await uploadImage(buffer)
        } catch (e) {
            await m.react('❌')
            return m.reply('ᴀᴅᴜʜ ᴍᴀᴀꜰ ᴛᴜᴀɴ ᴋᴀʏᴀᴋ ɴʏᴀ ᴀᴘɪ ɴʏᴀ ᴇʀʀᴏʀ ᴅᴇʜ 😔')
        }

        const res = await axios.get(`${TOBLONDE_URL}${encodeURIComponent(imageUrl)}`, {
            responseType: 'arraybuffer',
            timeout: 60000,
        })

        const resultBuffer = Buffer.from(res.data)

        if (!resultBuffer?.length) {
            await m.react('❌')
            return m.reply('ᴀᴅᴜʜ ᴍᴀᴀꜰ ᴛᴜᴀɴ ᴋᴀʏᴀᴋ ɴʏᴀ ᴀᴘɪ ɴʏᴀ ᴇʀʀᴏʀ ᴅᴇʜ 😔')
        }

        await sock.sendMessage(m.chat, {
            image: resultBuffer,
            caption: 'ɪɴɪ ᴛᴜᴀɴ ᴀᴋᴜ ᴜᴅᴀʜ ᴍᴇᴍʙᴜᴀᴛ ꜰᴏᴛᴏ ᴍᴇɴᴊᴀᴅɪ ᴘɪʀᴀɴɢ 👱‍♂️✨'
        }, { quoted: m })

        await m.react('✅')

    } catch (error) {
        await m.react('❌')
        await m.reply('ᴀᴅᴜʜ ᴍᴀᴀꜰ ᴛᴜᴀɴ ᴋᴀʏᴀᴋ ɴʏᴀ ᴀᴘɪ ɴʏᴀ ᴇʀʀᴏʀ ᴅᴇʜ 😔')
    }
}

module.exports = { config: pluginConfig, handler }
