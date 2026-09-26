// PUSS — ตราท้าดวลต้องเชื่อฟังคำสั่งของโค้ช และต้องเดินทางข้ามสายไปถึงอีกเครื่อง
import { CHAMPIONS } from "./src/data/champions.js";
import { buildFight } from "./src/engine/build-fight.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";
import { packTeam, unpackTeam } from "./src/net/protocol.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { duelAfterRound } from "./src/game/settle.js";

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


// =================================================================
// เนิร์ฟ: เลือกแล้วติดคูลดาวน์การเลือก 2 ยก · เก็บเป้าได้แล้ว ต้องเก็บตัวอื่นอีก 2 ครั้ง
// =================================================================
const cfg = CHAMPIONS.PUSS.duel;
t("ข้อมูลเนิร์ฟอยู่ในตัวละคร", cfg.pickLockRounds === 1 && cfg.repickAfterKills === 2,
  "คูลดาวน์เลือก " + cfg.pickLockRounds + " ยก · ต้องเก็บตัวอื่น " + cfg.repickAfterKills + " ครั้ง");

// ---- เอนจิน: เลนที่ถูกห้าม ข้ามทั้งแบบสั่งเองและแบบเลือกเอง ----
{
  const markOf = (extra) => {
    const st = buildFight([mk("JUNGLE", "PUSS", extra)].map(toDef), foeTeam.map(toDef), 7, DEFAULT_FIGHT);
    const p = st.units.find((u) => u.champId === "PUSS");
    let g = 0;
    while (!p.duelMarkId && g++ < 120) step(st);
    return p.duelMarkId;
  };
  const best = LANES.reduce((a, L) => (CHAMPIONS[foeIds[L]].value > CHAMPIONS[foeIds[a]].value ? L : a), LANES[0]);
  const a = markOf({ duelLane: "MID", duelBan: { MID: 2 } });
  t("สั่งเลนที่ถูกห้าม — ไม่ได้ตัวนั้น", a !== "red-MID" && !!a, String(a));
  const b = markOf({ duelBan: { [best]: 1 } });
  t("เลือกเองก็ข้ามตัวที่ถูกห้าม", b !== "red-" + best && !!b, b + " (ตัวอันตรายสุดคือ " + best + ")");
}

// ---- เอนจิน: สังหารเป้าที่มีตราแล้วถูกจดไว้ ----
{
  let seen = null;
  for (let seed = 1; seed <= 30 && !seen; seed++) {
    const strong = { ...mk("JUNGLE", "PUSS", { duelLane: "TOP" }), level: 18, ranks: { Q: 5, W: 5, E: 5, R: 3 } };
    const weak = { ...mk("TOP", "PIROSKA"), level: 1, ranks: { Q: 1, W: 0, E: 0, R: 0 } };
    const st = buildFight([strong].map(toDef), [weak].map(toDef), seed, DEFAULT_FIGHT);
    const p = st.units.find((u) => u.champId === "PUSS");
    let g = 0;
    while (!st.over && g++ < 60 * 40) step(st);
    if ((p.duelKills || []).length) seen = p.duelKills.slice();
  }
  t("สังหารเป้าที่มีตรา — จดเลนไว้", !!seen && seen[0] === "TOP", seen ? seen.join(",") : "ไม่เคยเก็บได้");
}

// ---- ปิดยก: คูลดาวน์การเลือก และรายการห้ามข้ามยก ----
{
  let c = { champId: "PUSS", lane: "JUNGLE", duelLane: "MID" };
  const next = (row, round, kills) => ({ ...row, ...duelAfterRound(row, kills ? { duelKills: kills } : null, round) });
  c = next(c, 3, null);
  t("เลือกยก 3 — ล็อกถึงก่อนยก 4", c.duelLockUntil === 4 && c.duelCommitted === "MID", "lockUntil " + c.duelLockUntil);
  const c4 = next(c, 4, null);
  t("ไม่เปลี่ยนเป้า — ไม่ต่อคูลดาวน์", c4.duelLockUntil === 4, "lockUntil " + c4.duelLockUntil);
  c = next(c4, 4, ["MID"]);
  t("เก็บเป้าที่เลือกได้ — ห้ามตัวนั้น 2 ครั้ง", c.duelBan && c.duelBan.MID === 2, JSON.stringify(c.duelBan));
  t("เก็บเป้าที่เลือกได้ — คำสั่งถูกปล่อย เลือกใหม่ได้เลย", c.duelLane === null && c.duelLockUntil === 0,
    "lane " + c.duelLane + " · lockUntil " + c.duelLockUntil);
  c = next({ ...c, duelLane: "TOP" }, 5, ["TOP"]);
  t("เก็บตัวอื่นได้ 1 ครั้ง — ตัวเดิมเหลือ 1", c.duelBan.MID === 1 && c.duelBan.TOP === 2, JSON.stringify(c.duelBan));
  c = next({ ...c, duelLane: "ADC" }, 6, ["ADC"]);
  t("เก็บตัวอื่นครบ 2 ครั้ง — ตัวเดิมเลือกได้อีก", !("MID" in (c.duelBan || {})) && c.duelBan.TOP === 1 && c.duelBan.ADC === 2,
    JSON.stringify(c.duelBan));
  // เก็บตัวเดิมซ้ำไม่ได้นับเป็น "ตัวอื่น"
  let d = { champId: "PUSS", lane: "JUNGLE", duelBan: { MID: 2 } };
  d = next(d, 7, ["MID"]);
  t("เก็บตัวเดิมไม่นับเป็นตัวอื่น", d.duelBan.MID === 2, JSON.stringify(d.duelBan));
  // ตัวที่ไม่มีตราท้าดวลไม่โดนอะไร
  const other = duelAfterRound({ champId: "HOOD", lane: "ADC" }, { duelKills: ["MID"] }, 3);
  t("ตัวอื่นไม่ได้รับผลเนิร์ฟนี้", Object.keys(other).length === 0, JSON.stringify(other));
}

// ---- รายการห้ามต้องรอดข้ามสาย ----
{
  const row = [mk("JUNGLE", "PUSS", { duelBan: { MID: 1, TOP: 2 } })];
  const back = unpackTeam(packTeam(row))[0];
  t("รายการห้ามรอดข้ามสาย", JSON.stringify(back.duelBan) === JSON.stringify({ MID: 1, TOP: 2 }), JSON.stringify(back.duelBan));
}

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(38) + " " + d); }
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
