// ---------------------------------------------------------------
// ตัวรันแพตช์ 0.5 — ปรับตัวเลขในไฟล์ข้อมูลตัวละครแบบตรวจค่าเดิมก่อนเขียนเสมอ
//
// ทุกการแก้ต้องระบุ "ข้อความเดิมที่คาดว่าจะเจอ" ให้ตรงเป๊ะ ถ้าไม่ตรงจะหยุดทันที
// และไม่เขียนไฟล์เลยสักไฟล์ กันไม่ให้เขียนทับของผิดตัวเมื่อข้อมูลขยับไปแล้ว
//
// ค้นหาสกิลด้วย th: "ชื่อท่า" ซึ่งไม่ซ้ำกันทั้งเกม แล้วแก้เฉพาะในบล็อกนั้น
//
//   node _patch05.mjs          ลองดูเฉยๆ ไม่เขียน
//   node _patch05.mjs --write  เขียนจริง
// ---------------------------------------------------------------
import fs from "fs";
import { PATCH } from "./_patch05-data.mjs";

const WRITE = process.argv.includes("--write");
const FILES = ["src/data/champions.js", "src/data/champions-lore.js", "src/data/champions-p4.js"];

const src = new Map();
for (const f of FILES) {
  const raw = fs.readFileSync(f, "utf8");
  src.set(f, { crlf: raw.includes("\r\n"), body: raw.includes("\r\n") ? raw.replace(/\r\n/g, "\n") : raw });
}

// หาไฟล์และช่วงข้อความของบล็อกที่ anchor อยู่
// anchor คือ th: "ชื่อ" ของสกิล หรือชื่อฟิลด์ตั้งต้นของตัวละคร เช่น kindness:
function locate(anchor, span) {
  for (const [f, o] of src) {
    const i = o.body.indexOf(anchor);
    if (i < 0) continue;
    if (o.body.indexOf(anchor, i + 1) >= 0) throw new Error("anchor ซ้ำในไฟล์เดียว: " + anchor);
    // ปลายบล็อก: หา "}," หรือ "}" ตัวแรกที่ปิดวงเล็บปีกกาที่เปิดค้างอยู่
    let depth = 0, j = o.body.lastIndexOf("{", i);
    const start = j;
    for (; j < o.body.length; j++) {
      const ch = o.body[j];
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) { j++; break; } }
    }
    return { f, o, start, end: span === "champ" ? o.body.length : j };
  }
  throw new Error("หา anchor ไม่เจอ: " + anchor);
}

let changed = 0;
const problems = [];
for (const [who, edits] of Object.entries(PATCH)) {
  for (const e of edits) {
    const { anchor, from, to, note } = e;
    let loc;
    try { loc = locate(anchor, e.span); } catch (err) { problems.push(who + " :: " + err.message); continue; }
    const block = loc.o.body.slice(loc.start, loc.end);
    const hits = block.split(from).length - 1;
    if (hits !== 1) {
      problems.push(who + " :: " + (hits === 0 ? "ไม่เจอค่าเดิม" : "เจอค่าเดิม " + hits + " ที่ ไม่รู้จะแก้อันไหน") +
        "\n       anchor: " + anchor + "\n       เดิม:   " + from + (note ? "\n       (" + note + ")" : ""));
      continue;
    }
    loc.o.body = loc.o.body.slice(0, loc.start) + block.replace(from, to) + loc.o.body.slice(loc.end);
    changed++;
  }
}

if (problems.length) {
  console.log("❌ ไม่ผ่าน " + problems.length + " จุด — ไม่เขียนไฟล์เลยสักไฟล์\n");
  for (const p of problems) console.log("  " + p);
  process.exit(1);
}
console.log("✅ ตรวจผ่านทุกจุด — แก้ " + changed + " ค่า ใน " + Object.keys(PATCH).length + " หัวข้อ");
if (WRITE) {
  for (const [f, o] of src) fs.writeFileSync(f, o.crlf ? o.body.replace(/\n/g, "\r\n") : o.body);
  console.log("เขียนไฟล์แล้ว");
} else {
  console.log("(ยังไม่เขียน — ใส่ --write ถ้าจะเขียนจริง)");
}
