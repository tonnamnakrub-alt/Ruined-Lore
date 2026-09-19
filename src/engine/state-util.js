import { tr } from "../i18n.js";
import { ARENA_H, ARENA_W } from "../data/constants.js";



// ---------------- helpers ----------------
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);


export function aliveOf(state, team) {
  return state.units.filter((u) => u.team === team && u.alive);
}


export function supportAlive(state, team) {
  const s = state.units.find((u) => u.team === team && u.lane === "SUPPORT");
  return !!(s && s.alive);
}


export function pushLog(state, text) {
  state.log.push({ t: state.t, text });
  if (state.log.length > 80) state.log.shift();
}


export function centroid(state, team) {
  const list = aliveOf(state, team);
  if (!list.length) return { x: ARENA_W / 2, y: ARENA_H / 2 };
  let x = 0, y = 0;
  for (const u of list) { x += u.x; y += u.y; }
  return { x: x / list.length, y: y / list.length };
}


// ---------------- พลังของ Luch (Morning Star) ----------------
// เก็บเป็นตัวเลขเดียว 0-100 แล้วแปลงเป็น light/shadow ให้โค้ดเดิมอ่านต่อได้
//   light  = จำนวนครั้งที่ร่ายร่างแสงได้ (frag / 20)
//   shadow = 1 เมื่อพลังเต็ม 100
export function syncFrag(u) {
  const f = u.champ.fragments;
  if (!f) return;
  u.frag = Math.max(0, Math.min(f.max, u.frag || 0));
  u.shadow = u.frag >= f.shadowCost ? 1 : 0;
  u.light = Math.floor(u.frag / f.lightCost);
}


// ดาเมจที่ยูนิตนี้กินไปใน n วินาทีที่ผ่านมา — ใช้กับ R ของ Luch ที่สะท้อนของเก่าคืน
// บันทึกถูกเขียนใน applyDamage และถูกตัดทิ้งของเก่าทุกเฟรมใน step.js
export function recentTaken(u, now, window) {
  let sum = 0;
  for (const e of u.tookLog || []) if (now - e[0] <= window) sum += e[1];
  return sum;
}


// ความเร็วเดิน "ส่วนที่เกินค่าฐานของตัวเอง" — รวมรองเท้า ไอเทม และ MS ที่ได้จาก AP
// ใช้กับ Ariel ที่ทุกสกิลเร่งตามความเร็ว (ไม่ใช้ msEff เพราะสโลว์ไม่ควรไปลดคุณภาพสกิล)
export function bonusMs(u) {
  const base = (u.champ && u.champ.ms) || 0;
  return Math.max(0, (u.moveSpeed || 0) - base) + (u.apMs || 0);
}


export function addFrag(u, amount) {
  if (!u.champ.fragments) return;
  u.frag = (u.frag || 0) + amount;
  syncFrag(u);
}


// ร่ายสกิลแล้วหักพลัง — ร่างเงากินทั้งหลอด ร่างแสงกินก้อนเดียว
export function spendFrag(u, isShadow) {
  const f = u.champ.fragments;
  if (!f) return;
  u.frag = (u.frag || 0) - (isShadow ? f.shadowCost : f.lightCost);
  syncFrag(u);
}


// ---------------- buffs, shields, damage ----------------
export const HARD_CC = ["stun", "root", "fear", "slow", "taunt", "charm"];

export function addBuff(u, b, now) {
  if (hasBuff(u, "unstoppable") && HARD_CC.includes(b.type)) return;
  const ten = 1 - (1 - (u.tenacity || 0)) * (1 - buffSum(u, "tenacity"));
  if (ten > 0 && HARD_CC.includes(b.type) && now != null && b.until > now) {
    b.until = now + (b.until - now) * (1 - Math.min(0.8, ten));
  }
  u.buffs.push(b);
}


// บัฟที่ "ต่ออายุ" ไม่ใช่ "ซ้อนกัน" — ออร่าที่เติมใหม่ทุกเฟรม หรือบัฟที่โปรคซ้ำได้เร็ว
// ต้องใช้ตัวนี้ ไม่งั้น buffSum จะบวกก้อนที่ยังไม่หมดอายุรวมกันจนค่าบานปลาย
export function addBuffUnique(u, tag, b, now) {
  if (u.buffs.length) u.buffs = u.buffs.filter((x) => x.tag !== tag);
  b.tag = tag;
  addBuff(u, b, now);
}


export function buffSum(u, type, now) {
  let v = 0;
  for (const b of u.buffs) {
    if (b.type !== type) continue;
    // บัฟที่ค่อยๆ จางหาย (decayFrom = เวลาที่เริ่มจาง) ต้องส่ง now มาด้วย
    if (b.decayFrom != null && now != null && b.until > b.decayFrom) {
      const left = Math.max(0, Math.min(1, (b.until - now) / (b.until - b.decayFrom)));
      v += b.v * left;
    } else {
      v += b.v;
    }
  }
  return v;
}


export function hasBuff(u, type) {
  return u.buffs.some((b) => b.type === type);
}


export function vfx(state, o) { state.fx.push({ t: state.t, ...o }); }


// ---------------------------------------------------------------
// การให้เครดิตดาเมจ/ฮีล/โล่ ว่ามาจากอะไร
// state.dmgSrc = ป้ายชื่อแหล่งที่มาตอนนี้ (สกิล / ออโต้ / ไอเทม)
// state.srcUnit = ตัวที่เป็นคนทำ (คนร่ายสกิล) ใช้ให้เครดิตฮีล/โล่
// ---------------------------------------------------------------
let CUR_STATE = null;

export function setCurState(s) { CUR_STATE = s; }

export function curState() { return CUR_STATE; }

export function bump(bag, key, amount) {
  if (!bag || !key || !amount) return;
  bag[key] = (bag[key] || 0) + amount;
}

export function skillLabel(u, sk) {
  if (!sk) return tr("สกิล");
  const th = sk.type === "dual"
    ? (u && u.shadow > 0 ? sk.shadow.th : sk.light.th)
    : sk.th;
  return (sk.key ? sk.key + " " : "") + (th || tr("สกิล"));
}

// ใช้ครอบช่วงที่กำลังยิงอะไรออกไป เพื่อให้ดาเมจที่เกิดตามหลังรู้ว่ามาจากไหน
export function withSrc(state, label, unit, fn) {
  const ps = state.dmgSrc, pu = state.srcUnit;
  state.dmgSrc = label;
  if (unit !== undefined) state.srcUnit = unit;
  try { return fn(); } finally { state.dmgSrc = ps; state.srcUnit = pu; }
}
