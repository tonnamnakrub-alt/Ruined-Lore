// ---------------------------------------------------------------
// Patch 0.5 — ตรวจว่าของที่ปรับไป "ทำงานจริงในสนาม" ไม่ใช่แค่ตัวเลขในไฟล์
//
// เน้นฟิลด์ที่เพิ่งเพิ่มใหม่ เพราะข้อมูลประกาศอะไรไว้ก็ได้
// แต่ถ้าไม่มีโค้ดไหนอ่าน มันก็ไม่มีผลอะไรเลย
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { DEFAULT_FIGHT, DMG_MUL } from "./src/data/tuning.js";
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
  // ที่เลเวล 13 เป้าไม่มีเกราะ/ต้านเวทเหลือ ตัวเลขจึงคำนวณตรงๆ ได้:
  //   1000 x DMG_MUL 0.80 x (1 + ขั้นพาสซีฟ 0.15) = 920
  // ถ้าโค้ดไม่อ่าน byTier จะได้ 880 (ใช้ base 0.10) ถ้าไม่พ่วงเลยจะได้ 800
  const want = 1000 * DMG_MUL * (1 + share(13));
  t("FAUSTUS พาสซีฟพ่วงดาเมจจริงตามขั้นที่ควรได้", Math.abs(hi - want) < 1,
    "ได้ " + hi.toFixed(0) + " · ควรได้ " + want.toFixed(0) + " (ถ้าไม่อ่าน byTier จะได้ " + (1000 * DMG_MUL * 1.1).toFixed(0) + ")");
  t("FAUSTUS พาสซีฟแรงขึ้นตามเลเวลจริง", hi > lo + 30,
    "เลเวล 1 = " + lo.toFixed(0) + " · เลเวล 13 = " + hi.toFixed(0));
}

// ---- คำบรรยายต้องไม่ฝังค่าสถานะฐานที่ขัดกับข้อมูลจริง
// รอบลดความเร็วเดินทำให้พาสซีฟ ARIEL ค้างอยู่ที่ "ค่าฐาน 345" ทั้งที่ลดเป็น 330 แล้ว
// โค้ดอ่าน u.champ.ms ถูกอยู่ ผิดแค่ข้อความ ซึ่งไม่มีอะไรจับได้เลย
{
  const bad = [];
  for (const c of Object.values(CHAMPIONS)) {
    const texts = [(c.passive && c.passive.desc) || ""];
    for (const s of c.skills) texts.push(s.desc || "");
    for (const t of texts) {
      // เลขสามหลักช่วง 300-400 ที่อยู่ใกล้คำว่าความเร็วเดินหรือค่าฐาน = น่าจะหมายถึง ms
      for (const m of t.matchAll(/(?:ความเร็วเดิน|ค่าฐาน)[^·]{0,24}?\b(3\d\d)\b/g)) {
        if (Number(m[1]) !== c.ms) bad.push(c.id + " เขียน " + m[1] + " แต่ ms จริงคือ " + c.ms);
      }
    }
  }
  t("คำบรรยายไม่ฝังความเร็วเดินที่ขัดกับข้อมูล", bad.length === 0,
    bad.length ? bad.join(" · ") : "ตรวจครบ 25 ตัว ไม่มีที่ขัดกัน");
}

// ---- คำบรรยายพาสซีฟต้องตรงกับก้อนตั้งค่าของตัวเอง
// พาสซีฟไม่ได้ประกอบจากข้อมูลเหมือนสกิล เป็นข้อความเขียนมือล้วน
// ตัวเลขจึงค้างจากแพตช์เก่าได้เงียบๆ รอบนี้เจอผิด 7 จุดใน 6 ตัว
// ตรงนี้ตรึงเลขที่พลาดไว้ ให้พังทันทีถ้าข้อมูลขยับแล้วข้อความไม่ขยับตาม
{
  const lv = (cfg, level) => (cfg.base || 0) + (cfg.perLevel || 0) * (level - 1);
  const pct = (v) => String(Math.round(v * 1000) / 10) + "%";
  const C = CHAMPIONS;
  const sa = C.NIAN.staticAura, cb = C.HOOD.critBleed;
  const cases = [
    ["NIAN", "รัศมีออร่า", String(sa.radius)],
    ["NIAN", "ดาเมจที่เลเวล 1", String(lv(sa, 1))],
    ["NIAN", "ดาเมจที่เลเวล 18", String(Math.round(lv(sa, 18)))],
    ["NIAN", "สเกล Bonus HP", pct(sa.bonusHp)],
    ["ELLA", "เกณฑ์เลือดต่ำที่ดาเมจคูณสอง", pct(C.ELLA.glassShards.lowHpAt)],
    ["PIROSKA", "อายุบัฟความเร็วเดิน", String(C.PIROSKA.fleeWolf.dur) + " วิ"],
    // ampPerBad 0.00025 = +1% ต่อ Bonus AD 40 เคยเขียนว่า 20
    ["PUSS", "Bonus AD ต่อ +1% ดาเมจใส่คู่ดวล", String(Math.round(0.01 / C.PUSS.duel.ampPerBad))],
    ["HOOD", "เลือดไหลจากส่วนเกินของคริ", pct(cb.pct)],
    ["HOOD", "เลือดไหลจากออโต้ที่ไม่คริ", pct(cb.nonCritPct)],
    ["H.S.B", "ลดดาเมจขั้นบ้านฟาง", pct(C["H.S.B"].threePigs[0].dr)],
    ["H.S.B", "กินดาเมจเพิ่มขั้นบ้านอิฐ", pct(-C["H.S.B"].threePigs[2].dr)],
  ];
  for (const [id, what, want] of cases) {
    t("พาสซีฟ " + id + " เขียนตรงข้อมูล — " + what,
      C[id].passive.desc.includes(want), "ต้องมีคำว่า \"" + want + "\"");
  }
}

// ---- สรุป
let bad = 0;
for (const [n, ok, d] of out) {
  if (!ok) bad++;
  console.log((ok ? " ok  " : " FAIL") + " " + n.padEnd(52) + " " + d);
}
console.log("\nไม่ผ่าน " + bad + " / " + out.length);
