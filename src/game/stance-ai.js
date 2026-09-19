// ---------------------------------------------------------------
// บอทสั่งนิสัยเลนของตัวเอง และตัดสินใจว่าป่าจะไปแกงค์ตรงไหน
//
// ยิ่ง skill สูง บอทยิ่งคิดจาก "ของจริง" มากขึ้น — เทียบมูลค่าของในเลน
// เทียบเลเวล และจำได้ว่ายกที่แล้วเราสั่งอะไรไว้
// skill ต่ำจะออกมาสุ่มมั่วๆ ตามอารมณ์
// ---------------------------------------------------------------

import { LANE_MEMBERS, STANCE_LANES, crewAllowed } from "../data/behaviour.js";

// กำลังรบคร่าวๆ ของเลนหนึ่ง — เลเวลกับมูลค่าของที่ถืออยู่
function lanePower(roster, lane) {
  let p = 0;
  for (const m of LANE_MEMBERS[lane]) {
    const c = roster.find((x) => x.lane === m);
    if (!c) continue;
    p += c.level * 40 + c.items.reduce((a, i) => a + i.cost, 0);
  }
  return p;
}

const pick = (rand, list) => list[Math.floor(rand() * list.length)];

// ---------------------------------------------------------------
// เลือกนิสัยให้ทั้งสามเลน
//   me / foe  = รายชื่อนักแข่งของบอท และของผู้เล่น
//   lastMine  = นิสัยที่บอทสั่งไว้ยกที่แล้ว (ใช้ดูว่าเปิดทางแกงค์ไว้ไหม)
// ---------------------------------------------------------------
export function botStances(rand, me, foe, skill, round) {
  const out = {};
  for (const L of STANCE_LANES) {
    if (rand() > skill) { out[L] = pick(rand, ["SAFE", "NEUTRAL", "AGGRO"]); continue; }
    const mine = lanePower(me, L);
    const theirs = lanePower(foe, L);
    const edge = (mine - theirs) / Math.max(1, theirs);
    // นำอยู่ชัดเจนก็กดดัน ตามอยู่มากก็ถอยมาเก็บของ
    if (edge > 0.15) out[L] = rand() < 0.75 ? "AGGRO" : "NEUTRAL";
    else if (edge < -0.15) out[L] = rand() < 0.70 ? "SAFE" : "NEUTRAL";
    else out[L] = rand() < 0.55 ? "NEUTRAL" : (rand() < 0.5 ? "AGGRO" : "SAFE");
  }
  return out;
}

// ---------------------------------------------------------------
// ป่าจะฟาร์มต่อ หรือลงไปเลนไหน
//   แกงค์ได้เฉพาะเลนที่ยกที่แล้วสั่ง AGGRO ไว้เท่านั้น
// ---------------------------------------------------------------
export function botJungle(rand, me, foe, stances, lastStances, skill, round) {
  // สเปคใหม่เหมือนฝั่งผู้เล่น — ดูนิสัยของ "ยกนี้" ไม่ใช่ยกที่แล้ว
  void lastStances;
  const open = STANCE_LANES.filter((L) => stances[L] === "AGGRO" || stances[L] === "NEUTRAL");
  if (!open.length) return { lane: null, crew: [] };
  // ฝีมือต่ำ = ไม่ค่อยคิด ฟาร์มไปเรื่อยหรือลงมั่ว
  if (rand() > skill * 0.9 + 0.05) return rand() < 0.5 ? { lane: null, crew: [] } : { lane: pick(rand, open), crew: [] };

  // เลือกเลนที่คุ้มที่สุด — ยิ่งเราอ่อนกว่าในเลนนั้นยิ่งควรลงไปช่วย
  let best = null, bestS = -1e9;
  for (const L of open) {
    const mine = lanePower(me, L);
    const theirs = lanePower(foe, L);
    let s = theirs - mine;                       // ตามอยู่เท่าไหร่
    if (stances[L] === "AGGRO") s += 120;        // เลนตัวเองล้ำอยู่ ป่าลงไปต่อยอดได้
    if (stances[L] === "SAFE") s -= 90;          // เลนถอย ป่าลงไปก็สู้เดี่ยว
    s += (rand() - 0.5) * 160 * (1 - skill);
    if (s > bestS) { bestS = s; best = L; }
  }
  if (bestS < -60) return { lane: null, crew: [] };

  // ยกท้ายๆ พาเพื่อนไปด้วยได้ — เอาเฉพาะเลนที่ยกนี้ไม่มีไฟต์ของตัวเอง
  const max = crewAllowed(round);
  const crew = [];
  if (max > 0) {
    const free = STANCE_LANES.filter((L) => L !== best && stances[L] === "SAFE");
    for (const L of free) { if (crew.length < max && rand() < skill) crew.push(L); }
  }
  return { lane: best, crew };
}
