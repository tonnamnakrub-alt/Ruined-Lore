// ---------------------------------------------------------------
// PHANTOM — ตัวใหม่ของ Patch 0.4
//
// เช็คทีละกลไกว่าเดินจริงในเอนจิน ไม่ใช่แค่มีตัวเลขเขียนไว้ในข้อมูล
// (บทเรียนจาก YODAKA: ข้อมูลประกาศกลไกไว้ แต่ไม่มีโค้ดไหนอ่านมันเลย)
// ---------------------------------------------------------------
import { ARENA_H, ARENA_W } from "./src/data/constants.js";
import { CHAMPIONS } from "./src/data/champions.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { autoRanks, emptyRanks } from "./src/engine/skill-ranks.js";
import { daggerCount, maskPlan, wearMask } from "./src/engine/lore-p4.js";
import { step } from "./src/engine/step.js";

const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);
const PH = CHAMPIONS.PHANTOM;
const skill = (k) => PH.skills.find((s) => s.key === k);

// สนามซ้อม: PHANTOM เต็มแรงก์ ปะทะดัมมี่เลือดหนาที่ไม่มีเกราะและไม่ตี
function lab(level = 18, dummyArmor = 0) {
  const me = {
    lane: "ADC", champId: "PHANTOM", char: "P", athleteName: "P",
    athlete: { mechanics: 10, gameSense: 10, knowledge: 10, decision: 10, teamwork: 10 },
    style: "POKE", level, items: [], ranks: autoRanks(level, PH.skillPriority, null),
  };
  const dm = {
    lane: "MID", champId: "KAZEM", char: "D", athleteName: "D",
    athlete: { mechanics: 0, gameSense: 0, knowledge: 0, decision: 0, teamwork: 0 },
    style: "HOLD", level: 1, items: [], ranks: emptyRanks(),
  };
  const st = buildFight([me], [dm], 7, DEFAULT_FIGHT);
  st.timeLimit = 1e9;
  st.rampStart = 1e9;
  const p = st.units[0], d = st.units[1];
  d.maxHp = 400000; d.hp = 400000;
  d.baseArmor = dummyArmor; d.rawArmor = dummyArmor; d.armor = dummyArmor;
  d.baseMr = 0; d.mr = 0; d.noRegen = true;
  d.manual = { moveTo: null, autoAttack: false, targetId: null, castKey: null, castPoint: null };
  for (const sk of p.skills) sk.cdLeft = 0;
  d.x = ARENA_W * 0.55; d.y = ARENA_H / 2;
  p.x = ARENA_W * 0.45; p.y = ARENA_H / 2;
  p.manual = { moveTo: null, autoAttack: false, targetId: d.id, castKey: null, castPoint: null };
  return { st, p, d };
}

const dealt = (u, needle) => Object.entries(u.dealtBy || {})
  .filter(([k]) => k.includes(needle)).reduce((a, [, v]) => a + v, 0);

// ---- ข้อมูลพื้นฐาน ----
{
  t("PHANTOM อยู่ในรายชื่อตัวละคร", !!PH, PH ? PH.th + " · " + PH.role + " · " + PH.lane : "ไม่มี");
  t("ลงเลนเดียวคือ ADC", PH.lane === "ADC" && !(PH.alsoLanes || []).length, PH.lane);
  t("มีครบสี่ท่า", PH.skills.length === 4, PH.skills.map((s) => s.key + " " + s.type).join(" · "));
  t("เป็นตัวยิงไกล ไม่ใช่ประชิด", !PH.melee && PH.range === 500 && PH.missile > 0, "ระยะ " + PH.range + " · กระสุน " + PH.missile);
}

// ---- พาสซีฟ · ออโต้ปักมีด แล้วครบห้าเล่มระเบิด ----
{
  const { st, p, d } = lab();
  p.manual.autoAttack = true;
  p.crit = 0;
  const seen = [];
  let g = 0;
  while (g++ < 60 * 20 && dealt(p, "Stitched Melodrama") === 0) {
    step(st);
    const n = daggerCount(st, p, d);
    if (!seen.length || seen[seen.length - 1] !== n) seen.push(n);
  }
  t("ออโต้ปักมีดทีละเล่ม", seen.join(",").startsWith("0,1,2,3,4"), "กองมีดไล่ขึ้น " + seen.join(" → "));
  t("ครบห้าเล่มแล้วระเบิดเอง", dealt(p, "Stitched Melodrama") > 0,
    Math.round(dealt(p, "Stitched Melodrama")) + " ดาเมจ");
  t("ระเบิดแล้วกองมีดรีเซ็ตเป็นศูนย์", daggerCount(st, p, d) < 5, "เหลือ " + daggerCount(st, p, d) + " เล่ม");
  t("ระเบิดแล้วเป้าติดสโลว์", d.buffs.some((b) => b.type === "slow"),
    d.buffs.filter((b) => b.type === "slow").map((b) => Math.round(b.v * 100) + "%").join(" ") || "ไม่ติด");
}

// ---- มีดหมดอายุเองถ้าไม่ได้ตีต่อ ----
{
  const { st, p, d } = lab();
  p.manual.autoAttack = true;
  let g = 0;
  while (g++ < 60 * 10 && daggerCount(st, p, d) < 2) step(st);
  const had = daggerCount(st, p, d);
  p.manual.autoAttack = false;
  p.manual.targetId = null;
  for (let i = 0; i < 60 * 7; i++) step(st);
  t("ไม่ตีต่อแล้วมีดหลุดเองใน 6 วิ", had >= 2 && daggerCount(st, p, d) === 0,
    "เคยปัก " + had + " เล่ม · ตอนนี้ " + daggerCount(st, p, d));
}

// ---- Q · สามเล่มพัดออกไป แต่ละเล่มปักหนึ่ง ----
{
  const { st, p, d } = lab();
  p.x = d.x - 200; p.y = d.y;            // ยืนใกล้พอให้โดนครบทั้งสามเล่ม
  p.manual.castKey = "Q";
  for (let i = 0; i < 20; i++) step(st);
  t("Q ลงดาเมจจริง", dealt(p, "Tri-Blade Fan") > 0, Math.round(dealt(p, "Tri-Blade Fan")) + " ดาเมจ");
  // 0.5 กางพัดจาก 35 เป็น 90 องศา — เป้าหมายเดี่ยวจึงกินไม่ครบสามเล่มอีกแล้ว
  // นั่นคือตัวเนิร์ฟเอง ไม่ใช่บั๊ก จึงเช็คว่า "ปักได้อย่างน้อยหนึ่ง" แทนการตรึงเลขสาม
  t("Q ปักมีดตามจำนวนเล่มที่โดน", daggerCount(st, p, d) >= 1, "ปักได้ " + daggerCount(st, p, d) + " เล่ม");
  const q = skill("Q");
  t("Q ยิงสามเล่มเป็นรูปพัดกว้าง 90 องศา", q.count === 3 && q.angle === 90, q.count + " เล่ม · กาง " + q.angle + " องศา");
  t("เล่มที่ซ้ำตัวเดิมเบาลง ไม่ใช่เต็มทุกเล่ม", q.falloff > 0 && q.falloff < 1, "ตัวคูณ " + q.falloff);
}

// ---- Q สามเล่ม + มีดเดิมสองเล่ม ต้องดันให้ระเบิดกลางทาง ----
{
  const { st, p, d } = lab();
  p.x = d.x - 200; p.y = d.y;
  // 0.5 พัดกว้างขึ้น เป้าเดี่ยวกินไม่ครบสามเล่มต่อการกดหนึ่งครั้งแล้ว
  // จึงกดซ้ำจนกองครบห้าแล้วระเบิด แทนที่จะสมมติว่าสองครั้งพอ
  let casts = 0;
  while (casts++ < 12 && dealt(p, "Stitched Melodrama") === 0) {
    for (const sk of p.skills) sk.cdLeft = 0;
    p.manual.castKey = "Q";
    for (let i = 0; i < 20; i++) step(st);
  }
  t("กองมีดล้นห้าแล้วระเบิด เศษเริ่มนับกองใหม่", dealt(p, "Stitched Melodrama") > 0 && daggerCount(st, p, d) < 5,
    "ระเบิดไป " + Math.round(dealt(p, "Stitched Melodrama")) + " ดาเมจ · เหลือค้าง " + daggerCount(st, p, d) + " เล่ม");
}

// ---- E · กระชากมีดกลับ ยิ่งปักเยอะยิ่งแรง และไม่ปักเพิ่ม ----
{
  const one = (autos) => {
    const { st, p, d } = lab();
    p.manual.autoAttack = true;
    p.crit = 0;
    let g = 0;
    while (g++ < 60 * 20 && daggerCount(st, p, d) < autos) step(st);
    const n = daggerCount(st, p, d);
    p.manual.autoAttack = false;
    for (const sk of p.skills) sk.cdLeft = 0;
    p.manual.castKey = "E";
    for (let i = 0; i < 20; i++) step(st);
    return { dmg: dealt(p, "Maestro"), n, left: daggerCount(st, p, d) };
  };
  const a = one(1), b = one(4);
  t("E กระชากแล้วลงดาเมจ", a.dmg > 0, Math.round(a.dmg) + " ดาเมจจากมีด " + a.n + " เล่ม");
  t("ยิ่งปักเยอะ E ยิ่งแรงเป็นสัดส่วน", b.dmg > a.dmg * 2.5,
    a.n + " เล่ม = " + Math.round(a.dmg) + " · " + b.n + " เล่ม = " + Math.round(b.dmg));
  t("กระชากแล้วมีดหลุดหมด ไม่ปักเพิ่ม", b.left === 0, "เหลือ " + b.left + " เล่ม");
}

// ---- R · ลอยแตะไม่ได้ แล้วสาดมีดรอบตัวพร้อมปักสามเล่ม ----
{
  const { st, p, d } = lab();
  p.x = d.x - 300; p.y = d.y;
  p.manual.castKey = "R";
  for (let i = 0; i < 10; i++) step(st);
  t("กด R แล้วแตะไม่ได้", p.untargetable, "untargetable=" + !!p.untargetable);
  const sk = skill("R");
  for (let i = 0; i < Math.ceil(60 * sk.air) + 10; i++) step(st);
  t("ลงพื้นแล้วกลับมาโดนได้", !p.untargetable, "untargetable=" + !!p.untargetable);
  t("พายุมีดลงดาเมจในวง", dealt(p, "Grand Masquerade") > 0, Math.round(dealt(p, "Grand Masquerade")) + " ดาเมจ");
  t("R ปักมีดให้ทันทีสามเล่ม", daggerCount(st, p, d) === 3, "ปักได้ " + daggerCount(st, p, d) + " เล่ม");
}

// ---- W · หน้ากากเปลี่ยนค่าสถานะจริง ----
{
  const { st, p } = lab();
  const w = skill("W");
  const r = Math.max(0, p.skills.find((s) => s.key === "W").rank - 1);
  const wSk = p.skills.find((s) => s.key === "W");
  step(st);
  const adBefore = p.ad, asBefore = p.asEff, penBefore = p.arPen || 0, bonusBefore = p.bonusAd;

  wearMask(st, p, wSk, "TRAGEDY");
  step(st);
  t("หน้ากากโศกนาฏกรรมเพิ่มพลังโจมตี", Math.abs(p.ad - (adBefore + w.adFlat[r])) < 2,
    Math.round(adBefore) + " → " + Math.round(p.ad) + " (ควร +" + w.adFlat[r] + ")");
  t("โศกนาฏกรรมบวก Bonus AD ด้วย สกิลจึงแรงขึ้นตาม", p.bonusAd === bonusBefore + w.adFlat[r],
    bonusBefore + " → " + p.bonusAd);

  wearMask(st, p, wSk, "COMEDY");
  step(st);
  t("หน้ากากสุขนาฏกรรมเพิ่มความเร็วโจมตี", p.asEff > asBefore * (1 + w.asPct[r] * 0.9),
    asBefore.toFixed(3) + " → " + p.asEff.toFixed(3) + " (ควร +" + Math.round(w.asPct[r] * 100) + "%)");
  t("สลับใบแล้วพลังโจมตีของใบเก่าหายไป", Math.abs(p.ad - adBefore) < 2,
    Math.round(p.ad) + " · เดิม " + Math.round(adBefore));

  wearMask(st, p, wSk, "DEATH");
  step(st);
  t("หน้ากากมรณะเพิ่มเจาะเกราะ", p.arPen === penBefore + w.arPen[r],
    penBefore + " → " + p.arPen + " (ควร +" + w.arPen[r] + ")");
  t("สลับใบแล้วความเร็วโจมตีของใบเก่าหายไป", Math.abs(p.asEff - asBefore) < 0.02,
    p.asEff.toFixed(3) + " · เดิม " + asBefore.toFixed(3));
  t("หน้ากากไม่หมดอายุเอง", p.mask === "DEATH", "ใส่อยู่ " + p.mask);
}

// ---- W · บอทต้องเลือกใบเอง และเลือกคนละใบตามสถานการณ์ ----
{
  // เลือกจากราคาที่ตีได้จริง ไม่ใช่สุ่ม — เกราะสูงกับเกราะต่ำต้องได้คำตอบต่างกัน
  const pick = (armor, bonusAd, daggers) => {
    const { st, p, d } = lab();
    p.athlete = { mechanics: 10, gameSense: 10, knowledge: 10, decision: 10, teamwork: 10 };
    step(st);                                   // ต้องเดินหนึ่งเฟรมก่อน ค่าสถานะถึงจะถูกคิด
    d.armor = armor; d.baseArmor = armor; d.rawArmor = armor;
    p.bonusAdBase = bonusAd; p.bonusAd = bonusAd; p.ad = PH.ad + PH.adG * 17 + bonusAd;
    if (daggers) d.pdag = { ownerId: p.id, n: daggers, until: st.t + 6 };
    p.maskRead = null;
    return maskPlan(st, p, p.skills.find((s) => s.key === "W"), d);
  };
  const picks = new Set();
  const rows = [];
  for (const armor of [25, 60, 120, 200]) {
    for (const bad of [0, 80, 160]) {
      for (const dag of [0, 4]) {
        const k = pick(armor, bad, dag);
        picks.add(k);
        rows.push("เกราะ " + armor + "/AD+" + bad + "/มีด" + dag + " → " + k);
      }
    }
  }
  t("บอทเลือกได้ครบทั้งสามใบตามสถานการณ์", picks.size === 3, [...picks].join(" · "));
  t("เกราะต่ำ+มีดปักเยอะ เลือกมรณะ", pick(25, 160, 4) === "DEATH", pick(25, 160, 4));
  t("เกราะหนามาก เจาะไม่คุ้ม ไม่เลือกมรณะ", pick(200, 80, 0) !== "DEATH", pick(200, 80, 0));

  // ใบที่ใส่อยู่ดีอยู่แล้ว ไม่ควรเสียจังหวะไปสลับเล่นๆ
  const { st, p, d } = lab();
  p.athlete = { mechanics: 10, gameSense: 10, knowledge: 10, decision: 10, teamwork: 10 };
  step(st);
  const wSk = p.skills.find((s) => s.key === "W");
  const first = maskPlan(st, p, wSk, d);
  wearMask(st, p, wSk, first);
  p.maskRead = null;
  t("ใส่ใบที่ดีที่สุดอยู่แล้ว จะไม่สลับซ้ำ", maskPlan(st, p, wSk, d) == null, "ใส่ " + first + " แล้วคิดใหม่ได้ " + maskPlan(st, p, wSk, d));
}

// ---- แต้มนักแข่งต้องเปลี่ยน "การตัดสินใจ" จริง ไม่ใช่แค่ตัวคูณดาเมจ ----
{
  // knowledge ต่ำ = อ่านเกราะคู่ต่อสู้เพี้ยน จึงหยิบใบผิดได้
  const wrong = (know) => {
    let miss = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const { st, p, d } = lab();
      p.athlete = { mechanics: 5, gameSense: 5, knowledge: know, decision: 10, teamwork: 5 };
      step(st);
      d.armor = 25; d.baseArmor = 25; d.rawArmor = 25;
      p.bonusAdBase = 160; p.bonusAd = 160;
      d.pdag = { ownerId: p.id, n: 4, until: st.t + 6 };
      for (let i = 0; i < seed; i++) p.rng();   // ให้แต่ละรอบทอยคนละจุด
      p.maskRead = null;
      if (maskPlan(st, p, p.skills.find((s) => s.key === "W"), d) !== "DEATH") miss++;
    }
    return miss;
  };
  const lo = wrong(0), hi = wrong(10);
  t("knowledge ต่ำหยิบหน้ากากผิดบ่อยกว่า", lo > hi, "แต้ม 0 พลาด " + lo + "/40 · แต้ม 10 พลาด " + hi + "/40");
  t("knowledge เต็มไม่พลาดเลย", hi === 0, "พลาด " + hi + "/40");
}

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(46) + " " + d); }
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
