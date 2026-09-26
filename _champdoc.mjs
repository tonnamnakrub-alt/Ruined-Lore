// ---------------------------------------------------------------
// สร้าง CHAMPIONS.md จากข้อมูลจริงใน src/data/champions.js
//
// เขียนมือไม่ได้ เพราะพอปรับตัวเลขในเกมแล้วเอกสารจะโกหกทันที
// รันใหม่ทุกครั้งที่ปรับบาลานซ์:  node _champdoc.mjs
//
// ถ้ามีไฟล์ champ-wr.json อยู่ (จาก node _champwr.mjs) จะแนบผลวัดจริงเข้าไปด้วย
// ---------------------------------------------------------------
import fs from "fs";
import { setLang } from "./src/i18n.js";
import { CHAMPIONS, lanesOf } from "./src/data/champions.js";
import { LANE_INFO } from "./src/data/lanes.js";
import {
  MAX_RANK, flatRows, rankedRows, ratioLine, skillSentence, skillShape, skillTitle,
} from "./src/game/skill-desc.js";

setLang("th");   // เอกสารในรีโปเป็นภาษาไทย

const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
const ALL = Object.values(CHAMPIONS);
const anchor = (id) => id.toLowerCase().replace(/[^a-z0-9]/g, "");
const esc = (s) => String(s).replace(/\|/g, "\\|");
const n2 = (v) => Math.round(v * 100) / 100;

// จัดรูปตัวเลขให้เหมือนที่โชว์ในเกม — 0.25 ต้องอ่านว่า 25% ไม่ใช่ 0.25
const fmt = (v, f) => {
  if (v == null) return "—";
  if (f === "pct") return Math.round(v * 1000) / 10 + "%";
  if (f === "sec") return n2(v) + " วิ";
  if (f === "deg") return v + "°";
  if (f === "x") return "×" + v;
  return String(n2(v));
};

// ---------------------------------------------------------------
// บทบาทเป็นภาษาอังกฤษในข้อมูล แต่คนอ่านควรรู้ว่ามันแปลว่าอะไรและมีหน้าที่อะไร
// ---------------------------------------------------------------
const ROLE_TH = {
  "Assassin": ["นักลอบสังหาร", "เจาะเข้าไปเก็บตัวเปราะฝั่งตรงข้ามให้ได้ แลกกับตัวเองที่บางมาก"],
  "Enchanter": ["ผู้เสริมพลัง", "ไม่ได้อยู่เพื่อทำดาเมจ แต่อยู่เพื่อให้เพื่อนรอดและแรงขึ้น"],
  "Vanguard": ["กองหน้าเปิดไฟต์", "ตัวถังที่พุ่งเข้าไปเปิดก่อน แล้วดึงความสนใจไว้กับตัว"],
  "Warden": ["ผู้พิทักษ์", "ตัวถังสายตั้งรับ ไม่เปิดไฟต์เอง แต่กันคนอื่นเข้าถึงเพื่อน"],
  "Juggernaut": ["ยักษ์", "ทั้งอึดทั้งตีแรง แต่ช้าและเข้าถึงเป้ายาก ต้องให้ศัตรูเดินมาหาเอง"],
  "Diver": ["นักดำดิ่ง", "พุ่งข้ามแนวหน้าเข้าไปหาแครี่โดยตรง แล้วอยู่ให้นานพอจะเก็บได้"],
  "Skirmisher": ["นักประลอง", "เก่งที่สุดตอนยืนแลกตัวต่อตัว แต่เปิดไฟต์ใส่กลุ่มไม่ได้"],
  "Bruiser AD": ["นักสู้กายภาพ", "อยู่กึ่งกลางระหว่างตัวถังกับตัวดาเมจ ทนพอจะยืน แรงพอจะฆ่า"],
  "Marksman": ["นักแม่นปืน", "ดาเมจหลักมาจากการตีธรรมดาต่อเนื่อง ต้องมีที่ยืนปลอดภัยถึงจะออกของได้"],
  "Burst Mage": ["เวทระเบิด", "รวมดาเมจไว้ในคอมโบเดียว พลาดแล้วต้องรอคูลดาวน์ยาว"],
  "Battle Mage": ["เวทประชิด", "ยืนแลกในระยะกลางได้ เน้นดาเมจต่อเนื่องมากกว่าระเบิดทีเดียว"],
  "Artillery Mage": ["เวทปืนใหญ่", "ยิงจากระยะไกลที่สุดในเกม แลกกับการที่โดนเข้าตัวแล้วจบเลย"],
  "Controller": ["ผู้ควบคุม", "เน้นคุมฝูงและตัดพื้นที่ ดาเมจไม่ใช่เรื่องหลัก"],
};

// ---------------------------------------------------------------
// ชุดสกิลนี้มีอะไรบ้าง — อ่านจากฟิลด์จริงในข้อมูล ไม่ได้เขียนเดา
// ---------------------------------------------------------------
const KIT_TAGS = [
  [(s) => s.dashRange || s.dashSpeed || s.type === "dash" || s.type === "deltaDash", "พุ่งเข้าหา"],
  [(s) => /blink|cloneBlink/.test(s.type || ""), "วาร์ป"],
  [(s) => s.stun || s.stunByRank || s.lockTime, "สตัน"],
  [(s) => s.airborne || s.knockupByRank || s.toss, "ยกลอย"],
  [(s) => s.slow || s.slowByRank || s.polySlow, "สโลว์"],
  [(s) => s.root || s.rootByRank, "ตรึงเท้า"],
  [(s) => s.silenceByRank, "ปิดปาก"],
  [(s) => s.heal || s.healAp, "ฮีล"],
  [(s) => s.shield || s.aegis, "โล่"],
  [(s) => s.atkCut, "ลดพลังโจมตีศัตรู"],
  [(s) => s.shred || s.shredByRank, "ลดเกราะ"],
  [(s) => s.stealth, "ล่องหน"],
  [(s) => s.untargetable || s.airTime, "แตะไม่ได้ชั่วคราว"],
  [(s) => s.msBuff || s.msPct, "เร่งความเร็วเดิน"],
  [(s) => s.asBuff, "เร่งความเร็วโจมตี"],
];
const kitTags = (c) => KIT_TAGS
  .filter(([test]) => (c.skills || []).some((s) => { try { return !!test(s); } catch { return false; } }))
  .map(([, label]) => label);

// ---------------------------------------------------------------
// อันดับของค่าสถานะเทียบทั้งเกม — ตัวเลขดิบอย่างเดียวบอกไม่ได้ว่าสูงหรือต่ำ
// ---------------------------------------------------------------
const at13 = (base, per) => (base || 0) + (per || 0) * 12;
const STAT_LIST = [
  ["เลือด", (c) => at13(c.hp, c.hpG)],
  ["ฟื้นเลือด/5วิ", (c) => at13(c.hp5, c.hp5G)],
  ["พลังโจมตี", (c) => at13(c.ad, c.adG)],
  ["เกราะ", (c) => at13(c.armor, c.armorG)],
  ["ต้านเวท", (c) => at13(c.mr, c.mrG)],
  ["ความเร็วโจมตี", (c) => at13(c.as, c.asG)],
  ["ความเร็วเดิน", (c) => c.ms],
  ["ระยะโจมตี", (c) => c.range],
];
const RANK = {};
for (const [label, get] of STAT_LIST) {
  const sorted = ALL.map((c) => [c.id, get(c)]).sort((a, b) => b[1] - a[1]);
  RANK[label] = Object.fromEntries(sorted.map(([id], i) => [id, i + 1]));
}

// ---------------------------------------------------------------
// ผลวัดจริง ถ้ามี
// ---------------------------------------------------------------
let WR = null;
try {
  WR = JSON.parse(fs.readFileSync("champ-wr.json", "utf8"));
  WR.by = Object.fromEntries(WR.rows.map((r) => [r.id, r]));
} catch { WR = null; }

// ---------------------------------------------------------------
// สกิลหนึ่งท่า
// ---------------------------------------------------------------
function skillBlock(sk) {
  const out = [];
  const max = MAX_RANK(sk);
  const shape = skillShape(sk);
  out.push(`**${sk.key} · ${esc(skillTitle(sk) || sk.th)}**${shape ? "  — *" + esc(shape) + "*" : ""}`);
  const sentence = skillSentence(sk);
  if (sentence) out.push("", esc(sentence));

  const ranked = rankedRows(sk).filter((r) => !r.flat && r.values.length > 1);
  if (ranked.length) {
    const head = Array.from({ length: max }, (_, i) => "ขั้น " + (i + 1));
    out.push("", "| | " + head.join(" | ") + " |", "|---|" + head.map(() => "---:").join("|") + "|");
    for (const r of ranked) {
      const vals = Array.from({ length: max }, (_, i) => fmt(r.values[i], r.fmt));
      out.push(`| ${esc(r.label)} | ${vals.join(" | ")} |`);
    }
  }

  const flatBits = [];
  for (const r of rankedRows(sk).filter((r) => r.flat)) flatBits.push(esc(r.label) + " " + fmt(r.values[0], r.fmt));
  for (const r of flatRows(sk)) flatBits.push(esc(r.label) + " " + esc(r.value));
  if (flatBits.length) out.push("", flatBits.join(" · "));

  const ratio = ratioLine(sk);
  if (ratio) {
    const bits = [`สเกล — ${esc(ratio)}`];
    if (Array.isArray(sk.dmg) && sk.dmg[max - 1] > 0) {
      const base = sk.dmg[max - 1];
      const ap = sk.apRatio ? sk.apRatio * 250 : 0;
      const ad = sk.badRatio ? sk.badRatio * 120 : 0;
      if (ap || ad) {
        const parts = [`ฐาน ${base}`];
        if (ap) parts.push(`+${Math.round(ap)} จาก AP 250`);
        if (ad) parts.push(`+${Math.round(ad)} จาก Bonus AD 120`);
        bits.push(`ขั้นสูงสุดเมื่อออกของครบ: ${parts.join(" ")} = **${Math.round(base + ap + ad)}**`);
      }
    }
    out.push("", bits.join("  \n"));
  }

  // ท่ายิงหลายลูก กับท่าที่ทะลุ — สองอย่างนี้ falloff คนละความหมาย
  if (sk.count > 1) {
    const fall = sk.falloff != null ? sk.falloff : 0.5;
    const mult = 1 + (sk.count - 1) * fall;
    out.push("", `> **ยิง ${sk.count} ลูก** · ลูกที่ซ้ำตัวเดิมเหลือ **${Math.round(fall * 100)}%** ` +
      `— ศัตรูตัวเดียวที่กินครบทุกลูกจึงรับ **×${n2(mult)}** ของดาเมจหนึ่งลูก`);
  } else if (sk.pierce && sk.falloff != null) {
    out.push("", `> **ทะลุผ่านได้** · เป้าถัดไปรับดาเมจเหลือ **${Math.round(sk.falloff * 100)}%** ต่อคน` +
      (sk.falloffFloor != null ? ` (ไม่ต่ำกว่า ${Math.round(sk.falloffFloor * 100)}%)` : ""));
  }
  return out.join("\n");
}

// ---------------------------------------------------------------
// ตัวละครหนึ่งตัว
// ---------------------------------------------------------------
function champBlock(c) {
  const out = [];
  const role = ROLE_TH[c.role] || [c.role, ""];
  out.push(`### ${c.id}`);
  out.push("");
  out.push(`**${esc(c.th)}** · ${esc(c.role)} — ${esc(role[0])}`);
  out.push("");
  out.push(`> ${esc(role[1])}`);
  out.push("");
  out.push(`เลน **${lanesOf(c).join(" / ")}** · ${c.melee ? "ตัวประชิด" : "ตัวระยะไกล"} ระยะโจมตี ${c.range}` +
    (c.missile ? ` · ออโต้เป็นลูกวิ่งตามเป้า (ความเร็ว ${c.missile})` : " · ออโต้เข้าทันที ไม่มีลูกให้หลบ"));

  const tags = kitTags(c);
  if (tags.length) out.push("", `**ชุดสกิลมี** ${tags.map((t) => "`" + t + "`").join(" ")}`);

  if (WR && WR.by[c.id]) {
    const r = WR.by[c.id];
    out.push("", `**ผลวัดตัวต่อตัว** — ชนะ **${r.wr}%** · ทำดาเมจ ${r.dmg} · กินดาเมจ ${r.took} · ` +
      `ฮีลกับโล่ ${r.heal} · รอดจบไฟต์ ${r.lived}%`);
    if (r.src && r.src.length) {
      out.push("", "ดาเมจมาจาก — " + r.src.map(([s, v]) =>
        `${esc(s)} **${Math.round((100 * v) / Math.max(1, r.dmg))}%**`).join(" · "));
    }
  }

  out.push("", "**ค่าสถานะ**", "");
  out.push("| ค่า | เลเวล 1 | ต่อเลเวล | เลเวล 13 | เลเวล 18 | อันดับในเกม |");
  out.push("|---|---:|---:|---:|---:|:---:|");
  for (const [label, get] of STAT_LIST.slice(0, 6)) {
    const key = { "เลือด": ["hp", "hpG"], "ฟื้นเลือด/5วิ": ["hp5", "hp5G"], "พลังโจมตี": ["ad", "adG"],
      "เกราะ": ["armor", "armorG"], "ต้านเวท": ["mr", "mrG"], "ความเร็วโจมตี": ["as", "asG"] }[label];
    const base = c[key[0]], per = c[key[1]] || 0;
    out.push(`| ${label} | ${n2(base)} | +${n2(per)} | ${n2(base + per * 12)} | ${n2(base + per * 17)} | ${RANK[label][c.id]}/${ALL.length} |`);
    void get;
  }
  out.push(`| ความเร็วเดิน | ${c.ms} | — | ${c.ms} | ${c.ms} | ${RANK["ความเร็วเดิน"][c.id]}/${ALL.length} |`);
  out.push(`| ระยะโจมตี | ${c.range} | — | ${c.range} | ${c.range} | ${RANK["ระยะโจมตี"][c.id]}/${ALL.length} |`);

  if (c.passive) out.push("", `**พาสซีฟ · ${esc(c.passive.th)}**`, "", esc(c.passive.desc || ""));
  for (const sk of c.skills || []) out.push("", skillBlock(sk));
  return out.join("\n");
}

// ---------------------------------------------------------------
// ประกอบไฟล์
// ---------------------------------------------------------------
const skillCount = ALL.reduce((s, c) => s + (c.skills || []).length, 0);
const doc = [];
doc.push("# ตัวละครทั้งหมด");
doc.push("");
doc.push(`**${ALL.length} ตัว · ${skillCount} สกิล**`);
doc.push("");
doc.push("> ไฟล์นี้สร้างอัตโนมัติจาก `src/data/champions.js` ด้วยคำสั่ง `node _champdoc.mjs`  ");
doc.push("> คำอธิบายสกิลใช้ชุดเดียวกับที่โชว์ในเกม ตัวเลขจึงตรงกับที่เอนจินคิดจริงเสมอ  ");
doc.push("> ปรับบาลานซ์แล้วรันใหม่ ไม่ต้องไล่แก้มือทีละตัว");
doc.push("");

doc.push("## วิธีอ่านเอกสารนี้");
doc.push("");
doc.push(`- **เลเวล 13** คือเลเวลที่ใช้เทียบทุกตัว เพราะเป็นช่วงกลางเกมที่ของออกครบแล้ว`);
doc.push(`- **อันดับในเกม** คือค่านั้นอยู่อันดับที่เท่าไหร่จาก ${ALL.length} ตัว — อันดับ 1 คือสูงสุด ใช้ดูว่าค่านั้นสูงหรือต่ำจริงไหม`);
doc.push("- **ขั้น 1-5** คือขั้นของสกิล ท่าไม้ตายมีแค่ 3 ขั้น");
doc.push("- **สเกล** คือส่วนที่บวกเพิ่มตามพลังเวท (AP) หรือพลังโจมตีส่วนเกิน (Bonus AD) ที่ซื้อมา");
doc.push("  ตัวอย่างที่คิดให้ดูใช้ **AP 250** กับ **Bonus AD 120** ซึ่งเป็นระดับตอนออกของครบ");
doc.push("- **ชุดสกิลมี** อ่านจากฟิลด์จริงในข้อมูล ไม่ได้เขียนเดา ใช้ดูคร่าวๆ ว่าตัวนี้ทำอะไรได้บ้าง");
if (WR) {
  doc.push(`- **ผลวัดตัวต่อตัว** มาจาก \`node _champwr.mjs ${WR.seeds} ${WR.level}\` — ทุกตัวพบกันหมด`);
  doc.push(`  ของ เลเวล และค่าสถานะนักแข่งเท่ากันทุกฝ่าย สลับสีครึ่งหนึ่ง ตัวละ **${WR.fightsEach} ไฟต์**`);
  doc.push(`  ค่าคลาดเคลื่อนราว **±${WR.margin} แต้ม** — ต่างกันน้อยกว่านี้ให้อ่านว่าเท่ากัน`);
  doc.push("");
  doc.push("  ตารางนี้เป็นไฟต์เดี่ยว ซึ่งใกล้เคียงของจริงสำหรับท็อปกับมิดที่ยืนคนเดียวอยู่แล้ว");
  doc.push("  แต่สายซัพปกติไม่ได้ยืนเดี่ยว เลขของซัพจึงต้องอ่านคู่กับคอลัมน์ฮีลกับโล่");
}
doc.push("");

if (WR) {
  doc.push("## ภาพรวมบาลานซ์");
  doc.push("");
  doc.push("| # | ตัวละคร | ชนะ | ดาเมจ | กินดาเมจ | ฮีล+โล่ | รอดจบไฟต์ | เลน | บทบาท |");
  doc.push("|---:|---|---:|---:|---:|---:|---:|---|---|");
  WR.rows.forEach((r, i) => {
    const c = CHAMPIONS[r.id];
    if (!c) return;
    doc.push(`| ${i + 1} | [${r.id}](#${anchor(r.id)}) | **${r.wr}%** | ${r.dmg} | ${r.took} | ${r.heal} | ${r.lived}% | ${c.lane} | ${esc(c.role)} |`);
  });
  doc.push("");
}

doc.push("## ใครลงเลนไหนได้บ้าง");
doc.push("");
for (const L of LANES) {
  const list = ALL.filter((c) => lanesOf(c).includes(L));
  doc.push(`### ${L}`);
  doc.push("");
  doc.push(`พาสซีฟเลน: ${esc(LANE_INFO[L] ? LANE_INFO[L].passive : "—")}`);
  doc.push("");
  doc.push(list.map((c) => `[${c.id}](#${anchor(c.id)})`).join(" · "));
  doc.push("");
}

for (const L of LANES) {
  const list = ALL.filter((c) => c.lane === L);
  if (!list.length) continue;
  doc.push(`## เลนหลัก ${L}`);
  doc.push("");
  for (const c of list) { doc.push(champBlock(c)); doc.push(""); doc.push("---"); doc.push(""); }
}

doc.push("## บทบาทแต่ละแบบคืออะไร");
doc.push("");
doc.push("| บทบาท | ชื่อไทย | หน้าที่ | ใครบ้าง |");
doc.push("|---|---|---|---|");
for (const [role, [th, desc]] of Object.entries(ROLE_TH)) {
  const who = ALL.filter((c) => c.role === role).map((c) => c.id);
  if (!who.length) continue;
  doc.push(`| ${esc(role)} | ${esc(th)} | ${esc(desc)} | ${who.join(" · ")} |`);
}
doc.push("");

fs.writeFileSync("CHAMPIONS.md", doc.join("\n").replace(/\n{3,}/g, "\n\n") + "\n");
console.log("เขียน CHAMPIONS.md แล้ว — " + ALL.length + " ตัว · " + skillCount + " สกิล · " +
  (WR ? `แนบผลวัด ${WR.fightsEach} ไฟต์ต่อตัว` : "ยังไม่มี champ-wr.json (รัน node _champwr.mjs ก่อน)"));
