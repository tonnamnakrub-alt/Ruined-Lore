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
//
// WOLF — แกนกลางคือยิ่งเป้าเลือดน้อยยิ่งแรง
//   พาสซีฟ  ตีเป้าที่เลือดต่ำกว่าครึ่ง ได้ดาเมจ ความเร็วโจมตี และดูดเลือด
//   W       ล่องหน แล้วออโต้ถัดไปกลายเป็นกระโจนลงพื้นที่ (มีวงเตือน หลบได้)
//           พาสซีฟของ W ให้ความเร็วเดิน คูณสามถ้าวิ่งเข้าหาเป้าที่เลือดต่ำกว่าครึ่ง
//   E       ชาร์จ 0.6 วิแล้วคำรามรอบตัว ติดหวาดกลัว และลดดาเมจที่ศัตรูทำได้
//   R       กินซากศพที่เกิดจากคนตายใกล้ตัว ฟื้นเลือดแล้วรีเซ็ตคูลดาวน์ Q/W/E
//
// ANANSI — ใช้กำแพงเป็นทางลัด แล้วเล่นเกมดักทาง
//   พาสซีฟ  เดินทะลุกำแพงทุกชนิด (อิฐของ H.S.B · กรงของ PINO E · กรงของ HELSING R)
//           อยู่ในเนื้อกำแพงได้ 3 วิ โดนตีแล้วเวลาลดครึ่ง · ออโต้พ่วงดาเมจเวท
//   W       ใยสองเส้น เส้นแรกสโลว์ เส้นที่สองลงเป้าเดิม = ตรึง · ลงเป้าใหม่ = ดึงเข้าหากัน
//   E       พ่นกรวยแล้วทิ้งผืนใย สโลว์หนักและตรึงพื้น (ใช้ท่าเคลื่อนที่ไม่ได้)
//   R       คลื่นช้ากว้าง ไม่ทำดาเมจ ศัตรูที่โดนหันไปตีพวกเดียวกัน
//
// KOSCHEI — ยืนกลางวงแล้วไม่ตาย ดาเมจสเกลตามความถึกของตัวเอง
//   พาสซีฟ  มีแชมเปี้ยนตายในระยะ 1,000 ฟื้นเลือดทันที ไม่เลือกข้าง
//   Q       กะโหลกพุ่งเป็นเส้น หยุดที่แชมเปี้ยนตัวแรก แล้วสูบเลือดคืน
//   W       ออร่ารอบตัวเผาทุก 0.5 วิ · กดตอนโล่ E ยังอยู่ได้ความเร็วเดิน
//   E       โล่ตาม Max HP · ตราบใดที่โล่ยังอยู่ แผ่คลื่นทุก 1 วิ
//           สโลว์ + ฉีกเกราะ/กันเวทสะสม 5 ชั้น · โล่แตกแล้วคลื่นหยุดทันที
//   R       แยกร่าง — วิญญาณอมตะออกไปร่ายท่า ชุดเกราะยืนรับดาเมจแทน
//           เลือดลดจากดาเมจที่ "ชุดเกราะ" กินเท่านั้น (หลอดเดียวกัน)
// ---------------------------------------------------------------
import { ARENA_H, ARENA_W } from "../data/constants.js";
import { AUTO_DMG } from "../data/tuning.js";
import { applyDamage, grantShield, healUnit } from "./damage.js";
import { addBuff, addBuffUnique, dist, pushLog, skillLabel, vfx } from "./state-util.js";
import { tr } from "../i18n.js";
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
// ANANSI พาสซีฟ — เดินทะลุกำแพง
//
// รวมสิ่งกีดขวางทุกชนิดในเกมไว้ที่นี่ที่เดียว ถ้ามีชนิดใหม่ในอนาคต
// (ผู้ใช้บอกว่าจะมีกำแพงในแมพเพิ่ม) เพิ่มที่ฟังก์ชันนี้จุดเดียวพอ
// ---------------------------------------------------------------
export function wallsAround(state) {
  const out = [];
  const lore = state.lore || {};
  for (const w of lore.walls || []) out.push({ kind: "wall", w });
  for (const b of lore.bunkers || []) out.push({ kind: "circle", x: b.x, y: b.y, r: b.r });
  for (const c of state.cages || []) out.push({ kind: "ring", x: c.x, y: c.y, r: c.r });
  for (const m of lore.maidens || []) out.push({ kind: "ring", x: m.x, y: m.y, r: m.bound });
  return out;
}

// อยู่ในเนื้อกำแพงหรือเปล่า — ใช้ทั้งตอนนับเวลาและตอนยกเว้นการถูกผลักออก
export function insideWall(state, u) {
  for (const o of wallsAround(state)) {
    if (o.kind === "wall") {
      const w = o.w;
      const rx = u.x - w.x, ry = u.y - w.y;
      if (Math.abs(rx * w.nx + ry * w.ny) > w.half) continue;
      if (Math.abs(rx * -w.ny + ry * w.nx) <= u.radius + 26) return o;
    } else {
      const d = Math.hypot(u.x - o.x, u.y - o.y);
      // ขอบวงถือเป็น "เนื้อกำแพง" หนาเท่ารัศมีตัว
      if (Math.abs(d - o.r) <= u.radius + 26) return o;
    }
  }
  return null;
}

// เดินเวลาของการอยู่ในกำแพง — เรียกทุกทิกจาก step.js
export function spiderWalkTick(state, u, dt) {
  const cfg = u.champ && u.champ.spiderWalk;
  if (!cfg) return;
  const inside = insideWall(state, u);
  if (!inside) {
    // ออกมาแล้ว — เริ่มนับคูลดาวน์การเข้าใหม่
    if (u.wallTime > 0) {
      u.wallCd = state.t + byTier(cfg.cd, cfg.tiers, u.level || 1);
      u.wallTime = 0;
    }
    u.phasing = false;
    return;
  }
  // อยู่ในกำแพง — ทะลุได้ถ้ายังไม่หมดเวลาและไม่ติดคูลดาวน์
  if (u.wallTime == null) u.wallTime = 0;
  if (u.wallTime === 0 && state.t < (u.wallCd || 0)) { u.phasing = false; return; }
  u.wallTime += dt;
  if (u.wallTime >= cfg.maxTime) {
    // ครบเวลา — ดันออกไปขอบที่ใกล้สุด แล้วเริ่มคูลดาวน์
    pushOutOfWall(u, inside);
    u.wallCd = state.t + byTier(cfg.cd, cfg.tiers, u.level || 1);
    u.wallTime = 0;
    u.phasing = false;
    return;
  }
  u.phasing = true;
}

function pushOutOfWall(u, o) {
  if (o.kind === "wall") {
    const w = o.w;
    const rx = u.x - w.x, ry = u.y - w.y;
    const side = rx * -w.ny + ry * w.nx;
    const push = (u.radius + 30) * (side >= 0 ? 1 : -1);
    place(u, w.x + -w.ny * push + w.nx * (rx * w.nx + ry * w.ny),
      w.y + w.nx * push + w.ny * (rx * w.nx + ry * w.ny));
    return;
  }
  const dx = u.x - o.x, dy = u.y - o.y;
  const d = Math.hypot(dx, dy) || 1;
  // ดันไปฝั่งที่ตัวเองอยู่ใกล้กว่า (นอกวงหรือในวง)
  const lim = d >= o.r ? o.r + u.radius + 30 : o.r - u.radius - 30;
  place(u, o.x + (dx / d) * Math.max(0, lim), o.y + (dy / d) * Math.max(0, lim));
}

// โดนแชมเปี้ยนศัตรูตีขณะอยู่ในกำแพง — เวลาที่เหลือลดครึ่ง
export function spiderWalkHurt(u) {
  const cfg = u.champ && u.champ.spiderWalk;
  if (!cfg || !u.phasing) return;
  const left = cfg.maxTime - (u.wallTime || 0);
  u.wallTime = cfg.maxTime - left * (1 - (cfg.cutOnHit || 0.5));
}

// ออโต้พ่วงดาเมจเวท
export function spiderOnHit(state, u, e) {
  const cfg = u.champ && u.champ.spiderWalk;
  if (!cfg || !e || !e.alive) return;
  const dmg = cfg.onHitBase + cfg.onHitPerLevel * ((u.level || 1) - 1) + (cfg.onHitApRatio || 0) * (u.ap || 0);
  const prev = state.dmgSrc;
  state.dmgSrc = "Spider's Traverse";
  applyDamage(state, u, e, dmg, true);
  state.dmgSrc = prev;
}

// ---------------------------------------------------------------
// ANANSI W — ใยสองเส้น
// ---------------------------------------------------------------
// เอกสารบอกว่าคูลดาวน์ของ W เริ่มนับ "หลังการร่ายครั้งที่ 2 สิ้นสุด หรือเมื่อ
// หมดเวลา 3.5 วินาที" ไม่ใช่ตอนกดครั้งแรก จึงต้องกดคูลดาวน์เองสองที่
function startWebCd(u, sk, state) {
  const own = (u.skills || []).find((x) => x.key === sk.key) || sk;
  const r = Math.max(0, (own.rank || 1) - 1);
  own.cdLeft = own.cdByRank ? own.cdByRank[r] : (own.cd || 0);
}

export function castWebThread(state, u, sk, target) {
  if (!target) return;
  const second = u.webThread && state.t <= u.webThread.until;
  const r = Math.max(0, sk.rank - 1);
  const prev = state.dmgSrc;
  state.dmgSrc = skillLabel(u, sk);
  if (!second) {
    const dmg = sk.dmg[r] + (sk.apRatio || 0) * (u.ap || 0);
    applyDamage(state, u, target, dmg, true);
    addBuff(target, { type: "slow", v: sk.slow, until: state.t + (sk.slowDur || 1.5) }, state.t);
    u.webThread = { until: state.t + (sk.window || 3.5), targetId: target.id, sk, rank: sk.rank };
    // ยังไม่ให้คูลดาวน์เดิน จะเริ่มนับตอนกดครั้งที่สองหรือตอนหน้าต่างหมดอายุ
    if (sk.cdAfterWindow) {
      const own = (u.skills || []).find((x) => x.key === sk.key);
      if (own) own.cdLeft = (sk.window || 3.5) + 0.05;
    }
  } else {
    const w = u.webThread;
    const first = state.units.find((x) => x.id === w.targetId && x.alive);
    if (target.id === w.targetId || !first) {
      // เป้าเดิม — ดาเมจครึ่งเดียวของดอกแรก แล้วตรึงเท้า
      const half = sk.secondDmg[r] + (sk.secondApRatio || 0) * (u.ap || 0);
      applyDamage(state, u, target, half, true);
      addBuff(target, { type: "root", v: 1, until: state.t + sk.rootByRank[r] }, state.t);
    } else {
      // เป้าคนใหม่ — กินดาเมจเต็มเท่าดอกแรก
      const full = sk.dmg[r] + (sk.apRatio || 0) * (u.ap || 0);
      applyDamage(state, u, target, full, true);
      // กระชากทั้งคู่มาชนกันที่จุดกึ่งกลาง
      const mx = (first.x + target.x) / 2, my = (first.y + target.y) / 2;
      place(first, mx, my);
      place(target, mx, my);
      // ระเบิดตอนร่างกระแทกกัน ลงทั้งสองตัว แล้วติดสตัน
      const slam = (sk.slamDmg ? sk.slamDmg[r] : 0) + (sk.slamApRatio || 0) * (u.ap || 0);
      const stun = sk.slamStun ? sk.slamStun[r] : 0;
      for (const e of [first, target]) {
        if (slam > 0) applyDamage(state, u, e, slam, true);
        if (stun > 0) addBuff(e, { type: "stun", v: 1, until: state.t + stun }, state.t);
      }
      vfx(state, { kind: "shock", x: mx, y: my, r: 150, color: "230,220,255", dur: 0.4 });
    }
    u.webThread = null;
    // คูลดาวน์เพิ่งเริ่มนับตอนนี้ ไม่ใช่ตอนกดครั้งแรก
    if (sk.cdAfterWindow) startWebCd(u, sk, state);
  }
  state.dmgSrc = prev;
  vfx(state, { kind: "beam", x: u.x, y: u.y, x2: target.x, y2: target.y, w: 10, color: "230,220,255", dur: 0.3 });
}

// ---------------------------------------------------------------
// ANANSI E — พ่นกรวยแล้วทิ้งผืนใย
// ---------------------------------------------------------------
export function castWebField(state, u, sk, target) {
  const face = target ? Math.atan2(target.y - u.y, target.x - u.x) : 0;
  const r = Math.max(0, sk.rank - 1);
  const half = ((sk.angle || 60) * Math.PI) / 180 / 2;
  const dmg = sk.dmg[r] + (sk.apRatio || 0) * (u.ap || 0);
  const prev = state.dmgSrc;
  state.dmgSrc = skillLabel(u, sk);
  for (const e of enemiesOf(state, u)) {
    if (!inCone(u, e, face, half, sk.range)) continue;
    applyDamage(state, u, e, dmg, true);
  }
  state.dmgSrc = prev;
  // ผืนใยค้างบนพื้น — วางเป็นวงกลางกรวย
  const mid = sk.range * 0.55;
  L(state).webs.push({
    ownerId: u.id, team: u.team,
    x: u.x + Math.cos(face) * mid, y: u.y + Math.sin(face) * mid,
    r: sk.range * 0.5, until: state.t + (sk.zoneLife || 3),
    slow: sk.zoneSlow[r], grounded: !!sk.grounded,
  });
  vfx(state, { kind: "cone", x: u.x, y: u.y, r: sk.range, ang: face, half, color: "230,220,255", dur: 0.4 });
}

// ---------------------------------------------------------------
// ANANSI R — คลื่นช้ากว้าง ไม่ทำดาเมจ ศัตรูที่โดนหันไปตีพวกเดียวกัน
// ---------------------------------------------------------------
export function castBerserkWave(state, u, sk, target) {
  const ang = target ? Math.atan2(target.y - u.y, target.x - u.x) : 0;
  L(state).waves.push({
    ownerId: u.id, team: u.team, sk, rank: sk.rank,
    x: u.x, y: u.y, nx: Math.cos(ang), ny: Math.sin(ang),
    left: sk.range, hitIds: [],
  });
}

function tickBerserkWave(state, w, dt) {
  const u = state.units.find((x) => x.id === w.ownerId);
  const sk = w.sk;
  const r = Math.max(0, (w.rank || 1) - 1);
  const stepLen = Math.min(w.left, (sk.projSpeed || 850) * dt);
  w.x += w.nx * stepLen;
  w.y += w.ny * stepLen;
  w.left -= stepLen;
  const halfW = (sk.width || 650) / 2;
  if (u) {
    for (const e of enemiesOf(state, u)) {
      if (w.hitIds.includes(e.id)) continue;
      const rx = e.x - w.x, ry = e.y - w.y;
      if (Math.abs(rx * w.nx + ry * w.ny) > e.radius + 40) continue;
      if (Math.abs(rx * -w.ny + ry * w.nx) > halfW + e.radius) continue;
      w.hitIds.push(e.id);
      e.berserk = { until: state.t + sk.berserkByRank[r], as: sk.berserkAs || 1, allyRange: sk.allyRange || 500 };
      vfx(state, { kind: "ring", x: e.x, y: e.y, r: e.radius + 24, color: "150,80,200", grow: 0.5, dur: 0.5 });
    }
  }
  vfx(state, { kind: "beam", x: w.x - w.nx * 20, y: w.y - w.ny * 20, x2: w.x + w.nx * 20, y2: w.y + w.ny * 20,
    w: halfW, color: "150,80,200", dur: 0.12 });
  return w.left > 0;
}

// บังคับให้คนที่บ้าคลั่งตีพวกเดียวกัน — เรียกทุกทิกจาก step.js
// คืน true ถ้าจัดการยูนิตนี้ไปแล้ว (ผู้เรียกต้องไม่ให้มันทำอย่างอื่น)
export function berserkTick(state, u) {
  const b = u.berserk;
  if (!b) return false;
  if (state.t > b.until) { u.berserk = null; u.berserkTarget = null; return false; }
  // หาพวกเดียวกันที่ใกล้สุดในระยะ
  let best = null, bd = Infinity;
  for (const a of state.units) {
    if (!a.alive || a.id === u.id || a.team !== u.team) continue;
    const d = dist(u, a);
    if (d < bd) { bd = d; best = a; }
  }
  u.berserkTarget = best && bd <= b.allyRange ? best.id : null;
  return true;
}

// ---------------------------------------------------------------
// WOLF พาสซีฟ — ตีเป้าที่เลือดต่ำกว่าครึ่งได้สามอย่าง
// เรียกจาก damage.js ตอนคิดตัวคูณ และจาก stats.js ตอนคิดความเร็วโจมตี
// ---------------------------------------------------------------
export function frenzyAmp(source, target) {
  const cfg = source && source.champ && source.champ.bloodfrenzy;
  if (!cfg || !target || !target.maxHp) return 1;
  if (target.hp / target.maxHp >= cfg.hpBelow) return 1;
  return 1 + byTier(cfg.dmg, cfg.tiers, source.level || 1);
}

// ความเร็วโจมตีที่เพิ่มขึ้นตอนมีเป้าเลือดต่ำกว่าครึ่งอยู่ในระยะตี
// เงื่อนไขขึ้นกับเป้า ไม่ใช่ตัวเอง จึงคิดทุกทิกใน step.js ไม่ใช่ใน stats.js
export function frenzyAsBonus(state, u) {
  const cfg = u.champ && u.champ.bloodfrenzy;
  if (!cfg) return 0;
  for (const e of enemiesOf(state, u)) {
    if (!e.maxHp || e.hp / e.maxHp >= cfg.hpBelow) continue;
    if (dist(u, e) > (u.range || 175) + e.radius + 80) continue;
    return byTier(cfg.as, cfg.tiers, u.level || 1);
  }
  return 0;
}

// ดูดเลือดคืนจากดาเมจที่ลงเป้าเลือดน้อย — เรียกหลังดาเมจลงแล้ว
export function frenzyDrain(state, source, target, dealt) {
  const cfg = source && source.champ && source.champ.bloodfrenzy;
  if (!cfg || !target || !target.maxHp || !(dealt > 0)) return;
  if (target.hp / target.maxHp >= cfg.hpBelow) return;
  const back = dealt * byTier(cfg.lifesteal, cfg.tiers, source.level || 1);
  if (back > 0) source.hp = Math.min(source.maxHp, source.hp + back);
}

// ---------------------------------------------------------------
// WOLF W พาสซีฟ — ความเร็วเดิน คูณสามถ้าวิ่งเข้าหาเป้าที่เลือดต่ำกว่าครึ่ง
// เรียกจาก step.js ทุกทิก เพราะเงื่อนไขขึ้นกับตำแหน่งที่ขยับอยู่ตลอด
// ---------------------------------------------------------------
export function scentTick(state, u) {
  const w = (u.skills || []).find((x) => x.key === "W" && x.scentMs);
  if (!w || w.rank <= 0) return;
  const r = Math.max(0, w.rank - 1);
  let v = w.scentMs[r];
  // มีเป้าเลือดน้อยอยู่ในระยะ = ได้สามเท่า (เอกสารเขียน "มุ่งหน้าเข้าหา"
  // แต่ในเกมนี้ยูนิตเดินเข้าหาเป้าที่ล็อกอยู่เสมอ จึงใช้ "มีเป้าในระยะ" แทน)
  for (const e of enemiesOf(state, u)) {
    if (!e.maxHp || e.hp / e.maxHp >= (w.scentHpBelow || 0.5)) continue;
    if (dist(u, e) > (w.scentRange || 1200)) continue;
    v *= w.scentMul || 3;
    break;
  }
  u.scentMs = v;
}

// ---------------------------------------------------------------
// WOLF W — ล่องหน แล้วออโต้ถัดไปกลายเป็นกระโจน
// ---------------------------------------------------------------
export function castPounce(state, u, sk) {
  addBuff(u, { type: "stealth", v: 1, until: state.t + (sk.hideDur || 1.75) }, state.t);
  u.pounceArmed = { until: state.t + (sk.hideDur || 1.75) + (sk.graceAfter || 1), sk, rank: sk.rank };
  vfx(state, { kind: "trail", x: u.x, y: u.y, color: "90,90,110", pending: u.id });
}

// ออโต้ที่ติดอาวุธจาก W — กระโจนลงจุดเป้า มีวงเตือนบนพื้น หลบได้
// คืน true ถ้ากินการออโต้ครั้งนี้ไป
export function pounceAuto(state, u, target) {
  const a = u.pounceArmed;
  if (!a || state.t > a.until || !target || !target.alive) return false;
  u.pounceArmed = null;
  const sk = a.sk;
  const dd = dist(u, target) || 1;
  const reach = Math.min(dd, sk.range || 500);
  const tx = u.x + ((target.x - u.x) / dd) * reach;
  const ty = u.y + ((target.y - u.y) / dd) * reach;
  // ลอยอยู่กลางอากาศระหว่างกระโจน แตะไม่ได้แบบเดียวกับท่ากระโดดอื่น
  addBuff(u, { type: "untargetable", v: 1, until: state.t + (sk.airTime || 0.35) }, state.t);
  L(state).pounces.push({ ownerId: u.id, at: state.t + (sk.airTime || 0.35), x: tx, y: ty, sk, rank: a.rank });
  vfx(state, { kind: "ring", x: tx, y: ty, r: sk.radius || 225, color: "200,80,80", grow: 0.9, dur: sk.airTime || 0.35 });
  return true;
}

function landPounce(state, p) {
  const u = state.units.find((x) => x.id === p.ownerId);
  if (!u || !u.alive) return;
  const sk = p.sk;
  const r = Math.max(0, (p.rank || 1) - 1);
  place(u, p.x, p.y);
  u.buffs = u.buffs.filter((b) => b.type !== "untargetable");
  const dmg = sk.dmg[r] + (sk.badRatio || 0) * (u.bonusAd || 0);
  const prev = state.dmgSrc;
  state.dmgSrc = skillLabel(u, sk);
  for (const e of enemiesOf(state, u)) {
    if (dist(u, e) > sk.radius + e.radius) continue;
    applyDamage(state, u, e, dmg, false);
  }
  state.dmgSrc = prev;
  vfx(state, { kind: "shock", x: u.x, y: u.y, r: sk.radius, color: "200,80,80", dur: 0.5 });
}

// ---------------------------------------------------------------
// WOLF E — ชาร์จแล้วคำรามรอบตัว ติดหวาดกลัว ลดดาเมจที่ศัตรูทำได้
// ---------------------------------------------------------------
export function castHowl(state, u, sk) {
  u.channeling = { until: state.t + (sk.delay || 0.6), skill: sk, howl: true, rank: sk.rank };
  vfx(state, { kind: "ring", x: u.x, y: u.y, r: sk.radius, color: "180,60,60", grow: sk.delay || 0.6, dur: sk.delay || 0.6 });
}

// เสียงคำรามออกผลเมื่อชาร์จครบ — เรียกจาก step.js ตอน channeling หมดเวลา
export function howlLand(state, u, sk, rank) {
  const r = Math.max(0, (rank || 1) - 1);
  const dmg = sk.dmg[r] + (sk.badRatio || 0) * (u.bonusAd || 0);
  const prev = state.dmgSrc;
  state.dmgSrc = skillLabel(u, sk);
  for (const e of enemiesOf(state, u)) {
    if (dist(u, e) > sk.radius + e.radius) continue;
    applyDamage(state, u, e, dmg, false);
    addBuff(e, { type: "fear", v: 1, until: state.t + sk.fearByRank[r] }, state.t);
    // ลดดาเมจที่เป้าทำ "ใส่ Wolf" เท่านั้น และอยู่นาน 3.5 วิ ไม่ผูกกับเวลาหวาดกลัว
    // ใช้ช่องของตัวเอง ไม่ใช่ outCut ที่ลดดาเมจของเป้าใส่ทุกคน
    const cut = sk.dreadByRank ? sk.dreadByRank[r] : 0;
    if (cut > 0 && !(e.dread && e.dread.cut > cut && state.t <= e.dread.until)) {
      e.dread = { ownerId: u.id, cut, until: state.t + (sk.dreadDur || 3.5) };
    }
  }
  state.dmgSrc = prev;
  vfx(state, { kind: "shock", x: u.x, y: u.y, r: sk.radius, color: "180,60,60", dur: 0.6 });
}

// ---------------------------------------------------------------
// WOLF R — ซากศพที่เกิดจากคนตายใกล้ตัว แล้วกินเพื่อฟื้นตัว
// ---------------------------------------------------------------
// มีแชมเปี้ยนตายใกล้ Wolf — ทิ้งซากไว้ให้กิน เรียกจาก step.js ตอนมีคนตาย
export function dropCarcass(state, dead) {
  for (const u of state.units) {
    if (!u.alive || u.team === dead.team) continue;
    const r = (u.skills || []).find((x) => x.key === "R" && x.carcassRange);
    if (!r || r.rank <= 0) continue;
    if (dist(u, dead) > r.carcassRange) continue;
    L(state).carcasses.push({ ownerId: u.id, x: dead.x, y: dead.y, until: state.t + (r.carcassLife || 12) });
    vfx(state, { kind: "ring", x: dead.x, y: dead.y, r: 60, color: "160,40,40", grow: 0.4, dur: 0.8 });
  }
}

export function castDevour(state, u, sk) {
  const list = L(state).carcasses;
  let best = null, bd = Infinity;
  for (const c of list) {
    if (c.ownerId !== u.id || state.t > c.until) continue;
    const d = Math.hypot(u.x - c.x, u.y - c.y);
    if (d <= (sk.range || 300) && d < bd) { bd = d; best = c; }
  }
  if (!best) return false;                 // ไม่มีซากให้กิน ท่าไม่ออก
  L(state).carcasses = list.filter((c) => c !== best);
  const r = Math.max(0, sk.rank - 1);
  const heal = sk.heal[r] + (sk.healMaxHp || 0) * (u.maxHp || 0) + (sk.healBad || 0) * (u.bonusAd || 0);
  u.hp = Math.min(u.maxHp, u.hp + heal);
  addBuff(u, { type: "ms", v: sk.msBuff[r], until: state.t + (sk.msDur || 1.5) }, state.t);
  // รีเซ็ตคูลดาวน์ของสกิลพื้นฐาน
  for (const key of sk.resetKeys || []) {
    const own = (u.skills || []).find((x) => x.key === key);
    if (own) own.cdLeft = 0;
  }
  vfx(state, { kind: "shards", x: best.x, y: best.y, r: 90, count: 10, color: "160,40,40", dur: 0.5 });
  return true;
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

  // การกระโจนของ W ที่ถึงเวลาลงพื้น
  lore.pounces = lore.pounces.filter((p) => {
    if (state.t < p.at) return true;
    landPounce(state, p);
    return false;
  });

  // คลื่นบ้าคลั่งของ ANANSI R
  lore.waves = lore.waves.filter((w) => tickBerserkWave(state, w, dt));

  // ผืนใยของ ANANSI E — สโลว์และตรึงพื้นคนที่ยืนอยู่ในวง
  lore.webs = lore.webs.filter((z) => {
    if (state.t > z.until) return false;
    const owner = state.units.find((x) => x.id === z.ownerId);
    if (owner) {
      for (const e of enemiesOf(state, owner)) {
        if (Math.hypot(e.x - z.x, e.y - z.y) > z.r + e.radius) continue;
        addBuff(e, { type: "slow", v: z.slow, until: state.t + 0.3 }, state.t);
        // ตรึงพื้น: ใช้ท่าเคลื่อนที่ไม่ได้ และเร่งความเร็วเดินไม่ได้
        if (z.grounded) e.grounded = state.t + 0.3;
      }
    }
    vfx(state, { kind: "ring", x: z.x, y: z.y, r: z.r, color: "230,220,255", dur: 0.1 });
    return true;
  });

  // กะโหลกวิญญาณของ KOSCHEI Q
  lore.grasps = lore.grasps.filter((g) => tickGrasp(state, g, dt));

  // ชุดเกราะที่ KOSCHEI R ทิ้งไว้
  lore.shells = lore.shells.filter((sh) => tickShell(state, sh, dt));

  // หน้าต่างกดซ้ำของ ANANSI W หมดอายุ — คูลดาวน์เริ่มนับตอนนี้
  for (const u of state.units) {
    if (!u.webThread || state.t <= u.webThread.until) continue;
    const sk = u.webThread.sk;
    u.webThread = null;
    if (sk && sk.cdAfterWindow) startWebCd(u, sk, state);
  }

  // ซากศพหมดอายุ
  lore.carcasses = lore.carcasses.filter((c) => state.t <= c.until);

  // ลดดาเมจจากหวาดกลัวหมดเวลาแล้วต้องคืนค่า
  // (กรงของเฮลซิงใช้ช่องเดียวกัน แต่กรงคืนค่าเองตอนหมดอายุ)
  for (const u of state.units) {
    if (u.outCutUntil && state.t > u.outCutUntil) { u.outCut = 0; u.outCutUntil = 0; }
    if (u.dread && state.t > u.dread.until) u.dread = null;
  }

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
    case "pounce": castPounce(state, u, sk); return true;
    case "howl": castHowl(state, u, sk); return true;
    // คืนค่าตามจริง ไม่มีซากให้กิน = ท่าไม่ออก คูลดาวน์ต้องไม่เดิน
    case "devour": return castDevour(state, u, sk);
    case "webThread": castWebThread(state, u, sk, target); return true;
    case "webField": castWebField(state, u, sk, target); return true;
    case "berserkWave": castBerserkWave(state, u, sk, target); return true;
    case "soulGrasp": castSoulGrasp(state, u, sk, target); return true;
    case "miasmaAura": castMiasma(state, u, sk); return true;
    case "casketShield": castCasket(state, u, sk); return true;
    case "soulSplit": castSoulSplit(state, u, sk); return true;
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
  if (!l.pounces) l.pounces = [];
  if (!l.carcasses) l.carcasses = [];
  if (!l.webs) l.webs = [];
  if (!l.waves) l.waves = [];
  if (!l.grasps) l.grasps = [];
  if (!l.shells) l.shells = [];
  return l;
}

// ข้อความในปูมต้องผ่าน tr() ทั้งชื่อตัวละครและตัวประโยค ไม่งั้นหลุดเป็นไทยในโหมดอังกฤษ
const logKoschei = (state, u, th) =>
  pushLog(state, tr("{0} {1} {2}", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th), tr(th)));


// ===============================================================
// KOSCHEI
// ===============================================================

// เกราะและต้านเวทส่วนที่เกินค่าฐานของตัวละครที่เลเวลนั้น
// สูตรเดียวกับ lore-p4.js ไม่ได้เขียนใหม่ด้วยมือ
const bonusArmorOf = (u) =>
  Math.max(0, (u.armor || 0) - (u.champ.armor + u.champ.armorG * ((u.level || 1) - 1)));
const bonusMrOf = (u) =>
  Math.max(0, (u.mr || 0) - (u.champ.mr + u.champ.mrG * ((u.level || 1) - 1)));

const rankOf = (sk) => Math.max(0, (sk.rank || 1) - 1);

// ---------------------------------------------------------------
// พาสซีฟ Deathless Phylactery — มีแชมเปี้ยนตายใกล้ตัวแล้วฟื้นเลือด
//
// เรียกจาก damage.js ตอนที่ตั้ง target.alive = false จุดเดียวกับที่ WOLF
// ทิ้งซากศพ · ไม่เลือกข้าง เพื่อนตายก็ฟื้น ศัตรูตายก็ฟื้น ตามเอกสาร
// ---------------------------------------------------------------
export function phylacteryHeal(state, dead) {
  for (const u of state.units) {
    const cfg = u.alive && u.champ && u.champ.phylactery;
    if (!cfg || u.id === dead.id) continue;
    if (dist(u, dead) > cfg.range) continue;
    const pct = byTier(cfg.heal, cfg.tiers, u.level || 1);
    const amt = (u.maxHp || 0) * pct;
    if (amt <= 0) continue;
    const prev = state.dmgSrc;
    state.dmgSrc = tr("พาสซีฟ Deathless Phylactery");
    healUnit(state, u, amt);
    state.dmgSrc = prev;
    vfx(state, { kind: "aura", id: u.id, r: u.radius + 40, color: "120,220,150", dur: 0.6 });
  }
}

// ---------------------------------------------------------------
// Q Spectral Grasp — กะโหลกพุ่งเป็นเส้น หยุดที่แชมเปี้ยนตัวแรก
//
// ใช้ลูกของตัวเองไม่ใช่ state.projectiles เพราะต้องสูบเลือดคืนให้คนยิง
// ตอนชน ซึ่งเส้นทางลูกกลางไม่มีช่องให้ผูกผลนั้น
// ---------------------------------------------------------------
export function castSoulGrasp(state, u, sk, target) {
  const r = rankOf(sk);
  const tx = target ? target.x : u.x + 1, ty = target ? target.y : u.y;
  const d = Math.hypot(tx - u.x, ty - u.y) || 1;
  L(state).grasps.push({
    ownerId: u.id, team: u.team, x: u.x, y: u.y,
    nx: (tx - u.x) / d, ny: (ty - u.y) / d,
    left: sk.range, speed: sk.projSpeed, half: sk.width / 2,
    dmg: sk.dmg[r] + (sk.apRatio || 0) * (u.ap || 0) + (sk.selfMaxHp || 0) * (u.maxHp || 0),
    heal: sk.heal[r] + (sk.healApRatio || 0) * (u.ap || 0) + (sk.healMaxHp || 0) * (u.maxHp || 0),
    label: skillLabel(u, sk),
  });
}

function tickGrasp(state, g, dt) {
  const u = state.units.find((x) => x.id === g.ownerId);
  if (!u) return false;
  const stepLen = Math.min(g.left, g.speed * dt);
  const px = g.x, py = g.y;
  g.x += g.nx * stepLen;
  g.y += g.ny * stepLen;
  g.left -= stepLen;
  vfx(state, { kind: "flash", x: g.x, y: g.y, r: 34, color: "120,220,150", dur: 0.12 });

  // หยุดที่แชมเปี้ยนศัตรูตัวแรกที่ขวางอยู่ในช่วงที่ลูกเพิ่งวิ่งผ่าน
  let hit = null, best = Infinity;
  for (const e of enemiesOf(state, u)) {
    if (Math.abs((e.x - px) * g.ny - (e.y - py) * g.nx) > g.half + e.radius) continue;
    const along = (e.x - px) * g.nx + (e.y - py) * g.ny;
    if (along < -e.radius || along > stepLen + e.radius) continue;
    if (along < best) { best = along; hit = e; }
  }
  if (hit) {
    const prev = state.dmgSrc;
    state.dmgSrc = g.label;
    applyDamage(state, u, hit, g.dmg, true);
    healUnit(state, u, g.heal);
    state.dmgSrc = prev;
    vfx(state, { kind: "shock", x: hit.x, y: hit.y, r: 90, color: "120,220,150", dur: 0.3 });
    return false;
  }
  return g.left > 0;
}

// ---------------------------------------------------------------
// W Tormenting Miasma — ออร่ารอบตัวที่เผาศัตรูทุก 0.5 วิ
//
// ผลร่วมกับ E: กดตอนที่โล่โลงยังทำงานอยู่ ได้ความเร็วเดินทันที
// เช็กที่ u.shield > 0 ด้วย ไม่ใช่แค่เวลาของ E เพราะเอกสารเขียนว่า
// "ขณะที่โล่ยังทำงานอยู่" — โล่แตกแล้วถือว่าไม่ทำงานแล้ว
// ---------------------------------------------------------------
export function castMiasma(state, u, sk) {
  const r = rankOf(sk);
  u.miasma = {
    // เอกสารเขียนว่า "ทำงาน 8 ครั้งตลอด 4 วินาที" จึงนับเป็นงบจำนวนครั้ง
    // ไม่ใช่ปล่อยให้นาฬิกาตัดสิน ซึ่งได้ 9-10 ครั้งเพราะครั้งแรกลงทันทีที่กด
    until: state.t + sk.dur, next: state.t + sk.every, left: Math.round(sk.dur / sk.every),
    radius: sk.radius,
    dmg: sk.tickDmg[r] + (sk.tickApRatio || 0) * (u.ap || 0)
      + (sk.tickBonusHp || 0) * (u.bonusHp || 0),
    every: sk.every, label: skillLabel(u, sk),
  };
  if (casketOn(state, u) && sk.synergyMs) {
    addBuffUnique(u, "koschei:miasma", { type: "ms", v: sk.synergyMs[r],
      until: state.t + (sk.synergyMsDur || 2.5) }, state.t);
    vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 50, color: "120,220,150", grow: 1 });
  }
  vfx(state, { kind: "aura", id: u.id, r: sk.radius, color: "90,180,120", dur: sk.dur });
}

// โล่ของ E ยังทำงานอยู่ไหม — มีทั้งเวลาเหลือและโล่ยังไม่แตก
function casketOn(state, u) {
  return !!(u.casket && state.t <= u.casket.until && (u.shield || 0) > 0);
}

export function miasmaTick(state, u) {
  const m = u.miasma;
  if (!m) return;
  if (state.t > m.until || m.left <= 0) { u.miasma = null; return; }
  if (state.t < m.next) return;
  m.next = state.t + m.every;
  m.left -= 1;
  // ระหว่างแยกร่าง ออร่าออกจากร่างวิญญาณ ซึ่งก็คือตัว u เอง
  const prev = state.dmgSrc;
  state.dmgSrc = m.label;
  for (const e of enemiesOf(state, u)) {
    if (dist(u, e) > m.radius + e.radius) continue;
    applyDamage(state, u, e, m.dmg, true);
  }
  state.dmgSrc = prev;
}

// ---------------------------------------------------------------
// E Casket Carapace — โล่ตาม Max HP แล้วแผ่คลื่นทุก 1 วิตราบใดที่โล่ยังอยู่
//
// ระหว่างแยกร่าง (R) โล่ไปกางที่ "ชุดเกราะ" แต่คลื่นออกจาก "ร่างวิญญาณ"
// ตามที่เอกสารระบุไว้ชัด
// ---------------------------------------------------------------
export function castCasket(state, u, sk) {
  const r = rankOf(sk);
  const amt = sk.shield[r] + (sk.shieldMaxHp || 0) * (u.maxHp || 0);
  const shell = L(state).shells.find((x) => x.ownerId === u.id);
  if (shell) {
    // ระหว่างแยกร่าง โล่ไปกางที่ชุดเกราะ ซึ่งถือโล่ของตัวเองไว้ในฟิลด์ shield
    shell.shield = amt;
  } else {
    grantShield(u, amt);
    // ต้องมีบัฟ "shield" กำกับไว้ ไม่งั้น step.js ล้างโล่ทิ้งในทิกถัดไป
    addBuff(u, { type: "shield", v: 1, until: state.t + sk.dur }, state.t);
  }
  u.casket = {
    until: state.t + sk.dur, next: state.t + sk.pulseEvery, left: sk.pulseMax,
    radius: sk.pulseRadius, onShell: !!shell,
    dmg: sk.pulseDmg[r] + (sk.pulseBonusArmor || 0) * bonusArmorOf(u)
      + (sk.pulseBonusMr || 0) * bonusMrOf(u),
    slow: sk.pulseSlow[r], slowDur: sk.pulseSlowDur,
    shredPer: sk.shredPer[r], shredMax: sk.shredMaxStacks, shredDur: sk.shredDur,
    label: skillLabel(u, sk),
  };
  vfx(state, { kind: "aura", id: u.id, r: u.radius + 36, color: "150,160,170", dur: sk.dur });
}

export function casketTick(state, u) {
  const c = u.casket;
  if (!c) return;
  // โล่ไปอยู่ที่ชุดเกราะระหว่างแยกร่าง จึงต้องดูโล่ของชุดเกราะแทน
  const shell = c.onShell ? L(state).shells.find((x) => x.ownerId === u.id) : null;
  const shieldLeft = shell ? (shell.shield || 0) : (u.shield || 0);
  if (state.t > c.until || c.left <= 0 || shieldLeft <= 0) { u.casket = null; return; }
  if (state.t < c.next) return;
  c.next = state.t + 1.0;
  c.left -= 1;
  const prev = state.dmgSrc;
  state.dmgSrc = c.label;
  for (const e of enemiesOf(state, u)) {
    if (dist(u, e) > c.radius + e.radius) continue;
    applyDamage(state, u, e, c.dmg, true);
    addBuff(e, { type: "slow", v: c.slow, until: state.t + c.slowDur }, state.t);
    // ฉีกเกราะและกันเวทสะสมเป็นชั้น — ชั้นเดิมถูกแทนที่ด้วยชั้นที่สูงขึ้น
    // รูปแบบเดียวกับที่ on-hit.js ใช้ เพื่อให้ไม่ซ้อนกันเป็นหลายก้อน
    const old = e.buffs.find((b) => b.type === "shred" && b.sourceId === u.id);
    const stacks = Math.min(c.shredMax, ((old && old.stacks) || 0) + 1);
    e.buffs = e.buffs.filter((b) => !(b.type === "shred" && b.sourceId === u.id));
    addBuff(e, { type: "shred", v: c.shredPer * stacks, stacks, sourceId: u.id,
      until: state.t + c.shredDur }, state.t);
  }
  state.dmgSrc = prev;
  vfx(state, { kind: "shock", x: u.x, y: u.y, r: c.radius, color: "150,160,170", dur: 0.35 });
}

// ---------------------------------------------------------------
// R Soulseverance — แยกร่าง
//
// เกมนี้ไม่มีการบังคับตัวละครด้วยมือระหว่างไฟต์ (AI เดินให้ทั้งหมด)
// จึงแปลสเปคเป็น: ตัว u เองกลายเป็น "ร่างวิญญาณ" — แตะไม่ได้ ตีธรรมดา
// ไม่ได้ ได้ความเร็วเดินกับความเร่งสกิล และยังร่าย Q/W ตามปกติ
// ส่วน "ชุดเกราะ" เป็นตัวแยกใน lore.shells ที่ยืนรับดาเมจแทน
//
// หลอดเลือดเดียวกันทำตรงตัว: ดาเมจที่ชุดเกราะกินถูกส่งไปหัก HP ของ u จริง
// ผ่าน applyDamage เพื่อให้ใช้สูตรลดดาเมจเดียวกับทุกอย่างในเกม
// ไม่ใช่สูตรที่เขียนขึ้นใหม่เอง
// ---------------------------------------------------------------
export function castSoulSplit(state, u, sk) {
  const r = rankOf(sk);
  const until = state.t + sk.durByRank[r];
  const lore = L(state);
  lore.shells = lore.shells.filter((x) => x.ownerId !== u.id);
  lore.shells.push({
    ownerId: u.id, team: u.team, x: u.x, y: u.y, radius: u.radius,
    until, res: sk.shellRes[r], swing: sk.shellSwing, reach: sk.shellReach,
    next: state.t + sk.shellSwing, shield: 0,
  });
  u.soulSplit = { until, leash: sk.leash };
  // ร่างวิญญาณ: อมตะและแตะไม่ได้ · ตีธรรมดาไม่ได้ · เร็วขึ้นและคูลดาวน์ไหลเร็วขึ้น
  addBuff(u, { type: "invuln", v: 1, until }, state.t);
  addBuff(u, { type: "untargetable", v: 1, until }, state.t);
  addBuff(u, { type: "disarm", v: 1, until }, state.t);
  addBuff(u, { type: "ms", v: sk.spiritMs[r], until }, state.t);
  addBuff(u, { type: "ahFlat", v: sk.spiritAh[r], until }, state.t);
  vfx(state, { kind: "aura", id: u.id, r: u.radius + 44, color: "120,220,150", dur: sk.durByRank[r] });
  logKoschei(state, u, "ถอดดวงจิตออกจากชุดเกราะ");
}

function tickShell(state, sh, dt) {
  const u = state.units.find((x) => x.id === sh.ownerId);
  if (!u || !u.alive || state.t > sh.until) return false;
  const foes = enemiesOf(state, u);

  // ---- ชุดเกราะกินดาเมจแทนร่างวิญญาณ ----
  // ใช้สำนวนเดียวกับยักษ์ของ JACK R: คิดจากดาเมจออโต้ต่อวินาทีของศัตรู
  // ที่ยืนประชิดตัวมัน บวกลูกสกิลที่พาดผ่าน
  for (const e of state.units) {
    if (!e.alive || e.team === sh.team || e.stunned || e.disarmed) continue;
    if (Math.hypot(e.x - sh.x, e.y - sh.y) > sh.radius + e.radius + 60) continue;
    shellTakes(state, u, sh, e, (e.ad || 0) * (e.asEff || 0.6) * AUTO_DMG * dt, false);
  }
  for (const p of state.projectiles) {
    if (p.team === sh.team || p.shellHit) continue;
    if (Math.hypot(p.x - sh.x, p.y - sh.y) > sh.radius) continue;
    p.shellHit = true;
    const src = state.units.find((x) => x.id === p.ownerId) || null;
    shellTakes(state, u, sh, src, p.dmg, !!p.magic);
  }

  // ---- เดินไล่ฟันแชมเปี้ยนศัตรูที่ใกล้สุดเอง ----
  if (foes.length) {
    const tgt = foes.reduce((a, b) =>
      (Math.hypot(b.x - sh.x, b.y - sh.y) < Math.hypot(a.x - sh.x, a.y - sh.y) ? b : a));
    const d = Math.hypot(tgt.x - sh.x, tgt.y - sh.y) || 1;
    if (d > sh.reach) {
      const sp = (u.champ.ms || 335) * dt;
      sh.x = clamp(sh.x + ((tgt.x - sh.x) / d) * sp, 60, ARENA_W - 60);
      sh.y = clamp(sh.y + ((tgt.y - sh.y) / d) * sp, 60, ARENA_H - 60);
    } else if (state.t >= sh.next) {
      sh.next = state.t + sh.swing / Math.max(0.2, 1 + (u.asEff || 0.6) - 0.6);
      const prev = state.dmgSrc;
      state.dmgSrc = tr("ชุดเกราะของ Soulseverance");
      applyDamage(state, u, tgt, u.ad || 0, false, false, true);
      state.dmgSrc = prev;
    }
  }
  vfx(state, { kind: "ring", x: sh.x, y: sh.y, r: sh.radius, color: "150,160,170", grow: 0, dur: 0.1 });
  return true;
}

// ดาเมจที่ชุดเกราะกิน ไปหัก HP ของเจ้าของจริง (หลอดเดียวกัน)
// สลับเกราะ/ต้านเวทของเจ้าของเป็นของชุดเกราะชั่วคราว เพื่อให้โบนัสความถึก
// ของ R มีผลจริง — step.js คิดค่าพวกนี้ใหม่ทุกทิกอยู่แล้ว การสลับจึงปลอดภัย
function shellTakes(state, u, sh, src, amount, magic) {
  if (amount <= 0) return;
  // โล่ที่ E ส่งไปกางที่ชุดเกราะ ซับก่อนถึงหลอดเลือด
  if ((sh.shield || 0) > 0) {
    const eat = Math.min(sh.shield, amount);
    sh.shield -= eat;
    amount -= eat;
    if (amount <= 0) return;
  }
  const ar = u.armor, mr = u.mr;
  u.armor = ar + sh.res;
  u.mr = mr + sh.res;
  state.shellHit = true;
  try { applyDamage(state, src, u, amount, magic); }
  finally { state.shellHit = false; u.armor = ar; u.mr = mr; }
}

// ดาเมจที่เล็งมาที่ร่างวิญญาณ (โซน ออร่า อะไรที่ไม่สนว่าแตะได้ไหม)
// ถูกส่งต่อมาที่นี่จาก damage.js แล้วไปลงที่ชุดเกราะแทน
// คืน true ถ้ารับไว้แล้ว เพื่อให้ผู้เรียกรู้ว่าไม่ต้องทำอย่างอื่น
export function shellAbsorb(state, source, target, amount, magic) {
  if (!target.soulSplit) return false;
  const sh = L(state).shells.find((x) => x.ownerId === target.id);
  if (!sh) return false;
  shellTakes(state, target, sh, source, amount, magic);
  return true;
}

export function soulSplitTick(state, u) {
  const sp = u.soulSplit;
  if (!sp) return;
  const sh = L(state).shells.find((x) => x.ownerId === u.id);
  // หมดเวลา หรือวิญญาณห่างจากชุดเกราะเกินสายโยง = กระชากกลับรวมร่าง
  const far = sh && dist(u, sh) > sp.leash;
  if (state.t > sp.until || !sh || far) {
    if (sh) {
      place(u, sh.x, sh.y);
      L(state).shells = L(state).shells.filter((x) => x.ownerId !== u.id);
    }
    u.soulSplit = null;
    u.buffs = u.buffs.filter((b) =>
      !(b.type === "invuln" || b.type === "untargetable" || b.type === "disarm"));
    if (u.casket) u.casket.onShell = false;
    logKoschei(state, u, far ? "สายวิญญาณขาด ถูกกระชากกลับเข้าชุดเกราะ" : "รวมร่างกลับเข้าชุดเกราะ");
  }
}

// ---------------------------------------------------------------
// เดินเวลาต่อยูนิตของ KOSCHEI — เรียกจาก step.js ทุกทิก
// ---------------------------------------------------------------
export function koscheiTick(state, u) {
  if (!u.champ || !u.champ.phylactery) return;
  soulSplitTick(state, u);
  miasmaTick(state, u);
  casketTick(state, u);
}
