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
import { BUILD_LABEL, LATEST_PATCH, patchLabel } from "./src/data/patches.js";
import { LANE_INFO } from "./src/data/lanes.js";
import { SKILL_CATS, categoriesOf, categoryOf, dodgeOf } from "./src/game/skill-kind.js";
import {
  MAX_RANK, flagLines, flatRows, rankedRows, ratioLine, skillSentence, skillShape, skillTitle, subSkills,
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
// ผลวัดจากแมตช์เต็ม — ไม้บรรทัดหลัก
//
// ตารางดวลเดี่ยว (champ-wr.json) อธิบายผลแพ้ชนะจริงได้แค่ 2% จึงใช้ตัดสินใจไม่ได้
// ที่นี่จึงอ่าน game-wr.json เป็นหลัก แล้วสรุปให้เลยว่าแต่ละตัวควรปรับทางไหน
// ---------------------------------------------------------------
let PW = null;
try { PW = JSON.parse(fs.readFileSync("play-wr.json", "utf8")); } catch { PW = null; }
const playOf = (id) => (PW ? PW.champs.find((c) => c.champ === id) : null);

let GW = null;
try {
  GW = JSON.parse(fs.readFileSync("game-wr.json", "utf8"));
  GW.by = Object.fromEntries(GW.rows.map((r) => [r.id, r]));
  // ค่าเฉลี่ยรายเลน — ใช้หักความเอียงของเลนออก (จังเกิ้ลได้ 70%+ ทุกตัวเพราะแกงก์)
  const lane = {};
  for (const r of GW.rows) {
    const f = r.ph.early.fights + r.ph.mid.fights + r.ph.late.fights;
    r.allPh = (r.ph.early.wr * r.ph.early.fights + r.ph.mid.wr * r.ph.mid.fights + r.ph.late.wr * r.ph.late.fights) / f;
    (lane[r.lane] = lane[r.lane] || []).push(r.allPh);
  }
  GW.laneAvg = Object.fromEntries(Object.entries(lane).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]));
  for (const r of GW.rows) {
    r.rel = r.allPh - GW.laneAvg[r.lane];      // เหนือ/ใต้ค่ากลางของเลนตัวเอง
    r.arc = r.ph.late.wr - r.ph.early.wr;      // ไต่ขึ้นหรือตกลงตอนท้าย
  }
} catch { GW = null; }

// ---------------------------------------------------------------
// คำตัดสิน — เกณฑ์ที่ผู้ออกแบบตั้งไว้
//
//   49-51%  กำลังดี ไม่ต้องแตะ
//   47-53%  ปรับเล็กน้อย
//   นอกนั้น ต้องปรับจริง
//
// ⚠️ กลุ่มตัวอย่างตอนนี้ (ตัวละราว 240 แมตช์ ±6.3) ยังละเอียดไม่พอจะแยก
// 49% ออกจาก 53% ได้จริง ตัวที่อยู่ในกรอบคลาดเคลื่อนจะติดป้าย (ยังไม่ชัด) ไว้
// ถ้าอยากยืนยันช่วง ±1 จริงต้องวัดราว 9,600 แมตช์ต่อตัว = ราว 24,000 แมตช์รวม
//
// แกนหลักคือ "ชนะแมตช์" ส่วนรูปทรงตามช่วงบอกว่าควรไปแตะตรงไหน
// ---------------------------------------------------------------
const BAND_FINE = 1;     // 49-51
const BAND_SMALL = 3;    // 47-53

function verdict(r, margin) {
  const d = r.wr - 50;
  const ad = Math.abs(d);
  const unsure = ad < (margin || 6.3) ? " *(ยังไม่ชัด)*" : "";
  const lateish = r.arc >= 10, earlyish = r.arc <= -10;
  // ไปแตะช่วงไหน — ตัวแรงที่กระจุกช่วงไหนให้กดช่วงนั้น ตัวอ่อนให้บัฟช่วงที่อ่อน
  const whereDown = earlyish ? "ที่ต้นเกมกับกลางเกม" : lateish ? "ที่เลทเกม" : "ได้ทุกช่วง";
  const whereUp = lateish ? "ที่ต้นเกม (อย่าเพิ่มเพดาน)" : earlyish ? "ที่เลทเกม" : "ได้ทุกช่วง";

  if (ad <= BAND_FINE) return ["✅ กำลังดี", "ไม่ต้องแตะ"];
  if (ad <= BAND_SMALL) {
    return d > 0
      ? ["⚪ สูงกว่าเกณฑ์เล็กน้อย" + unsure, "กดเบาๆ " + whereDown]
      : ["⚪ ต่ำกว่าเกณฑ์เล็กน้อย" + unsure, "บัฟเบาๆ " + whereUp];
  }
  // นอกเกณฑ์ — บอกด้วยว่าต้องขยับกี่แต้มถึงจะเข้ากรอบ 47-53
  const need = (ad - BAND_SMALL).toFixed(1);
  if (d > 0) {
    const tag = earlyish ? "🔴 แรงเกิน กระจุกที่ต้นเกม" : lateish ? "🔴 แรงเกิน และยิ่งโกงตอนท้าย" : "🔴 แรงเกิน";
    return [tag + unsure, "ต้องกดลงอีกราว " + need + " แต้ม — กด" + whereDown];
  }
  const tag = lateish ? "🟡 อ่อน และรอดไปไม่ถึงตอนที่ตัวเองแรง"
    : earlyish ? "🟡 อ่อน และแรงแค่ต้นเกม" : "🟡 อ่อนไป";
  return [tag + unsure, "ต้องบัฟขึ้นอีกราว " + need + " แต้ม — บัฟ" + whereUp];
}

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
  // แถบป้าย — หมวดหมู่กับความหลบได้ อ่านจบในบรรทัดเดียว
  // ต้องมีสัญลักษณ์นำ ไม่งั้นกวาดตาหาไม่เจอว่าท่าไหนอยู่หมวดอะไร
  const dg = dodgeOf(sk);
  const chips = [];
  for (const cat of categoriesOf(sk)) chips.push(`${cat.icon} **${esc(cat.th)}**`);
  if (dg.label) chips.push(`${dg.dodge ? "🟢" : "🔴"} **${esc(dg.label)}**`);
  if (sk.ult) chips.push("⭐ **ท่าไม้ตาย**");
  if (chips.length) out.push("", chips.join(" · "));
  if (dg.why) out.push("", `<sub>${esc(dg.why)}</sub>`);

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

  // ท่าย่อย — สองร่างของ LUCH และสามจังหวะของ ELLA Q
  // ดาเมจจริงอยู่ในนี้ทั้งหมด ถ้าไม่พิมพ์ออกมาเอกสารก็ว่างเปล่า
  for (const sub of subSkills(sk)) {
    const ss = sub.sk;
    out.push("", `> **${esc(sub.tag)} · ${esc(ss.th || "")}**`);
    const sent = skillSentence(ss);
    if (sent) out.push(">", "> " + esc(sent));
    const sr = rankedRows(ss).filter((r) => !r.flat && r.values.length > 1);
    for (const r of sr) {
      const vals = Array.from({ length: max }, (_, i) => fmt(r.values[i], r.fmt));
      out.push(">", `> ${esc(r.label)} — ${vals.join(" / ")}`);
    }
    const sb = [];
    for (const r of rankedRows(ss).filter((r) => r.flat)) sb.push(esc(r.label) + " " + fmt(r.values[0], r.fmt));
    for (const r of flatRows(ss)) sb.push(esc(r.label) + " " + esc(r.value));
    const sratio = ratioLine(ss);
    if (sratio) sb.push("สเกล " + esc(sratio));
    for (const f of flagLines(ss)) sb.push(esc(f));
    if (sb.length) out.push(">", "> " + sb.join(" · "));
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

  if (GW && GW.by[c.id]) {
    const g = GW.by[c.id];
    const [tag, how] = verdict(g, GW.margin);
    out.push("", `**ผลวัดในแมตช์เต็ม** — ชนะแมตช์ **${g.wr}%** · ลงเล่น ${g.games} แมตช์ · ` +
      `ฆ่า/ตาย ${g.kills}/${g.deaths} · KDA ${g.kda} · ดาเมจ ${g.dmg.toLocaleString()} · ฮีลกับโล่ ${g.heal.toLocaleString()}`);
    out.push("", "| | ต้นเกม | กลางเกม | เลทเกม | ทั้งเกม | เทียบค่ากลางเลน |");
    out.push("|---|---:|---:|---:|---:|---:|");
    out.push(`| ชนะไฟต์ | ${g.ph.early.wr}% | ${g.ph.mid.wr}% | ${g.ph.late.wr}% | **${g.allPh.toFixed(1)}%** | ${g.rel >= 0 ? "+" : ""}${g.rel.toFixed(1)} |`);
    out.push(`| เลเวลตอนนั้น | ${g.ph.early.level} | ${g.ph.mid.level} | ${g.ph.late.level} | | |`);
    out.push("", `**${tag}** — ${how}`);
  }

  if (WR && WR.by[c.id]) {
    const r = WR.by[c.id];
    out.push("", `ผลวัดตัวต่อตัว (อ้างอิงเท่านั้น) — ชนะ ${r.wr}% · ทำดาเมจ ${r.dmg} · กินดาเมจ ${r.took} · ` +
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
doc.push("> **" + BUILD_LABEL + "** — ต่อจากแพตช์ " + patchLabel(LATEST_PATCH) + " (" + LATEST_PATCH.date + ")"
  + " ยังไม่ออกเป็นเลขแพตช์ · สร้างเอกสารเมื่อ " + new Date().toISOString().slice(0, 10) + "  ");
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
doc.push("- ทุกท่ามีแถบป้ายบอก **หมวดหมู่** กับ **หลบได้ไหม** — ตารางสัญลักษณ์อยู่ท้ายหัวข้อนี้");
doc.push("  ตัวอย่างที่คิดให้ดูใช้ **AP 250** กับ **Bonus AD 120** ซึ่งเป็นระดับตอนออกของครบ");
doc.push("- **ชุดสกิลมี** อ่านจากฟิลด์จริงในข้อมูล ไม่ได้เขียนเดา ใช้ดูคร่าวๆ ว่าตัวนี้ทำอะไรได้บ้าง");
doc.push("");
doc.push("### สัญลักษณ์หมวดสกิล");
doc.push("");
doc.push("| | หมวด | หมายถึง |");
doc.push("|:-:|---|---|");
for (const c of SKILL_CATS) {
  const n = ALL.reduce((t, ch) => t + ch.skills.filter((sk) => categoriesOf(sk).some((x) => x.key === c.key)).length, 0);
  if (!n) continue;
  doc.push(`| ${c.icon} | **${c.th}** | ${c.desc} · ${n} ท่า |`);
}
doc.push("");
doc.push("| | ความหลบได้ | หมายถึง |");
doc.push("|:-:|---|---|");
doc.push("| 🟢 | **หลบได้** | มีลูกบิน มีหน่วงก่อนลง หรือเป็นโซนที่เดินออกได้ |");
doc.push("| 🔴 | **หลบไม่ได้** | ลงทันทีที่กด ไม่ว่าเดินเร็วแค่ไหนก็หนีไม่พ้น |");
doc.push("| ⭐ | **ท่าไม้ตาย** | มีแค่ 3 ขั้น |");
doc.push("");
doc.push("> จำแนกจากโค้ดในเอนจินจริง ไม่ได้ดูจากชื่อชนิดสกิล — ตรวจซ้ำได้ด้วย `node _dodgeaudit.mjs`");
if (WR) {
  doc.push(`- **ผลวัดตัวต่อตัว** มาจาก \`node _champwr.mjs ${WR.seeds} ${WR.level}\` — ทุกตัวพบกันหมด`);
  doc.push(`  ของ เลเวล และค่าสถานะนักแข่งเท่ากันทุกฝ่าย สลับสีครึ่งหนึ่ง ตัวละ **${WR.fightsEach} ไฟต์**`);
  doc.push(`  ค่าคลาดเคลื่อนราว **±${WR.margin} แต้ม** — ต่างกันน้อยกว่านี้ให้อ่านว่าเท่ากัน`);
  doc.push("");
  doc.push("  ตารางนี้เป็นไฟต์เดี่ยว ซึ่งใกล้เคียงของจริงสำหรับท็อปกับมิดที่ยืนคนเดียวอยู่แล้ว");
  doc.push("  แต่สายซัพปกติไม่ได้ยืนเดี่ยว เลขของซัพจึงต้องอ่านคู่กับคอลัมน์ฮีลกับโล่");
}
doc.push("");

if (GW) {
  // ---- ลำดับการแก้ จัดตามความมั่นใจ ไม่ใช่ตามขนาดส่วนต่าง ----
if (GW && PW) {
  const m = GW.margin || 8.9;
  const BAND = 3;            // เกณฑ์ของโปรเจกต์: 47-53 คือไม่ต้องแตะ
  const rank = [], conflict = [];
  for (const r of GW.rows) {
    const simOff = r.wr - 50;
    // เกณฑ์เข้ารายการมาจากแมตช์เต็มเท่านั้น (300 แมตช์) เพราะเป็นชุดที่สถิติแน่นพอ
    // เล่นจริง 24 แมตช์ใช้ยืนยันทิศทาง ไม่ใช้สั่งแก้เอง
    // ต่างจาก 50 ไม่เกินเกณฑ์ 47-53 หรือต้องขยับน้อยกว่า 1 แต้ม = ไม่ต้องแตะ
    if (Math.abs(simOff) - BAND < 1) continue;
    const p = playOf(r.id);
    // ไฟต์น้อยกว่า 20 ค่าคลาดเคลื่อนกว้างกว่าตัวเลขเอง ถือว่ายังไม่มีข้อมูล
    const MINF = 20;
    const rel = p && p.laneRel != null && p.fights >= MINF ? p.laneRel : null;
    const simSure = Math.abs(simOff) > m;
    // เล่นจริงบอกทิศเดียวกันไหม — ถือว่า "บอก" เมื่อห่างจากศูนย์เกิน 3 แต้ม
    const says = rel == null ? 0 : Math.abs(rel) <= 3 ? 0 : Math.sign(rel);
    const same = says !== 0 && says === Math.sign(simOff);
    const opposite = says !== 0 && says !== Math.sign(simOff);
    if (opposite && simSure) { conflict.push({ r, p, simOff, rel }); continue; }
    rank.push({ r, p, simOff, simSure, rel, same });
  }
  // ชั้น 1 แมตช์เต็มชัด + เล่นจริงยืนยันทิศเดียวกัน
  // ชั้น 2 แมตช์เต็มชัดแต่เล่นจริงเงียบ หรือแมตช์เต็มยังไม่พ้นค่าคลาดเคลื่อน
  const tier = (x) => (x.simSure && x.same ? 1 : 2);
  rank.sort((a, b) => tier(a) - tier(b) || Math.abs(b.simOff) - Math.abs(a.simOff));

  doc.push("## ลำดับการแก้ — เริ่มที่นี่");
  doc.push("");
  doc.push("จัดตาม **ความมั่นใจ** ไม่ใช่ตามขนาดส่วนต่าง เพราะตัวที่ส่วนต่างใหญ่แต่วัดมาจากตัวอย่างเล็ก");
  doc.push("ปรับไปแล้วมักเด้งกลับ ส่วนตัวที่สองวิธีเห็นตรงกันคือตัวที่ปรับแล้วขยับจริง");
  doc.push("");
  doc.push("| วัดจาก | วิธี | หน่วยที่อ่าน |");
  doc.push("|---|---|---|");
  doc.push("| แมตช์เต็ม | `node _gamewr.mjs 300` บอทสู้บอท | อัตราชนะแมตช์ · ±" + m.toFixed(1) + " |");
  doc.push("| เล่นจริง | `node _play.mjs` กดผ่านหน้าจอ " + PW.matches + " แมตช์ | ชนะไฟต์เลนเทียบค่ากลางของเลนตัวเอง |");
  doc.push("");
  doc.push("ค่ากลางชนะไฟต์ต่อเลนจากการเล่นจริง: " +
    Object.entries(PW.laneMid).map(([k, v]) => "**" + k + "** " + v + "%").join(" · "));
  doc.push("");
  doc.push("เทียบกับค่ากลางของเลนตัวเอง ไม่ใช่เทียบ 50% เพราะจังเกิลเลือกเข้าแกงก์เฉพาะไฟต์ที่ได้เปรียบ");
  doc.push("อัตราชนะไฟต์ของทั้งกลุ่มจึงถูกดันขึ้น เทียบข้ามเลนไม่มีความหมาย");
  doc.push("");

  const row = (x) => {
    const dir = x.simOff > 0 ? "กดลง" : "บัฟขึ้น";
    const need = Math.max(0, Math.abs(x.simOff) - 3).toFixed(1);
    const relTxt = x.rel == null
      ? (x.p && x.p.fights ? "ไฟต์น้อยเกินไป (" + x.p.fights + ")" : "ยังไม่ได้เล่น")
      : (x.rel >= 0 ? "+" : "") + x.rel.toFixed(1) + " (" + x.p.fights + " ไฟต์ ±" + x.p.margin + ")";
    // เล่นจริงชี้คนละทางกับแมตช์เต็ม แต่แมตช์เต็มยังไม่พ้นค่าคลาดเคลื่อน
    // ไม่ถึงขั้นเรียกว่าขัดกัน แต่ต้องเตือนไว้ ไม่งั้นอ่านแล้วเข้าใจผิด
    const warn = x.rel != null && Math.abs(x.rel) > 3 && Math.sign(x.rel) !== Math.sign(x.simOff)
      ? "<br><sub>เล่นจริงชี้ทางตรงข้าม — วัดเพิ่มก่อนปรับ</sub>" : "";
    return "| **[" + x.r.id + "](#" + x.r.id.toLowerCase().replace(/[^a-z0-9]/g, "") + ")** | " +
      x.r.lane + " | " + x.r.wr.toFixed(1) + "% | " + relTxt + " | **" + dir + " ~" + need + " แต้ม**" + warn + " |";
  };

  for (const [t, title, note] of [
    [1, "ชั้น 1 — สองวิธีเห็นตรงกัน แก้ก่อน", "แมตช์เต็มพ้นค่าคลาดเคลื่อน และเล่นจริงชี้ทิศเดียวกัน · เล่นจริงยังเป็นแค่ตัวยืนยันทิศ ยังไม่พ้นค่าคลาดเคลื่อนของตัวเอง (ต้องราว 200 แมตช์)"],
    [2, "ชั้น 2 — แมตช์เต็มเห็น แต่เล่นจริงยังไม่ยืนยัน", "เล่นจริง 24 แมตช์ยังเงียบหรือยังไม่พ้นค่าคลาดเคลื่อนของตัวเอง ปรับได้แต่อย่าปรับแรง แล้ววัดซ้ำ"],
  ]) {
    const list = rank.filter((x) => tier(x) === t);
    if (!list.length) continue;
    doc.push("### " + title);
    doc.push("");
    doc.push(note);
    doc.push("");
    doc.push("| ตัวละคร | เลน | แมตช์เต็ม | เล่นจริง (เทียบเลน) | ควรทำ |");
    doc.push("|---|---|---:|---:|---|");
    for (const x of list) doc.push(row(x));
    doc.push("");
  }

  if (conflict.length) {
    doc.push("### สองวิธีขัดกัน — อย่าแตะจนรู้ว่าทำไม");
    doc.push("");
    doc.push("ตัวพวกนี้วิธีหนึ่งบอกอ่อน อีกวิธีบอกแรง ปรับตามวิธีใดวิธีหนึ่งมีโอกาสพลาดสูง");
    doc.push("");
    doc.push("| ตัวละคร | เลน | แมตช์เต็ม | เล่นจริง (เทียบเลน) | อ่านได้ว่า |");
    doc.push("|---|---|---:|---:|---|");
    for (const x of conflict) {
      const why = x.simOff < 0 && x.rel > 0
        ? "ชนะไฟต์ในเลนตัวเองได้ แต่ทีมยังแพ้แมตช์ — ปัญหาไม่ได้อยู่ที่พลังตัวเอง"
        : "แพ้ไฟต์ในเลนตัวเอง แต่ทีมชนะแมตช์ — ตัวนี้ได้ประโยชน์จากทีม ไม่ใช่จากตัวเอง";
      doc.push("| **" + x.r.id + "** | " + x.r.lane + " | " + x.r.wr.toFixed(1) + "% | " +
        (x.rel >= 0 ? "+" : "") + x.rel.toFixed(1) + " | " + why + " |");
    }
    doc.push("");
  }

  doc.push("ที่ไม่อยู่ในสามตารางนี้ = **ไม่ต้องแตะ** ทั้งสองวิธีไม่เห็นว่าผิดปกติ");
  doc.push("");
  doc.push("---");
  doc.push("");
}

doc.push("## ภาพรวมบาลานซ์ — ตัวไหนควรปรับ");
  doc.push("");
  doc.push(`วัดจาก **${GW.games} แมตช์เต็ม** ตั้งแต่ดราฟต์จนจบ · ตัวละราว ${GW.avgGamesEach} แมตช์ · ±${GW.margin} แต้ม`);
  doc.push("");
  doc.push("**เกณฑ์ที่ตั้งไว้** — `49-51%` กำลังดี · `47-53%` ปรับเล็กน้อย · นอกนั้นต้องปรับจริง");
  doc.push("");
  doc.push(`> ⚠️ ค่าคลาดเคลื่อนตอนนี้คือ **±${GW.margin}** ซึ่งกว้างกว่าเกณฑ์ที่ตั้งไว้`);
  doc.push("> ตัวที่ห่างจาก 50% น้อยกว่านั้นจะติดป้าย *(ยังไม่ชัด)* ไว้ — ทิศทางน่าจะถูก แต่ยังยืนยันไม่ได้");
  doc.push(`> ถ้าอยากยืนยันช่วง ±1 จริง ต้องวัดราว 9,600 แมตช์ต่อตัว (ตอนนี้ ${GW.avgGamesEach})`);
  doc.push("");
  doc.push("`เทียบเลน` = อัตราชนะไฟต์ทั้งเกมของเขา ลบค่าเฉลี่ยของเลนเดียวกัน");
  doc.push("ต้องหักแบบนี้เพราะจังเกิ้ลได้ 70%+ ทุกตัวจากการเลือกลงไฟต์ที่ได้เปรียบ (แกงก์) ไม่ใช่เพราะแรงกว่า");
  doc.push("");
  doc.push("| # | ตัวละคร | ชนะแมตช์ | ต้น | กลาง | เลท | ทั้งเกม | เทียบเลน | คำตัดสิน | ควรทำ |");
  doc.push("|---:|---|---:|---:|---:|---:|---:|---:|---|---|");
  GW.rows.forEach((r, i) => {
    const c = CHAMPIONS[r.id];
    if (!c) return;
    const [tag, how] = verdict(r, GW.margin);
    doc.push(`| ${i + 1} | [${r.id}](#${anchor(r.id)}) | **${r.wr}%** | ${r.ph.early.wr} | ${r.ph.mid.wr} | ${r.ph.late.wr} | ${r.allPh.toFixed(1)} | ${r.rel >= 0 ? "+" : ""}${r.rel.toFixed(1)} | ${tag} | ${how} |`);
  });
  doc.push("");
  // อีโมจิใน JS กินสองช่อง เทียบด้วย [0] ไม่ได้ ต้องใช้ startsWith
  const todo = GW.rows.filter((r) => {
    const v = verdict(r, GW.margin)[0];
    return !v.startsWith("✅");
  });
  if (todo.length) {
    doc.push("### สรุปเฉพาะตัวที่ควรแตะ");
    doc.push("");
    for (const r of todo.sort((a, b) => Math.abs(b.wr - 50) - Math.abs(a.wr - 50))) {
      const [tag, how] = verdict(r, GW.margin);
      doc.push(`- **[${r.id}](#${anchor(r.id)})** (${r.lane}) ${tag} — ชนะแมตช์ **${r.wr}%** · ต้น→เลท ${r.arc >= 0 ? "+" : ""}${r.arc.toFixed(1)} · เทียบเลน ${r.rel >= 0 ? "+" : ""}${r.rel.toFixed(1)} → **${how}**`);
    }
    doc.push("");
  }
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
  (GW ? `แนบผลแมตช์เต็ม ${GW.games} แมตช์` : "ยังไม่มี game-wr.json (รัน node _gamewr.mjs ก่อน)") +
  (WR ? ` · ดวลเดี่ยว ${WR.fightsEach} ไฟต์ต่อตัว` : ""));
