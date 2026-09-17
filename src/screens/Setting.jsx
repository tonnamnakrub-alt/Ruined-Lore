import { LANGS, tr } from "../i18n.js";
import React from "react";
import { Shell, btn } from "../ui/chrome.jsx";
import { Panel } from "../ui/kit.jsx";
import { C, MONO, SANS } from "../ui/theme.js";
import { Label } from "../ui/widgets.jsx";
import { DIFFS, DIFF_LIST } from "../data/difficulty.js";

// ---------------- SETTING ----------------
export function SettingScreen(ctx) {
  const { score, mode, setPhase, lang, changeLang, speed, setSpeed, showRanges, setShowRanges, restartMatch, round, history, diffId, setDiffId } = ctx;

  const row = (title, sub, control) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12.5, color: C.ink }}>{title}</div>
        {sub ? <div style={{ fontSize: 10.5, color: C.dim, marginTop: 2, lineHeight: 1.5 }}>{sub}</div> : null}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  );

  return (
    <Shell round={0} score={score} mode={mode} title="SETTING" onBack={() => setPhase("MENU")}>
      <Panel style={{ marginBottom: 10 }}>
        <Label style={{ marginBottom: 4 }}>{tr("ภาษา / Language")}</Label>
        {row(
          tr("ภาษาในเกม"),
          tr("จำไว้ในเครื่องนี้ เปิดใหม่ก็ยังเป็นภาษาเดิม"),
          <div style={{ display: "flex", gap: 4 }}>
            {LANGS.map((l) => (
              <button key={l.id} onClick={() => changeLang(l.id)}
                style={{
                  background: lang === l.id ? C.gold : C.panel2, color: lang === l.id ? "#0B1220" : C.ink,
                  border: `1px solid ${C.line}`, borderRadius: 5, padding: "6px 12px",
                  fontFamily: SANS, fontSize: 11.5, cursor: "pointer", fontWeight: lang === l.id ? 800 : 400,
                }}>
                {l.name}
              </button>
            ))}
          </div>
        )}
      </Panel>

      <Panel style={{ marginBottom: 10 }}>
        <Label style={{ marginBottom: 4 }}>{tr("ระดับความยากของบอท")}</Label>
        {row(
          tr("ฝีมือคู่แข่ง"),
          tr("มีผลกับการดราฟต์ แต้มนักแข่ง การออกของ และการสั่งนิสัยเลน — เปลี่ยนแล้วมีผลแมตช์หน้า"),
          <div style={{ display: "flex", gap: 4 }}>
            {DIFF_LIST.map((id) => (
              <button key={id} onClick={() => setDiffId(id)}
                style={{
                  background: diffId === id ? C.gold : C.panel2, color: diffId === id ? "#0B1220" : C.ink,
                  border: `1px solid ${C.line}`, borderRadius: 5, padding: "6px 12px",
                  fontFamily: SANS, fontSize: 11.5, cursor: "pointer", fontWeight: diffId === id ? 800 : 400,
                }}>
                {tr(DIFFS[id].th)}
              </button>
            ))}
          </div>
        )}
        <div style={{ fontSize: 10.5, color: C.dim, marginTop: 6, lineHeight: 1.6 }}>
          {tr(DIFFS[diffId || "NORMAL"].desc)}
        </div>
      </Panel>

      <Panel>
        <Label style={{ marginBottom: 4 }}>{tr("การแสดงผลไฟต์")}</Label>

        {row(
          tr("ความเร็วไฟต์ตั้งต้น"),
          tr("เปลี่ยนกลางไฟต์ได้อยู่แล้ว อันนี้คือค่าที่ใช้ตอนเริ่ม"),
          <div style={{ display: "flex", gap: 4 }}>
            {[0.5, 1, 2, 4].map((s) => (
              <button key={s} onClick={() => setSpeed(s)}
                style={{
                  background: speed === s ? C.gold : C.panel2, color: speed === s ? "#0B1220" : C.ink,
                  border: `1px solid ${C.line}`, borderRadius: 5, padding: "6px 9px",
                  fontFamily: MONO, fontSize: 11, cursor: "pointer", fontWeight: speed === s ? 800 : 400,
                }}>
                {s}×
              </button>
            ))}
          </div>
        )}

        {row(
          tr("แสดงเส้นระยะโจมตี"),
          tr("วงรอบตัวละครในสนาม ช่วยดูว่าใครเข้าถึงใคร"),
          <button onClick={() => setShowRanges(!showRanges)}
            style={{
              background: showRanges ? C.gold : C.panel2, color: showRanges ? "#0B1220" : C.dim,
              border: `1px solid ${C.line}`, borderRadius: 5, padding: "6px 12px",
              fontFamily: SANS, fontSize: 11, cursor: "pointer", fontWeight: 700,
            }}>
            {showRanges ? tr("เปิด") : tr("ปิด")}
          </button>
        )}
      </Panel>

      <Panel style={{ marginTop: 10 }}>
        <Label style={{ marginBottom: 4 }}>{tr("แมตช์ปัจจุบัน")}</Label>
        <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.dim, lineHeight: 1.8, padding: "6px 0 10px" }}>
          <div>{tr("โหมด {0} · {1} ยก", tr(mode.th), mode.rounds)}</div>
          <div>{tr("เล่นถึงยกที่ {0} · เก็บสรุปไว้ {1} ยก", round, history.length)}</div>
          <div>{tr("สกอร์ {0} – {1}", score.me, score.foe)}</div>
        </div>
        <button onClick={() => { restartMatch(true); setPhase("MENU"); }}
          style={{ ...btn(C.panel2), fontSize: 12, color: C.gold }}>{tr("เริ่มแมตช์ใหม่ (เก็บค่านักแข่งเดิม)")}</button>
        <button onClick={() => { restartMatch(false); setPhase("MENU"); }}
          style={{ ...btn(C.panel2), fontSize: 12, marginTop: 6, color: C.red, borderColor: C.line }}>{tr("ล้างทุกอย่าง เริ่มจากศูนย์")}</button>
      </Panel>

      <div style={{ fontSize: 10.5, color: C.dim, marginTop: 12, lineHeight: 1.7 }}>{tr(
        "ค่าพวกนี้ยังไม่ถูกเซฟลงเครื่อง ปิดหน้าแล้วกลับไปเป็นค่าเริ่มต้น — ถ้าอยากให้จำไว้ บอกได้"
      )}</div>
    </Shell>
  );
}
