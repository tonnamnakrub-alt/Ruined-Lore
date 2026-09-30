// ---------------------------------------------------------------
// แผนผังหมวดหมู่สกิลทั้งเกม — แยกละเอียดตามรูปแบบการออกท่า
//
// ใช้ตอนวางแพตช์: อยากกดสายไหน เปิดหมวดนั้นแล้วเห็นทุกท่าพร้อมกัน
// แนบด้วยว่าหลบได้ไหม สัดส่วนดาเมจเท่าไหร่ และเจ้าของท่าชนะแมตช์กี่ %
//
//   node _skillmap.mjs
// ---------------------------------------------------------------
import fs from "fs";
import { CHAMPIONS } from "./src/data/champions.js";
import { dodgeOf } from "./_dodgeclass.mjs";

// ---------------------------------------------------------------
// หมวดหมู่ — เรียงจาก "ยิงออกไปไกล" มาหา "ออกจากตัว" แล้วจบที่ท่าที่ไม่ทำดาเมจ
// ---------------------------------------------------------------
const CATS = [
  { key: "proj", th: "🏹 ลูกกระสุน — ยิงออกไปแล้วบินไปหาเป้า", types: ["line", "wave"] },
  { key: "beam", th: "🔦 ลำแสง / ชาร์จยิง — ยิงเป็นแนวยาว", types: ["chargedBeam", "rangeCharge"] },
  { key: "ground", th: "⭕ วงกลมบนพื้น — วางแล้วหน่วงก่อนระเบิด", types: ["aoeGround", "meteorStorm", "wonderland", "teaGarden", "starfall", "skyfall", "globalStrike", "barrage"] },
  { key: "zone", th: "🟣 โซนค้างที่ / ออร่า — อยู่กับที่ เดินออกได้", types: ["basketZone", "truthAura", "wrathAura", "bloodStorm", "tempest", "sightZone", "cage", "domain", "vortex"] },
  { key: "self", th: "💥 ดาเมจรอบตัว — ระเบิดออกจากตัวทันที", types: ["aoeSelf", "twinCleave", "bounceSlash", "asuraSlam", "bladeTempest"] },
  { key: "cone", th: "🔺 กรวยด้านหน้า", types: ["cone", "coneKnock", "coneVolley", "channelCone", "thornCone"] },
  { key: "dash", th: "🏃 พุ่งเข้าชน / กระโดดเข้าใส่", types: ["dash", "chargeDash", "crossDash", "steerDash", "deltaDash", "lungeSweep", "chargeFling", "grabSlam", "blinkBehind", "carriage", "zephyr", "combo"] },
  { key: "onhit", th: "⚔️ ติดออโต้ครั้งถัดไป", types: ["onHit", "markNext", "pommel", "sledge"] },
  { key: "single", th: "🎯 เล็งตัวเดียว ลงทันที", types: ["targeted", "judgment", "dismissal", "rebound"] },
  { key: "buffself", th: "🔵 บัฟตัวเอง — ไม่ทำดาเมจเอง", types: ["selfBuff", "rampBuff", "mask", "vampForm", "lastStand", "submerge", "absorbReflect", "damageStash", "mistform", "skyward"] },
  { key: "buffally", th: "💚 ฮีล / โล่ / บัฟให้เพื่อน", types: ["allyHot", "teamHeal", "allyBlink", "allyRush", "canopy", "guardBurst", "arbor"] },
  { key: "build", th: "🧱 สิ่งก่อสร้าง / ตัวเรียก", types: ["wall", "bunker", "summonGiant"] },
  { key: "dual", th: "☯ สองร่าง (LUCH)", types: ["dual"] },
];
const CAT_OF = {};
for (const c of CATS) for (const t of c.types) CAT_OF[t] = c.key;

// ---- ผลวัด
let GM = {}, SRC = {};
try {
  const G = JSON.parse(fs.readFileSync("game-wr.json", "utf8"));
  GM = Object.fromEntries(G.rows.map((r) => [r.id, r]));
} catch { GM = {}; }
try {
  const W = JSON.parse(fs.readFileSync("champ-wr.json", "utf8"));
  for (const r of W.rows) {
    SRC[r.id] = {};
    for (const [s, v] of r.src) SRC[r.id][s] = Math.round((100 * v) / Math.max(1, r.dmg));
  }
} catch { SRC = {}; }

const band = (wr) => {
  const d = wr - 50;
  return Math.abs(d) <= 1 ? "✅" : Math.abs(d) <= 3 ? "⚪" : d > 0 ? "🔴" : "🟡";
};

const rows = [];
const unknown = [];
for (const c of Object.values(CHAMPIONS)) {
  for (const sk of c.skills) {
    const cat = CAT_OF[sk.type];
    if (!cat) { unknown.push(c.id + " " + sk.key + " " + sk.type); continue; }
    const d = dodgeOf(sk);
    const g = GM[c.id] || {};
    rows.push({
      cat, id: c.id, key: sk.key, th: sk.th, type: sk.type, lane: c.lane,
      dodge: d.dodge, kind: d.kind,
      share: (SRC[c.id] || {})[sk.key + " " + sk.th] || 0,
      wr: g.wr != null ? g.wr : 0,
    });
  }
}

console.log("=== แผนผังหมวดหมู่สกิลทั้งเกม · " + rows.length + " ท่า ===");
console.log("หลบ: 🟢 หลบได้ · 🔴 หลบไม่ได้ · — ไม่ทำดาเมจ");
console.log("เกณฑ์เจ้าของท่า: ✅ 49-51 · ⚪ 47-53 · 🔴 แรงเกิน · 🟡 อ่อนไป\n");

for (const c of CATS) {
  const list = rows.filter((r) => r.cat === c.key);
  if (!list.length) continue;
  list.sort((a, b) => b.wr - a.wr || b.share - a.share);
  console.log("\n" + c.th + "  (" + list.length + " ท่า)");
  console.log("  หลบ  ตัวละคร      ท่า  %ดาเมจ  ชนะแมตช์  ชื่อท่า");
  for (const r of list) {
    const dg = r.dodge === null ? " — " : r.dodge ? " 🟢" : " 🔴";
    console.log("  " + dg + "  " + r.id.padEnd(12) + r.key.padEnd(4) +
      (r.share ? r.share + "%" : "-").padStart(7) +
      (r.wr ? band(r.wr) + " " + r.wr + "%" : "-").padStart(11) + "  " + r.th);
  }
}

if (unknown.length) console.log("\n⚠️ ยังไม่ได้จัดหมวด: " + unknown.join(", "));

// ---- สรุปไว้วางแพตช์
console.log("\n\n=== สรุปรายหมวด ===\n");
console.log("หมวด                                   ท่า  หลบได้  หลบไม่ได้  ดาเมจรวมที่ถืออยู่");
for (const c of CATS) {
  const list = rows.filter((r) => r.cat === c.key);
  if (!list.length) continue;
  const y = list.filter((r) => r.dodge === true).length;
  const n = list.filter((r) => r.dodge === false).length;
  const sh = list.reduce((s, r) => s + r.share, 0);
  console.log(c.th.padEnd(42) + String(list.length).padStart(3) + String(y).padStart(8) +
    String(n).padStart(10) + (sh + "%").padStart(18));
}
