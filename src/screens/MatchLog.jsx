import React from "react";
import { tr } from "../i18n.js";
import { CHAMPIONS } from "../data/champions.js";
import { ITEM_BY_ID } from "../data/items.js";
import { BUILD_LABEL } from "../data/patches.js";
import { aggregate, clearLog, exportText, importText, readLog, writeLog } from "../game/matchlog.js";
import { Shell, btn, card } from "../ui/chrome.jsx";
import { C, MONO } from "../ui/theme.js";
import { Label } from "../ui/widgets.jsx";

// เกณฑ์เดียวกับที่ใช้ปรับบาลานซ์อยู่ — 49-51 กำลังดี · 47-53 ปรับเล็กน้อย
function verdict(wr, n, margin) {
  if (n < 5) return { icon: "·", th: tr("ยังน้อยเกินไป"), color: C.line };
  const off = Math.abs(wr - 50);
  if (off < margin) return { icon: "·", th: tr("ยังไม่ชัด"), color: C.dim };
  if (off <= 1) return { icon: "🟢", th: tr("กำลังดี"), color: C.green };
  if (off <= 3) return { icon: "🟡", th: tr("ปรับเล็กน้อย"), color: C.gold };
  return { icon: wr > 50 ? "🔴" : "🔵", th: wr > 50 ? tr("แรงไป") : tr("อ่อนไป"), color: wr > 50 ? C.red : C.blue };
}

const champName = (id) => tr((CHAMPIONS[id] || {}).th || id);
const itemName = (id) => { const i = ITEM_BY_ID[id]; return i ? tr(i.th).split(" — ").pop() : id; };

// หน้าจออื่นในโปรเจกต์ถูกเรียกเป็นฟังก์ชันธรรมดาจาก render ของ App
// (MenuScreen(ctx) ไม่ใช่ <MenuScreen/>) ซึ่งทำได้เพราะไม่มีหน้าไหนใช้ hooks เลย
// หน้านี้ใช้ ถ้าเรียกแบบเดียวกัน hooks จะไปนับรวมเป็นของ App
// แล้วพอเปลี่ยนหน้าจำนวน hooks ก็เปลี่ยน React ล้มทันที (error #310)
// จึงต้องคืนเป็นอีลิเมนต์ ให้ hooks อยู่ในคอมโพเนนต์ของตัวเอง — แบบเดียวกับ Practice
export function MatchLogScreen(ctx) {
  return <MatchLogView ctx={ctx} />;
}

function MatchLogView({ ctx }) {
  const { setPhase, score, mode, round, streak } = ctx;
  const [rows, setRows] = React.useState(() => readLog());
  const [pvpOnly, setPvpOnly] = React.useState(false);
  const [thisPatch, setThisPatch] = React.useState(true);
  const [tab, setTab] = React.useState("champs");
  const [note, setNote] = React.useState("");
  const fileRef = React.useRef(null);

  const here = BUILD_LABEL;
  const a = aggregate(rows, { pvpOnly, patch: thisPatch ? here : null });
  const margin = a.margin || 0;

  function save() {
    const blob = new Blob([exportText(rows)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = "sideline-matchlog-" + new Date().toISOString().slice(0, 10) + ".json";
    el.click();
    URL.revokeObjectURL(url);
    setNote(tr("ส่งออก {0} แมตช์แล้ว", rows.length));
  }

  function load(ev) {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const res = importText(String(r.result), rows);
      if (!res.ok) { setNote(tr("นำเข้าไม่สำเร็จ — {0}", res.why)); return; }
      writeLog(res.rows);
      setRows(res.rows);
      setNote(tr("นำเข้าเพิ่ม {0} แมตช์ · ข้ามที่ซ้ำ {1}", res.added, res.skipped));
    };
    r.readAsText(f);
    ev.target.value = "";
  }

  function wipe() {
    if (!window.confirm(tr("ลบสมุดบันทึกทั้งหมด {0} แมตช์ กู้คืนไม่ได้", rows.length))) return;
    clearLog();
    setRows([]);
    setNote(tr("ลบสมุดแล้ว"));
  }

  const Toggle = ({ on, onClick, children }) => (
    <button onClick={onClick} style={{
      ...btn(on ? C.gold : C.panel2), color: on ? "#1a1407" : C.dim,
      fontSize: 11, padding: "5px 10px", width: "auto",
    }}>{children}</button>
  );

  return (
    <Shell round={round} score={score} mode={mode} streak={streak}
      title={tr("สถิติจากการเล่นจริง")} onBack={() => setPhase("MENU")} maxWidth={760}>

      <div style={{ ...card(), marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.7 }}>
          {tr("ทุกแมตช์ที่เล่นจบจะถูกจดไว้ในเครื่องนี้เอง — เล่นตัวอะไร เลนไหน ออกของอะไร แพ้หรือชนะ")}
          <br />
          {tr("ตัวเลขบาลานซ์ที่ใช้อยู่ทุกวันนี้มาจากบอทตีกันเองล้วน สมุดนี้คือฝั่งที่มาจากคนจริง")}
        </div>
      </div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
        <Toggle on={pvpOnly} onClick={() => setPvpOnly((v) => !v)}>
          {pvpOnly ? tr("เฉพาะเจอคนจริง") : tr("รวมแมตช์เจอบอท")}
        </Toggle>
        <Toggle on={thisPatch} onClick={() => setThisPatch((v) => !v)}>
          {thisPatch ? tr("เฉพาะแพตช์ {0}", here) : tr("ทุกแพตช์รวมกัน")}
        </Toggle>
      </div>

      {!thisPatch && a.patches.length > 1 && (
        <div style={{ ...card(), borderColor: C.gold, marginBottom: 12, fontSize: 11.5, color: C.gold }}>
          {tr("กำลังรวมข้อมูลจาก {0} แพตช์เข้าด้วยกัน ({1}) — ตัวเลขที่ได้อ่านไม่ได้ เพราะค่าพลังเปลี่ยนไปแล้วระหว่างนั้น",
            a.patches.length, a.patches.join(" · "))}
        </div>
      )}

      <div style={{ ...card(), marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", fontFamily: MONO, fontSize: 13 }}>
          <div><Label>{tr("แมตช์ที่จด")}</Label><div style={{ fontSize: 20, color: C.ink }}>{a.matches}</div></div>
          <div><Label>{tr("ชนะ")}</Label><div style={{ fontSize: 20, color: C.ink }}>{a.wins}</div></div>
          <div><Label>{tr("อัตราชนะของคุณ")}</Label>
            <div style={{ fontSize: 20, color: C.gold }}>{a.matches ? a.wr.toFixed(1) + "%" : "—"}</div></div>
          <div><Label>{tr("ค่าคลาดเคลื่อน")}</Label>
            <div style={{ fontSize: 20, color: C.dim }}>{a.matches ? "±" + margin.toFixed(1) : "—"}</div></div>
        </div>
        {a.matches > 0 && margin > 3 && (
          <div style={{ fontSize: 11.5, color: C.dim, marginTop: 9, lineHeight: 1.6 }}>
            {tr("ค่าคลาดเคลื่อนยังกว้างกว่าเกณฑ์ 47-53 ที่ใช้ตัดสิน — ต้องเก็บถึงราว {0} แมตช์ถึงจะแคบพอ เอาไปปรับตัวเลขได้",
              Math.ceil(0.25 * Math.pow(196 / 3, 2)))}
          </div>
        )}
      </div>

      {a.matches === 0 ? (
        <div style={{ ...card(), textAlign: "center", color: C.dim, fontSize: 12.5, padding: 24 }}>
          {tr("ยังไม่มีแมตช์ที่ตรงกับตัวกรองนี้ — เล่นให้จบสักแมตช์แล้วกลับมาดู")}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
            <Toggle on={tab === "champs"} onClick={() => setTab("champs")}>{tr("ตัวละคร")}</Toggle>
            <Toggle on={tab === "items"} onClick={() => setTab("items")}>{tr("ไอเทม")}</Toggle>
          </div>

          {tab === "champs" && (
            <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 9, lineHeight: 1.6 }}>
              {tr("ชนะ = อัตราชนะของทั้งแมตช์ ซึ่งตัวละครทั้งห้าในทีมได้เท่ากันหมด ใช้ตัดสินตัวเดียวไม่ได้")}
              <br />
              {tr("ชนะไฟต์เลน = อัตราชนะเฉพาะไฟต์ในเลนของตัวเอง ตัวนี้แยกตัวละครออกจากทีมได้ สรุปทางขวาจึงตัดสินจากช่องนี้")}
            </div>
          )}
          <div style={{ ...card(), marginBottom: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: 12 }}>
              <thead>
                <tr style={{ color: C.dim, fontSize: 10.5, textAlign: "left" }}>
                  <th style={{ padding: "4px 6px" }}>{tab === "champs" ? tr("ตัวละคร") : tr("ไอเทม")}</th>
                  {tab === "champs" && <th style={{ padding: "4px 6px" }}>{tr("เลน")}</th>}
                  <th style={{ padding: "4px 6px", textAlign: "right" }}>{tr("ลงเล่น")}</th>
                  <th style={{ padding: "4px 6px", textAlign: "right" }}>{tr("ชนะ")}</th>
                  {tab === "champs" && <th style={{ padding: "4px 6px", textAlign: "right" }}>{tr("ชนะไฟต์เลน")}</th>}
                  {tab === "champs" && <th style={{ padding: "4px 6px", textAlign: "right" }}>{tr("KDA")}</th>}
                  <th style={{ padding: "4px 6px" }}>{tr("สรุป")}</th>
                </tr>
              </thead>
              <tbody>
                {(tab === "champs" ? a.champs : a.items).map((e) => {
                  // ตัดสินจากอัตราชนะไฟต์เลน เพราะอัตราชนะแมตช์ปนกันทั้งทีม
                  const judgeOn = tab === "champs" && e.fightWr != null ? e.fightWr : e.wr;
                  const judgeN = tab === "champs" && e.fightWr != null ? e.fights : e.n;
                  const v = verdict(judgeOn, judgeN, judgeN ? 196 * Math.sqrt(0.25 / judgeN) : margin);
                  return (
                    <tr key={tab === "champs" ? e.champ + e.lane : e.id} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td style={{ padding: "5px 6px", color: C.ink }}>
                        {tab === "champs" ? champName(e.champ) : itemName(e.id)}
                      </td>
                      {tab === "champs" && <td style={{ padding: "5px 6px", color: C.dim }}>{e.lane}</td>}
                      <td style={{ padding: "5px 6px", textAlign: "right", color: C.dim }}>{e.n}</td>
                      <td style={{ padding: "5px 6px", textAlign: "right", color: v.color }}>{e.wr.toFixed(1)}%</td>
                      {tab === "champs" && (
                        <td style={{ padding: "5px 6px", textAlign: "right", color: e.fightWr == null ? C.line : v.color }}>
                          {e.fightWr == null ? "—" : e.fightWr.toFixed(1) + "%"}
                        </td>
                      )}
                      {tab === "champs" && (
                        <td style={{ padding: "5px 6px", textAlign: "right", color: C.dim }}>
                          {e.fights ? e.kda.toFixed(1) : "—"}
                        </td>
                      )}
                      <td style={{ padding: "5px 6px", color: v.color, fontSize: 11 }}>{v.icon} {v.th}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div style={{ ...card() }}>
        <Label>{tr("เอาข้อมูลออกไปใช้")}</Label>
        <div style={{ fontSize: 11.5, color: C.dim, margin: "6px 0 10px", lineHeight: 1.6 }}>
          {tr("สมุดเก็บอยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น ล้างข้อมูลเบราว์เซอร์แล้วหาย — ส่งออกเก็บไว้บ้าง")}
          <br />
          {tr("นำเข้าไฟล์จากเครื่องอื่นได้ด้วย แถวที่ซ้ำกันจะถูกข้ามให้เอง")}
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button onClick={save} disabled={!rows.length}
            style={{ ...btn(rows.length ? C.gold : C.panel2), width: "auto", padding: "7px 14px", fontSize: 12 }}>
            {tr("ส่งออก {0} แมตช์", rows.length)}
          </button>
          <button onClick={() => fileRef.current && fileRef.current.click()}
            style={{ ...btn(C.panel2), color: C.ink, width: "auto", padding: "7px 14px", fontSize: 12 }}>
            {tr("นำเข้าไฟล์")}
          </button>
          <button onClick={wipe} disabled={!rows.length}
            style={{ ...btn(C.panel2), color: rows.length ? C.red : C.line, width: "auto", padding: "7px 14px", fontSize: 12 }}>
            {tr("ลบทั้งหมด")}
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={load} style={{ display: "none" }} />
        </div>
        {note && <div style={{ fontSize: 11.5, color: C.gold, marginTop: 9 }}>{note}</div>}
      </div>
    </Shell>
  );
}
