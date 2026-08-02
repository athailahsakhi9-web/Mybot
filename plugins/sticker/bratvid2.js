const axios = require('axios')

const pluginConfig = {
    name: 'bratvid2',
    alias: ['bratv2'],
    category: 'sticker',
    description: 'Generate brat video v2',
    usage: '.bratvid2 <text>',
    example: '.bratvid2 hello world',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.args.join(' ')
    
    if (!text) {
        return m.reply(`⎋ *ʙʀᴀᴛ ᴠɪᴅᴇᴏ ᴠ2*\n\n> Masukkan teks\n\n\`Contoh: ${m.prefix}bratvid2 hello world\``)
    }
    
    m.react('⏳')
    
    try {
        const url = `https://api-faa.my.id/faa/bratvid?text=${encodeURIComponent(text)}`
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 60000
        })
        
        m.react('✅')
        
        await sock.sendVideoAsSticker(m.chat, Buffer.from(res.data), m, {
            packname: '𝗡𝗘𝗫𝗔 𝗕𝗢𝗧',
            author: m.pushName || 'User'
        })
        
    } catch (error) {
        m.react('❌')
        m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
