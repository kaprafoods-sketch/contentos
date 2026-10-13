// Verifies on-screen text against the brief, character by character. node check.js
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const BRIEF_COMMON = ['Wonder Home V', 'Sector 101, Noida.', 'Opposite Bade Hanuman Ji Temple.', 'सही जगह, सही दाम।',
  '200+ homes delivered in Noida since 2017.', 'Call or WhatsApp', '+91 70602 00814', 'www.up-rera.in',
  'Developer: Infra Kraft Homes Private Limited.', 'Marketed by Legacy Estate Private Limited.',
  'Artist impression. Areas are super built up and subject to the final sanctioned plan. Carpet area is super area less 8%. Prices are basic sale price at ₹6,999 per sq ft of super area; parking, PLC, power backup, GST, stamp duty and registration are extra. Travel times are indicative. Not an offer; the agreement for sale governs.',
  'Metro, Medanta and two malls, each five minutes away.', 'Sector 101 metro', 'Medanta', 'Aditya Ancora Mall', 'Spectrum Mall', '5 min', 'Travel times by road, indicative.'];
const EXPECT = {
  film: [...BRIEF_COMMON, 'One building. Seven floors. Five homes on each.', '35 homes in all, so you know your neighbours.', '2 BHK', '2 BHK + Study', '3 BHK',
    'Five layouts, the same on every floor.', '2 BHK, 989 sq ft carpet', 'from', '₹75.2 lakh', 'At ₹6,999 per sq ft of super area.', 'Parking, PLC, power backup and GST extra.',
    'You pay as the building rises.', 'At booking', '10%', 'Foundation complete', '15%', '3rd floor slab', '5th floor slab', 'Terrace complete', 'Finishing and OC', '20%', 'At possession',
    'Possession in 11 months.', 'High speed lift', 'Covered parking', '24x7 security and CCTV', 'Fire safety', 'Power backup'],
  reel: [...BRIEF_COMMON, 'One building. Seven floors. Five homes on each.', '2 BHK, 989 sq ft carpet', '₹75.2 lakh', 'Parking, PLC, power backup and GST extra.',
    '10% to book.', 'The rest as the building rises.', 'Possession in 11 months.'],
};
const LAY = [['2 BHK', '1,075 sq ft', '989 sq ft', '₹75.2 lakh'], ['2 BHK + Study', '1,175 sq ft', '1,081 sq ft', '₹82.2 lakh'], ['3 BHK', '1,410 sq ft', '1,297 sq ft', '₹98.7 lakh'],
  ['3 BHK', '1,570 sq ft', '1,444 sq ft', '₹1.1 crore'], ['3 BHK', '1,670 sq ft', '1,536 sq ft', '₹1.17 crore']];
const BANNED = /RERA registration|UPRERAPRJ|affordable|cheap|budget|low cost|luxury|premium|world class|dream home|best location|limited offer|hurry|booking fast|all inclusive|pool|gym|clubhouse|park\b|garden|smart home|on time|!|—|–/i;
const root = __dirname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => { const f = path.join(root, q.url.split('?')[0]); fs.readFile(f, (e, d) => { r.writeHead(e ? 404 : 200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch(); let fail = 0;
  const jobs = [['film', 0], ['reel', 0], ...[0, 1, 2, 3, 4].map(i => ['layout', i])];
  for (const [comp, i] of jobs) {
    const p = await b.newPage({ viewport: comp === 'film' ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 } });
    await p.goto(`http://localhost:${server.address().port}/index.html?comp=${comp}&i=${i}`);
    await p.evaluate(() => window.ready);
    await p.evaluate(() => window.renderFrame(window.TOTAL_FRAMES - 1));
    const texts = await p.evaluate(() => window.allText());
    const joined = texts.join(' ');
    let exp = EXPECT[comp];
    if (comp === 'layout') { const L = LAY[i]; exp = [...BRIEF_COMMON, L[0], 'Super area ' + L[1], 'Carpet area ' + L[2], L[3], 'At ₹6,999 per sq ft of super area.', 'Parking, PLC, power backup and GST extra.']; }
    const missing = exp.filter(s => !texts.includes(s) && !joined.includes(s));
    const banned = texts.filter(t => BANNED.test(t.replace('www.up-rera.in', '')));
    // payment percentages
    if (comp === 'film') { const pct = texts.filter(t => /^\d+%$/.test(t)).map(t => parseInt(t)); const sum = pct.reduce((a, c) => a + c, 0); console.log('  payment steps', pct.join(' + '), '=', sum); if (sum !== 100) fail++; }
    // hindi glyph check: is Anek Devanagari actually used?
    const fontOk = await p.evaluate(() => document.fonts.check('700 40px "Anek Devanagari"', 'सही जगह, सही दाम।'));
    console.log(`${comp}${comp === 'layout' ? ' ' + i : ''}: ${missing.length ? 'MISSING ' + JSON.stringify(missing) : 'all brief strings present'}; ${banned.length ? 'BANNED ' + JSON.stringify(banned) : 'no banned words or dashes'}; devanagari font loaded: ${fontOk}`);
    fail += missing.length + banned.length + (fontOk ? 0 : 1);
    await p.close();
  }
  await b.close(); server.close();
  console.log(fail ? `FAILED ${fail}` : 'ALL CHECKS PASSED'); process.exit(fail ? 1 : 0);
});
