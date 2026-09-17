import { setLang, tr } from "./i18n.js";
import React, { useState, useRef, useEffect } from "react";
import { SetupScreen } from "./screens/Setup.jsx";
import { MenuScreen, PlayMenuScreen } from "./screens/Menu.jsx";
import { PickScreen } from "./screens/Pick.jsx";
import { StoreScreen } from "./screens/Store.jsx";
import { ItemBookScreen } from "./screens/ItemBook.jsx";
import { PatchScreen } from "./screens/Patch.jsx";
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
import { botSpread, draftFoe } from "./game/bot-draft.js";
import { STANCE_LANES, LANE_MEMBERS, KILL, ASSIST_SOLO, ASSIST_GROUP, SAFE_STAND_SECONDS, crewAllowed, stanceLaneOf } from "./data/behaviour.js";
import { DIFFS, diffOf } from "./data/difficulty.js";
import { buildRoundPlan, foeIncome } from "./game/round-plan.js";
import { botJungle, botStances } from "./game/stance-ai.js";
import { LanesScreen } from "./screens/Lanes.jsx";
import { createPeer } from "./net/peer.js";
import { hostRoom, joinRoom, normCode } from "./net/room.js";
import { MSG, packTeam, unpackTeam } from "./net/protocol.js";
import { OnlineScreen } from "./screens/Online.jsx";
import { WatchScreen } from "./screens/Watch.jsx";
import { DEFAULT_FIGHT, STYLES } from "./data/tuning.js";
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
import { StatSheetModal } from "./ui/StatSheet.jsx";
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
  // ฝ่ายตรงข้ามดราฟต์ทีมใหม่ทุกแมตช์ และแต้มนักแข่งไม่สุ่มมั่วแล้ว
  const [foe, setFoe] = useState(() => makeRoster(rand, draftFoe(rand), botSpread));
  const [round, setRound] = useState(1);
  const [score, setScore] = useState({ me: 0, foe: 0 });
  // ชนะ/แพ้ติดกันกี่ยก — บวก = ชนะรวด ลบ = แพ้รวด ใช้คิดภาษีชนะรวดกับเงินชดเชย
  const [streak, setStreak] = useState({ me: 0, foe: 0 });
  const [teamStyle, setTeamStyle] = useState("POKE");
  // ---- นิสัยประจำเลน: สั่งใหม่ได้ทุกยก ----
  const [diffId, setDiffId] = useState("NORMAL");
  const [stances, setStances] = useState({ TOP: "NEUTRAL", MID: "NEUTRAL", BOT: "NEUTRAL" });
  // นิสัยของยกที่แล้ว — ใช้ตัดสินว่าป่าลงแกงค์เลนไหนได้บ้าง
  const [lastStances, setLastStances] = useState(null);
  const [foeLastStances, setFoeLastStances] = useState(null);
  const [jungle, setJungle] = useState({ lane: null, crew: [] });
  const [plan, setPlan] = useState(null);          // แผนของยกนี้ หลังรวมนิสัยสองฝั่งแล้ว
  const [laneDone, setLaneDone] = useState({});    // ผลไฟต์ของแต่ละเลนที่ดูไปแล้ว
  const [activeLane, setActiveLane] = useState(null);
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
    // คีย์เดิมตั้งแต่ตอนเกมยังชื่อ SIDELINE — คงไว้เพื่อไม่ให้ภาษาที่ตั้งไว้หายตอนเปลี่ยนชื่อเกม
    try { return localStorage.getItem("sideline.lang") === "th" ? "th" : "en"; } catch { return "en"; }
  });
  const [modeId, setModeId] = useState(DEFAULT_MODE);
  const [inspectId, setInspectId] = useState(null);      // ตัวละครที่กำลังดูข้อมูล
  const [storeLane, setStoreLane] = useState("TOP");
  const [bookCat, setBookCat] = useState("START");
  const [bookItem, setBookItem] = useState(null);
  const [bookQuery, setBookQuery] = useState("");
  const [patchOpen, setPatchOpen] = useState(null);   // แพตช์ที่กำลังเปิดอ่าน
  const [statView, setStatView] = useState(null);     // แผงค่าสถานะของนักแข่งที่เปิดดูอยู่
  const [skillView, setSkillView] = useState(null);       // โมดัลข้อมูลสกิลที่เปิดอยู่
  const [skillOrders, setSkillOrders] = useState({});    // ลำดับอัพสกิลที่ผู้เล่นตั้งเอง ต่อตัวละคร
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.innerWidth >= 820);
  const [scoutOpen, setScoutOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  // ---- เล่นกับเพื่อน: ต่อตรงสองเครื่อง เจ้าบ้านเป็นคนรันไฟต์ ----
  // role: solo = เจ้าบ้านลงเล่นเอง 1v1 · watch = เจ้าบ้านเป็นคนดู ผู้เล่นสองคนสู้กัน · guest = ผู้เข้าร่วม
  const [net, setNet] = useState({
    on: false, stage: "idle", isHost: false, role: "solo", side: "blue",
    link: "room",   // room = รหัสห้องสั้นๆ · code = แลกโค้ดยาวด้วยมือ
    room: "", myCode: "", codes: ["", ""], joined: [false, false], error: "", peerReady: false,
  });
  const [netPaste, setNetPaste] = useState("");
  const [netPaste2, setNetPaste2] = useState("");   // ช่องวางโค้ดของผู้เล่นคนที่สองในห้องแบบนั่งดู
  const [netBusy, setNetBusy] = useState(false);
  const peerRef = useRef(null);
  const peersRef = useRef([]);   // เจ้าบ้านแบบคนดูถือสองสายพร้อมกัน
  const roomRef = useRef(null);  // ห้องแบบรหัสสั้น — ต้องปิด broker ตอนออก
  const netRef = useRef({ theirTeam: null, pending: null, teams: [null, null], stances: [null, null], jungles: [null, null] });
  // ค่าสดของยกปัจจุบัน — ตัวจัดการข้อความของสายต้องอ่านจากตรงนี้เท่านั้น
  const liveRef = useRef({});   // หน้าส่องทีมคู่แข่ง
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
  // เปิดแผงค่าสถานะของนักแข่งคนหนึ่ง — คิดค่าสถานะสดจากเลเวลและไอเทมที่ถืออยู่ตอนนี้
  const openStats = (c) => {
    if (!c || !c.champId) return;
    setStatView({
      champId: c.champId, lane: c.lane, level: c.level,
      athlete: c.athlete, items: c.items || [], stats: deriveStats(toDef(c)),
    });
  };

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
    const d0 = diffOf(diffId);
    setFoe(makeRoster(rand, draftFoe(rand, d0.variety, d0.offRole), (r, id) => botSpread(r, id, d0.floor)));
    setStances({ TOP: "NEUTRAL", MID: "NEUTRAL", BOT: "NEUTRAL" });
    setLastStances(null);
    setFoeLastStances(null);
    setJungle({ lane: null, crew: [] });
    setPlan(null);
    setLaneDone({});
    setActiveLane(null);
    setHistory([]);
    setScore({ me: 0, foe: 0 });
    setStreak({ me: 0, foe: 0 });
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

  // สลับลำดับในรายการโปรด — ลำดับคือ "แผนออกของ" ชิ้นบนสุดคือชิ้นที่ตั้งใจออกก่อน
  function moveFav(idx, id, dir) {
    setFavs((f) => {
      const own = [...(f[idx] || [])];
      const i = own.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= own.length) return f;
      own[i] = own[j]; own[j] = id;
      return { ...f, [idx]: own };
    });
  }

  // ล้างรายการโปรดของตัวนั้นทั้งแผง
  function clearFavs(idx) { setFavs((f) => ({ ...f, [idx]: [] })); }

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
      let cur = shopFor(c, enemies, rand, diffOf(diffId).shopNoise);
      const bc = CHAMPIONS[cur.champId] && CHAMPIONS[cur.champId].bounty;
      if (bc) {
        let bg = cur.bountyGold || 0;
        const ups = [...(cur.upgrades || [])];
        for (const k of ["Q", "R", "E", "W"]) {
          if (bg >= bc.price && !ups.includes(k)) { bg -= bc.price; ups.push(k); }
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

  // ---------------------------------------------------------------
  // เล่นกับเพื่อน — แลกโค้ดต่อตรง ไม่ผ่านเซิร์ฟเวอร์
  //   เจ้าบ้านเป็นคนรันเอนจินฝั่งเดียว แล้วส่ง seed + ทีมทั้งสองฝั่งให้อีกเครื่อง
  //   อีกเครื่องรันจาก seed เดียวกัน จึงเห็นไฟต์เดียวกันเป๊ะและพร้อมกัน
  // ---------------------------------------------------------------
  liveRef.current = { team, teamStyle, modeId, stances, jungle };

  // slot = ช่องผู้เล่นที่สายนี้ผูกอยู่ (ใช้เฉพาะห้องแบบเจ้าบ้านเป็นคนดู)
  function netHandlers(slot = 0) {
    return {
      onOpen: () => setNet((n) => {
        const joined = n.joined.slice();
        joined[slot] = true;
        const done = n.role === "watch" ? joined[0] && joined[1] : true;
        return { ...n, joined, stage: done ? "ready" : n.stage, error: "" };
      }),
      onClose: () => setNet((n) => (n.stage === "idle" ? n : { ...n, error: tr("สายหลุด — ต้องต่อใหม่") })),
      onMessage: (m) => {
        if (m.k === MSG.READY) {
          const t = unpackTeam(m.team);
          netRef.current.teams[slot] = t;
          netRef.current.stances[slot] = m.stances || null;
          netRef.current.jungles[slot] = m.jungle || null;
          netRef.current.theirTeam = t;
          netRef.current.theirStances = m.stances || null;
          netRef.current.theirJungle = m.jungle || null;
          setNet((n) => ({ ...n, peerReady: true }));
          // ห้องแบบคนดู: พอได้ทีมครบสองฝั่งก็เริ่มไฟต์ได้เลย
          if (netRef.current.watching && netRef.current.teams[0] && netRef.current.teams[1]) {
            startWatchedFight();
          } else if (!netRef.current.watching && netRef.current.isHost && netRef.current.iReadied) {
            // เจ้าบ้านกดพร้อมไปก่อนแล้ว รอทีมอีกฝั่งอยู่ — มาถึงแล้วก็เริ่มเลย
            // เดิมมีแต่ทางที่อีกฝั่งพร้อมก่อน ถ้าเจ้าบ้านกดก่อนจะค้างกันทั้งคู่
            hostStartNetFight();
          }
        } else if (m.k === MSG.START) {
          // ผู้เข้าร่วม: รับคำสั่งเริ่มแล้วรันไฟต์ชุดเดียวกัน
          runNetFight(m.seed, unpackTeam(m.other), m.side, m.stances, m.jungle);
        } else if (m.k === MSG.HELLO) {
          if (m.modeId) setModeId(m.modeId);
          setNet((n) => ({ ...n, side: m.side || "red" }));
          setPhase("SETUP");
        }
      },
    };
  }

  // เจ้าบ้านแบบคนดู: สุ่ม seed แล้วส่งให้ผู้เล่นทั้งสอง จากนั้นรันไฟต์ดูเองด้วย
  function startWatchedFight() {
    const [a, b] = netRef.current.teams;
    const [sa, sb] = netRef.current.stances;
    const [ja, jb] = netRef.current.jungles;
    if (!a || !b) return;
    const seed = Math.floor(rand() * 1e9);
    const dflt = { TOP: "NEUTRAL", MID: "NEUTRAL", BOT: "NEUTRAL" };
    const dj = { lane: null, crew: [] };
    const ps = peersRef.current;
    if (ps[0]) ps[0].send({ k: MSG.START, seed, side: "blue", other: packTeam(b), stances: sb || dflt, jungle: jb || dj });
    if (ps[1]) ps[1].send({ k: MSG.START, seed, side: "red", other: packTeam(a), stances: sa || dflt, jungle: ja || dj });
    netRef.current.teams = [null, null];
    netRef.current.stances = [null, null];
    netRef.current.jungles = [null, null];
    setTeam(a);
    // คนดูมองจากมุมผู้เล่นคนที่ 1 (ฝั่งน้ำเงิน) เสมอ
    setStances(sa || dflt);
    setJungle(ja || dj);
    setNet((n) => ({ ...n, waiting: false, peerReady: false }));
    lockStances({ seed, foeTeam: b, foeStances: sb || dflt, foeJungle: jb || dj });
  }

  // ---- จับคู่ด้วยรหัสห้องสั้นๆ ----
  //   เจ้าบ้านจองรหัสไว้กับ broker แล้วรอคนพิมพ์รหัสเข้ามา
  //   ตัวไฟต์ยังวิ่งตรงระหว่างเครื่องเหมือนเดิม broker ใช้แค่ตอนหากันให้เจอ
  async function netStartRoom(role) {
    setNetBusy(true);
    netReset(true);
    netRef.current.watching = role === "watch";
    netRef.current.isHost = true;
    try {
      const r = await hostRoom((i) => netHandlers(i), role === "watch" ? 2 : 1);
      roomRef.current = r;
      peersRef.current = r.links;   // อาเรย์เดียวกัน เดี๋ยวมีคนเข้ามันจะโตเอง
      setNet({
        on: true, stage: "hosting", isHost: true, role,
        side: role === "watch" ? "watch" : "blue",
        link: "room", room: r.code, myCode: "", codes: ["", ""],
        joined: [false, false], error: "", peerReady: false,
      });
    } catch (e) {
      setNet((n) => ({ ...n, stage: "idle", error: tr("เปิดห้องไม่สำเร็จ: {0}", String(e.message || e.type || e)) }));
    }
    setNetBusy(false);
  }

  async function netJoinRoom(code) {
    setNetBusy(true);
    netReset(true);
    try {
      const p = await joinRoom(code, netHandlers(0));
      peerRef.current = p;
      peersRef.current = [p];
      setNet({
        on: true, stage: "ready", isHost: false, role: "guest", side: "red",
        link: "room", room: normCode(code), myCode: "", codes: ["", ""],
        joined: [true, false], error: "", peerReady: false,
      });
      setNetPaste("");
    } catch (e) {
      setNet((n) => ({ ...n, stage: "idle", error: tr("เข้าห้องไม่สำเร็จ: {0}", String(e.message || e.type || e)) }));
    }
    setNetBusy(false);
  }

  function netSetLink(link) { netReset(); setNet((n) => ({ ...n, link })); }

  async function netStart() {
    setNetBusy(true);
    netReset(true);
    const p = createPeer(netHandlers(0));
    peerRef.current = p;
    peersRef.current = [p];
    netRef.current.isHost = true;
    try {
      const code = await p.createOffer();
      setNet({
        on: true, stage: "hosting", isHost: true, role: "solo", side: "blue",
        link: "code", room: "", myCode: code, codes: [code, ""], joined: [false, false], error: "", peerReady: false,
      });
    } catch (e) {
      setNet((n) => ({ ...n, error: tr("สร้างห้องไม่สำเร็จ: {0}", String(e.message || e)) }));
    }
    setNetBusy(false);
  }

  // ห้องแบบเจ้าบ้านนั่งดู — สร้างสองสาย คนละโค้ด ให้ผู้เล่นสองคนคนละก้อน
  async function netStartWatch() {
    setNetBusy(true);
    netReset(true);
    netRef.current.watching = true;
    try {
      const a = createPeer(netHandlers(0));
      const b = createPeer(netHandlers(1));
      peersRef.current = [a, b];
      peerRef.current = a;
      // สร้างพร้อมกันสองสาย — ถ้ารอทีละก้อนจะเสียเวลาเก็บเส้นทางซ้ำสองรอบ
      const [ca, cb] = await Promise.all([a.createOffer(), b.createOffer()]);
      setNet({
        on: true, stage: "hosting", isHost: true, role: "watch", side: "watch",
        link: "code", room: "", myCode: "", codes: [ca, cb], joined: [false, false], error: "", peerReady: false,
      });
    } catch (e) {
      setNet((n) => ({ ...n, error: tr("สร้างห้องไม่สำเร็จ: {0}", String(e.message || e)) }));
    }
    setNetBusy(false);
  }

  // เจ้าบ้านวางโค้ดตอบกลับของผู้เล่นคนที่ i
  async function netAcceptSlot(i, code) {
    const p = peersRef.current[i];
    if (!p) return;
    setNetBusy(true);
    try { await p.acceptAnswer(code); (i === 0 ? setNetPaste : setNetPaste2)(""); } catch (e) {
      setNet((n) => ({ ...n, error: tr("โค้ดตอบกลับใช้ไม่ได้: {0}", String(e.message || e)) }));
    }
    setNetBusy(false);
  }

  async function netJoin(code) {
    setNetBusy(true);
    netReset(true);
    const p = createPeer(netHandlers());
    peerRef.current = p;
    try {
      const ans = await p.joinWithOffer(code);
      setNet({
        on: true, stage: "joining", isHost: false, role: "guest", side: "red",
        link: "code", room: "", myCode: ans, codes: ["", ""], joined: [false, false], error: "", peerReady: false,
      });
      setNetPaste("");
    } catch (e) {
      setNet((n) => ({ ...n, stage: "idle", error: tr("โค้ดใช้ไม่ได้: {0}", String(e.message || e)) }));
    }
    setNetBusy(false);
  }

  async function netAccept(code) {
    const p = peerRef.current;
    if (!p) return;
    setNetBusy(true);
    try { await p.acceptAnswer(code); setNetPaste(""); } catch (e) {
      setNet((n) => ({ ...n, error: tr("โค้ดตอบกลับใช้ไม่ได้: {0}", String(e.message || e)) }));
    }
    setNetBusy(false);
  }

  function netReset(quiet) {
    for (const p of peersRef.current) { try { p.close(); } catch { /* ปิดไปแล้ว */ } }
    if (roomRef.current) { try { roomRef.current.close(); } catch { /* ปิดไปแล้ว */ } }
    roomRef.current = null;
    peersRef.current = [];
    peerRef.current = null;
    netRef.current = { theirTeam: null, pending: null, teams: [null, null], stances: [null, null], jungles: [null, null], watching: false, isHost: false, iReadied: false, myReady: null };
    setNetPaste("");
    setNetPaste2("");
    if (!quiet) setNet((n) => ({
      on: false, stage: "idle", isHost: false, role: "solo", side: "blue",
      link: n.link, room: "", myCode: "", codes: ["", ""], joined: [false, false],
      error: "", peerReady: false,
    }));
  }

  // เจ้าบ้านกดเริ่มแมตช์ — ทั้งสองฝั่งเข้าหน้าเลือกตัวของตัวเอง
  function netBegin() {
    const ps = peersRef.current;
    if (net.role === "watch") {
      if (ps[0]) ps[0].send({ k: MSG.HELLO, modeId, side: "blue" });
      if (ps[1]) ps[1].send({ k: MSG.HELLO, modeId, side: "red" });
      setPhase("WATCH");   // เจ้าบ้านไม่ได้ลงเล่น รอดูอย่างเดียว
      return;
    }
    if (ps[0]) ps[0].send({ k: MSG.HELLO, modeId, side: "red" });
    setPhase("SETUP");
  }

  // เจ้าบ้านสั่งเริ่มไฟต์ของยกนี้ — ใช้ได้ทั้งตอนกดพร้อมทีหลังอีกฝั่ง และตอนกดพร้อมไปก่อน
  // แยกออกมาเพราะต้องเรียกได้จากสองที่: ปุ่มพร้อม กับตอนทีมอีกฝั่งวิ่งมาถึงทีหลัง
  function hostStartNetFight() {
    const p = peerRef.current || peersRef.current[0];
    const mine = netRef.current.myReady;
    if (!p || !p.open || !mine || !netRef.current.theirTeam) return false;
    const seed = Math.floor(rand() * 1e9);
    p.send({
      k: MSG.START, seed, side: "red", other: mine.team,
      stances: mine.stances, jungle: mine.jungle,
    });
    netRef.current.iReadied = false;
    runNetFight(seed, netRef.current.theirTeam, "blue",
      netRef.current.theirStances, netRef.current.theirJungle);
    return true;
  }

  // ยกนี้พร้อมแล้ว — ส่งทีมให้อีกฝั่ง ถ้าเป็นเจ้าบ้านและอีกฝั่งพร้อมแล้วก็เริ่มได้เลย
  function netReadyUp() {
    // เจ้าบ้านแบบรหัสห้องเก็บสายไว้ที่ peersRef เท่านั้น ไม่ได้เซ็ต peerRef
    // เดิมตรงนี้อ่านแต่ peerRef แล้วคืน false ปุ่มเลยตกไปเริ่มไฟต์แบบออฟไลน์
    // ผลคือเจ้าบ้านเดินหน้าไปคนเดียว ส่วนอีกฝั่งรอ START ที่ไม่มีวันมา
    const p = peerRef.current || peersRef.current[0];
    if (!p || !p.open) return false;
    const live = liveRef.current;
    const me = live.team.map((c) => ({ ...c, style: live.teamStyle, champId: c.champId || LANE_CHAMPION[c.lane] }));
    const packed = { team: packTeam(me), stances: live.stances, jungle: live.jungle };
    netRef.current.myReady = packed;
    netRef.current.iReadied = true;
    p.send({ k: MSG.READY, ...packed });
    if (net.isHost && net.role !== "watch" && netRef.current.theirTeam && hostStartNetFight()) return true;
    setNet((n) => ({ ...n, waiting: true }));
    return true;
  }

  // รันไฟต์ของโหมดออนไลน์ — ทั้งสองเครื่องเรียกด้วย seed และทีมชุดเดียวกัน
  function runNetFight(seed, otherTeam, side, otherStances, otherJungle) {
    netRef.current.iReadied = false;
    netRef.current.myReady = null;
    setFoe(otherTeam);
    setNet((n) => ({ ...n, side, waiting: false, peerReady: false }));
    netRef.current.theirTeam = null;
    lockStances({
      seed, foeTeam: otherTeam,
      foeStances: otherStances || { TOP: "NEUTRAL", MID: "NEUTRAL", BOT: "NEUTRAL" },
      foeJungle: otherJungle || { lane: null, crew: [] },
    });
  }

  function startMatch() {
    // แผนของที่วางไว้ก่อนเข้าแมตช์กลายเป็นรายการโปรดของแต่ละคนทันที
    // เมื่อก่อนแผนถูกทิ้งตอนเริ่มแมตช์ ผู้เล่นเลยต้องมานั่งกดโปรดใหม่ทั้งทีม
    const seeded = {};
    team.forEach((c, i) => { if ((c.buildPlan || []).length) seeded[i] = [...c.buildPlan]; });
    setFavs(seeded);
    prepFoeForRound();
    setPhase("SHOP");
  }

  // ---- ยกฟาร์ม: ข้ามการปะทะ ทั้งสองฝั่งได้เงิน/XP บางส่วน ไม่มีใครชนะหรือแพ้
  // สถิติชนะรวด/แพ้รวดไม่ขยับ และไม่มีเงินตลาดมืด เพราะไม่ได้ออกไปสู้จริง
  // ออกจากร้านค้า -> ปิดคำสั่งของยกนี้แล้วดูว่าเกิดอะไรขึ้นบ้าง
  function startFight() {
    setStatsOpen(false);
    setScoutOpen(false);
    lockStances();
  }

  // สั่งนิสัยครบแล้ว — รวมกับนิสัยฝั่งบอท แล้วดูว่ายกนี้จะเกิดอะไรบ้าง
  function lockStances(netPlan) {
    const me = team.map((c) => ({ ...c, style: teamStyle, champId: c.champId || LANE_CHAMPION[c.lane] }));
    const foeSrc = (netPlan && netPlan.foeTeam) || foe;
    const shopped = foeSrc.map((c) => {
      const champId = c.champId || LANE_CHAMPION[c.lane];
      return { ...c, champId, ranks: autoRanks(c.level, CHAMPIONS[champId].skillPriority, null) };
    });
    setTeam(me);
    setFoe(shopped);

    const d = diffOf(diffId);
    const fs = (netPlan && netPlan.foeStances) || botStances(rand, shopped, me, d.stanceSkill, round);
    const fj = (netPlan && netPlan.foeJungle) || botJungle(rand, shopped, me, fs, foeLastStances, d.stanceSkill, round);

    const p = buildRoundPlan({ stances, foeStances: fs, jungle, foeJungle: fj, round });
    p.foeStances = fs;
    p.foeJungleLane = fj.lane;
    p.foeJungleCrew = fj.crew || [];
    p.seed = (netPlan && netPlan.seed) != null ? netPlan.seed : Math.floor(rand() * 1e9);
    setPlan(p);
    setLaneDone({});
    setActiveLane(null);
    setPhase("LANES");
  }

  // เริ่มไฟต์ของเลนเดียว — ผู้เล่นกดเลือกเองว่าจะดูอันไหนก่อน
  function startLaneFight(L) {
    if (!plan) return;
    const l = plan.lanes[L];
    if (!l || !l.fight || laneDone[L]) return;
    // เลนที่ยืนรับแกงค์แบบเซฟได้นาฬิกาสั้น — ยื้อให้พ้นเวลาก็พอ ไม่ต้องชนะ
    const ev = l.safeStand ? { ...DEFAULT_FIGHT, fixedDuration: SAFE_STAND_SECONDS } : DEFAULT_FIGHT;
    const side = (roster, keys, tag) => keys
      .map((k) => roster.find((x) => x.lane === k))
      .filter(Boolean)
      .map((c) => ({ def: toDef({ ...c, style: tag === "blue" ? teamStyle : c.style }), hurt: l.hurt[tag + ":" + c.lane] || 0 }));
    const mine = side(team, l.blue, "blue");
    const theirs = side(foe, l.red, "red");
    if (!mine.length || !theirs.length) return;
    // ออนไลน์: ผู้เข้าร่วมเป็นฝั่งแดงของเอนจิน ต้องเรียงน้ำเงินก่อนเสมอ ผลจึงตรงกันสองเครื่อง
    const amBlue = !net.on || net.side !== "red";
    const myTeam = amBlue ? "blue" : "red";
    // seed ของแต่ละเลนต่างกัน แต่คิดจาก seed เดียวของยก ทั้งสองเครื่องจึงได้ไฟต์เดียวกัน
    const seed = plan.seed + STANCE_LANES.indexOf(L) * 7919;
    const st = amBlue
      ? buildFight(mine.map((b) => b.def), theirs.map((r) => r.def), seed, ev)
      : buildFight(theirs.map((r) => r.def), mine.map((b) => b.def), seed, ev);
    // เสียเลือดก่อนเริ่มจากการโดนดัก/ล้ำเกิน
    for (const b of mine) {
      if (!b.hurt) continue;
      const u = st.units.find((x) => x.lane === b.def.lane && x.team === myTeam);
      if (u) u.hp = Math.max(1, Math.round(u.maxHp * (1 - b.hurt)));
    }
    for (const r of theirs) {
      if (!r.hurt) continue;
      const u = st.units.find((x) => x.lane === r.def.lane && x.team !== myTeam);
      if (u) u.hp = Math.max(1, Math.round(u.maxHp * (1 - r.hurt)));
    }
    fightRef.current = st;
    setActiveLane(L);
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

  // จบไฟต์ของเลนหนึ่ง — เก็บผลไว้ แล้วกลับไปหน้าเลือกเลนถัดไป
  function finish() {
    const st = fightRef.current;
    if (!st || !activeLane) return;
    const mySide = net.on ? (net.side === "red" ? "red" : "blue") : "blue";
    const iWon = st.winner === mySide;
    const L = activeLane;
    const rec = {
      lane: L,
      iWon,
      time: st.t,
      rows: st.units.filter((u) => u.team === mySide).map((u) => ({
        char: u.char, lane: u.lane, alive: u.alive, kills: u.kills, assists: u.assists,
        dmg: Math.round(u.damageDealt), hits: u.hits, shots: u.shots, dodged: u.dodged || 0,
      })),
      // ค่าที่ต้องเอาไปบวกเข้ากระเป๋าตอนจบยก เก็บแยกตามเลนของนักแข่ง
      units: st.units.map((u) => ({
        team: u.team, lane: u.lane, alive: u.alive, kills: u.kills, assists: u.assists,
        wvcGold: u.wvcGold || 0, bountyGold: u.bountyGold || 0, sangGained: u.sangGained || 0,
      })),
      log: st.log.slice(-6),
    };
    setHistory((h) => [summarizeFight(st, round, activeLane, teamStyle), ...h]);
    setLaneDone((d) => ({ ...d, [L]: rec }));
    setActiveLane(null);
    setStatsOpen(false);
    setPhase("LANES");
  }

  // ทุกไฟต์ของยกนี้ดูครบแล้ว — จ่ายเงิน/XP ตามตารางนิสัย แล้วสรุปยก
  function closeRound(doneMap) {
    if (!plan) return;
    const done = doneMap || laneDone;
    const income = {};
    const foeInc = {};
    for (const k of Object.keys(plan.income)) income[k] = { ...plan.income[k] };
    const fi = foeIncome(plan);
    for (const k of Object.keys(fi)) foeInc[k] = { ...fi[k] };

    // ---- ยืนรับแกงค์แบบเซฟ: ยื้อจนหมดเวลาแล้วยังมีคนรอด = ฝ่ายที่มาแกงค์เสียยกฟรี
    // ตัดรายได้ของป่าฝั่งนั้นและของคนที่ถูกดึงมาช่วย เพื่อให้การไล่แกงค์ซ้ำมีราคา
    const myLane = net.on && net.side === "red" ? "red" : "blue";
    for (const L of STANCE_LANES) {
      const l = plan.lanes[L];
      const r = done[L];
      if (!l || !l.safeStand || !r) continue;
      const defSide = l.safeStand === "me" ? myLane : (myLane === "blue" ? "red" : "blue");
      const held = r.units.some((u) => u.team === defSide && LANE_MEMBERS[L].includes(u.lane) && u.alive);
      if (!held) continue;
      const atkIsMe = l.safeStand === "foe";
      const bag = atkIsMe ? income : foeInc;
      const crew = atkIsMe ? (jungle.crew || []) : (plan.foeJungleCrew || []);
      bag.JUNGLE = { gold: 0, xp: 0 };
      for (const c of crew) for (const m of LANE_MEMBERS[c] || []) bag[m] = { gold: 0, xp: 0 };
    }

    let laneWins = 0, laneLoss = 0;
    for (const L of STANCE_LANES) {
      const r = done[L];
      if (!r) continue;
      if (r.iWon) laneWins++; else laneLoss++;
    }
    const iWon = laneWins > laneLoss;
    const drawn = laneWins === laneLoss;

    // รวมค่าที่ได้จากทุกไฟต์ของยกนี้ ต่อหนึ่งนักแข่ง
    const perUnit = {};
    for (const L of Object.keys(done)) {
      for (const u of done[L].units) {
        const k = u.team + ":" + u.lane;
        const cur = perUnit[k] || { kills: 0, assists: 0, soloAssists: 0, wvcGold: 0, bountyGold: 0, sangGained: 0, alive: true };
        cur.kills += u.kills; cur.assists += u.assists; cur.soloAssists += (u.soloAssists || 0);
        cur.wvcGold += u.wvcGold; cur.bountyGold += u.bountyGold; cur.sangGained += u.sangGained;
        cur.alive = cur.alive && u.alive;
        perUnit[k] = cur;
      }
    }

    const award = (list, side, inc) => list.map((c) => {
      const u = perUnit[side + ":" + c.lane];
      const src = inc[c.lane] || { gold: 0, xp: 0 };
      // เงินจากศพ — สังหาร 6g 1xp · ช่วยสังหารคนเดียว 3g 1xp · ช่วยกันหลายคน 1g 1xp
      const solo = u ? u.soloAssists : 0;
      const shared = u ? Math.max(0, u.assists - solo) : 0;
      let kg = u ? u.kills * KILL.gold + solo * ASSIST_SOLO.gold + shared * ASSIST_GROUP.gold : 0;
      const kx = u ? u.kills * KILL.xp + solo * ASSIST_SOLO.xp + shared * ASSIST_GROUP.xp : 0;
      // พาสซีฟบอท — เอดีซีได้เงินเพิ่ม 1 ต่อทุกอย่าง ทั้งรายได้เลน สังหาร และช่วยสังหาร
      let laneBonus = 0;
      if (c.lane === "ADC") {
        if (src.gold > 0) laneBonus += 1;
        if (u) laneBonus += u.kills + u.assists;
      }
      kg += laneBonus;
      // พาสซีฟซัพพอร์ต — ไม่มีรายได้เลนของตัวเอง ไปรับส่วนแบ่งจากเอดีซีแทน (คิดทีหลัง)
      const laneGold = c.lane === "SUPPORT" ? 0 : Math.max(0, src.gold);
      // พาสซีฟท็อป — ได้ XP เพิ่มอีก 1 ทุกยก และดันเลเวลได้ถึง 20
      const laneXp = Math.max(0, src.xp) + (c.lane === "TOP" ? 1 : 0);
      const xp = Math.max(0, Math.round((laneXp + kx) * mode.xp));
      let gold = Math.max(0, Math.round((laneGold + kg) * mode.gold));
      let bg = c.bountyGold || 0;
      const bc = CHAMPIONS[c.champId] && CHAMPIONS[c.champId].bounty;
      // Plunder — จบยกได้เงินกระเป๋าแยกเสมอ ไม่ต้องลงไฟต์ · สังหาร/ช่วยได้เพิ่ม · คริสะสมมาจากในไฟต์
      if (bc) bg += bc.perRound + (u ? u.kills * bc.perKill + u.assists * bc.perAssist + u.bountyGold : 0);
      bg = Math.round(bg * mode.gold);
      gold += Math.round((u && u.wvcGold) || 0);
      const nxp = c.xp + xp;
      const lvl = xpToLevel(nxp, laneMax(c.lane));
      const pri = side === "blue" ? priorityOf(c.champId) : ((CHAMPIONS[c.champId] || {}).skillPriority || ["Q", "W", "E"]);
      // Sanguine Aristocracy — สแตกถาวร จบยกได้อีก 5 เสมอ ไม่ต้องลงไฟต์
      const sg = (CHAMPIONS[c.champId] || {}).sanguine;
      const sangCap = (sg && sg.max) || 0;
      const sangRaw = (c.sangHp || 0) + ((u && u.sangGained) || 0) + (sg ? (sg.perRound || 0) : 0);
      const sang = sangCap > 0 ? Math.min(sangCap, sangRaw) : sangRaw;
      return {
        ...c, xp: nxp, gold: c.gold + gold, level: lvl,
        ranks: c.autoLevel ? autoRanks(lvl, pri, null) : c.ranks,
        bountyGold: bg, sangHp: sang,
      };
    });

    // พาสซีฟซัพพอร์ต — รับครึ่งหนึ่งของเงินที่เอดีซีได้ยกนี้ (ปัดลง) บวกอีก 1 ทุกสองยก
    // ซัพไม่มีรายได้เลนของตัวเอง เลยผูกกับว่าเลนบอทไปได้ดีแค่ไหน
    const shareToSupport = (before, after) => {
      const adcBefore = before.find((c) => c.lane === "ADC");
      const iAdc = before.findIndex((c) => c.lane === "ADC");
      const iSup = before.findIndex((c) => c.lane === "SUPPORT");
      if (!adcBefore || iAdc < 0 || iSup < 0) return after;
      const adcGain = after[iAdc].gold - adcBefore.gold;
      const share = Math.floor(Math.max(0, adcGain) / 2) + (round % 2 === 0 ? 1 : 0);
      const out = after.slice();
      out[iSup] = { ...out[iSup], gold: out[iSup].gold + share };
      return out;
    };

    const mySide = net.on ? (net.side === "red" ? "red" : "blue") : "blue";
    const foeSide = mySide === "blue" ? "red" : "blue";
    const nextMe = shareToSupport(team, award(team, mySide, income));
    const nextFoe = shareToSupport(foe, award(foe, foeSide, foeInc));
    const goldGain = {};
    team.forEach((c, i) => { goldGain[c.lane] = nextMe[i].gold - c.gold; });
    const ns = {
      me: score.me + (iWon ? 1 : 0),
      foe: score.foe + (!iWon && !drawn ? 1 : 0),
    };

    const rows = team.map((c) => {
      const u = perUnit[mySide + ":" + c.lane];
      return {
        char: c.char, lane: c.lane, alive: u ? u.alive : true,
        kills: u ? u.kills : 0, assists: u ? u.assists : 0,
        earned: goldGain[c.lane] || 0,
        dmg: 0, hits: 0, shots: 0, dodged: 0,
        fought: !!u,
      };
    });
    for (const L of Object.keys(done)) {
      for (const r of done[L].rows) {
        const row = rows.find((x) => x.lane === r.lane);
        if (row) { row.dmg += r.dmg; row.hits += r.hits; row.shots += r.shots; row.dodged += r.dodged; }
      }
    }

    setResult({
      iWon, drawn, laneWins, laneLoss,
      time: Object.values(done).reduce((a, r) => a + r.time, 0),
      byLane: STANCE_LANES.map((L) => ({
        lane: L,
        mine: plan.lanes[L].mine,
        theirs: plan.lanes[L].theirs,
        fought: !!done[L],
        iWon: done[L] ? done[L].iWon : null,
        notes: plan.lanes[L].notes,
      })),
      mods: { goldMul: 1, xpMul: 1, bonusGold: 0, bonusXp: 0, wins: 0, losses: 0 },
      foeMods: { goldMul: 1, xpMul: 1, bonusGold: 0, bonusXp: 0, wins: 0, losses: 0 },
      streak: drawn ? streak : { me: nextStreak(streak.me, iWon), foe: nextStreak(streak.foe, !iWon) },
      rows,
      log: Object.values(done).flatMap((r) => r.log).slice(-8),
    });
    setScoutOpen(false);
    setTeam(nextMe);
    setFoe(nextFoe);
    setScore(ns);
    setLastStances({ ...stances });
    setFoeLastStances({ ...plan.foeStances });
    if (!drawn) setStreak({ me: nextStreak(streak.me, iWon), foe: nextStreak(streak.foe, !iWon) });
    if (net.on && net.role === "watch") { setRound((r) => r + 1); setPhase("WATCH"); return; }
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
    fightRef, focusId, foe, heldChamp, nextRound,
    openRecipe, openShop, phase, planCatState, planIdx, quickStart,
    rand, ready, resetRanks, restartMatch, result, rollAll,
    formOpen, setFormOpen,
    net, netStart, netStartWatch, netJoin, netAccept, netAcceptSlot, netReset, netBegin, netReadyUp,
    netStartRoom, netJoinRoom, netSetLink,
    netPaste, setNetPaste, netPaste2, setNetPaste2, netBusy,
    // ฝั่งของผู้เล่นในไฟต์ — ออนไลน์ผู้เข้าร่วมจะเป็นฝั่งแดง
    mySide: net.on ? (net.side === "red" ? "red" : "blue") : "blue",
    rollOne, round, score, streak, sell, sellValue, setDraftPool,
    setFocusId, setFoe, setHeldChamp, setOpenRecipe, setOpenShop,
    setPhase, setPlanCatState, setPlanIdx, setShopCat, setShowRanges, setSpeed,
    setTeam, setTeamStyle, shopCat, showRanges, slotsUsed, speed,
    scoutOpen, setScoutOpen, startMatch, statsOpen, setStatsOpen, history,
    mode, modeId, setModeId, wide, lang, changeLang, inspectId, setInspectId,
    storeLane, setStoreLane, bookCat, setBookCat, bookItem, setBookItem,
    bookQuery, setBookQuery, shopItem, setShopItem, shopQuery, setShopQuery,
    patchOpen, setPatchOpen, statView, setStatView, openStats,
    favs, favsOf, toggleFav, moveFav, clearFavs,
    skillOrders, setSkillOrders, priorityOf, openSkill, setSkillView,
    spent, startFight, team, teamStyle, tick,
    diffId, setDiffId, DIFFS,
    stances, setStances, lastStances, foeLastStances, jungle, setJungle,
    plan, laneDone, activeLane, lockStances, startLaneFight, closeRound,
  };

  const screen = (() => {
    if (phase === "MENU") return MenuScreen(ctx);
    if (phase === "PLAY_MENU") return PlayMenuScreen(ctx);
    if (phase === "STORE") return StoreScreen(ctx);
    if (phase === "ITEMBOOK") return ItemBookScreen(ctx);
    if (phase === "PATCH") return PatchScreen(ctx);
    if (phase === "ONLINE") return OnlineScreen(ctx);
    if (phase === "WATCH") return WatchScreen(ctx);
    if (phase === "SETTING") return SettingScreen(ctx);
    if (phase === "SETUP") return SetupScreen(ctx);
    if (phase === "PRACTICE") return <Practice onExit={() => setPhase("PLAY_MENU")} openSkill={openSkill} />;
    if (phase === "DRAFT") return PickScreen(ctx);
    if (phase === "POSITION") return PositionScreen(ctx);
    if (phase === "PLAN") return PlanScreen(ctx);
    if (phase === "SHOP") return ShopPhase(ctx);
    if (phase === "LANES") return LanesScreen(ctx);
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
      <StatSheetModal view={statView} onClose={() => setStatView(null)} />
    </>
  );
}
