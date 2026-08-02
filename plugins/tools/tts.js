const axios = require('axios')

const pluginConfig = {
    name: 'tts',
    alias: ['texttospeech', 'suaraai', 'vnaicloning'],
    category: 'ai',
    description: 'Mengubah teks menjadi suara AI berbagai karakter',
    usage: '.tts [model]|[text]',
    example: '.tts goku|Hallo ini nexa',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

const TTS_URL = 'https://api-faa.my.id/faa/tts-legkap?text='

async function handler(m, { sock }) {
    // Mengambil teks bersih langsung dari m.text atau m.body bawaan fitur serialisasi handler Tuan
    let txt = (m.text || m.body || '').replace(/^\..*?\b(tts|texttospeech|suaraai|vnaicloning)\s*/i, '').trim()

    // Jika input kosong atau tidak memiliki pemisah '|', lemparkan daftar menu panduan
    if (!txt || !txt.includes('|')) {
        return m.reply(
            `🎙️ *ᴛᴛs ᴄʟᴏɴɪɴɢ ᴀɪ* 🎙️\n\n` +
            `> Mau denger karakter favorit Tuan ngomong sesuatu? Yuk pilih modelnya!\n\n` +
            `*Cara Penggunaan:* \n` +
            `• \`${m.prefix}tts [model]|[teks]\` \n\n` +
            `*Contoh:* \`${m.prefix}tts goku|Hallo ini nexa\`\n\n` +
            `*📋 ᴅᴀꜰᴛᴀʀ sᴇᴍᴜᴀ ᴍᴏᴅᴇʟ ʏᴀɴɢ ᴛᴇʀsᴇᴅɪᴀ:* \n` +
            `• \`miku\`\n` +
            `• \`nahida\`\n` +
            `• \`nami\`\n` +
            `• \`ana\`\n` +
            `• \`optimus_prime\`\n` +
            `• \`goku\`\n` +
            `• \`taylor_swift\`\n` +
            `• \`elon_musk\`\n` +
            `• \`mickey_mouse\`\n` +
            `• \`kendrick_lamar\`\n` +
            `• \`angela_adkinsh\`\n` +
            `• \`eminem\``
        )
    }

    await m.react('⌛')

    try {
        // Memisahkan karakter model dan teks yang akan dijadikan suara
        const index = txt.indexOf('|')
        const chosenModel = txt.substring(0, index).trim().toLowerCase()
        const textToSpeech = txt.substring(index + 1).trim()

        if (!textToSpeech) {
            await m.react('❌')
            return m.reply('ᴀᴅᴜʜ ᴍᴀᴀꜰ ᴛᴜᴀɴ, ᴛᴇᴋs ɴʏᴀ ᴊᴀɴɢᴀɴ ᴋᴏsᴏɴɢ ʏᴀ 😔')
        }

        // Ambil data suara dari API dengan batasan waktu tunggu 60 detik
        const res = await axios.get(`${TTS_URL}${encodeURIComponent(textToSpeech)}`, { 
            timeout: 60000 
        })
        const data = res.data

        if (!data || typeof data !== 'object' || !data.status || !Array.isArray(data.result)) {
            await m.react('❌')
            return m.reply('ᴀᴅᴜʜ ᴍᴀᴀꜰ ᴛᴜᴀɴ, ᴀᴘɪ-ɴʏᴀ ɢᴀɢᴀʟ ᴍᴇʀᴇsᴘᴏɴs sᴜᴀʀᴀ 😔')
        }

        // Cari data model suara yang diinginkan Tuan
        const targetAudio = data.result.find(v => v && v.model === chosenModel)

        if (!targetAudio) {
            await m.react('❌')
            return m.reply(`ᴍᴀᴀꜰ ᴛᴜᴀɴ, ᴍᴏᴅᴇʟ \`${chosenModel}\` ᴛɪᴅᴀᴋ ᴀᴅᴀ ᴅɪ ᴅᴀꜰᴛᴀʀ 😔`)
        }

        // Proteksi jika internal model di API sedang error
        if (targetAudio.error || !targetAudio.url || typeof targetAudio.url !== 'string') {
            await m.react('❌')
            return m.reply(`ᴀᴅᴜʜ ᴍᴀᴀꜰ ᴛᴜᴀɴ, sᴀᴀᴛ ɪɴɪ ᴍᴏᴅᴇʟ \`${chosenModel}\` sᴇᴅᴀɴɢ ɢᴀɢᴀʟ ɢᴇɴᴇʀᴀᴛᴇ sᴜᴀʀᴀ (ᴇʀʀᴏʀ ᴅᴀʀɪ sᴇʀᴠᴇʀ) 😔`)
        }

        // Download data stream audio
        const audioRes = await axios.get(targetAudio.url, {
            responseType: 'arraybuffer',
            timeout: 60000
        })

        if (!audioRes.data || audioRes.data.byteLength === 0) {
            await m.react('❌')
            return m.reply('ᴀᴅᴜʜ ᴍᴀᴀꜰ ᴛᴜᴀɴ, ɢᴀɢᴀʟ ᴍᴇɴɢᴜɴᴅᴜʜ ꜰɪʟᴇ sᴜᴀʀᴀɴʏᴀ 😔')
        }

        const audioBuffer = Buffer.from(audioRes.data)

        // Kirimkan sebagai murni Voice Note tanpa contextInfo[span_0](start_span)[span_0](end_span)
        await sock.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/mp4', 
            ptt: true
        }, { quoted: m })

        await m.react('🎧')

    } catch (error) {
        console.error('TTS_PLUGIN_ERROR:', error?.message || error)
        await m.react('❌')
        await m.reply('ᴀᴅᴜʜ ᴍᴀᴀꜰ ᴛᴜᴀɴ ᴋᴀʏᴀᴋ ɴʏᴀ ᴀᴘɪ ɴʏᴀ ᴇʀʀᴏʀ ᴅᴇʜ 😔')
    }
}

module.exports = { config: pluginConfig, handler }
