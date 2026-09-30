// ---------------------------------------------------------------
// ทำไมชนะไฟต์เยอะแล้วชนะแมตช์น้อย — เช่น PUSS ชนะไฟต์ 80.5% แต่ชนะแมตช์ 55.6%
//
// เช็คสามอย่าง:
//   1) แต่ละเลนได้ลงไฟต์กี่ไฟต์ต่อยก จากทั้งหมดกี่ไฟต์
//   2) ยกหนึ่งตัดสินด้วยอะไร (เงินรวมทั้งทีม ไม่ใช่จำนวนไฟต์ที่ชนะ)
//   3) ชนะไฟต์ของตัวเองแล้วทีมชนะยกนั้นบ่อยแค่ไหน
//
//   node _fightvsround.mjs [จำนวนแมตช์]
// ---------------------------------------------------------------
import { buildFight } from "./src/engine/build-fight.js";
import { step } from "./src/engine/step.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { makeRoster, toDef, laneMax } from "./src/game/roster.js";
import { draftFoe, botSpread } from "./src/game/bot-draft.js";
import { shopFor } from "./src/game/shop-ai.js";
import { botStances, botJungle } from "./src/game/stance-ai.js";
import { buildRoundPlan, foeIncome } from "./src/game/round-plan.js";
import { KILL, ASSIST_SOLO, ASSIST_GROUP } from "./src/data/behaviour.js";
import { diffOf } from "./src/data/difficulty.js";
import { mulberry32, xpToLevel } from "./src/engine/util.js";
import { CHAMPIONS } from "./src/data/champions.js";
import { MODES } from "./src/data/modes.js";
import { autoRanks } from "./src/engine/skill-ranks.js";

const GAMES = Number(process.argv[2] || 20);
const MODE = MODES.LONG;
const DIFF = diffOf("NORMAL");
const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

// ต่อเลน: ลงไฟต์กี่ครั้ง · ชนะไฟต์ที่ลงกี่ครั้ง · ยกที่ตัวเองชนะไฟต์แล้วทีมชนะยกนั้นกี่ครั้ง
const L = Object.fromEntries(LANES.map((l) => [l, { fights: 0, won: 0, roundsIn: 0, wonFightWonRound: 0, wonFightRounds: 0 }]));
let rounds = 0, fightsPerRound = 0, agree = 0;

for (let g = 0; g < GAMES; g++) {
  const rand = mulberry32(9000 + g * 137);
  let A = makeRoster(rand, draftFoe(rand, DIFF.variety, DIFF.offRole), (r, id) => botSpread(r, id, DIFF.floor));
  let B = makeRoster(rand, draftFoe(rand, DIFF.variety, DIFF.offRole), (r, id) => botSpread(r, id, DIFF.floor));
  let lastA = null, lastB = null;
  const score = { a: 0, b: 0 };

  for (let round = 1; round <= MODE.maxRounds; round++) {
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
    const inRound = {}, wonThis = {};
    let nFights = 0;
    for (const f of plan.fights) {
      const blue = f.blue.map((k) => A.find((c) => c.lane === k)).filter(Boolean);
      const red = f.red.map((k) => B.find((c) => c.lane === k)).filter(Boolean);
      if (!blue.length || !red.length) continue;
      nFights++;
      const st = buildFight(blue.map(toDef), red.map(toDef), Math.floor(rand() * 1e9), DEFAULT_FIGHT);
      for (const [side, list] of [["blue", blue], ["red", red]]) {
        for (const c of list) {
          const h = f.hurt[side + ":" + c.lane];
          if (!h) continue;
          const u = st.units.find((x) => x.lane === c.lane && x.team === side);
          if (u) u.hp = Math.max(1, Math.round(u.maxHp * (1 - h)));
        }
      }
      let n = 0;
      while (!st.over && n++ < 60 * 200) step(st);
      // นับเฉพาะฝั่ง A (น้ำเงิน) เพื่อให้เทียบกับ "ทีม A ชนะยกนี้ไหม" ได้ตรงๆ
      for (const c of blue) {
        L[c.lane].fights++;
        inRound[c.lane] = 1;
        if (st.winner === "blue") { L[c.lane].won++; wonThis[c.lane] = 1; }
      }
      for (const u of st.units) {
        const k = u.team + ":" + u.lane;
        const cur = perUnit[k] || { kills: 0, assists: 0, soloAssists: 0 };
        cur.kills += u.kills; cur.assists += u.assists; cur.soloAssists += (u.soloAssists || 0);
        perUnit[k] = cur;
      }
    }

    const inc = plan.income, finc = foeIncome(plan);
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
      const iA = list.findIndex((c) => c.lane === "ADC");
      const iS = list.findIndex((c) => c.lane === "SUPPORT");
      if (iA >= 0 && iS >= 0) {
        const gain = out[iA].gold - list[iA].gold;
        out[iS] = { ...out[iS], gold: out[iS].gold + Math.floor(Math.max(0, gain) / 2) + (round % 2 === 0 ? 1 : 0) };
      }
      return out;
    };
    const bA = A, bB = B;
    A = pay(A, "blue", inc);
    B = pay(B, "red", finc);
    const gainA = A.reduce((t, c, i) => t + (c.gold - bA[i].gold), 0);
    const gainB = B.reduce((t, c, i) => t + (c.gold - bB[i].gold), 0);
    const roundWonByA = gainA > gainB;
    if (gainA > gainB) score.a++; else if (gainB > gainA) score.b++;

    rounds++; fightsPerRound += nFights;
    for (const l of LANES) {
      if (inRound[l]) L[l].roundsIn++;
      if (wonThis[l]) { L[l].wonFightRounds++; if (roundWonByA) L[l].wonFightWonRound++; }
    }
    if (roundWonByA) agree++;
    lastA = sa; lastB = sb;
    if (score.a >= MODE.wins || score.b >= MODE.wins) break;
  }
}

console.log(`=== ${GAMES} แมตช์ · ${rounds} ยก · เฉลี่ย ${(fightsPerRound / rounds).toFixed(1)} ไฟต์ต่อยก ===\n`);
console.log("เลน       ลงไฟต์/ยก  ชนะไฟต์ที่ลง   ยกที่ตัวเองชนะไฟต์แล้วทีมชนะยกด้วย");
for (const l of LANES) {
  const k = L[l];
  console.log(
    l.padEnd(10) + (k.fights / rounds).toFixed(2).padStart(8) +
    ((100 * k.won / Math.max(1, k.fights)).toFixed(1) + "%").padStart(14) +
    ((100 * k.wonFightWonRound / Math.max(1, k.wonFightRounds)).toFixed(1) + "%").padStart(28));
}
console.log(`\nยกหนึ่งตัดสินด้วย "เงินรวมทั้งทีมยกนั้น" ไม่ใช่จำนวนไฟต์ที่ชนะ`);
console.log(`แมตช์หนึ่งต้องชนะ ${MODE.wins} ยกก่อน จากที่เล่นเฉลี่ย ${(rounds / GAMES).toFixed(1)} ยก`);
