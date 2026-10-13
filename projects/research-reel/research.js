/* Research Tool reel, 1080 x 1920 @ 30 fps, 42 s. One deterministic timeline: window.renderFrame(f) draws frame f.
   ?v=ig     Instagram: proof line "Now you know what works", CTA Comment "RESEARCH"
   ?v=yt     YouTube Shorts: same, CTA points to the pinned comment
   ?v=ig220  the 220x proof line. Only render this once the 71 and 220x figures are confirmed (see README).
   Animation beats key off spoken word indices (timing.js, written by vo.py), shot cuts follow the brief. */

const V = new URLSearchParams(location.search).get('v') || 'ig';
const TM = TIMING[V];
const FPS = 30, W = 1080, H = 1920, TOTAL = TM.total;
window.TOTAL_FRAMES = Math.round(TOTAL * FPS);
const CLAIM = V === 'ig220', YT = V === 'yt';

/* locked palette, plus the functional terminal green the brief allows */
const C = { ember: '#FF3300', emberDk: '#E62E00', ink: '#111111', paper: '#FFFFFF', amber: '#FFB020',
  ui: '#1A1A1A', ui2: '#242424', ui3: '#333333', mute: 'rgba(255,255,255,0.55)', ok: '#3DDC84', skin: '#FEC890' };
const HEAD = '"Montserrat", sans-serif', MONO = '"JetBrains Mono", monospace';

/* shot cut times (brief: 0, 3, 9, 17, 26, 34, 42) */
const SH = [0, 3.0, 8.9, 16.95, 26.0, 34.1, TOTAL];

/* ---------- word timing ---------- */
const WT = {}; TM.words.forEach(w => WT[w.i] = w);
const T = i => WT[i].t, E = i => WT[i].e;

/* ---------- maths ---------- */
const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ramp = (t, a, d) => cl((t - a) / d);
const eo = k => 1 - Math.pow(1 - k, 3);
const ei = k => k * k * k;
const eio = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const back = k => { const c = 2.0; return k >= 1 ? 1 : 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const pop = (t, t0, d = 0.24) => t < t0 ? 0 : back(cl((t - t0) / d));
function rnd(s) { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
const D2R = Math.PI / 180;

/* ---------- canvas + assets ---------- */
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const POSE = {
  point: { fade: { L: 0.33 }, eyes: [[309, 552], [544, 607]], eyeR: [66, 74],
    hand: { poly: [[800, 540], [1236, 540], [1236, 1010], [1150, 1300], [920, 1300], [830, 1010]], pivot: [1035, 1290] } },
  think: { fade: {}, eyes: [[435, 322], [612, 350]], eyeR: [58, 66] },
  grin:  { fade: { L: 0.70 }, eyes: [[723, 462], [935, 506]], eyeR: [64, 72] },
  cheer: { fade: { L: 0.22, R: 0.14 } },
  wave:  { fade: { L: 0.56, R: 0.33 }, eyes: [[588, 577], [838, 532]], eyeR: [66, 74],
    hand: { poly: [[10, 590], [530, 590], [565, 950], [430, 1110], [340, 1265], [100, 1265], [20, 1000]], pivot: [210, 1240] } },
};
const pc = {};   // pose canvases with cut edges faded
function loadImg(src) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; }); }
async function loadPoses() {
  for (const n of Object.keys(POSE)) {
    const im = await loadImg(`assets/byte_${n}.png`);
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    for (const [side, yf] of Object.entries(POSE[n].fade)) {
      const m = document.createElement('canvas'); m.width = im.width; m.height = im.height;
      const mg = m.getContext('2d'), k = im.width * 0.16, y0 = im.height * yf;
      const gx = side === 'L' ? mg.createLinearGradient(0, 0, k, 0) : mg.createLinearGradient(im.width, 0, im.width - k, 0);
      gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.55, 'rgba(0,0,0,0.55)'); gx.addColorStop(1, 'rgba(0,0,0,0)');
      mg.fillStyle = gx; mg.fillRect(side === 'L' ? 0 : im.width - k, 0, k, im.height);
      mg.globalCompositeOperation = 'destination-in';
      const gy = mg.createLinearGradient(0, y0 - 60, 0, y0 + 120);
      gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(1, 'rgba(0,0,0,1)');
      mg.fillStyle = gy; mg.fillRect(0, 0, im.width, im.height);
      g.globalCompositeOperation = 'destination-out'; g.drawImage(m, 0, 0); g.globalCompositeOperation = 'source-over';
    }
    pc[n] = c;
  }
}

/* Byte: anchored at bottom centre (x, y). o.h = drawn height. hand = degrees for the separated hand layer. */
function byte(p, o) {
  const im = pc[p], P = POSE[p], s = o.h / im.height;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.translate(o.x, o.y); ctx.rotate((o.rot || 0) * D2R);
  ctx.scale(s * (o.sx || 1) * (o.flip ? -1 : 1), s * (o.sy || 1));
  ctx.translate(-im.width / 2, -im.height);
  if (P.hand) {
    const { poly, pivot } = P.hand, path = () => { ctx.beginPath(); poly.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); };
    ctx.save(); ctx.beginPath(); ctx.rect(-10, -10, im.width + 20, im.height + 20);
    poly.slice().reverse().forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
    ctx.clip('evenodd'); ctx.drawImage(im, 0, 0); ctx.restore();
    ctx.save(); ctx.translate(pivot[0], pivot[1]); ctx.rotate((o.hand || 0) * D2R); ctx.translate(-pivot[0], -pivot[1]);
    path(); ctx.clip(); ctx.drawImage(im, 0, 0); ctx.restore();
  } else ctx.drawImage(im, 0, 0);
  if (o.blink && P.eyes) {                       // eyelids: skin over the eye, ink lash line
    const [rx, ry] = P.eyeR, k = o.blink;
    for (const [ex, ey] of P.eyes) {
      ctx.fillStyle = C.skin; ctx.beginPath(); ctx.ellipse(ex, ey - ry * (1 - k) * 0.4, rx, ry * k, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(ex, ey + ry * k * 0.35, rx * 0.95, ry * 0.28, 0, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
  }
  if (o.extra) o.extra(ctx);
  ctx.restore();
}
const blinkAt = (t, t0) => { const k = (t - t0) / 0.16; return k < 0 || k > 1 ? 0 : Math.sin(k * Math.PI); };

/* ---------- text ---------- */
function font(size, weight = 900, fam = HEAD) { ctx.font = `${weight} ${size}px ${fam}`; }
function fitSize(str, size, maxW, weight = 900, fam = HEAD) { font(size, weight, fam); const w = ctx.measureText(str).width; return w > maxW ? size * maxW / w : size; }
function text(str, x, y, size, o = {}) {
  const wgt = o.weight || 900, fam = o.fam || HEAD;
  const sz = o.maxW ? fitSize(str, size, o.maxW, wgt, fam) : size;
  font(sz, wgt, fam); ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'alphabetic';
  if (o.stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.stroke; ctx.lineWidth = o.sw || sz * 0.16; ctx.strokeText(str, x, y); }
  ctx.fillStyle = o.color || C.paper; ctx.fillText(str, x, y);
  return sz;
}
/* kinetic headline line: scale about its centre, with optional offset/rotation */
function kline(str, x, y, size, k, o = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x + (o.dx || 0), y + (o.dy || 0)); ctx.rotate((o.rot || 0) * D2R);
  const s = o.scale ?? 1; ctx.scale(s, s); ctx.globalAlpha = o.alpha ?? 1;
  text(str, 0, size * 0.36, size, { maxW: o.maxW || 920, color: o.color, stroke: o.stroke, sw: o.sw, weight: o.weight });
  ctx.restore();
}

/* ---------- shared drawing ---------- */
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function emberBg(t, push = 0) {
  ctx.fillStyle = C.ember; ctx.fillRect(-200, -200, W + 400, H + 400);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = C.emberDk;      // slow diagonal bands keep the flat field alive
  ctx.translate(W / 2, H / 2); ctx.rotate(-28 * D2R);
  const off = (t * 38) % 260;
  for (let x = -1800 + off; x < 1800; x += 260) ctx.fillRect(x, -1600, 90, 3200);
  ctx.restore();
}
function radial(cx, cy, r0, r1, n, k, color = C.emberDk, lw = 14) {
  if (k <= 0) return;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.globalAlpha = Math.min(1, k * 1.5);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + 0.2, rr0 = r0 + (r1 - r0) * 0.15 * (1 - k), rr1 = lerp(r0, r1, eo(k));
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * rr0, cy + Math.sin(a) * rr0); ctx.lineTo(cx + Math.cos(a) * rr1, cy + Math.sin(a) * rr1); ctx.stroke();
  }
  ctx.restore();
}
function marks(x, y, k, ang = -60, color = C.paper, len = 46) {   // hand-drawn emphasis strokes
  if (k <= 0) return;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 11; ctx.lineCap = 'round';
  [-34, 0, 34].forEach((d, i) => {
    const a = (ang + d) * D2R, r0 = 30 + 20 * (1 - eo(k)), r1 = r0 + len * eo(cl(k * 1.4 - i * 0.12));
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke();
  });
  ctx.restore();
}
function finger(x, y, rot, press = 0) {   // stylised index finger, tip at (x, y)
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot * D2R); const s = 1 - press * 0.08; ctx.scale(s, s);
  ctx.lineWidth = 9; ctx.strokeStyle = C.ink; ctx.fillStyle = C.skin;
  rr(-38, -6, 76, 330, 38); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FFE3C4'; rr(-22, 8, 44, 52, 18); ctx.fill();
  ctx.strokeStyle = 'rgba(17,17,17,0.35)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-16, 120); ctx.quadraticCurveTo(0, 128, 16, 120); ctx.stroke();
  ctx.restore();
}
function ripple(x, y, k) {
  if (k <= 0 || k >= 1) return;
  ctx.save(); ctx.strokeStyle = C.paper; ctx.globalAlpha = 1 - k; ctx.lineWidth = 8 * (1 - k) + 2;
  ctx.beginPath(); ctx.arc(x, y, 20 + 70 * eo(k), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}
function phoneBody(x, y, w, h, rot, sh, screen) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot * D2R); if (sh) ctx.transform(1, 0, sh, 1, 0, 0);
  ctx.fillStyle = 'rgba(17,17,17,0.35)'; rr(-w / 2 + 18, -h / 2 + 26, w, h, w * 0.14); ctx.fill();   // drop shadow
  ctx.fillStyle = C.ink; rr(-w / 2, -h / 2, w, h, w * 0.14); ctx.fill();
  ctx.strokeStyle = '#3A3A3A'; ctx.lineWidth = 5; ctx.stroke();
  const b = w * 0.035, sx = -w / 2 + b, sy = -h / 2 + b, sw = w - 2 * b, shh = h - 2 * b;
  ctx.save(); rr(sx, sy, sw, shh, w * 0.11); ctx.clip(); ctx.fillStyle = '#0B0B0B'; ctx.fillRect(sx, sy, sw, shh);
  ctx.translate(sx, sy); screen(sw, shh); ctx.restore();
  ctx.fillStyle = C.ink; rr(-w * 0.14, -h / 2 + b + 12, w * 0.28, w * 0.07, w * 0.035); ctx.fill();          // island
  ctx.restore();
}
function statusBar(sw, s) {
  font(26 * s, 700, HEAD); ctx.fillStyle = C.paper; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('9:41', 42 * s, 40 * s);
  ctx.fillRect(sw - 92 * s, 30 * s, 44 * s, 20 * s);
}
function thumb(x, y, w, h, seed, r = 10) {   // illustrative reel thumbnail, palette only
  const g = ctx.createLinearGradient(x, y, x, y + h);
  const v = Math.floor(rnd(seed) * 4);
  const tops = ['#3A1408', '#2B2B2B', '#4A1A06', '#1F1F1F'], bots = ['#111111', '#161616', '#1B0A04', '#262626'];
  g.addColorStop(0, tops[v]); g.addColorStop(1, bots[v]); ctx.fillStyle = g; rr(x, y, w, h, r); ctx.fill();
  ctx.save(); rr(x, y, w, h, r); ctx.clip();
  ctx.fillStyle = rnd(seed + 1) > 0.5 ? C.ember : C.amber; ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.arc(x + w * (0.3 + rnd(seed + 2) * 0.4), y + h * 0.36, w * 0.17, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1; ctx.fillStyle = '#0A0A0A';
  ctx.beginPath(); ctx.moveTo(x, y + h * 0.7); ctx.lineTo(x + w * 0.35, y + h * (0.5 + rnd(seed + 3) * 0.1)); ctx.lineTo(x + w * 0.7, y + h * 0.66); ctx.lineTo(x + w, y + h * 0.55); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); const px = x + w * 0.12, py = y + h - w * 0.16, ps = w * 0.09;
  ctx.moveTo(px, py - ps); ctx.lineTo(px + ps * 1.4, py); ctx.lineTo(px, py + ps); ctx.fill();
  ctx.restore();
}
function tag(str, x, y, align = 'left', size = 22) {   // small "illustrative" label
  font(size, 700, HEAD); ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillText(str, x, y);
}

/* ---------- camera ---------- */
function cam(s, cx = W / 2, cy = H / 2, dx = 0, dy = 0, rot = 0) {   // scale about (cx, cy), which stays put
  ctx.translate(cx + dx, cy + dy); ctx.rotate(rot * D2R); ctx.scale(s, s); ctx.translate(-cx, -cy);
}
function shake(t, t0, amp = 14, d = 0.12) {
  if (t < t0 || t > t0 + d) return [0, 0];
  const k = 1 - (t - t0) / d, f = Math.floor(t * FPS);
  return [(rnd(f) - 0.5) * 2 * amp * k, (rnd(f + 9) - 0.5) * 2 * amp * k];
}
function flash(t, t0, frames = 2, color = C.paper, a = 1) {
  if (t >= t0 && t < t0 + frames / FPS) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

/* ======================= SHOT 1: TITLE ======================= */
function shot1(t) {
  const u = t - SH[0];
  const snap = eo(ramp(u, 2.72, 0.28));
  const [sx, sy] = shake(u, T(1) - 0.04, 16, 0.14);
  ctx.save(); cam(1 + 0.02 * ramp(u, 0, 3) + 0.07 * snap, 540, 760, sx, sy);
  emberBg(t);
  // title
  const k1 = pop(u, T(0) + 0.03, 0.3);
  kline('RESEARCH', 540, 330, 158, k1, { scale: 0.75 + 0.25 * k1, maxW: 900 });
  const k2 = ramp(u, T(1) - 0.1, 0.16);
  kline('TOOL', 540, 520, 230, k2 > 0 ? 1 : 0, { dy: 300 * (1 - eo(k2)), scale: 1 + 0.06 * (1 - ramp(u, T(1) + 0.06, 0.2)), maxW: 640 });
  // Byte, pointing, lower right
  const bk = pop(u, 0.48, 0.32);
  if (u > 0.48) {
    const hk = u < 0.7 ? 0 : back(cl((u - 0.7) / 0.16));
    const breathe = Math.sin(u * Math.PI * 1.3) * 0.008 * ramp(u, 1.4, 0.3);
    const bounce = Math.sin(cl((u - 1.2) / 0.3) * Math.PI) * 0.03;
    byte('point', { x: 740 + 560 * (1 - bk), y: 1945 + 120 * (1 - bk), h: 1260, rot: 6 * (1 - bk) - 1.5 * hk,
      sy: 1 + breathe + bounce, sx: 1 - bounce * 0.5, hand: -28 * (1 - hk), blink: blinkAt(u, 1.2),
      extra: c => { marks(1040, 560, ramp(u, 0.9, 0.22), -90, C.paper, 70); } });
  }
  ctx.restore();
  flash(u, 0, 2);
}

/* ======================= SHOT 2: THE PAIN ======================= */
const FOLDERS = [['Reels 1', 247], ['Reels 2', 198], ['AI Tools', 56], ['Business', 312], ['Ideas', 143], ['Marketing', 26], ['Inspo', 177],
  ['Hooks', 89], ['Edits', 64], ['Save for later', 401], ['Viral', 233], ['Scripts', 38], ['Trends', 121], ['Misc', 518]];
function scroll2(u) {   // folder list then thumbnail feed, scrolling faster and faster, hard stop on "chaos"
  const stop = T(12) + 0.28 - SH[1];
  const uu = Math.min(u, stop);
  let p = 0;
  p += 240 * eio(ramp(uu, 0.9, 0.5));                // first slide past
  p += 520 * eio(ramp(uu, 1.4, 0.4));                // finger swipe
  p += Math.max(0, uu - 1.8) * 900 + Math.pow(Math.max(0, uu - 3.2), 2) * 2600;   // accelerating feed
  return p;
}
function shot2(t) {
  const u = t - SH[1], stopT = T(12) + 0.28 - SH[1];
  const settle = 1 + 0.1 * (1 - eo(ramp(u, 0, 0.3)));
  const push = 0.06 * eio(ramp(u, T(11) - 0.15 - SH[1], 0.8));
  const snap = 0.1 * ei(ramp(u, 5.62, 0.28));
  const [sx, sy] = shake(u, stopT, 22, 0.18);
  ctx.save(); cam(settle + push + snap, 560, 900, sx, sy);
  emberBg(t);
  // headline in two chunks
  const h1 = pop(u, T(2) - SH[1] - 0.08, 0.26), h2 = pop(u, T(2) - SH[1] + 0.16, 0.26);
  kline('RESEARCH IS', 540, 300, 118, h1 > 0 ? 1 : 0, { dy: -320 * (1 - h1), maxW: 900 });
  kline('A MESS', 540, 430, 118, h2 > 0 ? 1 : 0, { dy: -320 * (1 - h2), maxW: 900 });
  // phone
  const tilt = eo(ramp(u, 0.6, 0.35)), p = scroll2(u), feed = u > 1.8;
  const pw = 580, ph = 1000, px = 600, py = 1060 + 40 * (1 - eo(ramp(u, 0, 0.3)));
  phoneBody(px, py, pw, ph, -4 * tilt + Math.sin(u * 2.1) * 0.6, -0.04 * tilt, (sw, shh) => {
    const s = sw / 520;
    if (!feed) {
      statusBar(sw, s);
      font(40 * s, 800); ctx.fillStyle = C.paper; ctx.textAlign = 'left'; ctx.fillText('Saved', 90 * s, 120 * s);
      ctx.strokeStyle = C.paper; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(52 * s, 106 * s); ctx.lineTo(38 * s, 120 * s); ctx.lineTo(52 * s, 134 * s); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.rect(0, 160 * s, sw, shh); ctx.clip();
      const rowH = 118 * s, off = p % (rowH * FOLDERS.length);
      for (let k = -1; k < 12; k++) {
        const idx = ((Math.floor(p / rowH) + k) % FOLDERS.length + FOLDERS.length) % FOLDERS.length;
        const y = 170 * s + k * rowH - (p % rowH);
        thumb(30 * s, y + 12 * s, 92 * s, 92 * s, idx * 7 + 1, 16 * s);
        font(34 * s, 700); ctx.fillStyle = C.paper; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(FOLDERS[idx][0], 146 * s, y + 52 * s);
        font(26 * s, 600); ctx.fillStyle = C.mute; ctx.fillText(`${FOLDERS[idx][1]} posts`, 146 * s, y + 88 * s);
        ctx.strokeStyle = C.mute; ctx.lineWidth = 4 * s; ctx.beginPath();
        ctx.moveTo(sw - 50 * s, y + 46 * s); ctx.lineTo(sw - 36 * s, y + 60 * s); ctx.lineTo(sw - 50 * s, y + 74 * s); ctx.stroke();
        // unread badges pulse briefly
        const bk = ramp(u, 2.2 + (idx % 3) * 0.12, 0.2) * (1 - ramp(u, 2.9, 0.3));
        if (bk > 0 && idx % 2 === 0) {
          ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(sw - 110 * s, y + 60 * s, 22 * s * (1 + 0.25 * Math.sin(bk * Math.PI)), 0, Math.PI * 2); ctx.fill();
          font(22 * s, 800); ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('+' + (3 + idx * 2), sw - 110 * s, y + 61 * s); ctx.textBaseline = 'alphabetic';
        }
      }
      ctx.restore();
    } else {
      const tw = (sw - 12 * s) / 3, th = tw * 1.6, off = p - 760;
      for (let k = -2; k < 12; k++) for (let c = 0; c < 3; c++) {
        const row = Math.floor(off / (th + 6 * s)) + k, y = 120 * s + k * (th + 6 * s) - (off % (th + 6 * s));
        thumb(c * (tw + 6 * s), y, tw, th, row * 3 + c + 50, 0);
      }
      ctx.fillStyle = C.ink; ctx.fillRect(0, 0, sw, 96 * s); statusBar(sw, s);
      // motion streaks once the feed is flying
      const sp = ramp(u, 3.2, 0.4) * (u < stopT ? 1 : 0);
      if (sp > 0) { ctx.fillStyle = `rgba(255,255,255,${0.16 * sp})`; for (let i = 0; i < 9; i++) ctx.fillRect(rnd(i + Math.floor(u * 30)) * sw, 0, 3 * s, shh); }
    }
    tag('ILLUSTRATIVE UI', sw / 2, shh - 26 * s, 'center', 20 * s);
  });
  // finger swipes on the screen
  const sw1 = ramp(u, 1.35, 0.42), sw2 = ramp(u, 2.95, 0.3), sw3 = ramp(u, 3.35, 0.26);
  const fsw = sw1 > 0 && sw1 < 1 ? sw1 : sw2 > 0 && sw2 < 1 ? sw2 : sw3 > 0 && sw3 < 1 ? sw3 : -1;
  if (fsw >= 0) finger(660 + 40 * fsw, 1380 - 520 * eio(fsw), -14);
  // chaos: thumbnails burst out of the phone and pile up
  const ck = ramp(u, T(11) - SH[1] + 0.1, 0.7);
  if (ck > 0) for (let i = 0; i < 12; i++) {
    const a = rnd(i * 3.1) * Math.PI * 2, d = 260 + rnd(i * 5.7) * 300, k = eo(cl(ck * 1.3 - i * 0.04));
    const x = px + Math.cos(a) * d * k, y = py - 60 + Math.sin(a) * d * 0.9 * k;
    ctx.save(); ctx.translate(x, y); ctx.rotate((rnd(i * 9.3) - 0.5) * 70 * D2R * k);
    ctx.fillStyle = C.paper; rr(-86, -142, 172, 284, 14); ctx.fill(); thumb(-78, -134, 156, 268, i * 13 + 5, 10); ctx.restore();
  }
  // stop frame
  if (u >= stopT && u < stopT + 0.1) { ctx.fillStyle = 'rgba(17,17,17,0.35)'; ctx.fillRect(-200, -200, W + 400, H + 400); }
  // Byte, thinking, lower left (mirrored so the cut side sits on the frame edge)
  const bk = pop(u, T(6) - SH[1] + 0.25, 0.3);
  if (bk > 0) {
    const scratch = Math.sin(cl((u - 2.8) / 0.9) * Math.PI * 6) * 2.2 * (u > 2.8 && u < 3.7 ? 1 : 0);
    const side = eo(ramp(u, stopT + 0.35, 0.2));
    byte('think', { x: 225 - 40 * side, y: 1935 + 500 * (1 - bk), h: 640, flip: true, rot: scratch - 5 * side,
      extra: c => { if (side > 0) {                    // sweat drop on the side-eye
        c.save(); c.translate(300, 90 + 40 * eo(ramp(u, stopT + 0.45, 0.4))); c.scale(-1.7, 1.7);
        c.fillStyle = C.paper; c.strokeStyle = C.ink; c.lineWidth = 9; c.beginPath(); c.moveTo(0, -60);
        c.bezierCurveTo(30, -10, 38, 30, 0, 40); c.bezierCurveTo(-38, 30, -30, -10, 0, -60); c.fill(); c.stroke(); c.restore(); } } });
  }
  ctx.restore();
}

/* ======================= SHOT 3: THE DEMO ======================= */
function reelScreen(sw, shh, s, u, liked, playing = 1) {
  const g = ctx.createLinearGradient(0, 0, 0, shh);
  g.addColorStop(0, '#2A0C02'); g.addColorStop(0.45, '#C42800'); g.addColorStop(0.62, '#FF6A1A'); g.addColorStop(1, '#111111');
  ctx.fillStyle = g; ctx.fillRect(0, 0, sw, shh);
  ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(sw * 0.5, shh * 0.52 - u * 14 * playing, sw * 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(0, shh * 0.62);
  ctx.lineTo(sw * 0.22, shh * 0.5); ctx.lineTo(sw * 0.42, shh * 0.6); ctx.lineTo(sw * 0.66, shh * 0.46); ctx.lineTo(sw, shh * 0.58); ctx.lineTo(sw, shh); ctx.lineTo(0, shh); ctx.fill();
  // tiny figure walking
  const fx = sw * (0.34 + u * 0.01 * playing), fy = shh * 0.64;
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(fx, fy - 70 * s, 16 * s, 0, Math.PI * 2); ctx.fill(); rr(fx - 16 * s, fy - 52 * s, 32 * s, 74 * s, 12 * s); ctx.fill();
  // caption lines + handle
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(52 * s, shh - 170 * s, 22 * s, 0, Math.PI * 2); ctx.fill();
  rr(86 * s, shh - 182 * s, 150 * s, 22 * s, 11 * s); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; rr(32 * s, shh - 128 * s, 330 * s, 16 * s, 8 * s); ctx.fill(); rr(32 * s, shh - 100 * s, 240 * s, 16 * s, 8 * s); ctx.fill();
  // progress bar
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(0, shh - 8 * s, sw, 8 * s);
  ctx.fillStyle = C.paper; ctx.fillRect(0, shh - 8 * s, sw * (0.2 + u * 0.12) % sw, 8 * s);
  // action rail: like, comment, share
  const rx = sw - 60 * s;
  heart(rx, shh * 0.56, 30 * s, liked);
  ctx.strokeStyle = C.paper; ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.arc(rx, shh * 0.56 + 120 * s, 26 * s, 0.3, Math.PI * 2 - 0.1); ctx.stroke();
  plane(rx, shh * 0.56 + 240 * s, 30 * s);
}
function heart(x, y, r, fill) {
  ctx.save(); ctx.translate(x, y); const s = 1 + 0.35 * Math.sin(cl(fill * 1.0) * Math.PI) * (fill < 1 ? 1 : 0); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(0, r * 0.9); ctx.bezierCurveTo(-r * 1.6, -r * 0.2, -r * 0.7, -r * 1.3, 0, -r * 0.45);
  ctx.bezierCurveTo(r * 0.7, -r * 1.3, r * 1.6, -r * 0.2, 0, r * 0.9);
  if (fill > 0) { ctx.fillStyle = C.amber; ctx.fill(); }
  ctx.strokeStyle = fill > 0 ? C.amber : C.paper; ctx.lineWidth = r * 0.2; ctx.stroke(); ctx.restore();
}
function plane(x, y, r) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = C.paper; ctx.lineWidth = r * 0.2; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-r, -r * 0.7); ctx.lineTo(r, -r * 0.9); ctx.lineTo(-r * 0.1, r); ctx.lineTo(-r * 0.25, -r * 0.05); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.05); ctx.lineTo(r, -r * 0.9); ctx.stroke(); ctx.restore();
}
function linkIcon(x, y, r, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-45 * D2R); ctx.strokeStyle = color; ctx.lineWidth = r * 0.22;
  rr(-r * 1.05, -r * 0.38, r * 1.15, r * 0.76, r * 0.38); ctx.stroke(); rr(-r * 0.1, -r * 0.38, r * 1.15, r * 0.76, r * 0.38); ctx.stroke(); ctx.restore();
}
const TERM_LINES = ['Analyzing reel...', 'Extracting transcript...', 'Identifying hook...', 'Structuring insights...'];
const CMD = '> analyze this reel';
const LINK = 'instagram.com/reel/...';
function terminal(x, y, w, h, u, a) {   // u: seconds since the terminal appeared (shot 3 local)
  ctx.save(); ctx.globalAlpha = a;
  ctx.shadowColor = 'rgba(255,176,32,0.55)'; ctx.shadowBlur = 50;
  ctx.fillStyle = '#121212'; rr(x, y, w, h, 26); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = C.amber; ctx.lineWidth = 5; ctx.stroke();
  ctx.fillStyle = '#1C1C1C'; rr(x, y, w, 70, [26, 26, 0, 0]); ctx.fill();
  [0, 1, 2].forEach(i => { ctx.fillStyle = '#3A3A3A'; ctx.beginPath(); ctx.arc(x + 34 + i * 30, y + 35, 9, 0, Math.PI * 2); ctx.fill(); });
  // Claude spark + title
  ctx.save(); ctx.translate(x + 150, y + 36); ctx.strokeStyle = '#D97757'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, 15); ctx.stroke(); }
  ctx.restore();
  text('claude code', x + 176, y + 46, 30, { align: 'left', weight: 500, fam: MONO, color: C.paper });
  // body
  const lx = x + 30, ly = y + 130, lh = 56; ctx.textBaseline = 'alphabetic';
  const typed = Math.floor(cl((u - 0.25) / 0.55) * CMD.length);
  text(CMD.slice(0, typed), lx, ly, 32, { align: 'left', weight: 500, fam: MONO, color: C.paper, base: 'alphabetic' });
  if (u > 0.85) { ctx.fillStyle = 'rgba(255,176,32,0.18)'; rr(lx + 24, ly + 18, 400, 46, 8); ctx.fill();
    text(LINK, lx + 36, ly + 52, 28, { align: 'left', weight: 500, fam: MONO, color: C.amber }); }
  const t0 = 1.25, step = 0.62;
  TERM_LINES.forEach((s, i) => {
    const ts = t0 + i * step; if (u < ts) return;
    const done = u > ts + 0.42, yy = ly + lh * (2 + i) + 10;
    if (done) text('✓', lx, yy, 32, { align: 'left', weight: 500, fam: MONO, color: C.ok });
    else { const sp = '|/-\\'[Math.floor(u * 16) % 4]; text(sp, lx, yy, 32, { align: 'left', weight: 500, fam: MONO, color: C.amber }); }
    text(s, lx + 40, yy, 30, { align: 'left', weight: 500, fam: MONO, color: done ? C.ok : C.paper });
  });
  const tDone = t0 + 3 * step + 0.62;
  if (u > tDone) {
    const yy = ly + lh * 6 + 22;
    text('Done.', lx, yy, 32, { align: 'left', weight: 500, fam: MONO, color: C.paper });
    if (Math.floor(u * 2.5) % 2 === 0) { ctx.fillStyle = C.paper; ctx.fillRect(lx + 104, yy - 26, 18, 32); }
  }
  ctx.restore();
  return tDone;
}
function shot3(t) {
  const u = t - SH[2];
  const tLike = T(13) - SH[2] + 0.1, tShare = T(15) - SH[2] + 0.05, tSheet = tShare + 0.25, tCopy = T(16) - SH[2] + 0.25;
  const tSplit = T(18) - SH[2];                       // pull back to phone + terminal on "into your Claude Code"
  const tTerm = T(20) - SH[2] - 0.05;
  const split = eio(ramp(u, tSplit, 0.45));
  const tuOff = tTerm;                                // terminal clock
  const tDone = 1.25 + 3 * 0.62 + 0.62;
  const pushT = tuOff + 2.7;
  const push = 0.12 * eio(ramp(u, pushT, 0.9));
  ctx.save(); cam(1 + push - 0.04 * split * (1 - ramp(u, pushT, 0.9)) + 0.08 * ei(ramp(u, 7.8, 0.25)), lerp(540, 610, ramp(u, pushT, 0.9)), lerp(960, 800, ramp(u, pushT, 0.9)));
  emberBg(t);
  // phone: big close-up, then shrinks to the left
  const pw = lerp(640, 290, split), ph = pw * 1.78, px = lerp(540, 185, split), py = lerp(1020, 800, split);
  const liked = ramp(u, tLike + 0.08, 0.25);
  phoneBody(px, py, pw, ph, lerp(0, -5, split), 0, (sw, shh) => {
    const s = sw / 600; reelScreen(sw, shh, s, u, liked, u < tSplit ? 1 : 0);
    const shk = eo(ramp(u, tSheet, 0.28)) * (1 - eo(ramp(u, tCopy + 0.5, 0.25)));
    if (shk > 0) {                                     // share sheet
      const sy = shh - 420 * s * shk;
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, sw, shh);
      ctx.fillStyle = '#1E1E1E'; rr(0, sy, sw, 460 * s, 34 * s); ctx.fill();
      ctx.fillStyle = '#555'; rr(sw / 2 - 40 * s, sy + 16 * s, 80 * s, 10 * s, 5 * s); ctx.fill();
      text('Share', sw / 2, sy + 76 * s, 32 * s, { weight: 800 });
      for (let i = 0; i < 4; i++) { ctx.fillStyle = '#3A3A3A'; ctx.beginPath(); ctx.arc(80 * s + i * 146 * s, sy + 160 * s, 46 * s, 0, Math.PI * 2); ctx.fill(); }
      const acts = ['Copy link', 'Add to story', 'More'];
      acts.forEach((a, i) => {
        const ax = 100 * s + i * 200 * s, ay = sy + 300 * s, hot = i === 0 && u > tCopy;
        ctx.fillStyle = hot ? C.amber : '#333'; ctx.beginPath(); ctx.arc(ax, ay, 46 * s, 0, Math.PI * 2); ctx.fill();
        if (i === 0) linkIcon(ax, ay, 26 * s, hot ? C.ink : C.paper);
        else { ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(ax, ay, 8 * s, 0, Math.PI * 2); ctx.fill(); }
        text(a, ax, ay + 84 * s, 24 * s, { weight: 700, color: hot ? C.amber : C.paper });
      });
    }
    const toast = ramp(u, tCopy + 0.1, 0.15) * (1 - ramp(u, tCopy + 1.2, 0.2));
    if (toast > 0) { ctx.globalAlpha = toast; ctx.fillStyle = C.paper; rr(sw / 2 - 150 * s, 150 * s, 300 * s, 70 * s, 35 * s); ctx.fill();
      text('Link copied', sw / 2, 196 * s, 30 * s, { weight: 800, color: C.ink }); ctx.globalAlpha = 1; }
  });
  // finger taps: like, share, copy link
  const taps = [[tLike, 0.82, 0.56], [tShare, 0.82, 0.56 + 240 / 1068], [tCopy, 0.155, 0.76]];
  for (const [tt, fx, fy] of taps) {
    const k = ramp(u, tt - 0.25, 0.25), out = ramp(u, tt + 0.12, 0.2);
    if (k > 0 && out < 1) {
      const x = px - pw / 2 + pw * fx, y = py - ph / 2 + ph * fy;
      finger(x + 120 * (1 - eo(k)) + 160 * ei(out), y + 260 * (1 - eo(k)) + 300 * ei(out), -18, u > tt && u < tt + 0.1 ? 1 : 0);
    }
    ripple(px - pw / 2 + pw * fx, py - ph / 2 + ph * fy, ramp(u, tt, 0.3));
  }
  // terminal + travelling link card + arrow
  const tx = 405, ty = 545, tw = 605, th = 500;
  if (u > tTerm) {
    const tu = u - tuOff, a = eo(ramp(tu, 0, 0.2));
    ctx.save(); ctx.translate(tx + tw / 2, ty + th / 2); ctx.scale(0.85 + 0.15 * back(cl(tu / 0.3)), 0.85 + 0.15 * back(cl(tu / 0.3))); ctx.translate(-(tx + tw / 2), -(ty + th / 2));
    terminal(tx, ty, tw, th, tu, a); ctx.restore();
  }
  const ak = eo(ramp(u, tSplit + 0.3, 0.4));
  if (ak > 0) {                                       // arrow draws from phone to terminal
    const ax0 = px + 20, ay0 = py - ph / 2 - 18, ax1 = tx + 190, ay1 = ty - 16;
    const pulse = 1 + 0.25 * Math.sin(cl((u - 7.55) / 0.3) * Math.PI);
    ctx.save(); ctx.strokeStyle = C.paper; ctx.lineWidth = 14 * pulse; ctx.lineCap = 'round';
    const mx = (ax0 + ax1) / 2, my = Math.min(ay0, ay1) - 95;
    ctx.beginPath(); ctx.moveTo(ax0, ay0);
    const N = 30; for (let i = 1; i <= N * ak; i++) { const k = i / N; ctx.lineTo((1 - k) ** 2 * ax0 + 2 * (1 - k) * k * mx + k * k * ax1, (1 - k) ** 2 * ay0 + 2 * (1 - k) * k * my + k * k * ay1); }
    ctx.stroke();
    if (ak > 0.97) { ctx.fillStyle = C.paper; ctx.translate(ax1, ay1); ctx.rotate(Math.atan2(ay1 - my, ax1 - mx));
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-22 * pulse, -22 * pulse); ctx.lineTo(-22 * pulse, 22 * pulse); ctx.fill(); }
    ctx.restore();
    const ck = ramp(u, tSplit + 0.15, 0.7);          // link card rides the curve
    if (ck > 0 && ck < 1) {
      const k = eio(ck), x = (1 - k) ** 2 * ax0 + 2 * (1 - k) * k * mx + k * k * ax1, y = (1 - k) ** 2 * ay0 + 2 * (1 - k) * k * my + k * k * ay1;
      ctx.save(); ctx.translate(x, y); ctx.rotate((k - 0.5) * 20 * D2R); ctx.scale(1 - 0.3 * k, 1 - 0.3 * k);
      ctx.fillStyle = C.paper; rr(-120, -44, 240, 88, 18); ctx.fill(); thumb(-108, -34, 50, 68, 3, 8);
      linkIcon(-20, 0, 18, C.ink); font(24, 800); ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.fillText('reel link', 10, 9); ctx.restore();
    }
  }
  // Byte leans in from the lower left
  const bk = pop(u, tuOff + 1.6, 0.32);
  if (bk > 0) {
    const lean = eo(ramp(u, tuOff + 2.1, 0.3));
    byte('grin', { x: 330 - 560 * (1 - bk), y: 1960, h: 900, flip: true, rot: -6 * lean,
      sy: 1 + 0.02 * Math.sin(cl((u - tuOff - 2.1) / 0.3) * Math.PI), blink: blinkAt(u, tuOff + 3.6) });
  }
  ctx.restore();
  // headline: LIKE -> SHARE -> / ANALYZED
  const hk1 = pop(u, tLike - 0.05), hk2 = pop(u, tShare - 0.05), hk3 = pop(u, T(24) - SH[2] - 0.05);
  // drawn arrows: the Montserrat subset has no arrow glyph
  font(96, 900); const wl = ctx.measureText('LIKE').width, wsh = ctx.measureText('SHARE').width, aw = 86, gap = 26;
  const totw = wl + wsh + 2 * (aw + 2 * gap), x0 = 540 - totw / 2;
  const arrow = (x, y, k) => { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.strokeStyle = C.paper; ctx.fillStyle = C.paper;
    ctx.lineWidth = 15; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-aw / 2, 0); ctx.lineTo(aw / 2 - 20, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(aw / 2 + 4, 0); ctx.lineTo(aw / 2 - 30, -26); ctx.lineTo(aw / 2 - 30, 26); ctx.closePath(); ctx.fill(); ctx.restore(); };
  if (hk1 > 0) { ctx.save(); ctx.translate(x0 + wl / 2, 260); ctx.scale(hk1, hk1); text('LIKE', 0, 34, 96, { align: 'center' }); ctx.restore(); }
  arrow(x0 + wl + gap + aw / 2, 260, pop(u, tLike + 0.1));
  const xs = x0 + wl + aw + 2 * gap;
  if (hk2 > 0) { ctx.save(); ctx.translate(xs + wsh / 2, 260); ctx.scale(hk2, hk2); text('SHARE', 0, 34, 96, { align: 'center' }); ctx.restore(); }
  arrow(xs + wsh + gap + aw / 2, 260, pop(u, tShare + 0.1));
  kline('ANALYZED', 540, 380, 110, hk3 > 0 ? 1 : 0, { scale: 0.7 + 0.3 * hk3, maxW: 760 });
}

/* ======================= SHOT 4: THE OUTPUT ======================= */
const CARDS = [
  { label: 'TRANSCRIPT', w: 35, from: [-760, -560, -18], x: 300, y: 430 },
  { label: 'HOOK', w: 39, from: [820, 0, 32], x: 780, y: 430 },
  { label: 'FORMAT', w: 42, from: [0, 900, -8], x: 300, y: 760 },
  { label: 'REAL NUMBERS', w: 47, from: [760, -600, 20], x: 780, y: 760 },
];
const cardT = c => T(c.w) - 0.22;
function icon(i, x, y, k) {
  ctx.save(); ctx.translate(x, y); ctx.lineWidth = 9; ctx.strokeStyle = C.paper; ctx.fillStyle = C.paper; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (i === 0) { rr(-46, -36, 92, 64, 14); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-20, 28); ctx.lineTo(-30, 48); ctx.lineTo(0, 28); ctx.stroke();
    ctx.lineWidth = 7; [-14, 4].forEach(yy => { ctx.beginPath(); ctx.moveTo(-26, yy); ctx.lineTo(26, yy); ctx.stroke(); }); }
  if (i === 1) { ctx.fillStyle = C.amber; ctx.beginPath(); ctx.moveTo(0, -52); ctx.bezierCurveTo(30, -20, 40, 0, 34, 20);
    ctx.bezierCurveTo(28, 44, -28, 44, -34, 20); ctx.bezierCurveTo(-38, 0, -20, -14, -14, -30); ctx.bezierCurveTo(-4, -16, 6, -22, 0, -52); ctx.fill();
    ctx.fillStyle = C.ember; ctx.beginPath(); ctx.moveTo(0, -6); ctx.bezierCurveTo(18, 10, 18, 30, 0, 34); ctx.bezierCurveTo(-18, 30, -16, 12, 0, -6); ctx.fill(); }
  if (i === 2) { rr(-44, -44, 88, 88, 12); ctx.stroke(); ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(-44, -12); ctx.lineTo(44, -12); ctx.moveTo(-6, -12); ctx.lineTo(-6, 44); ctx.stroke(); }
  if (i === 3) { [[-36, 20], [-12, 0], [12, -18], [36, -40]].forEach(([bx, by], j) => { ctx.fillRect(bx - 9, by, 18, 44 - by); });
    ctx.fillStyle = C.amber; ctx.beginPath(); ctx.moveTo(30, -56); ctx.lineTo(48, -56); ctx.lineTo(48, -38); ctx.fill(); }
  ctx.restore();
}
function card(c, i, t, pulse) {
  const t0 = cardT(c); if (t < t0) return;
  const k = cl((t - t0) / 0.26), bk = back(k), [fx, fy, fr] = c.from;
  const s = (0.9 + 0.1 * bk) * (1 + 0.07 * pulse);
  ctx.save(); ctx.translate(c.x + fx * (1 - eo(k)), c.y + fy * (1 - eo(k))); ctx.rotate(fr * (1 - bk) * D2R); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(255,51,0,0.7)'; ctx.shadowBlur = 36 + 30 * pulse;
  ctx.fillStyle = '#1A1A1A'; rr(-215, -145, 430, 290, 30); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = C.ember; ctx.lineWidth = 7; ctx.stroke();
  if (k < 0.25) { ctx.fillStyle = `rgba(255,255,255,${1 - k * 4})`; rr(-215, -145, 430, 290, 30); ctx.fill(); }   // impact frame
  icon(i, 0, -42, k);
  text(c.label, 0, 92, 58, { maxW: 380 });
  ctx.restore();
}
function detailPanel(t, which) {   // lower panel shows what the latest card means
  const x = 70, y = 960, w = 940, h = 200;
  ctx.fillStyle = '#161616'; rr(x, y, w, h, 24); ctx.fill(); ctx.strokeStyle = '#2C2C2C'; ctx.lineWidth = 3; ctx.stroke();
  const lt = t - (which >= 0 ? cardT(CARDS[which]) : 0);
  ctx.save(); rr(x, y, w, h, 24); ctx.clip();
  if (which === 0) {
    const lines = ['"Saving reels is easy.', 'Finding the good ones later?', 'Absolute chaos."'];
    lines.forEach((l, j) => { const a = ramp(lt, 0.1 + j * 0.25, 0.2); if (a > 0) text(l, x + 40, y + 62 + j * 50, 34, { align: 'left', weight: 600, color: j === 0 ? C.amber : C.paper }); });
  } else if (which === 1) {
    text('0:00 - 0:03', x + 40, y + 62, 30, { align: 'left', weight: 800, color: C.amber });
    text('"Research tool."', x + 40, y + 150, 46, { align: 'left', weight: 800 });
    for (let j = 0; j < 22; j++) { const hh = (0.3 + 0.7 * rnd(j)) * 120 * (0.6 + 0.4 * Math.sin(t * 9 + j)); ctx.fillStyle = C.amber;
      rr(x + 520 + j * 18, y + h / 2 - hh / 2, 10, hh * ramp(lt, j * 0.02, 0.15), 5); ctx.fill(); }
  } else if (which === 2) {
    const blocks = ['HOOK', 'PAIN', 'DEMO', 'PROOF', 'CTA'];
    blocks.forEach((b, j) => { const a = eo(ramp(lt, 0.05 + j * 0.1, 0.18)); if (a <= 0) return;
      const bx = x + 30 + j * 180, by = y + 50;
      ctx.fillStyle = j === 0 ? C.amber : '#2A2A2A'; rr(bx, by + 20 * (1 - a), 162, 100, 16); ctx.fill();
      text(b, bx + 81, by + 64 + 20 * (1 - a), 34, { weight: 800, color: j === 0 ? C.ink : C.paper }); });
    text('REEL STRUCTURE', x + 40, y + 182, 22, { align: 'left', weight: 700, color: C.mute });
  } else if (which === 3) {
    const labs = ['VIEWS', 'LIKES', 'SAVES', 'SHARES', 'COMMENTS'], hs = [0.9, 0.55, 0.7, 0.42, 0.3];
    labs.forEach((l, j) => { const a = eo(ramp(lt, 0.05 + j * 0.08, 0.3)); const bh = 110 * hs[j] * a;
      ctx.fillStyle = j === 0 ? C.amber : '#EDEDED'; rr(x + 50 + j * 140, y + 140 - bh, 70, bh, 8); ctx.fill();
      text(l, x + 85 + j * 140, y + 178, 20, { weight: 700, color: C.mute }); });
    // line chart across the right side
    const lk = ramp(t, 25.0 - (V ? 0 : 0), 0.9);
    ctx.strokeStyle = C.amber; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.beginPath();
    const pts = 40; for (let j = 0; j <= pts * Math.max(0.35, lk) ; j++) { const xx = x + 760 + j * 4.2, yy = y + 150 - j * 2.2 - Math.sin(j * 0.7) * 9; j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
    ctx.stroke();
    text('SAMPLE DATA', x + w - 30, y + 40, 20, { align: 'right', weight: 700, color: C.mute });
  }
  ctx.restore();
}
function shot4(t) {
  const u = t - SH[3];
  let pulse = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) pulse[i] = Math.sin(cl((t - (E(47) + 0.35 + i * 0.28)) / 0.3) * Math.PI);
  let sx = 0, sy = 0; CARDS.forEach(c => { const s = shake(t, cardT(c) + 0.08, 12, 0.1); sx += s[0]; sy += s[1]; });
  const punch = 0.05 * Math.sin(cl((t - (E(47) + 0.1)) / 0.4) * Math.PI);
  const expand = 0.08 * eio(ramp(t, E(47) + 1.5, 0.8));
  const snap = 0.08 * ei(ramp(u, 8.8, 0.25));
  ctx.save(); cam(1.06 - 0.06 * eo(ramp(u, 0, 0.3)) + punch + expand + snap, 540, 760, sx, sy);
  ctx.fillStyle = '#0E0E0E'; ctx.fillRect(-300, -300, W + 600, H + 600);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;               // drifting grid
  const go = (t * 20) % 80; for (let x = -80 + go; x < W + 80; x += 80) { ctx.beginPath(); ctx.moveTo(x, -300); ctx.lineTo(x, H + 300); ctx.stroke(); }
  for (let y = -80 + go; y < H + 80; y += 80) { ctx.beginPath(); ctx.moveTo(-300, y); ctx.lineTo(W + 300, y); ctx.stroke(); }
  text('Reel Insights', 80, 230, 40, { align: 'left', weight: 800 });
  tag('ILLUSTRATIVE UI', 1000, 218, 'right');
  ctx.fillStyle = C.ember; ctx.beginPath(); ctx.arc(80 + 280, 216, 9, 0, Math.PI * 2); ctx.fill();
  let which = -1; CARDS.forEach((c, i) => { if (t >= cardT(c)) which = i; });
  CARDS.forEach((c, i) => card(c, i, t, pulse[i] > 0 ? pulse[i] : 0));
  if (which >= 0) { const a = eo(ramp(t, cardT(CARDS[0]) + 0.2, 0.25)); ctx.save(); ctx.globalAlpha = a; ctx.translate(0, 40 * (1 - a)); detailPanel(t, which); ctx.restore(); }
  const bk = pop(t, E(47) + 0.15, 0.3);
  if (bk > 0) byte('grin', { x: 290 - 500 * (1 - bk), y: 1960, h: 760, rot: -4, flip: true, blink: blinkAt(t, E(47) + 1.6) });
  ctx.restore();
}

/* ======================= SHOT 5: THE PROOF ======================= */
function shot5(t) {
  const u = t - SH[4];
  const t71 = T(48) - 0.1, tSub = T(50) - 0.05, tB = E(51) - 0.05;
  const t2 = CLAIM ? T(68) - 0.08 : T(52) - 0.05;
  const [sx, sy] = shake(t, t71 + 0.02, 26, 0.12), [sx2, sy2] = shake(t, t2 + 0.02, CLAIM ? 26 : 12, 0.12);
  const push = 0.06 * eio(ramp(u, 5.0, 2.5)), snap = 0.08 * ei(ramp(u, 7.85, 0.25));
  ctx.save(); cam(1 + push + snap, 540, 700, sx + sx2, sy + sy2);
  emberBg(t);
  const lift = CLAIM ? eo(ramp(t, t2 - 0.5, 0.3)) : 0;
  const n71y = (CLAIM ? 470 - 120 * lift : 470);
  radial(540, n71y, 220, 520, 18, ramp(t, t71 + 0.05, 0.3) * (1 - 0.6 * lift), C.emberDk, 16);
  if (CLAIM) radial(540, 830, 200, 460, 16, ramp(t, t2 + 0.05, 0.3), C.emberDk, 14);
  const k71 = ramp(t, t71, 0.2);
  if (k71 > 0) kline('71', 540, n71y, CLAIM ? lerp(400, 300, lift) : 400, 1, { scale: 1.3 - 0.3 * back(k71), maxW: 900 });
  const ks = pop(t, tSub, 0.25);
  kline('REELS ANALYZED', 540, CLAIM ? lerp(740, 590, lift) : 740, 76, ks > 0 ? 1 : 0, { dy: 60 * (1 - ks), alpha: cl(ks * 2), maxW: 860 });
  const k2 = ramp(t, t2, 0.2);
  if (CLAIM) {
    const pz = 1 + 0.08 * Math.sin(cl((u - 6.5) / 0.3) * Math.PI);
    if (k2 > 0) kline('220×', 540, 830, 300, 1, { scale: (1.35 - 0.35 * back(k2)) * pz, dy: 160 * (1 - eo(k2)), maxW: 820 });
    const km = pop(t, T(73), 0.25); kline('MORE REACH', 540, 1010, 76, km > 0 ? 1 : 0, { dy: 50 * (1 - km), maxW: 760 });
  } else {
    const pz = 1 + 0.06 * Math.sin(cl((u - 6.5) / 0.3) * Math.PI);
    if (k2 > 0) kline('FIND WHAT WORKS', 540, 900, 92, 1, { scale: (1.3 - 0.3 * back(k2)) * pz, maxW: 900 });
  }
  // Byte jumps up and cheers
  const bk = ramp(t, tB, 0.4);
  if (bk > 0) {
    const jump = Math.sin(cl(bk) * Math.PI) * 120, rise = 1 - eo(cl(bk * 1.6));
    const hop = Math.abs(Math.sin(cl((u - 4.5) / 0.5) * Math.PI)) * 40 + Math.abs(Math.sin(cl((u - 5.3) / 0.4) * Math.PI)) * 24;
    byte('cheer', { x: 540, y: 1955 + 700 * rise - jump * (1 - rise) - hop, h: CLAIM ? 690 : 760, sy: 1 + 0.03 * Math.sin(u * 7) });
    marks(540 - 300, 1250 - hop, ramp(t, tB + 0.4, 0.25), -130, C.paper, 50);
    marks(540 + 300, 1250 - hop, ramp(t, tB + 0.45, 0.25), -50, C.paper, 50);
  }
  ctx.restore();
  flash(t, SH[4], 3);
}

/* ======================= SHOT 6: THE CTA ======================= */
function shot6(t) {
  const u = t - SH[5];
  const push = 0.04 * eio(ramp(u, 3.9, 3.5));
  ctx.save(); cam(1 + push, 540, 800);
  emberBg(t);
  const k1 = ramp(u, 0.6, 0.3), k2 = pop(u, 1.0, 0.32);
  const pulse = 1 + 0.07 * Math.sin(cl((t - T(YT ? 82 : 62)) / 0.35) * Math.PI);
  if (!YT) {
    kline('Comment', 540, 330, 120, k1 > 0 ? 1 : 0, { dy: -200 * (1 - back(k1)), alpha: cl(k1 * 3), weight: 800, maxW: 700 });
    kline('“RESEARCH”', 540, 500, 150, k2 > 0 ? 1 : 0, { scale: (0.8 + 0.2 * k2) * pulse, color: C.amber, maxW: 940 });
  } else {
    kline('Get it in the', 540, 330, 104, k1 > 0 ? 1 : 0, { dy: -200 * (1 - back(k1)), alpha: cl(k1 * 3), weight: 800, maxW: 800 });
    kline('PINNED COMMENT', 540, 490, 120, k2 > 0 ? 1 : 0, { scale: (0.8 + 0.2 * k2) * pulse, color: C.amber, maxW: 940 });
  }
  const bk = pop(u, 0.12, 0.34);
  const wv = u > 1.9 ? Math.sin((u - 1.9) * Math.PI * 2 / 0.62) * 13 * (1 - ramp(u, 3.6, 0.3)) : 0;
  const raise = u < 1.9 ? -18 * (1 - eo(ramp(u, 1.5, 0.4))) : 0;
  byte('wave', { x: 560, y: 1960 + 600 * (1 - bk), h: 1140, sy: 1 + 0.008 * Math.sin(u * 3), hand: wv + raise, blink: blinkAt(u, 3.4) + blinkAt(u, 6.2),
    extra: c => marks(140, 560, ramp(u, 2.0, 0.25), -130, C.paper, 70) });
  ctx.restore();
}

/* ======================= captions ======================= */
const CAP_TXT = { 48: 'Seventy-one', 49: null, 62: 'RESEARCH', 68: 'Two', 69: 'hundred', 70: 'and', 71: 'twenty' };
const CAPY = [1470, 1250, 1195, 1210, 1085, 705];
const groups = (() => {
  const toks = [];
  TM.words.forEach(w => {
    const tx = w.i in CAP_TXT ? CAP_TXT[w.i] : w.w;
    if (tx === null) { toks[toks.length - 1].e = w.e; toks[toks.length - 1].txt += ''; return; }
    toks.push({ txt: tx, t: w.t, e: w.e, i: w.i });
  });
  const gs = []; let cur = [];
  toks.forEach((k, j) => {
    cur.push(k);
    const end = /[.?!,]$/.test(k.txt), nxt = toks[j + 1], gap = nxt ? nxt.t - k.e : 9;
    if (end || cur.length >= 3 || gap > 0.5 || !nxt) { gs.push(cur); cur = []; }
  });
  return gs.map((g, j) => ({ toks: g, t0: g[0].t - 0.05, t1: Math.min(g[g.length - 1].e + 0.45, gs[j + 1] ? gs[j + 1][0].t - 0.05 : 99) }));
})();
function captions(t) {
  if (t < SH[1]) return;                 // shot 1: the title already shows the spoken words
  const g = groups.find(g => t >= g.t0 && t < g.t1); if (!g) return;
  const shot = SH.findIndex((s, i) => t >= s && t < SH[i + 1]);
  const y = shot === 4 && CLAIM ? 1135 : CAPY[shot];
  font(64, 800); const sp = ctx.measureText(' ').width;
  const ws = g.toks.map(k => ctx.measureText(k.txt).width), tot = ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
  const sc = Math.min(1, 900 / tot), pk = pop(t, g.t0, 0.16);
  ctx.save(); ctx.translate(540, y); ctx.scale(sc * (0.9 + 0.1 * pk), sc * (0.9 + 0.1 * pk));
  let x = -tot / 2;
  g.toks.forEach((k, j) => {
    const active = t >= k.t - 0.02 && (t < k.e + 0.08 || (j === g.toks.length - 1));
    const spoken = t >= k.t - 0.02;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.strokeStyle = C.ink; ctx.lineWidth = 14; ctx.strokeText(k.txt, x, 0);
    ctx.fillStyle = active ? C.amber : spoken ? C.paper : 'rgba(255,255,255,0.85)'; ctx.fillText(k.txt, x, 0);
    x += ws[j] + sp;
  });
  ctx.restore();
}

/* ======================= frame ======================= */
const SHOTS = [shot1, shot2, shot3, shot4, shot5, shot6];
function renderFrame(f) {
  const t = f / FPS;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  const i = Math.max(0, SH.findIndex((s, k) => t >= s && t < SH[k + 1]));
  SHOTS[i === -1 ? 5 : i](t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  captions(t);
  if (window.SAFE) {   // Instagram Reels UI zones, for review stills only
    ctx.fillStyle = 'rgba(0,120,255,0.28)'; ctx.fillRect(0, 0, W, 200); ctx.fillRect(0, 1540, W, 380); ctx.fillRect(940, 900, 140, 640);
  }
}
window.renderFrame = renderFrame;

/* audio cues for audio.py: [type, time, extra] */
window.cues = () => {
  const c = [];
  const add = (type, t, d) => c.push({ type, t: +t.toFixed(3), d });
  add('impact', T(0) + 0.03); add('whoosh', 0.42); add('bass', T(1) - 0.04); add('tick', 0.9);
  add('impact', T(2) - 0.08); add('impact', T(2) + 0.16);
  [[3, 0.9], [3, 1.35], [3, 2.95], [3, 3.35]].forEach(([s, d]) => add('swipe', SH[1] + d));
  for (let k = 0; k < 14; k++) add('tick', SH[1] + 1.8 + k * Math.max(0.07, 0.24 - k * 0.013));
  add('pop', T(6) + 0.25); add('whoosh', T(11) + 0.1); add('stop', T(12) + 0.28);
  const s3 = SH[2], tLike = T(13) + 0.1, tShare = T(15) + 0.05, tCopy = T(16) + 0.25;
  add('tap', tLike); add('pop', tLike + 0.05); add('tap', tShare); add('sheet', tShare + 0.25); add('tap', tCopy);
  add('whoosh', T(18) + 0.1);
  for (let k = 0; k < 6; k++) add('data', T(18) + 0.2 + k * 0.1);
  const tt = T(20) - 0.05;
  for (let k = 0; k < CMD.length; k++) add('key', tt + 0.25 + k * 0.55 / CMD.length);
  for (let k = 0; k < 4; k++) add('tick', tt + 1.25 + k * 0.62 + 0.42);
  add('confirm', tt + 1.25 + 3 * 0.62 + 0.62); add('whoosh', tt + 1.55);
  CARDS.forEach((cd, i) => add('impact' + i, cardT(cd)));
  for (let k = 0; k < 10; k++) add('tick', E(47) + 0.3 + k * 0.28);
  add('riser', E(47) + 1.3, 1.5);
  add('flash', SH[4]); add('impact', T(48) - 0.1); add('bass', T(48) - 0.08); add('pop', T(50) - 0.05); add('whoosh', E(51) - 0.1);
  add(CLAIM ? 'impact' : 'pop', CLAIM ? T(68) - 0.08 : T(52) - 0.05);
  add('whoosh', SH[5] + 0.1); add('pop', SH[5] + 1.0); add('pop', T(YT ? 82 : 62));
  return c;
};

window.ready = (async () => {
  await document.fonts.load('900 100px Montserrat'); await document.fonts.load('800 100px Montserrat');
  await document.fonts.load('700 100px Montserrat'); await document.fonts.load('600 100px Montserrat');
  await document.fonts.load('500 30px "JetBrains Mono"');
  await loadPoses();
  return true;
})();
