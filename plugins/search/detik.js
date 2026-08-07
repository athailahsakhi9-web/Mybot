const axios = require('axios')
const cheerio = require('cheerio')
const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = require("nexa")

async function fetchDetikSearch(query) {
    const { data } = await axios.get(`https://www.detik.com/search/searchall?query=${encodeURIComponent(query)}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://www.detik.com/',
        },
        timeout: 10000,
    })
    return data
}

async function fetchArticleContent(url) {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Referer': 'https://www.detik.com/',
            },
            timeout: 10000,
        })
        const $ = cheerio.load(data)
        $('script, style, .ads, .iklan, .adsbygoogle, .itp_-overlay, nav, header, footer, .nav, .header, .footer, .sidebar, .related, .rekomendasi').remove()
        for (const sel of ['.detail__body-text', '.itp_bodycontent', 'div[class*="detail__body"]', '.content__body', 'article .body']) {
            const text = cleanText($(sel).text())
            if (text.length > 100) return text
        }
        return ''
    } catch { return '' }
}

function cleanText(text) {
    return text ? text.replace(/\s+/g, ' ').trim() : ''
}

function parseDetikSearch(html) {
    const $ = cheerio.load(html)
    const articles = []
    let $items = $()
    for (const sel of ['article', '.list-content .list__item', '.list-content article', 'div.list__item']) {
        $items = $(sel)
        if ($items.length > 0) break
    }
    $items.each((_, el) => {
        const $el = $(el)
        const $link = $el.find('a').first()
        const url = $link.attr('href') || ''
        const title = cleanText($el.find('.title, h2, h3').first().text()) || cleanText($link.attr('title')) || cleanText($link.text())
        const summary = cleanText($el.find('p').first().text())
        const date = cleanText($el.find('.date, .media__date span, time').first().text())
        const label = cleanText($el.find('.labdate, .category, .kanal').first().text())
        const $img = $el.find('img').first()
        const image = $img.attr('data-src') || $img.attr('data-lazy') || $img.attr('data-original') || $img.attr('src') || ''
        if (url && title) articles.push({ title, url: url.trim(), date, summary, label, image: image.trim(), content: '' })
    })
    return articles
}

module.exports = {
    config: {
        name: 'detik',
        alias: ['detiknews', 'berita', 'news'],
        category: 'search',
        isEnabled: true,
        cooldown: 10,
        skipRegistration: false,
    },

    async handler(m, { sock, args }) {
        const query = args.join(' ').trim()
        if (!query) return m.reply(`⚠️ *Query Kosong!*\n\n*Contoh:* ${m.prefix}detik iran`)

        await m.react('⏳')

        try {
            const html = await fetchDetikSearch(query)
            let articles = parseDetikSearch(html)

            if (articles.length === 0) {
                await m.react('❌')
                return m.reply(`❌ Berita dengan kata kunci *"${query}"* tidak ditemukan.`)
            }

            articles = articles.slice(0, 5)
            const contents = await Promise.all(articles.map(a => fetchArticleContent(a.url)))
            articles.forEach((_, i) => { articles[i].content = contents[i] || articles[i].summary })

            const headerText =
                `╭┈┈⬡「 📰 *Hasil Pencarian Berita* 」\n` +
                `┃ Kata kunci: *${query}*\n` +
                `╰┈┈⬡`

            const carouselCards = []

            for (const item of articles) {
                let cardHeaderProto = null

                if (item.image) {
                    try {
                        const imgRes = await axios.get(item.image, { responseType: 'arraybuffer', timeout: 7000 })
                        const imgMedia = await prepareWAMessageMedia(
                            { image: Buffer.from(imgRes.data) },
                            { upload: sock.waUploadToServer }
                        )
                        cardHeaderProto = proto.Message.InteractiveMessage.Header.create({
                            ...imgMedia,
                            hasMediaAttachment: true,
                            gifPlayback: false,
                        })
                    } catch (e) {
                        console.error('Gagal memuat gambar:', e.message)
                    }
                }

                const shortContent = item.content.length > 350 ? item.content.slice(0, 350) + '...' : item.content

                const cardBodyText =
                    `╭┈┈⬡「 📰 *${item.label || 'DETIK NEWS'}* 」\n` +
                    `┃ *${item.title}*\n` +
                    `┃\n` +
                    `┃ 🕒 ${item.date || '-'}\n` +
                    `┃\n` +
                    `┃ ${shortContent}\n` +
                    `╰┈┈⬡`

                carouselCards.push({
                    header: cardHeaderProto,
                    body: { text: cardBodyText },
                    nativeFlowMessage: {
                        buttons: [{
                            name: 'cta_url',
                            buttonParamsJson: JSON.stringify({
                                display_text: '🔗 Baca Selengkapnya',
                                url: item.url,
                                merchant_url: item.url,
                            }),
                        }],
                    },
                })
            }

            const msg = generateWAMessageFromContent(
                m.chat,
                {
                    viewOnceMessage: {
                        message: {
                            interactiveMessage: {
                                body: { text: headerText },
                                carouselMessage: {
                                    messageVersion: 1,
                                    cards: carouselCards,
                                },
                            },
                        },
                    },
                },
                { userJid: sock.user?.id }
            )

            await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
            await m.react('✅')

        } catch (error) {
            console.error('[Detik Scraper] Error:', error)
            await m.react('❌')
            await m.reply(`❌ *ᴇʀʀᴏʀ sᴇᴀʀᴄʜ*\n\n> ${error.message}`)
        }
    },
}
