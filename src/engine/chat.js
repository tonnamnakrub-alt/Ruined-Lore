// ---------------------------------------------------------------
// แชทของเพื่อนร่วมทีมระหว่างไฟต์
//
// เลือกบรรทัดด้วยการแฮชจากสิ่งที่คงที่ (ไอดีตัวละคร + หมวด + เวลาเป็นช่วง)
// ไม่ได้ใช้ state.rng() เลย ด้วยเหตุผลสองข้อ:
//   1) ถ้าดึงจากสายสุ่มเดียวกับไฟต์ ทุกบรรทัดที่พูดจะเลื่อนผลไฟต์ทั้งหมด
//      ไฟต์เดิมที่เคยวัดไว้จะเปลี่ยนผลทันทีเพราะมีคนพิมพ์แชทเพิ่มมาหนึ่งบรรทัด
//   2) ออนไลน์สองเครื่องต้องเห็นตรงกัน การแฮชจากค่าที่ทั้งสองเครื่องมีเท่ากัน
//      ให้ผลเหมือนกันเสมอ โดยไม่ต้องส่งอะไรข้ามเครื่องเพิ่ม
// ---------------------------------------------------------------
import { CALLOUTS, CHAT_COOLDOWN, CHAT_KEEP, CHAT_TEAM_GAP } from "../data/chat-lines.js";

// แฮชสตริงเป็นเลขบวก — ใช้เลือกบรรทัดจากกองให้คงที่
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

export function pickLine(pool, seedStr) {
  if (!pool || !pool.length) return "";
  return pool[hash(seedStr) % pool.length];
}

function say(state, u, kind, pool) {
  const chat = state.chat || (state.chat = []);
  // คนเดิมพูดถี่เกินไปก็น่ารำคาญ และทั้งทีมก็ไม่ควรพูดพร้อมกันเป็นพรืด
  if (u.chatNext != null && state.t < u.chatNext) return;
  if (state.chatTeamNext && state.t < state.chatTeamNext[u.team]) return;
  const text = pickLine(pool, u.id + "|" + kind + "|" + Math.floor(state.t / 3));
  if (!text) return;
  u.chatNext = state.t + CHAT_COOLDOWN;
  if (!state.chatTeamNext) state.chatTeamNext = {};
  state.chatTeamNext[u.team] = state.t + CHAT_TEAM_GAP;
  chat.push({
    t: state.t, team: u.team, lane: u.lane,
    champId: u.champ && u.champ.id, kind, text,
  });
  if (chat.length > CHAT_KEEP) chat.shift();
}

// ---------------------------------------------------------------
// เดินแชททุกทิก — ดูสถานะของแต่ละคนแล้วตัดสินว่ามีอะไรน่าบอกเพื่อนไหม
// เรียงตามความสำคัญ: เรื่องที่ต้องรีบบอกมาก่อน
// ---------------------------------------------------------------
export function chatTick(state, u) {
  // buildFight คืนอ็อบเจกต์ตรงๆ ไม่มีตัวแปรให้เรียกตอนสร้างเสร็จ
  // จึงเปิดบทแรกเองในทิกแรกที่ถูกเรียก ครั้งเดียวต่อไฟต์
  if (!state.chatOpened) { state.chatOpened = true; chatOpen(state); }
  if (!u.alive) return;
  const hpFrac = u.maxHp ? u.hp / u.maxHp : 1;

  // เลือดวิกฤต — ขอให้ถอย
  if (hpFrac < 0.22) { say(state, u, "backOff", CALLOUTS.backOff); return; }
  // เลือดน้อย — ขอฮีล
  if (hpFrac < 0.45) { say(state, u, "needHeal", CALLOUTS.needHeal); return; }

  // เพิ่งเก็บใครได้
  if ((u.kills || 0) > (u.chatKills || 0)) {
    u.chatKills = u.kills;
    say(state, u, "gotKill", CALLOUTS.gotKill);
    return;
  }

  // อัลติเพิ่งพร้อม — บอกครั้งเดียวต่อการพร้อมหนึ่งครั้ง
  const r = (u.skills || []).find((s) => s.key === "R");
  if (r && r.rank > 0) {
    const up = (r.cdLeft || 0) <= 0;
    if (up && !u.chatUltSaid) { u.chatUltSaid = true; say(state, u, "ultReady", CALLOUTS.ultReady); return; }
    if (!up) u.chatUltSaid = false;
  }
}

// คนตาย — เรียกจาก damage.js ตอนล้ม
export function chatDied(state, u) {
  if (!u) return;
  // คนที่เพิ่งตายพูดได้เลย ไม่ต้องรอคูลดาวน์ของตัวเอง
  u.chatNext = null;
  say(state, u, "died", CALLOUTS.died);
}

// เปิดไฟต์ / ศัตรูยกมา — เรียกตอนเริ่มไฟต์หนึ่งครั้ง
export function chatOpen(state) {
  const seen = {};
  for (const u of state.units) {
    if (!u.alive || seen[u.team]) continue;
    seen[u.team] = true;
    const foes = state.units.filter((x) => x.alive && x.team !== u.team).length;
    const mates = state.units.filter((x) => x.alive && x.team === u.team).length;
    say(state, u, foes > mates ? "enemyComing" : "goIn",
      foes > mates ? CALLOUTS.enemyComing : CALLOUTS.goIn);
  }
}
