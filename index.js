// ╔══════════════════════════════════════════╗
// ║        NEXA BOT v1.0.0 — index.js        ║
// ╚══════════════════════════════════════════╝

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ─── Self-healing: auto-install deps if missing ─────────────────
const requiredModules = [
  "nexa",
  "@hapi/boom",
  "pino",
  "node-cache",
  "axios",
  "chalk",
  "jimp",
  "moment",
  "moment-timezone",
  "qrcode-terminal",
  "sharp",
];

let needsInstall = false;
for (const mod of requiredModules) {
  try {
    require.resolve(mod);
  } catch {
    needsInstall = true;
    break;
  }
}

if (needsInstall) {
  console.log("[NEXA] Dependencies missing! Running npm install...");
  try {
    execSync("npm install", { stdio: "inherit", cwd: process.cwd() });
    console.log("[NEXA] Dependencies installed successfully!");
  } catch (err) {
    console.error("[NEXA] Failed to install dependencies:", err.message);
    console.error("[NEXA] Please run 'npm install' manually in the console.");
    process.exit(1);
  }
}

// ─── Now safe to load modules ─────────────────────────────────
const { startConnection } = require("./src/connection");
const { messageHandler, groupHandler } = require("./src/lib/handler");
const { reloadAllPlugins } = require("./src/lib/plugins");
const colors = require("./src/lib/colors");
const config = require("./config");

// ─── Ensure directories exist ─────────────────────────────────
const dirs = ["storage", "tmp", "assets/images"];
for (const dir of dirs) {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
}

// ─── Print banner ─────────────────────────────────────────────
console.log("");
console.log(colors.createBanner([
  "",
  `  ${config.bot?.name || "Nexa Bot"} v${config.bot?.version || "1.0.0"}  `,
  "  WhatsApp Bot — Powered by Baileys  ",
  `  Developer: ${config.bot?.developer || "Nexa Dev"}  `,
  "",
], "cyan"));
console.log("");

// ─── Main startup ─────────────────────────────────────────────
(async () => {
  try {
    colors.logger.info("Startup", "Memuat plugins...");
    const count = await reloadAllPlugins();
    colors.logger.success("Startup", `${count} plugins dimuat`);

    await startConnection({
      onMessage: async (msg, sock) => {
        try {
          await messageHandler(msg, sock);
        } catch (err) {
          colors.logger.error("MessageHandler", err.message);
        }
      },

      onParticipantsUpdate: async (event, sock) => {
        try {
          await groupHandler(event, sock);
        } catch (err) {
          colors.logger.error("GroupHandler", err.message);
        }
      },

      onConnectionUpdate: async (update, sock) => {
        // Additional handling if needed
      },

      onGroupSettingsUpdate: async (event, sock) => {
        // Optional
      },
    });
  } catch (err) {
    colors.logger.error("Fatal", err.message);
    console.error(err);
    process.exit(1);
  }
})();

// ─── Graceful shutdown ────────────────────────────────────────
process.on("SIGINT", () => {
  colors.logger.warn("Shutdown", "Bot dihentikan...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  colors.logger.warn("Shutdown", "SIGTERM received, exiting...");
  process.exit(0);
});

process.on("uncaughtException", err => {
  colors.logger.error("UncaughtException", err.message);
  console.error(err);
});

process.on("unhandledRejection", (reason, promise) => {
  colors.logger.error("UnhandledRejection", String(reason));
  console.error("Unhandled Rejection at:", promise);
});
