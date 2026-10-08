// ---------------------------------------------------------------
// สร้างตาราง "ความแรงสำหรับดราฟต์" จากอัตราชนะที่วัดได้จริง
//
// ทำไมไม่แก้ value: value ถูกใช้สองที่ที่ความหมายไม่เหมือนกัน
//   targeting.js  "kill the carry, not the tank" — ความสำคัญของเป้า
//                 ADC มี value สูงสุดเพราะต้องโดนโฟกัสก่อน ไม่ใช่เพราะแรงสุด
//   bot-draft.js  ใช้เป็นความแรงตอนเลือกและแบน
// เอาอัตราชนะไปเขียนทับ value จะพัง AI โฟกัสเป้า — มันจะไปไล่ตีตัวถังที่ชนะเยอะ
// แทนที่จะเก็บแครี่ จึงแยกเป็นค่าใหม่ชื่อ power สำหรับดราฟต์โดยเฉพาะ
//
// ต้องอ่านจาก game-wr.json ที่ดราฟต์ "แบบสุ่ม" ทั้งสองฝั่งเท่านั้น
// ถ้าเอาผลจากบอทดราฟต์มาใช้จะได้ค่าผิด เพราะตัวที่บอทชอบเลือกจะอยู่ทั้งฝั่งชนะ
// และฝั่งแพ้ อัตราชนะเลยเข้าหา 50% ไม่ว่าจะแรงจริงแค่ไหน
//
//   node _revalue.mjs            ดูตารางเทียบ ไม่เขียนไฟล์
//   node _revalue.mjs --write    เขียน src/data/champion-power.js
// ---------------------------------------------------------------
import fs from "fs";
import { CHAMPIONS } from "./src/data/champions.js";

const WRITE = process.argv.includes("--write");
const SRC = "game-wr.json";
if (!fs.existsSync(SRC)) {
  console.log("ไม่เจอ " + SRC + " — รัน `node _gamewr.mjs 300` ก่อน");
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(SRC, "utf8"));
const rows = data.rows || [];
if (!rows.length) { console.log("ไฟล์วัดผลว่าง"); process.exit(1); }

// ช่วงของ power — กันไม่ให้ค่าหลุดไปไกลจนบอทเลือกเพี้ยน
const LO = 0.75, HI = 1.30;
// ชนะห่างจาก 50% เท่าไหร่ถึงจะดัน power ไปสุดช่วง
const SPAN = 20;
// ลงเล่นน้อยกว่านี้ ตัวเลขเชื่อไม่ได้ ให้เป็นกลาง
const MIN_GAMES = 20;

const clamp = (v) => Math.max(LO, Math.min(HI, v));
const round2 = (v) => Math.round(v * 100) / 100;

const out = [];
for (const c of Object.values(CHAMPIONS)) {
  const r = rows.find((x) => x.id === c.id);
  const wr = r && r.wr != null ? r.wr : null;        // 0-100
  const games = r && r.games != null ? r.games : 0;
  let power = 1, why = "";
  if (wr == null || games < MIN_GAMES) { why = "ลงเล่นน้อย ให้เป็นกลาง"; }
  else power = round2(clamp(1 + ((wr - 50) / SPAN) * ((HI - LO) / 2)));
  out.push({ id: c.id, lane: c.lane, value: c.value, wr, games, power, why });
}

out.sort((a, b) => (b.wr || 0) - (a.wr || 0));
console.log("ความแรงสำหรับดราฟต์ จาก " + (data.games || "?") + " แมตช์ (ดราฟต์สุ่มทั้งสองฝั่ง)\n");
console.log("ตัวละคร      เลน       ลงเล่น  ชนะ      value  power");
for (const x of out) {
  console.log("  " + x.id.padEnd(11) + (x.lane || "").padEnd(9)
    + String(x.games).padStart(5) + "  " + (x.wr == null ? "    -" : x.wr.toFixed(1) + "%").padStart(7)
    + "   " + String(x.value).padStart(5) + "  " + String(x.power).padStart(5)
    + (x.why ? "   " + x.why : ""));
}

if (!WRITE) {
  console.log("\n(ยังไม่เขียนไฟล์ — ใส่ --write ถ้าจะเอาค่านี้ไปใช้จริง)");
  process.exit(0);
}

const lines = out.slice().sort((a, b) => a.id.localeCompare(b.id))
  .map((x) => "  " + JSON.stringify(x.id) + ": " + x.power.toFixed(2)
    + ",".padEnd(2) + "  // " + (x.wr == null ? "ลงเล่นน้อย" : "ชนะ " + x.wr.toFixed(1) + "% จาก " + x.games + " แมตช์"))
  .join("\n");

const body = `// ---------------------------------------------------------------
// ความแรงของตัวละครสำหรับ "การดราฟต์" — ไฟล์นี้สร้างจากสถิติ อย่าแก้ด้วยมือ
//
//   สร้างโดย: node _revalue.mjs --write
//   ข้อมูลจาก: ${data.games || "?"} แมตช์ · ดราฟต์สุ่มทั้งสองฝั่ง (_gamewr.mjs)
//   วันที่สร้าง: ${new Date().toISOString().slice(0, 10)}
//
// ทำไมไม่ใช้ value: value คือ "ความสำคัญของเป้า" ที่ targeting.js ใช้ตัดสินว่า
// จะเก็บใครก่อน (kill the carry, not the tank) ADC จึงมี value สูงสุดเพราะต้อง
// โดนโฟกัสก่อน ไม่ใช่เพราะแรงที่สุด ถ้าเอาอัตราชนะไปเขียนทับ value
// AI จะเลิกเก็บแครี่แล้วไปไล่ตีตัวถังที่ชนะเยอะแทน
//
// ค่านี้ใช้ที่ bot-draft.js ที่เดียว — ตอนเลือกตัวและตอนแบน
// ตัวที่ยังไม่มีสถิติพอจะได้ 1.00 (เป็นกลาง) ไม่ได้แปลว่ามันอ่อน
// ---------------------------------------------------------------
export const CHAMP_POWER = {
${lines}
};

// ตัวที่ไม่มีในตาราง (เพิ่งเพิ่มเข้าเกม) ถือว่าเป็นกลาง
export const powerOf = (c) => (c && CHAMP_POWER[c.id] != null ? CHAMP_POWER[c.id] : 1);
`;

fs.writeFileSync("src/data/champion-power.js", body.replace(/\n/g, "\r\n"));
console.log("\nเขียน src/data/champion-power.js แล้ว (" + out.length + " ตัว)");
