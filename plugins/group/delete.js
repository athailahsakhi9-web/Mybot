const pluginConfig = {
    name: 'delete',
    alias: ['del', 'unsend', 'd'],
    category: 'owner',
    description: 'Menghapus/menarik pesan dari bot (Reply pesan bot)',
    usage: '.del (reply pesan bot)',
    example: '.del',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 2,
    energi: 0,
    isEnabled: true
};

async function handler(m, { sock }) {
    if (!m.quoted) {
        return m.reply('❌ Silakan reply pesan dari bot yang ingin kamu hapus.');
    }

    const targetMessage = m.quoted;

    try {
        await sock.sendMessage(m.chat, {
            delete: {
                remoteJid: m.chat,
                fromMe: targetMessage.fromMe,
                id: targetMessage.id,
                participant: targetMessage.sender
            }
        });
    } catch (error) {
        console.error(error);
        m.reply('❌ Gagal menghapus pesan. Pastikan pesan tersebut adalah pesan yang dikirim oleh bot.');
    }
}

module.exports = { config: pluginConfig, handler };