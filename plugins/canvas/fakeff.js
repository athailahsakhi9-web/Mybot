const pluginConfig = {
    name: 'fakeff',
    alias: ['fakeff', 'fakelobyff', 'lobyff', 'fakelobby'],
    category: 'canvas',
    description: 'Membuat gambar fake lobby Free Fire',
    usage: '.fakeff <nickname>',
    example: '.fakeff Nexa',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const nickname = m.args.join(' ')
    if (!nickname) {
        return m.reply(`🎮 *ꜰᴀᴋᴇ ʟᴏʙʙʏ ꜰꜰ*\n\n> Masukkan nickname untuk dibuat\n\n\`Contoh: ${m.prefix}fakeff Nexa\``)
    }

    m.react('🎮')

    try {
        await sock.sendMessage(m.chat, {
            image: { url: `https://apii.nexadev.my.id/fakeff?usn=${encodeURIComponent(nickname)}` },
            caption: `🎮 *ꜰᴀᴋᴇ ʟᴏʙʙʏ ꜰꜰ*\n\n> Nickname: \`${nickname}\``
        }, { quoted: m })

        m.react('✅')
    } catch (error) {
        m.react('❌')
        m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}

module.exports = { config: pluginConfig, handler }