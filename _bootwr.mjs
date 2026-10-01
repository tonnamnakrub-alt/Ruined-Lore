// ---------------------------------------------------------------
// รองเท้าคุ้มกว่าของชิ้นสุดท้ายในชุดไหม
//
// ---- สามรอบที่เขียนผิดก่อนจะมาเป็นตัวนี้ บันทึกไว้กันพลาดซ้ำ ----
// 1. แถมรองเท้าให้ฝั่งเดียว — ตอนนั้น shop-ai ยัดรองเท้าให้ทุกคนอยู่แล้ว
//    applyBuy ปฏิเสธคู่ที่สอง สองฝั่งเลยเหมือนกันเป๊ะ ได้แต่เลขสุ่ม
// 2. กรองด้วย "มี ms" — กวาดของ tier 3 อีก 16 ชิ้นไปด้วย ต่างกัน 140 แทนที่จะเป็น 45
// 3. ถอดรองเท้าออก — พอปลดบังคับใน shop-ai แล้วบอทไม่ซื้อรองเท้า การถอดจึงไม่ถอดอะไร
//    และจะ "เพิ่ม" ก็ไม่ได้เพราะช่องของเต็ม applyBuy ปฏิเสธ
//
// ตัวนี้เทียบแบบจำนวนช่องเท่ากัน ซึ่งตรงกับสิ่งที่ผู้เล่นเจอหน้าร้านจริง:
//   ฝั่ง A = ชุดที่บอทซื้อ เอาชิ้นท้ายสุดออก ใส่รองเท้าแทน
//   ฝั่ง B = ชุดที่บอทซื้อ ไม่มีรองเท้า
// ถือของเท่ากัน ต่างกันแค่ชิ้นท้ายเป็นรองเท้าหรือเป็นของชิ้นนั้น
//
//   node _bootwr.mjs [จำนวนไฟต์ต่อเคส]
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { ITEM_BY_ID } from "./src/data/items.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";
import { shopFor } from "./src/game/shop-ai.js";
import { mulberry32 } from "./src/engine/util.js";

const N = Number(process.argv[2] || 60);
const LVL = 13;
const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
const BOOT = "sg";                       // Spartan Greaves — 25g · +45 ms
const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));
const isBoot = (it) => !!(it && it.kind === "boots");

const SQUAD = {
  TANK: ["TOTSAKAN", "KLAEDER", "NIAN", "H.S.B", "STEIN"],
  FIGHTER: ["KAZEM", "ARTHUR", "TRISTAN", "LUCH", "ALUCARD"],
  MAGE: ["ARIEL", "LAURA", "JACK", "FAUSTUS", "PIROSKA"],
  MARKSMAN: ["HOOD", "PETER", "C.HOOK", "PHANTOM", "HOOD"],
};
const CATS = Object.keys(SQUAD);

const base = (lane, id) => ({
  lane, champId: id, level: LVL, xp: 0, gold: 200, items: [],
  ranks: autoRanks(LVL, CHAMPIONS[id].skillPriority, null),
  athlete: flat(5), upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE",
});

// withBoots = true  -> ชิ้นท้ายเป็นรองเท้า
// withBoots = false -> ชิ้นท้ายเป็นของที่บอทเลือกเอง
function team(cat, seed, withBoots) {
  const ids = SQUAD[cat];
  const roster = LANES.map((l, i) => base(l, ids[i]));
  return roster.map((c) => {
    const bought = shopFor(c, roster, mulberry32(77 + seed), 0);
    const plain = bought.items.filter((i) => !isBoot(i));
    const items = withBoots
      ? plain.slice(0, Math.max(0, plain.length - 1)).concat([ITEM_BY_ID[BOOT]])
      : plain;
    return toDef({ ...bought, items });
  });
}

function duel(cat) {
  let win = 0, games = 0;
  for (let s = 0; s < N; s++) {
    const swap = s % 2 === 1;                 // สลับสีครึ่งหนึ่ง กันข้อได้เปรียบของฝั่งน้ำเงิน
    const A = team(cat, s, true), B = team(cat, s, false);
    const st = buildFight(swap ? B : A, swap ? A : B, s * 7919 + 13, DEFAULT_FIGHT);
    let g = 0;
    while (!st.over && g++ < 60 * 200) step(st);
    const mine = swap ? "red" : "blue";
    games++;
    if (st.winner === mine) win++;
    else if (!st.winner) win += 0.5;
  }
  return (100 * win) / games;
}

const margin = 196 * Math.sqrt(0.25 / N);
console.log(`วัดเคสละ ${N} ไฟต์ · ค่าคลาดเคลื่อนต่อเคสราว ±${margin.toFixed(1)} แต้ม`);
console.log(`เทียบ: ชิ้นท้ายสุดเป็น ${ITEM_BY_ID[BOOT].th} (${ITEM_BY_ID[BOOT].cost}g) แทนของที่บอทเลือกเอง\n`);

// ตรวจก่อนวัดว่าสองฝั่งต่างกันจริง ทั้งความเร็วและจำนวนช่อง
// สามรอบที่ผ่านมาพังเงียบๆ เพราะไม่มีตัวนี้ ปล่อยให้วัดต่อจนได้เลขที่ดูเหมือนใช้ได้
{
  const A = team("FIGHTER", 0, true), B = team("FIGHTER", 0, false);
  const st = buildFight(A, B, 7, DEFAULT_FIGHT);
  const w = st.units.find((u) => u.team === "blue"), x = st.units.find((u) => u.team === "red");
  const sameSlots = A[0].items.length === B[0].items.length;
  const ok = w.moveSpeed > x.moveSpeed && sameSlots;
  console.log("ตรวจก่อนวัด — ความเร็วเดิน ใส่รองเท้า " + w.moveSpeed + " · ไม่ใส่ " + x.moveSpeed
    + " · ช่องของ " + A[0].items.length + " vs " + B[0].items.length
    + (ok ? "  ✅ ต่างกันที่รองเท้าอย่างเดียว" : "  ❌ ไม่ผ่าน หยุดตรงนี้"));
  if (!ok) process.exit(1);
}

const msNow = {};
for (const c of Object.values(CHAMPIONS)) msNow[c.id] = c.ms;

function runWorld(label) {
  console.log("\n=== " + label + " ===");
  let sum = 0;
  for (const cat of CATS) {
    const wr = duel(cat);
    sum += wr;
    console.log("  " + cat.padEnd(11) + (wr.toFixed(1) + "%").padStart(8));
  }
  const avg = sum / CATS.length;
  console.log("  " + "เฉลี่ย".padEnd(10) + (avg.toFixed(1) + "%").padStart(9));
  return avg;
}

const now = runWorld("ตอนนี้ — ความเร็วเดินฐาน 325/330/335");
for (const c of Object.values(CHAMPIONS)) c.ms = msNow[c.id] + 20;
const before = runWorld("ถ้าความเร็วเดินฐานสูงกว่านี้ 20");
for (const c of Object.values(CHAMPIONS)) c.ms = msNow[c.id];

console.log("\n=== สรุป ===");
console.log("รองเท้าแทนของชิ้นท้าย   ตอนนี้ " + now.toFixed(1) + "%  ·  ฐานสูงกว่า 20 " + before.toFixed(1)
  + "%  ·  ต่าง " + (now - before >= 0 ? "+" : "") + (now - before).toFixed(1));
console.log("เกิน 50% = รองเท้าคุ้มกว่าของชิ้นนั้น · ค่าคลาดเคลื่อนของค่าเฉลี่ยราว ±" + (margin / 2).toFixed(1) + " แต้ม");
