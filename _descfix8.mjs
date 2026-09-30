// ---------------------------------------------------------------
// คำแปลอังกฤษของป้ายที่เพิ่งเติมเข้า 4 ตารางใน skill-desc.js
// ป้ายไหนไม่มีคีย์ใน DICT จะโชว์เป็นไทยในโหมดอังกฤษเงียบๆ (_p4lang.mjs เป็นตัวจับ)
// ---------------------------------------------------------------
import fs from "fs";

const F = "src/i18n-en.js";
let s = fs.readFileSync(F, "utf8");
const crlf = s.includes("\r\n");
if (crlf) s = s.replace(/\r\n/g, "\n");

const add = {
  // ---- แถวไล่ตามแรงก์ ----
  "ดาเมจต่อระลอก": "Damage per tick",
  "ดาเมจตอนระเบิด": "Damage on pop",
  "ดาเมจวงใน": "Inner-zone damage",
  "ดาเมจตอนระเบิดซ้ำ": "Follow-up blast damage",
  "ดาเมจตอนหมุนฟันสวน": "Riposte whirl damage",
  "ดาเมจตอนฟันกวาด": "Sweep damage",
  "โล่ที่ได้ตอนกด": "Shield on cast",
  "โล่ตอนถือสองมือ": "Two-handed shield",
  "พลังเวทที่แจกให้": "AP granted",
  "ขยายดาเมจที่เป้ากินจากทุกแหล่ง": "Amplifies all damage the target takes",
  "ดูดเลือดจากดาเมจที่ลง": "Lifesteal from damage dealt",
  "สัดส่วนดาเมจที่จดเก็บไว้": "Share of damage banked",
  "ดาเมจที่แผ่ไปโดนคนข้างๆ": "Damage cleaved to nearby enemies",
  "ความเร็วโจมตีตอนถือสองมือ": "Two-handed attack speed",
  "ความเร็วโจมตีช่วงพุ่งแรก": "Attack speed during the first burst",
  "ความเร็วโจมตีช่วงรักษาระดับ": "Attack speed while it holds",
  "ประหารทันทีเมื่อเลือดเป้าต่ำกว่า": "Executes outright below",
  "ซ่อมคืนเป็นสัดส่วนของเลือดเต็มสิ่งก่อสร้าง": "Repairs a share of the structure's full HP",
  "ดูดเลือดคืน": "Drains back",
  "อยู่นาน": "Lasts",
  "ระยะ": "Range",

  // ---- แถวค่าคงที่ ----
  "รัศมีตอนระเบิด": "Pop radius",
  "รัศมีตอนระเบิดซ้ำ": "Follow-up blast radius",
  "ระยะกระเด้งไปเป้าถัดไป": "Bounce range to the next target",
  "ความกว้างของร่างสะท้อน": "Mirrored copy's width",
  "โล่ตอนกดอยู่นาน": "Cast shield lasts",
  "ถือสองมืออยู่นาน": "Two-handed stance lasts",
  "สโลว์จากการระเบิดซ้ำอยู่นาน": "Follow-up blast slow lasts",
  "สโลว์จากการแทงข้างหลังอยู่นาน": "Backstab slow lasts",
  "เพื่อนยืมเกราะไปได้นาน": "Ally keeps the borrowed resistances for",
  "เร่งฝีเท้าหลังเก็บศพนาน": "Move speed after a kill lasts",
  "เปิดตัวศัตรูที่ล่องหนนาน": "Reveals hidden enemies for",
  "ค้างบนพื้นต่ออีก": "Lingers on the ground for",
  "แตะไม่ได้ระหว่างพุ่งนาน": "Untargetable while dashing for",
  "สโลว์จากการระเบิดซ้ำ": "Follow-up blast slow",
  "สโลว์เมื่อแทงจากข้างหลัง": "Slow on a backstab",
  "สโลว์ค่าฐาน": "Base slow",
  "สโลว์เพิ่มต่อเลเวล": "Slow gained per level",
  "เร่งฝีเท้าหลังเก็บศพ": "Move speed after a kill",
  "ตัดเวลา CC ที่ติดอยู่ลง": "Cuts the CC already on you by",
  "ดาเมจของครั้งที่สองเป็นต้นไป": "Damage from the second hit onward",
  "แรงลากเข้าหาตัว": "Pull strength",
  "เกราะ+ต้านเวทของคนซ่อม → ยอดซ่อม": "Caster's Armor + MR → repair amount",
  "ซ่อมแล้วตัดคูลดาวน์ท่าหลักลง": "Repairing cuts the main skill's cooldown by",
  "ออโต้โดนแล้วลดคูลดาวน์ลง": "Each auto that lands cuts the cooldown by",
  "ฟื้นคืนชีพครั้งเดียวด้วยเลือด": "Revives once at",
  "แบ่งเกราะ/ต้านเวทของตัวเองให้เพื่อน": "Lends an ally this share of your Armor/MR",

  // ---- สเกล ----
  "Max HP → ดาเมจ": "Max HP → damage",
  "เลือดที่เป้าเหลืออยู่ → ดาเมจ": "Target's current HP → damage",
  "เลือดที่เป้าหายไปแล้ว → ดาเมจ": "Target's missing HP → damage",
  "Bonus AD → ดาเมจสาด": "Bonus AD → splash damage",
  "Bonus HP → ดาเมจสาด": "Bonus HP → splash damage",
  "Bonus AD → ดาเมจตอนหมุนฟันสวน": "Bonus AD → riposte whirl damage",
  "Bonus AD → ดาเมจตอนฟันกวาด": "Bonus AD → sweep damage",
  "Bonus AD → โล่ตอนถือสองมือ": "Bonus AD → two-handed shield",
  "Max HP → โล่": "Max HP → shield",
  "Max HP → ฮีล": "Max HP → heal",
  "AP 100 → สโลว์จากเลือดไหล": "AP 100 → bleed slow",
  "Bonus AD 100 → เกณฑ์ประหาร": "Bonus AD 100 → execute threshold",

  // ---- ธง ----
  "CC ไม่เข้าระหว่างร่าย": "immune to CC while casting",
  "เดินได้ตามปกติระหว่างลอยอยู่กลางอากาศ": "can still move freely while airborne",
  "เติมสแตกพาสซีฟจนเต็มทันที": "refills the passive's stacks instantly",
  "ความเร็วเดินที่ได้ค่อยๆ จางลงจนหมด ไม่ใช่คงที่แล้วหาย":
    "the move speed decays away gradually instead of holding then vanishing",
  "คูลดาวน์เริ่มนับหลังโซนหมดอายุ ไม่ใช่ตอนกด":
    "the cooldown starts once the zone expires, not on cast",

  // ---- KAMACHI ----
  "น้องที่ยังไม่ตายกวาดครึ่งวงซ้ำท่านี้จากจุดที่ตัวเองยืนด้วย":
    "any weasel still alive repeats the half-circle sweep from where it stands",
  "น้องที่ยังไม่ตายยิงเป็นเส้นตรงซ้ำท่านี้จากจุดที่ตัวเองยืนด้วย":
    "any weasel still alive repeats the straight line from where it stands",
};

let n = 0;
const lines = [];
for (const [th, en] of Object.entries(add)) {
  if (s.includes('\n "' + th + '"')) continue;
  lines.push(' "' + th + '":\n   "' + en + '",');
  n++;
}
if (!s.endsWith("};\n")) throw new Error("ท้ายไฟล์ไม่ใช่ };");
s = s.slice(0, -3) + "\n // ---- ป้ายของกลไกที่เอนจินอ่านจริงแต่ไม่เคยมีคำบรรยาย ----\n"
  + lines.join("\n") + "\n};\n";
fs.writeFileSync(F, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("เพิ่มคำแปล " + n + " รายการ");
