// ╔══════════════════════════════════════════╗
// ║   NEXA BOT — ENV LOADER (Pterodactyl)    ║
// ╚══════════════════════════════════════════╝
//
// Pterodactyl meng-inject variabel melalui ENV.
// File ini membaca ENV dan mengoverride config/index.js

const configFile = require("./config/index");

// ─── Override dari ENV ─────────────────────────────────────────

if (process.env.BOT_NAME) configFile.bot.name = process.env.BOT_NAME;
if (process.env.BOT_PREFIX) configFile.command.prefix = process.env.BOT_PREFIX;
if (process.env.BOT_MODE) configFile.config.mode = process.env.BOT_MODE;

if (process.env.OWNER_NUMBER) {
  const ownerNum = process.env.OWNER_NUMBER.replace(/[^0-9]/g, "");
  configFile.owner = [`${ownerNum}@s.whatsapp.net`];
}

if (process.env.USE_PAIRING_CODE) {
  configFile.session.usePairingCode = process.env.USE_PAIRING_CODE === "true";
}

if (process.env.PAIRING_NUMBER) {
  configFile.session.pairingNumber = process.env.PAIRING_NUMBER;
}

if (process.env.AUTO_READ) {
  configFile.features.autoRead = process.env.AUTO_READ === "true";
}

if (process.env.ANTI_CALL) {
  configFile.features.antiCall = process.env.ANTI_CALL === "true";
}

if (process.env.GROQ_API_KEY) {
  configFile.APIkey.groq = process.env.GROQ_API_KEY;
}

module.exports = configFile;
