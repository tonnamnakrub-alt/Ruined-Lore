// ---------------------------------------------------------------
// Patch 0.4 — กลไกใหม่ทั้งเจ็ดอย่างต้องทำงานจริงในสนาม ไม่ใช่แค่มีตัวเลขในข้อมูล
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { ITEMS } from "./src/data/items.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { applyDamage } from "./src/engine/damage.js";
import { fireSkill } from "./src/engine/fire-skill.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";

const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);
const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));
const big = ITEMS.filter((i) => i.cost >= 50);

const mk = (lane, id, lvl = 16, items = []) => ({
  lane, champId: id, level: lvl, xp: 0, gold: 0, items,
  ranks: { Q: 5, W: 5, E: 5, R: 3 },
  athlete: flat(5), upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE",
});

function duel(id, foeId = "KAZEM", lvl = 16, items = []) {
  const st = buildFight([mk("JUNGLE", id, lvl, items)].map(toDef), [mk("TOP", foeId, lvl)].map(toDef), 7, DEFAULT_FIGHT);
  st.timeLimit = 1e9;
  return { st, me: st.units[0], foe: st.units[1] };
}
const sk = (u, k) => u.skills.find((x) => x.key === k);

// ---- 1) ALUCARD Q ฮีลตามดาเมจที่ทำได้ ----
{
  const { st, me, foe } = duel("ALUCARD");
  foe.x = me.x + 120; foe.y = me.y;
  me.hp = me.maxHp * 0.5;
  const before = me.hp;
  fireSkill(st, me, sk(me, "Q"), foe, 10);
  step(st);
  t("ALUCARD Q ฮีลตามดาเมจที่ทำได้", me.hp > before, Math.round(me.hp - before) + " เลือดที่ฟื้น");
  t("Q มีตัวเลขฮีลในข้อมูล", !!CHAMPIONS.ALUCARD.skills[0].healPctDealt,
    JSON.stringify(CHAMPIONS.ALUCARD.skills[0].healPctDealt));
}

// ---- 2) ALUCARD R ตายครั้งแรกแล้วลุกกลับมา ----
{
  const { st, me, foe } = duel("ALUCARD");
  foe.x = me.x + 400; foe.y = me.y;
  fireSkill(st, me, sk(me, "R"), foe, 10);
  step(st);
  t("อยู่ในร่างค้างคาว", me.buffs.some((b) => b.type === "vampform"), "ติดบัฟ vampform");
  me.hp = 10;
  applyDamage(st, foe, me, 99999, false);
  t("ตายระหว่างร่างค้างคาวแล้วลุกกลับมา", me.alive && me.hp > 1,
    "เลือดที่ฟื้น " + Math.round(me.hp) + " / " + Math.round(me.maxHp) +
    " = " + Math.round((100 * me.hp) / me.maxHp) + "%");
  // ครั้งที่สองต้องตายจริง
  applyDamage(st, foe, me, 99999, false);
  t("ครั้งที่สองตายจริง ไม่ฟื้นซ้ำ", !me.alive, me.alive ? "ยังไม่ตาย" : "ตายแล้ว");
}

// ---- 3) HOOD พาสซีฟ ออโต้ที่ไม่คริก็ทิ้งเลือดไหล ----
{
  const cfg = CHAMPIONS.HOOD.critBleed;
  t("HOOD มีตัวเลขเลือดไหลของออโต้ธรรมดา", cfg.nonCritPct === 1.5 && cfg.pct === 1.75,
    "ไม่คริ " + Math.round(cfg.nonCritPct * 100) + "% · คริ " + Math.round(cfg.pct * 100) + "%");

  const { st, me, foe } = duel("HOOD", "KAZEM", 16, [big[2]]);
  me.crit = 0;                       // ตัดคริออกให้เหลือแต่ออโต้ธรรมดา
  me.x = foe.x - 300; me.y = foe.y;
  foe.maxHp = 1e9; foe.hp = 1e9;
  let g = 0;
  while (g++ < 60 * 6 && me.shots < 2) step(st);
  for (let i = 0; i < 30; i++) step(st);
  const bleeds = st.dots.filter((d) => d.hoodBleed && d.ownerId === me.id);
  t("ออโต้ธรรมดาทิ้งเลือดไหลไว้", bleeds.length > 0, bleeds.length + " ชั้น");
  t("HOOD ระยะโจมตีขึ้นเป็น 575", CHAMPIONS.HOOD.range === 575, CHAMPIONS.HOOD.range + " หน่วย");
}

// ---- 4) HOOD W ออโต้ตัดคูลดาวน์ ----
{
  const w = CHAMPIONS.HOOD.skills.find((x) => x.key === "W");
  t("HOOD W ตั้งค่าให้ออโต้ตัดคูลดาวน์", w.cdPerAuto === 1.5, w.cdPerAuto + " วิต่อออโต้หนึ่งครั้ง");

  const { st, me, foe } = duel("HOOD", "KAZEM", 16, [big[2]]);
  me.x = foe.x - 300; me.y = foe.y;
  foe.maxHp = 1e9; foe.hp = 1e9;
  const W = sk(me, "W");
  W.cdLeft = 20;
  const before = W.cdLeft;
  const shots0 = me.shots;
  let g = 0;
  while (g++ < 60 * 5 && me.shots - shots0 < 2) step(st);
  const spent = g / 60;
  t("ออโต้ลงแล้วคูลดาวน์ W ลดเร็วกว่าเวลาที่ผ่านไป", before - W.cdLeft > spent + 1,
    "ผ่านไป " + spent.toFixed(1) + " วิ · คูลดาวน์ลดไป " + (before - W.cdLeft).toFixed(1) + " วิ");
}

// ---- 5) H.S.B Q ซ่อมเป็นสัดส่วนของเลือดสูงสุด ----
{
  const q = CHAMPIONS["H.S.B"].skills[0];
  t("H.S.B Q ซ่อมเป็นเปอร์เซ็นต์แล้ว", !!q.repairPct && !q.repair, JSON.stringify(q.repairPct));

  const { st, me, foe } = duel("H.S.B");
  foe.x = me.x + 600; foe.y = me.y;
  fireSkill(st, me, sk(me, "W"), foe, 10);       // วางกำแพงก่อน
  step(st);
  const wall = st.lore.walls[0];
  t("วางกำแพงได้", !!wall, wall ? Math.round(wall.maxHp) + " เลือดกำแพง" : "ไม่มีกำแพง");
  wall.hp = wall.maxHp * 0.1;
  const hp0 = wall.hp;
  fireSkill(st, me, sk(me, "Q"), foe, 10);
  const gained = wall.hp - hp0;
  const want = wall.maxHp * q.repairPct[4];
  t("ซ่อมได้ตามสัดส่วนที่ตั้งไว้", Math.abs(gained - want) < wall.maxHp * 0.02,
    "ซ่อม " + Math.round(gained) + " = " + Math.round((100 * gained) / wall.maxHp) + "% ของเลือดสูงสุด");
}

// ---- 6) H.S.B E กดแล้วได้โล่ทันที ----
{
  const e = CHAMPIONS["H.S.B"].skills[2];
  t("H.S.B E มีโล่ตอนกดในข้อมูล", !!e.castShield, JSON.stringify(e.castShield));

  const { st, me, foe } = duel("H.S.B");
  foe.x = me.x + 500; foe.y = me.y;
  me.shield = 0;
  fireSkill(st, me, sk(me, "E"), foe, 10);
  t("กด E แล้วได้โล่ทันทีโดยไม่ต้องชนใคร", me.shield > 0, Math.round(me.shield) + " โล่");
}

// ---- 7) JACK R ยักษ์โดนตีได้ ----
{
  const { st, me, foe } = duel("JACK", "KAZEM");
  foe.x = me.x + 500; foe.y = me.y;
  fireSkill(st, me, sk(me, "R"), foe, 10);
  step(st);
  const giant = st.lore.pets[0];
  t("อัญเชิญยักษ์ได้", !!giant, giant ? Math.round(giant.maxHp) + " เลือดยักษ์" : "ไม่มียักษ์");
  const hp0 = giant.hp;
  // เอาศัตรูไปยืนประชิดตัวยักษ์
  foe.x = giant.x + 40; foe.y = giant.y;
  for (let i = 0; i < 120; i++) { foe.x = giant.x + 40; foe.y = giant.y; step(st); }
  const alive = st.lore.pets[0];
  const now = alive ? alive.hp : 0;
  t("ศัตรูที่ยืนประชิดทุบยักษ์ได้", now < hp0,
    "เลือดยักษ์ " + Math.round(hp0) + " เหลือ " + Math.round(now));
}

// ---- 8) ARTHUR พาสซีฟไต่ตามเลเวล ----
{
  const cfg = CHAMPIONS.ARTHUR.aegis;
  t("ARTHUR อัตราแปลงโล่ไต่ตามเลเวล", cfg.pct === 0.10 && cfg.pctPerLevel === 0.005,
    "ฐาน " + Math.round(cfg.pct * 100) + "% +" + (cfg.pctPerLevel * 100) + "% ต่อเลเวล");
  t("เพดานโล่ลดเหลือ 25% ของเลือดสูงสุด", cfg.cap === 0.25, Math.round(cfg.cap * 100) + "%");

  const shieldAt = (lvl) => {
    const { st, me, foe } = duel("ARTHUR", "KAZEM", lvl);
    foe.x = me.x + 120; foe.y = me.y;
    me.aegisShield = 0; me.shield = 0;
    applyDamage(st, me, foe, 1000, false);
    return me.shield;
  };
  const lo = shieldAt(1), hi = shieldAt(18);
  t("เลเวลสูงได้โล่มากกว่าเลเวลต่ำ", hi > lo,
    "เลเวล 1 ได้ " + Math.round(lo) + " · เลเวล 18 ได้ " + Math.round(hi));
}

// ---- 9) PIROSKA Q — บั๊กลูกซ้ำไม่ลดดาเมจ แก้แล้ว ----
{
  const q = CHAMPIONS.PIROSKA.skills[0];
  t("PIROSKA Q ลูกซ้ำตัวเดิมลดดาเมจแล้ว", q.falloff === 0.5, "เหลือ " + Math.round(q.falloff * 100) + "%");
  const mult = 1 + (q.count - 1) * q.falloff;
  t("ตัวคูณเมื่อโดนตัวเดียวลดจาก 7 เท่า", mult === 4, "×" + mult + " จากเดิม ×7");
}

// ---- 10) ค่าสถานะหลักที่เปลี่ยนไปต้องตรงกับสเปค ----
{
  const checks = [
    ["YODAKA พาสซีฟระยะ 300", CHAMPIONS.YODAKA.starlight.range === 300, CHAMPIONS.YODAKA.starlight.range],
    ["NIAN ออร่ารัศมี 400", CHAMPIONS.NIAN.staticAura.radius === 400, CHAMPIONS.NIAN.staticAura.radius],
    ["NIAN ออร่าสเกล Bonus HP 2%", CHAMPIONS.NIAN.staticAura.bonusHp === 0.02, CHAMPIONS.NIAN.staticAura.bonusHp],
    ["ELLA เศษแก้วเด้งที่เลือด 30%", CHAMPIONS.ELLA.glassShards.lowHpAt === 0.30, CHAMPIONS.ELLA.glassShards.lowHpAt],
    ["PUSS เปลี่ยนเป้าท้าดวลได้ทุกยก", CHAMPIONS.PUSS.duel.pickLockRounds === 1, CHAMPIONS.PUSS.duel.pickLockRounds],
    ["H.S.B บังเกอร์รัศมี 750", CHAMPIONS["H.S.B"].skills[3].radius === 750, CHAMPIONS["H.S.B"].skills[3].radius],
    ["H.S.B บังเกอร์อยู่ 15 วิ", CHAMPIONS["H.S.B"].skills[3].life === 15, CHAMPIONS["H.S.B"].skills[3].life],
    ["FAUSTUS อัลติคูลดาวน์ 60/55/50", CHAMPIONS.FAUSTUS.skills[3].cdByRank.join("/") === "60/55/50",
      CHAMPIONS.FAUSTUS.skills[3].cdByRank.join("/")],
  ];
  for (const [n, ok, v] of checks) t(n, ok, String(v));
}

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(46) + " " + d); }
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
