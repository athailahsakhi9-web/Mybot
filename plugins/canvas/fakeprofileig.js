const axios = require('axios')
const FormData = require('form-data')

const pluginConfig = {
    name: 'fakeigprofile',
    alias: ['fakeig', 'igfake', 'fakeigprof'],
    category: 'canvas',
    description: 'Membuat profil Instagram palsu (Fake IG Profile)',
    usage: '.fakeig <username> | <bio> | <pengikut> | <mengikuti> | <postingan> (reply/kirim gambar untuk foto profil)',
    example: '.fakeig nexa.dev | Official Account | 1.2M | 250 | 45',
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
const DEFAULT_PP = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'

async function uploadImage(buffer) {
    const form = new FormData()
    form.append('files[]', buffer, {
        filename: 'pp.jpg',
        contentType: 'image/jpeg',
    })

    const res = await axios.post(UPLOAD_URL, form, {
        headers: form.getHeaders(),
        timeout: 30000,
    })

    const url = res.data?.files?.[0]?.url
    if (!url) throw new Error('Gagal mengunggah foto profil!')
    return url
}

async function handler(m, { sock, text, args }) {
    // Multi-fallback penangkapan teks input
    let rawInput = text || (args && args.join(' ')) || ''
    if (!rawInput && (m.text || m.body)) {
        const body = m.text || m.body || ''
        rawInput = body.replace(/^[^\s]+\s*/, '')
    }

    // Parse parameter menggunakan pemisah '|'
    const parts = rawInput.split('|').map(v => v.trim())
    const username = parts[0] || ''
    const bio = parts[1] || '-'
    const pengikut = parts[2] || '1K'
    const mengikuti = parts[3] || '100'
    const postingan = parts[4] || '10'

    if (!username) {
        let helpMsg = `📸 *${toSmallCaps('ꜰᴀᴋᴇ ɪɢ ᴘʀᴏꜰɪʟᴇ')}*\n\n`
        helpMsg += `> ${toSmallCaps('gunakan tanda | untuk memisahkan parameter')}\n\n`
        helpMsg += `*Format:* \`${m.prefix || '.'}fakeig <username> | <bio> | <pengikut> | <mengikuti> | <postingan>\`\n`
        helpMsg += `*Contoh:* \`${m.prefix || '.'}fakeig nexa.dev | Official Account | 1.2M | 250 | 45\`\n\n`
        helpMsg += `_💡 Reply/kirim gambar untuk mengganti Foto Profil Instagram._`
        return m.reply(helpMsg)
    }

    await m.react('⏳')

    try {
        // Cek media untuk foto profil
        const fromQuoted = m.quoted?.isImage || m.quoted?.mtype === 'imageMessage'
        const fromDirect = m.isImage || m.mtype === 'imageMessage'
        
        let ppurl = DEFAULT_PP

        if (fromQuoted || fromDirect) {
            try {
                const buffer = fromQuoted 
                    ? await m.quoted.download() 
                    : await m.download()

                if (buffer && buffer.length) {
                    ppurl = await uploadImage(buffer)
                }
            } catch (e) {
                console.error('Upload PP error:', e)
            }
        }

        // Endpoint API NexaDev
        const apiUrl = `https://apii.nexadev.my.id/fakeigprofile?ppurl=${encodeURIComponent(ppurl)}&username=${encodeURIComponent(username)}&postingan=${encodeURIComponent(postingan)}&mengikuti=${encodeURIComponent(mengikuti)}&pengikut=${encodeURIComponent(pengikut)}&bio=${encodeURIComponent(bio)}`

        const res = await axios.get(apiUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/*, application/json'
            }
        })

        const contentType = res.headers['content-type'] || ''
        
        let caption = `📸 *${toSmallCaps('ꜰᴀᴋᴇ ɪɢ ᴘʀᴏꜰɪʟᴇ')}*\n\n`
        caption += `┃ 👤 ${toSmallCaps('ᴜsᴇʀɴᴀᴍᴇ')}: *${username}*\n`
        caption += `┃ 👥 ${toSmallCaps('ᴘᴇɴɢɪᴋᴜᴛ')}: *${pengikut}*\n`
        caption += `┃ 👤 ${toSmallCaps('ᴍᴇɴɢɪᴋᴜᴛɪ')}: *${mengikuti}*\n`
        caption += `┃ 📮 ${toSmallCaps('ᴘᴏsᴛɪɴɢᴀɴ')}: *${postingan}*\n`
        caption += `┃ 📝 ${toSmallCaps('ʙɪᴏ')}: *${bio}*`

        if (contentType.includes('application/json')) {
            const result = JSON.parse(Buffer.from(res.data).toString('utf-8'))
            const imgUrl = result.url || result.data?.url || result.result || result.image

            if (!imgUrl) {
                throw new Error(result.message || 'Gagal membuat Fake IG Profile!')
            }

            await sock.sendMessage(m.chat, {
                image: { url: imgUrl },
                caption: caption
            }, { quoted: m })
        } else {
            const imageBuffer = Buffer.from(res.data)

            if (!imageBuffer || !imageBuffer.length) {
                throw new Error('Buffer gambar kosong!')
            }

            await sock.sendMessage(m.chat, {
                image: imageBuffer,
                caption: caption,
                mimetype: 'image/png'
            }, { quoted: m })
        }

        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        const errMsg = err.message.includes('timeout') 
            ? 'Koneksi ke server API lambat/timeout. Silakan coba lagi.' 
            : err.message
        return m.reply(toSmallCaps(`❌ Gagal membuat Fake IG Profile: ${errMsg}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
