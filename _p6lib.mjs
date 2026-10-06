// ---------------------------------------------------------------
// ตัวช่วยร่วมของเทสต์ตัวละครแพตช์ 0.6
//
// แยกออกมาเพราะไฟล์เดียว 137 ข้อเริ่มหาของยาก ตัวช่วยพวกนี้ใช้ทุกไฟล์
// และ "out" เป็นสถานะร่วมของโมดูล — ไฟล์ตัวละครทุกไฟล์เก็บผลลงกองเดียวกัน
// ตัวรันรวมจึงอิมพอร์ตทุกไฟล์แล้วสรุปทีเดียวได้
// ---------------------------------------------------------------
import { pathToFileURL } from "url";
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { applyDamage, healUnit } from "./src/engine/damage.js";
import { addBuff } from "./src/engine/state-util.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";
import { castDevour, castWebThread, popBrand, spiderOnHit, spiderWalkTick } from "./src/engine/lore-p6.js";
import { setLang } from "./src/i18n.js";

setLang("th");
const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);
const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));

const mk = (lane, id, level = 13) => ({
  lane, champId: id, level, xp: 0, gold: 0, items: [],
  ranks: autoRanks(level, CHAMPIONS[id].skillPriority, null),
  athlete: flat(5), upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE",
});
// ดวลเดี่ยวเริ่มห่างกันราว 3,000 หน่วย แต่ Q ยิงได้ 750 และ R พุ่งได้ 500
// ถ้าไม่ขยับเข้ามาก่อน ท่าพวกนี้จะไม่เคยถึงตัวเป้าเลย แล้วเทสต์จะล้มเพราะที่ตั้ง ไม่ใช่เพราะกลไก
const fight = (a, b, level = 13, gap = 300) => {
  const st = buildFight([mk("MID", a, level)].map(toDef), [mk("MID", b, level)].map(toDef), 7, DEFAULT_FIGHT);
  const u = st.units[0], foe = st.units[1];
  foe.x = u.x + gap;
  foe.y = u.y;
  return { st, u, foe };
};
const fight2 = (a, b1, b2, level = 13, gap = 300) => {
  const st = buildFight(
    [mk("MID", a, level)].map(toDef),
    [mk("MID", b1, level), mk("TOP", b2, level)].map(toDef),
    7, DEFAULT_FIGHT);
  const u = st.units[0];
  const foe = st.units.find((x) => x.team !== u.team && x.champ.id === b1);
  const mate = st.units.find((x) => x.team !== u.team && x.id !== foe.id);
  foe.x = u.x + gap; foe.y = u.y;
  // วางพวกของมันไว้ข้างๆ ให้อยู่ในระยะ allyRange 500
  mate.x = foe.x + 150; mate.y = foe.y;
  return { st, u, foe, mate };
};
const fightAlly = (a, ally, b, level = 13, gap = 300) => {
  const st = buildFight(
    [mk("TOP", a, level), mk("MID", ally, level)].map(toDef),
    [mk("TOP", b, level)].map(toDef), 7, DEFAULT_FIGHT);
  const u = st.units.find((x) => x.champ.id === a);
  const mate = st.units.find((x) => x.team === u.team && x.id !== u.id);
  const foe = st.units.find((x) => x.team !== u.team);
  foe.x = u.x + gap; foe.y = u.y;
  mate.x = u.x + 120; mate.y = u.y + 80;
  return { st, u, mate, foe };
};
const cast = (st, u, key, target) => {
  const sk = u.skills.find((s) => s.key === key);
  sk.cdLeft = 0;
  st.castQueue.push({ u, sk, target, prec: 10 });
  step(st);
  return sk;
};

// ---------------------------------------------------------------
// สรุปผล — ไฟล์ตัวละครที่ถูกรันเดี่ยวจะเรียกเอง
// ตัวรันรวมเรียกครั้งเดียวหลังอิมพอร์ตครบทุกไฟล์
// ---------------------------------------------------------------
export function report(label) {
  let bad = 0;
  for (const [n, ok, d] of out) {
    if (!ok) bad++;
    console.log((ok ? " ok  " : " FAIL") + " " + n.padEnd(52) + " " + d);
  }
  console.log("\n" + (label ? label + " — " : "") + "ไม่ผ่าน " + bad + " / " + out.length);
  if (bad) process.exit(1);
}

// จริงไหมว่าไฟล์นี้คือไฟล์ที่ถูกสั่งรันตรงๆ (ไม่ได้ถูกอิมพอร์ตมา)
// เทียบ URL เต็ม ไม่เทียบชื่อท้าย เพราะชื่อท้ายพลาดได้ถ้าชื่อไฟล์ซ้อนกัน
export function isMain(url) {
  if (!process.argv[1]) return false;
  try { return url === pathToFileURL(process.argv[1]).href; }
  catch { return false; }
}

export { out, t, flat, mk, fight, fight2, fightAlly, cast };
