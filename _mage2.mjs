import { buildFight } from "./src/engine/build-fight.js";
import { step } from "./src/engine/step.js";
import { makeRoster, toDef } from "./src/game/roster.js";
import { mulberry32 } from "./src/engine/util.js";
import { EVENTS } from "./src/data/tuning.js";
import { ITEM_BY_ID, applyBuy } from "./src/data/items.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { setLang } from "./src/i18n.js";
setLang("en");
const EV = EVENTS[Object.keys(EVENTS)[0]];

// ไฟต์จริง ตายได้ เพื่อวัดของที่ต้องมีคนตายถึงจะทำงาน
function realFight(id, seed) {
  const mk = (blue) => makeRoster(mulberry32(1200 + seed)).map((c) => {
    c.level = 14; c.gold = 99999; c.ranks = autoRanks(14, ["Q", "W", "E"]); c.style = "balanced";
    if (blue && c.lane === "MID") { c.champId = "ARIEL"; if (id) c = applyBuy(c, ITEM_BY_ID[id]); }
    return toDef(c);
  });
  const st = buildFight(mk(true), mk(false), 700 + seed, EV);
  let n = 0;
  while (!st.over && n < 60 * 120) { step(st); n++; }
  const mage = st.units.find((u) => u.team === "blue" && u.lane === "MID");
  let heals = 0;
  for (const u of st.units) for (const k in (u.healedBy || {})) if (k.includes("Amrita")) heals += u.healedBy[k];
  let burn = 0;
  for (const u of st.units) for (const k in (u.takenBy || {})) if (k.includes("Surtr")) burn += u.takenBy[k];
  return { heals, burn, kills: mage.kills + mage.assists, dealt: Object.values(mage.dealtBy).reduce((a, b) => a + b, 0) };
}
let h = 0, k = 0;
for (let s = 0; s < 8; s++) { const r = realFight("ang", s); h += r.heals; k += r.kills; }
console.log("ang  ไฟต์จริง 8 นัด — ได้สังหาร/ช่วยฆ่า", k, "ครั้ง · ฮีลทีมรวม", h.toFixed(0));
let b = 0, d = 0;
for (let s = 0; s < 8; s++) { const r = realFight("stc", s); b += r.burn; d += r.dealt; }
console.log("stc  ไฟต์จริง 8 นัด — ดาเมจไฟเผารวม", b.toFixed(0), "จากดาเมจทั้งหมด", d.toFixed(0),
  "(" + (100 * b / d).toFixed(0) + "%)");
const base = [];
for (let s = 0; s < 8; s++) base.push(realFight(null, s).dealt);
console.log("     เทียบไม่มีของ", (base.reduce((a, x) => a + x, 0)).toFixed(0));
