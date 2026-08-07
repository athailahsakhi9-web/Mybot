module.exports = {
  config: {
    name: 'gantibiogc',
    alias: ['setbiogc', 'biodesc', 'setdesc'],
    category: 'group',
    description: 'Ganti deskripsi/bio grup',
    usage: '<teks bio baru> | kosongkan untuk hapus bio',
    isEnabled: true,
    isGroup: true,
    isAdmin: true,
    isBotAdmin: true,
    cooldown: 5,
    energi: 0,
  },

  async handler(m, { sock }) {
    const newBio = m.args.join(' ').trim()

    try {
      await sock.groupUpdateDescription(m.chat, newBio || '')
    } catch (err) {
      const reason = err?.message || ''
      if (reason.includes('not-authorized') || reason.includes('forbidden')) {
        return m.reply('❌ Bot tidak punya izin. Pastikan bot adalah admin grup.')
      }
      return m.reply(`❌ Gagal mengubah bio grup.\n\n> ${reason || 'Unknown error'}`)
    }

    if (newBio) {
      return m.reply(
        `╭─❖〔 📝 BIO GC DIPERBARUI 〕❖─\n` +
        `│\n` +
        `├ ✅ Status  : Berhasil diubah\n` +
        `├ 👥 Grup    : ${m.groupMetadata?.subject || m.chat}\n` +
        `├ 👤 Oleh    : ${m.pushName}\n` +
        `│\n` +
        `├ 📄 Bio Baru:\n` +
        `│  ${newBio.replace(/\n/g, '\n│  ')}\n` +
        `│\n` +
        `╰─────────────────────`
      )
    } else {
      return m.reply(
        `╭─❖〔 📝 BIO GC DIHAPUS 〕❖─\n` +
        `│\n` +
        `├ ✅ Status  : Bio berhasil dihapus\n` +
        `├ 👥 Grup    : ${m.groupMetadata?.subject || m.chat}\n` +
        `├ 👤 Oleh    : ${m.pushName}\n` +
        `│\n` +
        `╰─────────────────────`
      )
    }
  },
}
