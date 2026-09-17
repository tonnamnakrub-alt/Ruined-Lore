// ---------------------------------------------------------------
// อ่านข้อมูลสกิลดิบ แล้วแปลงเป็นบรรทัดที่คนอ่านรู้เรื่อง
// ใช้ทั้งในหน้า Character Info, ร้านค้าตอนอัพสกิล, ระหว่างไฟต์
// ตัวเลขทั้งหมดดึงจาก data/champions.js ตรงๆ ไม่ได้พิมพ์ซ้ำ
// เลยไม่มีทางหลุดเวลาจูนบาลานซ์
// ---------------------------------------------------------------
import { tr } from "../i18n.js";

export const MAX_RANK = (sk) => (sk && sk.ult ? 3 : 5);

// รูปทรง/วิธีใช้ของสกิลแต่ละแบบ
const SHAPES = {
  onHit: "ติดที่ออโต้ครั้งถัดไป",
  cone: "กรวยด้านหน้า",
  chargeDash: "ชาร์จแล้วพุ่ง",
  grabSlam: "จับแล้วฟาด",
  dual: "สองร่าง สลับได้",
  aoeGround: "ลงพื้นเป็นวง",
  aoeSelf: "ระเบิดรอบตัว",
  allyHot: "ฮีลเพื่อนต่อเนื่อง",
  teamHeal: "ฮีลทั้งทีม",
  barrage: "ยิงรัว",
  cage: "กรงล้อม",
  chargedBeam: "ลำแสงชาร์จ",
  crossDash: "พุ่งกากบาท",
  dash: "พุ่ง",
  globalStrike: "ยิงข้ามสนาม",
  lastStand: "ยืนหยัดตอนใกล้ตาย",
  line: "เส้นตรงทะลุ",
  markNext: "ติดมาร์กไว้จุดระเบิด",
  selfBuff: "บัฟตัวเอง",
  skyfall: "ร่วงจากฟ้า",
  submerge: "ดำลงพื้นน้ำ",
  targeted: "ล็อกเป้า",
  vampForm: "ร่างแวมไพร์",
  wave: "คลื่นกระจาย",
  absorbReflect: "ดูดแล้วสะท้อน",
  blinkDash: "วาร์ป",
  burstShield: "โล่ระเบิด",
  pulse: "คลื่นเป็นจังหวะ",
};

// ฟิลด์ที่เปลี่ยนค่าตามแรงก์ — โชว์เป็นแถวเรียงทุกแรงก์
// fmt: n = ตัวเลข, pct = คูณ 100 ใส่ %, sec = วินาที
const RANKED = [
  ["dmg", "ดาเมจ", "n"],
  ["armDmg", "ดาเมจต่อแขน", "n"],
  ["heal", "ฮีล", "n"],
  ["shield", "โล่", "n"],
  ["hp", "เลือดที่ได้", "n"],
  ["pctMaxHp", "ดาเมจตาม Max HP เป้า", "pct"],
  ["slamPctMaxHp", "ดาเมจฟาดตาม Max HP", "pct"],
  ["bonusPct", "โบนัสจากดาเมจที่ลง", "pct"],
  ["reflect", "สะท้อนกลับ", "pct"],
  ["shred", "ลดเกราะ", "pct"],
  ["shredByRank", "ลดเกราะ", "pct"],
  ["slow", "สโลว์", "pct"],
  ["slowByRank", "สโลว์", "pct"],
  ["knockupByRank", "เวลาลอย", "sec"],
  ["asBuff", "เพิ่มความเร็วโจมตี", "pct"],
  ["adBuff", "เพิ่ม AD", "n"],
  ["adPct", "เพิ่ม AD", "pct"],
  ["msBuff", "เพิ่มความเร็วเดิน", "n"],
  ["msPct", "เพิ่มความเร็วเดิน", "pct"],
  ["radiusByRank", "รัศมี", "n"],
  ["cdByRank", "คูลดาวน์", "sec"],
];

// ฟิลด์ค่าคงที่ทุกแรงก์
const FLAT = [
  ["range", "ระยะ", "n"],
  ["minRange", "ระยะต่ำสุด", "n"],
  ["radius", "รัศมี", "n"],
  ["angle", "องศา", "deg"],
  ["width", "ความกว้าง", "n"],
  ["thickness", "ความหนา", "n"],
  ["armLen", "ความยาวแขน", "n"],
  ["armWidth", "ความกว้างแขน", "n"],
  ["dashRange", "ระยะพุ่ง", "n"],
  ["dashSpeed", "ความเร็วพุ่ง", "n"],
  ["grabRange", "ระยะจับ", "n"],
  ["engageRange", "ระยะเข้าปะทะ", "n"],
  ["count", "จำนวนลูก", "n"],
  ["charges", "ชาร์จเก็บได้", "n"],
  ["ammoMax", "กระสุนสูงสุด", "n"],
  ["rechargeTime", "เวลาชาร์จกระสุน", "sec"],
  ["cast", "เวลาร่าย", "sec"],
  ["delay", "หน่วงก่อนลง", "sec"],
  ["dur", "อยู่นาน", "sec"],
  ["buffDur", "บัฟอยู่นาน", "sec"],
  ["slowDur", "สโลว์นาน", "sec"],
  ["markDur", "มาร์กอยู่นาน", "sec"],
  ["window", "ต้องใช้ภายใน", "sec"],
  ["bleedDur", "เลือดไหลนาน", "sec"],
  ["shredDur", "ลดเกราะนาน", "sec"],
  ["tenacityDur", "ลดเวลาติดล็อกนาน", "sec"],
  ["lockTime", "ล็อกเป้านาน", "sec"],
  ["airborne", "ลอยกลางอากาศ", "sec"],
  ["airTime", "เวลาบิน", "sec"],
  ["knockup", "เวลาลอย", "sec"],
  ["knockback", "ผลักไกล", "n"],
  ["stunMin", "สตันต่ำสุด", "sec"],
  ["stunMax", "สตันสูงสุด", "sec"],
  ["landStun", "สตันตอนลง", "sec"],
  ["landSlow", "สโลว์ตอนลง", "pct"],
  ["landSlowDur", "สโลว์ตอนลงนาน", "sec"],
  ["tenacity", "ลดเวลาติดล็อก", "pct"],
  ["selfSlow", "ตัวเองช้าลง", "pct"],
  ["maxCharge", "ชาร์จได้ถึง", "sec"],
  ["fullCharge", "ชาร์จเต็มที่", "sec"],
  ["falloff", "ดาเมจซ้ำเหลือ", "pct"],
  ["edgeMult", "โดนขอบวงคูณ", "x"],
  ["soloMult", "โดนตัวเดียวคูณ", "x"],
  ["drain", "ดูดเลือดคืน", "pct"],
  ["extend", "ต่อเวลาได้", "sec"],
  ["cdRefundOnHit", "โดนแล้วคืนคูลดาวน์", "pct"],
  ["cdCutOnHit", "โดนแล้วลดคูลดาวน์", "sec"],
  ["cdCutAll", "ลดคูลดาวน์สกิลอื่น", "sec"],
  ["cdPerAuto", "ออโต้ลดคูลดาวน์", "sec"],
  ["speed", "ความเร็วกระสุน", "n"],
  ["projSpeed", "ความเร็วกระสุน", "n"],
  ["autoBoost", "เพิ่มระยะออโต้", "n"],
  ["skillBoost", "เพิ่มระยะสกิล", "n"],
  ["life", "กระสุนอยู่นาน", "sec"],
  ["daggerBleed", "พิษกริชนาน", "sec"],
];

// ค่าสเกลตามสถานะตัวเอง
const RATIOS = [
  ["adRatio", "AD"],
  ["badRatio", "Bonus AD"],
  ["apRatio", "AP"],
  ["bonusHpRatio", "Bonus HP"],
  ["armAdRatio", "AD (ต่อแขน)"],
  ["pctPerBad", "% Max HP ต่อ Bonus AD 100"],
];

const FLAGS = [
  ["magic", "ดาเมจเวท"],
  ["pierce", "ทะลุหลายตัว"],
  ["cleanse", "ล้างสถานะติดตัว"],
  ["slowImmune", "กันสโลว์"],
  ["flying", "ข้ามสิ่งกีดขวาง"],
  ["upTrue", "อัพเกรดแล้วเป็น True Damage"],
  ["fragCost", "กินชิ้นส่วน 1 ชิ้น"],
  ["shadowOnly", "ใช้ได้เฉพาะร่างเงา"],
];

const fmtOne = (v, fmt) => {
  if (fmt === "pct") return Math.round(v * 1000) / 10 + "%";
  if (fmt === "sec") return (Math.round(v * 100) / 100) + "s";
  if (fmt === "deg") return v + "°";
  if (fmt === "x") return "×" + v;
  return String(Math.round(v * 100) / 100);
};

export function skillShape(sk) {
  if (!sk) return "";
  const bits = [];
  if (SHAPES[sk.type]) bits.push(tr(SHAPES[sk.type]));
  if (sk.ult) bits.push(tr("ท่าไม้ตาย"));
  if (sk.magic) bits.push(tr("ดาเมจเวท"));
  return bits.join(" · ");
}

// แถวที่ค่าเปลี่ยนตามแรงก์
export function rankedRows(sk) {
  if (!sk) return [];
  const out = [];
  for (const [key, label, fmt] of RANKED) {
    const v = sk[key];
    if (!Array.isArray(v) || !v.length) continue;
    if (v.every((x) => typeof x !== "number")) continue;
    // ค่าเท่ากันทุกแรงก์ ไม่ต้องโชว์เป็นตาราง
    const same = v.every((x) => x === v[0]);
    out.push({ key, label: tr(label), fmt, values: v, flat: same });
  }
  // คูลดาวน์: ถ้าไม่มี cdByRank ใช้ cd เดี่ยว
  if (!sk.cdByRank && typeof sk.cd === "number") {
    out.push({ key: "cd", label: tr("คูลดาวน์"), fmt: "sec", values: [sk.cd], flat: true });
  }
  return out;
}

export function flatRows(sk) {
  if (!sk) return [];
  const out = [];
  for (const [key, label, fmt] of FLAT) {
    const v = sk[key];
    if (typeof v !== "number" || v === 0) continue;
    if (Array.isArray(sk[key])) continue;
    out.push({ label: tr(label), value: fmtOne(v, fmt) });
  }
  return out;
}

export function ratioLine(sk) {
  if (!sk) return "";
  const parts = [];
  for (const [key, label] of RATIOS) {
    const v = sk[key];
    if (typeof v !== "number" || v === 0) continue;
    parts.push("+" + Math.round(v * 100) + "% " + tr(label));
  }
  return parts.join(" · ");
}

export function flagLines(sk) {
  if (!sk) return [];
  return FLAGS.filter(([k]) => sk[k]).map(([, label]) => tr(label));
}

// สรุป "อัพจากแรงก์นี้ไปแรงก์หน้า ได้อะไรเพิ่ม"
export function nextRankGain(sk, rank) {
  if (!sk) return [];
  const max = MAX_RANK(sk);
  if (rank >= max) return [];
  const out = [];
  for (const r of rankedRows(sk)) {
    if (r.flat || r.values.length < max) continue;
    const now = rank > 0 ? r.values[rank - 1] : null;
    const next = r.values[rank];
    if (next == null) continue;
    if (now != null && now === next) continue;
    out.push({
      label: r.label,
      now: now == null ? null : fmtOne(now, r.fmt),
      next: fmtOne(next, r.fmt),
      better: now == null ? true : r.key === "cdByRank" ? next < now : next > now,
    });
  }
  return out;
}

// สกิลของร่างคู่ (dual) — คืนทั้งสองร่างให้ UI วนแสดง
export function subSkills(sk) {
  if (!sk) return [];
  const out = [];
  if (sk.light) out.push({ tag: tr("ร่างแสง"), sk: { ...sk.light, key: sk.key, cd: sk.cd, cdByRank: sk.cdByRank } });
  if (sk.shadow) out.push({ tag: tr("ร่างเงา"), sk: { ...sk.shadow, key: sk.key, cd: sk.cd, cdByRank: sk.cdByRank } });
  return out;
}

export function skillTitle(sk) {
  if (!sk) return "";
  if (sk.type === "dual") return sk.light.th + " / " + sk.shadow.th;
  return sk.th || "";
}

// ---------------------------------------------------------------
// ประโยคสรุปว่าสกิลนี้ "ทำอะไร" — ประกอบจากข้อมูลดิบ ไม่ได้พิมพ์มือทีละสกิล
// เลยไม่มีทางหลุดเวลาปรับตัวเลข และไม่ต้องตามแก้เวลามีตัวละครใหม่
// ตารางค่าตามแรงก์ยังอยู่ข้างล่างเหมือนเดิม อันนี้คือบรรทัดบนสุดที่อ่านแล้วเข้าใจทันที
// ---------------------------------------------------------------

// ท่อนแรก: ใช้ยังไง ไปไหน ไกลแค่ไหน
function actionClause(sk) {
  const r = sk.range, rad = sk.radius, w = sk.width;
  switch (sk.type) {
    case "aoeSelf": return tr("ระเบิดรอบตัวรัศมี {0} หน่วย", rad || 0);
    case "aoeGround": return tr("เล็งลงพื้นในระยะ {0} ระเบิดเป็นวงรัศมี {1} หน่วย", r || 0, rad || 0);
    case "line": return tr("ยิงเป็นเส้นตรงไกล {0} กว้าง {1} หน่วย", r || 0, w || sk.thickness || 0);
    case "wave": return tr("ปล่อยคลื่นกว้าง {0} วิ่งไปไกล {1} หน่วย", w || 0, r || 0);
    case "cone": return tr("กวาดเป็นกรวยด้านหน้าไกล {0} หน่วย", r || 0);
    case "targeted": return tr("ล็อกเป้าหมายเดียวในระยะ {0} หน่วย", r || 0);
    case "dash": return tr("พุ่งไปข้างหน้า {0} หน่วย", sk.dashRange || r || 0);
    case "blinkDash": return tr("วาร์ปไปที่จุดหมายในระยะ {0} หน่วย", r || 0);
    case "crossDash": return tr("พุ่งทะลุเป็นรูปกากบาทไกล {0} หน่วย", sk.armLen || r || 0);
    case "chargeDash": return tr("ชาร์จค้างไว้แล้วพุ่งทะยานไกล {0} หน่วย ยิ่งชาร์จนานยิ่งแรง", sk.dashRange || r || 0);
    case "chargedBeam": return tr("ชาร์จลำแสงแล้วยิงออกไปไกล {0} หน่วย", r || 0);
    case "grabSlam": return tr("คว้าศัตรูในระยะ {0} แล้วฟาดลงพื้น", sk.grabRange || r || 0);
    case "skyfall": return tr("กระโดดขึ้นฟ้าแล้วร่วงลงใส่จุดเป้าหมายในระยะ {0} หน่วย", r || 0);
    case "submerge": return tr("มุดลงไปใต้พื้น แล้วโผล่ขึ้นที่จุดเป้าหมายในระยะ {0} หน่วย", r || 0);
    case "cage": return tr("สร้างกรงล้อมรัศมี {0} หน่วย ขังศัตรูที่อยู่ข้างใน", rad || 0);
    case "barrage": return sk.ammoMax
      ? tr("ยิงกระสุนลงพื้นในระยะ {0} หน่วย เก็บกระสุนได้ {1} นัด", r || 0, sk.ammoMax)
      : tr("ยิงรัวใส่เป้าในระยะ {0} หน่วย", r || 0);
    case "globalStrike": return (r || 0) > 5000
      ? tr("โจมตีได้ทั่วทั้งสนาม ไม่จำกัดระยะ")
      : tr("โจมตีข้ามสนามถึงเป้าหมายไกลสุด {0} หน่วย", r || 0);
    case "markNext": return tr("แปะมาร์กไว้ที่เป้า แล้วจุดระเบิดทีหลัง");
    case "onHit": return tr("ติดอาวุธให้ออโต้ครั้งถัดไป");
    case "selfBuff": return tr("บัฟตัวเอง");
    case "teamHeal": return tr("ฮีลเพื่อนทั้งทีมพร้อมกัน");
    case "allyHot": return tr("ฮีลเพื่อนต่อเนื่องทีละนิด");
    case "lastStand": return tr("เข้าสู่โหมดยืนหยัด ตายยากขึ้นชั่วคราว");
    case "vampForm": return tr("แปลงเป็นร่างแวมไพร์");
    case "mistform": return tr("สลายร่างเป็นไอหมอก เร่งฝีเท้าและเดินทะลุยูนิตได้ · ระหว่างเปิดอัลติเปลี่ยนเป็นวาป {0} หน่วย", sk.blinkRange || 0);
    case "bloodStorm": return tr("แผ่พายุโลหิตรอบตัวรัศมี {0} หน่วย กัดทุกคนในวงทุก {1} วิ", rad || 0, sk.every || 0.5);
    case "absorbReflect": return tr("กางเกราะดูดซับดาเมจ แล้วสะท้อนกลับ");
    case "pulse": return tr("ปล่อยคลื่นเป็นจังหวะรอบตัวรัศมี {0} หน่วย", rad || 0);
    case "burstShield": return tr("กางโล่ แล้วระเบิดออกเมื่อโล่หมด");
    case "dual": return tr("มีสองร่าง สลับใช้คนละผล");
    default: return tr("ใช้สกิล");
  }
}

// ท่อนที่สอง: จังหวะเวลา
function timingClause(sk) {
  const out = [];
  if (sk.submergeFixed) out.push(tr("อยู่ใต้พื้น {0} วิ", sk.submergeFixed));
  else if (sk.submergeMax) out.push(tr("อยู่ใต้พื้นได้ถึง {0} วิ", sk.submergeMax));
  if (sk.surfaceDelay) out.push(tr("โผล่ขึ้นหลังจากนั้น {0} วิ", sk.surfaceDelay));
  if (sk.delay) out.push(tr("หน่วง {0} วิก่อนลง", sk.delay));
  if (sk.airborne || sk.airTime) out.push(tr("ลอยอยู่กลางอากาศ {0} วิ", sk.airborne || sk.airTime));
  if (sk.maxCharge) out.push(tr("ชาร์จได้ถึง {0} วิ", sk.maxCharge));
  return out;
}

// ท่อนที่สาม: ล็อกศัตรูยังไง
function ccClause(sk) {
  const out = [];
  const ku = sk.knockup || (Array.isArray(sk.knockupByRank) ? sk.knockupByRank[0] : 0);
  if (ku) out.push(tr("ลอยศัตรู (Knock Up) {0} วิ", ku));
  if (sk.knockback) out.push(tr("ผลักศัตรูออกไป {0} หน่วย", sk.knockback));
  if (sk.stun || sk.stunMin) out.push(tr("สตัน {0} วิ", sk.stun || sk.stunMin));
  if (sk.landStun) out.push(tr("ตอนลงพื้นสตันอีก {0} วิ", sk.landStun));
  if (sk.root) out.push(tr("ตรึงเท้าติดพื้น {0} วิ", sk.root));
  if (sk.fear) out.push(tr("ทำให้หนีกระเจิง {0} วิ", sk.fear));
  if (sk.taunt) out.push(tr("ยั่วให้เข้ามาตีเรา {0} วิ", sk.taunt));
  const slow = sk.slow || sk.slowFlat || (Array.isArray(sk.slowByRank) ? sk.slowByRank[0] : 0);
  const slowV = Array.isArray(slow) ? slow[0] : slow;
  if (slowV) out.push(tr("สโลว์ {0}%{1}", Math.round(slowV * 100), sk.slowDur ? tr(" นาน {0} วิ", sk.slowDur) : ""));
  if (sk.silence) out.push(tr("ปิดสกิล {0} วิ", sk.silence));
  const cm = Array.isArray(sk.charm) ? sk.charm[0] : sk.charm;
  if (cm) {
    out.push(tr("สะกดจิต (Charm) {0} วิ — ทำอะไรไม่ได้ แล้วเดินเข้าหาเราช้าลง {1}%",
      cm, Math.round((sk.charmSlow || 0) * 100)));
  }
  return out;
}

// ท่อนที่สี่: ช่วยฝั่งเรายังไง
function supportClause(sk) {
  const out = [];
  if (sk.heal || sk.healPct) out.push(tr("ฮีลให้เป้าหมาย"));
  if (sk.shield) out.push(tr("กางโล่ให้"));
  if (sk.drain) out.push(tr("ดูดเลือดคืน {0}% ของดาเมจที่ลง", Math.round(sk.drain * 100)));
  if (sk.cleanse) out.push(tr("ล้างสถานะติดตัวออก"));
  if (sk.slowImmune) out.push(tr("กันสโลว์ระหว่างใช้"));
  if (sk.unstoppable) out.push(tr("หยุดไม่ได้ระหว่างพุ่ง"));
  if (sk.asBuff || sk.adBuff || sk.adPct || sk.msBuff || sk.msPct) out.push(tr("ได้บัฟค่าสถานะชั่วคราว"));
  return out;
}

// ท่อนท้าย: ลูกเล่นเฉพาะตัว
function extraClause(sk) {
  const out = [];
  if (sk.pierce) out.push(tr("ทะลุโดนหลายตัว"));
  if (sk.soloMult) out.push(tr("ถ้าโดนตัวเดียวดาเมจคูณ {0}", sk.soloMult));
  if (sk.edgeMult) out.push(tr("โดนขอบวงดาเมจคูณ {0}", sk.edgeMult));
  if (sk.falloff) out.push(tr("ตัวถัดไปรับดาเมจเหลือ {0}%", Math.round(sk.falloff * 100)));
  if (sk.field) out.push(tr("ทิ้งพื้นที่ค้างไว้ {0} วิ", sk.field.dur));
  if (sk.shred || sk.shredByRank) out.push(tr("ลดเกราะเป้าหมาย"));
  if (sk.bleedDur) out.push(tr("ทำเลือดไหลต่อเนื่อง {0} วิ", sk.bleedDur));
  if (sk.flying) out.push(tr("ข้ามสิ่งกีดขวางได้"));
  if (sk.charges > 1) out.push(tr("เก็บชาร์จได้ {0} ครั้ง", sk.charges));
  if (sk.cdRefundOnHit) out.push(tr("โดนแล้วคืนคูลดาวน์ {0}%", Math.round(sk.cdRefundOnHit * 100)));
  if (sk.selfMaxHp) out.push(tr("ดาเมจบวกเพิ่มตาม Max HP ของเราเอง {0}%", +(sk.selfMaxHp * 100).toFixed(1)));
  if (sk.regen) out.push(tr("มีศัตรูอยู่ในวง เวลาไม่เดิน แถมคืนเวลาให้ {0} วิต่อจังหวะ (ไม่เกิน {1} วิ)", sk.regen, sk.dur));
  return out;
}


export function skillSentence(sk) {
  if (!sk) return "";
  if (sk.type === "dual") {
    const a = sk.light, b = sk.shadow;
    if (a && b) {
      return tr(
        "สลับได้สองร่าง — ร่างแสง: {0} · ร่างเงา: {1}",
        skillSentence({ ...a, key: sk.key }), skillSentence({ ...b, key: sk.key })
      );
    }
  }
  const bits = [actionClause(sk), ...timingClause(sk)];
  const dmgRow = Array.isArray(sk.dmg) && sk.dmg.some((x) => x > 0);
  if (dmgRow) bits.push(sk.magic ? tr("ทำดาเมจเวท") : tr("ทำดาเมจกายภาพ"));
  bits.push(...ccClause(sk), ...supportClause(sk), ...extraClause(sk));
  return bits.filter(Boolean).join(" · ");
}
