// ---------------------------------------------------------------
// สรุปว่าสกิลไหนหลบได้ สกิลไหนหลบไม่ได้ ทั้งเกม
//
// ตารางจำแนกอยู่ที่ _dodgeclass.mjs ที่เดียว (หน้า CHAMPIONS.md ก็ใช้ตัวเดียวกัน)
// ไฟล์นี้แค่เอามาเรียงและแนบสัดส่วนดาเมจจริง เพื่อดูว่าแก้ท่าไหนแล้วมีผลมากที่สุด
//
//   node _dodge.mjs
// ---------------------------------------------------------------
import fs from "fs";
import { CHAMPIONS } from "./src/data/champions.js";
import { dodgeOf } from "./_dodgeclass.mjs";

// สัดส่วนดาเมจจริงจากผลวัด ถ้ามี
let SRC = {};
try {
  const W = JSON.parse(fs.readFileSync("champ-wr.json", "utf8"));
  for (const r of W.rows) {
    SRC[r.id] = {};
    for (const [s, v] of r.src) SRC[r.id][s] = Math.round((100 * v) / Math.max(1, r.dmg));
  }
} catch { SRC = {}; }

const rows = [];
for (const c of Object.values(CHAMPIONS)) {
  for (const sk of c.skills) {
    const d = dodgeOf(sk);
    if (d.dodge === null) continue;
    rows.push({
      id: c.id, key: sk.key, th: sk.th, type: sk.type, lane: c.lane,
      dodge: d.dodge, kind: d.kind, why: d.why,
      share: (SRC[c.id] || {})[sk.key + " " + sk.th] || 0,
    });
  }
}

const no = rows.filter((r) => !r.dodge), yes = rows.filter((r) => r.dodge);
console.log(`=== สกิลที่ทำดาเมจทั้งหมด ${rows.length} ท่า ===`);
console.log(`  🔴 หลบไม่ได้ ${no.length} ท่า (${Math.round(100 * no.length / rows.length)}%) · 🟢 หลบได้ ${yes.length} ท่า\n`);

console.log("=== 🔴 หลบไม่ได้ — เรียงตามสัดส่วนดาเมจ (แก้ตัวบนสุดแล้วมีผลมากที่สุด) ===\n");
console.log("ตัวละคร      ท่า  ชนิด             %ดาเมจ  ชื่อท่า");
for (const r of no.sort((a, b) => b.share - a.share)) {
  console.log(r.id.padEnd(12) + r.key.padEnd(4) + r.type.padEnd(16) +
    (r.share ? r.share + "%" : "-").padStart(7) + "  " + r.th);
}

console.log("\n=== 🟢 หลบได้ — แยกตามวิธีที่หลบ ===");
const KIND_TH = { projectile: "ลูกกระสุน", beam: "ลำแสง", delay: "มีหน่วงก่อนลง", zone: "โซนค้างที่" };
for (const k of ["projectile", "beam", "delay", "zone"]) {
  const list = yes.filter((r) => r.kind === k);
  if (!list.length) continue;
  console.log(`\n  ${KIND_TH[k]} — ${list.length} ท่า`);
  console.log("    " + list.map((r) => r.id + " " + r.key).join(" · "));
}

console.log("\n\n=== ตัวละครที่พึ่งท่าหลบไม่ได้มากที่สุด (นับตามสัดส่วนดาเมจ) ===\n");
const per = {};
for (const r of rows) {
  const p = per[r.id] = per[r.id] || { no: 0, yes: 0, lane: r.lane };
  if (r.dodge) p.yes += r.share; else p.no += r.share;
}
console.log("ตัวละคร      หลบไม่ได้  หลบได้  เลน");
for (const [id, p] of Object.entries(per).filter(([, p]) => p.no + p.yes > 0).sort((a, b) => b[1].no - a[1].no)) {
  console.log(id.padEnd(12) + (p.no + "%").padStart(8) + (p.yes + "%").padStart(9) + "  " + p.lane);
}
console.log("\n(ออโต้ไม่ถูกนับ — ออโต้ประชิดหลบไม่ได้ ส่วนออโต้ระยะไกลเป็นลูกบินที่หลบได้)");
