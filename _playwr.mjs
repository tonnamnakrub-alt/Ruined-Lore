// ---------------------------------------------------------------
// สรุปสมุดบันทึกแมตช์ที่เล่นผ่านหน้าจอจริง ให้ CHAMPIONS.md เอาไปใช้
//
// ทำไมต้องเทียบกับค่ากลางของเลนตัวเอง ไม่ใช่เทียบ 50%:
// อัตราชนะไฟต์ของจังเกิลถูกดันขึ้นทั้งกลุ่ม (ค่ากลาง 87% เทียบ ADC 53%)
// เพราะจังเกิลเลือกเข้าแกงก์เฉพาะไฟต์ที่ได้เปรียบ ไม่ใช่เพราะจังเกิลโกง
// เทียบข้ามเลนจึงไม่มีความหมาย ต้องเทียบ "ตัวนี้เก่งกว่าหรือแย่กว่าคนอื่นในเลนเดียวกัน"
//
//   node _playwr.mjs            อ่าน _played-matchlog.json เขียน play-wr.json
// ---------------------------------------------------------------
import fs from "fs";
import { aggregate } from "./src/game/matchlog.js";

const SRC = "_played-matchlog.json";
const OUT = "play-wr.json";

let rows = [];
try {
  const j = JSON.parse(fs.readFileSync(SRC, "utf8"));
  rows = Array.isArray(j.rows) ? j.rows : [];
} catch {
  console.error("อ่าน " + SRC + " ไม่ได้ — ยังไม่มีข้อมูลเล่นจริง");
  process.exit(1);
}

const a = aggregate(rows);
const wins = rows.filter((r) => r.won).length;
const draws = rows.filter((r) => r.drawn).length;

// ---- ค่ากลางชนะไฟต์ของแต่ละเลน
const byLane = {};
for (const c of a.champs) (byLane[c.lane] = byLane[c.lane] || []).push(c);
const laneMid = {};
for (const [L, list] of Object.entries(byLane)) {
  const f = list.reduce((s, c) => s + c.fights, 0);
  const w = list.reduce((s, c) => s + c.fw, 0);
  laneMid[L] = f ? (100 * w) / f : null;
}

// ---- รายตัว: รวมทุกเลนที่ตัวนั้นเคยเล่น ถ่วงน้ำหนักด้วยจำนวนไฟต์
const per = {};
for (const c of a.champs) {
  const e = (per[c.champ] = per[c.champ] || { matches: 0, wins: 0, fights: 0, fw: 0, relSum: 0, lanes: {} });
  e.matches += c.n;
  e.wins += c.w;
  e.fights += c.fights;
  e.fw += c.fw;
  e.lanes[c.lane] = c.n;
  if (c.fights && laneMid[c.lane] != null) e.relSum += (c.fightWr - laneMid[c.lane]) * c.fights;
}

const champs = Object.entries(per).map(([champ, e]) => ({
  champ,
  matches: e.matches,
  matchWr: e.matches ? Number(((100 * e.wins) / e.matches).toFixed(1)) : null,
  fights: e.fights,
  fightWr: e.fights ? Number(((100 * e.fw) / e.fights).toFixed(1)) : null,
  // ส่วนต่างจากค่ากลางของเลนที่ตัวนั้นเล่น — บวกคือเก่งกว่าคนอื่นในเลนเดียวกัน
  laneRel: e.fights ? Number((e.relSum / e.fights).toFixed(1)) : null,
  // ค่าคลาดเคลื่อนคิดจากจำนวนไฟต์ ไม่ใช่จำนวนแมตช์ เพราะไฟต์เป็นหน่วยที่วัด
  margin: e.fights ? Number((196 * Math.sqrt(0.25 / e.fights)).toFixed(1)) : null,
  lanes: e.lanes,
})).sort((x, y) => y.fights - x.fights);

const data = {
  source: "เล่นผ่านหน้าจอจริงด้วย _play.mjs (ผู้เล่นใช้ปุ่มช่วยซื้อของและนิสัยเลน)",
  matches: a.matches,
  wins, draws, losses: a.matches - wins - draws,
  playerWr: Number(a.wr.toFixed(1)),
  playerMargin: Number((a.margin || 0).toFixed(1)),
  roundsPerMatch: Number((rows.reduce((s, r) => s + r.rounds, 0) / a.matches).toFixed(1)),
  laneMid: Object.fromEntries(Object.entries(laneMid).map(([k, v]) => [k, v == null ? null : Number(v.toFixed(1))])),
  champs,
};

fs.writeFileSync(OUT, JSON.stringify(data, null, 1));
console.log("เขียน " + OUT + " แล้ว — " + a.matches + " แมตช์ · ผู้เล่นชนะ " + data.playerWr + "% ±" + data.playerMargin);
console.log("ค่ากลางชนะไฟต์ต่อเลน: " +
  Object.entries(data.laneMid).map(([k, v]) => k + " " + v + "%").join(" · "));
