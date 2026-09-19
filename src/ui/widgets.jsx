import React from "react";
import { C } from "./theme.js";


// shield = โล่ที่เหลืออยู่ — ต่อท้ายหลอดเลือดเป็นแถบขาว เพราะเดิมมีโล่แล้วหลอดไม่เปลี่ยนอะไรเลย
// ผู้เล่นเลยงงว่าทำไมตีแล้วเลือดไม่ลด · ส่วนเกินที่ล้นหลอดถูกตัดให้พอดีขอบ
export function Bar({ value, max, color, height = 6, shield = 0 }) {
  const hp = Math.max(0, Math.min(100, (value / max) * 100));
  const sh = Math.max(0, Math.min(100 - hp, (shield / max) * 100));
  return (
    <div style={{ background: "#0A101C", borderRadius: 2, height, overflow: "hidden", display: "flex" }}>
      <div style={{ width: `${hp}%`, background: color, height: "100%" }} />
      {sh > 0 && <div style={{ width: `${sh}%`, background: "#E4EBF7", opacity: 0.85, height: "100%" }} />}
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
