// plugins/fun/stopsk.js
const pluginConfig = {
    name: 'stopsk',
    alias: ['stopsambungkata'],
    category: 'fun',
    description: 'Hentikan sesi sambung kata',
    usage: '.stopsk',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const { stopSesi } = require('./sambungkata')
    await stopSesi(m, { sock })
}

module.exports = { config: pluginConfig, handler }