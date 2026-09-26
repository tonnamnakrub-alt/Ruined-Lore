import { tr } from "../i18n.js";
import { MASK_JITTER, MASK_MARGIN, MASK_MISREAD, MASK_RETHINK, MASK_WINDOW } from "../data/tuning.js";
import { applyDamage } from "./damage.js";
import { addBuff, addBuffUnique, dist, pushLog, skillLabel, vfx } from "./state-util.js";
import { enemiesOf } from "./targeting.js";

// ---------------------------------------------------------------
// Patch 0.4 — กลไกของตัวละครใหม่
//
// แยกไฟล์จาก lore.js ด้วยเหตุผลเดียวกับที่ lore.js แยกจาก fire-skill.js
// fire-skill.js เรียก fireP4Skill() ต่อจาก fireLoreSkill() เมื่อยังไม่มีใครรับ
// ---------------------------------------------------------------

const R = (sk) => Math.max(0, (sk.rank || 1) - 1);
const at = (arr, sk) => (Array.isArray(arr) ? arr[R(sk)] : arr);
const byLevel = (cfg, level) => (cfg.base || 0) + (cfg.perLevel || 0) * ((level || 1) - 1);
const skillOf = (u, key) => (u.skills || []).find((s) => s.key === key);


// =================================================================
// PHANTOM
// =================================================================

// ---- พาสซีฟ · มีดที่ปักค้างอยู่บนตัวเป้า -------------------------
// เก็บไว้บนตัว "เป้าหมาย" เหมือนเมล็ดถั่วของ JACK แล้วเช็ควันหมดอายุตอนอ่าน
// ไม่ต้องไล่ล้างทุกเฟรม เพราะกองมีดมีอายุสั้นและมีเจ้าของได้ทีละคน
export function daggerCount(state, u, e) {
  const d = e && e.pdag;
  if (!d || d.ownerId !== u.id) return 0;
  if (state.t >= d.until) return 0;
  return d.n;
}


function detonate(state, u, e) {
  const cfg = u.champ.daggers;
  e.pdag = null;
  const dmg = byLevel(cfg, u.level) + cfg.badRatio * u.bonusAd;
  // สโลว์ห้าขั้นในเอกสารไม่มีแรงก์ให้อิง เลยผูกกับเลเวลตามตาราง tiers
  let tier = 0;
  for (let i = 0; i < cfg.tiers.length; i++) if (u.level >= cfg.tiers[i]) tier = i;
  const prev = state.dmgSrc;
  state.dmgSrc = tr("พาสซีฟ Stitched Melodrama");
  applyDamage(state, u, e, dmg, false);
  state.dmgSrc = prev;
  if (e.alive) addBuff(e, { type: "slow", v: cfg.slow[tier], until: state.t + cfg.slowDur }, state.t);
  vfx(state, { kind: "shards", x: e.x, y: e.y, r: 150, count: 14, color: "232,92,108", dur: 0.6 });
  vfx(state, { kind: "ring", x: e.x, y: e.y, r: e.radius + 46, color: "232,92,108", grow: 1.1, dur: 0.5 });
}


// ปักทีละเล่ม — ครบห้าเมื่อไหร่ระเบิดทันที เล่มที่เหลือเริ่มนับกองใหม่ต่อ
// (Q สามเล่มพร้อมกันหรือ R สามเล่มจึงดันให้ระเบิดกลางทางได้ ไม่ใช่ทิ้งเศษ)
export function stickDagger(state, u, e, n) {
  const cfg = u.champ && u.champ.daggers;
  if (!cfg || !e || !e.alive || e.team === u.team) return;
  for (let i = 0; i < (n || 1); i++) {
    if (!e.alive) return;
    const d = e.pdag && e.pdag.ownerId === u.id && state.t < e.pdag.until
      ? e.pdag : { ownerId: u.id, n: 0 };
    d.n += 1;
    d.until = state.t + cfg.dur;
    e.pdag = d;
    if (d.n >= cfg.need) detonate(state, u, e);
  }
  if (e.pdag) vfx(state, { kind: "flash", x: e.x, y: e.y, r: 22 + 5 * e.pdag.n, color: "214,214,228", dur: 0.14 });
}


// ---- W · หน้ากากสามอารมณ์ ---------------------------------------
// ท่านี้วัด "หัว" ของนักแข่ง ไม่ใช่ของในกระเป๋า
//   knowledge — อ่านเกราะของคู่ต่อสู้แม่นแค่ไหน อ่านพลาดก็หยิบใบผิด
//   decision  — เส้นที่ใช้ตัดสินว่าดีกว่าพอจะยอมเสียจังหวะ 0.25 วิ นิ่งแค่ไหน
export const MASKS = ["TRAGEDY", "COMEDY", "DEATH"];
export const MASK_TH = { TRAGEDY: "โศกนาฏกรรม", COMEDY: "สุขนาฏกรรม", DEATH: "มรณะ" };


// ราคาของหน้ากากใบหนึ่ง = ดาเมจรวมที่คาดว่าจะลงได้ในอีก MASK_WINDOW วินาที
// คิดทั้งออโต้ · มีดที่จะระเบิด · Q ที่กำลังจะพร้อม · E ที่มีกองมีดให้กระชากอยู่แล้ว
// จึงเป็นการเทียบที่ยุติธรรม — ความเร็วโจมตีชนะตอนได้ยืนตีนานๆ
// ส่วนพลังโจมตีกับเจาะเกราะชนะตอนดาเมจก้อนใหญ่มาจากสกิล
function maskValue(u, sk, armorRead, adB, asB, penB, daggersOn) {
  const bareAd = u.ad - (u.maskAd || 0);
  const bareAs = u.asEff / (1 + (u.maskAs || 0));
  const basePen = u.arPenBase || 0;
  const bonusAd = (u.bonusAdBase || 0) + adB;
  const armor = Math.max(0, armorRead * (1 - Math.min(0.8, u.armorPenPct || 0)) - basePen - penB);
  const mit = 100 / (100 + armor);
  const as = bareAs * (1 + asB);
  const autos = as * MASK_WINDOW;

  let total = autos * (bareAd + adB);

  const cfg = u.champ.daggers;
  if (cfg) {
    const det = byLevel(cfg, u.level) + cfg.badRatio * bonusAd;
    total += Math.floor((autos + daggersOn) / cfg.need) * det;
  }
  const q = skillOf(u, "Q");
  if (q && q.rank > 0 && q.cdLeft < MASK_WINDOW) {
    // โดนครบสามเล่มคือ 1 + falloff คูณสอง
    const blades = 1 + 2 * (q.falloff != null ? q.falloff : 0.5);
    total += (at(q.dmg, q) + (q.badRatio || 0) * bonusAd) * blades;
  }
  const e = skillOf(u, "E");
  if (e && e.rank > 0 && e.cdLeft < MASK_WINDOW && daggersOn > 0) {
    total += daggersOn * (at(e.ripDmg, e) + (e.ripBadRatio || 0) * bonusAd);
  }
  return total * mit;
}


// ทอยความคลาดเคลื่อนไว้ก้อนเดียวแล้วถือไว้ MASK_RETHINK วินาที
// ถ้าทอยใหม่ทุกเฟรม คนที่ knowledge ต่ำจะทอยจนเจอเลขที่ถูกใจแล้วสลับได้อยู่ดี
function maskRead(state, u, e) {
  const cur = u.maskRead;
  if (cur && cur.id === e.id && state.t - cur.at < MASK_RETHINK) return cur;
  const know = (u.athlete && u.athlete.knowledge) || 0;
  const dec = (u.athlete && u.athlete.decision) || 0;
  const read = {
    id: e.id, at: state.t,
    err: (1 - know / 10) * (u.rng() - 0.5) * MASK_MISREAD,
    jitter: (1 - dec / 10) * (u.rng() - 0.5) * 2 * MASK_JITTER,
  };
  u.maskRead = read;
  return read;
}


// คืนชื่อหน้ากากที่ควรเปลี่ยนไปใส่ หรือ null ถ้าใบที่ใส่อยู่ดีพอแล้ว
export function maskPlan(state, u, sk, target) {
  if (!target) return null;
  const r = R(sk);
  const read = maskRead(state, u, target);
  const armorRead = Math.max(0, (target.armor || 0) * (1 + read.err));
  const on = daggerCount(state, u, target);
  const opt = {
    TRAGEDY: maskValue(u, sk, armorRead, sk.adFlat[r], 0, 0, on),
    COMEDY: maskValue(u, sk, armorRead, 0, sk.asPct[r], 0, on),
    DEATH: maskValue(u, sk, armorRead, 0, 0, sk.arPen[r], on),
  };
  const cur = u.mask ? opt[u.mask] : maskValue(u, sk, armorRead, 0, 0, 0, on);
  let best = null;
  for (const k of MASKS) if (best == null || opt[k] > opt[best]) best = k;
  if (best === u.mask) return null;
  if (!(opt[best] > cur * (1 + MASK_MARGIN + read.jitter))) return null;
  return best;
}


export function wearMask(state, u, sk, which) {
  const r = R(sk);
  u.mask = which;
  u.maskAd = which === "TRAGEDY" ? sk.adFlat[r] : 0;
  u.maskAs = which === "COMEDY" ? sk.asPct[r] : 0;
  u.maskPen = which === "DEATH" ? sk.arPen[r] : 0;
  u.buffs = u.buffs.filter((b) => b.tag !== "mask");
  // หน้ากากอยู่ถาวรจนกว่าจะเปลี่ยนใบ ไม่มีวันหมดอายุเอง
  if (u.maskAs) addBuffUnique(u, "mask", { type: "as", v: u.maskAs, until: state.t + 1e6 }, state.t);
  const color = which === "TRAGEDY" ? "126,172,255" : which === "COMEDY" ? "232,190,96" : "232,92,108";
  vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 34, color, grow: 1, dur: 0.45 });
  vfx(state, { kind: "aura", id: u.id, r: u.radius + 20, color, dur: 0.8 });
  pushLog(state, tr("{0} {1} สลับเป็นหน้ากาก{2}",
    u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th), tr(MASK_TH[which])));
}


// ---- E · กระชากมีดทั้งกองกลับมา ---------------------------------
function rebound(state, u, sk) {
  const r = R(sk);
  const rip = sk.ripDmg[r] + (sk.ripBadRatio || 0) * u.bonusAd;
  const fly = sk.dmg[r] + (sk.badRatio || 0) * u.bonusAd;
  const half = (sk.width || 120) / 2;
  const foes = enemiesOf(state, u);
  const pulled = [];
  for (const e of foes) {
    const n = e.pdag && e.pdag.ownerId === u.id && state.t < e.pdag.until ? e.pdag.n : 0;
    if (n <= 0 || dist(u, e) > sk.range) continue;
    pulled.push({ e, n, x: e.x, y: e.y });
  }
  if (!pulled.length) return;
  const prev = state.dmgSrc;
  state.dmgSrc = skillLabel(u, sk);
  // ตัวที่โดนกระชากแล้วจะไม่โดนดาเมจวิถีบินซ้ำอีก
  const hit = new Set(pulled.map((p) => p.e.id));
  for (const { e, n } of pulled) {
    e.pdag = null;
    vfx(state, { kind: "beam", x: e.x, y: e.y, x2: u.x, y2: u.y, w: 3, color: "214,214,228", dur: 0.25 });
    applyDamage(state, u, e, rip * n, false);
  }
  // ใครยืนขวางเส้นทางบินกลับ โดนมีดทะลุตัวหนึ่งครั้ง ไม่ซ้ำแม้ขวางหลายเส้น
  // ใช้พิกัดที่จำไว้ตอนกระชาก เผื่อเป้าตายหรือถูกผลักไปแล้ว
  for (const p of pulled) {
    const dx = u.x - p.x, dy = u.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len, ny = dy / len;
    for (const o of foes) {
      if (hit.has(o.id) || !o.alive) continue;
      const rx = o.x - p.x, ry = o.y - p.y;
      const along = rx * nx + ry * ny;
      if (along < -o.radius || along > len + o.radius) continue;
      if (Math.abs(rx * -ny + ry * nx) > half + o.radius) continue;
      hit.add(o.id);
      applyDamage(state, u, o, fly, false);
    }
  }
  state.dmgSrc = prev;
}


// ---- R · กระโดดหลบแล้วสาดมีดเป็นวงก้นหอย -------------------------
// เรียกจากคิวทุบพื้นใน lore.js ตอนครบเวลาลอย
export function tempestLand(state, u, s) {
  const sk = s.sk;
  u.buffs = u.buffs.filter((b) => !["untargetable", "invuln", "root"].includes(b.type));
  const dmg = sk.dmg[s.rank] + (sk.badRatio || 0) * u.bonusAd;
  const prev = state.dmgSrc;
  state.dmgSrc = skillLabel(u, sk);
  vfx(state, { kind: "shock", x: u.x, y: u.y, r: s.radius, color: "214,214,228", dur: 0.7 });
  vfx(state, { kind: "shards", x: u.x, y: u.y, r: s.radius * 0.8, count: 22, color: "214,214,228", dur: 0.8 });
  for (const e of enemiesOf(state, u)) {
    if (dist(u, e) > s.radius + e.radius) continue;
    applyDamage(state, u, e, dmg, false);
    stickDagger(state, u, e, sk.stacks || 3);
  }
  state.dmgSrc = prev;
}


// ---------------------------------------------------------------
// ร่ายสกิล — เรียกจาก fire-skill.js ต่อจาก fireLoreSkill()
// คืน true = จัดการแล้ว
// ---------------------------------------------------------------
export function fireP4Skill(state, u, sk, target, prec, aim) {
  void prec; void aim;
  switch (sk.type) {
    case "mask": {
      const which = u.maskPlan || maskPlan(state, u, sk, target) || MASKS[0];
      u.maskPlan = null;
      wearMask(state, u, sk, which);
      return true;
    }
    case "rebound": {
      rebound(state, u, sk);
      return true;
    }
    case "bladeTempest": {
      const air = sk.air || 0.75;
      addBuff(u, { type: "untargetable", v: 1, until: state.t + air }, state.t);
      addBuff(u, { type: "invuln", v: 1, until: state.t + air }, state.t);
      addBuff(u, { type: "root", v: 1, until: state.t + air }, state.t);
      state.lore.slams.push({
        kind: "spiral", ownerId: u.id, team: u.team, at: state.t + air, sk, rank: R(sk),
        radius: sk.radius, x: u.x, y: u.y,
      });
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: sk.radius, color: "214,214,228", grow: 0.3, dur: air });
      return true;
    }
  }
  return false;
}
