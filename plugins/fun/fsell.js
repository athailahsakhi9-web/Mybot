const { getInv, setInv }                           = require(__dirname + '/fishInv')
const { FISH_LIST, RARITY_COLOR, getLevelFromExp } = require(__dirname + '/fishData')

module.exports = {
  config: {
    name: 'fsell',
    alias: ['jualikan', 'fishsell'],
    category: 'fun',
    description: 'Jual ikan dari inventory',
    usage: '.fsell all | .fsell <nama ikan>',
    example: '.fsell all',
    isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
    cooldown: 3, isEnabled: true,
  },

  async handler(m, { db }) {
    const sender = m.sender
    const text   = m.text?.trim().toLowerCase()
    const inv    = getInv(sender)
    const user   = db.getUser(sender) || {}
    const items  = Object.entries(inv.items || {})

    if (!text) {
      return m.reply(
        `💰 *JUAL IKAN*\n\n` +
        `> \`.fsell all\` — jual semua ikan\n` +
        `> \`.fsell <nama>\` — jual satu jenis\n\n` +
        `Contoh: \`.fsell ikan mas\``
      )
    }

    if (items.length === 0) return m.reply('❌ Inventory kosong! Mancing dulu dengan `.fishing`')

    await m.react('⌛')

    if (text === 'all' || text === 'semua') {
      let totalKoin = 0, totalExp = 0, totalItem = 0
      const detail = []

      for (const [id, data] of items) {
        const fish = FISH_LIST.find(f => f.id === id)
        if (!fish) continue
        const earn = fish.price * data.count
        const exp  = Math.floor(fish.exp * 0.5) * data.count
        totalKoin += earn; totalExp += exp; totalItem += data.count
        detail.push(`${RARITY_COLOR[fish.rarity]} ${fish.name} ×${data.count} = Rp ${earn.toLocaleString('id-ID')}`)
      }

      inv.items = {}
      setInv(sender, inv)

      const prevExp  = user.fishExp || 0
      const newExp   = prevExp + totalExp
      const lvBefore = getLevelFromExp(prevExp)
      const lvAfter  = getLevelFromExp(newExp)
      const newKoin  = (user.koin || 0) + totalKoin
      db.setUser(sender, { koin: newKoin, fishExp: newExp })

      const levelUpMsg = lvAfter.level > lvBefore.level
        ? `\n\n🎉 *LEVEL UP! ${lvBefore.level} → ${lvAfter.level}*` : ''

      await m.react('✅')
      return m.reply(
        `💰 *JUAL SEMUA IKAN*\n\n` +
        detail.join('\n') +
        `\n\n────────────────\n` +
        `┃ 🐟 Total: *${totalItem} ekor*\n` +
        `┃ 💰 Dapat: *Rp ${totalKoin.toLocaleString('id-ID')}*\n` +
        `┃ ⭐ EXP: *+${totalExp}*\n` +
        `┃ 💼 Koin: *Rp ${newKoin.toLocaleString('id-ID')}*` +
        levelUpMsg
      )
    }

    const fish = FISH_LIST.find(f =>
      f.name.toLowerCase().includes(text) || f.id.replace(/_/g, ' ').includes(text)
    )
    if (!fish) return m.reply(`❌ Ikan "*${text}*" tidak ditemukan.\n\n> Ketik \`.finv\` untuk lihat inventory.`)

    const invItem = inv.items[fish.id]
    if (!invItem || invItem.count <= 0) return m.reply(`❌ Kamu tidak punya *${fish.name}* di inventory.`)

    const earn    = fish.price * invItem.count
    const expGain = Math.floor(fish.exp * 0.5) * invItem.count
    const count   = invItem.count

    delete inv.items[fish.id]
    setInv(sender, inv)

    const prevExp  = user.fishExp || 0
    const newExp   = prevExp + expGain
    const lvBefore = getLevelFromExp(prevExp)
    const lvAfter  = getLevelFromExp(newExp)
    const newKoin  = (user.koin || 0) + earn
    db.setUser(sender, { koin: newKoin, fishExp: newExp })

    const levelUpMsg = lvAfter.level > lvBefore.level
      ? `\n\n🎉 *LEVEL UP! ${lvBefore.level} → ${lvAfter.level}*` : ''

    await m.react('✅')
    return m.reply(
      `💰 *JUAL IKAN*\n\n` +
      `${RARITY_COLOR[fish.rarity]} ${fish.name} ×${count}\n\n` +
      `┃ 💰 Dapat: *Rp ${earn.toLocaleString('id-ID')}*\n` +
      `┃ ⭐ EXP: *+${expGain}*\n` +
      `┃ 💼 Koin: *Rp ${newKoin.toLocaleString('id-ID')}*` +
      levelUpMsg
    )
  },
}
