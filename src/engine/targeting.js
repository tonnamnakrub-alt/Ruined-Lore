import { skillPower } from "./damage.js";
import { aliveOf, dist, hasBuff } from "./state-util.js";
import { effStat } from "./stats.js";


// ---------------- targeting ----------------
export function pickTarget(state, u, supAlive) {
  const enemies = aliveOf(state, u.team === "blue" ? "red" : "blue");
  if (!enemies.length) return null;
  const know = effStat(u, "knowledge", supAlive);   // reads the matchup: who actually matters
  const team = effStat(u, "teamwork", supAlive);    // calls the target the rest of the team is on
  const w = know / 10;
  const tw = team / 10;

  const counts = {};
  for (const a of state.units) {
    if (a.team === u.team && a.alive && a.targetId) counts[a.targetId] = (counts[a.targetId] || 0) + 1;
  }

  let best = null;
  let bestScore = -Infinity;
  for (const e of enemies) {
    if (hasBuff(e, "stealth") || hasBuff(e, "untargetable") || hasBuff(e, "invuln")) continue;
    const d = dist(u, e);
    let score = -Math.min(d, 1350) / 350;                   // everyone prefers what's close
    score += w * (1 - e.hp / e.maxHp) * 3.4;               // knowledge: finish the wounded
    score += tw * Math.min(counts[e.id] || 0, 3) * 0.6;    // teamwork: converge on one target
    score += w * (e.champ.value - 1) * 1.1;                // knowledge: kill the carry, not the tank
    // peel: an enemy sitting on top of one of our squishies jumps the queue
    if (e.champ.melee) {
      for (const a of state.units) {
        if (!a.alive || a.team !== u.team || a.id === u.id || a.champ.value < 1.2) continue;
        if (dist(e, a) < 400) { score += w * 1.1; break; }
      }
    }
    score += w * (e.bounty || 0) * 0.05;                   // knowledge: notice the fed target
    // cover: a well-positioned champion puts bodies between itself and the shooter
    const cover = e.champ.melee ? 0 : (() => {
      let n = 0;
      const ed = dist(u, e) || 1;
      for (const g of state.units) {
        if (!g.alive || g.team !== e.team || g.id === e.id) continue;
        if (dist(u, g) >= ed) continue;
        const rx = g.x - u.x, ry = g.y - u.y;
        const perp = Math.abs(rx * ((e.y - u.y) / ed) - ry * ((e.x - u.x) / ed));
        if (perp < g.radius + 130) n++;
      }
      return n;
    })();
    score -= cover * 0.55 * (e.athlete.gameSense / 10);
    if (e.id === u.targetId) score += 0.55;                // hysteresis: don't thrash
    // a team with poor awareness scatters its focus; a sharp one converges
    score += (u.targetNoise[e.id] || 0) * (1 - w) * 2.2;
    if (!Number.isFinite(score)) continue;
    if (score > bestScore) { bestScore = score; best = e; }
  }
  return best;
}


// how many enemies are currently aiming at me
export function focusedOnMe(state, u) {
  let n = 0;
  for (const e of state.units) if (e.alive && e.team !== u.team && e.targetId === u.id) n++;
  return n;
}


// ---------------- dodging ----------------
export function incomingThreat(state, u, sense) {
  let worst = null;
  let worstT = Infinity;
  for (const p of state.projectiles) {
    if (p.team === u.team || p.homing) continue;
    const rx = u.x - p.x;
    const ry = u.y - p.y;
    const closing = rx * p.dx + ry * p.dy;
    if (closing <= 0) continue;
    const tImpact = closing / p.speed;
    if (tImpact > 0.5) continue;
    const perp = Math.abs(rx * p.dy - ry * p.dx);
    if (perp > u.radius + 16 + sense * 4.2) continue;
    if (tImpact < worstT) { worstT = tImpact; worst = p; }
  }
  return worst;
}


// ---------------- skills ----------------
export function enemiesOf(state, u) {
  return state.units.filter((x) => x.alive && x.team !== u.team);
}

export function alliesOf(state, u) {
  return state.units.filter((x) => x.alive && x.team === u.team);
}


// rough post-mitigation estimate, used to decide whether a cast secures a kill
export function estimate(u, sk, e) {
  const raw = skillPower(u, sk, e) + (sk.slamPctMaxHp ? e.maxHp * sk.slamPctMaxHp[Math.max(0, sk.rank - 1)] : 0);
  const res = sk.magic ? e.mr : e.armor;
  return raw * (100 / (100 + res)) - e.shield;
}


// how many enemies a radius-style skill would catch if centred on this candidate
export function clusterAt(state, u, cx, cy, r) {
  let n = 0;
  for (const e of enemiesOf(state, u)) if (Math.hypot(e.x - cx, e.y - cy) <= r + e.radius) n++;
  return n;
}


export function bestSkillTarget(state, u, sk, fallback, aw) {
  // noticing the better target IS the skill being modelled — low awareness just
  // fires at whatever it was already hitting
  if (u.rng() > 0.15 + 0.85 * (aw / 10)) return fallback;
  const enemies = enemiesOf(state, u);
  if (!enemies.length) return fallback;
  const reach = sk.range || sk.dashRange || (sk.grabRange ? sk.grabRange + 700 : u.range * 1.4);
  const inReach = enemies.filter((e) => dist(u, e) <= reach);
  if (!inReach.length) return fallback;

  // anything that can finish someone should be pointed at that someone
  const lethal = inReach.filter((e) => estimate(u, sk, e) >= e.hp);
  if (lethal.length) return lethal.reduce((a, b) => (b.champ.value > a.champ.value ? b : a));

  if (sk.type === "grabSlam" || sk.type === "dash" || sk.type === "chargeDash") {
    // diving the carry is only smart if it isn't standing inside its whole team
    const score = (e) =>
      e.champ.value
      + (hasBuff(e, "stun") || hasBuff(e, "root") ? 0.6 : 0)
      + (1 - e.hp / e.maxHp) * 0.8
      - dist(u, e) / 3000
      - clusterAt(state, u, e.x, e.y, 550) * 0.45;
    const best = inReach.reduce((a, b) => (score(b) > score(a) ? b : a));
    return score(best) > 0.5 ? best : fallback;
  }
  if (sk.type === "aoeGround" || sk.type === "cone" || sk.type === "line") {
    // aim where it catches the most bodies; a rooted target can't dodge, so prefer it
    return inReach.reduce((a, b) => {
      const sa = clusterAt(state, u, a.x, a.y, sk.radius || 220) + (hasBuff(a, "root") || hasBuff(a, "stun") || hasBuff(a, "slow") ? 1.2 : 0) + a.champ.value * 0.5;
      const sb = clusterAt(state, u, b.x, b.y, sk.radius || 220) + (hasBuff(b, "root") || hasBuff(b, "stun") || hasBuff(b, "slow") ? 1.2 : 0) + b.champ.value * 0.5;
      return sb > sa ? b : a;
    });
  }
  if (sk.type === "snipe" || sk.type === "targeted") {
    return inReach.reduce((a, b) => (b.champ.value / Math.max(0.2, b.hp / b.maxHp) > a.champ.value / Math.max(0.2, a.hp / a.maxHp) ? b : a));
  }
  return fallback;
}


export function activeSkills(u) {
  return u.form && u.formSkills ? u.formSkills : u.skills;
}
