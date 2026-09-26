// ---------------------------------------------------------------
// ป่าไปแกงค์ = ไม่มีรายได้ฐานเลย · ยกถัดไปถ้าฟาร์มได้ 1.5 เท่า
// และนิสัยรุกล้ำลดจาก 8 เป็น 6
//
// เช็คทั้งตัวเลขในตาราง แผนของยก และใบเสร็จที่ผู้เล่นเห็นจริง
// ---------------------------------------------------------------
import {
  JUNGLE_AFTER_GANK, JUNGLE_FARM, JUNGLE_GANK, STANCES, STANCE_LIST,
  jungleFarmAfterGank, laneOutcome,
} from "./src/data/behaviour.js";
import { MODES } from "./src/data/modes.js";
import { buildRoundPlan, foeIncome } from "./src/game/round-plan.js";
import { settleRound } from "./src/game/settle.js";

const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);

// ---- ตาราง ----
t("รุกล้ำได้ 6 เงิน", STANCES.AGGRO.gold === 6, STANCES.AGGRO.gold + "g");
t("เซฟกับปกติเท่าเดิม", STANCES.SAFE.gold === 3 && STANCES.NEUTRAL.gold === 5,
  STANCES.SAFE.gold + "g / " + STANCES.NEUTRAL.gold + "g");
t("ไปแกงค์ไม่ได้รายได้ฐานเลย", JUNGLE_GANK.gold === 0 && JUNGLE_GANK.xp === 0,
  JUNGLE_GANK.gold + "g " + JUNGLE_GANK.xp + "xp");
{
  const b = jungleFarmAfterGank();
  t("ฟาร์มหลังแกงค์ได้ 1.5 เท่า", b.gold === Math.round(JUNGLE_FARM.gold * 1.5) && b.gold > JUNGLE_FARM.gold,
    JUNGLE_FARM.gold + "g " + JUNGLE_FARM.xp + "xp → " + b.gold + "g " + b.xp + "xp (×" + JUNGLE_AFTER_GANK + ")");
  t("แกงค์แล้วฟาร์มยังได้น้อยกว่าฟาร์มสองยกติด", b.gold < JUNGLE_FARM.gold * 2,
    "สองยกรวม " + b.gold + "g เทียบกับ " + JUNGLE_FARM.gold * 2 + "g");
}

// ---- ไม่มีนิสัยไหนกินขาด ----
{
  const ev = {};
  for (const a of STANCE_LIST) {
    let g = 0;
    for (const b of STANCE_LIST) { const o = laneOutcome(a, b); g += o.fight ? 0 : o.me.gold; }
    ev[a] = g / STANCE_LIST.length;
  }
  const best = Math.max(...Object.values(ev));
  const worst = Math.min(...Object.values(ev));
  t("ค่าคาดหวังของสามนิสัยใกล้กัน ไม่มีตัวไหนกินขาด", best - worst < 1,
    STANCE_LIST.map((s) => s + " " + ev[s].toFixed(2) + "g").join(" · "));
  t("รุกล้ำไม่ใช่ตัวเลือกที่ดีที่สุดเสมอไปแล้ว", ev.AGGRO <= ev.NEUTRAL,
    "รุกล้ำ " + ev.AGGRO.toFixed(2) + "g · ปกติ " + ev.NEUTRAL.toFixed(2) + "g");
}

// ---- แผนของยก ----
const st3 = { TOP: "NEUTRAL", MID: "NEUTRAL", BOT: "NEUTRAL" };
const mkPlan = (jungleLane, gankedLast, foeGankedLast) => {
  const p = buildRoundPlan({
    stances: st3, foeStances: { TOP: "SAFE", MID: "SAFE", BOT: "SAFE" },
    jungle: { lane: jungleLane, crew: [] }, foeJungle: { lane: null, crew: [] },
    round: 3, gankedLast, foeGankedLast,
  });
  p.foeStances = { TOP: "SAFE", MID: "SAFE", BOT: "SAFE" };
  p.foeJungleLane = null;
  p.foeJungleCrew = [];
  p.seed = 1;
  return p;
};
{
  const farm = mkPlan(null, false, false);
  const gank = mkPlan("TOP", false, false);
  const after = mkPlan(null, true, false);
  t("ยกที่ไปแกงค์ แผนบอกว่ารายได้ป่าเป็นศูนย์", gank.income.JUNGLE.gold === 0 && gank.income.JUNGLE.xp === 0,
    gank.income.JUNGLE.gold + "g " + gank.income.JUNGLE.xp + "xp");
  t("ยกที่ฟาร์มปกติได้ฐานเท่าเดิม", farm.income.JUNGLE.gold === JUNGLE_FARM.gold,
    farm.income.JUNGLE.gold + "g " + farm.income.JUNGLE.xp + "xp");
  t("ฟาร์มหลังยกที่แกงค์ได้เพิ่มจริงในแผน", after.income.JUNGLE.gold === jungleFarmAfterGank().gold,
    after.income.JUNGLE.gold + "g " + after.income.JUNGLE.xp + "xp");
  t("แกงค์แล้วยังแกงค์ต่อก็ยังศูนย์", mkPlan("TOP", true, false).income.JUNGLE.gold === 0, "0g");

  // ฝั่งศัตรูต้องคิดด้วยกติกาเดียวกัน
  const fp = mkPlan(null, false, true);
  t("ฝั่งศัตรูก็ได้ 1.5 เท่าเหมือนกัน", foeIncome(fp).JUNGLE.gold === jungleFarmAfterGank().gold,
    foeIncome(fp).JUNGLE.gold + "g");
}

// ---- ใบเสร็จจริง ----
const mk = (lane, champId) => ({
  lane, champId, level: 6, xp: 0, gold: 0, items: [],
  ranks: { Q: 2, W: 1, E: 1, R: 1 },
  athlete: { mechanics: 5, gameSense: 5, knowledge: 5, decision: 5, teamwork: 5 },
  upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE", autoLevel: true,
});
const roster = () => [
  mk("TOP", "KAZEM"), mk("JUNGLE", "YODAKA"), mk("MID", "LAURA"),
  mk("ADC", "HOOD"), mk("SUPPORT", "PIROSKA"),
];
const jungleRow = (plan, team, jungle) => {
  const s = settleRound({
    plan, done: {}, team, foe: roster(), mySide: "blue", jungle, round: 3, mode: MODES.LONG,
  });
  return { row: s.breakdown.me.find((r) => r.lane === "JUNGLE"), next: s.nextMe };
};
{
  const gank = jungleRow(mkPlan("TOP", false, false), roster(), { lane: "TOP", crew: [] });
  t("ใบเสร็จยกที่แกงค์: ได้ 0 เงิน 0 XP", gank.row.gold === 0 && gank.row.xp === 0,
    gank.row.gold + "g " + gank.row.xp + "xp · " + gank.row.parts.map((p) => p.key).join(", "));
  t("ยกที่แกงค์ติดธงไว้ให้ยกหน้า", gank.next.find((c) => c.lane === "JUNGLE").gankedLast === true,
    "gankedLast = true");

  const farm = jungleRow(mkPlan(null, false, false), roster(), { lane: null, crew: [] });
  t("ใบเสร็จยกที่ฟาร์มปกติ", farm.row.gold === JUNGLE_FARM.gold, farm.row.gold + "g " + farm.row.xp + "xp");
  t("ยกที่ฟาร์มล้างธงทิ้ง", farm.next.find((c) => c.lane === "JUNGLE").gankedLast === false,
    "gankedLast = false");

  const team = roster().map((c) => (c.lane === "JUNGLE" ? { ...c, gankedLast: true } : c));
  const after = jungleRow(mkPlan(null, true, false), team, { lane: null, crew: [] });
  const boost = jungleFarmAfterGank();
  t("ใบเสร็จยกที่ฟาร์มหลังแกงค์", after.row.gold === boost.gold && after.row.xp === boost.xp,
    after.row.gold + "g " + after.row.xp + "xp");
  t("ใบเสร็จแยกให้เห็นว่าส่วนเกินมาจากแคมป์ที่ค้างไว้",
    after.row.parts.some((p) => p.key === "jungleAfterGank" && p.gold === boost.gold - JUNGLE_FARM.gold),
    after.row.parts.map((p) => p.key + " " + p.gold + "g").join(" · "));
  t("ทุกบรรทัดรวมกันได้ยอดจริง",
    after.row.parts.reduce((s, p) => s + (p.gold || 0), 0) === after.row.gold,
    "รวม " + after.row.parts.reduce((s, p) => s + (p.gold || 0), 0) + " = " + after.row.gold);
}

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(48) + " " + d); }
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
