import { tr } from "../i18n.js";
import React from "react";
import { partLabel } from "../game/settle.js";
import { card } from "./chrome.jsx";
import { C, MONO } from "./theme.js";
import { Label } from "./widgets.jsx";

// ---------------------------------------------------------------
// ใบเสร็จเงินของยก — เงินและ XP ของแต่ละคนมาจากไหนบ้าง ทั้งสองฝั่ง
// ทุกบรรทัดรวมกันได้ยอดจริงพอดี (settle.js คุมไว้ และมีเทสตรวจ)
// ---------------------------------------------------------------
const sg = (n) => (n > 0 ? "+" + n : String(n));

function Side({ title, tone, rows, total }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: tone, letterSpacing: 1 }}>{title}</span>
        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 13, fontWeight: 800, color: tone }}>{total}g</span>
      </div>
      {rows.map((r) => (
        <div key={r.lane} style={{ marginBottom: 7, paddingBottom: 6, borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", gap: 6, fontFamily: MONO, fontSize: 11 }}>
            <span style={{ color: C.dim, width: 30 }}>{r.lane.slice(0, 3)}</span>
            <span style={{ color: C.ink, fontWeight: 700, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{r.champId}</span>
            <span style={{ color: C.gold, fontWeight: 800 }}>{sg(r.gold)}g</span>
            <span style={{ color: C.blue, width: 38, textAlign: "right" }}>{sg(r.xp)}xp</span>
          </div>
          {r.parts.filter((p) => p.gold || p.xp).map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 6, fontSize: 10.5, color: C.dim, paddingLeft: 36, lineHeight: 1.5 }}>
              <span style={{ flex: 1, minWidth: 0 }}>{partLabel(p)}</span>
              <span style={{ fontFamily: MONO, color: p.gold < 0 ? C.red : p.gold > 0 ? C.ink : C.line }}>{p.gold ? sg(p.gold) + "g" : ""}</span>
              <span style={{ fontFamily: MONO, width: 38, textAlign: "right", color: p.xp < 0 ? C.red : C.dim }}>{p.xp ? sg(p.xp) + "xp" : ""}</span>
            </div>
          ))}
          {r.bounty ? (
            <div style={{ fontSize: 10, color: C.gold, paddingLeft: 36, lineHeight: 1.5 }}>
              {tr("กระเป๋าตลาดมืด +{0} (ไม่นับตอนตัดสินยก)", r.bounty)}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function RoundReceipt({ breakdown, myGold, foeGold, wide, onRules }) {
  if (!breakdown) return null;
  return (
    <details open style={{ ...card(), marginBottom: 12, padding: 12 }}>
      <summary style={{ cursor: "pointer", listStyle: "none" }}>
        <Label style={{ display: "inline" }}>{tr("ใบเสร็จเงินยกนี้ — เงินแต่ละก้อนมาจากไหน")}</Label>
      </summary>
      <div style={{
        display: "grid", gap: 14, marginTop: 10,
        gridTemplateColumns: wide ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)",
      }}>
        <Side title={tr("ทีมคุณ")} tone={C.blue} rows={breakdown.me} total={myGold} />
        <Side title={tr("ฝ่ายตรงข้าม")} tone={C.red} rows={breakdown.foe} total={foeGold} />
      </div>
      {onRules ? (
        <button onClick={onRules}
          style={{
            marginTop: 6, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 6,
            color: C.gold, fontSize: 11.5, padding: "7px 10px", cursor: "pointer", width: "100%",
          }}>
          {tr("ดูกติกาเงินทั้งหมด")}
        </button>
      ) : null}
    </details>
  );
}
