// กติกาเงินที่ต้องไม่หลุดตอนปรับบาลานซ์
//
// จุดสำคัญ: ซัพพอร์ตได้ "ครึ่งหนึ่งของรายได้เลนของ ADC" เท่านั้น
// ไม่ใช่ครึ่งหนึ่งของเงินทั้งหมดที่ ADC ได้ (เงินศพกับพาสซีฟของ ADC ไม่เข้าการหาร)
import { ASSIST_SOLO, KILL, STANCES } from "./src/data/behaviour.js";
import { buildRoundPlan } from "./src/game/round-plan.js";
import { settleRound } from "./src/game/settle.js";

const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);

const mk = (lane) => ({
  lane, champId: "KAZEM", level: 8, xp: 0, gold: 0, items: [],
  ranks: { Q: 1, W: 1, E: 1, R: 1 },
  athlete: { mechanics: 5, gameSense: 5, knowledge: 5, decision: 5, teamwork: 5 },
  upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE",
});
const roster = () => LANES.map(mk);
const unit = (team, lane, extra) => ({
  team, lane, alive: true, kills: 0, assists: 0, soloAssists: 0,
  wvcGold: 0, duelGold: 0, bountyGold: 0, sangGained: 0, duelKills: [], victims: [], ...extra,
});

// เลนบอทเราสั่งปกติ เขาสั่งเซฟ -> รายได้เลนของเรา 7 (ฐาน 5 + กินเลนฟรี 2)
function play({ round = 5, botFight = false, adcKills = 0, adcAssists = 0 } = {}) {
  const stances = { TOP: "NEUTRAL", MID: "NEUTRAL", BOT: botFight ? "NEUTRAL" : "NEUTRAL" };
  const foeStances = { TOP: "SAFE", MID: "SAFE", BOT: botFight ? "NEUTRAL" : "SAFE" };
  const none = { lane: null, crew: [] };
  const plan = buildRoundPlan({ stances, foeStances, jungle: none, foeJungle: none, round });
  plan.foeStances = foeStances;
  plan.foeJungleLane = null;
  plan.foeJungleCrew = [];
  plan.seed = 1;
  const done = adcKills || adcAssists ? {
    BOT: {
      lane: "BOT", iWon: true, winner: "blue", time: 20, rows: [], log: [],
      units: [
        unit("blue", "ADC", {
          kills: adcKills, assists: adcAssists, soloAssists: adcAssists,
          victims: Array.from({ length: adcKills }, () => ({ team: "red", lane: "ADC" })),
        }),
        unit("red", "ADC", { alive: adcKills === 0 }),
      ],
    },
  } : {};
  const res = settleRound({
    plan, done, team: roster(), foe: roster(), mySide: "blue",
    jungle: none, round, mode: { gold: 1, xp: 1 },
  });
  const row = (lane) => res.breakdown.me.find((r) => r.lane === lane);
  return { res, row };
}

// ---- ซัพไม่มีรายได้เลนของตัวเอง ----
{
  const { row } = play();
  const sup = row("SUPPORT");
  const laneParts = sup.parts.filter((p) => p.key === "stanceBase" || p.key === "stanceMatchup");
  const laneSum = laneParts.reduce((x, p) => x + p.gold, 0);
  const cancel = sup.parts.find((p) => p.key === "supportNoLane");
  t("ซัพมีรายได้เลนในตาราง แต่โดนตัดทิ้งหมด", laneSum > 0 && !!cancel && laneSum + cancel.gold === 0,
    "รายได้เลน " + laneSum + " · ตัดออก " + (cancel ? cancel.gold : "-"));
}

// ---- ครึ่งหนึ่งของรายได้เลนของ ADC เท่านั้น ----
{
  const laneIncome = STANCES.NEUTRAL.gold + 2;          // ปกติเจอเซฟ = 5 + 2 = 7
  const plain = play();
  const adc = plain.row("ADC");
  const sup = plain.row("SUPPORT");
  const share = sup.parts.find((p) => p.key === "supportShare");
  t("รายได้เลนของ ADC เป็นไปตามตาราง", adc.parts.filter((p) => p.key === "stanceBase" || p.key === "stanceMatchup")
    .reduce((s, p) => s + p.gold, 0) === laneIncome, laneIncome + "g");
  t("ยกที่ไม่มีไฟต์ ซัพได้ครึ่งของรายได้เลน", share && share.gold === Math.floor(laneIncome / 2),
    (share ? share.gold : 0) + "g จากรายได้เลน " + laneIncome + "g");

  // ยกเดียวกันแต่ ADC เก็บศพได้ 1 ตัว และช่วยอีก 1 — ส่วนแบ่งของซัพต้องไม่ขยับ
  const fed = play({ adcKills: 1, adcAssists: 1 });
  const adc2 = fed.row("ADC");
  const sup2 = fed.row("SUPPORT");
  const share2 = sup2.parts.find((p) => p.key === "supportShare");
  t("ADC เก็บศพได้ เงินของ ADC ต้องเพิ่ม",
    adc2.gold > adc.gold, adc.gold + "g -> " + adc2.gold + "g");
  t("แต่ส่วนแบ่งของซัพเท่าเดิม ไม่เอาเงินศพมาหาร",
    share2 && share2.gold === Math.floor(laneIncome / 2),
    (share2 ? share2.gold : 0) + "g (แบบเก่าจะได้ " + Math.floor((laneIncome + 1 + KILL.gold + ASSIST_SOLO.gold + 2) / 2) + "g)");
}

// ---- ยกคู่ได้เพิ่มอีก 1 ----
{
  const odd = play({ round: 5 });
  const even = play({ round: 6 });
  const sOdd = odd.row("SUPPORT");
  const sEven = even.row("SUPPORT");
  t("ยกคี่ไม่มีโบนัสยกคู่", !sOdd.parts.some((p) => p.key === "supportEven"), sOdd.gold + "g");
  t("ยกคู่ได้เพิ่มอีก 1", sEven.gold === sOdd.gold + 1, sOdd.gold + "g -> " + sEven.gold + "g");
}

// ---- เลนที่แตกไฟต์เพราะนิสัย ไม่มีรายได้ฐาน ซัพก็ไม่ได้ส่วนแบ่ง ----
{
  const { row } = play({ botFight: true });
  const sup = row("SUPPORT");
  const share = sup.parts.find((p) => p.key === "supportShare");
  t("บอทแตกไฟต์ ซัพไม่ได้ส่วนแบ่งเลน", !share, sup.gold + "g");
}

// ---- ใบเสร็จยังรวมได้ยอดจริง ----
{
  const { res } = play({ round: 6, adcKills: 1, adcAssists: 1 });
  let bad = 0;
  for (const side of ["me", "foe"]) {
    for (const r of res.breakdown[side]) {
      if (r.parts.reduce((s, p) => s + p.gold, 0) !== r.gold) bad++;
      if (r.parts.reduce((s, p) => s + p.xp, 0) !== r.xp) bad++;
    }
  }
  t("ทุกบรรทัดรวมกันได้ยอดจริง", bad === 0, bad + " แถวที่ไม่ตรง");
}

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(42) + " " + d); }
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
