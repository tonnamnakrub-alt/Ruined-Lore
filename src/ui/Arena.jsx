import { tr } from "../i18n.js";
import React, { useRef, useEffect, useState } from "react";
import { ARENA_H, ARENA_W, RENDER_SCALE } from "../data/constants.js";
import { drawFx, drawFxText, drawGround, shakeAmount } from "./draw-fx.js";
import { drawLore } from "./draw-lore.js";
import { C, MONO } from "./theme.js";


// ---------------- Arena ----------------
export function Arena({ stateRef, tick, focusId, showRanges, drawRef }) {
  const canvasRef = useRef(null);
  // ซูมดูระหว่างไฟต์ — ลากเพื่อเลื่อนดู หรือปล่อยให้กล้องตามการปะทะเอง
  // ไฟต์เลนมีคนน้อย ถ้ายืนดูทั้งสนามจะเห็นแค่จุดเล็กๆ กลางที่ว่าง เลยซูมให้ตั้งแต่แรก
  const [zoom, setZoom] = useState(() => {
    const st = stateRef.current;
    const n = st && st.units ? st.units.length : 10;
    if (n <= 2) return 3;
    if (n <= 4) return 2;
    if (n <= 6) return 1.5;
    return 1;
  });
  const cam = useRef({ x: ARENA_W / 2, y: ARENA_H / 2, manual: false });
  const drag = useRef(null);

  const draw = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const st = stateRef.current;
    const S = RENDER_SCALE;
    const W = ARENA_W / S, H = ARENA_H / S;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#070C16";
    ctx.fillRect(0, 0, W, H);

    // กล้องสะบัดตอนโดนหนัก — คำนวณจากแรงปะทะที่เพิ่งเกิด แล้วเลื่อนทั้งฉาก
    // ใช้เฟสจากนาฬิกาไฟต์ ไม่ใช่ Math.random() ภาพจะได้ไม่กระตุกมั่วตอนหยุดดู
    const sh = st ? shakeAmount(st) : 0;
    let shx = 0, shy = 0;
    if (sh > 0.05) {
      shx = Math.sin(st.t * 61) * sh;
      shy = Math.cos(st.t * 83) * sh;
    }

    // กล้อง: ไม่ซูมก็เห็นทั้งสนามเหมือนเดิม ซูมแล้วเลื่อนตามจุดที่สนใจ
    const z = zoom;
    if (z !== 1) {
      const c = cam.current;
      if (!c.manual) {
        const live = st ? st.units.filter((u) => u.alive) : [];
        const foc = focusId && st ? st.units.find((u) => u.id === focusId && u.alive) : null;
        if (foc) { c.x = foc.x; c.y = foc.y; }
        else if (live.length) {
          c.x = live.reduce((a2, u) => a2 + u.x, 0) / live.length;
          c.y = live.reduce((a2, u) => a2 + u.y, 0) / live.length;
        }
      }
      const halfW = (W / z) / 2, halfH = (H / z) / 2;
      const cx = Math.max(halfW, Math.min(W - halfW, c.x / S));
      const cy = Math.max(halfH, Math.min(H - halfH, c.y / S));
      ctx.setTransform(z, 0, 0, z, -(cx - halfW) * z + shx, -(cy - halfH) * z + shy);
    } else if (shx || shy) {
      ctx.setTransform(1, 0, 0, 1, shx, shy);
    }

    // พื้นสนาม — ไล่เฉดจากกลางออกขอบ ให้กลางสนามเด่นกว่ามุม
    const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.62);
    bg.addColorStop(0, "#101A2E");
    bg.addColorStop(1, "#080E1A");
    ctx.fillStyle = bg;
    ctx.fillRect(-4, -4, W + 8, H + 8);
    // ตารางสองชั้น — เส้นย่อยจางๆ กับเส้นหลักทุก 1000 หน่วย ช่วยกะระยะได้แม่นขึ้น
    ctx.strokeStyle = "rgba(26,38,60,.85)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 200 / S) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y <= H; y += 200 / S) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    ctx.strokeStyle = "rgba(40,56,86,.7)";
    ctx.beginPath();
    for (let x = 0; x <= W; x += 1000 / S) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y <= H; y += 1000 / S) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    // เส้นกึ่งกลางสนาม
    ctx.strokeStyle = "rgba(60,84,126,.85)";
    ctx.lineWidth = 1.5;
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

    drawGround(ctx, st, S);
    drawLore(ctx, st, S);
    drawFx(ctx, st, S);
    for (const p of st.projectiles) {
      const skill = !!p.skill;
      const core = p.team === "blue"
        ? (skill ? "140,190,255" : "75,141,248")
        : (skill ? "255,150,155" : "229,72,77");
      const px = p.x / S, py = p.y / S;
      const tail = skill ? 170 : 100;
      const tx = (p.x - p.dx * tail) / S, ty = (p.y - p.dy * tail) / S;
      const wide = skill ? Math.max(2.5, (p.width || 90) / S / 2) : 2;
      ctx.lineCap = "round";
      // หางฟุ้งกว้างๆ ชั้นหนึ่งก่อน ให้ลูกกระสุนมีแสงรอบตัว
      const gGlow = ctx.createLinearGradient(px, py, tx, ty);
      gGlow.addColorStop(0, `rgba(${core},0.30)`);
      gGlow.addColorStop(1, `rgba(${core},0)`);
      ctx.strokeStyle = gGlow;
      ctx.lineWidth = wide * 2.8;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tx, ty); ctx.stroke();
      // หางหลัก
      const grad = ctx.createLinearGradient(px, py, tx, ty);
      grad.addColorStop(0, `rgba(${core},1)`);
      grad.addColorStop(1, `rgba(${core},0)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = wide;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tx, ty); ctx.stroke();
      // แกนขาวบางๆ ตรงกลางหาง ทำให้เส้นวิถีคมและตามตาได้ง่าย
      const gHot = ctx.createLinearGradient(px, py, (p.x - p.dx * tail * 0.5) / S, (p.y - p.dy * tail * 0.5) / S);
      gHot.addColorStop(0, "rgba(255,255,255,0.85)");
      gHot.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = gHot;
      ctx.lineWidth = Math.max(1, wide * 0.4);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo((p.x - p.dx * tail * 0.5) / S, (p.y - p.dy * tail * 0.5) / S);
      ctx.stroke();
      // หัวกระสุนสว่างกว่าหาง จะได้เห็นว่ามันวิ่งไปทางไหน
      const hr = skill ? Math.max(3, (p.width || 90) / S / 2.4) : 2.4;
      const gh = ctx.createRadialGradient(px, py, 0, px, py, hr * 2.4);
      gh.addColorStop(0, "rgba(255,255,255,0.95)");
      gh.addColorStop(0.4, `rgba(${core},0.8)`);
      gh.addColorStop(1, `rgba(${core},0)`);
      ctx.fillStyle = gh;
      ctx.beginPath(); ctx.arc(px, py, hr * 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.95)";
      ctx.beginPath(); ctx.arc(px, py, hr * 0.75, 0, Math.PI * 2); ctx.fill();
      ctx.lineCap = "butt";
    }

    for (const u of st.units) {
      // โดนเหวี่ยงหรือถูกยกลอย — วาดเงาไว้ที่พื้นแล้วยกตัวขึ้นเป็นส่วนโค้ง
      let lift = 0;
      if (u.alive && u.hurl) {
        const k = Math.max(0, Math.min(1, (st.t - u.hurl.start) / Math.max(0.001, u.hurl.until - u.hurl.start)));
        lift = Math.sin(k * Math.PI) * 46;
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "#05080F";
        ctx.beginPath();
        ctx.ellipse(u.x / S, u.y / S, (u.radius / S) * 1.2, (u.radius / S) * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // เส้นทางที่ลอยไป
        ctx.strokeStyle = "rgba(232,163,61,.55)";
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(u.hurl.fx / S, u.hurl.fy / S);
        ctx.lineTo(u.hurl.tx / S, u.hurl.ty / S);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = "rgba(232,163,61,.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(u.hurl.tx / S, u.hurl.ty / S, 10 + 4 * Math.sin(st.t * 10), 0, Math.PI * 2);
        ctx.stroke();
      }
      const x = u.x / S, y = u.y / S - lift;
      let r = (u.radius / S) * 1.35;
      if (lift) r *= 1.12;
      // squash on the attack windup, and a quick flash when freshly hit
      if (u.atkLock > 0) r *= 1 + 0.12 * (u.atkLock * u.asEff);
      const hitAge = st.t - (u.lastHitAt || -9);
      const col = u.team === "blue" ? C.blue : C.red;
      const rgb = u.team === "blue" ? "75,141,248" : "229,72,77";

      if (!u.alive) {
        // จังหวะล้ม — จำเวลาตายไว้ที่ตัวยูนิตเอง (แบบเดียวกับ hpGhost ที่ทำอยู่แล้ว)
        // เอนจินไม่ได้บันทึกเวลาตายไว้ และนี่เป็นข้อมูลสำหรับวาดภาพล้วนๆ
        if (u._deathAt == null) u._deathAt = st.t;
        // ไฟต์จบแล้วนาฬิกาหยุดเดิน ถ้าคนสุดท้ายตายพอดีจังหวะนั้นจะค้างครึ่งท่า — บังคับให้เล่นจบ
        const k = st.over ? 1 : Math.min(1, (st.t - u._deathAt) / 0.75);
        const e = 1 - Math.pow(1 - k, 3);
        if (k < 1) {
          // วงแตกออกตอนล้ม
          ctx.globalAlpha = (1 - e) * 0.9;
          ctx.strokeStyle = `rgba(${rgb},1)`;
          ctx.lineWidth = 3 * (1 - e) + 0.5;
          ctx.beginPath(); ctx.arc(x, y, r * (1 + e * 1.6), 0, Math.PI * 2); ctx.stroke();
          // ตัวยุบแบนลงกับพื้นแล้วจาง
          ctx.globalAlpha = 1 - e;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.ellipse(x, y + r * e * 0.5, r * (1 - e * 0.35), r * (1 - e * 0.8), 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        // หมุดศพ — จางๆ ให้รู้ว่าใครล้มตรงไหน แต่ไม่แย่งสายตาจากคนที่ยังสู้อยู่
        ctx.globalAlpha = 0.55 + 0.45 * e;
        ctx.fillStyle = "#26314A";
        ctx.beginPath(); ctx.arc(x, y, r * 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(90,104,140,.8)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - r * 0.26, y - r * 0.26); ctx.lineTo(x + r * 0.26, y + r * 0.26);
        ctx.moveTo(x + r * 0.26, y - r * 0.26); ctx.lineTo(x - r * 0.26, y + r * 0.26);
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      u._deathAt = null;

      // เงาใต้ตัว — ตัวละครจะได้ดูวางอยู่บนพื้น ไม่ใช่ลอยอยู่เฉยๆ
      if (!lift) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = "#04070E";
        ctx.beginPath();
        ctx.ellipse(x, y + r * 0.72, r * 0.92, r * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // เงาไหลตามตอนวิ่งเร็ว — อ่านทิศทางการเคลื่อนที่ได้จากภาพนิ่ง
      const spd = Math.hypot(u.svx || 0, u.svy || 0);
      if (spd > 60) {
        const smear = Math.min(1, (spd - 60) / 340);
        for (let i = 1; i <= 3; i++) {
          const back = (i * 9 * smear * (u.dashing ? 2.2 : 1));
          ctx.globalAlpha = 0.16 * smear * (1 - i / 4);
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(x - ((u.svx || 0) / spd) * back, y - ((u.svy || 0) / spd) * back, r * (1 - i * 0.12), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
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
      if (u.silenced || u.disarmed) {
        // โดนสาป/ใบ้ — วงประสีชมพูหมุนรอบตัว
        ctx.strokeStyle = "rgba(255,143,208,.95)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.arc(x, y, r + 8, st.t * 3, st.t * 3 + Math.PI * 1.6); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (u.weave && u.weave.list && u.weave.list.length > 0) {
        // ภูษาของเคลเดอร์ — ขีดรอบตัวเท่าจำนวนชั้น สีตามชนิดที่ทอไว้
        const n = u.weave.list.length;
        for (let i = 0; i < n; i++) {
          const ang = (i / u.champ.weave.max) * Math.PI * 2 - Math.PI / 2;
          ctx.strokeStyle = u.weave.list[i] === "ap" ? "rgba(176,140,255,.95)" : "rgba(232,163,61,.95)";
          ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(x, y, r + 6, ang, ang + 0.22); ctx.stroke();
        }
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
      // เด้งตอนเพิ่งกินดาเมจ — ใช้รัศมีแยกจาก r เพื่อไม่ให้หลอดเลือดกับวงสถานะขยับตาม
      const punch = hitAge < 0.14 ? (1 - hitAge / 0.14) : 0;
      const br = r * (1 + punch * 0.16);
      // ไล่เฉดในตัว ให้ดูเป็นก้อนกลมมีแสงตกกระทบ ไม่ใช่วงกลมแบนๆ
      const gb = ctx.createRadialGradient(x - br * 0.35, y - br * 0.4, br * 0.1, x, y, br);
      gb.addColorStop(0, u.team === "blue" ? "#8FBAFF" : "#FF9498");
      gb.addColorStop(0.55, col);
      gb.addColorStop(1, u.team === "blue" ? "#23508F" : "#8E2327");
      ctx.fillStyle = gb;
      ctx.beginPath(); ctx.arc(x, y, br, 0, Math.PI * 2); ctx.fill();
      // ขอบสว่างด้านบน ช่วยแยกตัวออกจากพื้นมืด
      ctx.strokeStyle = `rgba(${rgb},.9)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y, br - 0.6, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.35)";
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(x, y, br - 1.2, Math.PI * 1.15, Math.PI * 1.9); ctx.stroke();
      // วาบขาวทับตอนโดน
      if (punch > 0) {
        ctx.globalAlpha = (stealth ? 0.35 : 1) * punch * 0.85;
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath(); ctx.arc(x, y, br, 0, Math.PI * 2); ctx.fill();
      }
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

  // ลากบนสนามเพื่อเลื่อนมุมมองเอง (เฉพาะตอนซูม) — ปล่อยแล้วยังค้างที่เดิมจนกดตามการปะทะ
  const onDown = (e) => {
    if (zoom === 1) return;
    const r = canvasRef.current.getBoundingClientRect();
    drag.current = { x: e.clientX, y: e.clientY, sx: cam.current.x, sy: cam.current.y, k: (ARENA_W / RENDER_SCALE) / r.width };
    cam.current.manual = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    cam.current.x = d.sx - (e.clientX - d.x) * d.k * RENDER_SCALE / zoom;
    cam.current.y = d.sy - (e.clientY - d.y) * d.k * RENDER_SCALE / zoom;
    draw();
  };
  const onUp = () => { drag.current = null; };

  const zBtn = (v, label) => (
    <button
      key={label}
      onClick={() => { setZoom(v); cam.current.manual = false; }}
      style={{
        flex: 1, background: zoom === v ? C.gold : C.panel2, color: zoom === v ? "#0B1220" : C.ink,
        border: `1px solid ${C.line}`, borderRadius: 6, padding: "5px 0",
        fontFamily: MONO, fontSize: 11, cursor: "pointer", fontWeight: zoom === v ? 800 : 400,
      }}
    >{label}</button>
  );

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={Math.round(ARENA_W / RENDER_SCALE)}
        height={Math.round(ARENA_H / RENDER_SCALE)}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          width: "100%", height: "auto", display: "block", borderRadius: 6,
          border: `1px solid ${C.line}`, touchAction: "none",
          cursor: zoom === 1 ? "default" : (drag.current ? "grabbing" : "grab"),
        }}
      />
      <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, letterSpacing: 1 }}>ZOOM</span>
        {[[1, "1×"], [1.5, "1.5×"], [2, "2×"], [3, "3×"]].map(([v, l]) => zBtn(v, l))}
        <button
          onClick={() => { cam.current.manual = false; draw(); }}
          disabled={zoom === 1}
          style={{
            flex: 1.4, background: "transparent", color: zoom === 1 ? "#2A3752" : C.blue,
            border: `1px solid ${C.line}`, borderRadius: 6, padding: "5px 0",
            fontSize: 10.5, cursor: zoom === 1 ? "default" : "pointer",
          }}
        >{tr("ตามการปะทะ")}</button>
      </div>
    </div>
  );
}
