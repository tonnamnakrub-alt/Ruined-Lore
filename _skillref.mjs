// สร้าง docs/skill-scaling.md — ใบอ้างอิงสกิลและค่าสเกลแบบละเอียดสำหรับนักพัฒนา
//
// อ่านจาก data/champions.js ตรงๆ ทุกตัวเลข ไม่มีการพิมพ์ซ้ำ
// จูนบาลานซ์แล้วรัน `node _skillref.mjs` ใหม่ เอกสารจะตรงเสมอ
//
// สิ่งที่เอกสารนี้ตั้งใจให้ต่างจากหน้าข้อมูลสกิลในเกม
//   1. โชว์ "ชื่อฟิลด์ในโค้ด" ข้างทุกตัวเลข จะได้ชี้ได้ว่าจะแก้ตัวไหน
//   2. โชว์ฟิลด์ที่ยังไม่มีป้ายชื่อด้วย — พวกนี้มีผลกับเอนจินแต่มองไม่เห็นในเกม
//   3. แปลงค่าสเกลเป็นดาเมจจริงที่ค่าสถานะอ้างอิง จะได้เทียบข้ามตัวละครได้
import fs from "fs";
import path from "path";
import { CHAMPIONS } from "./src/data/champions.js";
import { LANE_INFO } from "./src/data/lanes.js";

// ค่าสถานะอ้างอิงสำหรับคิด "ดาเมจจริง" — ตั้งจากผลวัด _matchsim ปลายเกมโหมด Normal
// (เลเวลเฉลี่ย 16.5 · ของใหญ่ 2.7 ชิ้น · มูลค่าของที่ถือ ~165g)
const REF = { ap: 300, ad: 200, bonusAd: 120, bonusHp: 1500, msOver: 60, level: 16 };

const SRC = "./src";
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|jsx)$/.test(e.name)) files.push(p);
  }
})(SRC);
const textOf = {};
for (const f of files) textOf[f.replace(/\\/g, "/")] = fs.readFileSync(f, "utf8");

// ป้ายชื่อฟิลด์ที่ skill-desc.js รู้จัก — ใช้บอกว่าอันไหน "โผล่ในเกม" อันไหนไม่
const descSrc = textOf["src/game/skill-desc.js"] || "";
const LABELLED = new Set([...descSrc.matchAll(/\["([a-zA-Z]+)"/g)].map((m) => m[1]));

// type ของสกิลถูกจัดการที่ไฟล์ไหนบ้าง
function handlers(type) {
  const hit = [];
  for (const [f, t] of Object.entries(textOf)) {
    if (/skill-desc|champions\.js|i18n|patches/.test(f)) continue;
    if (t.includes('case "' + type + '"') || t.includes('type === "' + type + '"')) {
      hit.push(f.replace("src/", ""));
    }
  }
  return hit;
}

const META = new Set(["key", "th", "type", "ult", "light", "shadow"]);
const isArr = (v) => Array.isArray(v) && v.every((x) => typeof x === "number");
const num = (v) => (Math.round(v * 1000) / 1000);

// หน่วยของแต่ละฟิลด์ — ระบุเป็นชุดชัดๆ ไม่ใช้รีเจ็กซ์กว้างๆ
// เพราะเดาผิดทีเดียวคนอ่านตัดสินใจผิดตาม เช่น soloMult 2 ไม่ใช่ "200%" แต่คือ "คูณ 2"
const MULT = new Set(["edgeMult", "soloMult", "speedMax"]);
// ratio ที่คูณกับค่าสถานะ -> อ่านเป็น % ของค่าสถานะนั้น
const STAT_RATIO = new Set(["adRatio", "badRatio", "apRatio", "armAdRatio", "bonusHpRatio", "selfBonusHp", "selfMaxHp"]);
// ตัวเลขที่เป็นสัดส่วนจริงๆ (0..1 = 0..100%)
const PCT = new Set([
  "slow", "slowByRank", "falloff", "drain", "reflect", "shred", "shredByRank", "evade",
  "burstPct", "healPct", "grace", "regen", "selfSlow", "tenacity", "cdRefundOnHit",
  "pctMaxHp", "slamPctMaxHp", "bonusPct", "adPct", "msPct", "asBuff", "charmSlow",
  "selfSlow", "upPctMaxHp", "landSlow", "breakSlow", "slowFlat", "drainByRank",
]);
// ต่อหน่วย ไม่ใช่เปอร์เซ็นต์ — เช่น msRatio 0.5 = ดาเมจ +0.5 ต่อความเร็วเดินที่เกินฐาน 1 หน่วย
const PER_UNIT = { msRatio: "ต่อ 1 ความเร็วเดินที่เกินฐาน", selfStacks: "ต่อ 1 สแตก", pctPerBad: "% Max HP ต่อ Bonus AD 100" };

function val(k, v) {
  if (typeof v === "boolean") return v ? "ใช่" : "ไม่";
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return "`" + JSON.stringify(v) + "`";
  if (typeof v !== "number") return String(v);
  if (MULT.has(k)) return "×" + num(v);
  if (PER_UNIT[k]) return num(v) + " " + PER_UNIT[k];
  if (STAT_RATIO.has(k) || PCT.has(k)) return num(v * 100) + "%";
  return String(num(v));
}

// ดาเมจจริงที่ค่าสถานะอ้างอิง
function effective(sk) {
  const base = isArr(sk.dmg) ? sk.dmg[sk.dmg.length - 1] : (typeof sk.dmg === "number" ? sk.dmg : null);
  if (base == null) return null;
  const parts = [String(base)];
  let total = base;
  const add = (ratio, statName, statVal) => {
    if (!ratio) return;
    total += ratio * statVal;
    parts.push(num(ratio * statVal) + " (" + statName + ")");
  };
  add(sk.apRatio, "AP", REF.ap);
  add(sk.adRatio, "AD", REF.ad);
  add(sk.badRatio, "Bonus AD", REF.bonusAd);
  add(sk.armAdRatio, "AD/แขน", REF.ad);
  add(sk.bonusHpRatio, "Bonus HP", REF.bonusHp);
  // ARIEL สเกลตามความเร็วเดินส่วนที่เกินฐาน 345
  add(sk.msRatio, "ความเร็วเดินส่วนเกิน", REF.msOver);
  if (parts.length === 1) return null;
  return { total: Math.round(total), parts };
}

const L = [];
const out = (s = "") => L.push(s);

out("# Skill & Stat Scaling — ใบอ้างอิงสำหรับนักพัฒนา");
out("");
out("> **ไฟล์นี้สร้างอัตโนมัติ ห้ามแก้ด้วยมือ** — แก้ตัวเลขที่ [src/data/champions.js](../src/data/champions.js)");
out("> แล้วรัน `node _skillref.mjs` ใหม่");
out("");
out("ทุกตัวเลขมี **ชื่อฟิลด์ในโค้ด** กำกับ เวลาจะสั่งแก้ให้ชี้ที่ชื่อฟิลด์ได้เลย");
out("เช่น *\"ARIEL Q `apRatio` จาก 0.55 เป็น 0.65\"* หรือ *\"FAUSTUS `hp` 540 น้อยไป ขอ 580\"*");
out("");
out("### ค่าสถานะอ้างอิงที่ใช้คิดคอลัมน์ \"ดาเมจจริง\"");
out("");
out("| AP | AD | Bonus AD | Bonus HP | ความเร็วเดินส่วนเกิน |");
out("|---|---|---|---|---|");
out(`| ${REF.ap} | ${REF.ad} | ${REF.bonusAd} | ${REF.bonusHp} | ${REF.msOver} |`);
out("");
out("ตั้งจากผลวัด `_matchsim` ปลายเกมโหมด Normal (เลเวลเฉลี่ย 16.5 · ของใหญ่ 2.7 ชิ้น · มูลค่าของ ~165g)");
out("คอลัมน์นี้ทำให้เทียบสกิลข้ามตัวละครได้ เพราะ `dmg` ดิบอย่างเดียวเทียบไม่ได้เมื่อ ratio ต่างกัน");
out("");
out("---");
out("");

// ---------- ตารางรวมค่าสถานะฐาน ----------
out("## 1. ค่าสถานะฐานทุกตัว");
out("");
out("วงเล็บ = ค่าที่เพิ่มต่อเลเวล (ฟิลด์ลงท้าย `G`) · คอลัมน์ Lv16 คือค่าจริงตอนปลายเกม");
out("");
out("| ตัวละคร | บทบาท | เลน | `value` | `hp` / `hpG` | HP@16 | `ad` / `adG` | AD@16 | `armor`/`armorG` | `mr`/`mrG` | `as`/`asG` | `ms` | `range` |");
out("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const [id, c] of Object.entries(CHAMPIONS)) {
  const g = 15;
  const lanes = [c.lane, ...(c.alsoLanes || [])].join("/");
  out(`| **${id}** | ${c.role} | ${lanes} | ${c.value ?? 1} | ${c.hp} / ${c.hpG} | ${c.hp + c.hpG * g} | ${c.ad} / ${c.adG} | ${num(c.ad + c.adG * g)} | ${c.armor} / ${c.armorG} | ${c.mr} / ${c.mrG} | ${c.as} / ${c.asG} | ${c.ms} | ${c.range} |`);
}
out("");
out("> `value` คือ \"ความคุ้มที่จะโฟกัส\" ที่ AI ใช้เลือกเป้า — ยิ่งสูงยิ่งโดนรุมก่อน (ดู `engine/targeting.js`)");
out("> เลเวลสูงสุดต่างกันตามเลน: " + Object.entries(LANE_INFO).map(([k, v]) => k + " " + v.maxLevel).join(" · "));
out("");
out("---");
out("");

// ---------- รายตัวละคร ----------
out("## 2. สกิลรายตัวละคร");
out("");
for (const [id, c] of Object.entries(CHAMPIONS)) {
  out(`### ${id} — ${c.th}`);
  out("");
  const lanes = [c.lane, ...(c.alsoLanes || [])].join(" / ");
  out(`\`${c.role}\` · ${c.melee ? "ประชิด" : "ระยะไกล"} ${c.range} · เลน ${lanes} · \`value\` ${c.value ?? 1}`);
  out("");
  if (c.passive) {
    out(`**พาสซีฟ — ${c.passive.th}**`);
    out("");
    out("> " + String(c.passive.desc).replace(/\n/g, " "));
    out("");
  }
  // ฟิลด์พิเศษระดับตัวละคร (นอกเหนือจากค่าสถานะมาตรฐาน)
  const STD = new Set(["id", "th", "role", "lane", "alsoLanes", "melee", "value", "range", "skills", "passive",
    "hp", "hpG", "hp5", "hp5G", "ad", "adG", "armor", "armorG", "mr", "mrG", "as", "asG", "ms",
    "skillPriority", "missile", "windup", "radius"]);
  const extra = Object.keys(c).filter((k) => !STD.has(k));
  if (extra.length) {
    out("**กลไกเฉพาะตัว (ฟิลด์ระดับตัวละคร)**");
    out("");
    out("| ฟิลด์ | ค่า |");
    out("|---|---|");
    for (const k of extra) out(`| \`${k}\` | ${val(k, c[k])} |`);
    out("");
  }

  for (const sk of c.skills) {
    const forms = sk.type === "dual"
      ? [["ร่างแสง", sk.light], ["ร่างเงา", sk.shadow]]
      : [[null, sk]];
    const maxRank = sk.ult ? 3 : 5;
    out(`#### ${sk.key} · ${sk.th}${sk.ult ? "  🟡 ท่าไม้ตาย" : ""}`);
    out("");
    const hs = handlers(sk.type);
    out(`\`type: "${sk.type}"\`${hs.length ? " — จัดการที่ " + hs.map((h) => "`" + h + "`").join(", ") : " — **หาไม่เจอว่าเอนจินจัดการที่ไหน**"}`);
    out("");

    for (const [formName, body] of forms) {
      if (formName) { out(`**${formName} — ${body.th || sk.th}**`); out(""); }
      const keys = Object.keys(body).filter((k) => !META.has(k));
      const ranked = keys.filter((k) => isArr(body[k]) && body[k].length >= 2);
      const ratios = keys.filter((k) => /Ratio$|pctPerBad|msRatio|selfBonusHp|selfStacks|selfMaxHp/.test(k) && !isArr(body[k]));
      const flat = keys.filter((k) => !ranked.includes(k) && !ratios.includes(k));

      if (ranked.length) {
        out("| ฟิลด์ | " + Array.from({ length: maxRank }, (_, i) => "แรงก์ " + (i + 1)).join(" | ") + " |");
        out("|---" + "|---".repeat(maxRank) + "|");
        for (const k of ranked) {
          const a = body[k];
          const cells = Array.from({ length: maxRank }, (_, i) => (a[i] != null ? val(k, a[i]) : "—"));
          out(`| \`${k}\`${LABELLED.has(k) ? "" : " ⚠️"} | ${cells.join(" | ")} |`);
        }
        out("");
      }
      if (ratios.length) {
        out("**ค่าสเกล**  " + ratios.map((k) => "`" + k + "` " + val(k, body[k])).join(" · "));
        out("");
      }
      const eff = effective(body);
      if (eff) {
        out(`**ดาเมจจริงที่แรงก์สูงสุด (ค่าอ้างอิง):** \`${eff.total}\`  =  ${eff.parts.join(" + ")}`);
        out("");
      }
      if (flat.length) {
        out("| ค่าคงที่ | ค่า | | ค่าคงที่ | ค่า |");
        out("|---|---|---|---|---|");
        for (let i = 0; i < flat.length; i += 2) {
          const a = flat[i], b = flat[i + 1];
          const cell = (k) => k ? `\`${k}\`${LABELLED.has(k) ? "" : " ⚠️"} | ${val(k, body[k])}` : " | ";
          out(`| ${cell(a)} | | ${cell(b)} |`);
        }
        out("");
      }
    }
  }
  out("---");
  out("");
}

// ---------- ฟิลด์ที่ไม่มีป้ายชื่อ ----------
out("## 3. ฟิลด์ที่ยังไม่มีป้ายชื่อ ⚠️");
out("");
out("ฟิลด์พวกนี้ **มีผลกับเอนจินจริง** แต่ `game/skill-desc.js` ไม่รู้จัก");
out("เลย **ไม่โผล่ในหน้าข้อมูลสกิลในเกม** — ผู้เล่นมองไม่เห็นว่ามีอยู่");
out("");
out("อยากให้โผล่: เติมแถวในตาราง `RANKED` / `FLAT` / `RATIOS` / `FLAGS` ใน [src/game/skill-desc.js](../src/game/skill-desc.js)");
out("");
const seen = {};
for (const [id, c] of Object.entries(CHAMPIONS)) {
  for (const sk of c.skills) {
    const walk = (o, tag) => {
      for (const k of Object.keys(o)) {
        if (META.has(k)) continue;
        if (LABELLED.has(k)) continue;
        (seen[k] = seen[k] || []).push(id + "." + sk.key + tag);
      }
    };
    walk(sk, "");
    if (sk.light) walk(sk.light, "(แสง)");
    if (sk.shadow) walk(sk.shadow, "(เงา)");
  }
}
out("| ฟิลด์ | ใช้กี่ที่ | ที่ไหนบ้าง |");
out("|---|---|---|");
for (const [k, where] of Object.entries(seen).sort((a, b) => b[1].length - a[1].length)) {
  out(`| \`${k}\` | ${where.length} | ${where.slice(0, 6).join(", ")}${where.length > 6 ? " …" : ""} |`);
}
out("");
out(`รวม **${Object.keys(seen).length} ฟิลด์** ที่ยังไม่มีป้ายชื่อ`);
out("");

// ---------- คูลดาวน์ที่มองไม่เห็น ----------
const cdOnly = [];
for (const [id, c] of Object.entries(CHAMPIONS)) {
  for (const sk of c.skills) if (sk.cd != null && !sk.cdByRank) cdOnly.push({ id, sk });
}
if (cdOnly.length) {
  out("### 3.1 คูลดาวน์ที่ผู้เล่นมองไม่เห็น");
  out("");
  out("หน้าข้อมูลสกิลอ่านคูลดาวน์จาก `cdByRank` อย่างเดียว");
  out("สกิลพวกนี้มีแต่ `cd` ตัวเดียว (คูลดาวน์เท่ากันทุกแรงก์) — เอนจินใช้จริง แต่ **ไม่โผล่ในเกม**");
  out("");
  out("| สกิล | `cd` | หมายเหตุ |");
  out("|---|---|---|");
  for (const { id, sk } of cdOnly) {
    const note = sk.cd === 0 ? "คูลดาวน์ 0 — คุมด้วยทรัพยากรอย่างอื่นแทน" : "คูลดาวน์คงที่ทุกแรงก์";
    out(`| ${id} ${sk.key} · ${sk.th} | ${sk.cd} | ${note} |`);
  }
  out("");
  out("แก้ให้เห็นได้สองทาง: เปลี่ยนเป็น `cdByRank` หรือเติม `[\"cd\", \"คูลดาวน์\", \"sec\"]` ในตาราง `FLAT`");
  out("");
}

// ---------- ตัวเลขถูกเอาไปใช้ที่ไหน ----------
out("---");
out("");
out("## 4. ตัวเลขแต่ละชนิดถูกเอาไปใช้ที่ไหน");
out("");
out("| อยากแก้ | แก้ที่ | ใครอ่านค่าไปใช้ |");
out("|---|---|---|");
out("| ค่าสถานะฐาน + ต่อเลเวล (`hp` `hpG` `ad` `adG` …) | `data/champions.js` | `engine/stats.js` → `deriveStats()` |");
out("| ตัวเลขสกิลต่อแรงก์ (`dmg` `cdByRank` …) | `data/champions.js` | `engine/fire-skill.js` ตอนกด · `engine/damage.js` ตอนเข้าเป้า |");
out("| ค่าสเกล (`apRatio` `badRatio` …) | `data/champions.js` | `engine/damage.js` → `skillPower()` |");
out("| คูลดาวน์จริงหลังหัก Ability Haste | — | `engine/stats.js` → `fullCd()` |");
out("| เงื่อนไขว่าบอทจะกดสกิลตอนไหน | `engine/ai.js` → `shouldCast()` | แยกตาม `type` ของสกิล |");
out("| พาสซีฟตัวละคร | เขียนมือใน `engine/` | `on-hit.js` `systems.js` หรือไฟล์เฉพาะตัว (`laura.js` `alice.js` `klaeder.js`) |");
out("| ป้ายชื่อฟิลด์ที่โชว์ในเกม | `game/skill-desc.js` | ตาราง `RANKED` `FLAT` `RATIOS` `FLAGS` |");
out("");
out("> ⚠️ เพิ่มฟิลด์ใหม่ใน `champions.js` เฉยๆ **ไม่มีผลอะไร** ถ้าไม่มีโค้ดในเอนจินอ่านมัน");
out("> และจะ **ไม่โผล่ในเกม** ถ้าไม่เติมป้ายชื่อใน `skill-desc.js` — เป็นสองเรื่องแยกกัน");
out("");

fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync("docs/skill-scaling.md", L.join("\n"));
console.log("เขียน docs/skill-scaling.md — " + L.length + " บรรทัด · " +
  Object.keys(CHAMPIONS).length + " ตัวละคร · " + Object.keys(seen).length + " ฟิลด์ไม่มีป้าย");
