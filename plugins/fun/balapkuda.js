const racesessions = new Map() // chatId → session

const pluginConfig = {
  name: 'balapkuda',
  alias: ['horse', 'balap', 'kuda'],
  category: 'fun',
  description: 'Balapan kuda, pilih kuda & taruhan koin!',
  usage: '.balapkuda <nomor_kuda> <taruhan>',
  example: '.balapkuda 3 5000',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  isEnabled: true,
}

const HORSES = [
  { id: 1, name: 'Thunder',  emoji: '🐎', speed: 7,  odds: 1.5 },
  { id: 2, name: 'Shadow',   emoji: '🐴', speed: 6,  odds: 2.0 },
  { id: 3, name: 'Blaze',    emoji: '🦄', speed: 5,  odds: 3.0 },
  { id: 4, name: 'Storm',    emoji: '🐎', speed: 4,  odds: 4.5 },
  { id: 5, name: 'Phantom',  emoji: '🐴', speed: 3,  odds: 7.0 },
]

const TRACK_LEN  = 12
const MIN_BET    = 100
const MAX_BET    = 50000

function fmt(n) {
  return 'Rp ' + Math.abs(Math.floor(n)).toLocaleString('id-ID')
}

// Simulate balapan — return posisi tiap kuda per step
function simulateRace() {
  const positions = HORSES.map(h => ({ ...h, pos: 0, finished: false, rank: 0 }))
  const steps     = []
  let finishRank  = 1

  while (positions.some(h => !h.finished)) {
    for (const h of positions) {
      if (h.finished) continue
      // Speed + random faktor
      const move = Math.floor(Math.random() * 3) + (h.speed > 5 ? 2 : h.speed > 3 ? 1 : 0)
      h.pos = Math.min(h.pos + move, TRACK_LEN)
      if (h.pos >= TRACK_LEN && !h.finished) {
        h.finished = true
        h.rank     = finishRank++
      }
    }
    steps.push(positions.map(h => ({ ...h })))
  }

  return { positions, steps }
}

function renderTrack(positions, highlight = -1) {
  let text = ''
  for (const h of positions) {
    const track   = '─'.repeat(Math.min(h.pos, TRACK_LEN))
    const empty   = '─'.repeat(Math.max(TRACK_LEN - h.pos, 0))
    const isWin   = h.rank === 1
    const marker  = h.finished ? (isWin ? '🏆' : '🏁') : h.emoji
    const arrow   = highlight === h.id ? '◀' : ''
    text += `${h.id}. [${track}${marker}${empty}] ${h.name}${arrow}\n`
  }
  return text
}

async function handler(m, { sock, db }) {
  const sender = m.sender
  const chat   = m.chat
  const args   = m.args || []
  const sub    = args[0]?.toLowerCase()

  const user = db.getUser(sender) || {}
  const koin = user.koin || 0

  // ── Info/Help ─────────────────────────────────────────────────
  if (!sub || sub === 'info' || sub === 'help') {
    let horseList = HORSES.map(h =>
      `${h.id}. ${h.emoji} *${h.name}* — Odds: ×${h.odds} | Speed: ${'⚡'.repeat(h.speed > 5 ? 3 : h.speed > 3 ? 2 : 1)}`
    ).join('\n')

    return m.reply(
      `🏇 *BALAPAN KUDA*\n\n` +
      `Pilih kuda & taruhan, siapa yang menang?\n\n` +
      `*Daftar Kuda:*\n${horseList}\n\n` +
      `*Usage:*\n` +
      `> \`.balapkuda <nomor> <taruhan>\`\n\n` +
      `Contoh: \`.balapkuda 3 5000\`\n\n` +
      `┃ 💰 Koin kamu: *${fmt(koin)}*\n` +
      `┃ Min bet: *${fmt(MIN_BET)}* | Max: *${fmt(MAX_BET)}*`
    )
  }

  // ── Mulai balapan ─────────────────────────────────────────────
  const horseId = parseInt(sub)
  const bet     = parseInt((args[1] || '').replace(/[^0-9]/g, ''))

  if (isNaN(horseId) || horseId < 1 || horseId > 5) {
    return m.reply(`❌ Nomor kuda tidak valid! (1-5)\n\nContoh: \`.balapkuda 2 5000\``)
  }

  if (isNaN(bet) || bet <= 0) {
    return m.reply(`❌ Masukkan jumlah taruhan!\n\nContoh: \`.balapkuda ${horseId} 5000\``)
  }

  if (bet < MIN_BET) return m.reply(`❌ Minimal taruhan *${fmt(MIN_BET)}*`)
  if (bet > MAX_BET) return m.reply(`❌ Maksimal taruhan *${fmt(MAX_BET)}*`)
  if (koin < bet)    return m.reply(`❌ Koin tidak cukup!\n\n┃ Koin: *${fmt(koin)}*\n┃ Taruhan: *${fmt(bet)}*`)

  // Cek ada race aktif
  if (racesessions.has(chat + sender)) {
    return m.reply(`⏳ Masih ada balapan yang berjalan!`)
  }

  racesessions.set(chat + sender, true)

  const horse    = HORSES.find(h => h.id === horseId)
  const { positions, steps } = simulateRace()
  const winner   = positions.find(h => h.rank === 1)
  const playerWin = winner.id === horseId

  await m.react('🏇')

  // Kirim state awal
  await sock.sendMessage(chat, {
    text:
      `🏇 *BALAPAN DIMULAI!*\n\n` +
      `🎯 Pilihan kamu: *${horse.emoji} ${horse.name}* (Kuda ${horseId})\n` +
      `💰 Taruhan: *${fmt(bet)}*\n\n` +
      `${renderTrack(HORSES.map(h => ({ ...h, pos: 0, finished: false, rank: 0 })))}\n` +
      `> Balapan sedang berlangsung...`
  }, { quoted: m })

  // Animasi pertengahan (ambil step tengah)
  await new Promise(r => setTimeout(r, 1500))
  const midStep = steps[Math.floor(steps.length / 2)]
  await sock.sendMessage(chat, {
    text:
      `🏇 *SEDANG BERLARI...*\n\n` +
      `${renderTrack(midStep, horseId)}`
  })

  await new Promise(r => setTimeout(r, 1500))

  // Hasil akhir
  const finalTrack = renderTrack(positions, horseId)
  const rank1 = positions.find(h => h.rank === 1)
  const rank2 = positions.find(h => h.rank === 2)
  const rank3 = positions.find(h => h.rank === 3)

  const podium =
    `🥇 *${rank1.name}*\n` +
    `🥈 *${rank2.name}*\n` +
    `🥉 *${rank3.name}*`

  // Hitung kemenangan
  const winAmount = playerWin ? Math.floor(bet * horse.odds) : 0
  const netChange = playerWin ? winAmount - bet : -bet
  const newKoin   = koin + netChange

  db.setUser(sender, {
    koin:         newKoin,
    raceWin:      (user.raceWin  || 0) + (playerWin ? 1 : 0),
    raceLose:     (user.raceLose || 0) + (playerWin ? 0 : 1),
    raceTotal:    (user.raceTotal|| 0) + 1,
  })

  racesessions.delete(chat + sender)

  const resultMsg = playerWin
    ? `🎉 *KUDA KAMU MENANG!*\n\n┃ Odds: *×${horse.odds}*\n┃ Menang: *+${fmt(winAmount)}*`
    : `😞 *KUDA KAMU KALAH!*\n\n┃ Pemenang: *${winner.emoji} ${winner.name}*`

  const koinMsg = playerWin
    ? `┃ Koin: *${fmt(koin)}* → *${fmt(newKoin)}* (+${fmt(netChange)})`
    : `┃ Koin: *${fmt(koin)}* → *${fmt(newKoin)}* (-${fmt(bet)})`

  await m.react(playerWin ? '✅' : '❌')

  await sock.sendMessage(chat, {
    text:
      `🏁 *FINISH!*\n\n` +
      `${finalTrack}\n` +
      `*Podium:*\n${podium}\n\n` +
      `────────────────\n` +
      `${resultMsg}\n\n` +
      `${koinMsg}\n` +
      `┃ 📊 Main: ${(user.raceTotal||0)+1}x | Menang: ${(user.raceWin||0)+(playerWin?1:0)}x`
  }, { quoted: m })
}

module.exports = { config: pluginConfig, handler }
