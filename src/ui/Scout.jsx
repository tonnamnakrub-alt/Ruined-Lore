import { itemName, tr } from "../i18n.js";
import React from "react";
import { CHAMPIONS } from "../data/champions.js";
import { ItemSlot, mini } from "./chrome.jsx";
import { C, MONO, SANS } from "./theme.js";
import { Bar, Label } from "./widgets.jsx";

// ชื่อไอเทมแบบสั้น — ตัดชื่ออังกฤษหน้า "—" ออก เหลือแต่ชื่อไทย
function shortItem(it) {
  if (!it) return "";
  return itemName(it);
}

function itemValue(c) {
  return (c.items || []).reduce((s, i) => s + (i.cost || 0), 0);
}

function visibleItems(c) {
  // ADC ได้ช่องรองเท้าฟรี เลยแยกออกมาเหมือนหน้าทีมเรา
  return (c.items || []).filter((x) => !(c.lane === "ADC" && x.kind === "boots"));
}

// แถวเดียว = นักแข่งฝ่ายตรงข้ามหนึ่งคน
// prev = ภาพของคนเดียวกันเมื่อยกก่อนหน้า ใช้ไฮไลต์ว่า "ยกที่แล้วเขาเพิ่งได้อะไรมา"
function ScoutRow({ c, unit, prev, onSkill, onStats }) {
  const ch = CHAMPIONS[c.champId];
  const items = visibleItems(c);
  const val = itemValue(c);
  // ของที่เพิ่งซื้อยกที่แล้ว — เทียบจำนวนชิ้นต่อไอดี ไม่ใช่แค่ว่ามีหรือไม่มี
  const fresh = new Set();
  if (prev) {
    const before = {};
    for (const it of prev.items || []) before[it.id] = (before[it.id] || 0) + 1;
    for (const it of items) {
      if (before[it.id] > 0) before[it.id] -= 1;
      else fresh.add(it.id);
    }
  }
  const newRank = (key) => prev && ((c.ranks || {})[key] || 0) > ((prev.ranks || {})[key] || 0);
  const gainedLv = prev ? c.level - prev.level : 0;

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, letterSpacing: 1, color: C.dim, minWidth: 54 }}>{c.lane}</span>
        <span style={{ fontFamily: MONO, fontWeight: 800, color: C.red, fontSize: 14 }}>{c.champId || "—"}</span>
        <span style={{ fontSize: 11, color: C.ink }}>{ch ? tr(ch.th) : ""}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.ink }}>Lv{c.level}</span>
        {gainedLv > 0 ? (
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.green }}>{"+" + gainedLv}</span>
        ) : null}
        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 12, color: C.gold }}>{tr("ของ {0}g", val)}</span>
        {onStats && c.champId ? (
          <button onClick={() => onStats(c)} title={tr("ดูค่าสถานะทั้งหมด")}
            style={{
              background: C.panel2, border: `1px solid ${C.line}`, color: C.blue, borderRadius: 5,
              padding: "3px 8px", fontSize: 10.5, cursor: "pointer", fontFamily: SANS,
            }}>{tr("ค่าสถานะ")}</button>
        ) : null}
      </div>

      <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>
        {ch ? `${ch.role} · ${ch.melee ? tr("ประชิด") : tr("ระยะ")} ${ch.range}` : ""}
        {ch && ch.passive ? tr(" · พาสซีฟ {0}", ch.passive.th) : ""}
      </div>

      {unit && (
        <div style={{ marginTop: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 10, marginBottom: 2 }}>
            <span style={{ color: unit.alive ? C.ink : "#42506E" }}>
              {unit.alive ? `${Math.max(0, Math.round(unit.hp))} / ${Math.round(unit.maxHp)}` : tr("ตายแล้ว")}
              {unit.shield > 0 ? ` (+${Math.round(unit.shield)})` : ""}
            </span>
            <span style={{ color: C.dim }}>
              {Math.round(unit.damageDealt || 0)} dmg · {unit.kills || 0}/{unit.assists || 0}
            </span>
          </div>
          <Bar value={unit.hp} max={unit.maxHp} shield={unit.shield} color={unit.alive ? C.red : "#26314A"} height={4} />
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
        {(ch ? ch.skills : []).map((sk) => {
          const rank = (c.ranks || {})[sk.key] || 0;
          return (
            <button key={sk.key} onClick={() => onSkill && onSkill(c.champId, sk.key, { ranks: c.ranks })}
              style={{
                flex: 1, textAlign: "center", padding: "4px 2px", borderRadius: 4,
                background: rank ? C.panel2 : "#0E1626", cursor: "pointer", fontFamily: SANS, color: C.ink,
                border: `1px solid ${rank ? C.line : "#1B2439"}`, opacity: rank ? 1 : 0.5,
              }}>
              <div style={{ fontFamily: MONO, fontSize: 10.5, color: sk.ult ? C.gold : C.ink }}>{sk.key}</div>
              <div style={{ fontSize: 8.5, color: C.dim, marginTop: 1, lineHeight: 1.25 }}>
                {sk.type === "dual" ? sk.light.th + " / " + sk.shadow.th : sk.th}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 8.5, color: newRank(sk.key) ? C.green : rank ? C.red : "#33415F" }}>
                {rank ? "●".repeat(rank) : tr("ล็อก")}
                {newRank(sk.key) ? " ▲" : ""}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ position: "relative" }}>
            <ItemSlot item={items[i]} />
            {items[i] && fresh.has(items[i].id) ? (
              <span style={{
                position: "absolute", top: -4, right: -3, background: C.green, color: "#0B1220",
                fontFamily: MONO, fontSize: 8, fontWeight: 800, borderRadius: 3, padding: "0 3px",
              }}>{tr("ใหม่")}</span>
            ) : null}
          </div>
        ))}
        {c.lane === "ADC" && (
          <ItemSlot
            dashed
            item={(c.items || []).find((x) => x.kind === "boots")}
            empty={tr("ช่องฟรี")}
          />
        )}
      </div>
    </div>
  );
}

// หน้าส่องทีมคู่แข่ง — เปิดได้ทั้งตอนเตรียมยกและระหว่างไฟต์
export function ScoutPanel({ foe, team, fightState, intel, onClose, onSkill, onStats }) {
  // สเปคใหม่: ส่องแล้วเห็น "ของและสกิลที่เขาเปิดไว้เมื่อยกที่แล้ว" ไม่ใช่ข้อมูลสดของยกนี้
  // ยกแรกจึงยังไม่มีอะไรให้ดู เพราะยังไม่เคยจบยกสักยก
  const roster = intel && intel.roster ? intel.roster : null;
  // ยังไม่มีภาพของยกก่อนหน้า = ภาพที่กำลังดูอยู่คือยกแรก ซึ่งทุกคนเริ่มจากมือเปล่าเลเวล 1
  // เทียบกับของว่างแทนการไม่เทียบเลย ของที่เขาซื้อในยกแรกจึงขึ้นป้าย "ใหม่" ให้เห็นด้วย
  const EMPTY_PREV = { items: [], ranks: {}, level: 1 };
  const prevOf = (lane) =>
    (intel && intel.prev ? intel.prev.find((x) => x.lane === lane) || EMPTY_PREV : EMPTY_PREV);
  if (!roster) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#070C16", zIndex: 60, display: "flex", flexDirection: "column", fontFamily: SANS }}>
        <div style={{ padding: "12px 12px 8px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ maxWidth: 620, margin: "0 auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.red, letterSpacing: 1 }}>{tr("ส่องทีมคู่แข่ง")}</span>
            <button onClick={onClose} style={{ marginLeft: "auto", ...mini(), width: 32, height: 28, fontSize: 16 }}>×</button>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 8 }}>{tr("ยังไม่มีข่าวกรอง")}</div>
            <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.7 }}>
              {tr("การส่องทีมคู่แข่งอ่านได้แค่ของที่เขาเปิดไว้ \"เมื่อยกที่แล้ว\" — ยกแรกจึงยังไม่มีอะไรให้ดู จบยกนี้ก่อนแล้วค่อยกลับมา")}
            </div>
          </div>
        </div>
      </div>
    );
  }
  const foeVal = roster.reduce((s, c) => s + itemValue(c), 0);
  const myVal = (team || []).reduce((s, c) => s + itemValue(c), 0);
  const avg = (list) => (list && list.length ? (list.reduce((s, c) => s + c.level, 0) / list.length).toFixed(1) : "0");
  const diff = foeVal - myVal;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#070C16", zIndex: 60, display: "flex", flexDirection: "column", fontFamily: SANS }}>
      <div style={{ padding: "12px 12px 8px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 620, margin: "0 auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.red, letterSpacing: 1 }}>{tr("ส่องทีมคู่แข่ง")}</span>
          <span style={{ fontSize: 10, color: C.dim }}>
            {tr("ของและสกิลที่เขาเปิดไว้เมื่อจบยกที่ {0}", intel.round)}
          </span>
          <button onClick={onClose} style={{ marginLeft: "auto", ...mini(), width: 32, height: 28, fontSize: 16 }}>×</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px 30px" }}>
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <div style={{ background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <Label style={{ marginBottom: 6 }}>{tr("เทียบทั้งทีม")}</Label>
            <div style={{ display: "flex", gap: 10, fontFamily: MONO, fontSize: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.blue }}>{tr("คุณ")}</div>
                <div style={{ color: C.ink }}>{tr("ของ {0}g", myVal)}</div>
                <div style={{ color: C.dim, fontSize: 11 }}>{tr("เลเวลเฉลี่ย {0}", avg(team))}</div>
              </div>
              <div style={{ flex: 1, textAlign: "right" }}>
                <div style={{ color: C.red }}>{tr("คู่แข่ง")}</div>
                <div style={{ color: C.ink }}>{tr("ของ {0}g", foeVal)}</div>
                <div style={{ color: C.dim, fontSize: 11 }}>{tr("เลเวลเฉลี่ย {0}", avg(foe))}</div>
              </div>
            </div>
            <div style={{ fontSize: 10.5, color: diff > 0 ? C.red : diff < 0 ? C.green : C.dim, marginTop: 6 }}>
              {diff > 0 ? tr("คู่แข่งของแพงกว่า {0}g", diff) : diff < 0 ? tr("คุณของแพงกว่า {0}g", -diff) : tr("มูลค่าของเท่ากัน")}
            </div>
          </div>

          {roster.map((c) => (
            <ScoutRow
              key={c.lane}
              c={c}
              prev={prevOf(c.lane)}
              unit={fightState ? fightState.units.find((u) => u.team === "red" && u.lane === c.lane) : null}
              onSkill={onSkill}
              onStats={onStats}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
