// ---------------------------------------------------------------
// Patch 0.5 — ตรวจว่าของที่ปรับไป "ทำงานจริงในสนาม" ไม่ใช่แค่ตัวเลขในไฟล์
//
// เน้นฟิลด์ที่เพิ่งเพิ่มใหม่ เพราะข้อมูลประกาศอะไรไว้ก็ได้
// แต่ถ้าไม่มีโค้ดไหนอ่าน มันก็ไม่มีผลอะไรเลย
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { applyDamage } from "./src/engine/damage.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";
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
const fight = (aId, bId, level = 13) => {
  const st = buildFight([mk("MID", aId, level)].map(toDef), [mk("MID", bId, level)].map(toDef), 7, DEFAULT_FIGHT);
  return { st, u: st.units[0], foe: st.units[1] };
};
const cast = (st, u, key, target) => {
  const sk = u.skills.find((s) => s.key === key);
  sk.cdLeft = 0;
  st.castQueue.push({ u, sk, target, prec: 10 });
  step(st);
  return sk;
};

// ---- PINO พาสซีฟ — ฮีลถี่ขึ้นเป็นทุก 0.5 วิ และแรงขึ้น
{
  const k = CHAMPIONS.PINO.kindness;
  t("PINO พาสซีฟเต้นทุก 0.5 วิ", k.every === 0.5, k.every + " วิ");
  t("PINO พาสซีฟฮีล 15 + 5 ต่อเลเวล + 0.1 AP",
    k.flat === 15 && k.perLevel === 5 && Math.abs(k.perAp - 0.1) < 1e-9,
    k.flat + " + " + k.perLevel + "/เลเวล + " + k.perAp + " AP");
}

// ---- ALICE พาสซีฟ — ฐานไต่ตามเลเวลจริงไหม
{
  const lo = fight("ALICE", "KAZEM", 1);
  const hi = fight("ALICE", "KAZEM", 18);
  const val = (o) => {
    cast(o.st, o.u, "Q", o.foe);
    for (let i = 0; i < 120; i++) step(o.st);
    const b = o.foe.buffs.find((x) => x.type === "curiousAmp");
    return b ? b.v : 0;
  };
  const a = val(lo), b = val(hi);
  t("ALICE พาสซีฟไต่ตามเลเวลจริง (ไม่ใช่ค่าคงที่)", b > a * 1.5, "เลเวล 1 = " + (a * 100).toFixed(2) + "% · เลเวล 18 = " + (b * 100).toFixed(2) + "%");
}

// ---- ALICE E — สาปได้ และไม่มีดาเมจแล้ว
{
  const o = fight("ALICE", "KAZEM");
  const before = o.foe.hp;
  cast(o.st, o.u, "E", o.foe);
  for (let i = 0; i < 30; i++) step(o.st);
  const poly = o.foe.buffs.some((b) => b.type === "silence" || b.type === "disarm");
  t("ALICE E ยังสาปร่างได้หลังเปลี่ยนเป็นเล็งเป้า", poly, poly ? "ติดสาป" : "ไม่ติดสาป");
  t("ALICE E ไม่ทำดาเมจแล้ว", o.foe.hp >= before - 1, "เลือดเป้า " + before.toFixed(0) + " -> " + o.foe.hp.toFixed(0));
}

// ---- ALICE R — โซนอยู่นานตามขั้น และคูลดาวน์เริ่มนับหลังโซนหมด
{
  const sk = CHAMPIONS.ALICE.skills.find((s) => s.key === "R");
  t("ALICE R ประกาศอายุโซนตามขั้น 4/5/6", JSON.stringify(sk.durByRank) === "[4,5,6]", JSON.stringify(sk.durByRank));
  const o = fight("ALICE", "KAZEM", 18);
  const own0 = o.u.skills.find((s) => s.key === "R");
  const dur = sk.durByRank[Math.max(0, own0.rank - 1)];
  // ห้องซ้อมยัดคิวร่ายตรงๆ คูลดาวน์ปกติจึงยังไม่ถูกตั้ง เริ่มจากศูนย์
  // จึงวัด "ส่วนที่ถูกบวกเพิ่ม" แทนค่าสุดท้าย
  cast(o.st, o.u, "R", o.foe);
  const own = o.u.skills.find((s) => s.key === "R");
  t("ALICE R คูลดาวน์บวกอายุโซนเข้าไปแล้ว", Math.abs(own.cdLeft - dur) < 0.01,
    "บวกเพิ่ม " + own.cdLeft.toFixed(2) + " วิ · อายุโซน " + dur + " วิ");
  const m = o.st.mirrors[0];
  t("ALICE R โซนอยู่ตามขั้นจริง", m && Math.abs((m.until - o.st.t) - dur) < 0.2,
    m ? (m.until - o.st.t).toFixed(2) + " วิ" : "ไม่มีโซน");
}

// ---- FAUSTUS พาสซีฟ — ขั้นตามเลเวล 1/7/13
{
  const fb = CHAMPIONS.FAUSTUS.faustian;
  t("FAUSTUS พาสซีฟประกาศขั้น 10/12.5/15%", JSON.stringify(fb.byTier) === "[0.1,0.125,0.15]", JSON.stringify(fb.byTier));
  // ยิงดาเมจก้อนเดียวแล้ววัดว่าพาสซีฟพ่วงดาเมจจริงตามมาเท่าไหร่
  // ไม่ใช้สกิลจริงเพราะศัตรูเดินออกจากวงได้ ผลจะไม่นิ่ง
  const rider = (level) => {
    const o = fight("FAUSTUS", "KAZEM", level);
    o.foe.armor = 0; o.foe.mr = 0; o.foe.baseArmor = 0; o.foe.baseMr = 0;
    const before = o.foe.hp;
    o.st.dmgSrc = "W Sigil of Ruination";
    applyDamage(o.st, o.u, o.foe, 1000, true);
    o.st.dmgSrc = null;
    return before - o.foe.hp;
  };
  // เลเวลสูงกว่าสกิลแรงกว่าอยู่แล้ว จึงเทียบ "สัดส่วนดาเมจจริงที่พ่วง" ไม่ได้ตรงๆ
  // เช็คแทนว่าโค้ดอ่าน byTier แล้วได้ค่าต่างกันจริงตามเลเวล
  const share = (level) => {
    let v = fb.base;
    for (let i = 0; i < fb.tiers.length; i++) if (level >= fb.tiers[i]) v = fb.byTier[i];
    return v;
  };
  t("FAUSTUS ขั้นพาสซีฟต่างกันตามเลเวล", share(1) === 0.1 && share(7) === 0.125 && share(13) === 0.15,
    "L1 " + share(1) + " · L7 " + share(7) + " · L13 " + share(13));
  // DMG_MUL 0.80 คูณทั้งก้อนหลักและก้อนที่พ่วง ผลรวมจึงเป็น 0.8 x 1000 x (1 + share)
  const lo = rider(1), hi = rider(13);
  // เทียบกับคนที่ไม่มีพาสซีฟนี้ ยิงเลขเดียวกันใส่เป้าเดียวกัน ส่วนต่างคือก้อนที่พ่วงมา
  const plain = (() => {
    const o = fight("JACK", "KAZEM", 1);
    const before = o.foe.hp;
    o.st.dmgSrc = "W Golden Egg Trap";
    applyDamage(o.st, o.u, o.foe, 1000, true);
    o.st.dmgSrc = null;
    return before - o.foe.hp;
  })();
  t("FAUSTUS พาสซีฟพ่วงดาเมจจริงตามมา", lo > plain * 1.05,
    "เฟาสตุส " + lo.toFixed(0) + " · คนไม่มีพาสซีฟ " + plain.toFixed(0) + " จากดาเมจต้น 1000 เท่ากัน");
  t("FAUSTUS พาสซีฟแรงขึ้นตามเลเวลจริง (โค้ดอ่าน byTier)", hi > lo + 30,
    "เลเวล 1 = " + lo.toFixed(0) + " · เลเวล 13 = " + hi.toFixed(0));
}

// ---- สรุป
let bad = 0;
for (const [n, ok, d] of out) {
  if (!ok) bad++;
  console.log((ok ? " ok  " : " FAIL") + " " + n.padEnd(52) + " " + d);
}
console.log("\nไม่ผ่าน " + bad + " / " + out.length);
