import { ITEM_BY_ID, applyBuy } from "./src/data/items.js";
import { buildFight } from "./src/engine/build-fight.js";
import { step } from "./src/engine/step.js";
import { makeRoster, toDef } from "./src/game/roster.js";
import { mulberry32 } from "./src/engine/util.js";
import { EVENTS } from "./src/data/tuning.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { buffSum } from "./src/engine/state-util.js";
const EV = EVENTS[Object.keys(EVENTS)[0]];

// ทั้งทีมถือ msq คนละชิ้น — ต้องยังลดแค่ 25%
function msqTeam(give) {
  const mk = (blue) => makeRoster(mulberry32(500)).map((c) => {
    c.level = 14; c.gold = 99999; c.ranks = autoRanks(14, ["Q","W","E"]); c.style = "balanced";
    if (blue && give) c = applyBuy(c, ITEM_BY_ID.msq);
    return toDef(c);
  });
  const st = buildFight(mk(true), mk(false), 9, EV);
  for (const u of st.units) { u.maxHp = 1e9; u.hp = 1e9; }
  let worst = 0, holders = 0;
  for (let n = 0; n < 60 * 20; n++) {
    step(st);
    for (const u of st.units) { u.hp = 1e9; u.alive = true; }
    for (const e of st.units) if (e.team === "red") worst = Math.min(worst, buffSum(e, "as"));
  }
  holders = st.units.filter((u) => u.team === "blue" && u.hasItem("msq")).length;
  return { worst, holders };
}
const r = msqTeam(true);
console.log("ทีมน้ำเงินถือ msq", r.holders, "คน -> ศัตรูโดนลดความเร็วโจมตีแย่สุด", (r.worst * 100).toFixed(0) + "%  (ต้องไม่เกิน -25%)");

// acb หลายซีด
let hit = 0, peak = 0;
for (let s = 0; s < 10; s++) {
  const mk = (blue) => makeRoster(mulberry32(1234 + s)).map((c) => {
    c.level = 14; c.gold = 99999; c.ranks = autoRanks(14, ["Q","W","E"]); c.style = "balanced";
    if (blue && c.lane === "SUPPORT") { c.champId = "PINO"; c = applyBuy(c, ITEM_BY_ID.acb); }
    return toDef(c);
  });
  const st = buildFight(mk(true), mk(false), 500 + s, EV);
  let p = 0;
  for (let n = 0; n < 60 * 40; n++) {
    step(st);
    for (const u of st.units) { u.alive = true; if (u.hp < u.maxHp * 0.35) u.hp = u.maxHp * 0.35; }
    for (const u of st.units) if (u.team === "blue") p = Math.max(p, buffSum(u, "onHitMagic"));
  }
  if (p > 0) { hit++; peak = Math.max(peak, p); }
}
console.log("acb โปรค", hit + "/10 ซีด · on-hit เวทสูงสุด", peak.toFixed(0), "(คาด 10 + 3x14 = 52 บวก 10% AP)");
