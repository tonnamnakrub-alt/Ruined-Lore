import { tr } from "../i18n.js";
import { DEFAULT_CAST, ULT_PATIENCE } from "../data/tuning.js";
import { onKazemCast } from "./kazem.js";
import { onUltCastItems } from "./lore-items.js";
import { bonusMs, dist, hasBuff, pushLog, spendFrag } from "./state-util.js";
import { fullCd } from "./stats.js";
import { activeSkills, alliesOf, bestSkillTarget, enemiesOf, estimate } from "./targeting.js";
import { canopyPick, daggerCount, domainHoldPlan, maskPlan } from "./lore-p4.js";


// ELLA Q — คอมโบที่ยังไม่จบ จังหวะถัดไปต้องกดต่อได้ทันที
// เดิมคูลดาวน์ลงตั้งแต่จังหวะแรก (10 วิ) แต่หน้าต่างคอมโบมีแค่ 5 วิ
// จังหวะ 2 กับ 3 จึงไม่มีวันได้ใช้ — Q เลยเหมือนมีท่าเดียว
function midCombo(u, sk) {
  if (sk.type === "zephyr") return !u.zephyr;
  return sk.type === "combo" && (u.comboStep || 0) + 1 < (sk.steps || []).length;
}


export function castSkills(state, u, target, d, disc, aw, prec) {
  for (const sk of activeSkills(u)) {
    // ท่าที่ล่องหนรออยู่ กดซ้ำได้เลยแม้คูลดาวน์จะยังไม่ลง
    const recast = sk.type === "zephyr" && u.zephyr && state.t <= u.zephyr.until;
    if (!recast && (sk.rank <= 0 || (sk.ammoMax ? sk.ammo <= 0 : sk.cdLeft > 0))) continue;
    let use = sk;
    if (sk.type === "dual") {
      if (u.shadow <= 0 && u.light <= 0) continue;
      const half = u.shadow > 0 ? sk.shadow : sk.light;
      use = { ...sk, ...half, key: sk.key, rank: sk.rank, cast: sk.cast, fragCost: true, isShadow: u.shadow > 0 };
    } else if (sk.shadowOnly && u.shadow <= 0) continue;
    else if (sk.fragCost && u.shadow <= 0 && u.light <= 0) continue;
    const aim = bestSkillTarget(state, u, use, target, aw) || target;
    const ad2 = dist(u, aim);
    if (!shouldCast(state, u, use, aim, ad2, disc, aw)) continue;
    target = aim;
    d = ad2;
    // Bad decision-making burns cooldowns on casts that accomplish nothing:
    // fired at the wrong moment, at someone already dead, or into a body block.
    if (u.rng() < ((10 - disc) / 10) * 0.34) {
      if (!use.fragCost) {
        if (sk.ammoMax) { sk.ammo -= 1; if (sk.rechargeAt == null) sk.rechargeAt = state.t + sk.rechargeTime; }
        else sk.cdLeft = fullCd(u, sk);
      }
      // กดพลาดกลางคอมโบ = คอมโบขาด ต้องเริ่มใหม่ตั้งแต่จังหวะแรก
      if (sk.type === "combo") { u.comboStep = 0; u.comboUntil = 0; u.comboArmed = false; }
      u.castLock = (use.cast != null ? use.cast : DEFAULT_CAST);
      u.fumbled = (u.fumbled || 0) + 1;
      continue;
    }
    state.castQueue.push({ u, sk: use, target, prec });
    if (use.fragCost) spendFrag(u, u.shadow > 0);
    onKazemCast(state, u);
    if (use.ult) onUltCastItems(state, u);
    if (!use.fragCost) {
      if (sk.ammoMax) {
        sk.ammo -= 1;
        if (sk.rechargeAt == null) sk.rechargeAt = state.t + sk.rechargeTime;
      } else if (!midCombo(u, sk)) {
        sk.cdLeft = fullCd(u, sk);
      }
    }
    let ct = use.cast != null ? use.cast : DEFAULT_CAST;
    if (use.castByMs) ct = Math.max(use.castByMs.min, use.castByMs.base - bonusMs(u) / use.castByMs.per);
    u.castLock = ct;
    u.casts += 1;
    pushLog(state, tr(
      "{0} {1} ใช้ {2} {3}{4}",
      u.team === "blue" ? "🔵" : "🔴",
      tr(u.champ.th),
      use.key,
      use.th || sk.th,
      use.isShadow ? tr(" (เงา)") : ""
    ));
    state.fx.push({ x: u.x, y: u.y - 90, t: state.t, kind: "label",
      text: use.key + " " + (use.th || sk.th) + (use.isShadow ? tr(" (เงา)") : ""),
      color: use.ult ? "#E8A33D" : "#8CBEFF" });
    return;
  }
}


export function shouldCast(state, u, sk, target, d, disc, aw) {
  // Paradise Lost — ครั้งเดียวต่อไฟต์ (คูลดาวน์เป็น 0 เลยต้องกันตรงนี้)
  if (sk.oncePerFight && u.paradiseUsed) return false;
  const hpFrac = u.hp / u.maxHp;
  // Fragments are the one resource that does NOT tick away while you hold it, so
  // saving Light to reach Shadow is a real payoff — this is Discipline's best channel.
  if (sk.fragCost && !sk.isShadow) {
    const fg = u.champ.fragments;
    const hpOk = u.hp / u.maxHp > 0.45;
    const willBank = u.rng() < 0.15 + 0.85 * (disc / 10);
    // เหลืออีกก้อนเดียวก็เต็มแล้ว — คนที่มีวินัยจะอั้นไว้เข้าร่างเงาแทนที่จะผลาญทิ้ง
    if (hpOk && willBank && u.frag >= fg.shadowCost - fg.lightCost) return false;
  }
  const spotsIt = u.rng() < 0.15 + 0.85 * (aw / 10);
  const lethal = spotsIt && (sk.dmg || sk.slamPctMaxHp || sk.pctMaxHp) && estimate(u, sk, target) >= target.hp;
  if (lethal && d <= (sk.range || sk.dashRange || sk.grabRange || u.range * 1.4)) return true;
  // holding a big cooldown instead of wasting it is a discipline check
  if (!lethal && sk.cd >= 60 && target.hp < u.ad * 1.2 && u.rng() < 0.2 + 0.8 * (disc / 10)) return false;
  // patience: don't dump a real cooldown at a target that is about to walk out of it

  const nearby = enemiesOf(state, u).filter((e) => dist(u, e) < (sk.radius || sk.range || 600)).length;

  if (sk.ult) {
    // discipline is the patience to hold an ultimate for a worthwhile moment
    // เดิมเป็นหน้าผาที่แต้ม 3.5 — ต่ำกว่านั้นกดทิ้งทุกครั้ง สูงกว่านั้นอดใจเสมอ
    // ทำให้ decision กลายเป็นค่าที่ "ต้องมีอย่างน้อย 4" แล้วที่เหลือแทบไม่ต่าง
    const worth = target.hp / target.maxHp < 0.55 + 0.15 * (aw / 10) || nearby >= 2 || hpFrac < 0.45;
    // อดใจรอได้นานตามแต้ม แล้วถ้าจังหวะยังไม่มาก็ยอมกดทิ้ง
    // (ทอยลูกเต๋าทุกเฟรมไม่ได้ผล เพราะทอยถี่ขนาดนั้นแต้มกลางก็กดทิ้งแทบจะทันที)
    if (!worth && state.t - (sk.readyAt || 0) < disc * ULT_PATIENCE) return false;
    if (sk.type === "shredWave") return enemiesOf(state, u).filter((e) => dist(u, e) < sk.radiusByRank[Math.max(0, sk.rank - 1)]).length >= 1;
    if (sk.type === "grabSlam") return d <= sk.grabRange + 700;
    if (sk.type === "formShift") return nearby >= 1 || hpFrac < 0.6;
    if (sk.type === "wave") return nearby >= 1;
    if (sk.type === "globalStrike") return true;
    if (sk.type === "chargedBeam") return d < 2200;
    if (sk.type === "vampForm") return nearby >= 1 || d <= u.range * 1.5;
    if (sk.type === "wonderland") return nearby >= 1 || d <= sk.range;
    if (sk.type === "dismissal") return d <= sk.grabRange + 120;
    if (sk.type === "meteorStorm") return nearby >= 1 || d <= sk.rangeByRank[Math.max(0, sk.rank - 1)];
    if (sk.type === "bloodStorm") return enemiesOf(state, u).some((e) => dist(u, e) <= sk.radius) || hpFrac < 0.5;
    if (sk.type === "absorbReflect") return nearby >= 2 || hpFrac < 0.55;
    // ---- อัลติของ Patch 0.3 ----
    if (sk.type === "carriage") return d <= 1200;
    if (sk.type === "truthAura") return nearby >= 1 || alliesOf(state, u).filter((a) => dist(u, a) < sk.radius).length >= 2;
    if (sk.type === "starfall") return nearby >= 1 || d <= 900;
    if (sk.type === "tripleSlam") return nearby >= 1 || d <= 420;
    if (sk.type === "summonGiant") return d <= sk.range;
    if (sk.type === "bounceSlash") return d <= sk.range;
    if (sk.type === "tempest") return d <= sk.range && nearby >= 1;
    if (sk.type === "bunker") return nearby >= 1 || hpFrac < 0.6;
    if (sk.type === "judgment") return d <= sk.range;
    if (sk.type === "snipeCharge") return d > u.range * 1.1 && d <= sk.range && nearby === 0;
    // ---- อัลติของ Patch 0.4 ----
    if (sk.type === "bladeTempest") return nearby >= 1 && d <= sk.radius * 0.9;
    if (sk.type === "domain") {
      if (d > sk.range) return false;
      // ตัดสินใจตั้งแต่ตอนนี้ว่าจะยืนนิ่งในสายลมหรือออกมาสู้ ตอนร่ายจะได้ใช้คำตอบเดิม
      u.domainPlan = domainHoldPlan(state, u, sk);
      return nearby >= 1 || hpFrac < 0.5;
    }
    // หยั่งรากคือการยืนนิ่งสี่วินาทีกลางไฟต์ ต้องคุ้มจริงถึงจะกด
    // คนที่ teamwork สูงกดเพื่อทีม คนที่ต่ำกดตอนตัวเองจะตาย
    if (sk.type === "arbor") {
      const tw = (u.athlete && u.athlete.teamwork) || 0;
      const hurt = alliesOf(state, u).filter((a) => dist(u, a) <= sk.radius && a.hp / a.maxHp < 0.8).length;
      const needAllies = tw >= 7 ? 1 : tw >= 4 ? 2 : 3;
      return hurt >= needAllies || hpFrac < 0.45;
    }
  if (sk.type === "markNext") return d <= sk.range;
  if (sk.type === "barrage") return d <= sk.range && nearby >= 1;
  if (sk.type === "globalStrike") return true;
  if (sk.type === "lastStand") return false;
  if (sk.type === "chargedBeam") return d < 2200 && (hasBuff(u, "flying") || nearby === 0);
  if (sk.type === "allyHot") return alliesOf(state, u).some((a) => a.hp / a.maxHp < 0.9 && dist(u, a) <= sk.range);
  if (sk.type === "cage") return d <= sk.range && (nearby >= 1 || hpFrac < 0.6);
  if (sk.type === "crossDash") return d > u.range * 1.1 && d <= sk.dashRange * 1.4;
  if (sk.type === "skyfall") return d <= sk.range && (d > u.range * 1.2 || nearby >= 2);
  if (sk.type === "vampForm") return nearby >= 1;
  if (sk.type === "submerge") return d <= sk.range && (d > u.range * 1.2 || hpFrac < 0.5);
  if (sk.type === "wave") return nearby >= 1;
  if (sk.type === "pulse") return nearby >= 1 || hpFrac < 0.5;
  if (sk.type === "burstShield") return d <= u.range * 1.5 || hpFrac < 0.7;
  if (sk.type === "blinkDash") return d > u.range * 1.1 || hpFrac < 0.45;
  if (sk.type === "absorbReflect") return nearby >= 2 || hpFrac < 0.5;
  if (sk.type === "blinkBehind") return d <= sk.range;
  if (sk.type === "tether") return d <= sk.range;
  if (sk.type === "trap") return d <= sk.range;
  if (sk.type === "cloneBlink") return d <= sk.range;
  if (sk.type === "volley") return d <= sk.range * 0.85 && nearby <= 1;
  if (sk.type === "formShift") return nearby >= 1;
  if (sk.type === "reveal") return enemiesOf(state, u).some((e) => hasBuff(e, "stealth")) || nearby >= 2;
  if (sk.type === "snipeCharge") return d > u.range * 1.1 && d <= sk.range && nearby === 0;
    return d <= (sk.range || 900);
  }
  // ---- ท่าของตัวละคร Patch 0.4 ----
  if (sk.type === "twinCleave") return d <= sk.radius * 0.85;
  if (sk.type === "zephyr") {
    // ล่องหนรออยู่แล้ว = กดซ้ำเพื่อพุ่ง รอให้เข้าระยะก่อน หรือใกล้หมดเวลาก็พุ่งทิ้ง
    if (u.zephyr) return d <= sk.dashRange * 1.15 || state.t > u.zephyr.until - 0.4;
    // ยังไม่ล่องหน = ใช้เข้าหาเป้าที่อยู่ไกล หรือใช้หนีตอนเลือดต่ำ
    return d > u.range * 1.4 || hpFrac < 0.45;
  }
  if (sk.type === "domain") return d <= sk.range && (nearby >= 1 || hpFrac < 0.5);
  if (sk.type === "thornCone") return d <= sk.range;
  // โล่คู่ — ต้องมีคนที่คุ้มจะยกให้ ไม่ใช่กดทิ้งทุกครั้งที่คูลดาวน์ลง
  if (sk.type === "canopy") {
    const mate = canopyPick(state, u, sk);
    if (mate) { u.canopyPick = mate; return true; }
    u.canopyPick = null;
    return hpFrac < 0.7 || d <= u.range * 2;
  }
  if (sk.type === "arbor") return alliesOf(state, u).some((a) => dist(u, a) <= sk.radius && a.hp / a.maxHp < 0.8) || hpFrac < 0.5;
  // หน้ากากไม่ใช่ท่าที่ "ยิงใส่ใคร" แต่เป็นการตัดสินใจว่าจะเปลี่ยนสไตล์ไหม
  // ถ้าใบที่ใส่อยู่ดีพอแล้ว ก็ไม่ควรเสียจังหวะไปสลับเล่นๆ
  if (sk.type === "mask") {
    const pick = maskPlan(state, u, sk, target);
    if (!pick) return false;
    u.maskPlan = pick;
    return true;
  }
  // กระชากมีดกลับต้องมีของให้กระชากก่อน ยิ่งรอให้ปักเยอะยิ่งคุ้ม
  if (sk.type === "rebound") {
    let best = 0, total = 0;
    for (const e of enemiesOf(state, u)) {
      if (dist(u, e) > sk.range) continue;
      const n = daggerCount(state, u, e);
      total += n;
      if (n > best) best = n;
    }
    return best >= 3 || total >= 4;
  }
  if (sk.type === "bladeTempest") return nearby >= 1 && d <= sk.radius * 0.9;
  // ---- ท่าของตัวละคร Patch 0.3 ----
  if (sk.type === "combo") {
    // จังหวะถัดไปของคอมโบต้องรอให้ออโต้โดนก่อน (comboArmed)
    if ((u.comboStep || 0) > 0 && !u.comboArmed) return false;
    const step = sk.steps[Math.min(u.comboStep || 0, sk.steps.length - 1)];
    return d <= (step.dashRange || step.radius || step.range || 300) + 60;
  }
  if (sk.type === "damageStash") {
    return enemiesOf(state, u).some((e) => e.chime && e.chime.ownerId === u.id && dist(u, e) <= sk.range);
  }
  if (sk.type === "skyward") return hpFrac < 0.6 || nearby >= 2;
  if (sk.type === "carriage") return d <= 1200;
  if (sk.type === "basketZone") return alliesOf(state, u).some((a) => dist(u, a) <= sk.range);
  if (sk.type === "allyRush") return d > u.range * 1.1 || alliesOf(state, u).some((a) => a.hp / a.maxHp < 0.7);
  if (sk.type === "truthAura") return nearby >= 1 || alliesOf(state, u).filter((a) => dist(u, a) < sk.radius).length >= 2;
  if (sk.type === "vortex") return d <= sk.range;
  if (sk.type === "deltaDash") return d <= sk.side * 1.6;
  if (sk.type === "starfall") return nearby >= 1 || d <= 900;
  if (sk.type === "chargeFling") return d <= sk.dashRange;
  if (sk.type === "wrathAura") return d <= sk.radius || nearby >= 1;
  if (sk.type === "asuraSlam") return nearby >= 1 || d <= sk.radius * 0.8;
  if (sk.type === "tripleSlam") return nearby >= 1 || d <= 420;
  if (sk.type === "rampBuff") return d <= u.range * 1.1;
  if (sk.type === "sightZone") return enemiesOf(state, u).some((e) => hasBuff(e, "stealth")) || d <= sk.range;
  if (sk.type === "summonGiant") return d <= sk.range;
  if (sk.type === "channelCone") return d <= sk.range * 0.8;
  if (sk.type === "bounceSlash") return d <= sk.range;
  if (sk.type === "coneVolley") return d <= sk.range * 0.85;
  if (sk.type === "tempest") return d <= sk.range && nearby >= 1;
  if (sk.type === "sledge") {
    const lore = state.lore || {};
    const hurt = [...(lore.walls || []), ...(lore.bunkers || [])].some((w) => w.ownerId === u.id && w.hp < w.maxHp);
    return hurt || d <= sk.range;
  }
  if (sk.type === "wall") return d <= sk.range + 200;
  if (sk.type === "steerDash") return d > u.range * 1.1 && d <= sk.dashRange * 1.3;
  if (sk.type === "bunker") return nearby >= 1 || hpFrac < 0.6;
  if (sk.type === "pommel") return d <= sk.range + 40;
  if (sk.type === "lungeSweep") return d <= sk.dashRange * 1.1;
  if (sk.type === "judgment") return d <= sk.range;
  if (sk.type === "teaGarden") return d <= sk.range;
  if (sk.type === "allyBlink") return hpFrac < 0.85 || alliesOf(state, u).some((a) => a.hp / a.maxHp < 0.8);
  if (sk.type === "wonderland") return d <= sk.range;
  if (sk.type === "guardBurst") return d <= u.range * 2.2 || hpFrac < 0.8;
  if (sk.type === "dismissal") return d <= sk.grabRange + 120;
  if (sk.type === "rangeCharge") return d <= sk.rangeMax;
  if (sk.type === "coneKnock") return d <= sk.range + 60;
  if (sk.type === "meteorStorm") return true;
  // W ของ Laura — ปกติใช้ตอนต้องขยับ ตอนเปิดอัลติใช้กระโดดเกาะเป้า
  if (sk.type === "mistform") {
    if (u.bloodStorm) return d > u.range * 0.6 && d <= sk.blinkRange * 1.6;
    return d > u.range * 1.15 || hpFrac < 0.5;
  }
  if (sk.type === "selfBuff") {
    if (sk.stealth || sk.msBuff) return hpFrac < 0.55 || d > u.range * 1.3;
    return d <= u.range * 1.25;
  }
  if (sk.type === "blink") return hpFrac < 0.5 || nearby >= 2;
  if (sk.type === "hop") return d < u.range * 0.7 || hpFrac < 0.6;
  if (sk.type === "allyShield") return alliesOf(state, u).some((a) => a.hp / a.maxHp < 0.75);
  if (sk.type === "teamBuff") return nearby >= 1;
  if (sk.type === "aoeSelf") return nearby >= 1 && d <= sk.radius;
  if (sk.type === "onHit") return d <= u.range * 1.4;
  if (sk.type === "cone") return d <= sk.range;
  if (sk.type === "chargeDash") return d > u.range * 1.2 && d <= sk.dashRange * 1.6;
  if (sk.type === "shredWave") return nearby >= 1 && d <= sk.radiusByRank[Math.max(0, sk.rank - 1)];
  if (sk.type === "grabSlam") return d <= sk.grabRange + 700;
  if (sk.type === "markNext") return d <= sk.range;
  if (sk.type === "barrage") return d <= sk.range && nearby >= 1;
  if (sk.type === "globalStrike") return true;
  if (sk.type === "lastStand") return false;
  if (sk.type === "chargedBeam") return d < 2200 && (hasBuff(u, "flying") || nearby === 0);
  if (sk.type === "allyHot") return alliesOf(state, u).some((a) => a.hp / a.maxHp < 0.9 && dist(u, a) <= sk.range);
  if (sk.type === "cage") return d <= sk.range && (nearby >= 1 || hpFrac < 0.6);
  if (sk.type === "crossDash") return d > u.range * 1.1 && d <= sk.dashRange * 1.4;
  if (sk.type === "skyfall") return d <= sk.range && (d > u.range * 1.2 || nearby >= 2);
  if (sk.type === "vampForm") return nearby >= 1;
  if (sk.type === "submerge") return d <= sk.range && (d > u.range * 1.2 || hpFrac < 0.5);
  if (sk.type === "wave") return nearby >= 1;
  if (sk.type === "pulse") return nearby >= 1 || hpFrac < 0.5;
  if (sk.type === "burstShield") return d <= u.range * 1.5 || hpFrac < 0.7;
  if (sk.type === "blinkDash") return d > u.range * 1.1 || hpFrac < 0.45;
  if (sk.type === "absorbReflect") return nearby >= 2 || hpFrac < 0.5;
  if (sk.type === "blinkBehind") return d <= sk.range;
  if (sk.type === "tether") return d <= sk.range;
  if (sk.type === "trap") return d <= sk.range;
  if (sk.type === "cloneBlink") return d <= sk.range;
  if (sk.type === "volley") return d <= sk.range * 0.85 && nearby <= 1;
  if (sk.type === "formShift") return nearby >= 1;
  if (sk.type === "reveal") return enemiesOf(state, u).some((e) => hasBuff(e, "stealth")) || nearby >= 2;
  if (sk.type === "snipeCharge") return d > u.range * 1.1 && d <= sk.range && nearby === 0;
  return d <= (sk.range || u.range);
}
