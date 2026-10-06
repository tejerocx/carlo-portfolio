const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const out = process.argv[2], times = process.argv.slice(3).map(Number);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto('file://' + __dirname + '/index.html');
  await page.waitForFunction(() => window.READY === true);
  const fs = require('fs'); fs.mkdirSync(__dirname + '/stills', { recursive: true });
  const files = [];
  for (const t of times) {
    await page.evaluate(t => render(t), t);
    const f = `${__dirname}/stills/t${t.toFixed(2)}.png`; files.push(f);
    await page.screenshot({ path: f });
  }
  await browser.close();
  require('child_process').execFileSync('python3', ['-c', `
import sys; from PIL import Image, ImageDraw
fs=sys.argv[2:]; ims=[Image.open(f).convert('RGB').resize((324,576)) for f in fs]
W=Image.new('RGB',(334*len(ims),606),'white'); d=ImageDraw.Draw(W)
for i,(f,im) in enumerate(zip(fs,ims)): W.paste(im,(i*334,30)); d.text((i*334+5,5),f.split('/')[-1],fill='black')
W.save(sys.argv[1])`, out, ...files]);
})();
