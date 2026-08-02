// ╔══════════════════════════════════════╗
// ║   NEXA BOT - FAKE CALL (fakecall.js) ║
// ╚══════════════════════════════════════╝

const axios    = require('axios')
const FormData = require('form-data')

const UPLOAD_URL = 'https://clooud.my.id/uploder/'
const API_URL    = 'https://apii.nexadev.my.id/fakecall'

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
  name:        'fakecall',
  alias:       ['fc', 'panggilanpalsu'],
  category:    'canvas',
  description: 'Buat fake call screenshot dari foto profil + nama & durasi',
  usage:       '.fakecall nama | durasi (reply/caption gambar)',
  example:     '.fakecall NexaDev | 19.45',
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

  if (!fromQuoted && !fromDirect) {
    return m.reply(
      `📞 *ғᴀᴋᴇ ᴄᴀʟʟ*\n\n` +
      `> Kirim/reply gambar dengan caption:\n\n` +
      `\`${m.prefix}fakecall nama | durasi\`\n\n` +
      `Contoh:\n\`${m.prefix}fakecall NexaDev | 19.45\``
    )
  }

  if (!input || !input.includes('|')) {
    return m.reply(
      `❌ Format salah!\n\n` +
      `Gunakan: \`${m.prefix}fakecall nama | durasi\`\n` +
      `Contoh: \`${m.prefix}fakecall NexaDev | 19.45\``
    )
  }

  const [namaRaw, durasiRaw] = input.split('|')
  const name     = namaRaw?.trim()
  const duration = durasiRaw?.trim()

  if (!name || !duration) {
    return m.reply(`❌ Nama dan durasi tidak boleh kosong!\n\nContoh: \`${m.prefix}fakecall NexaDev | 19.45\``)
  }

  await m.react('⌛')
  await sock.sendMessage(m.chat, {
    text: `⏳ *Tunggu ya, lagi di buatin...*`,
  }, { quoted: m })

  try {
    // 1. Download buffer gambar
    const buffer = fromQuoted
      ? await m.quoted.download()
      : await m.download()

    if (!buffer?.length) {
      await m.react('❌')
      return m.reply('❌ Gagal mendownload gambar.')
    }

    // 2. Upload ke clooud.my.id
    const ppUrl = await uploadImage(buffer)

    // 3. Hit API fakecall
    const apiUrl = `${API_URL}?ppurl=${encodeURIComponent(ppUrl)}&name=${encodeURIComponent(name)}&duration=${encodeURIComponent(duration)}`

    const res = await axios.get(apiUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    })

    const resultBuffer = Buffer.from(res.data)

    if (!resultBuffer?.length) {
      await m.react('❌')
      return m.reply('❌ Gagal generate fake call.')
    }

    // 4. Kirim hasil
    await m.react('✅')
    await sock.sendMessage(m.chat, {
      image:       resultBuffer,
      caption:     `📞 *ғᴀᴋᴇ ᴄᴀʟʟ*\n\n┃ 👤 Nama: *${name}*\n┃ ⏱️ Durasi: *${duration}*`,
      mimetype:    'image/png',
    }, { quoted: m })

  } catch (err) {
    await m.react('❌')
    await m.reply(`❌ *Error!*\n\n> ${err.message}`)
  }
}

module.exports = { config: pluginConfig, handler }
