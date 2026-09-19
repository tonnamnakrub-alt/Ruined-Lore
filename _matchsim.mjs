// จำลองแมตช์เต็มแบบไม่ต้องเปิดเบราว์เซอร์ — ทั้งสองฝั่งให้บอทคุม
// ดูว่าจบแมตช์แล้วแต่ละคนได้เลเวลเท่าไหร่ และมีของกี่ชิ้น
import { buildFight } from "./src/engine/build-fight.js";
import { step } from "./src/engine/step.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { makeRoster, toDef, laneMax } from "./src/game/roster.js";
import { draftFoe, botSpread } from "./src/game/bot-draft.js";
import { shopFor } from "./src/game/shop-ai.js";
import { botStances, botJungle } from "./src/game/stance-ai.js";
import { buildRoundPlan, foeIncome } from "./src/game/round-plan.js";
import { KILL, ASSIST_SOLO, ASSIST_GROUP, STANCE_LANES } from "./src/data/behaviour.js";
import { diffOf } from "./src/data/difficulty.js";
import { mulberry32, xpToLevel } from "./src/engine/util.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { CHAMPIONS } from "./src/data/champions.js";
import { MODES } from "./src/data/modes.js";

const MODE = MODES[process.argv[2] || "LONG"];
const GAMES = Number(process.argv[3] || 10);
const DIFF = diffOf(process.argv[4] || "NORMAL");
// นับว่ากติกาใหม่ (ตัดสินด้วยเงิน) ให้ผลต่างจากกติกาเดิม (ชนะเลนมากกว่า) บ่อยแค่ไหน
let draws = 0, goldRounds = 0, disagree = 0;

function playMatch(seed) {
  const rand = mulberry32(seed);
  let A = makeRoster(rand, draftFoe(rand, DIFF.variety, DIFF.offRole), (r, id) => botSpread(r, id, DIFF.floor));
  let B = makeRoster(rand, draftFoe(rand, DIFF.variety, DIFF.offRole), (r, id) => botSpread(r, id, DIFF.floor));
  let lastA = null, lastB = null;
  let score = { a: 0, b: 0 };
  let fights = 0, timeouts = 0, kills = 0;

  for (let round = 1; round <= MODE.maxRounds; round++) {
    // ซื้อของต้นยก
    A = A.map((c) => shopFor(c, B, rand, DIFF.shopNoise));
    B = B.map((c) => shopFor(c, A, rand, DIFF.shopNoise));
    A = A.map((c) => ({ ...c, ranks: autoRanks(c.level, CHAMPIONS[c.champId].skillPriority, null), style: "POKE" }));
    B = B.map((c) => ({ ...c, ranks: autoRanks(c.level, CHAMPIONS[c.champId].skillPriority, null), style: "POKE" }));

    const sa = botStances(rand, A, B, DIFF.stanceSkill, round);
    const sb = botStances(rand, B, A, DIFF.stanceSkill, round);
    const ja = botJungle(rand, A, B, sa, lastA, DIFF.stanceSkill, round);
    const jb = botJungle(rand, B, A, sb, lastB, DIFF.stanceSkill, round);

    const plan = buildRoundPlan({ stances: sa, foeStances: sb, jungle: ja, foeJungle: jb, round });
    plan.foeJungleLane = jb.lane;

    const perUnit = {};
    let win = 0, loss = 0;
    for (const f of plan.fights) {
      const blue = f.blue.map((k) => A.find((c) => c.lane === k)).filter(Boolean);
      const red = f.red.map((k) => B.find((c) => c.lane === k)).filter(Boolean);
      if (!blue.length || !red.length) continue;
      const st = buildFight(blue.map(toDef), red.map(toDef), Math.floor(rand() * 1e9), DEFAULT_FIGHT);
      for (const [side, list] of [["blue", blue], ["red", red]]) {
        for (const c of list) {
          const h = f.hurt[side + ":" + c.lane];
          if (!h) continue;
          const u = st.units.find((x) => x.lane === c.lane && x.team === side);
          if (u) u.hp = Math.max(1, Math.round(u.maxHp * (1 - h)));
        }
      }
      let g = 0;
      while (!st.over && g++ < 60 * 200) step(st);
      fights++;
      if (st.t >= st.timeLimit - 0.1) timeouts++;
      if (st.winner === "blue") win++; else loss++;
      for (const u of st.units) {
        const k = u.team + ":" + u.lane;
        const cur = perUnit[k] || { kills: 0, assists: 0, soloAssists: 0 };
        cur.kills += u.kills; cur.assists += u.assists; cur.soloAssists += (u.soloAssists || 0);
        kills += u.kills;
        perUnit[k] = cur;
      }
    }
    const inc = plan.income;
    const finc = foeIncome(plan);
    const pay = (list, side, table) => {
      const out = list.map((c) => {
        const u = perUnit[side + ":" + c.lane];
        const src = table[c.lane] || { gold: 0, xp: 0 };
        const solo = u ? u.soloAssists : 0;
        const shared = u ? Math.max(0, u.assists - solo) : 0;
        let kg = u ? u.kills * KILL.gold + solo * ASSIST_SOLO.gold + shared * ASSIST_GROUP.gold : 0;
        const kx = u ? u.kills * KILL.xp + solo * ASSIST_SOLO.xp + shared * ASSIST_GROUP.xp : 0;
        if (c.lane === "ADC") { if (src.gold > 0) kg += 1; if (u) kg += u.kills + u.assists; }
        const laneGold = c.lane === "SUPPORT" ? 0 : Math.max(0, src.gold);
        const laneXp = Math.max(0, src.xp) + (c.lane === "TOP" ? 1 : 0);
        const xp = Math.max(0, Math.round((laneXp + kx) * MODE.xp));
        const gold = Math.max(0, Math.round((laneGold + kg) * MODE.gold));
        const nxp = c.xp + xp;
        return { ...c, xp: nxp, gold: c.gold + gold, level: xpToLevel(nxp, laneMax(c.lane)) };
      });
      // ซัพรับครึ่งหนึ่งของเงินที่เอดีซีได้ยกนี้ บวกอีก 1 ทุกสองยก
      const iA = list.findIndex((c) => c.lane === "ADC");
      const iS = list.findIndex((c) => c.lane === "SUPPORT");
      if (iA >= 0 && iS >= 0) {
        const gain = out[iA].gold - list[iA].gold;
        out[iS] = { ...out[iS], gold: out[iS].gold + Math.floor(Math.max(0, gain) / 2) + (round % 2 === 0 ? 1 : 0) };
      }
      return out;
    };
    const beforeA = A, beforeB = B;
    A = pay(A, "blue", inc);
    B = pay(B, "red", finc);
    // สเปคใหม่: ยกนี้ใครได้เงินรวมทั้งทีมเยอะกว่า คนนั้นได้แต้ม (ไม่ใช่ชนะเลนมากกว่า)
    const gainA = A.reduce((t, c, i) => t + (c.gold - beforeA[i].gold), 0);
    const gainB = B.reduce((t, c, i) => t + (c.gold - beforeB[i].gold), 0);
    if (gainA > gainB) score.a++; else if (gainB > gainA) score.b++; else draws++;
    goldRounds++;
    const laneWinner = win > loss ? 1 : loss > win ? -1 : 0;
    const goldWinner = gainA > gainB ? 1 : gainB > gainA ? -1 : 0;
    if (laneWinner !== goldWinner) disagree++;
    lastA = sa; lastB = sb;
    if (score.a >= MODE.wins || score.b >= MODE.wins) break;
  }
  return { A, B, score, fights, timeouts, kills };
}

const byLane = {};
let totFights = 0, totTimeouts = 0, totKills = 0, totRounds = 0;
for (let g = 0; g < GAMES; g++) {
  const r = playMatch(9000 + g * 137);
  totFights += r.fights; totTimeouts += r.timeouts; totKills += r.kills;
  totRounds += r.score.a + r.score.b;
  for (const list of [r.A, r.B]) {
    for (const c of list) {
      const b = byLane[c.lane] || { lv: 0, items: 0, gold: 0, left: 0, n: 0 };
      b.lv += c.level;
      b.items += c.items.filter((i) => i.tier === 3 || i.kind === "boots").length;
      b.gold += c.items.reduce((a, i) => a + i.cost, 0);
      b.left += c.gold;
      b.n++;
      byLane[c.lane] = b;
    }
  }
}

console.log(`=== ${GAMES} แมตช์ · โหมด ${MODE.id} (${MODE.rounds} ยก) · บอท ${DIFF.th} ===\n`);
console.log("เลน       เลเวลเฉลี่ย  เพดาน  ของใหญ่+รองเท้า  มูลค่าของที่ถือ  เงินเหลือ");
for (const lane of ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"]) {
  const b = byLane[lane];
  if (!b) continue;
  console.log(
    lane.padEnd(9),
    (b.lv / b.n).toFixed(1).padStart(8),
    String(laneMax(lane)).padStart(7),
    (b.items / b.n).toFixed(1).padStart(12),
    (b.gold / b.n).toFixed(0).padStart(15) + "g",
    (b.left / b.n).toFixed(0).padStart(9) + "g",
  );
}
const all = Object.values(byLane).reduce((a, b) => ({ lv: a.lv + b.lv, items: a.items + b.items, gold: a.gold + b.gold, left: a.left + b.left, n: a.n + b.n }), { lv: 0, items: 0, gold: 0, left: 0, n: 0 });
console.log("\nรวมทุกเลน  เลเวลเฉลี่ย " + (all.lv / all.n).toFixed(1) + " · ของใหญ่+รองเท้าเฉลี่ย " + (all.items / all.n).toFixed(1) + " ชิ้น · มูลค่าของ " + (all.gold / all.n).toFixed(0) + "g · เงินเหลือ " + (all.left / all.n).toFixed(0) + "g");
console.log("ยกเฉลี่ยต่อแมตช์ " + (totRounds / GAMES).toFixed(1) + " · ไฟต์ทั้งหมด " + totFights + " (หมดเวลา " + totTimeouts + " = " + (100 * totTimeouts / Math.max(1, totFights)).toFixed(0) + "%) · ศพรวม " + totKills + " = " + (totKills / Math.max(1, totFights)).toFixed(2) + " ศพต่อไฟต์");

console.log("ยกที่ตัดสินด้วยเงิน " + goldRounds + " · เสมอ " + draws + " (" + (100*draws/Math.max(1,goldRounds)).toFixed(0) + "%) · ผลต่างจากกติกาเดิม " + disagree + " (" + (100*disagree/Math.max(1,goldRounds)).toFixed(0) + "%)");
