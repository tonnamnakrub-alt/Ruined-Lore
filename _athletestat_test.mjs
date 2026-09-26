// ---------------------------------------------------------------
// ค่าสถานะของนักแข่งต้องเปลี่ยน "สิ่งที่บอทตัดสินใจทำ" เท่านั้น
// ห้ามมีค่าไหนแอบบวกลบดาเมจลับหลัง — ผู้เล่นต้องดูไฟต์แล้วเห็นความต่างได้เอง
//
// เทสนี้จับการตัดสินใจตรงๆ: เลือกตีใคร กดอัลติตอนไหน ออโต้พลาดบ่อยแค่ไหน
// ---------------------------------------------------------------
import { STAT_KEYS } from "./src/data/constants.js";
import { ITEMS } from "./src/data/items.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { applyDamage } from "./src/engine/damage.js";
import { step } from "./src/engine/step.js";
import { pickTarget } from "./src/engine/targeting.js";
import { STAT_DESC, toDef } from "./src/game/roster.js";

const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);
const big = ITEMS.filter((i) => i.cost >= 50);
const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));

const mk = (lane, id, stats) => ({
  lane, champId: id, level: 13, xp: 0, gold: 0, items: [big[2]],
  ranks: { Q: 5, W: 5, E: 5, R: 2 }, athlete: { ...stats },
  upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE",
});

// สนามที่คุมได้: ฝั่งเราสี่คน ฝั่งศัตรูสามคน ไม่มีซัพ พาสซีฟ +1 จึงไม่กวน
function arena(mineStats, foeStats) {
  const mine = [["TOP", "KAZEM"], ["JUNGLE", "YODAKA"], ["MID", "LAURA"], ["ADC", "HOOD"]]
    .map(([l, c]) => mk(l, c, mineStats));
  const foes = [["TOP", "KAZEM"], ["MID", "LAURA"], ["ADC", "HOOD"]]
    .map(([l, c]) => mk(l, c, foeStats));
  const st = buildFight(mine.map(toDef), foes.map(toDef), 99, DEFAULT_FIGHT);
  return {
    st,
    mine: st.units.filter((u) => u.team === "blue"),
    foes: st.units.filter((u) => u.team === "red"),
  };
}

// ---- 0) ห้ามมีตัวคูณดาเมจแอบแฝง ----
{
  const hit = (mineStats, foeStats) => {
    const a = arena(mineStats, foeStats);
    const src = a.mine[0], tgt = a.foes[0];
    for (const u of a.mine) { u.x = tgt.x - 150; u.y = tgt.y; u.targetId = tgt.id; }
    step(a.st);
    tgt.hp = tgt.maxHp; tgt.shield = 0;
    applyDamage(a.st, src, tgt, 1000, false);
    return tgt.maxHp - tgt.hp;
  };
  const best = hit(flat(10), flat(0));
  const worst = hit(flat(0), flat(10));
  t("ค่าสถานะไม่แตะดาเมจเลย ไม่ว่าฝั่งไหนจะเต็มหรือศูนย์",
    Math.abs(best - worst) < 0.01, Math.round(best) + " เทียบกับ " + Math.round(worst) + " ดาเมจ");
}

// ---- 1) ความรู้ — อ่านแมตช์อัพแล้วเลือกเป้าที่ "เรา" กินได้เร็วจริง ----
{
  // ตัวถังเกราะหนายืนใกล้ ตัวเปราะเกราะบางยืนไกลกว่านิดเดียว
  const setup = (knowStat) => {
    const a = arena({ ...flat(5), knowledge: knowStat }, flat(5));
    const me = a.mine[0];
    const [tank, squish] = a.foes;
    for (const u of a.mine.slice(1)) { u.x = -9000; u.y = -9000; u.targetId = null; }
    a.foes[2].x = -9000; a.foes[2].y = -9000;
    me.ap = 0;
    tank.x = me.x + 300; tank.y = me.y;
    tank.armor = 400; tank.mr = 400; tank.hp = tank.maxHp;
    squish.x = me.x + 480; squish.y = me.y;
    squish.armor = 0; squish.mr = 0; squish.hp = squish.maxHp * 0.9;
    return { a, me, tank, squish };
  };
  const hi = setup(10);
  const lo = setup(0);
  const pickHi = pickTarget(hi.a.st, hi.me, false);
  const pickLo = pickTarget(lo.a.st, lo.me, false);
  t("ความรู้สูงข้ามตัวถังเกราะหนาไปเก็บตัวเปราะ", !!pickHi && pickHi.id === hi.squish.id,
    pickHi ? (pickHi.id === hi.squish.id ? "เลือกตัวเปราะ" : "เลือกตัวถัง") : "ไม่เลือกใครเลย");
  t("ความรู้ต่ำจิ้มตัวที่อยู่ใกล้ที่สุด", !!pickLo && pickLo.id === lo.tank.id,
    pickLo ? (pickLo.id === lo.tank.id ? "เลือกตัวถังที่อยู่ใกล้" : "เลือกตัวเปราะ") : "ไม่เลือกใครเลย");
}

// ---- 2) ทีมเวิร์ค — ไม่ไปสมทบเป้าที่เพื่อนเก็บอยู่แล้ว ----
{
  const setup = (teamStat) => {
    const a = arena({ ...flat(5), teamwork: teamStat }, flat(5));
    const me = a.mine[0];
    const [doomed, fresh] = a.foes;
    a.foes[2].x = -9000; a.foes[2].y = -9000;
    // เป้าแรกเลือดปริ่มและมีเพื่อนสามคนจ่ออยู่แล้ว เป้าที่สองเลือดเต็มไม่มีใครจ่อ
    doomed.x = me.x + 260; doomed.y = me.y;
    doomed.hp = 40; doomed.shield = 0; doomed.armor = 0; doomed.mr = 0;
    fresh.x = me.x + 300; fresh.y = me.y + 60;
    fresh.hp = fresh.maxHp;
    for (const u of a.mine.slice(1)) { u.x = doomed.x - 80; u.y = doomed.y; u.targetId = doomed.id; }
    return { a, me, doomed, fresh };
  };
  const hi = setup(10);
  const lo = setup(0);
  const pickHi = pickTarget(hi.a.st, hi.me, false);
  const pickLo = pickTarget(lo.a.st, lo.me, false);
  t("ทีมเวิร์คสูงปล่อยให้เพื่อนเก็บ แล้วย้ายไปตัวถัดไป", !!pickHi && pickHi.id === hi.fresh.id,
    pickHi ? (pickHi.id === hi.fresh.id ? "ย้ายไปตัวเลือดเต็ม" : "ยังไปสมทบตัวที่ตายอยู่แล้ว") : "ไม่เลือกใครเลย");
  t("ทีมเวิร์คต่ำยังไปสมทบตีศพ", !!pickLo && pickLo.id === lo.doomed.id,
    pickLo ? (pickLo.id === lo.doomed.id ? "ไปสมทบตีศพ" : "ย้ายไปตัวอื่น") : "ไม่เลือกใครเลย");
}

// ---- 3) สายตา — อ่านออกว่าใครกำลังเล่นงานเราอยู่ ----
{
  const setup = (senseStat) => {
    const a = arena({ ...flat(5), gameSense: senseStat }, flat(5));
    const me = a.mine[0];
    const [onMe, other] = a.foes;
    a.foes[2].x = -9000; a.foes[2].y = -9000;
    for (const u of a.mine.slice(1)) { u.x = -9000; u.y = -9000; u.targetId = null; }
    // คนที่จ่อเราอยู่ยืนไกลกว่าอีกคนนิดหน่อย ถ้าอ่านเกมไม่ออกก็จะไปตีคนที่ใกล้กว่า
    onMe.x = me.x + 420; onMe.y = me.y; onMe.targetId = me.id;
    onMe.hp = onMe.maxHp; other.hp = other.maxHp;
    other.x = me.x + 300; other.y = me.y + 40; other.targetId = null;
    return { a, me, onMe, other };
  };
  const hi = setup(10);
  const lo = setup(0);
  const pickHi = pickTarget(hi.a.st, hi.me, false);
  const pickLo = pickTarget(lo.a.st, lo.me, false);
  t("สายตาสูงหันไปจัดการคนที่กำลังเล่นงานเรา", !!pickHi && pickHi.id === hi.onMe.id,
    pickHi ? (pickHi.id === hi.onMe.id ? "เลือกคนที่จ่อเราอยู่" : "เลือกคนที่อยู่ใกล้กว่า") : "ไม่เลือกใครเลย");
  t("สายตาต่ำตีอะไรก็ได้ที่อยู่ใกล้", !!pickLo && pickLo.id === lo.other.id,
    pickLo ? (pickLo.id === lo.other.id ? "เลือกคนที่อยู่ใกล้" : "เลือกคนที่จ่อเราอยู่") : "ไม่เลือกใครเลย");
}

// ---- 4) ฝีมือ — ออโต้เสียเปล่าน้อยลง ----
{
  const whiffs = (m) => {
    const a = arena({ ...flat(5), mechanics: m }, flat(5));
    for (const u of a.mine.slice(1)) { u.x = -9000; u.y = -9000; }
    for (const e of a.foes) { e.maxHp = 1e9; e.hp = 1e9; }
    let g = 0;
    while (g++ < 60 * 60) step(a.st);
    const me = a.mine[0];
    return (me.wasted || 0) / Math.max(1, me.shots);
  };
  const rHi = whiffs(10), rLo = whiffs(0);
  t("ฝีมือสูงออโต้เสียเปล่าน้อยกว่า", rHi < rLo,
    "ฝีมือ 0 พลาด " + (100 * rLo).toFixed(1) + "% · ฝีมือ 10 พลาด " + (100 * rHi).toFixed(1) + "%");
}

// ---- 5) การตัดสินใจ — อดใจรออัลติแบบลาดเอียง ไม่ใช่หน้าผา ----
{
  const ultsBy = (d) => {
    let held = 0, casts = 0;
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
      const t0 = st.t;
      let g = 0;
      while (g++ < 60 * 25) {
        step(st);
        if (r.cdLeft > 0) { casts++; held += st.t - t0; break; }
      }
    }
    return held / Math.max(1, casts);
  };
  const a = ultsBy(0), b = ultsBy(5), c = ultsBy(10);
  t("แต้มยิ่งสูงยิ่งอดใจรอจังหวะได้นาน", c > b && b > a,
    "แต้ม 0 รอ " + a.toFixed(1) + " วิ · แต้ม 5 รอ " + b.toFixed(1) + " วิ · แต้ม 10 รอ " + c.toFixed(1) + " วิ");
  t("เป็นลาดเอียง ไม่ใช่หน้าผาที่แต้ม 4", b > a + 1 && c > b + 1,
    "ช่วงห่าง 0→5 = " + (b - a).toFixed(1) + " วิ · 5→10 = " + (c - b).toFixed(1) + " วิ");
}

// ---- 6) คำอธิบายต้องไม่สัญญาเรื่องดาเมจที่ไม่มีอยู่จริง ----
{
  const all = Object.values(STAT_DESC).join(" ");
  t("ไม่มีคำอธิบายไหนอ้างว่าเพิ่ม/ลดดาเมจ", !/ตีแรงขึ้น|กินดาเมจน้อยลง|ดาเมจยิ่งแรง/.test(all),
    "ทุกคำอธิบายพูดถึงการตัดสินใจล้วนๆ");
}

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(48) + " " + d); }
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
