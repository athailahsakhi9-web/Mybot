// ╔══════════════════════════════════════╗
// ║      NEXA BOT - PERFORMANCE           ║
// ╚══════════════════════════════════════╝

const NodeCache = require("node-cache");

const messageCache = new NodeCache({ stdTTL: 30, checkperiod: 60 });
const userCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const groupCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const settingCache = new NodeCache({ stdTTL: 60, checkperiod: 30 });

/**
 * Debounce: prevent duplicate message processing
 */
function debounceMessage(msgKey) {
  if (messageCache.has(msgKey)) return true;
  messageCache.set(msgKey, true);
  return false;
}

function getCachedUser(jid) {
  return userCache.get(jid) || null;
}

function setCachedUser(jid, data) {
  userCache.set(jid, data);
}

function getCachedGroup(jid) {
  return groupCache.get(jid) || null;
}

function setCachedGroup(jid, data) {
  groupCache.set(jid, data);
}

function getCachedSetting(key) {
  return settingCache.get(key);
}

function setCachedSetting(key, value) {
  settingCache.set(key, value);
}

module.exports = {
  debounceMessage,
  getCachedUser,
  setCachedUser,
  getCachedGroup,
  setCachedGroup,
  getCachedSetting,
  setCachedSetting,
};
