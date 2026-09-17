// ---------------------------------------------------------------
// จับคู่ด้วย "รหัสห้องสั้นๆ" — เจ้าบ้านได้รหัส 5 ตัว เพื่อนพิมพ์รหัสแล้วเข้าได้เลย
//
// เส้นทางข้อมูลยังเป็น WebRTC ต่อตรงสองเครื่องเหมือนเดิมทุกอย่าง
// เซิร์ฟเวอร์กลาง (broker ฟรีของ PeerJS) ใช้แค่ตอน "หากันให้เจอ" ครั้งแรกเท่านั้น
// พอต่อติดแล้วข้อมูลไฟต์ไม่ได้วิ่งผ่านเซิร์ฟเวอร์นั้นเลย
// ---------------------------------------------------------------

import { Peer } from "peerjs";

const ICE = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// ตัวอักษรที่อ่านผิดยาก — ตัด I O 0 1 ออกเพื่อไม่ให้พิมพ์ผิด
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PREFIX = "rl-";   // กันชนกับห้องของเกมอื่นที่ใช้ broker ตัวเดียวกัน

export function makeCode(n = 5) {
  let s = "";
  for (let i = 0; i < n; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  return s;
}

export const normCode = (c) => String(c || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
const peerId = (code) => PREFIX + normCode(code);

// ห่อ DataConnection ของ PeerJS ให้หน้าตาเหมือน createPeer เดิม
// ทั้งสองแบบจึงใช้แทนกันได้ในโค้ดฝั่งเกมโดยไม่ต้องแยกทาง
function wrap(conn, handlers) {
  const api = {
    conn,
    isHost: false,
    get open() { return !!conn && conn.open; },
    send(msg) { if (api.open) conn.send(msg); },
    close() { try { conn.close(); } catch { /* ปิดไปแล้วก็ช่างมัน */ } },
  };
  conn.on("open", () => handlers.onOpen && handlers.onOpen());
  conn.on("close", () => handlers.onClose && handlers.onClose());
  conn.on("error", () => handlers.onClose && handlers.onClose());
  conn.on("data", (raw) => {
    let m;
    try { m = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return; }
    if (m && handlers.onMessage) handlers.onMessage(m);
  });
  return api;
}

// ปกติใช้ broker ฟรีของ PeerJS — ตั้ง window.RL_PEER ทับได้ถ้าจะรันเซิร์ฟเวอร์เอง
function newPeer(id) {
  const over = typeof window !== "undefined" ? window.RL_PEER : null;
  return new Peer(id, { config: ICE, debug: 0, ...(over || {}) });
}

// รอ broker ตอบว่าจองรหัสนี้ได้ — ถ้ารหัสซ้ำจะโยน error ให้สุ่มใหม่
function ready(peer) {
  return new Promise((ok, fail) => {
    const t = setTimeout(() => fail(new Error("ต่อเซิร์ฟเวอร์จับคู่ไม่ได้")), 12000);
    peer.on("open", () => { clearTimeout(t); ok(peer); });
    peer.on("error", (e) => { clearTimeout(t); fail(e); });
  });
}

// ---- เจ้าบ้าน: จองรหัสห้อง แล้วรอผู้เล่นเข้ามากี่คนก็ได้ตามที่กำหนด ----
//   onPeer(index) ต้องคืน handlers ของสายนั้น
export async function hostRoom(onPeer, slots = 1) {
  let peer = null;
  let code = "";
  // รหัสอาจชนกับห้องที่ยังเปิดอยู่ — สุ่มใหม่ได้สามครั้ง
  for (let tries = 0; tries < 3; tries++) {
    code = makeCode();
    const p = newPeer(peerId(code));
    try { await ready(p); peer = p; break; } catch (e) {
      try { p.destroy(); } catch { /* ยังไม่ทันเกิดก็ช่างมัน */ }
      if (tries === 2 || !/unavailable|taken/i.test(String(e.type || e.message))) throw e;
    }
  }
  const links = [];
  peer.on("connection", (conn) => {
    const i = links.length;
    if (i >= slots) { try { conn.close(); } catch { /* เต็มแล้ว */ } return; }
    const api = wrap(conn, onPeer(i));
    api.isHost = true;
    links.push(api);
  });
  return {
    code,
    links,
    close() { try { peer.destroy(); } catch { /* ปิดไปแล้ว */ } },
  };
}

// ---- ผู้เข้าร่วม: พิมพ์รหัสแล้วต่อเข้าห้องนั้น ----
export async function joinRoom(code, handlers) {
  const c = normCode(code);
  if (c.length < 4) throw new Error("รหัสห้องสั้นเกินไป");
  const peer = await ready(newPeer(undefined));
  const conn = peer.connect(peerId(c), { reliable: true });
  const api = wrap(conn, handlers);
  api.peer = peer;
  const orig = api.close;
  api.close = () => { orig(); try { peer.destroy(); } catch { /* ปิดไปแล้ว */ } };
  // ต่อไม่ติดภายใน 15 วิ แปลว่าไม่มีห้องนั้นอยู่จริง
  await new Promise((ok, fail) => {
    const t = setTimeout(() => fail(new Error("ไม่พบห้องรหัสนี้ หรือเจ้าบ้านปิดไปแล้ว")), 15000);
    conn.on("open", () => { clearTimeout(t); ok(); });
    peer.on("error", (e) => { clearTimeout(t); fail(e); });
  });
  return api;
}
