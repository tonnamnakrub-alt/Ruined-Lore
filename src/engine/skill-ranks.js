

// League's usual "max Q, then W, then E, ult the moment it unlocks"
export const SKILL_ORDER = ["Q", "W", "E", "Q", "Q", "R", "Q", "W", "Q", "W", "R", "W", "W", "E", "E", "R", "E", "E"];


export function skillRank(level, key) {
  let n = 0;
  for (let i = 0; i < Math.min(level, SKILL_ORDER.length); i++) if (SKILL_ORDER[i] === key) n++;
  return n;
}


// League's rules: basic skills unlock a rank at levels 1/3/5/7/9, ultimates at 6/11/16
export function rankCap(key, level) {
  if (key === "R") return Math.max(0, Math.min(3, Math.floor((level - 1) / 5)));
  return Math.max(0, Math.min(5, Math.floor((level + 1) / 2)));
}


export function emptyRanks() {
  return { Q: 0, W: 0, E: 0, R: 0 };
}


export function pointsSpent(ranks) {
  return ranks.Q + ranks.W + ranks.E + ranks.R;
}


export function canRank(ranks, key, level) {
  if (pointsSpent(ranks) >= level) return false;
  return ranks[key] < rankCap(key, level);
}


// fills any unspent points the way this champion prefers — used by the AI and
// by the player's "auto" button
export function autoRanks(level, priority, start) {
  const r = start ? { ...start } : emptyRanks();
  let guard = 0;
  while (pointsSpent(r) < level && guard++ < 40) {
    if (canRank(r, "R", level)) { r.R++; continue; }
    const next = (priority || ["Q", "W", "E"]).find((k) => canRank(r, k, level));
    if (!next) break;
    r[next]++;
  }
  return r;
}
