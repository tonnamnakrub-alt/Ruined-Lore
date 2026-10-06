// ---------------------------------------------------------------
// เทสต์ของ ANANSI — รันเดี่ยวได้: node _p6_ANANSI.mjs
// หรือรันรวมทุกตัวพร้อมกัน: node _p6_test.mjs
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { applyDamage } from "./src/engine/damage.js";
import { addBuff } from "./src/engine/state-util.js";
import { step } from "./src/engine/step.js";
import { castWebThread, spiderOnHit, spiderWalkTick } from "./src/engine/lore-p6.js";
import { cast, fight, fight2, fightAlly, isMain, report, t } from "./_p6lib.mjs";

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

// ---- W: ยิงเส้นที่สองใส่ศัตรูคนละตัว = กระชากมาชนกัน ระเบิด และสตัน
{
  const o = fight2("ANANSI", "KAZEM", "ARTHUR", 18, 400);
  o.mate.x = o.foe.x + 400; o.mate.y = o.foe.y;
  cast(o.st, o.u, "W", o.foe);
  // KAZEM กางโล่ให้ตัวเองได้ ดาเมจไปกินโล่ก่อนถึงเลือด จึงวัดเลือดรวมโล่
  const tot = (x) => x.hp + (x.shield || 0);
  const hpA = tot(o.foe), hpB = tot(o.mate);
  const gap0 = Math.hypot(o.foe.x - o.mate.x, o.foe.y - o.mate.y);
  castWebThread(o.st, o.u, o.u.skills.find((x) => x.key === "W"), o.mate);
  const gap1 = Math.hypot(o.foe.x - o.mate.x, o.foe.y - o.mate.y);
  t("ยิงคนละตัวแล้วกระชากสองคนมาชนกัน", gap1 < gap0 * 0.2,
    "ห่าง " + gap0.toFixed(0) + " -> " + gap1.toFixed(0) + " หน่วย");
  t("ทั้งสองตัวติดสตัน ไม่ใช่แค่ตรึงเท้า",
    o.foe.buffs.some((b) => b.type === "stun") && o.mate.buffs.some((b) => b.type === "stun"),
    "เป้าแรก " + (o.foe.buffs.some((b) => b.type === "stun") ? "สตัน" : "ไม่สตัน")
    + " · เป้าสอง " + (o.mate.buffs.some((b) => b.type === "stun") ? "สตัน" : "ไม่สตัน"));
  t("ระเบิดตอนชนลงดาเมจทั้งสองตัว", tot(o.foe) < hpA - 1 && tot(o.mate) < hpB - 1,
    "เป้าแรก " + hpA.toFixed(0) + " -> " + tot(o.foe).toFixed(0)
    + " · เป้าสอง " + hpB.toFixed(0) + " -> " + tot(o.mate).toFixed(0));
  const sk = CHAMPIONS.ANANSI.skills.find((x) => x.key === "W");
  t("ค่าระเบิดตอนชนตรงเอกสาร 60-200 (+55% AP) และสตัน 0.75-1.15 วิ",
    sk.slamDmg[0] === 60 && sk.slamDmg[4] === 200 && sk.slamApRatio === 0.55
    && sk.slamStun[0] === 0.75 && sk.slamStun[4] === 1.15,
    sk.slamDmg.join("/") + " · สตัน " + sk.slamStun.join("/"));
}

// ---- W: คูลดาวน์เริ่มนับหลังกดครั้งที่สอง ไม่ใช่ตอนกดครั้งแรก
{
  const o = fight2("ANANSI", "KAZEM", "ARTHUR", 18, 400);
  cast(o.st, o.u, "W", o.foe);
  const own = o.u.skills.find((x) => x.key === "W");
  const held = own.cdLeft;
  castWebThread(o.st, o.u, own, o.foe);
  const after = own.cdLeft;
  t("คูลดาวน์ W เริ่มนับหลังกดครั้งที่สอง", after > held,
    "ระหว่างรอกดซ้ำ " + held.toFixed(2) + " วิ -> หลังกดซ้ำ " + after.toFixed(2) + " วิ");
}

// ---- E: ตรึงพื้นต้องห้ามท่าเคลื่อนที่จริง และล้างบัฟความเร็วเดินจริง
{
  // ห้ามท่าเคลื่อนที่: KAZEM E เป็นท่าพุ่ง ถ้าติดตรึงพื้นต้องกดไม่ได้
  const o = fight("ANANSI", "KAZEM", 18, 300);
  cast(o.st, o.u, "E", o.foe);
  let grounded = false, dashed = false;
  for (let i = 0; i < 60 * 3; i++) {
    step(o.st);
    if ((o.foe.grounded || 0) > o.st.t) {
      grounded = true;
      if (o.foe.dashing) dashed = true;
    }
  }
  t("ติดตรึงพื้นแล้วศัตรูพุ่งไม่ได้", grounded && !dashed,
    grounded ? (dashed ? "ยังพุ่งได้" : "พุ่งไม่ได้ตามที่ควร") : "ไม่เคยติดตรึงพื้น");
}
{
  // ล้างบัฟความเร็วเดิน: ใส่บัฟ ms ให้ศัตรูแล้วดูว่า msEff ขึ้นไหม
  const o = fight("ANANSI", "KAZEM", 18, 300);
  o.foe.grounded = o.st.t + 5;
  addBuff(o.foe, { type: "ms", v: 0.5, until: o.st.t + 5 }, o.st.t);
  step(o.st);
  const crippled = o.foe.msEff;
  const free = fight("ANANSI", "KAZEM", 18, 300);
  addBuff(free.foe, { type: "ms", v: 0.5, until: free.st.t + 5 }, free.st.t);
  step(free.st);
  t("ติดตรึงพื้นแล้วบัฟเร่งความเร็วเดินไม่มีผล", crippled < free.foe.msEff * 0.9,
    "ติดตรึงพื้น " + crippled.toFixed(0) + " · ไม่ติด " + free.foe.msEff.toFixed(0));
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

if (isMain(import.meta.url)) report("ANANSI");
