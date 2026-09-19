import { tr } from "../i18n.js";
import { grantShield } from "./damage.js";
import { addBuff, pushLog, vfx } from "./state-util.js";
import { activeSkills } from "./targeting.js";


// ---------------------------------------------------------------
// Golden Touch — พาสซีฟของ Kazem
//
// เดิมโค้ดนี้ฝังอยู่ใน ai.js เส้นเดียว แปลว่าตอนเล่นเองในห้องซ้อม
// (ทางเดิน manual ใน step.js) พาสซีฟไม่เคยทำงานเลย ย้ายมาไว้ที่เดียว
// แล้วให้ทั้งสองทางเรียกอันนี้
//
// สเปคใหม่ตามที่ผู้ใช้สั่ง:
//   · คูลดาวน์ 14 วิ ที่เลเวล 1 ไล่ลงถึง 12 วิ ที่เลเวล 18
//   · ไม่ลดตามเร่งสกิล (AH) อีกแล้ว
//   · สเกลกับเลเวลและ Bonus AD แรงขึ้น (10 ต่อเลเวล · 60% Bonus AD)
//   · ร่ายสกิลตอนพาสซีฟยังไม่พร้อม จะตัดคูลดาวน์ที่เหลือทิ้ง 4 วิ
// ---------------------------------------------------------------
export function onKazemCast(state, u) {
  const cfg = u.champ && u.champ.goldenTouch;
  if (!cfg) return;
  const ready = u.kazemPassiveReadyAt == null || state.t >= u.kazemPassiveReadyAt;
  if (!ready) {
    u.kazemPassiveReadyAt = Math.max(state.t, u.kazemPassiveReadyAt - (cfg.cutOnCast || 4));
    return;
  }
  const sh = cfg.base + cfg.perLevel * u.level + cfg.bonusHp * (u.bonusHp || 0) + cfg.bonusAd * (u.bonusAd || 0);
  grantShield(u, Math.round(sh));
  u.buffs.push({ type: "shield", v: 1, until: state.t + 3 });
  // ไล่จาก cd ที่เลเวล 1 ไปหา cdAtMax ที่เลเวล 18 แบบเชิงเส้น
  const g = Math.max(0, Math.min(1, (u.level - 1) / 17));
  u.kazemPassiveReadyAt = state.t + (cfg.cd + (cfg.cdAtMax - cfg.cd) * g);
}


// ---------------------------------------------------------------
// I WILL NOT YIELD — อัลติของ Tristan
//
// สเปคใหม่: กดเองไม่ได้อีกแล้ว (shouldCast คืน false ให้ lastStand อยู่แล้ว)
// ดาเมจที่จะฆ่าถูกกันไว้ เขาล้มลงนิ่งไป 2.5 วิ แตะไม่ได้ ทำอะไรไม่ได้
// แล้วค่อยลุกขึ้นมาเลือดเต็มพร้อมบัฟชุดเดิม (ยังเสียเลือดต่อเนื่องเหมือนเดิม)
//
// คืน true = "อย่าเพิ่งตาย" ให้ applyDamage รีเทิร์นออกไปเลย
// ---------------------------------------------------------------
export function lastStandCatch(state, u) {
  const sk = (activeSkills(u) || []).find((x) => x.type === "lastStand" && x.onDeath);
  if (!sk || sk.rank <= 0 || sk.cdLeft > 0 || u.lastStand || u.yielding) return false;
  sk.cdLeft = sk.cdByRank ? sk.cdByRank[Math.max(0, sk.rank - 1)] : sk.cd;
  const delay = sk.reviveDelay || 2.5;
  u.hp = 1;
  u.yielding = { at: state.t + delay, sk };
  addBuff(u, { type: "invuln", v: 1, until: state.t + delay }, state.t);
  addBuff(u, { type: "untargetable", v: 1, until: state.t + delay }, state.t);
  addBuff(u, { type: "root", v: 1, until: state.t + delay }, state.t);
  vfx(state, { kind: "ring", x: u.x, y: u.y, r: u.radius + 70, color: "229,72,77", grow: 1.4, dur: delay });
  vfx(state, { kind: "aura", id: u.id, r: u.radius + 30, color: "229,72,77", dur: delay });
  pushLog(state, tr("{0} {1} คุกเข่าลง แต่ยังไม่ยอมแพ้", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
  return true;
}


// เรียกทุกเฟรมจาก step.js — ครบเวลาแล้วลุกขึ้นมาพร้อมบัฟ
export function tickLastStand(state, u) {
  if (!u.yielding || state.t < u.yielding.at) return;
  const sk = u.yielding.sk;
  const r = Math.max(0, sk.rank - 1);
  u.yielding = null;
  u.hp = u.maxHp * (sk.reviveHp != null ? sk.reviveHp : 1);
  u.buffs = u.buffs.filter((b) => !["invuln", "untargetable", "root"].includes(b.type));
  u.lastStand = { until: state.t + 99, drain: sk.drain };
  u.lastStandKills = u.kills;
  addBuff(u, { type: "as", v: sk.asBuff[r], until: state.t + 99 }, state.t);
  addBuff(u, { type: "ad", v: sk.adBuff[r], until: state.t + 99 }, state.t);
  addBuff(u, { type: "ms", v: sk.msBuff[r], until: state.t + 99 }, state.t);
  vfx(state, { kind: "shock", x: u.x, y: u.y, r: 260, color: "229,72,77", dur: 0.8 });
  vfx(state, { kind: "flash", x: u.x, y: u.y, r: 180, color: "255,236,190", dur: 0.5 });
  vfx(state, { kind: "aura", id: u.id, r: u.radius + 44, color: "229,72,77", dur: 8 });
  state.fx.push({ x: u.x, y: u.y - 96, t: state.t, kind: "label", text: "I WILL NOT YIELD", color: "#E5484D" });
  pushLog(state, tr("{0} {1} ลุกขึ้นยืนอีกครั้ง", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
}
