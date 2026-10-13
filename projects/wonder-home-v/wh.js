/* Wonder Home V motion graphics.
   One deterministic timeline per composition: window.renderFrame(f) draws frame f.
   ?comp=film | reel | layout&i=0..4 */

const C = {
  bh: '#1B2F6E', ev: '#0E1738', dusk: '#3555A8', lit: '#FFC53D',
  sky: '#E3EBF8', paper: '#FFFFFF', ink: '#111728', slate: '#586178',
};

/* Every on screen string lives here so it can be checked against the brief. */
const COPY = {
  name: 'Wonder Home V',
  where1: 'Sector 101, Noida.',
  where2: 'Opposite Bade Hanuman Ji Temple.',
  bldg: ['One building.', 'Seven floors.', 'Five homes on each.'],
  homes: ['35 homes in all,', 'so you know your neighbours.'],
  cards: ['2 BHK', '2 BHK + Study', '3 BHK'],
  layouts: 'Five layouts, the same on every floor.',
  priceHead: '2 BHK, 989 sq ft carpet',
  from: 'from',
  price: '₹75.2 lakh',
  rate: 'At ₹6,999 per sq ft of super area.',
  extras: 'Parking, PLC, power backup and GST extra.',
  locTitle: 'Metro, Medanta and two malls, each five minutes away.',
  locTitleReel: ['Metro, Medanta and two malls,', 'each five minutes away.'],
  places: ['Sector 101 metro', 'Medanta', 'Aditya Ancora Mall', 'Spectrum Mall'],
  min5: '5 min',
  locNote: 'Travel times by road, indicative.',
  payTitle: 'You pay as the building rises.',
  pay: [['At booking', '10%'], ['Foundation complete', '15%'], ['3rd floor slab', '15%'],
        ['5th floor slab', '15%'], ['Terrace complete', '15%'], ['Finishing and OC', '20%'],
        ['At possession', '10%']],
  possession: 'Possession in 11 months.',
  amenities: ['High speed lift', 'Covered parking', '24x7 security and CCTV', 'Fire safety', 'Power backup'],
  reelPay: ['10% to book.', 'The rest as the building rises.', 'Possession in 11 months.'],
  hindi: 'सही जगह, सही दाम।',
  trust: '200+ homes delivered in Noida since 2017.',
  call: 'Call or WhatsApp',
  phone: '+91 70602 00814',
  reraLabel: 'UP RERA registration no.',
  reraNo: 'UPRERAPRJ000000',
  reraSite: 'www.up-rera.in',
  qr: 'Project QR code',
  dev: 'Developer: Infra Kraft Homes Private Limited.',
  mkt: 'Marketed by Legacy Estate Private Limited.',
  disclaimer: 'Artist impression. Areas are super built up and subject to the final sanctioned plan. Carpet area is super area less 8%. Prices are basic sale price at ₹6,999 per sq ft of super area; parking, PLC, power backup, GST, stamp duty and registration are extra. Travel times are indicative. Not an offer; the agreement for sale governs.',
  superLbl: 'Super area',
  carpetLbl: 'Carpet area',
};

const LAYOUTS = [
  { home: '2 BHK', sup: '1,075 sq ft', carpet: '989 sq ft', price: '₹75.2 lakh', slug: '2bhk-1075' },
  { home: '2 BHK + Study', sup: '1,175 sq ft', carpet: '1,081 sq ft', price: '₹82.2 lakh', slug: '2bhk-study-1175' },
  { home: '3 BHK', sup: '1,410 sq ft', carpet: '1,297 sq ft', price: '₹98.7 lakh', slug: '3bhk-1410' },
  { home: '3 BHK', sup: '1,570 sq ft', carpet: '1,444 sq ft', price: '₹1.1 crore', slug: '3bhk-1570' },
  { home: '3 BHK', sup: '1,670 sq ft', carpet: '1,536 sq ft', price: '₹1.17 crore', slug: '3bhk-1670' },
];

/* ---------- utilities ---------- */
const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const P = (f, a, d) => ease((f - a) / d);
const lerp = (a, b, t) => a + (b - a) * t;
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'; };

/* Count the first number in a string up from `start`; exact target string at p = 1. */
function countText(target, p, start = 0) {
  if (p >= 1) return target;
  return target.replace(/\d[\d,]*(\.\d+)?/, m => {
    const dec = (m.split('.')[1] || '').length;
    const v = lerp(start, parseFloat(m.replace(/,/g, '')), p);
    return v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  });
}

const params = new URLSearchParams(location.search);
const COMP = params.get('comp') || 'film';
const LI = +(params.get('i') || 0);
const DIM = COMP === 'film' ? { W: 1920, H: 1080 } : { W: 1080, H: 1920 };
const { W, H } = DIM;
const FRAMES = COMP === 'film' ? 1350 : COMP === 'reel' ? 900 : 450;

const stage = document.getElementById('stage');
stage.style.width = W + 'px'; stage.style.height = H + 'px';
const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function layerSvg() { return svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, stage); }

function text(parent, s, o) {
  const d = document.createElement('div');
  d.className = 't' + (o.wrap ? ' wrap' : '') + (o.hindi ? ' hi' : '');
  d.textContent = s;
  Object.assign(d.style, {
    left: (o.x || 0) + 'px', top: o.y + 'px', width: (o.w || (W - (o.x || 0))) + 'px',
    fontSize: o.size + 'px', fontWeight: o.weight || 500, color: o.color || C.paper,
    textAlign: o.align || 'left', lineHeight: o.lh || 1.18,
  });
  parent.appendChild(d);
  return d;
}

/* ---------- scene registry ---------- */
const scenes = [];
function Scene(s, e) {
  const sc = { s, e, items: [], fns: [] };
  sc.add = (el, at, o = {}) => { sc.items.push({ el, inF: s + at, outF: o.out === null ? null : (o.out !== undefined ? o.out : e - 10), dy: o.dy !== undefined ? o.dy : 30, dur: o.dur || 14 }); return el; };
  sc.on = fn => sc.fns.push(fn);
  scenes.push(sc);
  return sc;
}
function show(it, f) {
  const a = P(f, it.inF, it.dur);
  const b = it.outF == null ? 0 : P(f, it.outF, 10);
  const o = a * (1 - b);
  it.el.style.opacity = o;
  it.el.style.visibility = o < 0.002 ? 'hidden' : 'visible';
  it.el.style.transform = `translateY(${((1 - a) * it.dy).toFixed(2)}px)`;
}

/* Background keys: [frame, colour]; each change blends over 16 frames. */
let BG = [[0, C.ev]];
function bgAt(f) {
  let c = BG[0][1];
  for (let i = 1; i < BG.length; i++) {
    const [k, col] = BG[i];
    if (f >= k + 16) c = col; else if (f > k) { c = mix(BG[i - 1][1], col, ease((f - k) / 16)); break; } else break;
  }
  return c;
}

/* ---------- the building ---------- */
function Building(o) {
  const { cx, baseY, Wn, G, Pd, groundH } = o;
  const cols = 5, rows = 7;
  const bodyW = cols * Wn + (cols - 1) * G + 2 * Pd;
  const bodyX = cx - bodyW / 2;
  const floorTop = baseY - groundH;            // underside of the first floor
  const fullH = 2 * Pd + rows * Wn + (rows - 1) * G;
  const gsvg = layerSvg();
  const svg = layerSvg();
  const b = { svg };
  b.ground = svgEl('rect', { x: 0, y: baseY, width: W, height: H - baseY, fill: C.bh }, gsvg);
  b.groundAnim = 0;
  b.pillars = [];
  const pw = G * 1.3, nP = 4;
  for (let i = 0; i < nP; i++) {
    const x = bodyX + Pd * 0.6 + i * ((bodyW - 2 * Pd * 0.6 - pw) / (nP - 1));
    b.pillars.push(svgEl('rect', { x, y: floorTop, width: pw, height: groundH, fill: C.bh }, svg));
  }
  b.body = svgEl('rect', { x: bodyX, y: floorTop - fullH, width: bodyW, height: fullH, rx: 10, fill: C.bh }, svg);
  b.roofG = svgEl('g', {}, svg);
  svgEl('rect', { x: bodyX - 10, y: floorTop - fullH - 14, width: bodyW + 20, height: 22, rx: 6, fill: C.bh }, b.roofG);
  svgEl('rect', { x: bodyX + bodyW - Pd - 2 * Wn - G, y: floorTop - fullH - 50, width: 2 * Wn + G, height: 44, rx: 6, fill: C.bh }, b.roofG);
  b.hi = svgEl('rect', { x: bodyX + Pd / 2, width: bodyW - Pd, height: Wn + G, rx: 10, fill: 'none', stroke: C.paper, 'stroke-width': 3 }, svg);
  b.win = [];
  for (let r = 0; r < rows; r++) {
    b.win.push([]);
    for (let c = 0; c < cols; c++) {
      const x = bodyX + Pd + c * (Wn + G);
      const y = floorTop - Pd - Wn - r * (Wn + G);
      b.win[r].push(svgEl('rect', { x, y, width: Wn, height: Wn, rx: 4, fill: C.dusk }, svg));
    }
  }
  b.rowY = r => floorTop - Pd - Wn - r * (Wn + G);
  /* state: op, ground, pillars, fl (0..7 built floors), bodyOp, roof, winIn(r,c), lit(r,c), hiFloor, hiOp */
  b.apply = s => {
    svg.style.opacity = s.op;
    svg.style.visibility = s.op < 0.002 ? 'hidden' : 'visible';
    b.ground.setAttribute('opacity', s.ground);
    b.ground.style.transform = `translateY(${(1 - s.ground) * 30}px)`;
    b.pillars.forEach((p, i) => {
      const h = groundH * s.pillars;
      p.setAttribute('y', floorTop + groundH - h); p.setAttribute('height', Math.max(0, h));
    });
    const h = s.fl >= 7 ? fullH : Pd + s.fl * (Wn + G) + (s.fl / 7) * (Pd - G);
    b.body.setAttribute('y', floorTop - h); b.body.setAttribute('height', h);
    b.body.setAttribute('opacity', s.bodyOp);
    b.roofG.setAttribute('opacity', s.roof);
    b.roofG.style.transform = `translateY(${(1 - s.roof) * 20}px)`;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const w = b.win[r][c], a = s.winIn(r, c);
      w.setAttribute('opacity', a);
      w.style.transform = `translateY(${((1 - a) * 20).toFixed(2)}px)`;
      w.setAttribute('fill', mix(C.dusk, C.lit, s.lit(r, c)));
    }
    b.hi.setAttribute('opacity', s.hiOp || 0);
    if (s.hiOp) b.hi.setAttribute('y', b.rowY(0) - G / 2 - s.hiFloor * (Wn + G));
  };
  return b;
}

/* Lit windows, about one in six of 35. [row from bottom, column] */
const LIT = [[0, 3], [2, 1], [4, 4], [1, 0], [5, 2], [6, 3]];
const LIT_FLOOR = 3; // the floor whose five homes light together
const litIdx = (r, c) => LIT.findIndex(([a, b]) => a === r && b === c);

/* Assembly state used in the opening build and the payment scene. */
function buildOpening(f, s0) {
  return {
    op: 1, ground: P(f, s0, 16), pillars: P(f, s0 + 50, 18), fl: 7, bodyOp: P(f, s0 + 40, 24), roof: P(f, s0 + 56, 16),
    winIn: (r, c) => P(f, s0 + 6 + r * 6 + c * 2, 12),
    lit: (r, c) => { const i = litIdx(r, c); return i < 0 ? 0 : P(f, s0 + 74 + i * 11, 6); },
    hiOp: 0,
  };
}

/* ---------- shared scene builders ---------- */
function windowPanel(sc, x, y, cols, rows, size, gap, at) {
  const svg = layerSvg();
  const g = svgEl('g', {}, svg);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
    svgEl('rect', { x: x + c * (size + gap), y: y + r * (size + gap), width: size, height: size, rx: 4, fill: C.dusk }, g);
  sc.add(svg, at, { dy: 20, dur: 20 });
}

function cardsScene(sc, o) {
  const icons = [[1, 1, 0], [1, 1, 2], [1, 1, 1]]; // squares per room; 2 = study outline
  COPY.cards.forEach((label, i) => {
    const d = document.createElement('div');
    Object.assign(d.style, { position: 'absolute', left: (o.x + i * (o.w + o.gap)) + 'px', top: o.y + 'px', width: o.w + 'px', height: o.h + 'px', background: C.ev, borderRadius: '10px' });
    stage.appendChild(d);
    let k = 0;
    icons[i].forEach(t => {
      if (t === 0) return;
      const q = document.createElement('div');
      Object.assign(q.style, { position: 'absolute', left: (40 + k * 46) + 'px', top: '44px', width: '32px', height: '32px', borderRadius: '4px', boxSizing: 'border-box',
        background: t === 1 ? C.dusk : 'transparent', border: t === 2 ? `3px solid ${C.dusk}` : 'none' });
      d.appendChild(q); k++;
    });
    const t = text(d, label, { x: 40, y: o.h - 44 - o.size * 1.18, w: o.w - 80, size: o.size, weight: 700 });
    t.style.opacity = 1;
    sc.add(d, 14 + i * 6, { dy: 40, dur: 18 });
  });
}

function priceBlock(sc, o, lines, at) {
  // lines: [{s, size, weight, color, price?:true, from?:string}]
  let y = o.y;
  let k = 0;
  lines.forEach(L => {
    let el;
    if (L.price) {
      el = document.createElement('div');
      Object.assign(el.style, { position: 'absolute', left: o.x + 'px', top: y + 'px', display: 'flex', alignItems: 'baseline', gap: '22px', whiteSpace: 'nowrap', width: o.w + 'px', justifyContent: o.align === 'center' ? 'center' : 'flex-start' });
      if (L.from) {
        const fr = document.createElement('span');
        Object.assign(fr.style, { fontSize: L.fromSize + 'px', fontWeight: 600, color: C.paper });
        fr.textContent = L.from; el.appendChild(fr);
      }
      const pr = document.createElement('span');
      Object.assign(pr.style, { fontSize: L.size + 'px', fontWeight: 800, color: C.lit, lineHeight: 1, letterSpacing: '-0.02em' });
      pr.textContent = L.s; el.appendChild(pr);
      stage.appendChild(el);
      const start = sc.s + at + k * 6;
      sc.on(f => { pr.textContent = countText(L.s, P(f, start + 4, L.countDur || 36)); });
      y += L.size * 1.08 + (L.after || 0);
    } else {
      el = text(stage, L.s, { x: o.x, y, w: o.w, size: L.size, weight: L.weight || 500, color: L.color || C.paper, align: o.align });
      y += L.size * (L.lh || 1.3) + (L.after || 0);
    }
    sc.add(el, at + k * 6, { dy: 30 });
    k++;
  });
}

function mapScene(sc, o) {
  const svg = layerSvg();
  // flat roads
  const roads = svgEl('g', { stroke: C.dusk, 'stroke-width': o.road, 'stroke-linecap': 'round', fill: 'none', opacity: 0.55 }, svg);
  o.roads.forEach(d => svgEl('path', { d }, roads));
  sc.add(svg, 4, { dy: 0, dur: 20 });
  const lines = layerSvg();
  const ls = o.labels.map(L => svgEl('line', { x1: o.cx, y1: o.cy, x2: o.cx, y2: o.cy, stroke: C.sky, 'stroke-width': 4, 'stroke-linecap': 'round' }, lines));
  sc.add(lines, 0, { dy: 0, dur: 1 });
  const pinSvg = layerSvg();
  const pin = svgEl('g', { transform: `translate(${o.cx} ${o.cy}) scale(${o.pinScale})` }, pinSvg);
  svgEl('path', { d: 'M0 0 C-8 -14 -40 -38 -40 -62 A40 40 0 1 1 40 -62 C40 -38 8 -14 0 0 Z', fill: C.paper }, pin);
  svgEl('circle', { cx: 0, cy: -62, r: 16, fill: C.bh }, pin);
  const T = o.fast ? { pin: 8, line: 14, card: 20, tag: 26 } : { pin: 22, line: 40, card: 52, tag: 60 };
  sc.add(pinSvg, T.pin, { dy: 30, dur: 18 });
  o.labels.forEach((L, i) => {
    const t0 = sc.s + T.line + i * 6;
    sc.on(f => {
      const p = P(f, t0, 22);
      ls[i].setAttribute('x2', lerp(o.cx, L.ax, p)); ls[i].setAttribute('y2', lerp(o.cy, L.ay, p));
    });
    const card = document.createElement('div');
    Object.assign(card.style, { position: 'absolute', left: L.x + 'px', top: L.y + 'px', width: L.w + 'px', height: L.h + 'px', background: C.ev, borderRadius: '10px', boxSizing: 'border-box',
      padding: `0 ${o.pad}px`, display: 'flex', flexDirection: o.stack ? 'column' : 'row', alignItems: o.stack ? 'flex-start' : 'center', justifyContent: o.stack ? 'center' : 'space-between', gap: o.stack ? '10px' : '16px' });
    const nm = document.createElement('div');
    Object.assign(nm.style, { fontSize: o.size + 'px', fontWeight: 600, color: C.paper, whiteSpace: 'nowrap', lineHeight: 1.1 });
    nm.textContent = COPY.places[i];
    const tag = document.createElement('div');
    Object.assign(tag.style, { fontSize: o.tagSize + 'px', fontWeight: 700, color: C.paper, background: C.dusk, borderRadius: '10px', padding: '6px 14px', whiteSpace: 'nowrap', lineHeight: 1.1 });
    tag.textContent = COPY.min5;
    card.appendChild(nm); card.appendChild(tag); stage.appendChild(card);
    sc.add(card, T.card + i * 6, { dy: 24 });
    sc.on(f => { tag.textContent = countText(COPY.min5, P(f, sc.s + T.tag + i * 6, 20), 1); });
  });
}

function iconsScene(sc, o) {
  const D = [
    // lift
    ['<rect x="12" y="6" width="40" height="52" rx="4"/>', '<rect x="20" y="22" width="24" height="36" rx="2"/>', '<line x1="32" y1="22" x2="32" y2="58"/>', '<path d="M26 16 L32 11 L38 16"/>'],
    // covered parking
    ['<path d="M6 26 L32 10 L58 26"/>', '<path d="M14 50 L14 40 L20 32 L44 32 L50 40 L50 50 Z"/>', '<circle cx="22" cy="52" r="4"/>', '<circle cx="42" cy="52" r="4"/>'],
    // security and cctv
    ['<path d="M32 6 L52 14 L52 30 C52 44 42 54 32 58 C22 54 12 44 12 30 L12 14 Z"/>', '<path d="M23 32 L30 39 L42 25"/>'],
    // fire safety
    ['<rect x="22" y="24" width="20" height="34" rx="6"/>', '<path d="M28 24 L28 17 L36 17 L36 24"/>', '<path d="M36 17 L48 12"/>', '<path d="M28 18 C20 17 16 22 16 30"/>'],
    // power backup
    ['<rect x="8" y="20" width="42" height="26" rx="4"/>', '<rect x="50" y="28" width="6" height="10" rx="1"/>', '<path d="M31 24 L23 34 L31 34 L27 42 L37 31 L29 31 Z"/>'],
  ];
  COPY.amenities.forEach((label, i) => {
    const x = o.x0 + i * o.col;
    const svg = layerSvg();
    const g = svgEl('g', { transform: `translate(${x + o.col / 2 - o.icon / 2} ${o.y}) scale(${o.icon / 64})`, fill: 'none', stroke: C.sky, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    g.innerHTML = D[i].join('');
    const parts = [...g.children];
    parts.forEach(p => { p.setAttribute('pathLength', 1); p.setAttribute('stroke-dasharray', 1); });
    const t0 = sc.s + 10 + i * 6;
    sc.on(f => { const p = P(f, t0, 22); parts.forEach(q => q.setAttribute('stroke-dashoffset', 1 - p)); });
    sc.add(svg, 10 + i * 6, { dy: 20 });
    const t = text(stage, label, { x: x + 10, y: o.y + o.icon + 36, w: o.col - 20, size: o.size, weight: 600, align: 'center', wrap: true, lh: 1.2 });
    sc.add(t, 14 + i * 6, { dy: 20 });
  });
}

function timelineScene(sc, o) {
  const svg = layerSvg();
  const n = COPY.pay.length;
  const yOf = i => o.y + i * o.step;
  const dotX = o.x + 14;
  svgEl('line', { x1: dotX, y1: yOf(0), x2: dotX, y2: yOf(n - 1), stroke: C.dusk, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
  const fill = svgEl('line', { x1: dotX, y1: yOf(0), x2: dotX, y2: yOf(0), stroke: C.sky, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
  const dots = COPY.pay.map((_, i) => svgEl('circle', { cx: dotX, cy: yOf(i), r: 13, fill: C.ev, stroke: C.dusk, 'stroke-width': 4 }, svg));
  sc.add(svg, 14, { dy: 20 });
  const rows = COPY.pay.map(([lbl, pct], i) => {
    const a = text(stage, lbl, { x: o.x + 56, y: yOf(i) - o.size * 0.62, w: o.w, size: o.size, weight: 500 });
    const b = text(stage, pct, { x: o.x + 56, y: yOf(i) - o.size * 0.62, w: o.w - 56, size: o.size, weight: 700, align: 'right' });
    sc.add(a, 16 + i * 4, { dy: 20 }); sc.add(b, 16 + i * 4, { dy: 20 });
    return [a, b];
  });
  sc.on(f => {
    let reach = -1;
    o.steps.forEach((t, i) => { if (f >= t) reach = i; });
    const k = o.steps.findIndex(t => f < t);
    // fill line moves between reached dots
    let y = yOf(0);
    if (reach >= 0) {
      const next = Math.min(reach + 1, n - 1);
      const p = reach < n - 1 ? P(f, o.steps[reach + 1] - 12, 12) : 0;
      y = lerp(yOf(reach), yOf(next), p);
    }
    fill.setAttribute('y2', y);
    fill.setAttribute('opacity', reach >= 0 ? 1 : 0);
    dots.forEach((d, i) => {
      const p = P(f, o.steps[i], 8);
      d.setAttribute('fill', mix(C.ev, C.sky, p)); d.setAttribute('stroke', mix(C.dusk, C.sky, p));
      const dim = 0.4 + 0.6 * p;
      rows[i].forEach(e => e.style.color = mix(C.dusk, C.paper, (dim - 0.4) / 0.6 * 0.55 + 0.45));
    });
  });
}

function endCard(sc, o) {
  const at = 4;
  const logo = document.createElement('img');
  logo.src = 'assets/logos/logo-reversed.svg';
  Object.assign(logo.style, { position: 'absolute', width: o.logoW + 'px', left: (W - o.logoW) / 2 + 'px', top: o.logoY + 'px' });
  stage.appendChild(logo);
  sc.add(logo, at, { out: null, dy: 20 });
  sc.add(text(stage, COPY.hindi, { y: o.hiY, size: o.hiSize, weight: 700, align: 'center', hindi: true, lh: 1.4 }), at + 5, { out: null });
  sc.add(text(stage, COPY.trust, { y: o.trustY, size: o.trustSize, weight: 500, color: C.sky, align: 'center' }), at + 10, { out: null });
  // call line
  const call = document.createElement('div');
  Object.assign(call.style, { position: 'absolute', left: 0, top: o.callY + 'px', width: W + 'px', display: 'flex', flexDirection: o.callStack ? 'column' : 'row', alignItems: o.callStack ? 'center' : 'baseline', justifyContent: 'center', gap: o.callStack ? '4px' : '20px', whiteSpace: 'nowrap' });
  const c1 = document.createElement('span'); c1.textContent = COPY.call; Object.assign(c1.style, { fontSize: o.callSize + 'px', fontWeight: 500, color: C.paper, lineHeight: 1.2 });
  const c2 = document.createElement('span'); c2.textContent = COPY.phone; Object.assign(c2.style, { fontSize: o.phoneSize + 'px', fontWeight: 800, color: C.lit, lineHeight: 1.1, letterSpacing: '-0.01em' });
  call.appendChild(c1); call.appendChild(c2); stage.appendChild(call);
  sc.add(call, at + 15, { out: null });
  // compliance panel on paper
  const pn = document.createElement('div');
  Object.assign(pn.style, { position: 'absolute', left: o.pnX + 'px', top: o.pnY + 'px', width: o.pnW + 'px', height: o.pnH + 'px', background: C.paper, borderRadius: '10px', boxSizing: 'border-box', padding: `0 ${o.pnPad}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: C.ink });
  const tx = document.createElement('div');
  tx.innerHTML = o.reraHTML;
  const qr = document.createElement('div');
  Object.assign(qr.style, { width: o.qr + 'px', height: o.qr + 'px', flex: 'none', border: `3px dashed ${C.slate}`, borderRadius: '10px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: o.qrSize + 'px', fontWeight: 600, color: C.slate, lineHeight: 1.2, padding: '10px' });
  qr.textContent = COPY.qr;
  pn.appendChild(tx); pn.appendChild(qr); stage.appendChild(pn);
  sc.add(pn, at + 20, { out: null });
  const dv = text(stage, o.devOneLine ? COPY.dev + ' ' + COPY.mkt : COPY.dev, { y: o.devY, size: o.devSize, weight: 500, color: C.sky, align: 'center' });
  sc.add(dv, at + 25, { out: null });
  if (!o.devOneLine) sc.add(text(stage, COPY.mkt, { y: o.devY + o.devSize * 1.35, size: o.devSize, weight: 500, color: C.sky, align: 'center' }), at + 25, { out: null });
  const ds = text(stage, COPY.disclaimer, { x: o.dsX, y: 0, w: W - 2 * o.dsX, size: o.dsSize, weight: 500, color: C.sky, align: o.dsAlign, wrap: true, lh: 1.42 });
  ds.style.textWrap = 'pretty';
  sc.on(() => { ds.style.top = (o.dsBottom - ds.offsetHeight) + 'px'; });
  sc.add(ds, at + 28, { out: null, dy: 20 });
}
const RERA_HTML = (s1, s2, s3, stack) => stack
  ? `<div style="font-size:${s1}px;font-weight:700;line-height:1.25">${COPY.reraLabel}</div><div style="font-size:${s2}px;font-weight:800;line-height:1.25">${COPY.reraNo}</div><div style="font-size:${s3}px;font-weight:700;line-height:1.35">${COPY.reraSite}</div>`
  : `<div style="font-size:${s1}px;font-weight:800;line-height:1.3">${COPY.reraLabel} ${COPY.reraNo}</div><div style="font-size:${s3}px;font-weight:700;line-height:1.4">${COPY.reraSite}</div>`;

/* ================= FILM 16:9, 45 s ================= */
let building, buildingState;

function film() {
  BG = [[0, C.ev], [322, C.bh], [922, C.ev], [1162, C.bh], [1252, C.ev]];
  building = Building({ cx: 470, baseY: 950, Wn: 58, G: 20, Pd: 34, groundH: 100 });
  const TX = 860, TW = 980;

  // Scene 1 Arrival 0 to 150
  const s1 = Scene(0, 150);
  s1.add(text(stage, COPY.name, { x: TX, y: 380, w: TW, size: 112, weight: 700 }), 22);
  s1.add(text(stage, COPY.where1, { x: TX, y: 530, w: TW, size: 48, weight: 600 }), 28);
  s1.add(text(stage, COPY.where2, { x: TX, y: 594, w: TW, size: 48, weight: 500, color: C.sky }), 34);

  // Scene 2 The building 150 to 330
  const s2 = Scene(150, 330);
  COPY.bldg.forEach((s, i) => s2.add(text(stage, s, { x: TX, y: 270 + i * 92, w: TW, size: 76, weight: 700 }), 10 + i * 6));
  const h1 = text(stage, COPY.homes[0], { x: TX, y: 600, w: TW, size: 48, weight: 600, color: C.sky });
  s2.add(h1, 96);
  s2.on(f => { h1.textContent = countText(COPY.homes[0], P(f, 100, 26)); });
  s2.add(text(stage, COPY.homes[1], { x: TX, y: 664, w: TW, size: 48, weight: 500, color: C.sky }), 102);

  // Scene 3 The homes 330 to 540
  const s3 = Scene(330, 540);
  cardsScene(s3, { x: 170, y: 250, w: 500, h: 360, gap: 40, size: 66 });
  s3.add(text(stage, COPY.layouts, { y: 712, size: 52, weight: 600, color: C.sky, align: 'center' }), 40);

  // Scene 4 Price 540 to 720
  const s4 = Scene(540, 720);
  windowPanel(s4, 1452, 230, 4, 7, 64, 22, 6);
  priceBlock(s4, { x: 240, y: 236, w: 1150 }, [
    { s: COPY.priceHead, size: 56, weight: 600, after: 6 },
    { s: COPY.price, price: true, from: COPY.from, fromSize: 56, size: 200, after: 28 },
    { s: COPY.rate, size: 50, weight: 500, lh: 1.25 },
    { s: COPY.extras, size: 50, weight: 500, color: C.sky, lh: 1.25 },
  ], 12);

  // Scene 5 Location 720 to 930
  const s5 = Scene(720, 930);
  s5.add(text(stage, COPY.locTitle, { y: 96, size: 60, weight: 700, align: 'center' }), 10);
  const cx = 960, cy = 590;
  mapScene(s5, {
    cx, cy, pinScale: 1.1, road: 16, size: 38, tagSize: 30, pad: 28,
    roads: ['M120 470 L1800 470', 'M120 720 L1800 720', 'M700 230 L700 960', 'M1220 230 L1220 960', 'M300 960 L1500 230'],
    labels: [
      { x: 230, y: 284, w: 520, h: 84, ax: 750, ay: 326 },
      { x: 1170, y: 284, w: 520, h: 84, ax: 1170, ay: 326 },
      { x: 230, y: 770, w: 520, h: 84, ax: 750, ay: 812 },
      { x: 1170, y: 770, w: 520, h: 84, ax: 1170, ay: 812 },
    ],
  });
  s5.add(text(stage, COPY.locNote, { y: 990, size: 30, weight: 500, color: C.sky, align: 'center' }), 70);

  // Scene 6 Payment 930 to 1170
  const s6 = Scene(930, 1170);
  s6.add(text(stage, COPY.payTitle, { x: TX, y: 120, w: TW, size: 64, weight: 700 }), 8);
  const steps = [960, 985, 1010, 1035, 1060, 1085, 1110];
  timelineScene(s6, { x: TX, y: 270, step: 84, w: 900, size: 42, steps });
  s6.add(text(stage, COPY.possession, { x: TX, y: 860, w: TW, size: 64, weight: 700 }), 196);

  // Scene 7 What comes with the building 1170 to 1260
  const s7 = Scene(1170, 1260);
  iconsScene(s7, { x0: 85, col: 350, y: 400, icon: 140, size: 36 });

  // Scene 8 End card 1260 to 1350
  const s8 = Scene(1260, 1350);
  endCard(s8, {
    logoW: 440, logoY: 64, hiY: 150, hiSize: 80, trustY: 286, trustSize: 38,
    callY: 352, callSize: 42, phoneSize: 64, callStack: false,
    pnX: 380, pnY: 470, pnW: 1160, pnH: 200, pnPad: 52, qr: 150, qrSize: 20,
    reraHTML: RERA_HTML(42, 0, 36, false),
    devY: 712, devSize: 28, devOneLine: true,
    dsX: 130, dsSize: 25, dsAlign: 'center', dsBottom: 1046,
  });

  buildingState = f => {
    if (f < 150) return buildOpening(f, 0);
    if (f < 340) {
      const s = buildOpening(f, -400);
      s.op = 1 - P(f, 320, 12);
      const hp = (f - 160) / 70; // sweep floors 1 to 7
      if (f < 160) s.hiOp = P(f, 152, 8) * 0, s.hiFloor = 0;
      else if (f < 232) { s.hiOp = P(f, 158, 6); s.hiFloor = Math.min(6, Math.max(0, hp * 6)); }
      else { s.hiOp = 1 - P(f, 268, 14); s.hiFloor = lerp(6, LIT_FLOOR, P(f, 232, 14)); }
      const lit0 = s.lit;
      s.lit = (r, c) => r === LIT_FLOOR ? Math.max(lit0(r, c), P(f, 248, 8)) : lit0(r, c);
      return s;
    }
    if (f < 930) return { op: 0, ground: 0, pillars: 0, fl: 0, bodyOp: 0, roof: 0, winIn: () => 0, lit: () => 0 };
    // Scene 6 assembly in sync with the timeline
    let fl = 0;
    fl = 3 * P(f, steps[2], 20) + 2 * P(f, steps[3], 20) + 2 * P(f, steps[4], 20);
    return {
      op: P(f, 932, 14) * (1 - P(f, 1160, 10)),
      ground: P(f, steps[0] - 6, 14), pillars: P(f, steps[1], 14), fl, bodyOp: P(f, steps[1] + 4, 10), roof: P(f, steps[4] + 14, 10),
      winIn: (r, c) => P(f, steps[5] + r * 2 + c, 10),
      lit: (r, c) => { const i = litIdx(r, c); return i < 0 ? 0 : P(f, steps[6] + i * 3, 6); },
      hiOp: 0,
    };
  };
}

/* ================= REEL 9:16, 30 s ================= */
function reel() {
  BG = [[0, C.ev]];
  building = Building({ cx: 540, baseY: 1000, Wn: 62, G: 22, Pd: 34, groundH: 90 });
  const X = 72, TW = 936;

  const s1 = Scene(0, 120);
  s1.add(text(stage, COPY.name, { x: X, y: 1070, w: TW, size: 112, weight: 700 }), 22);
  s1.add(text(stage, COPY.where1, { x: X, y: 1220, w: TW, size: 54, weight: 600 }), 28);
  s1.add(text(stage, COPY.where2, { x: X, y: 1290, w: TW, size: 54, weight: 500, color: C.sky }), 34);

  const s2 = Scene(120, 240);
  COPY.bldg.forEach((s, i) => s2.add(text(stage, s, { x: X, y: 1080 + i * 104, w: TW, size: 86, weight: 700 }), 10 + i * 6));

  const s3 = Scene(240, 420);
  priceBlock(s3, { x: X, y: 1066, w: TW }, [
    { s: COPY.priceHead, size: 56, weight: 600, after: 4 },
    { s: COPY.price, price: true, from: COPY.from, fromSize: 52, size: 156, after: 26 },
    { s: COPY.extras, size: 48, weight: 500, color: C.sky },
  ], 10);

  const s4 = Scene(420, 570);
  mapScene(s4, {
    cx: 540, cy: 690, pinScale: 1.05, road: 14, size: 38, tagSize: 30, pad: 28, stack: true,
    roads: ['M40 560 L1040 560', 'M40 820 L1040 820', 'M300 280 L300 960', 'M780 280 L780 960'],
    labels: [
      { x: 60, y: 290, w: 440, h: 140, ax: 380, ay: 430 },
      { x: 580, y: 290, w: 440, h: 140, ax: 700, ay: 430 },
      { x: 60, y: 800, w: 440, h: 140, ax: 380, ay: 800 },
      { x: 580, y: 800, w: 440, h: 140, ax: 700, ay: 800 },
    ],
  });
  COPY.locTitleReel.forEach((s, i) => s4.add(text(stage, s, { x: X, y: 1090 + i * 84, w: TW, size: 68, weight: 700 }), 10 + i * 6));
  s4.add(text(stage, COPY.locNote, { x: X, y: 1300, w: TW, size: 36, weight: 500, color: C.sky }), 60);

  const s5 = Scene(570, 720);
  s5.add(text(stage, COPY.reelPay[0], { x: X, y: 1070, w: TW, size: 96, weight: 700 }), 14);
  s5.add(text(stage, COPY.reelPay[1], { x: X, y: 1200, w: TW, size: 58, weight: 500 }), 20);
  s5.add(text(stage, COPY.reelPay[2], { x: X, y: 1290, w: TW, size: 58, weight: 700, color: C.sky }), 26);

  const s6 = Scene(720, 900);
  endCard(s6, reelEndOpts());

  buildingState = f => {
    if (f < 420) {
      const s = buildOpening(f, 0);
      s.op = 1 - P(f, 412, 10);
      if (f >= 120 && f < 240) {
        const hp = (f - 130) / 70;
        s.hiOp = P(f, 128, 6) * (1 - P(f, 214, 12));
        s.hiFloor = Math.min(6, Math.max(0, hp * 6));
      }
      const dim = P(f, 232, 12) * (1 - P(f, 412, 8)); // price scene: no yellow windows
      const lit0 = s.lit; s.lit = (r, c) => lit0(r, c) * (1 - dim);
      return s;
    }
    if (f < 570) return { op: 0, ground: 1, pillars: 0, fl: 0, bodyOp: 0, roof: 0, winIn: () => 0, lit: () => 0 };
    const t = 584;
    return {
      op: 1 - P(f, 712, 10), ground: 1, pillars: P(f, t, 14), bodyOp: P(f, t + 6, 10),
      fl: 7 * P(f, t + 10, 56), roof: P(f, t + 64, 12),
      winIn: (r, c) => P(f, t + 74 + r * 2 + c, 10),
      lit: (r, c) => { const i = litIdx(r, c); return i < 0 ? 0 : P(f, t + 92 + i * 4, 6); },
      hiOp: 0,
    };
  };
  // the lower Blue Hour ground stays through the map scene; it leaves for the end card
  const g0 = buildingState;
  buildingState = f => {
    const s = g0(f);
    s.ground = f < 120 ? P(f, 0, 16) : 1 - P(f, 712, 12);
    return s;
  };
}

function reelEndOpts() {
  return {
    logoW: 560, logoY: 270, hiY: 372, hiSize: 92, trustY: 520, trustSize: 40,
    callY: 598, callSize: 44, phoneSize: 84, callStack: true,
    pnX: 60, pnY: 780, pnW: 960, pnH: 240, pnPad: 44, qr: 176, qrSize: 22,
    reraHTML: RERA_HTML(36, 48, 36, true),
    devY: 1052, devSize: 30, devOneLine: false,
    dsX: 64, dsSize: 27, dsAlign: 'left', dsBottom: 1556,
  };
}

/* ============ ONE REEL PER LAYOUT 9:16, 15 s ============ */
function layoutReel() {
  const L = LAYOUTS[LI];
  BG = [[0, C.ev]];
  building = Building({ cx: 540, baseY: 920, Wn: 56, G: 20, Pd: 30, groundH: 80 });
  const X = 72, TW = 936;

  const s1 = Scene(0, 75);
  s1.add(text(stage, COPY.name, { x: X, y: 990, w: TW, size: 104, weight: 700 }), 10);
  s1.add(text(stage, COPY.where1, { x: X, y: 1130, w: TW, size: 52, weight: 600 }), 16);
  s1.add(text(stage, COPY.where2, { x: X, y: 1198, w: TW, size: 52, weight: 500, color: C.sky }), 22);

  const s2 = Scene(75, 240);
  priceBlock(s2, { x: X, y: 976, w: TW }, [
    { s: L.home, size: 84, weight: 700, lh: 1.2, after: 2 },
    { s: `${COPY.superLbl} ${L.sup}`, size: 44, weight: 500, lh: 1.3 },
    { s: `${COPY.carpetLbl} ${L.carpet}`, size: 44, weight: 600, lh: 1.3, after: 12 },
    { s: L.price, price: true, size: 150, after: 22, countDur: 32 },
    { s: COPY.rate, size: 40, weight: 500, lh: 1.3 },
    { s: COPY.extras, size: 40, weight: 500, color: C.sky, lh: 1.3 },
  ], 10);

  const s3 = Scene(240, 330);
  mapScene(s3, {
    fast: true, cx: 540, cy: 620, pinScale: 0.95, road: 14, size: 36, tagSize: 28, pad: 26, stack: true,
    roads: ['M40 500 L1040 500', 'M40 760 L1040 760', 'M300 260 L300 880', 'M780 260 L780 880'],
    labels: [
      { x: 60, y: 270, w: 440, h: 130, ax: 380, ay: 400 },
      { x: 580, y: 270, w: 440, h: 130, ax: 700, ay: 400 },
      { x: 60, y: 730, w: 440, h: 130, ax: 380, ay: 730 },
      { x: 580, y: 730, w: 440, h: 130, ax: 700, ay: 730 },
    ],
  });
  // the map scene is short, so labels come in sooner
  COPY.locTitleReel.forEach((s, i) => s3.add(text(stage, s, { x: X, y: 1000 + i * 82, w: TW, size: 66, weight: 700 }), 6 + i * 6));
  s3.add(text(stage, COPY.locNote, { x: X, y: 1200, w: TW, size: 36, weight: 500, color: C.sky }), 20);

  const s4 = Scene(330, 450);
  endCard(s4, reelEndOpts());

  buildingState = f => {
    const s = buildOpening(f, -50);
    s.ground = f < 50 ? P(f, 0, 14) : 1 - P(f, 322, 12);
    s.op = 1 - P(f, 232, 10);
    const dim = P(f, 70, 12);
    const lit0 = s.lit; s.lit = (r, c) => lit0(r, c) * (1 - dim);
    return s;
  };
}

/* speed up the map label entrances for the 2.5 s map scene in layout reels */
({ film, reel, layout: layoutReel })[COMP]();

window.TOTAL_FRAMES = FRAMES;
window.DIM = DIM;
window.renderFrame = f => {
  stage.style.background = bgAt(f);
  for (const sc of scenes) {
    for (const it of sc.items) show(it, f);
    for (const fn of sc.fns) fn(f);
  }
  if (building) building.apply(buildingState(f));
};
window.allText = () => [...stage.querySelectorAll('div,span')].filter(e => e.children.length === 0 && e.textContent.trim()).map(e => e.textContent);
window.ready = Promise.all([
  document.fonts.load('700 40px "Anek Latin"'), document.fonts.load('800 40px "Anek Latin"'),
  document.fonts.load('500 40px "Anek Latin"'), document.fonts.load('700 40px "Anek Devanagari"'),
  ...[...document.images].map(i => i.decode()),
]).then(() => { scenes.forEach(() => 0); window.renderFrame(0); return document.fonts.ready; });
