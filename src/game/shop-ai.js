import { CHAMPIONS } from "../data/champions.js";
import {
  ITEMS, ITEM_BY_ID, applyBuy, buyBlockedReason, ownedParts, slotsUsedBy,
} from "../data/items.js";


// ---------------------------------------------------------------
// สมองซื้อของของบอท
//
// เดิมบอทดูแค่ "เลนนี้ชอบหมวดไหน" แล้วไล่ซื้อของแพงสุดในหมวดนั้น
// ตอนนี้แยกเป็นสองชั้น
//   1) ชั้นสาย  — ตัวนี้เป็นตัวอะไร ควรขึ้นของหมวดไหนก่อน (roleTaste)
//   2) ชั้นแก้ทาง — ทีมตรงข้ามเป็นยังไง ควรเสริมอะไร (counterScore)
// ---------------------------------------------------------------


// สายหลักของแต่ละ role ที่ champions.js ประกาศไว้ ถ้าไม่รู้จักค่อยตกไปใช้เลน
const ROLE_TASTE = {
  marksman: ["MARKSMAN", "FIGHTER", "BOOTS"],
  enchanter: ["SUPPORT", "MAGE", "BOOTS"],
  "battle mage": ["MAGE", "TANK", "BOOTS"],
  "burst mage": ["MAGE", "ASSASSIN", "BOOTS"],
  mage: ["MAGE", "BOOTS"],
  assassin: ["ASSASSIN", "FIGHTER", "BOOTS"],
  diver: ["ASSASSIN", "FIGHTER", "TANK", "BOOTS"],
  skirmisher: ["FIGHTER", "ASSASSIN", "BOOTS"],
  "bruiser ad": ["FIGHTER", "TANK", "BOOTS"],
  bruiser: ["FIGHTER", "TANK", "BOOTS"],
  juggernaut: ["FIGHTER", "TANK", "BOOTS"],
  vanguard: ["TANK", "FIGHTER", "BOOTS"],
  warden: ["TANK", "SUPPORT", "BOOTS"],
  tank: ["TANK", "SUPPORT", "BOOTS"],
};

const LANE_TASTE = {
  TOP: ["FIGHTER", "TANK", "BOOTS"],
  JUNGLE: ["ASSASSIN", "FIGHTER", "TANK", "BOOTS"],
  MID: ["MAGE", "ASSASSIN", "BOOTS"],
  ADC: ["MARKSMAN", "FIGHTER", "BOOTS"],
  SUPPORT: ["SUPPORT", "TANK", "BOOTS"],
};


// ตัวนี้สเกลกับ AP หรือ AD — ดูผลรวมสเกลของสกิลทุกท่า ไม่ใช่ดูท่าเดียว
// (C.HOOK กับ PETER มี AP ติดปลายนิดหน่อย ถ้าดูท่าเดียวจะโดนตัดสินว่าเป็นเมจ)
export function champProfile(champId) {
  const ch = CHAMPIONS[champId] || {};
  let ap = 0, ad = 0, heal = 0, cc = 0;
  for (const sk of ch.skills || []) {
    ap += sk.apRatio || 0;
    ad += (sk.adRatio || 0) + (sk.badRatio || 0) + (sk.armAdRatio || 0);
    if (sk.heal || sk.healPct || sk.healRatio || sk.shield || sk.shieldRatio) heal += 1;
    if (sk.stun || sk.root || sk.fear || sk.taunt || sk.slow) cc += 1;
    for (const form of [sk.light, sk.shadow]) {
      if (!form) continue;
      ap += form.apRatio || 0;
      ad += (form.adRatio || 0) + (form.badRatio || 0);
    }
  }
  const role = String(ch.role || "").toLowerCase();
  return {
    apChamp: ap > ad,
    role,
    melee: !!ch.melee,
    heals: heal > 0,
    cc,
    // แทงค์ไม่ควรไปซื้อกริชเจาะเกราะ ดูจาก role เป็นหลัก
    tanky: /tank|vanguard|warden|juggernaut/.test(role),
    taste: ROLE_TASTE[role] || null,
  };
}


// ทีมตรงข้ามเป็นภัยแบบไหน — ใช้ตัดสินใจว่าควรขึ้นเกราะ ต้านเวท ตัดฮีล หรือของเจาะ
export function readThreat(enemies) {
  let ap = 0, ad = 0, heal = 0, hp = 0, cc = 0, n = 0;
  for (const e of enemies || []) {
    const pf = champProfile(e.champId);
    const ch = CHAMPIONS[e.champId] || {};
    n += 1;
    if (pf.apChamp) ap += 1; else ad += 1;
    if (pf.heals) heal += 1;
    cc += pf.cc;
    hp += (ch.hp || 600) + (ch.hpG || 90) * (e.level || 1);
    for (const it of e.items || []) {
      if (it.ap || it.apPct) ap += 0.5;
      if (it.ad || it.adPct) ad += 0.5;
      if (it.omnivampFlat || it.hors || it.healAmp) heal += 0.5;
      if (it.hp) hp += it.hp;
    }
  }
  if (!n) return { apShare: 0.5, adShare: 0.5, heal: 0, bigHp: 0, cc: 0 };
  const tot = ap + ad || 1;
  return {
    apShare: ap / tot,
    adShare: ad / tot,
    heal: heal / n,               // 0 = ไม่มีใครฟื้นเลือด, 1+ = ทั้งทีมสายยืน
    bigHp: Math.max(0, (hp / n - 1800) / 1200),  // 0 = ตัวบาง, 1 = ทีมเลือดหนา
    cc: cc / n,
  };
}


// ของชิ้นนี้เหมาะกับสถานการณ์แค่ไหน — ยิ่งมากยิ่งควรซื้อก่อน
function counterScore(it, threat, pf, cur) {
  let s = 0;
  s += (it.mr || 0) * 0.13 * (threat.apShare - 0.35);
  s += (it.armor || 0) * 0.13 * (threat.adShare - 0.35);
  // ของตัดฮีลไม่สะสมกัน (เอนจินใช้ตัวที่แรงสุด) มีชิ้นเดียวก็พอ
  // ถ้าไม่กันไว้ บอทจะกวาดของตัดฮีลจากทุกสายมาใส่จนบิลด์เพี้ยน
  const haveAntiheal = cur && cur.items.some((x) => x.antihealOnDmg);
  if (it.antihealOnDmg && !haveAntiheal) s += 26 * Math.min(1, threat.heal) * it.antihealOnDmg.v;
  s += (it.armorPenPct || 0) * 26 * threat.bigHp;
  s += (it.mrPenPct || 0) * 26 * threat.bigHp;
  s += (it.onHitAdaptive || 0) * 900 * threat.bigHp;
  s += (it.tenacity || 0) * 12 * Math.min(1.5, threat.cc);
  s += (it.hp || 0) * 0.004 * Math.max(0, threat.apShare + threat.adShare - 1.2);
  if (pf.heals) s += (it.hors || 0) * 40;
  return s;
}


// ของที่ตัวนี้ "ห้ามซื้อ" ต่อให้อยู่ในหมวดที่ชอบ
function forbidden(it, pf, cur) {
  if (it.kind === "style" && it.style !== cur.style) return true;
  if (it.kind === "boots" && cur.items.some((x) => x.kind === "boots")) return true;
  // ตัวสเกล AD ไม่ซื้อของ AP และกลับกัน
  // ยกเว้นของลูกผสมที่ให้ทั้ง AD และ AP (Hephaestus' Twin Hammers) ซื้อได้ทั้งสองสาย
  const hybrid = (it.ad || it.adPct) && (it.ap || it.apPct);
  if (!hybrid) {
    if (!pf.apChamp && (it.ap || it.apPct || it.mrPenPct)) return true;
    if (pf.apChamp && (it.ad || it.adPct || it.crit || it.critDmg || it.armorPenPct)) return true;
  }
  // แทงค์ไม่ถือกริชเจาะเกราะที่ไม่มีค่าอึดติดมาเลย
  if (pf.tanky && (it.pen || 0) >= 12 && !it.hp && !it.armor && !it.mr) return true;
  // ของคริตมีประโยชน์เฉพาะตัวที่ยิงรัว — ตัวประชิดสายอึดข้ามไป
  if ((it.crit || it.critDmg) && pf.melee && !/skirmisher|marksman/.test(pf.role)) return true;
  return false;
}


function tasteFor(c, pf) {
  const base = pf.taste || LANE_TASTE[c.lane] || ["FIGHTER", "BOOTS"];
  // เมจที่โดนจับไปเลนอื่น หรือ AD ที่โดนจับไปเลนเมจ ต้องสลับหมวดให้ตรงสเกลจริง
  if (pf.apChamp && !base.some((k) => k === "MAGE" || k === "SUPPORT")) return ["MAGE", ...base];
  if (!pf.apChamp && base[0] === "MAGE") return ["FIGHTER", ...base.filter((k) => k !== "MAGE")];
  return base;
}


// ---------------------------------------------------------------
// ซื้อของให้บอทหนึ่งตัว จนกว่าจะเต็มช่องหรือเงินหมด
// ---------------------------------------------------------------
export function shopFor(c, enemies, rand) {
  let cur = { ...c, items: [...c.items] };
  const pf = champProfile(cur.champId);
  const threat = readThreat(enemies);
  const taste = tasteFor(cur, pf);

  if (!cur.items.some((x) => x.cat === "START")) {
    const st = ITEMS.filter((i) => i.cat === "START" && !buyBlockedReason(cur, i));
    if (st.length) {
      // ของเริ่มเกมต้องเข้ากับตัว — ซัพเอาจอก คนตีเร็วเอาคันศร ฯลฯ
      // ที่คะแนนเท่ากันค่อยสุ่ม จะได้ไม่ออกเหมือนกันทุกนัด
      const sc = (i) => {
        let v = 0;
        if (i.hors) v += pf.heals || /enchanter|warden|support/.test(pf.role) ? 6 : -4;
        if (i.ap) v += pf.apChamp ? 3 : -2;
        if (i.ad) v += pf.apChamp ? -2 : 3;
        if (i.asPct) v += !pf.melee && !pf.apChamp ? 3 : -1;
        if (i.armor || i.mr) v += pf.tanky ? 4 : 0;
        return v + rand();
      };
      cur = applyBuy(cur, st.slice().sort((a, b) => sc(b) - sc(a))[0]);
    }
  }

  for (let guard = 0; guard < 24; guard++) {
    if (slotsUsedBy(cur.items, cur.lane) >= 6) break;

    const goals = ITEMS.filter(
      (i) => i.tier === 3 || i.kind === "boots"
    ).filter(
      (i) => taste.some((k) => i.cat === k || (i.also && i.also.includes(k)))
    ).filter(
      (i) => !cur.items.some((x) => x.id === i.id) && !forbidden(i, pf, cur)
    );
    if (!goals.length) break;

    // รองเท้าถูกและคุ้มเสมอ แต่ไม่ควรซื้อก่อนของใหญ่ชิ้นแรก
    // (ADC ใส่รองเท้าโดยไม่กินช่อง เลยซื้อได้ตั้งแต่แรก)
    const coreCount = cur.items.filter((i) => i.tier === 3).length;
    const wantBoots = !cur.items.some((x) => x.kind === "boots") &&
      (cur.lane === "ADC" || coreCount >= 1);

    // อันดับความอยากได้ = ความชอบตามสาย + คะแนนแก้ทางทีมตรงข้าม
    const want = (i) => {
      const rank = taste.findIndex((k) => i.cat === k || (i.also && i.also.includes(k)));
      const boots = i.kind === "boots" ? (wantBoots ? 100 : -100) : 0;
      return (taste.length - rank) * 10 + i.cost * 0.08 + counterScore(i, threat, pf, cur) + boots;
    };
    goals.sort((a, b) => want(b) - want(a));
    const goal = goals[0];

    if (!buyBlockedReason(cur, goal)) { cur = applyBuy(cur, goal); continue; }

    // ยังซื้อของใหญ่ไม่ไหว ก็เก็บชิ้นส่วนที่แพงสุดที่ซื้อไหวไปก่อน
    const owned = ownedParts(cur.items, goal);
    const missing = (goal.parts || [])
      .map((id) => ITEM_BY_ID[id])
      .filter((pt) => pt && !forbidden(pt, pf, cur))
      .filter((pt) => !owned.some((o) => o.id === pt.id))
      .filter((pt) => !buyBlockedReason(cur, pt))
      .sort((a, b) => b.cost - a.cost);
    if (missing.length) { cur = applyBuy(cur, missing[0]); continue; }
    break;
  }
  return cur;
}
