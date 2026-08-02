const axios = require('axios')

const pluginConfig = {
  name: 'wmp1',
  alias: ['wordmp1'],
  category: 'canvas',
  description: 'Generate word meme part 1',
  usage: '.wmp1 <teks|teks|teks>',
  example: '.wmp1 ngapain+cemburu|kan|cuman+sebatas|teman',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  isEnabled: true,
}

async function handler(m, { sock }) {
  const text = m.text?.trim()

  if (!text) {
    return m.reply(
      `🖼️ *WMP1*\n\n` +
      `Usage: \`.wmp1 <teks>\`\n\n` +
      `Contoh:\n\`.wmp1 ngapain+cemburu|kan|cuman+sebatas|teman\``
    )
  }

  await m.react('⌛')

  try {
    const url = `https://apii.nexadev.my.id/wmp1?text=${encodeURIComponent(text)}`

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
