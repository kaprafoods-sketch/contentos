// Reel safe area: no text in the top 250 px or bottom 350 px (y 250 to 1570).
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => { const f = path.join(__dirname, q.url.split('?')[0]); fs.readFile(f, (e, d) => { r.writeHead(e ? 404 : 200, { 'Content-Type': TYPES[path.extname(f)] }); r.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch(); let bad = 0;
  for (const [comp, i] of [['reel', 0], ...[0, 1, 2, 3, 4].map(i => ['layout', i])]) {
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    await p.goto(`http://localhost:${server.address().port}/index.html?comp=${comp}&i=${i}`);
    await p.evaluate(() => window.ready);
    await p.evaluate(() => window.renderFrame(window.TOTAL_FRAMES - 1));
    const out = await p.evaluate(() => { document.querySelectorAll('#stage *').forEach(e => { e.style.transform = 'none'; }); return [...document.querySelectorAll('#stage div, #stage span, #stage img')].filter(e => e.tagName === 'IMG' || (e.children.length === 0 && e.textContent.trim())).map(e => { const r = e.getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(e); const rr = e.tagName === 'IMG' ? r : range.getBoundingClientRect(); return [e.textContent || 'logo', Math.round(rr.top), Math.round(rr.bottom), Math.round(rr.left), Math.round(rr.right)]; }); });
    const v = out.filter(([, t, bt, l, rt]) => t < 250 || bt > 1570 || l < 0 || rt > 1080);
    console.log(comp, i, v.length ? 'OUTSIDE: ' + JSON.stringify(v) : `all ${out.length} text items inside safe area`);
    bad += v.length; await p.close();
  }
  await b.close(); server.close(); process.exit(bad ? 1 : 0);
});
