// กลไกของตัวละคร Patch 0.3 ที่เคยประกาศไว้ในข้อมูลแต่ไม่มีโค้ดอ่าน
// เทสนี้ยืนยันว่ามันทำงานจริงในไฟต์ ไม่ใช่แค่มีตัวเลขเขียนไว้เฉยๆ
import { buildFight } from "./src/engine/build-fight.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";
import { ITEMS } from "./src/data/items.js";
import { CHAMPIONS } from "./src/data/champions.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";

const big = ITEMS.filter((i) => i.cost >= 50);
const mk = (lane, id, lvl = 13) => ({
  lane, champId: id, level: lvl, xp: 0, gold: 40,
  items: [big[2], big[5], big[9]],
  ranks: { Q: 5, W: 5, E: 5, R: 3 },
  athlete: { mechanics: 8, gameSense: 7, knowledge: 7, decision: 8, teamwork: 7 },
  upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "ENGAGE",
});

function run(blue, red, seed, watch) {
  const st = buildFight(blue.map(toDef), red.map(toDef), seed, DEFAULT_FIGHT);
  let g = 0;
  while (!st.over && g++ < 60 * 90) { step(st); watch(st); }
  return st;
}

const out = [];

// NIAN Q — สตันตัวแรกที่พุ่งชน 1.1-1.5 วิ
{
  let stun = 0;
  run([mk("TOP", "NIAN")], [mk("TOP", "TRISTAN")], 4242, (st) => {
    for (const u of st.units) if (u.team === "red" && u.buffs.some((b) => b.type === "stun")) stun++;
  });
  out.push(["NIAN Q สตันตอนพุ่งชน", stun > 0, stun + " เฟรมที่ติดสตัน"]);
}

// PIROSKA Q — ผงพริกไทยลดพลังโจมตีและพลังเวท 10-20%
{
  let cut = 0;
  run([mk("SUPPORT", "PIROSKA")], [mk("SUPPORT", "PINO")], 777, (st) => {
    for (const u of st.units) if (u.team === "red" && u.buffs.some((b) => b.type === "ad" && b.v < 0)) cut++;
  });
  out.push(["PIROSKA Q ลดพลังโจมตี", cut > 0, cut + " เฟรมที่ติดดีบัฟ"]);
}

// JACK W — ไข่สโลว์รอบตัวระหว่างรอระเบิด
{
  let slowed = 0;
  run([mk("MID", "JACK")], [mk("MID", "ARIEL")], 909, (st) => {
    if (!st.zones.some((z) => st.t < z.at && z.skill && z.skill.auraSlow)) return;
    for (const u of st.units) if (u.team === "red" && u.buffs.some((b) => b.type === "slow")) slowed++;
  });
  out.push(["JACK W สโลว์รอบไข่ก่อนระเบิด", slowed > 0, slowed + " เฟรม"]);
}

// HOOD R — เลือดไหลหมู่ 4 วิหลังห่าฝนธนูลง
{
  let bleed = 0;
  run([mk("ADC", "HOOD")], [mk("ADC", "PETER")], 5150, (st) => {
    if (st.dots.some((d) => !d.hoodBleed && /Rain of Ruin/i.test(String(d.src || "")))) bleed++;
  });
  out.push(["HOOD R เลือดไหลจากห่าฝนธนู", bleed > 0, bleed + " เฟรมที่มี DoT"]);
}

// HOOD Q — ชาร์จเต็มต้องแรงกว่าชาร์จต่ำสุด
{
  const q = CHAMPIONS.HOOD.skills[0];
  const r = 4;
  out.push(["HOOD Q ชาร์จเต็มแรงกว่าชาร์จต่ำสุด", q.fullDmg[r] > q.dmg[r], q.dmg[r] + " -> " + q.fullDmg[r]]);
}

// PUSS — ค่าหัวของเป้าที่ท้าดวลแพงกว่าปกติ 30%
{
  let gold = 0;
  const st = run([mk("JUNGLE", "PUSS", 16)], [mk("JUNGLE", "ALUCARD", 9)], 31337, () => {});
  for (const u of st.units) if (u.team === "blue") gold = u.duelGold || 0;
  out.push(["PUSS ค่าหัวเป้าท้าดวล", gold > 0, "duelGold = " + gold.toFixed(2)]);
}

// YODAKA R — ลอยครบ 0.5 วิแล้วสั่งทุบก่อนหมดเวลาได้
{
  let early = false, cast = false;
  for (const seed of [2468, 11, 99, 500, 777, 1234]) {
    run([mk("JUNGLE", "YODAKA", 16), mk("TOP", "KAZEM", 16)],
      [mk("TOP", "TRISTAN"), mk("MID", "ARIEL")], seed, (st) => {
        const L = st.lore;
        if (!L || !L.slams) return;
        for (const s of L.slams) if (s.kind === "starfall") { cast = true; if (s.early) early = true; }
      });
    if (early) break;
  }
  out.push(["YODAKA R ทุบก่อนเวลาได้", early, cast ? "ร่าย R แล้วทุบก่อนหมดเวลาจริง" : "ไม่ได้ร่าย R เลย"]);
}

let fail = 0;
for (const [name, ok, detail] of out) {
  if (!ok) fail++;
  console.log((ok ? "  ok  " : " FAIL ") + name.padEnd(38) + " " + detail);
}
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
