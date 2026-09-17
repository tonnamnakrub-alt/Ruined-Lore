import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const errs = [];
async function run(w, h, tag) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1.5 });
  p.on("pageerror", (e) => errs.push(tag + " ERR: " + e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push(tag + " C: " + m.text()); });
  await p.goto("file:///home/claude/sideline/sideline.html");
  await p.waitForTimeout(400);
  const btns = () => p.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.innerText.replace(/\s+/g, " ").trim()));
  const ct = async (re, wt = 300) => {
    const l = await btns(); const i = l.findIndex((t) => re.test(t));
    if (i < 0) { console.log(tag, "MISS", String(re), "|", l.slice(0, 10).join(" / ")); return false; }
    await p.evaluate((i) => document.querySelectorAll("button")[i].click(), i); await p.waitForTimeout(wt); return true;
  };
  const type = async (v) => {
    await p.evaluate((v) => {
      const el = document.querySelector("input");
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, v);
    await p.waitForTimeout(350);
  };
  const body = () => p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));

  // ---- ITEM book search
  await ct(/^ITEM/);
  await type("crit");
  console.log(tag, "ITEM search 'crit':", (await body()).match(/Search results · \d+ items/) || "NONE");
  await type("grievous");
  console.log(tag, "ITEM search 'grievous':", (await body()).match(/Search results · \d+ items/) || "NONE");
  await type("");
  await ct(/^‹$/, 250);

  // ---- into a match, open the shop
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
  if (!await ct(/Open shop|^Shop/, 600)) { await p.close(); return; }
  const shop = await body();
  console.log(tag, "SHOP has detail panel:", /Built from|Category/.test(shop) ? "YES" : "NO",
    "| buy button:", /Buy \d+g/.test(shop) ? "YES" : "NO",
    "| old recipe toggle:", /Show recipe|▸/.test(shop) ? "YES" : "NO");
  await p.screenshot({ path: `/tmp/shop_${tag}.png`, fullPage: false });
  await type("armor");
  console.log(tag, "SHOP search 'armor':", (await body()).match(/Search results · \d+ items/) || "NONE");
  // เลือกของที่มีสูตรก่อน ค่อยเปิดต้นไม้สูตรแบบเดิม
  await type("Nemean Lion");
  await ct(/^Nemean Lion/, 350);
  await ct(/Show recipe|ดูสูตร/, 400);
  const withTree = await body();
  console.log(tag, "recipe tree open:", /Final combine cost|ค่าประกอบ/.test(withTree) ? "YES" : "NO");
  await p.screenshot({ path: `/tmp/shop_recipe_${tag}.png`, fullPage: false });
  await p.close();
}
await run(1280, 900, "desk");
await run(430, 950, "mob");
console.log("ERRS:", errs.slice(0, 6));
await b.close();
