import { tr } from "../i18n.js";
import { applyDamage, healUnit } from "./damage.js";
import { addBuff, dist, pushLog, skillLabel, vfx, withSrc } from "./state-util.js";


// ---------------------------------------------------------------
// กลไกของ Laura — The Sanguine Countess
//
//   พาสซีฟ Sanguine Aristocracy — เก็บเป็น "สแตกถาวร" หนึ่งสแตก = Max HP +5
//     จบยก                  -> +5 สแตก (ไม่ต้องลงไฟต์ ให้ตอนปิดยกใน App)
//     Q หรือ E โดนศัตรู     -> +1 สแตก "ต่อเป้าหมายที่โดน" (Q โดน 5 ตัว = +5)
//     สังหาร/ช่วยสังหาร     -> +5 สแตก
//     ทุกสกิลสเกลตามจำนวนสแตก ไม่ได้สเกลตาม Bonus HP อีกแล้ว
//     สะสมข้ามยกได้ ไม่มีเพดาน (max = 0 แปลว่าไม่จำกัด · จำผ่าน sangHp ที่เก็บเป็นจำนวนสแตก)
//
//   R True Vampire Sovereign
//     ออร่ารอบตัว ตีทุก 0.5 วิ ดูดเลือดคืน 50% ของดาเมจจริงที่วงทำได้
//     มีศัตรูตั้งแต่ 2 ตัวในวง = เวลาแช่แข็งและเติมกลับเต็ม 5 วิ (อยู่ได้ไม่จำกัด)
//     เหลือน้อยกว่า 2 ตัว = เวลาเดินถอยหลัง คืนได้สูงสุดแค่ grace 3 วิ ก่อนหมด
//     ระหว่างเปิดอยู่ W กลายเป็นวาป (จัดการใน fire-skill.js)
// ---------------------------------------------------------------

// พาสซีฟนับเฉพาะ Q กับ E ตามสเปคใหม่ — ป้ายที่มาของดาเมจสกิลขึ้นต้นด้วยคีย์สกิลเสมอ
const SKILL_SRC = /^[QE] /;


export function onLauraDamage(state, source, target, isAuto) {
  if (!source || !target || isAuto) return;
  const cfg = source.champ && source.champ.sanguine;
  if (!cfg || source.team === target.team || !target.alive) return;
  if (!SKILL_SRC.test(String(state.dmgSrc || ""))) return;
  // กุญแจผูกกับ "เป้าหมาย + สกิล" จึงนับแยกต่อเป้าหมายที่โดน (Q โดน 3 ตัว = 3 แต้ม)
  // หน้าต่าง 1 วิแค่กันไม่ให้ก้อนเดียวกันของเป้าเดิมนับซ้ำ · ออร่า R นับเองด้านล่าง
  source.sangSeen = source.sangSeen || {};
  const key = target.id + "|" + String(state.dmgSrc).slice(0, 1);
  if (state.t - (source.sangSeen[key] || -99) < 1.0) return;
  source.sangSeen[key] = state.t;
  growLaura(state, source, cfg.perHit);
}


export function onLauraTakedown(state, u) {
  const cfg = u && u.champ && u.champ.sanguine;
  if (!cfg) return;
  growLaura(state, u, cfg.perTakedown);
}


// เพิ่มสแตกถาวร — หนึ่งสแตกได้ Max HP +5 และได้เลือดปัจจุบันเพิ่มเท่ากันด้วย
function growLaura(state, u, stacks) {
  const cfg = u.champ.sanguine;
  const held = (u.sangStacks || 0);
  // cfg.max = 0 คือไม่มีเพดาน
  if (cfg.max > 0 && held >= cfg.max) return;
  const add = cfg.max > 0 ? Math.min(stacks, cfg.max - held) : stacks;
  u.sangStacks = held + add;
  u.sangGained = (u.sangGained || 0) + add;
  const hp = add * (cfg.hpPerStack || 5);
  u.maxHp += hp;
  u.hp = Math.min(u.maxHp, u.hp + hp);
  u.bonusHp = (u.bonusHp || 0) + hp;
  vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 18, color: "214,60,90", grow: 0.7 });
}


// ---------------------------------------------------------------
// เปิดออร่า R
// ---------------------------------------------------------------
export function startBloodStorm(state, u, sk) {
  // ไม่มีเพดานเวลารวมแล้ว — ตราบใดที่ยังมีศัตรู 2 ตัวขึ้นไปในวง ออร่าอยู่ต่อได้เรื่อยๆ
  u.bloodStorm = { sk, left: sk.dur, nextTick: state.t + sk.every, hit: {} };
  vfx(state, { kind: "aura", id: u.id, r: sk.radius, color: "214,60,90", dur: sk.dur });
  pushLog(state, tr("{0} {1} จุติราชันย์แวมไพร์", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
}


export function tickLaura(state, u, dt) {
  const bs = u.bloodStorm;
  if (!bs) return;
  if (!u.alive) { u.bloodStorm = null; return; }
  const sk = bs.sk;
  const inside = state.units.filter(
    (e) => e.alive && e.team !== u.team && dist(u, e) <= sk.radius + e.radius
  );
  const need = sk.holdNeed || 2;

  // ศัตรูครบตามจำนวน = เวลาแช่แข็งและเติมเต็ม · ไม่ครบ = นับถอยหลัง
  if (inside.length >= need) {
    bs.left = sk.dur;
    bs.fading = false;
  } else {
    // พอหลุดจากสภาพแช่แข็ง เวลาที่เหลือถูกตัดให้ไม่เกิน grace (ยืดได้อีกราว 3 วิ)
    if (!bs.fading) { bs.fading = true; bs.left = Math.min(bs.left, sk.grace || 3); }
    bs.left -= dt;
    if (bs.left <= 0) { u.bloodStorm = null; return; }
  }

  if (state.t < bs.nextTick) return;
  bs.nextTick = state.t + sk.every;
  if (!inside.length) return;

  const r = Math.max(0, sk.rank - 1);
  const per = sk.dmg[r] + (sk.apRatio || 0) * u.ap + (sk.selfStacks || 0) * (u.sangStacks || 0);
  let dealt = 0;
  for (const e of inside) {
    const before = e.hp + e.shield;
    withSrc(state, skillLabel(u, sk), u, () => applyDamage(state, u, e, per, true));
    dealt += Math.max(0, before - (e.hp + e.shield));
    // พาสซีฟจากออร่า — นับเป้าละครั้งต่อการเปิดหนึ่งครั้ง
    if (!bs.hit[e.id]) {
      bs.hit[e.id] = 1;
      const cfg = u.champ.sanguine;
      if (cfg) growLaura(state, u, cfg.perHit);
    }
  }
  const drain = sk.drainByRank ? sk.drainByRank[r] : (sk.drain || 0);
  if (dealt > 0) withSrc(state, skillLabel(u, sk), u, () => healUnit(state, u, dealt * drain));
  // ยังกัดใครอยู่ก็คืนเวลาให้ แต่ระหว่างจางเพดานคือ grace ไม่ใช่ระยะเวลาเต็ม
  bs.left = Math.min(bs.fading ? (sk.grace || 3) : sk.dur, bs.left + (sk.regen || 0));
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
