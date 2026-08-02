const axios = require('axios')

const pluginConfig = {
    name: 'bratvid',
    alias: ['bratgif', 'bratvideo'],
    category: 'sticker',
    description: 'Membuat sticker brat animated',
    usage: '.bratvid <text>',
    example: '.bratvid Hai semua',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 15,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.args.join(' ')
    if (!text) {
        return m.reply(`⎋ ʙʀᴀᴛ ᴀɴɪᴍᴀᴛᴇᴅ\n\n> Masukkan teks\n\n\`Contoh: ${m.prefix}bratvid Hai semua\``)
    }
    
    m.react('🎬')
    
    try {
        const url = `https://api.yupra.my.id/api/video/bratv?text=${encodeURIComponent(text)}`
        
        const response = await axios.get(url, { responseType: 'arraybuffer' })
        const buffer = Buffer.from(response.data)
        
        await sock.sendVideoAsSticker(m.chat, buffer, m, {
            packname: '𝗡𝗘𝗫𝗔 𝗕𝗢𝗧',
            author: m.pushName || 'User'
        })
        
        m.react('✅')
        
    } catch (error) {
        m.react('❌')
        m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
