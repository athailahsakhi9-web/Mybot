// ╔══════════════════════════════════════╗
// ║   NEXA BOT - TIKTOK QC (ttqc.js)     ║
// ╚══════════════════════════════════════╝

const axios    = require('axios')
const FormData = require('form-data')
const fs       = require('fs')
const path     = require('path')

const UPLOAD_URL = 'https://clooud.my.id/uploder/'
const API_URL    = 'https://apii.nexadev.my.id/ttqc'

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
  name:        'ttqc',
  alias:       ['tiktokqc', 'qctiktok'],
  category:    'canvas',
  description: 'Buat TikTok quote card dari foto + nama & teks',
  usage:       '.ttqc nama | teks (reply/caption gambar)',
  example:     '.ttqc nexa | hidupku menyedihkan.',
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
      `🎬 *ᴛɪᴋᴛᴏᴋ ǫᴄ*\n\n` +
      `> Kirim/reply gambar dengan caption:\n\n` +
      `\`${m.prefix}ttqc nama | teks\`\n\n` +
      `Contoh:\n\`${m.prefix}ttqc nexa | hidupku menyedihkan.\``
    )
  }

  if (!input || !input.includes('|')) {
    return m.reply(
      `❌ Format salah!\n\n` +
      `Gunakan: \`${m.prefix}ttqc nama | teks\`\n` +
      `Contoh: \`${m.prefix}ttqc nexa | hidupku menyedihkan.\``
    )
  }

  const [namaRaw, textRaw] = input.split('|')
  const name = namaRaw?.trim()
  const text = textRaw?.trim()

  if (!name || !text) {
    return m.reply(`❌ Nama dan teks tidak boleh kosong!\n\nContoh: \`${m.prefix}ttqc nexa | hidupku menyedihkan.\``)
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
    const avatarUrl = await uploadImage(buffer)

    // 3. Hit API ttqc
    const apiUrl = `${API_URL}?url=${encodeURIComponent(avatarUrl)}&name=${encodeURIComponent(name)}&text=${encodeURIComponent(text)}`

    const res = await axios.get(apiUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    })

    const resultBuffer = Buffer.from(res.data)

    if (!resultBuffer?.length) {
      await m.react('❌')
      return m.reply('❌ Gagal generate TikTok QC.')
    }

    // 4. Kirim hasil
    await m.react('✅')
    await sock.sendMessage(m.chat, {
      image:       resultBuffer,
      caption:     `🎬 *ᴛɪᴋᴛᴏᴋ ǫᴄ*\n\n┃ 👤 Nama: *${name}*\n┃ 💬 Teks: *${text}*`,
      mimetype:    'image/png',
    }, { quoted: m })

  } catch (err) {
    await m.react('❌')
    await m.reply(`❌ *Error!*\n\n> ${err.message}`)
  }
}

module.exports = { config: pluginConfig, handler }
