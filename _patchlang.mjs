// ---------------------------------------------------------------
// หาข้อความในแพตช์โน้ตที่ยังไม่มีคำแปลอังกฤษ
//
// _p4lang.mjs ตรวจแค่สตริงของตัวละคร ไม่แตะแพตช์โน้ต ทั้งที่หน้า PATCH NOTES
// ส่งทุกบรรทัดผ่าน tr() เหมือนกัน คีย์ที่ขาดจะตกกลับเป็นไทยแบบเงียบๆ
//
//   node _patchlang.mjs            ดูว่าขาดกี่จุด
//   node _patchlang.mjs --keys     พิมพ์โครงคีย์ที่ยังขาด ไว้เอาไปเติมคำแปล
// ---------------------------------------------------------------
import { PATCHES } from "./src/data/patches.js";
import { DICT } from "./src/i18n-en.js";

const want = [];
const push = (sTxt, where) => {
  if (!sTxt || typeof sTxt !== "string") return;
  if (!/[฀-๿]/.test(sTxt)) return;   // ไม่มีอักษรไทย ไม่ต้องแปล
  want.push({ s: sTxt, where });
};

for (const p of PATCHES) {
  push(p.title, "Patch " + p.id + " title");
  push(p.blurb, "Patch " + p.id + " blurb");
  for (const g of p.groups || []) {
    push(g.head, "Patch " + p.id + " head");
    for (const ln of g.lines || []) push(ln, "Patch " + p.id + " line");
  }
}

const missing = want.filter((w) => !DICT[w.s]);
const seen = new Set();
const uniq = missing.filter((w) => (seen.has(w.s) ? false : seen.add(w.s)));

if (process.argv.includes("--keys")) {
  for (const w of uniq) {
    console.log(" " + JSON.stringify(w.s) + ":");
    console.log("   \"\",");
  }
} else {
  console.log("ข้อความไทยในแพตช์โน้ตทั้งหมด " + want.length + " จุด · ขาดคำแปล " + uniq.length + " จุด");
  const byPatch = {};
  for (const w of uniq) byPatch[w.where.split(" ")[1]] = (byPatch[w.where.split(" ")[1]] || 0) + 1;
  for (const [k, v] of Object.entries(byPatch)) console.log("  " + k + " — ขาด " + v);
  if (uniq.length) process.exit(1);
  console.log("แพตช์โน้ตแปลครบทุกจุด");
}
