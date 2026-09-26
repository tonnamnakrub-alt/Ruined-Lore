import { ITEM_BY_ID } from "../data/items.js";


// ---------------------------------------------------------------
// ย่อ/คลายสภาพทีมสำหรับส่งข้ามสาย
// ส่งแค่สิ่งที่ buildFight ต้องใช้จริง — ไอเทมส่งแค่รหัส ไม่ส่งทั้งก้อน
// ---------------------------------------------------------------

export function packTeam(team) {
  return team.map((c) => ({
    l: c.lane,
    c: c.champId,
    lv: c.level,
    xp: c.xp,
    g: c.gold,
    i: (c.items || []).map((x) => x.id),
    r: c.ranks,
    a: c.athlete,
    u: c.upgrades || [],
    b: c.bountyGold || 0,
    s: c.sangHp || 0,
    sp: c.spot || null,
    dl: c.duelLane || null,   // PUSS — เลนที่สั่งท้าดวล
    db: c.duelBan || null,    // PUSS — เลนที่ยังประทับตราซ้ำไม่ได้ ถ้าหล่นหาย สองเครื่องจะเลือกเป้าคนละตัว
    gl: c.gankedLast ? 1 : 0, // ป่าเพิ่งไปแกงค์ยกที่แล้วไหม — ยกนี้ฟาร์มได้ 1.5 เท่า
    ks: c.killStreak || 0,    // ฆ่าติดกันกี่ศพ — มีผลกับค่าหัว
    ds: c.deathStreak || 0,   // ตายติดกันกี่ครั้ง
    ch: c.char,
    an: c.athleteName,
    // ต้องส่งสองอันนี้ด้วย ไม่งั้นสองเครื่องจำลองไฟต์คนละแบบแล้วได้ผลไม่ตรงกัน
    st: c.style,              // บุก/คุมระยะ/ตั้งรับ — เปลี่ยนระยะยืน การถอย และโบนัสไอเทมตามสาย
    w: c.wvcStacks || 0,      // สแตก Wendigo's Voracious Claw ที่สะสมข้ามยกมาเป็น AD ติดตัว
  }));
}


export function unpackTeam(rows) {
  return rows.map((r) => ({
    lane: r.l,
    champId: r.c,
    level: r.lv,
    xp: r.xp,
    gold: r.g,
    items: (r.i || []).map((id) => ITEM_BY_ID[id]).filter(Boolean),
    ranks: r.r,
    athlete: r.a,
    upgrades: r.u || [],
    bountyGold: r.b || 0,
    sangHp: r.s || 0,
    spot: r.sp || null,
    duelLane: r.dl || null,
    duelBan: r.db || null,
    gankedLast: !!r.gl,
    killStreak: r.ks || 0,
    deathStreak: r.ds || 0,
    char: r.ch,
    athleteName: r.an,
    // เดิมตรงนี้ตั้งเป็น POKE ตายตัว ทั้งที่อีกฝั่งอาจสั่งบุกหรือตั้งรับไว้
    // แต่ละเครื่องจึงจำลองทีมของอีกฝ่ายผิดนิสัย แล้วได้ผลการต่อสู้คนละอย่าง
    style: r.st || "POKE",
    wvcStacks: r.w || 0,
    autoLevel: false,
  }));
}


// ชนิดข้อความที่วิ่งบนสาย
export const MSG = {
  HELLO: "hello",       // แลกชื่อและโหมดตอนต่อติด
  READY: "ready",       // ส่งทีมของยกนี้ + บอกว่าพร้อมสู้แล้ว
  DRAFT: "draft",       // ตาเดินหนึ่งก้าวของดราฟต์ (แบนหรือเลือก) พร้อมบอกว่าเป็นฝั่งไหน
  START: "start",       // host สั่งเริ่ม: seed + อีเวนต์ + ทีมของ host
  // ดูไฟต์พร้อมกัน — เจ้าบ้านเลือกเลน ทุกคนกดพร้อมดู แล้วเริ่มพร้อมกันทุกเครื่อง
  WATCH: "watch",       // host -> ทุกคน: เลือกเลนนี้ (go:false) หรือเริ่มดูเลนนี้เลย (go:true)
  WATCH_READY: "wready", // ผู้เล่น -> host: กดพร้อมดู / ยกเลิก
  SPEED: "speed",       // host -> ทุกคน: เปลี่ยนความเร็วไฟต์ (พร้อมเวลาไฟต์ตอนนั้น)
  SYNC: "sync",         // host -> ทุกคน: เวลาไฟต์ของเจ้าบ้าน ใครช้ากว่าให้เร่งตาม
  RESULT: "result",     // host ยืนยันผลที่เป็นทางการ
  CHAT: "chat",
};
