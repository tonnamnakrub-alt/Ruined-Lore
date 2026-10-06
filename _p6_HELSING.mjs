// ---------------------------------------------------------------
// เทสต์ของ HELSING — รันเดี่ยวได้: node _p6_HELSING.mjs
// หรือรันรวมทุกตัวพร้อมกัน: node _p6_test.mjs
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { applyDamage, healUnit } from "./src/engine/damage.js";
import { step } from "./src/engine/step.js";
import { popBrand } from "./src/engine/lore-p6.js";
import { cast, fight, fight2, fightAlly, isMain, report, t } from "./_p6lib.mjs";


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

if (isMain(import.meta.url)) report("HELSING");
