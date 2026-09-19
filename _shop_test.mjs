import { shopFor, champProfile, readThreat } from "./src/game/shop-ai.js";
import { makeRoster } from "./src/game/roster.js";
import { mulberry32 } from "./src/engine/util.js";
import { CHAMPIONS } from "./src/data/champions.js";
import { ITEM_BY_ID } from "./src/data/items.js";

const rand = mulberry32(9);
// 1) profile every champion
console.log("--- champion profiles ---");
for (const id in CHAMPIONS) {
  const p = champProfile(id);
  console.log(id.padEnd(9), (p.apChamp ? "AP" : "AD"), "| role", p.role.padEnd(12), "| taste", (p.taste || ["(lane)"]).join(">"));
}

// 2) shop each lane against two very different enemy teams
function team(seed, level, gold) {
  return makeRoster(mulberry32(seed)).map((c) => ({ ...c, level, gold, items: [] }));
}
function show(label, enemies) {
  console.log("\n--- " + label + " ---");
  for (const c of team(5, 12, 260)) {
    const out = shopFor(c, enemies, rand);
    const cats = out.items.map((i) => i.cat);
    console.log(
      c.lane.padEnd(8), (c.champId || "?").padEnd(9),
      out.items.map((i) => i.id).join(" ").padEnd(30),
      "| " + [...new Set(cats)].join(","),
      "| armor", out.items.reduce((a, i) => a + (i.armor || 0), 0),
      "mr", out.items.reduce((a, i) => a + (i.mr || 0), 0),
      "| antiheal", out.items.some((i) => i.antihealOnDmg) ? "YES" : "-"
    );
  }
}
const apTeam = team(11, 12, 0).map((c) => ({ ...c, champId: "ARIEL", items: [ITEM_BY_ID.tet, ITEM_BY_ID.cyw] }));
const adTeam = team(11, 12, 0).map((c) => ({ ...c, champId: "KAZEM", items: [ITEM_BY_ID.dwe, ITEM_BY_ID.wha] }));
const healTeam = team(11, 12, 0).map((c) => ({ ...c, champId: "PINO", items: [ITEM_BY_ID.ats, ITEM_BY_ID.yrh] }));
const tankTeam = team(11, 12, 0).map((c) => ({ ...c, champId: "KAZEM", items: [ITEM_BY_ID.ghs, ITEM_BY_ID.aoi, ITEM_BY_ID.nlm] }));
console.log("\nthreat readings:");
console.log("  vs AP team  ", JSON.stringify(readThreat(apTeam), (k, v) => typeof v === "number" ? +v.toFixed(2) : v));
console.log("  vs AD team  ", JSON.stringify(readThreat(adTeam), (k, v) => typeof v === "number" ? +v.toFixed(2) : v));
console.log("  vs heal team", JSON.stringify(readThreat(healTeam), (k, v) => typeof v === "number" ? +v.toFixed(2) : v));
console.log("  vs tank team", JSON.stringify(readThreat(tankTeam), (k, v) => typeof v === "number" ? +v.toFixed(2) : v));
show("vs an all-AP team", apTeam);
show("vs an all-AD team", adTeam);
show("vs a healing team", healTeam);
show("vs a fat tank team", tankTeam);
