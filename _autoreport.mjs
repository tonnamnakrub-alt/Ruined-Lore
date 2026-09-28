// ---------------------------------------------------------------
// อ่าน auto-sweep.json แล้วตอบคำถามเดียว:
// กดดาเมจออโต้ทั้งกระดานแล้วตารางอัตราชนะบีบเข้าหากันไหม
//
//   node _autoreport.mjs
// ---------------------------------------------------------------
import fs from "fs";

const S = JSON.parse(fs.readFileSync("auto-sweep.json", "utf8"));
const P = S.points;
const sd = (a) => {
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
};

console.log(`=== ตัวละ ${P[0].fightsEach} ไฟต์ · ค่าคลาดเคลื่อน ±${P[0].margin} ===\n`);
console.log("AUTO_DMG  ออโต้ได้สุทธิ  ส่วนเบี่ยงเบน  บน-ล่าง  ช่องว่าง9-10  เหนือ70%  ต่ำกว่า30%");
for (const p of P) {
  const w = p.rows.map((r) => r.wr);   // เรียงจากมากไปน้อยมาแล้วจาก _champwr.mjs
  console.log(
    String(p.auto).padEnd(10) +
    (Math.round(p.netOfAd * 100) + "% ของ AD").padStart(13) +
    sd(w).toFixed(1).padStart(14) +
    (w[0] - w[w.length - 1]).toFixed(1).padStart(9) +
    (w[8] - w[9]).toFixed(1).padStart(13) +
    String(w.filter((x) => x >= 70).length).padStart(10) +
    String(w.filter((x) => x < 30).length).padStart(11));
}

const map = P.map((p) => Object.fromEntries(p.rows.map((r) => [r.id, r])));
const order = P.find((p) => p.auto === 0.75).rows.map((r) => r.id);

console.log("\n=== อัตราชนะรายตัวตลอดเส้น ===\n");
console.log("ตัวละคร   " + P.map((p) => String(p.auto).padStart(8)).join("") + "     ต่าง");
for (const id of order) {
  const v = map.map((m) => m[id].wr);
  const d = v[v.length - 1] - v[0];
  console.log(id.padEnd(10) + v.map((x) => x.toFixed(1).padStart(8)).join("") +
    (d >= 0 ? "   +" : "   ") + d.toFixed(1));
}

console.log("\n=== เอนจินชดเชยตัวเองแค่ไหน (ค่าแรกของเส้น -> ค่าสุดท้าย) ===\n");
console.log("ตัวละคร    ออโต้            ดาเมจรวม");
const A = map[0], B = map[map.length - 1];
for (const id of order.slice(0, 10)) {
  const pc = (x, y) => (y === 0 ? "—" : (x > y ? "+" : "") + Math.round((100 * (x - y)) / y) + "%");
  console.log(id.padEnd(10) +
    (A[id].auto + " -> " + B[id].auto).padEnd(14) + pc(B[id].auto, A[id].auto).padStart(6) + "   " +
    (A[id].dmg + " -> " + B[id].dmg).padEnd(14) + pc(B[id].dmg, A[id].dmg).padStart(6));
}

const delta = order.map((id) => [id, B[id].wr - A[id].wr]).sort((a, b) => b[1] - a[1]);
console.log("\nได้มากสุด : " + delta.slice(0, 5).map(([i, d]) => i + " +" + d.toFixed(1)).join(" · "));
console.log("เสียมากสุด: " + delta.slice(-5).reverse().map(([i, d]) => i + " " + d.toFixed(1)).join(" · "));
