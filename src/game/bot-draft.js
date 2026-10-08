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

// ---------------------------------------------------------------
// สัญญาณที่ใช้แก้ทาง — อ่านจากข้อมูลตัวละครล้วนๆ ไม่มีตารางคู่แข่งที่ต้องมาไล่ดูแลเอง
// ตารางแบบนั้นจะเก่าทันทีที่เพิ่มตัวละครใหม่ แล้วไม่มีใครรู้ว่ามันเก่าไปแล้ว
// ---------------------------------------------------------------
const skillsOf = (c) => c.skills || [];
// สายเวทหรือสายกาย — ดูจากจำนวนท่าที่ประกาศว่าเป็นดาเมจเวท
export const isMagic = (c) => skillsOf(c).filter((s) => s.magic).length >= 2;
// มีท่าตัดฮีล — ใช้แก้ทีมที่ฟื้นเลือดเก่ง
const hasAntiheal = (c) => skillsOf(c).some((s) => s.antiheal);
// มีท่าตรึงพื้นหรือตรึงเท้า — ใช้แก้ทีมที่พุ่งเข้ามาเยอะ
const hasLockdown = (c) => skillsOf(c).some((s) => s.grounded || s.rootByRank || s.root);
// มีท่าเคลื่อนที่ — ใช้นับว่าทีมอีกฝั่งพุ่งเข้าหาเก่งแค่ไหน
const hasDash = (c) => skillsOf(c).some((s) => s.dashRange || s.blinkRange || s.lungeRange);
// ความถึกต่อดาเมจแต่ละชนิด ใช้เทียบกันเองในกองที่เหลือ
const armorAt18 = (c) => c.armor + c.armorG * 17;
const mrAt18 = (c) => c.mr + c.mrG * 17;


// ---------------------------------------------------------------
// รสนิยมประจำดราฟต์ — แฮชจากรหัสตัวละครกับเลขประจำดราฟต์
// เกมเดียวกันได้ค่าเดิมเสมอ เกมคนละเกมได้คนละค่า
// ไม่ได้ดึงจาก rand() เพราะต้องคงที่ตลอดดราฟต์ ไม่ใช่เปลี่ยนทุกครั้งที่เรียก
// ---------------------------------------------------------------
function taste(id, nonce) {
  let h = 2166136261 ^ (nonce >>> 0);
  const str = String(id);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) / 4294967296) - 0.5;      // -0.5 ถึง 0.5
}

// อ่านทีมของคู่ต่อสู้ออกมาเป็นตัวเลขที่ใช้ตัดสินใจได้
export function readFoeTeam(ids) {
  const list = (ids || []).map((id) => CHAMPIONS[id]).filter(Boolean);
  const n = list.length || 1;
  return {
    n: list.length,
    magicShare: list.filter(isMagic).length / n,     // สัดส่วนสายเวท
    meleeShare: list.filter((c) => c.melee).length / n,
    sustain: list.filter(SUSTAIN).length,
    dashes: list.filter(hasDash).length,
  };
}


function poolFor(lane) {
  return Object.values(CHAMPIONS).filter((c) => playsLane(c, lane));
}


// ตัวที่มีเลนนั้นเป็น "เลนหลัก" — ใช้ดูว่าเลนหนึ่งยังเหลือคนเล่นจริงกี่ตัว
const mainPoolFor = (lane) => Object.values(CHAMPIONS).filter((c) => c.lane === lane);


// ---------------------------------------------------------------
// ความเหมาะของตัวหนึ่งกับเลนหนึ่ง — ยิ่งติดลบยิ่งไม่ควรลง
//
// ของเดิมหักการลงผิดเลนเป็นค่าคงที่ -34 เท่ากันหมดทุกกรณี
// พอทุกชุดที่เป็นไปได้มีคนผิดเลนเหมือนกัน (เช่นตอน ADC โดนแบนเกลี้ยง)
// การหักเท่ากันก็ไม่ได้ช่วยเลือก ตัวตัดสินเลยไปตกที่เรื่องอื่น
// แล้วป่าประชิดอย่าง Wolf ได้ไปยืน ADC ซึ่งเล่นไม่ได้จริง
// ---------------------------------------------------------------
export function laneFit(c, lane) {
  if (!c) return -80;
  if (c.lane === lane) return 0;
  if ((c.alsoLanes || []).includes(lane)) return -8;
  let p = -40;
  // ADC คือตัวที่ยืนยิงออโต้ต่อเนื่อง ตัวประชิดลงไม่ได้จริงๆ ไม่ใช่แค่ "ไม่ถนัด"
  if (lane === "ADC" && c.melee) p -= 38;
  if (lane === "ADC" && !/Marksman/.test(c.role)) p -= 8;
  // ซัพที่ไม่ใช่สายช่วยเพื่อน ก็ยืนได้แต่ไม่ได้เรื่อง
  if (lane === "SUPPORT" && !/Enchanter|Warden|Vanguard/.test(c.role)) p -= 6;
  return p;
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
  for (const p of picks) s += laneFit(CHAMPIONS[p.champId], p.lane);
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


// ---------------------------------------------------------------
// Patch 0.3 — โหมดดราฟต์ (Draft Pick / Tournament)
//
// ต่างจาก draftFoe ตรงที่ตรงนี้เลือก "ทีละตัว" สลับกับผู้เล่น
// และต้องเลี่ยงตัวที่ถูกแบนหรือถูกหยิบไปแล้วทั้งสองฝั่ง
// ---------------------------------------------------------------

// ตัวที่ยังหยิบได้
export function openPool(taken) {
  const used = new Set(taken);
  return Object.values(CHAMPIONS).filter((c) => !used.has(c.id));
}


// บอทแบน — เล็งตัวที่ "แรงและยืดหยุ่น" ก่อน (ค่า AI value สูง ลงได้หลายเลน)
// เลนหนึ่งต้องเหลือตัวหลักอย่างน้อยเท่านี้เสมอ ไม่งั้นแบนจนไม่มีใครลงเลนนั้นได้
// ADC มีตัวหลักแค่ 4 ตัว และทั้งสี่มี value สูงสุดในเกม ถ้าไม่กันไว้จะโดนกวาดครบ
export const MIN_LANE_POOL = 2;

// แบนตัวนี้แล้วจะทำให้เลนไหนเหลือตัวหลักน้อยกว่าที่กำหนดไหม
function banStarvesLane(c, taken, minPool) {
  const gone = new Set(taken);
  for (const lane of [c.lane]) {
    const left = mainPoolFor(lane).filter((x) => x.id !== c.id && !gone.has(x.id)).length;
    if (left < minPool) return true;
  }
  return false;
}

export function botBan(rand, taken, minPool = MIN_LANE_POOL, nonce = 0) {
  const pool = openPool(taken);
  if (!pool.length) return null;
  // ตัวที่แบนแล้วไม่ทำให้เลนไหนขาดคน · ถ้ากันหมดจนไม่เหลือตัวเลือก ก็ถอยไปใช้ทั้งกอง
  const safe = pool.filter((c) => !banStarvesLane(c, taken, minPool));
  const from = safe.length ? safe : pool;
  let best = from[0], bestS = -Infinity;
  for (const c of from) {
    // แบนตัวที่แรงที่สุดและยืดหยุ่นที่สุดก่อน — ตัวที่ลงได้หลายเลนแบนแล้วคุ้มกว่า
    const s = (c.value - 1) * 70 + (c.alsoLanes || []).length * 6
      + taste(c.id, nonce) * 30 + rand() * 6;
    if (s > bestS) { bestS = s; best = c; }
  }
  return best.id;
}


// บอทหยิบหนึ่งตัว — เลือกตัวที่ทำให้ทีมของมันสมบูรณ์ที่สุดเท่าที่เหลืออยู่
//   mine = รหัสตัวที่บอทหยิบไปแล้ว
// theirs = รหัสตัวที่คู่ต่อสู้เลือกไปแล้ว (ใช้แก้ทาง) · skill = ฝีมือบอท 0-1
export function botPickOne(rand, taken, mine, variety = 0.25, theirs = [], skill = 1, nonce = 0) {
  const pool = openPool(taken);
  if (!pool.length) return null;
  const have = mine.map((id) => CHAMPIONS[id]).filter(Boolean);
  const foe = readFoeTeam(theirs);
  // บอทฝีมือต่ำแก้ทางไม่เป็น และสุ่มมากกว่า
  const counterW = Math.max(0, Math.min(1, skill));
  // ทีมตัวเองเป็นสายเดียวล้วนไหม — ทีมสายเดียวโดนออกของแก้ทางง่าย
  const myMagic = have.filter(isMagic).length;
  const myPhys = have.length - myMagic;
  const needFront = !have.some((c) => FRONT.test(c.role));
  const needSustain = !have.some(SUSTAIN);
  const needRanged = !have.some(RANGED);
  // เลนที่ทีมยังไม่มีคนลงได้เลย
  const covered = new Set();
  for (const c of have) for (const l of [c.lane, ...(c.alsoLanes || [])]) covered.add(l);
  // ค่ากลางของกองที่เหลือ ใช้เทียบว่าตัวนี้ถึกกว่าหรือบางกว่าเพื่อนในกอง
  const avg = (f) => pool.reduce((a, c) => a + f(c), 0) / pool.length;
  const avgArmor = avg(armorAt18);
  const avgMr = avg(mrAt18);

  let best = pool[0], bestS = -Infinity;
  for (const c of pool) {
    // ความแรงของตัวละครต้องมีน้ำหนักจริง ไม่ใช่โดนค่าสุ่มกลบเหมือนเดิม
    let s = (c.value - 1) * 60;

    // ---- ทีมของตัวเองต้องครบหน้าที่ก่อน ----
    // ก้อนพวกนี้เคยหนักจนชี้ขาดทั้งดราฟต์ ตัวที่เข้าเงื่อนไขจึงถูกเลือกทุกเกม
    // ลดลงพอให้ยังจัดทีมเป็น แต่ไม่ล็อกตัวเลือกไว้ชุดเดียว
    if (needFront && FRONT.test(c.role)) s += 20;
    if (needSustain && SUSTAIN(c)) s += 16;
    if (needRanged && RANGED(c)) s += 15;
    for (const l of [c.lane, ...(c.alsoLanes || [])]) if (!covered.has(l)) { s += 14; break; }
    if (have.some((h) => h.role === c.role)) s -= 12;
    // รสนิยมประจำเกม — เกมนี้บอทชอบใครเป็นพิเศษ เกมหน้าชอบคนอื่น
    // บอทระดับง่ายมีรสนิยมแรงกว่า (เลือกตามใจ) ระดับยากเอนไปทางความแรงมากกว่า
    // แต่ยังมีรสนิยมอยู่บ้าง ไม่งั้นบอทเก่งจะกลับไปเลือกชุดเดิมทุกเกมเหมือนเดิม
    s += taste(c.id, nonce) * (26 + 24 * variety);

    // ---- แก้ทางคู่ต่อสู้ ----
    if (foe.n) {
      // เขาสายเวทเยอะ เราอยากได้ตัวที่ต้านเวทสูงกว่าค่ากลาง · เขาสายกายเยอะก็เอาเกราะ
      const magicLean = foe.magicShare - 0.5;
      s += counterW * magicLean * 2 * ((mrAt18(c) - avgMr) / Math.max(1, avgMr)) * 45;
      s += counterW * -magicLean * 2 * ((armorAt18(c) - avgArmor) / Math.max(1, avgArmor)) * 45;
      // เขาประชิดเยอะ ตัวระยะไกลได้เปรียบในเลน
      if (foe.meleeShare > 0.6 && RANGED(c)) s += counterW * 16;
      // เขาฟื้นเลือดเก่ง ตัดฮีลคุ้มมาก
      if (foe.sustain >= 2 && hasAntiheal(c)) s += counterW * 30;
      // เขาพุ่งเข้าหาเยอะ ตัวที่ตรึงได้ช่วยกันแนวหลัง
      if (foe.dashes >= 2 && hasLockdown(c)) s += counterW * 18;
    }

    // ---- ทีมสายเดียวล้วนโดนออกของแก้ทางง่าย ----
    if (have.length >= 2) {
      const cm = isMagic(c);
      if (cm && myMagic >= 3) s -= counterW * 20;
      if (!cm && myPhys >= 3) s -= counterW * 20;
    }

    // ค่าสุ่มเหลือไว้ให้ดราฟต์ไม่ซ้ำกันทุกแมตช์ แต่ไม่มากพอจะกลบการตัดสินใจ
    s += (rand() - 0.5) * 26 * variety;
    if (s > bestS) { bestS = s; best = c; }
  }
  return best.id;
}


// เอา 5 ตัวที่ดราฟต์มาแล้วไปลงเลน — เลือกชุดที่ลงตรงเลนมากที่สุด
export function assignLanes(ids) {
  const list = ids.filter(Boolean);
  if (list.length !== LANES.length) {
    return LANES.map((lane, i) => ({ lane, champId: list[i] || poolFor(lane)[0].id }));
  }
  let best = null, bestS = -Infinity;
  const perm = (arr, k, acc) => {
    if (k === arr.length) {
      const picks = LANES.map((lane, i) => ({ lane, champId: acc[i] }));
      const s = compScore(picks);
      if (s > bestS) { bestS = s; best = picks; }
      return;
    }
    for (let i = k; i < arr.length; i++) {
      const c = arr.slice();
      [c[k], c[i]] = [c[i], c[k]];
      perm(c, k + 1, c);
    }
  };
  perm(list, 0, list);
  return best || LANES.map((lane, i) => ({ lane, champId: list[i] }));
}
