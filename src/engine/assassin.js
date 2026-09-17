import { tr } from "../i18n.js";
import { applyDamage } from "./damage.js";
import { addBuff, addBuffUnique, dist, pushLog, vfx, withSrc } from "./state-util.js";
import { cdrFromItemHaste } from "./stats.js";


// ---------------------------------------------------------------
// กลไกของไอเทมสายแอสซาซิน Tier 3
//
//   ตอนดาเมจเข้าเป้า -> onAssassinHit()  : Hecate (ครบ 3 ฮิต), Jabberwock (เป้าเลือดต่ำ)
//   ตอนออโต้เข้าเป้า -> assassinOnHit()  : Carnwennan (หมัดหลังพุ่ง)
//   ทุกเฟรม         -> tickAssassin()    : Sekhmet (บ้าคลั่ง 10 วิแรก), Seven-League (เร่งฝีเท้า),
//                                          Anubis (ขว้างมีด), Carnwennan (จับจังหวะพุ่ง)
//   ตอนได้สังหาร     -> onAssassinKill()  : Thanatos (รีเซ็ตสกิล), Wendigo (สะสม AD ถาวร)
//   ตอนจะตาย        -> denyDeath()       : Freyja (ล็อกเลือดที่ 1 แล้วอมตะ 2 วิ)
//   ตอนกินโล่        -> shieldBreakMul()  : Midgard (ทลายโล่)
//
// เหมือน mage.js — อะไรที่ยิงดาเมจเองต้องหุ้ม echo() ไม่งั้นวนซ้ำ
// ---------------------------------------------------------------

let echoDepth = 0;

function echo(fn) {
  echoDepth += 1;
  try { return fn(); } finally { echoDepth -= 1; }
}

const bonusAd = (u) => u.bonusAd || 0;


// ---------------------------------------------------------------
// Fang of the Midgard Serpent
// ตัวคูณตอนดาเมจกินหลอดโล่ + ตัวคูณตอนคนโดนมาร์กรับโล่ใหม่
// ---------------------------------------------------------------
export function shieldBreakMul(source) {
  return source && source.shieldBreak ? 1 + source.shieldBreak.dmgMul : 1;
}

export function incomingShieldMul(u) {
  return u && u.shieldCutUntil != null && u.curT < u.shieldCutUntil ? 1 - u.shieldCutAmt : 1;
}


// ---------------------------------------------------------------
// ทุกครั้งที่ดาเมจ (ชนิดไหนก็ได้) เข้าเป้า
// ---------------------------------------------------------------
export function onAssassinHit(state, source, target) {
  if (echoDepth > 0 || !source || !target || !source.hasItem) return;
  if (!source.alive || source.team === target.team) return;
  const t = state.t;

  // Hecate's Triple Crescent — ตี/ใช้สกิลใส่เป้าเดิมครบ 3 ฮิตใน 2 วิ ได้ True Damage ก้อนโต
  if (source.tripleHit) {
    const cfg = source.tripleHit;
    source.htcHits = source.htcHits || {};
    source.htcCd = source.htcCd || {};
    const rec = source.htcHits[target.id];
    if (!rec || t - rec.first > cfg.window) source.htcHits[target.id] = { first: t, n: 1 };
    else rec.n += 1;
    const now = source.htcHits[target.id];
    if (now.n >= cfg.hits && t >= (source.htcCd[target.id] || 0)) {
      source.htcCd[target.id] = t + cfg.cd;
      source.htcHits[target.id] = { first: t, n: 0 };
      echo(() => {
        withSrc(state, tr("ไอเทม Hecate's Triple Crescent"), source, () => {
          applyDamage(state, source, target, target.maxHp * cfg.pctMaxHp, false, true);
        });
      });
      vfx(state, { kind: "ring", x: target.x, y: target.y, r: target.radius + 30, color: "214,120,232", grow: 0.9 });
    }
  }

  // Jabberwock's Vorpal Blade — ตีใส่ตัวที่เลือดต่ำกว่าครึ่ง แถมดาเมจกายภาพ
  if (source.executeHit && target.hp / target.maxHp < source.executeHit.hpBelow) {
    const cfg = source.executeHit;
    source.jvbCd = source.jvbCd || {};
    if (t >= (source.jvbCd[target.id] || 0)) {
      source.jvbCd[target.id] = t + cfg.cd;
      echo(() => {
        withSrc(state, tr("ไอเทม Jabberwock's Vorpal Blade"), source, () => {
          applyDamage(state, source, target, cfg.flat + cfg.bonusAdRatio * bonusAd(source), false, false);
        });
      });
    }
  }
}


// ---------------------------------------------------------------
// ตอนออโต้เข้าเป้า — Carnwennan's Shadowblade
// ---------------------------------------------------------------
export function assassinOnHit(state, u, target) {
  if (!u.hasItem || !(u.cnsCharge > 0)) return;
  const amt = u.cnsCharge;
  u.cnsCharge = 0;
  echo(() => {
    withSrc(state, tr("ไอเทม Carnwennan's Shadowblade"), u, () => {
      applyDamage(state, u, target, amt, false, false);
    });
  });
}


// ---------------------------------------------------------------
// ตอนได้สังหารหรือช่วยสังหาร
// ---------------------------------------------------------------
export function onAssassinKill(state, u, isKill) {
  if (!u || !u.hasItem) return;

  // Thanatos' Reaping Scythe — รีเซ็ตคูลดาวน์สกิลพื้นฐานทั้งหมด
  if (u.resetOnKill) {
    let any = false;
    for (const sk of u.skills || []) {
      if (sk.key === "R" || !(sk.cdLeft > 0)) continue;
      sk.cdLeft = 0;
      any = true;
    }
    if (any) vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 34, color: "232,163,61", grow: 0.9 });
  }

  // Wendigo's Voracious Claw — เก็บแต้มไว้ให้ App เอาไปสะสมข้ามยก (เฉพาะสังหาร ไม่นับช่วยฆ่า)
  if (u.adPerKill && isKill) {
    const cfg = u.adPerKill;
    const held = u.wvcStacks || 0;
    const gained = u.wvcGained || 0;
    if (held + gained < cfg.max) {
      u.wvcGained = gained + 1;
      u.ad += cfg.per;
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 22, color: "227,90,90", grow: 0.8 });
    }
  }
}


// ---------------------------------------------------------------
// Freyja's Shroud of Defiance — ปฏิเสธความตายครั้งเดียวต่อรอบ
// เรียกจาก applyDamage ก่อนจะประกาศว่าตาย คืน true ถ้ากันไว้ได้
// ---------------------------------------------------------------
export function denyDeath(state, u) {
  if (!u.hasItem || !u.denyDeath || u.fsdUsed) return false;
  u.fsdUsed = true;
  u.hp = 1;
  addBuff(u, { type: "invuln", v: 1, until: state.t + u.denyDeath.dur }, state.t);
  vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 54, color: "232,214,120", grow: 1.3, dur: 0.8 });
  pushLog(state, tr("{0} {1} ปฏิเสธความตาย", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
  return true;
}


// ---------------------------------------------------------------
// ต่อเฟรม ต่อยูนิต
// ---------------------------------------------------------------
export function tickAssassin(state, u, dt) {
  if (!u.hasItem) return;
  const t = state.t;
  u.curT = t;
  const cdr = cdrFromItemHaste(u.itemHaste || 0);

  // Sekhmet's Massacre Claws — ช่วงต้นไฟต์เจาะเกราะเพิ่ม
  if (u.ragePen) {
    if (u.penBase == null) u.penBase = u.pen;
    u.pen = u.penBase + (t < u.ragePen.dur ? u.ragePen.pen : 0);
  }

  // Carnwennan's Shadowblade — จบการพุ่งเมื่อไหร่ ชาร์จหมัดถัดไป
  if (u.dashStrike) {
    const cfg = u.dashStrike;
    if (u.dashing) u.cnsWasDashing = true;
    else if (u.cnsWasDashing) {
      u.cnsWasDashing = false;
      if (u.cnsReadyAt == null || t >= u.cnsReadyAt) {
        u.cnsReadyAt = t + cfg.cd;
        u.cnsCharge = cfg.flat + cfg.bonusAdRatio * bonusAd(u);
      }
    }
  }

  // Seven-League Shadowstriders — เข้าปะทะแล้วเร่งฝีเท้า
  if (u.dashSpeed && (u.slsReadyAt == null || t >= u.slsReadyAt)) {
    const near = state.units.some((e) => e.alive && e.team !== u.team && dist(u, e) <= u.range + 300);
    if (near) {
      u.slsReadyAt = t + u.dashSpeed.cd * (1 - cdr);
      addBuffUnique(u, "sls", { type: "ms", v: u.dashSpeed.ms, until: t + u.dashSpeed.dur }, t);
    }
  }

  // Anubis' Death Mark — ขว้างมีดตีตราเป้าที่ใกล้ที่สุด
  if (u.deathMark && (u.admReadyAt == null || t >= u.admReadyAt)) {
    const cfg = u.deathMark;
    let best = null;
    for (const e of state.units) {
      if (!e.alive || e.team === u.team) continue;
      const d = dist(u, e);
      if (d > cfg.range) continue;
      if (!best || d < best.d) best = { e, d };
    }
    if (best) {
      u.admReadyAt = t + cfg.cd * (1 - cdr);
      addBuffUnique(best.e, "adm:slow:" + u.id, { type: "slow", v: cfg.slow, until: t + cfg.slowDur }, t);
      addBuffUnique(best.e, "adm:mark:" + u.id, { type: "vulnerable", v: cfg.amp, until: t + cfg.markDur }, t);
      vfx(state, { kind: "ring", x: best.e.x, y: best.e.y, r: best.e.radius + 18, color: "232,163,61", grow: 0.9 });
    }
  }

  // Fang of the Midgard Serpent — เก็บเวลาไว้ให้ incomingShieldMul ใช้
  if (u.shieldCutUntil != null && t >= u.shieldCutUntil) {
    u.shieldCutUntil = null;
    u.shieldCutAmt = 0;
  }
}


// เป้าที่เพิ่งโดนคนถือ Midgard ตี จะรับโล่ใหม่ได้น้อยลงชั่วคราว
export function markShieldCut(state, source, target) {
  if (!source || !source.shieldBreak || !target) return;
  target.shieldCutUntil = state.t + source.shieldBreak.dur;
  target.shieldCutAmt = source.shieldBreak.incomingCut;
  target.curT = state.t;
}
