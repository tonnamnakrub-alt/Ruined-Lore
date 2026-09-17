import { tr } from "../i18n.js";
import React from "react";
import { Shell, btn, card } from "../ui/chrome.jsx";
import { Label } from "../ui/widgets.jsx";
import { C, MONO, SANS } from "../ui/theme.js";


// ---------------- ห้องออนไลน์ ----------------
// จับคู่ด้วยการแลกโค้ดสองก้อน ไม่ต้องมีเซิร์ฟเวอร์
//   คนสร้างห้อง: กดสร้าง -> ได้โค้ด A -> ส่งให้เพื่อน -> รอโค้ด B มาวาง
//   คนเข้าห้อง:  วางโค้ด A -> ได้โค้ด B -> ส่งกลับ -> รอ
export function OnlineScreen(ctx) {
  const {
    score, mode, setPhase, net, netStart, netStartWatch, netJoin, netAccept,
    netAcceptSlot, netReset, netBegin, netStartRoom, netJoinRoom, netSetLink,
    netPaste: paste, setNetPaste: setPaste, netPaste2: paste2, setNetPaste2: setPaste2,
    netBusy: busy,
  } = ctx;

  const st = net.stage;   // idle | hosting | joining | ready
  const copy = (txt) => { try { navigator.clipboard.writeText(txt); } catch { /* ไม่มีคลิปบอร์ดก็เลือกเอาเอง */ } };

  const codeBox = (label, code, hint) => (
    <div style={{ ...card(), marginBottom: 10, padding: 11 }}>
      <Label style={{ color: C.gold, marginBottom: 5 }}>{label}</Label>
      <textarea
        readOnly
        value={code}
        onFocus={(e) => e.target.select()}
        style={{
          width: "100%", height: 74, boxSizing: "border-box", resize: "none",
          background: "#070C16", border: `1px solid ${C.line}`, borderRadius: 5,
          color: C.dim, fontFamily: MONO, fontSize: 9.5, padding: 7, wordBreak: "break-all",
        }}
      />
      <button onClick={() => copy(code)}
        style={{ ...btn(C.panel2), marginTop: 6, fontSize: 11.5, padding: "7px 0", color: C.blue }}>
        {tr("คัดลอกโค้ด")}
      </button>
      <div style={{ fontSize: 10.5, color: C.dim, marginTop: 6, lineHeight: 1.55 }}>{hint}</div>
    </div>
  );

  const pasteBox = (label, action, hint, val, setVal) => (
    <div style={{ ...card(), marginBottom: 10, padding: 11 }}>
      <Label style={{ marginBottom: 5 }}>{label}</Label>
      <textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={tr("วางโค้ดที่เพื่อนส่งมาตรงนี้")}
        style={{
          width: "100%", height: 74, boxSizing: "border-box", resize: "none",
          background: "#070C16", border: `1px solid ${C.line}`, borderRadius: 5,
          color: C.ink, fontFamily: MONO, fontSize: 9.5, padding: 7, outline: "none",
        }}
      />
      <button disabled={busy || !val.trim()}
        onClick={() => action(val.trim())}
        style={{
          ...btn(val.trim() ? C.gold : C.panel2), marginTop: 6, fontSize: 12, fontWeight: 800,
          padding: "8px 0", color: val.trim() ? "#0B1220" : C.dim,
          cursor: val.trim() ? "pointer" : "default",
        }}>
        {busy ? tr("กำลังต่อ…") : tr("ยืนยันโค้ด")}
      </button>
      <div style={{ fontSize: 10.5, color: C.dim, marginTop: 6, lineHeight: 1.55 }}>{hint}</div>
    </div>
  );


  // ---- โหมดรหัสห้องสั้นๆ ----
  const bigCode = (code, hint) => (
    <div style={{ ...card(), marginBottom: 10, padding: 16, textAlign: "center", borderColor: C.gold }}>
      <Label style={{ color: C.gold, marginBottom: 8 }}>{tr("รหัสห้องของคุณ")}</Label>
      <div style={{ fontFamily: MONO, fontSize: 38, fontWeight: 800, letterSpacing: 6, color: C.ink, lineHeight: 1.2 }}>
        {code}
      </div>
      <button onClick={() => copy(code)}
        style={{ ...btn(C.panel2), marginTop: 10, fontSize: 11.5, padding: "7px 0", color: C.blue }}>
        {tr("คัดลอกรหัส")}
      </button>
      <div style={{ fontSize: 10.5, color: C.dim, marginTop: 8, lineHeight: 1.55 }}>{hint}</div>
    </div>
  );

  const roomInput = (
    <div style={{ ...card(), marginBottom: 10, padding: 12 }}>
      <Label style={{ marginBottom: 6 }}>{tr("หรือเข้าห้องเพื่อน — พิมพ์รหัส")}</Label>
      <input
        value={paste}
        maxLength={7}
        onChange={(e) => setPaste(e.target.value.toUpperCase())}
        onKeyDown={(e) => { if (e.key === "Enter" && paste.trim()) netJoinRoom(paste.trim()); }}
        placeholder="K7QX2"
        style={{
          width: "100%", boxSizing: "border-box", background: "#070C16",
          border: `1px solid ${C.line}`, borderRadius: 5, color: C.ink,
          fontFamily: MONO, fontSize: 24, fontWeight: 800, letterSpacing: 5,
          padding: "10px 12px", textAlign: "center", outline: "none",
        }}
      />
      <button disabled={busy || !paste.trim()} onClick={() => netJoinRoom(paste.trim())}
        style={{
          ...btn(paste.trim() ? C.gold : C.panel2), marginTop: 8, fontSize: 13, fontWeight: 800,
          padding: "10px 0", color: paste.trim() ? "#0B1220" : C.dim,
          cursor: paste.trim() ? "pointer" : "default",
        }}>
        {busy ? tr("กำลังเข้าห้อง…") : tr("เข้าห้อง")}
      </button>
    </div>
  );

  return (
    <Shell round={0} score={score} mode={mode} title={tr("เล่นกับเพื่อน")} onBack={() => { netReset(); setPhase("PLAY_MENU"); }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{tr("เล่นกับเพื่อน")}</div>
        <div style={{ fontSize: 12, color: C.dim, marginTop: 5, lineHeight: 1.65, maxWidth: 460 }}>
          {net.link === "room"
            ? tr("เจ้าบ้านเปิดห้องได้รหัส 5 ตัว เพื่อนพิมพ์รหัสก็เข้ามาได้เลย — ไฟต์วิ่งตรงระหว่างเครื่อง")
            : tr("ต่อกันตรงๆ ไม่ผ่านเซิร์ฟเวอร์ — แลกโค้ดกันครั้งเดียวตอนเริ่ม แล้วเล่นได้ทั้งแมตช์")}
        </div>
      </div>

      {net.error ? (
        <div style={{ ...card(), marginBottom: 10, padding: 10, borderColor: C.red, background: "#180D0E" }}>
          <div style={{ fontSize: 12, color: C.red }}>{net.error}</div>
        </div>
      ) : null}

      {st === "idle" && net.link === "room" && (
        <>
          <button disabled={busy} onClick={() => netStartRoom("solo")}
            style={{ ...btn(C.gold), color: "#0B1220", fontWeight: 800, fontSize: 14, padding: "13px 0", marginBottom: 8 }}>
            {busy ? tr("กำลังเปิดห้อง…") : tr("เปิดห้อง แล้วลงเล่นเอง")}
          </button>
          <button disabled={busy} onClick={() => netStartRoom("watch")}
            style={{ ...btn(C.panel2), color: C.blue, fontWeight: 800, fontSize: 13, padding: "12px 0", marginBottom: 10, borderColor: C.blue }}>
            {busy ? tr("กำลังเปิดห้อง…") : tr("เปิดห้องแบบนั่งดู (ให้อีกสองคนเล่น)")}
          </button>
          {roomInput}
          <div style={{ fontSize: 10.5, color: C.dim, lineHeight: 1.7, marginBottom: 8 }}>
            {tr("ข้อมูลไฟต์วิ่งตรงระหว่างเครื่องเหมือนเดิม เซิร์ฟเวอร์กลางใช้แค่ตอนหากันให้เจอครั้งแรก")}
          </div>
          <button onClick={() => netSetLink("code")}
            style={{ ...btn("transparent"), fontSize: 11, padding: "7px 0", color: C.dim, borderColor: C.line, fontFamily: SANS }}>
            {tr("ต่อไม่ติด? ลองแบบแลกโค้ดด้วยมือ")}
          </button>
        </>
      )}

      {st === "idle" && net.link === "code" && (
        <>
          <button disabled={busy} onClick={netStart}
            style={{ ...btn(C.gold), color: "#0B1220", fontWeight: 800, fontSize: 14, padding: "13px 0", marginBottom: 8 }}>
            {busy ? tr("กำลังสร้างห้อง…") : tr("สร้างห้อง (เป็นเจ้าบ้าน)")}
          </button>
          <button disabled={busy} onClick={netStartWatch}
            style={{ ...btn(C.panel2), color: C.blue, fontWeight: 800, fontSize: 13, padding: "12px 0", marginBottom: 10, borderColor: C.blue }}>
            {busy ? tr("กำลังสร้างห้อง…") : tr("สร้างห้องแบบนั่งดู (ให้อีกสองคนเล่น)")}
          </button>
          {pasteBox(
            tr("หรือเข้าห้องของเพื่อน"),
            netJoin,
            tr("เอาโค้ดที่เพื่อนส่งมาวาง แล้วระบบจะให้โค้ดตอบกลับไปส่งคืนเขา"),
            paste, setPaste
          )}
          <button onClick={() => netSetLink("room")}
            style={{ ...btn("transparent"), fontSize: 11, padding: "7px 0", color: C.dim, borderColor: C.line, fontFamily: SANS }}>
            {tr("กลับไปใช้รหัสห้องสั้นๆ")}
          </button>
        </>
      )}

      {st === "hosting" && net.link === "room" && (
        bigCode(net.room, net.role === "watch"
          ? tr("ส่งรหัสนี้ให้ผู้เล่นทั้งสองคน — ทั้งคู่พิมพ์รหัสเดียวกันนี้เข้ามา")
          : tr("ส่งรหัสนี้ให้เพื่อน — พิมพ์ในหน้า VERSUS ของเขาแล้วต่อกันทันที"))
      )}

      {st === "hosting" && net.link === "code" && net.role !== "watch" && (
        <>
          {codeBox(tr("โค้ดห้องของคุณ — ส่งให้เพื่อน"), net.myCode,
            tr("ส่งก้อนนี้ให้เพื่อนทางไลน์หรือดิสคอร์ด แล้วรอโค้ดตอบกลับจากเขา"))}
          {pasteBox(tr("วางโค้ดตอบกลับจากเพื่อน"), netAccept,
            tr("พอวางแล้วจะต่อกันอัตโนมัติ ไม่ต้องทำอะไรอีก"), paste, setPaste)}
        </>
      )}

      {st === "hosting" && net.link === "code" && net.role === "watch" && (
        <>
          <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 10, lineHeight: 1.65 }}>
            {tr("คุณเป็นเจ้าบ้านแต่ไม่ได้ลงเล่น — ส่งโค้ดคนละก้อนให้ผู้เล่นสองคน แล้วเอาโค้ดตอบกลับของแต่ละคนมาวางตามช่อง")}
          </div>
          {[0, 1].map((i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ fontFamily: MONO, fontSize: 11, color: net.joined[i] ? C.green : C.dim, marginBottom: 4 }}>
                {net.joined[i]
                  ? tr("ผู้เล่นคนที่ {0} — ต่อแล้ว", i + 1)
                  : tr("ผู้เล่นคนที่ {0} — ยังไม่ต่อ", i + 1)}
              </div>
              {net.joined[i] ? null : (
                <>
                  {codeBox(tr("โค้ดสำหรับผู้เล่นคนที่ {0}", i + 1), net.codes[i],
                    tr("ส่งก้อนนี้ให้ผู้เล่นคนที่ {0} แล้วรอโค้ดตอบกลับ", i + 1))}
                  {pasteBox(tr("วางโค้ดตอบกลับของผู้เล่นคนที่ {0}", i + 1),
                    (code) => netAcceptSlot(i, code),
                    tr("พอวางครบทั้งสองคนจะเริ่มแมตช์ได้"),
                    i === 0 ? paste : paste2, i === 0 ? setPaste : setPaste2)}
                </>
              )}
            </div>
          ))}
        </>
      )}

      {st === "hosting" && net.link === "room" && net.role === "watch" && (
        <div style={{ ...card(), marginBottom: 10, padding: 12 }}>
          <Label style={{ marginBottom: 6 }}>{tr("สถานะผู้เล่น")}</Label>
          {[0, 1].map((i) => (
            <div key={i} style={{ fontFamily: MONO, fontSize: 11.5, color: net.joined[i] ? C.green : C.dim, padding: "4px 0" }}>
              {net.joined[i] ? tr("ผู้เล่นคนที่ {0} — ต่อแล้ว", i + 1) : tr("ผู้เล่นคนที่ {0} — ยังไม่ต่อ", i + 1)}
            </div>
          ))}
        </div>
      )}

      {st === "joining" && net.link === "code" && (
        codeBox(tr("โค้ดตอบกลับ — ส่งคืนเจ้าบ้าน"), net.myCode,
          tr("ส่งก้อนนี้กลับไปให้คนที่สร้างห้อง พอเขาวางเสร็จจะต่อกันเอง"))
      )}

      {st === "ready" && (
        <>
          <div style={{ ...card(), marginBottom: 10, padding: 12, borderColor: C.green, background: "#0C1A12" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.green }}>{tr("ต่อกันแล้ว")}</div>
            <div style={{ fontSize: 11.5, color: C.dim, marginTop: 5, lineHeight: 1.6 }}>
              {net.role === "watch"
                ? tr("ผู้เล่นสองคนต่อครบแล้ว — คุณจะได้ดูไฟต์อย่างเดียว ไม่ได้ลงเล่น")
                : net.isHost
                  ? tr("คุณเป็นเจ้าบ้าน — เป็นคนรันไฟต์และกดเริ่มแมตช์")
                  : tr("คุณเป็นผู้เข้าร่วม — รอเจ้าบ้านกดเริ่มแมตช์")}
            </div>
          </div>
          {net.isHost ? (
            <button onClick={netBegin}
              style={{ ...btn(C.gold), color: "#0B1220", fontWeight: 800, fontSize: 14, padding: "13px 0" }}>
              {tr("เริ่มแมตช์")}
            </button>
          ) : (
            <div style={{ fontFamily: MONO, fontSize: 12, color: C.dim, textAlign: "center", padding: "14px 0" }}>
              {tr("รอเจ้าบ้าน…")}
            </div>
          )}
        </>
      )}

      {st !== "idle" && (
        <button onClick={netReset}
          style={{ ...btn("transparent"), marginTop: 10, fontSize: 11.5, padding: "8px 0", color: C.dim, borderColor: C.line, fontFamily: SANS }}>
          {tr("ยกเลิกแล้วเริ่มใหม่")}
        </button>
      )}
    </Shell>
  );
}
