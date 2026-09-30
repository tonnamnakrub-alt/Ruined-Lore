// ---------------------------------------------------------------
// ตรวจว่าการจำแนก "หลบได้/หลบไม่ได้" ตรงกับโค้ดจริงไหม
//
// ไม่เชื่อชื่อชนิดสกิล แต่ไปอ่านบล็อก case ของชนิดนั้นในเอนจิน แล้วดูสัญญาณ:
//   state.projectiles.push  -> มีลูกบินจริง = หลบได้
//   state.zones.push        -> วางโซนไว้ = หลบได้
//   applyDamage ในบล็อก     -> ลงทันทีในเฟรมเดียว = หลบไม่ได้
//
// แล้วเทียบกับที่ skill-kind.js บอก ถ้าไม่ตรงจะรายงานให้ไปดูเอง
//
//   node _dodgeaudit.mjs
// ---------------------------------------------------------------
import fs from "fs";
import { CHAMPIONS } from "./src/data/champions.js";
import { dodgeOf } from "./src/game/skill-kind.js";

const FILES = ["fire-skill.js", "lore.js", "lore-p4.js", "alice.js", "laura.js", "klaeder.js", "kazem.js", "motion.js", "assassin.js", "mage.js"];
const SRC = {};
for (const f of FILES) {
  try { SRC[f] = fs.readFileSync("src/engine/" + f, "utf8").replace(/\r\n/g, "\n"); } catch { /* ไม่มีก็ข้าม */ }
}

// ดึงบล็อก case "<type>": { ... } ออกมาจากไฟล์ไหนก็ได้ที่มี
function blockOf(type) {
  for (const [f, s] of Object.entries(SRC)) {
    const head = `case "${type}": {`;
    const i = s.indexOf(head);
    if (i < 0) continue;
    let depth = 0, j = i + head.length - 1;
    for (; j < s.length; j++) {
      if (s[j] === "{") depth++;
      else if (s[j] === "}") { depth--; if (depth === 0) { j++; break; } }
    }
    return { file: f, text: s.slice(i, j) };
  }
  return null;
}

// ตามรอยฟังก์ชันที่บล็อกนั้นเรียกต่อ เช่น case "rebound" -> rebound()
function follow(text) {
  let out = text;
  for (const m of text.matchAll(/\b([a-z][A-Za-z0-9]*)\(state,/g)) {
    const fn = m[1];
    for (const s of Object.values(SRC)) {
      const re = new RegExp("function " + fn + "\\(", "g");
      const i = s.search(re);
      if (i < 0) continue;
      let depth = 0, j = s.indexOf("{", i);
      const start = j;
      for (; j < s.length; j++) {
        if (s[j] === "{") depth++;
        else if (s[j] === "}") { depth--; if (depth === 0) { j++; break; } }
      }
      out += "\n" + s.slice(start, j);
      break;
    }
  }
  return out;
}

const rows = [];
for (const c of Object.values(CHAMPIONS)) {
  for (const sk of c.skills) {
    const d = dodgeOf(sk);
    if (d.dodge === null) continue;
    const b = blockOf(sk.type);
    if (!b) { rows.push({ c, sk, d, code: null }); continue; }
    let t = follow(b.text);
    // บล็อกเดียวมักมีหลายสาขา เช่น line มีทั้งทาง instant และทางยิงลูก
    // ถ้าข้อมูลของท่านี้ตั้ง instant ไว้ ให้ตัดสาขาที่ยิงลูกออกก่อนตรวจ
    if (sk.instant) {
      const i = t.indexOf("if (sk.instant) {");
      if (i >= 0) {
        let depth = 0, j = t.indexOf("{", i);
        const start = j;
        for (; j < t.length; j++) {
          if (t[j] === "{") depth++;
          else if (t[j] === "}") { depth--; if (depth === 0) { j++; break; } }
        }
        t = t.slice(start, j);
      }
    }
    const code = {
      proj: /state\.projectiles\.push/.test(t),
      zone: /state\.zones\.push|state\.mirrors\.push|\.thorns\.push|\.pets\.push|\.walls\.push|\.bunkers\.push|\.cages\.push/.test(t),
      hit: /applyDamage\(/.test(t),
      // ล็อก "เป้า" ไว้ — จับหรือไล่ตามแบบล็อกเป้า เป้าดิ้นไม่หลุด
      // ระวัง: u.channeling กับ castLock ล็อก "คนร่าย" ไม่ใช่เป้า อย่าเอามานับ
      // (FAUSTUS R กับ STEIN R ยืนนิ่งเองเพื่อร่าย แต่ของที่ลงยังหลบได้ตามปกติ)
      lock: /state\.grabs\.push|u\.chasing\s*=/.test(t),
      file: b.file,
    };
    rows.push({ c, sk, d, code });
  }
}

// โค้ดบอกว่าอะไร
function fromCode(code) {
  if (!code) return null;
  if (code.lock) return false;         // จับล็อก/ไล่ตาม = ดิ้นไม่หลุด
  if (code.proj) return true;          // มีลูกบิน = หลบได้
  if (code.zone) return true;          // วางโซน = หลบได้
  if (code.hit) return false;          // ลงทันทีในเฟรมเดียว = หลบไม่ได้
  return null;
}

const bad = [];
for (const r of rows) {
  const says = fromCode(r.code);
  if (says === null) continue;
  if (says !== r.d.dodge) bad.push({ ...r, says });
}

console.log("=== ตรวจ " + rows.length + " ท่าที่ทำดาเมจ ===\n");
if (!bad.length) {
  console.log("✅ การจำแนกตรงกับโค้ดทุกท่า");
} else {
  console.log("❌ ไม่ตรง " + bad.length + " ท่า — ต้องไปดูโค้ดเอง\n");
  console.log("ตัวละคร      ท่า  ชนิด             จำแนกว่า      โค้ดบอกว่า   ไฟล์");
  for (const r of bad) {
    console.log(r.c.id.padEnd(12) + r.sk.key.padEnd(4) + r.sk.type.padEnd(16) +
      (r.d.dodge ? "หลบได้" : "หลบไม่ได้").padEnd(14) +
      (r.says ? "หลบได้" : "หลบไม่ได้").padEnd(13) + r.code.file);
  }
}

const noCode = rows.filter((r) => !r.code);
if (noCode.length) {
  console.log("\n⚠️ หาบล็อกโค้ดไม่เจอ " + noCode.length + " ท่า (ตรวจอัตโนมัติไม่ได้ ต้องดูเอง):");
  for (const r of noCode) console.log("  " + r.c.id.padEnd(12) + r.sk.key + "  " + r.sk.type);
}
