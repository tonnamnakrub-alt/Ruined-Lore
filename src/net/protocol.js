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
    ch: c.char,
    an: c.athleteName,
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
    char: r.ch,
    athleteName: r.an,
    style: "POKE",
    autoLevel: false,
  }));
}


// ชนิดข้อความที่วิ่งบนสาย
export const MSG = {
  HELLO: "hello",       // แลกชื่อและโหมดตอนต่อติด
  READY: "ready",       // ส่งทีมของยกนี้ + บอกว่าพร้อมสู้แล้ว
  START: "start",       // host สั่งเริ่ม: seed + อีเวนต์ + ทีมของ host
  RESULT: "result",     // host ยืนยันผลที่เป็นทางการ
  CHAT: "chat",
};
