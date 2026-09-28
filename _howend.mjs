// ไฟต์ดวลจบด้วยอะไร — ฆ่าได้จริง หรือหมดเวลาแล้วตัดสินที่เลือดที่เหลือ
// ถ้าส่วนใหญ่จบด้วยหมดเวลา การกดดาเมจทั้งกระดานจะไม่เปลี่ยนผลอะไรเลย
// เพราะทุกคนโดนหารด้วยตัวเลขเดียวกัน สัดส่วนเลือดที่เหลือจึงเท่าเดิม
const B = "./";
const { CHAMPIONS } = await import(B + "src/data/champions.js");
const { STAT_KEYS } = await import(B + "src/data/constants.js");
const { DEFAULT_FIGHT, AUTO_DMG } = await import(B + "src/data/tuning.js");
const { buildFight } = await import(B + "src/engine/build-fight.js");
const { autoRanks } = await import(B + "src/engine/skill-ranks.js");
const { step } = await import(B + "src/engine/step.js");
const { toDef } = await import(B + "src/game/roster.js");
const { shopFor } = await import(B + "src/game/shop-ai.js");
const { mulberry32 } = await import(B + "src/engine/util.js");

const SEEDS = Number(process.argv[2] || 6);
const LVL = 13;
const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));
const IDS = Object.keys(CHAMPIONS);
const bare = (id) => {
  const ch = CHAMPIONS[id];
  return {
    lane: ch.lane, champId: id, level: LVL, xp: 0, gold: 400, items: [],
    ranks: autoRanks(LVL, ch.skillPriority, null), athlete: flat(5),
    upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
    char: "P", athleteName: "P", style: "POKE",
  };
};
const shopped = new Map();
const mk = (id, vs) => {
  const k = id + "|" + vs;
  if (!shopped.has(k)) shopped.set(k, shopFor(bare(id), [bare(vs)], mulberry32(4242), 0));
  return shopped.get(k);
};

let kill = 0, clock = 0, t = 0, n = 0, hpGap = 0, cap = 0;
for (let i = 0; i < IDS.length; i++) {
  for (let j = i + 1; j < IDS.length; j++) {
    for (let s = 0; s < SEEDS; s++) {
      const swap = s % 2 === 1;
      const a = swap ? IDS[j] : IDS[i], b = swap ? IDS[i] : IDS[j];
      const st = buildFight([mk(a, b)].map(toDef), [mk(b, a)].map(toDef), s * 7919 + i * 131 + j, DEFAULT_FIGHT);
      let g = 0;
      while (!st.over && g++ < 60 * 200) step(st);
      n++; t += st.t; cap = st.timeLimit;
      const dead = st.units.filter((u) => !u.alive).length;
      if (dead > 0) kill++;
      else {
        clock++;
        const hp = st.units.map((u) => u.hp / u.maxHp).sort((x, y) => y - x);
        hpGap += hp[0] - hp[1];
      }
    }
  }
}
console.log("AUTO_DMG ที่โหลดอยู่ = " + AUTO_DMG);
console.log("ไฟต์ทั้งหมด        " + n);
console.log("จบด้วยการฆ่าได้จริง " + Math.round((100 * kill) / n) + "%");
console.log("จบด้วยหมดเวลา      " + Math.round((100 * clock) / n) + "%   <- ตัดสินที่เลือดที่เหลือ");
console.log("ไฟต์ยาวเฉลี่ย       " + (t / n).toFixed(1) + " วิ (เพดาน " + cap + " วิ)");
if (clock) console.log("ตอนหมดเวลา เลือดสองฝ่ายห่างกันเฉลี่ย " + Math.round((100 * hpGap) / clock) + "% ของเลือดเต็ม");
