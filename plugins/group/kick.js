const pluginConfig = {
    name: 'kick',
    alias: ['tendang', 'out', 'dor'],
    category: 'group',
    description: 'Mengeluarkan member dari grup dengan cara mereply pesannya',
    usage: '.kick (reply pesan target)',
    example: '.kick',
    isOwner: true,
    isPremium: false,
    isGroup: true,       // Hanya bisa digunakan di dalam grup
    isPrivate: false,
    isAdmin: true,       // Pengirim harus admin grup
    isBotAdmin: false,    // Bot harus sudah menjadi admin grup
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock, config }) {
    // 1. Ambil target dari pesan yang direply (quoted)
    const target = m.quoted?.sender

    // 2. Validasi jika user tidak mereply pesan siapapun
    if (!target) {
        return m.reply(
            `👞 *ɢʀᴏᴜᴘ ᴋɪᴄᴋ* 👞\n\n` +
            `> Mau mengeluarkan member yang bandel, Tuan?\n` +
            `> Silahkan *reply* pada salah satu pesan target lalu ketik:\n\n` +
            `\`${m.prefix}kick\``
        )
    }

    // 3. Proteksi Keamanan: Jangan biarkan bot menendang dirinya sendiri
    const botId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
    if (target === botId) {
        return m.reply('ᴀᴅᴜʜ ᴛᴜᴀɴ, ᴍᴀsᴀ ᴀᴋᴜ ᴅɪsᴜʀᴜʜ ɴᴇɴᴅᴀɴɢ ᴅɪʀɪ sᴇɴᴅɪʀɪ sɪʜ? 😔')
    }

    // 4. Proteksi Keamanan: Jangan biarkan Owner bot tertendang secara tidak sengaja
    const targetIsOwner = config.owner?.some(
        owner => owner.replace(/[^0-9]/g, '') === target.split('@')[0]
    ) || target === m.isOwner
    
    if (targetIsOwner) {
        return m.reply('🚫 *ᴛɪᴅᴀᴋ ᴅɪɪᴢɪɴᴋᴀɴ!* 🚫\n\nᴍᴀᴀꜰ ᴛᴜᴀɴ, ᴛᴀʀɢᴇᴛ ᴀᴅᴀʟᴀʜ ᴏᴡɴᴇʀ ʙᴏᴛ, ᴀᴋᴜ ᴛɪᴅᴀᴋ ʙᴇʀᴀɴɪ ᴍᴇɴᴇɴᴅᴀɴɢɴʏᴀ! 😤')
    }

    await m.react('⌛')

    try {
        // 5. Eksekusi penendangan menggunakan fungsi bawaan Baileys
        await sock.groupParticipantsUpdate(m.chat, [target], 'remove')
        
        // Kirim konfirmasi sukses
        await m.reply(`👞 *sᴜᴋsᴇs ᴍᴇɴᴇɴᴅᴀɴɢ:* @${target.split('@')[0]}`, {
            mentions: [target]
        })
        
        await m.react('✅')

    } catch (error) {
        console.error('KICK_PLUGIN_ERROR:', error)
        await m.react('❌')
        await m.reply('ᴀᴅᴜʜ ᴍᴀᴀꜰ ᴛᴜᴀɴ, ɢᴀɢᴀʟ ᴍᴇɴᴇɴᴅᴀɴɢ ᴍᴇᴍʙᴇʀ. ᴄᴏʙᴀ ᴘᴇʀɪᴋsᴀ ᴀᴘᴀᴋᴀʜ ᴅɪᴀ ᴜᴅᴀʜ ᴋᴇʟᴜᴀʀ ᴅᴜʟᴜᴀɴ 😔')
    }
}

module.exports = { config: pluginConfig, handler }