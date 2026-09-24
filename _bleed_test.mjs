// เลือดไหลต้องจ่ายเป็นงวด (ต่อวินาที) ไม่ใช่ทุกเฟรม — และยอดรวมต้องเท่าเดิม
// รวมถึงเพดานเลเวล: ทุกเลนตันที่ 18 ยกเว้นท็อปที่ได้ถึง 20
import { CHAMPIONS } from "./src/data/champions.js";
import { LANE_INFO } from "./src/data/lanes.js";
import { DEFAULT_FIGHT, DMG_MUL } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { DOT_EVERY, addDot } from "./src/engine/state-util.js";
import { tickNewSystems } from "./src/engine/systems.js";
import { xpToLevel } from "./src/engine/util.js";
import { laneMax } from "./src/game/roster.js";
import { toDef } from "./src/game/roster.js";
import { SKILL_ORDER } from "./src/engine/skill-ranks.js";

const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);
const DT = 1 / 60;

const mk = (lane, id) => ({
  lane, champId: id, level: 10, xp: 0, gold: 0, items: [],
  ranks: { Q: 1, W: 1, E: 1, R: 1 },
  athlete: { mechanics: 5, gameSense: 5, knowledge: 5, decision: 5, teamwork: 5 },
  upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE",
});

// สนามเปล่าๆ ไว้ทดสอบเลือดไหลอย่างเดียว — ไม่ให้ใครตีกัน
function lab() {
  const st = buildFight([mk("TOP", "KAZEM")].map(toDef), [mk("MID", "LAURA")].map(toDef), 1, DEFAULT_FIGHT);
  for (const u of st.units) {
    u.skills = [];
    u.atkCd = 1e9;
    u.hp = 100000;
    u.maxHp = 100000;
    u.armor = 0;
    u.mr = 0;
  }
  return st;
}

// เดินเวลาแล้วจดว่าเฟรมไหน "มีดาเมจลง" บ้าง
function runDot(dot, seconds) {
  const st = lab();
  const victim = st.units[1];
  addDot(st, { targetId: victim.id, ownerId: st.units[0].id, ...dot });
  const hits = [];
  let last = victim.hp;
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    st.t += DT;
    tickNewSystems(st);
    if (victim.hp < last - 1e-9) {
      hits.push({ at: Math.round(st.t * 100) / 100, dmg: Math.round((last - victim.hp) * 100) / 100 });
      last = victim.hp;
    }
  }
  return { hits, total: Math.round((100000 - victim.hp) * 100) / 100, dotsLeft: st.dots.length };
}

// ---- งวดละ 1 วินาที ----
{
  const r = runDot({ dps: 10, until: 3 }, 4.2);
  t("จ่ายเป็นงวด ไม่ใช่ทุกเฟรม", r.hits.length <= 4, r.hits.length + " ครั้ง (เดิมจะเป็น ~180 ครั้ง)");
  t("งวดละ 1 วินาที", r.hits.every((h, i) => Math.abs(h.at - (i + 1)) < 0.05),
    r.hits.map((h) => h.at + "s").join(" · "));
  const hit = (raw) => Math.round(raw * DMG_MUL * 100) / 100;   // ดาเมจทุกก้อนโดนตัวคูณรวมของเกม
  t("ยอดรวมเท่าเดิม", Math.abs(r.total - hit(30)) < 0.01, r.total + " (ดิบ 30 × ตัวคูณ " + DMG_MUL + ")");
  t("แต่ละงวดเท่ากับ dps หนึ่งวินาที", r.hits.every((h) => Math.abs(h.dmg - hit(10)) < 0.01), r.hits.map((h) => h.dmg).join(" · "));
  t("หมดเวลาแล้วหายไปจากรายการ", r.dotsLeft === 0, r.dotsLeft + " ก้อนค้าง");
}

// ---- ท่าที่กำหนดจังหวะเอง เช่น HOOD ทุก 0.5 วิ ----
{
  const cfg = CHAMPIONS.HOOD.critBleed;
  t("ข้อมูล HOOD ระบุจังหวะจ่ายไว้", cfg.every === 0.5, "ทุก " + cfg.every + " วิ · นาน " + cfg.dur + " วิ");
  const r = runDot({ dps: 30 / cfg.dur, until: cfg.dur, every: cfg.every }, cfg.dur + 1);
  t("HOOD จ่ายทุก 0.5 วิ ตามสเปค", r.hits.length === cfg.dur / cfg.every,
    r.hits.length + " งวด · " + r.hits.map((h) => h.at).join(" · "));
  t("ยอดรวมของ HOOD ยังเท่าเดิม", Math.abs(r.total - Math.round(30 * DMG_MUL * 100) / 100) < 0.01, r.total + " (ดิบ 30)");
}

// ---- เวลาไม่ลงตัวกับงวด ต้องจ่ายเศษที่เหลือตอนหมดเวลา ----
{
  const r = runDot({ dps: 10, until: 2.5 }, 3.5);
  t("เวลาไม่ลงตัว ยอดรวมยังครบ", Math.abs(r.total - Math.round(25 * DMG_MUL * 100) / 100) < 0.01, r.total + " (ดิบ 25)");
  t("งวดสุดท้ายจ่ายเศษที่เหลือ", r.hits.length === 3 && Math.abs(r.hits[2].dmg - Math.round(5 * DMG_MUL * 100) / 100) < 0.01,
    r.hits.map((h) => h.at + "s:" + h.dmg).join(" · "));
}

// ---- ค่าเริ่มต้นคือหนึ่งวินาที ----
t("ค่าเริ่มต้นของงวดคือ 1 วินาที", DOT_EVERY === 1, String(DOT_EVERY));

// ---- เพดานเลเวล ----
{
  const caps = Object.entries(LANE_INFO).map(([k, v]) => k + " " + v.maxLevel);
  t("ท็อปได้ถึง 20", LANE_INFO.TOP.maxLevel === 20, caps.join(" · "));
  t("เลนอื่นตันที่ 18", ["JUNGLE", "MID", "ADC", "SUPPORT"].every((k) => LANE_INFO[k].maxLevel === 18),
    caps.join(" · "));
  t("เลเวล 18 = แต้มสกิลเต็มพอดี", SKILL_ORDER.length === 18, SKILL_ORDER.length + " แต้ม (Q5 W5 E5 R3)");
  // XP เยอะแค่ไหนก็ไม่เกินเพดานของเลนนั้น
  t("XP ล้นก็ไม่เกินเพดาน", xpToLevel(99999, laneMax("MID")) === 18 && xpToLevel(99999, laneMax("TOP")) === 20,
    "MID " + xpToLevel(99999, laneMax("MID")) + " · TOP " + xpToLevel(99999, laneMax("TOP")));
}

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(36) + " " + d); }
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
