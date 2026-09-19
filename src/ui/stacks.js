import { tr } from "../i18n.js";
import { C } from "./theme.js";

// ---------------------------------------------------------------
// ตัวนับสะสมของแต่ละตัวละครและไอเทม — รวมไว้ที่เดียว
//
// เดิมมีแต่ LUCH ที่โชว์ (แถมหารเพดานผิด) ตัวอื่นสะสมอยู่เงียบๆ ในเอนจิน
// ผู้เล่นเลยไม่มีทางรู้ว่า LAURA มีกี่สแตก หรือ TRISTAN ใกล้ได้โล่หรือยัง
//
// คืน [{ label, text, color, frac }] — frac (0..1) ไว้วาดเป็นหลอดถ้าอยากได้
// ทุกอย่าง optional หมด ยูนิตที่ไม่มีกลไกนั้นก็ไม่มีชิป
// ---------------------------------------------------------------
export function stackChips(u, now) {
  if (!u) return [];
  const ch = u.champ || {};
  const out = [];
  const add = (label, text, color, frac) => out.push({ label, text, color, frac });
  const live = (until) => until == null || now == null || now < until;

  // --- กลไกประจำตัวละคร ---
  if (ch.fragments) {
    const max = ch.fragments.max || 100;
    if (u.shadow > 0) add("SHADOW", tr("พร้อมใช้"), "#B08CFF", 1);
    else add("LIGHT", Math.round(u.light || 0) + "/" + max, C.gold, (u.light || 0) / max);
  }
  if (ch.isolde) {
    const need = ch.isolde.need || 100;
    const v = Math.round(u.isolde || 0);
    add("ISOLDE", v + "/" + need, v >= need ? C.green : "#7EC7FF", v / need);
  }
  if (ch.sanguine) {
    const n = u.sangStacks || 0;
    const hp = n * (ch.sanguine.hpPerStack || 0);
    // สแตกถาวร ไม่มีเพดาน (max: 0) — โชว์เลือดที่ได้มาแล้วด้วย เพราะนั่นคือผลจริง
    add("SANGUINE", n + (hp ? tr(" (+{0} HP)", hp) : ""), "#F0648F", null);
  }
  if (ch.weave && u.weave && u.weave.list) {
    const list = u.weave.list;
    const max = ch.weave.max || 20;
    const ap = list.filter((x) => x === "ap").length;
    const ad = list.length - ap;
    add("WEAVE", list.length + "/" + max + tr(" (เกราะ {0} · ต้านเวท {1})", ad, ap), "#E3B75F", list.length / max);
  }
  if (ch.bounty) add("PLUNDER", (u.bountyGold || 0) + "g", C.gold, null);

  // --- สแตกจากไอเทม (มีอายุ หมดแล้วหาย) ---
  if (u.pnbStacks && live(u.pnbUntil)) {
    add("PNB", u.pnbStacks + "/15", "#D9C48F", u.pnbStacks / 15);
  }
  if (u.mjolnirStacks && live(u.mjolnirUntil)) {
    add("MJOLNIR", u.mjolnirStacks + "/10", "#5FC9D6", u.mjolnirStacks / 10);
  }
  if (u.wvcStacks) add("WENDIGO", String(u.wvcStacks), "#F2856B", null);

  return out;
}
