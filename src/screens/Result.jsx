import { tr } from "../i18n.js";
import React from "react";
import { Shell, btn, card } from "../ui/chrome.jsx";
import { StatsPanel } from "../ui/Stats.jsx";
import { C, MONO } from "../ui/theme.js";
import { Label } from "../ui/widgets.jsx";
import { streakNote } from "../game/streak.js";

export function ResultScreen(ctx) {
  const { foe, history, nextRound, phase, restartMatch, result, round, score, streak, statsOpen, setStatsOpen, mode } = ctx;
  // ระบบรั้งคะแนน — บอกให้รู้ว่ายกนี้โดนหักหรือได้ชดเชยเพราะอะไร
  const myNote = result ? streakNote(result.mods) : null;
  const foeNote = result ? streakNote(result.foeMods) : null;

  // ---------------- RESULT / MATCH OVER ----------------
  const over = phase === "MATCH_OVER";
  const farm = !!(result && result.farm);
  const won = over ? score.me > score.foe : result && result.iWon;
  return (
    <Shell round={round} score={score} mode={mode} streak={streak}>
      <div style={{ ...card(), borderColor: farm && !over ? C.gold : won ? C.green : C.red, marginBottom: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: farm && !over ? C.gold : won ? C.green : C.red }}>
          {over
            ? (won ? tr("ชนะแมตช์") : tr("แพ้แมตช์"))
            : farm ? tr("ยกฟาร์ม — ไม่มีการปะทะ") : won ? tr("ชนะยกนี้") : tr("แพ้ยกนี้")}
        </div>
        {farm && !over && (
          <div style={{ fontSize: 11.5, color: C.dim, marginTop: 6, lineHeight: 1.5 }}>
            {tr("ทั้งสองฝั่งเก็บเงินและ XP แล้วข้ามยกไป แต้มไม่ขยับ สถิติชนะรวด/แพ้รวดคงเดิม")}
          </div>
        )}
        <div style={{ fontSize: 12, color: C.dim, marginTop: 4, fontFamily: MONO }}>
          {score.me} – {score.foe}{result ? `  ·  ${result.time.toFixed(1)}s` : ""}
        </div>
        {myNote && (
          <div style={{
            fontSize: 11.5, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.line}`,
            color: result.mods.bonusGold > 0 ? C.green : C.gold,
          }}>
            {result.mods.bonusGold > 0 ? "⟲ " : "▾ "}{myNote}
          </div>
        )}
        {foeNote && (
          <div style={{ fontSize: 10.5, marginTop: 4, color: C.dim }}>
            {tr("ฝั่งแดง")} · {foeNote}
          </div>
        )}
      </div>

      {!(farm && !over) && <button onClick={() => setStatsOpen(true)}
        style={{ ...btn(C.panel2), color: C.gold, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
        {over ? tr("ดูกราฟย้อนทุกยกของแมตช์นี้") : tr("ดูกราฟสรุปไฟต์ · ย้อนยกเก่าได้")}
      </button>}

      {statsOpen && (
        <StatsPanel reports={history} onClose={() => setStatsOpen(false)} />
      )}

      {result && (
        <div style={{ ...card(), marginBottom: 12 }}>
          <Label style={{ marginBottom: 8 }}>{farm ? tr("รายได้ยกฟาร์ม") : tr("ผลงานรายตัว")}</Label>
          {result.rows.map((r) => (
            <div key={r.char} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, marginBottom: 6, fontFamily: MONO }}>
              <span style={{ color: r.alive ? C.blue : "#42506E", fontWeight: 700, width: 14 }}>{r.char}</span>
              <span style={{ color: C.dim, width: 34 }}>{r.lane.slice(0, 3)}</span>
              {!farm && <span style={{ color: C.ink, width: 46 }}>{r.dmg} dmg</span>}
              {!farm && <span style={{ color: C.dim, width: 52 }}>{r.kills}/{r.assists} K/A</span>}
              <span style={{ color: C.gold, width: 40 }}>+{r.earned}g</span>
              {!farm && <span style={{ color: C.dim }}>{tr("{0}% แม่น", r.shots ? Math.round((r.hits / r.shots) * 100) : 0)}</span>}
            </div>
          ))}
        </div>
      )}

      {over ? (
        <div style={{ display: "grid", gap: 6 }}>
          <button onClick={() => restartMatch(true)} style={{ ...btn(C.gold), color: "#0B1220", fontWeight: 800 }}>{tr("เล่นใหม่ด้วยทีมเดิม")}</button>
          <button onClick={() => restartMatch(false)} style={{ ...btn(C.panel2), fontSize: 12 }}>{tr("สร้างทีมใหม่")}</button>
        </div>
      ) : (
        <button onClick={nextRound} style={{ ...btn(C.gold), color: "#0B1220", fontWeight: 800 }}>
          {round + 1 === mode.maxRounds ? tr("ไปยกตัดสิน") : tr("ไปยกที่ {0}", round + 1)}
        </button>
      )}
    </Shell>
  );
}
