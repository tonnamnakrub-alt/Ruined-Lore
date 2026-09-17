import { itemName, tr } from "../i18n.js";
import React from "react";
import { ITEM_BY_ID, buyBlockedReason, effectiveCost } from "../data/items.js";
import { STYLES } from "../data/tuning.js";
import { C, MONO, STAT_C } from "./theme.js";
import { itemAbility, itemDesc, itemStats } from "./item-desc.js";

// ส่วนข้อความล้วนย้ายไป item-desc.js แล้ว — ส่งต่อให้ของเดิมที่ import จากที่นี่ใช้ได้เหมือนเดิม
export { itemAbility, itemDesc, itemStats };


// Mirrors the engine's resolveComponent exactly, so the tree shown here always
// matches what applyBuy will actually consume — walks the whole recipe down to
// Tier 1, not just the item's direct parts.
export function buildRecipeTree(pool, item) {
  const idx = pool.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    pool.splice(idx, 1);
    return { item, owned: true, ready: false, children: null };
  }
  if (!item.parts) return { item, owned: false, ready: false, children: null };
  const children = item.parts.map((pid) => buildRecipeTree(pool, ITEM_BY_ID[pid]));
  // ชิ้นส่วนครบแล้วก็ยังไม่ได้ "ถือ" ของชิ้นนี้ — ค่าประกอบยังไม่ได้จ่าย
  // เดิมตรงนี้คืน owned: true ทำให้ร้านขึ้นว่ามี Tier 2 แล้วทั้งที่ยังไม่ได้ซื้อ
  return { item, owned: false, ready: children.every((c) => c.owned || c.ready), children };
}


export function RecipeNode({ node, depth, c, onBuy }) {
  const { item, owned, ready, children } = node;
  const blocked = owned ? null : buyBlockedReason(c, item);
  const canBuyHere = !owned && !blocked;
  const mark = owned ? "\u2713" : ready ? "\u25d0" : "\u25cb";
  const markCol = owned ? C.green : ready ? C.gold : "#3B4A69";
  return (
    <div style={{ marginLeft: depth * 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
        <span style={{ color: markCol, fontSize: 12, width: 12 }}>{mark}</span>
        <span style={{ fontSize: 11.5, color: owned || ready ? C.ink : C.dim }}>{itemName(item)}</span>
        <span style={{ fontSize: 9.5, color: ready ? C.gold : C.dim, flex: 1 }}>
          {ready ? tr("ชิ้นส่วนครบแล้ว เหลือค่าประกอบ") : itemDesc(item)}
        </span>
        {!owned && (
          <button onClick={() => canBuyHere && onBuy(item)} disabled={!canBuyHere}
            style={{
              background: "none", border: `1px solid ${canBuyHere ? (ready ? C.gold : C.line) : "transparent"}`, borderRadius: 4,
              padding: "3px 7px", fontFamily: MONO, fontSize: 10.5,
              color: canBuyHere ? C.gold : C.dim, cursor: canBuyHere ? "pointer" : "default",
            }}>
            {blocked && blocked !== tr("เงินไม่พอ") ? blocked : effectiveCost(c.items, item) + "g"}
          </button>
        )}
      </div>
      {!owned && !ready && children && children.map((ch, i) => (
        <RecipeNode key={ch.item.id + i} node={ch} depth={depth + 1} c={c} onBuy={onBuy} />
      ))}
    </div>
  );
}


// ค่าสถานะของไอเทม แยกเป็นรายการพร้อมสีประจำตัว — ใช้วาดเป็นบล็อก Stats
// (เมื่อก่อนยัดรวมกับข้อความความสามารถในบรรทัดเดียว อ่านยากมาก)
