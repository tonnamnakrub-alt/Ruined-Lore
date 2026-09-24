

// ---------------- deterministic RNG ----------------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));


// XP to go from level L to L+1. เพดานเลเวลคือ 18 ทุกเลน (สกิลเต็มพอดี Q5 W5 E5 R3)
// ยกเว้น TOP ที่ได้ +1 XP ทุกยก จึงดันไปได้ถึง 20
export function levelCost(L) {
  return Math.round(1.8 + 0.55 * L);
}


export function levelProgress(xp, maxLevel) {
  let lvl = 1;
  let left = xp;
  let need = levelCost(1);
  while (lvl < maxLevel && left >= need) {
    left -= need;
    lvl++;
    need = levelCost(lvl);
  }
  return { level: lvl, into: lvl >= maxLevel ? 0 : left, need: lvl >= maxLevel ? 0 : need };
}


export function xpToLevel(xp, maxLevel) {
  return levelProgress(xp, maxLevel).level;
}


// ---------------- build fight state ----------------
export function hashStr(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
