import { buildFight } from "./src/engine/build-fight.js";
import { step } from "./src/engine/step.js";
import { makeRoster, toDef } from "./src/game/roster.js";
import { mulberry32 } from "./src/engine/util.js";
import { EVENTS } from "./src/data/tuning.js";
import { ITEM_BY_ID, applyBuy } from "./src/data/items.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { buffSum } from "./src/engine/state-util.js";
import { setLang } from "./src/i18n.js";
setLang("en");
const EV = EVENTS[Object.keys(EVENTS)[0]];

// ALUCARD เป็น Diver มีดash — เหมาะกับของสายแอสซาซิน
function run(id, seed, mortal) {
  const mk = (blue) => makeRoster(mulberry32(1400 + seed)).map((c) => {
    c.level = 14; c.gold = 99999; c.ranks = autoRanks(14, ["Q", "W", "E"]); c.style = "balanced";
    if (blue && c.lane === "JUNGLE") { c.champId = "ALUCARD"; if (id) c = applyBuy(c, ITEM_BY_ID[id]); }
    return toDef(c);
  });
  const st = buildFight(mk(true), mk(false), 900 + seed, EV);
  if (!mortal) for (const u of st.units) { u.maxHp = 1e5; u.hp = 1e5; }
  const me = st.units.find((u) => u.team === "blue" && u.lane === "JUNGLE");
  const o = { ms: 0, slow: 0, vuln: 0, pen: 0, denied: 0, wvc: 0 };
  for (let n = 0; n < 60 * 40; n++) {
    step(st);
    if (!mortal) for (const u of st.units) { if (u.hp < u.maxHp * 0.3) u.hp = u.maxHp * 0.3; u.alive = true; }
    for (const b of me.buffs) if (b.tag === "sls") o.ms = Math.max(o.ms, b.v);
    o.pen = Math.max(o.pen, me.pen);
    for (const e of st.units) {
      if (e.team === "blue") continue;
      for (const b of e.buffs) {
        if (String(b.tag || "").startsWith("adm:slow")) o.slow = Math.max(o.slow, b.v);
        if (String(b.tag || "").startsWith("adm:mark")) o.vuln = Math.max(o.vuln, b.v);
      }
    }
    if (me.fsdUsed) o.denied = 1;
    o.wvc = me.wvcGained || 0;
    if (st.over) break;
  }
  return { by: me.dealtBy, o, me };
}

const WANT = { cns: "Carnwennan", htc: "Hecate", jvb: "Jabberwock" };
console.log("=== ของที่ยิงดาเมจเอง (ไฟต์จริง ตายได้) ===");
for (const id of Object.keys(WANT)) {
  let hit = 0, dmg = 0;
  for (let s = 0; s < 8; s++) {
    const r = run(id, s, true);
    for (const k in r.by) if (k.includes(WANT[id])) { hit++; dmg = Math.max(dmg, r.by[k]); }
  }
  console.log("  " + (hit ? "✓" : "✗") + " " + id.padEnd(4) + "ดาเมจสูงสุดต่อไฟต์ " + dmg.toFixed(0) + " (" + hit + "/8 ซีด)");
}

console.log("\n=== ของที่ไม่ยิงดาเมจ ===");
const base = run(null, 1);
const smc = run("smc", 1), sls = run("sls", 1), adm = run("adm", 1);
console.log("  smc  เจาะเกราะสูงสุด", base.o.pen, "->", smc.o.pen, "(คาด +15 ใน 10 วิแรก)");
console.log("  sls  ความเร็วเดินที่ได้", (sls.o.ms * 100).toFixed(0) + "% (คาด 40%)");
console.log("  adm  สโลว์", (adm.o.slow * 100).toFixed(0) + "% · รับดาเมจแรงขึ้น", (adm.o.vuln * 100).toFixed(0) + "% (คาด 40 / 15)");

// fsd / trs / wvc ต้องมีคนตายถึงจะเห็น
let denied = 0, wvc = 0, resets = 0;
for (let s = 0; s < 8; s++) {
  if (run("fsd", s, true).o.denied) denied++;
  const w = run("wvc", s, true);
  wvc += w.o.wvc;
  const t = run("trs", s, true);
  resets += t.me.kills + t.me.assists;
}
console.log("  fsd  ปฏิเสธความตายใน", denied + "/8 ไฟต์จริง");
console.log("  wvc  แต้ม AD ที่สะสมได้รวม 8 ไฟต์:", wvc, "(= +" + wvc * 4 + " AD)");
console.log("  trs  สังหาร/ช่วยฆ่ารวม 8 ไฟต์:", resets, "ครั้ง (ทุกครั้งรีเซ็ต Q W E)");

// fms ทลายโล่
const { shieldBreakMul, incomingShieldMul } = await import("./src/engine/assassin.js");
console.log("\n=== fms ทลายโล่ ===");
console.log("  ดาเมจกินโล่ ×" + shieldBreakMul({ shieldBreak: { dmgMul: 0.5 } }).toFixed(2),
  "· โล่ที่เป้ารับใหม่ ×" + incomingShieldMul({ shieldCutUntil: 10, curT: 5, shieldCutAmt: 0.4 }).toFixed(2));
