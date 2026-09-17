import { MONO, SANS } from "./theme.js";


// ---------------- shared effect renderer ----------------
export function drawFx(ctx, st, S) {
  for (const f of st.fx) {
    const life = f.dur || (f.kind === "num" ? 0.9 : f.kind === "label" ? 1.1 : 0.55);
    const age = (st.t - f.t) / life;
    if (age > 1) continue;
    const a = Math.max(0, 1 - age);
    const col = f.color || "255,208,138";
    if (f.kind === "ring") {
      ctx.globalAlpha = a;
      ctx.strokeStyle = `rgba(${col},0.95)`;
      ctx.lineWidth = 3;
      const rr = (f.r / S) * (f.grow ? 0.25 + age * 0.9 : 1);
      ctx.beginPath(); ctx.arc(f.x / S, f.y / S, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(${col},0.10)`; ctx.fill();
    } else if (f.kind === "flash") {
      ctx.globalAlpha = a;
      ctx.fillStyle = `rgba(${col},0.6)`;
      ctx.beginPath(); ctx.arc(f.x / S, f.y / S, (f.r / S) * (1 - age * 0.5), 0, Math.PI * 2); ctx.fill();
    } else if (f.kind === "beam" && f.x2 != null) {
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = `rgba(${col},0.95)`;
      ctx.lineWidth = Math.max(2, (f.w || 8) / S);
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(f.x / S, f.y / S); ctx.lineTo(f.x2 / S, f.y2 / S); ctx.stroke();
      ctx.lineCap = "butt";
    } else if (f.kind === "trail" && f.x2 != null) {
      ctx.globalAlpha = a * 0.8;
      const g = ctx.createLinearGradient(f.x / S, f.y / S, f.x2 / S, f.y2 / S);
      g.addColorStop(0, `rgba(${col},0)`);
      g.addColorStop(1, `rgba(${col},0.9)`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(f.x / S, f.y / S); ctx.lineTo(f.x2 / S, f.y2 / S); ctx.stroke();
    } else if (f.kind === "cone") {
      ctx.globalAlpha = a;
      ctx.fillStyle = `rgba(${col},0.16)`;
      ctx.strokeStyle = `rgba(${col},0.85)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(f.x / S, f.y / S);
      ctx.arc(f.x / S, f.y / S, f.r / S, f.ang - f.half, f.ang + f.half);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (f.kind === "aura") {
      const u = st.units.find((x) => x.id === f.id);
      if (u && u.alive) {
        ctx.globalAlpha = 0.35 + 0.35 * Math.abs(Math.sin(st.t * 6));
        ctx.strokeStyle = `rgba(${col},0.9)`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(u.x / S, u.y / S, f.r / S, 0, Math.PI * 2); ctx.stroke();
      }
    } else if (f.kind === "hit" || f.kind === "magic" || f.kind === "true") {
      const c2 = f.kind === "magic" ? "176,140,255" : f.kind === "true" ? "255,255,255" : "255,208,138";
      ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = `rgba(${c2},0.15)`;
      ctx.beginPath(); ctx.arc(f.x / S, f.y / S, (f.size / S) * (0.3 + age * 1.4), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(${c2},0.9)`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(f.x / S, f.y / S, (f.size / S) * (0.3 + age * 1.4), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}


export function drawFxText(ctx, st, S, big) {
  for (const f of st.fx) {
    if (f.kind !== "num" && f.kind !== "label") continue;
    const life = f.kind === "num" ? 0.9 : 1.1;
    const age = (st.t - f.t) / life;
    if (age > 1) continue;
    ctx.globalAlpha = Math.max(0, 1 - age);
    ctx.fillStyle = f.color || (f.kind === "num" ? "#FFD08A" : "#8CBEFF");
    ctx.font = f.kind === "num" ? `bold ${big ? 13 : 11}px ` + MONO : `bold ${big ? 12 : 10}px ` + SANS;
    ctx.textAlign = "center";
    ctx.fillText(f.text, f.x / S, f.y / S - age * (big ? 26 : 16));
    ctx.globalAlpha = 1;
  }
}
