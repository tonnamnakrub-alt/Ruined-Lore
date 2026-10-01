// ---------------------------------------------------------------
// สมุดบันทึกแมตช์ — เก็บว่าคนจริงเล่นอะไร เลนไหน ออกของอะไร แล้วชนะหรือแพ้
//
// ที่ต้องมีเพราะตัวเลขบาลานซ์ทุกตัวที่ใช้อยู่ตอนนี้มาจากบอทตีกันเองล้วน
// ซึ่งตอบได้แค่ "กลไกนี้แรงแค่ไหนถ้าเล่นแบบบอท" ไม่ได้ตอบว่าคนเล่นจริงเจออะไร
// บอทซื้อของตามสคริปต์ตายตัว (shop-ai.js ยัดรองเท้าชิ้นที่สองให้ทุกคนเสมอ)
// เลือกนิสัยเลนด้วยกฎไม่กี่ข้อ และไม่เคยเล่นผิดพลาดแบบคน
//
// เก็บลง localStorage เพราะเกมเป็นไฟล์เดียวไม่มีเซิร์ฟเวอร์
// ผู้เล่นส่งออกเป็นไฟล์ JSON มาให้เองได้ แล้วค่อยเอามารวมกันวิเคราะห์
//
// รูปแบบบันทึกมีเลขรุ่น (v) เพราะพอเพิ่มฟิลด์ทีหลังจะได้รู้ว่าแถวเก่าไม่มีอะไร
// และทุกแถวติดเลขแพตช์ไว้ ข้อมูลก่อนกับหลังปรับบาลานซ์จะได้ไม่ปนกัน
// ---------------------------------------------------------------

export const LOG_KEY = "sideline.matchlog";
export const LOG_VERSION = 1;

// กันไม่ให้สมุดโตจนเกิน quota ของ localStorage (ราว 5MB)
// แถวหนึ่งราว 700 ไบต์ 2000 แถวจึงราว 1.4MB ยังเหลือที่ให้ของอื่น
const MAX_ROWS = 2000;

// ---------------------------------------------------------------
// อ่าน / เขียน
// ---------------------------------------------------------------

// localStorage พังได้หลายแบบ — โหมดส่วนตัว เต็ม หรือถูกปิด
// ทุกทางเรียกต้องรับได้ว่าไม่มีที่เก็บ ไม่ใช่ทำให้เกมล้ม
export function readLog(store) {
  const ls = store || safeStore();
  if (!ls) return [];
  try {
    const raw = ls.getItem(LOG_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function writeLog(rows, store) {
  const ls = store || safeStore();
  if (!ls) return false;
  try {
    ls.setItem(LOG_KEY, JSON.stringify(rows.slice(-MAX_ROWS)));
    return true;
  } catch { return false; }
}

export function clearLog(store) {
  const ls = store || safeStore();
  if (!ls) return false;
  try { ls.removeItem(LOG_KEY); return true; } catch { return false; }
}

function safeStore() {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
}

// ---------------------------------------------------------------
// สร้างแถวบันทึกจากสภาพตอนจบแมตช์
// ---------------------------------------------------------------

// roster ของ App เก็บ items เป็นออบเจกต์ไอเทมเต็มก้อน ไม่ใช่ id
// (เคยพลาดมาแล้วตอนวัดรองเท้า) เก็บเฉพาะ id พอ ที่เหลือเปิดจาก items.js ได้
const itemIds = (c) => (c.items || []).map((i) => (typeof i === "string" ? i : i.id)).filter(Boolean);

const side = (roster) => (roster || []).map((c) => ({
  lane: c.lane,
  champ: c.champId,
  level: c.level,
  items: itemIds(c),
}));

// ชนะเลนไหนกี่ยก — ไล่จาก history ที่เก็บไฟต์ไว้ทุกไฟต์ของแมตช์
function laneTally(history) {
  const out = {};
  for (const h of history || []) {
    const L = h.eventId;
    if (!L) continue;
    if (!out[L]) out[L] = { w: 0, l: 0 };
    if (h.iWon) out[L].w++; else out[L].l++;
  }
  return out;
}

// ผลงานรายตัวตลอดแมตช์ — เก็บฆ่า/ตาย/ดาเมจรวม เพื่อแยกว่า
// "ตัวนี้ชนะเพราะตัวมันเอง" หรือ "ชนะเพราะเพื่อนร่วมทีม"
function perChamp(history, mySide) {
  const out = {};
  for (const h of history || []) {
    for (const r of h.rows || []) {
      if (r.team !== mySide) continue;
      const k = r.champId;
      if (!out[k]) out[k] = { lane: r.lane, k: 0, d: 0, a: 0, dmg: 0, taken: 0, fights: 0, won: 0 };
      const e = out[k];
      e.k += r.kills || 0;
      e.a += r.assists || 0;
      if (!r.alive) e.d++;
      e.dmg += r.dealt || 0;
      e.taken += r.taken || 0;
      e.fights++;
      if (h.iWon) e.won++;
    }
  }
  return out;
}

/**
 * สร้างแถวบันทึกหนึ่งแมตช์ — ฟังก์ชันบริสุทธิ์ ทดสอบใน Node ได้
 * ไม่แตะ localStorage เอง ให้ appendMatch เป็นคนเขียน
 */
export function buildRecord({
  patch, mode, pvp, diff, draftStyle, teamStyle,
  rounds, score, me, foe, history, mySide, endedBy, seed,
}) {
  const won = score.me > score.foe;
  return {
    v: LOG_VERSION,
    at: Date.now(),
    patch: patch || null,
    mode: mode || null,
    // แยกให้ชัดว่าแถวนี้มาจากคนจริงหรือจากบอท ไม่งั้นเอามารวมกันแล้วอ่านไม่ออก
    pvp: !!pvp,
    diff: pvp ? null : (diff || null),
    draft: draftStyle || null,
    style: teamStyle || null,
    rounds: rounds || 0,
    score: [score.me, score.foe],
    won,
    // ชนะยังไง — ถึงเป้าก่อน หรือหมดยกแล้วแต้มนำ
    endedBy: endedBy || null,
    me: side(me),
    foe: side(foe),
    lanes: laneTally(history),
    champs: perChamp(history, mySide || "blue"),
  };
}

export function appendMatch(rec, store) {
  const rows = readLog(store);
  rows.push(rec);
  return writeLog(rows, store);
}

// ---------------------------------------------------------------
// สรุปผล — ตัวเลขที่เอาไปปรับบาลานซ์ได้จริง
// ---------------------------------------------------------------

/**
 * รวมสถิติจากสมุด
 * opts.pvpOnly = เอาเฉพาะแมตช์ที่เจอคนจริง
 * opts.patch   = เอาเฉพาะแพตช์นี้ (ข้อมูลคนละแพตช์เอามารวมกันไม่ได้)
 */
export function aggregate(rows, opts) {
  const o = opts || {};
  const use = (rows || []).filter((r) =>
    (!o.pvpOnly || r.pvp) && (!o.patch || r.patch === o.patch));

  const champs = {};          // ตัวละคร x เลน
  const items = {};           // ไอเทม
  let wins = 0;

  // อัตราชนะ "แมตช์" รายตัวปนกันโดยธรรมชาติ — ตัวละครทั้งห้าในทีมได้ผลก้อนเดียวกัน
  // ตัวที่ไม่ได้ทำอะไรเลยก็ได้เครดิตชนะเท่ากับตัวที่ชนะเลนให้ทีม
  // อัตราชนะ "ไฟต์เลนของตัวเอง" จึงเป็นสัญญาณที่แยกตัวละครออกจากทีมได้จริง

  for (const r of use) {
    if (r.won) wins++;
    for (const c of r.me || []) {
      const key = c.champ + "|" + c.lane;
      if (!champs[key]) champs[key] = { champ: c.champ, lane: c.lane, n: 0, w: 0, lvl: 0, fights: 0, fw: 0, k: 0, d: 0, a: 0 };
      const e = champs[key];
      e.n++;
      if (r.won) e.w++;
      e.lvl += c.level || 0;
      const cf = (r.champs || {})[c.champ];
      if (cf) { e.fights += cf.fights || 0; e.fw += cf.won || 0; e.k += cf.k || 0; e.d += cf.d || 0; e.a += cf.a || 0; }
      for (const id of c.items || []) {
        if (!items[id]) items[id] = { id, n: 0, w: 0 };
        items[id].n++;
        if (r.won) items[id].w++;
      }
    }
  }

  const champRows = Object.values(champs).map((e) => ({
    ...e,
    wr: e.n ? (100 * e.w) / e.n : 0,
    // อัตราชนะไฟต์เลนของตัวเอง — ตัวเลขที่เอาไปปรับบาลานซ์ได้ตรงกว่า wr ของแมตช์
    fightWr: e.fights ? (100 * e.fw) / e.fights : null,
    kda: e.d ? (e.k + e.a) / e.d : (e.k + e.a) || 0,
    avgLvl: e.n ? e.lvl / e.n : 0,
  })).sort((a, b) => b.n - a.n);

  const itemRows = Object.values(items).map((e) => ({
    ...e, wr: e.n ? (100 * e.w) / e.n : 0,
  })).sort((a, b) => b.n - a.n);

  return {
    matches: use.length,
    wins,
    wr: use.length ? (100 * wins) / use.length : 0,
    champs: champRows,
    items: itemRows,
    // ยิ่งน้อยแถวยิ่งเชื่อไม่ได้ — บอกไปตรงๆ ว่าต้องเก็บอีกเท่าไหร่ถึงจะอ่านออก
    margin: use.length ? 196 * Math.sqrt(0.25 / use.length) : null,
    patches: [...new Set(use.map((r) => r.patch).filter(Boolean))],
  };
}

// ส่งออกเป็นข้อความ JSON ให้ผู้เล่นดาวน์โหลดหรือก๊อปส่งมาได้
export function exportText(rows) {
  return JSON.stringify({ kind: "sideline.matchlog", v: LOG_VERSION, rows: rows || [] }, null, 1);
}

// รับไฟล์ที่ส่งออกไปแล้วกลับเข้ามา — ใช้ตอนรวมสมุดจากหลายเครื่อง
// แถวซ้ำตัดออกด้วยเวลาจบแมตช์บวกแต้ม ซึ่งชนกันเองได้ยากมาก
export function importText(text, existing) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { return { ok: false, why: "อ่าน JSON ไม่ออก" }; }
  const incoming = parsed && Array.isArray(parsed.rows) ? parsed.rows
    : Array.isArray(parsed) ? parsed : null;
  if (!incoming) return { ok: false, why: "ไม่ใช่ไฟล์สมุดบันทึกแมตช์" };
  const have = new Set((existing || []).map((r) => r.at + ":" + (r.score || []).join("-")));
  const add = incoming.filter((r) => r && r.at && !have.has(r.at + ":" + (r.score || []).join("-")));
  return { ok: true, rows: (existing || []).concat(add), added: add.length, skipped: incoming.length - add.length };
}
