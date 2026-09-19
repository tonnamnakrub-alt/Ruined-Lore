import { tr } from "../i18n.js";
import { ARENA_H, ARENA_W } from "../data/constants.js";
import { AUTO_DMG, DEFAULT_CAST, DEFAULT_WINDUP, REGEN_DELAY, REGEN_RATE, RETREAT_COOLDOWN, RETREAT_TIME, STYLES } from "../data/tuning.js";
import { castSkills } from "./ai.js";
import { onKazemCast, tickLastStand } from "./kazem.js";
import { gainStar, hoodBleed, starPierce, tickLoreUnit } from "./lore.js";
import { onUltCastItems, tickLoreItems } from "./lore-items.js";
import { applyDamage, healUnit, skillPower } from "./damage.js";
import { fireSkill } from "./fire-skill.js";
import { fireSnipe, resolveDash, startGrab, tickDashes, tickGrabs } from "./motion.js";
import { consumeOnHit, gainIsolde, kindnessTick, onAutoLanded, onSkillLanded } from "./on-hit.js";
import { HARD_CC, addBuff, addBuffUnique, aliveOf, bonusMs, buffSum, centroid, dist, hasBuff, pushLog, setCurState, supportAlive, vfx, addFrag, spendFrag, syncFrag, skillLabel } from "./state-util.js";
import { cdrFromItemHaste, effStat, fullCd } from "./stats.js";
import { tickSupportItems } from "./support.js";
import { onMageCast, tickMageItems, tickMageZones } from "./mage.js";
import { tickAssassin } from "./assassin.js";
import { applyCharm, tickLaura } from "./laura.js";
import { tickHurls, tickKlaeder } from "./klaeder.js";
import { applyPolymorph, tickGardens, tickMirrors } from "./alice.js";
import { tickNewSystems, tickZonesAndSnipes } from "./systems.js";
import { activeSkills, focusedOnMe, incomingThreat, pickTarget } from "./targeting.js";
import { clamp } from "./util.js";
import { C } from "../ui/theme.js";


// ---------------- simulation ----------------
export const DT = 1 / 60;


export function step(state) {
  setCurState(state);
  state.dmgSrc = null;
  state.srcUnit = null;
  if (state.over) return state;
  const dt = DT;
  state.t += dt;

  const supB = supportAlive(state, "blue");
  const supR = supportAlive(state, "red");
  const cen = { blue: centroid(state, "blue"), red: centroid(state, "red") };

  // support auras only count while the wearer is still alive
  for (const side of ["blue", "red"]) {
    let armorBonus = 0;
    let adBonus = 0;
    for (const u of state.units) {
      if (u.team !== side || !u.alive) continue;
      armorBonus += u.auraArmor || 0;
      adBonus += u.auraAdPct || 0;
    }
    for (const u of state.units) {
      if (u.team !== side) continue;
      u.baseArmor = u.rawArmor + armorBonus;
      u.armor = u.baseArmor;
      u.ad = Math.round(u.rawAd * (1 + adBonus));
    }
  }

  // ---- PASS 0: upkeep for everyone first, so no unit reads a half-updated world ----
  for (const u of state.units) {
    if (!u.alive) continue;
    u.svx += (u.vx - u.svx) * 0.14;
    u.svy += (u.vy - u.svy) * 0.14;
    if (!u.noRegen && state.t - u.lastHitAt > REGEN_DELAY && u.hp < u.maxHp) {
      u.hp = Math.min(u.maxHp, u.hp + u.maxHp * REGEN_RATE * dt);
    }
    // per-champion HP5 (health regen per 5s) — ticks all the time, like LoL's real regen stat
    if (!u.noRegen && u.hp < u.maxHp && u.hp5) {
      healUnit(state, u, (u.hp5 / 5) * (1 + (u.regenPct || 0)) * dt);
    }
    u.buffs = u.buffs.filter((b) => b.until > state.t);
    if (u.tookLog && u.tookLog.length) {
      while (u.tookLog.length && state.t - u.tookLog[0][0] > 4) u.tookLog.shift();
    }
    if (!hasBuff(u, "shield")) u.shield = 0;
    // โล่จากพาสซีฟ Isolde ไม่ได้หายทีเดียวตอนหมดเวลา แต่บางลงเรื่อยๆ ตลอด 5 วิ
    if (u.isoShield) {
      const iso = u.isoShield;
      iso.amt = Math.min(iso.amt, u.shield);      // โดนตีกินไปแล้วเท่าไรก็ไม่ต้องหักซ้ำ
      const left = state.t >= iso.until ? 0 : iso.granted * ((iso.until - state.t) / iso.dur);
      const shave = Math.max(0, iso.amt - left);
      if (shave > 0) { u.shield = Math.max(0, u.shield - shave); iso.amt -= shave; }
      if (state.t >= iso.until || iso.amt <= 0) u.isoShield = null;
    }
    for (const sk of u.skills) {
      if (sk.cdLeft > 0) sk.cdLeft -= dt;
      if (sk.ammoMax && sk.ammo < sk.ammoMax && sk.rechargeAt != null && state.t >= sk.rechargeAt) {
        sk.ammo += 1;
        sk.rechargeAt = sk.ammo < sk.ammoMax ? state.t + sk.rechargeTime : null;
      }
    }
    if (u.formSkills) for (const sk of u.formSkills) if (sk.cdLeft > 0) sk.cdLeft -= dt;
    u.castLock = Math.max(0, u.castLock - dt);
    u.atkLock = Math.max(0, u.atkLock - dt);
    // เพดานล่างกันความเร็วโจมตีติดลบ — 1/asEff ที่ติดลบจะทำให้ตีได้ทุกเฟรม
    u.asEff = Math.max(0.15, u.atkSpeed * (1 + buffSum(u, "as")));
    // AP/AH ที่บัฟเพิ่มได้ชั่วคราว (Saraswati's Flowing Veena) — คิดจากค่าฐานทุกเฟรม
    u.ap = ((u.baseAp || 0) + buffSum(u, "apFlat")) * (1 + buffSum(u, "apPct"));
    u.ah = (u.baseAh || 0) + buffSum(u, "ahFlat");
    let apMs = 0;
    if (u.champ.msPerAp) {
      apMs = u.ap / u.champ.msPerAp;
      const own = state.fields.find((f) => f.ownerId === u.id && (f.selfBoost || 1) > 1 && (f.r
        ? Math.hypot(u.x - f.x, u.y - f.y) < f.r
        : Math.hypot(u.x - f.x, u.y - f.y) < f.halfLen && Math.abs((u.x - f.x) * f.ny - (u.y - f.y) * f.nx) < f.halfW));
      if (own) apMs *= own.selfBoost;
    }
    u.apMs = apMs;
    const slowResist = Math.max(u.slowResist || 0, (u.pnbSlowResistUntil != null && state.t < u.pnbSlowResistUntil ? 0.25 : 0), (u.cbcSlowResist || 0));
    // Vow of Lyonesse: slow immune only lasts as long as the shield it came with does
    const shieldedImmune = u.slowImmuneUntil != null && state.t < u.slowImmuneUntil && u.shield > 0;
    const slowMul = (hasBuff(u, "slowimmune") || shieldedImmune) ? 1 : Math.max(0.2, 1 - buffSum(u, "slow") * (1 - slowResist));
    u.msEff = (u.moveSpeed + apMs + buffSum(u, "msFlat")) * (1 + buffSum(u, "ms", state.t)) * slowMul;
    // Charm (Laura E) — ทำอะไรไม่ได้เหมือนโดนสตัน แต่ยัง "เดิน" ได้ ต่างจาก root
    u.charmed = u.buffs.find((b) => b.type === "charm" && b.until > state.t) || null;
    const locked = hasBuff(u, "stun") || hasBuff(u, "fear");
    u.stunned = locked || !!u.charmed;
    u.silenced = hasBuff(u, "silence");
    u.disarmed = hasBuff(u, "disarm");
    u.rooted = locked || hasBuff(u, "root") || hasBuff(u, "invuln");
    u.drAll = 0;
    if (u.champ.fragments) {
      const fg = u.champ.fragments;
      // ออกจากคอมแบตนานพอ = เติมเต็มหลอด · ไม่งั้นค่อยๆ คืนตามเร่งสกิล (AH)
      if (state.t - u.lastCombatAt > fg.oocSeconds) addFrag(u, fg.max);
      else if (u.ah > 0) addFrag(u, (u.ah / fg.perAh) * (fg.perAhRate || 1) * dt);
      else syncFrag(u);
      // Morning Star — ถือพลังร่างแสงอยู่ ทุก 10 หน่วยกันดาเมจได้ 5%
      // ส่วนร่างเงาได้ความเร็วเดินตอนวิ่งเข้าหาศัตรู
      if (u.shadow <= 0 && fg.lightDrPer10) {
        u.drAll = Math.min(fg.drCap != null ? fg.drCap : 1, Math.floor((u.frag || 0) / 10) * fg.lightDrPer10);
      } else if (u.shadow > 0 && fg.darkChaseMs) {
        const tg = state.units.find((x) => x.id === u.targetId);
        if (tg && tg.alive && tg.team !== u.team && dist(u, tg) > u.range) {
          addBuffUnique(u, "darkchase", { type: "ms", v: fg.darkChaseMs, until: state.t + 0.25 }, state.t);
        }
      }
    }
    // Cricket's Whisper — เต้นทุก 1 วิ ไม่ผูกกับการตีหรือร่ายอีกแล้ว
    if (u.champ.kindness) {
      const every = u.champ.kindness.every || 1;
      if (u.kindNext == null) u.kindNext = state.t + every;
      if (state.t >= u.kindNext) {
        u.kindNext = state.t + every;
        for (const a of state.units) if (a.alive && a.team === u.team) kindnessTick(state, u, a);
      }
    }
    if (u.form && state.t > u.formUntil) { u.form = null; u.formSkills = null; }
    if (u.lastStand) {
      if (u.kills > u.lastStandKills) {
        u.lastStand = null;
        u.buffs = u.buffs.filter((b) => !["as", "ad", "ms"].includes(b.type));
        pushLog(state, tr("{0} {1} หยุดเลือดไหล", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
      } else {
        u.hp -= u.maxHp * u.lastStand.drain * dt;
        if (u.hp <= 0) { u.hp = 0; u.alive = false; u.lastStand = null;
          pushLog(state, tr("{0} {1} ล้มลง", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th))); }
      }
    }
    tickLastStand(state, u);
    tickLoreUnit(state, u, dt);
    tickLoreItems(state, u, dt);
    u.blinded = hasBuff(u, "blind");
    const vf = u.buffs.find((b) => b.type === "vampform");
    if (vf) {
      const sk = u.vampSkill;
      u.range = u.champ.range + sk.autoBoost;
      u.skillRangeBoost = sk.skillBoost;
      if (u.kills > u.vampKills) { u.vampKills = u.kills; vf.until = state.t + sk.extend;
        for (const b of u.buffs) if (b.type === "ad" || b.type === "ms") b.until = vf.until; }
    } else if (u.skillRangeBoost) {
      u.skillRangeBoost = 0;
      u.range = u.champ.range;
    }
    // Odysseus' Unstrung Bow — ระยะโจมตีที่ได้จากการเก็บศพ (ทับค่าระยะทีหลังเสมอ)
    if (u.reachAdd && state.t > (u.reachUntil || 0)) u.reachAdd = 0;
    if (u.reachAdd) u.range = u.champ.range + u.reachAdd;
    u.untargetable = hasBuff(u, "untargetable") || hasBuff(u, "invuln");
    if (u.sooRevive && state.t >= u.sooRevive.until) {
      const baseHp = u.champ.hp + u.champ.hpG * (u.level - 1);
      u.hp = baseHp * (u.reviveHp != null ? u.reviveHp : 0.5);
      u.sooRevive = null;
      pushLog(state, tr("{0} {1} ฟื้นคืนชีพ", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
    }
    // Bow of Eurytus: ทุก 5 วิ ติดอาวุธไว้ ออโต้ครั้งถัดไปยิงไกลขึ้น 150 หน่วย
    if (u.hasItem("boe")) {
      if (!u.boeArmed && state.t >= (u.boeReadyAt || 0)) u.boeArmed = true;
      if (u.boeArmed && !u.boeRangeOn) { u.range += 150; u.boeRangeOn = true; }
      if (!u.boeArmed && u.boeRangeOn) { u.range -= 150; u.boeRangeOn = false; }
    }

    // Swan Maiden's Feathered Cloak: โล่หมดอายุ เอาส่วนที่เหลือออก
    if (u.swfUntil != null && state.t > u.swfUntil) {
      u.shield = Math.max(0, (u.shield || 0) - (u.swfAmt || 0));
      u.swfAmt = 0;
      u.swfUntil = null;
    }

    const shred = Math.min(0.6, buffSum(u, "shred"));

    // Mjölnir's Grounding Cloak: stacks decay if no magic damage lands for a few seconds
    let mjolnirMr = 0;
    if (u.hasItem("mgc")) {
      if (u.mjolnirUntil != null && state.t > u.mjolnirUntil) u.mjolnirStacks = 0;
      const n = u.mjolnirStacks || 0;
      mjolnirMr = 3 * n;
      if (n >= 10) addBuffUnique(u, "mgc:" + u.id, { type: "ms", v: 0.1, until: state.t + 0.3 }, state.t);
    }

    // Cuirass of the Iron John: gains armor/MR/tenacity the longer it stays in the fight
    let ironJohnBonus = 0, ironJohnMult = 1, ironJohnTen = 0;
    if (u.hasItem("cij")) {
      if (u.ironJohnStart == null) u.ironJohnStart = state.t;
      const stacks = Math.min(5, Math.floor((state.t - u.ironJohnStart) / 3));
      ironJohnBonus = stacks * 6;
      // สเปคใหม่ตัด Tenacity ออกจากพาสซีฟชิ้นนี้ เหลือแค่เกราะ/ต้านเวทที่ไต่ขึ้น
      ironJohnTen = 0;
      if (stacks >= 5) ironJohnMult = 1.1;
    }

    // Cuirass of the Bleeding Centaur: สะสมสแตกจากการทำหรือรับดาเมจ สูงสุด 20
    // ครบ 20 แล้วได้ต้านสโลว์ 30% และ Tenacity 30% ไปจนจบไฟต์
    let centaurAr = 0, centaurAd = 0;
    if (u.centaurStack) {
      const st2 = Math.min(u.centaurStack.max, u.cbcStacks || 0);
      centaurAr = st2 * u.centaurStack.ar;
      centaurAd = st2 * u.centaurStack.ad;
      if (st2 >= u.centaurStack.max) {
        u.cbcSlowResist = u.centaurStack.capSlowResist;
        u.cbcTenacity = u.centaurStack.capTenacity;
      }
    }

    // Pauldrons of the Nian Beast: stacks from dealing OR taking damage, up to 15,
    // decaying if it's been out of any action for a bit; maxing out grants a burst
    let pnbBonus = 0, pnbTen = 0;
    if (u.hasItem("pnb")) {
      if (u.pnbUntil != null && state.t > u.pnbUntil) u.pnbStacks = 0;
      const stacks = u.pnbStacks || 0;
      pnbBonus = (stacks / 15) * 30;
      pnbTen = (stacks / 15) * 0.3;
      if (stacks >= 15 && !u.pnbCapped) {
        u.pnbCapped = true;
        u.pnbSlowResistUntil = state.t + 10;
        addBuff(u, { type: "ms", v: 0.1, until: state.t + 10 }, state.t);
      } else if (stacks < 15) {
        u.pnbCapped = false;
      }
    }

    u.tenacity = 1 - (1 - (u.baseTenacity || 0)) * (1 - ironJohnTen) * (1 - pnbTen) * (1 - (u.cbcTenacity || 0));


    const argus = (u.argusStacks || 0) * ((u.crowdGuard && u.crowdGuard.per) || 0);
    u.armor = Math.round((u.baseArmor * (1 - shred) + ironJohnBonus + pnbBonus + centaurAr + argus + (u.weaveArmor || 0)) * ironJohnMult);
    if (centaurAd) u.ad += centaurAd;
    // Apollo's Sunlit Quiver: เลือด 50% ขึ้นไปได้ AD ก้อนใหญ่ · ต่ำกว่านั้นเปลี่ยนเป็นดูดเลือดแทน
    if (u.apolloSplit) {
      const healthy = u.hp / u.maxHp >= u.apolloSplit.hpAbove;
      if (healthy) u.ad += u.apolloSplit.ad;
      u.apolloVamp = healthy ? 0 : u.apolloSplit.omnivamp;
    }
    if (buffSum(u, "ad")) u.ad = Math.round(u.ad * (1 + buffSum(u, "ad")));
    u.ad += buffSum(u, "adFlat");
    const mrBurst = buffSum(u, "mrburst");
    // Hel's Nether Domain ลดต้านเวทของคนที่ยืนในวง — คิดทีหลังสุด
    const mrShred = Math.min(0.6, buffSum(u, "mrshred"));
    u.mr = Math.round((u.baseMr * (1 - shred) + mjolnirMr + ironJohnBonus + mrBurst + centaurAr + argus + (u.weaveMr || 0)) * ironJohnMult * (1 - mrShred));

  }

  tickMageZones(state, dt);
  // ---- item auras that reach out and debuff nearby enemies ----
  for (const u of state.units) {
    if (!u.alive) continue;
    tickSupportItems(state, u, dt);
    tickMageItems(state, u, dt);
    tickAssassin(state, u, dt);
    tickLaura(state, u, dt);
    tickKlaeder(state, u, dt);
    // Mirror of the Snow Queen: −25% attack speed to enemies within 400
    // ออร่าชนิดเดียวกันจากหลายคนไม่ทับกัน ใช้แท็กกลาง ไม่ใช่แท็กรายคน
    if (u.hasItem("msq")) {
      for (const e of state.units) {
        if (!e.alive || e.team === u.team || dist(u, e) > 400) continue;
        addBuffUnique(e, "msq", { type: "as", v: -0.25, until: state.t + 0.3 }, state.t);
      }
    }
    // Prometheus' Hearth: เผาศัตรูในรัศมี 325 ครั้งละ 20 + 2.5% Max HP ตัวเอง ทุก 2 วินาที
    // จ่ายเป็นก้อนทุกสองวินาที ไม่ใช่ทยอยต่อเฟรม จะได้ตรงกับที่เขียนไว้ในไอเทม
    if (u.hearth) {
      if (u.hearthNext == null) u.hearthNext = state.t + u.hearth.every;
      if (state.t >= u.hearthNext) {
        u.hearthNext = state.t + u.hearth.every;
        for (const e of state.units) {
          if (!e.alive || e.team === u.team || dist(u, e) > u.hearth.r) continue;
          state.dmgSrc = tr("ไอเทม Prometheus' Hearth");
          applyDamage(state, u, e, u.hearth.flat + u.hearth.ownHpPct * u.maxHp, true, false);
          state.dmgSrc = null;
        }
      }
    }
    // Siren's Abyssal Bell: charge 3s, then taunt every enemy within 450 for 2s (CD 45s)
    // Siren's Abyssal Bell: charges up to 3s (can release early), taunt scales
    // with how long it actually held the charge — 0.5s at a snap release, 2.0s at max
    if (u.hasItem("sab")) {
      const sabMax = u.sabCharge || 3;
      if (u.sabFireAt != null && (state.t >= u.sabFireAt || u.sabForceRelease)) {
        const held = Math.min(sabMax, state.t - (u.sabChargeStart != null ? u.sabChargeStart : state.t));
        const taunt = 0.5 + 1.5 * (held / sabMax);
        for (const e of state.units) {
          if (!e.alive || e.team === u.team || dist(u, e) > 450) continue;
          addBuff(e, { type: "taunt", v: 1, sourceId: u.id, until: state.t + taunt }, state.t);
        }
        u.sabFireAt = null;
        u.sabForceRelease = false;
        u.sabReadyAt = state.t + 45;
      } else if (u.sabFireAt == null) {
        const ready = u.sabReadyAt == null || state.t >= u.sabReadyAt;
        const nearby = state.units.filter((e) => e.alive && e.team !== u.team && dist(u, e) <= 450).length;
        if (ready && nearby >= 2) { u.sabFireAt = state.t + sabMax; u.sabChargeStart = state.t; }
      } else if (u.sabFireAt != null) {
        // early release: if every enemy that justified the charge has since scattered
        // out of the bell's radius, don't waste the rest of the wind-up
        const stillThere = state.units.some((e) => e.alive && e.team !== u.team && dist(u, e) <= 450);
        if (!stillThere) u.sabForceRelease = true;
      }
      // ระหว่างกำลังชาร์จระฆัง กันดาเมจได้ 40% ไล่ขึ้นถึง 60% ที่เลเวลเต็ม
      if (u.sabFireAt != null && u.sabDr) {
        const g = Math.max(0, Math.min(1, (u.level - 1) / 15));
        u.drAll = Math.max(u.drAll || 0, u.sabDr.base + (u.sabDr.max - u.sabDr.base) * g);
      }
    }
    // Gleipnir's Binding Shackles: a real skillshot — fires a linear bolt (range 800,
    // width 80, speed 1600) that leashes the first champion it touches, CD 60s
    if (u.hasItem("gbs")) {
      const ready = u.gbsReadyAt == null || state.t >= u.gbsReadyAt;
      if (ready) {
        let best = null, bestD = 800;
        for (const e of state.units) {
          if (!e.alive || e.team === u.team) continue;
          const dd = dist(u, e);
          if (dd < bestD) { bestD = dd; best = e; }
        }
        if (best) {
          const dd = dist(u, best) || 1;
          const dx = (best.x - u.x) / dd, dy = (best.y - u.y) / dd;
          state.spawnQueue.push({
            id: state.nextProjId++, team: u.team, ownerId: u.id,
            x: u.x, y: u.y, dx, dy, speed: 1600, dmg: 0, magic: false,
            width: 80, hitIds: [], life: 800 / 1600,
            itemLeash: { range: 600, dur: (u.gleipnir && u.gleipnir.dur) || 2.5, tenacityCut: (u.gleipnir && u.gleipnir.tenacityCut) || 0.25 },
          });
          u.gbsReadyAt = state.t + ((u.gleipnir && u.gleipnir.cd) || 30);
        }
      }
    }
    // Girdle of Hippolyta: slow the ring around itself 35% for 2s while dashing
    // away 25-35% faster itself, CD 20s
    if (u.hasItem("goh")) {
      const cdr = cdrFromItemHaste(u.itemHaste || 0);
      const ready = u.gohReadyAt == null || state.t >= u.gohReadyAt;
      const nearby = state.units.some((e) => e.alive && e.team !== u.team && dist(u, e) <= 450);
      if (ready && nearby) {
        u.gohReadyAt = state.t + 20 * (1 - cdr);
        addBuff(u, { type: "ms", v: 0.3, until: state.t + 2 }, state.t);
        for (const e of state.units) {
          if (!e.alive || e.team === u.team || dist(u, e) > 450) continue;
          addBuff(e, { type: "slow", v: 0.35, until: state.t + 2 }, state.t);
        }
      }
    }
    // Draupnir's Sovereign Signet: cleanses itself once it's actually crowd-controlled,
    // then a moment of CC immunity and a speed kick — CD 75s
    if (u.hasItem("dss")) {
      const ready = u.dssReadyAt == null || state.t >= u.dssReadyAt;
      // ทำงานทันทีที่โดน CC ที่ "ล็อกตัว" จริงๆ — สโลว์เฉยๆ ไม่นับ ไม่งั้นมันผลาญคูลดาวน์ทิ้งทันที
      const ccd = HARD_CC.some((t) => t !== "slow" && hasBuff(u, t));
      if (ready && ccd) {
        u.dssReadyAt = state.t + (u.cleanseCd || 75);
        u.buffs = u.buffs.filter((b) => !HARD_CC.includes(b.type));
        addBuff(u, { type: "unstoppable", v: 1, until: state.t + 0.5 }, state.t);
        addBuff(u, { type: "ms", v: 0.3, until: state.t + 1.5 }, state.t);
      }
    }
    // Siren's Harpoon Net: hooks everyone in a cone in front and yanks them 150 closer,
    // slowing them — CD 40s
    if (u.hasItem("shn")) {
      const ready = u.shnReadyAt == null || state.t >= u.shnReadyAt;
      const t0 = state.units.find((x) => x.id === u.targetId);
      if (ready && t0 && t0.alive && dist(u, t0) <= 400) {
        u.shnReadyAt = state.t + 40;
        const ang = Math.atan2(t0.y - u.y, t0.x - u.x);
        const half = (60 * Math.PI) / 180 / 2;
        for (const e of state.units) {
          if (!e.alive || e.team === u.team || dist(u, e) > 400) continue;
          const ea = Math.atan2(e.y - u.y, e.x - u.x);
          const diff = Math.abs(((ea - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (diff > half) continue;
          const dd = dist(u, e) || 1;
          const pull = Math.min(150, dd - u.radius - e.radius);
          if (pull > 0) {
            e.x = clamp(e.x - ((e.x - u.x) / dd) * pull, e.radius, ARENA_W - e.radius);
            e.y = clamp(e.y - ((e.y - u.y) / dd) * pull, e.radius, ARENA_H - e.radius);
          }
          addBuff(e, { type: "slow", v: 0.4, until: state.t + 1.5 }, state.t);
        }
      }
    }
  }

  // Mirror of Truth: flat reduction on incoming basic attacks, bigger with more Max HP,
  // plus a straight 30% cut to any crit that lands on the wearer
  for (const u of state.units) {
    if (!u.alive) continue;
    u.motFlat = u.hasItem("mot") ? (u.motFlatBase || 12) + 3.5 * (u.maxHp / 1000) : 0;
  }

  // ---- PASS 1: every unit decides, reading the same frozen world ----
  state.frame = (state.frame || 0) + 1;
  // shuffle who thinks first every frame — a fixed or merely alternating order lets
  // one side's attack timing lock onto the parity that always reads fresher data
  const order = [...state.units];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(state.rng() * (i + 1));
    const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
  }
  for (const u of order) {
    if (!u.alive || u.dashing) { u.vx = 0; u.vy = 0; u.nvx = 0; u.nvy = 0; continue; }
    const supAlive = u.team === "blue" ? supB : supR;
    const st = STYLES[u.style] || STYLES.POKE;


    const mech = effStat(u, "mechanics", supAlive);   // aiming + dodging + execution speed
    const sense = effStat(u, "gameSense", supAlive);   // threat reading, repositioning
    const know = effStat(u, "knowledge", supAlive);    // target priority, matchup reads
    const dec = effStat(u, "decision", supAlive);      // engage/disengage/ult timing
    const team = effStat(u, "teamwork", supAlive);     // focus fire, spacing, peeling
    const prec = mech, reac = mech;                    // both aim and dodge come from mechanics
    const disc = dec, posQ = 6, aw = know;

    if (u.manual) {
      const mo = u.manual;
      if (mo.castKey) {
        const sk = activeSkills(u).find((x) => x.key === mo.castKey);
        // FIX: `target` ยังไม่ถูกประกาศตรงนี้ (ประกาศอยู่ล่างลงไป) — เดิมทำให้ crash
        // เวลาใช้สกิลในห้องซ้อมตอนไม่มีเป้าที่ล็อกไว้
        let tgt = state.units.find((x) => x.id === mo.targetId && x.alive)
          || state.units.find((x) => x.id === u.targetId && x.alive)
          || null;
        if (mo.castPoint) {
          const near = state.units.find((x) => x.alive && x.team !== u.team &&
            Math.hypot(x.x - mo.castPoint.x, x.y - mo.castPoint.y) < x.radius + 140);
          tgt = near || {
            id: "__point", x: mo.castPoint.x, y: mo.castPoint.y, svx: 0, svy: 0, vx: 0, vy: 0,
            radius: 1, maxHp: 1, hp: 1, shield: 0, armor: 0, mr: 0, alive: true,
            team: u.team === "blue" ? "red" : "blue", buffs: [], recentDamagers: {},
            champ: { value: 1, melee: false, th: tr("จุด") }, targetId: null,
          };
        }
        if (sk && sk.rank > 0 && (sk.ammoMax ? sk.ammo > 0 : sk.cdLeft <= 0) && tgt && u.castLock <= 0 && !u.stunned && !u.silenced) {
          let use = sk;
          if (sk.type === "dual") {
            const half = u.shadow > 0 ? sk.shadow : sk.light;
            use = { ...sk, ...half, key: sk.key, rank: sk.rank, cast: sk.cast, fragCost: true, isShadow: u.shadow > 0 };
            spendFrag(u, u.shadow > 0);
          } else if (!sk.fragCost) {
            if (sk.ammoMax) { sk.ammo -= 1; if (sk.rechargeAt == null) sk.rechargeAt = state.t + sk.rechargeTime; }
            else sk.cdLeft = fullCd(u, sk);
          }
          state.castQueue.push({ u, sk: use, target: tgt, prec: 10 });
          onKazemCast(state, u);
          let ct = use.cast != null ? use.cast : DEFAULT_CAST;
          if (use.castByMs) ct = Math.max(use.castByMs.min, use.castByMs.base - bonusMs(u) / use.castByMs.per);
          u.castLock = ct;
          u.casts += 1;
        }
        mo.castKey = null;
        mo.castPoint = null;
      }
      const tgt = state.units.find((x) => x.id === mo.targetId && x.alive);
      u.targetId = tgt ? tgt.id : null;
      let mvx2 = 0, mvy2 = 0;
      if (mo.moveTo) {
        const dx = mo.moveTo.x - u.x, dy = mo.moveTo.y - u.y;
        const dl = Math.hypot(dx, dy);
        if (dl > 12) { mvx2 = dx / dl; mvy2 = dy / dl; } else mo.moveTo = null;
      }
      const sp = u.rooted || u.atkLock > 0 || u.castLock > 0 ? 0 : u.msEff;
      u.nvx = mvx2 * sp; u.nvy = mvy2 * sp;
      u.atkCd -= dt;
      if (mo.autoAttack && tgt && dist(u, tgt) <= u.range && u.atkCd <= 0 && !u.stunned && !u.disarmed && u.castLock <= 0) {
        u.atkCd = 1 / u.asEff;
        u.atkLock = (u.champ.windup != null ? u.champ.windup : DEFAULT_WINDUP) / u.asEff;
        u.shots += 1;
        let atkDmg = u.ad;
        const rev = u.champ.revolver;
        if (rev) { u.shotsFired += 1; if (u.shotsFired % rev.shots === 0) { atkDmg *= rev.mult; u.reloadUntil = state.t + rev.reload; } }
        if (!u.champ.missile) state.hitQueue.push({ ownerId: u.id, targetId: tgt.id, dmg: atkDmg, magic: false });
        else state.spawnQueue.push({ id: state.nextProjId++, team: u.team, ownerId: u.id, homing: true, targetId: tgt.id,
          x: u.x, y: u.y, dx: 0, dy: 0, speed: u.champ.missile, dmg: atkDmg, life: 2.5 });
      }
      continue;
    }

    // ---- target
    const tauntBuff = u.buffs.find((b) => b.type === "taunt");
    let target;
    if (tauntBuff && state.units.find((x) => x.id === tauntBuff.sourceId && x.alive)) {
      target = state.units.find((x) => x.id === tauntBuff.sourceId);
      u.targetId = target.id;
      u.retargetIn = 0.1;
    } else {
      u.retargetIn -= dt;
      target = state.units.find((x) => x.id === u.targetId && x.alive);
      if (!target || u.retargetIn <= 0) {
        const nt = pickTarget(state, u, supAlive);
        if (nt) { u.nextTargetId = nt.id; target = nt; }
        u.retargetIn = 0.8;
      }
    }
    if (!target) { u.vx = 0; u.vy = 0; continue; }
    u.aimTargetId = target.id;

    // ---- dodge (mechanics) ----
    // Skill here is not "dodges more", it is "dodges the right things". A low-mechanics
    // player flinches at every projectile and throws away attack uptime doing it; a high
    // one keeps attacking through chip damage and only breaks off for a real hit.
    const threat = incomingThreat(state, u, reac);
    const reactDelay = ((10 - reac) / 10) * 0.62;
    if (threat) {
      // how much of my health is this actually going to take?
      const bite = (threat.dmg || 0) / Math.max(1, u.hp);
      // A sharp player only peels off for a hit that actually matters. A weak one
      // flinches at chip damage and throws away attack uptime doing it.
      const realThreat = bite >= 0.10;
      const flinches = u.rng() < ((10 - reac) / 10) * 0.5;
      const worthDodging = realThreat || flinches;
      if (u.reactTimer < 0) u.reactTimer = 0; else u.reactTimer += dt;
      if (worthDodging && u.reactTimer >= reactDelay && u.dodgeTime <= 0 && state.t >= (u.dodgeReadyAt || 0)) {
        const side = (u.x - threat.x) * threat.dy - (u.y - threat.y) * threat.dx >= 0 ? 1 : -1;
        u.dodgeVec = { x: -threat.dy * side, y: threat.dx * side };
        u.dodgeTime = 0.26 + 0.10 * (reac / 10);
        u.dodgeReadyAt = state.t + 0.55;
        u.dodged = (u.dodged || 0) + 1;
      }
    } else {
      u.reactTimer = -1;
    }

    // ---- retreat (awareness): triggered by hp AND by being focused
    const hpFrac = u.hp / u.maxHp;
    const focus = focusedOnMe(state, u);
    const composure = 1;
    const spots = 0.85 - (sense / 10) * 0.55;       // game sense: a blind player panic-retreats
    // ตัวยิงระยะไกลที่ไม่ใช่ซัพต้องถอยเร็วกว่าคนอื่น — เขาคือเป้าแรกของทุกทีม
    // และไม่มีค่าสถานะอะไรให้ยืนรับเลย (มาร์คแมนตายถึง 88% ของไฟต์ก่อนแก้)
    const squishy = !u.champ.melee && !u.champ.kindness && !/Enchanter|Warden/.test(u.champ.role);
    const hpLine = (st.retreatAt + (squishy ? 0.16 : 0)) * composure;
    // โดนรุมตั้งแต่ 2 ตัวก็ถอยแล้วถ้าเป็นตัวเปราะ ไม่ต้องรอ 3
    const focusNeed = squishy ? 2 : 3;
    const focusLine = focus >= focusNeed && u.rng() < spots
      && hpFrac < (squishy ? 0.80 : 0.65) * composure;
    if (!u.retreating && (hpFrac < hpLine || focusLine) && state.t >= u.retreatReadyAt) {
      u.retreating = true;
      u.retreatUntil = state.t + RETREAT_TIME;
      u.retreatReadyAt = state.t + RETREAT_COOLDOWN;
      pushLog(state, tr(
        "{0} {1} ถอย — {2}",
        u.team === "blue" ? "🔵" : "🔴",
        u.lane,
        focusLine ? tr("โดนรุม {0} ตัว", focus) : tr("เลือดเหลือ {0}%", Math.round(hpFrac * 100))
      ));
    } else if (u.retreating && state.t >= u.retreatUntil) {
      u.retreating = false;
      pushLog(state, tr("{0} {1} กลับเข้าไฟต์", u.team === "blue" ? "🔵" : "🔴", u.lane));
    }

    // ---- movement intent
    const d = dist(u, target) || 1;
    const dirX = (target.x - u.x) / d;
    const dirY = (target.y - u.y) / d;
    let mvx, mvy;

    if (u.retreating) {
      // fall back toward our own side and our own team, not just backwards
      const home = u.team === "blue" ? 0 : ARENA_W;
      const c = cen[u.team];
      const hx = (home - u.x) >= 0 ? 1 : -1;
      mvx = hx * 0.9 + (c.x - u.x) * 0.00125 - dirX * 0.5;
      mvy = (c.y - u.y) * 0.0019 - dirY * 0.3;
      // serpentine so a retreating unit isn't a free target
      const wob = Math.sin(state.t * 6 + u.aimJitterSeed) * 0.55;
      mvx += -dirY * wob;
      mvy += dirX * wob;
    } else {
      // discipline: how far from the team's centre this unit is willing to be
      const c = cen[u.team];
      const chase = target.hp / target.maxHp < 0.35 ? (10 - disc) * 90 : 0;
      const leashBase = 430 + disc * 42 + chase + st.leashBonus;
      const cap = u.leashCap != null ? Math.min(leashBase, u.leashCap) : leashBase;
      const fromTeam = Math.hypot(u.x - c.x, u.y - c.y);
      const targetLowHp = target.hp / target.maxHp < 0.3;
      const itemBlock = u.noChaseLowHp && targetLowHp && fromTeam > cap * 0.75;

      if (fromTeam > cap || itemBlock) {
        mvx = (c.x - u.x) / (fromTeam || 1);
        mvy = (c.y - u.y) / (fromTeam || 1);
      } else {
        // a ranged champion should fight at the edge of its own range; a melee one
        // has no choice but to close. Discipline and positioning only nudge this now.
        let desired;
        if (u.champ.melee) {
          // ตัวประชิดไม่มีเหตุผลต้องยืน "ขอบระยะ" เหมือนตัวระยะไกล
          // เดิมตั้งไว้ที่ 92% ของ 175 = เหลือขอบแค่ 14 หน่วย ขยับนิดเดียวก็หลุดระยะ
          // แล้วไปยืนเก้ๆ กังๆ ข้างเป้าโดยไม่ตี — เข้าไปติดตัวเลยดีกว่า
          desired = u.range * 0.66 + u.rangeBias * (1 - posQ / 11) * 0.25;
          desired = clamp(desired, 90, u.range * 0.85);
        } else {
          // ตัวระยะไกลควรยืน "ขอบระยะตัวเอง" ไม่ใช่ 60-80% ของระยะ
          // เดิมมาร์คแมนระยะ 550 ยืนที่ 374 ซึ่งตัวประชิดพุ่งถึงได้สบาย
          // ผลคือตัวระยะไกลตาย 60% มากกว่าตัวประชิด 57% ทั้งที่ทำดาเมจน้อยกว่าครึ่ง
          const discMul = 0.88 + 0.012 * disc;
          const posMul = 0.95 + 0.005 * posQ;
          desired = u.range * st.standoff * discMul * posMul + u.rangeBias * (1 - posQ / 11) * 0.5;
          desired = clamp(desired, u.range * 0.78, u.range * 0.99);

          // ระยะที่ปลอดภัยไม่ได้วัดจากระยะของตัวเอง แต่วัดจาก "ศัตรูประชิดที่ใกล้ที่สุด"
          // ยืนให้พ้นระยะเอื้อมของเขาบวกเผื่อระยะพุ่งเข้าหา ตามสายตาที่อ่านเกมออก
          let threat = 0;
          for (const e of state.units) {
            if (!e.alive || e.team === u.team || !e.champ.melee) continue;
            const ed = dist(u, e) || 1;
            if (ed > u.range * 2.2) continue;               // ไกลเกินกว่าจะมาถึงทัน
            const gap = e.champ.rage ? 560 : 420;           // ตัวที่มีท่าพุ่งเอื้อมได้ไกลกว่า
            threat = Math.max(threat, e.range + gap * (0.45 + sense / 18));
          }
          if (threat > desired) desired = Math.min(u.range * 0.99, threat);
        }
        // smooth spiral: radial correction blended with orbiting, so units don't
        // bang back and forth across the range band (that made aiming unpredictable)
        const err = d - desired;
        // อยู่นอกระยะตีแล้วต้องวิ่งเข้าตรงๆ ไม่ใช่วนรอบ
        // เดิมหารด้วย 175 เสมอ ตัวประชิดที่ห่างเป้า 200 จึงได้แรงเข้าหาแค่ 22%
        // ที่เหลือไหลไปทางข้าง — ไล่ตัวระยะไกลที่ถอยด้วยความเร็วพอกันจึงไม่มีวันถึง
        const band = d > u.range ? 50 : 175;
        const radial = clamp(err / band, -1, 1);
        const tang = (1 - Math.abs(radial)) * (0.55 + posQ / 20);
        const sgn = u.orbitDir;
        mvx = dirX * radial + -dirY * sgn * tang;
        mvy = dirY * radial + dirX * sgn * tang;
      }

      // ตัวเปราะที่ยิงไกลต้องไม่ใช่คนที่อยู่หน้าสุดของทีมตัวเอง
      // ถ้าล้ำหน้าแนวหน้าอยู่ ให้ถอยกลับไปอยู่หลังเพื่อนที่ถึกกว่า
      if (!u.champ.melee && !u.champ.kindness && posQ > 0) {
        const ec2 = cen[u.team === "blue" ? "red" : "blue"];
        const myD = Math.hypot(u.x - ec2.x, u.y - ec2.y);
        let behindMe = 0, mates = 0;
        for (const a2 of state.units) {
          if (!a2.alive || a2.team !== u.team || a2.id === u.id) continue;
          mates++;
          if (Math.hypot(a2.x - ec2.x, a2.y - ec2.y) > myD) behindMe++;
        }
        // เพื่อนอยู่หลังเราเกือบหมด = เราคือคนหน้าสุด ซึ่งไม่ใช่ที่ของตัวยิงไกล
        // ทีมสองคน (บอทเลน) ต้องให้เพื่อนอยู่หลังจริงๆ ไม่งั้น mates-1 = 0 แล้วเข้าเงื่อนไขตลอด
        const frontmost = mates >= 2 ? behindMe >= mates - 1 : behindMe >= mates;
        if (mates && frontmost) {
          const dd = myD || 1;
          const pull = 0.45 + posQ / 14;
          mvx += ((u.x - ec2.x) / dd) * pull;
          mvy += ((u.y - ec2.y) / dd) * pull;
        }
      }

      // อย่ายืนกลางวงทีมศัตรู — แต่กฎนี้ใช้ได้เฉพาะตอนมีศัตรูหลายคนจริงๆ
      // ในไฟต์เลน 1v1 หรือ 2v2 "จุดกึ่งกลางทีมศัตรู" คือตัวเป้าหมายเราเอง
      // กฎเลยกลายเป็นห้ามเข้าหาเป้า ตัวประชิดจึงยืนค้างนอกระยะตีของตัวเองทั้งไฟต์
      // และยิ่งแต้มอ่านเกมสูงยิ่งถูกผลักแรง = ยิ่งเก่งยิ่งไม่ยอมตี
      let foesAlive = 0;
      for (const x of state.units) if (x.alive && x.team !== u.team) foesAlive++;
      if (posQ > 0 && foesAlive >= 3) {
        const ec = cen[u.team === "blue" ? "red" : "blue"];
        const ed2 = Math.hypot(u.x - ec.x, u.y - ec.y) || 1;
        // ระยะปลอดภัยของตัวประชิดต้องไม่เกินระยะตีของมันเอง ไม่งั้นมันจะตีไม่ถึงตลอดกาล
        const safe = u.champ.melee ? Math.min(420, u.range * 0.9) : 780;
        if (ed2 < safe) {
          const push = ((safe - ed2) / safe) * (0.15 + posQ / 10) * 1.15;
          mvx += ((u.x - ec.x) / ed2) * push;
          mvy += ((u.y - ec.y) / ed2) * push;
        }
      }

      // step out of anything already telegraphed on the ground
      for (const z of state.zones) {
        if (z.team === u.team) continue;
        const zd = Math.hypot(u.x - z.x, u.y - z.y) || 1;
        if (zd < z.r + u.radius + 60) {
          const urgency = 0.15 + 1.35 * (sense / 10);
          mvx += ((u.x - z.x) / zd) * urgency * 1.6;
          mvy += ((u.y - z.y) / zd) * urgency * 1.6;
        }
      }

      // kite the divers: keep clear of any melee enemy, not just the current target
      // never kite yourself out of your own attack range — backing off is only
      // worth it while you can still shoot
      // เดิมข้อนี้ทำงานเฉพาะตอนเข้าใกล้เป้าของตัวเองแล้ว ซึ่งมักจะสายไปแล้ว
      // ตอนนี้ถอยจากตัวประชิดตลอดเวลา และแรงถอยขึ้นกับว่าเขาเล็งเราอยู่หรือเปล่า
      if (!u.champ.melee) {
        for (const e of state.units) {
          if (!e.alive || e.team === u.team || !e.champ.melee) continue;
          const ed = dist(u, e) || 1;
          const onMe = e.targetId === u.id;
          const danger = e.range + (e.champ.rage ? 520 : 400) + (onMe ? 180 : 0);
          if (ed < danger) {
            const push = ((danger - ed) / danger) * (0.55 + posQ / 12) * (onMe ? 1.5 : 1);
            mvx += ((u.x - e.x) / ed) * push;
            mvy += ((u.y - e.y) / ed) * push;
          }
        }
      }

      // never let the defensive drift carry you past your own attack range —
      // backing off is only worth it while you can still shoot
      if (d > u.range * 0.9) {
        const out = mvx * -dirX + mvy * -dirY;
        if (out > 0) { mvx += dirX * out; mvy += dirY * out; }
      }
    }

    // ally spacing — Ghosting (Laura W) เดินทะลุยูนิตได้ ไม่ต้องเบียดกัน
    for (const a of state.units) {
      if (hasBuff(u, "ghost")) break;
      if (a.id === u.id || !a.alive || a.team !== u.team) continue;
      const ad2 = dist(u, a);
      if (ad2 < 360 && ad2 > 0.001) {
        const push = ((360 - ad2) / 360) * 0.55;
        mvx += ((u.x - a.x) / ad2) * push;
        mvy += ((u.y - a.y) / ad2) * push;
      }
    }

    let speed = u.rooted || u.atkLock > 0 || u.castLock > 0 || u.hurl ? 0 : u.msEff;
    // โดน Charm — เดินตรงเข้าหาคนที่สะกดไว้ ช้าลงตามค่าของสกิล
    if (u.charmed) {
      const cs = state.units.find((x) => x.id === u.charmed.sourceId && x.alive);
      if (cs) {
        const chd = dist(u, cs) || 1;
        mvx = (cs.x - u.x) / chd;
        mvy = (cs.y - u.y) / chd;
        speed = u.msEff * (1 - (u.charmed.slow || 0));
      }
    }
    if (u.chasing) {
      const ct = state.units.find((x) => x.id === u.chasing.targetId);
      if (!ct || !ct.alive || state.t > u.chasing.until) u.chasing = null;
      else if (!u.rooted) {
        const cd2 = dist(u, ct) || 1;
        if (cd2 <= u.chasing.skill.grabRange + ct.radius) {
          startGrab(state, u, u.chasing.skill, ct);
          u.chasing = null;
        } else {
          // The Curse of Gold — พุ่งเข้าไปหาด้วยความเร็วของสกิลเอง จนกว่าระยะพุ่งจะหมด
          const ch = u.chasing;
          let sp2 = u.msEff * 2;
          if (ch.lungeSpeed > 0 && ch.lungeLeft > 0) {
            sp2 = ch.lungeSpeed;
            ch.lungeLeft -= ch.lungeSpeed * dt;
          }
          u.nvx = ((ct.x - u.x) / cd2) * sp2;
          u.nvy = ((ct.y - u.y) / cd2) * sp2;
          continue;
        }
      }
    }
    // juggernaut/diver rage: melee champions accelerate while still out of reach
    if (u.champ.rage && d > u.range * 1.1 && !u.retreating) speed *= 1 + u.champ.rage;
    if (u.dodgeTime > 0 && u.dodgeVec && speed > 0) {
      u.dodgeTime -= dt;
      mvx += u.dodgeVec.x * 2.0;
      mvy += u.dodgeVec.y * 2.0;
      speed *= 1.12 + 0.22 * (mech / 10);
    }

    const mlen = Math.hypot(mvx, mvy);
    if (mlen > 0.001) { u.nvx = (mvx / mlen) * speed; u.nvy = (mvy / mlen) * speed; }
    else { u.nvx = 0; u.nvy = 0; }

    // ---- cast (the AI picks a skill before it thinks about auto attacking)
    if (u.castLock <= 0 && !u.stunned && !u.silenced && u.charging == null && u.channeling == null) castSkills(state, u, target, d, disc, aw, prec);

    // ---- auto attack: it always lands. Ranged champions just pay a travel delay,
    // which is the whole cost of having range in the first place.
    u.atkCd -= dt;
    if (d <= u.range && u.atkCd <= 0 && !u.stunned && !u.disarmed && u.charging == null && u.channeling == null && state.t >= u.reloadUntil) {
      u.atkCd = 1 / u.asEff;
      u.atkLock = (u.champ.windup != null ? u.champ.windup : DEFAULT_WINDUP) / u.asEff;
      u.shots += 1;
      if (u.blinded) { continue; }
      // ออโต้ที่ "เสียเปล่า" — คูลดาวน์หมดไปแต่ดาเมจไม่เกิด
      // เมื่อก่อนทอยสามครั้งแยกกัน (42% / 26% / 24%) แล้วคูณทบกัน
      // แต้ม 5 ทั้งสามช่องจึงพลาดถึง 40% และแต้ม 1 พลาด 63% ซึ่งมากจนไฟต์ไม่มีอะไรเกิดขึ้น
      // ตอนนี้ทอยครั้งเดียว แล้วค่อยแยกว่าพลาดเพราะอะไรเพื่อเอาไปโชว์ในบันทึก
      const wMech = ((10 - mech) / 10) * 0.25;
      const wTeam = ((10 - team) / 10) * 0.05;
      const wSense = ((10 - sense) / 10) * 0.05;
      const roll = u.rng();
      if (roll < wMech + wTeam + wSense) {
        if (roll < wMech) u.wasted = (u.wasted || 0) + 1;
        else if (roll < wMech + wTeam) u.hesitated = (u.hesitated || 0) + 1;
        else u.caught = (u.caught || 0) + 1;
        continue;
      }
      let atkDmg = u.ad;
      let didCrit = false;
      if (u.crit > 0 && u.rng() < u.crit) {
        const critBonus = u.ad * (0.75 + (u.critDmg || 0)); // ฐาน +75% บวกโบนัสคริจากไอเทม
        const motCut = target.motFlat != null && target.hasItem("mot") ? 0.3 : 0;
        atkDmg = u.ad + critBonus * (1 - motCut);
        didCrit = true;
        // Artemis' Silver Crescent — คริติคอลที่ลงติดสโลว์สั้นๆ
        if (u.hasItem("asc")) addBuff(target, { type: "slow", v: 0.20, until: state.t + 1 }, state.t);
        // HOOD passive — คริไม่ระเบิดทีเดียว ส่วนเกินกลายเป็นเลือดไหลแทน
        if (u.champ.critBleed) {
          hoodBleed(state, u, target, critBonus * (1 - motCut) * AUTO_DMG);
          atkDmg = u.ad;
        }
      }
      if (target.hasItem("mot")) atkDmg = Math.max(0, atkDmg - target.motFlat);
      // YODAKA — ออโต้ที่มีสแตกดาว จะพุ่งทะลวงไปโผล่หลังเป้าแล้วกวาดทั้งแนว
      if (u.champ.starlight) starPierce(state, u, target);
      if (u.champ.isolde) gainIsolde(state, u, didCrit ? u.champ.isolde.onCrit : u.champ.isolde.onAuto);
      // Plunder — ออโต้ที่คริได้เงินกระเป๋าแยกเพิ่ม 1
      if (didCrit && u.champ.bounty && u.champ.bounty.perCrit) u.bountyGold += u.champ.bounty.perCrit;
      // Broadside: critting speeds up the next cannonball's recharge by 2.5s
      if (didCrit && u.hasItem && u.champ.id === "C.HOOK") {
        const eSkill = u.skills.find((x) => x.key === "E" && x.ammoMax);
        if (eSkill && eSkill.rechargeAt != null) eSkill.rechargeAt = Math.max(state.t, eSkill.rechargeAt - 2.5);
      }
      const rev = u.champ.revolver;
      if (rev) {
        u.shotsFired += 1;
        if (u.shotsFired % rev.shots === 0) {
          atkDmg *= rev.mult;
          u.reloadUntil = state.t + rev.reload;
        }
      }
      atkDmg *= AUTO_DMG;
      if (!u.champ.missile) {
        state.hitQueue.push({ ownerId: u.id, targetId: target.id, dmg: atkDmg, magic: false });
      } else {
        state.spawnQueue.push({
          id: state.nextProjId++, team: u.team, ownerId: u.id,
          homing: true, targetId: target.id,
          x: u.x, y: u.y, dx: 0, dy: 0,
          speed: u.champ.missile, dmg: atkDmg, life: 2.5,
        });
      }
    }
  }

  // ---- PASS 2: apply movement simultaneously ----
  for (const u of state.units) {
    if (!u.alive) continue;
    if (u.nextTargetId) { u.targetId = u.nextTargetId; u.nextTargetId = null; }
    u.vx = u.nvx || 0;
    u.vy = u.nvy || 0;
    u.x = clamp(u.x + u.vx * dt, u.radius, ARENA_W - u.radius);
    u.y = clamp(u.y + u.vy * dt, u.radius, ARENA_H - u.radius);
    // Crashing Tide — ว่ายไปถึงจุดที่จะทุบจริงๆ ตลอดช่วงร่าย ไม่ใช่โผล่ที่นั่นทันที
    // (ทับค่าหลังการเดินปกติ เพราะช่วงนี้เธอไม่ได้เดินเอง)
    if (u.striding) {
      const sd = u.striding;
      if (state.t >= sd.t1) {
        u.x = sd.x; u.y = sd.y; u.striding = null;
      } else {
        const k = (state.t - sd.t0) / Math.max(0.001, sd.t1 - sd.t0);
        u.x = sd.x0 + (sd.x - sd.x0) * k;
        u.y = sd.y0 + (sd.y - sd.y0) * k;
      }
    }
    // Gleipnir's Binding Shackles: can't stray more than 600 units from whoever tethered you
    const tether = u.buffs.find((b) => b.type === "leash");
    if (tether) {
      const caster = state.units.find((x) => x.id === tether.sourceId);
      if (caster) {
        const dd = dist(u, caster);
        if (dd > tether.v) {
          u.x = clamp(caster.x + ((u.x - caster.x) / dd) * tether.v, u.radius, ARENA_W - u.radius);
          u.y = clamp(caster.y + ((u.y - caster.y) / dd) * tether.v, u.radius, ARENA_H - u.radius);
        }
      }
    }
  }

  state.fx = state.fx.filter((f) => state.t - f.t < (f.dur || (f.kind === "num" ? 0.9 : f.kind === "label" ? 1.1 : 0.55)));
  for (const f of state.fx) {
    if (f.kind === "trail" && f.pending) {
      const mu = state.units.find((x) => x.id === f.pending);
      if (mu) { f.x2 = mu.x; f.y2 = mu.y; f.pending = null; }
    }
  }
  for (const p of state.spawnQueue) state.projectiles.push(p);
  state.spawnQueue.length = 0;
  for (const h of state.hitQueue) {
    const o = state.units.find((x) => x.id === h.ownerId);
    const t = state.units.find((x) => x.id === h.targetId);
    if (o && o.alive && t && t.alive) {
      state.dmgSrc = h.src || tr("ออโต้");
      applyDamage(state, o, t, h.dmg, h.magic, false, true);
      state.dmgSrc = null;
      o.hits += 1;
      onAutoLanded(state, o, t);
      consumeOnHit(state, o, t);
    }
  }
  state.hitQueue.length = 0;

  // charge-up dashes: release early once the target is in reach, or at full charge
  for (const u of state.units) {
    if (!u.alive || !u.charging) continue;
    const sk = u.charging.skill;
    const held = state.t - u.charging.start;
    const tgt = state.units.find((x) => x.id === u.charging.target);
    const maxC = sk.maxCharge || 3;
    const fullAt = sk.fullCharge || maxC;
    if (u.charging.beam) {
      const held2 = state.t - u.charging.start;
      const tg = state.units.find((x) => x.id === u.charging.target);
      const full = held2 >= sk.maxCharge;
      const worth = tg && tg.alive && held2 > 1.2 && dist(u, tg) < 2200;
      if (full || !tg || !tg.alive || worth) {
        const frac2 = Math.min(1, held2 / sk.maxCharge);
        const w = sk.widthMin + (sk.widthMax - sk.widthMin) * frac2;
        const ang2 = tg ? Math.atan2(tg.y - u.y, tg.x - u.x) : 0;
        state.projectiles.push({
          id: state.nextProjId++, team: u.team, ownerId: u.id, skill: sk,
          x: u.x, y: u.y, dx: Math.cos(ang2), dy: Math.sin(ang2), speed: sk.projSpeed,
          dmg: skillPower(u, sk, tg), magic: true, width: w, pierce: true, hitIds: [], life: 3,
          src: skillLabel(u, sk),
        });
        vfx(state, { kind: "beam", x: u.x, y: u.y, x2: u.x + Math.cos(ang2) * 2500, y2: u.y + Math.sin(ang2) * 2500, w: w / 2, color: "176,140,255", dur: 0.5 });
        u.charging = null;
      } else if (!hasBuff(u, "flying")) addBuff(u, { type: "root", v: 1, until: state.t + 0.1 }, state.t);
      continue;
    }
    if (u.charging.rangeCharge) {
      const held3 = state.t - u.charging.start;
      const tg = state.units.find((x) => x.id === u.charging.target);
      const d3 = tg ? dist(u, tg) : Infinity;
      const reach = sk.rangeMin + (sk.rangeMax - sk.rangeMin) * Math.min(1, held3 / sk.maxCharge);
      const full = held3 >= sk.maxCharge;
      // ปล่อยทันทีที่ชาร์จพอจะถึงเป้า ไม่ต้องอั้นจนเต็มถ้าเป้าอยู่ใกล้
      if (full || !tg || !tg.alive || (d3 <= reach - 40 && held3 > 0.15)) {
        const ang3 = tg ? Math.atan2(tg.y - u.y, tg.x - u.x) : 0;
        // ลำแสงโดนทันทีที่ปล่อย (hitscan) ไม่มีกระสุนวิ่ง — เรียงตามระยะแล้วค่อยลดหลั่นทีละตัว
        const nx3 = Math.cos(ang3), ny3 = Math.sin(ang3);
        const halfW = sk.width / 2;
        const line = [];
        for (const e of state.units) {
          if (!e.alive || e.team === u.team) continue;
          if (hasBuff(e, "stealth") || hasBuff(e, "untargetable")) continue;
          const rx = e.x - u.x, ry = e.y - u.y;
          const along = rx * nx3 + ry * ny3;
          if (along < -e.radius || along > reach + e.radius) continue;
          if (Math.abs(rx * -ny3 + ry * nx3) > halfW + e.radius) continue;
          line.push({ e, along });
        }
        line.sort((a, b) => a.along - b.along);
        let beamDmg = skillPower(u, sk, tg);
        const prevSrc3 = state.dmgSrc;
        state.dmgSrc = skillLabel(u, sk);
        for (const { e } of line) {
          applyDamage(state, u, e, beamDmg, !!sk.magic);
          if (sk.falloff) beamDmg *= sk.falloff;
        }
        state.dmgSrc = prevSrc3;
        vfx(state, { kind: "beam", x: u.x, y: u.y, x2: u.x + Math.cos(ang3) * reach,
          y2: u.y + Math.sin(ang3) * reach, w: sk.width / 2, color: "176,140,255", dur: 0.35 });
        u.charging = null;
        u.buffs = u.buffs.filter((b) => b.tag !== "qcharge");
      } else {
        addBuffUnique(u, "qcharge", { type: "slow", v: sk.selfSlow || 0.2, until: state.t + 0.2 }, state.t);
      }
      continue;
    }
    if (u.charging.snipe) {
      if (held >= sk.windup) {
        fireSnipe(state, u, sk, tgt);
        u.charging = null;
      } else if (!tgt || !tgt.alive) u.charging = null;
      continue;
    }
    const inReach = tgt && tgt.alive && dist(u, tgt) < sk.dashRange * 0.75;
    if (!tgt || !tgt.alive || held >= fullAt || held >= maxC || (inReach && held > 0.4)) {
      const frac = Math.min(1, held / fullAt);
      resolveDash(state, u, sk, tgt, frac, u.charging.prec != null ? u.charging.prec : 6);
      u.charging = null;
      u.buffs = u.buffs.filter((b) => b.type !== "slow" || b.v !== (sk.selfSlow || 0.3));
    }
  }

  // แชนแนลอุกกาบาตของ Faustus — ตรึงตัวเองไว้ ยิงทีละระลอกใส่ตำแหน่งศัตรูทุกคน
  for (const u of state.units) {
    const ch = u.channeling;
    if (!ch) continue;
    // ตายหรือโดน Hard CC = ยกเลิกทันที
    // root ที่ตัวเองใส่ไว้เพื่อยืนนิ่งไม่นับเป็นการขัดจังหวะ — ดูเฉพาะ CC ที่มาจากคนอื่น
    const outsideRoot = u.buffs.some((b) => b.type === "root" && b.tag !== "channel" && b.until > state.t);
    if (!u.alive || hasBuff(u, "stun") || hasBuff(u, "fear") || outsideRoot || u.charmed) {
      u.channeling = null;
      continue;
    }
    addBuffUnique(u, "channel", { type: "root", v: 1, until: state.t + 0.15 }, state.t);
    if (state.t < ch.next) continue;
    const sk = ch.skill;
    ch.next = state.t + sk.every;
    ch.left -= 1;
    for (const e of state.units) {
      if (!e.alive || e.team === u.team) continue;
      if (dist(u, e) > ch.range) continue;
      state.zones.push({
        x: e.x, y: e.y, r: sk.radius, at: state.t + sk.telegraph,
        ownerId: u.id, team: u.team, dmg: skillPower(u, sk, e), magic: true, skill: sk,
      });
      vfx(state, { kind: "ring", x: e.x, y: e.y, r: sk.radius, color: "229,72,77", grow: 0.15, dur: sk.telegraph });
    }
    if (ch.left <= 0) {
      u.channeling = null;
      u.buffs = u.buffs.filter((b) => b.tag !== "channel");
    }
  }

  // resolve every queued cast after movement, so nothing depends on who thought first
  for (const q of state.castQueue) {
    if (!q.u.alive) continue;
    q.u.pendingSkillHit = true;
    q.u.skillHitThisCast = false;
    fireSkill(state, q.u, q.sk, q.target, q.prec);
    q.u.pendingSkillHit = false;
    if (q.u.skillHitThisCast) onSkillLanded(state, q.u, q.sk);
    onMageCast(state, q.u, q.sk);
    // Balmung's Dragon-Cleaver: casting a skill empowers the next basic attack
    // with 175% Base AD and a 2s speed kick, capped every 1.5s
    if (q.u.hasItem("bdc") && (q.u.bdcReadyAt == null || state.t >= q.u.bdcReadyAt)) {
      q.u.bdcReadyAt = state.t + 1.5;
      const baseAd = q.u.champ.ad + q.u.champ.adG * (q.u.level - 1);
      q.u.bdcEmpower = 1.75 * baseAd;
      addBuff(q.u, { type: "ms", v: 0.06, until: state.t + 2 }, state.t);
    }
    // Horn of the Wild Hunt: firing the ultimate specifically grants a big burst, CD 30s
    if (q.u.hasItem("hwh") && q.sk.ult && (q.u.hwhReadyAt == null || state.t >= q.u.hwhReadyAt)) {
      const cdr = cdrFromItemHaste(q.u.itemHaste || 0);
      q.u.hwhReadyAt = state.t + 30 * (1 - cdr);
      addBuff(q.u, { type: "adFlat", v: 20, until: state.t + 8 }, state.t);
      addBuff(q.u, { type: "as", v: 0.3, until: state.t + 8 }, state.t);
      addBuff(q.u, { type: "ms", v: 0.15, until: state.t + 8 }, state.t);
    }
  }
  state.castQueue.length = 0;

  tickNewSystems(state);
  tickDashes(state);
  tickGrabs(state);
  tickHurls(state);
  tickGardens(state);
  tickMirrors(state);
  tickZonesAndSnipes(state);

  // ---- projectiles
  const kept = [];
  for (const p of state.projectiles) {
    p.life -= dt;
    if (p.life <= 0) continue;
    if (p.homing) {
      const t = state.units.find((x) => x.id === p.targetId);
      if (!t || !t.alive) continue; // a slow missile is wasted if the target dies first
      const dd = Math.hypot(t.x - p.x, t.y - p.y) || 1;
      p.dx = (t.x - p.x) / dd;
      p.dy = (t.y - p.y) / dd;
      const stepLen = p.speed * dt;
      if (dd <= stepLen + t.radius) {
        const owner = state.units.find((x) => x.id === p.ownerId);
        state.dmgSrc = p.src || tr("ออโต้");
        applyDamage(state, owner, t, p.dmg, false, false, true);
        state.dmgSrc = null;
        if (owner) { owner.hits += 1; onAutoLanded(state, owner, t); consumeOnHit(state, owner, t); }
        continue;
      }
    }
    p.x += p.dx * p.speed * dt;
    p.y += p.dy * p.speed * dt;
    if (p.x < -80 || p.x > ARENA_W + 80 || p.y < -80 || p.y > ARENA_H + 80) continue;

    if (p.homing) { kept.push(p); continue; }
    const owner = state.units.find((x) => x.id === p.ownerId);
    const reach = (p.width ? p.width / 2 : 0);
    let consumed = false;
    for (const u of state.units) {
      if (!u.alive || u.team === p.team) continue;
      if (p.hitIds && p.hitIds.includes(u.id)) continue;
      if (hasBuff(u, "stealth") || hasBuff(u, "untargetable")) continue;
      if (dist(u, p) > u.radius + reach) continue;

      state.dmgSrc = p.src || (p.skill ? tr("สกิล") : tr("ออโต้"));
      applyDamage(state, owner, u, p.dmg, !!p.magic);
      if (p.skill) {
        vfx(state, { kind: "hit", x: u.x, y: u.y, size: Math.max(60, (p.width || 90) * 0.8),
          color: p.magic ? "176,140,255" : "255,208,138", dur: 0.4 });
      }
      state.dmgSrc = null;
      if (owner && !p.skill) owner.hits += 1;
      if (p.root) u.buffs.push({ type: "root", v: 1, until: state.t + p.root });
      if (p.daggerBleed) {
        u.dagger = { ownerId: p.ownerId };
        state.dots = state.dots.filter((x) => !(x.targetId === u.id && x.ownerId === p.ownerId && x.dagger));
        state.dots.push({ targetId: u.id, ownerId: p.ownerId, dps: p.dmg / p.daggerBleed,
          until: state.t + p.daggerBleed, magic: false, dagger: true });
        // Lost Boys' Blade: slowed for as long as the bleed is still running
        if (p.skill && p.skill.bleedSlowBase != null) {
          const slowV = p.skill.bleedSlowBase + p.skill.bleedSlowPerAp * ((owner ? owner.ap : 0) / 100);
          addBuff(u, { type: "slow", v: slowV, until: state.t + p.daggerBleed }, state.t);
        }
      }
      if (p.slow) u.buffs.push({ type: "slow", v: p.slow, until: state.t + (p.dur || 1.5) });
      if (p.charm && owner) applyCharm(state, owner, u, p.charm, p.charmSlow);
      if (p.polymorph && owner) applyPolymorph(state, owner, u, p.polymorph, p.polySlow || 0.4);
      // Gleipnir's Binding Shackles: the first champion it touches gets leashed to the caster
      if (p.itemLeash && owner) {
        addBuff(u, { type: "leash", v: p.itemLeash.range, sourceId: owner.id, until: state.t + p.itemLeash.dur }, state.t);
      }
      // Liar's Reach โดนศัตรู = พาสซีฟ Cricket's Whisper แรงสองเท่าชั่วคราว
      if (p.skill && p.skill.kindnessBoost && owner && owner.champ.kindness) {
        owner.kindnessBoostUntil = state.t + (owner.champ.kindness.qDur || 4);
      }
      if (p.pierce) { p.hitIds.push(u.id); if (p.falloff) p.dmg *= p.falloff; }
      else { consumed = true; break; }
    }
    if (consumed) continue;
    kept.push(p);
  }
  state.projectiles = kept;

  // ---- เก็บตัวอย่างสำหรับกราฟเส้นเวลา ทุก 0.25 วิ
  if (state.t >= state.nextSample) {
    state.nextSample = state.t + 0.25;
    const sum = (team, f) => state.units.filter((u) => u.team === team).reduce((a, u) => a + f(u), 0);
    state.timeline.push({
      t: +state.t.toFixed(2),
      bd: Math.round(sum("blue", (u) => u.damageDealt)),
      rd: Math.round(sum("red", (u) => u.damageDealt)),
      bh: Math.round(sum("blue", (u) => (u.alive ? u.hp : 0))),
      rh: Math.round(sum("red", (u) => (u.alive ? u.hp : 0))),
      ba: state.units.filter((u) => u.team === "blue" && u.alive).length,
      ra: state.units.filter((u) => u.team === "red" && u.alive).length,
    });
  }

  // ---- end conditions
  const b = aliveOf(state, "blue").length;
  const r = aliveOf(state, "red").length;
  // อีเวนต์ "ล้มสองตัวจบ" — ฝั่งที่ตายครบก่อนแพ้ทันที ไม่ต้องรอล้มหมดทีม
  if (state.endOnDeaths) {
    const bd = state.units.filter((u) => u.team === "blue" && !u.alive).length;
    const rd = state.units.filter((u) => u.team === "red" && !u.alive).length;
    if (bd >= state.endOnDeaths || rd >= state.endOnDeaths) {
      state.over = true;
      state.winner = bd >= state.endOnDeaths && rd >= state.endOnDeaths
        ? (bd < rd ? "blue" : rd < bd ? "red" : (state.rng() < 0.5 ? "blue" : "red"))
        : (bd >= state.endOnDeaths ? "red" : "blue");
      pushLog(state, tr("☠ ฝั่งหนึ่งล้มครบ {0} ตัว — จบยก", state.endOnDeaths));
      return state;
    }
  }
  if (b === 0 || r === 0) {
    state.over = true;
    state.winner = b > r ? "blue" : r > b ? "red" : (state.rng() < 0.5 ? "blue" : "red");
  } else if (state.t >= state.timeLimit) {
    state.over = true;
    const bh = aliveOf(state, "blue").reduce((s, u) => s + u.hp / u.maxHp, 0);
    const rh = aliveOf(state, "red").reduce((s, u) => s + u.hp / u.maxHp, 0);
    state.winner = bh > rh ? "blue" : rh > bh ? "red" : (state.rng() < 0.5 ? "blue" : "red");
    pushLog(state, tr("⏱ หมดเวลา {0}s — ตัดสินที่เลือดรวม", state.timeLimit));
  }
  return state;
}


export function runFight(state, maxSteps = 0) {
  maxSteps = maxSteps || Math.ceil((state.timeLimit + 2) * 60);
  let n = 0;
  while (!state.over && n < maxSteps) { step(state); n++; }
  if (!state.over) { state.over = true; state.winner = state.rng() < 0.5 ? "blue" : "red"; }
  return state;
}
