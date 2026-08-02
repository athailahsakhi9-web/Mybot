const config = require('../../config')

const SMALL_CAPS_MAP = {
  a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',
  m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ',
  '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
}
function sc(text) {
  return String(text).toLowerCase().split('').map(c => SMALL_CAPS_MAP[c] || c).join('')
}

// ── Resolve LID → JID asli (pola sama seperti antitagowner.js & bank.js) ──
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

  if (!found) return mention // private chat / bukan LID → pakai apa adanya

  const fields  = [found.jid, found.id, found.lid, found.phoneNumber].filter(Boolean)
  const realJid = fields.find(isRealJidFormat)

  return realJid || mention
}

async function resolveTarget(m, sock) {
  let raw = null

  // Prioritas 1: mention WA resmi
  if (m.mentionedJid?.length > 0) raw = m.mentionedJid[0]

  // Prioritas 2: reply ke pesan
  else if (m.quoted?.sender) raw = m.quoted.sender

  // Prioritas 3: parse @628xxx atau 628xxx dari args
  else {
    for (const arg of (m.args || [])) {
      const clean = arg.replace(/^@/, '').replace(/[^0-9]/g, '')
      if (clean.length >= 8) { raw = clean + '@s.whatsapp.net'; break }
    }
  }

  if (!raw) return null

  // Kalau bukan format LID, langsung pakai
  if (!raw.includes('@lid')) return raw

  // LID → resolve ke JID asli via groupMetadata
  if (!m.isGroup) return raw

  let participants = []
  try {
    const meta = await sock.groupMetadata(m.chat)
    participants = meta?.participants || []
  } catch {
    participants = m.groupMetadata?.participants || []
  }

  return resolveMentionToJid(raw, participants) || raw
}

function parseAmount(args) {
  for (const arg of (args || [])) {
    const clean = arg.replace(/[.,]/g, '')
    if (/^\d+$/.test(clean)) return parseInt(clean, 10)
  }
  return 0
}

module.exports = {
  config: {
    name: 'addkoin',
    alias: ['addexp', 'setkoin', 'setexp', 'setlevel', 'kurangkoin'],
    category: 'owner',
    description: 'Kelola koin, exp, dan level user',
    usage: '@user <jumlah>',
    isOwner: true,
    isEnabled: true,
    cooldown: 0,
  },

  async handler(m, { db, sock }) {
    const cmd    = m.command?.toLowerCase()
    const target = await resolveTarget(m, sock)
    const amount = parseAmount(m.args)
    const shortId = target ? normalizeNum(target) : ''

    if (!target) {
      return m.reply(
        `╭┈┈⬡「 💰 *${sc('Owner')} — ${sc('Ekonomi')}* 」\n` +
        `┃ .addkoin    @user <jml>   → ${sc('tambah koin')}\n` +
        `┃ .kurangkoin @user <jml>   → ${sc('kurangi koin')}\n` +
        `┃ .setkoin    @user <jml>   → ${sc('set koin')}\n` +
        `┃ .addexp     @user <jml>   → ${sc('tambah exp')}\n` +
        `┃ .setexp     @user <jml>   → ${sc('set exp')}\n` +
        `┃ .setlevel   @user <level> → ${sc('set level')}\n` +
        `╰┈┈┈┈┈┈┈┈⬡\n\n` +
        `> ${sc('Bisa pakai mention WA, reply, atau ketik')} @628xxx`
      )
    }

    if (amount <= 0 && !['setkoin', 'setexp', 'setlevel'].includes(cmd)) {
      return m.reply(`⚠️ ${sc('Jumlah harus lebih dari 0')}.\nContoh: \`.${cmd} @628xxx 1000\``)
    }

    if (!db.getUser(target)) {
      db.setUser(target, {
        name:      shortId,
        koin:      0,
        exp:       0,
        level:     1,
        energi:    10,
        joinedAt:  new Date().toISOString(),
        lastSeen:  new Date().toISOString(),
        isPremium: false,
        isBanned:  false,
      })
    }

    const user = db.getUser(target)

    switch (cmd) {

      case 'addkoin': {
        const before = user.koin ?? 0
        const after  = before + amount
        db.setUser(target, { koin: after })
        return m.reply(
          `✅ *${sc('Koin berhasil ditambah')}!*\n\n` +
          `┃ 👤 ${sc('User')}    » *@${shortId}*\n` +
          `┃ 🪙 ${sc('Sebelum')} » *${before.toLocaleString('id-ID')}*\n` +
          `┃ 🪙 ${sc('Sesudah')} » *${after.toLocaleString('id-ID')}*`,
          { mentions: [target] }
        )
      }

      case 'kurangkoin': {
        const before = user.koin ?? 0
        const after  = Math.max(0, before - amount)
        db.setUser(target, { koin: after })
        return m.reply(
          `✅ *${sc('Koin berhasil dikurangi')}!*\n\n` +
          `┃ 👤 ${sc('User')}    » *@${shortId}*\n` +
          `┃ 🪙 ${sc('Sebelum')} » *${before.toLocaleString('id-ID')}*\n` +
          `┃ 🪙 ${sc('Sesudah')} » *${after.toLocaleString('id-ID')}*`,
          { mentions: [target] }
        )
      }

      case 'setkoin': {
        const before = user.koin ?? 0
        db.setUser(target, { koin: amount })
        return m.reply(
          `✅ *${sc('Koin berhasil di-set')}!*\n\n` +
          `┃ 👤 ${sc('User')}    » *@${shortId}*\n` +
          `┃ 🪙 ${sc('Sebelum')} » *${before.toLocaleString('id-ID')}*\n` +
          `┃ 🪙 ${sc('Sesudah')} » *${amount.toLocaleString('id-ID')}*`,
          { mentions: [target] }
        )
      }

      case 'addexp': {
        let exp = (user.exp ?? 0) + amount
        let lvl = user.level ?? 1
        while (exp >= lvl * 500) { exp -= lvl * 500; lvl++ }
        db.setUser(target, { exp, level: lvl })
        return m.reply(
          `✅ *${sc('EXP berhasil ditambah')}!*\n\n` +
          `┃ 👤 ${sc('User')}   » *@${shortId}*\n` +
          `┃ ⭐ ${sc('EXP')}    » *${exp}*\n` +
          `┃ 🎯 ${sc('Level')}  » *${lvl}*`,
          { mentions: [target] }
        )
      }

      case 'setexp': {
        db.setUser(target, { exp: amount })
        return m.reply(
          `✅ *${sc('EXP berhasil di-set')}!*\n\n` +
          `┃ 👤 ${sc('User')}   » *@${shortId}*\n` +
          `┃ ⭐ ${sc('EXP')}    » *${amount}*`,
          { mentions: [target] }
        )
      }

      case 'setlevel': {
        const lvlBefore = user.level ?? 1
        db.setUser(target, { level: amount, exp: 0 })
        return m.reply(
          `✅ *${sc('Level berhasil di-set')}!*\n\n` +
          `┃ 👤 ${sc('User')}   » *@${shortId}*\n` +
          `┃ 🎯 ${sc('Level')}  » ${lvlBefore} → *${amount}*\n` +
          `┃ ⭐ ${sc('EXP')}    » ${sc('direset ke 0')}`,
          { mentions: [target] }
        )
      }

      default:
        return m.reply(`❌ ${sc('Command tidak dikenali')}.`)
    }
  },
}