// ---------------------------------------------------------------
// เพิ่ม "แนะนำนิสัยเลน" ให้ฝั่งผู้เล่น
//
// รูปแบบเดียวกับที่เจอในร้านค้า: ฝั่งศัตรูมี botStances กับ botJungle คิดให้
// ฝั่งผู้เล่นต้องเลือกเองทุกเลนทุกยก ซึ่งเป็นเกมเศรษฐกิจทั้งเกม
// (ตารางนิสัยเลนเป็นตัวตัดสินรายได้ ไม่ใช่ดาเมจในไฟต์)
//
// วัดผ่านการเล่นจริงรอบที่แล้วฝั่งเราขึ้น "Standard" ทุกเลนทุกยก
// ขณะที่บอทสลับ Safe/Aggressive ตามสถานการณ์ — เสียเปรียบตั้งแต่ยังไม่ปะทะ
// ---------------------------------------------------------------
import fs from "fs";

const edits = {
  "src/App.jsx": [
    // ---- ตรรกะ: ใช้ botStances ด้วย skill 1 (คิดเต็มที่ ไม่สุ่มทิ้ง)
    [`  // ---- ซื้อตามที่แนะนำ — ใช้ตรรกะเดียวกับที่ฝั่งศัตรูใช้ (shopFor)`,
      `  // ---- แนะนำนิสัยเลน — ใช้ตรรกะเดียวกับที่ฝั่งศัตรูใช้ (botStances/botJungle)
  // skill = 1 คือคิดเต็มที่ทุกเลน ไม่มีท่อนสุ่มทิ้งแบบที่บอทระดับง่ายมี
  function autoStances() {
    const next = botStances(rand, team, foe, 1, round);
    setStances(next);
    const j = botJungle(rand, team, foe, next, lastStances, 1, round);
    setJungle(j && j.lane ? j : { lane: null, crew: [] });
  }

  // ---- ซื้อตามที่แนะนำ — ใช้ตรรกะเดียวกับที่ฝั่งศัตรูใช้ (shopFor)`],

    [`    autoBuy, autoBuyTeam, rand, ready, resetRanks, restartMatch, result, rollAll,`,
      `    autoBuy, autoBuyTeam, autoStances, rand, ready, resetRanks, restartMatch, result, rollAll,`],
  ],

  "src/screens/Shop.jsx": [
    [`  const { autoBuy, autoBuyTeam, net, netReadyUp, formOpen, setFormOpen, addRank, buy, foe,`,
      `  const { autoBuy, autoBuyTeam, autoStances, net, netReadyUp, formOpen, setFormOpen, addRank, buy, foe,`],

    // วางคู่กับปุ่มซื้อทั้งทีม เหนือปุ่มออกไปสู้
    [`        <button onClick={() => autoBuyTeam()}`,
      `        <button onClick={() => autoStances()}
          style={{ ...btn(C.panel2), color: C.blue, border: \`1px solid \${C.line}\`,
            fontSize: 12.5, padding: "9px 4px", marginBottom: 7 }}>
          {tr("แนะนำนิสัยเลนและป่า")}
        </button>

        <button onClick={() => autoBuyTeam()}`],
  ],
};

let n = 0;
for (const [file, list] of Object.entries(edits)) {
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  let s = crlf ? raw.replace(/\r\n/g, "\n") : raw;
  for (const [from, to] of list) {
    const hits = s.split(from).length - 1;
    if (hits !== 1) throw new Error(file + " :: เจอ " + hits + " ที่ :: " + from.slice(0, 60));
    s = s.replace(from, to);
    n++;
  }
  fs.writeFileSync(file, crlf ? s.replace(/\n/g, "\r\n") : s);
}
console.log("แก้ " + n + " จุด");
