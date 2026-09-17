import { tr } from "../i18n.js";
import React from "react";
import { CHAMPIONS, playsLane } from "../data/champions.js";
import { LANES } from "../data/constants.js";
import { hashStr } from "../engine/util.js";
import { Shell, btn } from "../ui/chrome.jsx";
import { Empty, InfoRow, Panel, Portrait, Tabs, Tile, TileGrid, TwoPane } from "../ui/kit.jsx";
import { C, MONO, SANS } from "../ui/theme.js";
import { Label } from "../ui/widgets.jsx";

// ---------------- CHARACTER INFO ----------------
export function StoreScreen(ctx) {
  const { score, mode, wide, setPhase, storeLane, setStoreLane, inspectId, setInspectId, openSkill } = ctx;

  const lane = storeLane || "TOP";
  // ตัวที่มีเลนรอง (เช่น KAZEM/LUCH ลงป่าได้) ต้องโผล่ในแท็บนั้นด้วย
  const list = Object.values(CHAMPIONS).filter((c) => playsLane(c, lane));
  const ch = CHAMPIONS[inspectId] && playsLane(CHAMPIONS[inspectId], lane)
    ? CHAMPIONS[inspectId]
    : list[0];

  const grid = (
    <Panel style={{ padding: 10 }}>
      <Label style={{ marginBottom: 8 }}>{tr("ตัวละครเลน {0} · {1} ตัว", lane, list.length)}</Label>
      <TileGrid min={92}>
        {list.map((c) => (
          <Tile
            key={c.id}
            title={c.id}
            sub={c.role}
            selected={ch && c.id === ch.id}
            onClick={() => setInspectId(c.id)}
          />
        ))}
      </TileGrid>
      <div style={{ fontSize: 10, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>{tr("หน้านี้ไว้ดูตัวละครและรายละเอียดสกิลเท่านั้น ไม่ได้มีไว้ซื้อ — ทุกตัวเล่นได้อยู่แล้ว")}</div>
    </Panel>
  );

  const info = !ch ? <Empty>{tr("เลนนี้ยังไม่มีตัวละคร")}</Empty> : (
    <Panel>
      <Label style={{ marginBottom: 8 }}>INFO</Label>
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <Portrait text={ch.id.slice(0, 2)} tone={C.gold} size={68} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 800, color: C.ink }}>{ch.id}</div>
          <div style={{ fontSize: 12, color: C.ink }}>{tr(ch.th)}</div>
          <div style={{ fontSize: 10.5, color: C.dim, marginTop: 3, lineHeight: 1.5 }}>
            {ch.role} · {ch.melee ? tr("ประชิด") : tr("ระยะ")} {ch.range}
          </div>
          <div style={{ fontSize: 10, color: C.green, marginTop: 4 }}>{tr("✓ ปลดล็อกแล้ว")}</div>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <InfoRow k={tr("เลือด")} v={`${ch.hp} (+${ch.hpG})`} />
        <InfoRow k={tr("โจมตี")} v={`${ch.ad} (+${ch.adG})`} />
        <InfoRow k={tr("เกราะ / ต้านเวท")} v={`${ch.armor} / ${ch.mr}`} />
      </div>

      <Label style={{ marginBottom: 5 }}>{tr("สกิล — กดดูรายละเอียด")}</Label>
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {ch.skills.map((sk) => (
          <button key={sk.key} onClick={() => openSkill(ch.id, sk.key)}
            style={{
              flex: 1, textAlign: "center", background: C.panel2, border: `1px solid ${C.line}`,
              borderRadius: 6, padding: "6px 3px", cursor: "pointer", fontFamily: SANS, color: C.ink,
            }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: sk.ult ? C.gold : C.ink }}>{sk.key}</div>
            <div style={{ fontSize: 8.5, color: C.dim, marginTop: 2, lineHeight: 1.3 }}>
              {sk.type === "dual" ? sk.light.th + " / " + sk.shadow.th : sk.th}
            </div>
          </button>
        ))}
      </div>

      {ch.passive && (
        <div style={{ background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 7, padding: 9, marginBottom: 10 }}>
          <div style={{ fontSize: 10.5, color: C.gold, fontWeight: 700, marginBottom: 3 }}>{tr("พาสซีฟ · {0}", ch.passive.th)}</div>
          <div style={{ fontSize: 10.5, color: C.dim, lineHeight: 1.55 }}>{tr(ch.passive.desc)}</div>
        </div>
      )}

    </Panel>
  );

  return (
    <Shell round={0} score={score} mode={mode} title="CHARACTER INFO" maxWidth={wide ? 1040 : 620} onBack={() => setPhase("MENU")}>
      <Tabs
        items={LANES.map((l) => ({ id: l, th: l }))}
        value={lane}
        onChange={(id) => { setStoreLane(id); setInspectId(null); }}
      />
      <TwoPane wide={wide} left={grid} right={info} />
      <div style={{ fontSize: 10.5, color: C.dim, marginTop: 10, textAlign: "center", fontFamily: SANS }}>{tr("ตัวที่ลงได้หลายเลนจะโผล่ในทุกแท็บที่ลงได้ — และในเกมจริงเอาไปลงเลนไหนก็ได้")}</div>
    </Shell>
  );
}
