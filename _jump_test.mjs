import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const errs = [];
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
p.on("pageerror", (e) => errs.push("ERR: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("C: " + m.text()); });
await p.goto("file:///home/claude/sideline/sideline.html");
await p.waitForTimeout(400);
const btns = () => p.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.innerText.replace(/\s+/g, " ").trim()));
const ct = async (re, wt = 300) => {
  const l = await btns(); const i = l.findIndex((t) => re.test(t));
  if (i < 0) { console.log("MISS", String(re)); return false; }
  await p.evaluate((i) => document.querySelectorAll("button")[i].click(), i); await p.waitForTimeout(wt); return true;
};
const tab = async () => p.evaluate(() => {
  const on = [...document.querySelectorAll("button")].find((b) =>
    /rgb\(232, 163, 61\)/.test(getComputedStyle(b).backgroundColor) &&
    /^(Starter|Tier|Boots|Tank|Fighter|Assassin|Mage|Marksman|Support)/.test(b.innerText));
  return on ? on.innerText.trim() : "?";
});
const sel = async () => p.evaluate(() => {
  const d = document.body.innerText;
  const m = d.match(/(?:STATS)[\s\S]{0,0}/);
  const h = [...document.querySelectorAll("div")].filter((x) => x.children.length === 0 && /^[A-Z][A-Za-z' \-]{5,40}$/.test(x.innerText.trim()));
  return h.length ? h[h.length - 1].innerText.trim() : "?";
});

console.log("--- หน้า ITEM ---");
await ct(/^ITEM/);
for (const [tabName, lent] of [["Tank", /^Pridwen/], ["Fighter", /^Shiva/], ["Marksman", /^Kitsune/], ["Support", /^Holy Grail/]]) {
  await ct(new RegExp("^" + tabName + "$"), 300);
  const before = await tab();
  const ok = await ct(lent, 350);
  const after = await tab();
  console.log("  แท็บ " + tabName.padEnd(9) + "กดของที่ยืมมา " + (ok ? "" : "(ไม่เจอ) ") +
    "-> แท็บ " + before + " => " + after + (before === after ? "  ✓" : "  ✗ ดีดหนี"));
}
// กดในช่อง "ประกอบจาก" ที่ของอยู่คนละแท็บจริงๆ — อันนี้เปลี่ยนแท็บถูกแล้ว
await ct(/^Tank$/, 300);
await ct(/^Nemean/, 350);
const b1 = await tab();
await ct(/^Chainmail of the Nemean/, 350);
console.log("  กดชิ้นส่วนในช่องประกอบจาก -> แท็บ " + b1 + " => " + (await tab()) + "  (ควรเป็น Tier 2 parts)");
console.log("ERRS:", errs.slice(0, 4));
await b.close();
