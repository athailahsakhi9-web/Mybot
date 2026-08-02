const { getInv, setInv }           = require(__dirname + '/fishInv')
const { SHOP_ITEMS }               = require(__dirname + '/fishData')

module.exports = {
  config: {
    name: 'fshop',
    alias: ['tokopancing', 'fishshop'],
    category: 'fun',
    description: 'Toko pancing & umpan',
    usage: '.fshop | .fshop beli <id>',
    example: '.fshop beli pancing_emas',
    isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
    cooldown: 3, isEnabled: true,
  },

  async handler(m, { db }) {
    const sender = m.sender
    const args   = m.text?.trim().split(' ') || []
    const sub    = args[0]?.toLowerCase()
    const itemId = args[1]?.toLowerCase()
    const user   = db.getUser(sender) || {}
    const koin   = user.koin || 0
    const inv    = getInv(sender)

    if (!sub || sub !== 'beli') {
      const pancings = SHOP_ITEMS.filter(s => !s.type)
      const umpans   = SHOP_ITEMS.filter(s => s.type === 'umpan')

      let pancingList = ''
      for (const p of pancings) {
        const owned = inv.pancing === p.id ? ' ✅' : ''
        const harga = p.price === 0 ? 'GRATIS' : `Rp ${p.price.toLocaleString('id-ID')}`
        pancingList += `┃ \`${p.id}\`${owned}\n┃ ${p.name} — *${harga}*\n┃ _${p.desc}_\n\n`
      }

      let umpanList = ''
      for (const u of umpans) {
        umpanList += `┃ \`${u.id}\`\n┃ ${u.name} — *Rp ${u.price.toLocaleString('id-ID')}*\n┃ _${u.desc}_\n\n`
      }

      return m.reply(
        `🏪 *TOKO PANCING*\n` +
        `💰 Koin kamu: *Rp ${koin.toLocaleString('id-ID')}*\n\n` +
        `🎣 *PANCING*\n\n` + pancingList +
        `🪱 *UMPAN*\n\n` + umpanList +
        `> Beli: \`.fshop beli <id>\``
      )
    }

    if (!itemId) return m.reply('⚠️ Masukkan ID item!\nContoh: `.fshop beli pancing_emas`')

    const item = SHOP_ITEMS.find(s => s.id === itemId)
    if (!item) return m.reply(`❌ Item \`${itemId}\` tidak ditemukan.\n\n> Ketik \`.fshop\` untuk lihat daftar.`)

    if (!item.type && inv.pancing === item.id) return m.reply(`❌ Kamu sudah punya *${item.name}*!`)

    if (!item.type) {
      const pancings = SHOP_ITEMS.filter(s => !s.type)
      const curIdx   = pancings.findIndex(p => p.id === inv.pancing)
      const newIdx   = pancings.findIndex(p => p.id === item.id)
      if (newIdx <= curIdx) return m.reply(`❌ Pancing kamu sudah lebih bagus dari *${item.name}*!`)
    }

    if (koin < item.price) {
      return m.reply(
        `❌ Koin tidak cukup!\n\n` +
        `┃ 💰 Koin: *Rp ${koin.toLocaleString('id-ID')}*\n` +
        `┃ 💸 Harga: *Rp ${item.price.toLocaleString('id-ID')}*\n` +
        `┃ ➖ Kurang: *Rp ${(item.price - koin).toLocaleString('id-ID')}*`
      )
    }

    db.setUser(sender, { koin: koin - item.price })
    if (item.type === 'umpan') { inv.umpan = item.id; inv.umpanUses = item.uses }
    else inv.pancing = item.id
    setInv(sender, inv)

    await m.react('✅')
    return m.reply(
      `🛒 *BERHASIL BELI!*\n\n` +
      `${item.name}\n_${item.desc}_\n\n` +
      `┃ 💸 Dibayar: *Rp ${item.price.toLocaleString('id-ID')}*\n` +
      `┃ 💰 Sisa koin: *Rp ${(koin - item.price).toLocaleString('id-ID')}*` +
      (item.type === 'umpan' ? `\n┃ 🪱 Aktif: *${item.uses}x pemakaian*` : '')
    )
  },
}
