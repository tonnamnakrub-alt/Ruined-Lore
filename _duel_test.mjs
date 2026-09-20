// PUSS — ตราท้าดวลต้องเชื่อฟังคำสั่งของโค้ช และต้องเดินทางข้ามสายไปถึงอีกเครื่อง
import { CHAMPIONS } from "./src/data/champions.js";
import { buildFight } from "./src/engine/build-fight.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";
import { packTeam, unpackTeam } from "./src/net/protocol.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";

const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);

const mk = (lane, id, extra) => ({
  lane, champId: id, level: 11, xp: 0, gold: 0, items: [],
  ranks: { Q: 3, W: 3, E: 3, R: 2 },
  athlete: { mechanics: 7, gameSense: 7, knowledge: 7, decision: 7, teamwork: 7 },
  upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE", ...extra,
});
// ทีมศัตรูครบห้าเลน — ให้เลนที่ AI Value สูงสุดไม่ใช่เลนที่เราจะสั่ง
const foeIds = { TOP: "TOTSAKAN", JUNGLE: "ELLA", MID: "NIAN", ADC: "HOOD", SUPPORT: "PIROSKA" };
const foeTeam = LANES.map((L) => mk(L, foeIds[L]));

t("PUSS มีพาสซีฟท้าดวลในข้อมูล", !!CHAMPIONS.PUSS.duel, CHAMPIONS.PUSS.passive.th);

// ---- สั่งเลนไหนก็ต้องได้เลนนั้น ----
const marks = {};
for (const want of LANES) {
  const mine = [mk("JUNGLE", "PUSS", { duelLane: want })];
  const st = buildFight(mine.map(toDef), foeTeam.map(toDef), 7, DEFAULT_FIGHT);
  const p = st.units.find((u) => u.champId === "PUSS");
  let g = 0;
  while (!p.duelMarkId && g++ < 120) step(st);
  marks[want] = p.duelMarkId;
}
const allRight = LANES.every((L) => marks[L] === "red-" + L);
t("สั่งท้าดวลเลนไหนก็ได้เลนนั้น", allRight, LANES.map((L) => L + "→" + marks[L]).join(" "));

// ---- ไม่สั่ง = เลือกตัวที่อันตรายที่สุดให้เหมือนเดิม ----
{
  const st = buildFight([mk("JUNGLE", "PUSS")].map(toDef), foeTeam.map(toDef), 7, DEFAULT_FIGHT);
  const p = st.units.find((u) => u.champId === "PUSS");
  let g = 0;
  while (!p.duelMarkId && g++ < 120) step(st);
  const best = LANES.reduce((a, L) => (CHAMPIONS[foeIds[L]].value > CHAMPIONS[foeIds[a]].value ? L : a), LANES[0]);
  t("ไม่สั่งก็ยังเลือกตัวอันตรายสุดให้", p.duelMarkId === "red-" + best, p.duelMarkId + " (ค่าสูงสุด " + best + ")");
}

// ---- เลนที่สั่งไม่ได้ลงไฟต์นี้ (ไฟต์เลนสองคน) ต้องไม่ค้าง ----
{
  const st = buildFight([mk("JUNGLE", "PUSS", { duelLane: "SUPPORT" })].map(toDef),
    [mk("TOP", "TOTSAKAN")].map(toDef), 7, DEFAULT_FIGHT);
  const p = st.units.find((u) => u.champId === "PUSS");
  let g = 0;
  while (!p.duelMarkId && g++ < 120) step(st);
  t("เลนที่สั่งไม่ได้ลงไฟต์ก็ยังหาเป้าได้", p.duelMarkId === "red-TOP", String(p.duelMarkId));
}

// ---- คำสั่งต้องรอดข้ามสายไปถึงอีกเครื่อง ----
{
  const mine = [mk("JUNGLE", "PUSS", { duelLane: "SUPPORT" })];
  const round = unpackTeam(packTeam(mine));
  t("คำสั่งท้าดวลรอดข้ามสาย", round[0].duelLane === "SUPPORT", String(round[0].duelLane));
  const here = buildFight(mine.map(toDef), foeTeam.map(toDef), 11, DEFAULT_FIGHT);
  const there = buildFight(round.map(toDef), unpackTeam(packTeam(foeTeam)).map(toDef), 11, DEFAULT_FIGHT);
  const mark = (st) => {
    const p = st.units.find((u) => u.champId === "PUSS");
    let g = 0;
    while (!p.duelMarkId && g++ < 120) step(st);
    return p.duelMarkId;
  };
  const a = mark(here), b = mark(there);
  t("สองเครื่องจับคู่ดวลคู่เดียวกัน", a === b && a === "red-SUPPORT", a + " / " + b);
}

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(38) + " " + d); }
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
