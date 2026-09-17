import { tr } from "../i18n.js";


// ---------------------------------------------------------------
// ระบบรั้งคะแนน (catch-up) — กันไม่ให้ฝั่งที่นำอยู่ทิ้งห่างจนเกมจบตั้งแต่กลางแมตช์
//
//   ชนะรวด  -> รายได้ยกนั้นโดนหักภาษี (เงินเต็มอัตรา XP หักครึ่งเดียวของภาษี
//              เพราะถ้าตัดเลเวลแรงเกินจะกลายเป็นลงโทษคนเล่นเก่ง)
//   แพ้รวด   -> ยกที่ "พลิกกลับมาชนะ" ได้เงินและ XP ชดเชยตามจำนวนยกที่แพ้ติดกัน
//
// เก็บสถิติเป็นเลขตัวเดียวต่อฝั่ง  บวก = ชนะติดกันกี่ยก  ลบ = แพ้ติดกันกี่ยก
//
// ตัวเลขจูนจาก _streak_tune.mjs — เป้าหมายคือ "หน่วงไม่ใช่ล้าง"
// ทีมที่เก่งกว่าควรยังนำอยู่ แต่ช่องว่างเงินสะสมเหลือราว 40-45% ของเดิม
// ถ้าเก็บภาษีหนักกว่านี้ ฝั่งที่แพ้จะรวยกว่าฝั่งที่ชนะ ซึ่งกลายเป็นลงโทษคนเล่นดี
// ---------------------------------------------------------------

// ดัชนี = ชนะติดกันกี่ยก (นับยกนี้ด้วย) — เริ่มเก็บภาษีตั้งแต่ยกที่ 3
export const WIN_TAX = [0, 0, 0, 0.10, 0.18, 0.25, 0.30];
export const TAX_XP_SHARE = 0.5;   // XP โดนภาษีครึ่งเดียวของเงิน

export const LOSS_CAP = 5;         // นับค่าชดเชยสูงสุด 5 ยกที่แพ้ติด
export const LOSS_GOLD = 1;        // เงินชดเชยต่อหนึ่งยกที่แพ้ติดกัน (ต่อคน)
export const LOSS_XP_PER = 2;      // แพ้ติดกันทุกๆ 2 ยก ได้ XP ชดเชย 1


export function nextStreak(cur, won) {
  if (won) return cur >= 0 ? cur + 1 : 1;
  return cur <= 0 ? cur - 1 : -1;
}


// คืนตัวคูณและโบนัสของยกนี้ จากสถิติ "ก่อน" ยกนี้
export function streakMods(cur, won) {
  if (!won) return { goldMul: 1, xpMul: 1, bonusGold: 0, bonusXp: 0, wins: 0, losses: 0 };
  const wins = cur >= 0 ? cur + 1 : 1;
  const losses = cur < 0 ? Math.min(-cur, LOSS_CAP) : 0;
  const tax = WIN_TAX[Math.min(wins, WIN_TAX.length - 1)];
  return {
    wins, losses,
    goldMul: 1 - tax,
    xpMul: 1 - tax * TAX_XP_SHARE,
    bonusGold: losses * LOSS_GOLD,
    bonusXp: Math.ceil(losses / LOSS_XP_PER),
  };
}


// ข้อความสรุปให้หน้าผลการแข่งขัน — คืน null ถ้ายกนี้ไม่มีอะไรพิเศษ
export function streakNote(m) {
  if (!m) return null;
  if (m.bonusGold > 0) {
    return tr("พลิกจากแพ้รวด {0} ยก — ทุกคนได้ชดเชย +{1}g +{2} XP", m.losses, m.bonusGold, m.bonusXp);
  }
  if (m.goldMul < 1) {
    return tr("ชนะรวด {0} ยก — รายได้ยกนี้ถูกหัก {1}%", m.wins, Math.round((1 - m.goldMul) * 100));
  }
  return null;
}


// ป้ายสั้นๆ ไว้โชว์บนหัวจอ เช่น  W3  L2
export function streakTag(n) {
  if (!n) return null;
  return n > 0 ? tr("ชนะรวด {0}", n) : tr("แพ้รวด {0}", -n);
}
