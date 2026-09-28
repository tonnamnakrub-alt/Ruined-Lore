// ---------------------------------------------------------------
// เงินค่าหัวคิดถูกไหม — ตรวจว่าจำนวน "สังหาร" ที่เอนจินนับ
// ตรงกับจำนวนครั้งที่มีคนล้มจริงๆ ในสนาม
//
// วิธีตรวจ: เฝ้าดูทุกเฟรมว่ามีใครเปลี่ยนจากเป็นเป็นตายบ้าง (นับเป็นหนึ่งครั้ง)
// ตัวที่ฟื้นกลับมาแล้วตายอีกก็นับเพิ่ม เพราะต้องฆ่าใหม่จริงๆ
// แล้วเทียบกับผลรวมของ u.kills ทุกคน ถ้าเกินแปลว่ามีการนับซ้ำ
//
//   node _killcount_test.mjs [จำนวนไฟต์]
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";
import { shopFor } from "./src/game/shop-ai.js";
import { mulberry32 } from "./src/engine/util.js";

const N = Number(process.argv[2] || 200);
const LVL = 13;
const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));
const IDS = Object.keys(CHAMPIONS);

const base = (lane, id) => ({
  lane, champId: id, level: LVL, xp: 0, gold: 300, items: [],
  ranks: autoRanks(LVL, CHAMPIONS[id].skillPriority, null),
  athlete: flat(6), upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE",
});

function squad(rng) {
  const roster = LANES.map((l) => base(l, IDS[Math.floor(rng() * IDS.length)]));
  return roster.map((c) => toDef(shopFor(c, roster, rng, 0)));
}

const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);

let totalKills = 0, totalDeaths = 0, totalAssists = 0;
const suspects = [];
// ตัวที่ฟื้นกลับมาได้ — ตายซ้ำของพวกนี้เป็นเรื่องปกติ ไม่ใช่บั๊ก
const revivers = new Set();
for (const id of IDS) {
  const ch = CHAMPIONS[id];
  if ((ch.skills || []).some((s) => s.type === "lastStand" || s.type === "vampForm")) revivers.add(id);
  if (ch.duel) revivers.add(id);          // PUSS ชีวิตที่เก้า
}

for (let s = 1; s <= N; s++) {
  const rng = mulberry32(s * 7919 + 13);
  const st = buildFight(squad(rng), squad(rng), s * 31 + 7, DEFAULT_FIGHT);
  const wasAlive = new Map(st.units.map((u) => [u.id, u.alive]));
  const deathsOf = new Map(st.units.map((u) => [u.id, 0]));
  let g = 0;
  while (!st.over && g++ < 60 * 200) {
    step(st);
    for (const u of st.units) {
      const was = wasAlive.get(u.id);
      if (was && !u.alive) deathsOf.set(u.id, deathsOf.get(u.id) + 1);
      wasAlive.set(u.id, u.alive);
    }
  }
  const deaths = [...deathsOf.values()].reduce((a, b) => a + b, 0);
  const kills = st.units.reduce((a, u) => a + u.kills, 0);
  totalDeaths += deaths;
  totalKills += kills;
  totalAssists += st.units.reduce((a, u) => a + u.assists, 0);
  if (kills > deaths) {
    suspects.push({ seed: s, kills, deaths,
      who: st.units.filter((u) => u.kills).map((u) => u.champ.id + " " + u.kills).join(" · "),
      died: st.units.filter((u) => deathsOf.get(u.id)).map((u) => u.champ.id + " ×" + deathsOf.get(u.id)).join(" · ") });
  }
  // ตัวที่ตายมากกว่าหนึ่งครั้งโดยไม่มีกลไกฟื้น = ผิดแน่
  for (const u of st.units) {
    if (deathsOf.get(u.id) > 1 && !revivers.has(u.champ.id) && !(u.hasItem && u.hasItem("soo"))) {
      suspects.push({ seed: s, kills, deaths, who: "ตายซ้ำโดยไม่มีกลไกฟื้น: " + u.champ.id, died: "×" + deathsOf.get(u.id) });
    }
  }
}

console.log("ไฟต์ที่วัด " + N + " ครั้ง");
console.log("  คนล้มจริงในสนาม  " + totalDeaths);
console.log("  สังหารที่เอนจินนับ " + totalKills);
console.log("  ช่วยสังหาร        " + totalAssists);
console.log("");

t("จำนวนสังหารไม่เกินจำนวนคนที่ล้มจริง", totalKills <= totalDeaths,
  totalKills + " สังหาร · " + totalDeaths + " คนล้ม" + (totalKills > totalDeaths ? "  ← เกินมา " + (totalKills - totalDeaths) : ""));
t("ไม่มีไฟต์ไหนนับสังหารเกินคนล้ม", suspects.length === 0,
  suspects.length ? suspects.length + " ไฟต์ผิด · ตัวอย่าง seed " + suspects[0].seed +
    " (สังหาร " + suspects[0].kills + " · ล้ม " + suspects[0].deaths + " · " + suspects[0].who + " | ล้ม: " + suspects[0].died + ")"
    : "ตรวจครบ " + N + " ไฟต์");
// คนล้มที่ไม่มีใครได้เครดิต = ตายด้วยดาเมจต่อเนื่องหลังคนยิงตายไปแล้ว ซึ่งเป็นไปได้
t("สังหารกับคนล้มต่างกันไม่เกิน 5%", Math.abs(totalDeaths - totalKills) <= totalDeaths * 0.05,
  "ต่างกัน " + (totalDeaths - totalKills) + " จาก " + totalDeaths);

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(44) + " " + d); }
if (suspects.length) {
  console.log("\nไฟต์ที่น่าสงสัย (สูงสุด 10):");
  for (const x of suspects.slice(0, 10)) {
    console.log("  seed " + String(x.seed).padStart(4) + " · สังหาร " + x.kills + " · ล้ม " + x.deaths + " · " + x.who + " | ล้ม: " + x.died);
  }
}
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
