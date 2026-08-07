const pluginConfig = {
    name: 'cekidch',
    alias: ['checkidch', 'idch', 'cekchannel', 'getidch'],
    category: 'tools',
    description: 'Cek ID/kode newsletter dari link channel WhatsApp',
    usage: '.cekidch <link channel>',
    example: '.cekidch https://whatsapp.com/channel/0029Vb7TkCcD38CStrAMMb3N',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = (m.text || (m.args || []).join(' ') || '').trim()

    if (!text) {
        return m.reply(
            `📡 *ᴄᴇᴋ ɪᴅ ᴄʜᴀɴɴᴇʟ*\n\n` +
            `> Kirim link channel WhatsApp\n\n` +
            `Contoh:\n\`${m.prefix}cekidch https://whatsapp.com/channel/0029Vb7TkCcD38CStrAMMb3N\``
        )
    }

    // Ambil kode invite dari link, contoh: .../channel/0029Vb7TkCcD38CStrAMMb3N → 0029Vb7TkCcD38CStrAMMb3N
    const match = text.match(/whatsapp\.com\/channel\/([A-Za-z0-9]+)/i)
    if (!match) {
        return m.reply(
            '❌ Link channel tidak valid.\n\n' +
            'Contoh: https://whatsapp.com/channel/0029Vb7TkCcD38CStrAMMb3N'
        )
    }
    const inviteCode = match[1]

    await m.react('⌛')

    try {
        const meta = await sock.newsletterMetadata('invite', inviteCode)

        if (!meta || !meta.id) {
            await m.react('❌')
            return m.reply('❌ Channel tidak ditemukan atau link sudah tidak berlaku.')
        }

        const channelId = meta.id // contoh: 120363012345678901@newsletter

        const caption =
            `📡 *ɪɴғᴏ ᴄʜᴀɴɴᴇʟ*\n\n` +
            `• *Nama:* ${meta.name || '-'}\n` +
            `• *Code:* \`${channelId}\`\n` +
            (meta.subscribers != null ? `• *Subscriber:* ${meta.subscribers}\n` : '') +
            (meta.verification ? `• *Verifikasi:* ${meta.verification}\n` : '') +
            (meta.description ? `\n📝 ${meta.description}` : '')

        await sock.sendMessage(m.chat, {
            text: caption,
            title: 'Newsletter Code',
            footer: 'Nexa Bot',
            interactiveButtons: [
                {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📋 Copy Code',
                        id: 'copy_newsletter_id',
                        copy_code: channelId
                    })
                }
            ]
        }, { quoted: m })

        await m.react('✅')
    } catch (error) {
        await m.react('❌')
        await m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}

module.exports = { config: pluginConfig, handler }
