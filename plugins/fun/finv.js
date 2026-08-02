const { getInv }                                                    = require(__dirname + '/fishInv')
const { FISH_LIST, RARITY_COLOR, getLevelFromExp, SHOP_ITEMS }      = require(__dirname + '/fishData')

module.exports = {
  config: {
    name: 'finv',
    alias: ['fishinv', 'kantongan'],
    category: 'fun',
    description: 'Lihat inventory ikan',
    usage: '.finv',
    example: '.finv',
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

    if (items.length === 0) {
      return m.reply(
        `🎒 *INVENTORY MANCING*\n\n` +
        `📊 Level: *${lv.level}* (${lv.current}/${lv.needed} EXP)\n` +
        `💰 Koin: *Rp ${koin.toLocaleString('id-ID')}*\n` +
        `🎣 Pancing: *${pancingData?.name || 'Pancing Dasar'}*\n\n` +
        `> Inventory kosong! Mulai mancing dengan \`.fishing\``
      )
    }

    const grouped = { secret: [], legendary: [], epic: [], rare: [], uncommon: [], common: [] }
    for (const [id, data] of items) {
      const fish = FISH_LIST.find(f => f.id === id)
      if (fish) grouped[fish.rarity]?.push({ ...fish, count: data.count })
    }

    let invText = ''
    for (const [rarity, fishes] of Object.entries(grouped)) {
      if (!fishes.length) continue
      invText += `\n${RARITY_COLOR[rarity]} *${rarity.toUpperCase()}*\n`
      for (const f of fishes) {
        invText += `┃ ${f.name} ×${f.count} — Rp ${f.price.toLocaleString('id-ID')}/ekor\n`
      }
    }

    const totalVal = items.reduce((s, [id, d]) => {
      const f = FISH_LIST.find(f => f.id === id)
      return s + (f?.price || 0) * d.count
    }, 0)

    return m.reply(
      `🎒 *INVENTORY MANCING*\n` +
      `📊 Level: *${lv.level}* (${lv.current}/${lv.needed} EXP)\n` +
      `💰 Koin: *Rp ${koin.toLocaleString('id-ID')}*\n` +
      `🎣 Pancing: *${pancingData?.name || 'Pancing Dasar'}*\n` +
      (umpanData ? `🪱 Umpan: *${umpanData.name}* (sisa ${inv.umpanUses}x)\n` : '') +
      `\n────────────────\n` + invText +
      `────────────────\n` +
      `💎 Total nilai: *Rp ${totalVal.toLocaleString('id-ID')}*\n\n` +
      `> \`.fsell all\` jual semua | \`.fshop\` beli pancing`
    )
  },
}
