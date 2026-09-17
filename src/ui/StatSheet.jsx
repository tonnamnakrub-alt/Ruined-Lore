import { itemName, tr } from "../i18n.js";
import React from "react";
import { CHAMPIONS } from "../data/champions.js";
import { STAT_KEYS } from "../data/constants.js";
import { STAT_SHORT } from "../game/roster.js";
import { mini } from "./chrome.jsx";
import { C, MONO, SANS, STAT_C } from "./theme.js";
import { Panel } from "./kit.jsx";
import { Label } from "./widgets.jsx";


// ค่าหลักที่ทุกตัวมี — โชว์เสมอถึงจะเป็นศูนย์ จะได้เทียบกันได้
const CORE = [
  ["maxHp", "HP", (v) => Math.round(v)],
  ["ad", "AD", (v) => Math.round(v)],
  ["ap", "AP", (v) => Math.round(v)],
  ["armor", "เกราะ", (v) => Math.round(v)],
  ["mr", "ต้านเวท", (v) => Math.round(v)],
  ["atkSpeed", "ความเร็วโจมตี", (v) => v.toFixed(2) + "/s"],
  ["crit", "โอกาสคริ", (v) => Math.round(v * 100) + "%"],
  ["moveSpeed", "ความเร็วเดิน", (v) => Math.round(v)],
  ["range", "ระยะโจมตี", (v) => Math.round(v)],
];

// ค่าเสริม — โชว์เฉพาะที่ไม่เป็นศูนย์ ไม่งั้นรกตา
const EXTRA = [
  ["ah", "Ability Haste", (v) => Math.round(v)],
  ["itemHaste", "เร่งคูลดาวน์ไอเทม", (v) => Math.round(v)],
  ["pen", "เจาะเกราะ/ต้านเวท", (v) => Math.round(v)],
  ["armorPenPct", "เจาะเกราะ %", (v) => Math.round(v * 100) + "%"],
  ["mrPenPct", "เจาะต้านเวท %", (v) => Math.round(v * 100) + "%"],
  ["critDmg", "ดาเมจคริเพิ่ม", (v) => "+" + Math.round(v * 100) + "%"],
  ["omnivampFlat", "ดูดเลือดทุกทาง", (v) => Math.round(v * 100) + "%"],
  ["healAmp", "รับฮีล/โล่เพิ่ม", (v) => Math.round(v * 100) + "%"],
  ["hors", "พลังฮีล/โล่ที่จ่ายออก", (v) => Math.round(v * 100) + "%"],
  ["tenacity", "ต้านสถานะ", (v) => Math.round(v * 100) + "%"],
  ["ultCdr", "ลดคูลดาวน์อัลติ", (v) => Math.round(v * 100) + "%"],
  ["regenPct", "ฟื้นเลือดต่อวิ", (v) => Math.round(v * 100) + "%"],
  ["dmgReduceAuto", "ลดดาเมจออโต้", (v) => Math.round(v * 100) + "%"],
  ["hp5", "ฟื้นเลือดนอกคอมแบต", (v) => Math.round(v) + "/s"],
  ["bonusHp", "Bonus HP", (v) => Math.round(v)],
  ["bonusAd", "Bonus AD", (v) => Math.round(v)],
];


function Row({ label, value, k }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 13, padding: "3px 0" }}>
      <span style={{ color: C.dim, flex: 1, minWidth: 0 }}>{tr(label)}</span>
      <span style={{ fontFamily: MONO, fontWeight: 700, color: STAT_C[k] || C.ink }}>{value}</span>
    </div>
  );
}


// ---------------- แผงค่าสถานะของนักแข่งหนึ่งคน ----------------
export function StatSheetModal({ view, onClose }) {
  if (!view) return null;
  const ch = CHAMPIONS[view.champId];
  const st = view.stats || {};
  if (!ch) return null;
  const extras = EXTRA.filter(([k]) => st[k]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#070C16", zIndex: 80,
      display: "flex", flexDirection: "column", fontFamily: SANS,
    }}>
      <div style={{ padding: "12px 12px 8px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 620, margin: "0 auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: MONO, fontWeight: 800, color: C.blue, fontSize: 16 }}>{ch.id}</span>
          <span style={{ fontSize: 12, color: C.dim }}>{tr(ch.th)}</span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.ink }}>Lv{view.level}</span>
          <span style={{ fontSize: 11, color: C.dim, letterSpacing: 1 }}>{view.lane}</span>
          <button onClick={onClose} style={{ marginLeft: "auto", ...mini(), width: 32, height: 28, fontSize: 16 }}>×</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <Panel style={{ marginBottom: 10 }}>
            <Label style={{ marginBottom: 6 }}>{tr("ค่าสถานะ (รวมไอเทมแล้ว)")}</Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0 18px" }}>
              {CORE.map(([k, label, f]) => (
                <Row key={k} k={k} label={label} value={st[k] != null ? f(st[k]) : "—"} />
              ))}
            </div>
          </Panel>

          {extras.length > 0 && (
            <Panel style={{ marginBottom: 10 }}>
              <Label style={{ marginBottom: 6 }}>{tr("ค่าเสริมจากไอเทมและพาสซีฟ")}</Label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0 18px" }}>
                {extras.map(([k, label, f]) => <Row key={k} k={k} label={label} value={f(st[k])} />)}
              </div>
            </Panel>
          )}

          {view.athlete && (
            <Panel style={{ marginBottom: 10 }}>
              <Label style={{ marginBottom: 6 }}>{tr("ค่าสถานะนักแข่ง")}</Label>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {STAT_KEYS.map((k) => (
                  <div key={k} style={{ textAlign: "center", minWidth: 44 }}>
                    <div style={{ fontFamily: MONO, fontSize: 16, color: C.ink }}>{view.athlete[k]}</div>
                    <div style={{ fontSize: 9.5, color: C.dim, letterSpacing: 0.5 }}>{STAT_SHORT[k]}</div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel>
            <Label style={{ marginBottom: 6 }}>{tr("ไอเทมที่ถืออยู่")}</Label>
            {(view.items || []).length === 0 ? (
              <div style={{ fontSize: 12, color: C.dim }}>{tr("ยังไม่มีไอเทม")}</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {view.items.map((it, i) => (
                  <span key={it.id + i} style={{
                    fontSize: 11.5, color: C.ink, background: C.panel2,
                    border: `1px solid ${C.line}`, borderRadius: 5, padding: "5px 9px",
                  }}>{itemName(it)}</span>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <div style={{ padding: 12, borderTop: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <button onClick={onClose} style={{
            width: "100%", background: C.panel2, border: `1px solid ${C.line}`, color: C.ink,
            borderRadius: 6, padding: "10px 12px", cursor: "pointer", fontFamily: SANS, fontSize: 13,
          }}>{tr("ปิดหน้าต่าง")}</button>
        </div>
      </div>
    </div>
  );
}
