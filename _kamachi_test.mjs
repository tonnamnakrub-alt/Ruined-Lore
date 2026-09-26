// ---------------------------------------------------------------
// KAMACHI — ตัวใหม่ของ Patch 0.4
//
// ตัวนี้เช็คยากเพราะดาเมจครึ่งหนึ่งไม่ได้ออกจากตัวเขา แต่ออกจากน้องสองตัว
// ที่ยืนคนละจุด เทสจึงต้องแยกให้ออกว่าก้อนไหนของพี่ ก้อนไหนของน้อง
// ---------------------------------------------------------------
import { ARENA_H, ARENA_W } from "./src/data/constants.js";
import { CHAMPIONS } from "./src/data/champions.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { autoRanks, emptyRanks } from "./src/engine/skill-ranks.js";
import { domainHoldPlan, liveWeasels } from "./src/engine/lore-p4.js";
import { step } from "./src/engine/step.js";

const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);
const KA = CHAMPIONS.KAMACHI;
const skill = (k) => KA.skills.find((s) => s.key === k);
const st5 = (v) => ({ mechanics: v, gameSense: v, knowledge: v, decision: v, teamwork: v });

function lab(level = 18, stat = 10) {
  const me = {
    lane: "JUNGLE", champId: "KAMACHI", char: "K", athleteName: "K", athlete: st5(stat),
    style: "ENGAGE", level, items: [], ranks: autoRanks(level, KA.skillPriority, null),
  };
  const dm = {
    lane: "MID", champId: "KAZEM", char: "D", athleteName: "D", athlete: st5(0),
    style: "HOLD", level: 1, items: [], ranks: emptyRanks(),
  };
  const st = buildFight([me], [dm], 7, DEFAULT_FIGHT);
  st.timeLimit = 1e9;
  st.rampStart = 1e9;
  const k = st.units[0], d = st.units[1];
  d.maxHp = 400000; d.hp = 400000;
  d.baseArmor = 0; d.rawArmor = 0; d.armor = 0;
  d.baseMr = 0; d.mr = 0; d.noRegen = true;
  k.noRegen = true;
  d.manual = { moveTo: null, autoAttack: false, targetId: null, castKey: null, castPoint: null };
  for (const sk of k.skills) sk.cdLeft = 0;
  d.x = ARENA_W * 0.5 + 120; d.y = ARENA_H / 2;
  k.x = ARENA_W * 0.5; k.y = ARENA_H / 2;
  k.manual = { moveTo: null, autoAttack: false, targetId: d.id, castKey: null, castPoint: null };
  return { st, k, d };
}

const dealt = (u, needle) => Object.entries(u.dealtBy || {})
  .filter(([kk]) => kk.includes(needle)).reduce((a, [, v]) => a + v, 0);
// แยกก้อนของพี่กับก้อนของน้องออกจากกัน — ป้ายของน้องลงท้ายด้วย "(น้อง)"
const mine = (u, needle) => Object.entries(u.dealtBy || {})
  .filter(([kk]) => kk.includes(needle) && !kk.includes("(")).reduce((a, [, v]) => a + v, 0);
const theirs = (u, needle) => Object.entries(u.dealtBy || {})
  .filter(([kk]) => kk.includes(needle) && kk.includes("(")).reduce((a, [, v]) => a + v, 0);

// ---- ข้อมูลพื้นฐาน ----
{
  t("KAMACHI อยู่ในรายชื่อตัวละคร", !!KA, KA ? KA.th + " · " + KA.role + " · " + KA.lane : "ไม่มี");
  t("ลงป่าอย่างเดียว", KA.lane === "JUNGLE" && !(KA.alsoLanes || []).length,
    [KA.lane, ...(KA.alsoLanes || [])].join(", "));
  t("มีครบสี่ท่า", KA.skills.length === 4, KA.skills.map((s) => s.key + " " + s.type).join(" · "));
  t("เป็นตัวประชิด", KA.melee && KA.range === 150, "ระยะ " + KA.range);
}

// ---- พาสซีฟ · น้องสองตัวเกิดมาพร้อมไฟต์ และเกาะตำแหน่งพี่ ----
{
  const { st, k } = lab();
  step(st);
  t("เข้าไฟต์มาพร้อมน้องสองตัว", liveWeasels(k).length === 2, "มี " + liveWeasels(k).length + " ตัว");
  const cfg = KA.weasels;
  const w = k.weasels;
  const gap = w.map((x) => Math.round(Math.hypot(x.x - k.x, x.y - k.y)));
  t("น้องยืนห่างพี่ตามระยะที่กำหนด", gap.every((g) => Math.abs(g - cfg.offset) < 2), "ห่าง " + gap.join(" กับ ") + " หน่วย");
  t("น้องอยู่คนละข้างกัน", w[0].side !== w[1].side, "ข้าง " + w.map((x) => x.side).join(" กับ "));
  const hp = Math.round(w[0].maxHp);
  const want = Math.round(cfg.hp + cfg.hpPerLevel * 17 + cfg.hpBonusHp * (k.bonusHp || 0));
  t("เลือดน้องคิดตามเลเวลและ Bonus HP ของพี่", hp === want, hp + " · ควรได้ " + want);

  // พี่ขยับ น้องต้องตามไปด้วย
  const before = w.map((x) => ({ x: x.x, y: x.y }));
  k.x += 300;
  step(st);
  t("พี่ขยับแล้วน้องตามไปด้วย", w.every((x, i) => Math.hypot(x.x - before[i].x, x.y - before[i].y) > 100),
    "ขยับ " + w.map((x, i) => Math.round(Math.hypot(x.x - before[i].x, x.y - before[i].y))).join(" กับ ") + " หน่วย");
}

// ---- พาสซีฟ · น้องลอกท่าตามทั้งสามท่า ----
{
  for (const key of ["Q", "W", "E"]) {
    const { st, k, d } = lab();
    step(st);
    // ยืนชิดพอให้ทั้งพี่และน้องโดนเป้าเดียวกันได้
    d.x = k.x + 160; d.y = k.y;
    for (const sk of k.skills) sk.cdLeft = 0;
    k.manual.castKey = key;
    for (let i = 0; i < 40; i++) step(st);
    // E กดครั้งแรกแค่ล่องหน ต้องกดซ้ำถึงจะพุ่งและน้องถึงจะลอกท่า
    if (key === "E") { k.manual.castKey = "E"; for (let i = 0; i < 40; i++) step(st); }
    const label = { Q: "Gale-Scar", W: "Whirl-Scythes", E: "Zephyr" }[key];
    t(key + " น้องลอกท่าตามและลงดาเมจจริง", theirs(k, label) > 0,
      "พี่ " + Math.round(mine(k, label)) + " · น้อง " + Math.round(theirs(k, label)));
  }
}

// ---- พาสซีฟ · ดาเมจน้องเป็น 25% ของพี่ ต่อตัว ----
{
  const { st, k, d } = lab();
  step(st);
  d.x = k.x + 100; d.y = k.y;              // ชิดมากพอให้น้องทั้งสองตัวโดนด้วย
  k.manual.castKey = "W";                  // W เป็นวงรอบตัว น้องโดนแน่กว่าท่าเส้น
  for (let i = 0; i < 60; i++) step(st);
  const cfg = KA.weasels;
  const a = mine(k, "Whirl-Scythes"), b = theirs(k, "Whirl-Scythes");
  // พี่ฟันสองจังหวะ น้องสองตัวก็ฟันสองจังหวะ อัตราส่วนจึงเท่ากับ 2 × 25%
  t("ดาเมจน้องรวมเป็น 50% ของพี่ (25% ต่อตัว)", a > 0 && Math.abs(b / a - cfg.count * cfg.dmgPct) < 0.08,
    "พี่ " + Math.round(a) + " · น้อง " + Math.round(b) + " = " + Math.round(b / a * 100) + "%");
}

// ---- พาสซีฟ · น้องตายได้ แล้วเกิดใหม่ ----
{
  const { st, k } = lab();
  step(st);
  const w = k.weasels[0];
  w.hp = 1;
  const cfg = KA.weasels;
  // วางศัตรูให้ประชิดน้องแล้วปล่อยให้ตี
  const d = st.units[1];
  d.x = w.x; d.y = w.y;
  d.ad = 500; d.manual.autoAttack = true; d.manual.targetId = k.id;
  let g = 0;
  while (g++ < 60 * 3 && w.hp > 0) step(st);
  t("น้องโดนทุบจนตายได้", w.hp <= 0, "เลือดน้องเหลือ " + Math.round(w.hp));
  t("ตายแล้วเหลือน้องตัวเดียว", liveWeasels(k).length === 1, "เหลือ " + liveWeasels(k).length + " ตัว");
  const wait = w.respawnAt - st.t;
  const want = cfg.respawn[cfg.tiers.length - 1];
  t("ตั้งเวลาเกิดใหม่ตามเลเวล", Math.abs(wait - want) < 0.2, "รออีก " + wait.toFixed(1) + " วิ · ควรเป็น " + want);
  d.x = ARENA_W * 0.9; d.manual.autoAttack = false;
  for (let i = 0; i < Math.ceil(60 * (want + 0.5)); i++) step(st);
  t("ครบเวลาแล้วเกิดใหม่เต็มเลือด", w.hp >= w.maxHp - 1 && liveWeasels(k).length === 2,
    "เลือด " + Math.round(w.hp) + "/" + Math.round(w.maxHp) + " · มี " + liveWeasels(k).length + " ตัว");
}

// ---- พาสซีฟ · น้องตายแล้วดาเมจลอกท่าหายไปตาม ----
{
  const one = (alive) => {
    const { st, k, d } = lab();
    step(st);
    d.x = k.x + 100; d.y = k.y;
    for (const w of k.weasels.slice(alive)) { w.hp = 0; w.respawnAt = st.t + 99; }
    for (const sk of k.skills) sk.cdLeft = 0;
    k.manual.castKey = "W";
    for (let i = 0; i < 60; i++) step(st);
    return theirs(k, "Whirl-Scythes");
  };
  const two = one(2), half = one(1), none = one(0);
  t("น้องตายหมดแล้วไม่มีดาเมจลอกท่าเลย", none === 0, Math.round(none) + " ดาเมจ");
  t("เหลือน้องตัวเดียวได้ดาเมจครึ่งเดียว", half > 0 && Math.abs(half / two - 0.5) < 0.1,
    "สองตัว " + Math.round(two) + " · ตัวเดียว " + Math.round(half));
}

// ---- W · สองจังหวะ และสโลว์เฉพาะคนที่โดนครบ ----
{
  const { st, k, d } = lab();
  step(st);
  d.x = k.x + 150; d.y = k.y;
  k.manual.castKey = "W";
  const sk = skill("W");
  for (let i = 0; i < 6; i++) step(st);
  const first = mine(k, "Whirl-Scythes");
  const slowAfterOne = d.buffs.some((b) => b.type === "slow");
  for (let i = 0; i < Math.ceil(60 * (sk.gap + 0.3)); i++) step(st);
  const both = mine(k, "Whirl-Scythes");
  t("จังหวะแรกลงดาเมจทันที", first > 0, Math.round(first) + " ดาเมจ");
  t("จังหวะแรกอย่างเดียวยังไม่สโลว์", !slowAfterOne, slowAfterOne ? "ติดแล้ว" : "ยังไม่ติด");
  t("จังหวะที่สองตามมา ดาเมจเพิ่มเป็นสองเท่า", Math.abs(both / first - 2) < 0.15,
    Math.round(first) + " → " + Math.round(both));
  t("โดนครบสองจังหวะถึงจะติดสโลว์", d.buffs.some((b) => b.type === "slow" && Math.abs(b.v - sk.bothSlow) < 0.01),
    d.buffs.filter((b) => b.type === "slow").map((b) => Math.round(b.v * 100) + "%").join(" ") || "ไม่ติด");
}

// ---- E · กดครั้งแรกล่องหน คูลดาวน์ยังไม่เดิน ----
{
  const { st, k } = lab();
  step(st);
  const sk = k.skills.find((x) => x.key === "E");
  k.manual.castKey = "E";
  for (let i = 0; i < 6; i++) step(st);
  t("กดครั้งแรกแล้วล่องหน", k.buffs.some((b) => b.type === "stealth"), "stealth=" + k.buffs.some((b) => b.type === "stealth"));
  t("ได้เร่งฝีเท้าด้วย", k.buffs.some((b) => b.type === "ms"), "ms=" + k.buffs.some((b) => b.type === "ms"));
  t("คูลดาวน์ยังไม่เริ่มเดินตอนกดครั้งแรก", sk.cdLeft <= 0, "คูลดาวน์เหลือ " + sk.cdLeft.toFixed(1));

  // กดซ้ำ = พุ่ง แล้วคูลดาวน์ถึงจะเริ่ม
  const x0 = k.x;
  k.manual.castKey = "E";
  for (let i = 0; i < 10; i++) step(st);
  t("กดซ้ำแล้วพุ่งไปข้างหน้า", Math.abs(k.x - x0) > 300, "ขยับ " + Math.round(Math.abs(k.x - x0)) + " หน่วย");
  t("พุ่งจบแล้วล่องหนหลุด", !k.buffs.some((b) => b.type === "stealth"), "stealth=" + k.buffs.some((b) => b.type === "stealth"));
  t("พุ่งจบแล้วคูลดาวน์ถึงเริ่มเดิน", sk.cdLeft > 0, "คูลดาวน์เหลือ " + sk.cdLeft.toFixed(1) + " วิ");
}

// ---- E · ปล่อยให้ล่องหนหมดเวลาโดยไม่พุ่ง คูลดาวน์ต้องเริ่มเอง ----
{
  const { st, k } = lab();
  step(st);
  const sk = k.skills.find((x) => x.key === "E");
  k.manual.castKey = "E";
  for (let i = 0; i < Math.ceil(60 * (skill("E").hideDur + 0.5)); i++) step(st);
  t("ล่องหนหมดเวลาเองแล้วคูลดาวน์เริ่มเดิน", sk.cdLeft > 0 && !k.zephyr,
    "คูลดาวน์เหลือ " + sk.cdLeft.toFixed(1) + " วิ");
}

// ---- R · โดมพายุ อมตะ ล่องหน และเฉือนเป็นระลอก ----
{
  const { st, k, d } = lab();
  step(st);
  d.x = k.x + 200; d.y = k.y;
  k.manual.castKey = "R";
  for (let i = 0; i < 20; i++) step(st);
  const sk = skill("R");
  t("กด R แล้วแตะไม่ได้และล่องหน", k.untargetable && k.buffs.some((b) => b.type === "stealth"),
    "untargetable=" + !!k.untargetable + " · stealth=" + k.buffs.some((b) => b.type === "stealth"));
  t("อมตะจริง ดาเมจไม่เข้า", k.buffs.some((b) => b.type === "invuln"), "invuln=" + k.buffs.some((b) => b.type === "invuln"));
  let waves = 0, last = 0;
  for (let i = 0; i < Math.ceil(60 * (sk.dur + 0.5)); i++) {
    step(st);
    const now = dealt(k, "Kamaitachi");
    if (now > last + 1) waves++;
    last = now;
  }
  t("โดมเฉือนครบหกระลอก", waves === sk.waves, "นับได้ " + waves + " ระลอก");
  t("หมดเวลาแล้วกลับมาโดนได้", !k.untargetable && !k.domain, "untargetable=" + !!k.untargetable);
}

// ---- R · ลงมือเองเมื่อไหร่ อมตะหลุดทันที แต่โดมหมุนต่อ ----
{
  const { st, k, d } = lab();
  step(st);
  d.x = k.x + 100; d.y = k.y;
  k.manual.castKey = "R";
  for (let i = 0; i < 20; i++) step(st);
  const before = dealt(k, "Kamaitachi");
  t("ก่อนลงมือยังอมตะอยู่", !!k.domain, "domain=" + !!k.domain);
  k.manual.autoAttack = true;                // ลงมือเอง
  let g = 0;
  while (g++ < 60 * 2 && k.domain) step(st);
  t("ลงมือแล้วอมตะหลุดทันที", !k.domain && !k.untargetable, "domain=" + !!k.domain + " · untargetable=" + !!k.untargetable);
  for (let i = 0; i < 60 * 2; i++) step(st);
  t("โดมยังหมุนเฉือนต่อหลังอมตะหลุด", dealt(k, "Kamaitachi") > before,
    Math.round(before) + " → " + Math.round(dealt(k, "Kamaitachi")));
}

// ---- R · จะยืนนิ่งหรือออกมาสู้ เป็นการตัดสินใจของบอท ----
{
  const plan = (dec, hpFrac, foes) => {
    const { st, k } = lab(18, 5);
    step(st);
    k.athlete.decision = dec;
    k.athlete.gameSense = 10;                // ตัดตัวแปรสายตาออก วัดเฉพาะการตัดสินใจ
    k.hp = k.maxHp * hpFrac;
    const d = st.units[1];
    d.x = k.x + 100; d.y = k.y;
    // จำลองศัตรูหลายตัวด้วยการโคลนตัวเดิมเข้าไปในรายชื่อ
    for (let i = 1; i < foes; i++) st.units.push({ ...d, id: "clone-" + i, x: k.x + 100 + i * 20 });
    return domainHoldPlan(st, k, skill("R"));
  };
  t("เลือดต่ำ ศัตรูรุม คนตัดสินใจแม่นเลือกยืนนิ่ง", plan(10, 0.25, 3), plan(10, 0.25, 3) ? "ยืนนิ่ง" : "ออกมาสู้");
  t("สถานการณ์เดียวกัน คนตัดสินใจไม่แม่นสวนออกมา", !plan(0, 0.25, 3), plan(0, 0.25, 3) ? "ยืนนิ่ง" : "ออกมาสู้");
  t("เลือดเต็ม ไม่มีใครจ่อ ไม่มีใครยืนนิ่งทิ้งดาเมจ", !plan(10, 1.0, 0) && !plan(0, 1.0, 0),
    "แม่น " + (plan(10, 1.0, 0) ? "ยืนนิ่ง" : "ออกมาสู้") + " · ไม่แม่น " + (plan(0, 1.0, 0) ? "ยืนนิ่ง" : "ออกมาสู้"));
}

// ---- ยืนนิ่งในสายลมแล้วต้องไม่ลงมือจริงๆ ----
{
  const { st, k, d } = lab(18, 10);
  step(st);
  k.manual = null;                             // ปล่อยให้บอทคิดเอง
  k.hp = k.maxHp * 0.25;
  d.x = k.x + 100; d.y = k.y;
  d.manual = null;
  const sk = k.skills.find((x) => x.key === "R");
  sk.cdLeft = 0; sk.readyAt = -999;
  let g = 0;
  while (g++ < 60 * 3 && !k.domain) step(st);
  if (k.domain && k.domainHold > 0) {
    const casts0 = k.casts, hits0 = k.hits;
    for (let i = 0; i < 60; i++) step(st);
    t("เลือกยืนนิ่งแล้วไม่ตีและไม่ร่ายจริง", k.casts === casts0 && k.hits === hits0,
      "ร่ายเพิ่ม " + (k.casts - casts0) + " · ตีเพิ่ม " + (k.hits - hits0));
    t("ยืนนิ่งแล้วอมตะยังอยู่", !!k.domain, "domain=" + !!k.domain);
  } else {
    t("เลือกยืนนิ่งแล้วไม่ตีและไม่ร่ายจริง", false, "บอทไม่ได้เลือกยืนนิ่งในรอบนี้");
    t("ยืนนิ่งแล้วอมตะยังอยู่", false, "-");
  }
}

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(52) + " " + d); }
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
