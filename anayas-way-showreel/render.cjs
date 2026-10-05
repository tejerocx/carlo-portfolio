/* Headless renderer for the Anaya's Way showreel.
 *
 *   node render.cjs                    → out/anayas-way-showreel-16x9.mp4  (1920×1080, 60fps)
 *   node render.cjs --vertical         → out/anayas-way-showreel-9x16.mp4  (1080×1920, 60fps)
 *   node render.cjs [--vertical] --stills 1,4.5,15   → PNG checks in out/
 *   options: --fps 60 --sub 4 (motion-blur subsamples)
 *
 * Needs Playwright (Chromium) and ffmpeg. Run `node audio.cjs` first so
 * out/soundtrack.wav gets muxed in.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = __dirname, OUT = path.join(ROOT, 'out');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const VERT = process.argv.includes('--vertical');
const FPS = +arg('fps', 60), SUB = +arg('sub', 4);
const [W, H] = VERT ? [1080, 1920] : [1920, 1080];
const TAG = VERT ? '9x16' : '16x9';
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
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('[page error]', e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?capture${VERT ? '&v=1' : ''}`);
  await page.waitForFunction(() => window.__ready === true);
  // pin the canvas to the viewport at 1:1 so screenshots are pixel exact
  await page.addStyleTag({ content: `canvas{width:${W}px!important;height:${H}px!important;max-width:none!important;max-height:none!important;inset:0!important;margin:0!important}` });
  const shot = (png = false) => page.screenshot({ clip: { x: 0, y: 0, width: W, height: H }, ...(png ? { type: 'png' } : { type: 'jpeg', quality: 98 }) });

  const stills = arg('stills');
  if (stills) {
    for (const t of stills.split(',').map(Number)) {
      await page.evaluate(([t, s]) => window.renderFrame(t, s), [t, SUB]);
      fs.writeFileSync(path.join(OUT, `still-${TAG}-${t}.png`), await shot(true));
    }
    console.log('stills done');
  } else {
    const dur = await page.evaluate(() => window.DURATION);
    const wav = path.join(OUT, 'soundtrack.wav'), hasAudio = fs.existsSync(wav);
    const dest = path.join(OUT, `anayas-way-showreel-${TAG}.mp4`);
    const ff = spawn('ffmpeg', [
      '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      ...(hasAudio ? ['-i', wav] : []),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      ...(hasAudio ? ['-c:a', 'aac', '-b:a', '256k', '-shortest'] : []),
      '-movflags', '+faststart', dest,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round(dur * FPS), t0 = Date.now();
    for (let i = 0; i < n; i++) {
      await page.evaluate(([t, s, sh]) => window.renderFrame(t, s, sh), [i / FPS, SUB, 0.5 / FPS]);
      const buf = await shot();
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 120 === 0) console.log(`[${TAG}] frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log('wrote', dest);
  }
  await browser.close();
  server.close();
})();
