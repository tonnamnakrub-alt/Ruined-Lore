// ---------------------------------------------------------------
// ให้บอทดราฟต์ใช้ "ความแรงที่วัดได้จริง" (power) แทน value
//
// value คือความสำคัญของเป้าที่ targeting.js ใช้ (kill the carry, not the tank)
// ADC จึงมี value สูงสุดเพราะต้องโดนโฟกัสก่อน ไม่ใช่เพราะแรงที่สุด
// บอทที่ใช้ value ตัดสินการดราฟต์เลยไปแบน ADC ทิ้งทั้งเลน
// แล้วปล่อยตัวที่แรงจริงหลุดมาให้อีกฝั่ง
// ---------------------------------------------------------------
import fs from "fs";

const F = "src/game/bot-draft.js";
const raw = fs.readFileSync(F, "utf8");
const crlf = raw.includes("\r\n");
let s = crlf ? raw.replace(/\r\n/g, "\n") : raw;

const edits = [
  [`import { CHAMPIONS, playsLane } from "../data/champions.js";`,
   `import { CHAMPIONS, playsLane } from "../data/champions.js";
import { powerOf } from "../data/champion-power.js";`],

  // เลือกตัว
  [`    let s = (c.value - 1) * 60;`,
   `    // ความแรงที่วัดได้จริง ไม่ใช่ value ซึ่งเป็นความสำคัญของเป้าสำหรับ AI โฟกัส
    let s = (powerOf(c) - 1) * 60;`],

  // แบน
  [`    const s = (c.value - 1) * 70 + (c.alsoLanes || []).length * 6
      + taste(c.id, nonce) * 30 + rand() * 6;`,
   `    // แบนตัวที่แรงจริงที่สุด ไม่ใช่ตัวที่ AI อยากโฟกัสที่สุด
    const s = (powerOf(c) - 1) * 70 + (c.alsoLanes || []).length * 6
      + taste(c.id, nonce) * 30 + rand() * 6;`],
];

let n = 0;
for (const [from, to] of edits) {
  const hits = s.split(from).length - 1;
  if (hits !== 1) throw new Error("เจอ " + hits + " ที่ :: " + from.slice(0, 55));
  s = s.replace(from, to);
  n++;
}
fs.writeFileSync(F, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("แก้ " + n + " จุด");
