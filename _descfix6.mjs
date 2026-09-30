// ---------------------------------------------------------------
// _desccheck.mjs เจอ 78 ฟิลด์ที่ข้อมูลประกาศไว้แต่ไม่มีคำบรรยายไหนพูดถึงเลย
// ไล่ดูทีละตัวว่าเอนจินอ่านจริงไหม — 75 ตัวอ่านจริง คือกลไกที่มีผลในสนาม
// แต่ผู้เล่นไม่มีทางรู้ นอกจากเปิดโค้ดอ่าน  ตรงนี้คือเติมป้ายให้ครบ
// ป้ายทุกอันอ้างบรรทัดที่เอนจินใช้จริง ไม่ได้เดาจากชื่อฟิลด์
// ---------------------------------------------------------------
import fs from "fs";

const F = "src/game/skill-desc.js";
let s = fs.readFileSync(F, "utf8");
const crlf = s.includes("\r\n");
if (crlf) s = s.replace(/\r\n/g, "\n");

const block = (anchor, lines) => [anchor, anchor + "\n" + lines.join("\n")];

const edits = [
  // ---- แถวที่ไล่ตามแรงก์ ----
  block(`  ["dmg", "ดาเมจ", "n"],`, [
    `  ["tickDmg", "ดาเมจต่อระลอก", "n"],`,                        // lore.js:871
    `  ["popDmg", "ดาเมจตอนระเบิด", "n"],`,                        // lore.js:859
    `  ["innerDmg", "ดาเมจวงใน", "n"],`,                           // lore.js:205
    `  ["burstDmg", "ดาเมจตอนระเบิดซ้ำ", "n"],`,                   // lore.js (H.S.B R)
    `  ["whirlDmg", "ดาเมจตอนหมุนฟันสวน", "n"],`,                  // lore.js (ARTHUR W)
    `  ["sweepDmg", "ดาเมจตอนฟันกวาด", "n"],`,                     // lore.js (ARTHUR E)
    `  ["castShield", "โล่ที่ได้ตอนกด", "n"],`,                     // lore.js (H.S.B E)
    `  ["dualShield", "โล่ตอนถือสองมือ", "n"],`,                    // lore.js (ARTHUR E)
    `  ["apBuff", "พลังเวทที่แจกให้", "n"],`,                        // lore.js:893
    `  ["amp", "ขยายดาเมจที่เป้ากินจากทุกแหล่ง", "pct"],`,           // PIROSKA R
    `  ["vamp", "ดูดเลือดจากดาเมจที่ลง", "pct"],`,                   // damage.js
    `  ["stashPct", "สัดส่วนดาเมจที่จดเก็บไว้", "pct"],`,             // lore.js:1269
    `  ["cleaveRatio", "ดาเมจที่แผ่ไปโดนคนข้างๆ", "pct"],`,          // lore.js:1391
    `  ["dualAs", "ความเร็วโจมตีตอนถือสองมือ", "pct"],`,            // lore.js:555
    `  ["burstAs", "ความเร็วโจมตีช่วงพุ่งแรก", "pct"],`,             // lore.js (HOOD W)
    `  ["holdAs", "ความเร็วโจมตีช่วงรักษาระดับ", "pct"],`,          // lore.js (HOOD W)
    `  ["execAt", "ประหารทันทีเมื่อเลือดเป้าต่ำกว่า", "pct"],`,       // lore.js:573
    `  ["repairPct", "ซ่อมคืนเป็นสัดส่วนของเลือดเต็มสิ่งก่อสร้าง", "pct"],`, // lore.js:432
    `  ["drainByRank", "ดูดเลือดคืน", "pct"],`,                      // laura.js:117
    `  ["durByRank", "อยู่นาน", "sec"],`,                            // alice.js / fire-skill.js
    `  ["rangeByRank", "ระยะ", "n"],`,                               // fire-skill.js
  ]),

  // ---- แถวค่าคงที่ ----
  block(`  ["radius", "รัศมี", "n"],`, [
    `  ["popRadius", "รัศมีตอนระเบิด", "n"],`,                      // lore.js:860
    `  ["burstRadius", "รัศมีตอนระเบิดซ้ำ", "n"],`,                  // lore.js (H.S.B R)
    `  ["bounceRange", "ระยะกระเด้งไปเป้าถัดไป", "n"],`,             // lore.js:818
    `  ["mirrorWidth", "ความกว้างของร่างสะท้อน", "n"],`,             // lore-p4.js:471
  ]),
  block(`  ["dur", "อยู่นาน", "sec"],`, [
    `  ["castShieldDur", "โล่ตอนกดอยู่นาน", "sec"],`,
    `  ["dualDur", "ถือสองมืออยู่นาน", "sec"],`,                     // lore.js:555
    `  ["burstSlowDur", "สโลว์จากการระเบิดซ้ำอยู่นาน", "sec"],`,
    `  ["backSlowDur", "สโลว์จากการแทงข้างหลังอยู่นาน", "sec"],`,
    `  ["allyResDur", "เพื่อนยืมเกราะไปได้นาน", "sec"],`,            // lore-p4.js:786
    `  ["killMsDur", "เร่งฝีเท้าหลังเก็บศพนาน", "sec"],`,            // lore.js:583
    `  ["revealDur", "เปิดตัวศัตรูที่ล่องหนนาน", "sec"],`,           // fire-skill.js:393
    `  ["linger", "ค้างบนพื้นต่ออีก", "sec"],`,                      // lore.js:621
    `  ["travel", "แตะไม่ได้ระหว่างพุ่งนาน", "sec"],`,               // lore.js:227
  ]),
  block(`  ["slowDur", "สโลว์นาน", "sec"],`, [
    `  ["burstSlow", "สโลว์จากการระเบิดซ้ำ", "pct"],`,
    `  ["backSlow", "สโลว์เมื่อแทงจากข้างหลัง", "pct"],`,            // fire-skill.js:445
    `  ["slowBase", "สโลว์ค่าฐาน", "pct"],`,                        // fire-skill.js:89
    `  ["slowPerLevel", "สโลว์เพิ่มต่อเลเวล", "pct"],`,              // fire-skill.js:89
    `  ["killMs", "เร่งฝีเท้าหลังเก็บศพ", "pct"],`,                  // lore.js:583
    `  ["ccCut", "ตัดเวลา CC ที่ติดอยู่ลง", "pct"],`,                // lore.js:525
    `  ["repeatMul", "ดาเมจของครั้งที่สองเป็นต้นไป", "pct"],`,       // lore.js:806
    `  ["pullHalf", "แรงลากเข้าหาตัว", "pct"],`,                     // step.js:1194
    `  ["repairRes", "เกราะ+ต้านเวทของคนซ่อม → ยอดซ่อม", "pct"],`,   // lore.js:434
    `  ["repairCdCut", "ซ่อมแล้วตัดคูลดาวน์ท่าหลักลง", "pct"],`,     // lore.js:439
    `  ["autoCdCut", "ออโต้โดนแล้วลดคูลดาวน์ลง", "sec"],`,          // on-hit.js:290
    `  ["reviveOnce", "ฟื้นคืนชีพครั้งเดียวด้วยเลือด", "pct"],`,      // lore.js:1332
    `  ["allyResPct", "แบ่งเกราะ/ต้านเวทของตัวเองให้เพื่อน", "pct"],`, // lore-p4.js:786
  ]),

  // ---- สเกลกับค่าสถานะ ----
  block(`  ["selfBonusHp", "Bonus HP → ดาเมจ", "pct"],`, [
    `  ["selfMaxHp", "Max HP → ดาเมจ", "pct"],`,                    // damage.js:394
    `  ["bonusHp", "Bonus HP → ดาเมจ", "pct"],`,                    // lore.js:988
    `  ["enemyCurHp", "เลือดที่เป้าเหลืออยู่ → ดาเมจ", "pct"],`,      // damage.js
    `  ["enemyMissingHp", "เลือดที่เป้าหายไปแล้ว → ดาเมจ", "pct"],`, // damage.js
    `  ["aoeBad", "Bonus AD → ดาเมจสาด", "pct"],`,                  // klaeder.js:152
    `  ["aoeBonusHp", "Bonus HP → ดาเมจสาด", "pct"],`,              // klaeder.js:153
    `  ["whirlBadRatio", "Bonus AD → ดาเมจตอนหมุนฟันสวน", "pct"],`,
    `  ["sweepBadRatio", "Bonus AD → ดาเมจตอนฟันกวาด", "pct"],`,
    `  ["dualShieldBad", "Bonus AD → โล่ตอนถือสองมือ", "pct"],`,
    `  ["maxHpRatio", "Max HP → โล่", "pct"],`,                     // fire-skill.js:181
    `  ["shieldMaxHp", "Max HP → โล่", "pct"],`,                    // lore-p4.js:335
    `  ["healMaxHp", "Max HP → ฮีล", "pct"],`,                      // lore-p4.js:647
    `  ["bleedSlowPerAp", "AP 100 → สโลว์จากเลือดไหล", "per100p"],`, // step.js:1202
    `  ["execPerBad", "Bonus AD 100 → เกณฑ์ประหาร", "per100p"],`,   // lore.js:573
  ]),

  // ---- ธง ----
  block(`  ["invuln", "อมตะระหว่างท่า"],`, [
    `  ["ccImmune", "CC ไม่เข้าระหว่างร่าย"],`,                      // step.js:1069
    `  ["airMove", "เดินได้ตามปกติระหว่างลอยอยู่กลางอากาศ"],`,      // lore.js:237
    `  ["refillStacks", "เติมสแตกพาสซีฟจนเต็มทันที"],`,             // lore.js:963
    `  ["msDecay", "ความเร็วเดินที่ได้ค่อยๆ จางลงจนหมด ไม่ใช่คงที่แล้วหาย"],`, // fire-skill.js:191
    `  ["cdAfterDur", "คูลดาวน์เริ่มนับหลังโซนหมดอายุ ไม่ใช่ตอนกด"],`, // alice.js:132
  ]),

  // allyPct เก็บเป็นอาเรย์ไล่ตามแรงก์ ป้ายเดิมตั้งเป็น "pct" ratioLine จึงข้ามทิ้งเงียบๆ
  [`  ["allyPct", "ดาเมจที่เพื่อนกินมา → ฮีลและโล่ให้เพื่อน", "pct"],`,
    `  ["allyPct", "ดาเมจที่เพื่อนกินมา → ฮีลและโล่ให้เพื่อน", "rank"],`],
];

let n = 0;
for (const [from, to] of edits) {
  const hits = s.split(from).length - 1;
  if (hits !== 1) throw new Error("เจอ " + hits + " ที่ (ต้องเจอ 1) :: " + from.slice(0, 60));
  s = s.replace(from, to);
  n++;
}
fs.writeFileSync(F, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("เติมป้ายไป " + n + " ก้อน");
