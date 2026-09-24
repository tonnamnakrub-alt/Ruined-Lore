// ---------------------------------------------------------------
// ไฟต์ของเลนเดียวในยกหนึ่ง — สร้างสนาม แล้วเก็บผลที่ต้องใช้ตอนปิดยก
//
// แยกออกมาจาก App เพื่อให้สองเครื่องในโหมดออนไลน์ใช้โค้ดชุดเดียวกันเป๊ะ
// และให้เทสจำลอง "ทั้งยก" จากมุมของทั้งสองเครื่องได้โดยไม่ต้องเปิดเบราว์เซอร์
// ---------------------------------------------------------------
import { SAFE_STAND_SECONDS, STANCE_LANES } from "../data/behaviour.js";
import { DEFAULT_FIGHT } from "../data/tuning.js";
import { buildFight } from "../engine/build-fight.js";
import { toDef } from "./roster.js";

// seed ของแต่ละเลนต่างกัน แต่คิดจาก seed เดียวของยก ทั้งสองเครื่องจึงได้ไฟต์เดียวกัน
export const laneSeed = (plan, L) => plan.seed + STANCE_LANES.indexOf(L) * 7919;

// mySide = สีของ "เรา" ในเอนจิน · ออนไลน์เจ้าบ้านเป็นน้ำเงิน ผู้เข้าร่วมเป็นแดง
// ในแผนของยก "blue" หมายถึงฝั่งเราเสมอ ไม่ว่าเราจะเป็นสีไหนในเอนจิน
export function buildLaneFight({ plan, lane: L, team, foe, teamStyle, mySide }) {
  const l = plan && plan.lanes[L];
  if (!l || !l.fight) return null;
  // เลนที่ยืนรับแกงค์แบบเซฟได้นาฬิกาสั้น — ยื้อให้พ้นเวลาก็พอ ไม่ต้องชนะ
  const ev = l.safeStand ? { ...DEFAULT_FIGHT, fixedDuration: SAFE_STAND_SECONDS } : DEFAULT_FIGHT;
  const side = (roster, keys, tag) => keys
    .map((k) => roster.find((x) => x.lane === k))
    .filter(Boolean)
    .map((c) => ({
      def: toDef({ ...c, style: tag === "blue" && teamStyle ? teamStyle : c.style }),
      hurt: l.hurt[tag + ":" + c.lane] || 0,
    }));
  const mine = side(team, l.blue, "blue");
  const theirs = side(foe, l.red, "red");
  if (!mine.length || !theirs.length) return null;
  // ออนไลน์: ผู้เข้าร่วมเป็นฝั่งแดงของเอนจิน ต้องเรียงน้ำเงินก่อนเสมอ ผลจึงตรงกันสองเครื่อง
  const amBlue = mySide !== "red";
  const myTeam = amBlue ? "blue" : "red";
  const seed = laneSeed(plan, L);
  const st = amBlue
    ? buildFight(mine.map((b) => b.def), theirs.map((r) => r.def), seed, ev)
    : buildFight(theirs.map((r) => r.def), mine.map((b) => b.def), seed, ev);
  // เสียเลือดก่อนเริ่มจากการโดนดัก/ล้ำเกิน
  for (const b of mine) {
    if (!b.hurt) continue;
    const u = st.units.find((x) => x.lane === b.def.lane && x.team === myTeam);
    if (u) u.hp = Math.max(1, Math.round(u.maxHp * (1 - b.hurt)));
  }
  for (const r of theirs) {
    if (!r.hurt) continue;
    const u = st.units.find((x) => x.lane === r.def.lane && x.team !== myTeam);
    if (u) u.hp = Math.max(1, Math.round(u.maxHp * (1 - r.hurt)));
  }
  return st;
}

// เก็บผลของไฟต์ที่จบแล้ว — เฉพาะที่ต้องเอาไปคิดเงินตอนปิดยกและที่โชว์ในสรุป
export function recordLaneFight(st, L, mySide) {
  return {
    lane: L,
    iWon: st.winner === mySide,
    winner: st.winner || null,
    time: st.t,
    rows: st.units.filter((u) => u.team === mySide).map((u) => ({
      char: u.char, lane: u.lane, alive: u.alive, kills: u.kills, assists: u.assists,
      dmg: Math.round(u.damageDealt), hits: u.hits, shots: u.shots, dodged: u.dodged || 0,
    })),
    // ค่าที่ต้องเอาไปบวกเข้ากระเป๋าตอนจบยก เก็บแยกตามเลนของนักแข่ง
    // soloAssists ต้องติดมาด้วย — เดิมหล่นหายตรงนี้ ช่วยสังหารคนเดียวเลยได้แค่ราคาช่วยกันหลายคนตลอด
    units: st.units.map((u) => ({
      team: u.team, lane: u.lane, alive: u.alive, kills: u.kills, assists: u.assists,
      soloAssists: u.soloAssists || 0,
      wvcGold: u.wvcGold || 0, duelGold: u.duelGold || 0, bountyGold: u.bountyGold || 0,
      sangGained: u.sangGained || 0,
      // PUSS — เลนของเป้าท้าดวลที่เก็บได้เองในไฟต์นี้
      duelKills: (u.duelKills || []).slice(),
      // ใครโดนเก็บบ้าง — ใช้คิดเงินตามค่าหัวตอนปิดยก
      victims: (u.victims || []).slice(),
    })),
    log: st.log.slice(-6),
  };
}
