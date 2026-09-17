import { buildFight } from "./src/engine/build-fight.js";
import { step } from "./src/engine/step.js";
import { makeRoster, toDef } from "./src/game/roster.js";
import { mulberry32 } from "./src/engine/util.js";
import { EVENTS } from "./src/data/tuning.js";
import { ITEM_BY_ID, applyBuy } from "./src/data/items.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { setLang } from "./src/i18n.js";
setLang("en");
const EV = EVENTS[Object.keys(EVENTS)[0]];

// ยัด ARIEL (Battle Mage) ลงเลนกลางแล้วแจกไอเทมทีละชิ้น
// ทุกตัวอมตะ 30 วิ เพื่อวัดว่ากลไกยิงจริงและติดป้ายที่มาถูก
function run(id, seed) {
  const mk = (blue) => makeRoster(mulberry32(1200 + seed)).map((c) => {
    c.level = 14; c.gold = 99999; c.ranks = autoRanks(14, ["Q", "W", "E"]); c.style = "balanced";
    if (blue && c.lane === "MID") { c.champId = "ARIEL"; if (id) c = applyBuy(c, ITEM_BY_ID[id]); }
    return toDef(c);
  });
  const st = buildFight(mk(true), mk(false), 700 + seed, EV);
  for (const u of st.units) { u.maxHp = 1e9; u.hp = 1e9; }
  const mage = st.units.find((u) => u.team === "blue" && u.lane === "MID");
  const probe = { slow: 0, ms: 0, mrLow: 999, burn: 0, zones: 0 };
  for (let n = 0; n < 60 * 30; n++) {
    step(st);
    for (const u of st.units) { u.hp = 1e9; u.alive = true; }
    for (const e of st.units) {
      if (e.team !== "red") continue;
      for (const b of e.buffs) {
        if (b.type === "slow" && String(b.tag || "").startsWith("yfs")) probe.slow = Math.max(probe.slow, b.v);
        if (b.type === "mrshred") probe.mrLow = Math.min(probe.mrLow, e.mr);
      }
      if (e.stcBurn) probe.burn += 1;
    }
    for (const b of mage.buffs) if (b.tag === "zgc") probe.ms = Math.max(probe.ms, b.v);
    probe.zones = Math.max(probe.zones, st.mageZones.length);
  }
  const by = {};
  for (const k in mage.dealtBy) by[k] = mage.dealtBy[k];
  return { by, probe, healGiven: mage.healGiven || 0 };
}

const WANT = {
  kff: "Kitsune", csb: "Caliburn", rsd: "Raijin", hnd: "Hel",
  mrt: "Merlin", nvs: "Nemesis", stc: "Surtr", ang: "Amrita",
};
console.log("=== ไอเทมที่ยิงดาเมจเอง — ต้องเห็นชื่อตัวเองในช่องที่มาของดาเมจ ===");
for (const id of Object.keys(WANT)) {
  let found = 0, dmg = 0, heal = 0;
  for (let s = 0; s < 4; s++) {
    const r = run(id, s);
    for (const k in r.by) if (k.includes(WANT[id])) { found += 1; dmg = Math.max(dmg, r.by[k]); }
    heal = Math.max(heal, r.healGiven);
  }
  const ok = id === "ang" ? heal > 0 : found > 0;
  console.log("  " + (ok ? "✓" : "✗ ไม่ยิง") + " " + id.padEnd(4) +
    (id === "ang" ? "ฮีลทีม " + heal.toFixed(0) : "ดาเมจสูงสุด " + dmg.toFixed(0) + " (" + found + "/4 ซีด)"));
}

console.log("\n=== ไอเทมที่ไม่ได้ยิงดาเมจ ===");
const y = run("yfs", 1), z = run("zgc", 1), h = run("hnd", 1), st2 = run("stc", 1);
console.log("  yfs  สโลว์ที่ติดศัตรู", (y.probe.slow * 100).toFixed(0) + "% (คาด 30%)");
console.log("  zgc  ความเร็วเดินที่ได้", (z.probe.ms * 100).toFixed(0) + "% (คาด 20%)");
console.log("  hnd  วงน้ำแข็งที่เปิดพร้อมกันสูงสุด", h.probe.zones, "· ต้านเวทศัตรูต่ำสุดในวง", h.probe.mrLow === 999 ? "ไม่โดน" : h.probe.mrLow);
console.log("  stc  เฟรมที่ศัตรูติดไฟ", st2.probe.burn);

// Jack — ต้องแรงขึ้นเมื่อเป้าเลือดหนากว่า
const { giantSlayerAmp } = await import("./src/engine/mage.js");
console.log("\n=== jbg Giant Slayer ===");
for (const [me, foe] of [[2000, 2000], [2000, 3000], [2000, 6000]]) {
  console.log("  เราม " + me + " HP vs ศัตรู " + foe + " HP -> ดาเมจเวท x" +
    giantSlayerAmp({ giantSlayer: 0.15, maxHp: me }, { maxHp: foe }).toFixed(3));
}

// Norns — ต้องร่ายสกิลได้ถี่ขึ้น
console.log("\n=== ntw ตัดคูลดาวน์ ===");
function casts(id) {
  let n = 0;
  for (let s = 0; s < 6; s++) {
    const mk = (blue) => makeRoster(mulberry32(1200 + s)).map((c) => {
      c.level = 14; c.gold = 99999; c.ranks = autoRanks(14, ["Q", "W", "E"]); c.style = "balanced";
      if (blue && c.lane === "MID") { c.champId = "ARIEL"; if (id) c = applyBuy(c, ITEM_BY_ID[id]); }
      return toDef(c);
    });
    const st = buildFight(mk(true), mk(false), 700 + s, EV);
    for (const u of st.units) { u.maxHp = 1e9; u.hp = 1e9; }
    const mage = st.units.find((u) => u.team === "blue" && u.lane === "MID");
    const prev = {};
    for (let k = 0; k < 60 * 30; k++) {
      step(st);
      for (const u of st.units) { u.hp = 1e9; u.alive = true; }
      for (const sk of mage.skills || []) {
        if (sk.key === "R") continue;
        if (prev[sk.key] != null && sk.cdLeft > prev[sk.key] + 0.1) n++;
        prev[sk.key] = sk.cdLeft;
      }
    }
  }
  return n / 6;
}
const a = casts(null), b = casts("ntw");
console.log("  ร่าย Q/W/E ต่อ 30 วิ — ไม่มีของ", a.toFixed(1), "· มี ntw", b.toFixed(1));
