// TOTSAKAN รีเวิร์ค — ตัวเลขตรงสเปค และกลไกทุกท่าทำงานจริงในไฟต์
import { CHAMPIONS } from "./src/data/champions.js";
import { ITEM_BY_ID } from "./src/data/items.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { fireSkill } from "./src/engine/fire-skill.js";
import { step } from "./src/engine/step.js";
import { deriveStats } from "./src/engine/stats.js";
import { toDef } from "./src/game/roster.js";

const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);
const C = CHAMPIONS.TOTSAKAN;
const sk = (k) => C.skills.find((s) => s.key === k);
const arr = (a) => (a || []).join("/");

const mk = (lane, id, extra) => ({
  lane, champId: id, level: 11, xp: 0, gold: 0, items: [],
  ranks: { Q: 5, W: 5, E: 5, R: 3 },
  athlete: { mechanics: 8, gameSense: 8, knowledge: 8, decision: 8, teamwork: 8 },
  upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE", ...extra,
});

// ---- สเตตัสพื้นฐาน ----
{
  const want = { hp: 640, hpG: 108, hp5: 8.5, hp5G: 0.85, ad: 66, adG: 4.0, armor: 38, armorG: 4.2, mr: 32, mrG: 2.05, ms: 340, range: 175 };
  const bad = Object.entries(want).filter(([k, v]) => C[k] !== v);
  t("สเตตัสพื้นฐานตรงสเปค", bad.length === 0, bad.length ? bad.map(([k, v]) => k + " " + C[k] + "≠" + v).join(" ") : "ครบทุกค่า");
  t("สายการเล่นเป็น Juggernaut", C.role === "Juggernaut", C.role);
}

// ---- พาสซีฟไต่ตามเลเวล ----
{
  const amp = (lv) => (C.itemAmp + C.itemAmpPerLevel * lv) * 100;
  const want = { 1: 7.75, 6: 11.5, 11: 15.25, 18: 20.5, 20: 22 };
  const bad = Object.entries(want).filter(([lv, v]) => Math.abs(amp(+lv) - v) > 0.001);
  t("พาสซีฟไต่ทุกเลเวลตรงสเปค", bad.length === 0,
    Object.entries(want).map(([lv, v]) => "Lv" + lv + " " + v + "%").join(" · "));

  // ของจากไอเทมต้องถูกขยายจริงตามเลเวล
  const item = ITEM_BY_ID.asc;   // ของที่ให้ AD ชัดๆ
  const at = (lv) => deriveStats({ lane: "TOP", champId: "TOTSAKAN", level: lv, items: [item], ranks: { Q: 1, W: 0, E: 0, R: 0 }, athlete: { mechanics: 5, gameSense: 5, knowledge: 5, decision: 5, teamwork: 5 }, upgrades: [] });
  const gain = (lv) => at(lv).ad - (C.ad + C.adG * (lv - 1));
  // ส่วนที่พาสซีฟรีดออกมาได้เกินค่าบนไอเทม ต้องโตตามเลเวล
  const extra = (lv) => gain(lv) - item.ad;
  const e1 = extra(1), e18 = extra(18);
  t("พาสซีฟรีดค่าจากไอเทมได้มากขึ้นตามเลเวล", e18 > e1 * 2,
    "ของให้ " + item.ad + " AD -> Lv1 ได้ " + gain(1).toFixed(0) + " (+" + e1.toFixed(1) + ") · Lv18 ได้ " + gain(18).toFixed(0) + " (+" + e18.toFixed(1) + ")");
}

// ---- Q ----
{
  const q = sk("Q");
  t("Q เป็นแนวสี่เหลี่ยมโดนทันที 650×260", q.range === 650 && q.width === 260 && q.instant,
    q.range + "×" + q.width);
  t("Q คูลดาวน์ 7/6.5/6/5.5/5", arr(q.cdByRank) === "7/6.5/6/5.5/5", arr(q.cdByRank));
  t("Q ดาเมจ 75/110/145/180/215 (+75% Total AD)", arr(q.dmg) === "75/110/145/180/215" && q.adRatio === 0.75,
    arr(q.dmg) + " +" + q.adRatio * 100 + "% AD");
  t("Q ถอดสเกล Bonus HP ออกแล้ว", !q.selfBonusHp, q.selfBonusHp ? "ยังมี " + q.selfBonusHp : "ไม่มีแล้ว");
  const gb = q.groundBurn;
  t("Q มีเพลิงต่อเนื่อง 3 วิ จ่ายทุก 0.5 วิ", gb && gb.dur === 3 && gb.every === 0.5, gb ? gb.dur + "s ทุก " + gb.every + "s" : "ไม่มี");
  t("Q ดาเมจเพลิงต่องวด 8/13/18/23/28 (+8% Bonus AD)", arr(gb.dmg) === "8/13/18/23/28" && gb.badRatio === 0.08,
    arr(gb.dmg) + " · รวม 3 วิ = " + gb.dmg.map((d) => d * 6).join("/"));
  t("Q สโลว์ 15% +1% ต่อเลเวล นาน 1.5 วิ", q.slowBase === 0.15 && q.slowPerLevel === 0.01 && q.dur === 1.5,
    "Lv1 " + ((q.slowBase + q.slowPerLevel) * 100) + "% · Lv18 " + ((q.slowBase + q.slowPerLevel * 18) * 100) + "%");
}

// ---- W ----
{
  const w = sk("W");
  t("W เป็นออร่ารอบตัว 450 นาน 5 วิ", w.type === "wrathAura" && w.radius === 450 && w.dur === 5, w.radius + " หน่วย · " + w.dur + "s");
  t("W คูลดาวน์ 14/13/12/11/10", arr(w.cdByRank) === "14/13/12/11/10", arr(w.cdByRank));
  t("W กด AD/AP ศัตรู 10-20%", arr(w.atkCut) === "0.1/0.125/0.15/0.175/0.2" && w.linger === 1.5,
    w.atkCut.map((x) => x * 100 + "%").join("/") + " · ค้างต่อ " + w.linger + "s");
  t("W เร่งตัวเอง เดิน/ตี 20-40%", arr(w.msBuff) === "0.2/0.25/0.3/0.35/0.4" && arr(w.asBuff) === arr(w.msBuff),
    "MS/AS " + w.msBuff.map((x) => x * 100 + "%").join("/"));
}

// ---- E ----
{
  const e = sk("E");
  t("E พุ่ง 550 เหวี่ยงข้ามหัว 275 ลอย 0.5 วิ", e.dashRange === 550 && e.dashSpeed === 1200 && e.toss === 275 && e.airborne === 0.5,
    "พุ่ง " + e.dashRange + " @" + e.dashSpeed + " · เหวี่ยง " + e.toss);
  t("E คูลดาวน์ 13/12.5/12/11.5/11", arr(e.cdByRank) === "13/12.5/12/11.5/11", arr(e.cdByRank));
  t("E ดาเมจ 70-230 (+65% Bonus AD) (+6% Bonus HP)",
    arr(e.dmg) === "70/110/150/190/230" && e.badRatio === 0.65 && e.selfBonusHp === 0.06, arr(e.dmg));
  const ae = e.aegis;
  t("E โล่ 80-260 (+12% Bonus HP) นาน 3.5 วิ",
    ae && arr(ae.shield) === "80/125/170/215/260" && ae.bonusHpRatio === 0.12 && ae.dur === 3.5, ae ? arr(ae.shield) : "ไม่มี");
  t("E ลดดาเมจ 15-27%", arr(ae.drAll) === "0.15/0.18/0.21/0.24/0.27", ae.drAll.map((x) => x * 100 + "%").join("/"));
}

// ---- R ----
{
  const r = sk("R");
  t("R ทุบทันทีรอบตัว 550 ไม่ล็อกขา", r.type === "asuraSlam" && r.radius === 550 && !r.selfRoot, r.radius + " หน่วย");
  t("R คูลดาวน์ 100/85/70", arr(r.cdByRank) === "100/85/70", arr(r.cdByRank));
  t("R ดาเมจ 200/325/450 (+90% Bonus AD) (+10% Bonus HP)",
    arr(r.dmg) === "200/325/450" && r.badRatio === 0.90 && r.selfBonusHp === 0.10, arr(r.dmg));
  t("R ยกลอย 1.25 วิ", r.airborne === 1.25, r.airborne + "s");
  const a = r.arms;
  t("R งอกแขน 2 ข้างต่อศัตรู 1 ตัว สูงสุด 10", a.per === 2 && a.max === 10, a.per + " ข้าง/ตัว · สูงสุด " + a.max);
  t("R แขนละ 3/4/5% ตามขั้นอัลติ นาน 10 วิ", arr(a.amp) === "0.03/0.04/0.05" && a.dur === 10,
    a.amp.map((x) => x * 100 + "%").join("/") + " · " + a.dur + "s");
  // ตัวอย่างจากสเปค: เลเวล 16 ขั้น 3 โดน 3 ตัว = 6 แขน = +30%
  const armAmp = Math.min(a.max, 3 * a.per) * a.amp[2];
  t("ตัวอย่างสเปค: โดน 3 ตัว = +30%", Math.abs(armAmp - 0.30) < 1e-9, "+" + (armAmp * 100).toFixed(0) + "%");
  const full = Math.min(a.max, 5 * a.per) * a.amp[2];
  t("โดนครบ 5 ตัว = +50%", Math.abs(full - 0.50) < 1e-9, "+" + (full * 100).toFixed(0) + "%");
}

// =================================================================
// กลไกในไฟต์จริง
// =================================================================
// ของที่ให้ทั้ง AD เกราะ และเลือด — จะได้เห็นว่าแขนอสูรดันขึ้นทุกก้อน
const bigItems = ["asc", "nlm", "ghs"].map((id) => ITEM_BY_ID[id]).filter(Boolean);

function fight(extra) {
  const me = mk("TOP", "TOTSAKAN", { items: bigItems, level: 16, ...extra });
  const foes = ["MID", "ADC"].map((L) => mk(L, "PIROSKA", { level: 16 }));
  const st = buildFight([me].map(toDef), foes.map(toDef), 5, DEFAULT_FIGHT);
  return { st, me: st.units.find((u) => u.champId === "TOTSAKAN"), foes: st.units.filter((u) => u.team === "red") };
}

// ---- Q ติดไฟ และไฟค้างบนพื้น ----
{
  const { st, me, foes } = fight();
  const foe = foes[0];
  foe.x = me.x + 200; foe.y = me.y;
  fireSkill(st, me, me.skills.find((s) => s.key === "Q"), foe, 10);
  const burn = st.dots.find((d) => d.targetId === foe.id && d.ownerId === me.id);
  t("Q ติดไฟให้คนที่โดน", !!burn && burn.every === 0.5, burn ? "ทุก " + burn.every + "s · dps " + burn.dps.toFixed(1) : "ไม่ติดไฟ");
  const field = st.fields.find((f) => f.ownerId === me.id && f.burn);
  t("Q ทิ้งร่องเพลิงไว้บนพื้น", !!field, field ? "ยาว " + Math.round(field.halfLen * 2) + " กว้าง " + Math.round(field.halfW * 2) : "ไม่มี");
  // คนที่เดินเข้ามาทีหลังก็ต้องไหม้
  const late = foes[1];
  late.x = me.x + 300; late.y = me.y;
  st.dots = st.dots.filter((d) => d.targetId !== late.id);
  for (let i = 0; i < 20; i++) step(st);
  t("เดินเข้าร่องเพลิงทีหลังก็ไหม้", st.dots.some((d) => d.targetId === late.id && d.ownerId === me.id),
    st.dots.length + " ก้อนในสนาม");
}

// ---- W กดพลังศัตรู ----
{
  const { st, me, foes } = fight();
  const foe = foes[0];
  foe.x = me.x + 150; foe.y = me.y;
  const adBefore = foe.ad;
  fireSkill(st, me, me.skills.find((s) => s.key === "W"), foe, 10);
  for (let i = 0; i < 6; i++) step(st);
  t("W กด AD ของศัตรูที่อยู่ในวง", foe.ad < adBefore, Math.round(adBefore) + " -> " + Math.round(foe.ad));
  t("W เร่งความเร็วโจมตีตัวเอง", me.buffs.some((b) => b.type === "as" && b.v >= 0.2),
    (me.buffs.find((b) => b.type === "as") || {}).v || "ไม่มีบัฟ");
}

// ---- E โล่และลดดาเมจ ----
{
  const { st, me, foes } = fight();
  const foe = foes[0];
  foe.x = me.x + 300; foe.y = me.y;
  fireSkill(st, me, me.skills.find((s) => s.key === "E"), foe, 10);
  t("E ได้โล่ทันทีที่กด", me.shield > 0, Math.round(me.shield) + " โล่");
  step(st);
  t("E ลดดาเมจที่ได้รับจริง", (me.drAll || 0) >= 0.27 - 1e-9, Math.round((me.drAll || 0) * 100) + "%");
}

// ---- R ยกลอยหมู่ + งอกแขน ----
{
  const { st, me, foes } = fight();
  for (const f of foes) { f.x = me.x + 120; f.y = me.y; }
  const adBefore = me.ad;
  const armorBefore = me.armor;
  fireSkill(st, me, me.skills.find((s) => s.key === "R"), foes[0], 10);
  t("R ยกศัตรูลอยทุกคนในวง", foes.every((f) => f.buffs.some((b) => b.type === "airborne")),
    foes.filter((f) => f.buffs.some((b) => b.type === "airborne")).length + "/" + foes.length + " ตัว");
  t("R งอกแขน 2 ข้างต่อศัตรู 1 ตัว", me.asuraArms && me.asuraArms.n === foes.length * 2,
    me.asuraArms ? me.asuraArms.n + " แขน · +" + Math.round(me.asuraArms.amp * 100) + "%" : "ไม่งอก");
  step(st);
  t("แขนอสูรดันค่าสถานะจากไอเทมขึ้นจริง", me.ad > adBefore && me.armor > armorBefore,
    "AD " + Math.round(adBefore) + "->" + Math.round(me.ad) + " · เกราะ " + Math.round(armorBefore) + "->" + Math.round(me.armor));
  // หมดเวลาแล้วต้องคืนค่า
  const hpMaxWith = me.maxHp;
  me.asuraArms.until = st.t - 0.01;
  step(st);
  t("แขนหายแล้วคืนค่าสถานะ", !me.asuraArms && me.maxHp < hpMaxWith + 1e-9 && me.ad <= adBefore + 1e-6,
    "AD กลับเป็น " + Math.round(me.ad));
}

// ---- ไฟต์เต็มรูปแบบไม่พัง ----
{
  const { st } = fight();
  let g = 0;
  while (!st.over && g++ < 60 * 90) step(st);
  t("ลงไฟต์จริงได้จนจบ ไม่พัง", st.over || g >= 60 * 90, "จบที่ " + st.t.toFixed(1) + "s");
}

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(44) + " " + d); }
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
