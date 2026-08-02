const ojekSessions = new Map() // chatId → session

const ORDERS = [
  { name: 'Ibu Sari',    dest: '🏪 Indomaret',        distance: '500m',  fare: 5000,  tip: [0, 0, 2000]  },
  { name: 'Pak Doni',    dest: '🏥 Rumah Sakit',       distance: '3km',   fare: 25000, tip: [0, 3000, 5000] },
  { name: 'Mbak Rina',   dest: '🏫 Sekolah',           distance: '1.5km', fare: 12000, tip: [0, 0, 1000]  },
  { name: 'Bang Ucok',   dest: '🛒 Pasar Tradisional', distance: '2km',   fare: 18000, tip: [0, 2000, 4000] },
  { name: 'Bu Dewi',     dest: '🍜 Warung Makan',      distance: '800m',  fare: 8000,  tip: [0, 0, 1500]  },
  { name: 'Pak Hendra',  dest: '🏦 Bank BRI',          distance: '1.8km', fare: 15000, tip: [0, 1000, 3000] },
  { name: 'Mas Agus',    dest: '🚉 Stasiun',           distance: '4km',   fare: 30000, tip: [0, 5000, 8000] },
  { name: 'Neng Fitri',  dest: '💊 Apotek',            distance: '700m',  fare: 7000,  tip: [0, 0, 2000]  },
  { name: 'Pak Bos',     dest: '🏬 Mall',              distance: '5km',   fare: 35000, tip: [2000, 5000, 10000] },
  { name: 'Kang Asep',   dest: '⛽ SPBU',              distance: '1km',   fare: 10000, tip: [0, 1000, 2000] },
  { name: 'Bu Tini',     dest: '🏡 Kompleks Perumahan',distance: '2.5km', fare: 20000, tip: [0, 2000, 5000] },
  { name: 'Mas Budi',    dest: '🎓 Kampus',            distance: '6km',   fare: 40000, tip: [3000, 5000, 10000] },
]

const EVENTS = [
  { text: '🚦 Kena macet panjang... penumpang agak kesal.',  penalty: true  },
  { text: '🌧️ Hujan deras, penumpang senang kamu tetap jalan!', bonus: true },
  { text: '🚧 Jalan ditutup, harus muter jauh.',             penalty: true  },
  { text: '🟢 Jalanan lancar jaya!',                         normal: true   },
  { text: '☀️ Cuaca cerah, perjalanan menyenangkan!',        normal: true   },
  { text: '🎵 Penumpang baik hati, kasih tip lebih!',        bonus: true    },
  { text: '😤 Penumpang cerewet terus komplain.',            penalty: true  },
]

function formatRupiah(n) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

module.exports = {
  config: {
    name: 'ngojek',
    alias: ['ojek', 'ambilorder', 'sampai'],
    category: 'fun',
    description: 'Jadi driver ojek, ambil orderan, antar penumpang, dapat koin!',
    usage: '.ngojek',
    example: '.ngojek',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    isEnabled: true,
  },

  async handler(m, { db }) {
    const cmd  = m.command?.toLowerCase()
    const chat = m.chat

    // ╔══════════════════════╗
    // ║  NGOJEK - CARI ORDER ║
    // ╚══════════════════════╝
    if (cmd === 'ngojek' || cmd === 'ojek') {
      const session = ojekSessions.get(chat)

      if (session) {
        return m.reply(
          `🛵 Masih ada orderan aktif!\n\n` +
          `👤 Penumpang: *${session.order.name}*\n` +
          `📍 Tujuan: *${session.order.dest}*\n` +
          `💰 Ongkos: *${formatRupiah(session.order.fare)}*\n\n` +
          `> \`.sampai\` — tandai sudah sampai\n` +
          `> \`.ngojek batal\` — tolak orderan`
        )
      }

      if (m.text?.toLowerCase() === 'batal') {
        return m.reply('❌ Tidak ada orderan aktif.')
      }

      const user = db.getUser(m.sender) || {}
      const order = randomItem(ORDERS)

      ojekSessions.set(chat, { order })

      return m.reply(
        `🛵 *ORDER MASUK!*\n\n` +
        `👤 Penumpang: *${order.name}*\n` +
        `📍 Tujuan: *${order.dest}*\n` +
        `📏 Jarak: *${order.distance}*\n` +
        `💰 Ongkos: *${formatRupiah(order.fare)}*\n\n` +
        `┃ 💼 Koin kamu: *${formatRupiah(user.koin || 0)}*\n\n` +
        `> \`.sampai\` — antar & selesaikan\n` +
        `> \`.ngojek batal\` — tolak orderan`
      )
    }

    // Batal
    if (cmd === 'ngojek' && m.text?.toLowerCase() === 'batal') {
      const session = ojekSessions.get(chat)
      if (!session) return m.reply('❌ Tidak ada orderan aktif.')
      ojekSessions.delete(chat)
      return m.reply(
        `🏳️ Orderan ditolak.\n\n` +
        `> Rating kamu bisa turun kalau sering nolak! 😅`
      )
    }

    // ╔══════════════════════╗
    // ║  SAMPAI - SELESAI    ║
    // ╚══════════════════════╝
    if (cmd === 'sampai') {
      const session = ojekSessions.get(chat)

      if (!session) {
        return m.reply(`❌ Belum ambil orderan!\nKetik \`.ngojek\` untuk cari order.`)
      }

      const { order } = session
      const event = randomItem(EVENTS)

      // Hitung penghasilan
      let earned = order.fare
      let tipAmount = 0
      let eventMsg = event.text

      if (event.bonus) {
        tipAmount = randomItem(order.tip.filter(t => t > 0)) || 0
        earned += tipAmount
      } else if (event.penalty) {
        const potongan = Math.round(order.fare * 0.1)
        earned -= potongan
        eventMsg += `\n┃ ⚠️ Potongan: *-${formatRupiah(potongan)}*`
      }

      if (tipAmount > 0) {
        eventMsg += `\n┃ 🎁 Tip: *+${formatRupiah(tipAmount)}*`
      }

      const user = db.getUser(m.sender) || {}
      const koinBefore = user.koin || 0
      const koinAfter  = koinBefore + earned
      const totalOrder = (user.totalOrder || 0) + 1

      // Hitung rating sederhana
      let ratingChange = event.penalty ? -0.1 : event.bonus ? +0.2 : +0.1
      const rating = Math.min(5.0, Math.max(1.0, parseFloat(((user.ojekRating || 5.0) + ratingChange).toFixed(1))))

      db.setUser(m.sender, {
        koin: koinAfter,
        totalOrder,
        ojekRating: rating,
      })

      ojekSessions.delete(chat)

      return m.reply(
        `🏁 *SAMPAI TUJUAN!*\n\n` +
        `👤 *${order.name}* diantar ke ${order.dest}\n\n` +
        `${eventMsg}\n\n` +
        `┃ 💰 Penghasilan: *+${formatRupiah(earned)}*\n` +
        `┃ 💼 Koin sekarang: *${formatRupiah(koinAfter)}*\n` +
        `┃ 📦 Total order: *${totalOrder}x*\n` +
        `┃ ⭐ Rating: *${rating}/5.0*\n\n` +
        `> \`.ngojek\` — cari orderan lagi`
      )
    }
  },
}
