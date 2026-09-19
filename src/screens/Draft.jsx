import { tr } from "../i18n.js";
import React from "react";
import { CHAMPIONS, lanesOf } from "../data/champions.js";
import { BAN_ORDER, PICK_ORDER, draftTurn } from "../game/draft.js";
import { Shell, btn, card } from "../ui/chrome.jsx";
import { ChampFilterBar, LaneHeading, filterChamps, groupByLane } from "../ui/champ-pick.jsx";
import { Empty, Panel, Tile, TileGrid } from "../ui/kit.jsx";
import { C, MONO, SANS } from "../ui/theme.js";
import { Label } from "../ui/widgets.jsx";
import { skillShape } from "../game/skill-desc.js";


// ---------------------------------------------------------------
// โหมดดราฟต์ — ฝั่งเราซ้าย ฝั่งเขาขวา ตารางตัวละครอยู่ตรงกลาง
// Tournament มีแถวแบนอยู่บนสุด · Draft Pick ไม่มีแบน
//
// ลำดับการหยิบเป็น Snake 1-2-2-2-2-1 ตามสเปค
// ฝั่งตรงข้ามเป็นบอท มันจะหยิบทันทีหลังเรากด จึงเห็นผลแบบเรียลไทม์จริงๆ
// ---------------------------------------------------------------
export function DraftScreen(ctx) {
  const {
    score, mode, wide, draft, draftAct, draftBack, setPhase,
    inspectId, setInspectId, openSkill,
    pickQuery, setPickQuery, pickLane, setPickLane,
  } = ctx;

  if (!draft) return null;
  const turn = draftTurn(draft);
  const ch = CHAMPIONS[inspectId] || Object.values(CHAMPIONS)[0];
  const taken = new Set([
    ...draft.bans.map((b) => b.champId),
    ...draft.picks.map((p) => p.champId),
  ]);
  const myPicks = draft.picks.filter((p) => p.side === "A").map((p) => p.champId);
  const foePicks = draft.picks.filter((p) => p.side === "B").map((p) => p.champId);
  const myBans = draft.bans.filter((b) => b.side === "A").map((b) => b.champId);
  const foeBans = draft.bans.filter((b) => b.side === "B").map((b) => b.champId);
  const myTurn = turn && turn.side === "A";
  const done = !turn;

  const slot = (id, tone, i) => (
    <div key={i} style={{
      display: "flex", alignItems: "center", gap: 7, padding: "7px 8px", marginBottom: 5,
      background: id ? C.panel2 : "transparent", border: `1px solid ${id ? tone : C.line}`,
      borderRadius: 6, minHeight: 34,
    }}>
      <span style={{
        width: 24, height: 24, borderRadius: 5, background: id ? tone : "#1A2438",
        color: id ? "#0B1220" : C.dim, fontFamily: MONO, fontSize: 10, fontWeight: 800,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>{id ? id.slice(0, 2) : i + 1}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 800, color: id ? C.ink : C.line }}>
          {id || tr("ยังไม่เลือก")}
        </div>
        {id ? <div style={{ fontSize: 9.5, color: C.dim }}>{lanesOf(CHAMPIONS[id]).join("/")}</div> : null}
      </div>
    </div>
  );

  const banRow = (ids, n, tone) => (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} title={ids[i] || ""} style={{
          width: 30, height: 26, borderRadius: 4, border: `1px solid ${ids[i] ? tone : C.line}`,
          background: ids[i] ? "#1A1016" : "transparent", color: ids[i] ? tone : C.line,
          fontFamily: MONO, fontSize: 9, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center",
          textDecoration: ids[i] ? "line-through" : "none",
        }}>{ids[i] ? ids[i].slice(0, 3) : "—"}</div>
      ))}
    </div>
  );

  const side = (title, tone, picks, bans) => (
    <Panel style={{ padding: 9 }}>
      <Label style={{ color: tone, marginBottom: 7 }}>{title}</Label>
      {draft.style === "TOURNEY" ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9.5, color: C.dim, marginBottom: 3 }}>{tr("แบน")}</div>
          {banRow(bans, 3, C.red)}
        </div>
      ) : null}
      {Array.from({ length: 5 }).map((_, i) => slot(picks[i], tone, i))}
    </Panel>
  );

  const headline = done
    ? tr("ดราฟต์ครบแล้ว")
    : turn.kind === "ban"
      ? (myTurn ? tr("ตาคุณแบน") : tr("ฝ่ายตรงข้ามกำลังแบน"))
      : (myTurn ? tr("ตาคุณเลือก") : tr("ฝ่ายตรงข้ามกำลังเลือก"));

  const stepBar = (() => {
    const order = draft.style === "TOURNEY"
      ? [...BAN_ORDER.map((s) => ({ s, kind: "ban" })), ...PICK_ORDER.map((s) => ({ s, kind: "pick" }))]
      : PICK_ORDER.map((s) => ({ s, kind: "pick" }));
    const at = draft.bans.length + draft.picks.length;
    return (
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 8 }}>
        {order.map((o, i) => (
          <span key={i} style={{
            width: 15, height: 6, borderRadius: 3,
            background: i < at ? (o.s === "A" ? C.blue : C.red) : i === at ? C.gold : "#1E2A42",
          }} />
        ))}
      </div>
    );
  })();

  const shown = filterChamps(pickQuery, pickLane);
  const champTile = (c, keyPrefix) => {
    const out = taken.has(c.id);
    const banned = draft.bans.some((b) => b.champId === c.id);
    return (
      <div key={keyPrefix + c.id} style={{ opacity: out ? 0.32 : 1, position: "relative" }}>
        <Tile
          title={c.id}
          sub={banned ? tr("ถูกแบน") : out ? tr("ถูกเลือกแล้ว") : lanesOf(c).join("/")}
          selected={c.id === ch.id}
          onClick={() => setInspectId(c.id)}
        />
        {banned ? (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.red, fontSize: 22, fontWeight: 900,
          }}>×</div>
        ) : null}
      </div>
    );
  };

  const grid = (
    <Panel style={{ padding: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <Label>{headline}</Label>
        <span style={{ fontFamily: MONO, fontSize: 11, color: done ? C.green : C.gold }}>
          {draft.picks.length}/10
        </span>
      </div>
      {stepBar}

      <ChampFilterBar
        query={pickQuery} setQuery={setPickQuery}
        lane={pickLane} setLane={setPickLane} count={shown.length}
      />

      {!shown.length ? (
        <Empty>{tr("ไม่เจอตัวละครที่ตรงกับที่ค้น")}</Empty>
      ) : pickLane === "ALL" ? (
        groupByLane(shown).map((g) => (
          <div key={g.lane}>
            <LaneHeading lane={g.lane} n={g.list.length} />
            <TileGrid min={88}>{g.list.map((c) => champTile(c, g.lane + "-"))}</TileGrid>
          </div>
        ))
      ) : (
        <TileGrid min={88}>{shown.map((c) => champTile(c, ""))}</TileGrid>
      )}

      <div style={{ fontSize: 10.5, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>
        {tr("แตะการ์ดเพื่ออ่านตัวละคร แล้วกดปุ่มด้านล่างเพื่อยืนยัน · ตัวที่ถูกเลือกหรือถูกแบนไปแล้วหยิบซ้ำไม่ได้")}
      </div>
    </Panel>
  );

  const canAct = !done && myTurn && !taken.has(ch.id);
  const actLabel = done
    ? tr("ไปจัดตำแหน่ง")
    : !myTurn ? tr("รอฝ่ายตรงข้าม")
      : taken.has(ch.id) ? tr("ตัวนี้ถูกหยิบไปแล้ว")
        : turn.kind === "ban" ? tr("แบน {0}", ch.id) : tr("เลือก {0}", ch.id);

  const info = (
    <Panel style={{ padding: 11 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: C.gold }}>{ch.id}</span>
        <span style={{ fontSize: 11.5, color: C.ink }}>{tr(ch.th)}</span>
        <span style={{ marginLeft: "auto", fontSize: 10.5, color: C.dim }}>{tr(ch.role)}</span>
      </div>
      <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 8 }}>
        {lanesOf(ch).join(" / ")} · {ch.melee ? tr("ประชิด") : tr("ระยะไกล")} {ch.range}
      </div>
      <div style={{ ...card(), padding: 8, marginBottom: 8 }}>
        <Label style={{ marginBottom: 4 }}>{tr("พาสซีฟ")} · {ch.passive.th}</Label>
        <div style={{ fontSize: 10.5, color: C.dim, lineHeight: 1.6 }}>{tr(ch.passive.desc)}</div>
      </div>
      <div style={{ display: "grid", gap: 4 }}>
        {ch.skills.map((sk) => (
          <button key={sk.key} onClick={() => openSkill(ch.id, sk.key)}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "6px 8px", borderRadius: 5,
              background: C.panel2, border: "none", width: "100%", textAlign: "left",
              cursor: "pointer", fontFamily: SANS, color: C.ink,
            }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: sk.ult ? C.gold : C.blue, width: 12 }}>{sk.key}</span>
            <span style={{ fontSize: 11, minWidth: 0, flex: 1 }}>{sk.th}</span>
            <span style={{ fontSize: 9.5, color: C.dim }}>{skillShape(sk)}</span>
          </button>
        ))}
      </div>
      <button
        disabled={!canAct && !done}
        onClick={() => (done ? setPhase("POSITION") : draftAct(ch.id))}
        style={{
          ...btn(done ? C.gold : canAct ? (turn.kind === "ban" ? C.red : C.gold) : "#243049"),
          color: done || canAct ? "#0B1220" : C.dim, fontWeight: 800, marginTop: 10,
        }}>{actLabel}</button>
    </Panel>
  );

  return (
    <Shell round={0} score={score} mode={mode}
      title={draft.style === "TOURNEY" ? tr("ทัวร์นาเมนต์ · แบน 3 เลือก 5") : tr("ดราฟต์พิก")}
      maxWidth={wide ? 1180 : 620} onBack={draftBack}>
      {/* ฝั่งเราซ้าย · ตารางตัวละครตรงกลาง · ฝั่งเขาขวา ตามสเปค */}
      {wide ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "178px minmax(0,1fr) 178px", gap: 10, alignItems: "start" }}>
            {side(tr("ทีมคุณ"), C.blue, myPicks, myBans)}
            {grid}
            {side(tr("ฝ่ายตรงข้าม"), C.red, foePicks, foeBans)}
          </div>
          <div style={{ marginTop: 10 }}>{info}</div>
        </>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "start" }}>
            {side(tr("ทีมคุณ"), C.blue, myPicks, myBans)}
            {side(tr("ฝ่ายตรงข้าม"), C.red, foePicks, foeBans)}
          </div>
          <div style={{ marginTop: 10 }}>{grid}</div>
          <div style={{ marginTop: 10 }}>{info}</div>
        </>
      )}
      {draft.log.length ? (
        <div style={{ ...card(), marginTop: 10, maxHeight: 96, overflowY: "auto" }}>
          <Label style={{ marginBottom: 5 }}>{tr("บันทึกการดราฟต์")}</Label>
          {draft.log.slice().reverse().map((l, i) => (
            <div key={i} style={{ fontSize: 10.5, color: i === 0 ? C.ink : C.dim, marginBottom: 2 }}>{l}</div>
          ))}
        </div>
      ) : null}
    </Shell>
  );
}
