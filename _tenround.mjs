// ---------------------------------------------------------------
// จำลอง 10 ยก แล้วรายงานว่าแต่ละเลนและแต่ละตัวได้เงินกับ XP เท่าไหร่ มาจากอะไรบ้าง
//
// เดินตามทางเดียวกับเกมจริงทุกขั้น: buildRoundPlan → buildLaneFight → step
// → recordLaneFight → settleRound  ตัวเลขที่ออกมาจึงเป็นตัวเลขเดียวกับที่ผู้เล่นเห็น
// (ต่างจาก _matchsim.mjs เดิมที่คิดเงินเองแยกอีกชุด)
//
//   node _tenround.mjs [โหมด] [จำนวนแมตช์] [ความยาก]
//   node _tenround.mjs LONG 20 NORMAL
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { STANCE_LANES } from "./src/data/behaviour.js";
import { diffOf } from "./src/data/difficulty.js";
import { MODES } from "./src/data/modes.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { step } from "./src/engine/step.js";
import { mulberry32 } from "./src/engine/util.js";
import { botSpread, draftFoe } from "./src/game/bot-draft.js";
import { buildLaneFight, recordLaneFight } from "./src/game/lane-fight.js";
import { buildRoundPlan } from "./src/game/round-plan.js";
import { makeRoster } from "./src/game/roster.js";
import { settleRound } from "./src/game/settle.js";
import { shopFor } from "./src/game/shop-ai.js";
import { botJungle, botStances } from "./src/game/stance-ai.js";

const MODE = MODES[process.argv[2] || "LONG"];
const GAMES = Number(process.argv[3] || 20);
const ROUNDS = Number(process.env.ROUNDS || 10);
const DIFF = diffOf(process.argv[4] || "NORMAL");
const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

// ---- ที่เก็บผล ----
const lane = {};            // ต่อเลน
const champ = {};           // ต่อตัวละคร
const part = {};            // ต่อที่มาของเงิน
const pocket = {};          // เงินกระเป๋าแยกของตัวละคร (bg ของ C.HOOK)
const perRound = [];        // ต่อยก (เฉลี่ยทุกแมตช์)
for (const L of LANES) lane[L] = { gold: 0, xp: 0, n: 0, kills: 0, assists: 0, fights: 0, lv: 0 };
for (let r = 0; r < ROUNDS; r++) perRound.push({ gold: 0, xp: 0, n: 0 });

const bump = (bag, k, g, x) => {
  const b = bag[k] || { gold: 0, xp: 0, n: 0 };
  b.gold += g; b.xp += x; b.n += 1; bag[k] = b;
};

function playMatch(seed) {
  const rand = mulberry32(seed);
  let A = makeRoster(rand, draftFoe(rand, DIFF.variety, DIFF.offRole), (r, id) => botSpread(r, id, DIFF.floor));
  let B = makeRoster(rand, draftFoe(rand, DIFF.variety, DIFF.offRole), (r, id) => botSpread(r, id, DIFF.floor));
  let lastA = null, lastB = null;

  for (let round = 1; round <= ROUNDS; round++) {
    // ต้นยก: ซื้อของ แล้วอัพสกิลตามลำดับของตัวละคร
    A = A.map((c) => shopFor(c, B, rand, DIFF.shopNoise));
    B = B.map((c) => shopFor(c, A, rand, DIFF.shopNoise));
    const rank = (c) => ({ ...c, ranks: autoRanks(c.level, CHAMPIONS[c.champId].skillPriority, null), style: "POKE" });
    A = A.map(rank);
    B = B.map(rank);

    const sa = botStances(rand, A, B, DIFF.stanceSkill, round);
    const sb = botStances(rand, B, A, DIFF.stanceSkill, round);
    const ja = botJungle(rand, A, B, sa, lastA, DIFF.stanceSkill, round);
    const jb = botJungle(rand, B, A, sb, lastB, DIFF.stanceSkill, round);

    const plan = buildRoundPlan({ stances: sa, foeStances: sb, jungle: ja, foeJungle: jb, round });
    plan.foeStances = sb;
    plan.foeJungleLane = jb.lane;
    plan.foeJungleCrew = jb.crew || [];
    plan.seed = Math.floor(rand() * 1e9);

    // ---- ไฟต์ทุกเลนของยกนี้ ----
    const done = {};
    for (const L of STANCE_LANES) {
      const st = buildLaneFight({ plan, lane: L, team: A, foe: B, teamStyle: null, mySide: "blue" });
      if (!st) continue;
      let g = 0;
      while (!st.over && g++ < 60 * 200) step(st);
      done[L] = recordLaneFight(st, L, "blue");
      for (const u of st.units) {
        if (u.team !== "blue") continue;
        const b = lane[u.lane];
        if (!b) continue;
        b.kills += u.kills; b.assists += u.assists; b.fights += 1;
      }
    }

    // ---- ปิดยก: คิดเงิน/XP ด้วยโค้ดชุดเดียวกับเกม ----
    const s = settleRound({ plan, done, team: A, foe: B, mySide: "blue", jungle: ja, round, mode: MODE });

    for (const row of s.breakdown.me) {
      const b = lane[row.lane];
      if (b) { b.gold += row.gold; b.xp += row.xp; b.n += 1; }
      bump(champ, row.champId, row.gold, row.xp);
      const pr = perRound[round - 1];
      pr.gold += row.gold; pr.xp += row.xp; pr.n += 1;
      for (const p of row.parts) bump(part, p.key, p.gold || 0, p.xp || 0);
      // Plunder ของ C.HOOK เป็นเงินคนละกระเป๋า (bg) ซื้อได้แต่อัพเกรดของตัวเอง
      // ไม่ใช่เงินปกติ เลยแยกนับ ไม่เอาไปรวมในส่วนแบ่ง
      if (row.bounty) bump(pocket, row.champId, row.bounty, 0);
    }

    A = s.nextMe;
    B = s.nextFoe;
    lastA = sa; lastB = sb;
  }
  for (const c of A) {
    const b = lane[c.lane];
    if (b) b.lv += c.level;
  }
  return A;
}

for (let g = 0; g < GAMES; g++) playMatch(4400 + g * 313);

// ---------------- รายงาน ----------------
const pad = (s, n) => String(s).padStart(n);
const padr = (s, n) => String(s).padEnd(n);

console.log(`=== ${ROUNDS} ยกแรก · ${GAMES} แมตช์ · โหมด ${MODE.id} · บอท ${DIFF.th} ===`);
console.log(`(ตัวเลขทุกช่อง = ค่าเฉลี่ยต่อ 1 คน ตลอด ${ROUNDS} ยก)\n`);

console.log("เลน       เงินรวม  เงิน/ยก     XP รวม  XP/ยก  เลเวลจบ  สังหาร  ช่วยสังหาร");
let tg = 0, tx = 0;
for (const L of LANES) {
  const b = lane[L];
  const rounds = b.n / GAMES;                   // = ROUNDS
  console.log(
    padr(L, 9),
    pad((b.gold / GAMES).toFixed(0) + "g", 7),
    pad((b.gold / b.n).toFixed(1), 7),
    pad((b.xp / GAMES).toFixed(0), 10),
    pad((b.xp / b.n).toFixed(1), 6),
    pad((b.lv / GAMES).toFixed(1), 8),
    pad((b.kills / GAMES).toFixed(1), 7),
    pad((b.assists / GAMES).toFixed(1), 11),
  );
  tg += b.gold / GAMES; tx += b.xp / GAMES;
  void rounds;
}
console.log("\nทั้งทีม  เงิน " + tg.toFixed(0) + "g · XP " + tx.toFixed(0) +
  " · เฉลี่ยต่อคนต่อยก " + (tg / 5 / ROUNDS).toFixed(1) + "g / " + (tx / 5 / ROUNDS).toFixed(1) + " xp");

console.log("\n--- เงินมาจากไหน (เฉลี่ยต่อแมตช์ ทั้งทีม) ---");
const rows = Object.entries(part).sort((a, b) => Math.abs(b[1].gold) - Math.abs(a[1].gold));
const totAbs = rows.reduce((t, [, v]) => t + Math.max(0, v.gold), 0);
console.log("ที่มา                       เงิน   ส่วนแบ่ง       XP   ครั้ง/แมตช์");
for (const [k, v] of rows) {
  console.log(
    padr(k, 22),
    pad((v.gold / GAMES).toFixed(0) + "g", 9),
    pad(v.gold > 0 ? (100 * v.gold / totAbs).toFixed(1) + "%" : "-", 9),
    pad((v.xp / GAMES).toFixed(0), 8),
    pad((v.n / GAMES).toFixed(1), 12),
  );
}

const pk = Object.entries(pocket);
if (pk.length) {
  console.log("\n--- เงินกระเป๋าแยก (bg — ซื้อได้แต่อัพเกรดของตัวเอง ไม่ใช่เงินปกติ) ---");
  for (const [k, v] of pk) {
    console.log(padr(k, 12), pad((v.gold / GAMES).toFixed(0) + "bg", 9),
      "ต่อแมตช์ · " + (v.gold / v.n).toFixed(1) + " ต่อยกที่ลง");
  }
}

console.log("\n--- เงิน/XP ต่อยก (เฉลี่ยต่อคน) ---");
console.log("ยก    เงิน    XP");
perRound.forEach((r, i) => {
  console.log(pad(i + 1, 2) + "  " + pad((r.gold / r.n).toFixed(1), 6) + "  " + pad((r.xp / r.n).toFixed(1), 5));
});

console.log("\n--- ต่อตัวละคร (เฉลี่ยต่อ 1 แมตช์ที่ได้ลง) ---");
const cs = Object.entries(champ).sort((a, b) => b[1].gold / b[1].n - a[1].gold / a[1].n);
console.log("ตัวละคร      เงิน/ยก   XP/ยก   ยกที่ลงรวม");
for (const [k, v] of cs) {
  console.log(padr(k, 12), pad((v.gold / v.n).toFixed(1), 7), pad((v.xp / v.n).toFixed(1), 7), pad(v.n, 11));
}
