// ---------------------------------------------------------------
// Patch 0.3 — กติกาการดราฟต์
//
//   DRAFT   : ไม่มีแบน หยิบสลับกันแบบ Snake 1-2-2-2-2-1
//   TOURNEY : แบนฝั่งละ 3 สลับกันก่อน แล้วค่อยหยิบแบบ Snake ชุดเดียวกัน
//
// ฝั่ง A = ผู้เล่น (First Pick) · ฝั่ง B = ฝ่ายตรงข้าม
// แยกไว้เป็นข้อมูลล้วนเพื่อให้เทสได้โดยไม่ต้องเปิดเบราว์เซอร์
// ---------------------------------------------------------------

export const BAN_ORDER = ["A", "B", "A", "B", "A", "B"];
export const PICK_ORDER = ["A", "B", "B", "A", "A", "B", "B", "A", "A", "B"];

export const DRAFT_STYLES = {
  BLIND: { id: "BLIND", th: "เลือกปิดตา", desc: "เลือกเองครบ 5 ตัว ไม่เห็นของอีกฝั่ง — แบบเดิม" },
  DRAFT: { id: "DRAFT", th: "ดราฟต์พิก", desc: "ผลัดกันเลือกแบบเปิดเผย ห้ามซ้ำกัน ลำดับ 1-2-2-2-2-1" },
  TOURNEY: { id: "TOURNEY", th: "ทัวร์นาเมนต์", desc: "แบนฝั่งละ 3 ตัวก่อน แล้วค่อยผลัดกันเลือกแบบดราฟต์" },
};


export function newDraft(style) {
  return { style, bans: [], picks: [], log: [] };
}


// ตอนนี้ถึงตาใคร และเป็นการแบนหรือการเลือก — คืน null เมื่อดราฟต์จบแล้ว
export function draftTurn(d) {
  if (!d) return null;
  if (d.style === "TOURNEY" && d.bans.length < BAN_ORDER.length) {
    return { kind: "ban", side: BAN_ORDER[d.bans.length], index: d.bans.length };
  }
  if (d.picks.length < PICK_ORDER.length) {
    return { kind: "pick", side: PICK_ORDER[d.picks.length], index: d.picks.length };
  }
  return null;
}


export function draftTaken(d) {
  return [...d.bans.map((b) => b.champId), ...d.picks.map((p) => p.champId)];
}


// ลงมือหนึ่งก้าว — คืนดราฟต์ก้อนใหม่ (ไม่แก้ของเดิม)
export function draftApply(d, champId, note) {
  const turn = draftTurn(d);
  if (!turn || !champId || draftTaken(d).includes(champId)) return d;
  const entry = { side: turn.side, champId };
  const log = [...d.log, note];
  return turn.kind === "ban"
    ? { ...d, bans: [...d.bans, entry], log }
    : { ...d, picks: [...d.picks, entry], log };
}


export const draftPicksOf = (d, side) => d.picks.filter((p) => p.side === side).map((p) => p.champId);


// ลงตาเดินหนึ่งก้าวถ้าถึงตาของฝั่งนั้นจริง — คืน null เมื่อยังไม่ถึงตา
// (ตาที่มาก่อนเวลาจะได้เก็บเข้าคิวไว้ลองใหม่ ไม่ใช่ทิ้งไป)
export function draftMove(d, champId, side, note) {
  if (!d) return null;
  const turn = draftTurn(d);
  if (!turn || turn.side !== side) return null;
  const after = draftApply(d, champId, note ? note(turn.kind) : "");
  return after === d ? null : after;
}


// ---------------------------------------------------------------
// คิวตาเดินสำหรับดราฟต์ข้ามเครื่อง
//
// สายเน็ตส่งตาเดินมาถึงเมื่อไหร่ก็ได้ รวมถึงตอนที่อีกฝั่งยังไม่ได้เปิดหน้าดราฟต์
// ตาที่ยังลงไม่ได้จึงต้องค้างไว้ก่อน แล้วลงให้ครบทันทีที่ลงได้
// แยกออกมาเป็นก้อนล้วนๆ เพื่อให้เทสได้โดยไม่ต้องมีเบราว์เซอร์
// ---------------------------------------------------------------
export function makeDraftQueue() {
  const q = [];
  return {
    push(champId, side) { q.push({ champId, side }); },
    size: () => q.length,
    clear() { q.length = 0; },
    // apply(champId, side) -> true เมื่อลงตานั้นได้จริง · คืนจำนวนตาที่ลงสำเร็จ
    drain(apply) {
      let done = 0;
      let moved = true;
      while (moved && q.length) {
        moved = false;
        for (let i = 0; i < q.length; i++) {
          if (!apply(q[i].champId, q[i].side)) continue;
          q.splice(i, 1);
          moved = true;
          done += 1;
          break;
        }
      }
      return done;
    },
  };
}
