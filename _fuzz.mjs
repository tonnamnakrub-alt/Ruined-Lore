import { buildFight } from "./src/engine/build-fight.js";
import { step } from "./src/engine/step.js";
import { makeRoster, toDef, CHARS } from "./src/game/roster.js";
import { mulberry32 } from "./src/engine/util.js";
import { EVENTS, STYLES } from "./src/data/tuning.js";
import { ITEMS, applyBuy, buyBlockedReason } from "./src/data/items.js";
import { LANE_INFO } from "./src/data/lanes.js";
import { autoRanks } from "./src/engine/skill-ranks.js";

const evIds = Object.keys(EVENTS), styles = Object.keys(STYLES);
const bad = [];
let timeouts = 0, total = 0, meleeUptime = [], fightLens = [];
const isBadNum = (v) => typeof v === "number" && !Number.isFinite(v);

for (let seed = 0; seed < 300; seed++) {
  const rand = mulberry32(7000 + seed);
  const mk = () => makeRoster(rand).map((c) => {
    c.level = 1 + Math.floor(rand() * 17);
    c.gold = 50 + Math.floor(rand() * 120);
    c.ranks = autoRanks(c.level, [["Q","W","E"],["W","E","Q"],["E","Q","W"]][Math.floor(rand()*3)]);
    c.style = styles[Math.floor(rand() * styles.length)];
    for (let k = 0; k < 8; k++) {
      const it = ITEMS[Math.floor(rand() * ITEMS.length)];
      if (!buyBlockedReason(c, it)) applyBuy(c, it);
    }
    return toDef(c);
  });
  const ev = EVENTS[evIds[seed % evIds.length]];
  let st;
  try { st = buildFight(mk(), mk(), 900 + seed, ev); } catch (e) { bad.push(`buildFight ${ev.id} seed${seed}: ${e.message}`); continue; }
  total++;
  let steps = 0, meleeInRange = 0, meleeTicks = 0;
  try {
    while (!st.over && steps < 60 * 200) {
      step(st); steps++;
      for (const u of st.units) {
        if (isBadNum(u.x) || isBadNum(u.y) || isBadNum(u.hp) || isBadNum(u.shield)) {
          throw new Error(`NaN on ${u.champ.id} ${["x",u.x,"y",u.y,"hp",u.hp,"sh",u.shield].join(" ")}`);
        }
        if (u.alive && u.hp > u.maxHp + 1) throw new Error(`hp>max ${u.champ.id} ${u.hp}/${u.maxHp}`);
      }
    }
  } catch (e) { bad.push(`${ev.id} seed${seed} step${steps}: ${e.message}`); continue; }
  if (!st.over) { bad.push(`${ev.id} seed${seed}: never ended`); continue; }
  fightLens.push(st.t);
  if (st.t >= st.timeLimit - 0.05) timeouts++;
}
console.log("fights:", total, "| ended by clock:", timeouts, (100*timeouts/total).toFixed(0)+"%");
console.log("avg fight length:", (fightLens.reduce((a,b)=>a+b,0)/fightLens.length).toFixed(1)+"s");
console.log("PROBLEMS:", bad.length);
bad.slice(0, 12).forEach(b => console.log("  -", b));
