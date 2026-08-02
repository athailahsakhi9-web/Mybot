// ╔══════════════════════════════════════╗
// ║      NEXA BOT - AIO DOWNLOADER        ║
// ╚══════════════════════════════════════╝

const axios = require('axios')

const pluginConfig = {
    name: 'aio',
    alias: ['allinone', 'download', 'dl'],
    category: 'downloader',
    description: 'All in one downloader (IG, TikTok, FB, Twitter, dll)',
    usage: '.aio <url>',
    example: '.aio https://vt.tiktok.com/xxxxx',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// ─── Scraper ──────────────────────────────────────────────────
async function scrapeAIO(targetUrl) {
    const apiUrl = `https://api.nexadev.my.id/api/aio/?url=${encodeURIComponent(targetUrl)}`

    let data
    try {
        const res = await axios.get(apiUrl, {
            headers: { 'User-Agent': UA, 'Accept': 'application/json' },
            timeout: 30000,
            family: 4
        })
        data = res.data
    } catch (e) {
        throw new Error(`Gagal menghubungi API: ${e.message}`)
    }

    if (!data || !data.status) {
        throw new Error(data?.message || 'API tidak mengembalikan data yang valid')
    }

    const links = []
    let title = 'Media Download'

    // Format ARRAY — Instagram, multi-media
    if (Array.isArray(data.data)) {
        data.data.forEach((item, i) => {
            if (!item?.url) return
            const t = (item.type || '').toLowerCase()
            const u = item.url

            if (t.match(/jpg|jpeg|png|webp/) || u.match(/\.(jpg|jpeg|png|webp)/i)) {
                links.push({ url: u, type: 'image', quality: `Photo ${i + 1}/${data.data.length}`, format: t || 'jpg' })
            } else if (t.match(/mp4|mov|video/) || u.match(/\.(mp4|mov)/i)) {
                links.push({ url: u, type: 'video', quality: `Video ${i + 1}`, format: t || 'mp4' })
            } else if (t.match(/mp3|audio/)) {
                links.push({ url: u, type: 'audio', quality: 'Audio', format: t || 'mp3' })
            }
        })
    }

    // Format OBJECT — TikTok, YouTube, dll
    else if (data.data && typeof data.data === 'object') {
        const r = data.data
        title = r.title || r.caption || 'Media Download'

        if (r.video)   links.push({ url: r.video,   type: 'video', quality: 'Video SD (No WM)', format: 'mp4' })
        if (r.videoHD) links.push({ url: r.videoHD, type: 'video', quality: 'Video HD',         format: 'mp4' })
        if (r.audio)   links.push({ url: r.audio,   type: 'audio', quality: 'Audio MP3',        format: 'mp3' })

        if (Array.isArray(r.photo)) {
            r.photo.forEach((url, i) => {
                if (url && typeof url === 'string') {
                    links.push({ url, type: 'image', quality: `Photo ${i + 1}/${r.photo.length}`, format: 'jpg' })
                }
            })
        }
    }

    if (links.length === 0) throw new Error('Tidak ada media ditemukan dari URL tersebut')

    return { title, links }
}

// ─── Build contextInfo (forward label) ────────────────────────
function buildContext() {
    return {
        forwardingScore: 9999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363208449943317@newsletter',
            newsletterName: 'Nexa Bot',
            serverMessageId: 127
        }
    }
}

// ─── Handler ──────────────────────────────────────────────────
async function handler(m, { sock }) {
    try {
        // Ambil URL dari args atau text
        const url = (Array.isArray(m.args) && m.args.length > 0)
            ? m.args.join(' ').trim()
            : (m.text || '').replace(/^\S+\s*/, '').trim()

        if (!url) {
            return m.reply(
                `📥 *ᴀʟʟ ɪɴ ᴏɴᴇ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n` +
                `> Download dari berbagai platform!\n\n` +
                `╭─「 🌐 *Platform* 」\n` +
                `│ • TikTok (Video / Photo Slide)\n` +
                `│ • Instagram (Post / Reels / Stories)\n` +
                `│ • Facebook (Video / Reels)\n` +
                `│ • Twitter/X (Video / Photo)\n` +
                `│ • YouTube (Shorts / Video)\n` +
                `╰─────────────────────\n\n` +
                `> *Contoh:* \`${m.prefix || '.'}aio https://vt.tiktok.com/xxxxx\``
            )
        }

        if (!url.startsWith('http')) {
            return m.reply(`❌ URL tidak valid! Pastikan dimulai dengan https://`)
        }

        await m.react('⏳')
        await m.reply('⏳ Tunggu sebentar, sedang mengambil media...')

        const { title, links } = await scrapeAIO(url)
        const ctx = buildContext()

        const videos = links.filter(l => l.type === 'video')
        const audios = links.filter(l => l.type === 'audio')
        const photos = links.filter(l => l.type === 'image')

        let terkirim = 0

        // Kirim video (max 3)
        for (const link of videos.slice(0, 3)) {
            try {
                await sock.sendMessage(m.chat, {
                    video: { url: link.url },
                    caption: `📥 *${title}*\n\n🎥 *${link.quality}*`,
                    contextInfo: ctx
                }, { quoted: m })
                terkirim++
                await new Promise(r => setTimeout(r, 3000))
            } catch (e) {
                console.error('[AIO] Gagal kirim video:', e.message)
            }
        }

        // Kirim audio (max 2)
        for (const link of audios.slice(0, 2)) {
            try {
                await sock.sendMessage(m.chat, {
                    audio: { url: link.url },
                    mimetype: 'audio/mpeg',
                    ptt: false,
                    contextInfo: ctx
                }, { quoted: m })
                terkirim++
                await new Promise(r => setTimeout(r, 2000))
            } catch (e) {
                console.error('[AIO] Gagal kirim audio:', e.message)
            }
        }

        // Kirim foto (max 15)
        for (const link of photos.slice(0, 15)) {
            try {
                await sock.sendMessage(m.chat, {
                    image: { url: link.url },
                    caption: `📥 *${title}*\n\n📷 *${link.quality}*`,
                    contextInfo: ctx
                }, { quoted: m })
                terkirim++
                await new Promise(r => setTimeout(r, 2000))
            } catch (e) {
                console.error('[AIO] Gagal kirim foto:', e.message)
            }
        }

        if (terkirim === 0) {
            await m.react('❌')
            return m.reply('❌ Media ditemukan tapi gagal dikirim semua.\n> Coba lagi beberapa saat.')
        }

        await m.react('✅')

    } catch (error) {
        console.error('[AIO] Error:', error)
        await m.react('❌')
        await m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> ${error.message}`)
    }
}

module.exports = { config: pluginConfig, handler }
