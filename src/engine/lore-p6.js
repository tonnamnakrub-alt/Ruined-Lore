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
  } else {
    const w = u.webThread;
    const dmg = sk.secondDmg[r] + (sk.secondApRatio || 0) * (u.ap || 0);
    applyDamage(state, u, target, dmg, true);
    if (target.id === w.targetId) {
      // เป้าเดิม — ตรึงเท้า
      addBuff(target, { type: "root", v: 1, until: state.t + sk.rootByRank[r] }, state.t);
    } else {
      // เป้าใหม่ — ดึงสองตัวเข้าหากันที่จุดกึ่งกลาง
      const first = state.units.find((x) => x.id === w.targetId && x.alive);
      if (first) {
        const mx = (first.x + target.x) / 2, my = (first.y + target.y) / 2;
        place(first, mx, my);
        place(target, mx, my);
        applyDamage(state, u, first, dmg, true);
        addBuff(first, { type: "root", v: 1, until: state.t + sk.rootByRank[r] }, state.t);
        addBuff(target, { type: "root", v: 1, until: state.t + sk.rootByRank[r] }, state.t);
      }
    }
    u.webThread = null;
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
    // ลดดาเมจที่เป้าทำได้ตลอดเวลาที่หวาดกลัว ใช้ช่องเดียวกับกรงของเฮลซิง
    e.outCut = Math.max(e.outCut || 0, sk.outCutByRank[r]);
    e.outCutUntil = state.t + sk.fearByRank[r];
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

  // ซากศพหมดอายุ
  lore.carcasses = lore.carcasses.filter((c) => state.t <= c.until);

  // ลดดาเมจจากหวาดกลัวหมดเวลาแล้วต้องคืนค่า
  // (กรงของเฮลซิงใช้ช่องเดียวกัน แต่กรงคืนค่าเองตอนหมดอายุ)
  for (const u of state.units) {
    if (u.outCutUntil && state.t > u.outCutUntil) { u.outCut = 0; u.outCutUntil = 0; }
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
    case "devour": castDevour(state, u, sk); return true;
    case "webThread": castWebThread(state, u, sk, target); return true;
    case "webField": castWebField(state, u, sk, target); return true;
    case "berserkWave": castBerserkWave(state, u, sk, target); return true;
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
  return l;
}
