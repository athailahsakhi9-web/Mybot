const axios = require('axios')

const pluginConfig = {
  name: 'nokia',
  alias: ['nokiasms'],
  category: 'canvas',
  description: 'Generate gambar Nokia SMS',
  usage: '.nokia <teks> | [from] | [time] | [title]',
  example: '.nokia selamat pagi | nexa | 08:00 | Nexa Bot',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  isEnabled: true,
}

async function handler(m, { sock }) {
  const input = m.text?.trim()

  if (!input) {
    return m.reply(
      `📱 *NOKIA SMS*\n\n` +
      `Usage: \`.nokia <teks> | [from] | [time] | [title]\`\n\n` +
      `Contoh:\n` +
      `\`.nokia selamat pagi\`\n` +
      `\`.nokia selamat pagi | Nexa\`\n` +
      `\`.nokia selamat pagi | Nexa | 08:00\`\n` +
      `\`.nokia selamat pagi | Nexa | 08:00 | Nexa Bot\`\n\n` +
      `> date otomatis hari ini\n` +
      `> from/time/title opsional`
    )
  }

  await m.react('⌛')

  try {
    // Parse parameter pakai separator |
    const parts = input.split('|').map(s => s.trim())
    const text  = parts[0]
    const from  = parts[1] || m.pushName || m.sender.split('@')[0]
    const now   = new Date()
    const time  = parts[2] || `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    const title = parts[3] || 'Nexa Bot'
    const date  = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`

    const url = `https://apii.nexadev.my.id/nokia?text=${encodeURIComponent(text)}&from=${encodeURIComponent(from)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}&title=${encodeURIComponent(title)}`

    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
    })

    const buffer = Buffer.from(res.data)

    if (!buffer?.length) {
      await m.react('❌')
      return m.reply('❌ Gagal generate gambar.')
    }

    await m.react('✅')
    await sock.sendMessage(m.chat, {
      image: buffer,
      mimetype: 'image/png',
    }, { quoted: m })

  } catch (err) {
    await m.react('❌')
    return m.reply(`❌ *Error!*\n\n> ${err.message}`)
  }
}

module.exports = { config: pluginConfig, handler }
