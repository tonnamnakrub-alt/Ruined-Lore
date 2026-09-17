// ตรวจว่าหลังเล่นไปหลายยก บอทซื้อของสาย AP ให้ตัว AD หรือเปล่า
import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport: { width: 900, height: 950 } });
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto("file:///home/claude/sideline/sideline.html");
const btns=async()=>p.evaluate(()=>[...document.querySelectorAll("button")].map(b=>b.innerText.replace(/\s+/g," ").trim()));
const ci=async(i,w=120)=>{await p.evaluate(i=>{const b=document.querySelectorAll("button")[i];if(b)b.click();},i);await p.waitForTimeout(w);};
const ct=async(re,w=260)=>{const l=await btns();const i=l.findIndex(t=>re.test(t));if(i<0){console.log("miss",String(re),"|",l.slice(0,10).join(" / "));return false;}await ci(i,w);return true;};
await ct(/^PLAY/); await ct(/^Rush · 20/); await ct(/^Start — build/); await ct(/^Random \+ start/,450);
for (let k=0;k<5;k++){ const l=await btns(); const gi=l.findIndex(t=>/^[A-Z][A-Z.]{2,8} (TOP|JUNGLE|MID|ADC|SUPPORT)/.test(t)); if(gi<0)break; await ci(gi,80); await ct(/^Add to team/,110); }
await ct(/^Go to lanes/);
for (let k=0;k<5;k++){ const l=await btns(); const i=l.findIndex(t=>/^[A-Z][A-Z.]{2,8}$/.test(t)); if(i<0)break; await ci(i,80); const l2=await btns(); const j=l2.findIndex(t=>/empty/.test(t)); if(j<0)break; await ci(j,80); }
await ct(/^Plan your build/); await ct(/^Start .* match/);
let txt = "none";
for (let r=0;r<14;r++){
  if (r === 9) {
    if (await ct(/^Scout the enemy|^Scout enemy/,700)) {
      txt = await p.evaluate(()=>{const el=[...document.querySelectorAll("div")].find(d=>getComputedStyle(d).position==="fixed"&&d.innerText.includes("TEAM COMPARISON"));return el?el.innerText.replace(/\s+/g," "):"none";});
      await ct(/^×$/,250);
    }
    break;
  }
  if (!await ct(/^Start round/,700)) break;
  await ct(/^4×/,150);
  for (let w=0;w<40;w++){ await p.waitForTimeout(500); const l=await btns(); if (l.some(t=>/^Go to round|^Play again/.test(t))) break; }
  if (!await ct(/^Go to round/,300)) break;
}
const adc = txt.indexOf("SUPPORT");
console.log("SUPPORT:", adc>=0 ? txt.slice(adc, adc+420) : txt.slice(0,600));
console.log("ERRS", errs.slice(0,2));
await b.close();
