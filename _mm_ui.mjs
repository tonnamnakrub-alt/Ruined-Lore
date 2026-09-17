import { chromium } from "playwright";
const b = await chromium.launch();
const errs = [];
const p = await b.newPage({ viewport: { width: 430, height: 950 }, deviceScaleFactor: 1.5 });
p.on("pageerror", e => errs.push("ERR: " + e.message));
p.on("console", m => { if (m.type() === "error") errs.push("C: " + m.text()); });
await p.goto(new URL("ruined-lore.html", import.meta.url).href);
await p.waitForTimeout(500);
const btns = async () => p.evaluate(() => [...document.querySelectorAll("button")].map(b => b.innerText.replace(/\s+/g, " ").trim()));
const ct = async (re, wt = 350) => {
  const l = await btns(); const i = l.findIndex(t => re.test(t));
  if (i < 0) { console.log("NOTFOUND", String(re), "|", l.slice(0, 14).join(" / ")); return false; }
  await p.evaluate(i => document.querySelectorAll("button")[i].click(), i); await p.waitForTimeout(wt); return true;
};
console.log("MENU:", (await btns()).join(" / ").slice(0, 140));
await ct(/^ITEM/);
console.log("ITEM tabs:", (await btns()).join(" / ").slice(0, 200));
await ct(/^Marksman$/i);
await p.screenshot({ path: "/tmp/mm_item.png", fullPage: true });
const txt = await p.evaluate(() => document.body.innerText.replace(/[ \t]+/g, " "));
const want = ["Artemis", "Swan Maiden", "Sleipnir", "William Tell", "Urd", "Indra", "Bow of Eurytus", "Shiva", "Hephaestus", "Apollo"];
console.log("shown:", want.map(w => (txt.includes(w) ? "✓" : "✗") + w).join(" "));
// open the first marksman item's detail and read the passive line
const l = await btns(); const i = l.findIndex(t => /Artemis/.test(t));
if (i >= 0) { await p.evaluate(i => document.querySelectorAll("button")[i].click(), i); await p.waitForTimeout(400); }
await p.screenshot({ path: "/tmp/mm_detail.png", fullPage: true });
const d = await p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
console.log("DETAIL:", d.slice(0, 600));
const thai = (d.match(/[฀-๿]+/g) || []);
console.log("Thai leaks on EN item page:", thai.length ? thai.slice(0, 10).join(" | ") : "none");
// --- Support tab
await ct(/^Support$/i);
await p.screenshot({ path: "/tmp/sup_item.png", fullPage: true });
const st = await p.evaluate(() => document.body.innerText.replace(/[ \t]+/g, " "));
const swant = ["Asclepius", "Aceso", "Saraswati", "Yggdrasil", "Eir", "Aeolus", "Hermes", "Pridwen", "Gjallarhorn", "Dioscuri"];
console.log("support shown:", swant.map(w => (st.includes(w) ? "✓" : "✗") + w).join(" "));
const si = (await btns()).findIndex(t => /Asclepius/.test(t));
if (si >= 0) { await p.evaluate(i => document.querySelectorAll("button")[i].click(), si); await p.waitForTimeout(400); }
const sd = await p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
console.log("SUPPORT DETAIL:", sd.slice(sd.indexOf("Asclepius"), sd.indexOf("Asclepius") + 420));
const sthai = (sd.match(/[฀-๿]+/g) || []);
console.log("Thai leaks on support page:", sthai.length ? sthai.slice(0, 10).join(" | ") : "none");
// --- every tab opens without error
for (const tab of ["Starter", "Tier 1 parts", "Tier 2 parts", "Boots", "Tank", "Fighter", "Assassin", "Mage", "Marksman", "Support"]) {
  const ok = await ct(new RegExp("^" + tab.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i"), 260);
  const head = await p.evaluate(() => {
    const m = document.body.innerText.match(/[^\n]*·[^\n]*items[^\n]*/);
    return m ? m[0].trim() : "?";
  });
  console.log((ok ? "  tab " : "  MISSING ") + tab.padEnd(14), head);
}
console.log("ERRS:", errs.slice(0, 5));
await b.close();
