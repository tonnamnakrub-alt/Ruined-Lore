// ---------------------------------------------------------------
// ต่อกันตรงๆ ระหว่างสองเครื่อง ไม่ผ่านเซิร์ฟเวอร์ใคร (WebRTC DataChannel)
//
// การจับคู่ใช้วิธี "แลกโค้ดด้วยมือ" — ไม่ต้องมี signalling server เลย
//   host  createOffer()   -> ได้โค้ดก้อนที่ 1 ส่งให้เพื่อน
//   guest joinWithOffer() -> ได้โค้ดก้อนที่ 2 ส่งกลับ
//   host  acceptAnswer()  -> เชื่อมต่อสำเร็จ
//
// โค้ดคือ SDP ที่เข้ารหัส base64 — ส่งทางไลน์/ดิสคอร์ดได้เลย
// ---------------------------------------------------------------

const ICE = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const enc = (obj) => {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/=+$/, "");
};

const dec = (code) => {
  let c = String(code).trim().replace(/\s+/g, "");
  while (c.length % 4) c += "=";
  const bin = atob(c);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
};


// รอจนกว่า ICE จะเก็บเส้นทางครบ ไม่งั้นโค้ดที่ได้จะต่อไม่ติด
function waitIce(pc) {
  return new Promise((done) => {
    if (pc.iceGatheringState === "complete") { done(); return; }
    const t = setTimeout(done, 4000);   // บางเครือข่ายเก็บไม่ครบสักที ก็เอาเท่าที่มี
    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") { clearTimeout(t); done(); }
    });
  });
}


export function createPeer(handlers = {}) {
  const pc = new RTCPeerConnection(ICE);
  let ch = null;
  const api = {
    pc,
    isHost: false,
    get open() { return !!ch && ch.readyState === "open"; },
    send(msg) { if (api.open) ch.send(JSON.stringify(msg)); },
    close() { try { if (ch) ch.close(); pc.close(); } catch { /* ปิดไปแล้วก็ช่างมัน */ } },
  };

  const wire = (c) => {
    ch = c;
    c.onopen = () => handlers.onOpen && handlers.onOpen();
    c.onclose = () => handlers.onClose && handlers.onClose();
    c.onmessage = (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m && handlers.onMessage) handlers.onMessage(m);
    };
  };

  pc.onconnectionstatechange = () => {
    if (/failed|closed/.test(pc.connectionState)) handlers.onClose && handlers.onClose();
  };

  // ---- ฝั่งสร้างห้อง ----
  api.createOffer = async () => {
    api.isHost = true;
    wire(pc.createDataChannel("rl", { ordered: true }));
    await pc.setLocalDescription(await pc.createOffer());
    await waitIce(pc);
    return enc({ t: "o", sdp: pc.localDescription.sdp });
  };
  api.acceptAnswer = async (code) => {
    const m = dec(code);
    if (m.t !== "a") throw new Error("โค้ดนี้ไม่ใช่โค้ดตอบกลับ");
    await pc.setRemoteDescription({ type: "answer", sdp: m.sdp });
  };

  // ---- ฝั่งเข้าห้อง ----
  api.joinWithOffer = async (code) => {
    const m = dec(code);
    if (m.t !== "o") throw new Error("โค้ดนี้ไม่ใช่โค้ดสร้างห้อง");
    pc.ondatachannel = (e) => wire(e.channel);
    await pc.setRemoteDescription({ type: "offer", sdp: m.sdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await waitIce(pc);
    return enc({ t: "a", sdp: pc.localDescription.sdp });
  };

  return api;
}
