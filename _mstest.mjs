// ---------------------------------------------------------------
// ความเร็วเดินมีผลกับผลแพ้ชนะจริงไหม
//
// สองทีมเหมือนกันเป๊ะ ต่างกันอย่างเดียวคือฝั่งหนึ่งเดินเร็วกว่า
// 50% = ความเร็วเดินไม่มีผลเลย
//
// ทำเพื่อตอบคำถามว่า "รองเท้าไม่รู้สึกว่ามีผล" เป็นเพราะเลขน้อยไป
// หรือเพราะเอนจินนี้แทบไม่ให้ค่ากับการเดินตั้งแต่แรก
//
//   node _mstest.mjs [จำนวนไฟต์ต่อจุด]
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";
import { shopFor } from "./src/game/shop-ai.js";
import { mulberry32 } from "./src/engine/util.js";

const N = Number(process.argv[2] || 120);
const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));
const SQUAD = {
  "ทีมคละสาย": ["TOTSAKAN", "PUSS", "ARIEL", "HOOD", "PINO"],
  "ทีมมาร์คแมน": ["HOOD", "PETER", "C.HOOK", "PHANTOM", "HOOD"],
  "ทีมแทงค์": ["TOTSAKAN", "KLAEDER", "NIAN", "H.S.B", "STEIN"],
};

const team = (ids, lvl, gold, seed) => {
  const roster = LANES.map((l, i) => ({
    lane: l, champId: ids[i], level: lvl, xp: 0, gold, items: [],
    ranks: autoRanks(lvl, CHAMPIONS[ids[i]].skillPriority, null),
    athlete: flat(5), upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
    char: "P", athleteName: "P", style: "POKE",
  }));
  return roster.map((c) => toDef(shopFor(c, roster, mulberry32(77 + seed), 0)));
};

// เดินเร็วขึ้นเท่าไหร่ — +45 คือรองเท้าหนึ่งคู่ · +100 คือเกินจริงไปมาก ใช้ดูว่าเพดานอยู่ไหน
const BUMPS = [15, 30, 45, 60, 100, 200];

function run(ids, lvl, gold, bump) {
  let win = 0;
  for (let s = 0; s < N; s++) {
    const swap = s % 2 === 1;
    const a = team(ids, lvl, gold, s), b = team(ids, lvl, gold, s);
    const st = buildFight(swap ? b : a, swap ? a : b, s * 7919 + 13, DEFAULT_FIGHT);
    const mine = swap ? "red" : "blue";
    // ดันความเร็วของฝั่งเดียว — u.moveSpeed ตั้งครั้งเดียวจาก stats
    // แล้ว step() คิด u.msEff ใหม่ทุกเฟรมจากค่านี้ (step.js:170) จึงแก้ตรงนี้พอ
    for (const u of st.units) if (u.team === mine) u.moveSpeed += bump;
    let g = 0;
    while (!st.over && g++ < 60 * 200) step(st);
    if (st.winner === mine) win++;
    else if (!st.winner) win += 0.5;
  }
  return (100 * win) / N;
}

const margin = 196 * Math.sqrt(0.25 / N);
console.log(`ไฟต์ละจุด ${N} ครั้ง · ค่าคลาดเคลื่อน ±${margin.toFixed(1)} แต้ม`);
console.log("50% = เดินเร็วขึ้นแล้วไม่ได้เปรียบอะไรเลย\n");
console.log("ทีม            เลเวล/งบ      " + BUMPS.map((b) => ("+" + b).padStart(7)).join(""));
for (const [name, ids] of Object.entries(SQUAD)) {
  for (const [lvl, gold] of [[10, 95], [15, 155]]) {
    const cells = BUMPS.map((b) => run(ids, lvl, gold, b).toFixed(1).padStart(7));
    console.log(name.padEnd(15) + ("L" + lvl + " " + gold + "g").padEnd(12) + cells.join(""));
  }
}
console.log("\n(+45 = รองเท้าหนึ่งคู่ · +200 = เกินจริงไปมาก ใส่ไว้ดูว่าเพดานของกลไกนี้อยู่ตรงไหน)");
