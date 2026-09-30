// ---------------------------------------------------------------
// จำแนกสกิล — หมวดหมู่ตามรูปแบบการออกท่า และหลบได้ไหม
//
// อยู่ใน src/ เพราะหน้าข้อมูลสกิลในเกมเรียกใช้ด้วย
// เครื่องมือฝั่ง node (_dodge.mjs · _skillmap.mjs · _champdoc.mjs) อ่านจากที่นี่เหมือนกัน
//
// สามทางที่ทำให้ท่าหนึ่งหลบได้:
//   1) เป็นลูกกระสุนหรือลำแสงที่ต้องบินไปหาเป้า — เดินออกจากแนวได้
//   2) มีหน่วงก่อนลง — เห็นวงแล้วเดินออกทัน
//   3) เป็นโซนที่ค้างอยู่กับที่ — เดินออกจากวงได้ตลอด
// ท่าที่ไม่มีสามอย่างนี้เลยคือลงทันทีที่กด หนีไม่พ้นไม่ว่าเดินเร็วแค่ไหน
// ---------------------------------------------------------------
import { tr } from "../i18n.js";

// หมวดหมู่ เรียงจาก "ยิงออกไปไกล" มาหา "ออกจากตัว" แล้วจบที่ท่าที่ไม่ทำดาเมจ
export const SKILL_CATS = [
  { key: "proj", icon: "🏹", th: "ลูกกระสุน", desc: "ยิงออกไปแล้วบินไปหาเป้า",
    types: ["line", "wave"] },
  { key: "beam", icon: "🔦", th: "ลำแสง", desc: "ยิงเป็นแนวยาว ชาร์จได้",
    types: ["chargedBeam", "rangeCharge"] },
  { key: "ground", icon: "⭕", th: "วงกลมบนพื้น", desc: "วางแล้วหน่วงก่อนระเบิด",
    types: ["aoeGround", "meteorStorm", "wonderland", "teaGarden", "starfall", "skyfall", "globalStrike", "barrage"] },
  { key: "zone", icon: "🟣", th: "โซนค้างที่", desc: "อยู่กับที่ เดินออกได้",
    types: ["basketZone", "truthAura", "wrathAura", "bloodStorm", "tempest", "sightZone", "cage", "domain", "vortex"] },
  { key: "self", icon: "💥", th: "ดาเมจรอบตัว", desc: "ระเบิดออกจากตัวทันที",
    types: ["aoeSelf", "twinCleave", "bounceSlash", "asuraSlam", "bladeTempest"] },
  { key: "cone", icon: "🔺", th: "กรวยด้านหน้า", desc: "กวาดเป็นกรวยออกจากตัว",
    types: ["cone", "coneKnock", "coneVolley", "channelCone", "thornCone"] },
  { key: "dash", icon: "🏃", th: "พุ่งเข้าชน", desc: "เคลื่อนที่เข้าใส่แล้วลงดาเมจ",
    types: ["dash", "chargeDash", "crossDash", "steerDash", "deltaDash", "lungeSweep", "chargeFling", "grabSlam", "blinkBehind", "carriage", "zephyr", "combo"] },
  { key: "onhit", icon: "⚔️", th: "ติดออโต้", desc: "พ่วงการโจมตีปกติครั้งถัดไป",
    types: ["onHit", "markNext", "pommel", "sledge"] },
  { key: "single", icon: "🎯", th: "เล็งตัวเดียว", desc: "เลือกเป้าแล้วลงทันที",
    types: ["targeted", "judgment", "dismissal", "rebound"] },
  { key: "buffself", icon: "🔵", th: "บัฟตัวเอง", desc: "ไม่ทำดาเมจเอง",
    types: ["selfBuff", "rampBuff", "mask", "vampForm", "lastStand", "submerge", "absorbReflect", "damageStash", "mistform", "skyward"] },
  { key: "buffally", icon: "💚", th: "ช่วยเพื่อน", desc: "ฮีล โล่ หรือบัฟให้เพื่อน",
    types: ["allyHot", "teamHeal", "allyBlink", "allyRush", "canopy", "guardBurst", "arbor"] },
  { key: "build", icon: "🧱", th: "สิ่งก่อสร้าง", desc: "วางของหรือเรียกตัวช่วยที่ถูกทุบได้",
    types: ["wall", "bunker", "summonGiant"] },
  { key: "dual", icon: "☯", th: "สองร่าง", desc: "สลับร่างแล้วได้คนละผล",
    types: ["dual"] },
];

const CAT_OF = {};
for (const c of SKILL_CATS) for (const t of c.types) CAT_OF[t] = c;

// ท่าที่ลงทันที แม้ข้อมูลไม่มีฟิลด์บอก — อ่านจากโค้ดในเอนจิน
const INSTANT_TYPES = new Set([
  "targeted", "onHit", "aoeSelf", "cone",
  "coneKnock", "coneVolley", "channelCone",
  "dash", "chargeDash", "crossDash", "steerDash", "deltaDash",
  "blinkBehind", "lungeSweep", "pommel", "grabSlam", "chargeFling",
  "judgment", "dismissal", "asuraSlam", "twinCleave", "bounceSlash",
  "globalStrike", "combo", "rebound",
  "vortex", "domain", "bladeTempest", "carriage",
]);
const ZONE_TYPES = new Set([
  "aoeGround", "meteorStorm", "wonderland", "teaGarden", "basketZone",
  "truthAura", "wrathAura", "cage", "sightZone", "bunker", "wall",
  "bloodStorm", "tempest", "starfall", "guardBurst", "thornCone", "arbor",
  "summonGiant", "skyfall",
]);
const NODMG_TYPES = new Set([
  "selfBuff", "allyHot", "teamHeal", "allyBlink", "allyRush", "canopy",
  "mistform", "skyward", "rampBuff", "mask", "markNext", "lastStand",
  "absorbReflect", "submerge", "vampForm", "formShift", "zephyr", "damageStash",
]);
// หน่วงที่ฝังอยู่ในโค้ด ไม่ได้ประกาศในข้อมูล
const CODED_DELAY = { barrage: 0.75 };
// ลูกกระสุนโดยปริยาย ไม่ประกาศความเร็วก็ใช้ BASE.projSpeed 1350
const DEFAULT_PROJ = new Set(["line", "wave"]);
const BEAM_TYPES = new Set(["chargedBeam", "snipe", "snipeCharge", "shredWave", "rangeCharge"]);

const travel = (sk) => {
  if (sk.instant) return 0;
  const v = sk.projSpeed || sk.speed || sk.lungeSpeed || 0;
  if (v) return v;
  return DEFAULT_PROJ.has(sk.type) ? 1350 : 0;
};
const wait = (sk) => (sk.delay || 0) + (sk.telegraph || 0) + (CODED_DELAY[sk.type] || 0);

export function categoryOf(sk) {
  return CAT_OF[sk && sk.type] || null;
}

// คืน { dodge, kind, label, why }
//   dodge = true/false/null (null = ไม่ทำดาเมจ)
export function dodgeOf(sk) {
  const t = sk.type;
  if (t === "dual") {
    const a = dodgeOf({ ...sk.light, key: sk.key });
    const b = dodgeOf({ ...sk.shadow, key: sk.key });
    if (a.dodge === false || b.dodge === false) {
      return { dodge: false, kind: "instant", label: "หลบไม่ได้",
        why: "ร่างหนึ่งลงทันทีที่กด" };
    }
    return { dodge: true, kind: a.kind, label: "หลบได้", why: "สองร่าง — " + a.why };
  }
  if (NODMG_TYPES.has(t)) return { dodge: null, kind: "none", label: "", why: "" };

  const v = travel(sk);
  if (v > 0) {
    const beam = BEAM_TYPES.has(t);
    return { dodge: true, kind: beam ? "beam" : "projectile",
      label: beam ? "ลำแสง — หลบได้" : "ลูกกระสุน — หลบได้",
      why: beam ? tr("ลำแสงวิ่งด้วยความเร็ว {0} เดินออกจากแนวได้", v)
        : tr("ลูกวิ่งด้วยความเร็ว {0} เดินออกจากแนวได้", v) };
  }
  const w = wait(sk);
  if (w > 0) {
    return { dodge: true, kind: "delay", label: "มีหน่วง — หลบได้",
      why: tr("หน่วง {0} วิ ก่อนลง เห็นวงแล้วเดินออกทัน", Math.round(w * 100) / 100) };
  }
  if (ZONE_TYPES.has(t)) {
    return { dodge: true, kind: "zone", label: "โซนค้างที่ — เดินออกได้",
      why: "วงค้างอยู่กับที่ เดินออกได้ตลอดเวลาที่มันอยู่" };
  }
  if (INSTANT_TYPES.has(t) || sk.instant) {
    return { dodge: false, kind: "instant", label: "ลงทันที — หลบไม่ได้",
      why: "ลงทันทีที่กด ไม่มีลูกให้หลบและไม่มีหน่วงให้เดินออก" };
  }
  return { dodge: null, kind: "unknown", label: "", why: "" };
}
