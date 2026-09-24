import { tr } from "../i18n.js";
import React from "react";
import { STANCES, STANCE_LIST, laneOutcome } from "../data/behaviour.js";
import { C, MONO } from "./theme.js";

// ---------------------------------------------------------------
// ตารางนิสัยเลนเจอกัน — ใช้ทั้งในร้านค้า (ตอนกำลังสั่ง) และหน้า ECONOMY
// ตัวเลขทุกตัวคิดสดจาก laneOutcome() ไม่ได้พิมพ์ซ้ำ ปรับกติกาแล้วตารางเปลี่ยนตาม
// ---------------------------------------------------------------
const TONE = { SAFE: C.blue, NEUTRAL: C.dim, AGGRO: C.red };
const sg = (n) => (n > 0 ? "+" + n : String(n));

export function StanceChip({ s, big }) {
  return (
    <span style={{
      fontFamily: MONO, fontSize: big ? 11 : 10, fontWeight: 800, color: TONE[s],
      border: `1px solid ${TONE[s]}`, borderRadius: 4, padding: big ? "2px 6px" : "1px 4px",
      whiteSpace: "nowrap",
    }}>{tr(STANCES[s].th)}</span>
  );
}

// แถวเดียว: เราเลือก a เจอเขาเลือก b แล้วเกิดอะไร — อ่านเป็นประโยคเลย
export function StanceRow({ a, b }) {
  const o = laneOutcome(a, b);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6, padding: "5px 0",
      borderTop: `1px solid ${C.line}`, fontSize: 11, flexWrap: "wrap",
    }}>
      <StanceChip s={a} />
      <span style={{ color: C.line, fontSize: 10 }}>{tr("เจอ")}</span>
      <StanceChip s={b} />
      <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10.5, textAlign: "right" }}>
        {o.fight ? (
          <span style={{ color: C.red, fontWeight: 800 }}>{tr("ไฟต์ — ได้ 0 ทั้งคู่ เหลือแต่เงินศพ")}</span>
        ) : (
          <>
            <span style={{ color: C.gold, fontWeight: 800 }}>{tr("เรา")} {sg(o.me.gold)}g</span>
            <span style={{ color: C.line }}> · </span>
            <span style={{ color: C.dim }}>{tr("เขา")} {sg(o.foe.gold)}g</span>
          </>
        )}
      </span>
    </div>
  );
}

// ตารางเต็ม 3×3 — แถวคือของเรา คอลัมน์คือของเขา
export function StanceMatrix() {
  const cell = (a, b) => {
    const o = laneOutcome(a, b);
    if (o.fight) {
      return (
        <div>
          <div style={{ color: C.red, fontWeight: 800 }}>{o.aggroDuel ? tr("ไฟต์แตก") : tr("บังคับไฟต์")}</div>
          <div style={{ color: C.dim, fontSize: 10 }}>{tr("ไม่มีรายได้ฐาน · เหลือแค่ศพ")}</div>
        </div>
      );
    }
    return (
      <div>
        <div style={{ color: C.gold }}>{tr("เรา")} {sg(o.me.gold)}g {sg(o.me.xp)}xp</div>
        <div style={{ color: C.dim }}>{tr("เขา")} {sg(o.foe.gold)}g {sg(o.foe.xp)}xp</div>
      </div>
    );
  };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontFamily: MONO, fontSize: 10.5, minWidth: 420 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "4px 6px", color: C.dim, fontWeight: 400 }}>{tr("เรา \\ เขา")}</th>
            {STANCE_LIST.map((b) => (
              <th key={b} style={{ textAlign: "left", padding: "4px 6px" }}><StanceChip s={b} big /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STANCE_LIST.map((a) => (
            <tr key={a} style={{ borderTop: `1px solid ${C.line}` }}>
              <td style={{ padding: "6px 6px", verticalAlign: "top" }}><StanceChip s={a} big /></td>
              {STANCE_LIST.map((b) => (
                <td key={b} style={{ padding: "6px 6px", verticalAlign: "top", lineHeight: 1.5 }}>{cell(a, b)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// แบบย่อสำหรับหน้าร้านค้า — พับเก็บได้ เปิดอ่านตอนกำลังจะสั่ง
export function StanceHelp() {
  const pairs = [];
  for (const a of STANCE_LIST) for (const b of STANCE_LIST) pairs.push([a, b]);
  return (
    <details style={{ marginTop: 6 }}>
      <summary style={{ cursor: "pointer", fontSize: 10.5, color: C.gold, listStyle: "none" }}>
        {tr("▸ ตารางนิสัย — อันไหนชนะอันไหน")}
      </summary>
      <div style={{ marginTop: 4 }}>
        {pairs.map(([a, b]) => <StanceRow key={a + b} a={a} b={b} />)}
        <div style={{ fontSize: 10, color: C.dim, marginTop: 6, lineHeight: 1.6 }}>
          {tr("ตัวเลขคือเงินต่อคนในเลนนั้น · รุกล้ำได้เยอะสุดแต่เจอเซฟแล้วล้ำเก้อ · เซฟได้น้อยสุดแต่ไม่มีทางเสีย")}
        </div>
      </div>
    </details>
  );
}
