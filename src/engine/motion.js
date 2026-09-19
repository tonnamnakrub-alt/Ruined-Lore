import { tr } from "../i18n.js";
import { ARENA_H, ARENA_W } from "../data/constants.js";
import { applyDamage, edgeDamage, skillPower } from "./damage.js";
import { addBuff, dist, pushLog, skillLabel, vfx } from "./state-util.js";
import { DT } from "./step.js";
import { enemiesOf } from "./targeting.js";
import { clamp } from "./util.js";


export function startGrab(state, u, sk, target) {
  u.x = clamp(target.x - (target.x - u.x) * 0.15, u.radius, ARENA_W - u.radius);
  u.y = clamp(target.y - (target.y - u.y) * 0.15, u.radius, ARENA_H - u.radius);
  target.buffs.push({ type: "stun", v: 1, until: state.t + sk.airborne });
  u.castLock = sk.airborne;
  state.grabs.push({ ownerId: u.id, targetId: target.id, at: state.t + sk.airborne, skill: sk });
  pushLog(state, tr(
    "{0} {1} จับ {2} ยกขึ้นกลางอากาศ",
    u.team === "blue" ? "🔵" : "🔴",
    tr(u.champ.th),
    tr(target.champ.th)
  ));
}


export function tickGrabs(state) {
  state.grabs = state.grabs.filter((g) => {
    if (state.t < g.at) return true;
    const u = state.units.find((x) => x.id === g.ownerId);
    const t = state.units.find((x) => x.id === g.targetId);
    if (!u || !u.alive) return false;
    const sk = g.skill;
    const r = Math.max(0, sk.rank - 1);
    const power = skillPower(u, sk, t);
    for (const e of enemiesOf(state, u)) {
      if (dist(u, e) > sk.radiusByRank[r] + e.radius) continue;
      // the champion who got slammed eats a % max HP bonus and loses resistances
      const isSlammed = t && e.id === t.id;
      const extra = isSlammed && sk.slamPctMaxHp ? e.maxHp * sk.slamPctMaxHp[r] : 0;
      state.dmgSrc = skillLabel(u, sk);
    applyDamage(state, u, e, power + extra, !!sk.magic);
      e.buffs.push({ type: "slow", v: sk.slow, until: state.t + sk.dur });
      if (isSlammed) e.buffs.push({ type: "shred", v: sk.shred[r], until: state.t + sk.dur });
    }
    state.fx.push({ x: u.x, y: u.y, t: state.t, kind: "hit", size: sk.radiusByRank[r] });
    return false;
  });
}


export function fireSnipe(state, u, sk, tgt) {
  if (!tgt || !tgt.alive) return;
  const d = dist(u, tgt);
  const bonus = 1 + Math.min(1, d / sk.rangeBonusAt) * sk.rangeBonusMax;
  let dmg = skillPower(u, sk, tgt) * bonus;
  const rev = u.champ.revolver;
  if (rev) {
    u.shotsFired += 1;
    if (u.shotsFired % rev.shots === 0) { dmg *= rev.mult; u.reloadUntil = state.t + rev.reload; }
  }
  const ang = Math.atan2(tgt.y - u.y, tgt.x - u.x);
  state.projectiles.push({
    id: state.nextProjId++, team: u.team, ownerId: u.id, skill: sk,
    x: u.x, y: u.y, dx: Math.cos(ang), dy: Math.sin(ang),
    speed: 3200, dmg, width: sk.width, pierce: false,
    life: sk.range / 3200, hitIds: [],
  });
  pushLog(state, tr(
    "{0} {1} ยิงสไนป์ระยะ {2} (×{3})",
    u.team === "blue" ? "🔵" : "🔴",
    tr(u.champ.th),
    Math.round(d),
    bonus.toFixed(2)
  ));
}


export function resolveDash(state, u, sk, tgt, frac, prec) {
  // aimed, not homing — a sloppy charge lands beside the target and hits nothing
  let ang = tgt ? Math.atan2(tgt.y - u.y, tgt.x - u.x) : 0;
  if (tgt) {
    const d0 = dist(u, tgt) || 1;
    const miss = (u.rng() * 2 - 1) * Math.pow((10 - (prec != null ? prec : 6)) / 10, 1.1) * 340;
    ang += Math.atan2(miss, d0);
  }
  u.dashing = { dx: Math.cos(ang), dy: Math.sin(ang), left: sk.dashRange, sk, frac, hitIds: [] };
  if (sk.unstoppable) addBuff(u, { type: "unstoppable", v: 1, until: state.t + 1.2 }, state.t);
}


export function tickDashes(state) {
  const dt = DT;
  for (const u of state.units) {
    if (!u.alive || !u.dashing) continue;
    const dsh = u.dashing;
    const sk = dsh.sk;
    const stepLen = Math.min((sk.dashSpeed || 400) * dt, dsh.left);
    u.x = clamp(u.x + dsh.dx * stepLen, u.radius, ARENA_W - u.radius);
    u.y = clamp(u.y + dsh.dy * stepLen, u.radius, ARENA_H - u.radius);
    dsh.left -= stepLen;
    for (const e of enemiesOf(state, u)) {
      if (dist(u, e) > e.radius + (sk.radius ? sk.radius * 0.5 : u.radius)) continue;
      if (dsh.hitIds.includes(e.id)) continue;
      dsh.hitIds.push(e.id);
      if (sk.unstoppable || sk.drag) {
        state.dmgSrc = skillLabel(u, sk);
    applyDamage(state, u, e, skillPower(u, sk, e), !!sk.magic);
        if (sk.drag) { e.dragBy = u.id; }
      }
    }
    if (sk.drag) {
      for (const e of state.units) {
        if (e.dragBy !== u.id || !e.alive) continue;
        e.x = clamp(e.x + dsh.dx * stepLen, e.radius, ARENA_W - e.radius);
        e.y = clamp(e.y + dsh.dy * stepLen, e.radius, ARENA_H - e.radius);
      }
    }
    if (dsh.cross) {
      const halfW = (sk.armWidth || 130) / 2;
      for (const e of enemiesOf(state, u)) {
        if (dsh.hitIds.includes(e.id)) continue;
        // perpendicular distance to the dash line, so it hits as a straight beam
        const rx = e.x - u.x, ry = e.y - u.y;
        if (Math.abs(rx * -dsh.dy + ry * dsh.dx) > halfW + e.radius) continue;
        if (Math.abs(rx * dsh.dx + ry * dsh.dy) > halfW + e.radius) continue;
        dsh.hitIds.push(e.id);
        state.dmgSrc = skillLabel(u, sk);
        edgeDamage(state, u, e, skillPower(u, sk, e), halfW + e.radius, false);
      }
      if (dsh.left <= 0) {
        u.dashing = null;
        vfx(state, { kind: "beam", x: u.x - dsh.dx * sk.dashRange, y: u.y - dsh.dy * sk.dashRange,
          x2: u.x, y2: u.y, w: sk.armWidth / 2, color: "229,72,77", dur: 0.6 });
        state.crosses.push({ ownerId: u.id, at: state.t + sk.pauseAt, ang: dsh.cross.ang, sk });
        addBuff(u, { type: "root", v: 1, until: state.t + sk.pauseAt }, state.t);
        continue;
      }
      continue;
    }
    // ---- TOTSAKAN W · ชนตัวแรกแล้วจับเหวี่ยงข้ามหัวไปด้านหลัง
    if (dsh.fling) {
      const grabbed = enemiesOf(state, u).find((e) => dist(u, e) <= e.radius + u.radius + 30);
      if (grabbed || dsh.left <= 0) {
        u.dashing = null;
        if (grabbed) {
          state.dmgSrc = skillLabel(u, sk);
          applyDamage(state, u, grabbed, dsh.fling.dmg, false);
          state.dmgSrc = null;
          addBuff(grabbed, { type: "stun", v: 1, until: state.t + sk.airborne }, state.t);
          grabbed.x = clamp(u.x - dsh.dx * dsh.fling.toss, grabbed.radius, ARENA_W - grabbed.radius);
          grabbed.y = clamp(u.y - dsh.dy * dsh.fling.toss, grabbed.radius, ARENA_H - grabbed.radius);
          vfx(state, { kind: "trail", x: u.x, y: u.y, x2: grabbed.x, y2: grabbed.y, color: "255,208,138", dur: 0.45 });
          // จับโดนแล้ว ออโต้ 3 ครั้งถัดไปเร็วขึ้นและแรงขึ้น
          addBuff(u, { type: "as", v: sk.asBuff, until: state.t + sk.window }, state.t);
          u.onHit = { skill: { ...sk, dmg: sk.hitDmg, adRatio: sk.hitAdRatio, selfBonusHp: sk.hitBonusHp, badRatio: 0, apRatio: 0 },
            charges: sk.charges, until: state.t + sk.window };
        }
      }
      continue;
    }
    // ---- H.S.B E · พุ่งทะลุคน ชนกำแพงเมื่อไหร่ระเบิดกระแทกลอย
    if (dsh.boar) {
      for (const e of enemiesOf(state, u)) {
        if (dsh.hitIds.includes(e.id)) continue;
        if (dist(u, e) > e.radius + u.radius) continue;
        dsh.hitIds.push(e.id);
        state.dmgSrc = skillLabel(u, sk);
        applyDamage(state, u, e, skillPower(u, sk, e), false);
        state.dmgSrc = null;
      }
      const walls = (state.lore && state.lore.walls) || [];
      const hitWall = walls.some((w) => {
        const rx = u.x - w.x, ry = u.y - w.y;
        return Math.abs(rx * w.nx + ry * w.ny) <= w.half && Math.abs(rx * -w.ny + ry * w.nx) <= u.radius + 24;
      }) || u.x <= u.radius + 4 || u.y <= u.radius + 4
        || u.x >= ARENA_W - u.radius - 4 || u.y >= ARENA_H - u.radius - 4;
      if (hitWall || dsh.left <= 0) {
        u.dashing = null;
        if (hitWall) {
          const dmg = sk.hitDmg[dsh.boar.rank] + sk.hitBadRatio * u.bonusAd + sk.hitBonusHp * (u.bonusHp || 0);
          vfx(state, { kind: "shock", x: u.x, y: u.y, r: dsh.boar.radius, color: "255,208,138", dur: 0.7 });
          state.dmgSrc = skillLabel(u, sk);
          for (const e of enemiesOf(state, u)) {
            if (dist(u, e) > dsh.boar.radius + e.radius) continue;
            applyDamage(state, u, e, dmg, false);
            addBuff(e, { type: "stun", v: 1, until: state.t + sk.knockup }, state.t);
          }
          state.dmgSrc = null;
        }
      }
      continue;
    }
    const bumped = !sk.unstoppable && !sk.drag && enemiesOf(state, u).some((e) => dist(u, e) <= e.radius + u.radius);
    if (bumped || dsh.left <= 0) {
      if (sk.drag) for (const e of state.units) if (e.dragBy === u.id) e.dragBy = null;
      u.dashing = null;
      dashImpact(state, u, sk, dsh.frac);
    }
  }
}


export function dashImpact(state, u, sk, frac) {
  const tgt = state.units.find((x) => x.id === u.targetId);
  const power = skillPower(u, sk, tgt);
  const stun = (sk.stunMin || 0.5) + ((sk.stunMax || 1.5) - (sk.stunMin || 0.5)) * frac;
  let landed = false;
  for (const e of enemiesOf(state, u)) {
    if (dist(u, e) > (sk.radius || 250) + e.radius) continue;
    landed = true;
    state.dmgSrc = skillLabel(u, sk);
    applyDamage(state, u, e, power * (0.55 + 0.45 * frac), !!sk.magic);
    e.buffs.push({ type: "stun", v: 1, until: state.t + stun });
    if (sk.knockback) {
      const dd = dist(u, e) || 1;
      e.x = clamp(e.x + ((e.x - u.x) / dd) * sk.knockback, e.radius, ARENA_W - e.radius);
      e.y = clamp(e.y + ((e.y - u.y) / dd) * sk.knockback, e.radius, ARENA_H - e.radius);
    }
  }
  if (landed && sk.cdRefundOnHit) {
    const live = u.skills.find((x) => x.key === sk.key);
    if (live) live.cdLeft *= 1 - sk.cdRefundOnHit;
  }
  state.fx.push({ x: u.x, y: u.y, t: state.t, kind: "hit", size: sk.radius || 250 });
}
