// ---------------------------------------------------------------
// เล่นผ่านหน้าจอจริงให้จบแมตช์ แล้วดูว่าสมุดบันทึกแมตช์จดถูกไหม
//
// ---- ข้อจำกัดที่ต้องรู้ก่อนอ่านตัวเลขจากตัวนี้ ----
// ร้านค้าของผู้เล่นไม่มีระบบซื้ออัตโนมัติ shopFor ใช้กับฝ่ายตรงข้ามเท่านั้น
// (App.jsx:467 foeShop) ถ้าปล่อยให้ตัวกดปุ่มไม่ซื้ออะไรเลย
// จะกลายเป็น "คนที่ไม่ซื้อของ สู้บอทที่ซื้อครบ" ซึ่งอ่านบาลานซ์ไม่ได้
//
// จึงให้มันใช้ "ของที่แนะนำ" ในหน้าแผน (recommendedFor ตัวเดียวกับที่บอทใช้)
// แล้วกดปุ่ม "ซื้อตามแผน" ในร้านทุกยก — ฝั่งเราจึงออกของสมเหตุสมผล
//
// แปลว่าอัตราชนะที่ได้จะใกล้เคียง _gamewr.mjs โดยธรรมชาติ เพราะใช้ตรรกะซื้อของชุดเดียวกัน
// ค่าที่แท้จริงของตัวนี้คือพิสูจน์ว่าเส้นทาง "หน้าจอ -> จดสมุด" ทำงานครบวงจร
//
//   node _play.mjs [จำนวนแมตช์] [--show]
// ---------------------------------------------------------------
import fs from "fs";
import { chromium } from "playwright";

const GAMES = Number(process.argv[2] || 1);
const SHOW = process.argv.includes("--show");

const b = await chromium.launch({ headless: !SHOW });
const page = await b.newPage({ viewport: { width: 1280, height: 950 } });
const errs = [];
page.on("pageerror", (e) => errs.push("ERR " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("C " + m.text()); });
await page.goto(new URL("ruined-lore.html", import.meta.url).href);
await page.waitForTimeout(400);

const btns = () => page.evaluate(() =>
  [...document.querySelectorAll("button")].map((x) => ({
    t: x.innerText.replace(/\s+/g, " ").trim(), off: !!x.disabled,
  })));
const screen = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").trim());

async function clickAt(i, wt = 110) {
  await page.evaluate((k) => {
    const el = document.querySelectorAll("button")[k];
    if (el && !el.disabled) el.click();
  }, i);
  await page.waitForTimeout(wt);
}
async function click(re, wt = 110) {
  const l = await btns();
  const i = l.findIndex((x) => !x.off && re.test(x.t));
  if (i < 0) return false;
  await clickAt(i, wt);
  return true;
}
// กดทุกปุ่มที่ตรงเงื่อนไข จนไม่เหลือที่กดได้ (ใช้กับ "ซื้อตามแผน" ที่มีหลายคน)
async function clickAll(re, cap = 40) {
  let n = 0;
  for (let i = 0; i < cap; i++) {
    if (!(await click(re, 70))) break;
    n++;
  }
  return n;
}

// ---- ความเร็วไฟต์ 4x ครั้งเดียว ไม่งั้นช้าเกินจะเล่นหลายแมตช์
if (await click(/^SETTING/, 250)) {
  await click(/^4×$/, 120);
  await click(/^‹$/, 250);
}

const LANE = /^(TOP|JUNGLE|MID|ADC|SUPPORT)\b/;

async function startMatch() {
  for (let i = 0; i < 8; i++) {
    if (/Choose a mode and play/i.test(await screen())) break;
    if (!(await click(/^‹$/, 110))) break;
  }
  await click(/^PLAY/);
  await click(/^Quick Play/);                      // RUSH 20 ยก
  await click(/^Start — build your roster/);
  await click(/^(Random \+ start|Start)$/, 350);

  // เลือกห้าตัว
  for (let k = 0; k < 5; k++) {
    const l = await btns();
    const gi = l.findIndex((x) => /^[A-Z][A-Z.]{2,8} (TOP|JUNGLE|MID|ADC|SUPPORT)/.test(x.t));
    if (gi < 0) break;
    await clickAt(gi, 80);
    if (!(await click(/^Add to team$/i, 80))) break;
  }
  if (!(await click(/^Go to lanes$/i, 250))) throw new Error("กด Go to lanes ไม่ได้");

  // จัดตำแหน่ง — กดตัวละคร แล้วกดเลนที่ว่าง
  for (let k = 0; k < 5; k++) {
    const l = await btns();
    const ci = l.findIndex((x) => /^[A-Z][A-Z.]{2,8}$/.test(x.t));
    if (ci < 0) break;
    await clickAt(ci, 70);
    const l2 = await btns();
    const li = l2.findIndex((x) => /^(TOP|JUNGLE|MID|ADC|SUPPORT) empty/.test(x.t));
    if (li < 0) break;
    await clickAt(li, 70);
  }
  if (!(await click(/^Plan your build/i, 250))) throw new Error("กดไปหน้าแผนไม่ได้");

  // หน้าแผน — มีแท็บของแต่ละคน ("TOP · KAZEM") กดแท็บแล้วกด Use this build
  for (let k = 0; k < 5; k++) {
    const l = await btns();
    const ti = l.findIndex((x) => !x.off && /^(TOP|JUNGLE|MID|ADC|SUPPORT) · [A-Z]/.test(x.t));
    const tabs = l.map((x, i) => [x, i]).filter(([x]) => /^(TOP|JUNGLE|MID|ADC|SUPPORT) · [A-Z]/.test(x.t));
    if (!tabs[k]) break;
    await clickAt(tabs[k][1], 80);
    await click(/^Use this build$/i, 90);
  }
  if (!(await click(/^Start .*match/i, 350))) throw new Error("กดปุ่มเริ่มแมตช์ไม่ได้");
}

async function playRounds(maxSteps = 3000) {
  let lastScore = "", stuck = 0;
  for (let s = 0; s < maxSteps; s++) {
    const sc = await screen();
    // จอจบแมตช์เขียนว่า "Match lost" / "Match won" ไม่ใช่ "Lost the match"
    // ตัวจับเดิมไม่เจอ แล้วไปจบด้วยอาการค้าง ทำให้เล่นแมตช์ถัดไปไม่ได้
    if (/Match won|Match lost|Won the match|Lost the match/i.test(sc)) return { ok: true, steps: s };

    // ---- ร้านค้า: อัพสกิลให้ครบ แล้วกดปุ่มซื้อตามที่แนะนำที่เพิ่งเพิ่มเข้าเกม
    // ตรรกะเดียวกับที่ฝั่งศัตรูใช้ (shopFor) จึงออกของทันกันจริง
    // สามรอบก่อนหน้าไล่กดชิ้นส่วนเอง ได้แต่ของ Tier 1/2 คนละสูตร ไม่เคยปิด Tier 3
    if (/Build plan|Buy from plan|Buy recommended/i.test(sc)) {
      await clickAll(/^Auto$/i, 8);
      await clickAll(/^Suggest lane stances and jungle$/i, 2);
      await clickAll(/^Buy recommended for the whole team$/i, 3);
      await clickAll(/^Buy for me$/i, 8);
    }
    if (await click(/^(Start round \d+|Start the decider)$/i, 250)) { stuck = 0; continue; }

    // ---- หน้าเลน: ปิดยกถ้าดูครบ ไม่งั้นกดเลนที่ยังไม่ได้ดู
    if (await click(/^Close the round/i, 250)) { stuck = 0; continue; }
    // อยู่หน้าเลน — ปุ่มเปิดไฟต์คือ "Watch this lane"
    // ตอนแรกไปกดปุ่มที่ชื่อเลน ซึ่งเป็นแค่การ์ดข้อมูล กดแล้วไม่เกิดอะไร
    if (await click(/^Watch this lane$/i, 350)) { stuck = 0; continue; }
    if (/fight\(s\) (this round|still to watch)/i.test(sc)) {
      const l = await btns();
      const li = l.findIndex((x) => !x.off && LANE.test(x.t));
      if (li >= 0) { await clickAt(li, 350); stuck = 0; continue; }
    }

    // ---- หน้าผล: ไปยกถัดไป
    if (await click(/^(Go to round \d+|Go to the decider)$/i, 200)) { stuck = 0; continue; }

    // ---- ระหว่างไฟต์: ไม่มีปุ่มไปต่อ รอให้จบ
    const m = sc.match(/(\d+) – (\d+)/);
    const cur = m ? m[0] : "";
    if (cur && cur !== lastScore) { lastScore = cur; stuck = 0; }
    await page.waitForTimeout(260);
    stuck++;
    if (stuck > 100) {
      const l = await btns();
      const on = l.filter((x) => x.t && !x.off).map((x) => x.t.slice(0, 44));
      const off = l.filter((x) => x.t && x.off).map((x) => x.t.slice(0, 44));
      return {
        ok: false, why: "ค้างที่จอเดิมนานเกินไป", h: sc.slice(0, 200),
        on: on.slice(0, 16), off: off.slice(0, 8),
      };
    }
  }
  return { ok: false, why: "เดินเกิน " + maxSteps + " ก้าว", h: (await screen()).slice(0, 160) };
}

const readLog = () => page.evaluate(() => {
  try { return JSON.parse(localStorage.getItem("sideline.matchlog") || "[]"); } catch { return []; }
});

const t0 = Date.now();
let done = 0;
for (let g = 0; g < GAMES; g++) {
  try {
    await startMatch();
    const r = await playRounds();
    const rows = await readLog();
    if (r.ok) done++;
    const last = rows[rows.length - 1];
    console.log("แมตช์ " + (g + 1) + "/" + GAMES + " · " +
      (r.ok ? "จบใน " + r.steps + " ก้าว" : "ไม่จบ: " + r.why) +
      " · สมุด " + rows.length + " แถว" +
      (last ? " · " + (last.won ? "ชนะ" : "แพ้") + " " + last.score.join("-") +
        " ยก " + last.rounds + " · " + last.me.map((c) => c.champ).join(",") : ""));
    if (!r.ok) {
      console.log("   จอ: " + r.h);
      if (r.on) console.log("   กดได้: " + r.on.join(" | "));
      if (r.off) console.log("   กดไม่ได้: " + r.off.join(" | "));
      break;
    }
  } catch (e) {
    console.log("แมตช์ " + (g + 1) + " ล้ม: " + e.message);
    break;
  }
}

const rows = await readLog();
console.log("\nเล่นจบ " + done + "/" + GAMES + " แมตช์ · " + ((Date.now() - t0) / 1000).toFixed(0) + " วิ");
console.log("สมุดบันทึกแมตช์ " + rows.length + " แถว");
if (rows.length) {
  const r = rows[rows.length - 1];
  console.log("\nแถวล่าสุดที่จดได้:");
  console.log("  patch=" + r.patch + " mode=" + r.mode + " pvp=" + r.pvp + " diff=" + r.diff +
    " rounds=" + r.rounds + " endedBy=" + r.endedBy + " won=" + r.won);
  console.log("  ทีมเรา: " + r.me.map((c) => c.champ + "/" + c.lane + " lv" + c.level +
    " [" + c.items.join(",") + "]").join(" · "));
  console.log("  ชนะเลน: " + JSON.stringify(r.lanes));
  console.log("  รายตัว: " + Object.entries(r.champs).map(([k, v]) =>
    k + " " + v.k + "/" + v.d + "/" + v.a + " ชนะไฟต์ " + v.won + "/" + v.fights).join(" · "));
  fs.writeFileSync("_played-matchlog.json",
    JSON.stringify({ kind: "sideline.matchlog", v: 1, rows }, null, 1));
  console.log("\nเขียน _played-matchlog.json แล้ว (นำเข้าในหน้า MATCH STATS ได้)");
}
console.log("error: " + (errs.length ? errs.slice(0, 3).join(" / ") : "ไม่มี"));
await b.close();
