// ---------------------------------------------------------------
// ภาพของกลไก Patch 0.3 — ยักษ์ กำแพง บ้านอิฐ พายุ วังวน และแอ่งน้ำ
//
// วาดก่อน drawFx เสมอ เพื่อให้แสงวาบกับตัวเลขดาเมจลอยอยู่ข้างบน
// ทุกอย่างอ่านจาก st.lore ที่ engine/lore.js เป็นคนเติม
// ---------------------------------------------------------------

const TEAM = (t) => (t === "blue" ? "126,199,255" : "255,150,155");

export function drawLore(ctx, st, S) {
  const lore = st.lore;
  if (!lore) return;
  const now = st.t;

  // ---- วังวนของ YODAKA — หมุนอยู่กับที่ ขอบเป็นเส้นโค้งไล่จาง
  for (const v of lore.vortex || []) {
    const x = v.x / S, y = v.y / S;
    const moving = v.left > 0;
    const r = (moving ? v.halfW : v.radius) / S;
    const spin = now * 7;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(126,199,255,0.30)");
    g.addColorStop(0.65, "rgba(126,199,255,0.13)");
    g.addColorStop(1, "rgba(126,199,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1.6;
    for (let a = 0; a < 3; a++) {
      const from = spin + (a * Math.PI * 2) / 3;
      ctx.strokeStyle = `rgba(190,225,255,${0.5 - a * 0.12})`;
      ctx.beginPath();
      ctx.arc(x, y, r * (0.45 + a * 0.22), from, from + 1.5);
      ctx.stroke();
    }
  }

  // ---- พายุสายฟ้าของ NIAN — เมฆดำคลุมพื้นที่ มีประกายวูบวาบ
  for (const s of lore.storms || []) {
    const x = s.x / S, y = s.y / S, r = s.r / S;
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, "rgba(40,60,110,0.34)");
    g.addColorStop(1, "rgba(40,60,110,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(126,199,255,.45)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([7, 9]);
    ctx.lineDashOffset = -now * 26;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ---- โซนที่อยู่กับที่ — ตะกร้าเสบียง (เขียว) กับบั้งไฟ (เหลือง)
  for (const z of lore.sights || []) {
    const x = z.x / S, y = z.y / S, r = z.r / S;
    const col = z.kind === "basket" ? "63,191,127" : "232,214,120";
    const left = Math.max(0, Math.min(1, (z.until - now) / 3));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${0.16 * (0.5 + left / 2)})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(${col},.42)`;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 7]);
    ctx.lineDashOffset = z.kind === "basket" ? now * 12 : -now * 20;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // จุดกลาง — ตะกร้าสาน / หัวบั้งไฟ
    ctx.fillStyle = `rgba(${col},.85)`;
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
  }

  // ---- วงเตือนก่อนสแลมลง (YODAKA R · TOTSAKAN R)
  for (const s of lore.slams || []) {
    if (now >= s.at) continue;
    const x = s.x != null ? s.x / S : null;
    const owner = st.units.find((u) => u.id === s.ownerId);
    const cx = x != null ? x : owner ? owner.x / S : null;
    const cy = s.y != null ? s.y / S : owner ? owner.y / S : null;
    if (cx == null || cy == null) continue;
    const r = s.radius / S;
    const k = 1 - Math.max(0, Math.min(1, (s.at - now) / 0.8));
    ctx.strokeStyle = `rgba(255,208,138,${0.25 + 0.45 * k})`;
    ctx.lineWidth = 1.5 + 2 * k;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(255,208,138,${0.05 + 0.09 * k})`;
    ctx.beginPath(); ctx.arc(cx, cy, r * (0.3 + 0.7 * k), 0, Math.PI * 2); ctx.fill();
  }

  // ---- กำแพงอิฐของ H.S.B — แท่งหนา มีหลอดเลือดของตัวเอง
  for (const w of lore.walls || []) {
    const ax = (w.x - w.nx * w.half) / S, ay = (w.y - w.ny * w.half) / S;
    const bx = (w.x + w.nx * w.half) / S, by = (w.y + w.ny * w.half) / S;
    const frac = Math.max(0, w.hp / w.maxHp);
    ctx.lineCap = "butt";
    ctx.strokeStyle = "rgba(20,14,10,.55)";
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = `rgba(${TEAM(w.team)},${0.35 + 0.45 * frac})`;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    // รอยต่ออิฐ
    ctx.strokeStyle = "rgba(255,236,190,.22)";
    ctx.lineWidth = 1;
    const n = 7;
    for (let i = 1; i < n; i++) {
      const px = ax + ((bx - ax) * i) / n, py = ay + ((by - ay) * i) / n;
      ctx.beginPath(); ctx.moveTo(px - w.ny * 3, py + w.nx * 3); ctx.lineTo(px + w.ny * 3, py - w.nx * 3); ctx.stroke();
    }
    // หลอดเลือดกำแพง
    ctx.strokeStyle = "rgba(0,0,0,.45)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ax, ay - 8); ctx.lineTo(bx, by - 8); ctx.stroke();
    ctx.strokeStyle = "rgba(232,163,61,.9)";
    ctx.beginPath();
    ctx.moveTo(ax, ay - 8);
    ctx.lineTo(ax + (bx - ax) * frac, ay - 8 + (by - ay) * frac);
    ctx.stroke();
    ctx.lineCap = "round";
  }

  // ---- บ้านอิฐของ H.S.B — วงล้อม มีหลอดเลือดเป็นส่วนโค้ง
  for (const b of lore.bunkers || []) {
    const x = b.x / S, y = b.y / S, r = b.r / S;
    const frac = Math.max(0, b.hp / b.maxHp);
    ctx.fillStyle = "rgba(232,163,61,.07)";
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(20,14,10,.6)";
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(232,163,61,.55)";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(255,236,190,.95)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.stroke();
  }

  // ---- ยักษ์สวรรค์ของ JACK
  for (const g of lore.pets || []) {
    const x = g.x / S, y = g.y / S, r = g.radius / S;
    const col = TEAM(g.team);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 2.1);
    glow.addColorStop(0, `rgba(${col},0.22)`);
    glow.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, r * 2.1, 0, Math.PI * 2); ctx.fill();
    // เงาใต้ตัว
    ctx.fillStyle = "rgba(0,0,0,.30)";
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.62, r * 0.95, r * 0.34, 0, 0, Math.PI * 2); ctx.fill();
    const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.15, x, y, r);
    body.addColorStop(0, "rgba(255,236,190,.98)");
    body.addColorStop(1, `rgba(${col},.85)`);
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,236,190,.75)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    // ป้ายและหลอดเลือดของยักษ์
    const frac = Math.max(0, g.hp / g.maxHp);
    ctx.fillStyle = "rgba(10,16,28,.85)";
    ctx.fillRect(x - r, y - r - 12, r * 2, 4);
    ctx.fillStyle = `rgba(${col},1)`;
    ctx.fillRect(x - r, y - r - 12, r * 2 * frac, 4);
    ctx.fillStyle = "rgba(255,236,190,.9)";
    ctx.font = "700 8px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("GIANT", x, y - r - 15);
    ctx.textAlign = "left";
  }
}
