// ╔══════════════════════════════════════════╗
// ║      NEXA BOT - JADIBOT MESSAGE HOOK      ║
// ╚══════════════════════════════════════════╝
// Dipanggil di awal messageHandler (untuk sock manapun, termasuk sock
// milik sesi jadibot itu sendiri). Dipakai untuk command cepat
// menghentikan sesi jadibot dari dalam chat pribadi bot tersebut
// (mis. nomor jadibot kirim ".stopjadibot" ke dirinya sendiri).

const { listSessions, deleteJadiBotSession } = require("./jadibotManager");

async function handleJadiBot(m, sock) {
  try {
    if (!m?.isCommand || !m?.fromMe) return false;

    const cmd = m.command?.toLowerCase();
    if (cmd !== "stopjadibot" && cmd !== "delsesi") return false;

    const botNumber = sock.user?.id?.split(":")[0]?.split("@")[0];
    if (!botNumber) return false;

    const isJadiBotSock = listSessions().some(s => s.number === botNumber);
    if (!isJadiBotSock) return false;

    await sock.sendMessage(m.chat, {
      text: "👋 Sesi jadibot ini akan dihentikan...",
    }).catch(() => {});

    await deleteJadiBotSession(botNumber);
    return true;
  } catch {
    return false;
  }
}

module.exports = { handleJadiBot };
