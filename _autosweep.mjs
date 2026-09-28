// ---------------------------------------------------------------
// กวาดค่า AUTO_DMG แล้วดูว่าตารางอัตราชนะบีบเข้าหากันแค่ไหน
//
// AUTO_DMG ถูก import เป็น const เข้า step.js ตอนโหลดโมดูล เปลี่ยนกลางคัน
// ในโปรเซสเดียวไม่ได้ จึงต้องแก้ไฟล์จริงแล้วเปิดโปรเซสใหม่ทีละค่า
// ถ้าพังกลางทาง finally จะคืน tuning.js กับ champ-wr.json กลับให้เอง
//
//   node _autosweep.mjs [จำนวน seed ต่อคู่]
//
// ผลลัพธ์ลง auto-sweep.json แล้วอ่านด้วย node _autoreport.mjs
// ---------------------------------------------------------------
import fs from "fs";
import { execSync } from "child_process";

const T = "src/data/tuning.js";
const SEEDS = process.argv[2] || "20";
const LINE = "export const AUTO_DMG = 0.75;";
// 0.9375 คือค่าที่ทำให้ออโต้ได้ 75% ของ AD สุทธิ หลังโดน DMG_MUL 0.80 ทับ
const VALUES = [0.9375, 0.75, 0.65, 0.5625, 0.5, 0.4];

const orig = fs.readFileSync(T, "utf8");
if (!orig.includes(LINE)) throw new Error("ไม่เจอบรรทัด AUTO_DMG ที่คาดไว้ใน " + T);

const out = { seeds: Number(SEEDS), points: [] };
try {
  for (const v of VALUES) {
    fs.writeFileSync(T, orig.replace(LINE, "export const AUTO_DMG = " + v + ";"));
    const t0 = Date.now();
    execSync("node _champwr.mjs " + SEEDS + " 13", { stdio: "pipe" });
    const d = JSON.parse(fs.readFileSync("champ-wr.json", "utf8"));
    out.points.push({
      auto: v,
      netOfAd: Number((v * 0.8).toFixed(4)),   // ออโต้ได้จริงกี่ % ของ AD หลัง DMG_MUL
      fightsEach: d.fightsEach, margin: d.margin,
      rows: d.rows.map((r) => ({
        id: r.id, wr: r.wr, dmg: r.dmg, took: r.took, lived: r.lived,
        auto: (r.src.find((x) => x[0] === "Auto attack") || ["", 0])[1],
      })),
    });
    console.log("AUTO_DMG " + v + " เสร็จ (" + ((Date.now() - t0) / 1000).toFixed(0) + " วิ)");
  }
} finally {
  fs.writeFileSync(T, orig);
  execSync("git checkout -- champ-wr.json", { stdio: "pipe" });
  console.log("คืน tuning.js และ champ-wr.json กลับแล้ว");
}
fs.writeFileSync("auto-sweep.json", JSON.stringify(out, null, 1));
console.log("เขียน auto-sweep.json — " + out.points.length + " ค่า · ตัวละ " + out.points[0].fightsEach + " ไฟต์");
