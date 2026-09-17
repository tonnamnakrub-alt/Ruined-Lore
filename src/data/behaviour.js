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
  AGGRO:   { id: "AGGRO",   th: "รุกล้ำ", gold: 8, xp: 3, desc: "กดดันหนัก ได้เยอะแต่เสี่ยง" },
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

// เลือดที่เสียไปก่อนเริ่มไฟต์ ตอนโดนจับได้ว่าล้ำ/โดนดัก
export const GANK_HURT = 0.20;

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

// พาสซีฟป่า — ไปแกงค์หรือโดนลากเข้าไฟต์ก็ยังได้รายได้ฐานเท่าเดิม
// เป็นข้อได้เปรียบเฉพาะตัวของเลนป่า เลนอื่นที่แตกไฟต์จะไม่ได้รายได้ฐาน
export const JUNGLE_FARM = { gold: 5, xp: 3 };
export const JUNGLE_GANK = { gold: 5, xp: 3 };
