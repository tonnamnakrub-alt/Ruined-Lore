// ---------------------------------------------------------------
// ตรวจสุขภาพของการดราฟต์ — บอทเลือกซ้ำแค่ไหน แบนจนเลนหายไหม ใครไม่เคยถูกเลือก
//
// ทำไมต้องมี: อัตราชนะที่วัดจาก "บอทดราฟต์" เอาไปปรับบาลานซ์ไม่ได้
// ตัวที่ถูกเลือกเกือบทุกเกมจะเข้าหา 50% เสมอ เพราะมันอยู่ทั้งฝั่งชนะและฝั่งแพ้
// ไฟล์นี้วัด "พฤติกรรมของบอท" อย่างเดียว ส่วนความแรงของตัวละครให้ดูจาก
// _gamewr.mjs ซึ่งดราฟต์แบบสุ่ม (draftFoe) ทั้งสองฝั่ง
//
//   node _draftaudit.mjs [จำนวนเกม] [DRAFT|TOURNEY]
// ---------------------------------------------------------------
import { CHAMPIONS } from "./src/data/champions.js";
import { botBan, botPickOne } from "./src/game/bot-draft.js";
import { PICK_ORDER, BAN_ORDER } from "./src/game/draft.js";
import { mulberry32 } from "./src/engine/util.js";
import { diffOf } from "./src/data/difficulty.js";
import { setLang } from "./src/i18n.js";

setLang("th");
const GAMES = Number(process.argv[2] || 100);
const STYLE = (process.argv[3] || "DRAFT").toUpperCase();
const D = diffOf("NORMAL");
const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

const pickCount = {};
const banCount = {};
const firstPick = {};
const teams = new Set();
let laneStarved = 0;
const starvedLanes = {};

for (let g = 0; g < GAMES; g++) {
  const rand = mulberry32(5000 + g);
  const taken = [];
  const bans = [];
  const nonce = 5000 + g;   // เลขประจำดราฟต์ ต่างกันทุกเกม
  if (STYLE === "TOURNEY") {
    for (let i = 0; i < BAN_ORDER.length; i++) {
      const id = botBan(rand, taken, undefined, nonce);
      if (!id) break;
      taken.push(id); bans.push(id);
      banCount[id] = (banCount[id] || 0) + 1;
    }
  }
  // ทั้งสองฝั่งเป็นบอท เพื่อดูพฤติกรรมของบอทล้วนๆ
  const side = { A: [], B: [] };
  for (let i = 0; i < PICK_ORDER.length; i++) {
    const sd = PICK_ORDER[i];
    const other = sd === "A" ? "B" : "A";
    const id = botPickOne(rand, taken, side[sd], D.variety, side[other], D.stanceSkill, nonce);
    if (!id) break;
    taken.push(id); side[sd].push(id);
    if (i === 0) firstPick[id] = (firstPick[id] || 0) + 1;
  }
  for (const id of [...side.A, ...side.B]) pickCount[id] = (pickCount[id] || 0) + 1;
  teams.add([...side.A].sort().join(","));
  teams.add([...side.B].sort().join(","));

  // เลนไหนเหลือตัวหลักไม่พอหลังแบน
  for (const L of LANES) {
    const left = Object.values(CHAMPIONS).filter((c) => c.lane === L && !bans.includes(c.id)).length;
    if (left < 2) { laneStarved++; starvedLanes[L] = (starvedLanes[L] || 0) + 1; }
  }
}

const all = Object.values(CHAMPIONS);
const pct = (n) => ((n / GAMES) * 100).toFixed(0) + "%";
const sorted = all.slice().sort((a, b) => (pickCount[b.id] || 0) - (pickCount[a.id] || 0));

console.log("ดราฟต์ " + GAMES + " เกม · โหมด " + STYLE + " · ตัวละคร " + all.length + " ตัว\n");

if (STYLE === "TOURNEY") {
  const bs = Object.entries(banCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log("ถูกแบนบ่อยสุด: " + bs.map(([k, v]) => k + " " + pct(v)).join(" · "));
  console.log("เลนที่เหลือตัวหลักน้อยกว่า 2 หลังแบน: "
    + (laneStarved ? JSON.stringify(starvedLanes) : "ไม่มีเลย") + "\n");
}

console.log("ถูกเลือกบ่อยสุด: " + sorted.slice(0, 6).map((c) => c.id + " " + pct(pickCount[c.id] || 0)).join(" · "));
const never = sorted.filter((c) => !pickCount[c.id]);
const rare = sorted.filter((c) => pickCount[c.id] && pickCount[c.id] / GAMES < 0.06);
console.log("ไม่เคยถูกเลือกเลย: " + (never.length ? never.map((c) => c.id).join(" ") : "ไม่มี")
  + "  (" + never.length + " ตัว)");
console.log("ถูกเลือกไม่ถึง 6%: " + rare.length + " ตัว");

const fp = Object.entries(firstPick).sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log("ตัวแรกที่ถูกเลือก: " + fp.map(([k, v]) => k + " " + pct(v)).join(" · "));
console.log("ทีมที่ไม่ซ้ำกัน: " + teams.size + " แบบ จาก " + (GAMES * 2) + " ทีม");

// สรุปสุขภาพ
const lock = sorted.filter((c) => (pickCount[c.id] || 0) / GAMES >= 0.9).length;
console.log("\nตัวที่ถูกเลือก 90% ขึ้นไป (แทบล็อกไว้): " + lock + " ตัว");
console.log(laneStarved ? "!! มีเลนที่โดนแบนจนไม่เหลือคนเล่น" : "ทุกเลนยังเหลือตัวหลักให้เล่น");
