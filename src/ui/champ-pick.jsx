import { tr } from "../i18n.js";
import React from "react";
import { CHAMPIONS, lanesOf } from "../data/champions.js";
import { LANES } from "../data/constants.js";
import { C, MONO, SANS } from "./theme.js";

// ---------------------------------------------------------------
// แถบค้นหาและกรองตำแหน่ง — ใช้ร่วมกันทั้งหน้า PICK และหน้าดราฟต์
//
// ตอนมีตัวละคร 12 ตัว ตารางเดียวยังไล่สายตาไหว
// พอขึ้นเป็น 22 ตัวแล้วหาตัวที่อยากได้ยากมาก เลยต้องมีทั้งค้นหาและแยกตำแหน่ง
// ---------------------------------------------------------------

export const LANE_FILTERS = ["ALL", ...LANES];

const LANE_LABEL = {
  ALL: "ทั้งหมด", TOP: "ท็อป", JUNGLE: "ป่า", MID: "มิด", ADC: "เอดีซี", SUPPORT: "ซัพพอร์ต",
};


// ค้นได้ทั้งรหัส ชื่อไทย บทบาท เลน และคำว่าประชิด/ระยะไกล
export function matchChamp(c, q) {
  if (!q) return true;
  const needle = String(q).trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    c.id, tr(c.th), c.role, tr(c.role), lanesOf(c).join(" "),
    c.melee ? "melee ประชิด" : "ranged ระยะไกล",
    c.passive ? c.passive.th : "",
  ].join(" ").toLowerCase();
  return needle.split(/\s+/).every((w) => hay.includes(w));
}


// กรองตามคำค้นและตำแหน่ง
export function filterChamps(q, lane) {
  return Object.values(CHAMPIONS)
    .filter((c) => matchChamp(c, q))
    .filter((c) => lane === "ALL" || lanesOf(c).includes(lane));
}


// แบ่งเป็นกลุ่มตามตำแหน่ง — ตัวที่ลงได้หลายเลนจะโผล่ในทุกเลนที่มันลงได้
export function groupByLane(list) {
  return LANES.map((lane) => ({
    lane,
    list: list.filter((c) => lanesOf(c).includes(lane)),
  })).filter((g) => g.list.length);
}


export function ChampFilterBar({ query, setQuery, lane, setLane, count }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 110 }}>
          <input
            value={query || ""}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("ค้นหาตัวละคร เช่น ป่า, assassin, ระยะไกล")}
            style={{
              width: "100%", boxSizing: "border-box",
              background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 999,
              padding: "7px 28px 7px 12px", fontSize: 11.5, color: C.ink,
              fontFamily: SANS, outline: "none",
            }}
          />
          {query ? (
            <button onClick={() => setQuery("")}
              style={{
                position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: C.dim, cursor: "pointer",
                fontSize: 14, lineHeight: 1, padding: "2px 6px",
              }}>×</button>
          ) : null}
        </div>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim, minWidth: 34, textAlign: "right" }}>
          {count}
        </span>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {LANE_FILTERS.map((L) => (
          <button key={L} onClick={() => setLane(L)}
            style={{
              background: lane === L ? C.gold : C.panel2,
              color: lane === L ? "#0B1220" : C.dim,
              border: `1px solid ${C.line}`, borderRadius: 999,
              padding: "5px 10px", fontSize: 10.5, cursor: "pointer",
              fontFamily: SANS, fontWeight: lane === L ? 800 : 400,
            }}>{tr(LANE_LABEL[L])}</button>
        ))}
      </div>
    </div>
  );
}


// หัวข้อกลุ่มตำแหน่ง
export function LaneHeading({ lane, n }) {
  // ในภาษาอังกฤษคำแปลกับรหัสเลนเป็นคำเดียวกัน (TOP Top) เลยไม่ต้องเขียนซ้ำ
  const label = tr(LANE_LABEL[lane]);
  const dup = label.toUpperCase() === lane;
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 7, margin: "10px 0 5px" }}>
      <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: 1.4, color: C.gold, fontWeight: 800 }}>
        {lane}
      </span>
      {dup ? null : <span style={{ fontSize: 10, color: C.dim }}>{label}</span>}
      <span style={{ flex: 1, height: 1, background: C.line }} />
      <span style={{ fontFamily: MONO, fontSize: 10, color: C.line }}>{n}</span>
    </div>
  );
}
