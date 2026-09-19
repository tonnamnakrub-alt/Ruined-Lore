// ทดสอบว่าสองเครื่องในโหมดออนไลน์จำลองไฟต์เดียวกันได้ผลตรงกันจริงไหม
//
// เครื่องเรา  : ทีมเราเป็นของจริง · ทีมอีกฝ่ายผ่าน packTeam -> unpackTeam มา
// เครื่องเขา  : กลับกัน
// ถ้าสนามข้อมูลที่ buildFight ใช้หล่นหายตอนส่งข้ามสาย ผลสองฝั่งจะไม่ตรงกัน
import { CHAMPIONS } from "./src/data/champions.js";
import { ITEMS } from "./src/data/items.js";
import { buildFight } from "./src/engine/build-fight.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";
import { packTeam, unpackTeam } from "./src/net/protocol.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";

const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
const STYLES = ["ENGAGE", "POKE", "HOLD"];

function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTeam(rand, style) {
  const ids = Object.values(CHAMPIONS).map((c) => c.id);
  const big = ITEMS.filter((i) => i.cost >= 50);
  return LANES.map((lane, i) => ({
    lane,
    champId: ids[Math.floor(rand() * ids.length)],
    level: 6 + Math.floor(rand() * 10),
    xp: 0,
    gold: 40,
    items: [big[Math.floor(rand() * big.length)], big[Math.floor(rand() * big.length)]],
    ranks: { Q: 3, W: 2, E: 2, R: 1 },
    athlete: { mechanics: 6, gameSense: 5, knowledge: 5, decision: 6, teamwork: 5 },
    upgrades: [],
    bountyGold: 0,
    sangHp: 0,
    wvcStacks: Math.floor(rand() * 20),   // สแตกที่สะสมข้ามยกมา
    spot: null,
    char: "P" + (i + 1),
    athleteName: "P" + (i + 1),
    style,
  }));
}

// จำลองสิ่งที่ startLaneFight ทำ: ทีมเราใช้ teamStyle ของเรา ทีมเขาใช้ style ที่ติดมากับข้อมูล
const defsOf = (roster, lanes, ownStyle) =>
  lanes.map((k) => roster.find((x) => x.lane === k)).filter(Boolean)
    .map((c) => toDef({ ...c, style: ownStyle || c.style }));

function runFight(blueDefs, redDefs, seed) {
  const st = buildFight(blueDefs, redDefs, seed, DEFAULT_FIGHT);
  let guard = 0;
  while (!st.over && guard++ < 60 * 200) step(st);
  const alive = (team) => st.units.filter((u) => u.team === team && u.alive).length;
  const hp = st.units.map((u) => Math.round(u.hp)).join(",");
  return { t: Math.round(st.t * 100) / 100, blue: alive("blue"), red: alive("red"), hp };
}

// รหัสไอเทมซ้ำกันคือต้นเหตุเดิม — ของที่ส่งด้วยรหัสจะกลายร่างที่ปลายทาง
const byId = {};
for (const it of ITEMS) (byId[it.id] = byId[it.id] || []).push(it);
const dupIds = Object.entries(byId).filter(([, v]) => v.length > 1).map(([k]) => k);
if (dupIds.length) {
  console.log("รหัสไอเทมซ้ำ:", dupIds.join(", "));
  process.exit(1);
}
console.log("รหัสไอเทมซ้ำ: ไม่มี");

const LANE_SETS = [["TOP"], ["MID"], ["JUNGLE"], ["ADC", "SUPPORT"], ["TOP", "JUNGLE"]];

let bad = 0, n = 250;
for (let i = 0; i < n; i++) {
  const rand = mulberry(9000 + i);
  const styleA = STYLES[Math.floor(rand() * 3)];
  const styleB = STYLES[Math.floor(rand() * 3)];
  const A = makeTeam(rand, styleA);         // ทีมเจ้าบ้าน
  const B = makeTeam(rand, styleB);         // ทีมผู้เข้าร่วม
  const lanes = LANE_SETS[i % LANE_SETS.length];
  const seed = 12345 + i;

  // เครื่องเจ้าบ้าน: A ของจริง · B มาจากสาย
  const hostView = runFight(
    defsOf(A, lanes, styleA),
    defsOf(unpackTeam(packTeam(B)), lanes, null),
    seed
  );
  // เครื่องผู้เข้าร่วม: B ของจริง · A มาจากสาย
  const guestView = runFight(
    defsOf(unpackTeam(packTeam(A)), lanes, null),
    defsOf(B, lanes, styleB),
    seed
  );

  const same = hostView.t === guestView.t && hostView.blue === guestView.blue
    && hostView.red === guestView.red && hostView.hp === guestView.hp;
  if (!same) {
    bad++;
    if (bad <= 4) {
      console.log(`ไม่ตรง #${i} · สไตล์ ${styleA} vs ${styleB}`);
      console.log("   เจ้าบ้าน  ", JSON.stringify(hostView).slice(0, 120));
      console.log("   ผู้เข้าร่วม", JSON.stringify(guestView).slice(0, 120));
    }
  }
}
console.log(`\nไฟต์ที่สองเครื่องเห็นไม่ตรงกัน: ${bad}/${n}`);
process.exit(bad ? 1 : 0);
