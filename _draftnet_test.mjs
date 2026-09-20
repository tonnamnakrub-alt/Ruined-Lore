// ดราฟต์กับเพื่อนผ่านเน็ต — สองเครื่องต้องได้ผลดราฟต์ชุดเดียวกันเป๊ะ
//
// เครื่องเจ้าบ้านเป็นฝั่ง A (เลือกก่อน) · ผู้เข้าร่วมเป็นฝั่ง B
// ตาเดินเดินทางข้ามสายทีละก้าว และอาจมาถึงก่อนที่อีกฝั่งจะเปิดหน้าดราฟต์ด้วยซ้ำ
// เทสนี้จำลองทั้งกรณีปกติ กรณีที่อีกฝั่งเข้าช้า และกรณีกดตัวที่ถูกหยิบไปแล้ว
import { CHAMPIONS } from "./src/data/champions.js";
import {
  BAN_ORDER, PICK_ORDER, draftMove, draftPicksOf, draftTaken, draftTurn,
  makeDraftQueue, newDraft,
} from "./src/game/draft.js";

const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);
const IDS = Object.values(CHAMPIONS).map((c) => c.id);

// เครื่องหนึ่งเครื่อง — ถือดราฟต์ของตัวเอง กับคิวตาเดินที่มาถึงก่อนเวลา
function machine(side) {
  return {
    side,
    draft: null,
    queue: makeDraftQueue(),
    sent: [],
    // เปิดหน้าดราฟต์ แล้วลงตาที่ค้างคิวไว้ให้ครบ
    open(style) {
      this.draft = newDraft(style);
      this.drain();
    },
    apply(champId, side2) {
      const after = draftMove(this.draft, champId, side2, () => "");
      if (!after) return false;
      this.draft = after;
      return true;
    },
    drain() {
      return this.queue.drain((id, s) => this.apply(id, s));
    },
    // ตาเดินของเราเอง — ลงก่อน แล้วค่อยส่งออกสาย
    act(champId) {
      if (!this.apply(champId, this.side)) return false;
      this.sent.push(champId);
      return true;
    },
    recv(champId, side2) {
      this.queue.push(champId, side2);
      this.drain();
    },
  };
}

// เลือกตัวที่ยังว่างอยู่ตัวแรก (ตัดสินใจจากดราฟต์ของเครื่องนั้นเอง)
const freeOn = (m) => IDS.find((id) => !draftTaken(m.draft).includes(id));

function playMatch(style, lateOpen) {
  const A = machine("A");
  const B = machine("B");
  A.open(style);
  if (!lateOpen) B.open(style);

  let guard = 0;
  while (guard++ < 60) {
    const turn = draftTurn(A.draft) || draftTurn(B.draft);
    if (!turn) break;
    const mover = turn.side === "A" ? A : B;
    const other = turn.side === "A" ? B : A;
    // ฝั่งที่ยังไม่เปิดหน้าดราฟต์ก็เดินไม่ได้ ต้องรอ
    if (!mover.draft) { B.open(style); continue; }
    const id = freeOn(mover);
    mover.act(id);
    other.recv(id, mover.side);
    // ผู้เข้าร่วมเพิ่งเปิดหน้าจอกลางคัน — ตาที่ค้างต้องลงให้ครบเอง
    if (lateOpen && !B.draft && A.draft.picks.length + A.draft.bans.length >= 3) B.open(style);
  }
  return { A, B };
}

for (const style of ["DRAFT", "TOURNEY"]) {
  const { A, B } = playMatch(style, false);
  const sameBans = JSON.stringify(A.draft.bans) === JSON.stringify(B.draft.bans);
  const samePicks = JSON.stringify(A.draft.picks) === JSON.stringify(B.draft.picks);
  t(style + " — สองเครื่องเห็นดราฟต์ชุดเดียวกัน", sameBans && samePicks,
    A.draft.picks.map((p) => p.side + ":" + p.champId).join(" "));
  t(style + " — ได้ฝั่งละ 5 ตัว",
    draftPicksOf(A.draft, "A").length === 5 && draftPicksOf(A.draft, "B").length === 5,
    draftPicksOf(A.draft, "A").join("+") + " vs " + draftPicksOf(A.draft, "B").join("+"));
  const all = draftTaken(A.draft);
  t(style + " — ไม่มีตัวไหนถูกหยิบซ้ำสองฝั่ง", new Set(all).size === all.length, all.length + " ตัว");
  const wantBans = style === "TOURNEY" ? BAN_ORDER.length : 0;
  t(style + " — จำนวนแบนถูกตามกติกา", A.draft.bans.length === wantBans, A.draft.bans.length + "/" + wantBans);
  t(style + " — ลำดับตาเดินตรงกับ Snake",
    A.draft.picks.map((p) => p.side).join("") === PICK_ORDER.join(""),
    A.draft.picks.map((p) => p.side).join(""));
}

// ---- ผู้เข้าร่วมเปิดหน้าดราฟต์ช้า ตาที่เจ้าบ้านเดินไปแล้วต้องไม่หาย ----
{
  const { A, B } = playMatch("TOURNEY", true);
  t("เข้าช้า — ตาที่ค้างคิวลงครบ",
    JSON.stringify(A.draft.picks) === JSON.stringify(B.draft.picks) &&
    JSON.stringify(A.draft.bans) === JSON.stringify(B.draft.bans),
    "แบน " + B.draft.bans.length + " · เลือก " + B.draft.picks.length);
  t("เข้าช้า — คิวว่างเมื่อจบ", B.queue.size() === 0, String(B.queue.size()));
}

// ---- กดตัวที่ถูกหยิบไปแล้ว ต้องไม่ผ่านและไม่ส่งออกสาย ----
{
  const A = machine("A");
  A.open("DRAFT");
  const first = freeOn(A);
  A.act(first);
  const before = A.sent.length;
  const again = A.act(first);
  t("หยิบตัวที่ถูกเลือกไปแล้วไม่ได้", !again && A.sent.length === before, first);
}

// ---- ไม่ใช่ตาเรา กดไม่ได้ ----
{
  const A = machine("A");
  A.open("DRAFT");
  A.act(freeOn(A));                 // ตา A จบแล้ว ต่อไปเป็นตา B
  const stolen = A.act(freeOn(A));  // A พยายามเดินต่อทั้งที่ไม่ใช่ตาตัวเอง
  t("ไม่ใช่ตาเราเดินไม่ได้", !stolen, "ลงไปแล้ว " + A.draft.picks.length + " ตา");
}

// ---- ตาที่มาก่อนเวลาต้องค้างคิวไว้ ไม่ใช่หายไป ----
{
  const B = machine("B");
  B.open("DRAFT");
  B.recv("ELLA", "B");     // ตาแรกเป็นของ A ตานี้จึงยังลงไม่ได้
  t("ตาที่ยังไม่ถึงคิวไม่ถูกทิ้ง", B.queue.size() === 1 && B.draft.picks.length === 0,
    "ค้างคิว " + B.queue.size() + " ตา");
  B.recv("PUSS", "A");     // พอตาของ A มาถึง ตาที่ค้างต้องลงตามทันที
  t("พอถึงคิวแล้วลงต่อทันที", B.queue.size() === 0 && B.draft.picks.length === 2,
    B.draft.picks.map((p) => p.side + ":" + p.champId).join(" "));
}

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(42) + " " + d); }
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
