import { MONO, SANS } from "./theme.js";


// ---------------------------------------------------------------
// ตัววาดเอฟเฟกต์กลาง — ใช้ร่วมกันทั้งสนามจริงและหน้าซ้อมมือ
//
// ทุกก้อนเอฟเฟกต์เป็นข้อมูลนิ่งๆ ที่เอนจินโยนมา ({kind, x, y, t, ...})
// ตัวสุ่มทั้งหมดจึงต้องคำนวณจากตำแหน่งและเวลาเกิด ไม่ใช่ Math.random()
// ไม่งั้นประกายไฟจะกระพริบเปลี่ยนทิศทุกเฟรม
// ---------------------------------------------------------------

// สุ่มแบบคงที่ — อินพุตเดิมได้ค่าเดิมเสมอ
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}


// เส้นโค้งจังหวะ — พุ่งออกแรงตอนต้นแล้วค่อยๆ ช้าลง ทำให้แรงปะทะรู้สึก "ตึง" กว่าเชิงเส้น
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeOutQuad = (k) => 1 - (1 - k) * (1 - k);


// ดาวกระจายตอนกระแทก — ขีดหนาสั้นที่พุ่งออกจากจุดโดน อ่านง่ายกว่าประกายเส้นบางๆ
function burst(ctx, x, y, r, age, a, col, seed, count) {
  const k = easeOut(Math.min(1, age * 1.6));
  ctx.strokeStyle = `rgba(${col},${(a * a).toFixed(3)})`;
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const ang = hash(seed + i * 9.17) * Math.PI * 2;
    const reach = r * (0.8 + hash(seed + i * 4.41) * 0.9);
    const d0 = r * 0.3 + reach * k * 0.75;
    const d1 = d0 + reach * 0.4 * (1 - k);
    ctx.lineWidth = 3.2 * (1 - k) + 0.6;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang) * d0, y + Math.sin(ang) * d0);
    ctx.lineTo(x + Math.cos(ang) * d1, y + Math.sin(ang) * d1);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}


// ---------------------------------------------------------------
// แรงสั่นกล้อง — อ่านจากแรงปะทะที่เพิ่งเกิดในเฟรมนี้
// คิดจาก state.fx ตรงๆ เลยไม่ต้องเก็บตัวแปรค้างไว้ที่ไหน และย้อนดูยกเก่าก็ยังถูก
// เพดานตั้งไว้ต่ำมากโดยตั้งใจ — สั่นพอให้รู้สึกว่าโดน ไม่ใช่สั่นจนอ่านสนามไม่ออก
// ---------------------------------------------------------------
export function shakeAmount(st) {
  let worst = 0;
  for (const f of st.fx) {
    const punchy = f.kind === "shock" || f.kind === "hit" || f.kind === "magic" || f.kind === "true";
    if (!punchy) continue;
    const age = st.t - f.t;
    if (age < 0 || age > 0.16) continue;
    // ก้อนเล็กไม่สั่นเลย เฉพาะหมัดหนักถึงจะขยับกล้อง
    const power = ((f.r || f.size || 0) - 70) / 150;
    if (power <= 0) continue;
    worst = Math.max(worst, Math.min(1, power) * (1 - age / 0.16));
  }
  return worst * 2.6;
}


// ---------------- ชั้นเอฟเฟกต์ที่อยู่ "บนพื้น" ----------------
// โซน วงเตือน สนามน้ำ คลื่น กรง กับดัก และออร่าที่ผูกกับตัวละคร
// แยกไว้ให้ทั้งสนามจริงและห้องซ้อมวาดเหมือนกัน จะได้ไม่ต้องไล่แก้สองที่
export function drawGround(ctx, st, S) {
    // วงเตือนบนพื้น — เติมเป็นพายตามเวลาที่เหลือ จะได้รู้ว่าอีกกี่วิถึงจะระเบิด
    for (const z of st.zones) {
      const x = z.x / S, y = z.y / S, r = z.r / S;
      const total = Math.max(0.15, (z.skill && (z.skill.telegraph || z.skill.delay)) || 0.75);
      const k = Math.max(0, Math.min(1, 1 - (z.at - st.t) / total));
      const col = z.magic ? "176,140,255" : "232,163,61";
      ctx.fillStyle = `rgba(${col},0.10)`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(${col},0.30)`;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(${col},${0.55 + 0.45 * k})`;
      ctx.lineWidth = 1.5 + 2.5 * k;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      // กากบาทเล็งตรงกลาง
      ctx.strokeStyle = `rgba(${col},0.7)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.18, y); ctx.lineTo(x + r * 0.18, y);
      ctx.moveTo(x, y - r * 0.18); ctx.lineTo(x, y + r * 0.18);
      ctx.stroke();
    }

    // โต๊ะน้ำชาของอลิซ — วงหมุนสองชั้นพร้อมจังหวะเต้น
    for (const g of st.gardens || []) {
      const x = g.x / S, y = g.y / S, r = g.r / S;
      const beat = Math.max(0, 1 - (st.t - (g.next - g.skill.every)) / g.skill.every);
      ctx.fillStyle = `rgba(255,143,208,${0.08 + 0.10 * beat})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,143,208,.75)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `rgba(255,196,232,${0.3 + 0.5 * beat})`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const ang = st.t * 1.1 + (i * Math.PI) / 4;
        ctx.beginPath(); ctx.arc(x, y, r * 0.62, ang, ang + 0.3); ctx.stroke();
      }
    }

    // อาณาเขตกระจกของอลิซ — วงใหญ่ที่มีเส้นแตกเป็นรัศมี
    for (const m of st.mirrors || []) {
      const x = m.x / S, y = m.y / S, r = m.r / S;
      ctx.fillStyle = "rgba(214,120,232,.10)";
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(214,120,232,.8)";
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "rgba(214,120,232,.35)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        const ang = (i * Math.PI) / 5 + Math.sin(st.t * 0.7 + i) * 0.08;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * r * 0.25, y + Math.sin(ang) * r * 0.25);
        ctx.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
        ctx.stroke();
      }
    }

    // พายุโลหิตของลอร์ลา — วงรอบตัวที่หมุนตลอดเวลาที่เปิดอยู่
    for (const u of st.units) {
      if (!u.alive || !u.bloodStorm) continue;
      const r = u.bloodStorm.sk.radius / S;
      ctx.fillStyle = "rgba(214,60,90,.09)";
      ctx.beginPath(); ctx.arc(u.x / S, u.y / S, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(214,60,90,.85)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(u.x / S, u.y / S, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "rgba(255,120,150,.6)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const ang = -st.t * 2.4 + (i * Math.PI * 2) / 3;
        ctx.beginPath(); ctx.arc(u.x / S, u.y / S, r * 0.8, ang, ang + 0.5); ctx.stroke();
      }
    }
    for (const f of st.fields || []) {
      ctx.save();
      ctx.translate(f.x / S, f.y / S);
      ctx.rotate(Math.atan2(f.ny, f.nx));
      ctx.fillStyle = "rgba(75,141,248,.15)";
      ctx.fillRect(-f.halfLen / S, -f.halfW / S, (f.halfLen * 2) / S, (f.halfW * 2) / S);
      ctx.restore();
    }
    for (const w of st.waves || []) {
      ctx.save();
      ctx.translate(w.x / S, w.y / S);
      ctx.rotate(Math.atan2(w.ny, w.nx));
      const hw = w.halfW / S;
      const g = ctx.createLinearGradient(-26, 0, 6, 0);
      g.addColorStop(0, "rgba(120,190,255,0)");
      g.addColorStop(1, "rgba(180,220,255,.75)");
      ctx.fillStyle = g;
      ctx.fillRect(-26, -hw, 32, hw * 2);
      ctx.fillStyle = "rgba(220,240,255,.95)";
      ctx.fillRect(-2, -hw, 5, hw * 2);
      ctx.restore();
    }
    for (const cg of st.cages || []) {
      const pending = st.t < cg.at;
      ctx.strokeStyle = pending ? "rgba(232,163,61,.45)" : "rgba(228,235,247,.85)";
      ctx.lineWidth = pending ? 1.5 : Math.max(2, cg.thick / S);
      ctx.setLineDash(pending ? [5, 5] : []);
      ctx.beginPath(); ctx.arc(cg.x / S, cg.y / S, cg.r / S, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      if (!pending) {
        ctx.fillStyle = "rgba(228,235,247,.9)";
        ctx.font = "bold 10px " + MONO;
        ctx.textAlign = "center";
        ctx.fillText(String(cg.hp), cg.x / S, (cg.y - cg.r) / S - 12);
      }
    }
    for (const tr of st.traps || []) {
      ctx.strokeStyle = "rgba(232,163,61,.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(tr.x / S, tr.y / S, tr.r / S, 0, Math.PI * 2); ctx.stroke();
    }
}


export function drawFx(ctx, st, S) {
  for (const f of st.fx) {
    const life = f.dur || (f.kind === "num" ? 0.9 : f.kind === "label" ? 1.1 : 0.55);
    const age = (st.t - f.t) / life;
    if (age > 1) continue;
    const a = Math.max(0, 1 - age);
    const col = f.color || "255,208,138";
    const seed = f.x * 0.37 + f.y * 0.11 + f.t * 13.7;

    if (f.kind === "ring") {
      // บานออกเร็วตอนต้นแล้วหน่วง — ให้รู้สึกว่ามีแรงดันดันออกมา ไม่ใช่วงที่โตเรื่อยๆ
      const rr = (f.r / S) * (f.grow ? 0.25 + easeOut(age) * 0.9 : 1);
      // วงในจางๆ ให้รู้สึกว่ามีมวล
      ctx.globalAlpha = a * 0.5;
      const gi = ctx.createRadialGradient(f.x / S, f.y / S, rr * 0.25, f.x / S, f.y / S, Math.max(1, rr));
      gi.addColorStop(0, `rgba(${col},0.04)`);
      gi.addColorStop(1, `rgba(${col},0.26)`);
      ctx.fillStyle = gi;
      ctx.beginPath(); ctx.arc(f.x / S, f.y / S, rr, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a;
      ctx.strokeStyle = `rgba(${col},1)`;
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(f.x / S, f.y / S, rr, 0, Math.PI * 2); ctx.stroke();
      // แกนขาวบางๆ ทับบนเส้น ทำให้ขอบวงคมขึ้นบนพื้นมืด
      ctx.globalAlpha = a * 0.55;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(f.x / S, f.y / S, rr, 0, Math.PI * 2); ctx.stroke();
      // ขอบนอกบางๆ วิ่งตามหลัง
      ctx.globalAlpha = a * 0.45;
      ctx.strokeStyle = `rgba(${col},1)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(f.x / S, f.y / S, rr * 1.13, 0, Math.PI * 2); ctx.stroke();
    } else if (f.kind === "shock") {
      // คลื่นกระแทกก้อนใหญ่ — วงหนาที่บานออกแล้วจางหายเร็ว
      const k = easeOut(age);
      const rr = (f.r / S) * (0.2 + k * 1.25);
      // วาบสว่างตรงกลางตอนระเบิดออก
      const flash = Math.max(0, 1 - age * 5);
      if (flash > 0) {
        const g = ctx.createRadialGradient(f.x / S, f.y / S, 0, f.x / S, f.y / S, Math.max(1, rr * 0.9));
        g.addColorStop(0, `rgba(255,255,255,${(flash * 0.75).toFixed(3)})`);
        g.addColorStop(1, `rgba(${col},0)`);
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(f.x / S, f.y / S, rr * 0.9, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = a * a;
      ctx.strokeStyle = `rgba(${col},1)`;
      ctx.lineWidth = 8 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(f.x / S, f.y / S, rr, 0, Math.PI * 2); ctx.stroke();
      // วงที่สองวิ่งตามหลังนิดหน่อย ให้คลื่นดูมีความหนา
      ctx.globalAlpha = a * a * 0.4;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x / S, f.y / S, rr * 0.72, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      burst(ctx, f.x / S, f.y / S, (f.r / S) * 0.95, age, a, col, seed, 12);
    } else if (f.kind === "flash") {
      const rr = (f.r / S) * (1 - age * 0.5);
      const g = ctx.createRadialGradient(f.x / S, f.y / S, 0, f.x / S, f.y / S, Math.max(1, rr));
      g.addColorStop(0, `rgba(${col},${(a * 0.85).toFixed(3)})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(f.x / S, f.y / S, rr, 0, Math.PI * 2); ctx.fill();
    } else if (f.kind === "beam" && f.x2 != null) {
      const w = Math.max(2, (f.w || 8) / S);
      // เรืองแสงรอบลำแสงก่อน แล้วค่อยวาดแกนสว่างทับ
      ctx.globalAlpha = a * 0.35;
      ctx.strokeStyle = `rgba(${col},1)`;
      ctx.lineWidth = w * 2.6;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(f.x / S, f.y / S); ctx.lineTo(f.x2 / S, f.y2 / S); ctx.stroke();
      ctx.globalAlpha = a;
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(f.x / S, f.y / S); ctx.lineTo(f.x2 / S, f.y2 / S); ctx.stroke();
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = Math.max(1, w * 0.35);
      ctx.beginPath(); ctx.moveTo(f.x / S, f.y / S); ctx.lineTo(f.x2 / S, f.y2 / S); ctx.stroke();
      ctx.lineCap = "butt";
    } else if (f.kind === "trail" && f.x2 != null) {
      ctx.globalAlpha = a * 0.85;
      const g = ctx.createLinearGradient(f.x / S, f.y / S, f.x2 / S, f.y2 / S);
      g.addColorStop(0, `rgba(${col},0)`);
      g.addColorStop(1, `rgba(${col},0.95)`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(f.x / S, f.y / S); ctx.lineTo(f.x2 / S, f.y2 / S); ctx.stroke();
      ctx.lineCap = "butt";
    } else if (f.kind === "cone") {
      ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(f.x / S, f.y / S, 0, f.x / S, f.y / S, Math.max(1, f.r / S));
      g.addColorStop(0, `rgba(${col},0.45)`);
      g.addColorStop(1, `rgba(${col},0.05)`);
      ctx.fillStyle = g;
      ctx.strokeStyle = `rgba(${col},0.95)`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(f.x / S, f.y / S);
      ctx.arc(f.x / S, f.y / S, f.r / S, f.ang - f.half, f.ang + f.half);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // เส้นซี่ในกรวยให้เห็นทิศแรงปะทะ
      ctx.globalAlpha = a * 0.5;
      ctx.lineWidth = 1.2;
      for (let i = 0; i <= 4; i++) {
        const ang = f.ang - f.half + (f.half * 2 * i) / 4;
        ctx.beginPath();
        ctx.moveTo(f.x / S, f.y / S);
        ctx.lineTo(f.x / S + Math.cos(ang) * (f.r / S) * (0.6 + age * 0.4),
          f.y / S + Math.sin(ang) * (f.r / S) * (0.6 + age * 0.4));
        ctx.stroke();
      }
    } else if (f.kind === "aura") {
      const u = st.units.find((x) => x.id === f.id);
      if (u && u.alive) {
        const puls = 0.5 + 0.5 * Math.abs(Math.sin(st.t * 5));
        const rr = f.r / S;
        ctx.globalAlpha = 0.10 + 0.10 * puls;
        ctx.fillStyle = `rgba(${col},1)`;
        ctx.beginPath(); ctx.arc(u.x / S, u.y / S, rr, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.45 + 0.35 * puls;
        ctx.strokeStyle = `rgba(${col},1)`;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(u.x / S, u.y / S, rr, 0, Math.PI * 2); ctx.stroke();
        // ขีดหมุนรอบวง ให้รู้ว่าออร่ายังทำงานอยู่
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const ang = st.t * 1.6 + (i * Math.PI) / 3;
          ctx.beginPath();
          ctx.arc(u.x / S, u.y / S, rr, ang, ang + 0.25);
          ctx.stroke();
        }
      }
    } else if (f.kind === "hit" || f.kind === "magic" || f.kind === "true") {
      const c2 = f.color || (f.kind === "magic" ? "176,140,255" : f.kind === "true" ? "255,255,255" : "255,208,138");
      const x = f.x / S, y = f.y / S;
      const base = f.size / S;
      const k = easeOut(age);
      // แกนสว่างวาบเดียวตอนกระทบ — ดับเร็วมาก ทำหน้าที่เป็น "เฟรมปะทะ"
      const flash = Math.max(0, 1 - age * 4.5);
      if (flash > 0) {
        const fr = base * (0.55 + 0.5 * k);
        const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, fr));
        g.addColorStop(0, `rgba(255,255,255,${(flash * 0.9).toFixed(3)})`);
        g.addColorStop(0.45, `rgba(${c2},${(flash * 0.55).toFixed(3)})`);
        g.addColorStop(1, `rgba(${c2},0)`);
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, fr, 0, Math.PI * 2); ctx.fill();
      }
      // วงกระแทกที่บานออกแล้วบางลง
      const rr = base * (0.3 + k * 1.5);
      ctx.globalAlpha = a * a;
      ctx.strokeStyle = `rgba(${c2},1)`;
      ctx.lineWidth = 3.4 * (1 - k) + 0.7;
      ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = a * 0.35;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, rr * 1.22, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      burst(ctx, x, y, base * 0.85, age, a, c2, seed, 9);
    }
    ctx.globalAlpha = 1;
  }
}


export function drawFxText(ctx, st, S, big) {
  for (const f of st.fx) {
    if (f.kind !== "num" && f.kind !== "label") continue;
    const life = f.kind === "num" ? 0.9 : 1.1;
    const age = (st.t - f.t) / life;
    if (age > 1) continue;
    // ค้างให้อ่านก่อน แล้วค่อยจางในช่วงท้าย — เดิมจางตั้งแต่เฟรมแรกเลยอ่านตัวเลขไม่ค่อยทัน
    const a = age < 0.55 ? 1 : Math.max(0, 1 - (age - 0.55) / 0.45);
    const isNum = f.kind === "num";
    // ลอยขึ้นแบบหน่วง พร้อมเอียงออกข้างเล็กน้อย เลขที่เด้งพร้อมกันจะได้ไม่ทับกัน
    const rise = easeOutQuad(age) * (big ? 30 : 20);
    const drift = isNum ? (hash(f.x * 0.7 + f.t * 31.3) - 0.5) * (big ? 16 : 11) * easeOutQuad(age) : 0;
    const x = f.x / S + drift, y = f.y / S - rise;
    // ดาเมจก้อนใหญ่ตัวโตกว่า — เห็นปุ๊บรู้เลยว่าเพิ่งกินหนัก
    const dmg = isNum ? Math.abs(parseFloat(f.text)) || 0 : 0;
    const heft = isNum ? Math.min(1, dmg / 420) : 0;
    const size = isNum ? (big ? 13 : 11) + heft * (big ? 9 : 7) : (big ? 12 : 10);
    // เด้งเข้าเกินขนาดนิดนึงแล้วยุบกลับ ให้เลขมีน้ำหนักตอนโผล่
    const pop = age < 0.18 ? 1 + (1 - age / 0.18) * 0.5 : 1;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y);
    if (pop !== 1) ctx.scale(pop, pop);
    ctx.font = `bold ${size.toFixed(1)}px ` + (isNum ? MONO : SANS);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // เรืองแสงอ่อนๆ หลังตัวเลขหนักๆ ให้เด่นขึ้นมาจากพื้น
    if (heft > 0.25) {
      ctx.shadowColor = f.color || "#FFD08A";
      ctx.shadowBlur = 10 * heft;
    }
    // ขอบดำบางๆ ให้ตัวเลขอ่านออกบนพื้นสว่าง
    ctx.lineWidth = 3.4;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(6,10,20,.9)";
    ctx.strokeText(f.text, 0, 0);
    ctx.shadowBlur = 0;
    ctx.fillStyle = f.color || (isNum ? "#FFD08A" : "#8CBEFF");
    ctx.fillText(f.text, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
