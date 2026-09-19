import { tr } from "../i18n.js";
import { applyDamage, grantShield } from "./damage.js";
import { addBuff, addBuffUnique, buffSum, dist, hasBuff, vfx } from "./state-util.js";
import { enemiesOf } from "./targeting.js";


// ---------------------------------------------------------------
// Patch 0.3 — เอฟเฟกต์ของไอเทมชุดใหม่ 12 ชิ้น
// บวกกับเอฟเฟกต์ที่เติมให้ของเก่าอีก 4 ชิ้นที่เดิมมีแต่ค่าสถานะล้วน
//   tet — ทุก 100 AP ได้เจาะต้านเวท 3
//   eoh — สกิลที่โดนแชมเปี้ยนจะเปิดตำแหน่งเป้า 2 วิ
//   asc — คริติคอลที่ลงติดสโลว์
//   wtc — ออโต้ครั้งแรกต่อเป้าแต่ละตัวในไฟต์เป็นดาเมจจริง
// ---------------------------------------------------------------

const CC = ["stun", "root", "taunt", "charm", "fear", "silence"];


// ทุกเฟรม ต่อยูนิต — เรียกจาก step.js
export function tickLoreItems(state, u, dt) {
  void dt;
  if (!u.hasItem) return;

  // Mímir's Whispering Well — คลื่นเวทรอบตัวทุก 1 วิ แล้วแปะตราขยายดาเมจเวท
  if (u.magicPulse) {
    const cfg = u.magicPulse;
    if (u.mwwNext == null) u.mwwNext = state.t + cfg.every;
    if (state.t >= u.mwwNext) {
      u.mwwNext = state.t + cfg.every;
      const dmg = cfg.flat + cfg.bonusHpPct * (u.bonusHp || 0);
      const prev = state.dmgSrc;
      state.dmgSrc = tr("ไอเทม Mímir's Whispering Well");
      let any = false;
      for (const e of enemiesOf(state, u)) {
        if (dist(u, e) > cfg.radius + e.radius) continue;
        any = true;
        applyDamage(state, u, e, dmg, true);
        addBuffUnique(e, "mww:" + u.id, { type: "magicamp", v: cfg.amp, until: state.t + cfg.dur }, state.t);
      }
      state.dmgSrc = prev;
      if (any) vfx(state, { kind: "ring", x: u.x, y: u.y, r: cfg.radius, color: "126,199,255", grow: 0.3, dur: 0.4 });
    }
  }

  // Argus' Hundred Eyes — ยิ่งมีศัตรูรุมยิ่งหนา (คิดใหม่ทุกเฟรม เก็บไว้ให้ step.js เอาไปบวก)
  if (u.crowdGuard) {
    const cfg = u.crowdGuard;
    let n = 0;
    for (const e of enemiesOf(state, u)) if (dist(u, e) <= cfg.radius + e.radius) n++;
    u.argusStacks = Math.min(cfg.max, n);
  } else u.argusStacks = 0;

  // Sleeping Beauty's Spindle — เลือดตกต่ำกว่า 30% แล้วแช่แข็งตัวเอง
  if (u.stasis && u.alive) {
    const cfg = u.stasis;
    const ready = u.sbsReadyAt == null || state.t >= u.sbsReadyAt;
    if (ready && u.hp / u.maxHp < cfg.hpBelow) {
      u.sbsReadyAt = state.t + cfg.cd;
      addBuff(u, { type: "untargetable", v: 1, until: state.t + cfg.dur }, state.t);
      addBuff(u, { type: "invuln", v: 1, until: state.t + cfg.dur }, state.t);
      addBuff(u, { type: "root", v: 1, until: state.t + cfg.dur }, state.t);
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 44, color: "190,225,255", grow: 1.1, dur: cfg.dur });
    }
  }
}


// Heimdall's Warding Horn — กดอัลติแล้วปล่อยเขตสโลว์รอบตัว
export function onUltCastItems(state, u) {
  if (!u.ultSlowField) return;
  const cfg = u.ultSlowField;
  if (u.hwgReadyAt != null && state.t < u.hwgReadyAt) return;
  u.hwgReadyAt = state.t + cfg.cd;
  state.lore.sights.push({
    kind: "hwg", ownerId: u.id, team: u.team, x: u.x, y: u.y, r: cfg.r,
    until: state.t + cfg.dur, next: 0, every: 0.2, slow: cfg.slow,
    sk: { th: "Heimdall's Warding Horn" }, rank: 0,
  });
  vfx(state, { kind: "ring", x: u.x, y: u.y, r: cfg.r, color: "126,199,255", grow: 0.4, dur: 0.8 });
}


// ทำงานตอนออโต้เข้าเป้า — เรียกจาก on-hit.js
export function loreItemsOnHit(state, u, target) {
  if (!u.hasItem) return;

  // Fafnir's Devouring Maw — ออโต้กิน % เลือดปัจจุบันของเป้า
  if (u.curHpOnHit) {
    const pct = u.champ.melee ? u.curHpOnHit.melee : u.curHpOnHit.ranged;
    const prev = state.dmgSrc;
    state.dmgSrc = tr("ไอเทม Fafnir's Devouring Maw");
    applyDamage(state, u, target, target.hp * pct, false, false);
    state.dmgSrc = prev;
  }
  // Fafnir — ครบ 3 ฮิตบนเป้าเดิม ระเบิดตาม Max HP แล้วขโมยความเร็ว
  if (u.maulBurst) {
    const cfg = u.maulBurst;
    u.maulHits = u.maulHits || {};
    u.maulReady = u.maulReady || {};
    if (u.maulReady[target.id] == null || state.t >= u.maulReady[target.id]) {
      u.maulHits[target.id] = (u.maulHits[target.id] || 0) + 1;
      if (u.maulHits[target.id] >= cfg.hits) {
        u.maulHits[target.id] = 0;
        u.maulReady[target.id] = state.t + cfg.cd;
        const prev = state.dmgSrc;
        state.dmgSrc = tr("ไอเทม Fafnir's Devouring Maw");
        applyDamage(state, u, target, target.maxHp * cfg.pct, false, false);
        state.dmgSrc = prev;
        addBuff(target, { type: "slow", v: cfg.msSteal, until: state.t + cfg.dur }, state.t);
        addBuff(u, { type: "ms", v: cfg.msSteal, until: state.t + cfg.dur }, state.t);
        vfx(state, { kind: "shock", x: target.x, y: target.y, r: 120, color: "232,163,61", dur: 0.5 });
      }
    }
  }

  // Atalanta's Swift Quiver — ออโต้แรกของการเข้าปะทะให้ความเร็วเดินก้อนใหญ่
  if (u.openerMs) {
    const cfg = u.openerMs;
    if (u.atqReadyAt == null || state.t >= u.atqReadyAt) {
      u.atqReadyAt = state.t + cfg.cd;
      addBuff(u, { type: "ms", v: cfg.ms, decayFrom: state.t, until: state.t + cfg.dur }, state.t);
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 22, color: "63,191,127", grow: 0.7 });
    }
  }

  // William Tell's Sovereign Crossbow — ออโต้ครั้งแรกต่อเป้าแต่ละตัวเป็นดาเมจจริง
  if (u.hasItem("wtc")) {
    u.tellSeen = u.tellSeen || {};
    if (!u.tellSeen[target.id]) {
      u.tellSeen[target.id] = 1;
      const prev = state.dmgSrc;
      state.dmgSrc = tr("ไอเทม William Tell's Sovereign Crossbow");
      applyDamage(state, u, target, u.ad * 0.5, false, true);
      state.dmgSrc = prev;
      vfx(state, { kind: "flash", x: target.x, y: target.y, r: 54, color: "255,236,190", dur: 0.3 });
    }
  }

  // Skadi's Triple Arrow — ยิงลูกเสริมใส่ศัตรูข้างเคียงอีกสองตัว
  if (u.splitBolts && !state.splitting) {
    const cfg = u.splitBolts;
    const pool = enemiesOf(state, u)
      .filter((e) => e.id !== target.id && dist(target, e) <= cfg.range)
      .slice(0, cfg.count);
    state.splitting = true;
    const prev = state.dmgSrc;
    state.dmgSrc = tr("ไอเทม Skadi's Triple Arrow");
    try {
      for (const e of pool) {
        applyDamage(state, u, e, u.ad * cfg.ratio, false, false, true);
        vfx(state, { kind: "beam", x: u.x, y: u.y, x2: e.x, y2: e.y, w: 3, color: "126,199,255", dur: 0.22 });
      }
    } finally { state.splitting = false; state.dmgSrc = prev; }
  }
}


// ทำงานตอนดาเมจเข้าเป้า — เรียกจาก damage.js
export function loreItemsOnDamage(state, source, target, dmg, magic, isAuto) {
  if (!source || !source.hasItem || !(dmg > 0) || !target.alive) return;

  // The Legendary Excalibur — ดาเมจก้อนแรกที่ลงแชมเปี้ยนแลกมาเป็นโล่
  if (source.firstHitShield) {
    const cfg = source.firstHitShield;
    if (source.lexReadyAt == null || state.t >= source.lexReadyAt) {
      source.lexReadyAt = state.t + cfg.cd;
      grantShield(source, cfg.flat + cfg.badRatio * (source.bonusAd || 0));
      addBuffUnique(source, "lex", { type: "shield", v: 1, until: state.t + cfg.dur }, state.t);
      addBuffUnique(source, "lexms", { type: "ms", v: cfg.ms, until: state.t + cfg.dur }, state.t);
      vfx(state, { kind: "aura", id: source.id, r: source.radius + 30, color: "255,236,190", dur: cfg.dur });
    }
  }

  // Morgana's Unravelling Thread — ดาเมจเวทลดต้านเวทเป้าทีละ 5% ซ้อนได้ 6 ชั้น
  if (magic && source.mrShredStack) {
    const cfg = source.mrShredStack;
    const old = target.buffs.find((b) => b.type === "mrshred" && b.sourceId === source.id);
    const n = Math.min(cfg.max, (old ? old.stacks : 0) + 1);
    target.buffs = target.buffs.filter((b) => !(b.type === "mrshred" && b.sourceId === source.id));
    addBuff(target, { type: "mrshred", v: cfg.pct * n, stacks: n, sourceId: source.id, until: state.t + cfg.dur }, state.t);
  }

  // Eye of Horus — สกิลเวทที่โดนแชมเปี้ยนจะเปิดตำแหน่งเป้าไว้
  if (magic && !isAuto && source.hasItem("eoh")) {
    target.buffs = target.buffs.filter((b) => b.type !== "stealth");
    addBuffUnique(target, "eoh:" + source.id, { type: "revealed", v: 1, until: state.t + 2 }, state.t);
  }

  // Ariadne's Guiding Thread — ตีเป้าที่ติดสโลว์หรือ CC อยู่ จะแปะตราให้ทีมตบซ้ำแรงขึ้น
  if (source.ccMark && !target.ariadne) {
    const slowed = hasBuff(target, "slow") || CC.some((t) => hasBuff(target, t));
    const ready = !source.agtReady || !source.agtReady[target.id] || state.t >= source.agtReady[target.id];
    if (slowed && ready) {
      source.agtReady = source.agtReady || {};
      source.agtReady[target.id] = state.t + source.ccMark.cd;
      target.ariadne = { team: source.team, amp: source.ccMark.amp, until: state.t + source.ccMark.dur };
      vfx(state, { kind: "ring", x: target.x, y: target.y, r: target.radius + 18, color: "232,214,120", grow: 0.6 });
    }
  }
}


// ตัวคูณดาเมจจากตราของ Ariadne และตราขยายดาเมจเวทของ Mímir
export function loreItemAmp(state, source, target, magic) {
  let amp = 1;
  if (magic) amp *= 1 + buffSum(target, "magicamp");
  const mark = target.ariadne;
  if (mark && source && source.team === mark.team && state.t < mark.until) {
    amp *= 1 + mark.amp;
    target.ariadne = null;
  }
  return amp;
}


// เก็บศพหรือช่วยเก็บ — เรียกจาก damage.js
export function loreItemsOnTakedown(state, u) {
  if (!u || !u.hasItem) return;
  // Mordred's Usurping Blade — คืนคูลดาวน์อัลติ 25% ของคูลดาวน์เต็ม
  if (u.ultRefundOnTakedown) {
    const ult = (u.skills || []).find((s) => s.ult);
    if (ult && ult.cdLeft > 0) {
      const full = ult.cdByRank ? ult.cdByRank[Math.max(0, ult.rank - 1)] : ult.cd;
      ult.cdLeft = Math.max(0, ult.cdLeft - full * u.ultRefundOnTakedown);
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 26, color: "229,72,77", grow: 0.7 });
    }
  }
  // Odysseus' Unstrung Bow — ได้ระยะโจมตีและความเร็วเดินชั่วคราว
  if (u.takedownReach) {
    const cfg = u.takedownReach;
    u.reachUntil = state.t + cfg.dur;
    u.reachAdd = cfg.range;
    addBuff(u, { type: "ms", v: cfg.ms, until: state.t + cfg.dur }, state.t);
    vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 30, color: "232,163,61", grow: 0.8 });
  }
}
