const axios = require('axios')

const pluginConfig = {
    name: 'lyric',
    alias: ['lirik'],
    category: 'search',
    description: 'Cari lirik lagu',
    usage: '.lyric <judul lagu>',
    example: '.lyric Geisha Karena Kamu',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 8,
    energi: 1,
    isEnabled: true
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const LYRICS_API = 'https://api.nexray.eu.cc/search/lyrics'
const BACKUP_API = 'https://api.miku.my.id/api/search/lyrics' // API Cadangan jika API utama timeout/down

async function searchLyrics(query) {
    try {
        const res = await axios.get(LYRICS_API, {
            params: { q: query },
            headers: { 'User-Agent': UA },
            timeout: 30000 // Dinaikkan ke 30 detik untuk mencegah gampang timeout
        })

        const data = res.data
        if (!data?.status || !data?.result) {
            throw new Error('Lirik tidak ditemukan')
        }

        const r = data.result
        return {
            title:     r.title,
            artist:    r.artist,
            album:     r.lyrics?.album_name || null,
            duration:  r.lyrics?.duration || null,
            thumbnail: r.thumbnail,
            lyrics:    r.lyrics?.plain_lyrics || null,
        }
    } catch (err) {
        // Jika API Utama timeout atau error, coba tembak API Cadangan
        try {
            const backupRes = await axios.get(BACKUP_API, {
                params: { query: query },
                timeout: 20000
            })
            const bData = backupRes.data
            if (bData?.status && bData?.result) {
                return {
                    title: bData.result.title || query,
                    artist: bData.result.artist || 'Unknown',
                    album: null,
                    duration: null,
                    thumbnail: bData.result.thumbnail || null,
                    lyrics: bData.result.lyrics || null
                }
            }
        } catch (_) {}
        
        // Lempar error jika kedua API gagal
        throw new Error(err.code === 'ECONNABORTED' ? 'Koneksi API utama timeout (RTO)' : err.message)
    }
}

function formatDuration(sec) {
    if (!sec) return '-'
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
}

async function handler(m, { sock }) {
    const query = m.text?.trim()

    if (!query) {
        return m.reply(
            `🎤 *ʟʏʀɪᴄ ꜱᴇᴀʀᴄʜ*\n\n` +
            `> Cari lirik lagu favoritmu!\n\n` +
            `Usage:\n\`${m.prefix}lyric <judul lagu>\`\n\n` +
            `Contoh:\n\`${m.prefix}lyric Geisha Karena Kamu\``
        )
    }

    await m.react('🎤')
    const { key } = await m.reply(`⏳ Mencari lirik *${query}*...`)

    let info
    try {
        info = await searchLyrics(query)
    } catch (err) {
        await m.react('❌')
        return m.reply(`❌ *Gagal mengambil lirik*\n\n> ${err.message}`)
    }

    if (!info.lyrics) {
        await m.react('❌')
        return m.reply(`❌ Lagu ditemukan tapi lirik tidak tersedia.\n\n📀 *${info.title}* — ${info.artist}`)
    }

    // Menampilkan lirik secara full tanpa dipotong slice
    const caption =
        `🎤 *${info.title}*\n` +
        `👤 Artis: ${info.artist}\n` +
        (info.album ? `💿 Album: ${info.album}\n` : '') +
        (info.duration ? `⏱️ Durasi: ${formatDuration(info.duration)}\n` : '') +
        `—`.repeat(20) + `\n\n` +
        `${info.lyrics.trim()}\n\n` +
        `—`.repeat(20) + `\n` +
        `> Powered by Nexa Bot`

    try {
        if (info.thumbnail) {
            await sock.sendMessage(m.chat, {
                image: { url: info.thumbnail },
                caption
            }, { quoted: m })
        } else {
            await sock.sendMessage(m.chat, { text: caption }, { quoted: m })
        }
        await m.react('✅')
    } catch {
        await m.reply(caption)
        await m.react('✅')
    }
}

module.exports = { config: pluginConfig, handler }
