// ---------------------------------------------------------------
// KAMACHI — ฟิลด์ mirror บอกว่าน้องที่ยังอยู่ซ้ำท่านี้จากตำแหน่งของตัวเอง
// (lore-p4.js:460-495) เป็นกลไกหลักของตัวละครทั้งตัว แต่หน้าสกิลไม่เคยพูดถึง
// ตัวเลข 25% อยู่ในคำบรรยายพาสซีฟแล้ว ตรงนี้จึงบอกแค่ "ซ้ำเป็นรูปอะไร"
// ---------------------------------------------------------------
import fs from "fs";

const F = "src/game/skill-desc.js";
let s = fs.readFileSync(F, "utf8");
const crlf = s.includes("\r\n");
if (crlf) s = s.replace(/\r\n/g, "\n");

const from = `  const bits = [actionClause(sk), ...timingClause(sk)];`;
const to = `  const bits = [actionClause(sk), ...timingClause(sk)];
  // น้องของ KAMACHI ซ้ำท่านี้จากที่ที่ตัวเองยืน ไม่ใช่ดาเมจก้อนเดียว (สัดส่วนอยู่ในพาสซีฟ)
  if (sk.mirror) {
    bits.push(sk.mirror === "cleave"
      ? tr("น้องที่ยังไม่ตายกวาดครึ่งวงซ้ำท่านี้จากจุดที่ตัวเองยืนด้วย")
      : tr("น้องที่ยังไม่ตายยิงเป็นเส้นตรงซ้ำท่านี้จากจุดที่ตัวเองยืนด้วย"));
  }`;

const hits = s.split(from).length - 1;
if (hits !== 1) throw new Error("เจอ " + hits + " ที่ (ต้องเจอ 1)");
s = s.replace(from, to);
fs.writeFileSync(F, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("ok");
