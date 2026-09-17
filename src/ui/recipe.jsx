import { itemName, tr } from "../i18n.js";
import React from "react";
import { ITEM_BY_ID, buyBlockedReason, effectiveCost } from "../data/items.js";
import { STYLES } from "../data/tuning.js";
import { C, MONO, STAT_C } from "./theme.js";


// Mirrors the engine's resolveComponent exactly, so the tree shown here always
// matches what applyBuy will actually consume — walks the whole recipe down to
// Tier 1, not just the item's direct parts.
export function buildRecipeTree(pool, item) {
  const idx = pool.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    pool.splice(idx, 1);
    return { item, owned: true, children: null };
  }
  if (!item.parts) return { item, owned: false, children: null };
  const children = item.parts.map((pid) => buildRecipeTree(pool, ITEM_BY_ID[pid]));
  return { item, owned: children.every((c) => c.owned), children };
}


export function RecipeNode({ node, depth, c, onBuy }) {
  const { item, owned, children } = node;
  const blocked = owned ? null : buyBlockedReason(c, item);
  const canBuyHere = !owned && !blocked;
  return (
    <div style={{ marginLeft: depth * 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
        <span style={{ color: owned ? C.green : "#3B4A69", fontSize: 12, width: 12 }}>{owned ? "✓" : "○"}</span>
        <span style={{ fontSize: 11.5, color: owned ? C.ink : C.dim }}>{itemName(item)}</span>
        <span style={{ fontSize: 9.5, color: C.dim, flex: 1 }}>{itemDesc(item)}</span>
        {!owned && (
          <button onClick={() => canBuyHere && onBuy(item)} disabled={!canBuyHere}
            style={{
              background: "none", border: `1px solid ${canBuyHere ? C.line : "transparent"}`, borderRadius: 4,
              padding: "3px 7px", fontFamily: MONO, fontSize: 10.5,
              color: canBuyHere ? C.gold : C.dim, cursor: canBuyHere ? "pointer" : "default",
            }}>
            {blocked && blocked !== tr("เงินไม่พอ") ? blocked : effectiveCost(c.items, item) + "g"}
          </button>
        )}
      </div>
      {!owned && children && children.map((ch, i) => (
        <RecipeNode key={ch.item.id + i} node={ch} depth={depth + 1} c={c} onBuy={onBuy} />
      ))}
    </div>
  );
}


// ค่าสถานะของไอเทม แยกเป็นรายการพร้อมสีประจำตัว — ใช้วาดเป็นบล็อก Stats
// (เมื่อก่อนยัดรวมกับข้อความความสามารถในบรรทัดเดียว อ่านยากมาก)
export function itemStats(it) {
  const p = [];
  const add = (key, text) => p.push({ key, text, color: STAT_C[key] || C.ink });
  if (it.ad) add("ad", `+${it.ad} AD`);
  if (it.adPct) add("adPct", `+${Math.round(it.adPct * 100)}% AD`);
  if (it.ap) add("ap", `+${it.ap} AP`);
  if (it.apPct) add("apPct", `+${Math.round(it.apPct * 100)}% AP`);
  if (it.hp) add("hp", `+${it.hp} HP`);
  if (it.armor) add("armor", tr("+{0} เกราะ", it.armor));
  if (it.mr) add("mr", tr("+{0} ต้านเวท", it.mr));
  if (it.asPct) add("asPct", tr(
    "{0}{1}% ความเร็วโจมตี", it.asPct > 0 ? "+" : "", Math.round(it.asPct * 100)
  ));
  if (it.crit) add("crit", tr("+{0}% โอกาสคริ", Math.round(it.crit * 100)));
  if (it.critDmg) add("critDmg", tr(
    "ดาเมจคริแรงขึ้น {0}% (รวมเป็น {1}%)",
    Math.round(it.critDmg * 100), Math.round((1.75 + it.critDmg) * 100)
  ));
  if (it.ah) add("ah", `+${it.ah} Ability Haste`);
  if (it.ultCdr) add("ultCdr", tr("ลดคูลดาวน์ท่าไม้ตาย {0}%", Math.round(it.ultCdr * 100)));
  if (it.ms) add("ms", tr("+{0} ความเร็วเดิน", it.ms));
  if (it.msPct) add("msPct", tr("+{0}% ความเร็วเดิน", Math.round(it.msPct * 100)));
  if (it.range) add("range", tr("+{0} ระยะ", it.range));
  if (it.pen) add("pen", tr("+{0} เจาะเกราะ/ต้านเวท", it.pen));
  if (it.armorPenPct) add("armorPenPct", tr("เจาะเกราะ {0}%", Math.round(it.armorPenPct * 100)));
  if (it.mrPenPct) add("mrPenPct", tr("เจาะต้านเวท {0}%", Math.round(it.mrPenPct * 100)));
  if (it.omnivampFlat) add("omnivampFlat", tr("+{0}% ดูดเลือด", Math.round(it.omnivampFlat * 100)));
  if (it.hors) add("hors", tr("ฮีล/โล่ที่จ่ายให้เพื่อน +{0}%", Math.round(it.hors * 100)));
  if (it.healAmp) add("healAmp", tr("ฮีล/เกราะ/ดูดเลือดที่ได้รับ +{0}%", Math.round(it.healAmp * 100)));
  if (it.regenPct) add("regenPct", tr("+{0}% ฟื้นเลือดนอกคอมแบต", Math.round(it.regenPct * 100)));
  if (it.tenacity) add("tenacity", tr("ลดเวลาติดล็อก {0}%", Math.round(it.tenacity * 100)));
  if (it.dmgReduceAuto) add("dmgReduceAuto", tr("ลดดาเมจออโต้ที่โดน {0}%", Math.round(it.dmgReduceAuto * 100)));
  if (it.goldPerRound) add("goldPerRound", tr("+{0} เงินทุกยก", it.goldPerRound));
  return p;
}


// ความสามารถของไอเทม — ทุกอย่างที่ไม่ใช่ตัวเลขค่าสถานะดิบ
export function itemAbility(it) {
  const p = [];
  if (it.onHitAdaptive) p.push(tr("ออโต้เพิ่ม {0}% Max HP ศัตรู", Math.round(it.onHitAdaptive * 100)));
  if (it.dmgAmpHighHp) p.push(tr("เลือด 80% ขึ้นไป ตีแรงขึ้น {0}% ทุกชนิด", Math.round(it.dmgAmpHighHp * 100)));
  if (it.antihealOnDmg) p.push(tr(
    "ทำดาเมจใส่ใคร ตัดฮีลของเป้า {0}% นาน {1} วิ",
    Math.round(it.antihealOnDmg.v * 100), it.antihealOnDmg.dur
  ));
  if (it.tier3ScalingHors) p.push(tr(
    "ฮีล/โล่ที่จ่ายให้เพื่อน +{0}% ต่อไอเทม Tier 3 ที่ถืออยู่ (รวมชิ้นนี้)",
    Math.round(it.tier3ScalingHors * 100)
  ));
  if (it.auraArmor) p.push(tr("ทีมได้ +{0} เกราะ ขณะยังไม่ตาย", it.auraArmor));
  if (it.auraAdPct) p.push(tr("ทีมได้ +{0}% AD ขณะยังไม่ตาย", Math.round(it.auraAdPct * 100)));
  if (it.leashCap) p.push(tr("ไม่ออกห่างทีมเกิน 150"));
  if (it.noChaseLowHp) p.push(tr("ไม่ไล่ตัวเลือดแดงออกนอกทีม"));
  if (it.dmgPct) p.push(tr("+{0}% ดาเมจ เมื่อสั่ง{1}", Math.round(it.dmgPct * 100), STYLES[it.style].th));
  if (it.armorPct) p.push(tr("+{0}% เกราะ เมื่อสั่ง{1}", Math.round(it.armorPct * 100), STYLES[it.style].th));
  const passive = PASSIVES()[it.id];
  if (passive) p.push(passive);
  return p;
}


// ข้อความรวมบรรทัดเดียว — ใช้ในแถวแคบๆ กับตัวกรองค้นหา
export function itemDesc(it) {
  return [...itemStats(it).map((x) => x.text), ...itemAbility(it)].join(" · ");
}


function PASSIVES() {
  return {
    nlm: tr("โดนตีแล้วสะท้อนดาเมจ 15 + 25% Bonus เกราะ กลับไปหาคนตี ทุกวินาที"),
    pmh: tr("เผาศัตรูรอบตัว 325 หน่วย 20 + 1.5% Max HP ตัวเอง ต่อวินาที"),
    msq: tr("ลดความเร็วโจมตีศัตรูรอบตัว 400 หน่วย 25% (หลายชิ้นไม่ทับกัน)"),
    mgc: tr("โดนเวทสะสม Stack สูงสุด 10 (+30 ต้านเวท) ครบ 10 ได้ +10% ความเร็วเดิน"),
    aoi: tr("โดนดาเมจแล้วฟื้น 3% + สูงสุด 9% ตามเลือดที่หายไป ใน 4 วิ (ทุก 20 วิ)"),
    hga: tr("ฮีล เกราะป้องกัน (Shield) และดูดเลือดที่ตัวเองได้รับ แรงขึ้น 25%"),
    cij: tr(
      "อยู่ในไฟต์ทุก 3 วิ ได้ +6 เกราะ/ต้านเวท +4% Tenacity (สูงสุด 5 ชั้น) ครบ 5 ชั้นได้โบนัส AR/MR อีก 10%"
    ),
    sab: tr(
      "ชาร์จได้สูงสุด 3 วิ (ปล่อยก่อนได้) แล้ว Taunt ศัตรูรอบตัว 450 หน่วย 0.5-2 วิ ตามเวลาที่ชาร์จ (ทุก 45 วิ)"
    ),
    gbs: tr(
      "ยิงกระสุนเส้นตรงระยะ 800 กว้าง 80 ความเร็ว 1600 — โดนตัวแรกแล้วล่ามไม่ให้ออกห่างเกิน 600 หน่วยจากตัวเอง 3.5 วิ (ทุก 60 วิ)"
    ),
    mot: tr(
      "ลดดาเมจออโต้ที่โดน 5 + 3.5 ต่อ Max HP ทุก 1000 · ลดดาเมจคริติคอลที่โดน 30%"
    ),
    biv: tr(
      "ออโต้ครั้งแรกต่อเป้าเพิ่มดาเมจ 15% Max HP ศัตรูและฮีลกลับเต็ม (ต่อตัว ทุก 6 วิ คงที่ ไม่ลดตาม AH)"
    ),
    soo: tr(
      "ตายครั้งแรกในไฟต์กลายเป็นแช่แข็ง 3 วิแทน แล้วฟื้นคืนชีพ 50% Base HP (ใช้ได้ครั้งเดียว)"
    ),
    cbc: tr(
      "30% ดาเมจกายภาพที่โดนกลายเป็นเลือดไหล 3 วิ · สังหาร/ช่วยฆ่าล้างเลือดไหลตัวเองและฮีล 8% Max HP"
    ),
    bdc: tr("ใช้สกิลแล้วออโต้ครั้งถัดไปเพิ่ม 175% Base AD และวิ่งไว 2 วิ (ทุก 1.5 วิ)"),
    cbg: tr(
      "ออโต้ลดเกราะศัตรู 5% สะสมสูงสุด 5 ชั้น (25%) และเพิ่มความเร็วเดินตามจำนวนชั้น"
    ),
    pnb: tr(
      "ตี/โดนตีสะสมสูงสุด 15 ชั้น ได้เกราะและ Tenacity ตามชั้น ครบ 15 ได้ Slow Resist และวิ่งไวอีก 10 วิ"
    ),
    hwh: tr(
      "ใช้ Ultimate แล้วได้ AD, ความเร็วโจมตี, ความเร็วเดินเพิ่ม 8 วิ (ทุก 30 วิ)"
    ),
    cco: tr("ได้ AD เพิ่มตาม Bonus HP · ออโต้กวาดโคนด้านหลังเป้า"),
    goh: tr("สโลว์ศัตรูรอบตัว 35% พร้อมวิ่งไวตัวเอง 30% นาน 2 วิ (ทุก 20 วิ)"),
    dss: tr(
      "ติด CC แล้วล้าง CC ทันที + กัน CC 0.5 วิ + วิ่งไว 30% นาน 1.5 วิ (ทุก 75 วิ)"
    ),
    swf: tr("เลือดต่ำกว่า 30% รับโล่ 250 (+100% Bonus AD) นาน 4 วิ (ทุก 60 วิ)"),
    slh: tr("ทุก 10 วิ ออโต้ครั้งแรกได้ความเร็วเดิน +40% แล้วค่อยๆ จางหายใน 2.5 วิ"),
    ulf: tr("ออโต้ลดคูลดาวน์ที่เหลือของ Q W E ลง 12%"),
    ivd: tr("ออโต้ครบ 3 ครั้ง ระเบิด True Damage 60 (+35% Bonus AD)"),
    sst: tr("ออโต้ครั้งที่ 3 โบนัสดาเมจกายภาพ 80 (+50% Bonus AD)"),
    hth: tr("ออโต้ครั้งที่ 3 เบิ้ลผล on-hit ทั้งหมดซ้ำอีก 2 ครั้งในฮิตนั้น"),
    boe: tr("ทุก 5 วิ ออโต้ครั้งถัดไปยิงไกลขึ้น 150 หน่วย และแถมดาเมจเวท 50 (+20% AP)"),
    cns: tr("จบการพุ่ง ออโต้ครั้งถัดไปแถมดาเมจกายภาพ 80 (+50% Bonus AD) (ทุก 6 วิ)"),
    smc: tr("10 วินาทีแรกของไฟต์ ได้เจาะเกราะเพิ่ม +15"),
    sls: tr("เข้าปะทะแล้วได้ความเร็วเดิน +40% นาน 3 วิ (ทุก 30 วิ)"),
    htc: tr("ตีหรือใช้สกิลใส่เป้าเดิมครบ 3 ฮิตใน 2 วิ ระเบิด True Damage 8% Max HP (ต่อตัว ทุก 8 วิ)"),
    fms: tr("ดาเมจกินหลอดโล่แรงขึ้น 50% และเป้าที่โดนรับโล่ใหม่ได้น้อยลง 40% นาน 3 วิ"),
    jvb: tr("ตีใส่ศัตรูที่เลือดต่ำกว่า 50% แถมดาเมจกายภาพ 100 (+40% Bonus AD) (ต่อตัว ทุก 6 วิ)"),
    trs: tr("สังหารหรือช่วยสังหาร รีเซ็ตคูลดาวน์ Q W E ทันที"),
    adm: tr("ขว้างมีดใส่ศัตรูที่ใกล้ที่สุด สโลว์ 40% นาน 2 วิ และเป้ารับดาเมจจากเราแรงขึ้น 15% นาน 4 วิ (ทุก 35 วิ)"),
    fsd: tr("โดนดาเมจที่จะตาย เลือดล็อกที่ 1 แล้วอมตะ 2 วิ (ครั้งเดียวต่อยก)"),
    wvc: tr("สังหารศัตรูได้ +4 AD ถาวร สะสมข้ามยกได้สูงสุด 10 ชั้น (+40 AD)"),
    kff: tr("ออโต้แถมดาเมจเวท 15 (+20% AP) ทุกครั้งที่ตีโดน"),
    csb: tr("หลังร่ายสกิล ออโต้ครั้งถัดไปแถมดาเมจเวท 75% Base AD + 45% AP (ทุก 1.5 วิ)"),
    stc: tr("ดาเมจเวทจุดไฟเผาเป้า 2% Max HP ต่อวินาที นาน 3 วิ"),
    yfs: tr("ดาเมจเวททุกชนิดสโลว์เป้า 30% นาน 1 วิ"),
    zgc: tr("ทำดาเมจเวทแล้วได้ความเร็วเดิน +20% นาน 2 วิ (ทุก 4 วิ)"),
    nvs: tr("แปะมาร์กเป้า 2.5 วิ ครบเวลาระเบิดซ้ำ 100 (+20% ดาเมจเวทที่สะสมไว้) (ทุก 25 วิ)"),
    rsd: tr("สกิลเวทถัดไปแรงขึ้น 80 (+25% AP) และชิ่งไปหาศัตรูข้างเคียง 3 ตัว 40 (+15% AP) (ทุก 12 วิ)"),
    hnd: tr("ร่ายท่าไม้ตายแล้วเปิดวงน้ำแข็ง 450 หน่วย นาน 4 วิ เผา 20 (+10% AP) ต่อวินาที และลดต้านเวทศัตรูในวง 20%"),
    mrt: tr("ยิงดาวตกใส่ศัตรูในระยะ 1200 ระเบิดรัศมี 200 หน่วย ดาเมจเวท 120 (+40% AP) (ทุก 25 วิ)"),
    ntw: tr("เข้าปะทะแล้วตัดคูลดาวน์ที่ค้างอยู่ของ Q W E ลงครึ่งหนึ่งทันที (ทุก 40 วิ)"),
    jbg: tr("ดาเมจเวทแรงขึ้นสูงสุด 15% ตามส่วนต่าง Max HP ที่ศัตรูมีมากกว่าเรา"),
    ang: tr("สังหารหรือช่วยสังหาร ฮีลเพื่อนทั้งทีม 60 (+25% AP)"),
    ats: tr("ฮีลหรือกางโล่ให้เพื่อน ส่งต่อผล 30% ให้เพื่อนที่เลือดเหลือน้อยสุดในระยะ 750 ด้วย"),
    acb: tr(
      "ฮีลหรือกางโล่ให้เพื่อน ทั้งคู่ได้ 4 วิ · ความเร็วโจมตี +15% (+0.5% ต่อเลเวล) · ออโต้แถมดาเมจเวท 10 (+3 ต่อเลเวล) (+10% AP)"
    ),
    sfv: tr(
      "ฮีลหรือกางโล่ให้เพื่อน ทั้งคู่ได้ 4 วิ · AP +13 (+1 ต่อเลเวล) · Ability Haste +15"
    ),
    esb: tr("เพื่อนเลือดต่ำกว่า 40% กางวง 700 หน่วย อีก 2 วิ ฮีลทุกคนในวง 10% Max HP (ทุก 60 วิ)"),
    abw: tr("เริ่มไฟต์ เพื่อนในระยะ 700 ได้ความเร็วเดิน +30% แล้วค่อยๆ จางใน 3 วิ (ทุก 20 วิ)"),
    hmb: tr("ล้าง CC ให้เพื่อนหรือตัวเองทันที + กัน CC 1 วิ + ฮีล 50 (+6 ต่อเลเวล) (+25% AP) (ทุก 60 วิ)"),
    pib: tr("เพื่อนเลือดต่ำกว่า 50% กางโล่ให้เพื่อนในระยะ 700 เท่ากับ 100 (+15 ต่อเลเวล) นาน 3 วิ (ทุก 60 วิ)"),
    gwc: tr("ออร่ารอบตัว 600 หน่วย เพื่อนได้ความเร็วเดิน +15 และความเร็วโจมตี +10% ตลอดเวลาที่ยังไม่ตาย"),
    ood: tr(
      "ผูกกับเพื่อน 1 คน (เน้นแครี่) · รับดาเมจแทน 10% (หยุดเมื่อตัวเองเลือดต่ำกว่า 20%) · ฮีลตัวเอง 10% ของดาเมจที่เพื่อนทำได้ · เพื่อนตายแล้วผูกใหม่ใน 5 วิ"
    ),
  };
}
