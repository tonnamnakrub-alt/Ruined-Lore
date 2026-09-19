import { tr } from "../i18n.js";
import React from "react";
import { Shell, btn, card } from "../ui/chrome.jsx";
import { Label } from "../ui/widgets.jsx";
import { C, MONO, SANS } from "../ui/theme.js";
import { CHAMPIONS } from "../data/champions.js";
import { LANE_TH, STANCES, STANCE_LANES } from "../data/behaviour.js";

const TONE = { SAFE: C.blue, NEUTRAL: C.dim, AGGRO: C.red };

// ---------------- หน้าสรุปว่ายกนี้เกิดอะไรขึ้นบ้าง ----------------
// เลนไหนแตกไฟต์ก็กดดูได้ตามลำดับที่อยากดู ไม่ต้องดูเรียงตามเลน
export function LanesScreen(ctx) {
  const {
    score, mode, round, streak, plan, laneDone, startLaneFight, closeRound, team, foe,
  } = ctx;

  if (!plan) return null;
  const nameOf = (roster, lane) => {
    const c = roster.find((x) => x.lane === lane);
    const ch = c && c.champId && CHAMPIONS[c.champId];
    return ch ? ch.id : "—";
  };

  const pending = plan.fights.filter((f) => !laneDone[f.lane]);
  const allDone = pending.length === 0;

  const stanceChip = (s, who) => (
    <span style={{
      fontFamily: MONO, fontSize: 10.5, fontWeight: 800, color: TONE[s],
      border: `1px solid ${TONE[s]}`, borderRadius: 4, padding: "2px 6px",
    }}>{who}: {tr(STANCES[s].th)}</span>
  );

  const laneCard = (L) => {
    const l = plan.lanes[L];
    const done = laneDone[L];
    const tone = done ? (done.iWon ? C.green : C.red) : (l.fight ? C.gold : C.line);
    return (
      <div key={L} style={{ ...card(), padding: 12, marginBottom: 8, borderColor: tone }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, flexWrap: "wrap" }}>
          <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: C.gold, letterSpacing: 1 }}>
            {tr(LANE_TH[L])}
          </span>
          {stanceChip(l.mine, tr("เรา"))}
          {done ? stanceChip(l.theirs, tr("เขา")) : (
            <span style={{
              fontFamily: MONO, fontSize: 10.5, fontWeight: 800, color: C.line,
              border: `1px solid ${C.line}`, borderRadius: 4, padding: "2px 6px",
            }}>{tr("เขา")}: ?</span>
          )}
          {done ? (
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 11.5, fontWeight: 800, color: tone }}>
              {done.iWon ? tr("ชนะเลน") : tr("แพ้เลน")} · {done.time.toFixed(1)}s
            </span>
          ) : null}
        </div>

        <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.65, marginBottom: l.fight ? 8 : 0 }}>
          {done
            ? l.notes.filter(Boolean).map((n, i) => <div key={i}>{Array.isArray(n) ? tr(n[0], tr(n[1])) : tr(n)}</div>)
            : <div style={{ color: C.line }}>{l.fight ? tr("แตกไฟต์ — ยังไม่รู้ว่าเพราะอะไร") : tr("ยกนี้เลนนี้ไม่มีอะไรเกิดขึ้น")}</div>}
        </div>

        {l.fight ? (
          <>
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.dim, marginBottom: 7 }}>
              {l.blue.map((k) => nameOf(team, k)).join(" + ")}
              <span style={{ color: C.line }}> vs </span>
              {done ? l.red.map((k) => nameOf(foe, k)).join(" + ") : "?"}
              {done && Object.keys(l.hurt).length
                ? <span style={{ color: C.red }}> · {tr("มีคนเสียเลือดก่อนเริ่ม")}</span> : null}
            </div>
            {done ? null : (
              <button onClick={() => startLaneFight(L)}
                style={{ ...btn(C.gold), color: "#0B1220", fontWeight: 800, fontSize: 13, padding: "10px 0" }}>
                {tr("ดูไฟต์เลนนี้")}
              </button>
            )}
          </>
        ) : (
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.line }}>{tr("ไม่มีไฟต์")}</div>
        )}
      </div>
    );
  };

  return (
    <Shell round={round} score={score} mode={mode} streak={streak} title={tr("สนามยกนี้")}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: C.ink }}>
          {plan.fights.length
            ? tr("มี {0} ไฟต์ในยกนี้", plan.fights.length)
            : tr("ยกนี้ไม่มีใครปะทะกัน")}
        </div>
        <div style={{ fontSize: 11.5, color: C.dim, marginTop: 4, lineHeight: 1.6 }}>
          {plan.fights.length > 1
            ? tr("เลือกได้เองว่าจะดูเลนไหนก่อน — ผลของทุกเลนรวมกันตอนจบยก")
            : tr("กดดูไฟต์ แล้วค่อยปิดยก")}
        </div>
        {/* กติกาใหม่ — ชนะเลนไม่ได้แปลว่าชนะยก ต้องบอกให้ชัดก่อนสั่งนิสัยเลน */}
        <div style={{ fontSize: 11, color: C.gold, marginTop: 5, lineHeight: 1.6 }}>
          {tr("ยกนี้ตัดสินที่เงิน — ใครได้เงินรวมทั้งทีมเยอะกว่าในยกนี้ คนนั้นได้แต้ม")}
        </div>
      </div>

      {(plan.foeJungleLane || (plan.lanes.TOP.myGank || plan.lanes.MID.myGank || plan.lanes.BOT.myGank)) ? (
        <div style={{ ...card(), padding: 10, marginBottom: 8, background: "#101A2C" }}>
          <Label style={{ marginBottom: 5 }}>{tr("ป่า")}</Label>
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, lineHeight: 1.7 }}>
            {STANCE_LANES.some((L) => plan.lanes[L].myGank)
              ? <div style={{ color: C.blue }}>{tr("ป่าเราลง {0}", tr(LANE_TH[STANCE_LANES.find((L) => plan.lanes[L].myGank)]))}</div>
              : <div>{tr("ป่าเราฟาร์มต่อ")}</div>}
            {allDone
              ? (plan.foeJungleLane
                ? <div style={{ color: C.red }}>{tr("ป่าศัตรูลง {0}", tr(LANE_TH[plan.foeJungleLane]))}</div>
                : <div>{tr("ป่าศัตรูฟาร์มต่อ")}</div>)
              : <div style={{ color: C.line }}>{tr("ป่าศัตรู — ยังไม่รู้")}</div>}
          </div>
        </div>
      ) : null}

      {STANCE_LANES.map(laneCard)}

      <button disabled={!allDone} onClick={() => closeRound()}
        style={{
          ...btn(allDone ? C.gold : C.panel2), color: allDone ? "#0B1220" : C.dim,
          fontWeight: 800, fontSize: 14, padding: "13px 0",
          cursor: allDone ? "pointer" : "default", fontFamily: SANS,
        }}>
        {allDone ? tr("ปิดยก — รับเงินและ XP") : tr("ยังเหลืออีก {0} ไฟต์", pending.length)}
      </button>
    </Shell>
  );
}
