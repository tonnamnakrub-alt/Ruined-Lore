// ---------------------------------------------------------------
// Patch 0.5 — รอบบัฟ/เนิร์ฟตัวละคร · ตัวเลขทั้งหมดมาจากเอกสารที่ผู้ใช้ส่งมา
//
// บัฟ 11 ตัว (อันดับ 15-25 ของตารางที่วัดได้) · เนิร์ฟ 8 ตัว (อันดับ 1-8)
// กลุ่มกลาง ALUCARD PUSS KAMACHI ARIEL YODAKA ไม่ถูกแตะเลย
//
// รันด้วย node _patch05.mjs --write
// ทุกการแก้ต้องระบุข้อความเดิมให้ตรงเป๊ะ ไม่ตรงคือหยุดทั้งชุด ไม่เขียนไฟล์
//
// กฎการเลือก anchor: ต้องเป็นข้อความที่การแก้ในชุดเดียวกันไม่ไปแตะ
// ถ้าหลายค่าอยู่บรรทัดเดียวกัน ให้รวมเป็นการแก้ครั้งเดียว
// (กลุ่มที่ 1 PINO ALICE FAUSTUS ลงไปแล้วในคอมมิต 2a9cd26 จึงไม่อยู่ในไฟล์นี้)
// ---------------------------------------------------------------
export const PATCH = {

  // ======================= บัฟ =======================

  "STEIN passive": [
    { anchor: "sap: {", from: "cd: [12, 10, 8], tiers: [1, 7, 13], radius: 650, cutOnCast: 2.0,\n      base: 30, perLevel: (150 - 30) / 17, apRatio: 0.25, bonusHp: 0.05",
      to: "cd: [10, 8, 6], tiers: [1, 7, 13], radius: 650, cutOnCast: 2.0,\n      base: 100, perLevel: (270 - 100) / 17, missingHp: 0.10" },
  ],
  "STEIN Q": [
    { anchor: 'th: "Grasping Roots"', from: "range: 800, width: 125", to: "range: 900, width: 150" },
    { anchor: 'th: "Grasping Roots"', from: "dmg: [70, 105, 140, 175, 210], apRatio: 0.50, selfBonusHp: 0.06", to: "dmg: [100, 140, 180, 220, 260], apRatio: 0.50, selfMaxHp: 0.06, landStun: 0.5" },
  ],
  "STEIN W": [
    { anchor: 'th: "Bramble Overgrowth"', from: "range: 625, angle: 60, delay: 0.4", to: "range: 550, angle: 60, delay: 0.5" },
    { anchor: 'th: "Bramble Overgrowth"', from: "cd: 13, cdByRank: [13, 12, 11, 10, 9]", to: "cd: 11, cdByRank: [11, 10.5, 10, 9.5, 9]" },
    { anchor: 'th: "Bramble Overgrowth"', from: "dmg: [80, 120, 160, 200, 240], apRatio: 0.60", to: "dmg: [100, 145, 190, 235, 290], apRatio: 0.45, selfMaxHp: 0.06" },
    { anchor: 'th: "Bramble Overgrowth"', from: "root: [1.25, 1.4, 1.55, 1.7, 1.85]", to: "root: [1.0, 1.2, 1.4, 1.6, 1.8]" },
  ],
  "STEIN E": [
    { anchor: 'th: "Canopy of Shared Life"', from: "cd: 15, cdByRank: [15, 14, 13, 12, 11]", to: "cd: 10, cdByRank: [10, 10, 10, 10, 10]" },
    { anchor: 'th: "Canopy of Shared Life"', from: "shield: [60, 90, 120, 150, 180], apRatio: 0.30, shieldBonusHp: 0.10,\n        shieldBonusArmor: 0.40, shieldBonusMr: 0.40,",
      to: "shield: [120, 160, 200, 240, 280], shieldMaxHp: 0.10,\n        allyResPct: 0.10, allyResDur: 4," },
  ],
  "STEIN R": [
    { anchor: 'th: "Arbor\'s Sanctuary"', from: "cd: 90, cdByRank: [90, 80, 70], radius: 650, waves: 5, every: 0.8, selfRoot: true", to: "cd: 60, cdByRank: [60, 55, 50], radius: 600, waves: 5, every: 1.0, selfRoot: true, ccImmune: true" },
    { anchor: 'th: "Arbor\'s Sanctuary"', from: "heal: [40, 65, 90], apRatio: 0.15, healBonusHp: 0.03", to: "heal: [75, 125, 175], apRatio: 0.20, healMaxHp: 0.03" },
    { anchor: 'th: "Arbor\'s Sanctuary"', from: "dr: [0.20, 0.25, 0.30]", to: "dr: [0.15, 0.175, 0.20]" },
  ],

  "JACK Q": [
    { anchor: 'th: "Magic Bean Sling"', from: "range: 875", to: "range: 600" },
    { anchor: 'th: "Magic Bean Sling"', from: "cd: 8, cdByRank: [8, 7.5, 7, 6.5, 6]", to: "cd: 6, cdByRank: [6, 6, 6, 6, 6]" },
    { anchor: 'th: "Magic Bean Sling"', from: "dmg: [70, 110, 150, 190, 230], apRatio: 0.60", to: "dmg: [120, 160, 200, 240, 280], apRatio: 0.75" },
  ],
  "JACK W": [
    { anchor: 'th: "Golden Egg Trap"', from: "range: 800, radius: 275, delay: 2.5", to: "range: 750, radius: 325, delay: 3.5" },
    { anchor: 'th: "Golden Egg Trap"', from: "cd: 14, cdByRank: [14, 13.5, 13, 12.5, 12]", to: "cd: 10, cdByRank: [10, 9.5, 9, 8.5, 8]" },
    { anchor: 'th: "Golden Egg Trap"', from: "dmg: [125, 175, 225, 275, 325], apRatio: 0.75", to: "dmg: [150, 200, 250, 300, 350], apRatio: 0.80" },
  ],
  "JACK E": [
    { anchor: 'th: "Song of the Golden Harp"', from: "cd: 14, cdByRank: [14, 13.5, 13, 12.5, 12]", to: "cd: 8, cdByRank: [8, 7.5, 7, 6.5, 6]" },
    { anchor: 'th: "Song of the Golden Harp"', from: "shield: [75, 110, 145, 180, 215], apRatio: 0.40", to: "shield: [100, 140, 180, 220, 260], apRatio: 0.40" },
    // ตัดบัฟความเร็วตีที่ E เคยแจกให้ยักษ์ออก
    { anchor: 'th: "Song of the Golden Harp"', from: "ms: [0.35, 0.40, 0.45, 0.50, 0.55], as: [0.20, 0.25, 0.30, 0.35, 0.40], dur: 3.5", to: "ms: [0.35, 0.40, 0.45, 0.50, 0.55], dur: 3.5" },
  ],

  "H.S.B stat": [
    { anchor: 'id: "H.S.B"', span: "champ", from: "hp: 640, hpG: 102, hp5: 8.5", to: "hp: 650, hpG: 112, hp5: 8.5" },
  ],
  "H.S.B Q": [
    { anchor: 'th: "Sledge Toss"', from: "range: 800, width: 120, projSpeed: 1500", to: "range: 550, width: 120, projSpeed: 1200" },
    { anchor: 'th: "Sledge Toss"', from: "cd: 7, cdByRank: [7, 6.5, 6, 5.5, 5]", to: "cd: 5, cdByRank: [5, 5, 5, 5, 5]" },
    { anchor: 'th: "Sledge Toss"', from: "dmg: [50, 75, 100, 125, 150], selfBonusHp: 0.15, enemyMaxHp: 0.10", to: "dmg: [100, 130, 160, 190, 220], selfMaxHp: 0.15, enemyCurHp: 0.15" },
  ],

  "LAURA stat": [
    { anchor: 'id: "LAURA"', span: "champ", from: "as: 0.63, asG: 0.021, ms: 335, range: 500", to: "as: 0.63, asG: 0.021, ms: 335, range: 350" },
  ],
  "LAURA Q": [
    { anchor: 'th: "Sanguine Wave"', from: "dmg: [75, 110, 145, 180, 215], apRatio: 0.55, selfStacks: 0.35", to: "dmg: [100, 135, 170, 205, 240], apRatio: 0.60, selfStacks: 0.5" },
  ],
  "LAURA W": [
    { anchor: 'th: "Mistform Stride"', from: "cd: 14, cdByRank: [14, 13, 12, 11, 10]", to: "cd: 8, cdByRank: [8, 7.5, 7, 6.5, 6]" },
    { anchor: 'th: "Mistform Stride"', from: "msBuff: [0.45, 0.50, 0.55, 0.60, 0.65], dur: 2.5, ghost: true,\n        blinkRange: 450", to: "msBuff: [0.40, 0.40, 0.40, 0.40, 0.40], dur: 2.5, ghost: true,\n        blinkRange: 500" },
  ],
  "LAURA E": [
    { anchor: 'th: "Carmilla\'s Thrall"', from: "width: 90, projSpeed: 1250", to: "width: 100, projSpeed: 1000" },
    { anchor: 'th: "Carmilla\'s Thrall"', from: "cd: 13, cdByRank: [13, 12, 11, 10, 9]", to: "cd: 8, cdByRank: [8, 8, 8, 8, 8]" },
    { anchor: 'th: "Carmilla\'s Thrall"', from: "charm: [1.25, 1.5, 1.75, 2.0, 2.25]", to: "charm: [1.0, 1.25, 1.5, 1.75, 2.0]" },
  ],
  "LAURA R": [
    { anchor: 'th: "True Vampire Sovereign"', from: "cd: 55, cdByRank: [55, 48, 40]", to: "cd: 55, cdByRank: [55, 50, 45]" },
    { anchor: 'th: "True Vampire Sovereign"', from: "every: 0.5, regen: 0.5", to: "every: 0.25, regen: 0.5" },
    { anchor: 'th: "True Vampire Sovereign"', from: "dmg: [12, 20, 28], apRatio: 0.10, selfStacks: 0.10", to: "dmg: [15, 25, 35], apRatio: 0.15, selfStacks: 0.25, healPctDealt: [0.30, 0.35, 0.40]" },
  ],

  "ELLA Q": [
    { anchor: 'th: "Midnight Waltz"', from: "cd: 10, cdByRank: [10, 9.5, 9, 8.5, 8]", to: "cd: 8, cdByRank: [8, 7.5, 7, 6.5, 6]" },
  ],
  "ELLA W": [
    { anchor: 'th: "Chimes of Fate"', from: "cd: 14, cdByRank: [14, 13, 12, 11, 10]", to: "cd: 10, cdByRank: [10, 10, 10, 10, 10]" },
  ],
  "ELLA E": [
    { anchor: 'th: "Royal Ascent"', from: "cd: 18, cdByRank: [18, 16.5, 15, 13.5, 12]", to: "cd: 10, cdByRank: [10, 9.5, 9, 8.5, 8]" },
  ],
  "ELLA R": [
    { anchor: 'th: "Midnight Carriage"', from: "cd: 55, cdByRank: [55, 50, 45]", to: "cd: 50, cdByRank: [50, 47.5, 45]" },
    { anchor: 'th: "Midnight Carriage"', from: "dmg: [200, 325, 450], apRatio: 0.75", to: "dmg: [250, 400, 550], apRatio: 0.75" },
  ],

  "NIAN Q": [
    { anchor: 'th: "Thunder Horn Charge"', from: "cd: 14, cdByRank: [14, 13.5, 13, 12.5, 12]", to: "cd: 12, cdByRank: [12, 11.5, 11, 10.5, 10]" },
    { anchor: 'th: "Thunder Horn Charge"', from: "dmg: [70, 110, 150, 190, 230], apRatio: 0.55, selfBonusHp: 0.05", to: "dmg: [100, 140, 180, 220, 260], apRatio: 0.40, selfMaxHp: 0.05" },
  ],
  "NIAN W": [
    { anchor: 'th: "Overcharged Fur"', from: "cd: 14, cdByRank: [14, 13, 12, 11, 10]", to: "cd: 10, cdByRank: [10, 9.5, 9, 8.5, 8]" },
    { anchor: 'th: "Overcharged Fur"', from: "shield: [60, 100, 140, 180, 220], apRatio: 0.40, bonusHpRatio: 0.08", to: "shield: [100, 150, 200, 250, 300], apRatio: 0.40, maxHpRatio: 0.10" },
    { anchor: 'th: "Overcharged Fur"', from: "msBuff: [0.20, 0.25, 0.30, 0.35, 0.40]", to: "msBuff: [0.15, 0.175, 0.20, 0.225, 0.25]" },
  ],
  "NIAN E": [
    { anchor: 'th: "Crackling Roar"', from: "cd: 10, cdByRank: [10, 9.5, 9, 8.5, 8]", to: "cd: 7, cdByRank: [7, 6.5, 6, 5.5, 5]" },
  ],
  "NIAN R": [
    { anchor: 'th: "Calamitous Tempest"', from: "dmg: [50, 85, 120], apRatio: 0.25", to: "dmg: [75, 150, 225], apRatio: 0.25" },
    { anchor: 'th: "Calamitous Tempest"', from: "stun: [0.25, 0.30, 0.35]", to: "stun: [0.25, 0.35, 0.45]" },
  ],

  "KLAEDER R": [
    { anchor: 'th: "Sovereign Dismissal"', from: "cd: 60, cdByRank: [60, 50, 40]", to: "cd: 50, cdByRank: [50, 47.5, 45]" },
    { anchor: 'th: "Sovereign Dismissal"', from: "dmg: [200, 325, 450], badRatio: 0.85, selfBonusHp: 0.12", to: "dmg: [200, 325, 450], badRatio: 0.80, selfMaxHp: 0.15" },
  ],

  "PIROSKA W": [
    { anchor: 'th: "Grandmother\'s Care"', from: "targets: [1, 1, 2, 2, 3]", to: "targets: [3, 3, 3, 3, 3]" },
  ],

  // ======================= เนิร์ฟ =======================

  "HOOD passive": [
    { anchor: "critBleed: {", from: "nonCritPct: 1.5", to: "nonCritPct: 1.2" },
  ],
  "HOOD W": [
    // เอกสารเขียน "W: AS -> 25/27.5/30/32.5/35%" มาบรรทัดเดียว แต่ W มีสองก้อน
    // ใส่ที่ holdAs ซึ่งเป็นความเร็วตีที่ค้างอยู่ยาว ส่วน burstAs ที่เป็นสไปก์สั้นไม่แตะ
    { anchor: 'th: "Rapid Fletching"', from: "cd: 20, cdByRank: [20, 18.5, 16, 14.5, 13]", to: "cd: 20, cdByRank: [20, 19, 18, 17, 16]" },
    { anchor: 'th: "Rapid Fletching"', from: "holdAs: [0.35, 0.425, 0.50, 0.575, 0.65]", to: "holdAs: [0.25, 0.275, 0.30, 0.325, 0.35]" },
  ],
  "HOOD R": [
    { anchor: 'th: "Rain of Ruin"', from: "slowByRank: [0.35, 0.45, 0.55]", to: "slowByRank: [0.25, 0.25, 0.25]" },
  ],

  "PETER Q": [
    { anchor: 'th: "Fairy Bolt"', from: "dmg: [25, 50, 75, 100, 125], adRatio: 1.0, apRatio: 0.3", to: "dmg: [15, 30, 45, 60, 75], adRatio: 1.0, apRatio: 0.45" },
  ],
  "PETER W": [
    { anchor: 'th: "Lost Boys\' Blade"', from: "cd: 12, cdByRank: [12, 11, 10, 9, 8]", to: "cd: 12, cdByRank: [12, 11.5, 11, 10.5, 10]" },
    { anchor: 'th: "Lost Boys\' Blade"', from: "dmg: [55, 85, 115, 145, 175], badRatio: 0.5, apRatio: 0.25", to: "dmg: [40, 65, 80, 105, 130], badRatio: 0.35, apRatio: 0.75" },
  ],
  "PETER E": [
    { anchor: 'th: "Second Star"', from: "msBuff: [0.25, 0.30, 0.35, 0.40, 0.45]", to: "msBuff: [0.25, 0.275, 0.30, 0.325, 0.35]" },
  ],

  "PHANTOM stat": [
    { anchor: 'id: "PHANTOM"', span: "champ", from: "as: 0.658, asG: 0.02, ms: 335, range: 550", to: "as: 0.658, asG: 0.02, ms: 335, range: 500" },
  ],
  "PHANTOM Q": [
    { anchor: 'th: "Tri-Blade Fan"', from: "count: 3, angle: 35", to: "count: 3, angle: 90" },
    { anchor: 'th: "Tri-Blade Fan"', from: "cd: 8, cdByRank: [8, 7.25, 6.5, 5.75, 5]", to: "cd: 8, cdByRank: [8, 7.5, 7, 6.5, 6]" },
  ],
  "PHANTOM W": [
    { anchor: 'th: "The Phantom\'s Persona"', from: "adFlat: [12, 18, 24, 30, 36]", to: "adFlat: [10, 15, 20, 25, 30]" },
    { anchor: 'th: "The Phantom\'s Persona"', from: "asPct: [0.15, 0.20, 0.25, 0.30, 0.35]", to: "asPct: [0.10, 0.125, 0.15, 0.175, 0.20]" },
    { anchor: 'th: "The Phantom\'s Persona"', from: "arPen: [10, 15, 20, 25, 30]", to: "arPen: [8, 11, 14, 17, 20]" },
  ],
  "PHANTOM E": [
    { anchor: 'th: "Maestro\'s Rebound"', from: "cd: 13, cdByRank: [13, 12, 11, 10, 9]", to: "cd: 12, cdByRank: [12, 11.5, 11, 10.5, 10]" },
  ],
  "PHANTOM R": [
    { anchor: 'th: "The Grand Masquerade"', from: "cd: 75, cdByRank: [75, 65, 55]", to: "cd: 45, cdByRank: [45, 45, 45]" },
    { anchor: 'th: "The Grand Masquerade"', from: "dmg: [180, 280, 380], badRatio: 0.85", to: "dmg: [120, 240, 360], badRatio: 0.60" },
  ],

  "TOTSAKAN Q": [
    { anchor: 'th: "Asura Cleave"', from: "cd: 7, cdByRank: [7, 6.5, 6, 5.5, 5]", to: "cd: 7, cdByRank: [7, 7, 7, 7, 7]" },
    { anchor: 'th: "Asura Cleave"', from: "dmg: [75, 110, 145, 180, 215], adRatio: 0.75", to: "dmg: [50, 80, 110, 140, 170], badRatio: 0.75" },
  ],
  "TOTSAKAN W": [
    { anchor: 'th: "Wrath of the Asura"', from: "cd: 14, cdByRank: [14, 13, 12, 11, 10]", to: "cd: 12, cdByRank: [12, 12, 12, 12, 12]" },
    { anchor: 'th: "Wrath of the Asura"', from: "atkCut: [0.10, 0.125, 0.15, 0.175, 0.20]", to: "atkCut: [0.05, 0.075, 0.10, 0.125, 0.15]" },
    { anchor: 'th: "Wrath of the Asura"', from: "vamp: [0.10, 0.125, 0.15, 0.175, 0.20]", to: "vamp: [0.025, 0.04, 0.055, 0.07, 0.085]" },
    { anchor: 'th: "Wrath of the Asura"', from: "msBuff: [0.15, 0.20, 0.25, 0.30, 0.35], asBuff: [0.20, 0.25, 0.30, 0.35, 0.40]", to: "msBuff: [0.075, 0.10, 0.125, 0.15, 0.175], asBuff: [0.20, 0.225, 0.25, 0.275, 0.30]" },
  ],
  "TOTSAKAN R": [
    { anchor: 'th: "Cataclysmic Wrath"', from: "cd: 100, cdByRank: [100, 85, 70]", to: "cd: 60, cdByRank: [60, 55, 50]" },
  ],

  "TRISTAN passive": [
    // "Remove Crit +10" — ออโต้ที่คริเคยได้พลัง Isolde เพิ่ม 10 ตัดทิ้ง
    { anchor: "isolde: { need: 100", from: "onAuto: 5, onCrit: 10, onSkill: 10", to: "onAuto: 5, onSkill: 10" },
  ],
  "TRISTAN Q": [
    { anchor: 'th: "Knight of Cornwall"', from: 'type: "onHit", charges: 3, window: 5', to: 'type: "onHit", charges: 1, window: 5' },
    { anchor: 'th: "Knight of Cornwall"', from: "cd: 12, cdByRank: [12, 11, 10, 9, 8]", to: "cd: 12, cdByRank: [12, 11.5, 11, 10.5, 10]" },
    { anchor: 'th: "Knight of Cornwall"', from: "dmg: [35, 55, 75, 95, 115], badRatio: 0.55", to: "dmg: [20, 35, 50, 65, 80], badRatio: 0.35, autoCdCut: 1" },
  ],
  "TRISTAN W": [
    { anchor: 'th: "Iron Vow"', from: "cd: 14, cdByRank: [14, 13, 12, 11, 10]", to: "cd: 14, cdByRank: [14, 13.5, 13, 12.5, 12]" },
    { anchor: 'th: "Iron Vow"', from: "shredByRank: [0.15, 0.18, 0.21, 0.24, 0.27]", to: "shredByRank: [0.10, 0.125, 0.15, 0.175, 0.20]" },
  ],
  "TRISTAN E": [
    { anchor: 'th: "Vow of Lyonesse"', from: "shield: [75, 125, 175, 225, 275], badRatio: 1.2, bonusHpRatio: 0.025", to: "shield: [100, 135, 170, 205, 240], adRatio: 1.0, maxHpRatio: 0.05" },
    { anchor: 'th: "Vow of Lyonesse"', from: "msBuff: [0.2, 0.23, 0.26, 0.29, 0.32]", to: "msBuff: [0.15, 0.175, 0.20, 0.225, 0.25]" },
  ],
  "TRISTAN R": [
    { anchor: 'th: "I WILL NOT YIELD"', from: "asBuff: [0.4, 0.6, 0.8], adBuff: [0.2, 0.3, 0.4]", to: "asBuff: [0.4, 0.5, 0.6], adBuff: [0.2, 0.25, 0.3]" },
  ],

  "ARTHUR passive": [
    // เอกสารบอก Shield 15% -> 10% แต่ในข้อมูลเป็น 10% อยู่แล้ว จึงแตะเฉพาะสามค่าที่เหลือ
    { anchor: "aegis: { pct: 0.10", from: "lowPct: 0.25, hpBelow: 0.50, dur: 3.5", to: "lowPct: 0.15, hpBelow: 0.30, dur: 2.5" },
  ],
  "ARTHUR Q": [
    { anchor: 'th: "Sovereign\'s Edge"', from: "cd: 7, cdByRank: [7, 6.5, 6, 5.5, 5]", to: "cd: 6, cdByRank: [6, 6, 6, 6, 6]" },
    { anchor: 'th: "Sovereign\'s Edge"', from: "dmg: [30, 55, 80, 105, 130], badRatio: 0.45", to: "dmg: [20, 40, 60, 80, 100], badRatio: 0.50" },
  ],
  "ARTHUR W": [
    { anchor: 'th: "Pommel Strike & Retribution"', from: "stunByRank: [1.0, 1.1, 1.2, 1.3, 1.4],\n        ", to: "" },
  ],
  "ARTHUR E": [
    { anchor: 'th: "Knight\'s Lunge"', from: "cd: 12, cdByRank: [12, 11, 10, 9, 8]", to: "cd: 12, cdByRank: [12, 11.5, 11, 10.5, 10]" },
  ],
  "ARTHUR R": [
    { anchor: 'th: "Judgment of the Round Table"', from: "dmg: [175, 300, 425], badRatio: 0.80", to: "dmg: [175, 300, 450], badRatio: 0, enemyMissingHp: 0.30" },
  ],

  "C.HOOK Q": [
    { anchor: 'th: "Flintlock Shot"', from: "dmg: [70, 110, 150, 190, 230], badRatio: 1.0", to: "dmg: [15, 30, 45, 60, 75], adRatio: 1.0" },
  ],

  "KAZEM stat": [
    { anchor: 'id: "KAZEM"', span: "champ", from: "hp: 645, hpG: 112", to: "hp: 600, hpG: 100" },
    { anchor: 'id: "KAZEM"', span: "champ", from: "ms: 350, range: 175, omnivamp: 0.08", to: "ms: 350, range: 150, omnivamp: 0.08" },
  ],
  "KAZEM W": [
    { anchor: 'th: "Pactolus Sands"', from: "cd: 12, cdByRank: [12, 11.5, 11, 10.5, 10]", to: "cd: 10, cdByRank: [10, 10, 10, 10, 10]" },
    { anchor: 'th: "Pactolus Sands"', from: "dmg: [26, 40, 54, 68, 82], badRatio: 0.18", to: "dmg: [50, 75, 100, 125, 150], badRatio: 0.35" },
  ],
  "KAZEM R": [
    { anchor: 'th: "The Curse of Gold"', from: "shred: [0.2, 0.25, 0.3]", to: "shred: [0.15, 0.175, 0.20]" },
  ],
};
