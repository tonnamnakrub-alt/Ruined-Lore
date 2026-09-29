// ---------------------------------------------------------------
// ไอเทมชิ้นไหนแรงตอนไหน — วัดแบบเดียวกับ _itemwr.mjs แต่แยกสามช่วงเกม
//
// สองทีมเหมือนกันเป๊ะ ต่างกันอย่างเดียวคือฝั่งหนึ่งได้ไอเทมที่วัดเพิ่มคนละชิ้น
// 50% = ไอเทมไม่มีผลเลย · ยิ่งเกินยิ่งแรง
//
// เลเวลกับงบของแต่ละช่วงอิงจากที่วัดได้จริงในแมตช์เต็ม (_gamewr.mjs)
// ไม่ได้ตั้งเอาเอง — ต้นเกมราวเลเวล 5 · กลางเกมราว 10 · เลทเกมราว 15
//
//   node _itemphase.mjs [จำนวนไฟต์ต่อชิ้นต่อช่วง]
//
// ผลลง item-phase.json
// ---------------------------------------------------------------
import fs from "fs";
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { ITEMS, applyBuy } from "./src/data/items.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";
import { shopFor } from "./src/game/shop-ai.js";
import { mulberry32 } from "./src/engine/util.js";

const N = Number(process.argv[2] || 60);
const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));

// ช่วงเกม — เลเวลและงบซื้อของ ณ ตอนนั้น
const PHASES = [
  { key: "early", th: "ต้นเกม", level: 5, gold: 100 },
  { key: "mid", th: "กลางเกม", level: 10, gold: 250 },
  { key: "late", th: "เลทเกม", level: 15, gold: 430 },
];

const SQUAD = {
  TANK: ["TOTSAKAN", "KLAEDER", "NIAN", "H.S.B", "STEIN"],
  FIGHTER: ["KAZEM", "ARTHUR", "TRISTAN", "LUCH", "ALUCARD"],
  ASSASSIN: ["ELLA", "YODAKA", "PUSS", "KAMACHI", "ALUCARD"],
  MAGE: ["ARIEL", "LAURA", "JACK", "FAUSTUS", "PIROSKA"],
  MARKSMAN: ["HOOD", "PETER", "C.HOOK", "PHANTOM", "HOOD"],
  SUPPORT: ["PINO", "ALICE", "PIROSKA", "H.S.B", "STEIN"],
};

const base = (lane, id, p) => ({
  lane, champId: id, level: p.level, xp: 0, gold: p.gold, items: [],
  ranks: autoRanks(p.level, CHAMPIONS[id].skillPriority, null),
  athlete: flat(5), upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE",
});

function team(cat, seed, extra, p) {
  const ids = SQUAD[cat];
  const roster = LANES.map((l, i) => base(l, ids[i], p));
  return roster.map((c) => {
    let out = shopFor(c, roster, mulberry32(77 + seed), 0);
    if (extra) {
      const nx = applyBuy({ ...out, gold: 99999 }, extra);
      if (nx.items.length > out.items.length) out = { ...nx, gold: out.gold };
    }
    return toDef(out);
  });
}

function winRate(cat, item, p) {
  let win = 0;
  for (let s = 0; s < N; s++) {
    const swap = s % 2 === 1;
    const withIt = team(cat, s, item, p);
    const without = team(cat, s, null, p);
    const st = buildFight(swap ? without : withIt, swap ? withIt : without, s * 7919 + 13, DEFAULT_FIGHT);
    let g = 0;
    while (!st.over && g++ < 60 * 200) step(st);
    const mine = swap ? "red" : "blue";
    if (st.winner === mine) win++;
    else if (!st.winner) win += 0.5;
  }
  return (100 * win) / N;
}

const CATS = ["TANK", "FIGHTER", "ASSASSIN", "MAGE", "MARKSMAN", "SUPPORT"];
const margin = 196 * Math.sqrt(0.25 / N);
console.log(`วัดชิ้นละ ${N} ไฟต์ต่อช่วง · ค่าคลาดเคลื่อนต่อชิ้นราว ±${margin.toFixed(1)} แต้ม`);
console.log("(ค่าเฉลี่ยรายสายรวมของหลายชิ้น แม่นกว่านั้นมาก — ดูท้ายตาราง)\n");

// ฐานของแต่ละหมวดในแต่ละช่วง — สองทีมเหมือนกันเป๊ะ ควรใกล้ 50%
const baseline = {};
for (const p of PHASES) {
  baseline[p.key] = {};
  const line = [];
  for (const cat of CATS) {
    baseline[p.key][cat] = winRate(cat, null, p);
    line.push(cat + " " + baseline[p.key][cat].toFixed(0) + "%");
  }
  console.log("ฐาน " + p.th.padEnd(9) + " (เลเวล " + p.level + " งบ " + p.gold + "g)  " + line.join(" · "));
}

const t3 = ITEMS.filter((i) => i.tier === 3);
const rows = [];
let done = 0;
for (const it of t3) {
  const ph = {};
  for (const p of PHASES) ph[p.key] = winRate(it.cat, it, p);
  rows.push({ id: it.id, cat: it.cat, cost: it.cost, name: it.th.split("—")[0].trim(), ph });
  if (++done % 10 === 0) process.stderr.write("  วัดไปแล้ว " + done + "/" + t3.length + " ชิ้น\n");
}

// เหนือฐาน = แรงจริงของชิ้นนั้น หักผลของ "ทีมนี้ในช่วงนี้เอียงอยู่แล้ว" ออก
const edge = (r, k) => r.ph[k] - baseline[k][r.cat];

console.log("\n=== ความแรงเหนือฐาน แยกตามช่วง (0 = ไม่มีผลเลย) ===\n");
console.log("สาย        ต้นเกม  กลางเกม  เลทเกม   ต้น->เลท  จำนวนชิ้น");
const catRows = [];
for (const cat of CATS) {
  const list = rows.filter((r) => r.cat === cat);
  const avg = (k) => list.reduce((s, r) => s + edge(r, k), 0) / list.length;
  const e = avg("early"), m = avg("mid"), l = avg("late");
  catRows.push({ cat, early: e, mid: m, late: l, n: list.length,
    margin: (196 * Math.sqrt(0.25 / (N * list.length))) });
  console.log(cat.padEnd(11) + (e >= 0 ? "+" : "") + e.toFixed(1).padStart(5) +
    ((m >= 0 ? "+" : "") + m.toFixed(1)).padStart(9) + ((l >= 0 ? "+" : "") + l.toFixed(1)).padStart(9) +
    ((l - e >= 0 ? "+" : "") + (l - e).toFixed(1)).padStart(10) + String(list.length).padStart(10));
}

console.log("\n=== รายชิ้น เรียงตามตัวที่ไต่ขึ้นตอนท้ายมากสุด ===\n");
console.log("สาย       รหัส  ราคา  ต้นเกม  กลางเกม  เลทเกม  ต้น->เลท  ชื่อ");
const byArc = [...rows].sort((a, b) => (edge(b, "late") - edge(b, "early")) - (edge(a, "late") - edge(a, "early")));
for (const r of byArc) {
  const e = edge(r, "early"), m = edge(r, "mid"), l = edge(r, "late");
  console.log(r.cat.padEnd(10) + r.id.padEnd(6) + (r.cost + "g").padStart(5) +
    ((e >= 0 ? "+" : "") + e.toFixed(1)).padStart(8) + ((m >= 0 ? "+" : "") + m.toFixed(1)).padStart(9) +
    ((l >= 0 ? "+" : "") + l.toFixed(1)).padStart(8) + ((l - e >= 0 ? "+" : "") + (l - e).toFixed(1)).padStart(10) +
    "  " + r.name);
}

fs.writeFileSync("item-phase.json", JSON.stringify({
  fightsEach: N, margin: Number(margin.toFixed(1)),
  phases: PHASES, baseline, squads: SQUAD,
  cats: catRows.map((c) => ({ ...c, early: Number(c.early.toFixed(1)), mid: Number(c.mid.toFixed(1)),
    late: Number(c.late.toFixed(1)), margin: Number(c.margin.toFixed(1)) })),
  rows: rows.map((r) => ({
    id: r.id, cat: r.cat, cost: r.cost, name: r.name,
    early: Number(edge(r, "early").toFixed(1)),
    mid: Number(edge(r, "mid").toFixed(1)),
    late: Number(edge(r, "late").toFixed(1)),
    raw: { early: Number(r.ph.early.toFixed(1)), mid: Number(r.ph.mid.toFixed(1)), late: Number(r.ph.late.toFixed(1)) },
  })),
}, null, 1));
console.log("\nเขียน item-phase.json แล้ว");
