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
const body = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
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

// --- ติดดาวของสองชิ้นในร้าน
await ct(/Open shop/, 600);
await ct(/^Tier 1 parts$/, 350);
const tiles = await p.evaluate(() => [...document.querySelectorAll("button")]
  .map((b, i) => [b.innerText.replace(/\s+/g, " ").trim(), i])
  .filter(([t]) => /^[A-Z].* \d+g$/.test(t)));
for (const k of [0, 2]) {
  await p.evaluate((i) => document.querySelectorAll("button")[i].click(), tiles[k][1]);
  await p.waitForTimeout(220);
  await ct(/^☆$/, 250);
  console.log("ติดดาว:", tiles[k][0]);
}
await ct(/^Close shop/, 400);

// --- แถบซื้อเร็วต้องโผล่บนการ์ดนักแข่ง
const t = await body();
const has = /Favourites — buy right here/.test(t);
console.log("แถบรายการโปรดบนการ์ด:", has ? "โผล่" : "ไม่โผล่");
const favBtns = (await btns()).filter((x) => /\d+g$/.test(x) && !/^Buy|^Sell/.test(x));
console.log("ปุ่มในแถบ:", favBtns.slice(0, 6).join(" | "));
const goldBefore = (await body()).match(/(\d+)g/);
const okBuy = await ct(/ \d+g$/, 450);
console.log("กดซื้อจากแถบ:", okBuy ? "ซื้อได้" : "กดไม่ได้");
const after = await body();
console.log("ของที่ถืออยู่ตอนนี้:", (after.match(/Straw Sandals|Boar Tusk|Willow Twig|Nymph's Dewdrop/g) || []).join(", ") || "—");
await p.screenshot({ path: "/tmp/fav.png", fullPage: true });
console.log("ERRS:", errs.slice(0, 5));
await b.close();
