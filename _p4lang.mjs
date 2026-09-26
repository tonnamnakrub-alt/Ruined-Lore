// ---------------------------------------------------------------
// กวาดหน้าข้อมูลตัวละครทั้งเกมในโหมดอังกฤษ หาไทยที่หลุดออกมา
//
// _mm_lang.mjs กวาดฝั่งไอเทม ตัวนี้กวาดฝั่งตัวละคร — ชื่อ พาสซีฟ
// ชื่อท่า รูปแบบท่า ประโยคบรรยาย แถวตัวเลข และบรรทัดสเกล ครบทุกจุดที่หน้าจอวาด
// ---------------------------------------------------------------
import { setLang, tr } from "./src/i18n.js";
import { CHAMPIONS } from "./src/data/champions.js";
import * as D from "./src/game/skill-desc.js";

setLang("en");
const THAI = /[฀-๿]/;
let leaks = 0;
const seen = new Set();
const check = (where, text) => {
  const s = String(text == null ? "" : text);
  if (!THAI.test(s) || seen.has(s)) return;
  seen.add(s);
  leaks++;
  console.log("LEAK " + where.padEnd(22) + " -> " + s);
};

for (const ch of Object.values(CHAMPIONS)) {
  const who = ch.id;
  check(who + " name", tr(ch.th));
  check(who + " role", tr(ch.role));
  if (ch.passive) {
    check(who + " passive.th", tr(ch.passive.th));
    check(who + " passive.desc", tr(ch.passive.desc));
  }
  for (const sk of ch.skills) {
    // ไล่ทุกแรงก์ เพราะบางประโยคเปลี่ยนตามแรงก์
    for (const rank of [1, 3, 5]) {
      const live = { ...sk, rank: Math.min(rank, sk.ult ? 3 : 5) };
      check(who + " " + sk.key + " title", D.skillTitle(live, ch));
      check(who + " " + sk.key + " shape", D.skillShape(live, ch));
      check(who + " " + sk.key + " sentence", D.skillSentence(live, ch));
      check(who + " " + sk.key + " ratio", D.ratioLine(live, ch));
      for (const r of D.rankedRows(live, ch) || []) check(who + " " + sk.key + " rank", r.label);
      for (const r of D.flatRows(live, ch) || []) check(who + " " + sk.key + " flat", r.label);
      for (const r of D.flagLines(live, ch) || []) check(who + " " + sk.key + " flag", r);
      for (const r of D.subSkills ? (D.subSkills(live, ch) || []) : []) {
        check(who + " " + sk.key + " sub", typeof r === "string" ? r : (r.label || r.th || ""));
      }
    }
  }
}

console.log(leaks ? "\nFAIL — ไทยหลุดในโหมดอังกฤษ " + leaks + " จุด" : "ALL EN OK — " + Object.keys(CHAMPIONS).length + " ตัว");
process.exit(leaks ? 1 : 0);
