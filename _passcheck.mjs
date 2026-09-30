// ---------------------------------------------------------------
// พาสซีฟเป็นข้อความเขียนมือ ตัวเลขในนั้นจึงหลุดจากข้อมูลจริงได้เงียบๆ
// (เจอมาแล้วกับ ARIEL ที่ค้าง "ค่าฐาน 345" หลังลดความเร็วเดินเป็น 330)
//
// วิธีตรวจ: ดึงตัวเลขทุกตัวออกจากคำบรรยาย แล้วถามว่ามันอธิบายได้จาก
// ค่าสถานะฐาน หรือจากก้อนตั้งค่าพาสซีฟของตัวนั้นไหม
//   - ค่าดิบ, คูณร้อย (เปอร์เซ็นต์), base + perLevel x 17 (เลเวล 18)
//   - ค่าสถานะฐานทุกตัว และ base + growth x 17
// ตัวไหนอธิบายไม่ได้เลย = น่าจะเป็นตัวเลขที่ค้างจากแพตช์เก่า
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { setLang } from "./src/i18n.js";

setLang("th");
const STAT = ["hp","hpG","hp5","hp5G","ad","adG","armor","armorG","mr","mrG","as","asG","ms","range","rage","value","windup","missile"];

const near = (a, b) => Math.abs(a - b) < 0.51;

function poolOf(c) {
  const out = new Set();
  const add = (v) => { if (typeof v === "number" && isFinite(v)) { out.add(v); out.add(v * 100); out.add(Math.round(v * 100)); } };
  for (const k of STAT) add(c[k]);
  // ค่าสถานะที่โตตามเลเวลถึง 18
  for (const [b, g] of [["hp","hpG"],["ad","adG"],["armor","armorG"],["mr","mrG"],["hp5","hp5G"],["as","asG"]]) {
    if (typeof c[b] === "number" && typeof c[g] === "number") add(c[b] + c[g] * 17);
  }
  const walk = (o, d) => {
    if (!o || typeof o !== "object" || d > 3) return;
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "number") {
        add(v);
        // ก้อนที่ไต่ตามเลเวล: base + perLevel x 17
        if (k === "base" && typeof o.perLevel === "number") { add(v + o.perLevel * 17); add(v + o.perLevel); }
      } else if (Array.isArray(v)) { for (const x of v) add(x); }
      else walk(v, d + 1);
    }
  };
  for (const [k, v] of Object.entries(c)) {
    if (k === "skills" || k === "passive" || k === "lore") continue;
    if (v && typeof v === "object") walk(v, 0);
  }
  return out;
}

let bad = 0;
for (const c of Object.values(CHAMPIONS)) {
  const desc = (c.passive && c.passive.desc) || "";
  if (!desc) continue;
  const pool = poolOf(c);
  const miss = [];
  for (const m of desc.matchAll(/(\d+(?:\.\d+)?)/g)) {
    const v = Number(m[1]);
    if (v <= 1) continue;                               // 0/1 เจอได้ทั่วไป ไม่มีความหมาย
    if ([...pool].some((p) => near(p, v))) continue;
    // บริบทรอบตัวเลข ช่วยให้อ่านออกว่าเลขนี้คืออะไร
    const i = m.index;
    miss.push(v + " (…" + desc.slice(Math.max(0, i - 22), i + String(v).length + 14).replace(/\n/g, " ") + "…)");
  }
  if (miss.length) { bad++; console.log("\n" + c.id + " — " + miss.length + " ตัวเลขที่อธิบายจากข้อมูลไม่ได้"); for (const s of miss) console.log("   " + s); }
}
console.log("\n" + bad + " / " + Object.keys(CHAMPIONS).length + " ตัวมีตัวเลขในพาสซีฟที่หาที่มาไม่เจอ");
