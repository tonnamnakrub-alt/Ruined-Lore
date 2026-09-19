import { itemName, tr } from "../i18n.js";
import React from "react";
import { CATEGORIES, ITEMS, ITEM_BY_ID } from "../data/items.js";
import { InfoRow, Panel, Tile, TileGrid } from "./kit.jsx";
import { itemAbility, itemDesc, itemStats } from "./recipe.jsx";
import { C, MONO, SANS } from "./theme.js";
import { Label } from "./widgets.jsx";


// ชิ้นส่วน UI ที่หน้า ITEM กับร้านค้าในเกมใช้ร่วมกัน
// เดิมสองหน้านี้เขียนแยกกันคนละแบบ เลยมีแต่หน้า ITEM ที่ดูสูตรย้อนได้
const nameEn = (it) => String(it.th).split("—")[0].trim();

// แถบหัวข้อคั่นบล็อก
function SectionBar({ children }) {
  return (
    <div style={{
      background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 4,
      padding: "3px 8px", margin: "10px 0 7px",
      fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase",
      color: C.dim, textAlign: "center", fontFamily: SANS, fontWeight: 700,
    }}>{children}</div>
  );
}


// ค่าสถานะ — บรรทัดละค่า สีประจำตัว อ่านไวกว่าเอามาต่อกันด้วยจุด
export function StatList({ it, compact }) {
  const stats = itemStats(it);
  if (!stats.length) return null;
  return (
    <div style={{ display: "grid", gap: compact ? 1 : 3 }}>
      {stats.map((x) => (
        <div key={x.key + x.text} style={{
          fontSize: compact ? 10.5 : 11.5, color: x.color, fontFamily: SANS, lineHeight: 1.5,
        }}>{x.text}</div>
      ))}
    </div>
  );
}



// ชื่อกลุ่มห้ามออกซ้ำ เก็บไว้ที่นี่เพื่อไม่ให้ data/items.js ต้องรู้เรื่อง UI
const UNIQ_TH = {
  thirdhit: "ออโต้ครั้งที่ 3",
  autoempower: "ออโต้ครั้งถัดไปแรงขึ้น",
  lifeline: "กันตายตอนเลือดต่ำ",
  cleanse: "ล้าง CC",
  antiheal: "ตัดฮีล",
  teamsave: "อุ้มทีมตอนเพื่อนเลือดต่ำ",
  horsbuff: "ฮีล/โล่แล้วบัฟทั้งคู่",
  stackguard: "สะสมชั้นแล้วอึดขึ้น",
};


// ค้นได้ทั้งชื่อไทย/อังกฤษ, รหัส, หมวด และข้อความค่าสถานะ/พาสซีฟ
// หลายคำ = ต้องเจอครบทุกคำ ("ad crit" เจอเฉพาะของที่มีทั้งสองอย่าง)
export function itemMatches(it, q) {
  if (!q) return true;
  const needle = String(q).trim().toLowerCase();
  if (!needle) return true;
  const cat = CATEGORIES.find((c) => c.id === it.cat);
  const ability = itemAbility(it);
  const hay = [
    it.id, String(it.th), itemName(it), itemDesc(it), cat ? tr(cat.th) : "",
    // ชื่อกลุ่มห้ามออกซ้ำ ทำให้ค้นคำรวมอย่าง "ตัดฮีล" / "grievous" เจอครบทุกชิ้น
    ...(it.uniq || []).map((g) => tr(UNIQ_TH[g] || g)),
  ].join(" ").toLowerCase();
  return needle.split(/\s+/).every((w) => hay.includes(w));
}


export function ItemSearch({ value, onChange }) {
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 120 }}>
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={tr("ค้นหาไอเทม เช่น crit, เกราะ, ตัดฮีล")}
        style={{
          width: "100%", boxSizing: "border-box",
          background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 999,
          padding: "7px 30px 7px 12px", fontSize: 11.5, color: C.ink,
          fontFamily: SANS, outline: "none",
        }}
      />
      {value ? (
        <button
          onClick={() => onChange("")}
          style={{
            position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", color: C.dim, cursor: "pointer",
            fontSize: 14, lineHeight: 1, padding: "2px 6px",
          }}
        >×</button>
      ) : null}
    </div>
  );
}


export function ItemGrid({ list, headline, selectedId, onPick, badgeOf }) {
  return (
    <Panel style={{ padding: 10 }}>
      <Label style={{ marginBottom: 8 }}>{headline}</Label>
      {list.length ? (
        <TileGrid min={86}>
          {list.map((x) => (
            <Tile
              key={x.id}
              title={itemName(x)}
              // ของที่ออกซ้ำกลุ่มกันไม่ได้ (เช่นตัดฮีล) ต้องเห็นตั้งแต่ในตาราง ไม่ใช่ต้องกดเข้าไปดู
              sub={x.uniq ? `${x.cost}g · ${tr("ห้ามซ้ำ")}` : `${x.cost}g`}
              badge={badgeOf ? badgeOf(x) : null}
              selected={selectedId === x.id}
              onClick={() => onPick(x)}
            />
          ))}
        </TileGrid>
      ) : (
        <div style={{ fontSize: 11.5, color: C.dim, padding: "14px 4px" }}>{tr("ไม่เจอไอเทมที่ตรงกับคำค้น")}</div>
      )}
    </Panel>
  );
}


function LinkRow({ label, items, onPick, tail }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <Label style={{ marginBottom: 5 }}>{label}</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {items.map((x, i) => (
          <button
            key={x.id + i}
            onClick={() => onPick(x)}
            style={{
              background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 5, color: C.ink,
              padding: "5px 8px", fontSize: 10.5, cursor: "pointer", fontFamily: SANS,
            }}
          >
            {itemName(x)} <span style={{ color: C.gold, fontFamily: MONO }}>{x.cost}g</span>
          </button>
        ))}
        {tail ? <span style={{ alignSelf: "center", fontSize: 10.5, color: C.dim, fontFamily: MONO }}>{tail}</span> : null}
      </div>
    </div>
  );
}


// แผงรายละเอียดไอเทม — footer/children ให้ร้านค้าเสียบปุ่มซื้อกับสูตรแบบเดิมเพิ่มได้
export function ItemDetail({ it, onPick, price, footer, children, fav, onFav }) {
  const parts = (it.parts || []).map((pid) => ITEM_BY_ID[pid]).filter(Boolean);
  const buildsInto = ITEMS.filter((x) => (x.parts || []).includes(it.id));
  const cat = CATEGORIES.find((c) => c.id === it.cat);
  const ability = itemAbility(it);
  return (
    <Panel>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{itemName(it)}</div>
          <div style={{ fontSize: 10.5, color: C.dim, fontFamily: MONO }}>{nameEn(it)}</div>
        </div>
        {onFav ? (
          <button
            onClick={() => onFav(it.id)}
            title={fav ? tr("เอาออกจากรายการโปรด") : tr("ใส่รายการโปรด")}
            style={{
              marginLeft: "auto", background: "none", border: `1px solid ${fav ? C.gold : C.line}`,
              borderRadius: 6, width: 28, height: 26, cursor: "pointer",
              color: fav ? C.gold : C.dim, fontSize: 13, lineHeight: 1, padding: 0,
            }}
          >{fav ? "★" : "☆"}</button>
        ) : null}
        <div style={{ marginLeft: onFav ? 8 : "auto", textAlign: "right" }}>
          <div style={{ fontFamily: MONO, fontSize: 15, color: C.gold }}>{price != null ? price : it.cost}g</div>
          {price != null && price !== it.cost ? (
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.dim, textDecoration: "line-through" }}>{it.cost}g</div>
          ) : null}
        </div>
      </div>

      <SectionBar>{tr("ค่าสถานะ")}</SectionBar>
      {itemStats(it).length
        ? <StatList it={it} />
        : <div style={{ fontSize: 11.5, color: C.dim }}>{tr("ไม่มีค่าสถานะพิเศษ")}</div>}

      {ability.length ? (
        <>
          <SectionBar>{tr("ความสามารถ")}</SectionBar>
          <div style={{ display: "grid", gap: 6 }}>
            {ability.map((line, i) => (
              <div key={i} style={{ fontSize: 11.5, color: C.ink, lineHeight: 1.65 }}>
                <span style={{ color: C.gold, fontWeight: 700 }}>{tr("พิเศษ")} · </span>{line}
              </div>
            ))}
          </div>
        </>
      ) : null}

      <SectionBar>{tr("ข้อมูล")}</SectionBar>
      <div style={{ marginBottom: 10 }}>
        <InfoRow k={tr("หมวด")} v={(cat ? tr(cat.th) : "") || it.cat} />
        {it.kind ? (
          <InfoRow
            k={tr("ชนิด")}
            v={it.kind === "boots" ? tr("รองเท้า (ได้ 1 คู่)") : it.kind === "style" ? tr("ตามสไตล์ทีม") : it.kind}
          />
        ) : null}
        {it.style ? <InfoRow k={tr("ใช้ได้กับสไตล์")} v={it.style} /> : null}
        {it.uniq ? <InfoRow k={tr("ห้ามออกซ้ำกลุ่ม")} v={it.uniq.map((g) => tr(UNIQ_TH[g] || g)).join(", ")} tone={C.gold} /> : null}
      </div>

      {footer}

      <LinkRow
        label={tr("ประกอบจาก")}
        items={parts}
        onPick={onPick}
        tail={parts.length ? tr("= {0}g + ค่าประกอบ", parts.reduce((s, p) => s + p.cost, 0)) : null}
      />
      <LinkRow label={tr("ต่อยอดเป็น")} items={buildsInto} onPick={onPick} />

      {children}
    </Panel>
  );
}


