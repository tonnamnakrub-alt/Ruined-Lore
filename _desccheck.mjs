// ---------------------------------------------------------------
// ตรวจว่าคำบรรยายสกิล "พูดถึงทุกอย่างที่ข้อมูลประกาศไว้" หรือเปล่า
//
// เจอมาสามรอบแล้วว่าสกิลประกาศฟิลด์ที่มีผลจริงในสนาม
// แต่ไม่มีบรรทัดไหนในหน้าข้อมูลสกิลหรือใน CHAMPIONS.md พูดถึงเลย
// ผู้เล่นจึงไม่มีทางรู้ นอกจากเปิดโค้ดอ่าน
//
// วิธีตรวจ: เอาข้อความที่หน้าข้อมูลสกิลวาดจริงทั้งก้อน (ประโยค + ตาราง
// + แถวคงที่ + สเกล + ธง + ท่าย่อย) แล้วถามทีละฟิลด์ว่า
//   1. ชื่อฟิลด์นี้โผล่ใน skill-desc.js บ้างไหม — ถ้าไม่ คือไม่มีทางบรรยายได้เลย
//   2. ค่าของมันโผล่ในข้อความที่วาดออกมาไหม — ถ้าไม่ คือเงียบไปเฉยๆ
// ---------------------------------------------------------------
import fs from "fs";
import { CHAMPIONS } from "./src/data/champions.js";
import {
  MAX_RANK, flagLines, flatRows, rankedRows, ratioLine, skillSentence, skillShape, subSkills,
} from "./src/game/skill-desc.js";
import { setLang } from "./src/i18n.js";

setLang("th");
const SRC = fs.readFileSync("src/game/skill-desc.js", "utf8");

// ฟิลด์ที่ไม่ต้องบรรยาย — เป็นชื่อ ชนิด หรือธงภายในที่ไม่มีผลให้ผู้เล่นตัดสินใจ
const SKIP = new Set([
  "th", "en", "key", "type", "icon", "id", "name", "desc", "rank", "ult", "magic",
  "light", "shadow", "steps", "cd", "cdByRank", "dmg", "vfx", "color", "sound",
  "aiHint", "aiRange", "botOnly", "tags", "note",
  // mirror เป็นตัวเลือก "รูปทรง" ที่น้องใช้ซ้ำท่า ไม่ใช่ตัวเลขให้หาในข้อความ
  // ประโยคบรรยายพูดถึงมันแล้ว แต่ไม่มีค่าให้เทียบ ตัวตรวจจึงหาไม่เจอ
  "mirror",
  // resetKeys เป็นรายชื่อคีย์สกิล ไม่ใช่ตัวเลข — ประโยคบรรยายพูดถึงมันแล้ว
  // ("รีเซ็ตคูลดาวน์ Q W E") แต่ไม่มีค่าให้ตัวตรวจเทียบ
  "resetKeys",
]);

// ค่าที่โผล่ในข้อความได้หลายหน้าตา — ลองทุกแบบก่อนจะสรุปว่าไม่มี
function shown(v, text) {
  const tries = [];
  const push = (x) => { if (x != null) tries.push(String(x)); };
  if (typeof v === "number") {
    push(v);
    push(Math.round(v * 100));          // สัดส่วนที่โชว์เป็น %
    push(Math.round(v * 1000) / 10);
    push(Math.round(v * 100 * 100) / 100);
    push(Math.round(v));
  } else if (Array.isArray(v)) {
    for (const x of v) if (typeof x === "number") { push(x); push(Math.round(x * 100)); push(Math.round(x * 1000) / 10); }
  } else if (typeof v === "boolean") {
    return null;                         // ธง true/false ไม่มีตัวเลขให้หา ตรวจด้วยข้อ 1 อย่างเดียว
  } else {
    push(v);
  }
  return tries.some((t) => t.length > 0 && text.includes(t));
}

// ข้อความทั้งหมดที่ผู้เล่นได้อ่านจริงสำหรับสกิลนี้
function renderedText(sk) {
  const bits = [skillShape(sk), skillSentence(sk), ratioLine(sk), ...flagLines(sk)];
  for (const r of rankedRows(sk)) bits.push(r.label, ...r.values.map(String),
    ...r.values.map((v) => String(Math.round(v * 100))), ...r.values.map((v) => String(Math.round(v * 1000) / 10)));
  for (const r of flatRows(sk)) bits.push(r.label, r.value);
  for (const sub of subSkills(sk)) bits.push(sub.tag, renderedText(sub.sk));
  return bits.filter(Boolean).join(" | ");
}

const noWord = [];   // ชื่อฟิลด์ไม่โผล่ใน skill-desc.js เลย
const noValue = [];  // มีคำอยู่ แต่สกิลนี้ไม่ได้โชว์ค่า
const generic = [];  // ประโยคตกไปที่ default "ใช้สกิล"

function checkOne(champId, key, sk, tag) {
  const text = renderedText(sk);
  if (skillSentence(sk).startsWith("ใช้สกิล")) generic.push(`${champId} ${key}${tag} [${sk.type}]`);
  for (const [f, v] of Object.entries(sk)) {
    if (SKIP.has(f) || v == null || v === false) continue;
    if (typeof v === "object" && !Array.isArray(v)) continue;
    const inSrc = SRC.includes('"' + f + '"') || SRC.includes("sk." + f);
    if (!inSrc) { noWord.push(`${champId} ${key}${tag} · ${f} = ${JSON.stringify(v)}`); continue; }
    const ok = shown(v, text);
    if (ok === false) noValue.push(`${champId} ${key}${tag} · ${f} = ${JSON.stringify(v)}`);
  }
}

for (const c of Object.values(CHAMPIONS)) {
  for (const sk of c.skills) {
    checkOne(c.id, sk.key, sk, "");
    for (const sub of subSkills(sk)) checkOne(c.id, sk.key, sub.sk, " (" + sub.tag + ")");
  }
}

const show = (title, list) => {
  console.log("\n=== " + title + " — " + list.length + " จุด ===");
  for (const l of list) console.log("  " + l);
};
if (generic.length) show("ประโยคตกไปที่ \"ใช้สกิล\" (ไม่ได้บรรยายอะไรเลย)", generic);
show("ชื่อฟิลด์ไม่โผล่ใน skill-desc.js เลย — ไม่มีทางบรรยายได้", noWord);
show("มีคำแปลอยู่ แต่สกิลนี้ไม่ได้โชว์ค่าออกมา", noValue);
console.log("\nรวม " + (generic.length + noWord.length + noValue.length) + " จุดที่ควรดู");
