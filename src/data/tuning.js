

export const REGEN_DELAY = 4;      // seconds out of combat before regen

export const REGEN_RATE = 0.03;    // % max hp per second

export const RETREAT_TIME = 2.5;   // a retreat lasts this long, then re-engage

export const RETREAT_COOLDOWN = 6; // and can't retrigger for this long

export const RAMP_FRAC = 0.4;      // damage starts ramping at this fraction of the event's clock

export const RAMP_SCALE = 0.45;    // ...and doubles over this fraction of the clock


// Events decide how long a fight runs. Add new ones here.
export const EVENTS = {
  SKIRMISH: { id: "SKIRMISH", th: "ปะทะกลางสนาม", duration: 40 },
  OBJECTIVE: { id: "OBJECTIVE", th: "แย่งออบเจกทีฟ", duration: 60 },
  SIEGE: { id: "SIEGE", th: "ตีป้อม", duration: 90 },
  BLITZ: { id: "BLITZ", th: "ปะทะสายฟ้าแลบ", duration: 20 },
  // ยกฟาร์ม — ข้ามการปะทะไปเลย ทั้งสองฝั่งได้เงินกับ XP บางส่วน ไม่มีใครชนะหรือแพ้
  // เลือกติดกันสองยกไม่ได้ และใช้ในยกตัดสินไม่ได้ (กันการถ่วงเกม)
  FARM: { id: "FARM", th: "ยกฟาร์ม (ไม่มีการปะทะ)", duration: 0, farm: { goldPct: 0.75, xpPct: 0.75 } },
};

export const DEFAULT_WINDUP = 0.26;  // fraction of the attack cycle spent standing still

export const DEFAULT_CAST = 0.3;     // seconds rooted in place while casting      // damage ramps up after this, so fights end


export const STYLES = {
  ENGAGE: { key: "ENGAGE", th: "บุก", rangeMul: 0.42, standoff: 0.68, leashBonus: 290, retreatAt: 0.15, beats: "POKE" },
  POKE: { key: "POKE", th: "คุมระยะ", rangeMul: 0.74, standoff: 0.86, leashBonus: 0, retreatAt: 0.3, beats: "HOLD" },
  HOLD: { key: "HOLD", th: "ตั้งรับ", rangeMul: 0.60, standoff: 0.78, leashBonus: -190, retreatAt: 0.38, beats: "ENGAGE" },
};
