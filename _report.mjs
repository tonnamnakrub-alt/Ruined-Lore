import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { ITEMS, ITEM_BY_ID, UNIQ_GROUPS } from "./src/data/items.js";
import { setLang } from "./src/i18n.js";
import { itemDesc } from "./src/ui/item-desc.js";
setLang("th");

// แยกข้อความของ itemDesc เป็น "ค่าสถานะ" กับ "ความสามารถ"
const STATLIKE = /^[+\-0-9]|^เจาะ|^ดาเมจคริ|^เลือด 80|^ลดคูลดาวน์ท่าไม้ตาย|^ฮีล\/เกราะ|^ลดดาเมจออโต้ที่โดน|^ลดเวลาติดล็อก|^ออโต้เพิ่ม|^ทีมได้|^ไม่ออกห่าง|^ไม่ไล่ตัว|^พลังฮีล|^ฮีล\/โล่/;
function split(it) {
  const parts = itemDesc(it).split(" · ");
  const stats = parts.filter((x) => STATLIKE.test(x));
  const skill = parts.filter((x) => !STATLIKE.test(x));
  return { stats: stats.join(" · ") || "—", skill: skill.join(" · ") || "—" };
}

const PRICE = {
  ad: 0.70, ap: 0.40, hp: 0.0533, armor: 0.40, mr: 0.40,
  asPct: 50, ah: 1.00, crit: 80, ms: 0.24, msPct: 150,
  pen: 1.00, critDmg: 60, omnivampFlat: 150, healAmp: 62.5, hors: 83,
  apPct: 90, adPct: 90, armorPenPct: 60, mrPenPct: 60,
  ultCdr: 55, tenacity: 40, dmgReduceAuto: 120, regenPct: 6,
  dmgAmpHighHp: 150, onHitAdaptive: 900, itemHaste: 0.20, range: 0.05,
};
const CODED = new Set("nlm pmh msq mgc aoi hga cij sab gbs mot biv soo cbc bdc cbg pnb hwh cco goh dss swf slh ulf ivd sst hth boe ats acb sfv esb abw hmb pib gwc ood act chr sg at toh cp kff csb stc yfs zgc nvs rsd hnd mrt ntw jbg ang".split(" "));
const val = (it) => Object.keys(PRICE).reduce((a, k) => a + (it[k] ? it[k] * PRICE[k] : 0), 0);
const passive = (it) => CODED.has(it.id) || it.antihealOnDmg != null || it.chainHors != null ||
  it.horsBuffAs != null || it.horsBuffAp != null || it.tier3ScalingHors != null;

const wr = JSON.parse(process.argv[2] || "{}");
const rows = ITEMS.filter((i) => i.tier === 3).map((it) => ({
  id: it.id, cat: it.cat, cost: it.cost, eff: val(it) / it.cost,
  passive: passive(it), wr: wr[it.id],
  name: String(it.th).split("—")[0].trim(),
  uniq: it.uniq || [],
  ...split(it),
}));

let md = "# บาลานซ์ไอเทม — ใบสรุปไว้จูนเอง\n\n";
md += "สร้างจาก `_balance.mjs` (ตีราคาค่าสถานะ) + `_power.mjs` (% ชนะจริง) รันใหม่ได้ทุกเมื่อ\n\n";
md += "- **คุ้ม%** = มูลค่าค่าสถานะ ÷ ราคาขาย · เกณฑ์: มีพาสซีฟ ~95-100% · ค่าสถานะล้วน ~105-110%\n";
md += "- **ชนะ%** = แจกไอเทมให้ทีมน้ำเงินทั้ง 5 คน แล้วนับ % ชนะทีมแดงที่ซื้อของเท่ากัน (50% = ไม่มีผล)\n";
md += "- **ชนะ% เทียบข้ามสายไม่ได้** — ของ AP ที่แจกให้ตัว AD ด้วยจะดูอ่อนเกินจริง ใช้เทียบภายในสายเดียว\n";
md += "- ตัวเลขทั้งคู่มีความคลาดเคลื่อน ต้องต่างกันเยอะจริงถึงจะเชื่อได้\n\n";

const mark = (r) => {
  const target = r.passive ? 0.98 : 1.08;
  const d = r.eff - target;
  if (d > 0.15) return "🔴 สเตตัสเกิน";
  if (d < -0.15) return "🔵 สเตตัสน้อย";
  return "";
};
// รายการที่ควรจับตา = ตัวเลขทั้งสองตัวชี้ไปทางเดียวกัน ภายในสายเดียวกัน
md += "\n## สรุป — ตัวที่ควรจับตาก่อน\n\n";
md += "เอาเฉพาะตัวที่ **ทั้งสองมาตรวัดชี้ไปทางเดียวกัน** เทียบกับเพื่อนร่วมสายของมันเอง\n\n";
const flag = [];
for (const cat of ["TANK", "FIGHTER", "ASSASSIN", "MAGE", "MARKSMAN", "SUPPORT"]) {
  const t = rows.filter((r) => r.cat === cat && r.wr != null);
  if (t.length < 4) continue;
  const mEff = t.reduce((a, r) => a + r.eff, 0) / t.length;
  const mWr = t.reduce((a, r) => a + r.wr, 0) / t.length;
  for (const r of t) {
    const de = r.eff - mEff, dw = r.wr - mWr;
    if (de > 0.05 && dw > 0.10) flag.push({ r, dir: "แรงไป", de, dw });
    if (de < -0.05 && dw < -0.10) flag.push({ r, dir: "อ่อนไป", de, dw });
  }
}
flag.sort((a, b) => (a.dir === b.dir ? b.dw - a.dw : a.dir < b.dir ? 1 : -1));
for (const f of flag) {
  md += "\n### " + (f.dir === "แรงไป" ? "🔴 " : "🔵 ") + f.r.name + " `" + f.r.id + "` — " + f.r.cat + " " + f.r.cost + "g\n\n";
  md += "- **ค่าสถานะ** " + f.r.stats + "\n";
  md += "- **ความสามารถ** " + f.r.skill + "\n";
  md += "- **คุ้ม%** " + (f.r.eff * 100).toFixed(0) + "% (" + (f.de > 0 ? "+" : "") + (f.de * 100).toFixed(0) +
    " เทียบเพื่อนร่วมสาย) · **ชนะ%** " + (f.r.wr * 100).toFixed(0) + "% (" + (f.dw > 0 ? "+" : "") +
    (f.dw * 100).toFixed(0) + ")\n";
  if (f.r.uniq.length) md += "- **ห้ามซ้ำกับ** " + f.r.uniq.map((g) => UNIQ_GROUPS[g].th).join(", ") + "\n";
}
if (!flag.length) md += "\nไม่มีตัวไหนที่ทั้งสองมาตรวัดเห็นตรงกัน\n";
md += "\nของที่ **คุ้ม% ต่ำแต่ชนะ% สูง** ไม่ใช่ของอ่อน แต่แปลว่าพลังอยู่ที่พาสซีฟ ไม่ได้อยู่ที่ค่าสถานะ (เช่น Shroud of Osiris)\n";

for (const cat of ["TANK", "FIGHTER", "ASSASSIN", "MAGE", "MARKSMAN", "SUPPORT"]) {
  const t = rows.filter((r) => r.cat === cat).sort((a, b) => b.eff - a.eff);
  md += "\n## " + cat + "\n\n";
  md += "| ไอเทม | ราคา | ค่าสถานะ | ความสามารถ | คุ้ม% | ชนะ% | ห้ามซ้ำกับ | |\n|---|---|---|---|---|---|---|---|\n";
  for (const r of t) {
    md += "| **" + r.name + "** `" + r.id + "` | " + r.cost + "g | " + r.stats + " | " + r.skill + " | " +
      (r.eff * 100).toFixed(0) + "% | " + (r.wr != null ? (r.wr * 100).toFixed(0) + "%" : "—") + " | " +
      (r.uniq.length ? r.uniq.map((g) => UNIQ_GROUPS[g].th).join(", ") : "—") + " | " + mark(r) + " |\n";
  }
}
md += "\n## กลุ่มห้ามออกซ้ำ\n";
for (const g in UNIQ_GROUPS) {
  const list = ITEMS.filter((i) => i.uniq && i.uniq.includes(g));
  md += "\n### `" + g + "` — " + UNIQ_GROUPS[g].th + "\n\n";
  md += "| ไอเทม | สาย | ราคา | ค่าสถานะ | ความสามารถ |\n|---|---|---|---|---|\n";
  for (const i of list) {
    const d = split(i);
    md += "| **" + String(i.th).split("—")[0].trim() + "** `" + i.id + "` | " +
      (i.tier === 3 ? i.cat : "Tier " + i.tier) + " | " + i.cost + "g | " + d.stats + " | " + d.skill + " |\n";
  }
}
md += "\nเพิ่มกลุ่มใหม่: ใส่ `uniq: [\"ชื่อกลุ่ม\"]` ที่ตัวไอเทมใน `data/items.js` แล้วเติมกลุ่มลง `UNIQ_GROUPS`\n";
md += "ชิ้นเดียวอยู่ได้หลายกลุ่ม · ชิ้นส่วนที่ถูกกลืนเข้าสูตรไม่นับว่าชน\n";
writeFileSync("docs/balance.md", md);
console.log(md);
