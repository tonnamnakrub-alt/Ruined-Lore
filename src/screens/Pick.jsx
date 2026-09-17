import { tr } from "../i18n.js";
import React from "react";
import { CHAMPIONS } from "../data/champions.js";
import { emptyRanks } from "../engine/skill-ranks.js";
import { Shell, btn } from "../ui/chrome.jsx";
import { Empty, InfoRow, Panel, Portrait, Tile, TileGrid, TwoPane } from "../ui/kit.jsx";
import { C, MONO, SANS } from "../ui/theme.js";
import { Label } from "../ui/widgets.jsx";

const ORDER_KEYS = ["Q", "W", "E"];
const NTH = ["1st", "2nd", "3rd"];

// ---------------- PICK: ตารางตัวละคร + Character Info ----------------
export function PickScreen(ctx) {
  const {
    score, mode, wide, team, setTeam, setPhase, setDraftPool, setHeldChamp,
    inspectId, setInspectId, skillOrders, setSkillOrders, priorityOf, openSkill,
  } = ctx;

  const picked = team.map((c) => c.champId).filter(Boolean);
  const full = new Set(picked).size === 5;
  const ch = CHAMPIONS[inspectId] || CHAMPIONS[picked[0]] || Object.values(CHAMPIONS)[0];
  const order = priorityOf(ch.id);
  const isPicked = picked.includes(ch.id);

  function toggle(id) {
    setTeam((t) => {
      const cur = t.map((c) => c.champId);
      if (cur.includes(id)) return t.map((c) => (c.champId === id ? { ...c, champId: null } : c));
      const free = t.findIndex((c) => !c.champId);
      if (free < 0) return t;
      return t.map((c, i) => (i === free ? { ...c, champId: id, ranks: emptyRanks() } : c));
    });
  }

  function cycleSlot(i) {
    const next = [...order];
    const used = next.filter((_, k) => k !== i);
    // เลื่อนไปคีย์ถัดไปที่ยังไม่ถูกใช้ในช่องอื่น
    let k = ORDER_KEYS.indexOf(next[i]);
    for (let step = 0; step < ORDER_KEYS.length; step++) {
      k = (k + 1) % ORDER_KEYS.length;
      if (!used.includes(ORDER_KEYS[k])) break;
    }
    next[i] = ORDER_KEYS[k];
    setSkillOrders((s) => ({ ...s, [ch.id]: next }));
  }

  const grid = (
    <Panel style={{ padding: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <Label>{tr("เลือกมา 5 ตัว")}</Label>
        <span style={{ fontFamily: MONO, fontSize: 11, color: full ? C.green : C.gold }}>
          {new Set(picked).size}/5
        </span>
      </div>
      <TileGrid min={92}>
        {Object.values(CHAMPIONS).map((c) => {
          const idx = picked.indexOf(c.id);
          return (
            <Tile
              key={c.id}
              title={c.id}
              sub={`${c.lane} · ${c.melee ? tr("ประชิด") : tr("ระยะ")}`}
              badge={idx >= 0 ? idx + 1 : null}
              selected={c.id === ch.id}
              onClick={() => setInspectId(c.id)}
            />
          );
        })}
      </TileGrid>
      <div style={{ fontSize: 10, color: C.dim, marginTop: 8 }}>{tr("แตะกล่องเพื่อดูข้อมูล แล้วกดปุ่มด้านขวาเพื่อเลือกเข้าทีม")}</div>
    </Panel>
  );

  const info = !ch ? <Empty>{tr("ยังไม่ได้เลือกตัวละคร")}</Empty> : (
    <Panel>
      <Label style={{ marginBottom: 8 }}>CHARACTER INFO</Label>

      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <Portrait text={ch.id.slice(0, 2)} tone={isPicked ? C.gold : C.blue} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 800, color: C.ink }}>{ch.id}</div>
          <div style={{ fontSize: 12, color: C.ink }}>{tr(ch.th)}</div>
          <div style={{ fontSize: 10.5, color: C.dim, marginTop: 3, lineHeight: 1.5 }}>{tr(
              "{0} · {1} {2} · เลนถนัด {3}",
              ch.role,
              ch.melee ? tr("ประชิด") : tr("ระยะ"),
              ch.range,
              ch.lane
            )}</div>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <InfoRow k={tr("เลือด")} v={tr("{0} (+{1}/เลเวล)", ch.hp, ch.hpG)} />
        <InfoRow k={tr("โจมตี")} v={tr("{0} (+{1}/เลเวล)", ch.ad, ch.adG)} />
        <InfoRow k={tr("เกราะ / ต้านเวท")} v={`${ch.armor} / ${ch.mr}`} />
        <InfoRow k={tr("ความเร็วตี")} v={tr("{0} (+{1}/เลเวล)", ch.as, ch.asG)} />
        <InfoRow k={tr("ความเร็วเดิน")} v={ch.ms} />
      </div>

      {ch.passive && (
        <div style={{ background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 7, padding: 9, marginBottom: 10 }}>
          <div style={{ fontSize: 10.5, color: C.gold, fontWeight: 700, marginBottom: 3 }}>{tr("พาสซีฟ · {0}", ch.passive.th)}</div>
          <div style={{ fontSize: 10.5, color: C.dim, lineHeight: 1.55 }}>{tr(ch.passive.desc)}</div>
        </div>
      )}

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
            <div style={{ fontSize: 8, color: C.gold, marginTop: 2 }}>{tr("ดูข้อมูล")}</div>
          </button>
        ))}
      </div>

      {/* ลำดับอัพสกิล — ตรงกับช่อง 1st _ _ _ ในสเก็ตช์ */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Label>{tr("ลำดับอัพสกิล")}</Label>
        <button
          onClick={() => setSkillOrders((s) => {
            const n = { ...s };
            delete n[ch.id];
            return n;
          })}
          style={{
            marginLeft: "auto", background: C.panel2, border: `1px solid ${C.line}`, color: C.gold,
            borderRadius: 5, padding: "4px 9px", fontSize: 10, cursor: "pointer", fontFamily: SANS,
          }}>{tr("UPGRADE · ค่าแนะนำ")}</button>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
        {NTH.map((nth, i) => (
          <button key={nth} onClick={() => cycleSlot(i)}
            style={{
              flex: 1, background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 6,
              padding: "7px 4px", cursor: "pointer", fontFamily: SANS, color: C.ink,
            }}>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: 1 }}>{nth}</div>
            <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: C.gold }}>{order[i]}</div>
          </button>
        ))}
        <div style={{ flex: 1, textAlign: "center", alignSelf: "center" }}>
          <div style={{ fontSize: 9, color: C.dim, letterSpacing: 1 }}>ULT</div>
          <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: C.dim }}>R</div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: C.dim, marginBottom: 12, lineHeight: 1.5 }}>{tr("แตะช่องเพื่อสลับสกิล · R อัพให้อัตโนมัติทุกครั้งที่ถึงเลเวล")}</div>

      <button onClick={() => toggle(ch.id)}
        style={{
          ...btn(isPicked ? C.panel2 : C.gold),
          color: isPicked ? C.red : "#0B1220", fontWeight: 800,
          borderColor: isPicked ? C.red : C.gold,
        }}>
        {isPicked ? tr("เอาออกจากทีม") : new Set(picked).size >= 5 ? tr("ทีมเต็มแล้ว") : tr("เลือกเข้าทีม")}
      </button>
    </Panel>
  );

  return (
    <Shell round={0} score={score} mode={mode} title="PICK" maxWidth={wide ? 1040 : 620} onBack={() => setPhase("SETUP")}>
      <TwoPane wide={wide} left={grid} right={info} />

      <button disabled={!full}
        onClick={() => {
          setDraftPool(picked);
          setTeam((t) => t.map((c) => ({ ...c, champId: null, ranks: emptyRanks() })));
          setHeldChamp(null);
          setPhase("POSITION");
        }}
        style={{ ...btn(full ? C.gold : "#243049"), color: full ? "#0B1220" : C.dim, fontWeight: 800, marginTop: 12 }}>
        {full ? tr("ไปจัดตำแหน่ง") : tr("เลือกอีก {0} ตัว", 5 - new Set(picked).size)}
      </button>
      <button onClick={() => setPhase("SETUP")} style={{ ...btn(C.panel2), marginTop: 6, fontSize: 12 }}>{tr("กลับไปแก้ค่านักแข่ง")}</button>
      {skillOrders && Object.keys(skillOrders).length > 0 && (
        <div style={{ fontSize: 10, color: C.dim, marginTop: 8, textAlign: "center" }}>{tr("ตั้งลำดับอัพสกิลเองไว้ {0} ตัว", Object.keys(skillOrders).length)}</div>
      )}
    </Shell>
  );
}
