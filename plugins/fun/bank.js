const config = require('../../config')

const pluginConfig = {
  name: 'bank',
  alias: ['dompet', 'wallet'],
  category: 'fun',
  description: 'Sistem bank — deposit, withdraw, transfer, cek saldo',
  usage: '.bank <sub> <jumlah>',
  example: '.bank deposit 5000',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  isEnabled: true,
}

const BUNGA_INTERVAL = 60 * 60 * 1000
const BUNGA_RATE     = 0.01
const MAX_BANK       = 50_000_000
const TAX_RATE       = 0.05

// ── Small caps buat teks penting ───────────────────────────────
const SMALL_CAPS_MAP = {
  a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',
  m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ',
}
function sc(text) {
  return String(text).toLowerCase().split('').map(c => SMALL_CAPS_MAP[c] || c).join('')
}

function fmt(n) {
  return 'Rp ' + Math.abs(Math.floor(n)).toLocaleString('id-ID')
}

function getBank(user) {
  return {
    saldo:     user.bankSaldo     || 0,
    lastBunga: user.bankLastBunga || 0,
    totalIn:   user.bankTotalIn   || 0,
    totalOut:  user.bankTotalOut  || 0,
  }
}

function applyBunga(user, db, sender) {
  const now     = Date.now()
  const bank    = getBank(user)
  const elapsed = now - bank.lastBunga
  const periods = Math.floor(elapsed / BUNGA_INTERVAL)

  if (periods <= 0 || bank.saldo <= 0) return bank

  const bunga    = Math.floor(bank.saldo * BUNGA_RATE * periods)
  const newSaldo = Math.min(bank.saldo + bunga, MAX_BANK)

  db.setUser(sender, {
    bankSaldo:     newSaldo,
    bankLastBunga: bank.lastBunga + periods * BUNGA_INTERVAL,
  })

  return { ...bank, saldo: newSaldo, bungaGained: bunga, periods }
}

// ── Normalisasi + resolve LID → JID asli (SAMA seperti antitagowner) ──
function normalizeNum(jid = '') {
  return String(jid).split('@')[0].split(':')[0].trim()
}
function isRealJidFormat(jid = '') {
  return String(jid).includes('@s.whatsapp.net')
}
function resolveMentionToJid(mention, participants = []) {
  if (!mention) return null
  const raw = normalizeNum(mention)

  const found = participants.find(p => {
    const fields = [p?.id, p?.jid, p?.lid, p?.phoneNumber, p?.participant].filter(Boolean)
    return fields.some(f => normalizeNum(f) === raw)
  })

  if (!found) return mention // fallback: private chat / bukan LID, pakai apa adanya

  const fields  = [found.jid, found.id, found.lid, found.phoneNumber].filter(Boolean)
  const realJid = fields.find(isRealJidFormat)

  return realJid || mention
}

async function handler(m, { sock, db }) {
  const sender = m.sender
  const args   = m.args || []
  const sub    = args[0]?.toLowerCase()
  const input  = args[1]?.replace(/[^0-9]/g, '')

  let user = db.getUser(sender) || {}
  let koin = user.koin || 0

  const bank = applyBunga(user, db, sender)
  user = db.getUser(sender) || {}
  koin = user.koin || 0

  if (!sub || sub === 'info' || sub === 'saldo') {
    const now       = Date.now()
    const nextBunga = bank.lastBunga + BUNGA_INTERVAL - now
    const h   = Math.floor(nextBunga / 3600000)
    const min = Math.floor((nextBunga % 3600000) / 60000)

    const bungaMsg = bank.bungaGained > 0
      ? `\n┃ 💹 Bunga masuk: *+${fmt(bank.bungaGained)}* (${bank.periods}x)`
      : ''

    return m.reply(
      `🏦 *${sc('NEXA BANK')}*\n\n` +
      `👤 *${m.pushName || sender.split('@')[0]}*\n\n` +
      `┃ 💵 ${sc('Dompet')}: *${fmt(koin)}*\n` +
      `┃ 🏦 ${sc('Tabungan')}: *${fmt(bank.saldo)}*\n` +
      `┃ 💰 ${sc('Total aset')}: *${fmt(koin + bank.saldo)}*\n` +
      bungaMsg + `\n\n` +
      `┃ 📈 ${sc('Bunga')}: *${BUNGA_RATE * 100}%/jam*\n` +
      `┃ ⏱ ${sc('Bunga berikutnya')}: *${h}j ${min}m*\n` +
      `┃ 🏧 ${sc('Limit bank')}: *${fmt(MAX_BANK)}*\n\n` +
      `*Command:*\n` +
      `> \`.bank deposit <jumlah>\`\n` +
      `> \`.bank withdraw <jumlah>\`\n` +
      `> \`.bank transfer @user <jumlah>\`\n` +
      `> \`.bank riwayat\``
    )
  }

  if (sub === 'deposit' || sub === 'dep') {
    if (!input) return m.reply('❌ Format: `.bank deposit <jumlah>`\nContoh: `.bank deposit 5000`')

    const jumlah = parseInt(input)
    if (isNaN(jumlah) || jumlah <= 0) return m.reply(`❌ ${sc('Jumlah tidak valid')}!`)
    if (jumlah < 100)  return m.reply(`❌ ${sc('Minimal deposit')} *Rp 100*`)
    if (koin < jumlah) return m.reply(`❌ ${sc('Koin tidak cukup')}!\n\n┃ Dompet: *${fmt(koin)}*\n┃ Deposit: *${fmt(jumlah)}*`)

    const newSaldo = bank.saldo + jumlah
    if (newSaldo > MAX_BANK) {
      return m.reply(
        `❌ ${sc('Melebihi limit bank')}!\n\n` +
        `┃ Tabungan: *${fmt(bank.saldo)}*\n` +
        `┃ Limit: *${fmt(MAX_BANK)}*\n` +
        `┃ Sisa ruang: *${fmt(MAX_BANK - bank.saldo)}*`
      )
    }

    db.setUser(sender, {
      koin:          koin - jumlah,
      bankSaldo:     newSaldo,
      bankTotalIn:   (user.bankTotalIn || 0) + jumlah,
      bankLastBunga: bank.lastBunga || Date.now(),
    })

    await m.react('✅')
    return m.reply(
      `🏦 *${sc('DEPOSIT BERHASIL')}*\n\n` +
      `┃ 💵 Deposit: *${fmt(jumlah)}*\n` +
      `┃ 💵 Dompet: *${fmt(koin)}* → *${fmt(koin - jumlah)}*\n` +
      `┃ 🏦 Tabungan: *${fmt(bank.saldo)}* → *${fmt(newSaldo)}*\n\n` +
      `> Bunga ${BUNGA_RATE * 100}%/jam akan berjalan otomatis!`
    )
  }

  if (sub === 'withdraw' || sub === 'wd' || sub === 'tarik') {
    if (!input) return m.reply('❌ Format: `.bank withdraw <jumlah>`\nContoh: `.bank withdraw 5000`')

    const jumlah = parseInt(input)
    if (isNaN(jumlah) || jumlah <= 0) return m.reply(`❌ ${sc('Jumlah tidak valid')}!`)
    if (jumlah < 100) return m.reply(`❌ ${sc('Minimal withdraw')} *Rp 100*`)
    if (bank.saldo < jumlah) {
      return m.reply(
        `❌ ${sc('Saldo bank tidak cukup')}!\n\n` +
        `┃ Tabungan: *${fmt(bank.saldo)}*\n` +
        `┃ Withdraw: *${fmt(jumlah)}*`
      )
    }

    const newSaldo = bank.saldo - jumlah
    db.setUser(sender, {
      koin:         koin + jumlah,
      bankSaldo:    newSaldo,
      bankTotalOut: (user.bankTotalOut || 0) + jumlah,
    })

    await m.react('✅')
    return m.reply(
      `🏧 *${sc('WITHDRAW BERHASIL')}*\n\n` +
      `┃ 💵 Withdraw: *${fmt(jumlah)}*\n` +
      `┃ 🏦 Tabungan: *${fmt(bank.saldo)}* → *${fmt(newSaldo)}*\n` +
      `┃ 💵 Dompet: *${fmt(koin)}* → *${fmt(koin + jumlah)}*`
    )
  }

  // ── TRANSFER — FIXED: resolve LID dulu sebelum simpan ke DB ──
  if (sub === 'transfer' || sub === 'kirim') {
    let rawTarget = m.mentionedJid?.[0] || m.quoted?.sender

    if (!rawTarget) return m.reply(`❌ ${sc('Tag/reply user tujuan')}!\nContoh: \`.bank transfer @user 5000\``)

    // Resolve LID → JID asli via groupMetadata (fresh fetch biar akurat)
    let targetJid = rawTarget
    if (m.isGroup) {
      let participants = []
      try {
        const meta = await sock.groupMetadata(m.chat)
        participants = meta?.participants || []
      } catch {
        participants = m.groupMetadata?.participants || []
      }
      targetJid = resolveMentionToJid(rawTarget, participants) || rawTarget
    }

    const amountRaw = (args[2] || args[1] || '').replace(/[^0-9]/g, '')
    const jumlah    = parseInt(amountRaw)

    if (normalizeNum(targetJid) === normalizeNum(sender)) {
      return m.reply(`❌ ${sc('Tidak bisa transfer ke diri sendiri')}!`)
    }
    if (isNaN(jumlah) || jumlah <= 0) return m.reply(`❌ ${sc('Jumlah tidak valid')}!\nContoh: \`.bank transfer @user 5000\``)
    if (jumlah < 100) return m.reply(`❌ ${sc('Minimal transfer')} *Rp 100*`)

    const tax         = Math.floor(jumlah * TAX_RATE)
    const totalKeluar = jumlah + tax

    if (koin < totalKeluar) {
      return m.reply(
        `❌ ${sc('Koin tidak cukup')}!\n\n` +
        `┃ Transfer: *${fmt(jumlah)}*\n` +
        `┃ Pajak (${TAX_RATE * 100}%): *${fmt(tax)}*\n` +
        `┃ Total keluar: *${fmt(totalKeluar)}*\n` +
        `┃ Dompet kamu: *${fmt(koin)}*`
      )
    }

    const targetUser = db.getUser(targetJid) || {}
    const targetKoin = (targetUser.koin || 0) + jumlah

    db.setUser(sender,    { koin: koin - totalKeluar })
    db.setUser(targetJid, { koin: targetKoin })

    await m.react('✅')
    await sock.sendMessage(m.chat, {
      text:
        `💸 *${sc('TRANSFER BERHASIL')}*\n\n` +
        `┃ Ke: *@${normalizeNum(targetJid)}*\n` +
        `┃ Jumlah: *${fmt(jumlah)}*\n` +
        `┃ Pajak (${TAX_RATE * 100}%): *${fmt(tax)}*\n` +
        `┃ Total keluar: *${fmt(totalKeluar)}*\n` +
        `┃ Dompet: *${fmt(koin)}* → *${fmt(koin - totalKeluar)}*`,
      mentions: [targetJid],
    }, { quoted: m })

    try {
      await sock.sendMessage(targetJid, {
        text:
          `💰 *${sc('KAMU DAPAT TRANSFER')}!*\n\n` +
          `┃ Dari: *${m.pushName || sender.split('@')[0]}*\n` +
          `┃ Jumlah: *${fmt(jumlah)}*\n` +
          `┃ Dompet kamu: *${fmt(targetKoin)}*`,
      })
    } catch (_) {}

    return
  }

  if (sub === 'riwayat' || sub === 'history') {
    return m.reply(
      `📋 *${sc('RIWAYAT BANK')}*\n\n` +
      `👤 *${m.pushName || sender.split('@')[0]}*\n\n` +
      `┃ 💵 Dompet: *${fmt(koin)}*\n` +
      `┃ 🏦 Tabungan: *${fmt(bank.saldo)}*\n` +
      `┃ 💰 Total aset: *${fmt(koin + bank.saldo)}*\n\n` +
      `┃ 📥 Total deposit: *${fmt(user.bankTotalIn || 0)}*\n` +
      `┃ 📤 Total withdraw: *${fmt(user.bankTotalOut || 0)}*\n` +
      `┃ 📈 Bunga rate: *${BUNGA_RATE * 100}%/jam*`
    )
  }

  return m.reply(
    `❌ ${sc('Sub-command tidak valid')}!\n\n` +
    `> \`.bank\` — info saldo\n` +
    `> \`.bank deposit <jumlah>\`\n` +
    `> \`.bank withdraw <jumlah>\`\n` +
    `> \`.bank transfer @user <jumlah>\`\n` +
    `> \`.bank riwayat\``
  )
}

module.exports = { config: pluginConfig, handler }