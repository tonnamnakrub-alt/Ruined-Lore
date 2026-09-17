import { ITEM_BY_ID, ITEMS, UNIQ_GROUPS, applyBuy, buyBlockedReason, uniqClash } from "./src/data/items.js";
import { setLang, tr } from "./src/i18n.js";

console.log("=== กลุ่มที่ตั้งไว้ ===");
for (const g in UNIQ_GROUPS) {
  const list = ITEMS.filter((i) => i.uniq && i.uniq.includes(g));
  console.log("  " + g.padEnd(12) + UNIQ_GROUPS[g].th.padEnd(26) + list.map((i) => i.id).join(", "));
}

const base = { lane: "TOP", gold: 99999, items: [], style: "balanced" };
const buy = (c, id) => applyBuy(c, ITEM_BY_ID[id]);

console.log("\n=== ทดสอบการบล็อก ===");
const cases = [
  ["ivd", "sst", "ออโต้ครั้งที่ 3 สองชิ้น"],
  ["bdc", "boe", "ออโต้ถัดไปแรงขึ้น สองชิ้น"],
  ["swf", "soo", "ปุ่มกันตาย สองชิ้น"],
  ["pib", "esb", "อุ้มทีม สองชิ้น"],
  ["cij", "pnb", "สะสมชั้น สองชิ้น"],
  ["cbc", "nvs", "ตัดฮีล สองชิ้น"],
  ["acb", "sfv", "ฮีลแล้วบัฟ สองชิ้น"],
  ["dss", "hmb", "ล้าง CC สองชิ้น"],
];
for (const [a, b, label] of cases) {
  let c = buy(base, a);
  const reason = buyBlockedReason(c, ITEM_BY_ID[b]);
  console.log("  " + (reason ? "บล็อก " : "*** ผ่าน ***  ") + (a + " + " + b).padEnd(12) + label.padEnd(30) + (reason || ""));
}

console.log("\n=== ต้องไม่บล็อก ===");
// อัพชิ้นส่วนตัดฮีลเป็นของใหญ่ในกลุ่มเดียวกัน — ชิ้นส่วนโดนกลืน ไม่ใช่การถือซ้อน
for (const [part, full] of [["exn", "cbc"], ["exn", "adm"], ["exn", "sst"], ["wbp", "nvs"], ["bbt", "pmh"]]) {
  const c = buy(base, part);
  const r = buyBlockedReason(c, ITEM_BY_ID[full]);
  console.log("  " + (r ? "*** บล็อกผิด *** " : "ผ่าน ") + (part + " -> " + full).padEnd(14) + (r || ""));
}
// คนละกลุ่มต้องซื้อด้วยกันได้
for (const [a, b] of [["ivd", "swf"], ["cbc", "pib"], ["hth", "ivd"], ["nlm", "cij"]]) {
  const c = buy(base, a);
  const r = buyBlockedReason(c, ITEM_BY_ID[b]);
  console.log("  " + (r ? "*** บล็อกผิด *** " : "ผ่าน ") + (a + " + " + b).padEnd(14) + (r || ""));
}
setLang("en");
console.log("\nEN:", buyBlockedReason(buy(base, "ivd"), ITEM_BY_ID.sst));

// บอทต้องไม่ซื้อของที่ชนกันเองด้วย
import { shopFor } from "./src/game/shop-ai.js";
import { makeRoster } from "./src/game/roster.js";
import { mulberry32 } from "./src/engine/util.js";
let clashes = 0, builds = 0;
for (let s = 0; s < 60; s++) {
  const roster = makeRoster(mulberry32(300 + s)).map((c) => ({ ...c, level: 14, gold: 260 }));
  for (const c of roster) {
    const out = shopFor(c, roster, mulberry32(9 + s));
    builds++;
    const seen = {};
    for (const it of out.items) for (const g of it.uniq || []) {
      if (seen[g]) { clashes++; console.log("  CLASH", c.lane, seen[g], "+", it.id, "(" + g + ")"); }
      seen[g] = it.id;
    }
  }
}
console.log("\nบิลด์บอท " + builds + " ชุด — ของชนกัน " + clashes + " ครั้ง");
