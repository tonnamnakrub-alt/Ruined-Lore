

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
// ค่าสถานะของนักแข่ง — ทุกค่าต้องมีผลที่จับต้องได้ในสนาม
//
// ก่อนหน้านี้วัดแล้วพบว่า ถ้าทีมหนึ่งดันค่านั้นเป็น 10 อีกทีมทุกค่า 5:
//   decision ชนะ 80% · mechanics 56% · knowledge 55% · gameSense 51% · teamwork 45%
// gameSense แทบไม่มีผล ส่วน teamwork ยิ่งใส่ยิ่งแย่ (รุมเป้าเดียวกันแต่ดาเมจล้นทิ้ง)
// สามก้อนล่างนี้คือสิ่งที่เติมเข้าไปให้สองค่านั้นมีที่ยืนจริง
// ---------------------------------------------------------------

// ความรู้แมตช์อัพ — ต่อหนึ่งแต้มที่ห่างจากกลาง (5)
// ทำดาเมจได้มากขึ้นเท่านี้ และกินดาเมจน้อยลงเท่านี้ ตามที่คำอธิบายเขียนไว้ตั้งแต่แรก
export const KNOW_DEAL = 0.006;    // แต้ม 10 = ตีแรงขึ้น 3% · แต้ม 0 = อ่อนลง 3%
export const KNOW_TAKE = 0.005;    // แต้ม 10 = กินดาเมจน้อยลง 2.5%

// ทีมเวิร์ค — รุมเป้าเดียวกันพร้อมกันแล้วแรงขึ้น ต่อเพื่อนหนึ่งคนที่จ่อเป้าเดียวกัน
// คูณด้วยแต้มทีมเวิร์คหาร 10 · นับเพื่อนได้มากสุด TEAM_FOCUS_MAX คน
export const TEAM_FOCUS = 0.14;   // เพื่อนสามคน แต้มเต็ม = +42% · เฉลี่ยจริงในไฟต์ราว +20%
export const TEAM_FOCUS_MAX = 3;
export const TEAM_FOCUS_RANGE = 1400;

// สายตาอ่านเกม — "อ่านว่ากำลังโดนรุม" ต้องแปลว่าโดนรุมแล้วเจ็บน้อยลงจริง
// นับศัตรูที่ประชิดเข้ามาในรัศมีนี้ (คนละเงื่อนไขกับทีมเวิร์คที่นับคนจ่อเป้าเดียวกัน
// ทีมยิงไกลจึงได้โบนัสรุมโดยไม่ปลุกเกราะตัวนี้ ส่วนทีมบุกประชิดปลุกทั้งสองทาง)
// การตัดสินใจ — อดใจรอ "จังหวะที่คุ้ม" ได้นานกี่วินาทีต่อหนึ่งแต้ม ก่อนจะยอมกดอัลติทิ้ง
// แต้ม 0 กดทันที · แต้ม 5 รอ 6 วิ · แต้ม 10 รอ 12 วิ (ไฟต์ห้าคนยาว 44 วิ)
export const ULT_PATIENCE = 1.2;

export const SENSE_GUARD = 0.10;   // ศัตรูสามตัว แต้มเต็ม = −30% · เฉลี่ยจริงในไฟต์ราว −11%
export const SENSE_GUARD_MAX = 3;
export const SENSE_GUARD_RANGE = 600;

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
