/* Headless renderer for the AVC showreel.
 *
 *   node render.cjs                    → out/avc-showreel.mp4 (1080p60 + soundtrack)
 *   node render.cjs --stills 1,4.5,15  → out/still-<t>.png for quick checks
 *   options: --fps 60 --sub 4 (motion-blur subsamples) --from 0 --to 20
 *
 * Needs Playwright (Chromium) and ffmpeg on PATH. Run `node audio.cjs` first
 * to synthesize out/soundtrack.wav (muxed automatically when present).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = __dirname, OUT = path.join(ROOT, 'out');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const FPS = +arg('fps', 60), SUB = +arg('sub', 4);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };

function serve() {
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res(s));
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.error('[page error]', e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?capture`);
  await page.waitForFunction(() => window.__ready === true);
  const shot = (png = false) => page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 }, ...(png ? { type: 'png' } : { type: 'jpeg', quality: 98 }) });

  const stills = arg('stills');
  if (stills) {
    for (const t of stills.split(',').map(Number)) {
      await page.evaluate(([t, s]) => window.renderFrame(t, s), [t, SUB]);
      fs.writeFileSync(path.join(OUT, `still-${t}.png`), await shot(true));
      console.log('still', t);
    }
  } else {
    const dur = await page.evaluate(() => window.DURATION);
    const from = +arg('from', 0), to = +arg('to', dur);
    const wav = path.join(OUT, 'soundtrack.wav');
    const hasAudio = fs.existsSync(wav) && from === 0;
    const dest = path.join(OUT, arg('out', 'avc-showreel.mp4'));
    const ff = spawn('ffmpeg', [
      '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      ...(hasAudio ? ['-i', wav] : []),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      ...(hasAudio ? ['-c:a', 'aac', '-b:a', '256k', '-shortest'] : []),
      '-movflags', '+faststart', dest,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round((to - from) * FPS), t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const t = from + i / FPS;
      await page.evaluate(([t, s, sh]) => window.renderFrame(t, s, sh), [t, SUB, 0.5 / FPS]);
      const buf = await shot();
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 60 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log('wrote', dest);
  }
  await browser.close();
  server.close();
})();
