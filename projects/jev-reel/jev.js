/* Jev reel, 1080 x 1920 @ 30 fps. One deterministic timeline: window.renderFrame(f) draws frame f.
   ?v=ig (ends "Comment Jev and I'll DM you the links") | ?v=yt (ends "Links are in the pinned comment").
   Every animation keys off a spoken word index (see the word list in README.md), so a new VO take only needs vo.py rerun. */

const V = new URLSearchParams(location.search).get('v') || 'ig';
const TM = TIMING[V];
const FPS = 30, W = 1080, H = 1920;
const TOTAL = TM.total;
window.TOTAL_FRAMES = Math.round(TOTAL * FPS);

const C = { bg: '#0B0D12', ink: '#FFFFFF', acc: '#3DFF8F', dim: '#8A93A6', chip: '#2A2F3A', chipHi: '#C9CED8',
  cold: '#4DA3FF', grey: '#9AA1AE', red: '#FF4D5E', panel: '#141822' };
const COND = '"Barlow Condensed", sans-serif', BODY = '"Anek Latin", sans-serif';

/* every on screen string */
const COPY = {
  cantWrite: "CAN'T WRITE", chips: ['YES', 'NO', 'WARM', 'COLD'], model: 'OPUS', opusPrices: 'OPUS PRICES',
  illustrative: 'illustrative', jev: 'JEV', from: 'FROM TYPESAFE AI',
  price: '$0.042', priceUnit: '/ 1M INPUT TOKENS', outFree: 'OUTPUT: FREE', priceSrc: 'Source: typesafe.ai launch post, Oct 2026',
  ways: '4 WAYS',
  heads: ['1. ROUTE', '2. TRIAGE', '3. SCORE', '4. GUARDRAILS'],
  router: ['JEV', 'ROUTER'], lanes: ['SMALL', 'MEDIUM', 'LARGE'], live: 'LIVE ON OPENROUTER', modelId: 'typesafe/jev-router',
  leads: 'LEAD EMAILS', tags: ['WARM', 'COLD', 'NOT A LEAD'],
  rubric: 'RUBRIC', rubricLines: ['Urgent', 'Customer impact', 'Clear next step'], ticket: 'Ticket', conf: 'CONFIDENCE',
  tf: ['TRUE', 'FALSE'],
  thinks: 'CLAUDE THINKS', decides: 'JEV DECIDES', fire: ['TAG', 'SEND', 'ROUTE', 'BLOCK', 'SCORE', 'FLAG'],
  early: 'EARLY ACCESS. TEST FIRST.', comment: 'COMMENT', links: ['LINKS IN THE', 'PINNED COMMENT'],
};

/* ---------- word timing ---------- */
const WT = {}; TM.words.forEach(w => WT[w.i] = w);
const T = i => WT[i].t, E = i => WT[i].e;
const has = i => i in WT;
const CUT = i => T(i) - 0.06;        // scene cuts land just before the word

/* ---------- maths ---------- */
const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ramp = (t, a, d) => cl((t - a) / d);
const eo = k => 1 - Math.pow(1 - k, 3);
const eio = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const back = k => { const c = 2.2; return k >= 1 ? 1 : 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const slam = (t, t0, d = 0.22) => t < t0 ? 0 : back(cl((t - t0) / d));   // scale overshoot
function rnd(s) { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

/* ---------- canvas ---------- */
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const img = {};
function load(n) { return new Promise(r => { const i = new Image(); i.onload = () => { img[n] = i; r(); }; i.src = `assets/${n}.png`; }); }
const blurred = {};
function makeBlur(n) {
  const i = img[n], c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); const s = Math.max(W / i.width, H / i.height) * 1.1;
  g.filter = 'blur(40px) brightness(0.35) saturate(0.8)';
  g.drawImage(i, (W - i.width * s) / 2, (H - i.height * s) / 2, i.width * s, i.height * s);
  blurred[n] = c;
}
const grain = [];
function makeGrain() {
  for (let k = 0; k < 4; k++) {
    const c = document.createElement('canvas'); c.width = 360; c.height = 640; const g = c.getContext('2d');
    const d = g.createImageData(360, 640);
    for (let p = 0; p < d.data.length; p += 4) { const v = rnd(p * 0.37 + k * 999) * 255; d.data[p] = d.data[p + 1] = d.data[p + 2] = v; d.data[p + 3] = 14; }
    g.putImageData(d, 0, 0); grain.push(c);
  }
}

function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function font(sz, wt = 900, fam = COND) { ctx.font = `${wt} ${sz}px ${fam}`; }
function txt(s, x, y, o = {}) {
  font(o.size || 80, o.weight || 900, o.fam || COND);
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
  if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.stroke; ctx.strokeStyle = o.strokeColor || 'rgba(0,0,0,.85)'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = o.color || C.ink; ctx.fillText(s, x, y);
}
function withT(x, y, s, fn, rot = 0) { ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(s, s); fn(); ctx.restore(); }

/* green slab card with black type, slams in with overshoot */
function card(s, x, y, t, t0, o = {}) {
  const k = slam(t, t0); if (k <= 0) return;
  const size = o.size || 110; font(size, 900);
  const tw = ctx.measureText(s).width, pw = tw + size * 0.7, ph = size * 1.12;
  withT(x, y, k, () => {
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    ctx.fillStyle = o.bg || C.acc; rr(-pw / 2, -ph / 2, pw, ph, 18); ctx.fill(); ctx.shadowColor = 'transparent';
    txt(s, 0, size * 0.04, { size, color: o.color || '#06120B' });
  }, o.rot || -0.03);
}
function chip(s, x, y, sc, o = {}) {
  const size = o.size || 52; font(size, 800);
  const w = ctx.measureText(s).width + size * 0.9, h = size * 1.35;
  withT(x, y, sc, () => {
    ctx.globalAlpha *= o.alpha ?? 1;
    ctx.fillStyle = o.bg || C.chip; rr(-w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = o.line || 'rgba(255,255,255,.35)'; ctx.stroke();
    txt(s, 0, size * 0.05, { size, weight: 800, color: o.color || C.ink });
  }, o.rot || 0);
}
function glowBox(x, y, w, h, r, color, glow) {
  ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = glow;
  ctx.lineWidth = 7; ctx.strokeStyle = color; rr(x - w / 2, y - h / 2, w, h, r); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = 'rgba(11,13,18,.92)'; rr(x - w / 2 + 4, y - h / 2 + 4, w - 8, h - 8, r - 4); ctx.fill();
}
function bgDark(t, seed = 0) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, 820, 50, W / 2, 820, 1100);
  g.addColorStop(0, 'rgba(61,255,143,.07)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 2;   // sketch hatching, echoes the storyboard texture
  for (let k = 0; k < 26; k++) { const y = ((k * 97 + seed * 31) % 2200) - 150; ctx.beginPath(); ctx.moveTo(-50, y); ctx.lineTo(W + 50, y - 260); ctx.stroke(); }
}
function header(n, t, t0) {   // full screen name card for ~0.75 s, then it docks at the top
  const s = COPY.heads[n]; const k = slam(t, t0, 0.25), m = eio(ramp(t, t0 + 0.75, 0.22));
  if (m < 1) {   // full screen moment: darken whatever is behind
    ctx.fillStyle = `rgba(11,13,18,${0.97 * (1 - m)})`; ctx.fillRect(0, 0, W, H);
  }
  const size = lerp(190, 96, m), y = lerp(860, 330, m);
  font(size, 900); const tw = ctx.measureText(s).width;
  withT(W / 2, y, k, () => {
    ctx.fillStyle = C.acc; ctx.beginPath();   // brush slab
    const pw = tw + size * 0.6, ph = size * 1.05;
    ctx.moveTo(-pw / 2 + 10, -ph / 2); ctx.lineTo(pw / 2, -ph / 2 + 8); ctx.lineTo(pw / 2 - 12, ph / 2); ctx.lineTo(-pw / 2, ph / 2 - 6); ctx.closePath(); ctx.fill();
    txt(s, 0, size * 0.04, { size, color: '#06120B' });
  }, -0.035);
}
function envelope(x, y, w, sc, o = {}) {
  const h = w * 0.68;
  withT(x, y, sc, () => {
    ctx.globalAlpha *= o.alpha ?? 1;
    if (o.glow) { ctx.shadowColor = C.acc; ctx.shadowBlur = o.glow; }
    ctx.fillStyle = o.fill || '#F2F4F7'; rr(-w / 2, -h / 2, w, h, 6); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-w / 2 + 4, -h / 2 + 4); ctx.lineTo(0, h * 0.08); ctx.lineTo(w / 2 - 4, -h / 2 + 4); ctx.stroke();
    if (o.tag) { ctx.fillStyle = o.tag; rr(w * 0.12, h * 0.12, w * 0.36, h * 0.28, 4); ctx.fill(); }
  }, o.rot || 0);
}
function pen(x, y, sc, rot = -0.6) {
  withT(x, y, sc, () => {
    ctx.fillStyle = '#E8EBF0'; rr(-8, -70, 16, 64, 4); ctx.fill();
    ctx.fillStyle = C.acc; ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(8, -6); ctx.lineTo(0, 10); ctx.closePath(); ctx.fill();
  }, rot);
}
function check(x, y, s, color = C.acc) {
  ctx.strokeStyle = color; ctx.lineWidth = s * 0.18; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - s * 0.4, y); ctx.lineTo(x - s * 0.1, y + s * 0.3); ctx.lineTo(x + s * 0.45, y - s * 0.35); ctx.stroke();
}

/* ---------- presenter (storyboard art until the real take replaces it) ---------- */
function presenter(n, t, t0, punchAt, o = {}) {
  ctx.drawImage(blurred[n], 0, 0);
  const i = img[n];
  let s = (o.w || W) / i.width;
  let z = 1 + 0.05 * ramp(t, t0, 6);                                     // slow push in
  if (punchAt != null) z *= 1 + 0.16 * eo(ramp(t, punchAt, 0.12));      // punch in on the word
  const cy = o.cy || 800;
  ctx.save(); ctx.translate(W / 2, cy); ctx.scale(z, z);
  ctx.drawImage(i, -i.width * s / 2, -i.height * s / 2, i.width * s, i.height * s);
  ctx.restore();
  // soft edge into the blurred fill
  const hh = i.height * s * z / 2, g1 = ctx.createLinearGradient(0, cy + hh - 160, 0, cy + hh);
  g1.addColorStop(0, 'rgba(11,13,18,0)'); g1.addColorStop(1, 'rgba(11,13,18,.95)'); ctx.fillStyle = g1; ctx.fillRect(0, cy + hh - 160, W, 170);
  const g2 = ctx.createLinearGradient(0, cy - hh, 0, cy - hh + 120);
  g2.addColorStop(0, 'rgba(11,13,18,.9)'); g2.addColorStop(1, 'rgba(11,13,18,0)'); ctx.fillStyle = g2; ctx.fillRect(0, cy - hh - 10, W, 130);
}

/* ---------- scenes ---------- */
const S = [];   // {from: word index, draw(t)}
const last = V === 'ig' ? 157 : 163;
const endIdx = V === 'ig' ? 150 : 158;

// 1 hook
S.push({ from: 0, draw: t => {
  presenter('pres_hook', t, 0, T(7), { cy: 820 });
  card(COPY.cantWrite, 540, 1170, t, T(3), { size: 120 });
} });
// 2 + 3 tiny decisions flow into an expensive model, cost counter climbs
S.push({ from: 15, draw: t => {
  bgDark(t, 2);
  const ix = 300, iy = 760, t2 = CUT(15);
  // icon
  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  glowBox(ix, iy, 330, 330, 46, C.acc, 30 + 25 * pulse);
  ctx.save(); ctx.translate(ix, iy - 40); ctx.strokeStyle = C.acc; ctx.lineWidth = 6;   // generic chip glyph, no brand marks
  rr(-60, -60, 120, 120, 16); ctx.stroke();
  for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(k * 32, -60); ctx.lineTo(k * 32, -84); ctx.moveTo(k * 32, 60); ctx.lineTo(k * 32, 84); ctx.moveTo(-60, k * 32); ctx.lineTo(-84, k * 32); ctx.moveTo(60, k * 32); ctx.lineTo(84, k * 32); ctx.stroke(); }
  ctx.restore();
  txt(COPY.model, ix, iy + 95, { size: 72, color: C.ink });
  // rays
  ctx.strokeStyle = 'rgba(61,255,143,.55)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + 0.2, r0 = 230 + 10 * pulse; ctx.beginPath(); ctx.moveTo(ix + Math.cos(a) * r0, iy + Math.sin(a) * r0); ctx.lineTo(ix + Math.cos(a) * (r0 + 34), iy + Math.sin(a) * (r0 + 34)); ctx.stroke(); }
  // background stream of tiny grey decisions from "tiny decisions"
  const ts = T(24);
  for (let k = 0; k < 40; k++) {
    const st = ts + k * 0.22, p = (t - st) / 1.1; if (p < 0 || p > 1) continue;
    const y = 470 + rnd(k) * 600, x = lerp(1000, ix + 120, eio(p));
    chip(COPY.chips[k % 4], x, lerp(y, iy, eio(p)), 0.55 * (1 - 0.6 * p), { size: 40, alpha: 0.45 * (1 - p), color: C.chipHi });
  }
  // the four spoken chips pop in on their word, hold, then stream into the icon
  [[26, 470], [28, 620], [29, 900], [31, 1050]].forEach(([wi, y], k) => {
    const t0 = T(wi), p = ramp(t, t0 + 0.45, 0.55); if (t < t0 || p >= 1) return;
    const x = lerp(800, ix + 100, eio(p)), yy = lerp(y, iy, eio(p));
    chip(COPY.chips[k], x, yy, slam(t, t0, 0.2) * (1 - 0.7 * p), { size: 64, bg: '#3A404D', alpha: 1 - p * 0.8, rot: [-0.08, 0.07, -0.06, 0.08][k] });
  });
  // cost counter from "paying", red on "prices"
  if (t >= T(34)) {
    const p = ramp(t, T(34), E(38) + 0.3 - T(34));
    const val = 0.01 * Math.pow(124736, eio(p) * 0.85 + p * 0.15);
    const red = t >= T(36);
    const s = '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    withT(830, 470, slam(t, T(34), 0.2), () => {
      ctx.fillStyle = red ? 'rgba(255,77,94,.16)' : 'rgba(255,255,255,.06)'; rr(-210, -70, 420, 140, 22); ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = red ? C.red : 'rgba(255,255,255,.4)'; ctx.stroke();
      txt(s, 0, 4, { size: 96, color: red ? C.red : C.ink });
      txt(COPY.illustrative, 0, 102, { size: 30, weight: 600, fam: BODY, color: C.dim });
    });
  }
  card(COPY.opusPrices, 540, 1170, t, T(35), { size: 118 });
} });
// 4 name reveal
S.push({ from: 39, draw: t => {
  bgDark(t, 4);
  const t0 = T(41), k = slam(t, t0, 0.25);
  ctx.strokeStyle = C.acc; ctx.lineCap = 'round';
  for (let i = 0; i < 46; i++) {   // speed lines
    const a = rnd(i) * Math.PI * 2, r0 = 300 + rnd(i + 9) * 120 + 400 * ramp(t, t0, 1.2), len = 80 + rnd(i + 3) * 260;
    ctx.globalAlpha = (0.25 + 0.5 * rnd(i + 5)) * (t >= t0 ? 1 : 0.25); ctx.lineWidth = 3 + rnd(i + 7) * 7;
    ctx.beginPath(); ctx.moveTo(540 + Math.cos(a) * r0, 820 + Math.sin(a) * r0); ctx.lineTo(540 + Math.cos(a) * (r0 + len), 820 + Math.sin(a) * (r0 + len)); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (k > 0) withT(540, 820, k * lerp(1.25, 1, eo(ramp(t, t0, 0.5))), () => {
    ctx.shadowColor = C.acc; ctx.shadowBlur = 50;
    txt(COPY.jev, 0, 0, { size: 430, color: C.acc }); ctx.shadowColor = 'transparent';
    ctx.fillStyle = C.acc; ctx.beginPath(); ctx.moveTo(-300, 190); ctx.lineTo(320, 165); ctx.lineTo(318, 185); ctx.lineTo(-296, 212); ctx.fill();
  }, -0.05);
  if (t >= T(43)) withT(540, 1110, slam(t, T(43), 0.2), () => txt(COPY.from, 0, 0, { size: 76, weight: 800, color: C.ink }));
} });
// 5 price
S.push({ from: 45, rec: '01-typesafe-pricing', draw: t => {
  bgDark(t, 5);
  if (t >= T(46)) withT(540, 640, slam(t, T(46), 0.22), () => {
    ctx.shadowColor = C.acc; ctx.shadowBlur = 30; txt(COPY.price, 0, 0, { size: 270, color: C.acc }); ctx.shadowColor = 'transparent';
    txt(COPY.priceUnit, 0, 175, { size: 84, weight: 800 });
  });
  card(COPY.outFree, 540, 1060, t, T(54), { size: 124 });
  if (t >= T(46)) txt(COPY.priceSrc, 540, 1200, { size: 30, weight: 500, fam: BODY, color: C.dim });
} });
// 6 four ways
S.push({ from: 55, draw: t => {
  presenter('pres_ways', t, CUT(55), T(55) + 0.05, { cy: 800 });
  card(COPY.ways, 540, 1180, t, T(55), { size: 140 });
} });
// 7 route
S.push({ from: 60, draw: t => {
  bgDark(t, 7);
  const jx = 420, jy = 790, lanes = [570, 790, 1010], lx = 820;
  const on = ramp(t, T(63), 0.3);
  if (on > 0) {
    ctx.globalAlpha = on;
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 6; ctx.setLineDash([2, 16]); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(80, jy); ctx.lineTo(jx - 150, jy); ctx.stroke();
    const lp = eo(ramp(t, T(65), 0.4));
    lanes.forEach(y => { ctx.beginPath(); ctx.moveTo(jx + 150, jy); ctx.bezierCurveTo(jx + 260, jy, lx - 220, y, lerp(jx + 150, lx - 110, lp), lerp(jy, y, lp)); ctx.stroke(); });
    ctx.setLineDash([]);
    glowBox(jx, jy, 300, 210, 34, C.acc, 30 + 20 * Math.sin(t * 7));
    txt(COPY.router[0], jx, jy - 38, { size: 74 }); txt(COPY.router[1], jx, jy + 38, { size: 74 });
    COPY.lanes.forEach((s, k) => chip(s, lx, lanes[k], slam(t, T(65) + 0.12 * k, 0.2), { size: 58, bg: '#262B36' }));
    ctx.globalAlpha = 1;
  }
  // request dots: enter, pause in the router, slide into a lane
  [[63, 67, 0], [67, 71, 2], [71, 74, 1]].forEach(([a, b, lane], k) => {
    const t0 = T(a) + (k ? 0 : 0.1), t1 = T(b);
    if (t < t0) return;
    let x, y;
    const p1 = eio(ramp(t, t0, Math.max(0.3, (t1 - t0) * 0.6)));
    const p2 = eio(ramp(t, t1, 0.45));
    if (p2 <= 0) { x = lerp(80, jx, p1); y = jy; }
    else { x = lerp(jx, lx - 160, p2); y = lerp(jy, lanes[lane], p2); }
    const fade = 1 - ramp(t, t1 + 0.6, 0.4); if (fade <= 0) return;
    ctx.globalAlpha = fade; ctx.shadowColor = C.acc; ctx.shadowBlur = 30; ctx.fillStyle = C.acc;
    ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.globalAlpha = 1;
    if (p2 >= 1) chip(COPY.lanes[lane], lx, lanes[lane], 1, { size: 58, bg: C.acc, color: '#06120B', line: C.acc, alpha: fade });
  });
  if (has(77) && t >= T(77)) {
    ctx.fillStyle = 'rgba(11,13,18,.82)'; ctx.fillRect(0, 0, W, H);
    card(COPY.live, 540, 760, t, T(77), { size: 112 });
    withT(540, 920, slam(t, T(78), 0.2), () => txt(COPY.modelId, 0, 0, { size: 52, weight: 500, fam: 'monospace', color: C.ink }));
  }
  header(0, t, T(60));
}, rec: '02-openrouter-router', recFrom: 77 });
// 8 triage
const ENV = (() => { const a = []; const kinds = [0, 1, 2, 1, 0, 2, 1, 1, 2, 0, 1, 2, 1, 0, 2, 1, 2, 1, 0, 1, 2, 1]; kinds.forEach((k, i) => a.push({ k, i })); return a; })();
S.push({ from: 80, draw: t => {
  bgDark(t, 8);
  const cols = [220, 540, 860], colors = [C.acc, C.cold, C.grey], baseY = 1130;
  const tc = T(82), tsort = T(89), tsortEnd = E(97);
  // counter to 100
  if (t >= tc) {
    const n = Math.round(100 * eo(ramp(t, T(85), E(87) - T(85) + 0.1)));
    if (t >= T(85)) {
    txt(String(n), 540, 520, { size: 150, color: C.acc }); txt(COPY.leads, 540, 615, { size: 54, weight: 800, color: C.ink }); }
  }
  const counts = [0, 0, 0];
  ENV.forEach((e, idx) => {
    const appear = tc + idx * 0.06; if (t < appear) return;
    const st = tsort + (tsortEnd - tsort) * (idx / ENV.length) * 0.85, p = eio(ramp(t, st, 0.4));
    const slot = counts[e.k]++;
    const px = 540 + (rnd(idx) - 0.5) * 160, py = 800 + (rnd(idx + 3) - 0.5) * 80 - idx * 2;
    const tx = cols[e.k] + (slot % 2 ? 62 : -62), ty = baseY - Math.floor(slot / 2) * 84;
    const x = lerp(px, tx, p), y = lerp(py, ty, p);
    const dimmed = has(98) && t >= T(98) && e.k !== 0;
    const warmLit = has(98) && t >= T(98) && e.k === 0;
    const flip = p > 0 && p < 1 ? Math.abs(Math.cos(p * Math.PI)) : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, flip); ctx.translate(-x, -y);
    envelope(x, y, 112, slam(t, appear, 0.18), { tag: p > 0.5 ? colors[e.k] : null, alpha: dimmed ? 0.22 : 1, glow: warmLit ? 26 : 0, rot: lerp((rnd(idx + 1) - 0.5) * 0.5, 0, p) });
    ctx.restore();
    if (warmLit) {   // pen writes a reply on each warm envelope in turn
      const pt = T(98) + slot * 0.32, pp = ramp(t, pt, 0.3);
      if (pp > 0) {
        ctx.strokeStyle = '#0B0D12'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(tx - 40, y + 16); ctx.lineTo(tx - 40 + 55 * pp, y + 22 + Math.sin(pp * 20) * 3); ctx.stroke();
        if (pp < 1) pen(tx - 40 + 55 * pp + 6, y + 12, 1);
      }
    }
  });
  // column labels on their words
  [[92, 0], [93, 1], [95, 2]].forEach(([wi, k]) => {
    if (!has(wi) || t < T(wi)) return;
    const dimmed = has(98) && t >= T(98) && k !== 0;
    chip(COPY.tags[k], cols[k], baseY + 110, slam(t, T(wi), 0.2), { size: 50, bg: k === 0 ? C.acc : '#262B36', color: k === 0 ? '#06120B' : colors[k], line: colors[k], alpha: dimmed ? 0.3 : 1 });
  });
  header(1, t, T(80));
}, rec: '03-choice-triage', recTail: 1.6 });
// 9 score
const TICKETS = [{ id: 1042, s: 8 }, { id: 1043, s: 3 }, { id: 1044, s: 6 }, { id: 1045, s: 9 }];
S.push({ from: 104, draw: t => {
  bgDark(t, 9);
  // rubric card
  const tr = T(109);
  if (t >= tr) withT(260, 780, slam(t, tr, 0.22), () => {
    ctx.fillStyle = '#F2F4F7'; rr(-200, -230, 400, 460, 22); ctx.fill();
    txt(COPY.rubric, -160, -170, { size: 66, color: '#0B0D12', align: 'left' });
    COPY.rubricLines.forEach((s, k) => {
      const tk = tr + 0.18 + k * 0.16; if (t < tk) return;
      const y = -60 + k * 105;
      ctx.fillStyle = C.acc; rr(-165, y - 26, 52, 52, 10); ctx.fill(); check(-139, y, 34, '#0B0D12');
      txt(s, -95, y + 2, { size: 44, weight: 800, color: '#0B0D12', align: 'left' });
    });
  });
  // tickets get a score on "scores", then re order highest first after "ticket"
  const ts = T(111), to = E(113) + 0.1;
  const order = [...TICKETS].sort((a, b) => b.s - a.s);
  TICKETS.forEach((tk, k) => {
    const appear = T(106) + k * 0.1; if (t < appear) return;
    const rank = order.indexOf(tk), p = eio(ramp(t, to, 0.5));
    const y = lerp(530 + k * 215, 530 + rank * 215, p), x = 740;
    const top = rank === 0 && p >= 1;
    withT(x, y, slam(t, appear, 0.2), () => {
      ctx.fillStyle = top ? 'rgba(61,255,143,.14)' : '#1A1E28'; rr(-210, -70, 420, 140, 20); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = top ? C.acc : 'rgba(255,255,255,.22)'; ctx.stroke();
      envelope(-158, 0, 64, 1);
      txt(`${COPY.ticket} #${tk.id}`, -112, 0, { size: 38, weight: 800, align: 'left', color: C.ink });
      const st = ts + k * 0.14;
      if (t >= st) withT(152, 0, slam(t, st, 0.2), () => {
        ctx.fillStyle = tk.s >= 8 ? C.acc : '#3A404D'; ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
        txt(String(tk.s), 0, 3, { size: 64, color: tk.s >= 8 ? '#06120B' : C.ink });
      });
    });
  });
  // confidence bar under the top card
  if (has(118) && t >= T(118)) {
    const p = eo(ramp(t, T(118), 0.6)), y = 530 + 84;
    ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(540, y, 400, 22, 11); ctx.fill();
    ctx.fillStyle = C.acc; rr(540, y, 400 * 0.92 * p, 22, 11); ctx.fill();
    txt(`${COPY.conf} ${(0.92 * p).toFixed(2)}`, 540, y + 48, { size: 38, weight: 800, align: 'left', color: C.acc });
  }
  header(2, t, T(104));
}, rec: '04-score', recTail: 1.4 });
// 10 guardrails
S.push({ from: 121, draw: t => {
  bgDark(t, 10);
  const gy = 860, gx = 540;
  // conveyor
  ctx.fillStyle = '#1E232E'; rr(30, gy + 70, 1020, 46, 23); ctx.fill();
  for (let k = 0; k < 14; k++) { const x = 60 + ((k * 76 + t * 160) % 1000); ctx.fillStyle = '#3A404D'; ctx.beginPath(); ctx.arc(x, gy + 93, 14, 0, Math.PI * 2); ctx.fill(); }
  // two outputs: first passes on "true", second is blocked on "false"
  const items = [{ a: T(123), at: T(124), ok: true }, { a: T(125), at: T(126), ok: false }];
  let gate = null;
  items.forEach((it, k) => {
    if (t < it.a) return;
    const pIn = eio(ramp(t, it.a, it.at - it.a)), x0 = lerp(-120, gx, pIn);
    let x = x0, col = '#F2F4F7';
    if (t >= it.at) {
      gate = it;
      if (it.ok) { x = lerp(gx, 1250, eio(ramp(t, it.at + 0.35, 0.7))); col = '#CFFFE2'; }
      else { x = gx - 150 * eo(ramp(t, it.at + 0.35, 0.3)); col = '#FFD6DA'; }
    }
    withT(x, gy + 10, 1, () => {
      ctx.fillStyle = col; rr(-95, -60, 190, 120, 12); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let l = 0; l < 3; l++) { rr(-70, -32 + l * 26, l === 2 ? 80 : 140, 12, 6); ctx.fill(); }
      if (t >= it.at + 0.35 && !it.ok) { ctx.strokeStyle = C.red; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-40, -40); ctx.lineTo(40, 40); ctx.moveTo(40, -40); ctx.lineTo(-40, 40); ctx.stroke(); }
    });
  });
  // gate
  const gc = gate ? (gate.ok ? C.acc : C.red) : 'rgba(255,255,255,.4)';
  ctx.save(); ctx.shadowColor = gc; ctx.shadowBlur = gate ? 40 : 0;
  ctx.lineWidth = 10; ctx.strokeStyle = gc; ctx.beginPath(); ctx.moveTo(gx - 150, gy + 70); ctx.lineTo(gx - 150, gy - 250); ctx.lineTo(gx + 150, gy - 250); ctx.lineTo(gx + 150, gy + 70); ctx.stroke();
  ctx.restore();
  if (t >= T(123)) {   // scan line
    const sy = gy - 230 + ((t * 600) % 280); ctx.fillStyle = 'rgba(61,255,143,.25)'; ctx.fillRect(gx - 140, sy, 280, 6);
  }
  if (gate) withT(gx, gy - 370, slam(t, gate.at, 0.2), () => {
    ctx.fillStyle = gate.ok ? C.acc : C.red; rr(-170, -70, 340, 140, 20); ctx.fill();
    txt(gate.ok ? COPY.tf[0] : COPY.tf[1], 0, 4, { size: 104, color: gate.ok ? '#06120B' : '#FFFFFF' });
  });
  header(3, t, T(121));
}, rec: '05-noul-check', recTail: 1.2 });
// 11 the turn
S.push({ from: 131, draw: t => {
  ctx.fillStyle = '#E9EBEF'; ctx.fillRect(0, 0, W / 2, H);
  ctx.fillStyle = C.bg; ctx.fillRect(W / 2, 0, W / 2, H);
  // left: paper, a pen writing long lines
  ctx.strokeStyle = 'rgba(11,13,18,.75)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  const wp = ramp(t, T(131), E(138) - T(131));
  for (let l = 0; l < 9; l++) {
    const lp = cl(wp * 9 - l); if (lp <= 0) break;
    const y = 520 + l * 62; ctx.beginPath(); ctx.moveTo(70, y);
    for (let x = 0; x <= 390 * lp; x += 6) ctx.lineTo(70 + x, y + Math.sin(x * 0.18 + l) * 6 + Math.sin(x * 0.05) * 4);
    ctx.stroke();
    if (lp < 1) pen(70 + 390 * lp + 8, y - 4, 1.6);
  }
  // right: tags firing fast
  if (t >= T(135)) {
    const n = Math.floor((t - T(135)) / 0.16) + 1;
    for (let k = 0; k < Math.min(n, 12); k++) {
      const st = T(135) + k * 0.16, x = 690 + (k % 2) * 210 + (rnd(k) - 0.5) * 30, y = 520 + Math.floor(k / 2) * 125;
      withT(x, y, slam(t, st, 0.15), () => {
        ctx.fillStyle = '#1E232E'; rr(-100, -46, 200, 92, 46); ctx.fill(); ctx.strokeStyle = C.acc; ctx.lineWidth = 4; ctx.stroke();
        check(-55, 0, 40); txt(COPY.fire[k % 6], 20, 3, { size: 52, weight: 800 });
      });
    }
  }
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(W / 2 + 40, 240); ctx.lineTo(W / 2 - 40, 1500); ctx.stroke();
  card(COPY.thinks, 270, 330, t, T(134), { size: 78, bg: '#0B0D12', color: '#FFFFFF' });
  card(COPY.decides, 810, 330, t, T(138), { size: 78 });
} });
// 12 early access
S.push({ from: 139, draw: t => {
  presenter('pres_cta', t, CUT(139), null, { w: 760, cy: 800 });
  if (t >= T(140)) withT(540, 1290, slam(t, T(140), 0.2), () => {
    font(52, 800); const w = ctx.measureText(COPY.early).width + 70;
    ctx.fillStyle = 'rgba(11,13,18,.92)'; rr(-w / 2, -44, w, 88, 44); ctx.fill(); ctx.strokeStyle = C.acc; ctx.lineWidth = 4; ctx.stroke();
    txt(COPY.early, 0, 3, { size: 52, weight: 800, color: C.acc });
  });
} });
// 13 call to action
S.push({ from: endIdx, cta: true, draw: t => {
  presenter('pres_cta', t, CUT(endIdx), T(endIdx) + 0.02, { w: 760, cy: 800 });
  const k = slam(t, T(endIdx), 0.22); if (k <= 0) return;
  withT(540, 1180, k, () => {
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30;
    font(130, 900);
    const cw = V === 'ig' ? ctx.measureText(COPY.comment + ' "' + COPY.jev + '"').width + 110 : 760;
    ctx.fillStyle = 'rgba(11,13,18,.94)'; rr(-cw / 2, -120, cw, 240, 26); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = C.acc; ctx.lineWidth = 5; ctx.stroke();
    if (V === 'ig') {
      const a = COPY.comment + ' ', b = '"' + COPY.jev + '"';
      const wa = ctx.measureText(a).width, wb = ctx.measureText(b).width, x0 = -(wa + wb) / 2;
      txt(a, x0, 6, { size: 130, align: 'left' }); txt(b, x0 + wa, 6, { size: 130, align: 'left', color: C.acc });
    } else {
      txt(COPY.links[0], 0, -46, { size: 86 }); txt(COPY.links[1], 0, 52, { size: 96, color: C.acc });
    }
  }, -0.03);
} });

S.forEach(s => s.t0 = s.from === 0 ? 0 : CUT(s.from));
const ENDCUT = E(last) + 0.12;   // hard cut to black right after the last word

/* ---------- captions: 2 or 3 words, active word in accent ---------- */
const FIX = { 'router': 'Router', '4': '4', 'Jev': 'Jev' };
const CAPS = (() => {
  const ws = TM.words.map(w => ({ ...w, s: (FIX[w.w.replace(/[.,]/g, '')] || w.w).replace(/[.,]$/, '') }));
  const g = []; let cur = [];
  ws.forEach((w, k) => {
    cur.push(w);
    const nx = ws[k + 1];
    const brk = /[.,]$/.test(w.w) || cur.length === 3 || (cur.length === 2 && cur.map(x => x.s).join(' ').length > 13) || !nx || nx.t - w.e > 0.35 || S.some(s => nx && s.from === nx.i);
    if (brk) { g.push(cur); cur = []; }
  });
  return g;
})();
function captions(t) {
  if (t >= ENDCUT) return;
  let gi = -1;
  for (let k = 0; k < CAPS.length; k++) { const g = CAPS[k]; const endT = CAPS[k + 1] ? Math.min(CAPS[k + 1][0].t, g[g.length - 1].e + 0.4) : g[g.length - 1].e + 0.3; if (t >= g[0].t - 0.05 && t < endT) gi = k; }
  if (gi < 0) return;
  const g = CAPS[gi], size = 92;
  font(size, 900);
  const parts = g.map(w => w.s.toUpperCase()), sp = size * 0.28;
  const widths = parts.map(p => ctx.measureText(p).width), total = widths.reduce((a, b) => a + b, 0) + sp * (parts.length - 1);
  const y = 1430, k = 0.9 + 0.1 * back(ramp(t, g[0].t - 0.05, 0.14));
  ctx.save(); ctx.translate(W / 2, y); ctx.scale(k, k);
  let x = -total / 2;
  g.forEach((w, i) => {
    const active = t >= w.t - 0.03 && (i === g.length - 1 || t < g[i + 1].t - 0.03);
    const spoken = t >= w.t - 0.03;
    txt(parts[i], x + widths[i] / 2, 0, { size, stroke: 16, color: active ? C.acc : (spoken ? '#FFFFFF' : 'rgba(255,255,255,.55)') });
    x += widths[i] + sp;
  });
  ctx.restore();
}

/* ---------- frame ---------- */
window.renderFrame = f => {
  const t = f / FPS;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowColor = 'transparent'; ctx.filter = 'none';
  if (t >= ENDCUT) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); return; }
  let sc = S[0]; for (const s of S) if (t >= s.t0) sc = s;
  sc.draw(t);
  ctx.globalAlpha = 1;
  captions(t);
  ctx.drawImage(grain[f % 4], 0, 0, W, H);
  if (window.SAFE) {   // review overlay: Instagram UI zones
    ctx.fillStyle = 'rgba(255,0,0,.25)'; ctx.fillRect(0, 0, W, 220); ctx.fillRect(0, H * 0.8, W, H * 0.2); ctx.fillRect(W - 130, 900, 130, 636);
  }
};

/* audio cues and recording windows for audio.py and render_all.sh */
window.cues = () => {
  const c = [];
  [26, 28, 29, 31].forEach(i => c.push({ type: 'pop', t: T(i) }));
  c.push({ type: 'ding', t: T(36) });
  c.push({ type: 'whoosh', t: T(41) - 0.12 });
  c.push({ type: 'ding', t: T(54) });
  [60, 80, 104, 121].forEach(i => c.push({ type: 'whoosh', t: T(i) - 0.12 }));
  c.push({ type: 'riser', t: T(55) - 0.9, d: CUT(60) - T(55) + 0.9 });
  c.push({ type: 'duck', t: CUT(45), d: CUT(55) - CUT(45) });
  c.push({ type: 'duck', t: CUT(60), d: CUT(80) - CUT(60) });
  c.push({ type: 'end', t: ENDCUT });
  return c;
};
window.recs = () => S.filter(s => s.rec).map(s => {
  const i = S.indexOf(s), end = S[i + 1] ? S[i + 1].t0 : ENDCUT;
  const from = s.recFrom != null ? T(s.recFrom) : s.recTail ? end - s.recTail : s.t0 + 0.1;
  return { file: s.rec, t0: +from.toFixed(3), t1: +end.toFixed(3) };
});
window.allText = () => JSON.stringify(COPY);

window.ready = Promise.all([
  ...['pres_hook', 'pres_ways', 'pres_cta'].map(load),
  document.fonts.load('900 80px "Barlow Condensed"'), document.fonts.load('800 80px "Barlow Condensed"'),
  document.fonts.load('600 80px "Barlow Condensed"'), document.fonts.load('500 40px "Anek Latin"'),
]).then(() => { ['pres_hook', 'pres_ways', 'pres_cta'].forEach(makeBlur); makeGrain(); window.renderFrame(0); });
