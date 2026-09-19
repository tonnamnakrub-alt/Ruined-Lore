import { tr } from "../i18n.js";
import { DMG_MUL } from "../data/tuning.js";
import { gainIsolde, gainIsoldeOnTaken, popDagger } from "./on-hit.js";
import { addBuff, addBuffUnique, buffSum, bump, curState, dist, hasBuff, pushLog, vfx } from "./state-util.js";
import { cdrFromItemHaste } from "./stats.js";
import { lifeBondLeech, lifeBondSplit, onHealOrShield } from "./support.js";
import { giantSlayerAmp, onMageDamageHook, onMageTakedown } from "./mage.js";
import { onLauraDamage, onLauraTakedown } from "./laura.js";
import { onWeaveDamage } from "./klaeder.js";
import { lastStandCatch } from "./kazem.js";
import { onAliceDamage } from "./alice.js";
import {
  denyDeath, incomingShieldMul, markShieldCut, onAssassinHit, onAssassinKill, shieldBreakMul,
} from "./assassin.js";


// กันดาเมจพ่วงของ Faustus วนเรียกตัวเอง
let faustEcho = false;

// เกราะเลือดเซนทอร์ — เก็บศพหรือช่วยเก็บ จะล้างเลือดไหลของตัวเอง
// แล้วฮีลคืน 150% ของดาเมจที่ยังไม่ทันไหลออก
function cbcCleanse(state, u) {
  let left = 0;
  state.dots = state.dots.filter((d) => {
    if (d.targetId === u.id && d.cbc) { left += d.left || 0; return false; }
    return true;
  });
  const back = (u.centaurBleed && u.centaurBleed.healBack) || 1.5;
  if (left > 0) healUnit(state, u, left * back);
}

export function applyDamage(state, source, target, amount, magic, trueDmg, isAuto) {
  if (hasBuff(target, "invuln") || hasBuff(target, "evade")) {
    if (target.absorb) target.absorb.dmg += amount;   // Theon's ult banks what it eats
    return;
  }
  // เจาะเกราะกับเจาะต้านเวทแยกกันแล้ว ของสายกายภาพจะไม่ไปเจาะต้านเวทให้ฟรีอีก
  const arFlat = (source && (source.arPen || 0)) + (source && source.pen ? source.pen : 0);
  const mrFlat = (source && (source.mrPen || 0)) + (source && source.pen ? source.pen : 0);
  const pen = magic ? mrFlat : arFlat;
  // เจาะต้านเวทแบบ % คิดก่อน แล้วค่อยหักแบบ flat
  const mrPct = magic ? 1 - Math.min(0.8, (source && source.mrPenPct) || 0) : 1;
  const arPct = magic ? 1 : 1 - Math.min(0.8, (source && source.armorPenPct) || 0);
  const res = Math.max(0, (magic ? target.mr * mrPct : target.armor * arPct) - pen);
  const mit = trueDmg ? 1 : 100 / (100 + res);
  const vulnerable = 1 + buffSum(target, "vulnerable");
  // ตราประทับของ Alice — ส่วนที่เพิ่มจ่ายเป็นดาเมจเวทแยกก้อน กินต้านเวทของเป้า ไม่ใช่เกราะ
  const curious = buffSum(target, "curiousAmp");
  const mitMagic = trueDmg ? 1 : 100 / (100 + Math.max(0, target.mr * mrPct - mrFlat));
  const riders = curious > 0 ? amount * curious * mitMagic : 0;
  const autoCut = (isAuto && target.dmgReduceAuto ? 1 - target.dmgReduceAuto : 1)
    * (target.drAll ? 1 - Math.min(0.8, target.drAll) : 1);
  // Apollo's Sunlit Quiver: เลือดตัวเอง >= 80% ตีแรงขึ้นทุกชนิด
  const hpAmp = source && source.dmgAmpHighHp && source.hp / source.maxHp >= 0.8
    ? 1 + source.dmgAmpHighHp : 1;
  // Jack's Giantbane Harp: ดาเมจเวทแรงขึ้นตามส่วนต่าง Max HP ของเป้ากับเรา
  const giant = magic ? giantSlayerAmp(source, target) : 1;
  // Jack's Giantbane Harp: ตีแรงขึ้นใส่ศัตรูที่เลือดยังมากกว่าครึ่ง
  const healthy = source && source.healthyAmp && target.maxHp > 0
    && target.hp / target.maxHp > source.healthyAmp.hpAbove ? 1 + source.healthyAmp.amp : 1;
  let dmg = DMG_MUL * (amount * mit + riders) * vulnerable * autoCut * hpAmp * giant * healthy
    * (1 + Math.max(0, (state.t - state.rampStart) / state.rampScale));
  // Oath of the Dioscuri: คนที่ผูกไว้รับแทน 10% ก่อนโล่ของเป้าจะทำงาน
  if (!state.oodSplitting && dmg > 0) {
    const guard = lifeBondSplit(state, target);
    if (guard) {
      const share = dmg * (guard.lifeBondShare || 0.10);
      dmg -= share;
      state.oodSplitting = true;
      const ps = state.dmgSrc;
      state.dmgSrc = tr("ไอเทม Oath of the Dioscuri");
      try { applyDamage(state, source, guard, share, false, true); }
      finally { state.oodSplitting = false; state.dmgSrc = ps; }
    }
  }
  // Fang of the Midgard Serpent: ดาเมจกินหลอดโล่แรงขึ้น
  if (source && source.shieldBreak) markShieldCut(state, source, target);
  if (target.shield > 0) {
    const eaten = dmg * shieldBreakMul(source);
    const absorbed = Math.min(target.shield, eaten);
    target.shield -= absorbed;
    dmg -= absorbed;
    target.shieldAbsorbed = (target.shieldAbsorbed || 0) + absorbed;
  }
  if (dmg <= 0) return;
  // Cuirass of the Bleeding Centaur: 30% of incoming physical damage is deferred
  // into a 3s bleed instead of landing instantly
  if (!magic && !trueDmg && target.hasItem && target.hasItem("cbc")) {
    const deferred = dmg * 0.3;
    dmg -= deferred;
    state.dots.push({ targetId: target.id, ownerId: (source && source.id) || target.id, dps: deferred / 3, until: state.t + 3, magic: false, cbc: true, src: tr("ไอเทม Cuirass of the Bleeding Centaur") });
  }
  // Pauldrons of the Nian Beast: both dealing AND taking damage builds stacks, up to 15
  if (source && source.hasItem && source.hasItem("pnb")) {
    source.pnbStacks = Math.min(15, (source.pnbStacks || 0) + 1);
    source.pnbUntil = state.t + 5;
  }
  if (target.hasItem && target.hasItem("pnb")) {
    target.pnbStacks = Math.min(15, (target.pnbStacks || 0) + 1);
    target.pnbUntil = state.t + 5;
  }
  // Mjölnir's Grounding Cloak: stacks on every magic hit taken, up to +30 MR at 10 stacks
  if (magic && target.hasItem("mgc")) {
    target.mjolnirStacks = Math.min(10, (target.mjolnirStacks || 0) + 1);
    target.mjolnirUntil = state.t + 4;
  }
  // มีดของ Peter ปักอยู่แล้วโดนสกิลซ้ำจากคนปา — เลือดที่เหลือแตกออกทันที
  if (source && !isAuto && target.dagger && target.dagger.ownerId === source.id) popDagger(state, source, target);
  if (source && source.pendingSkillHit) {
    source.skillHitThisCast = true;
    if (source.champ.isolde) gainIsolde(state, source, source.champ.isolde.onSkill);
  }
  state.fx.push({ x: target.x, y: target.y, t: state.t, kind: magic ? "magic" : trueDmg ? "true" : "hit", size: Math.min(140, 40 + dmg / 6) });
  state.fx.push({ x: target.x, y: target.y - 40, t: state.t, kind: "num", text: String(Math.round(dmg)),
    color: trueDmg ? "#FFFFFF" : magic ? "#B08CFF" : "#FFD08A" });
  target.hp -= dmg;
  target.lastHitAt = state.t;
  // บันทึกดาเมจที่เพิ่งกินไป — R ของ Luch เอาของ 3 วิล่าสุดมาสะท้อนคืน (ตัดของเก่าทิ้งใน step.js)
  (target.tookLog = target.tookLog || []).push([state.t, dmg]);

  // Swan Maiden's Feathered Cloak: เลือดหลุด 30% แล้วกางโล่ 4 วิ (ทุก 60 วิ)
  if (target.hasItem && target.hasItem("swf") && target.hp > 0
      && target.hp / target.maxHp < 0.3 && state.t >= (target.swfReadyAt || 0)) {
    target.swfReadyAt = state.t + 60;
    const amt = 250 + 1.0 * (target.bonusAd || 0);
    target.swfAmt = amt;
    target.swfUntil = state.t + 4;
    target.shield = (target.shield || 0) + amt;
    pushLog(state, tr("{0} {1} กางโล่สุดท้าย", target.team === "blue" ? "🔵" : "🔴", tr(target.champ.th)));
  }

  // Smee's Watch: any damage from the marked target's owner — auto or skill —
  // detonates the mark for a cut of what just landed
  if (target.mark && source && target.mark.ownerId === source.id && state.t < target.mark.until && !target.markDetonating) {
    const sk = target.mark.sk;
    const bonusPct = sk.bonusPct[Math.max(0, sk.rank - 1)];
    const bonus = dmg * bonusPct + (sk.badRatio || 0) * source.bonusAd;
    target.mark = null;
    target.markDetonating = true;
    state.dmgSrc = tr("จุดระเบิดมาร์ก ") + (sk.th || "");
    applyDamage(state, source, target, bonus, false, sk.upTrue && source.upgrades.includes("W"));
    target.markDetonating = false;
  }

  // Nemean Lion's Mane: reflects some of what it just took back at the attacker,
  // as whichever damage type the wearer itself deals more of
  if (target.hasItem("nlm") && source && source.alive && source.id !== target.id) {
    const cdr = cdrFromItemHaste(target.itemHaste || 0);
    const ready = target.nlmReadyAt == null || state.t >= target.nlmReadyAt;
    if (ready) {
      target.nlmReadyAt = state.t + 1 * (1 - cdr);
      const adaptiveMagic = target.ap > target.ad;
      const baseArmor = target.champ.armor + target.champ.armorG * (target.level - 1);
      const bonusArmor = Math.max(0, target.armor - baseArmor);
      state.dmgSrc = tr("ไอเทม สะท้อนดาเมจ");
      applyDamage(state, target, source, 15 + 0.25 * bonusArmor, adaptiveMagic, false);
    }
  }
  // Apple of Idunn: เลือดต่ำกว่าครึ่งแล้วโดนตี จะฟื้น 10% ของเลือดที่หายไป ใน 3 วิ ทุก 10 วิ
  if (target.idunn) {
    const cfg = target.idunn;
    const cdr = cdrFromItemHaste(target.itemHaste || 0);
    const ready = target.aoiReadyAt == null || state.t >= target.aoiReadyAt;
    if (ready && target.hp / target.maxHp < cfg.hpBelow) {
      target.aoiReadyAt = state.t + cfg.cd * (1 - cdr);
      const missing = Math.max(0, target.maxHp - target.hp);
      state.hots.push({ targetId: target.id, ownerId: target.id, hps: (missing * cfg.missingPct) / cfg.over, until: state.t + cfg.over });
    }
  }

  // Wendigo's Voracious Claw: ศัตรูคนแรกของไฟต์ที่เลือดเหลือต่ำกว่า 20% โดนประหารทันที
  if (source && source.wendigo && !source.wendigoUsed && target.alive
      && target.maxHp > 0 && target.hp / target.maxHp <= source.wendigo.execPct) {
    source.wendigoUsed = true;
    state.dmgSrc = tr("ไอเทม Wendigo's Voracious Claw");
    applyDamage(state, source, target, target.hp + 1, false, true);
    state.dmgSrc = null;
  }

  // Cuirass of the Bleeding Centaur: สะสมสแตกทั้งตอนทำดาเมจและตอนโดน
  if (target.centaurStack) target.cbcStacks = Math.min(target.centaurStack.max, (target.cbcStacks || 0) + 1);
  if (source && source.centaurStack) source.cbcStacks = Math.min(source.centaurStack.max, (source.cbcStacks || 0) + 1);
  // 30% ของดาเมจที่โดน กลายเป็นเลือดไหลแบบ True Damage 3 วินาที
  if (target.centaurBleed && !trueDmg && dmg > 0) {
    const cfg = target.centaurBleed;
    state.dots = state.dots.filter((d) => !(d.targetId === target.id && d.cbc));
    state.dots.push({
      targetId: target.id, ownerId: target.id, cbc: true, trueDmg: true,
      dps: (dmg * cfg.pct) / cfg.dur, until: state.t + cfg.dur, left: dmg * cfg.pct,
    });
  }
  // ---- ให้เครดิตว่าดาเมจก้อนนี้มาจากอะไร (ใช้ในหน้ากราฟ)
  {
    const lbl = state.dmgSrc || (isAuto ? tr("ออโต้") : tr("อื่นๆ"));
    if (source) bump(source.dealtBy, lbl, dmg);
    bump(target.takenBy, (source ? source.champ.id : "?") + "|" + lbl, dmg);
  }
  if (source) {
    source.damageDealt += dmg;
    // ของตัดฮีล (Grievous Wounds) — ติดให้เป้าหมายทุกครั้งที่ดาเมจเข้า
    if (source.antihealOnDmg && target.alive) {
      const ah = source.antihealOnDmg;
      target.buffs = target.buffs.filter((b) => !(b.type === "antiheal" && b.sourceId === source.id));
      addBuff(target, { type: "antiheal", v: ah.v, sourceId: source.id, until: state.t + ah.dur }, state.t);
    }
    // Imperial Weave ของ Klaeder — โดนดาเมจชนิดไหนก็ทอกันชนิดนั้น
    if (target.champ.weave) onWeaveDamage(state, target, source, magic);
    // Isolde ของ Tristan — ฝั่งที่ "โดน" ก็ได้แต้ม
    if (target.champ.isolde) gainIsoldeOnTaken(state, target, source, state.dmgSrc, isAuto);
    if (magic) onMageDamageHook(state, source, target, dmg);
    onAssassinHit(state, source, target);
    onLauraDamage(state, source, target, isAuto);
    if (source.champ.curious) onAliceDamage(state, source, target, isAuto);
    // Faustian Bargain — ทุกสกิลพ่วงดาเมจจริงอีกก้อน คิดเป็น % ของดาเมจต้นก่อนหักเกราะ
    if (!faustEcho && !trueDmg && !isAuto && target.alive
        && source.champ && source.champ.faustian && /^[QWER] /.test(String(state.dmgSrc || ""))) {
      const fb = source.champ.faustian;
      const share = Math.min(fb.cap || 0.5, fb.base + fb.perAp * (source.ap || 0));
      faustEcho = true;
      try { applyDamage(state, source, target, amount * share, false, true); }
      finally { faustEcho = false; }
    }
    if (!state.oodSplitting) lifeBondLeech(state, source, dmg);
    source.lastCombatAt = state.t;
    target.lastCombatAt = state.t;
    target.recentDamagers[source.id] = state.t;
    let ov = source.champ.omnivamp || 0;
    if (source.champ.vamp) {
      const v = source.champ.vamp;
      ov = v.base + v.perLevel * source.level + v.perBonusHp * source.bonusHp;
    }
    ov += source.omnivampFlat || 0;
    ov += source.apolloVamp || 0;
    // Lilith's Sanguine Grimoire: เลือดต่ำกว่าครึ่งได้ดูดเลือดเพิ่มอีกก้อน
    if (source.lowHpVamp && source.hp / source.maxHp <= source.lowHpVamp.hpBelow) ov += source.lowHpVamp.add;
    ov += buffSum(source, "fjdvamp");
    if (ov && source.alive) {
      const want = dmg * ov;
      const room = Math.max(0, source.maxHp - source.hp);
      healUnit(state, source, want);
      // Bloodline of Dracul: ฮีลส่วนที่ล้นหลอดกลายเป็นโล่ที่ค่อยๆ สลาย
      const ovsh = source.champ.vamp && source.champ.vamp.overShield;
      if (ovsh && want > room) {
        grantShield(source, want - room);
        addBuffUnique(source, "vampshield", { type: "shield", v: 1, until: state.t + ovsh }, state.t);
      }
    }
  }
  if (target.hp <= 0) {
    // Freyja's Shroud of Defiance: ดาเมจที่จะฆ่าถูกกันไว้ เลือดล็อกที่ 1 แล้วอมตะสั้นๆ
    if (denyDeath(state, target)) return;
    // I WILL NOT YIELD — กดเองไม่ได้ ทำงานเองตอนจะตาย: ล้มนิ่ง 2.5 วิ แล้วลุกกลับมาพร้อมบัฟ
    if (lastStandCatch(state, target)) return;
    // Shroud of Osiris: once per fight, dying instead freezes you invulnerable
    // for 3s before reviving at 50% of your base HP
    if (target.hasItem && target.hasItem("soo") && !target.sooUsed && !target.sooRevive) {
      target.sooUsed = true;
      target.hp = 1;
      target.sooRevive = { until: state.t + 3 };
      addBuff(target, { type: "invuln", v: 1, until: state.t + 3 }, state.t);
      addBuff(target, { type: "untargetable", v: 1, until: state.t + 3 }, state.t);
      addBuff(target, { type: "root", v: 1, until: state.t + 3 }, state.t);
      pushLog(state, tr(
        "{0} {1} ถูกห่อคลุมด้วยผ้าห่อศพโอซิริส",
        target.team === "blue" ? "🔵" : "🔴",
        tr(target.champ.th)
      ));
      return;
    }
    target.hp = 0;
    target.alive = false;
    if (source && source.centaurBleed) cbcCleanse(state, source);
    if (source) {
      // นับคนช่วยของศพนี้ก่อน เพราะเงินช่วยสังหารขึ้นกับว่ามีคนช่วยกี่คน
      const helpers = [];
      for (const [aid, at] of Object.entries(target.recentDamagers)) {
        if (aid === source.id || state.t - at > 10) continue;
        const h = state.units.find((x) => x.id === aid);
        if (h && h.team === source.team) helpers.push(h);
      }
      for (const helper of helpers) {
        {
          // ช่วยคนเดียวได้เต็ม หลายคนได้น้อยลง — เก็บไว้เป็นรายครั้งเพื่อคิดเงินตอนจบยก
          helper.assists += 1;
          if (helpers.length <= 1) helper.soloAssists = (helper.soloAssists || 0) + 1;
          onMageTakedown(state, helper);
          onAssassinKill(state, helper, false);
          onLauraTakedown(state, helper);
          if (helper.centaurBleed) cbcCleanse(state, helper);
        }
      }
      vfx(state, { kind: "flash", x: target.x, y: target.y, r: 150, color: "255,236,190", dur: 0.5 });
      vfx(state, { kind: "shock", x: target.x, y: target.y, r: 170, color: "255,208,138", dur: 0.6 });
      source.kills += 1;
      onMageTakedown(state, source);
      onAssassinKill(state, source, true);
      onLauraTakedown(state, source);
      if (source.hasItem && source.hasItem("cbc")) {
        state.dots = state.dots.filter((d) => !(d.targetId === source.id && d.cbc));
        healUnit(state, source, source.maxHp * 0.08);
      }
      const vt = state.units.find((x) => x.id === target.targetId);
      if (source.lane === "JUNGLE" && vt && vt.team === source.team && vt.id !== source.id) {
        source.gankKills += 1;
        pushLog(state, tr("🌿 JUNGLE แกงค์สำเร็จ — ช่วย {0} ไว้ได้", vt.lane));
      }
    }
    pushLog(state, tr("{0} {1} ตาย", target.team === "blue" ? "🔵" : "🔴", tr(target.champ.th)));
  }
}


// while Vampiric Form is up, anything landing beyond the normal radius bleeds instead
export function edgeDamage(state, u, e, power, baseR, magic) {
  const boost = u.skillRangeBoost || 0;
  if (boost > 0 && dist(u, e) > baseR) {
    const sk = u.vampSkill;
    const total = power * (sk ? sk.edgeMult : 1.25);
    const dur = sk ? sk.bleedDur : 5;
    const old = state.dots.find((d) => d.targetId === e.id && d.ownerId === u.id);
    if (old) { old.until = state.t + dur; old.dps = Math.max(old.dps, total / dur); }
    else state.dots.push({ targetId: e.id, ownerId: u.id, dps: total / dur, until: state.t + dur, magic: !!magic, src: state.dmgSrc || (sk ? sk.th : tr("เลือดไหล")) });
    state.fx.push({ x: e.x, y: e.y, t: state.t, kind: "num", text: "bleed", color: "#E5484D" });
    return;
  }
  applyDamage(state, u, e, power, magic);
}


export function skillPower(u, sk, target) {
  const r = Math.max(0, sk.rank - 1);
  let v = sk.dmg ? sk.dmg[r] : 0;
  v += (sk.adRatio || 0) * u.ad;
  v += (sk.badRatio || 0) * u.bonusAd;
  v += (sk.apRatio || 0) * u.ap;
  // สเกลกับ Bonus HP (เลือดที่ได้จากไอเทม + พาสซีฟ) ไม่ใช่ Max HP ทั้งก้อน
  if (sk.selfBonusHp) v += (u.bonusHp || 0) * sk.selfBonusHp;
  if (sk.selfStacks) v += (u.sangStacks || 0) * sk.selfStacks;
  // สเกลกับความเร็วเดินส่วนที่เกินค่าฐานของตัวเอง — ของ Ariel ที่กระแสน้ำแรงตามความเร็ว
  if (sk.msRatio) v += Math.max(0, (u.moveSpeed || 0) - ((u.champ && u.champ.ms) || 0)) * sk.msRatio;
  if (sk.pctMaxHp && target) {
    const pct = sk.pctMaxHp[r] + (sk.pctPerBad || 0) * (u.bonusAd / 100);
    v += target.maxHp * pct;
  }
  v *= 1 + buffSum(u, "spelldmg");
  return v;
}


// Holy Grail of Avalon and anything else with healAmp should also swell shields,
// not just direct heals — healUnit already covers heals/vamp, this covers the rest.
export function grantShield(u, amount) {
  const st = curState();
  const giver = (st && st.srcUnit) || u;
  // พลังฮีล/โล่ของ "คนจ่าย" (hors) คูณก่อน แล้วค่อยคูณ healAmp ของคนรับ
  // โดน Fang of the Midgard Serpent มาก่อน โล่ที่รับใหม่จะน้อยลงชั่วคราว
  const out = amount * (1 + (giver !== u ? giver.hors || 0 : 0)) * incomingShieldMul(u);
  giver.shieldGiven = (giver.shieldGiven || 0) + out;
  u.shieldTaken = (u.shieldTaken || 0) + out;
  const total = out * (1 + (u.healAmp || 0));
  u.shield = Math.max(u.shield, total);
  if (st) onHealOrShield(st, giver, u, total, true);
  return u.shield;
}


export function healUnit(state, u, amount) {
  const cut = hasBuff(u, "antiheal") ? 1 - buffSum(u, "antiheal") : 1;
  const amp = 1 + (u.healAmp || 0);
  const src = state.srcUnit || u;
  const out = amount * (1 + (src !== u ? src.hors || 0 : 0)) * cut * amp;
  const before = u.hp;
  u.hp = Math.min(u.maxHp, u.hp + out);
  const got = u.hp - before;
  onHealOrShield(state, src, u, out, false);
  if (got > 0) {
    const lbl = state.dmgSrc || tr("ฟื้นเลือด");
    const healer = state.srcUnit || u;
    healer.healGiven = (healer.healGiven || 0) + got;
    u.healTaken = (u.healTaken || 0) + got;
    bump(u.healedBy, (healer === u ? tr("ตัวเอง") : healer.champ.id) + "|" + lbl, got);
  }
  if (got > 0.5) {
    u.healAcc = (u.healAcc || 0) + got;
    if (u.healAcc >= 12) {
      state.fx.push({ t: state.t, kind: "num", x: u.x, y: u.y - 66, text: "+" + Math.round(u.healAcc), color: "#3FBF7F" });
      state.fx.push({ t: state.t, kind: "ring", x: u.x, y: u.y, r: u.radius + 20, color: "63,191,127", grow: 0.5 });
      u.healAcc = 0;
    }
  }
}


export function skillHeal(u, sk) {
  const arr = sk.shield || sk.heal;
  return arr[Math.max(0, sk.rank - 1)] + (sk.apRatio || 0) * u.ap;
}
