import { CHAMPIONS } from "./src/data/champions.js";
import { skillSentence } from "./src/game/skill-desc.js";
import { setLang } from "./src/i18n.js";
setLang("en");
let leaks = 0;
for (const id in CHAMPIONS) {
  for (const sk of CHAMPIONS[id].skills) {
    const t = skillSentence(sk);
    if (/[฀-๿]/.test(t)) { leaks++; console.log("LEAK " + id + " " + sk.key + ": " + t); }
  }
}
console.log("\nตัวอย่าง ARIEL E:", skillSentence(CHAMPIONS.ARIEL.skills.find((s) => s.key === "E")));
console.log("ตัวอย่าง KAZEM R:", skillSentence(CHAMPIONS.KAZEM.skills.find((s) => s.key === "R")));
console.log(leaks ? "FAIL " + leaks : "ALL EN OK");
