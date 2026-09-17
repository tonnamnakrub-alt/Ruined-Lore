import { tr } from "../i18n.js";
import { applyDamage, healUnit } from "./damage.js";
import { addBuffUnique, dist, vfx, withSrc } from "./state-util.js";
import { cdrFromItemHaste } from "./stats.js";


// ---------------------------------------------------------------
// กลไกของไอเทมสายเวท Tier 3
//
// แบ่งตามจังหวะที่ทำงาน
//   ตอนดาเมจเวทเข้า   -> onMagicDamage()   : Surtr, Yuki-onna, Zephyrus, Raijin, Nemesis
//   ตอนคิดดาเมจ       -> giantSlayerAmp()  : Jack
//   ตอนร่ายสกิล        -> onMageCast()      : Caliburn, Hel
//   ตอนออโต้เข้าเป้า   -> mageOnHit()       : Kitsune, Caliburn (กินหมัดที่ชาร์จไว้)
//   ทุกเฟรม           -> tickMageItems()   : Merlin, Norns, Nemesis (จุดระเบิด), Hel (วงน้ำแข็ง)
//   ตอนได้สังหาร       -> onMageTakedown()  : Amrita
//
// ทุกอย่างที่โมดูลนี้ยิงดาเมจเองต้องหุ้มด้วย echo() ไม่งั้นดาเมจของมันเอง
// จะไปทริกเกอร์ onMagicDamage ซ้ำจนวนไม่รู้จบ (โดยเฉพาะไฟเผาของ Surtr)
// ---------------------------------------------------------------

let echoDepth = 0;

function echo(fn) {
  echoDepth += 1;
  try { return fn(); } finally { echoDepth -= 1; }
}

function ready(u, key, seconds) {
  return u[key] == null || u.stateT >= u[key];
}

function enemiesNear(state, u, x, y, r) {
  return state.units.filter((e) => e.alive && e.team !== u.team && Math.hypot(e.x - x, e.y - y) <= r + e.radius);
}


// ---------------------------------------------------------------
// Jack's Giantbane Harp — ศัตรูเลือดหนากว่าเรามากเท่าไหร่ ดาเมจเวทยิ่งแรงขึ้น
// เต็มเพดานเมื่อเป้ามี Max HP มากกว่าเราเป็นเท่าตัว
// ---------------------------------------------------------------
export function giantSlayerAmp(source, target) {
  if (!source || !source.giantSlayer || !target || !(target.maxHp > 0)) return 1;
  const gap = (target.maxHp - source.maxHp) / target.maxHp;
  return 1 + source.giantSlayer * Math.max(0, Math.min(1, gap));
}


// ---------------------------------------------------------------
// ทำงานทุกครั้งที่ดาเมจ "เวท" เข้าเป้า
// ---------------------------------------------------------------
export function onMageDamageHook(state, source, target, dmg) {
  if (echoDepth > 0 || !source || !target || !source.hasItem || !(dmg > 0)) return;
  if (!source.alive || source.team === target.team) return;
  const t = state.t;

  // Surtr's Twilight Cinder — ไฟติดตัวเผา % Max HP ต่อวินาที (ต่ออายุ ไม่ซ้อน)
  if (source.burnPctHp) {
    target.stcBurn = {
      ownerId: source.id,
      dps: target.maxHp * source.burnPctHp.pct,
      until: t + source.burnPctHp.dur,
    };
  }

  // Yuki-onna's Frozen Scepter — ดาเมจเวททุกชนิดสโลว์
  if (source.spellSlow) {
    addBuffUnique(target, "yfs:" + source.id, {
      type: "slow", v: source.spellSlow.v, until: t + source.spellSlow.dur,
    }, t);
  }

  // Zephyrus' Gale Cloak — ร่ายเวทโดนแล้ววิ่งไวช่วงสั้นๆ
  if (source.spellHaste && (source.zgcReadyAt == null || t >= source.zgcReadyAt)) {
    source.zgcReadyAt = t + source.spellHaste.cd;
    addBuffUnique(source, "zgc", { type: "ms", v: source.spellHaste.ms, until: t + source.spellHaste.dur }, t);
  }

  // Nemesis' Vengeful Scales — มาร์กเป้าแล้วสะสมดาเมจเวทไว้ระเบิดทีเดียว
  if (source.storedBurst) {
    const cfg = source.storedBurst;
    if (!source.nvsMark && (source.nvsReadyAt == null || t >= source.nvsReadyAt)) {
      source.nvsMark = { targetId: target.id, until: t + cfg.dur, acc: 0 };
      vfx(state, { kind: "ring", x: target.x, y: target.y, r: target.radius + 20, color: "214,120,232", grow: 0.5 });
    }
    if (source.nvsMark && source.nvsMark.targetId === target.id) source.nvsMark.acc += dmg;
  }

  // Raijin's Thunder Drum — สกิลเวทถัดไปแรงขึ้นและชิ่งไปหาศัตรูข้างเคียง
  if (source.chainBolt && source.rsdArmed) {
    const cfg = source.chainBolt;
    source.rsdArmed = false;
    source.rsdReadyAt = t + cfg.cd * (1 - cdrFromItemHaste(source.itemHaste || 0));
    echo(() => {
      withSrc(state, tr("ไอเทม Raijin's Thunder Drum"), source, () => {
        applyDamage(state, source, target, cfg.flat + cfg.apRatio * source.ap, true, false);
        const arcs = state.units
          .filter((e) => e.alive && e.team !== source.team && e.id !== target.id && dist(e, target) <= cfg.arcRange)
          .slice(0, cfg.arcs);
        for (const e of arcs) {
          applyDamage(state, source, e, cfg.arcFlat + cfg.arcApRatio * source.ap, true, false);
          vfx(state, { kind: "ring", x: e.x, y: e.y, r: e.radius + 14, color: "126,199,255", grow: 0.8 });
        }
      });
    });
  }
}


// ---------------------------------------------------------------
// ตอนร่ายสกิล
// ---------------------------------------------------------------
export function onMageCast(state, u, sk) {
  if (!u.hasItem) return;
  const t = state.t;

  // Caliburn's Spellblade — ชาร์จหมัดถัดไปให้เป็นดาเมจเวท
  if (u.spellblade && (u.csbReadyAt == null || t >= u.csbReadyAt)) {
    u.csbReadyAt = t + u.spellblade.cd;
    const baseAd = u.champ.ad + u.champ.adG * (u.level - 1);
    u.csbCharge = u.spellblade.baseAdRatio * baseAd + u.spellblade.apRatio * u.ap;
  }

  // Norns' Thread of Weaving — ร่ายอันติจบแล้วได้ความเร็วเดินและพลังเวทพุ่งสั้นๆ
  if (u.ultSurge && sk && sk.ult) {
    addBuffUnique(u, "ntw", { type: "ms", v: u.ultSurge.ms, until: t + u.ultSurge.dur }, t);
    addBuffUnique(u, "ntwap", { type: "apPct", v: u.ultSurge.apPct, until: t + u.ultSurge.dur }, t);
    vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 30, color: "214,120,232", grow: 0.7 });
  }

  // Raijin's Thunder Drum — ติดอาวุธให้สกิลเวทลูกถัดไป
  if (u.chainBolt && !u.rsdArmed && (u.rsdReadyAt == null || t >= u.rsdReadyAt)) u.rsdArmed = true;

  // Hel's Nether Domain — ปล่อยอัลติแล้วเปิดวงน้ำแข็งค้างไว้
  if (u.ultZone && sk && sk.ult) {
    const z = u.ultZone;
    state.mageZones.push({
      ownerId: u.id, team: u.team, x: u.x, y: u.y, r: z.r,
      until: t + z.dur, dps: z.flat + z.apRatio * u.ap, mrShred: z.mrShred,
    });
    vfx(state, { kind: "ring", x: u.x, y: u.y, r: z.r, color: "126,199,255", grow: 0.2, dur: z.dur });
  }
}


// ---------------------------------------------------------------
// ตอนออโต้เข้าเป้า
// ---------------------------------------------------------------
export function mageOnHit(state, u, target) {
  if (!u.hasItem) return;

  // Kitsune's Foxfire Fan — ออโต้แถมดาเมจเวททุกครั้ง
  if (u.apOnHit) {
    echo(() => {
      withSrc(state, tr("ไอเทม Kitsune's Foxfire Fan"), u, () => {
        applyDamage(state, u, target, u.apOnHit.flat + u.apOnHit.apRatio * u.ap, true, false);
      });
    });
  }

  // Caliburn's Spellblade — ปล่อยหมัดที่ชาร์จไว้
  if (u.csbCharge > 0) {
    const amt = u.csbCharge;
    u.csbCharge = 0;
    echo(() => {
      withSrc(state, tr("ไอเทม Caliburn's Spellblade"), u, () => {
        applyDamage(state, u, target, amt, true, false);
      });
    });
  }
}


// ---------------------------------------------------------------
// ตอนได้สังหารหรือช่วยสังหาร — Amrita's Nectar Goblet
// ---------------------------------------------------------------
export function onMageTakedown(state, u) {
  if (!u || !u.hasItem || !u.takedownHeal) return;
  // สเปคใหม่: ทำงานเฉพาะสังหาร/ช่วยสังหารครั้งแรกของไฟต์เท่านั้น
  if (u.takedownHeal.once) {
    if (u.amritaUsed) return;
    u.amritaUsed = true;
  }
  const amt = u.takedownHeal.flat + u.takedownHeal.apRatio * u.ap;
  echo(() => {
    for (const a of state.units) {
      if (!a.alive || a.team !== u.team) continue;
      withSrc(state, tr("ไอเทม Amrita's Nectar Goblet"), u, () => healUnit(state, a, amt));
    }
  });
  vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 60, color: "232,214,120", grow: 1, dur: 0.7 });
}


// ---------------------------------------------------------------
// ต่อเฟรม ต่อยูนิต
// ---------------------------------------------------------------
export function tickMageItems(state, u, dt) {
  if (!u.hasItem) return;
  const t = state.t;
  const cdr = cdrFromItemHaste(u.itemHaste || 0);

  // ไฟของ Surtr ที่ติดอยู่บนตัวนี้
  if (u.stcBurn) {
    if (t > u.stcBurn.until) {
      u.stcBurn = null;
    } else {
      const owner = state.units.find((x) => x.id === u.stcBurn.ownerId);
      if (!owner || !owner.alive) u.stcBurn = null;
      else echo(() => {
        withSrc(state, tr("ไอเทม Surtr's Twilight Cinder"), owner, () => {
          applyDamage(state, owner, u, u.stcBurn.dps * dt, true, false);
        });
      });
    }
  }

  // Nemesis' Vengeful Scales — ครบเวลาแล้วระเบิดดาเมจที่สะสมไว้
  if (u.nvsMark && t >= u.nvsMark.until) {
    const cfg = u.storedBurst;
    const mark = u.nvsMark;
    u.nvsMark = null;
    u.nvsReadyAt = t + cfg.cd * (1 - cdr);
    const victim = state.units.find((x) => x.id === mark.targetId);
    if (victim && victim.alive) {
      echo(() => {
        withSrc(state, tr("ไอเทม Nemesis' Vengeful Scales"), u, () => {
          applyDamage(state, u, victim, cfg.flat + cfg.accRatio * mark.acc, true, false);
        });
      });
      vfx(state, { kind: "ring", x: victim.x, y: victim.y, r: victim.radius + 46, color: "214,120,232", grow: 1.2 });
    }
  }

  // Merlin's Starbolt Staff — ยิงดาวตกใส่กลุ่มศัตรูที่ไกลได้
  if (u.meteor && (u.mrtReadyAt == null || t >= u.mrtReadyAt)) {
    const cfg = u.meteor;
    let best = null;
    for (const e of state.units) {
      if (!e.alive || e.team === u.team || dist(u, e) > cfg.range) continue;
      const n = enemiesNear(state, u, e.x, e.y, cfg.r).length;
      if (!best || n > best.n) best = { e, n };
    }
    if (best) {
      u.mrtReadyAt = t + cfg.cd * (1 - cdr);
      const power = cfg.flat + cfg.apRatio * u.ap;
      echo(() => {
        withSrc(state, tr("ไอเทม Merlin's Starbolt Staff"), u, () => {
          for (const e of enemiesNear(state, u, best.e.x, best.e.y, cfg.r)) {
            applyDamage(state, u, e, power, true, false);
          }
        });
      });
      vfx(state, { kind: "ring", x: best.e.x, y: best.e.y, r: cfg.r, color: "232,163,61", grow: 1.1 });
    }
  }

}


// ---------------------------------------------------------------
// วงน้ำแข็งของ Hel — เรียกครั้งเดียวต่อเฟรม
// ---------------------------------------------------------------
export function tickMageZones(state, dt) {
  if (!state.mageZones.length) return;
  state.mageZones = state.mageZones.filter((z) => {
    if (state.t > z.until) return false;
    const owner = state.units.find((x) => x.id === z.ownerId);
    if (!owner) return false;
    for (const e of state.units) {
      if (!e.alive || e.team === z.team) continue;
      if (Math.hypot(e.x - z.x, e.y - z.y) > z.r + e.radius) continue;
      addBuffUnique(e, "hnd:" + z.ownerId, { type: "mrshred", v: z.mrShred, until: state.t + dt * 2 }, state.t);
      echo(() => {
        withSrc(state, tr("ไอเทม Hel's Nether Domain"), owner, () => {
          applyDamage(state, owner, e, z.dps * dt, true, false);
        });
      });
    }
    return true;
  });
}
