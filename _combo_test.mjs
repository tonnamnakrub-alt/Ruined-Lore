// ELLA Q — คอมโบสามจังหวะต้องได้ใช้ครบทั้งสามจังหวะจริงในไฟต์
// เดิมคูลดาวน์ลงตั้งแต่จังหวะแรก (10 วิ) แต่หน้าต่างคอมโบมีแค่ 5 วิ จังหวะ 2-3 จึงไม่มีวันได้ใช้
import { buildFight } from "./src/engine/build-fight.js";
import { step } from "./src/engine/step.js";
import { toDef } from "./src/game/roster.js";
import { DEFAULT_FIGHT } from "./src/data/tuning.js";
import { CHAMPIONS } from "./src/data/champions.js";

const mk = (lane, id) => ({
  lane, champId: id, level: 16, xp: 0, gold: 0, items: [],
  ranks: { Q: 5, W: 5, E: 5, R: 3 },
  athlete: { mechanics: 9, gameSense: 9, knowledge: 9, decision: 10, teamwork: 9 },
  upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE",
});

const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);

const sk = CHAMPIONS.ELLA.skills.find((s) => s.key === "Q");
t("ข้อมูล Q ของ ELLA มีสามจังหวะ", sk.steps.length === 3, sk.steps.map((s) => s.th).join(" → "));
t("หน้าต่างคอมโบสั้นกว่าคูลดาวน์", sk.window < Math.min(...sk.cdByRank),
  "หน้าต่าง " + sk.window + " วิ · คูลดาวน์ " + sk.cdByRank.join("/") + " วิ");

let beat1 = 0, beat2 = 0, beat3 = 0, fights = 0, full = 0;
for (let seed = 1; seed <= 40; seed++) {
  const st = buildFight([mk("JUNGLE", "ELLA")].map(toDef), [mk("TOP", "KAZEM")].map(toDef), seed, DEFAULT_FIGHT);
  const e = st.units.find((u) => u.champId === "ELLA");
  let prev = 0, logAt = 0, a = 0, b = 0;
  let g = 0;
  while (!st.over && g++ < 60 * 70) {
    step(st);
    const now = e.comboStep || 0;
    if (now === 1 && prev === 0) a++;
    if (now === 2 && prev === 1) b++;
    prev = now;
    logAt = st.log.length;
  }
  // จังหวะสุดท้าย = จำนวนครั้งที่กด Q ทั้งหมด ลบสองจังหวะแรก
  const casts = st.log.slice(0, logAt).filter((l) => String(l.text || "").includes("Q Midnight Waltz")).length;
  const c = casts - a - b;
  beat1 += a; beat2 += b; beat3 += c;
  fights++;
  if (b > 0 && c > 0) full++;
}
t("จังหวะที่ 1 ได้ยิง", beat1 > 0, beat1 + " ครั้งใน " + fights + " ไฟต์");
t("จังหวะที่ 2 ได้ยิง", beat2 > 0, beat2 + " ครั้ง");
t("จังหวะที่ 3 ได้ยิง", beat3 > 0, beat3 + " ครั้ง");
t("ไม่มีจังหวะไหนหายไปทั้งชุด", beat2 >= beat1 * 0.6 && beat3 >= beat2 * 0.6,
  beat1 + " / " + beat2 + " / " + beat3);
t("ต่อคอมโบครบสามจังหวะได้เกือบทุกไฟต์", full >= fights * 0.8, full + "/" + fights + " ไฟต์");

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(36) + " " + d); }
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
