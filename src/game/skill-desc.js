// ---------------------------------------------------------------
// อ่านข้อมูลสกิลดิบ แล้วแปลงเป็นบรรทัดที่คนอ่านรู้เรื่อง
// ใช้ทั้งในหน้า Character Info, ร้านค้าตอนอัพสกิล, ระหว่างไฟต์
// ตัวเลขทั้งหมดดึงจาก data/champions.js ตรงๆ ไม่ได้พิมพ์ซ้ำ
// เลยไม่มีทางหลุดเวลาจูนบาลานซ์
// ---------------------------------------------------------------
import { tr } from "../i18n.js";

export const MAX_RANK = (sk) => (sk && sk.ult ? 3 : 5);

// รูปทรง/วิธีใช้ของสกิลแต่ละแบบ
const SHAPES = {
  onHit: "ติดที่ออโต้ครั้งถัดไป",
  cone: "กรวยด้านหน้า",
  chargeDash: "ชาร์จแล้วพุ่ง",
  grabSlam: "จับแล้วฟาด",
  dual: "สองร่าง สลับได้",
  aoeGround: "ลงพื้นเป็นวง",
  aoeSelf: "ระเบิดรอบตัว",
  allyHot: "ฮีลเพื่อนต่อเนื่อง",
  teamHeal: "ฮีลทั้งทีม",
  barrage: "ยิงรัว",
  cage: "กรงล้อม",
  chargedBeam: "ลำแสงชาร์จ",
  crossDash: "พุ่งกากบาท",
  dash: "พุ่ง",
  globalStrike: "ยิงข้ามสนาม",
  lastStand: "ยืนหยัดตอนใกล้ตาย",
  line: "เส้นตรงทะลุ",
  markNext: "ติดมาร์กไว้จุดระเบิด",
  selfBuff: "บัฟตัวเอง",
  skyfall: "ร่วงจากฟ้า",
  submerge: "ดำลงพื้นน้ำ",
  targeted: "ล็อกเป้า",
  vampForm: "ร่างแวมไพร์",
  wave: "คลื่นกระจาย",
  absorbReflect: "ดูดแล้วสะท้อน",
  blinkDash: "วาร์ป",
  burstShield: "โล่ระเบิด",
  pulse: "คลื่นเป็นจังหวะ",
  // ---- ท่าของตัวละคร Patch 0.3 ----
  combo: "คอมโบสามจังหวะ",
  comboStep: "จังหวะคอมโบ",
  damageStash: "สะสมดาเมจแล้วจุดระเบิด",
  skyward: "กระโดดลอยหลบ",
  carriage: "ล่องหนแล้วเปิดตัว",
  basketZone: "วางโซนฮีลและบัฟ",
  allyRush: "จูงเพื่อนวิ่ง",
  truthAura: "ออร่าขยายบัฟและดีบัฟ",
  vortex: "พายุลอยแล้วค้าง",
  deltaDash: "พุ่งเป็นสามเหลี่ยม",
  starfall: "เหาะขึ้นฟ้าแล้วดิ่งลง",
  chargeFling: "พุ่งชนแล้วจับเหวี่ยง",
  wrathAura: "ออร่ากดพลังศัตรู",
  asuraSlam: "ทุบพื้นยกลอยหมู่",
  tripleSlam: "ทุบพื้นสามระลอก",
  rangeCharge: "ชาร์จเพิ่มระยะ",
  mask: "สลับหน้ากากเปลี่ยนสไตล์",
  thornCone: "กรวยหนามหน่วงเวลา ตรึงเท้าหมู่",
  twinCleave: "ฟันครึ่งวงกลมสองจังหวะ",
  zephyr: "ล่องหนก่อน กดซ้ำถึงจะพุ่ง",
  domain: "โดมพายุ ลบตัวตนตัวเอง",
  canopy: "โล่คู่ที่แบ่งดาเมจกัน",
  arbor: "หยั่งรากนิ่ง ฮีลทีมเป็นระลอก",
  rebound: "กระชากมีดที่ปักอยู่กลับ",
  bladeTempest: "กระโดดหลบแล้วสาดมีดรอบตัว",
  rampBuff: "เร่งความเร็วโจมตีสองจังหวะ",
  sightZone: "โซนเปิดตัวคนล่องหน",
  summonGiant: "อัญเชิญยักษ์",
  channelCone: "ยืนแทงรัวเป็นกรวย",
  bounceSlash: "ฟันกระเด้งหลายเป้า",
  coneVolley: "กรวยรัวสามระลอก",
  tempest: "พายุฟาดหลายระลอก",
  sledge: "ขว้างค้อน (ซ่อมของตัวเองได้)",
  wall: "ก่อกำแพงขวาง",
  steerDash: "พุ่งทะลุ ชนกำแพงแล้วระเบิด",
  bunker: "ก่อบ้านคุ้มภัย",
  pommel: "กระแทกด้ามดาบ (กดได้ตอนติด CC)",
  lungeSweep: "พุ่งแล้วฟันครึ่งวง",
  judgment: "ดาเมจจริงและประหาร",
  coneKnock: "กรวยผลักกระเด็น",
  meteorStorm: "เรียกฝนอุกกาบาต",
  mistform: "สลายร่างเป็นหมอก",
  bloodStorm: "พายุโลหิตรอบตัว",
  teaGarden: "สวนน้ำชา",
  allyBlink: "วาร์ปช่วยเพื่อน",
  wonderland: "แดนมหัศจรรย์",
  guardBurst: "เกราะแล้วระเบิด",
  dismissal: "จับแล้วทุ่ม",
  blinkBehind: "วาร์ปไปหลังเป้า",
};

// ฟิลด์ที่เปลี่ยนค่าตามแรงก์ — โชว์เป็นแถวเรียงทุกแรงก์
// fmt: n = ตัวเลข, pct = คูณ 100 ใส่ %, sec = วินาที
const RANKED = [
  ["dmg", "ดาเมจ", "n"],
  ["tickDmg", "ดาเมจต่อระลอก", "n"],
  ["popDmg", "ดาเมจตอนระเบิด", "n"],
  ["innerDmg", "ดาเมจวงใน", "n"],
  ["burstDmg", "ดาเมจตอนระเบิดซ้ำ", "n"],
  ["whirlDmg", "ดาเมจตอนหมุนฟันสวน", "n"],
  ["sweepDmg", "ดาเมจตอนฟันกวาด", "n"],
  ["castShield", "โล่ที่ได้ตอนกด", "n"],
  ["dualShield", "โล่ตอนถือสองมือ", "n"],
  ["apBuff", "พลังเวทที่แจกให้", "n"],
  ["amp", "ขยายดาเมจที่เป้ากินจากทุกแหล่ง", "pct"],
  ["vamp", "ดูดเลือดจากดาเมจที่ลง", "pct"],
  ["stashPct", "สัดส่วนดาเมจที่จดเก็บไว้", "pct"],
  ["cleaveRatio", "ดาเมจที่แผ่ไปโดนคนข้างๆ", "pct"],
  ["dualAs", "ความเร็วโจมตีตอนถือสองมือ", "pct"],
  ["burstAs", "ความเร็วโจมตีช่วงพุ่งแรก", "pct"],
  ["holdAs", "ความเร็วโจมตีช่วงรักษาระดับ", "pct"],
  ["execAt", "ประหารทันทีเมื่อเลือดเป้าต่ำกว่า", "pct"],
  ["repairPct", "ซ่อมคืนเป็นสัดส่วนของเลือดเต็มสิ่งก่อสร้าง", "pct"],
  ["drainByRank", "ดูดเลือดคืน", "pct"],
  ["durByRank", "อยู่นาน", "sec"],
  ["rangeByRank", "ระยะ", "n"],
  ["armDmg", "ดาเมจต่อแขน", "n"],
  ["heal", "ฮีล", "n"],
  ["shield", "โล่", "n"],
  ["pctMissingHp", "บวกตามเลือดที่เป้าหายไป", "pct"],
  ["hp", "เลือดที่ได้", "n"],
  ["pctMaxHp", "ดาเมจตาม Max HP เป้า", "pct"],
  ["slamPctMaxHp", "ดาเมจฟาดตาม Max HP", "pct"],
  ["bonusPct", "โบนัสจากดาเมจที่ลง", "pct"],
  ["reflect", "สะท้อนกลับ", "pct"],
  ["shred", "ลดเกราะ", "pct"],
  ["shredByRank", "ลดเกราะ", "pct"],
  ["slow", "สโลว์", "pct"],
  ["slowByRank", "สโลว์", "pct"],
  ["knockupByRank", "เวลาลอย", "sec"],
  ["asBuff", "เพิ่มความเร็วโจมตี", "pct"],
  ["adBuff", "เพิ่ม AD", "n"],
  ["adPct", "เพิ่ม AD", "pct"],
  ["msBuff", "เพิ่มความเร็วเดิน", "n"],
  ["msPct", "เพิ่มความเร็วเดิน", "pct"],
  ["radiusByRank", "รัศมี", "n"],
  // PHANTOM — ตัวเลขของหน้ากากสามใบ และดาเมจต่อมีดหนึ่งเล่มของ E
  ["adFlat", "หน้ากากโศกนาฏกรรม — เพิ่ม AD", "n"],
  ["asPct", "หน้ากากสุขนาฏกรรม — เพิ่มความเร็วโจมตี", "pct"],
  ["arPen", "หน้ากากมรณะ — เจาะเกราะ", "n"],
  ["ripDmg", "ดาเมจต่อมีดที่ปักอยู่หนึ่งเล่ม", "n"],
  // STEIN — เวลาตรึงเท้าของ W · ฮีลต่อระลอกและลดดาเมจของ R
  ["root", "ตรึงเท้า", "sec"],
  // KAMACHI — เร่งฝีเท้าตอนล่องหนของ E
  ["msBuff", "เพิ่มความเร็วเดิน", "pct"],
  ["dr", "ลดดาเมจที่รับ", "pct"],
  ["cdByRank", "คูลดาวน์", "sec"],
];

// ฟิลด์ค่าคงที่ทุกแรงก์
const FLAT = [
  ["range", "ระยะ", "n"],
  ["minRange", "ระยะต่ำสุด", "n"],
  ["radius", "รัศมี", "n"],
  ["popRadius", "รัศมีตอนระเบิด", "n"],
  ["burstRadius", "รัศมีตอนระเบิดซ้ำ", "n"],
  ["bounceRange", "ระยะกระเด้งไปเป้าถัดไป", "n"],
  ["mirrorWidth", "ความกว้างของร่างสะท้อน", "n"],
  ["angle", "องศา", "deg"],
  ["width", "ความกว้าง", "n"],
  ["thickness", "ความหนา", "n"],
  ["armLen", "ความยาวแขน", "n"],
  ["armWidth", "ความกว้างแขน", "n"],
  ["dashRange", "ระยะพุ่ง", "n"],
  ["backstep", "ดีดถอยหลังออก", "n"],
  ["dashSpeed", "ความเร็วพุ่ง", "n"],
  ["grabRange", "ระยะจับ", "n"],
  ["engageRange", "ระยะเข้าปะทะ", "n"],
  ["count", "จำนวนสะเก็ดที่กวาด", "n"],   // cone ไม่ได้ยิงลูกจริง นี่คือจำนวนเส้นที่ใช้หาว่าใครโดน
  ["charges", "ชาร์จเก็บได้", "n"],
  ["ammoMax", "กระสุนสูงสุด", "n"],
  ["rechargeTime", "เวลาชาร์จกระสุน", "sec"],
  ["rechargeCutOnAuto", "ออโต้ที่ลงดึงเวลาชาร์จให้เร็วขึ้น", "sec"],   // on-hit.js
  ["rechargeCutOnCrit", "ออโต้ที่คริดึงเวลาชาร์จให้เร็วขึ้น", "sec"],
  ["cast", "เวลาร่าย", "sec"],
  ["delay", "หน่วงก่อนลง", "sec"],
  ["dur", "อยู่นาน", "sec"],
  ["castShieldDur", "โล่ตอนกดอยู่นาน", "sec"],
  ["dualDur", "ถือสองมืออยู่นาน", "sec"],
  ["burstSlowDur", "สโลว์จากการระเบิดซ้ำอยู่นาน", "sec"],
  ["backSlowDur", "สโลว์จากการแทงข้างหลังอยู่นาน", "sec"],
  ["allyResDur", "เพื่อนยืมเกราะไปได้นาน", "sec"],
  ["killMsDur", "เร่งฝีเท้าหลังเก็บศพนาน", "sec"],
  ["revealDur", "เปิดตัวศัตรูที่ล่องหนนาน", "sec"],
  ["linger", "ค้างบนพื้นต่ออีก", "sec"],
  ["travel", "แตะไม่ได้ระหว่างพุ่งนาน", "sec"],
  ["buffDur", "บัฟอยู่นาน", "sec"],
  ["slowDur", "สโลว์นาน", "sec"],
  ["burstSlow", "สโลว์จากการระเบิดซ้ำ", "pct"],
  ["backSlow", "สโลว์เมื่อแทงจากข้างหลัง", "pct"],
  ["slowBase", "สโลว์ค่าฐาน", "pct"],
  ["slowPerLevel", "สโลว์เพิ่มต่อเลเวล", "pct"],
  ["killMs", "เร่งฝีเท้าหลังเก็บศพ", "pct"],
  ["ccCut", "ตัดเวลา CC ที่ติดอยู่ลง", "pct"],
  ["repeatMul", "ดาเมจของครั้งที่สองเป็นต้นไป", "pct"],
  ["pullHalf", "แรงลากเข้าหาตัว", "pct"],
  ["repairRes", "เกราะ+ต้านเวทของคนซ่อม → ยอดซ่อม", "pct"],
  ["repairCdCut", "ซ่อมแล้วตัดคูลดาวน์ท่าหลักลง", "pct"],
  ["autoCdCut", "ออโต้โดนแล้วลดคูลดาวน์ลง", "sec"],
  ["reviveOnce", "ฟื้นคืนชีพครั้งเดียวด้วยเลือด", "pct"],
  ["allyResPct", "แบ่งเกราะ/ต้านเวทของตัวเองให้เพื่อน", "pct"],
  ["markDur", "มาร์กอยู่นาน", "sec"],
  ["window", "ต้องใช้ภายใน", "sec"],
  ["bleedDur", "เลือดไหลนาน", "sec"],
  ["shredDur", "ลดเกราะนาน", "sec"],
  ["tenacityDur", "ลดเวลาติดล็อกนาน", "sec"],
  ["lockTime", "ล็อกเป้านาน", "sec"],
  ["airborne", "ลอยกลางอากาศ", "sec"],
  ["airTime", "เวลาบิน", "sec"],
  ["air", "ลอยแตะไม่ได้", "sec"],
  ["hideDur", "ล่องหนนาน", "sec"],
  ["gap", "ห่างกันสองจังหวะ", "sec"],
  ["bothSlow", "สโลว์เมื่อโดนครบสองจังหวะ", "pct"],
  ["share", "แบ่งดาเมจของเพื่อนมารับแทน", "pct"],
  ["stacks", "ปักมีดทันที", "n"],
  ["knockup", "เวลาลอย", "sec"],
  ["knockback", "ผลักไกล", "n"],
  ["stunMin", "สตันต่ำสุด", "sec"],
  ["stunMax", "สตันสูงสุด", "sec"],
  ["landStun", "สตันตอนลง", "sec"],
  ["landSlow", "สโลว์ตอนลง", "pct"],
  ["landSlowDur", "สโลว์ตอนลงนาน", "sec"],
  ["tenacity", "ลดเวลาติดล็อก", "pct"],
  ["selfSlow", "ตัวเองช้าลง", "pct"],
  ["maxCharge", "ชาร์จได้ถึง", "sec"],
  ["fullCharge", "ชาร์จเต็มที่", "sec"],
  ["falloff", "ดาเมจซ้ำเหลือ", "pct"],
  ["edgeMult", "โดนขอบวงคูณ", "x"],
  ["soloMult", "โดนตัวเดียวคูณ", "x"],
  ["drain", "ดูดเลือดคืน", "pct"],
  ["extend", "ต่อเวลาได้", "sec"],
  ["cdRefundOnHit", "โดนแล้วคืนคูลดาวน์", "pct"],
  ["cdCutOnHit", "โดนแล้วตัดคูลดาวน์ที่เหลือ", "pct"],
  ["cdCutAll", "ลดคูลดาวน์สกิลอื่น", "sec"],
  ["cdPerAuto", "ออโต้ลดคูลดาวน์", "sec"],
  ["speed", "ความเร็วกระสุน", "n"],
  ["projSpeed", "ความเร็วกระสุน", "n"],
  ["autoBoost", "เพิ่มระยะออโต้", "n"],
  ["skillBoost", "เพิ่มระยะสกิล", "n"],
  ["life", "กระสุนอยู่นาน", "sec"],
  ["daggerBleed", "พิษกริชนาน", "sec"],
  ["ticks", "จำนวนระลอก", "n"],
  ["every", "ทุกๆ", "sec"],
  ["hits", "จำนวนฮิต", "n"],
  ["waves", "จำนวนระลอก", "n"],
  ["telegraph", "เวลาเตือนก่อนลง", "sec"],
  ["pauseAt", "หยุดก่อนฟัน", "sec"],
  ["submergeFixed", "ดำอยู่ใต้น้ำนาน", "sec"],
  ["surfaceDelay", "โผล่ขึ้นแล้วหน่วงก่อนทุบ", "sec"],
  ["speedMax", "ความเร็วสูงสุด", "n"],
  ["throwRange", "ระยะทุ่ม", "n"],
  ["rangeMin", "ระยะต่ำสุด", "n"],
  ["rangeMax", "ระยะสูงสุด", "n"],
  ["widthMin", "ความกว้างต่ำสุด", "n"],
  ["widthMax", "ความกว้างสูงสุด", "n"],
  ["burstAt", "ระเบิดที่วินาทีที่", "sec"],
  ["burstPct", "ระเบิดเป็น % ของโล่", "pct"],
  ["evade", "หลบทุกอย่างได้", "sec"],
  ["res", "เกราะ/ต้านเวทของสิ่งก่อสร้าง", "n"],
  ["hitDmg", "ดาเมจตอนชน", "n"],
  ["msDur", "ความเร็วเดินอยู่นาน", "sec"],
  ["gainStack", "ได้สแตกตอนกด", "n"],
  ["blinkRange", "ระยะวาร์ป", "n"],
  ["charmSlow", "สโลว์ตอนโดนเสน่ห์", "pct"],
  ["slowFlat", "สโลว์", "pct"],
  ["slowImmuneDur", "กันสโลว์นาน", "sec"],
  ["regen", "คืนเวลาต่อฮิต", "sec"],
  ["bleedSlowBase", "สโลว์จากเลือดไหล", "pct"],
  ["bountyOnCrit", "คริแล้วได้เงินโจรสลัด", "n"],
  ["breakSlow", "สโลว์ตอนกรงแตก", "pct"],
  ["breakSlowDur", "สโลว์ตอนกรงแตกนาน", "sec"],
  ["lungeSpeed", "ความเร็วพุ่งเข้าหา", "n"],
  ["lungeRange", "ระยะพุ่งเข้าหา", "n"],
  ["knockupPerMs", "เวลาลอยต่อความเร็วเดินส่วนเกิน 1", "sec"],
  ["knockupCap", "เวลาลอยสูงสุด", "sec"],
  ["knockupPerApMs", "เวลาลอยต่อ MS จาก AP 100", "sec"],
  ["allyMs", "เพื่อนในวงเร็วขึ้น", "pct"],
  ["allyMsDur", "เพื่อนเร็วขึ้นนาน", "sec"],
  ["selfMs", "ตัวเองเร็วขึ้น", "pct"],
  ["selfDur", "บัฟตัวเองนาน", "sec"],
  ["reflect", "สะท้อนคืน", "pct"],
  ["lookback", "ย้อนดูดาเมจที่กินมา", "sec"],
  ["reviveDelay", "ล้มนิ่งก่อนลุก", "sec"],
  ["reviveHp", "ลุกมาพร้อมเลือด", "pct"],
  ["upPctMaxHp", "อัพเกรดแล้วบวกดาเมจตาม Max HP เป้า", "pct"],
  ["upRadius", "อัพเกรดแล้วรัศมี", "n"],
  ["upDelay", "อัพเกรดแล้วดีเลย์", "sec"],
  ["grace", "ยืดต่อได้อีก", "sec"],
  ["holdNeed", "ต้องมีศัตรูในวงกี่ตัวถึงอยู่ต่อ", "n"],
];

// ---------------------------------------------------------------
// ค่าสเกล — ทุกอย่างที่ทำให้ตัวเลขของท่าโตขึ้นตามของที่ออกหรือตามเลเวล
//
// เดิมมีอยู่แค่สิบช่อง ที่เหลือไปจมอยู่ในตารางค่าคงที่ ผู้เล่นจึงเห็น
// "Scales with: +60% AD" ทั้งที่จริงๆ ท่านั้นสเกลกับ Bonus HP อีกสองทาง
//
// รูปแบบตัวเลข:
//   pct    = ตัวคูณธรรมดา  0.6  -> "+60%"
//   rank   = ไล่ตามขั้นสกิล [0.1, 0.2] -> "+10/20%"
//   flat   = ตัวเลขตรงๆ ไม่ใช่ร้อยละ
//   per100n = ต่อค่าสถานะทุก 100 หน่วย ได้เป็นตัวเลขตรงๆ (AP 100 -> +3 AD)
//   per100p = ต่อค่าสถานะทุก 100 หน่วย ได้เป็นร้อยละ (AP 100 -> +3% ความเร็วเดิน)
// ---------------------------------------------------------------
const RATIOS = [
  // ---- ดาเมจของท่าหลัก ----
  ["adRatio", "AD", "pct"],
  ["badRatio", "Bonus AD", "pct"],
  ["apRatio", "AP", "pct"],
  ["bonusHpRatio", "Bonus HP", "pct"],
  ["selfBonusHp", "Bonus HP → ดาเมจ", "pct"],
  ["selfMaxHp", "Max HP → ดาเมจ", "pct"],
  ["bonusHp", "Bonus HP → ดาเมจ", "pct"],
  ["enemyCurHp", "เลือดที่เป้าเหลืออยู่ → ดาเมจ", "pct"],
  ["enemyMissingHp", "เลือดที่เป้าหายไปแล้ว → ดาเมจ", "pct"],
  ["aoeBad", "Bonus AD → ดาเมจสาด", "pct"],
  ["aoeBonusHp", "Bonus HP → ดาเมจสาด", "pct"],
  ["whirlBadRatio", "Bonus AD → ดาเมจตอนหมุนฟันสวน", "pct"],
  ["sweepBadRatio", "Bonus AD → ดาเมจตอนฟันกวาด", "pct"],
  ["dualShieldBad", "Bonus AD → โล่ตอนถือสองมือ", "pct"],
  ["maxHpRatio", "Max HP → โล่", "pct"],
  ["shieldMaxHp", "Max HP → โล่", "pct"],
  ["healMaxHp", "Max HP → ฮีล", "pct"],
  ["bleedSlowPerAp", "AP 100 → สโลว์จากเลือดไหล", "per100p"],
  ["auraSlowPerAp", "AP 100 → สโลว์จากออร่า", "per100p"],
  ["execPerBad", "Bonus AD 100 → เกณฑ์ประหาร", "per100p"],
  ["selfStacks", "ต่อสแตกที่สะสมไว้ → ดาเมจ", "flat"],
  ["enemyMaxHp", "เลือดสูงสุดของเป้า → ดาเมจ", "pct"],
  ["pctPerBad", "Max HP เป้า ต่อ Bonus AD 100", "pct"],
  // ---- ดาเมจก้อนย่อยของท่าเดียวกัน ----
  ["armAdRatio", "AD → ดาเมจแต่ละแขน", "pct"],
  ["fullBadRatio", "Bonus AD → ดาเมจตอนชาร์จเต็ม", "pct"],
  ["hitBadRatio", "Bonus AD → ดาเมจตอนชน", "pct"],
  ["hitBonusHp", "Bonus HP → ดาเมจตอนชน", "pct"],
  ["burstBadRatio", "Bonus AD → ดาเมจตอนระเบิด", "pct"],
  ["burstBonusHp", "Bonus HP → ดาเมจตอนระเบิด", "pct"],
  ["ripBadRatio", "Bonus AD → ดาเมจต่อมีดหนึ่งเล่ม", "pct"],
  ["innerApRatio", "AP → ดาเมจด้านใน", "pct"],
  ["popApRatio", "AP → ดาเมจตอนระเบิด", "pct"],
  ["tickApRatio", "AP → ดาเมจต่อระลอก", "pct"],
  ["onHitApRatio", "AP → ดาเมจติดออโต้", "pct"],
  // ---- โล่ ----
  ["shieldBad", "Bonus AD → โล่", "pct"],
  ["shieldBonusHp", "Bonus HP → โล่", "pct"],
  ["shieldBonusArmor", "Bonus Armor → โล่", "pct"],
  ["shieldBonusMr", "Bonus MR → โล่", "pct"],
  ["castShieldBonusHp", "Bonus HP → โล่ตอนกด", "pct"],
  ["shieldAp", "AP → โล่", "pct"],
  // ---- ฮีล ----
  ["healBonusHp", "Bonus HP → ฮีล", "pct"],
  ["healAp", "AP → ฮีล", "pct"],
  ["healPct", "โล่ที่กางไว้ → ฮีลคืนให้ตัวเอง", "pct"],
  ["healPctDealt", "ดาเมจที่ท่านี้ทำได้ → ฮีลคืน", "rank"],
  ["allyPct", "ดาเมจที่เพื่อนกินมา → ฮีลและโล่ให้เพื่อน", "rank"],
  // ---- สิ่งก่อสร้าง ----
  ["hpBonusHp", "Bonus HP → เลือดสิ่งก่อสร้าง", "pct"],
  ["resRatio", "เกราะ/ต้านเวทของตัวเอง → ของสิ่งก่อสร้าง", "pct"],
  // ---- ค่าที่คิดต่อสถานะทุก 100 หน่วย ----
  ["adPerAp", "AP ทุก 100 → เพิ่ม AD", "per100n"],
  ["apPerAp", "AP ทุก 100 → เพิ่ม AP", "per100n"],
  ["msPerAp", "AP ทุก 100 → เพิ่มความเร็วเดิน", "per100p"],
  ["ampPerAp", "AP ทุก 100 → ขยายผล", "per100p"],
  ["stashPerAp", "AP ทุก 100 → สะสมดาเมจเพิ่ม", "per100p"],
  ["slowPerAp", "AP ทุก 100 → สโลว์เพิ่ม", "per100p"],
  ["knockupPerMs", "วิ ต่อความเร็วเดินส่วนเกิน 1 → เวลาลอย", "flat"],
  ["knockupPerApMs", "วิ ต่อความเร็วเดินจาก AP 100 → เวลาลอย", "flat"],
];

const FLAGS = [
  ["magic", "ดาเมจเวท"],
  ["pierce", "ทะลุหลายตัว"],
  ["cleanse", "ล้างสถานะติดตัว"],
  ["slowImmune", "กันสโลว์"],
  ["flying", "ข้ามสิ่งกีดขวาง"],
  ["upTrue", "อัพเกรดแล้วเป็น True Damage"],
  ["fragCost", "กินชิ้นส่วน 1 ชิ้น"],
  ["shadowOnly", "ใช้ได้เฉพาะร่างเงา"],
  ["kindnessBoost", "เปิดพาสซีฟฮีลให้ทำงานเต็มกำลัง"],
  ["field", "ทิ้งพื้นค้างไว้"],
  ["pool", "ทิ้งแอ่งน้ำไว้"],
  ["pet", "บัฟยูนิตที่อัญเชิญด้วย"],
  ["msScale", "สเกลตามความเร็วเดินส่วนเกิน"],
  ["castByMs", "เวลาร่ายสั้นลงตามความเร็วเดิน"],
  ["oncePerFight", "ใช้ได้ครั้งเดียวต่อไฟต์"],
  ["onDeath", "ทำงานเองตอนจะตาย กดเองไม่ได้"],
  ["strideTo", "ว่ายไปถึงจุดนั้นจริงก่อนทุบ"],
  ["allyPass", "เพื่อนเดินผ่านได้"],
  ["interrupt", "ตัดจังหวะสกิลที่กำลังร่าย"],
  ["drag", "ลากศัตรูติดไปด้วย"],
  ["invuln", "อมตะระหว่างท่า"],
  ["ccImmune", "CC ไม่เข้าระหว่างร่าย"],
  ["airMove", "เดินได้ตามปกติระหว่างลอยอยู่กลางอากาศ"],
  ["refillStacks", "เติมสแตกพาสซีฟจนเต็มทันที"],
  ["msDecay", "ความเร็วเดินที่ได้ค่อยๆ จางลงจนหมด ไม่ใช่คงที่แล้วหาย"],
  ["cdAfterDur", "คูลดาวน์เริ่มนับหลังโซนหมดอายุ ไม่ใช่ตอนกด"],
  ["ghost", "เดินทะลุยูนิต"],
  ["selfRoot", "ตรึงตัวเองระหว่างร่าย"],
  ["canCrit", "ติดคริได้"],
  ["canOnHit", "ติดเอฟเฟกต์ออนฮิตได้"],
  ["halfCircle", "กวาดแค่ครึ่งวงด้านหน้า"],
];

const fmtOne = (v, fmt) => {
  if (fmt === "pct") return Math.round(v * 1000) / 10 + "%";
  if (fmt === "sec") return (Math.round(v * 100) / 100) + "s";
  if (fmt === "deg") return v + "°";
  if (fmt === "x") return "×" + v;
  return String(Math.round(v * 100) / 100);
};

export function skillShape(sk) {
  if (!sk) return "";
  const bits = [];
  if (SHAPES[sk.type]) bits.push(tr(SHAPES[sk.type]));
  if (sk.ult) bits.push(tr("ท่าไม้ตาย"));
  if (sk.magic) bits.push(tr("ดาเมจเวท"));
  return bits.join(" · ");
}

// แถวที่ค่าเปลี่ยนตามแรงก์
export function rankedRows(sk) {
  if (!sk) return [];
  const out = [];
  for (const [key, label, fmt] of RANKED) {
    const v = sk[key];
    if (!Array.isArray(v) || !v.length) continue;
    if (v.every((x) => typeof x !== "number")) continue;
    // ค่าเท่ากันทุกแรงก์ ไม่ต้องโชว์เป็นตาราง
    const same = v.every((x) => x === v[0]);
    out.push({ key, label: tr(label), fmt, values: v, flat: same });
  }
  // คูลดาวน์: ถ้าไม่มี cdByRank ใช้ cd เดี่ยว
  if (!sk.cdByRank && typeof sk.cd === "number" && !(sk.oncePerFight && !sk.cd)) {
    out.push({ key: "cd", label: tr("คูลดาวน์"), fmt: "sec", values: [sk.cd], flat: true });
  }
  return out;
}

export function flatRows(sk) {
  if (!sk) return [];
  const out = [];
  for (const [key, label, fmt] of FLAT) {
    const v = sk[key];
    if (typeof v !== "number" || v === 0) continue;
    if (Array.isArray(sk[key])) continue;
    out.push({ label: tr(label), value: fmtOne(v, fmt) });
  }
  return out;
}

export function ratioLine(sk) {
  if (!sk) return "";
  const parts = [];
  for (const [key, label, kind] of RATIOS) {
    const v = sk[key];
    if (v == null) continue;
    if (kind === "rank") {
      if (!Array.isArray(v) || !v.some((x) => x)) continue;
      const same = v.every((x) => x === v[0]);
      parts.push("+" + (same ? Math.round(v[0] * 1000) / 10 : v.map((x) => Math.round(x * 1000) / 10).join("/")) + "% " + tr(label));
      continue;
    }
    if (typeof v !== "number" || v === 0) continue;
    if (kind === "flat") parts.push("+" + (Math.round(v * 100) / 100) + " " + tr(label));
    // เก็บในข้อมูลเป็น "ต่อหนึ่งหน่วย" จึงต้องคูณร้อยกลับก่อนโชว์
    else if (kind === "per100n") parts.push("+" + (Math.round(v * 100 * 100) / 100) + " " + tr(label));
    else if (kind === "per100p") parts.push("+" + (Math.round(v * 100 * 1000) / 10) + "% " + tr(label));
    else parts.push("+" + (Math.round(v * 1000) / 10) + "% " + tr(label));
  }
  return parts.join(" · ");
}

export function flagLines(sk) {
  if (!sk) return [];
  return FLAGS.filter(([k]) => sk[k]).map(([, label]) => tr(label));
}

// สรุป "อัพจากแรงก์นี้ไปแรงก์หน้า ได้อะไรเพิ่ม"
export function nextRankGain(sk, rank) {
  if (!sk) return [];
  const max = MAX_RANK(sk);
  if (rank >= max) return [];
  const out = [];
  for (const r of rankedRows(sk)) {
    if (r.flat || r.values.length < max) continue;
    const now = rank > 0 ? r.values[rank - 1] : null;
    const next = r.values[rank];
    if (next == null) continue;
    if (now != null && now === next) continue;
    out.push({
      label: r.label,
      now: now == null ? null : fmtOne(now, r.fmt),
      next: fmtOne(next, r.fmt),
      better: now == null ? true : r.key === "cdByRank" ? next < now : next > now,
    });
  }
  return out;
}

// สกิลของร่างคู่ (dual) — คืนทั้งสองร่างให้ UI วนแสดง
export function subSkills(sk) {
  if (!sk) return [];
  const out = [];
  // คอมโบ: แต่ละจังหวะมีดาเมจและสเกลของตัวเอง ต้องแยกเป็นท่าย่อยถึงจะเห็นตัวเลข
  if (Array.isArray(sk.steps)) {
    sk.steps.forEach((st, i) => out.push({
      tag: tr("จังหวะ {0}", i + 1),
      sk: { ...st, type: "comboStep", key: sk.key, magic: sk.magic },
    }));
  }
  if (sk.light) out.push({ tag: tr("ร่างแสง"), sk: { ...sk.light, key: sk.key, cd: sk.cd, cdByRank: sk.cdByRank } });
  if (sk.shadow) out.push({ tag: tr("ร่างเงา"), sk: { ...sk.shadow, key: sk.key, cd: sk.cd, cdByRank: sk.cdByRank } });
  return out;
}

export function skillTitle(sk) {
  if (!sk) return "";
  if (sk.type === "dual") return sk.light.th + " / " + sk.shadow.th;
  return sk.th || "";
}

// ---------------------------------------------------------------
// ประโยคสรุปว่าสกิลนี้ "ทำอะไร" — ประกอบจากข้อมูลดิบ ไม่ได้พิมพ์มือทีละสกิล
// เลยไม่มีทางหลุดเวลาปรับตัวเลข และไม่ต้องตามแก้เวลามีตัวละครใหม่
// ตารางค่าตามแรงก์ยังอยู่ข้างล่างเหมือนเดิม อันนี้คือบรรทัดบนสุดที่อ่านแล้วเข้าใจทันที
// ---------------------------------------------------------------

// ท่อนแรก: ใช้ยังไง ไปไหน ไกลแค่ไหน
function actionClause(sk) {
  const r = sk.range, rad = sk.radius, w = sk.width;
  switch (sk.type) {
    case "aoeSelf": return sk.halfCircle
      ? tr("กวาดเป็นครึ่งวงด้านหน้าตัวเอง หันไปทางเป้า รัศมี {0} หน่วย", rad || 0)
      : tr("ระเบิดรอบตัวรัศมี {0} หน่วย", rad || 0);
    case "aoeGround": return tr("เล็งลงพื้นในระยะ {0} ระเบิดเป็นวงรัศมี {1} หน่วย", r || 0, rad || 0);
    case "line":
      // แยกให้ชัดว่าเป็นของที่ลอยไป (หลบได้ กำแพงกินได้) หรือพื้นที่ที่แยกออกไปทันที
      return sk.instant
        ? tr("พื้นแยกเป็นร่องพุ่งไปข้างหน้า {0} กว้าง {1} หน่วย โดนทั้งแนวพร้อมกันทันที", r || 0, w || 0)
        : tr("ยิงเป็นเส้นตรงไกล {0} กว้าง {1} หน่วย", r || 0, w || sk.thickness || 0);
    case "wave": return tr("ปล่อยคลื่นกว้าง {0} วิ่งไปไกล {1} หน่วย", w || 0, r || 0);
    case "cone": return tr("กวาดเป็นกรวยด้านหน้าไกล {0} หน่วย", r || 0);
    case "targeted": return tr("ล็อกเป้าหมายเดียวในระยะ {0} หน่วย", r || 0);
    case "dash": return tr("พุ่งไปข้างหน้า {0} หน่วย", sk.dashRange || r || 0);
    case "blinkDash": return sk.evade
      ? tr("วาร์ปไปที่จุดหมายในระยะ {0} หน่วย แล้วหลบทุกอย่างได้อีก {1} วิหลังลง", r || 0, sk.evade)
      : tr("วาร์ปไปที่จุดหมายในระยะ {0} หน่วย", r || 0);
    case "blinkBehind":
      return tr("วาร์ปข้ามไปโผล่หลังเป้าในระยะ {0} หน่วย ห่างจากหลังมันอีก {1} หน่วย", r || 0, sk.behind || 0);
    case "crossDash": return tr("พุ่งทะลุเป็นรูปกากบาทไกล {0} หน่วย", sk.armLen || r || 0);
    case "chargeDash": return tr("ชาร์จค้างไว้แล้วพุ่งทะยานไกล {0} หน่วย ยิ่งชาร์จนานยิ่งแรง", sk.dashRange || r || 0);
    case "chargedBeam": return tr("ชาร์จลำแสงแล้วยิงออกไปไกล {0} หน่วย", r || 0);
    case "grabSlam": return tr("คว้าศัตรูในระยะ {0} แล้วฟาดลงพื้น", sk.grabRange || r || 0);
    case "skyfall": return tr("กระโดดขึ้นฟ้าแล้วร่วงลงใส่จุดเป้าหมายในระยะ {0} หน่วย", r || 0);
    case "submerge": return tr(
      "มุดลงใต้พื้น ระหว่างมุดแตะไม่ได้และไม่กินดาเมจเลย แล้วโผล่ขึ้นที่จุดเป้าหมายในระยะ {0} หน่วย — พอโผล่พ้นพื้นก็กลับมาโดนตีได้ทันที ก่อนจะทุบพื้นรัศมี {1} หน่วยยกทุกคนในวงลอย",
      r || 0, rad || 0);
    case "cage": return tr("สร้างกรงล้อมรัศมี {0} หน่วย ขังศัตรูที่อยู่ข้างใน", rad || 0);
    case "barrage": return sk.ammoMax
      ? tr("ยิงกระสุนลงพื้นในระยะ {0} หน่วย เก็บกระสุนได้ {1} นัด", r || 0, sk.ammoMax)
      : tr("ยิงรัวใส่เป้าในระยะ {0} หน่วย", r || 0);
    case "globalStrike": return (r || 0) > 5000
      ? tr("โจมตีได้ทั่วทั้งสนาม ไม่จำกัดระยะ")
      : tr("โจมตีข้ามสนามถึงเป้าหมายไกลสุด {0} หน่วย", r || 0);
    case "markNext": return tr("แปะมาร์กไว้ที่เป้า แล้วจุดระเบิดทีหลัง");
    case "onHit": {
      const n = sk.charges || 1;
      const base = n > 1
        ? tr("ติดอาวุธให้ออโต้ {0} ครั้งถัดไป ภายใน {1} วิ", n, sk.window || 5)
        : tr("ติดอาวุธให้ออโต้ครั้งถัดไป ภายใน {0} วิ", sk.window || 5);
      const more = [];
      if (sk.cleaveRadius) more.push(tr("ออโต้ทุกครั้งฟันกวาดรอบเป้ารัศมี {0} หน่วยอยู่แล้ว", sk.cleaveRadius));
      if (sk.doubleAbove) more.push(tr("ถ้าเป้าเลือดเกิน {0}% จะสับซ้ำอีกดาบทันที", Math.round(sk.doubleAbove * 100)));
      return [base, ...more].join(" · ");
    }
    case "selfBuff": {
      const more = [];
      if (sk.stealth) more.push(tr("ล่องหน"));
      if (sk.drAll) more.push(tr("ลดดาเมจที่รับทุกแหล่ง"));
      if (sk.onHitMagic) more.push(tr("ออโต้พ่วงดาเมจเวทเพิ่ม"));
      if (sk.dashFaster) more.push(tr("การพุ่งของพาสซีฟเร็วขึ้น {0}%", Math.round(sk.dashFaster * 100)));
      if (sk.overcharge) more.push(tr("พาสซีฟช็อตศัตรูทุกตัวในวงพร้อมกัน"));
      if (sk.pet) more.push(tr("ยักษ์ที่อัญเชิญไว้ได้โล่ ความเร็วเดิน และความเร็วโจมตีด้วย"));
      if (sk.gainStack) more.push(tr("ได้สแตกพาสซีฟทันที {0}", sk.gainStack));
      if (sk.ambushAs) more.push(tr("พอเผยตัวออกมาได้ความเร็วโจมตีก้อนใหญ่ {0} วิ", sk.ambushDur || 3));
      const head = !more.length && Array.isArray(sk.shield)
        ? tr("กางโล่คลุมตัวเอง {0} วิ", sk.dur || 0)
        : tr("บัฟตัวเอง");
      return [head, ...more].join(" · ");
    }
    case "teamHeal": return tr("ฮีลเพื่อนทั้งทีมพร้อมกัน");
    case "allyHot": return tr("ฮีลเพื่อนต่อเนื่องทีละนิด");
    case "lastStand": return tr("เข้าสู่โหมดยืนหยัด ตายยากขึ้นชั่วคราว");
    case "vampForm": return tr("แปลงเป็นร่างแวมไพร์");
    case "mistform": return tr("สลายร่างเป็นไอหมอก เร่งฝีเท้าและเดินทะลุยูนิตได้ · ระหว่างเปิดอัลติเปลี่ยนเป็นวาป {0} หน่วย", sk.blinkRange || 0);
    case "teaGarden": return tr("วางโต๊ะน้ำชาลงพื้นในระยะ {0} วงกว้าง {1} หน่วย ฮีลเพื่อนและตอดศัตรูเป็นจังหวะ", r || 0, rad || 0);
    case "allyBlink": return tr("มุดไปโผล่ข้างเพื่อนในระยะ {0} แล้วแจกโล่รอบจุดที่โผล่ {1} หน่วย", r || 0, rad || 0);
    case "wonderland": return tr("กางอาณาเขตกระจกลงพื้นในระยะ {0} วงกว้าง {1} หน่วย", r || 0, rad || 0);
    case "guardBurst": return tr("กางโล่ให้ตัวเอง แล้วถ้าโล่ยังไม่แตกจะสะบัดคลื่นรอบตัวรัศมี {0} หน่วย", sk.radius || 0);
    case "dismissal": return tr("จับศัตรูในระยะ {0} แล้วเหวี่ยงทุ่มไปไกลสุด {1} หน่วย ระเบิดที่จุดตกรัศมี {2}", sk.grabRange || 0, sk.throwRange || 0, sk.radius || 0);
    case "rangeCharge": return tr("ชาร์จค้างแล้วยิงลูกศรทะลุแถว ยิ่งชาร์จยิ่งไกล {0}–{1} หน่วย", sk.rangeMin || 0, sk.rangeMax || 0);
    // ---- ท่าของตัวละคร Patch 0.4 ----
    case "twinCleave": return tr("ฟันครึ่งวงกลมด้านหน้ารัศมี {0} หน่วยสองจังหวะติด ห่างกัน {1} วิ · โดนครบทั้งสองจังหวะถึงจะติดสโลว์", rad || 0, sk.gap || 0.2);
    case "zephyr": return tr("ล่องหน {0} วิพร้อมเร่งฝีเท้า · ระหว่างล่องหนกดซ้ำได้อีกครั้งเพื่อพุ่งทะลวงเป็นเส้นตรง {1} หน่วย · คูลดาวน์เริ่มนับหลังพุ่งจบ", sk.hideDur || 2.5, sk.dashRange || 0);
    case "domain": return tr("เปิดโดมพายุลงพื้นในระยะ {0} รัศมี {1} หน่วย นาน {2} วิ · ระหว่างนั้นตัวเองแตะไม่ได้ ตีไม่เข้า และมองไม่เห็น จนกว่าจะลงมือเอง · โดมเฉือนทุกคนในวง {3} ระลอก", r || 0, rad || 0, sk.dur || 3, sk.waves || 6);
    case "thornCone": return tr("สาดเมล็ดพันธุ์เป็นกรวยกว้าง {0} องศา ไกล {1} หน่วย หน่วง {2} วิ แล้วหนามแทงขึ้นพร้อมกัน ตรึงเท้าทุกคนในวง", sk.angle || 60, r || 0, sk.delay || 0.4);
    case "canopy": return tr("กางโล่ให้ตัวเองและเพื่อนหนึ่งคนในระยะ {0} หน่วยเท่ากัน · ตราบใดที่โล่ทั้งคู่ยังอยู่ ดาเมจที่เพื่อนกิน {1}% จะไปหักที่โล่ของเราแทน", r || 0, Math.round((sk.share || 0) * 100));
    case "arbor": return tr("หยั่งรากตรึงตัวเองอยู่กับที่ แล้วปล่อยคลื่นฮีลรัศมี {0} หน่วยให้เพื่อนทั้งทีม {1} ระลอก ห่างกัน {2} วิ", rad || 0, sk.waves || 5, sk.every || 0.8);
    case "mask": return tr("เลือกสวมหน้ากากหนึ่งในสามใบ อยู่ถาวรจนกว่าจะเปลี่ยนใบ — โศกนาฏกรรมเพิ่มพลังโจมตี สุขนาฏกรรมเพิ่มความเร็วโจมตี มรณะเพิ่มเจาะเกราะ");
    case "rebound": return tr("กระชากมีดที่ปักอยู่บนศัตรูทุกตัวในระยะ {0} หน่วยกลับมา ยิ่งปักเยอะยิ่งแรง และใครขวางวิถีบินกลับก็โดนด้วย", r || 0);
    case "bladeTempest": return tr("กระโดดลอยตัวแตะไม่ได้ {0} วิ แล้วสาดมีดรอบตัวรัศมี {1} หน่วย พร้อมปักมีดให้ทุกคนในวงทันที {2} เล่ม", sk.air || 0.75, rad || 0, sk.stacks || 3);
    case "coneKnock": return tr("กระแทกคลื่นเป็นกรวยด้านหน้าไกล {0} หน่วย", r || 0);
    case "meteorStorm": return tr("ตรึงตัวเองแล้วเรียกอุกกาบาตใส่ศัตรูทุกคนบนสนามทีละระลอก");
    case "bloodStorm": return tr("แผ่พายุโลหิตรอบตัวรัศมี {0} หน่วย กัดทุกคนในวงทุก {1} วิ", rad || 0, sk.every || 0.5);
    case "absorbReflect": return tr(
      "อมตะ {0} วิ โดนอะไรก็ไม่เข้า · เอาดาเมจที่ตัวเองกินมาใน {1} วิที่ผ่านมาบวกกับที่กินระหว่างอมตะมาเป็นทุน · พอหมดเวลาก็ระเบิดทุนนั้นออกเป็นกรวย {2} องศาไกล {3} หน่วยไปทางเป้าที่จ้องอยู่ · เพื่อนในรัศมีเดียวกันได้ฮีลและโล่ตามดาเมจที่ตัวเขาเองเพิ่งกินไป",
      sk.dur || 0, sk.lookback || 0, sk.angle || 0, sk.radius || 0);
    case "pulse": return sk.hits
      ? tr("ปล่อยคลื่นรอบตัวรัศมี {0} หน่วย {1} ระลอก ห่างกันระลอกละ {2} วิ รวม {3} วิ", rad || 0, sk.hits, sk.every || 0, sk.dur || 0)
      : tr("ปล่อยคลื่นเป็นจังหวะรอบตัวรัศมี {0} หน่วย", rad || 0);
    case "burstShield": return tr(
      "กางโล่คลุมตัวเอง {0} วิ · พอโล่แตกหรือหมดเวลา (แล้วแต่อะไรมาก่อน) โล่ก้อนนั้นระเบิดใส่ศัตรูรอบตัวรัศมี {1} หน่วยเป็น {2}% ของขนาดโล่ แล้วฮีลคืนให้ตัวเองอีก {3}% ของขนาดโล่",
      sk.dur || 0, sk.radius || 0, Math.round((sk.burstPct || 0) * 100), Math.round((sk.healPct || 0) * 100));
    case "dual": return tr("มีสองร่าง สลับใช้คนละผล");
    // ---- ท่าของตัวละคร Patch 0.3 ----
    case "combo": {
      const n = (sk.steps || []).length;
      // จังหวะสุดท้ายไม่มี needAuto จะเหมาว่า "ทุกจังหวะ" ไม่ได้ (lore.js:103)
      const gate = (sk.steps || []).filter((st) => st.needAuto).length;
      return tr("คอมโบ {0} จังหวะ กดต่อกันภายใน {1} วิ — {2} จังหวะแรกต้องออโต้ให้โดนก่อน ถึงจะปลดล็อกจังหวะถัดไป จังหวะสุดท้ายกดต่อได้เลย", n, sk.window || 5, gate);
    }
    case "comboStep": {
      const bits = [];
      if (sk.dashRange) bits.push(tr("พุ่งเข้าหาเป้าไกลสุด {0} หน่วย แล้วแทงเป้านั้นหนึ่งที", sk.dashRange));
      else if (sk.radius) bits.push(tr("กวาดดาบเป็นครึ่งวงด้านหน้ารัศมี {0} หน่วย โดนทุกคนในวง", sk.radius));
      else bits.push(tr("ฟันเป้าเดี่ยวในระยะ {0} หน่วย", sk.range || 0));
      if (sk.pctMissingHp) bits.push(tr("บวกดาเมจตามเลือดที่เป้าหายไปแล้ว"));
      if (sk.backstep) bits.push(tr("แล้วดีดตัวถอยออกจากเป้า {0} หน่วย", sk.backstep));
      // needAuto อยู่ที่จังหวะนี้ = จังหวะ "ถัดไป" ถูกล็อกจนกว่าออโต้จะโดน (lore.js:103)
      bits.push(sk.needAuto
        ? tr("กดจังหวะถัดไปไม่ได้จนกว่าออโต้จะโดนอีกครั้ง")
        : tr("เป็นจังหวะปิดคอมโบ กดจบแล้ววนกลับไปจังหวะแรก"));
      return bits.join(" · ");
    }
    case "damageStash": return tr("ทุกดาเมจที่ลงเป้าถูกจดไว้ {0} วิ แล้วกดสั่งระเบิดยอดสะสมทั้งหมดในระยะ {1} หน่วย", sk.stashDur || 3, r || 0);
    case "skyward": return tr("กระโดดลอยขึ้นฟ้า {0} วิ แตะไม่ได้และไม่กินดาเมจ แล้วลงพื้นพร้อมความเร็วเดิน", sk.airTime || 0.75);
    case "carriage": return tr("ล่องหน {0} วิ · ออโต้ครั้งแรกล็อกเป้าได้ไกลถึง {1} แล้วลากรถม้าตามมาทุบรัศมี {2} หน่วย", sk.dur || 10, sk.openRange || 0, rad || 0);
    case "basketZone": return sk.targets
      ? tr("วางตะกร้าลงพื้นในระยะ {0} วงกว้าง {1} หน่วย อยู่ {2} วิ แจกฮีลและบัฟทุก {3} วิ ให้ครั้งละ {4} คนที่เลือดพร่องที่สุด",
        r || 0, rad || 0, sk.life || 0, sk.every || 0, sk.targets.join("/"))
      : tr("วางตะกร้าลงพื้นในระยะ {0} วงกว้าง {1} หน่วย อยู่ {2} วิ แจกฮีลและบัฟทุก {3} วิ", r || 0, rad || 0, sk.life || 0, sk.every || 0);
    case "allyRush": return tr("เล็งเพื่อนในระยะ {0} หน่วย แล้วทั้งคู่ได้ความเร็วเดินและเดินทะลุยูนิต", r || 0);
    case "truthAura": return tr("กางออร่ารัศมี {0} หน่วยที่เดินตามตัว อยู่ {1} วิ", rad || 0, sk.dur || 0);
    case "vortex": return tr("ยิงพายุลอยช้าไกล {0} หน่วย แล้วค้างเป็นวังวนรัศมี {1} หน่วยอีก {2} วิ · เดินตัดผ่านเองเพื่อระเบิดมันได้", r || 0, sk.zoneRadius || 0, sk.zoneDur || 0);
    case "deltaDash": return tr("พุ่งเป็นรูปสามเหลี่ยมด้านละ {0} หน่วย แล้วกลับมายืนจุดเดิม — ขอบเส้นทางแรงกว่าพื้นที่ข้างใน", sk.side || 0);
    case "starfall": return tr("เหาะขึ้นฟ้าสูงสุด {0} วิ แตะไม่ได้ เลื่อนวงเล็งตามตัวได้ แล้วดิ่งลงกลางวงรัศมี {1} หน่วย", sk.airTime || 0, rad || 0);
    case "chargeFling": return tr("พุ่งไกล {0} หน่วย ชนแชมเปี้ยนตัวแรกแล้วจับเหวี่ยงข้ามหัวไปด้านหลัง {1} หน่วย", sk.dashRange || 0, sk.toss || 0);
    case "wrathAura": return tr("แผ่ออร่ารัศมี {0} หน่วยรอบตัว กดพลังโจมตีและพลังเวทของศัตรูในวง พร้อมเร่งความเร็วของตัวเอง", sk.radius || 0);
    case "asuraSlam": return tr("ทุบพื้นทันทีรัศมี {0} หน่วยรอบตัว ยกทุกคนในวงลอยขึ้น แล้วงอกแขนอสูรตามจำนวนคนที่โดน", sk.radius || 0);
    case "tripleSlam": return tr("ตรึงตัวเองแล้วทุบพื้น {0} ระลอก วงขยายขึ้นเรื่อยๆ จนถึง {1} หน่วย", (sk.waves || []).length, ((sk.waves || []).slice(-1)[0] || {}).radius || 0);
    case "rampBuff": return tr("เร่งความเร็วโจมตีสองจังหวะ — แรงมากช่วง {0} วิแรก แล้วลดลงมารักษาระดับอีก {1} วิ", sk.burstDur || 0, sk.holdDur || 0);
    case "sightZone": return tr("ยิงบั้งไฟลงพื้นในระยะ {0} วงกว้าง {1} หน่วย อยู่ {2} วิ — เปิดตัวศัตรูที่ล่องหนอยู่ในวง", r || 0, rad || 0, sk.life || 0);
    case "summonGiant": return tr("เรียกยักษ์ลงมาทุบจุดเป้าหมายในระยะ {0} รัศมี {1} หน่วย แล้วยักษ์อยู่ต่ออีก {2} วิ เดินตีเองเป็นลูป 3 จังหวะ", r || 0, rad || 0, sk.life || 0);
    case "channelCone": return tr("ยืนอยู่กับที่แล้วแทงรัวเป็นกรวยไกล {0} หน่วย {1} ระลอก (ยกเลิกเองได้)", r || 0, sk.ticks || 0);
    case "bounceSlash": return tr("หายตัวแล้วฟันกระเด้ง {0} ครั้งในระยะ {1} หน่วย — ฟันเป้าที่มีตราท้าดวลก่อนเสมอ", sk.hits || 0, r || 0);
    case "coneVolley": return tr("คำรามเป็นกรวยด้านหน้าไกล {0} หน่วย {1} ระลอกติด", r || 0, sk.ticks || 0);
    case "tempest": return tr("เรียกพายุลงพื้นในระยะ {0} วงกว้าง {1} หน่วย ฟาด {2} ระลอก ระลอกละ {3} ตัว", r || 0, rad || 0, sk.strikes || 0, sk.targetsPerStrike || 0);
    case "sledge": return tr("ขว้างค้อนเป็นเส้นตรงไกล {0} หน่วย — โดนศัตรูคือดาเมจ โดนกำแพงหรือบ้านของตัวเองคือซ่อม", r || 0);
    case "wall": return tr("ก่อกำแพงอิฐกว้าง {0} หน่วยในระยะ {1} หน่วย อยู่ {2} วิ — กระสุนของศัตรูทะลุไม่ได้", sk.span || 0, r || 0, sk.life || 0);
    case "steerDash": return tr("พุ่งทะลุยูนิตไกล {0} หน่วย — ถ้าชนกำแพงจะระเบิดรอบตัวรัศมี {1} หน่วยพร้อมกระแทกลอย", sk.dashRange || 0, sk.hitRadius || 0);
    case "bunker": return tr("ก่อบ้านอิฐล้อมตัวเองรัศมี {0} หน่วย อยู่ {1} วิ — เพื่อนข้างในไม่กินดาเมจจากข้างนอกเลย", rad || 0, sk.life || 0);
    case "pommel": return tr("กระแทกด้ามดาบใส่ศัตรูในระยะ {0} หน่วย — กดได้แม้ตัวเองติด CC อยู่ แล้วจะหมุนฟันสวนรอบตัวรัศมี {1} หน่วย", r || 0, sk.whirlRadius || 0);
    case "lungeSweep": return tr("พุ่งเป็นเส้นตรง {0} หน่วย แล้วฟันกวาดครึ่งวงรัศมี {1} หน่วยที่ปลายทาง", sk.dashRange || 0, sk.sweepRadius || 0);
    case "judgment": return tr("ฟันดาบพิพากษาใส่เป้าเดี่ยวในระยะ {0} หน่วย เป็นดาเมจจริง แล้วประหารทันทีถ้าเลือดเหลือต่ำกว่าเกณฑ์", r || 0);
    default: return tr("ใช้สกิล");
  }
}

// ท่อนที่สอง: จังหวะเวลา
function timingClause(sk) {
  const out = [];
  if (sk.submergeFixed) out.push(tr("อยู่ใต้พื้น {0} วิ", sk.submergeFixed));
  else if (sk.submergeMax) out.push(tr("อยู่ใต้พื้นได้ถึง {0} วิ", sk.submergeMax));
  if (sk.surfaceDelay) out.push(tr("โผล่ขึ้นหลังจากนั้น {0} วิ", sk.surfaceDelay));
  if (sk.delay) out.push(tr("หน่วง {0} วิก่อนลง", sk.delay));
  if (sk.airborne || sk.airTime) out.push(tr("ลอยอยู่กลางอากาศ {0} วิ", sk.airborne || sk.airTime));
  if (sk.maxCharge) out.push(tr("ชาร์จได้ถึง {0} วิ", sk.maxCharge));
  if (sk.waves) {
    // waves มีสองแบบ — ตัวเลขจำนวนระลอกไล่ตามแรงก์ กับตารางบรรยายแต่ละระลอกทีละก้อน
    const arr = Array.isArray(sk.waves) ? sk.waves : null;
    const nums = arr && arr.every((x) => typeof x === "number") ? arr : null;
    let n;
    if (!nums) n = arr ? arr.length : sk.waves;
    else if (sk.rank) n = nums[Math.max(0, sk.rank - 1)];
    // ยังไม่รู้แรงก์ (หน้าข้อมูลสกิล) — โชว์ทุกขั้นแทนที่จะแอบใช้ขั้นแรกเงียบๆ
    else n = nums.every((x) => x === nums[0]) ? nums[0] : nums.join("/");
    out.push(tr("ยิง {0} ระลอก ห่างกันระลอกละ {1} วิ", n, sk.every));
  }
  if (sk.telegraph) out.push(tr("มีวงเตือนบนพื้นก่อนตก {0} วิ", sk.telegraph));
  return out;
}

// ท่อนที่สาม: ล็อกศัตรูยังไง
function ccClause(sk) {
  const out = [];
  const ku = sk.knockup || (Array.isArray(sk.knockupByRank) ? sk.knockupByRank[0] : 0);
  if (ku) out.push(tr("ลอยศัตรู (Knock Up) {0} วิ", ku));
  if (sk.knockback) out.push(tr("ผลักศัตรูออกไป {0} หน่วย", sk.knockback));
  if (sk.interrupt) out.push(tr("ตัดจังหวะการพุ่งของศัตรู"));
  if (sk.stun || sk.stunMin) out.push(tr("สตัน {0} วิ", sk.stun || sk.stunMin));
  if (sk.landStun) out.push(tr("ตอนลงพื้นสตันอีก {0} วิ", sk.landStun));
  if (sk.root) out.push(tr("ตรึงเท้าติดพื้น {0} วิ", sk.root));
  if (sk.fear) out.push(tr("ทำให้หนีกระเจิง {0} วิ", sk.fear));
  if (sk.taunt) out.push(tr("ยั่วให้เข้ามาตีเรา {0} วิ", sk.taunt));
  const slow = sk.slow || sk.slowFlat || (Array.isArray(sk.slowByRank) ? sk.slowByRank[0] : 0);
  const slowV = Array.isArray(slow) ? slow[0] : slow;
  if (slowV) out.push(tr("สโลว์ {0}%{1}", Math.round(slowV * 100), sk.slowDur ? tr(" นาน {0} วิ", sk.slowDur) : ""));
  if (sk.silence) out.push(tr("ปิดสกิล {0} วิ", sk.silence));
  if (sk.stunByRank) out.push(tr("สตัน {0} วิ", sk.stunByRank[Math.max(0, (sk.rank || 1) - 1)]));
  const poly = Array.isArray(sk.polymorph) ? sk.polymorph[Math.max(0, (sk.rank || 1) - 1)] : sk.polymorph;
  if (poly) out.push(tr("สาปเป็นกระต่าย {0} วิ — ใช้สกิลไม่ได้ ตีไม่ได้ และเดินช้าลง {1}%", poly, Math.round((sk.polySlow || 0) * 100)));
  if (sk.silenceByRank) out.push(tr("ใบ้ {0} วิ", sk.silenceByRank[Math.max(0, (sk.rank || 1) - 1)]));
  if (sk.suppress) out.push(tr("ระงับการกระทำ {0} วิ ระหว่างยกตัวขึ้น", sk.suppress));
  const cm = Array.isArray(sk.charm) ? sk.charm[0] : sk.charm;
  if (cm) {
    out.push(tr("สะกดจิต (Charm) {0} วิ — ทำอะไรไม่ได้ แล้วเดินเข้าหาเราช้าลง {1}%",
      cm, Math.round((sk.charmSlow || 0) * 100)));
  }
  return out;
}

// ท่อนที่สี่: ช่วยฝั่งเรายังไง
const SHIELD_SAID = new Set(["burstShield", "guardBurst", "canopy", "selfBuff"]);

function supportClause(sk) {
  const out = [];
  const said = SHIELD_SAID.has(sk.type);
  if (!said && (sk.heal || sk.healPct)) out.push(tr("ฮีลให้เป้าหมาย"));
  if (!said && sk.shield) out.push(tr("กางโล่ให้"));
  if (sk.drain) out.push(tr("ดูดเลือดคืน {0}% ของดาเมจที่ลง", Math.round(sk.drain * 100)));
  if (sk.cleanse) out.push(tr("ล้างสถานะติดตัวออก"));
  if (sk.slowImmune) out.push(tr("กันสโลว์ระหว่างใช้"));
  if (sk.unstoppable) out.push(tr("หยุดไม่ได้ระหว่างพุ่ง"));
  if (sk.asBuff || sk.adBuff || sk.adPct || sk.msBuff || sk.msPct) out.push(tr("ได้บัฟค่าสถานะชั่วคราว"));
  return out;
}

// ท่อนท้าย: ลูกเล่นเฉพาะตัว
function extraClause(sk) {
  const out = [];
  if (sk.pierce) out.push(tr("ทะลุโดนหลายตัว"));
  if (sk.soloMult) out.push(tr("ถ้าโดนตัวเดียวดาเมจคูณ {0}", sk.soloMult));
  if (sk.edgeMult) out.push(tr("โดนขอบวงดาเมจคูณ {0}", sk.edgeMult));
  if (sk.falloff) {
    // falloff มีสองความหมายคนละเรื่อง แล้วแต่ชนิดของท่า
    //   กรวย (cone) กับแขนกากบาท (crossDash) — ลูกหรือแขนที่ "ซ้ำตัวเดิม" เบาลง
    //   ทะลุแถว (line/rangeCharge) กับคลื่น (wave) — "เป้าถัดไป" ที่โดนเบาลง
    const repeat = sk.type === "cone" || sk.type === "crossDash";
    out.push(sk.falloffFloor
      ? tr("ตัวถัดไปรับดาเมจเหลือ {0}% แต่ไม่ต่ำกว่า {1}% ของก้อนแรก",
        Math.round(sk.falloff * 100), Math.round(sk.falloffFloor * 100))
      : repeat
        ? tr("ลูกที่ซ้ำตัวเดิมเหลือ {0}% ของลูกแรก", Math.round(sk.falloff * 100))
        : tr("ตัวถัดไปรับดาเมจเหลือ {0}%", Math.round(sk.falloff * 100)));
  }
  if (sk.fullDmg) out.push(tr("ชาร์จเต็มแล้วดาเมจขึ้นเป็น {0} (จาก {1})", sk.fullDmg.join("/"), sk.dmg.join("/")));
  if (sk.landStunByRank) out.push(tr("สตันตัวแรกที่ชน {0} วิ", sk.landStunByRank.join("/")));
  if (sk.atkCut) out.push(tr("ลดพลังโจมตีและพลังเวทของเป้า {0}% นาน {1} วิ",
    sk.atkCut.map((v) => +(v * 100).toFixed(1)).join("/"), sk.dur));
  if (sk.auraSlow) out.push(tr("ระหว่างรอระเบิด ศัตรูรอบวงติดสโลว์ {0}%",
    sk.auraSlow.map((v) => Math.round(v * 100)).join("/")));
  if (sk.zoneBleed) out.push(tr("ทุกตัวที่โดนติดเลือดไหลอีก {0} วิ ทุก {1} วิ", sk.zoneBleed.dur, sk.zoneBleed.every));
  if (sk.minAir) out.push(tr("ลอยครบ {0} วิแล้วสั่งทุบก่อนหมดเวลาได้", sk.minAir));
  if (sk.field) out.push(tr("ทิ้งพื้นที่ค้างไว้ {0} วิ", sk.field.dur));
  if (sk.shred || sk.shredByRank) out.push(tr("ลดเกราะเป้าหมาย"));
  if (sk.bleedDur) out.push(tr("ทำเลือดไหลต่อเนื่อง {0} วิ", sk.bleedDur));
  if (sk.flying) out.push(tr("ข้ามสิ่งกีดขวางได้"));
  if (sk.charges > 1) out.push(tr("เก็บชาร์จได้ {0} ครั้ง", sk.charges));
  if (sk.cdRefundOnHit) out.push(tr("โดนแล้วคืนคูลดาวน์ {0}%", Math.round(sk.cdRefundOnHit * 100)));
  if (sk.healAp != null) out.push(tr("ฮีลเพื่อนที่ยืนในวงทุก {0} วิ ตลอด {1} วิ", sk.every, sk.dur));
  if (sk.shieldAp != null) out.push(tr("แจกโล่ให้ตัวเองและเพื่อนรอบจุดที่โผล่ นาน {0} วิ", sk.shieldDur));
  if (sk.burstAt) out.push(tr("สะบัดออกหลังกางโล่ {0} วิ ถ้าโล่ยังเหลืออยู่", sk.burstAt));
  if (sk.aoeDmg) out.push(tr("ศัตรูตัวอื่นที่จุดตกก็โดนด้วย"));
  if (sk.selfRoot) out.push(tr("ตรึงตัวเองระหว่างร่าย โดน Hard CC แล้วยกเลิกทันที"));
  if (sk.selfSlow) out.push(tr("ระหว่างชาร์จตัวเองช้าลง {0}%", Math.round(sk.selfSlow * 100)));
  if (sk.selfBonusHp) out.push(tr("ดาเมจบวกเพิ่มตาม Bonus HP ของเราเอง {0}%", +(sk.selfBonusHp * 100).toFixed(1)));
  if (sk.selfStacks) out.push(tr("ดาเมจบวกเพิ่ม {0} ต่อสแตกพาสซีฟที่สะสมไว้", sk.selfStacks));
  if (sk.msRatio) out.push(tr("ดาเมจบวกเพิ่ม {0} ต่อความเร็วเดิน 1 หน่วยที่เกินค่าฐานของตัวเอง", sk.msRatio));
  if (sk.regen) out.push(tr("มีศัตรูอยู่ในวง เวลาไม่เดิน แถมคืนเวลาให้ {0} วิต่อจังหวะ (ไม่เกิน {1} วิ)", sk.regen, sk.dur));
  return out;
}


export function skillSentence(sk) {
  if (!sk) return "";
  if (sk.type === "dual") {
    const a = sk.light, b = sk.shadow;
    if (a && b) {
      return tr(
        "สลับได้สองร่าง — ร่างแสง: {0} · ร่างเงา: {1}",
        skillSentence({ ...a, key: sk.key }), skillSentence({ ...b, key: sk.key })
      );
    }
  }
  const bits = [actionClause(sk), ...timingClause(sk)];
  // น้องของ KAMACHI ซ้ำท่านี้จากที่ที่ตัวเองยืน ไม่ใช่ดาเมจก้อนเดียว (สัดส่วนอยู่ในพาสซีฟ)
  if (sk.mirror) {
    bits.push(sk.mirror === "cleave"
      ? tr("น้องที่ยังไม่ตายกวาดครึ่งวงซ้ำท่านี้จากจุดที่ตัวเองยืนด้วย")
      : tr("น้องที่ยังไม่ตายยิงเป็นเส้นตรงซ้ำท่านี้จากจุดที่ตัวเองยืนด้วย"));
  }
  const dmgRow = Array.isArray(sk.dmg) && sk.dmg.some((x) => x > 0);
  // judgment เป็นดาเมจจริงล้วน ไม่ใช่กายภาพ — บอกให้ตรงกับที่เอนจินคิดจริง
  if (dmgRow) {
    bits.push(sk.type === "judgment" ? tr("ทำดาเมจจริง ทะลุทั้งเกราะและต้านเวท")
      : sk.magic ? tr("ทำดาเมจเวท") : tr("ทำดาเมจกายภาพ"));
  }
  bits.push(...ccClause(sk), ...supportClause(sk), ...extraClause(sk));
  return bits.filter(Boolean).join(" · ");
}
