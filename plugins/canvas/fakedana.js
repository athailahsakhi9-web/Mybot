const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

// Registrasi font menggunakan @napi-rs/canvas (Sesuaikan path jika diperlukan)
try {
    GlobalFonts.registerFromPath(process.cwd() + '/assets/fonts/Epep.ttf', 'CartoonVibes');
} catch (e) {
    console.log("⚠️ Gagal memuat font Epep.ttf, pastikan file ada di folder assets/fonts/");
}

async function generate(angka) {
  const bg = await loadImage('https://raw.githubusercontent.com/uploader762/dat3/main/uploads/9c18e0-1772932032348.jpg');
  const logo = await loadImage('https://raw.githubusercontent.com/uploader762/dat3/main/uploads/d0f081-1772929197100.png');

  const canvas = createCanvas(bg.width, bg.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(bg, 0, 0);

  ctx.font = '205px CartoonVibes';
  ctx.fillStyle = 'white';
  ctx.textBaseline = 'top';

  const x = 664;
  const y = 293;

  ctx.fillText(angka, x, y);

  const textWidth = ctx.measureText(angka).width;
  const jarak = 11;
  const logoSize = 370;
  const offsetY = -31;

  const logoX = x + textWidth + jarak;
  const logoY = y + offsetY;

  ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);

  return await canvas.encode('png'); // Menggunakan encode bawaan @napi-rs/canvas
}

const pluginConfig = {
    name: 'fakedana',
    alias: ['danafake'],
    category: 'canvas',
    description: 'Membuat gambar fake dana',
    usage: '.fakedana <nominal>',
    example: '.fakedana 50000',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
};

async function handler(m, { sock, text, command, prefix }) {
    // Bersihkan prefix dan command dari input nominal teks
    let nominal = text || m.text || '';
    const cmd = command || m.command || 'fakedana';
    const pfx = prefix || m.prefix || '.';

    if (nominal.includes(cmd)) {
        nominal = nominal.replace(/^\s*[\w\.\?\#\@\-\+\=\%\&\!\/\\]+\s*/, '').trim();
    }
    nominal = nominal.replace(/[^0-9]/g, '').trim(); // Hanya ambil angka bersih

    if (!nominal) {
        return m.reply(`*FAKE DANA*\n\n\`Contoh: ${pfx}${cmd} 10000\``);
    }
    
    if (isNaN(nominal)) return m.reply(`*HARAP MASUKKAN ANGKA YANG VALID*`);
    
    m.react('🕕');
    
    try {
        const saldo = Number(nominal).toLocaleString('id-ID');
        const fake = await generate(saldo);
        
        // Handler fleksibel untuk pengiriman gambar ke chat
        if (typeof sock.sendMedia === 'function') {
            await sock.sendMedia(m.chat, fake, null, m, { type: 'image' });
        } else {
            await sock.sendMessage(m.chat, { image: fake }, { quoted: m });
        }
        
        m.react('✅');
    } catch (error) {
        console.error(error);
        m.react('❌');
        m.reply(`❌ Terjadi kesalahan saat membuat fake dana: ${error.message || error}`);
    }
}

module.exports = { config: pluginConfig, handler };