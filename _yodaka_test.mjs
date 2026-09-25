// YODAKA — E ต้องใหญ่ขึ้น และ R ต้องขยับได้ระหว่างลอยอยู่บนฟ้า
import { CHAMPIONS } from "./src/data/champions.js";
import { ITEM_BY_ID } from "./src/data/items.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { fireSkill } from "./src/engine/fire-skill.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";

const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);
const C = CHAMPIONS.YODAKA;
const sk = (k) => C.skills.find((s) => s.key === k);

const mk = (lane, id, extra) => ({
  lane, champId: id, level: 16, xp: 0, gold: 0, items: [],
  ranks: { Q: 5, W: 5, E: 5, R: 3 },
  athlete: { mechanics: 8, gameSense: 8, knowledge: 8, decision: 8, teamwork: 8 },
  upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE", ...extra,
});

function fight() {
  const me = mk("JUNGLE", "YODAKA", { items: [ITEM_BY_ID.tet, ITEM_BY_ID.asc].filter(Boolean) });
  const foes = ["MID", "ADC", "TOP"].map((L) => mk(L, "PIROSKA"));
  const st = buildFight([me].map(toDef), foes.map(toDef), 9, DEFAULT_FIGHT);
  return { st, me: st.units.find((u) => u.champId === "YODAKA"), foes: st.units.filter((u) => u.team === "red") };
}

// ---- E ใหญ่ขึ้น ----
{
  const e = sk("E");
  t("E ด้านสามเหลี่ยมใหญ่ขึ้นเป็น 460", e.side === 460, e.side + " หน่วย (เดิม 350)");
  t("E แนวฟันกว้างขึ้นเป็น 150", e.width === 150, e.width + " หน่วย (เดิม 110)");
  // พื้นที่ในกรอบสามเหลี่ยมโตขึ้นตามด้าน
  const area = (s) => (Math.sqrt(3) / 4) * s * s;
  t("พื้นที่ครอบคลุมโตขึ้นราวหนึ่งเท่าครึ่ง", area(460) / area(350) > 1.6,
    "×" + (area(460) / area(350)).toFixed(2) + " ของเดิม");

  // ศัตรูที่เดิมอยู่นอกขอบ ตอนนี้ต้องโดน
  const { st, me, foes } = fight();
  const foe = foes[0];
  // วางไว้ห่างเท่ากับด้านเดิมพอดี — เดิมไม่โดน ตอนนี้ต้องโดน
  foe.x = me.x + 400; foe.y = me.y;
  for (const other of foes.slice(1)) { other.x = me.x - 3000; other.y = me.y - 3000; }
  const hp0 = foe.hp;
  fireSkill(st, me, me.skills.find((s) => s.key === "E"), foe, 10);
  t("ศัตรูที่ระยะ 400 โดน E แล้ว", foe.hp < hp0, Math.round(hp0 - foe.hp) + " ดาเมจ");
}

// ---- R ขยับได้ระหว่างลอย ----
{
  const r = sk("R");
  t("R ระบุว่าขยับได้ระหว่างลอย", r.airMove === true, String(r.airMove));

  const { st, me, foes } = fight();
  for (const f of foes) { f.x = me.x + 900; f.y = me.y + 500; }
  fireSkill(st, me, me.skills.find((s) => s.key === "R"), foes[0], 10);
  const x0 = me.x, y0 = me.y;
  t("ลอยอยู่แล้วแตะไม่ได้", me.buffs.some((b) => b.type === "untargetable"), "ติดบัฟแตะไม่ได้");
  // เดินระหว่างลอย — ผ่านไปหนึ่งวินาที ต้องขยับได้จริง
  for (let i = 0; i < 60; i++) { step(st); }
  const moved = Math.hypot(me.x - x0, me.y - y0);
  t("เดินได้จริงระหว่างอยู่บนฟ้า", moved > 50, Math.round(moved) + " หน่วยใน 1 วินาที");
  t("ยังไม่โดนตรึงขา", !me.rooted, me.rooted ? "ยังโดนตรึง" : "ขยับได้");

  // วงที่จะทุบต้องตามตัวไปด้วย แล้วลงจริงตรงจุดใหม่
  const slam = (st.lore.slams || []).find((s2) => s2.kind === "starfall");
  t("วงที่จะทุบตามตัวไปด้วย", slam && Math.hypot(slam.x - me.x, slam.y - me.y) < 1,
    slam ? "ห่างจากตัว " + Math.round(Math.hypot(slam.x - me.x, slam.y - me.y)) + " หน่วย" : "ไม่มีวง");
  let g = 0;
  while ((st.lore.slams || []).length && g++ < 60 * 6) step(st);
  t("ลงพื้นแล้วอมตะกับแตะไม่ได้หลุด", !me.buffs.some((b) => b.type === "invuln" || b.type === "untargetable"),
    "ลงที่ " + Math.round(me.x) + "," + Math.round(me.y));
}

// ---- ท่าอื่นที่อมตะต้องยังตรึงขาเหมือนเดิม ----
{
  const { st, me } = fight();
  me.airFree = 0;
  me.buffs.push({ type: "invuln", v: 1, until: st.t + 2 });
  step(st);
  t("อมตะของท่าอื่นยังตรึงขาเหมือนเดิม", me.rooted === true, me.rooted ? "ตรึงอยู่" : "ไม่ตรึง (ผิด)");
}

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(40) + " " + d); }
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
