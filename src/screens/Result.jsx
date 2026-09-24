import { tr } from "../i18n.js";
import { LANE_TH, STANCES } from "../data/behaviour.js";
import React from "react";
import { Shell, btn, card } from "../ui/chrome.jsx";
import { StatsPanel } from "../ui/Stats.jsx";
import { C, MONO } from "../ui/theme.js";
import { Label } from "../ui/widgets.jsx";
import { streakNote } from "../game/streak.js";
import { RoundReceipt } from "../ui/Receipt.jsx";

export function ResultScreen(ctx) {
  const { foe, history, nextRound, phase, restartMatch, result, round, score, streak, statsOpen, setStatsOpen, mode, wide, openEconomy } = ctx;
  // เงินที่แต่ละเลนทำได้ยกนี้ รวมทั้งกลุ่มเลน (บอท = ADC + ซัพ) — ใช้บอกว่าเงินหายไปตรงไหน
  const laneGold = (rows, L) => (rows || [])
    .filter((r) => (r.lane === "ADC" || r.lane === "SUPPORT" ? "BOT" : r.lane) === L)
    .reduce((s, r) => s + r.gold, 0);
  // ระบบรั้งคะแนน — บอกให้รู้ว่ายกนี้โดนหักหรือได้ชดเชยเพราะอะไร
  const myNote = result ? streakNote(result.mods) : null;
  const foeNote = result ? streakNote(result.foeMods) : null;

  // ---------------- RESULT / MATCH OVER ----------------
  const over = phase === "MATCH_OVER";
  const farm = !!(result && result.farm);
  const won = over ? score.me > score.foe : result && result.iWon;
  // ยกที่ไม่มีใครปะทะ หรือแบ่งเลนกันคนละครึ่ง = เสมอ ไม่นับแต้มให้ใคร
  const drawn = !over && !!(result && result.drawn);
  const tone = drawn ? C.gold : won ? C.green : C.red;
  return (
    <Shell round={round} score={score} mode={mode} streak={streak}>
      <div style={{ ...card(), borderColor: farm && !over ? C.gold : tone, marginBottom: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: farm && !over ? C.gold : tone }}>
          {over
            ? (won ? tr("ชนะแมตช์") : tr("แพ้แมตช์"))
            : farm ? tr("ยกฟาร์ม — ไม่มีการปะทะ")
              : drawn ? tr("ยกนี้เสมอ") : won ? tr("ชนะยกนี้") : tr("แพ้ยกนี้")}
        </div>
        {result && result.byLane ? (
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, marginTop: 7, lineHeight: 1.7 }}>
            {result.byLane.map((r) => (
              <div key={r.lane} style={{ marginBottom: 4 }}>
                <div>
                  {tr(LANE_TH[r.lane])} · {tr(STANCES[r.mine].th)} vs {tr(STANCES[r.theirs].th)}
                  <span style={{ color: r.fought ? (r.iWon ? C.green : C.red) : C.line, marginLeft: 6 }}>
                    {r.fought ? (r.iWon ? tr("ชนะเลน") : tr("แพ้เลน")) : tr("ไม่มีไฟต์")}
                  </span>
                  {result.breakdown ? (
                    <span style={{ marginLeft: 6 }}>
                      <span style={{ color: C.gold }}>{laneGold(result.breakdown.me, r.lane)}g</span>
                      <span style={{ color: C.line }}> vs </span>
                      <span style={{ color: C.dim }}>{laneGold(result.breakdown.foe, r.lane)}g</span>
                    </span>
                  ) : null}
                </div>
                {(r.notes || []).filter(Boolean).map((n, i) => (
                  <div key={i} style={{ color: C.dim, fontSize: 10.5, paddingLeft: 10 }}>
                    {Array.isArray(n) ? tr(n[0], tr(n[1])) : tr(n)}
                  </div>
                ))}
              </div>
            ))}
            {result.breakdown ? (
              <div style={{ marginTop: 2, color: C.dim }}>
                {tr("ป่า")}
                <span style={{ color: C.gold, marginLeft: 6 }}>{laneGold(result.breakdown.me, "JUNGLE")}g</span>
                <span style={{ color: C.line }}> vs </span>
                <span>{laneGold(result.breakdown.foe, "JUNGLE")}g</span>
              </div>
            ) : null}
          </div>
        ) : null}
        {farm && !over && (
          <div style={{ fontSize: 11.5, color: C.dim, marginTop: 6, lineHeight: 1.5 }}>
            {tr("ทั้งสองฝั่งเก็บเงินและ XP แล้วข้ามยกไป แต้มไม่ขยับ สถิติชนะรวด/แพ้รวดคงเดิม")}
          </div>
        )}
        {/* ยกนี้ตัดสินด้วยเงิน ไม่ใช่จำนวนเลนที่ชนะ — ต้องเห็นตัวเลขที่ตัดสินด้วย */}
        {!over && result && result.myGold != null ? (
          <div style={{
            display: "flex", alignItems: "baseline", gap: 8, marginTop: 9,
            padding: "7px 9px", background: C.panel2, borderRadius: 6,
          }}>
            <Label>{tr("เงินที่ได้ยกนี้")}</Label>
            <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 800, color: result.myGold >= result.foeGold ? C.green : C.ink }}>
              {result.myGold}g
            </span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>vs</span>
            <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 800, color: result.foeGold > result.myGold ? C.red : C.ink }}>
              {result.foeGold}g
            </span>
            <span style={{ marginLeft: "auto", fontSize: 10.5, color: C.dim }}>
              {tr("ยกนี้ใครได้เงินเยอะกว่าคนนั้นชนะ")}
            </span>
          </div>
        ) : null}
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

      {/* ใบเสร็จเงิน — เห็นว่าเงินแต่ละก้อนของทั้งสองฝั่งมาจากไหน ใช้ปรับบาลานซ์ได้ */}
      {result && result.breakdown ? (
        <RoundReceipt
          breakdown={result.breakdown} myGold={result.myGold} foeGold={result.foeGold}
          wide={wide} onRules={() => openEconomy(phase)}
        />
      ) : null}

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
