const axios    = require('axios')
const FormData = require('form-data')

const UPLOAD_URL = 'https://clooud.my.id/uploder/'
const API_URL    = 'https://api.nexray.eu.cc/canvas/musiccard'

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
  name:        'musicard',
  alias:       ['musiccard', 'mcard'],
  category:    'canvas',
  description: 'Buat music card dari foto + judul & nama',
  usage:       '.musicard judul | nama (reply/caption gambar)',
  example:     '.musicard alok | Ed Sheeran',
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
      `🎵 *ᴍᴜsɪᴄ ᴄᴀʀᴅ*\n\n` +
      `> Kirim/reply gambar dengan caption:\n\n` +
      `\`${m.prefix}musicard judul | nama\`\n\n` +
      `Contoh:\n\`${m.prefix}musicard alok | Ed Sheeran\``
    )
  }

  if (!input || !input.includes('|')) {
    return m.reply(
      `❌ Format salah!\n\n` +
      `Gunakan: \`${m.prefix}musicard judul | nama\`\n` +
      `Contoh: \`${m.prefix}musicard alok | Ed Sheeran\``
    )
  }

  const [judulRaw, namaRaw] = input.split('|')
  const judul = judulRaw?.trim()
  const nama  = namaRaw?.trim()

  if (!judul || !nama) {
    return m.reply(`❌ Judul dan nama tidak boleh kosong!\n\nContoh: \`${m.prefix}musicard alok | Ed Sheeran\``)
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
    const imageUrl = await uploadImage(buffer)

    // 3. Hit API musiccard
    const apiUrl = `${API_URL}?judul=${encodeURIComponent(judul)}&nama=${encodeURIComponent(nama)}&image_url=${encodeURIComponent(imageUrl)}`

    const res = await axios.get(apiUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    })

    const resultBuffer = Buffer.from(res.data)

    if (!resultBuffer?.length) {
      await m.react('❌')
      return m.reply('❌ Gagal generate music card.')
    }

    // 4. Kirim hasil
    await m.react('✅')
    await sock.sendMessage(m.chat, {
      image:       resultBuffer,
      caption:     `🎵 *ᴍᴜsɪᴄ ᴄᴀʀᴅ*\n\n┃ 📀 Judul: *${judul}*\n┃ 🎤 Nama: *${nama}*`,
      mimetype:    'image/png',
    }, { quoted: m })

  } catch (err) {
    await m.react('❌')
    await m.reply(`❌ *Error!*\n\n> ${err.message}`)
  }
}

module.exports = { config: pluginConfig, handler }
