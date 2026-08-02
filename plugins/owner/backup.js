const fs = require('fs')
const path = require('path')
const AdmZip = require('adm-zip')

const pluginConfig = {
    name: 'backup',
    alias: ['backupcode', 'bckp'],
    category: 'owner',
    description: 'Membuat cadangan (backup) seluruh source code bot menjadi file .zip',
    usage: '.backup',
    example: '.backup',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    await m.react('⌛')
    await m.reply('📦 *ʙᴀᴄᴋᴜᴘ sʏsᴛᴇᴍ* 📦\n\n> Sedang mengompresi source code project Tuan, mohon tunggu sebentar ya...')

    const rootDir = path.join(__dirname, '../../') 
    const backupFileName = `backup_bot_${Date.now()}.zip`
    const backupPath = path.join(rootDir, backupFileName)

    try {
        const zip = new AdmZip()
        const files = fs.readdirSync(rootDir)
        const ignoredItems = ['node_modules', '.git', '.env', '.npm', backupFileName]

        for (const file of files) {
            if (ignoredItems.includes(file)) continue

            const fullPath = path.join(rootDir, file)
            const stat = fs.statSync(fullPath)

            if (stat.isDirectory()) {
                zip.addLocalFolder(fullPath, file)
            } else if (stat.isFile()) {
                zip.addLocalFile(fullPath)
            }
        }

        zip.writeZip(backupPath)

        if (!fs.existsSync(backupPath) || fs.statSync(backupPath).size === 0) {
            await m.react('❌')
            return m.reply('❌ Gagal membuat file cadangan zip, Tuan.')
        }

        await sock.sendMessage(m.chat, {
            document: fs.readFileSync(backupPath),
            mimetype: 'application/zip',
            fileName: backupFileName,
            caption: `✅ *ʙᴀᴄᴋᴜᴘ sᴜᴋsᴇs* ✅\n\nBerikut adalah file cadangan seluruh source code project Tuan.\n\n📅 *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`
        }, { quoted: m })

        await m.react('✅')

        setTimeout(() => {
            if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath)
        }, 5000)

    } catch (error) {
        console.error('BACKUP_PLUGIN_ERROR:', error)
        await m.react('❌')
        await m.reply(`❌ Terjadi kesalahan fatal saat melakukan backup: ${error.message}`)
        if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath)
    }
}

module.exports = { config: pluginConfig, handler }