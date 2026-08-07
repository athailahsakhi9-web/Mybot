module.exports = {
  config: {
    name: 'getpp',
    alias: ['pp', 'profil', 'profile', 'fotoprofil'],
    category: 'user',
    description: 'Ambil foto profil WhatsApp',
    usage: '[nomor / @tag / reply pesan]',
    isEnabled: true,
    cooldown: 5,
    energi: 0,
  },

  async handler(m, { sock }) {
    let targetJid = null
    let label = ''

    if (m.mentionedJid && m.mentionedJid.length > 0) {
      targetJid = m.mentionedJid[0]
      label = `@${targetJid.split('@')[0]}`
    }

    // Prioritas 2: nomor dari argumen
    else if (m.args[0] && /^[0-9]/.test(m.args[0])) {
      const number = m.args[0].replace(/[^0-9]/g, '')
      if (number.length < 8) {
        return m.reply('⚠️ Nomor tidak valid. Contoh: .getpp 6281234567890')
      }
      targetJid = number + '@s.whatsapp.net'
      label = number
    }

    // Prioritas 3: reply ke pesan seseorang
    else if (m.quoted) {
      targetJid = m.quoted.sender || m.quoted.participant || m.quoted.key?.participant
      if (targetJid) label = `@${targetJid.split('@')[0]}`
    }

    if (!targetJid) {
      targetJid = m.sender
      label = 'Profilmu'
    }

    if (!targetJid.includes('@')) {
      targetJid = targetJid + '@s.whatsapp.net'
    }

    let ppUrl
    try {
      ppUrl = await sock.profilePictureUrl(targetJid, 'image')
    } catch (err) {
      return m.reply(
        `╭─❖〔 🖼️ FOTO PROFIL 〕❖─\n` +
        `│\n` +
        `├ 👤 Target  : ${label}\n` +
        `├ ❌ Status  : Foto profil tidak tersedia\n` +
        `│\n` +
        `├ 💡 Kemungkinan:\n` +
        `│  • Privasi diatur ke "Tidak Ada"\n` +
        `│  • Nomor tidak punya foto profil\n` +
        `│  • Nomor tidak terdaftar di WhatsApp\n` +
        `│\n` +
        `╰─────────────────────`
      )
    }

    if (!ppUrl) {
      return m.reply(`❌ Foto profil ${label} tidak ditemukan.`)
    }

    await sock.sendMessage(
      m.chat,
      {
        image: { url: ppUrl },
        caption:
          `╭─❖〔 🖼️ FOTO PROFIL 〕❖─\n` +
          `│\n` +
          `├ 👤 Target  : ${label}\n` +
          `├ ✅ Status  : Berhasil diambil\n` +
          `│\n` +
          `╰─────────────────────`,
      },
      { quoted: m }
    )
  },
}
