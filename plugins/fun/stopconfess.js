// ╔══════════════════════════════════════════╗
// ║   NEXA BOT - STOP CONFESS (stopconfess)  ║
// ╚══════════════════════════════════════════╝

const { getActiveThread, stopThread, buildSystemBox } = require(__dirname + '/confessCore')

const pluginConfig = {
  name:        'stop',
  alias:       ['stopconfess'],
  category:    'fun',
  description: 'Hentikan sesi confess yang sedang berjalan',
  usage:       '.stop confess',
  example:     '.stop confess',
  isOwner:     false,
  isPremium:   false,
  isGroup:     false,
  isPrivate:   false,
  cooldown:    5,
  isEnabled:   true,
}

async function handler(m, { sock }) {
  const sender = m.sender
  const args   = (m.args || []).map(a => a.toLowerCase())

  // Command ini fokus untuk "stop confess" — kalau argumen lain, kasih tau cara pakai
  if (args[0] && args[0] !== 'confess') {
    return m.reply(buildSystemBox('ℹ️ ɪɴꜰᴏ', `Gunakan: \`${m.prefix}stop confess\``))
  }

  const active = getActiveThread(sender)
  if (!active) {
    return m.reply(buildSystemBox('ℹ️ ɪɴꜰᴏ', `Kamu tidak punya sesi confess yang sedang aktif.`))
  }

  const partner = stopThread(sender)

  await m.react('✅')
  await m.reply(buildSystemBox('🛑 ᴅɪʜᴇɴᴛɪᴋᴀɴ', `Sesi confess kamu telah diakhiri.`))

  // Beri tahu lawan bicara juga
  if (partner) {
    try {
      await sock.sendMessage(partner, {
        text: buildSystemBox('🛑 sᴇsɪ ʙᴇʀᴀᴋʜɪʀ', `Percakapan anonim ini telah diakhiri oleh salah satu pihak.\n\n🔒 Identitas tetap dirahasiakan.`),
      })
    } catch (_) {}
  }
}

module.exports = { config: pluginConfig, handler }