import React from "react";
import { tr } from "../i18n.js";
import { C, MONO, SANS } from "./theme.js";

// ---------------------------------------------------------------
// ชิ้นส่วนหน้าตาแบบ "ตารางซ้าย + รายละเอียดขวา" ตามสเก็ตช์
// จอกว้างแสดงสองฝั่ง จอแคบสลับเป็นตารางบน/รายละเอียดล่าง
// ---------------------------------------------------------------

export function TwoPane({ wide, left, right, leftWidth = "1fr", rightWidth = "1.15fr" }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: wide ? `${leftWidth} ${rightWidth}` : "1fr",
        gap: 10,
        alignItems: "start",
      }}
    >
      <div>{left}</div>
      <div style={wide ? { position: "sticky", top: 10 } : undefined}>{right}</div>
    </div>
  );
}

export function Panel({ children, style }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: 12, ...style }}>
      {children}
    </div>
  );
}

export function Tabs({ items, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 4, marginBottom: 8 }}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button key={it.id} onClick={() => onChange(it.id)}
            style={{
              flex: "0 0 auto", background: on ? C.gold : C.panel2, color: on ? "#0B1220" : C.ink,
              border: `1px solid ${on ? C.gold : C.line}`, borderTopLeftRadius: 6, borderTopRightRadius: 6,
              borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
              padding: "7px 11px", fontSize: 12, fontWeight: on ? 800 : 400,
              cursor: "pointer", fontFamily: SANS, whiteSpace: "nowrap",
            }}>
            {tr(it.th)}
          </button>
        );
      })}
    </div>
  );
}

// ตารางกล่องสี่เหลี่ยมแบบในสเก็ตช์
export function TileGrid({ children, min = 78 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap: 6 }}>
      {children}
    </div>
  );
}

export function Tile({ title, sub, badge, selected, locked, tone, onClick }) {
  const accent = tone || C.gold;
  return (
    <button onClick={onClick} disabled={!onClick}
      style={{
        position: "relative", textAlign: "left", cursor: onClick ? "pointer" : "default",
        background: selected ? "#1B2A3F" : locked ? "#101827" : C.panel2,
        border: `1px solid ${selected ? accent : C.line}`,
        borderRadius: 8, padding: "8px 8px 9px", minHeight: 62,
        fontFamily: SANS, color: C.ink, width: "100%",
        opacity: locked ? 0.55 : 1,
        backgroundImage: locked
          ? "repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 4px, transparent 4px 9px)"
          : "none",
      }}>
      {badge != null && (
        <span style={{
          position: "absolute", top: 5, right: 5, minWidth: 16, height: 16, borderRadius: 8,
          background: accent, color: "#0B1220", fontFamily: MONO, fontSize: 10, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
        }}>{badge}</span>
      )}
      <div style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: selected ? accent : C.ink, lineHeight: 1.25 }}>
        {title}
      </div>
      {sub ? <div style={{ fontSize: 9.5, color: C.dim, marginTop: 3, lineHeight: 1.35 }}>{sub}</div> : null}
    </button>
  );
}

// กล่องรูปตัวละคร — ยังไม่มีอาร์ตเวิร์ก ใช้อักษรย่อไปก่อน
export function Portrait({ text, size = 62, tone }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0, borderRadius: 8,
      background: "#0E1626", border: `1px solid ${tone || C.line}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: MONO, fontSize: size * 0.34, fontWeight: 800, color: tone || C.dim,
    }}>
      {text}
    </div>
  );
}

export function InfoRow({ k, v, tone }) {
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 11, padding: "3px 0", borderBottom: `1px solid #17203300` }}>
      <span style={{ color: C.dim, minWidth: 76 }}>{k}</span>
      <span style={{ color: tone || C.ink, fontFamily: MONO, flex: 1, textAlign: "right" }}>{v}</span>
    </div>
  );
}

export function Empty({ children }) {
  return (
    <div style={{
      border: `1px dashed ${C.line}`, borderRadius: 10, padding: "40px 16px",
      textAlign: "center", color: C.dim, fontSize: 12, fontFamily: SANS,
    }}>
      {children}
    </div>
  );
}

// ปุ่มเมนูใหญ่ของหน้าแรก
export function MenuButton({ title, sub, tone, disabled, onClick }) {
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{
        width: "100%", textAlign: "left", background: disabled ? "#121A2A" : C.panel,
        border: `1px solid ${disabled ? "#1E2942" : tone || C.line}`, borderRadius: 10,
        padding: "14px 14px", cursor: disabled ? "default" : "pointer", fontFamily: SANS,
        opacity: disabled ? 0.55 : 1, marginBottom: 8,
      }}>
      <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1, color: disabled ? C.dim : tone || C.ink }}>
        {title}
      </div>
      {sub ? <div style={{ fontSize: 11, color: C.dim, marginTop: 3, lineHeight: 1.5 }}>{sub}</div> : null}
    </button>
  );
}
