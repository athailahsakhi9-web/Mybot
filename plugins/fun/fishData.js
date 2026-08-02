// ╔══════════════════════════════════════╗
// ║     FISHING - DATA (fishData.js)     ║
// ╚══════════════════════════════════════╝

const FISH_LIST = [
  { id: 'ikan_mas',       name: '🐟 Ikan Mas',              rarity: 'common',    price: 500,    exp: 5,    weight: 40  },
  { id: 'ikan_lele',      name: '🐡 Ikan Lele',              rarity: 'common',    price: 400,    exp: 4,    weight: 38  },
  { id: 'ikan_mujair',    name: '🐠 Ikan Mujair',            rarity: 'common',    price: 450,    exp: 5,    weight: 35  },
  { id: 'ikan_nila',      name: '🐟 Ikan Nila',              rarity: 'common',    price: 480,    exp: 5,    weight: 30  },
  { id: 'sepatu_tua',     name: '👟 Sepatu Tua',              rarity: 'common',    price: 50,     exp: 1,    weight: 20  },
  { id: 'kaleng_bekas',   name: '🥫 Kaleng Bekas',            rarity: 'common',    price: 25,     exp: 1,    weight: 18  },
  { id: 'ikan_bawal',     name: '🐟 Ikan Bawal',              rarity: 'uncommon',  price: 1500,   exp: 12,   weight: 18  },
  { id: 'ikan_patin',     name: '🐡 Ikan Patin',              rarity: 'uncommon',  price: 1800,   exp: 14,   weight: 15  },
  { id: 'ikan_gabus',     name: '🐠 Ikan Gabus',              rarity: 'uncommon',  price: 2000,   exp: 15,   weight: 14  },
  { id: 'udang_sungai',   name: '🦐 Udang Sungai',            rarity: 'uncommon',  price: 2500,   exp: 16,   weight: 12  },
  { id: 'ikan_kakap',     name: '🐟 Ikan Kakap',              rarity: 'rare',      price: 5000,   exp: 30,   weight: 8   },
  { id: 'ikan_tenggiri',  name: '🐡 Ikan Tenggiri',           rarity: 'rare',      price: 6000,   exp: 35,   weight: 7   },
  { id: 'gurita_kecil',   name: '🐙 Gurita Kecil',            rarity: 'rare',      price: 7000,   exp: 40,   weight: 6   },
  { id: 'lobster',        name: '🦞 Lobster',                  rarity: 'rare',      price: 8000,   exp: 45,   weight: 5   },
  { id: 'koin_kuno',      name: '🪙 Koin Kuno',               rarity: 'rare',      price: 10000,  exp: 50,   weight: 4   },
  { id: 'ikan_tuna',      name: '🐟 Ikan Tuna Raksasa',       rarity: 'epic',      price: 20000,  exp: 80,   weight: 3   },
  { id: 'hiu_kecil',      name: '🦈 Hiu Kecil',               rarity: 'epic',      price: 25000,  exp: 100,  weight: 2   },
  { id: 'peti_harta',     name: '📦 Peti Harta Kecil',        rarity: 'epic',      price: 30000,  exp: 100,  weight: 2   },
  { id: 'ubur_biru',      name: '🪼 Ubur-ubur Biru',          rarity: 'epic',      price: 22000,  exp: 90,   weight: 2   },
  { id: 'naga_laut',      name: '🐉 Naga Laut',               rarity: 'legendary', price: 100000, exp: 500,  weight: 1   },
  { id: 'putri_duyung',   name: '🧜 Putri Duyung',            rarity: 'legendary', price: 150000, exp: 700,  weight: 1   },
  { id: 'ikan_emas_dewa', name: '✨ Ikan Emas Dewa',          rarity: 'secret',    price: 500000, exp: 2000, weight: 0.3 },
  { id: 'harta_karun',    name: '💎 Harta Karun Dasar Laut',  rarity: 'secret',    price: 999999, exp: 5000, weight: 0.2 },
]

const RARITY_COLOR = {
  common:    '⬜',
  uncommon:  '🟩',
  rare:      '🟦',
  epic:      '🟪',
  legendary: '🟨',
  secret:    '🟥',
}

const SHOP_ITEMS = [
  { id: 'pancing_dasar',   name: '🎣 Pancing Dasar',    price: 0,      desc: 'Pancing bawaan, biasa aja',     bonus: 0              },
  { id: 'pancing_besi',    name: '🎣 Pancing Besi',     price: 5000,   desc: '+5% chance rare',               bonus: 5              },
  { id: 'pancing_emas',    name: '🎣 Pancing Emas',     price: 25000,  desc: '+15% chance rare',              bonus: 15             },
  { id: 'pancing_kristal', name: '🎣 Pancing Kristal',  price: 100000, desc: '+30% chance rare+',             bonus: 30             },
  { id: 'umpan_cacing',    name: '🪱 Umpan Cacing',     price: 500,    desc: '+3% chance (5x)',               bonus: 3,  uses: 5,  type: 'umpan' },
  { id: 'umpan_udang',     name: '🦐 Umpan Udang',      price: 2000,   desc: '+10% chance rare (5x)',         bonus: 10, uses: 5,  type: 'umpan' },
  { id: 'umpan_dewa',      name: '✨ Umpan Dewa',       price: 50000,  desc: '+50% chance epic+ (3x)',        bonus: 50, uses: 3,  type: 'umpan' },
]

function getRandomFish(pancingBonus = 0, umpanBonus = 0) {
  const totalBonus = pancingBonus + umpanBonus
  const adjusted = FISH_LIST.map(f => {
    let w = f.weight
    if (['rare','epic','legendary','secret'].includes(f.rarity)) w = w * (1 + totalBonus / 100)
    return { ...f, w }
  })
  const total = adjusted.reduce((s, f) => s + f.w, 0)
  let rand = Math.random() * total
  for (const fish of adjusted) {
    rand -= fish.w
    if (rand <= 0) return fish
  }
  return adjusted[0]
}

function getLevelFromExp(exp) {
  let level = 1, needed = 100, total = 0
  while (exp >= total + needed) {
    total += needed
    level++
    needed = Math.floor(needed * 1.3)
  }
  return { level, current: exp - total, needed }
}

module.exports = { FISH_LIST, RARITY_COLOR, SHOP_ITEMS, getRandomFish, getLevelFromExp }
