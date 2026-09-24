// ค่าหัว — ตัวที่เงินนำหรือฆ่ารัว ต้องมีค่าหัวแพงขึ้นจริง และเงินต้องไหลไปถึงคนเก็บ
import { BOUNTY, KILL } from "./src/data/behaviour.js";
import { bountyOf, farmAverage, netWorth, streaksAfterRound } from "./src/game/bounty.js";
import { buildRoundPlan } from "./src/game/round-plan.js";
import { settleRound } from "./src/game/settle.js";
import { packTeam, unpackTeam } from "./src/net/protocol.js";

const LANES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
const out = [];
const t = (n, ok, d) => out.push([n, ok, d || ""]);

const mk = (lane, extra) => ({
  lane, champId: "KAZEM", level: 8, xp: 0, gold: 0, items: [],
  ranks: { Q: 1, W: 1, E: 1, R: 1 },
  athlete: { mechanics: 5, gameSense: 5, knowledge: 5, decision: 5, teamwork: 5 },
  upgrades: [], bountyGold: 0, sangHp: 0, wvcStacks: 0, spot: null,
  char: "P", athleteName: "P", style: "POKE", ...extra,
});
const roster = (extra = {}) => LANES.map((L) => mk(L, extra[L] || {}));

// ---- ตารางแปลงมาจาก LoL หาร 50 ----
t("สังหารปกติ = 300 ทองหาร 50", BOUNTY.base === KILL.gold && KILL.gold === 6, BOUNTY.base + "g");
t("ชั้นค่าหัวจากการฆ่ารัว", BOUNTY.streak.join(",") === "0,0,3,6,8,10,12,14",
  BOUNTY.streak.map((s, i) => i + ":" + (BOUNTY.base + s) * 50).slice(2).join(" · "));
t("เพดานรวม 1000 ทอง", BOUNTY.max === 20, BOUNTY.max * 50 + " ทอง");

// ---- ไม่มีอะไรพิเศษ = ค่าหัวปกติ ----
{
  const me = roster();
  const them = roster();
  t("ไม่นำใคร ไม่ฆ่ารัว = ค่าหัวปกติ", bountyOf(me[0], them).total === KILL.gold, bountyOf(me[0], them).total + "g");
}

// ---- ฆ่ารัวแล้วค่าหัวขึ้นเป็นชั้น ----
{
  const them = roster();
  const at = (k) => bountyOf(mk("TOP", { killStreak: k }), them).total;
  const seq = [0, 1, 2, 3, 4, 5, 6, 7, 9].map(at);
  t("ฆ่าติดกันแล้วค่าหัวขึ้นตามตาราง", seq.join("/") === "6/6/9/12/14/16/18/20/20", seq.join(" → "));
}

// ---- ตายติดกันแล้วค่าหัวลด และไปหยุดที่ 100 ทอง ----
{
  const them = roster();
  const at = (d) => bountyOf(mk("TOP", { deathStreak: d }), them).total;
  const seq = [0, 1, 2, 3, 4, 5, 6, 7, 8, 12].map(at);
  t("ตายติดกันแล้วค่าหัวลด", seq[0] === 6 && seq[1] === 4 && seq[7] === 1, seq.join(" → "));
  t("ตายเยอะสุดๆ หยุดที่ 100 ทอง", seq[8] === 2 && seq[9] === 2, "ชั้นสุดท้าย " + seq[9] * 50 + " ทอง");
}

// ---- เงินนำอีกฝั่ง ----
{
  const them = roster();               // ทุกตัวเงิน 0
  t("ค่าเฉลี่ยไม่รวมซัพพอร์ต", farmAverage(them) === 0 && netWorth(them[0]) === 0, "เฉลี่ย " + farmAverage(them));
  const lead = (g) => bountyOf(mk("TOP", { gold: g }), them);
  t("นำไม่ถึง 100 ทอง ยังไม่มีค่าหัวจากเงินนำ", lead(1).lead === 0, "นำ 50 ทอง -> +" + lead(1).lead);
  t("นำ 100 ทอง ได้ +50", lead(2).lead === 1, "+" + lead(2).lead * 50 + " ทอง");
  t("นำเพิ่มทุก 150 ทอง ได้อีก +50", lead(5).lead === 2 && lead(8).lead === 3,
    "นำ 250 -> +" + lead(5).lead * 50 + " · นำ 400 -> +" + lead(8).lead * 50 + " ทอง");
  t("ส่วนเงินนำมีเพดาน", lead(999).lead === BOUNTY.leadMax, "+" + BOUNTY.leadMax * 50 + " ทอง");
  t("เงินนำอย่างเดียวยังไม่ถึงเพดาน", lead(999).total === BOUNTY.base + BOUNTY.leadMax, lead(999).total + "g");
  const both = bountyOf(mk("TOP", { gold: 999, killStreak: 7 }), them);
  t("รวยและฆ่ารัวพร้อมกัน ชนเพดาน", both.total === BOUNTY.max, both.base + "+" + both.streak + "+" + both.lead + " -> " + both.total + "g");
  // ของที่ซื้อไปแล้วนับเป็นเงินที่หามาได้ด้วย
  const rich = mk("TOP", { gold: 0, items: [{ id: "x", cost: 40 }] });
  t("ของที่ซื้อไปแล้วนับเป็นเงินนำด้วย", bountyOf(rich, them).lead > 0, "นำ " + bountyOf(rich, them).leadGold);
}

// ---- สถิติต่อเนื่องหลังจบยก ----
{
  const a = streaksAfterRound({ killStreak: 2, deathStreak: 0 }, { kills: 2, alive: true });
  t("ฆ่าเพิ่มโดยไม่ตาย = สะสมต่อ", a.killStreak === 4 && a.deathStreak === 0, JSON.stringify(a));
  const b = streaksAfterRound({ killStreak: 4, deathStreak: 0 }, { kills: 0, alive: false });
  t("ตายแล้วสายสังหารขาด", b.killStreak === 0 && b.deathStreak === 1, JSON.stringify(b));
  const c = streaksAfterRound({ killStreak: 0, deathStreak: 3 }, { kills: 1, alive: false });
  t("ตายแต่เก็บได้ = ล้างสายตาย", c.deathStreak === 0 && c.killStreak === 0, JSON.stringify(c));
  const d = streaksAfterRound({ killStreak: 1, deathStreak: 0 }, null);
  t("ไม่ได้ลงไฟต์ = ไม่ขยับ", d.killStreak === 1 && d.deathStreak === 0, JSON.stringify(d));
}

// ---- ปิดยกจริง: เงินศพต้องเท่ากับค่าหัวของตัวที่ถูกเก็บ ----
{
  const stances = { TOP: "NEUTRAL", MID: "NEUTRAL", BOT: "NEUTRAL" };
  const plan = buildRoundPlan({ stances, foeStances: stances, jungle: { lane: null, crew: [] }, foeJungle: { lane: null, crew: [] }, round: 5 });
  plan.foeStances = stances;
  plan.foeJungleLane = null;
  plan.foeJungleCrew = [];
  plan.seed = 1;

  // ฝั่งแดงมิดรวยและฆ่ารัวมาก่อน — ค่าหัวต้องแพง
  const fed = { MID: { gold: 60, killStreak: 3 } };
  const me = roster();
  const foe = roster(fed);
  const fedBounty = bountyOf(foe[2], me).total;
  t("ตัวที่รวยและฆ่ารัวมีค่าหัวแพง", fedBounty > KILL.gold, fedBounty + "g (ปกติ " + KILL.gold + "g)");

  // ทีมเรามิดเก็บมิดแดงได้หนึ่งศพ
  const unit = (team, lane, extra) => ({ team, lane, alive: true, kills: 0, assists: 0, soloAssists: 0,
    wvcGold: 0, duelGold: 0, bountyGold: 0, sangGained: 0, duelKills: [], victims: [], ...extra });
  const done = {
    MID: {
      lane: "MID", iWon: true, winner: "blue", time: 20, rows: [], log: [],
      units: [
        unit("blue", "MID", { kills: 1, victims: [{ team: "red", lane: "MID" }] }),
        unit("red", "MID", { alive: false }),
      ],
    },
  };
  const res = settleRound({ plan, done, team: me, foe, mySide: "blue", jungle: { lane: null, crew: [] }, round: 5, mode: { gold: 1, xp: 1 } });
  const row = res.breakdown.me.find((r) => r.lane === "MID");
  const killPart = row.parts.find((p) => p.key === "kills");
  t("เงินศพเท่ากับค่าหัวของเหยื่อ", killPart && killPart.gold === fedBounty,
    killPart ? killPart.gold + "g" : "ไม่มีบรรทัดสังหาร");
  t("ใบเสร็จยังรวมได้ยอดจริง",
    row.parts.reduce((s, p) => s + p.gold, 0) === row.gold, row.gold + "g");
  // เหยื่อตายแล้วสายตายเดิน ส่วนคนเก็บได้สายสังหาร
  const killer = res.nextMe.find((c) => c.lane === "MID");
  const victim = res.nextFoe.find((c) => c.lane === "MID");
  t("คนเก็บได้สายสังหารต่อ", killer.killStreak === 1, "สายสังหาร " + killer.killStreak);
  t("เหยื่อสายสังหารขาดและขึ้นสายตาย", victim.killStreak === 0 && victim.deathStreak === 1,
    "สังหาร " + victim.killStreak + " · ตาย " + victim.deathStreak);
}

// ---- สถิติต้องรอดข้ามสาย ----
{
  const back = unpackTeam(packTeam([mk("TOP", { killStreak: 3, deathStreak: 2 })]))[0];
  t("สายสังหาร/สายตายรอดข้ามสาย", back.killStreak === 3 && back.deathStreak === 2,
    "สังหาร " + back.killStreak + " · ตาย " + back.deathStreak);
}

let fail = 0;
for (const [n, ok, d] of out) { if (!ok) fail++; console.log((ok ? "  ok  " : " FAIL ") + n.padEnd(40) + " " + d); }
console.log("\nไม่ผ่าน " + fail + " / " + out.length);
process.exit(fail ? 1 : 0);
