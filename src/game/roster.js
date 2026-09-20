import { LANE_CHAMPION } from "../data/champions.js";
import { LANES, STAT_KEYS } from "../data/constants.js";
import { LANE_INFO } from "../data/lanes.js";
import { emptyRanks } from "../engine/skill-ranks.js";
import { C } from "../ui/theme.js";


export const STAT_TH = {
  mechanics: "MECHANICS · ทักษะการควบคุม",
  gameSense: "GAME SENSE · การอ่านเกม",
  knowledge: "GAME KNOWLEDGE · ความเข้าใจเกม",
  decision: "DECISION MAKING · การตัดสินใจ",
  teamwork: "TEAMWORK · การเล่นเป็นทีม",
};

export const STAT_DESC = {
  mechanics: "เล็งสกิลแม่น หลบสกิลทัน และตีได้ลื่นกว่า (ลดเวลาเงื้อ)",
  gameSense: "อ่านว่ากำลังโดนรุม ถอยเป็น ยืนถูกระยะ",
  knowledge: "รู้แมตช์อัพ — ทำดาเมจได้มากขึ้นและกินดาเมจน้อยลง",
  decision: "จังหวะเข้า/ถอย/กดอัลติ และไม่ไล่จนตาย",
  teamwork: "โฟกัสเป้าเดียวกับเพื่อน ยิ่งพร้อมกันยิ่งแรง",
};

export const STAT_SHORT = { mechanics: "MEC", gameSense: "SEN", knowledge: "KNO", decision: "DEC", teamwork: "TEA" };


export const POINTS = 30;

export const STAT_CAP = 10;

export const WINS_NEEDED = 16;   // ค่าสำรอง ถ้าไม่มีโหมด (โหมดจริงอยู่ใน data/modes.js)

export const MAX_ROUNDS = 31;    // ค่าสำรองเช่นกัน

export const CHARS = ["A", "B", "C", "D", "E"];



export function emptyStats() {
  return { mechanics: 0, gameSense: 0, knowledge: 0, decision: 0, teamwork: 0 };
}


export function randomSpread(rand) {
  const o = emptyStats();
  let left = POINTS;
  let guard = 0;
  while (left > 0 && guard++ < 2000) {
    const k = STAT_KEYS[Math.floor(rand() * STAT_KEYS.length)];
    if (o[k] < STAT_CAP) { o[k]++; left--; }
  }
  return o;
}


// draft = รายการ { lane, champId } จาก bot-draft (ไม่ใส่ = ใช้ตัวประจำเลนเหมือนเดิม)
// spread = ฟังก์ชันแจกแต้มนักแข่ง (ไม่ใส่ = สุ่มล้วนแบบเดิม)
export function makeRoster(rand, draft, spread) {
  return LANES.map((lane, i) => {
    const pick = draft && draft.find((d) => d.lane === lane);
    const champId = (pick && pick.champId) || LANE_CHAMPION[lane];
    return {
    lane,
    char: CHARS[i],
    athleteName: "P" + (i + 1),
    champId,
    athlete: spread ? spread(rand, champId) : randomSpread(rand),
    level: 1,
    xp: 0,
    gold: 10,
    items: [],
    style: "POKE",
    ranks: emptyRanks(),
    autoLevel: true,
    bountyGold: 0,
    upgrades: [],
    spot: null,
    };
  });
}


export function laneMax(lane) { return LANE_INFO[lane].maxLevel; }


export function toDef(c) {
  return {
    lane: c.lane,
    champId: c.champId,
    ranks: c.ranks,
    bountyGold: c.bountyGold || 0,
    wvcStacks: c.wvcStacks || 0,
    sangHp: c.sangHp || 0,
    upgrades: c.upgrades || [], char: c.char, athleteName: c.athleteName, athlete: c.athlete,
    style: c.style, level: c.level, items: c.items,
    spot: c.spot || null,   // จุดยืนที่ผู้เล่นวางไว้เอง (null = ใช้ตำแหน่งเริ่มต้นของเลน)
    duelLane: c.duelLane || null,   // PUSS — เลนของศัตรูที่โค้ชสั่งให้ท้าดวล (null = ให้เลือกเอง)
    bounty: c.items.reduce((s, i) => s + i.cost, 0),
  };
}
