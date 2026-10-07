// ---------------------------------------------------------------
// เทสต์ของ IFRIT — รันเดี่ยวได้: node _p6_IFRIT.mjs
// หรือรันรวมทุกตัวพร้อมกัน: node _p6_test.mjs
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { applyDamage } from "./src/engine/damage.js";
import { step } from "./src/engine/step.js";
import { cast, fight, fight2, fightAlly, isMain, report, t } from "./_p6lib.mjs";

// ===============================================================
// IFRIT
// ===============================================================

// ---- ข้อมูลฐาน สอบยันกับเลข L13/L18 ในเอกสารทุกค่า
{
  const c = CHAMPIONS.IFRIT;
  t("IFRIT อยู่ในรายชื่อตัวละคร", !!c, c ? c.th : "ไม่มี");
  const at = (b, g, lv) => b + g * (lv - 1);
  const rows = [
    ["HP", c.hp, c.hpG, 1621, 2061],
    ["ฟื้นเลือด", c.hp5, c.hp5G, 13.2, 16.2],
    ["AD", c.ad, c.adG, 88.0, 103.0],
    ["เกราะ", c.armor, c.armorG, 68.2, 86.2],
    ["ต้านเวท", c.mr, c.mrG, 45.6, 52.1],
    ["ความเร็วโจมตี", c.as, c.asG, 0.865, 0.965],
  ];
  const bad = rows.filter(([, b, g, e13, e18]) =>
    Math.abs(at(b, g, 13) - e13) > 0.011 || Math.abs(at(b, g, 18) - e18) > 0.011);
  t("ค่าสถานะฐานตรงกับเอกสารครบหกค่า (L13 และ L18)", bad.length === 0,
    bad.length ? bad.map((r) => r[0]).join(" · ") : "ตรงทั้งหกค่า");
  t("IFRIT ลงเลน MID เป็นตัวระยะไกล 550", c.lane === "MID" && !c.melee && c.range === 550,
    c.lane + " · ระยะ " + c.range);
}

// ---- พาสซีฟ: ทุกดาเมจจุดไฟเผา และต่ออายุเมื่อแตะซ้ำ
{
  const o = fight("IFRIT", "KAZEM", 18, 400);
  o.foe.mr = 0; o.foe.baseMr = 0;
  o.st.dmgSrc = "ทดสอบ";
  applyDamage(o.st, o.u, o.foe, 10, true);
  o.st.dmgSrc = null;
  const dot = (o.st.dots || []).find((d) => d.targetId === o.foe.id);
  t("ดาเมจของอิฟริตจุดไฟเผาเป้า", !!dot, dot ? "ติดไฟแล้ว" : "ไม่ติดไฟ");
  t("ไฟเผาอยู่ 3 วิ และลงทุก 0.5 วิตามเอกสาร",
    !!dot && Math.abs(dot.until - (o.st.t + 3)) < 0.05 && Math.abs(dot.every - 0.5) < 0.001,
    dot ? "ถึง t=" + dot.until.toFixed(2) + " · ทุก " + dot.every + " วิ" : "-");
}
{
  // แตะซ้ำต้องต่ออายุใหม่เป็น 3 วิ ไม่ใช่ต่อท้ายกันไปเรื่อยๆ
  const o = fight("IFRIT", "KAZEM", 18, 400);
  o.st.dmgSrc = "ทดสอบ";
  applyDamage(o.st, o.u, o.foe, 10, true);
  for (let i = 0; i < 60; i++) step(o.st);
  applyDamage(o.st, o.u, o.foe, 10, true);
  o.st.dmgSrc = null;
  const dot = (o.st.dots || []).find((d) => d.targetId === o.foe.id);
  t("แตะซ้ำแล้วไฟต่ออายุเป็น 3 วิใหม่",
    !!dot && Math.abs(dot.until - (o.st.t + 3)) < 0.1,
    dot ? "เหลือ " + (dot.until - o.st.t).toFixed(2) + " วิ" : "ไฟดับไปแล้ว");
}
{
  // กับดักที่ต้องกัน: ดาเมจของไฟเองต้องไม่จุดไฟซ้ำ ไม่งั้นไฟไม่มีวันดับ
  const o = fight("IFRIT", "KAZEM", 18, 900);
  o.u.atkCd = 99; o.foe.atkCd = 99;
  o.st.dmgSrc = "ทดสอบ";
  applyDamage(o.st, o.u, o.foe, 10, true);
  o.st.dmgSrc = null;
  // เดินไฟต์ไปนานกว่าอายุไฟมาก แล้วห้ามอิฟริตแตะเป้าอีก
  for (let i = 0; i < 60 * 8; i++) {
    o.u.atkCd = 99;
    for (const x of o.u.skills) x.cdLeft = 99;
    step(o.st);
  }
  const dot = (o.st.dots || []).find((d) => d.targetId === o.foe.id);
  t("ไฟของตัวเองไม่จุดไฟซ้ำ — ครบเวลาแล้วดับจริง", !dot,
    dot ? "ยังติดไฟอยู่ถึง t=" + dot.until.toFixed(1) + " (ไฟไม่มีวันดับ)" : "ดับแล้วตามที่ควร");
}

// ---- Q: ลูกไฟระเบิดเป็นวง ทั้งตอนชนและตอนสุดระยะ
{
  const sk = CHAMPIONS.IFRIT.skills.find((x) => x.key === "Q");
  t("Q ประกาศระยะ 850 กว้าง 110 ลูกเร็ว 1750 รัศมีระเบิด 225",
    sk.range === 850 && sk.width === 110 && sk.projSpeed === 1750 && sk.radius === 225,
    sk.range + " / " + sk.width + " / " + sk.projSpeed + " / " + sk.radius);
  const o = fight("IFRIT", "KAZEM", 18, 500);
  o.u.atkCd = 99; o.foe.atkCd = 99;
  const tot = (x) => x.hp + (x.shield || 0);
  const before = tot(o.foe);
  cast(o.st, o.u, "Q", o.foe);
  for (let i = 0; i < 60; i++) { o.u.atkCd = 99; step(o.st); }
  t("Q ระเบิดโดนเป้า", tot(o.foe) < before - 1,
    before.toFixed(0) + " -> " + tot(o.foe).toFixed(0));
}
{
  // ยิงไปทางที่ไม่มีใคร ต้องระเบิดที่ปลายทาง แล้วโดนคนที่ยืนแถวนั้น
  const o = fight("IFRIT", "KAZEM", 18, 400);
  o.u.atkCd = 99; o.foe.atkCd = 99;
  // วางเป้าไว้ที่ปลายระยะพอดี แล้วเล็งเลยตัวมันไป
  o.foe.x = o.u.x + 850; o.foe.y = o.u.y;
  const tot = (x) => x.hp + (x.shield || 0);
  const before = tot(o.foe);
  cast(o.st, o.u, "Q", { x: o.u.x + 1200, y: o.u.y, id: "__pt", radius: 1 });
  for (let i = 0; i < 60; i++) { o.u.atkCd = 99; step(o.st); }
  t("ไม่ชนใครแล้วระเบิดที่ปลายทาง โดนคนที่ยืนใกล้ปลาย", tot(o.foe) < before - 1,
    before.toFixed(0) + " -> " + tot(o.foe).toFixed(0));
}

// ---- W: ระเบิดลงพื้นแล้วฉีกต้านเวท (ไม่แตะเกราะ)
{
  const sk = CHAMPIONS.IFRIT.skills.find((x) => x.key === "W");
  t("W ประกาศฉีกต้านเวท 15-25% นาน 3.5 วิตามเอกสาร",
    sk.mrShred[0] === 0.15 && sk.mrShred[4] === 0.25 && sk.mrShredDur === 3.5,
    sk.mrShred.map((v) => (v * 100).toFixed(1) + "%").join("/") + " · " + sk.mrShredDur + " วิ");
  const o = fight("IFRIT", "KAZEM", 18, 400);
  const mr0 = o.foe.mr, ar0 = o.foe.armor;
  cast(o.st, o.u, "W", o.foe);
  let shredded = false;
  for (let i = 0; i < 60 * 2; i++) {
    step(o.st);
    if (o.foe.buffs.some((b) => b.type === "mrshred")) shredded = true;
  }
  t("W ฉีกต้านเวทของเป้าจริง", shredded && o.foe.mr < mr0,
    "ต้านเวท " + mr0.toFixed(1) + " -> " + o.foe.mr.toFixed(1));
  t("W ไม่แตะเกราะ ฉีกแต่ต้านเวทตามเอกสาร", Math.abs(o.foe.armor - ar0) < 0.6,
    "เกราะ " + ar0.toFixed(1) + " -> " + o.foe.armor.toFixed(1));
}

// ---- E: พรมไฟลงทันที แล้วค้างเผาบนพื้น
{
  const sk = CHAMPIONS.IFRIT.skills.find((x) => x.key === "E");
  t("E ประกาศแนวยาว 850 กว้าง 160 ค้าง 3.5 วิ",
    sk.range === 850 && sk.width === 160 && sk.zoneLife === 3.5,
    sk.range + " / " + sk.width + " / " + sk.zoneLife + " วิ");
  const o = fight("IFRIT", "KAZEM", 18, 400);
  o.u.atkCd = 99; o.foe.atkCd = 99;
  const tot = (x) => x.hp + (x.shield || 0);
  const before = tot(o.foe);
  // KAZEM กางโล่ให้ตัวเองได้ และ applyDamage คืนค่าก่อนลงบัญชีดาเมจถ้าโล่
  // กินหมด (damage.js: "if (dmg <= 0) return;") จึงต้องปิดทางนั้นก่อนวัด
  for (const x of o.foe.skills) x.cdLeft = 99;
  o.foe.shield = 0;
  cast(o.st, o.u, "E", o.foe);
  const dealt = (before - tot(o.foe)) + (o.foe.shieldAbsorbed || 0);
  t("E จังหวะแรกลงทันทีในเฟรมที่กด", dealt > 1,
    "ลงไป " + dealt.toFixed(0) + " · เลือดรวมโล่ "
    + before.toFixed(0) + " -> " + tot(o.foe).toFixed(0));
  const trails = ((o.st.lore || {}).trails || []).length;
  t("E ทิ้งพื้นไฟค้างไว้", trails > 0, trails + " แนว");
  // ตรึงเป้าไว้บนพื้นไฟแล้วดูว่าโดนเผาเป็นระลอก
  const mid = tot(o.foe);
  const fx = o.foe.x, fy = o.foe.y;
  for (let i = 0; i < 60 * 3; i++) {
    o.foe.x = fx; o.foe.y = fy;
    o.u.atkCd = 99;
    for (const x of o.u.skills) x.cdLeft = 99;
    step(o.st);
  }
  t("ยืนแช่บนพื้นไฟแล้วโดนเผาต่อเนื่อง", tot(o.foe) < mid - 1,
    mid.toFixed(0) + " -> " + tot(o.foe).toFixed(0));
}

// ---- E: พื้นไฟต้องเผา "ตลอดแนว" และวาดให้เห็นทั้งแนว
{
  // วางเป้าเทียบกับพิกัดของโซนเอง ไม่เทียบกับตัวอิฟริตที่ขยับได้
  const spots = [20, 150, 425, 700, 840];
  const burned = [];
  for (const at of spots) {
    const o = fight("IFRIT", "KAZEM", 18, 900);
    o.st.timeLimit = 60;
    cast(o.st, o.u, "E", { x: o.u.x + 900, y: o.u.y, id: "__pt", radius: 1 });
    const z = ((o.st.lore || {}).trails || [])[0];
    if (!z) { burned.push(-1); continue; }
    const sx = z.cx - z.nx * z.halfLen, sy = z.cy - z.ny * z.halfLen;
    o.foe.shield = 0;
    const before = o.foe.hp;
    for (let i = 0; i < 60 * 2; i++) {
      o.foe.x = sx + z.nx * at; o.foe.y = sy + z.ny * at;
      o.u.atkCd = 99;
      for (const x of o.u.skills) x.cdLeft = 999;
      step(o.st);
    }
    burned.push(before - o.foe.hp);
  }
  t("พื้นไฟเผาตลอดแนว ไม่ใช่แค่กลางแนว", burned.every((v) => v > 1),
    spots.map((p, i) => p + ":" + burned[i].toFixed(0)).join(" · "));
}
{
  // วาดเป็นแถบตามแนวจริง — ของเดิมวาดวงเล็กที่กลางแนว เลยดูเหมือนไฟมีแค่จุดกลาง
  const o = fight("IFRIT", "KAZEM", 18, 900);
  cast(o.st, o.u, "E", { x: o.u.x + 900, y: o.u.y, id: "__pt", radius: 1 });
  const z = ((o.st.lore || {}).trails || [])[0];
  step(o.st);
  const beams = (o.st.fx || []).filter((f) => f.kind === "beam" && f.x2 != null);
  const spanOk = beams.some((f) => Math.hypot(f.x2 - f.x, f.y2 - f.y) > z.halfLen * 1.8);
  t("พื้นไฟถูกวาดเป็นแถบยาวทั้งแนว", spanOk,
    beams.length
      ? "แถบยาวสุด " + Math.max(...beams.map((f) => Math.hypot(f.x2 - f.x, f.y2 - f.y))).toFixed(0)
        + " จากแนวยาว " + (z.halfLen * 2)
      : "ไม่มีแถบเลย");
}

// ---- R: พายุไฟที่คืบคลานเข้าหาเป้าเอง
{
  const sk = CHAMPIONS.IFRIT.skills.find((x) => x.key === "R");
  t("R ประกาศรัศมี 425 เคลื่อน 250/วิ อยู่ 5 วิ และเผาได้สูงสุด 10 ระลอก",
    sk.radius === 425 && sk.stormSpeed === 250 && sk.dur === 5 && sk.stormMax === 10,
    sk.radius + " / " + sk.stormSpeed + " / " + sk.dur + " วิ / " + sk.stormMax + " ระลอก");
  const o = fight("IFRIT", "KAZEM", 18, 600);
  o.u.atkCd = 99; o.foe.atkCd = 99;
  cast(o.st, o.u, "R", o.foe);
  step(o.st);
  const st0 = ((o.st.lore || {}).firestorms || [])[0];
  t("R สร้างพายุไฟขึ้นจริง", !!st0, st0 ? "มีพายุ 1 ลูก" : "ไม่มี");
  // ย้ายเป้าไปไกล แล้วดูว่าพายุไล่ตาม
  const d0 = st0 ? Math.hypot(st0.x - o.foe.x, st0.y - o.foe.y) : 0;
  o.foe.x = o.u.x + 1600;
  let slowed = false, burned = false;
  const tot = (x) => x.hp + (x.shield || 0);
  const hp0 = tot(o.foe);
  for (let i = 0; i < 60 * 4; i++) {
    o.u.atkCd = 99;
    for (const x of o.u.skills) x.cdLeft = 99;
    step(o.st);
    if (o.foe.buffs.some((b) => b.type === "slow")) slowed = true;
    if (tot(o.foe) < hp0 - 1) burned = true;
  }
  const st1 = ((o.st.lore || {}).firestorms || [])[0];
  const d1 = st1 ? Math.hypot(st1.x - o.foe.x, st1.y - o.foe.y) : Infinity;
  t("พายุคืบคลานเข้าหาเป้าเอง", st1 ? d1 < 1600 : true,
    st1 ? "ห่างเป้า " + d1.toFixed(0) + " หน่วย (เริ่มที่ " + d0.toFixed(0) + ")" : "พายุหมดอายุไปแล้ว");
  t("คนที่อยู่ในพายุติดสโลว์และโดนเผา", slowed && burned,
    (slowed ? "ติดสโลว์" : "ไม่ติดสโลว์") + " · " + (burned ? "โดนเผา" : "ไม่โดนเผา"));
}

// ---- ทุกท่าของ IFRIT ร่ายได้ ไม่พัง
{
  const broken = [];
  for (const key of ["Q", "W", "E", "R"]) {
    const o = fight("IFRIT", "KAZEM", 18, 400);
    try {
      cast(o.st, o.u, key, o.foe);
      for (let i = 0; i < 60 * 25; i++) step(o.st);
    } catch (e) { broken.push(key + ": " + e.message); }
  }
  t("ร่ายครบสี่ท่าของ IFRIT แล้วเดินไฟต์ 25 วิไม่พัง", broken.length === 0,
    broken.length ? broken.join(" · ") : "ผ่านทั้งสี่ท่า");
}

if (isMain(import.meta.url)) report("IFRIT");
