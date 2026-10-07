// ---------------------------------------------------------------
// บอทดราฟต์ฉลาดขึ้น และการสุ่มว่าใครเลือกก่อน
//   node _draft_test.mjs
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { botBan, botPickOne, isMagic, readFoeTeam } from "./src/game/bot-draft.js";
import { PICK_ORDER, draftTurn, newDraft, draftApply } from "./src/game/draft.js";
import { setLang } from "./src/i18n.js";

setLang("th");
const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);
const mul = (s) => { let x = s >>> 0; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); };

const all = Object.values(CHAMPIONS);
const poolAvgValue = all.reduce((a, c) => a + c.value, 0) / all.length;
const mr18 = (c) => c.mr + c.mrG * 17;
const ar18 = (c) => c.armor + c.armorG * 17;

// ดราฟต์ทีมบอทห้าตัว ภายใต้ทีมคู่ต่อสู้ที่กำหนด
function draft5(seed, theirs, skill = 1, variety = 0.25) {
  const r = mul(seed);
  const taken = [...theirs], mine = [];
  for (let i = 0; i < 5; i++) {
    const id = botPickOne(r, taken, mine, variety, theirs, skill);
    if (!id) break;
    taken.push(id); mine.push(id);
  }
  return mine.map((id) => CHAMPIONS[id]);
}
const avgOver = (theirs, f, skill = 1, variety = 0.25) => {
  let sum = 0, n = 0;
  for (let s = 1; s <= 60; s++) for (const c of draft5(s, theirs, skill, variety)) { sum += f(c); n++; }
  return sum / n;
};

// ---- เลือกตัวแรงจริง
{
  const got = avgOver([], (c) => c.value);
  t("บอทเลือกตัวที่แรงกว่าค่าเฉลี่ยของกอง", got > poolAvgValue + 0.04,
    "บอทได้เฉลี่ย " + got.toFixed(3) + " · ทั้งกอง " + poolAvgValue.toFixed(3));
}
{
  // ความสุ่มมาจาก variety ซึ่งต่างกันตามระดับบอท (ง่าย 0.75 · ยาก 0.10)
  // บอทง่ายต้องเข้าใกล้ค่าเฉลี่ยของกองมากกว่าบอทยาก
  const hard = avgOver([], (c) => c.value, 1, 0.10);
  const easy = avgOver([], (c) => c.value, 1, 0.75);
  t("บอทระดับยากเลือกตัวแรงกว่าบอทระดับง่าย",
    hard > easy && Math.abs(hard - poolAvgValue) > Math.abs(easy - poolAvgValue),
    "ยาก " + hard.toFixed(3) + " · ง่าย " + easy.toFixed(3) + " · ทั้งกอง " + poolAvgValue.toFixed(3));
}

// ---- แก้ทางตามชนิดดาเมจ
{
  const magicFoes = all.filter(isMagic).slice(0, 4).map((c) => c.id);
  const physFoes = all.filter((c) => !isMagic(c)).slice(0, 4).map((c) => c.id);
  const vsMagicMr = avgOver(magicFoes, mr18);
  const vsPhysMr = avgOver(physFoes, mr18);
  t("เจอทีมสายเวท บอทเลือกตัวต้านเวทสูงกว่าตอนเจอสายกาย", vsMagicMr > vsPhysMr + 1,
    "เจอสายเวท " + vsMagicMr.toFixed(1) + " · เจอสายกาย " + vsPhysMr.toFixed(1));
  const vsPhysAr = avgOver(physFoes, ar18);
  const vsMagicAr = avgOver(magicFoes, ar18);
  t("เจอทีมสายกาย บอทเลือกตัวเกราะสูงกว่าตอนเจอสายเวท", vsPhysAr > vsMagicAr + 1,
    "เจอสายกาย " + vsPhysAr.toFixed(1) + " · เจอสายเวท " + vsMagicAr.toFixed(1));
}
{
  // ฝีมือต่ำแก้ทางไม่เป็น ส่วนต่างต้องแคบกว่าฝีมือสูงชัดเจน
  const magicFoes = all.filter(isMagic).slice(0, 4).map((c) => c.id);
  const physFoes = all.filter((c) => !isMagic(c)).slice(0, 4).map((c) => c.id);
  const gapHi = avgOver(magicFoes, mr18, 1) - avgOver(physFoes, mr18, 1);
  const gapLo = avgOver(magicFoes, mr18, 0) - avgOver(physFoes, mr18, 0);
  t("บอทฝีมือต่ำแก้ทางไม่เป็น ส่วนต่างแคบกว่า", gapHi > gapLo,
    "ฝีมือสูงต่าง " + gapHi.toFixed(1) + " · ฝีมือต่ำต่าง " + gapLo.toFixed(1));
}

// ---- อ่านทีมคู่ต่อสู้ออกมาเป็นตัวเลขได้ถูก
{
  const magicFoes = all.filter(isMagic).slice(0, 4).map((c) => c.id);
  const read = readFoeTeam(magicFoes);
  t("อ่านทีมสายเวทได้ว่าเป็นสายเวทล้วน", read.n === 4 && read.magicShare === 1,
    "n=" + read.n + " สัดส่วนสายเวท " + read.magicShare);
  t("ทีมว่างอ่านแล้วไม่พัง", readFoeTeam([]).n === 0 && readFoeTeam(null).n === 0, "ok");
}

// ---- แบนตัวแรงก่อน
{
  let sum = 0, n = 0;
  for (let s = 1; s <= 60; s++) {
    const id = botBan(mul(s), []);
    sum += CHAMPIONS[id].value; n++;
  }
  t("บอทแบนตัวที่แรงกว่าค่าเฉลี่ยของกอง", sum / n > poolAvgValue + 0.05,
    "แบนเฉลี่ย " + (sum / n).toFixed(3) + " · ทั้งกอง " + poolAvgValue.toFixed(3));
}

// ---- ลำดับ Snake ยังเหมือนเดิม และฝั่งไหนก็เดินได้
{
  t("ลำดับหยิบยังเป็น Snake 1-2-2-2-2-1", PICK_ORDER.join("") === "ABBAABBAAB",
    PICK_ORDER.join(""));
  // ไล่ดราฟต์จนจบจากฝั่ง B เป็นคนเริ่มไม่ได้ (A เริ่มเสมอตามลำดับ)
  // แต่ผู้เล่นเป็นฝั่ง B ได้ — เช็กว่าตาแรกเป็นของ A จริง แล้วบอทที่เป็น A เดินได้
  let d = newDraft("DRAFT");
  t("ตาแรกเป็นของฝั่ง A เสมอ", draftTurn(d).side === "A", draftTurn(d).side);
  d = draftApply(d, all[0].id, "");
  t("ตาที่สองเป็นของฝั่ง B", draftTurn(d).side === "B", draftTurn(d).side);
}

let bad = 0;
for (const [n, ok, d] of out) {
  if (!ok) bad++;
  console.log((ok ? " ok  " : " FAIL") + " " + n.padEnd(56) + " " + d);
}
console.log("\nไม่ผ่าน " + bad + " / " + out.length);
if (bad) process.exit(1);
