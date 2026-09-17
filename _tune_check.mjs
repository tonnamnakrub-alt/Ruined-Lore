import { ITEM_BY_ID, UNIQ_GROUPS, applyBuy, buyBlockedReason } from "./src/data/items.js";
import { buildFight } from "./src/engine/build-fight.js";
import { step } from "./src/engine/step.js";
import { makeRoster, toDef } from "./src/game/roster.js";
import { mulberry32 } from "./src/engine/util.js";
import { EVENTS } from "./src/data/tuning.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { buffSum } from "./src/engine/state-util.js";

console.log("=== กลุ่มห้ามซ้ำที่เหลือ ===", Object.keys(UNIQ_GROUPS).join(", "));
const base = { lane: "SUPPORT", gold: 99999, items: [], style: "balanced" };
const buy = (c, id) => applyBuy(c, ITEM_BY_ID[id]);
for (const [a, b] of [["pib", "esb"], ["acb", "sfv"], ["ivd", "sst"], ["swf", "soo"]]) {
  const r = buyBlockedReason(buy(base, a), ITEM_BY_ID[b]);
  console.log("  " + (a + " + " + b).padEnd(12) + (r ? "บล็อก — " + r : "ซื้อคู่กันได้"));
}

// Hephaestus เป็นของลูกผสม ต้องซื้อได้ทั้งตัว AD และตัว AP
const { champProfile } = await import("./src/game/shop-ai.js");
const { default: _ } = { default: null };
console.log("\n=== Hephaestus' Twin Hammers ลูกผสม AD+AP ===");
console.log("  stats:", JSON.stringify({ ad: ITEM_BY_ID.hth.ad, ap: ITEM_BY_ID.hth.ap, asPct: ITEM_BY_ID.hth.asPct, ah: ITEM_BY_ID.hth.ah }));
const { shopFor } = await import("./src/game/shop-ai.js");
for (const champId of ["C.HOOK", "ARIEL"]) {
  const c = { lane: champId === "ARIEL" ? "MID" : "ADC", champId, level: 14, gold: 99999, items: [], style: "balanced", ranks: autoRanks(14, ["Q","W","E"]) };
  const out = shopFor(c, [], mulberry32(3));
  console.log("  " + champId.padEnd(8), champProfile(champId).apChamp ? "AP" : "AD",
    "| ซื้อ hth ได้:", buyBlockedReason(c, ITEM_BY_ID.hth) ? "ไม่ได้ — " + buyBlockedReason(c, ITEM_BY_ID.hth) : "ได้");
}

// msq หลายชิ้นต้องไม่ทับกัน
const EV = EVENTS[Object.keys(EVENTS)[0]];
function msqTest(copies) {
  const mk = (blue) => makeRoster(mulberry32(500)).map((c) => {
    c.level = 14; c.gold = 99999; c.ranks = autoRanks(14, ["Q","W","E"]); c.style = "balanced";
    if (blue) for (let k = 0; k < copies; k++) { const n = applyBuy(c, ITEM_BY_ID.msq); if (n.items.length > c.items.length) c = n; }
    return toDef(c);
  });
  const st = buildFight(mk(true), mk(false), 9, EV);
  for (const u of st.units) { u.maxHp = 1e9; u.hp = 1e9; }
  let worst = 0;
  for (let n = 0; n < 60 * 20; n++) {
    step(st);
    for (const u of st.units) { u.hp = 1e9; u.alive = true; }
    for (const e of st.units) if (e.team === "red") worst = Math.min(worst, buffSum(e, "as"));
  }
  return worst;
}
console.log("\n=== Mirror of the Snow Queen ซ้อนกันไหม ===");
console.log("  ฝั่งน้ำเงินถือ 1 ชิ้น -> ศัตรูโดนลดความเร็วโจมตีสูงสุด", (msqTest(1) * 100).toFixed(0) + "%");
console.log("  (ถือได้ชิ้นเดียวต่อคน — ทั้งทีมถือคนละชิ้นก็ยังลดแค่ 25% เพราะใช้แท็กกลาง)");

// ตัวเลขที่แก้ต้องมาถึงในไฟต์จริง
console.log("\n=== Saraswati / Aceso พาสซีฟใหม่ที่เลเวล 14 ===");
function probeBuff(id, type) {
  const mk = (blue) => makeRoster(mulberry32(1235)).map((c) => {
    c.level = 14; c.gold = 99999; c.ranks = autoRanks(14, ["Q","W","E"]); c.style = "balanced";
    if (blue && c.lane === "SUPPORT") { c.champId = "PINO"; c = applyBuy(c, ITEM_BY_ID[id]); }
    return toDef(c);
  });
  const st = buildFight(mk(true), mk(false), 501, EV);
  let peak = 0;
  for (let n = 0; n < 60 * 40; n++) {
    step(st);
    for (const u of st.units) { u.alive = true; if (u.hp < u.maxHp * 0.35) u.hp = u.maxHp * 0.35; }
    for (const u of st.units) if (u.team === "blue") peak = Math.max(peak, buffSum(u, type));
  }
  return peak;
}
console.log("  sfv  AP buff", probeBuff("sfv", "apFlat").toFixed(0), "(คาด 27) · AH buff", probeBuff("sfv", "ahFlat").toFixed(0), "(คาด 15)");
console.log("  acb  on-hit เวท", probeBuff("acb", "onHitMagic").toFixed(0), "(คาด 52 + 10% AP)");
