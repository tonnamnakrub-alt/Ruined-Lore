import { tr } from "../i18n.js";
import React from "react";
import { CHAMPIONS } from "../data/champions.js";
import { STAT_KEYS } from "../data/constants.js";
import { LANE_INFO } from "../data/lanes.js";
import { emptyRanks } from "../engine/skill-ranks.js";
import { STAT_SHORT } from "../game/roster.js";
import { Shell, btn, card } from "../ui/chrome.jsx";
import { C, MONO, SANS } from "../ui/theme.js";
import { Label } from "../ui/widgets.jsx";

export function PositionScreen(ctx) {
  const { draftPool, heldChamp, rand, round, score, setFoe, setHeldChamp, setPhase, setTeam, team, mode } = ctx;

    const roster = draftPool;
    const placed = team.map((c) => c.champId).filter(Boolean);
    const bench = roster.filter((id) => !placed.includes(id));
    const ready = team.every((c) => c.champId);

    const place = (lane) => {
      if (!heldChamp) return;
      setTeam((t) =>
        t.map((c) => {
          if (c.lane === lane) return { ...c, champId: heldChamp, ranks: emptyRanks() };
          if (c.champId === heldChamp) return { ...c, champId: null, ranks: emptyRanks() };
          return c;
        })
      );
      setHeldChamp(null);
    };

    return (
      <Shell round={0} score={score} mode={mode}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{tr("จัดตำแหน่ง")}</div>
          <div style={{ fontSize: 13, color: C.dim, marginTop: 4, lineHeight: 1.6 }}>{tr("แตะตัวละครที่ต้องการ แล้วแตะเลนที่จะให้ลง")}</div>
        </div>

        <Label style={{ marginBottom: 6 }}>{tr("ตัวที่ยังไม่ได้ลง")}</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6, minHeight: 34 }}>
          {bench.length === 0 && <span style={{ fontSize: 11, color: C.dim, alignSelf: "center" }}>{tr("ลงครบทุกตัวแล้ว")}</span>}
          {bench.map((id) => (
            <button key={id} onClick={() => setHeldChamp(heldChamp === id ? null : id)}
              style={{
                background: heldChamp === id ? C.gold : C.panel2, color: heldChamp === id ? "#0B1220" : C.ink,
                border: `1px solid ${heldChamp === id ? C.ink : C.line}`, borderRadius: 6,
                padding: "8px 12px", fontSize: 12, cursor: "pointer", fontFamily: SANS, fontWeight: 700,
              }}>{id}</button>
          ))}
        </div>
        {heldChamp && (
          <div style={{ padding: "7px 10px", borderRadius: 6, background: "#2A2210", border: `1px solid ${C.gold}`, fontSize: 11.5, color: C.gold, marginBottom: 10 }}>{tr("ถือ {0} อยู่ — แตะเลนด้านล่างเพื่อวาง", heldChamp)}</div>
        )}

        <div style={{ display: "grid", gap: 8 }}>
          {team.map((c) => {
            const ch = CHAMPIONS[c.champId];
            return (
              <button key={c.lane} onClick={() => (heldChamp ? place(c.lane) : setHeldChamp(c.champId))}
                style={{
                  ...card(), textAlign: "left", cursor: "pointer", width: "100%",
                  borderColor: heldChamp ? C.gold : c.champId === heldChamp ? C.ink : C.line,
                  background: c.champId && c.champId === heldChamp ? C.panel2 : C.panel,
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: C.gold, fontSize: 11, letterSpacing: 1.5, fontWeight: 700, width: 66 }}>{c.lane}</span>
                  <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: c.champId ? C.ink : "#3B4A69" }}>
                    {c.champId || tr("ว่าง")}
                  </span>
                  <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10, color: C.dim }}>
                    {c.athleteName} · {STAT_KEYS.map((k) => STAT_SHORT[k][0] + c.athlete[k]).join(" ")}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: C.dim, marginTop: 5 }}>{tr(LANE_INFO[c.lane].passive)}</div>
                {ch && (
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>
                    {ch.role} · {ch.melee ? tr("ประชิด 175") : tr("ระยะ ") + ch.range}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <button
          disabled={!ready}
          onClick={() => {
            setFoe((f) => {
              const pool = Object.values(CHAMPIONS).map((ch) => ch.id);
              for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
              return f.map((c, i) => ({ ...c, champId: pool[i % pool.length], ranks: emptyRanks() }));
            });
            setPhase("PLAN");
          }}
          style={{ ...btn(ready ? C.gold : "#243049"), color: ready ? "#0B1220" : C.dim, fontWeight: 800, marginTop: 14 }}>
          {ready ? tr("ไปวางแผนซื้อของ (ข้ามได้)") : tr("วางให้ครบทุกเลนก่อน")}
        </button>
        <button onClick={() => setPhase("DRAFT")} style={{ ...btn(C.panel2), marginTop: 6, fontSize: 12 }}>{tr("กลับไปดราฟต์ใหม่")}</button>
      </Shell>
    );
}
