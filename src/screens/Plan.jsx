import { itemName, tr } from "../i18n.js";
import React from "react";
import { CHAMPIONS } from "../data/champions.js";
import { CATEGORIES, ITEMS, ITEM_BY_ID, itemsInCat } from "../data/items.js";
import { Shell, btn, card, mini } from "../ui/chrome.jsx";
import { C, MONO, SANS } from "../ui/theme.js";

export function PlanScreen(ctx) {
  const { startMatch, planCatState, planIdx, round, score, setPhase, setPlanCatState, setPlanIdx, setTeam, team, mode } = ctx;

    const planCat = planCatState[planIdx] || "START";
    const c = team[planIdx];
    const ch = CHAMPIONS[c.champId];
    const list = itemsInCat(planCat).all;
    const plan = c.buildPlan || [];
    const cap = c.lane === "ADC" ? 7 : 6;

    function addToPlan(item) {
      setTeam((t) => t.map((x, i) => {
        if (i !== planIdx) return x;
        const cur = x.buildPlan || [];
        if (cur.length >= cap) return x;
        if (cur.some((p) => p === item.id)) return x;
        return { ...x, buildPlan: [...cur, item.id] };
      }));
    }
    function removeFromPlan(itemId) {
      setTeam((t) => t.map((x, i) => (i === planIdx ? { ...x, buildPlan: (x.buildPlan || []).filter((p) => p !== itemId) } : x)));
    }

    return (
      <Shell round={0} score={score} mode={mode}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{tr("วางแผนซื้อของ")}</div>
          <div style={{ fontSize: 13, color: C.dim, marginTop: 4, lineHeight: 1.6 }}>{tr(
            "ไม่บังคับ — แค่เตรียมลำดับของที่อยากซื้อไว้ล่วงหน้า ตอนเล่นจริงยังต้องกดซื้อเองทุกครั้ง แค่มีปุ่ม \"ซื้อตามแผน\" ให้กดเร็วขึ้น และยังไปซื้ออย่างอื่นแทนได้ตลอดเวลา"
          )}</div>
        </div>

        <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
          {team.map((x, i) => (
            <button key={x.lane} onClick={() => setPlanIdx(i)}
              style={{
                background: planIdx === i ? C.gold : C.panel2, color: planIdx === i ? "#0B1220" : C.ink,
                border: `1px solid ${C.line}`, borderRadius: 6, padding: "7px 10px", fontSize: 11.5,
                cursor: "pointer", fontFamily: SANS, fontWeight: planIdx === i ? 700 : 400,
              }}>
              {x.lane} · {x.champId || "?"} {(x.buildPlan || []).length > 0 ? `(${x.buildPlan.length})` : ""}
            </button>
          ))}
        </div>

        <div style={{ ...card(), marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: MONO, fontWeight: 800, color: C.blue, fontSize: 14 }}>{c.champId}</span>
            <span style={{ color: C.dim, fontSize: 11 }}>{c.lane} · {c.athleteName}</span>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 11, color: C.dim }}>{plan.length}/{cap}</span>
          </div>
          {plan.length === 0 ? (
            <div style={{ fontSize: 11, color: C.dim }}>{tr("ยังไม่ได้วางแผน — เลือกของด้านล่างเพื่อเพิ่มเข้าคิว")}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {plan.map((itemId, i) => {
                const it = ITEM_BY_ID[itemId];
                return (
                  <div key={itemId + i} style={{ display: "flex", alignItems: "center", gap: 8, background: C.panel2, borderRadius: 5, padding: "6px 9px" }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, width: 16 }}>{i + 1}</span>
                    <span style={{ fontSize: 11.5, color: C.ink, flex: 1 }}>{itemName(it)}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.gold }}>{it.cost}g</span>
                    <button onClick={() => removeFromPlan(itemId)} style={{ ...mini(), width: 22, height: 20, fontSize: 12, padding: 0 }}>×</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
          {CATEGORIES.map((k) => (
            <button key={k.id} onClick={() => setPlanCatState((s) => ({ ...s, [planIdx]: k.id }))}
              style={{
                background: planCat === k.id ? C.gold : C.panel2, color: planCat === k.id ? "#0B1220" : C.ink,
                border: `1px solid ${C.line}`, borderRadius: 999, padding: "6px 12px", fontSize: 11.5,
                cursor: "pointer", fontFamily: SANS, fontWeight: planCat === k.id ? 700 : 400,
              }}>{tr(k.th)}</button>
          ))}
        </div>
        <div style={{ display: "grid", gap: 5, maxHeight: 260, overflowY: "auto" }}>
          {list.map((it) => {
            const inPlan = plan.includes(it.id);
            const full = plan.length >= cap;
            return (
              <button key={it.id} onClick={() => !inPlan && !full && addToPlan(it)} disabled={inPlan || full}
                style={{
                  background: inPlan ? "#16281D" : C.panel, border: `1px solid ${inPlan ? "#27492F" : C.line}`,
                  borderRadius: 6, padding: "9px 11px", textAlign: "left", cursor: inPlan || full ? "default" : "pointer",
                  opacity: full && !inPlan ? 0.5 : 1, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                }}>
                <span style={{ fontSize: 12, color: C.ink }}>{itemName(it)}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: inPlan ? C.green : C.gold }}>{inPlan ? tr("อยู่ในแผน") : it.cost + "g"}</span>
              </button>
            );
          })}
        </div>

        <button onClick={() => startMatch()} style={{ ...btn(C.gold), color: "#0B1220", fontWeight: 800, marginTop: 14 }}>{tr(
            "เริ่มแมตช์ {0} — {1} ยก ใครถึง {2} ก่อนชนะ",
            tr(mode.th),
            mode.rounds,
            mode.wins
          )}</button>
        <button onClick={() => setPhase("POSITION")} style={{ ...btn(C.panel2), marginTop: 6, fontSize: 12 }}>{tr("กลับไปจัดตำแหน่ง")}</button>
      </Shell>
    );
}
