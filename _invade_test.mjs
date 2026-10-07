// ---------------------------------------------------------------
// ป่าบุกป่า และรอบปรับเศรษฐกิจ — ตรวจว่ากติกาออกมาตรงที่กำหนด
//
//   node _invade_test.mjs
// ---------------------------------------------------------------
import { INVADE, LANE_FLOOR, MID_BONUS, MID_BONUS_EVERY, JUNGLE_FARM, jungleFarmAfterGank } from "./src/data/behaviour.js";
import { buildRoundPlan, foeIncome } from "./src/game/round-plan.js";
import { setLang } from "./src/i18n.js";

setLang("th");
const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);

const S = (v) => ({ TOP: v, MID: v, BOT: v });
const FARM = { lane: null, crew: [] };
const INV = { lane: INVADE, crew: [] };
const GANK = { lane: "TOP", crew: [] };

const plan = (j, fj, opts = {}) => buildRoundPlan({
  stances: opts.stances || S("SAFE"),
  foeStances: opts.foeStances || S("SAFE"),
  jungle: j, foeJungle: fj, round: opts.round || 1,
  gankedLast: !!opts.gankedLast, foeGankedLast: !!opts.foeGankedLast,
  raidedLast: !!opts.raidedLast, foeRaidedLast: !!opts.foeRaidedLast,
});

// ---- รอบปรับเศรษฐกิจ
{
  const p = plan(FARM, FARM, { stances: S("NEUTRAL"), foeStances: S("NEUTRAL") });
  const broke = ["TOP", "MID", "ADC", "SUPPORT"].filter(
    (m) => p.income[m].gold < LANE_FLOOR.gold || p.income[m].xp < LANE_FLOOR.xp);
  t("ทุกเลนได้พื้น 2g 1xp แม้เลนแตกไฟต์", broke.length === 0,
    broke.length ? broke.join(" ") : ["TOP", "MID", "ADC", "SUPPORT"]
      .map((m) => m + " " + p.income[m].gold + "g/" + p.income[m].xp + "xp").join(" · "));
}
{
  const no = plan(FARM, FARM, { round: 2 }).income.MID;
  const yes = plan(FARM, FARM, { round: MID_BONUS_EVERY }).income.MID;
  t("มิดได้เพิ่ม 1g 1xp ทุกสามยก",
    yes.gold === no.gold + MID_BONUS.gold && yes.xp === no.xp + MID_BONUS.xp,
    "ยก 2 " + no.gold + "g/" + no.xp + "xp -> ยก " + MID_BONUS_EVERY + " " + yes.gold + "g/" + yes.xp + "xp");
}
{
  t("ป่าฟาร์มได้ 6g 4xp", JUNGLE_FARM.gold === 6 && JUNGLE_FARM.xp === 4,
    JUNGLE_FARM.gold + "g/" + JUNGLE_FARM.xp + "xp");
  const after = plan(FARM, FARM, { gankedLast: true }).income.JUNGLE;
  t("ยกหลังไปแกงค์ กลับมาฟาร์มได้ 10g 6xp", after.gold === 10 && after.xp === 6,
    after.gold + "g/" + after.xp + "xp");
}

// ---- ป่าบุกป่า
{
  const p = plan(INV, FARM, { stances: { TOP: "SAFE", MID: "SAFE", BOT: "SAFE" } });
  const j = p.lanes.JUNGLE;
  t("บุกตอนศัตรูฟาร์ม — เกิดไฟต์ในป่า", !!j && j.fight, j ? "มีไฟต์" : "ไม่มีไฟต์");
  t("มิดที่สั่งเซฟตามไปรุม กลายเป็นสองต่อหนึ่ง",
    !!j && j.blue.length === 2 && j.blue.includes("MID") && j.red.length === 1,
    j ? "[" + j.blue + "] vs [" + j.red + "]" : "-");
}
{
  const p = plan(INV, FARM, { stances: { TOP: "SAFE", MID: "NEUTRAL", BOT: "SAFE" } });
  const j = p.lanes.JUNGLE;
  t("มิดไม่ได้สั่งเซฟ ก็สู้ตัวต่อตัว",
    !!j && j.blue.length === 1 && j.red.length === 1,
    j ? "[" + j.blue + "] vs [" + j.red + "]" : "-");
}
{
  const p = plan(INV, FARM, { stances: { TOP: "SAFE", MID: "SAFE", BOT: "SAFE" } });
  t("มิดที่ตามป่าไปบุก หายจากเลนตัวเอง", !p.lanes.MID.blue.includes("MID"),
    "เลนมิดเหลือ [" + p.lanes.MID.blue + "]");
}
{
  const p = plan(INV, INV);
  t("บุกสวนกัน — ไม่มีไฟต์ ถือว่าแลกกัน", !p.lanes.JUNGLE, p.lanes.JUNGLE ? "มีไฟต์" : "ไม่มีไฟต์");
  t("บุกสวนกัน — เสียแคมป์ทั้งสองฝั่ง", p.raidedFoe && p.raidedMe,
    "ศัตรู " + p.raidedFoe + " · เรา " + p.raidedMe);
}
{
  const p = plan(INV, GANK);
  t("บุกตอนศัตรูออกไปแกงค์ — กวาดแคมป์เขาได้ฝ่ายเดียว",
    p.raidedFoe && !p.raidedMe, "ศัตรู " + p.raidedFoe + " · เรา " + p.raidedMe);
}
{
  const raided = plan(FARM, FARM, { raidedLast: true }).income.JUNGLE;
  t("ยกหลังโดนกวาดแคมป์ ฟาร์มได้แค่พื้น ไม่มีรายได้ป่า",
    raided.gold === LANE_FLOOR.gold && raided.xp === LANE_FLOOR.xp,
    raided.gold + "g/" + raided.xp + "xp");
}
{
  const p = plan(INV, FARM);
  t("คนที่ออกไปบุก ทิ้งแคมป์ตัวเอง เหลือแค่พื้น",
    p.income.JUNGLE.gold === LANE_FLOOR.gold,
    p.income.JUNGLE.gold + "g/" + p.income.JUNGLE.xp + "xp");
}

// ---- ฝั่งศัตรูคิดด้วยกติกาชุดเดียวกัน
{
  const p = plan(FARM, INV);
  p.foeJungleLane = INVADE;
  const f = foeIncome(p);
  t("ศัตรูที่ออกไปบุก ก็เหลือแค่พื้นเหมือนกัน", f.JUNGLE.gold === LANE_FLOOR.gold,
    f.JUNGLE.gold + "g/" + f.JUNGLE.xp + "xp");
  const p2 = plan(FARM, FARM, { foeRaidedLast: true });
  p2.foeJungleLane = null;
  const f2 = foeIncome(p2);
  t("ศัตรูที่โดนกวาดแคมป์ ยกหน้าฟาร์มก็ได้แค่พื้น", f2.JUNGLE.gold === LANE_FLOOR.gold,
    f2.JUNGLE.gold + "g/" + f2.JUNGLE.xp + "xp");
}

let bad = 0;
for (const [n, ok, d] of out) {
  if (!ok) bad++;
  console.log((ok ? " ok  " : " FAIL") + " " + n.padEnd(52) + " " + d);
}
console.log("\nไม่ผ่าน " + bad + " / " + out.length);
if (bad) process.exit(1);
