import { tr } from "../i18n.js";
import { applyDamage, grantShield, skillPower } from "./damage.js";
import { addBuff, addBuffUnique, centroid, dist, pushLog, skillLabel, vfx } from "./state-util.js";
import { clamp } from "./util.js";
import { ARENA_H, ARENA_W } from "../data/constants.js";


// ---------------------------------------------------------------
// กลไกของ Klaeder — The Sovereign's Vanity
//
//   พาสซีฟ Imperial Weave — โดนดาเมจแล้วทอเส้นใยกันดาเมจชนิดนั้น
//     เก็บเป็นลิสต์ของชนิดเรียงตามเวลา ["ad","ap","ad",...] ยาวไม่เกิน 20
//     เต็มแล้วโดนชนิดใหม่ = แทนที่ชั้น "เก่าสุดของอีกชนิด" ไม่ใช่เก่าสุดเฉยๆ
//     ครบ 20 ได้ความเร็วเดิน · ทั้งกองหมดอายุพร้อมกันใน 6 วิ ต่ออายุทุกครั้งที่โดนตี
//
//   W guardBurst — กางโล่ 7 วิ พอครบ 5 วิถ้าโล่ยังไม่แตกก็สะบัดเสื้อคลุมรอบตัว
//   R dismissal  — จับแล้วเหวี่ยงไปทางกลางทีมเรา ระเบิดที่จุดตก
// ---------------------------------------------------------------

// ยิ่งมี Bonus HP มาก ภูษายิ่งทอหนา — ไม่ได้ผูกกับเลเวล แต่ผูกกับของที่ซื้อ
const weaveScale = (u, base, per500, cap) =>
  Math.min(cap, base + per500 * ((u.bonusHp || 0) / 500));


export function onWeaveDamage(state, target, source, magic) {
  const cfg = target.champ && target.champ.weave;
  if (!cfg || !source || source.team === target.team || !target.alive) return;
  const kind = magic ? "ap" : "ad";
  const w = target.weave && state.t < target.weave.until ? target.weave : { list: [] };
  const list = w.list;
  if (list.length < cfg.max) list.push(kind);
  else {
    // เต็มแล้ว — หาชั้นเก่าสุดที่เป็นอีกชนิดมาแทน ถ้าไม่มีก็แค่ต่ออายุ
    const i = list.findIndex((x) => x !== kind);
    if (i >= 0) { list.splice(i, 1); list.push(kind); }
  }
  target.weave = { list, until: state.t + cfg.dur };
}


export function tickKlaeder(state, u, dt) {
  const cfg = u.champ.weave;
  if (cfg) {
    if (!u.weave || state.t >= u.weave.until) u.weave = null;
    const list = u.weave ? u.weave.list : [];
    // ครบ 20 ชั้น = +pct ของค่าที่มีอยู่ · ชั้นเดียว = 1/20 ของนั้น
    // คิดจาก baseArmor/baseMr (ค่าก่อนบวกภูษา) ไม่งั้นมันจะทบตัวเองทุกเฟรม
    const pct = weaveScale(u, cfg.pctBase, cfg.pctPer500, cfg.pctCap) / cfg.max;
    let ad = 0, ap = 0;
    for (const k of list) { if (k === "ap") ap += 1; else ad += 1; }
    u.weaveArmor = (u.baseArmor || 0) * ad * pct;
    u.weaveMr = (u.baseMr || 0) * ap * pct;
    if (list.length >= cfg.max) {
      addBuffUnique(u, "weavems", { type: "ms", v: weaveScale(u, cfg.msBase, cfg.msPer500, cfg.msCap), until: state.t + 0.25 }, state.t);
    }
  }

  // W — ครบเวลาแล้วโล่ยังเหลือ ก็สะบัดเสื้อคลุม
  const f = u.flourish;
  if (f && state.t >= f.at) {
    u.flourish = null;
    if (u.shield > 0 && u.alive) {
      const sk = f.sk;
      const r = Math.max(0, sk.rank - 1);
      const power = skillPower(u, sk, null);
      vfx(state, { kind: "shock", x: u.x, y: u.y, r: sk.radius, color: "232,163,61", dur: 0.65 });
      vfx(state, { kind: "flash", x: u.x, y: u.y, r: sk.radius * 0.55, color: "255,236,190", dur: 0.3 });
      const prev = state.dmgSrc;
      state.dmgSrc = skillLabel(u, sk);
      for (const e of state.units) {
        if (!e.alive || e.team === u.team) continue;
        if (dist(u, e) > sk.radius + e.radius) continue;
        applyDamage(state, u, e, power, false);
        addBuff(e, { type: "slow", v: sk.slowByRank[r], until: state.t + sk.slowDur }, state.t);
      }
      state.dmgSrc = prev;
      pushLog(state, tr("{0} {1} สะบัดเสื้อคลุม", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
    }
  }
  void dt;
}


// ---------------------------------------------------------------
// W — กางโล่แล้วตั้งเวลาสะบัด
// ---------------------------------------------------------------
export function castGuardBurst(state, u, sk) {
  const r = Math.max(0, sk.rank - 1);
  u.shield = 0;
  grantShield(u, sk.shield[r] + (sk.shieldBad || 0) * u.bonusAd + (sk.shieldBonusHp || 0) * (u.bonusHp || 0));
  u.buffs.push({ type: "shield", v: 1, until: state.t + sk.dur });
  u.flourish = { at: state.t + sk.burstAt, sk };
  vfx(state, { kind: "aura", id: u.id, r: u.radius + 34, color: "232,163,61", dur: sk.dur });
}


// ---------------------------------------------------------------
// R — จับตัวแล้วเหวี่ยงเข้าหากลางทีมเรา ระเบิดที่จุดตก
// ---------------------------------------------------------------
export function castDismissal(state, u, sk, target) {
  if (!target || !target.alive) return;
  // ลากตัวเองเข้าไปติดเป้าเหมือน grabSlam แล้วระงับการกระทำเป้าไว้ระหว่างยกขึ้น
  u.x = clamp(target.x - (target.x - u.x) * 0.2, u.radius, ARENA_W - u.radius);
  u.y = clamp(target.y - (target.y - u.y) * 0.2, u.radius, ARENA_H - u.radius);
  // ระงับการกระทำ = ขยับและร่ายอะไรไม่ได้ แต่ยังโดนตีได้ตามปกติ
  addBuff(target, { type: "stun", v: 1, until: state.t + sk.suppress }, state.t);
  target.dashing = null; target.charging = null; target.channeling = null;
  u.castLock = sk.suppress;
  // ทิศที่จะเหวี่ยง — จากฝั่งศัตรูมาทางฝั่งเรา แล้วโยนให้สุดระยะเสมอ
  // (ถ้าเล็งไปที่กลางทีมตัวเองเฉยๆ ตอน Klaeder ยืนติดเพื่อน ระยะจะสั้นจนเหมือนไม่ได้โยน)
  const mine = centroid(state, u.team);
  const foe = centroid(state, u.team === "blue" ? "red" : "blue");
  let nx = mine.x - foe.x, ny = mine.y - foe.y;
  const nl = Math.hypot(nx, ny) || 1;
  nx /= nl; ny /= nl;
  const tx = clamp(u.x + nx * sk.throwRange, 40, ARENA_W - 40);
  const ty = clamp(u.y + ny * sk.throwRange, 40, ARENA_H - 40);
  state.hurls.push({ ownerId: u.id, targetId: target.id, at: state.t + sk.suppress, skill: sk, x: tx, y: ty });
  // ข้อมูลการลอย — ตัวเรนเดอร์ใช้วาดเงาใต้ตัวกับความสูงของส่วนโค้ง
  target.hurl = { fx: target.x, fy: target.y, tx, ty, start: state.t, until: state.t + sk.suppress };
  pushLog(state, tr(
    "{0} {1} จับ {2} เหวี่ยงทิ้ง",
    u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th), tr(target.champ.th)
  ));
}


export function tickHurls(state) {
  // ระหว่างยังลอยอยู่ ลากตัวเป้าไปตามเส้นทางทีละเฟรม จะได้เห็นว่ามันลอยไปจริง
  for (const u of state.units) {
    const h = u.hurl;
    if (!h) continue;
    if (!u.alive || state.t >= h.until) { u.hurl = null; continue; }
    const k = (state.t - h.start) / Math.max(0.001, h.until - h.start);
    u.x = h.fx + (h.tx - h.fx) * k;
    u.y = h.fy + (h.ty - h.fy) * k;
    u.vx = 0; u.vy = 0;
  }
  state.hurls = state.hurls.filter((h) => {
    if (state.t < h.at) return true;
    const u = state.units.find((x) => x.id === h.ownerId);
    const t = state.units.find((x) => x.id === h.targetId);
    if (!u || !u.alive) return false;
    const sk = h.skill;
    const r = Math.max(0, sk.rank - 1);
    const bh = u.bonusHp || 0;
    const direct = sk.dmg[r] + (sk.badRatio || 0) * u.bonusAd + (sk.selfBonusHp || 0) * bh;
    const splash = sk.aoeDmg[r] + (sk.aoeBad || 0) * u.bonusAd + (sk.aoeBonusHp || 0) * bh;
    const prev = state.dmgSrc;
    state.dmgSrc = skillLabel(u, sk);
    if (t && t.alive) {
      t.hurl = null;
      t.x = h.x; t.y = h.y;
      applyDamage(state, u, t, direct, false);
      addBuff(t, { type: "slow", v: sk.slowByRank[r], until: state.t + sk.slowDur }, state.t);
    }
    for (const e of state.units) {
      if (!e.alive || e.team === u.team || (t && e.id === t.id)) continue;
      if (Math.hypot(e.x - h.x, e.y - h.y) > sk.radius + e.radius) continue;
      applyDamage(state, u, e, splash, false);
      addBuff(e, { type: "slow", v: sk.slowByRank[r], until: state.t + sk.slowDur }, state.t);
    }
    state.dmgSrc = prev;
    vfx(state, { kind: "shock", x: h.x, y: h.y, r: sk.radius, color: "232,163,61", dur: 0.7 });
    vfx(state, { kind: "flash", x: h.x, y: h.y, r: sk.radius * 0.8, color: "255,236,190", dur: 0.35 });
    state.fx.push({ x: h.x, y: h.y, t: state.t, kind: "hit", size: sk.radius });
    return false;
  });
}
