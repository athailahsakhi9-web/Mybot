const axios = require('axios')
const FormData = require('form-data')

const pluginConfig = {
    name: 'tosad',
    alias: ['sad', 'sedih', 'galau', 'cry'],
    category: 'ai',
    description: 'Ubah foto kamu menjadi ekspresi sedih atau galau lewat AI',
    usage: '.tosad (reply/caption foto)',
    example: '.tosad',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

const UPLOAD_URL  = 'https://clooud.my.id/uploder/'
const TOSAD_URL = 'https://api-faa.my.id/faa/tosad?url='

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
            `😢 *ᴛᴏ sᴀᴅ* 😢\n\n` +
            `> Tuan lagi sedih ya? Mau liat foto Tuan versi galau maksimal?\n` +
            `> Kirim atau reply fotonya ke sini, biar aku temenin galau.. 🥺\n\n` +
            `\`${m.prefix}tosad\``
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

        const res = await axios.get(`${TOSAD_URL}${encodeURIComponent(imageUrl)}`, {
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
            caption: '😭 *ʜᴜᴡᴀᴀᴀ~* 😭\n\nᴄʟɪɴɢɢɢ~ ɪɴɪ ꜰᴏᴛᴏ ᴛᴜᴀɴ ᴠᴇʀsɪ sᴀᴅ ʙᴏʏ / sᴀᴅ ɢɪʀʟ.. ᴄᴜᴘ ᴄᴜᴘ ᴄᴜᴘ, ᴊᴀɴɢᴀɴ sᴇᴅɪʜ ʟᴀɢɪ ʏᴀ ᴛᴜᴀɴ, ᴋᴀɴ ᴀᴅᴀ ᴀᴋᴜ ʏᴀɴɢ sᴇʟᴀʟᴜ sᴇᴛɪᴀ ᴅɪ sɪɴɪ ʙᴜᴀᴛ ᴛᴜᴀɴ~ 🥺💔'
        }, { quoted: m })

        await m.react('🥺')

    } catch (error) {
        await m.react('❌')
        await m.reply('ᴀᴅᴜʜ ᴍᴀᴀꜰ ᴛᴜᴀɴ ᴋᴀʏᴀᴋ ɴʏᴀ ᴀᴘɪ ɴʏᴀ ᴇʀʀᴏʀ ᴅᴇʜ 😔')
    }
}

module.exports = { config: pluginConfig, handler }