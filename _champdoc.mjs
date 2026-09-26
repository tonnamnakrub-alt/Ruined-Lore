// ---------------------------------------------------------------
// สร้าง CHAMPIONS.md จากข้อมูลจริงใน src/data/champions.js
//
// เขียนมือไม่ได้ เพราะพอปรับตัวเลขในเกมแล้วเอกสารจะโกหกทันที
// รันใหม่ทุกครั้งที่ปรับบาลานซ์:  node _champdoc.mjs
//
// ตารางอัตราชนะมาจาก _champwr.mjs — วางไว้ในไฟล์ wr.json ถ้าอยากให้แนบมาด้วย
// ---------------------------------------------------------------
import fs from "fs";
import { setLang } from "./src/i18n.js";
import { CHAMPIONS, lanesOf } from "./src/data/champions.js";
import { LANE_INFO } from "./src/data/lanes.js";
import { MAX_RANK, flatRows, rankedRows, ratioLine, skillSentence, skillShape, skillTitle } from "./src/game/skill-desc.js";

setLang("th");   // เอกสารในรีโปเป็นภาษาไทย

const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
const num = (v) => (Math.round(v * 100) / 100);
const esc = (s) => String(s).replace(/\|/g, "\\|");

// ค่าสถานะตอนเลเวล 1 และ 18 — ตัวเลขที่ใช้เทียบกันจริงๆ
function statTable(c) {
  const at = (base, per, lv) => num(base + (per || 0) * (lv - 1));
  const rows = [
    ["เลือด", c.hp, c.hpG],
    ["ฟื้นเลือด/5วิ", c.hp5, c.hp5G],
    ["พลังโจมตี", c.ad, c.adG],
    ["เกราะ", c.armor, c.armorG],
    ["ต้านเวท", c.mr, c.mrG],
    ["ความเร็วโจมตี", c.as, c.asG],
  ];
  const out = ["| ค่า | เลเวล 1 | ต่อเลเวล | เลเวล 18 |", "|---|---|---|---|"];
  for (const [label, base, per] of rows) {
    out.push(`| ${label} | ${num(base)} | +${num(per || 0)} | ${at(base, per, 18)} |`);
  }
  out.push(`| ความเร็วเดิน | ${c.ms} | — | ${c.ms} |`);
  out.push(`| ระยะโจมตี | ${c.range} | — | ${c.range} |`);
  return out.join("\n");
}

function skillBlock(c, sk) {
  const out = [];
  const shape = skillShape(sk);
  out.push(`#### ${sk.key} · ${esc(skillTitle(sk) || sk.th)}${shape ? "  \n*" + esc(shape) + "*" : ""}`);
  const sentence = skillSentence(sk);
  if (sentence) out.push("", esc(sentence));

  // ตัวเลขที่ไต่ตามขั้นสกิล
  const ranked = rankedRows(sk).filter((r) => !r.flat && r.values.length > 1);
  if (ranked.length) {
    const max = MAX_RANK(sk);
    const head = Array.from({ length: max }, (_, i) => "ขั้น " + (i + 1));
    out.push("", "| ค่า | " + head.join(" | ") + " |", "|---|" + head.map(() => "---").join("|") + "|");
    for (const r of ranked) {
      const vals = Array.from({ length: max }, (_, i) => (r.values[i] != null ? num(r.values[i]) : "—"));
      out.push(`| ${esc(r.label)} | ${vals.join(" | ")} |`);
    }
  }

  // ค่าคงที่ทุกขั้น
  const flatBits = [];
  for (const r of rankedRows(sk).filter((r) => r.flat)) {
    flatBits.push(esc(r.label) + " " + num(r.values[0]));
  }
  for (const r of flatRows(sk)) flatBits.push(esc(r.label) + " " + esc(r.value));
  const ratio = ratioLine(sk);
  if (ratio) flatBits.push(esc(ratio));
  if (flatBits.length) out.push("", flatBits.join(" · "));
  return out.join("\n");
}

function champBlock(c) {
  const out = [];
  const lanes = lanesOf(c).join(" / ");
  out.push(`### ${c.id}`);
  out.push("");
  out.push(`**${esc(c.th)}** — ${esc(c.role)} · เลน ${lanes} · ${c.melee ? "ประชิด" : "ระยะไกล"} ระยะ ${c.range}`);
  out.push("");
  out.push(statTable(c));
  if (c.passive) {
    out.push("", `**พาสซีฟ · ${esc(c.passive.th)}**`, "", esc(c.passive.desc || ""));
  }
  for (const sk of c.skills || []) out.push("", skillBlock(c, sk));
  return out.join("\n");
}

// ---- ประกอบไฟล์ ----
const doc = [];
doc.push("# ตัวละครทั้งหมด");
doc.push("");
doc.push("ไฟล์นี้สร้างจากข้อมูลจริงใน `src/data/champions.js` ด้วย `node _champdoc.mjs`");
doc.push("ปรับตัวเลขในเกมแล้วรันใหม่ ไม่ต้องแก้มือ — ตัวเลขในนี้จึงตรงกับที่เอนจินใช้เสมอ");
doc.push("");
doc.push(`ตอนนี้มี **${Object.keys(CHAMPIONS).length} ตัว**`);
doc.push("");

// สารบัญตามเลน
doc.push("## สารบัญตามเลน");
doc.push("");
for (const L of LANES) {
  const list = Object.values(CHAMPIONS).filter((c) => lanesOf(c).includes(L));
  const info = LANE_INFO[L];
  doc.push(`**${L}** — ${esc(info ? info.passive : "")}`);
  doc.push("");
  doc.push(list.map((c) => `[${c.id}](#${c.id.toLowerCase().replace(/[^a-z0-9]/g, "")})`).join(" · "));
  doc.push("");
}

// ตารางเทียบค่าสถานะทุกตัว
doc.push("## เทียบค่าสถานะทุกตัว (เลเวล 13)");
doc.push("");
doc.push("| ตัวละคร | บทบาท | เลน | เลือด | AD | เกราะ | ต้านเวท | ความเร็วโจมตี | เดิน | ระยะ |");
doc.push("|---|---|---|---|---|---|---|---|---|---|");
for (const c of Object.values(CHAMPIONS)) {
  const at = (b, p) => Math.round(b + (p || 0) * 12);
  doc.push([
    "", c.id, esc(c.role), c.lane, at(c.hp, c.hpG), at(c.ad, c.adG),
    at(c.armor, c.armorG), at(c.mr, c.mrG), num(c.as + (c.asG || 0) * 12),
    c.ms, c.range, "",
  ].join(" | ").trim());
}
doc.push("");

// รายตัว
doc.push("## รายละเอียดรายตัว");
doc.push("");
for (const L of LANES) {
  const list = Object.values(CHAMPIONS).filter((c) => c.lane === L);
  if (!list.length) continue;
  doc.push(`## เลน ${L}`);
  doc.push("");
  for (const c of list) { doc.push(champBlock(c)); doc.push(""); doc.push("---"); doc.push(""); }
}

fs.writeFileSync("CHAMPIONS.md", doc.join("\n").replace(/\n{3,}/g, "\n\n") + "\n");
console.log("เขียน CHAMPIONS.md แล้ว — " + Object.keys(CHAMPIONS).length + " ตัว · " +
  doc.join("\n").split("\n").length + " บรรทัด");
