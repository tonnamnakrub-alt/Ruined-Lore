import { itemName, tr } from "../i18n.js";
import React from "react";
import { CATEGORIES, ITEMS, ITEM_BY_ID, buyBlockedReason, effectiveCost, itemsInCat } from "../data/items.js";
import { ItemSlot, btn, mini, slot } from "./chrome.jsx";
import { ItemDetail, ItemGrid, ItemSearch, itemMatches } from "./ItemPanel.jsx";
import { TwoPane } from "./kit.jsx";
import { RecipeNode, buildRecipeTree } from "./recipe.jsx";
import { C, MONO, SANS } from "./theme.js";


// ---------------- Shop (full screen) ----------------
// หน้าตาเดียวกับหน้า ITEM (ตาราง + แผงรายละเอียดที่ไล่ดูสูตรย้อนได้)
// แต่ยังเก็บ "ดูสูตร" แบบต้นไม้ของเดิมไว้ เพราะอันนั้นกดซื้อชิ้นส่วนทีละชิ้นได้
export function ShopScreen({
  c, cat, setCat, slotsUsed, onBuy, onSell, sellValue,
  openRecipe, setOpenRecipe, onClose, wide,
  shopItem, setShopItem, shopQuery, setShopQuery, favs, toggleFav,
}) {
  const searching = !!(shopQuery && shopQuery.trim());
  const pack = itemsInCat(cat);
  const list = searching ? ITEMS.filter((x) => itemMatches(x, shopQuery)) : pack.all;
  const it = (ITEM_BY_ID[shopItem] && list.some((x) => x.id === shopItem) ? ITEM_BY_ID[shopItem] : list[0]) || null;

  const hasBoots = c.items.some((x) => x.kind === "boots");
  const freeBoot = c.lane === "ADC";
  const catTh = (id) => tr((CATEGORIES.find((k) => k.id === id) || {}).th);

  // เปลี่ยนแท็บเฉพาะตอนที่ของชิ้นนั้นไม่ได้อยู่ในแท็บปัจจุบันจริงๆ
  // (ของที่ยืมมาจากสายอื่นก็อยู่ในแท็บนี้ กดแล้วไม่ควรดีดไปแท็บอื่น)
  const pick = (x) => {
    setShopItem(x.id);
    if (!searching && !list.some((y) => y.id === x.id)) setCat(x.cat);
  };

  const headline = searching
    ? tr("ผลค้นหา · {0} ชิ้น", list.length)
    : pack.lent.length
      ? tr("{0} · {1} ชิ้น (+{2} ที่สายอื่นใช้ร่วมได้)", catTh(cat), pack.own.length, pack.lent.length)
      : tr("{0} · {1} ชิ้น", catTh(cat), pack.own.length);

  let detail = <div style={{ fontSize: 11.5, color: C.dim, padding: 14 }}>{tr("ไม่เจอไอเทมที่ตรงกับคำค้น")}</div>;
  if (it) {
    // ถือซ้ำไม่ได้เฉพาะของใหญ่ Tier 3 · ของเริ่มเกม · รองเท้า
    // ชิ้นส่วน Tier 1/2 ถือกี่ชิ้นก็ได้ ปุ่มหลักจึงต้องเป็น "ซื้อ" เสมอ แล้วแยกปุ่มขายคืนไว้ต่างหาก
    const copies = c.items.filter((x) => x.id === it.id).length;
    const exclusive = it.tier === 3 || it.cat === "START" || it.kind === "boots";
    const owned = exclusive && copies > 0;
    const reason = owned ? null : buyBlockedReason(c, it);
    const eff = effectiveCost(c.items, it);
    const can = !owned && !reason;
    const expanded = openRecipe === it.id;
    const notGold = reason && reason !== tr("เงินไม่พอ");

    const buyRow = (
      <div style={{ marginBottom: 10 }}>
        <button
          onClick={() => (owned ? onSell(it) : can && onBuy(it))}
          disabled={!can && !owned}
          style={{
            ...btn(owned ? "#1E3A28" : can ? C.panel2 : "transparent"),
            border: `1px solid ${can || owned ? C.line : C.line}`,
            color: owned ? C.green : can ? C.gold : C.dim,
            cursor: can || owned ? "pointer" : "default",
            fontFamily: MONO, fontSize: 13, fontWeight: 700,
          }}
        >
          {owned
            ? tr("ขายคืน +{0}g", sellValue(it))
            : notGold
              ? reason
              : reason
                ? tr("เงินไม่พอ — ขาดอีก {0}g", eff - c.gold)
                : tr("ซื้อ {0}g", eff)}
        </button>
        {!owned && eff < it.cost ? (
          <div style={{ fontSize: 10.5, color: C.gold, marginTop: 4, textAlign: "center" }}>
            {tr("ใช้ชิ้นส่วนที่มีอยู่ ลดไป {0}g", it.cost - eff)}
          </div>
        ) : null}
        {!exclusive && copies > 0 ? (
          <button
            onClick={() => onSell(it)}
            style={{
              ...btn("transparent"), border: `1px solid ${C.line}`, color: C.green,
              fontFamily: MONO, fontSize: 11.5, marginTop: 5, cursor: "pointer",
            }}
          >{tr("ถืออยู่ {0} ชิ้น · ขายคืน +{1}g", copies, sellValue(it))}</button>
        ) : null}
      </div>
    );

    const oldRecipe = it.parts && !owned ? (
      <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 4, paddingTop: 8 }}>
        <button
          onClick={() => setOpenRecipe(expanded ? null : it.id)}
          style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            color: eff < it.cost ? C.gold : C.dim, fontSize: 11, fontFamily: SANS,
          }}
        >
          {expanded ? tr("▾ ซ่อนสูตร") : tr("▸ ดูสูตร (ลดได้ {0}g)", it.cost - eff)}
        </button>
        {expanded ? (
          <div style={{ marginTop: 8 }}>
            {(() => {
              const pool = [...c.items];
              const tree = it.parts.map((pid) => buildRecipeTree(pool, ITEM_BY_ID[pid]));
              return tree.map((node, i) => (
                <RecipeNode key={node.item.id + i} node={node} depth={0} c={c} onBuy={onBuy} />
              ));
            })()}
            <div style={{
              display: "flex", justifyContent: "space-between", fontSize: 11,
              marginTop: 7, paddingTop: 7, borderTop: `1px solid ${C.line}`,
            }}>
              <span style={{ color: C.dim }}>{tr("ค่าประกอบชิ้นสุดท้าย")}</span>
              <span style={{ fontFamily: MONO, color: C.ink }}>
                {it.cost - it.parts.reduce((a, id) => a + ITEM_BY_ID[id].cost, 0)}g
              </span>
            </div>
          </div>
        ) : null}
      </div>
    ) : null;

    detail = (
      <ItemDetail
        it={it} onPick={pick} price={owned ? null : eff} footer={buyRow}
        fav={(favs || []).includes(it.id)} onFav={toggleFav}
      >
        {oldRecipe}
      </ItemDetail>
    );
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "#070C16", zIndex: 50,
        display: "flex", flexDirection: "column", fontFamily: SANS,
      }}
    >
      <div style={{ padding: "12px 12px 8px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: wide ? 1040 : 620, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: MONO, fontWeight: 800, color: C.blue, fontSize: 17 }}>{c.char}</span>
            <span style={{ color: C.dim, fontSize: 11, letterSpacing: 1 }}>{c.lane}</span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: C.ink }}>Lv{c.level}</span>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 17, color: C.gold }}>{c.gold}g</span>
            <button onClick={onClose} style={{ ...mini(), width: 32, height: 28, fontSize: 16 }}>×</button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => {
              const owned = c.items.filter((x) => !(freeBoot && x.kind === "boots"));
              const x = owned[i];
              return (
                <ItemSlot
                  key={i}
                  item={x}
                  onClick={(item) => {
                    setShopQuery("");
                    setCat(item.cat);
                    setShopItem(item.id);
                  }}
                />
              );
            })}
            {freeBoot && (
              <ItemSlot
                dashed
                item={c.items.find((x) => x.kind === "boots")}
                empty={tr("ช่องรองเท้าฟรี")}
              />
            )}
          </div>
          <div style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>{tr(
              "ใช้ไป {0}/6 ช่อง{1} · 1g = 50 gold ใน LoL · กดของที่ถืออยู่เพื่อเปิดแผงแล้วกดขายคืน 70%",
              slotsUsed,
              freeBoot ? tr(" · รองเท้าไม่กินช่อง") : ""
            )}</div>
        </div>
      </div>

      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: wide ? 1040 : 620, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 7 }}>
            <ItemSearch value={shopQuery} onChange={setShopQuery} />
          </div>
          <div style={{ display: "flex", gap: 5, overflowX: "auto", opacity: searching ? 0.45 : 1 }}>
            {CATEGORIES.map((k) => (
              <button
                key={k.id}
                onClick={() => { setShopQuery(""); setCat(k.id); setShopItem(null); }}
                style={{
                  background: !searching && cat === k.id ? C.gold : C.panel2,
                  color: !searching && cat === k.id ? "#0B1220" : C.ink,
                  border: `1px solid ${C.line}`, borderRadius: 999,
                  padding: "6px 12px", fontSize: 11.5, whiteSpace: "nowrap",
                  cursor: "pointer", fontFamily: SANS, fontWeight: !searching && cat === k.id ? 700 : 400,
                }}
              >
                {tr(k.th)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        <div style={{ maxWidth: wide ? 1040 : 620, margin: "0 auto" }}>
          <TwoPane
            wide={wide}
            left={
              <ItemGrid
                list={list}
                headline={headline}
                selectedId={it ? it.id : null}
                onPick={pick}
                badgeOf={(x) => {
                  if ((favs || []).includes(x.id)) return "★";
                  const n = c.items.filter((y) => y.id === x.id).length;
                  return n > 1 ? "\u00d7" + n : n ? "\u2713" : null;
                }}
              />
            }
            right={detail}
          />
        </div>
      </div>

      <div style={{ padding: 12, borderTop: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: wide ? 1040 : 620, margin: "0 auto" }}>
          <button onClick={onClose} style={{ ...btn(C.panel2), fontWeight: 700 }}>{tr("ปิดร้านค้า")}</button>
        </div>
      </div>
    </div>
  );
}
