import { setLang, tr } from "./src/i18n.js";
import { ITEM_BY_ID } from "./src/data/items.js";
import { itemDesc } from "./src/ui/item-desc.js";
setLang("en");
let leaks = 0;
for (const id of ["hys","asf","lbn","wtb","asc","swf","slh","wtc","ulf","ivd","boe","sst","hth","asq","pcp","isw","ccr","ngv","ats","acb","sfv","yrh","esb","abw","hmb","pib","gwc","ood","sil","ftf","iwf","abc","dwh","slf","bbt","lgf","fcl","mwh","iwb","afw","dvc","exn","wbp","cbc","nvs"]) {
  const d = itemDesc(ITEM_BY_ID[id]);
  const thai = d.match(/[฀-๿]+/g);
  if (thai) { leaks++; console.log("LEAK", id, "->", d); }
  else console.log(id.padEnd(4), d);
}
for (const s of ["ไอเทม Indra's Vajra Dart","ไอเทม Shiva's Trishula","ไอเทม Hephaestus' Twin Hammers","ไอเทม Bow of Eurytus","มาร์คแมน","ซัพพอร์ต","ไอเทม Asclepius' Twin Serpent Staff","ไอเทม Hermes' Moly Blossom","ไอเทม Pridwen's Iron Bastion","ไอเทม Eir's Sanctuary Bell","ไอเทม Oath of the Dioscuri","{0} {1} กางโล่ให้ทั้งทีม","ชิ้นส่วน Tier 1","ชิ้นส่วน Tier 2","แอสซาซิน","เวท","{0} · {1} ชิ้น (+{2} ที่สายอื่นใช้ร่วมได้)"]) {
  const out = tr(s);
  if (/[฀-๿]/.test(out)) { leaks++; console.log("LEAK str:", s, "->", out); }
  else console.log("  str ok:", out);
}
console.log(leaks ? "FAIL " + leaks : "ALL EN OK");
