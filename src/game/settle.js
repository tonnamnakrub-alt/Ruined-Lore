// ---------------------------------------------------------------
// ปิดยก — แจกเงิน/XP ให้ทั้งสองฝั่ง แล้วดูว่าใครได้เงินยกนี้มากกว่า
//
// แยกออกมาจาก App ด้วยเหตุผลสองข้อ
//   1. สองเครื่องในโหมดออนไลน์ต้องคิดผลยกได้ตรงกันเป๊ะ — เทสต้องเรียกโค้ดชุดนี้ได้ตรงๆ
//   2. ผู้เล่นต้องเห็นว่าเงินแต่ละก้อนมาจากไหน จะได้ปรับบาลานซ์ได้ (breakdown)
//
// breakdown ของแต่ละคนเป็นรายการ { key, gold, xp, note } ที่รวมกันได้ยอดจริงพอดี
// ---------------------------------------------------------------
import { tr } from "../i18n.js";
import { CHAMPIONS } from "../data/champions.js";
import {
  ASSIST_GROUP, ASSIST_SOLO, BOUNTY, JUNGLE_FARM, JUNGLE_GANK, KILL, LANE_MEMBERS,
  STANCES, STANCE_LANES, laneOutcome,
} from "../data/behaviour.js";
import { autoRanks } from "../engine/skill-ranks.js";
import { xpToLevel } from "../engine/util.js";
import { bountyOf, streaksAfterRound } from "./bounty.js";
import { foeIncome } from "./round-plan.js";
import { laneMax } from "./roster.js";

// ยกคู่ ซัพได้เพิ่มอีก 1
const SUPPORT_EVEN_BONUS = 1;
const ABANDON_BONUS = 2;
const JUNGLE_AWAY = { gold: 0, xp: 0 };

// ที่มาของรายได้เลนหนึ่งคน — แตกเป็นชิ้นให้เห็นว่านิสัยไหนเจอนิสัยไหนได้อะไร
// persp = "me" (ฝั่งเรา) หรือ "foe"
function laneParts(plan, lane, persp, forfeited) {
  const parts = [];
  if (lane === "JUNGLE") {
    const gank = persp === "me" ? plan.lanes && Object.values(plan.lanes).some((l) => l.myGank) : !!plan.foeJungleLane;
    const src = gank ? JUNGLE_GANK : JUNGLE_FARM;
    parts.push({ key: gank ? "jungleGank" : "jungleFarm", gold: src.gold, xp: src.xp });
    if (forfeited) parts.push({ key: "safeForfeit", gold: -src.gold, xp: -src.xp });
    return parts;
  }
  const L = lane === "ADC" || lane === "SUPPORT" ? "BOT" : lane;
  const l = plan.lanes[L];
  if (!l) return parts;
  const my = persp === "me" ? l.mine : l.theirs;
  const their = persp === "me" ? l.theirs : l.mine;
  const base = STANCES[my] || STANCES.NEUTRAL;
  parts.push({ key: "stanceBase", gold: base.gold, xp: base.xp, stance: my, vs: their });
  // ส่วนต่างจากการที่นิสัยสองฝั่งมาเจอกัน (ถอยให้ ล้ำเก้อ โดนกด ฯลฯ)
  const out = laneOutcome(my, their).me;
  const dg = out.gold - base.gold;
  const dx = out.xp - base.xp;
  if (dg || dx) parts.push({ key: "stanceMatchup", gold: dg, xp: dx, stance: my, vs: their });
  const abandonedByOther = persp === "me" ? l.out.abandonedByFoe : l.out.abandonedByMe;
  if (abandonedByOther) parts.push({ key: "abandonBonus", gold: ABANDON_BONUS, xp: 0 });
  // แตกไฟต์เพราะนิสัย = ไม่มีรายได้ฐานเลย เหลือแค่ศพ
  if (l.stanceFight) {
    const sum = parts.reduce((s, p) => ({ gold: s.gold + p.gold, xp: s.xp + p.xp }), { gold: 0, xp: 0 });
    parts.push({ key: "stanceFightNoIncome", gold: -sum.gold, xp: -sum.xp });
  }
  if (forfeited) {
    const sum = parts.reduce((s, p) => ({ gold: s.gold + p.gold, xp: s.xp + p.xp }), { gold: 0, xp: 0 });
    parts.push({ key: "safeForfeit", gold: -sum.gold, xp: -sum.xp });
  }
  return parts;
}

// PUSS — สถานะตราท้าดวลที่ต้องพกข้ามยก
//   duelCommitted : เป้าที่ใช้จริงในยกล่าสุด — ถ้ายกนี้ใช้เป้าใหม่ แปลว่าเพิ่งเลือก ติดคูลดาวน์การเลือก
//   duelLockUntil : เปลี่ยนเป้าได้อีกทีตั้งแต่ยกนี้
//   duelBan       : { เลน: ต้องเก็บเป้าที่มีตราตัวอื่นอีกกี่ครั้ง } — เก็บเป้าไหนได้ เป้านั้นเข้ารายการ
export function duelAfterRound(c, u, round) {
  const cfg = (CHAMPIONS[c.champId] || {}).duel;
  if (!cfg) return {};
  let lane = c.duelLane || null;
  let committed = c.duelCommitted == null ? null : c.duelCommitted;
  let lockUntil = c.duelLockUntil || 0;
  if (lane !== committed) {
    committed = lane;
    lockUntil = lane ? round + (cfg.pickLockRounds || 0) : 0;
  }
  const ban = { ...(c.duelBan || {}) };
  for (const k of (u && u.duelKills) || []) {
    // ทุกครั้งที่เก็บเป้าที่มีตราได้ นับให้ทุกเลนที่ถูกห้ามอยู่ ยกเว้นเลนที่เพิ่งเก็บ
    for (const b of Object.keys(ban)) {
      if (b === k) continue;
      ban[b] -= 1;
      if (ban[b] <= 0) delete ban[b];
    }
    ban[k] = cfg.repickAfterKills || 0;
    if (!ban[k]) delete ban[k];
  }
  // เก็บเป้าที่เลือกไว้ได้แล้ว — คำสั่งเดิมใช้ต่อไม่ได้ ปล่อยให้เลือกใหม่ได้ทันที
  if (lane && ban[lane]) {
    lane = null;
    committed = null;
    lockUntil = 0;
  }
  return {
    duelLane: lane,
    duelCommitted: committed,
    duelLockUntil: lockUntil,
    duelBan: Object.keys(ban).length ? ban : null,
  };
}

export function settleRound(opts) {
  const {
    plan, done: doneIn, team, foe, mySide = "blue", jungle, round, mode,
    priorityMine,
  } = opts;
  const done = doneIn || {};
  const gm = (mode && mode.gold) || 1;
  const xm = (mode && mode.xp) || 1;
  const foeSide = mySide === "blue" ? "red" : "blue";

  const income = {};
  const foeInc = {};
  for (const k of Object.keys(plan.income)) income[k] = { ...plan.income[k] };
  const fi = foeIncome(plan);
  for (const k of Object.keys(fi)) foeInc[k] = { ...fi[k] };

  // ---- ยืนรับแกงค์แบบเซฟ: ยื้อจนหมดเวลาแล้วยังมีคนรอด = ฝ่ายที่มาแกงค์เสียยกฟรี
  // ตัดรายได้ของป่าฝั่งนั้นและของคนที่ถูกดึงมาช่วย เพื่อให้การไล่แกงค์ซ้ำมีราคา
  const forfeitMe = new Set();
  const forfeitFoe = new Set();
  for (const L of STANCE_LANES) {
    const l = plan.lanes[L];
    const r = done[L];
    if (!l || !l.safeStand || !r) continue;
    const defSide = l.safeStand === "me" ? mySide : foeSide;
    const held = r.units.some((u) => u.team === defSide && LANE_MEMBERS[L].includes(u.lane) && u.alive);
    if (!held) continue;
    const atkIsMe = l.safeStand === "foe";
    const bag = atkIsMe ? income : foeInc;
    const lost = atkIsMe ? forfeitMe : forfeitFoe;
    const crew = atkIsMe ? ((jungle && jungle.crew) || []) : (plan.foeJungleCrew || []);
    bag.JUNGLE = { ...JUNGLE_AWAY };
    lost.add("JUNGLE");
    for (const c of crew) for (const m of LANE_MEMBERS[c] || []) { bag[m] = { ...JUNGLE_AWAY }; lost.add(m); }
  }

  // เลนที่ชนะ/แพ้ยังนับไว้โชว์ในสรุปยก แต่ไม่ใช่ตัวตัดสินแต้ม — ยกนี้ใครได้เงินเยอะกว่าคนนั้นชนะ
  let laneWins = 0;
  let laneLoss = 0;
  for (const L of STANCE_LANES) {
    const r = done[L];
    if (!r) continue;
    if (r.iWon) laneWins++; else laneLoss++;
  }

  // รวมค่าที่ได้จากทุกไฟต์ของยกนี้ ต่อหนึ่งนักแข่ง
  const perUnit = {};
  for (const L of Object.keys(done)) {
    for (const u of done[L].units) {
      const k = u.team + ":" + u.lane;
      const cur = perUnit[k] || {
        kills: 0, assists: 0, soloAssists: 0, wvcGold: 0, duelGold: 0, bountyGold: 0,
        sangGained: 0, alive: true, duelKills: [], victims: [],
      };
      cur.kills += u.kills;
      cur.assists += u.assists;
      cur.soloAssists += u.soloAssists || 0;
      cur.wvcGold += u.wvcGold || 0;
      cur.duelGold += u.duelGold || 0;
      cur.bountyGold += u.bountyGold || 0;
      cur.sangGained += u.sangGained || 0;
      cur.alive = cur.alive && u.alive;
      cur.duelKills = cur.duelKills.concat(u.duelKills || []);
      cur.victims = cur.victims.concat(u.victims || []);
      perUnit[k] = cur;
    }
  }

  // ค่าหัวคิดจากสถานะตอนเริ่มยก — ทั้งสองเครื่องมีข้อมูลชุดเดียวกัน จึงได้ตัวเลขเดียวกัน
  const rosterOf = (color) => (color === mySide ? team : foe);
  const enemyOf = (color) => (color === mySide ? foe : team);
  const bountyAt = (v) => {
    const row = rosterOf(v.team).find((c) => c.lane === v.lane);
    return row ? bountyOf(row, enemyOf(v.team)).total : KILL.gold;
  };

  const award = (list, side, inc, persp, lost) => list.map((c) => {
    const u = perUnit[side + ":" + c.lane];
    const src = inc[c.lane] || { gold: 0, xp: 0 };
    const parts = laneParts(plan, c.lane, persp, lost.has(c.lane));
    // เงินจากศพ — สังหาร 6g 1xp · ช่วยสังหารคนเดียว 3g 1xp · ช่วยกันหลายคน 1g 1xp
    const solo = u ? Math.min(u.soloAssists, u.assists) : 0;
    const shared = u ? Math.max(0, u.assists - solo) : 0;
    // เงินศพ = ค่าหัวของตัวที่เก็บได้จริง (ปกติ 6 แต่ตัวที่เงินนำหรือฆ่ารัวจะแพงกว่า)
    const heads = u ? (u.victims || []).map(bountyAt) : [];
    const killGold = heads.length ? heads.reduce((s, x) => s + x, 0) : (u ? u.kills * KILL.gold : 0);
    let kg = u ? killGold + solo * ASSIST_SOLO.gold + shared * ASSIST_GROUP.gold : 0;
    const kx = u ? u.kills * KILL.xp + solo * ASSIST_SOLO.xp + shared * ASSIST_GROUP.xp : 0;
    if (u && u.kills) parts.push({ key: "kills", gold: killGold, xp: u.kills * KILL.xp, n: u.kills, heads });
    if (solo) parts.push({ key: "soloAssists", gold: solo * ASSIST_SOLO.gold, xp: solo * ASSIST_SOLO.xp, n: solo });
    if (shared) parts.push({ key: "groupAssists", gold: shared * ASSIST_GROUP.gold, xp: shared * ASSIST_GROUP.xp, n: shared });
    // พาสซีฟบอท — เอดีซีได้เงินเพิ่ม 1 ต่อทุกอย่าง ทั้งรายได้เลน สังหาร และช่วยสังหาร
    let laneBonus = 0;
    if (c.lane === "ADC") {
      if (src.gold > 0) laneBonus += 1;
      if (u) laneBonus += u.kills + u.assists;
      if (laneBonus) parts.push({ key: "adcPassive", gold: laneBonus, xp: 0 });
    }
    kg += laneBonus;
    // พาสซีฟซัพพอร์ต — ไม่มีรายได้เลนของตัวเอง ไปรับส่วนแบ่งจากเอดีซีแทน (คิดทีหลัง)
    const laneGold = c.lane === "SUPPORT" ? 0 : Math.max(0, src.gold);
    if (c.lane === "SUPPORT" && src.gold !== 0) parts.push({ key: "supportNoLane", gold: -src.gold, xp: 0 });
    // เลนที่ติดลบ (ล้ำเก้อ ฯลฯ) ตัดที่ศูนย์ ไม่หักจากเงินศพ
    if (c.lane !== "SUPPORT" && src.gold < 0) parts.push({ key: "floorZero", gold: -src.gold, xp: 0 });
    // พาสซีฟท็อป — ได้ XP เพิ่มอีก 1 ทุกยก และดันเลเวลได้ถึง 20
    const laneXp = Math.max(0, src.xp) + (c.lane === "TOP" ? 1 : 0);
    if (c.lane === "TOP") parts.push({ key: "topPassive", gold: 0, xp: 1 });
    if (src.xp < 0) parts.push({ key: "floorZero", gold: 0, xp: -src.xp });
    const xp = Math.max(0, Math.round((laneXp + kx) * xm));
    let gold = Math.max(0, Math.round((laneGold + kg) * gm));
    // ตัวคูณของโหมด — ส่วนต่างหลังคูณและปัดเศษ ให้รายการรวมกันได้ยอดจริงพอดี
    const rawGold = laneGold + kg;
    const rawXp = laneXp + kx;
    if (gold !== rawGold || xp !== rawXp) parts.push({ key: "modeMul", gold: gold - rawGold, xp: xp - rawXp, mul: gm, xmul: xm });

    let bg = c.bountyGold || 0;
    const bc = CHAMPIONS[c.champId] && CHAMPIONS[c.champId].bounty;
    // Plunder — ยกที่ได้ลงไฟต์จริง เงินกระเป๋าคูณสองขึ้นไปเรื่อยๆ (10 → 20 → 40 …)
    // ยกที่ฟาร์มเฉยๆ ไม่มีไฟต์ ได้แค่ฐาน 10 และไม่ขยับชั้นคูณ
    let bmTier = c.bmTier || 0;
    let bmGain = 0;
    if (bc) {
      const fought = !!u;
      const perRound = fought
        ? bc.perRound * Math.pow(2, Math.min(bmTier, bc.doubleCap != null ? bc.doubleCap : 4))
        : bc.perRound;
      if (fought) bmTier += 1;
      bmGain = perRound + (u ? u.kills * bc.perKill + u.assists * bc.perAssist + u.bountyGold : 0);
      bg += bmGain;
    }
    bg = Math.round(bg * gm);
    const wvc = Math.round((u && u.wvcGold) || 0);
    if (wvc) parts.push({ key: "wvc", gold: wvc, xp: 0 });
    gold += wvc;
    // PUSS — ค่าหัวส่วนเกินจากการเก็บเป้าที่ตัวเองท้าดวลไว้
    const duel = Math.round((u && u.duelGold) || 0);
    if (duel) parts.push({ key: "duelBounty", gold: duel, xp: 0 });
    gold += duel;

    const nxp = c.xp + xp;
    const lvl = xpToLevel(nxp, laneMax(c.lane));
    const pri = persp === "me" && priorityMine
      ? priorityMine(c.champId)
      : ((CHAMPIONS[c.champId] || {}).skillPriority || ["Q", "W", "E"]);
    // Sanguine Aristocracy — สแตกถาวร จบยกได้อีก 5 เสมอ ไม่ต้องลงไฟต์
    const sg = (CHAMPIONS[c.champId] || {}).sanguine;
    const sangCap = (sg && sg.max) || 0;
    const sangRaw = (c.sangHp || 0) + ((u && u.sangGained) || 0) + (sg ? (sg.perRound || 0) : 0);
    const sang = sangCap > 0 ? Math.min(sangCap, sangRaw) : sangRaw;
    const next = {
      ...c, xp: nxp, gold: c.gold + gold, level: lvl,
      ranks: c.autoLevel ? autoRanks(lvl, pri, null) : c.ranks,
      bountyGold: bg, sangHp: sang, bmTier,
      ...duelAfterRound(c, u, round),
      ...streaksAfterRound(c, u),
    };
    return {
      next, laneIncome: laneGold,
      row: { lane: c.lane, champId: c.champId, parts, gold, xp, bounty: bmGain ? Math.round(bmGain * gm) : 0, fought: !!u },
    };
  });

  // พาสซีฟซัพพอร์ต — รับครึ่งหนึ่งของ "รายได้เลน" ของเอดีซี (ปัดลง) บวกอีก 1 ทุกสองยก
  // คิดจากรายได้เลนก้อนเดียวเท่านั้น ไม่เอาเงินศพหรือพาสซีฟ +1 ของเอดีซีมาหารด้วย
  const shareToSupport = (before, res) => {
    const after = res.map((r) => r.next);
    const iAdc = before.findIndex((c) => c.lane === "ADC");
    const iSup = before.findIndex((c) => c.lane === "SUPPORT");
    if (iAdc < 0 || iSup < 0) return after;
    const half = Math.floor(Math.max(0, res[iAdc].laneIncome * gm) / 2);
    const even = round % 2 === 0 ? SUPPORT_EVEN_BONUS : 0;
    const share = half + even;
    const out = after.slice();
    out[iSup] = { ...out[iSup], gold: out[iSup].gold + share };
    const row = res[iSup].row;
    if (half) row.parts.push({ key: "supportShare", gold: half, xp: 0 });
    if (even) row.parts.push({ key: "supportEven", gold: even, xp: 0 });
    row.gold += share;
    return out;
  };

  const meRes = award(team, mySide, income, "me", forfeitMe);
  const foeRes = award(foe, foeSide, foeInc, "foe", forfeitFoe);
  const nextMe = shareToSupport(team, meRes);
  const nextFoe = shareToSupport(foe, foeRes);

  const goldGain = {};
  team.forEach((c, i) => { goldGain[c.lane] = nextMe[i].gold - c.gold; });

  // ---- ใครได้เงินเยอะกว่าในยกนี้ คนนั้นชนะยก
  // ไม่นับกระเป๋าโจรสลัดของ C.HOOK เพราะมันได้ฟรีทุกยกโดยไม่ต้องลงไฟต์
  const sumGain = (before, after) => after.reduce((s, c, i) => s + (c.gold - before[i].gold), 0);
  const myGold = sumGain(team, nextMe);
  const foeGold = sumGain(foe, nextFoe);

  return {
    nextMe, nextFoe, myGold, foeGold,
    iWon: myGold > foeGold,
    drawn: myGold === foeGold,
    laneWins, laneLoss, perUnit, goldGain,
    breakdown: { me: meRes.map((r) => r.row), foe: foeRes.map((r) => r.row) },
  };
}

// ชื่อของแต่ละชิ้นในใบเสร็จ — เก็บไว้ที่เดียว หน้าสรุปยกกับหน้าอธิบายระบบเงินใช้ร่วมกัน
export function partLabel(p) {
  const st = (s) => tr((STANCES[s] || {}).th || s);
  switch (p.key) {
    case "stanceBase": return tr("รายได้เลน · {0}", st(p.stance));
    case "stanceMatchup": return tr("{0} เจอ {1}", st(p.stance), st(p.vs));
    case "abandonBonus": return tr("อีกฝั่งทิ้งเลนไปช่วยแกงค์");
    case "stanceFightNoIncome": return tr("แตกไฟต์เพราะนิสัย — ไม่มีรายได้ฐาน");
    case "safeForfeit": return tr("แกงค์เลนที่ยืนเซฟแล้วเก็บไม่ลง — เสียยกฟรี");
    case "jungleFarm": return tr("ป่าฟาร์ม");
    case "jungleGank": return tr("ป่าไปแกงค์");
    case "kills":
      // ถ้ามีหัวไหนแพงกว่าปกติ ต้องเห็นว่าแพงเพราะตัวไหน
      return (p.heads || []).some((h) => h !== BOUNTY.base)
        ? tr("สังหาร ×{0} · ค่าหัว {1}", p.n, p.heads.join("+"))
        : tr("สังหาร ×{0}", p.n);
    case "soloAssists": return tr("ช่วยสังหารคนเดียว ×{0}", p.n);
    case "groupAssists": return tr("ช่วยสังหารหลายคน ×{0}", p.n);
    case "adcPassive": return tr("พาสซีฟ ADC +1 ต่อทุกก้อน");
    case "supportNoLane": return tr("ซัพไม่มีรายได้เลนของตัวเอง");
    case "supportShare": return tr("ครึ่งหนึ่งของรายได้เลนของ ADC");
    case "supportEven": return tr("ยกคู่ ซัพได้เพิ่ม");
    case "floorZero": return tr("รายได้เลนติดลบ ปัดเป็นศูนย์");
    case "topPassive": return tr("พาสซีฟ TOP +1 XP");
    case "modeMul": return tr("ตัวคูณโหมด ×{0}", p.mul);
    case "wvc": return tr("Wendigo's Voracious Claw");
    case "duelBounty": return tr("ค่าหัวเป้าท้าดวล (PUSS)");
    default: return p.key;
  }
}
