// ---------------------------------------------------------------
// รีเฟรชเอกสารที่ใช้ปรับบาลานซ์ทั้งชุดในคำสั่งเดียว
//
// ปัญหาที่ตัวนี้แก้: เอกสารสามไฟล์มาจากข้อมูลคนละรอบวัด
// พอแก้เอนจินหรือข้อมูลตัวละครแล้วรีเจนแค่บางไฟล์ ตัวเลขก็ขัดกันเงียบๆ
// แล้วคนที่เอาไปปรับบาลานซ์ก็ตัดสินใจจากเลขที่ล้าสมัยโดยไม่รู้ตัว
//
//   game-wr.json   <- _gamewr.mjs    แมตช์เต็ม (ตัวเลขหลักที่ใช้ตัดสิน)
//   champ-wr.json  <- _champwr.mjs   ดวลเดี่ยว (ใช้ดูว่าตัวต่อตัวใครชนะใคร)
//   item-wr.json   <- _itemwr.mjs    ไอเทมทีละชิ้น
//   CHAMPIONS.md   <- _champdoc.mjs  (อ่าน game-wr + champ-wr)
//   ITEMS.md       <- _itemdoc.mjs   (อ่าน item-wr)
//
// BALANCE.md เขียนมือ ไม่มีสคริปต์ไหนสร้าง — ตัวนี้แค่เตือนว่ามันเก่ากว่าข้อมูลแล้ว
//
//   node _refresh.mjs            วัดเต็ม (ช้า ~25 นาที)
//   node _refresh.mjs quick      วัดหยาบไว้ดูทิศทาง (~5 นาที)
//   node _refresh.mjs docs       ไม่วัดใหม่ สร้างเอกสารจากข้อมูลเดิม
// ---------------------------------------------------------------
import { execFileSync } from "child_process";
import fs from "fs";

const mode = process.argv[2] || "full";
const QUICK = mode === "quick";
const DOCS_ONLY = mode === "docs";

// จำนวนรอบวัด — เต็มกับหยาบต่างกันที่ความแม่น ไม่ใช่วิธี
const PLAN = DOCS_ONLY ? [] : [
  ["_gamewr.mjs", QUICK ? ["60", "LONG", "NORMAL"] : ["300", "LONG", "NORMAL"], "game-wr.json", "แมตช์เต็ม"],
  ["_champwr.mjs", QUICK ? ["24", "13"] : ["100", "13"], "champ-wr.json", "ดวลเดี่ยว"],
  ["_itemwr.mjs", QUICK ? ["24"] : ["80"], "item-wr.json", "ไอเทมทีละชิ้น"],
];

const run = (file, args) => {
  const t0 = Date.now();
  execFileSync(process.execPath, [file, ...args], { stdio: ["ignore", "ignore", "inherit"] });
  return ((Date.now() - t0) / 1000).toFixed(0);
};

console.log("โหมด: " + (DOCS_ONLY ? "สร้างเอกสารจากข้อมูลเดิม" : QUICK ? "วัดหยาบ" : "วัดเต็ม") + "\n");

for (const [file, args, out, what] of PLAN) {
  process.stdout.write("วัด " + what.padEnd(14) + " (" + file + " " + args.join(" ") + ") ... ");
  const secs = run(file, args);
  console.log("เสร็จใน " + secs + " วิ -> " + out);
}

for (const [file, out] of [["_champdoc.mjs", "CHAMPIONS.md"], ["_itemdoc.mjs", "ITEMS.md"]]) {
  process.stdout.write("สร้าง " + out.padEnd(14) + " ... ");
  run(file, []);
  console.log("เสร็จ");
}

// ---- เตือนว่าอะไรยังไม่ตรงกัน ----
console.log("\n=== ความสดของแต่ละไฟล์ ===");
const age = (f) => {
  try { return fs.statSync(f).mtime; } catch { return null; }
};
const rows = ["game-wr.json", "champ-wr.json", "item-wr.json", "CHAMPIONS.md", "ITEMS.md", "BALANCE.md"]
  .map((f) => [f, age(f)]);
const newest = Math.max(...rows.map(([, t]) => (t ? t.getTime() : 0)));
for (const [f, t] of rows) {
  if (!t) { console.log("  " + f.padEnd(15) + "ไม่มีไฟล์"); continue; }
  const behindMin = (newest - t.getTime()) / 60000;
  const tag = behindMin > 30 ? "  ⚠️ เก่ากว่าชุดนี้ " + (behindMin / 60).toFixed(1) + " ชั่วโมง" : "";
  console.log("  " + f.padEnd(15) + t.toISOString().slice(0, 16).replace("T", " ") + tag);
}

const bal = age("BALANCE.md"), champ = age("CHAMPIONS.md");
if (bal && champ && bal < champ) {
  console.log("\nBALANCE.md เขียนมือ ไม่มีสคริปต์ไหนสร้างให้");
  console.log("ตอนนี้มันเก่ากว่าตัวเลขที่เพิ่งวัด — ข้อสรุปในนั้นอาจอ้างเลขที่ไม่มีแล้ว");
}
