// ╔══════════════════════════════════════╗
// ║   NEXA BOT - IQC V1 (iqcv1.js)       ║
// ╚══════════════════════════════════════╝

const axios    = require('axios')
const FormData = require('form-data')

const UPLOAD_URL = 'https://clooud.my.id/uploder/'
const API_URL    = 'https://apii.nexadev.my.id/iqc-dark'

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

const pluginConfig = {
  name:        'iqcv1',
  alias:       ['iqc', 'iqcdark'],
  category:    'canvas',
  description: 'Buat IQC dark card dari foto + teks & waktu, atau teks & waktu saja',
  usage:       '.iqcv1 teks | waktu (reply gambar / tanpa gambar)',
  example:     '.iqcv1 aku lucu gak? | 01.27',
  isOwner:     false,
  isPremium:   false,
  isGroup:     false,
  isPrivate:   false,
  cooldown:    10,
  isEnabled:   true,
}

async function handler(m, { sock }) {
  const fromQuoted = m.quoted?.isImage
  const fromDirect = m.isImage
  const input      = m.text?.trim()

  if (!input || !input.includes('|')) {
    return m.reply(
      `🖤 *ɪǫᴄ ᴅᴀʀᴋ*\n\n` +
      `*Mode 1 — Reply gambar:*\n` +
      `Reply foto, lalu ketik:\n` +
      `\`${m.prefix}iqcv1 teks | waktu\`\n\n` +
      `*Mode 2 — Tanpa gambar:*\n` +
      `\`${m.prefix}iqcv1 teks | waktu\`\n\n` +
      `Contoh: \`${m.prefix}iqcv1 aku lucu gak? | 01.27\``
    )
  }

  const [textRaw, timeRaw] = input.split('|')
  const text = textRaw?.trim()
  const time = timeRaw?.trim()

  if (!text || !time) {
    return m.reply(`❌ Teks dan waktu tidak boleh kosong!\n\nContoh: \`${m.prefix}iqcv1 aku lucu gak? | 01.27\``)
  }

  await m.react('⌛')
  await sock.sendMessage(m.chat, {
    text: `⏳ *Tunggu ya, lagi di buatin...*`,
  }, { quoted: m })

  try {
    let apiUrl

    // Mode 1: Ada gambar (reply atau direct)
    if (fromQuoted || fromDirect) {
      const buffer = fromQuoted
        ? await m.quoted.download()
        : await m.download()

      if (!buffer?.length) {
        await m.react('❌')
        return m.reply('❌ Gagal mendownload gambar.')
      }

      const imageUrl = await uploadImage(buffer)
      apiUrl = `${API_URL}?text=${encodeURIComponent(text)}&time=${encodeURIComponent(time)}&url=${encodeURIComponent(imageUrl)}`
    }
    // Mode 2: Tanpa gambar
    else {
      apiUrl = `${API_URL}?text=${encodeURIComponent(text)}&time=${encodeURIComponent(time)}`
    }

    const res = await axios.get(apiUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    })

    const resultBuffer = Buffer.from(res.data)

    if (!resultBuffer?.length) {
      await m.react('❌')
      return m.reply('❌ Gagal generate IQC dark.')
    }

    // Kirim hasil
    await m.react('✅')
    await sock.sendMessage(m.chat, {
      image:       resultBuffer,
      caption:     `🖤 *ɪǫᴄ ᴅᴀʀᴋ*\n\n┃ 💬 Teks: *${text}*\n┃ ⏰ Waktu: *${time}*`,
      mimetype:    'image/png',
    }, { quoted: m })

  } catch (err) {
    await m.react('❌')
    await m.reply(`❌ *Error!*\n\n> ${err.message}`)
  }
}

module.exports = { config: pluginConfig, handler }
