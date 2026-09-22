import { itemName, tr } from "../i18n.js";
import React from "react";
import { CHAMPIONS } from "../data/champions.js";
import { LANES, STAT_KEYS } from "../data/constants.js";
import { ITEM_BY_ID, buyBlockedReason, effectiveCost } from "../data/items.js";
import { buildRecipeTree } from "../ui/recipe.jsx";
import { STYLES } from "../data/tuning.js";
import { LANE_MEMBERS, LANE_TH, STANCES, STANCE_LANES, STANCE_LIST, crewAllowed } from "../data/behaviour.js";
import { canRank, pointsSpent } from "../engine/skill-ranks.js";
import { levelProgress } from "../engine/util.js";
import { STAT_SHORT, laneMax } from "../game/roster.js";
import { ScoutPanel } from "../ui/Scout.jsx";
import { FormationPanel } from "../ui/Formation.jsx";
import { ShopScreen } from "../ui/ShopScreen.jsx";
import { itemDesc } from "../ui/recipe.jsx";
import { ItemSlot, Shell, btn, card, mini, slot } from "../ui/chrome.jsx";
import { C, MONO, SANS } from "../ui/theme.js";
import { Bar, Label } from "../ui/widgets.jsx";

export function ShopPhase(ctx) {
  const { net, netReadyUp, formOpen, setFormOpen, addRank, buy, foe, openSkill, scoutOpen, setScoutOpen, openRecipe, openShop, resetRanks, round, score, sell, sellValue, setOpenRecipe, setOpenShop, setShopCat, setTeam, setTeamStyle, shopCat, slotsUsed, startFight, team, teamStyle, mode, wide, shopItem, setShopItem, shopQuery, setShopQuery, favsOf, toggleFav, moveFav, clearFavs, streak, openStats, stances, setStances, jungle, setJungle, lastStances, foeIntel, buyUndo, undoBuy, setDuelLane } = ctx;

  // ออนไลน์: กดพร้อมแล้ว = ส่งทีมและคำสั่งให้อีกฝั่งไปแล้ว ห้ามแก้อะไรอีกจนกว่าไฟต์จะเริ่ม
  // เดิมยังกดเปลี่ยนนิสัยเลน ซื้อของ อัพสกิลได้ต่อ แต่อีกเครื่องได้แค่ของตอนกดพร้อม
  // สองเครื่องเลยเล่นกันคนละยก แล้วเห็นคนชนะไม่ตรงกัน
  const locked = !!(net && net.on && net.waiting);

  // การซื้อล่าสุดที่ยังย้อนได้ (กองย้อนอยู่ที่ App เพราะหน้าจอเป็นฟังก์ชันธรรมดา)
  const lastUndo = (buyUndo && buyUndo.length) ? buyUndo[buyUndo.length - 1] : null;

  // สเปคใหม่: ป่าลงแกงค์เลนที่ "ยกนี้" สั่งรุกล้ำหรือปกติไว้ได้เลย
  // เดิมต้องรอให้เลนนั้นสั่งรุกล้ำไว้ตั้งแต่ยกที่แล้ว ซึ่งช้าไปหนึ่งยกเสมอ
  const openLanes = STANCE_LANES.filter((L) => stances[L] === "AGGRO" || stances[L] === "NEUTRAL");
  const crewMax = crewAllowed(round);
  const crewPool = STANCE_LANES.filter((L) => L !== jungle.lane && stances[L] === "SAFE");

  // PUSS — ตัวที่มีตราท้าดวลให้สั่งก่อนไฟต์
  const duelists = team
    .map((c, i) => ({ i, c, ch: CHAMPIONS[c.champId] }))
    .filter((x) => x.ch && x.ch.duel);
  // ยกแรกของโหมดออนไลน์ยังไม่เคยเห็นทีมจริงของอีกฝั่ง — อย่าเดาชื่อให้ผิด
  const foeKnown = !(net && net.on && round <= 1);
  const foeNameAt = (L) => {
    if (!foeKnown) return null;
    const f = foe.find((x) => x.lane === L);
    return f && f.champId ? f.champId : null;
  };
  const champOf = (lane) => { const c = team.find((x) => x.lane === lane); return (c && c.champId) || lane; };
  const TONE = { SAFE: C.blue, NEUTRAL: C.dim, AGGRO: C.red };

  return (
      <Shell round={round} score={score} mode={mode} streak={streak} maxWidth={wide ? 1060 : 620}>
        {/* แถบวางแผนแยกออกไปอยู่ข้างๆ และไม่เลื่อนตามรายชื่อนักแข่ง
            เมื่อก่อนทุกอย่างต่อกันเป็นคอลัมน์เดียว ซื้อของทีต้องเลื่อนขึ้นลงทั้งหน้า */}
        {locked ? (
          <div style={{
            ...card(), marginBottom: 10, padding: "10px 12px", borderColor: C.gold,
            background: "#1A1608", fontSize: 12, color: C.gold, lineHeight: 1.55,
          }}>
            {tr("ล็อกทีมแล้ว — ส่งทีมและคำสั่งทุกอย่างให้อีกฝั่งไปแล้ว แก้ไม่ได้จนกว่าไฟต์ยกนี้จะเริ่ม")}
          </div>
        ) : null}
        <div style={{
          display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap",
          pointerEvents: locked ? "none" : "auto", opacity: locked ? 0.6 : 1,
        }} inert={locked || undefined}>
          <div style={{ flex: "1 1 330px", minWidth: 0, order: wide ? 0 : 1 }}>
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
                return <ItemSlot key={i} item={list[i]} />;
              })}
              {c.lane === "ADC" && (
                <ItemSlot
                  dashed
                  item={c.items.find((x) => x.kind === "boots")}
                  empty={tr("ช่องฟรี")}
                />
              )}
            </div>

            {/* รายการโปรด = แผนออกของ — เรียงลำดับได้ บอกความคืบหน้าและเงินที่ยังขาด
                กดซื้อได้ทั้งของใหญ่และชิ้นส่วนที่ยังขาด และมีปุ่มซื้อชิ้นถัดไปให้กดรวดเดียว */}
            {favsOf(idx).length > 0 && (() => {
              const picks = favsOf(idx).map((id) => ITEM_BY_ID[id]).filter(Boolean);
              if (!picks.length) return null;

              // ไล่สูตรลงไปหาชิ้นที่ยังขาด + นับความคืบหน้าเป็นมูลค่าที่มีอยู่แล้ว
              const planOf = (x) => {
                const pool = [...c.items];
                const missing = [];
                const walk = (node) => {
                  if (node.owned) return;
                  // ชิ้นส่วนครบแล้วแต่ยังไม่ได้ประกอบ — เสนอซื้อตัวมันเองเลย ไม่ต้องไล่ลงไปอีก
                  if (node.ready) { missing.push(node.item); return; }
                  if (node.children) {
                    // เงินถึงราคาเต็มก็ซื้อชิ้นกลางได้เลย ไม่ต้องไล่เก็บของย่อยให้ครบก่อน
                    // เดิมไล่ลงไปถึงใบล่างสุดอย่างเดียว ชิ้นกลางเลยไม่เคยถูกเสนอให้ซื้อ
                    if (!buyBlockedReason(c, node.item)) missing.push(node.item);
                    node.children.forEach(walk);
                  } else missing.push(node.item);
                };
                if (x.parts) x.parts.map((pid) => buildRecipeTree(pool, ITEM_BY_ID[pid])).forEach(walk);
                const eff = effectiveCost(c.items, x);
                return { missing, eff, have: x.cost - eff, short: Math.max(0, eff - c.gold) };
              };

              const chip = (x, small, key) => {
                const eff = effectiveCost(c.items, x);
                const why = buyBlockedReason(c, x);
                const can = !why;
                return (
                  <button key={key} disabled={!can} onClick={() => can && buy(idx, x)}
                    title={itemDesc(x)}
                    style={{
                      background: can ? C.panel2 : "transparent",
                      border: `1px solid ${can ? (small ? C.line : C.gold) : C.line}`, borderRadius: 5,
                      padding: small ? "4px 7px" : "5px 8px", fontSize: small ? 10 : 10.5, fontFamily: SANS,
                      color: can ? C.ink : C.dim, cursor: can ? "pointer" : "default",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                    <span>{small ? "\u2514 " : ""}{itemName(x)}</span>
                    <span style={{ fontFamily: MONO, color: can ? C.gold : C.dim }}>
                      {can ? eff + "g" : why}
                    </span>
                  </button>
                );
              };

              const tiny = (label, on, title) => (
                <button onClick={on} disabled={!on} title={title}
                  style={{
                    background: "none", border: `1px solid ${on ? C.line : "transparent"}`, borderRadius: 4,
                    color: on ? C.dim : "transparent", fontSize: 10, lineHeight: 1,
                    padding: "3px 5px", cursor: on ? "pointer" : "default", fontFamily: MONO,
                  }}>{label}</button>
              );

              // ชิ้นถัดไปที่ควรซื้อ: ไล่จากแผนบนสุดลงล่าง เอาชิ้นแรกที่เงินพอ
              let next = null;
              for (const x of picks) {
                if (c.items.some((y) => y.id === x.id)) continue;
                const p = planOf(x);
                const order = [x, ...p.missing];
                next = order.find((m) => !buyBlockedReason(c, m)) || null;
                if (next) break;
              }

              return (
                <div style={{ ...card(), marginBottom: 8, padding: 9, borderColor: C.gold }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Label style={{ color: C.gold }}>{tr("\u2605 แผนออกของ")}</Label>
                    <span style={{ fontSize: 9.5, color: C.dim }}>{tr("เรียงจากชิ้นที่จะออกก่อน")}</span>
                    <span style={{ marginLeft: "auto" }}>
                      {tiny(tr("ล้าง"), () => clearFavs(idx))}
                    </span>
                  </div>
                  {picks.map((x, pi) => {
                    const owned = c.items.some((y) => y.id === x.id);
                    const p = planOf(x);
                    const pct = Math.max(0, Math.min(1, x.cost ? p.have / x.cost : 1));
                    return (
                      <div key={x.id} style={{ marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                          <span style={{ fontFamily: MONO, fontSize: 10, color: C.dim, width: 14 }}>{pi + 1}.</span>
                          {owned
                            ? (
                              <span style={{ fontSize: 10.5, color: C.green, flex: 1 }}>
                                {tr("\u2713 {0} \u2014 ออกครบแล้ว", itemName(x))}
                              </span>
                            )
                            : (
                              <span style={{ fontSize: 10.5, color: C.ink, flex: 1 }}>
                                {itemName(x)}
                                <span style={{ fontFamily: MONO, color: C.dim, marginLeft: 6 }}>
                                  {p.short > 0
                                    ? tr("ขาดอีก {0}g", p.short)
                                    : tr("ซื้อได้เลย {0}g", p.eff)}
                                </span>
                              </span>
                            )}
                          {tiny("\u2191", pi > 0 ? () => moveFav(idx, x.id, -1) : null, tr("เลื่อนขึ้น"))}
                          {tiny("\u2193", pi < picks.length - 1 ? () => moveFav(idx, x.id, 1) : null, tr("เลื่อนลง"))}
                          {tiny("\u2715", () => toggleFav(idx, x.id), tr("เอาออกจากรายการโปรด"))}
                        </div>
                        {!owned && (
                          <div style={{ height: 3, background: C.panel2, borderRadius: 2, marginBottom: 4 }}>
                            <div style={{ height: 3, width: `${Math.round(pct * 100)}%`, background: C.gold, borderRadius: 2 }} />
                          </div>
                        )}
                        {!owned && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {chip(x, false, x.id)}
                            {p.missing.map((m, mi) => chip(m, true, x.id + ":" + m.id + ":" + mi))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {next ? (
                    <button onClick={() => buy(idx, next)}
                      style={{
                        width: "100%", marginTop: 4, background: C.panel2, border: `1px solid ${C.gold}`,
                        borderRadius: 5, color: C.gold, fontFamily: MONO, fontSize: 11,
                        padding: "6px 8px", cursor: "pointer",
                      }}>
                      {tr("ซื้อชิ้นถัดไป: {0} \u2014 {1}g", itemName(next), effectiveCost(c.items, next))}
                    </button>
                  ) : null}
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
                    const price = CHAMPIONS[c.champId].bounty.price;
                    const owned = (c.upgrades || []).includes(k);
                    const can = !owned && (c.bountyGold || 0) >= price;
                    return (
                      <button key={k} disabled={!can}
                        onClick={() => setTeam((t) => t.map((x, i) => i === idx
                          ? { ...x, bountyGold: x.bountyGold - price, upgrades: [...(x.upgrades || []), k] } : x))}
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
                  "Q +8% Max HP · W ดาเมจนกเป็น True · E วงระเบิด 300 + วิ่งไว 25% · R วง 700 หน่วง 1.5 วิ (ชิ้นละ 150)"
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
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={() => { setShopCat("START"); setOpenShop(idx); }}
                style={{ ...btn(C.panel2), fontSize: 12, padding: "7px", flex: 2 }}>{tr("เปิดร้านค้า")}</button>
              <button onClick={() => openStats(c)} title={tr("ดูค่าสถานะทั้งหมด")}
                style={{ ...btn(C.panel2), fontSize: 12, padding: "7px", flex: 1, color: C.blue }}>{tr("ค่าสถานะ")}</button>
            </div>
            {/* ซื้อผิดชิ้นย้อนคืนได้เต็มราคา ตราบใดที่ยังไม่เริ่มไฟต์ของยกนี้ */}
            {lastUndo && lastUndo.idx === idx ? (
              <button onClick={undoBuy} title={tr("คืนเงินเต็มราคาและเอาชิ้นส่วนที่ถูกกลืนไปกลับมา")}
                style={{
                  ...btn(C.panel2), fontSize: 11.5, padding: "6px", marginTop: 5,
                  color: C.gold, borderColor: C.line,
                }}>
                {tr("↩ ยกเลิกการซื้อ {0}", itemName({ th: lastUndo.name }))}
              </button>
            ) : null}

          </div>
        ))}
          </div>
          <div style={{
            flex: wide ? "0 1 310px" : "1 1 100%", minWidth: 0, order: wide ? 1 : 0,
            position: wide ? "sticky" : "static", top: 8, alignSelf: "flex-start",
            maxHeight: wide ? "calc(100vh - 24px)" : "none",
            overflowY: wide ? "auto" : "visible",
          }}>
        {/* PUSS — ตราท้าดวลเป็นคำสั่งก่อนไฟต์ ไม่ใช่ของที่เกมเลือกให้เอง
            ยกแรกของโหมดออนไลน์ยังไม่รู้ว่าอีกฝั่งเลือกใคร จึงโชว์แค่เลน */}
        {duelists.length ? (
          <div style={{ ...card(), padding: 10, marginBottom: 8, borderColor: C.gold }}>
            {duelists.map(({ i, c, ch }) => (
              <div key={c.lane}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 5 }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: C.gold, letterSpacing: 1 }}>
                    {tr("ท้าดวล")}
                  </span>
                  <span style={{ fontSize: 10.5, color: C.dim }}>{c.champId} · {tr(ch.passive.th)}</span>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {LANES.map((L) => {
                    const on = c.duelLane === L;
                    const who = foeNameAt(L);
                    return (
                      <button key={L} onClick={() => setDuelLane(i, L)}
                        style={{
                          flex: "1 1 60px", background: on ? C.gold : C.panel2, color: on ? "#0B1220" : C.dim,
                          border: `1px solid ${on ? C.gold : C.line}`, borderRadius: 4,
                          padding: "5px 2px", cursor: "pointer", fontFamily: SANS,
                          fontSize: 10.5, fontWeight: on ? 800 : 400, lineHeight: 1.35,
                        }}>
                        {L}
                        {who ? <div style={{ fontFamily: MONO, fontSize: 9, opacity: 0.75 }}>{who}</div> : null}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 10, color: C.dim, marginTop: 6, lineHeight: 1.55 }}>
                  {c.duelLane
                    ? tr("ทำดาเมจใส่เป้าที่มีตราแรงขึ้น และทั้งคู่จะล็อกเป้าหากันก่อนเสมอ")
                    : tr("ไม่ได้สั่ง = เขาจะไปท้าตัวที่อันตรายที่สุดของอีกฝั่งเอง")}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* นิสัยประจำเลนของยกนี้ — เลือกสั้นๆ ตรงนี้เลย ไม่ต้องข้ามหน้า
            ไม่บอกว่าจะเกิดอะไร เพราะยังไม่รู้ว่าอีกฝั่งสั่งอะไรมา เฉลยหลังดูผล */}
        <div style={{ ...card(), padding: 10, marginBottom: 8 }}>
          {STANCE_LANES.map((L) => (
            <div key={L} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.dim, width: 66, flexShrink: 0 }}>
                {tr(LANE_TH[L])} <span style={{ color: C.line }}>{LANE_MEMBERS[L].map(champOf).join("·")}</span>
              </span>
              {STANCE_LIST.map((k) => {
                const on = stances[L] === k;
                return (
                  <button key={k} onClick={() => {
                    setStances((v) => ({ ...v, [L]: k }));
                    // สั่งเลนที่ป่ากำลังจะลงเป็น "เซฟ" แล้วแกงค์ไม่ได้อีก — ยกเลิกให้อัตโนมัติ
                    if (k === "SAFE" && jungle.lane === L) setJungle({ lane: null, crew: [] });
                    // เลนที่ถูกดึงไปเป็นลูกหาบต้องเป็นเลนเซฟเท่านั้น
                    if (k !== "SAFE") setJungle((j) => ((j.crew || []).includes(L) ? { ...j, crew: j.crew.filter((x) => x !== L) } : j));
                  }}
                    style={{
                      flex: 1, background: on ? TONE[k] : C.panel2, color: on ? "#0B1220" : C.dim,
                      border: `1px solid ${on ? TONE[k] : C.line}`, borderRadius: 4,
                      padding: "5px 2px", cursor: "pointer", fontFamily: SANS,
                      fontSize: 10.5, fontWeight: on ? 800 : 400,
                    }}>{tr(STANCES[k].th)}</button>
                );
              })}
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.dim, width: 66, flexShrink: 0 }}>
              {tr("ป่า")} <span style={{ color: C.line }}>{champOf("JUNGLE")}</span>
            </span>
            <button onClick={() => setJungle({ lane: null, crew: [] })}
              style={{
                flex: 1, background: jungle.lane ? C.panel2 : C.gold, color: jungle.lane ? C.dim : "#0B1220",
                border: `1px solid ${jungle.lane ? C.line : C.gold}`, borderRadius: 4,
                padding: "5px 2px", cursor: "pointer", fontFamily: SANS, fontSize: 10.5,
                fontWeight: jungle.lane ? 400 : 800,
              }}>{tr("ฟาร์ม")}</button>
            {STANCE_LANES.map((L) => {
              const can = openLanes.includes(L);
              const on = jungle.lane === L;
              return (
                <button key={L} disabled={!can} onClick={() => setJungle({ lane: L, crew: [] })}
                  style={{
                    flex: 1, background: on ? C.red : C.panel2,
                    color: on ? "#0B1220" : (can ? C.dim : "#222C42"),
                    border: `1px solid ${on ? C.red : C.line}`, borderRadius: 4,
                    padding: "5px 2px", cursor: can ? "pointer" : "default",
                    fontFamily: SANS, fontSize: 10.5, fontWeight: on ? 800 : 400,
                  }}>{tr(LANE_TH[L])}</button>
              );
            })}
          </div>
          {jungle.lane && crewMax > 0 && crewPool.length ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.dim, width: 66, flexShrink: 0 }}>
                {tr("พาไป {0}", crewMax)}
              </span>
              {crewPool.map((L) => {
                const on = (jungle.crew || []).includes(L);
                return (
                  <button key={L}
                    onClick={() => setJungle((j) => {
                      const cur = j.crew || [];
                      if (cur.includes(L)) return { ...j, crew: cur.filter((x) => x !== L) };
                      if (cur.length >= crewMax) return j;
                      return { ...j, crew: [...cur, L] };
                    })}
                    style={{
                      flex: 1, background: on ? C.blue : C.panel2, color: on ? "#0B1220" : C.dim,
                      border: `1px solid ${on ? C.blue : C.line}`, borderRadius: 4,
                      padding: "5px 2px", cursor: "pointer", fontFamily: SANS, fontSize: 10.5,
                      fontWeight: on ? 800 : 400,
                    }}>{tr(LANE_TH[L])}</button>
                );
              })}
            </div>
          ) : null}
        </div>

        <button onClick={() => { if (net && net.on) { if (!netReadyUp()) startFight(); } else startFight(); }}
          disabled={!!(net && net.on && net.waiting)}
          style={{ ...btn(net && net.on && net.waiting ? C.panel2 : C.gold),
            color: net && net.on && net.waiting ? C.dim : "#0B1220",
            fontWeight: 800, fontSize: 14, padding: "12px 4px", marginBottom: 12 }}>
          {net && net.on && net.waiting
            ? tr("พร้อมแล้ว — รออีกฝั่ง…")
            : net && net.on
              ? tr("พร้อมสู้ยกที่ {0}", round)
              : round === mode.maxRounds ? tr("เริ่มยกตัดสิน") : tr("เริ่มยกที่ {0}", round)}
        </button>
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
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <button onClick={() => setScoutOpen(true)}
            style={{ ...btn(C.panel2), color: C.red, fontSize: 12, fontWeight: 700, flex: 2, padding: "9px 4px" }}>{tr("ส่องทีมคู่แข่ง")}</button>
          <button onClick={() => setFormOpen(true)}
            style={{ ...btn(C.panel2), color: C.blue, fontSize: 12, fontWeight: 700, flex: 1, padding: "9px 4px" }}>{tr("จัดทัพ")}</button>
        </div>

        {scoutOpen && (
          <ScoutPanel foe={foe} team={team} intel={foeIntel} fightState={null} onClose={() => setScoutOpen(false)} onSkill={openSkill} onStats={openStats} />
        )}

        {formOpen && (
          <FormationPanel team={team} setTeam={setTeam} onClose={() => setFormOpen(false)} />
        )}
          </div>
        </div>

        {openShop !== null && !locked && (
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
