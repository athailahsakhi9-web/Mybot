const pluginConfig = {
    name: 'rvo',
    alias: ['viewonce', 'vo'],
    category: 'tools',
    description: 'Buka pesan view once (1x lihat)',
    usage: '.rvo (reply pesan view once)',
    example: '.rvo',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    isEnabled: true
}

async function handler(m, { sock }) {
    const q = m.quoted

    if (!q) {
        return m.reply(
            `👁️ *ʀᴠᴏ - ᴠɪᴇᴡ ᴏɴᴄᴇ*\n\n` +
            `> Reply pesan view once untuk membukanya\n\n` +
            `\`${m.prefix}rvo\``
        )
    }

    await m.react('⌛')

    try {
        // Cari inner message dari semua kemungkinan struktur view once
        const msg = q.message || q
        const inner =
            msg?.viewOnceMessage?.message ||
            msg?.viewOnceMessageV2?.message ||
            msg?.viewOnceMessageV2Extension?.message ||
            // Kadang serialize sudah unwrap, cek langsung
            (msg?.imageMessage ? msg : null) ||
            (msg?.videoMessage ? msg : null)

        if (!inner) {
            await m.react('❌')
            return m.reply('❌ Pesan yang di-reply bukan view once')
        }

        const isImage = !!inner.imageMessage
        const isVideo = !!inner.videoMessage

        if (!isImage && !isVideo) {
            await m.react('❌')
            return m.reply('❌ Tipe media tidak didukung (hanya gambar/video)')
        }

        // Download buffer
        const buffer = await q.download()

        if (!buffer?.length) {
            await m.react('❌')
            return m.reply('❌ Gagal mendownload media')
        }

        await m.react('✅')

        if (isImage) {
            await sock.sendMessage(m.chat, {
                image: buffer,
                caption: '👁️ *ʀᴠᴏ - ᴠɪᴇᴡ ᴏɴᴄᴇ*\n\n> Pesan view once berhasil dibuka!',
            }, { quoted: m })
        } else {
            await sock.sendMessage(m.chat, {
                video: buffer,
                caption: '👁️ *ʀᴠᴏ - ᴠɪᴇᴡ ᴏɴᴄᴇ*\n\n> Pesan view once berhasil dibuka!',
            }, { quoted: m })
        }

    } catch (error) {
        await m.react('❌')
        await m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}

module.exports = { config: pluginConfig, handler }
