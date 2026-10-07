// ---------------------------------------------------------------
// เทสต์ของ KOSCHEI — รันเดี่ยวได้: node _p6_KOSCHEI.mjs
// หรือรันรวมทุกตัวพร้อมกัน: node _p6_test.mjs
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { applyDamage } from "./src/engine/damage.js";
import { step } from "./src/engine/step.js";
import { cast, fight, fight2, fightAlly, isMain, report, t } from "./_p6lib.mjs";

// ===============================================================
// KOSCHEI
// ===============================================================

// ---- ข้อมูลฐาน สอบยันกับเลข L13/L18 ในเอกสารทุกค่า
{
  const c = CHAMPIONS.KOSCHEI;
  t("KOSCHEI อยู่ในรายชื่อตัวละคร", !!c, c ? c.th : "ไม่มี");
  const at = (b, g, lv) => b + g * (lv - 1);
  const rows = [
    ["HP", c.hp, c.hpG, 1907, 2437],
    ["ฟื้นเลือด", c.hp5, c.hp5G, 18.1, 22.1],
    ["AD", c.ad, c.adG, 96.4, 112.4],
    ["เกราะ", c.armor, c.armorG, 88.4, 109.4],
    ["ต้านเวท", c.mr, c.mrG, 56.6, 66.85],
    ["ความเร็วโจมตี", c.as, c.asG, 0.878, 0.978],
  ];
  const bad = rows.filter(([, b, g, e13, e18]) =>
    Math.abs(at(b, g, 13) - e13) > 0.011 || Math.abs(at(b, g, 18) - e18) > 0.011);
  t("ค่าสถานะฐานตรงกับเอกสารครบหกค่า (L13 และ L18)", bad.length === 0,
    bad.length ? bad.map((r) => r[0]).join(" · ") : "ตรงทั้งหกค่า");
  t("KOSCHEI ลงเลน TOP และเป็นตัวประชิด", c.lane === "TOP" && c.melee === true && c.range === 175,
    c.lane + " · ระยะ " + c.range);
}

// ---- พาสซีฟ: มีแชมเปี้ยนตายใกล้ตัวแล้วฟื้นเลือด ไม่เลือกข้าง
{
  // ศัตรูตาย
  {
    const o = fight("KOSCHEI", "KAZEM", 13, 400);
    o.u.hp = o.u.maxHp * 0.4;
    const before = o.u.hp;
    o.st.dmgSrc = "ทดสอบ";
    applyDamage(o.st, o.u, o.foe, 99999, false);
    o.st.dmgSrc = null;
    const pct = (o.u.hp - before) / o.u.maxHp;
    t("ศัตรูตายใกล้ตัวแล้วฟื้น 20% ที่เลเวล 13", o.foe.alive === false && Math.abs(pct - 0.20) < 0.005,
      "ฟื้น " + (pct * 100).toFixed(1) + "% ของเลือดสูงสุด");
  }
  // เพื่อนตายก็ฟื้นด้วย
  {
    const o = fight2("KOSCHEI", "KAZEM", "ARTHUR", 13, 400);
    o.u.hp = o.u.maxHp * 0.4;
    const before = o.u.hp;
    o.mate.x = o.u.x + 300; o.mate.y = o.u.y;
    o.st.dmgSrc = "ทดสอบ";
    applyDamage(o.st, o.u, o.mate, 99999, false);
    o.st.dmgSrc = null;
    t("เพื่อนร่วมทีมของศัตรูตายใกล้ตัวก็ฟื้นเหมือนกัน", o.u.hp > before,
      before.toFixed(0) + " -> " + o.u.hp.toFixed(0));
  }
  // ไกลเกิน 1,000 ไม่ฟื้น
  {
    const o = fight("KOSCHEI", "KAZEM", 13, 400);
    o.u.hp = o.u.maxHp * 0.4;
    const before = o.u.hp;
    o.foe.x = o.u.x + 2500;
    o.st.dmgSrc = "ทดสอบ";
    applyDamage(o.st, o.u, o.foe, 99999, false);
    o.st.dmgSrc = null;
    t("ตายไกลเกิน 1,000 หน่วยแล้วไม่ฟื้น", Math.abs(o.u.hp - before) < 1,
      before.toFixed(0) + " -> " + o.u.hp.toFixed(0));
  }
}

// ---- Q: กะโหลกพุ่งเป็นเส้น ทำดาเมจแล้วสูบเลือดคืน
{
  const sk = CHAMPIONS.KOSCHEI.skills.find((x) => x.key === "Q");
  t("Q ประกาศสเกล +5% Max HP ทั้งดาเมจ และ +4.5% กับฮีล",
    sk.selfMaxHp === 0.05 && sk.healMaxHp === 0.045,
    "ดาเมจ " + sk.selfMaxHp + " · ฮีล " + sk.healMaxHp);
  const o = fight("KOSCHEI", "KAZEM", 18, 400);
  o.u.atkCd = 99; o.foe.atkCd = 99;
  o.u.hp = o.u.maxHp * 0.5;
  const hpMe = o.u.hp, hpFoe = o.foe.hp;
  cast(o.st, o.u, "Q", o.foe);
  for (let i = 0; i < 60; i++) step(o.st);
  t("Q ทำดาเมจให้เป้า", o.foe.hp < hpFoe - 1, hpFoe.toFixed(0) + " -> " + o.foe.hp.toFixed(0));
  t("Q สูบเลือดคืนให้ตัวเอง", o.u.hp > hpMe + 1, hpMe.toFixed(0) + " -> " + o.u.hp.toFixed(0));
}

// ---- W: ออร่ารอบตัวเผาต่อเนื่อง และผลร่วมกับโล่ E
{
  const o = fight("KOSCHEI", "KAZEM", 18, 200);
  o.u.atkCd = 99; o.foe.atkCd = 99;
  const before = o.foe.hp;
  cast(o.st, o.u, "W", o.foe);
  let ticks = 0, lastNext = o.u.miasma ? o.u.miasma.next : 0;
  for (let i = 0; i < 60 * 4 && !o.st.over; i++) {
    step(o.st);
    o.u.atkCd = 99; o.foe.atkCd = 99;
    // ฟื้นเลือดของเป้ากลบดาเมจบางระลอก นับที่นาฬิกาของออร่าเองจึงตรงกว่า
    if (o.u.miasma && o.u.miasma.next !== lastNext) { ticks++; lastNext = o.u.miasma.next; }
  }
  t("W เผาเป็นระลอก 8 ครั้งใน 4 วิตามเอกสาร", ticks === 8, ticks + " ระลอก · เลือด "
    + before.toFixed(0) + " -> " + o.foe.hp.toFixed(0));
}
{
  // กด W ตอนโล่ E ยังอยู่ = ได้ความเร็วเดิน · ไม่มีโล่ = ไม่ได้
  const withE = fight("KOSCHEI", "KAZEM", 18, 400);
  cast(withE.st, withE.u, "E", withE.foe);
  cast(withE.st, withE.u, "W", withE.foe);
  const got = withE.u.buffs.some((b) => b.type === "ms" && b.v >= 0.40);
  const alone = fight("KOSCHEI", "KAZEM", 18, 400);
  cast(alone.st, alone.u, "W", alone.foe);
  const none = alone.u.buffs.some((b) => b.type === "ms" && b.v >= 0.40);
  t("กด W ตอนโล่ E ยังอยู่ ได้ความเร็วเดิน 40%", got === true, got ? "ได้บัฟ" : "ไม่ได้");
  t("กด W เปล่าๆ ไม่ได้ความเร็วเดิน", none === false, none ? "ได้บัฟทั้งที่ไม่มีโล่" : "ไม่ได้ตามที่ควร");
}

// ---- E: โล่ตาม Max HP · คลื่นทุก 1 วิ · สโลว์ · ฉีกเกราะสะสม 5 ชั้น
{
  const o = fight("KOSCHEI", "KAZEM", 18, 300);
  cast(o.st, o.u, "E", o.foe);
  const want = 250 + 0.12 * o.u.maxHp;
  t("E กางโล่ตาม Max HP ตามสูตร", Math.abs(o.u.shieldTaken - want) < 2,
    "กางให้ " + o.u.shieldTaken.toFixed(0) + " (คาด " + want.toFixed(0) + ") · เหลือ "
    + o.u.shield.toFixed(0) + " หลังศัตรูกินไปแล้ว");
  const ar0 = o.foe.armor;
  let pulses = 0, maxStacks = 0, slowed = false;
  let lastLeft = o.u.casket ? o.u.casket.left : 0;
  for (let i = 0; i < 60 * 5; i++) {
    step(o.st);
    o.u.atkCd = 99; o.foe.atkCd = 99;
    if (o.u.casket && o.u.casket.left < lastLeft) { pulses++; lastLeft = o.u.casket.left; }
    const sh = o.foe.buffs.find((b) => b.type === "shred");
    if (sh) maxStacks = Math.max(maxStacks, sh.stacks || 0);
    if (o.foe.buffs.some((b) => b.type === "slow")) slowed = true;
  }
  t("E แผ่คลื่นออกมาจริงระหว่างที่โล่ยังอยู่", pulses >= 2, pulses + " ระลอกที่นับได้");
  t("คลื่นของ E ติดสโลว์", slowed, slowed ? "ติดสโลว์" : "ไม่ติด");
  t("คลื่นของ E ฉีกเกราะสะสมได้ และไม่เกิน 5 ชั้น", maxStacks >= 2 && maxStacks <= 5,
    "สูงสุด " + maxStacks + " ชั้น · เกราะเป้า " + ar0.toFixed(0) + " -> " + o.foe.armor.toFixed(0));
  t("ฉีกเกราะแล้วเกราะเป้าลดลงจริง", o.foe.armor < ar0,
    ar0.toFixed(1) + " -> " + o.foe.armor.toFixed(1));
}
{
  // โล่แตกก่อนครบเวลา คลื่นต้องหยุดทันที
  const o = fight("KOSCHEI", "KAZEM", 18, 300);
  cast(o.st, o.u, "E", o.foe);
  step(o.st);
  o.u.shield = 0;
  step(o.st);
  t("โล่แตกแล้วคลื่นของ E หยุดทันที", !o.u.casket, o.u.casket ? "ยังแผ่อยู่" : "หยุดแล้ว");
}

// ---- R: แยกร่าง
{
  const sk = CHAMPIONS.KOSCHEI.skills.find((x) => x.key === "R");
  t("R ประกาศเวลา 9/11/13 วิ และสายโยง 900",
    sk.durByRank[0] === 9 && sk.durByRank[2] === 13 && sk.leash === 900,
    sk.durByRank.join("/") + " วิ · สายโยง " + sk.leash);
  const o = fight("KOSCHEI", "KAZEM", 18, 400);
  cast(o.st, o.u, "R", o.foe);
  step(o.st);
  const shells = ((o.st.lore || {}).shells || []).length;
  t("R ทิ้งชุดเกราะไว้เป็นตัวแยก", shells === 1, shells + " ตัว");
  t("ร่างวิญญาณแตะไม่ได้และตีธรรมดาไม่ได้",
    o.u.untargetable === true && o.u.disarmed === true,
    "แตะไม่ได้=" + o.u.untargetable + " · ตีไม่ได้=" + o.u.disarmed);
  t("ร่างวิญญาณได้ความเร่งสกิลเพิ่ม", o.u.ah >= 35, "ความเร่งสกิล " + o.u.ah);
}
{
  // หลอดเลือดเดียวกัน — ดาเมจที่ชุดเกราะกินต้องไปลดเลือดของโคสเชจริง
  const o = fight("KOSCHEI", "KAZEM", 18, 400);
  cast(o.st, o.u, "R", o.foe);
  step(o.st);
  const sh = o.st.lore.shells[0];
  // Q สูบเลือดคืนให้ตัวเอง 280 ต่อครั้ง ซึ่งกลบดาเมจที่ชุดเกราะกิน
  // ปิดท่าอื่นไว้ ให้เหลือแค่เส้นทางที่ต้องการวัด
  for (const x of o.u.skills) if (x.key !== "R") x.cdLeft = 999;
  o.u.hp5 = 0;
  const before = o.u.hp;
  // วางศัตรูให้ประชิดชุดเกราะ แล้วเดินไฟต์
  for (let i = 0; i < 60 * 2; i++) {
    o.foe.x = sh.x + 40; o.foe.y = sh.y;
    for (const x of o.u.skills) if (x.key !== "R") x.cdLeft = 999;
    step(o.st);
  }
  t("ดาเมจที่ชุดเกราะกินไปลดเลือดของโคสเชจริง (หลอดเดียวกัน)", o.u.hp < before - 1,
    before.toFixed(0) + " -> " + o.u.hp.toFixed(0));
}
{
  // สเปคเขียนว่า "ศัตรูไม่สามารถโจมตีวิญญาณสวนกลับได้เลย" ซึ่งในเอนจินนี้
  // หมายถึงเลือกเป็นเป้าไม่ได้ ไม่ใช่ว่าดาเมจที่ลงมาแล้วหายไป
  // (ดาเมจที่ไม่เลือกเป้า เช่นโซนระเบิด ไปลงที่ชุดเกราะ — เทสต์ถัดไป)
  // ต้องมีเพื่อนฝั่งเราด้วย ไม่งั้นศัตรูไม่มีทางเลือกอื่นแล้วค้างเป้าเดิมไว้
  const o = fightAlly("KOSCHEI", "ARTHUR", "KAZEM", 18, 400);
  cast(o.st, o.u, "R", o.foe);
  let locked = false, ticks = 0;
  for (let i = 0; i < 60 * 5 && !o.st.over; i++) {
    step(o.st);
    if (!o.u.soulSplit) continue;
    ticks++;
    if (o.foe.aimTargetId === o.u.id) locked = true;
  }
  t("ศัตรูเลือกร่างวิญญาณเป็นเป้าไม่ได้ ไปเล็งเพื่อนแทน", locked === false && ticks > 60,
    ticks ? (locked ? "ยังเล็งวิญญาณได้" : "เล็งเพื่อนแทนตลอด " + ticks + " ทิก") : "ไม่เคยแยกร่าง");
}
{
  // หมดเวลาแล้วรวมร่าง สถานะอมตะต้องหลุด
  const o = fight("KOSCHEI", "KAZEM", 18, 400);
  o.st.timeLimit = 60;
  cast(o.st, o.u, "R", o.foe);
  // cast() ไม่ติดคูลดาวน์ให้ AI จึงร่าย R ซ้ำกลางทางแล้วต่อเวลาตัวเอง
  o.u.skills.find((x) => x.key === "R").cdLeft = 99;
  for (let i = 0; i < 60 * 15 && !o.st.over; i++) step(o.st);
  t("หมดเวลาแล้วรวมร่าง สถานะอมตะหลุด",
    !o.u.soulSplit && o.u.untargetable !== true && o.u.disarmed !== true,
    "แยกร่าง=" + !!o.u.soulSplit + " · แตะไม่ได้=" + o.u.untargetable);
  t("รวมร่างแล้วชุดเกราะหายไป", ((o.st.lore || {}).shells || []).length === 0,
    ((o.st.lore || {}).shells || []).length + " ตัว");
}
{
  // วิญญาณห่างเกินสายโยง 900 ต้องถูกกระชากกลับทันที
  const o = fight("KOSCHEI", "KAZEM", 18, 400);
  cast(o.st, o.u, "R", o.foe);
  step(o.st);
  const sh = o.st.lore.shells[0];
  o.u.x = sh.x + 1500; o.u.y = sh.y;
  step(o.st);
  t("ห่างเกินสายโยง 900 แล้วถูกกระชากกลับ",
    !o.u.soulSplit && Math.hypot(o.u.x - sh.x, o.u.y - sh.y) < 200,
    "ห่าง " + Math.hypot(o.u.x - sh.x, o.u.y - sh.y).toFixed(0) + " หน่วย");
}

{
  // ดาเมจที่ไม่สนว่าเป้าแตะได้ไหม (โซนระเบิด ออร่า) เดิมหายไปเฉยๆ กับร่างวิญญาณ
  // ต้องถูกเปลี่ยนเส้นทางไปลงที่ชุดเกราะแทน ไม่ใช่หายไป
  const o = fight("KOSCHEI", "KAZEM", 18, 400);
  cast(o.st, o.u, "R", o.foe);
  step(o.st);
  const before = o.u.hp;
  o.st.dmgSrc = "โซนทดสอบ";
  applyDamage(o.st, o.foe, o.u, 400, true);
  o.st.dmgSrc = null;
  t("ดาเมจแบบไม่เลือกเป้าไปลงที่ชุดเกราะ ไม่หายไปเฉยๆ", o.u.hp < before - 1,
    before.toFixed(0) + " -> " + o.u.hp.toFixed(0));
}

// ---- R: ชุดเกราะต้องอยู่ครบเวลา และเดินไปตีจนทำดาเมจได้จริง
{
  // บัคเดิม: ชุดเกราะเดินไล่ศัตรูจนห่างร่างวิญญาณเกินสายโยง 900 หน่วย
  // เงื่อนไขสายโยงก็สั่งรวมร่างทันที ชุดเกราะจึงตัดสายของตัวเอง
  // R ที่ควรอยู่ 13 วิจบใน ~3 วิ และแทบไม่ได้ตีใครเลย
  const o = fight("KOSCHEI", "KAZEM", 18, 400);
  o.st.timeLimit = 60;
  cast(o.st, o.u, "R", o.foe);
  o.u.skills.find((x) => x.key === "R").cdLeft = 99;
  const until = o.u.soulSplit.until;
  let lastSeen = 0;
  for (let i = 0; i < 60 * 16 && !o.st.over; i++) {
    step(o.st);
    if (((o.st.lore || {}).shells || []).length) lastSeen = o.st.t;
  }
  t("ชุดเกราะอยู่ครบเวลาของ R ไม่ถูกสายโยงของตัวเองตัดทิ้ง",
    lastSeen >= until - 0.2,
    "R ถึง t=" + until.toFixed(1) + " · ชุดเกราะอยู่ถึง t=" + lastSeen.toFixed(1));
  const shellDmg = Object.entries(o.u.dealtBy || {})
    .filter(([k]) => /ชุดเกราะ|iron shell/.test(k))
    .reduce((a, [, v]) => a + v, 0);
  t("ชุดเกราะเดินไปตีจนทำดาเมจได้จริง", shellDmg > 0,
    "ทำดาเมจไป " + shellDmg.toFixed(0));
}
{
  // สายโยงยังต้องรั้งชุดเกราะไว้จริง ไม่ใช่ปล่อยให้เดินหลุดไปไกลเท่าไรก็ได้
  const o = fight("KOSCHEI", "KAZEM", 18, 400);
  o.st.timeLimit = 60;
  cast(o.st, o.u, "R", o.foe);
  o.u.skills.find((x) => x.key === "R").cdLeft = 99;
  const leash = o.u.soulSplit.leash;
  let maxAway = 0;
  for (let i = 0; i < 60 * 8 && !o.st.over; i++) {
    // ดันศัตรูให้หนีไปไกลๆ ให้ชุดเกราะอยากเดินไล่
    o.foe.x = o.u.x + 2500; o.foe.y = o.u.y;
    step(o.st);
    const sh = ((o.st.lore || {}).shells || [])[0];
    if (sh) maxAway = Math.max(maxAway, Math.hypot(sh.x - o.u.x, sh.y - o.u.y));
  }
  t("สายโยงรั้งชุดเกราะไว้ไม่ให้เกินความยาวสาย", maxAway <= leash + 1,
    "ห่างสุด " + maxAway.toFixed(0) + " จากสายยาว " + leash);
}

// ---- ทุกท่าของ KOSCHEI ร่ายได้ ไม่พัง
{
  const broken = [];
  for (const key of ["Q", "W", "E", "R"]) {
    const o = fight("KOSCHEI", "KAZEM", 18, 400);
    try {
      cast(o.st, o.u, key, o.foe);
      for (let i = 0; i < 60 * 25; i++) step(o.st);
    } catch (e) { broken.push(key + ": " + e.message); }
  }
  t("ร่ายครบสี่ท่าของ KOSCHEI แล้วเดินไฟต์ 25 วิไม่พัง", broken.length === 0,
    broken.length ? broken.join(" · ") : "ผ่านทั้งสี่ท่า");
}

if (isMain(import.meta.url)) report("KOSCHEI");
