

export const REGEN_DELAY = 4;      // seconds out of combat before regen

export const REGEN_RATE = 0.03;    // % max hp per second

export const RETREAT_TIME = 2.5;   // a retreat lasts this long, then re-engage

export const RETREAT_COOLDOWN = 6; // and can't retrigger for this long

// ตัวคูณดาเมจโจมตีปกติทั้งเกม — ปุ่มเดียวที่คุมว่าไฟต์จะจบเร็วแค่ไหน
// ออโต้เป็นดาเมจก้อนที่ไม่มีคูลดาวน์ ไต่ตามของที่ซื้อ และทุกตัวมีเหมือนกันหมด
export const AUTO_DMG = 0.75;

// ตัวคูณดาเมจ "ทุกชนิด" ทั้งเกม — ใช้ยืดความยาวไฟต์โดยไม่ต้องไล่แก้ทีละสกิล
export const DMG_MUL = 0.80;

export const RAMP_FRAC = 0.4;      // damage starts ramping at this fraction of the event's clock

export const RAMP_SCALE = 0.45;    // ...and doubles over this fraction of the clock


// ---------------------------------------------------------------
// เลิกใช้ระบบอีเวนต์แล้ว — ทุกไฟต์ใช้ค่าชุดเดียวกันหมด
// ความหลากหลายของยกมาจากนิสัยที่สั่งประจำเลนแทน
// เก็บ EVENTS ไว้เป็นชุดเดียวเพื่อไม่ให้เอนจินกับหน้าซ้อมต้องแก้ตาม
// ---------------------------------------------------------------
export const EVENTS = {
  SKIRMISH: { id: "SKIRMISH", th: "ปะทะในเลน", duration: 60 },
};

export const DEFAULT_FIGHT = EVENTS.SKIRMISH;

export const DEFAULT_WINDUP = 0.26;  // fraction of the attack cycle spent standing still

export const DEFAULT_CAST = 0.3;     // seconds rooted in place while casting      // damage ramps up after this, so fights end


export const STYLES = {
  ENGAGE: { key: "ENGAGE", th: "บุก", rangeMul: 0.42, standoff: 0.68, leashBonus: 290, retreatAt: 0.15, beats: "POKE" },
  POKE: { key: "POKE", th: "คุมระยะ", rangeMul: 0.74, standoff: 0.86, leashBonus: 0, retreatAt: 0.3, beats: "HOLD" },
  HOLD: { key: "HOLD", th: "ตั้งรับ", rangeMul: 0.60, standoff: 0.78, leashBonus: -190, retreatAt: 0.38, beats: "ENGAGE" },
};
