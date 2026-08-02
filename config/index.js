const config = {
  bot: {
    name: "Nexa Bot",
    version: "1.0.0",
    description: "WhatsApp Bot Powered by Baileys",
    developer: "Nexa Dev",
    support: "https://wa.me/628xxxxxxxxxx",
    number: "628xxxxxxxxxx",
    prefix: ".",
  },

  session: {
    folderName: "session",
    usePairingCode: true,
    pairingNumber: "628xxxxxxxxxx",
    printQRInTerminal: false,
    maxReconnectAttempts: 10,
    reconnectInterval: 5000,
  },

  owner: [
    "628xxxxxxxxxx@s.whatsapp.net",
  ],

  partner: [],

  saluran: {
    id: "120363208449943317@newsletter",
    name: "Nexa Bot",
    link: "https://wa.me/628xxxxxxxxxx",
  },

  features: {
    autoRead: false,
    autoTyping: true,
    antiSpam: true,
    logMessage: true,
    antiCall: true,
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

  APIkey: {
    nexaai: "", // ← Ganti dengan API key di api.nexadev.my.id/home
    groq: "",
    openai: "",
    gemini: "",
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
