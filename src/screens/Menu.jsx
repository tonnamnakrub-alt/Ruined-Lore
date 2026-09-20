import { LANGS, tr } from "../i18n.js";
import React from "react";
import { Shell } from "../ui/chrome.jsx";
import { MenuButton } from "../ui/kit.jsx";
import { LATEST_PATCH, patchLabel } from "../data/patches.js";
import { MODES } from "../data/modes.js";
import { DRAFT_STYLES } from "../game/draft.js";
import { C, MONO, SANS } from "../ui/theme.js";

// ---------------- เมนูหลัก ----------------
export function MenuScreen(ctx) {
  const { score, mode, setPhase, lang, changeLang } = ctx;

  return (
    <Shell round={0} score={score} mode={mode} title="MAIN MENU">
      <div style={{ margin: "6px 0 18px" }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color: C.ink, lineHeight: 1.1 }}>
          RUINED LORE
        </div>
        <div style={{ fontSize: 12, color: C.dim, marginTop: 6, lineHeight: 1.6, maxWidth: 420 }}>{tr(
          "คุณเป็นโค้ชทีมอีสปอร์ต ไม่ใช่คนเล่น — ทุกอย่างที่ตัดสินแพ้ชนะ ตัดสินใจก่อนไฟต์เริ่มทั้งหมด"
        )}</div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {LANGS.map((l) => (
          <button key={l.id} onClick={() => changeLang(l.id)}
            style={{
              background: lang === l.id ? C.gold : C.panel2, color: lang === l.id ? "#0B1220" : C.dim,
              border: `1px solid ${C.line}`, borderRadius: 5, padding: "5px 12px",
              fontFamily: MONO, fontSize: 11, cursor: "pointer", fontWeight: lang === l.id ? 800 : 400,
            }}>
            {l.label}
          </button>
        ))}
      </div>

      <MenuButton title="PLAY" tone={C.gold} sub={tr("เลือกโหมดแล้วลงแข่ง")} onClick={() => setPhase("PLAY_MENU")} />
      <MenuButton title="CHARACTER INFO" sub={tr("ดูตัวละครทั้งหมดแยกตามเลน พร้อมสกิลเต็ม")} onClick={() => setPhase("STORE")} />
      <MenuButton title="ITEM" sub={tr("คลังไอเทมทุกชิ้น สูตรคราฟต์ และค่าสถานะ")} onClick={() => setPhase("ITEMBOOK")} />
      <MenuButton title="PATCH NOTES" sub={tr("อะไรเปลี่ยนบ้างในแพตช์ล่าสุด · ย้อนดูแพตช์เก่าได้")} onClick={() => setPhase("PATCH")} />
      <MenuButton title="SETTING" sub={tr("ความเร็วไฟต์ เส้นระยะโจมตี และรีเซ็ตแมตช์")} onClick={() => setPhase("SETTING")} />

      <div style={{ marginTop: 14, fontSize: 10.5, color: C.dim, fontFamily: MONO, lineHeight: 1.7 }}>
        <div>{tr("PATCH {0} · {1} {2} ยก", patchLabel(LATEST_PATCH), tr(mode.th), mode.rounds)}</div>
        <div style={{ fontFamily: SANS }}>{tr("เปิดไฟล์เดียวเล่นได้ ไม่ต้องต่อเน็ต")}</div>
      </div>
    </Shell>
  );
}

// ---------------- เมนูเลือกโหมด ----------------
export function PlayMenuScreen(ctx) {
  const { score, mode, modeId, setModeId, setPhase, draftStyle, setDraftStyle } = ctx;
  const MODE_LIST = [
    { id: "LONG", th: "Normal", rounds: 50 },
    { id: "RUSH", th: "Quick Play", rounds: 20 },
  ];

  return (
    <Shell round={0} score={score} mode={mode} title={tr("เลือกโหมด")} onBack={() => setPhase("MENU")}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{tr("ลงแข่ง")}</div>
        <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{tr("เลือกรูปแบบการแข่ง")}</div>
      </div>

      <div style={{ background: C.panel, border: `1px solid ${C.gold}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1, color: C.gold }}>CLASSIC</div>
        <div style={{ fontSize: 11, color: C.dim, margin: "4px 0 10px", lineHeight: 1.5 }}>{tr("แข่งกับทีมคอมพิวเตอร์หนึ่งแมตช์ — เลือกความยาวได้")}</div>

        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {MODE_LIST.map((m) => (
            <button key={m.id} onClick={() => setModeId(m.id)}
              style={{
                flex: 1, background: modeId === m.id ? C.gold : C.panel2,
                color: modeId === m.id ? "#0B1220" : C.ink, border: `1px solid ${C.line}`,
                borderRadius: 6, padding: "9px 6px", cursor: "pointer", fontFamily: SANS,
                fontSize: 13, fontWeight: modeId === m.id ? 800 : 400,
              }}>{tr("{0} · {1} ยก", tr(m.th), m.rounds)}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 10, lineHeight: 1.5 }}>{tr(mode.desc)}</div>

        {/* Patch 0.3 — เลือกได้ว่าจะเลือกตัวแบบไหน */}
        <div style={{ fontSize: 10, letterSpacing: 1.2, color: C.dim, fontWeight: 700, marginBottom: 5 }}>
          {tr("วิธีเลือกตัวละคร")}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {Object.values(DRAFT_STYLES).map((s) => (
            <button key={s.id} onClick={() => setDraftStyle(s.id)}
              style={{
                flex: 1, background: draftStyle === s.id ? C.blue : C.panel2,
                color: draftStyle === s.id ? "#0B1220" : C.ink, border: `1px solid ${C.line}`,
                borderRadius: 6, padding: "8px 6px", cursor: "pointer", fontFamily: SANS,
                fontSize: 12, fontWeight: draftStyle === s.id ? 800 : 400,
              }}>{tr(s.th)}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 10, lineHeight: 1.5 }}>
          {tr(DRAFT_STYLES[draftStyle].desc)}
        </div>

        <button onClick={() => setPhase("SETUP")}
          style={{
            width: "100%", background: C.gold, color: "#0B1220", border: "none", borderRadius: 7,
            padding: "12px 10px", cursor: "pointer", fontFamily: SANS, fontSize: 14, fontWeight: 800,
          }}>{tr("เริ่ม — สร้างทีมนักแข่ง")}</button>
      </div>

      <MenuButton title="VERSUS" tone={C.blue} onClick={() => setPhase("ONLINE")}
        sub={tr("เล่นกับเพื่อนแบบต่อตรง — เลือกปิดตา ดราฟต์ หรือทัวร์นาเมนต์ก็ได้")} />
      <MenuButton title="RANK" disabled sub={tr("ระบบแต้ม/ตีระดับ — เร็วๆ นี้")} />
      {/* Patch 0.3 — ทัวร์นาเมนต์เล่นได้แล้ว: แบนฝั่งละ 3 แล้วดราฟต์แบบ Snake */}
      <MenuButton title="TOURNAMENT" tone={C.red}
        onClick={() => { setDraftStyle("TOURNEY"); setPhase("SETUP"); }}
        sub={tr("แบนฝั่งละ 3 ตัว แล้วผลัดกันเลือกแบบดราฟต์ — เห็นของอีกฝั่งตลอด")} />

      <button onClick={() => setPhase("PRACTICE")}
        style={{
          width: "100%", background: C.panel2, color: C.gold, border: `1px solid ${C.line}`,
          borderRadius: 7, padding: "10px", cursor: "pointer", fontFamily: SANS, fontSize: 12, marginTop: 6,
        }}>{tr("เข้าห้องซ้อม — ลองตัวละครกับดัมมี่")}</button>
    </Shell>
  );
}
