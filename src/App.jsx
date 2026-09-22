import { setLang, tr } from "./i18n.js";
import React, { useState, useRef, useEffect } from "react";
import { SetupScreen } from "./screens/Setup.jsx";
import { MenuScreen, PlayMenuScreen } from "./screens/Menu.jsx";
import { PickScreen } from "./screens/Pick.jsx";
import { DraftScreen } from "./screens/Draft.jsx";
import { StoreScreen } from "./screens/Store.jsx";
import { ItemBookScreen } from "./screens/ItemBook.jsx";
import { PatchScreen } from "./screens/Patch.jsx";
import { EconomyScreen } from "./screens/Economy.jsx";
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
import { assignLanes, botBan, botPickOne, botSpread, draftFoe } from "./game/bot-draft.js";
import { draftApply, draftMove, draftPicksOf, draftTaken, draftTurn, makeDraftQueue, newDraft } from "./game/draft.js";
import { STANCE_LANES, crewAllowed, stanceLaneOf } from "./data/behaviour.js";
import { DIFFS, diffOf } from "./data/difficulty.js";
import { buildRoundPlan } from "./game/round-plan.js";
import { buildLaneFight, recordLaneFight } from "./game/lane-fight.js";
import { settleRound } from "./game/settle.js";
import { botJungle, botStances } from "./game/stance-ai.js";
import { LanesScreen } from "./screens/Lanes.jsx";
import { createPeer } from "./net/peer.js";
import { hostRoom, joinRoom, normCode } from "./net/room.js";
import { MSG, packTeam, unpackTeam } from "./net/protocol.js";
import { OnlineScreen } from "./screens/Online.jsx";
import { WatchScreen } from "./screens/Watch.jsx";
import { STYLES } from "./data/tuning.js";
import { DEFAULT_MODE, MODES } from "./data/modes.js";
import { deriveStats } from "./engine/stats.js";
import { autoRanks, canRank, emptyRanks, pointsSpent } from "./engine/skill-ranks.js";
import { step } from "./engine/step.js";
import { levelProgress, mulberry32 } from "./engine/util.js";
import { summarizeFight } from "./game/report.js";
import { CHARS, MAX_ROUNDS, POINTS, STAT_CAP, STAT_DESC, STAT_SHORT, WINS_NEEDED, emptyStats, makeRoster, randomSpread, toDef } from "./game/roster.js";
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
  // หน้าอธิบายระบบเงิน — จำไว้ว่าเปิดมาจากหน้าไหน จะได้กลับไปที่เดิม
  const [econFrom, setEconFrom] = useState("MENU");
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
  // ดูไฟต์พร้อมกัน (ออนไลน์) — lane = เลนที่เจ้าบ้านเลือกไว้ · peers = ผู้เล่นแต่ละช่องกดพร้อมดูแล้วหรือยัง
  // me = เรา (ผู้เข้าร่วม) กดพร้อมดูแล้วหรือยัง · เก็บคู่กับ ref เพราะตัวรับข้อความจำ state เก่า
  const [watchSync, setWatchSync] = useState({ lane: null, peers: [false, false], me: false });
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
  // รูปแบบการเลือกตัว — BLIND (แบบเดิม) · DRAFT (ผลัดกันเลือก) · TOURNEY (แบน 3 ก่อน)
  const [draftStyle, setDraftStyle] = useState("BLIND");
  const [draft, setDraft] = useState(null);
  const [foeDraft, setFoeDraft] = useState(null);        // ตัวที่ฝ่ายตรงข้ามดราฟต์ได้
  // ข่าวกรองฝ่ายตรงข้าม — ถ่ายภาพไว้ตอนปิดยก แล้วค่อยให้ส่องดูในยกถัดไป
  // ยกแรกจึงยังไม่มีอะไรให้ดู เพราะเขายังไม่ได้เปิดของอะไรเลย
  const [foeIntel, setFoeIntel] = useState(null);
  const [buyUndo, setBuyUndo] = useState([]);   // ย้อนการซื้อของยกนี้ได้ (ล้างเมื่อเริ่มไฟต์)
  const [inspectId, setInspectId] = useState(null);      // ตัวละครที่กำลังดูข้อมูล
  // ตัวกรองตารางตัวละคร — หน้าจอเป็นฟังก์ชันธรรมดาไม่มีฮุค สเตตเลยต้องอยู่ตรงนี้
  const [pickQuery, setPickQuery] = useState("");
  const [pickLane, setPickLane] = useState("ALL");
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
  const netRef = useRef({ theirTeam: null, pending: null, teams: [null, null], stances: [null, null], jungles: [null, null], online: false, mySide: "A" });
  // กระจกของดราฟต์ — ข้อความจากสายมาถึงตอนไหนก็ได้ ต้องตัดสินตาเดินได้ทันทีโดยไม่รอ render
  const draftRef = useRef(null);
  // ตาเดินของอีกฝั่งที่มาถึงก่อนเราจะกดเข้าหน้าดราฟต์ — เก็บไว้ลงทีหลังให้ครบ
  const draftQueueRef = useRef(makeDraftQueue());
  // ค่าสดของยกปัจจุบัน — ตัวจัดการข้อความของสายต้องอ่านจากตรงนี้เท่านั้น
  const liveRef = useRef({});   // หน้าส่องทีมคู่แข่ง
  const watchRef = useRef({ lane: null, peers: [false, false], me: false });
  const speedRef = useRef(2);
  const fightLaneRef = useRef(null);   // เลนของไฟต์ที่กำลังเล่นอยู่ — ใช้เช็คตอนเจ้าบ้านส่งเวลามาให้ตาม
  const fnRef = useRef({});             // ฟังก์ชันของ render ล่าสุด ให้ตัวรับข้อความเรียกได้
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
    startDraft(draftStyle);
  }

  function pickChamp(lane, id) {
    setTeam((t) => t.map((c) => (c.lane === lane ? { ...c, champId: id, ranks: emptyRanks() } : c)));
  }

  // ---------------- โหมดดราฟต์ (Patch 0.3) ----------------
  // ฝ่ายตรงข้ามเป็นบอท มันจึงลงมือทันทีหลังเรากด — ผู้เล่นเห็นผลแบบเรียลไทม์
  function botSteps(d0) {
    let d = d0;
    const dv = diffOf(diffId).variety;
    let guard = 0;
    while (guard++ < 30) {
      const turn = draftTurn(d);
      if (!turn || turn.side !== "B") break;
      const taken = draftTaken(d);
      const id = turn.kind === "ban"
        ? botBan(rand, taken)
        : botPickOne(rand, taken, draftPicksOf(d, "B"), dv);
      if (!id) break;
      d = draftApply(d, id, turn.kind === "ban"
        ? tr("🔴 ฝ่ายตรงข้ามแบน {0}", id)
        : tr("🔴 ฝ่ายตรงข้ามเลือก {0}", id));
    }
    return d;
  }

  // ---- ดราฟต์ข้ามเครื่อง ----
  // ฝั่ง A = เจ้าบ้าน (First Pick) · ฝั่ง B = ผู้เข้าร่วม
  // ห้องแบบเจ้าบ้านนั่งดู เจ้าบ้านไม่ได้ดราฟต์เอง แต่ทำหน้าที่ส่งตาเดินต่อให้ผู้เล่นอีกคน
  const draftOnline = () => !!(netRef.current.online && !netRef.current.watching);
  const mySide = () => netRef.current.mySide || "A";
  const foeSide = () => (mySide() === "A" ? "B" : "A");

  function pushDraft(d) { draftRef.current = d; setDraft(d); }

  function draftNote(side, kind, champId) {
    const mine = side === mySide();
    if (kind === "ban") {
      return mine ? tr("🔵 คุณแบน {0}", champId) : tr("🔴 ฝ่ายตรงข้ามแบน {0}", champId);
    }
    return mine ? tr("🔵 คุณเลือก {0}", champId) : tr("🔴 ฝ่ายตรงข้ามเลือก {0}", champId);
  }

  // ลงตาเดินหนึ่งก้าว — คืน false ถ้ายังไม่ถึงตานั้น (ตัวเรียกจะได้เก็บไว้ลองใหม่)
  function tryDraft(champId, side) {
    const after = draftMove(draftRef.current, champId, side, (kind) => draftNote(side, kind, champId));
    if (!after) return false;
    const next = draftOnline() ? after : botSteps(after);
    pushDraft(next);
    // ดราฟต์จบแล้ว — ส่งตัวที่ได้ไปให้หน้าจัดตำแหน่ง
    if (!draftTurn(next)) {
      setDraftPool(draftPicksOf(next, mySide()));
      setFoeDraft(draftPicksOf(next, foeSide()));
    }
    return true;
  }

  const drainDraft = () => draftQueueRef.current.drain(tryDraft);

  function startDraft(style) {
    setDraftStyle(style);
    setFoeDraft(null);
    const online = draftOnline();
    const d0 = style === "BLIND" ? null : (online ? newDraft(style) : botSteps(newDraft(style)));
    pushDraft(d0);
    setTeam((t) => t.map((c) => ({ ...c, champId: null, ranks: emptyRanks() })));
    setHeldChamp(null);
    setPhase("DRAFT");
    // เจ้าบ้านอาจลงมือไปก่อนแล้วตอนเรายังอยู่หน้าสร้างทีม — ลงตาที่ค้างให้ครบ
    if (online && d0) drainDraft();
  }

  function draftAct(champId) {
    if (!tryDraft(champId, mySide())) return;
    if (!draftOnline()) return;
    const p = peerRef.current || peersRef.current[0];
    if (p && p.open) p.send({ k: MSG.DRAFT, champId, side: mySide() });
  }

  function draftBack() {
    // ออนไลน์ถอยคนเดียวไม่ได้ อีกฝั่งจะค้างรอตาที่ไม่มีวันมา
    if (draftOnline()) return;
    if (draftStyle === "BLIND") { setPhase("SETUP"); return; }
    pushDraft(botSteps(newDraft(draftStyle)));
    setFoeDraft(null);
    setDraftPool([]);
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

  // Blind Pick — ฝ่ายตรงข้ามสุ่มทีมใหม่ตอนเราจัดเลนเสร็จ
  // เดิมหน้า POSITION สับรายชื่อตัวละครทั้งหมดแล้วยัดลงเลนตามลำดับดัชนี ไม่ดูเลยว่าตัวนั้นลงเลนนั้นได้ไหม
  // ทีมที่ draftFoe คัดมาให้ถูกเลนตั้งแต่ต้นแมตช์เลยถูกทับทิ้งทุกครั้ง — เจอ ADC ไปยืนท็อปประจำ
  function rerollFoe() {
    const d0 = diffOf(diffId);
    const spots = draftFoe(rand, d0.variety, d0.offRole);
    setFoe((f) => f.map((c) => {
      const s = spots.find((x) => x.lane === c.lane);
      return { ...c, champId: s ? s.champId : c.champId, ranks: emptyRanks() };
    }));
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

  // ซื้อผิดชิ้นแล้วขายคืนได้แค่บางส่วน และชิ้นส่วนที่ถูกกลืนเข้าสูตรก็หายไปแล้ว
  // เลยเก็บภาพก่อนซื้อไว้ให้ย้อนได้เต็มราคา — ใช้ได้เฉพาะก่อนเริ่มไฟต์ของยกนั้น
  function buy(idx, item) {
    const before = (liveRef.current && liveRef.current.team ? liveRef.current.team : team)[idx];
    if (before) {
      setBuyUndo((u) => [
        ...u.slice(-19),
        { idx, gold: before.gold, items: [...(before.items || [])], favs: [...(favs[idx] || [])], name: item.th },
      ]);
    }
    setTeam((t) => t.map((c, i) => (i === idx ? applyBuy(c, item) : c)));
    dropFav(idx, item.id);
  }

  // PUSS — โค้ชสั่งเองว่ายกนี้จะไปท้าดวลเลนไหนของอีกฝั่ง
  // กดซ้ำเลนเดิม = ยกเลิกคำสั่ง กลับไปให้เขาเลือกเป้าที่อันตรายที่สุดเอง
  // เนิร์ฟ: เลือกแล้วติดคูลดาวน์การเลือก 2 ยก · เป้าที่เพิ่งเก็บไปเลือกซ้ำไม่ได้
  function setDuelLane(idx, lane) {
    setTeam((t) => t.map((c, i) => {
      if (i !== idx) return c;
      if (round < (c.duelLockUntil || 0)) return c;
      if (lane && c.duelLane !== lane && (c.duelBan || {})[lane]) return c;
      return { ...c, duelLane: c.duelLane === lane ? null : lane };
    }));
  }

  function undoBuy() {
    setBuyUndo((u) => {
      if (!u.length) return u;
      const last = u[u.length - 1];
      setTeam((t) => t.map((c, i) => (i === last.idx ? { ...c, gold: last.gold, items: [...last.items] } : c)));
      setFavs((f) => ({ ...f, [last.idx]: [...last.favs] }));
      return u.slice(0, -1);
    });
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
  // ทุกอย่างที่ตัวจัดการข้อความของสายต้องใช้ ต้องอยู่ในนี้ให้ครบ
  // เพราะ handler ถูกสร้างตอนต่อสายครั้งเดียว มันเลยจำ state ของ render แรกไว้ตลอด
  // (render แรก = แต้มนักแข่งยังเป็น 0 และยังไม่ได้เลือกตัวละคร)
  liveRef.current = { team, teamStyle, modeId, stances, jungle, foe, round, diffId, foeLastStances };
  speedRef.current = speed;
  fnRef.current = { startLaneFight };

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
        } else if (m.k === MSG.DRAFT) {
          if (netRef.current.watching) {
            // เจ้าบ้านนั่งดูไม่ได้ดราฟต์เอง — ส่งตาเดินต่อให้ผู้เล่นอีกคน
            const other = peersRef.current[1 - slot];
            if (other && other.open) other.send(m);
          } else {
            draftQueueRef.current.push(m.champId, m.side || foeSide());
            drainDraft();
          }
        } else if (m.k === MSG.WATCH_READY) {
          // เจ้าบ้าน: ผู้เล่นช่องนี้กดพร้อมดูแล้ว
          const peers = watchRef.current.peers.slice();
          peers[slot] = !!m.ready;
          pushWatch({ ...watchRef.current, peers });
          hostTryGo();
        } else if (m.k === MSG.WATCH) {
          // ผู้เข้าร่วม: เจ้าบ้านเลือกเลน หรือสั่งเริ่มดู
          if (m.go) {
            resetWatch();
            if (m.speed) setSpeed(m.speed);
            fnRef.current.startLaneFight(m.lane);
          } else {
            pushWatch({ ...watchRef.current, lane: m.lane });
          }
        } else if (m.k === MSG.SPEED) {
          setSpeed(m.v);
          catchUpTo(m.lane, m.t || 0);
        } else if (m.k === MSG.SYNC) {
          catchUpTo(m.lane, m.t || 0);
        } else if (m.k === MSG.START) {
          // ผู้เข้าร่วม: รับคำสั่งเริ่มแล้วรันไฟต์ชุดเดียวกัน
          runNetFight(m.seed, unpackTeam(m.other), m.side, m.stances, m.jungle);
        } else if (m.k === MSG.HELLO) {
          if (m.modeId) setModeId(m.modeId);
          // วิธีเลือกตัวของแมตช์นี้เจ้าบ้านเป็นคนกำหนด สองเครื่องต้องใช้ชุดเดียวกัน
          if (m.draftStyle) setDraftStyle(m.draftStyle);
          netRef.current.online = true;
          netRef.current.mySide = m.side === "red" ? "B" : "A";
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
    lockStances({
      seed, foeTeam: b, foeStances: sb || dflt, foeJungle: jb || dj,
      mine: { rows: a, stances: sa || dflt, jungle: ja || dj, teamStyle: (a[0] && a[0].style) || null },
    });
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
    netRef.current = { theirTeam: null, pending: null, teams: [null, null], stances: [null, null], jungles: [null, null], watching: false, isHost: false, iReadied: false, myReady: null, online: false, mySide: "A" };
    draftQueueRef.current.clear();
    watchRef.current = { lane: null, peers: [false, false], me: false };
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
    netRef.current.online = true;
    if (net.role === "watch") {
      if (ps[0]) ps[0].send({ k: MSG.HELLO, modeId, side: "blue", draftStyle });
      if (ps[1]) ps[1].send({ k: MSG.HELLO, modeId, side: "red", draftStyle });
      setPhase("WATCH");   // เจ้าบ้านไม่ได้ลงเล่น รอดูอย่างเดียว
      return;
    }
    netRef.current.mySide = "A";
    if (ps[0]) ps[0].send({ k: MSG.HELLO, modeId, side: "red", draftStyle });
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
    // ส่ง ranks ที่ "แก้แล้ว" ออกไป ไม่ใช่ค่าดิบ — อีกฝั่งจะได้ใช้ต่อได้เลยโดยไม่ต้องเดาเอง
    const me = live.team.map((c) => {
      const champId = c.champId || LANE_CHAMPION[c.lane];
      return {
        ...c, style: live.teamStyle, champId,
        ranks: c.autoLevel ? autoRanks(c.level, priorityOf(champId), null) : c.ranks,
      };
    });
    // สแนปช็อตนี้คือ "สิ่งที่อีกฝั่งจะเห็น" — ตอนไฟต์เริ่ม เครื่องเราต้องใช้ชุดเดียวกันนี้ด้วย
    // ไม่ใช่ของที่ผู้เล่นแก้หลังกดพร้อม ไม่งั้นสองเครื่องเล่นกันคนละยก
    const packed = {
      team: packTeam(me),
      stances: { ...live.stances },
      jungle: { lane: live.jungle.lane, crew: [...(live.jungle.crew || [])] },
      teamStyle: live.teamStyle,
    };
    netRef.current.myReady = packed;
    netRef.current.iReadied = true;
    p.send({ k: MSG.READY, ...packed });
    if (net.isHost && net.role !== "watch" && netRef.current.theirTeam && hostStartNetFight()) return true;
    setNet((n) => ({ ...n, waiting: true }));
    return true;
  }

  // รันไฟต์ของโหมดออนไลน์ — ทั้งสองเครื่องเรียกด้วย seed และทีมชุดเดียวกัน
  function runNetFight(seed, otherTeam, side, otherStances, otherJungle) {
    const mine = netRef.current.myReady;
    netRef.current.iReadied = false;
    netRef.current.myReady = null;
    setFoe(otherTeam);
    setNet((n) => ({ ...n, side, waiting: false, peerReady: false }));
    netRef.current.theirTeam = null;
    lockStances({
      seed, foeTeam: otherTeam,
      foeStances: otherStances || { TOP: "NEUTRAL", MID: "NEUTRAL", BOT: "NEUTRAL" },
      foeJungle: otherJungle || { lane: null, crew: [] },
      mine: mine ? { rows: unpackTeam(mine.team), stances: mine.stances, jungle: mine.jungle, teamStyle: mine.teamStyle } : null,
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
    setBuyUndo([]);
    lockStances();
  }

  // สั่งนิสัยครบแล้ว — รวมกับนิสัยฝั่งบอท แล้วดูว่ายกนี้จะเกิดอะไรบ้าง
  function lockStances(netPlan) {
    // ออนไลน์: ฟังก์ชันนี้ถูกเรียกจากตัวจัดการข้อความของสาย ซึ่งจำ state ของ render แรกไว้
    // ถ้าอ่าน team/stances จาก closure ตรงๆ จะได้ทีมเปล่าที่แต้มนักแข่งเป็น 0 ทั้งทีม
    // ต้องอ่านจาก liveRef ที่อัปเดตทุก render แทน
    const L = liveRef.current || {};
    // ออนไลน์: ใช้ชุดที่ส่งให้อีกฝั่งไปแล้วตอนกดพร้อม ไม่ใช่ของสดใน liveRef
    // เดิมอ่านของสด ผู้เล่นที่กดพร้อมแล้วไปเปลี่ยนนิสัยเลนต่อ เครื่องตัวเองจะเล่นยกหนึ่ง
    // ส่วนเครื่องเพื่อนเล่นอีกยกหนึ่งตามสแนปช็อต — ไฟต์ไม่ตรงกัน เงินไม่ตรงกัน คนชนะไม่ตรงกัน
    const snap = netPlan && netPlan.mine;
    const team = L.team || [];
    const teamStyle = (snap && snap.teamStyle) || L.teamStyle;
    const stances = (snap && snap.stances) || L.stances;
    const jungle = (snap && snap.jungle) || L.jungle;
    const round = L.round;
    const foe = L.foe || [];
    const diffId = L.diffId;
    const foeLastStances = L.foeLastStances;
    // ranks ของทีมตัวเองต้องผ่านกฎเดียวกับที่ใช้กับฝั่งตรงข้าม
    // เดิมปล่อยไว้ดิบๆ ยกแรกจึงเป็น emptyRanks() คือไม่มีสกิลเลยสักท่า
    // ขณะที่ฝั่งตรงข้ามได้ autoRanks เต็ม — ผู้เล่นเสียเปรียบฟรีทุกเกมในยกแรก
    const fresh = team.map((c) => {
      const champId = c.champId || LANE_CHAMPION[c.lane];
      return {
        ...c, style: teamStyle, champId,
        ranks: c.autoLevel ? autoRanks(c.level, priorityOf(champId), null) : c.ranks,
      };
    });
    // ทุกค่าที่ไฟต์หรือการแจกเงินอ่าน ต้องมาจากสแนปช็อต — ที่เหลือ (แผนของ รายการโปรด ฯลฯ) เก็บของเดิม
    const me = snap && snap.rows ? fresh.map((c) => {
      const s = snap.rows.find((x) => x.lane === c.lane);
      if (!s) return c;
      return {
        ...c,
        champId: s.champId, ranks: s.ranks, items: s.items, gold: s.gold, xp: s.xp, level: s.level,
        athlete: s.athlete, upgrades: s.upgrades, bountyGold: s.bountyGold, sangHp: s.sangHp,
        wvcStacks: s.wvcStacks, spot: s.spot, duelLane: s.duelLane, style: s.style || teamStyle,
      };
    }) : fresh;
    if (snap) {
      setStances(stances);
      setJungle(jungle);
      if (teamStyle) setTeamStyle(teamStyle);
    }
    const foeSrc = (netPlan && netPlan.foeTeam) || foe;
    const shopped = foeSrc.map((c) => {
      const champId = c.champId || LANE_CHAMPION[c.lane];
      // ออนไลน์: เชื่อ ranks ที่ส่งมาตามสาย ห้ามคำนวณใหม่
      // ไม่งั้นการอัพสกิลเองของอีกฝั่งจะหาย และสองเครื่องจะเห็นไม่ตรงกัน
      const ranks = netPlan ? c.ranks : autoRanks(c.level, CHAMPIONS[champId].skillPriority, null);
      return { ...c, champId, ranks };
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
    resetWatch();
    setPhase("LANES");
  }

  // เริ่มไฟต์ของเลนเดียว — ผู้เล่นกดเลือกเองว่าจะดูอันไหนก่อน
  // ตัวสร้างสนามอยู่ที่ game/lane-fight.js ที่เดียว ทั้งสองเครื่องและเทสใช้ชุดเดียวกัน
  function startLaneFight(L) {
    if (!plan) return;
    const l = plan.lanes[L];
    if (!l || !l.fight || laneDone[L]) return;
    const mySide = net.on && net.side === "red" ? "red" : "blue";
    const st = buildLaneFight({ plan, lane: L, team, foe, teamStyle, mySide });
    if (!st) return;
    fightRef.current = st;
    fightLaneRef.current = L;
    setActiveLane(L);
    setPhase("FIGHT");
  }

  // ---- ดูไฟต์พร้อมกัน (ออนไลน์) ----
  // สเปคใหม่: ต้องกดพร้อมดูทั้งคู่แล้วค่อยเริ่มพร้อมกัน · มีเจ้าบ้านก็เอาตามเจ้าบ้าน
  // เจ้าบ้านเลือกเลน (นับเป็นการกดพร้อมของเจ้าบ้านไปในตัว) ผู้เล่นอีกฝั่งกดพร้อมดู
  // ครบแล้วเจ้าบ้านสั่งเริ่ม ทุกเครื่องเปิดไฟต์เลนเดียวกันในจังหวะเดียวกัน
  const playerSlots = () => (netRef.current.watching ? [0, 1] : [0]);
  function netBroadcast(msg) {
    for (const i of playerSlots()) {
      const p = peersRef.current[i];
      if (p && p.open) p.send(msg);
    }
  }
  function pushWatch(w) { watchRef.current = w; setWatchSync(w); }
  function resetWatch() { pushWatch({ lane: null, peers: [false, false], me: false }); }

  function hostTryGo() {
    const w = watchRef.current;
    if (!w.lane) return;
    if (!playerSlots().every((i) => w.peers[i])) return;
    const L = w.lane;
    netBroadcast({ k: MSG.WATCH, lane: L, go: true, speed: speedRef.current });
    resetWatch();
    fnRef.current.startLaneFight(L);
  }

  // เจ้าบ้านกดดูเลน — ถ้าอีกฝั่งพร้อมแล้วก็เริ่มเลย ไม่งั้นรอ
  function netWatchLane(L) {
    if (!net.on || !net.isHost) { startLaneFight(L); return; }
    pushWatch({ ...watchRef.current, lane: L });
    netBroadcast({ k: MSG.WATCH, lane: L, go: false });
    hostTryGo();
  }

  // ผู้เข้าร่วมกดพร้อมดู / ยกเลิก
  function netWatchReady() {
    const on = !watchRef.current.me;
    pushWatch({ ...watchRef.current, me: on });
    const p = peerRef.current || peersRef.current[0];
    if (p && p.open) p.send({ k: MSG.WATCH_READY, ready: on });
  }

  // ผู้เข้าร่วมตามเวลาไฟต์ของเจ้าบ้าน — เร่งได้อย่างเดียว ย้อนไม่ได้
  function catchUpTo(lane, t) {
    const st = fightRef.current;
    if (!st || st.over || fightLaneRef.current !== lane) return;
    let g = 0;
    while (!st.over && st.t < t - 0.05 && g++ < 60 * 30) step(st);
  }

  // ความเร็วไฟต์ — ออนไลน์เจ้าบ้านเป็นคนคุม ผู้เข้าร่วมเปลี่ยนเองไม่ได้
  function changeSpeed(s) {
    if (net.on && !net.isHost) return;
    setSpeed(s);
    if (net.on && net.isHost) {
      netBroadcast({ k: MSG.SPEED, v: s, lane: fightLaneRef.current, t: fightRef.current ? fightRef.current.t : 0 });
    }
  }

  useEffect(() => {
    if (phase !== "FIGHT") return;
    let stop = false;
    // เดินไฟต์ตามเวลาจริง — เดิมเดินเฟรมละ speed สเต็ป จอ 120Hz เลยเร็วเป็นสองเท่าของจอ 60Hz
    // ดูพร้อมกันสองเครื่องไม่ได้ถ้าจอสองเครื่องรีเฟรชไม่เท่ากัน
    let last = null;
    let lastSync = 0;
    slowAcc.current = 0;
    const loop = (ts) => {
      if (stop) return;
      const st = fightRef.current;
      if (st && !st.over) {
        if (last == null) last = ts;
        // ตัดไว้ที่ 4 วิต่อเฟรม — สลับแท็บกลับมาจะไม่วิ่งค้างทีเดียวยาวๆ
        const dt = Math.min(4000, Math.max(0, ts - last));
        last = ts;
        slowAcc.current += (dt / 1000) * 60 * speed;
        let n = Math.floor(slowAcc.current);
        slowAcc.current -= n;
        n = Math.min(n, 60 * 16);
        for (let i = 0; i < n && !st.over; i++) step(st);
        // เจ้าบ้านบอกเวลาไฟต์ของตัวเองเป็นระยะ ใครช้ากว่าจะได้เร่งตาม
        if (net.on && net.isHost && ts - lastSync > 1500) {
          lastSync = ts;
          netBroadcast({ k: MSG.SYNC, lane: fightLaneRef.current, t: st.t });
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
    const L = activeLane;
    const rec = recordLaneFight(st, L, mySide);
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
    const mySide = net.on ? (net.side === "red" ? "red" : "blue") : "blue";
    // คิดเงินทั้งยกที่ game/settle.js — สองเครื่องต้องได้ผลตรงกัน และหน้าสรุปใช้ใบเสร็จจากที่เดียวกัน
    const settled = settleRound({
      plan, done, team, foe, mySide, jungle, round, mode, priorityMine: priorityOf,
    });
    const { nextMe, nextFoe, myGold, foeGold, iWon, drawn, laneWins, laneLoss, perUnit, goldGain } = settled;

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
      iWon, drawn, laneWins, laneLoss, myGold, foeGold,
      // ใบเสร็จเงินของยก — แต่ละคนได้เงิน/XP จากอะไรบ้าง ทั้งสองฝั่ง
      breakdown: settled.breakdown,
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
    // ถ่ายภาพทีมคู่แข่ง "ตอนจบยกนี้" ไว้ให้ส่องดูในยกถัดไป
    // เก็บของยกก่อนหน้าไว้ด้วย จะได้ไฮไลต์ได้ว่ายกที่แล้วเขาซื้ออะไรและอัพสกิลไหน
    const snap = (list) => list.map((c) => ({
      lane: c.lane, champId: c.champId, level: c.level,
      items: (c.items || []).slice(), ranks: { ...(c.ranks || {}) },
      upgrades: (c.upgrades || []).slice(),
    }));
    setFoeIntel((old) => ({ round, roster: snap(foe), prev: old ? old.roster : null }));
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
    setPhase, setPlanCatState, setPlanIdx, setShopCat, setShowRanges, setSpeed: changeSpeed,
    setTeam, setTeamStyle, shopCat, showRanges, slotsUsed, speed,
    scoutOpen, setScoutOpen, startMatch, statsOpen, setStatsOpen, history,
    mode, modeId, setModeId, wide, lang, changeLang, inspectId, setInspectId,
    pickQuery, setPickQuery, pickLane, setPickLane, buyUndo, undoBuy,
    draftStyle, setDraftStyle, draft, draftAct, draftBack, startDraft, foeDraft, assignLanes, foeIntel, rerollFoe,
    watchSync, netWatchLane, netWatchReady,
    openEconomy: (from) => { setEconFrom(from || phase); setPhase("ECONOMY"); },
    econBack: () => setPhase(econFrom || "MENU"),
    speedLocked: !!(net.on && !net.isHost),
    setDuelLane, draftSide: netRef.current.mySide || "A",
    draftLocked: !!(netRef.current.online && !netRef.current.watching),
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
    if (phase === "ECONOMY") return EconomyScreen(ctx);
    if (phase === "ONLINE") return OnlineScreen(ctx);
    if (phase === "WATCH") return WatchScreen(ctx);
    if (phase === "SETTING") return SettingScreen(ctx);
    if (phase === "SETUP") return SetupScreen(ctx);
    if (phase === "PRACTICE") return <Practice onExit={() => setPhase("PLAY_MENU")} openSkill={openSkill} />;
    if (phase === "DRAFT") return draftStyle === "BLIND" ? PickScreen(ctx) : DraftScreen(ctx);
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
