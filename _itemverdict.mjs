// ---------------------------------------------------------------
// ตาราง Tier 3 รายชิ้น — ชิ้นไหนควรปรับอะไร
//
// เขียนหัวข้อใหม่ลง ITEMS.md แบบเดียวกับที่ CHAMPIONS.md บอกว่าตัวไหนควรปรับ
// อ่านจาก item-wr.json (ผลวัดในสนาม) + ตารางราคาใน _itemprice.mjs (ความคุ้ม)
//
//   node _itemwr.mjs 80      วัดก่อน
//   node _itemverdict.mjs    แล้วค่อยเขียนเอกสาร
//
// Tier 1/2 ไม่อยู่ในตารางนี้ เพราะตัววัดแจกของเป็นชิ้นใหญ่ทีละชิ้น
// ชิ้นส่วนเล็กวัดด้วยวิธีเดียวกันไม่ได้ ต้องวัดแบบสลับของแทน ซึ่งยังไม่ได้ทำ
// ---------------------------------------------------------------
import fs from "fs";
import { ITEMS } from "./src/data/items.js";
import { PRICE, CODED_PASSIVE } from "./_itemprice.mjs";

const F = "ITEMS.md";
const W = JSON.parse(fs.readFileSync("item-wr.json", "utf8"));

const PASSIVE_KEYS = [
  "antihealOnDmg", "chainHors", "horsBuffAs", "horsBuffAp", "tier3ScalingHors",
  "auraArmor", "auraAdPct", "leashCap", "noChaseLowHp", "dmgPct", "armorPct",
];
const BY = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
const statValue = (it) => Object.keys(PRICE).reduce((s, k) => s + (it[k] ? it[k] * PRICE[k] : 0), 0);
const hasPassive = (it) => CODED_PASSIVE.has(it.id) || PASSIVE_KEYS.some((k) => it[k] != null);

// ค่ากลางของแต่ละสาย — ต้องเทียบในสายเดียวกัน
// เพราะไฟต์กระจกของแต่ละสายยาวไม่เท่ากัน (ซัพ 44 วิ ตาย 1.4 คน · แอสซาซิน 21.6 วิ ตาย 7.3 คน)
const catAvg = Object.fromEntries(W.cats.map((c) => [c.cat, c.edge]));
const M = W.margin;

const rows = W.rows.map((r) => {
  const it = BY[r.id];
  const rel = r.edge - (catAvg[r.cat] != null ? catAvg[r.cat] : 0);
  const val = it && !hasPassive(it) ? Math.round((100 * statValue(it)) / it.cost) : null;
  return { ...r, it, rel, val };
});

function verdict(r) {
  const strong = r.rel >= M, weak = r.rel <= -M;
  const cheap = r.val != null && r.val >= 105;
  const pricey = r.val != null && r.val <= 80;
  if (strong && cheap) return ["🔴 แรงเกินและคุ้มเกิน", "กดค่าสถานะลง หรือขึ้นราคา"];
  if (strong) return ["🔴 แรงเกินในสายตัวเอง", "กดค่าสถานะหรือพาสซีฟลง"];
  if (weak && pricey) return ["🟡 อ่อนและแพงเกินตัว", "เพิ่มค่าสถานะ หรือลดราคา"];
  if (weak) return ["🟡 อ่อนกว่าค่ากลางของสาย", "บัฟค่าสถานะหรือพาสซีฟ"];
  if (cheap) return ["⚪ อยู่ในเกณฑ์ แต่คุ้มเกินราคา", "พิจารณาขึ้นราคา"];
  if (pricey) return ["⚪ อยู่ในเกณฑ์ แต่แพงเกินค่าสถานะ", "พิจารณาลดราคา"];
  return ["✅ อยู่ในเกณฑ์", "ไม่ต้องแตะ"];
}

const CAT_TH = { TANK: "แทงค์", FIGHTER: "ไฟท์เตอร์", ASSASSIN: "แอสซาซิน", MAGE: "เวท", MARKSMAN: "มาร์คแมน", SUPPORT: "ซัพพอร์ต" };
const CATS = ["TANK", "FIGHTER", "ASSASSIN", "MAGE", "MARKSMAN", "SUPPORT"];
const byCat = {};
for (const r of rows) (byCat[r.cat] = byCat[r.cat] || []).push(r);

const L = [];
L.push("## 🛒 Tier 3 รายชิ้น — ชิ้นไหนควรปรับอะไร");
L.push("");
L.push(`วัดชิ้นละ **${W.fightsEach} ไฟต์** · ค่าคลาดเคลื่อน **±${M}** ต่อชิ้น`);
L.push("");
L.push("`เหนือ 50%` — แจกไอเทมชิ้นนี้ให้ทีมหนึ่งเกินมาคนละชิ้น แล้วเขาชนะเพิ่มกี่แต้ม · **50% = ของไม่มีผลเลย**");
L.push("");
L.push("`เทียบสาย` — ตัวเลขของเขา ลบค่าเฉลี่ยของสายเดียวกัน");
L.push("> ⚠️ **ต้องเทียบในสายเท่านั้น** เพราะไฟต์กระจกของแต่ละสายคนละรูปทรง");
L.push("> ทีมซัพสู้กันเอง 44 วินาที ตายแค่ 1.4 คนจากสิบ · ทีมแอสซาซิน 21.6 วินาที ตาย 7.3 คน");
L.push("> ค่าสถานะก้อนเดียวกันจึงพลิกผลในทีมซัพได้ง่ายกว่ามาก");
L.push("");
L.push("`ความคุ้ม` — ค่าสถานะที่ได้เทียบกับเงินที่จ่าย · 100% = คุ้มพอดี");
L.push("ของที่มีพาสซีฟเขียนมือในเอนจินตีราคาแบบนี้ไม่ได้ ช่องจะเว้นเป็น `—`");
L.push("");
L.push(`**เกณฑ์** — ห่างจากค่ากลางของสายเกิน ±${M} คือนอกกรอบ · ความคุ้ม ≥105% คือคุ้มเกิน · ≤80% คือแพงเกิน`);
L.push("");

for (const cat of CATS) {
  const list = (byCat[cat] || []).sort((a, b) => b.rel - a.rel);
  if (!list.length) continue;
  const a = catAvg[cat];
  L.push(`### ${CAT_TH[cat]} · ${cat} — ${list.length} ชิ้น · ค่ากลางของสาย ${a >= 0 ? "+" : ""}${a}`);
  L.push("");
  L.push("| ไอเทม | ราคา | เหนือ 50% | เทียบสาย | ความคุ้ม | คำตัดสิน | ควรทำ |");
  L.push("|---|---:|---:|---:|---:|---|---|");
  for (const r of list) {
    const [tag, how] = verdict(r);
    L.push(`| **${r.name}** \`${r.id}\` | ${r.cost}g | ${r.edge >= 0 ? "+" : ""}${r.edge} | ${r.rel >= 0 ? "+" : ""}${r.rel.toFixed(1)} | ${r.val != null ? r.val + "%" : "—"} | ${tag} | ${how} |`);
  }
  L.push("");
}

const todo = rows.filter((r) => !verdict(r)[0].startsWith("✅"))
  .sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel));
L.push("### สรุปเฉพาะชิ้นที่ควรแตะ");
L.push("");
if (!todo.length) L.push("ไม่มีชิ้นไหนหลุดเกณฑ์");
for (const r of todo) {
  const [tag, how] = verdict(r);
  L.push(`- **${r.name}** \`${r.id}\` (${r.cat} · ${r.cost}g) ${tag} — เทียบสาย ${r.rel >= 0 ? "+" : ""}${r.rel.toFixed(1)}${r.val != null ? " · ความคุ้ม " + r.val + "%" : ""} → **${how}**`);
}
L.push("");
L.push("> **Tier 1 กับ Tier 2 ไม่อยู่ในตารางนี้** เพราะตัววัดใช้วิธีแจกของใหญ่เกินมาหนึ่งชิ้น");
L.push("> ชิ้นส่วนเล็กวัดด้วยวิธีเดียวกันไม่ได้ — สัญญาณ \"มีของเพิ่มอีกชิ้น\" จะกลบสัญญาณ \"ชิ้นไหนดีกว่ากัน\"");
L.push("> ต้องวัดแบบสลับของแทน ซึ่งยังไม่ได้ทำ");
L.push("");
L.push("---");
L.push("");

let s = fs.readFileSync(F, "utf8");
const crlf = s.includes("\r\n");
if (crlf) s = s.replace(/\r\n/g, "\n");
// ถ้าเคยเขียนหัวข้อนี้ไว้แล้ว ให้แทนที่ของเดิม ไม่ใช่ต่อท้ายซ้ำ
const head = "## 🛒 Tier 3 รายชิ้น — ชิ้นไหนควรปรับอะไร";
const anchor = "## รายชิ้นแยกตามหมวด";
if (s.includes(head)) s = s.slice(0, s.indexOf(head)) + s.slice(s.indexOf(anchor));
if (!s.includes(anchor)) throw new Error("หา anchor ไม่เจอ");
s = s.replace(anchor, L.join("\n") + anchor);
fs.writeFileSync(F, crlf ? s.replace(/\n/g, "\r\n") : s);

console.log("เขียน ITEMS.md แล้ว — Tier 3 " + rows.length + " ชิ้น · ควรแตะ " + todo.length + " ชิ้น\n");
console.log("สาย        ชิ้น  ค่ากลาง  ควรแตะ");
for (const cat of CATS) {
  const l = byCat[cat] || [];
  const n = l.filter((r) => !verdict(r)[0].startsWith("✅")).length;
  console.log(cat.padEnd(11) + String(l.length).padStart(4) +
    ((catAvg[cat] >= 0 ? "+" : "") + catAvg[cat]).padStart(9) + String(n).padStart(8));
}
