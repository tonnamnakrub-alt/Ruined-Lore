import { ITEMS, ITEM_BY_ID } from "./src/data/items.js";

// ราคาต่อหน่วยของแต่ละค่าสถานะ อ้างอิงจากชิ้นส่วน Tier 1 ที่ให้ค่านั้นล้วนๆ
// (bt2 7g/10 AD, wt 6g/15 AP, nd 8g/150 HP, bc 6g/15 armor, ...)
const PRICE = {
  ad: 0.70, ap: 0.40, hp: 0.0533, armor: 0.40, mr: 0.40,
  asPct: 50, ah: 1.00, crit: 80, ms: 0.24, msPct: 150,
  pen: 1.00, critDmg: 60, omnivampFlat: 150, healAmp: 62.5, hors: 83,
  // ค่าที่ไม่มีชิ้นส่วน Tier 1 ให้เทียบ ตีราคาจากของที่มีอยู่
  apPct: 90, adPct: 90, armorPenPct: 90, mrPenPct: 90,
  ultCdr: 55, tenacity: 40, dmgReduceAuto: 120, regenPct: 6,
  dmgAmpHighHp: 150, onHitAdaptive: 900, itemHaste: 0.20, range: 0.05,
  goldPerRound: 2,
};
const PASSIVE_KEYS = [
  "antihealOnDmg", "chainHors", "horsBuffAs", "horsBuffAp", "tier3ScalingHors",
  "auraArmor", "auraAdPct", "leashCap", "noChaseLowHp", "dmgPct", "armorPct",
];
// ของที่มีพาสซีฟเขียนมือใน engine (ไม่ได้อยู่ในฟิลด์) — เทียบสเตตัสล้วนไม่ได้
const CODED_PASSIVE = new Set([
  "nlm","pmh","msq","mgc","aoi","hga","cij","sab","gbs","mot",
  "biv","soo","cbc","bdc","cbg","pnb","hwh","cco","goh","dss",
  "swf","slh","ulf","ivd","boe","sst","hth","asq","asc",
  "ats","acb","sfv","yrh","esb","abw","hmb","pib","gwc","ood",
  "act","chr","sg","at","toh","cp","cb","cs","csh","cbw","cd",
]);

function statValue(it) {
  let v = 0;
  for (const k in PRICE) if (it[k]) v += it[k] * PRICE[k];
  return v;
}
function hasPassive(it) {
  return CODED_PASSIVE.has(it.id) || PASSIVE_KEYS.some((k) => it[k] != null);
}

const rows = [];
for (const it of ITEMS) {
  const v = statValue(it);
  rows.push({
    id: it.id, cat: it.cat, tier: it.tier, cost: it.cost,
    value: v, eff: v / it.cost, passive: hasPassive(it),
    name: it.th.split("—")[0].trim(),
  });
}
const show = (title, list) => {
  console.log("\n" + title);
  for (const r of list) {
    console.log(
      "  " + String(r.tier) + " " + r.cat.padEnd(9) + r.id.padEnd(5) +
      String(r.cost).padStart(3) + "g  ค่าสถานะ " + r.value.toFixed(0).padStart(3) + "g  " +
      (r.eff * 100).toFixed(0).padStart(4) + "%" + (r.passive ? "  +พาสซีฟ" : "") +
      "   " + r.name
    );
  }
};
// ของ Tier 3 ที่ไม่มีพาสซีฟเลย ต้องคุ้มกว่าของที่มีพาสซีฟ ไม่งั้นไม่มีเหตุผลให้ซื้อ
console.log("=== Tier 3 ที่เป็นค่าสถานะล้วน ไม่มีพาสซีฟ ===");
for (const r of rows.filter((r) => r.tier === 3 && !r.passive).sort((a, b) => a.eff - b.eff)) {
  console.log("  " + r.cat.padEnd(9) + r.id.padEnd(5) + String(r.cost).padStart(3) + "g  " +
    (r.eff * 100).toFixed(0).padStart(4) + "%   " + r.name);
}
for (const tier of []) {
  const t = rows.filter((r) => r.tier === tier && r.cat !== "START");
  const avg = t.reduce((a, r) => a + r.eff, 0) / t.length;
  console.log("\n=== Tier " + tier + " — ความคุ้มเฉลี่ย " + (avg * 100).toFixed(0) + "% (" + t.length + " ชิ้น) ===");
  t.sort((a, b) => b.eff - a.eff);
  show("โกงสุด 6 อันดับ", t.slice(0, 6));
  show("อ่อนสุด 6 อันดับ", t.slice(-6).reverse());
}
// สรุปรายสาย
console.log("\n=== ความคุ้มเฉลี่ยรายสาย (Tier 3) ===");
for (const cat of ["TANK", "FIGHTER", "ASSASSIN", "MAGE", "MARKSMAN", "SUPPORT"]) {
  const t = rows.filter((r) => r.tier === 3 && r.cat === cat);
  const avg = t.reduce((a, r) => a + r.eff, 0) / t.length;
  const cost = t.reduce((a, r) => a + r.cost, 0) / t.length;
  console.log("  " + cat.padEnd(9), (avg * 100).toFixed(0).padStart(4) + "%", "| ราคาเฉลี่ย", cost.toFixed(0) + "g");
}
