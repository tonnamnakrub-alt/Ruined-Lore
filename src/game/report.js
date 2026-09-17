// สรุปผลไฟต์หนึ่งยก ให้หน้ากราฟใช้ — เก็บเฉพาะตัวเลข ไม่เก็บ state ทั้งก้อน
import { CHAMPIONS } from "../data/champions.js";
import { EVENTS } from "../data/tuning.js";

const cleanBag = (bag) =>
  Object.entries(bag || {})
    .filter(([, v]) => v >= 1)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ k, v: Math.round(v) }));

export function summarizeFight(st, round, eventId, teamStyle, foeSeen) {
  const row = (u) => ({
    id: u.id,
    team: u.team,
    lane: u.lane,
    champId: u.champ.id,
    champTh: (CHAMPIONS[u.champ.id] || {}).th || "",
    level: u.level,
    alive: u.alive,
    hp: Math.max(0, Math.round(u.hp)),
    maxHp: Math.round(u.maxHp),
    kills: u.kills,
    assists: u.assists,
    dealt: Math.round(u.damageDealt),
    taken: Math.round(Object.values(u.takenBy || {}).reduce((a, b) => a + b, 0)),
    healGiven: Math.round(u.healGiven || 0),
    healTaken: Math.round(u.healTaken || 0),
    shieldGiven: Math.round(u.shieldGiven || 0),
    shieldAbsorbed: Math.round(u.shieldAbsorbed || 0),
    shots: u.shots,
    hits: u.hits,
    dodged: u.dodged || 0,
    items: (u.items || []).map((i) => i.id),
    dealtBy: cleanBag(u.dealtBy),
    takenBy: cleanBag(u.takenBy),
    healedBy: cleanBag(u.healedBy),
  });

  return {
    round,
    eventTh: (EVENTS[eventId] || {}).th || eventId,
    eventId,
    teamStyle,
    time: +st.t.toFixed(1),
    timeLimit: st.timeLimit,
    winner: st.winner,
    iWon: st.winner === "blue",
    timeline: st.timeline.slice(),
    rows: st.units.map(row),
    foeSeen: foeSeen || null,
  };
}

// ใช้ตอนกำลังสู้อยู่ — สร้าง report สดจาก state ปัจจุบัน
export function liveReport(st, round, eventId, teamStyle) {
  if (!st) return null;
  return { ...summarizeFight(st, round, eventId, teamStyle, null), live: true };
}
