// ---------------------------------------------------------------
// เล่นแมตช์เต็มโดย "บังคับ" ให้ตัวละครแพตช์ 0.6 ลงสนามทุกแมตช์
//
// ทำไมต้องมีไฟล์นี้: _gamewr.mjs ดราฟต์ตามคะแนนคอมโบ ตัวใหม่จึงอาจไม่ถูกหยิบ
// เลยใน 20 แมตช์ — รันผ่านไม่ได้แปลว่าโค้ดของมันไม่พัง เพราะมันไม่เคยถูกเรียก
// เคสที่ H.S.B R พังเพราะอ่าน burstDmg ที่ไม่มี โผล่ตอนเล่นเกมจริงเท่านั้น
// เทสต์สกิล 30 ทิกจับไม่ได้
//
//   node _p6smoke.mjs [จำนวนแมตช์]
// ---------------------------------------------------------------
import { buildFight } from "./src/engine/build-fight.js";
import { step } from "./src/engine/step.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { makeRoster, toDef } from "./src/game/roster.js";
import { draftFoe, botSpread } from "./src/game/bot-draft.js";
import { shopFor } from "./src/game/shop-ai.js";
import { diffOf } from "./src/data/difficulty.js";
import { mulberry32 } from "./src/engine/util.js";
import { CHAMPIONS } from "./src/data/champions.js";
import { MODES } from "./src/data/modes.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { setLang } from "./src/i18n.js";

setLang("th");
const GAMES = Number(process.argv[2] || 30);
const MODE = MODES.LONG;
const DIFF = diffOf("NORMAL");

// ตัวของแพตช์ 0.6 กับเลนที่มันลงได้
const NEW = [
  ["HELSING", "JUNGLE"],
  ["WOLF", "JUNGLE"],
  ["ANANSI", "MID"],
  ["KOSCHEI", "TOP"],
];
const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

// แทนตัวในเลนที่ต้องการด้วยตัวใหม่ แล้วกันชื่อซ้ำในทีม
function force(picks, champId, lane) {
  const out = picks.map((p) => ({ ...p }));
  const slot = out.find((p) => p.lane === lane);
  if (!slot) return out;
  // ถ้าตัวใหม่ไปซ้ำกับช่องอื่น ให้ช่องนั้นได้ตัวเดิมของเลนนี้ไปแลกกัน
  const clash = out.find((p) => p.champId === champId && p.lane !== lane);
  if (clash) clash.champId = slot.champId;
  slot.champId = champId;
  return out;
}

const seen = {};
for (const [id] of NEW) seen[id] = { fights: 0, won: 0, matches: 0 };
const errs = [];
let fights = 0;

for (let g = 0; g < GAMES; g++) {
  const rand = mulberry32(7000 + g);
  // สลับให้แต่ละแมตช์บังคับคนละตัว และสลับฝั่งไปมา
  const [id, lane] = NEW[g % NEW.length];
  const mine = g % 2 === 0;
  let A = makeRoster(rand, force(draftFoe(rand, DIFF.variety, 0), id, lane),
    (r, cid) => botSpread(r, cid, DIFF.floor));
  let B = makeRoster(rand, mine ? draftFoe(rand, DIFF.variety, 0)
    : force(draftFoe(rand, DIFF.variety, 0), id, lane),
    (r, cid) => botSpread(r, cid, DIFF.floor));
  if (!mine) { const t = A; A = B; B = t; }
  seen[id].matches++;

  for (let round = 1; round <= 14; round++) {
    A = A.map((c) => shopFor(c, B, rand, DIFF.shopNoise));
    B = B.map((c) => shopFor(c, A, rand, DIFF.shopNoise));
    const rk = (c) => ({ ...c, ranks: autoRanks(c.level, CHAMPIONS[c.champId].skillPriority, null), style: "POKE" });
    A = A.map(rk); B = B.map(rk);
    // ไฟต์รวมทั้งทีม เพื่อให้กลไกที่ต้องมีคนรอบตัว (พาสซีฟของโคสเช) ได้ทำงาน
    const lanePick = LANES[round % LANES.length];
    const a = A.filter((c) => c.lane === lanePick || round % 3 === 0);
    const b = B.filter((c) => c.lane === lanePick || round % 3 === 0);
    if (!a.length || !b.length) continue;
    try {
      const st = buildFight(a.map(toDef), b.map(toDef), round, DEFAULT_FIGHT);
      let n = 0;
      while (!st.over && n < 60 * 90) { step(st); n++; }
      fights++;
      for (const u of st.units) {
        const k = seen[u.champ.id];
        if (!k) continue;
        k.fights++;
        if (st.winner === u.team) k.won++;
      }
      // ไต่เลเวลและเงินแบบหยาบๆ ให้ยกหลังๆ มีของจริง
      for (const c of A.concat(B)) { c.level = Math.min(18, c.level + 1); c.gold += 900; }
    } catch (e) {
      errs.push("แมตช์ " + g + " ยก " + round + " (" + id + "): " + e.message
        + "\n      " + String(e.stack || "").split("\n")[1]);
      if (errs.length > 6) break;
    }
  }
  if (errs.length > 6) break;
}

console.log("เล่น " + GAMES + " แมตช์ · " + fights + " ไฟต์\n");
for (const [id] of NEW) {
  const k = seen[id];
  const wr = k.fights ? (k.won / k.fights) * 100 : 0;
  console.log("  " + id.padEnd(9) + " ลงไฟต์ " + String(k.fights).padStart(4)
    + " · ชนะไฟต์ " + wr.toFixed(1) + "%");
}
if (errs.length) {
  console.log("\nพัง " + errs.length + " จุด:");
  for (const e of errs) console.log("  " + e);
  process.exit(1);
}
console.log("\nไม่พังเลย");
