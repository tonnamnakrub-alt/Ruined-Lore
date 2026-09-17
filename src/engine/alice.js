import { tr } from "../i18n.js";
import { applyDamage, grantShield, healUnit } from "./damage.js";
import { addBuff, addBuffUnique, dist, pushLog, skillLabel, vfx } from "./state-util.js";
import { clamp } from "./util.js";
import { ARENA_H, ARENA_W } from "../data/constants.js";


// ---------------------------------------------------------------
// กลไกของ Alice — The Dreamweaver of Wonderland
//
//   พาสซีฟ Curious Curiosity — สกิลโดนใครก็ตีตรา เป้าที่ติดตรารับดาเมจแรงขึ้นจากทุกแหล่ง
//     ส่วนที่เพิ่มจ่ายเป็น "ดาเมจเวท" แยกก้อน (บัฟ curiousAmp) ไม่ใช่ตัวคูณดาเมจต้นอีกต่อไป
//   Q teaGarden  — โซนค้างพื้น 3.5 วิ เต้นทุก 0.5 วิ ฮีลเพื่อน ตอดศัตรู สโลว์ตราบที่ยังยืนอยู่
//   W allyBlink  — หายตัว 0.25 วิ ไปโผล่ข้างเพื่อน แล้วแจกโล่รอบจุดที่โผล่
//   E polymorph  — สาปเป็นกระต่าย: ใบ้ + ปลดอาวุธ + เดินช้า (เก็บเป็นบัฟสามตัว)
//   R wonderland — ระเบิดทันทีพร้อมใบ้ แล้วทิ้งโซนสโลว์หนักไว้ 4 วิ
// ---------------------------------------------------------------

const SKILL_SRC = /^[QWER] /;


// ---- พาสซีฟ ----
export function onAliceDamage(state, source, target, isAuto) {
  const cfg = source && source.champ && source.champ.curious;
  if (!cfg || isAuto || !target.alive || source.team === target.team) return;
  if (!SKILL_SRC.test(String(state.dmgSrc || ""))) return;
  const v = cfg.base + cfg.perAp * (source.ap || 0);
  addBuffUnique(target, "curious:" + source.id, { type: "curiousAmp", v, until: state.t + cfg.dur }, state.t);
}


// ---- Q ----
export function castTeaGarden(state, u, sk, x, y) {
  state.gardens.push({
    ownerId: u.id, team: u.team, skill: sk, x, y, r: sk.radius,
    until: state.t + sk.dur, next: state.t, rank: Math.max(0, sk.rank - 1),
  });
  vfx(state, { kind: "ring", x, y, r: sk.radius, color: "255,143,208", grow: 0.2, dur: sk.dur });
}


export function tickGardens(state) {
  state.gardens = state.gardens.filter((g) => {
    const u = state.units.find((x) => x.id === g.ownerId);
    if (!u) return false;
    const sk = g.skill;
    // สโลว์ทำงานตลอดเวลาที่ยืนอยู่ในวง ไม่ใช่แค่ตอนจังหวะเต้น
    for (const e of state.units) {
      if (!e.alive || e.team === g.team) continue;
      if (dist({ x: g.x, y: g.y }, e) > g.r + e.radius) continue;
      addBuffUnique(e, "garden:" + g.ownerId, { type: "slow", v: sk.slowByRank[g.rank], until: state.t + 0.3 }, state.t);
    }
    if (state.t >= g.next) {
      g.next = state.t + sk.every;
      const prev = state.dmgSrc;
      state.dmgSrc = skillLabel(u, sk);
      for (const e of state.units) {
        if (!e.alive) continue;
        if (dist({ x: g.x, y: g.y }, e) > g.r + e.radius) continue;
        if (e.team === g.team) healUnit(state, e, sk.heal[g.rank] + (sk.healAp || 0) * u.ap);
        else applyDamage(state, u, e, sk.dmg[g.rank] + (sk.apRatio || 0) * u.ap, true);
      }
      state.dmgSrc = prev;
      vfx(state, { kind: "ring", x: g.x, y: g.y, r: g.r, color: "255,143,208", grow: 0.1, dur: 0.25 });
    }
    return state.t < g.until;
  });
}


// ---- W ----
export function castAllyBlink(state, u, sk) {
  const r = Math.max(0, sk.rank - 1);
  // เลือกเพื่อนที่เลือดพร่องที่สุดในระยะ ถ้าไม่มีก็กางโล่อยู่กับที่
  let best = null;
  for (const a of state.units) {
    if (!a.alive || a.team !== u.team || a.id === u.id) continue;
    if (dist(u, a) > sk.range) continue;
    const need = 1 - a.hp / a.maxHp;
    if (!best || need > best.need) best = { a, need };
  }
  addBuff(u, { type: "untargetable", v: 1, until: state.t + sk.hide }, state.t);
  if (best) {
    const a = best.a;
    const d = dist(u, a) || 1;
    u.x = clamp(a.x + ((u.x - a.x) / d) * (u.radius + a.radius), 30, ARENA_W - 30);
    u.y = clamp(a.y + ((u.y - a.y) / d) * (u.radius + a.radius), 30, ARENA_H - 30);
    vfx(state, { kind: "trail", x: u.x, y: u.y, color: "255,143,208", pending: u.id });
  }
  const amount = sk.shield[r] + (sk.shieldAp || 0) * u.ap;
  for (const a of state.units) {
    if (!a.alive || a.team !== u.team) continue;
    if (a.id !== u.id && dist(u, a) > sk.radius + a.radius) continue;
    grantShield(a, amount);
    a.buffs.push({ type: "shield", v: 1, until: state.t + sk.shieldDur });
  }
  vfx(state, { kind: "ring", x: u.x, y: u.y, r: sk.radius, color: "255,143,208", grow: 0.9, dur: 0.6 });
}


// ---- E — สาปกลายร่าง ----
export function applyPolymorph(state, owner, target, dur, slow) {
  addBuff(target, { type: "silence", v: 1, until: state.t + dur }, state.t);
  addBuff(target, { type: "disarm", v: 1, until: state.t + dur }, state.t);
  addBuff(target, { type: "slow", v: slow, until: state.t + dur }, state.t);
  target.charging = null;
  target.channeling = null;
  vfx(state, { kind: "ring", x: target.x, y: target.y, r: target.radius + 20, color: "255,143,208", grow: 0.9 });
  pushLog(state, tr(
    "{0} {1} สาป {2} เป็นกระต่าย",
    owner.team === "blue" ? "🔵" : "🔴", tr(owner.champ.th), tr(target.champ.th)
  ));
}


// ---- R ----
export function castWonderland(state, u, sk, x, y) {
  const r = Math.max(0, sk.rank - 1);
  const prev = state.dmgSrc;
  state.dmgSrc = skillLabel(u, sk);
  for (const e of state.units) {
    if (!e.alive || e.team === u.team) continue;
    if (Math.hypot(e.x - x, e.y - y) > sk.radius + e.radius) continue;
    applyDamage(state, u, e, sk.dmg[r] + (sk.apRatio || 0) * u.ap, true);
    addBuff(e, { type: "silence", v: 1, until: state.t + sk.silenceByRank[r] }, state.t);
  }
  state.dmgSrc = prev;
  state.mirrors.push({ ownerId: u.id, team: u.team, x, y, r: sk.radius, until: state.t + sk.dur, slow: sk.slowByRank[r] });
  vfx(state, { kind: "ring", x, y, r: sk.radius, color: "214,120,232", grow: 1, dur: 0.8 });
  pushLog(state, tr("{0} {1} กางอาณาเขตมหัศจรรย์", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
}


export function tickMirrors(state) {
  state.mirrors = state.mirrors.filter((m) => {
    for (const e of state.units) {
      if (!e.alive || e.team === m.team) continue;
      if (Math.hypot(e.x - m.x, e.y - m.y) > m.r + e.radius) continue;
      addBuffUnique(e, "mirror:" + m.ownerId, { type: "slow", v: m.slow, until: state.t + 0.3 }, state.t);
    }
    return state.t < m.until;
  });
}
