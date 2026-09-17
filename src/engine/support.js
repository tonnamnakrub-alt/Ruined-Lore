import { tr } from "../i18n.js";
import { grantShield, healUnit } from "./damage.js";
import { HARD_CC, addBuff, addBuffUnique, dist, hasBuff, pushLog, vfx, withSrc } from "./state-util.js";
import { cdrFromItemHaste } from "./stats.js";


// ---------------------------------------------------------------
// ของสายซัพพอร์ต
// แบ่งเป็นสามกลุ่ม
//   1) ทำงานตอน "จ่าย" ฮีล/โล่ ให้เพื่อน   -> onHealOrShield()
//   2) ทำงานทุกเฟรม (ออร่า / ของกดเอง)     -> tickSupportItems()
//   3) ทำงานตอนดาเมจวิ่งผ่าน                -> lifeBondSplit() / lifeBondLeech()
// ---------------------------------------------------------------

const ALLY_RADIUS = 700;
// Gjallarhorn มีรัศมีของตัวเอง แคบกว่าของชิ้นอื่น
const GWC_RADIUS = 600;
// HARD_CC ของเอนจินนับ slow รวมอยู่ด้วย แต่ Cleanse คูลดาวน์ 60 วิ
// ไม่ควรถูกจุดทิ้งเพราะโดนสโลว์เฉยๆ — ตัวนี้เลยรอเฉพาะ CC ที่ขยับไม่ได้จริงๆ
const LOCKING_CC = HARD_CC.filter((t) => t !== "slow");


// ใครในทีมเลือดเหลือ % น้อยที่สุดในระยะที่กำหนด
function lowestAlly(state, team, from, radius, skipId) {
  let best = null;
  for (const a of state.units) {
    if (!a.alive || a.team !== team || a.id === skipId) continue;
    if (dist(a, from) > radius) continue;
    if (!best || a.hp / a.maxHp < best.hp / best.maxHp) best = a;
  }
  return best;
}


function alliesIn(state, u, radius) {
  return state.units.filter((a) => a.alive && a.team === u.team && dist(u, a) <= radius);
}


// ---------------------------------------------------------------
// 1) ฮีล/โล่ที่ "จ่ายออก" ไปหาเพื่อน
// เรียกจาก healUnit() และ grantShield() ใน damage.js
// state.horsEcho กันไม่ให้ผลที่ตัวเองสร้างวนกลับมาเข้าตัวเอง
// ---------------------------------------------------------------
export function onHealOrShield(state, giver, receiver, amount, isShield) {
  if (!state || !giver || !receiver || giver === receiver) return;
  if (!giver.alive || giver.team !== receiver.team) return;
  if (!giver.hasItem || !(amount > 0) || state.horsEcho) return;
  const lvl = giver.level;

  // Aceso's Guiding Censer: ทั้งคนให้และคนรับได้ความเร็วโจมตี + on-hit เวท 4 วิ
  if (giver.hasItem("acb")) {
    for (const p of [giver, receiver]) {
      addBuffUnique(p, "acb:as:" + giver.id, { type: "as", v: 0.15 + 0.005 * lvl, until: state.t + 4 }, state.t);
      addBuffUnique(p, "acb:oh:" + giver.id, { type: "onHitMagic", v: 5 + 1.5 * lvl + 0.05 * giver.ap, until: state.t + 4 }, state.t);
    }
  }

  // Saraswati's Flowing Veena: ทั้งคู่ได้ AP และ AH เพิ่ม 4 วิ
  if (giver.hasItem("sfv")) {
    for (const p of [giver, receiver]) {
      addBuffUnique(p, "sfv:ap:" + giver.id, { type: "apFlat", v: 13 + 1 * lvl, until: state.t + 4 }, state.t);
      addBuffUnique(p, "sfv:ah:" + giver.id, { type: "ahFlat", v: 15, until: state.t + 4 }, state.t);
    }
  }

  // Asclepius' Twin Serpent Staff: ส่งต่อ 30% ให้เพื่อนที่เลือดน้อยสุดในระยะ 750
  if (giver.hasItem("ats")) {
    const chain = lowestAlly(state, giver.team, receiver, 750, receiver.id);
    if (chain) {
      state.horsEcho = true;
      try {
        withSrc(state, tr("ไอเทม Asclepius' Twin Serpent Staff"), giver, () => {
          if (isShield) grantShield(chain, amount * 0.3);
          else healUnit(state, chain, amount * 0.3);
        });
      } finally {
        state.horsEcho = false;
      }
      vfx(state, { kind: "ring", x: chain.x, y: chain.y, r: chain.radius + 24, color: "63,191,127", grow: 0.7 });
    }
  }
}


// ---------------------------------------------------------------
// 2) ออร่าและของที่ทำงานเอง — เรียกหนึ่งครั้งต่อยูนิตต่อเฟรม
// ---------------------------------------------------------------
export function tickSupportItems(state, u, dt) {
  if (!u.hasItem) return;
  const cdr = cdrFromItemHaste(u.itemHaste || 0);

  // --- Gjallarhorn's War Clarion: ออร่าถาวรรอบตัว ตราบใดที่ยังไม่ตาย
  if (u.hasItem("gwc")) {
    for (const a of alliesIn(state, u, GWC_RADIUS)) {
      addBuffUnique(a, "gwc:ms", { type: "msFlat", v: 15, until: state.t + dt * 2 }, state.t);
      addBuffUnique(a, "gwc:as", { type: "as", v: 0.10, until: state.t + dt * 2 }, state.t);
    }
  }

  // --- Aeolus' Bound Winds: กดเองได้ตามจังหวะ — เข้าปะทะ ถูกไล่ หรือเพื่อนโดนสโลว์/เลือดต่ำ
  //     แรงของลมขึ้นกับเลเวลคนถือ 20% ที่เลเวล 1 ไล่ถึง 45% ที่เลเวลเต็ม
  if (u.hasItem("abw") && state.t >= (u.abwReadyAt || 0)) {
    const allies = alliesIn(state, u, ALLY_RADIUS);
    const enemyNear = state.units.some((e) => e.alive && e.team !== u.team && dist(u, e) <= 1100);
    // จังหวะที่ควรกด: มีศัตรูเข้ามาแล้ว หรือมีเพื่อนติดสโลว์ หรือเพื่อนเลือดต่ำกว่าครึ่ง
    const needed = allies.some((a) => hasBuff(a, "slow") || a.hp / a.maxHp < 0.5);
    if (enemyNear || needed) {
      const cfg = u.abwSurge || { base: 0.20, max: 0.45 };
      const g = Math.max(0, Math.min(1, (u.level - 1) / 15));
      const v = cfg.base + (cfg.max - cfg.base) * g;
      u.abwReadyAt = state.t + 20 * (1 - cdr);
      for (const a of allies) {
        addBuffUnique(a, "abw:" + u.id, { type: "ms", v, decayFrom: state.t, until: state.t + 3 }, state.t);
      }
      vfx(state, { kind: "ring", x: u.x, y: u.y, r: ALLY_RADIUS, color: "126,199,255", grow: 0.4, dur: 0.5 });
    }
  }

  // --- Hermes' Moly Blossom: ล้างสถานะติดตัว "ทุกชนิด" ให้เพื่อนหรือตัวเอง + กัน CC 1 วิ + ฮีล
  if (u.hasItem("hmb") && state.t >= (u.hmbReadyAt || 0)) {
    const CLEAN = u.cleanseAll
      ? HARD_CC.concat(["slow", "silence", "disarm", "blind", "antiheal", "shred", "vulnerable", "curiousAmp"])
      : HARD_CC;
    const watch = u.cleanseAll ? LOCKING_CC.concat(["slow", "silence", "disarm", "blind"]) : LOCKING_CC;
    const victim = alliesIn(state, u, ALLY_RADIUS).find((a) => watch.some((tp) => hasBuff(a, tp)));
    if (victim) {
      u.hmbReadyAt = state.t + 60 * (1 - cdr);
      victim.buffs = victim.buffs.filter((b) => !CLEAN.includes(b.type));
      addBuff(victim, { type: "unstoppable", v: 1, until: state.t + 1 }, state.t);
      withSrc(state, tr("ไอเทม Hermes' Moly Blossom"), u, () => {
        healUnit(state, victim, 50 + 6 * u.level + 0.25 * u.ap);
      });
      vfx(state, { kind: "ring", x: victim.x, y: victim.y, r: victim.radius + 34, color: "232,214,120", grow: 0.8 });
    }
  }

  // --- Pridwen's Iron Bastion: เพื่อนเลือดต่ำกว่า 50% แล้วกางโล่ให้ทั้งวง
  if (u.hasItem("pib") && state.t >= (u.pibReadyAt || 0)) {
    const hurt = alliesIn(state, u, ALLY_RADIUS).some((a) => a.hp / a.maxHp < 0.5);
    if (hurt) {
      u.pibReadyAt = state.t + 60 * (1 - cdr);
      const amt = 100 + 15 * u.level;
      for (const a of alliesIn(state, u, ALLY_RADIUS)) {
        withSrc(state, tr("ไอเทม Pridwen's Iron Bastion"), u, () => grantShield(a, amt));
        addBuff(a, { type: "shield", v: 1, until: state.t + 3 }, state.t);
      }
      pushLog(state, tr("{0} {1} กางโล่ให้ทั้งทีม", u.team === "blue" ? "🔵" : "🔴", tr(u.champ.th)));
    }
  }

  // --- Eir's Sanctuary Bell: ตั้งวงไว้ 2 วิ แล้วค่อยฮีลทุกคนในวง
  if (u.hasItem("esb")) {
    if (u.esbFireAt == null && state.t >= (u.esbReadyAt || 0)) {
      const hurt = alliesIn(state, u, ALLY_RADIUS).some((a) => a.hp / a.maxHp < 0.4);
      if (hurt) {
        u.esbReadyAt = state.t + 60 * (1 - cdr);
        u.esbFireAt = state.t + 2;
        u.esbX = u.x;
        u.esbY = u.y;
        vfx(state, { kind: "ring", x: u.x, y: u.y, r: ALLY_RADIUS, color: "63,191,127", grow: 0.1, dur: 2 });
      }
    } else if (u.esbFireAt != null && state.t >= u.esbFireAt) {
      u.esbFireAt = null;
      const centre = { x: u.esbX, y: u.esbY, radius: 0 };
      for (const a of state.units) {
        if (!a.alive || a.team !== u.team || dist(a, centre) > ALLY_RADIUS) continue;
        withSrc(state, tr("ไอเทม Eir's Sanctuary Bell"), u, () => healUnit(state, a, a.maxHp * 0.1));
      }
    }
  }

  // --- Oath of the Dioscuri: ผูกกับเพื่อนหนึ่งคน เน้นตัวที่ทำดาเมจเยอะสุด
  if (u.hasItem("ood")) {
    const cur = u.oodId != null ? state.units.find((a) => a.id === u.oodId) : null;
    if (!cur || !cur.alive) {
      if (u.oodRelinkAt == null) u.oodRelinkAt = state.t + (cur ? 5 : 0);
      if (state.t >= u.oodRelinkAt) {
        let best = null;
        for (const a of state.units) {
          if (!a.alive || a.team !== u.team || a.id === u.id) continue;
          const score = (a.lane === "ADC" ? 1e6 : 0) + (a.damageDealt || 0) + a.ad;
          if (!best || score > best.score) best = { a, score };
        }
        u.oodId = best ? best.a.id : null;
        u.oodRelinkAt = null;
      }
    }
  } else {
    u.oodId = null;
  }
}


// ผู้ใช้ Oath of the Dioscuri รับดาเมจแทนเพื่อนที่ผูกไว้ 10%
// (หยุดรับเมื่อตัวเองเหลือเลือดต่ำกว่า 20% — ไม่งั้นตายพร้อมกันทั้งคู่)
export function lifeBondSplit(state, target) {
  for (const p of state.units) {
    if (!p.alive || p.team !== target.team || p.oodId !== target.id) continue;
    if (p.hp / p.maxHp < 0.2) continue;
    return p;
  }
  return null;
}


// และฮีลกลับ 10% ของดาเมจที่เพื่อนคนนั้นทำได้
export function lifeBondLeech(state, source, dmg) {
  for (const p of state.units) {
    if (!p.alive || p.team !== source.team || p.oodId !== source.id) continue;
    if (p.hp >= p.maxHp) return;
    withSrc(state, tr("ไอเทม Oath of the Dioscuri"), p, () => healUnit(state, p, dmg * 0.10));
    return;
  }
}


// Aceso's Guiding Censer: on-hit เวทที่บัฟไว้ ติดตอนออโต้เข้าเป้า
export function supportOnHitBonus(u) {
  let v = 0;
  for (const b of u.buffs) if (b.type === "onHitMagic") v += b.v;
  return v;
}
