// ---------------------------------------------------------------
// ตรวจตัวละครแพตช์ 0.6 เทียบเอกสารทีละตัวเลข
//
// วิธี: ดึงทุกตัวเลขในย่อหน้าของตัวละครนั้นจากเอกสาร แล้วถามว่าตัวเลขนั้น
// โผล่อยู่ในข้อมูลของตัวละครในเกมไหม ถ้าไม่โผล่เลย = ต้องไปดู
//
// เทียบทีละตัวละคร ไม่แบ่งทีละท่า เพราะลำดับข้อความใน PDF ไม่เรียงตามหัวข้อ
// (เลขของ Q ไปโผล่อยู่ในย่อหน้า Passive) แบ่งทีละท่าแล้วได้ผลบวกลวงเต็มไปหมด
//
// ไฟล์นี้ "ชี้จุดให้ไปดู" ไม่ใช่ "ฟันธง" เพราะเอกสารมีเลขที่ไม่ใช่ค่าของท่า
// อยู่เยอะ — เลขรวมตลอดท่า เลขของเวอร์ชันเก่าที่เขียนเทียบไว้ เลขยกตัวอย่าง
//
//   node _p6audit.mjs           ตรวจทุกตัว
//   node _p6audit.mjs KOSCHEI   ตรวจตัวเดียว
//
// ต้องมีไฟล์ข้อความของเอกสารก่อน:
//   pdftotext -enc UTF-8 "…/Patch 0.6 New Champ (1).pdf" <scratchpad>/p6.txt
// ---------------------------------------------------------------
import fs from "fs";
import { CHAMPIONS } from "./src/data/champions.js";

const SRC = process.env.P6TXT
  || "C:/Users/Admin/AppData/Local/Temp/claude/C--Users-Admin-Desktop-Sideline/5db6906d-8367-4232-9b8c-fb8892fbacbb/scratchpad/p6.txt";
if (!fs.existsSync(SRC)) {
  console.log("ไม่เจอ " + SRC + " — ตั้ง P6TXT ชี้ไปที่ไฟล์ข้อความของเอกสาร");
  process.exit(1);
}
const lines = fs.readFileSync(SRC, "utf8").split("\n");

// บรรทัดที่หัวข้อตัวละครแต่ละตัวเริ่ม
const CHAMP_AT = [
  ["HELSING", 1], ["WOLF", 51], ["ANANSI", 100], ["KOSCHEI", 167], ["IFRIT", 229],
];
const only = (process.argv[2] || "").toUpperCase();

// ทุกตัวเลขในข้อมูล ไล่ลึกทุกชั้น
function numbersIn(v, acc = new Set()) {
  if (typeof v === "number") { acc.add(v); return acc; }
  if (Array.isArray(v)) { for (const x of v) numbersIn(x, acc); return acc; }
  if (v && typeof v === "object") { for (const k of Object.keys(v)) numbersIn(v[k], acc); return acc; }
  return acc;
}

// เลขที่ไม่ต้องสนใจ — เป็นหน่วย ลำดับข้อ หรือเลขอ้างอิงในประโยค
const IGNORE = new Set([0, 1, 2, 3, 4, 5, 100]);

function specNumbers(text) {
  const out = [];
  const re = /(\d[\d,]*(?:\.\d+)?)\s*(%?)/g;
  let m;
  while ((m = re.exec(text))) {
    const raw = Number(m[1].replace(/,/g, ""));
    if (!Number.isFinite(raw)) continue;
    out.push({ raw, pct: m[2] === "%", at: m.index });
  }
  return out;
}

// ในเกมอาจเก็บเป็นสัดส่วน (0.12) ขณะที่เอกสารเขียนเป็นเปอร์เซ็นต์ (12%)
// ลองทั้งสองทางเสมอ ไม่ดูว่ามีเครื่องหมาย % ติดมาไหม เพราะเอกสารเขียนรายการ
// เป็น "30 / 45 / 60 / 75%" คือใส่ % ไว้ตัวท้ายตัวเดียว สามตัวแรกจะถูกมองว่า
// ไม่ใช่เปอร์เซ็นต์แล้วแจ้งเตือนผิดทั้งแถว
function matches(want, pct, have) {
  for (const h of have) {
    if (Math.abs(h - want) < 0.011) return true;
    if (Math.abs(h - want / 100) < 0.0001) return true;
    if (Math.abs(h * 100 - want) < 0.011) return true;
  }
  return false;
}

// ค่าสถานะที่เอกสารกำกับไว้ว่า "(เลเวล 13: x | เลเวล 18: y)" คือค่าที่คำนวณได้
// จากฐาน + ต่อเลเวล ไม่ได้เก็บเป็นตัวเลขในข้อมูล จึงต้องคิดเพิ่มเข้าไปในกอง
// ที่ใช้เทียบ ไม่งั้นทุกตัวจะติดธงสิบกว่าค่าจากเรื่องเดียวกัน
function derivedStats(c) {
  const out = [];
  const pairs = [["hp", "hpG"], ["hp5", "hp5G"], ["ad", "adG"],
    ["armor", "armorG"], ["mr", "mrG"], ["as", "asG"]];
  for (const [b, g] of pairs) {
    if (typeof c[b] !== "number" || typeof c[g] !== "number") continue;
    for (const lv of [13, 18]) {
      const v = c[b] + c[g] * (lv - 1);
      out.push(v, Math.round(v * 10) / 10, Math.round(v * 100) / 100, Math.round(v));
    }
  }
  return out;
}

let flagged = 0;
for (let ci = 0; ci < CHAMP_AT.length; ci++) {
  const [id, at] = CHAMP_AT[ci];
  if (only && id !== only) continue;
  const to = ci + 1 < CHAMP_AT.length ? CHAMP_AT[ci + 1][1] : lines.length;
  const c = CHAMPIONS[id];
  console.log("\n=== " + id + (c ? "" : "  — ยังไม่มีในเกม"));
  if (!c) { flagged++; continue; }

  const have = [...numbersIn(c), ...derivedStats(c)];
  const text = lines.slice(at, to).join(" ");
  const miss = [];
  for (const n of specNumbers(text)) {
    if (IGNORE.has(n.raw)) continue;
    if (matches(n.raw, n.pct, have)) continue;
    miss.push({ v: n.raw + (n.pct ? "%" : ""), at: n.at });
  }
  const seen = new Set();
  const uniq = miss.filter((m) => (seen.has(m.v) ? false : seen.add(m.v)));
  if (!uniq.length) { console.log("  ตัวเลขในเอกสารโผล่ในข้อมูลครบทุกค่า"); continue; }
  flagged += uniq.length;
  console.log("  ไม่เจอในข้อมูล " + uniq.length + " ค่า:");
  for (const m of uniq) {
    // ตัดบริบทรอบๆ มาให้เห็นว่าเลขนั้นพูดถึงอะไร
    const ctx = text.slice(Math.max(0, m.at - 85), m.at + 45).replace(/\s+/g, " ");
    console.log("    " + String(m.v).padStart(8) + "  …" + ctx + "…");
  }
}
console.log("\nรวมจุดที่ต้องไปดู " + flagged);
