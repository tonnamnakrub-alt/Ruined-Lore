import { CHAMPIONS, playsLane } from "../data/champions.js";
import { LANES, STAT_KEYS } from "../data/constants.js";
import { POINTS, STAT_CAP, emptyStats } from "./roster.js";


// ---------------------------------------------------------------
// บอทเลือกตัวเอง — เดิมฝ่ายตรงข้ามใช้ทีมตายตัวชุดเดียวทุกแมตช์
// ตอนนี้ดราฟต์ใหม่ทุกแมตช์ โดยยังคุมให้ทีมมีหน้าตาที่เล่นได้จริง:
//   ต้องมีแนวหน้าอย่างน้อย 1 · ตัวฟื้นฟู/ซัพอย่างน้อย 1 · ตัวยิงระยะไกลอย่างน้อย 1
// ---------------------------------------------------------------

const FRONT = /Vanguard|Juggernaut|Bruiser|Diver|Skirmisher/;
const SUSTAIN = (c) => !!(c.kindness || c.isolde || c.vamp || c.omnivamp || /Enchanter/.test(c.role));
const RANGED = (c) => !c.melee;


function poolFor(lane) {
  return Object.values(CHAMPIONS).filter((c) => playsLane(c, lane));
}


// น้ำหนักที่ตัวหนึ่งจะถูกหยิบไปลงเลนนี้
//   เลนหลักของมันหนักสุด · เลนรองรองลงมา · เลนที่ไม่ใช่ของมันเลยยังมีโอกาสอยู่นิดเดียว
// ที่ยอมให้ลงผิดเลนได้เพราะในเกมจริงก็มีคนอีโก้แย่งเลนกัน ถ้าตรงเป๊ะทุกตาจะดูปลอม
function laneWeight(c, lane, offRole) {
  if (c.lane === lane) return 60;
  if ((c.alsoLanes || []).includes(lane)) return 30;
  return 100 * offRole / 3;
}

function pickWeighted(rand, lane, offRole) {
  const all = Object.values(CHAMPIONS);
  const w = all.map((c) => laneWeight(c, lane, offRole));
  let total = 0;
  for (const x of w) total += x;
  let r = rand() * total;
  for (let i = 0; i < all.length; i++) { r -= w[i]; if (r <= 0) return all[i]; }
  return all[all.length - 1];
}


// ให้คะแนนทีมที่ดราฟต์ได้ — ยิ่งครบหน้าที่ยิ่งสูง
function compScore(picks) {
  const chs = picks.map((p) => CHAMPIONS[p.champId]);
  let s = 0;
  // ตัวที่ลงเลนซึ่งมันเล่นไม่ได้เลย — หักหนัก
  // เดิมการสุ่มเปิดช่องให้ลงผิดเลนได้ แต่ตอนคัดเลือกไม่ได้หักคะแนนเลย
  // ผลคือ 36% ของดราฟต์มีอย่างน้อยหนึ่งตัวยืนผิดเลน ซึ่งผู้เล่นมองว่าบอทโง่
  // หักตรงนี้แล้วชุดที่ลงเลนตรงจะชนะการคัดเลือกเกือบทุกครั้ง แต่ยังเหลือโอกาสแย่งเลนอยู่บ้าง
  for (const p of picks) if (!playsLane(CHAMPIONS[p.champId], p.lane)) s -= 34;
  if (chs.some((c) => FRONT.test(c.role))) s += 30;
  if (chs.some(SUSTAIN)) s += 25;
  if (chs.some(RANGED)) s += 25;
  // ไม่อยากได้ทีมประชิดล้วนหรือระยะไกลล้วน
  const melee = chs.filter((c) => c.melee).length;
  s += 20 - Math.abs(melee - 2.5) * 8;
  // ชอบทีมที่มีบทบาทหลากหลาย
  s += new Set(chs.map((c) => c.role)).size * 6;
  return s;
}


// ดราฟต์ทีมให้บอท — ลองสุ่มหลายชุดแล้วเอาชุดที่หน้าตาดีที่สุด
//   variety 0..1  ยิ่งสูงยิ่งกล้าหยิบตัวแปลก (ใช้ตอนโหมดง่าย)
export function draftFoe(rand, variety = 0.25, offRole = 0.10) {
  let best = null, bestS = -1;
  const tries = 14;
  for (let t = 0; t < tries; t++) {
    const picks = LANES.map((lane) => ({ lane, champId: pickWeighted(rand, lane, offRole).id }));
    // ห้ามตัวซ้ำในทีมเดียวกัน
    const seen = new Set();
    let dup = false;
    for (const p of picks) { if (seen.has(p.champId)) { dup = true; break; } seen.add(p.champId); }
    if (dup) continue;
    const s = compScore(picks) + rand() * 40 * variety;
    if (s > bestS) { bestS = s; best = picks; }
  }
  // เผื่อสุ่มไม่ผ่านเลย (ตัวละครยังน้อย) ก็ถอยไปใช้ตัวประจำเลน
  return best || LANES.map((lane) => ({ lane, champId: poolFor(lane)[0].id }));
}


// แต้มนักแข่งของบอท — เดิมสุ่มล้วน ทำให้บางยกโง่มาก
//   floor  = แต้มขั้นต่ำที่ทุกช่องต้องมี (ยิ่งสูงยิ่งเล่นสม่ำเสมอ)
//   focus  = ทุ่มแต้มที่เหลือให้สองสามช่องที่สำคัญกับบทบาทนั้น
export function botSpread(rand, champId, floor = 4) {
  const o = emptyStats();
  let left = POINTS;
  for (const k of STAT_KEYS) { o[k] = Math.min(STAT_CAP, floor); left -= o[k]; }
  const ch = CHAMPIONS[champId];
  // ช่องที่สำคัญกับบทบาท — ยิงสกิลแม่นสำคัญกับตัวที่ต้องเล็ง ตัดสินใจสำคัญกับตัวเปิดไฟต์
  const prefer = ch && ch.melee
    ? ["decision", "teamwork", "mechanics"]
    : ["mechanics", "gameSense", "knowledge"];
  let guard = 0;
  while (left > 0 && guard++ < 400) {
    const useFocus = rand() < 0.7;
    const k = useFocus
      ? prefer[Math.floor(rand() * prefer.length)]
      : STAT_KEYS[Math.floor(rand() * STAT_KEYS.length)];
    if (o[k] < STAT_CAP) { o[k]++; left--; }
  }
  return o;
}
