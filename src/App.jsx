import { setLang } from "./i18n.js";
import React, { useState, useRef, useEffect } from "react";
import { SetupScreen } from "./screens/Setup.jsx";
import { MenuScreen, PlayMenuScreen } from "./screens/Menu.jsx";
import { PickScreen } from "./screens/Pick.jsx";
import { StoreScreen } from "./screens/Store.jsx";
import { ItemBookScreen } from "./screens/ItemBook.jsx";
import { SettingScreen } from "./screens/Setting.jsx";
import { PositionScreen } from "./screens/Position.jsx";
import { PlanScreen } from "./screens/Plan.jsx";
import { ShopPhase } from "./screens/Shop.jsx";
import { FightScreen } from "./screens/Fight.jsx";
import { ResultScreen } from "./screens/Result.jsx";
import { CHAMPIONS, LANE_CHAMPION } from "./data/champions.js";
import { LANES, STAT_KEYS } from "./data/constants.js";
import { CATEGORIES, ITEMS, ITEM_BY_ID, applyBuy, buyBlockedReason, effectiveCost, ownedParts, slotsUsedBy } from "./data/items.js";
import { LANE_INFO } from "./data/lanes.js";
import { shopFor } from "./game/shop-ai.js";
import { nextStreak, streakMods } from "./game/streak.js";
import { EVENTS, STYLES } from "./data/tuning.js";
import { DEFAULT_MODE, MODES } from "./data/modes.js";
import { buildFight } from "./engine/build-fight.js";
import { deriveStats } from "./engine/stats.js";
import { autoRanks, canRank, emptyRanks, pointsSpent } from "./engine/skill-ranks.js";
import { step } from "./engine/step.js";
import { levelProgress, mulberry32, xpToLevel } from "./engine/util.js";
import { summarizeFight } from "./game/report.js";
import { CHARS, MAX_ROUNDS, POINTS, STAT_CAP, STAT_DESC, STAT_SHORT, WINS_NEEDED, emptyStats, laneMax, makeRoster, randomSpread, toDef } from "./game/roster.js";
import { Arena } from "./ui/Arena.jsx";
import { Practice } from "./ui/Practice.jsx";
import { SkillModal } from "./ui/SkillInfo.jsx";
import { ShopScreen } from "./ui/ShopScreen.jsx";
import { Shell, btn, card, mini, slot } from "./ui/chrome.jsx";
import { C, MONO, SANS } from "./ui/theme.js";
import { Bar, Label, Pip } from "./ui/widgets.jsx";


// ---------------- App ----------------
export function App() {
  const [phase, setPhase] = useState("MENU");
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const rand = useRef(mulberry32(seed)).current;

  const [team, setTeam] = useState(() =>
    LANES.map((lane, i) => ({
      lane, char: CHARS[i], athleteName: "P" + (i + 1), champId: null,
      athlete: emptyStats(), level: 1, xp: 0, gold: 10, items: [], style: "POKE",
      ranks: emptyRanks(), autoLevel: true, bountyGold: 0, upgrades: [], buildPlan: [],
    }))
  );
  const [foe, setFoe] = useState(() => makeRoster(rand));
  const [round, setRound] = useState(1);
  const [score, setScore] = useState({ me: 0, foe: 0 });
  // ชนะ/แพ้ติดกันกี่ยก — บวก = ชนะรวด ลบ = แพ้รวด ใช้คิดภาษีชนะรวดกับเงินชดเชย
  const [streak, setStreak] = useState({ me: 0, foe: 0 });
  // ยกล่าสุดที่เลือกฟาร์ม — ใช้ห้ามฟาร์มติดกันสองยก
  const [lastFarm, setLastFarm] = useState(-1);
  const [teamStyle, setTeamStyle] = useState("POKE");
  const [eventId, setEventId] = useState("SKIRMISH");
  const [planIdx, setPlanIdx] = useState(0);
  const [planCatState, setPlanCatState] = useState({});
  const [speed, setSpeed] = useState(2);
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState(null);
  const [openShop, setOpenShop] = useState(null);
  const [shopCat, setShopCat] = useState("START");
  const [heldChamp, setHeldChamp] = useState(null);
  const [draftPool, setDraftPool] = useState([]);
  const [openRecipe, setOpenRecipe] = useState(null);
  const [shopItem, setShopItem] = useState(null);
  const [shopQuery, setShopQuery] = useState("");
  // รายการโปรด — แยกของใครของมัน { ช่องนักแข่ง: [id ไอเทม] }
  // ใช้ซื้อเร็วจากการ์ดนักแข่งโดยไม่ต้องเปิดร้าน
  const [favs, setFavs] = useState({});
  const [focusId, setFocusId] = useState(null);
  const [showRanges, setShowRanges] = useState(true);
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem("sideline.lang") === "th" ? "th" : "en"; } catch { return "en"; }
  });
  const [modeId, setModeId] = useState(DEFAULT_MODE);
  const [inspectId, setInspectId] = useState(null);      // ตัวละครที่กำลังดูข้อมูล
  const [storeLane, setStoreLane] = useState("TOP");
  const [bookCat, setBookCat] = useState("START");
  const [bookItem, setBookItem] = useState(null);
  const [bookQuery, setBookQuery] = useState("");
  const [skillView, setSkillView] = useState(null);       // โมดัลข้อมูลสกิลที่เปิดอยู่
  const [skillOrders, setSkillOrders] = useState({});    // ลำดับอัพสกิลที่ผู้เล่นตั้งเอง ต่อตัวละคร
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.innerWidth >= 820);
  const [scoutOpen, setScoutOpen] = useState(false);   // หน้าส่องทีมคู่แข่ง
  const [statsOpen, setStatsOpen] = useState(false);   // หน้ากราฟสรุปไฟต์
  const [history, setHistory] = useState([]);          // สรุปทุกยกในแมตช์นี้ ยกล่าสุดอยู่หน้าสุด

  const fightRef = useRef(null);
  const rafRef = useRef(null);
  const slowAcc = useRef(0);
  const arenaDrawRef = useRef(null);
  const lastHudRef = useRef(0);

  // ต้องตั้งภาษาก่อนที่หน้าจอลูกจะเรียก tr()
  setLang(lang);
  const changeLang = (l) => {
    setLang(l);
    setLangState(l);
    try { localStorage.setItem("sideline.lang", l); } catch { /* ไม่มีที่เก็บก็ไม่เป็นไร */ }
  };

  // เปิดหน้าข้อมูลสกิล — opts รับ ranks / ปุ่มอัพ ถ้าหน้านั้นอัพได้
  const openSkill = (champId, key, opts) => {
    if (!champId) return;
    setSkillView({ champId, key, ...(opts || {}) });
  };

  const mode = MODES[modeId] || MODES[DEFAULT_MODE];

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 820);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ลำดับอัพสกิลที่จะใช้จริง — ของผู้เล่นถ้าตั้งไว้ ไม่งั้นใช้ค่าแนะนำของตัวละคร
  const priorityOf = (champId) =>
    skillOrders[champId] || (CHAMPIONS[champId] || {}).skillPriority || ["Q", "W", "E"];

  const spent = (c) => STAT_KEYS.reduce((s, k) => s + c.athlete[k], 0);
  const ready = team.every((c) => spent(c) === POINTS);

  function bump(idx, key, d) {
    setTeam((t) =>
      t.map((c, i) => {
        if (i !== idx) return c;
        const v = c.athlete[key] + d;
        if (v < 0 || v > STAT_CAP) return c;
        if (d > 0 && spent(c) >= POINTS) return c;
        return { ...c, athlete: { ...c.athlete, [key]: v } };
      })
    );
  }

  function rollAll() {
    setTeam((t) => t.map((c) => ({ ...c, athlete: randomSpread(rand) })));
  }

  function rollOne(idx) {
    setTeam((t) => t.map((c, i) => (i === idx ? { ...c, athlete: randomSpread(rand) } : c)));
  }

  function clearOne(idx) {
    setTeam((t) => t.map((c, i) => (i === idx ? { ...c, athlete: emptyStats() } : c)));
  }

  function quickStart() {
    setTeam((t) => t.map((c) => ({ ...c, athlete: randomSpread(rand) })));
    setPhase("DRAFT");
  }

  function pickChamp(lane, id) {
    setTeam((t) => t.map((c) => (c.lane === lane ? { ...c, champId: id, ranks: emptyRanks() } : c)));
  }

  function addRank(idx, key) {
    setTeam((t) =>
      t.map((c, i) => {
        if (i !== idx) return c;
        if (!canRank(c.ranks, key, c.level)) return c;
        return { ...c, autoLevel: false, ranks: { ...c.ranks, [key]: c.ranks[key] + 1 } };
      })
    );
  }

  function resetRanks(idx) {
    setTeam((t) =>
      t.map((c, i) =>
        i === idx ? { ...c, autoLevel: true, ranks: autoRanks(c.level, priorityOf(c.champId), null) } : c
      )
    );
  }

  function restartMatch(keepAthletes) {
    setTeam((t) =>
      t.map((c) => ({
        ...c, level: 1, xp: 0, gold: 10, items: [], style: "POKE",
        athlete: keepAthletes ? c.athlete : emptyStats(),
      }))
    );
    setFoe(makeRoster(rand));
    setHistory([]);
    setScore({ me: 0, foe: 0 });
    setStreak({ me: 0, foe: 0 });
    setLastFarm(-1);
    setRound(1);
    setResult(null);
    setTeamStyle("POKE");
    setOpenShop(null);
    setPhase(keepAthletes ? "DRAFT" : "SETUP");
  }

  function slotsUsed(c) {
    return slotsUsedBy(c.items, c.lane);
  }

  const SELL_RATE = 0.7;
  const sellValue = (it) => Math.floor(it.cost * SELL_RATE);

  function sell(idx, item) {
    setTeam((t) =>
      t.map((c, i) => {
        if (i !== idx) return c;
        if (!c.items.some((x) => x.id === item.id)) return c;
        return { ...c, gold: c.gold + sellValue(item), items: c.items.filter((x) => x.id !== item.id) };
      })
    );
  }

  const favsOf = (idx) => favs[idx] || [];

  function toggleFav(idx, id) {
    setFavs((f) => {
      const own = f[idx] || [];
      return { ...f, [idx]: own.includes(id) ? own.filter((x) => x !== id) : [...own, id] };
    });
  }

  // ซื้อแล้วเอาออกจากรายการโปรดเลย (เฉพาะชิ้นที่ติดดาวไว้ ชิ้นส่วนไม่เกี่ยว)
  function dropFav(idx, id) {
    setFavs((f) => {
      const own = f[idx] || [];
      if (!own.includes(id)) return f;
      return { ...f, [idx]: own.filter((x) => x !== id) };
    });
  }

  function buy(idx, item) {
    setTeam((t) => t.map((c, i) => (i === idx ? applyBuy(c, item) : c)));
    dropFav(idx, item.id);
  }

  function foeShop(list, enemies) {
    return list.map((c) => {
      let cur = shopFor(c, enemies, rand);
      const bc = CHAMPIONS[cur.champId] && CHAMPIONS[cur.champId].bounty;
      if (bc) {
        let bg = cur.bountyGold || 0;
        const ups = [...(cur.upgrades || [])];
        for (const k of ["Q", "R", "E", "W"]) {
          if (bg >= 100 && !ups.includes(k)) { bg -= 100; ups.push(k); }
        }
        cur = { ...cur, bountyGold: bg, upgrades: ups };
      }
      return cur;
    });
  }

  // ฝ่ายตรงข้ามซื้อของ + อัพสกิลตั้งแต่ "ต้นยก" ไม่ใช่ตอนกดเริ่มไฟต์
  // เพื่อให้หน้าส่องทีมคู่แข่งเห็นของจริงที่กำลังจะเจอ ไม่ใช่ของยกที่แล้ว
  function prepFoeForRound() {
    const foeStyle = ["ENGAGE", "POKE", "HOLD"][Math.floor(rand() * 3)];
    setFoe((prev) =>
      foeShop(prev.map((c) => ({ ...c, style: foeStyle })), team).map((c) => {
        const champId = c.champId || LANE_CHAMPION[c.lane];
        return { ...c, champId, ranks: autoRanks(c.level, CHAMPIONS[champId].skillPriority, null) };
      })
    );
  }

  function startMatch() {
    setFavs({});
    prepFoeForRound();
    setPhase("SHOP");
  }

  // ---- ยกฟาร์ม: ข้ามการปะทะ ทั้งสองฝั่งได้เงิน/XP บางส่วน ไม่มีใครชนะหรือแพ้
  // สถิติชนะรวด/แพ้รวดไม่ขยับ และไม่มีเงินตลาดมืด เพราะไม่ได้ออกไปสู้จริง
  function farmRound() {
    const f = EVENTS[eventId].farm;
    const grow = (list) => list.map((c) => {
      let xp = 2 * f.xpPct;
      let gold = 6 * f.goldPct;
      if (c.lane === "TOP") xp += 1;
      if (c.lane === "ADC") gold += 2;
      gold += c.items.reduce((a, i) => a + (i.goldPerRound || 0), 0);
      xp = Math.max(1, Math.round(xp * mode.xp));
      gold = Math.max(1, Math.round(gold * mode.gold));
      const nxp = c.xp + xp;
      const lvl = xpToLevel(nxp, laneMax(c.lane));
      const pri = priorityOf(c.champId);
      return {
        ...c, xp: nxp, gold: c.gold + gold, level: lvl,
        ranks: c.autoLevel ? autoRanks(lvl, pri, null) : c.ranks,
      };
    });
    const nextMe = grow(team);
    setTeam(nextMe);
    setFoe(grow(foe));
    setLastFarm(round);
    setResult({
      farm: true, iWon: false, time: 0,
      mods: { goldMul: 1, xpMul: 1, bonusGold: 0, bonusXp: 0, wins: 0, losses: 0 },
      foeMods: { goldMul: 1, xpMul: 1, bonusGold: 0, bonusXp: 0, wins: 0, losses: 0 },
      streak,
      rows: team.map((c, i) => ({
        char: c.char, lane: c.lane, alive: true, kills: 0, assists: 0,
        earned: nextMe[i].gold - c.gold, dmg: 0, hits: 0, shots: 0, dodged: 0,
      })),
      log: [],
    });
    setScoutOpen(false);
    setPhase(round >= mode.maxRounds ? "MATCH_OVER" : "RESULT");
  }

  function startFight() {
    setStatsOpen(false);
    setScoutOpen(false);
    // ฟาร์มติดกันสองยกไม่ได้ และยกตัดสินต้องสู้ — ถ้าเลือกค้างไว้ให้ตกกลับเป็นปะทะกลางสนาม
    let ev = EVENTS[eventId] || EVENTS.SKIRMISH;
    if (ev.farm) {
      if (lastFarm !== round - 1 && round < mode.maxRounds) { farmRound(); return; }
      ev = EVENTS.SKIRMISH;
      setEventId("SKIRMISH");
    }
    const me = team.map((c) => ({ ...c, style: teamStyle, champId: c.champId || LANE_CHAMPION[c.lane] }));
    const shopped = foe.map((c) => {
      const champId = c.champId || LANE_CHAMPION[c.lane];
      return { ...c, champId, ranks: autoRanks(c.level, CHAMPIONS[champId].skillPriority, null) };
    });
    setTeam(me);
    setFoe(shopped);
    fightRef.current = buildFight(me.map(toDef), shopped.map(toDef), Math.floor(rand() * 1e9), ev);
    setPhase("FIGHT");
  }

  useEffect(() => {
    if (phase !== "FIGHT") return;
    let stop = false;
    const loop = () => {
      if (stop) return;
      const st = fightRef.current;
      if (st && !st.over) {
        if (speed < 1) {
          slowAcc.current += speed;
          if (slowAcc.current >= 1) { slowAcc.current -= 1; step(st); }
        } else {
          for (let i = 0; i < speed; i++) { if (!st.over) step(st); }
        }
        if (arenaDrawRef.current) arenaDrawRef.current();
        const now = Date.now();
        if (now - lastHudRef.current > 140) { lastHudRef.current = now; setTick((t) => t + 1); }
        rafRef.current = requestAnimationFrame(loop);
      } else {
        finish();
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { stop = true; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line
  }, [phase, speed]);

  function finish() {
    const st = fightRef.current;
    if (!st) return;
    const iWon = st.winner === "blue";

    const myMods = streakMods(streak.me, iWon);
    const foeMods = streakMods(streak.foe, !iWon);

    const award = (list, side, won, mods) =>
      list.map((c) => {
        const u = st.units.find((x) => x.team === side && x.lane === c.lane);
        // รายได้ต่อยก — ตัวเลขฐานก่อนคูณอัตราของโหมด
        // ลดลงจากเดิม (12/9 ฐาน, คิล 6, ช่วยฆ่า 2) เพราะของขึ้นไวเกินไป
        let xp = won ? 3 : 2;
        let gold = won ? 8 : 6;
        // โบนัสประจำเลน — ต้องตรงกับข้อความ passive ใน data/lanes.js
        if (c.lane === "TOP") xp += 1;
        if (c.lane === "ADC") gold += 2;
        gold += c.items.reduce((a, i) => a + (i.goldPerRound || 0), 0);
        if (u) {
          gold += u.kills * 4 + u.assists * 1;
          if (u.gankKills) { xp += u.gankKills; gold += u.gankKills * 1; }
        }
        let bg = c.bountyGold || 0;
        const bc = CHAMPIONS[c.champId] && CHAMPIONS[c.champId].bounty;
        if (bc && u) bg += bc.perRound + u.kills * bc.perKill + u.assists * bc.perAssist + (u.bountyGold || 0);
        // ระบบรั้งคะแนน — ชนะรวดโดนหักรายได้ พลิกจากแพ้รวดได้เงิน/XP ชดเชย
        xp = xp * mods.xpMul + mods.bonusXp;
        gold = gold * mods.goldMul + mods.bonusGold;
        // โหมดคุมอัตราเงิน/XP — ปัดขึ้นอย่างน้อย 1 เพื่อไม่ให้ยกนั้นได้ 0
        xp = Math.max(1, Math.round(xp * mode.xp));
        gold = Math.max(1, Math.round(gold * mode.gold));
        bg = Math.round(bg * mode.gold);
        const nxp = c.xp + xp;
        const lvl = xpToLevel(nxp, laneMax(c.lane));
        const pri = side === "blue" ? priorityOf(c.champId) : ((CHAMPIONS[c.champId] || {}).skillPriority || ["Q", "W", "E"]);
        // Wendigo's Voracious Claw สะสม AD ข้ามยก — เก็บแต้มที่ได้ยกนี้ไว้กับตัวนักแข่ง
        const wvcCap = c.items.reduce((m, i) => Math.max(m, (i.adPerKill && i.adPerKill.max) || 0), 0);
        const wvc = Math.min(wvcCap, (c.wvcStacks || 0) + ((u && u.wvcGained) || 0));
        // Lorla — Max HP ถาวรที่กินได้ยกนี้ สะสมข้ามยกจนถึงเพดานของพาสซีฟ
        const sangCap = ((CHAMPIONS[c.champId] || {}).sanguine || {}).max || 0;
        const sang = Math.min(sangCap, (c.sangHp || 0) + ((u && u.sangGained) || 0));
        return {
          ...c, xp: nxp, gold: c.gold + gold, level: lvl,
          ranks: c.autoLevel ? autoRanks(lvl, pri, null) : c.ranks,
          bountyGold: bg,
          wvcStacks: wvc,
          sangHp: sang,
        };
      });

    const nextMe = award(team, "blue", iWon, myMods);
    const nextFoe = award(foe, "red", !iWon, foeMods);
    // เงินที่ได้จริงหลังคูณอัตราโหมด (เอาไปโชว์ในหน้าสรุป)
    const goldGain = {};
    team.forEach((c, i) => { goldGain[c.lane] = nextMe[i].gold - c.gold; });
    const ns = { me: score.me + (iWon ? 1 : 0), foe: score.foe + (iWon ? 0 : 1) };

    setResult({
      iWon,
      time: st.t,
      mods: myMods,
      foeMods,
      streak: { me: nextStreak(streak.me, iWon), foe: nextStreak(streak.foe, !iWon) },
      rows: st.units.filter((u) => u.team === "blue").map((u) => ({
        char: u.char, lane: u.lane, alive: u.alive, kills: u.kills, assists: u.assists,
        earned: goldGain[u.lane] || 0,
        dmg: Math.round(u.damageDealt), hits: u.hits, shots: u.shots, dodged: u.dodged || 0,
      })),
      log: st.log.slice(-8),
    });
    setScoutOpen(false);
    setHistory((h) => [summarizeFight(st, round, eventId, teamStyle), ...h]);
    setTeam(nextMe);
    setFoe(nextFoe);
    setScore(ns);
    setStreak({ me: nextStreak(streak.me, iWon), foe: nextStreak(streak.foe, !iWon) });
    setPhase(ns.me >= mode.wins || ns.foe >= mode.wins || round >= mode.maxRounds ? "MATCH_OVER" : "RESULT");
  }

  function nextRound() {
    setStatsOpen(false);
    setRound((r) => r + 1);
    setResult(null);
    prepFoeForRound();
    setPhase("SHOP");
  }



  // ทุกหน้าจอใช้ ctx ก้อนเดียวกัน — เพิ่ม state ใหม่แล้วอย่าลืมใส่ในนี้ด้วย
  const ctx = {
    addRank, arenaDrawRef, bump, buy, clearOne, draftPool,
    eventId, fightRef, focusId, foe, heldChamp, nextRound,
    openRecipe, openShop, phase, planCatState, planIdx, quickStart,
    rand, ready, resetRanks, restartMatch, result, rollAll,
    rollOne, round, score, streak, lastFarm, sell, sellValue, setDraftPool,
    setEventId, setFocusId, setFoe, setHeldChamp, setOpenRecipe, setOpenShop,
    setPhase, setPlanCatState, setPlanIdx, setShopCat, setShowRanges, setSpeed,
    setTeam, setTeamStyle, shopCat, showRanges, slotsUsed, speed,
    scoutOpen, setScoutOpen, startMatch, statsOpen, setStatsOpen, history,
    mode, modeId, setModeId, wide, lang, changeLang, inspectId, setInspectId,
    storeLane, setStoreLane, bookCat, setBookCat, bookItem, setBookItem,
    bookQuery, setBookQuery, shopItem, setShopItem, shopQuery, setShopQuery,
    favs, favsOf, toggleFav,
    skillOrders, setSkillOrders, priorityOf, openSkill, setSkillView,
    spent, startFight, team, teamStyle, tick,
  };

  const screen = (() => {
    if (phase === "MENU") return MenuScreen(ctx);
    if (phase === "PLAY_MENU") return PlayMenuScreen(ctx);
    if (phase === "STORE") return StoreScreen(ctx);
    if (phase === "ITEMBOOK") return ItemBookScreen(ctx);
    if (phase === "SETTING") return SettingScreen(ctx);
    if (phase === "SETUP") return SetupScreen(ctx);
    if (phase === "PRACTICE") return <Practice onExit={() => setPhase("PLAY_MENU")} openSkill={openSkill} />;
    if (phase === "DRAFT") return PickScreen(ctx);
    if (phase === "POSITION") return PositionScreen(ctx);
    if (phase === "PLAN") return PlanScreen(ctx);
    if (phase === "SHOP") return ShopPhase(ctx);
    if (phase === "FIGHT") return FightScreen(ctx);
    return ResultScreen(ctx);
  })();

  // โมดัลข้อมูลสกิลอยู่ชั้นบนสุด เปิดได้จากทุกหน้า
  // ถ้าเปิดจากคนในทีม (teamIdx) ให้อ่านแรงก์สดๆ ทุกครั้ง เพื่ออัพต่อได้ทันทีในโมดัล
  const liveSkillView = skillView && skillView.teamIdx != null
    ? (() => {
        const c = team[skillView.teamIdx];
        if (!c || !c.champId) return skillView;
        return {
          ...skillView,
          champId: c.champId,
          ranks: c.ranks,
          // ค่าสถานะจริงของตัวนี้ตอนนี้ (รวมไอเทมที่ถืออยู่) เพื่อดูคู่กับตัวเลขสกิล
          stats: deriveStats(toDef(c)),
          level: c.level,
          canUpgrade: canRank(c.ranks, skillView.key, c.level),
          onUpgrade: (key) => addRank(skillView.teamIdx, key),
        };
      })()
    : skillView;

  return (
    <>
      {screen}
      <SkillModal
        view={liveSkillView}
        onPick={(key) => setSkillView((v) => (v ? { ...v, key } : v))}
        onClose={() => setSkillView(null)}
      />
    </>
  );
}
