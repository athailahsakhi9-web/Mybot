const axios = require('axios')
const FormData = require('form-data')

const pluginConfig = {
    name: 'rvbg',
    alias: ['removebg', 'rmbg', 'nobg'],
    category: 'tools',
    description: 'Hapus background gambar secara otomatis',
    usage: '.rvbg (reply/caption gambar)',
    example: '.rvbg',
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
    if (!url) throw new Error('Upload gambar gagal!')
    return url
}

async function handler(m, { sock }) {
    const fromQuoted = m.quoted?.isImage || m.quoted?.mtype === 'imageMessage'
    const fromDirect = m.isImage || m.mtype === 'imageMessage'

    if (!fromQuoted && !fromDirect) {
        let msg = `🖼️ *${toSmallCaps('ʀᴇᴍᴏᴠᴇ ʙᴀᴄᴋɢʀᴏᴜɴᴅ')}*\n\n`
        msg += `> ${toSmallCaps('kirim atau reply gambar untuk menghapus background')}\n\n`
        msg += `\`${m.prefix || '.'}rvbg\``
        return m.reply(msg)
    }

    await m.react('⏳')

    try {
        // 1. Download Buffer Gambar
        const buffer = fromQuoted
            ? await m.quoted.download()
            : await m.download()

        if (!buffer || !buffer.length) {
            await m.react('❌')
            return m.reply(toSmallCaps('❌ Gagal mengunduh media gambar!'))
        }

        // 2. Upload Gambar ke Uploader
        let imageUrl
        try {
            imageUrl = await uploadImage(buffer)
        } catch (e) {
            await m.react('❌')
            return m.reply(toSmallCaps(`❌ Gagal mengunggah gambar: ${e.message}`))
        }

        // 3. Proses Remove Background via API NexaDev
        const rmbgRes = await axios.get(`${RMBG_URL}${encodeURIComponent(imageUrl)}`, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        })

        const resultBuffer = Buffer.from(rmbgRes.data)
        if (!resultBuffer || !resultBuffer.length) {
            await m.react('❌')
            return m.reply(toSmallCaps('❌ Gagal memproses gambar dari server!'))
        }

        // 4. Kirim Hasil
        await sock.sendMessage(m.chat, {
            image: resultBuffer,
            caption: `🖼️ *${toSmallCaps('ʀᴇᴍᴏᴠᴇ ʙᴀᴄᴋɢʀᴏᴜɴᴅ')}*\n\n> ${toSmallCaps('background berhasil dihapus')}`,
            mimetype: 'image/png'
        }, { quoted: m })

        await m.react('✅')

    } catch (error) {
        await m.react('❌')
        const errMsg = error.message.includes('timeout') 
            ? 'Koneksi ke server lambat/timeout. Silakan coba lagi.' 
            : error.message
        return m.reply(toSmallCaps(`❌ Gagal menghapus background: ${errMsg}`))
    }
}

module.exports = { 
    config: pluginConfig, 
    handler 
}
