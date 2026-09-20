import { tr } from "../i18n.js";
import { ARENA_H, ARENA_W } from "../data/constants.js";
import { ASSIST_GROUP, ASSIST_SOLO, KILL } from "../data/behaviour.js";
import { applyDamage, grantShield, healUnit, skillPower } from "./damage.js";
import { addBuff, addBuffUnique, buffSum, dist, hasBuff, pushLog, skillLabel, vfx } from "./state-util.js";
import { fullCd } from "./stats.js";
import { alliesOf, enemiesOf } from "./targeting.js";
import { clamp } from "./util.js";


// ---------------------------------------------------------------
// Patch 0.3 — กลไกของตัวละครใหม่ 10 ตัว
//
// แยกไว้ไฟล์เดียวเพื่อไม่ให้ fire-skill.js กับ step.js บวมไปมากกว่านี้
// fire-skill.js เรียก fireLoreSkill() เมื่อเจอ type ที่มันไม่รู้จัก
// step.js เรียก tickLoreUnit() ทุกเฟรมต่อยูนิต และ systems.js เรียก tickLore()
// ---------------------------------------------------------------

const R = (sk) => Math.max(0, (sk.rank || 1) - 1);
const at = (arr, sk) => (Array.isArray(arr) ? arr[R(sk)] : arr);
// ค่าที่ไล่ขึ้นตามเลเวล 1-18 แบบเชิงเส้น
export const byLevel = (cfg, level) => (cfg.base || 0) + (cfg.perLevel || 0) * ((level || 1) - 1);

// พื้นที่เก็บของกลไกใหม่ — ผูกไว้กับ state ก้อนเดียว จะได้ไม่ไปชนกับของเดิม
export function loreState() {
  return { vortex: [], pets: [], walls: [], bunkers: [], channels: [], storms: [], slams: [], sights: [] };
}
const L = (state) => (state.lore || (state.lore = loreState()));

// ตัวคูณขนาดสกิลของ H.S.B — ขั้นหมูยิ่งน้อย สกิลยิ่งกว้าง
export const skillScale = (u) => (u && u.pigSkill) || 1;

function inCone(u, e, baseAng, half, range) {
  const d = dist(u, e);
  if (d > range + e.radius) return false;
  const a = Math.atan2(e.y - u.y, e.x - u.x);
  return Math.abs(((a - baseAng + Math.PI * 3) % (Math.PI * 2)) - Math.PI) <= half;
}

function onLine(u, nx, ny, e, len, halfW) {
  const rx = e.x - u.x, ry = e.y - u.y;
  const along = rx * nx + ry * ny;
  if (along < -e.radius || along > len + e.radius) return false;
  return Math.abs(rx * -ny + ry * nx) <= halfW + e.radius;
}

const place = (u, x, y) => {
  u.x = clamp(x, u.radius, ARENA_W - u.radius);
  u.y = clamp(y, u.radius, ARENA_H - u.radius);
};


// ---------------------------------------------------------------
// ร่ายสกิล — เรียกจาก fire-skill.js เมื่อเจอ type ที่มันไม่รู้จัก
// คืน true = จัดการแล้ว
// ---------------------------------------------------------------
export function fireLoreSkill(state, u, sk, target, prec, aim) {
  const r = R(sk);
  const sc = skillScale(u);
  const power = skillPower(u, sk, target);
  const face = target ? Math.atan2(target.y - u.y, target.x - u.x) : 0;

  switch (sk.type) {
    // ---- ELLA Q — คอมโบ 3 จังหวะ ----
    case "combo": {
      const step = sk.steps[Math.min(u.comboStep || 0, sk.steps.length - 1)];
      const dmg = at(step.dmg, sk) + (step.apRatio || 0) * u.ap + (step.badRatio || 0) * u.bonusAd;
      if (step.dashRange && target) {
        const dd = dist(u, target) || 1;
        vfx(state, { kind: "trail", x: u.x, y: u.y, color: "214,190,255", pending: u.id });
        place(u, u.x + ((target.x - u.x) / dd) * Math.min(dd, step.dashRange),
          u.y + ((target.y - u.y) / dd) * Math.min(dd, step.dashRange));
        applyDamage(state, u, target, dmg, true);
        vfx(state, { kind: "shards", x: target.x, y: target.y, r: 110, color: "214,190,255", dur: 0.55 });
      } else if (step.radius) {
        vfx(state, { kind: "cone", x: u.x, y: u.y, r: step.radius * sc, ang: face, half: Math.PI / 2, color: "214,190,255", dur: 0.5 });
        vfx(state, { kind: "slashes", x: u.x, y: u.y, r: step.radius * sc, ang: face, half: Math.PI / 2, count: 4, color: "214,190,255", dur: 0.5 });
        for (const e of enemiesOf(state, u)) {
          if (!inCone(u, e, face, Math.PI / 2, step.radius * sc)) continue;
          applyDamage(state, u, e, dmg, true);
          vfx(state, { kind: "shards", x: e.x, y: e.y, r: 90, color: "214,190,255", dur: 0.5 });
        }
      } else if (target) {
        let hit = dmg;
        if (step.pctMissingHp) hit += Math.max(0, target.maxHp - target.hp) * at(step.pctMissingHp, sk);
        applyDamage(state, u, target, hit, true);
        vfx(state, { kind: "beam", x: u.x, y: u.y, x2: target.x, y2: target.y, w: 8, color: "214,190,255" });
        vfx(state, { kind: "shards", x: target.x, y: target.y, r: 150, count: 14, color: "214,190,255", dur: 0.7 });
        if (step.backstep) {
          const dd = dist(u, target) || 1;
          vfx(state, { kind: "trail", x: u.x, y: u.y, color: "214,190,255", pending: u.id });
          place(u, u.x - ((target.x - u.x) / dd) * step.backstep, u.y - ((target.y - u.y) / dd) * step.backstep);
        }
      }
      // จังหวะถัดไปจะปลดล็อกได้ต่อเมื่อออโต้โดนอีกครั้ง (ยกเว้นจังหวะสุดท้าย)
      const next = (u.comboStep || 0) + 1;
      if (next >= sk.steps.length) { u.comboStep = 0; u.comboUntil = 0; u.comboArmed = false; }
      else { u.comboStep = next; u.comboUntil = state.t + (sk.window || 5); u.comboArmed = !step.needAuto; }
      return true;
    }

    // ---- ELLA W — สะสมดาเมจบนตัวเป้า แล้วสั่งระเบิด ----
    case "damageStash": {
      let best = null, bestAmt = 0;
      for (const e of enemiesOf(state, u)) {
        if (dist(u, e) > sk.range) continue;
        const st = e.chime && e.chime.ownerId === u.id && state.t < e.chime.until ? e.chime.amt : 0;
        if (st >= bestAmt) { bestAmt = st; best = e; }
      }
      const tgt = best || target;
      if (!tgt) return true;
      const stored = tgt.chime && tgt.chime.ownerId === u.id && state.t < tgt.chime.until ? tgt.chime.amt : 0;
      tgt.chime = null;
      vfx(state, { kind: "clock", x: tgt.x, y: tgt.y, r: tgt.radius + 54, frac: 1, color: "232,214,120", dur: 0.35 });
      vfx(state, { kind: "ring", x: tgt.x, y: tgt.y, r: tgt.radius + 60, color: "232,214,120", grow: 1.2, dur: 0.6 });
      vfx(state, { kind: "shards", x: tgt.x, y: tgt.y, r: 170, count: 16, color: "232,214,120", dur: 0.7 });
      applyDamage(state, u, tgt, power + stored, true);
      return true;
    }

    // ---- ELLA E · กระโดดลอยตัวแตะไม่ได้ แล้วลงมาพร้อมความเร็ว ----
    case "skyward": {
      const air = sk.airTime || 0.75;
      addBuff(u, { type: "untargetable", v: 1, until: state.t + air }, state.t);
      addBuff(u, { type: "invuln", v: 1, until: state.t + air }, state.t);
      addBuff(u, { type: "root", v: 1, until: state.t + air }, state.t);
      u.skyLand = { at: state.t + air, ms: at(sk.msBuff, sk), dur: sk.dur || 2 };
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 40, color: "228,235,247", grow: 1, dur: air });
      vfx(state, { kind: "shards", x: u.x, y: u.y, r: 80, count: 7, color: "228,235,247", dur: 0.5 });
      return true;
    }

    // ---- ELLA R · ล่องหน แล้วเปิดตัวด้วยออโต้ที่ลากรถม้าตามมาทุบ ----
    case "carriage": {
      addBuff(u, { type: "stealth", v: 1, until: state.t + sk.dur }, state.t);
      addBuff(u, { type: "ms", v: at(sk.msPct, sk), until: state.t + sk.dur }, state.t);
      u.carriage = { until: state.t + sk.dur, sk };
      u.range = u.champ.range + (sk.openRange - u.champ.range);
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: 220, color: "232,163,61", grow: 1, dur: 0.7 });
      pushLog(state, tr("{0} {1} หายเข้าไปในราชรถ", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
      return true;
    }

    // ---- PIROSKA W · ตะกร้าเสบียง ----
    case "basketZone": {
      const dd = dist(u, target) || 1;
      const cx = u.x + ((target.x - u.x) / dd) * Math.min(dd, sk.range);
      const cy = u.y + ((target.y - u.y) / dd) * Math.min(dd, sk.range);
      L(state).sights.push({
        kind: "basket", ownerId: u.id, team: u.team, x: cx, y: cy, r: sk.radius * sc,
        until: state.t + sk.life, next: state.t + sk.every, every: sk.every, sk, rank: r,
      });
      vfx(state, { kind: "ring", x: cx, y: cy, r: sk.radius * sc, color: "232,163,61", grow: 0.4, dur: 0.8 });
      return true;
    }

    // ---- PIROSKA E · จูงเพื่อนวิ่ง ----
    case "allyRush": {
      const pool = alliesOf(state, u).filter((a) => dist(u, a) <= sk.range && a.id !== u.id);
      const mate = pool.length ? pool.reduce((x, y) => (dist(u, y) < dist(u, x) ? y : x)) : null;
      const v = at(sk.msBuff, sk) + (sk.msPerAp || 0) * u.ap;
      for (const a of mate ? [u, mate] : [u]) {
        addBuffUnique(a, "sprint:" + u.id, { type: "ms", v, decayFrom: state.t, until: state.t + sk.dur }, state.t);
        if (sk.ghost) addBuffUnique(a, "sprintghost:" + u.id, { type: "ghost", v: 1, until: state.t + sk.dur }, state.t);
        vfx(state, { kind: "ring", x: a.x, y: a.y, r: a.radius + 22, color: "229,72,77", grow: 0.7 });
      }
      return true;
    }

    // ---- PIROSKA R · ออร่าความจริง ----
    case "truthAura": {
      u.truthAura = { until: state.t + sk.dur, radius: sk.radius, amp: at(sk.amp, sk) + (sk.ampPerAp || 0) * u.ap };
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: sk.radius, color: "232,214,120", grow: 0.5, dur: 1 });
      pushLog(state, tr("{0} {1} เปิดออร่าความจริง", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
      return true;
    }

    // ---- YODAKA Q · พายุลอยช้าแล้วค้างเป็นวังวน ----
    case "vortex": {
      const ang = face;
      L(state).vortex.push({
        ownerId: u.id, team: u.team, x: u.x, y: u.y, nx: Math.cos(ang), ny: Math.sin(ang),
        speed: sk.projSpeed, left: sk.range, halfW: (sk.width * sc) / 2, sk, rank: r,
        dmg: power, hitIds: [], parked: 0, next: 0, radius: sk.zoneRadius * sc,
      });
      return true;
    }

    // ---- YODAKA E · พุ่งเป็นสามเหลี่ยมแล้วกลับจุดเดิม ----
    case "deltaDash": {
      const side = sk.side;
      const p0 = { x: u.x, y: u.y };
      const pts = [p0];
      for (let i = 0; i < 3; i++) {
        const a = face + (i * 2 * Math.PI) / 3;
        const prev = pts[pts.length - 1];
        pts.push({ x: prev.x + Math.cos(a) * side, y: prev.y + Math.sin(a) * side });
      }
      const edgeDmg = at(sk.dmg, sk) + (sk.apRatio || 0) * u.ap;
      const innerDmg = at(sk.innerDmg, sk) + (sk.innerApRatio || 0) * u.ap;
      const hit = new Set();
      for (let i = 0; i < 3; i++) {
        const a = pts[i], b = pts[i + 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const nx = (b.x - a.x) / len, ny = (b.y - a.y) / len;
        vfx(state, { kind: "beam", x: a.x, y: a.y, x2: b.x, y2: b.y, w: (sk.width * sc) / 2, color: "126,199,255", dur: 0.5 });
        for (const e of enemiesOf(state, u)) {
          if (hit.has(e.id)) continue;
          if (!onLine(a, nx, ny, e, len, (sk.width * sc) / 2)) continue;
          hit.add(e.id);
          applyDamage(state, u, e, edgeDmg, true);
        }
      }
      // ใครที่ยืนในกรอบสามเหลี่ยมแต่ไม่โดนขอบ กินดาเมจเบากว่า
      const cx = (pts[0].x + pts[1].x + pts[2].x) / 3, cy = (pts[0].y + pts[1].y + pts[2].y) / 3;
      vfx(state, { kind: "tri", x: cx, y: cy, side: side * sc, ang: face, color: "126,199,255", dur: 0.85 });
      for (const e of enemiesOf(state, u)) {
        if (hit.has(e.id)) continue;
        if (Math.hypot(e.x - cx, e.y - cy) > side * 0.58) continue;
        applyDamage(state, u, e, innerDmg, true);
      }
      addBuff(u, { type: "untargetable", v: 1, until: state.t + sk.travel }, state.t);
      return true;
    }

    // ---- YODAKA R · เหาะขึ้นฟ้าแล้วดิ่งลงกลางวง ----
    case "starfall": {
      const air = sk.airTime;
      addBuff(u, { type: "untargetable", v: 1, until: state.t + air }, state.t);
      addBuff(u, { type: "invuln", v: 1, until: state.t + air }, state.t);
      L(state).slams.push({
        kind: "starfall", ownerId: u.id, team: u.team, at: state.t + air, sk, rank: r,
        radius: sk.radius * sc, dmg: power, follow: true,
      });
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: sk.radius * sc, color: "126,199,255", grow: 0.2, dur: air });
      return true;
    }

    // ---- TOTSAKAN W · พุ่งชนตัวแรกแล้วเหวี่ยงข้ามหัว ----
    case "chargeFling": {
      u.dashing = {
        dx: Math.cos(face), dy: Math.sin(face), left: sk.dashRange, sk, frac: 1, hitIds: [],
        fling: { toss: sk.toss, airborne: sk.airborne, dmg: power, sk, rank: r },
      };
      vfx(state, { kind: "trail", x: u.x, y: u.y, color: "255,208,138", pending: u.id });
      return true;
    }

    // ---- TOTSAKAN R · ทุบพื้น 3 ระลอก วงกว้างขึ้นเรื่อยๆ ----
    case "tripleSlam": {
      if (sk.selfRoot) addBuff(u, { type: "root", v: 1, until: state.t + sk.every * sk.waves.length + 0.1 }, state.t);
      for (let i = 0; i < sk.waves.length; i++) {
        L(state).slams.push({
          kind: "triple", ownerId: u.id, team: u.team, at: state.t + sk.every * (i + 1),
          sk, rank: r, wave: sk.waves[i], radius: sk.waves[i].radius * sc,
        });
      }
      pushLog(state, tr("{0} {1} ทุบพื้นสามระลอก", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
      return true;
    }

    // ---- HOOD W · ตีเร็วมากช่วงแรกแล้วลดลง ----
    case "rampBuff": {
      addBuff(u, { type: "as", v: at(sk.burstAs, sk), until: state.t + sk.burstDur }, state.t);
      u.rampNext = { at: state.t + sk.burstDur, as: at(sk.holdAs, sk), dur: sk.holdDur };
      vfx(state, { kind: "aura", id: u.id, r: u.radius + 24, color: "63,191,127", dur: sk.burstDur + sk.holdDur });
      return true;
    }

    // ---- HOOD E · บั้งไฟส่องสว่าง เปิดตัวคนล่องหน ----
    case "sightZone": {
      const dd = dist(u, target) || 1;
      const cx = u.x + ((target.x - u.x) / dd) * Math.min(dd, sk.range);
      const cy = u.y + ((target.y - u.y) / dd) * Math.min(dd, sk.range);
      L(state).sights.push({
        kind: "flare", ownerId: u.id, team: u.team, x: cx, y: cy, r: sk.radius * sc,
        until: state.t + sk.life, revealDur: sk.revealDur, sk, rank: r, next: 0, every: 0.25,
      });
      vfx(state, { kind: "ring", x: cx, y: cy, r: sk.radius * sc, color: "232,214,120", grow: 0.3, dur: 1 });
      return true;
    }

    // ---- JACK R · อัญเชิญยักษ์ ----
    case "summonGiant": {
      const dd = dist(u, target) || 1;
      const cx = u.x + ((target.x - u.x) / dd) * Math.min(dd, sk.range);
      const cy = u.y + ((target.y - u.y) / dd) * Math.min(dd, sk.range);
      vfx(state, { kind: "slam", x: cx, y: cy, r: sk.radius, color: "110,98,86", dur: 1 });
      vfx(state, { kind: "shock", x: cx, y: cy, r: sk.radius, color: "232,214,120", dur: 0.8 });
      vfx(state, { kind: "debris", x: cx, y: cy, r: sk.radius * 0.8, color: "214,170,96", dur: 0.85 });
      for (const e of enemiesOf(state, u)) {
        if (Math.hypot(e.x - cx, e.y - cy) > sk.radius + e.radius) continue;
        applyDamage(state, u, e, power, true);
        const kd = Math.hypot(e.x - cx, e.y - cy) || 1;
        place(e, e.x + ((e.x - cx) / kd) * sk.knockback, e.y + ((e.y - cy) / kd) * sk.knockback);
      }
      const p = sk.pet;
      const lore = L(state);
      // ยักษ์ตัวเดิมถูกแทนที่ ไม่ซ้อนกันสองตัว
      lore.pets = lore.pets.filter((g) => g.ownerId !== u.id);
      lore.pets.push({
        ownerId: u.id, team: u.team, x: cx, y: cy, vx: 0, vy: 0,
        hp: at(p.hp, sk) + p.hpAp * u.ap, maxHp: at(p.hp, sk) + p.hpAp * u.ap,
        ad: at(p.ad, sk) + p.adAp * u.ap,
        armor: at(p.res, sk) + p.resAp * u.ap, mr: at(p.res, sk) + p.resAp * u.ap,
        ms: p.ms, radius: 110, shield: 0, until: state.t + sk.life,
        step: 0, next: state.t + p.swing, swing: p.swing, hits: p.hits, sk, rank: r,
        as: 0, msBuff: 0, buffUntil: 0,
      });
      pushLog(state, tr("{0} {1} เรียกยักษ์สวรรค์ลงมา", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
      return true;
    }

    // ---- PUSS W · ยืนแทงรัวเป็นกรวย ----
    case "channelCone": {
      u.channeling = {
        skill: sk, left: sk.ticks, next: state.t, range: sk.range * sc, lore: "cone",
        ang: face, half: ((sk.angle || 50) * Math.PI) / 180 / 2, rank: r,
      };
      if (sk.selfRoot) addBuff(u, { type: "root", v: 1, until: state.t + sk.ticks * sk.every + 0.05 }, state.t);
      return true;
    }

    // ---- PUSS R · ฟันกระเด้ง 5 ครั้ง ----
    case "bounceSlash": {
      const first = (u.duelMarkId && state.units.find((x) => x.id === u.duelMarkId && x.alive)) || target;
      if (!first) return true;
      addBuff(u, { type: "untargetable", v: 1, until: state.t + sk.hits * sk.every + 0.1 }, state.t);
      addBuff(u, { type: "invuln", v: 1, until: state.t + sk.hits * sk.every + 0.1 }, state.t);
      u.flourish = {
        sk, rank: r, left: sk.hits, next: state.t, targetId: first.id, seen: {},
        base: at(sk.dmg, sk) + (sk.badRatio || 0) * u.bonusAd,
      };
      return true;
    }

    // ---- NIAN E · คำรามเป็นกรวย 3 ระลอก ----
    case "coneVolley": {
      u.channeling = {
        skill: sk, left: sk.ticks, next: state.t, range: sk.range * sc, lore: "cone",
        ang: face, half: ((sk.angle || 60) * Math.PI) / 180 / 2, rank: r, magic: true, follow: true,
      };
      return true;
    }

    // ---- NIAN R · พายุสายฟ้า ----
    case "tempest": {
      const dd = dist(u, target) || 1;
      const cx = u.x + ((target.x - u.x) / dd) * Math.min(dd, sk.range);
      const cy = u.y + ((target.y - u.y) / dd) * Math.min(dd, sk.range);
      L(state).storms.push({
        ownerId: u.id, team: u.team, x: cx, y: cy, r: sk.radius * sc,
        left: sk.strikes, next: state.t + sk.every, every: sk.every, sk, rank: r,
      });
      vfx(state, { kind: "ring", x: cx, y: cy, r: sk.radius * sc, color: "126,199,255", grow: 0.2, dur: sk.dur });
      pushLog(state, tr("{0} {1} เรียกพายุอสนีบาต", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
      return true;
    }

    // ---- H.S.B Q · ขว้างค้อน (ซ่อมของตัวเองได้) ----
    case "sledge": {
      // ถ้ามีกำแพงหรือบ้านของตัวเองอยู่และเลือดไม่เต็ม ให้ขว้างไปซ่อมแทน
      const lore = L(state);
      const mine = [...lore.walls, ...lore.bunkers].filter((w) => w.ownerId === u.id && w.hp < w.maxHp);
      if (mine.length) {
        const w = mine.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a));
        const heal = at(sk.repair, sk) + sk.repairBonusHp * (u.bonusHp || 0)
          + sk.repairRes * ((u.armor || 0) + (u.mr || 0));
        w.hp = Math.min(w.maxHp, w.hp + heal);
        vfx(state, { kind: "beam", x: u.x, y: u.y, x2: w.x, y2: w.y, w: 8, color: "232,163,61" });
        vfx(state, { kind: "ring", x: w.x, y: w.y, r: 90, color: "232,163,61", grow: 0.8 });
        const q = u.skills.find((x) => x.key === sk.key);
        if (q) q.cdLeft *= 1 - (sk.repairCdCut || 0.5);
        return true;
      }
      state.projectiles.push({
        id: state.nextProjId++, team: u.team, ownerId: u.id, skill: sk,
        x: u.x, y: u.y, dx: Math.cos(face), dy: Math.sin(face), speed: sk.projSpeed,
        dmg: power, magic: false, width: sk.width * sc, pierce: false,
        slow: at(sk.slowByRank, sk), dur: sk.dur,
        life: sk.range / sk.projSpeed, hitIds: [],
      });
      return true;
    }

    // ---- H.S.B W · กำแพงอิฐ ----
    case "wall": {
      const dd = dist(u, target) || 1;
      const cx = u.x + ((target.x - u.x) / dd) * Math.min(dd, sk.range);
      const cy = u.y + ((target.y - u.y) / dd) * Math.min(dd, sk.range);
      const hp = (at(sk.hp, sk) + sk.hpBonusHp * (u.bonusHp || 0)) * ((u.pigBuild) || 1);
      L(state).walls.push({
        ownerId: u.id, team: u.team, x: cx, y: cy,
        nx: -Math.sin(face), ny: Math.cos(face), half: (sk.span * sc) / 2,
        hp, maxHp: hp, until: state.t + sk.life,
      });
      vfx(state, { kind: "beam", x: cx - Math.sin(face) * sk.span * sc * 0.5, y: cy + Math.cos(face) * sk.span * sc * 0.5,
        x2: cx + Math.sin(face) * sk.span * sc * 0.5, y2: cy - Math.cos(face) * sk.span * sc * 0.5,
        w: 24, color: "232,163,61", dur: 0.6 });
      return true;
    }

    // ---- H.S.B E · พุ่งทะลุ ชนกำแพงแล้วระเบิด ----
    case "steerDash": {
      u.dashing = {
        dx: Math.cos(face), dy: Math.sin(face), left: sk.dashRange, sk, frac: 1, hitIds: [],
        boar: { radius: sk.hitRadius * sc, rank: r },
      };
      vfx(state, { kind: "trail", x: u.x, y: u.y, color: "255,208,138", pending: u.id });
      return true;
    }

    // ---- H.S.B R · บ้านอิฐล้อมตัวเอง ----
    case "bunker": {
      const hp = (at(sk.hp, sk) + sk.hpBonusHp * (u.bonusHp || 0)) * ((u.pigBuild) || 1);
      const rad = sk.radius * sc;
      for (const e of enemiesOf(state, u)) {
        const d = dist(u, e);
        if (d > rad + e.radius) continue;
        const k = d || 1;
        place(e, e.x + ((e.x - u.x) / k) * sk.knockback, e.y + ((e.y - u.y) / k) * sk.knockback);
      }
      L(state).bunkers.push({
        ownerId: u.id, team: u.team, x: u.x, y: u.y, r: rad,
        hp, maxHp: hp, until: state.t + sk.life, sk, rank: r,
      });
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: rad, color: "232,163,61", grow: 0.3, dur: 1 });
      pushLog(state, tr("{0} {1} ก่อบ้านอิฐคุ้มภัย", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
      return true;
    }

    // ---- ARTHUR W · กระแทกด้ามดาบ (กดได้แม้ติด CC) ----
    case "pommel": {
      const wasCc = hasBuff(u, "stun") || hasBuff(u, "root") || hasBuff(u, "taunt") || hasBuff(u, "silence");
      if (target && dist(u, target) <= sk.range + target.radius) {
        applyDamage(state, u, target, power, false);
        addBuff(target, { type: "stun", v: 1, until: state.t + at(sk.stunByRank, sk) }, state.t);
        vfx(state, { kind: "flash", x: target.x, y: target.y, r: 70, color: "255,236,190" });
      }
      if (wasCc) {
        const whirl = at(sk.whirlDmg, sk) + (sk.whirlBadRatio || 0) * u.bonusAd;
        vfx(state, { kind: "shock", x: u.x, y: u.y, r: sk.whirlRadius, color: "255,208,138", dur: 0.6 });
        // หมุนฟันสวนรอบตัวเต็ม 360 องศา
        vfx(state, { kind: "slashes", x: u.x, y: u.y, r: sk.whirlRadius, ang: 0, half: Math.PI, count: 8, color: "255,236,190", dur: 0.5 });
        for (const e of enemiesOf(state, u)) {
          if (dist(u, e) > sk.whirlRadius + e.radius) continue;
          applyDamage(state, u, e, whirl, false);
        }
        // ตัดเวลา CC ที่เหลืออยู่บนตัวเองลงครึ่งหนึ่ง
        for (const b of u.buffs) {
          if (!["stun", "root", "taunt", "silence", "fear", "charm"].includes(b.type)) continue;
          b.until = state.t + (b.until - state.t) * (1 - (sk.ccCut || 0.5));
        }
      }
      return true;
    }

    // ---- ARTHUR E · พุ่งแล้วฟันครึ่งวง ----
    case "lungeSweep": {
      const dd = dist(u, target) || 1;
      const go = Math.min(dd, sk.dashRange);
      const nx = (target.x - u.x) / dd, ny = (target.y - u.y) / dd;
      const dashDmg = at(sk.dmg, sk) + (sk.badRatio || 0) * u.bonusAd;
      const sweepDmg = at(sk.sweepDmg, sk) + (sk.sweepBadRatio || 0) * u.bonusAd;
      const dashed = new Set();
      for (const e of enemiesOf(state, u)) {
        if (!onLine(u, nx, ny, e, go, 70)) continue;
        dashed.add(e.id);
        applyDamage(state, u, e, dashDmg, false);
      }
      vfx(state, { kind: "trail", x: u.x, y: u.y, color: "140,190,255", pending: u.id });
      place(u, u.x + nx * go, u.y + ny * go);
      let dual = false;
      vfx(state, { kind: "cone", x: u.x, y: u.y, r: sk.sweepRadius, ang: face, half: Math.PI / 2, color: "255,208,138", dur: 0.5 });
      vfx(state, { kind: "slashes", x: u.x, y: u.y, r: sk.sweepRadius, ang: face, half: Math.PI / 2, count: 3, color: "255,236,190", dur: 0.45 });
      for (const e of enemiesOf(state, u)) {
        if (!inCone(u, e, face, Math.PI / 2, sk.sweepRadius)) continue;
        applyDamage(state, u, e, sweepDmg, false);
        if (dashed.has(e.id)) dual = true;
      }
      if (dual) {
        addBuff(u, { type: "as", v: at(sk.dualAs, sk), until: state.t + sk.dualDur }, state.t);
        grantShield(u, at(sk.dualShield, sk) + (sk.dualShieldBad || 0) * u.bonusAd);
        addBuffUnique(u, "knightward", { type: "shield", v: 1, until: state.t + sk.dualDur }, state.t);
        vfx(state, { kind: "aura", id: u.id, r: u.radius + 28, color: "228,235,247", dur: sk.dualDur });
      }
      return true;
    }

    // ---- ARTHUR R · ดาบพิพากษา ดาเมจจริง + ประหาร ----
    case "judgment": {
      if (!target) return true;
      const dmg = at(sk.dmg, sk) + (sk.badRatio || 0) * u.bonusAd;
      vfx(state, { kind: "beam", x: target.x, y: target.y - 400, x2: target.x, y2: target.y, w: 18, color: "255,236,190", dur: 0.6 });
      vfx(state, { kind: "flash", x: target.x, y: target.y, r: 140, color: "255,236,190", dur: 0.5 });
      applyDamage(state, u, target, dmg, false, true);
      const thresh = at(sk.execAt, sk) + (sk.execPerBad || 0) * (u.bonusAd || 0);
      if (target.alive && target.hp > 0 && target.hp / target.maxHp < thresh) {
        state.dmgSrc = skillLabel(u, sk);
        applyDamage(state, u, target, target.hp + target.shield + 1, false, true);
        pushLog(state, tr("{0} {1} พิพากษา {2}", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th), tr(target.champ.th)));
      }
      if (!target.alive) {
        const cfg = u.champ.aegis;
        if (cfg) grantShield(u, u.maxHp * cfg.cap);
        addBuff(u, { type: "shield", v: 1, until: state.t + 3.5 }, state.t);
        addBuff(u, { type: "ms", v: sk.killMs, until: state.t + sk.killMsDur }, state.t);
      }
      return true;
    }
  }
  return false;
}


// ---------------------------------------------------------------
// ทุกเฟรม ต่อยูนิต — เรียกจาก step.js PASS 0
// ---------------------------------------------------------------
export function tickLoreUnit(state, u, dt) {
  const ch = u.champ;
  void dt;

  // HOOD — ตัวนับเลือดไหลบนแผงสแตก อ่านจาก u.bleedStacks ซึ่งไม่เคยมีใครเซ็ตให้เลย
  // ตัวนับจึงขึ้น 0 ตลอดทั้งที่พาสซีฟทำงานอยู่ ผู้เล่นเลยนึกว่าคริแล้วไม่เกิดอะไรขึ้น
  // นับจากจำนวนชั้นที่ค้างอยู่บนเป้าตัวที่โดนหนักสุด เพราะเพดาน 5 ชั้นคิดแยกรายเป้า
  if (ch.critBleed) {
    const per = {};
    let most = 0;
    for (const d of state.dots) {
      if (!d.hoodBleed || d.ownerId !== u.id || state.t > d.until) continue;
      per[d.targetId] = (per[d.targetId] || 0) + 1;
      if (per[d.targetId] > most) most = per[d.targetId];
    }
    u.bleedStacks = most;
  }

  // PUSS — เลือกเป้าท้าดวลทันทีที่เข้าไฟต์
  if (ch.duel && !u.duelMarkId && !u.nineUsed) pickDuelMark(state, u);
  // ออกจากการล่องหนเมื่อไหร่ก็ได้ความเร็วโจมตีก้อนใหญ่ทันที
  if (u.ambush && !hasBuff(u, "stealth")) {
    addBuff(u, { type: "as", v: u.ambush.as, until: state.t + u.ambush.dur }, state.t);
    vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 20, color: "232,163,61", grow: 0.7 });
    u.ambush = null;
  }

  // ELLA E — ครบเวลาลอยตัวแล้วลงพื้นพร้อมความเร็วที่ค่อยๆ จาง
  if (u.skyLand && state.t >= u.skyLand.at) {
    addBuff(u, { type: "ms", v: u.skyLand.ms, decayFrom: state.t, until: state.t + u.skyLand.dur }, state.t);
    u.skyLand = null;
  }
  // ELLA Q — หน้าต่างคอมโบหมดอายุ
  if (u.comboUntil && state.t > u.comboUntil) {
    u.comboStep = 0; u.comboUntil = 0; u.comboArmed = false;
    // ปล่อยให้หน้าต่างหลุดกลางคอมโบ = ท่านั้นเข้าคูลดาวน์เต็ม จะได้ไม่วนกดจังหวะแรกฟรีๆ
    const q = u.skills.find((s) => s.type === "combo");
    if (q && q.cdLeft <= 0) q.cdLeft = fullCd(u, q);
  }
  // ELLA W — ยอดสะสมหมดอายุ
  if (u.chime && state.t > u.chime.until) u.chime = null;
  // ELLA R — ล่องหนหมดเวลาเองก็คืนระยะออโต้
  if (u.carriage && (state.t > u.carriage.until || !hasBuff(u, "stealth"))) {
    u.carriage = null;
    u.range = ch.range;
  }

  // PIROSKA passive — เลือดตกต่ำกว่าครึ่งครั้งแรกแล้ววิ่งหนี
  if (ch.fleeWolf) {
    const cfg = ch.fleeWolf;
    const tier = u.level >= 13 ? 2 : u.level >= 7 ? 1 : 0;
    if (u.hp / u.maxHp > cfg.hpBelow) u.fleeArmed = true;
    if (u.fleeArmed && u.hp / u.maxHp <= cfg.hpBelow && state.t >= (u.fleeReadyAt || 0)) {
      u.fleeArmed = false;
      u.fleeReadyAt = state.t + cfg.cd[tier];
      addBuff(u, { type: "ms", v: cfg.ms[tier], decayFrom: state.t, until: state.t + cfg.dur }, state.t);
      addBuff(u, { type: "ghost", v: 1, until: state.t + cfg.dur }, state.t);
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 40, color: "229,72,77", grow: 1.2, dur: 0.6 });
      pushLog(state, tr("{0} {1} วิ่งหนีสุดชีวิต", u.team === "blue" ? "🔵" : "🔴", tr(ch.th)));
    }
  }
  // PIROSKA R — ออร่าเดินตามตัว
  if (u.truthAura) {
    if (state.t > u.truthAura.until) u.truthAura = null;
    else {
      const a = u.truthAura;
      for (const p of state.units) {
        if (!p.alive || dist(u, p) > a.radius) continue;
        if (p.team === u.team) addBuffUnique(p, "truth:" + u.id, { type: "buffamp", v: a.amp, until: state.t + 0.25 }, state.t);
        else addBuffUnique(p, "truthfoe:" + u.id, { type: "debuffamp", v: a.amp, until: state.t + 0.25 }, state.t);
      }
    }
  }

  // YODAKA passive — สแตกหมดอายุ
  if (ch.starlight) {
    if (u.starStacks && state.t > (u.starUntil || 0)) u.starStacks = 0;
    const want = ch.starlight.range;
    const on = (u.starStacks || 0) > 0;
    if (on && u.starRangeOn !== true) { u.range = want; u.starRangeOn = true; }
    if (!on && u.starRangeOn) { u.range = ch.range; u.starRangeOn = false; }
  }

  // HOOD W — ครบช่วงคลั่งแล้วลดความเร็วโจมตีลงมาช่วงรักษาระดับ
  if (u.rampNext && state.t >= u.rampNext.at) {
    u.buffs = u.buffs.filter((b) => b.type !== "as");
    addBuff(u, { type: "as", v: u.rampNext.as, until: state.t + u.rampNext.dur }, state.t);
    u.rampNext = null;
  }

  // NIAN passive — ออร่าไฟฟ้าฟาดทุก 2 วิ (W ทำให้ฟาดทุกตัวพร้อมกัน)
  if (ch.staticAura) {
    const cfg = ch.staticAura;
    if (u.zapNext == null) u.zapNext = state.t + cfg.every;
    if (state.t >= u.zapNext) {
      u.zapNext = state.t + cfg.every;
      const dmg = byLevel(cfg, u.level) + cfg.apRatio * u.ap + cfg.bonusHp * (u.bonusHp || 0);
      const pool = enemiesOf(state, u).filter((e) => dist(u, e) <= cfg.radius + e.radius);
      const targets = u.overchargeUntil > state.t ? pool : pool.slice(0, 1);
      for (const e of targets) {
        state.dmgSrc = tr("พาสซีฟ Static Discharge");
        applyDamage(state, u, e, dmg, true);
        vfx(state, { kind: "bolt", x: e.x, y: e.y, h: 300, color: "126,199,255", dur: 0.32 });
        nianJolt(state, u, e);
      }
      state.dmgSrc = null;
    }
  }

  // H.S.B passive — ขั้นหมูตามเลือดที่เหลือ
  if (ch.threePigs) {
    const frac = u.hp / u.maxHp;
    // ขั้นบ้านฟาง / บ้านไม้ / บ้านอิฐ ตามเกณฑ์เลือด 100% · 75% · 50%
    const tier = frac > ch.threePigs[1].at ? 0 : frac > ch.threePigs[2].at ? 1 : 2;
    u.pigTier = Math.max(u.pigTier || 0, tier);   // ถอยกลับขั้นเดิมไม่ได้ในไฟต์เดียว
    const p = ch.threePigs[u.pigTier];
    u.pigSkill = p.skill;
    u.pigBuild = p.build;
    u.drAll = Math.max(u.drAll || 0, p.dr > 0 ? p.dr : 0);
    if (p.dr < 0) u.pigFrail = -p.dr; else u.pigFrail = 0;
    // เพดานเลือดในไฟต์ — ฮีลกลับขึ้นไปเกินขั้นที่เสียไปแล้วไม่ได้
    const cap = u.maxHp * ch.threePigs[u.pigTier].at;
    if (u.pigTier > 0 && u.hp > cap) u.hp = cap;
  }

  // ARTHUR — โล่จากพาสซีฟหมดอายุ
  if (u.aegisUntil && state.t > u.aegisUntil) {
    u.aegisShield = 0;
    u.aegisUntil = 0;
  }

  // PUSS — ฟื้นจากชีวิตที่เก้า
  if (u.nineLives && state.t >= u.nineLives.at) {
    const cfg = u.champ.duel;
    u.hp = u.maxHp * (cfg ? cfg.reviveHp : 0.3);
    u.alive = true;
    u.nineLives = null;
    u.duelMarkId = null;
    u.buffs = u.buffs.filter((b) => !["untargetable", "invuln", "stealth"].includes(b.type));
    vfx(state, { kind: "shock", x: u.x, y: u.y, r: 200, color: "232,163,61", dur: 0.7 });
    pushLog(state, tr("{0} {1} ใช้ชีวิตที่เก้า", u.team === "blue" ? "🔵" : "🔴", tr(ch.th)));
  }

  // ร่ายค้างแบบกรวย (PUSS W · NIAN E)
  if (u.channeling && u.channeling.lore === "cone") {
    const c = u.channeling;
    const sk = c.skill;
    if (state.t >= c.next) {
      c.next = state.t + sk.every;
      c.left -= 1;
      const tg = state.units.find((x) => x.id === u.targetId && x.alive);
      if (c.follow && tg) c.ang = Math.atan2(tg.y - u.y, tg.x - u.x);
      const dmg = at(sk.dmg, { rank: c.rank + 1 }) + (sk.apRatio || 0) * u.ap + (sk.badRatio || 0) * u.bonusAd;
      const cCol = sk.magic ? "126,199,255" : "255,208,138";
      vfx(state, { kind: "cone", x: u.x, y: u.y, r: c.range, ang: c.ang, half: c.half, color: cCol, dur: 0.22 });
      // PUSS W แทงรัวเป็นลำแสงดาบ · NIAN E เป็นคลื่นเสียงซัดออกไป
      vfx(state, { kind: "slashes", x: u.x, y: u.y, r: c.range, ang: c.ang, half: c.half,
        count: sk.magic ? 3 : 6, color: cCol, dur: 0.3 });
      const prev = state.dmgSrc;
      state.dmgSrc = skillLabel(u, sk);
      for (const e of enemiesOf(state, u)) {
        if (!inCone(u, e, c.ang, c.half, c.range)) continue;
        applyDamage(state, u, e, dmg, !!sk.magic);
        if (sk.slowByRank) addBuff(e, { type: "slow", v: at(sk.slowByRank, { rank: c.rank + 1 }), until: state.t + sk.slowDur }, state.t);
        if (ch.staticAura) nianJolt(state, u, e);
      }
      state.dmgSrc = prev;
      if (c.left <= 0) u.channeling = null;
    }
  }

  // PUSS R — ฟันกระเด้งทีละครั้ง
  if (u.flourish) {
    const f = u.flourish;
    if (state.t >= f.next) {
      f.next = state.t + f.sk.every;
      const tg = state.units.find((x) => x.id === f.targetId && x.alive);
      if (!tg) { u.flourish = null; }
      else {
        const nth = (f.seen[tg.id] || 0) + 1;
        f.seen[tg.id] = nth;
        const dmg = nth === 1 ? f.base : f.base * f.sk.repeatMul;
        const prev = state.dmgSrc;
        state.dmgSrc = skillLabel(u, f.sk);
        place(u, tg.x - (tg.x - u.x) * 0.1, tg.y - (tg.y - u.y) * 0.1);
        applyDamage(state, u, tg, dmg, false);
        state.dmgSrc = prev;
        vfx(state, { kind: "beam", x: u.x, y: u.y, x2: tg.x, y2: tg.y, w: 7, color: "255,208,138", dur: 0.2 });
        // รอยกรีดกากบาทบนตัวเป้าทุกจังหวะที่ฟัน (PUSS R)
        vfx(state, { kind: "slashes", x: tg.x, y: tg.y, r: 130, ang: 0, half: Math.PI, count: 2, color: "255,208,138", dur: 0.3 });
        f.left -= 1;
        if (f.left <= 0) u.flourish = null;
        else {
          const pool = enemiesOf(state, u).filter((e) => dist(tg, e) <= f.sk.bounceRange);
          const next = pool.filter((e) => e.id !== tg.id);
          f.targetId = (next.length ? next[Math.floor(u.rng() * next.length)] : tg).id;
        }
      }
    }
  }
}


// ---------------------------------------------------------------
// ทุกเฟรม ต่อสนาม — เรียกจาก systems.js
// ---------------------------------------------------------------
export function tickLore(state, dt) {
  const lore = L(state);
  const owner = (id) => state.units.find((x) => x.id === id);

  // ---- YODAKA Q · พายุลอยแล้วค้าง
  lore.vortex = lore.vortex.filter((v) => {
    const u = owner(v.ownerId);
    if (!u) return false;
    const sk = v.sk;
    if (v.left > 0) {
      const stepLen = v.speed * dt;
      v.x += v.nx * stepLen; v.y += v.ny * stepLen; v.left -= stepLen;
      for (const e of enemiesOf(state, u)) {
        if (v.hitIds.includes(e.id)) continue;
        if (Math.hypot(e.x - v.x, e.y - v.y) > v.halfW + e.radius) continue;
        v.hitIds.push(e.id);
        state.dmgSrc = skillLabel(u, sk);
        applyDamage(state, u, e, v.dmg, true);
        addBuff(e, { type: "slow", v: sk.slowByRank[v.rank], until: state.t + sk.slowDur }, state.t);
        state.dmgSrc = null;
      }
      if (v.left <= 0) { v.parked = state.t + sk.zoneDur; v.next = state.t + sk.every; }
      return true;
    }
    // ค้างเป็นวังวน — ตอดทุก 0.5 วิ และระเบิดถ้าโยดากะเดินตัดผ่าน
    vfx(state, { kind: "ring", x: v.x, y: v.y, r: v.radius, color: "126,199,255", grow: 0.05, dur: 0.2 });
    if (dist(u, v) <= v.radius + u.radius) {
      gainStar(state, u, 1);
      const pop = sk.popDmg[v.rank] + sk.popApRatio * u.ap;
      vfx(state, { kind: "shock", x: v.x, y: v.y, r: sk.popRadius, color: "126,199,255", dur: 0.55 });
      state.dmgSrc = skillLabel(u, sk);
      for (const e of enemiesOf(state, u)) {
        if (dist(e, v) > sk.popRadius + e.radius) continue;
        applyDamage(state, u, e, pop, true);
      }
      state.dmgSrc = null;
      return false;
    }
    if (state.t >= v.next) {
      v.next = state.t + sk.every;
      const tick = sk.tickDmg[v.rank] + sk.tickApRatio * u.ap;
      state.dmgSrc = skillLabel(u, sk);
      for (const e of enemiesOf(state, u)) {
        if (Math.hypot(e.x - v.x, e.y - v.y) > v.radius + e.radius) continue;
        applyDamage(state, u, e, tick, true);
      }
      state.dmgSrc = null;
    }
    return state.t < v.parked;
  });

  // ---- โซนที่อยู่กับที่ (ตะกร้า PIROSKA · บั้งไฟ HOOD)
  lore.sights = lore.sights.filter((z) => {
    if (state.t > z.until) return false;
    const u = owner(z.ownerId);
    if (!u) return false;
    if (state.t < z.next) return true;
    z.next = state.t + z.every;
    const sk = z.sk;
    if (z.kind === "basket") {
      const heal = sk.heal[z.rank] + sk.apRatio * u.ap;
      const ad = sk.adBuff[z.rank] + sk.adPerAp * u.ap;
      const ap = sk.apBuff[z.rank] + sk.apPerAp * u.ap;
      const prev = state.dmgSrc, prevU = state.srcUnit;
      state.dmgSrc = skillLabel(u, sk); state.srcUnit = u;
      for (const a of alliesOf(state, u)) {
        if (Math.hypot(a.x - z.x, a.y - z.y) > z.r + a.radius) continue;
        healUnit(state, a, heal);
        addBuffUnique(a, "basketad:" + u.id, { type: "adFlat", v: ad, until: state.t + sk.buffDur }, state.t);
        addBuffUnique(a, "basketap:" + u.id, { type: "apFlat", v: ap, until: state.t + sk.buffDur }, state.t);
      }
      state.dmgSrc = prev; state.srcUnit = prevU;
      vfx(state, { kind: "ring", x: z.x, y: z.y, r: z.r, color: "63,191,127", grow: 0.25, dur: 0.4 });
    } else if (z.kind === "hwg") {
      // Heimdall's Warding Horn — เขตสโลว์ที่เปิดตอนกดอัลติ
      for (const e of enemiesOf(state, u)) {
        if (Math.hypot(e.x - z.x, e.y - z.y) > z.r + e.radius) continue;
        addBuffUnique(e, "hwh:" + u.id, { type: "slow", v: z.slow, until: state.t + 0.35 }, state.t);
      }
    } else if (z.kind === "flare") {
      for (const e of enemiesOf(state, u)) {
        if (Math.hypot(e.x - z.x, e.y - z.y) > z.r + e.radius) continue;
        e.buffs = e.buffs.filter((b) => b.type !== "stealth");
        addBuffUnique(e, "flare:" + u.id, { type: "revealed", v: 1, until: state.t + z.revealDur }, state.t);
        if (e.carriage) { e.carriage = null; e.range = e.champ.range; }
      }
    }
    return true;
  });

  // ---- การทุบพื้นที่หน่วงเวลาไว้ (YODAKA R · TOTSAKAN R)
  lore.slams = lore.slams.filter((s) => {
    if (state.t < s.at) {
      if (s.follow) { const u = owner(s.ownerId); if (u) { s.x = u.x; s.y = u.y; } }
      // YODAKA R — ลอยครบขั้นต่ำแล้วสั่งทุบทันทีได้ ไม่ต้องรอจนหมดเวลา
      // ทุบเลยเมื่อมีศัตรูอยู่ใต้วงตั้งแต่สองตัวขึ้นไป ดีกว่าลอยรอจนเขาเดินหนีออกไปหมด
      if (s.sk && s.sk.minAir && !s.early) {
        const u = owner(s.ownerId);
        const flown = state.t - (s.at - s.sk.airTime);
        if (u && flown >= s.sk.minAir) {
          let under = 0;
          for (const e of enemiesOf(state, u)) if (dist({ x: s.x, y: s.y }, e) <= s.radius + e.radius) under++;
          if (under >= 2) { s.early = true; s.at = state.t; }
        }
      }
      return true;
    }
    const u = owner(s.ownerId);
    if (!u || !u.alive) return false;
    const sk = s.sk;
    const prev = state.dmgSrc;
    state.dmgSrc = skillLabel(u, sk);
    if (s.kind === "starfall") {
      u.buffs = u.buffs.filter((b) => b.type !== "untargetable" && b.type !== "invuln");
      place(u, s.x, s.y);
      vfx(state, { kind: "slam", x: u.x, y: u.y, r: s.radius, color: "126,199,255", dur: 0.8 });
      vfx(state, { kind: "shock", x: u.x, y: u.y, r: s.radius, color: "126,199,255", dur: 0.7 });
      vfx(state, { kind: "debris", x: u.x, y: u.y, r: s.radius * 0.6, color: "126,199,255", dur: 0.7 });
      for (const e of enemiesOf(state, u)) {
        if (dist(u, e) > s.radius + e.radius) continue;
        applyDamage(state, u, e, s.dmg, true);
        addBuff(e, { type: "slow", v: sk.slowByRank[s.rank], until: state.t + sk.slowDur }, state.t);
      }
      if (sk.refillStacks) gainStar(state, u, (u.champ.starlight || {}).max || 3);
    } else {
      const w = s.wave;
      const dmg = w.dmg[s.rank] + (w.badRatio || 0) * u.bonusAd + (w.bonusHp || 0) * (u.bonusHp || 0);
      vfx(state, { kind: "shock", x: u.x, y: u.y, r: s.radius, color: "255,208,138", dur: 0.6 });
      vfx(state, { kind: "debris", x: u.x, y: u.y, r: s.radius * 0.75, color: "214,170,96", dur: 0.75 });
      for (const e of enemiesOf(state, u)) {
        if (dist(u, e) > s.radius + e.radius) continue;
        applyDamage(state, u, e, dmg, false);
        if (w.stun) addBuff(e, { type: "stun", v: 1, until: state.t + w.stun[s.rank] }, state.t);
      }
    }
    state.dmgSrc = prev;
    return false;
  });

  // ---- NIAN R · พายุสายฟ้า
  lore.storms = lore.storms.filter((s) => {
    if (s.left <= 0) return false;
    if (state.t < s.next) return true;
    s.next = state.t + s.every;
    s.left -= 1;
    const u = owner(s.ownerId);
    if (!u || !u.alive) return false;
    const sk = s.sk;
    const dmg = sk.dmg[s.rank] + sk.apRatio * u.ap + sk.bonusHp * (u.bonusHp || 0);
    const pool = enemiesOf(state, u).filter((e) => Math.hypot(e.x - s.x, e.y - s.y) <= s.r + e.radius);
    const prev = state.dmgSrc;
    state.dmgSrc = skillLabel(u, sk);
    for (const e of pool.slice(0, sk.targetsPerStrike)) {
      applyDamage(state, u, e, dmg, true);
      vfx(state, { kind: "bolt", x: e.x, y: e.y, h: 420, color: "126,199,255", dur: 0.4 });
      nianJolt(state, u, e);
    }
    state.dmgSrc = prev;
    return s.left > 0;
  });

  // ---- H.S.B · กำแพงอิฐ กันทางเดินและกันกระสุน
  lore.walls = lore.walls.filter((w) => {
    if (state.t > w.until || w.hp <= 0) return false;
    const ax = w.x - w.nx * w.half, ay = w.y - w.ny * w.half;
    const bx = w.x + w.nx * w.half, by = w.y + w.ny * w.half;
    vfx(state, { kind: "beam", x: ax, y: ay, x2: bx, y2: by, w: 20, color: "232,163,61", dur: 0.1 });
    // ศัตรูเดินทะลุไม่ได้ — ผลักออกไปด้านที่มันมา
    for (const e of state.units) {
      if (!e.alive || e.team === w.team) continue;
      const rx = e.x - w.x, ry = e.y - w.y;
      const along = rx * w.nx + ry * w.ny;
      if (Math.abs(along) > w.half) continue;
      const side = rx * -w.ny + ry * w.nx;
      if (Math.abs(side) > e.radius) continue;
      const push = (e.radius - Math.abs(side)) * (side >= 0 ? 1 : -1);
      place(e, e.x + -w.ny * push, e.y + w.nx * push);
    }
    // กระสุนของศัตรูชนกำแพงแล้วหาย ดาเมจไปลงที่กำแพงแทน
    state.projectiles = state.projectiles.filter((p) => {
      if (p.team === w.team) return true;
      const rx = p.x - w.x, ry = p.y - w.y;
      if (Math.abs(rx * w.nx + ry * w.ny) > w.half) return true;
      if (Math.abs(rx * -w.ny + ry * w.nx) > 26) return true;
      w.hp -= p.dmg;
      vfx(state, { kind: "flash", x: p.x, y: p.y, r: 46, color: "232,163,61", dur: 0.25 });
      return false;
    });
    return true;
  });

  // ---- H.S.B R · บ้านอิฐ
  lore.bunkers = lore.bunkers.filter((b) => {
    const u = owner(b.ownerId);
    const alive = state.t <= b.until && b.hp > 0;
    if (!alive) {
      if (u) {
        const sk = b.sk;
        const dmg = sk.burstDmg[b.rank] + sk.burstBadRatio * u.bonusAd + sk.burstBonusHp * (u.bonusHp || 0);
        const rad = sk.burstRadius * skillScale(u);
        vfx(state, { kind: "shock", x: b.x, y: b.y, r: rad, color: "232,163,61", dur: 0.7 });
        const prev = state.dmgSrc;
        state.dmgSrc = skillLabel(u, sk);
        for (const e of enemiesOf(state, u)) {
          if (Math.hypot(e.x - b.x, e.y - b.y) > rad + e.radius) continue;
          applyDamage(state, u, e, dmg, false);
          addBuff(e, { type: "slow", v: sk.burstSlow, until: state.t + sk.burstSlowDur }, state.t);
        }
        state.dmgSrc = prev;
      }
      return false;
    }
    vfx(state, { kind: "ring", x: b.x, y: b.y, r: b.r, color: "232,163,61", grow: 0, dur: 0.1 });
    // ศัตรูเข้าไม่ได้ · เพื่อนข้างในไม่กินดาเมจ (ธงอ่านตอน applyDamage)
    for (const e of state.units) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - b.x, e.y - b.y);
      if (e.team === b.team) { if (d <= b.r) e.inBunker = b; continue; }
      if (d >= b.r - e.radius) continue;
      const k = d || 1;
      place(e, b.x + ((e.x - b.x) / k) * (b.r + e.radius), b.y + ((e.y - b.y) / k) * (b.r + e.radius));
    }
    return true;
  });
  // ล้างธงบ้านของคนที่เดินออกมาแล้ว
  for (const e of state.units) {
    if (e.inBunker && (state.t > e.inBunker.until || e.inBunker.hp <= 0
      || Math.hypot(e.x - e.inBunker.x, e.y - e.inBunker.y) > e.inBunker.r)) e.inBunker = null;
  }

  // ---- JACK R · ยักษ์สวรรค์
  lore.pets = lore.pets.filter((g) => {
    const u = owner(g.ownerId);
    if (!u || state.t > g.until) return false;
    if (g.hp <= 0) return false;
    const foes = state.units.filter((e) => e.alive && e.team !== g.team && !hasBuff(e, "untargetable"));
    if (!foes.length) return true;
    const tgt = foes.reduce((a, b) => (Math.hypot(b.x - g.x, b.y - g.y) < Math.hypot(a.x - g.x, a.y - g.y) ? b : a));
    const d = Math.hypot(tgt.x - g.x, tgt.y - g.y) || 1;
    const reach = 320;
    if (d > reach) {
      const sp = g.ms * (1 + (state.t < g.buffUntil ? g.msBuff : 0));
      g.x = clamp(g.x + ((tgt.x - g.x) / d) * sp * dt, 60, ARENA_W - 60);
      g.y = clamp(g.y + ((tgt.y - g.y) / d) * sp * dt, 60, ARENA_H - 60);
    }
    vfx(state, { kind: "ring", x: g.x, y: g.y, r: g.radius, color: "232,214,120", grow: 0, dur: 0.1 });
    const swing = g.swing / (1 + (state.t < g.buffUntil ? g.as : 0));
    if (state.t < g.next) return true;
    g.next = state.t + swing;
    const hit = g.hits[g.step % g.hits.length];
    g.step += 1;
    const ang = Math.atan2(tgt.y - g.y, tgt.x - g.x);
    const dmg = g.ad * hit.mult;
    const prev = state.dmgSrc, prevU = state.srcUnit;
    state.dmgSrc = tr("ยักษ์สวรรค์ ") + tr(hit.th);
    state.srcUnit = u;
    const origin = { x: g.x, y: g.y, radius: 0 };
    for (const e of foes) {
      let ok;
      if (hit.shape === "cone") ok = inCone(origin, e, ang, Math.PI / 2, hit.radius);
      else if (hit.shape === "line") ok = onLine(origin, Math.cos(ang), Math.sin(ang), e, hit.range, hit.width / 2);
      else ok = Math.hypot(e.x - g.x, e.y - g.y) <= hit.radius + e.radius;
      if (!ok) continue;
      applyDamage(state, u, e, dmg, true);
      jackSeed(state, u, e);
    }
    state.dmgSrc = prev; state.srcUnit = prevU;
    if (hit.shape === "cone") vfx(state, { kind: "cone", x: g.x, y: g.y, r: hit.radius, ang, half: Math.PI / 2, color: "232,214,120", dur: 0.4 });
    else if (hit.shape === "line") vfx(state, { kind: "beam", x: g.x, y: g.y, x2: g.x + Math.cos(ang) * hit.range, y2: g.y + Math.sin(ang) * hit.range, w: hit.width / 2, color: "232,214,120", dur: 0.4 });
    else vfx(state, { kind: "shock", x: g.x, y: g.y, r: hit.radius, color: "232,214,120", dur: 0.5 });
    return true;
  });
}


// ---------------------------------------------------------------
// ตัวช่วยของพาสซีฟที่ผูกกับดาเมจ — เรียกจาก damage.js / on-hit.js
// ---------------------------------------------------------------

// YODAKA — เพิ่มสแตกดาว
export function gainStar(state, u, n) {
  const cfg = u.champ && u.champ.starlight;
  if (!cfg) return;
  u.starStacks = Math.min(cfg.max, (u.starStacks || 0) + n);
  u.starUntil = state.t + cfg.dur;
  vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 14, color: "126,199,255", grow: 0.5, dur: 0.3 });
}

// JACK — แปะเมล็ดถั่ว ครบ 3 แล้วรากงอกตรึงเท้า
export function jackSeed(state, source, target) {
  const cfg = source.champ && source.champ.beanstalk;
  if (!cfg || !target.alive || target.team === source.team) return;
  if (state.t < (target.beanLock || 0)) return;
  const b = target.bean && target.bean.ownerId === source.id && state.t < target.bean.until
    ? target.bean : { ownerId: source.id, n: 0 };
  b.n += 1;
  b.until = state.t + cfg.dur;
  target.bean = b;
  if (b.n < cfg.need) return;
  target.bean = null;
  target.beanLock = state.t + cfg.lockout;
  const tier = source.level >= 13 ? 2 : source.level >= 7 ? 1 : 0;
  addBuff(target, { type: "root", v: 1, until: state.t + cfg.root[tier] }, state.t);
  const prev = state.dmgSrc;
  state.dmgSrc = tr("พาสซีฟ Beanstalk Guile");
  applyDamage(state, source, target, byLevel(cfg, source.level) + cfg.apRatio * source.ap, true);
  state.dmgSrc = prev;
  vfx(state, { kind: "ring", x: target.x, y: target.y, r: target.radius + 30, color: "63,191,127", grow: 1, dur: 0.6 });
}

// NIAN — สแตกประจุ ครบ 3 แล้วกระตุกสตัน (ไม่มีคูลดาวน์ต่อเป้า)
export function nianJolt(state, source, target) {
  const sk = (source.skills || []).find((x) => x.type === "tempest");
  if (!sk || sk.rank <= 0 || !target.alive) return;
  const cfg = sk.jolt;
  target.jolt = (target.jolt || 0) + 1;
  if (target.jolt < cfg.need) return;
  target.jolt = 0;
  addBuff(target, { type: "stun", v: 1, until: state.t + cfg.stun[Math.max(0, sk.rank - 1)] }, state.t);
  vfx(state, { kind: "flash", x: target.x, y: target.y, r: 40, color: "126,199,255", dur: 0.2 });
}

// ARTHUR — ดาเมจที่ทำได้กลายเป็นโล่
export function arthurAegis(state, source, dmg, magic, trueDmg) {
  const cfg = source.champ && source.champ.aegis;
  if (!cfg || magic || !(dmg > 0)) return;
  const pct = source.hp / source.maxHp < cfg.hpBelow ? cfg.lowPct : cfg.pct;
  const cap = source.maxHp * cfg.cap;
  const add = dmg * pct;
  source.aegisShield = Math.min(cap, (source.aegisShield || 0) + add);
  source.aegisUntil = state.t + cfg.dur;
  if (source.shield < source.aegisShield) {
    source.shield = source.aegisShield;
    addBuffUnique(source, "aegis", { type: "shield", v: 1, until: state.t + cfg.dur }, state.t);
  }
  void trueDmg;
}

// HOOD — คริไม่ระเบิดทีเดียว ส่วนเกินกลายเป็นเลือดไหล
export function hoodBleed(state, source, target, excess) {
  const cfg = source.champ && source.champ.critBleed;
  if (!cfg || !(excess > 0)) return;
  const total = excess * cfg.pct;
  const mine = state.dots.filter((d) => d.targetId === target.id && d.ownerId === source.id && d.hoodBleed);
  if (mine.length >= cfg.maxStacks) {
    const oldest = mine.reduce((a, b) => (b.until < a.until ? b : a));
    state.dots = state.dots.filter((d) => d !== oldest);
  }
  state.dots.push({
    targetId: target.id, ownerId: source.id, hoodBleed: true,
    dps: total / cfg.dur, until: state.t + cfg.dur, magic: false,
    src: tr("พาสซีฟ Lacerating Precision"),
  });
}

// ELLA — เศษแก้วติดออโต้ และเก็บยอดดาเมจไว้ให้ W ระเบิด
export function ellaOnHit(state, u, target) {
  const cfg = u.champ && u.champ.glassShards;
  if (!cfg) return;
  let dmg = byLevel(cfg, u.level) + cfg.apRatio * u.ap;
  const low = target.hp / target.maxHp < cfg.lowHpAt;
  if (low) dmg *= cfg.lowHpMul;
  // เลือดต่ำกว่าครึ่ง เศษแก้วเยอะขึ้นและวาบเป็นสีเลือด ตามที่เอกสารภาพเขียนไว้
  vfx(state, { kind: "shards", x: target.x, y: target.y, r: low ? 120 : 70,
    count: low ? 12 : 6, color: low ? "232,90,110" : "214,190,255", dur: low ? 0.6 : 0.4 });
  const prev = state.dmgSrc;
  state.dmgSrc = tr("พาสซีฟ Glass Shards");
  applyDamage(state, u, target, dmg, true);
  state.dmgSrc = prev;
}

// ELLA R — ออโต้ครั้งแรกตอนล่องหน ลากราชรถฟักทองตามมาทุบจุดที่เป้ายืนอยู่
// เดิมอัลติให้แค่ล่องหนกับระยะออโต้ที่ไกลขึ้น ส่วนตัวรถที่เป็นดาเมจก้อนหลักไม่เคยลงมาเลย
export function carriageCrash(state, u, target) {
  if (!u.carriage) return;
  const sk = u.carriage.sk;
  const r = Math.max(0, (sk.rank || 1) - 1);
  const sc = 1 + (u.skillSizeBoost || 0);
  const rad = sk.radius * sc;
  u.carriage = null;
  u.range = u.champ.range;
  u.buffs = u.buffs.filter((b) => b.type !== "stealth");
  const dmg = sk.dmg[r] + (sk.apRatio || 0) * u.ap;
  const prev = state.dmgSrc;
  state.dmgSrc = skillLabel(u, sk);
  for (const e of enemiesOf(state, u)) {
    if (dist({ x: target.x, y: target.y }, e) > rad + e.radius) continue;
    applyDamage(state, u, e, dmg, true);
    addBuff(e, { type: "slow", v: sk.slowByRank[r], until: state.t + sk.slowDur }, state.t);
  }
  state.dmgSrc = prev;
  vfx(state, { kind: "slam", x: target.x, y: target.y, r: rad, color: "122,90,140", dur: 0.9 });
  vfx(state, { kind: "shock", x: target.x, y: target.y, r: rad, color: "232,163,61", dur: 0.7 });
  vfx(state, { kind: "debris", x: target.x, y: target.y, r: rad * 0.7, color: "196,140,80", dur: 0.8 });
  pushLog(state, tr("{0} {1} ราชรถฟักทองถล่มลงกลางวง", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
}


// ELLA W — ทุกดาเมจที่เอลล่าทำใส่เป้า ถูกจดไว้บนตัวเป้า
export function ellaStash(state, source, target, dmg) {
  const sk = (source.skills || []).find((x) => x.type === "damageStash");
  if (!sk || sk.rank <= 0 || !(dmg > 0) || !target.alive) return;
  const pct = sk.stashPct[Math.max(0, sk.rank - 1)] + (sk.stashPerAp || 0) * source.ap;
  const cur = target.chime && target.chime.ownerId === source.id && state.t < target.chime.until
    ? target.chime : { ownerId: source.id, amt: 0 };
  cur.amt += dmg * pct;
  cur.until = state.t + sk.stashDur;
  target.chime = cur;
  // เข็มเดินเร็วขึ้นตามยอดที่สะสมไว้ — อ่านออกว่าใกล้คุ้มที่จะกด W หรือยัง
  const full = Math.min(1, cur.amt / Math.max(1, source.maxHp * 0.25));
  vfx(state, { kind: "clock", x: target.x, y: target.y, r: target.radius + 30,
    frac: full, color: "232,214,120", dur: 0.3 });
}

// PUSS — ตราประทับท้าดวล ทำดาเมจใส่เป้านั้นแรงขึ้น
// PUSS — ค่าหัวของเป้าที่ถูกตราท้าดวลแพงกว่าปกติ
// kind: "kill" | "solo" (ช่วยคนเดียว) | "group" (ช่วยกันหลายคน)
export function duelTakedownGold(u, target, kind) {
  const cfg = u && u.champ && u.champ.duel;
  if (!cfg || !cfg.goldPct) return;
  if (!u.duelMarkId || u.duelMarkId !== target.id) return;
  const base = kind === "kill" ? KILL.gold : kind === "solo" ? ASSIST_SOLO.gold : ASSIST_GROUP.gold;
  u.duelGold = (u.duelGold || 0) + base * cfg.goldPct;
}


export function duelAmp(source, target) {
  const cfg = source && source.champ && source.champ.duel;
  if (!cfg || !source.duelMarkId || source.duelMarkId !== target.id) return 1;
  return 1 + cfg.amp + (cfg.ampPerBad || 0) * (source.bonusAd || 0);
}

// PIROSKA R — ออร่าขยายผลดีบัฟบนตัวศัตรู และขยายบัฟฝ่ายเรา
export const buffAmpOf = (u) => 1 + buffSum(u, "buffamp");
export const debuffAmpOf = (u) => 1 + buffSum(u, "debuffamp");


// PUSS — ชีวิตที่เก้า: ตายตอนเป้าที่มีตรายังไม่ตาย = ล่องหนหนี แล้วฟื้นด้วยเลือด 30%
// คืน true = "อย่าเพิ่งตาย" ให้ applyDamage รีเทิร์นออกไปเลย
export function nineLivesCatch(state, u) {
  const cfg = u.champ && u.champ.duel;
  if (!cfg || u.nineLives || u.nineUsed) return false;
  const mark = u.duelMarkId && state.units.find((x) => x.id === u.duelMarkId);
  if (!mark || !mark.alive) return false;
  u.nineUsed = true;
  u.hp = 1;
  u.nineLives = { at: state.t + cfg.hideDur };
  addBuff(u, { type: "untargetable", v: 1, until: state.t + cfg.hideDur }, state.t);
  addBuff(u, { type: "invuln", v: 1, until: state.t + cfg.hideDur }, state.t);
  addBuff(u, { type: "stealth", v: 1, until: state.t + cfg.hideDur }, state.t);
  vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 60, color: "232,163,61", grow: 1.3, dur: cfg.hideDur });
  pushLog(state, tr("{0} {1} สลายตัวหนีไปในเงา", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
  return true;
}


// PUSS — เลือกเป้าท้าดวลตอนเริ่มไฟต์ (แชมเปี้ยนที่ AI Value สูงสุดของฝั่งตรงข้าม)
export function pickDuelMark(state, u) {
  if (!u.champ || !u.champ.duel || u.duelMarkId) return;
  const foes = enemiesOf(state, u);
  if (!foes.length) return;
  const best = foes.reduce((a, b) => (b.champ.value > a.champ.value ? b : a));
  u.duelMarkId = best.id;
  best.duelBy = u.id;
}


// YODAKA — ออโต้ที่มีสแตก จะพุ่งทะลวงไปโผล่หลังเป้าแล้วกวาดทุกคนในแนว
// คืน true = พุ่งไปแล้ว (ตัวเรียกจะได้ไม่ต้องทำอะไรต่อ)
export function starPierce(state, u, target) {
  const cfg = u.champ && u.champ.starlight;
  if (!cfg || !(u.starStacks > 0)) return false;
  u.starStacks -= 1;
  const dd = dist(u, target) || 1;
  const nx = (target.x - u.x) / dd, ny = (target.y - u.y) / dd;
  const endX = target.x + nx * cfg.through, endY = target.y + ny * cfg.through;
  const len = Math.hypot(endX - u.x, endY - u.y) || 1;
  const dmg = byLevel(cfg, u.level) + cfg.apRatio * u.ap;
  const prev = state.dmgSrc;
  state.dmgSrc = tr("พาสซีฟ Starlight Piercing");
  const from = { x: u.x, y: u.y, radius: 0 };
  for (const e of enemiesOf(state, u)) {
    if (!onLine(from, nx, ny, e, len, cfg.width / 2)) continue;
    applyDamage(state, u, e, dmg, true);
  }
  state.dmgSrc = prev;
  vfx(state, { kind: "beam", x: u.x, y: u.y, x2: endX, y2: endY, w: cfg.width / 2, color: "126,199,255", dur: 0.35 });
  vfx(state, { kind: "trail", x: u.x, y: u.y, color: "126,199,255", pending: u.id });
  place(u, endX, endY);
  return true;
}


// ARTHUR Q — พาสซีฟฟันกวาดรอบเป้า และเงื่อนไขตีสองครั้งเมื่อเป้าเลือดเกินครึ่ง
export function arthurCleave(state, u, target) {
  const q = (u.skills || []).find((x) => x.type === "onHit" && x.cleaveRadius);
  if (!q || q.rank <= 0) return;
  const ratio = q.cleaveRatio[Math.max(0, q.rank - 1)];
  const prev = state.dmgSrc;
  state.dmgSrc = tr("พาสซีฟ Cleave");
  for (const e of enemiesOf(state, u)) {
    if (e.id === target.id || dist(target, e) > q.cleaveRadius + e.radius) continue;
    applyDamage(state, u, e, u.ad * ratio, false);
  }
  state.dmgSrc = prev;
}
