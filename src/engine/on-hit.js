import { tr } from "../i18n.js";
import { applyDamage, grantShield, healUnit, skillPower } from "./damage.js";
import { addBuff, addBuffUnique, dist, skillLabel, vfx, addFrag, withSrc } from "./state-util.js";
import { supportOnHitBonus } from "./support.js";
import { mageOnHit } from "./mage.js";
import { assassinOnHit } from "./assassin.js";
import { activeSkills } from "./targeting.js";
import { arthurCleave, carriageCrash, ellaOnHit, pickDuelMark } from "./lore.js";
import { loreItemsOnHit } from "./lore-items.js";


// Lost Boys' Blade — มีดยังปักอยู่ แล้วโดนอะไรก็ตามจากคนปาซ้ำ (ออโต้ "หรือสกิล")
// เลือดที่เหลือจะแตกออกมาทั้งก้อนทันที · กันเรียกซ้อนตัวเองด้วย popping
let popping = false;
export function popDagger(state, u, target) {
  if (popping || !target.dagger || target.dagger.ownerId !== u.id) return;
  const d = state.dots.find((x) => x.targetId === target.id && x.ownerId === u.id && x.dagger);
  target.dagger = null;
  if (!d) return;
  // ยอดที่ยังไม่ได้จ่ายจริง — เลือดไหลจ่ายเป็นงวดแล้ว คิดจากเวลาที่เหลืออย่างเดียวไม่ตรง
  const left = d.left != null ? d.left : Math.max(0, d.until - state.t) * d.dps;
  state.dots = state.dots.filter((x) => x !== d);
  if (left <= 0) return;
  popping = true;
  const prev = state.dmgSrc;
  state.dmgSrc = tr("จุดระเบิดมีดสั้น");
  try { applyDamage(state, u, target, left, false); }
  finally { popping = false; state.dmgSrc = prev; }
}


// fragments, Monochrome's magic rider, and Double Cross's empowered hit
export function onAutoLanded(state, u, target) {
  vfx(state, { kind: "flash", x: target.x, y: target.y, r: 34, color: u.team === "blue" ? "140,190,255" : "255,150,155", dur: 0.18 });
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
  popDagger(state, u, target);
  // ---- Patch 0.3 ----
  // ELLA — เศษแก้วติดออโต้ และปลดล็อกจังหวะถัดไปของคอมโบ Q
  if (u.champ.glassShards) {
    // ออโต้ครั้งแรกตอนล่องหนคือจังหวะเปิดตัว ต้องลากราชรถลงมาทุบก่อนที่ล่องหนจะหลุด
    if (u.carriage) carriageCrash(state, u, target);
    ellaOnHit(state, u, target);
    if (u.comboStep && state.t < (u.comboUntil || 0)) u.comboArmed = true;
  }
  // ARTHUR — ออโต้ฟันกวาดรอบเป้า
  if (u.champ.aegis) arthurCleave(state, u, target);
  if (u.champ.fragments && u.shadow <= 0) addFrag(u, u.champ.fragments.onAuto);
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
  loreItemsOnHit(state, u, target);
  mageOnHit(state, u, target);
  assassinOnHit(state, u, target);
  marksmanOnHit(state, u, target);
  // (พาสซีฟพิน็อกคิโอย้ายไปเต้นทุก 1 วิใน step.js แล้ว)
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
  // ลูกผสมจริง — ก้อนนี้สเกลทั้ง Bonus AD และ AP พอๆ กัน จะออกของสายไหนก็ได้ผล
  if (u.shadow > 0) {
    const pct = [0.05, 0.06, 0.07, 0.08][tier] + 0.01 * (u.bonusAd / 100) + 0.01 * ((u.ap || 0) / 200);
    state.dmgSrc = tr("พาสซีฟ ร่างเงา");
    applyDamage(state, u, target, target.maxHp * pct, false, true);
  } else if (u.light > 0) {
    const per = [0.005, 0.0075, 0.01, 0.0125][tier] + 0.0012 * (u.bonusAd / 100) + 0.0012 * ((u.ap || 0) / 200);
    state.dmgSrc = tr("พาสซีฟ ร่างแสง");
    applyDamage(state, u, target, target.maxHp * per * u.light, false, true);
  }
}


// โดนตีก็สะสมได้ — ออโต้นับทุกครั้ง ส่วนสกิลนับครั้งเดียวต่อการร่ายหนึ่งครั้ง
// (สกิลที่ทำดาเมจต่อเนื่องยิงป้ายเดิมซ้ำๆ เลยกันด้วยหน้าต่างเวลา 2 วิต่อป้าย)
const ABILITY_WINDOW = 2.0;

export function gainIsoldeOnTaken(state, u, source, label, isAuto) {
  const cfg = u.champ && u.champ.isolde;
  if (!cfg || !cfg.onTaken || !source || source.team === u.team) return;
  if (!isAuto) {
    const key = source.id + "|" + String(label || "?");
    u.isoSeen = u.isoSeen || {};
    if (state.t - (u.isoSeen[key] || -99) < ABILITY_WINDOW) return;
    u.isoSeen[key] = state.t;
  }
  gainIsolde(state, u, cfg.onTaken);
}


export function gainIsolde(state, u, amount) {
  const cfg = u.champ.isolde;
  if (!cfg) return;
  if (u.lastStand) return; // I WILL NOT YIELD suppresses the passive entirely — the drain is real
  u.isolde += amount;
  if (u.isolde >= cfg.need) {
    u.isolde -= cfg.need;
    // ฮีลสเกลทั้งเลเวลและพลังโจมตี — ยิ่งออกของตียิ่งได้ฮีลคืนเยอะ
    const pct = cfg.base + cfg.perLevel * u.level + (cfg.perAd || 0) * (u.ad || 0);
    const amt = (u.maxHp - u.hp) * pct;
    if (cfg.shield) {
      // จ่ายเป็นโล่ที่ค่อยๆ สลายแทนการฮีล — กันได้ทันทีแต่ไม่ค้างถ้าไม่ได้ใช้
      const dur = cfg.shieldDur || 5;
      grantShield(u, amt);
      u.isoShield = { amt, granted: amt, start: state.t, until: state.t + dur, dur };
      addBuffUnique(u, "isoshield", { type: "shield", v: 1, until: state.t + dur }, state.t);
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 50, color: "228,235,247", grow: 1, dur: 0.6 });
    } else {
      healUnit(state, u, amt);
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 50, color: "63,191,127", grow: 1, dur: 0.6 });
    }
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

}


// Cricket's Whisper — เรียกทุก 1 วิจาก step.js (ไม่ผูกกับการตี/ร่ายอีกแล้ว)
//   ฐานคิดจาก Max HP · เพื่อนเลือดต่ำกว่า 40% ได้สองเท่า · คนที่เพิ่งโดน Q ได้สองเท่าอีกชั้น
export function kindnessTick(state, healer, target) {
  const k = healer.champ.kindness;
  if (!k || !healer.alive || !target.alive || target.id === healer.id) return;
  if (target.team !== healer.team || dist(healer, target) > k.radius) return;
  // สเปคใหม่: ฮีลเป็นตัวเลขตรงๆ (flat + ต่อเลเวล + ต่อ AP) ไม่ใช่ % Max HP อีกแล้ว
  // ของเก่าที่คิดเป็น % ยังรองรับอยู่ เผื่อมีตัวอื่นมาใช้ฟิลด์เดิม
  let amount = k.flat != null
    ? k.flat + (k.perLevel || 0) * healer.level + (k.perAp || 0) * healer.ap
    : ((k.base || 0) + (k.perLevel || 0) * healer.level + (k.perAp || 0) * healer.ap)
      * (k.maxHp ? target.maxHp : Math.max(0, target.maxHp - target.hp));
  if (k.lowHpAt && target.hp / target.maxHp < k.lowHpAt) amount *= k.lowHpMul || 2;
  if (healer.kindnessBoostUntil && state.t < healer.kindnessBoostUntil) amount *= k.qMul || 2;
  if (amount > 0 && target.hp < target.maxHp) {
    withSrc(state, tr("พาสซีฟ Cricket's Whisper"), healer, () => healUnit(state, target, amount));
  }
}


export function consumeOnHit(state, u, target) {
  if (!u.onHit || u.onHit.charges <= 0 || state.t > u.onHit.until) { u.onHit = null; return; }
  const sk = u.onHit.skill;
  state.dmgSrc = skillLabel(u, sk);
  applyDamage(state, u, target, skillPower(u, sk, target), !!sk.magic);
  // สเปคใหม่: ตัด "คูลดาวน์ที่เหลืออยู่" ทิ้ง 30% ต่อฮิต ไม่ใช่ตัดตามคูลดาวน์เต็ม (อัลติไม่โดน)
  if (sk.cdCutOnHit) for (const x of activeSkills(u)) if (x.key !== "R" && x.cdLeft > 0) {
    x.cdLeft = Math.max(0, x.cdLeft * (1 - sk.cdCutOnHit));
  }
  // ARTHUR Q — เป้าเลือดเกินครึ่ง จะสับซ้ำอีกดาบทันทีด้วยความเร็วสูงสุด
  if (sk.doubleAbove && target.alive && target.hp / target.maxHp > sk.doubleAbove) {
    state.dmgSrc = tr("ออโต้");
    applyDamage(state, u, target, u.ad, false, false, true);
    onAutoLanded(state, u, target);
    u.hits += 1;
  }
  u.onHit.charges -= 1;
  if (u.onHit.charges <= 0) u.onHit = null;
}
