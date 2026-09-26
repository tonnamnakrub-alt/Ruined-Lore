// ---------------------------------------------------------------
// ค่าสถานะของนักแข่งทั้งห้าค่าต้องมีผลที่จับต้องได้ในสนาม
//
// ก่อนแก้: gameSense แทบไม่มีผลเลย และ teamwork ยิ่งใส่ยิ่งแพ้บ่อยขึ้น
// เทสนี้ยิงดาเมจตรงๆ แล้ววัดผลทีละค่า ไม่ต้องพึ่งอัตราชนะที่แกว่ง
// ---------------------------------------------------------------
import { STAT_KEYS } from "./src/data/constants.js";
import { ITEMS } from "./src/data/items.js";
import {
  DEFAULT_FIGHT, KNOW_DEAL, KNOW_TAKE, SENSE_GUARD, SENSE_GUARD_RANGE, TEAM_FOCUS,
} from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { applyDamage } from "./src/engine/damage.js";
import { step } from "./src/engine/step.js";
import { STAT_DESC } from "./src/game/roster.js";
import { toDef } from "./src/game/roster.js";

const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);
const big = ITEMS.filter((i) => i.cost >= 50);

const mk = (lane, id, stats) => ({
  lane, champId: id, level: 13, xp: 0, gold: 0, items: [big[2]],
  ranks: { Q: 5, W: 5, E: 5, R: 2 },
  athlete: { ...stats },
  upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE",
});
const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));

// สนามที่คุมได้: ฝั่งน้ำเงินสี่คน ฝั่งแดงหนึ่งคน · ไม่มีซัพ พาสซีฟ +1 จึงไม่เข้ามากวน
function arena(blueStats, redStats) {
  const blue = [["TOP", "KAZEM"], ["JUNGLE", "YODAKA"], ["MID", "LAURA"], ["ADC", "HOOD"]]
    .map(([l, c]) => mk(l, c, blueStats));
  const red = [mk("TOP", "KAZEM", redStats)];
  const st = buildFight(blue.map(toDef), red.map(toDef), 99, DEFAULT_FIGHT);
  const mine = st.units.filter((u) => u.team === "blue");
  const foe = st.units.find((u) => u.team === "red");
  return { st, mine, foe };
}

// ยิงดาเมจก้อนคงที่หนึ่งครั้งแล้ววัดว่าหายไปเท่าไหร่
function hit(st, src, tgt, amount = 1000) {
  tgt.hp = tgt.maxHp;
  tgt.shield = 0;
  applyDamage(st, src, tgt, amount, false);
  return tgt.maxHp - tgt.hp;
}

// ---- 1) ความรู้แมตช์อัพ: คนตีแรงขึ้น คนโดนเจ็บน้อยลง ----
{
  const hi = arena(flat(10), flat(5));
  const lo = arena(flat(0), flat(5));
  // เอาทุกคนออกไปไกลๆ ไม่ให้โบนัสรุมกับเกราะสายตาเข้ามาปน
  for (const a of [hi, lo]) {
    for (const u of a.mine.slice(1)) { u.x = -9000; u.y = -9000; u.targetId = null; }
    a.mine[0].targetId = null;
    step(a.st);
  }
  const dHi = hit(hi.st, hi.mine[0], hi.foe);
  const dLo = hit(lo.st, lo.mine[0], lo.foe);
  t("ความรู้สูงตีแรงกว่าความรู้ต่ำ", dHi > dLo,
    Math.round(dLo) + " → " + Math.round(dHi) + " ดาเมจ (+" + (100 * (dHi / dLo - 1)).toFixed(1) + "%)");
  const want = (1 + 5 * KNOW_DEAL) / (1 - 5 * KNOW_DEAL);
  t("ต่างกันตามปุ่ม KNOW_DEAL", Math.abs(dHi / dLo - want) < 0.01,
    "วัดได้ ×" + (dHi / dLo).toFixed(4) + " · ควรได้ ×" + want.toFixed(4));

  const tough = arena(flat(5), flat(10));
  const soft = arena(flat(5), flat(0));
  for (const a of [tough, soft]) {
    for (const u of a.mine.slice(1)) { u.x = -9000; u.y = -9000; u.targetId = null; }
    a.mine[0].targetId = null;
    step(a.st);
  }
  const dT = hit(tough.st, tough.mine[0], tough.foe);
  const dS = hit(soft.st, soft.mine[0], soft.foe);
  t("ความรู้สูงกินดาเมจน้อยกว่า", dT < dS,
    Math.round(dS) + " → " + Math.round(dT) + " ดาเมจที่รับ (−" + (100 * (1 - dT / dS)).toFixed(1) + "%)");
  t("ต่างกันตามปุ่ม KNOW_TAKE", KNOW_TAKE > 0 && Math.abs(dT / dS - (1 - 5 * KNOW_TAKE) / (1 + 5 * KNOW_TAKE)) < 0.01,
    "วัดได้ ×" + (dT / dS).toFixed(4));
}

// ---- 2) ทีมเวิร์ค: เพื่อนจ่อเป้าเดียวกันยิ่งหลายคนยิ่งแรง ----
{
  const setup = (teamStat) => {
    const a = arena({ ...flat(5), teamwork: teamStat }, flat(5));
    // ดึงทุกคนออกห่างเป้าให้พ้นระยะเกราะสายตา แต่ยังอยู่ในระยะนับโฟกัส
    for (const u of a.mine) { u.x = a.foe.x - (SENSE_GUARD_RANGE + 300); u.y = a.foe.y; }
    step(a.st);
    return a;
  };
  const solo = setup(10);
  for (const u of solo.mine) u.targetId = null;
  const dSolo = hit(solo.st, solo.mine[0], solo.foe);

  const packed = setup(10);
  for (const u of packed.mine) u.targetId = packed.foe.id;
  const dPack = hit(packed.st, packed.mine[0], packed.foe);

  t("รุมเป้าเดียวกันแล้วแรงขึ้นจริง", dPack > dSolo,
    Math.round(dSolo) + " → " + Math.round(dPack) + " ดาเมจ (+" + (100 * (dPack / dSolo - 1)).toFixed(1) + "%)");
  t("โบนัสตรงกับปุ่ม TEAM_FOCUS (เพื่อน 3 คน)", Math.abs(dPack / dSolo - (1 + 3 * TEAM_FOCUS)) < 0.01,
    "วัดได้ ×" + (dPack / dSolo).toFixed(4) + " · ควรได้ ×" + (1 + 3 * TEAM_FOCUS).toFixed(4));

  const dull = setup(0);
  for (const u of dull.mine) u.targetId = dull.foe.id;
  const dDull = hit(dull.st, dull.mine[0], dull.foe);
  t("ทีมเวิร์ค 0 ไม่ได้โบนัสรุมเลย", Math.abs(dDull - dSolo) < 0.5,
    Math.round(dDull) + " เทียบกับตีคนเดียว " + Math.round(dSolo));
}

// ---- 3) สายตาอ่านเกม: โดนประชิดรุมแล้วเจ็บน้อยลง ----
{
  const setup = (senseStat) => {
    const a = arena(flat(5), { ...flat(5), gameSense: senseStat });
    for (const u of a.mine) { u.x = a.foe.x - 120; u.y = a.foe.y; u.targetId = null; }
    step(a.st);
    return a;
  };
  const sharp = setup(10);
  const blind = setup(0);
  const dSharp = hit(sharp.st, sharp.mine[0], sharp.foe);
  const dBlind = hit(blind.st, blind.mine[0], blind.foe);
  t("สายตาสูงกินดาเมจน้อยกว่าตอนโดนรุม", dSharp < dBlind,
    Math.round(dBlind) + " → " + Math.round(dSharp) + " ดาเมจที่รับ (−" + (100 * (1 - dSharp / dBlind)).toFixed(1) + "%)");
  t("เกราะตรงกับปุ่ม SENSE_GUARD (ศัตรูประชิด 3 ตัว)",
    Math.abs(dSharp / dBlind - (1 - 3 * SENSE_GUARD)) < 0.01,
    "วัดได้ ×" + (dSharp / dBlind).toFixed(4) + " · ควรได้ ×" + (1 - 3 * SENSE_GUARD).toFixed(4));

  // ยืนห่างแล้วเกราะต้องไม่ทำงาน — เป็นเกราะของการ "โดนประชิด" ไม่ใช่เกราะติดตัว
  const far = arena(flat(5), { ...flat(5), gameSense: 10 });
  for (const u of far.mine) { u.x = far.foe.x - (SENSE_GUARD_RANGE + 300); u.y = far.foe.y; u.targetId = null; }
  step(far.st);
  const dFar = hit(far.st, far.mine[0], far.foe);
  t("ยืนไกลแล้วเกราะสายตาไม่ทำงาน", dFar > dSharp,
    Math.round(dFar) + " ดาเมจตอนยืนไกล เทียบกับ " + Math.round(dSharp) + " ตอนโดนประชิด");
}

// ---- 4) ฝีมือ: ออโต้พลาดน้อยลง ----
{
  const whiffs = (m) => {
    const a = arena({ ...flat(5), mechanics: m }, flat(5));
    for (const u of a.mine.slice(1)) { u.x = -9000; u.y = -9000; }
    a.foe.maxHp = 1e9; a.foe.hp = 1e9;
    let g = 0;
    while (g++ < 60 * 60) step(a.st);
    const me = a.mine[0];
    return { shots: me.shots, wasted: me.wasted || 0 };
  };
  const hi = whiffs(10), lo = whiffs(0);
  const rHi = hi.wasted / Math.max(1, hi.shots);
  const rLo = lo.wasted / Math.max(1, lo.shots);
  t("ฝีมือสูงออโต้เสียเปล่าน้อยกว่า", rHi < rLo,
    "ฝีมือ 0 พลาด " + (100 * rLo).toFixed(1) + "% · ฝีมือ 10 พลาด " + (100 * rHi).toFixed(1) + "%");
}

// ---- 5) การตัดสินใจ: อดใจรออัลติแบบลาดเอียง ไม่ใช่หน้าผา ----
{
  // ศัตรูตัวเดียวเลือดหนามาก เลือดเราก็เต็ม — เงื่อนไข "คุ้มที่จะกด" จึงไม่เป็นจริงเลยทั้งไฟต์
  // เหลือแค่ความอดใจล้วนๆ ให้วัด
  const ultsBy = (d) => {
    let held = 0, casts = 0, fights = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const blue = [mk("TOP", "KAZEM", { ...flat(5), decision: d })];
      const red = [mk("TOP", "LUCH", flat(5))];
      const st = buildFight(blue.map(toDef), red.map(toDef), seed * 31, DEFAULT_FIGHT);
      st.timeLimit = 1e9;
      const me = st.units[0], foe = st.units[1];
      foe.maxHp = 1e9; foe.hp = 1e9;
      me.maxHp = 1e9; me.hp = 1e9;
      const r = me.skills.find((s) => s.key === "R");
      r.cdLeft = 0;
      let g = 0;
      const t0 = st.t;
      while (g++ < 60 * 25) {
        step(st);
        if (r.cdLeft > 0) { casts++; held += st.t - t0; break; }
      }
      fights++;
    }
    return { wait: held / Math.max(1, casts), casts, fights };
  };
  const a = ultsBy(0), b = ultsBy(5), c = ultsBy(10);
  const show = (x) => x.wait.toFixed(1) + " วิ";
  t("แต้มยิ่งสูงยิ่งอดใจรอจังหวะได้นาน", c.wait > b.wait && b.wait > a.wait,
    "แต้ม 0 รอ " + show(a) + " · แต้ม 5 รอ " + show(b) + " · แต้ม 10 รอ " + show(c));
  t("เป็นลาดเอียง ไม่ใช่หน้าผาที่แต้ม 4", b.wait > a.wait + 1 && c.wait > b.wait + 1,
    "ช่วงห่าง 0→5 = " + (b.wait - a.wait).toFixed(1) + " วิ · 5→10 = " + (c.wait - b.wait).toFixed(1) + " วิ");
}

// ---- 6) คำอธิบายต้องตรงกับที่โค้ดทำจริง ----
{
  t("คำอธิบาย gameSense พูดถึงการโดนรุม", /โดนรุม/.test(STAT_DESC.gameSense), STAT_DESC.gameSense);
  t("คำอธิบาย teamwork พูดถึงการรุมเป้าเดียวกัน", /รุมเป้าเดียว/.test(STAT_DESC.teamwork), STAT_DESC.teamwork);
  t("ปุ่มทุกตัวเปิดใช้งานอยู่",
    KNOW_DEAL > 0 && KNOW_TAKE > 0 && TEAM_FOCUS > 0 && SENSE_GUARD > 0,
    "KNOW " + KNOW_DEAL + "/" + KNOW_TAKE + " · TEAM " + TEAM_FOCUS + " · SENSE " + SENSE_GUARD);
}

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(46) + " " + d); }
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
