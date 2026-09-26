// ---------------------------------------------------------------
// STEIN — ตัวใหม่ของ Patch 0.4
//
// เช็คทีละกลไกว่าเดินจริงในเอนจิน ไม่ใช่แค่มีตัวเลขเขียนไว้ในข้อมูล
// ตัวนี้เช็คยากกว่าตัวทำดาเมจ เพราะผลงานของเขาคือ "เพื่อนไม่ตาย"
// ไม่ใช่ตัวเลขดาเมจของตัวเอง — เทสส่วนใหญ่จึงวัดที่ฝั่งเพื่อน
// ---------------------------------------------------------------
import { ARENA_H, ARENA_W } from "./src/data/constants.js";
import { CHAMPIONS } from "./src/data/champions.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { autoRanks, emptyRanks } from "./src/engine/skill-ranks.js";
import { canopyPick } from "./src/engine/lore-p4.js";
import { step } from "./src/engine/step.js";

const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);
const ST = CHAMPIONS.STEIN;
const skill = (k) => ST.skills.find((s) => s.key === k);
const st5 = (v) => ({ mechanics: v, gameSense: v, knowledge: v, decision: v, teamwork: v });

// สนามซ้อม: สไตน์เต็มแรงก์ + เพื่อนหนึ่งคน ปะทะดัมมี่เลือดหนา
function lab(level = 18, mate = "HOOD", stat = 10) {
  const me = {
    lane: "SUPPORT", champId: "STEIN", char: "S", athleteName: "S", athlete: st5(stat),
    style: "POKE", level, items: [], ranks: autoRanks(level, ST.skillPriority, null),
  };
  const friend = {
    lane: "ADC", champId: mate, char: "F", athleteName: "F", athlete: st5(stat),
    style: "HOLD", level, items: [], ranks: autoRanks(level, CHAMPIONS[mate].skillPriority, null),
  };
  const dm = {
    lane: "MID", champId: "KAZEM", char: "D", athleteName: "D", athlete: st5(0),
    style: "HOLD", level: 1, items: [], ranks: emptyRanks(),
  };
  const st = buildFight([me, friend], [dm], 7, DEFAULT_FIGHT);
  st.timeLimit = 1e9;
  st.rampStart = 1e9;
  const s = st.units[0], f = st.units[1], d = st.units[2];
  d.maxHp = 400000; d.hp = 400000;
  d.baseArmor = 0; d.rawArmor = 0; d.armor = 0;
  d.baseMr = 0; d.mr = 0; d.noRegen = true;
  s.noRegen = true; f.noRegen = true;
  d.manual = { moveTo: null, autoAttack: false, targetId: null, castKey: null, castPoint: null };
  for (const sk of s.skills) sk.cdLeft = 0;
  d.x = ARENA_W * 0.5 + 120; d.y = ARENA_H / 2;
  s.x = ARENA_W * 0.5; s.y = ARENA_H / 2;
  f.x = ARENA_W * 0.5 - 200; f.y = ARENA_H / 2;
  s.manual = { moveTo: null, autoAttack: false, targetId: d.id, castKey: null, castPoint: null };
  f.manual = { moveTo: null, autoAttack: false, targetId: null, castKey: null, castPoint: null };
  return { st, s, f, d };
}

const dealt = (u, needle) => Object.entries(u.dealtBy || {})
  .filter(([k]) => k.includes(needle)).reduce((a, [, v]) => a + v, 0);

// ---- ข้อมูลพื้นฐาน ----
{
  t("STEIN อยู่ในรายชื่อตัวละคร", !!ST, ST ? ST.th + " · " + ST.role + " · " + ST.lane : "ไม่มี");
  t("ลงซัพพอร์ตเป็นหลัก ลงท็อปได้ด้วย", ST.lane === "SUPPORT" && (ST.alsoLanes || []).includes("TOP"),
    [ST.lane, ...(ST.alsoLanes || [])].join(", "));
  t("มีครบสี่ท่า", ST.skills.length === 4, ST.skills.map((s) => s.key + " " + s.type).join(" · "));
  t("เป็นตัวประชิด", ST.melee && ST.range === 175, "ระยะ " + ST.range);
}

// ---- พาสซีฟ · ออโต้หลั่งน้ำเลี้ยง ฮีลตัวเองและเพื่อนที่พร่องสุด ----
{
  const { st, s, f, d } = lab();
  s.manual.autoAttack = true;
  step(st);
  s.hp = s.maxHp * 0.5;
  f.hp = f.maxHp * 0.4;
  const sHp0 = s.hp, fHp0 = f.hp;
  let g = 0;
  while (g++ < 60 * 6 && s.hits < 1) step(st);
  for (let i = 0; i < 5; i++) step(st);
  t("ออโต้ครั้งแรกหลั่งน้ำเลี้ยงทันที (พาสซีฟพร้อมตั้งแต่ต้น)", s.hp > sHp0, "เลือดตัวเอง " + Math.round(sHp0) + " → " + Math.round(s.hp));
  t("เพื่อนที่เลือดพร่องสุดได้ฮีลด้วย", f.hp > fHp0, "เลือดเพื่อน " + Math.round(fHp0) + " → " + Math.round(f.hp));
  const cfg = ST.sap;
  t("ฮีลได้เท่ากันทั้งสองคน", Math.abs((s.hp - sHp0) - (f.hp - fHp0)) < 2,
    Math.round(s.hp - sHp0) + " กับ " + Math.round(f.hp - fHp0));
  t("ใช้แล้วต้องรอคูลดาวน์", s.sapReadyAt > st.t, "พร้อมอีกทีในอีก " + (s.sapReadyAt - st.t).toFixed(1) + " วิ");

  // ออโต้ระหว่างคูลดาวน์ต้องไม่ฮีลซ้ำ
  const hp1 = s.hp = s.maxHp * 0.5;
  const hits0 = s.hits;
  let g2 = 0;
  while (g2++ < 60 * 4 && s.hits - hits0 < 2) step(st);
  t("ระหว่างคูลดาวน์ ออโต้ไม่ฮีลซ้ำ", s.hp <= hp1 + 1, "ตี " + (s.hits - hits0) + " ครั้ง เลือดขยับ " + Math.round(s.hp - hp1));
  void d; void cfg;
}

// ---- ร่ายสกิลเร่งคูลดาวน์พาสซีฟ ----
{
  const { st, s } = lab();
  step(st);
  s.sapReadyAt = st.t + 8;
  const before = s.sapReadyAt;
  s.manual.castKey = "W";
  for (let i = 0; i < 20; i++) step(st);
  t("ร่ายสกิลตัดคูลดาวน์พาสซีฟลง 2 วิ", Math.abs((before - s.sapReadyAt) - ST.sap.cutOnCast) < 0.1,
    "เหลือรออีก " + (s.sapReadyAt - st.t).toFixed(2) + " วิ (ตัดไป " + (before - s.sapReadyAt).toFixed(2) + ")");
}

// ---- Q · รากพุ่งไปกระชากเข้ามาครึ่งทาง ----
{
  const { st, s, d } = lab();
  step(st);
  d.x = s.x + 700; d.y = s.y;
  const gap0 = Math.hypot(d.x - s.x, d.y - s.y);
  s.manual.castKey = "Q";
  let g = 0;
  while (g++ < 60 * 2 && dealt(s, "Grasping Roots") === 0) step(st);
  const gap1 = Math.hypot(d.x - s.x, d.y - s.y);
  t("Q ลงดาเมจจริง", dealt(s, "Grasping Roots") > 0, Math.round(dealt(s, "Grasping Roots")) + " ดาเมจ");
  t("กระชากเข้ามาราวครึ่งหนึ่งของระยะห่าง", Math.abs(gap1 / gap0 - 0.5) < 0.12,
    "ห่าง " + Math.round(gap0) + " → " + Math.round(gap1) + " (" + Math.round(gap1 / gap0 * 100) + "%)");
}

// ---- Q · ยิ่งโดนใกล้ ยิ่งถูกดึงน้อย (เป็นสัดส่วน ไม่ใช่ระยะคงที่) ----
{
  const pull = (gap) => {
    const { st, s, d } = lab();
    step(st);
    d.x = s.x + gap; d.y = s.y;
    for (const sk of s.skills) sk.cdLeft = 0;
    s.manual.castKey = "Q";
    let g = 0;
    while (g++ < 60 * 2 && dealt(s, "Grasping Roots") === 0) step(st);
    return gap - Math.hypot(d.x - s.x, d.y - s.y);
  };
  const far = pull(700), near = pull(350);
  t("ดึงเป็นสัดส่วน ไม่ใช่ระยะคงที่", far > near * 1.6,
    "โดนที่ 700 ดึง " + Math.round(far) + " · โดนที่ 350 ดึง " + Math.round(near));
}

// ---- W · กรวยหนามหน่วงเวลา แล้วตรึงเท้าทั้งวง ----
{
  const { st, s, d } = lab();
  step(st);
  d.x = s.x + 400; d.y = s.y;
  s.manual.castKey = "W";
  const sk = skill("W");
  // ระหว่างหน่วงยังไม่ควรมีอะไรเกิดขึ้น
  for (let i = 0; i < Math.floor(60 * sk.delay * 0.5); i++) step(st);
  const early = dealt(s, "Bramble");
  let g = 0;
  while (g++ < 60 * 2 && dealt(s, "Bramble") === 0) step(st);
  t("หนามยังไม่แทงขึ้นระหว่างหน่วงเวลา", early === 0, "ดาเมจตอนครึ่งทางของการหน่วง " + Math.round(early));
  t("ครบเวลาแล้วหนามแทงขึ้นลงดาเมจ", dealt(s, "Bramble") > 0, Math.round(dealt(s, "Bramble")) + " ดาเมจ");
  t("ตรึงเท้าเป้าที่โดน", d.buffs.some((b) => b.type === "root"),
    d.buffs.filter((b) => b.type === "root").map((b) => (b.until - st.t).toFixed(2) + " วิ").join(" ") || "ไม่ติด");
}

// ---- W · ยิงไปทางหนึ่งแล้วศัตรูอีกทางไม่ควรโดน ----
{
  const { st, s, d } = lab();
  step(st);
  d.x = s.x - 400; d.y = s.y;            // ยืนหลังสไตน์
  s.manual.castKey = "W";
  s.manual.castPoint = { x: s.x + 500, y: s.y };
  for (let i = 0; i < 60 * 2; i++) step(st);
  t("คนที่อยู่นอกกรวยไม่โดน", dealt(s, "Bramble") === 0, Math.round(dealt(s, "Bramble")) + " ดาเมจ");
}

// ---- E · โล่คู่ ขนาดเท่ากัน และสเกลกับเกราะ/ต้านเวทของสไตน์ ----
{
  const { st, s, f } = lab();
  step(st);
  s.manual.castKey = "E";
  for (let i = 0; i < 25; i++) step(st);
  t("สไตน์ได้โล่", s.shield > 0, Math.round(s.shield) + " โล่");
  t("เพื่อนได้โล่ก้อนเท่ากัน", f.shield > 0 && Math.abs(f.shield - s.shield) < 2,
    Math.round(f.shield) + " กับ " + Math.round(s.shield));
  t("สายเชื่อมผูกไว้บนตัวเพื่อน", !!f.canopy && f.canopy.ownerId === s.id,
    f.canopy ? "แบ่ง " + Math.round(f.canopy.share * 100) + "%" : "ไม่มี");

  // เกราะเยอะขึ้น โล่ต้องหนาขึ้น
  const thicker = (() => {
    const L = lab();
    step(L.st);
    L.s.baseArmor += 200; L.s.baseMr += 200;
    step(L.st);
    L.s.manual.castKey = "E";
    for (let i = 0; i < 25; i++) step(L.st);
    return L.s.shield;
  })();
  const sk = skill("E");
  t("โล่สเกลตามเกราะและต้านเวทส่วนเกิน", thicker > s.shield * 1.3,
    Math.round(s.shield) + " → " + Math.round(thicker) + " เมื่อเกราะ+ต้านเวทเพิ่มอย่างละ 200 (สูตร " + Math.round(sk.shieldBonusArmor * 100) + "%)");
}

// ---- E · ดาเมจที่เพื่อนกิน ส่วนหนึ่งไปหักที่โล่ของสไตน์ ----
{
  const { st, s, f, d } = lab();
  step(st);
  s.manual.castKey = "E";
  for (let i = 0; i < 25; i++) step(st);
  const sShield0 = s.shield, fShield0 = f.shield;
  // ดัมมี่ต่อยเพื่อนหนึ่งที
  d.manual = { moveTo: null, autoAttack: true, targetId: f.id, castKey: null, castPoint: null };
  d.x = f.x + 100; d.y = f.y;
  d.ad = 400;
  let g = 0;
  while (g++ < 60 * 4 && f.shield >= fShield0) step(st);
  const sk = skill("E");
  const sLost = sShield0 - s.shield, fLost = fShield0 - f.shield;
  t("โล่ของสไตน์ถูกหักแทนเพื่อนจริง", sLost > 0, "โล่สไตน์หายไป " + Math.round(sLost));
  t("สัดส่วนที่รับแทนตรงตามสูตร", fLost > 0 && Math.abs(sLost / (sLost + fLost) - sk.share) < 0.05,
    "สไตน์รับ " + Math.round(sLost / (sLost + fLost) * 100) + "% · ควรเป็น " + Math.round(sk.share * 100) + "%");
}

// ---- E · เลือกให้ใครคือการตัดสินใจ ไม่ใช่หยิบคนเลือดน้อยสุดเสมอ ----
{
  // เพื่อนเลือดเต็มแต่กำลังโดนรุม ควรมาก่อนเพื่อนเลือดพร่องที่ไม่มีใครสนใจ
  const pickWith = (sense) => {
    const me = { lane: "SUPPORT", champId: "STEIN", char: "S", athleteName: "S", athlete: st5(5),
      style: "POKE", level: 18, items: [], ranks: autoRanks(18, ST.skillPriority, null) };
    me.athlete.gameSense = sense;
    const mk2 = (id, lane) => ({ lane, champId: id, char: "F", athleteName: "F", athlete: st5(5),
      style: "HOLD", level: 18, items: [], ranks: autoRanks(18, CHAMPIONS[id].skillPriority, null) });
    const st = buildFight([me, mk2("HOOD", "ADC"), mk2("KAZEM", "TOP")],
      [mk2("ARIEL", "MID"), mk2("JACK", "MID")], 5, DEFAULT_FIGHT);
    st.timeLimit = 1e9;
    step(st);
    const [s, carry, tank] = st.units;
    s.x = 1000; s.y = 500; carry.x = 1100; carry.y = 500; tank.x = 1200; tank.y = 500;
    tank.hp = tank.maxHp * 0.45;                 // แทงค์เลือดพร่อง แต่ไม่มีใครเล็ง
    carry.hp = carry.maxHp;                      // แครี่เลือดเต็ม แต่โดนเล็งสองคน
    for (const e of st.units.filter((x) => x.team === "red")) e.targetId = carry.id;
    return canopyPick(st, s, s.skills.find((x) => x.key === "E"));
  };
  const hi = pickWith(10), lo = pickWith(0);
  t("สายตาสูงกางให้แครี่ที่กำลังโดนเล็ง", hi && hi.champ.id === "HOOD", hi ? hi.champ.id : "ไม่เลือกใคร");
  t("สายตาต่ำมองเห็นแค่หลอดเลือด เลยกางให้แทงค์", lo && lo.champ.id === "KAZEM", lo ? lo.champ.id : "ไม่เลือกใคร");
}

// ---- R · หยั่งรากนิ่ง ฮีลห้าระลอก และลดดาเมจระหว่างร่าย ----
{
  const { st, s, f } = lab();
  step(st);
  s.hp = s.maxHp * 0.4;
  f.hp = f.maxHp * 0.4;
  f.x = s.x + 200; f.y = s.y;
  const sHp0 = s.hp, fHp0 = f.hp;
  const x0 = s.x, y0 = s.y;
  s.manual.castKey = "R";
  for (let i = 0; i < 20; i++) step(st);
  const sk = skill("R");
  const r = Math.max(0, s.skills.find((x) => x.key === "R").rank - 1);
  t("กด R แล้วตรึงตัวเองอยู่กับที่", s.rooted, "rooted=" + !!s.rooted);
  t("ระหว่างร่ายได้ลดดาเมจที่รับ", Math.abs((s.drAll || 0) - sk.dr[r]) < 0.01,
    Math.round((s.drAll || 0) * 100) + "% · ควรเป็น " + Math.round(sk.dr[r] * 100) + "%");
  let waves = 0, last = f.hp;
  for (let i = 0; i < Math.ceil(60 * (sk.waves * sk.every + 0.5)); i++) {
    step(st);
    if (f.hp > last + 20) waves++;
    last = f.hp;
  }
  t("ปล่อยคลื่นฮีลครบห้าระลอก", waves === sk.waves, "นับได้ " + waves + " ระลอก");
  t("ฮีลทั้งตัวเองและเพื่อนในวง", s.hp > sHp0 && f.hp > fHp0,
    "สไตน์ +" + Math.round(s.hp - sHp0) + " · เพื่อน +" + Math.round(f.hp - fHp0));
  t("ไม่ขยับจากจุดที่หยั่งราก", Math.hypot(s.x - x0, s.y - y0) < 5, "ขยับ " + Math.round(Math.hypot(s.x - x0, s.y - y0)) + " หน่วย");
  t("จบระลอกสุดท้ายแล้วเดินได้และดาเมจกลับมาปกติ", !s.rooted && !(s.drAll > 0),
    "rooted=" + !!s.rooted + " · ลดดาเมจ " + Math.round((s.drAll || 0) * 100) + "%");
}

// ---- R · ทุกระลอกเร่งพาสซีฟ ----
{
  const { st, s } = lab();
  step(st);
  s.sapReadyAt = st.t + 30;
  const before = s.sapReadyAt;
  s.manual.castKey = "R";
  const sk = skill("R");
  for (let i = 0; i < Math.ceil(60 * (sk.waves * sk.every + 0.5)); i++) step(st);
  const cut = before - s.sapReadyAt;
  // กด R หนึ่งครั้ง (2 วิ) บวกอีกห้าระลอก (5 × 2 วิ) = 12 วิ
  t("R ตัดคูลดาวน์พาสซีฟทุกระลอก", Math.abs(cut - ST.sap.cutOnCast * (sk.waves + 1)) < 0.2,
    "ตัดไปรวม " + cut.toFixed(1) + " วิ · ควรเป็น " + (ST.sap.cutOnCast * (sk.waves + 1)) + " วิ");
}

// ---- แต้มทีมเวิร์คเปลี่ยนจังหวะกดอัลติ ----
{
  // เพื่อนหนึ่งคนเลือดพร่อง — คนที่ทีมเวิร์คสูงกดให้เลย คนที่ต่ำอั้นไว้
  const wouldUlt = (tw) => {
    const { st, s, f } = lab(18, "HOOD", 5);
    step(st);
    s.athlete.teamwork = tw;
    s.manual = null;                         // ปล่อยให้บอทคิดเอง ไม่ใช่สั่งมือ
    f.hp = f.maxHp * 0.6;
    f.x = s.x + 200; f.y = s.y;
    const sk = s.skills.find((x) => x.key === "R");
    sk.cdLeft = 0;
    sk.readyAt = -999;                       // ผ่านช่วงอดใจรอของ decision ไปแล้ว
    // ต้องดูที่ "หยั่งรากอยู่หรือเปล่า" อย่างเดียว — u.casts ขยับจาก Q/W/E ด้วย
    for (let i = 0; i < 60; i++) { step(st); if (s.channeling) return true; }
    return false;
  };
  const hi = wouldUlt(10), lo = wouldUlt(0);
  t("ทีมเวิร์คสูงยอมหยั่งรากเพื่อเพื่อนคนเดียว", hi, hi ? "กด" : "ไม่กด");
  t("ทีมเวิร์คต่ำอั้นไว้ ยังไม่กดให้เพื่อนคนเดียว", !lo, lo ? "กด" : "ไม่กด");
}

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(52) + " " + d); }
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
