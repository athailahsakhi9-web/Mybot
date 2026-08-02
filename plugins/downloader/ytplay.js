const axios = require('axios')

const pluginConfig = {
    name: 'playlagu',
    alias: ['play', 'musik', 'mp3'],
    category: 'downloader',
    description: 'Cari & download lagu dari YouTube sebagai MP3',
    usage: '.playlagu <nama lagu>',
    example: '.playlagu Dewa 19 Kangen',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 15,
    energi: 1,
    isEnabled: true
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const YT_SEARCH_API   = 'https://api.nexray.eu.cc/search/youtube'
const YTMP3_API       = 'https://api.nexray.eu.cc/downloader/v1/ytmp3'
const YTMP3_TIMEOUT   = 120_000
const YTMP3_MAX_RETRY = 2

async function searchYoutube(query) {
    const res = await axios.get(YT_SEARCH_API, {
        params: { q: query },
        headers: { 'User-Agent': UA },
        timeout: 15000
    })

    const data = res.data
    if (!data?.status || !Array.isArray(data.result) || !data.result.length) {
        throw new Error('ᴛɪᴅᴀᴋ ᴀᴅᴀ ʜᴀꜱɪʟ ᴘᴇɴᴄᴀʀɪᴀɴ ᴜɴᴛᴜᴋ: ' + query)
    }

    const first = data.result[0]

    return {
        url:      first.url,
        title:    first.title,
        channel:  first.channel,
        duration: first.duration,
        views:    first.views,
        thumb:    first.image_url,
    }
}

async function convertMp3(ytUrl, attempt = 1) {
    try {
        const res = await axios.get(YTMP3_API, {
            params: { url: ytUrl },
            headers: { 'User-Agent': UA },
            timeout: YTMP3_TIMEOUT,
            validateStatus: () => true,
        })

        if (res.status < 200 || res.status >= 300) {
            const apiMsg = res.data?.message || res.data?.error || JSON.stringify(res.data)?.slice(0, 200)
            throw new Error(`API balas status ${res.status}${apiMsg ? ` — ${apiMsg}` : ''}`)
        }

        const data = res.data
        const mp3Url = data?.result?.url     || data?.data?.url
                    || data?.result?.download || data?.data?.download
                    || data?.url             || data?.download
                    || data?.audio

        if (!mp3Url) throw new Error('ᴀᴘɪ ᴛɪᴅᴀᴋ ᴍᴇɴɢᴇᴍʙᴀʟɪᴋᴀɴ ᴜʀʟ ᴍᴘ3 (ꜰᴏʀᴍᴀᴛ ʀᴇꜱᴘᴏɴꜱᴇ ᴛɪᴅᴀᴋ ᴅɪᴋᴇɴᴀʟɪ)')

        return {
            mp3Url,
            title:    data?.result?.title    || data?.data?.title    || data?.title    || null,
            filesize: data?.result?.filesize || data?.data?.filesize || data?.filesize || null,
        }
    } catch (err) {
        const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(err.message)

        if (isTimeout && attempt < YTMP3_MAX_RETRY) {
            return convertMp3(ytUrl, attempt + 1)
        }

        if (isTimeout) {
            throw new Error(
                `Server konversi tidak merespons dalam ${YTMP3_TIMEOUT / 1000} detik setelah ${attempt}x percobaan.\n` +
                `Kemungkinan server API sedang sibuk/down, atau video terlalu panjang untuk dikonversi.`
            )
        }

        throw err
    }
}

async function handler(m, { sock }) {
    const query = m.text?.trim()

    if (!query) {
        return m.reply(
            `🎵 *ᴘʟᴀʏ ʟᴀɢᴜ*\n\n` +
            `> Cari & download lagu dari YouTube!\n\n` +
            `Usage:\n\`${m.prefix}playlagu <nama lagu>\`\n\n` +
            `Contoh:\n\`${m.prefix}playlagu Dewa 19 Kangen\``
        )
    }

    await m.react('🎵')
    await m.reply(`⏳ Mencari *${query}*...`)

    let info
    try {
        info = await searchYoutube(query)
    } catch (err) {
        await m.react('❌')
        return m.reply(`❌ *Gagal mencari lagu*\n\n> ${err.message}`)
    }

    const infoText =
        `🎵 ᴋᴇᴛᴇᴍᴜ! ʟᴀɢɪ ᴄᴏɴᴠᴇʀᴛ ᴋᴇ ᴍᴘ3, ᴍᴏʜᴏɴ ᴛᴜɴɢɢᴜ...\n` +
        `_(ʙɪꜱᴀ ꜱᴀᴍᴘᴀɪ ${YTMP3_TIMEOUT / 1000} ᴅᴇᴛɪᴋ ᴛᴇʀɢᴀɴᴛᴜɴɢ ᴅᴜʀᴀꜱɪ ᴠɪᴅᴇᴏ)_\n\n` +
        `📀 *${info.title}*\n` +
        `📺 ᴄʜᴀɴɴᴇʟ: ${info.channel}\n` +
        `⏱️ ᴅᴜʀᴀꜱɪ: ${info.duration}\n` +
        `👁️ ᴠɪᴇᴡꜱ: ${info.views}`

    try {
        if (info.thumb) {
            await sock.sendMessage(m.chat, { image: { url: info.thumb }, caption: infoText }, { quoted: m })
        } else {
            await sock.sendMessage(m.chat, { text: infoText }, { quoted: m })
        }
    } catch {
        await sock.sendMessage(m.chat, { text: infoText }, { quoted: m }).catch(() => {})
    }

    let mp3
    try {
        mp3 = await convertMp3(info.url)
    } catch (err) {
        await m.react('❌')
        return m.reply(`❌ ɢᴀɢᴀʟ ᴄᴏɴᴠᴇʀᴛ ᴍᴘ3\n\n> ${err.message}`)
    }

    try {
        await sock.sendMessage(m.chat, {
            audio: { url: mp3.mp3Url },
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: `${mp3.title || info.title}.mp3`,
            contextInfo: {
                forwardingScore: 9999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363208449943317@newsletter',
                    newsletterName: 'Nexa Bot',
                    serverMessageId: 127
                }
            }
        }, { quoted: m })

        await sock.sendMessage(m.chat, {
            text:
                `🎵 *${mp3.title || info.title}*\n` +
                (mp3.filesize ? `📦 ꜱɪᴢᴇ: ${mp3.filesize}\n` : '') +
                `⏱️ ᴅᴜʀᴀꜱɪ: ${info.duration}`
        }, { quoted: m })

        await m.react('✅')
    } catch (err) {
        await m.react('❌')
        await m.reply(`❌ ɢᴀɢᴀʟ ᴍᴇɴɢɪʀɪᴍ ᴀᴜᴅɪᴏ\n\n> ${err.message}`)
    }
}

module.exports = { config: pluginConfig, handler }