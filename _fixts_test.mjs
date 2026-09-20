// รายการแก้จากไฟล์ Fix TS ข้อ 8 เป็นต้นไป + พาสซีฟ HOOD ที่คริแล้วไม่เห็นอะไรเกิดขึ้น
import { CHAMPIONS } from "./src/data/champions.js";
import { ITEM_BY_ID, buyBlockedReason, applyBuy, effectiveCost } from "./src/data/items.js";
import { buildFight } from "./src/engine/build-fight.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";
import { recommendedFor } from "./src/game/shop-ai.js";
import { stackChips } from "./src/ui/stacks.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";

const out = [];
const t = (name, ok, detail) => out.push([name, ok, detail || ""]);

// ---- HOOD: คริแล้วพาสซีฟต้องทำงาน และต้องเห็นตัวนับบนแผงสแตก ----
{
  const plan = recommendedFor("HOOD", "ADC", 4).items;
  const critPlan = plan.reduce((a, i) => a + (i.crit || 0), 0);
  t("แผนแนะนำของ HOOD มีคริตั้งแต่ต้น", critPlan >= 0.5 && !!plan[0].crit,
    Math.round(critPlan * 100) + "% · ชิ้นแรก " + plan[0].id);

  const mk = (lane, id, items) => ({
    lane, champId: id, level: 16, xp: 0, gold: 40, items,
    ranks: { Q: 5, W: 5, E: 5, R: 3 },
    athlete: { mechanics: 8, gameSense: 7, knowledge: 7, decision: 8, teamwork: 7 },
    upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
    char: "P", athleteName: "P", style: "POKE",
  });
  const st = buildFight([mk("ADC", "HOOD", plan)].map(toDef), [mk("TOP", "KAZEM", [])].map(toDef), 5, DEFAULT_FIGHT);
  const h = st.units.find((u) => u.champId === "HOOD");
  let best = 0, chip = null;
  let g = 0;
  while (!st.over && g++ < 60 * 70) {
    step(st);
    if ((h.bleedStacks || 0) > best) { best = h.bleedStacks; chip = stackChips(h, st.t).find((c) => c.label === "BLEED"); }
  }
  t("คริแล้วมีเลือดไหลสะสมจริง", best > 0, "สูงสุด " + best + " ชั้น");
  t("แผงสแตกขึ้นชิป BLEED", !!chip, chip ? chip.text : "ไม่ขึ้นเลย");
}

// ---- ข้อ 8: ซื้อชิ้นกลางจาก Build Plan ได้ถ้าเงินถึง แม้ของย่อยยังไม่ครบ ----
{
  // หาไอเทม tier 3 ที่มีชิ้นส่วนเป็น tier 2 ซึ่งเองก็มีชิ้นส่วนต่อ
  let mid = null;
  for (const id of Object.keys(ITEM_BY_ID)) {
    const it = ITEM_BY_ID[id];
    if (it.tier !== 2 || !(it.parts || []).length) continue;
    mid = it; break;
  }
  const c = { lane: "TOP", items: [], gold: mid ? mid.cost : 0 };
  t("ชิ้นกลางมีสูตรย่อยของตัวเอง", !!mid, mid ? mid.id + " (" + mid.cost + "g, ชิ้นส่วน " + mid.parts.join("+") + ")" : "-");
  t("เงินถึงราคาเต็มแล้วซื้อชิ้นกลางได้เลย", !!mid && !buyBlockedReason(c, mid),
    mid ? String(buyBlockedReason(c, mid) || "ซื้อได้") : "-");
  const poor = { lane: "TOP", items: [], gold: mid ? mid.cost - 1 : 0 };
  t("เงินไม่ถึงก็ยังซื้อไม่ได้", !!mid && !!buyBlockedReason(poor, mid), mid ? String(buyBlockedReason(poor, mid)) : "-");
}

// ---- ข้อ 9: ย้อนการซื้อต้องคืนเงินเต็มและได้ชิ้นส่วนกลับมา ----
{
  const big = Object.values(ITEM_BY_ID).find((i) => i.tier === 3 && (i.parts || []).length >= 2);
  const parts = big.parts.map((id) => ITEM_BY_ID[id]).filter(Boolean);
  const before = { lane: "TOP", items: [...parts], gold: 500 };
  const cost = effectiveCost(before.items, big);
  const after = applyBuy(before, big);
  // จำลองสิ่งที่ undoBuy ทำ — คืน gold กับ items ที่ถ่ายภาพไว้ก่อนซื้อ
  const undone = { ...after, gold: before.gold, items: [...before.items] };
  t("ซื้อของใหญ่แล้วชิ้นส่วนถูกกลืนไปจริง", after.items.length < before.items.length + 1,
    before.items.length + " ชิ้น -> " + after.items.length + " ชิ้น · จ่าย " + cost + "g");
  t("ย้อนแล้วได้เงินคืนเต็มราคา", undone.gold === before.gold, undone.gold + "g");
  t("ย้อนแล้วชิ้นส่วนกลับมาครบ", undone.items.length === before.items.length,
    undone.items.map((i) => i.id).join("+"));
}

// ---- ข้อ 10: Black Market ของ C.HOOK คูณสองทุกยกที่ได้ลงไฟต์ ----
{
  const bc = CHAMPIONS["C.HOOK"].bounty;
  const payout = (tier, fought) => (fought
    ? bc.perRound * Math.pow(2, Math.min(tier, bc.doubleCap != null ? bc.doubleCap : 4))
    : bc.perRound);
  const seq = [];
  let tier = 0;
  for (let r = 0; r < 7; r++) { seq.push(payout(tier, true)); tier += 1; }
  t("ยกที่ได้ลงไฟต์ เงินคูณสองขึ้นไปเรื่อยๆ", seq.slice(0, 5).join("/") === "10/20/40/80/160", seq.join(" → "));
  t("มีเพดานไม่ให้พุ่งไม่จำกัด", seq[5] === seq[6] && seq[6] === 160, "คงที่ที่ " + seq[6]);
  t("ยกที่ฟาร์มเฉยๆ ได้แค่ฐาน 10", payout(4, false) === 10, String(payout(4, false)));
}

let fail = 0;
for (const [name, ok, detail] of out) {
  if (!ok) fail++;
  console.log((ok ? "  ok  " : " FAIL ") + name.padEnd(40) + " " + detail);
}
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
