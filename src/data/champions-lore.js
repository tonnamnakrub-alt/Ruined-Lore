// ---------------------------------------------------------------
// Patch 0.3 — ตัวละครใหม่ 10 ตัว
//
// แยกไฟล์จาก champions.js เพราะไฟล์เดียวเริ่มยาวเกินกว่าจะอ่านรวดเดียวไหว
// โครงข้อมูลเหมือนกันทุกอย่าง แล้วไปรวมกันใน champions.js
//
// ตัวเลขทั้งหมดมาจากเอกสาร Patch 0.3 ที่ผู้ใช้ส่งมา
// ตรงไหนที่เอกสารไม่ได้ระบุ (เช่นค่าสถานะพื้นฐานของ Ella กับ Piroska)
// จะตั้งให้เข้ากับบทบาทและเทียบเคียงกับตัวละครเดิมที่มีอยู่แล้ว
// ---------------------------------------------------------------

export const LORE_CHAMPIONS = {
  // =============================================================
  // 1) ELLA (ซินเดอเรลล่า) — Assassin AP
  // =============================================================
  ELLA: {
    id: "ELLA", skillPriority: ["Q", "W", "E"], missile: 0, windup: 0.19, value: 1.2,
    th: "เอลล่า", role: "Assassin", lane: "JUNGLE", alsoLanes: ["SUPPORT"], melee: true,
    hp: 570, hpG: 92, hp5: 6.5, hp5G: 0.6, ad: 56, adG: 3.1, armor: 28, armorG: 3.6, mr: 30, mrG: 1.3,
    as: 0.66, asG: 0.026, ms: 340, range: 150,
    // เศษแก้วติดออโต้ — แรงขึ้นสองเท่าเมื่อเป้าเลือดต่ำกว่าครึ่ง
    glassShards: { base: 15, perLevel: (75 - 15) / 17, apRatio: 0.25, lowHpAt: 0.50, lowHpMul: 2 },
    passive: { th: "Glass Shards Execution",
      desc: "ออโต้ทุกครั้งพ่วงดาเมจเวท 15 ที่เลเวล 1 ไล่ถึง 75 ที่เลเวล 18 (+25% AP) · ถ้าเป้าหมายเลือดต่ำกว่า 50% ก้อนนี้แรงขึ้นสองเท่าทันที (30-150 +50% AP)" },
    skills: [
      // คอมโบ 3 จังหวะ — แต่ละจังหวะปลดล็อกด้วยการออโต้โดนหลังกด และมีหน้าต่าง 5 วิ
      { key: "Q", th: "Midnight Waltz", type: "combo", cast: 0.2, window: 5,
        cd: 10, cdByRank: [10, 9.5, 9, 8.5, 8], magic: true,
        steps: [
          { th: "Dash & Pierce", dashRange: 450, dmg: [40, 65, 90, 115, 140], apRatio: 0.35, needAuto: true },
          { th: "Crescent Sweep", radius: 325, halfCircle: true, dmg: [60, 95, 130, 165, 200], apRatio: 0.55, needAuto: true },
          { th: "Grand Finale & Rebound", range: 250, backstep: 375,
            dmg: [50, 80, 110, 140, 170], apRatio: 0.45, pctMissingHp: [0.08, 0.09, 0.10, 0.11, 0.12] },
        ] },
      // สะสมดาเมจที่ทำใส่เป้าไว้ 3 วิ แล้วสั่งระเบิดทีเดียว
      { key: "W", th: "Chimes of Fate", type: "damageStash", range: 750, stashDur: 3.0, cast: 0.25,
        cd: 14, cdByRank: [14, 13, 12, 11, 10], magic: true,
        stashPct: [0.20, 0.23, 0.26, 0.29, 0.32], stashPerAp: 0.02 / 100,
        dmg: [40, 60, 80, 100, 120], apRatio: 0.30 },
      { key: "E", th: "Royal Ascent", type: "skyward", cast: 0, airTime: 0.75,
        cd: 18, cdByRank: [18, 16.5, 15, 13.5, 12],
        msBuff: [0.35, 0.40, 0.45, 0.50, 0.55], dur: 2.0 },
      // ล่องหนแล้วเปิดตัวด้วยออโต้ระยะไกลที่ลากรถม้าตามมาทุบ
      { key: "R", th: "Midnight Carriage", type: "carriage", ult: true, cast: 0.25,
        cd: 55, cdByRank: [55, 50, 45], dur: 10, openRange: 550, radius: 325,
        msPct: [0.30, 0.40, 0.50], dmg: [200, 325, 450], apRatio: 0.75, magic: true,
        slowByRank: [0.60, 0.70, 0.80], slowDur: 2.0 },
    ],
  },

  // =============================================================
  // 2) PIROSKA (หนูน้อยหมวกแดง) — Enchanter AP
  // =============================================================
  PIROSKA: {
    id: "PIROSKA", skillPriority: ["W", "Q", "E"], missile: 1500, windup: 0.31, value: 1.05,
    th: "ปิโรสก้า", role: "Enchanter", lane: "SUPPORT", melee: false,
    hp: 590, hpG: 96, hp5: 6.5, hp5G: 0.5, ad: 50, adG: 2.8, armor: 28, armorG: 4.0, mr: 30, mrG: 1.3,
    as: 0.625, asG: 0.02, ms: 335, range: 550,
    // เลือดตกต่ำกว่าครึ่งครั้งแรก = วิ่งหนีสุดชีวิต
    fleeWolf: { hpBelow: 0.50, ms: [0.60, 0.70, 0.80], dur: 3.0, cd: [75, 60, 45] },
    passive: { th: "Flee the Wolf",
      desc: "เลือดตกต่ำกว่า 50% ครั้งแรก ได้ความเร็วเดิน +60/70/80% (ตามเลเวล 1/7/13) นาน 3 วิ ค่อยๆ จาง พร้อมเดินทะลุยูนิต · คูลดาวน์ 75/60/45 วิ และต้องฟื้นเลือดเกิน 50% ก่อนถึงจะพร้อมอีกครั้ง" },
    skills: [
      { key: "Q", th: "Wolfsbane Powder", type: "cone", range: 700, count: 7, angle: 50, falloff: 1,
        cast: 0.25, cd: 9, cdByRank: [9, 8.5, 8, 7.5, 7], magic: true,
        dmg: [70, 110, 150, 190, 230], apRatio: 0.55,
        slow: [0.25, 0.30, 0.35, 0.40, 0.45], dur: 2.5,
        atkCut: [0.10, 0.125, 0.15, 0.175, 0.20] },
      // ตะกร้าเสบียง — ฮีลและบัฟทุก 2 วิ รวม 5 ระลอก
      { key: "W", th: "Grandmother's Care", type: "basketZone", range: 750, radius: 300,
        life: 10, every: 2, cast: 0.3, cd: 18, cdByRank: [18, 17, 16, 15, 14],
        heal: [30, 45, 60, 75, 90], apRatio: 0.20,
        adBuff: [8, 12, 16, 20, 24], adPerAp: 0.03, apBuff: [12, 18, 24, 30, 36], apPerAp: 0.05,
        buffDur: 2.5 },
      { key: "E", th: "Woodland Sprint", type: "allyRush", range: 700, cast: 0.2,
        cd: 13, cdByRank: [13, 12, 11, 10, 9],
        msBuff: [0.30, 0.35, 0.40, 0.45, 0.50], msPerAp: 0.03 / 100, dur: 3.0, ghost: true },
      // ออร่าขยายผลบัฟของเรา และขยายผลดีบัฟที่อยู่บนศัตรู
      { key: "R", th: "What Big Eyes You Have!", type: "truthAura", ult: true, cast: 0.3,
        cd: 55, cdByRank: [55, 50, 45], radius: 650, dur: 7,
        amp: [0.25, 0.35, 0.45], ampPerAp: 0.05 / 100 },
    ],
  },

  // =============================================================
  // 3) YODAKA (โยดากะ) — AP Assassin
  // =============================================================
  YODAKA: {
    id: "YODAKA", skillPriority: ["Q", "E", "W"], missile: 0, windup: 0.18, value: 1.2,
    th: "โยดากะ", role: "Assassin", lane: "JUNGLE", alsoLanes: ["MID"], melee: true,
    hp: 580, hpG: 95, hp5: 7.0, hp5G: 0.7, ad: 56, adG: 3.1, armor: 32, armorG: 3.8, mr: 32, mrG: 2.05,
    as: 0.67, asG: 0.027, ms: 345, range: 150,
    // สะสมสแตกจากการร่ายสกิล แล้วใช้สแตกพุ่งทะลวงตอนออโต้
    starlight: { max: 3, dur: 6, range: 400, through: 300, width: 120,
      base: 25, perLevel: (140 - 25) / 17, apRatio: 0.40 },
    passive: { th: "Starlight Piercing",
      desc: "ร่ายสกิล Q/W/E/R หรือเดินตัดพายุ Q ได้ 1 สแตก สูงสุด 3 สแตก อยู่ได้ 6 วิ · มีสแตกแล้วออโต้จะล็อกเป้าได้ไกลถึง 400 และพุ่งทะลวงไปหยุดหลังเป้า 300 หน่วย · ศัตรูทุกตัวในแนวพุ่ง (กว้าง 120) กินดาเมจเวท 25 ที่เลเวล 1 ไล่ถึง 140 ที่เลเวล 18 (+40% AP)" },
    skills: [
      // พายุลอยช้า -> ค้างเป็นวังวน -> เดินตัดผ่านแล้วระเบิด
      { key: "Q", th: "Astral Squall", type: "vortex", range: 750, projSpeed: 900, width: 150,
        cast: 0.25, cd: 8, cdByRank: [8, 7.5, 7, 6.5, 6], magic: true,
        dmg: [50, 80, 110, 140, 170], apRatio: 0.40,
        slowByRank: [0.30, 0.35, 0.40, 0.45, 0.50], slowDur: 1.5,
        zoneDur: 3.0, zoneRadius: 250, every: 0.5,
        tickDmg: [15, 25, 35, 45, 55], tickApRatio: 0.10,
        popDmg: [50, 80, 110, 140, 170], popApRatio: 0.40, popRadius: 250 },
      { key: "W", th: "Burning Plumage", type: "selfBuff", cast: 0, dur: 4, gainStack: 1,
        cd: 13, cdByRank: [13, 12, 11, 10, 9],
        msBuff: [0.25, 0.30, 0.35, 0.40, 0.45], msDur: 2.5, dashFaster: 0.6,
        onHitMagic: [20, 35, 50, 65, 80], onHitApRatio: 0.25 },
      // พุ่งเป็นสามเหลี่ยมแล้วกลับจุดเดิม — ขอบแรง ข้างในเบา
      { key: "E", th: "Delta Constellation", type: "deltaDash", cast: 0, side: 460, travel: 0.6,
        cd: 14, cdByRank: [14, 13, 12, 11, 10], magic: true, gainStack: 1,
        innerDmg: [40, 65, 90, 115, 140], innerApRatio: 0.30,
        dmg: [80, 125, 170, 215, 260], apRatio: 0.70, width: 150 },
      { key: "R", th: "Ascension of the Blue Star", type: "starfall", ult: true, cast: 0.2,
        // airMove — ระหว่างลอยอยู่บนฟ้ายังเดินเลือกจุดลงได้ วงที่จะทุบตามตัวไปด้วย
        cd: 60, cdByRank: [60, 55, 50], airTime: 2.5, minAir: 0.5, radius: 325, airMove: true,
        dmg: [220, 360, 500], apRatio: 0.85, magic: true,
        slowByRank: [0.60, 0.70, 0.80], slowDur: 0.5, refillStacks: true },
    ],
  },

  // =============================================================
  // 4) TOTSAKAN (ทศกัณฐ์) — Juggernaut / AD Fighter
  // =============================================================
  TOTSAKAN: {
    id: "TOTSAKAN", skillPriority: ["Q", "W", "E"], missile: 0, windup: 0.2, value: 0.85,
    th: "ทศกัณฐ์", role: "Juggernaut", lane: "TOP", melee: true, rage: 0.12,
    hp: 640, hpG: 108, hp5: 8.5, hp5G: 0.85, ad: 66, adG: 4.0, armor: 38, armorG: 4.2, mr: 32, mrG: 2.05,
    as: 0.64, asG: 0.022, ms: 340, range: 175,
    // ค่าสถานะจากไอเทมแรงขึ้นตามเลเวล — 7% บวกอีก 0.75% ต่อเลเวล (เลเวล 1 = 7.75% · เลเวล 18 = 20.5%)
    itemAmp: 0.07, itemAmpPerLevel: 0.0075,
    passive: { th: "Tenfold Mastery",
      desc: "ค่าสถานะที่ได้จากไอเทมทุกชิ้นเพิ่มขึ้น 7% (+0.75% ต่อเลเวล) — Bonus AD, Bonus HP, เกราะ, ต้านเวท, เร่งสกิล, ความเร็วโจมตี และ Tenacity · เลเวล 1 ได้ 7.75% เลเวล 18 ได้ 20.5%" },
    skills: [
      // กระบองฟาดพื้นแล้วดินแยกเป็นร่องพุ่งไปข้างหน้า — โดนทั้งแนวพร้อมกันทันที ไม่ใช่ของที่ลอยไป
      // ร่องที่แยกออกลุกเป็นเพลิงค้างไว้ ใครยืนทับก็ไหม้ต่อ
      { key: "Q", th: "Asura Cleave", type: "line", range: 650, width: 260, instant: true, pierce: true,
        cast: 0.3, cd: 7, cdByRank: [7, 6.5, 6, 5.5, 5],
        dmg: [75, 110, 145, 180, 215], adRatio: 0.75,
        groundBurn: { dur: 3, every: 0.5, dmg: [8, 13, 18, 23, 28], badRatio: 0.08 },
        slowBase: 0.15, slowPerLevel: 0.01, dur: 1.5 },
      // ออร่าโทสะ — กดพลังโจมตีของศัตรูรอบตัว แล้วเร่งตัวเองให้เดินเร็วขึ้นตีเร็วขึ้น
      { key: "W", th: "Wrath of the Asura", type: "wrathAura", radius: 450, dur: 5, cast: 0.15,
        cd: 14, cdByRank: [14, 13, 12, 11, 10],
        atkCut: [0.10, 0.125, 0.15, 0.175, 0.20], linger: 1.5,
        // ดูดเลือดจากทุกดาเมจที่ทำระหว่างออร่าเปิด — แลกกับความเร็วเดินที่ลดลงจาก 20-40% เหลือ 15-35%
        vamp: [0.10, 0.125, 0.15, 0.175, 0.20],
        msBuff: [0.15, 0.20, 0.25, 0.30, 0.35], asBuff: [0.20, 0.25, 0.30, 0.35, 0.40] },
      // พุ่งชนตัวแรก จับเหวี่ยงข้ามหัวไปข้างหลัง พร้อมกางแขนยี่สิบกรคุ้มตัว
      { key: "E", th: "Dreadful Toss & Aegis", type: "chargeFling", dashRange: 550, dashSpeed: 1200,
        toss: 275, airborne: 0.5, cast: 0.15, cd: 13, cdByRank: [13, 12.5, 12, 11.5, 11],
        dmg: [70, 110, 150, 190, 230], badRatio: 0.65, selfBonusHp: 0.06,
        aegis: { dur: 3.5, shield: [80, 125, 170, 215, 260], bonusHpRatio: 0.12,
          drAll: [0.15, 0.18, 0.21, 0.24, 0.27] } },
      // ทุบพื้นทันทีรอบตัว ยกทุกคนลอย แล้วงอกแขนอสูรตามจำนวนคนที่โดน
      { key: "R", th: "Cataclysmic Wrath", type: "asuraSlam", ult: true, cast: 0.15,
        cd: 100, cdByRank: [100, 85, 70], radius: 550,
        dmg: [200, 325, 450], badRatio: 0.90, selfBonusHp: 0.10, airborne: 1.25,
        // ตัวโตขึ้นตามจำนวนแขน ระยะออโต้ก็ยืดตามขนาดตัว
        arms: { per: 2, max: 10, amp: [0.03, 0.04, 0.05], dur: 10, size: 1.35, rangePct: 0.35 } },
    ],
  },

  // =============================================================
  // 5) HOOD (โรบินฮู้ด) — Marksman / ADC
  // =============================================================
  HOOD: {
    id: "HOOD", skillPriority: ["Q", "W", "E"], missile: 1700, windup: 0.32, value: 1.35,
    th: "ฮูด", role: "Marksman", lane: "ADC", melee: false,
    hp: 570, hpG: 92, hp5: 5.5, hp5G: 0.6, ad: 58, adG: 3.4, armor: 28, armorG: 3.5, mr: 30, mrG: 1.3,
    as: 0.658, asG: 0.021, ms: 335, range: 550,
    // คริไม่ระเบิดทีเดียว — ส่วนเกินกลายเป็นเลือดไหล 150% ใน 3 วิ ซ้อนได้ 5 ชั้น
    critBleed: { pct: 1.5, dur: 3, every: 0.5, maxStacks: 5 },
    passive: { th: "Lacerating Precision",
      desc: "ออโต้ที่ติดคริไม่ทำดาเมจคริทันที (เป้ากินแค่ 100% AD) แต่ส่วนเกินที่ควรได้จะกลายเป็นเลือดไหล 150% ของส่วนเกินนั้น จ่ายทุก 0.5 วิ ตลอด 3 วิ · ซ้อนได้สูงสุด 5 ชั้น แต่ละชั้นนับเวลาและดาเมจแยกกัน" },
    skills: [
      { key: "Q", th: "Sherwood Longdraw", type: "rangeCharge", width: 120, projSpeed: 1850,
        rangeMin: 750, rangeMax: 1450, maxCharge: 1.5, selfSlow: 0.2, pierce: true, falloff: 0.9, falloffFloor: 0.6,
        cast: 0.2, cd: 9, cdByRank: [9, 8.5, 8, 7.5, 7],
        dmg: [60, 95, 130, 165, 200], badRatio: 0.80,
        fullDmg: [110, 170, 230, 290, 350], fullBadRatio: 1.45 },
      // เร็วมากช่วง 2 วิแรก แล้วลดลงครึ่งหนึ่งอีก 3 วิ
      { key: "W", th: "Rapid Fletching", type: "rampBuff", cast: 0,
        cd: 15, cdByRank: [15, 14, 13, 12, 11],
        burstAs: [0.70, 0.85, 1.00, 1.15, 1.30], burstDur: 2.0,
        holdAs: [0.35, 0.425, 0.50, 0.575, 0.65], holdDur: 3.0 },
      { key: "E", th: "Flare of the Greenwood", type: "sightZone", range: 900, radius: 350,
        life: 5, revealDur: 2, cast: 0.25, cd: 18, cdByRank: [18, 16.5, 15, 13.5, 12] },
      { key: "R", th: "Rain of Ruin", type: "aoeGround", range: 1150, radius: 375, delay: 0.65,
        cast: 0.3, ult: true, cd: 50, cdByRank: [50, 45, 40],
        dmg: [150, 250, 350], badRatio: 0.75,
        slowByRank: [0.35, 0.45, 0.55], slowDur: 1.5,
        zoneBleed: { dur: 4, every: 1, dmg: [30, 50, 70], badRatio: 0.20 } },
    ],
  },

  // =============================================================
  // 6) JACK (แจ็คผู้ฆ่ายักษ์) — Burst AP Mage / Summoner
  // =============================================================
  JACK: {
    id: "JACK", skillPriority: ["Q", "W", "E"], missile: 1600, windup: 0.3, value: 1.25,
    th: "แจ็ค", role: "Burst Mage", lane: "MID", melee: false,
    hp: 560, hpG: 88, hp5: 6.0, hp5G: 0.6, ad: 52, adG: 3.0, armor: 24, armorG: 3.4, mr: 30, mrG: 1.3,
    as: 0.625, asG: 0.02, ms: 330, range: 550,
    // สกิลหรือหมัดยักษ์โดนศัตรู = แปะเมล็ด ครบ 3 เมล็ดรากงอกตรึงเท้า
    beanstalk: { need: 3, dur: 5, lockout: 8,
      root: [1.25, 1.5, 1.75], base: 40, perLevel: (180 - 40) / 17, apRatio: 0.30 },
    passive: { th: "Beanstalk Guile",
      desc: "สกิลของแจ็คหรือการโจมตีของยักษ์ที่โดนศัตรู แปะเมล็ดถั่ว 1 สแตก อยู่ได้ 5 วิ · ครบ 3 สแตก รากงอกตรึงเท้า 1.25/1.5/1.75 วิ (ตามเลเวล 1/7/13) พร้อมดาเมจเวท 40 ที่เลเวล 1 ไล่ถึง 180 ที่เลเวล 18 (+30% AP) · โดนตรึงแล้วกันติดซ้ำ 8 วิ" },
    skills: [
      { key: "Q", th: "Magic Bean Sling", type: "line", range: 875, width: 100, projSpeed: 1900,
        cast: 0.25, cd: 7, cdByRank: [7, 6.5, 6, 5.5, 5],
        dmg: [80, 115, 150, 185, 220], apRatio: 0.55, magic: true },
      // ไข่ทองคำ — สโลว์รอบตัวระหว่างรอ แล้วค่อยระเบิด
      { key: "W", th: "Golden Egg Trap", type: "aoeGround", range: 800, radius: 275, delay: 1.5,
        cast: 0.25, cd: 12, cdByRank: [12, 11, 10, 9, 8],
        dmg: [90, 140, 190, 240, 290], apRatio: 0.75, magic: true,
        auraSlow: [0.35, 0.40, 0.45, 0.50, 0.55] },
      { key: "E", th: "Song of the Golden Harp", type: "selfBuff", cast: 0.2, dur: 3.5,
        cd: 14, cdByRank: [14, 13, 12, 11, 10],
        shield: [60, 95, 130, 165, 200], apRatio: 0.40,
        msBuff: [0.20, 0.20, 0.20, 0.20, 0.20], msDur: 1.5,
        pet: { shield: [100, 160, 220, 280, 340], shieldAp: 0.60,
          ms: [0.35, 0.40, 0.45, 0.50, 0.55], as: [0.20, 0.25, 0.30, 0.35, 0.40], dur: 3.5 } },
      // อัญเชิญยักษ์ที่ตีเป็นลูป 3 จังหวะ สเตตัสสเกลตาม AP ของแจ็ค
      { key: "R", th: "Descent of the Cloud Giant", type: "summonGiant", ult: true, cast: 0.35,
        cd: 60, cdByRank: [60, 55, 50], range: 700, radius: 350, life: 16,
        dmg: [150, 250, 350], apRatio: 0.65, magic: true, knockback: 150,
        pet: {
          hp: [1000, 1600, 2200], hpAp: 1.20,
          ad: [40, 65, 90], adAp: 0.30,
          res: [30, 50, 70], resAp: 0.20, ms: 345, swing: 1.6,
          hits: [
            { th: "Cleaving Sweep", shape: "cone", radius: 300, mult: 1.00 },
            { th: "Thrusting Pillar", shape: "line", range: 450, width: 120, mult: 1.00 },
            { th: "Colossal Tremor Slam", shape: "round", radius: 350, mult: 1.75 },
          ],
        } },
    ],
  },

  // =============================================================
  // 7) PUSS (พุสส์ อิน บู๊ทส์) — AD Assassin / Duelist
  // =============================================================
  PUSS: {
    id: "PUSS", skillPriority: ["Q", "W", "E"], missile: 0, windup: 0.18, value: 1.25,
    th: "พุสส์", role: "Assassin", lane: "JUNGLE", melee: true, rage: 0.15,
    hp: 575, hpG: 90, hp5: 6.5, hp5G: 0.65, ad: 60, adG: 3.5, armor: 30, armorG: 3.7, mr: 32, mrG: 2.05,
    as: 0.68, asG: 0.03, ms: 345, range: 150,
    // ท้าดวลศัตรูหนึ่งตัว + ชีวิตที่เก้า
    // pickLockRounds — เลือกเป้าแล้วเปลี่ยนไม่ได้จนกว่าจะผ่านไปอีกเท่านี้ยก (นับยกที่เลือกด้วย)
    // repickAfterKills — เก็บเป้าที่มีตราได้แล้ว ต้องเก็บเป้าที่มีตราตัวอื่นอีกเท่านี้ครั้ง ถึงจะเลือกตัวเดิมได้อีก
    duel: { amp: 0.15, ampPerBad: 0.01 / 20, goldPct: 0.30, reviveHp: 0.30, hideDur: 2.0,
      pickLockRounds: 2, repickAfterKills: 2 },
    passive: { th: "Duelist's Bounty & Nine Lives",
      desc: "ตราประทับท้าดวลศัตรูหนึ่งตัวตอนเริ่มไฟต์ — ทำดาเมจใส่เป้านั้นแรงขึ้น 15% (+1% ต่อ Bonus AD ทุก 20) และทั้งคู่จะล็อกเป้าหากันก่อนเสมอ · เก็บศพหรือช่วยเก็บเป้าที่มีตรา ได้เงินเพิ่ม 30% · ถ้าพุสส์ตายตอนเป้ายังไม่ตาย จะล่องหนแตะไม่ได้ 2 วิ แล้วฟื้นด้วยเลือด 30% (ตราหายไปทันที) · เลือกเป้าแล้วเปลี่ยนไม่ได้อีก 2 ยก · สังหารเป้าที่มีตราได้แล้ว ต้องสังหารเป้าที่มีตราตัวอื่นอีก 2 ครั้งก่อนจึงจะประทับตราตัวเดิมได้อีก" },
    skills: [
      { key: "Q", th: "Shadow Lunge", type: "blinkBehind", range: 550, behind: 120, cast: 0.15,
        cd: 8, cdByRank: [8, 7.5, 7, 6.5, 6],
        dmg: [70, 105, 140, 175, 210], badRatio: 0.80, backSlow: 0.40, backSlowDur: 1.5 },
      // ยืนแทงรัว 6 ระลอกเป็นกรวย ยกเลิกเองได้
      { key: "W", th: "Rapier Flurry", type: "channelCone", range: 450, angle: 50,
        ticks: 6, every: 0.25, cast: 0.1, selfRoot: true,
        cd: 10, cdByRank: [10, 9, 8, 7, 6],
        dmg: [15, 25, 35, 45, 55], badRatio: 0.20 },
      { key: "E", th: "Prowl in the Shadows", type: "selfBuff", cast: 0, stealth: true,
        durByRank: [1.5, 1.75, 2.0, 2.25, 2.5], dur: 2,
        cd: 14, cdByRank: [14, 13, 12, 11, 10],
        msBuff: [0.35, 0.40, 0.45, 0.50, 0.55],
        ambushAs: [0.40, 0.50, 0.60, 0.70, 0.80], ambushDur: 3.0 },
      // ฟันกระเด้ง 5 ครั้ง แตะไม่ได้ตลอดท่า โดนซ้ำตัวเดิมเหลือ 30%
      { key: "R", th: "Omni-Flourish", type: "bounceSlash", ult: true, cast: 0,
        cd: 55, cdByRank: [55, 45, 35], range: 600, hits: 5, bounceRange: 450, repeatMul: 0.30,
        every: 0.18, dmg: [70, 110, 150], badRatio: 0.45 },
    ],
  },

  // =============================================================
  // 8) NIAN (เหนียน) — Vanguard / AP Tank
  // =============================================================
  NIAN: {
    id: "NIAN", skillPriority: ["E", "Q", "W"], missile: 0, windup: 0.2, value: 1.0,
    th: "เหนียน", role: "Vanguard", lane: "TOP", alsoLanes: ["MID"], melee: true, rage: 0.12,
    hp: 620, hpG: 102, hp5: 8.0, hp5G: 0.8, ad: 58, adG: 3.2, armor: 36, armorG: 4.0, mr: 32, mrG: 2.05,
    as: 0.64, asG: 0.022, ms: 345, range: 175,
    // ออร่าไฟฟ้ารอบตัว ฟาดเป้าสุ่มทุก 2 วิ (W ทำให้ฟาดทุกตัวพร้อมกัน)
    staticAura: { radius: 375, every: 2.0, base: 20, perLevel: (90 - 20) / 17, apRatio: 0.15, bonusHp: 0.03 },
    passive: { th: "Static Discharge",
      desc: "ออร่าไฟฟ้ารัศมี 375 รอบตัว · ทุก 2 วิ ประจุฟาดศัตรู 1 ตัวในระยะ (เล็งแชมเปี้ยนก่อน) ดาเมจเวท 20 ที่เลเวล 1 ไล่ถึง 90 ที่เลเวล 18 (+15% AP) (+3% Bonus HP)" },
    skills: [
      { key: "Q", th: "Thunder Horn Charge", type: "dash", range: 600, dashSpeed: 1300, engageRange: 0,
        cast: 0.15, cd: 11, cdByRank: [11, 10, 9, 8, 7], magic: true,
        dmg: [70, 110, 150, 190, 230], apRatio: 0.55, selfBonusHp: 0.05,
        landStunByRank: [1.1, 1.2, 1.3, 1.4, 1.5] },
      { key: "W", th: "Overcharged Fur", type: "selfBuff", cast: 0.15, dur: 4,
        cd: 14, cdByRank: [14, 13, 12, 11, 10],
        shield: [60, 100, 140, 180, 220], apRatio: 0.40, bonusHpRatio: 0.08,
        msBuff: [0.20, 0.25, 0.30, 0.35, 0.40], msDur: 2.5, msDecay: true,
        overcharge: true },
      // คำรามเป็นกรวย 3 ระลอกติด
      { key: "E", th: "Crackling Roar", type: "coneVolley", range: 550, angle: 60,
        ticks: 3, every: 0.25, cast: 0.2, cd: 10, cdByRank: [10, 9.5, 9, 8.5, 8], magic: true,
        dmg: [30, 50, 70, 90, 110], apRatio: 0.20,
        slowByRank: [0.20, 0.25, 0.30, 0.35, 0.40], slowDur: 1.0 },
      // พายุฟาด 5 ระลอก ระลอกละ 3 ตัว + สแตกกระตุกสตัน
      { key: "R", th: "Calamitous Tempest", type: "tempest", ult: true, cast: 0.3,
        cd: 60, cdByRank: [60, 55, 50], range: 600, radius: 550, dur: 3.0,
        strikes: 5, every: 0.6, targetsPerStrike: 3, magic: true,
        dmg: [50, 85, 120], apRatio: 0.25, bonusHp: 0.03,
        jolt: { need: 3, stun: [0.25, 0.30, 0.35] } },
    ],
  },

  // =============================================================
  // 9) H.S.B (แฮม ไส้กรอก เบคอน) — Warden / Tank
  // =============================================================
  "H.S.B": {
    id: "H.S.B", skillPriority: ["W", "Q", "E"], missile: 0, windup: 0.21, value: 0.9,
    th: "แฮม ไส้กรอก เบคอน", role: "Warden", lane: "SUPPORT", alsoLanes: ["TOP"], melee: true,
    hp: 640, hpG: 102, hp5: 8.5, hp5G: 0.85, ad: 62, adG: 3.5, armor: 38, armorG: 4.2, mr: 32, mrG: 2.05,
    as: 0.63, asG: 0.02, ms: 340, range: 150,
    // หลอดเลือดแบ่ง 3 ขั้น — เสียเลือดข้ามเกณฑ์แล้วหมูหนีไปทีละตัว
    threePigs: [
      { at: 1.00, size: 1.00, skill: 1.00, build: 1.00, dr: 0.15 },
      { at: 0.75, size: 0.90, skill: 1.15, build: 1.20, dr: 0 },
      { at: 0.50, size: 0.80, skill: 1.30, build: 1.50, dr: -0.15 },
    ],
    passive: { th: "Three Little Pigs",
      desc: "หลอดเลือดแบ่งเป็น 3 ขั้น · ขั้นบ้านฟาง (100-75%) หมูครบ 3 ตัว กินดาเมจน้อยลง 15% · ขั้นบ้านไม้ (ต่ำกว่า 75%) หมูหนีไปตัวหนึ่ง ตัวเล็กลง 10% สกิลกว้างขึ้น 15% สิ่งก่อสร้างอึดขึ้น 20% และเพดานเลือดในไฟต์ล็อกที่ 75% · ขั้นบ้านอิฐ (ต่ำกว่า 50%) เล็กลงอีก สกิลกว้างขึ้น 30% สิ่งก่อสร้างอึดขึ้น 50% เพดานเลือดล็อกที่ 50% แต่กินดาเมจมากขึ้น 15%" },
    skills: [
      // ขว้างค้อน — โดนศัตรูทำดาเมจ โดนสิ่งก่อสร้างของตัวเองคือซ่อม
      { key: "Q", th: "Sledge Toss", type: "sledge", range: 800, width: 120, projSpeed: 1500,
        cast: 0.25, cd: 7, cdByRank: [7, 6.5, 6, 5.5, 5],
        dmg: [75, 110, 145, 180, 215], badRatio: 0.60, selfBonusHp: 0.05,
        slowByRank: [0.40, 0.45, 0.50, 0.55, 0.60], dur: 1.75,
        repair: [80, 130, 180, 230, 280], repairBonusHp: 0.35, repairRes: 0.40, repairCdCut: 0.5 },
      // กำแพงอิฐ — กันกระสุนและรับดาเมจแทน
      { key: "W", th: "Brick Bastion", type: "wall", range: 500, span: 450, life: 5,
        cast: 0.3, cd: 16, cdByRank: [16, 15, 14, 13, 12],
        hp: [300, 450, 600, 750, 900], hpBonusHp: 0.45,
        res: [30, 45, 60, 75, 90], resRatio: 1.0 },
      // พุ่งทะลุ ชนกำแพงแล้วระเบิดกระแทกลอย
      { key: "E", th: "Boarhead Breaker", type: "steerDash", dashRange: 750, dashSpeed: 1250,
        cast: 0, cd: 12, cdByRank: [12, 11, 10, 9, 8],
        dmg: [60, 95, 130, 165, 200], badRatio: 0.50, selfBonusHp: 0.04,
        hitRadius: 350, hitDmg: [100, 155, 210, 265, 320], hitBadRatio: 0.80, hitBonusHp: 0.09,
        knockup: 1.25 },
      // บ้านอิฐล้อมตัวเอง — เพื่อนข้างในไม่กินดาเมจ ศัตรูเข้าไม่ได้
      { key: "R", th: "The Wolf-Proof Bunker", type: "bunker", ult: true, cast: 0.3,
        cd: 60, cdByRank: [60, 55, 50], radius: 350, life: 5, knockback: 200,
        hp: [850, 1450, 2050], hpBonusHp: 0.70, res: [40, 60, 80], resRatio: 1.0,
        burstRadius: 400, burstDmg: [150, 250, 350], burstBadRatio: 0.60, burstBonusHp: 0.10,
        burstSlow: 0.50, burstSlowDur: 1.5 },
    ],
  },

  // =============================================================
  // 10) ARTHUR (กษัตริย์อาเธอร์) — Diver / AD Fighter
  // =============================================================
  ARTHUR: {
    id: "ARTHUR", skillPriority: ["Q", "E", "W"], missile: 0, windup: 0.19, value: 1.05,
    th: "อาเธอร์", role: "Diver", lane: "TOP", melee: true, rage: 0.15,
    hp: 625, hpG: 98, hp5: 8.0, hp5G: 0.75, ad: 64, adG: 3.6, armor: 36, armorG: 4.0, mr: 32, mrG: 2.05,
    as: 0.665, asG: 0.019, ms: 345, range: 175,
    // ดาเมจกายภาพและดาเมจจริงที่ทำได้ แปลงเป็นโล่
    aegis: { pct: 0.15, lowPct: 0.25, hpBelow: 0.50, dur: 3.5, cap: 0.30 },
    passive: { th: "Excalibur's Aegis",
      desc: "ดาเมจกายภาพและดาเมจจริงที่อาเธอร์ทำได้ทุกแหล่ง แปลงเป็นโล่ 15% ของยอดนั้น · โล่อยู่ 3.5 วิ สะสมทับได้ไม่เกิน 30% ของ Max HP · เลือดต่ำกว่า 50% อัตราแปลงขึ้นเป็น 25%" },
    skills: [
      // พาสซีฟฟันกวาด + กดแล้วออโต้ถัดไปแรงขึ้น ถ้าเป้าเลือดเกินครึ่งจะตีสองครั้งรวด
      { key: "Q", th: "Sovereign's Edge", type: "onHit", charges: 1, window: 4, cast: 0,
        cd: 7, cdByRank: [7, 6.5, 6, 5.5, 5],
        dmg: [30, 55, 80, 105, 130], badRatio: 0.45,
        cleaveRadius: 250, cleaveRatio: [0.35, 0.40, 0.45, 0.50, 0.55],
        doubleAbove: 0.50 },
      // กดได้แม้ติด CC — สวนกลับด้วยการหมุนฟันรอบตัวและตัดเวลา CC ครึ่งหนึ่ง
      { key: "W", th: "Pommel Strike & Retribution", type: "pommel", range: 250, cast: 0.15,
        cd: 14, cdByRank: [14, 13, 12, 11, 10],
        dmg: [50, 80, 110, 140, 170], badRatio: 0.50,
        stunByRank: [1.0, 1.1, 1.2, 1.3, 1.4],
        whirlRadius: 325, whirlDmg: [60, 100, 140, 180, 220], whirlBadRatio: 0.65, ccCut: 0.5 },
      // พุ่งเส้นตรงแล้วฟันครึ่งวง โดนทั้งสองจังหวะได้ตีเร็วและโล่
      { key: "E", th: "Knight's Lunge", type: "lungeSweep", dashRange: 500, dashSpeed: 1400,
        sweepRadius: 300, cast: 0.1, cd: 12, cdByRank: [12, 11, 10, 9, 8],
        dmg: [40, 65, 90, 115, 140], badRatio: 0.40,
        sweepDmg: [60, 95, 130, 165, 200], sweepBadRatio: 0.60,
        dualAs: [0.40, 0.50, 0.60, 0.70, 0.80], dualShield: [80, 130, 180, 230, 280],
        dualShieldBad: 0.60, dualDur: 3.5 },
      // ดาเมจจริงก้อนใหญ่ แล้วประหารถ้าเลือดเหลือต่ำกว่าเกณฑ์
      { key: "R", th: "Judgment of the Round Table", type: "judgment", ult: true, cast: 0.3,
        cd: 55, cdByRank: [55, 50, 45], range: 450,
        dmg: [175, 300, 425], badRatio: 0.80,
        execAt: [0.15, 0.20, 0.25], execPerBad: 0.01 / 35,
        killMs: 0.40, killMsDur: 3.0 },
    ],
  },
};
