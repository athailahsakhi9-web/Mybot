// plugins/user/profile.js — FINAL
// Pakai Jimp (pure JS, tidak butuh native binary)
// PP diambil → render ke card → kirim langsung sebagai buffer

const path     = require('path')
const fs       = require('fs')
const axios    = require('axios')
const Jimp     = require('jimp')

// ── Resolve target ────────────────────────────────────────────────
function resolveTarget(m) {
  if (m.mentionedJid?.length > 0) return m.mentionedJid[0]
  if (m.quoted?.sender) return m.quoted.sender
  for (const arg of (m.args || [])) {
    const clean = arg.replace(/^@/, '').replace(/[^0-9]/g, '')
    if (clean.length >= 8) return clean + '@s.whatsapp.net'
  }
  return m.sender
}

// ── Ensure user di DB ─────────────────────────────────────────────
function ensureUser(db, jid, name) {
  if (!db.getUser(jid)) {
    db.setUser(jid, {
      name: name || jid.split('@')[0],
      koin: 0, exp: 0, level: 1, energi: 10,
      joinedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isPremium: false, isBanned: false,
      rpg: { health: 100, maxHealth: 100, mana: 100, maxMana: 100, bank: 0, role: 'Warrior' },
    })
  }
  return db.getUser(jid) || {}
}

// ── Download PP ───────────────────────────────────────────────────
async function getPP(sock, jid) {
  try {
    const url = await sock.profilePictureUrl(jid, 'image')
    if (url) {
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 })
      return Buffer.from(res.data)
    }
  } catch (_) {}
  try {
    const fb = path.join(process.cwd(), 'assets', 'images', 'pp-kosong.jpg')
    if (fs.existsSync(fb)) return fs.readFileSync(fb)
  } catch (_) {}
  return null
}

// ── Warna hex → int Jimp ──────────────────────────────────────────
function hex(h) {
  const r = parseInt(h.slice(1,3),16)
  const g = parseInt(h.slice(3,5),16)
  const b = parseInt(h.slice(5,7),16)
  return Jimp.rgbaToInt(r, g, b, 255)
}

// ── Isi rectangle ─────────────────────────────────────────────────
function fillRect(img, x, y, w, h, color) {
  for (let i = x; i < x + w; i++)
    for (let j = y; j < y + h; j++)
      if (i >= 0 && j >= 0 && i < img.bitmap.width && j < img.bitmap.height)
        img.setPixelColor(color, i, j)
}

// ── Progress bar ──────────────────────────────────────────────────
function drawBar(img, x, y, w, h, pct, fillHex, bgHex) {
  fillRect(img, x, y, w, h, hex(bgHex))
  fillRect(img, x, y, Math.max(1, Math.floor(w * pct)), h, hex(fillHex))
}

// ── Teks ke gambar pakai Jimp.print ──────────────────────────────
async function txt(img, font, x, y, text, maxW) {
  await img.print(font, x, y, { text: String(text), alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT }, maxW || img.bitmap.width - x)
}

// ── Render card ───────────────────────────────────────────────────
async function renderCard(user, ppBuf, pushName, target, m) {
  const W = 720, H = 500

  // ── Buat kanvas kosong ────────────────────────────────────────
  const card = new Jimp(W, H, hex('#1a1040'))

  // ── Stripe atas (gradient imitasi: 3 blok) ────────────────────
  fillRect(card, 0,       0, W * 0.34, 6, hex('#7c3aed'))
  fillRect(card, W * 0.34, 0, W * 0.33, 6, hex('#4f46e5'))
  fillRect(card, W * 0.67, 0, W * 0.33, 6, hex('#2563eb'))

  // ── Panel kiri (PP area) ──────────────────────────────────────
  fillRect(card, 20, 20, 180, 460, hex('#12093a'))

  // ── PP: crop lingkaran manual ─────────────────────────────────
  const ppSize = 130
  const ppX    = 25, ppY = 30
  let ppImg = null

  if (ppBuf) {
    try {
      ppImg = await Jimp.read(ppBuf)
      ppImg.resize(ppSize, ppSize)
      // Buat mask lingkaran
      const mask = new Jimp(ppSize, ppSize, 0x00000000)
      const cx = ppSize / 2, cy = ppSize / 2, r = ppSize / 2 - 1
      for (let x = 0; x < ppSize; x++) {
        for (let y = 0; y < ppSize; y++) {
          if (Math.sqrt((x-cx)**2 + (y-cy)**2) <= r) {
            const px = ppImg.getPixelColor(x, y)
            mask.setPixelColor(px, x, y)
          }
        }
      }
      card.composite(mask, ppX, ppY)
    } catch (_) {
      ppImg = null
    }
  }

  if (!ppImg) {
    // Lingkaran warna solid jika PP gagal
    const cx = ppX + ppSize/2, cy = ppY + ppSize/2, r = ppSize/2
    for (let x = 0; x < ppSize; x++)
      for (let y = 0; y < ppSize; y++)
        if (Math.sqrt((x-ppSize/2)**2 + (y-ppSize/2)**2) <= r)
          card.setPixelColor(hex('#4c1d95'), ppX+x, ppY+y)
  }

  // Border lingkaran PP
  const cx0 = ppX + ppSize/2, cy0 = ppY + ppSize/2, r0 = ppSize/2
  for (let angle = 0; angle < 360; angle += 0.5) {
    const rad = angle * Math.PI / 180
    const bx = Math.round(cx0 + (r0+1)*Math.cos(rad))
    const by = Math.round(cy0 + (r0+1)*Math.sin(rad))
    if (bx>=0 && by>=0 && bx<W && by<H) card.setPixelColor(hex('#7c3aed'), bx, by)
  }

  // ── Status badge di bawah PP ──────────────────────────────────
  const isOwner   = m.isOwner
  const isPremium = user.isPremium
  const badgeColor = isOwner ? '#f59e0b' : isPremium ? '#8b5cf6' : '#3b82f6'
  fillRect(card, ppX + 15, ppY + ppSize + 12, ppSize - 30, 22, hex(badgeColor))

  // ── Load font ─────────────────────────────────────────────────
  const fontLg = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE)
  const fontMd = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE)
  const fontSm = await Jimp.loadFont(Jimp.FONT_SANS_14_BLACK)

  // Label badge
  const badgeLabel = isOwner ? 'OWNER' : isPremium ? 'PREMIUM' : 'REGULAR'
  await txt(card, fontSm, ppX + 18, ppY + ppSize + 14, badgeLabel, ppSize - 20)

  // Role
  const rpg  = user.rpg || {}
  const role = rpg.role || 'Warrior'
  await txt(card, fontMd, ppX + 5, ppY + ppSize + 45, '⚔ ' + role, 170)

  // ── Area kanan (stats) ────────────────────────────────────────
  const RX = 220

  // Nama
  const displayName = (pushName || target.split('@')[0]).slice(0, 18)
  await txt(card, fontLg, RX, 25, displayName, 480)

  // Nomor
  await txt(card, fontMd, RX, 68, '+' + target.split('@')[0], 480)

  // Divider
  fillRect(card, RX, 95, W - RX - 20, 2, hex('#7c3aed'))

  // ── Stat boxes (2 kolom) ──────────────────────────────────────
  const koin    = user.koin    ?? 0
  const bank    = rpg.bank     ?? 0
  const energi  = user.energi  ?? 10
  const exp     = user.exp     ?? 0
  const level   = user.level   ?? 1
  const health  = rpg.health   ?? 100
  const maxHp   = rpg.maxHealth ?? 100
  const mana    = rpg.mana     ?? 100
  const maxMana = rpg.maxMana  ?? 100
  const needed  = level * 500
  const expPct  = Math.min(exp / needed, 1)
  const hpPct   = health / maxHp
  const manaPct = mana / maxMana

  // Fungsi stat row
  async function statRow(y, label, value) {
    fillRect(card, RX, y, W - RX - 20, 38, hex('#12093a'))
    await txt(card, fontMd, RX + 8,  y + 4,  label, 200)
    await txt(card, fontMd, RX + 220, y + 4, String(value).slice(0, 18), 240)
  }

  await statRow(108, '  Koin',    koin.toLocaleString('id-ID'))
  await statRow(154, '  Bank',    bank.toLocaleString('id-ID'))
  await statRow(200, '  Energi',  energi)
  await statRow(246, '  Level',   `${level}  (${exp}/${needed} EXP)`)
  await statRow(292, '  HP',      `${health} / ${maxHp}`)
  await statRow(338, '  Mana',    `${mana} / ${maxMana}`)

  // ── Bar EXP ───────────────────────────────────────────────────
  await txt(card, fontMd, RX, 390, 'EXP  ' + Math.floor(expPct * 100) + '%', 480)
  drawBar(card, RX, 412, W - RX - 20, 12, expPct, '#7c3aed', '#2d1b69')

  // ── Bar HP ────────────────────────────────────────────────────
  await txt(card, fontMd, RX, 432, 'HP', 100)
  drawBar(card, RX + 30, 434, 200, 10, hpPct, '#ef4444', '#3b0000')

  // ── Bar Mana ─────────────────────────────────────────────────
  await txt(card, fontMd, RX + 250, 432, 'Mana', 100)
  drawBar(card, RX + 300, 434, 180, 10, manaPct, '#3b82f6', '#001a3b')

  // ── Footer ────────────────────────────────────────────────────
  fillRect(card, 0, H - 28, W, 28, hex('#0d0825'))
  const joined = user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('id-ID') : '-'
  await txt(card, fontMd, 20, H - 22, `Nexa Bot  •  Bergabung: ${joined}`, W - 40)

  return await card.getBufferAsync(Jimp.MIME_JPEG)
}

// ════════════════════════════════════════════════════════════════════
module.exports = {
  config: {
    name: 'profile',
    alias: ['me', 'profil', 'myprofile'],
    category: 'user',
    description: 'Lihat profil kamu atau profil user lain',
    usage: '[mention / reply / @628xxx]',
    isEnabled: true,
    cooldown: 5,
  },

  async handler(m, { sock, db }) {
    await m.react('⏳')

    const target   = resolveTarget(m)
    const isSelf   = target === m.sender
    const user     = ensureUser(db, target, isSelf ? m.pushName : null)
    const pushName = user.name || target.split('@')[0]

    // ── Ambil PP ─────────────────────────────────────────────────
    const ppBuf = await getPP(sock, target)

    // ── Render card ───────────────────────────────────────────────
    let cardBuf = null
    try {
      cardBuf = await renderCard(user, ppBuf, pushName, target, m)
    } catch (err) {
      console.error('[Profile] Render gagal:', err.message)
    }

    // ── Kirim ─────────────────────────────────────────────────────
    if (cardBuf) {
      try {
        await sock.sendMessage(m.chat, {
          image:    cardBuf,
          caption:  `> 🤖 _Nexa Bot — Profil @${target.split('@')[0]}_`,
          mentions: [target],
          mimetype: 'image/jpeg',
        }, { quoted: m })
        return await m.react('✅')
      } catch (err) {
        console.error('[Profile] Kirim gambar gagal:', err.message)
      }
    }

    // ── Fallback teks ─────────────────────────────────────────────
    const koin   = user.koin   ?? 0
    const exp    = user.exp    ?? 0
    const level  = user.level  ?? 1
    const needed = level * 500
    const pct    = Math.floor(Math.min(exp / needed, 1) * 10)
    const bar    = '█'.repeat(pct) + '░'.repeat(10 - pct)
    const rpg    = user.rpg || {}

    await m.reply(
      `✦ 𝗣𝗥𝗢𝗙𝗜𝗟 𝗡𝗘𝗫𝗔 ✦\n\n` +
      `👤 *${pushName}*\n📱 ${target.split('@')[0]}\n\n` +
      `🪙 Koin   » *${koin.toLocaleString('id-ID')}*\n` +
      `🏦 Bank   » *${(rpg.bank||0).toLocaleString('id-ID')}*\n` +
      `⚡ Energi » *${user.energi ?? 10}*\n\n` +
      `🎯 Level  » *${level}*\n` +
      `⭐ EXP    » *${exp}/${needed}*\n` +
      `[${bar}] ${Math.floor(Math.min(exp/needed,1)*100)}%\n\n` +
      `❤️ HP   » *${rpg.health??100}/${rpg.maxHealth??100}*\n` +
      `💙 Mana » *${rpg.mana??100}/${rpg.maxMana??100}*`
    )
    await m.react('✅')
  },
}
