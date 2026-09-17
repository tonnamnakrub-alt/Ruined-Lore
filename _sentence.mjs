import { CHAMPIONS } from "./src/data/champions.js";
import { skillSentence } from "./src/game/skill-desc.js";
import { setLang } from "./src/i18n.js";
for (const id of ["ARIEL", "KAZEM", "PINO", "C.HOOK"]) {
  console.log("=== " + id);
  for (const sk of CHAMPIONS[id].skills) {
    console.log("  " + sk.key + " " + (sk.th || "") + "\n     " + skillSentence(sk));
  }
}
