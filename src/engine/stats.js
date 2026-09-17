import { CHAMPIONS, LANE_CHAMPION } from "../data/champions.js";
import { STYLES } from "../data/tuning.js";
import { supportAlive } from "./state-util.js";
import { clamp } from "./util.js";


// ---------------- derived combat stats ----------------
export function deriveStats(unitDef) {
  const lvl = unitDef.level;
  const items = unitDef.items || [];
  const ch = CHAMPIONS[unitDef.champId || LANE_CHAMPION[unitDef.lane]];
  const g = lvl - 1;
  let maxHp = ch.hp + ch.hpG * g;
  let ad = ch.ad + ch.adG * g;
  let ap = 0;
  let armor = ch.armor + ch.armorG * g;
  let mr = ch.mr + ch.mrG * g;
  let range = ch.range;
  let atkSpeed = ch.as * (1 + ch.asG * g);
  let moveSpeed = ch.ms;
  let msMul = 1;          // ตัวคูณความเร็วเดินจากไอเทม (msPct)
  let hp5 = (ch.hp5 || 0) + (ch.hp5G || 0) * g;
  let leashCap = null;
  let noChaseLowHp = false;
  let adMul = 1;
  let crit = 0;
  let critDmg = 0;        // โบนัสดาเมจคริ บวกจากฐาน +75%
  let armorPenPct = 0;    // เจาะเกราะเป็น %
  let dmgAmpHighHp = 0;   // เลือดเยอะแล้วตีแรงขึ้นทุกชนิด
  let apMul = 1;
  let auraArmor = 0;
  let auraAdPct = 0;
  let ah = 0;           // Ability Haste
  let itemHaste = 0;    // Item Haste — separate, rare stat for item actives/passives only
  let pen = 0;          // Adaptive Penetration (flat, pre-mitigation reduction of the defender's resist)
  let mrPenPct = 0;     // เจาะต้านเวทเป็น % (คิดก่อน pen แบบ flat)
  let ultCdr = 0;       // ลดคูลดาวน์ท่าไม้ตายเฉพาะ
  let regenPct = 0;     // extra out-of-combat regen, % max HP per second
  // ฟิลด์กลไกสายเวท — เก็บออบเจกต์ตรงๆ เอาชิ้นแรกที่เจอ (ถือได้ชิ้นเดียวอยู่แล้ว)
  let apOnHit = null, spellblade = null, burnPctHp = null, spellSlow = null;
  let spellHaste = null, storedBurst = null, chainBolt = null, ultZone = null;
  let meteor = null, cdReset = null, takedownHeal = null, giantSlayer = 0;
  // ฟิลด์กลไกสายแอสซาซิน
  let dashStrike = null, ragePen = null, dashSpeed = null, tripleHit = null;
  let shieldBreak = null, executeHit = null, deathMark = null, denyDeath = null;
  let adPerKill = null, resetOnKill = false;
  let antihealOnDmg = null;  // { v, dur } — ตัดฮีลเป้าหมายเมื่อทำดาเมจใส่ (เอาอันที่แรงสุด)
  let healAmp = 0;      // % more effective healing, shielding, and vamp this unit RECEIVES
  let hors = 0;         // Heal & Shield Power — พลังฮีล/โล่ที่ยูนิตนี้ "จ่ายออก" ให้คนอื่น
  let omnivampFlat = 0; // Chaos Blade: flat omnivamp stacking with any champion vamp
  let dmgReduceAuto = 0;// Spartan Greaves: flat % reduction on incoming basic-attack damage
  let tenacity = 0;     // Asgardian Treads: baseline CC-duration reduction, stacks with buffs
  let onHitAdaptive = 0;// Achilles' Talaria: basic attacks also deal % max HP adaptive
  const auraTags = [];  // { kind, radius, ...params } — resolved into live auras when the fight builds
  const styleDmg = {};
  const styleArmorPct = {};

  // Yggdrasil's Radiant Heartwood นับจำนวนไอเทม Tier 3 ที่ถืออยู่ (รวมตัวมันเอง)
  const tier3Count = items.filter((i) => i.tier === 3).length;

  for (const it of items) {
    if (it.hp) maxHp += it.hp;
    if (it.ad) ad += it.ad;
    if (it.ap) ap += it.ap;
    if (it.mr) mr += it.mr;
    if (it.hp5) hp5 += it.hp5;
    if (it.adPct) adMul += it.adPct;
    if (it.apPct) apMul += it.apPct;
    if (it.armor) armor += it.armor;
    if (it.range) range += it.range;
    if (it.asPct) atkSpeed *= 1 + it.asPct;
    if (it.crit) crit += it.crit;
    if (it.critDmg) critDmg += it.critDmg;
    if (it.armorPenPct) armorPenPct += it.armorPenPct;
    if (it.dmgAmpHighHp) dmgAmpHighHp += it.dmgAmpHighHp;
    if (it.ms) moveSpeed += it.ms;
    if (it.msPct) msMul += it.msPct;
    if (it.ah) ah += it.ah;
    if (it.itemHaste) itemHaste += it.itemHaste;
    if (it.pen) pen += it.pen;
    if (it.mrPenPct) mrPenPct += it.mrPenPct;
    if (it.ultCdr) ultCdr += it.ultCdr;
    if (it.regenPct) regenPct += it.regenPct;
    if (it.healAmp) healAmp += it.healAmp;
    if (it.apOnHit && !apOnHit) apOnHit = it.apOnHit;
    if (it.spellblade && !spellblade) spellblade = it.spellblade;
    if (it.burnPctHp && !burnPctHp) burnPctHp = it.burnPctHp;
    if (it.spellSlow && !spellSlow) spellSlow = it.spellSlow;
    if (it.spellHaste && !spellHaste) spellHaste = it.spellHaste;
    if (it.storedBurst && !storedBurst) storedBurst = it.storedBurst;
    if (it.chainBolt && !chainBolt) chainBolt = it.chainBolt;
    if (it.ultZone && !ultZone) ultZone = it.ultZone;
    if (it.meteor && !meteor) meteor = it.meteor;
    if (it.cdReset && !cdReset) cdReset = it.cdReset;
    if (it.takedownHeal && !takedownHeal) takedownHeal = it.takedownHeal;
    if (it.giantSlayer) giantSlayer += it.giantSlayer;
    if (it.dashStrike && !dashStrike) dashStrike = it.dashStrike;
    if (it.ragePen && !ragePen) ragePen = it.ragePen;
    if (it.dashSpeed && !dashSpeed) dashSpeed = it.dashSpeed;
    if (it.tripleHit && !tripleHit) tripleHit = it.tripleHit;
    if (it.shieldBreak && !shieldBreak) shieldBreak = it.shieldBreak;
    if (it.executeHit && !executeHit) executeHit = it.executeHit;
    if (it.deathMark && !deathMark) deathMark = it.deathMark;
    if (it.denyDeath && !denyDeath) denyDeath = it.denyDeath;
    if (it.adPerKill && !adPerKill) adPerKill = it.adPerKill;
    if (it.resetOnKill) resetOnKill = true;
    if (it.antihealOnDmg && (!antihealOnDmg || it.antihealOnDmg.v > antihealOnDmg.v)) antihealOnDmg = it.antihealOnDmg;
    if (it.hors) hors += it.hors;
    if (it.tier3ScalingHors) hors += it.tier3ScalingHors * tier3Count;
    if (it.omnivampFlat) omnivampFlat += it.omnivampFlat;
    if (it.dmgReduceAuto) dmgReduceAuto = 1 - (1 - dmgReduceAuto) * (1 - it.dmgReduceAuto);
    if (it.tenacity) tenacity = 1 - (1 - tenacity) * (1 - it.tenacity);
    if (it.onHitAdaptive) onHitAdaptive += it.onHitAdaptive;
    if (it.leashCap) leashCap = leashCap == null ? it.leashCap : Math.min(leashCap, it.leashCap);
    if (it.noChaseLowHp) noChaseLowHp = true;
    if (it.kind === "style" && it.dmgPct) styleDmg[it.style] = (styleDmg[it.style] || 0) + it.dmgPct;
    if (it.kind === "style" && it.armorPct) styleArmorPct[it.style] = (styleArmorPct[it.style] || 0) + it.armorPct;
    if (it.auraArmor) auraArmor += it.auraArmor;
    if (it.auraAdPct) auraAdPct += it.auraAdPct;
    if (it.aura) auraTags.push(it.aura);
    if (it.reflect) auraTags.push({ kind: "reflect", ...it.reflect });
    if (it.onHitProc) auraTags.push({ kind: "onHitProc", ...it.onHitProc });
    if (it.stackOnMagic) auraTags.push({ kind: "stackOnMagic", ...it.stackOnMagic });
    if (it.combatStack) auraTags.push({ kind: "combatStack", ...it.combatStack });
    if (it.lowHpBurst) auraTags.push({ kind: "lowHpBurst", ...it.lowHpBurst });
  }
  ad *= adMul;
  ap *= apMul;
  moveSpeed *= msMul;

  // MID adaptive force: boost the higher of AD/AP. No AP yet, so AD.
  if (unitDef.lane === "MID") ad *= 1.1;

  const st = STYLES[unitDef.style] || STYLES.POKE;
  if (styleDmg[st.key]) ad *= 1 + styleDmg[st.key];
  if (styleArmorPct[st.key]) armor *= 1 + styleArmorPct[st.key];

  const baseHp = ch.hp + ch.hpG * g;
  const baseAdOnly = ch.ad + ch.adG * g;
  // Wendigo's Voracious Claw: แต้มที่สะสมข้ามยกมาแล้ว กลายเป็น AD ติดตัว
  const wvcStacks = Math.min(adPerKill ? adPerKill.max : 0, unitDef.wvcStacks || 0);
  if (adPerKill && wvcStacks > 0) ad += adPerKill.per * wvcStacks;
  // Lorla — Max HP ถาวรจากพาสซีฟ สะสมข้ามยกมาแล้ว
  const sangHp = Math.min((ch.sanguine && ch.sanguine.max) || 0, unitDef.sangHp || 0);
  if (sangHp > 0) maxHp += sangHp;

  return {
    champId: ch.id,
    bonusHp: Math.round(maxHp - baseHp),
    bonusAd: Math.round(ad - baseAdOnly),
    maxHp: Math.round(maxHp),
    ad: Math.round(ad),
    ap: Math.round(ap),
    armor: Math.round(armor),
    mr: Math.round(mr),
    range,
    atkSpeed,
    moveSpeed,
    hp5,
    leashCap,
    noChaseLowHp,
    auraArmor,
    auraAdPct,
    crit,
    critDmg,
    armorPenPct,
    dmgAmpHighHp,
    ah,
    itemHaste,
    pen,
    mrPenPct,
    ultCdr,
    regenPct,
    healAmp,
    antihealOnDmg,
    apOnHit, spellblade, burnPctHp, spellSlow, spellHaste,
    storedBurst, chainBolt, ultZone, meteor, cdReset, takedownHeal, giantSlayer,
    wvcStacks,
    sangHp,
    dashStrike, ragePen, dashSpeed, tripleHit, shieldBreak, executeHit,
    deathMark, denyDeath, adPerKill, resetOnKill,
    hors,
    auraTags,
    omnivampFlat,
    dmgReduceAuto,
    tenacity,
    onHitAdaptive,
  };
}


// League's own Ability Haste curve: CDR% = AH / (AH + 100)
export function cdrFromAh(ah) {
  return ah > 0 ? ah / (ah + 100) : 0;
}


// Item Haste is a separate, much rarer stat — only items with their own active/passive
// cooldowns should read this, never champion skill cooldowns (those stay on Ability Haste).
export function cdrFromItemHaste(ih) {
  return ih > 0 ? ih / (ih + 100) : 0;
}


export function fullCd(u, sk) {
  const base = sk.cdByRank ? sk.cdByRank[Math.max(0, sk.rank - 1)] : sk.cd;
  const ult = sk && sk.ult ? 1 - (u.ultCdr || 0) : 1;
  return base * (1 - cdrFromAh(u.ah || 0)) * ult;
}


// support passive: +1 to every athlete stat while the SUPPORT unit is alive
export function effStat(unit, key, supportAlive) {
  const raw = unit.athlete[key];
  return clamp(raw + (supportAlive && unit.lane !== "SUPPORT" ? 1 : 0), 0, 10);
}
