// ---------------------------------------------------------------
// วัดค่าของตัวซัพพอร์ตแบบที่ตาราง 1v1 วัดไม่ได้
//
// ตาราง _champwr.mjs ให้ทุกตัวยืนเดี่ยว ซึ่งลบผลงานของซัพทิ้งทั้งหมด
// เพราะโล่ที่กางให้เพื่อน ฮีลที่จ่ายให้เพื่อน และดาเมจที่รับแทนเพื่อน
// ไม่มีเพื่อนให้ใช้ ตัวนี้จึงจับคู่ซัพกับแครี่แล้ววัดว่า "แครี่อยู่รอดขึ้นไหม"
//
//   node _p4team.mjs [จำนวน seed] [เลเวล]
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { step } from "./src/engine/step.js";
import { shopFor } from "./src/game/shop-ai.js";
import { mulberry32 } from "./src/engine/util.js";

const SEEDS = Number(process.argv[2] || 20);
const LVL = Number(process.argv[3] || 13);
const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));

const GOLD = 400;
// โครงตัวเปล่าสำหรับส่งเข้าร้านค้า — รูปแบบเดียวกับที่ _champwr.mjs ใช้
const bare = (id, lane) => ({
  lane, champId: id, level: LVL, xp: 0, gold: GOLD, items: [],
  ranks: autoRanks(LVL, CHAMPIONS[id].skillPriority, null),
  athlete: flat(7), upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "X", athleteName: "X", style: CHAMPIONS[id].melee ? "ENGAGE" : "POKE",
});
const shopped = new Map();
function def(champId, lane) {
  if (!shopped.has(champId)) {
    shopped.set(champId, shopFor(bare(champId, lane), [bare("KAZEM", "TOP")], mulberry32(4242), 0));
  }
  return shopped.get(champId);
}

// ฝั่งน้ำเงิน: แครี่ + ซัพ (หรือแครี่เดี่ยวถ้า sup เป็น null)
// ฝั่งแดง: คู่ต่อสู้มาตรฐานสองตัวเท่ากันทุกรอบ
function run(sup, seed) {
  const blue = [def("C.HOOK", "ADC")];
  if (sup) blue.push(def(sup, "SUPPORT"));
  const red = [def("KAZEM", "TOP"), def("ARIEL", "MID")];
  const st = buildFight(blue, red, seed, DEFAULT_FIGHT);
  let g = 0;
  const limit = 60 * 70;
  while (g++ < limit
    && st.units.some((u) => u.team === "blue" && u.alive)
    && st.units.some((u) => u.team === "red" && u.alive)) step(st);
  const carry = st.units[0];
  const blueLeft = st.units.filter((u) => u.team === "blue" && u.alive).length;
  const redLeft = st.units.filter((u) => u.team === "red" && u.alive).length;
  return {
    win: blueLeft > 0 && redLeft === 0,
    carryLived: carry.alive,
    carryDmg: carry.damageDealt || 0,
    supGive: sup ? (st.units[1].healGiven || 0) + (st.units[1].shieldGiven || 0) : 0,
    supAbsorb: sup ? (st.units[1].shieldAbsorbed || 0) : 0,
  };
}

const SUPS = [null, "STEIN", "H.S.B", "PIROSKA", "PINO", "ALICE"];
console.log("=== แครี่ + ซัพ ปะทะคู่ต่อสู้ชุดเดียวกัน · เลเวล " + LVL + " · " + SEEDS + " seed ===");
console.log("(ฝั่งแดงเป็น KAZEM + ARIEL เท่ากันทุกรอบ · แครี่เป็น C.HOOK เท่ากันทุกรอบ)");
console.log("(แถว \"ไม่มีซัพ\" คือแครี่ยืนเดี่ยว 1v2 — ใช้เป็นเส้นฐานว่าซัพเพิ่มอะไรให้บ้าง)\n");
console.log("ซัพพอร์ต    ชนะไฟต์  แครี่รอด  ดาเมจแครี่  ฮีล+โล่ที่จ่าย  รับดาเมจแทนเพื่อน");
for (const sup of SUPS) {
  let win = 0, lived = 0, dmg = 0, give = 0, abs = 0;
  for (let s = 1; s <= SEEDS; s++) {
    const r = run(sup, s * 17);
    if (r.win) win++;
    if (r.carryLived) lived++;
    dmg += r.carryDmg; give += r.supGive; abs += r.supAbsorb;
  }
  const n = SEEDS;
  console.log(
    (sup || "ไม่มีซัพ").padEnd(11)
    + (Math.round(win / n * 100) + "%").padStart(7)
    + (Math.round(lived / n * 100) + "%").padStart(10)
    + String(Math.round(dmg / n)).padStart(12)
    + String(Math.round(give / n)).padStart(16)
    + String(Math.round(abs / n)).padStart(19)
  );
}
