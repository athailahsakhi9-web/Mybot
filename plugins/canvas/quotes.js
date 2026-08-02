const fs = require('fs')
const path = require('path')
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas')

const pluginConfig = {
    name: 'buatquotes',
    alias: ['bq', 'quoteanime', 'animequote'],
    category: 'canvas',
    description: 'Membuat gambar quote bertema anime secara custom.',
    usage: '.buatquotes [id background] | <teks> | [nama pembuat]',
    example: '.buatquotes 2 | Tetaplah hidup walaupun tidak berguna | Maman',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 2,
    isEnabled: true,
    isAdmin: false,
    isBotAdmin: false
}

const FONT_QUOTE = {
  family: 'arialn',
  url: 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Font/ARIALN.ttf'
}

const FONT_USERNAME = {
  family: 'Inter',
  url: 'https://github.com/rsms/inter/raw/refs/heads/master/docs/font-files/Inter-Medium.woff2'
}

const BACKGROUNDS = {
  1: {
    name: 'l',
    url: 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/qca/L.png',
    textZone: { x: 775, y: 56, w: 456, h: 1102 },
    usernameZone: { x: 890, y: 1167, w: 228, h: 50 },
    usernameFontSize: 28
  },
  2: {
    name: 'gojo',
    url: 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/qca/gok.png',
    textZone: { x: 755, y: 68, w: 466, h: 1027 },
    usernameZone: { x: 863, y: 1108, w: 249, h: 50 },
    usernameFontSize: 28
  },
  3: {
    name: 'yuji',
    url: 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/qca/cc.png',
    textZone: { x: 35, y: 68, w: 466, h: 1027 },
    usernameZone: { x: 133, y: 1108, w: 249, h: 50 },
    usernameFontSize: 28
  },
  4: {
    name: 'denji',
    url: 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/qca/denji.png',
    textZone: { x: 655, y: 68, w: 512, h: 1083 },
    usernameZone: { x: 795, y: 1152, w: 249, h: 50 },
    usernameFontSize: 28
  },
  5: {
    name: 'thorfin',
    url: 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/qca/thorfin.png',
    textZone: { x: 65, y: 54, w: 489, h: 992 },
    usernameZone: { x: 162, y: 1042, w: 249, h: 50 },
    usernameFontSize: 28
  },
  6: {
    name: 'naruto',
    url: 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/qca/Naruto.png',
    textZone: { x: 40, y: 56, w: 481, h: 1065 },
    usernameZone: { x: 170, y: 1126, w: 228, h: 50 },
    usernameFontSize: 28
  },
  7: {
    name: 'light',
    url: 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/qca/LIghtyagami.png',
    textZone: { x: 38, y: 56, w: 493, h: 941 },
    usernameZone: { x: 170, y: 1025, w: 228, h: 50 },
    usernameFontSize: 28
  },
  8: {
    name: 'higuruma',
    url: 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/qca/higuruma.png',
    textZone: { x: 755, y: 68, w: 424, h: 920 },
    usernameZone: { x: 840, y: 993, w: 249, h: 50 },
    usernameFontSize: 28
  }
}

const TEXT_STYLE = {
  fontWeight: 400,
  fontFamily: 'arialn, sans-serif',
  color: '#111111',
  align: 'justify',
  initialSize: 75,
  minFontSize: 24,
  smallCaps: true
}

const USERNAME_STYLE = {
  fontWeight: 500,
  fontFamily: 'Inter, sans-serif',
  color: '#121212',
  align: 'center',
  gap: 40
}

const CANVAS_SIZE = { width: 1254, height: 1254 }
const SMALL_CAPS_SCALE = 0.72

// ── Cache persisten di disk ───────────────────────────────────────
// Font disimpan di src/font/, background disimpan di src/cache/.
// Sekali download berhasil, restart bot berkali-kali tidak akan
// download ulang dari GitHub.
const FONT_DIR = path.join(process.cwd(), 'src', 'font')
const CACHE_DIR = path.join(process.cwd(), 'src', 'cache')
if (!fs.existsSync(FONT_DIR)) fs.mkdirSync(FONT_DIR, { recursive: true })
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })

function cachePathFor(key, dir = CACHE_DIR) {
  return path.join(dir, key)
}

function readCache(key, dir = CACHE_DIR) {
  const p = cachePathFor(key, dir)
  if (fs.existsSync(p)) {
    try {
      const buf = fs.readFileSync(p)
      if (buf?.length > 0) return buf
    } catch (_) {}
  }
  return null
}

function writeCache(key, buffer, dir = CACHE_DIR) {
  try {
    const tmp = cachePathFor(key, dir) + '.tmp'
    fs.writeFileSync(tmp, buffer)
    fs.renameSync(tmp, cachePathFor(key, dir))
  } catch (_) {}
}

let fontsLoaded = false
const memCache = new Map() // cache in-memory per-proses, disk tetap sumber utama

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// Cek apakah buffer benar-benar file gambar PNG/JPEG, bukan halaman
// error/HTML/teks kosong yang kebetulan lolos status 200/dari cache lama.
function isValidImageBuffer(buffer) {
  if (!buffer || buffer.length < 16) return false

  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff

  return isPng || isJpeg
}

function isValidFontBuffer(buffer) {
  // TTF ('\x00\x01\x00\x00' atau 'true'/'OTTO'), atau WOFF/WOFF2 ('wOFF'/'wOF2')
  if (!buffer || buffer.length < 4) return false
  const sig = buffer.slice(0, 4).toString('latin1')
  return ['\x00\x01\x00\x00', 'true', 'OTTO', 'wOFF', 'wOF2', 'ttcf'].includes(sig)
}

async function download(url, { retries = 3, baseDelay = 1500, validate = null } = {}) {
  let lastErr
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
        }
      })

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '0', 10)
        const wait = retryAfter > 0 ? retryAfter * 1000 : baseDelay * attempt
        if (attempt < retries) {
          await sleep(wait)
          continue
        }
        throw new Error(`Gagal download ${url}: 429 Too Many Requests (rate limited setelah ${retries}x percobaan)`)
      }

      if (!res.ok) throw new Error(`Gagal download ${url}: ${res.status} ${res.statusText}`)

      const buffer = Buffer.from(await res.arrayBuffer())

      // Validasi isi file, bukan cuma status HTTP — GitHub kadang balas
      // status 200 tapi body-nya halaman rate-limit/error, bukan file asli.
      if (validate && !validate(buffer)) {
        throw new Error(`File hasil download dari ${url} bukan file yang valid (kemungkinan halaman error tersamar status 200)`)
      }

      return buffer
    } catch (err) {
      lastErr = err
      if (attempt < retries) {
        await sleep(baseDelay * attempt)
        continue
      }
    }
  }
  throw lastErr || new Error(`Gagal download ${url}`)
}

async function getBackgroundBuffer(bg) {
  const cacheKey = `bg_${bg.name}.png`

  // 1. Cek memory cache dulu (paling cepat, proses masih hidup)
  if (memCache.has(cacheKey)) return memCache.get(cacheKey)

  // 2. Cek disk cache (persisten antar restart) — di src/cache/
  const fromDisk = readCache(cacheKey, CACHE_DIR)
  if (fromDisk) {
    if (isValidImageBuffer(fromDisk)) {
      memCache.set(cacheKey, fromDisk)
      return fromDisk
    }
    // Cache lama ternyata corrupt (bukan gambar valid) → hapus, download ulang
    try { fs.unlinkSync(cachePathFor(cacheKey, CACHE_DIR)) } catch (_) {}
  }

  // 3. Belum ada / cache corrupt → download dari GitHub dengan retry 429 + validasi isi
  const buffer = await download(bg.url, { validate: isValidImageBuffer })
  writeCache(cacheKey, buffer, CACHE_DIR)
  memCache.set(cacheKey, buffer)
  return buffer
}

async function getFontBuffer(font) {
  const cacheKey = `font_${font.family}${path.extname(font.url) || '.bin'}`

  if (memCache.has(cacheKey)) return memCache.get(cacheKey)

  // Font disimpan terpisah di src/font/
  const fromDisk = readCache(cacheKey, FONT_DIR)
  if (fromDisk) {
    if (isValidFontBuffer(fromDisk)) {
      memCache.set(cacheKey, fromDisk)
      return fromDisk
    }
    try { fs.unlinkSync(cachePathFor(cacheKey, FONT_DIR)) } catch (_) {}
  }

  const buffer = await download(font.url, { validate: isValidFontBuffer })
  writeCache(cacheKey, buffer, FONT_DIR)
  memCache.set(cacheKey, buffer)
  return buffer
}

async function setupEnv(bg) {
  const bgBuffer = await getBackgroundBuffer(bg)

  if (!fontsLoaded) {
    GlobalFonts.register(await getFontBuffer(FONT_QUOTE), FONT_QUOTE.family)
    GlobalFonts.register(await getFontBuffer(FONT_USERNAME), FONT_USERNAME.family)
    fontsLoaded = true
  }

  return bgBuffer
}

// ── Text renderer: mendukung mode normal & small caps manual ─────────
function createTextRenderer(ctx, opts) {
  const { fontWeight, fontFamily, smallCaps } = opts

  if (!smallCaps) {
    return {
      measure(str, size) {
        ctx.font = `${fontWeight} ${size}px ${fontFamily}`
        return ctx.measureText(str).width
      },
      draw(str, x, y, size) {
        ctx.font = `${fontWeight} ${size}px ${fontFamily}`
        ctx.textAlign = 'left'
        ctx.fillText(str, x, y)
      }
    }
  }

  return {
    measure(str, size) {
      let width = 0
      for (const ch of str) {
        const upper = ch.toUpperCase()
        const isSmall = ch !== upper
        const charSize = isSmall ? size * SMALL_CAPS_SCALE : size
        ctx.font = `${fontWeight} ${charSize}px ${fontFamily}`
        width += ctx.measureText(upper).width
      }
      return width
    },
    draw(str, x, y, size) {
      let cx = x
      ctx.textAlign = 'left'
      for (const ch of str) {
        const upper = ch.toUpperCase()
        const isSmall = ch !== upper
        const charSize = isSmall ? size * SMALL_CAPS_SCALE : size
        ctx.font = `${fontWeight} ${charSize}px ${fontFamily}`
        ctx.fillText(upper, cx, y)
        cx += ctx.measureText(upper).width
      }
    }
  }
}

function wrapText(renderer, text, maxWidth, fontSize) {
  const out = []
  text.split('\n').forEach(p => {
    let cur = ''
    p.split(' ').forEach(w => {
      const t = cur ? cur + ' ' + w : w
      if (renderer.measure(t, fontSize) > maxWidth && cur) { out.push(cur); cur = w }
      else cur = t
    })
    out.push(cur)
  })
  return out
}

function fitTextInZone(ctx, text, zone, opts) {
  const { initialSize, minFontSize: minSize = 10, step = 2 } = opts
  const renderer = createTextRenderer(ctx, opts)
  let fontSize = initialSize
  let lines, lh

  while (fontSize >= minSize) {
    lines = wrapText(renderer, text, zone.w, fontSize)
    lh = fontSize * 1.2
    if (lines.length * lh <= zone.h) break
    fontSize -= step
  }
  if (fontSize < minSize) {
    fontSize = minSize
    lines = wrapText(renderer, text, zone.w, fontSize)
    lh = fontSize * 1.2
  }
  return { fontSize, lines, lh, renderer }
}

function drawJustifiedLine(renderer, line, x, y, targetWidth, fontSize) {
  const words = line.split(' ')
  if (words.length === 1) {
    const w = renderer.measure(line, fontSize)
    renderer.draw(line, x + (targetWidth - w) / 2, y, fontSize)
    return
  }
  const wordWidths = words.map(w => renderer.measure(w, fontSize))
  const totalWordsWidth = wordWidths.reduce((a, b) => a + b, 0)
  const spaceWidth = (targetWidth - totalWordsWidth) / (words.length - 1)

  let cx = x
  words.forEach((w, i) => {
    renderer.draw(w, cx, y, fontSize)
    cx += wordWidths[i] + spaceWidth
  })
}

function drawQuoteText(ctx, text, zone, opts) {
  const { fontSize, lines, lh, renderer } = fitTextInZone(ctx, text, zone, opts)

  ctx.save()
  ctx.beginPath()
  ctx.rect(zone.x, zone.y, zone.w, zone.h)
  ctx.clip()
  const startY = zone.y + zone.h / 2 - (lines.length * lh) / 2 + lh / 2

  if (opts.align === 'justify') {
    lines.forEach((l, i) => {
      const y = startY + i * lh
      const isLastLine = i === lines.length - 1
      if (isLastLine) {
        const w = renderer.measure(l, fontSize)
        renderer.draw(l, zone.x + zone.w / 2 - w / 2, y, fontSize)
      } else {
        drawJustifiedLine(renderer, l, zone.x, y, zone.w, fontSize)
      }
    })
  } else {
    lines.forEach((l, i) => {
      const y = startY + i * lh
      const w = renderer.measure(l, fontSize)
      let startX
      if (opts.align === 'center') startX = zone.x + zone.w / 2 - w / 2
      else if (opts.align === 'right') startX = zone.x + zone.w - w
      else startX = zone.x
      renderer.draw(l, startX, y, fontSize)
    })
  }
  ctx.restore()

  return startY + (lines.length - 1) * lh + lh / 2
}

function drawUsernameText(ctx, text, zone, opts, fontSize) {
  ctx.font = `${opts.fontWeight} ${fontSize}px ${opts.fontFamily}`
  ctx.textAlign = 'center'
  const lx = zone.x + zone.w / 2
  const ly = zone.y + zone.h / 2
  ctx.fillText(text, lx, ly)
}

async function drawScene(bgId, quoteText, usernameStr) {
  const bg = BACKGROUNDS[bgId]
  if (!bg) throw new Error(`Background nomor ${bgId} tidak ditemukan`)

  const bgBuffer = await setupEnv(bg)

  const canvas = createCanvas(CANVAS_SIZE.width, CANVAS_SIZE.height)
  const ctx = canvas.getContext('2d')

  const bgImg = await loadImage(bgBuffer)
  ctx.drawImage(bgImg, 0, 0, CANVAS_SIZE.width, CANVAS_SIZE.height)

  ctx.save()
  ctx.fillStyle = TEXT_STYLE.color
  ctx.textBaseline = 'middle'
  drawQuoteText(ctx, `"${quoteText}"`, bg.textZone, TEXT_STYLE)
  ctx.restore()

  ctx.save()
  ctx.fillStyle = USERNAME_STYLE.color
  ctx.textBaseline = 'middle'
  drawUsernameText(ctx, usernameStr, bg.usernameZone, USERNAME_STYLE, bg.usernameFontSize)
  ctx.restore()

  return await canvas.encode('jpeg', 92)
}

function parseQuoteInput(cleanText, quotedText) {
  const rawParts = cleanText.split('|').map(v => v.trim())
  const pipeCount = rawParts.length - 1

  let bgId = null
  let qText = ''
  let qName = ''

  if (pipeCount >= 2) {
    bgId = rawParts[0] ? parseInt(rawParts[0]) : null
    qText = rawParts[1] || ''
    qName = rawParts[2] || ''
  } else if (pipeCount === 1) {
    const [first, second] = rawParts
    const possibleId = parseInt(first)
    if (first && !isNaN(possibleId) && BACKGROUNDS[possibleId]) {
      bgId = possibleId
      qText = second || ''
    } else {
      qText = first || ''
      qName = second || ''
    }
  } else {
    const single = rawParts[0] || ''
    const possibleId = parseInt(single)
    if (single && quotedText && !isNaN(possibleId) && BACKGROUNDS[possibleId]) {
      bgId = possibleId
    } else {
      qText = single
    }
  }

  if (!qText && quotedText) {
    qText = quotedText
  }

  if (!bgId || !BACKGROUNDS[bgId]) {
    bgId = Math.floor(Math.random() * 8) + 1
  }

  return { bgId, qText, qName }
}

async function handler(m, { sock }) {
    const cleanText = (m.text || '').trim()
    const quotedText = (m.quoted?.text || m.quoted?.body || m.quoted?.caption || '').trim()

    if (!cleanText && !quotedText) {
        return m.reply(
            `🎨 *FITUR BUAT QUOTES ANIME*\n\n` +
            `Fitur ini akan membantumu merangkai kata-kata mutiara dengan latar belakang karakter anime favorit yang sangat keren!\n\n` +
            `*CARA PENGGUNAAN:*\n` +
            `- \`${m.prefix}buatquotes <teks>\`\n` +
            `- \`${m.prefix}buatquotes <id_background> | <teks>\`\n` +
            `- \`${m.prefix}buatquotes <id_background> | <teks> | <namamu>\`\n` +
            `- Reply pesan berisi teks + \`${m.prefix}buatquotes\` (teks otomatis diambil dari pesan yang di-reply)\n\n` +
            `*DAFTAR BACKGROUND PENDUKUNG (ID 1-8):*\n` +
            `- 1: L (Death Note)\n` +
            `- 4: Denji (Chainsaw Man)\n` +
            `- 5: Thorfinn\n` +
            `- 6: Naruto\n` +
            `- 7: Light Yagami\n` +
            `- 8: Higuruma\n\n` +
            `_Contoh: ${m.prefix}buatquotes 2 | Tetaplah hidup walaupun tidak berguna | Nexadev_`
        )
    }

    try {
        await m.react('🕕')

        const { bgId, qText, qName } = parseQuoteInput(cleanText, quotedText)

        if (!qText) {
            return m.reply('⚠️ Sertakan teks untuk quote, atau reply pesan yang berisi teks.')
        }

        let finalName = qName || m.pushName || 'Someone'
        if (!finalName.startsWith('-')) {
            finalName = '- ' + finalName
        }

        const imageBuffer = await drawScene(bgId, qText, finalName)

        await sock.sendMessage(m.chat, { image: imageBuffer }, { quoted: m })

        await m.react('✅')

    } catch (e) {
        // Jangan hapus disk cache di sini — kalau gambar/font sudah tersimpan
        // valid di disk, error di sesi ini (misal 429 transient) tidak boleh
        // memaksa proses lain download ulang. Cuma reset memory cache + status
        // font kalau errornya diduga dari resource yang corrupt.
        memCache.clear()
        fontsLoaded = false
        console.error(e)
        await m.react('❌')
        m.reply(`❌ *GAGAL MEMBUAT QUOTE*\n\nMaaf, sistem mengalami gangguan saat mencoba membuat gambar quote. Silakan coba lagi nanti.`)
    }
}

module.exports = { config: pluginConfig, handler }