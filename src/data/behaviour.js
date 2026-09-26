// ---------------------------------------------------------------
// นิสัยประจำเลน — ผู้เล่นสั่งได้ทุกยก ว่าแต่ละเลนจะเล่นยังไง
//
// มีสามเลนที่สั่งได้: TOP · MID · BOT (ADC กับ SUPPORT นับเป็นเลนเดียวกัน)
// ป่าไม่มีนิสัย — ป่าเลือกแทนว่าจะฟาร์มต่อ หรือไปแกงค์เลนไหน
//
// รายได้ของทั้งเกมมาจากตารางนี้ที่เดียว ไม่มีเงินคิล ไม่มีโบนัสเลนอีกแล้ว
// ---------------------------------------------------------------

export const STANCES = {
  SAFE:    { id: "SAFE",    th: "เซฟ",   gold: 3, xp: 2, desc: "ยืนเก็บของ ไม่เสี่ยง" },
  NEUTRAL: { id: "NEUTRAL", th: "ปกติ",  gold: 5, xp: 3, desc: "เล่นตามน้ำ แลกหมัดได้" },
  AGGRO:   { id: "AGGRO",   th: "รุกล้ำ", gold: 7, xp: 3, desc: "กดดันหนัก ได้เยอะแต่เสี่ยง" },
};

export const STANCE_LIST = ["SAFE", "NEUTRAL", "AGGRO"];

// เลนที่สั่งนิสัยได้ และใครอยู่ในเลนนั้นบ้าง
export const STANCE_LANES = ["TOP", "MID", "BOT"];
export const LANE_MEMBERS = { TOP: ["TOP"], MID: ["MID"], BOT: ["ADC", "SUPPORT"] };
export const LANE_TH = { TOP: "ท็อป", MID: "มิด", BOT: "บอท" };

// เลนของนักแข่งคนหนึ่งอยู่ในกลุ่มนิสัยไหน
export const stanceLaneOf = (lane) => (lane === "ADC" || lane === "SUPPORT" ? "BOT" : lane);

// เลนไหนที่ "แตกไฟต์เพราะนิสัย" จะไม่ได้รายได้ฐานเลย รายได้มาจากศพอย่างเดียว
// สู้แล้วเก็บใครไม่ได้ = เสียยกนั้นทั้งยก ทั้งเงินและ XP
export const KILL = { gold: 6, xp: 1 };
// ช่วยสังหารได้มากหรือน้อยขึ้นกับว่ามีคนช่วยกี่คน — คนเดียวได้เต็ม หลายคนหารกันไป
export const ASSIST_SOLO = { gold: 3, xp: 1 };
export const ASSIST_GROUP = { gold: 1, xp: 1 };
export function assistPay(assistCount) {
  return assistCount <= 1 ? ASSIST_SOLO : ASSIST_GROUP;
}

// ---------------------------------------------------------------
// ค่าหัว — แปลงจากตารางของ League of Legends หารห้าสิบ (สังหารปกติ 300 ทอง = 6 ที่นี่)
//
//   ฆ่าติดกันโดยไม่ตาย  -> ค่าหัวเพิ่มเป็นชั้นๆ (450/600/700/800/900/1000 ทอง)
//   เงินนำอีกฝั่ง        -> นำ 100 ทองขึ้นไปได้ +50 แล้ว +50 ทุกๆ 150 ทองที่นำเพิ่ม
//   ตายติดกันโดยไม่ได้ฆ่า -> ค่าหัวลดลงตามเปอร์เซ็นต์ แล้วไปหยุดที่ 100 ทอง
//
// เพดานรวม 1000 ทอง = 20 ที่นี่
// ---------------------------------------------------------------
export const BOUNTY = {
  base: KILL.gold,                        // 300 ทอง
  streak: [0, 0, 3, 6, 8, 10, 12, 14],    // ดัชนี = ฆ่าติดกันกี่ศพ (+150/+300/+400/+500/+600/+700)
  leadStart: 2,                           // นำ 100 ทองขึ้นไปถึงเริ่มมีค่าหัวจากเงินนำ
  leadStep: 3,                            // นำเพิ่มทุกๆ 150 ทอง
  leadPer: 1,                             // ได้เพิ่มทีละ 50 ทอง
  leadMax: 10,                            // เพดานเฉพาะส่วนเงินนำ 500 ทอง
  // เปอร์เซ็นต์ที่เหลือเมื่อตายติดกัน — ดัชนี = ตายติดกันมาแล้วกี่ครั้ง
  deathDecay: [1, 0.73, 0.57, 0.45, 0.35, 0.28, 0.22, 0.18],
  deathFloor: 0.33,                       // ตายติดกัน 9 ครั้งขึ้นไปหยุดที่ 100 ทอง
  max: 20,                                // เพดานรวม 1000 ทอง
};

// เลือดที่เสียไปก่อนเริ่มไฟต์ ตอนโดนจับได้ว่าล้ำ/โดนดัก
export const GANK_HURT = 0.20;

// ---------------------------------------------------------------
// ยืนรับแกงค์แบบเซฟ — ทางออกของเลนที่โดนป่าไล่แกงค์ซ้ำจนสโนว์บอล
//
// สั่งเลนเป็น "เซฟ" ไว้แล้วโดนแกงค์ = ไม่ได้ตั้งใจสู้ แค่ยื้อให้พ้นตัว
// ไฟต์เลยสั้นมาก และถ้ายังเหลือคนรอดตอนหมดเวลา ฝ่ายที่ยกพวกมาแกงค์
// เสียยกนั้นฟรีๆ ทั้งป่าและคนที่ถูกดึงมาช่วย
//
// แลกกันตรงที่เซฟได้รายได้ฐานน้อยที่สุดอยู่แล้ว (3 เงิน) การยืนรับจึงไม่ใช่ของฟรี
// ---------------------------------------------------------------
export const SAFE_STAND_SECONDS = 10;

// ป่าเอาเพื่อนไปแกงค์ด้วยได้ตั้งแต่ยกไหน และได้กี่คน
export const JUNGLE_CREW = [
  { round: 15, crew: 1 },
  { round: 30, crew: 2 },
];
export function crewAllowed(round) {
  let n = 0;
  for (const t of JUNGLE_CREW) if (round >= t.round) n = t.crew;
  return n;
}

const base = (s) => ({ gold: STANCES[s].gold, xp: STANCES[s].xp });

// ---------------------------------------------------------------
// นิสัยสองฝั่งเจอกันในเลนเดียวกัน -> ใครได้อะไร และต้องไฟต์ไหม
//   a = นิสัยฝั่งเรา · b = นิสัยฝั่งศัตรู
// ---------------------------------------------------------------
export function laneOutcome(a, b) {
  const me = base(a);
  const foe = base(b);
  let fight = false;
  let aggroDuel = false;
  let note = "";

  if (a === "SAFE" && b === "SAFE") {
    note = "ต่างคนต่างเก็บของ ไม่มีอะไรเกิดขึ้น";
  } else if (a === "SAFE" && b === "NEUTRAL") {
    foe.gold += 2;
    note = "ฝั่งเราถอย ศัตรูกินเลนฟรี ได้เงินเพิ่ม 2";
  } else if (a === "NEUTRAL" && b === "SAFE") {
    me.gold += 2;
    note = "ศัตรูถอย เรากินเลนฟรี ได้เงินเพิ่ม 2";
  } else if (a === "SAFE" && b === "AGGRO") {
    foe.gold -= 2; foe.xp -= 1;
    note = "ศัตรูล้ำมาแต่เราไม่รับ เขาเสียเวลาเปล่า เงิน -2 XP -1";
  } else if (a === "AGGRO" && b === "SAFE") {
    me.gold -= 2; me.xp -= 1;
    note = "เราล้ำไปแต่ศัตรูถอยหมด เสียเวลาเปล่า เงิน -2 XP -1";
  } else if (a === "NEUTRAL" && b === "NEUTRAL") {
    fight = true;
    note = "ทั้งคู่ยืนแลก — บังคับไฟต์ในเลน ไม่มีรายได้ฐาน อยู่ที่ว่าใครเก็บศพได้";
  } else if (a === "NEUTRAL" && b === "AGGRO") {
    me.gold -= 1; me.xp -= 1;
    note = "โดนกดดันจนเก็บของไม่ครบ เงิน -1 XP -1";
  } else if (a === "AGGRO" && b === "NEUTRAL") {
    foe.gold -= 1; foe.xp -= 1;
    note = "เรากดดันจนศัตรูเก็บของไม่ครบ เขาเสียเงิน 1 XP 1";
  } else if (a === "AGGRO" && b === "AGGRO") {
    fight = true; aggroDuel = true;
    note = "ล้ำใส่กันทั้งคู่ — ไฟต์แตก ไม่มีรายได้ฐาน อยู่ที่ว่าใครเก็บศพได้";
  }
  return { fight, aggroDuel, me, foe, note };
}

// ---------------------------------------------------------------
// ป่าบุกเข้าเลน — ตารางจากเอกสาร ซ้าย = นิสัยเลนศัตรู · ขวา = นิสัยเลนเรา
//   hurt : ใครเสียเลือดก่อนไฟต์ (jungler | foeLane | myLane | both | null)
//   join : เพื่อนร่วมเลนของเราลงไฟต์ด้วยไหม (false = ป่าสู้เดี่ยว)
// ---------------------------------------------------------------
export const JUNGLE_TABLE = {
  "SAFE|SAFE":       { hurt: "jungler", join: false, note: "ศัตรูถอย เลนเราก็ถอย ป่าโดนสวนแล้วต้องสู้เดี่ยว" },
  "SAFE|NEUTRAL":    { hurt: "jungler", join: true,  note: "ป่าโดนสวนก่อนเข้า แต่เพื่อนร่วมเลนลงช่วย" },
  "SAFE|AGGRO":      { hurt: null,      join: true,  note: "เลนเราล้ำไว้อยู่แล้ว ป่าเข้ามาฟรี" },
  "NEUTRAL|SAFE":    { hurt: null,      join: false, note: "เลนเราถอย ป่าเข้าไปสู้เดี่ยวตามปกติ" },
  "NEUTRAL|NEUTRAL": { hurt: null,      join: true,  note: "ป่าเข้าพร้อมเพื่อนร่วมเลนตามปกติ" },
  "NEUTRAL|AGGRO":   { hurt: "foeLane", join: true,  note: "ศัตรูโดนดักจนเสียเลือด แล้วป่าเข้าพร้อมเพื่อน" },
  "AGGRO|SAFE":      { hurt: "foeLane", join: false, note: "ศัตรูล้ำเกินจนเสียเลือด ป่าเข้าไปเก็บเดี่ยว" },
  "AGGRO|NEUTRAL":   { hurt: "jungler", join: true,  note: "ศัตรูล้ำมาก่อน ป่าโดนสวนแต่เพื่อนลงช่วย" },
  "AGGRO|AGGRO":     { hurt: "both",    join: true,  note: "ล้ำใส่กันทั้งคู่ เสียเลือดทั้งสองเลน ป่าเข้าตามปกติ" },
};

export function gankOutcome(foeStance, myStance) {
  return JUNGLE_TABLE[foeStance + "|" + myStance] || JUNGLE_TABLE["NEUTRAL|NEUTRAL"];
}

// ป่าไปแกงค์ = ทิ้งแคมป์ทั้งยก ไม่ได้รายได้ฐานเลย ทั้งเงินและ XP
// แลกกับยกถัดไป: ถ้ากลับไปฟาร์ม แคมป์ที่ค้างไว้เก็บได้พร้อมกัน รายได้ฟาร์มคูณ 1.5
// แกงค์ติดกันสองยกจึงไม่ได้อะไรเลย ต้องสลับฟาร์มคั่นถึงจะคุ้ม
export const JUNGLE_FARM = { gold: 5, xp: 3 };
export const JUNGLE_GANK = { gold: 0, xp: 0 };
export const JUNGLE_AFTER_GANK = 1.5;
export const jungleFarmAfterGank = () => ({
  gold: Math.round(JUNGLE_FARM.gold * JUNGLE_AFTER_GANK),
  xp: Math.round(JUNGLE_FARM.xp * JUNGLE_AFTER_GANK),
});

// บอทต้องรู้ว่าการทิ้งแคมป์มีราคา ไม่งั้นมันแกงค์เท่าเดิมทุกยกแล้วการนี้ก็ไม่เปลี่ยนอะไร
// หน่วยเดียวกับคะแนน lanePower ใน game/stance-ai.js
export const GANK_COST_BIAS = 90;
export const GANK_COST_AFTER = 60;
