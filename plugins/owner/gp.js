const fs = require('fs')
const path = require('path')

const pluginConfig = {
    name: 'getplugin',
    alias: ['gp', 'getplugins', 'sc', 'source'],
    category: 'owner',
    description: 'Menampilkan source code sebuah file plugin',
    usage: '.getplugin <namafile.js>',
    example: '.getplugin rch1.js',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

const PLUGINS_DIR = path.join(process.cwd(), 'plugins')
const INLINE_LIMIT = 3500 // sejalan dengan limit output eval (>>) di handler.js

// Susuri semua subfolder kategori (owner/, group/, fun/, dst) karena
// struktur plugins/ di project ini per-kategori, bukan flat.
function walkJsFiles(dir, baseDir = dir) {
    let results = []
    let entries
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
        return results
    }

    for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            results = results.concat(walkJsFiles(full, baseDir))
        } else if (entry.name.endsWith('.js')) {
            results.push({
                name: entry.name,
                relPath: path.relative(baseDir, full),
                fullPath: full,
                category: path.relative(baseDir, dir) || '(root)'
            })
        }
    }
    return results
}

function findPluginFile(filename) {
    const all = walkJsFiles(PLUGINS_DIR)
    return all.find(f => f.name.toLowerCase() === filename.toLowerCase()) || null
}

function buildNotFoundMessage(namaFile, prefix) {
    const all = walkJsFiles(PLUGINS_DIR)
    const byCategory = {}
    for (const f of all) {
        if (!byCategory[f.category]) byCategory[f.category] = []
        byCategory[f.category].push(f.name)
    }

    const categories = Object.keys(byCategory).sort()
    let list = ''
    for (const cat of categories) {
        list += `\n*${cat}/* (${byCategory[cat].length})\n`
        list += byCategory[cat].sort().map(n => `  • ${n}`).join('\n')
        list += '\n'
    }

    return (
        `🗃️ *Plugin tidak ditemukan*\n\n` +
        `File: \`${namaFile}\`\n` +
        `${list}\n` +
        `_Contoh: \`${prefix}getplugin rch1.js\`_`
    )
}

async function handler(m, { sock }) {
    const text = (m.text || '').trim()

    if (!text) {
        return m.reply(
            `📁 *Getplugin*\n\n` +
            `Menampilkan source code sebuah file plugin.\n\n` +
            `Gunakan: \`${m.prefix}getplugin <namafile.js>\`\n` +
            `Contoh: \`${m.prefix}getplugin rch1.js\``
        )
    }

    let namaFile = text.split(/\s+/)[0]
    if (!namaFile.endsWith('.js')) namaFile += '.js'

    const found = findPluginFile(namaFile)

    if (!found) {
        return m.reply(buildNotFoundMessage(namaFile, m.prefix))
    }

    let code
    try {
        code = fs.readFileSync(found.fullPath, 'utf8')
    } catch (err) {
        return m.reply(`❌ Gagal baca file: ${err.message}`)
    }

    const jumlahBaris = code.split('\n').length
    const header = `📁 *${found.relPath}*\n📏 ${code.length} karakter, ${jumlahBaris} baris\n\n`

    if (code.length <= INLINE_LIMIT) {
        return m.reply(`${header}\`\`\`${code}\`\`\``)
    }

    await sock.sendMessage(m.chat, {
        document: Buffer.from(code, 'utf8'),
        fileName: found.name,
        mimetype: 'text/javascript',
        caption: `${header}_File terlalu panjang buat ditampilkan inline, dikirim sebagai file._`
    }, { quoted: m })
}

module.exports = { config: pluginConfig, handler }
