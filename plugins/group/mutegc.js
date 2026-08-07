// plugins/group/mutegc.js
// Mute bot di grup tertentu — bot tidak akan merespons command apapun
// selama mute aktif, kecuali owner bot.

module.exports = {
  config: {
    name: 'mutegc',
    alias: [],
    category: 'group',
    description: 'Mute/unmute bot di grup ini',
    usage: '<on/off>',
    isEnabled: true,
    isGroup: true,
    isAdmin: true,
    cooldown: 0,
    energi: 0,
  },

  async handler(m, { db }) {
    const arg = (m.args[0] || '').toLowerCase()

    if (!['on', 'off'].includes(arg)) {
      const groupData = db.getGroup(m.chat) || {}
      const status = groupData.mutegc ? '🔇 *ON* (bot sedang diam di grup ini)' : '🔊 *OFF* (bot aktif)'
      return m.reply(
        `╭─❖〔 🔇 MUTE GC 〕❖─\n` +
        `│\n` +
        `├ Status saat ini : ${status}\n` +
        `│\n` +
        `╰─────────────────────\n` +
        `> Gunakan: .mutegc on / .mutegc off`
      )
    }

    const groupData = db.getGroup(m.chat) || {}

    if (arg === 'on') {
      if (groupData.mutegc) {
        return m.reply('⚠️ Bot sudah dalam mode diam di grup ini.')
      }
      groupData.mutegc = true
      db.setGroup(m.chat, groupData)
      return m.reply(
        `╭─❖〔 🔇 BOT DIMUTE 〕❖─\n` +
        `│\n` +
        `├ 🔇 Status  : Bot tidak akan merespons\n` +
        `├ 👥 Grup    : ${m.groupMetadata?.subject || m.chat}\n` +
        `├ 👤 Oleh    : ${m.pushName}\n` +
        `│\n` +
        `╰─────────────────────\n` +
        `> Gunakan .mutegc off untuk mengaktifkan kembali.`
      )
    }

    if (arg === 'off') {
      if (!groupData.mutegc) {
        return m.reply('⚠️ Bot sudah aktif di grup ini, tidak perlu di-unmute.')
      }
      groupData.mutegc = false
      db.setGroup(m.chat, groupData)
      return m.reply(
        `╭─❖〔 🔊 BOT DIAKTIFKAN 〕❖─\n` +
        `│\n` +
        `├ 🔊 Status  : Bot kembali aktif\n` +
        `├ 👥 Grup    : ${m.groupMetadata?.subject || m.chat}\n` +
        `├ 👤 Oleh    : ${m.pushName}\n` +
        `│\n` +
        `╰─────────────────────\n` +
        `> Bot sekarang bisa digunakan kembali di grup ini.`
      )
    }
  },
}
