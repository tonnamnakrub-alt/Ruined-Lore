import { tr } from "../i18n.js";
import { applyDamage, healUnit } from "./damage.js";
import { addBuff, dist, pushLog, skillLabel, vfx, withSrc } from "./state-util.js";


// ---------------------------------------------------------------
// กลไกของ Lorla — The Sanguine Countess
//
//   พาสซีฟ Sanguine Aristocracy
//     สกิลโดนแชมเปี้ยนศัตรู -> +6 Max HP ถาวร ต่อเป้าหมาย นับครั้งเดียวต่อการร่าย
//     ร่วมสังหาร            -> +25 Max HP ถาวร
//     สะสมข้ามยกได้ เพดาน champ.sanguine.max (จำผ่าน sangHp เหมือน Wendigo's Claw)
//
//   R True Vampire Sovereign
//     ออร่ารอบตัว ตีทุก 0.5 วิ ดูดเลือดคืน 50% ของดาเมจจริงที่วงทำได้
//     มีศัตรูอยู่ในวง = เวลาไม่เดิน แถมคืนเวลาให้ +0.5 วิ ต่อ tick (เพดาน 6 วิ)
//     ไม่มีใครอยู่ในวง = เวลาเดินถอยหลังตามปกติ
//     ระหว่างเปิดอยู่ W กลายเป็นวาป (จัดการใน fire-skill.js)
// ---------------------------------------------------------------

// ดาเมจจากสกิลเท่านั้นที่นับพาสซีฟ — ป้ายที่มาของดาเมจสกิลขึ้นต้นด้วย Q/W/E/R เสมอ
const SKILL_SRC = /^[QWER] /;


export function onLorlaDamage(state, source, target, isAuto) {
  if (!source || !target || isAuto) return;
  const cfg = source.champ && source.champ.sanguine;
  if (!cfg || source.team === target.team || !target.alive) return;
  if (!SKILL_SRC.test(String(state.dmgSrc || ""))) return;
  // กันไม่ให้ก้อนเดียวกันนับซ้ำ — สกิลที่คูลดาวน์สั้นสุดคือ 4 วิ หน้าต่าง 1 วิจึงเท่ากับ
  // "ครั้งเดียวต่อการร่าย" ส่วนออร่า R จัดการนับเองในฟังก์ชันด้านล่าง
  source.sangSeen = source.sangSeen || {};
  const key = target.id + "|" + String(state.dmgSrc).slice(0, 1);
  if (state.t - (source.sangSeen[key] || -99) < 1.0) return;
  source.sangSeen[key] = state.t;
  growLorla(state, source, cfg.perHit);
}


export function onLorlaTakedown(state, u) {
  const cfg = u && u.champ && u.champ.sanguine;
  if (!cfg) return;
  growLorla(state, u, cfg.perTakedown);
}


// เพิ่ม Max HP ถาวร — ได้เลือดปัจจุบันเพิ่มเท่ากันด้วย (ไม่ใช่แค่ขยายหลอดเปล่า)
function growLorla(state, u, amount) {
  const cfg = u.champ.sanguine;
  const held = (u.sangHp || 0) + (u.sangGained || 0);
  if (held >= cfg.max) return;
  const add = Math.min(amount, cfg.max - held);
  u.sangGained = (u.sangGained || 0) + add;
  u.maxHp += add;
  u.hp = Math.min(u.maxHp, u.hp + add);
  u.bonusHp = (u.bonusHp || 0) + add;
  vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 18, color: "214,60,90", grow: 0.7 });
}


// ---------------------------------------------------------------
// เปิดออร่า R
// ---------------------------------------------------------------
export function startBloodStorm(state, u, sk) {
  // endAt = เพดานเวลารวม ต่อให้คืนเวลาได้เรื่อยๆ ก็ห้ามยาวเกิน maxDur
  // (ตามสเปกดิบ ถ้ามีศัตรูยืนในวงตลอด ออร่าจะไม่มีวันหมดอายุเลย)
  u.bloodStorm = {
    sk, left: sk.dur, nextTick: state.t + sk.every, hit: {},
    endAt: sk.maxDur ? state.t + sk.maxDur : null,
  };
  vfx(state, { kind: "aura", id: u.id, r: sk.radius, color: "214,60,90", dur: sk.dur });
  pushLog(state, tr("{0} {1} จุติราชันย์แวมไพร์", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
}


export function tickLorla(state, u, dt) {
  const bs = u.bloodStorm;
  if (!bs) return;
  if (!u.alive) { u.bloodStorm = null; return; }
  const sk = bs.sk;
  if (bs.endAt != null && state.t >= bs.endAt) { u.bloodStorm = null; return; }
  const inside = state.units.filter(
    (e) => e.alive && e.team !== u.team && dist(u, e) <= sk.radius + e.radius
  );

  // มีศัตรูในวง = เวลาแช่แข็ง ไม่มีใคร = นับถอยหลังตามปกติ
  if (!inside.length) {
    bs.left -= dt;
    if (bs.left <= 0) { u.bloodStorm = null; return; }
  }

  if (state.t < bs.nextTick) return;
  bs.nextTick = state.t + sk.every;
  if (!inside.length) return;

  const r = Math.max(0, sk.rank - 1);
  const per = sk.dmg[r] + (sk.apRatio || 0) * u.ap + (sk.selfMaxHp || 0) * u.maxHp;
  let dealt = 0;
  for (const e of inside) {
    const before = e.hp + e.shield;
    withSrc(state, skillLabel(u, sk), u, () => applyDamage(state, u, e, per, true));
    dealt += Math.max(0, before - (e.hp + e.shield));
    // พาสซีฟจากออร่า — นับเป้าละครั้งต่อการเปิดหนึ่งครั้ง
    if (!bs.hit[e.id]) {
      bs.hit[e.id] = 1;
      const cfg = u.champ.sanguine;
      if (cfg) growLorla(state, u, cfg.perHit);
    }
  }
  if (dealt > 0) withSrc(state, skillLabel(u, sk), u, () => healUnit(state, u, dealt * (sk.drain || 0)));
  // คืนเวลาให้ตราบใดที่ยังกัดใครอยู่ เพดานเท่าระยะเวลาเต็ม
  bs.left = Math.min(sk.dur, bs.left + (sk.regen || 0));
  vfx(state, { kind: "ring", x: u.x, y: u.y, r: sk.radius, color: "214,60,90", grow: 0.25, dur: 0.3 });
}


// ---------------------------------------------------------------
// Charm — ทำอะไรไม่ได้ แต่ยังเดิน (เดินเข้าหาคนร่ายด้วยความเร็วที่ลดลง)
// ใช้กับ E Carmilla's Thrall
// ---------------------------------------------------------------
export function applyCharm(state, owner, target, dur, slow) {
  addBuff(target, { type: "charm", v: 1, sourceId: owner.id, slow: slow || 0.35, until: state.t + dur }, state.t);
  vfx(state, { kind: "ring", x: target.x, y: target.y, r: target.radius + 22, color: "232,106,168", grow: 0.9 });
  pushLog(state, tr(
    "{0} {1} สะกดจิต {2}",
    owner.team === "blue" ? "🔵" : "🔴", tr(owner.champ.th), tr(target.champ.th)
  ));
}
