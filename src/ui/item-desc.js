// ---------------------------------------------------------------
// คำอธิบายไอเทมเป็นข้อความล้วน — ไม่มี JSX เลย
// แยกออกมาจาก recipe.jsx เพื่อให้สคริปต์เทสที่รันบน node import ตรงๆ ได้
// (node โหลดไฟล์ .jsx เองไม่ได้) recipe.jsx re-export ต่อให้ ของเดิมเลยไม่ต้องแก้
// ---------------------------------------------------------------
import { tr } from "../i18n.js";
import { STYLES } from "../data/tuning.js";
import { C, STAT_C } from "./theme.js";


export function itemStats(it) {
  const p = [];
  const add = (key, text) => p.push({ key, text, color: STAT_C[key] || C.ink });
  if (it.ad) add("ad", `+${it.ad} AD`);
  if (it.adPct) add("adPct", `+${Math.round(it.adPct * 100)}% AD`);
  if (it.ap) add("ap", `+${it.ap} AP`);
  if (it.apPct) add("apPct", `+${Math.round(it.apPct * 100)}% AP`);
  if (it.hp) add("hp", `+${it.hp} HP`);
  if (it.armor) add("armor", tr("+{0} เกราะ", it.armor));
  if (it.mr) add("mr", tr("+{0} ต้านเวท", it.mr));
  if (it.asPct) add("asPct", tr(
    "{0}{1}% ความเร็วโจมตี", it.asPct > 0 ? "+" : "", Math.round(it.asPct * 100)
  ));
  if (it.crit) add("crit", tr("+{0}% โอกาสคริ", Math.round(it.crit * 100)));
  if (it.critDmg) add("critDmg", tr(
    "ดาเมจคริแรงขึ้น {0}% (รวมเป็น {1}%)",
    Math.round(it.critDmg * 100), Math.round((1.75 + it.critDmg) * 100)
  ));
  if (it.ah) add("ah", `+${it.ah} Ability Haste`);
  if (it.ultCdr) add("ultCdr", tr("ลดคูลดาวน์ท่าไม้ตาย {0}%", Math.round(it.ultCdr * 100)));
  if (it.ms) add("ms", tr("+{0} ความเร็วเดิน", it.ms));
  if (it.msPct) add("msPct", tr("+{0}% ความเร็วเดิน", Math.round(it.msPct * 100)));
  if (it.range) add("range", tr("+{0} ระยะ", it.range));
  if (it.arPen) add("pen", tr("+{0} เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ)", it.arPen));
  if (it.mrPen) add("pen", tr("+{0} เจาะต้านเวท (ลบต้านเวทเป้าก่อนคิดดาเมจเวท)", it.mrPen));
  if (it.pen) add("pen", tr("+{0} เจาะเกราะ/ต้านเวท", it.pen));
  if (it.armorPenPct) add("armorPenPct", tr("เจาะเกราะ {0}%", Math.round(it.armorPenPct * 100)));
  if (it.mrPenPct) add("mrPenPct", tr("เจาะต้านเวท {0}%", Math.round(it.mrPenPct * 100)));
  if (it.omnivampFlat) add("omnivampFlat", tr("+{0}% ดูดเลือด", Math.round(it.omnivampFlat * 100)));
  if (it.hors) add("hors", tr("ฮีล/โล่ที่จ่ายให้เพื่อน +{0}%", Math.round(it.hors * 100)));
  if (it.healAmp && !it.healAmpUniq) add("healAmp", tr("ฮีล/เกราะ/ดูดเลือดที่ได้รับ +{0}%", Math.round(it.healAmp * 100)));
  if (it.regenPct) add("regenPct", tr("+{0}% ฟื้นเลือดนอกคอมแบต", Math.round(it.regenPct * 100)));
  if (it.tenacity) add("tenacity", tr("ลดเวลาติดล็อก {0}%", Math.round(it.tenacity * 100)));
  if (it.slowResist) add("tenacity", tr("ต้านสโลว์ {0}% (ลดผลของสโลว์ที่โดน)", Math.round(it.slowResist * 100)));
  if (it.ultAh) add("ah", tr("+{0} Ability Haste เฉพาะท่าไม้ตาย", it.ultAh));
  if (it.dmgReduceAuto) add("dmgReduceAuto", tr("ลดดาเมจออโต้ที่โดน {0}%", Math.round(it.dmgReduceAuto * 100)));
  if (it.goldPerRound) add("goldPerRound", tr("+{0} เงินทุกยก", it.goldPerRound));
  return p;
}


// ---------------------------------------------------------------
// ค่าสถานะแบบย่อสั้นที่สุด สำหรับช่องเก็บของที่มีที่ว่างนิดเดียว
// ใช้ตัวย่อสากลของ MOBA (AD/AP/HP/AR/MR/AS) เลยไม่ต้องแปลภาษา
// คืน [{ key, text, color }] เรียงตามความสำคัญของค่านั้นกับตัวไอเทม
// ---------------------------------------------------------------
export function itemStatChips(it) {
  if (!it) return [];
  const p = [];
  const add = (key, text) => p.push({ key, text, color: STAT_C[key] || C.ink });
  const pct = (v) => Math.round(v * 100);
  if (it.ad) add("ad", "+" + it.ad + " AD");
  if (it.adPct) add("adPct", "+" + pct(it.adPct) + "% AD");
  if (it.ap) add("ap", "+" + it.ap + " AP");
  if (it.apPct) add("apPct", "+" + pct(it.apPct) + "% AP");
  if (it.hp) add("hp", "+" + it.hp + " HP");
  if (it.armor) add("armor", "+" + it.armor + " AR");
  if (it.mr) add("mr", "+" + it.mr + " MR");
  if (it.asPct) add("asPct", (it.asPct > 0 ? "+" : "") + pct(it.asPct) + "% AS");
  if (it.crit) add("crit", "+" + pct(it.crit) + "% CRIT");
  if (it.critDmg) add("critDmg", "+" + pct(it.critDmg) + "% CDMG");
  if (it.ah) add("ah", "+" + it.ah + " AH");
  if (it.ultCdr) add("ultCdr", "-" + pct(it.ultCdr) + "% R-CD");
  if (it.ms) add("ms", "+" + it.ms + " MS");
  if (it.msPct) add("msPct", "+" + pct(it.msPct) + "% MS");
  if (it.pen) add("pen", "+" + it.pen + " PEN");
  if (it.arPen) add("pen", "+" + it.arPen + " AR-PEN");
  if (it.mrPen) add("pen", "+" + it.mrPen + " MR-PEN");
  if (it.armorPenPct) add("armorPenPct", pct(it.armorPenPct) + "% AR-PEN");
  if (it.mrPenPct) add("mrPenPct", pct(it.mrPenPct) + "% MR-PEN");
  if (it.hp5) add("hp5", "+" + it.hp5 + " HP5");
  if (it.range) add("range", "+" + it.range + " RNG");
  if (it.omnivampFlat) add("omnivampFlat", "+" + pct(it.omnivampFlat) + "% VAMP");
  if (it.hors) add("hors", "+" + pct(it.hors) + "% H/S");
  if (it.healAmp) add("healAmp", "+" + pct(it.healAmp) + "% HEAL");
  if (it.tenacity) add("tenacity", "+" + pct(it.tenacity) + "% TEN");
  if (it.goldPerRound) add("goldPerRound", "+" + it.goldPerRound + "g");
  return p;
}


// ความสามารถของไอเทม — ทุกอย่างที่ไม่ใช่ตัวเลขค่าสถานะดิบ
export function itemAbility(it) {
  const p = [];
  if (it.onHitAdaptive) p.push(tr("ออโต้เพิ่ม {0}% Max HP ศัตรู", Math.round(it.onHitAdaptive * 100)));
  if (it.dmgAmpHighHp) p.push(tr("เลือด 80% ขึ้นไป ตีแรงขึ้น {0}% ทุกชนิด", Math.round(it.dmgAmpHighHp * 100)));
  if (it.antihealOnDmg) p.push(tr(
    "ทำดาเมจใส่ใคร ตัดฮีลของเป้า {0}% นาน {1} วิ",
    Math.round(it.antihealOnDmg.v * 100), it.antihealOnDmg.dur
  ));
  if (it.tier3ScalingHors) p.push(tr(
    "ฮีล/โล่ที่จ่ายให้เพื่อน +{0}% ต่อไอเทม Tier 3 ที่ถืออยู่ (รวมชิ้นนี้)",
    Math.round(it.tier3ScalingHors * 100)
  ));
  if (it.auraArmor) p.push(tr("ทีมได้ +{0} เกราะ ขณะยังไม่ตาย", it.auraArmor));
  if (it.auraAdPct) p.push(tr("ทีมได้ +{0}% AD ขณะยังไม่ตาย", Math.round(it.auraAdPct * 100)));
  if (it.leashCap) p.push(tr("ไม่ออกห่างทีมเกิน 150"));
  if (it.noChaseLowHp) p.push(tr("ไม่ไล่ตัวเลือดแดงออกนอกทีม"));
  if (it.dmgPct) p.push(tr("+{0}% ดาเมจ เมื่อสั่ง{1}", Math.round(it.dmgPct * 100), STYLES[it.style].th));
  if (it.armorPct) p.push(tr("+{0}% เกราะ เมื่อสั่ง{1}", Math.round(it.armorPct * 100), STYLES[it.style].th));

  // ---- ของที่แก้ในแพตช์ 0.2 — เขียนสูตรคิดให้ครบ ไม่ใช่แค่บอกผล ----
  if (it.hearth) p.push(tr(
    "เผาศัตรูในรัศมี {0} ทุก {1} วิ ครั้งละ {2} + {3}% Max HP ของตัวเอง (เป็นดาเมจเวท)",
    it.hearth.r, it.hearth.every, it.hearth.flat, (it.hearth.ownHpPct * 100).toFixed(1)
  ));
  if (it.idunn) p.push(tr(
    "เลือดต่ำกว่า {0}% แล้วโดนตี จะฟื้น {1}% ของเลือดที่หายไป ทยอยใน {2} วิ (ทุก {3} วิ)",
    Math.round(it.idunn.hpBelow * 100), Math.round(it.idunn.missingPct * 100), it.idunn.over, it.idunn.cd
  ));
  if (it.healAmpUniq) p.push(tr(
    "ฮีล เกราะป้องกัน และดูดเลือดที่ตัวเองได้รับ แรงขึ้น {0}% (คูณหลังพลังฮีลของคนจ่าย)",
    Math.round(it.healAmp * 100)
  ));
  if (it.cijNoTenacity) p.push(tr("อยู่ในไฟต์ครบทุก 3 วิ ได้เกราะและต้านเวท +6 สะสมสูงสุด 5 ชั้น · ครบ 5 ชั้นคูณอีก 1.1 เท่า"));
  if (it.gleipnir) p.push(tr(
    "ยิงโซ่ล่ามศัตรูตัวแรกที่โดน นาน {0} วิ (คูลดาวน์ {1} วิ) · ระหว่างโดนล่าม เป้าโดนลด Tenacity {2}%",
    it.gleipnir.dur, it.gleipnir.cd, Math.round(it.gleipnir.tenacityCut * 100)
  ));
  if (it.centaurBleed) p.push(tr(
    "{0}% ของดาเมจทุกชนิดที่โดน กลายเป็นเลือดไหลแบบ True Damage {1} วิ · สังหารหรือช่วยสังหารจะล้างเลือดไหลแล้วฟื้นคืน {2}% ของยอดที่ยังไม่ทันไหลออก",
    Math.round(it.centaurBleed.pct * 100), it.centaurBleed.dur, Math.round(it.centaurBleed.healBack * 100)
  ));
  if (it.centaurStack) p.push(tr(
    "ทำดาเมจหรือโดนดาเมจ สะสมชั้นละ +{0} เกราะ ต้านเวท และ AD สูงสุด {1} ชั้น · ครบ {1} ชั้นได้ต้านสโลว์ {2}% และ Tenacity {3}% ไปจนจบไฟต์",
    it.centaurStack.ar, it.centaurStack.max,
    Math.round(it.centaurStack.capSlowResist * 100), Math.round(it.centaurStack.capTenacity * 100)
  ));
  if (it.wendigo) p.push(tr(
    "ศัตรูคนแรกของไฟต์ที่เลือดเหลือต่ำกว่า {0}% ของ Max HP จะโดนประหารทันที และได้เงินกระเป๋าแยกเพิ่ม {1}",
    Math.round(it.wendigo.execPct * 100), it.wendigo.gold
  ));
  if (it.lowHpVamp) p.push(tr(
    "เลือดเหลือ {0}% หรือน้อยกว่า ได้ดูดเลือดเพิ่มอีก {1}% (รวมเป็น {2}%)",
    Math.round(it.lowHpVamp.hpBelow * 100), Math.round(it.lowHpVamp.add * 100),
    Math.round(((it.omnivampFlat || 0) + it.lowHpVamp.add) * 100)
  ));
  if (it.healthyAmp) p.push(tr(
    "ตีศัตรูที่เลือดมากกว่า {0}% ของ Max HP แรงขึ้น {1}% ทุกชนิด",
    Math.round(it.healthyAmp.hpAbove * 100), Math.round(it.healthyAmp.amp * 100)
  ));
  if (it.apolloSplit) p.push(tr(
    "เลือด {0}% ขึ้นไป ได้ +{1} AD · ต่ำกว่านั้นเปลี่ยนเป็นดูดเลือด {2}% แทน",
    Math.round(it.apolloSplit.hpAbove * 100), it.apolloSplit.ad, Math.round(it.apolloSplit.omnivamp * 100)
  ));
  if (it.takedownHeal && it.takedownHeal.team) p.push(tr(
    "สังหารหรือช่วยสังหาร{0} ฮีลทั้งทีม {1} + {2}% AP",
    it.takedownHeal.once ? tr("ครั้งแรกของไฟต์") : "",
    it.takedownHeal.flat, Math.round(it.takedownHeal.apRatio * 100)
  ));
  if (it.motFlat) p.push(tr(
    "ลดดาเมจออโต้ที่โดน {0} + 3.5 ต่อ Max HP ทุก 1000 ของตัวเอง (คริของศัตรูโดนลดผลอีก 30%)",
    it.motFlat
  ));
  if (it.ultZone) p.push(tr(
    "ท่าไม้ตายทิ้งเขตไว้ รัศมี {0} นาน {1} วิ ทำดาเมจ {2} + {3}% AP ต่อวินาที และลดต้านเวทเป้า {4}%",
    it.ultZone.r, it.ultZone.dur, it.ultZone.flat,
    Math.round(it.ultZone.apRatio * 100), Math.round(it.ultZone.mrShred * 100)
  ));
  if (it.spellSlow) p.push(tr(
    "สกิลที่โดนศัตรู สโลว์ {0}% นาน {1} วิ",
    Math.round(it.spellSlow.v * 100), it.spellSlow.dur
  ));
  if (it.spellHaste) p.push(tr(
    "ร่ายสกิลแล้วเร็วขึ้น {0}% นาน {1} วิ",
    Math.round(it.spellHaste.ms * 100), it.spellHaste.dur
  ));
  if (it.chainBolt) p.push(tr(
    "สายฟ้ากระโดด {0} ต่อ ระยะ {1} — ตัวแรก {2} + {3}% AP · ตัวถัดไป {4} + {5}% AP (คูลดาวน์ {6} วิ)",
    it.chainBolt.arcs, it.chainBolt.arcRange, it.chainBolt.flat,
    Math.round(it.chainBolt.apRatio * 100), it.chainBolt.arcFlat,
    Math.round(it.chainBolt.arcApRatio * 100), it.chainBolt.cd
  ));

  const passive = PASSIVES()[it.id];
  if (passive) p.push(passive);
  return p;
}


// ข้อความรวมบรรทัดเดียว — ใช้ในแถวแคบๆ กับตัวกรองค้นหา
export function itemDesc(it) {
  return [...itemStats(it).map((x) => x.text), ...itemAbility(it)].join(" · ");
}


function PASSIVES() {
  return {
    nlm: tr("โดนตีแล้วสะท้อนดาเมจ 15 + 25% Bonus เกราะ กลับไปหาคนตี ทุกวินาที"),
    msq: tr("ลดความเร็วโจมตีศัตรูรอบตัว 400 หน่วย 25% (หลายชิ้นไม่ทับกัน)"),
    mgc: tr("โดนเวทสะสม Stack สูงสุด 10 (+30 ต้านเวท) ครบ 10 ได้ +10% ความเร็วเดิน"),
    sab: tr(
      "ชาร์จได้สูงสุด 2 วิ (ปล่อยก่อนได้) ระหว่างชาร์จกันดาเมจ 40-60% ตามเลเวล แล้ว Taunt ศัตรูรอบตัว 450 หน่วย 0.5-2 วิ ตามเวลาที่ชาร์จ (ทุก 45 วิ)"
    ),
    biv: tr(
      "ออโต้ครั้งแรกต่อเป้าเพิ่มดาเมจ 15% Max HP ศัตรูและฮีลกลับเต็ม (ต่อตัว ทุก 6 วิ คงที่ ไม่ลดตาม AH)"
    ),
    soo: tr(
      "ตายครั้งแรกในไฟต์กลายเป็นแช่แข็ง 3 วิแทน แล้วฟื้นคืนชีพ 30% Base HP (ใช้ได้ครั้งเดียว)"
    ),
    bdc: tr("ใช้สกิลแล้วออโต้ครั้งถัดไปเพิ่ม 175% Base AD และวิ่งไว 2 วิ (ทุก 1.5 วิ)"),
    cbg: tr(
      "ออโต้ลดเกราะศัตรู 5% สะสมสูงสุด 5 ชั้น (25%) และเพิ่มความเร็วเดินตามจำนวนชั้น"
    ),
    pnb: tr(
      "ตี/โดนตีสะสมสูงสุด 15 ชั้น ได้เกราะและ Tenacity ตามชั้น ครบ 15 ได้ Slow Resist และวิ่งไวอีก 10 วิ"
    ),
    cco: tr("ได้ AD เพิ่มตาม Bonus HP · ออโต้กวาดโคนด้านหลังเป้า"),
    goh: tr("สโลว์ศัตรูรอบตัว 35% พร้อมวิ่งไวตัวเอง 30% นาน 2 วิ (ทุก 20 วิ)"),
    dss: tr(
      "ติด CC แล้วล้าง CC ทันที + กัน CC 0.5 วิ + วิ่งไว 30% นาน 1.5 วิ (ทุก 45 วิ) · ดูดเลือดทุกชนิด 10%"
    ),
    swf: tr("เลือดต่ำกว่า 30% รับโล่ 250 (+100% Bonus AD) นาน 4 วิ (ทุก 60 วิ)"),
    slh: tr("ทุก 10 วิ ออโต้ครั้งแรกได้ความเร็วเดิน +40% แล้วค่อยๆ จางหายใน 2.5 วิ"),
    ulf: tr("ออโต้ลดคูลดาวน์ที่เหลือของ Q W E ลง 12%"),
    ivd: tr("ออโต้ครบ 3 ครั้ง ระเบิด True Damage 60 (+35% Bonus AD)"),
    hth: tr("ออโต้ครั้งที่ 3 เบิ้ลผล on-hit ทั้งหมดซ้ำอีก 2 ครั้งในฮิตนั้น"),
    boe: tr("ทุก 5 วิ ออโต้ครั้งถัดไปยิงไกลขึ้น 150 หน่วย และแถมดาเมจเวท 50 (+20% AP)"),
    cns: tr("จบการพุ่ง ออโต้ครั้งถัดไปแถมดาเมจกายภาพ 80 (+50% Bonus AD) (ทุก 6 วิ)"),
    smc: tr("10 วินาทีแรกของไฟต์ ได้เจาะเกราะเพิ่ม +15"),
    sls: tr("เข้าปะทะแล้วได้ความเร็วเดิน +40% นาน 3 วิ (ทุก 15 วิ) · สังหารศัตรูได้ คูลดาวน์พร้อมใช้ทันที"),
    htc: tr("ตีหรือใช้สกิลใส่เป้าเดิมครบ 3 ฮิตใน 2 วิ ระเบิด True Damage 8% Max HP (ต่อตัว ทุก 8 วิ)"),
    fms: tr("ดาเมจกินหลอดโล่แรงขึ้น 50% และเป้าที่โดนรับโล่ใหม่ได้น้อยลง 40% นาน 3 วิ"),
    jvb: tr("ตีใส่ศัตรูที่เลือดต่ำกว่า 50% แถมดาเมจกายภาพ 100 (+40% Bonus AD) (ต่อตัว ทุก 6 วิ)"),
    trs: tr("สังหารหรือช่วยสังหาร รีเซ็ตคูลดาวน์ Q W E ทันที (ครั้งแรกครั้งเดียวต่อยก)"),
    adm: tr("ขว้างมีดใส่ศัตรูที่ใกล้ที่สุด สโลว์ 40% นาน 2 วิ และเป้ารับดาเมจจากเราแรงขึ้น 15% นาน 4 วิ (ทุก 35 วิ)"),
    fsd: tr("โดนดาเมจที่จะตาย เลือดล็อกที่ 1 แล้วอมตะ 2 วิ (ครั้งเดียวต่อยก)"),
    kff: tr("ออโต้แถมดาเมจเวท 15 (+20% AP) ทุกครั้งที่ตีโดน"),
    csb: tr("หลังร่ายสกิล ออโต้ครั้งถัดไปแถมดาเมจเวท 75% Base AD + 45% AP (ทุก 1.5 วิ)"),
    stc: tr("ดาเมจเวทจุดไฟเผาเป้า 2% Max HP ต่อวินาที นาน 3 วิ"),
    zgc: tr("ทำดาเมจเวทแล้วได้ความเร็วเดิน +20% นาน 2 วิ (ไม่มีคูลดาวน์)"),
    nvs: tr("แปะมาร์กเป้า 2.5 วิ ครบเวลาระเบิดซ้ำ 100 (+20% ดาเมจเวทที่สะสมไว้) (ทุก 25 วิ)"),
    rsd: tr("สกิลเวทถัดไปแรงขึ้น 80 (+25% AP) และชิ่งไปหาศัตรูข้างเคียง 3 ตัว 40 (+15% AP) (ทุก 12 วิ)"),
    hnd: tr("ร่ายท่าไม้ตายแล้วเปิดวงน้ำแข็ง 450 หน่วย นาน 4 วิ เผา 20 (+10% AP) ต่อวินาที และลดต้านเวทศัตรูในวง 15%"),
    mrt: tr("ยิงดาวตกใส่ศัตรูในระยะ 1200 ระเบิดรัศมี 200 หน่วย ดาเมจเวท 120 (+40% AP) (ทุก 25 วิ)"),
    ntw: tr("ร่ายท่าไม้ตายแล้วได้ความเร็วเดิน +30% และ AP +20% นาน 4 วิ"),
    ats: tr("ฮีลหรือกางโล่ให้เพื่อน ส่งต่อผล 25% ให้เพื่อนที่เลือดเหลือน้อยสุดในระยะ 750 ด้วย"),
    acb: tr(
      "ฮีลหรือกางโล่ให้เพื่อน ทั้งคู่ได้ 4 วิ · ความเร็วโจมตี +15% (+0.5% ต่อเลเวล) · ออโต้แถมดาเมจเวท 5 (+1.5 ต่อเลเวล) (+5% AP)"
    ),
    sfv: tr(
      "ฮีลหรือกางโล่ให้เพื่อน ทั้งคู่ได้ 4 วิ · AP +13 (+1 ต่อเลเวล) · Ability Haste +15"
    ),
    esb: tr("เพื่อนเลือดต่ำกว่า 40% กางวง 700 หน่วย อีก 2 วิ ฮีลทุกคนในวง 10% Max HP (ทุก 60 วิ)"),
    abw: tr("กดเองตามจังหวะ — เข้าปะทะ เพื่อนโดนสโลว์ หรือเพื่อนเลือดต่ำกว่าครึ่ง · เพื่อนในระยะ 700 ได้ความเร็วเดิน +20% ถึง +45% ตามเลเวล แล้วค่อยๆ จางใน 3 วิ (ทุก 20 วิ)"),
    hmb: tr("ล้างสถานะติดตัวทุกชนิดให้เพื่อนหรือตัวเองทันที (รวมสโลว์และใบ้) + กัน CC 1 วิ + ฮีล 50 (+6 ต่อเลเวล) (+25% AP) (ทุก 60 วิ)"),
    pib: tr("เพื่อนเลือดต่ำกว่า 50% กางโล่ให้เพื่อนในระยะ 700 เท่ากับ 100 (+15 ต่อเลเวล) นาน 3 วิ (ทุก 60 วิ)"),
    gwc: tr("ออร่ารอบตัว 600 หน่วย เพื่อนได้ความเร็วเดิน +15 และความเร็วโจมตี +10% ตลอดเวลาที่ยังไม่ตาย"),
    ood: tr(
      "ผูกกับเพื่อน 1 คน (เน้นแครี่) · รับดาเมจแทน 15% (หยุดเมื่อตัวเองเลือดต่ำกว่า 20%) · ฮีลตัวเอง 10% ของดาเมจที่เพื่อนทำได้ · เพื่อนตายแล้วผูกใหม่ใน 5 วิ"
    ),
  };
}
