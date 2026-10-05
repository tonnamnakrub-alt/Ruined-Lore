// ---------------------------------------------------------------
// Patch 0.6 — กลไกของตัวละครใหม่
//
// แยกไฟล์ด้วยเหตุผลเดียวกับ lore-p4.js คือไม่อยากให้ lore.js ยาวกว่านี้
// ต่อสายจาก fire-skill.js (ร่ายท่า) · step.js (เดินเวลา) · damage.js (แปะตรา)
//
// HELSING — แกนกลางคือตราประทับ
//   พาสซีฟ  สกิลทุกท่าแปะตรา 4 วิ · ออโต้ที่ลงเป้าที่ติดตราจุดระเบิดแล้วลบตรา
//   E       วาร์ป แตะไม่ได้ 0.25 วิ โผล่แล้วระเบิดเล็ก ติดอาวุธให้ออโต้ครั้งถัดไป
//           ออโต้ที่ติดอาวุธจะพุ่งเข้าหาเป้าไกลถึง 350 แล้วกวาดครึ่งวงรัศมี 350
//   R       พุ่งชนแชมเปี้ยนตัวแรก ถีบตัวเองถอย 250 แล้วกางกรงขังเป้าคนเดียว
//           ในกรง: ฟื้นเลือดไม่ได้เลย และดาเมจที่เป้าทำได้ลดลง
// ---------------------------------------------------------------
import { ARENA_H, ARENA_W } from "../data/constants.js";
import { applyDamage } from "./damage.js";
import { addBuff, dist, skillLabel, vfx } from "./state-util.js";
import { enemiesOf } from "./targeting.js";
import { clamp } from "./util.js";

// inCone กับ place เป็นฟังก์ชันภายในของ lore.js ไม่ได้ export ออกมา
// ทำสำเนาไว้ที่นี่ ให้สูตรตรงกันเป๊ะ ไม่ใช่เขียนใหม่ด้วยมือ
function inCone(u, e, baseAng, half, range) {
  const d = dist(u, e);
  if (d > range + e.radius) return false;
  const a = Math.atan2(e.y - u.y, e.x - u.x);
  return Math.abs(((a - baseAng + Math.PI * 3) % (Math.PI * 2)) - Math.PI) <= half;
}

const place = (u, x, y) => {
  u.x = clamp(x, u.radius, ARENA_W - u.radius);
  u.y = clamp(y, u.radius, ARENA_H - u.radius);
};

// ---------------------------------------------------------------
// ค่าที่ไต่ตามเลเวลแบบขั้น (tiers) — ใช้กับพาสซีฟที่เอกสารให้มาเป็นขั้น
// ---------------------------------------------------------------
function byTier(arr, tiers, level) {
  if (!Array.isArray(arr) || !Array.isArray(tiers)) return 0;
  let v = arr[0];
  for (let i = 0; i < tiers.length; i++) if ((level || 1) >= tiers[i]) v = arr[i];
  return v;
}

// ---------------------------------------------------------------
// HELSING พาสซีฟ — แปะตรา
// เรียกจาก damage.js ทุกครั้งที่สกิลของเฮลซิงสร้างดาเมจใส่ศัตรู
// ---------------------------------------------------------------
export function brandTarget(state, u, e) {
  const cfg = u.champ && u.champ.hunterBrand;
  if (!cfg || !e || !e.alive) return;
  e.hunterBrand = { ownerId: u.id, until: state.t + cfg.dur };
  vfx(state, { kind: "ring", x: e.x, y: e.y, r: e.radius + 18, color: "198,170,255", grow: 0.5, dur: 0.4 });
}

// ออโต้ลงเป้าที่ติดตรา — จุดระเบิดแล้วลบตรา
// เรียกจาก on-hit.js หลังออโต้ลงแล้ว
export function popBrand(state, u, e) {
  const cfg = u.champ && u.champ.hunterBrand;
  if (!cfg || !e || !e.alive) return 0;
  const b = e.hunterBrand;
  if (!b || b.ownerId !== u.id || state.t > b.until) return 0;
  e.hunterBrand = null;
  const lvl = u.level || 1;
  const base = cfg.base + cfg.perLevel * (lvl - 1);
  const miss = byTier(cfg.missingHp, cfg.tiers, lvl) * Math.max(0, (e.maxHp || 0) - (e.hp || 0));
  const dmg = base + (cfg.badRatio || 0) * (u.bonusAd || 0) + miss;
  const prev = state.dmgSrc;
  state.dmgSrc = "Hunter's Brand";
  // กันวงจร: ดาเมจก้อนนี้ไม่ใช่สกิล ต้องไม่ไปแปะตราใหม่ให้ตัวเอง
  // ไม่ใส่ธงนี้แล้วตราจะถูกแปะคืนทันทีที่ระเบิด กลายเป็นตราที่ไม่หายไปเลย
  state.popping = true;
  applyDamage(state, u, e, dmg, false);
  state.popping = false;
  state.dmgSrc = prev;
  vfx(state, { kind: "shards", x: e.x, y: e.y, r: 110, count: 12, color: "214,214,235", dur: 0.5 });
  return dmg;
}

// ---------------------------------------------------------------
// HELSING E — วาร์ปไปจุดเป้า แตะไม่ได้ช่วงสั้น แล้วติดอาวุธให้ออโต้ถัดไป
// ---------------------------------------------------------------
export function castReapShift(state, u, sk, target) {
  if (!target) return;
  const dd = dist(u, target) || 1;
  const reach = Math.min(dd, sk.blinkRange || sk.range || 350);
  const tx = u.x + ((target.x - u.x) / dd) * reach;
  const ty = u.y + ((target.y - u.y) / dd) * reach;

  // แตะไม่ได้ระหว่างสลายร่าง — ปลายทางลงแล้วหมดฤทธิ์ทันที
  const travel = sk.travel || 0.25;
  addBuff(u, { type: "untargetable", v: 1, until: state.t + travel }, state.t);
  addBuff(u, { type: "invuln", v: 1, until: state.t + travel }, state.t);
  vfx(state, { kind: "trail", x: u.x, y: u.y, color: "198,170,255", pending: u.id });

  // เข้าคิวให้ไปโผล่จริงเมื่อครบเวลา ไม่ใช่ย้ายทันที
  // ไม่งั้นช่วงแตะไม่ได้จะกลายเป็นของฟรีที่ไม่มีความเสี่ยงเลย
  L(state).shifts.push({ ownerId: u.id, at: state.t + travel, x: tx, y: ty, sk, rank: sk.rank });
}

// โผล่ขึ้นที่ปลายทาง ระเบิดเล็ก แล้วติดอาวุธให้ออโต้ครั้งถัดไป
function landShift(state, s) {
  const u = state.units.find((x) => x.id === s.ownerId);
  if (!u || !u.alive) return;
  const sk = s.sk;
  const r = Math.max(0, (s.rank || 1) - 1);
  place(u, s.x, s.y);
  u.buffs = u.buffs.filter((b) => b.type !== "untargetable" && b.type !== "invuln");

  const dmg = sk.dmg[r] + (sk.badRatio || 0) * (u.bonusAd || 0);
  const prev = state.dmgSrc;
  state.dmgSrc = skillLabel(u, sk);
  for (const e of enemiesOf(state, u)) {
    if (dist(u, e) > sk.radius + e.radius) continue;
    applyDamage(state, u, e, dmg, false);
    brandTarget(state, u, e);
  }
  state.dmgSrc = prev;
  vfx(state, { kind: "shock", x: u.x, y: u.y, r: sk.radius, color: "198,170,255", dur: 0.5 });

  // ติดอาวุธ — ออโต้ครั้งถัดไปกลายเป็นพุ่งฟันกวาด
  u.reapArmed = { until: state.t + (sk.armWindow || 6), sk, rank: s.rank };
}

// ออโต้ที่ติดอาวุธ — พุ่งเข้าหาเป้าแล้วกวาดครึ่งวงด้านหน้า
// คืน true ถ้ากินการออโต้ครั้งนี้ไปแล้ว (ผู้เรียกต้องไม่ทำดาเมจออโต้ปกติซ้ำ)
export function reapAuto(state, u, target) {
  const a = u.reapArmed;
  if (!a || state.t > a.until || !target || !target.alive) return false;
  u.reapArmed = null;
  const sk = a.sk;
  const r = Math.max(0, (a.rank || 1) - 1);

  // พุ่งเข้าไปหาเป้า ไกลสุดเท่าระยะที่กำหนด
  const dd = dist(u, target) || 1;
  const reach = Math.min(dd, sk.sweepRange || 350);
  vfx(state, { kind: "trail", x: u.x, y: u.y, color: "214,214,235", pending: u.id });
  place(u, u.x + ((target.x - u.x) / dd) * reach, u.y + ((target.y - u.y) / dd) * reach);

  const face = Math.atan2(target.y - u.y, target.x - u.x);
  const rad = sk.sweepRadius || 350;
  const dmg = sk.sweepDmg[r] + (sk.sweepBadRatio || 0) * (u.bonusAd || 0);
  const prev = state.dmgSrc;
  state.dmgSrc = skillLabel(u, sk) + " (กวาด)";
  for (const e of enemiesOf(state, u)) {
    // ครึ่งวงกลม 180 องศา = half เท่ากับ PI/2 ทั้งสองข้างของทิศที่หัน
    if (!inCone(u, e, face, Math.PI / 2, rad)) continue;
    applyDamage(state, u, e, dmg, false);
    brandTarget(state, u, e);
  }
  state.dmgSrc = prev;
  vfx(state, { kind: "cone", x: u.x, y: u.y, r: rad, ang: face, half: Math.PI / 2,
    color: "214,214,235", dur: 0.4 });
  vfx(state, { kind: "slashes", x: u.x, y: u.y, r: rad, ang: face, half: Math.PI / 2,
    count: 4, color: "214,214,235", dur: 0.4 });
  return true;
}

// ---------------------------------------------------------------
// HELSING R — พุ่งชนแชมเปี้ยนตัวแรก ถีบตัวเองถอย แล้วกางกรงขังเป้าคนเดียว
// ---------------------------------------------------------------
export function castIronMaiden(state, u, sk, target) {
  if (!target) return;
  const ang = Math.atan2(target.y - u.y, target.x - u.x);
  L(state).maidenDashes.push({
    ownerId: u.id, sk, rank: sk.rank,
    nx: Math.cos(ang), ny: Math.sin(ang),
    left: sk.dashRange || 500, hit: false,
  });
}

function tickMaidenDash(state, d, dt) {
  const u = state.units.find((x) => x.id === d.ownerId);
  if (!u || !u.alive) return false;
  const sk = d.sk;
  const r = Math.max(0, (d.rank || 1) - 1);
  const stepLen = Math.min(d.left, (sk.dashSpeed || 450) * dt);
  place(u, u.x + d.nx * stepLen, u.y + d.ny * stepLen);
  d.left -= stepLen;

  // หาแชมเปี้ยนศัตรูตัวแรกที่ปะทะ
  for (const e of enemiesOf(state, u)) {
    if (dist(u, e) > u.radius + e.radius + 10) continue;
    const dmg = sk.dmg[r] + (sk.badRatio || 0) * (u.bonusAd || 0);
    const prev = state.dmgSrc;
    state.dmgSrc = skillLabel(u, sk);
    applyDamage(state, u, e, dmg, false);
    state.dmgSrc = prev;
    brandTarget(state, u, e);

    // ถีบตัวเองดีดถอยหลังออกมา ตรงข้ามกับทิศที่พุ่งเข้า
    place(u, u.x - d.nx * (sk.rebound || 250), u.y - d.ny * (sk.rebound || 250));

    // กางกรงรอบตัวเป้า ขังเฉพาะตัวนี้ คนอื่นเดินผ่านได้
    L(state).maidens.push({
      ownerId: u.id, targetId: e.id, x: e.x, y: e.y,
      r: sk.radius || 250, bound: sk.bound || 375,
      until: state.t + (sk.durByRank ? sk.durByRank[r] : 3),
      outCut: sk.outCut ? sk.outCut[r] : 0, noHeal: !!sk.noHeal,
    });
    vfx(state, { kind: "ring", x: e.x, y: e.y, r: sk.radius || 250, color: "255,120,120", grow: 0.6, dur: 0.9 });
    return false;
  }
  return d.left > 0;
}

// ---------------------------------------------------------------
// เดินเวลาของทั้งหมด
// ---------------------------------------------------------------
export function tickP6(state, dt) {
  const lore = L(state);

  // วาร์ปของ E ที่ถึงเวลาโผล่
  lore.shifts = lore.shifts.filter((s) => {
    if (state.t < s.at) return true;
    landShift(state, s);
    return false;
  });

  // การพุ่งของ R
  lore.maidenDashes = lore.maidenDashes.filter((d) => tickMaidenDash(state, d, dt));

  // กรงขังเดี่ยว — ดึงเป้ากลับเข้าขอบ และติดสถานะที่ทำให้มันเสียเปรียบในวง
  lore.maidens = lore.maidens.filter((m) => {
    const e = state.units.find((x) => x.id === m.targetId);
    if (!e || !e.alive || state.t > m.until) {
      if (e) { e.noHeal = false; e.outCut = 0; }
      return false;
    }
    // ขอบเขตเฉพาะตัวเป้า — ดึงกลับเข้าขอบไม่ว่าจะเดิน พุ่ง หรือวาร์ป
    const dx = e.x - m.x, dy = e.y - m.y;
    const dd = Math.hypot(dx, dy) || 1;
    if (dd > m.bound - e.radius) {
      const lim = m.bound - e.radius;
      place(e, m.x + (dx / dd) * lim, m.y + (dy / dd) * lim);
    }
    // ตัดฮีลหมดและลดดาเมจที่เป้าทำได้ ตลอดเวลาที่อยู่ในวง
    e.noHeal = !!m.noHeal;
    e.outCut = m.outCut || 0;
    vfx(state, { kind: "ring", x: m.x, y: m.y, r: m.r, color: "255,120,120", dur: 0.1 });
    return true;
  });
}

// ---------------------------------------------------------------
// ร่ายท่า — เรียกต่อจาก lore-p4 ถ้าไม่มีใครรับ
// ---------------------------------------------------------------
export function fireP6Skill(state, u, sk, target) {
  switch (sk.type) {
    case "reapShift": castReapShift(state, u, sk, target); return true;
    case "ironMaiden": castIronMaiden(state, u, sk, target); return true;
    default: return false;
  }
}

// ---------------------------------------------------------------
// ที่เก็บสถานะของแพตช์นี้ — สร้างเมื่อใช้ครั้งแรก
// เก็บใน state.lore เหมือนของเดิม เพื่อให้เซฟ/โหลดและการรีเพลย์ทำงานเหมือนกัน
// ---------------------------------------------------------------
function L(state) {
  if (!state.lore) state.lore = {};
  const l = state.lore;
  if (!l.shifts) l.shifts = [];
  if (!l.maidenDashes) l.maidenDashes = [];
  if (!l.maidens) l.maidens = [];
  return l;
}
