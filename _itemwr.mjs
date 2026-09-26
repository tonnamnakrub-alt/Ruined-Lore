// ---------------------------------------------------------------
// ไอเทมชิ้นไหนแรงเกิน — วัดด้วยการแจกให้ทีมหนึ่งเกินมาหนึ่งชิ้น
//
// สองทีมเหมือนกันเป๊ะทุกอย่าง ตัวละคร เลเวล ค่าสถานะนักแข่ง และของที่บอทซื้อเอง
// ต่างกันอย่างเดียวคือฝั่งหนึ่งได้ไอเทมที่กำลังวัดเพิ่มมาคนละชิ้น
// สลับสีครึ่งหนึ่งกันข้อได้เปรียบของฝั่งน้ำเงิน
//
// 50% = ไอเทมไม่มีผลเลย · ยิ่งเกินยิ่งแรง
//
//   node _itemwr.mjs [จำนวนไฟต์ต่อชิ้น]
// ---------------------------------------------------------------
import fs from "fs";
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { ITEMS, applyBuy } from "./src/data/items.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";
import { shopFor } from "./src/game/shop-ai.js";
import { mulberry32 } from "./src/engine/util.js";

const N = Number(process.argv[2] || 24);
const LVL = 13;
const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));

// ทีมมาตรฐานที่ใช้วัดทุกชิ้น — ครบห้าตำแหน่งและคละสายดาเมจ
const SIDE = [["TOP", "KAZEM"], ["JUNGLE", "ALUCARD"], ["MID", "LAURA"], ["ADC", "PETER"], ["SUPPORT", "PINO"]];

const base = (lane, id) => ({
  lane, champId: id, level: LVL, xp: 0, gold: 200, items: [],
  ranks: autoRanks(LVL, CHAMPIONS[id].skillPriority, null),
  athlete: flat(5), upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE",
});

// บอทซื้อของให้ทั้งสองฝั่งเหมือนกัน แล้วค่อยแถมชิ้นที่วัดให้ฝั่งเดียว
function team(seed, extra) {
  const roster = SIDE.map(([l, c]) => base(l, c));
  return roster.map((c) => {
    let out = shopFor(c, roster, mulberry32(77 + seed), 0);
    if (extra) {
      const nx = applyBuy({ ...out, gold: 99999 }, extra);
      if (nx.items.length > out.items.length) out = { ...nx, gold: out.gold };
    }
    return toDef(out);
  });
}

function winRate(item) {
  let win = 0, games = 0;
  for (let s = 0; s < N; s++) {
    const swap = s % 2 === 1;
    const withIt = team(s, item);
    const without = team(s, null);
    const st = buildFight(swap ? without : withIt, swap ? withIt : without, s * 7919 + 13, DEFAULT_FIGHT);
    let g = 0;
    while (!st.over && g++ < 60 * 200) step(st);
    const mine = swap ? "red" : "blue";
    games++;
    if (st.winner === mine) win++;
    else if (!st.winner) win += 0.5;           // หมดเวลาแบบไม่มีผู้ชนะ นับครึ่ง
  }
  return (100 * win) / games;
}

const baseline = winRate(null);
console.log(`ฐาน (สองทีมของเท่ากันเป๊ะ): ${baseline.toFixed(1)}%  — ควรใกล้ 50%`);
console.log(`วัดชิ้นละ ${N} ไฟต์ · ค่าคลาดเคลื่อนราว ±${(196 * Math.sqrt(0.25 / N)).toFixed(1)} แต้ม\n`);

const t3 = ITEMS.filter((i) => i.tier === 3);
const rows = [];
for (const it of t3) {
  rows.push({
    id: it.id, cat: it.cat, cost: it.cost,
    name: String(it.th || it.id).split("—")[0].trim(),
    wr: winRate(it),
  });
}
rows.sort((a, b) => b.wr - a.wr);

const line = (r) => "  " + r.cat.padEnd(9) + r.id.padEnd(6) + String(r.cost).padStart(3) + "g  " +
  r.wr.toFixed(1).padStart(5) + "%   " + r.name;
console.log("=== แรงสุด 12 อันดับ ===");
rows.slice(0, 12).forEach((r) => console.log(line(r)));
console.log("\n=== อ่อนสุด 12 อันดับ ===");
rows.slice(-12).reverse().forEach((r) => console.log(line(r)));
console.log("\n=== ค่าเฉลี่ยรายสาย ===");
for (const cat of ["TANK", "FIGHTER", "ASSASSIN", "MAGE", "MARKSMAN", "SUPPORT"]) {
  const t = rows.filter((r) => r.cat === cat);
  if (!t.length) continue;
  console.log("  " + cat.padEnd(9), (t.reduce((a, r) => a + r.wr, 0) / t.length).toFixed(1) + "%");
}

fs.writeFileSync("item-wr.json", JSON.stringify({
  fightsEach: N, baseline: Number(baseline.toFixed(1)),
  margin: Number((196 * Math.sqrt(0.25 / N)).toFixed(1)),
  rows: rows.map((r) => ({ ...r, wr: Number(r.wr.toFixed(1)) })),
}, null, 1));
console.log("\nเขียน item-wr.json แล้ว");
