// ---------------------------------------------------------------
// สร้าง ITEMS.md จากข้อมูลจริงใน src/data/items.js
//
//   node _itemdoc.mjs
//
// คอลัมน์ "ความคุ้ม" ตีราคาค่าสถานะที่ได้เทียบกับราคาที่จ่าย 100% = คุ้มพอดี
// ใช้ตารางราคาชุดเดียวกับ _balance.mjs — ของที่มีพาสซีฟเขียนมือในเอนจิน
// จะตีราคาไม่ได้ เพราะค่าสถานะล้วนไม่ได้สะท้อนพลังจริง จึงเว้นไว้
// ---------------------------------------------------------------
import fs from "fs";
import { setLang, tr } from "./src/i18n.js";
import { CATEGORIES, ITEMS, ITEM_BY_ID, itemCats } from "./src/data/items.js";
import { itemDesc } from "./src/ui/item-desc.js";

setLang("th");

const esc = (s) => String(s || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const nameOf = (it) => String(it.th || it.id).split("—")[0].trim();
const thaiOf = (it) => {
  const parts = String(it.th || "").split("—");
  return parts.length > 1 ? parts[1].trim() : "";
};

// ---------------------------------------------------------------
// ราคาต่อหน่วยของแต่ละค่าสถานะ — ชุดเดียวกับ _balance.mjs
// อ้างอิงจากชิ้นส่วน Tier 1 ที่ให้ค่านั้นล้วนๆ
// ---------------------------------------------------------------
const PRICE = {
  ad: 0.70, ap: 0.40, hp: 0.0533, armor: 0.40, mr: 0.40,
  asPct: 50, ah: 1.00, crit: 80, ms: 0.24, msPct: 150,
  pen: 1.00, critDmg: 60, omnivampFlat: 150, healAmp: 62.5, hors: 83,
  apPct: 90, adPct: 90, armorPenPct: 90, mrPenPct: 90,
  ultCdr: 55, tenacity: 40, dmgReduceAuto: 120, regenPct: 6,
  dmgAmpHighHp: 150, onHitAdaptive: 900, itemHaste: 0.20, range: 0.05,
  goldPerRound: 2,
};
// ของที่พลังจริงอยู่ในพาสซีฟที่เขียนมือ ตีราคาจากค่าสถานะล้วนไม่ได้
const CODED = new Set([
  "nlm", "pmh", "msq", "mgc", "aoi", "hga", "cij", "sab", "gbs", "mot",
  "biv", "soo", "cbc", "bdc", "cbg", "pnb", "hwh", "cco", "goh", "dss",
  "swf", "slh", "ulf", "ivd", "boe", "sst", "hth", "asq", "asc",
  "ats", "acb", "sfv", "yrh", "esb", "abw", "hmb", "pib", "gwc", "ood",
  "act", "chr", "sg", "at", "toh", "cp", "cb", "cs", "csh", "cbw", "cd",
]);
// ฟิลด์ที่ให้พลังจริงแต่ไม่มีราคาในตาราง — ของที่มีฟิลด์พวกนี้ ความคุ้มจะต่ำกว่าความจริง
const UNPRICED = [
  "apOnHit", "spellblade", "burnPctHp", "curHpOnHit", "magicPulse", "chainBolt",
  "executeHit", "giantSlayer", "shieldBreak", "deathMark", "lifeBondShare",
  "takedownHeal", "adPerKill", "firstHitShield", "maulBurst", "mrShredStack",
  "antihealOnDmg", "spellSlow", "storedBurst", "ultZone", "meteor", "cdReset",
];

const value = (it) => {
  let v = 0;
  for (const k in PRICE) if (it[k]) v += it[k] * PRICE[k];
  return v;
};
const worth = (it) => (it.cost > 0 ? Math.round((100 * value(it)) / it.cost) : null);
const unpricedOf = (it) => UNPRICED.filter((k) => it[k] != null);

const recipe = (it) => (it.parts || []).map((p) => {
  const q = ITEM_BY_ID[p];
  return q ? nameOf(q) + ` (${q.cost}g)` : p;
}).join(" + ");

// ---------------------------------------------------------------
// ประกอบไฟล์
// ---------------------------------------------------------------
const doc = [];
doc.push("# ไอเทมทั้งหมด");
doc.push("");
doc.push(`**${ITEMS.length} ชิ้น** · Tier 3 มี ${ITEMS.filter((i) => i.tier === 3).length} ชิ้น`);
doc.push("");
doc.push("> ไฟล์นี้สร้างอัตโนมัติจาก `src/data/items.js` ด้วยคำสั่ง `node _itemdoc.mjs`  ");
doc.push("> คำอธิบายใช้ชุดเดียวกับที่โชว์ในร้านค้าในเกม ตัวเลขจึงตรงกับที่เอนจินใช้จริงเสมอ");
doc.push("");

doc.push("## วิธีอ่าน");
doc.push("");
doc.push("- **ความคุ้ม** = มูลค่าค่าสถานะที่ได้ หารด้วยราคาที่จ่าย · **100% คือคุ้มพอดี**");
doc.push("  ราคาต่อหน่วยอ้างอิงจากชิ้นส่วน Tier 1 ที่ให้ค่านั้นล้วนๆ (เช่น 7g ต่อ 10 AD)");
doc.push("- ของที่ขึ้น **`พาสซีฟเขียนมือ`** ตีราคาแบบนี้ไม่ได้ เพราะพลังจริงไม่ได้อยู่ในค่าสถานะ — ช่องความคุ้มจะเว้นไว้");
doc.push("- ของที่ขึ้น **⚠️ ไม่ได้ตีราคา** คือมีฟิลด์ที่ให้พลังจริงแต่ตารางราคาไม่รู้จัก");
doc.push("  **ความคุ้มของพวกนี้ต่ำกว่าความจริง** อย่าเอาไปตัดสินว่าของอ่อน");
doc.push("");
doc.push("เทียบความคุ้มด้วย `node _balance.mjs` · วัดพลังจริงในสนามด้วย `node _itemwr.mjs`");
doc.push("");

// ---- สรุปความคุ้มรายสาย ----
doc.push("## ความคุ้มเฉลี่ยรายสาย (Tier 3)");
doc.push("");
doc.push("| สาย | ความคุ้มเฉลี่ย | จำนวนชิ้น | ราคาเฉลี่ย |");
doc.push("|---|---:|---:|---:|");
for (const cat of ["TANK", "FIGHTER", "ASSASSIN", "MAGE", "MARKSMAN", "SUPPORT"]) {
  const list = ITEMS.filter((i) => i.tier === 3 && i.cat === cat && !CODED.has(i.id));
  if (!list.length) continue;
  const avg = list.reduce((a, i) => a + worth(i), 0) / list.length;
  const cost = list.reduce((a, i) => a + i.cost, 0) / list.length;
  doc.push(`| ${cat} | ${avg.toFixed(0)}% | ${list.length} | ${cost.toFixed(0)}g |`);
}
doc.push("");

// ---- ของที่ตีราคาไม่ครบ ----
const gaps = ITEMS.filter((i) => i.tier === 3 && unpricedOf(i).length);
if (gaps.length) {
  doc.push("## ⚠️ ของที่ตารางราคาอ่านไม่ครบ");
  doc.push("");
  doc.push("ของพวกนี้มีฟิลด์ที่ให้พลังจริงแต่ไม่มีราคาในตาราง **ความคุ้มที่โชว์จึงต่ำกว่าความจริง**");
  doc.push("ถ้าจะปรับบาลานซ์ด้วยตัวเลขความคุ้ม ต้องระวังของกลุ่มนี้เป็นพิเศษ");
  doc.push("");
  doc.push("| ไอเทม | สาย | ราคา | ความคุ้มที่โชว์ | ฟิลด์ที่ไม่ได้ตีราคา |");
  doc.push("|---|---|---:|---:|---|");
  for (const it of gaps.sort((a, b) => (worth(a) || 0) - (worth(b) || 0))) {
    doc.push(`| ${esc(nameOf(it))} \`${it.id}\` | ${it.cat} | ${it.cost}g | ${CODED.has(it.id) ? "—" : worth(it) + "%"} | ${unpricedOf(it).map((k) => "`" + k + "`").join(" ")} |`);
  }
  doc.push("");
}

// ---- อันดับความคุ้ม ----
const priced = ITEMS.filter((i) => i.tier === 3 && !CODED.has(i.id)).sort((a, b) => worth(b) - worth(a));
doc.push("## Tier 3 เรียงตามความคุ้ม");
doc.push("");
doc.push("| # | ไอเทม | สาย | ราคา | ความคุ้ม | ค่าสถานะ |");
doc.push("|---:|---|---|---:|---:|---|");
priced.forEach((it, i) => {
  const flag = unpricedOf(it).length ? " ⚠️" : "";
  doc.push(`| ${i + 1} | ${esc(nameOf(it))} \`${it.id}\` | ${itemCats(it).join("/")} | ${it.cost}g | **${worth(it)}%**${flag} | ${esc(itemDesc(it))} |`);
});
doc.push("");

// ---- รายชิ้นแยกตามหมวด ----
doc.push("## รายชิ้นแยกตามหมวด");
doc.push("");
for (const cat of CATEGORIES) {
  const list = ITEMS.filter((i) => (cat.id === "T1" || cat.id === "T2" || cat.id === "START" || cat.id === "BOOTS")
    ? i.cat === cat.id : (i.tier === 3 && i.cat === cat.id));
  if (!list.length) continue;
  doc.push(`### ${esc(tr(cat.th))} (${cat.id}) — ${list.length} ชิ้น`);
  doc.push("");
  doc.push("| ไอเทม | ราคา | ความคุ้ม | ค่าสถานะและพาสซีฟ | สร้างจาก |");
  doc.push("|---|---:|---:|---|---|");
  for (const it of list) {
    const w = CODED.has(it.id) ? "`พาสซีฟเขียนมือ`" : worth(it) + "%" + (unpricedOf(it).length ? " ⚠️" : "");
    const th = thaiOf(it);
    doc.push(`| **${esc(nameOf(it))}** \`${it.id}\`${th ? "<br>" + esc(th) : ""} | ${it.cost}g | ${w} | ${esc(itemDesc(it))} | ${esc(recipe(it)) || "—"} |`);
  }
  doc.push("");
}

fs.writeFileSync("ITEMS.md", doc.join("\n").replace(/\n{3,}/g, "\n\n") + "\n");
console.log(`เขียน ITEMS.md แล้ว — ${ITEMS.length} ชิ้น · Tier 3 ${ITEMS.filter((i) => i.tier === 3).length} ชิ้น · ` +
  `ของที่ตีราคาไม่ครบ ${gaps.length} ชิ้น`);
