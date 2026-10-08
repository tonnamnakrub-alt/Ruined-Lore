// ---------------------------------------------------------------
// บทพูดในเกม — เพื่อนร่วมทีมตะโกนบอกกันระหว่างไฟต์ และบีเอ็มตอนจบยก
//
// ทุกบรรทัดเป็นภาษาอังกฤษแบบที่คนเล่นจริงพิมพ์กัน ไม่ได้แปลเป็นไทย
// เพราะในเกมจริงคนพิมพ์คำพวกนี้เป็นอังกฤษกันหมด ไม่ว่าจะเล่นภาษาอะไร
// (ตรงนี้จงใจไม่ผ่าน tr() — ดูคอมเมนต์ที่ chatText ใน engine/chat.js)
//
// แต่ละหมวดมีหลายบรรทัดให้สลับ จะได้ไม่ซ้ำจนน่ารำคาญ
// ---------------------------------------------------------------

// ---- ระหว่างไฟต์: บอกสถานะตัวเองให้เพื่อนรู้ ----
export const CALLOUTS = {
  // อัลติพร้อมแล้ว
  ultReady: ["My ultimate is ready", "ult up", "R is up", "ulti ready"],
  // เลือดน้อย ขอฮีล
  needHeal: ["I need heal", "low hp", "heal pls", "im low"],
  // กำลังจะตาย ขอให้ถอย
  backOff: ["back back back", "disengage", "fall back", "dont force"],
  // เก็บได้
  gotKill: ["nice", "gg ez", "got one", "down"],
  // ตาย
  died: ["my bad", "sry", "ff", "unlucky"],
  // เห็นศัตรูยกมา
  enemyComing: ["careful", "theyre coming", "ss", "watch out"],
  // พร้อมบุก
  goIn: ["go go go", "engage", "im in", "all in"],
};

// ---- จบยก: ฝ่ายชนะพิมพ์บีเอ็ม ----
// แบ่งตามว่าชนะขาดแค่ไหน — ชนะขาดก็กวนมากหน่อย ชนะหวุดหวิดก็ให้เกียรติกัน
export const BM_WIN = {
  // ชนะแบบไม่เสียเลนเลย — กวนได้เต็มที่
  stomp: ["EZ", "ez game", "Bot", "unlucky", "?", "sit", "diff", "stop", "uninstall", "ez clap", "free lp", "too easy"],
  // ชนะแบบปกติ
  clean: ["EZ", "gg", "ez", "well played", "gl hf", "gg ez", "nice try", "ok", "next"],
  // ชนะแบบเฉียดฉิว — ให้เกียรติกัน
  close: ["gg", "good fight", "close one", "wp", "gg wp", "that was close", "nice game"],
};

// ---- จบยก: ฝ่ายแพ้ตอบ ----
export const BM_LOSE = ["gg", "wp", "report jungle", "mid diff", "nt", "?", "jg diff", "no ss", "team diff", "sure", "ff 15", "lag"];

// กี่วินาทีถึงจะให้คนเดิมพูดซ้ำได้ — กันไม่ให้สแปมทั้งไฟต์
export const CHAT_COOLDOWN = 6.0;
// ทั้งทีมพูดรวมกันได้ถี่แค่ไหน
export const CHAT_TEAM_GAP = 1.1;
// เก็บบรรทัดล่าสุดไว้กี่บรรทัด
export const CHAT_KEEP = 40;
