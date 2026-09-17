

// ---------------------------------------------------------------
// Pure combat simulation. No React. Testable in node.
// ---------------------------------------------------------------

// Everything below is in League units: 1 unit here = 1 unit there.
// Move speed 325, melee attack range 175, ranged 550, model radius 65.
// สนามขยายจาก 3300×1850 เป็น 1.5 เท่า — เดินไกลขึ้น เปิดช่องให้เล่นตำแหน่งมากขึ้น
export const ARENA_W = 4950;

export const ARENA_H = 2775;

// พิกเซลบนแคนวาส = หน่วยในเกม / RENDER_SCALE
// ย่อลงจาก 5.55 เป็น 6.6 เพื่อให้แถบข้อมูลใต้สนามอยู่ในจอเดียวกันได้หมด
export const RENDER_SCALE = 6.6;

// โซนวางตัวก่อนไฟต์ — ฝั่งเรายืนได้ในกรอบนี้เท่านั้น
export const DEPLOY = { xMin: 220, xMax: 1500, yMin: 220, yMax: 2555 };

export const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

// The five esports-player skills. Each maps onto something the engine can actually
// simulate — see athlete-stats docs for what each one really drives.
export const STAT_KEYS = ["mechanics", "gameSense", "knowledge", "decision", "teamwork"];


export const BASE = { projSpeed: 1350, radius: 65 };


// gameplay radius by role — bigger models are easier to land skillshots on
export const ROLE_RADIUS = {
  Juggernaut: 80, Vanguard: 80, "Battle Mage": 72, Diver: 72, Bruiser: 76,
  "Bruiser AD": 76, Specialist: 70, Skirmisher: 68, Assassin: 62,
  Marksman: 60, "Burst Mage": 58, Enchanter: 56,
};

export function radiusOf(ch) { return ch.radius || ROLE_RADIUS[ch.role] || BASE.radius; }
