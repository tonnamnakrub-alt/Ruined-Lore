// ---------------------------------------------------------------
// เพิ่ม "ซื้อตามที่แนะนำ" ให้ร้านค้าฝั่งผู้เล่น
//
// ทำไมต้องมี: shopFor มีอยู่แล้วแต่ถูกเรียกจาก foeShop เท่านั้น (App.jsx:467)
// ฝั่งผู้เล่นต้องกดซื้อเองทุกชิ้น ซึ่งนอกจากจะเหนื่อยแล้วยังทำให้
// วัดบาลานซ์ผ่านการเล่นจริงไม่ได้เลย — ฝั่งเราไม่มีทางออกของทันบอท
//
// และปุ่ม "ซื้อตามแผน" ที่มีอยู่ใช้ไม่ได้ในยกต้นเกม เพราะแผนเรียงของแพงสุดขึ้นก่อน
// ชิ้นแรกราคา 60-64g แต่ยกแรกมีเงิน 10g ปุ่มจึงขึ้น "เงินไม่พอ" ตลอด
// ตัวนี้แก้ทั้งสองเรื่อง เพราะ shopFor ไล่เก็บชิ้นส่วนตามลำดับที่ควรเก็บเอง
//
// ปุ่มที่เพิ่ม: รายคน (ในการ์ดของแต่ละคน) และทั้งทีม (ปุ่มเดียวซื้อให้ครบห้าคน)
// ย้อนกลับได้ด้วยปุ่ม undo เดิม เพราะบันทึกสถานะก่อนซื้อเข้า buyUndo เหมือน buy()
// ---------------------------------------------------------------
import fs from "fs";

const edits = {
  // ---- ตรรกะ: เรียก shopFor ให้ฝั่งเราเหมือนที่ฝั่งศัตรูได้
  "src/App.jsx": [
    [`  // PUSS — โค้ชสั่งเองว่ายกนี้จะไปท้าดวลเลนไหนของอีกฝั่ง`,
      `  // ---- ซื้อตามที่แนะนำ — ใช้ตรรกะเดียวกับที่ฝั่งศัตรูใช้ (shopFor)
  // noise 0 เพราะผู้เล่นกดเองแล้ว ไม่ต้องใส่ความลังเลแบบบอท
  // shopFor ซื้อให้ในตัวโดยเคารพเงินและช่องของ คืนตัวละครที่ของเพิ่มแล้ว
  function autoBuy(idx) {
    const live = (liveRef.current && liveRef.current.team ? liveRef.current.team : team);
    const before = live[idx];
    if (!before || !before.champId) return;
    const after = shopFor(before, foe, rand, 0);
    if ((after.items || []).length === (before.items || []).length) return;   // ซื้ออะไรไม่ได้เลย
    setBuyUndo((u) => [
      ...u.slice(-19),
      { idx, gold: before.gold, items: [...(before.items || [])], favs: [...(favs[idx] || [])],
        name: tr("ซื้อตามที่แนะนำ") },
    ]);
    setTeam((t) => t.map((c, i) => (i === idx ? after : c)));
  }

  // ซื้อให้ครบทั้งทีมในครั้งเดียว — คิดทีละคนต่อเนื่องกัน
  // เก็บสถานะก่อนซื้อของทุกคนไว้เป็นก้อนเดียว กด undo ครั้งเดียวย้อนได้ทั้งทีม
  function autoBuyTeam() {
    const live = (liveRef.current && liveRef.current.team ? liveRef.current.team : team);
    const snapshot = live.map((c, i) => ({
      idx: i, gold: c.gold, items: [...(c.items || [])], favs: [...(favs[i] || [])],
    }));
    const next = live.map((c) => (c.champId ? shopFor(c, foe, rand, 0) : c));
    const bought = next.reduce((a, c, i) => a + ((c.items || []).length - (live[i].items || []).length), 0);
    if (!bought) return;
    setBuyUndo((u) => [...u.slice(-19), { team: snapshot, name: tr("ซื้อตามที่แนะนำทั้งทีม") }]);
    setTeam(next);
  }

  // PUSS — โค้ชสั่งเองว่ายกนี้จะไปท้าดวลเลนไหนของอีกฝั่ง`],

    // ---- undo ต้องรู้จักก้อนที่ย้อนทั้งทีม
    [`  function undoBuy() {`,
      `  function undoBuy() {
    // ก้อนจากปุ่มซื้อทั้งทีมเก็บสถานะของทุกคนไว้ ย้อนทีเดียวพร้อมกัน
    const top = buyUndo[buyUndo.length - 1];
    if (top && top.team) {
      setTeam((t) => t.map((c, i) => {
        const s = top.team.find((x) => x.idx === i);
        return s ? { ...c, gold: s.gold, items: [...s.items] } : c;
      }));
      setFavs((f) => {
        const n = { ...f };
        for (const s of top.team) n[s.idx] = [...s.favs];
        return n;
      });
      setBuyUndo((u) => u.slice(0, -1));
      return;
    }`],

    // ---- ส่งฟังก์ชันเข้า ctx ให้หน้าร้านเรียกได้
    [`    rand, ready, resetRanks, restartMatch, result, rollAll,`,
      `    autoBuy, autoBuyTeam, rand, ready, resetRanks, restartMatch, result, rollAll,`],
  ],

  // ---- ปุ่มในหน้าร้าน
  "src/screens/Shop.jsx": [
    [`  const { net, netReadyUp, formOpen, setFormOpen, addRank, buy, foe,`,
      `  const { autoBuy, autoBuyTeam, net, netReadyUp, formOpen, setFormOpen, addRank, buy, foe,`],

    // ปุ่มรายคน วางคู่กับปุ่ม "อัตโนมัติ" ของสกิล จะได้อยู่ที่เดียวกัน
    [`                    <button onClick={() => resetRanks(idx)}
                      style={{ marginLeft: "auto", ...mini(), width: "auto", padding: "0 8px", fontSize: 10 }}>{tr("อัตโนมัติ")}</button>`,
      `                    <button onClick={() => resetRanks(idx)}
                      style={{ marginLeft: "auto", ...mini(), width: "auto", padding: "0 8px", fontSize: 10 }}>{tr("อัตโนมัติ")}</button>
                    <button onClick={() => autoBuy(idx)}
                      style={{ ...mini(), width: "auto", padding: "0 8px", fontSize: 10, color: C.green }}>
                      {tr("ซื้อให้")}
                    </button>`],
  ],
};

let n = 0;
for (const [file, list] of Object.entries(edits)) {
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  let s = crlf ? raw.replace(/\r\n/g, "\n") : raw;
  for (const [from, to] of list) {
    const hits = s.split(from).length - 1;
    if (hits !== 1) throw new Error(file + " :: เจอ " + hits + " ที่ (ต้องเจอ 1) :: " + from.slice(0, 60));
    s = s.replace(from, to);
    n++;
  }
  fs.writeFileSync(file, crlf ? s.replace(/\n/g, "\r\n") : s);
}
console.log("แก้ " + n + " จุด");
