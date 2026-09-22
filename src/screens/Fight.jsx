import { tr } from "../i18n.js";
import React from "react";
import { Arena } from "../ui/Arena.jsx";
import { ScoutPanel } from "../ui/Scout.jsx";
import { StatsPanel } from "../ui/Stats.jsx";
import { liveReport } from "../game/report.js";
import { Shell, btn, card } from "../ui/chrome.jsx";
import { stackChips } from "../ui/stacks.js";
import { C, MONO, SANS } from "../ui/theme.js";
import { Bar, Label } from "../ui/widgets.jsx";

// ranks ของยูนิตในไฟต์ -> รูปแบบเดียวกับ c.ranks
const rankMap = (u) => Object.fromEntries((u.skills || []).map((s) => [s.key, s.rank]));

export function FightScreen(ctx) {
  const { arenaDrawRef, activeLane, fightRef, foe, history, openSkill, scoutOpen, setScoutOpen, statsOpen, setStatsOpen, teamStyle, focusId, ready, round, score, setFocusId, setShowRanges, setSpeed, showRanges, speed, team, tick, mode , streak , openStats, wide, mySide, foeIntel, speedLocked } = ctx;

    const st = fightRef.current;
    return (
      <Shell round={round} score={score} mode={mode} streak={streak} maxWidth={wide ? 960 : 620}>
        <Arena stateRef={fightRef} tick={tick} focusId={focusId} showRanges={showRanges} drawRef={arenaDrawRef} />
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {[0.5, 1, 2, 4].map((s) => (
            <button key={s} onClick={() => setSpeed(s)} disabled={speedLocked}
              title={speedLocked ? tr("ความเร็วตามเจ้าบ้าน") : undefined}
              style={{
                ...btn(speed === s ? C.gold : C.panel2), color: speed === s ? "#0B1220" : C.ink,
                flex: 1, fontSize: 12, padding: "6px 0",
                opacity: speedLocked && speed !== s ? 0.45 : 1, cursor: speedLocked ? "default" : "pointer",
              }}>
              {s}×
            </button>
          ))}
          <div style={{ fontFamily: MONO, fontSize: 12, color: C.dim, alignSelf: "center", minWidth: 46, textAlign: "right" }}>
            {st ? st.t.toFixed(1) + " / " + st.timeLimit + "s" : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button onClick={() => setShowRanges(!showRanges)}
            style={{ ...btn(showRanges ? C.panel2 : "transparent"), flex: 1, fontSize: 11, padding: "6px 0", color: showRanges ? C.ink : C.dim }}>{tr("แสดงระยะโจมตี")}</button>
          <button onClick={() => setFocusId(null)}
            style={{ ...btn(focusId ? C.panel2 : "transparent"), flex: 1, fontSize: 11, padding: "6px 0", color: focusId ? C.gold : C.dim }}>
            {focusId ? tr("ดูทั้งสนาม") : tr("แตะชื่อเพื่อโฟกัส")}
          </button>
          <button onClick={() => setScoutOpen(true)}
            style={{ ...btn("transparent"), flex: 1, fontSize: 11, padding: "6px 0", color: C.red, borderColor: C.line }}>{tr("ส่องทีมคู่แข่ง")}</button>
          <button onClick={() => setStatsOpen(true)}
            style={{ ...btn("transparent"), flex: 1, fontSize: 11, padding: "6px 0", color: C.gold, borderColor: C.line }}>{tr("กราฟ")}</button>
        </div>

        {scoutOpen && (
          <ScoutPanel foe={foe} team={team} intel={foeIntel} fightState={st} onClose={() => setScoutOpen(false)} onSkill={openSkill} onStats={openStats} />
        )}

        {statsOpen && (
          <StatsPanel
            reports={[liveReport(st, round, activeLane, teamStyle), ...history]}
            onClose={() => setStatsOpen(false)}
          />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          {["blue", "red"].map((side) => (
            <div key={side} style={card()}>
              <Label style={{ color: side === "blue" ? C.blue : C.red, marginBottom: 6 }}>
                {side === mySide ? tr("ทีมคุณ") : tr("คู่แข่ง")}
              </Label>
              {st && st.units.filter((u) => u.team === side).map((u) => (
                <button key={u.id} onClick={() => setFocusId(focusId === u.id ? null : u.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", marginBottom: 6, padding: "3px 4px",
                    background: focusId === u.id ? C.panel2 : "transparent", cursor: "pointer",
                    border: `1px solid ${focusId === u.id ? C.gold : "transparent"}`, borderRadius: 4,
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2 }}>
                    <span style={{ fontFamily: MONO, color: u.alive ? C.ink : "#42506E" }}>{u.champ.id}</span>
                    <span style={{ fontFamily: MONO, color: C.dim }}>
                      {Math.max(0, Math.round(u.hp))}
                      {/* โล่ต่อท้ายเลือด — เดิมไม่โชว์เลย ตีแล้วเลือดไม่ลดก็ดูเหมือนบั๊ก */}
                      {u.shield > 0 && <span style={{ color: "#E4EBF7" }}>{" +" + Math.round(u.shield)}</span>}
                    </span>
                  </div>
                  <Bar value={u.hp} max={u.maxHp} shield={u.shield} color={u.alive ? (side === "blue" ? C.blue : C.red) : "#26314A"} height={4} />
                </button>
              ))}
            </div>
          ))}
        </div>

        {focusId && st && (() => {
          const u = st.units.find((x) => x.id === focusId);
          if (!u) return null;
          return (
            <div style={{ ...card(), marginTop: 10, borderColor: C.gold }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: MONO, fontWeight: 800, color: u.team === "blue" ? C.blue : C.red, fontSize: 14 }}>{u.champ.id}</span>
                <span style={{ fontSize: 11, color: C.dim }}>{u.champ.role}</span>
                {/* ตัวนับสะสมทั้งหมดของตัวนี้ — ดูรายละเอียดใน ui/stacks.js
                    เดิมมีแต่ LUCH และหารเพดานผิด (ใช้ /5 ทั้งที่ fragments.max = 100) */}
                {stackChips(u, st.t).map((s) => (
                  <span key={s.label} style={{
                    fontFamily: MONO, fontSize: 10, color: s.color,
                    border: `1px solid ${s.color}55`, borderRadius: 999, padding: "1px 6px",
                  }}>
                    {s.label} {s.text}
                  </span>
                ))}
                {u.form && (
                  <span style={{ fontFamily: MONO, fontSize: 11, color: u.form === "BLUE" ? C.blue : "#FF8FD0" }}>
                    {u.form}
                  </span>
                )}
                <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 11, color: C.dim }}>{tr(
                    "AD {0} · AP {1} · AR {2} · MR {3} · AS {4} · ระยะ {5} · ฟื้นเลือด {6}/5วิ",
                    u.ad,
                    u.ap,
                    u.armor,
                    u.mr,
                    (u.asEff || u.atkSpeed).toFixed(2),
                    u.range,
                    u.hp5.toFixed(1)
                  )}</span>
              </div>
              <div style={{ display: "grid", gap: 5 }}>
                {(u.form && u.formSkills ? u.formSkills : u.skills).map((sk) => {
                  const ready = sk.rank > 0 && sk.cdLeft <= 0;
                  const dmg = sk.dmg ? Math.round(sk.dmg[Math.max(0, sk.rank - 1)] + (sk.adRatio || 0) * u.ad + (sk.apRatio || 0) * u.ap) : null;
                  const heal = (sk.shield || sk.heal) ? Math.round((sk.shield || sk.heal)[Math.max(0, sk.rank - 1)] + (sk.apRatio || 0) * u.ap) : null;
                  return (
                    <button key={sk.key} onClick={() => openSkill(u.champ.id, sk.key, { ranks: rankMap(u) })}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 5,
                        background: sk.rank ? (ready ? "#182A3F" : C.panel2) : "#0E1626", opacity: sk.rank ? 1 : 0.4,
                        border: "none", width: "100%", textAlign: "left", cursor: "pointer", fontFamily: SANS, color: C.ink,
                      }}>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: sk.ult ? C.gold : C.ink, width: 14 }}>{sk.key}</span>
                      <span style={{ fontSize: 11.5, color: C.ink, minWidth: 92 }}>
                        {sk.type === "dual" ? (u.shadow > 0 ? sk.shadow.th : sk.light.th) : sk.th}
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: C.blue }}>{"●".repeat(sk.rank)}</span>
                      <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10.5, color: C.dim }}>
                        {dmg != null ? `${dmg} dmg` : heal != null ? tr("{0} เกราะ/ฮีล", heal) : ""}
                        {sk.range ? ` · ${sk.range}` : sk.radius ? ` · r${sk.radius}` : ""}
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 10.5, width: 40, textAlign: "right", color: sk.cdLeft > 0 ? C.gold : ready ? C.green : C.dim }}>
                        {sk.rank === 0 ? tr("ล็อก") : sk.cdLeft > 0 ? sk.cdLeft.toFixed(1) + "s" : tr("พร้อม")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div style={{ ...card(), marginTop: 10, maxHeight: 120, overflowY: "auto" }}>
          <Label style={{ marginBottom: 6 }}>{tr("สมองของ AI")}</Label>
          {st && st.log.slice(-7).reverse().map((l, i) => (
            <div key={i} style={{ fontSize: 11, color: i === 0 ? C.ink : C.dim, marginBottom: 3, fontFamily: SANS }}>
              <span style={{ fontFamily: MONO, color: "#526établ" }} />
              <span style={{ fontFamily: MONO, color: C.dim, marginRight: 6 }}>{l.t.toFixed(1)}s</span>
              {l.text}
            </div>
          ))}
        </div>
      </Shell>
    );
}
