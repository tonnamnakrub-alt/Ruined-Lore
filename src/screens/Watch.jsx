import { tr } from "../i18n.js";
import React from "react";
import { Shell, btn, card } from "../ui/chrome.jsx";
import { Label } from "../ui/widgets.jsx";
import { C, MONO } from "../ui/theme.js";


// ---------------- หน้ารอของเจ้าบ้านที่นั่งดู ----------------
// เจ้าบ้านไม่ได้ลงเล่น ไม่มีร้านค้า ไม่มีการเลือกตัว — รอผู้เล่นสองคนกดพร้อมแล้วดูไฟต์
export function WatchScreen(ctx) {
  const { score, mode, round, net, netReset, setPhase, result } = ctx;
  const waiting = net.joined.filter(Boolean).length;

  return (
    <Shell round={round} score={score} mode={mode} title={tr("โหมดคนดู")}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{tr("คุณเป็นเจ้าบ้าน (คนดู)")}</div>
        <div style={{ fontSize: 12, color: C.dim, marginTop: 5, lineHeight: 1.65, maxWidth: 460 }}>
          {tr("เครื่องคุณเป็นคนรันไฟต์ให้ทั้งสองฝ่าย คุณจึงเห็นทุกอย่างเหมือนกรรมการข้างสนาม — แต่ไม่ได้ลงเล่นเอง")}
        </div>
      </div>

      <div style={{ ...card(), padding: 14, marginBottom: 10 }}>
        <Label style={{ marginBottom: 8 }}>{tr("สถานะผู้เล่น")}</Label>
        {[0, 1].map((i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 0", borderBottom: i === 0 ? `1px solid ${C.line}` : "none",
          }}>
            <span style={{ fontFamily: MONO, fontSize: 12, color: i === 0 ? C.blue : C.red, fontWeight: 800, width: 96 }}>
              {i === 0 ? tr("ผู้เล่นฝั่งน้ำเงิน") : tr("ผู้เล่นฝั่งแดง")}
            </span>
            <span style={{ fontSize: 12, color: net.joined[i] ? C.green : C.dim }}>
              {net.joined[i] ? tr("ต่อสายแล้ว") : tr("ยังไม่ได้ต่อ")}
            </span>
          </div>
        ))}
      </div>

      <div style={{
        ...card(), padding: 16, textAlign: "center",
        borderColor: waiting === 2 ? C.gold : C.line,
      }}>
        <div style={{ fontFamily: MONO, fontSize: 13, color: waiting === 2 ? C.gold : C.dim }}>
          {waiting === 2 ? tr("รอทั้งสองฝ่ายกดพร้อมสู้…") : tr("รอผู้เล่นต่อสายให้ครบ…")}
        </div>
        <div style={{ fontSize: 11, color: C.dim, marginTop: 7, lineHeight: 1.6 }}>
          {tr("พอทั้งคู่กดพร้อม ไฟต์จะเริ่มบนจอนี้อัตโนมัติ")}
        </div>
      </div>

      {result ? (
        <div style={{ ...card(), padding: 12, marginTop: 10 }}>
          <Label style={{ marginBottom: 6 }}>{tr("ยกที่แล้ว")}</Label>
          <div style={{ fontFamily: MONO, fontSize: 12, color: C.ink }}>
            {result.iWon ? tr("ฝั่งน้ำเงินชนะ") : tr("ฝั่งแดงชนะ")}
            <span style={{ color: C.dim, marginLeft: 8 }}>{result.time.toFixed(1)}s</span>
          </div>
        </div>
      ) : null}

      <button onClick={() => { netReset(); setPhase("MENU"); }}
        style={{ ...btn("transparent"), marginTop: 12, fontSize: 11.5, padding: "8px 0", color: C.dim, borderColor: C.line }}>
        {tr("ออกจากห้อง")}
      </button>
    </Shell>
  );
}
