import { tr } from "../i18n.js";
import React from "react";
import { PATCHES, patchKey, patchLabel } from "../data/patches.js";
import { Shell, card } from "../ui/chrome.jsx";
import { C, MONO, SANS } from "../ui/theme.js";


const KIND = {
  new: { c: "#63BF7F", th: "ของใหม่" },
  system: { c: "#5FC9D6", th: "ระบบ" },
  buff: { c: "#E8A33D", th: "ปรับขึ้น" },
  nerf: { c: "#E35A5A", th: "ปรับลง" },
  note: { c: "#7E8AA6", th: "หมายเหตุ" },
};


// ---------------- PATCH NOTES ----------------
export function PatchScreen(ctx) {
  const { score, mode, setPhase, patchOpen, setPatchOpen } = ctx;
  const openId = patchOpen || patchKey(PATCHES[0]);

  return (
    <Shell round={0} score={score} mode={mode} title={tr("แพตช์โน้ต")} onBack={() => setPhase("MENU")} maxWidth={760}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{tr("แพตช์โน้ต")}</div>
        <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>
          {tr("ทุกอย่างที่เปลี่ยนในแต่ละรอบอัปเดต · แพตช์เก่าก็กดดูย้อนได้")}
        </div>
      </div>

      {/* แถบเลือกแพตช์ */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
        {PATCHES.map((p, i) => {
          const on = patchKey(p) === openId;
          return (
            <button key={patchKey(p)} onClick={() => setPatchOpen(patchKey(p))}
              style={{
                background: on ? C.gold : C.panel2, color: on ? "#0B1220" : C.ink,
                border: `1px solid ${C.line}`, borderRadius: 6, padding: "7px 12px",
                fontFamily: MONO, fontSize: 12, fontWeight: on ? 800 : 400, cursor: "pointer",
              }}>
              {"Patch " + patchLabel(p)}{i === 0 ? tr(" · ล่าสุด") : ""}
            </button>
          );
        })}
      </div>

      {PATCHES.filter((p) => patchKey(p) === openId).map((p) => (
        <div key={patchKey(p)} style={{ ...card(), padding: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 800, color: C.gold }}>{"Patch " + patchLabel(p)}</span>
            <span style={{ fontSize: 15, color: C.ink, fontWeight: 700 }}>{tr(p.title)}</span>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 11, color: C.dim }}>{p.date}</span>
          </div>
          {p.blurb ? (
            <div style={{ fontSize: 12.5, color: C.dim, marginTop: 8, lineHeight: 1.7 }}>{tr(p.blurb)}</div>
          ) : null}

          {p.groups.map((g, gi) => {
            const k = KIND[g.kind] || KIND.note;
            return (
              <div key={gi} style={{ marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                  <span style={{
                    background: k.c, color: "#0B1220", borderRadius: 4, padding: "2px 7px",
                    fontSize: 10, fontWeight: 800, fontFamily: SANS, letterSpacing: 0.4,
                  }}>{tr(k.th)}</span>
                  {g.head ? <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{tr(g.head)}</span> : null}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {g.lines.map((l, li) => (
                    <li key={li} style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.85, marginBottom: 2 }}>
                      {tr(l)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ))}
    </Shell>
  );
}
