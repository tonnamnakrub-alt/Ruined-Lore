// ---------------------------------------------------------------
// อัตราชนะของแต่ละตัวละคร — พบกันหมดแบบตัวต่อตัว
//
// ทุกอย่างเท่ากันหมด: เลเวล ของ ค่าสถานะนักแข่ง และสลับสีทุกคู่
// เหลือความต่างอย่างเดียวคือตัวละคร เลยอ่านได้ว่าใครแรงเกิน
//
//   node _champwr.mjs [จำนวน seed ต่อคู่] [เลเวล]
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { ITEMS } from "./src/data/items.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";

const SEEDS = Number(process.argv[2] || 6);
const LVL = Number(process.argv[3] || 13);
const big = ITEMS.filter((i) => i.cost >= 50);
const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));
const IDS = Object.keys(CHAMPIONS);

const mk = (id) => {
  const ch = CHAMPIONS[id];
  return {
    lane: ch.lane, champId: id, level: LVL, xp: 0, gold: 0,
    items: [big[2], big[5], big[9]],
    ranks: autoRanks(LVL, ch.skillPriority, null),
    athlete: flat(5),
    upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
    char: "P", athleteName: "P", style: "POKE",
  };
};

const win = {}, games = {}, dmg = {}, took = {};
for (const id of IDS) { win[id] = 0; games[id] = 0; dmg[id] = 0; took[id] = 0; }

for (let i = 0; i < IDS.length; i++) {
  for (let j = i + 1; j < IDS.length; j++) {
    const a = IDS[i], b = IDS[j];
    for (let s = 0; s < SEEDS; s++) {
      const swap = s % 2 === 1;                       // สลับสีครึ่งหนึ่ง กันข้อได้เปรียบของฝั่งน้ำเงิน
      const blueId = swap ? b : a;
      const redId = swap ? a : b;
      const st = buildFight([mk(blueId)].map(toDef), [mk(redId)].map(toDef), s * 7919 + i * 131 + j, DEFAULT_FIGHT);
      let g = 0;
      while (!st.over && g++ < 60 * 200) step(st);
      games[a]++; games[b]++;
      if (st.winner === "blue") win[blueId]++;
      else if (st.winner === "red") win[redId]++;
      for (const u of st.units) {
        const who = u.team === "blue" ? blueId : redId;
        dmg[who] += u.damageDealt;
        took[who] += Object.values(u.takenBy || {}).reduce((x, y) => x + y, 0);
      }
    }
  }
}

const rows = IDS.map((id) => ({
  id,
  wr: (100 * win[id]) / Math.max(1, games[id]),
  dmg: dmg[id] / Math.max(1, games[id]),
  role: CHAMPIONS[id].role,
})).sort((x, y) => y.wr - x.wr);

console.log(`=== ตัวต่อตัวพบกันหมด · เลเวล ${LVL} · ${SEEDS} seed ต่อคู่ · ${games[IDS[0]]} ไฟต์ต่อตัว ===\n`);
console.log("ตัวละคร      อัตราชนะ   ดาเมจ/ไฟต์  บทบาท");
for (const r of rows) {
  console.log(
    r.id.padEnd(12),
    (r.wr.toFixed(1) + "%").padStart(8),
    r.dmg.toFixed(0).padStart(11),
    "  " + r.role,
  );
}
const wrs = rows.map((r) => r.wr);
console.log("\nสูงสุด " + wrs[0].toFixed(1) + "% · ต่ำสุด " + wrs[wrs.length - 1].toFixed(1) +
  "% · ช่วงห่าง " + (wrs[0] - wrs[wrs.length - 1]).toFixed(1));
