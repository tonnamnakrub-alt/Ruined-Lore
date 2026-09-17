import React, { useRef, useEffect } from "react";
import { ARENA_H, ARENA_W, RENDER_SCALE } from "../data/constants.js";
import { drawFx, drawFxText } from "./draw-fx.js";
import { C, MONO } from "./theme.js";


// ---------------- Arena ----------------
export function Arena({ stateRef, tick, focusId, showRanges, drawRef }) {
  const canvasRef = useRef(null);

  const draw = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const st = stateRef.current;
    const S = RENDER_SCALE;
    const W = ARENA_W / S, H = ARENA_H / S;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "#0A1120";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#182238";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 200 / S) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 200 / S) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.strokeStyle = "#22304C";
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();

    if (!st) return;

    // attack range rings — the main thing that makes the fight legible
    if (showRanges) {
      for (const u of st.units) {
        if (!u.alive) continue;
        if (focusId && u.id !== focusId) continue;
        ctx.strokeStyle = u.team === "blue" ? "rgba(75,141,248,.30)" : "rgba(229,72,77,.28)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(u.x / S, u.y / S, u.range / S, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // who is shooting whom
    for (const u of st.units) {
      if (!u.alive || !u.targetId) continue;
      if (focusId && u.id !== focusId) continue;
      const t = st.units.find((x) => x.id === u.targetId);
      if (!t || !t.alive) continue;
      ctx.strokeStyle = u.team === "blue" ? "rgba(75,141,248,.22)" : "rgba(229,72,77,.20)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(u.x / S, u.y / S); ctx.lineTo(t.x / S, t.y / S); ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const z of st.zones) {
      const left = Math.max(0, z.at - st.t);
      ctx.strokeStyle = "rgba(232,163,61,.8)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(z.x / S, z.y / S, z.r / S, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(232,163,61,${0.05 + 0.2 * (1 - left)})`;
      ctx.fill();
    }
    drawFx(ctx, st, S);
    for (const f of st.fields || []) {
      ctx.save();
      ctx.translate(f.x / S, f.y / S);
      ctx.rotate(Math.atan2(f.ny, f.nx));
      ctx.fillStyle = "rgba(75,141,248,.15)";
      ctx.fillRect(-f.halfLen / S, -f.halfW / S, (f.halfLen * 2) / S, (f.halfW * 2) / S);
      ctx.restore();
    }
    for (const w of st.waves || []) {
      ctx.save();
      ctx.translate(w.x / S, w.y / S);
      ctx.rotate(Math.atan2(w.ny, w.nx));
      ctx.fillStyle = "rgba(120,190,255,.55)";
      ctx.fillRect(-5, -w.halfW / S, 10, (w.halfW * 2) / S);
      ctx.restore();
    }
    for (const cg of st.cages || []) {
      const pending = st.t < cg.at;
      ctx.strokeStyle = pending ? "rgba(232,163,61,.45)" : "rgba(228,235,247,.85)";
      ctx.lineWidth = pending ? 1.5 : Math.max(2, cg.thick / S);
      ctx.setLineDash(pending ? [5, 5] : []);
      ctx.beginPath(); ctx.arc(cg.x / S, cg.y / S, cg.r / S, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      if (!pending) {
        ctx.fillStyle = "rgba(228,235,247,.9)";
        ctx.font = "bold 10px " + MONO;
        ctx.textAlign = "center";
        ctx.fillText(String(cg.hp), cg.x / S, (cg.y - cg.r) / S - 12);
      }
    }
    for (const tr of st.traps || []) {
      ctx.strokeStyle = "rgba(232,163,61,.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(tr.x / S, tr.y / S, tr.r / S, 0, Math.PI * 2); ctx.stroke();
    }
    for (const p of st.projectiles) {
      const skill = !!p.skill;
      ctx.strokeStyle = p.team === "blue"
        ? (skill ? "rgba(140,190,255,1)" : "rgba(75,141,248,.8)")
        : (skill ? "rgba(255,150,155,1)" : "rgba(229,72,77,.8)");
      const tail = skill ? 150 : 90;
      const grad = ctx.createLinearGradient(p.x / S, p.y / S, (p.x - p.dx * tail) / S, (p.y - p.dy * tail) / S);
      grad.addColorStop(0, ctx.strokeStyle);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.strokeStyle = grad;
      ctx.lineCap = "round";
      ctx.lineWidth = skill ? Math.max(2.5, (p.width || 90) / S / 2) : 2;
      ctx.beginPath();
      ctx.moveTo(p.x / S, p.y / S);
      ctx.lineTo((p.x - p.dx * tail) / S, (p.y - p.dy * tail) / S);
      ctx.stroke();
      ctx.lineCap = "butt";
    }

    for (const u of st.units) {
      const x = u.x / S, y = u.y / S;
      let r = (u.radius / S) * 1.35;
      // squash on the attack windup, and a quick flash when freshly hit
      if (u.atkLock > 0) r *= 1 + 0.12 * (u.atkLock * u.asEff);
      const hitAge = st.t - (u.lastHitAt || -9);
      if (!u.alive) {
        ctx.fillStyle = "#26314A";
        ctx.beginPath(); ctx.arc(x, y, r * 0.4, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      const col = u.team === "blue" ? C.blue : C.red;
      const stealth = u.buffs && u.buffs.some((b) => b.type === "stealth");
      if (u.retreating) {
        ctx.strokeStyle = "rgba(232,163,61,.75)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke();
      }
      if (u.shield > 0) {
        ctx.strokeStyle = "rgba(228,235,247,.9)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, Math.PI * 2); ctx.stroke();
      }
      if (u.rooted) {
        ctx.strokeStyle = "rgba(229,72,77,.9)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.stroke();
      }
      if (u.dashing) {
        ctx.strokeStyle = u.team === "blue" ? "rgba(140,190,255,.9)" : "rgba(255,150,155,.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - (u.dashing.dx * 180) / S, y - (u.dashing.dy * 180) / S);
        ctx.stroke();
      }
      if (u.charging && !u.charging.snipe) {
        const held = Math.min(1, (st.t - u.charging.start) / (u.charging.skill.fullCharge || 2));
        ctx.strokeStyle = "rgba(232,163,61,.95)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * held);
        ctx.stroke();
      }
      if (u.castLock > 0) {
        ctx.strokeStyle = "rgba(176,140,255,.95)";
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(x, y, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, u.castLock / 0.3)); ctx.stroke();
      } else if (u.atkLock > 0) {
        ctx.strokeStyle = "rgba(255,208,138,.8)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke();
      }
      if (focusId === u.id) {
        ctx.strokeStyle = C.gold;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, r + 7, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = stealth ? 0.35 : 1;
      ctx.fillStyle = hitAge < 0.12 ? "#FFFFFF" : col;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#0B1220";
      ctx.font = "bold 13px " + MONO;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(u.champ.id[0], x, y + 1);

      const w = 40;
      const frac = u.hp / u.maxHp;
      if (u.hpGhost == null || u.hpGhost < frac) u.hpGhost = frac;
      else u.hpGhost += (frac - u.hpGhost) * 0.08;
      ctx.fillStyle = "#0A101C";
      ctx.fillRect(x - w / 2, y - r - 12, w, 3.5);
      ctx.fillStyle = "rgba(229,72,77,.75)";
      ctx.fillRect(x - w / 2, y - r - 12, w * u.hpGhost, 3.5);
      ctx.fillStyle = frac > 0.35 ? C.green : C.gold;
      ctx.fillRect(x - w / 2, y - r - 12, w * frac, 3.5);
      if (u.shield > 0) {
        ctx.fillStyle = "rgba(228,235,247,.9)";
        ctx.fillRect(x - w / 2, y - r - 15.5, w * Math.min(1, u.shield / u.maxHp), 2.5);
      }
    }
    drawFxText(ctx, st, S, false);
  };
  useEffect(() => { if (drawRef) drawRef.current = draw; draw(); });

  return (
    <canvas
      ref={canvasRef}
      width={Math.round(ARENA_W / RENDER_SCALE)}
      height={Math.round(ARENA_H / RENDER_SCALE)}
      style={{ width: "100%", height: "auto", display: "block", borderRadius: 6, border: `1px solid ${C.line}` }}
    />
  );
}
