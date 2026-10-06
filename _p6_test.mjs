// ---------------------------------------------------------------
// Patch 0.6 — ตรวจว่ากลไกใหม่ "ทำงานในสนามจริง" ไม่ใช่แค่มีตัวเลขในไฟล์
//
// เน้นกลไกที่ต้องเขียนโค้ดเอนจินเอง เพราะข้อมูลประกาศฟิลด์อะไรไว้ก็ได้
// ถ้าไม่มีโค้ดไหนอ่านก็ไม่มีผลเลย (เคยพลาดกับ KLAEDER selfBonusHpByRank)
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { applyDamage, healUnit } from "./src/engine/damage.js";
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
const cast = (st, u, key, target) => {
  const sk = u.skills.find((s) => s.key === key);
  sk.cdLeft = 0;
  st.castQueue.push({ u, sk, target, prec: 10 });
  step(st);
  return sk;
};

// ---- ข้อมูลฐานตรงกับที่เอกสารให้ไว้ที่เลเวล 13/18
{
  const c = CHAMPIONS.HELSING;
  t("HELSING อยู่ในรายชื่อตัวละคร", !!c, c ? c.th : "ไม่มี");
  const at13 = (b, g) => b + g * 12;
  t("HP ที่เลเวล 13 = 1684 ตามเอกสาร", Math.abs(at13(c.hp, c.hpG) - 1684) < 1,
    at13(c.hp, c.hpG).toFixed(0));
  t("AD ที่เลเวล 13 = 103 ตามเอกสาร", Math.abs(at13(c.ad, c.adG) - 103) < 0.5,
    at13(c.ad, c.adG).toFixed(1));
  t("เกราะที่เลเวล 13 = 74.4 ตามเอกสาร", Math.abs(at13(c.armor, c.armorG) - 74.4) < 0.5,
    at13(c.armor, c.armorG).toFixed(1));
  t("ต้านเวทที่เลเวล 13 = 56.6 ตามเอกสาร", Math.abs(at13(c.mr, c.mrG) - 56.6) < 0.5,
    at13(c.mr, c.mrG).toFixed(1));
  t("ระยะโจมตี 175 และความเร็วเดิน 335", c.range === 175 && c.ms === 335, c.range + " / " + c.ms);
}

// ---- พาสซีฟ: สกิลแปะตรา ออโต้จุดระเบิด
{
  const o = fight("HELSING", "KAZEM");
  cast(o.st, o.u, "Q", o.foe);
  for (let i = 0; i < 60; i++) step(o.st);
  t("สกิลที่ลงศัตรูแปะตราประทับไว้", !!o.foe.hunterBrand,
    o.foe.hunterBrand ? "ติดตราถึง t=" + o.foe.hunterBrand.until.toFixed(2) : "ไม่ติดตรา");

  // ออโต้ลงแล้วตราต้องหายและมีดาเมจก้อนพิเศษ
  // วัดแบบควบคุม เพราะในไฟต์จริงสกิลถัดไปแปะตราซ้ำทันที จับ "ตราหาย" ไม่ได้
  {
    const o2 = fight("HELSING", "KAZEM");
    o2.foe.armor = 0; o2.foe.baseArmor = 0; o2.foe.mr = 0; o2.foe.baseMr = 0;
    o2.foe.hp = o2.foe.maxHp * 0.4;          // เลือดพร่อง 60% ให้ก้อน missing HP มีผล
    o2.foe.hunterBrand = { ownerId: o2.u.id, until: o2.st.t + 4 };
    const before = o2.foe.hp;
    const dealt = popBrand(o2.st, o2.u, o2.foe);
    t("ออโต้ที่ลงเป้าที่ติดตราลบตราออก", o2.foe.hunterBrand == null,
      o2.foe.hunterBrand == null ? "ตราหายแล้ว" : "ตรายังอยู่");
    t("ตราระเบิดแล้วทำดาเมจจริง", dealt > 0 && o2.foe.hp < before,
      "ดาเมจที่คิดได้ " + dealt.toFixed(0) + " · เลือด " + before.toFixed(0) + " -> " + o2.foe.hp.toFixed(0));

    // เป้าเลือดพร่องมากต้องเจ็บกว่าเป้าเลือดเต็ม เพราะก้อน missing HP
    const full = fight("HELSING", "KAZEM");
    full.foe.hunterBrand = { ownerId: full.u.id, until: full.st.t + 4 };
    const dFull = popBrand(full.st, full.u, full.foe);
    t("เป้าเลือดพร่องเจ็บกว่าเป้าเลือดเต็ม", dealt > dFull + 10,
      "เลือดพร่อง 60% = " + dealt.toFixed(0) + " · เลือดเต็ม = " + dFull.toFixed(0));
  }
}

// ---- พาสซีฟไต่ตามเลือดที่เป้าหายไป
{
  const cfg = CHAMPIONS.HELSING.hunterBrand;
  t("พาสซีฟประกาศขั้น missing HP 6/8/10/12% ที่เลเวล 1/6/11/16",
    JSON.stringify(cfg.missingHp) === "[0.06,0.08,0.1,0.12]" &&
    JSON.stringify(cfg.tiers) === "[1,6,11,16]",
    JSON.stringify(cfg.missingHp) + " ขั้น " + JSON.stringify(cfg.tiers));
  // ดาเมจไต่ตามเลเวล 20 ที่ 1 ถึง 105 ที่ 18
  const at = (lv) => cfg.base + cfg.perLevel * (lv - 1);
  t("ดาเมจฐานไต่จาก 20 ถึง 105", Math.abs(at(1) - 20) < 0.01 && Math.abs(at(18) - 105) < 0.01,
    at(1).toFixed(0) + " -> " + at(18).toFixed(0));
}

// ---- W: สโลว์ + ตัดฮีล
{
  const sk = CHAMPIONS.HELSING.skills.find((s) => s.key === "W");
  t("W ทะลุแนวและประกาศตัดฮีล 40% นาน 5 วิ",
    sk.pierce === true && sk.antiheal === 0.4 && sk.antihealDur === 5,
    "pierce=" + sk.pierce + " antiheal=" + sk.antiheal);
  const o = fight("HELSING", "KAZEM");
  cast(o.st, o.u, "W", o.foe);
  // กระสุนบินถึงเป้าในไม่กี่ทิก สโลว์อยู่ 2 วิ ถ้ารอ 90 ทิกจะใกล้หมดแล้ว
  for (let i = 0; i < 30; i++) step(o.st);
  const slowed = o.foe.buffs.some((b) => b.type === "slow");
  const cut = o.foe.buffs.some((b) => b.type === "antiheal");
  t("W ติดสโลว์ให้เป้าจริง", slowed, slowed ? "ติดสโลว์" : "ไม่ติด");
  t("W ติดตัดฮีลให้เป้าจริง", cut, cut ? "ติดตัดฮีล" : "ไม่ติด");
}

// ---- E: วาร์ป แตะไม่ได้ แล้วติดอาวุธให้ออโต้
{
  const o = fight("HELSING", "KAZEM");
  const x0 = o.u.x;
  cast(o.st, o.u, "E", o.foe);
  const untargetable = o.u.buffs.some((b) => b.type === "untargetable");
  t("E ทำให้แตะไม่ได้ระหว่างสลายร่าง", untargetable, untargetable ? "แตะไม่ได้" : "ยังแตะได้");
  // เดินจนวาร์ปลงพื้นแล้วหยุดทันที ถ้าเดินต่อออโต้จะกินของที่ติดอาวุธไปก่อน
  let armed = false;
  for (let i = 0; i < 40; i++) { step(o.st); if (o.u.reapArmed) { armed = true; break; } }
  t("E ย้ายตำแหน่งไปจริงหลังครบเวลา", Math.abs(o.u.x - x0) > 50,
    "ขยับไป " + Math.abs(o.u.x - x0).toFixed(0) + " หน่วย");
  t("E ติดอาวุธให้ออโต้ครั้งถัดไป", armed,
    armed ? "ติดอาวุธถึง t=" + o.u.reapArmed.until.toFixed(1) : "ไม่ติดอาวุธ");
  // ออโต้ที่ติดอาวุธต้องถูกใช้ไปแล้วหายไป
  let used = false;
  for (let i = 0; i < 60 * 6 && !used; i++) { step(o.st); if (!o.u.reapArmed) used = true; }
  t("ออโต้ที่ติดอาวุธถูกใช้ไปจริง", used, used ? "ใช้แล้ว" : "ยังค้าง");
}

// ---- R: พุ่งชน ดีดถอย กางกรง ตัดฮีลหมด ลดดาเมจที่เป้าทำได้
{
  const o = fight("HELSING", "KAZEM", 18);
  const sk = CHAMPIONS.HELSING.skills.find((s) => s.key === "R");
  t("R ประกาศระยะพุ่ง 500 ดีดกลับ 250 และขอบเขต 375",
    sk.dashRange === 500 && sk.rebound === 250 && sk.bound === 375,
    sk.dashRange + " / " + sk.rebound + " / " + sk.bound);
  cast(o.st, o.u, "R", o.foe);
  let caged = false;
  for (let i = 0; i < 60 * 4 && !caged; i++) {
    step(o.st);
    if ((o.st.lore && o.st.lore.maidens || []).length) caged = true;
  }
  t("R กางกรงขังเป้าได้จริง", caged, caged ? "มีกรงในสนาม" : "ไม่มีกรง");
  t("เป้าที่ถูกขังฟื้นเลือดไม่ได้เลย", o.foe.noHeal === true, "noHeal=" + o.foe.noHeal);
  t("เป้าที่ถูกขังทำดาเมจได้น้อยลง", (o.foe.outCut || 0) > 0,
    "ลด " + ((o.foe.outCut || 0) * 100).toFixed(1) + "%");
  // ฮีลต้องไม่เข้าเลย
  o.foe.hp = Math.max(1, o.foe.maxHp * 0.5);
  const hpBefore = o.foe.hp;
  healUnit(o.st, o.foe, 500);
  t("ฮีล 500 ไม่เข้าเลยตอนอยู่ในกรง", Math.abs(o.foe.hp - hpBefore) < 0.01,
    hpBefore.toFixed(0) + " -> " + o.foe.hp.toFixed(0));
  // เป้าออกนอกขอบเขตไม่ได้
  const m = (o.st.lore.maidens || [])[0];
  if (m) {
    o.foe.x = m.x + 2000;
    step(o.st);
    const d = Math.hypot(o.foe.x - m.x, o.foe.y - m.y);
    t("เป้าถูกดึงกลับเข้าขอบเขตเมื่อพยายามออก", d <= m.bound + 1,
      "ห่างจากกลางวง " + d.toFixed(0) + " · ขอบเขต " + m.bound);
  }
}

// ---- กรงหมดอายุแล้วสถานะต้องถูกล้าง
{
  const o = fight("HELSING", "KAZEM", 18);
  cast(o.st, o.u, "R", o.foe);
  for (let i = 0; i < 60 * 12; i++) step(o.st);
  t("กรงหมดอายุแล้วเป้ากลับมาฟื้นเลือดได้", !o.foe.noHeal && !(o.foe.outCut > 0),
    "noHeal=" + o.foe.noHeal + " outCut=" + (o.foe.outCut || 0));
}

// ---- ทุกท่าร่ายได้ ไม่พัง และไฟต์เดินจนจบได้
{
  const broken = [];
  for (const key of ["Q", "W", "E", "R"]) {
    const o = fight("HELSING", "KAZEM", 18);
    try {
      cast(o.st, o.u, key, o.foe);
      for (let i = 0; i < 60 * 20; i++) step(o.st);
    } catch (e) { broken.push(key + ": " + e.message); }
  }
  t("ร่ายครบสี่ท่าแล้วเดินไฟต์ 20 วิไม่พัง", broken.length === 0,
    broken.length ? broken.join(" · ") : "ผ่านทั้งสี่ท่า");
}

// ---- ตัวอื่นต้องไม่ติด noHeal/outCut ค้างจากกลไกใหม่
{
  const o = fight("KAZEM", "NIAN", 13);
  for (let i = 0; i < 60 * 10; i++) step(o.st);
  const dirty = o.st.units.some((x) => x.noHeal || x.outCut > 0);
  t("ไฟต์ที่ไม่มีเฮลซิงไม่มีใครติดสถานะของกรงค้าง", !dirty, dirty ? "มีคนติดค้าง" : "สะอาด");
}

// ===============================================================
// WOLF
// ===============================================================

// ---- ข้อมูลฐานตรงกับเอกสาร
{
  const c = CHAMPIONS.WOLF;
  t("WOLF อยู่ในรายชื่อตัวละคร", !!c, c ? c.th : "ไม่มี");
  const at13 = (b2, g) => b2 + g * 12;
  t("WOLF HP ที่เลเวล 13 = 1890 ตามเอกสาร", Math.abs(at13(c.hp, c.hpG) - 1890) < 1, at13(c.hp, c.hpG).toFixed(0));
  t("WOLF AD ที่เลเวล 13 = 110.6 ตามเอกสาร", Math.abs(at13(c.ad, c.adG) - 110.6) < 0.5, at13(c.ad, c.adG).toFixed(1));
  t("WOLF เกราะที่เลเวล 13 = 87.4 ตามเอกสาร", Math.abs(at13(c.armor, c.armorG) - 87.4) < 0.5, at13(c.armor, c.armorG).toFixed(1));
}

// ---- พาสซีฟ: ตีเป้าเลือดน้อยแรงกว่าเป้าเลือดเต็ม
{
  const hit = (frac) => {
    const o = fight("WOLF", "KAZEM", 18);
    o.foe.armor = 0; o.foe.baseArmor = 0; o.foe.mr = 0; o.foe.baseMr = 0;
    o.foe.hp = o.foe.maxHp * frac;
    const before = o.foe.hp;
    o.st.dmgSrc = "ทดสอบ";
    applyDamage(o.st, o.u, o.foe, 500, false);
    o.st.dmgSrc = null;
    return before - o.foe.hp;
  };
  const low = hit(0.3), full = hit(0.95);
  t("ตีเป้าเลือดต่ำกว่าครึ่งแรงกว่าเป้าเลือดเต็ม", low > full + 10,
    "เลือด 30% = " + low.toFixed(0) + " · เลือด 95% = " + full.toFixed(0));

  // ดูดเลือดคืนตอนตีเป้าเลือดน้อย
  const o = fight("WOLF", "KAZEM", 18);
  o.foe.armor = 0; o.foe.baseArmor = 0;
  o.foe.hp = o.foe.maxHp * 0.3;
  o.u.hp = o.u.maxHp * 0.5;
  const myBefore = o.u.hp;
  o.st.dmgSrc = "ทดสอบ";
  applyDamage(o.st, o.u, o.foe, 500, false);
  o.st.dmgSrc = null;
  t("ดูดเลือดคืนตอนตีเป้าเลือดน้อย", o.u.hp > myBefore,
    myBefore.toFixed(0) + " -> " + o.u.hp.toFixed(0));
}

// ---- Q: ฉีกเกราะและตัดฮีล
{
  const sk = CHAMPIONS.WOLF.skills.find((s2) => s2.key === "Q");
  t("Q ประกาศฉีกเกราะ 15-25% และตัดฮีล 40%",
    sk.shredByRank[0] === 0.15 && sk.shredByRank[4] === 0.25 && sk.antiheal === 0.4,
    JSON.stringify(sk.shredByRank) + " · antiheal " + sk.antiheal);
}

// ---- W: ล่องหน แล้วออโต้กลายเป็นกระโจน
{
  const o = fight("WOLF", "KAZEM", 18, 700);
  cast(o.st, o.u, "W", o.foe);
  const hidden = o.u.buffs.some((b2) => b2.type === "stealth");
  t("W ทำให้ล่องหนจริง", hidden, hidden ? "ล่องหน" : "ไม่ล่องหน");
  t("W ติดอาวุธให้ออโต้ครั้งถัดไป", !!o.u.pounceArmed, o.u.pounceArmed ? "ติดอาวุธ" : "ไม่ติด");
  let used = false;
  for (let i = 0; i < 60 * 8 && !used; i++) { step(o.st); if (!o.u.pounceArmed) used = true; }
  t("ออโต้ที่ติดอาวุธกลายเป็นกระโจนไปแล้ว", used, used ? "ใช้แล้ว" : "ยังค้าง");
}

// ---- W พาสซีฟ: ความเร็วเดินเพิ่มสามเท่าตอนมีเป้าเลือดน้อย
{
  const o = fight("WOLF", "KAZEM", 18, 800);
  o.foe.hp = o.foe.maxHp * 0.95;
  step(o.st);
  const normal = o.u.scentMs || 0;
  o.foe.hp = o.foe.maxHp * 0.3;
  step(o.st);
  const hunting = o.u.scentMs || 0;
  t("มีเป้าเลือดน้อยในระยะแล้วความเร็วเดินคูณสาม", hunting > normal * 2.5,
    "ปกติ +" + (normal * 100).toFixed(1) + "% · มีเป้าเลือดน้อย +" + (hunting * 100).toFixed(1) + "%");
}

// ---- E: ชาร์จแล้วคำราม ติดหวาดกลัว ลดดาเมจที่ศัตรูทำได้
{
  const o = fight("WOLF", "KAZEM", 18, 250);
  cast(o.st, o.u, "E", o.foe);
  t("E เข้าสู่ช่วงชาร์จ", !!o.u.channeling, o.u.channeling ? "กำลังชาร์จ" : "ไม่ชาร์จ");
  let feared = false;
  for (let i = 0; i < 60 * 3 && !feared; i++) {
    step(o.st);
    if (o.foe.buffs.some((b2) => b2.type === "fear")) feared = true;
  }
  t("ชาร์จครบแล้วคำรามติดหวาดกลัวจริง", feared, feared ? "ติดหวาดกลัว" : "ไม่ติด");
  t("ศัตรูที่หวาดกลัวทำดาเมจได้น้อยลง", (o.foe.outCut || 0) > 0,
    "ลด " + ((o.foe.outCut || 0) * 100).toFixed(1) + "%");
}

// ---- R: ไม่มีซากก็กินไม่ได้ · มีซากแล้วฟื้นเลือดและรีเซ็ตคูลดาวน์
{
  const o = fight("WOLF", "KAZEM", 18, 250);
  t("ไม่มีซากศพในสนามก็กินไม่ได้", castDevour(o.st, o.u, o.u.skills.find((s2) => s2.key === "R")) === false,
    "ท่าไม่ออกเมื่อไม่มีซาก");
  // ยัดซากไว้ใกล้ตัว แล้วตั้งคูลดาวน์ Q/W/E ให้ค้าง
  o.st.lore = o.st.lore || {};
  o.st.lore.carcasses = [{ ownerId: o.u.id, x: o.u.x + 50, y: o.u.y, until: o.st.t + 12 }];
  for (const k of ["Q", "W", "E"]) o.u.skills.find((s2) => s2.key === k).cdLeft = 9;
  o.u.hp = o.u.maxHp * 0.4;
  const before = o.u.hp;
  const ate = castDevour(o.st, o.u, o.u.skills.find((s2) => s2.key === "R"));
  t("มีซากแล้วกินได้", ate === true, "กินแล้ว");
  t("กินซากแล้วฟื้นเลือด", o.u.hp > before, before.toFixed(0) + " -> " + o.u.hp.toFixed(0));
  const reset = ["Q", "W", "E"].every((k) => o.u.skills.find((s2) => s2.key === k).cdLeft === 0);
  t("กินซากแล้วรีเซ็ตคูลดาวน์ Q/W/E", reset, reset ? "รีเซ็ตครบ" : "ยังค้าง");
  t("ซากถูกกินแล้วหายไปจากสนาม", (o.st.lore.carcasses || []).length === 0,
    (o.st.lore.carcasses || []).length + " ซากเหลือ");
}

// ---- R พาสซีฟ: มีคนตายใกล้ตัวแล้วทิ้งซาก
{
  const o = fight("WOLF", "KAZEM", 18, 250);
  o.foe.armor = 0; o.foe.baseArmor = 0; o.foe.mr = 0; o.foe.baseMr = 0;
  o.foe.hp = 1;
  o.st.dmgSrc = "ทดสอบ";
  applyDamage(o.st, o.u, o.foe, 9999, false);
  o.st.dmgSrc = null;
  const n = ((o.st.lore || {}).carcasses || []).length;
  t("แชมเปี้ยนตายใกล้ Wolf ทิ้งซากไว้ให้กิน", n > 0, n + " ซาก");
}

// ---- ทุกท่าของ Wolf ร่ายได้ ไม่พัง
{
  const broken = [];
  for (const key of ["Q", "W", "E", "R"]) {
    const o = fight("WOLF", "KAZEM", 18, 300);
    try {
      cast(o.st, o.u, key, o.foe);
      for (let i = 0; i < 60 * 20; i++) step(o.st);
    } catch (e) { broken.push(key + ": " + e.message); }
  }
  t("ร่ายครบสี่ท่าของ Wolf แล้วเดินไฟต์ 20 วิไม่พัง", broken.length === 0,
    broken.length ? broken.join(" · ") : "ผ่านทั้งสี่ท่า");
}

// ===============================================================
// ANANSI
// ===============================================================

// ---- ข้อมูลฐาน
{
  const c = CHAMPIONS.ANANSI;
  t("ANANSI อยู่ในรายชื่อตัวละคร", !!c, c ? c.th : "ไม่มี");
  const at13 = (b2, g) => b2 + g * 12;
  t("ANANSI HP ที่เลเวล 13 = 1640 ตามเอกสาร", Math.abs(at13(c.hp, c.hpG) - 1640) < 1, at13(c.hp, c.hpG).toFixed(0));
  t("ANANSI AD ที่เลเวล 13 = 87 ตามเอกสาร", Math.abs(at13(c.ad, c.adG) - 87) < 0.5, at13(c.ad, c.adG).toFixed(0));
  t("ANANSI ลงเลน MID และ SUPPORT", c.lane === "MID" && (c.alsoLanes || []).includes("SUPPORT"),
    c.lane + " + " + (c.alsoLanes || []).join(","));
}

// ---- พาสซีฟ: เดินทะลุกำแพงทั้งสามชนิด
{
  // กำแพงอิฐของ H.S.B
  {
    const o = fight("ANANSI", "KAZEM", 13, 400);
    o.st.lore = o.st.lore || {};
    o.st.lore.walls = [{ ownerId: o.foe.id, team: o.foe.team, x: o.u.x, y: o.u.y,
      nx: 0, ny: 1, half: 400, hp: 100, maxHp: 100, until: o.st.t + 10 }];
    step(o.st);
    t("ยืนในกำแพงอิฐแล้วเข้าสภาวะทะลุได้", o.u.phasing === true, "phasing=" + o.u.phasing);
    // เดินต่อจนครบ 3 วิ แล้วต้องถูกดันออก
    for (let i = 0; i < 60 * 4; i++) step(o.st);
    t("อยู่ในกำแพงครบ 3 วิแล้วถูกดันออก", o.u.phasing === false,
      "phasing=" + o.u.phasing + " · คูลดาวน์ถึง t=" + (o.u.wallCd || 0).toFixed(1));
  }

  // กรงของ PINO E
  {
    const o = fight("ANANSI", "PINO", 13, 400);
    o.st.cages = [{ ownerId: o.foe.id, team: o.foe.team, x: o.u.x, y: o.u.y,
      r: 250, thick: 25, at: o.st.t - 1, until: o.st.t + 10, hp: 5, allyPass: false }];
    // ย้ายไปยืนบนขอบวงพอดี
    o.u.x = o.st.cages[0].x + 250;
    step(o.st);
    t("ยืนบนขอบกรงแล้วทะลุได้", o.u.phasing === true, "phasing=" + o.u.phasing);
  }

  // กรงขังเดี่ยวของ HELSING R ก็นับเป็นกำแพง
  {
    const o = fight("ANANSI", "HELSING", 13, 400);
    o.st.lore = o.st.lore || {};
    o.st.lore.maidens = [{ ownerId: o.foe.id, targetId: "x", x: o.u.x, y: o.u.y,
      r: 250, bound: 375, until: o.st.t + 10, outCut: 0, noHeal: false }];
    o.u.x = o.st.lore.maidens[0].x + 375;
    step(o.st);
    t("ขอบกรงขังของเฮลซิงก็ทะลุได้", o.u.phasing === true, "phasing=" + o.u.phasing);
  }

  // โดนตีขณะอยู่ในกำแพง เวลาเหลือลดครึ่ง
  {
    const o = fight("ANANSI", "KAZEM", 13, 400);
    o.st.lore = o.st.lore || {};
    o.st.lore.walls = [{ ownerId: o.foe.id, team: o.foe.team, x: o.u.x, y: o.u.y,
      nx: 0, ny: 1, half: 400, hp: 100, maxHp: 100, until: o.st.t + 10 }];
    // step() ขยับตัวออกจากกำแพงเองทุกทิก ตรึงก่อน step ก็ไม่ช่วย
    // เพราะ spiderWalkTick ทำงานหลังการเคลื่อนที่ในทิกเดียวกัน
    // จึงเดินนาฬิกาของกลไกนี้ตรงๆ แทน เพื่อวัดเฉพาะสิ่งที่ตั้งใจวัด
    for (let i = 0; i < 30; i++) spiderWalkTick(o.st, o.u, 1 / 60);
    const before = o.u.wallTime;
    o.st.dmgSrc = "ทดสอบ";
    applyDamage(o.st, o.foe, o.u, 50, false);
    o.st.dmgSrc = null;
    t("โดนตีในกำแพงแล้วเวลาที่เหลือลดลง", o.u.wallTime > before,
      "ใช้ไป " + before.toFixed(2) + " -> " + o.u.wallTime.toFixed(2) + " วิ (จาก 3 วิ)");
  }
}

// ---- พาสซีฟ: ออโต้พ่วงดาเมจเวท
{
  const o = fight("ANANSI", "KAZEM", 18, 400);
  o.foe.mr = 0; o.foe.baseMr = 0;
  const before = o.foe.hp;
  spiderOnHit(o.st, o.u, o.foe);
  t("ออโต้พ่วงดาเมจเวทจริง", o.foe.hp < before, before.toFixed(0) + " -> " + o.foe.hp.toFixed(0));
}

// ---- W: ใยสองเส้น
{
  const sk = CHAMPIONS.ANANSI.skills.find((x) => x.key === "W");
  t("W ประกาศหน้าต่างกดซ้ำ 3.5 วิ และตรึง 1.25-1.85 วิ",
    sk.window === 3.5 && sk.rootByRank[0] === 1.25 && sk.rootByRank[4] === 1.85,
    sk.window + " วิ · ตรึง " + JSON.stringify(sk.rootByRank));
  const o = fight("ANANSI", "KAZEM", 18, 400);
  cast(o.st, o.u, "W", o.foe);
  t("W เส้นแรกติดสโลว์และเปิดให้กดซ้ำ",
    o.foe.buffs.some((x) => x.type === "slow") && !!o.u.webThread,
    (o.u.webThread ? "เปิดหน้าต่างแล้ว" : "ไม่เปิด"));
  // กดซ้ำลงเป้าเดิม = ตรึงเท้า
  castWebThread(o.st, o.u, o.u.skills.find((x) => x.key === "W"), o.foe);
  t("W เส้นที่สองลงเป้าเดิมติดตรึงเท้า", o.foe.buffs.some((x) => x.type === "root"),
    o.foe.buffs.some((x) => x.type === "root") ? "ติดตรึง" : "ไม่ติด");
  t("กดซ้ำแล้วหน้าต่างปิด", !o.u.webThread, o.u.webThread ? "ยังเปิด" : "ปิดแล้ว");
}

// ---- E: ผืนใยสโลว์และตรึงพื้น
{
  const o = fight("ANANSI", "KAZEM", 18, 400);
  cast(o.st, o.u, "E", o.foe);
  const webs = ((o.st.lore || {}).webs || []).length;
  t("E ทิ้งผืนใยไว้บนพื้น", webs > 0, webs + " ผืน");
  let grounded = false, slowed = false;
  for (let i = 0; i < 60 * 2; i++) {
    step(o.st);
    if (o.foe.grounded > o.st.t - 0.5) grounded = true;
    if (o.foe.buffs.some((x) => x.type === "slow")) slowed = true;
  }
  t("คนที่ยืนในผืนใยติดสโลว์", slowed, slowed ? "ติดสโลว์" : "ไม่ติด");
  t("คนที่ยืนในผืนใยติดตรึงพื้น", grounded, grounded ? "ติดตรึงพื้น" : "ไม่ติด");
}

// ---- R: คลื่นไม่ทำดาเมจ แต่ทำให้ศัตรูบ้าคลั่งตีพวกเดียวกัน
{
  const sk = CHAMPIONS.ANANSI.skills.find((x) => x.key === "R");
  t("R ไม่มีดาเมจเลยตามเอกสาร", sk.dmg === undefined, "dmg=" + sk.dmg);
  t("R ประกาศคลื่นกว้าง 650 ช้า 850 ไกล 1050",
    sk.width === 650 && sk.projSpeed === 850 && sk.range === 1050,
    sk.width + " / " + sk.projSpeed + " / " + sk.range);
  // วางเป้าไว้ไกลเกินระยะออโต้ ไม่งั้นดาเมจที่เห็นจะมาจากออโต้พาสซีฟ ไม่ใช่คลื่น
  const o = fight("ANANSI", "KAZEM", 18, 900);
  o.u.atkCd = 99; o.foe.atkCd = 99;
  const hpBefore = o.foe.hp;
  cast(o.st, o.u, "R", o.foe);
  let mad = false;
  for (let i = 0; i < 60 * 2 && !mad; i++) {
    o.u.atkCd = 99; o.foe.atkCd = 99;           // กันออโต้ของทั้งสองฝั่ง
    step(o.st);
    if (o.foe.berserk) mad = true;
  }
  t("คลื่นทำให้ศัตรูบ้าคลั่ง", mad, mad ? "ติดบ้าคลั่ง" : "ไม่ติด");
  t("คลื่นไม่ทำดาเมจให้ศัตรูเลย", o.foe.hp >= hpBefore - 1,
    hpBefore.toFixed(0) + " -> " + o.foe.hp.toFixed(0));
}

// ---- R: บ้าคลั่งแล้วต้องตีพวกเดียวกันจริง ไม่ใช่แค่ติดสถานะ
{
  const o = fight2("ANANSI", "KAZEM", "ARTHUR", 18, 500);
  const mateHp = o.mate.hp;
  cast(o.st, o.u, "R", o.foe);
  let locked = false;
  for (let i = 0; i < 60 * 3; i++) {
    step(o.st);
    if (o.foe.berserk && o.foe.targetId === o.mate.id) locked = true;
  }
  t("บ้าคลั่งแล้วล็อกเป้าเป็นพวกเดียวกัน", locked, locked ? "ล็อกเป้าเป็นพวก" : "ยังล็อกศัตรู");
  t("พวกเดียวกันเสียเลือดจากคนที่บ้าคลั่ง", o.mate.hp < mateHp,
    mateHp.toFixed(0) + " -> " + o.mate.hp.toFixed(0));
}

// ---- R: บ้าคลั่งแล้วร่ายสกิลไม่ได้ และตีได้เร็วขึ้นเท่าตัว
{
  const o = fight2("ANANSI", "KAZEM", "ARTHUR", 18, 500);
  // asEff คิดในทิกแรกของ step() ยังไม่มีค่าก่อนเดินไฟต์
  step(o.st);
  const asBefore = o.foe.asEff;
  cast(o.st, o.u, "R", o.foe);
  let gagged = false, asIn = 0, ticks = 0;
  for (let i = 0; i < 60 * 3; i++) {
    step(o.st);
    if (!o.foe.berserk) continue;
    ticks++;
    if (o.foe.silenced) gagged = true;
    if (o.foe.asEff > asIn) asIn = o.foe.asEff;
  }
  t("บ้าคลั่งแล้วร่ายสกิลไม่ได้", gagged === true && ticks > 1,
    ticks ? "silenced=" + gagged + " (" + ticks + " ทิก)" : "ไม่เคยติด");
  t("บ้าคลั่งแล้วความเร็วโจมตีเพิ่มเท่าตัวตามเอกสาร",
    asBefore > 0 && Math.abs(asIn / asBefore - 2) < 0.05,
    asBefore.toFixed(2) + " -> " + asIn.toFixed(2));
}

// ---- R: ไม่มีพวกอยู่ในระยะ 500 ก็ยืนมึนอยู่กับที่ ไม่ได้ตีใครเลย
{
  const o = fight2("ANANSI", "KAZEM", "ARTHUR", 18, 500);
  // ย้ายพวกของมันไปไกลเกิน allyRange
  o.mate.x = o.foe.x + 3000;
  const mateHp = o.mate.hp;
  cast(o.st, o.u, "R", o.foe);
  let dazed = false, ticks = 0, hitWhileDazed = 0;
  for (let i = 0; i < 60 * 3; i++) {
    const shotsIn = o.foe.shots;
    step(o.st);
    o.mate.x = o.foe.x + 3000;
    if (!o.foe.berserk) continue;
    ticks++;
    if (o.foe.stunned && !o.foe.berserkTarget) dazed = true;
    // นับจำนวนออโต้ที่ "เริ่มใหม่" ตอนมึน — ท่าที่ร่ายไว้ก่อนแล้วมาลงทีหลังไม่นับ
    if (o.foe.stunned) hitWhileDazed += Math.max(0, o.foe.shots - shotsIn);
  }
  t("ไม่มีพวกในระยะแล้วยืนมึนอยู่กับที่", dazed === true && ticks > 1,
    ticks ? "stunned=" + dazed + " (" + ticks + " ทิก)" : "ไม่เคยติด");
  t("ขณะมึนไม่ออกออโต้ใส่ใครเลย",
    o.mate.hp >= mateHp - 1 && hitWhileDazed === 0,
    "พวก " + mateHp.toFixed(0) + " -> " + o.mate.hp.toFixed(0)
    + " · ออโต้ที่ออกตอนมึน " + hitWhileDazed);
}

// ---- ทุกท่าของ Anansi ร่ายได้ ไม่พัง
{
  const broken = [];
  for (const key of ["Q", "W", "E", "R"]) {
    const o = fight("ANANSI", "KAZEM", 18, 400);
    try {
      cast(o.st, o.u, key, o.foe);
      for (let i = 0; i < 60 * 20; i++) step(o.st);
    } catch (e) { broken.push(key + ": " + e.message); }
  }
  t("ร่ายครบสี่ท่าของ Anansi แล้วเดินไฟต์ 20 วิไม่พัง", broken.length === 0,
    broken.length ? broken.join(" · ") : "ผ่านทั้งสี่ท่า");
}

let bad = 0;
for (const [n, ok, d] of out) {
  if (!ok) bad++;
  console.log((ok ? " ok  " : " FAIL") + " " + n.padEnd(52) + " " + d);
}
console.log("\nไม่ผ่าน " + bad + " / " + out.length);
if (bad) process.exit(1);
