// บอทซื้อรองเท้าบ่อยแค่ไหน — อีกครึ่งของคำถาม "รองเท้ามีผลแล้วหรือยัง"
// ถ้าของดีแต่ไม่มีใครซื้อ ก็เท่ากับไม่มีผลอยู่ดี
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { mulberry32 } from "./src/engine/util.js";
import { shopFor } from "./src/game/shop-ai.js";

const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));
const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
// shopFor คืน items เป็นออบเจกต์ไอเทมเต็มก้อน ไม่ใช่ id
// (รอบแรกเขียนเป็น ITEM_BY_ID[id] แล้วได้ 0% ทุกช่อง ซึ่งเป็นบั๊กของตัววัดเอง)
const isBoot = (it) => !!(it && (it.ms || it.msPct));

// เงินตามยกจริงในแมตช์ — ยกต้นๆ ซื้อได้ชิ้นเดียว ปลายเกมได้หลายชิ้น
const GOLDS = [60, 110, 170, 240, 320];

function measure(label) {
  const rows = [];
  for (const gold of GOLDS) {
    let withBoot = 0, n = 0, items = 0;
    for (let s = 0; s < 40; s++) {
      const roster = LANES.map((l, i) => ({
        lane: l, champId: Object.keys(CHAMPIONS)[(s * 5 + i) % 25], level: 13, xp: 0, gold,
        items: [], ranks: autoRanks(13, ["Q","W","E"], null), athlete: flat(5), upgrades: [],
        bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null, char: "P", athleteName: "P", style: "POKE",
      }));
      for (const c of roster) {
        const out = shopFor(c, roster, mulberry32(31 + s), 0);
        n++; items += out.items.length;
        if (out.items.some(isBoot)) withBoot++;
      }
    }
    rows.push([gold, (100 * withBoot) / n, items / n]);
  }
  console.log("=== " + label + " ===");
  console.log("  เงิน   ซื้อรองเท้า   ของเฉลี่ย");
  for (const [g, pct, it] of rows) {
    console.log("  " + String(g).padStart(4) + "g" + (pct.toFixed(1) + "%").padStart(12) + it.toFixed(2).padStart(12));
  }
  console.log();
  return rows.reduce((a, r) => a + r[1], 0) / rows.length;
}

const msNow = {};
for (const c of Object.values(CHAMPIONS)) msNow[c.id] = c.ms;
const now = measure("ตอนนี้ — ฐาน 325/330/335");
for (const c of Object.values(CHAMPIONS)) c.ms = msNow[c.id] + 20;
const before = measure("ถ้าฐานสูงกว่านี้ 20");
for (const c of Object.values(CHAMPIONS)) c.ms = msNow[c.id];

console.log("อัตราซื้อรองเท้าเฉลี่ย: ตอนนี้ " + now.toFixed(1) + "%  ·  ฐานสูงกว่า 20 " + before.toFixed(1) + "%  ·  ต่าง " + (now - before >= 0 ? "+" : "") + (now - before).toFixed(1));
