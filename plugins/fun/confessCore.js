// ╔══════════════════════════════════════════════╗
// ║   NEXA BOT - CONFESS CORE (confessCore.js)   ║
// ║   Shared logic dipakai confess.js & stop.js  ║
// ║   (File ini TIDAK export config/handler,     ║
// ║    aman diletakkan di plugins/ — di-skip     ║
// ║    otomatis oleh plugin loader)              ║
// ╚══════════════════════════════════════════════╝

// Thread aktif: threadId → { userA, userB, createdAt }
// Active map  : jid → threadId
if (!global.confessThreads) global.confessThreads = new Map()
if (!global.confessActive)  global.confessActive  = new Map()

const THREAD_TTL = 24 * 60 * 60 * 1000 // auto expire 24 jam

function genThreadId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function normalizeNumber(input = '') {
  let n = String(input).trim().replace(/[^0-9]/g, '')
  if (n.startsWith('0')) n = '62' + n.slice(1)
  return n
}

function isValidNumber(n) {
  return !!n && n.length >= 8 && n.length <= 15
}

function cleanupStale() {
  const now = Date.now()
  for (const [id, t] of global.confessThreads.entries()) {
    if (now - t.createdAt > THREAD_TTL) {
      global.confessThreads.delete(id)
      if (global.confessActive.get(t.userA) === id) global.confessActive.delete(t.userA)
      if (global.confessActive.get(t.userB) === id) global.confessActive.delete(t.userB)
    }
  }
}

/** Mulai thread confess baru antara dua jid */
function startConfess(senderJid, targetJid) {
  cleanupStale()

  // Kalau salah satu pihak sudah punya thread aktif, tutup dulu yang lama
  stopThread(senderJid)
  stopThread(targetJid)

  const threadId = genThreadId()
  global.confessThreads.set(threadId, {
    userA: senderJid,
    userB: targetJid,
    createdAt: Date.now(),
  })

  global.confessActive.set(senderJid, threadId)
  global.confessActive.set(targetJid, threadId)

  return threadId
}

/** Ambil thread aktif + lawan bicara dari sudut pandang jid */
function getActiveThread(jid) {
  cleanupStale()

  const threadId = global.confessActive.get(jid)
  if (!threadId) return null

  const thread = global.confessThreads.get(threadId)
  if (!thread) {
    global.confessActive.delete(jid)
    return null
  }

  const partner = thread.userA === jid ? thread.userB : thread.userA
  return { threadId, partner }
}

/** Hentikan thread aktif milik jid (mempengaruhi kedua pihak). Return partner jid atau null */
function stopThread(jid) {
  const active = getActiveThread(jid)
  if (!active) return null

  global.confessThreads.delete(active.threadId)
  global.confessActive.delete(jid)
  global.confessActive.delete(active.partner)

  return active.partner
}

// ── Box format pesan (gaya premium/misterius) ────────────────────────
function buildConfessBox(message) {
  return (
    `╭─❖〔 💌 ᴀɴᴏɴʏᴍᴏᴜs ᴍᴇssᴀɢᴇ 💌 〕❖─\n` +
    `│\n` +
    `├ 👤 Pengirim : Misterius\n` +
    `├ 🔒 Status   : Anonymous\n` +
    `│\n` +
    `╰─────────────────────\n\n` +
    `📝 Pesan:\n\n` +
    `${message}\n\n` +
    `─────────────────────\n\n` +
    `💬 Cukup balas chat ini untuk membalas pesan.\n` +
    `🛑 Ketik \`.stop confess\` untuk mengakhiri.\n\n` +
    `⚠️ Identitas pengirim dilindungi sistem.`
  )
}

function buildRelayBox(message) {
  return (
    `╭─❖〔 💬 ᴘᴇsᴀɴ ᴀɴᴏɴɪᴍ 💬 〕❖─\n` +
    `│\n` +
    `├ 🔒 Status   : Anonymous\n` +
    `│\n` +
    `╰─────────────────────\n\n` +
    `📝 Pesan:\n\n` +
    `${message}\n\n` +
    `─────────────────────\n\n` +
    `💬 Balas chat ini untuk melanjutkan percakapan.\n` +
    `🛑 Ketik \`.stop confess\` untuk mengakhiri.`
  )
}

function buildSystemBox(title, message) {
  return (
    `╭─❖〔 ${title} 〕❖─\n` +
    `│\n` +
    `╰─────────────────────\n\n` +
    `${message}`
  )
}

module.exports = {
  normalizeNumber,
  isValidNumber,
  startConfess,
  getActiveThread,
  stopThread,
  buildConfessBox,
  buildRelayBox,
  buildSystemBox,
}