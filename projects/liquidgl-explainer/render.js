// Usage:
//   node render.js video <out.mp4> [startFrame] [endFrame]   silent video chunk
//   node render.js stills <prefix> f1,f2,...                  PNG stills for review
//   node render.js cues <out.json>                            audio cue list
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const { chromium } = require('playwright');
const [mode, out, a, b] = process.argv.slice(2);
const root = __dirname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
}).listen(0, async () => {
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', m => console.log('page:', m.text()));
  page.on('pageerror', e => console.log('pageerror:', e.message));
  await page.goto(`http://localhost:${port}/index.html`);
  await page.evaluate(() => window.ready);
  const shot = () => page.locator('#gl').screenshot({ type: 'png' });
  const done = async () => { await browser.close(); server.close(); };
  if (mode === 'cues') { fs.writeFileSync(out, JSON.stringify(await page.evaluate(() => window.cues()), null, 1)); return done(); }
  if (mode === 'stills') {
    for (const f of a.split(',').map(Number)) { await page.evaluate(f => window.renderFrame(f), f); fs.writeFileSync(`${out}-${String(f).padStart(4, '0')}.png`, await shot()); }
    return done();
  }
  const total = await page.evaluate(() => window.TOTAL_FRAMES);
  const f0 = Number(a || 0), f1 = Math.min(total, Number(b || total));
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', '30', out], { stdio: ['pipe', 'ignore', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    await page.evaluate(f => window.renderFrame(f), f);
    const buf = await shot();
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 100 === 0) console.log(`${out} ${f - f0}/${f1 - f0} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  ff.on('close', c => { console.log('ffmpeg exit', c, out); done(); });
});
