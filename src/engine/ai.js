import { tr } from "../i18n.js";
import { DEFAULT_CAST } from "../data/tuning.js";
import { grantShield } from "./damage.js";
import { kindnessTick } from "./on-hit.js";
import { dist, hasBuff, pushLog } from "./state-util.js";
import { cdrFromAh, fullCd } from "./stats.js";
import { activeSkills, alliesOf, bestSkillTarget, enemiesOf, estimate } from "./targeting.js";


export function castSkills(state, u, target, d, disc, aw, prec) {
  for (const sk of activeSkills(u)) {
    if (sk.rank <= 0 || (sk.ammoMax ? sk.ammo <= 0 : sk.cdLeft > 0)) continue;
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
      u.castLock = (use.cast != null ? use.cast : DEFAULT_CAST);
      u.fumbled = (u.fumbled || 0) + 1;
      continue;
    }
    state.castQueue.push({ u, sk: use, target, prec });
    if (use.fragCost) { if (u.shadow > 0) u.shadow -= 1; else u.light -= 1; }
    if (u.champ.id === "KAZEM") {
      const ready = u.kazemPassiveReadyAt == null || state.t >= u.kazemPassiveReadyAt;
      if (ready) {
        const sh = 40 + 6 * u.level + 0.10 * u.bonusHp + 0.40 * u.bonusAd;
        grantShield(u, Math.round(sh));
        u.buffs.push({ type: "shield", v: 1, until: state.t + 3 });
        u.kazemPassiveReadyAt = state.t + 10 * (1 - cdrFromAh(u.ah || 0));
      } else {
        u.kazemPassiveReadyAt = Math.max(state.t, u.kazemPassiveReadyAt - 4);
      }
    }
    if (!use.fragCost) {
      if (sk.ammoMax) {
        sk.ammo -= 1;
        if (sk.rechargeAt == null) sk.rechargeAt = state.t + sk.rechargeTime;
      } else {
        sk.cdLeft = fullCd(u, sk);
      }
    }
    let ct = use.cast != null ? use.cast : DEFAULT_CAST;
    if (use.castByMs) ct = Math.max(use.castByMs.min, use.castByMs.base - (u.apMs || 0) / use.castByMs.per);
    u.castLock = ct;
    u.casts += 1;
    kindnessTick(state, u);
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
  const hpFrac = u.hp / u.maxHp;
  // Fragments are the one resource that does NOT tick away while you hold it, so
  // saving Light to reach Shadow is a real payoff — this is Discipline's best channel.
  if (sk.fragCost && !sk.isShadow) {
    const hpOk = u.hp / u.maxHp > 0.45;
    const willBank = u.rng() < 0.15 + 0.85 * (disc / 10);
    if (hpOk && willBank && u.light < (u.champ.fragments.max - 1)) return false;
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
    const patience = disc / 10;
    const worth = target.hp / target.maxHp < 0.55 + 0.15 * (aw / 10) || nearby >= 2 || hpFrac < 0.45;
    if (patience > 0.35 && !worth) return false;
    if (sk.type === "shredWave") return enemiesOf(state, u).filter((e) => dist(u, e) < sk.radiusByRank[Math.max(0, sk.rank - 1)]).length >= 1;
    if (sk.type === "grabSlam") return d <= sk.grabRange + 700;
    if (sk.type === "formShift") return nearby >= 1 || hpFrac < 0.6;
    if (sk.type === "wave") return nearby >= 1;
    if (sk.type === "globalStrike") return true;
    if (sk.type === "chargedBeam") return d < 2200;
    if (sk.type === "vampForm") return nearby >= 1 || d <= u.range * 1.5;
    if (sk.type === "bloodStorm") return enemiesOf(state, u).some((e) => dist(u, e) <= sk.radius) || hpFrac < 0.5;
    if (sk.type === "absorbReflect") return nearby >= 2 || hpFrac < 0.55;
    if (sk.type === "snipeCharge") return d > u.range * 1.1 && d <= sk.range && nearby === 0;
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
  // W ของ Lorla — ปกติใช้ตอนต้องขยับ ตอนเปิดอัลติใช้กระโดดเกาะเป้า
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
