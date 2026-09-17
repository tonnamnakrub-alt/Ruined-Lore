import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const errs = [];
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on("pageerror", (e) => errs.push("ERR: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("C: " + m.text()); });
await p.goto("file:///home/claude/sideline/sideline.html");
await p.waitForTimeout(400);
const btns = () => p.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.innerText.replace(/\s+/g, " ").trim()));
const ct = async (re, wt = 300) => {
  const l = await btns(); const i = l.findIndex((t) => re.test(t));
  if (i < 0) return false;
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

const pts = async () => { const m = (await body()).match(/(\d+) points left/); return m ? +m[1] : null; };
const dots = async () => p.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /^Q \+/.test(x.innerText.trim()));
  return b ? (b.innerText.match(/●+/) || [""])[0].length : -1;
});
console.log("ก่อนกด — แต้มสกิลเหลือ", await pts(), "· แรงก์ Q", await dots());
// แตะการ์ดสกิล = อัพเลย ไม่เปิดโมดัล
await ct(/^Q \+/, 350);
const modalOpen = /Rank|แรงก์|Upgrade to rank/.test(await body());
console.log("แตะการ์ด Q -> แต้มเหลือ", await pts(), "· แรงก์ Q", await dots(), "· โมดัลเปิด:", modalOpen ? "เปิด (ไม่ถูก)" : "ไม่เปิด (ถูก)");
// กดปุ่ม ⓘ = เปิดโมดัล
const ok = await ct(/^ⓘ$/, 400);
const after = await body();
console.log("กดปุ่ม ⓘ:", ok ? "กดได้" : "ไม่เจอ", "· โมดัลเปิด:", /Upgrade to rank|What rank|Cooldown|คูลดาวน์/.test(after) ? "เปิด (ถูก)" : "ไม่เปิด (ไม่ถูก)");
const modal = await body();
const wants = ["Current stats", "HP", "AD", "Attack speed", "Crit chance"];
console.log("แผงค่าสถานะในโมดัลสกิล:", wants.map((w) => (modal.includes(w) ? "✓" : "✗") + w).join(" "));
await p.screenshot({ path: "/tmp/skillbtn.png", fullPage: true });
console.log("ERRS:", errs.slice(0, 5));
await b.close();
