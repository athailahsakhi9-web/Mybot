module.exports = {
  config: {
    name: "sticker",
    alias: ["s", "stiker"],
    category: "sticker",
    description: "Buat stiker dari foto/video",
    usage: "(reply/caption foto/video)",
    isEnabled: true,
    cooldown: 5,
    energi: 1,
  },

  async handler(m, { sock, config }) {
    // ── Cek media: bisa dari reply (quoted) atau caption langsung ──
    const fromQuoted = m.quoted && (m.quoted.isImage || m.quoted.isVideo)
    const fromDirect = m.isImage || m.isVideo

    if (!fromQuoted && !fromDirect) {
      return m.reply(
        `❌ *Kirim atau reply foto/video dengan caption \`${m.prefix}sticker\`*\n\n` +
        `Contoh:\n` +
        `◦ Kirim foto → caption \`${m.prefix}s\`\n` +
        `◦ Reply foto → ketik \`${m.prefix}s\``
      )
    }

    await m.react('⏳')

    try {
      const { exec } = require('child_process')
      const fs = require('fs')
      const path = require('path')

      // ── Download media ────────────────────────────────────────
      let buffer
      if (fromQuoted) {
        buffer = await m.quoted.download()
      } else {
        buffer = await m.download()
      }

      if (!buffer || !buffer.length) {
        await m.react('❌')
        return m.reply('❌ Gagal mengunduh media!')
      }

      // ── Siapkan tmp dir & file ────────────────────────────────
      const tmpDir = path.join(process.cwd(), 'tmp')
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

      const ts = Date.now()
      const inputFile  = path.join(tmpDir, `sticker_in_${ts}`)
      const outputFile = path.join(tmpDir, `sticker_out_${ts}.webp`)

      fs.writeFileSync(inputFile, buffer)

      // ── Tentukan apakah video ─────────────────────────────────
      const isVideo = fromQuoted ? m.quoted.isVideo : m.isVideo

      const ffmpegCmd = isVideo
        ? `ffmpeg -y -i "${inputFile}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0,fps=15" -t 5 -loop 0 -preset default -an -vsync 0 "${outputFile}"`
        : `ffmpeg -y -i "${inputFile}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0" "${outputFile}"`

      await new Promise((resolve, reject) => {
        exec(ffmpegCmd, { timeout: 30000 }, (err) => {
          if (err) reject(err)
          else resolve()
        })
      })

      const stickerBuffer = fs.readFileSync(outputFile)

      await sock.sendMessage(m.chat, {
        sticker: stickerBuffer,
        stickerAuthor: config.bot?.name || 'Nexa Bot',
        stickerName: 'Made with Nexa Bot',
      }, { quoted: m })

      await m.react('✅')

      // Cleanup
      ;[inputFile, outputFile].forEach(f => { try { fs.unlinkSync(f) } catch {} })

    } catch (err) {
      await m.react('❌')
      await m.reply(`❌ *Gagal membuat stiker!*\n\n> ${err.message}`)
    }
  },
}
