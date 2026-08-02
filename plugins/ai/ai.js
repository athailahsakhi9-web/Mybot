// ╔══════════════════════════════════════╗
// ║        NEXA BOT - AI PLUGIN           ║
// ╚══════════════════════════════════════╝

const axios = require('axios')

const pluginConfig = {
    name: 'ai',
    alias: ['chat', 'tanya'],
    category: 'ai',
    description: 'Chat dengan AI Nexa',
    usage: '.ai <pertanyaan>',
    example: '.ai Apa itu JavaScript?',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

const IDENTITY_KEYWORDS = [
    'kamu siapa', 'kau siapa', 'lo siapa', 'lu siapa', 'anda siapa',
    'siapa kamu', 'siapa kau', 'siapa lo', 'siapa lu', 'siapa anda',
    'siapa nama kamu', 'nama kamu', 'nama kau', 'namamu',
    'kamu itu siapa', 'kamu ini siapa', 'emang kamu siapa',
    'who are you', 'what are you', 'are you ai',
    'are you gemini', 'are you gpt', 'are you chatgpt', 'are you claude',
    'kamu ai apa', 'kamu pakai ai apa', 'ini ai apa', 'ai apa ini',
    'model apa', 'pakai model apa', 'dibuat pakai apa',
    'kamu gemini', 'kamu gpt', 'kamu claude', 'kamu bard'
]

function isAskingIdentity(text) {
    return IDENTITY_KEYWORDS.some(k => text.toLowerCase().includes(k))
}

function filterBranding(text) {
    return text
        .replace(/\b(gemini|google gemini|bard|chatgpt|gpt-?\d*|claude|openai)\b/gi, 'Nexa AI')
        .replace(/\b(google|anthropic|openai)\b/gi, 'Nexa')
        .replace(/saya adalah (gemini|ai google|google ai|bard|gpt|chatgpt|claude)/gi, 'Aku adalah AI Nexa')
        .replace(/aku adalah (gemini|ai google|google ai|bard|gpt|chatgpt|claude)/gi, 'Aku adalah AI Nexa')
}

async function handler(m, { sock }) {
    const text = m.args.join(' ').trim()

    if (!text) {
        return m.reply(
            `🤖 *ɴᴇxᴀ ᴀɪ*\n\n` +
            `> Masukkan pertanyaan kamu\n\n` +
            `\`Contoh: ${m.prefix}ai Apa itu JavaScript?\``
        )
    }

    if (isAskingIdentity(text)) {
        await m.react('🤖')
        return m.reply(
            `🤖 *ɴᴇxᴀ ᴀɪ*\n\n` +
            `Aku adalah *Nexa AI*, asisten pintar siap membantu kamu! 😊\n\n` +
            `Ada yang bisa aku bantu?`
        )
    }

    await m.react('🤖')

    try {
        const url = `https://api.nexray.eu.cc/ai/gemini?text=${encodeURIComponent(text)}`
        const { data } = await axios.get(url, { timeout: 30000 })

        // Cek apakah response HTML (API down/redirect)
        if (typeof data === 'string' && data.trim().startsWith('<')) {
            throw new Error('API sedang tidak tersedia, coba lagi nanti.')
        }

        // Format response: { status: true, result: "..." } atau variasi lain
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

        await m.react('✅')
        await m.reply(`🤖 *ɴᴇxᴀ ᴀɪ*\n\n${filtered}`)

    } catch (error) {
        await m.react('❌')
        await m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}

module.exports = { config: pluginConfig, handler }
