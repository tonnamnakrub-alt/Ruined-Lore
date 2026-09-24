// ---------------------------------------------------------------
// ค่าหัว (bounty) — ตัวที่เงินนำหรือฆ่ารัวอยู่ จะมีค่าหัวสูงขึ้น เก็บได้เงินเยอะขึ้น
//
// ตารางแปลงมาจากของ League of Legends หารห้าสิบ (สังหารปกติ 300 ทอง = 6 ในเกมนี้)
// คิดจากสถานะ "ตอนเริ่มยก" ทั้งสองเครื่องจึงได้ค่าหัวชุดเดียวกันเสมอ
// ---------------------------------------------------------------
import { BOUNTY } from "../data/behaviour.js";

// เงินที่ตัวนี้หามาได้ทั้งหมด = เงินในกระเป๋า + ค่าของที่ซื้อไปแล้ว
export function netWorth(c) {
  return (c.gold || 0) + (c.items || []).reduce((s, i) => s + (i.cost || 0), 0);
}

// ค่าเฉลี่ยของอีกฝั่ง — นับเฉพาะตำแหน่งที่หาเงินเอง ไม่รวมซัพพอร์ต (ตามสูตรต้นทาง)
export function farmAverage(roster) {
  const list = (roster || []).filter((c) => c.lane !== "SUPPORT");
  if (!list.length) return 0;
  return list.reduce((s, c) => s + netWorth(c), 0) / list.length;
}

// ค่าหัวของตัวหนึ่ง เทียบกับทีมตรงข้าม — คืนรายละเอียดไว้โชว์ในใบเสร็จด้วย
export function bountyOf(c, enemyRoster) {
  const deaths = c.deathStreak || 0;
  const decay = deaths < BOUNTY.deathDecay.length ? BOUNTY.deathDecay[deaths] : BOUNTY.deathFloor;
  const base = BOUNTY.base * decay;

  const kills = Math.min(c.killStreak || 0, BOUNTY.streak.length - 1);
  const streak = BOUNTY.streak[kills];

  const lead = netWorth(c) - farmAverage(enemyRoster);
  let leadBonus = 0;
  if (lead >= BOUNTY.leadStart) {
    leadBonus = BOUNTY.leadPer * (1 + Math.floor((lead - BOUNTY.leadStart) / BOUNTY.leadStep));
    leadBonus = Math.min(leadBonus, BOUNTY.leadMax);
  }

  const raw = base + streak + leadBonus;
  return {
    base: Math.round(base),
    streak,
    lead: leadBonus,
    leadGold: Math.round(lead),
    killStreak: c.killStreak || 0,
    deathStreak: deaths,
    total: Math.max(1, Math.min(BOUNTY.max, Math.round(raw))),
  };
}

// สถิติต่อเนื่องหลังจบยก — ฆ่าได้กี่ศพ ตายไหม
//   ฆ่าติดกันโดยไม่ตาย = ค่าหัวขึ้น · ตายติดกันโดยไม่ได้ฆ่าใคร = ค่าหัวลด
export function streaksAfterRound(c, u) {
  const kills = u ? u.kills : 0;
  const died = u ? !u.alive : false;
  return {
    killStreak: died ? 0 : (c.killStreak || 0) + kills,
    deathStreak: kills > 0 ? 0 : died ? (c.deathStreak || 0) + 1 : (c.deathStreak || 0),
  };
}
