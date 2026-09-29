// ---------------------------------------------------------------
// อัตราชนะ "ทั้งแมตช์" — ไม่ใช่ดวลตัวต่อตัว
//
// ตารางดวลใน _champwr.mjs วัดแค่ "ยืนคนเดียวสู้คนเดียวที่เลเวล 13 ของครบ"
// ซึ่งตัดทิ้งเกือบทุกอย่างที่เป็นเกมจริง: การดราฟต์ เศรษฐกิจ การไต่เลเวล
// การซื้อของตามคู่ต่อสู้ ไฟต์ 2v2 กับไฟต์รวม และการที่ซัพมีเพื่อนให้ช่วยจริงๆ
//
// ไฟล์นี้เล่นทั้งแมตช์ตั้งแต่ดราฟต์จนจบ แล้วนับว่าตัวไหนอยู่ฝั่งที่ชนะกี่ครั้ง
//
//   node _gamewr.mjs [จำนวนแมตช์] [โหมด] [ระดับบอท]
//   node _gamewr.mjs 200 LONG NORMAL
//
// ผลลง game-wr.json
// ---------------------------------------------------------------
import fs from "fs";
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

const GAMES = Number(process.argv[2] || 100);
const MODE = MODES[process.argv[3] || "LONG"];
const DIFF = diffOf(process.argv[4] || "NORMAL");

// ---------------------------------------------------------------
// ช่วงเวลาของเกม — แบ่งตามเลขยก
// แมตช์ LONG ชนะ 26 ยกก่อน เพดาน 51 ยก และจบจริงเฉลี่ยราว 38 ยก
// จึงแบ่งเป็นสามช่วงที่มีไฟต์ใกล้เคียงกัน แล้วรายงานจำนวนไฟต์จริงกำกับไว้เสมอ
// ---------------------------------------------------------------
const PHASES = [
  { key: "early", th: "ต้นเกม", from: 1, to: 12 },
  { key: "mid", th: "กลางเกม", from: 13, to: 26 },
  { key: "late", th: "เลทเกม", from: 27, to: Infinity },
];
const phaseOf = (round) => PHASES.find((p) => round >= p.from && round <= p.to).key;

// ต่อตัวละคร: ลงเล่นกี่แมตช์ · อยู่ฝั่งชนะกี่แมตช์ · สถิติต่อแมตช์
// ph.<ช่วง> = ไฟต์ที่ลงในช่วงนั้น และชนะกี่ไฟต์ พร้อมเลเวล/ของเฉลี่ยตอนนั้น
const S = {};
for (const id of Object.keys(CHAMPIONS)) {
  S[id] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, dmg: 0, took: 0, heal: 0, level: 0, items: 0,
    ph: Object.fromEntries(PHASES.map((p) => [p.key, { fights: 0, won: 0, level: 0, items: 0, dmg: 0, heal: 0 }])) };
}

function playMatch(seed) {
  const rand = mulberry32(seed);
  let A = makeRoster(rand, draftFoe(rand, DIFF.variety, DIFF.offRole), (r, id) => botSpread(r, id, DIFF.floor));
  let B = makeRoster(rand, draftFoe(rand, DIFF.variety, DIFF.offRole), (r, id) => botSpread(r, id, DIFF.floor));
  let lastA = null, lastB = null;
  const score = { a: 0, b: 0 };
  // สถิติสะสมของแมตช์นี้ อิงที่ champId ไม่ใช่เลน เพราะเราสนใจตัวละคร
  const stat = {};
  const bump = (id, k, v) => { (stat[id] = stat[id] || {})[k] = (stat[id][k] || 0) + v; };

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
      const ph = phaseOf(round);
      for (const u of st.units) {
        const k = u.team + ":" + u.lane;
        const cur = perUnit[k] || { kills: 0, assists: 0, soloAssists: 0 };
        cur.kills += u.kills; cur.assists += u.assists; cur.soloAssists += (u.soloAssists || 0);
        perUnit[k] = cur;
        const id = u.champ.id;
        bump(id, "kills", u.kills);
        bump(id, "assists", u.assists);
        bump(id, "deaths", u.alive ? 0 : 1);
        bump(id, "dmg", u.damageDealt || 0);
        bump(id, "took", Object.values(u.takenBy || {}).reduce((x, y) => x + y, 0));
        bump(id, "heal", (u.healGiven || 0) + (u.shieldGiven || 0));
        // ---- ผลไฟต์แยกตามช่วงเกม — นับทันทีเพราะต้องรู้เลเวล/ของ ณ ตอนนั้น
        const def = (u.team === "blue" ? blue : red).find((c) => c.lane === u.lane);
        const p = S[id].ph[ph];
        p.fights++;
        if (st.winner === u.team) p.won++;
        p.level += def ? def.level : 0;
        p.items += def ? def.items.filter((i) => i.tier === 3 || i.kind === "boots").length : 0;
        p.dmg += u.damageDealt || 0;
        p.heal += (u.healGiven || 0) + (u.shieldGiven || 0);
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
    const gainA = A.reduce((t, c, i) => t + (c.gold - beforeA[i].gold), 0);
    const gainB = B.reduce((t, c, i) => t + (c.gold - beforeB[i].gold), 0);
    if (gainA > gainB) score.a++; else if (gainB > gainA) score.b++;
    lastA = sa; lastB = sb;
    if (score.a >= MODE.wins || score.b >= MODE.wins) break;
  }
  const winner = score.a > score.b ? "A" : score.b > score.a ? "B" : null;
  return { A, B, score, winner, stat };
}

const t0 = Date.now();
let rounds = 0, ties = 0;
for (let g = 0; g < GAMES; g++) {
  const r = playMatch(9000 + g * 137);
  rounds += r.score.a + r.score.b;
  if (!r.winner) ties++;
  for (const [side, list] of [["A", r.A], ["B", r.B]]) {
    for (const c of list) {
      const k = S[c.champId];
      k.games++;
      if (r.winner === side) k.wins++;
      k.level += c.level;
      k.items += c.items.filter((i) => i.tier === 3 || i.kind === "boots").length;
      const st = r.stat[c.champId] || {};
      for (const f of ["kills", "deaths", "assists", "dmg", "took", "heal"]) k[f] += st[f] || 0;
    }
  }
  if ((g + 1) % 25 === 0) process.stderr.write("  เล่นไปแล้ว " + (g + 1) + "/" + GAMES + " แมตช์\n");
}

const rows = Object.entries(S).filter(([, k]) => k.games > 0).map(([id, k]) => ({
  id, ch: CHAMPIONS[id], games: k.games,
  wr: (100 * k.wins) / k.games,
  kda: (k.kills + k.assists) / Math.max(1, k.deaths),
  kills: k.kills / k.games, deaths: k.deaths / k.games,
  dmg: k.dmg / k.games, took: k.took / k.games, heal: k.heal / k.games,
  level: k.level / k.games, items: k.items / k.games,
  ph: Object.fromEntries(PHASES.map((p) => {
    const v = k.ph[p.key];
    const n = Math.max(1, v.fights);
    return [p.key, { fights: v.fights, wr: (100 * v.won) / n, level: v.level / n,
      items: v.items / n, dmg: v.dmg / n, heal: v.heal / n,
      err: 1.96 * 100 * Math.sqrt(0.25 / n) }];
  })),
})).sort((a, b) => b.wr - a.wr);

const pad = (s, n) => String(s).padStart(n);
const padr = (s, n) => String(s).padEnd(n);
const mean = rows.reduce((s, r) => s + r.games, 0) / rows.length;
const se = 100 * Math.sqrt(0.25 / mean);

console.log(`\n=== ${GAMES} แมตช์เต็ม · โหมด ${MODE.id} (ชนะ ${MODE.wins} ยกก่อน · เพดาน ${MODE.maxRounds}) · บอท ${DIFF.th} ===`);
console.log(`ยกเฉลี่ยต่อแมตช์ ${(rounds / GAMES).toFixed(1)} · เสมอทั้งแมตช์ ${ties} · ใช้เวลา ${((Date.now() - t0) / 1000).toFixed(0)} วิ`);
console.log(`ตัวละครลงเล่นเฉลี่ยตัวละ ${mean.toFixed(0)} แมตช์ — ค่าคลาดเคลื่อนราว ±${(1.96 * se).toFixed(1)} แต้ม\n`);
console.log("ตัวละคร      ชนะ    ลงเล่น  ฆ่า/ตาย  KDA   ดาเมจ  กินดาเมจ  ฮีล+โล่  เลเวล  ของ  เลน");
for (const r of rows) {
  console.log(
    padr(r.id, 12) + pad(r.wr.toFixed(1) + "%", 6) + pad(r.games, 8) +
    pad(r.kills.toFixed(1) + "/" + r.deaths.toFixed(1), 9) + pad(r.kda.toFixed(1), 6) +
    pad(Math.round(r.dmg), 8) + pad(Math.round(r.took), 9) + pad(Math.round(r.heal), 9) +
    pad(r.level.toFixed(1), 7) + pad(r.items.toFixed(1), 5) + "  " + r.ch.lane);
}

// ---- อัตราชนะไฟต์แยกตามช่วงเกม ----
// ไม่ใช่ "ชนะแมตช์" แต่เป็น "ฝั่งของเขาชนะไฟต์ที่เขาลง" ในช่วงนั้น
// 50% = ไม่ได้เปรียบเสียเปรียบ เพราะทุกไฟต์มีคนชนะหนึ่งแพ้หนึ่ง
const totFights = Object.fromEntries(PHASES.map((p) => [p.key, rows.reduce((s, r) => s + r.ph[p.key].fights, 0)]));
console.log("\n=== อัตราชนะไฟต์แยกตามช่วงเกม ===");
console.log(PHASES.map((p) => p.th + " ยก " + p.from + "-" + (p.to === Infinity ? MODE.maxRounds : p.to)
  + " (" + totFights[p.key].toLocaleString() + " ไฟต์)").join(" · "));
console.log("\nตัวละคร      ต้นเกม  กลางเกม  เลทเกม   ต้น->เลท   เลเวล ต้น/กลาง/เลท");
const byLate = [...rows].sort((a, b) => (b.ph.late.wr - b.ph.early.wr) - (a.ph.late.wr - a.ph.early.wr));
for (const r of byLate) {
  const e = r.ph.early, m = r.ph.mid, l = r.ph.late;
  const d = l.wr - e.wr;
  console.log(
    padr(r.id, 12) + pad(e.wr.toFixed(1), 6) + pad(m.wr.toFixed(1), 8) + pad(l.wr.toFixed(1), 8) +
    pad((d >= 0 ? "+" : "") + d.toFixed(1), 10) + "   " +
    e.level.toFixed(1) + "/" + m.level.toFixed(1) + "/" + l.level.toFixed(1));
}

fs.writeFileSync("game-wr.json", JSON.stringify({
  games: GAMES, mode: MODE.id, diff: DIFF.th,
  roundsPerMatch: Number((rounds / GAMES).toFixed(1)), ties,
  avgGamesEach: Math.round(mean), margin: Number((1.96 * se).toFixed(1)),
  rows: rows.map((r) => ({
    id: r.id, wr: Number(r.wr.toFixed(1)), games: r.games,
    kills: Number(r.kills.toFixed(2)), deaths: Number(r.deaths.toFixed(2)),
    kda: Number(r.kda.toFixed(2)), dmg: Math.round(r.dmg), took: Math.round(r.took),
    heal: Math.round(r.heal), level: Number(r.level.toFixed(1)), items: Number(r.items.toFixed(1)),
    lane: r.ch.lane, role: r.ch.role,
    ph: Object.fromEntries(PHASES.map((p) => {
      const v = r.ph[p.key];
      return [p.key, { fights: v.fights, wr: Number(v.wr.toFixed(1)), margin: Number(v.err.toFixed(1)),
        level: Number(v.level.toFixed(1)), items: Number(v.items.toFixed(1)),
        dmg: Math.round(v.dmg), heal: Math.round(v.heal) }];
    })),
  })),
  phases: PHASES.map((p) => ({ key: p.key, th: p.th, from: p.from, to: p.to === Infinity ? MODE.maxRounds : p.to,
    fights: totFights[p.key] })),
}, null, 1));
console.log("\nเขียน game-wr.json แล้ว");
