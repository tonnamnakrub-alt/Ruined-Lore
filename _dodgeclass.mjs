// ---------------------------------------------------------------
// จำแนกว่าสกิลแต่ละท่า "หลบได้ไหม" — แหล่งเดียวของทั้งโปรเจกต์
//
// ใช้ทั้งใน _dodge.mjs (รายงานสรุป) และ _champdoc.mjs (ติดป้ายในหน้าสกิล)
//
// ในเอนจินนี้มีสามทางที่ทำให้ท่าหนึ่งหลบได้:
//   1) เป็นลูกกระสุนหรือลำแสงที่ต้องบินไปหาเป้า — เดินออกจากแนวได้
//   2) มีหน่วงก่อนลง — เห็นวงแล้วเดินออกทัน
//   3) เป็นโซนที่ค้างอยู่กับที่ — เดินออกจากวงได้ตลอด
//
// ท่าที่ไม่มีสามอย่างนี้เลยคือ "ลงทันทีที่กด" ไม่ว่าจะเดินเร็วแค่ไหนก็หนีไม่พ้น
// ---------------------------------------------------------------

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
// โซนค้างที่ หรือออร่า — เดินออกได้ตลอดเวลา
const ZONE_TYPES = new Set([
  "aoeGround", "meteorStorm", "wonderland", "teaGarden", "basketZone",
  "truthAura", "wrathAura", "cage", "sightZone", "bunker", "wall",
  "bloodStorm", "tempest", "starfall", "guardBurst", "thornCone", "arbor",
  "summonGiant", "skyfall",
]);
// ท่าที่ไม่ทำดาเมจเลย — ไม่เกี่ยวกับการหลบ
const NODMG_TYPES = new Set([
  "selfBuff", "allyHot", "teamHeal", "allyBlink", "allyRush", "canopy",
  "mistform", "skyward", "rampBuff", "mask", "markNext", "lastStand",
  "absorbReflect", "submerge", "vampForm", "formShift", "zephyr", "damageStash",
]);
// ท่าที่หน่วงเวลาไว้ในโค้ด ไม่ได้ประกาศในข้อมูล
const CODED_DELAY = { barrage: 0.75 };
// ท่าที่เป็นลูกกระสุนโดยปริยาย ไม่ประกาศความเร็วก็ใช้ BASE.projSpeed 1350
const DEFAULT_PROJ = new Set(["line", "wave"]);
// ท่าที่เป็นลำแสงยิงยาว ไม่ใช่ลูกกลม
const BEAM_TYPES = new Set(["chargedBeam", "snipe", "snipeCharge", "shredWave", "rangeCharge"]);

const travel = (sk) => {
  if (sk.instant) return 0;
  const v = sk.projSpeed || sk.speed || sk.lungeSpeed || 0;
  if (v) return v;
  return DEFAULT_PROJ.has(sk.type) ? 1350 : 0;
};
const wait = (sk) => (sk.delay || 0) + (sk.telegraph || 0) + (CODED_DELAY[sk.type] || 0);

// คืน { dodge, kind, label, why }
//   dodge = true/false/null (null = ไม่ทำดาเมจ)
//   kind  = "projectile" | "beam" | "delay" | "zone" | "instant" | "none"
export function dodgeOf(sk) {
  const t = sk.type;
  if (t === "dual") {
    const a = dodgeOf({ ...sk.light, key: sk.key });
    const b = dodgeOf({ ...sk.shadow, key: sk.key });
    if (a.dodge === false || b.dodge === false) {
      return { dodge: false, kind: "instant", label: "🔴 หลบไม่ได้",
        why: "ร่างแสง " + a.label.replace(/^\S+\s/, "") + " · ร่างเงา " + b.label.replace(/^\S+\s/, "") };
    }
    return { dodge: true, kind: a.kind, label: "🟢 หลบได้", why: "สองร่าง — " + a.why };
  }
  if (NODMG_TYPES.has(t)) return { dodge: null, kind: "none", label: "", why: "" };

  const v = travel(sk);
  if (v > 0) {
    const beam = BEAM_TYPES.has(t);
    return { dodge: true, kind: beam ? "beam" : "projectile",
      label: beam ? "🟢 ลำแสง — หลบได้" : "🟢 ลูกกระสุน — หลบได้",
      why: (beam ? "ลำแสงวิ่งด้วยความเร็ว " : "ลูกวิ่งด้วยความเร็ว ") + v + " เดินออกจากแนวได้" };
  }
  const w = wait(sk);
  if (w > 0) {
    return { dodge: true, kind: "delay", label: "🟢 มีหน่วง — หลบได้",
      why: "หน่วง " + (Math.round(w * 100) / 100) + " วิ ก่อนลง เห็นวงแล้วเดินออกทัน" };
  }
  if (ZONE_TYPES.has(t)) {
    return { dodge: true, kind: "zone", label: "🟢 โซนค้างที่ — เดินออกได้",
      why: "วงค้างอยู่กับที่ เดินออกได้ตลอดเวลาที่มันอยู่" };
  }
  if (INSTANT_TYPES.has(t) || sk.instant) {
    return { dodge: false, kind: "instant", label: "🔴 ลงทันที — หลบไม่ได้",
      why: "ลงทันทีที่กด ไม่มีลูกให้หลบและไม่มีหน่วงให้เดินออก" };
  }
  return { dodge: null, kind: "unknown", label: "⚠️ ยังจัดกลุ่มไม่ได้", why: "ชนิด " + t };
}
