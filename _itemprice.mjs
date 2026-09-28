// ---------------------------------------------------------------
// ราคาต่อหน่วยของแต่ละค่าสถานะ — แหล่งเดียวของทั้งโปรเจกต์
//
// เดิมตารางนี้ถูกก๊อปไว้สองที่ (_balance.mjs กับ _itemdoc.mjs) และเป็นเลขตายตัว
// ที่ลอกมาจากชิ้นส่วน Tier 1 ด้วยมือ พอรอบลด AD ครึ่งหนึ่งไปแก้ bt2
// จาก 7g/10 AD เหลือ 7g/5 AD ทั้งสองไฟล์ก็ค้างอยู่กับราคาเดิมพร้อมกัน
// แล้วรายงานว่าความคุ้มของไอเทมสาย AD พังจาก 78% เหลือ 48%
// ทั้งที่ของกับราคาไม่ได้เปลี่ยนความสัมพันธ์กันเลยสักนิด
//
// คราวนี้จึงอ่านจากชิ้นส่วนจริงตอนรัน และอยู่ที่เดียว
// ---------------------------------------------------------------
import { ITEM_BY_ID } from "./src/data/items.js";

const unit = (id, key) => {
  const it = ITEM_BY_ID[id];
  if (!it || !it[key]) {
    throw new Error("ตีราคา " + key + " ไม่ได้ — ชิ้นส่วนอ้างอิง " + id + " หายไป หรือไม่มีค่านั้นแล้ว");
  }
  return it.cost / it[key];
};

export const PRICE = {
  // อ่านจากชิ้นส่วน Tier 1 ที่ให้ค่านั้นล้วนๆ
  ad: unit("bt2", "ad"),        // Boar Tusk
  ap: unit("wt", "ap"),         // Willow Twig
  hp: unit("nd", "hp"),         // Nymph's Dewdrop
  armor: unit("bc", "armor"),   // Boiled Cuirass
  mr: unit("bc", "armor"),      // ไม่มีชิ้นส่วนต้านเวทล้วน ใช้ราคาเดียวกับเกราะ
  // ค่าที่ไม่มีชิ้นส่วน Tier 1 ให้เทียบ ตีราคาจากของที่มีอยู่
  asPct: 50, ah: 1.00, crit: 80, ms: 0.24, msPct: 150,
  pen: 1.00, critDmg: 60, omnivampFlat: 150, healAmp: 62.5, hors: 83,
  apPct: 90, adPct: 90, armorPenPct: 90, mrPenPct: 90,
  ultCdr: 55, tenacity: 40, dmgReduceAuto: 120, regenPct: 6,
  dmgAmpHighHp: 150, onHitAdaptive: 900, itemHaste: 0.20, range: 0.05,
  goldPerRound: 2,
};

// ของที่พลังจริงอยู่ในพาสซีฟที่เขียนมือในเอนจิน ตีราคาจากค่าสถานะล้วนไม่ได้
export const CODED_PASSIVE = new Set([
  "nlm", "pmh", "msq", "mgc", "aoi", "hga", "cij", "sab", "gbs", "mot",
  "biv", "soo", "cbc", "bdc", "cbg", "pnb", "hwh", "cco", "goh", "dss",
  "swf", "slh", "ulf", "ivd", "boe", "sst", "hth", "asq", "asc",
  "ats", "acb", "sfv", "yrh", "esb", "abw", "hmb", "pib", "gwc", "ood",
  "act", "chr", "sg", "at", "toh", "cp", "cb", "cs", "csh", "cbw", "cd",
]);
