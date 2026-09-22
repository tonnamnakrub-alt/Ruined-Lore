import { tr } from "../i18n.js";
import React from "react";
import { CHAMPIONS } from "../data/champions.js";
import {
  ASSIST_GROUP, ASSIST_SOLO, GANK_HURT, JUNGLE_CREW, JUNGLE_FARM, JUNGLE_GANK, JUNGLE_TABLE,
  KILL, SAFE_STAND_SECONDS, STANCES, STANCE_LIST, laneOutcome,
} from "../data/behaviour.js";
import { LANE_INFO } from "../data/lanes.js";
import { MODES } from "../data/modes.js";
import { Shell, card } from "../ui/chrome.jsx";
import { C, MONO } from "../ui/theme.js";
import { Label } from "../ui/widgets.jsx";

// ---------------------------------------------------------------
// ระบบเงิน — ทุกตัวเลขในหน้านี้อ่านจากข้อมูลจริงของเกม ไม่ได้พิมพ์ซ้ำ
// ปรับตัวเลขที่ data/behaviour.js แล้วหน้านี้เปลี่ยนตามเองทันที
// ---------------------------------------------------------------

const TONE = { SAFE: C.blue, NEUTRAL: C.dim, AGGRO: C.red };
const sg = (n) => (n > 0 ? "+" + n : String(n));

function Section({ title, children }) {
  return (
    <div style={{ ...card(), padding: 12, marginBottom: 10 }}>
      <Label style={{ marginBottom: 8, color: C.gold }}>{title}</Label>
      {children}
    </div>
  );
}

function Line({ children, dim }) {
  return <div style={{ fontSize: 11.5, color: dim ? C.dim : C.ink, lineHeight: 1.7 }}>{children}</div>;
}

export function EconomyScreen(ctx) {
  const { score, mode, wide, econBack } = ctx;
  const stTh = (s) => tr(STANCES[s].th);
  const chip = (s) => (
    <span style={{ fontFamily: MONO, fontWeight: 800, color: TONE[s] }}>{stTh(s)}</span>
  );

  // ตารางนิสัยเลน — แถว = เรา · คอลัมน์ = เขา
  const cell = (a, b) => {
    const o = laneOutcome(a, b);
    if (o.fight) {
      return (
        <div>
          <div style={{ color: C.red, fontWeight: 800 }}>{o.aggroDuel ? tr("ไฟต์แตก") : tr("บังคับไฟต์")}</div>
          <div style={{ color: C.dim, fontSize: 10 }}>{tr("ไม่มีรายได้ฐาน · เหลือแค่ศพ")}</div>
        </div>
      );
    }
    return (
      <div>
        <div style={{ color: C.gold }}>{tr("เรา")} {sg(o.me.gold)}g {sg(o.me.xp)}xp</div>
        <div style={{ color: C.dim }}>{tr("เขา")} {sg(o.foe.gold)}g {sg(o.foe.xp)}xp</div>
      </div>
    );
  };

  const hook = CHAMPIONS["C.HOOK"] && CHAMPIONS["C.HOOK"].bounty;
  const puss = CHAMPIONS.PUSS && CHAMPIONS.PUSS.duel;
  const hookSeq = hook
    ? Array.from({ length: (hook.doubleCap != null ? hook.doubleCap : 4) + 1 }, (_, i) => hook.perRound * Math.pow(2, i))
    : [];

  return (
    <Shell round={0} score={score} mode={mode} title={tr("ระบบเงิน")} maxWidth={wide ? 900 : 620} onBack={econBack}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{tr("เงินและ XP คิดยังไง")}</div>
        <div style={{ fontSize: 12, color: C.dim, marginTop: 4, lineHeight: 1.6 }}>
          {tr("ทุกตัวเลขในหน้านี้อ่านจากข้อมูลจริงของเกม — ปรับตัวเลขในโค้ดแล้วหน้านี้เปลี่ยนตามทันที")}
        </div>
      </div>

      <Section title={tr("ใครชนะยก")}>
        <Line>{tr("ยกนี้ทีมไหนได้เงินรวมทั้งทีมมากกว่า ทีมนั้นได้แต้ม — ได้เท่ากันคือเสมอ ไม่มีใครได้แต้ม")}</Line>
        <Line dim>{tr("ชนะเลนไม่ได้แปลว่าชนะยก เลนที่ชนะให้เงินผ่านศพเท่านั้น")}</Line>
        {hook ? <Line dim>{tr("ไม่นับกระเป๋าตลาดมืดของ C.HOOK เพราะได้ทุกยกโดยไม่ต้องลงไฟต์")}</Line> : null}
      </Section>

      <Section title={tr("นิสัยเลน — เราเจอเขา (ต่อคนในเลน)")}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontFamily: MONO, fontSize: 10.5, minWidth: 420 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "4px 6px", color: C.dim, fontWeight: 400 }}>{tr("เรา \\ เขา")}</th>
                {STANCE_LIST.map((b) => (
                  <th key={b} style={{ textAlign: "left", padding: "4px 6px" }}>{chip(b)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STANCE_LIST.map((a) => (
                <tr key={a} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td style={{ padding: "6px 6px", verticalAlign: "top" }}>{chip(a)}</td>
                  {STANCE_LIST.map((b) => (
                    <td key={b} style={{ padding: "6px 6px", verticalAlign: "top", lineHeight: 1.5 }}>{cell(a, b)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 8 }}>
          <Line dim>
            {tr("ฐานของแต่ละนิสัย: {0}", STANCE_LIST.map((s) => stTh(s) + " " + STANCES[s].gold + "g " + STANCES[s].xp + "xp").join(" · "))}
          </Line>
          <Line dim>{tr("รายได้เลนที่ติดลบปัดเป็นศูนย์ ไม่หักจากเงินศพ")}</Line>
          <Line dim>{tr("เลนบอทมีสองคน — ADC ได้ตามตาราง ส่วนซัพไม่ได้ส่วนนี้ (ดูพาสซีฟเลนด้านล่าง)")}</Line>
        </div>
      </Section>

      <Section title={tr("ป่า")}>
        <Line>{tr("ฟาร์ม {0}g {1}xp · ไปแกงค์ {2}g {3}xp — ป่าได้รายได้ฐานเสมอ แม้จะไปแกงค์หรือโดนลากเข้าไฟต์", JUNGLE_FARM.gold, JUNGLE_FARM.xp, JUNGLE_GANK.gold, JUNGLE_GANK.xp)}</Line>
        <Line dim>{tr("แกงค์ได้เฉพาะเลนที่ยกนี้สั่งปกติหรือรุกล้ำ · โดนดักหรือโดนสวนก่อนเข้า เสียเลือด {0}% ก่อนเริ่มไฟต์", Math.round(GANK_HURT * 100))}</Line>
        <Line dim>
          {tr("พาเพื่อนไปแกงค์ด้วยได้: {0} — ดึงได้เฉพาะเลนที่สั่งเซฟ และเลนที่ถูกทิ้งไว้ อีกฝั่งกินฟรี +2 เงิน",
            JUNGLE_CREW.map((c) => tr("ยก {0}+ ได้ {1} คน", c.round, c.crew)).join(" · "))}
        </Line>
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table style={{ borderCollapse: "collapse", fontSize: 10.5, minWidth: 440 }}>
            <thead>
              <tr style={{ color: C.dim, fontFamily: MONO }}>
                <th style={{ textAlign: "left", padding: "3px 6px", fontWeight: 400 }}>{tr("เลนเขา")}</th>
                <th style={{ textAlign: "left", padding: "3px 6px", fontWeight: 400 }}>{tr("เลนเรา")}</th>
                <th style={{ textAlign: "left", padding: "3px 6px", fontWeight: 400 }}>{tr("ใครเสียเลือด")}</th>
                <th style={{ textAlign: "left", padding: "3px 6px", fontWeight: 400 }}>{tr("เพื่อนลงช่วย")}</th>
                <th style={{ textAlign: "left", padding: "3px 6px", fontWeight: 400 }}></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(JUNGLE_TABLE).map(([k, v]) => {
                const [f, m] = k.split("|");
                const hurt = { jungler: tr("ป่าเรา"), foeLane: tr("เลนเขา"), both: tr("ทั้งสองเลน") }[v.hurt] || "—";
                return (
                  <tr key={k} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td style={{ padding: "4px 6px" }}>{chip(f)}</td>
                    <td style={{ padding: "4px 6px" }}>{chip(m)}</td>
                    <td style={{ padding: "4px 6px", color: v.hurt ? C.red : C.dim, fontFamily: MONO }}>{hurt}</td>
                    <td style={{ padding: "4px 6px", color: v.join ? C.green : C.dim, fontFamily: MONO }}>{v.join ? tr("ลง") : tr("ไม่ลง")}</td>
                    <td style={{ padding: "4px 6px", color: C.dim }}>{tr(v.note)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={tr("ยืนรับแกงค์แบบเซฟ")}>
        <Line>{tr("เลนที่สั่งเซฟแล้วโดนป่าอีกฝั่งบุก ไฟต์สั้นแค่ {0} วิ", SAFE_STAND_SECONDS)}</Line>
        <Line dim>{tr("หมดเวลาแล้วฝั่งที่ยืนรับยังเหลือคนรอด = ป่าที่มาแกงค์และเพื่อนที่พามา ไม่ได้เงินและ XP ยกนั้นเลย")}</Line>
      </Section>

      <Section title={tr("ศพ")}>
        <Line>{tr("สังหาร {0}g {1}xp · ช่วยสังหารคนเดียว {2}g {3}xp · ช่วยกันหลายคน {4}g {5}xp",
          KILL.gold, KILL.xp, ASSIST_SOLO.gold, ASSIST_SOLO.xp, ASSIST_GROUP.gold, ASSIST_GROUP.xp)}</Line>
        <Line dim>{tr("เลนที่แตกไฟต์เพราะนิสัย (ปกติเจอปกติ หรือรุกล้ำเจอรุกล้ำ) ไม่มีรายได้ฐาน — เงินยกนั้นมาจากศพอย่างเดียว")}</Line>
      </Section>

      <Section title={tr("พาสซีฟเลน")}>
        {Object.entries(LANE_INFO).map(([k, v]) => (
          <Line key={k}>
            <span style={{ fontFamily: MONO, fontWeight: 800, color: C.blue, marginRight: 6 }}>{k}</span>
            {tr(v.passive)}
            <span style={{ color: C.dim }}> · {tr("เลเวลสูงสุด {0}", v.maxLevel)}</span>
          </Line>
        ))}
      </Section>

      <Section title={tr("เงินพิเศษ")}>
        {hook ? (
          <Line>
            <span style={{ fontFamily: MONO, fontWeight: 800, color: C.gold, marginRight: 6 }}>C.HOOK</span>
            {tr("กระเป๋าตลาดมืด — ยกที่ได้ลงไฟต์ {0} แล้วคงที่ · ยกที่ฟาร์มเฉยๆ {1} · สังหาร/ช่วย +{2} · คริ +{3}",
              hookSeq.join(" → "), hook.perRound, hook.perKill, hook.perCrit)}
          </Line>
        ) : null}
        {puss ? (
          <Line>
            <span style={{ fontFamily: MONO, fontWeight: 800, color: C.gold, marginRight: 6 }}>PUSS</span>
            {tr("เก็บศพหรือช่วยเก็บเป้าที่มีตราท้าดวล ได้เงินจากศพนั้นเพิ่ม {0}%", Math.round(puss.goldPct * 100))}
          </Line>
        ) : null}
        <Line>
          <span style={{ fontFamily: MONO, fontWeight: 800, color: C.gold, marginRight: 6 }}>{tr("ไอเทม")}</span>
          {tr("Wendigo's Voracious Claw — สังหารหรือช่วยสังหารได้ทองพิเศษต่อศพ")}
        </Line>
      </Section>

      <Section title={tr("ตัวคูณของโหมด")}>
        {Object.values(MODES).map((m) => (
          <Line key={m.id}>
            {tr(m.th)} · {tr("เงิน ×{0} · XP ×{1}", m.gold, m.xp)}
          </Line>
        ))}
        <Line dim>{tr("คูณตอนจ่ายเงินปลายยก แล้วปัดเศษ — ใบเสร็จในหน้าสรุปยกแยกบรรทัดส่วนต่างไว้ให้")}</Line>
      </Section>
    </Shell>
  );
}
