# Ruined War — คู่มือนักพัฒนา

คู่มือนี้อธิบาย **โครงสร้างของระบบ** ว่าโค้ดก้อนนี้ทำงานยังไง ไฟล์ไหนรับผิดชอบอะไร และถ้าจะแก้อะไรต้องไปแตะตรงไหน
เขียนให้คนที่เพิ่งเปิดโปรเจกต์นี้ครั้งแรกอ่านรู้เรื่อง ไม่ต้องไล่โค้ดเองทั้งหมดก่อน

> คู่มือนี้พูดเรื่อง **โครงสร้างและวิธีพัฒนา**
> ถ้าอยากรู้ว่า "เกมนี้เล่นยังไง / ไอเทมชิ้นนี้ทำอะไร / บาลานซ์ตัวไหนพัง" ให้ไปอ่าน [README.md](README.md) กับ [docs/](docs/) แทน

---

## ⚠️ สถานะคู่มือ — ซอร์สเป็น v0.2 แล้ว แต่เนื้อคู่มือยังไม่ทัน

**`src/` ตอนนี้เป็นซอร์ส Patch 0.2 ของจริง** — ยืนยันแล้วว่า `node build.mjs` ให้ไฟล์ที่ md5 ตรงกับ
`ruined-lore.html` ที่ใช้เล่นอยู่เป๊ะ (`5420502a785b8791fdd28fd8e7ffa6a2`) เพราะฉะนั้น build ได้ปลอดภัย

**แต่หัวข้อ 3–16 ข้างล่างเขียนไว้ตอน `src/` ยังเป็นสแนปช็อตเก่า (ก่อน Patch 0.1) ยังไม่ได้อัปเดต**

สิ่งที่ยัง **ถูกต้อง** อยู่ (v0.2 ก็ใช้แบบเดียวกัน):
การแยกชั้น `data/` `engine/` `ui/` · pattern `ctx` · `screens/*.jsx` ไม่ใช่ component · ระบบ pass ใน `step()` ·
seeded RNG ต่อ unit · ระบบ i18n `tr()` · วิธี build เป็นไฟล์เดียว · กับดักในหัวข้อ 14

สิ่งที่ **ไม่ตรงแล้ว** และต้องเขียนใหม่:

| หัวข้อในคู่มือ | ความจริงใน v0.2 |
|---|---|
| `EVENTS` (SKIRMISH/OBJECTIVE/SIEGE/BLITZ/FARM) | เลิกใช้แล้ว เหลือ `SKIRMISH` ชุดเดียว · ความหลากหลายมาจาก **นิสัยประจำเลน (stance)** ใน [src/data/behaviour.js](src/data/behaviour.js) |
| ไฟต์รวม 5v5 ยกละครั้ง | **ไฟต์แยกเลน** — ยกหนึ่งมีได้ถึง 3 ไฟต์ ([src/game/round-plan.js](src/game/round-plan.js), [src/screens/Lanes.jsx](src/screens/Lanes.jsx)) |
| เวลาไฟต์มาจาก `event.duration` | คิดจากจำนวนคนในสนาม — `30 + 5 × (คน − 2)` วิ ใน [build-fight.js](src/engine/build-fight.js) |
| โหมดชื่อ LONG / RUSH · gold ×0.5 | ชื่อ **Normal / Quick Play** · ตัวคูณเป็น 1 ทั้งคู่ |
| ขนาดสนาม 3300×1850 | **4950×2775** (×1.5) · `RENDER_SCALE` 6.6 · มี `DEPLOY` zone |
| รายได้จากแพ้/ชนะ | มาจาก **stance ประจำเลน** + kill/assist ชุดใหม่ |
| ไม่มีโหมดออนไลน์ | มี **VERSUS** — [src/net/](src/net/) (PeerJS, รหัสห้อง 5 ตัว, โหมดคนดู) |
| ไม่มีหน้า PATCH | มี [src/screens/Patch.jsx](src/screens/Patch.jsx) + [src/data/patches.js](src/data/patches.js) (14 แพตช์) |
| `engine/lorla.js` | เปลี่ยนชื่อเป็น [laura.js](src/engine/laura.js) · เพิ่ม [alice.js](src/engine/alice.js), [klaeder.js](src/engine/klaeder.js) |
| `AUTO_DMG` / `DMG_MUL` | ปุ่มคุมความยาวไฟต์ตัวใหม่ใน [tuning.js](src/data/tuning.js) |

### รันเกมดูในเบราว์เซอร์ระหว่างพัฒนา

เปิดไฟล์ `ruined-lore.html` จากเครื่องตรงๆ ก็เล่นได้ แต่ถ้าอยากให้เครื่องมืออัตโนมัติเข้าถึงได้ มี static server เล็กๆ ให้แล้ว

```bash
node .claude/serve.mjs
```

เสิร์ฟที่ `http://localhost:8123` ([.claude/launch.json](.claude/launch.json) ชี้ไปที่ตัวนี้)
ไฟล์ในโฟลเดอร์ `.claude/` เป็นเครื่องมือระหว่างพัฒนาล้วนๆ ไม่ได้ถูก bundle เข้าเกม

### ชั้นวาดภาพ (ปรับใหม่)

| ไฟล์ | หน้าที่ |
|---|---|
| [ui/draw-fx.js](src/ui/draw-fx.js) | เอฟเฟกต์กลาง ใช้ร่วมกับห้องซ้อม · `drawGround` `drawFx` `drawFxText` `shakeAmount` |
| [ui/Arena.jsx](src/ui/Arena.jsx) | พื้นหลัง ตัวละคร ลูกกระสุน กล้อง ซูม |
| [ui/item-desc.js](src/ui/item-desc.js) | คำอธิบายไอเทมเป็นข้อความล้วน — **แยกออกจาก `recipe.jsx`** เพื่อให้สคริปต์ node import ได้ (node โหลด `.jsx` เองไม่ได้) `recipe.jsx` re-export ต่อให้ ของเดิมไม่ต้องแก้ |
| [ui/draw-lore.js](src/ui/draw-lore.js) | **ของ Patch 0.3** — ยักษ์ของ JACK · กำแพงและบ้านอิฐของ H.S.B · พายุของ NIAN · วังวนของ YODAKA · โซนตะกร้า/บั้งไฟ · วงเตือนก่อนสแลม |

### ไฟล์ที่เพิ่มมาใน Patch 0.3

| ไฟล์ | หน้าที่ |
|---|---|
| [data/champions-lore.js](src/data/champions-lore.js) | ข้อมูลตัวละครใหม่ 10 ตัว · `champions.js` รวมสองก้อนเข้าด้วยกัน (`CORE_CHAMPIONS` + `LORE_CHAMPIONS`) |
| [engine/lore.js](src/engine/lore.js) | กลไกของตัวละครใหม่ทั้งหมด · `fireLoreSkill` ถูกเรียกจาก `default:` ของ switch ใน `fire-skill.js` · `tickLoreUnit` เรียกทุกเฟรมจาก `step.js` · `tickLore` เรียกจาก `systems.js` |
| [engine/lore-items.js](src/engine/lore-items.js) | เอฟเฟกต์ของไอเทมชุดใหม่ 12 ชิ้น + ของเก่าที่เติมเอฟเฟกต์ให้ |
| [game/draft.js](src/game/draft.js) | กติกาดราฟต์ล้วนๆ (ลำดับ Snake · ใครถึงตา · ลงมือหนึ่งก้าว) เทสได้โดยไม่ต้องเปิดเบราว์เซอร์ |
| [screens/Draft.jsx](src/screens/Draft.jsx) | หน้าจอดราฟต์/ทัวร์นาเมนต์ · ใช้แทน `Pick.jsx` เมื่อ `draftStyle !== "BLIND"` |

**วิธีเพิ่มตัวละครใหม่หลังจากนี้:** ใส่ข้อมูลใน `champions-lore.js` แล้วถ้า `type` ของสกิลยังไม่มี
ให้เพิ่ม `case` ใน `fireLoreSkill` ของ [engine/lore.js](src/engine/lore.js) — ไม่ต้องแตะ `fire-skill.js`
อย่าลืมเพิ่มเงื่อนไข `shouldCast` ใน [engine/ai.js](src/engine/ai.js) ไม่งั้นบอทจะไม่กดสกิลนั้นเลย
และเพิ่มชื่อ type ใน `SHAPES` ของ [game/skill-desc.js](src/game/skill-desc.js) เพื่อให้หน้าข้อมูลอ่านรู้เรื่อง

กติกาสำคัญของชั้นนี้: **ห้ามใช้ `Math.random()` ในโค้ดวาดภาพ**
ทุกอย่างที่ดูสุ่มต้องคำนวณจากตำแหน่งกับเวลาเกิดของเอฟเฟกต์ (ดูฟังก์ชัน `hash`) ไม่งั้นภาพจะกระพริบเปลี่ยนทุกเฟรม

ข้อมูลที่เป็นของ "การวาด" ล้วนๆ เก็บไว้บนตัวยูนิตได้ ใช้ชื่อขึ้นต้นด้วย `_` เช่น `u._deathAt`
(`report.js` เลือกเก็บเฉพาะฟิลด์ที่ระบุไว้ ฟิลด์พวกนี้เลยไม่หลุดเข้าไปในสรุปผล) — `u.hpGhost` ที่มีอยู่เดิมก็ทำแบบนี้

**จุดเริ่มที่เร็วที่สุดสำหรับเข้าใจ v0.2:** อ่าน [src/data/patches.js](src/data/patches.js) (แพตช์โน้ตครบ 14 แพตช์)
แล้วรัน [_matchsim.mjs](_matchsim.mjs) เพื่อดูว่าเศรษฐกิจออกมาเป็นยังไง

### ใบอ้างอิงตัวเลขสกิล — [docs/skill-scaling.md](docs/skill-scaling.md)

เวลาจะจูนบาลานซ์ให้เปิดไฟล์นี้ ไม่ต้องไปไล่อ่าน `champions.js` เอง

```bash
node _skillref.mjs
```

สร้างใหม่ได้ทุกเมื่อ อ่านจาก [data/champions.js](src/data/champions.js) ตรงๆ เลยไม่มีทางตกยุค ข้างในมี

- ค่าสถานะฐานทุกตัวพร้อมค่าต่อเลเวล และค่าจริงตอน Lv16
- ทุกสกิล แยกค่าตามแรงก์เป็นตาราง พร้อม **ชื่อฟิลด์ในโค้ดกำกับทุกตัวเลข**
- **ดาเมจจริง** ที่ค่าสถานะอ้างอิง — เทียบข้ามตัวละครได้ ซึ่ง `dmg` ดิบทำไม่ได้เพราะ ratio ต่างกัน
- `type` ของสกิลถูกจัดการที่ไฟล์ไหนบ้าง
- **รายการฟิลด์ที่ยังไม่มีป้ายชื่อ 71 ตัว** — มีผลกับเอนจินจริงแต่ไม่โผล่ในหน้าข้อมูลสกิลในเกม

> จำง่ายๆ ว่ามีสองเรื่องแยกกัน: ฟิลด์จะ **มีผล** ต่อเมื่อเอนจินอ่านมัน และจะ **โผล่ในเกม** ต่อเมื่อมีป้ายชื่อใน `skill-desc.js`

---

## 1. สรุปใน 60 วินาที

เกมนี้คือ **MOBA auto-battler** ที่ผู้เล่นเป็นโค้ช ไม่ใช่คนเล่น

- ผู้เล่นตัดสินใจ *ก่อน* ไฟต์ (แจกแต้มนักแข่ง → เลือกตัวละคร → ซื้อของ/อัพสกิล → สั่งสไตล์)
- พอกดเริ่มไฟต์ เอนจินจะจำลองเองทั้งหมด **ผู้เล่นสั่งอะไรไม่ได้อีกแล้ว**
- เล่นกันหลายยก (20 หรือ 50 ยก) ใครถึงจำนวนยกที่ชนะก่อนคือชนะแมตช์

ทางเทคนิค:

| หัวข้อ | ค่า |
|---|---|
| ภาษา/เฟรมเวิร์ก | React 19 + JSX ล้วน ไม่มี TypeScript ไม่มีไฟล์ CSS (ใช้ inline style) |
| Bundler | esbuild ผ่าน [build.mjs](build.mjs) |
| ผลลัพธ์ | **ไฟล์ HTML ไฟล์เดียว** — เปิดจากเครื่องได้เลย ไม่ต้องมีเซิร์ฟเวอร์ ไม่ต้องต่อเน็ต |
| State management | `useState` ใน [src/App.jsx](src/App.jsx) ก้อนเดียว ไม่มี Redux/Context |
| เอนจินไฟต์ | JS ล้วนใน `src/engine/` — **ไม่มี React เลย** รันใน Node ได้ตรงๆ |
| ภาษาในซอร์ส | ข้อความเป็นภาษาไทย ห่อด้วย `tr()` แล้วแปลเป็นอังกฤษด้วยพจนานุกรม |

---

## 2. เริ่มพัฒนา

```bash
npm install
```

```bash
npm run build
```

```bash
npm run watch
```

- `npm run build` — bundle `src/` ทั้งหมดเป็น `sideline.html` ไฟล์เดียว (~950 KB)
- `npm run watch` — build ใหม่อัตโนมัติทุกครั้งที่เซฟไฟล์ใน `src/`
- ดูผล: ดับเบิลคลิก `sideline.html` หรือลากเข้าเบราว์เซอร์ (ไม่ต้อง dev server)

### build ทำงานยังไง

[build.mjs](build.mjs) ทำแค่ 3 อย่าง:

1. esbuild bundle `src/main.jsx` → IIFE string (minify, target es2019, `jsx: "automatic"`)
2. อ่าน [index.template.html](index.template.html) แล้วแทนที่ placeholder `/*__BUNDLE__*/` ด้วย JS ก้อนนั้น
3. เขียนออกเป็น `sideline.html`

แปลว่า **ทุกอย่างถูกยัดลงไฟล์เดียว** ไม่มี `<script src>` ภายนอก ไม่มีรูป ไม่มีฟอนต์โหลดจากเน็ต

> ⚠️ ชื่อไฟล์ output ถูก hardcode เป็น `sideline.html` ใน `build.mjs`
> ไฟล์ `ruined-lore.html` ที่อยู่ใน repo คือผลลัพธ์ที่ build ไว้แล้วเปลี่ยนชื่อ/ชื่อเกมทีหลัง ไม่ได้ build ใหม่อัตโนมัติ
> ถ้าจะ rename เกมจริงจัง ให้แก้ค่า `OUT` ใน `build.mjs` กับ `<title>` ใน `index.template.html`

### Lint

```bash
npx eslint src
```

[eslint.config.mjs](eslint.config.mjs) เปิดเฉพาะกฎที่จับบั๊กจริง — `no-undef` (กัน typo ชื่อตัวแปร)
และ `no-use-before-define` ส่วน `no-unused-vars` ปิดไว้ (โค้ดจงใจ destructure ทิ้งเยอะ)

---

## 3. แผนที่โปรเจกต์

```
build.mjs               รวม src/ ทั้งหมดเป็น HTML ไฟล์เดียว
index.template.html     เปลือก HTML + CSS reset + ช่องว่างให้ยัด bundle
sideline.html           ผลลัพธ์ที่ build แล้ว (เปิดเล่นได้เลย — ห้ามแก้มือ)
_*.mjs                  สคริปต์เทส/วัดบาลานซ์ รันด้วย node ตรงๆ
docs/                   บันทึกบาลานซ์ + ตารางค่าสถานะ (เอกสารอ้างอิง ไม่ใช่โค้ด)

src/
  main.jsx              mount React ลง #root — 5 บรรทัด จบ
  App.jsx               ★ state ทั้งแมตช์ + ตัวสลับหน้าจอ + ลูปไฟต์
  i18n.js               tr() — ตัวแปลภาษา
  i18n-en.js            พจนานุกรม ไทย → อังกฤษ

  data/                 ★ ตัวเลขล้วน ไม่มี logic — แก้บาลานซ์ที่นี่
  engine/               ★ การจำลองไฟต์ — JS ล้วน ไม่มี React
  game/                 ตัวเชื่อมระหว่าง data/engine กับ UI (บอทซื้อของ, สรุปผล, คำอธิบายสกิล)
  screens/              หนึ่งไฟล์ = หนึ่งหน้าจอ
  ui/                   ชิ้นส่วนหน้าตาที่ใช้ซ้ำ + โมดัล + canvas
```

### กฎเหล็กของโครงสร้างนี้

1. **`data/` ห้ามมี logic** — เป็นตัวเลขกับข้อความเท่านั้น จะได้จูนบาลานซ์โดยไม่กลัวพังโค้ด
2. **`engine/` ห้าม import React** — เอนจินต้องรันใน Node ได้ ไม่งั้นสคริปต์เทสใน `_*.mjs` พัง
3. **`screens/` ห้ามมี hook** — อธิบายละเอียดในหัวข้อ 5
4. **ข้อความที่คนเห็นต้องห่อ `tr()` เสมอ** — ไม่งั้นเปลี่ยนภาษาไม่ได้

---

## 4. ข้อมูลไหลยังไง (data flow)

นี่คือส่วนที่ต้องเข้าใจก่อนแก้อะไรก็ตาม

```
     ผู้เล่นกดปุ่ม
          │
          ▼
   ┌─────────────┐   setState
   │  App.jsx    │◄──────────────┐
   │  (state)    │               │
   └──────┬──────┘               │
          │ ctx (ก้อนเดียว)        │ callback
          ▼                      │
   ┌─────────────┐               │
   │ screens/*   │───────────────┘
   │ (แค่วาด)      │
   └─────────────┘

   กดเริ่มไฟต์
          │
          ▼
   toDef()          ← game/roster.js  แปลงตัวละครในทีมเป็น "def" ก้อนแบนๆ
          │
          ▼
   buildFight()     ← engine/build-fight.js
          │           เรียก deriveStats() แปลง def → ค่าจริงในสนาม
          │           สร้าง state ของไฟต์ทั้งก้อน (units, projectiles, zones, ...)
          ▼
   step() × 60/วิ    ← engine/step.js
          │           requestAnimationFrame ใน App.jsx เรียกซ้ำจนกว่า state.over
          ▼
   summarizeFight() ← game/report.js  แปลง state → ตัวเลขสรุปให้หน้ากราฟ
          │
          ▼
   จ่ายเงิน/XP → ยกถัดไป   ← App.jsx finish()
```

### สามชั้นที่แยกกันชัดเจน

| ชั้น | หน้าที่ | รู้จัก React ไหม |
|---|---|---|
| `data/` | ตัวเลขดิบ | ไม่ |
| `engine/` | จำลองไฟต์จากตัวเลขดิบ | **ไม่** |
| `screens/` + `ui/` | วาดผลลัพธ์ + รับ input | ใช่ |

`game/` อยู่ตรงกลาง — ใช้ได้ทั้งสองฝั่ง (`shop-ai.js` ใช้เฉพาะ data, `skill-desc.js` ใช้ทำข้อความให้ UI)

---

## 5. `App.jsx` — หัวใจของทุกอย่าง

[src/App.jsx](src/App.jsx) ถือ state ของทั้งแมตช์ไว้ก้อนเดียว แล้วส่งลงไปให้หน้าจอผ่านตัวแปรชื่อ `ctx`

### state สำคัญ

| state | ความหมาย |
|---|---|
| `phase` | หน้าจอที่กำลังแสดง — `"MENU"`, `"DRAFT"`, `"SHOP"`, `"FIGHT"`, `"RESULT"`, ... |
| `team` / `foe` | ทีมเรา / ทีมคู่แข่ง — array 5 ตัว (TOP, JUNGLE, MID, ADC, SUPPORT) |
| `round` / `score` | ยกที่เท่าไหร่ / สกอร์ |
| `streak` | ชนะ-แพ้ติดกัน ใช้คิดภาษีชนะรวดกับเงินชดเชย |
| `fightRef` | `useRef` ที่เก็บ state ของไฟต์ — **จงใจไม่ใช้ `useState`** |
| `history` | สรุปทุกยกในแมตช์นี้ ไว้ให้หน้ากราฟย้อนดู |

### ทำไม `fightRef` ถึงเป็น ref ไม่ใช่ state

เอนจินเดิน 60 ครั้งต่อวินาที (บางทีคูณความเร็ว 2-4 เท่า) ถ้าเก็บใน `useState` React จะ re-render ทุกเฟรม → เกมกระตุก

วิธีที่ใช้จริง (ดูใน `useEffect` ของ `phase === "FIGHT"`):

```js
step(st);                        // เดินเอนจิน — mutate state ตรงๆ ไม่ผ่าน React
if (arenaDrawRef.current) arenaDrawRef.current();          // วาด canvas เอง ไม่ผ่าน React
if (now - lastHudRef.current > 140) setTick((t) => t + 1); // อัพ HUD แค่ ~7 ครั้ง/วิ
```

แปลว่า **canvas วาดเองทุกเฟรม แต่ React re-render แค่ ~7 ครั้งต่อวินาที** เพื่ออัพตัวเลข HUD

> ⚠️ ถ้าเพิ่มอะไรที่อ่านค่าจากไฟต์แบบสดๆ อย่าเผลอ `setState` ทุกเฟรม

### `ctx` — สัญญาระหว่าง App กับหน้าจอ

ท้ายไฟล์ `App.jsx` มีออบเจกต์ `ctx` รวม state + ฟังก์ชันทั้งหมดที่หน้าจอต้องใช้

```js
const ctx = { addRank, arenaDrawRef, bump, buy, /* ... อีกเป็นร้อย */ };
```

**เพิ่ม state ใหม่ → ต้องใส่ใน `ctx` ด้วย** ไม่งั้นหน้าจอมองไม่เห็น (บั๊กนี้เจอบ่อยที่สุดในโปรเจกต์นี้)

### ⚠️ `screens/*.jsx` ไม่ใช่ React component

นี่เป็นสิ่งที่แปลกที่สุดในโค้ดเบสนี้ และเป็นกับดักที่ทำให้มือใหม่พังบ่อยที่สุด

```js
// ใน App.jsx — เรียกเป็นฟังก์ชันธรรมดา ไม่ใช่ <SetupScreen ctx={ctx} />
if (phase === "SETUP") return SetupScreen(ctx);
```

เพราะเรียกแบบนี้ ทุกหน้าจอเลย "อยู่ใน component เดียวกัน" กับ `App` → ใช้ state ก้อนเดียวกันได้เลย

**ผลที่ตามมา — ห้ามใส่ hook (`useState` / `useEffect` / `useRef`) ใน `screens/*.jsx` เด็ดขาด**
เพราะจำนวน hook จะเปลี่ยนไปตามหน้าจอที่เปิดอยู่ → React พังทันที

ถ้าต้องการ state ใหม่: ประกาศใน `App.jsx` แล้วส่งผ่าน `ctx`

ข้อยกเว้น: [ui/Practice.jsx](src/ui/Practice.jsx) เป็น component จริง (`<Practice ... />`) เพราะเป็นโหมดแยกที่ไม่ใช้ state ของแมตช์

---

## 6. `data/` — ตัวเลขล้วน

### [data/constants.js](src/data/constants.js)

หน่วยวัดของสนาม — **อิงหน่วยของ League of Legends 1:1**

```
ARENA_W = 3300, ARENA_H = 1850     ขนาดสนาม
RENDER_SCALE = 3.7                 canvas pixel = หน่วย ÷ 3.7
move speed 325 · melee range 175 · ranged 550 · model radius 65
LANES = ["TOP","JUNGLE","MID","ADC","SUPPORT"]
STAT_KEYS = ["mechanics","gameSense","knowledge","decision","teamwork"]
```

### [data/champions.js](src/data/champions.js)

ตัวละครทั้งหมด (ตอนนี้ 9 ตัว) — หนึ่ง key = หนึ่งตัวละคร

```js
KAZEM: {
  id, th, role, lane, melee, value,      // value = "ความคุ้มค่าที่จะโฟกัส" ใช้ตอน AI เลือกเป้า
  hp, hpG, ad, adG, armor, armorG, ...   // ค่าฐาน + ค่าที่เพิ่มต่อเลเวล (G = growth)
  as, asG, ms, range, hp5, hp5G,
  skillPriority: ["Q","E","W"],          // ลำดับอัพสกิลที่แนะนำ
  passive: { th, desc },                 // ข้อความอย่างเดียว ผลจริงเขียนมือใน engine/
  skills: [ { key:"Q", th, type, cd, cdByRank, dmg:[...], adRatio, ... }, ... ],
}
```

จุดสำคัญ:

- `dmg: [26, 40, 54, 68, 82]` — array index คือ **rank - 1** (สกิลปกติ 5 แรงก์ อัลติ 3 แรงก์)
- `type` คือ **ตัวกำหนดว่าสกิลทำงานแบบไหน** — ชื่อ type ต้องตรงกับ `switch` ใน [engine/fire-skill.js](src/engine/fire-skill.js)
  (`line`, `cone`, `aoeSelf`, `aoeGround`, `chargeDash`, `grabSlam`, `wave`, `submerge`, `dual`, ...)
- `LANE_CHAMPION` ท้ายไฟล์ = ตัวละครค่าเริ่มต้นของแต่ละเลน (ใช้เวลาไม่ได้เลือก)

### [data/items.js](src/data/items.js)

ไอเทม 132 ชิ้น + สูตรคราฟต์ + หมวดร้านค้า

```js
{ id:"cb", th:"Chaos Blade — ดาบอลวน", cat:"START", tier:1, cost:10, ad:10, hp:90 }
{ id:"xxx", ..., tier:3, cost:60, parts:["aaa","bbb"], also:["FIGHTER"], uniq:["antiheal"] }
```

| ฟิลด์ | ความหมาย |
|---|---|
| `th` | ชื่อรูปแบบ `"English — ไทย"` — `itemName()` เลือกข้างตามภาษา **ห้ามใส่ `tr()`** |
| `cat` | หมวดหลัก (แท็บที่มันอยู่) |
| `also[]` | หมวดรองที่ให้โผล่ด้วย เช่นของแทงค์ที่ไฟท์เตอร์ก็ใช้ดี |
| `parts[]` | สูตรคราฟต์ — ถือชิ้นส่วนอยู่แล้วจะได้ส่วนลดเท่าราคาชิ้นนั้นเป๊ะ |
| `uniq[]` | กลุ่มไอเทมที่ห้ามถือซ้ำ (ดู `UNIQ_GROUPS`) เช่นของตัดฮีลถือได้ชิ้นเดียว |
| `tier` | 1/2 = ชิ้นส่วน (ถือซ้ำได้) · 3 = ของใหญ่ (ถือได้ชิ้นเดียว) |

ฟังก์ชันซื้อของทั้งหมดอยู่ท้ายไฟล์นี้ — `effectiveCost()`, `buyBlockedReason()`, `applyBuy()`
**ทั้งผู้เล่นและบอทใช้ฟังก์ชันชุดเดียวกัน** ดังนั้นกฎการซื้อจึงเหมือนกันเป๊ะเสมอ

> ℹ️ 1 gold ในเกมนี้ = 50 gold ใน LoL

### [data/tuning.js](src/data/tuning.js)

ปุ่มหมุนบาลานซ์ระดับ "ทั้งไฟต์"

```js
REGEN_DELAY = 4      // ออกจากคอมแบตกี่วิถึงฟื้นเลือด
RAMP_FRAC = 0.4      // ดาเมจเริ่มไต่ขึ้นที่ 40% ของนาฬิกาไฟต์
RAMP_SCALE = 0.45    // ...แล้วเป็น 2 เท่าภายใน 45% ของนาฬิกา
EVENTS = { SKIRMISH: 40s, OBJECTIVE: 60s, SIEGE: 90s, BLITZ: 20s, FARM: ข้ามไฟต์ }
STYLES = { ENGAGE, POKE, HOLD }
```

`RAMP_*` คือกลไกที่ทำให้ไฟต์ **จบเสมอ** — ยิ่งนานยิ่งเจ็บ ไม่มีทางยืนตีกันไม่รู้จบ
สูตรอยู่ใน [engine/damage.js](src/engine/damage.js):
`dmg × (1 + max(0, (t − rampStart) / rampScale))`

> ⚠️ `STYLES` มีฟิลด์ `beats` (บุก→คุมระยะ→ตั้งรับ→บุก) แต่ **เอนจินไม่ได้อ่านฟิลด์นี้เลย**
> ที่ชนะกันจริงมาจากพารามิเตอร์การเดินเท้า (`rangeMul`, `standoff`, `leashBonus`, `retreatAt`) ที่ทำให้เกิดผลนั้นโดยอ้อม
> ถ้าจะทำตัวคูณ rock-paper-scissors ตรงๆ ต้องเขียนเพิ่มเอง

### [data/modes.js](src/data/modes.js) / [data/lanes.js](src/data/lanes.js)

- `MODES` — LONG (50 ยก, gold/xp ×0.5) กับ RUSH (20 ยก, ×1) เพิ่มโหมดใหม่ที่นี่
- `LANE_INFO` — พาสซีฟประจำเลน + เลเวลสูงสุด (TOP ไปถึง 20, ที่เหลือ 16)

> ⚠️ `passive` ใน `lanes.js` เป็น **ข้อความอย่างเดียว** ผลจริงเขียนมือกระจายอยู่ในโค้ด
> เช่นโบนัสเงิน/XP ประจำเลนอยู่ใน `App.jsx → award()` และพาสซีฟซัพพอร์ตอยู่ที่ `effStat()` ใน `engine/stats.js`
> **แก้ข้อความอย่างเดียวไม่ทำให้ผลเปลี่ยน — ต้องแก้ทั้งสองที่**

---

## 7. `engine/` — การจำลองไฟต์

ส่วนที่ซับซ้อนที่สุด ~3,700 บรรทัด ไม่มี React เลยแม้แต่บรรทัดเดียว

### ลำดับชีวิตของหนึ่งไฟต์

```
buildFight(blueDefs, redDefs, seed, event)   →  state ก้อนใหญ่
   ├ deriveStats(def) ต่อคน   → แปลง เลเวล + ไอเทม + ตัวละคร → ค่าจริง
   └ สร้าง unit 10 ตัว + array ว่างของทุกระบบ (projectiles, zones, dots, ...)

step(state)  ×  60 ครั้ง/วินาที
   ทำงานเป็น "pass" เรียงกัน เพื่อให้ทุกคนอ่านโลกใบเดียวกัน

runFight(state)   ← เวอร์ชันวนจนจบทีเดียว ใช้ในสคริปต์เทส (ไม่มี UI)
```

### `step()` แบ่งเป็น pass — และทำไมต้องแบ่ง

[engine/step.js](src/engine/step.js) ทำงานเรียงแบบนี้ทุกเฟรม:

| Pass | ทำอะไร |
|---|---|
| ออร่าทีม | รวมออร่าเกราะ/AD จากทุกคนที่ยังไม่ตาย แล้วเซ็ตกลับเข้า unit |
| **PASS 0** | upkeep ทุกคน — regen, ลด cooldown, หมดอายุ buff, คิดความเร็วเดินจริง, เช็ค CC |
| ออร่าไอเทม | ไอเทมที่แผ่รัศมีใส่ศัตรูรอบตัว |
| **PASS 1** | **ทุกคนตัดสินใจ** — เลือกเป้า, หลบ, ถอย, ตั้งใจจะเดินไปไหน, กดสกิล, ออโต้ |
| **PASS 2** | **ขยับทุกคนพร้อมกัน** + ผลักกันไม่ให้ทับ |
| projectiles | เดินลูกกระสุน เช็คโดน |
| systems | โซน, พิษ, กรง, คลื่น, dash, grab, ไอเทมพิเศษ |
| timeline | เก็บตัวอย่างไว้ทำกราฟ ทุก 0.25 วิ |
| end check | ทีมไหนตายหมด หรือหมดเวลา → ตัดสินที่เลือดรวม |

**เหตุผลที่แยก PASS 1 กับ PASS 2:** ถ้าตัดสินใจแล้วขยับทันทีทีละคน คนที่ถูกประมวลผลทีหลังจะได้เปรียบ
เพราะเห็นตำแหน่งใหม่ของคนอื่นแล้ว → ผลไฟต์จะเอนตามลำดับใน array ซึ่งไม่ยุติธรรม
**ถ้าจะเพิ่ม logic ใหม่ ต้องใส่ให้ถูก pass** ไม่งั้นจะเกิดความได้เปรียบเงียบๆ ที่หาสาเหตุยากมาก

### ไฟล์ในเอนจินแต่ละตัว

| ไฟล์ | หน้าที่ |
|---|---|
| [build-fight.js](src/engine/build-fight.js) | ประกอบ state เริ่มไฟต์ — ดูไฟล์นี้ถ้าอยากรู้ว่า unit มีฟิลด์อะไรบ้าง |
| [step.js](src/engine/step.js) | ลูปหลัก + `runFight()` |
| [stats.js](src/engine/stats.js) | `deriveStats()` — เลเวล+ไอเทม → ค่าจริง · `fullCd()` · `effStat()` |
| [ai.js](src/engine/ai.js) | `castSkills()` / `shouldCast()` — ตัดสินใจกดสกิลไหนตอนไหน |
| [targeting.js](src/engine/targeting.js) | เลือกเป้า, ประเมินภัยคุกคามที่พุ่งมา, หาจุดลง AOE ที่โดนเยอะสุด |
| [fire-skill.js](src/engine/fire-skill.js) | `switch (sk.type)` ยาวๆ — ผลของสกิลตอนกด |
| [damage.js](src/engine/damage.js) | `applyDamage()` — สูตรดาเมจทั้งหมด + ชีลด์ + ฮีล |
| [on-hit.js](src/engine/on-hit.js) | ทริกเกอร์ตอนออโต้/สกิลโดน |
| [motion.js](src/engine/motion.js) | dash, grab, snipe |
| [systems.js](src/engine/systems.js) | โซนบนพื้น + กลไกเฉพาะตัวละคร |
| [support.js](src/engine/support.js) · [mage.js](src/engine/mage.js) · [assassin.js](src/engine/assassin.js) · [lorla.js](src/engine/lorla.js) | พาสซีฟไอเทม/ตัวละครแยกตามสาย |
| [state-util.js](src/engine/state-util.js) | buff, log, ระยะทาง, centroid |
| [skill-ranks.js](src/engine/skill-ranks.js) | ลำดับอัพสกิล Q/W/E/R |
| [util.js](src/engine/util.js) | RNG, clamp, ระบบ XP/เลเวล |

### สูตรดาเมจ (อ่านจาก `applyDamage`)

```
res    = max(0, (magic ? mr×(1−mrPen%) : armor×(1−armorPen%)) − penFlat)
mit    = trueDmg ? 1 : 100 / (100 + res)          ← สูตรเดียวกับ LoL
dmg    = amount × mit × vulnerable × autoCut × hpAmp × giantSlayer × rampMultiplier
       → หักโล่ → เข้าเลือด
```

ถ้าเพิ่มค่าสถานะใหม่ให้ไอเทม ต้องแตะ **สองที่เสมอ**:

1. [engine/stats.js](src/engine/stats.js) `deriveStats()` — อ่านฟิลด์จากไอเทมมารวม
2. จุดที่ใช้จริง (มักเป็น [engine/damage.js](src/engine/damage.js))

> ⚠️ ใส่ฟิลด์ใหม่ใน `items.js` เฉยๆ **ไม่มีผลอะไรทั้งนั้น** เอนจินไม่รู้จักมัน — ไม่มี error ด้วย เงียบสนิท

### RNG — ทำไมไฟต์ถึง reproduce ได้

ทุกอย่างสุ่มผ่าน `mulberry32(seed)` ที่เป็น **seeded PRNG** ไม่ใช่ `Math.random()`

```js
const rng = mulberry32(hashStr("shared:" + seed));      // สุ่มระดับไฟต์
u.rng     = unitRng("aim/" + team + "/" + def.lane);    // สุ่มของตัวใครตัวมัน
```

แยก RNG ต่อ unit เพราะถ้าใช้ก้อนเดียวกัน การเพิ่ม/ลด logic ของตัวหนึ่ง จะทำให้ลำดับสุ่มของทุกตัวเลื่อน
→ เทสบาลานซ์เทียบก่อน/หลังไม่ได้เลย

> ⚠️ **ห้ามใช้ `Math.random()` ใน `engine/`** ใช้ `u.rng()` หรือ `state.rng()` เท่านั้น

### ค่าสถานะนักแข่ง 5 ตัว — ชื่อในโค้ด vs ชื่อในเกม

ตรงนี้สับสนง่ายมาก เพราะ **ชื่อไม่ตรงกัน**

| key ในโค้ด | ป้ายใน `STAT_TH` | มีผลกับอะไรจริงๆ | อ่านค่าที่ |
|---|---|---|---|
| `mechanics` | MECHANICS | ความแม่นตอนเล็ง (`miss`, lead target) + เวลาเงื้อ | `fire-skill.js` |
| `gameSense` | GAME SENSE | หลบสกิลที่พุ่งมา + ยืนถูกระยะ (`rangeBias`) | `targeting.js`, `build-fight.js` |
| `knowledge` | GAME KNOWLEDGE | เลือกเป้าถูกคน (ดูเลือด / `champ.value` / บาวน์ตี) | `targeting.js` |
| `decision` | DECISION MAKING | ไม่ทิ้งสกิลมั่ว, กล้าถือคูลดาวน์ใหญ่ไว้ (ตัวแปร `disc`) | `ai.js` |
| `teamwork` | TEAMWORK | โฟกัสเป้าเดียวกับเพื่อน | `targeting.js` |

> ⚠️ README เรียกค่าพวกนี้ด้วยชื่ออีกชุด (Precision / Reaction / Discipline / Positioning / Awareness)
> ซึ่งเรียงไม่ตรงกับ `STAT_TH` ใน [game/roster.js](src/game/roster.js) — **เชื่อสิ่งที่โค้ดอ่านจริง ไม่ใช่ป้าย**

ถ้าจะเพิ่มค่าสถานะใหม่ ต้องแก้ `STAT_KEYS` ใน `data/constants.js` + `emptyStats()` ใน `game/roster.js` + จุดที่อ่านค่าในเอนจิน

พาสซีฟซัพพอร์ต: ขณะที่ตัว SUPPORT ยังไม่ตาย เพื่อนได้ **+1 ทุกค่า** — อยู่ใน `effStat()` ไม่ได้บวกลง `athlete` จริง

---

## 8. `game/` — ชั้นกลาง

| ไฟล์ | หน้าที่ |
|---|---|
| [shop-ai.js](src/game/shop-ai.js) | สมองซื้อของของบอท |
| [roster.js](src/game/roster.js) | สุ่มนักแข่ง, ค่าคงที่ของแมตช์ (30 แต้ม, cap 10), `toDef()` |
| [report.js](src/game/report.js) | `summarizeFight()` — state ตอนจบ → ตัวเลขสรุป |
| [skill-desc.js](src/game/skill-desc.js) | ข้อมูลสกิลดิบ → ประโยคที่คนอ่านรู้เรื่อง |
| [streak.js](src/game/streak.js) | ภาษีชนะรวด / เงินชดเชยแพ้รวด |

### บอทซื้อของยังไง ([shop-ai.js](src/game/shop-ai.js))

คิดเป็นสองชั้น:

1. **ชั้นสาย** — `champProfile()` ดูว่าตัวนี้สเกล AP หรือ AD โดยรวม **สกิลทุกท่า** (ไม่ใช่ท่าเดียว)
   แล้วเลือกลำดับหมวดที่ควรซื้อจาก `ROLE_TASTE` / `LANE_TASTE`
2. **ชั้นแก้ทาง** — `readThreat(enemies)` อ่านว่าทีมตรงข้ามเป็นยังไง (AP เยอะ? ฮีลเยอะ? ตัวแทงค์?)
   แล้ว `counterScore()` ดันคะแนนไอเทมที่แก้ทางขึ้น

แล้ววนซื้อจนเต็ม 6 ช่องหรือเงินหมด — ถ้าของใหญ่ยังซื้อไม่ไหว จะเก็บชิ้นส่วนแพงสุดที่ซื้อไหวไปก่อน

> สำคัญ: บอทซื้อของ **ตั้งแต่ต้นยก** (`prepFoeForRound()` ใน `App.jsx`) ไม่ใช่ตอนกดเริ่มไฟต์
> เพื่อให้หน้า "ส่องทีมคู่แข่ง" แสดงของจริงที่กำลังจะเจอ

### ระบบรั้งคะแนน ([streak.js](src/game/streak.js))

- ชนะติดกัน 3 ยกขึ้นไป → โดน **หักรายได้** สูงสุด 30% (`WIN_TAX`) — XP โดนครึ่งเดียวของเงิน
- แพ้ติดกัน → ได้ **เงินชดเชย** นับสูงสุด 5 ยก

---

## 9. `screens/` กับ `ui/`

### `screens/` — หนึ่งไฟล์ หนึ่งหน้าจอ

ทุกไฟล์หน้าตาเหมือนกันหมด:

```js
export function PlanScreen(ctx) {
  const { startMatch, planIdx, team, setTeam, ... } = ctx;   // destructure จาก ctx
  return <Shell>...</Shell>;                                 // return JSX ตรงๆ
}
```

| ไฟล์ | หน้าจอ |
|---|---|
| [Menu.jsx](src/screens/Menu.jsx) | เมนูหลัก + เมนูเลือกโหมด |
| [Setup.jsx](src/screens/Setup.jsx) | แจกแต้มนักแข่ง 30 แต้ม |
| [Pick.jsx](src/screens/Pick.jsx) | เลือกตัวละคร + Character Info + ลำดับอัพสกิล |
| [Position.jsx](src/screens/Position.jsx) | จัดตำแหน่ง |
| [Plan.jsx](src/screens/Plan.jsx) | วางแผนสายไอเทม |
| [Shop.jsx](src/screens/Shop.jsx) | ร้านค้าประจำยก + อัพสกิล |
| [Fight.jsx](src/screens/Fight.jsx) | หน้าไฟต์ (canvas + HUD) |
| [Result.jsx](src/screens/Result.jsx) | สรุปหลังยก |
| [Store.jsx](src/screens/Store.jsx) · [ItemBook.jsx](src/screens/ItemBook.jsx) · [Setting.jsx](src/screens/Setting.jsx) | เมนูรอง |
| [Draft.jsx](src/screens/Draft.jsx) | **ไฟล์ตายแล้ว** — ลบทิ้งได้ (มีแค่คอมเมนต์) |

### `ui/` — ชิ้นส่วนที่ใช้ซ้ำ

| ไฟล์ | หน้าที่ |
|---|---|
| [theme.js](src/ui/theme.js) | สี `C.*`, ฟอนต์, `STAT_C` (สีประจำค่าสถานะ) |
| [kit.jsx](src/ui/kit.jsx) | `TwoPane`, `Tabs`, `TileGrid`, `Tile`, `Portrait` |
| [chrome.jsx](src/ui/chrome.jsx) | `Shell` (หัวจอ), `btn`, `card`, `mini` |
| [Arena.jsx](src/ui/Arena.jsx) + [draw-fx.js](src/ui/draw-fx.js) | canvas สนามรบ + เอฟเฟกต์ |
| [Stats.jsx](src/ui/Stats.jsx) | โมดัลกราฟสรุปไฟต์ |
| [Scout.jsx](src/ui/Scout.jsx) | โมดัลส่องทีมคู่แข่ง |
| [SkillInfo.jsx](src/ui/SkillInfo.jsx) | โมดัลข้อมูลสกิล |
| [ShopScreen.jsx](src/ui/ShopScreen.jsx) · [ItemPanel.jsx](src/ui/ItemPanel.jsx) · [recipe.jsx](src/ui/recipe.jsx) | ร้านค้า + สูตรคราฟต์ (ใช้ร่วมกับหน้า ITEM) |
| [Practice.jsx](src/ui/Practice.jsx) | ห้องซ้อม (component จริง) |

### เรื่องหน้าตา

- **ไม่มีไฟล์ CSS** ทุกอย่างเป็น inline style — สีเอาจาก `C` ใน `theme.js` เสมอ อย่า hardcode hex
- responsive ใช้ `ctx.wide` (จอ ≥ 820px) ที่ `App.jsx` คำนวณจาก resize listener
  หน้าที่เป็น "ตาราง + รายละเอียด" จอกว้างแสดงสองฝั่ง จอแคบสลับเป็นบน-ล่าง (ดู `TwoPane`)
- โมดัลข้อมูลสกิล (`SkillModal`) อยู่ชั้นบนสุดของ `App` เปิดได้จากทุกหน้าผ่าน `ctx.openSkill()`

---

## 10. ระบบภาษา

ข้อความในซอร์สเขียนเป็น **ภาษาไทย** แล้วห่อ `tr()`:

```js
import { tr } from "../i18n.js";
<div>{tr("เงินไม่พอ")}</div>
<div>{tr("เหลือ {0} แต้ม", n)}</div>      // มี placeholder ได้
```

ตอนแสดงผล `tr()` เปิดพจนานุกรม [i18n-en.js](src/i18n-en.js) — **key คือข้อความไทยเดิม**
หาไม่เจอ = คืนข้อความไทยกลับไป (หน้าจอไม่พัง แค่โผล่ไทยมาคำเดียว)

**เพิ่มข้อความใหม่:**

1. เขียนไทยแล้วห่อ `tr("...")`
2. เติมคู่แปลใน `i18n-en.js`

**ชื่อไอเทมไม่ต้องแปล** — เก็บเป็น `"English — ไทย"` อยู่แล้ว ใช้ `itemName(it)` มันเลือกข้างให้

> ⚠️ `setLang(lang)` ถูกเรียกตรงๆ ในตัว render ของ `App` (ไม่ใช่ใน effect) เพราะ `tr()` เป็น module-level state
> **ต้องตั้งภาษาก่อนหน้าจอลูกจะเรียก `tr()`** ถ้าย้ายไปใส่ใน `useEffect` ภาษาจะช้าไปหนึ่ง render

ภาษาที่เลือกถูกจำใน `localStorage` key `sideline.lang`

---

## 11. เทสกับวัดบาลานซ์

สคริปต์ `_*.mjs` ที่ root รันด้วย Node ตรงๆ **ไม่ต้อง build ก่อน** เพราะ import จาก `src/` ได้เลย

```bash
node _fuzz.mjs
```

| สคริปต์ | ทำอะไร |
|---|---|
| `_fuzz.mjs` | สุ่ม 300 ไฟต์ จับ NaN/Infinity, ไฟต์ที่ไม่ยอมจบ, uptime ของตัว melee |
| `_balance.mjs` | ตีราคาค่าสถานะของไอเทมเทียบราคาขาย → "คุ้มกี่ %" |
| `_power.mjs` | แจกไอเทมให้ทีมเดียวแล้ววัด % ชนะจริง |
| `_econ_test.mjs` | เช็คอัตราเงิน/XP ของแต่ละโหมด |
| `_mage_test.mjs`, `_assassin_test.mjs`, `_mage2.mjs` | เทสไอเทมแยกสาย |
| `_shop_test.mjs`, `_buy2.mjs` | เทสสมองซื้อของของบอท |
| `_report.mjs` | ตรวจว่าดาเมจทุกก้อนมีป้ายที่มาครบไหม |
| `_ui_test.mjs`, `_mm_ui.mjs`, `_shopui_test.mjs`, `_skillbtn_test.mjs` | เทส UI ด้วย Playwright |

> ⚠️ สคริปต์ที่ใช้ Playwright (`_ui_test.mjs` ฯลฯ) **hardcode พาธแบบ Linux ไว้**
> (`/opt/pw-browsers/chromium`, `file:///home/claude/sideline/sideline.html`)
> บน Windows ต้องแก้สองบรรทัดนั้นก่อน หรือใช้ `chromium.launch()` เฉยๆ ให้มันหาเบราว์เซอร์เอง
> สคริปต์ที่เป็น Node ล้วน (`_fuzz`, `_balance`, `_power`, ...) รันได้ทุก OS

การวัดบาลานซ์ถือว่าเชื่อได้เมื่อ:

- **คุ้ม%** — มีพาสซีฟ ~95-100% · ค่าสถานะล้วน ~105-110%
- **ชนะ%** — 50% คือไม่มีผล **เทียบข้ามสายไม่ได้** ใช้เทียบภายในสายเดียวเท่านั้น

ผลที่วิเคราะห์ไว้แล้วอยู่ใน [docs/balance.md](docs/balance.md)

---

## 12. ตารางค้นหา — อยากแก้อะไร ไปไฟล์ไหน

| อยากแก้ | ไปที่ |
|---|---|
| ตัวเลขสกิล / ค่าสถานะตัวละคร | [data/champions.js](src/data/champions.js) |
| ผลของสกิลตอนกด | [engine/fire-skill.js](src/engine/fire-skill.js) |
| ไอเทม / ราคา / สูตรคราฟต์ | [data/items.js](src/data/items.js) |
| ค่าสถานะใหม่ของไอเทม | [engine/stats.js](src/engine/stats.js) `deriveStats()` **+** จุดที่ใช้จริง **+** [ui/recipe.jsx](src/ui/recipe.jsx) `itemDesc()` |
| สูตรดาเมจ / เกราะ / โล่ / ฮีล | [engine/damage.js](src/engine/damage.js) |
| บอทเล่นโง่ (เลือกเป้า/กดสกิล) | [engine/ai.js](src/engine/ai.js), [engine/targeting.js](src/engine/targeting.js) |
| บอทซื้อของโง่ | [game/shop-ai.js](src/game/shop-ai.js) |
| ไฟต์ยืด/จบเร็วไป | `RAMP_FRAC`, `RAMP_SCALE` ใน [data/tuning.js](src/data/tuning.js) |
| จำนวนยก / อัตราเงิน / เพิ่มโหมด | [data/modes.js](src/data/modes.js) |
| พาสซีฟเลน | [data/lanes.js](src/data/lanes.js) (ข้อความ) **+** `App.jsx award()` หรือ `engine/stats.js` (ผลจริง) |
| หน้าตา UI ของหน้าไหน | `src/screens/<ชื่อหน้า>.jsx` |
| ชิ้นส่วน UI ที่ใช้ซ้ำ | [ui/kit.jsx](src/ui/kit.jsx) |
| เมนู / ลำดับหน้าจอ | [screens/Menu.jsx](src/screens/Menu.jsx) + `phase` ใน [App.jsx](src/App.jsx) |
| เพิ่ม state ใหม่ให้ทั้งเกม | [App.jsx](src/App.jsx) — **อย่าลืมใส่ใน `ctx`** |
| คำแปลอังกฤษ | [i18n-en.js](src/i18n-en.js) (key คือข้อความไทยเดิม) |
| สีธีม | [ui/theme.js](src/ui/theme.js) |
| ข้อมูลที่ส่องคู่แข่งได้ | [ui/Scout.jsx](src/ui/Scout.jsx) |
| หน้ากราฟ / เพิ่มสถิติใหม่ | [ui/Stats.jsx](src/ui/Stats.jsx) + [game/report.js](src/game/report.js) + [engine/damage.js](src/engine/damage.js) |
| ชื่อเกม / title | [index.template.html](index.template.html) + `OUT` ใน [build.mjs](build.mjs) |

---

## 13. วิธีทำงานที่เจอบ่อย (recipes)

### เพิ่มไอเทมใหม่

1. ใส่ออบเจกต์ใน `ITEMS` ใน [data/items.js](src/data/items.js) — ต้องมี `id` (ห้ามซ้ำ), `th` เป็น `"English — ไทย"`, `cat`, `tier`, `cost`
2. ถ้าเป็น Tier 3 ใส่ `parts: ["id ชิ้นส่วน", ...]` ให้ราคาชิ้นส่วนรวมน้อยกว่า `cost` (ส่วนต่างคือค่าคราฟต์)
3. ถ้ามันทำหน้าที่ทับของที่มีอยู่ ใส่ `uniq: ["ชื่อกลุ่ม"]`
4. **ถ้ามีฟิลด์ค่าสถานะที่เอนจินยังไม่รู้จัก** → เพิ่มการอ่านใน `deriveStats()` แล้วเขียนผลจริงในจุดที่เกี่ยว
5. เพิ่มคำอธิบายใน `itemDesc()` ใน [ui/recipe.jsx](src/ui/recipe.jsx) ไม่งั้นในร้านจะไม่มีบรรทัดบอกว่าทำอะไร
6. `node _balance.mjs` เช็คว่าราคาไม่เพี้ยน

### เพิ่มตัวละครใหม่

1. เพิ่ม key ใหม่ใน `CHAMPIONS` ใน [data/champions.js](src/data/champions.js) — ดู [docs/champion-template.md](docs/champion-template.md) เป็นแม่แบบ
2. ใส่ค่าฐาน + growth ให้ครบ (`hp/hpG`, `ad/adG`, `armor/armorG`, `mr/mrG`, `as/asG`, `ms`, `range`)
3. `skills` 4 ท่า — `type` ของแต่ละท่า **ต้องเป็น type ที่ `fire-skill.js` รู้จักแล้ว**
   ถ้าเป็นกลไกใหม่ ต้องเพิ่ม `case` ใน `switch` ของ `fireSkillEffect()` ด้วย
4. ถ้าสกิลใหม่ต้อง tick ทุกเฟรม (โซน, ฟอร์ม, สะสมชั้น) → เพิ่มใน [engine/systems.js](src/engine/systems.js)
5. เพิ่มเงื่อนไข "ควรกดตอนไหน" ของ type ใหม่ใน `shouldCast()` ใน [engine/ai.js](src/engine/ai.js)
6. `value` คือความสำคัญตอน AI เลือกเป้า — แครี่ ~1.2+, แทงค์ ~0.7
7. `node _fuzz.mjs` ดูว่าไม่มี NaN และไฟต์จบปกติ

### เพิ่มหน้าจอใหม่

1. สร้าง `src/screens/NewScreen.jsx` — export ฟังก์ชัน `NewScreen(ctx)` **ห้ามใส่ hook**
2. import ใน [App.jsx](src/App.jsx)
3. เพิ่มบรรทัดใน `screen` selector: `if (phase === "NEW") return NewScreen(ctx);`
4. ถ้าต้องการ state ใหม่ → ประกาศใน `App.jsx` แล้วใส่ใน `ctx`
5. ใส่ปุ่มพาไปหน้านั้น (`setPhase("NEW")`)

### เพิ่มสถิติใหม่ที่เก็บระหว่างไฟต์

1. ตั้งค่าเริ่มต้นใน `mk()` ของ [build-fight.js](src/engine/build-fight.js)
2. บวกค่าตอนเกิดเหตุ (มักใน [damage.js](src/engine/damage.js) หรือ [on-hit.js](src/engine/on-hit.js))
3. ใส่ในฟังก์ชัน `row()` ของ [game/report.js](src/game/report.js)
4. แสดงผลใน [ui/Stats.jsx](src/ui/Stats.jsx)

---

## 14. กับดักที่เจอซ้ำแล้วซ้ำอีก

รวมไว้ที่เดียวเพราะทุกข้อในนี้เคยทำให้เสียเวลาหาสาเหตุมาแล้ว

### 🔴 ใส่ hook ใน `screens/*.jsx`

พังทันที เพราะไฟล์พวกนี้ถูกเรียกเป็นฟังก์ชันธรรมดา จำนวน hook จะเปลี่ยนตามหน้าจอ → ประกาศใน `App.jsx` แทน

### 🔴 เพิ่ม state แล้วลืมใส่ใน `ctx`

หน้าจอจะได้ `undefined` เงียบๆ ไม่มี error

### 🔴 เติมบัฟทุกเฟรม

บัฟมีอายุ ถ้าเติมทุกเฟรมโดยไม่เช็ค จะซ้อนกันเป็นร้อยชั้น
ใช้ `addBuffUnique(u, tag, b, now)` (ต่ออายุอันเดิม) แทน `addBuff()` (ซ้อนเพิ่ม) สำหรับออร่า

### 🔴 ใช้ `Math.random()` ในเอนจิน

ทำให้ไฟต์ reproduce ไม่ได้ → เทสบาลานซ์เชื่อไม่ได้ ใช้ `u.rng()` / `state.rng()`

### 🔴 ใส่ฟิลด์ใหม่ใน `items.js` แล้วคิดว่ามันจะทำงาน

เอนจินไม่รู้จักฟิลด์ที่ไม่ได้อ่าน — **ไม่มี error ไม่มี warning** ต้องเพิ่มใน `deriveStats()` ก่อนเสมอ

### 🔴 ทำดาเมจแบบหน่วงเวลาแล้วไม่ใส่ `src`

ดาเมจจะไปกองอยู่ช่อง "อื่นๆ" ในหน้ากราฟ
`fireSkill()` ติดป้าย `src` ให้อัตโนมัติสำหรับของที่ push ระหว่างที่มันทำงาน
แต่ถ้าปล่อยออกทีหลัง (tick ในเฟรมถัดๆ ไป) ต้องใส่ `src` เอง

### 🔴 ใส่ logic ผิด pass ใน `step()`

เขียน logic ที่ขยับตำแหน่งไว้ใน PASS 1 → ตัวที่อยู่ท้าย array ได้เปรียบ หาสาเหตุยากมาก

### 🔴 `setState` ทุกเฟรมระหว่างไฟต์

เกมกระตุก — HUD ตั้งใจให้อัพแค่ ~7 ครั้ง/วินาที

### 🟡 แก้ `sideline.html` โดยตรง

มันคือไฟล์ที่ build แล้ว — `npm run build` ทีเดียวหายหมด แก้ใน `src/` เท่านั้น

### 🟡 แก้ข้อความ passive ใน `lanes.js` แล้วคิดว่าผลเปลี่ยน

เป็นข้อความอย่างเดียว ผลจริงอยู่คนละที่

---

## 15. หนี้ทางเทคนิคที่รู้อยู่แล้ว

บันทึกไว้ให้รู้ว่า "อันนี้ตั้งใจ" กับ "อันนี้ยังไม่ได้ทำ" ต่างกันตรงไหน

| เรื่อง | สถานะ |
|---|---|
| `index.template.html` มี `<div id="root">` **ซ้ำสองอัน** | บั๊กเล็กๆ ไม่มีผล (React ใช้อันแรก) แต่ควรลบอันที่สอง |
| `shouldCast()` ใน `ai.js` มีบล็อกเงื่อนไข type ซ้ำกันสองชุด | ชุดในบล็อก `if (sk.ult)` กับชุดนอกบล็อก — ซ้ำจริง ยังทำงานถูก แต่ควร refactor |
| `STYLES.beats` ประกาศไว้แต่ไม่มีใครอ่าน | rock-paper-scissors ยังไม่ได้ implement ตรงๆ |
| `screens/Draft.jsx` เป็นไฟล์ตาย | ลบได้เลย |
| `docs/legacy-unused-screen.txt` | โค้ดหน้าจอเก่าที่ไม่ใช้แล้ว เก็บไว้อ้างอิง |
| ไม่มี test runner จริง (ไม่มี vitest/jest) | ใช้ `_*.mjs` ที่รันแล้วอ่าน output เอง |
| Playwright hardcode พาธ Linux | รันบน Windows ไม่ได้ถ้าไม่แก้ |
| `WINS_NEEDED` / `MAX_ROUNDS` ใน `roster.js` เป็นค่าสำรอง | ค่าจริงอยู่ใน `data/modes.js` อย่าไปแก้ผิดที่ |
| ชื่อค่าสถานะนักแข่งใน README / `STAT_TH` / key ในโค้ด ไม่ตรงกัน | ควรรวมให้เป็นชุดเดียว |
| RANK / TOURNAMENT ในเมนู | ยังไม่ได้ทำ |
| CHARACTER STORE มีราคา | ยังไม่มีระบบเงินจริง ทุกตัวเล่นได้ฟรี |

---

## 16. เช็คลิสต์ก่อนส่งงาน

```bash
npx eslint src && node _fuzz.mjs && npm run build
```

- [ ] `npx eslint src` ผ่าน (ไม่มี `no-undef`)
- [ ] `node _fuzz.mjs` — ไม่มี NaN/Infinity, ไม่มีไฟต์ที่ไม่ยอมจบ
- [ ] ถ้าแตะไอเทม → `node _balance.mjs` ดูว่าคุ้ม% ยังอยู่ในเกณฑ์
- [ ] ถ้าแตะบาลานซ์ → `node _power.mjs` ดู % ชนะ
- [ ] `npm run build` แล้วเปิด `sideline.html` เล่นจริงหนึ่งยกเต็ม
- [ ] ข้อความใหม่ทุกอันห่อ `tr()` และมีคู่แปลใน `i18n-en.js`
- [ ] เพิ่ม state ใหม่แล้วใส่ใน `ctx` ครบ
- [ ] สลับ EN/TH ดูว่าไม่มีข้อความไทยโผล่ตอนเป็นอังกฤษ
- [ ] ย่อหน้าต่างให้แคบกว่า 820px ดูว่า layout ไม่พัง
