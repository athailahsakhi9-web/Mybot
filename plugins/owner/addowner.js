const fs = require('fs')
const path = require('path')

const pluginConfig = {
    name: 'addowner',
    alias: ['tambahowner', 'makeowner'],
    category: 'owner',
    description: 'Menambahkan nomor baru ke dalam daftar owner di config',
    usage: '.addowner [nomor/reply pesan]',
    example: '.addowner 6287876034799',
    isOwner: true,      // Kritis: Menjamin hanya owner terdaftar yang bisa mengeksekusi lewat checkPermission[span_6](start_span)[span_6](end_span)
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

// Menyesuaikan parameter kedua dengan isi objek context dari handler Tuan (sock, config)[span_7](start_span)[span_7](end_span)
async function handler(m, { sock, config }) {
    // Membaca teks input bersih secara manual dari m.text / m.body bawaan serialisasi handler Tuan
    let textInput = (m.text || m.body || '').replace(/^\..*?\b(addowner|tambahowner|makeowner)\s*/i, '').trim()
    
    // Ambil input target (bisa dari reply pesan atau teks parameter yang dibersihkan dari karakter non-angka)
    let target = m.quoted ? m.quoted.sender : textInput.replace(/[^0-9]/g, '')
    
    if (target && !target.endsWith('@s.whatsapp.net')) {
        target = target + '@s.whatsapp.net'
    }

    if (!target) {
        return m.reply(
            `👑 *ᴀᴅᴅ ᴏᴡɴᴇʀ sʏsᴛᴇᴍ* 👑\n\n` +
            `> Silahkan masukkan nomor atau reply pesan target untuk dijadikan owner!\n\n` +
            `*Cara Penggunaan:* \n` +
            `• \`${m.prefix}addowner 6287876034799\` \n` +
            `• Reply pesan target lalu ketik \`${m.prefix}addowner\``
        )
    }

    await m.react('⌛')

    // Tentukan letak file config.js secara dinamis berdasarkan arsitektur struktur folder Tuan
    let configPath = path.join(__dirname, '../../config.js')
    if (!fs.existsSync(configPath)) {
        configPath = path.join(__dirname, '../../config/index.js')
    }

    try {
        if (!fs.existsSync(configPath)) {
            await m.react('❌')
            return m.reply('❌ File konfigurasi (`config.js` / `config/index.js`) tidak ditemukan!')
        }

        // Ambil data array owner asli saat ini dari file config (Bypass require cache)
        delete require.cache[require.resolve(configPath)]
        const currentConfig = require(configPath)

        let ownerArray = []
        if (currentConfig.owner && Array.isArray(currentConfig.owner)) {
            ownerArray = [...currentConfig.owner]
        } else if (currentConfig.config?.owner && Array.isArray(currentConfig.config.owner)) {
            ownerArray = [...currentConfig.config.owner]
        } else if (config.owner && Array.isArray(config.owner)) {
            // Fallback menggunakan config dari parameter context handler Tuan[span_8](start_span)[span_8](end_span)
            ownerArray = [...config.owner]
        }

        // Validasi jika nomor sudah terdaftar jadi owner
        if (ownerArray.includes(target)) {
            await m.react('⚠️')
            return m.reply(`Nomor \`@${target.split('@')[0]}\` sudah menjadi owner sebelumnya, Tuan!`, { mentions: [target] })
        }

        // Tambahkan target ke array owner yang baru
        ownerArray.push(target)

        // Proses modifikasi string file config menggunakan pencarian index terarah
        let configContent = fs.readFileSync(configPath, 'utf8')
        
        const startKey = 'owner: ['
        const startIndex = configContent.indexOf(startKey)

        if (startIndex === -1) {
            await m.react('❌')
            return m.reply('❌ Gagal sinkronisasi. String `owner: [` tidak ditemukan di file config Tuan.')
        }

        const endIndex = configContent.indexOf(']', startIndex)

        if (endIndex === -1) {
            await m.react('❌')
            return m.reply('❌ Gagal sinkronisasi. Kurung penutup `]` untuk owner tidak ditemukan.')
        }

        // Susun string format array baru sesuai keinginan Tuan
        const newOwnerString = `owner: [\n    ${ownerArray.map(v => `"${v}"`).join(',\n    ')}\n  ]`

        // Satukan kembali potongan file config yang baru
        const updatedConfigContent = 
            configContent.substring(0, startIndex) + 
            newOwnerString + 
            configContent.substring(endIndex + 1)

        // Tulis ulang file secara permanen
        fs.writeFileSync(configPath, updatedConfigContent, 'utf8')

        // Suntik data baru ke referensi objek config yang sedang aktif di runtime handler Tuan[span_9](start_span)[span_9](end_span)
        if (config) {
            if (config.owner) config.owner = ownerArray
            if (config.config?.owner) config.config.owner = ownerArray
        }
        if (global.config) {
            if (global.config.owner) global.config.owner = ownerArray
            if (global.config.config?.owner) global.config.config.owner = ownerArray
        }

        await m.reply(`✨ *sᴜᴋsᴇs ᴛᴀᴍʙᴀʜ ᴏᴡɴᴇʀ* ✨\n\nSelamat Tuan, @${target.split('@')[0]} sekarang telah resmi diangkat menjadi Owner baru!`, {
            mentions: [target]
        })

        await m.react('✅')

    } catch (error) {
        console.error('ADD_OWNER_ERROR:', error)
        await m.react('❌')
        await m.reply(`❌ Terjadi error saat memproses file config: ${error.message}`)
    }
}

module.exports = { config: pluginConfig, handler }