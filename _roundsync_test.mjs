// โหมดออนไลน์ "ทั้งยก" — สองเครื่องต้องเห็นผลยกเดียวกัน ไม่ใช่แค่ไฟต์เดียวกัน
//
// _netsync_test ดูแค่ไฟต์ แต่แต้มของยกตัดสินจาก "ใครได้เงินยกนี้มากกว่า"
// ซึ่งผ่านแผนของยก → ไฟต์ทุกเลน → การแจกเงิน แต่ละเครื่องคิดเองจากมุมของตัวเอง
// เทสนี้เรียกโค้ดชุดเดียวกับที่ App ใช้จริง (buildRoundPlan · buildLaneFight · settleRound)
import { CHAMPIONS } from "./src/data/champions.js";
import { ITEMS } from "./src/data/items.js";
import { STANCE_LANES, STANCE_LIST, crewAllowed } from "./src/data/behaviour.js";
import { MODES } from "./src/data/modes.js";
import { step } from "./src/engine/step.js";
import { buildRoundPlan } from "./src/game/round-plan.js";
import { buildLaneFight, recordLaneFight } from "./src/game/lane-fight.js";
import { settleRound } from "./src/game/settle.js";
import { packTeam, unpackTeam } from "./src/net/protocol.js";

const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
const STYLES = ["ENGAGE", "POKE", "HOLD"];

function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];

function makeTeam(rand, style) {
  const ids = Object.values(CHAMPIONS).map((c) => c.id);
  const big = ITEMS.filter((i) => i.cost >= 50);
  return LANES.map((lane, i) => ({
    lane, champId: pick(rand, ids), level: 4 + Math.floor(rand() * 12), xp: 30, gold: 20,
    items: [pick(rand, big), pick(rand, big)],
    ranks: { Q: 3, W: 2, E: 2, R: 1 },
    athlete: { mechanics: 6, gameSense: 5, knowledge: 5, decision: 6, teamwork: 5 },
    upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
    char: "P" + (i + 1), athleteName: "P" + (i + 1),
    duelLane: rand() < 0.5 ? pick(rand, LANES) : null,
    // ค่าหัว — สายสังหาร/สายตาย มีผลกับเงินศพ ถ้าหล่นหายตอนส่งจะจ่ายเงินคนละจำนวน
    killStreak: rand() < 0.35 ? 1 + Math.floor(rand() * 5) : 0,
    deathStreak: rand() < 0.35 ? 1 + Math.floor(rand() * 4) : 0,
    // PUSS — เลนที่ยังประทับตราซ้ำไม่ได้ ถ้าหล่นหายตอนส่ง สองเครื่องจะเลือกเป้าคนละตัว
    duelBan: rand() < 0.4 ? { [LANES[Math.floor(rand() * LANES.length)]]: 1 + Math.floor(rand() * 2) } : null,
    style, autoLevel: false,
  }));
}

function makeOrders(rand, round) {
  const stances = {};
  for (const L of STANCE_LANES) stances[L] = pick(rand, STANCE_LIST);
  let jungle = { lane: null, crew: [] };
  const open = STANCE_LANES.filter((L) => stances[L] !== "SAFE");
  if (open.length && rand() < 0.6) {
    const lane = pick(rand, open);
    const pool = STANCE_LANES.filter((L) => L !== lane && stances[L] === "SAFE");
    const crew = pool.slice(0, crewAllowed(round));
    jungle = { lane, crew };
  }
  return { stances, jungle };
}

// เครื่องหนึ่งเครื่อง: เห็นทีมตัวเองของจริง ทีมอีกฝั่งมาจากสาย
function playRound(me, meOrd, meStyle, them, themOrd, mySide, seed, round, mode) {
  const foe = unpackTeam(packTeam(them.map((c) => ({ ...c, style: c.style }))));
  const plan = buildRoundPlan({
    stances: meOrd.stances, foeStances: themOrd.stances,
    jungle: meOrd.jungle, foeJungle: themOrd.jungle, round,
  });
  plan.foeStances = themOrd.stances;
  plan.foeJungleLane = themOrd.jungle.lane;
  plan.foeJungleCrew = themOrd.jungle.crew || [];
  plan.seed = seed;
  const done = {};
  // ดูไฟต์คนละลำดับได้ — ผลต้องไม่ขึ้นกับลำดับ
  const order = mySide === "blue" ? STANCE_LANES : STANCE_LANES.slice().reverse();
  for (const L of order) {
    const st = buildLaneFight({ plan, lane: L, team: me, foe, teamStyle: meStyle, mySide });
    if (!st) continue;
    let g = 0;
    while (!st.over && g++ < 60 * 120) step(st);
    done[L] = recordLaneFight(st, L, mySide);
  }
  const res = settleRound({ plan, done, team: me, foe, mySide, jungle: meOrd.jungle, round, mode });
  return { plan, done, res };
}

let bad = 0, badBreak = 0, n = 0, draws = 0;
const N = 160;
for (let i = 0; i < N; i++) {
  const rand = mulberry(4242 + i);
  const round = 1 + Math.floor(rand() * 40);
  const mode = pick(rand, Object.values(MODES));
  const sA = pick(rand, STYLES), sB = pick(rand, STYLES);
  const A = makeTeam(rand, sA);
  const B = makeTeam(rand, sB);
  const oA = makeOrders(rand, round);
  const oB = makeOrders(rand, round);
  const seed = Math.floor(rand() * 1e9);

  const host = playRound(A, oA, sA, B, oB, "blue", seed, round, mode);
  const guest = playRound(B, oB, sB, A, oA, "red", seed, round, mode);
  n++;

  const laneOk = STANCE_LANES.every((L) => {
    const h = host.done[L], g = guest.done[L];
    if (!h && !g) return true;
    if (!h || !g) return false;
    return h.winner === g.winner && h.time === g.time;
  });
  const goldOk = host.res.myGold === guest.res.foeGold && host.res.foeGold === guest.res.myGold;
  const winOk = host.res.drawn === guest.res.drawn && (host.res.drawn || host.res.iWon === !guest.res.iWon);
  if (host.res.drawn) draws++;
  if (!(laneOk && goldOk && winOk)) {
    bad++;
    if (bad <= 5) {
      console.log(`ไม่ตรง #${i} ยก ${round}`);
      console.log("   เจ้าบ้าน   เงินเรา/เขา", host.res.myGold, host.res.foeGold, "ชนะ", host.res.iWon,
        "เลน", STANCE_LANES.map((L) => host.done[L] ? (host.done[L].iWon ? "W" : "L") : "-").join(""));
      console.log("   ผู้เข้าร่วม เงินเรา/เขา", guest.res.myGold, guest.res.foeGold, "ชนะ", guest.res.iWon,
        "เลน", STANCE_LANES.map((L) => guest.done[L] ? (guest.done[L].iWon ? "W" : "L") : "-").join(""));
    }
  }

  // ใบเสร็จของทุกคนต้องรวมกันได้ยอดจริงพอดี ทั้งเงินและ XP
  for (const side of ["me", "foe"]) {
    for (const row of host.res.breakdown[side]) {
      const g = row.parts.reduce((s, p) => s + p.gold, 0);
      const x = row.parts.reduce((s, p) => s + p.xp, 0);
      if (g !== row.gold || x !== row.xp) {
        badBreak++;
        if (badBreak <= 4) console.log(`ใบเสร็จไม่ตรง #${i} ${side} ${row.lane}: รวม ${g}g/${x}xp แต่ยอดจริง ${row.gold}g/${row.xp}xp`,
          JSON.stringify(row.parts.map((p) => p.key + ":" + p.gold + "/" + p.xp)));
      }
    }
  }
}

console.log(`\nยกที่สองเครื่องเห็นผลไม่ตรงกัน: ${bad}/${n}  (เสมอ ${draws})`);
console.log(`ใบเสร็จที่รวมไม่ได้ยอดจริง: ${badBreak}`);
process.exit(bad || badBreak ? 1 : 0);
