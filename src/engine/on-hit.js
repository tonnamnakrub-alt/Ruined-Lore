import { tr } from "../i18n.js";
import { applyDamage, healUnit, skillPower } from "./damage.js";
import { addBuff, dist, skillLabel, vfx } from "./state-util.js";
import { supportOnHitBonus } from "./support.js";
import { mageOnHit } from "./mage.js";
import { assassinOnHit } from "./assassin.js";
import { activeSkills } from "./targeting.js";


// fragments, Monochrome's magic rider, and Double Cross's empowered hit
export function onAutoLanded(state, u, target) {
  // Achilles' Talaria: every basic attack also deals a slice of the target's max HP,
  // as whichever damage type the attacker itself leans toward
  if (u.onHitAdaptive) {
    const magic = u.ap > u.ad;
    state.dmgSrc = tr("ไอเทม ติดตอนตีโดน");
    applyDamage(state, u, target, target.maxHp * u.onHitAdaptive, magic, false);
  }
  // Blade of the Impaled Voivode: first hit on a target (fixed CD 6s, no AH/Item Haste)
  // adds 15% of its max HP as bonus damage, fully healed back
  if (u.hasItem("biv")) {
    u.bivReady = u.bivReady || {};
    if (u.bivReady[target.id] == null || state.t >= u.bivReady[target.id]) {
      u.bivReady[target.id] = state.t + 6;
      const bonus = target.maxHp * 0.15;
      state.dmgSrc = tr("ไอเทม Blade of the Infinite Void");
      applyDamage(state, u, target, bonus, false, false);
      healUnit(state, u, bonus);
    }
  }
  // Colossal Club of the Oni: every hit cleaves a cone behind the target for
  // 15 + 1.5% of the wearer's own max HP
  if (u.hasItem("cco")) {
    const ang = Math.atan2(target.y - u.y, target.x - u.x);
    const power = 15 + 0.015 * u.maxHp;
    for (const e of state.units) {
      if (!e.alive || e.team === u.team || e.id === target.id) continue;
      if (dist(u, e) > 350) continue;
      const ea = Math.atan2(e.y - u.y, e.x - u.x);
      const diff = Math.abs(((ea - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      state.dmgSrc = tr("ไอเทม ฟันวงกว้าง");
      if (diff < (60 * Math.PI) / 180 / 2) applyDamage(state, u, e, power, false, false);
    }
  }
  // Cleaver of the Gorgon's Bane: physical hits shred the target's armor,
  // stacking up to 5 times, and speed the wearer up per stack currently applied
  if (u.hasItem("cbg")) {
    const old = target.buffs.find((b) => b.type === "shred" && b.sourceId === u.id);
    const stacks = Math.min(5, (old ? old.stacks : 0) + 1);
    target.buffs = target.buffs.filter((b) => !(b.type === "shred" && b.sourceId === u.id));
    addBuff(target, { type: "shred", v: 0.05 * stacks, stacks, sourceId: u.id, until: state.t + 4 }, state.t);
    addBuff(u, { type: "ms", v: stacks * 0.011, until: state.t + 4 }, state.t);
  }
  // Another Eye: (mark now detonates centrally in applyDamage on any damage source)
  for (const x of activeSkills(u)) if (x.cdPerAuto && x.cdLeft > 0) x.cdLeft = Math.max(0, x.cdLeft - x.cdPerAuto);
  // Peter's dagger: hitting a stuck target cashes in the rest of the bleed at once
  if (target.dagger && target.dagger.ownerId === u.id) {
    const d = state.dots.find((x) => x.targetId === target.id && x.ownerId === u.id && x.dagger);
    if (d) {
      const left = Math.max(0, d.until - state.t) * d.dps;
      state.dmgSrc = tr("ไอเทม จุดระเบิดพิษกริช");
      if (left > 0) applyDamage(state, u, target, left, false);
      state.dots = state.dots.filter((x) => x !== d);
    }
    target.dagger = null;
  }
  if (u.champ.fragments && u.shadow <= 0) {
    u.light += 1;
    if (u.light >= u.champ.fragments.max) { u.light = 0; u.shadow = 1; }
  }
  if (u.champ.fragments) applyFragmentDamage(state, u, target);
  if (u.champ.doubleTrouble) {
    state.dmgSrc = tr("พาสซีฟ Double Trouble");
    applyDamage(state, u, target, 6 + 1.2 * u.level + 0.25 * u.ap, true);
  }
  state.dmgSrc = tr("ออโต้ติดพลัง");
  if (u.empower > 0) { applyDamage(state, u, target, u.empower, false); u.empower = 0; }
  state.dmgSrc = tr("ไอเทม Blade of the Dark Champion");
  if (u.bdcEmpower > 0) { applyDamage(state, u, target, u.bdcEmpower, false); u.bdcEmpower = 0; }
  // Aceso's Guiding Censer: on-hit เวทที่บัฟไว้จากการฮีล/กางโล่
  {
    const bonus = supportOnHitBonus(u);
    if (bonus > 0) {
      state.dmgSrc = tr("ไอเทม Aceso's Guiding Censer");
      applyDamage(state, u, target, bonus, true, false);
    }
  }
  mageOnHit(state, u, target);
  assassinOnHit(state, u, target);
  marksmanOnHit(state, u, target);
  kindnessTick(state, u);
}


// ---------------------------------------------------------------
// ของสายมาร์คแมน Tier 3 — ทุกอันทำงานตอนออโต้เข้าเป้า
// เรียกซ้ำได้ (Hephaestus เบิ้ลผล) เลยต้องกันไม่ให้นับฮิตซ้ำ
// ---------------------------------------------------------------
export function marksmanOnHit(state, u, target, echo) {
  if (!u.hasItem) return;

  if (!echo) {
    u.mmHits = (u.mmHits || 0) + 1;

    // Sleipnir's Galloping Horseshoe: ทุก 10 วิ ออโต้แรกได้ความเร็วเดิน +40% จางใน 2.5 วิ
    if (u.hasItem("slh") && state.t >= (u.slhReadyAt || 0)) {
      u.slhReadyAt = state.t + 10;
      addBuff(u, { type: "ms", v: 0.4, decayFrom: state.t, until: state.t + 2.5 }, state.t);
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 26, color: "232,163,61", grow: 0.6 });
    }

    // Urd's Loom of Fate: ออโต้ลดคูลดาวน์ที่เหลือของ Q/W/E ลง 12%
    if (u.hasItem("ulf")) {
      for (const sk of u.skills || []) {
        if (sk.key === "R" || !(sk.cdLeft > 0)) continue;
        sk.cdLeft = Math.max(0, sk.cdLeft * 0.88);
      }
    }

    // Bow of Eurytus: ออโต้ที่ติดอาวุธไว้แถมดาเมจเวท แล้วรีเซ็ตเป็นทุก 5 วิ
    if (u.hasItem("boe") && u.boeArmed) {
      u.boeArmed = false;
      u.boeReadyAt = state.t + 5;
      state.dmgSrc = tr("ไอเทม Bow of Eurytus");
      applyDamage(state, u, target, 50 + 0.2 * u.ap, true, false);
    }
  }

  const third = (u.mmHits || 0) % 3 === 0;

  // Indra's Vajra Dart: ครบ 3 ฮิต ระเบิด True Damage
  if (third && u.hasItem("ivd")) {
    state.dmgSrc = tr("ไอเทม Indra's Vajra Dart");
    applyDamage(state, u, target, 60 + 0.35 * (u.bonusAd || 0), false, true);
  }

  // Shiva's Trishula: ครบ 3 ฮิต โบนัสดาเมจกายภาพ
  if (third && u.hasItem("sst")) {
    state.dmgSrc = tr("ไอเทม Shiva's Trishula");
    applyDamage(state, u, target, 80 + 0.5 * (u.bonusAd || 0), false, false);
  }

  // Hephaestus' Twin Hammers: ฮิตที่ 3 เบิ้ลผล on-hit ซ้ำอีก 2 ครั้ง
  if (third && !echo && u.hasItem("hth")) {
    for (let k = 0; k < 2; k++) {
      if (!target.alive) break;
      state.dmgSrc = tr("ไอเทม Hephaestus' Twin Hammers");
      if (u.onHitAdaptive) applyDamage(state, u, target, target.maxHp * u.onHitAdaptive, u.ap > u.ad, false);
      marksmanOnHit(state, u, target, true);
    }
  }
}


export function applyFragmentDamage(state, u, target) {
  const L = u.level;
  const tier = L >= 16 ? 3 : L >= 11 ? 2 : L >= 6 ? 1 : 0;
  if (u.shadow > 0) {
    const pct = [0.05, 0.06, 0.07, 0.08][tier] + 0.01 * (u.bonusAd / 100);
    state.dmgSrc = tr("พาสซีฟ ร่างเงา");
    applyDamage(state, u, target, target.maxHp * pct, false, true);
  } else if (u.light > 0) {
    const per = [0.005, 0.0075, 0.01, 0.0125][tier] + 0.0012 * (u.bonusAd / 100);
    state.dmgSrc = tr("พาสซีฟ ร่างแสง");
    applyDamage(state, u, target, target.maxHp * per * u.light, false, true);
  }
}


export function gainIsolde(state, u, amount) {
  const cfg = u.champ.isolde;
  if (!cfg) return;
  if (u.lastStand) return; // I WILL NOT YIELD suppresses the passive entirely — the drain is real
  u.isolde += amount;
  if (u.isolde >= cfg.need) {
    u.isolde -= cfg.need;
    const pct = cfg.base + cfg.perLevel * u.level;
    healUnit(state, u, (u.maxHp - u.hp) * pct);
    vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 50, color: "63,191,127", grow: 1, dur: 0.6 });
  }
}


export function onSkillLanded(state, u, sk) {
  const sKids = u.champ.stillKids;
  if (sKids) {
    const n = u.buffs.filter((b) => b.type === "asstack").length;
    if (n < sKids.max) addBuff(u, { type: "as", v: sKids.per, until: state.t + sKids.dur }, state.t);
    u.buffs.push({ type: "asstack", v: 1, until: state.t + sKids.dur });
  }
  if (sk.cdCutAll) for (const x of activeSkills(u)) if (x.cdLeft > 0) x.cdLeft = Math.max(0, x.cdLeft - sk.cdCutAll);
  if (sk.bountyOnHit) u.bountyGold += sk.bountyOnHit;
}


export function kindnessTick(state, actor) {
  for (const p of state.units) {
    if (!p.alive || p.team !== actor.team || !p.champ.kindness) continue;
    if (p.id === actor.id) continue;
    const k = p.champ.kindness;
    if (dist(p, actor) > k.radius) continue;
    const pct = k.base + k.perLevel * p.level + k.perAp * p.ap;
    const missing = actor.maxHp - actor.hp;
    if (missing > 0) healUnit(state, actor, missing * pct);
  }
}


export function consumeOnHit(state, u, target) {
  if (!u.onHit || u.onHit.charges <= 0 || state.t > u.onHit.until) { u.onHit = null; return; }
  const sk = u.onHit.skill;
  state.dmgSrc = skillLabel(u, sk);
  applyDamage(state, u, target, skillPower(u, sk, target), !!sk.magic);
  if (sk.cdCutOnHit) for (const x of activeSkills(u)) if (x.key !== "R" && x.cdLeft > 0) {
    const full = x.cdByRank ? x.cdByRank[Math.max(0, x.rank - 1)] : x.cd;
    x.cdLeft = Math.max(0, x.cdLeft - full * sk.cdCutOnHit);
  }
  u.onHit.charges -= 1;
  if (u.onHit.charges <= 0) u.onHit = null;
}
