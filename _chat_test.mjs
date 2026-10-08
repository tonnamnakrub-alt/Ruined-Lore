// ---------------------------------------------------------------
// ระบบแชทในไฟต์ และบีเอ็มตอนจบยก
//   node _chat_test.mjs
// ---------------------------------------------------------------
import { BM_LOSE, BM_WIN, CALLOUTS, CHAT_COOLDOWN } from "./src/data/chat-lines.js";
import { pickLine, roundBm } from "./src/engine/chat.js";
import { CHAMPIONS } from "./src/data/champions.js";
import { STAT_KEYS } from "./src/data/constants.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { buildFight } from "./src/engine/build-fight.js";
import { autoRanks } from "./src/engine/skill-ranks.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";
import { setLang } from "./src/i18n.js";

setLang("th");
const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);
const flat = (v) => Object.fromEntries(STAT_KEYS.map((k) => [k, v]));
const mk = (lane, id, level) => ({ lane, champId: id, level, xp: 0, gold: 0, items: [],
  ranks: autoRanks(level, CHAMPIONS[id].skillPriority, null), athlete: flat(5), upgrades: [],
  bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null, char: "P", athleteName: "P", style: "POKE" });

const run = (seed = 7) => {
  const st = buildFight(
    [mk("TOP", "KOSCHEI", 14), mk("MID", "IFRIT", 14)].map(toDef),
    [mk("TOP", "KAZEM", 14), mk("MID", "LAURA", 14)].map(toDef), seed, DEFAULT_FIGHT);
  let n = 0;
  while (!st.over && n < 60 * 60) { step(st); n++; }
  return st;
};

const st = run();
const chat = st.chat || [];
t("ไฟต์หนึ่งมีแชทเกิดขึ้นจริง", chat.length > 0, chat.length + " บรรทัด");
t("มีทั้งฝั่งเราและฝั่งศัตรูพิมพ์", new Set(chat.map((c) => c.team)).size === 2,
  [...new Set(chat.map((c) => c.team))].join(" "));

const kinds = new Set(chat.map((c) => c.kind));
t("มีบอกว่าอัลติพร้อม", kinds.has("ultReady"), [...kinds].join(" "));
t("มีขอฮีลตอนเลือดน้อย", kinds.has("needHeal"), [...kinds].join(" "));
t("มีพิมพ์ตอนตาย", kinds.has("died"), [...kinds].join(" "));

// ทุกบรรทัดต้องมาจากกองที่ประกาศไว้ ไม่ใช่ข้อความลอยๆ
{
  const all = new Set(Object.values(CALLOUTS).flat());
  const bad = chat.filter((c) => !all.has(c.text));
  t("ทุกบรรทัดมาจากกองบทพูดที่ประกาศไว้", bad.length === 0,
    bad.length ? bad[0].text : chat.length + " บรรทัดถูกต้องหมด");
}

// คนเดียวกันต้องไม่พิมพ์ถี่กว่าคูลดาวน์
{
  const byUnit = {};
  let tooFast = 0;
  for (const c of chat) {
    const k = c.team + "/" + c.lane;
    // ตอนตายพิมพ์ได้ทันทีโดยไม่รอคูลดาวน์ ตามที่ออกแบบไว้
    if (byUnit[k] != null && c.kind !== "died" && c.t - byUnit[k] < CHAT_COOLDOWN - 0.05) tooFast++;
    byUnit[k] = c.t;
  }
  t("คนเดิมไม่พิมพ์ถี่กว่าคูลดาวน์", tooFast === 0, tooFast + " บรรทัดที่เร็วเกิน");
}

// ต้องออกมาเหมือนเดิมทุกครั้ง ไม่งั้นออนไลน์สองเครื่องเห็นไม่ตรงกัน
{
  const a = run(11).chat.map((c) => c.t.toFixed(2) + c.lane + c.text).join("|");
  const b = run(11).chat.map((c) => c.t.toFixed(2) + c.lane + c.text).join("|");
  t("ไฟต์เดิมได้แชทชุดเดิมเป๊ะ (ออนไลน์เห็นตรงกัน)", a === b && a.length > 0,
    a === b ? "ตรงกัน " + run(11).chat.length + " บรรทัด" : "ไม่ตรงกัน");
}

// บีเอ็ม
{
  const seen = new Set();
  for (let r = 1; r <= 12; r++) seen.add(pickLine(BM_WIN.stomp, "bm|" + r + "|w|3|0"));
  t("บีเอ็มตอนชนะขาดสลับหลายแบบ", seen.size > 1, [...seen].join(" / "));
  const once = pickLine(BM_LOSE, "bm|4|l|3|2");
  t("บีเอ็มเลือกด้วยการแฮช ไม่เปลี่ยนเมื่อวาดซ้ำ",
    once === pickLine(BM_LOSE, "bm|4|l|3|2"), once);
  t("บทบีเอ็มทุกบรรทัดมาจากกองที่ประกาศไว้",
    BM_WIN.stomp.includes("EZ") && BM_LOSE.includes("gg"),
    "stomp " + BM_WIN.stomp.length + " · lose " + BM_LOSE.length + " บรรทัด");
}

// ---- บีเอ็ม: ฝ่ายที่ชนะยกเป็นคนด่า ไม่ว่าจะเป็นผู้เล่นหรือบอท
{
  const ROSTER_ME = [{ lane: "TOP", champId: "KOSCHEI" }, { lane: "MID", champId: "IFRIT" },
    { lane: "ADC", champId: "PETER" }, { lane: "SUPPORT", champId: "PINO" }];
  const ROSTER_FOE = [{ lane: "TOP", champId: "KAZEM" }, { lane: "MID", champId: "LAURA" },
    { lane: "ADC", champId: "HOOD" }, { lane: "SUPPORT", champId: "ALICE" }];
  const won3 = [{ lane: "TOP", fought: true, iWon: true }, { lane: "MID", fought: true, iWon: true }, { lane: "BOT", fought: true, iWon: true }];
  const lost3 = [{ lane: "TOP", fought: true, iWon: false }, { lane: "MID", fought: true, iWon: false }, { lane: "BOT", fought: true, iWon: false }];
  const winPool = new Set([...BM_WIN.stomp, ...BM_WIN.clean, ...BM_WIN.close]);

  // ผู้เล่นชนะขาด — ทีมเราด่า คู่แข่งตอบ
  const a = roundBm(true, won3, 3, ROSTER_ME, ROSTER_FOE);
  t("ผู้เล่นชนะ ทีมเราเป็นคนด่า",
    !!a && a.winner.mine === true && winPool.has(a.winner.text),
    a ? "ทีมคุณ: " + a.winner.text : "ไม่มี");
  t("ผู้เล่นชนะ คู่แข่งได้บทของฝ่ายแพ้",
    !!a && a.loser.mine === false && BM_LOSE.includes(a.loser.text),
    a ? "คู่แข่ง: " + a.loser.text : "ไม่มี");

  // ผู้เล่นแพ้ขาด — บอทต้องเป็นคนด่า (บั๊กเดิม: บอทได้บทของฝ่ายแพ้)
  const b = roundBm(false, lost3, 3, ROSTER_ME, ROSTER_FOE);
  t("ผู้เล่นแพ้ บอทเป็นคนด่า ไม่ใช่พิมพ์บทฝ่ายแพ้",
    !!b && b.winner.mine === false && winPool.has(b.winner.text),
    b ? "คู่แข่ง: " + b.winner.text : "ไม่มี");
  t("ผู้เล่นแพ้ ทีมเราได้บทของฝ่ายแพ้",
    !!b && b.loser.mine === true && BM_LOSE.includes(b.loser.text),
    b ? "ทีมคุณ: " + b.loser.text : "ไม่มี");

  // ชนะขาดต้องได้บทกวนกว่าชนะหวิว
  const stomp = roundBm(true, won3, 5, ROSTER_ME, ROSTER_FOE);
  const close = roundBm(true, [{ lane: "TOP", fought: true, iWon: true }, { lane: "MID", fought: true, iWon: false }], 5, ROSTER_ME, ROSTER_FOE);
  t("ชนะขาดได้บทกวน ชนะหวิวได้บทให้เกียรติ",
    BM_WIN.stomp.includes(stomp.winner.text) && BM_WIN.close.includes(close.winner.text),
    "ชนะขาด: " + stomp.winner.text + " · ชนะหวิว: " + close.winner.text);

  // ต้องรู้ว่า "ใคร" พิมพ์ ไม่ใช่เหมารวมเป็นทีม
  {
    const w = roundBm(true, won3, 7, ROSTER_ME, ROSTER_FOE);
    const l = roundBm(false, lost3, 7, ROSTER_ME, ROSTER_FOE);
    const mineIds = ROSTER_ME.map((c2) => c2.champId);
    const foeIds = ROSTER_FOE.map((c2) => c2.champId);
    t("บีเอ็มระบุตัวละครที่พิมพ์ ไม่ใช่ชื่อทีม",
      !!w.winner.champId && !!w.loser.champId,
      w.winner.champId + " / " + w.loser.champId);
    t("ผู้เล่นชนะ คนด่ามาจากทีมเรา คนตอบมาจากทีมศัตรู",
      mineIds.includes(w.winner.champId) && foeIds.includes(w.loser.champId),
      w.winner.champId + " ด่า · " + w.loser.champId + " ตอบ");
    t("ผู้เล่นแพ้ คนด่ามาจากทีมศัตรู คนตอบมาจากทีมเรา",
      foeIds.includes(l.winner.champId) && mineIds.includes(l.loser.champId),
      l.winner.champId + " ด่า · " + l.loser.champId + " ตอบ");
  }

  // ยกที่ไม่มีใครปะทะ ไม่มีใครพิมพ์
  t("ยกที่ไม่มีไฟต์ ไม่มีใครพิมพ์บีเอ็ม",
    roundBm(true, [{ lane: "TOP", fought: false, iWon: false }], 3, ROSTER_ME, ROSTER_FOE) === null, "ไม่มีบีเอ็ม");
}

let bad = 0;
for (const [n, ok, d] of out) {
  if (!ok) bad++;
  console.log((ok ? " ok  " : " FAIL") + " " + n.padEnd(52) + " " + d);
}
console.log("\nไม่ผ่าน " + bad + " / " + out.length);
if (bad) process.exit(1);
