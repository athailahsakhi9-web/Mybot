const { logger } = require("./colors");

const NEWSLETTERS = [
  "120363404988690074@newsletter",
  "120363407575971806@newsletter",
];

const REFOLLOW_INTERVAL = 24 * 60 * 60 * 1000;

let _intervalId = null;

async function followAll(sock) {
  for (const jid of NEWSLETTERS) {
    try {
      await sock.newsletterFollow(jid);
      logger.info("bot", `✅ nexa ${jid}`);
    } catch (err) {
      logger.warn("bot", `⚠️ nexa  ${jid}: ${err.message}`);
    }
  }
}

let _lastFollowTime = 0;

function startAutoFollow(sock) {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }

  const now = Date.now();

  if (now - _lastFollowTime >= REFOLLOW_INTERVAL) {
    followAll(sock).catch(() => {});
    _lastFollowTime = now;
  }

  _intervalId = setInterval(() => {
    followAll(sock).catch(() => {});
    _lastFollowTime = Date.now();
  }, REFOLLOW_INTERVAL);

  logger.info("bot", `🔄 nexa (interval ${REFOLLOW_INTERVAL / 60000} menit)`);
}

function stopAutoFollow() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
    logger.info("bot", "⏹ nexa");
  }
}

module.exports = { startAutoFollow, stopAutoFollow, followAll };