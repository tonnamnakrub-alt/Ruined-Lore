import { itemName, tr } from "../i18n.js";
import { streakTag } from "../game/streak.js";
import { itemDesc, itemStatChips } from "./item-desc.js";
import { LATEST_PATCH } from "../data/patches.js";
import React from "react";
import { C, MONO, SANS } from "./theme.js";


export function Shell({ children, round, score, mode, streak, onBack, title, maxWidth = 620 }) {
  const total = mode ? mode.rounds : 30;
  const decider = mode ? mode.maxRounds : 31;
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: SANS, padding: "14px 12px 40px" }}>
      <div style={{ maxWidth, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            {onBack && (
              <button onClick={onBack}
                style={{
                  background: C.panel2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 6,
                  width: 30, height: 28, cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 0, flexShrink: 0,
                }}>‹</button>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: C.gold, fontWeight: 800 }}>RUINED LORE</div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {title || "PROTOTYPE v" + LATEST_PATCH.id}
              </div>
            </div>
          </div>
          {!round ? (
            <div style={{ textAlign: "right", fontSize: 9, color: mode && mode.id === "RUSH" ? C.gold : C.dim, letterSpacing: 1 }}>
              {mode ? (mode.id === "RUSH" ? "RUSH " + mode.rounds : "LONG " + mode.rounds) : ""}
            </div>
          ) : (
          <div style={{ textAlign: "right", fontFamily: MONO }}>
            <div style={{ fontSize: 18 }}>
              <span style={{ color: C.blue }}>{score.me}</span>
              <span style={{ color: C.dim }}> – </span>
              <span style={{ color: C.red }}>{score.foe}</span>
            </div>
            <div style={{ fontSize: 10, color: round === decider ? C.gold : C.dim }}>
              {!round ? "SETUP" : round === decider ? tr("ยกตัดสิน") : tr("ยก {0}/{1}", round, total)}
            </div>
            {mode && <div style={{ fontSize: 9, color: mode.id === "RUSH" ? C.gold : C.dim, letterSpacing: 1 }}>{mode.id === "RUSH" ? "RUSH" : "LONG"}</div>}
            {streak && streakTag(streak.me) && (
              <div style={{ fontSize: 9, marginTop: 2, color: streak.me > 0 ? C.gold : C.blue, letterSpacing: 1 }}>
                {streakTag(streak.me)}
              </div>
            )}
          </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}


export function card() {
  return { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: 12 };
}

export function btn(bg) {
  return {
    background: bg, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 6,
    padding: "10px 12px", width: "100%", cursor: "pointer", fontFamily: SANS, fontSize: 13,
  };
}

export function mini() {
  return {
    background: C.panel2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 4,
    width: 26, height: 24, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0,
  };
}

export function slot(filled) {
  return {
    flex: "1 1 30%", minWidth: 72, height: 26, borderRadius: 4,
    border: `1px solid ${filled ? C.line : "#1E2942"}`,
    background: filled ? C.panel2 : "#0E1626",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 9.5, color: filled ? C.ink : "#33415F",
  };
}


// ---------------------------------------------------------------
// ช่องเก็บของหนึ่งช่อง — ชื่อไอเทมบรรทัดบน ค่าสถานะย่อบรรทัดล่าง
// เดิมช่องโชว์แค่ชื่อ ต้องเอาเมาส์ไปจิ้มถึงจะรู้ว่าให้อะไร (บนมือถือคือไม่รู้เลย)
// ใช้ร่วมกันทั้งหน้าเตรียมยก ร้านค้า และหน้าส่องทีมคู่แข่ง จะได้หน้าตาเหมือนกันหมด
// ---------------------------------------------------------------
export function ItemSlot({ item, empty, onClick, dashed }) {
  const chips = itemStatChips(item);
  const filled = !!item;
  return (
    <div
      onClick={item && onClick ? () => onClick(item) : undefined}
      title={item ? itemName(item) + " · " + item.cost + "g\n" + itemDesc(item) : ""}
      style={{
        flex: "1 1 30%", minWidth: 86, minHeight: 38, borderRadius: 5, padding: "4px 6px",
        border: `1px solid ${filled ? C.line : "#1E2942"}`,
        borderStyle: dashed ? "dashed" : "solid",
        background: filled ? C.panel2 : "#0E1626",
        display: "flex", flexDirection: "column", justifyContent: "center", gap: 2,
        cursor: item && onClick ? "pointer" : "default", overflow: "hidden",
      }}
    >
      <div style={{
        fontSize: 9.5, fontWeight: filled ? 700 : 400, color: filled ? C.ink : "#33415F",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2,
      }}>
        {filled ? itemName(item) : (empty || "")}
      </div>
      {filled && chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 5px", lineHeight: 1.15 }}>
          {chips.slice(0, 4).map((s, i) => (
            <span key={i} style={{ fontSize: 8.5, fontFamily: MONO, color: s.color }}>{s.text}</span>
          ))}
        </div>
      )}
    </div>
  );
}
