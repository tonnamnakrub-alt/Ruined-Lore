// TOTSAKAN Q เป็นร่องดินที่แยกออกไป ไม่ใช่ของที่ลอยไป
//   1. ต้องโดนทั้งแนวในเฟรมเดียว ไม่มีเวลาเดินหลบ
//   2. กำแพงกันกระสุนของ H.S.B ต้องกันมันไม่ได้
import { CHAMPIONS } from "./src/data/champions.js";
import { buildFight } from "./src/engine/build-fight.js";
import { step } from "./src/engine/step.js";
import { fireSkill } from "./src/engine/fire-skill.js";
import { toDef } from "./src/game/roster.js";
import { ITEMS } from "./src/data/items.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";

const big = ITEMS.filter((i) => i.cost >= 50);
const mk = (lane, id, lvl = 13) => ({
  lane, champId: id, level: lvl, xp: 0, gold: 40, items: [big[2], big[5]],
  ranks: { Q: 5, W: 5, E: 5, R: 3 },
  athlete: { mechanics: 7, gameSense: 7, knowledge: 7, decision: 7, teamwork: 7 },
  upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE",
});

const out = [];

// 1) ไม่ใช่กระสุนอีกแล้ว — ยิงแล้วต้องไม่มีอะไรวิ่งอยู่ในสนาม
{
  const st = buildFight([mk("TOP", "TOTSAKAN")].map(toDef), [mk("TOP", "TRISTAN")].map(toDef), 7, DEFAULT_FIGHT);
  const u = st.units.find((x) => x.champId === "TOTSAKAN");
  const e = st.units.find((x) => x.team === "red");
  // วางเป้าให้อยู่ปลายแนว 600 หน่วยข้างหน้าพอดี
  e.x = u.x + 600; e.y = u.y;
  const sk = u.skills.find((s) => s.key === "Q");
  const before = e.hp;
  const projBefore = st.projectiles.length;
  fireSkill(st, u, sk, e, 1);
  const projAfter = st.projectiles.length;
  const hitSameFrame = e.hp < before;
  out.push(["ยิงแล้วไม่มีกระสุนวิ่งในสนาม", projAfter === projBefore, projAfter - projBefore + " กระสุน"]);
  out.push(["เป้าที่ปลายแนวโดนทันทีในเฟรมเดียว", hitSameFrame, Math.round(before - e.hp) + " ดาเมจ"]);
  out.push(["ติดสโลว์ตามสเปค", e.buffs.some((b) => b.type === "slow"), ""]);
}

// 2) กำแพงอิฐกันไม่ได้
{
  const st = buildFight([mk("TOP", "TOTSAKAN")].map(toDef), [mk("TOP", "H.S.B")].map(toDef), 11, DEFAULT_FIGHT);
  const u = st.units.find((x) => x.champId === "TOTSAKAN");
  const e = st.units.find((x) => x.champId === "H.S.B");
  e.x = u.x + 600; e.y = u.y;
  // ตั้งกำแพงขวางกลางทางแทนการรอให้บอทกดเอง
  const wsk = e.skills.find((s) => s.key === "W");
  fireSkill(st, e, wsk, u, 1);
  step(st);
  const wall = (st.lore && st.lore.walls) || [];
  const before = e.hp;
  const sk = u.skills.find((s) => s.key === "Q");
  fireSkill(st, u, sk, e, 1);
  step(st);
  out.push(["กำแพงตั้งขวางอยู่จริง", wall.length > 0, wall.length + " กำแพง"]);
  out.push(["ร่องดินทะลุกำแพงไปโดนเป้า", e.hp < before, Math.round(before - e.hp) + " ดาเมจ"]);
}

// 3) HOOD Q สเปคระบุความเร็วลูกศร 1,850 หน่วย/วินาที — ต้องเป็นลูกศรที่บินไป ไม่ใช่โดนทันที
{
  const st = buildFight([mk("ADC", "HOOD")].map(toDef), [mk("ADC", "PETER")].map(toDef), 3, DEFAULT_FIGHT);
  const u = st.units.find((x) => x.champId === "HOOD");
  const e = st.units.find((x) => x.champId === "PETER");
  e.x = u.x + 900; e.y = u.y;
  const sk = u.skills.find((s) => s.key === "Q");
  fireSkill(st, u, sk, e, 1);
  // ชาร์จค้างไว้จนปล่อย
  let spawned = null;
  for (let i = 0; i < 60 * 3 && !spawned; i++) {
    step(st);
    spawned = st.projectiles.find((q) => q.ownerId === u.id) || null;
  }
  out.push(["HOOD Q ปล่อยออกมาเป็นลูกศรที่บินไป", !!spawned, spawned ? "ความเร็ว " + spawned.speed : "ไม่มีกระสุนเลย"]);
  out.push(["ความเร็วตรงกับสเปค 1850", !!spawned && spawned.speed === 1850, spawned ? String(spawned.speed) : "-"]);
  out.push(["มีพื้นดาเมจตอนทะลุ (60%)", !!spawned && spawned.floor > 0,
    spawned ? Math.round(spawned.floor) + " / " + Math.round(spawned.dmg) : "-"]);
}

// 4) ของที่สเปคบอกว่าเป็นกระสุนจริงๆ ต้องยังเป็นกระสุนอยู่
{
  const speeds = [];
  for (const id of ["JACK", "PETER", "LAURA", "KLAEDER", "ALICE", "PINO"]) {
    for (const sk of CHAMPIONS[id].skills) {
      if (sk.type === "line") speeds.push(id + " " + sk.key + (sk.instant ? " INSTANT" : ""));
    }
  }
  out.push(["ท่าอื่นที่เป็นกระสุนยังเป็นกระสุนอยู่", !speeds.some((s) => /INSTANT/.test(s)), speeds.join(", ")]);
}

let fail = 0;
for (const [name, ok, detail] of out) {
  if (!ok) fail++;
  console.log((ok ? "  ok  " : " FAIL ") + name.padEnd(36) + " " + detail);
}
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
