// Offline renderer: steps render(t) frame by frame and pipes screenshots into ffmpeg.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { spawn } = require('child_process');
const FPS = 60, DUR = 24.5, WORKERS = +(process.env.WORKERS || 4);
const total = Math.round(FPS * DUR);
async function worker(w, browser) {
  const a = Math.floor(total * w / WORKERS), b = Math.floor(total * (w + 1) / WORKERS);
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto('file://' + __dirname + '/index.html');
  await page.waitForFunction(() => window.READY === true);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '8', '-pix_fmt', 'yuv420p', `${__dirname}/out/seg${w}.mp4`]);
  for (let f = a; f < b; f++) {
    await page.evaluate(t => render(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 97 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - a) % 100 === 0) console.log(`w${w} ${f - a}/${b - a}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
}
(async () => {
  require('fs').mkdirSync(__dirname + '/out', { recursive: true });
  const browser = await chromium.launch();
  const t0 = Date.now();
  await Promise.all(Array.from({ length: WORKERS }, (_, w) => worker(w, browser)));
  await browser.close();
  console.log('done in', ((Date.now() - t0) / 1000).toFixed(0), 's');
})();
