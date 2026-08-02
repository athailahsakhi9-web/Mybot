const pluginConfig = {
  name: 'swm',
  alias: ['wm', 'stickerwm', 'stickermark', 'colong'],
  category: 'sticker',
  description: 'Ganti packname dan author sticker',
  usage: '.swm <packname>|<author>',
  example: '.swm NEXA BOT|Nexa',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  isEnabled: true,
}

async function handler(m, { sock }) {
  const quoted = m.quoted

  if (!quoted) {
    return m.reply(
      `🖼️ *sᴛɪᴄᴋᴇʀ ᴡᴀᴛᴇʀᴍᴀʀᴋ*\n\n` +
      `> Reply sticker dengan caption:\n\n` +
      `\`${m.prefix}swm packname|author\`\n\n` +
      `*ᴄᴏɴᴛᴏʜ:*\n` +
      `> \`${m.prefix}swm 𝗡𝗘𝗫𝗔 𝗕𝗢𝗧|Nexa\`\n` +
      `> \`${m.prefix}swm BotKu\` _(hanya packname)_\n` +
      `> \`${m.prefix}swm |Author\` _(hanya author)_`
    )
  }

  const isSticker = quoted.type === 'stickerMessage' || quoted.isSticker
  if (!isSticker) {
    return m.reply(`❌ Reply sticker, bukan ${quoted.type?.replace('Message', '') || 'media lain'}`)
  }

  const input = m.text?.trim()
  if (!input) {
    return m.reply(
      `❌ Masukkan packname/author!\n\n` +
      `Contoh: \`${m.prefix}swm 𝗡𝗘𝗫𝗔 𝗕𝗢𝗧|Nexa\``
    )
  }

  // Parse packname & author
  let packname, author
  if (input.includes('|')) {
    const parts = input.split('|')
    packname = parts[0]?.trim() || '𝗡𝗘𝗫𝗔 𝗕𝗢𝗧'
    author   = parts[1]?.trim() || 'Nexa'
  } else {
    packname = input.trim()
    author   = 'Nexa'
  }

  if (packname.length > 50) return m.reply(`❌ Packname terlalu panjang (max 50 karakter)`)
  if (author.length > 50)   return m.reply(`❌ Author terlalu panjang (max 50 karakter)`)

  await m.react('⌛')

  try {
    const buffer = await quoted.download()

    if (!buffer?.length) {
      await m.react('❌')
      return m.reply(`❌ Gagal mendownload sticker`)
    }

    // Cek animated dari berbagai kemungkinan property
    const isAnimated =
      quoted.msg?.isAnimated ||
      quoted.message?.stickerMessage?.isAnimated ||
      quoted.isAnimated ||
      false

    const opts = { packname, author }

    if (isAnimated) {
      await sock.sendVideoAsSticker(m.chat, buffer, m, opts)
    } else {
      await sock.sendImageAsSticker(m.chat, buffer, m, opts)
    }

    await m.react('✅')

  } catch (err) {
    await m.react('❌')
    await m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${err.message}`)
  }
}

module.exports = { config: pluginConfig, handler }
