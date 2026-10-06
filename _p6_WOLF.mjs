// ---------------------------------------------------------------
// เทสต์ของ WOLF — รันเดี่ยวได้: node _p6_WOLF.mjs
// หรือรันรวมทุกตัวพร้อมกัน: node _p6_test.mjs
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { applyDamage } from "./src/engine/damage.js";
import { step } from "./src/engine/step.js";
import { castDevour } from "./src/engine/lore-p6.js";
import { cast, fight, fight2, fightAlly, isMain, report, t } from "./_p6lib.mjs";

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
  // วัดดาเมจจริงที่มันตีใส่วูล์ฟ เทียบกับตอนไม่ติดสถานะ
  const hit = (st, src, tgt) => {
    const before = tgt.hp;
    st.dmgSrc = "ทดสอบ";
    applyDamage(st, src, tgt, 300, false);
    st.dmgSrc = null;
    const dealt = before - tgt.hp;
    tgt.hp = before;
    return dealt;
  };
  const onWolf = hit(o.st, o.foe, o.u);
  const clean = fight("WOLF", "KAZEM", 18, 250);
  step(clean.st);
  const baseline = hit(clean.st, clean.foe, clean.u);
  t("ศัตรูที่หวาดกลัวทำดาเมจใส่วูล์ฟได้น้อยลงจริง", onWolf < baseline * 0.95,
    "ไม่ติดสถานะ " + baseline.toFixed(0) + " -> ติดสถานะ " + onWolf.toFixed(0));

  // เอกสารบอกว่าลดเฉพาะดาเมจที่ทำ "ใส่ Wolf" — ใส่คนอื่นต้องไม่ลด
  {
    const o2 = fight2("WOLF", "KAZEM", "ARTHUR", 18, 250);
    cast(o2.st, o2.u, "E", o2.foe);
    for (let i = 0; i < 60 * 3; i++) {
      step(o2.st);
      if (o2.foe.dread) break;
    }
    const toWolf = hit(o2.st, o2.foe, o2.u);
    const toMate = hit(o2.st, o2.foe, o2.mate);
    const mateClean = hit(fight2("WOLF", "KAZEM", "ARTHUR", 18, 250).st,
      o2.foe, o2.mate);
    t("ลดเฉพาะดาเมจที่ทำใส่วูล์ฟ ไม่ลดใส่คนอื่น",
      !!o2.foe.dread && Math.abs(toMate - mateClean) < 1 && toWolf < toMate,
      "ใส่วูล์ฟ " + toWolf.toFixed(0) + " · ใส่เพื่อนของมัน " + toMate.toFixed(0));
  }

  // เอกสารบอก 3.5 วิ ซึ่งนานกว่าเวลาหวาดกลัว (1.0-1.4 วิ)
  {
    const o3 = fight("WOLF", "KAZEM", 18, 250);
    cast(o3.st, o3.u, "E", o3.foe);
    let at = -1;
    for (let i = 0; i < 60 * 3; i++) { step(o3.st); if (o3.foe.dread) { at = o3.st.t; break; } }
    const left = at < 0 ? 0 : o3.foe.dread.until - at;
    t("สถานะลดดาเมจอยู่นาน 3.5 วิ ไม่ใช่เท่าเวลาหวาดกลัว",
      Math.abs(left - 3.5) < 0.05, left.toFixed(2) + " วิ");
  }
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

if (isMain(import.meta.url)) report("WOLF");
