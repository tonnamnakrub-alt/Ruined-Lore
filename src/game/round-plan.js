// ---------------------------------------------------------------
// ประกอบ "แผนของยกนี้" จากนิสัยที่สองฝั่งสั่งไว้ + ป่าจะไปแกงค์ตรงไหน
//
// ผลที่ได้บอกครบว่า เลนไหนต้องไฟต์ ใครลงสนามบ้าง ใครเสียเลือดก่อนเริ่ม
// และแต่ละคนได้เงิน/XP เท่าไหร่ถ้าไม่มีไฟต์มาเปลี่ยนผล
// ---------------------------------------------------------------

import {
  GANK_HURT, JUNGLE_FARM, JUNGLE_GANK,
  LANE_MEMBERS, STANCE_LANES, gankOutcome, laneOutcome,
} from "../data/behaviour.js";

const key = (side, lane) => side + ":" + lane;

// เลนที่คนถูกป่าดึงไปแกงค์ที่อื่น — ทิ้งเลนว่างไว้ให้อีกฝั่งกินฟรี
const ABANDON_BONUS = 2;

export function buildRoundPlan(opts) {
  const { stances, foeStances, jungle, foeJungle, round } = opts;
  const lanes = {};
  const fights = [];
  const income = {};
  const hurtAll = {};

  // เลนที่แต่ละฝั่งดึงคนออกไปช่วยแกงค์ (ไม่นับเลนที่ป่าบุกเอง)
  const myAway = new Set(((jungle && jungle.crew) || []).filter((L) => L !== (jungle && jungle.lane)));
  const foeAway = new Set(((foeJungle && foeJungle.crew) || []).filter((L) => L !== (foeJungle && foeJungle.lane)));

  for (const L of STANCE_LANES) {
    const mine = stances[L];
    const theirs = foeStances[L];
    const out = laneOutcome(mine, theirs);

    // ฝั่งไหนถอนคนออกจากเลนนี้ไปช่วยแกงค์ อีกฝั่งก็ยืนเก็บของคนเดียวทั้งยก
    // เดิมเลนที่โดนทิ้งว่างไม่มีผลอะไรเลย ทั้งที่จริงควรเป็นกำไรฟรีๆ ของอีกฝั่ง
    if (myAway.has(L)) { out.foe.gold += ABANDON_BONUS; out.abandonedByMe = true; }
    if (foeAway.has(L)) { out.me.gold += ABANDON_BONUS; out.abandonedByFoe = true; }

    const myGank = jungle && jungle.lane === L;
    const foeGank = foeJungle && foeJungle.lane === L;
    const bothGank = myGank && foeGank;

    // ไฟต์ที่เกิดจากนิสัย (ปกติ-ปกติ หรือ รุกล้ำ-รุกล้ำ) ทำให้เลนนั้นไม่ได้รายได้ฐาน
    // ส่วนไฟต์ที่เกิดเพราะป่าลงมาเฉยๆ ไม่นับเป็นการ "สู้กัน" ทั้งสองฝั่งยังได้รายได้ฐานตามปกติ
    const stanceFight = out.fight;
    let fight = out.fight;
    let myJoin = true;
    let foeJoin = true;
    const hurt = {};
    const notes = [out.note];
    if (out.abandonedByMe) notes.push("เราถอนคนไปช่วยแกงค์ ศัตรูกินเลนนี้ฟรี เงิน +2");
    if (out.abandonedByFoe) notes.push("ศัตรูถอนคนไปช่วยแกงค์ เรากินเลนนี้ฟรี เงิน +2");

    if (bothGank) {
      // ป่าลงมาทั้งสองฝั่ง — ไฟต์เต็มเลน ไม่มีใครได้เปรียบเสียเปรียบ
      fight = true;
      notes.push("ป่าลงมาทั้งสองฝั่ง — ไฟต์เต็มเลน ไม่มีผลได้ผลเสียเพิ่ม");
    } else {
      if (myGank) {
        const g = gankOutcome(theirs, mine);
        fight = true;
        myJoin = out.fight || g.join;
        notes.push(["ป่าเราบุก: {0}", g.note]);
        if (g.hurt === "jungler") hurt[key("blue", "JUNGLE")] = GANK_HURT;
        if (g.hurt === "foeLane") for (const m of LANE_MEMBERS[L]) hurt[key("red", m)] = GANK_HURT;
        if (g.hurt === "both") {
          for (const m of LANE_MEMBERS[L]) { hurt[key("red", m)] = GANK_HURT; hurt[key("blue", m)] = GANK_HURT; }
        }
      }
      if (foeGank) {
        const g = gankOutcome(mine, theirs);
        fight = true;
        foeJoin = out.fight || g.join;
        notes.push(["ป่าศัตรูบุก: {0}", g.note]);
        if (g.hurt === "jungler") hurt[key("red", "JUNGLE")] = GANK_HURT;
        if (g.hurt === "foeLane") for (const m of LANE_MEMBERS[L]) hurt[key("blue", m)] = GANK_HURT;
        if (g.hurt === "both") {
          for (const m of LANE_MEMBERS[L]) { hurt[key("red", m)] = GANK_HURT; hurt[key("blue", m)] = GANK_HURT; }
        }
      }
    }

    // ใครลงสนามบ้างในเลนนี้
    // คนที่ถูกป่าดึงไปแกงค์เลนอื่น ต้องหายไปจากเลนตัวเองด้วย
    // เดิมถูก push เข้าเลนที่ไปแกงค์ แต่ยังค้างอยู่ในรายชื่อเลนบ้านของตัวเอง
    // ผลคือคนเดียวสู้สองเลนในยกเดียวกัน และเลนที่ควรว่างกลับยังไฟต์อยู่
    const blue = myJoin && !myAway.has(L) ? LANE_MEMBERS[L].slice() : [];
    const red = foeJoin && !foeAway.has(L) ? LANE_MEMBERS[L].slice() : [];
    if (myGank) {
      blue.push("JUNGLE");
      for (const c of (jungle.crew || [])) for (const m of LANE_MEMBERS[c] || []) blue.push(m);
    }
    if (foeGank) {
      red.push("JUNGLE");
      for (const c of (foeJungle.crew || [])) for (const m of LANE_MEMBERS[c] || []) red.push(m);
    }

    // ฝั่งไหนไม่มีคนเหลือเลยก็ไม่ต้องไฟต์
    if (!blue.length || !red.length) fight = false;

    lanes[L] = {
      lane: L, mine, theirs, out, fight, stanceFight, myGank, foeGank, bothGank,
      blue, red, hurt, notes, aggroDuel: out.aggroDuel,
    };
    Object.assign(hurtAll, hurt);

    // แตกไฟต์เพราะนิสัย = ไม่มีรายได้ฐาน เหลือแค่ที่เก็บได้จากศพ
    for (const m of LANE_MEMBERS[L]) income[m] = stanceFight ? { gold: 0, xp: 0 } : { ...out.me };
    if (fight) fights.push({ lane: L, blue, red, hurt, stanceFight, aggroDuel: out.aggroDuel });
  }

  // ป่า — ฟาร์มต่อได้เท่านิสัยปกติ ไปแกงค์ได้เท่าเซฟเพราะทิ้งแคมป์
  income.JUNGLE = jungle && jungle.lane ? { ...JUNGLE_GANK } : { ...JUNGLE_FARM };

  return { round, lanes, fights, income, hurt: hurtAll };
}

// รายได้ฝั่งศัตรู — คิดจากมุมกลับด้าน ใช้ตอนจ่ายเงินให้บอท
export function foeIncome(plan) {
  const out = {};
  for (const L of STANCE_LANES) {
    const l = plan.lanes[L];
    for (const m of LANE_MEMBERS[L]) out[m] = l.stanceFight ? { gold: 0, xp: 0 } : { ...l.out.foe };
  }
  const fj = plan.foeJungleLane;
  out.JUNGLE = fj ? { ...JUNGLE_GANK } : { ...JUNGLE_FARM };
  return out;
}
