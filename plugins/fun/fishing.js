const { getRandomFish, RARITY_COLOR, getLevelFromExp, SHOP_ITEMS } = require(__dirname + '/fishData')
const { getInv, setInv, addItem }                                   = require(__dirname + '/fishInv')

const cooldowns = new Map()
const COOLDOWN_MS = 10000

module.exports = {
  config: {
    name: 'fishing',
    alias: ['mancing', 'pancing'],
    category: 'fun',
    description: 'Mancing ikan, kumpulkan koleksi, jual buat duit!',
    usage: '.fishing',
    example: '.fishing',
    isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
    cooldown: 0, isEnabled: true,
  },

  async handler(m, { db }) {
    const sender = m.sender
    const now    = Date.now()
    const last   = cooldowns.get(sender) || 0
    const diff   = now - last

    if (diff < COOLDOWN_MS) {
      const sisa = Math.ceil((COOLDOWN_MS - diff) / 1000)
      return m.reply(`🎣 Pancing masih di air...\n\n> Tunggu *${sisa} detik* lagi!`)
    }

    await m.react('🎣')

    const inv  = getInv(sender)
    const user = db.getUser(sender) || {}

    const pancingData  = SHOP_ITEMS.find(s => s.id === inv.pancing)
    const pancingBonus = pancingData?.bonus || 0

    let umpanBonus = 0
    if (inv.umpan && inv.umpanUses > 0) {
      const umpanData = SHOP_ITEMS.find(s => s.id === inv.umpan)
      umpanBonus = umpanData?.bonus || 0
      inv.umpanUses--
      if (inv.umpanUses <= 0) { inv.umpan = null; inv.umpanUses = 0 }
      setInv(sender, inv)
    }

    const fish    = getRandomFish(pancingBonus, umpanBonus)
    addItem(sender, fish.id, fish.name)

    const prevExp  = user.fishExp || 0
    const newExp   = prevExp + fish.exp
    const lvBefore = getLevelFromExp(prevExp)
    const lvAfter  = getLevelFromExp(newExp)
    db.setUser(sender, { fishExp: newExp })

    cooldowns.set(sender, now)

    const levelUpMsg = lvAfter.level > lvBefore.level
      ? `\n\n🎉 *LEVEL UP! ${lvBefore.level} → ${lvAfter.level}*` : ''
    const umpanMsg = umpanBonus > 0
      ? `\n┃ ✨ Umpan aktif: *+${umpanBonus}% bonus* (sisa ${inv.umpanUses}x)` : ''

    await m.react('✅')
    return m.reply(
      `🎣 *MANCING*\n\n` +
      `${RARITY_COLOR[fish.rarity]} Dapat: *${fish.name}*\n` +
      `┃ 💎 Rarity: *${fish.rarity.toUpperCase()}*\n` +
      `┃ 💰 Harga jual: *Rp ${fish.price.toLocaleString('id-ID')}*\n` +
      `┃ ⭐ EXP: *+${fish.exp}*${umpanMsg}\n\n` +
      `┃ 📊 Level: *${lvAfter.level}* (${lvAfter.current}/${lvAfter.needed} EXP)` +
      levelUpMsg + `\n\n` +
      `> \`.finv\` lihat inventory | \`.fsell all\` jual semua`
    )
  },
}
