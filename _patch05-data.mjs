// ---------------------------------------------------------------
// Patch 0.5 — รอบบัฟ/เนิร์ฟตัวละคร · ตัวเลขทั้งหมดมาจากเอกสารที่ผู้ใช้ส่งมา
//
// บัฟ 11 ตัว (อันดับ 15-25 ของตารางที่วัดได้) · เนิร์ฟ 8 ตัว (อันดับ 1-8)
// กลุ่มกลาง ALUCARD PUSS KAMACHI ARIEL YODAKA ไม่ถูกแตะเลย
//
// ที่นี่เก็บเฉพาะการแก้ "ตัวเลข" ส่วนที่ต้องเขียนกลไกใหม่อยู่ใน _patch05-mech.md
// ---------------------------------------------------------------
export const PATCH = {

  // ================= บัฟ =================

  "PINO passive": [
    { anchor: 'kindness: { radius: 1200', from: "flat: 8, perLevel: 1.2, perAp: 0.06,\n      every: 1,", to: "flat: 15, perLevel: 5, perAp: 0.1,\n      every: 0.5," },
  ],
  "PINO Q": [
    { anchor: 'th: "Liar\'s Reach"', from: "cd: 10, cdByRank: [10, 9.5, 9, 8.5, 8]", to: "cd: 5, cdByRank: [5, 5, 5, 5, 5]" },
    { anchor: 'th: "Liar\'s Reach"', from: "dmg: [40, 70, 100, 130, 160]", to: "dmg: [50, 90, 130, 170, 210]" },
    { anchor: 'th: "Liar\'s Reach"', from: "slow: 0.3, slowByRank: [0.3, 0.35, 0.4, 0.45, 0.5]", to: "slow: 0.75, slowByRank: [0.75, 0.75, 0.75, 0.75, 0.75]" },
  ],
  "PINO W": [
    { anchor: 'th: "Wish Upon a Star"', from: "cd: 8, cdByRank: [8, 7.5, 7, 6.5, 6]", to: "cd: 5, cdByRank: [5, 4.75, 4.5, 4.25, 4]" },
    { anchor: 'th: "Wish Upon a Star"', from: "heal: [100, 150, 200, 250, 300], apRatio: 0.5", to: "heal: [150, 225, 300, 375, 450], apRatio: 0.4" },
  ],
  "PINO E": [
    { anchor: 'th: "Land of Toys"', from: "cd: 10, cdByRank: [10, 10, 9, 8, 8]", to: "cd: 8, cdByRank: [8, 7.5, 7, 6.5, 6]" },
  ],
  "PINO R": [
    { anchor: 'th: "A Real Boy"', from: "cd: 60, cdByRank: [60, 55, 50]", to: "cd: 50, cdByRank: [50, 45, 40]" },
    { anchor: 'th: "A Real Boy"', from: "heal: [150, 225, 300]", to: "heal: [250, 450, 650]" },
  ],

  "ALICE passive": [
    // 2.5% -> 1.25% + 0.25% ต่อเลเวล · perLevel เป็นฟิลด์ใหม่ ต้องมีโค้ดอ่านด้วย
    { anchor: "curious: {", from: "dur: 3, base: 0.025, perAp: 0.02 / 100", to: "dur: 2.5, base: 0.0125, perLevel: 0.25 / 100, perAp: 0.02 / 100" },
  ],
  "ALICE Q": [
    { anchor: 'th: "Mad Tea Garden"', from: "radius: 285", to: "radius: 350" },
    { anchor: 'th: "Mad Tea Garden"', from: "cd: 10, cdByRank: [10, 9.5, 9, 8.5, 8]", to: "cd: 8, cdByRank: [8, 8, 8, 8, 8]" },
    { anchor: 'th: "Mad Tea Garden"', from: "dur: 3.5", to: "dur: 5" },
    { anchor: 'th: "Mad Tea Garden"', from: "heal: [15, 22, 29, 36, 43]", to: "heal: [25, 40, 65, 80, 105]" },
    { anchor: 'th: "Mad Tea Garden"', from: "dmg: [10, 15, 20, 25, 30], apRatio: 0.05", to: "dmg: [5, 8, 11, 14, 17], apRatio: 0.1" },
    { anchor: 'th: "Mad Tea Garden"', from: "slowByRank: [0.20, 0.23, 0.26, 0.29, 0.32]", to: "slowByRank: [0.25, 0.25, 0.25, 0.25, 0.25]" },
  ],
  "ALICE W": [
    { anchor: 'th: "Down the Rabbit Hole"', from: "range: 700", to: "range: 750" },
    { anchor: 'th: "Down the Rabbit Hole"', from: "cd: 15, cdByRank: [15, 14, 13, 12, 11]", to: "cd: 11, cdByRank: [11, 10.5, 10, 9.5, 9]" },
    { anchor: 'th: "Down the Rabbit Hole"', from: "shield: [50, 80, 110, 140, 170], shieldAp: 0.5", to: "shield: [120, 180, 240, 300, 360], shieldAp: 0.25" },
  ],
  "ALICE E": [
    { anchor: 'th: "March Hare\'s Hex"', from: "cd: 15, cdByRank: [15, 14.5, 14, 13.5, 13]", to: "cd: 10, cdByRank: [10, 10, 10, 10, 10]" },
    { anchor: 'th: "March Hare\'s Hex"', from: "polymorph: [1.2, 1.4, 1.6, 1.8, 2.0]", to: "polymorph: [1.0, 1.15, 1.3, 1.45, 1.6]" },
  ],
  "ALICE R": [
    { anchor: 'th: "Realm of Wonderland"', from: "cd: 60, cdByRank: [60, 55, 45]", to: "cd: 40, cdByRank: [40, 35, 30], cdAfterDur: true" },
    { anchor: 'th: "Realm of Wonderland"', from: "range: 1200", to: "range: 750" },
    { anchor: 'th: "Realm of Wonderland"', from: "dur: 4", to: "durByRank: [4, 5, 6], dur: 4" },
    { anchor: 'th: "Realm of Wonderland"', from: "dmg: [100, 200, 300], apRatio: 0.6", to: "dmg: [100, 150, 200], apRatio: 0.4" },
    { anchor: 'th: "Realm of Wonderland"', from: "slowByRank: [0.65, 0.75, 0.85]", to: "slowByRank: [0.8, 0.8, 0.8]" },
  ],

  "FAUSTUS passive": [
    // 10% คงที่ -> ไล่ตามเลเวล 1/7/13 · tiers เป็นฟิลด์ใหม่ ต้องมีโค้ดอ่าน
    { anchor: "faustian: {", from: "base: 0.10, perAp: 0.01 / 100", to: "base: 0.10, byTier: [0.1, 0.125, 0.15], tiers: [1, 7, 13], perAp: 0.01 / 100" },
  ],
  "FAUSTUS Q": [
    { anchor: 'th: "Abyssal Condensation"', from: "selfSlow: 0.2", to: "selfSlow: 0.3" },
    { anchor: 'th: "Abyssal Condensation"', from: "width: 140", to: "width: 150" },
    { anchor: 'th: "Abyssal Condensation"', from: "cd: 10, cdByRank: [10, 9.5, 9, 8.5, 8]", to: "cd: 8, cdByRank: [8, 7.5, 7, 6.5, 6]" },
    { anchor: 'th: "Abyssal Condensation"', from: "dmg: [100, 150, 200, 250, 300], apRatio: 0.75", to: "dmg: [120, 170, 220, 270, 320], apRatio: 1" },
  ],
  "FAUSTUS W": [
    { anchor: 'th: "Sigil of Ruination"', from: "radius: 200", to: "radius: 250" },
    { anchor: 'th: "Sigil of Ruination"', from: "cd: 12, cdByRank: [12, 11.5, 11, 10.5, 10]", to: "cd: 8, cdByRank: [8, 8, 8, 8, 8]" },
    { anchor: 'th: "Sigil of Ruination"', from: "slowByRank: [0.35, 0.40, 0.45, 0.50, 0.55]", to: "slowByRank: [0.5, 0.5, 0.5, 0.5, 0.5]" },
  ],
  "FAUSTUS E": [
    { anchor: 'th: "Repulsion Ward"', from: "stun: 0.35", to: "stun: 0.5" },
    { anchor: 'th: "Repulsion Ward"', from: "cd: 16, cdByRank: [16, 15, 14, 13, 12]", to: "cd: 12, cdByRank: [12, 11.5, 11, 10.5, 10]" },
  ],
  "FAUSTUS R": [
    { anchor: 'th: "Cataclysmic Reckoning"', from: "every: 1.0, telegraph: 1.2, radius: 180", to: "every: 0.75, telegraph: 1, radius: 220" },
  ],
};
