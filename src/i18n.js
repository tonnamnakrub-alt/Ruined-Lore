// ---------------------------------------------------------------
// ภาษา / Language
// ข้อความในซอร์สเป็นภาษาไทย แล้ว t() แปลงเป็นอังกฤษตาม DICT
// ถ้าไม่มีในพจนานุกรม จะคืนข้อความไทยเดิม (ไม่พังหน้าจอ)
//
// UI copy lives in Thai in the source; t() maps it to English via DICT.
// Missing keys fall back to the Thai string.
// ---------------------------------------------------------------
import { DICT } from "./i18n-en.js";

export const LANGS = [
  { id: "en", label: "EN", name: "English" },
  { id: "th", label: "TH", name: "ไทย" },
];

let LANG = "en";

export function setLang(l) {
  LANG = l === "th" ? "th" : "en";
}

export function getLang() {
  return LANG;
}

// t("ข้อความ") หรือ t("เหลือ {0} แต้ม", n)
export function tr(str, ...args) {
  let out = str;
  if (LANG === "en") out = DICT[str] != null ? DICT[str] : str;
  if (args.length) out = out.replace(/\{(\d+)\}/g, (m, i) => (args[i] == null ? m : args[i]));
  return out;
}

// ชื่อไอเทมเก็บเป็น "English — ไทย" อยู่แล้ว เลยแค่เลือกข้าง
export const t = tr;   // alias

export function itemName(it) {
  if (!it) return "";
  const raw = String(it.th || "");
  const parts = raw.split("—");
  if (parts.length < 2) return raw.trim();
  return (LANG === "en" ? parts[0] : parts[1]).trim();
}
