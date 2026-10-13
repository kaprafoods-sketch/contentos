/* Opus 5.5 motion design reel, 1080 x 1920 @ 30 fps, about 42 s, 9 shots. One deterministic timeline: window.renderFrame(f).
   ?v=ig  Instagram: CTA Comment "PROMPTS"     ?v=yt  YouTube Shorts: CTA points to the pinned comment
   Beats key off the voiceover words (timing.js from vo.py): SW(section, j) = start of word j in that section. */

const V = new URLSearchParams(location.search).get('v') || 'ig';
const TM = TIMING[V];
const FPS = 30, W = 1080, H = 1920, TOTAL = TM.total;
window.TOTAL_FRAMES = Math.round(TOTAL * FPS);
const YT = V === 'yt';

const C = { ember: '#FF3300', emberDk: '#E62E00', ink: '#111111', paper: '#FFFFFF', amber: '#FFB020',
  mute: 'rgba(255,255,255,0.55)', skin: '#FEC890' };
const HEAD = '"Montserrat", sans-serif', MONO = '"JetBrains Mono", monospace';
const SH = TM.shots;                       // shot cut times
const SW = (s, j) => TM.secs[s].w[j].t, SE = (s, j) => TM.secs[s].w[j].e;

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
  const snap = eo(ramp(u, SH[1] - 0.26, 0.26));
  const t55 = 0.42;
  const [sx, sy] = shake(u, t55, 18, 0.14);
  ctx.save(); cam(1 + 0.02 * ramp(u, 0, 3) + 0.07 * snap, 540, 700, sx, sy);
  emberBg(t);
  const k1 = pop(u, 0.08, 0.3);
  kline('OPUS', 540, 300, 290, k1 > 0 ? 1 : 0, { scale: 0.6 + 0.4 * k1, maxW: 900 });
  const k2 = ramp(u, t55 - 0.12, 0.14);
  kline('5.5', 540, 560, 300, k2 > 0 ? 1 : 0, { dy: 320 * (1 - eo(k2)), scale: 1 + 0.15 * (1 - ramp(u, t55 + 0.04, 0.27)), maxW: 700 });
  const bk = pop(u, 0.5, 0.32);
  if (u > 0.5) {
    const hk = u < 0.72 ? 0 : back(cl((u - 0.72) / 0.16));
    const breathe = Math.sin(u * Math.PI * 1.3) * 0.008 * ramp(u, 1.4, 0.3);
    byte('point', { x: 760 + 560 * (1 - bk), y: 1945 + 120 * (1 - bk), h: 1240, rot: 6 * (1 - bk) - 1.5 * hk,
      sy: 1 + breathe, hand: -28 * (1 - hk), blink: blinkAt(u, 1.6),
      extra: c => marks(1040, 560, ramp(u, 0.92, 0.22), -90, C.amber, 70) });
  }
  ctx.restore();
  flash(u, 0, 2);
}

/* ======================= SHOT 2: THE OLD PAIN ======================= */
let meltSrc = null;
function makeMelt() {
  meltSrc = document.createElement('canvas'); meltSrc.width = 900; meltSrc.height = 400;
  const g = meltSrc.getContext('2d'); g.fillStyle = C.paper; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `900 150px ${HEAD}`; g.fillText('MELTING', 450, 170); g.font = `900 170px ${HEAD}`; g.fillText('TEXT', 450, 345);
}
function shot2(t) {
  const u = t - SH[1], w = j => SW('s2', j);
  const snap = 0.08 * ei(ramp(t, SH[2] - 0.25, 0.25));
  ctx.save(); cam(1.08 - 0.08 * eo(ramp(u, 0, 0.3)) + snap, 540, 760);
  emberBg(t);
  // melt panel
  ctx.fillStyle = '#0E0E0E'; rr(60, 210, 960, 500, 34); ctx.fill();
  const warp = ramp(t, w(3) - 0.1, 0.3), melt = ramp(t, w(5) - 0.05, 1.6);
  const sl = 6;
  for (let x = 0; x < 900; x += sl) {
    const n = rnd(Math.floor(x / 30)) * 0.7 + rnd(Math.floor(x / 11) + 50) * 0.3;
    const wob = Math.sin(x * 0.025 + t * 9) * 22 * warp * (1 - 0.5 * melt);
    const drip = Math.pow(melt, 1.6) * (40 + 200 * n);
    const stretch = 1 + melt * (0.15 + 0.45 * n);
    ctx.drawImage(meltSrc, x, 0, sl, 400, 90 + x, 250 + wob + drip * 0.35, sl, 400 * stretch);
  }
  ctx.fillStyle = '#0E0E0E'; ctx.fillRect(60, 700, 960, 400);   // keep drips inside the panel
  // fake editor timeline, crawling
  ctx.fillStyle = '#161616'; rr(60, 730, 960, 330, 26); ctx.fill(); ctx.strokeStyle = '#2C2C2C'; ctx.lineWidth = 3; ctx.stroke();
  const cols = [C.amber, C.ember, '#EDEDED', '#555', C.amber];
  for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) {
    const x0 = 200 + k * 200 + rnd(r * 7 + k) * 60, len = 80 + rnd(r * 3 + k * 5) * 110;
    ctx.fillStyle = cols[(r + k) % 5]; ctx.globalAlpha = 0.85; rr(x0, 770 + r * 46, len, 32, 8); ctx.fill(); ctx.globalAlpha = 1;
  }
  for (let r = 0; r < 5; r++) { ctx.fillStyle = '#2A2A2A'; rr(84, 770 + r * 46, 92, 32, 8); ctx.fill(); }
  const ph = 230 + u * 18;                            // playhead barely moves
  ctx.fillStyle = C.ember; ctx.fillRect(ph, 750, 5, 250); ctx.beginPath(); ctx.moveTo(ph - 12, 746); ctx.lineTo(ph + 17, 746); ctx.lineTo(ph + 2.5, 762); ctx.fill();
  text('rendering...', 90, 1036, 26, { align: 'left', weight: 600, fam: MONO, color: C.mute });
  ctx.fillStyle = '#2A2A2A'; rr(340, 1016, 640, 24, 12); ctx.fill();
  ctx.fillStyle = C.amber; rr(340, 1016, 640 * (0.04 + 0.03 * u), 24, 12); ctx.fill();
  tag('ILLUSTRATIVE', 1000, 236, 'right', 20);
  // HOURS FIXING + spinning clock
  const hk = pop(t, w(8) - 0.1, 0.26);
  if (hk > 0) {
    ctx.save(); ctx.translate(420, 1170); ctx.scale(hk, hk); ctx.rotate(-3 * D2R);
    ctx.fillStyle = C.ink; rr(-360, -78, 720, 156, 22); ctx.fill();
    text('HOURS FIXING', -20, 36, 100, { maxW: 560 });
    ctx.restore();
    const cx = 900, cy = 1170, cr = 74 * hk;
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(cx, cy, cr + 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.ember; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.stroke();
    ctx.lineCap = 'round'; ctx.strokeStyle = C.paper;
    const a1 = t * 9, a2 = t * 0.9;
    ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(a1) * cr * 0.75, cy - Math.cos(a1) * cr * 0.75); ctx.stroke();
    ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(a2) * cr * 0.5, cy - Math.cos(a2) * cr * 0.5); ctx.stroke();
  }
  // Byte thinking, lower left
  const bk = pop(t, w(1), 0.3);
  if (bk > 0) {
    const scratch = Math.sin(cl((t - w(6)) / 0.9) * Math.PI * 6) * 2 * (t > w(6) && t < w(6) + 0.9 ? 1 : 0);
    byte('think', { x: 230, y: 1940 + 500 * (1 - bk), h: 600, flip: true, rot: scratch, blink: blinkAt(t, w(9)) });
  }
  ctx.restore();
}

/* ======================= SHOT 3: THE SHIFT ======================= */
function termFrame(x, y, w, h, title = 'Claude Code', glow = 0.5) {
  ctx.save(); ctx.shadowColor = `rgba(17,17,17,${glow})`; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
  ctx.fillStyle = '#121212'; rr(x, y, w, h, 28); ctx.fill(); ctx.restore();
  ctx.strokeStyle = '#2E2E2E'; ctx.lineWidth = 4; rr(x, y, w, h, 28); ctx.stroke();
  [C.ember, C.amber, '#EDEDED'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 40 + i * 32, y + 40, 10, 0, Math.PI * 2); ctx.fill(); });
  text(title, x + 150, y + 51, 30, { align: 'left', weight: 600, fam: MONO, color: C.mute });
}
function typed(str, t0, t1, t) { return str.slice(0, Math.floor(cl((t - t0) / Math.max(0.05, t1 - t0)) * str.length)); }
function shot3(t) {
  const u = t - SH[2], w = j => SW('s3', j);
  const snap = 0.08 * ei(ramp(t, SH[3] - 0.25, 0.25));
  ctx.save(); cam(1.06 - 0.06 * eo(ramp(u, 0, 0.3)) + 0.03 * ramp(u, 0, 5) + snap, 540, 600);
  emberBg(t);
  const tk = back(cl(u / 0.3));
  ctx.save(); ctx.translate(540, 500); ctx.scale(0.9 + 0.1 * tk, 0.9 + 0.1 * tk); ctx.translate(-540, -500);
  termFrame(70, 230, 940, 520);
  const L = [['> opus 5.5', w(1) - 0.1, w(3) + 0.1], ['> make a motion design showreel', w(5) - 0.05, w(11)], ['> rendering...', w(12), w(13)]];
  L.forEach(([s, a, b], i) => { if (t > a) text(typed(s, a, b, t), 110, 380 + i * 92, 46, { align: 'left', weight: 500, fam: MONO, color: i === 2 ? C.amber : C.paper }); });
  const last = L.filter(l => t > l[1]).length - 1;
  if (last >= 0 && Math.floor(t * 2.5) % 2 === 0) { font(46, 500, MONO); const lw = ctx.measureText(typed(L[last][0], L[last][1], L[last][2], t)).width;
    ctx.fillStyle = C.paper; ctx.fillRect(114 + lw, 342 + last * 92, 24, 48); }
  tag('ILLUSTRATIVE', 980, 720, 'right', 20);
  ctx.restore();
  // ONE LINE / ONE SHOWREEL on an ink band
  const k1 = pop(t, w(12) - 0.08, 0.24), k2 = pop(t, w(13) + 0.12, 0.24);
  if (k1 > 0) {
    ctx.save(); ctx.translate(540, 940); ctx.rotate(-2 * D2R);
    ctx.fillStyle = C.ink; rr(-470, -150 * Math.min(1, k1), 940, 300 * Math.min(1, k1), 26); ctx.fill(); ctx.restore();
    kline('ONE LINE.', 540, 870, 130, 1, { scale: 0.7 + 0.3 * k1, maxW: 820 });
    kline('ONE SHOWREEL', 540, 1010, 104, k2 > 0 ? 1 : 0, { scale: 0.7 + 0.3 * k2, color: C.amber, maxW: 840 });
  }
  // Byte, surprised, lower left
  const bk = pop(t, w(1), 0.3);
  if (bk > 0) byte('grin', { x: 300 - 520 * (1 - bk), y: 1960, h: 800, flip: true, rot: -4 * eo(ramp(t, w(5), 0.3)),
    blink: blinkAt(t, w(9)), extra: c => marks(380, 120, ramp(t, w(1) + 0.3, 0.2), -110, C.amber, 70) });
  ctx.restore();
}

/* ======================= SHOT 4: THE PROMPT ======================= */
function shot4(t) {
  const u = t - SH[3], w = j => SW('s4', j), we = j => SE('s4', j);
  const tOut = w(10);
  const [sx, sy] = shake(t, tOut + 0.04, 16, 0.14);
  const punch = 0.06 * Math.sin(cl((t - tOut) / 0.35) * Math.PI);
  const snap = 0.08 * ei(ramp(t, SH[4] - 0.25, 0.25));
  ctx.save(); cam(1 + 0.06 * eio(ramp(u, 0, 3.6)) + punch + snap, 540, 840, sx, sy);
  emberBg(t);
  kline('THE PROMPT', 540, 290, 84, 1, { scale: 0.8 + 0.2 * pop(u, 0, 0.25), maxW: 700 });
  const k = back(cl(u / 0.3));
  ctx.save(); ctx.translate(540, 840); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k); ctx.translate(-540, -840);
  termFrame(60, 420, 960, 720, 'Claude Code', 0.6);
  // typed in step with the voice
  const lines = [[['>', -1], ['Make', 0], ['a', 1], ['dynamic', 2]], [['15-second', 3, 4], ['motion', 5]], [['graphics', 6], ['video.', 7]]];
  lines.forEach((ln, i) => {
    let x = i === 0 ? 100 : 160; const y = 580 + i * 110;
    ln.forEach(([s, j0, j1]) => {
      const a = j0 < 0 ? SH[3] : w(j0) - 0.05, b = j0 < 0 ? SH[3] + 0.1 : we(j1 ?? j0);
      const str = typed(s, a, b, t);
      text(str, x, y, 64, { align: 'left', weight: 500, fam: MONO, color: s === '>' ? C.mute : C.paper });
      font(64, 500, MONO); x += ctx.measureText(s + ' ').width;
    });
  });
  // "Go all out." slams in as an Amber block
  const gk = pop(t, w(8) - 0.06, 0.26);
  if (gk > 0) {
    ctx.save(); ctx.translate(410, 1010); ctx.rotate(-3 * D2R * (1 - gk)); ctx.scale(0.6 + 0.4 * gk, 0.6 + 0.4 * gk);
    ctx.fillStyle = C.amber; rr(-270, -78, 540, 156, 20); ctx.fill();
    const ws = ['Go', 'all', 'out.'], idx = [8, 9, 10]; let x = -230;
    ws.forEach((s, i) => { if (t >= w(idx[i]) - 0.06) text(s, x, 30, 84, { align: 'left', weight: 900, color: C.ink }); font(84, 900); x += ctx.measureText(s + ' ').width; });
    ctx.restore();
    if (Math.floor(t * 2.5) % 2 === 0 && t > we(10)) { ctx.fillStyle = C.paper; ctx.fillRect(720, 950, 30, 110); }
  }
  ctx.restore();
  tag('VIRAL PROMPT, SHORTENED FOR SCREEN', 540, 1185, 'center', 24);
  marks(900, 960, ramp(t, tOut + 0.05, 0.22), -40, C.paper, 70);
  ctx.restore();
  flash(t, tOut, 1, C.paper, 0.25);
}

/* ======================= SHOT 5: VISUAL PROOF ======================= */
let PART = null;
function textPoints(lines, step) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.textAlign = 'center';
  lines.forEach(([s, y, size]) => { g.font = `900 ${size}px ${HEAD}`; g.fillText(s, 540, y); });
  const d = g.getImageData(0, 0, W, H).data, pts = [];
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (d[(y * W + x) * 4 + 3] > 128) pts.push([x, y]);
  return pts;
}
function makeParticles() {
  const pts = textPoints([['PARTICLE', 830, 168], ['REVEALS', 1010, 190]], 7);
  PART = pts.map((p, i) => { const a = rnd(i * 1.7) * Math.PI * 2, r = 700 + rnd(i * 3.3) * 700;
    return { x: p[0], y: p[1], sx: 540 + Math.cos(a) * r, sy: 900 + Math.sin(a) * r * 1.3, d: rnd(i * 5.1) * 0.35, c: rnd(i * 7.7) < 0.18 ? 1 : 0 }; });
}
function shards(cx, cy, k, n = 16, seed = 1) {
  if (k <= 0) return;
  for (let i = 0; i < n; i++) {
    const a = rnd(i * 3.1 + seed) * Math.PI * 2, d = (160 + rnd(i * 4.3 + seed) * 520) * eo(k), s = 40 + rnd(i * 6.1 + seed) * 70;
    ctx.save(); ctx.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8); ctx.rotate(a + k * 3);
    ctx.globalAlpha = 1 - ramp(k, 0.7, 0.3);
    ctx.fillStyle = [C.ember, C.amber, C.paper][i % 3]; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.35, s * 0.6); ctx.lineTo(-s * 0.4, s * 0.4); ctx.fill(); ctx.restore();
  }
}
function shot5(t) {
  const u = t - SH[4], w = j => SW('s5', j);
  const tK = w(3), tT = w(4), tP = w(5) - 0.08;
  const [sx, sy] = shake(t, tK + 0.04, 18, 0.12), [sx2, sy2] = shake(t, tT + 0.04, 18, 0.12);
  const snap = 0.08 * ei(ramp(t, SH[5] - 0.25, 0.25));
  ctx.save(); cam(1 + 0.03 * ramp(u, 0, 4) + snap, 540, 900, sx + sx2, sy + sy2);
  ctx.fillStyle = '#0E0E0E'; ctx.fillRect(-200, -200, W + 400, H + 400);
  if (t < tP) {
    // speed lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 4;
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r0 = 260 + ((t * 900 + i * 90) % 700); ctx.beginPath();
      ctx.moveTo(540 + Math.cos(a) * r0, 900 + Math.sin(a) * r0); ctx.lineTo(540 + Math.cos(a) * (r0 + 120), 900 + Math.sin(a) * (r0 + 120)); ctx.stroke(); }
    const k0 = pop(t, SH[4] + 0.05, 0.22);
    if (t < tK) kline('AND GOT THIS', 540, 900, 96, k0 > 0 ? 1 : 0, { scale: 0.6 + 0.4 * k0, maxW: 820 });
    shards(540, 900, ramp(t, tK, 0.9), 18, 2);
    const k1 = ramp(t, tK - 0.08, 0.16), k2 = ramp(t, tT - 0.08, 0.16);
    if (k1 > 0) kline('KINETIC', 540, 800, 210, 1, { dx: -700 * (1 - eo(k1)), rot: -6, scale: 1 + 0.12 * (1 - ramp(t, tK + 0.08, 0.25)), maxW: 960 });
    if (k2 > 0) kline('TYPE', 540, 1010, 260, 1, { dx: 700 * (1 - eo(k2)), rot: -6, color: C.amber, scale: 1 + 0.12 * (1 - ramp(t, tT + 0.08, 0.25)), maxW: 760 });
  } else {
    // particles converge into the words
    const pk = t - tP;
    for (const p of PART) {
      const k = eio(cl((pk - p.d) / 0.9));
      const x = lerp(p.sx, p.x, k) + Math.sin(t * 3 + p.y) * 1.5 * k, y = lerp(p.sy, p.y, k);
      ctx.fillStyle = p.c ? C.ember : C.paper; ctx.globalAlpha = 0.35 + 0.65 * k;
      const s = 5 + 3 * (1 - k); ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  flash(t, tK, 1, C.paper, 0.35); flash(t, tT, 1, C.paper, 0.35);
}

/* ======================= SHOT 6: SOUND + SYNC ======================= */
function shot6(t) {
  const u = t - SH[5], w = j => SW('s6', j);
  const cuts = [w(2) + 0.05, w(6), w(9)];             // sound, synced, cut
  let sx = 0, sy = 0; cuts.forEach(c => { const s = shake(t, c, 12, 0.1); sx += s[0]; sy += s[1]; });
  const snap = 0.08 * ei(ramp(t, SH[6] - 0.25, 0.25));
  ctx.save(); cam(1.06 - 0.06 * eo(ramp(u, 0, 0.3)) + snap, 540, 800, sx, sy);
  ctx.fillStyle = '#0E0E0E'; ctx.fillRect(-200, -200, W + 400, H + 400);
  const k1 = pop(t, SH[5] + 0.05, 0.24);
  kline('SOUND-REACTIVE', 540, 300, 110, k1 > 0 ? 1 : 0, { scale: 0.6 + 0.4 * k1, rot: -4, maxW: 920 });
  // waveform that spikes on every cut
  const spike = cuts.reduce((m, c) => Math.max(m, t >= c ? Math.exp(-(t - c) * 6) : 0), 0);
  const N = 61, bw = 11;
  for (let i = 0; i < N; i++) {
    const x = 540 + (i - (N - 1) / 2) * 15.5, centre = 1 - Math.abs(i - 30) / 30;
    const base = 30 + 140 * Math.abs(Math.sin(i * 0.9 + t * 7) * Math.sin(i * 0.31 + t * 3.1)) * (0.5 + 0.5 * centre);
    const hgt = base + spike * 320 * Math.pow(centre, 1.5) * (0.7 + 0.3 * rnd(i));
    ctx.fillStyle = centre > 0.75 ? C.ember : C.paper; rr(x - bw / 2, 680 - hgt / 2, bw, hgt, bw / 2); ctx.fill();
  }
  const k2 = pop(t, w(6) - 0.06, 0.24);
  kline('CUT-SYNCED', 540, 960, 120, k2 > 0 ? 1 : 0, { scale: 0.6 + 0.4 * k2, rot: -4, maxW: 820 });
  // timeline with cut markers, playhead hits each marker on the cut
  const ty = 1060; ctx.fillStyle = '#161616'; rr(60, ty, 960, 250, 24); ctx.fill(); ctx.strokeStyle = '#2C2C2C'; ctx.lineWidth = 3; ctx.stroke();
  const X = tt => 100 + (tt - SH[5]) / (SH[6] - SH[5]) * 880;
  let prev = 100;
  [...cuts, SH[6]].forEach((c, i) => { thumb(prev + 4, ty + 26, X(c) - prev - 8, 90, i * 11 + 3, 8); prev = X(c); });
  for (let i = 0; i < 120; i++) { const x = 100 + i * 7.3, a = 10 + 34 * Math.abs(Math.sin(i * 0.7) * Math.sin(i * 0.13));
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x, ty + 190 - a / 2, 4, a); }
  cuts.forEach(c => { const x = X(c), hit = t >= c && t < c + 0.25;
    ctx.fillStyle = C.amber; ctx.fillRect(x - 3, ty + 14, 6, 222); ctx.beginPath(); ctx.moveTo(x - 14, ty + 6); ctx.lineTo(x + 14, ty + 6); ctx.lineTo(x, ty + 24); ctx.fill();
    if (hit) { ctx.fillStyle = 'rgba(255,176,32,0.35)'; ctx.fillRect(x - 20, ty + 10, 40, 230); } });
  const px = X(Math.min(t, SH[6])); ctx.fillStyle = C.paper; ctx.fillRect(px - 2, ty + 8, 4, 236);
  tag('ILLUSTRATIVE', 1000, ty - 20, 'right', 20);
  ctx.restore();
  cuts.forEach(c => flash(t, c, 1, C.paper, 0.18));
}

/* ======================= SHOT 7: STYLE GRID ======================= */
const TILES = ['KINETIC TYPE', 'PARTICLES', 'SOUND REACTIVE', 'LOGO STING', 'TRANSITIONS', 'BOLD TITLES', 'LOWER THIRDS', 'BACKGROUNDS', 'OUTRO CARDS'];
function tileArt(i, x, y, s, t) {
  ctx.save(); rr(x, y, s, s, 22); ctx.clip(); ctx.fillStyle = '#121212'; ctx.fillRect(x, y, s, s);
  const cx = x + s / 2, cy = y + s * 0.42, ph = t * 2.2;
  ctx.lineCap = 'round';
  if (i === 0) { ctx.fillStyle = C.ember; ctx.beginPath(); ctx.moveTo(x, y + s * 0.7); ctx.lineTo(x + s, y + s * 0.2); ctx.lineTo(x + s, y + s * 0.45); ctx.lineTo(x, y + s * 0.95); ctx.fill();
    text('TYPE', cx, cy + 30, 90 + 10 * Math.sin(ph * 3), { color: C.paper, maxW: s * 0.8 }); }
  if (i === 1) for (let k = 0; k < 90; k++) { const a = k * 2.4 + ph, r = (k % 30) * 3.4; ctx.fillStyle = k % 5 ? C.paper : C.ember; ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 5, 5); }
  if (i === 2) for (let k = 0; k < 15; k++) { const hh = 20 + 80 * Math.abs(Math.sin(k * 0.8 + ph * 4)); ctx.fillStyle = k === 7 ? C.ember : C.paper; rr(x + 30 + k * 16, cy - hh / 2, 9, hh, 4); ctx.fill(); }
  if (i === 3) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(ph); ctx.strokeStyle = C.paper; ctx.lineWidth = 22; ctx.beginPath();
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; ctx.lineTo(Math.cos(a) * 60, Math.sin(a) * 60); } ctx.closePath(); ctx.stroke(); ctx.restore(); }
  if (i === 4) { const o = ((ph * 0.6) % 1) * s * 2 - s; ctx.fillStyle = C.ember; ctx.beginPath(); ctx.moveTo(x + o, y); ctx.lineTo(x + o + s * 0.5, y); ctx.lineTo(x + o + s * 0.1, y + s); ctx.lineTo(x + o - s * 0.4, y + s); ctx.fill();
    ctx.fillStyle = C.paper; ctx.beginPath(); ctx.moveTo(x + o + s * 0.55, y); ctx.lineTo(x + o + s * 0.65, y); ctx.lineTo(x + o + s * 0.25, y + s); ctx.lineTo(x + o + s * 0.15, y + s); ctx.fill(); }
  if (i === 5) text('Bold', cx, cy + 34, 96 * (1 + 0.08 * Math.sin(ph * 3)), { color: C.paper, maxW: s * 0.85 });
  if (i === 6) { const k = eo(cl((ph * 0.5) % 1 * 2)); ctx.fillStyle = C.amber; rr(x + 24 - (1 - k) * s, cy - 20, s * 0.7, 26, 6); ctx.fill();
    ctx.fillStyle = C.paper; rr(x + 24 - (1 - k) * s * 1.2, cy + 16, s * 0.5, 18, 6); ctx.fill(); }
  if (i === 7) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3; for (let k = 0; k < 6; k++) { const r = ((k * 22 + ph * 30) % 132); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); } }
  if (i === 8) { ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(cx, cy, 64, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ember; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 64, ph, ph + Math.PI); ctx.fill(); }
  ctx.restore();
  text(TILES[i], x + s / 2, y + s - 26, 30, { maxW: s - 30, weight: 800 });
}
function shot7(t) {
  const u = t - SH[6];
  const punch = 0.05 * eio(ramp(u, 1.1, 0.8)), snap = 0.08 * ei(ramp(t, SH[7] - 0.22, 0.22));
  ctx.save(); cam(1 + punch + snap, 540, 900);
  emberBg(t);
  const s = 290, gx = [85, 395, 705], gy = [420, 740, 1060];
  for (let i = 0; i < 9; i++) {
    const k = pop(u, 0.04 + i * 0.07, 0.24); if (k <= 0) continue;
    const x = gx[i % 3], y = gy[Math.floor(i / 3)];
    ctx.save(); ctx.translate(x + s / 2, y + s / 2); ctx.scale(k, k); ctx.rotate((1 - k) * (i % 2 ? 12 : -12) * D2R); ctx.translate(-(x + s / 2), -(y + s / 2));
    ctx.fillStyle = C.ink; rr(x - 6, y - 6, s + 12, s + 12, 26); ctx.fill();
    tileArt(i, x, y, s, t); ctx.restore();
  }
  kline('NOT JUST ONE LOOK', 540, 300, 84, pop(u, 0, 0.24) > 0 ? 1 : 0, { scale: 0.6 + 0.4 * pop(u, 0, 0.24), maxW: 900 });
  ctx.restore();
}

/* ======================= SHOT 8: THE CATCH ======================= */
const BRIEF = ['# DIRECTOR\'S BRIEF  v7', 'format: 1080x1920, 30fps, 15.0s', 'palette: #FF3300 #111111 #FFFFFF #FFB020', 'type: heavy geometric sans, tracking -2%',
  'SCENE 01  0:00.0  logo builds from 3 strokes', '  camera: push 4% over 18f, hard cut on kick', 'SCENE 02  0:01.8  kinetic type, 3 words', '  each word: scale 0.6 > 1.08 > 1.0, 6f',
  'SCENE 03  0:03.2  particles converge to mark', 'skill: motion-reel/kinetic-type', 'skill: motion-reel/particles', 'example: refs/showreel_03.mp4  (study pacing)',
  'example: refs/title_cards.png', 'audio: 128 bpm, cuts on the beat grid', 'sfx: whoosh 0.42s pre-roll each cut', 'sfx: impact on every slam, -18 dB under music',
  'SCENE 04  0:05.6  split screen wipe, 45deg', 'SCENE 05  0:07.0  waveform reacts to kick', 'review: render stills every scene, fix, rerender', 'never: fades, gradients, motion blur > 2f',
  'SCENE 06  0:09.4  lower third + bold title', 'SCENE 07  0:11.2  grid of looks, stagger 2f', 'SCENE 08  0:13.0  outro card, hold 1.2s', 'deliver: mp4 h264, -14 LUFS'];
let GLOBE = null;
function makeGlobe() { GLOBE = []; for (let i = 0; i < 520; i++) { const y = 1 - (i / 519) * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996; GLOBE.push([Math.cos(a) * r, y, Math.sin(a) * r, rnd(i) < 0.2]); } }
function shot8(t) {
  const u = t - SH[7], w = j => SW('s8', j), we = j => SE('s8', j);
  const tB = w(5) - 0.1, tC = w(17) - 0.1, tD = w(22) - 0.1, tE = w(27) - 0.1;
  const snap = 0.08 * ei(ramp(t, SH[8] - 0.25, 0.25));
  let sx = 0, sy = 0; [w(3), w(11), w(17), w(18), w(20), w(27)].forEach(c => { const s = shake(t, c, 12, 0.1); sx += s[0]; sy += s[1]; });
  ctx.save(); cam(1 + snap + 0.03 * ramp(t, tD, 3), 540, 900, sx, sy);
  if (t < tB) {                                          // NOT ONE LINE
    emberBg(t);
    termFrame(90, 520, 900, 220, 'Claude Code', 0.4);
    text('> make a showreel. go all out.', 130, 690, 40, { align: 'left', weight: 500, fam: MONO });
    const k = pop(t, w(2) - 0.05, 0.24);
    if (k > 0) {
      ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 22; ctx.lineCap = 'round'; const d = eo(ramp(t, w(3), 0.2));
      ctx.beginPath(); ctx.moveTo(110, 700); ctx.lineTo(110 + 860 * d, 560); ctx.stroke(); ctx.restore();
      kline('NOT ONE LINE', 540, 960, 128, 1, { scale: 0.6 + 0.4 * k, rot: -3, maxW: 900 });
    }
  } else if (t < tD) {                                   // the wall of brief behind a "one shot"
    ctx.fillStyle = '#0E0E0E'; ctx.fillRect(-200, -200, W + 400, H + 400);
    const scroll = Math.max(0, t - tB - 0.3) * 520;
    const dim = t >= tC ? 0.35 : 1;
    for (let i = -2; i < 60; i++) {
      const y = 240 + i * 46 - scroll % 46, line = BRIEF[((i + Math.floor(scroll / 46)) % BRIEF.length + BRIEF.length) % BRIEF.length];
      if (y < 180 || y > 1500) continue;
      const reveal = eo(ramp(t, tB + 0.02 * Math.max(0, i), 0.2));
      ctx.globalAlpha = reveal * 0.5 * dim; text(line, 80, y, 30, { align: 'left', weight: 500, fam: MONO, color: line.startsWith('SCENE') || line.startsWith('#') ? C.amber : C.paper });
    }
    ctx.globalAlpha = 1;
    if (t < tC) {
      // character counter climbs on "ten thousand"
      const ck = eio(ramp(t, w(11) - 0.1, we(13) - w(11) + 0.1));
      const n = Math.round(lerp(31, 10000, ck));
      ctx.fillStyle = 'rgba(14,14,14,0.92)'; rr(80, 700, 920, 440, 30); ctx.fill();
      ctx.strokeStyle = C.amber; ctx.lineWidth = 6; ctx.stroke();
      const pz = 1 + 0.1 * Math.sin(cl((t - we(13)) / 0.3) * Math.PI);
      kline(n.toLocaleString('en-US'), 540, 880, 230, 1, { color: C.amber, scale: pz, maxW: 820 });
      kline('CHARACTERS', 540, 1010, 92, 1, { maxW: 700 });
      const k0 = pop(t, tB, 0.24);
      kline('ONE VIRAL "ONE-SHOT"', 540, 430, 72, k0 > 0 ? 1 : 0, { scale: 0.6 + 0.4 * k0, maxW: 900 });
      text('Source: Thariq (Claude Code team) on X, 23 Sep 2026', 540, 1096, 26, { weight: 700, color: C.mute });
    } else {                                             // SKILLS / EXAMPLES / A PROPER BRIEF
      const chips = [['SKILLS', 17, C.paper], ['EXAMPLES', 18, C.paper], ['A PROPER BRIEF', 20, C.amber]];
      chips.forEach(([s, j, col], i) => {
        const k = pop(t, w(j) - 0.06, 0.24); if (k <= 0) return;
        ctx.save(); ctx.translate(540, 560 + i * 230); ctx.rotate((i - 1) * -3 * D2R); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
        ctx.fillStyle = i === 2 ? C.amber : C.ember; rr(-420, -90, 840, 180, 26); ctx.fill();
        text(s, 0, 38, 104, { color: i === 2 ? C.ink : C.paper, maxW: 760 }); ctx.restore();
      });
    }
  } else {                                               // the gap is shrinking / taste still wins
    emberBg(t);
    const gk = eo(ramp(t, tD, 0.5)), rot = t * 0.8;
    const cx = 540, cy = 1010, R = 300 * (0.6 + 0.4 * gk);
    for (const [x, y, z, hot] of GLOBE) {
      const xr = x * Math.cos(rot) - z * Math.sin(rot), zr = x * Math.sin(rot) + z * Math.cos(rot);
      const sc = 0.7 + 0.5 * (zr + 1) / 2; ctx.globalAlpha = 0.45 + 0.55 * (zr + 1) / 2;
      ctx.fillStyle = hot ? C.amber : C.paper; ctx.fillRect(cx + xr * R - 3 * sc, cy + y * R - 3 * sc, 6 * sc, 6 * sc);
    }
    ctx.globalAlpha = 1;
    if (t < tE) {
      const k1 = pop(t, tD + 0.05, 0.24), k2 = pop(t, w(25) - 0.06, 0.24);
      kline('THE GAP IS', 540, 330, 120, k1 > 0 ? 1 : 0, { scale: 0.6 + 0.4 * k1, maxW: 860 });
      kline('SHRINKING', 540, 490, 150, k2 > 0 ? 1 : 0, { scale: 0.6 + 0.4 * k2, color: C.amber, maxW: 900 });
    } else {
      const k1 = pop(t, tE, 0.24), k2 = pop(t, w(28) - 0.06, 0.26);
      kline('TASTE', 540, 330, 190, k1 > 0 ? 1 : 0, { scale: 0.6 + 0.4 * k1, maxW: 760 });
      kline('STILL WINS', 540, 520, 140, k2 > 0 ? 1 : 0, { scale: 0.6 + 0.4 * k2, color: C.amber, maxW: 900 });
    }
    const bk = pop(t, tD + 0.15, 0.3);
    if (bk > 0) byte('think', { x: 230, y: 1940 + 500 * (1 - bk), h: 640, flip: true, rot: Math.sin(t * 2) * 1.2, blink: blinkAt(t, w(27) + 0.3) });
  }
  ctx.restore();
  flash(t, tB, 1, C.paper, 0.5); flash(t, tD, 1, C.paper, 0.4);
}

/* ======================= SHOT 9: CTA ======================= */
function shot9(t) {
  const u = t - SH[8], w = j => SW('s9', j);
  const push = 0.04 * eio(ramp(u, 1.5, 4));
  ctx.save(); cam(1 + push, 540, 800);
  emberBg(t);
  const k1 = ramp(u, 0.3, 0.3), k2 = pop(u, 0.65, 0.32);
  const kw = YT ? w(8) : w(4);                           // "pinned" / second "prompts"
  const pulse = 1 + 0.07 * Math.sin(cl((t - kw) / 0.35) * Math.PI);
  if (!YT) {
    kline('Comment', 540, 330, 120, k1 > 0 ? 1 : 0, { dy: -200 * (1 - back(k1)), alpha: cl(k1 * 3), weight: 800, maxW: 700 });
    kline('“PROMPTS”', 540, 500, 160, k2 > 0 ? 1 : 0, { scale: (0.8 + 0.2 * k2) * pulse, color: C.amber, maxW: 940 });
  } else {
    kline('Get it in the', 540, 330, 104, k1 > 0 ? 1 : 0, { dy: -200 * (1 - back(k1)), alpha: cl(k1 * 3), weight: 800, maxW: 800 });
    kline('PINNED COMMENT', 540, 490, 120, k2 > 0 ? 1 : 0, { scale: (0.8 + 0.2 * k2) * pulse, color: C.amber, maxW: 940 });
  }
  const bk = pop(u, 0.08, 0.34);
  const wv = u > 1.1 ? Math.sin((u - 1.1) * Math.PI * 2 / 0.62) * 13 * (1 - ramp(u, 3.0, 0.3)) : 0;
  const raise = u < 1.1 ? -18 * (1 - eo(ramp(u, 0.7, 0.4))) : 0;
  byte('wave', { x: 560, y: 1960 + 600 * (1 - bk), h: 1140, sy: 1 + 0.008 * Math.sin(u * 3), hand: wv + raise, blink: blinkAt(u, 2.6) + blinkAt(u, 4.6),
    extra: c => marks(140, 560, ramp(u, 1.2, 0.25), -130, C.amber, 70) });
  ctx.restore();
}

/* ======================= captions ======================= */
/* script spellings, mapped onto the transcribed word indices [text, first, last] */
const CAPS = {
  s1: [['AI', 0], ['motion', 1], ['design', 2], ['just', 3], ['changed.', 4], ["Here's", 5], ['the', 6], ['catch.', 7]],
  s2: [['A', 0], ['year', 0], ['ago?', 1], ['Fair.', 2], ['Warped', 3], ['clips.', 4], ['Melting', 5], ['text.', 6], ['Your', 7], ['afternoon,', 8], ['gone', 9], ['in', 10], ['After', 11], ['Effects.', 12]],
  s3: [['Then', 0], ['Opus', 1], ['5.5', 2, 3], ['dropped.', 4], ['People', 5], ['asked', 6], ['Claude', 7], ['Code', 8], ['for', 9], ['a', 10], ['showreel.', 11], ['One', 12], ['line.', 13]],
  s4: null,                                // the prompt is typed on screen word for word
  s5: [['And', 0], ['got', 1], ['this.', 2], ['Kinetic', 3], ['type.', 4], ['Particle', 5], ['reveals.', 6]],
  s6: [['Even', 0], ['the', 1], ['sound.', 2], ['Written', 3], ['in', 4], ['code,', 5], ['synced', 6], ['to', 7], ['every', 8], ['cut.', 9]],
  s7: [['And', 0], ['not', 1], ['just', 2], ['one', 3], ['look.', 4]],
  s8: [['But', 0], ['plenty', 1], ["weren't", 2], ['one', 3], ['line.', 4], ['One', 5], ['viral', 6], ['one-shot', 7, 8], ['had', 9], ['a', 10], ['10,000', 11, 12], ['character', 13], ['prompt', 14], ['behind', 15], ['it.', 16],
    ['Skills.', 17], ['Examples.', 18], ['A', 19], ['proper', 20], ['brief.', 21], ['The', 22], ['gap', 23], ['is', 24], ['shrinking', 25], ['fast.', 26], ['Taste', 27], ['still', 28], ['wins.', 29]],
  s9: YT ? [['Want', 0], ['my', 1], ['prompts?', 2], ['The', 3], ['library', 4], ['is', 5], ['in', 6], ['the', 7], ['pinned', 8], ['comment.', 9]]
         : [['Want', 0], ['my', 1], ['prompts?', 2], ['Comment', 3], ['PROMPTS', 4], ['and', 5], ["I'll", 6], ['send', 7], ['you', 8], ['the', 9], ['library.', 10]],
};
const CAPY = [1480, 1300, 1120, 0, 1500, 1400, 1470, 1270, 705];
const groups = (() => {
  const gs = [];
  Object.entries(CAPS).forEach(([s, list]) => {
    if (!list) return;
    const toks = list.map(([txt, a, b]) => ({ txt, t: SW(s, a), e: SE(s, b ?? a) }));
    let cur = [];
    toks.forEach((k, j) => {
      cur.push(k);
      const nxt = toks[j + 1], gap = nxt ? nxt.t - k.e : 9;
      if (/[.?!,]$/.test(k.txt) || cur.length >= 3 || gap > 0.5 || !nxt) { gs.push(cur); cur = []; }
    });
  });
  return gs.map((g, j) => ({ toks: g, t0: g[0].t - 0.05, t1: Math.min(g[g.length - 1].e + 0.45, gs[j + 1] ? gs[j + 1][0].t - 0.05 : 99) }));
})();
function captions(t) {
  const g = groups.find(g => t >= g.t0 && t < g.t1); if (!g) return;
  const shot = SH.findIndex((s, i) => t >= s && t < SH[i + 1]);
  const y = CAPY[shot]; if (!y) return;
  font(64, 800); const sp = ctx.measureText(' ').width;
  const ws = g.toks.map(k => ctx.measureText(k.txt).width), tot = ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
  const sc = Math.min(1, 900 / tot), pk = pop(t, g.t0, 0.16);
  ctx.save(); ctx.translate(540, y); ctx.scale(sc * (0.9 + 0.1 * pk), sc * (0.9 + 0.1 * pk));
  let x = -tot / 2;
  g.toks.forEach((k, j) => {
    const active = t >= k.t - 0.02 && (t < k.e + 0.08 || j === g.toks.length - 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.strokeStyle = C.ink; ctx.lineWidth = 14; ctx.strokeText(k.txt, x, 0);
    ctx.fillStyle = active ? C.amber : C.paper; ctx.fillText(k.txt, x, 0);
    x += ws[j] + sp;
  });
  ctx.restore();
}

/* ======================= frame ======================= */
const SHOTS = [shot1, shot2, shot3, shot4, shot5, shot6, shot7, shot8, shot9];
function renderFrame(f) {
  const t = f / FPS;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  let i = SH.findIndex((s, k) => t >= s && t < SH[k + 1]); if (i < 0) i = 8;
  SHOTS[i](t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  captions(t);
  if (window.SAFE) { ctx.fillStyle = 'rgba(0,120,255,0.28)'; ctx.fillRect(0, 0, W, 200); ctx.fillRect(0, 1540, W, 380); ctx.fillRect(940, 900, 140, 640); }
}
window.renderFrame = renderFrame;

/* audio cues for audio.py */
window.cues = () => {
  const c = [], add = (type, t, d) => c.push({ type, t: +t.toFixed(3), d });
  const w = SW;
  add('impact', 0.08); add('bass', 0.42); add('whoosh', 0.5); add('tick', 0.92);
  add('whoosh', SH[1]); add('wobble', w('s2', 3) - 0.1, 0.9); add('melt', w('s2', 5) - 0.05, 1.6); add('impact', w('s2', 8) - 0.1); add('pop', w('s2', 1));
  add('whoosh', SH[2]); add('pop', w('s3', 1));
  [[1, 3], [5, 11], [12, 13]].forEach(([a, b]) => { const t0 = w('s3', a), t1 = SE('s3', b); for (let k = 0; k < 10; k++) add('key', t0 + (t1 - t0) * k / 10); });
  add('impact0', w('s3', 12) - 0.08); add('impact1', w('s3', 13) + 0.12);
  add('whoosh', SH[3]);
  for (let j = 0; j < 8; j++) { const t0 = w('s4', j), t1 = SE('s4', j); for (let k = 0; k < 4; k++) add('key', t0 + (t1 - t0) * k / 4); }
  add('impact2', w('s4', 8) - 0.06); add('bass', w('s4', 10));
  add('flash', SH[4]); add('impact0', w('s5', 3) - 0.08); add('impact3', w('s5', 4) - 0.08); add('riser', w('s5', 5) - 0.3, 0.3); add('shimmer', w('s5', 5) - 0.08, 1.2);
  add('whoosh', SH[5]); [w('s6', 2) + 0.05, w('s6', 6), w('s6', 9)].forEach((t, i) => add('impact' + i, t));
  add('whoosh', SH[6]); for (let i = 0; i < 9; i++) add('pop', SH[6] + 0.04 + i * 0.07);
  add('flash', SH[7]); add('impact', w('s8', 2) - 0.05); add('flash', w('s8', 5) - 0.1); add('riser', w('s8', 11) - 0.1, SE('s8', 13) - w('s8', 11) + 0.1);
  add('bass', SE('s8', 13)); [17, 18, 20].forEach((j, i) => add('impact' + i, w('s8', j) - 0.06)); add('whoosh', w('s8', 22) - 0.15);
  add('impact', w('s8', 27) - 0.1); add('impact3', w('s8', 28) - 0.06);
  add('whoosh', SH[8]); add('pop', SH[8] + 0.65); add('pop', YT ? w('s9', 8) : w('s9', 4));
  return c;
};

window.ready = (async () => {
  for (const wt of [900, 800, 700, 600]) await document.fonts.load(`${wt} 100px Montserrat`);
  await document.fonts.load('500 30px "JetBrains Mono"');
  await loadPoses(); makeMelt(); makeParticles(); makeGlobe();
  return true;
})();
