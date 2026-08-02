// plugins/owner/owner.js
// Semua command owner sudah dipindah ke file terpisah:
//   - addkoin.js   → .addkoin .addexp .setkoin .setexp .setlevel
//   - manageuser.js → .addpremium .delpremium .banuser .unbanuser .resetuser
//   - setmode.js   → .setmode
//
// File ini sengaja dikosongkan agar tidak ada konflik nama command.

const { getDatabase } = require('../../src/lib/database')

module.exports = {
  config: {
    name: 'ownerinfo',
    alias: [],
    category: 'owner',
    description: 'Info daftar command owner',
    isOwner: true,
    isEnabled: true,
    cooldown: 0,
  },

  async handler(m) {
    const text =
      `╭━━━━━━━━━━━━━━━━━╮\n` +
      `┃  👑 *ᴏᴡɴᴇʀ ᴄᴏᴍᴍᴀɴᴅ*  ┃\n` +
      `╰━━━━━━━━━━━━━━━━━╯\n\n` +

      `╭┈┈⬡「 💰 *Ekonomi* 」\n` +
      `┃ .addkoin    @user <jml>\n` +
      `┃ .kurangkoin @user <jml>\n` +
      `┃ .setkoin    @user <jml>\n` +
      `┃ .addexp     @user <jml>\n` +
      `┃ .setexp     @user <jml>\n` +
      `┃ .setlevel   @user <lvl>\n` +
      `╰┈┈┈┈┈┈┈┈⬡\n\n` +

      `╭┈┈⬡「 👤 *Manage User* 」\n` +
      `┃ .addpremium  @user\n` +
      `┃ .delpremium  @user\n` +
      `┃ .banuser     @user\n` +
      `┃ .unbanuser   @user\n` +
      `┃ .resetuser   @user\n` +
      `╰┈┈┈┈┈┈┈┈⬡`

    await m.reply(text)
  }
}
