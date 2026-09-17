import React from "react";
import { C } from "./theme.js";


export function Bar({ value, max, color, height = 6 }) {
  return (
    <div style={{ background: "#0A101C", borderRadius: 2, height, overflow: "hidden" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color, height: "100%" }} />
    </div>
  );
}


export function Pip({ n, cap = 10, color }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: cap }).map((_, i) => (
        <div key={i} style={{ width: 6, height: 10, borderRadius: 1, background: i < n ? color : "#25314A" }} />
      ))}
    </div>
  );
}


export function Label({ children, style }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: 1.4, color: C.dim, fontWeight: 700, ...style }}>{children}</div>
  );
}
