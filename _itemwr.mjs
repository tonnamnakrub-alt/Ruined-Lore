// ---------------------------------------------------------------
// ไอเทมชิ้นไหนแรงเกิน — วัดด้วยการแจกให้ทีมหนึ่งเกินมาหนึ่งชิ้น
//
// สองทีมเหมือนกันเป๊ะทุกอย่าง ตัวละคร เลเวล ค่าสถานะนักแข่ง และของที่บอทซื้อเอง
// ต่างกันอย่างเดียวคือฝั่งหนึ่งได้ไอเทมที่กำลังวัดเพิ่มมาคนละชิ้น
// สลับสีครึ่งหนึ่งกันข้อได้เปรียบของฝั่งน้ำเงิน
//
// 50% = ไอเทมไม่มีผลเลย · ยิ่งเกินยิ่งแรง
//
// ---- สิ่งที่เปลี่ยนจากเวอร์ชันแรก ----
// เดิมใช้ทีมมาตรฐานคละสายชุดเดียววัดทุกชิ้น ซึ่งแปลว่าของมาร์คแมนถูกยัดใส่มือ
// แทงค์กับซัพด้วย เลขที่ได้จึงเป็น "ของชิ้นนี้ดีแค่ไหนกับทีมสุ่มๆ ทีมหนึ่ง"
// ไม่ใช่ "ของชิ้นนี้ดีแค่ไหนกับคนที่ควรซื้อมัน" ซึ่งเป็นคำถามที่เราอยากรู้จริงๆ
//
// ตอนนี้แต่ละหมวดมีทีมของตัวเอง ประกอบด้วยตัวละครสายนั้นห้าตัว
// ของสายเวทจึงวัดบนมือนักเวทห้าคน ของมาร์คแมนวัดบนมือมาร์คแมนห้าคน
// ได้ทั้งความถูกต้องของสาย และสัญญาณที่แรงพอจะอ่านออกในไฟต์ไม่กี่สิบครั้ง
//
//   node _itemwr.mjs [จำนวนไฟต์ต่อชิ้น]
// ---------------------------------------------------------------
import fs from "fs";
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { ITEMS, applyBuy } from "./src/data/items.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";
import { shopFor } from "./src/game/shop-ai.js";
import { mulberry32 } from "./src/engine/util.js";

const N = Number(process.argv[2] || 24);
const LVL = 13;
const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));

// ทีมประจำหมวด — ตัวละครสายนั้นห้าตัว ยืนครบห้าช่อง
// เลือกจากบทบาทจริงในข้อมูลตัวละคร ไม่ได้เลือกตามความชอบ
const SQUAD = {
  TANK: ["TOTSAKAN", "KLAEDER", "NIAN", "H.S.B", "STEIN"],
  FIGHTER: ["KAZEM", "ARTHUR", "TRISTAN", "LUCH", "ALUCARD"],
  ASSASSIN: ["ELLA", "YODAKA", "PUSS", "KAMACHI", "ALUCARD"],
  MAGE: ["ARIEL", "LAURA", "JACK", "FAUSTUS", "PIROSKA"],
  MARKSMAN: ["HOOD", "PETER", "C.HOOK", "PHANTOM", "HOOD"],
  SUPPORT: ["PINO", "ALICE", "PIROSKA", "H.S.B", "STEIN"],
};

const base = (lane, id) => ({
  lane, champId: id, level: LVL, xp: 0, gold: 200, items: [],
  ranks: autoRanks(LVL, CHAMPIONS[id].skillPriority, null),
  athlete: flat(5), upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE",
});

// บอทซื้อของให้ทั้งสองฝั่งเหมือนกัน แล้วค่อยแถมชิ้นที่วัดให้ฝั่งเดียว
function team(cat, seed, extra) {
  const ids = SQUAD[cat];
  const roster = LANES.map((l, i) => base(l, ids[i]));
  return roster.map((c) => {
    let out = shopFor(c, roster, mulberry32(77 + seed), 0);
    if (extra) {
      const nx = applyBuy({ ...out, gold: 99999 }, extra);
      if (nx.items.length > out.items.length) out = { ...nx, gold: out.gold };
    }
    return toDef(out);
  });
}

function winRate(cat, item) {
  let win = 0, games = 0;
  for (let s = 0; s < N; s++) {
    const swap = s % 2 === 1;
    const withIt = team(cat, s, item);
    const without = team(cat, s, null);
    const st = buildFight(swap ? without : withIt, swap ? withIt : without, s * 7919 + 13, DEFAULT_FIGHT);
    let g = 0;
    while (!st.over && g++ < 60 * 200) step(st);
    const mine = swap ? "red" : "blue";
    games++;
    if (st.winner === mine) win++;
    else if (!st.winner) win += 0.5;           // หมดเวลาแบบไม่มีผู้ชนะ นับครึ่ง
  }
  return (100 * win) / games;
}

const CATS = ["TANK", "FIGHTER", "ASSASSIN", "MAGE", "MARKSMAN", "SUPPORT"];
const margin = 196 * Math.sqrt(0.25 / N);
console.log(`วัดชิ้นละ ${N} ไฟต์ · ค่าคลาดเคลื่อนต่อชิ้นราว ±${margin.toFixed(1)} แต้ม`);
console.log("(ค่าเฉลี่ยรายสายรวมของหลายชิ้น จึงแม่นกว่านั้นมาก — ดูท้ายตาราง)\n");

// ฐานของแต่ละหมวด — สองทีมเหมือนกันเป๊ะ ควรใกล้ 50% ทุกหมวด
const baseline = {};
console.log("ฐาน = ทีมเดียวกันสู้กันเอง ต้องได้ราว 50% ทุกหมวด (ใช้ตรวจว่าฝั่งสีไม่ได้เปรียบ)");
for (const cat of CATS) {
  baseline[cat] = winRate(cat, null);
  const off = Math.abs(baseline[cat] - 50) > margin ? "  ⚠️ เกินค่าคลาดเคลื่อน" : "";
  console.log(`  ${cat.padEnd(9)} ${baseline[cat].toFixed(1)}%${off}  (ทีม: ${SQUAD[cat].join(" ")})`);
}

const t3 = ITEMS.filter((i) => i.tier === 3);
const rows = [];
for (const it of t3) {
  const wr = winRate(it.cat, it);
  rows.push({
    id: it.id, cat: it.cat, cost: it.cost,
    name: String(it.th || it.id).split("—")[0].trim(),
    wr,
    // เทียบกับ 50 ซึ่งเป็นค่าที่ถูกต้องโดยโครงสร้าง ไม่ใช่กับฐานที่วัดมา
    edge: wr - 50,
  });
}
rows.sort((a, b) => b.edge - a.edge);

const line = (r) => "  " + r.cat.padEnd(9) + r.id.padEnd(6) + String(r.cost).padStart(3) + "g  " +
  r.wr.toFixed(1).padStart(5) + "%  " + (r.edge >= 0 ? "+" : "") + r.edge.toFixed(1).padStart(5) + "   " + r.name;
console.log("\n=== แรงสุด 12 อันดับ (เทียบ 50% = ไม่มีผลเลย) ===");
rows.slice(0, 12).forEach((r) => console.log(line(r)));
console.log("\n=== อ่อนสุด 12 อันดับ ===");
rows.slice(-12).reverse().forEach((r) => console.log(line(r)));

console.log("\n=== ค่าเฉลี่ยรายสาย ===");
console.log("  สาย       ชิ้น   ชนะเฉลี่ย   เหนือฐาน   คลาดเคลื่อน");
const cats = [];
for (const cat of CATS) {
  const t = rows.filter((r) => r.cat === cat);
  if (!t.length) continue;
  const wr = t.reduce((a, r) => a + r.wr, 0) / t.length;
  const edge = t.reduce((a, r) => a + r.edge, 0) / t.length;
  // ของแต่ละชิ้นวัดด้วยชุด seed เดียวกัน แต่เป็นไฟต์คนละไฟต์ นับเป็นอิสระต่อกันได้
  const m = margin / Math.sqrt(t.length);
  cats.push({ cat, n: t.length, wr: Number(wr.toFixed(1)), edge: Number(edge.toFixed(1)), margin: Number(m.toFixed(1)) });
  console.log("  " + cat.padEnd(9) + String(t.length).padStart(3) + "   " +
    wr.toFixed(1).padStart(7) + "%   " + (edge >= 0 ? "+" : "") + edge.toFixed(1).padStart(6) + "     ±" + m.toFixed(1));
}

fs.writeFileSync("item-wr.json", JSON.stringify({
  fightsEach: N, margin: Number(margin.toFixed(1)),
  squads: SQUAD,
  baseline: Object.fromEntries(CATS.map((c) => [c, Number(baseline[c].toFixed(1))])),
  cats,
  rows: rows.map((r) => ({ ...r, wr: Number(r.wr.toFixed(1)), edge: Number(r.edge.toFixed(1)) })),
}, null, 1));
console.log("\nเขียน item-wr.json แล้ว");
