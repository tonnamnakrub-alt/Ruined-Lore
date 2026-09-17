import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto("file:///home/claude/sideline/sideline.html");
await p.waitForTimeout(400);
const btns = () => p.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.innerText.replace(/\s+/g, " ").trim()));
const ct = async (re, wt = 300) => {
  const l = await btns(); const i = l.findIndex((t) => re.test(t));
  if (i < 0) return false;
  await p.evaluate((i) => document.querySelectorAll("button")[i].click(), i); await p.waitForTimeout(wt); return true;
};
const body = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
const mode = process.argv[2] || "Long";
await ct(/^PLAY/); await ct(new RegExp("^" + mode)); await ct(/^Start — build/); await ct(/^Random \+ start/, 500);
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
const N = 12;
for (let r = 0; r < N; r++) {
  if (!await ct(/^Start round/, 700)) break;
  for (let w = 0; w < 40; w++) { await p.waitForTimeout(400); const l = await btns(); if (l.some((t) => /^Go to round|^Play again/.test(t))) break; }
  if (!await ct(/^Go to round/, 300)) break;
}
const t = await body();
const golds = [...t.matchAll(/Lv(\d+) (\d+)g/g)].map((m) => ({ lv: +m[1], g: +m[2] }));
console.log(mode + " · หลัง " + N + " ยก — เงินของแต่ละคน:", golds.map((x) => x.g + "g").join(" "),
  "· เลเวล:", golds.map((x) => "Lv" + x.lv).join(" "));
const avg = golds.reduce((a, x) => a + x.g, 0) / (golds.length || 1);
console.log("  เฉลี่ย " + avg.toFixed(1) + "g (" + (avg / N).toFixed(1) + "g/ยก) · เลเวลเฉลี่ย " +
  (golds.reduce((a, x) => a + x.lv, 0) / (golds.length || 1)).toFixed(1));
console.log("  ERRS", errs.slice(0, 3));
await b.close();
