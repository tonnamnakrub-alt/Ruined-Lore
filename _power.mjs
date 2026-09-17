import { buildFight } from "./src/engine/build-fight.js";
import { step } from "./src/engine/step.js";
import { makeRoster, toDef } from "./src/game/roster.js";
import { mulberry32 } from "./src/engine/util.js";
import { EVENTS } from "./src/data/tuning.js";
import { ITEMS, ITEM_BY_ID, applyBuy } from "./src/data/items.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { shopFor } from "./src/game/shop-ai.js";
import { writeFileSync } from "fs";

// วัดพลังจริงของไอเทม: แจกให้ทีมน้ำเงินทั้ง 5 คน แล้วดูว่าชนะทีมแดงที่เหมือนกันเป๊ะกี่ %
// 50% = ไม่มีผล, ยิ่งเกินยิ่งแรง — จับได้ทั้งของตีและของอึด ต่างจากการวัดดาเมจอย่างเดียว
const EV = EVENTS[Object.keys(EVENTS)[0]];
const SEEDS = Number(process.argv[2] || 16);

// ทั้งสองฝั่งซื้อของด้วยสมองบอทเท่ากันก่อน แล้วค่อยแถมไอเทมที่จะวัดให้ฝั่งน้ำเงินเป็นชิ้นพิเศษ
// ถ้าไม่ทำแบบนี้ ทั้งสองทีมจะตัวเปล่า ไอเทมชิ้นเดียวก็พลิกเกมทุกไฟต์ วัดอะไรไม่ได้
function winRate(id) {
  let wins = 0, n = 0;
  for (let s = 0; s < SEEDS; s++) {
    const mk = (blue) => {
      const roster = makeRoster(mulberry32(4000 + s)).map((c) => ({
        ...c, level: 13, gold: 200, ranks: autoRanks(13, ["Q", "W", "E"]), style: "balanced",
      }));
      const foes = roster;
      return roster.map((c) => {
        let out = shopFor(c, foes, mulberry32(77 + s));
        if (blue && id) {
          const nx = applyBuy({ ...out, gold: 99999 }, ITEM_BY_ID[id]);
          if (nx.items.length > out.items.length) out = { ...nx, gold: out.gold };
        }
        return toDef(out);
      });
    };
    const st = buildFight(mk(true), mk(false), 800 + s, EV);
    let k = 0;
    while (!st.over && k < 60 * 90) { step(st); k++; }
    const blue = st.units.filter((u) => u.team === "blue" && u.alive).length;
    const red = st.units.filter((u) => u.team === "red" && u.alive).length;
    n++;
    if (blue > red) wins++; else if (blue === red) wins += 0.5;
  }
  return wins / n;
}

const base = winRate(null);
console.log("baseline (สองทีมซื้อของเท่ากัน):", (base * 100).toFixed(0) + "%  — ควรใกล้ 50%\n");
const rows = [];
for (const it of ITEMS.filter((i) => i.tier === 3)) {
  rows.push({ id: it.id, cat: it.cat, cost: it.cost, wr: winRate(it.id), name: it.th.split("—")[0].trim() });
}
rows.sort((a, b) => b.wr - a.wr);
const line = (r) => "  " + r.cat.padEnd(9) + r.id.padEnd(5) + String(r.cost).padStart(3) + "g  " +
  (r.wr * 100).toFixed(0).padStart(4) + "%   " + r.name;
console.log("=== แรงสุด 10 อันดับ ===");
rows.slice(0, 10).forEach((r) => console.log(line(r)));
console.log("\n=== อ่อนสุด 10 อันดับ ===");
rows.slice(-10).reverse().forEach((r) => console.log(line(r)));
if (process.env.WR_JSON) {
  const out = {}; for (const r of rows) out[r.id] = +r.wr.toFixed(3);
  writeFileSync(process.env.WR_JSON, JSON.stringify(out));
}
console.log("\n=== ค่าเฉลี่ยรายสาย ===");
for (const cat of ["TANK", "FIGHTER", "ASSASSIN", "MAGE", "MARKSMAN", "SUPPORT"]) {
  const t = rows.filter((r) => r.cat === cat);
  console.log("  " + cat.padEnd(9), ((t.reduce((a, r) => a + r.wr, 0) / t.length) * 100).toFixed(0) + "%");
}
