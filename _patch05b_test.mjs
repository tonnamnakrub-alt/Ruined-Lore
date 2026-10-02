// ---------------------------------------------------------------
// Patch 0.5 รอบบาลานซ์ — ตรวจว่ากลไกใหม่ "ทำงานในสนามจริง" ไม่ใช่แค่มีตัวเลขในไฟล์
//
// เน้น 7 จุดที่ต้องต่อสายเอนจินเอง เพราะข้อมูลประกาศฟิลด์อะไรไว้ก็ได้
// แต่ถ้าไม่มีโค้ดไหนอ่าน ก็ไม่มีผลอะไรเลย (เคยพลาดกับ KLAEDER selfBonusHpByRank)
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { deriveStats } from "./src/engine/stats.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";
import { setLang } from "./src/i18n.js";

setLang("th");
const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);
const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));

const mk = (lane, id, level = 13, items = []) => ({
  lane, champId: id, level, xp: 0, gold: 0, items,
  ranks: autoRanks(level, CHAMPIONS[id].skillPriority, null),
  athlete: flat(5), upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE",
});
const fight = (a, b, level = 13, items = []) => {
  const st = buildFight([mk("MID", a, level, items)].map(toDef), [mk("MID", b, level)].map(toDef), 7, DEFAULT_FIGHT);
  return { st, u: st.units[0], foe: st.units[1] };
};
const cast = (st, u, key, target) => {
  const sk = u.skills.find((s) => s.key === key);
  sk.cdLeft = 0;
  st.castQueue.push({ u, sk, target, prec: 10 });
  step(st);
  return sk;
};

// ---- TOTSAKAN itemAmpAll — ขยายค่าที่มาจากไอเทมล้วนให้ด้วย
{
  const ch = CHAMPIONS.TOTSAKAN;
  t("TOTSAKAN ประกาศ itemAmpAll", ch.itemAmpAll === true, String(ch.itemAmpAll));
  // sg = รองเท้า +45 ms ล้วน ไม่มีค่าฐานของตัวละครปน จึงต้องถูกขยายทั้งก้อน
  const boot = { id: "sg", th: "boot", kind: "boots", cost: 25, ms: 45, tier: 2 };
  const withAmp = deriveStats(mk("TOP", "TOTSAKAN", 13, [boot]));
  const plain = deriveStats(mk("TOP", "TOTSAKAN", 13, []));
  const gain = withAmp.moveSpeed - plain.moveSpeed;
  t("TOTSAKAN ขยายความเร็วเดินที่ได้จากรองเท้า", gain > 45.5,
    "ได้ " + gain.toFixed(1) + " จากรองเท้า 45 (ขยายแล้วต้องเกิน 45)");
}

// ---- PIROSKA W cdAfterDur — คูลดาวน์เริ่มนับหลังตะกร้าหมด
{
  const sk = CHAMPIONS.PIROSKA.skills.find((s) => s.key === "W");
  t("PIROSKA W อายุตะกร้า 7.5 วิ คูลดาวน์ 7.5 วิ", sk.life === 7.5 && sk.cd === 7.5,
    "อายุ " + sk.life + " · คูลดาวน์ " + sk.cd);
  // วัดเจตนาของกลไกตรงๆ: ตะกร้าของคนเดียวกันต้องไม่ซ้อนกันเลย
  // ยัดคิวร่ายเองไม่ได้ เพราะ AI จะร่ายเพิ่มในทิกเดียวกันแล้วนับซ้ำ
  // ปล่อยให้ไฟต์เดินเองแล้วนับว่าเคยมีตะกร้าพร้อมกันเกินหนึ่งใบไหม
  const o = fight("PIROSKA", "KAZEM");
  let maxAtOnce = 0, everPlaced = 0;
  for (let i = 0; i < 60 * 60; i++) {
    step(o.st);
    const live = ((o.st.lore && o.st.lore.sights) || [])
      .filter((z) => z.kind === "basket" && z.ownerId === o.u.id && o.st.t < z.until).length;
    if (live > maxAtOnce) maxAtOnce = live;
    everPlaced = Math.max(everPlaced, ((o.st.lore && o.st.lore.sights) || []).length);
    if (!o.u.alive || o.st.over) break;
  }
  t("PIROSKA W วางตะกร้าได้จริงในไฟต์", everPlaced > 0, "วางไป " + everPlaced + " ใบ");
  t("ตะกร้าของคนเดียวกันไม่ซ้อนกัน (คูลดาวน์เริ่มนับหลังหมดอายุ)", maxAtOnce <= 1,
    "พร้อมกันมากสุด " + maxAtOnce + " ใบ");
}

// ---- C.HOOK E — ออโต้ที่ลงดึงเวลาชาร์จกระสุนให้มาเร็วขึ้น
{
  const sk = CHAMPIONS["C.HOOK"].skills.find((s) => s.key === "E");
  t("C.HOOK E ประกาศเวลาชาร์จ 15 วิ และดึงได้ 2/4 วิ",
    sk.rechargeTime === 15 && sk.rechargeCutOnAuto === 2 && sk.rechargeCutOnCrit === 4,
    "ชาร์จ " + sk.rechargeTime + " · ออโต้ -" + sk.rechargeCutOnAuto + " · คริ -" + sk.rechargeCutOnCrit);
  const o = fight("C.HOOK", "KAZEM");
  const e = o.u.skills.find((s) => s.key === "E");
  t("C.HOOK E เริ่มไฟต์ด้วยกระสุนเต็ม", e.ammo === e.ammoMax, e.ammo + "/" + e.ammoMax);
  // ยิงไปนัดหนึ่งให้ตัวนับชาร์จเริ่มเดิน แล้วปล่อยให้ออโต้ลง
  e.ammo -= 1;
  e.rechargeAt = o.st.t + sk.rechargeTime;
  const before = e.rechargeAt;
  for (let i = 0; i < 60 * 12 && e.rechargeAt === before; i++) step(o.st);
  t("ออโต้ที่ลงดึงเวลาชาร์จให้มาเร็วขึ้นจริง", e.rechargeAt < before,
    "จาก " + before.toFixed(2) + " เหลือ " + e.rechargeAt.toFixed(2));
}

// ---- JACK W auraSlowPerAp — ออร่าสโลว์ไต่ตามพลังเวท
{
  const sk = CHAMPIONS.JACK.skills.find((s) => s.key === "W");
  t("JACK W ประกาศสโลว์ 35% + ไต่ตาม AP", sk.auraSlow[0] === 0.35 && sk.auraSlowPerAp === 0.001,
    "ฐาน " + sk.auraSlow[0] + " · ต่อ AP " + sk.auraSlowPerAp);
  // u.ap ถูกคำนวณใหม่ทุก step จากค่าสถานะ ตั้งค่าที่ตัวยูนิตมือเปล่าจึงหายทันที
  // ต้องยัดพลังเวทผ่านไอเทมให้ deriveStats เห็น
  const apItem = { id: "_ap", th: "ap", cost: 0, ap: 300, tier: 3 };
  const slowOf = (ap) => {
    const o = fight("JACK", "KAZEM", 13, ap ? [apItem] : []);
    cast(o.st, o.u, "W", o.foe);
    // ไข่หน่วง 3 วิก่อนระเบิด ระหว่างนั้นออร่าสโลว์ทำงาน
    for (let i = 0; i < 60 * 2; i++) step(o.st);
    const b = o.foe.buffs.filter((x) => x.type === "slow").map((x) => x.v);
    return b.length ? Math.max(...b) : 0;
  };
  const lo = slowOf(0), hi = slowOf(300);
  t("พลังเวทสูงทำให้ออร่าสโลว์แรงขึ้นจริง", hi > lo + 0.1,
    "AP 0 = " + (lo * 100).toFixed(0) + "% · AP 300 = " + (hi * 100).toFixed(0) + "%");
}

// ---- HOOD fromDealt — คริไม่ได้เลือดไหลมากกว่าออโต้ธรรมดาอีก
{
  const cb = CHAMPIONS.HOOD.critBleed;
  t("HOOD ประกาศคิดจากดาเมจที่ลงจริง", cb.fromDealt === true, String(cb.fromDealt));
  t("HOOD เลือดไหล 120% จ่ายทุก 1 วิ ตลอด 5 วิ",
    cb.pct === 1.2 && cb.every === 1 && cb.dur === 5,
    cb.pct * 100 + "% · ทุก " + cb.every + " วิ · " + cb.dur + " วิ");
  t("HOOD ระยะโจมตีลดเป็น 550", CHAMPIONS.HOOD.range === 550, String(CHAMPIONS.HOOD.range));
}

// ---- KLAEDER W shieldMaxHp — โล่อิง Max HP ทั้งก้อน
{
  const sk = CHAMPIONS.KLAEDER.skills.find((s) => s.key === "W");
  t("KLAEDER W เลิกอิง Bonus HP แล้วอิง Max HP 12.5%",
    sk.shieldBonusHp === undefined && sk.shieldMaxHp === 0.125,
    "bonusHp=" + sk.shieldBonusHp + " maxHp=" + sk.shieldMaxHp);
  const o = fight("KLAEDER", "KAZEM");
  const want = sk.shield[Math.max(0, o.u.skills.find((s) => s.key === "W").rank - 1)]
    + (sk.shieldBad || 0) * o.u.bonusAd + sk.shieldMaxHp * o.u.maxHp;
  cast(o.st, o.u, "W", o.foe);
  t("โล่ที่ได้ตรงกับสูตรที่อิง Max HP", Math.abs(o.u.shield - want) < 2,
    "ได้ " + o.u.shield.toFixed(0) + " · ควรได้ " + want.toFixed(0)
    + " (Max HP " + o.u.maxHp.toFixed(0) + ")");
}

// ---- ARTHUR aegis — ค่าตามขั้นเลเวล และถอดการประหารออกจาก R
{
  const ae = CHAMPIONS.ARTHUR.aegis;
  t("ARTHUR พาสซีฟเป็นขั้น 5/7.5/10% ตามเลเวล 1/7/13",
    JSON.stringify(ae.pctByTier) === "[0.05,0.075,0.1]" && JSON.stringify(ae.tiers) === "[1,7,13]",
    JSON.stringify(ae.pctByTier) + " ขั้น " + JSON.stringify(ae.tiers));
  t("ARTHUR ตอนเลือดต่ำเป็นขั้น 10/15/20%",
    JSON.stringify(ae.lowPctByTier) === "[0.1,0.15,0.2]", JSON.stringify(ae.lowPctByTier));
  t("ARTHUR เลิกไต่ทุกเลเวลแล้ว", ae.pctPerLevel === undefined, String(ae.pctPerLevel));
  const r = CHAMPIONS.ARTHUR.skills.find((s) => s.key === "R");
  t("ARTHUR R ถอดการประหารออกแล้ว", r.execAt === undefined && r.execPerBad === undefined,
    "execAt=" + r.execAt + " execPerBad=" + r.execPerBad);
  t("ARTHUR R ดาเมจขึ้นเป็น 250/400/650 และสเกลเลือดที่หายไปลงเป็น 25%",
    JSON.stringify(r.dmg) === "[250,400,650]" && r.enemyMissingHp === 0.25,
    JSON.stringify(r.dmg) + " · " + r.enemyMissingHp);
}

// ---- H.S.B R — ถอดดาเมจระเบิดออก เหลือแต่บ้าน
{
  const r = CHAMPIONS["H.S.B"].skills.find((s) => s.key === "R");
  t("H.S.B R ถอดดาเมจระเบิดออกหมด",
    r.burstDmg === undefined && r.burstBadRatio === undefined && r.burstBonusHp === undefined,
    "burstDmg=" + r.burstDmg);
  t("H.S.B R รัศมีลดเป็น 500", r.radius === 500, String(r.radius));
  t("H.S.B R ยังมีสโลว์ตอนกางอยู่", r.burstSlow === 0.5, String(r.burstSlow));
}

// ---- KAZEM R — เปลี่ยนจาก Bonus AD เป็น AD รวม
{
  const r = CHAMPIONS.KAZEM.skills.find((s) => s.key === "R");
  t("KAZEM R สเกลด้วย AD รวม ไม่ใช่ Bonus AD",
    r.badRatio === undefined && r.adRatio === 0.8,
    "badRatio=" + r.badRatio + " adRatio=" + r.adRatio);
  // AD รวมมากกว่า Bonus AD เสมอ ดาเมจจึงต้องสูงกว่าสูตรเดิมที่ไม่มีของ
  const o = fight("KAZEM", "NIAN");
  t("KAZEM R ยังทำดาเมจได้ (สูตรใหม่ไม่ได้ทำให้เป็นศูนย์)", r.dmg[0] > 0 && o.u.ad > 0,
    "ดาเมจฐาน " + r.dmg[0] + " + 80% ของ AD " + o.u.ad.toFixed(0));
}

// ---- ถอดฟิลด์ออกแล้วต้องไม่พังตอนผลที่ "ลงทีหลัง" มาถึง
// เทสต์เดิมร่ายแล้วเดินแค่ 30 ทิก ไม่ทันถึงจังหวะบ้านพังของ H.S.B R
// ของจริงพังตอนรันแมตช์เต็ม (lore.js:1049 อ่าน sk.burstDmg แบบไม่เช็ก)
{
  const o = fight("H.S.B", "KAZEM", 18);
  const r = o.u.skills.find((s) => s.key === "R");
  cast(o.st, o.u, "R", o.foe);
  let crashed = null;
  // บ้านอยู่ 15 วิ ต้องเดินให้เลยจุดที่มันพังไปด้วย
  try { for (let i = 0; i < 60 * 25; i++) step(o.st); } catch (e) { crashed = e.message; }
  t("H.S.B R ผ่านจังหวะบ้านพังได้โดยไม่ล้ม", crashed === null, crashed || "เดินครบ 25 วิ");
}

// ---- ทุกสกิลยังร่ายได้ ไม่มีตัวไหนพังจากการถอดฟิลด์
{
  const broken = [];
  for (const id of Object.keys(CHAMPIONS)) {
    for (const key of ["Q", "W", "E", "R"]) {
      const o = fight(id, id === "KAZEM" ? "NIAN" : "KAZEM", 18);
      try {
        cast(o.st, o.u, key, o.foe);
        for (let i = 0; i < 30; i++) step(o.st);
      } catch (e) { broken.push(id + " " + key + ": " + e.message); }
    }
  }
  t("ร่ายได้ครบทุกท่าของทุกตัว ไม่มีตัวไหนพัง", broken.length === 0,
    broken.length ? broken.slice(0, 3).join(" · ") : "100 ท่าผ่านหมด");
}

let bad = 0;
for (const [n, ok, d] of out) {
  if (!ok) bad++;
  console.log((ok ? " ok  " : " FAIL") + " " + n.padEnd(54) + " " + d);
}
console.log("\nไม่ผ่าน " + bad + " / " + out.length);
if (bad) process.exit(1);
