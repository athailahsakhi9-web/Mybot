const pluginConfig = {
  name: 'slot',
  alias: ['slotmachine', 'mesinslot'],
  category: 'fun',
  description: 'Main mesin slot, taruhan koin!',
  usage: '.slot <jumlah_taruhan>',
  example: '.slot 1000',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  isEnabled: true,
}

const SYMBOLS = [
  { emoji: '🍒', name: 'Cherry',     weight: 35, multiplier: 2   },
  { emoji: '🍋', name: 'Lemon',      weight: 30, multiplier: 3   },
  { emoji: '🍊', name: 'Orange',     weight: 25, multiplier: 4   },
  { emoji: '🍇', name: 'Grape',      weight: 20, multiplier: 5   },
  { emoji: '🔔', name: 'Bell',       weight: 15, multiplier: 8   },
  { emoji: '💎', name: 'Diamond',    weight: 8,  multiplier: 15  },
  { emoji: '7️⃣', name: 'Seven',     weight: 5,  multiplier: 25  },
  { emoji: '🌟', name: 'Star',       weight: 3,  multiplier: 50  },
  { emoji: '👑', name: 'Crown',      weight: 1,  multiplier: 100 },
]

const MIN_BET = 100
const MAX_BET = 100000

function weightedRandom() {
  const total = SYMBOLS.reduce((s, sym) => s + sym.weight, 0)
  let rand = Math.random() * total
  for (const sym of SYMBOLS) {
    rand -= sym.weight
    if (rand <= 0) return sym
  }
  return SYMBOLS[0]
}

function spin() {
  return [weightedRandom(), weightedRandom(), weightedRandom()]
}

function evalResult(reels, bet) {
  const [a, b, c] = reels

  // Jackpot: 3 sama
  if (a.emoji === b.emoji && b.emoji === c.emoji) {
    return {
      type: 'jackpot',
      label: '🎉 JACKPOT! 3 sama!',
      multiplier: a.multiplier * 3,
      win: true,
    }
  }

  // 2 sama di kiri
  if (a.emoji === b.emoji) {
    return {
      type: 'pair_left',
      label: '✨ 2 sama!',
      multiplier: Math.floor(a.multiplier * 0.5),
      win: true,
    }
  }

  // 2 sama di kanan
  if (b.emoji === c.emoji) {
    return {
      type: 'pair_right',
      label: '✨ 2 sama!',
      multiplier: Math.floor(b.multiplier * 0.5),
      win: true,
    }
  }

  // 2 sama kiri-kanan
  if (a.emoji === c.emoji) {
    return {
      type: 'pair_outer',
      label: '✨ 2 sama!',
      multiplier: Math.floor(a.multiplier * 0.3),
      win: true,
    }
  }

  // Semua simbol premium (bell ke atas) walau beda → small win
  const premiumEmojis = ['🔔','💎','7️⃣','🌟','👑']
  if (reels.every(r => premiumEmojis.includes(r.emoji))) {
    return {
      type: 'premium',
      label: '💫 Lucky Premium!',
      multiplier: 1.5,
      win: true,
    }
  }

  return {
    type: 'lose',
    label: '😞 Tidak menang',
    multiplier: 0,
    win: false,
  }
}

function formatRupiah(n) {
  return 'Rp ' + Math.abs(n).toLocaleString('id-ID')
}

// Animasi spin (3 fase teks)
function spinFrames(reels) {
  const rand = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].emoji
  return [
    `[ ${rand()} | ${rand()} | ${rand()} ]`,
    `[ ${rand()} | ${rand()} | ${rand()} ]`,
    `[ ${reels[0].emoji} | ${reels[1].emoji} | ${reels[2].emoji} ]`,
  ]
}

async function handler(m, { sock, db }) {
  const sender = m.sender
  const args   = m.args || []
  const input  = args[0]

  const user = db.getUser(sender) || {}
  const koin = user.koin || 0

  if (!input) {
    return m.reply(
      `🎰 *SLOT MACHINE*\n\n` +
      `Usage: \`.slot <taruhan>\`\n\n` +
      `┃ Min taruhan: *${formatRupiah(MIN_BET)}*\n` +
      `┃ Max taruhan: *${formatRupiah(MAX_BET)}*\n` +
      `┃ Koin kamu: *${formatRupiah(koin)}*\n\n` +
      `*Simbol & Multiplier:*\n` +
      SYMBOLS.map(s => `${s.emoji} ×${s.multiplier}`).join('  ') +
      `\n\n> Jackpot (3 sama) = multiplier ×3!`
    )
  }

  // Parse taruhan
  let bet = parseInt(input.replace(/[^0-9]/g, ''))
  if (isNaN(bet) || bet <= 0) return m.reply('❌ Taruhan tidak valid!\nContoh: `.slot 1000`')
  if (bet < MIN_BET) return m.reply(`❌ Taruhan minimal *${formatRupiah(MIN_BET)}*`)
  if (bet > MAX_BET) return m.reply(`❌ Taruhan maksimal *${formatRupiah(MAX_BET)}*`)
  if (koin < bet)    return m.reply(`❌ Koin tidak cukup!\n\n┃ Koin kamu: *${formatRupiah(koin)}*\n┃ Taruhan: *${formatRupiah(bet)}*`)

  await m.react('🎰')

  // Spin
  const reels  = spin()
  const result = evalResult(reels, bet)
  const frames = spinFrames(reels)

  // Hitung kemenangan
  const winAmount  = result.win ? Math.floor(bet * result.multiplier) : 0
  const netChange  = result.win ? winAmount - bet : -bet
  const newKoin    = koin + netChange

  // Update db
  db.setUser(sender, {
    koin: newKoin,
    slotWin:  (user.slotWin  || 0) + (result.win ? 1 : 0),
    slotLose: (user.slotLose || 0) + (result.win ? 0 : 1),
    slotTotal:(user.slotTotal|| 0) + 1,
  })

  // Build pesan
  const reelStr = `╔═══════════════╗\n║ ${reels[0].emoji}  ${reels[1].emoji}  ${reels[2].emoji} ║\n╚═══════════════╝`

  const resultLine = result.win
    ? `${result.label}\n┃ Multiplier: *×${result.multiplier}*\n┃ Menang: *+${formatRupiah(winAmount)}*`
    : `${result.label}`

  const koinLine = result.win
    ? `┃ Koin: *${formatRupiah(koin)}* → *${formatRupiah(newKoin)}* (+${formatRupiah(netChange)})`
    : `┃ Koin: *${formatRupiah(koin)}* → *${formatRupiah(newKoin)}* (-${formatRupiah(bet)})`

  await m.react(result.win ? '✅' : '❌')

  return m.reply(
    `🎰 *SLOT MACHINE*\n\n` +
    `${reelStr}\n\n` +
    `${resultLine}\n\n` +
    `┃ Taruhan: *${formatRupiah(bet)}*\n` +
    `${koinLine}\n\n` +
    `┃ 📊 Total main: ${user.slotTotal || 0}x | ` +
    `Menang: ${user.slotWin || 0}x | Kalah: ${user.slotLose || 0}x`
  )
}

module.exports = { config: pluginConfig, handler }
