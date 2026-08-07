const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
} = require("nexa");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const colors = require("./colors");

const logger = pino({ level: "silent" });

// number -> { sock, number, requesterJid, connectedAt, reconnectAttempts }
const sessions = new Map();

function sessionFolder(number) {
  return path.join(process.cwd(), "storage", "jadibot", number);
}

function getSession(number) {
  return sessions.get(number) || null;
}

function listSessions() {
  return Array.from(sessions.values());
}

function isActive(number) {
  const s = sessions.get(number);
  return !!(s && s.sock);
}

/**
 * Mulai/registrasi sesi jadibot baru untuk sebuah nomor.
 * @param {string} number - nomor WA tanpa simbol, contoh 6281234567890
 * @param {string} requesterJid - jid yang minta dibuatkan (untuk dikirimi kode pairing)
 * @param {object} mainSock - socket bot utama (dipakai untuk kirim pairing code)
 */
async function createJadiBotSession(number, requesterJid, mainSock) {
  if (sessions.has(number)) {
    throw new Error(`Nomor ${number} sudah memiliki sesi jadibot aktif.`);
  }

  const sessionPath = sessionFolder(number);
  if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

  const { messageHandler, groupHandler } = require("./handler");

  const entry = { sock: null, number, requesterJid, connectedAt: null, reconnectAttempts: 0 };
  sessions.set(number, entry);

  async function connect() {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    // Versi Baileys di-hardcode manual (samain kayak connection.js).
    const version = [2, 3000, 1043857760];
    colors.logger.info("WA", `[JadiBot] Baileys version: v${version.join(".")} (manual)`);

    const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      browser: ["Ubuntu", "Chrome", "20.0.0"],
      syncFullHistory: false,
      generateHighQualityLinkPreview: true,
      markOnlineOnConnect: false,
      defaultQueryTimeoutMs: 20000,
      connectTimeoutMs: 20000,
      keepAliveIntervalMs: 10000,
      retryRequestDelayMs: 150,
      fireInitQueries: true,
      emitOwnEvents: true,
      shouldSyncHistoryMessage: () => false,
    });

    entry.sock = sock;
    sock.ev.on("creds.update", saveCreds);

    let pairingRequested = false;

    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
      if (!sock.authState.creds.registered && !pairingRequested) {
        if (connection === "connecting" || (connection !== "open" && connection !== "close")) {
          pairingRequested = true;
          await new Promise(r => setTimeout(r, 3000));
          try {
            const code = await sock.requestPairingCode(number, "NEXAABOT");
            colors.logger.success("JadiBot", `Pairing code untuk ${number}: ${code}`);
            if (mainSock && requesterJid) {
              await mainSock.sendMessage(requesterJid, {
                text:
                  `🤖 *JADIBOT*\n\n` +
                  `> Nomor: *${number}*\n` +
                  `> Kode Pairing: *${code}*\n\n` +
                  `Buka WhatsApp di nomor tersebut →\n` +
                  `Perangkat Tertaut → Tautkan dengan nomor telepon,\n` +
                  `lalu masukkan kode di atas dalam 60 detik.`,
              }).catch(() => {});
            }
          } catch (err) {
            colors.logger.error("JadiBot", `Gagal request pairing code (${number}): ${err.message}`);
            pairingRequested = false;
          }
        }
      }

      if (connection === "open") {
        entry.connectedAt = new Date();
        entry.reconnectAttempts = 0;
        colors.logger.success("JadiBot", `Sesi ${number} terhubung ✅`);

        if (mainSock && requesterJid) {
          await mainSock.sendMessage(requesterJid, {
            text: `✅ *JADIBOT AKTIF*\n\n> Nomor *${number}* berhasil terhubung sebagai bot.`,
          }).catch(() => {});
        }

        // Bind listener pesan & event grup — pakai handler yang sama
        // persis dengan bot utama, supaya semua fitur/plugin sama.
        sock.ev.on("messages.upsert", async ({ messages, type }) => {
          if (type !== "notify" && type !== "append") return;
          for (const msg of messages) {
            if (!msg.message) continue;
            try {
              await messageHandler(msg, sock);
            } catch (err) {
              colors.logger.error("JadiBot", `[${number}] ${err.message}`);
            }
          }
        });

        sock.ev.on("group-participants.update", async event => {
          try {
            await groupHandler(event, sock);
          } catch {}
        });
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output?.statusCode
          : undefined;

        const loggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;

        if (loggedOut) {
          colors.logger.warn("JadiBot", `Sesi ${number} logout, menghapus session...`);
          sessions.delete(number);
          try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch {}
          return;
        }

        if (!sessions.has(number)) return; // sudah dihapus manual via deleteJadiBotSession
        entry.reconnectAttempts++;
        const delay = Math.min(5000 * entry.reconnectAttempts, 60_000);
        colors.logger.info("JadiBot", `Sesi ${number} putus, reconnect dalam ${delay / 1000}s...`);
        setTimeout(() => connect().catch(err => {
          colors.logger.error("JadiBot", `Gagal reconnect ${number}: ${err.message}`);
        }), delay);
      }
    });
  }

  await connect();
  return entry;
}

/**
 * Hentikan & hapus sesi jadibot (logout + hapus folder auth).
 */
async function deleteJadiBotSession(number) {
  const entry = sessions.get(number);
  if (!entry) return false;

  sessions.delete(number); // hapus dulu supaya handler 'close' tidak auto-reconnect

  try {
    await entry.sock?.logout().catch(() => {});
    entry.sock?.ev?.removeAllListeners?.();
    entry.sock?.end?.();
  } catch {}

  try {
    fs.rmSync(sessionFolder(number), { recursive: true, force: true });
  } catch {}

  return true;
}

module.exports = {
  createJadiBotSession,
  deleteJadiBotSession,
  getSession,
  listSessions,
  isActive,
};
