// Usage: node render.js <comp> <out.mp4> [layoutIndex] [audio.wav] [--stills f1,f2,...]
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const { chromium } = require('playwright');
const [comp, out, li = '0', audio] = process.argv.slice(2);
const stillsArg = process.argv.indexOf('--stills');
const stills = stillsArg > 0 ? process.argv[stillsArg + 1].split(',').map(Number) : null;
const root = __dirname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
}).listen(0, async () => {
  const port = server.address().port;
  const browser = await chromium.launch();
  const vp = comp === 'film' ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 };
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
  page.on('console', m => console.log('page:', m.text()));
  page.on('pageerror', e => console.log('pageerror:', e.message));
  await page.goto(`http://localhost:${port}/index.html?comp=${comp}&i=${li}`);
  await page.evaluate(() => window.ready);
  const total = await page.evaluate(() => window.TOTAL_FRAMES);
  if (stills) {
    for (const f of stills) {
      await page.evaluate(f => window.renderFrame(f), f);
      await page.screenshot({ path: `${out}-${String(f).padStart(4, '0')}.png` });
    }
    const txt = await page.evaluate(() => window.allText());
    fs.writeFileSync(`${out}-text.json`, JSON.stringify(txt, null, 1));
    await browser.close(); server.close(); return;
  }
  const args = ['-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-'];
  if (audio) args.push('-i', audio);
  args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', '30', '-g', '60');
  if (audio) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  args.push('-movflags', '+faststart', out);
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    await page.evaluate(f => window.renderFrame(f), f);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`${comp} ${f}/${total} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  ff.on('close', c => { console.log('ffmpeg exit', c, out); browser.close(); server.close(); });
});
