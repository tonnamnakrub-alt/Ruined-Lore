// ---------------------------------------------------------------
// รอบปรับไอเทม — เช็คว่าตัวเลขที่ปรับไปทำงานจริงในสนาม
// และคำอธิบายในร้านตรงกับข้อมูล ไม่ใช่เลขเก่าที่ฮาร์ดโค้ดไว้
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { ITEMS, ITEM_BY_ID } from "./src/data/items.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";
import { itemDesc } from "./src/ui/item-desc.js";
import { setLang } from "./src/i18n.js";

setLang("th");
const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);
const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));

const mk = (lane, id, items) => ({
  lane, champId: id, level: 13, xp: 0, gold: 0, items,
  ranks: autoRanks(13, CHAMPIONS[id].skillPriority, null),
  athlete: flat(5), upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE",
});

// ---- Horn of the Wild Hunt ----
{
  const it = ITEM_BY_ID.hwh;
  t("hwh มีตัวเลขพาสซีฟอยู่ในข้อมูล ไม่ได้ฮาร์ดโค้ดในเอนจิน", !!it.ultRush,
    it.ultRush ? JSON.stringify(it.ultRush) : "ไม่มี ultRush");
  t("นาน 10 วิ ตามที่สั่ง", it.ultRush && it.ultRush.dur === 10, (it.ultRush || {}).dur + " วิ");

  const desc = itemDesc(it);
  t("ร้านค้าโชว์พาสซีฟนี้แล้ว", /กดท่าไม้ตาย/.test(desc), desc.slice(desc.indexOf("กดท่าไม้ตาย")) || "ไม่โชว์");
  t("คำอธิบายในร้านตรงกับข้อมูล", desc.includes("นาน " + it.ultRush.dur + " วิ"), "นาน " + it.ultRush.dur + " วิ");

  // ยิงอัลติจริงแล้วดูว่าได้บัฟครบและหมดอายุตรงเวลา
  const me = mk("TOP", "KAZEM", [it]);
  const st = buildFight([me].map(toDef), [mk("TOP", "LUCH", [])].map(toDef), 7, DEFAULT_FIGHT);
  const u = st.units[0], foe = st.units[1];
  u.x = foe.x - 200; u.y = foe.y;
  const r = u.skills.find((s) => s.key === "R");
  r.cdLeft = 0;
  // พาสซีฟนี้ทำงานตอนคิวร่ายถูกประมวลผล ไม่ใช่ตอนเรียก fireSkill ตรงๆ
  st.castQueue.push({ u, sk: r, target: foe, prec: 10 });
  step(st);
  const has = (type) => u.buffs.find((b) => b.type === type);
  t("กดอัลติแล้วได้ความเร็วโจมตี", !!has("as") && has("as").v === it.ultRush.as, "+" + Math.round((has("as") || {}).v * 100) + "%");
  t("กดอัลติแล้วได้ความเร็วเดิน", !!has("ms") && has("ms").v === it.ultRush.ms, "+" + Math.round((has("ms") || {}).v * 100) + "%");
  t("ได้ AD ติดมาด้วย", !!has("adFlat") && has("adFlat").v === it.ultRush.ad, "+" + (has("adFlat") || {}).v + " AD");
  const until = has("as").until;
  t("บัฟอยู่ครบ 10 วิ", Math.abs(until - st.t - it.ultRush.dur) < 0.1,
    "หมดอายุที่ " + until.toFixed(2) + " วิ · ตอนนี้ " + st.t.toFixed(2) + " วิ");

  // เดินต่อจนหมดอายุ ต้องหลุดจริง
  let g = 0;
  while (g++ < 60 * 12 && u.buffs.some((b) => b.type === "as")) step(st);
  t("ครบเวลาแล้วบัฟหลุด", !u.buffs.some((b) => b.type === "as"), "หลุดที่ " + st.t.toFixed(1) + " วิ");
}

// ---- ของที่เนิร์ฟ/บัฟ ต้องตรงกับที่ตั้งใจ และร้านต้องโชว์เลขใหม่ ----
{
  const kff = ITEM_BY_ID.kff;
  t("kff ดาเมจติดออโต้ลดลงจริง", kff.apOnHit.flat === 8 && kff.apOnHit.apRatio === 0.12,
    kff.apOnHit.flat + " (+" + Math.round(kff.apOnHit.apRatio * 100) + "% AP)");
  t("ร้านโชว์เลขใหม่ของ kff ไม่ใช่เลขเก่าที่ฮาร์ดโค้ดไว้",
    itemDesc(kff).includes("8 (+12% AP)"), itemDesc(kff).split("·").pop().trim());

  t("mub ค่าสถานะลดลง", ITEM_BY_ID.mub.ad === 45 && ITEM_BY_ID.mub.armorPenPct === 0.25,
    ITEM_BY_ID.mub.ad + " AD · เจาะเกราะ " + Math.round(ITEM_BY_ID.mub.armorPenPct * 100) + "%");
  t("eoh ค่าสถานะลดลง", ITEM_BY_ID.eoh.ap === 60 && ITEM_BY_ID.eoh.mrPenPct === 0.30,
    ITEM_BY_ID.eoh.ap + " AP · เจาะต้านเวท " + Math.round(ITEM_BY_ID.eoh.mrPenPct * 100) + "%");
  t("ahe ค่าสถานะลดลง", ITEM_BY_ID.ahe.armor === 35 && ITEM_BY_ID.ahe.mr === 35,
    ITEM_BY_ID.ahe.armor + " เกราะ · " + ITEM_BY_ID.ahe.mr + " ต้านเวท");

  // atq กับ slh เคยถูกบัฟด้วยเหตุผลที่ผิด (เชื่อว่ามาร์คแมนอ่อน) แล้วถอยกลับ
  // ล็อกไว้ว่าต้องเป็นค่าเดิม ไม่ใช่ค่าที่บัฟไปแล้ว
  t("atq คืนค่าเดิมหลังพบว่าเหตุผลที่บัฟผิด",
    ITEM_BY_ID.atq.openerMs.dur === 2.5 && ITEM_BY_ID.atq.openerMs.cd === 15,
    ITEM_BY_ID.atq.openerMs.dur + " วิ · คูลดาวน์ " + ITEM_BY_ID.atq.openerMs.cd + " วิ");
  t("slh คืนค่าเดิม", ITEM_BY_ID.slh.msPct === 0.05, Math.round(ITEM_BY_ID.slh.msPct * 100) + "%");
  t("hwg อึดขึ้น", ITEM_BY_ID.hwg.armor === 35 && ITEM_BY_ID.hwg.hp === 300,
    ITEM_BY_ID.hwg.hp + " HP · " + ITEM_BY_ID.hwg.armor + " เกราะ");
}

// ---- ราคาไม่ได้ถูกแตะ — รอบนี้ปรับพลัง ไม่ได้ปรับราคา ----
{
  const costs = { kff: 60, mub: 62, eoh: 58, ahe: 58, atq: 58, slh: 58, hwg: 45, hwh: 60 };
  const bad = Object.entries(costs).filter(([id, c]) => ITEM_BY_ID[id].cost !== c);
  t("ราคาทุกชิ้นเท่าเดิม", bad.length === 0,
    bad.length ? bad.map(([id]) => id).join(", ") : "ครบ 8 ชิ้น");
}

// ---- ค่าสถานะหลักของไอเทมต้องหารห้าลงตัว ----
// เฉพาะค่าที่ผู้เล่นอ่านเป็นตัวเลขตรงๆ: HP · เกราะ · ต้านเวท · AD · AP · ความเร็วโจมตี · Ability Haste
// ส่วนดูดเลือด เจาะเกราะ เจาะต้านเวท ฮีลแรงขึ้น ความเร็วเดิน ลดดาเมจ — ไม่บังคับ
// พวกนั้นเป็นเปอร์เซ็นต์ที่ปัดทีเดียวแล้วพลังเปลี่ยนเยอะเกินกว่าจะคุ้ม
{
  const FLAT = ["hp", "armor", "mr", "ad", "ap", "ah", "ultAh"];
  const PCT = ["asPct", "adPct", "apPct"];
  const off = [];
  for (const it of ITEMS) {
    for (const k of FLAT) if (typeof it[k] === "number" && it[k] % 5 !== 0) off.push(it.id + "." + k + "=" + it[k]);
    for (const k of PCT) {
      if (typeof it[k] !== "number") continue;
      const p = Math.round(it[k] * 1000);
      if (p % 50 !== 0) off.push(it.id + "." + k + "=" + (p / 10) + "%");
    }
  }
  t("ค่าสถานะหลักของไอเทมทุกชิ้นหารห้าลงตัว", off.length === 0,
    off.length ? off.join(" · ") : ITEMS.length + " ชิ้น ผ่านหมด");
}

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(48) + " " + d); }
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
