import { tr } from "../i18n.js";


export const CATEGORIES = [
  { id: "START", th: "ของเริ่มเกม" },
  { id: "T1", th: "ชิ้นส่วน Tier 1" },
  { id: "T2", th: "ชิ้นส่วน Tier 2" },
  { id: "BOOTS", th: "รองเท้า" },
  { id: "TANK", th: "แทงค์" },
  { id: "FIGHTER", th: "ไฟท์เตอร์" },
  { id: "ASSASSIN", th: "แอสซาซิน" },
  { id: "MAGE", th: "เวท" },
  { id: "MARKSMAN", th: "มาร์คแมน" },
  { id: "SUPPORT", th: "ซัพพอร์ต" },
];


// หมวดของ Tier 3 คือ "สายหลัก" ของมัน แต่ของหลายชิ้นสายอื่นก็ใช้ได้ดี
// เลยมีฟิลด์ also[] ไว้ให้โผล่ในแท็บสายอื่นด้วย — cat ยังเป็นสายหลักเสมอ
export function itemCats(it) {
  return it.also ? [it.cat, ...it.also] : [it.cat];
}


export function inCat(it, cat) {
  return it.cat === cat || (it.also != null && it.also.includes(cat));
}


// 1 gold here = 50 gold in LoL. parts[] lists what the item is built from;
// owning a part discounts the finished item by exactly that part's price.
// ตำนานและนิทานที่แต่ละชิ้นอ้างอิงอยู่ใน th ไทย — ราคาและสูตรตรงกับตารางที่ผู้ใช้ส่งมา
export const ITEMS = [
  // --- ของเริ่มเกม (ถือได้คนละ 1 ชิ้น) — ความโกลาหลก่อนกำเนิดระเบียบจักรวาล
  { id: "cb", th: "Chaos Blade — ดาบอลวน", cat: "START", tier: 1, cost: 10, ad: 20, hp: 70, omnivampFlat: 0.03 },
  { id: "cs", th: "Chaos Scroll — คัมภีร์อลวน", cat: "START", tier: 1, cost: 10, ap: 30, hp: 60, ah: 5 },
  { id: "csh", th: "Chaos Shield — โล่อลวน", cat: "START", tier: 1, cost: 10, hp: 140, armor: 10, mr: 10 },
  { id: "cbw", th: "Chaos Bow — คันศรอลวน", cat: "START", tier: 1, cost: 10, ad: 15, asPct: 0.10, omnivampFlat: 0.02 },
  { id: "cd", th: "Chaos Dagger — กริชอลวน", cat: "START", tier: 1, cost: 10, ad: 20, arPen: 10 },
  { id: "cch", th: "Chaos Chalice — จอกอลวน", cat: "START", tier: 1, cost: 10, hp: 50, hors: 0.10, ah: 10 },

  // --- ชิ้นส่วน Tier 1
  { id: "ss", th: "Straw Sandals — รองเท้าฟาง", cat: "T1", tier: 1, cost: 6, ms: 25 },
  { id: "bt2", th: "Boar Tusk — เขี้ยวหมูป่า", cat: "T1", tier: 1, cost: 7, ad: 10 },
  { id: "wt", th: "Willow Twig — กิ่งหลิว", cat: "T1", tier: 1, cost: 6, ap: 15 },
  { id: "nd", th: "Nymph's Dewdrop — หยาดน้ำค้างนิมฟ์", cat: "T1", tier: 1, cost: 8, hp: 150 },
  { id: "bc", th: "Boiled Cuirass — เกราะต้ม", cat: "T1", tier: 1, cost: 6, armor: 15 },
  { id: "bcl", th: "Braided Clover — โคลเวอร์ถัก", cat: "T1", tier: 1, cost: 6, mr: 15 },
  { id: "cf", th: "Crow Feather — ขนกา", cat: "T1", tier: 1, cost: 5, asPct: 0.1 },
  { id: "bsd", th: "Broken Sundial — นาฬิกาแดดแตก", cat: "T1", tier: 1, cost: 5, ah: 5 },
  { id: "rf", th: "Robin's Fletching — ขนศรโรบินฮู้ด", cat: "T1", tier: 1, cost: 8, crit: 0.1 },

  // --- ชิ้นส่วน Tier 1 ชุดใหม่
  { id: "sil", th: "Siren's Lure — เหยื่อล่อไซเรน", cat: "T1", tier: 1, cost: 6, omnivampFlat: 0.04 },
  { id: "ftf", th: "Fenrir's Torn Fang — เขี้ยวหักเฟนริร์", cat: "T1", tier: 1, cost: 6, arPen: 5 },
  { id: "iwf", th: "Icarus' Wax Feather — ขนนกขี้ผึ้งอิคารัส", cat: "T1", tier: 1, cost: 6, msPct: 0.04 },
    { id: "abc", th: "Ambrosia Crumb — เศษน้ำอมฤต", cat: "T1", tier: 1, cost: 5, healAmp: 0.08 },
  { id: "dwh", th: "Dwarf's Whetstone — หินลับคมคนแคระ", cat: "T1", tier: 1, cost: 6, critDmg: 0.10 },

  // --- รองเท้า Tier 2 (ADC ใส่ได้โดยไม่กินช่อง)
  { id: "sg", th: "Spartan Greaves — สนับแข้งสปาร์ตัน", cat: "BOOTS", tier: 2, kind: "boots", cost: 25,
    ms: 45, armor: 25, dmgReduceAuto: 0.12, parts: ["ss", "bc"] },
  { id: "at", th: "Asgardian Treads — เกือกแอสการ์ด", cat: "BOOTS", tier: 2, kind: "boots", cost: 25,
    ms: 45, mr: 25, tenacity: 0.3, parts: ["ss", "bcl"] },
  { id: "act", th: "Achilles' Talaria — ปีกอคิลลีส", cat: "BOOTS", tier: 2, kind: "boots", cost: 25,
    ms: 45, asPct: 0.25, onHitAdaptive: 0.01, parts: ["ss", "cf"] },
  { id: "chr", th: "Chronos' Stride — ก้าวโครนอส", cat: "BOOTS", tier: 2, kind: "boots", cost: 25,
    ms: 45, ah: 15, itemHaste: 30, parts: ["ss", "bsd"] },
  { id: "toh", th: "Talaria of Hermes — ปีกเฮอร์มีส", cat: "BOOTS", tier: 2, kind: "boots", cost: 25, ms: 60, slowResist: 0.40, parts: ["ss"] },
  { id: "cp", th: "Chimera's Prowlers — กรงเล็บไคเมร่า", cat: "BOOTS", tier: 2, kind: "boots", cost: 25,
    ms: 45, ad: 15, arPen: 8, parts: ["ss", "bt2"] },
  { id: "sof", th: "Sorcerer's Filigree — รองเท้าอาคม", cat: "BOOTS", tier: 2, kind: "boots", cost: 25,
    ms: 45, ap: 25, mrPen: 8, parts: ["ss", "wt"] },

  // --- เร่งจังหวะ Tier 2 (Ability Haste ผสมสายต่างๆ ใช้ได้ทุกตัว)
  { id: "cn", th: "Chainmail of the Nemean — เกราะขนสิงโต", cat: "T2", tier: 2, cost: 14, armor: 40, parts: ["bc", "bc"] },
  { id: "vsb", th: "Veil of the Silver Bough — กิ่งไม้เงิน", cat: "T2", tier: 2, cost: 14, mr: 40, parts: ["bcl", "bcl"] },
  { id: "ghs", th: "Giant's Heartstone — หัวใจศิลายักษ์", cat: "T2", tier: 2, cost: 19, hp: 400, parts: ["nd", "nd"] },
  { id: "gpr", th: "Golem's Plated Rib — ซี่โครงโกเลม", cat: "T2", tier: 2, cost: 16, hp: 200, armor: 25, parts: ["nd", "bc"] },
  { id: "rrc", th: "Red Riding Cloak — ผ้าคลุมหมวกแดง", cat: "T2", tier: 2, cost: 16, hp: 200, mr: 25, parts: ["nd", "bcl"] },
  { id: "gb", th: "Gargoyle's Bastion — ป้อมการ์กอยล์", cat: "T2", tier: 2, cost: 15, armor: 20, mr: 20, parts: ["bc", "bcl"] },
  { id: "pon", th: "Pendulum of Neverland — ลูกตุ้มเนเวอร์แลนด์", cat: "T2", tier: 2, cost: 15, hp: 200, ah: 10, parts: ["bsd", "nd"] },
  { id: "cwc", th: "Clockwork Carapace — กระดองจักรกล", cat: "T2", tier: 2, cost: 14, armor: 20, ah: 10, parts: ["bsd", "bc"] },
    { id: "cc", th: "Cauldron Churner — ไม้พายหม้อเวท", cat: "T2", tier: 2, cost: 15, ad: 15, ah: 10, parts: ["bsd", "bt2"] },
  { id: "ppf", th: "Pied Piper's Fife — ขลุ่ยจับหนู", cat: "T2", tier: 2, cost: 14, ap: 25, ah: 10, parts: ["bsd", "wt"] },
    
  // --- ไอเทมเวท Tier 3 (MAGE TIER 3)
  { id: "tet", th: "Thoth's Emerald Tablet — ศิลาจารึกมรกตธอธ", cat: "MAGE", tier: 3, cost: 65,
    ap: 85, apPct: 0.30, parts: ["cyw", "cyw"] },
  { id: "eoh", th: "Eye of Horus — ดวงตาแห่งฮอรัส", cat: "MAGE", tier: 3, cost: 58,
    ap: 60, ah: 10, mrPenPct: 0.30, parts: ["mwh", "orl"] },
  { id: "kff", th: "Kitsune's Foxfire Fan — พัดเพลิงจิ้งจอกเก้าหาง", cat: "MAGE", also: ["MARKSMAN"], tier: 3, cost: 60,
    ap: 50, asPct: 0.30, ah: 10, apOnHit: { flat: 8, apRatio: 0.12 }, parts: ["cyw", "cf", "bsd"] },
  { id: "csb", th: "Caliburn's Spellblade — ดาบมนตราแคลิเบิร์น", cat: "MAGE", also: ["ASSASSIN"], uniq: ["autoempower"], tier: 3, cost: 60,
    ap: 60, ah: 15, msPct: 0.05, spellblade: { baseAdRatio: 0.75, apRatio: 0.45, cd: 1.5 }, parts: ["cyw", "ppf"] },
  { id: "stc", th: "Surtr's Twilight Cinder — เถ้าอัคคีสุรเทอร์", cat: "MAGE", tier: 3, cost: 62,
    ap: 60, hp: 300, burnPctHp: { pct: 0.012, dur: 3, every: 0.5 }, parts: ["cbl", "wbp"] },
  { id: "lbg", th: "Lilith's Sanguine Grimoire — คัมภีร์โลหิตลิลิธ", cat: "MAGE", also: ["ASSASSIN"], tier: 3, cost: 62,
    ap: 70, hp: 250, omnivampFlat: 0.05, lowHpVamp: { hpBelow: 0.50, add: 0.10 }, parts: ["cbl", "lgf"] },
  { id: "yfs", th: "Yuki-onna's Frozen Scepter — คทาเหมันต์ยูกิอนนะ", cat: "MAGE", also: ["SUPPORT"], tier: 3, cost: 60,
    ap: 65, hp: 350, spellSlow: { v: 0.30, dur: 2 }, parts: ["cbl", "cyw"] },
  { id: "zgc", th: "Zephyrus' Gale Cloak — ผ้าคลุมวายุเซฟีรัส", cat: "MAGE", tier: 3, cost: 60,
    ap: 50, ah: 20, msPct: 0.05, hp: 200, spellHaste: { ms: 0.20, dur: 3, cd: 0 }, parts: ["cyw", "ppf", "ss"] },
  { id: "nvs", th: "Nemesis' Vengeful Scales — ตราชั่งล้างแค้นเนเมซิส", cat: "MAGE", uniq: ["antiheal"], also: ["SUPPORT"], tier: 3, cost: 64,
    ap: 75, ah: 15, mrPen: 20, antihealOnDmg: { v: 0.40, dur: 3 },
    storedBurst: { dur: 2.5, flat: 100, accRatio: 0.20, cd: 25 }, parts: ["cyw", "wbp"] },
  { id: "rsd", th: "Raijin's Thunder Drum — กลองอัสนีไรจิน", cat: "MAGE", tier: 3, cost: 62,
    ap: 75, mrPen: 20, ah: 15, chainBolt: { flat: 80, apRatio: 0.25, arcFlat: 40, arcApRatio: 0.15, arcs: 3, arcRange: 500, cd: 10 }, parts: ["cyw", "orl", "bsd"] },
  { id: "hnd", th: "Hel's Nether Domain — แดนอเวจีแห่งเฮล", cat: "MAGE", also: ["SUPPORT"], tier: 3, cost: 62,
    ap: 60, hp: 250, ah: 10, ultCdr: 0.20, ultZone: { r: 600, dur: 4, flat: 10, apRatio: 0.05, mrShred: 0.15 }, parts: ["cbl", "pwa"] },
  { id: "mrt", th: "Merlin's Starbolt Staff — ไม้เท้าสะเก็ดดาวเมอร์ลิน", cat: "MAGE", tier: 3, cost: 60,
    ap: 70, mrPen: 15, ah: 10, meteor: { range: 1200, r: 200, flat: 120, apRatio: 0.40, cd: 25 }, parts: ["cyw", "orl"] },
  { id: "ntw", th: "Norns' Thread of Weaving — เส้นด้ายลิขิตนอร์นส์", cat: "MAGE", also: ["SUPPORT"], tier: 3, cost: 60,
    ap: 50, hp: 200, ultAh: 20, ultSurge: { ms: 0.30, apPct: 0.20, dur: 4 }, parts: ["ppf", "cbl"] },
  { id: "jbg", th: "Jack's Giantbane Harp — พิณปราบยักษ์ของแจ็ค", cat: "MAGE", tier: 3, cost: 60,
    ap: 65, ah: 15, healthyAmp: { hpAbove: 0.50, amp: 0.15 }, parts: ["cyw", "ppf"] },
  { id: "ang", th: "Amrita's Nectar Goblet — จอกน้ำอมฤต", cat: "MAGE", also: ["SUPPORT"], tier: 3, cost: 60,
    ap: 60, mrPenPct: 0.20, hp: 200, ah: 10, takedownHeal: { flat: 100, apRatio: 0.35, team: true, once: true }, parts: ["orl", "cbl"] },

  // --- ไอเทมมาร์คแมน Tier 3 (MARKSMAN TIER 3) — คริต 25% ทุกชิ้น
  { id: "asc", th: "Artemis' Silver Crescent — จันทราเงินแห่งอาร์เทมิส", cat: "MARKSMAN", tier: 3, cost: 62,
    ad: 60, crit: 0.25, critDmg: 0.25, parts: ["hys", "dvc"] },
  { id: "swf", th: "Swan Maiden's Feathered Cloak — ปีกขนนกหญิงสาวหงส์", cat: "MARKSMAN", uniq: ["lifeline"], also: ["FIGHTER"], tier: 3, cost: 60,
    ad: 60, crit: 0.25, omnivampFlat: 0.08, parts: ["lbn", "hys"] },
  { id: "slh", th: "Sleipnir's Galloping Horseshoe — เกือกม้าทะยานสเลปนีร์", cat: "MARKSMAN", tier: 3, cost: 58,
    ad: 35, crit: 0.25, asPct: 0.15, msPct: 0.05, parts: ["asf", "cf", "bt2"] },
  { id: "wtc", th: "William Tell's Sovereign Crossbow — หน้าไม้วิลเลียม เทลล์", cat: "MARKSMAN", tier: 3, cost: 60,
    ad: 55, crit: 0.25, armorPenPct: 0.25, parts: ["wtb", "hys"] },
  { id: "ulf", th: "Urd's Loom of Fate — กี่ทอชะตาอูร์ด", cat: "MARKSMAN", tier: 3, cost: 62,
    ad: 20, crit: 0.25, asPct: 0.25, ah: 15, parts: ["hys", "bsd", "bt2"] },
  { id: "ivd", th: "Indra's Vajra Dart — วัชระอัสนีอินทรา", cat: "MARKSMAN", uniq: ["thirdhit"], tier: 3, cost: 60,
    ad: 55, asPct: 0.25, crit: 0.25, parts: ["asf", "bt2", "bt2"] },
  { id: "boe", th: "Bow of Eurytus — คันศรแห่งยูริทัส", cat: "MARKSMAN", uniq: ["autoempower"], tier: 3, cost: 58,
    ad: 35, asPct: 0.20, crit: 0.25, msPct: 0.07, parts: ["asf", "iwb"] },
  { id: "sst", th: "Shiva's Trishula — ตรีศูลทำลายล้างพระศิวะ", cat: "MARKSMAN", uniq: ["thirdhit", "antiheal"], also: ["FIGHTER"], tier: 3, cost: 60,
    ad: 45, asPct: 0.30, armorPenPct: 0.30, antihealOnDmg: { v: 0.40, dur: 3 }, parts: ["hwt", "exn"] },
  { id: "hth", th: "Hephaestus' Twin Hammers — ค้อนคู่ตีเหล็กเฮเฟสตัส", cat: "MARKSMAN", also: ["FIGHTER"], tier: 3, cost: 62,
    ad: 40, ap: 40, asPct: 0.35, ah: 10, parts: ["hwt", "vtp", "bsd"] },
  { id: "asq", th: "Apollo's Sunlit Quiver — กระบอกศรสุริยันอพอลโล", cat: "MARKSMAN", also: ["FIGHTER"], tier: 3, cost: 62,
    ad: 60, apolloSplit: { hpAbove: 0.50, ad: 40, omnivamp: 0.15 }, parts: ["lbn", "slf"] },

  // --- ซัพพอร์ตสาย Enchanter Tier 3
  { id: "ats", th: "Asclepius' Twin Serpent Staff — คทาอสรพิษคู่แอสคลีเปียส", cat: "SUPPORT", tier: 3, cost: 46,
    ap: 45, ah: 10, hors: 0.12, chainHors: { pct: 0.25, radius: 750 }, parts: ["isw", "ccr"] },
  { id: "acb", th: "Aceso's Guiding Censer — กระถางกำยานอเคโซ", cat: "SUPPORT", uniq: ["horsbuff"], tier: 3, cost: 46,
    ap: 50, ms: 25, ah: 10, hors: 0.14, horsBuffAs: { as: 0.15, asPerLvl: 0.005, onHit: 10, onHitPerLvl: 3, apRatio: 0.10, dur: 4 },
    parts: ["isw", "ngv"] },
  { id: "sfv", th: "Saraswati's Flowing Veena — พิณธารปัญญาสรัสวดี", cat: "SUPPORT", uniq: ["horsbuff"], tier: 3, cost: 46,
    ap: 40, ah: 10, hors: 0.10, horsBuffAp: { ap: 13, apPerLvl: 1, ah: 15, ahPerLvl: 0, dur: 4 },
    parts: ["isw", "ccr"] },
  { id: "yrh", th: "Yggdrasil's Radiant Heartwood — แก่นไม้อิกดราซิล", cat: "SUPPORT", tier: 3, cost: 48,
    ap: 35, hp: 150, ah: 10, hors: 0.10, tier3ScalingHors: 0.04, parts: ["isw", "nd"] },
  { id: "esb", th: "Eir's Sanctuary Bell — ระฆังเขตบุญแห่งเออีร์", cat: "SUPPORT", uniq: ["teamsave"], tier: 3, cost: 48,
    hp: 250, ah: 15, hors: 0.12, parts: ["ccr", "nd"] },
  { id: "abw", th: "Aeolus' Bound Winds — ถุงลมกักวายุแอโอลัส", cat: "SUPPORT", tier: 3, cost: 46,
    ap: 40, ah: 10, ms: 20, hors: 0.10, abwSurge: { base: 0.20, max: 0.45 }, parts: ["ngv", "ccr"] },
  { id: "hmb", th: "Hermes' Moly Blossom — ดอกโมลีแห่งเฮอร์มีส", cat: "SUPPORT", uniq: ["cleanse"], tier: 3, cost: 48,
    ap: 30, ah: 15, hp: 100, hors: 0.15, cleanseAll: true, cleanseCd: 50, parts: ["ccr", "isw"] },

  // --- ซัพพอร์ตสายแทงค์ Tier 3
  { id: "pib", th: "Pridwen's Iron Bastion — ป้อมปราการเหล็กพริตเวน", cat: "SUPPORT", uniq: ["teamsave"], also: ["TANK"], tier: 3, cost: 48,
    hp: 175, armor: 25, mr: 25, parts: ["gb", "nd"] },
  { id: "gwc", th: "Gjallarhorn's War Clarion — แตรศึกกยัลลาร์ฮอร์น", cat: "SUPPORT", also: ["TANK"], tier: 3, cost: 46,
    hp: 250, armor: 30, ah: 10, parts: ["gpr", "ss"] },
  { id: "ood", th: "Oath of the Dioscuri — คำสัตย์แห่งไดออสคูรี", cat: "SUPPORT", also: ["TANK"], tier: 3, cost: 48,
    hp: 250, armor: 30, lifeBondShare: 0.15, parts: ["gpr", "pon"] },

  // --- แทงค์ Tier 3
  { id: "nlm", th: "Nemean Lion's Mane — แผงคอสิงโตเนเมียน", cat: "TANK", tier: 3, cost: 60,
    hp: 400, armor: 80, parts: ["cn", "gpr", "bc"] },
  { id: "pmh", th: "Prometheus' Hearth — เตาไฟโพรมีธีอุส", cat: "TANK", also: ["FIGHTER"], tier: 3, cost: 60,
    hp: 650, armor: 40, ah: 10, hearth: { r: 325, flat: 20, ownHpPct: 0.025, every: 2 }, parts: ["gpr", "bbt"] },
  { id: "msq", th: "Mirror of the Snow Queen — กระจกราชินีหิมะ", cat: "TANK", tier: 3, cost: 60,
    hp: 250, armor: 90, ah: 15, parts: ["cwc", "cn", "gpr"] },
  { id: "mgc", th: "Mjölnir's Grounding Cloak — ผ้าคลุมมโยลเนียร์", cat: "TANK", also: ["FIGHTER"], tier: 3, cost: 60,
    hp: 400, mr: 70, msPct: 0.25, parts: ["vsb", "rrc", "nd"] },
  { id: "aoi", th: "Apple of Idunn — แอปเปิลอิดุนน์", cat: "TANK", uniq: ["lifeline"], tier: 3, cost: 60,
    hp: 800, ah: 10, idunn: { hpBelow: 0.50, missingPct: 0.10, over: 3, cd: 10 }, parts: ["ghs", "pon", "nd"] },
  { id: "hga", th: "Holy Grail of Avalon — จอกศักดิ์สิทธิ์อวาลอน", cat: "TANK", also: ["SUPPORT"], tier: 3, cost: 60,
    hp: 550, mr: 30, ah: 10, healAmp: 0.25, healAmpUniq: true, parts: ["ghs", "afw"] },
  { id: "cij", th: "Cuirass of the Iron John — เกราะคนเหล็ก", cat: "TANK", uniq: ["stackguard"], also: ["FIGHTER"], tier: 3, cost: 60,
    hp: 400, armor: 40, mr: 40, ah: 10, cijNoTenacity: true, parts: ["gb", "pon", "bc"] },
  { id: "sab", th: "Siren's Abyssal Bell — ระฆังไซเรน", cat: "TANK", also: ["FIGHTER"], tier: 3, cost: 64,
    armor: 65, mr: 65, ah: 10, sabCharge: 2, sabDr: { base: 0.40, max: 0.60 }, parts: ["gb", "cn", "vsb"] },
  { id: "gbs", th: "Gleipnir's Binding Shackles — โซ่ตรวนกลัยพ์เนียร์", cat: "TANK", also: ["SUPPORT"], tier: 3, cost: 64,
    hp: 450, armor: 45, mr: 45, ah: 10, gleipnir: { dur: 2.5, cd: 30, tenacityCut: 0.25 }, parts: ["gb", "pon", "nd"] },
  { id: "byc", th: "Baba Yaga's Iron Cauldron — หม้อเหล็กบาบายากา", cat: "TANK", uniq: ["antiheal"], also: ["FIGHTER"], tier: 3, cost: 58,
    hp: 400, armor: 45, ah: 10, antihealOnDmg: { v: 0.40, dur: 3 }, parts: ["bbt", "gpr"] },
  { id: "mot", th: "Mirror of Truth — กระจกสลายภาพลวงตา", cat: "TANK", tier: 3, cost: 58,
    hp: 450, armor: 80, ah: 10, motFlat: 12, parts: ["cn", "gpr", "bc"] },

  // --- ชิ้นส่วน Tier 2 สายไฟท์เตอร์
  { id: "wha", th: "Woodcutter's Hewing Axe — ขวานคนตัดไม้", cat: "T2", tier: 2, cost: 16,
    ad: 15, hp: 150, parts: ["bt2", "nd"] },
  { id: "dwe", th: "Durandal's Whetted Edge — คมดาบดูรันดัล", cat: "T2", tier: 2, cost: 16,
    ad: 25, parts: ["bt2", "bt2"] },
  { id: "hwt", th: "Hiawatha's Tomahawk — ขวานซัดไฮอาวาธา", cat: "T2", tier: 2, cost: 13,
    ad: 10, asPct: 0.15, parts: ["bt2", "cf"] },
  { id: "vtp", th: "Valkyrie's Twin Plumes — ขนนกวัลคิรี", cat: "T2", tier: 2, cost: 12,
    asPct: 0.25, parts: ["cf", "cf"] },
    { id: "gva", th: "Gilgamesh's Vambrace — สนับแข้งกิลกาเมช", cat: "T2", tier: 2, cost: 15,
    ad: 10, armor: 25, parts: ["bt2", "bc"] },
  { id: "rwd", th: "Rowan Wand Dagger — กริชไม้โรวัน", cat: "T2", tier: 2, cost: 15,
    ad: 10, mr: 25, parts: ["bt2", "bcl"] },

  // --- ไฟท์เตอร์ Tier 3
  { id: "biv", th: "Blade of the Impaled Voivode — ดาบวลาดผู้เสียบ", cat: "FIGHTER", tier: 3, cost: 62,
    ad: 45, hp: 350, ah: 15, parts: ["wha", "cc", "nd"] },
  { id: "soo", th: "Shroud of Osiris — ผ้าห่อโอซิริส", cat: "FIGHTER", uniq: ["lifeline"], also: ["TANK"], tier: 3, cost: 64,
    ad: 45, armor: 40, reviveHp: 0.30, parts: ["dwe", "gva", "bc"] },
  { id: "cbc", th: "Cuirass of the Bleeding Centaur — เกราะเลือดเซนทอร์", cat: "FIGHTER", uniq: ["antiheal"], also: ["TANK"], tier: 3, cost: 62,
    ad: 50, armor: 40, ah: 15, antihealOnDmg: { v: 0.40, dur: 3 },
    centaurBleed: { pct: 0.30, dur: 3, healBack: 1.50 },
    centaurStack: { max: 20, ar: 2, mr: 2, ad: 2, capSlowResist: 0.30, capTenacity: 0.30 },
    parts: ["gva", "exn", "bt2"] },
  { id: "bdc", th: "Balmung's Dragon-Cleaver — ดาบบาลมุงก์", cat: "FIGHTER", uniq: ["autoempower"], also: ["ASSASSIN"], tier: 3, cost: 60,
    ad: 40, hp: 300, ah: 15, parts: ["cc", "wha"] },
  { id: "cbg", th: "Cleaver of the Gorgon's Bane — ขวานกอร์กอน", cat: "FIGHTER", also: ["MARKSMAN"], tier: 3, cost: 62,
    ad: 45, hp: 350, ah: 15, parts: ["wha", "cc", "bt2"] },
  { id: "pnb", th: "Pauldrons of the Nian Beast — เกราะไหล่เหนียน", cat: "FIGHTER", uniq: ["stackguard"], also: ["TANK"], tier: 3, cost: 60,
    ad: 40, hp: 350, armor: 30, parts: ["wha", "gva", "bc"] },
  { id: "hwh", th: "Horn of the Wild Hunt — เขาศึกไวลด์ฮันต์", cat: "FIGHTER", also: ["MARKSMAN"], tier: 3, cost: 60,
    ad: 40, hp: 300, asPct: 0.2, ultAh: 25,
    // กดอัลติแล้วเร่งตัวเอง — ตัวเลขจริงอยู่ที่ engine/step.js ตรง hwhReadyAt
    ultRush: { ad: 20, as: 0.30, ms: 0.15, dur: 10, cd: 30 }, parts: ["hwt", "wha", "cc"] },
  { id: "cco", th: "Colossal Club of the Oni — กระบองโอนิ", cat: "FIGHTER", also: ["TANK"], tier: 3, cost: 62,
    ad: 35, hp: 550, parts: ["wha", "ghs", "bt2"] },
  { id: "goh", th: "Girdle of Hippolyta — เข็มขัดฮิปโปลิตา", cat: "FIGHTER", also: ["TANK"], tier: 3, cost: 60,
    ad: 40, hp: 350, asPct: 0.2, ah: 10, parts: ["hwt", "wha", "pon"] },
  { id: "dss", th: "Draupnir's Sovereign Signet — แหวนดราวป์เนียร์", cat: "FIGHTER", uniq: ["cleanse"], also: ["TANK", "MARKSMAN"], tier: 3, cost: 64,
    ad: 50, armor: 30, mr: 30, cleanseCd: 45, parts: ["dwe", "rwd", "bc"] },

  // --- ชิ้นส่วน Tier 2 สายแอสซาซิน
  { id: "hsd", th: "Huntsman's Skinning Dirk — มีดถลกหนังนายพราน", cat: "T2", tier: 2, cost: 15,
    ad: 20, arPen: 10, parts: ["bt2", "bt2"] },
  { id: "psc", th: "Puck's Shadow Cloak — ผ้าคลุมเงาของพัค", cat: "T2", tier: 2, cost: 15,
    ad: 10, ms: 20, arPen: 5, parts: ["bt2", "ss"] },
  { id: "lmd", th: "Loki's Mistletoe Dagger — กริชมิสเซิลโทโลคิ", cat: "T2", tier: 2, cost: 14,
    ad: 15, ah: 10, parts: ["bt2", "bsd"] },

  // --- ชิ้นส่วน Tier 2 สายเวท (MAGE PARTS)
  { id: "cyw", th: "Circe's Yew Wand — ไม้กายสิทธิ์เซอร์ซี", cat: "T2", tier: 2, cost: 15,
    ap: 35, parts: ["wt", "wt"] },
  { id: "orl", th: "Orpheus' Resonant Lyre — พิณก้องกังวานออร์เฟอุส", cat: "T2", tier: 2, cost: 15,
    ap: 20, mrPen: 10, parts: ["wt", "bsd"] },
  { id: "cbl", th: "Cerridwen's Brewing Ladle — กระบวยปรุงยาแคร์ริดเวน", cat: "T2", tier: 2, cost: 15,
    ap: 20, hp: 180, parts: ["wt", "nd"] },
  { id: "pwa", th: "Persephone's Asphodel — ดอกแอสโฟเดลเพอร์เซโฟนี", cat: "T2", tier: 2, cost: 14,
    ap: 20, mr: 25, parts: ["wt", "bcl"] },
  // --- ชิ้นส่วน Tier 2 สายมาร์คแมน (MARKSMAN PARTS)
  { id: "hys", th: "Hou Yi's Sunpiercer Arrow — ศรสุริยันโฮ่วยี่", cat: "T2", tier: 2, cost: 16,
    ad: 15, crit: 0.15, parts: ["bt2", "rf"] },
  { id: "asf", th: "Atalanta's Swift Fletching — ขนศรลมกรดอตาลันตา", cat: "T2", tier: 2, cost: 15,
    asPct: 0.15, crit: 0.15, msPct: 0.05, parts: ["cf", "rf"] },
  { id: "lbn", th: "Lamia's Blood Needle — เข็มสูบเลือดลามิเอ", cat: "T2", tier: 2, cost: 15,
    ad: 15, omnivampFlat: 0.05, parts: ["bt2"] },
  { id: "wtb", th: "William Tell's Apple-Splitter — ศรผ่าแอปเปิลวิลเลียม เทลล์", cat: "T2", tier: 2, cost: 15,
    ad: 15, armorPenPct: 0.10, parts: ["bt2", "bsd"] },

  // --- ชิ้นส่วนสายซัพพอร์ต (SUPPORT PARTS) — hors = พลังฮีล/โล่ที่ "จ่ายออก"
  { id: "pcp", th: "Panacea's Dried Petal — กลีบดอกไม้แห้งแพนาเซีย", cat: "T1", tier: 1, cost: 5,
    hors: 0.06 },
  { id: "isw", th: "Idunn's Spring Water — น้ำพุฤดูใบไม้ผลิอิดุนน์", cat: "T2", tier: 2, cost: 13,
    ap: 15, hors: 0.08, parts: ["pcp", "wt"] },
  { id: "ccr", th: "Chiron's Chanted Ribbon — ริบบิ้นสวดมนตร์ไครอน", cat: "T2", tier: 2, cost: 12,
    ah: 10, hors: 0.08, parts: ["pcp", "bsd"] },
  { id: "ngv", th: "Nymph's Graceful Veil — ม่านลอยลมพรายนิมฟ์", cat: "T2", tier: 2, cost: 13,
    ms: 20, hors: 0.08, parts: ["pcp", "ss"] },

  // --- ชิ้นส่วน Tier 2 ชุดใหม่ (ต่อยอดจากชิ้นส่วน Tier 1 ชุดใหม่)
  { id: "slf", th: "Siren's Song-Flask — ขวดเพลงไซเรน", cat: "T2", tier: 2, cost: 15,
    ad: 15, omnivampFlat: 0.06, parts: ["sil", "bt2"] },
  { id: "lgf", th: "Lycaon's Gorging Fang — เขี้ยวกลืนกินไลเคออน", cat: "T2", tier: 2, cost: 15,
    ap: 20, omnivampFlat: 0.06, parts: ["sil", "wt"] },
  { id: "fcl", th: "Fenrir's Chain-Link — ห่วงโซ่เฟนริร์", cat: "T2", tier: 2, cost: 14,
    ad: 10, arPen: 10, parts: ["ftf", "bt2"] },
  { id: "mwh", th: "Mimir's Whispering Head — เศียรกระซิบมิเมียร์", cat: "T2", tier: 2, cost: 16,
    ap: 25, mrPenPct: 0.08, parts: ["ftf", "wt"] },
  { id: "iwb", th: "Icarus' Wax-Bound Wings — ปีกขี้ผึ้งอิคารัส", cat: "T2", tier: 2, cost: 14,
    ms: 20, asPct: 0.15, parts: ["iwf", "cf"] },
    { id: "afw", th: "Argonaut's Fleece Wrap — ขนแกะอาร์โกนอต", cat: "T2", tier: 2, cost: 15,
    hp: 150, healAmp: 0.12, parts: ["abc", "nd"] },
  { id: "dvc", th: "Dvalinn's Whetted Chisel — สิ่วลับคมดวาลิน", cat: "T2", tier: 2, cost: 16,
    crit: 0.15, critDmg: 0.15, parts: ["dwh", "rf"] },
  { id: "exn", th: "Executioner's Nettle — ตำแยเพชฌฆาต", cat: "T2", uniq: ["antiheal"], tier: 2, cost: 14,
    ad: 15, antihealOnDmg: { v: 0.40, dur: 3 }, parts: ["bt2"] },
  { id: "wbp", th: "Witch's Banebloom — ดอกพิษแม่มด", cat: "T2", uniq: ["antiheal"], tier: 2, cost: 14,
    ap: 20, antihealOnDmg: { v: 0.40, dur: 3 }, parts: ["wt"] },
  { id: "bbt", th: "Baba Yaga's Bone Thorn — หนามกระดูกบาบายากา", cat: "T2", uniq: ["antiheal"], tier: 2, cost: 14,
    armor: 20, antihealOnDmg: { v: 0.40, dur: 3 }, parts: ["bc"] },

  // --- ไอเทมแอสซาซิน Tier 3
  { id: "cns", th: "Carnwennan's Shadowblade — กริชเงาคาร์นเวนแนน", cat: "ASSASSIN", tier: 3, cost: 60,
    ad: 55, arPen: 15, ah: 10, dashStrike: { flat: 80, bonusAdRatio: 0.50, cd: 6 }, parts: ["hsd", "lmd"] },
  { id: "smc", th: "Sekhmet's Massacre Claws — กรงเล็บสังหารเซคเมต", cat: "ASSASSIN", also: ["FIGHTER"], tier: 3, cost: 62,
    ad: 60, arPen: 20, ms: 20, ragePen: { arPen: 15, dur: 10 }, parts: ["hsd", "psc"] },
  { id: "sls", th: "Seven-League Shadowstriders — เกือกเจ็ดลีกล่องเงา", cat: "ASSASSIN", tier: 3, cost: 60,
    ad: 50, arPen: 15, ms: 35, dashSpeed: { ms: 0.40, dur: 3, cd: 15, resetOnKill: true }, parts: ["psc", "hsd"] },
  { id: "htc", th: "Hecate's Triple Crescent — จันทราสามเสี้ยวเฮคาเต", cat: "ASSASSIN", tier: 3, cost: 62,
    ad: 55, arPen: 15, ah: 15, tripleHit: { hits: 3, window: 2, pctMaxHp: 0.08, cd: 8 }, parts: ["hsd", "lmd"] },
  { id: "fms", th: "Fang of the Midgard Serpent — เขี้ยวพญางูมิดการ์ด", cat: "ASSASSIN", also: ["FIGHTER"], tier: 3, cost: 58,
    ad: 55, arPen: 20, shieldBreak: { dmgMul: 0.50, incomingCut: 0.40, dur: 3 }, parts: ["hsd", "fcl"] },
  { id: "jvb", th: "Jabberwock's Vorpal Blade — ดาบวอร์พอลปลิดชีพ", cat: "ASSASSIN", also: ["FIGHTER"], tier: 3, cost: 60,
    ad: 60, arPen: 15, executeHit: { hpBelow: 0.50, flat: 100, bonusAdRatio: 0.40, cd: 6 }, parts: ["hsd", "bt2", "bt2"] },
  { id: "trs", th: "Thanatos' Reaping Scythe — เคียวเก็บเกี่ยวทานาทอส", cat: "ASSASSIN", tier: 3, cost: 64,
    ad: 50, arPen: 15, ah: 15, resetOnKill: true, resetOnce: true, parts: ["hsd", "lmd", "bsd"] },
  { id: "adm", th: "Anubis' Death Mark — มีดชี้ชะตาอนูบิส", cat: "ASSASSIN", uniq: ["antiheal"], tier: 3, cost: 62,
    ad: 50, arPen: 15, ah: 10, antihealOnDmg: { v: 0.40, dur: 3 },
    deathMark: { range: 700, slow: 0.40, slowDur: 2, amp: 0.15, markDur: 4, cd: 35 }, parts: ["hsd", "exn"] },
  { id: "fsd", th: "Freyja's Shroud of Defiance — ผ้าคลุมท้าความตายเฟรยา", cat: "ASSASSIN", uniq: ["lifeline"], tier: 3, cost: 64,
    ad: 50, arPen: 10, ah: 15, denyDeath: { dur: 2 }, parts: ["hsd", "lmd", "nd"] },
  { id: "wvc", th: "Wendigo's Voracious Claw — กรงเล็บตะกละเวนดิโก", cat: "ASSASSIN", also: ["FIGHTER"], tier: 3, cost: 60,
    ad: 55, arPen: 15, wendigo: { execPct: 0.20, gold: 2, once: true }, parts: ["hsd", "fcl"] },

  // ---------------------------------------------------------------
  // Patch 0.3 — ของใหญ่ชุดใหม่ 12 ชิ้น
  // ชื่อทุกชิ้นอ้างอิงตำนานหรือนิทานพื้นบ้านตามธีมเดิมของเกม
  // สูตรคราฟต์ประกอบจากชิ้นส่วนที่มีอยู่แล้ว ไม่ต้องเพิ่มชิ้นส่วนใหม่
  // ---------------------------------------------------------------
  { id: "lex", th: "The Legendary Excalibur — เอกซ์คาลิเบอร์ในตำนาน", cat: "FIGHTER", also: ["ASSASSIN", "TANK"], tier: 3, cost: 64,
    ad: 55, hp: 250, ah: 15,
    firstHitShield: { flat: 120, badRatio: 1.0, dur: 3.5, ms: 0.10, cd: 15 }, parts: ["dwe", "wha", "lmd"] },
  { id: "mww", th: "Mímir's Whispering Well — บ่อน้ำกระซิบมิเมียร์", cat: "TANK", also: ["MAGE", "SUPPORT"], tier: 3, cost: 58,
    hp: 450, mr: 60, ah: 10,
    magicPulse: { flat: 25, bonusHpPct: 0.015, every: 1, radius: 400, amp: 0.12, dur: 3 }, parts: ["rrc", "vsb", "pon"] },
  { id: "fdm", th: "Fafnir's Devouring Maw — ปากเขี้ยวฟาฟเนียร์", cat: "MARKSMAN", also: ["FIGHTER", "ASSASSIN"], tier: 3, cost: 63,
    ad: 50, asPct: 0.25, omnivampFlat: 0.10,
    curHpOnHit: { melee: 0.08, ranged: 0.05 },
    maulBurst: { hits: 3, pct: 0.05, msSteal: 0.20, dur: 2, cd: 20 }, parts: ["hwt", "lbn", "slf"] },
  { id: "mut", th: "Morgana's Unravelling Thread — เส้นด้ายคลายมนตร์มอร์กานา", cat: "MAGE", tier: 3, cost: 60,
    ap: 85, hp: 250, ah: 15,
    mrShredStack: { pct: 0.05, dur: 4, max: 6 }, parts: ["cbl", "cyw", "ppf"] },
  { id: "ahe", th: "Argus' Hundred Eyes — ร้อยดวงตาอาร์กัส", cat: "TANK", also: ["SUPPORT"], tier: 3, cost: 58,
    hp: 400, armor: 35, mr: 35, ah: 10,
    crowdGuard: { radius: 650, per: 8, max: 5 }, parts: ["gb", "ghs", "cwc"] },
  { id: "sbs", th: "Sleeping Beauty's Spindle — กระสวยเจ้าหญิงนิทรา", cat: "MAGE", uniq: ["lifeline"], also: ["ASSASSIN"], tier: 3, cost: 62,
    ap: 85, armor: 45, ah: 15,
    stasis: { hpBelow: 0.30, dur: 2.0, cd: 45 }, parts: ["cyw", "cwc", "cn"] },
  { id: "mub", th: "Mordred's Usurping Blade — ดาบทรยศมอร์เดรด", cat: "ASSASSIN", also: ["FIGHTER"], tier: 3, cost: 62,
    ad: 45, armorPenPct: 0.25, ah: 15,
    ultRefundOnTakedown: 0.25, parts: ["wtb", "hsd", "lmd"] },
  { id: "atq", th: "Atalanta's Swift Quiver — กระบอกศรอตาลันตา", cat: "MARKSMAN", tier: 3, cost: 58,
    ad: 45, crit: 0.25, asPct: 0.20,
    openerMs: { ms: 0.35, dur: 2.5, cd: 15 }, parts: ["hys", "asf", "cf"] },
  { id: "oub", th: "Odysseus' Unstrung Bow — คันศรที่ไม่มีใครน้าวไหว", cat: "MARKSMAN", tier: 3, cost: 60,
    ad: 40, crit: 0.25, asPct: 0.25,
    takedownReach: { range: 100, ms: 0.08, dur: 6 }, parts: ["hys", "vtp", "dvc"] },
  { id: "sta", th: "Skadi's Triple Arrow — ศรสามดอกสกาดี", cat: "MARKSMAN", tier: 3, cost: 56,
    asPct: 0.35, crit: 0.25, msPct: 0.07,
    splitBolts: { count: 2, ratio: 0.40, range: 500 }, parts: ["vtp", "asf", "iwb"] },
  // รหัสเดิมของชิ้นนี้คือ hwh ซึ่งไปชนกับ Horn of the Wild Hunt ที่มีมาก่อน
  // ITEM_BY_ID เก็บได้รหัสละชิ้น ของที่ส่งข้ามสายด้วยรหัสจึงกลายร่างเป็นอีกชิ้นที่ปลายทาง
  { id: "hwg", th: "Heimdall's Warding Horn — แตรเฝ้าสะพานไฮม์ดัล", cat: "TANK", also: ["SUPPORT"], tier: 3, cost: 45,
    armor: 35, mr: 35, hp: 300, ultAh: 15,
    ultSlowField: { r: 450, dur: 3, slow: 0.45, cd: 30 }, parts: ["gb", "pon"] },
  { id: "agt", th: "Ariadne's Guiding Thread — เส้นด้ายนำทางอาเรียดเน", cat: "SUPPORT", also: ["MAGE"], tier: 3, cost: 48,
    hp: 250, ap: 35, ah: 15, hors: 0.10,
    ccMark: { dur: 4, amp: 0.15, cd: 8 }, parts: ["cbl", "ccr", "isw"] },
];


export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// ---------------------------------------------------------------
// กลุ่มไอเทมที่ทำหน้าที่ทับกัน — ถือได้กลุ่มละชิ้นเท่านั้น
// ของพวกนี้ซื้อซ้อนกันแล้วไม่ได้แรงขึ้นเป็นเท่าตัว (บางอันเอนจินใช้ตัวที่แรงสุดอยู่แล้ว)
// แต่กินช่องเก็บของและกินเงิน เลยเป็นกับดักสำหรับคนเล่นและทำให้บอทซื้อของเพี้ยน
// เพิ่มกลุ่มใหม่ได้โดยใส่ `uniq: ["ชื่อกลุ่ม"]` ที่ตัวไอเทม ชิ้นเดียวอยู่ได้หลายกลุ่ม
// ---------------------------------------------------------------
export const UNIQ_GROUPS = {
  thirdhit: { th: "ออโต้ครั้งที่ 3" },
  autoempower: { th: "ออโต้ครั้งถัดไปแรงขึ้น" },
  lifeline: { th: "กันตายตอนเลือดต่ำ" },
  cleanse: { th: "ล้าง CC" },
  antiheal: { th: "ตัดฮีล" },
  stackguard: { th: "สะสมชั้นแล้วอึดขึ้น" },
  teamsave: { th: "อุ้มทีมตอนเพื่อนเลือดต่ำ" },
  horsbuff: { th: "ฮีล/โล่แล้วบัฟทั้งคู่" },
};


// ของชิ้นนี้ชนกับของที่ถืออยู่แล้วหรือเปล่า — คืนชิ้นที่ชนกัน (ถ้ามี)
// ชิ้นส่วนที่กำลังจะถูกกลืนเข้าสูตรไม่นับว่าชน ไม่งั้นจะอัพของตัวเองไม่ได้
export function uniqClash(items, item, consumed) {
  if (!item.uniq) return null;
  const eaten = consumed || [];
  for (const own of items) {
    if (own.id === item.id || !own.uniq) continue;
    if (eaten.some((x) => x === own || x.id === own.id)) continue;
    const hit = own.uniq.find((g) => item.uniq.includes(g));
    if (hit) return { item: own, group: hit };
  }
  return null;
}


function itemShortName(it) {
  return String(it.th).split("—")[0].trim();
}



// ของในแท็บหนึ่ง เรียงสายหลักขึ้นก่อน แล้วค่อยของที่ยืมมาจากสายอื่น
export function itemsInCat(cat) {
  const own = ITEMS.filter((i) => i.cat === cat);
  const lent = ITEMS.filter((i) => i.cat !== cat && i.also && i.also.includes(cat));
  return { own, lent, all: [...own, ...lent] };
}


// which of the item's parts this character already owns
// Resolves how much of `item`'s full recipe tree the champion already owns —
// matches a finished copy of a COMPONENT first, and recurses into that
// component's own parts if it isn't owned outright, so loose Tier-1 pieces
// still count toward a Tier-3 item's price. The item being bought is never
// matched against itself — that would let a repeat purchase of a base piece
// cannibalize the copy you already own instead of buying a fresh one.
export function resolveComponent(pool, item) {
  const idx = pool.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    const [got] = pool.splice(idx, 1);
    return { credit: item.cost, consumed: [got] };
  }
  if (!item.parts) return { credit: 0, consumed: [] };
  let credit = 0;
  const consumed = [];
  for (const pid of item.parts) {
    const r = resolveComponent(pool, ITEM_BY_ID[pid]);
    credit += r.credit;
    consumed.push(...r.consumed);
  }
  return { credit, consumed };
}


export function resolveRecipe(pool, item) {
  if (!item.parts) return { credit: 0, consumed: [] };
  let credit = 0;
  const consumed = [];
  for (const pid of item.parts) {
    const r = resolveComponent(pool, ITEM_BY_ID[pid]);
    credit += r.credit;
    consumed.push(...r.consumed);
  }
  return { credit, consumed };
}


export function ownedParts(items, item) {
  return resolveRecipe([...items], item).consumed;
}


export function effectiveCost(items, item) {
  return item.cost - resolveRecipe([...items], item).credit;
}


export function slotsUsedBy(items, lane) {
  return items.filter((i) => !(lane === "ADC" && i.kind === "boots")).length;
}


// returns a reason string when the purchase is not allowed, otherwise null
export function buyBlockedReason(c, item) {
  // ชิ้นส่วน (Tier 1/2) ถือซ้ำได้ ของใหญ่ Tier 3 ถือได้ชิ้นเดียว
  if (item.tier === 3 && c.items.some((x) => x.id === item.id)) return tr("มีแล้ว");
  if (item.cat === "START" && c.items.some((x) => x.cat === "START")) return tr("มีของเริ่มเกมแล้ว");
  if (item.kind === "boots" && c.items.some((x) => x.kind === "boots")) return tr("มีรองเท้าแล้ว");
  const consumed = ownedParts(c.items, item);
  const clash = uniqClash(c.items, item, consumed);
  if (clash) return tr("ซ้ำกับ {0}", itemShortName(clash.item));
  const after = slotsUsedBy(c.items, c.lane) - slotsUsedBy(consumed, c.lane) + (c.lane === "ADC" && item.kind === "boots" ? 0 : 1);
  if (after > 6) return tr("ช่องเต็ม");
  if (c.gold < effectiveCost(c.items, item)) return tr("เงินไม่พอ");
  return null;
}


export function applyBuy(c, item) {
  if (buyBlockedReason(c, item)) return c;
  const consumed = ownedParts(c.items, item);
  const rest = [...c.items];
  for (const p of consumed) rest.splice(rest.findIndex((x) => x === p), 1);
  return { ...c, gold: c.gold - effectiveCost(c.items, item), items: [...rest, item] };
}
