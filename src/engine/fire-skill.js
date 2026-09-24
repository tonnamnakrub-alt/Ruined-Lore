import { tr } from "../i18n.js";
import { ARENA_H, ARENA_W, BASE } from "../data/constants.js";
import { applyDamage, edgeDamage, grantShield, healUnit, skillHeal, skillPower } from "./damage.js";
import { startGrab } from "./motion.js";
import { applyCharm, startBloodStorm } from "./laura.js";
import { castDismissal, castGuardBurst } from "./klaeder.js";
import { castAllyBlink, castTeaGarden, castWonderland } from "./alice.js";
import { addBuff, addBuffUnique, bonusMs, burnDot, dist, hasBuff, pushLog, recentTaken, skillLabel, vfx } from "./state-util.js";
import { marksmanOnHit, onAutoLanded } from "./on-hit.js";
import { alliesOf, enemiesOf } from "./targeting.js";
import { clamp } from "./util.js";
import { fireLoreSkill, gainStar } from "./lore.js";


// ครอบ fireSkillEffect ไว้ เพื่อติดป้าย "ดาเมจนี้มาจากสกิลไหน" ให้ทุกอย่างที่สกิลนี้ปล่อยออกไป
// (ลูกกระสุน โซน พิษ คิวโจมตี) แล้วหน้ากราฟจะแยกที่มาของดาเมจได้
export function fireSkill(state, u, sk, target, prec) {
  const label = skillLabel(u, sk);
  const prevSrc = state.dmgSrc, prevUnit = state.srcUnit;
  const marks = [
    [state.projectiles, state.projectiles.length],
    [state.zones, state.zones.length],
    [state.dots, state.dots.length],
    [state.spawnQueue, state.spawnQueue.length],
    [state.hitQueue, state.hitQueue.length],
    [state.hots, state.hots ? state.hots.length : 0],
  ];
  state.dmgSrc = label;
  state.srcUnit = u;
  try {
    return fireSkillEffect(state, u, sk, target, prec);
  } finally {
    for (const [arr, from] of marks) {
      if (!arr) continue;
      for (let i = from; i < arr.length; i++) if (!arr[i].src) arr[i].src = label;
    }
    if (u.dashing && !u.dashing.src) u.dashing.src = label;
    if (u.grabbing && !u.grabbing.src) u.grabbing.src = label;
    state.dmgSrc = prevSrc;
    state.srcUnit = prevUnit;
  }
}

function fireSkillEffect(state, u, sk, target, prec) {
  const power = skillPower(u, sk, target);
  const lead = (prec / 10) * 0.38;
  const travel = dist(u, target) / BASE.projSpeed;
  const aimX = target.x + target.svx * travel * lead;
  const aimY = target.y + target.svy * travel * lead;
  const miss = (u.rng() * 2 - 1) * Math.pow((10 - prec) / 10, 1.1) * 380;
  const len = Math.hypot(aimX - u.x, aimY - u.y) || 1;
  // the same aiming error has to move the ground target too, not just the angle
  const missX = aimX + (-(aimY - u.y) / len) * miss;
  const missY = aimY + ((aimX - u.x) / len) * miss;
  const ang = Math.atan2(aimY - u.y + (aimX - u.x) / len * miss * 0, aimX - u.x) +
              (u.rng() * 2 - 1) * Math.pow((10 - prec) / 10, 1.2) * 0.16;

  switch (sk.type) {
    case "line": {
      const lineCol = sk.magic ? "176,140,255" : "255,208,138";
      vfx(state, { kind: "flash", x: u.x, y: u.y, r: (sk.width || 100) * 0.6, color: lineCol });
      // บางท่าไม่ใช่ของที่ลอยไป แต่เป็นพื้นที่แยกออกไปข้างหน้าพร้อมกันทันที (TOTSAKAN Q)
      // ต้องกินทั้งแนวในเฟรมเดียว และกำแพงกันกระสุนก็กันมันไม่ได้
      if (sk.instant) {
        const nx = Math.cos(ang), ny = Math.sin(ang);
        const reach = sk.range + (u.skillRangeBoost || 0);
        const halfW = (sk.width || 100) / 2;
        const prevSrcL = state.dmgSrc;
        state.dmgSrc = skillLabel(u, sk);
        // ไฟที่ค้างอยู่บนร่องแยก — ดาเมจต่อเนื่องของใครโดนหรือใครเดินเข้ามาทีหลัง
        const gb = sk.groundBurn;
        const burn = gb ? {
          tag: "burn:" + u.id + ":" + sk.key,
          dps: (gb.dmg[Math.max(0, sk.rank - 1)] + (gb.badRatio || 0) * (u.bonusAd || 0)) / (gb.every || 0.5),
          every: gb.every || 0.5, dur: gb.dur, magic: !!sk.magic, src: skillLabel(u, sk),
        } : null;
        for (const e of enemiesOf(state, u)) {
          const rx = e.x - u.x, ry = e.y - u.y;
          const along = rx * nx + ry * ny;
          if (along < -e.radius || along > reach + e.radius) continue;
          if (Math.abs(rx * -ny + ry * nx) > halfW + e.radius) continue;
          applyDamage(state, u, e, power, !!sk.magic);
          // สโลว์บางท่าไต่ตามเลเวลของเจ้าของท่า ไม่ใช่ตามขั้นสกิล
          const lv = sk.slowBase != null
            ? sk.slowBase + (sk.slowPerLevel || 0) * (u.level || 1)
            : (sk.slowByRank ? sk.slowByRank[Math.max(0, sk.rank - 1)] : sk.slow);
          if (lv) addBuff(e, { type: "slow", v: lv, until: state.t + (sk.dur || 1) }, state.t);
          if (burn) burnDot(state, u, e, burn);
        }
        state.dmgSrc = prevSrcL;
        if (burn) {
          state.fields.push({
            ownerId: u.id, team: u.team,
            x: u.x + nx * (reach / 2), y: u.y + ny * (reach / 2), nx, ny,
            halfLen: reach / 2, halfW, until: state.t + gb.dur, slow: 0, burn,
          });
        }
        vfx(state, { kind: "beam", x: u.x, y: u.y, x2: u.x + nx * reach, y2: u.y + ny * reach,
          w: halfW, color: lineCol, dur: 0.4 });
        // เศษหินและประกายไฟพุ่งขึ้นมาจากรอยแยกตลอดแนว
        for (const f of [0.35, 0.7, 1]) {
          vfx(state, { kind: "debris", x: u.x + nx * reach * f, y: u.y + ny * reach * f,
            r: halfW * 1.6, color: "214,170,96", dur: 0.7 });
        }
        break;
      }
      state.projectiles.push({
        id: state.nextProjId++, team: u.team, ownerId: u.id, skill: sk,
        x: u.x, y: u.y, dx: Math.cos(ang), dy: Math.sin(ang),
        speed: sk.projSpeed || BASE.projSpeed * 1.15, dmg: power, magic: !!sk.magic,
        width: sk.width, pierce: !!sk.pierce, falloff: sk.falloff, root: sk.root, daggerBleed: sk.daggerBleed,
        slow: sk.slowByRank ? sk.slowByRank[Math.max(0, sk.rank - 1)] : sk.slow, dur: sk.dur,
        charm: sk.charm ? sk.charm[Math.max(0, sk.rank - 1)] : 0, charmSlow: sk.charmSlow,
        polymorph: sk.polymorph ? sk.polymorph[Math.max(0, sk.rank - 1)] : 0, polySlow: sk.polySlow,
        life: sk.range / (sk.projSpeed || BASE.projSpeed * 1.15), hitIds: [],
      });
      break;
    }
    case "aoeSelf": {
      const rEff = sk.radius + (u.skillRangeBoost || 0);
      const aCol = sk.magic ? "176,140,255" : "255,208,138";
      // halfCircle = กวาดแค่ครึ่งวงด้านหน้า (หันไปทางเป้า) แลกกับรัศมีที่กว้างขึ้น
      const face = sk.halfCircle ? Math.atan2((target ? target.y : u.y + 1) - u.y, (target ? target.x : u.x) - u.x) : 0;
      vfx(state, sk.halfCircle
        ? { kind: "cone", x: u.x, y: u.y, r: rEff, ang: face, half: Math.PI / 2, color: aCol, dur: 0.6 }
        : { kind: "shock", x: u.x, y: u.y, r: rEff, color: aCol, dur: 0.6 });
      vfx(state, { kind: "flash", x: u.x, y: u.y, r: rEff * 0.6, color: aCol, dur: 0.28 });
      const rr = Math.max(0, sk.rank - 1);
      for (const e of enemiesOf(state, u)) {
        if (dist(u, e) > rEff + e.radius) continue;
        if (sk.halfCircle) {
          let d = Math.atan2(e.y - u.y, e.x - u.x) - face;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          if (Math.abs(d) > Math.PI / 2) continue;
        }
        edgeDamage(state, u, e, power, sk.radius + e.radius, !!sk.magic);
        if (sk.slow) addBuff(e, { type: "slow", v: sk.slow, until: state.t + sk.dur }, state.t);
        if (sk.slowByRank) addBuff(e, { type: "slow", v: sk.slowByRank[rr], until: state.t + (sk.slowDur || 2) }, state.t);
        if (sk.blind) addBuff(e, { type: "blind", v: 1, until: state.t + sk.blind[rr] }, state.t);
        if (sk.stunByRank) addBuff(e, { type: "stun", v: 1, until: state.t + sk.stunByRank[rr] }, state.t);
        if (u.champ.doubleTrouble) applyDamage(state, u, e, 20 + 0.3 * u.bonusAd, false);
      }
      break;
    }
    case "aoeGround": {
      // Crashing Tide — ไม่ใช่วางวงเฉยๆ แล้ว แอเรียลว่ายไปถึงจุดนั้นจริง
      // ตลอดช่วงร่าย (ซึ่งสั้นลงตามความเร็วเดิน) แล้วค่อยทุบทิ้งน้ำตกไว้
      let tx = missX, ty = missY;
      if (sk.strideTo) {
        const dd = Math.hypot(missX - u.x, missY - u.y) || 1;
        const go = Math.min(dd, sk.range);
        tx = clamp(u.x + ((missX - u.x) / dd) * go, u.radius, ARENA_W - u.radius);
        ty = clamp(u.y + ((missY - u.y) / dd) * go, u.radius, ARENA_H - u.radius);
        const walk = sk.castByMs
          ? Math.max(sk.castByMs.min, sk.castByMs.base - bonusMs(u) / sk.castByMs.per)
          : (sk.cast || 0);
        u.striding = { x0: u.x, y0: u.y, x: tx, y: ty, t0: state.t, t1: state.t + walk };
        vfx(state, { kind: "trail", x: u.x, y: u.y, x2: tx, y2: ty, color: "75,141,248", dur: walk });
        state.zones.push({ x: tx, y: ty, r: sk.radius, at: state.t + walk + sk.delay, ownerId: u.id,
          team: u.team, dmg: power, magic: !!sk.magic, skill: sk, pool: sk.pool });
        break;
      }
      state.zones.push({ x: tx, y: ty, r: sk.radius, at: state.t + sk.delay, ownerId: u.id, team: u.team, dmg: power, magic: !!sk.magic, skill: sk });
      break;
    }
    case "selfBuff": {
      const r = Math.max(0, sk.rank - 1);
      vfx(state, { kind: "aura", id: u.id, r: u.radius + 30, color: sk.shield ? "228,235,247" : "63,191,127", dur: sk.dur || 3 });
      if (sk.shield) {
        u.shield = 0;
        grantShield(u, skillHeal(u, sk) + (sk.badRatio || 0) * u.bonusAd + (sk.bonusHpRatio || 0) * u.bonusHp);
        u.buffs.push({ type: "shield", v: 1, until: state.t + (sk.durByRank ? sk.durByRank[r] : sk.dur) });
      }
      if (sk.slowImmune) { u.slowImmuneUntil = state.t + (sk.slowImmuneDur || sk.dur); }
      if (sk.flying) addBuff(u, { type: "flying", v: 1, until: state.t + (sk.durByRank ? sk.durByRank[r] : sk.dur) }, state.t);
      if (sk.asBuff) u.buffs.push({ type: "as", v: sk.asBuff[r], until: state.t + sk.dur });
      if (sk.msBuff) {
        // ความเร็วเดินมีอายุของตัวเองได้ (msDur) และค่อยๆ จางได้ (msDecay)
        const mUntil = state.t + (sk.msDur || sk.dur);
        u.buffs.push({ type: "ms", v: sk.msBuff[r], until: mUntil, decayFrom: sk.msDecay ? state.t : undefined });
      }
      if (sk.stealth && !hasBuff(u, "revealed")) {
        const sUntil = state.t + (sk.durByRank ? sk.durByRank[r] : sk.dur);
        u.buffs.push({ type: "stealth", v: 1, until: sUntil });
        // ออกจากการล่องหนเมื่อไหร่ก็ได้ความเร็วโจมตีก้อนใหญ่ (จัดการใน step.js)
        if (sk.ambushAs) u.ambush = { as: sk.ambushAs[r], dur: sk.ambushDur, until: sUntil };
      }
      // ---- ของ Patch 0.3 ----
      if (sk.drAll) addBuff(u, { type: "dr", v: sk.drAll[r], until: state.t + sk.dur }, state.t);
      if (sk.onHitMagic) {
        addBuffUnique(u, "plumage", { type: "onHitMagic", v: sk.onHitMagic[r] + (sk.onHitApRatio || 0) * u.ap,
          until: state.t + sk.dur }, state.t);
      }
      if (sk.dashFaster) u.starRush = { until: state.t + sk.dur, mul: 1 + sk.dashFaster };
      if (sk.overcharge) u.overchargeUntil = state.t + sk.dur;
      if (sk.gainStack) gainStar(state, u, sk.gainStack);
      if (sk.pet && state.lore) {
        for (const g of state.lore.pets) {
          if (g.ownerId !== u.id) continue;
          g.shield = sk.pet.shield[r] + (sk.pet.shieldAp || 0) * u.ap;
          g.msBuff = sk.pet.ms[r];
          g.as = sk.pet.as[r];
          g.buffUntil = state.t + sk.pet.dur;
          vfx(state, { kind: "ring", x: g.x, y: g.y, r: g.radius + 20, color: "232,214,120", grow: 0.8 });
        }
      }
      break;
    }
    case "targeted": {
      vfx(state, { kind: "beam", x: u.x, y: u.y, x2: target.x, y2: target.y, w: 10, color: "229,72,77" });
      let dmgOut = power;
      if (sk.upPctMaxHp && u.upgrades.includes("Q")) dmgOut += target.maxHp * sk.upPctMaxHp;
      // Flintlock Shot ติดคริและออนฮิตได้เหมือนออโต้ · คริคืนทองโจรสลัดเป็นสองเท่า
      const qCrit = !!sk.canCrit && (u.crit || 0) > 0 && u.rng() < u.crit;
      if (qCrit) dmgOut *= 1.75 + (u.critDmg || 0);
      applyDamage(state, u, target, dmgOut, !!sk.magic);
      if (sk.canOnHit) { onAutoLanded(state, u, target); marksmanOnHit(state, u, target); }
      // สเปคใหม่: Q ไม่ให้เงินจากการโดนแล้ว ให้เฉพาะตอนคริเท่านั้น
      if (qCrit && sk.bountyOnCrit) u.bountyGold += sk.bountyOnCrit;
      if (sk.shredByRank) addBuff(target, { type: "shred", v: sk.shredByRank[Math.max(0, sk.rank - 1)], until: state.t + sk.shredDur }, state.t);
      if (sk.knockback) {
        const kd = dist(u, target) || 1;
        target.x = clamp(target.x + ((target.x - u.x) / kd) * sk.knockback, target.radius, ARENA_W - target.radius);
        target.y = clamp(target.y + ((target.y - u.y) / kd) * sk.knockback, target.radius, ARENA_H - target.radius);
      }
      if (sk.root) target.buffs.push({ type: "root", v: 1, until: state.t + sk.root });
      break;
    }
    case "dash": {
      vfx(state, { kind: "trail", x: u.x, y: u.y, color: "140,190,255", pending: u.id });
      const dd = dist(u, target) || 1;
      const travel = sk.engageRange != null ? Math.max(0, Math.min(dd - u.radius, sk.range) - sk.engageRange) : Math.min(dd - u.radius, sk.range);
      u.x += ((target.x - u.x) / dd) * travel;
      u.y += ((target.y - u.y) / dd) * travel;
      applyDamage(state, u, target, power, !!sk.magic);
      // สตันตัวแรกที่พุ่งชน — บางตัวเขียนเป็นค่าเดียว บางตัวไล่ตามแรงก์ (NIAN Q)
      const landStun = sk.landStunByRank ? sk.landStunByRank[Math.max(0, (sk.rank || 1) - 1)] : sk.landStun;
      if (landStun) addBuff(target, { type: "stun", v: 1, until: state.t + landStun }, state.t);
      if (sk.shredByRank) addBuff(target, { type: "shred", v: sk.shredByRank[Math.max(0, sk.rank - 1)], until: state.t + sk.shredDur }, state.t);
      break;
    }
    case "leap": {
      vfx(state, { kind: "trail", x: u.x, y: u.y, color: "140,190,255", pending: u.id });
      const es = enemiesOf(state, u);
      if (!es.length) break;
      let bx = 0, by = 0;
      for (const e of es) { bx += e.x; by += e.y; }
      bx /= es.length; by /= es.length;
      u.x = clamp(bx, u.radius, ARENA_W - u.radius);
      u.y = clamp(by, u.radius, ARENA_H - u.radius);
      for (const e of es) if (dist(u, e) <= sk.radius + e.radius) applyDamage(state, u, e, power, !!sk.magic);
      break;
    }
    case "blink": {
      vfx(state, { kind: "trail", x: u.x, y: u.y, color: "176,140,255", pending: u.id });
      const es = enemiesOf(state, u);
      let nx = 0, ny = 0;
      for (const e of es) { const dd = dist(u, e) || 1; nx += (u.x - e.x) / dd; ny += (u.y - e.y) / dd; }
      const l = Math.hypot(nx, ny) || 1;
      u.x = clamp(u.x + (nx / l) * sk.range, u.radius, ARENA_W - u.radius);
      u.y = clamp(u.y + (ny / l) * sk.range, u.radius, ARENA_H - u.radius);
      break;
    }
    case "hop": {
      const rEff = sk.radius + (u.skillRangeBoost || 0);
      for (const e of enemiesOf(state, u)) {
        if (dist(u, e) <= rEff + e.radius) {
          edgeDamage(state, u, e, power, sk.radius + e.radius, !!sk.magic);
          if (sk.slow) e.buffs.push({ type: "slow", v: sk.slow, until: state.t + sk.dur });
        }
      }
      const dd = dist(u, target) || 1;
      u.x = clamp(u.x - ((target.x - u.x) / dd) * sk.range, u.radius, ARENA_W - u.radius);
      u.y = clamp(u.y - ((target.y - u.y) / dd) * sk.range, u.radius, ARENA_H - u.radius);
      break;
    }
    case "snipe": {
      vfx(state, { kind: "beam", x: u.x, y: u.y, x2: target.x, y2: target.y, w: 4, color: "232,163,61", dur: sk.windup });
      state.snipes.push({ ownerId: u.id, targetId: target.id, at: state.t + sk.windup, dmg: power, magic: !!sk.magic, range: sk.range });
      break;
    }
    case "allyShield": {
      const pool = alliesOf(state, u).filter((a) => dist(u, a) <= sk.range);
      if (!pool.length) break;
      const a = pool.reduce((x, y) => (y.hp / y.maxHp < x.hp / x.maxHp ? y : x));
      grantShield(a, skillHeal(u, sk));
      a.buffs.push({ type: "shield", v: 1, until: state.t + sk.dur });
      vfx(state, { kind: "beam", x: u.x, y: u.y, x2: a.x, y2: a.y, w: 6, color: "228,235,247" });
      vfx(state, { kind: "aura", id: a.id, r: a.radius + 26, color: "228,235,247", dur: sk.dur });
      break;
    }
    case "teamBuff": {
      const r = Math.max(0, sk.rank - 1);
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: sk.radius, color: "63,191,127", grow: 0.6, dur: 0.6 });
      for (const a of alliesOf(state, u)) {
        if (dist(u, a) <= sk.radius) a.buffs.push({ type: "ms", v: sk.msBuff[r], until: state.t + sk.dur });
      }
      break;
    }
    case "onHit": {
      if (sk.asBuff) addBuff(u, { type: "as", v: sk.asBuff[Math.max(0, sk.rank - 1)], until: state.t + (sk.buffDur || 5) }, state.t);
      vfx(state, { kind: "aura", id: u.id, r: u.radius + 18, color: "255,208,138", dur: sk.window || 6 });
      u.onHit = { skill: sk, charges: sk.charges || 2, until: state.t + (sk.window || 6) };
      break;
    }
    case "cone": {
      const coneAng = Math.atan2(target.y - u.y, target.x - u.x);
      const coneHalf = ((sk.angle || 45) * Math.PI) / 180 / 2;
      vfx(state, { kind: "cone", x: u.x, y: u.y, r: sk.range, ang: coneAng, half: coneHalf, color: "255,208,138" });
      // ผงเครื่องเทศต้องฟุ้งเป็นกลุ่มควัน ไม่ใช่กรวยทึบก้อนเดียว (PIROSKA Q)
      if (sk.atkCut) {
        vfx(state, { kind: "powder", x: u.x, y: u.y, r: sk.range, ang: coneAng, half: coneHalf,
          color: "232,140,72", dur: 0.9 });
      }
      // fragments spread over a cone; extra fragments on the same body fall off hard
      const hits = {};
      const baseAng = Math.atan2(target.y - u.y, target.x - u.x);
      const half = ((sk.angle || 45) * Math.PI) / 180 / 2;
      const n = sk.count || 5;
      for (let i = 0; i < n; i++) {
        const a = baseAng + (n === 1 ? 0 : -half + (2 * half * i) / (n - 1));
        // find the first enemy within the cone along this fragment's line
        let best = null, bestD = Infinity;
        for (const e of enemiesOf(state, u)) {
          const dd = dist(u, e);
          if (dd > sk.range) continue;
          const ea = Math.atan2(e.y - u.y, e.x - u.x);
          let diff = Math.abs(((ea - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (diff * dd > e.radius + 40) continue;
          if (dd < bestD) { bestD = dd; best = e; }
        }
        if (!best) continue;
        hits[best.id] = (hits[best.id] || 0) + 1;
        const mult = hits[best.id] === 1 ? 1 : (sk.falloff != null ? sk.falloff : 0.5);
        applyDamage(state, u, best, power * mult, !!sk.magic);
        if (sk.slow && hits[best.id] === 1) {
          best.buffs.push({ type: "slow", v: sk.slow[Math.max(0, sk.rank - 1)], until: state.t + sk.dur });
        }
        // ผงพริกไทยของ PIROSKA — แสบตาจนตีเบาลงทั้งกายภาพและเวท ไม่ใช่แค่เดินช้า
        if (sk.atkCut && hits[best.id] === 1) {
          const cut = sk.atkCut[Math.max(0, sk.rank - 1)];
          addBuff(best, { type: "ad", v: -cut, until: state.t + sk.dur }, state.t);
          addBuff(best, { type: "apPct", v: -cut, until: state.t + sk.dur }, state.t);
        }
      }
      break;
    }
    case "chargeDash": {
      u.charging = { skill: sk, start: state.t, target: target.id, prec };
      u.buffs.push({ type: "slow", v: sk.selfSlow || 0.3, until: state.t + (sk.maxCharge || 3) + 0.1 });
      break;
    }
    case "grabSlam": {
      if (dist(u, target) <= sk.grabRange + target.radius) startGrab(state, u, sk, target);
      else {
        // สเปคใหม่: ไม่ถึงตัวก็พุ่งเข้าไปหาเลยด้วยความเร็ว 1000 ไม่ใช่เดินไล่เฉยๆ
        u.chasing = { targetId: target.id, until: state.t + sk.lockTime, skill: sk,
          lungeSpeed: sk.lungeSpeed || 0, lungeLeft: sk.lungeRange || 0 };
        if (sk.lungeSpeed) vfx(state, { kind: "trail", x: u.x, y: u.y, color: "255,208,138", pending: u.id });
      }
      break;
    }
    case "shredWave": {
      const r = Math.max(0, sk.rank - 1);
      for (const e of enemiesOf(state, u)) {
        if (dist(u, e) > sk.radiusByRank[r] + e.radius) continue;
        applyDamage(state, u, e, power, !!sk.magic);
        e.buffs.push({ type: "shred", v: sk.shred[r], until: state.t + sk.dur });
        e.buffs.push({ type: "slow", v: sk.slow, until: state.t + sk.dur });
      }
      break;
    }
    case "reveal": {
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: sk.radius, color: "232,163,61", grow: 0.7, dur: 0.7 });
      for (const e of enemiesOf(state, u)) {
        if (dist(u, e) > sk.radius) continue;
        e.buffs = e.buffs.filter((b) => b.type !== "stealth");
        e.buffs.push({ type: "revealed", v: 1, until: state.t + sk.revealDur });
      }
      break;
    }
    case "snipeCharge": {
      u.charging = { skill: sk, start: state.t, target: target.id, snipe: true };
      u.buffs.push({ type: "root", v: 1, until: state.t + sk.windup + 0.05 });
      break;
    }
    case "pulse": {
      vfx(state, { kind: "aura", id: u.id, r: sk.radius, color: "176,140,255", dur: sk.dur });
      addBuff(u, { type: "invuln", v: 1, until: state.t + sk.dur }, state.t);
      addBuff(u, { type: "untargetable", v: 1, until: state.t + sk.dur }, state.t);
      for (let i = 1; i <= sk.hits; i++) {
        state.pulses.push({ ownerId: u.id, at: state.t + sk.every * i, radius: sk.radius, dmg: power, skill: sk });
      }
      break;
    }
    case "burstShield": {
      vfx(state, { kind: "aura", id: u.id, r: u.radius + 34, color: "228,235,247", dur: sk.dur });
      const amt = skillHeal(u, sk) + (sk.badRatio || 0) * u.bonusAd;
      grantShield(u, amt);
      addBuff(u, { type: "shield", v: 1, until: state.t + sk.dur }, state.t);
      u.pendingBurst = { at: state.t + sk.dur, amt, radius: sk.radius, burstPct: sk.burstPct, healPct: sk.healPct };
      break;
    }
    case "blinkDash": {
      const dd = dist(u, target) || 1;
      u.x = clamp(u.x + ((target.x - u.x) / dd) * sk.range, u.radius, ARENA_W - u.radius);
      u.y = clamp(u.y + ((target.y - u.y) / dd) * sk.range, u.radius, ARENA_H - u.radius);
      addBuff(u, { type: "evade", v: 1, until: state.t + sk.evade }, state.t);
      break;
    }
    case "absorbReflect": {
      // สเปคใหม่: ไม่ได้รอกินดาเมจสดอย่างเดียวแล้ว — เอาดาเมจที่ทีมกินไปเมื่อ 3 วิก่อนหน้ามาเป็นทุน
      if (sk.oncePerFight) u.paradiseUsed = true;
      vfx(state, { kind: "aura", id: u.id, r: 180, color: "255,255,255", dur: sk.dur });
      addBuff(u, { type: "invuln", v: 1, until: state.t + sk.dur }, state.t);
      u.absorb = { dmg: recentTaken(u, state.t, sk.lookback || 0), until: state.t + sk.dur, skill: sk };
      break;
    }
    case "blinkBehind": {
      vfx(state, { kind: "trail", x: u.x, y: u.y, color: "255,143,208", pending: u.id });
      const dd = dist(u, target) || 1;
      const back = sk.behind || 90;
      u.x = clamp(target.x + ((target.x - u.x) / dd) * back, u.radius, ARENA_W - u.radius);
      u.y = clamp(target.y + ((target.y - u.y) / dd) * back, u.radius, ARENA_H - u.radius);
      // แบบเดิม (Double Cross) ติดพลังให้ออโต้ครั้งถัดไป · แบบใหม่ (PUSS Q) แทงทันที
      if (sk.empower) u.empower = sk.empower[Math.max(0, sk.rank - 1)] + (sk.baseAdRatio || 0) * (u.ad - u.bonusAd);
      if (sk.dmg) {
        applyDamage(state, u, target, power, !!sk.magic);
        // แทงจากข้างหลังเสมอ เลยติดสโลว์ทุกครั้งที่โดน
        if (sk.backSlow) addBuff(target, { type: "slow", v: sk.backSlow, until: state.t + (sk.backSlowDur || 1.5) }, state.t);
      }
      break;
    }
    case "tether": {
      state.tethers.push({ ownerId: u.id, targetId: target.id, at: state.t + sk.link, skill: sk, second: null });
      applyDamage(state, u, target, power, true);
      addBuff(target, { type: "slow", v: sk.slow, until: state.t + sk.slowDur }, state.t);
      u.tetherWindow = { until: state.t + sk.link + sk.recast, skill: sk };
      break;
    }
    case "trap": {
      const dd = dist(u, target) || 1;
      const tx = u.x + ((target.x - u.x) / dd) * Math.min(dd, sk.range);
      const ty = u.y + ((target.y - u.y) / dd) * Math.min(dd, sk.range);
      state.traps.push({ ownerId: u.id, team: u.team, x: tx, y: ty, r: sk.radius, until: state.t + sk.life, skill: sk, dmg: power });
      break;
    }
    case "cloneBlink": {
      vfx(state, { kind: "trail", x: u.x, y: u.y, color: "255,143,208", pending: u.id });
      state.clones.push({ ownerId: u.id, team: u.team, x: u.x, y: u.y, at: state.t + sk.delay, r: sk.radius, dmg: power, magic: !!sk.magic });
      const dd = dist(u, target) || 1;
      u.x = clamp(u.x + ((target.x - u.x) / dd) * Math.min(dd, sk.range), u.radius, ARENA_W - u.radius);
      u.y = clamp(u.y + ((target.y - u.y) / dd) * Math.min(dd, sk.range), u.radius, ARENA_H - u.radius);
      break;
    }
    case "volley": {
      vfx(state, { kind: "aura", id: u.id, r: u.radius + 26, color: "255,143,208", dur: sk.windup });
      for (let i = 0; i < sk.count; i++) {
        state.volleys.push({ ownerId: u.id, targetId: target.id, at: state.t + sk.windup + sk.gap * i, skill: sk, dmg: power, idx: i });
      }
      addBuff(u, { type: "root", v: 1, until: state.t + sk.windup + 0.05 }, state.t);
      break;
    }
    case "formShift": {
      const r = Math.max(0, sk.rank - 1);
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: sk.enterRadius, color: "255,143,208", grow: 1, dur: 0.6 });
      const which = u.rng() < 0.5 ? "BLUE" : "PINK";
      const form = u.champ.forms[which];
      u.form = which;
      u.formUntil = state.t + sk.durByRank[r];
      u.formSkills = form.skills.map((fs) => ({ ...fs, rank: sk.rank, cdLeft: 0 }));
      u.range = form.range;
      if (form.msPct) addBuff(u, { type: "ms", v: form.msPct, until: u.formUntil }, state.t);
      for (const e of enemiesOf(state, u)) {
        if (dist(u, e) > sk.enterRadius + e.radius) continue;
        applyDamage(state, u, e, sk.enterDmg[r] + sk.enterAdRatio * u.ad, false);
        addBuff(e, { type: "antiheal", v: sk.antiheal, until: state.t + sk.antihealDur }, state.t);
      }
      pushLog(state, tr(
        "{0} {1} แปลงร่าง {2}",
        u.team === "blue" ? "🔵" : "🔴",
        tr(u.champ.th),
        form.th
      ));
      break;
    }
    case "submerge": {
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 40, color: "75,141,248", grow: 1, dur: 0.5 });
      const dur = sk.submergeFixed != null
        ? sk.submergeFixed
        : Math.max(sk.submerge.min, sk.submerge.base - (u.apMs || 0) / sk.submerge.per);
      const dd = dist(u, target) || 1;
      const tx = u.x + ((target.x - u.x) / dd) * Math.min(dd, sk.range);
      const ty = u.y + ((target.y - u.y) / dd) * Math.min(dd, sk.range);
      addBuff(u, { type: "untargetable", v: 1, until: state.t + dur }, state.t);
      addBuff(u, { type: "invuln", v: 1, until: state.t + dur }, state.t);
      // ลอยฟ้านานขึ้นตามความเร็วเดินส่วนเกิน (รองเท้าก็นับ) จาก 0.5 วิ ยืดได้ถึง 1.5 วิ
      const kn = sk.knockupPerMs
        ? Math.min(sk.knockupCap, sk.knockup + bonusMs(u) * sk.knockupPerMs)
        : sk.knockupPerApMs
          ? Math.min(sk.knockupCap, sk.knockup + ((u.apMs || 0) / 100) * sk.knockupPerApMs)
          : sk.knockup;
      state.submerges.push({ ownerId: u.id, at: state.t + dur, x: tx, y: ty, r: sk.radius, dmg: power,
        knockup: kn, magic: !!sk.magic, surfaceDelay: sk.surfaceDelay || 0 });
      break;
    }
    case "wave": {
      const dd = dist(u, target) || 1;
      const nx = (target.x - u.x) / dd, ny = (target.y - u.y) / dd;
      // ความเร็วเดินส่วนเกินทำให้คลื่นใหญ่ขึ้น ไกลขึ้น และเร็วขึ้น (ไม่ใช่แรงขึ้น)
      const ms = sk.msScale ? bonusMs(u) : 0;
      const sc = sk.msScale || {};
      const spd = Math.min(sk.speedMax || sk.speed, sk.speed + (u.apMs || 0) * 2) + ms * (sc.speed || 0);
      const halfW = (sk.width + ms * (sc.width || 0)) / 2;
      const reach = sk.range + ms * (sc.range || 0);
      const r = Math.max(0, sk.rank - 1);
      state.waves.push({
        ownerId: u.id, team: u.team, x: u.x, y: u.y, nx, ny, speed: spd,
        left: reach, span: reach, halfW, dmg: power, magic: !!sk.magic,
        knockup: sk.knockupByRank ? sk.knockupByRank[r] : 0, hitIds: [], skill: sk, rank: r,
        startX: u.x, startY: u.y,
      });
      break;
    }
    case "crossDash": {
      vfx(state, { kind: "trail", x: u.x, y: u.y, color: "229,72,77", pending: u.id });
      const ang0 = Math.atan2(target.y - u.y, target.x - u.x);
      const miss0 = (u.rng() * 2 - 1) * Math.pow((10 - prec) / 10, 1.1) * 260;
      const d0 = dist(u, target) || 1;
      const ang = ang0 + Math.atan2(miss0, d0);
      u.dashing = {
        dx: Math.cos(ang), dy: Math.sin(ang), left: sk.dashRange, sk, frac: 1,
        hitIds: [], cross: { ang, at: null },
      };
      break;
    }
    case "skyfall": {
      vfx(state, { kind: "trail", x: u.x, y: u.y, color: "229,72,77", pending: u.id });
      const dd = dist(u, target) || 1;
      const tx = u.x + ((target.x - u.x) / dd) * Math.min(dd, sk.range);
      const ty = u.y + ((target.y - u.y) / dd) * Math.min(dd, sk.range);
      addBuff(u, { type: "untargetable", v: 1, until: state.t + sk.airTime }, state.t);
      addBuff(u, { type: "invuln", v: 1, until: state.t + sk.airTime }, state.t);
      state.submerges.push({ ownerId: u.id, at: state.t + sk.airTime, x: tx, y: ty,
        r: sk.radius, dmg: power, knockup: sk.knockup, magic: false, edgeBase: sk.radius,
        landSlow: sk.landSlow, landSlowDur: sk.landSlowDur });
      break;
    }
    case "mistform": {
      const r = Math.max(0, sk.rank - 1);
      if (u.bloodStorm) {
        // ร่างอัลติ — W กลายเป็นวาประยะสั้น ใช้กระโดดเกาะเป้าให้อยู่ในวงดูดเลือด
        const dd = dist(u, target) || 1;
        const go = Math.min(dd, sk.blinkRange);
        vfx(state, { kind: "trail", x: u.x, y: u.y, color: "214,60,90", pending: u.id });
        u.x = clamp(u.x + ((target.x - u.x) / dd) * go, 20, ARENA_W - 20);
        u.y = clamp(u.y + ((target.y - u.y) / dd) * go, 20, ARENA_H - 20);
        vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 26, color: "214,60,90", grow: 0.9 });
      } else {
        vfx(state, { kind: "aura", id: u.id, r: u.radius + 30, color: "214,60,90", dur: sk.dur });
        addBuff(u, { type: "ms", v: sk.msBuff[r], until: state.t + sk.dur }, state.t);
        if (sk.ghost) addBuff(u, { type: "ghost", v: 1, until: state.t + sk.dur }, state.t);
      }
      break;
    }
    case "bloodStorm": {
      startBloodStorm(state, u, sk);
      break;
    }
    case "vampForm": {
      const r = Math.max(0, sk.rank - 1);
      vfx(state, { kind: "aura", id: u.id, r: u.radius + 40, color: "229,72,77", dur: sk.dur });
      addBuff(u, { type: "ad", v: sk.adPct[r], until: state.t + sk.dur }, state.t);
      addBuff(u, { type: "ms", v: sk.msPct[r], until: state.t + sk.dur }, state.t);
      addBuff(u, { type: "vampform", v: 1, until: state.t + sk.dur }, state.t);
      u.vampSkill = sk;
      u.vampKills = u.kills;
      pushLog(state, tr("{0} {1} เข้าร่างแวมไพร์", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
      break;
    }
    case "markNext": {
      target.mark = { ownerId: u.id, until: state.t + sk.markDur, sk };
      vfx(state, { kind: "aura", id: target.id, r: target.radius + 24, color: "232,163,61", dur: sk.markDur });
      break;
    }
    case "barrage": {
      const dd = dist(u, target) || 1;
      const nx = (target.x - u.x) / dd, ny = (target.y - u.y) / dd;
      const cx = u.x + nx * Math.min(dd, sk.range);
      const cy = u.y + ny * Math.min(dd, sk.range);
      const impactDelay = 0.75;
      // อัพเกรดแล้วยังเป็นลูกเดียว แต่วงกว้างขึ้น และโดนใครก็ได้ความเร็วเดินที่ค่อยๆ จาง
      const up = u.upgrades.includes("E");
      const rad = up ? sk.upRadius : sk.radius;
      // สเปคใหม่: ไม่มีโล่แล้ว — เพื่อนที่ยืนในวงตอนกระสุนลงได้ความเร็วเดินที่ค่อยๆ จาง
      state.zones.push({ x: cx, y: cy, r: rad, at: state.t + impactDelay,
        ownerId: u.id, team: u.team, dmg: power, magic: false, skill: sk,
        allyMs: sk.allyMs || 0, allyMsDur: sk.allyMsDur });
      vfx(state, { kind: "ring", x: cx, y: cy, r: rad, color: "232,163,61", dur: impactDelay });
      // ส่วนตัวคนยิงได้ความเร็วเดินทันทีที่กด ไม่ต้องรอให้กระสุนลง
      if (sk.selfMs) {
        addBuff(u, { type: "ms", v: sk.selfMs, decayFrom: state.t, until: state.t + (sk.selfDur || 3) }, state.t);
        vfx(state, { kind: "aura", id: u.id, r: u.radius + 26, color: "232,163,61", dur: sk.selfDur || 3 });
      }
      break;
    }
    case "globalStrike": {
      const up = u.upgrades.includes("R");
      const r = up ? sk.upRadius : sk.radius;
      const delay = up ? sk.upDelay : sk.delay;
      state.zones.push({ x: target.x, y: target.y, r, at: state.t + delay, ownerId: u.id, team: u.team,
        dmg: power, magic: false, skill: sk, knockup: sk.knockup });
      vfx(state, { kind: "ring", x: target.x, y: target.y, r, color: "229,72,77", dur: delay });
      break;
    }
    case "lastStand": {
      // สเปคใหม่: กดเองไม่ได้ — มันทำงานเองตอนดาเมจจะฆ่า (engine/kazem.js: lastStandCatch)
      if (sk.onDeath) break;
      const r = Math.max(0, sk.rank - 1);
      u.hp = u.maxHp;
      u.lastStand = { until: state.t + 99, drain: sk.drain };
      addBuff(u, { type: "as", v: sk.asBuff[r], until: state.t + 99 }, state.t);
      addBuff(u, { type: "ad", v: sk.adBuff[r], until: state.t + 99 }, state.t);
      addBuff(u, { type: "ms", v: sk.msBuff[r], until: state.t + 99 }, state.t);
      u.lastStandKills = u.kills;
      vfx(state, { kind: "aura", id: u.id, r: u.radius + 44, color: "229,72,77", dur: 8 });
      pushLog(state, tr("{0} {1} ไม่ยอมล้ม", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
      break;
    }
    case "teaGarden": {
      castTeaGarden(state, u, sk, missX, missY);
      break;
    }
    case "allyBlink": {
      castAllyBlink(state, u, sk);
      break;
    }
    case "wonderland": {
      castWonderland(state, u, sk, missX, missY);
      break;
    }
    case "guardBurst": {
      castGuardBurst(state, u, sk);
      break;
    }
    case "dismissal": {
      castDismissal(state, u, sk, target);
      break;
    }
    case "rangeCharge": {
      // ชาร์จเพื่อเพิ่ม "ระยะ" ไม่ใช่ดาเมจ — ระหว่างชาร์จเดินช้าลง แต่ยังเดินได้
      u.charging = { skill: sk, start: state.t, target: target.id, rangeCharge: true, prec };
      break;
    }
    case "coneKnock": {
      const baseAng = Math.atan2(target.y - u.y, target.x - u.x);
      const half = ((sk.angle || 60) * Math.PI) / 180 / 2;
      vfx(state, { kind: "cone", x: u.x, y: u.y, r: sk.range, ang: baseAng, half, color: "176,140,255" });
      for (const e of enemiesOf(state, u)) {
        const dd = dist(u, e);
        if (dd > sk.range + e.radius) continue;
        const ea = Math.atan2(e.y - u.y, e.x - u.x);
        const diff = Math.abs(((ea - baseAng + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (diff > half) continue;
        applyDamage(state, u, e, power, !!sk.magic);
        // ผลักถอยหลัง + สตันสั้นๆ และตัดจังหวะพุ่งที่กำลังวิ่งอยู่
        const kd = dd || 1;
        e.x = clamp(e.x + ((e.x - u.x) / kd) * sk.knockback, e.radius, ARENA_W - e.radius);
        e.y = clamp(e.y + ((e.y - u.y) / kd) * sk.knockback, e.radius, ARENA_H - e.radius);
        if (sk.interrupt) { e.dashing = null; e.charging = null; e.grabbing = null; }
        addBuff(e, { type: "stun", v: 1, until: state.t + (sk.stun || 0.35) }, state.t);
        // เส้นลากบอกว่าถูกผลักจากไหนไปไหน
        vfx(state, { kind: "trail", x: e.x - ((e.x - u.x) / kd) * sk.knockback, y: e.y - ((e.y - u.y) / kd) * sk.knockback,
          x2: e.x, y2: e.y, color: "176,140,255", dur: 0.45 });
      }
      break;
    }
    case "meteorStorm": {
      // ตรึงตัวเองแล้วเรียกอุกกาบาตใส่ตำแหน่งศัตรูทุกคนเป็นระลอก
      const r = Math.max(0, sk.rank - 1);
      u.channeling = { skill: sk, left: sk.waves[r], next: state.t, range: sk.rangeByRank[r] };
      pushLog(state, tr("{0} {1} เปิดประตูมิติ", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
      break;
    }
    case "chargedBeam": {
      u.charging = { skill: sk, start: state.t, target: target.id, beam: true, prec };
      break;
    }
    case "teamHeal": {
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: sk.radius, color: "63,191,127", grow: 0.8, dur: 0.8 });
      const amount = skillHeal(u, sk);
      for (const a of alliesOf(state, u)) {
        if (dist(u, a) > sk.radius) continue;
        healUnit(state, a, amount);
        if (sk.cleanse) a.buffs = a.buffs.filter((b) => !["stun", "root", "slow", "fear", "blind"].includes(b.type));
        if (sk.tenacity) addBuff(a, { type: "tenacity", v: sk.tenacity, until: state.t + sk.tenacityDur }, state.t);
      }
      break;
    }
    case "allyHot": {
      const pool = alliesOf(state, u).filter((a) => dist(u, a) <= sk.range);
      if (!pool.length) break;
      const a = pool.reduce((x, y) => (y.hp / y.maxHp < x.hp / x.maxHp ? y : x));
      const total = skillHeal(u, sk);
      const old = state.hots.find((h) => h.targetId === a.id && h.ownerId === u.id);
      if (old) { old.until = state.t + sk.dur; old.hps = total / sk.dur; }
      else state.hots.push({ targetId: a.id, ownerId: u.id, hps: total / sk.dur, until: state.t + sk.dur });
      vfx(state, { kind: "beam", x: u.x, y: u.y, x2: a.x, y2: a.y, w: 6, color: "63,191,127" });
      vfx(state, { kind: "aura", id: a.id, r: a.radius + 22, color: "63,191,127", dur: sk.dur });
      break;
    }
    case "cage": {
      const dd = dist(u, target) || 1;
      const cx = u.x + ((target.x - u.x) / dd) * Math.min(dd, sk.range);
      const cy = u.y + ((target.y - u.y) / dd) * Math.min(dd, sk.range);
      state.cages.push({
        ownerId: u.id, team: u.team, x: cx, y: cy, r: sk.radius, thick: sk.thickness,
        at: state.t + sk.delay, until: state.t + sk.delay + sk.life,
        hp: sk.hp[Math.max(0, sk.rank - 1)], breakSlow: sk.breakSlow, breakSlowDur: sk.breakSlowDur,
        allyPass: !!sk.allyPass,
      });
      break;
    }
    default: {
      // ท่าของตัวละคร Patch 0.3 อยู่ใน engine/lore.js
      fireLoreSkill(state, u, sk, target, prec, { missX, missY, ang });
      break;
    }
  }
}
