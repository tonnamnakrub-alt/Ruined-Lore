// ---------------------------------------------------------------
// ท่าไหนของตัวแพตช์ 0.6 ที่บอท "ใช้จริง" ในแมตช์เต็ม
//
// ทำไมต้องมี: ai.js ตัดสินใจกดท่าจากรายการ shouldCast ถ้าไม่มีกติกาของชนิดนั้น
// มันตกไปที่กติกาสำรอง `d <= (sk.range || u.range)` ท่าที่ไม่ประกาศ range
// จึงถูกกดเฉพาะตอนศัตรูประชิดมากๆ หรือไม่ถูกกดในสถานการณ์ที่ควรกดเลย
// เทสต์สกิลจับไม่ได้เพราะเทสต์สั่งกดเอง
//
// วัดจาก u.dealtBy ซึ่ง damage.js บันทึกไว้ว่าดาเมจแต่ละก้อนมาจากป้ายอะไร
// ท่าที่ไม่ทำดาเมจ (devour · soulSplit · casketShield) ดูจากผลข้างเคียงแทน
//
//   node _p6use.mjs [จำนวนแมตช์]
// ---------------------------------------------------------------
import { buildFight } from "./src/engine/build-fight.js";
import { step } from "./src/engine/step.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { makeRoster, toDef } from "./src/game/roster.js";
import { draftFoe, botSpread } from "./src/game/bot-draft.js";
import { shopFor } from "./src/game/shop-ai.js";
import { diffOf } from "./src/data/difficulty.js";
import { mulberry32 } from "./src/engine/util.js";
import { CHAMPIONS } from "./src/data/champions.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { setLang } from "./src/i18n.js";

setLang("th");
const GAMES = Number(process.argv[2] || 24);
const DIFF = diffOf("NORMAL");

const NEW = [["HELSING", "JUNGLE"], ["WOLF", "JUNGLE"], ["ANANSI", "MID"], ["KOSCHEI", "TOP"]];
const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

// ท่าที่ไม่ทำดาเมจเอง — ดูจากร่องรอยอื่นว่าถูกใช้ไหม
const SIDE_EFFECT = {
  "WOLF|R": (u) => (u.devoured || 0) > 0,
  "KOSCHEI|E": (u) => (u.shieldTaken || 0) > 0,
  "KOSCHEI|R": (u) => (u.splitCount || 0) > 0,
  "ANANSI|R": (u) => (u.wavesFired || 0) > 0,
};

function force(picks, champId, lane) {
  const out = picks.map((p) => ({ ...p }));
  const slot = out.find((p) => p.lane === lane);
  if (!slot) return out;
  const clash = out.find((p) => p.champId === champId && p.lane !== lane);
  if (clash) clash.champId = slot.champId;
  slot.champId = champId;
  return out;
}

// ป้ายดาเมจที่ damage.js บันทึก ขึ้นต้นด้วยคีย์ของท่า เช่น "Q Stake Driver"
const used = {};
for (const [id] of NEW) {
  used[id] = {};
  for (const sk of CHAMPIONS[id].skills) used[id][sk.key] = 0;
  used[id].ออโต้ = 0;
}

for (let g = 0; g < GAMES; g++) {
  const rand = mulberry32(9000 + g);
  const [id, lane] = NEW[g % NEW.length];
  let A = makeRoster(rand, force(draftFoe(rand, DIFF.variety, 0), id, lane),
    (r, cid) => botSpread(r, cid, DIFF.floor));
  let B = makeRoster(rand, draftFoe(rand, DIFF.variety, 0),
    (r, cid) => botSpread(r, cid, DIFF.floor));

  for (let round = 1; round <= 14; round++) {
    A = A.map((c) => shopFor(c, B, rand, DIFF.shopNoise));
    B = B.map((c) => shopFor(c, A, rand, DIFF.shopNoise));
    const rk = (c) => ({ ...c, ranks: autoRanks(c.level, CHAMPIONS[c.champId].skillPriority, null), style: "POKE" });
    A = A.map(rk); B = B.map(rk);
    const lanePick = LANES[round % LANES.length];
    const a = A.filter((c) => c.lane === lanePick || round % 3 === 0);
    const b = B.filter((c) => c.lane === lanePick || round % 3 === 0);
    if (!a.length || !b.length) continue;
    const st = buildFight(a.map(toDef), b.map(toDef), round, DEFAULT_FIGHT);
    let n = 0;
    while (!st.over && n < 60 * 90) { step(st); n++; }
    for (const u of st.units) {
      const bag = used[u.champ.id];
      if (!bag) continue;
      for (const [lbl, v] of Object.entries(u.dealtBy || {})) {
        if (!v) continue;
        const m = /^([QWER])\b/.exec(lbl);
        if (m && bag[m[1]] != null) bag[m[1]] += v;
        else if (/ออโต้|Auto/.test(lbl)) bag.ออโต้ += v;
      }
    }
    // ไต่เลเวลให้ถึง 18 ภายใน 13 ยก ไม่งั้นท่าที่อยู่ท้าย skillPriority ยังแรงก์ 0
    // (HELSING ท้ายคือ W · WOLF คือ E · KOSCHEI คือ Q) แล้วจะอ่านผิดว่า "บอทไม่ใช้ท่านี้"
    for (const c of A.concat(B)) { c.level = Math.min(18, 5 + round); c.gold += 900; }
  }
}

console.log("เล่น " + GAMES + " แมตช์ — ดาเมจรวมที่แต่ละท่าทำได้จริงในเกม\n");
let dead = 0;
for (const [id] of NEW) {
  const bag = used[id];
  const tot = Object.values(bag).reduce((s, v) => s + v, 0) || 1;
  const parts = Object.entries(bag)
    .map(([k, v]) => k + " " + ((v / tot) * 100).toFixed(0) + "%");
  console.log("  " + id.padEnd(9) + parts.join(" · "));
  for (const sk of CHAMPIONS[id].skills) {
    if (bag[sk.key] > 0) continue;
    // ท่าที่ไม่ทำดาเมจตามการออกแบบ ไม่ถือว่าเป็นปัญหา
    const noDmg = sk.dmg === undefined && sk.tickDmg === undefined
      && sk.pulseDmg === undefined && sk.sweepDmg === undefined;
    console.log("      " + sk.key + " " + (sk.th || "") + " — ไม่ทำดาเมจเลยทั้ง "
      + GAMES + " แมตช์" + (noDmg ? " (ท่านี้ไม่มีดาเมจตามการออกแบบ)" : "  <<< ต้องดู"));
    if (!noDmg) dead++;
  }
}
console.log(dead ? "\nท่าที่ควรทำดาเมจแต่ไม่เคยทำ: " + dead : "\nทุกท่าที่มีดาเมจ ทำดาเมจได้จริงในเกม");
