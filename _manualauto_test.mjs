// ---------------------------------------------------------------
// ออโต้ของฝั่งที่ผู้เล่นคุมเอง (ห้องซ้อม) ต้องเดินทางเดียวกับของ AI
//
// เดิมเป็นโค้ดคนละชุด ทางเดิน manual จึงไม่มี AUTO_DMG ไม่มีคริ
// และไม่เรียกของที่ผูกกับออโต้เลย — พาสซีฟ YODAKA ตายเงียบในห้องซ้อม
// (เคยเกิดกับพาสซีฟ KAZEM มาก่อน ดู engine/kazem.js)
//
// เทสนี้จำลองห้องซ้อมให้เหมือนของจริง แล้วเช็คทีละข้อ
// ---------------------------------------------------------------
import { ARENA_H, ARENA_W } from "./src/data/constants.js";
import { CHAMPIONS } from "./src/data/champions.js";
import { AUTO_DMG, DEFAULT_FIGHT, DMG_MUL } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { autoRanks, emptyRanks } from "./src/engine/skill-ranks.js";
import { step } from "./src/engine/step.js";

const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);

// สร้างสนามแบบเดียวกับ ui/Practice.jsx เป๊ะ
function practice(champId, level = 18) {
  const ch = CHAMPIONS[champId];
  const me = {
    lane: ch.lane, champId, char: "P", athleteName: "P",
    athlete: { mechanics: 10, gameSense: 10, knowledge: 10, decision: 10, teamwork: 10 },
    style: "POKE", level, items: [], ranks: autoRanks(level, ch.skillPriority, null),
  };
  const dm = {
    lane: "MID", champId: "KAZEM", char: "D", athleteName: "D",
    athlete: { mechanics: 0, gameSense: 0, knowledge: 0, decision: 0, teamwork: 0 },
    style: "HOLD", level: 1, items: [], ranks: emptyRanks(),
  };
  const st = buildFight([me], [dm], 7, DEFAULT_FIGHT);
  st.timeLimit = 1e9;
  st.rampStart = 1e9;
  const p = st.units[0], d = st.units[1];
  d.maxHp = 100000; d.hp = 100000;
  d.baseArmor = 0; d.rawArmor = 0; d.armor = 0;
  d.baseMr = 0; d.mr = 0; d.noRegen = true;
  d.manual = { moveTo: null, autoAttack: false, targetId: null, castKey: null, castPoint: null };
  for (const sk of p.skills) sk.cdLeft = 0;
  d.x = ARENA_W * 0.62; d.y = ARENA_H / 2;
  p.x = ARENA_W * 0.34; p.y = ARENA_H / 2;
  p.manual = { moveTo: null, autoAttack: true, targetId: d.id, castKey: null, castPoint: null };
  return { st, p, d };
}

// ---- ออโต้ในห้องซ้อมต้องแรงเท่าในไฟต์จริง ----
{
  const { st, p, d } = practice("KAZEM");
  p.x = d.x - 120; p.y = d.y;
  p.crit = 0;                       // ตัดคริออกเพื่อวัดก้อนฐานล้วนๆ
  const hp0 = d.hp, s0 = p.shots;
  let g = 0;
  while (g++ < 60 * 3 && p.shots - s0 < 1) step(st);
  for (let i = 0; i < 5; i++) step(st);
  const dealt = hp0 - d.hp;
  // ดัมมี่มีเกราะของตัวเองตามเลเวล คิดส่วนลดเกราะเข้าไปด้วยถึงจะเทียบได้
  const mit = 100 / (100 + d.armor);
  const want = p.ad * AUTO_DMG * mit * DMG_MUL;
  const noMul = p.ad * mit * DMG_MUL;
  t("ออโต้ในห้องซ้อมคิด AUTO_DMG เหมือนในไฟต์", Math.abs(dealt - want) < want * 0.06,
    Math.round(dealt) + " ดาเมจ · ควรได้ " + Math.round(want) +
    " (AD " + Math.round(p.ad) + " × " + AUTO_DMG + " × " + DMG_MUL + " · เกราะ " + Math.round(d.armor) + ")");
  t("ไม่ได้คิดเต็ม AD ดิบเหมือนเดิม", dealt < noMul * 0.95,
    "ถ้าไม่คูณจะได้ " + Math.round(noMul));
}

// ---- พาสซีฟ YODAKA ต้องทำงานตอนผู้เล่นคุมเอง ----
{
  const { st, p, d } = practice("YODAKA");
  p.manual.autoAttack = false;
  const keys = ["Q", "W", "E"];
  const got = {};
  for (const k of keys) {
    p.starStacks = 0;
    for (const sk of p.skills) sk.cdLeft = 0;
    p.manual.castKey = k;
    for (let i = 0; i < 30; i++) step(st);
    got[k] = p.starStacks || 0;
  }
  t("ร่าย Q ได้สแตกดาว", got.Q >= 1, "ได้ " + got.Q + " สแตก");
  t("ร่าย W ได้สแตกดาว", got.W >= 1, "ได้ " + got.W + " สแตก");
  t("ร่าย E ได้สแตกดาว", got.E >= 1, "ได้ " + got.E + " สแตก");

  // มีสแตกแล้วออโต้ต้องพุ่งทะลวงไปโผล่หลังเป้าและกินทั้งแนว
  p.manual.autoAttack = true;
  p.starStacks = 2; p.starUntil = st.t + 6;
  p.x = d.x - 300; p.y = d.y;
  const x0 = p.x, hp0 = d.hp;
  let g = 0;
  while (g++ < 60 * 4 && p.starStacks === 2) step(st);
  for (let i = 0; i < 5; i++) step(st);
  t("สแตกถูกใช้ตอนออโต้", p.starStacks < 2, "เหลือ " + p.starStacks + " สแตก");
  t("พุ่งทะลุไปโผล่หลังเป้า", p.x > d.x, "จาก x " + Math.round(x0) + " ไป " + Math.round(p.x) + " (เป้าอยู่ " + Math.round(d.x) + ")");
  const pierce = Object.entries(p.dealtBy || {}).filter(([k]) => k.includes("Starlight"));
  t("มีดาเมจจากพาสซีฟจริง", pierce.length > 0 && pierce[0][1] > 0,
    pierce.length ? Math.round(pierce[0][1]) + " ดาเมจ" : "ไม่มีดาเมจพาสซีฟเลย");
  t("เป้าเสียเลือดจริง", d.hp < hp0, Math.round(hp0 - d.hp) + " ดาเมจรวม");

  // ระยะออโต้ต้องยืดเป็น 400 ตอนมีสแตก แล้วกลับเป็น 150 ตอนหมด
  p.starStacks = 1; p.starUntil = st.t + 6;
  step(st);
  const on = p.range;
  p.starStacks = 0;
  step(st);
  t("มีสแตกแล้วระยะออโต้ยืดเป็น 300", on === 300, on + " หน่วย");
  t("หมดสแตกแล้วระยะกลับเป็นเดิม", p.range === CHAMPIONS.YODAKA.range, p.range + " หน่วย");
}

// ---- ระหว่างลอยอยู่บนฟ้าจากอัลติ พาสซีฟต้องพัก ----
{
  const { st, p, d } = practice("YODAKA");
  p.manual.autoAttack = false;
  p.x = d.x - 300; p.y = d.y;
  p.starStacks = 3; p.starUntil = st.t + 6;
  p.manual.castKey = "R";
  for (let i = 0; i < 12; i++) step(st);
  t("ลอยอยู่บนฟ้าจริง", p.airFree != null && st.t < p.airFree, "airFree ถึง " + (p.airFree || 0).toFixed(2) + " วิ");
  t("ระหว่างลอยไม่เอาระยะพาสซีฟมาใช้", p.range === CHAMPIONS.YODAKA.range, p.range + " หน่วย");
  const x0 = p.x;
  p.manual.autoAttack = true;
  for (let i = 0; i < 30; i++) step(st);
  t("ระหว่างลอยไม่พุ่งทะลวงหลุดออกจากวง", Math.abs(p.x - x0) < 200 && p.starStacks === 3,
    "ขยับ " + Math.round(Math.abs(p.x - x0)) + " หน่วย · สแตกเหลือ " + p.starStacks);
}

// ---- ELLA R ในห้องซ้อม: ออโต้เปิดตัวต้องลากราชรถลงมาทุบจริง ----
{
  const { st, p, d } = practice("ELLA");
  p.x = d.x - 300; p.y = d.y;
  p.manual.castKey = "R";
  for (let i = 0; i < 6; i++) step(st);
  t("กด R แล้วล่องหนและยืดระยะออโต้", !!p.carriage && p.range === 550,
    "carriage=" + !!p.carriage + " · ระยะ " + p.range);
  const hp0 = d.hp;
  let g = 0;
  while (g++ < 60 * 8 && p.carriage) step(st);
  for (let i = 0; i < 5; i++) step(st);
  const rDmg = Object.entries(p.dealtBy || {}).filter(([k]) => k.includes("Carriage"));
  t("ราชรถลงมาทุบจริง", rDmg.length > 0 && rDmg[0][1] > 0,
    rDmg.length ? Math.round(rDmg[0][1]) + " ดาเมจ" : "ไม่มีดาเมจจาก R เลย");
  t("ทุบแล้วระยะออโต้กลับเป็นเดิม", p.range === CHAMPIONS.ELLA.range, p.range + " หน่วย");
  t("เป้าเสียเลือดจากยกนี้", d.hp < hp0, Math.round(hp0 - d.hp) + " ดาเมจรวม");
}

// ---- ELLA ไม่ควรอยู่ในรายชื่อซัพพอร์ตอีกต่อไป ----
{
  const e = CHAMPIONS.ELLA;
  const lanes = [e.lane, ...(e.alsoLanes || [])];
  t("ELLA ไม่ลงซัพแล้ว", !lanes.includes("SUPPORT"), "ลงได้: " + lanes.join(", "));
  t("ELLA ยังลงป่าได้เหมือนเดิม", lanes.includes("JUNGLE"), "เลนหลัก " + e.lane);
}

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(42) + " " + d); }
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
