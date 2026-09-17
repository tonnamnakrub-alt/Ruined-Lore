import { tr } from "../i18n.js";
import React, { useRef, useState } from "react";
import { ARENA_H, ARENA_W, DEPLOY, radiusOf } from "../data/constants.js";
import { CHAMPIONS } from "../data/champions.js";
import { C, MONO, SANS } from "./theme.js";
import { btn, mini } from "./chrome.jsx";


// ---------------- จัดทัพก่อนไฟต์ ----------------
// ลากตัวละครไปวางจุดยืนเริ่มไฟต์ได้เอง ภายในครึ่งสนามฝั่งเรา
// เก็บเป็นพิกัดหน่วยเกมจริง (ฝั่งแดงจะถูกสะท้อนกระจกตอน buildFight)
const VIEW_W = 520;
const VIEW_H = Math.round((VIEW_W * ARENA_H) / ARENA_W);
const K = ARENA_W / VIEW_W;               // หน่วยเกม -> พิกเซลบนแผนผัง

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ตำแหน่งตั้งต้นของเลน ตรงกับที่ build-fight.js ใช้ตอนไม่ได้วางเอง
export function defaultSpot(idx) {
  return { x: 330 + (idx % 2) * 100, y: ARENA_H * (0.16 + 0.17 * idx) };
}


export function FormationPanel({ team, setTeam, onClose }) {
  const boxRef = useRef(null);
  const [held, setHeld] = useState(null);

  const spotOf = (c, i) => c.spot || defaultSpot(i);

  const place = (i, px, py) => {
    const x = clamp(px * K, DEPLOY.xMin, DEPLOY.xMax);
    const y = clamp(py * K, DEPLOY.yMin, DEPLOY.yMax);
    setTeam((t) => t.map((c, j) => (j === i ? { ...c, spot: { x: Math.round(x), y: Math.round(y) } } : c)));
  };

  const fromEvent = (e) => {
    const r = boxRef.current.getBoundingClientRect();
    return { px: ((e.clientX - r.left) / r.width) * VIEW_W, py: ((e.clientY - r.top) / r.height) * VIEW_H };
  };

  const onDown = (i) => (e) => {
    e.stopPropagation();
    setHeld(i);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    if (held == null) return;
    const { px, py } = fromEvent(e);
    place(held, px, py);
  };
  const onUp = () => setHeld(null);

  const reset = () => setTeam((t) => t.map((c) => ({ ...c, spot: null })));

  // แถวเรียงหน้ากระดาน / ตั้งรับหลังแนว — ชุดสำเร็จรูปไว้กดทีเดียว
  const preset = (kind) => {
    setTeam((t) => t.map((c, i) => {
      const midY = ARENA_H / 2;
      const spread = 340;
      const off = (i - 2) * spread;
      const x = kind === "LINE" ? 1250
        : kind === "BACK" ? 420
          : (CHAMPIONS[c.champId] && CHAMPIONS[c.champId].melee ? 1300 : 620);
      return { ...c, spot: { x, y: Math.round(clamp(midY + off, DEPLOY.yMin, DEPLOY.yMax)) } };
    }));
  };

  const deployBox = {
    left: (DEPLOY.xMin / K), top: (DEPLOY.yMin / K),
    width: (DEPLOY.xMax - DEPLOY.xMin) / K, height: (DEPLOY.yMax - DEPLOY.yMin) / K,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#070C16", zIndex: 75,
      display: "flex", flexDirection: "column", fontFamily: SANS,
    }}>
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>{tr("จัดทัพ")}</div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
              {tr("ลากตัวละครไปวางจุดยืนตอนเริ่มไฟต์ — วางได้เฉพาะในกรอบฝั่งเรา")}
            </div>
          </div>
          <button onClick={onClose} style={{ ...mini(), marginLeft: "auto", width: 32, height: 28, fontSize: 16 }}>×</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div
            ref={boxRef}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            style={{
              position: "relative", width: "100%", aspectRatio: `${ARENA_W} / ${ARENA_H}`,
              background: "#0A1120", border: `1px solid ${C.line}`, borderRadius: 6,
              touchAction: "none", overflow: "hidden",
            }}
          >
            {/* เส้นกึ่งกลางสนาม */}
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "#22304C" }} />
            {/* กรอบวางตัวของฝั่งเรา */}
            <div style={{
              position: "absolute",
              left: `${(deployBox.left / VIEW_W) * 100}%`, top: `${(deployBox.top / VIEW_H) * 100}%`,
              width: `${(deployBox.width / VIEW_W) * 100}%`, height: `${(deployBox.height / VIEW_H) * 100}%`,
              border: `1px dashed ${C.blue}`, borderRadius: 4, background: "rgba(75,141,248,.06)",
            }} />
            <div style={{
              position: "absolute", right: 10, top: 8, fontFamily: MONO, fontSize: 10, color: "rgba(229,72,77,.75)",
            }}>{tr("ฝั่งศัตรู")}</div>

            {team.map((c, i) => {
              if (!c.champId) return null;
              const sp = spotOf(c, i);
              const ch = CHAMPIONS[c.champId];
              const r = radiusOf(ch) / K;
              return (
                <div
                  key={c.lane}
                  onPointerDown={onDown(i)}
                  style={{
                    position: "absolute",
                    left: `${(sp.x / ARENA_W) * 100}%`, top: `${(sp.y / ARENA_H) * 100}%`,
                    width: `${(r * 2 / VIEW_W) * 100}%`, aspectRatio: "1",
                    transform: "translate(-50%,-50%)",
                    borderRadius: "50%",
                    background: held === i ? C.gold : "rgba(75,141,248,.35)",
                    border: `2px solid ${held === i ? C.gold : C.blue}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: MONO, fontSize: 9, fontWeight: 800,
                    color: held === i ? "#0B1220" : C.ink,
                    cursor: "grab", touchAction: "none", userSelect: "none",
                  }}
                >{c.champId.slice(0, 2)}</div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <button onClick={() => preset("ROLE")} style={{ ...btn(C.panel2), flex: 1, fontSize: 11, padding: "7px 0" }}>{tr("ตั้งตามบทบาท")}</button>
            <button onClick={() => preset("LINE")} style={{ ...btn(C.panel2), flex: 1, fontSize: 11, padding: "7px 0" }}>{tr("ดันหน้ากระดาน")}</button>
            <button onClick={() => preset("BACK")} style={{ ...btn(C.panel2), flex: 1, fontSize: 11, padding: "7px 0" }}>{tr("ถอยตั้งรับ")}</button>
            <button onClick={reset} style={{ ...btn("transparent"), flex: 1, fontSize: 11, padding: "7px 0", color: C.dim, borderColor: C.line }}>{tr("คืนค่าเดิม")}</button>
          </div>

          <div style={{ marginTop: 12 }}>
            {team.map((c, i) => {
              if (!c.champId) return null;
              const sp = spotOf(c, i);
              return (
                <div key={c.lane} style={{
                  display: "flex", alignItems: "center", gap: 8, fontSize: 11.5,
                  padding: "5px 0", borderBottom: `1px solid ${C.line}`,
                }}>
                  <span style={{ fontFamily: MONO, color: C.blue, fontWeight: 800, width: 74 }}>{c.champId}</span>
                  <span style={{ color: C.dim, width: 66 }}>{c.lane}</span>
                  <span style={{ fontFamily: MONO, color: c.spot ? C.gold : C.dim, marginLeft: "auto" }}>
                    {c.spot ? `${sp.x}, ${sp.y}` : tr("ตำแหน่งเริ่มต้น")}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 10.5, color: C.dim, marginTop: 10, lineHeight: 1.6 }}>
            {tr("จุดยืนนี้ใช้ทุกยกจนกว่าจะเปลี่ยน · ฝั่งศัตรูวางตัวสะท้อนกระจกกับของเรา")}
          </div>

          <button onClick={onClose} style={{ ...btn(C.gold), color: "#0B1220", fontWeight: 800, marginTop: 12 }}>
            {tr("เสร็จแล้ว")}
          </button>
        </div>
      </div>
    </div>
  );
}
