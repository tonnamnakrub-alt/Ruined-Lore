import { tr } from "../i18n.js";
import { ARENA_H, ARENA_W } from "../data/constants.js";
import { applyDamage, edgeDamage, grantShield, healUnit } from "./damage.js";
import { applyFragmentDamage } from "./on-hit.js";
import { addBuff, dist, pushLog, recentTaken, skillLabel, vfx } from "./state-util.js";
import { DT, step } from "./step.js";
import { enemiesOf } from "./targeting.js";
import { clamp } from "./util.js";
import { tickLore } from "./lore.js";

// ป้ายบอกที่มาของดาเมจสำหรับของที่ทำงานทีหลัง (โซน พิษ กลไกตัวละคร)
const srcOf = (o, u) => (o && o.src) || (o && o.skill ? skillLabel(u, o.skill) : tr("กลไกตัวละคร"));


export function tickNewSystems(state) {
  // กลไกของตัวละคร Patch 0.3 (พายุ ยักษ์ กำแพง บ้าน ฯลฯ)
  tickLore(state, DT);
  // the four-way slash that lands after Cross Slash stops
  state.crosses = state.crosses.filter((c) => {
    if (state.t < c.at) return true;
    const u = state.units.find((x) => x.id === c.ownerId);
    if (!u || !u.alive) return false;
    const sk = c.sk;
    const len = sk.armLen + (u.skillRangeBoost || 0);
    const r = Math.max(0, sk.rank - 1);
    const power = sk.armDmg[r] + sk.armAdRatio * u.ad;
    const hits = {};
    // the path he just dashed along is the fourth arm, so only three are spawned here
    const arms = [c.ang, c.ang + Math.PI / 2, c.ang - Math.PI / 2];
    for (const a of arms) {
      const dx = Math.cos(a), dy = Math.sin(a);
      for (const e of enemiesOf(state, u)) {
        const rx = e.x - u.x, ry = e.y - u.y;
        const along = rx * dx + ry * dy;
        if (along < 0 || along > len) continue;
        if (Math.abs(rx * -dy + ry * dx) > sk.armWidth / 2 + e.radius) continue;
        hits[e.id] = (hits[e.id] || 0) + 1;
        const mult = hits[e.id] === 1 ? 1 : sk.falloff;
        state.dmgSrc = skillLabel(u, sk);
        edgeDamage(state, u, e, power * mult, sk.armLen, false);
      }
      vfx(state, { kind: "beam", x: u.x, y: u.y, x2: u.x + dx * len, y2: u.y + dy * len, w: sk.armWidth / 2, color: "229,72,77" });
    }
    return false;
  });

  // heal over time
  state.hots = state.hots.filter((h) => {
    const t = state.units.find((x) => x.id === h.targetId);
    if (!t || !t.alive || state.t > h.until) return false;
    healUnit(state, t, h.hps * DT);
    return true;
  });

  // cages: a closed ring nobody can walk through
  state.cages = state.cages.filter((c) => {
    if (state.t > c.until || c.hp <= 0) {
      // Land of Toys: when the cage finally breaks or times out, the splinters
      // slow anyone still standing inside it — no stun anymore
      if (c.breakSlow) {
        for (const u of state.units) {
          if (!u.alive || Math.hypot(u.x - c.x, u.y - c.y) > c.r + u.radius) continue;
          addBuff(u, { type: "slow", v: c.breakSlow, until: state.t + c.breakSlowDur }, state.t);
        }
      }
      return false;
    }
    if (state.t < c.at) return true;
    for (const u of state.units) {
      if (!u.alive || u.dashing || u.charging) continue;
      // สเปคใหม่: เพื่อนของคนวางกรงเดินผ่านได้ตามปกติ ติดอยู่ข้างในเฉพาะศัตรู
      if (c.allyPass && u.team === c.team) continue;
      const dx = u.x - c.x, dy = u.y - c.y;
      const dd = Math.hypot(dx, dy) || 1;
      const inside = dd < c.r;
      const limit = inside ? c.r - u.radius : c.r + u.radius;
      const crossed = inside ? dd > limit : dd < limit;
      if (!crossed) continue;
      u.x = c.x + (dx / dd) * limit;
      u.y = c.y + (dy / dd) * limit;
    }
    return true;
  });

  // bleed: total damage spread over its duration, re-hitting just extends it
  state.dots = state.dots.filter((d) => {
    const t = state.units.find((x) => x.id === d.targetId);
    const o = state.units.find((x) => x.id === d.ownerId);
    if (!t || !t.alive || state.t > d.until) return false;
    state.dmgSrc = srcOf(d, o);
    const tick = d.dps * DT;
    applyDamage(state, o, t, tick, d.magic, d.trueDmg);
    // เลือดไหลของเกราะเซนทอร์นับยอดที่เหลือไว้ เพื่อเอาไปฮีลคืนตอนเก็บศพได้
    if (d.left != null) d.left = Math.max(0, d.left - tick);
    return true;
  });

  // Ariel surfacing from the water
  state.submerges = state.submerges.filter((sb) => {
    if (state.t < sb.at) return true;
    const u = state.units.find((x) => x.id === sb.ownerId);
    if (!u || !u.alive) return false;
    if (sb.surfaceDelay && !sb.surfaced) {
      // stage 1: resurface at the target spot, briefly vulnerable before the slam lands
      u.x = clamp(sb.x, u.radius, ARENA_W - u.radius);
      u.y = clamp(sb.y, u.radius, ARENA_H - u.radius);
      u.buffs = u.buffs.filter((b) => b.type !== "untargetable" && b.type !== "invuln");
      sb.surfaced = true;
      sb.at = state.t + sb.surfaceDelay;
      return true;
    }
    u.x = clamp(sb.x, u.radius, ARENA_W - u.radius);
    u.y = clamp(sb.y, u.radius, ARENA_H - u.radius);
    u.buffs = u.buffs.filter((b) => b.type !== "untargetable" && b.type !== "invuln");
    for (const e of enemiesOf(state, u)) {
      if (dist(u, e) > sb.r + (u.skillRangeBoost || 0) + e.radius) continue;
      state.dmgSrc = srcOf(sb, u);
      if (sb.edgeBase) edgeDamage(state, u, e, sb.dmg, sb.edgeBase, sb.magic);
      else applyDamage(state, u, e, sb.dmg, sb.magic);
      addBuff(e, { type: "stun", v: 1, until: state.t + sb.knockup }, state.t);
      if (sb.landSlow) addBuff(e, { type: "slow", v: sb.landSlow, until: state.t + sb.landSlowDur }, state.t);
    }
    state.fx.push({ x: u.x, y: u.y, t: state.t, kind: "magic", size: sb.r });
    return false;
  });

  // the tsunami rolls, then leaves water behind
  state.waves = state.waves.filter((w) => {
    const step = w.speed * DT;
    w.x += w.nx * step; w.y += w.ny * step; w.left -= step;
    const owner = state.units.find((x) => x.id === w.ownerId);
    for (const e of state.units) {
      if (!e.alive || e.team === w.team || w.hitIds.includes(e.id)) continue;
      const rx = e.x - w.x, ry = e.y - w.y;
      if (Math.abs(rx * w.nx + ry * w.ny) > 90) continue;
      if (Math.abs(rx * -w.ny + ry * w.nx) > w.halfW + e.radius) continue;
      w.hitIds.push(e.id);
      state.dmgSrc = srcOf(w, owner);
      applyDamage(state, owner, e, w.dmg, w.magic);
      // คลื่นที่กว้างมากๆ ต้องมีค่าเสียหายลดหลั่น ไม่งั้นยิงทีเดียวโดนทั้งทีมเต็มๆ
      if (w.skill && w.skill.falloff) w.dmg *= w.skill.falloff;
      if (w.knockup > 0) addBuff(e, { type: "stun", v: 1, until: state.t + w.knockup }, state.t);
    }
    const f = w.skill.field;
    // สเปคใหม่: คลื่นทิ้ง "น้ำตามทาง" ระหว่างวิ่ง ไม่ใช่รอจบแล้วค่อยปูทีเดียว
    // แอ่งแต่ละก้อนเริ่มนับอายุของตัวเองตั้งแต่ตอนที่มันเกิด
    if (f && f.trail) {
      if (w.nextPuddle == null) w.nextPuddle = 0;
      const gone = w.span - w.left;
      if (gone >= w.nextPuddle) {
        w.nextPuddle = gone + w.halfW * 0.8;
        state.fields.push({
          ownerId: w.ownerId, team: w.team, x: w.x, y: w.y, nx: w.nx, ny: w.ny,
          r: w.halfW, halfLen: w.halfW, halfW: w.halfW, until: state.t + f.dur,
          slow: f.slow[w.rank] + f.slowPerAp * ((owner ? owner.ap : 0) / 100),
          selfBoost: f.selfBoost,
        });
      }
    }
    if (w.left > 0) return true;
    // คลื่นบางท่าไม่ทิ้งพื้นค้างไว้ (เช่น Q ของ Laura) — จบก็คือจบ
    if (!f || f.trail) return false;
    state.fields.push({
      ownerId: w.ownerId, team: w.team,
      x: (w.startX + w.x) / 2, y: (w.startY + w.y) / 2,
      nx: w.nx, ny: w.ny, halfLen: w.span / 2, halfW: w.halfW,
      until: state.t + f.dur,
      slow: f.slow[w.rank] + f.slowPerAp * ((owner ? owner.ap : 0) / 100),
      selfBoost: f.selfBoost,
    });
    return false;
  });

  // water field slows anyone standing in it — แอ่งกลม (r) หรือแถบยาว (halfLen/halfW)
  state.fields = state.fields.filter((f) => {
    if (state.t > f.until) return false;
    for (const e of state.units) {
      if (!e.alive || e.team === f.team) continue;
      if (f.r) {
        if (Math.hypot(e.x - f.x, e.y - f.y) > f.r) continue;
      } else {
        const rx = e.x - f.x, ry = e.y - f.y;
        if (Math.abs(rx * f.nx + ry * f.ny) > f.halfLen) continue;
        if (Math.abs(rx * -f.ny + ry * f.nx) > f.halfW) continue;
      }
      addBuff(e, { type: "slow", v: f.slow, until: state.t + 0.2 }, state.t);
    }
    return true;
  });

  // Theon's shadow pulses
  state.pulses = state.pulses.filter((p) => {
    if (state.t < p.at) return true;
    const u = state.units.find((x) => x.id === p.ownerId);
    if (!u || !u.alive) return false;
    for (const e of enemiesOf(state, u)) {
      if (dist(u, e) <= p.radius + e.radius) {
        state.dmgSrc = srcOf(p, u);
        applyDamage(state, u, e, p.dmg, false);
        if (u.champ.fragments) applyFragmentDamage(state, u, e);
      }
    }
    state.fx.push({ x: u.x, y: u.y, t: state.t, kind: "hit", size: p.radius });
    return false;
  });

  // shield that bursts when it expires or breaks
  for (const u of state.units) {
    if (!u.pendingBurst) continue;
    const pb = u.pendingBurst;
    if (state.t < pb.at && u.shield > 0) continue;
    for (const e of enemiesOf(state, u)) {
      state.dmgSrc = srcOf(pb, u);
      if (dist(u, e) <= pb.radius + e.radius) applyDamage(state, u, e, pb.amt * pb.burstPct, false);
    }
    healUnit(state, u, pb.amt * pb.healPct);
    u.pendingBurst = null;
  }

  // Theon's ult: everything absorbed comes back out in a cone
  for (const u of state.units) {
    if (!u.absorb || state.t < u.absorb.until) continue;
    const sk = u.absorb.skill;
    const r = Math.max(0, sk.rank - 1);
    const out = u.absorb.dmg * sk.reflect[r];
    const tgt = state.units.find((x) => x.id === u.targetId);
    const base = tgt ? Math.atan2(tgt.y - u.y, tgt.x - u.x) : 0;
    const half = (sk.angle * Math.PI) / 180 / 2;
    for (const e of enemiesOf(state, u)) {
      const dd = dist(u, e);
      if (dd > sk.radius) continue;
      const a = Math.atan2(e.y - u.y, e.x - u.x);
      if (Math.abs(((a - base + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > half) continue;
      state.dmgSrc = skillLabel(u, sk);
      applyDamage(state, u, e, out, false);
    }
    // เพื่อนที่เพิ่งโดนตีมาด้วยกัน ได้ฮีลและโล่คิดเป็น % ของดาเมจที่ "เขา" กินไปเมื่อ 3 วิก่อน
    const ap = sk.allyPct ? sk.allyPct[r] : 0.5;
    for (const a of state.units) {
      if (!a.alive || a.team !== u.team || dist(u, a) > sk.radius) continue;
      const hurt = sk.lookback ? recentTaken(a, state.t, sk.lookback) : out;
      if (hurt <= 0) continue;
      healUnit(state, a, hurt * ap);
      grantShield(a, hurt * ap);
      addBuff(a, { type: "shield", v: 1, until: state.t + 3 }, state.t);
      vfx(state, { kind: "ring", x: a.x, y: a.y, r: a.radius + 26, color: "255,255,255", grow: 0.8 });
    }
    if (out > 0) vfx(state, { kind: "cone", x: u.x, y: u.y, r: sk.radius, ang: base, half: half, color: "255,255,255", dur: 0.7 });
    if (out > 0) pushLog(state, tr(
      "{0} {1} สะท้อน {2}",
      u.team === "blue" ? "🔵" : "🔴",
      tr(u.champ.th),
      Math.round(out)
    ));
    u.absorb = null;
  }

  // Monochrome's tether
  state.tethers = state.tethers.filter((tt) => {
    const u = state.units.find((x) => x.id === tt.ownerId);
    const t = state.units.find((x) => x.id === tt.targetId);
    if (!u || !u.alive || !t || !t.alive) return false;
    if (dist(u, t) > tt.skill.breakAt) return false;
    if (state.t < tt.at) return true;
    const dd = dist(u, t) || 1;
    t.x = clamp(t.x - ((t.x - u.x) / dd) * tt.skill.pull, t.radius, ARENA_W - t.radius);
    t.y = clamp(t.y - ((t.y - u.y) / dd) * tt.skill.pull, t.radius, ARENA_H - t.radius);
    return false;
  });

  // Blue form traps
  state.traps = state.traps.filter((tr) => {
    if (state.t > tr.until) return false;
    const u = state.units.find((x) => x.id === tr.ownerId);
    for (const e of state.units) {
      if (!e.alive || e.team === tr.team) continue;
      if (Math.hypot(e.x - tr.x, e.y - tr.y) > tr.r + e.radius) continue;
      state.dmgSrc = srcOf(tr, u);
      applyDamage(state, u, e, tr.dmg, false);
      addBuff(e, { type: "root", v: 1, until: state.t + tr.skill.root }, state.t);
      return false;
    }
    return true;
  });

  // Pink form clones
  state.clones = state.clones.filter((c) => {
    if (state.t < c.at) return true;
    const u = state.units.find((x) => x.id === c.ownerId);
    for (const e of state.units) {
      if (!e.alive || e.team === c.team) continue;
      state.dmgSrc = srcOf(c, u);
      if (Math.hypot(e.x - c.x, e.y - c.y) <= c.r + e.radius) applyDamage(state, u, e, c.dmg, c.magic);
    }
    state.fx.push({ x: c.x, y: c.y, t: state.t, kind: "magic", size: c.r });
    return false;
  });

  // Abracadabra volley
  state.volleys = state.volleys.filter((v) => {
    if (state.t < v.at) return true;
    const u = state.units.find((x) => x.id === v.ownerId);
    const t = state.units.find((x) => x.id === v.targetId);
    if (!u || !u.alive || !t || !t.alive) return false;
    if (dist(u, t) > v.skill.range) return false;
    state.dmgSrc = srcOf(v, u);
    applyDamage(state, u, t, v.dmg, true);
    t.volleyHits = (t.volleyHits || 0) + 1;
    if (t.volleyHits >= v.skill.stunAt) {
      addBuff(t, { type: "stun", v: 1, until: state.t + v.skill.stunDur }, state.t);
      t.volleyHits = 0;
    }
    return false;
  });
}


export function tickZonesAndSnipes(state) {
  state.zones = state.zones.filter((z) => {
    if (state.t < z.at) {
      // ไข่ทองคำของ JACK — ระหว่างรอระเบิด ประกายทองสโลว์ศัตรูที่ยืนใกล้ไว้ก่อน
      const aura = z.skill && z.skill.auraSlow;
      if (aura) {
        const av = aura[Math.max(0, (z.skill.rank || 1) - 1)];
        for (const e of state.units) {
          if (!e.alive || e.team === z.team) continue;
          if (Math.hypot(e.x - z.x, e.y - z.y) > z.r + e.radius) continue;
          addBuff(e, { type: "slow", v: av, until: state.t + 0.25 }, state.t);
        }
      }
      return true;
    }
    const owner = state.units.find((x) => x.id === z.ownerId);
    // ระเบิดจริงตรงนี้ — ใส่คลื่นกระแทกกับแสงวาบให้เห็นชัดว่าลงตรงไหน
    vfx(state, { kind: "shock", x: z.x, y: z.y, r: z.r, color: z.magic ? "176,140,255" : "232,163,61", dur: 0.65 });
    vfx(state, { kind: "flash", x: z.x, y: z.y, r: z.r * 0.7, color: z.magic ? "214,190,255" : "255,236,190", dur: 0.3 });
    let zoneHit = 0;
    for (const e of state.units) {
      if (!e.alive || e.team === z.team) continue;
      if (Math.hypot(e.x - z.x, e.y - z.y) <= z.r + e.radius) {
        zoneHit++;
        let dmg = z.dmg;
        if (z.skill && z.skill.soloMult) {
          const n = state.units.filter((x) => x.alive && x.team !== z.team && Math.hypot(x.x - z.x, x.y - z.y) <= z.r + x.radius).length;
          if (n === 1) dmg *= z.skill.soloMult;
        }
        state.dmgSrc = srcOf(z, owner);
        applyDamage(state, owner, e, dmg, z.magic);
        if (z.knockup) addBuff(e, { type: "stun", v: 1, until: state.t + z.knockup }, state.t);
        const zs = z.skill && (z.skill.slowFlat || (z.skill.slowByRank ? z.skill.slowByRank[Math.max(0, (z.skill.rank || 1) - 1)] : 0));
        if (zs) addBuff(e, { type: "slow", v: zs, until: state.t + z.skill.slowDur }, state.t);
        if (z.skill && z.skill.blindFlat) addBuff(e, { type: "blind", v: 1, until: state.t + z.skill.blindFlat }, state.t);
        // ห่าฝนธนูของ HOOD — ทุกคนที่โดนติดเลือดไหลต่ออีก 4 วิ ซ้อนกับเลือดไหลจากพาสซีฟได้
        const zb = z.skill && z.skill.zoneBleed;
        if (zb && owner) {
          const zr = Math.max(0, (z.skill.rank || 1) - 1);
          const per = zb.dmg[zr] + (zb.badRatio || 0) * (owner.bonusAd || 0);
          state.dots.push({
            targetId: e.id, ownerId: owner.id,
            dps: per / (zb.every || 1), until: state.t + zb.dur, magic: false,
            src: srcOf(z, owner),
          });
        }
      }
    }
    // Broadside — เพื่อนที่ยืนอยู่ในวงตอนกระสุนลง ได้ความเร็วเดินที่ค่อยๆ จางไปด้วย
    if (z.allyMs && owner && owner.alive) {
      for (const a of state.units) {
        if (!a.alive || a.team !== z.team || a.id === owner.id) continue;
        if (Math.hypot(a.x - z.x, a.y - z.y) > z.r + a.radius) continue;
        addBuff(a, { type: "ms", v: z.allyMs, decayFrom: state.t, until: state.t + (z.allyMsDur || 3) }, state.t);
        vfx(state, { kind: "ring", x: a.x, y: a.y, r: a.radius + 24, color: "232,163,61", grow: 0.8 });
      }
    }
    // น้ำตกของ Crashing Tide — ทุบแล้วทิ้งแอ่งน้ำสโลว์ไว้ตรงนั้น
    if (z.pool && owner) {
      state.fields.push({
        ownerId: z.ownerId, team: z.team, x: z.x, y: z.y,
        nx: 1, ny: 0, r: z.pool.r || z.r, halfLen: z.pool.r || z.r, halfW: z.pool.r || z.r,
        until: state.t + z.pool.dur, slow: z.pool.slow, selfBoost: 1,
      });
      vfx(state, { kind: "ring", x: z.x, y: z.y, r: z.pool.r || z.r, color: "75,141,248", grow: 0.5, dur: 0.8 });
    }
    return false;
  });
  state.snipes = state.snipes.filter((sn) => {
    if (state.t < sn.at) return true;
    const owner = state.units.find((x) => x.id === sn.ownerId);
    const tgt = state.units.find((x) => x.id === sn.targetId);
    if (owner && owner.alive && tgt && tgt.alive && dist(owner, tgt) <= sn.range) {
      state.dmgSrc = srcOf(sn, owner);
      applyDamage(state, owner, tgt, sn.dmg, sn.magic);
    }
    return false;
  });
}
