// ╔══════════════════════════════════════╗
// ║   FISHING - INVENTORY (fishInv.js)   ║
// ╚══════════════════════════════════════╝

const fs   = require('fs')
const path = require('path')

// Path ke base/ dari plugins/fun/ → naik 2 level
const INV_PATH = path.join(__dirname, '..', '..', 'base', 'inventoryFish.json')

function loadInv() {
  if (!fs.existsSync(INV_PATH)) {
    fs.mkdirSync(path.dirname(INV_PATH), { recursive: true })
    fs.writeFileSync(INV_PATH, JSON.stringify({}, null, 2))
  }
  try { return JSON.parse(fs.readFileSync(INV_PATH, 'utf-8')) }
  catch { return {} }
}

function saveInv(data) {
  fs.writeFileSync(INV_PATH, JSON.stringify(data, null, 2))
}

function getInv(sender) {
  const data = loadInv()
  if (!data[sender]) {
    data[sender] = { items: {}, pancing: 'pancing_dasar', umpan: null, umpanUses: 0 }
    saveInv(data)
  }
  return data[sender]
}

function setInv(sender, inv) {
  const data = loadInv()
  data[sender] = inv
  saveInv(data)
}

function addItem(sender, fishId, fishName) {
  const inv = getInv(sender)
  if (!inv.items[fishId]) inv.items[fishId] = { name: fishName, count: 0 }
  inv.items[fishId].count++
  setInv(sender, inv)
}

function removeItem(sender, fishId, count = 1) {
  const inv = getInv(sender)
  if (!inv.items[fishId] || inv.items[fishId].count < count) return false
  inv.items[fishId].count -= count
  if (inv.items[fishId].count <= 0) delete inv.items[fishId]
  setInv(sender, inv)
  return true
}

module.exports = { getInv, setInv, addItem, removeItem, INV_PATH }
