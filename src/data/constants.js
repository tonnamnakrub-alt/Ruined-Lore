

// ---------------------------------------------------------------
// Pure combat simulation. No React. Testable in node.
// ---------------------------------------------------------------

// Everything below is in League units: 1 unit here = 1 unit there.
// Move speed 325, melee attack range 175, ranged 550, model radius 65.
export const ARENA_W = 3300;

export const ARENA_H = 1850;

export const RENDER_SCALE = 3.7; // canvas pixels = units / RENDER_SCALE

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
