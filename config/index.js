const config = {
  bot: {
    name: "Vortex Bot",
    version: "1.1.0",
    description: "WhatsApp Bot By KaizenDev",
    developer: "Kaizen Dev",
    support: "https://wa.me/6282113856471",
    number: "6282113856471", // samakan dengan pairing code
    prefix: ".",
  },

  session: {
    folderName: "session",
    usePairingCode: true,
    pairingNumber: "6282113856471", // nomer pairing code 
    printQRInTerminal: false,
    maxReconnectAttempts: 10,
    reconnectInterval: 5000,
  },

  owner: [
    "6282113856471@s.whatsapp.net", //masukan nomer owner
  ],

  partner: [],

  saluran: {
    id: "120363208449943317@newsletter",
    name: "Nexa Bot",
    link: "https://wa.me/6282113856471",
  },

  features: {
    autoRead: false,
    autoTyping: true,
    antiSpam: true,
    logMessage: true,
    antiCall: false,
    blockIfCall: false,
    smartTriggers: true,
  },

  messages: {
    ownerOnly: "⚠︎ ᴀᴋꜱᴇꜱ ᴅɪ ᴛᴏʟᴀᴋ \n\n> ꜰɪᴛᴜʀ ɪɴɪ ᴄᴜᴍᴀɴ ʙɪꜱᴀ ᴅɪ ɢᴜɴᴀᴋᴀɴ ꜱᴀᴍᴀ ᴏᴡɴᴇʀ",
    premiumOnly: "💎 *Premium Only!*\n\n> Upgrade ke premium untuk menggunakan fitur ini!",
    groupOnly: "👥 *Group Only!*\n\n> Command ini hanya bisa digunakan di grup!",
    privateOnly: "📱 *Private Only!*\n\n> Command ini hanya bisa digunakan di private chat!",
    adminOnly: "👮 *Admin Only!*\n\n> Command ini hanya untuk admin grup!",
    botAdminOnly: "🤖 *Bot harus menjadi admin!*\n\n> Jadikan bot sebagai admin grup terlebih dahulu!",
    cooldown: "⏱️ Tunggu *%time%* detik sebelum menggunakan command ini lagi!",
    rejectCall: "❌ *Maaf, bot tidak menerima panggilan!*\n\n> Gunakan chat untuk berinteraksi dengan bot.",
    energiExceeded: "⚡ *Energi Tidak Cukup!*\n\n> Kamu kehabisan energi! Tunggu hingga energi terisi kembali.",
  },

  config: {
    mode: "public", // public / self
  },

  registration: {
    enabled: false,
  },

  energi: {
    enabled: false,
    owner: -1,
    premium: -1,
  },

  command: {
    prefix: ".",
  },

  // 🔑 api key daftar di api.nexadev.my.id/home 
  APIkey: {
    nexaai: "", // samakan dengan apinexa
    apinexa: "", // ← Topup Limit/premium di topup.nexapanel.my.id
  },

  // 🌐 Base Endpoint URL API NexaDev
  api: {
    apinexa: "https://api.nexadev.my.id", // ← Endpoint URL NexaDev
  },

  dev: {
    debugLog: false,
  },

  setBotNumber(number) {
    this.bot.number = number;
  },

  isOwner(jid) {
    if (!jid) return false;
    const number = jid.split("@")[0].split(":")[0];
    return this.owner.some(o => {
      const oNum = o.split("@")[0].split(":")[0];
      return oNum === number;
    });
  },

  isPartner(jid) {
    if (!jid) return false;
    const number = jid.split("@")[0].split(":")[0];
    return this.partner.some(p => {
      const pNum = p.split("@")[0].split(":")[0];
      return pNum === number;
    });
  },
};

module.exports = config;
module.exports.isSelf = () => config.config.mode === "self";
