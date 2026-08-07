const axios = require('axios')
const FormData = require('form-data')

const pluginConfig = {
    name: 'qcwa',
    alias: ['qc', 'fakeqc', 'qcwhatsapp'],
    category: 'canvas',
    description: 'Membuat gelembung quote chat WhatsApp dengan dukungan gambar (Fake QC WA)',
    usage: '.qcwa <teks> [| mode | tag] (reply/kirim gambar jika ada)',
    example: '.qcwa btw ini my bini gw | light | ara-ara',
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
const DEFAULT_PP = 'https://clooud.my.id/uploder/uploads/BJLnsy.png'

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
    if (!url) throw new Error('Gagal mengunggah gambar lampiran!')
    return url
}

async function handler(m, { sock, text, args }) {
    let rawInput = text || (args && args.join(' ')) || ''
    if (!rawInput && (m.text || m.body)) {
        const body = m.text || m.body || ''
        rawInput = body.replace(/^[^\s]+\s*/, '')
    }

    // Parse parameter kustom via '|'
    const parts = rawInput.split('|').map(v => v.trim())
    let quoteText = parts[0] || (m.quoted ? (m.quoted.text || m.quoted.caption || '') : '')
    const mode = parts[1] || 'light'
    const tag = parts[2] || ''

    // Pengecekan media gambar (baik dari reply maupun kirim langsung)
    const isQuotedImage = m.quoted?.isImage || m.quoted?.mtype === 'imageMessage'
    const isDirectImage = m.isImage || m.mtype === 'imageMessage'

    if (!quoteText && !isQuotedImage && !isDirectImage) {
        let helpMsg = `💬 *${toSmallCaps('ꜰᴀᴋᴇ ǫᴄ ᴡʜᴀᴛsᴀᴘᴘ')}*\n\n`
        helpMsg += `> ${toSmallCaps('balas pesan/gambar atau masukkan teks untuk membuat quote chat')}\n\n`
        helpMsg += `*Format:* \`${m.prefix || '.'}qcwa <teks> [| mode | tag]\`\n`
        helpMsg += `*Contoh:* \`${m.prefix || '.'}qcwa btw ini my bini gw | light | ara-ara\``
        return m.reply(helpMsg)
    }

    await m.react('⏳')

    try {
        // Upload Gambar Lampiran jika ada
        let attachedImgUrl = ''
        if (isQuotedImage || isDirectImage) {
            try {
                const imgBuffer = isQuotedImage 
                    ? await m.quoted.download() 
                    : await m.download()

                if (imgBuffer && imgBuffer.length) {
                    attachedImgUrl = await uploadImage(imgBuffer)
                }
            } catch (e) {
                console.error('Gagal upload gambar lampiran QC:', e)
            }
        }

        // Penentuan target pengirim (quoted message vs sender sendiri)
        const targetJid = m.quoted ? m.quoted.sender : m.sender
        const usn = m.quoted 
            ? (m.quoted.pushName || m.quoted.name || targetJid.split('@')[0]) 
            : (m.pushName || m.name || targetJid.split('@')[0])
            
        const phone = targetJid.split('@')[0].replace(/[^0-9]/g, '')

        // Ambil Foto Profil Target
        let ppurl = DEFAULT_PP
        try {
            ppurl = await sock.profilePictureUrl(targetJid, 'image')
        } catch {
            ppurl = DEFAULT_PP
        }

        // Konstruksi Endpoint API NexaDev
        let apiUrl = `https://apii.nexadev.my.id/qcwa?usn=${encodeURIComponent(usn)}&phone=${encodeURIComponent(phone)}&pp=${encodeURIComponent(ppurl)}&text=${encodeURIComponent(quoteText)}&mode=${encodeURIComponent(mode)}&tag=${encodeURIComponent(tag)}`
        
        if (attachedImgUrl) {
            apiUrl += `&img=${encodeURIComponent(attachedImgUrl)}`
        }

        const res = await axios.get(apiUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/*, application/json'
            }
        })

        const contentType = res.headers['content-type'] || ''

        if (contentType.includes('application/json')) {
            const result = JSON.parse(Buffer.from(res.data).toString('utf-8'))
            const imgUrl = result.url || result.data?.url || result.result || result.image

            if (!imgUrl) {
                throw new Error(result.message || 'Gagal membuat QC WhatsApp!')
            }

            await sock.sendMessage(m.chat, {
                image: { url: imgUrl },
                caption: `💬 *${toSmallCaps('ǫᴄ ᴡʜᴀᴛsᴀᴘᴘ')}*`
            }, { quoted: m })
        } else {
            const imageBuffer = Buffer.from(res.data)

            if (!imageBuffer || !imageBuffer.length) {
                throw new Error('Buffer gambar kosong!')
            }

            await sock.sendMessage(m.chat, {
                image: imageBuffer,
                caption: `💬 *${toSmallCaps('ǫᴄ ᴡʜᴀᴛsᴀᴘᴘ')}*`,
                mimetype: 'image/png'
            }, { quoted: m })
        }

        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        const errMsg = err.message.includes('timeout') 
            ? 'Koneksi ke server API lambat/timeout. Silakan coba lagi.' 
            : err.message
        return m.reply(toSmallCaps(`❌ Gagal membuat QC WA: ${errMsg}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
