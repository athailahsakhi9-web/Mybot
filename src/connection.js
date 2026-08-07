// ╔══════════════════════════════════════╗
// ║       NEXA BOT - CONNECTION v1.0.0    ║
// ╚══════════════════════════════════════╝

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  getContentType,
} = require("nexa");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const NodeCache = require("node-cache");
const config = require("../config");
const colors = require("./lib/colors");
const { startAutoFollow, stopAutoFollow } = require("./lib/voxy");

const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });
const processedMessages = new NodeCache({ stdTTL: 30, useClones: false });
const msgRetryCounterCache = new NodeCache({ stdTTL: 60, useClones: false });

const store = makeInMemoryStore({ logger: pino({ level: "silent" }) });

const storePath = path.join(process.cwd(), "storage", "baileys_store.json");

// Load existing store
try {
  if (fs.existsSync(storePath)) store.readFromFile(storePath);
} catch (err) {
  colors.logger.warn("Store", "Gagal load store: " + err.message);
}

// Save store periodically
setInterval(() => {
  try {
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    store.writeToFile(storePath);
  } catch (err) {
    // Silent fail
  }
}, 60000);

const connectionState = {
  isConnected: false,
  isReady: false,
  sock: null,
  reconnectAttempts: 0,
  connectedAt: null,
};

const logger = pino({ level: "silent" });

function askQuestion(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => { rl.close(); resolve(answer.trim()); });
  });
}

async function startConnection(options = {}) {
  // Clean up existing socket
  if (connectionState.sock) {
    try {
      connectionState.sock.ev.removeAllListeners();
      connectionState.sock.end();
    } catch {}
    connectionState.sock = null;
    // Tunggu sebentar agar socket benar-benar tertutup
    await new Promise(r => setTimeout(r, 500));
  }

  const sessionPath = path.join(process.cwd(), "storage", config.session?.folderName || "session");
  if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

  let state, saveCreds;
  try {
    const authState = await useMultiFileAuthState(sessionPath);
    state = authState.state;
    saveCreds = authState.saveCreds;
  } catch (err) {
    colors.logger.error("Auth", "Gagal init auth state: " + err.message);
    throw err;
  }

  // Versi Baileys di-hardcode manual (fetchLatestBaileysVersion() di-skip).
  const version = [2, 3000, 1043857760];
  colors.logger.info("WA", `Baileys version: v${version.join(".")} (manual)`);

  const usePairingCode = config.session?.usePairingCode === true;

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: !usePairingCode && (config.session?.printQRInTerminal ?? true),
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
    transactionOpts: { maxCommitRetries: 1, delayBetweenTriesMs: 500 },
    getMessage: async key => {
      try {
        const msg = store ? await store.loadMessage(key.remoteJid, key.id) : undefined;
        return msg?.message || undefined;
      } catch {
        return undefined;
      }
    },
    cachedGroupMetadata: async jid => groupCache.get(jid),
    msgRetryCounterCache,
  });

  store.bind(sock.ev);
  sock.store = store;
  connectionState.sock = sock;

  // ─── Custom Sticker Helpers ───────────────────────────────────
  const ffmpeg        = require('fluent-ffmpeg');
  const ffmpegPath    = require('@ffmpeg-installer/ffmpeg').path;
  const sharp         = require('sharp');
  const { tmpdir }    = require('os');
  const { join: pjoin } = require('path');
  const { writeFile: wf, readFile: rf, unlink: ul } = require('fs').promises;
  const { randomBytes } = require('crypto');
  ffmpeg.setFfmpegPath(ffmpegPath);

  // Kirim image buffer sebagai sticker
  sock.sendImageAsSticker = async (jid, buffer, quoted, opts = {}) => {
    const stickerBuffer = await sharp(buffer)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 80 })
      .toBuffer();
    return sock.sendMessage(jid, {
      sticker: stickerBuffer,
      stickerName:   opts.packname || config.bot?.name || 'NEXA BOT',
      stickerAuthor: opts.author   || 'Nexa'
    }, { quoted });
  };

  // Kirim video/gif buffer sebagai animated sticker
  sock.sendVideoAsSticker = async (jid, buffer, quoted, opts = {}) => {
    const id      = randomBytes(6).toString('hex');
    const inFile  = pjoin(tmpdir(), `sticker_in_${id}.mp4`);
    const outFile = pjoin(tmpdir(), `sticker_out_${id}.webp`);
    try {
      await wf(inFile, buffer);
      await new Promise((resolve, reject) => {
        ffmpeg(inFile)
          .outputOptions([
            '-vcodec', 'libwebp',
            '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse',
            '-loop', '0', '-preset', 'default', '-an', '-vsync', '0'
          ])
          .toFormat('webp')
          .output(outFile)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
      const stickerBuffer = await rf(outFile);
      return sock.sendMessage(jid, {
        sticker: stickerBuffer,
        stickerName:   opts.packname || config.bot?.name || 'NEXA BOT',
        stickerAuthor: opts.author   || 'Nexa'
      }, { quoted });
    } finally {
      await ul(inFile).catch(() => {});
      await ul(outFile).catch(() => {});
    }
  };

  // ─── Pairing Code ────────────────────────────────────────────
  // Pairing dipindah ke dalam connection.update agar socket sudah siap

  sock.ev.on("creds.update", saveCreds);

  // ─── Connection Update ────────────────────────────────────────
  // Flag untuk pastikan pairing hanya request 1x
  let pairingRequested = false;

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr, isOnline }) => {
    if (qr && !usePairingCode) {
      colors.logger.info("QR", "QR Code diterima, scan sekarang!");
    }

    // ─── Request Pairing Code saat socket sudah connecting ───────
    if (usePairingCode && !sock.authState.creds.registered && !pairingRequested) {
      // Hanya request sekali, saat ada sinyal pertama dari WA server
      if (connection === "connecting" || (connection !== "open" && connection !== "close")) {
        pairingRequested = true;
        let phoneNumber = config.session?.pairingNumber || "";
        if (!phoneNumber) {
          try {
            phoneNumber = await askQuestion(colors.chalk.cyan("📱 Masukkan nomor WA (contoh: 6281234567890): "));
          } catch (err) {
            colors.logger.error("PAIRING", "Gagal read input: " + err.message);
            pairingRequested = false;
            return;
          }
        }
        phoneNumber = phoneNumber.replace(/[^0-9]/g, "");
        if (!phoneNumber || phoneNumber.length < 10) {
          colors.logger.error("PAIRING", "Nomor tidak valid!");
          pairingRequested = false;
          return;
        }
        colors.logger.info("PAIRING", `Meminta kode pairing untuk ${phoneNumber}...`);
        // Tunggu 3 detik agar socket benar-benar siap menerima request
        await new Promise(r => setTimeout(r, 3000));
        try {
          const code = await sock.requestPairingCode(phoneNumber, "NEXAABOT");
          console.log("");
          console.log(colors.createBanner([
            "",
            "  PAIRING CODE  ",
            "",
            `  ${colors.chalk.bold(colors.chalk.greenBright(code))}  `,
            "",
            "  Masukkan di WhatsApp > Perangkat Tertaut  ",
            "",
          ], "green"));
          console.log("");
        } catch (err) {
          colors.logger.error("PAIRING", "Gagal request pairing code: " + err.message);
          pairingRequested = false;
        }
      }
    }

    if (connection === "close") {
      connectionState.isConnected = false;
      connectionState.isReady = false;

      // Stop auto-follow saat disconnect
      stopAutoFollow();

      const statusCode = lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error.output?.statusCode
        : undefined;
      
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401;

      colors.logger.warn("WA", `Terputus — kode: ${statusCode || "unknown"}`);

      if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
        colors.logger.error("WA", "Session logout — hapus folder session dan scan ulang.");
        connectionState.reconnectAttempts = 0;
        
        // Optional: auto-delete session folder on logout
        try {
          fs.rmSync(sessionPath, { recursive: true, force: true });
          colors.logger.info("WA", "Session folder dihapus.");
        } catch {}
        return;
      }

      if (shouldReconnect) {
        connectionState.reconnectAttempts++;

        let delay;
        if (statusCode === 500 || statusCode === 503) {
          // WA server error → reconnect cepat
          delay = 3000;
        } else if (!statusCode) {
          // Unknown/undefined → kemungkinan pairing timeout atau network
          // Jangan reconnect terlalu cepat, tunggu lebih lama
          delay = Math.min(
            5000 * connectionState.reconnectAttempts,
            60_000 // max 60 detik untuk kasus unknown
          );
        } else {
          // Kode lain → delay bertahap max 30 detik
          delay = Math.min(
            3000 * connectionState.reconnectAttempts,
            30_000
          );
        }

        // Reset pairingRequested agar bisa request ulang saat reconnect
        pairingRequested = false;

        colors.logger.info("WA", `Reconnect ke-${connectionState.reconnectAttempts} dalam ${delay/1000}s (kode: ${statusCode || 'unknown'})...`);
        setTimeout(() => startConnection(options), delay);
      }
    }

    if (connection === "open") {
      connectionState.isConnected = true;
      connectionState.isReady = true;
      connectionState.reconnectAttempts = 0;
      connectionState.connectedAt = new Date();
      global._botConnectedAt = Date.now();

      // ── Auto follow saluran ──────────────────────────────────
      startAutoFollow(sock);

      const botNumber = sock.user?.id?.split(":")[0] || sock.user?.id?.split("@")[0];
      if (botNumber) {
        try {
          config.setBotNumber?.(botNumber);
        } catch {}
      }

      console.log("");
      console.log(colors.createBanner([
        "",
        `  ${config.bot?.name || "Nexa Bot"} v${config.bot?.version || "1.0.0"}  `,
        `  Number: ${botNumber || "Unknown"}  `,
        "  Status: CONNECTED ✅  ",
        "",
      ], "cyan"));
      console.log("");

      // Load plugins after connect
      setTimeout(async () => {
        try {
          const { reloadAllPlugins, getPluginCount } = require("./lib/plugins");
          if (!getPluginCount || !getPluginCount()) {
            const count = await reloadAllPlugins();
            colors.logger.success("Plugins", `${count} plugins loaded`);
          }
        } catch (e) {
          colors.logger.error("Plugins", e.message);
        }
      }, 500);

      colors.logger.success("Ready", `${config.bot?.name || "Nexa Bot"} siap menerima pesan!`);

      // ── Keep-alive ping agar koneksi tidak idle / disconnect ────
      if (global._keepAliveInterval) clearInterval(global._keepAliveInterval)
      global._keepAliveInterval = setInterval(async () => {
        if (!connectionState.isConnected) return
        try {
          await sock.sendPresenceUpdate('available')
        } catch (_) {}
      }, 25_000) // ping setiap 25 detik

      if (options.onConnectionUpdate) {
        try {
          await options.onConnectionUpdate({ connection: "open" }, sock);
        } catch (err) {
          colors.logger.error("ConnectionUpdate", err.message);
        }
      }
    }
  });

  // ─── Messages Upsert ─────────────────────────────────────────
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify" && type !== "append") return;

    // Wait until ready
    if (!connectionState.isReady) {
      let retries = 0;
      while (!connectionState.isReady && retries < 10) {
        await new Promise(r => setTimeout(r, 200));
        retries++;
      }
      if (!connectionState.isReady) return;
    }

    const currentSock = connectionState.sock;
    if (!currentSock) return;

    for (const msg of messages) {
      if (!msg.message) continue;

      // Deduplicate
      const msgId = msg.key?.id;
      if (!msgId) continue;
      if (processedMessages.has(msgId)) continue;
      processedMessages.set(msgId, true);

      // Skip old messages (> 5 min)
      const msgTimestamp = (msg.messageTimestamp || 0) * 1000;
      if (Date.now() - msgTimestamp > 5 * 60 * 1000) continue;

      // Skip status broadcast
      const jid = msg.key.remoteJid || "";
      if (jid === "status@broadcast" || jid.endsWith("@broadcast")) continue;
      if (!jid || jid.length < 5) continue;

      // Skip append from self
      if (msg.key.fromMe && type === "append") continue;

      // Get message type
      const mtype = getContentType(msg.message) || "";
      const ignoredTypes = [
        "protocolMessage", "reactionMessage", "senderKeyDistributionMessage",
        "pollUpdateMessage", "keepInChatMessage", "deviceSentMessage",
        "peerDataOperationRequestMessage", "encReactionMessage",
      ];
      if (ignoredTypes.includes(mtype)) continue;

      if (options.onMessage) {
        try {
          await options.onMessage(msg, currentSock);
        } catch (err) {
          colors.logger.error("Message", err.message);
        }
      }
    }
  });

  // ─── Group Participants ───────────────────────────────────────
  sock.ev.on("group-participants.update", async event => {
    try {
      const metadata = await sock.groupMetadata(event.id);
      groupCache.set(event.id, metadata);
    } catch {}
    
    if (options.onParticipantsUpdate) {
      try {
        await options.onParticipantsUpdate(event, sock);
      } catch {}
    }
  });

  // ─── Groups Update ────────────────────────────────────────────
  sock.ev.on("groups.update", async (events) => {
    if (!Array.isArray(events)) return;
    
    for (const event of events) {
      if (!event.id) continue;
      try {
        const metadata = await sock.groupMetadata(event.id);
        groupCache.set(event.id, metadata);
      } catch {}
      
      if (options.onGroupSettingsUpdate) {
        try {
          await options.onGroupSettingsUpdate(event, sock);
        } catch {}
      }
    }
  });

  // ─── Call Handler ────────────────────────────────────────────
  if (config.features?.antiCall) {
    sock.ev.on("call", async calls => {
      for (const call of calls) {
        if (call.status === "offer") {
          await sock.rejectCall(call.id, call.from).catch(() => {});
          await sock.sendMessage(call.from, {
            text: config.messages?.rejectCall || "❌ Maaf, bot tidak menerima panggilan!",
          }).catch(() => {});
        }
      }
    });
  }

  return sock;
}

function getConnectionState() { return connectionState; }
function getSocket() { return connectionState.sock; }
function isConnected() { return connectionState.isConnected; }
function getUptime() {
  if (!connectionState.connectedAt) return 0;
  return Date.now() - connectionState.connectedAt.getTime();
}

module.exports = { startConnection, getConnectionState, getSocket, isConnected, getUptime };