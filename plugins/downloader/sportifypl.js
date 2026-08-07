const fetch = require('node-fetch')

const pluginConfig = {
    name: 'spotifypl',
    alias: ['spotpl', 'spotifyplaylist', 'spotplaylist', 'playlistspot'],
    category: 'downloader',
    description: 'Download lagu-lagu dari Playlist Spotify',
    usage: '.spotifypl <url playlist spotify>',
    example: '.spotifypl https://open.spotify.com/playlist/6Tp1XghEcLfAsZfwHZA6dK',
    cooldown: 15,
    energi: 2,
    isEnabled: true
}

// Map manual untuk mengubah teks biasa menjadi Small Caps font style
const SMALL_CAPS_MAP = {
    'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ꜰ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ', 
    'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 
    's': 's', 't': 'ᴛ', 'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ',
    'A': 'ᴀ', 'B': 'ʙ', 'C': 'ᴄ', 'D': 'ᴅ', 'E': 'ᴇ', 'F': 'ꜰ', 'G': 'ɢ', 'H': 'ʜ', 'I': 'ɪ', 
    'J': 'ᴊ', 'K': 'ᴋ', 'L': 'ʟ', 'M': 'ᴍ', 'N': 'ɴ', 'O': 'ᴏ', 'P': 'ᴘ', 'Q': 'ǫ', 'R': 'ʀ', 
    'S': 's', 'T': 'ᴛ', 'U': 'ᴜ', 'V': 'ᴠ', 'W': 'ᴡ', 'X': 'x', 'Y': 'ʏ', 'Z': 'ᴢ'
}

function toSmallCaps(text) {
    return text.split('').map(char => SMALL_CAPS_MAP[char] || char).join('')
}

// Helper untuk mengunduh media menjadi Buffer
async function getMediaBuffer(url) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 120000 // 2 Menit
    })
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`)
    const arrayBuf = await res.arrayBuffer()
    return Buffer.from(arrayBuf)
}

// Helper khusus untuk Convert Track Spotify ke Direct MP3 via Nexray API
async function convertToMp3Url(spotifyTrackUrl) {
    try {
        const apiUrl = `https://api.nexray.eu.cc/downloader/spotify?url=${encodeURIComponent(spotifyTrackUrl)}`
        const res = await fetch(apiUrl, { timeout: 60000 })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        
        const json = await res.json()
        
        // Ekstraksi fleksibel URL MP3 dari response Nexray API
        const mp3Url = json.result?.download || json.result?.url || json.result?.link || 
                        json.data?.download || json.data?.url || json.download || json.url || json.link

        if (mp3Url && typeof mp3Url === 'string' && mp3Url.startsWith('http')) {
            return mp3Url
        }
        
        throw new Error(json.message || 'URL download tidak ditemukan dari API Nexray')
    } catch (err) {
        throw new Error(`Nexray API Convert Error: ${err.message}`)
    }
}

async function handler(m, { sock, args }) {
    let playlistUrl = args[0] || (m.quoted?.text)
    
    if (!playlistUrl) {
        return m.reply(toSmallCaps('⚠️ Masukkan link Playlist Spotify!\n\n*Contoh:* .spotifypl https://open.spotify.com/playlist/6Tp1XghEcLfAsZfwHZA6dK'))
    }

    if (!playlistUrl.includes('spotify.com')) {
        return m.reply(toSmallCaps('⚠️ URL tidak valid! Harap masukkan link Playlist Spotify yang benar.'))
    }

    await m.react('⏳')

    try {
        // 1. Fetch Playlist Data dari NexaDev API
        const apiUrl = `https://api.nexadev.my.id/api/spotifypl?url=${encodeURIComponent(playlistUrl)}`
        const res = await fetch(apiUrl, { timeout: 120000 })
        
        if (!res.ok) throw new Error(`API HTTP status ${res.status}`)
        
        const json = await res.json()
        
        if (!json || json.status === false) {
            throw new Error(json?.message || json?.error || 'Gagal mengambil data playlist')
        }

        // 2. Ekstraksi Informasi Playlist & Tracks
        const playlistTitle = json.data?.title || 'Spotify Playlist'
        const tracks = json.tracks || []

        if (!Array.isArray(tracks) || tracks.length === 0) {
            throw new Error('Daftar lagu pada playlist tidak ditemukan atau kosong.')
        }

        await m.react('📥')

        const totalTracks = tracks.length
        let headerCaption = `📜 *${toSmallCaps('sᴘᴏᴛɪꜰʏ ᴘʟᴀʏʟɪsᴛ')}*\n\n`
        headerCaption += `╭┈┈⬡「 📋 *${toSmallCaps('ᴘʟᴀʏʟɪsᴛ ɪɴꜰᴏ')}* 」\n`
        headerCaption += `┃ 📌 ${toSmallCaps('ᴛɪᴛʟᴇ')}: *${playlistTitle}*\n`
        headerCaption += `┃ 🎧 ${toSmallCaps('ᴛᴏᴛᴀʟ ᴛʀᴀᴄᴋs')}: *${totalTracks}*\n`
        headerCaption += `╰┈┈┈┈┈┈┈┈⬡\n\n`
        headerCaption += `⚡ ${toSmallCaps('ᴘᴏᴡᴇʀᴇ德 ʙʏ')}: *NexaDev & Nexray API*`

        await m.reply(headerCaption)

        // 3. Loop setiap track -> Convert ke MP3 via Nexray -> Unduh Buffer -> Kirim Audio
        for (let i = 0; i < totalTracks; i++) {
            const track = tracks[i]
            const rawTrackUrl = track.url || track.link || ''
            const trackTitle = track.title || `Track ${i + 1}`
            const artist = track.artists || track.artist || 'Unknown'

            if (!rawTrackUrl) continue

            try {
                // Convert track URL ke MP3 via Nexray API
                const directMp3Url = await convertToMp3Url(rawTrackUrl)

                // Unduh MP3 menjadi Buffer
                const audioBuffer = await getMediaBuffer(directMp3Url)

                // Kirim audio ke WhatsApp
                await sock.sendMessage(m.chat, {
                    audio: audioBuffer,
                    mimetype: 'audio/mp4',
                    ptt: false,
                    fileName: `${trackTitle}.mp3`
                }, { quoted: m })

            } catch (errTrack) {
                await m.reply(toSmallCaps(`⚠️ Gagal mendownload track ${i + 1} (${trackTitle}): ${errTrack.message}`))
            }
        }

        await m.react('✅')

    } catch (err) {
        await m.react('❌')
        return m.reply(toSmallCaps(`❌ Gagal mendownload Playlist Spotify: ${err.message}`))
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
