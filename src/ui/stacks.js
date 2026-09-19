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

  // --- ตัวนับของ Patch 0.3 ---
  if (ch.starlight) {
    const max = ch.starlight.max || 3;
    const n = u.starStacks || 0;
    add("STARLIGHT", n + "/" + max, n > 0 ? "#7EC7FF" : C.dim, n / max);
  }
  if (ch.glassShards) {
    // จังหวะที่ค้างอยู่ของคอมโบ Q และยอดดาเมจที่ W สะสมไว้บนเป้า
    if (u.comboStep > 0) add("WALTZ", "Q" + (u.comboStep + 1) + (u.comboArmed ? tr(" พร้อม") : tr(" รอออโต้")), "#B08CFF", null);
    if (u.carriage) add("CARRIAGE", tr("ล่องหน"), C.gold, null);
  }
  if (ch.beanstalk) {
    const n = u.bean ? u.bean.n : 0;
    if (n > 0) add("BEANS", n + "/" + (ch.beanstalk.need || 3), C.green, n / (ch.beanstalk.need || 3));
  }
  if (ch.duel) {
    add("DUEL", u.duelMarkId ? String(u.duelMarkId).split("-").pop() : tr("ไม่มีเป้า"), C.gold, null);
    add("LIVES", u.nineUsed ? tr("ใช้แล้ว") : tr("เหลือ 1"), u.nineUsed ? C.dim : "#F0648F", null);
  }
  if (ch.threePigs) {
    const names = [tr("บ้านฟาง"), tr("บ้านไม้"), tr("บ้านอิฐ")];
    add("PIGS", names[u.pigTier || 0], "#F0648F", 1 - (u.pigTier || 0) / 2);
  }
  if (ch.aegis && u.aegisShield > 0) {
    add("AEGIS", Math.round(u.aegisShield) + "", "#E4EBF7", null);
  }
  if (ch.critBleed) {
    const n = (u.bleedStacks != null ? u.bleedStacks : 0);
    if (n > 0) add("BLEED", n + "/" + ch.critBleed.maxStacks, C.red, n / ch.critBleed.maxStacks);
  }
  if (u.jolt > 0) add("JOLT", u.jolt + "/3", "#7EC7FF", u.jolt / 3);
  if (u.truthAura) add("TRUTH", "+" + Math.round(u.truthAura.amp * 100) + "%", "#E3B75F", null);

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
