// ---------------------------------------------------------------
// ฟิลด์ที่ไม่มีคำบรรยาย แยกเป็นสองกอง
//   ก) เอนจินอ่านจริง -> เป็นกลไกที่มีผลในสนาม แต่ผู้เล่นไม่มีทางรู้ ต้องเขียนบอก
//   ข) ไม่มีใครอ่าน   -> เป็นตัวเลขตายในไฟล์ข้อมูล อย่าเพิ่งไปเขียนบรรยายให้
// เคยพลาดมาแล้วว่าไปปรับตัวเลขที่ไม่มีโค้ดไหนอ่าน แล้วนึกว่าแก้บาลานซ์ได้
// ---------------------------------------------------------------
import fs from "fs";
import path from "path";

const engineSrc = [];
for (const dir of ["src/engine", "src/game"]) {
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".js")) continue;
    if (f === "skill-desc.js" || f === "skill-kind.js") continue;   // สองตัวนี้คือตัวบรรยาย ไม่ใช่ตัวทำงาน
    engineSrc.push([path.join(dir, f), fs.readFileSync(path.join(dir, f), "utf8")]);
  }
}

const fields = process.argv.slice(2);
for (const f of fields) {
  const hits = [];
  for (const [file, src] of engineSrc) {
    // จับทั้ง sk.foo, skill.foo, s.foo, .foo ที่ตามด้วยอะไรก็ได้ และ ["foo"]
    const re = new RegExp("[\\w\\]]\\s*\\.\\s*" + f + "\\b|\\[\"" + f + "\"\\]|\\b" + f + "\\s*:", "g");
    const n = (src.match(re) || []).length;
    if (n) hits.push(path.basename(file) + "×" + n);
  }
  console.log((hits.length ? "อ่าน " : "ตาย ") + f.padEnd(22) + " " + (hits.join(" ") || "—"));
}
