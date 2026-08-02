const axios    = require('axios')
const FormData = require('form-data')

const pluginConfig = {
  name: 'fakeml',
  alias: ['ml', 'mllobby', 'fakelobby'],
  category: 'tools',
  description: 'Fake ML lobby dengan avatar kamu',
  usage: '.fakeml <nickname> (reply/caption gambar)',
  example: '.fakeml Nexa',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  isEnabled: true,
}

async function uploadImage(buffer) {
  const form = new FormData()
  form.append('files[]', buffer, {
    filename: 'image.jpg',
    contentType: 'image/jpeg',
  })

  const res = await axios.post('https://api.nexadev.my.id/uploder/', form, {
    headers: form.getHeaders(),
    timeout: 30000,
  })

  const url = res.data?.files?.[0]?.url
  if (!url) throw new Error('Upload gagal: tidak ada URL di response')
  return url
}

async function handler(m, { sock }) {
  const fromQuoted = m.quoted?.isImage
  const fromDirect = m.isImage
  const text       = m.text?.trim()

  if (!fromQuoted && !fromDirect) {
    return m.reply(
      `🎮 *FAKE ML LOBBY*\n\n` +
      `> Kirim/reply gambar + ketik nickname\n\n` +
      `\`${m.prefix}fakeml GoldQueen\``
    )
  }

  if (!text) {
    return m.reply(
      `❌ Masukkan nickname!\n\n` +
      `Contoh: \`.fakeml GoldQueen\``
    )
  }

  await m.react('⌛')

  try {
    // Download buffer
    const buffer = fromQuoted
      ? await m.quoted.download()
      : await m.download()

    if (!buffer?.length) {
      await m.react('❌')
      return m.reply('❌ Gagal mendownload gambar.')
    }

    // Upload ke nexadev uploader
    const avatarUrl = await uploadImage(buffer)

    // Hit API fake ML
    const res = await axios.get(
      `https://api.nexray.web.id/maker/fakelobyml?avatar=${encodeURIComponent(avatarUrl)}&nickname=${encodeURIComponent(text)}`,
      {
        responseType: 'arraybuffer',
        timeout: 30000,
        validateStatus: () => true,
      }
    )

    if (res.status !== 200) throw new Error(`API Error: ${res.status}`)

    const contentType = res.headers['content-type'] || ''
    if (!contentType.includes('image')) throw new Error('Response bukan gambar')

    const resultBuffer = Buffer.from(res.data)

    await m.react('✅')
    await sock.sendMessage(m.chat, {
      image:   resultBuffer,
      caption: `🎮 *FAKE ML LOBBY*\n\n> Nickname: *${text}*`,
    }, { quoted: m })

  } catch (err) {
    await m.react('❌')
    await m.reply(`❌ *Error!*\n\n> ${err.message}`)
  }
}

module.exports = { config: pluginConfig, handler }
