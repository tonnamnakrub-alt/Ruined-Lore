import { chromium } from "playwright";
const b = await chromium.launch();
const errs = [];
async function shots(w, h, tag) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1.5 });
  p.on("pageerror", e => errs.push(tag + ": " + e.message));
  p.on("console", m => { if (m.type()==="error") errs.push(tag+" C:"+m.text()); });
  await p.goto(new URL("ruined-lore.html", import.meta.url).href);
  const btns = async () => p.evaluate(() => [...document.querySelectorAll("button")].map(b => b.innerText.replace(/\s+/g," ").trim()));
  const ct = async (re,wt=300) => { const l=await btns(); const i=l.findIndex(t=>re.test(t)); if(i<0){console.log("NOTFOUND",tag,String(re),"|",l.slice(0,8).join(" / "));return false;} await p.evaluate(i=>document.querySelectorAll("button")[i].click(), i); await p.waitForTimeout(wt); return true; };
  await p.waitForTimeout(400);
  await p.screenshot({ path: `/tmp/ui_${tag}_menu.png` });
  console.log(tag, "MENU:", (await btns()).join(" / ").slice(0,120));
  await ct(/^PLAY/); await p.screenshot({ path: `/tmp/ui_${tag}_play.png` });
  console.log(tag, "PLAY:", (await btns()).join(" / ").slice(0,160));
  await ct(/^Start — build your roster/); await ct(/^(Random \+ start|Start)/, 500);
  await p.screenshot({ path: `/tmp/ui_${tag}_pick.png`, fullPage: false });
  console.log(tag, "PICK:", (await p.evaluate(()=>document.body.innerText.replace(/\s+/g," ").slice(0,150))));
  // pick 5 via the info-panel button
  for (let k=0;k<5;k++){ const l=await btns(); const gi=l.findIndex(t=>/^[A-Z][A-Z.]{2,8} (TOP|JUNGLE|MID|ADC|SUPPORT)/.test(t)); if(gi<0) break;
    await p.evaluate(i=>document.querySelectorAll("button")[i].click(), gi); await p.waitForTimeout(120);
    await ct(/^(Add to (the )?roster|Pick)/i, 150); }
  console.log(tag, "after picks:", (await btns()).slice(-3).join(" / "));
  await p.screenshot({ path: `/tmp/ui_${tag}_pick2.png` });
  // back to menu -> store
  await ct(/^(Back to|Edit athlete)/i, 250); await ct(/^‹$/, 250); await ct(/^‹$/, 250);
  await ct(/^CHARACTER STORE/, 350); await p.screenshot({ path: `/tmp/ui_${tag}_store.png` });
  console.log(tag, "STORE:", (await p.evaluate(()=>document.body.innerText.replace(/\s+/g," ").slice(0,170))));
  await ct(/^MID$/, 250); await p.screenshot({ path: `/tmp/ui_${tag}_store_mid.png` });
  await ct(/^‹$/, 250);
  await ct(/^ITEM/, 350); await p.screenshot({ path: `/tmp/ui_${tag}_item.png` });
  console.log(tag, "ITEM:", (await p.evaluate(()=>document.body.innerText.replace(/\s+/g," ").slice(0,200))));
  await ct(/^Tank$/, 250); await p.screenshot({ path: `/tmp/ui_${tag}_item_tank.png` });
  await ct(/^‹$/, 250);
  await ct(/^SETTING/, 350); await p.screenshot({ path: `/tmp/ui_${tag}_setting.png` });
  await p.close();
}
await shots(1280, 900, "desk");
await shots(430, 950, "mob");
console.log("ERRS:", errs.slice(0,4));
await b.close();
