import { tr } from "../i18n.js";
import React from "react";
import { MODES } from "../data/modes.js";
import { STAT_KEYS } from "../data/constants.js";
import { LANE_INFO } from "../data/lanes.js";
import { POINTS, STAT_CAP, STAT_DESC, STAT_SHORT } from "../game/roster.js";
import { Shell, btn, card, mini } from "../ui/chrome.jsx";
import { C, MONO, SANS } from "../ui/theme.js";
import { Label, Pip } from "../ui/widgets.jsx";

export function SetupScreen(ctx) {
  const { bump, clearOne, quickStart, ready, rollAll, rollOne, round, score, setPhase, spent, team, mode, modeId, setModeId } = ctx;

    return (
      <Shell round={0} score={score} mode={mode} title={tr("สร้างทีม")} onBack={() => setPhase("PLAY_MENU")}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3, color: C.ink }}>{tr("สร้างทีมนักแข่ง")}</div>
          <div style={{ fontSize: 13, color: C.dim, marginTop: 4, lineHeight: 1.6 }}>
            {tr("แจกคนละ {0} แต้ม (ค่าละไม่เกิน {1}) ค่าพวกนี้ ล็อกตลอดแมตช์ — ไอเทมกับเลเวลไม่เพิ่มให้ ตัวละคร A–E ยังไม่มีความสามารถและสถิติเท่ากันหมด", POINTS, STAT_CAP)}
          </div>
        </div>

        <button onClick={() => setPhase("PRACTICE")} style={{ ...btn(C.panel2), marginBottom: 10, fontSize: 12, color: C.gold }}>{tr("เข้าห้องซ้อม — ลองตัวละครกับดัมมี่")}</button>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={rollAll} style={{ ...btn(C.panel2), flex: 1, fontSize: 12 }}>{tr("สุ่มทั้งทีม")}</button>
          <button onClick={quickStart} style={{ ...btn(C.panel2), flex: 1, fontSize: 12, color: C.gold }}>{tr("สุ่ม + เริ่มเลย")}</button>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {team.map((c, idx) => (
            <div key={c.lane} style={card()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <div>
                  <span style={{ fontFamily: MONO, fontWeight: 800, color: C.blue, fontSize: 15 }}>{c.char}</span>
                  <span style={{ color: C.ink, fontWeight: 700, marginLeft: 8, fontSize: 13 }}>{c.athleteName}</span>
                  <span style={{ color: C.dim, marginLeft: 8, fontSize: 11, letterSpacing: 1 }}>{c.lane}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: spent(c) === POINTS ? C.green : C.gold }}>
                    {spent(c)}/{POINTS}
                  </span>
                  <button onClick={() => rollOne(idx)} style={{ ...mini(), width: 30 }} title={tr("สุ่มใหม่เฉพาะคนนี้")}>⚄</button>
                  <button onClick={() => clearOne(idx)} style={{ ...mini(), width: 30 }} title={tr("ล้างแต้ม")}>↺</button>
                </div>
              </div>
              <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 8, lineHeight: 1.5 }}>
                {tr(LANE_INFO[c.lane].passive)}
              </div>
              {STAT_KEYS.map((k) => (
                <div key={k} style={{ marginBottom: 7 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 34, fontFamily: MONO, fontSize: 10, color: C.dim }}>{STAT_SHORT[k]}</div>
                    <Pip n={c.athlete[k]} color={C.blue} />
                    <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                      <button onClick={() => bump(idx, k, -1)} style={mini()}>−</button>
                      <button onClick={() => bump(idx, k, 1)} style={mini()}>+</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: C.dim, marginLeft: 42, marginTop: 2, lineHeight: 1.3 }}>
                    {tr(STAT_DESC[k])}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <button
          disabled={!ready}
          onClick={() => setPhase("DRAFT")}
          style={{ ...btn(ready ? C.gold : "#243049"), color: ready ? "#0B1220" : C.dim, marginTop: 14, fontWeight: 800 }}
        >
          {ready ? tr("เริ่มแมตช์ (Bo15 — ถึง 8 ก่อนชนะ)") : tr("แจกแต้มให้ครบทุกคนก่อน")}
        </button>
      </Shell>
    );
}
