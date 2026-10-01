// ---------------------------------------------------------------
// สมุดบันทึกแมตช์ — ตรวจว่าเก็บถูก รวมถูก และไม่พังเวลาไม่มีที่เก็บ
// รันใน Node ได้เพราะ matchlog.js ไม่แตะ React และรับ store เข้ามาได้
// ---------------------------------------------------------------
import {
  aggregate, appendMatch, buildRecord, clearLog, exportText, importText, readLog, writeLog,
} from "./src/game/matchlog.js";

const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);

// localStorage ปลอม — เก็บในหน่วยความจำ พฤติกรรมเหมือนของจริง
function fakeStore() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _size: () => (m.get("sideline.matchlog") || "").length,
  };
}

// ประวัติไฟต์ปลอมสองยก — ชนะ TOP แพ้ MID
const history = [
  { round: 2, eventId: "MID", iWon: false, rows: [
    { team: "blue", lane: "MID", champId: "LAURA", kills: 1, assists: 0, alive: false, dealt: 900, taken: 1400 },
    { team: "red", lane: "MID", champId: "ARIEL", kills: 3, assists: 0, alive: true, dealt: 1500, taken: 800 },
  ] },
  { round: 1, eventId: "TOP", iWon: true, rows: [
    { team: "blue", lane: "TOP", champId: "KAZEM", kills: 2, assists: 1, alive: true, dealt: 1200, taken: 600 },
    { team: "red", lane: "TOP", champId: "LUCH", kills: 0, assists: 0, alive: false, dealt: 500, taken: 1200 },
  ] },
];

const roster = (ids) => ids.map(([lane, champ, level, items]) => ({
  lane, champId: champ, level, items: items.map((id) => ({ id, cost: 10 })),
}));

const mk = (won) => buildRecord({
  patch: "0.5", mode: "LONG", pvp: true, diff: null, draftStyle: "BLIND", teamStyle: "POKE",
  rounds: 2, score: won ? { me: 2, foe: 1 } : { me: 1, foe: 2 },
  me: roster([["TOP", "KAZEM", 14, ["sg", "bt2"]], ["MID", "LAURA", 13, ["wt", "sg"]]]),
  foe: roster([["TOP", "LUCH", 13, ["sg"]], ["MID", "ARIEL", 14, ["wt"]]]),
  history, mySide: "blue", endedBy: "wins",
});

// ---- เก็บฟิลด์ครบและถูกชนิด
{
  const r = mk(true);
  t("บันทึกรู้ว่าชนะ", r.won === true, "score " + r.score.join("-"));
  t("เก็บไอเทมเป็น id ไม่ใช่ออบเจกต์", r.me[0].items.join(",") === "sg,bt2", JSON.stringify(r.me[0].items));
  t("เก็บตัวละครกับเลนคู่กัน", r.me[0].champ === "KAZEM" && r.me[0].lane === "TOP", r.me[0].champ + "/" + r.me[0].lane);
  t("แมตช์เจอคนจริงไม่เก็บระดับบอท", r.pvp === true && r.diff === null, "pvp=" + r.pvp + " diff=" + r.diff);
  t("ติดเลขแพตช์ไว้ทุกแถว", r.patch === "0.5", String(r.patch));
  t("นับชนะเลนจากประวัติไฟต์", r.lanes.TOP.w === 1 && r.lanes.MID.l === 1, JSON.stringify(r.lanes));
  t("ผลงานรายตัวนับเฉพาะฝั่งเรา", !r.champs.ARIEL && !!r.champs.KAZEM, Object.keys(r.champs).join(","));
  t("นับตายจากที่ไม่รอดตอนจบไฟต์", r.champs.LAURA.d === 1 && r.champs.KAZEM.d === 0,
    "LAURA ตาย " + r.champs.LAURA.d + " · KAZEM ตาย " + r.champs.KAZEM.d);
}

// ---- ระดับบอทต้องเก็บเฉพาะ PvE
{
  const r = buildRecord({ patch: "0.5", mode: "LONG", pvp: false, diff: "HARD",
    score: { me: 2, foe: 0 }, me: [], foe: [], history: [], mySide: "blue" });
  t("แมตช์เจอบอทเก็บระดับความยาก", r.diff === "HARD", String(r.diff));
}

// ---- เขียนอ่านผ่าน store
{
  const s = fakeStore();
  t("สมุดเปล่าอ่านได้ ไม่ล้ม", readLog(s).length === 0);
  appendMatch(mk(true), s);
  appendMatch(mk(false), s);
  t("ต่อท้ายแล้วอ่านกลับได้ครบ", readLog(s).length === 2, readLog(s).length + " แถว");
  clearLog(s);
  t("ล้างสมุดแล้วว่างจริง", readLog(s).length === 0);
}

// ---- ไม่มีที่เก็บก็ต้องไม่ล้ม
{
  const dead = { getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("full"); }, removeItem: () => { throw new Error("no"); } };
  let threw = false;
  try { readLog(dead); writeLog([mk(true)], dead); clearLog(dead); } catch { threw = true; }
  t("ที่เก็บพังแล้วไม่โยน error ออกมา", !threw);
  t("เขียนไม่สำเร็จคืนค่า false ตรงๆ", writeLog([mk(true)], dead) === false);
}

// ---- สรุปผล
{
  const rows = [mk(true), mk(true), mk(false)];
  const a = aggregate(rows);
  t("นับจำนวนแมตช์ถูก", a.matches === 3, a.matches + " แมตช์");
  const kazem = a.champs.find((c) => c.champ === "KAZEM");
  t("อัตราชนะรายตัวคิดถูก", Math.abs(kazem.wr - 66.7) < 0.2, kazem.wr.toFixed(1) + "%");
  t("แยกตัวละครตามเลน", a.champs.every((c) => c.lane), a.champs.map((c) => c.champ + "/" + c.lane).join(" "));
  const sg = a.items.find((i) => i.id === "sg");
  t("ไอเทมที่ใส่สองช่องในแมตช์เดียวนับสองครั้ง", sg.n === 6, "sg โผล่ " + sg.n + " ครั้งใน 3 แมตช์");
  t("บอกค่าคลาดเคลื่อนมาด้วย", a.margin > 0, "±" + a.margin.toFixed(1));
  t("บอกว่าข้อมูลมาจากแพตช์ไหนบ้าง", a.patches.join(",") === "0.5", a.patches.join(","));
}

// ---- อัตราชนะไฟต์เลน ต้องแยกตัวละครออกจากผลของทีมได้
// สองตัวนี้อยู่ทีมเดียวกันทุกแมตช์ wr ของแมตช์จึงเท่ากันเป๊ะเสมอ
// ถ้าตัวเลขที่เอาไปปรับบาลานซ์แยกสองตัวนี้ไม่ออก ก็ใช้ไม่ได้
{
  const rows = [mk(true), mk(true), mk(false)];
  const a = aggregate(rows);
  const kazem = a.champs.find((c) => c.champ === "KAZEM");
  const laura = a.champs.find((c) => c.champ === "LAURA");
  t("อัตราชนะแมตช์ของสองตัวในทีมเดียวกันเท่ากันเสมอ", kazem.wr === laura.wr,
    "ทั้งคู่ " + kazem.wr.toFixed(1) + "% — นี่คือข้อจำกัดที่ fightWr ต้องแก้");
  t("อัตราชนะไฟต์เลนแยกสองตัวออกจากกันได้", kazem.fightWr === 100 && laura.fightWr === 0,
    "KAZEM ชนะเลน " + kazem.fightWr + "% · LAURA " + laura.fightWr + "%");
  t("นับจำนวนไฟต์ที่ลงจริง", kazem.fights === 3 && laura.fights === 3,
    "KAZEM " + kazem.fights + " ไฟต์ · LAURA " + laura.fights);
  t("คิด KDA จากฆ่า ช่วย และตาย", Math.abs(kazem.kda - 9) < 0.01,
    "KAZEM " + kazem.k + "/" + kazem.d + "/" + kazem.a + " = KDA " + kazem.kda.toFixed(2));
  t("ตัวที่ตายทุกไฟต์ KDA ต่ำกว่าตัวที่ไม่ตายเลย", laura.kda < kazem.kda,
    "LAURA " + laura.kda.toFixed(2) + " vs KAZEM " + kazem.kda.toFixed(2));
}

// ---- กรองตามแพตช์และตามชนิดแมตช์
{
  const pve = buildRecord({ patch: "0.4", mode: "LONG", pvp: false, diff: "NORMAL",
    score: { me: 2, foe: 0 }, me: [], foe: [], history: [], mySide: "blue" });
  const rows = [mk(true), pve];
  t("กรองเอาเฉพาะแมตช์เจอคนจริง", aggregate(rows, { pvpOnly: true }).matches === 1);
  t("กรองเอาเฉพาะแพตช์เดียว", aggregate(rows, { patch: "0.4" }).matches === 1);
  t("ข้อมูลคนละแพตช์ไม่ถูกเอามารวมกันเงียบๆ", aggregate(rows).patches.length === 2,
    aggregate(rows).patches.join(" + "));
}

// ---- ส่งออกแล้วนำกลับเข้ามา
{
  const rows = [mk(true), mk(false)];
  const text = exportText(rows);
  const back = importText(text, []);
  t("นำไฟล์ที่ส่งออกกลับเข้ามาได้", back.ok && back.rows.length === 2, back.ok ? back.added + " แถว" : back.why);
  const again = importText(text, rows);
  t("นำเข้าซ้ำไม่ได้แถวซ้ำ", again.ok && again.added === 0 && again.skipped === 2,
    "เพิ่ม " + again.added + " ข้าม " + again.skipped);
  t("ไฟล์มั่วไม่ทำให้ล้ม", importText("{oops", []).ok === false, importText("{oops", []).why);
  t("JSON ถูกแต่ไม่ใช่สมุดก็ปฏิเสธ", importText('{"a":1}', []).ok === false, importText('{"a":1}', []).why);
}

// ---- เพดานจำนวนแถว
{
  const s = fakeStore();
  const many = Array.from({ length: 2100 }, () => mk(true));
  writeLog(many, s);
  t("สมุดไม่โตเกินเพดาน 2000 แถว", readLog(s).length === 2000, readLog(s).length + " แถว");
  t("ขนาดที่เก็บยังต่ำกว่า 5MB", s._size() < 5e6, (s._size() / 1e6).toFixed(2) + " MB");
}

let bad = 0;
for (const [n, ok, d] of out) {
  if (!ok) bad++;
  console.log((ok ? " ok  " : " FAIL") + " " + n.padEnd(48) + " " + d);
}
console.log("\nไม่ผ่าน " + bad + " / " + out.length);
if (bad) process.exit(1);
