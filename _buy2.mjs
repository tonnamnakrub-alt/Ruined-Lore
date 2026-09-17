import { chromium } from "playwright";
const b = await chromium.launch();
const errs = [];
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on("pageerror", (e) => errs.push("ERR: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("C: " + m.text()); });
await p.goto(new URL("ruined-lore.html", import.meta.url).href);
await p.waitForTimeout(400);
const btns = () => p.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.innerText.replace(/\s+/g, " ").trim()));
const ct = async (re, wt = 300) => {
  const l = await btns(); const i = l.findIndex((t) => re.test(t));
  if (i < 0) return false;
  await p.evaluate((i) => document.querySelectorAll("button")[i].click(), i); await p.waitForTimeout(wt); return true;
};
const body = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
const gold = async () => { const m = (await body()).match(/(\d+)g ×/); return m ? +m[1] : null; };
const slots = async () => { const m = (await body()).match(/(\d)\/6 slots used/); return m ? +m[1] : null; };
const tab = async () => p.evaluate(() => {
  const on = [...document.querySelectorAll("button")].find((b) => /rgb\(232, 163, 61\)|rgb\(212, 160/.test(getComputedStyle(b).backgroundColor) && /^(Starter|Tier|Boots|Tank|Fighter|Assassin|Mage|Marksman|Support)/.test(b.innerText));
  return on ? on.innerText.trim() : "?";
});

await ct(/^PLAY/); await ct(/^Rush · 20/); await ct(/^Start — build/); await ct(/^Random \+ start/, 500);
for (let k = 0; k < 5; k++) {
  const l = await btns(); const gi = l.findIndex((t) => /^[A-Z][A-Z.]{2,8} (TOP|JUNGLE|MID|ADC|SUPPORT)/.test(t));
  if (gi < 0) break;
  await p.evaluate((i) => document.querySelectorAll("button")[i].click(), gi); await p.waitForTimeout(100);
  await ct(/^Add to team/, 120);
}
await ct(/^Go to lanes/);
for (let k = 0; k < 5; k++) {
  const l = await btns(); const i = l.findIndex((t) => /^[A-Z][A-Z.]{2,8}$/.test(t)); if (i < 0) break;
  await p.evaluate((i) => document.querySelectorAll("button")[i].click(), i); await p.waitForTimeout(90);
  const l2 = await btns(); const j = l2.findIndex((t) => /empty/.test(t)); if (j < 0) break;
  await p.evaluate((i) => document.querySelectorAll("button")[i].click(), j); await p.waitForTimeout(90);
}
await ct(/^Plan your build/); await ct(/^Start .* match/, 500);
// เล่นให้มีเงินเยอะ
await ct(/Open shop/, 500); await ct(/^Close shop/, 250);
for (let r = 0; r < 10; r++) {
  if (!await ct(/^Start round/, 700)) break;
  for (let w = 0; w < 40; w++) { await p.waitForTimeout(400); const l = await btns(); if (l.some((t) => /^Go to round|^Play again/.test(t))) break; }
  if (!await ct(/^Go to round/, 300)) break;
}
await ct(/Open shop/, 600);
console.log("เงินตอนเข้าร้าน", await gold(), "· แท็บ", await tab());

// ซื้อรัวๆ 5 ชิ้นจากแท็บ Tier 1 — จำลองคนเล่นจริง
await ct(/^Tier 1 parts$/, 350);
console.log("แท็บหลังกด Tier 1:", await tab());
for (let k = 0; k < 5; k++) {
  const tiles = await p.evaluate(() => [...document.querySelectorAll("button")]
    .map((b, i) => [b.innerText.replace(/\s+/g, " ").trim(), i])
    .filter(([t]) => /^[A-Z].* \d+g$/.test(t)).slice(0, 12).map(([t, i]) => [t, i]));
  if (!tiles.length) { console.log("  ไม่เจอไทล์"); break; }
  const [name, idx] = tiles[k % tiles.length];
  await p.evaluate((i) => document.querySelectorAll("button")[i].click(), idx);
  await p.waitForTimeout(250);
  const g0 = await gold(), s0 = await slots();
  const bought = await ct(/^Buy \d+g/, 400);
  console.log("  " + (k + 1) + ") " + name.padEnd(34) + (bought ? "ซื้อ" : "กดไม่ได้") +
    " · เงิน " + g0 + "->" + (await gold()) + " · ช่อง " + s0 + "->" + (await slots()) + " · แท็บ " + (await tab()));
}
// ลองกดของที่ "ยืมมาจากสายอื่น" ในแท็บ Tank
await ct(/^Tank$/, 350);
console.log("\nแท็บก่อนกด:", await tab());
await ct(/^Pridwen/, 350);
console.log("กด Pridwen (ของสายซัพที่โผล่ในแท็บ Tank) -> แท็บกลายเป็น:", await tab());
await p.screenshot({ path: "/tmp/buy_multi.png", fullPage: true });
console.log("ERRS:", errs.slice(0, 6));
await b.close();
