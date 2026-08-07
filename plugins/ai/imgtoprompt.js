const axios = require('axios')
const FormData = require('form-data')

const pluginConfig = {
    name: 'imgtoprompt',
    alias: ['img2prompt', 'imagetoprompt', 'i2p', 'im2p'],
    category: 'ai',
    description: 'Ekstrak prompt/deskripsi detail dari gambar menggunakan AI',
    usage: '.imgtoprompt (reply/caption gambar)',
    example: '.imgtoprompt',
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
const API_URL    = 'https://api.nexadev.my.id/ai/imgtopromt?url='

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
    if (!url) throw new Error('Gagal mengunggah gambar ke uploader!')
    return url
}

async function handler(m, { sock }) {
    const fromQuoted = m.quoted?.isImage || m.quoted?.mtype === 'imageMessage'
    const fromDirect = m.isImage || m.mtype === 'imageMessage'

    if (!fromQuoted && !fromDirect) {
        let helpMsg = `🤖 *${toSmallCaps('ɪᴍᴀɢᴇ ᴛᴏ ᴘʀᴏᴍᴘᴛ')}*\n\n`
        helpMsg += `> ${toSmallCaps('kirim atau reply gambar untuk mengekstrak prompt ai')}\n\n`
        helpMsg += `\`${m.prefix || '.'}imgtoprompt\``
        return m.reply(helpMsg)
    }

    await m.react('⏳')

    try {
        // 1. Download Gambar dari WhatsApp
        const buffer = fromQuoted 
            ? await m.quoted.download() 
            : await m.download()

        if (!buffer || !buffer.length) {
            throw new Error('Gagal mengunduh gambar dari WhatsApp!')
        }

        // 2. Upload Gambar ke Uploader
        const imageUrl = await uploadImage(buffer)

        // 3. Panggil API Image to Prompt NexaDev
        const res = await axios.get(`${API_URL}${encodeURIComponent(imageUrl)}`, {
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        })

        const result = res.data

        if (!result || result.status === false) {
            throw new Error(result?.message || 'Gagal mengekstrak prompt dari gambar!')
        }

        // Deteksi fleksibel output prompt dari API
        const promptText = result.prompt || result.result || result.data || (typeof result === 'string' ? result : null)

        if (!promptText) {
            throw new Error('Data prompt tidak ditemukan dalam respon API!')
        }

        let caption = `🤖 *${toSmallCaps('ɪᴍᴀɢᴇ ᴛᴏ ᴘʀᴏᴍᴘᴛ')}*\n\n`
        caption += `> ${promptText}`

        await m.reply(caption)
        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        const errMsg = err.message.includes('timeout') 
            ? 'Koneksi ke server API lambat/timeout. Silakan coba lagi.' 
            : err.message
        return m.reply(toSmallCaps(`❌ Gagal mengekstrak prompt: ${errMsg}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
