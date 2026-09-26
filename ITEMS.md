# ไอเทมทั้งหมด

**146 ชิ้น** · Tier 3 มี 78 ชิ้น

> ไฟล์นี้สร้างอัตโนมัติจาก `src/data/items.js` ด้วยคำสั่ง `node _itemdoc.mjs`  
> คำอธิบายใช้ชุดเดียวกับที่โชว์ในร้านค้าในเกม ตัวเลขจึงตรงกับที่เอนจินใช้จริงเสมอ

## วิธีอ่าน

- **ความคุ้ม** = มูลค่าค่าสถานะที่ได้ หารด้วยราคาที่จ่าย · **100% คือคุ้มพอดี**
  ราคาต่อหน่วยอ้างอิงจากชิ้นส่วน Tier 1 ที่ให้ค่านั้นล้วนๆ (เช่น 7g ต่อ 10 AD)
- ของที่ขึ้น **`พาสซีฟเขียนมือ`** ตีราคาแบบนี้ไม่ได้ เพราะพลังจริงไม่ได้อยู่ในค่าสถานะ — ช่องความคุ้มจะเว้นไว้
- ของที่ขึ้น **⚠️ ไม่ได้ตีราคา** คือมีฟิลด์ที่ให้พลังจริงแต่ตารางราคาไม่รู้จัก
  **ความคุ้มของพวกนี้ต่ำกว่าความจริง** อย่าเอาไปตัดสินว่าของอ่อน

เทียบความคุ้มด้วย `node _balance.mjs` · วัดพลังจริงในสนามด้วย `node _itemwr.mjs`

## ความคุ้มเฉลี่ยรายสาย (Tier 3)

| สาย | ความคุ้มเฉลี่ย | จำนวนชิ้น | ราคาเฉลี่ย |
|---|---:|---:|---:|
| TANK | 96% | 4 | 55g |
| FIGHTER | 104% | 1 | 64g |
| ASSASSIN | 78% | 11 | 61g |
| MAGE | 82% | 17 | 61g |
| MARKSMAN | 105% | 5 | 59g |
| SUPPORT | 105% | 1 | 48g |

## ⚠️ ของที่ตารางราคาอ่านไม่ครบ

ของพวกนี้มีฟิลด์ที่ให้พลังจริงแต่ไม่มีราคาในตาราง **ความคุ้มที่โชว์จึงต่ำกว่าความจริง**
ถ้าจะปรับบาลานซ์ด้วยตัวเลขความคุ้ม ต้องระวังของกลุ่มนี้เป็นพิเศษ

| ไอเทม | สาย | ราคา | ความคุ้มที่โชว์ | ฟิลด์ที่ไม่ได้ตีราคา |
|---|---|---:|---:|---|
| Oath of the Dioscuri `ood` | SUPPORT | 48g | — | `lifeBondShare` |
| Merlin's Starbolt Staff `mrt` | MAGE | 60g | 63% | `meteor` |
| Surtr's Twilight Cinder `stc` | MAGE | 62g | 65% | `burnPctHp` |
| Fang of the Midgard Serpent `fms` | ASSASSIN | 58g | 66% | `shieldBreak` |
| Nemesis' Vengeful Scales `nvs` | MAGE | 64g | 70% | `antihealOnDmg` `storedBurst` |
| Jabberwock's Vorpal Blade `jvb` | ASSASSIN | 60g | 70% | `executeHit` |
| Raijin's Thunder Drum `rsd` | MAGE | 62g | 73% | `chainBolt` |
| Anubis' Death Mark `adm` | ASSASSIN | 62g | 73% | `deathMark` `antihealOnDmg` |
| Yuki-onna's Frozen Scepter `yfs` | MAGE | 60g | 74% | `spellSlow` |
| Kitsune's Foxfire Fan `kff` | MAGE | 60g | 75% | `apOnHit` |
| Caliburn's Spellblade `csb` | MAGE | 60g | 78% | `spellblade` |
| Baba Yaga's Iron Cauldron `byc` | TANK | 58g | 85% | `antihealOnDmg` |
| Hel's Nether Domain `hnd` | MAGE | 62g | 94% | `ultZone` |
| Fafnir's Devouring Maw `fdm` | MARKSMAN | 63g | 99% | `curHpOnHit` `maulBurst` |
| Mímir's Whispering Well `mww` | TANK | 58g | 100% | `magicPulse` |
| Amrita's Nectar Goblet `ang` | MAGE | 60g | 104% | `takedownHeal` |
| The Legendary Excalibur `lex` | FIGHTER | 64g | 104% | `firstHitShield` |
| Morgana's Unravelling Thread `mut` | MAGE | 60g | 104% | `mrShredStack` |
| Cuirass of the Bleeding Centaur `cbc` | FIGHTER | 62g | — | `antihealOnDmg` |
| Shiva's Trishula `sst` | MARKSMAN | 60g | — | `antihealOnDmg` |

## Tier 3 เรียงตามความคุ้ม

| # | ไอเทม | สาย | ราคา | ความคุ้ม | ค่าสถานะ |
|---:|---|---|---:|---:|---|
| 1 | William Tell's Sovereign Crossbow `wtc` | MARKSMAN | 60g | **135%** | +55 AD · +25% โอกาสคริ · เจาะเกราะ 25% · ออโต้ครั้งแรกที่ลงศัตรูแต่ละตัวในไฟต์ พ่วงดาเมจจริงอีก 50% AD |
| 2 | Mordred's Usurping Blade `mub` | ASSASSIN/FIGHTER | 62g | **111%** | +45 AD · +15 Ability Haste · เจาะเกราะ 25% · เก็บศพหรือช่วยเก็บ ตัดคูลดาวน์อัลติที่เหลือทิ้ง 25% ของคูลดาวน์เต็ม |
| 3 | Sleeping Beauty's Spindle `sbs` | MAGE/ASSASSIN | 62g | **108%** | +85 AP · +45 เกราะ · +15 Ability Haste · เลือดต่ำกว่า 30% เข้าสภาวะแช่แข็ง แตะไม่ได้และไม่กินดาเมจ 2 วิ (ทุก 45 วิ) |
| 4 | Atalanta's Swift Quiver `atq` | MARKSMAN | 58g | **106%** | +45 AD · +20% ความเร็วโจมตี · +25% โอกาสคริ · ออโต้ครั้งแรกของการเข้าปะทะ ได้ความเร็วเดิน +35% แล้วค่อยๆ จางใน 2.5 วิ (ทุก 15 วิ) |
| 5 | Eye of Horus `eoh` | MAGE | 58g | **105%** | +60 AP · +10 Ability Haste · เจาะต้านเวท 30% · สกิลเวทที่โดนแชมเปี้ยนจะเปิดตำแหน่งเป้า 2 วิ — คนล่องหนอยู่จะถูกเผยตัวทันที |
| 6 | Ariadne's Guiding Thread `agt` | SUPPORT/MAGE | 48g | **105%** | +35 AP · +250 HP · +15 Ability Haste · ฮีล/โล่ที่จ่ายให้เพื่อน +10% · ตีศัตรูที่ติดสโลว์หรือ CC อยู่ จะแปะตรานาน 4 วิ · ดาเมจครั้งถัดไปจากทีมเราแรงขึ้น 15% หนึ่งครั้ง (ทุก 8 วิ ต่อเป้า) |
| 7 | Amrita's Nectar Goblet `ang` | MAGE/SUPPORT | 60g | **104%** ⚠️ | +60 AP · +200 HP · +10 Ability Haste · เจาะต้านเวท 20% · สังหารหรือช่วยสังหารครั้งแรกของไฟต์ ฮีลทั้งทีม 100 + 35% AP |
| 8 | The Legendary Excalibur `lex` | FIGHTER/ASSASSIN/TANK | 64g | **104%** ⚠️ | +55 AD · +250 HP · +15 Ability Haste · ดาเมจก้อนแรกที่ลงแชมเปี้ยนศัตรู ได้โล่ 120 (+100% Bonus AD) นาน 3.5 วิ และวิ่งเร็วขึ้น 10% ขณะมีโล่ (ทุก 15 วิ) |
| 9 | Morgana's Unravelling Thread `mut` | MAGE | 60g | **104%** ⚠️ | +85 AP · +250 HP · +15 Ability Haste · ดาเมจเวทใส่แชมเปี้ยนลดต้านเวทเป้า 5% นาน 4 วิ ซ้อนได้ 6 ชั้น (รวม 30%) |
| 10 | Argus' Hundred Eyes `ahe` | TANK/SUPPORT | 58g | **102%** | +400 HP · +35 เกราะ · +35 ต้านเวท · +10 Ability Haste · แชมเปี้ยนศัตรูแต่ละตัวในระยะ 650 ให้ +8 เกราะ และ +8 ต้านเวท (สูงสุด 5 ตัว) |
| 11 | Odysseus' Unstrung Bow `oub` | MARKSMAN | 60g | **101%** | +40 AD · +25% ความเร็วโจมตี · +25% โอกาสคริ · เก็บศพหรือช่วยเก็บ ได้ระยะโจมตี +100 และความเร็วเดิน +8% นาน 6 วิ |
| 12 | Mímir's Whispering Well `mww` | TANK/MAGE/SUPPORT | 58g | **100%** ⚠️ | +450 HP · +60 ต้านเวท · +10 Ability Haste · ทุก 1 วิ ปล่อยคลื่นเวท 25 (+1.5% Bonus HP) รอบตัวในระยะ 400 · ศัตรูที่โดนกินดาเมจเวทจากทุกแหล่งแรงขึ้น 12% นาน 3 วิ |
| 13 | Fafnir's Devouring Maw `fdm` | MARKSMAN/FIGHTER/ASSASSIN | 63g | **99%** ⚠️ | +50 AD · +25% ความเร็วโจมตี · +10% ดูดเลือด · ออโต้ทำดาเมจกายภาพเพิ่ม 8% (ประชิด) หรือ 5% (ระยะไกล) ของเลือดปัจจุบันเป้า · ตีเป้าเดิมครบ 3 ครั้ง ระเบิด 5% Max HP และขโมยความเร็วเดิน 20% นาน 2 วิ (ทุก 20 วิ ต่อเป้า) |
| 14 | Heimdall's Warding Horn `hwg` | TANK/SUPPORT | 45g | **98%** | +300 HP · +35 เกราะ · +35 ต้านเวท · +15 Ability Haste เฉพาะท่าไม้ตาย · กดอัลติแล้วปล่อยเขตรัศมี 450 นาน 3 วิ ศัตรูในเขตติดสโลว์ 45% (ทุก 30 วิ) |
| 15 | Zephyrus' Gale Cloak `zgc` | MAGE | 60g | **97%** | +50 AP · +200 HP · +20 Ability Haste · +5% ความเร็วเดิน · ร่ายสกิลแล้วเร็วขึ้น 20% นาน 3 วิ · ทำดาเมจเวทแล้วได้ความเร็วเดิน +20% นาน 2 วิ (ไม่มีคูลดาวน์) |
| 16 | Thoth's Emerald Tablet `tet` | MAGE | 65g | **94%** | +85 AP · +30% AP · ทุก 100 AP ที่มี แถมเจาะต้านเวทให้อีก 3 (คิดหลังคูณ AP% ของตัวมันเอง) |
| 17 | Hel's Nether Domain `hnd` | MAGE/SUPPORT | 62g | **94%** ⚠️ | +60 AP · +250 HP · +10 Ability Haste · ลดคูลดาวน์ท่าไม้ตาย 20% · ท่าไม้ตายทิ้งเขตไว้ รัศมี 600 นาน 4 วิ ทำดาเมจ 10 + 5% AP ต่อวินาที และลดต้านเวทเป้า 15% · ร่ายท่าไม้ตายแล้วเปิดวงน้ำแข็ง 450 หน่วย นาน 4 วิ เผา 20 (+10% AP) ต่อวินาที และลดต้านเวทศัตรูในวง 15% |
| 18 | Hecate's Triple Crescent `htc` | ASSASSIN | 62g | **86%** | +55 AD · +15 Ability Haste · +15 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · ตีหรือใช้สกิลใส่เป้าเดิมครบ 3 ฮิตใน 2 วิ ระเบิด True Damage 8% Max HP (ต่อตัว ทุก 8 วิ) |
| 19 | Skadi's Triple Arrow `sta` | MARKSMAN | 56g | **86%** | +35% ความเร็วโจมตี · +25% โอกาสคริ · +7% ความเร็วเดิน · ออโต้ยิงลูกเสริมใส่ศัตรูข้างเคียงอีก 2 ตัวในระยะ 500 ตัวละ 40% Total AD |
| 20 | Baba Yaga's Iron Cauldron `byc` | TANK/FIGHTER | 58g | **85%** ⚠️ | +400 HP · +45 เกราะ · +10 Ability Haste · ทำดาเมจใส่ใคร ตัดฮีลของเป้า 40% นาน 3 วิ |
| 21 | Carnwennan's Shadowblade `cns` | ASSASSIN | 60g | **81%** | +55 AD · +10 Ability Haste · +15 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · จบการพุ่ง ออโต้ครั้งถัดไปแถมดาเมจกายภาพ 80 (+50% Bonus AD) (ทุก 6 วิ) |
| 22 | Lilith's Sanguine Grimoire `lbg` | MAGE/ASSASSIN | 62g | **79%** | +70 AP · +250 HP · +5% ดูดเลือด · เลือดเหลือ 50% หรือน้อยกว่า ได้ดูดเลือดเพิ่มอีก 10% (รวมเป็น 15%) |
| 23 | Caliburn's Spellblade `csb` | MAGE/ASSASSIN | 60g | **78%** ⚠️ | +60 AP · +15 Ability Haste · +5% ความเร็วเดิน · หลังร่ายสกิล ออโต้ครั้งถัดไปแถมดาเมจเวท 75% Base AD + 45% AP (ทุก 1.5 วิ) |
| 24 | Thanatos' Reaping Scythe `trs` | ASSASSIN | 64g | **78%** | +50 AD · +15 Ability Haste · +15 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · สังหารหรือช่วยสังหาร รีเซ็ตคูลดาวน์ Q W E ทันที (ครั้งแรกครั้งเดียวต่อยก) |
| 25 | Freyja's Shroud of Defiance `fsd` | ASSASSIN | 64g | **78%** | +50 AD · +15 Ability Haste · +10 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · โดนดาเมจที่จะตาย เลือดล็อกที่ 1 แล้วอมตะ 2 วิ (ครั้งเดียวต่อยก) |
| 26 | Kitsune's Foxfire Fan `kff` | MAGE/MARKSMAN | 60g | **75%** ⚠️ | +50 AP · +30% ความเร็วโจมตี · +10 Ability Haste · ออโต้แถมดาเมจเวท 8 (+12% AP) ทุกครั้งที่ตีโดน |
| 27 | Sekhmet's Massacre Claws `smc` | ASSASSIN/FIGHTER | 62g | **75%** | +60 AD · +20 ความเร็วเดิน · +20 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · 10 วินาทีแรกของไฟต์ ได้เจาะเกราะเพิ่ม +15 |
| 28 | Yuki-onna's Frozen Scepter `yfs` | MAGE/SUPPORT | 60g | **74%** ⚠️ | +65 AP · +350 HP · สกิลที่โดนศัตรู สโลว์ 30% นาน 2 วิ |
| 29 | Raijin's Thunder Drum `rsd` | MAGE | 62g | **73%** ⚠️ | +75 AP · +15 Ability Haste · +20 เจาะต้านเวท (ลบต้านเวทเป้าก่อนคิดดาเมจเวท) · สายฟ้ากระโดด 3 ต่อ ระยะ 500 — ตัวแรก 80 + 25% AP · ตัวถัดไป 40 + 15% AP (คูลดาวน์ 10 วิ) · สกิลเวทถัดไปแรงขึ้น 80 (+25% AP) และชิ่งไปหาศัตรูข้างเคียง 3 ตัว 40 (+15% AP) (ทุก 12 วิ) |
| 30 | Anubis' Death Mark `adm` | ASSASSIN | 62g | **73%** ⚠️ | +50 AD · +10 Ability Haste · +15 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · ทำดาเมจใส่ใคร ตัดฮีลของเป้า 40% นาน 3 วิ · ขว้างมีดใส่ศัตรูที่ใกล้ที่สุด สโลว์ 40% นาน 2 วิ และเป้ารับดาเมจจากเราแรงขึ้น 15% นาน 4 วิ (ทุก 35 วิ) |
| 31 | Seven-League Shadowstriders `sls` | ASSASSIN | 60g | **72%** | +50 AD · +35 ความเร็วเดิน · +15 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · เข้าปะทะแล้วได้ความเร็วเดิน +40% นาน 3 วิ (ทุก 15 วิ) · สังหารศัตรูได้ คูลดาวน์พร้อมใช้ทันที |
| 32 | Nemesis' Vengeful Scales `nvs` | MAGE/SUPPORT | 64g | **70%** ⚠️ | +75 AP · +15 Ability Haste · +20 เจาะต้านเวท (ลบต้านเวทเป้าก่อนคิดดาเมจเวท) · ทำดาเมจใส่ใคร ตัดฮีลของเป้า 40% นาน 3 วิ · แปะมาร์กเป้า 2.5 วิ ครบเวลาระเบิดซ้ำ 100 (+20% ดาเมจเวทที่สะสมไว้) (ทุก 25 วิ) |
| 33 | Jabberwock's Vorpal Blade `jvb` | ASSASSIN/FIGHTER | 60g | **70%** ⚠️ | +60 AD · +15 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · ตีใส่ศัตรูที่เลือดต่ำกว่า 50% แถมดาเมจกายภาพ 100 (+40% Bonus AD) (ต่อตัว ทุก 6 วิ) |
| 34 | Jack's Giantbane Harp `jbg` | MAGE | 60g | **68%** | +65 AP · +15 Ability Haste · ตีศัตรูที่เลือดมากกว่า 50% ของ Max HP แรงขึ้น 15% ทุกชนิด |
| 35 | Fang of the Midgard Serpent `fms` | ASSASSIN/FIGHTER | 58g | **66%** ⚠️ | +55 AD · +20 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · ดาเมจกินหลอดโล่แรงขึ้น 50% และเป้าที่โดนรับโล่ใหม่ได้น้อยลง 40% นาน 3 วิ |
| 36 | Surtr's Twilight Cinder `stc` | MAGE | 62g | **65%** ⚠️ | +60 AP · +300 HP · ดาเมจเวทจุดไฟเผาเป้า 2% Max HP ต่อวินาที นาน 3 วิ |
| 37 | Wendigo's Voracious Claw `wvc` | ASSASSIN/FIGHTER | 60g | **64%** | +55 AD · +15 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · ศัตรูคนแรกของไฟต์ที่เลือดเหลือต่ำกว่า 20% ของ Max HP จะโดนประหารทันที และได้เงินกระเป๋าแยกเพิ่ม 2 |
| 38 | Merlin's Starbolt Staff `mrt` | MAGE | 60g | **63%** ⚠️ | +70 AP · +10 Ability Haste · +15 เจาะต้านเวท (ลบต้านเวทเป้าก่อนคิดดาเมจเวท) · ยิงดาวตกใส่ศัตรูในระยะ 1200 ระเบิดรัศมี 200 หน่วย ดาเมจเวท 120 (+40% AP) (ทุก 25 วิ) |
| 39 | Norns' Thread of Weaving `ntw` | MAGE/SUPPORT | 60g | **51%** | +50 AP · +200 HP · +20 Ability Haste เฉพาะท่าไม้ตาย · ร่ายท่าไม้ตายแล้วได้ความเร็วเดิน +30% และ AP +20% นาน 4 วิ |

## รายชิ้นแยกตามหมวด

### ของเริ่มเกม (START) — 6 ชิ้น

| ไอเทม | ราคา | ความคุ้ม | ค่าสถานะและพาสซีฟ | สร้างจาก |
|---|---:|---:|---|---|
| **Chaos Blade** `cb`<br>ดาบอลวน | 10g | `พาสซีฟเขียนมือ` | +20 AD · +70 HP · +3% ดูดเลือด | — |
| **Chaos Scroll** `cs`<br>คัมภีร์อลวน | 10g | `พาสซีฟเขียนมือ` | +30 AP · +60 HP · +5 Ability Haste | — |
| **Chaos Shield** `csh`<br>โล่อลวน | 10g | `พาสซีฟเขียนมือ` | +140 HP · +10 เกราะ · +10 ต้านเวท | — |
| **Chaos Bow** `cbw`<br>คันศรอลวน | 10g | `พาสซีฟเขียนมือ` | +15 AD · +10% ความเร็วโจมตี · +2% ดูดเลือด | — |
| **Chaos Dagger** `cd`<br>กริชอลวน | 10g | `พาสซีฟเขียนมือ` | +20 AD · +10 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) | — |
| **Chaos Chalice** `cch`<br>จอกอลวน | 10g | 210% | +50 HP · +10 Ability Haste · ฮีล/โล่ที่จ่ายให้เพื่อน +10% | — |

### ชิ้นส่วน Tier 1 (T1) — 15 ชิ้น

| ไอเทม | ราคา | ความคุ้ม | ค่าสถานะและพาสซีฟ | สร้างจาก |
|---|---:|---:|---|---|
| **Straw Sandals** `ss`<br>รองเท้าฟาง | 6g | 100% | +25 ความเร็วเดิน | — |
| **Boar Tusk** `bt2`<br>เขี้ยวหมูป่า | 7g | 100% | +10 AD | — |
| **Willow Twig** `wt`<br>กิ่งหลิว | 6g | 100% | +15 AP | — |
| **Nymph's Dewdrop** `nd`<br>หยาดน้ำค้างนิมฟ์ | 8g | 100% | +150 HP | — |
| **Boiled Cuirass** `bc`<br>เกราะต้ม | 6g | 100% | +15 เกราะ | — |
| **Braided Clover** `bcl`<br>โคลเวอร์ถัก | 6g | 100% | +15 ต้านเวท | — |
| **Crow Feather** `cf`<br>ขนกา | 5g | 100% | +10% ความเร็วโจมตี | — |
| **Broken Sundial** `bsd`<br>นาฬิกาแดดแตก | 5g | 100% | +5 Ability Haste | — |
| **Robin's Fletching** `rf`<br>ขนศรโรบินฮู้ด | 8g | 100% | +10% โอกาสคริ | — |
| **Siren's Lure** `sil`<br>เหยื่อล่อไซเรน | 6g | 100% | +4% ดูดเลือด | — |
| **Fenrir's Torn Fang** `ftf`<br>เขี้ยวหักเฟนริร์ | 6g | 0% | +5 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) | — |
| **Icarus' Wax Feather** `iwf`<br>ขนนกขี้ผึ้งอิคารัส | 6g | 100% | +4% ความเร็วเดิน | — |
| **Ambrosia Crumb** `abc`<br>เศษน้ำอมฤต | 5g | 100% | ฮีล/เกราะ/ดูดเลือดที่ได้รับ +8% | — |
| **Dwarf's Whetstone** `dwh`<br>หินลับคมคนแคระ | 6g | 100% | ดาเมจคริแรงขึ้น 10% (รวมเป็น 185%) | — |
| **Panacea's Dried Petal** `pcp`<br>กลีบดอกไม้แห้งแพนาเซีย | 5g | 100% | ฮีล/โล่ที่จ่ายให้เพื่อน +6% | — |

### ชิ้นส่วน Tier 2 (T2) — 40 ชิ้น

| ไอเทม | ราคา | ความคุ้ม | ค่าสถานะและพาสซีฟ | สร้างจาก |
|---|---:|---:|---|---|
| **Chainmail of the Nemean** `cn`<br>เกราะขนสิงโต | 14g | 114% | +40 เกราะ | Boiled Cuirass (6g) + Boiled Cuirass (6g) |
| **Veil of the Silver Bough** `vsb`<br>กิ่งไม้เงิน | 14g | 114% | +40 ต้านเวท | Braided Clover (6g) + Braided Clover (6g) |
| **Giant's Heartstone** `ghs`<br>หัวใจศิลายักษ์ | 19g | 112% | +400 HP | Nymph's Dewdrop (8g) + Nymph's Dewdrop (8g) |
| **Golem's Plated Rib** `gpr`<br>ซี่โครงโกเลม | 16g | 129% | +200 HP · +25 เกราะ | Nymph's Dewdrop (8g) + Boiled Cuirass (6g) |
| **Red Riding Cloak** `rrc`<br>ผ้าคลุมหมวกแดง | 16g | 129% | +200 HP · +25 ต้านเวท | Nymph's Dewdrop (8g) + Braided Clover (6g) |
| **Gargoyle's Bastion** `gb`<br>ป้อมการ์กอยล์ | 15g | 107% | +20 เกราะ · +20 ต้านเวท | Boiled Cuirass (6g) + Braided Clover (6g) |
| **Pendulum of Neverland** `pon`<br>ลูกตุ้มเนเวอร์แลนด์ | 15g | 138% | +200 HP · +10 Ability Haste | Broken Sundial (5g) + Nymph's Dewdrop (8g) |
| **Clockwork Carapace** `cwc`<br>กระดองจักรกล | 14g | 129% | +20 เกราะ · +10 Ability Haste | Broken Sundial (5g) + Boiled Cuirass (6g) |
| **Cauldron Churner** `cc`<br>ไม้พายหม้อเวท | 15g | 137% | +15 AD · +10 Ability Haste | Broken Sundial (5g) + Boar Tusk (7g) |
| **Pied Piper's Fife** `ppf`<br>ขลุ่ยจับหนู | 14g | 143% | +25 AP · +10 Ability Haste | Broken Sundial (5g) + Willow Twig (6g) |
| **Woodcutter's Hewing Axe** `wha`<br>ขวานคนตัดไม้ | 16g | 116% | +15 AD · +150 HP | Boar Tusk (7g) + Nymph's Dewdrop (8g) |
| **Durandal's Whetted Edge** `dwe`<br>คมดาบดูรันดัล | 16g | 109% | +25 AD | Boar Tusk (7g) + Boar Tusk (7g) |
| **Hiawatha's Tomahawk** `hwt`<br>ขวานซัดไฮอาวาธา | 13g | 112% | +10 AD · +15% ความเร็วโจมตี | Boar Tusk (7g) + Crow Feather (5g) |
| **Valkyrie's Twin Plumes** `vtp`<br>ขนนกวัลคิรี | 12g | 104% | +25% ความเร็วโจมตี | Crow Feather (5g) + Crow Feather (5g) |
| **Gilgamesh's Vambrace** `gva`<br>สนับแข้งกิลกาเมช | 15g | 113% | +10 AD · +25 เกราะ | Boar Tusk (7g) + Boiled Cuirass (6g) |
| **Rowan Wand Dagger** `rwd`<br>กริชไม้โรวัน | 15g | 113% | +10 AD · +25 ต้านเวท | Boar Tusk (7g) + Braided Clover (6g) |
| **Huntsman's Skinning Dirk** `hsd`<br>มีดถลกหนังนายพราน | 15g | 93% | +20 AD · +10 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) | Boar Tusk (7g) + Boar Tusk (7g) |
| **Puck's Shadow Cloak** `psc`<br>ผ้าคลุมเงาของพัค | 15g | 79% | +10 AD · +20 ความเร็วเดิน · +5 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) | Boar Tusk (7g) + Straw Sandals (6g) |
| **Loki's Mistletoe Dagger** `lmd`<br>กริชมิสเซิลโทโลคิ | 14g | 146% | +15 AD · +10 Ability Haste | Boar Tusk (7g) + Broken Sundial (5g) |
| **Circe's Yew Wand** `cyw`<br>ไม้กายสิทธิ์เซอร์ซี | 15g | 93% | +35 AP | Willow Twig (6g) + Willow Twig (6g) |
| **Orpheus' Resonant Lyre** `orl`<br>พิณก้องกังวานออร์เฟอุส | 15g | 53% | +20 AP · +10 เจาะต้านเวท (ลบต้านเวทเป้าก่อนคิดดาเมจเวท) | Willow Twig (6g) + Broken Sundial (5g) |
| **Cerridwen's Brewing Ladle** `cbl`<br>กระบวยปรุงยาแคร์ริดเวน | 15g | 117% | +20 AP · +180 HP | Willow Twig (6g) + Nymph's Dewdrop (8g) |
| **Persephone's Asphodel** `pwa`<br>ดอกแอสโฟเดลเพอร์เซโฟนี | 14g | 129% | +20 AP · +25 ต้านเวท | Willow Twig (6g) + Braided Clover (6g) |
| **Hou Yi's Sunpiercer Arrow** `hys`<br>ศรสุริยันโฮ่วยี่ | 16g | 141% | +15 AD · +15% โอกาสคริ | Boar Tusk (7g) + Robin's Fletching (8g) |
| **Atalanta's Swift Fletching** `asf`<br>ขนศรลมกรดอตาลันตา | 15g | 180% | +15% ความเร็วโจมตี · +15% โอกาสคริ · +5% ความเร็วเดิน | Crow Feather (5g) + Robin's Fletching (8g) |
| **Lamia's Blood Needle** `lbn`<br>เข็มสูบเลือดลามิเอ | 15g | 120% | +15 AD · +5% ดูดเลือด | Boar Tusk (7g) |
| **William Tell's Apple-Splitter** `wtb`<br>ศรผ่าแอปเปิลวิลเลียม เทลล์ | 15g | 130% | +15 AD · เจาะเกราะ 10% | Boar Tusk (7g) + Broken Sundial (5g) |
| **Idunn's Spring Water** `isw`<br>น้ำพุฤดูใบไม้ผลิอิดุนน์ | 13g | 97% | +15 AP · ฮีล/โล่ที่จ่ายให้เพื่อน +8% | Panacea's Dried Petal (5g) + Willow Twig (6g) |
| **Chiron's Chanted Ribbon** `ccr`<br>ริบบิ้นสวดมนตร์ไครอน | 12g | 139% | +10 Ability Haste · ฮีล/โล่ที่จ่ายให้เพื่อน +8% | Panacea's Dried Petal (5g) + Broken Sundial (5g) |
| **Nymph's Graceful Veil** `ngv`<br>ม่านลอยลมพรายนิมฟ์ | 13g | 88% | +20 ความเร็วเดิน · ฮีล/โล่ที่จ่ายให้เพื่อน +8% | Panacea's Dried Petal (5g) + Straw Sandals (6g) |
| **Siren's Song-Flask** `slf`<br>ขวดเพลงไซเรน | 15g | 130% | +15 AD · +6% ดูดเลือด | Siren's Lure (6g) + Boar Tusk (7g) |
| **Lycaon's Gorging Fang** `lgf`<br>เขี้ยวกลืนกินไลเคออน | 15g | 113% | +20 AP · +6% ดูดเลือด | Siren's Lure (6g) + Willow Twig (6g) |
| **Fenrir's Chain-Link** `fcl`<br>ห่วงโซ่เฟนริร์ | 14g | 50% | +10 AD · +10 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) | Fenrir's Torn Fang (6g) + Boar Tusk (7g) |
| **Mimir's Whispering Head** `mwh`<br>เศียรกระซิบมิเมียร์ | 16g | 108% | +25 AP · เจาะต้านเวท 8% | Fenrir's Torn Fang (6g) + Willow Twig (6g) |
| **Icarus' Wax-Bound Wings** `iwb`<br>ปีกขี้ผึ้งอิคารัส | 14g | 88% | +15% ความเร็วโจมตี · +20 ความเร็วเดิน | Icarus' Wax Feather (6g) + Crow Feather (5g) |
| **Argonaut's Fleece Wrap** `afw`<br>ขนแกะอาร์โกนอต | 15g | 103% | +150 HP · ฮีล/เกราะ/ดูดเลือดที่ได้รับ +12% | Ambrosia Crumb (5g) + Nymph's Dewdrop (8g) |
| **Dvalinn's Whetted Chisel** `dvc`<br>สิ่วลับคมดวาลิน | 16g | 131% | +15% โอกาสคริ · ดาเมจคริแรงขึ้น 15% (รวมเป็น 190%) | Dwarf's Whetstone (6g) + Robin's Fletching (8g) |
| **Executioner's Nettle** `exn`<br>ตำแยเพชฌฆาต | 14g | 75% ⚠️ | +15 AD · ทำดาเมจใส่ใคร ตัดฮีลของเป้า 40% นาน 3 วิ | Boar Tusk (7g) |
| **Witch's Banebloom** `wbp`<br>ดอกพิษแม่มด | 14g | 57% ⚠️ | +20 AP · ทำดาเมจใส่ใคร ตัดฮีลของเป้า 40% นาน 3 วิ | Willow Twig (6g) |
| **Baba Yaga's Bone Thorn** `bbt`<br>หนามกระดูกบาบายากา | 14g | 57% ⚠️ | +20 เกราะ · ทำดาเมจใส่ใคร ตัดฮีลของเป้า 40% นาน 3 วิ | Boiled Cuirass (6g) |

### รองเท้า (BOOTS) — 7 ชิ้น

| ไอเทม | ราคา | ความคุ้ม | ค่าสถานะและพาสซีฟ | สร้างจาก |
|---|---:|---:|---|---|
| **Spartan Greaves** `sg`<br>สนับแข้งสปาร์ตัน | 25g | `พาสซีฟเขียนมือ` | +25 เกราะ · +45 ความเร็วเดิน · ลดดาเมจออโต้ที่โดน 12% | Straw Sandals (6g) + Boiled Cuirass (6g) |
| **Asgardian Treads** `at`<br>เกือกแอสการ์ด | 25g | `พาสซีฟเขียนมือ` | +25 ต้านเวท · +45 ความเร็วเดิน · ลดเวลาติดล็อก 30% | Straw Sandals (6g) + Braided Clover (6g) |
| **Achilles' Talaria** `act`<br>ปีกอคิลลีส | 25g | `พาสซีฟเขียนมือ` | +25% ความเร็วโจมตี · +45 ความเร็วเดิน · ออโต้เพิ่ม 1% Max HP ศัตรู | Straw Sandals (6g) + Crow Feather (5g) |
| **Chronos' Stride** `chr`<br>ก้าวโครนอส | 25g | `พาสซีฟเขียนมือ` | +15 Ability Haste · +45 ความเร็วเดิน | Straw Sandals (6g) + Broken Sundial (5g) |
| **Talaria of Hermes** `toh`<br>ปีกเฮอร์มีส | 25g | `พาสซีฟเขียนมือ` | +60 ความเร็วเดิน · ต้านสโลว์ 40% (ลดผลของสโลว์ที่โดน) | Straw Sandals (6g) |
| **Chimera's Prowlers** `cp`<br>กรงเล็บไคเมร่า | 25g | `พาสซีฟเขียนมือ` | +15 AD · +45 ความเร็วเดิน · +8 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) | Straw Sandals (6g) + Boar Tusk (7g) |
| **Sorcerer's Filigree** `sof`<br>รองเท้าอาคม | 25g | 83% | +25 AP · +45 ความเร็วเดิน · +8 เจาะต้านเวท (ลบต้านเวทเป้าก่อนคิดดาเมจเวท) | Straw Sandals (6g) + Willow Twig (6g) |

### แทงค์ (TANK) — 14 ชิ้น

| ไอเทม | ราคา | ความคุ้ม | ค่าสถานะและพาสซีฟ | สร้างจาก |
|---|---:|---:|---|---|
| **Nemean Lion's Mane** `nlm`<br>แผงคอสิงโตเนเมียน | 60g | `พาสซีฟเขียนมือ` | +400 HP · +80 เกราะ · โดนตีแล้วสะท้อนดาเมจ 15 + 25% Bonus เกราะ กลับไปหาคนตี ทุกวินาที | Chainmail of the Nemean (14g) + Golem's Plated Rib (16g) + Boiled Cuirass (6g) |
| **Prometheus' Hearth** `pmh`<br>เตาไฟโพรมีธีอุส | 60g | `พาสซีฟเขียนมือ` | +650 HP · +40 เกราะ · +10 Ability Haste · เผาศัตรูในรัศมี 325 ทุก 2 วิ ครั้งละ 20 + 2.5% Max HP ของตัวเอง (เป็นดาเมจเวท) | Golem's Plated Rib (16g) + Baba Yaga's Bone Thorn (14g) |
| **Mirror of the Snow Queen** `msq`<br>กระจกราชินีหิมะ | 60g | `พาสซีฟเขียนมือ` | +250 HP · +90 เกราะ · +15 Ability Haste · ลดความเร็วโจมตีศัตรูรอบตัว 400 หน่วย 25% (หลายชิ้นไม่ทับกัน) | Clockwork Carapace (14g) + Chainmail of the Nemean (14g) + Golem's Plated Rib (16g) |
| **Mjölnir's Grounding Cloak** `mgc`<br>ผ้าคลุมมโยลเนียร์ | 60g | `พาสซีฟเขียนมือ` | +400 HP · +70 ต้านเวท · +25% ความเร็วเดิน · โดนเวทสะสม Stack สูงสุด 10 (+30 ต้านเวท) ครบ 10 ได้ +10% ความเร็วเดิน | Veil of the Silver Bough (14g) + Red Riding Cloak (16g) + Nymph's Dewdrop (8g) |
| **Apple of Idunn** `aoi`<br>แอปเปิลอิดุนน์ | 60g | `พาสซีฟเขียนมือ` | +800 HP · +10 Ability Haste · เลือดต่ำกว่า 50% แล้วโดนตี จะฟื้น 10% ของเลือดที่หายไป ทยอยใน 3 วิ (ทุก 10 วิ) | Giant's Heartstone (19g) + Pendulum of Neverland (15g) + Nymph's Dewdrop (8g) |
| **Holy Grail of Avalon** `hga`<br>จอกศักดิ์สิทธิ์อวาลอน | 60g | `พาสซีฟเขียนมือ` | +550 HP · +30 ต้านเวท · +10 Ability Haste · ฮีล เกราะป้องกัน และดูดเลือดที่ตัวเองได้รับ แรงขึ้น 25% (คูณหลังพลังฮีลของคนจ่าย) | Giant's Heartstone (19g) + Argonaut's Fleece Wrap (15g) |
| **Cuirass of the Iron John** `cij`<br>เกราะคนเหล็ก | 60g | `พาสซีฟเขียนมือ` | +400 HP · +40 เกราะ · +40 ต้านเวท · +10 Ability Haste · อยู่ในไฟต์ครบทุก 3 วิ ได้เกราะและต้านเวท +6 สะสมสูงสุด 5 ชั้น · ครบ 5 ชั้นคูณอีก 1.1 เท่า | Gargoyle's Bastion (15g) + Pendulum of Neverland (15g) + Boiled Cuirass (6g) |
| **Siren's Abyssal Bell** `sab`<br>ระฆังไซเรน | 64g | `พาสซีฟเขียนมือ` | +65 เกราะ · +65 ต้านเวท · +10 Ability Haste · ชาร์จได้สูงสุด 2 วิ (ปล่อยก่อนได้) ระหว่างชาร์จกันดาเมจ 40-60% ตามเลเวล แล้ว Taunt ศัตรูรอบตัว 450 หน่วย 0.5-2 วิ ตามเวลาที่ชาร์จ (ทุก 45 วิ) | Gargoyle's Bastion (15g) + Chainmail of the Nemean (14g) + Veil of the Silver Bough (14g) |
| **Gleipnir's Binding Shackles** `gbs`<br>โซ่ตรวนกลัยพ์เนียร์ | 64g | `พาสซีฟเขียนมือ` | +450 HP · +45 เกราะ · +45 ต้านเวท · +10 Ability Haste · ยิงโซ่ล่ามศัตรูตัวแรกที่โดน นาน 2.5 วิ (คูลดาวน์ 30 วิ) · ระหว่างโดนล่าม เป้าโดนลด Tenacity 25% | Gargoyle's Bastion (15g) + Pendulum of Neverland (15g) + Nymph's Dewdrop (8g) |
| **Baba Yaga's Iron Cauldron** `byc`<br>หม้อเหล็กบาบายากา | 58g | 85% ⚠️ | +400 HP · +45 เกราะ · +10 Ability Haste · ทำดาเมจใส่ใคร ตัดฮีลของเป้า 40% นาน 3 วิ | Baba Yaga's Bone Thorn (14g) + Golem's Plated Rib (16g) |
| **Mirror of Truth** `mot`<br>กระจกสลายภาพลวงตา | 58g | `พาสซีฟเขียนมือ` | +450 HP · +80 เกราะ · +10 Ability Haste · ลดดาเมจออโต้ที่โดน 12 + 3.5 ต่อ Max HP ทุก 1000 ของตัวเอง (คริของศัตรูโดนลดผลอีก 30%) | Chainmail of the Nemean (14g) + Golem's Plated Rib (16g) + Boiled Cuirass (6g) |
| **Mímir's Whispering Well** `mww`<br>บ่อน้ำกระซิบมิเมียร์ | 58g | 100% ⚠️ | +450 HP · +60 ต้านเวท · +10 Ability Haste · ทุก 1 วิ ปล่อยคลื่นเวท 25 (+1.5% Bonus HP) รอบตัวในระยะ 400 · ศัตรูที่โดนกินดาเมจเวทจากทุกแหล่งแรงขึ้น 12% นาน 3 วิ | Red Riding Cloak (16g) + Veil of the Silver Bough (14g) + Pendulum of Neverland (15g) |
| **Argus' Hundred Eyes** `ahe`<br>ร้อยดวงตาอาร์กัส | 58g | 102% | +400 HP · +35 เกราะ · +35 ต้านเวท · +10 Ability Haste · แชมเปี้ยนศัตรูแต่ละตัวในระยะ 650 ให้ +8 เกราะ และ +8 ต้านเวท (สูงสุด 5 ตัว) | Gargoyle's Bastion (15g) + Giant's Heartstone (19g) + Clockwork Carapace (14g) |
| **Heimdall's Warding Horn** `hwg`<br>แตรเฝ้าสะพานไฮม์ดัล | 45g | 98% | +300 HP · +35 เกราะ · +35 ต้านเวท · +15 Ability Haste เฉพาะท่าไม้ตาย · กดอัลติแล้วปล่อยเขตรัศมี 450 นาน 3 วิ ศัตรูในเขตติดสโลว์ 45% (ทุก 30 วิ) | Gargoyle's Bastion (15g) + Pendulum of Neverland (15g) |

### ไฟท์เตอร์ (FIGHTER) — 11 ชิ้น

| ไอเทม | ราคา | ความคุ้ม | ค่าสถานะและพาสซีฟ | สร้างจาก |
|---|---:|---:|---|---|
| **Blade of the Impaled Voivode** `biv`<br>ดาบวลาดผู้เสียบ | 62g | `พาสซีฟเขียนมือ` | +45 AD · +350 HP · +15 Ability Haste · ออโต้ครั้งแรกต่อเป้าเพิ่มดาเมจ 15% Max HP ศัตรูและฮีลกลับเต็ม (ต่อตัว ทุก 6 วิ คงที่ ไม่ลดตาม AH) | Woodcutter's Hewing Axe (16g) + Cauldron Churner (15g) + Nymph's Dewdrop (8g) |
| **Shroud of Osiris** `soo`<br>ผ้าห่อโอซิริส | 64g | `พาสซีฟเขียนมือ` | +45 AD · +40 เกราะ · ตายครั้งแรกในไฟต์กลายเป็นแช่แข็ง 3 วิแทน แล้วฟื้นคืนชีพ 30% Base HP (ใช้ได้ครั้งเดียว) | Durandal's Whetted Edge (16g) + Gilgamesh's Vambrace (15g) + Boiled Cuirass (6g) |
| **Cuirass of the Bleeding Centaur** `cbc`<br>เกราะเลือดเซนทอร์ | 62g | `พาสซีฟเขียนมือ` | +50 AD · +40 เกราะ · +15 Ability Haste · ทำดาเมจใส่ใคร ตัดฮีลของเป้า 40% นาน 3 วิ · 30% ของดาเมจทุกชนิดที่โดน กลายเป็นเลือดไหลแบบ True Damage 3 วิ · สังหารหรือช่วยสังหารจะล้างเลือดไหลแล้วฟื้นคืน 150% ของยอดที่ยังไม่ทันไหลออก · ทำดาเมจหรือโดนดาเมจ สะสมชั้นละ +2 เกราะ ต้านเวท และ AD สูงสุด 20 ชั้น · ครบ 20 ชั้นได้ต้านสโลว์ 30% และ Tenacity 30% ไปจนจบไฟต์ | Gilgamesh's Vambrace (15g) + Executioner's Nettle (14g) + Boar Tusk (7g) |
| **Balmung's Dragon-Cleaver** `bdc`<br>ดาบบาลมุงก์ | 60g | `พาสซีฟเขียนมือ` | +40 AD · +300 HP · +15 Ability Haste · ใช้สกิลแล้วออโต้ครั้งถัดไปเพิ่ม 175% Base AD และวิ่งไว 2 วิ (ทุก 1.5 วิ) | Cauldron Churner (15g) + Woodcutter's Hewing Axe (16g) |
| **Cleaver of the Gorgon's Bane** `cbg`<br>ขวานกอร์กอน | 62g | `พาสซีฟเขียนมือ` | +45 AD · +350 HP · +15 Ability Haste · ออโต้ลดเกราะศัตรู 5% สะสมสูงสุด 5 ชั้น (25%) และเพิ่มความเร็วเดินตามจำนวนชั้น | Woodcutter's Hewing Axe (16g) + Cauldron Churner (15g) + Boar Tusk (7g) |
| **Pauldrons of the Nian Beast** `pnb`<br>เกราะไหล่เหนียน | 60g | `พาสซีฟเขียนมือ` | +40 AD · +350 HP · +30 เกราะ · ตี/โดนตีสะสมสูงสุด 15 ชั้น ได้เกราะและ Tenacity ตามชั้น ครบ 15 ได้ Slow Resist และวิ่งไวอีก 10 วิ | Woodcutter's Hewing Axe (16g) + Gilgamesh's Vambrace (15g) + Boiled Cuirass (6g) |
| **Horn of the Wild Hunt** `hwh`<br>เขาศึกไวลด์ฮันต์ | 60g | `พาสซีฟเขียนมือ` | +40 AD · +300 HP · +20% ความเร็วโจมตี · +25 Ability Haste เฉพาะท่าไม้ตาย · กดท่าไม้ตายแล้วได้ AD +20 · ความเร็วโจมตี +30% · ความเร็วเดิน +15% นาน 10 วิ (ทุก 30 วิ) | Hiawatha's Tomahawk (13g) + Woodcutter's Hewing Axe (16g) + Cauldron Churner (15g) |
| **Colossal Club of the Oni** `cco`<br>กระบองโอนิ | 62g | `พาสซีฟเขียนมือ` | +35 AD · +550 HP · ได้ AD เพิ่มตาม Bonus HP · ออโต้กวาดโคนด้านหลังเป้า | Woodcutter's Hewing Axe (16g) + Giant's Heartstone (19g) + Boar Tusk (7g) |
| **Girdle of Hippolyta** `goh`<br>เข็มขัดฮิปโปลิตา | 60g | `พาสซีฟเขียนมือ` | +40 AD · +350 HP · +20% ความเร็วโจมตี · +10 Ability Haste · สโลว์ศัตรูรอบตัว 35% พร้อมวิ่งไวตัวเอง 30% นาน 2 วิ (ทุก 20 วิ) | Hiawatha's Tomahawk (13g) + Woodcutter's Hewing Axe (16g) + Pendulum of Neverland (15g) |
| **Draupnir's Sovereign Signet** `dss`<br>แหวนดราวป์เนียร์ | 64g | `พาสซีฟเขียนมือ` | +50 AD · +30 เกราะ · +30 ต้านเวท · ติด CC แล้วล้าง CC ทันที + กัน CC 0.5 วิ + วิ่งไว 30% นาน 1.5 วิ (ทุก 45 วิ) · ดูดเลือดทุกชนิด 10% | Durandal's Whetted Edge (16g) + Rowan Wand Dagger (15g) + Boiled Cuirass (6g) |
| **The Legendary Excalibur** `lex`<br>เอกซ์คาลิเบอร์ในตำนาน | 64g | 104% ⚠️ | +55 AD · +250 HP · +15 Ability Haste · ดาเมจก้อนแรกที่ลงแชมเปี้ยนศัตรู ได้โล่ 120 (+100% Bonus AD) นาน 3.5 วิ และวิ่งเร็วขึ้น 10% ขณะมีโล่ (ทุก 15 วิ) | Durandal's Whetted Edge (16g) + Woodcutter's Hewing Axe (16g) + Loki's Mistletoe Dagger (14g) |

### แอสซาซิน (ASSASSIN) — 11 ชิ้น

| ไอเทม | ราคา | ความคุ้ม | ค่าสถานะและพาสซีฟ | สร้างจาก |
|---|---:|---:|---|---|
| **Carnwennan's Shadowblade** `cns`<br>กริชเงาคาร์นเวนแนน | 60g | 81% | +55 AD · +10 Ability Haste · +15 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · จบการพุ่ง ออโต้ครั้งถัดไปแถมดาเมจกายภาพ 80 (+50% Bonus AD) (ทุก 6 วิ) | Huntsman's Skinning Dirk (15g) + Loki's Mistletoe Dagger (14g) |
| **Sekhmet's Massacre Claws** `smc`<br>กรงเล็บสังหารเซคเมต | 62g | 75% | +60 AD · +20 ความเร็วเดิน · +20 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · 10 วินาทีแรกของไฟต์ ได้เจาะเกราะเพิ่ม +15 | Huntsman's Skinning Dirk (15g) + Puck's Shadow Cloak (15g) |
| **Seven-League Shadowstriders** `sls`<br>เกือกเจ็ดลีกล่องเงา | 60g | 72% | +50 AD · +35 ความเร็วเดิน · +15 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · เข้าปะทะแล้วได้ความเร็วเดิน +40% นาน 3 วิ (ทุก 15 วิ) · สังหารศัตรูได้ คูลดาวน์พร้อมใช้ทันที | Puck's Shadow Cloak (15g) + Huntsman's Skinning Dirk (15g) |
| **Hecate's Triple Crescent** `htc`<br>จันทราสามเสี้ยวเฮคาเต | 62g | 86% | +55 AD · +15 Ability Haste · +15 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · ตีหรือใช้สกิลใส่เป้าเดิมครบ 3 ฮิตใน 2 วิ ระเบิด True Damage 8% Max HP (ต่อตัว ทุก 8 วิ) | Huntsman's Skinning Dirk (15g) + Loki's Mistletoe Dagger (14g) |
| **Fang of the Midgard Serpent** `fms`<br>เขี้ยวพญางูมิดการ์ด | 58g | 66% ⚠️ | +55 AD · +20 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · ดาเมจกินหลอดโล่แรงขึ้น 50% และเป้าที่โดนรับโล่ใหม่ได้น้อยลง 40% นาน 3 วิ | Huntsman's Skinning Dirk (15g) + Fenrir's Chain-Link (14g) |
| **Jabberwock's Vorpal Blade** `jvb`<br>ดาบวอร์พอลปลิดชีพ | 60g | 70% ⚠️ | +60 AD · +15 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · ตีใส่ศัตรูที่เลือดต่ำกว่า 50% แถมดาเมจกายภาพ 100 (+40% Bonus AD) (ต่อตัว ทุก 6 วิ) | Huntsman's Skinning Dirk (15g) + Boar Tusk (7g) + Boar Tusk (7g) |
| **Thanatos' Reaping Scythe** `trs`<br>เคียวเก็บเกี่ยวทานาทอส | 64g | 78% | +50 AD · +15 Ability Haste · +15 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · สังหารหรือช่วยสังหาร รีเซ็ตคูลดาวน์ Q W E ทันที (ครั้งแรกครั้งเดียวต่อยก) | Huntsman's Skinning Dirk (15g) + Loki's Mistletoe Dagger (14g) + Broken Sundial (5g) |
| **Anubis' Death Mark** `adm`<br>มีดชี้ชะตาอนูบิส | 62g | 73% ⚠️ | +50 AD · +10 Ability Haste · +15 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · ทำดาเมจใส่ใคร ตัดฮีลของเป้า 40% นาน 3 วิ · ขว้างมีดใส่ศัตรูที่ใกล้ที่สุด สโลว์ 40% นาน 2 วิ และเป้ารับดาเมจจากเราแรงขึ้น 15% นาน 4 วิ (ทุก 35 วิ) | Huntsman's Skinning Dirk (15g) + Executioner's Nettle (14g) |
| **Freyja's Shroud of Defiance** `fsd`<br>ผ้าคลุมท้าความตายเฟรยา | 64g | 78% | +50 AD · +15 Ability Haste · +10 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · โดนดาเมจที่จะตาย เลือดล็อกที่ 1 แล้วอมตะ 2 วิ (ครั้งเดียวต่อยก) | Huntsman's Skinning Dirk (15g) + Loki's Mistletoe Dagger (14g) + Nymph's Dewdrop (8g) |
| **Wendigo's Voracious Claw** `wvc`<br>กรงเล็บตะกละเวนดิโก | 60g | 64% | +55 AD · +15 เจาะเกราะ (ลบเกราะเป้าก่อนคิดดาเมจกายภาพ) · ศัตรูคนแรกของไฟต์ที่เลือดเหลือต่ำกว่า 20% ของ Max HP จะโดนประหารทันที และได้เงินกระเป๋าแยกเพิ่ม 2 | Huntsman's Skinning Dirk (15g) + Fenrir's Chain-Link (14g) |
| **Mordred's Usurping Blade** `mub`<br>ดาบทรยศมอร์เดรด | 62g | 111% | +45 AD · +15 Ability Haste · เจาะเกราะ 25% · เก็บศพหรือช่วยเก็บ ตัดคูลดาวน์อัลติที่เหลือทิ้ง 25% ของคูลดาวน์เต็ม | William Tell's Apple-Splitter (15g) + Huntsman's Skinning Dirk (15g) + Loki's Mistletoe Dagger (14g) |

### เวท (MAGE) — 17 ชิ้น

| ไอเทม | ราคา | ความคุ้ม | ค่าสถานะและพาสซีฟ | สร้างจาก |
|---|---:|---:|---|---|
| **Thoth's Emerald Tablet** `tet`<br>ศิลาจารึกมรกตธอธ | 65g | 94% | +85 AP · +30% AP · ทุก 100 AP ที่มี แถมเจาะต้านเวทให้อีก 3 (คิดหลังคูณ AP% ของตัวมันเอง) | Circe's Yew Wand (15g) + Circe's Yew Wand (15g) |
| **Eye of Horus** `eoh`<br>ดวงตาแห่งฮอรัส | 58g | 105% | +60 AP · +10 Ability Haste · เจาะต้านเวท 30% · สกิลเวทที่โดนแชมเปี้ยนจะเปิดตำแหน่งเป้า 2 วิ — คนล่องหนอยู่จะถูกเผยตัวทันที | Mimir's Whispering Head (16g) + Orpheus' Resonant Lyre (15g) |
| **Kitsune's Foxfire Fan** `kff`<br>พัดเพลิงจิ้งจอกเก้าหาง | 60g | 75% ⚠️ | +50 AP · +30% ความเร็วโจมตี · +10 Ability Haste · ออโต้แถมดาเมจเวท 8 (+12% AP) ทุกครั้งที่ตีโดน | Circe's Yew Wand (15g) + Crow Feather (5g) + Broken Sundial (5g) |
| **Caliburn's Spellblade** `csb`<br>ดาบมนตราแคลิเบิร์น | 60g | 78% ⚠️ | +60 AP · +15 Ability Haste · +5% ความเร็วเดิน · หลังร่ายสกิล ออโต้ครั้งถัดไปแถมดาเมจเวท 75% Base AD + 45% AP (ทุก 1.5 วิ) | Circe's Yew Wand (15g) + Pied Piper's Fife (14g) |
| **Surtr's Twilight Cinder** `stc`<br>เถ้าอัคคีสุรเทอร์ | 62g | 65% ⚠️ | +60 AP · +300 HP · ดาเมจเวทจุดไฟเผาเป้า 2% Max HP ต่อวินาที นาน 3 วิ | Cerridwen's Brewing Ladle (15g) + Witch's Banebloom (14g) |
| **Lilith's Sanguine Grimoire** `lbg`<br>คัมภีร์โลหิตลิลิธ | 62g | 79% | +70 AP · +250 HP · +5% ดูดเลือด · เลือดเหลือ 50% หรือน้อยกว่า ได้ดูดเลือดเพิ่มอีก 10% (รวมเป็น 15%) | Cerridwen's Brewing Ladle (15g) + Lycaon's Gorging Fang (15g) |
| **Yuki-onna's Frozen Scepter** `yfs`<br>คทาเหมันต์ยูกิอนนะ | 60g | 74% ⚠️ | +65 AP · +350 HP · สกิลที่โดนศัตรู สโลว์ 30% นาน 2 วิ | Cerridwen's Brewing Ladle (15g) + Circe's Yew Wand (15g) |
| **Zephyrus' Gale Cloak** `zgc`<br>ผ้าคลุมวายุเซฟีรัส | 60g | 97% | +50 AP · +200 HP · +20 Ability Haste · +5% ความเร็วเดิน · ร่ายสกิลแล้วเร็วขึ้น 20% นาน 3 วิ · ทำดาเมจเวทแล้วได้ความเร็วเดิน +20% นาน 2 วิ (ไม่มีคูลดาวน์) | Circe's Yew Wand (15g) + Pied Piper's Fife (14g) + Straw Sandals (6g) |
| **Nemesis' Vengeful Scales** `nvs`<br>ตราชั่งล้างแค้นเนเมซิส | 64g | 70% ⚠️ | +75 AP · +15 Ability Haste · +20 เจาะต้านเวท (ลบต้านเวทเป้าก่อนคิดดาเมจเวท) · ทำดาเมจใส่ใคร ตัดฮีลของเป้า 40% นาน 3 วิ · แปะมาร์กเป้า 2.5 วิ ครบเวลาระเบิดซ้ำ 100 (+20% ดาเมจเวทที่สะสมไว้) (ทุก 25 วิ) | Circe's Yew Wand (15g) + Witch's Banebloom (14g) |
| **Raijin's Thunder Drum** `rsd`<br>กลองอัสนีไรจิน | 62g | 73% ⚠️ | +75 AP · +15 Ability Haste · +20 เจาะต้านเวท (ลบต้านเวทเป้าก่อนคิดดาเมจเวท) · สายฟ้ากระโดด 3 ต่อ ระยะ 500 — ตัวแรก 80 + 25% AP · ตัวถัดไป 40 + 15% AP (คูลดาวน์ 10 วิ) · สกิลเวทถัดไปแรงขึ้น 80 (+25% AP) และชิ่งไปหาศัตรูข้างเคียง 3 ตัว 40 (+15% AP) (ทุก 12 วิ) | Circe's Yew Wand (15g) + Orpheus' Resonant Lyre (15g) + Broken Sundial (5g) |
| **Hel's Nether Domain** `hnd`<br>แดนอเวจีแห่งเฮล | 62g | 94% ⚠️ | +60 AP · +250 HP · +10 Ability Haste · ลดคูลดาวน์ท่าไม้ตาย 20% · ท่าไม้ตายทิ้งเขตไว้ รัศมี 600 นาน 4 วิ ทำดาเมจ 10 + 5% AP ต่อวินาที และลดต้านเวทเป้า 15% · ร่ายท่าไม้ตายแล้วเปิดวงน้ำแข็ง 450 หน่วย นาน 4 วิ เผา 20 (+10% AP) ต่อวินาที และลดต้านเวทศัตรูในวง 15% | Cerridwen's Brewing Ladle (15g) + Persephone's Asphodel (14g) |
| **Merlin's Starbolt Staff** `mrt`<br>ไม้เท้าสะเก็ดดาวเมอร์ลิน | 60g | 63% ⚠️ | +70 AP · +10 Ability Haste · +15 เจาะต้านเวท (ลบต้านเวทเป้าก่อนคิดดาเมจเวท) · ยิงดาวตกใส่ศัตรูในระยะ 1200 ระเบิดรัศมี 200 หน่วย ดาเมจเวท 120 (+40% AP) (ทุก 25 วิ) | Circe's Yew Wand (15g) + Orpheus' Resonant Lyre (15g) |
| **Norns' Thread of Weaving** `ntw`<br>เส้นด้ายลิขิตนอร์นส์ | 60g | 51% | +50 AP · +200 HP · +20 Ability Haste เฉพาะท่าไม้ตาย · ร่ายท่าไม้ตายแล้วได้ความเร็วเดิน +30% และ AP +20% นาน 4 วิ | Pied Piper's Fife (14g) + Cerridwen's Brewing Ladle (15g) |
| **Jack's Giantbane Harp** `jbg`<br>พิณปราบยักษ์ของแจ็ค | 60g | 68% | +65 AP · +15 Ability Haste · ตีศัตรูที่เลือดมากกว่า 50% ของ Max HP แรงขึ้น 15% ทุกชนิด | Circe's Yew Wand (15g) + Pied Piper's Fife (14g) |
| **Amrita's Nectar Goblet** `ang`<br>จอกน้ำอมฤต | 60g | 104% ⚠️ | +60 AP · +200 HP · +10 Ability Haste · เจาะต้านเวท 20% · สังหารหรือช่วยสังหารครั้งแรกของไฟต์ ฮีลทั้งทีม 100 + 35% AP | Orpheus' Resonant Lyre (15g) + Cerridwen's Brewing Ladle (15g) |
| **Morgana's Unravelling Thread** `mut`<br>เส้นด้ายคลายมนตร์มอร์กานา | 60g | 104% ⚠️ | +85 AP · +250 HP · +15 Ability Haste · ดาเมจเวทใส่แชมเปี้ยนลดต้านเวทเป้า 5% นาน 4 วิ ซ้อนได้ 6 ชั้น (รวม 30%) | Cerridwen's Brewing Ladle (15g) + Circe's Yew Wand (15g) + Pied Piper's Fife (14g) |
| **Sleeping Beauty's Spindle** `sbs`<br>กระสวยเจ้าหญิงนิทรา | 62g | 108% | +85 AP · +45 เกราะ · +15 Ability Haste · เลือดต่ำกว่า 30% เข้าสภาวะแช่แข็ง แตะไม่ได้และไม่กินดาเมจ 2 วิ (ทุก 45 วิ) | Circe's Yew Wand (15g) + Clockwork Carapace (14g) + Chainmail of the Nemean (14g) |

### มาร์คแมน (MARKSMAN) — 14 ชิ้น

| ไอเทม | ราคา | ความคุ้ม | ค่าสถานะและพาสซีฟ | สร้างจาก |
|---|---:|---:|---|---|
| **Artemis' Silver Crescent** `asc`<br>จันทราเงินแห่งอาร์เทมิส | 62g | `พาสซีฟเขียนมือ` | +60 AD · +25% โอกาสคริ · ดาเมจคริแรงขึ้น 25% (รวมเป็น 200%) · ออโต้ที่ติดคริ ทำให้เป้าติดสโลว์ 20% นาน 1 วิ | Hou Yi's Sunpiercer Arrow (16g) + Dvalinn's Whetted Chisel (16g) |
| **Swan Maiden's Feathered Cloak** `swf`<br>ปีกขนนกหญิงสาวหงส์ | 60g | `พาสซีฟเขียนมือ` | +60 AD · +25% โอกาสคริ · +8% ดูดเลือด · เลือดต่ำกว่า 30% รับโล่ 250 (+100% Bonus AD) นาน 4 วิ (ทุก 60 วิ) | Lamia's Blood Needle (15g) + Hou Yi's Sunpiercer Arrow (16g) |
| **Sleipnir's Galloping Horseshoe** `slh`<br>เกือกม้าทะยานสเลปนีร์ | 58g | `พาสซีฟเขียนมือ` | +35 AD · +15% ความเร็วโจมตี · +25% โอกาสคริ · +5% ความเร็วเดิน · ทุก 10 วิ ออโต้ครั้งแรกได้ความเร็วเดิน +40% แล้วค่อยๆ จางหายใน 2.5 วิ | Atalanta's Swift Fletching (15g) + Crow Feather (5g) + Boar Tusk (7g) |
| **William Tell's Sovereign Crossbow** `wtc`<br>หน้าไม้วิลเลียม เทลล์ | 60g | 135% | +55 AD · +25% โอกาสคริ · เจาะเกราะ 25% · ออโต้ครั้งแรกที่ลงศัตรูแต่ละตัวในไฟต์ พ่วงดาเมจจริงอีก 50% AD | William Tell's Apple-Splitter (15g) + Hou Yi's Sunpiercer Arrow (16g) |
| **Urd's Loom of Fate** `ulf`<br>กี่ทอชะตาอูร์ด | 62g | `พาสซีฟเขียนมือ` | +20 AD · +25% ความเร็วโจมตี · +25% โอกาสคริ · +15 Ability Haste · ออโต้ลดคูลดาวน์ที่เหลือของ Q W E ลง 12% | Hou Yi's Sunpiercer Arrow (16g) + Broken Sundial (5g) + Boar Tusk (7g) |
| **Indra's Vajra Dart** `ivd`<br>วัชระอัสนีอินทรา | 60g | `พาสซีฟเขียนมือ` | +55 AD · +25% ความเร็วโจมตี · +25% โอกาสคริ · ออโต้ครบ 3 ครั้ง ระเบิด True Damage 60 (+35% Bonus AD) | Atalanta's Swift Fletching (15g) + Boar Tusk (7g) + Boar Tusk (7g) |
| **Bow of Eurytus** `boe`<br>คันศรแห่งยูริทัส | 58g | `พาสซีฟเขียนมือ` | +35 AD · +20% ความเร็วโจมตี · +25% โอกาสคริ · +7% ความเร็วเดิน · ทุก 5 วิ ออโต้ครั้งถัดไปยิงไกลขึ้น 150 หน่วย และแถมดาเมจเวท 50 (+20% AP) | Atalanta's Swift Fletching (15g) + Icarus' Wax-Bound Wings (14g) |
| **Shiva's Trishula** `sst`<br>ตรีศูลทำลายล้างพระศิวะ | 60g | `พาสซีฟเขียนมือ` | +45 AD · +30% ความเร็วโจมตี · เจาะเกราะ 30% · ทำดาเมจใส่ใคร ตัดฮีลของเป้า 40% นาน 3 วิ | Hiawatha's Tomahawk (13g) + Executioner's Nettle (14g) |
| **Hephaestus' Twin Hammers** `hth`<br>ค้อนคู่ตีเหล็กเฮเฟสตัส | 62g | `พาสซีฟเขียนมือ` | +40 AD · +40 AP · +35% ความเร็วโจมตี · +10 Ability Haste · ออโต้ครั้งที่ 3 เบิ้ลผล on-hit ทั้งหมดซ้ำอีก 2 ครั้งในฮิตนั้น | Hiawatha's Tomahawk (13g) + Valkyrie's Twin Plumes (12g) + Broken Sundial (5g) |
| **Apollo's Sunlit Quiver** `asq`<br>กระบอกศรสุริยันอพอลโล | 62g | `พาสซีฟเขียนมือ` | +60 AD · เลือด 50% ขึ้นไป ได้ +40 AD · ต่ำกว่านั้นเปลี่ยนเป็นดูดเลือด 15% แทน | Lamia's Blood Needle (15g) + Siren's Song-Flask (15g) |
| **Fafnir's Devouring Maw** `fdm`<br>ปากเขี้ยวฟาฟเนียร์ | 63g | 99% ⚠️ | +50 AD · +25% ความเร็วโจมตี · +10% ดูดเลือด · ออโต้ทำดาเมจกายภาพเพิ่ม 8% (ประชิด) หรือ 5% (ระยะไกล) ของเลือดปัจจุบันเป้า · ตีเป้าเดิมครบ 3 ครั้ง ระเบิด 5% Max HP และขโมยความเร็วเดิน 20% นาน 2 วิ (ทุก 20 วิ ต่อเป้า) | Hiawatha's Tomahawk (13g) + Lamia's Blood Needle (15g) + Siren's Song-Flask (15g) |
| **Atalanta's Swift Quiver** `atq`<br>กระบอกศรอตาลันตา | 58g | 106% | +45 AD · +20% ความเร็วโจมตี · +25% โอกาสคริ · ออโต้ครั้งแรกของการเข้าปะทะ ได้ความเร็วเดิน +35% แล้วค่อยๆ จางใน 2.5 วิ (ทุก 15 วิ) | Hou Yi's Sunpiercer Arrow (16g) + Atalanta's Swift Fletching (15g) + Crow Feather (5g) |
| **Odysseus' Unstrung Bow** `oub`<br>คันศรที่ไม่มีใครน้าวไหว | 60g | 101% | +40 AD · +25% ความเร็วโจมตี · +25% โอกาสคริ · เก็บศพหรือช่วยเก็บ ได้ระยะโจมตี +100 และความเร็วเดิน +8% นาน 6 วิ | Hou Yi's Sunpiercer Arrow (16g) + Valkyrie's Twin Plumes (12g) + Dvalinn's Whetted Chisel (16g) |
| **Skadi's Triple Arrow** `sta`<br>ศรสามดอกสกาดี | 56g | 86% | +35% ความเร็วโจมตี · +25% โอกาสคริ · +7% ความเร็วเดิน · ออโต้ยิงลูกเสริมใส่ศัตรูข้างเคียงอีก 2 ตัวในระยะ 500 ตัวละ 40% Total AD | Valkyrie's Twin Plumes (12g) + Atalanta's Swift Fletching (15g) + Icarus' Wax-Bound Wings (14g) |

### ซัพพอร์ต (SUPPORT) — 11 ชิ้น

| ไอเทม | ราคา | ความคุ้ม | ค่าสถานะและพาสซีฟ | สร้างจาก |
|---|---:|---:|---|---|
| **Asclepius' Twin Serpent Staff** `ats`<br>คทาอสรพิษคู่แอสคลีเปียส | 46g | `พาสซีฟเขียนมือ` | +45 AP · +10 Ability Haste · ฮีล/โล่ที่จ่ายให้เพื่อน +12% · ฮีลหรือกางโล่ให้เพื่อน ส่งต่อผล 25% ให้เพื่อนที่เลือดเหลือน้อยสุดในระยะ 750 ด้วย | Idunn's Spring Water (13g) + Chiron's Chanted Ribbon (12g) |
| **Aceso's Guiding Censer** `acb`<br>กระถางกำยานอเคโซ | 46g | `พาสซีฟเขียนมือ` | +50 AP · +10 Ability Haste · +25 ความเร็วเดิน · ฮีล/โล่ที่จ่ายให้เพื่อน +14% · ฮีลหรือกางโล่ให้เพื่อน ทั้งคู่ได้ 4 วิ · ความเร็วโจมตี +15% (+0.5% ต่อเลเวล) · ออโต้แถมดาเมจเวท 5 (+1.5 ต่อเลเวล) (+5% AP) | Idunn's Spring Water (13g) + Nymph's Graceful Veil (13g) |
| **Saraswati's Flowing Veena** `sfv`<br>พิณธารปัญญาสรัสวดี | 46g | `พาสซีฟเขียนมือ` | +40 AP · +10 Ability Haste · ฮีล/โล่ที่จ่ายให้เพื่อน +10% · ฮีลหรือกางโล่ให้เพื่อน ทั้งคู่ได้ 4 วิ · AP +13 (+1 ต่อเลเวล) · Ability Haste +15 | Idunn's Spring Water (13g) + Chiron's Chanted Ribbon (12g) |
| **Yggdrasil's Radiant Heartwood** `yrh`<br>แก่นไม้อิกดราซิล | 48g | `พาสซีฟเขียนมือ` | +35 AP · +150 HP · +10 Ability Haste · ฮีล/โล่ที่จ่ายให้เพื่อน +10% · ฮีล/โล่ที่จ่ายให้เพื่อน +4% ต่อไอเทม Tier 3 ที่ถืออยู่ (รวมชิ้นนี้) | Idunn's Spring Water (13g) + Nymph's Dewdrop (8g) |
| **Eir's Sanctuary Bell** `esb`<br>ระฆังเขตบุญแห่งเออีร์ | 48g | `พาสซีฟเขียนมือ` | +250 HP · +15 Ability Haste · ฮีล/โล่ที่จ่ายให้เพื่อน +12% · เพื่อนเลือดต่ำกว่า 40% กางวง 700 หน่วย อีก 2 วิ ฮีลทุกคนในวง 10% Max HP (ทุก 60 วิ) | Chiron's Chanted Ribbon (12g) + Nymph's Dewdrop (8g) |
| **Aeolus' Bound Winds** `abw`<br>ถุงลมกักวายุแอโอลัส | 46g | `พาสซีฟเขียนมือ` | +40 AP · +10 Ability Haste · +20 ความเร็วเดิน · ฮีล/โล่ที่จ่ายให้เพื่อน +10% · กดเองตามจังหวะ — เข้าปะทะ เพื่อนโดนสโลว์ หรือเพื่อนเลือดต่ำกว่าครึ่ง · เพื่อนในระยะ 700 ได้ความเร็วเดิน +20% ถึง +45% ตามเลเวล แล้วค่อยๆ จางใน 3 วิ (ทุก 20 วิ) | Nymph's Graceful Veil (13g) + Chiron's Chanted Ribbon (12g) |
| **Hermes' Moly Blossom** `hmb`<br>ดอกโมลีแห่งเฮอร์มีส | 48g | `พาสซีฟเขียนมือ` | +30 AP · +100 HP · +15 Ability Haste · ฮีล/โล่ที่จ่ายให้เพื่อน +15% · ล้างสถานะติดตัวทุกชนิดให้เพื่อนหรือตัวเองทันที (รวมสโลว์และใบ้) + กัน CC 1 วิ + ฮีล 50 (+6 ต่อเลเวล) (+25% AP) (ทุก 60 วิ) | Chiron's Chanted Ribbon (12g) + Idunn's Spring Water (13g) |
| **Pridwen's Iron Bastion** `pib`<br>ป้อมปราการเหล็กพริตเวน | 48g | `พาสซีฟเขียนมือ` | +175 HP · +25 เกราะ · +25 ต้านเวท · เพื่อนเลือดต่ำกว่า 50% กางโล่ให้เพื่อนในระยะ 700 เท่ากับ 100 (+15 ต่อเลเวล) นาน 3 วิ (ทุก 60 วิ) | Gargoyle's Bastion (15g) + Nymph's Dewdrop (8g) |
| **Gjallarhorn's War Clarion** `gwc`<br>แตรศึกกยัลลาร์ฮอร์น | 46g | `พาสซีฟเขียนมือ` | +250 HP · +30 เกราะ · +10 Ability Haste · ออร่ารอบตัว 600 หน่วย เพื่อนได้ความเร็วเดิน +15 และความเร็วโจมตี +10% ตลอดเวลาที่ยังไม่ตาย | Golem's Plated Rib (16g) + Straw Sandals (6g) |
| **Oath of the Dioscuri** `ood`<br>คำสัตย์แห่งไดออสคูรี | 48g | `พาสซีฟเขียนมือ` | +250 HP · +30 เกราะ · ผูกกับเพื่อน 1 คน (เน้นแครี่) · รับดาเมจแทน 15% (หยุดเมื่อตัวเองเลือดต่ำกว่า 20%) · ฮีลตัวเอง 10% ของดาเมจที่เพื่อนทำได้ · เพื่อนตายแล้วผูกใหม่ใน 5 วิ | Golem's Plated Rib (16g) + Pendulum of Neverland (15g) |
| **Ariadne's Guiding Thread** `agt`<br>เส้นด้ายนำทางอาเรียดเน | 48g | 105% | +35 AP · +250 HP · +15 Ability Haste · ฮีล/โล่ที่จ่ายให้เพื่อน +10% · ตีศัตรูที่ติดสโลว์หรือ CC อยู่ จะแปะตรานาน 4 วิ · ดาเมจครั้งถัดไปจากทีมเราแรงขึ้น 15% หนึ่งครั้ง (ทุก 8 วิ ต่อเป้า) | Cerridwen's Brewing Ladle (15g) + Chiron's Chanted Ribbon (12g) + Idunn's Spring Water (13g) |

