// ╔══════════════════════════════════════╗
// ║      NEXA BOT - DATABASE MODULE       ║
// ╚══════════════════════════════════════╝
//
//  JSON-file based database.
//  Data disimpan di base/database.json
//  Singleton: semua require() dapat instance yang sama.

const fs   = require('fs')
const path = require('path')

const DB_PATH = path.join(process.cwd(), 'base', 'database.json')

// ── Template default ──────────────────────────────────────────────
const DEFAULT_DB = {
  users:     {},
  groups:    {},
  settings:  {},
  stats:     {},
  cooldowns: {},
  sewa:      { enabled: false, groups: {} },
}

// ── Load / create ─────────────────────────────────────────────────
function loadDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
      fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2))
      return JSON.parse(JSON.stringify(DEFAULT_DB))
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8')
    const data = JSON.parse(raw)
    // Pastikan semua top-level key ada
    for (const key of Object.keys(DEFAULT_DB)) {
      if (!data[key]) data[key] = JSON.parse(JSON.stringify(DEFAULT_DB[key]))
    }
    return data
  } catch (err) {
    console.error('[DB] Gagal load database, gunakan default:', err.message)
    return JSON.parse(JSON.stringify(DEFAULT_DB))
  }
}

// ── Save dengan debounce ringan ────────────────────────────────────
let _saveTimer = null
function saveDB(data) {
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
    } catch (err) {
      console.error('[DB] Gagal simpan database:', err.message)
    }
  }, 300)
}

// ── Singleton state ───────────────────────────────────────────────
let _db = loadDB()

// ── Sanitize JID key (ganti karakter yang tidak valid di JSON key) ─
function sanitizeKey(jid) {
  return (jid || '').replace(/@/g, '_').replace(/\./g, '_').replace(/[^a-zA-Z0-9_-]/g, '_')
}

// ─────────────────────────────────────────────────────────────────
// DATABASE CLASS
// ─────────────────────────────────────────────────────────────────
class Database {

  // ── USER ────────────────────────────────────────────────────────

  getUser(jid) {
    const key = sanitizeKey(jid)
    return _db.users[key] || null
  }

  setUser(jid, data) {
    const key = sanitizeKey(jid)
    _db.users[key] = Object.assign(_db.users[key] || {}, data)
    saveDB(_db)
    return _db.users[key]
  }

  getAllUsers() {
    return _db.users
  }

  deleteUser(jid) {
    const key = sanitizeKey(jid)
    delete _db.users[key]
    saveDB(_db)
  }

  // ── GROUP ────────────────────────────────────────────────────────

  getGroup(jid) {
    const key = sanitizeKey(jid)
    return _db.groups[key] || null
  }

  setGroup(jid, data) {
    const key = sanitizeKey(jid)
    _db.groups[key] = Object.assign(_db.groups[key] || {}, data)
    saveDB(_db)
    return _db.groups[key]
  }

  getAllGroups() {
    return _db.groups
  }

  // ── SETTINGS ────────────────────────────────────────────────────

  /**
   * Get or set a global setting.
   * setting('key')         → get value
   * setting('key', value)  → set value, return value
   */
  setting(key, value) {
    if (value === undefined) {
      return _db.settings[key] ?? null
    }
    _db.settings[key] = value
    saveDB(_db)
    return value
  }

  // ── STATS ────────────────────────────────────────────────────────

  getStat(key) {
    return _db.stats[key] || 0
  }

  getAllStats() {
    return _db.stats
  }

  incrementStat(key, amount = 1) {
    _db.stats[key] = (_db.stats[key] || 0) + amount
    saveDB(_db)
    return _db.stats[key]
  }

  setStat(key, value) {
    _db.stats[key] = value
    saveDB(_db)
  }

  // ── COOLDOWN ─────────────────────────────────────────────────────

  /**
   * Check apakah user masih cooldown.
   * @returns {number} sisa detik, atau 0 jika boleh jalan
   */
  checkCooldown(jid, command, seconds) {
    if (!seconds || seconds <= 0) return 0
    const key   = `${sanitizeKey(jid)}_${command}`
    const until = _db.cooldowns[key] || 0
    const now   = Date.now()
    if (now < until) {
      return Math.ceil((until - now) / 1000)
    }
    return 0
  }

  /**
   * Set cooldown untuk user + command
   */
  setCooldown(jid, command, seconds) {
    if (!seconds || seconds <= 0) return
    const key = `${sanitizeKey(jid)}_${command}`
    _db.cooldowns[key] = Date.now() + seconds * 1000
    saveDB(_db)
  }

  clearExpiredCooldowns() {
    const now = Date.now()
    for (const key of Object.keys(_db.cooldowns)) {
      if (_db.cooldowns[key] < now) delete _db.cooldowns[key]
    }
    saveDB(_db)
  }

  // ── SEWA ─────────────────────────────────────────────────────────

  getSewa() {
    return _db.sewa || { enabled: false, groups: {} }
  }

  setSewa(data) {
    _db.sewa = Object.assign(_db.sewa || {}, data)
    saveDB(_db)
  }

  // ── UTILITY ──────────────────────────────────────────────────────

  /** Force save segera (tidak debounce) */
  save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(_db, null, 2))
    } catch (err) {
      console.error('[DB] Gagal force-save:', err.message)
    }
  }

  /** Reload dari disk (misalnya setelah edit manual) */
  reload() {
    _db = loadDB()
    return _db
  }

  /** Akses raw data (hindari pemakaian langsung) */
  raw() {
    return _db
  }
}

// ── Singleton instance ────────────────────────────────────────────
const _instance = new Database()

// Handler mengecek db.ready sebelum proses command
_instance.ready = true

// Bersihkan cooldown kadaluarsa setiap 10 menit
setInterval(() => {
  try { _instance.clearExpiredCooldowns() } catch (_) {}
}, 10 * 60 * 1000)

function getDatabase() {
  return _instance
}

module.exports = { getDatabase, Database }
