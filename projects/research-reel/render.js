// Usage:
//   node render.js video <ig|yt> <out.mp4> [startFrame] [endFrame]   silent video
//   node render.js stills <ig|yt> <prefix> f1,f2,... [--safe]          PNG stills for review
//   node render.js meta <ig|yt|ig220> <out.json>                       audio cues
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const { chromium } = require('playwright');
const [mode, v, out, a, b] = process.argv.slice(2);
const root = __dirname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
}).listen(0, async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', m => console.log('page:', m.text()));
  page.on('pageerror', e => console.log('pageerror:', e.message));
  await page.goto(`http://localhost:${server.address().port}/index.html?v=${v}`);
  await page.evaluate(() => window.ready);
  const done = async () => { await browser.close(); server.close(); };
  const shot = () => page.locator('#c').screenshot({ type: 'png' });
  if (mode === 'meta') {
    fs.writeFileSync(out, JSON.stringify(await page.evaluate(() => ({ total: TIMING[new URLSearchParams(location.search).get('v')].total, cues: window.cues() })), null, 1));
    return done();
  }
  if (mode === 'stills') {
    if (process.argv.includes('--safe')) await page.evaluate(() => window.SAFE = true);
    for (const f of a.split(',').map(Number)) { await page.evaluate(f => window.renderFrame(f), f); fs.writeFileSync(`${out}-${String(f).padStart(4, '0')}.png`, await shot()); }
    return done();
  }
  const total = await page.evaluate(() => window.TOTAL_FRAMES);
  const f0 = Number(a || 0), f1 = Math.min(total, Number(b || total));
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', '30', out], { stdio: ['pipe', 'ignore', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    await page.evaluate(f => window.renderFrame(f), f);
    const buf = await shot();
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 150 === 0) console.log(`${out} ${f - f0}/${f1 - f0} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  ff.on('close', c => { console.log('ffmpeg exit', c, out); done(); });
});
