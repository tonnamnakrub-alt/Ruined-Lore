import { itemName, tr } from "../i18n.js";
import React from "react";
import { CATEGORIES, ITEMS, ITEM_BY_ID, inCat, itemsInCat } from "../data/items.js";
import { Shell } from "../ui/chrome.jsx";
import { ItemDetail, ItemGrid, ItemSearch, itemMatches } from "../ui/ItemPanel.jsx";
import { Tabs, TwoPane } from "../ui/kit.jsx";
import { C } from "../ui/theme.js";


// ---------------- ITEM: คลังไอเทมทั้งหมด ----------------
export function ItemBookScreen(ctx) {
  const {
    score, mode, wide, setPhase,
    bookCat, setBookCat, bookItem, setBookItem, bookQuery, setBookQuery,
  } = ctx;

  const cat = bookCat || "START";
  const searching = !!(bookQuery && bookQuery.trim());
  const pack = itemsInCat(cat);
  const list = searching ? ITEMS.filter((x) => itemMatches(x, bookQuery)) : pack.all;
  const it = (ITEM_BY_ID[bookItem] && (searching ? list.some((x) => x.id === bookItem) : inCat(ITEM_BY_ID[bookItem], cat))
    ? ITEM_BY_ID[bookItem]
    : list[0]) || null;

  const catTh = (id) => tr((CATEGORIES.find((c) => c.id === id) || {}).th);
  const pick = (x) => {
    setBookItem(x.id);
    if (!searching && !list.some((y) => y.id === x.id)) setBookCat(x.cat);
  };

  const headline = searching
    ? tr("ผลค้นหา · {0} ชิ้น", list.length)
    : pack.lent.length
      ? tr("{0} · {1} ชิ้น (+{2} ที่สายอื่นใช้ร่วมได้)", catTh(cat), pack.own.length, pack.lent.length)
      : tr("{0} · {1} ชิ้น", catTh(cat), pack.own.length);

  const grid = (
    <ItemGrid list={list} headline={headline} selectedId={it ? it.id : null} onPick={pick} />
  );
  const detail = it
    ? <ItemDetail it={it} onPick={pick} />
    : <div style={{ fontSize: 11.5, color: C.dim, padding: 14 }}>{tr("ไม่เจอไอเทมที่ตรงกับคำค้น")}</div>;

  return (
    <Shell round={0} score={score} mode={mode} title="ITEM" maxWidth={wide ? 1040 : 620} onBack={() => setPhase("MENU")}>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <ItemSearch value={bookQuery} onChange={setBookQuery} />
      </div>
      <div style={{ opacity: searching ? 0.45 : 1 }}>
        <Tabs
          items={CATEGORIES}
          value={cat}
          onChange={(id) => { setBookQuery(""); setBookCat(id); setBookItem(null); }}
        />
      </div>
      <TwoPane wide={wide} left={grid} right={detail} />
      <div style={{ fontSize: 10.5, color: C.dim, marginTop: 10, textAlign: "center" }}>{tr(
          "ไอเทมทั้งหมด {0} ชิ้น · แตะชื่อในช่อง “ประกอบจาก/ต่อยอดเป็น” เพื่อไล่ดูสูตรต่อ",
          ITEMS.length
        )}</div>
    </Shell>
  );
}
