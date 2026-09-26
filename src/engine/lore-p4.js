import { tr } from "../i18n.js";
import { MASK_JITTER, MASK_MARGIN, MASK_MISREAD, MASK_RETHINK, MASK_WINDOW } from "../data/tuning.js";
import { applyDamage, grantShield, healUnit, skillPower } from "./damage.js";
import { addBuff, addBuffUnique, dist, pushLog, skillLabel, vfx } from "./state-util.js";
import { SENSE_PEEL, TEAM_SHARE } from "../data/tuning.js";
import { alliesOf, enemiesOf } from "./targeting.js";
import { clamp } from "./util.js";
import { ARENA_H, ARENA_W } from "../data/constants.js";

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
// พื้นที่เก็บของกลไกชุดนี้ — ผูกกับ state ก้อนเดียว สร้างตอนใช้ครั้งแรก
const P = (state) => (state.p4 || (state.p4 = { thorns: [] }));
const place = (u, x, y) => {
  u.x = clamp(x, u.radius, ARENA_W - u.radius);
  u.y = clamp(y, u.radius, ARENA_H - u.radius);
};
// ค่าป้องกันส่วนที่ "ไม่ได้มาจากตัวละครเอง" — ของจากไอเทมและบัฟ
const bonusArmor = (u) => Math.max(0, (u.armor || 0) - (u.champ.armor + u.champ.armorG * ((u.level || 1) - 1)));
const bonusMr = (u) => Math.max(0, (u.mr || 0) - (u.champ.mr + u.champ.mrG * ((u.level || 1) - 1)));
// ขั้นที่ไล่ตามเลเวล — พาสซีฟสามขั้นในเกมนี้ใช้เกณฑ์เดียวกันหมด
const tierOf = (level, tiers) => {
  let t = 0;
  for (let i = 0; i < tiers.length; i++) if (level >= tiers[i]) t = i;
  return t;
};


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


// =================================================================
// STEIN
// =================================================================

// ---- พาสซีฟ · ออโต้ที่หลั่งน้ำเลี้ยง -----------------------------
// ฮีลตัวเองและเพื่อนที่ "สัดส่วนเลือด" น้อยที่สุดในระยะ ไม่ใช่เลือดดิบน้อยที่สุด
// (แทงค์เลือด 900/3000 ต้องมาก่อนแครี่เลือด 800/1000)
export function steinSap(state, u) {
  const cfg = u.champ && u.champ.sap;
  if (!cfg) return;
  if (u.sapReadyAt != null && state.t < u.sapReadyAt) return;
  const amount = byLevel(cfg, u.level) + cfg.apRatio * (u.ap || 0) + cfg.bonusHp * (u.bonusHp || 0);
  u.sapReadyAt = state.t + cfg.cd[tierOf(u.level, cfg.tiers)];
  const prev = state.dmgSrc;
  state.dmgSrc = tr("พาสซีฟ Sap of Compassion");
  healUnit(state, u, amount);
  let worst = null;
  for (const a of alliesOf(state, u)) {
    if (a.id === u.id || dist(u, a) > cfg.radius) continue;
    if (!worst || a.hp / a.maxHp < worst.hp / worst.maxHp) worst = a;
  }
  if (worst) {
    healUnit(state, worst, amount);
    vfx(state, { kind: "beam", x: u.x, y: u.y, x2: worst.x, y2: worst.y, w: 5, color: "99,199,127", dur: 0.35 });
    vfx(state, { kind: "aura", id: worst.id, r: worst.radius + 22, color: "99,199,127", dur: 0.5 });
  }
  state.dmgSrc = prev;
  vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 28, color: "99,199,127", grow: 0.9, dur: 0.45 });
}


// ร่ายสกิลทีไรก็เร่งการสังเคราะห์ — เรียกจาก ai.js ตอนกด และจากทุกระลอกของ R
export function steinCastCut(state, u) {
  const cfg = u.champ && u.champ.sap;
  if (!cfg || u.sapReadyAt == null || state.t >= u.sapReadyAt) return;
  u.sapReadyAt = Math.max(state.t, u.sapReadyAt - (cfg.cutOnCast || 2));
}


// ลากคนที่ลากไม่ได้ — กำลังพุ่งอยู่ หรือกันสถานะติดตัวไว้
const hasHardAnchor = (e) => !!(e.dashing || e.charging) || e.buffs.some((b) => b.type === "unstoppable");


// ---- Q · รากกระชากเข้ามาครึ่งทาง --------------------------------
// เรียกจาก step.js ตอนกระสุนรากไม้เข้าเป้า
export function steinPull(state, u, e, frac) {
  if (!u || !e.alive || hasHardAnchor(e)) return;
  const dx = u.x - e.x, dy = u.y - e.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const move = len * frac;
  vfx(state, { kind: "beam", x: u.x, y: u.y, x2: e.x, y2: e.y, w: 8, color: "128,168,96", dur: 0.3 });
  vfx(state, { kind: "trail", x: e.x, y: e.y, color: "128,168,96", pending: e.id });
  place(e, e.x + (dx / len) * move, e.y + (dy / len) * move);
  vfx(state, { kind: "shards", x: e.x, y: e.y, r: 90, count: 8, color: "128,168,96", dur: 0.4 });
}


// ---- E · โล่คู่ที่แบ่งดาเมจกัน ----------------------------------
// เรียกจาก damage.js ก่อนโล่ของเป้าจะทำงาน — คืนก้อนที่สไตน์รับไปแทน
export function canopyShare(state, target, dmg) {
  const link = target.canopy;
  if (!link) return 0;
  if (state.t >= link.until) { target.canopy = null; return 0; }
  const s = state.units.find((x) => x.id === link.ownerId);
  // เงื่อนไขคือ "โล่ของทั้งคู่ยังอยู่" — ใครโล่แตกก่อน สายเชื่อมก็ขาด
  if (!s || !s.alive || !(s.shield > 0) || !(target.shield > 0)) return 0;
  const take = Math.min(s.shield, dmg * link.share);
  if (!(take > 0)) return 0;
  s.shield -= take;
  s.shieldAbsorbed = (s.shieldAbsorbed || 0) + take;
  vfx(state, { kind: "beam", x: target.x, y: target.y, x2: s.x, y2: s.y, w: 3, color: "99,199,127", dur: 0.18 });
  return take;
}


function canopyShieldAmount(u, sk) {
  return at(sk.shield, sk)
    + (sk.apRatio || 0) * (u.ap || 0)
    + (sk.shieldBonusHp || 0) * (u.bonusHp || 0)
    + (sk.shieldBonusArmor || 0) * bonusArmor(u)
    + (sk.shieldBonusMr || 0) * bonusMr(u);
}


// เลือกว่าจะกางโล่ให้ใคร — นี่คือการตัดสินใจ ไม่ใช่การหยิบคนเลือดน้อยสุดเสมอ
//   gameSense  อ่านออกว่าใครกำลังจะโดนรุม ไม่ใช่ใครเลือดน้อยแล้ว
//   teamwork   ยอมยกโล่ให้เพื่อนแทนที่จะเก็บไว้กันตัวเอง
export function canopyPick(state, u, sk) {
  const sense = (u.athlete && u.athlete.gameSense) || 0;
  const team = (u.athlete && u.athlete.teamwork) || 0;
  let best = null, bestScore = -Infinity;
  for (const a of alliesOf(state, u)) {
    if (a.id === u.id || dist(u, a) > sk.range) continue;
    // เลือดที่พร่อง — ใครก็มองออก
    let score = (1 - a.hp / a.maxHp) * 10;
    // กำลังโดนเล็งอยู่กี่คน — ต้องมีสายตาถึงจะอ่านออกก่อนดาเมจจะลง
    let aimed = 0;
    for (const e of enemiesOf(state, u)) if (e.targetId === a.id) aimed += 1;
    score += aimed * SENSE_PEEL * (sense / 10);
    // เพื่อนที่บางกว่าคุ้มกว่า เพราะโล่ก้อนเดียวกันช่วยเขาได้มากกว่า
    score += (1 - Math.min(1, a.maxHp / 2500)) * 4 * (team / 10);
    if (score > bestScore) { bestScore = score; best = a; }
  }
  // ไม่มีใครน่ากางให้เลย ก็กางกันตัวเอง — แต่คนที่ทีมเวิร์คสูงจะรอเพื่อนมากกว่า
  if (!best) return null;
  if (bestScore < TEAM_SHARE * (1 - team / 10)) return null;
  return best;
}


// ---------------------------------------------------------------
// ทุกเฟรม — ของที่ไม่ผูกกับยูนิตคนเดียว (เรียกจาก systems.js)
// ---------------------------------------------------------------
export function tickP4(state, dt) {
  void dt;
  const p = P(state);
  // W ของ STEIN — กรวยหนามที่หน่วงไว้ ครบเวลาแล้วแทงขึ้นพร้อมกันทั้งวง
  p.thorns = p.thorns.filter((c) => {
    if (state.t < c.at) return true;
    const u = state.units.find((x) => x.id === c.ownerId);
    if (!u || !u.alive) return false;
    const sk = c.sk;
    const prev = state.dmgSrc;
    state.dmgSrc = skillLabel(u, sk);
    vfx(state, { kind: "cone", x: c.x, y: c.y, r: c.range, ang: c.ang, half: c.half, color: "128,168,96", dur: 0.4 });
    vfx(state, { kind: "slashes", x: c.x, y: c.y, r: c.range, ang: c.ang, half: c.half, count: 7, color: "128,168,96", dur: 0.45 });
    for (const e of enemiesOf(state, u)) {
      const d = Math.hypot(e.x - c.x, e.y - c.y);
      if (d > c.range + e.radius) continue;
      const a = Math.atan2(e.y - c.y, e.x - c.x);
      if (Math.abs(((a - c.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > c.half) continue;
      applyDamage(state, u, e, c.dmg, true);
      addBuff(e, { type: "root", v: 1, until: state.t + c.root }, state.t);
      vfx(state, { kind: "ring", x: e.x, y: e.y, r: e.radius + 18, color: "128,168,96", grow: 0.5, dur: 0.4 });
    }
    state.dmgSrc = prev;
    return false;
  });
}


// ---------------------------------------------------------------
// ทุกเฟรม ต่อยูนิต — เรียกจาก step.js ต่อจาก tickLoreUnit()
// ---------------------------------------------------------------
export function tickP4Unit(state, u, dt) {
  void dt;
  // R ของ STEIN — หยั่งรากอยู่กับที่ แล้วปล่อยคลื่นฮีลทีละระลอก
  const c = u.channeling;
  if (c && c.p4 === "arbor") {
    if (state.t >= c.next) {
      c.next = state.t + c.sk.every;
      c.left -= 1;
      const sk = c.sk;
      const amount = sk.heal[c.rank] + (sk.apRatio || 0) * (u.ap || 0) + (sk.healBonusHp || 0) * (u.bonusHp || 0);
      const prev = state.dmgSrc;
      state.dmgSrc = skillLabel(u, sk);
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: sk.radius, color: "99,199,127", grow: 0.9, dur: 0.7 });
      for (const a of alliesOf(state, u)) {
        if (dist(u, a) > sk.radius) continue;
        healUnit(state, a, amount);
        vfx(state, { kind: "aura", id: a.id, r: a.radius + 20, color: "99,199,127", dur: 0.5 });
      }
      state.dmgSrc = prev;
      // ทุกระลอกเร่งพาสซีฟเหมือนการร่ายสกิลหนึ่งครั้ง
      steinCastCut(state, u);
      if (c.left <= 0) {
        u.channeling = null;
        u.buffs = u.buffs.filter((b) => b.tag !== "arbor" && b.tag !== "arbordr");
      }
    }
  }
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
    // ---- STEIN W · กรวยหนามที่หน่วงไว้ 0.4 วิ ----
    case "thornCone": {
      const half = ((sk.angle || 60) * Math.PI) / 180 / 2;
      const ang = target ? Math.atan2(target.y - u.y, target.x - u.x) : 0;
      vfx(state, { kind: "cone", x: u.x, y: u.y, r: sk.range, ang, half, color: "96,128,72", dur: sk.delay });
      P(state).thorns.push({
        ownerId: u.id, team: u.team, sk, at: state.t + (sk.delay || 0.4),
        x: u.x, y: u.y, ang, half, range: sk.range,
        dmg: skillPower(u, sk, target), root: at(sk.root, sk),
      });
      return true;
    }

    // ---- STEIN E · โล่คู่ที่แบ่งดาเมจกัน ----
    case "canopy": {
      const amount = canopyShieldAmount(u, sk);
      const mate = u.canopyPick || canopyPick(state, u, sk);
      u.canopyPick = null;
      grantShield(u, amount);
      addBuffUnique(u, "canopy", { type: "shield", v: 1, until: state.t + sk.dur }, state.t);
      vfx(state, { kind: "aura", id: u.id, r: u.radius + 26, color: "99,199,127", dur: sk.dur });
      if (mate && mate.alive) {
        grantShield(mate, amount);
        addBuffUnique(mate, "canopy", { type: "shield", v: 1, until: state.t + sk.dur }, state.t);
        mate.canopy = { ownerId: u.id, until: state.t + sk.dur, share: sk.share };
        vfx(state, { kind: "beam", x: u.x, y: u.y, x2: mate.x, y2: mate.y, w: 6, color: "99,199,127", dur: 0.4 });
        vfx(state, { kind: "aura", id: mate.id, r: mate.radius + 26, color: "99,199,127", dur: sk.dur });
        pushLog(state, tr("{0} {1} แบ่งร่มเงาให้ {2}",
          u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th), tr(mate.champ.th)));
      }
      return true;
    }

    // ---- STEIN R · หยั่งรากนิ่ง แล้วปล่อยคลื่นฮีลห้าระลอก ----
    case "arbor": {
      const r = R(sk);
      const span = sk.waves * sk.every;
      u.channeling = { skill: sk, sk, p4: "arbor", rank: r, left: sk.waves, next: state.t + sk.every };
      if (sk.selfRoot) addBuffUnique(u, "arbor", { type: "root", v: 1, until: state.t + span + 0.05 }, state.t);
      addBuffUnique(u, "arbordr", { type: "dr", v: sk.dr[r], until: state.t + span + 0.05 }, state.t);
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: sk.radius, color: "99,199,127", grow: 0.2, dur: span });
      vfx(state, { kind: "aura", id: u.id, r: u.radius + 40, color: "99,199,127", dur: span });
      pushLog(state, tr("{0} {1} หยั่งรากลงกลางสมรภูมิ", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
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
