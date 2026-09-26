// ---------------------------------------------------------------
// อัตราชนะของแต่ละตัวละคร — พบกันหมดแบบตัวต่อตัว พร้อมรายละเอียดสำหรับวางแพตช์
//
// ทุกอย่างเท่ากันหมด: เลเวล ของ ค่าสถานะนักแข่ง และสลับสีทุกคู่
// เหลือความต่างอย่างเดียวคือตัวละคร เลยอ่านได้ว่าใครแรงเกิน
//
// ไฟต์ส่วนใหญ่ในเกมจริงคือ 1v1 (ท็อป/มิด) กับ 2v2 (บอท) ตารางนี้จึงใกล้ของจริง
// ยกเว้นสายซัพที่ปกติไม่ได้ยืนเดี่ยว — ดูคอลัมน์ฮีล/โล่ประกอบ
//
//   node _champwr.mjs [จำนวน seed ต่อคู่] [เลเวล]
// ---------------------------------------------------------------
import fs from "fs";
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { ITEMS } from "./src/data/items.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";
import { shopFor } from "./src/game/shop-ai.js";
import { mulberry32 } from "./src/engine/util.js";

const SEEDS = Number(process.argv[2] || 6);
const LVL = Number(process.argv[3] || 13);
const big = ITEMS.filter((i) => i.cost >= 50);
const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));
const IDS = Object.keys(CHAMPIONS);

// งบเท่ากันทุกตัว แล้วปล่อยให้บอทเลือกของตามสายของตัวเองเหมือนในเกมจริง
// เดิมแจกของชุดเดียวกันให้ทุกตัว ซึ่งบังเอิญเป็นของสายเวททั้งสามชิ้น
// มาร์คแมนกับยักษ์เลยถูกวัดด้วยของที่ไม่มีวันซื้อ ตารางที่ได้จึงเอียงทั้งใบ
const GOLD = 400;
const bare = (id) => {
  const ch = CHAMPIONS[id];
  return {
    lane: ch.lane, champId: id, level: LVL, xp: 0, gold: GOLD, items: [],
    ranks: autoRanks(LVL, ch.skillPriority, null),
    athlete: flat(5),
    upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
    char: "P", athleteName: "P", style: "POKE",
  };
};
// ซื้อครั้งเดียวต่อคู่ แล้วจำไว้ใช้ซ้ำ ไม่ต้องคิดใหม่ทุกไฟต์
const shopped = new Map();
const mk = (id, vsId) => {
  const key = id + "|" + vsId;
  if (!shopped.has(key)) shopped.set(key, shopFor(bare(id), [bare(vsId)], mulberry32(4242), 0));
  return shopped.get(key);
};

const S = {};
for (const id of IDS) {
  S[id] = { win: 0, games: 0, dmg: 0, took: 0, heal: 0, shield: 0, lived: 0, src: {}, time: 0 };
}

for (let i = 0; i < IDS.length; i++) {
  for (let j = i + 1; j < IDS.length; j++) {
    const a = IDS[i], b = IDS[j];
    for (let s = 0; s < SEEDS; s++) {
      const swap = s % 2 === 1;                       // สลับสีครึ่งหนึ่ง กันข้อได้เปรียบของฝั่งน้ำเงิน
      const blueId = swap ? b : a;
      const redId = swap ? a : b;
      const st = buildFight([mk(blueId, redId)].map(toDef), [mk(redId, blueId)].map(toDef),
        s * 7919 + i * 131 + j, DEFAULT_FIGHT);
      let g = 0;
      while (!st.over && g++ < 60 * 200) step(st);
      S[a].games++; S[b].games++;
      S[a].time += st.t; S[b].time += st.t;
      if (st.winner === "blue") S[blueId].win++;
      else if (st.winner === "red") S[redId].win++;
      for (const u of st.units) {
        const k = S[u.team === "blue" ? blueId : redId];
        k.dmg += u.damageDealt;
        k.took += Object.values(u.takenBy || {}).reduce((x, y) => x + y, 0);
        k.heal += u.healGiven || 0;
        k.shield += u.shieldGiven || 0;
        if (u.alive) k.lived++;
        for (const [src, v] of Object.entries(u.dealtBy || {})) k.src[src] = (k.src[src] || 0) + v;
      }
    }
  }
}

const rows = IDS.map((id) => {
  const k = S[id];
  const n = Math.max(1, k.games);
  return {
    id, ch: CHAMPIONS[id],
    wr: (100 * k.win) / n,
    dmg: k.dmg / n, took: k.took / n,
    heal: (k.heal + k.shield) / n,
    lived: (100 * k.lived) / n,
    src: Object.entries(k.src).sort((x, y) => y[1] - x[1]).map(([s, v]) => [s, v / n]),
  };
}).sort((x, y) => y.wr - x.wr);

const pad = (s, n) => String(s).padStart(n);
const padr = (s, n) => String(s).padEnd(n);

console.log(`=== ตัวต่อตัวพบกันหมด · เลเวล ${LVL} · ${SEEDS} seed ต่อคู่ · ${S[IDS[0]].games} ไฟต์ต่อตัว ===`);
console.log(`(บอทซื้อของให้แต่ละตัวเองจากงบ ${GOLD}g เท่ากัน — ไม่ได้แจกของชุดเดียวกันให้ทุกตัว)`);
// ค่าคลาดเคลื่อนคร่าวๆ ของสัดส่วน ที่ p=0.5
const se = 100 * Math.sqrt(0.25 / S[IDS[0]].games);
console.log(`(ค่าคลาดเคลื่อนราว ±${(1.96 * se).toFixed(1)} แต้ม — ความต่างที่น้อยกว่านี้อ่านว่าเท่ากัน)\n`);

console.log("ตัวละคร      ชนะ     ดาเมจ   กินดาเมจ  ฮีล+โล่  รอดจบไฟต์  เลน      บทบาท");
for (const r of rows) {
  console.log(
    padr(r.id, 12),
    pad(r.wr.toFixed(1) + "%", 6),
    pad(r.dmg.toFixed(0), 9),
    pad(r.took.toFixed(0), 10),
    pad(r.heal.toFixed(0), 8),
    pad(r.lived.toFixed(0) + "%", 10),
    " " + padr(r.ch.lane, 8),
    r.ch.role,
  );
}

// เก็บผลไว้ให้ _champdoc.mjs เอาไปแนบในเอกสารตัวละคร
fs.writeFileSync("champ-wr.json", JSON.stringify({
  seeds: SEEDS, level: LVL, fightsEach: S[IDS[0]].games,
  margin: Number((1.96 * se).toFixed(1)),
  rows: rows.map((r) => ({
    id: r.id, wr: Number(r.wr.toFixed(1)), dmg: Math.round(r.dmg), took: Math.round(r.took),
    heal: Math.round(r.heal), lived: Math.round(r.lived),
    src: r.src.slice(0, 4).map(([s2, v]) => [s2, Math.round(v)]),
  })),
}, null, 1));

console.log("\n=== ดาเมจมาจากท่าไหน (สามอันดับแรกต่อไฟต์) ===");
for (const r of rows) {
  const top = r.src.slice(0, 3)
    .map(([s, v]) => s + " " + v.toFixed(0) + " (" + Math.round((100 * v) / Math.max(1, r.dmg)) + "%)")
    .join(" · ");
  console.log(padr(r.id, 12) + pad(r.wr.toFixed(1) + "%", 6) + "  " + top);
}
