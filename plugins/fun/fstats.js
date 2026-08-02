const { getInv }                                                     = require(__dirname + '/fishInv')
const { FISH_LIST, RARITY_COLOR, getLevelFromExp, SHOP_ITEMS }       = require(__dirname + '/fishData')

module.exports = {
  config: {
    name: 'fstats',
    alias: ['fishstats', 'pancingku'],
    category: 'fun',
    description: 'Lihat statistik memancing kamu',
    usage: '.fstats',
    example: '.fstats',
    isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
    cooldown: 3, isEnabled: true,
  },

  async handler(m, { db }) {
    const sender = m.sender
    const inv    = getInv(sender)
    const user   = db.getUser(sender) || {}
    const lv     = getLevelFromExp(user.fishExp || 0)
    const koin   = user.koin || 0

    const pancingData = SHOP_ITEMS.find(s => s.id === inv.pancing)
    const umpanData   = inv.umpan ? SHOP_ITEMS.find(s => s.id === inv.umpan) : null
    const items       = Object.entries(inv.items || {})

    const rarityCount = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, secret: 0 }
    let totalFish = 0
    for (const [id, data] of items) {
      const fish = FISH_LIST.find(f => f.id === id)
      if (fish) { rarityCount[fish.rarity] = (rarityCount[fish.rarity] || 0) + data.count; totalFish += data.count }
    }

    const barLen = 10
    const filled = Math.round((lv.current / lv.needed) * barLen)
    const bar    = '█'.repeat(filled) + '░'.repeat(barLen - filled)

    let rarityText = ''
    for (const [r, count] of Object.entries(rarityCount)) {
      if (count > 0) rarityText += `${RARITY_COLOR[r]} ${r}: *${count}*\n`
    }

    return m.reply(
      `📊 *STATISTIK MANCING*\n\n` +
      `👤 *${m.pushName || 'Pemancing'}*\n` +
      `🏅 Level: *${lv.level}*\n` +
      `⭐ EXP: \`${bar}\` ${lv.current}/${lv.needed}\n` +
      `💰 Koin: *Rp ${koin.toLocaleString('id-ID')}*\n\n` +
      `🎣 Pancing: *${pancingData?.name || 'Pancing Dasar'}*\n` +
      (umpanData ? `🪱 Umpan: *${umpanData.name}* (sisa ${inv.umpanUses}x)\n` : '') +
      `\n🐟 *Koleksi (${totalFish} ekor)*\n` +
      (rarityText || '> Belum ada ikan\n') +
      `\n> \`.fishing\` mancing | \`.finv\` inventory | \`.fshop\` toko`
    )
  },
}
