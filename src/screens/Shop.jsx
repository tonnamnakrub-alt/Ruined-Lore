import { itemName, tr } from "../i18n.js";
import React from "react";
import { CHAMPIONS } from "../data/champions.js";
import { STAT_KEYS } from "../data/constants.js";
import { ITEM_BY_ID, buyBlockedReason, effectiveCost } from "../data/items.js";
import { buildRecipeTree } from "../ui/recipe.jsx";
import { EVENTS, STYLES } from "../data/tuning.js";
import { canRank, pointsSpent } from "../engine/skill-ranks.js";
import { levelProgress } from "../engine/util.js";
import { STAT_SHORT, laneMax } from "../game/roster.js";
import { ScoutPanel } from "../ui/Scout.jsx";
import { ShopScreen } from "../ui/ShopScreen.jsx";
import { itemDesc } from "../ui/recipe.jsx";
import { Shell, btn, card, mini, slot } from "../ui/chrome.jsx";
import { C, MONO, SANS } from "../ui/theme.js";
import { Bar, Label } from "../ui/widgets.jsx";

export function ShopPhase(ctx) {
  const { addRank, buy, eventId, foe, openSkill, scoutOpen, setScoutOpen, openRecipe, openShop, resetRanks, round, score, sell, sellValue, setEventId, setOpenRecipe, setOpenShop, setShopCat, setTeam, setTeamStyle, shopCat, slotsUsed, startFight, team, teamStyle, mode, wide, shopItem, setShopItem, shopQuery, setShopQuery, favsOf, toggleFav , streak, lastFarm } = ctx;

    const farmBlocked = lastFarm === round - 1 || round >= mode.maxRounds;

  return (
      <Shell round={round} score={score} mode={mode} streak={streak}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {Object.values(STYLES).map((s) => (
            <button
              key={s.key}
              onClick={() => setTeamStyle(s.key)}
              style={{
                ...btn(teamStyle === s.key ? C.gold : C.panel2),
                color: teamStyle === s.key ? "#0B1220" : C.ink,
                flex: 1, fontSize: 12, fontWeight: 700, padding: "9px 4px",
              }}
            >
              {tr(s.th)}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 12, lineHeight: 1.55 }}>{tr(
          "บุก ชนะ คุมระยะ · คุมระยะ ชนะ ตั้งรับ · ตั้งรับ ชนะ บุก — สั่งใหม่ได้ทุกยก ไม่เสียเงิน"
        )}</div>
        <Label style={{ marginBottom: 6 }}>{tr("EVENT ของยกนี้")}</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
          {Object.values(EVENTS).map((ev) => {
            const off = !!ev.farm && farmBlocked;
            const on = eventId === ev.id;
            return (
              <button key={ev.id} disabled={off} onClick={() => !off && setEventId(ev.id)}
                style={{
                  background: on ? C.gold : C.panel2,
                  color: on ? "#0B1220" : off ? C.dim : C.ink,
                  border: `1px solid ${ev.farm && !on ? "#2E5A3A" : C.line}`, borderRadius: 6, padding: "7px 10px",
                  fontSize: 11.5, cursor: off ? "default" : "pointer", fontFamily: SANS, flex: "1 1 40%",
                  opacity: off ? 0.5 : 1,
                }}>
                {tr(ev.th)}
                <span style={{ fontFamily: MONO, opacity: 0.75, marginLeft: 5 }}>
                  {ev.farm ? tr("ข้ามยก") : ev.duration + "s"}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 10, color: farmBlocked ? C.red : C.dim, marginBottom: 14, lineHeight: 1.5 }}>
          {farmBlocked
            ? tr("ยกฟาร์มใช้ไม่ได้ตอนนี้ — ฟาร์มติดกันสองยกไม่ได้ และยกตัดสินต้องสู้")
            : tr("ยกฟาร์ม = ข้ามการปะทะ ทั้งสองฝั่งได้เงินและ XP ราว 75% ของฝั่งที่แพ้ ไม่มีใครได้แต้ม")}
        </div>

        <button onClick={() => setScoutOpen(true)}
          style={{ ...btn(C.panel2), color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 12, padding: "9px 4px" }}>{tr("ส่องทีมคู่แข่ง — ดูตัวละคร ของ และเลเวล")}</button>

        {scoutOpen && (
          <ScoutPanel foe={foe} team={team} fightState={null} onClose={() => setScoutOpen(false)} onSkill={openSkill} />
        )}

        {team.map((c, idx) => (
          <div key={c.lane} style={{ ...card(), marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: MONO, fontWeight: 800, color: C.blue, fontSize: 14 }}>
                {c.champId || "—"}
              </span>
              <span style={{ color: C.dim, fontSize: 11, letterSpacing: 1 }}>{c.lane}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.ink }}>Lv{c.level}</span>
              <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 13, color: C.gold }}>{c.gold}g</span>
            </div>
            {(() => {
              const left = c.level - pointsSpent(c.ranks);
              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, marginBottom: 5 }}>
                    <Label>{tr("สกิล")}</Label>
                    <span style={{ fontFamily: MONO, fontSize: 10, color: left > 0 ? C.gold : C.dim }}>{tr("เหลือ {0} แต้ม", left)}</span>
                    <button onClick={() => resetRanks(idx)}
                      style={{ marginLeft: "auto", ...mini(), width: "auto", padding: "0 8px", fontSize: 10 }}>{tr("อัตโนมัติ")}</button>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(CHAMPIONS[c.champId] ? CHAMPIONS[c.champId].skills : []).map((sk) => {
                      const rank = c.ranks[sk.key];
                      const can = canRank(c.ranks, sk.key, c.level);
                      // แตะตัวการ์ด = อัพสกิล · ปุ่ม ⓘ มุมขวา = เปิดหน้าข้อมูล
                      // เมื่อก่อนแตะตรงไหนก็เปิดหน้าข้อมูล คนที่อยากอัพเร็วๆ เลยต้องกดผ่านโมดัลทุกครั้ง
                      return (
                        <div key={sk.key} style={{
                          flex: 1, position: "relative", borderRadius: 4,
                          background: rank ? C.panel2 : "#0E1626",
                          border: `1px solid ${can ? C.gold : rank ? C.line : "#1B2439"}`,
                          opacity: rank || can ? 1 : 0.6,
                        }}>
                          <button
                            onClick={() => (can ? addRank(idx, sk.key) : openSkill(c.champId, sk.key, { teamIdx: idx }))}
                            title={can ? tr("อัพสกิล") : tr("ดูรายละเอียดสกิล")}
                            style={{
                              width: "100%", textAlign: "center", padding: "5px 14px 5px 2px",
                              background: "none", border: "none", borderRadius: 4,
                              cursor: "pointer", fontFamily: SANS,
                            }}>
                            <div style={{ fontFamily: MONO, fontSize: 11, color: sk.ult ? C.gold : C.ink }}>
                              {sk.key}{can ? " +" : ""}
                            </div>
                            <div style={{ fontSize: 8.5, color: C.dim, marginTop: 1, lineHeight: 1.25 }}>
                              {sk.type === "dual" ? sk.light.th + " / " + sk.shadow.th : sk.th}
                            </div>
                            <div style={{ fontFamily: MONO, fontSize: 8.5, color: rank ? C.blue : "#33415F" }}>
                              {rank ? "●".repeat(rank) : tr("ล็อก")}
                            </div>
                          </button>
                          <button
                            onClick={() => openSkill(c.champId, sk.key, { teamIdx: idx })}
                            title={tr("ดูรายละเอียดสกิล")}
                            style={{
                              position: "absolute", top: 2, right: 2, width: 16, height: 16,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              background: "none", border: `1px solid ${C.line}`, borderRadius: 999,
                              color: C.dim, fontSize: 9, lineHeight: 1, cursor: "pointer",
                              fontFamily: SANS, padding: 0,
                            }}>ⓘ</button>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}

            <div style={{ display: "flex", gap: 10, marginTop: 8, marginBottom: 8 }}>
              {STAT_KEYS.map((k) => (
                <div key={k} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: MONO, fontSize: 13, color: C.ink }}>{c.athlete[k]}</div>
                  <div style={{ fontSize: 8.5, color: C.dim, letterSpacing: 0.5 }}>{STAT_SHORT[k]}</div>
                </div>
              ))}
              <div style={{ marginLeft: "auto", flex: 1, alignSelf: "center" }}>
                {(() => {
                  const p = levelProgress(c.xp, laneMax(c.lane));
                  return <Bar value={p.need ? p.into : 1} max={p.need || 1} color={C.blue} height={4} />;
                })()}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
              {Array.from({ length: 6 }).map((_, i) => {
                const list = c.items.filter((x) => !(c.lane === "ADC" && x.kind === "boots"));
                const it = list[i];
                return (
                  <div key={i} style={slot(!!it)}>
                    {it ? itemName(it) : ""}
                  </div>
                );
              })}
              {c.lane === "ADC" && (
                <div style={{ ...slot(c.items.some((x) => x.kind === "boots")), borderStyle: "dashed" }}>
                  {c.items.some((x) => x.kind === "boots") ? tr("รองเท้า") : tr("ช่องฟรี")}
                </div>
              )}
            </div>

            {/* รายการโปรด — ของใครของมัน กดซื้อได้จากตรงนี้เลย ทั้งของใหญ่และชิ้นส่วนที่ยังขาด */}
            {favsOf(idx).length > 0 && (() => {
              const picks = favsOf(idx).map((id) => ITEM_BY_ID[id]).filter(Boolean);
              if (!picks.length) return null;
              const chip = (x, small) => {
                const eff = effectiveCost(c.items, x);
                const why = buyBlockedReason(c, x);
                const can = !why;
                return (
                  <button key={x.id} disabled={!can} onClick={() => can && buy(idx, x)}
                    title={itemDesc(x)}
                    style={{
                      background: can ? C.panel2 : "transparent",
                      border: `1px solid ${can ? (small ? C.line : C.gold) : C.line}`, borderRadius: 5,
                      padding: small ? "4px 7px" : "5px 8px", fontSize: small ? 10 : 10.5, fontFamily: SANS,
                      color: can ? C.ink : C.dim, cursor: can ? "pointer" : "default",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                    <span>{small ? "└ " : ""}{itemName(x)}</span>
                    <span style={{ fontFamily: MONO, color: can ? C.gold : C.dim }}>
                      {can ? eff + "g" : why}
                    </span>
                  </button>
                );
              };
              return (
                <div style={{ marginBottom: 8 }}>
                  <Label style={{ marginBottom: 5, color: C.gold }}>{tr("★ รายการโปรด — ซื้อได้เลย")}</Label>
                  {picks.map((x) => {
                    const owned = c.items.some((y) => y.id === x.id);
                    // ชิ้นส่วนที่ยังขาดของสูตรนี้ — กดซื้อทีละชิ้นได้เลยตอนเงินยังไม่พอ
                    const pool = [...c.items];
                    const missing = [];
                    const walk = (node) => {
                      if (node.owned) return;
                      if (node.children) node.children.forEach(walk);
                      else if (!missing.some((m) => m.id === node.item.id)) missing.push(node.item);
                    };
                    if (!owned && x.parts) x.parts.map((pid) => buildRecipeTree(pool, ITEM_BY_ID[pid])).forEach(walk);
                    return (
                      <div key={x.id} style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
                        {owned
                          ? (
                            <span style={{
                              fontSize: 10.5, color: C.green, border: `1px solid ${C.line}`,
                              borderRadius: 5, padding: "5px 8px",
                            }}>✓ {itemName(x)}</span>
                          )
                          : chip(x, false)}
                        {missing.map((m) => chip(m, true))}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {CHAMPIONS[c.champId] && CHAMPIONS[c.champId].bounty && (
              <div style={{ ...card(), background: "#1B1508", borderColor: C.gold, marginBottom: 8, padding: 9 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Label style={{ color: C.gold }}>BLACK MARKET</Label>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: C.gold }}>{c.bountyGold || 0} bg</span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {["Q", "W", "E", "R"].map((k) => {
                    const owned = (c.upgrades || []).includes(k);
                    const can = !owned && (c.bountyGold || 0) >= 100;
                    return (
                      <button key={k} disabled={!can}
                        onClick={() => setTeam((t) => t.map((x, i) => i === idx
                          ? { ...x, bountyGold: x.bountyGold - 100, upgrades: [...(x.upgrades || []), k] } : x))}
                        style={{
                          flex: 1, background: owned ? "#1E3A28" : can ? C.panel2 : "transparent",
                          border: `1px solid ${owned ? C.green : can ? C.gold : C.line}`, borderRadius: 5,
                          padding: "6px 2px", fontFamily: MONO, fontSize: 11,
                          color: owned ? C.green : can ? C.gold : C.dim, cursor: can ? "pointer" : "default",
                        }}>
                        {k}{owned ? " ✓" : ""}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 9.5, color: C.dim, marginTop: 6, lineHeight: 1.5 }}>{tr(
                  "Q +8% Max HP · W ดาเมจนกเป็น True · E ระเบิด 8 ลูก · R วง 700 หน่วง 1.5 วิ (ชิ้นละ 100)"
                )}</div>
              </div>
            )}
            {(() => {
              const plan = c.buildPlan || [];
              const next = plan.map((id) => ITEM_BY_ID[id]).find((it) => it && !c.items.some((x) => x.id === it.id));
              if (!next) return null;
              const blocked = buyBlockedReason(c, next);
              const can = !blocked;
              return (
                <button onClick={() => can && buy(idx, next)} disabled={!can}
                  style={{
                    ...btn(can ? "#16281D" : "transparent"), fontSize: 11.5, padding: "8px", marginBottom: 6,
                    border: `1px solid ${can ? "#2E5A3A" : C.line}`, color: can ? C.green : C.dim,
                    display: "flex", justifyContent: "space-between", cursor: can ? "pointer" : "default",
                  }}>
                  <span>{tr("ซื้อตามแผน: {0}", itemName(next))}</span>
                  <span style={{ fontFamily: MONO }}>{blocked && blocked !== tr("เงินไม่พอ") ? blocked : effectiveCost(c.items, next) + "g"}</span>
                </button>
              );
            })()}
            <button onClick={() => { setShopCat("START"); setOpenShop(idx); }} style={{ ...btn(C.panel2), fontSize: 12, padding: "7px" }}>{tr("เปิดร้านค้า")}</button>

          </div>
        ))}

        <button onClick={startFight} style={{ ...btn(C.gold), color: "#0B1220", fontWeight: 800, marginTop: 6 }}>
          {EVENTS[eventId].farm && !farmBlocked
            ? tr("ฟาร์มยกที่ {0} — ข้ามการปะทะ", round)
            : (round === mode.maxRounds ? tr("เริ่มยกตัดสิน") : tr("เริ่มไฟต์ยกที่ {0}", round)) + " · " + tr(EVENTS[eventId].th) + " " + EVENTS[eventId].duration + "s"}
        </button>

        {openShop !== null && (
          <ShopScreen
            c={team[openShop]}
            cat={shopCat}
            setCat={setShopCat}
            slotsUsed={slotsUsed(team[openShop])}
            onBuy={(it) => buy(openShop, it)}
            onSell={(it) => sell(openShop, it)}
            sellValue={sellValue}
            openRecipe={openRecipe}
            setOpenRecipe={setOpenRecipe}
            wide={wide}
            shopItem={shopItem}
            setShopItem={setShopItem}
            shopQuery={shopQuery}
            setShopQuery={setShopQuery}
            favs={favsOf(openShop)}
            toggleFav={(id) => toggleFav(openShop, id)}
            onClose={() => setOpenShop(null)}
          />
        )}
      </Shell>
    );
}
