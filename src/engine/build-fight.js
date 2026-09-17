import { CHAMPIONS } from "../data/champions.js";
import { ARENA_H, ARENA_W, radiusOf } from "../data/constants.js";
import { EVENTS, RAMP_FRAC, RAMP_SCALE } from "../data/tuning.js";
import { skillRank } from "./skill-ranks.js";
import { deriveStats } from "./stats.js";
import { hashStr, mulberry32 } from "./util.js";


export function buildFight(blueDefs, redDefs, seed, event) {
  const rng = mulberry32(hashStr("shared:" + seed));
  const unitRng = (tag) => {
    const r = mulberry32(hashStr(tag + ":" + seed));
    r(); r(); r();
    return r;
  };
  const units = [];
  // ไฟต์เลนมีคนน้อยกว่าไฟต์รวมมาก ถ้ายังยืนห่างเท่าเดิมจะเดินเข้าหากันนานเกินไป
  // ยิ่งคนน้อยยิ่งดึงจุดเริ่มเข้าหากลางสนาม 10 คนเท่าเดิม 2 คนเหลือราวหนึ่งในสาม
  const bodyCount = blueDefs.length + redDefs.length;
  const squeeze = Math.max(0.34, Math.min(1, 0.34 + 0.66 * ((bodyCount - 2) / 8)));
  const mk = (def, team, idx, count) => {
    const s = deriveStats(def);
    const urng = unitRng(team + "/" + def.lane);
    // วางกลางสนามเสมอ แล้วกระจายขึ้นลงรอบกลาง — คนน้อยจะได้ไม่ไปกองอยู่ขอบบน
    const laneY = ARENA_H * (0.5 + (idx - (count - 1) / 2) * 0.17);
    const baseX = team === "blue" ? 330 + (idx % 2) * 100 : ARENA_W - 330 - (idx % 2) * 100;
    // จุดยืนที่ผู้เล่นตั้งเอง — เก็บเป็นพิกัดของฝั่งน้ำเงินเสมอ ฝั่งแดงสะท้อนกระจก
    const sp = def.spot;
    let x = sp ? (team === "blue" ? sp.x : ARENA_W - sp.x) : baseX;
    x = ARENA_W / 2 + (x - ARENA_W / 2) * squeeze;
    // อีเวนต์ประชิดตัว — ดึงจุดเริ่มเข้าหากลางสนามเหลือระยะห่างราวหนึ่งในสาม
    if (event && event.closeStart) x = ARENA_W / 2 + (x - ARENA_W / 2) * 0.34;
    // ไฟต์ที่เกิดแบบไม่ทันตั้งตัว คนเดินช้าจะตามไม่ทันและถูกทิ้งไว้ข้างหลัง
    if (event && event.closeStart) {
      const lag = (340 - s.moveSpeed) * 1.5;
      if (lag > 0) x += (team === "blue" ? -1 : 1) * lag;
    }
    const y = sp ? sp.y : laneY;
    return {
      id: `${team}-${def.lane}`,
      team,
      lane: def.lane,
      char: def.char,
      athleteName: def.athleteName,
      athlete: { ...def.athlete },
      style: def.style,
      level: def.level,
      x,
      y,
      vx: 0,
      vy: 0,
      hp: s.maxHp,
      ...s,
      radius: radiusOf(CHAMPIONS[s.champId]),
      rawArmor: s.armor,
      rawAd: s.ad,
      baseArmor: s.armor,
      baseAd: s.ad,
      baseMr: s.mr,
      baseAp: s.ap,
      baseAh: s.ah,
      bonusAd: s.bonusAd,
      bonusHp: s.bonusHp,
      baseTenacity: s.tenacity,
      onHit: null,
      isolde: 0,
      items: def.items || [],
      hasItem: (id) => (def.items || []).some((it) => it.id === id),
      bountyGold: def.bountyGold || 0,
      upgrades: def.upgrades || [],
      mark: null,
      dagger: null,
      frag: 0,
      light: 0,
      shadow: 0,
      form: null,
      formUntil: 0,
      formSkills: null,
      absorb: null,
      empower: 0,
      lastCombatAt: 0,
      dashing: null,
      shotsFired: 0,
      reloadUntil: 0,
      charging: null,
      channeling: null,
      weave: null,
      weaveArmor: 0,
      weaveMr: 0,
      flourish: null,
      hurl: null,
      chasing: null,
      champ: CHAMPIONS[s.champId],
      skills: CHAMPIONS[s.champId].skills.map((sk) => {
        const rank = def.ranks ? (def.ranks[sk.key] || 0) : skillRank(def.level, sk.key);
        return {
        ...sk,
        rank,
        // อัลติเริ่มไฟต์ด้วยคูลดาวน์ค้างไว้ 20% ของคูลดาวน์เต็ม (ไม่ได้พร้อมใช้ตั้งแต่วินาทีแรก)
        // ยกเว้นอีเวนต์ "ระเบิดพลัง" ที่ปล่อยให้พร้อมใช้ทันทีตั้งแต่วินาทีแรก
        cdLeft: sk.ult && !sk.fragCost && !(event && event.ultReady)
          ? 0.2 * (sk.cdByRank ? sk.cdByRank[Math.max(0, rank - 1)] : sk.cd)
          : 0,
        ammo: sk.ammoMax || 0,
        rechargeAt: null,
        get cdNow() { return this.cdByRank ? this.cdByRank[Math.max(0, this.rank - 1)] : this.cd; },
        };
      }),
      buffs: [],
      shield: 0,
      castLock: 0,
      atkLock: 0,
      casts: 0,
      bounty: def.bounty || 0,
      svx: 0,
      svy: 0,
      lastHitAt: -99,
      retreatUntil: -1,
      retreatReadyAt: 0,
      atkCd: urng() * 0.4,
      alive: true,
      targetId: null,
      retargetIn: 0,
      reactTimer: -1,
      dodgeVec: null,
      dodgeTime: 0,
      anchorX: x,
      anchorY: laneY,
      aimJitterSeed: urng() * 1000,
      rng: unitRng("aim/" + team + "/" + def.lane),
      rangeBias: 0,
      shots: 0,
      hits: 0,
      dodged: 0,
      nvx: 0,
      nvy: 0,
      orbitDir: urng() < 0.5 ? 1 : -1,
      aimTargetId: null,
      nextTargetId: null,
      targetNoise: {},
      damageDealt: 0,
      kills: 0,
      assists: 0,
      soloAssists: 0,
      sangStacks: s.sangStacks || 0,
      dealtBy: {},          // ป้ายแหล่งที่มา -> ดาเมจที่ทำได้
      takenBy: {},          // "ใคร|แหล่งที่มา" -> ดาเมจที่รับมา
      healGiven: 0,
      healTaken: 0,
      healedBy: {},
      shieldGiven: 0,
      shieldTaken: 0,
      shieldAbsorbed: 0,
      recentDamagers: {},
      gankKills: 0,
      retreating: false,
    };
  };
  blueDefs.forEach((d, i) => units.push(mk(d, "blue", i, blueDefs.length)));
  redDefs.forEach((d, i) => units.push(mk(d, "red", i, redDefs.length)));

  for (const u of units) {
    const r = unitRng("focus/" + u.id);
    for (const e of units) if (e.team !== u.team) u.targetNoise[e.id] = r() - 0.5;
  }

  // positioning quality -> how badly the unit misjudges its ideal range
  for (const u of units) {
    const pos = u.athlete.gameSense;
    u.rangeBias = (unitRng("bias/" + u.id)() * 2 - 1) * (10 - pos) * 62;
  }

  const ev = event || EVENTS.SKIRMISH;
  // เวลาไฟต์ยืดตามจำนวนคนที่ลงสนาม — 1v1 ได้ 30 วิ ทุกคนที่เพิ่มมาได้อีก 5 วิ
  // ไฟต์ใหญ่ต้องใช้เวลามากกว่า ส่วนไฟต์เลนสองคนไม่ควรยืดเยื้อ
  const duration = Math.max(20, 30 + 5 * (bodyCount - 2));
  return {
    t: 0,
    event: ev,
    timeLimit: duration,
    timeline: [],
    nextSample: 0,
    dmgSrc: null,
    srcUnit: null,
    rampStart: ev.noRamp ? 1e9 : duration * RAMP_FRAC,
    rampScale: ev.noRamp ? 1e9 : duration * RAMP_SCALE,
    endOnDeaths: ev.endOnDeaths || 0,
    units,
    projectiles: [],
    zones: [],
    snipes: [],
    castQueue: [],
    fields: [],
    dots: [],
    mageZones: [],
    hots: [],
    cages: [],
    crosses: [],
    waves: [],
    submerges: [],
    tethers: [],
    traps: [],
    clones: [],
    volleys: [],
    pulses: [],
    grabs: [],
    hurls: [],
    gardens: [],
    mirrors: [],
    hitQueue: [],
    fx: [],
    spawnQueue: [],
    log: [],
    over: false,
    winner: null,
    rng,
    nextProjId: 1,
  };
}
