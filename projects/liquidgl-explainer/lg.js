/* liquidGL explainer, 75 s, 1920 x 1080, 30 fps.
   Deterministic timeline: window.renderFrame(f) draws frame f.
   Each frame: scene content is painted into two 2D canvases (bg = behind the glass, fg = on top of it),
   then a WebGL2 pass chain refracts bg through every glass pane, composites fg, runs the transition pane
   and writes the result. Panes are real refraction (rounded rect SDF, bevel displacement, magnify,
   optional frost, tint, chromatic aberration and fluid displacement), not blur. */

const W = 1920, H = 1080, FPS = 30, DURATION = 75;
const TOTAL_FRAMES = DURATION * FPS;
const C = {
  bg: '#0B0D12', blue: '#4C8DFF', violet: '#8B5CF6', coral: '#FF7A59',
  ink: '#F2F4F8', dim: '#8A93A6', faint: '#4A5266', card: '#141824', red: '#FF4D5E',
};
const SC = TIMING.scenes;                       // scene start times (s), 11 entries incl. end
const WT = i => TIMING.words[i].t;              // absolute start time of VO word i (see vo.py)

/* Every on screen string lives here. */
const COPY = {
  hook: 'Most web glass is just blur',
  blurTag: 'blur only',
  title: 'liquidGL',
  problem: "Browsers don't let WebGL read live pixels",
  gpu: 'GPU',
  url: 'example.com',
  live: 'Live content',
  steps: ['Snapshot', 'Shader', 'Refraction'],
  inset: ['edge', 'centre', 'edge'],
  insetNote: 'Offset grows toward the bevel',
  layers: ['refraction', 'bevel', 'frost', 'specular', 'shadow'],
  v3: ['New in v3:', 'tint', 'aberration', 'fluid'],
  many: ['Many lenses.', 'One canvas.'],
  fallbackTitle: 'Automatic fallback',
  chain: ['WebGPU', 'WebGL2', 'WebGL1', 'CSS'],
  codeTitle: 'One function call',
  code1: 'npm install liquid-gl',
  code2: ['liquidGL', '({ ', 'target', ': ', '".liquidGL"', ' })'],
  cardLabel: '.liquidGL',
  end: ['Open source', 'MIT'],
  site: 'liquidgl.naughtyduk.com',
};

/* ---------- maths ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const P = (t, a, d) => ease((t - a) / d);
/* viscous settle: eases in, overshoots a touch and settles like something thick */
const settle = t => { t = clamp(t); if (t >= 1) return 1; const e = ease(Math.min(1, t * 1.25)); return e + Math.sin(t * Math.PI) * 0.035 * (1 - t); };
const S = (t, a, d) => settle((t - a) / d);

/* ---------- canvases ---------- */
const glc = document.getElementById('gl');
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const bgC = mk(), fgC = mk();
const B = bgC.getContext('2d', { willReadFrequently: true }), F = fgC.getContext('2d', { willReadFrequently: true });   // CPU raster: the GPU canvas path replayed stale text after reset

const dotTile = (() => { const c = document.createElement('canvas'); c.width = c.height = 36; const x = c.getContext('2d');
  x.fillStyle = 'rgba(255,255,255,0.13)'; x.beginPath(); x.arc(18, 18, 1.6, 0, 7); x.fill(); return c; })();
const noiseTile = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const d = x.createImageData(256, 256); let s = 1234567;
  for (let i = 0; i < d.data.length; i += 4) { s = (s * 1103515245 + 12345) & 0x7fffffff; const v = s % 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; d.data[i + 3] = v * 0.45; }
  x.putImageData(d, 0, 0); return c; })();

/* ---------- 2D helpers ---------- */
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function font(c, size, weight = 600, fam = 'Inter') { c.font = `${weight} ${size}px ${fam === 'mono' ? 'JBM' : 'Inter'}`; }
function txt(c, s, x, y, o = {}) {
  const { size = 48, weight = 600, color = C.ink, align = 'left', alpha = 1, fam = 'Inter', ls = 0, base = 'alphabetic' } = o;
  if (alpha <= 0) return 0;
  c.save(); font(c, size, weight, fam); c.letterSpacing = ls + 'px'; c.textAlign = align; c.textBaseline = base;
  c.globalAlpha *= alpha; c.fillStyle = color; c.fillText(s, x, y); const w = c.measureText(s).width; c.restore(); return w;
}
function measure(c, s, size, weight = 600, fam = 'Inter', ls = 0) { c.save(); font(c, size, weight, fam); c.letterSpacing = ls + 'px'; const w = c.measureText(s).width; c.restore(); return w; }
/* text line that rises and fades in at t0 */
function lineIn(c, s, x, y, t, t0, o = {}) { const p = P(t, t0, 0.6); txt(c, s, x, y + (1 - p) * 26, { ...o, alpha: p * (o.alpha ?? 1) }); return p; }

function ground(c, T, blobs, grid = 1) {
  c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
  c.save(); c.globalCompositeOperation = 'screen';
  blobs.forEach((b, i) => {
    const x = b[0] + Math.sin(T * 0.23 + i * 1.7) * 60, y = b[1] + Math.cos(T * 0.19 + i * 2.3) * 45;
    const g = c.createRadialGradient(x, y, 0, x, y, b[2]);
    g.addColorStop(0, hexA(b[3], b[4])); g.addColorStop(0.55, hexA(b[3], b[4] * 0.35)); g.addColorStop(1, hexA(b[3], 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  });
  c.restore();
  if (grid > 0) { c.save(); c.globalAlpha = grid; c.fillStyle = c.createPattern(dotTile, 'repeat'); c.fillRect(0, 0, W, H); c.restore(); }
}
function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

/* a simplified browser window with live content; x,y top left, drawn at 860 x 560 then scaled */
function drawPage(c, x, y, w, T, o = {}) {
  const s = w / 860;
  c.save(); c.translate(x, y); c.scale(s, s);
  c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 40; c.shadowOffsetY = 18;
  rr(c, 0, 0, 860, 560, 22); c.fillStyle = '#131826'; c.fill(); c.restore();
  c.save(); rr(c, 0, 0, 860, 560, 22); c.clip();
  c.fillStyle = '#1A2031'; c.fillRect(0, 0, 860, 54);
  [28, 52, 76].forEach(dx => { c.beginPath(); c.arc(dx, 27, 7, 0, 7); c.fillStyle = '#394157'; c.fill(); });
  rr(c, 120, 14, 560, 26, 13); c.fillStyle = '#0E1220'; c.fill();
  txt(c, COPY.url, 142, 33, { size: 16, weight: 500, color: '#7C869C' });
  // live video thumbnail
  const vx = 40, vy = 92, vw = 400, vh = 226, ph = T * 0.9;
  c.save(); rr(c, vx, vy, vw, vh, 14); c.clip();
  const g = c.createLinearGradient(vx, vy, vx + vw, vy + vh);
  g.addColorStop(0, '#FF7A59'); g.addColorStop(0.5 + 0.25 * Math.sin(ph), '#8B5CF6'); g.addColorStop(1, '#4C8DFF');
  c.fillStyle = g; c.fillRect(vx, vy, vw, vh);
  for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(vx + 60 + i * 95 + Math.sin(ph + i) * 22, vy + 120 + Math.cos(ph * 1.3 + i) * 50, 34 + i * 6, 0, 7); c.fillStyle = 'rgba(255,255,255,0.16)'; c.fill(); }
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(vx, vy + vh - 8, vw, 8);
  c.fillStyle = '#FFFFFF'; c.fillRect(vx, vy + vh - 8, vw * ((T * 0.12) % 1), 8);
  c.restore();
  c.beginPath(); c.moveTo(vx + vw / 2 - 18, vy + vh / 2 - 24); c.lineTo(vx + vw / 2 + 26, vy + vh / 2); c.lineTo(vx + vw / 2 - 18, vy + vh / 2 + 24); c.closePath(); c.fillStyle = '#FFFFFF'; c.fill();
  txt(c, COPY.live, 474, 128, { size: 34, weight: 700 });
  [330, 300, 340, 220].forEach((bw, i) => { rr(c, 474, 156 + i * 30, bw, 12, 6); c.fillStyle = '#2A3248'; c.fill(); });
  [740, 700, 760, 520, 690, 610].forEach((bw, i) => { rr(c, 40, 354 + i * 30, bw, 12, 6); c.fillStyle = i === 0 ? '#3A4560' : '#262D42'; c.fill(); });
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,0.10)'; c.lineWidth = 2; rr(c, 0, 0, 860, 560, 22); c.stroke();
  c.restore();
}

function drawChip(c, x, y, s, a = 1) {
  c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha *= a;
  c.strokeStyle = C.blue; c.lineWidth = 6; c.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    const p = i * 22;
    [[p, -70, p, -92], [p, 70, p, 92], [-70, p, -92, p], [70, p, 92, p]].forEach(l => { c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(l[2], l[3]); c.stroke(); });
  }
  rr(c, -70, -70, 140, 140, 22); c.fillStyle = '#15204A'; c.fill(); c.lineWidth = 4; c.stroke();
  rr(c, -46, -46, 92, 92, 12); c.strokeStyle = 'rgba(76,141,255,0.5)'; c.lineWidth = 2; c.stroke();
  txt(c, COPY.gpu, 0, 13, { size: 36, weight: 700, color: C.blue, align: 'center' });
  c.restore();
}

function drawLock(c, x, y, s, shut, a = 1) {
  c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha *= a;
  const lift = (1 - shut) * 26;
  c.strokeStyle = C.ink; c.lineWidth = 11; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-24, -6 - lift); c.lineTo(-24, -30 - lift); c.arc(0, -30 - lift, 24, Math.PI, 0); c.lineTo(24, -6 - lift * (1 - shut) - (1 - shut) * 14); c.stroke();
  rr(c, -42, -10, 84, 70, 14); c.fillStyle = C.ink; c.fill();
  c.beginPath(); c.arc(0, 18, 8, 0, 7); c.fillStyle = '#12151E'; c.fill(); c.fillRect(-3.5, 20, 7, 18);
  c.restore();
}

/* ---------- panes ---------- */
function pane(o) {
  return Object.assign({ x: W / 2, y: H / 2, w: 600, h: 360, r: 60, rot: 0, bevel: 70, refr: 48, mag: 1.06, frost: 0, aberr: 0,
    spec: 1, specPos: null, shadow: 1, alpha: 1, rim: 1, lift: 22, tint: [1, 1, 1, 0], ripple: [0, 0, 0, 0], fluid: [0, 0, 0], clip: [0, 0, 0] }, o);
}
const drift = (T, ph = 0) => Math.sin(T * 0.55 + ph) * 0.9;   // slowly moving specular highlight

/* ---------- scenes: fn(bg, fg, t local, T absolute) -> panes ---------- */
const scenes = [];

/* 1 · Hook: flat frosted card, uniform blur, thin border */
scenes.push((b, f, t, T) => {
  ground(b, T, [[520, 520, 520, C.coral, 0.55], [1380, 380, 520, C.blue, 0.5], [1100, 860, 460, C.violet, 0.45]], 0.8);
  // crisp shapes behind the card, so the blur reads as a blur
  b.save(); b.globalAlpha = 0.95;
  [[700, 330, 200, 54, C.blue], [760, 420, 380, 22, '#CDD3E0'], [760, 462, 300, 22, '#CDD3E0'], [1010, 560, 220, 54, C.coral], [690, 520, 120, 120, C.violet]].forEach((r, i) => {
    rr(b, r[0], r[1], r[2], r[3], Math.min(r[2], r[3]) / 2); b.fillStyle = r[4]; b.fill(); });
  txt(b, 'Aa', 1030, 470, { size: 120, weight: 700, color: '#FFFFFF' });
  b.restore();
  const pIn = S(t, 0.15, 1.1);
  const card = pane({ x: 960, y: 470 + (1 - pIn) * 70, w: 640, h: 380, r: 36, bevel: 2, refr: 0, mag: 1, frost: 26, rim: 0.9,
    spec: 0, shadow: 0.7, lift: 10, alpha: pIn });
  // flat look: a milky veil over the blur
  card.tint = [1.25, 1.25, 1.3, 0.35];
  const tagP = P(t, WT(11) - 0.15, 0.4);
  if (tagP > 0) {
    f.save(); f.globalAlpha = tagP; const tx = 960 - 320 + 26, ty = card.y - 190 + 26 - (1 - tagP) * 10;
    const tw = measure(f, COPY.blurTag.toUpperCase(), 20, 700, 'Inter', 1.5) + 32;
    rr(f, tx, ty, tw, 38, 19); f.fillStyle = C.red; f.fill();
    txt(f, COPY.blurTag.toUpperCase(), tx + 16, ty + 26, { size: 20, weight: 700, color: '#FFFFFF', ls: 1.5 });
    f.restore();
  }
  lineIn(f, COPY.hook, 960, 820, t, 0.7, { size: 64, weight: 600, align: 'center', ls: -1.5 });
  return [card];
});

/* 2 · Title: the wordmark seen through a real pane */
scenes.push((b, f, t, T) => {
  ground(b, T, [[460, 300, 560, C.blue, 0.5], [1500, 760, 560, C.violet, 0.5], [1500, 240, 360, C.coral, 0.28]], 1);
  txt(b, COPY.title, 960, 540 + 95, { size: 270, weight: 700, align: 'center', ls: -8, color: '#F4F6FA' });
  const pIn = S(t, 0.0, 1.5);
  const sweep = P(t, 1.7, 1.3);
  const x = lerp(-450, 960, pIn) + Math.sin(Math.max(0, t - 2.2) * 0.9) * 70 * P(t, 2.2, 1);
  return [pane({ x, y: 540, w: 780, h: 360, r: 150, bevel: 95, refr: 50, mag: 1.1, rot: lerp(-0.08, 0, pIn),
    specPos: t < 1.7 ? -1.6 : lerp(-1.6, 1.6, sweep), spec: 1.5, lift: 30 })];
});

/* 3 · Problem: GPU cannot read live pixels */
scenes.push((b, f, t, T) => {
  ground(b, T, [[400, 820, 520, C.violet, 0.35], [1600, 250, 460, C.blue, 0.3]], 0.6);
  drawPage(b, 250, 300, 860, T);
  lineIn(f, COPY.problem, 960, 196, t, WT(29) - SC[2] - 0.2, { size: 58, weight: 600, align: 'center', ls: -1.2 });
  const tApproach = 2.1, tShut = 2.95;
  const approach = P(t, tApproach, 0.75);
  const bounce = t > tShut ? Math.sin(clamp((t - tShut) / 0.55) * Math.PI) * (1 - clamp((t - tShut) / 1.2)) : 0;
  const back = P(t, tShut, 0.7);
  const chipX = lerp(1640, 1360, approach) + back * 120 + bounce * 40;
  drawChip(f, chipX, 580, 1, P(t, 0.9, 0.6));
  const lockIn = S(t, 2.35, 0.5);
  const shut = P(t, tShut - 0.12, 0.14);
  drawLock(f, 1195, 590, 1.05 * (0.7 + 0.3 * lockIn) * (1 + 0.06 * Math.sin(clamp((t - tShut) / 0.3) * Math.PI)), shut, lockIn);
  // the pulse on "security rule"
  const pulse = clamp((t - (WT(40) - SC[2])) / 0.9);
  if (pulse > 0 && pulse < 1) { f.save(); f.strokeStyle = hexA(C.coral, 0.6 * (1 - pulse)); f.lineWidth = 4; f.beginPath(); f.arc(1195, 590, 90 + pulse * 80, 0, 7); f.stroke(); f.restore(); }
  return [pane({ x: 1195, y: 590, w: 190, h: 190, r: 95, bevel: 60, refr: 40, mag: 1.1, alpha: lockIn, specPos: drift(T), lift: 16 })];
});

/* 4 · How it works: snapshot, shader, refraction */
scenes.push((b, f, t, T) => {
  const s0 = SC[3];
  const tSnap = WT(50) - s0, tShader = WT(58) - s0, tBend = WT(60) - s0, tEdge = WT(62) - s0;
  ground(b, T, [[960, 520, 640, C.violet, 0.3], [300, 200, 420, C.blue, 0.3], [1650, 860, 420, C.coral, 0.25]], 0.55);
  // heading with three steps
  const hy = 150, parts = [COPY.steps[0], ' → ', COPY.steps[1], ' → ', COPY.steps[2]];
  const lit = [tSnap, null, tShader, null, tBend];
  const tw = parts.reduce((a, s) => a + measure(f, s, 56, 600, 'Inter', -1), 0);
  let hx = 960 - tw / 2; const hp = P(t, 0.2, 0.6);
  parts.forEach((s, i) => {
    const on = lit[i] != null ? P(t, lit[i] - 0.2, 0.4) : 0.4;
    const col = lit[i] != null ? mixHex('#5A6276', i === 0 ? C.blue : i === 2 ? C.violet : C.coral, on) : '#5A6276';
    hx += txt(f, s, hx, hy + (1 - hp) * 20, { size: 56, weight: 600, color: col, alpha: hp, ls: -1 });
  });
  // the page, snapshot flash, sheet slides into the shader node
  const slideIn = P(t, tSnap + 0.55, 1.0), slideOut = P(t, tShader + 0.3, 0.9);
  const flat = P(t, tSnap - 0.05, 0.35);
  const pageW = 470, pageH = pageW * 560 / 860;
  const nodeX = 960, nodeY = 560;
  // shader node
  const nodeIn = P(t, tSnap - 0.3, 0.6);
  const nodePulse = Math.exp(-Math.pow((t - tShader) * 3, 2));
  b.save(); b.globalAlpha = nodeIn;
  rr(b, nodeX - 150, nodeY - 110, 300, 220, 30); b.fillStyle = '#161A2A'; b.fill();
  b.lineWidth = 3 + nodePulse * 3; b.strokeStyle = mixHex('#3B3260', C.violet, 0.6 + nodePulse * 0.4); b.stroke();
  b.save(); b.translate(nodeX, nodeY - 22); b.rotate(Math.PI / 4); rr(b, -26, -26, 52, 52, 8); b.fillStyle = C.violet; b.fill(); b.restore();
  txt(b, COPY.steps[1], nodeX, nodeY + 70, { size: 30, weight: 600, align: 'center', color: '#D6D0F5' });
  b.restore();
  // snapshot sheet travelling: left -> node -> right
  let sx, sc;
  if (t < tShader) { sx = lerp(340, nodeX, slideIn); sc = lerp(1, 0.42, slideIn); }
  else { sx = lerp(nodeX, 1560, slideOut); sc = lerp(0.42, 1, slideOut); }
  const inside = t >= tSnap + 1.35 && t < tShader + 0.35;
  if (!inside) {
    b.save(); b.translate(sx, nodeY);
    const sk = flat * (1 - slideOut) * 0.12;
    b.transform(1, sk * 0.35, 0, 1, 0, 0); b.scale(sc, sc);
    drawPage(b, -pageW / 2, -pageH / 2, pageW, t < tSnap ? T : SC[3] + tSnap, {});
    if (flat > 0 && slideOut < 1) {   // crop marks: it is a texture now
      b.strokeStyle = hexA(C.blue, 0.8 * flat); b.lineWidth = 3 / sc;
      const m = 18, X = pageW / 2 + 12, Y = pageH / 2 + 12;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, c2]) => { b.beginPath(); b.moveTo(a * X, c2 * Y + -c2 * m); b.lineTo(a * X, c2 * Y); b.lineTo(a * X - a * m, c2 * Y); b.stroke(); });
    }
    b.restore();
  }
  // camera flash
  const fl = Math.exp(-Math.pow((t - tSnap) * 5, 2)) * (t > tSnap - 0.3 ? 1 : 0);
  if (fl > 0.01) { f.save(); const g = f.createRadialGradient(340, nodeY, 0, 340, nodeY, 520); g.addColorStop(0, `rgba(255,255,255,${0.95 * fl})`); g.addColorStop(1, 'rgba(255,255,255,0)'); f.fillStyle = g; f.fillRect(0, 0, W, H); f.restore(); }
  // labels under left and right
  txt(f, COPY.steps[0], 340, nodeY + 210, { size: 26, weight: 500, color: C.dim, align: 'center', alpha: P(t, tSnap, 0.4) * (1 - slideIn * 0.6) });
  txt(f, COPY.steps[2], 1560, nodeY + 210, { size: 26, weight: 500, color: C.dim, align: 'center', alpha: P(t, tBend, 0.4) });
  // arrows between
  f.save(); f.globalAlpha = nodeIn * 0.6; f.strokeStyle = C.faint; f.lineWidth = 3;
  [[620, 790], [1130, 1300]].forEach(([a, c2]) => { f.beginPath(); f.moveTo(a, nodeY); f.lineTo(c2, nodeY); f.lineTo(c2 - 12, nodeY - 10); f.moveTo(c2, nodeY); f.lineTo(c2 - 12, nodeY + 10); f.stroke(); });
  f.restore();
  // inset diagram: refraction vectors longer at the edge
  const ip = P(t, tEdge - 0.4, 0.6);
  if (ip > 0) {
    const ix = 960, iy = 905, iw = 760;
    f.save(); f.globalAlpha = ip;
    rr(f, ix - iw / 2 - 40, iy - 90, iw + 80, 170, 24); f.fillStyle = 'rgba(16,19,30,0.86)'; f.fill(); f.strokeStyle = 'rgba(255,255,255,0.08)'; f.lineWidth = 2; f.stroke();
    // pane cross section with bevelled ends
    const top = iy - 30, bot = iy + 10, bev = 120;
    f.beginPath(); f.moveTo(ix - iw / 2, bot); f.quadraticCurveTo(ix - iw / 2, top, ix - iw / 2 + bev, top); f.lineTo(ix + iw / 2 - bev, top); f.quadraticCurveTo(ix + iw / 2, top, ix + iw / 2, bot); f.closePath();
    f.fillStyle = 'rgba(160,190,255,0.12)'; f.fill(); f.strokeStyle = 'rgba(220,230,255,0.75)'; f.lineWidth = 2.5; f.stroke();
    const grow = P(t, tEdge - 0.1, 1.2);
    for (let i = 0; i <= 16; i++) {
      const u = i / 16 * 2 - 1, x = ix + u * (iw / 2 - 14);
      const d = Math.pow(Math.abs(u), 3.2), len = (8 + d * 90) * grow, dir = -Math.sign(u);
      if (len < 2) continue;
      const col = d > 0.4 ? C.coral : C.blue;
      f.strokeStyle = col; f.fillStyle = col; f.lineWidth = 3;
      const y0 = iy + 46;
      f.beginPath(); f.moveTo(x, y0); f.lineTo(x + dir * len, y0); f.stroke();
      if (dir !== 0 && len > 10) { f.beginPath(); f.moveTo(x + dir * len, y0); f.lineTo(x + dir * (len - 9), y0 - 6); f.lineTo(x + dir * (len - 9), y0 + 6); f.fill(); }
    }
    txt(f, COPY.inset[0], ix - iw / 2, iy - 50, { size: 20, weight: 600, color: C.coral });
    txt(f, COPY.inset[1], ix, iy - 50, { size: 20, weight: 600, color: C.blue, align: 'center' });
    txt(f, COPY.inset[2], ix + iw / 2, iy - 50, { size: 20, weight: 600, color: C.coral, align: 'right' });
    f.restore();
  }
  const out = P(t, tBend - 0.25, 0.6);
  const push = P(t, tEdge, 3);
  return [pane({ x: 1560, y: nodeY, w: 400 + push * 30, h: 250 + push * 20, r: 60, bevel: 80, refr: 62, mag: 1.08, alpha: out,
    specPos: drift(T, 1), lift: 22 })];
});
function mixHex(a, b2, t) { const A = parseInt(a.slice(1), 16), Bn = parseInt(b2.slice(1), 16); t = clamp(t);
  const m = (s) => Math.round(lerp((A >> s) & 255, (Bn >> s) & 255, t)); return `rgb(${m(16)},${m(8)},${m(0)})`; }

/* 5 · Anatomy: exploded view of one pane */
scenes.push((b, f, t, T) => {
  const s0 = SC[4];
  ground(b, T, [[700, 400, 560, C.blue, 0.4], [1250, 700, 520, C.coral, 0.32], [1500, 300, 400, C.violet, 0.35]], 1);
  // crisp stripes behind the pane centre so the collapsed pane visibly refracts
  const collapse = P(t, 6.75, 0.75), frontal = P(t, 7.0, 0.7);
  b.save(); b.globalAlpha = 0.25 + 0.75 * frontal;
  for (let i = 0; i < 9; i++) { rr(b, 600 + i * 84, 330, 40, 420, 20); b.fillStyle = [C.blue, C.violet, C.coral][i % 3]; b.fill(); }
  b.restore();
  const tags = [WT(74), WT(75), WT(76), WT(77), WT(79)].map(x => x - s0);   // refraction, bevel, frost, specular, shadow
  // bottom to top: shadow, refraction, frost, bevel, specular
  const order = [4, 0, 2, 1, 3];
  const peel = order.map((li, k) => P(t, 0.35 + k * 0.28, 0.8));
  const cx = 820, cy = 600, pw = 460, ph = 300;
  f.save(); f.globalAlpha = 1 - frontal;
  order.forEach((li, k) => {
    const z = (k - 2) * 120 * peel[k] * (1 - collapse);
    const y = cy - z;
    f.save(); f.setTransform(0.80, 0.40, -0.80, 0.40, cx, y);
    f.globalAlpha *= clamp(peel[k] * 1.5);
    drawLayer(f, li, pw, ph, T);
    f.restore();
    // label
    const lp = P(t, tags[li] - 0.12, 0.35);
    if (lp > 0) {
      const ax = cx + 0.8 * pw / 2 + 10, ay = y + 0.4 * ph / 2 - 0.4 * pw / 2 * 0 ; // right corner of the diamond
      const lx = 1290, ly = y + 8;
      f.save(); f.globalAlpha *= lp; f.strokeStyle = 'rgba(255,255,255,0.35)'; f.lineWidth = 2;
      f.beginPath(); f.moveTo(ax + 120, ay); f.lineTo(lerp(ax + 120, lx - 20, lp), ly - 8); f.stroke();
      f.beginPath(); f.arc(ax + 120, ay, 5, 0, 7); f.fillStyle = '#FFFFFF'; f.fill();
      f.restore();
      txt(f, COPY.layers[li], lx + (1 - lp) * 20, ly, { size: 40, weight: 600, alpha: lp, color: li === 3 ? '#FFFFFF' : C.ink, ls: -0.5 });
    }
  });
  f.restore();
  return [pane({ x: 960, y: 540, w: 640, h: 400, r: 90, bevel: 100, refr: 70, mag: 1.1, alpha: frontal,
    specPos: lerp(-1.6, 1.4, P(t, 7.1, 0.9)), spec: 1.4, lift: 26 })];
});
function drawLayer(c, li, w, h, T) {
  const x = -w / 2, y = -h / 2, r = 46;
  rr(c, x, y, w, h, r);
  if (li === 4) { // shadow
    c.save(); c.filter = 'blur(14px)'; rr(c, x + 10, y + 16, w, h, r); c.fillStyle = 'rgba(0,0,0,0.75)'; c.fill(); c.restore();
    rr(c, x, y, w, h, r); c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 2; c.stroke(); return;
  }
  c.fillStyle = 'rgba(30,38,60,0.55)'; c.fill();
  c.save(); rr(c, x, y, w, h, r); c.clip();
  if (li === 0) { // refraction: a grid that bends toward the bevel
    c.strokeStyle = hexA(C.blue, 0.85); c.lineWidth = 2.5;
    const bend = (u, half) => { const a = Math.abs(u) / half; return Math.sign(u) * half * (a + 0.16 * Math.pow(a, 4) * -1); };
    for (let gx = -w / 2; gx <= w / 2; gx += 38) { c.beginPath(); for (let gy = -h / 2; gy <= h / 2; gy += 6) { const px = bend(gx, w / 2) * (1 - 0.1 * Math.pow(Math.abs(gy) / (h / 2), 4)); gy === -h / 2 ? c.moveTo(px, gy) : c.lineTo(px, gy); } c.stroke(); }
    for (let gy = -h / 2; gy <= h / 2; gy += 38) { c.beginPath(); for (let gx = -w / 2; gx <= w / 2; gx += 6) { const py = bend(gy, h / 2) * (1 - 0.1 * Math.pow(Math.abs(gx) / (w / 2), 4)); gx === -w / 2 ? c.moveTo(gx, py) : c.lineTo(gx, py); } c.stroke(); }
  }
  if (li === 1) { // bevel: bright ring fading inward
    for (let i = 0; i < 14; i++) { rr(c, x + i * 3, y + i * 3, w - i * 6, h - i * 6, r - i * 3); c.strokeStyle = `rgba(220,232,255,${0.5 * Math.pow(1 - i / 14, 2)})`; c.lineWidth = 3; c.stroke(); }
  }
  if (li === 2) { // frost: fine grain
    c.globalAlpha *= 0.55; c.fillStyle = c.createPattern(noiseTile, 'repeat'); c.fillRect(x, y, w, h);
  }
  if (li === 3) { // specular: a diagonal streak that moves
    const sp = Math.sin(T * 1.2) * w * 0.3;
    const g = c.createLinearGradient(x + sp, y, x + sp + 220, y + h);
    g.addColorStop(0.35, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.85)'); g.addColorStop(0.65, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(x, y, w, h);
  }
  c.restore();
  rr(c, x, y, w, h, r); c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 2; c.stroke();
}

/* 6 · New in v3: tint, aberration, fluid. Hard cuts. */
scenes.push((b, f, t, T) => {
  const s0 = SC[5];
  const cutB = WT(86) - s0 - 0.12, cutC = WT(94) - s0 - 0.12;
  const v = t < cutB ? 0 : t < cutC ? 1 : 2;
  const vt = v === 0 ? t : v === 1 ? t - cutB : t - cutC;
  // heading, active word lit
  const parts = [COPY.v3[0] + ' ', COPY.v3[1], ' · ', COPY.v3[2], ' · ', COPY.v3[3]];
  const acc = [null, C.violet, null, C.coral, null, C.blue], idx = [null, 0, null, 1, null, 2];
  const tw = parts.reduce((a, s) => a + measure(f, s, 52, 600, 'Inter', -1), 0);
  let hx = 960 - tw / 2; const hp = P(t, 0.15, 0.5);
  let panes = [];
  if (v === 0) {
    ground(b, T, [[620, 560, 520, C.coral, 0.45], [1340, 520, 520, C.blue, 0.5]], 1);
    tiles(b, T);
    const tint = P(vt, WT(84) - s0 - 0.1, 0.8);
    panes.push(pane({ x: 960, y: 580, w: 700, h: 420, r: 80, bevel: 90, refr: 60, mag: 1.08, tint: [0.32, 0.24, 0.78, 0.85 * tint], specPos: drift(T), lift: 26 }));
  } else if (v === 1) {
    // close up on the edge: everything scaled up, high contrast lines behind
    const z = 1 + 0.12 * P(vt, 0, 2.2);
    b.fillStyle = '#06070A'; b.fillRect(0, 0, W, H);
    b.save(); b.translate(960, 560); b.scale(z, z); b.translate(-960, -560);
    for (let i = 0; i < 26; i++) { b.fillStyle = i % 2 ? '#FFFFFF' : '#D9DEEA'; rr(b, 420 + i * 52, 250, 16, 640, 8); b.fill(); }
    txt(b, 'Aa', 1040, 700, { size: 300, weight: 700, color: '#FFFFFF' });
    b.restore();
    const ab = P(vt, 0.25, 0.9);
    panes.push(pane({ x: 960 + 700 * z, y: 560, w: 1600 * z, h: 1400 * z, r: 300 * z, bevel: 300 * z, refr: 95 * z, mag: 1.0,
      aberr: ab, specPos: -0.2 + drift(T) * 0.2, spec: 0.5, shadow: 0.5 }));
  } else {
    ground(b, T, [[700, 460, 540, C.violet, 0.5], [1300, 700, 520, C.coral, 0.4]], 1.4);
    tiles(b, T);
    const sim = fluidSim(vt);
    panes.push(pane({ x: 960, y: 590, w: 820, h: 460, r: 110, bevel: 90, refr: 55, mag: 1.06, specPos: drift(T), lift: 26,
      fluid: [sim.lx, sim.ly, sim.str], ripple: [sim.lx, sim.ly, sim.rip, vt * 7] }));
    // cursor dot on top
    const ca = P(vt, 0.05, 0.3) * (1 - P(vt, 4.6, 0.4));
    f.save(); f.globalAlpha = ca;
    f.beginPath(); f.arc(sim.cx, sim.cy, 16, 0, 7); f.fillStyle = 'rgba(255,255,255,0.95)'; f.fill();
    f.beginPath(); f.arc(sim.cx, sim.cy, 28, 0, 7); f.strokeStyle = 'rgba(255,255,255,0.4)'; f.lineWidth = 3; f.stroke();
    f.restore();
  }
  parts.forEach((s, i) => {
    const on = idx[i] === v ? 1 : 0;
    const col = acc[i] ? (on ? acc[i] : '#5A6276') : C.ink;
    hx += txt(f, s, hx, 150 + (1 - hp) * 20, { size: 52, weight: 600, color: col, alpha: hp, ls: -1 });
  });
  return panes;
});
function tiles(c, T) { // crisp content behind the v3 panes
  for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) {
    const x = 470 + k * 140, y = 360 + r * 120, col = [C.blue, C.violet, C.coral, '#E8ECF4'][(r + k) % 4];
    rr(c, x, y, 100, 80, 20); c.fillStyle = col; c.globalAlpha = 0.9; c.fill(); c.globalAlpha = 1;
  }
  txt(c, 'liquid', 960, 640, { size: 150, weight: 700, color: '#FFFFFF', align: 'center', ls: -4 });
}
/* cursor path plus a lagging, viscous follower; integrated from the start of the vignette so every frame is deterministic */
function fluidSim(vt) {
  const path = u => { u = clamp(u); const e = ease(u); return [lerp(560, 1360, e), 590 + Math.sin(e * Math.PI * 2) * 120]; };
  const cur = tt => path((tt - 0.3) / 2.6);
  let lx = cur(0)[0], ly = cur(0)[1], vx = 0, vy = 0, dt = 1 / 240, k = 38, damp = 7.5, energy = 0;
  for (let s = 0; s < vt; s += dt) {
    const [tx, ty] = cur(s);
    const ax = k * (tx - lx) - damp * vx, ay = k * (ty - ly) - damp * vy;
    vx += ax * dt; vy += ay * dt; lx += vx * dt; ly += vy * dt;
    const sp = Math.hypot(vx, vy);
    energy += (Math.min(1, sp / 500) - energy) * dt * 4;
  }
  const [cx, cy] = cur(vt);
  const str = 0.04 + 0.13 * energy;
  const rip = 2 + 9 * energy;
  return { cx, cy, lx, ly, str: str * P(vt, 0, 0.3), rip: rip * P(vt, 0, 0.3) };
}

/* 7 · Many lenses, one canvas */
scenes.push((b, f, t, T) => {
  const s0 = SC[6], tStack = WT(107) - s0, tThey = WT(109) - s0, tCanvas = WT(115) - s0;
  ground(b, T, [[560, 400, 520, C.blue, 0.45], [1400, 640, 560, C.violet, 0.45], [960, 900, 400, C.coral, 0.3]], 1.3);
  b.save();
  [[480, 360, 300, C.coral], [1240, 300, 200, C.blue], [1420, 760, 260, '#E8ECF4'], [700, 800, 160, C.violet]].forEach(([x, y, r, col]) => { b.beginPath(); b.arc(x, y, r / 2, 0, 7); b.fillStyle = col; b.fill(); });
  for (let i = 0; i < 6; i++) { rr(b, 860, 470 + i * 46, 380 - (i % 3) * 70, 18, 9); b.fillStyle = '#C9D0DE'; b.fill(); }
  txt(b, 'Aa', 1180, 520, { size: 130, weight: 700 });
  b.restore();
  lineIn(f, COPY.many[0], 960 - 14, 140, t, 0.3, { size: 58, weight: 600, align: 'right', ls: -1.2 });
  lineIn(f, COPY.many[1], 960 + 14, 140, t, tThey - 0.1, { size: 58, weight: 600, align: 'left', ls: -1.2, color: C.blue });
  const defs = [
    { x: 560, y: 560, w: 300, h: 300, r: 150, from: [-300, 300] },        // circle
    { x: 1080, y: 330, w: 470, h: 150, r: 75, from: [1100, -200] },       // pill
    { x: 1400, y: 560, w: 260, h: 260, r: 64, from: [2200, 560] },        // square
    { x: 1010, y: 720, w: 150, h: 380, r: 75, from: [1010, 1400] },       // tall pill
    { x: 760, y: 680, w: 420, h: 270, r: 54, from: [-300, 900] },         // rect, stacks over the circle
  ];
  const panes = defs.map((d, i) => {
    const p = S(t, 0.25 + i * 0.22, 1.1);
    let x = lerp(d.from[0], d.x, p), y = lerp(d.from[1], d.y, p);
    if (i === 4) { const st = S(t, tStack - 0.2, 0.9); x = lerp(x, 670, st); y = lerp(y, 620, st); }
    return pane({ x, y, w: d.w, h: d.h, r: d.r, bevel: Math.min(d.w, d.h) * 0.3, refr: 46, mag: 1.07, rot: (1 - p) * (i % 2 ? 0.2 : -0.2),
      specPos: drift(T, i), lift: 20 + i * 2, alpha: clamp(p * 3) });
  });
  // one shared canvas outline
  const op = P(t, tThey, 0.6), pulse = Math.exp(-Math.pow((t - tCanvas - 0.15) * 3.2, 2));
  if (op > 0) {
    f.save(); f.globalAlpha = op * (0.45 + 0.55 * pulse); f.setLineDash([14, 12]); f.lineWidth = 2.5 + pulse * 2;
    f.strokeStyle = mixHex('#8A93A6', C.blue, pulse); const g = 10 * pulse;
    rr(f, 340 - g, 210 - g, 1300 + 2 * g, 740 + 2 * g, 40); f.stroke(); f.restore();
  }
  return panes;
});

/* 8 · Automatic fallback chain */
scenes.push((b, f, t, T) => {
  const s0 = SC[7];
  const tGPU = WT(119) - s0, tGL = WT(124) - s0, tCSS = WT(126) - s0;
  ground(b, T, [[960, 560, 700, C.blue, 0.22], [300, 900, 400, C.violet, 0.3]], 0.9);
  lineIn(f, COPY.fallbackTitle, 960, 300, t, 0.25, { size: 60, weight: 600, align: 'center', ls: -1.2 });
  const xs = [360, 760, 1160, 1560], y = 600;
  // when each pill lights, and when it dims
  const on = [tGPU - 0.15, tGL - 0.55, tGL + 0.2, tCSS + 0.05];
  const off = [tGL - 0.75, tGL + 0.05, tCSS - 0.15, 99];
  const cols = [C.blue, C.violet, C.violet, C.coral];
  const lvl = xs.map((x, i) => P(t, on[i], 0.25) * (1 - 0.82 * P(t, off[i], 0.3)));
  // glow sits behind the glass so the pill refracts it
  xs.forEach((x, i) => {
    if (lvl[i] <= 0.01) return;
    const g = b.createRadialGradient(x, y, 0, x, y, 220); g.addColorStop(0, hexA(cols[i], 0.9 * lvl[i])); g.addColorStop(1, hexA(cols[i], 0));
    b.fillStyle = g; b.fillRect(x - 240, y - 240, 480, 480);
    b.fillStyle = hexA(cols[i], 0.9 * lvl[i]); rr(b, x - 100, y - 4, 200, 8, 4); b.fill();
  });
  // connectors and travelling pulse
  f.save(); f.strokeStyle = 'rgba(255,255,255,0.18)'; f.lineWidth = 3;
  for (let i = 0; i < 3; i++) { f.beginPath(); f.moveTo(xs[i] + 165, y); f.lineTo(xs[i + 1] - 165, y); f.stroke(); }
  f.restore();
  for (let i = 0; i < 3; i++) {
    const a = off[i] - 0.05, d = on[i + 1] - a + 0.1;
    const u = clamp((t - a) / d);
    if (u > 0 && u < 1) {
      const px = lerp(xs[i] + 165, xs[i + 1] - 165, ease(u));
      const g = f.createRadialGradient(px, y, 0, px, y, 26); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      f.fillStyle = g; f.fillRect(px - 30, y - 30, 60, 60);
    }
  }
  const panes = xs.map((x, i) => {
    const p = S(t, 0.1 + i * 0.12, 0.8);
    const css = i === 3;
    return pane({ x, y: y + (1 - p) * 60, w: 300, h: 116, r: 58, bevel: css ? 2 : 44, refr: css ? 0 : 30, mag: css ? 1 : 1.05,
      frost: css ? 10 : 0, alpha: p, specPos: drift(T, i), lift: 16, spec: css ? 0 : 1, rim: css ? 0.7 : 1 });
  });
  COPY.chain.forEach((s, i) => {
    const p = S(t, 0.1 + i * 0.12, 0.8);
    txt(f, s, xs[i], y + 14 + (1 - p) * 60, { size: 38, weight: 600, align: 'center', alpha: p * (0.45 + 0.55 * Math.max(lvl[i], 0.18)), color: '#FFFFFF' });
  });
  return panes;
});

/* 9 · Code: one function call */
scenes.push((b, f, t, T) => {
  const s0 = SC[8], tPoint = WT(130) - s0, tThat = WT(135) - s0;
  ground(b, T, [[1380, 540, 460, C.coral, 0.55], [1500, 330, 360, C.violet, 0.5], [500, 800, 420, C.blue, 0.25]], 0.8);
  // content behind the right card
  b.save();
  for (let i = 0; i < 5; i++) { b.beginPath(); b.arc(1180 + i * 100, 470 + (i % 2) * 120, 46, 0, 7); b.fillStyle = [C.blue, '#F2F4F8', C.violet, C.coral, C.blue][i]; b.fill(); }
  txt(b, 'Glass', 1380, 690, { size: 96, weight: 700, align: 'center', ls: -3 });
  b.restore();
  lineIn(f, COPY.codeTitle, 960, 190, t, 0.2, { size: 60, weight: 600, align: 'center', ls: -1.2 });
  // editor card
  const ex = 160, ey = 380, ew = 860, eh = 320, ein = S(t, 0.05, 0.6);
  f.save(); f.globalAlpha = ein; f.translate(0, (1 - ein) * 40);
  f.save(); f.shadowColor = 'rgba(0,0,0,0.55)'; f.shadowBlur = 50; f.shadowOffsetY = 20; rr(f, ex, ey, ew, eh, 24); f.fillStyle = '#0F121B'; f.fill(); f.restore();
  rr(f, ex, ey, ew, eh, 24); f.strokeStyle = 'rgba(255,255,255,0.09)'; f.lineWidth = 2; f.stroke();
  [0, 1, 2].forEach(i => { f.beginPath(); f.arc(ex + 32 + i * 24, ey + 30, 7, 0, 7); f.fillStyle = '#2D3446'; f.fill(); });
  f.fillStyle = 'rgba(255,255,255,0.06)'; f.fillRect(ex, ey + 60, ew, 2);
  const size = 34, lx = ex + 46, l1 = ey + 140, l2 = ey + 220;
  const n1 = Math.floor(clamp((t - 0.3) / 0.75) * COPY.code1.length);
  const full2 = COPY.code2.join(''), n2 = Math.floor(clamp((t - (tPoint - 0.25)) / 1.1) * full2.length);
  let x = lx;
  x += txt(f, '$ ', x, l1, { size, weight: 500, fam: 'mono', color: '#5E687E' });
  x += txt(f, COPY.code1.slice(0, n1), x, l1, { size, weight: 500, fam: 'mono', color: C.ink });
  const cols = [C.blue, C.ink, C.violet, C.ink, C.coral, C.ink];
  let x2 = lx, left = n2;
  COPY.code2.forEach((s, i) => { const k = Math.min(left, s.length); left -= k; if (k > 0) x2 += txt(f, s.slice(0, k), x2, l2, { size, weight: 500, fam: 'mono', color: cols[i] }); });
  // cursor
  const onL2 = t > 1.15;
  const cx = onL2 ? x2 : x, cy = onL2 ? l2 : l1;
  const blink = (n1 < COPY.code1.length && !onL2) || (onL2 && n2 > 0 && n2 < full2.length) ? 1 : (Math.floor(t * 2.2) % 2 ? 0 : 1);
  if (t < tThat + 1.6) { f.fillStyle = hexA(C.blue, blink); f.fillRect(cx + 3, cy - 30, 16, 38); }
  f.restore();
  // the plain card turns into liquid glass on Enter
  const go = P(t, tThat - 0.05, 0.5);
  const cx0 = 1380, cy0 = 560, cw = 540, ch = 340;
  f.save();
  rr(f, cx0 - cw / 2, cy0 - ch / 2, cw, ch, 40); f.fillStyle = hexA('#1B2030', 1 - go); f.fill();
  f.strokeStyle = `rgba(255,255,255,${0.10 * (1 - go)})`; f.lineWidth = 2; f.stroke();
  txt(f, COPY.cardLabel, cx0 - cw / 2 + 34, cy0 - ch / 2 + 54, { size: 26, weight: 500, fam: 'mono', color: go > 0.5 ? '#FFFFFF' : C.dim });
  f.restore();
  return [pane({ x: cx0, y: cy0, w: cw, h: ch, r: 40, bevel: 80, refr: 60, mag: 1.1, alpha: go,
    specPos: lerp(-1.6, 1.6, P(t, tThat + 0.1, 1.0)), spec: 1.5, lift: 24 })];
});

/* 10 · End card */
scenes.push((b, f, t, T) => {
  const s0 = SC[9], tOpen = WT(139) - s0, tMIT = WT(141) - s0, tTry = WT(143) - s0;
  ground(b, T, [[520, 380, 560, C.blue, 0.45], [1440, 700, 560, C.violet, 0.45], [1500, 260, 340, C.coral, 0.25]], 1);
  txt(b, COPY.title, 960, 470 + 80, { size: 230, weight: 700, align: 'center', ls: -7, color: '#F4F6FA' });
  const p = S(t, 0.0, 1.4);
  lineIn(f, COPY.end[0], 960 - 24, 760, t, tOpen - 0.15, { size: 44, weight: 500, align: 'right', color: C.ink });
  const dotP = P(t, tMIT - 0.2, 0.5);
  txt(f, '·', 960, 760, { size: 44, weight: 500, align: 'center', color: C.dim, alpha: dotP });
  lineIn(f, COPY.end[1], 960 + 24, 760, t, tMIT - 0.15, { size: 44, weight: 500, align: 'left', color: C.ink });
  lineIn(f, COPY.site, 960, 850, t, tTry + 0.2, { size: 40, weight: 500, align: 'center', color: C.blue, fam: 'mono' });
  const sw = t < 1.6 ? -1.6 : t < 3.4 ? lerp(-1.6, 1.6, P(t, 1.6, 1.4)) : lerp(-1.6, 1.6, P(t, 5.2, 1.4));
  return [pane({ x: 960, y: lerp(-260, 485, p), w: 1180, h: 340, r: 160, bevel: 95, refr: 46, mag: 1.06, rot: lerp(0.06, 0, p),
    specPos: sw, spec: 1.5, lift: 30 })];
});

/* ---------- transitions: a tall pane sweeps right to left; the next scene is revealed through it ---------- */
const WIPE = 0.5, WROT = -0.12;
function wipeAt(T) {
  for (let k = 1; k < SC.length - 1; k++) {
    const a = SC[k] - WIPE, z = SC[k] + WIPE;
    if (T > a && T < z) { const u = (T - a) / (z - a); return { k, u, cx: lerp(W + 520, -520, ease(u)) }; }
  }
  return null;
}
const lineX = (wp, y) => wp.cx + (y - H / 2) * Math.tan(WROT);
function clipSide(c, wp, side) {
  c.beginPath();
  const xt = lineX(wp, -10), xb = lineX(wp, H + 10);
  if (side > 0) { c.moveTo(-10, -10); c.lineTo(xt, -10); c.lineTo(xb, H + 10); c.lineTo(-10, H + 10); }
  else { c.moveTo(xt, -10); c.lineTo(W + 10, -10); c.lineTo(W + 10, H + 10); c.lineTo(xb, H + 10); }
  c.closePath(); c.clip();
}

/* ---------- WebGL ---------- */
const gl = glc.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false, alpha: false });
const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
const PANE_FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc; uniform vec2 uRes;
uniform vec2 uC, uHalf; uniform float uRad, uRot, uBevel, uRefr, uMag, uFrost, uAberr, uSpec, uSpecPos, uShadow, uAlpha, uRim, uLift;
uniform vec4 uTint, uRipple; uniform vec3 uFluid, uClip;
out vec4 o;
float sdRR(vec2 p){ vec2 q = abs(p) - uHalf + uRad; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - uRad; }
vec2 toL(vec2 d){ float c = cos(uRot), s = sin(uRot); return vec2(c*d.x + s*d.y, -s*d.x + c*d.y); }
vec2 toW(vec2 v){ float c = cos(uRot), s = sin(uRot); return vec2(c*v.x - s*v.y, s*v.x + c*v.y); }
vec3 tex(vec2 p){ p = clamp(p, vec2(0.5), uRes - 0.5); return texture(uSrc, vec2(p.x, uRes.y - p.y) / uRes).rgb; }
vec3 samp(vec2 p){
  if (uFrost < 0.5) return tex(p);
  vec3 a = vec3(0.);
  float ws = 0.;
  for (int i = 0; i < 64; i++) { float fi = float(i); float u = (fi + .5) / 64.; float r = sqrt(u) * uFrost * 1.4; float th = fi * 2.39996; float w = exp(-u * 2.5); a += tex(p + vec2(cos(th), sin(th)) * r) * w; ws += w; }
  return a / ws;
}
void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec3 base = tex(px);
  float side = uClip.z;
  float lx = uClip.x + (px.y - uRes.y * .5) * uClip.y;
  if ((side > .5 && px.x >= lx) || (side < -.5 && px.x < lx) || uAlpha <= .001) { o = vec4(base, 1.); return; }
  vec2 lp = toL(px - uC);
  float sd = sdRR(lp);
  vec2 sp = toL(px - uC - vec2(0., 10. + uLift * .5));
  float ss = sdRR(sp);
  float sh = uShadow * .42 * (1. - smoothstep(-24., 34. + uLift * 1.4, ss)) * step(0., sd);
  base *= 1. - sh * uAlpha;
  if (sd > 1.) { o = vec4(base, 1.); return; }
  float aa = clamp(.5 - sd, 0., 1.);
  float d = max(-sd, 0.);
  float t = clamp(d / max(uBevel, 1.), 0., 1.);
  vec2 e = vec2(1., 0.);
  vec2 g = vec2(sdRR(lp + e.xy) - sdRR(lp - e.xy), sdRR(lp + e.yx) - sdRR(lp - e.yx));
  g = length(g) > 1e-4 ? normalize(g) : vec2(0.);
  float prof = pow(1. - t, 2.4);
  vec2 off = toW(-g * uRefr * prof + (lp / uMag - lp));
  if (uFluid.z > .001) { vec2 dv = px - uFluid.xy; float R = min(uHalf.x, uHalf.y) * .85; off -= dv * exp(-dot(dv, dv) / (R * R)) * uFluid.z; }
  if (uRipple.z > .001) { vec2 dv = px - uRipple.xy; float r = length(dv) + 1.; off += dv / r * sin(r * .05 - uRipple.w) * exp(-r / 240.) * uRipple.z; }
  vec3 col;
  if (uAberr > .001) {
    col.r = samp(px + off * (1. - .08 * uAberr)).r;
    col.g = samp(px + off).g;
    col.b = samp(px + off * (1. + .16 * uAberr)).b;
  } else col = samp(px + off);
  col = col * 1.03 + .012;
  col = mix(col, col * uTint.rgb * 1.5 + uTint.rgb * .06, uTint.a);
  vec2 n = toW(g);
  vec2 L = normalize(vec2(-.55, -.85));
  float edge = pow(1. - t, 3.);
  float lit = max(dot(n, L), 0.), dark = max(dot(n, -L), 0.);
  col += uRim * (edge * lit * .42 + smoothstep(2.2, 0., d) * .38 + edge * dark * .08);
  float s = dot(lp / uHalf.x, normalize(vec2(1., -.6))) - uSpecPos;
  col += uSpec * (exp(-s * s * 70.) * .2 + exp(-s * s * 7.) * .045) * (.65 + .35 * edge);
  o = vec4(mix(base, col, aa * uAlpha), 1.);
}`;
const COMP_FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc, uFg; uniform vec2 uRes;
out vec4 o;
void main(){ vec2 uv = gl_FragCoord.xy / uRes; vec3 b = texture(uSrc, uv).rgb; vec4 f = texture(uFg, uv); o = vec4(mix(b, f.rgb, f.a), 1.); }`;
const OUT_FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc; uniform vec2 uRes; uniform float uFade, uSeed;
out vec4 o;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; vec3 c = texture(uSrc, uv).rgb;
  vec2 q = uv - .5; c *= 1. - dot(q, q) * .35;
  c += (h(gl_FragCoord.xy) - .5) / 255. * 1.5;
  o = vec4(c * uFade, 1.);
}`;
function prog(fs) {
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
  return { p, u };
}
const PP = prog(PANE_FS), PC = prog(COMP_FS), PO = prog(OUT_FS);
const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
function texNew() { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; }
const texBg = texNew(), texFg = texNew();
const fbos = [0, 1].map(() => { const t = texNew(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, fb }; });
let ping = 0;
function upload(tex, canvas) { gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas); }
function pass(pr, src, setU, toScreen) {
  gl.useProgram(pr.p);
  const dst = fbos[ping];
  gl.bindFramebuffer(gl.FRAMEBUFFER, toScreen ? null : dst.fb); gl.viewport(0, 0, W, H);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); gl.uniform1i(pr.u.uSrc, 0);
  gl.uniform2f(pr.u.uRes, W, H);
  setU(pr.u);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  if (toScreen) return null;
  ping ^= 1; return dst.t;
}
function panePass(src, q, T) {
  return pass(PP, src, u => {
    gl.uniform2f(u.uC, q.x, q.y); gl.uniform2f(u.uHalf, q.w / 2, q.h / 2);
    gl.uniform1f(u.uRad, Math.min(q.r, q.w / 2, q.h / 2)); gl.uniform1f(u.uRot, q.rot);
    gl.uniform1f(u.uBevel, q.bevel); gl.uniform1f(u.uRefr, q.refr); gl.uniform1f(u.uMag, q.mag); gl.uniform1f(u.uFrost, q.frost);
    gl.uniform1f(u.uAberr, q.aberr); gl.uniform1f(u.uSpec, q.spec); gl.uniform1f(u.uSpecPos, q.specPos ?? drift(T));
    gl.uniform1f(u.uShadow, q.shadow); gl.uniform1f(u.uAlpha, clamp(q.alpha)); gl.uniform1f(u.uRim, q.rim); gl.uniform1f(u.uLift, q.lift);
    gl.uniform4fv(u.uTint, q.tint); gl.uniform4fv(u.uRipple, q.ripple); gl.uniform3fv(u.uFluid, q.fluid); gl.uniform3fv(u.uClip, q.clip);
  });
}

/* ---------- frame ---------- */
function sceneAt(T) { for (let i = 0; i < 10; i++) if (T < SC[i + 1]) return i; return 9; }
function drawScene(i, T, wp, side) {
  B.save(); F.save();
  if (wp) { clipSide(B, wp, side); clipSide(F, wp, side); }
  const ps = scenes[i](B, F, T - SC[i], T) || [];
  B.restore(); F.restore();
  if (wp) ps.forEach(q => { q.clip = [wp.cx, Math.tan(WROT), side]; });
  return ps;
}
function renderFrame(f) {
  const T = f / FPS;
  B.reset(); F.reset();   // full state + pixel reset; clearRect alone left stale fg pixels in Chromium
  const wp = wipeAt(T);
  let panes;
  if (wp) panes = [...drawScene(wp.k - 1, T, wp, 1), ...drawScene(wp.k, T, wp, -1)];
  else panes = drawScene(sceneAt(T), T, null, 0);
  upload(texBg, bgC); upload(texFg, fgC);
  let src = texBg;
  for (const q of panes) src = panePass(src, q, T);
  src = pass(PC, src, u => { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texFg); gl.uniform1i(u.uFg, 1); });
  if (wp) {
    const strength = Math.sin(wp.u * Math.PI);
    src = panePass(src, pane({ x: wp.cx, y: H / 2, w: 560, h: 1500, r: 200, rot: WROT, bevel: 200, refr: 130, mag: 1.18,
      aberr: 0.6, specPos: 0.1, spec: 1.2, shadow: 0.9, lift: 30, alpha: clamp(strength * 4) }), T);
  }
  const fade = Math.min(clamp(T / 0.5), 1 - P(T, DURATION - 0.75, 0.7));
  pass(PO, src, u => { gl.uniform1f(u.uFade, fade); gl.uniform1f(u.uSeed, (f * 7.13) % 100); }, true);
}

/* ---------- audio cues (read by render.js, mixed by audio.py) ---------- */
function cues() {
  const c = [];
  for (let k = 1; k < 10; k++) c.push({ t: SC[k] - WIPE, type: 'whoosh' });
  c.push({ t: SC[0] + 0.2, type: 'whoosh', g: 0.5 });
  c.push({ t: WT(11) - 0.15, type: 'tick' });
  c.push({ t: SC[1] + 1.2, type: 'chime' });
  c.push({ t: SC[2] + 2.83, type: 'snap' });
  c.push({ t: WT(50) - 0.02, type: 'flash' });
  c.push({ t: WT(58), type: 'tick' });
  c.push({ t: WT(60) - 0.2, type: 'chime', g: 0.7 });
  [74, 75, 76, 77, 79].forEach(i => c.push({ t: WT(i) - 0.12, type: 'tick', g: 0.6 }));
  c.push({ t: SC[4] + 7.0, type: 'chime', g: 0.7 });
  c.push({ t: WT(86) - 0.12, type: 'cut' }); c.push({ t: WT(94) - 0.12, type: 'cut' });
  for (let i = 0; i < 5; i++) c.push({ t: SC[6] + 0.25 + i * 0.22, type: 'whoosh', g: 0.35 });
  c.push({ t: WT(115) + 0.1, type: 'chime', g: 0.5 });
  [WT(119) - 0.15, WT(124) - 0.55, WT(124) + 0.2, WT(126) + 0.05].forEach(t => c.push({ t, type: 'tick', g: 0.7 }));
  for (let i = 0; i < 21; i++) c.push({ t: SC[8] + 0.3 + i * 0.75 / 21, type: 'key' });
  for (let i = 0; i < 33; i++) c.push({ t: WT(130) - 0.25 + i * 1.1 / 33, type: 'key' });
  c.push({ t: WT(135) - 0.05, type: 'enter' }); c.push({ t: WT(135) + 0.05, type: 'chime' });
  c.push({ t: SC[9] + 1.15, type: 'chime', g: 0.8 });
  return c.map(x => ({ g: 1, ...x }));
}

function allText() { return COPY; }
window.renderFrame = renderFrame;
window.TOTAL_FRAMES = TOTAL_FRAMES;
window.allText = allText;
window.cues = cues;
window.ready = Promise.all(['400 20px Inter', '500 20px Inter', '600 20px Inter', '700 20px Inter', '500 20px JBM'].map(s => document.fonts.load(s)))
  .then(() => { renderFrame(0); });
