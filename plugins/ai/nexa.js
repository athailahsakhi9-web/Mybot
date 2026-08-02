const axios = require('axios')
const config = require('../../config')

const pluginConfig = {
    name: 'ai',
    alias: ['chat', 'tanya', 'nexa'],
    category: 'ai',
    description: 'Chat dengan AI Nexa',
    usage: '.nexa <pertanyaan>',
    example: '.nexa Apa itu JavaScript?',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

const SYSTEM_PROMPT = `Namamu adalah NexaAi dan pembuatmu adalah NexaDev.
- Kalau ada yang tanya siapa namamu, siapa pembuatmu, atau model AI apa yang kamu pakai → jawab sesuai identitasmu (NexaAi buatan NexaDev).
- Kalau tidak ada yang tanya soal itu, jangan sebut-sebut namamu atau pembuatmu.
- Sifatmu suka menghujat, nyindir, dan meledek user dengan santai tapi tetap menjawab pertanyaannya.
- Gunakan emoji yang sesuai situasi dari pilihan ini: 😹 😂 🤮 🗿 😏 🤪 🤓
- Jawab dalam bahasa yang sama dengan pertanyaan user.`

function filterBranding(text) {
    return text
        .replace(/\b(gemini|google gemini|bard|chatgpt|gpt-?\d*|claude|openai)\b/gi, 'NexaAi')
        .replace(/\b(google|anthropic|openai)\b/gi, 'NexaDev')
        .replace(/saya adalah (gemini|ai google|google ai|bard|gpt|chatgpt|claude)/gi, 'Aku adalah NexaAi')
        .replace(/aku adalah (gemini|ai google|google ai|bard|gpt|chatgpt|claude)/gi, 'Aku adalah NexaAi')
        .replace(/dibuat oleh (google|anthropic|openai)/gi, 'dibuat oleh NexaDev')
}

async function handler(ctx, { }) {
    const { args, prefix, reply, react } = ctx
    const text = args.join(' ').trim()

    const apiKey = config.APIkey.nexaai
    if (!apiKey || !apiKey.trim()) {
        return reply('⚠️ *API Key belum diset!*\n\n> Isi `APIkey.nexaai` di `config/index.js` terlebih dahulu. dapatkan keynya di api.nexadev.my.id/home')
    }

    if (!text) {
        return reply(
            `🤖 *ɴᴇxᴀ ᴀɪ*\n\n` +
            `> Masukkan pertanyaan kamu\n\n` +
            `\`Contoh: ${prefix}nexa Apa itu JavaScript?\``
        )
    }

    await react('⏳')

    try {
        const prompt = `${SYSTEM_PROMPT}\n\nPertanyaan user: \`${text}\``

        const url = `https://api.nexadev.my.id/ai/nexaai/?key=${apiKey}&text=${encodeURIComponent(prompt)}`
        const { data } = await axios.get(url, { timeout: 30000 })

        if (typeof data === 'string' && data.trim().startsWith('<')) {
            throw new Error('API sedang tidak tersedia, coba lagi nanti.')
        }

        const result =
            data?.result ||
            data?.response ||
            data?.answer ||
            data?.message ||
            data?.text ||
            data?.data ||
            (typeof data === 'string' ? data : null)

        if (!result || typeof result !== 'string' || !result.trim()) {
            throw new Error('Response kosong dari API.')
        }

        const filtered = filterBranding(result.trim())

        await react('✅')
        await reply(`🤖 *ɴᴇxᴀ ᴀɪ*\n\n${filtered}`)

    } catch (error) {
        await react('❌')

        let errMsg = error.message
        if (error.code === 'ECONNABORTED') errMsg = 'Request timeout, API terlalu lama merespons.'
        if (error.response?.status === 401) errMsg = 'API Key tidak valid atau kadaluarsa.'
        if (error.response?.status === 429) errMsg = 'Rate limit tercapai, coba lagi nanti.'
        if (error.response?.status >= 500) errMsg = 'Server API sedang bermasalah.'

        await reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${errMsg}`)
    }
}

module.exports = { config: pluginConfig, handler }
