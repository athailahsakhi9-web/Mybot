const { downloadMediaMessage } = require('nexa')

module.exports = {
  config: {
    name: 'gantippgc',
    alias: ['setppgc', 'fotogc', 'ppgc'],
    category: 'group',
    description: 'Ganti foto profil grup (reply foto)',
    usage: '[reply foto]',
    isEnabled: true,
    isGroup: true,
    isAdmin: true,
    isBotAdmin: true,
    cooldown: 10,
    energi: 0,
  },

  async handler(m, { sock }) {
    // Harus reply ke gambar
    const quoted = m.quoted || (m.message?.imageMessage ? m : null)

    if (!quoted) {
      return m.reply(
        `╭─❖〔 🖼️ GANTI PP GC 〕❖─\n` +
        `│\n` +
        `├ ⚠️ Cara pakai:\n` +
        `│  Reply ke foto yang ingin dijadikan\n` +
        `│  foto profil grup, lalu ketik:\n` +
        `│\n` +
        `│  ${m.prefix}gantippgc\n` +
        `│\n` +
        `╰─────────────────────`
      )
    }

    // Cek apakah pesan yang di-reply adalah gambar
    const mtype = quoted.mtype || ''
    const isImage = mtype === 'imageMessage' ||
      mtype === 'image' ||
      !!quoted.message?.imageMessage ||
      !!quoted.message?.viewOnceMessage?.message?.imageMessage

    if (!isImage) {
      return m.reply('❌ Yang di-reply harus berupa *foto/gambar*, bukan video atau file lain.')
    }

    let buffer
    try {
      buffer = await downloadMediaMessage(
        { key: quoted.key, message: quoted.message },
        'buffer',
        {},
        { reuploadRequest: sock.updateMediaMessage }
      )
    } catch (err) {
      return m.reply(`❌ Gagal mengunduh foto.\n\n> ${err?.message || 'Unknown error'}`)
    }

    if (!buffer || buffer.length === 0) {
      return m.reply('❌ Buffer foto kosong. Coba ulang dengan foto yang berbeda.')
    }

    try {
      await sock.updateProfilePicture(m.chat, buffer)
    } catch (err) {
      const reason = err?.message || ''
      if (reason.includes('not-authorized') || reason.includes('forbidden')) {
        return m.reply('❌ Bot tidak punya izin. Pastikan bot adalah admin grup.')
      }
      return m.reply(`❌ Gagal mengubah foto profil grup.\n\n> ${reason || 'Unknown error'}`)
    }

    return m.reply(
      `╭─❖〔 🖼️ PP GC DIPERBARUI 〕❖─\n` +
      `│\n` +
      `├ ✅ Status  : Foto profil berhasil diubah\n` +
      `├ 👥 Grup    : ${m.groupMetadata?.subject || m.chat}\n` +
      `├ 👤 Oleh    : ${m.pushName}\n` +
      `│\n` +
      `╰─────────────────────`
    )
  },
}
