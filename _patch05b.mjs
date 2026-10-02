// ---------------------------------------------------------------
// Patch 0.5 — รอบบาลานซ์จริง (Last Patch for Patch 0.5 Balancing)
//
// 130 กว่าจุดใน 22 ตัว ไล่แทนข้อความทีละจุดเสี่ยงเกินไป
//
// ใช้ AST หา "ตำแหน่ง" ของค่าที่จะแก้ แล้วตัดต่อบนข้อความเดิมตรงๆ
// ไม่ให้ตัวพิมพ์ AST เขียนไฟล์กลับ — ลองแล้ว recast พิมพ์ใหม่ทั้งไฟล์
// ฟอร์แมตที่จัดมือไว้กับตำแหน่งคอมเมนต์หายหมด diff พุ่งเป็นพันบรรทัด
// วิธีนี้แตะแค่ไบต์ของค่าที่เปลี่ยนจริง diff จึงเท่ากับจำนวนจุดที่แก้
//
// ทุกบรรทัดประกาศค่าเดิมที่คาดไว้ ถ้าไม่ตรงจะล้มทั้งชุดก่อนเขียนไฟล์
// ไม่ปล่อยให้แก้ไปครึ่งๆ แล้วเหลือข้อมูลที่ไม่มีใครรู้ว่าสถานะอะไร
//
//   node _patch05b.mjs          แก้จริง
//   node _patch05b.mjs --check  ตรวจว่าค่าเดิมตรงทั้งหมดไหม ไม่เขียนไฟล์
// ---------------------------------------------------------------
import fs from "fs";
import * as parser from "@babel/parser";

const CHECK = process.argv.includes("--check");
const FILES = ["src/data/champions.js", "src/data/champions-lore.js", "src/data/champions-p4.js"];

// ---------------------------------------------------------------
// รายการแก้ — [ตัวละคร, ที่อยู่, ฟิลด์, ค่าเดิมที่คาด, ค่าใหม่]
// ที่อยู่: "PS" = ก้อนตั้งค่าพาสซีฟของตัวนั้น · "Q"/"W"/"E"/"R" = สกิล
//         "Q.steps[0]" = จังหวะคอมโบ · "ROOT" = ค่าสถานะระดับตัวละคร
// ---------------------------------------------------------------
const EDITS = [
  // ================= BUFF =================
  // ---- PIROSKA
  ["PIROSKA", "W", "heal", [100, 125, 150, 175, 200], [150, 180, 210, 240, 270]],
  ["PIROSKA", "W", "apRatio", 0.2, 0.4],
  ["PIROSKA", "W", "life", 10, 7.5],
  ["PIROSKA", "W", "every", 2, 1.5],
  ["PIROSKA", "W", "cd", 18, 7.5],
  ["PIROSKA", "W", "cdByRank", [18, 17, 16, 15, 14], [7.5, 7.5, 7.5, 7.5, 7.5]],
  ["PIROSKA", "W", "cdAfterDur", undefined, true],          // คูลดาวน์เริ่มนับหลังโซนหมด
  ["PIROSKA", "E", "msBuff", [0.3, 0.35, 0.4, 0.45, 0.5], [0.3, 0.325, 0.35, 0.375, 0.4]],
  ["PIROSKA", "E", "dur", 3, 3.5],
  ["PIROSKA", "E", "cd", 13, 8],
  ["PIROSKA", "E", "cdByRank", [13, 12, 11, 10, 9], [8, 8, 8, 8, 8]],
  ["PIROSKA", "R", "amp", [0.25, 0.35, 0.45], [0.25, 0.3, 0.35]],
  ["PIROSKA", "R", "dur", 7, 5],
  ["PIROSKA", "R", "cdByRank", [55, 50, 45], [50, 47.5, 45]],

  // ---- ALICE
  ["ALICE", "PS", "base", 0.0125, 0.04],
  ["ALICE", "PS", "perAp", 0.0002, 0.00015],
  ["ALICE", "W", "shield", [120, 180, 240, 300, 360], [150, 200, 250, 300, 350]],
  ["ALICE", "W", "shieldAp", 0.25, 0.4],
  ["ALICE", "W", "cd", 11, 8],
  ["ALICE", "W", "cdByRank", [11, 10.5, 10, 9.5, 9], [8, 8, 8, 8, 8]],

  // ---- PHANTOM
  ["PHANTOM", "PS", "base", 45, 95],
  ["PHANTOM", "PS", "slowDur", 1.25, 5],
  ["PHANTOM", "Q", "range", 800, 600],
  ["PHANTOM", "Q", "dmg", [50, 80, 110, 140, 170], [80, 100, 120, 140, 160]],
  ["PHANTOM", "Q", "badRatio", 0.55, 0.75],
  ["PHANTOM", "E", "cd", 12, 10],
  ["PHANTOM", "E", "cdByRank", [12, 11.5, 11, 10.5, 10], [10, 10, 10, 10, 10]],

  // ---- KAMACHI
  ["KAMACHI", "W", "dmg", [45, 70, 95, 120, 145], [80, 110, 140, 170, 200]],
  ["KAMACHI", "W", "badRatio", 0.5, 0.6],
  ["KAMACHI", "W", "radius", 325, 250],
  ["KAMACHI", "W", "cd", 9, 6],
  ["KAMACHI", "W", "cdByRank", [9, 8.5, 8, 7.5, 7], [6, 6, 6, 6, 6]],
  ["KAMACHI", "R", "dmg", [30, 50, 70], [35, 70, 105]],
  ["KAMACHI", "R", "badRatio", 0.25, 0.4],
  ["KAMACHI", "R", "cd", 75, 20],
  ["KAMACHI", "R", "cdByRank", [75, 65, 55], [20, 17.5, 15]],

  // ---- C.HOOK
  ["C.HOOK", "Q", "cd", 8, 6],
  ["C.HOOK", "Q", "cdByRank", [8, 7.5, 7, 6.5, 6], [6, 6, 6, 6, 6]],
  ["C.HOOK", "W", "bonusPct", [0.35, 0.45, 0.55, 0.65, 0.75], [0.5, 0.55, 0.6, 0.65, 0.7]],
  ["C.HOOK", "W", "cd", 14, 10],
  ["C.HOOK", "W", "cdByRank", [14, 13, 12, 11, 10], [10, 10, 10, 10, 10]],
  ["C.HOOK", "E", "rechargeTime", 20, 15],
  // ออโต้ที่ลงดึงเวลาชาร์จกระสุนให้มาถึงเร็วขึ้นเป็นวินาที (คริดึงมากกว่า)
  // ไม่ใช้ cdCutOnHit เพราะในเอนจินนั่นคือสัดส่วนของคูลดาวน์ที่เหลือ ไม่ใช่วินาที
  ["C.HOOK", "E", "rechargeCutOnAuto", undefined, 2],
  ["C.HOOK", "E", "rechargeCutOnCrit", undefined, 4],
  // "Start Fight with 3 charges" มีอยู่แล้ว — build-fight.js:137 ตั้ง ammo = ammoMax ทุกไฟต์

  // ---- JACK
  ["JACK", "W", "delay", 3.5, 3],
  ["JACK", "W", "auraSlow", [0.4, 0.425, 0.45, 0.475, 0.5], [0.35, 0.35, 0.35, 0.35, 0.35]],
  ["JACK", "W", "auraSlowPerAp", undefined, 0.001],         // +10% ต่อ AP 100

  // ---- TOTSAKAN
  ["TOTSAKAN", "ROOT", "itemAmpAll", undefined, true],       // ขยายค่าจากไอเทมทุกชนิด
  ["TOTSAKAN", "Q", "dmg", [50, 80, 110, 140, 170], [90, 110, 130, 150, 170]],
  ["TOTSAKAN", "Q", "range", 650, 450],
  ["TOTSAKAN", "Q", "width", 260, 300],

  // ---- ELLA
  ["ELLA", "Q.steps[0]", "dmg", [40, 65, 90, 115, 140], [70, 100, 130, 160, 190]],
  ["ELLA", "Q.steps[0]", "apRatio", 0.35, 0.45],
  ["ELLA", "Q.steps[2]", "dmg", [50, 80, 110, 140, 170], [75, 100, 125, 150, 175]],
  ["ELLA", "Q.steps[2]", "apRatio", 0.45, 0.5],
  ["ELLA", "Q.steps[2]", "pctMissingHp", [0.08, 0.09, 0.1, 0.11, 0.12], [0.1, 0.115, 0.13, 0.145, 0.16]],

  // ---- ALUCARD
  ["ALUCARD", "Q", "dmg", [60, 90, 120, 150, 180], [70, 100, 130, 160, 190]],
  ["ALUCARD", "Q", "badRatio", 0.6, 0.65],
  ["ALUCARD", "W", "cd", 12, 10],
  ["ALUCARD", "W", "cdByRank", [12, 11.5, 11, 10.5, 10], [10, 9.5, 9, 8.5, 8]],
  ["ALUCARD", "R", "msPct", [0.12, 0.16, 0.2], [0.15, 0.175, 0.2]],

  // ---- KLAEDER
  ["KLAEDER", "W", "shieldBonusHp", 0.15, undefined],        // เปลี่ยนไปอิง Max HP แทน
  ["KLAEDER", "W", "shieldMaxHp", undefined, 0.125],
  ["KLAEDER", "W", "cd", 14, 10],
  ["KLAEDER", "W", "cdByRank", [14, 13, 12, 11, 10], [10, 9.5, 9, 8.5, 8]],

  // ---- PETER
  ["PETER", "Q", "dmg", [15, 30, 45, 60, 75], [20, 35, 50, 65, 80]],
  ["PETER", "Q", "cd", 5, 4],
  ["PETER", "Q", "cdByRank", [5, 4.75, 4.5, 4.25, 4], [4, 3.75, 3.5, 3.25, 3]],

  // ---- FAUSTUS
  ["FAUSTUS", "E", "dmg", [60, 95, 130, 165, 200], [100, 120, 140, 160, 180]],
  ["FAUSTUS", "E", "apRatio", 0.3, 0.45],
  ["FAUSTUS", "E", "cd", 12, 10],
  ["FAUSTUS", "E", "cdByRank", [12, 11.5, 11, 10.5, 10], [10, 9.5, 9, 8.5, 8]],
  ["FAUSTUS", "R", "dmg", [125, 175, 225], [150, 225, 300]],
  ["FAUSTUS", "R", "apRatio", 0.2, 0.3],

  // ---- STEIN
  ["STEIN", "Q", "landStun", 0.5, 1],
  ["STEIN", "Q", "projSpeed", 1600, 1200],
  ["STEIN", "W", "root", [1, 1.2, 1.4, 1.6, 1.8], [1.2, 1.4, 1.6, 1.8, 2]],

  // ================= NERF =================
  // ---- PINO
  ["PINO", "Q", "dur", 1.5, 1],
  ["PINO", "W", "heal", [150, 225, 300, 375, 450], [100, 140, 180, 220, 260]],
  ["PINO", "R", "heal", [250, 450, 650], [150, 300, 450]],
  ["PINO", "R", "apRatio", 0.6, 0.5],

  // ---- HOOD
  ["HOOD", "ROOT", "range", 575, 550],
  ["HOOD", "PS", "pct", 1.75, 1.2],                         // คริไม่ได้ส่วนเกินพิเศษอีก
  ["HOOD", "PS", "dur", 3, 5],
  ["HOOD", "PS", "every", 0.5, 1],
  ["HOOD", "PS", "fromDealt", undefined, true],              // คิดจากดาเมจที่ลงจริง ไม่ใช่ส่วนเกินของคริ
  ["HOOD", "E", "range", 1500, 0],
  ["HOOD", "E", "radius", 350, 1000],

  // ---- ARTHUR
  ["ARTHUR", "PS", "pct", 0.1, 0.05],
  ["ARTHUR", "PS", "pctPerLevel", 0.005, undefined],
  ["ARTHUR", "PS", "pctByTier", undefined, [0.05, 0.075, 0.1]],
  ["ARTHUR", "PS", "lowPct", 0.15, 0.1],
  ["ARTHUR", "PS", "lowPctByTier", undefined, [0.1, 0.15, 0.2]],
  ["ARTHUR", "PS", "tiers", undefined, [1, 7, 13]],
  ["ARTHUR", "Q", "cleaveRatio", [0.35, 0.4, 0.45, 0.5, 0.55], [0.25, 0.275, 0.3, 0.325, 0.35]],
  ["ARTHUR", "W", "cd", 14, 12],
  ["ARTHUR", "W", "cdByRank", [14, 13, 12, 11, 10], [12, 11.5, 11, 10.5, 10]],
  ["ARTHUR", "E", "dashSpeed", 900, 500],
  ["ARTHUR", "E", "sweepRadius", 300, 200],
  ["ARTHUR", "R", "dmg", [175, 300, 450], [250, 400, 650]],
  ["ARTHUR", "R", "enemyMissingHp", 0.3, 0.25],
  ["ARTHUR", "R", "execPerBad", 0.00028571428571428574, undefined],
  ["ARTHUR", "R", "execAt", [0.15, 0.2, 0.25], undefined],   // ถอดการประหารออก

  // ---- H.S.B
  ["H.S.B", "R", "burstDmg", [150, 250, 350], undefined],
  ["H.S.B", "R", "burstBadRatio", 0.6, undefined],
  ["H.S.B", "R", "burstBonusHp", 0.1, undefined],
  ["H.S.B", "R", "radius", 750, 500],

  // ---- YODAKA
  ["YODAKA", "PS", "width", 120, 100],
  ["YODAKA", "PS", "base", 25, 15],
  ["YODAKA", "PS", "perLevel", 6.764705882352941, 5],
  ["YODAKA", "PS", "apRatio", 0.4, 0.35],
  ["YODAKA", "Q", "slowByRank", [0.3, 0.35, 0.4, 0.45, 0.5], [0.25, 0.25, 0.25, 0.25, 0.25]],

  // ---- LAURA
  ["LAURA", "Q", "dmg", [100, 135, 170, 205, 240], [80, 110, 140, 170, 200]],
  ["LAURA", "Q", "apRatio", 0.6, 0.5],
  ["LAURA", "R", "dmg", [15, 25, 35], [12, 20, 28]],
  ["LAURA", "R", "apRatio", 0.15, 0.12],

  // ---- PUSS
  ["PUSS", "Q", "range", 550, 350],
  ["PUSS", "W", "range", 550, 350],
  ["PUSS", "W", "angle", 45, 30],
  ["PUSS", "R", "range", 600, 450],

  // ---- KAZEM
  ["KAZEM", "E", "dashSpeed", 800, 500],
  ["KAZEM", "E", "knockback", 220, 150],
  ["KAZEM", "R", "lungeSpeed", 1000, 350],
  ["KAZEM", "R", "radiusByRank", [450, 500, 550], [400, 400, 400]],
  ["KAZEM", "R", "dmg", [200, 300, 400], [150, 250, 350]],
  ["KAZEM", "R", "slamPctMaxHp", [0.15, 0.2, 0.25], [0.15, 0.175, 0.2]],
  ["KAZEM", "R", "badRatio", 0.8, undefined],
  ["KAZEM", "R", "adRatio", undefined, 0.8],                 // เปลี่ยนจาก Bonus AD เป็น AD รวม

  // ---- NIAN
  ["NIAN", "Q", "dashSpeed", 800, 450],
  ["NIAN", "E", "range", 550, 400],
  ["NIAN", "E", "every", 0.25, 0.4],
];

// ---------------------------------------------------------------
// ตัวช่วยเดินใน AST
// ---------------------------------------------------------------
// เขียนค่าเป็นข้อความแบบเดียวกับที่ไฟล์ข้อมูลเขียนอยู่
const lit = (v) => {
  if (Array.isArray(v)) return "[" + v.map(lit).join(", ") + "]";
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (typeof v === "string") return JSON.stringify(v);
  throw new Error("ไม่รู้จะเขียนค่า " + JSON.stringify(v));
};

// อ่านค่าคงที่ออกจาก node เพื่อเทียบกับค่าเดิมที่คาด
const T = (node, kind) => node && node.type === kind;

const val = (node) => {
  if (!node) return undefined;
  if (T(node, "NumericLiteral") || T(node, "StringLiteral") || T(node, "BooleanLiteral")) return node.value;
  if (T(node, "UnaryExpression") && node.operator === "-") return -val(node.argument);
  if (T(node, "ArrayExpression")) return node.elements.map(val);
  // ซอร์สเขียนบางค่าเป็นสูตร เช่น (140 - 25) / 17 — คิดเลขให้เทียบได้
  if (T(node, "BinaryExpression")) {
    const l = val(node.left), r = val(node.right);
    if (typeof l === "number" && typeof r === "number") {
      if (node.operator === "/") return l / r;
      if (node.operator === "*") return l * r;
      if (node.operator === "+") return l + r;
      if (node.operator === "-") return l - r;
    }
  }
  return "(นิพจน์)";
};

const propName = (p) => (p.key.name != null ? p.key.name : p.key.value);
const findProp = (obj, name) => (obj.properties || []).find((p) => T(p, "ObjectProperty") && propName(p) === name);

// เดิน AST เองแทน recast.types.visit — หาออบเจกต์ที่มี id: "XXX"
function champObj(ast, id) {
  let found = null;
  const walk = (node) => {
    if (!node || typeof node !== "object" || found) return;
    if (Array.isArray(node)) { for (const x of node) walk(x); return; }
    if (node.type === "ObjectExpression") {
      const idp = findProp(node, "id");
      if (idp && val(idp.value) === id) { found = node; return; }
    }
    for (const k of Object.keys(node)) {
      if (k === "loc" || k === "leadingComments" || k === "trailingComments") continue;
      walk(node[k]);
    }
  };
  walk(ast);
  return found;
}

// หาก้อนตั้งค่าพาสซีฟ = พร็อพแรกที่เป็นออบเจกต์และไม่ใช่ passive/skills
function passiveCfg(champ) {
  for (const p of champ.properties) {
    if (!T(p, "ObjectProperty")) continue;
    const nm = propName(p);
    if (nm === "passive" || nm === "skills") continue;
    if (T(p.value, "ObjectExpression")) return p.value;
    // ARTHUR aegis / H.S.B threePigs เป็นอาเรย์ของออบเจกต์ ข้ามไป
  }
  return null;
}

function skillObj(champ, key) {
  const sk = findProp(champ, "skills");
  if (!sk || !T(sk.value, "ArrayExpression")) return null;
  for (const el of sk.value.elements) {
    if (!T(el, "ObjectExpression")) continue;
    const k = findProp(el, "key");
    if (k && val(k.value) === key) return el;
  }
  return null;
}

function resolveWhere(champ, where, id) {
  if (where === "ROOT") return champ;
  if (where === "PS") {
    const o = passiveCfg(champ);
    if (!o) throw new Error(id + ": หาก้อนตั้งค่าพาสซีฟไม่เจอ");
    return o;
  }
  const m = where.match(/^([QWER])(?:\.steps\[(\d+)\])?$/);
  if (!m) throw new Error(id + ": ที่อยู่ไม่รู้จัก " + where);
  const sk = skillObj(champ, m[1]);
  if (!sk) throw new Error(id + " " + m[1] + ": หาสกิลไม่เจอ");
  if (m[2] == null) return sk;
  const steps = findProp(sk, "steps");
  if (!steps || !T(steps.value, "ArrayExpression")) throw new Error(id + " " + m[1] + ": ไม่มี steps");
  const st = steps.value.elements[Number(m[2])];
  if (!st) throw new Error(id + " " + where + ": ไม่มีจังหวะนั้น");
  return st;
}

const same = (a, b2) => {
  if (typeof a === "number" && typeof b2 === "number") return Math.abs(a - b2) < 1e-9;
  if (Array.isArray(a) && Array.isArray(b2)) return a.length === b2.length && a.every((x, i) => same(x, b2[i]));
  return JSON.stringify(a) === JSON.stringify(b2);
};

// ---------------------------------------------------------------
// ---------------------------------------------------------------
// ลงมือ — ใช้ AST หาตำแหน่ง แล้วตัดต่อบนข้อความเดิม
// ---------------------------------------------------------------
const parsed = {};
for (const f of FILES) {
  const raw = fs.readFileSync(f, "utf8");
  const crlf = raw.includes("\r\n");
  const src = crlf ? raw.replace(/\r\n/g, "\n") : raw;
  parsed[f] = {
    src, crlf,
    ast: parser.parse(src, { sourceType: "module", ranges: true }),
    patches: [],    // { start, end, text }
  };
}

const problems = [];
let done = 0, added = 0, removed = 0;

for (const [id, where, field, wantOld, newVal] of EDITS) {
  let champ = null, file = null;
  for (const f of FILES) {
    const c = champObj(parsed[f].ast, id);
    if (c) { champ = c; file = f; break; }
  }
  if (!champ) { problems.push(id + ": หาตัวละครไม่เจอในไฟล์ไหนเลย"); continue; }

  let target;
  try { target = resolveWhere(champ, where, id); } catch (e) { problems.push(e.message); continue; }

  const prop = findProp(target, field);
  const haveOld = prop ? val(prop.value) : undefined;

  if (!same(haveOld, wantOld)) {
    problems.push(id + " " + where + "." + field + ": ค่าเดิมควรเป็น " + JSON.stringify(wantOld)
      + " แต่ในไฟล์เป็น " + JSON.stringify(haveOld));
    continue;
  }
  if (CHECK) { done++; continue; }

  const P = parsed[file];
  if (newVal === undefined) {
    if (!prop) continue;
    // ถอดพร็อพทิ้งทั้งก้อน รวมคอมมาที่ตามมาและช่องว่างที่ค้าง
    let a = prop.start, e = prop.end;
    while (e < P.src.length && (P.src[e] === " " || P.src[e] === "\t")) e++;
    if (P.src[e] === ",") {
      e++;
      while (e < P.src.length && (P.src[e] === " " || P.src[e] === "\t")) e++;
    } else {
      while (a > 0 && (P.src[a - 1] === " " || P.src[a - 1] === "\t")) a--;
      if (P.src[a - 1] === ",") a--;
    }
    P.patches.push({ start: a, end: e, text: "" });
    removed++;
  } else if (prop) {
    P.patches.push({ start: prop.value.start, end: prop.value.end, text: lit(newVal) });
    done++;
  } else {
    // ไม่มีฟิลด์นี้ — แทรกก่อนปิดปีกกาของออบเจกต์เป้าหมาย
    const close = target.end - 1;                  // ตำแหน่งของ }
    let a = close;
    while (a > 0 && /\s/.test(P.src[a - 1])) a--;
    const before = P.src[a - 1];
    const needComma = before !== "," && before !== "{";
    P.patches.push({ start: a, end: a, text: (needComma ? ", " : " ") + field + ": " + lit(newVal) });
    added++;
  }
}

if (problems.length) {
  console.error("ล้มทั้งชุด ไม่เขียนไฟล์ — ค่าเดิมไม่ตรง " + problems.length + " จุด:\n");
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
if (CHECK) {
  console.log("ค่าเดิมตรงทั้ง " + done + " จุด พร้อมแก้");
  process.exit(0);
}

for (const f of FILES) {
  const P = parsed[f];
  // ตัดต่อจากท้ายไปหัว ตำแหน่งที่คำนวณไว้จะไม่เลื่อน
  P.patches.sort((x, y) => y.start - x.start);
  let out = P.src;
  let prev = Infinity;
  for (const p of P.patches) {
    if (p.end > prev) throw new Error(f + ": ช่วงที่แก้ทับกัน ไม่เขียนไฟล์");
    out = out.slice(0, p.start) + p.text + out.slice(p.end);
    prev = p.start;
  }
  fs.writeFileSync(f, P.crlf ? out.replace(/\n/g, "\r\n") : out);
}
console.log("แก้ " + done + " จุด · เพิ่มฟิลด์ใหม่ " + added + " · ถอดออก " + removed
  + "  (รวม " + EDITS.length + " รายการ)");
