// ╔══════════════════════════════════════╗
// ║     NEXA BOT - CONFESS (confess.js)  ║
// ╚══════════════════════════════════════╝

const {
  normalizeNumber,
  isValidNumber,
  startConfess,
  getActiveThread,
  buildConfessBox,
  buildRelayBox,
  buildSystemBox,
} = require(__dirname + '/confessCore')

const pluginConfig = {
  name:        'confess',
  alias:       ['cf'],
  category:    'fun',
  description: 'Kirim pesan anonim ke nomor tujuan',
  usage:       '.confess <nomor> <pesan>',
  example:     '.confess 6281234567890 Halo, aku suka kamu diam-diam',
  isOwner:     false,
  isPremium:   false,
  isGroup:     false,
  isPrivate:   false,
  cooldown:    10,
  isEnabled:   true,
}

async function handler(m, { sock }) {
  const sender = m.sender
  const args   = m.args || []

  if (args.length < 2) {
    return m.reply(
      buildSystemBox('📖 ᴄᴀʀᴀ ᴘᴀᴋᴀɪ',
        `Kirim pesan anonim ke seseorang!\n\n` +
        `Format:\n\`${m.prefix}confess <nomor> <pesan>\`\n\n` +
        `Contoh:\n\`${m.prefix}confess 6281234567890 Halo, aku suka kamu\`\n\n` +
        `Setelah terkirim, kamu & target bisa saling balas chat secara anonim.\n` +
        `Ketik \`.stop confess\` kapan saja untuk mengakhiri.`
      )
    )
  }

  // Cek kalau sender sudah punya thread aktif
  const existing = getActiveThread(sender)
  if (existing) {
    return m.reply(
      buildSystemBox('⚠️ ᴍᴀsɪʜ ᴀᴋᴛɪꜰ',
        `Kamu masih punya sesi confess yang berjalan.\n\n` +
        `Ketik \`.stop confess\` dulu untuk mengakhirinya sebelum memulai yang baru.`
      )
    )
  }

  const rawNumber = args[0]
  const message   = args.slice(1).join(' ').trim()

  const targetNumber = normalizeNumber(rawNumber)
  if (!isValidNumber(targetNumber)) {
    return m.reply(buildSystemBox('❌ ɢᴀɢᴀʟ', `Nomor tidak valid!\n\nGunakan format: 62812xxxxxxx`))
  }

  const targetJid    = targetNumber + '@s.whatsapp.net'
  const senderNumber = sender.split('@')[0]

  if (targetNumber === senderNumber) {
    return m.reply(buildSystemBox('❌ ɢᴀɢᴀʟ', `Tidak bisa confess ke diri sendiri!`))
  }

  if (message.length < 2) {
    return m.reply(buildSystemBox('❌ ɢᴀɢᴀʟ', `Pesan terlalu pendek!`))
  }
  if (message.length > 1000) {
    return m.reply(buildSystemBox('❌ ɢᴀɢᴀʟ', `Pesan terlalu panjang! Maksimal 1000 karakter.`))
  }

  // Cek nomor terdaftar di WA
  try {
    const [onWa] = await sock.onWhatsApp(targetNumber)
    if (!onWa?.exists) {
      return m.reply(buildSystemBox('❌ ɢᴀɢᴀʟ', `Nomor \`${targetNumber}\` tidak terdaftar di WhatsApp!`))
    }
  } catch (_) {}

  await m.react('⌛')

  try {
    // Kirim pesan pertama ke target
    await sock.sendMessage(targetJid, {
      text: buildConfessBox(message),
    })

    // Mulai thread relay dua arah
    startConfess(sender, targetJid)

    await m.react('✅')
    return m.reply(
      buildSystemBox('✅ ᴛᴇʀᴋɪʀɪᴍ',
        `Pesan berhasil dikirim ke \`${targetNumber}\` secara anonim! 🔒\n\n` +
        `Kalau dia membalas, balasannya akan otomatis dikirim ke sini.\n` +
        `Ketik \`.stop confess\` kapan saja untuk mengakhiri sesi.`
      )
    )
  } catch (err) {
    await m.react('❌')
    return m.reply(buildSystemBox('❌ ᴇʀʀᴏʀ', `Gagal mengirim pesan!\n\n${err.message}`))
  }
}

// ── Relay reply — dipanggil dari handler.js untuk tiap pesan non-command ──
// Return true kalau pesan berhasil di-relay (supaya tidak diproses middleware lain)
async function checkReply(m, { sock }) {
  try {
    const sender = m.sender
    const active = getActiveThread(sender)
    if (!active) return false

    const body = m.body?.trim()
    if (!body) return false

    await sock.sendMessage(active.partner, {
      text: buildRelayBox(body),
    })

    await m.react('✅')
    return true
  } catch (err) {
    console.error('[confess] checkReply error:', err.message)
    return false
  }
}

module.exports = { config: pluginConfig, handler, checkReply }