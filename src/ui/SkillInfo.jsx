import React from "react";
import { CHAMPIONS } from "../data/champions.js";
import {
  MAX_RANK, flagLines, flatRows, nextRankGain, rankedRows, ratioLine, skillSentence, skillShape, skillTitle, subSkills,
} from "../game/skill-desc.js";
import { tr } from "../i18n.js";
import { mini } from "./chrome.jsx";
import { Panel } from "./kit.jsx";
import { C, MONO, SANS, STAT_C } from "./theme.js";
import { Label } from "./widgets.jsx";

// แถวค่าตามแรงก์ — แรงก์ที่มีอยู่ตอนนี้ไฮไลต์ทอง แรงก์ถัดไปขอบทอง
function RankRow({ row, rank, max }) {
  if (row.flat) {
    return (
      <div style={{ display: "flex", gap: 8, fontSize: 12.5, padding: "5px 0", borderBottom: `1px solid #162034` }}>
        <span style={{ color: C.dim, flex: 1 }}>{row.label}</span>
        <span style={{ fontFamily: MONO, color: C.ink }}>{fmt(row.values[0], row.fmt)}</span>
      </div>
    );
  }
  return (
    <div style={{ padding: "5px 0", borderBottom: `1px solid #162034` }}>
      <div style={{ fontSize: 12, color: C.dim, marginBottom: 4 }}>{row.label}</div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {row.values.slice(0, max).map((v, i) => {
          const isNow = i + 1 === rank;
          const isNext = i + 1 === rank + 1;
          return (
            <span key={i}
              style={{
                fontFamily: MONO, fontSize: 12.5, padding: "4px 8px", borderRadius: 4,
                background: isNow ? C.gold : isNext ? "#1B2A3F" : "#101827",
                color: isNow ? "#0B1220" : i + 1 <= rank ? C.ink : C.dim,
                border: `1px solid ${isNext ? C.gold : "transparent"}`,
                fontWeight: isNow ? 800 : 400,
              }}>
              {fmt(v, row.fmt)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function fmt(v, f) {
  if (f === "pct") return Math.round(v * 1000) / 10 + "%";
  if (f === "sec") return Math.round(v * 100) / 100 + "s";
  if (f === "deg") return v + "°";
  if (f === "x") return "×" + v;
  return String(Math.round(v * 100) / 100);
}

function SkillBody({ sk, rank }) {
  const max = MAX_RANK(sk);
  const rows = rankedRows(sk);
  const flats = flatRows(sk);
  const ratios = ratioLine(sk);
  const flags = flagLines(sk);
  const gains = nextRankGain(sk, rank);
  const subs = subSkills(sk);

  return (
    <div>
      <div style={{
        background: "#101A2C", border: `1px solid ${C.line}`, borderLeft: `3px solid ${sk.ult ? C.gold : C.blue}`,
        borderRadius: 7, padding: "10px 12px", marginBottom: 10,
      }}>
        <div style={{ fontSize: 14, lineHeight: 1.75, color: C.ink }}>{skillSentence(sk)}</div>
      </div>
      <div style={{ fontSize: 12, color: C.dim, marginBottom: 8 }}>{skillShape(sk)}</div>

      {rank > 0 && rank < max && gains.length > 0 && (
        <div style={{ background: "#12202F", border: `1px solid ${C.gold}`, borderRadius: 7, padding: 9, marginBottom: 10 }}>
          <Label style={{ color: C.gold, marginBottom: 5 }}>{tr("อัพเป็นแรงก์ {0} จะได้", rank + 1)}</Label>
          {gains.map((g) => (
            <div key={g.label} style={{ display: "flex", gap: 8, fontSize: 12.5, padding: "3px 0" }}>
              <span style={{ color: C.dim, flex: 1 }}>{g.label}</span>
              <span style={{ fontFamily: MONO, color: C.dim }}>{g.now}</span>
              <span style={{ color: C.dim }}>→</span>
              <span style={{ fontFamily: MONO, color: g.better ? C.green : C.red, fontWeight: 700 }}>{g.next}</span>
            </div>
          ))}
        </div>
      )}

      {rank === 0 && (
        <div style={{ background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 7, padding: 10, marginBottom: 10, fontSize: 12.5, color: C.dim, lineHeight: 1.65 }}>
          {tr("ยังไม่อัพสกิลนี้ — แรงก์ 1 จะได้ค่าช่องแรกของแต่ละแถวข้างล่าง")}
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <Label style={{ marginBottom: 4 }}>{tr("ค่าตามแรงก์ 1-{0}", max)}</Label>
          {rows.map((r) => <RankRow key={r.key} row={r} rank={rank} max={max} />)}
        </div>
      )}

      {ratios && (
        <div style={{ fontSize: 12.5, color: C.blue, marginBottom: 10, lineHeight: 1.65 }}>
          {tr("สเกลตามสถานะ")}: {ratios}
        </div>
      )}

      {flats.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <Label style={{ marginBottom: 4 }}>{tr("ค่าคงที่")}</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px" }}>
            {flats.map((f) => (
              <span key={f.label} style={{ fontSize: 12, color: C.dim }}>
                {f.label} <span style={{ fontFamily: MONO, color: C.ink }}>{f.value}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {flags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
          {flags.map((f) => (
            <span key={f} style={{
              fontSize: 10, color: C.gold, border: `1px solid ${C.line}`,
              borderRadius: 4, padding: "2px 6px", background: C.panel2,
            }}>{f}</span>
          ))}
        </div>
      )}

      {subs.length > 0 && subs.map((s) => (
        <div key={s.tag} style={{ border: `1px solid ${C.line}`, borderRadius: 7, padding: 9, marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 5 }}>
            {s.tag} · {s.sk.th}
          </div>
          <div style={{ fontSize: 12, color: C.dim, marginBottom: 6 }}>{skillShape(s.sk)}</div>
          {rankedRows(s.sk).map((r) => <RankRow key={r.key} row={r} rank={rank} max={MAX_RANK(sk)} />)}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 14px", marginTop: 5 }}>
            {flatRows(s.sk).map((f) => (
              <span key={f.label} style={{ fontSize: 12, color: C.dim }}>
                {f.label} <span style={{ fontFamily: MONO, color: C.ink }}>{f.value}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------
// โมดัลข้อมูลสกิล — เปิดได้จากทุกหน้า สลับ Q/W/E/R ในตัว
// view = { champId, key, ranks?, onUpgrade?, canUpgrade? }
// ---------------------------------------------------------------
// ค่าสถานะตัวละครที่จะโชว์คู่กับสกิล — เรียงตามความสำคัญ ใช้สีชุดเดียวกับหน้าไอเทม
const STAT_ROWS = [
  ["maxHp", "HP"], ["ad", "AD"], ["ap", "AP"], ["armor", "เกราะ"], ["mr", "ต้านเวท"],
  ["atkSpeed", "ความเร็วโจมตี"], ["ah", "Ability Haste"], ["moveSpeed", "ความเร็วเดิน"],
  ["crit", "โอกาสคริ"], ["pen", "เจาะเกราะ/ต้านเวท"], ["range", "ระยะ"],
];

function StatBoard({ stats, level }) {
  if (!stats) return null;
  const fmt = (k, v) => {
    if (k === "atkSpeed") return v.toFixed(2) + "/s";
    if (k === "crit") return Math.round(v * 100) + "%";
    return Math.round(v);
  };
  const rows = STAT_ROWS.filter(([k]) => stats[k]);
  if (!rows.length) return null;
  return (
    <Panel style={{ marginBottom: 10 }}>
      <Label style={{ marginBottom: 7 }}>{tr("ค่าสถานะตอนนี้ (เลเวล {0})", level)}</Label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))", gap: "4px 12px" }}>
        {rows.map(([k, label]) => (
          <div key={k} style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 12.5 }}>
            <span style={{ color: C.dim, flex: 1, minWidth: 0 }}>{tr(label)}</span>
            <span style={{ fontFamily: MONO, fontWeight: 700, color: STAT_C[k] || C.ink }}>
              {fmt(k, stats[k])}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}


export function SkillModal({ view, onPick, onClose }) {
  if (!view) return null;
  const ch = CHAMPIONS[view.champId];
  if (!ch) return null;
  const sk = ch.skills.find((s) => s.key === view.key) || ch.skills[0];
  const ranks = view.ranks || {};
  const rank = ranks[sk.key] || 0;
  const max = MAX_RANK(sk);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#070C16", zIndex: 80, display: "flex", flexDirection: "column", fontFamily: SANS }}>
      <div style={{ padding: "12px 12px 8px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: MONO, fontWeight: 800, color: C.blue, fontSize: 14 }}>{ch.id}</span>
            <span style={{ fontSize: 11, color: C.dim }}>{tr(ch.th)}</span>
            <button onClick={onClose} style={{ marginLeft: "auto", ...mini(), width: 32, height: 28, fontSize: 16 }}>×</button>
          </div>

          <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
            {ch.skills.map((s) => {
              const on = s.key === sk.key;
              const r = ranks[s.key] || 0;
              return (
                <button key={s.key} onClick={() => onPick(s.key)}
                  style={{
                    flex: 1, background: on ? C.gold : C.panel2, color: on ? "#0B1220" : C.ink,
                    border: `1px solid ${on ? C.gold : C.line}`, borderRadius: 6, padding: "6px 3px",
                    cursor: "pointer", fontFamily: SANS,
                  }}>
                  <div style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 800 }}>{s.key}</div>
                  <div style={{ fontSize: 8.5, marginTop: 1, lineHeight: 1.25, opacity: on ? 0.85 : 0.7 }}>
                    {skillTitle(s)}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, color: on ? "#0B1220" : r ? C.blue : "#33415F" }}>
                    {r ? "●".repeat(r) : tr("ล็อก")}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px 30px" }}>
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <StatBoard stats={view.stats} level={view.level} />
          <Panel>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
              <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 800, color: sk.ult ? C.gold : C.ink }}>{sk.key}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{skillTitle(sk)}</span>
              <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 11, color: rank ? C.blue : C.dim }}>
                {tr("แรงก์ {0}/{1}", rank, max)}
              </span>
            </div>
            <div style={{ height: 8 }} />
            <SkillBody sk={sk} rank={rank} />

            {view.onUpgrade && (
              <button
                disabled={!view.canUpgrade}
                onClick={() => view.onUpgrade(sk.key)}
                style={{
                  width: "100%", marginTop: 4, padding: "11px 10px", borderRadius: 7, cursor: view.canUpgrade ? "pointer" : "default",
                  background: view.canUpgrade ? C.gold : "#121A2A", color: view.canUpgrade ? "#0B1220" : C.dim,
                  border: `1px solid ${view.canUpgrade ? C.gold : C.line}`, fontFamily: SANS, fontSize: 13, fontWeight: 800,
                }}>
                {rank >= max
                  ? tr("แรงก์เต็มแล้ว")
                  : view.canUpgrade
                    ? tr("UPGRADE → แรงก์ {0}", rank + 1)
                    : tr("ยังอัพไม่ได้ — ต้องมีแต้มสกิลและเลเวลถึงก่อน")}
              </button>
            )}
          </Panel>

          {ch.passive && (
            <Panel style={{ marginTop: 10 }}>
              <Label style={{ color: C.gold, marginBottom: 5 }}>{tr("พาสซีฟ · {0}", ch.passive.th)}</Label>
              <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6 }}>{tr(ch.passive.desc)}</div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
