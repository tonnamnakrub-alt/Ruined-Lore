

export const REGEN_DELAY = 4;      // seconds out of combat before regen

export const REGEN_RATE = 0.03;    // % max hp per second

export const RETREAT_TIME = 2.5;   // a retreat lasts this long, then re-engage

export const RETREAT_COOLDOWN = 6; // and can't retrigger for this long

// ตัวคูณดาเมจโจมตีปกติทั้งเกม — ปุ่มเดียวที่คุมว่าไฟต์จะจบเร็วแค่ไหน
// ออโต้เป็นดาเมจก้อนที่ไม่มีคูลดาวน์ ไต่ตามของที่ซื้อ และทุกตัวมีเหมือนกันหมด
export const AUTO_DMG = 0.75;

// ตัวคูณดาเมจ "ทุกชนิด" ทั้งเกม — ใช้ยืดความยาวไฟต์โดยไม่ต้องไล่แก้ทีละสกิล
export const DMG_MUL = 0.80;

// เวลาไฟต์ — ฐานเท่านี้วินาที แล้วบวกตามจำนวนคนที่ลงสนามเกินสองคนแรก
// 1v1 = 20 วิ · 2v2 = 26 วิ · ไฟต์รวมห้าคน = 44 วิ
export const FIGHT_BASE = 20;
export const FIGHT_PER_BODY = 3;

// ---------------------------------------------------------------
// ค่าสถานะของนักแข่ง — ทุกค่าเปลี่ยน "สิ่งที่บอทตัดสินใจทำ" เท่านั้น
// ไม่มีค่าไหนบวกลบดาเมจลับหลัง ผู้เล่นต้องดูไฟต์แล้วเห็นความต่างได้
//
// วัดมาแล้วว่าในเอนจินนี้มีแค่สองการตัดสินใจที่เปลี่ยนผลไฟต์ได้จริง:
//   1) เลือกตีใคร   2) กดอัลติตอนไหน
// การยืน (posQ) · การหลบ · การหนีโซนบนพื้น · ระยะไล่ — ลองแล้ววัดได้ราวศูนย์
// ถึงติดลบ เพราะดาเมจเกือบทั้งหมดในเกมนี้หลบไม่ได้อยู่แล้ว (ออโต้ลงทันทีหรือเป็นลูกวิ่งตาม)
// ค่าสถานะจึงต้องออกฤทธิ์ผ่านสองการตัดสินใจนั้นเป็นหลัก
// ---------------------------------------------------------------

// ทีมเวิร์ค — ไม่ตีศพ ถ้าเพื่อนจ่อดาเมจใส่เป้านั้นพอฆ่าอยู่แล้ว ก็ย้ายไปตัวถัดไป
// มองไปข้างหน้ากี่วินาทีว่าเพื่อนจะจ่อดาเมจได้เท่าไหร่
export const TEAM_LOOKAHEAD = 1.6;
// โทษของการไปสมทบเป้าที่ตายอยู่แล้ว คูณด้วยแต้มทีมเวิร์คหาร 10
export const TEAM_OVERKILL = 10;

// สายตาอ่านเกม — น้ำหนักของ "คนที่กำลังเล่นงานเราหรือเล่นงานตัวเปราะของเรา"
// ในคะแนนเลือกเป้า คูณด้วยแต้มสายตาหาร 10
export const SENSE_PEEL = 3.0;

// ความรู้แมตช์อัพ — เลือกเป้าที่ "เรา" กินได้เร็วจริงหลังหักเกราะ/ต้านเวทของเขา
// น้ำหนักของการอ่านแมตช์อัพในคะแนนเลือกเป้า คูณด้วยแต้มความรู้หาร 10
export const KNOW_MATCHUP = 3.2;

// การตัดสินใจ — อดใจรอ "จังหวะที่คุ้ม" ได้นานกี่วินาทีต่อหนึ่งแต้ม ก่อนจะยอมกดอัลติทิ้ง
// แต้ม 0 กดทันที · แต้ม 5 รอ 6 วิ · แต้ม 10 รอ 12 วิ (ไฟต์ห้าคนยาว 44 วิ)
export const ULT_PATIENCE = 1.2;

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
