import { itemName, tr } from "../i18n.js";
import { ITEM_BY_ID } from "../data/items.js";
import React, { useRef, useState } from "react";
import { mini } from "./chrome.jsx";
import { C, MONO, SANS } from "./theme.js";
import { Label } from "./widgets.jsx";

const BLUE = C.blue;   // ทีมคุณ
const RED = C.red;     // คู่แข่ง

const fmt = (n) => (n >= 10000 ? (n / 1000).toFixed(1) + "k" : Math.round(n).toLocaleString("en-US"));

const METRICS = [
  { key: "dealt", th: tr("ดาเมจที่ทำ"), get: (r) => r.dealt, bag: (r) => r.dealtBy },
  { key: "taken", th: tr("ดาเมจที่รับ"), get: (r) => r.taken, bag: (r) => r.takenBy },
  { key: "heal", th: tr("ฮีล"), get: (r) => r.healGiven, bag: (r) => r.healedBy },
  { key: "shield", th: tr("โล่"), get: (r) => r.shieldGiven, bag: () => [] },
];

// "CHAMP|ที่มา" -> อ่านให้เป็นภาษาคน
function readKey(k) {
  const i = k.indexOf("|");
  if (i < 0) return { who: null, what: k };
  return { who: k.slice(0, i), what: k.slice(i + 1) };
}

// ---------------------------------------------------------------
// กราฟเส้นเวลา — ดาเมจสะสม หรือ เลือดรวม ของสองทีม (สเกลเดียว)
// ---------------------------------------------------------------
function TimeChart({ timeline, mode, timeLimit }) {
  const svgRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const W = 600, H = 190, PL = 8, PR = 8, PT = 12, PB = 22;
  const pts = timeline || [];
  if (pts.length < 2) {
    return <div style={{ fontSize: 11, color: C.dim, padding: "18px 0", textAlign: "center" }}>{tr("ยังไม่มีข้อมูลพอวาดกราฟ")}</div>;
  }

  const bKey = mode === "hp" ? "bh" : "bd";
  const rKey = mode === "hp" ? "rh" : "rd";
  const maxV = Math.max(1, ...pts.map((p) => Math.max(p[bKey], p[rKey])));
  const maxT = Math.max(pts[pts.length - 1].t, timeLimit || 0);

  const sx = (t) => PL + (t / maxT) * (W - PL - PR);
  const sy = (v) => PT + (1 - v / maxV) * (H - PT - PB);
  const path = (key) => pts.map((p, i) => `${i ? "L" : "M"}${sx(p.t).toFixed(1)},${sy(p[key]).toFixed(1)}`).join("");

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: maxV * f, y: sy(maxV * f) }));
  const last = pts[pts.length - 1];
  const hov = hoverIdx != null ? pts[Math.max(0, Math.min(pts.length - 1, hoverIdx))] : null;

  const onMove = (e) => {
    const el = svgRef.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - box.left;
    const frac = Math.max(0, Math.min(1, (cx / box.width * W - PL) / (W - PL - PR)));
    const t = frac * maxT;
    let best = 0, bd = Infinity;
    pts.forEach((p, i) => { const d = Math.abs(p.t - t); if (d < bd) { bd = d; best = i; } });
    setHoverIdx(best);
  };

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block", touchAction: "none" }}
        onPointerDown={onMove}
        onPointerMove={(e) => { if (e.buttons || e.pointerType !== "mouse") onMove(e); }}
        onPointerLeave={() => setHoverIdx(null)}
      >
        {ticks.map((tk, i) => (
          <g key={i}>
            <line x1={PL} x2={W - PR} y1={tk.y} y2={tk.y} stroke="#1E2942" strokeWidth="1" />
            <text x={PL + 2} y={tk.y - 3} fill="#5C6B88" fontSize="10" fontFamily={MONO}>{fmt(tk.v)}</text>
          </g>
        ))}
        {[0.25, 0.5, 0.75].map((f) => (
          <text key={f} x={sx(maxT * f)} y={H - 6} fill="#5C6B88" fontSize="10" fontFamily={MONO} textAnchor="middle">
            {Math.round(maxT * f)}s
          </text>
        ))}
        <text x={W - PR} y={H - 6} fill="#5C6B88" fontSize="10" fontFamily={MONO} textAnchor="end">{Math.round(maxT)}s</text>

        <path d={path(rKey)} fill="none" stroke={RED} strokeWidth="2.4" strokeLinejoin="round" />
        <path d={path(bKey)} fill="none" stroke={BLUE} strokeWidth="2.4" strokeLinejoin="round" />

        {/* ป้ายบอกเส้นตรงปลายเส้น ไม่ต้องเดาจากสีอย่างเดียว */}
        {(() => {
          const nearEnd = last.t > maxT * 0.82;
          const lx = nearEnd ? sx(last.t) - 6 : sx(last.t) + 6;
          const anchor = nearEnd ? "end" : "start";
          const up = sy(last[bKey]) <= sy(last[rKey]);
          return (
            <>
              <text x={lx} y={sy(last[bKey]) + (up ? -7 : 12)} fill={BLUE} fontSize="11" fontFamily={SANS} textAnchor={anchor}>{tr("คุณ")}</text>
              <text x={lx} y={sy(last[rKey]) + (up ? 12 : -7)} fill={RED} fontSize="11" fontFamily={SANS} textAnchor={anchor}>{tr("คู่แข่ง")}</text>
            </>
          );
        })()}

        {hov && (
          <g>
            <line x1={sx(hov.t)} x2={sx(hov.t)} y1={PT} y2={H - PB} stroke="#46587C" strokeWidth="1" />
            <circle cx={sx(hov.t)} cy={sy(hov[bKey])} r="4" fill={BLUE} stroke={C.panel} strokeWidth="2" />
            <circle cx={sx(hov.t)} cy={sy(hov[rKey])} r="4" fill={RED} stroke={C.panel} strokeWidth="2" />
          </g>
        )}
      </svg>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", fontFamily: MONO, fontSize: 11, color: C.ink, marginTop: 2, minHeight: 16 }}>
        {hov ? (
          <>
            <span style={{ color: C.dim }}>{hov.t.toFixed(1)}s</span>
            <span><span style={{ color: BLUE }}>■ </span>{fmt(hov[bKey])}{mode === "hp" ? tr(" ({0} ตัว)", hov.ba) : ""}</span>
            <span><span style={{ color: RED }}>■ </span>{fmt(hov[rKey])}{mode === "hp" ? tr(" ({0} ตัว)", hov.ra) : ""}</span>
          </>
        ) : (
          <span style={{ color: C.dim, fontFamily: SANS }}>{tr("แตะ/ลากบนกราฟเพื่อดูค่าแต่ละจังหวะ")}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// แท่งเทียบรายคน + กดเพื่อดูว่าดาเมจมาจากอะไร
// ---------------------------------------------------------------
function MetricBars({ rows, metric, openId, setOpenId }) {
  const m = METRICS.find((x) => x.key === metric);
  const sorted = [...rows].sort((a, b) => m.get(b) - m.get(a));
  const max = Math.max(1, ...sorted.map(m.get));

  return (
    <div>
      {sorted.map((r) => {
        const v = m.get(r);
        const col = r.team === "blue" ? BLUE : RED;
        const open = openId === r.id;
        const bag = m.bag(r) || [];
        const bagTotal = bag.reduce((a, b) => a + b.v, 0) || 1;
        return (
          <div key={r.id} style={{ marginBottom: 2 }}>
            <button
              onClick={() => setOpenId(open ? null : r.id)}
              style={{
                width: "100%", textAlign: "left", background: open ? C.panel2 : "transparent",
                border: `1px solid ${open ? C.line : "transparent"}`, borderRadius: 6,
                padding: "6px 7px", cursor: "pointer", fontFamily: SANS, color: C.ink,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
                <span style={{ fontFamily: MONO, fontSize: 11, color: col, minWidth: 58 }}>{r.champId}</span>
                <span style={{ fontSize: 9.5, color: C.dim, letterSpacing: 0.5 }}>{r.lane}</span>
                <span style={{ fontSize: 9.5, color: C.dim }}>{r.team === "blue" ? tr("· ทีมคุณ") : tr("· คู่แข่ง")}</span>
                {!r.alive && <span style={{ fontSize: 9.5, color: "#5C6B88" }}>{tr("ตาย")}</span>}
                <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 12, color: C.ink }}>{fmt(v)}</span>
              </div>
              <div style={{ background: "#0A101C", borderRadius: 3, height: 8, overflow: "hidden" }}>
                <div style={{ width: `${(v / max) * 100}%`, background: col, height: "100%", borderRadius: "0 4px 4px 0" }} />
              </div>
            </button>

            {open && (
              <div style={{ padding: "6px 8px 10px", borderLeft: `2px solid ${col}`, margin: "2px 0 8px 6px" }}>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.dim, lineHeight: 1.7, marginBottom: 6 }}>
                  <div>{tr(
                      "K/A {0}/{1} · เลือดเหลือ {2}/{3} · Lv{4}",
                      r.kills,
                      r.assists,
                      r.hp,
                      r.maxHp,
                      r.level
                    )}</div>
                  <div>{tr(
                      "ทำ {0} · รับ {1} · ออโต้เข้าเป้า {2}/{3} · หลบได้ {4}",
                      fmt(r.dealt),
                      fmt(r.taken),
                      r.hits,
                      r.shots,
                      r.dodged
                    )}</div>
                  <div>{tr("ฮีลจ่ายออก {0} · รับฮีล {1}", fmt(r.healGiven), fmt(r.healTaken))}</div>
                  <div>{tr(
                      "โล่ที่กาง {0} · โล่กันได้จริง {1}",
                      fmt(r.shieldGiven),
                      fmt(r.shieldAbsorbed)
                    )}</div>
                </div>

                {r.items.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <Label style={{ marginBottom: 3 }}>{tr("ไอเทม")}</Label>
                    <div style={{ fontSize: 10, color: C.ink, lineHeight: 1.6 }}>
                      {r.items.map((id) => itemName(ITEM_BY_ID[id]) || id).join(" · ")}
                    </div>
                  </div>
                )}

                {bag.length > 0 ? (
                  <>
                    <Label style={{ marginBottom: 4 }}>
                      {metric === "taken" ? tr("รับมาจาก") : metric === "heal" ? tr("ฮีลที่ได้รับจาก") : tr("ดาเมจมาจาก")}
                    </Label>
                    {bag.map((b) => {
                      const { who, what } = readKey(b.k);
                      return (
                        <div key={b.k} style={{ marginBottom: 4 }}>
                          <div style={{ display: "flex", gap: 6, fontSize: 10.5, marginBottom: 2 }}>
                            <span style={{ color: C.ink }}>
                              {who ? <span style={{ fontFamily: MONO, color: C.dim }}>{who} · </span> : null}
                              {what}
                            </span>
                            <span style={{ marginLeft: "auto", fontFamily: MONO, color: C.dim }}>
                              {fmt(b.v)} · {Math.round((b.v / bagTotal) * 100)}%
                            </span>
                          </div>
                          <div style={{ background: "#0A101C", borderRadius: 2, height: 5, overflow: "hidden" }}>
                            <div style={{ width: `${(b.v / bag[0].v) * 100}%`, background: col, opacity: 0.75, height: "100%", borderRadius: "0 3px 3px 0" }} />
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div style={{ fontSize: 10.5, color: C.dim }}>
                    {metric === "shield" ? tr("โล่ไม่มีรายละเอียดแยกที่มา") : tr("ยกนี้ไม่มีข้อมูล")}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------
// หน้ากราฟเต็ม — เลือกยกได้ ทั้งยกที่กำลังสู้และยกเก่าๆ
// ---------------------------------------------------------------
export function StatsPanel({ reports, onClose }) {
  const [idx, setIdx] = useState(0);
  const [metric, setMetric] = useState("dealt");
  const [mode, setMode] = useState("dmg");
  const [openId, setOpenId] = useState(null);

  const list = (reports || []).filter(Boolean);
  const i = Math.max(0, Math.min(idx, list.length - 1));
  const rep = list[i];

  const teamSum = (team, f) => (rep ? rep.rows.filter((r) => r.team === team).reduce((a, r) => a + f(r), 0) : 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#070C16", zIndex: 70, display: "flex", flexDirection: "column", fontFamily: SANS }}>
      <div style={{ padding: "12px 12px 8px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.gold, letterSpacing: 1 }}>{tr("สรุปไฟต์")}</span>
            {rep && (
              <span style={{ fontSize: 10.5, color: C.dim }}>
                {rep.live ? tr("กำลังสู้") : rep.iWon ? tr("ชนะ") : tr("แพ้")} · {tr(rep.eventTh)} · {rep.time}s
              </span>
            )}
            <button onClick={onClose} style={{ marginLeft: "auto", ...mini(), width: 32, height: 28, fontSize: 16 }}>×</button>
          </div>

          {list.length > 1 && (
            <div style={{ display: "flex", gap: 4, marginTop: 8, overflowX: "auto", paddingBottom: 2 }}>
              {list.map((r, k) => (
                <button key={k} onClick={() => { setIdx(k); setOpenId(null); }}
                  style={{
                    flex: "0 0 auto", background: k === i ? C.gold : C.panel2, color: k === i ? "#0B1220" : C.ink,
                    border: `1px solid ${C.line}`, borderRadius: 5, padding: "5px 9px", fontSize: 11,
                    cursor: "pointer", fontFamily: SANS, fontWeight: k === i ? 700 : 400,
                  }}>
                  {r.live ? tr("ยกนี้ (สด)") : tr("ยก {0}", r.round)}
                  <span style={{ marginLeft: 6, color: k === i ? "#0B1220" : r.iWon ? C.green : C.red }}>
                    {r.live ? "" : r.iWon ? tr(" ชนะ") : tr(" แพ้")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px 30px" }}>
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          {!rep ? (
            <div style={{ fontSize: 12, color: C.dim, textAlign: "center", padding: "30px 0" }}>{tr("ยังไม่มีไฟต์ให้ดู")}</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {[["dmg", tr("ดาเมจสะสม")], ["hp", tr("เลือดรวมที่เหลือ")]].map(([k, th]) => (
                  <button key={k} onClick={() => setMode(k)}
                    style={{
                      flex: 1, background: mode === k ? C.panel2 : "transparent", color: mode === k ? C.ink : C.dim,
                      border: `1px solid ${mode === k ? C.line : "#1B2439"}`, borderRadius: 5, padding: "6px 0",
                      fontSize: 11, cursor: "pointer", fontFamily: SANS,
                    }}>
                    {th}
                  </button>
                ))}
              </div>

              <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 6px 4px", marginBottom: 10 }}>
                <TimeChart timeline={rep.timeline} mode={mode} timeLimit={rep.timeLimit} />
              </div>

              <div style={{ display: "flex", gap: 10, background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 8, padding: 10, marginBottom: 10, fontFamily: MONO, fontSize: 11.5 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: BLUE, marginBottom: 2 }}>{tr("ทีมคุณ")}</div>
                  <div>{tr("ดาเมจ {0}", fmt(teamSum("blue", (r) => r.dealt)))}</div>
                  <div style={{ color: C.dim }}>{tr(
                      "ฮีล {0} · โล่ {1}",
                      fmt(teamSum("blue", (r) => r.healGiven)),
                      fmt(teamSum("blue", (r) => r.shieldGiven))
                    )}</div>
                </div>
                <div style={{ flex: 1, textAlign: "right" }}>
                  <div style={{ color: RED, marginBottom: 2 }}>{tr("คู่แข่ง")}</div>
                  <div>{tr("ดาเมจ {0}", fmt(teamSum("red", (r) => r.dealt)))}</div>
                  <div style={{ color: C.dim }}>{tr(
                      "ฮีล {0} · โล่ {1}",
                      fmt(teamSum("red", (r) => r.healGiven)),
                      fmt(teamSum("red", (r) => r.shieldGiven))
                    )}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {METRICS.map((m) => (
                  <button key={m.key} onClick={() => setMetric(m.key)}
                    style={{
                      flex: 1, background: metric === m.key ? C.gold : C.panel2, color: metric === m.key ? "#0B1220" : C.ink,
                      border: `1px solid ${C.line}`, borderRadius: 5, padding: "7px 2px", fontSize: 11,
                      cursor: "pointer", fontFamily: SANS, fontWeight: metric === m.key ? 700 : 400,
                    }}>
                    {m.th}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: 10, color: C.dim, marginBottom: 6 }}>{tr("แตะชื่อเพื่อดูว่ามาจากสกิลไหน ไอเทมอะไร")}</div>
              <MetricBars rows={rep.rows} metric={metric} openId={openId} setOpenId={setOpenId} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
