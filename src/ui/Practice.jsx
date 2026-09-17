import { tr } from "../i18n.js";
import React, { useState, useRef, useEffect } from "react";
import { CHAMPIONS } from "../data/champions.js";
import { ARENA_H, ARENA_W, RENDER_SCALE } from "../data/constants.js";
import { applyBuy, slotsUsedBy } from "../data/items.js";
import { DEFAULT_FIGHT } from "../data/tuning.js";
import { buildFight } from "../engine/build-fight.js";
import { autoRanks, emptyRanks } from "../engine/skill-ranks.js";
import { step } from "../engine/step.js";
import { ShopScreen } from "./ShopScreen.jsx";
import { btn, card, mini } from "./chrome.jsx";
import { drawFx, drawFxText, drawGround } from "./draw-fx.js";
import { C, MONO, SANS } from "./theme.js";
import { Label } from "./widgets.jsx";


// ---------------- Practice range ----------------
export const DUMMY_PRESETS = [
  { th: tr("เป้านิ่ง"), hp: 100000, armor: 0, mr: 0 },
  { th: tr("ตัวบาง"), hp: 100000, armor: 60, mr: 45 },
  { th: tr("แทงค์"), hp: 100000, armor: 180, mr: 120 },
];


export function Practice({ onExit, openSkill }) {
  const [champId, setChampId] = useState("ARIEL");
  const [level, setLevel] = useState(18);
  const [items, setItems] = useState([]);
  const [dummyIdx, setDummyIdx] = useState(1);
  const [shopOpen, setShopOpen] = useState(false);
  // ต้องเป็น id ที่มีอยู่จริงใน CATEGORIES ไม่งั้นร้านจะโชว์ 0 ชิ้นทุกหมวดตั้งแต่เปิด
  const [shopCat, setShopCat] = useState("START");
  // ShopScreen ต้องการ state พวกนี้ครบ ไม่งั้นกดค้นหา/กดของ/กดดาว แล้วพัง
  const [shopItem, setShopItem] = useState(null);
  const [shopQuery, setShopQuery] = useState("");
  const [favs, setFavs] = useState([]);
  const [openRecipe, setOpenRecipe] = useState(null);
  const [auto, setAuto] = useState(true);
  const [aiming, _setAiming] = useState(null);
  const [cursor, _setCursor] = useState(null);
  const [targeted, setTargeted] = useState(true);
  const [quick, setQuick] = useState(true);
  const [tick, setTick] = useState(0);
  const [log, setLog] = useState([]);
  const fightRef = useRef(null);
  const canvasRef = useRef(null);
  const dealtRef = useRef(0);
  const buildRef = useRef(null);
  const drawRef = useRef(null);
  const aimRef = useRef(null);
  const curRef = useRef(null);
  const setAiming = (v) => { aimRef.current = v; _setAiming(v); };
  const setCursor = (v) => { curRef.current = v; if (!v) _setCursor(v); };
  const gridRef = useRef(null);

  function build() {
    const ch = CHAMPIONS[champId];
    const me = {
      lane: ch.lane, champId, char: "P", athleteName: tr("คุณ"),
      athlete: { mechanics: 10, gameSense: 10, knowledge: 10, decision: 10, teamwork: 10 },
      style: "POKE", level, items, ranks: autoRanks(level, ch.skillPriority, null),
    };
    const dm = {
      lane: "MID", champId: "KAZEM", char: "D", athleteName: tr("ดัมมี่"),
      athlete: { mechanics: 0, gameSense: 0, knowledge: 0, decision: 0, teamwork: 0 },
      style: "HOLD", level: 1, items: [], ranks: emptyRanks(),
    };
    const st = buildFight([me], [dm], 7, DEFAULT_FIGHT);
    st.timeLimit = 1e9;
    st.rampStart = 1e9;
    const p = st.units[0], d = st.units[1];
    const preset = DUMMY_PRESETS[dummyIdx];
    d.maxHp = preset.hp; d.hp = preset.hp;
    d.baseArmor = preset.armor; d.rawArmor = preset.armor; d.armor = preset.armor;
    d.baseMr = preset.mr; d.mr = preset.mr;
    d.noRegen = true;
    d.manual = { moveTo: null, autoAttack: false, targetId: null, castKey: null, castPoint: null };
    for (const sk of p.skills) sk.cdLeft = 0;
    d.x = ARENA_W * 0.62; d.y = ARENA_H / 2;
    p.x = ARENA_W * 0.34; p.y = ARENA_H / 2;
    p.manual = { moveTo: null, autoAttack: auto, targetId: targeted ? d.id : null, castKey: null, castPoint: null };
    dealtRef.current = 0;
    fightRef.current = st;
    buildRef.current = build;
    setLog([]);
  }

  useEffect(() => { gridRef.current = null; build(); }, [champId, level, items, dummyIdx]);
  useEffect(() => {
    const st = fightRef.current;
    if (st) st.units[0].manual.autoAttack = auto;
  }, [auto]);

  useEffect(() => {
    let stop = false;
    let raf;
    let lastHud = 0;
    const loop = () => {
      if (stop) return;
      const st = fightRef.current;
      if (st) {
        const d = st.units[1];
        const before = d.hp;
        step(st);
        if (d.hp < before) dealtRef.current += before - d.hp;
        if (d.hp < d.maxHp * 0.2) { d.hp = d.maxHp; d.alive = true; }
        if (st.over && buildRef.current) buildRef.current();
        if (drawRef.current) drawRef.current();
        const now = Date.now();
        if (now - lastHud > 120) { lastHud = now; setTick((t) => t + 1); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { stop = true; cancelAnimationFrame(raf); };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toUpperCase();
      if (["Q", "W", "E", "R"].includes(k)) { e.preventDefault(); cast(k); }
      else if (k === "A") { setAuto((v) => !v); }
      else if (k === "S") { const p = fightRef.current && fightRef.current.units[0]; if (p) p.manual.moveTo = null; }
      else if (k === "ESCAPE") setAiming(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tick, quick, aiming, champId, level, dummyIdx]);

  const st = fightRef.current;
  const me = st && st.units[0];
  const dm = st && st.units[1];
  const S = RENDER_SCALE;
  const CW = Math.round(ARENA_W / S), CH = Math.round(ARENA_H / S);

  drawRef.current = () => {
    const cv = canvasRef.current;
    const st = fightRef.current;
    if (!cv || !st) return;
    const me = st.units[0], dm = st.units[1];
    const aiming = aimRef.current, cursor = curRef.current;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = "#0A1120";
    ctx.fillRect(0, 0, CW, CH);

    // ruler grid, drawn once into an offscreen canvas
    if (!gridRef.current) {
      const g = document.createElement("canvas");
      g.width = CW; g.height = CH;
      const gc = g.getContext("2d");
      gc.font = "8px " + MONO;
      gc.textBaseline = "top";
      for (let x = 0; x <= ARENA_W; x += 200) {
        gc.strokeStyle = x % 1000 === 0 ? "#26344F" : "#18223A";
        gc.beginPath(); gc.moveTo(x / S, 0); gc.lineTo(x / S, CH); gc.stroke();
        if (x % 1000 === 0) { gc.fillStyle = "#54628A"; gc.textAlign = "left"; gc.fillText(String(x), x / S + 2, 2); }
      }
      for (let y = 0; y <= ARENA_H; y += 200) {
        gc.strokeStyle = y % 1000 === 0 ? "#26344F" : "#18223A";
        gc.beginPath(); gc.moveTo(0, y / S); gc.lineTo(CW, y / S); gc.stroke();
      }
      gridRef.current = g;
    }
    ctx.drawImage(gridRef.current, 0, 0);
    ctx.font = "8px " + MONO;
    ctx.textBaseline = "top";

    for (const f of st.fields) {
      ctx.save();
      ctx.translate(f.x / S, f.y / S);
      ctx.rotate(Math.atan2(f.ny, f.nx));
      ctx.fillStyle = "rgba(75,141,248,.16)";
      ctx.fillRect(-f.halfLen / S, -f.halfW / S, (f.halfLen * 2) / S, (f.halfW * 2) / S);
      ctx.restore();
    }
    for (const w of st.waves) {
      ctx.save();
      ctx.translate(w.x / S, w.y / S);
      ctx.rotate(Math.atan2(w.ny, w.nx));
      ctx.fillStyle = "rgba(120,190,255,.5)";
      ctx.fillRect(-6, -w.halfW / S, 12, (w.halfW * 2) / S);
      ctx.restore();
    }
    drawGround(ctx, st, S);
    drawFx(ctx, st, S);
    for (const p of st.projectiles) {
      ctx.strokeStyle = p.team === "blue" ? "rgba(140,190,255,1)" : "rgba(255,150,155,1)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x / S, p.y / S);
      ctx.lineTo((p.x - p.dx * 90) / S, (p.y - p.dy * 90) / S);
      ctx.stroke();
    }

    if (me && me.alive) {
      // attack range with a printed number
      ctx.strokeStyle = "rgba(75,141,248,.45)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(me.x / S, me.y / S, me.range / S, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(75,141,248,.9)";
      ctx.textAlign = "center";
      ctx.fillText(tr("ระยะ ") + me.range, me.x / S, (me.y + me.range) / S + 3);

      // ranges of every ability the champion currently has
      const cols = ["#E8A33D", "#3FBF7F", "#B08CFF", "#E5484D"];
      (me.form && me.formSkills ? me.formSkills : me.skills).forEach((sk, i) => {
        const rr = sk.range || sk.dashRange || sk.radius || (sk.radiusByRank && sk.radiusByRank[Math.max(0, sk.rank - 1)]) || 0;
        if (!rr || sk.rank <= 0) return;
        ctx.strokeStyle = cols[i] + "44";
        ctx.beginPath(); ctx.arc(me.x / S, me.y / S, rr / S, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = cols[i] + "cc";
        ctx.textAlign = "left";
        ctx.fillText(sk.key + " " + rr, me.x / S + 3, (me.y - rr) / S);
      });
    }

    // aim preview
    if (me && aiming && cursor) {
      const sk = (me.form && me.formSkills ? me.formSkills : me.skills).find((x) => x.key === aiming);
      if (sk) {
        const ang = Math.atan2(cursor.y - me.y, cursor.x - me.x);
        const reach = sk.range || sk.dashRange || 600;
        const dcur = Math.min(Math.hypot(cursor.x - me.x, cursor.y - me.y), reach);
        const ex = me.x + Math.cos(ang) * dcur, ey = me.y + Math.sin(ang) * dcur;
        ctx.strokeStyle = "rgba(232,163,61,.95)";
        ctx.lineWidth = 2;
        if (sk.width || sk.type === "line" || sk.type === "chargeDash" || sk.type === "wave" || sk.type === "volley") {
          const hw = (sk.width ? sk.width / 2 : 60) / S;
          ctx.save();
          ctx.translate(me.x / S, me.y / S);
          ctx.rotate(ang);
          ctx.fillStyle = "rgba(232,163,61,.16)";
          ctx.fillRect(0, -hw, reach / S, hw * 2);
          ctx.strokeRect(0, -hw, reach / S, hw * 2);
          ctx.restore();
        } else if (sk.type === "cone") {
          const half = ((sk.angle || 45) * Math.PI) / 180 / 2;
          ctx.beginPath();
          ctx.moveTo(me.x / S, me.y / S);
          ctx.arc(me.x / S, me.y / S, reach / S, ang - half, ang + half);
          ctx.closePath();
          ctx.fillStyle = "rgba(232,163,61,.16)";
          ctx.fill(); ctx.stroke();
        } else {
          const rr = (sk.radius || 200) / S;
          ctx.beginPath(); ctx.arc(ex / S, ey / S, rr, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(232,163,61,.16)"; ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(me.x / S, me.y / S); ctx.lineTo(ex / S, ey / S); ctx.stroke();
        }
      }
    }

    if (me && dm) {
      const d = Math.hypot(me.x - dm.x, me.y - dm.y);
      ctx.strokeStyle = "rgba(228,235,247,.35)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(me.x / S, me.y / S); ctx.lineTo(dm.x / S, dm.y / S); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.ink;
      ctx.textAlign = "center";
      ctx.fillText(Math.round(d) + tr(" หน่วย"), (me.x + dm.x) / 2 / S, (me.y + dm.y) / 2 / S - 10);
    }

    for (const u of [dm, me]) {
      if (!u) continue;
      const x = u.x / S, y = u.y / S, r = (u.radius / S) * 1.35;
      ctx.fillStyle = u === me ? C.blue : C.red;
      ctx.globalAlpha = u.buffs && u.buffs.some((b) => b.type === "untargetable") ? 0.35 : 1;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#0B1220";
      ctx.font = "bold 11px " + MONO;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(u === me ? "P" : "D", x, y + 1);
      ctx.textBaseline = "top";
      ctx.font = "8px " + MONO;
    }

    drawFxText(ctx, st, S, true);
  };

  function toPoint(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * ARENA_W,
      y: ((e.clientY - rect.top) / rect.height) * ARENA_H,
    };
  }
  function tap(e) {
    if (!me) return;
    const p = toPoint(e);
    if (aiming) {
      me.manual.castKey = aiming;
      me.manual.castPoint = p;
      setAiming(null);
      return;
    }
    if (dm && Math.hypot(p.x - dm.x, p.y - dm.y) < dm.radius * 2.2) {
      const on = !targeted;
      setTargeted(on);
      me.manual.targetId = on ? dm.id : null;
      return;
    }
    me.manual.moveTo = p;
  }
  function move(e) { if (aiming) setCursor(toPoint(e)); }
  const NO_AIM = ["selfBuff", "aoeSelf", "pulse", "burstShield", "absorbReflect", "formShift", "onHit", "reveal", "dual"];
  function cast(k) {
    if (!me) return;
    const sk = (me.form && me.formSkills ? me.formSkills : me.skills).find((x) => x.key === k);
    if (!sk || sk.rank <= 0 || sk.cdLeft > 0) return;
    if (NO_AIM.includes(sk.type)) { me.manual.castKey = k; me.manual.castPoint = null; setAiming(null); return; }
    if (quick) {
      const at = cursor || (dm ? { x: dm.x, y: dm.y } : null);
      me.manual.castKey = k;
      me.manual.castPoint = at;
      setAiming(null);
      return;
    }
    setAiming(aiming === k ? null : k);
  }

  const skills = me ? (me.form && me.formSkills ? me.formSkills : me.skills) : [];
  const dist2 = me && dm ? Math.round(Math.hypot(me.x - dm.x, me.y - dm.y)) : 0;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: SANS, padding: "12px 12px 40px" }}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: C.gold, fontWeight: 800 }}>{tr("ห้องซ้อม")}</div>
            <div style={{ fontSize: 10, color: C.dim }}>{tr(
              "แตะสนามเพื่อเดิน · แตะดัมมี่เพื่อเปิดปิดการตี · คีย์บอร์ด Q W E R ร่าย · A สลับออโต้ · S หยุดเดิน"
            )}</div>
          </div>
          <button onClick={onExit} style={{ marginLeft: "auto", ...mini(), width: "auto", padding: "0 10px", fontSize: 11 }}>{tr("ออก")}</button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {Object.values(CHAMPIONS).map((ch) => (
            <button key={ch.id} onClick={() => setChampId(ch.id)}
              style={{
                background: champId === ch.id ? C.gold : C.panel2, color: champId === ch.id ? "#0B1220" : C.ink,
                border: `1px solid ${C.line}`, borderRadius: 5, padding: "5px 8px", fontSize: 11,
                cursor: "pointer", fontFamily: SANS,
              }}>{ch.id}</button>
          ))}
        </div>

        <canvas ref={canvasRef} width={CW} height={CH} onClick={tap} onMouseMove={move}
          onTouchMove={(ev) => { const t = ev.touches[0]; if (t) setCursor(toPoint(t)); }}
          style={{ width: "100%", height: "auto", display: "block", borderRadius: 6, border: `1px solid ${C.line}`, cursor: "crosshair" }} />

        {aiming && (
          <div style={{ marginTop: 6, padding: "7px 10px", borderRadius: 6, background: "#2A2210", border: `1px solid ${C.gold}`, fontSize: 11.5, color: C.gold }}>{tr("กำลังเล็ง {0} — แตะสนามตรงจุดที่ต้องการ · กด Esc เพื่อยกเลิก", aiming)}</div>
        )}
        <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
          {skills.map((sk) => (
            <button key={sk.key} onClick={() => cast(sk.key)} disabled={sk.rank <= 0}
              style={{
                flex: 1, background: aiming === sk.key ? C.gold : sk.cdLeft > 0 ? "#141D2E" : C.panel2,
                border: `1px solid ${aiming === sk.key ? C.ink : sk.cdLeft > 0 ? C.line : C.gold}`, borderRadius: 6,
                padding: "8px 2px", color: sk.rank <= 0 ? C.dim : C.ink, fontFamily: SANS,
                cursor: sk.rank > 0 ? "pointer" : "default", opacity: sk.rank > 0 ? 1 : 0.4,
              }}>
              <div style={{ fontFamily: MONO, fontSize: 13, color: sk.ult ? C.gold : C.ink }}>{sk.key}</div>
              <div style={{ fontSize: 8.5, color: C.dim, lineHeight: 1.25 }}>
                {sk.type === "dual" ? (me && me.shadow > 0 ? sk.shadow.th : sk.light.th) : sk.th}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: sk.cdLeft > 0 ? C.gold : C.green }}>
                {sk.rank <= 0 ? tr("ล็อก") : sk.cdLeft > 0 ? sk.cdLeft.toFixed(1) : tr("พร้อม")}
              </div>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <button onClick={() => { setAuto(!auto); }} style={{ ...btn(auto ? C.gold : C.panel2), color: auto ? "#0B1220" : C.ink, flex: 1, fontSize: 11, padding: "7px 0" }}>{tr("ออโต้ {0}", auto ? tr("เปิด") : tr("ปิด"))}</button>
          <button onClick={() => { const on = !targeted; setTargeted(on); if (me) me.manual.targetId = on ? dm.id : null; }}
            style={{ ...btn(targeted ? C.panel2 : "transparent"), flex: 1, fontSize: 11, padding: "7px 0", color: targeted ? C.ink : C.dim }}>
            {targeted ? tr("ล็อกดัมมี่") : tr("ไม่ล็อก")}
          </button>
          <button onClick={() => {
            const p = fightRef.current && fightRef.current.units[0];
            if (p) { for (const sk of p.skills) sk.cdLeft = 0; if (p.formSkills) for (const sk of p.formSkills) sk.cdLeft = 0; p.hp = p.maxHp; }
            dealtRef.current = 0;
          }} style={{ ...btn(C.panel2), flex: 1, fontSize: 11, padding: "7px 0" }}>{tr("รีเซ็ต CD")}</button>
          <button onClick={() => setShopOpen(true)} style={{ ...btn(C.panel2), flex: 1, fontSize: 11, padding: "7px 0", color: C.gold }}>{tr("ของ {0}/6", items.length)}</button>
          <button onClick={() => openSkill && openSkill(champId, "Q", { ranks: { Q: 5, W: 5, E: 5, R: 3 } })}
            style={{ ...btn(C.panel2), flex: 1, fontSize: 11, padding: "7px 0", color: C.blue }}>{tr("ข้อมูลสกิล")}</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button onClick={() => { setQuick(!quick); setAiming(null); }}
            style={{ ...btn(quick ? C.panel2 : "transparent"), flex: 1, fontSize: 11, padding: "7px 0", color: quick ? C.gold : C.dim }}>
            {quick ? tr("กดปุ๊บยิงปั๊บ") : tr("เล็งก่อนยิง")}
          </button>
        </div>

        <div style={{ ...card(), marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Label>{tr("เลเวล")}</Label>
            <button onClick={() => setLevel((l) => Math.max(1, l - 1))} style={mini()}>−</button>
            <span style={{ fontFamily: MONO, fontSize: 14, minWidth: 22, textAlign: "center" }}>{level}</span>
            <button onClick={() => setLevel((l) => Math.min(18, l + 1))} style={mini()}>+</button>
            <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
              {DUMMY_PRESETS.map((p, i) => (
                <button key={p.th} onClick={() => setDummyIdx(i)}
                  style={{
                    background: dummyIdx === i ? C.gold : C.panel2, color: dummyIdx === i ? "#0B1220" : C.ink,
                    border: `1px solid ${C.line}`, borderRadius: 5, padding: "5px 8px", fontSize: 10.5, cursor: "pointer", fontFamily: SANS,
                  }}>{p.th}</button>
              ))}
            </div>
          </div>
          {me && (
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, lineHeight: 1.7 }}>
              {tr("AD {0} · AP {1} · เกราะ {2} · ต้านเวท {3} · HP {4}/{5} · ฟื้นเลือด {6}/5วิ",
                me.ad, me.ap, me.armor, me.mr, Math.round(me.hp), me.maxHp, me.hp5.toFixed(1))}<br />
              {tr("AS {0} · ความเร็ว {1}", (me.asEff || me.atkSpeed).toFixed(2), Math.round(me.msEff || me.moveSpeed))}
              {me.apMs ? tr(" (+{0} จาก AP)", Math.round(me.apMs)) : ""}{tr(" · ระยะ {0}", me.range)}<br />
              <span style={{ color: C.ink }}>{tr("ห่างดัมมี่ {0} หน่วย", dist2)}</span> ·
              {tr(" ดัมมี่ เกราะ {0} ต้านเวท {1} ·", DUMMY_PRESETS[dummyIdx].armor, DUMMY_PRESETS[dummyIdx].mr)}
              <span style={{ color: C.gold }}>{tr("ดาเมจสะสม {0}", Math.round(dealtRef.current))}</span>
              {me.champ.fragments ? ` · ${me.shadow ? "SHADOW 100" : "LIGHT " + Math.floor(me.frag || 0) + "/100"}` : ""}
              {me.form ? tr(" · ร่าง {0}", me.form) : ""}
            </div>
          )}
        </div>

        {shopOpen && me && (
          <ShopScreen
            c={{ lane: me.lane, char: "P", level, gold: 9999, items, champId }}
            cat={shopCat} setCat={setShopCat}
            slotsUsed={slotsUsedBy(items, me.lane)}
            onBuy={(it) => setItems((old) => applyBuy({ lane: me.lane, gold: 9999, items: old }, it).items)}
            onSell={(it) => setItems((old) => old.filter((x) => x.id !== it.id))}
            sellValue={(it) => it.cost}
            openRecipe={openRecipe} setOpenRecipe={setOpenRecipe}
            wide={typeof window !== "undefined" && window.innerWidth >= 820}
            shopItem={shopItem} setShopItem={setShopItem}
            shopQuery={shopQuery} setShopQuery={setShopQuery}
            favs={favs}
            toggleFav={(id) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))}
            onClose={() => setShopOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
