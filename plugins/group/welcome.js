// ╔══════════════════════════════════════╗
// ║   NEXA BOT - WELCOME (welcome.js)    ║
// ╚══════════════════════════════════════╝

const path  = require('path')
const fs    = require('fs')
const axios = require('axios')
const Jimp  = require('jimp')

const THUMB_URL = 'https://api.nexadev.my.id/uploder/uploads/GdgDTI.jpg'

async function fetchBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 })
  return Buffer.from(res.data)
}

async function getPP(sock, jid) {
  try {
    const url = await sock.profilePictureUrl(jid, 'image')
    if (url) return await fetchBuffer(url)
  } catch (_) {}
  try {
    const fb = path.join(process.cwd(), 'assets', 'images', 'pp-kosong.jpg')
    if (fs.existsSync(fb)) return fs.readFileSync(fb)
  } catch (_) {}
  return null
}

function hexColor(h, a = 255) {
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  return Jimp.rgbaToInt(r, g, b, a)
}

function fillRect(img, x, y, w, h, color) {
  for (let i = x; i < x + w; i++)
    for (let j = y; j < y + h; j++)
      if (i >= 0 && j >= 0 && i < img.bitmap.width && j < img.bitmap.height)
        img.setPixelColor(color, i, j)
}

function drawCircleBorder(img, cx, cy, r, color, thickness = 3) {
  for (let t = 0; t < thickness; t++) {
    for (let a = 0; a < 360; a += 0.2) {
      const rad = a * Math.PI / 180
      const bx  = Math.round(cx + (r + t) * Math.cos(rad))
      const by  = Math.round(cy + (r + t) * Math.sin(rad))
      if (bx >= 0 && by >= 0 && bx < img.bitmap.width && by < img.bitmap.height)
        img.setPixelColor(color, bx, by)
    }
  }
}

async function circleAvatar(ppBuf, size) {
  const img  = await Jimp.read(ppBuf)
  img.resize(size, size).quality(90)
  const out  = new Jimp(size, size, 0x00000000)
  const c    = size / 2
  const rMax = c - 1
  for (let x = 0; x < size; x++)
    for (let y = 0; y < size; y++)
      if (Math.sqrt((x - c) ** 2 + (y - c) ** 2) <= rMax)
        out.setPixelColor(img.getPixelColor(x, y), x, y)
  return out
}

function splitLines(text, maxLen) {
  const words = text.split(' ')
  const lines = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxLen) {
      if (cur) lines.push(cur.trim())
      cur = w
    } else {
      cur = (cur + ' ' + w).trim()
    }
  }
  if (cur) lines.push(cur.trim())
  return lines
}

async function renderWelcome({ groupName, memberName, memberNumber, memberCount, ppBuf, thumbBuf }) {
  const W = 900, H = 420

  // ── Base background ──────────────────────────────────────────
  let card
  if (thumbBuf) {
    card = await Jimp.read(thumbBuf)
    card.resize(W, H).blur(8)
    card.composite(new Jimp(W, H, hexColor('#000000', 175)), 0, 0)
  } else {
    card = new Jimp(W, H, hexColor('#0f0c29'))
  }

  // ── Garis tepi dekorasi ───────────────────────────────────────
  // Top bar gradient
  const seg = Math.floor(W / 3)
  fillRect(card, 0,       0, seg,     4, hexColor('#e11d48'))
  fillRect(card, seg,     0, seg,     4, hexColor('#f97316'))
  fillRect(card, seg * 2, 0, W - seg * 2, 4, hexColor('#eab308'))
  // Bottom bar
  fillRect(card, 0,       H - 4, seg,     4, hexColor('#eab308'))
  fillRect(card, seg,     H - 4, seg,     4, hexColor('#f97316'))
  fillRect(card, seg * 2, H - 4, W - seg * 2, 4, hexColor('#e11d48'))
  // Left bar
  fillRect(card, 0, 0, 4, H, hexColor('#e11d48'))
  // Right bar
  fillRect(card, W - 4, 0, 4, H, hexColor('#e11d48'))

  // ── Panel kiri (avatar area) ──────────────────────────────────
  const PW = 240
  card.composite(new Jimp(PW, H, hexColor('#000000', 120)), 0, 0)
  // Garis pemisah kanan panel
  fillRect(card, PW, 4, 2, H - 8, hexColor('#e11d48', 200))

  // ── Avatar PP ────────────────────────────────────────────────
  const AVS  = 150
  const avX  = Math.floor((PW - AVS) / 2)
  const avY  = 60

  if (ppBuf) {
    try {
      const avatar = await circleAvatar(ppBuf, AVS)
      card.composite(avatar, avX, avY)
    } catch (_) {
      fillRect(card, avX, avY, AVS, AVS, hexColor('#7f1d1d'))
    }
  } else {
    // Lingkaran abu default
    const cx = avX + AVS / 2, cy = avY + AVS / 2
    for (let x = 0; x < AVS; x++)
      for (let y = 0; y < AVS; y++)
        if (Math.sqrt((x - AVS/2)**2 + (y - AVS/2)**2) <= AVS/2 - 1)
          card.setPixelColor(hexColor('#374151'), avX + x, avY + y)
  }

  // Ring emas luar
  drawCircleBorder(card, avX + AVS/2, avY + AVS/2, AVS/2,     hexColor('#eab308'), 4)
  // Ring merah lebih luar
  drawCircleBorder(card, avX + AVS/2, avY + AVS/2, AVS/2 + 7, hexColor('#e11d48', 160), 2)

  // ── Member count badge ────────────────────────────────────────
  const badgeW = 160, badgeH = 28
  const badgeX = Math.floor((PW - badgeW) / 2)
  const badgeY = avY + AVS + 16
  fillRect(card, badgeX, badgeY, badgeW, badgeH, hexColor('#e11d48', 220))
  // Border badge
  fillRect(card, badgeX,              badgeY,              badgeW, 1, hexColor('#eab308'))
  fillRect(card, badgeX,              badgeY + badgeH - 1, badgeW, 1, hexColor('#eab308'))
  fillRect(card, badgeX,              badgeY,              1, badgeH, hexColor('#eab308'))
  fillRect(card, badgeX + badgeW - 1, badgeY,              1, badgeH, hexColor('#eab308'))

  const fSm = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE)
  await card.print(fSm, badgeX, badgeY + 6,
    { text: `Anggota ke-${memberCount}`, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, badgeW
  )

  // ── Nomor WA di bawah badge ───────────────────────────────────
  await card.print(fSm, 0, badgeY + badgeH + 10,
    { text: `+${memberNumber}`, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, PW
  )

  // ── Area kanan ────────────────────────────────────────────────
  const RX = PW + 20
  const RW = W - RX - 20

  const fXl = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE)
  const fLg = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE)

  // ── Nama Group (header) ───────────────────────────────────────
  // Background nama group
  fillRect(card, RX - 4, 12, RW + 4, 50, hexColor('#000000', 140))
  fillRect(card, RX - 4, 12, 4, 50, hexColor('#eab308'))

  const gLabel = groupName.length > 24 ? groupName.slice(0, 24) + '…' : groupName
  await card.print(fXl, RX + 8, 18,
    { text: gLabel, alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT }, RW - 8
  )

  // Divider
  fillRect(card, RX, 68, RW, 1, hexColor('#ffffff', 50))

  // ── WELCOME banner ────────────────────────────────────────────
  fillRect(card, RX - 4, 76, RW + 4, 32, hexColor('#e11d48', 200))
  fillRect(card, RX - 4, 76, 4, 32, hexColor('#eab308'))
  await card.print(fLg, RX + 8, 83,
    { text: 'SELAMAT DATANG DI GRUP!', alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT }, RW
  )

  // ── Nama member ───────────────────────────────────────────────
  const nLabel = memberName.length > 22 ? memberName.slice(0, 22) + '…' : memberName
  await card.print(fXl, RX, 118,
    { text: nLabel, alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT }, RW
  )

  // Divider tipis
  fillRect(card, RX, 162, RW, 1, hexColor('#ffffff', 40))

  // ── Pesan welcome ─────────────────────────────────────────────
  const msg   = `Halo ${memberName}! Selamat bergabung di ${groupName}. Semoga betah dan patuhi peraturan grup ya!`
  const lines = splitLines(msg, 44)
  let lineY   = 172
  for (const line of lines.slice(0, 5)) {
    await card.print(fLg, RX, lineY,
      { text: line, alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT }, RW
    )
    lineY += 22
  }

  // ── Dekorasi pojok (diamond kecil) ────────────────────────────
  const diamonds = [
    [12, 12], [W - 16, 12], [12, H - 16], [W - 16, H - 16]
  ]
  for (const [dx, dy] of diamonds) {
    fillRect(card, dx - 4, dy,     8, 1, hexColor('#eab308'))
    fillRect(card, dx,     dy - 4, 1, 8, hexColor('#eab308'))
  }

  // ── Footer ────────────────────────────────────────────────────
  fillRect(card, 4, H - 32, W - 8, 24, hexColor('#000000', 180))
  fillRect(card, 4, H - 32, W - 8, 1,  hexColor('#e11d48', 160))
  const fFoot = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE)
  await card.print(fFoot, 16, H - 26,
    { text: `Nexa Bot  •  ${groupName}  •  ${memberCount} anggota`, alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT },
    W - 32
  )

  return await card.getBufferAsync(Jimp.MIME_JPEG)
}

// ── Send welcome ─────────────────────────────────────────────────
async function sendWelcomeMessage(sock, groupJid, participantJid, groupMeta) {
  const { getDatabase } = require('../../src/lib/database')
  const db        = getDatabase()
  const groupData = db.getGroup(groupJid) || {}
  if (groupData.welcome === false) return

  // Ambil nama bersih (bukan JID)
  let memberName = participantJid.split('@')[0]
  const memberNumber = memberName  // nomor tanpa @s.whatsapp.net

  try {
    const contact = await sock.onWhatsApp(participantJid)
    // Coba ambil nama dari metadata grup
    const participant = groupMeta?.participants?.find(p =>
      (p.id || p.jid) === participantJid
    )
    if (participant?.notify) memberName = participant.notify
    else if (participant?.name) memberName = participant.name
  } catch (_) {}

  const groupName   = groupMeta?.subject || 'Grup'
  const memberCount = groupMeta?.participants?.length || 1

  let ppBuf = null
  try { ppBuf = await getPP(sock, participantJid) } catch (_) {}

  let thumbBuf = null
  try { thumbBuf = await fetchBuffer(THUMB_URL) } catch (_) {}

  let cardBuf = null
  try {
    cardBuf = await renderWelcome({
      groupName,
      memberName,
      memberNumber,
      memberCount,
      ppBuf,
      thumbBuf,
    })
  } catch (err) {
    console.error('[Welcome] Render gagal:', err.message)
  }

  const caption =
    `👋 *Selamat Datang!*\n\n` +
    `> Halo @${memberNumber}, selamat bergabung di *${groupName}*!\n` +
    `> Kamu adalah member ke-*${memberCount}*\n\n` +
    `> Patuhi aturan grup & selamat berkenalan! 🎉`

  if (cardBuf) {
    await sock.sendMessage(groupJid, {
      image:    cardBuf,
      caption,
      mentions: [participantJid],
      mimetype: 'image/jpeg',
    })
  } else {
    await sock.sendMessage(groupJid, {
      text: caption,
      mentions: [participantJid],
    })
  }
}

// ════════════════════════════════════════════════════════════════════
module.exports = {
  config: {
    name: 'setwelcome',
    alias: ['welcome'],
    category: 'group',
    description: 'Atur pesan welcome grup',
    usage: '[on/off]',
    isGroup: true,
    isAdmin: true,
    isEnabled: true,
    cooldown: 5,
  },

  async handler(m, { db }) {
    const arg = m.args[0]?.toLowerCase()
    if (!arg || !['on', 'off'].includes(arg)) {
      const groupData = db.getGroup(m.chat) || {}
      const status    = groupData.welcome !== false ? 'on' : 'off'
      return m.reply(
        `⚙️ *SET WELCOME*\n\n` +
        `Usage: \`${m.prefix}setwelcome [on/off]\`\n` +
        `Status saat ini: *${status}*`
      )
    }
    db.setGroup(m.chat, { welcome: arg === 'on' })
    await m.react('✅')
    await m.reply(`✅ *Welcome ${arg === 'on' ? 'diaktifkan' : 'dinonaktifkan'}!*`)
  },

  sendWelcomeMessage,
}
