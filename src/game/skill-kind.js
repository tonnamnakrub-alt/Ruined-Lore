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
    types: ["line", "wave", "sledge"] },
  { key: "slash", icon: "🗡", th: "แนวยาวลงทันที", desc: "กินทั้งแนวในเฟรมเดียว ไม่มีลูกให้หลบ",
    types: [] },
  // ไม่ใช่ลำแสง — ทั้งสองชนิดนี้ push ลูกเข้า state.projectiles จริง ลำแสงเป็นแค่เอฟเฟกต์ภาพ
  { key: "beam", icon: "🔋", th: "ชาร์จยิง", desc: "ง้างค้างไว้แล้วยิงเป็นลูกที่บินไป ชาร์จนานยิ่งไกลและกว้าง",
    types: ["chargedBeam", "rangeCharge"] },
  { key: "ground", icon: "⭕", th: "วงกลมบนพื้น", desc: "วางแล้วหน่วงก่อนระเบิด",
    types: ["aoeGround", "meteorStorm", "wonderland", "teaGarden", "starfall", "skyfall", "globalStrike", "barrage", "submerge"] },
  { key: "zone", icon: "🟣", th: "โซนค้างที่", desc: "อยู่กับที่ เดินออกได้",
    types: ["basketZone", "truthAura", "wrathAura", "bloodStorm", "tempest", "sightZone", "cage", "domain", "vortex"] },
  { key: "self", icon: "💥", th: "ดาเมจรอบตัว", desc: "ระเบิดออกจากตัวทันที",
    types: ["aoeSelf", "twinCleave", "bounceSlash", "asuraSlam", "bladeTempest", "pulse"] },
  { key: "cone", icon: "🔺", th: "กรวยด้านหน้า", desc: "กวาดเป็นกรวยออกจากตัว",
    types: ["cone", "coneKnock", "coneVolley", "channelCone", "thornCone"] },
  { key: "dash", icon: "🏃", th: "พุ่งเข้าชน", desc: "เคลื่อนที่เข้าใส่แล้วลงดาเมจ",
    types: ["dash", "chargeDash", "crossDash", "steerDash", "deltaDash", "lungeSweep", "chargeFling", "blinkBehind", "carriage", "zephyr", "combo", "blinkDash"] },
  { key: "lock", icon: "🔒", th: "จับล็อกเป้า", desc: "ล็อกเป้าแล้วขังไว้ เป้าดิ้นไม่หลุด",
    types: ["grabSlam", "dismissal"] },
  { key: "onhit", icon: "⚔️", th: "ติดออโต้", desc: "พ่วงการโจมตีปกติครั้งถัดไป",
    types: ["onHit", "markNext", "pommel"] },
  { key: "single", icon: "🎯", th: "เล็งตัวเดียว", desc: "เลือกเป้าแล้วลงทันที",
    types: ["targeted", "judgment", "rebound"] },
  { key: "buffself", icon: "🔵", th: "บัฟตัวเอง", desc: "ไม่ทำดาเมจเอง",
    types: ["selfBuff", "rampBuff", "mask", "vampForm", "lastStand", "absorbReflect", "damageStash", "mistform", "skyward", "burstShield"] },
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
  "absorbReflect", "vampForm", "formShift", "zephyr", "damageStash",
  "blinkDash",   // LUCH E ร่างแสง — วาร์ปเฉยๆ ไม่มีดาเมจ
]);
// ดาเมจไม่ได้ลงตอนกด แต่เข้าคิวไว้ลงทีหลัง — เดินออกก่อนถึงเวลาได้
//   pulse       LUCH Q ร่างเงา — เข้าคิว state.pulses สามระลอกใน 1.5 วิ
//   burstShield LUCH W ร่างเงา — u.pendingBurst ระเบิดหลังโล่หมดอายุ 3 วิ
//   submerge    ARIEL E — มุดน้ำแล้วโผล่ขึ้นมาทุบทีหลัง เข้าคิว state.submerges
const DEFERRED_TYPES = new Set(["pulse", "burstShield", "submerge"]);
// หน่วงที่ฝังอยู่ในโค้ด ไม่ได้ประกาศในข้อมูล
const CODED_DELAY = { barrage: 0.75 };
// ลูกกระสุนโดยปริยาย ไม่ประกาศความเร็วก็ใช้ BASE.projSpeed 1350
const DEFAULT_PROJ = new Set(["line", "wave"]);
// ชนิดที่ต้องง้างก่อนยิง แต่สุดท้ายก็เป็นลูกกระสุนเหมือนกัน
const CHARGED_TYPES = new Set(["chargedBeam", "snipe", "snipeCharge", "shredWave", "rangeCharge"]);

const travel = (sk) => {
  if (sk.instant) return 0;
  // lungeSpeed ไม่นับ — นั่นคือความเร็วที่ "คนร่ายพุ่งเข้าไปหา" ไม่ใช่ลูกที่เป้าหลบได้
  // เคยนับรวมไว้ ทำให้ KAZEM R (จับล็อกเป้า) ถูกติดป้ายว่าหลบได้ ซึ่งผิด
  const v = sk.projSpeed || sk.speed || 0;
  if (v) return v;
  return DEFAULT_PROJ.has(sk.type) ? 1350 : 0;
};
const wait = (sk) => (sk.delay || 0) + (sk.telegraph || 0) + (CODED_DELAY[sk.type] || 0);

export function categoryOf(sk) {
  return CAT_OF[sk && sk.type] || null;
}

// ---------------------------------------------------------------
// ท่าหนึ่งมักมีหลายส่วนในท่าเดียว — ARTHUR E พุ่งเข้าไป กวาดรอบตัว แล้วได้โล่
// จัดหมวดเดียวจึงบอกไม่ครบ ที่นี่คืนทุกหมวดที่ท่านั้นมีจริง
//
// หมวดแรกคือหมวดหลัก (มาจากชนิดของท่า) ที่เหลืออ่านจากฟิลด์ในข้อมูล
// ไม่ได้เดาจากชื่อท่า — ถ้าไม่มีฟิลด์นั้นก็ไม่ติดป้ายนั้น
// ---------------------------------------------------------------
const CAT_BY_KEY = Object.fromEntries(SKILL_CATS.map((c) => [c.key, c]));

// ท่าที่บัฟตัวเองอยู่ในโค้ดเอนจิน ไม่มีฟิลด์ในข้อมูลให้จับ
//   submerge  ARIEL E — มุดน้ำแล้วได้ untargetable กับ invuln ระหว่างมุด
const SELF_BUFF_IN_CODE = new Set(["submerge", "pulse"]);

function extraKeys(sk) {
  const k = new Set();
  if (SELF_BUFF_IN_CODE.has(sk.type)) k.add("buffself");
  const dmg = Array.isArray(sk.dmg) || Array.isArray(sk.sweepDmg) || Array.isArray(sk.hitDmg)
    || Array.isArray(sk.aoeDmg) || Array.isArray(sk.burstDmg);
  // เคลื่อนที่เข้าไปเอง
  if (sk.dashRange || sk.dashSpeed || sk.blinkRange || sk.lungeRange) k.add("dash");
  // ล็อกเป้าไว้
  if (sk.lockTime || sk.grabRange || sk.suppress) k.add("lock");
  // ลูกที่บินไป — ลำแสงก็เป็นลูกที่บินอยู่แล้ว ไม่ต้องติดซ้ำ
  const pk = (CAT_OF[sk.type] || {}).key;
  if ((sk.projSpeed || sk.speed) && !sk.instant && pk !== "beam") k.add("proj");
  // วงระเบิดรอบตัวหรือรอบจุดที่ลง
  if (dmg && (sk.sweepRadius || sk.hitRadius || sk.radiusByRank || sk.burstRadius || sk.aoeDmg
    || sk.cleaveRadius)) k.add("self");
  // ท่าที่หมวดหลักไม่ใช่พื้นที่อยู่แล้ว แต่มี radius กับดาเมจ = มีวงกระแทกตอนลงด้วย
  //   KAZEM E พุ่งชนแล้วระเบิดรัศมี 250 · JACK R ทุบพื้นก่อนยักษ์ยืนขึ้น
  const primary = (CAT_OF[sk.type] || {}).key;
  if (dmg && sk.radius && ["dash", "lock", "build", "onhit", "single"].includes(primary)) k.add("self");
  // กรวย
  if (sk.angle && sk.count) k.add("cone");
  // ทิ้งพื้นที่ไว้หลังลง
  if (sk.groundBurn || sk.pool || sk.zoneBleed) k.add("zone");
  // ไม่ติดป้ายสิ่งก่อสร้างจากฟิลด์ pet เฉยๆ เพราะ JACK E แค่บัฟยักษ์ที่ JACK R เรียกมา
  // หมวดนี้มาจากชนิดของท่าอย่างเดียว (summonGiant / wall / bunker)
  // โล่หรือบัฟให้ตัวเอง
  if (sk.aegis || sk.castShield || sk.dualShield || (sk.shield && !sk.share && !sk.targets)) k.add("buffself");
  // ฮีลหรือโล่ให้เพื่อน
  if (sk.share || sk.targets || sk.allyPct || sk.allyResPct) k.add("buffally");
  return k;
}

export function categoriesOf(sk) {
  if (!sk) return [];
  const out = [];
  const seen = new Set();
  const push = (c) => { if (c && !seen.has(c.key)) { seen.add(c.key); out.push(c); } };

  // instant ทับหมวดลูกกระสุน — TOTSAKAN Q เป็นแนวยาวที่กินทั้งแนวในเฟรมเดียว
  // ไม่มีลูกให้หลบ จึงเรียกว่าลูกกระสุนไม่ได้
  const primary = categoryOf(sk);
  push(sk.instant && primary && primary.key === "proj" ? CAT_BY_KEY.slash : primary);

  if (sk.type === "combo" && Array.isArray(sk.steps)) {
    // คอมโบ — แต่ละจังหวะคนละรูปทรง ดูให้ครบทุกจังหวะ
    for (const st of sk.steps) {
      if (st.dashRange) push(CAT_BY_KEY.dash);
      if (st.radius || st.halfCircle) push(CAT_BY_KEY.self);
      if (st.backstep) push(CAT_BY_KEY.dash);
    }
  }
  if (sk.type === "dual") {
    for (const form of [sk.light, sk.shadow]) {
      if (!form) continue;
      push(categoryOf(form));
      for (const key of extraKeys(form)) push(CAT_BY_KEY[key]);
    }
  }
  for (const key of extraKeys(sk)) push(CAT_BY_KEY[key]);
  return out;
}

// คืน { dodge, kind, label, why }
//   dodge = true/false/null (null = ไม่ทำดาเมจ)
export function dodgeOf(sk) {
  const t = sk.type;
  if (t === "dual") {
    const a = dodgeOf({ ...sk.light, key: sk.key });
    const b = dodgeOf({ ...sk.shadow, key: sk.key });
    // ร่างไหนหลบไม่ได้ ก็ถือว่าท่านี้หลบไม่ได้ เพราะผู้เล่นเลือกร่างได้เอง
    if (a.dodge === false || b.dodge === false) {
      return { dodge: false, kind: "instant", label: "หลบไม่ได้", why: "ร่างหนึ่งลงทันทีที่กด" };
    }
    // ทั้งสองร่างไม่ทำดาเมจ = ท่าบัฟล้วน ไม่เกี่ยวกับการหลบ
    if (a.dodge === null && b.dodge === null) return { dodge: null, kind: "none", label: "", why: "" };
    const hit = a.dodge === true ? a : b;
    return { dodge: true, kind: hit.kind, label: hit.label, why: "สองร่าง — " + hit.why };
  }
  if (NODMG_TYPES.has(t)) return { dodge: null, kind: "none", label: "", why: "" };
  if (DEFERRED_TYPES.has(t)) {
    return { dodge: true, kind: "delay", label: "ลงทีหลัง — หลบได้",
      why: "ดาเมจไม่ได้ลงตอนกด แต่เข้าคิวไว้ลงทีหลัง เดินออกก่อนถึงเวลาได้" };
  }

  const v = travel(sk);
  if (v > 0) {
    const charged = CHARGED_TYPES.has(t);
    return { dodge: true, kind: charged ? "beam" : "projectile",
      label: "ลูกกระสุน — หลบได้",
      why: tr("ลูกวิ่งด้วยความเร็ว {0} เดินออกจากแนวได้", v) };
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
