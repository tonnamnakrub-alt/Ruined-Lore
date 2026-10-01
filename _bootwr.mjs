// ---------------------------------------------------------------
// รองเท้ามีผลแล้วหรือยัง หลังลดความเร็วเดินฐานเหลือ 325/330/335
//
// ---- ที่เขียนผิดรอบแรก ----
// รอบแรกวัดด้วยการ "แถมรองเท้าให้ฝั่งเดียว" ซึ่งใช้ไม่ได้เลย
// เพราะ shop-ai ยัดรองเท้าเป็นชิ้นที่สองให้ทุกคนอยู่แล้ว (shop-ai.js:320)
// applyBuy จึงปฏิเสธคู่ที่สอง ทั้งสองฝั่งเลยเหมือนกันเป๊ะ ได้แต่เลขสุ่ม
//
// รอบนี้กลับด้าน — ถอดรองเท้าออกจากฝั่งหนึ่ง ยืนยันแล้วว่าความเร็วลดจาก 380 เหลือ 335 จริง
//   A vs B  มีรองเท้า เทียบ ถอดออกแล้วปล่อยช่องว่าง = คุณค่ารองเท้าเทียบกับไม่มีอะไรเลย
//   A vs C  มีรองเท้า เทียบ เอาเงินไปซื้อของสายตัวเองแทน = คำถามจริงที่เจอหน้าร้าน
// แล้ววัดซ้ำในโลกที่ความเร็วฐานสูงกว่านี้ 20 เพื่อตอบว่าการลดครั้งนั้นเปลี่ยนอะไรไหม
//
//   node _bootwr.mjs [จำนวนไฟต์ต่อเคส]
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { ITEM_BY_ID, applyBuy } from "./src/data/items.js";
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
const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));
// ต้องใช้ kind === "boots" ไม่ใช่ "มี ms" เฉยๆ
// ของ tier 3 อีก 16 ชิ้นก็ให้ความเร็วเดิน ถ้ากรองด้วย ms จะถอดพวกนั้นไปด้วย
// (รอบแรกเขียนแบบนั้น ความเร็วเลยต่างกัน 140 แทนที่จะเป็น 45 ตามรองเท้าจริง)
const isBoot = (it) => !!(it && it.kind === "boots");

const SQUAD = {
  TANK: ["TOTSAKAN", "KLAEDER", "NIAN", "H.S.B", "STEIN"],
  FIGHTER: ["KAZEM", "ARTHUR", "TRISTAN", "LUCH", "ALUCARD"],
  MAGE: ["ARIEL", "LAURA", "JACK", "FAUSTUS", "PIROSKA"],
  MARKSMAN: ["HOOD", "PETER", "C.HOOK", "PHANTOM", "HOOD"],
};
const CATS = Object.keys(SQUAD);

// ของสายนั้นที่ใช้แทนรองเท้า — ทุกชิ้นถูกกว่ารองเท้า 25g ซึ่งเข้าข้างรองเท้าอยู่แล้ว
const ALT_BY_CAT = { TANK: "ghs", FIGHTER: "dwe", MAGE: "cyw", MARKSMAN: "hsd" };

const base = (lane, id) => ({
  lane, champId: id, level: LVL, xp: 0, gold: 200, items: [],
  ranks: autoRanks(LVL, CHAMPIONS[id].skillPriority, null),
  athlete: flat(5), upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE",
});

// mode: "boots" ปกติ · "strip" ถอดรองเท้าทิ้ง · "swap" ถอดแล้วซื้อของสายตัวเองแทน
function team(cat, seed, mode) {
  const ids = SQUAD[cat];
  const roster = LANES.map((l, i) => base(l, ids[i]));
  return roster.map((c) => {
    let out = shopFor(c, roster, mulberry32(77 + seed), 0);
    if (mode !== "boots") {
      out = { ...out, items: out.items.filter((i) => !isBoot(i)) };
      if (mode === "swap") {
        const nx = applyBuy({ ...out, gold: 99999 }, ALT_BY_CAT[cat]);
        if (nx.items.length > out.items.length) out = { ...nx, gold: out.gold };
      }
    }
    return toDef(out);
  });
}

function duel(cat, a, b) {
  let win = 0, games = 0;
  for (let s = 0; s < N; s++) {
    const swap = s % 2 === 1;
    const A = team(cat, s, a), B = team(cat, s, b);
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
for (const [cat, id] of Object.entries(ALT_BY_CAT)) {
  console.log("  ของที่ใช้แทนรองเท้าของสาย " + cat.padEnd(9) + ITEM_BY_ID[id].th + " (" + ITEM_BY_ID[id].cost + "g)");
}

// ตรวจก่อนว่าถอดรองเท้าแล้วความเร็วลดจริง ไม่งั้นวัดอะไรก็ไม่มีความหมาย
{
  const A = team("FIGHTER", 0, "boots"), B = team("FIGHTER", 0, "strip");
  const st = buildFight(A, B, 7, DEFAULT_FIGHT);
  const w = st.units.filter((u) => u.team === "blue")[0], x = st.units.filter((u) => u.team === "red")[0];
  console.log("\nตรวจก่อนวัด — ความเร็วเดินในสนาม มีรองเท้า " + w.moveSpeed + " · ถอดออก " + x.moveSpeed
    + (w.moveSpeed > x.moveSpeed ? "  ✅ ต่างกันจริง" : "  ❌ ไม่ต่าง หยุดตรงนี้"));
  if (!(w.moveSpeed > x.moveSpeed)) process.exit(1);
}

function runWorld(label) {
  console.log("\n=== " + label + " ===");
  const rows = [];
  for (const cat of CATS) rows.push([cat, duel(cat, "boots", "strip"), duel(cat, "boots", "swap")]);
  console.log("  สาย        รองเท้า vs ช่องว่าง   รองเท้า vs ของสายตัวเอง");
  for (const [cat, vsNone, vsAlt] of rows) {
    console.log("  " + cat.padEnd(11) + (vsNone.toFixed(1) + "%").padStart(12) + (vsAlt.toFixed(1) + "%").padStart(23));
  }
  const a = rows.reduce((s, r) => s + r[1], 0) / rows.length;
  const b = rows.reduce((s, r) => s + r[2], 0) / rows.length;
  console.log("  " + "เฉลี่ย".padEnd(10) + (a.toFixed(1) + "%").padStart(13) + (b.toFixed(1) + "%").padStart(23));
  return { vsNone: a, vsAlt: b };
}

const msNow = {};
for (const c of Object.values(CHAMPIONS)) msNow[c.id] = c.ms;
const now = runWorld("ตอนนี้ — ความเร็วเดินฐาน 325/330/335");
for (const c of Object.values(CHAMPIONS)) c.ms = msNow[c.id] + 20;
const before = runWorld("ถ้าความเร็วเดินฐานสูงกว่านี้ 20 (ใกล้ของเดิม)");
for (const c of Object.values(CHAMPIONS)) c.ms = msNow[c.id];

const d = (x, y) => (x - y >= 0 ? "+" : "") + (x - y).toFixed(1);
console.log("\n=== สรุป ===");
console.log("รองเท้า vs ช่องว่าง       ตอนนี้ " + now.vsNone.toFixed(1) + "%  ·  ฐานสูงกว่า 20 " + before.vsNone.toFixed(1) + "%  ·  ต่าง " + d(now.vsNone, before.vsNone));
console.log("รองเท้า vs ของสายตัวเอง   ตอนนี้ " + now.vsAlt.toFixed(1) + "%  ·  ฐานสูงกว่า 20 " + before.vsAlt.toFixed(1) + "%  ·  ต่าง " + d(now.vsAlt, before.vsAlt));
console.log("\nค่าคลาดเคลื่อนของค่าเฉลี่ยสี่สายราว ±" + (margin / 2).toFixed(1) + " แต้ม");
