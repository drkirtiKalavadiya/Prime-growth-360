const { chromium } = require('playwright');
const [,, startF, endF, outDir, listArg] = process.argv;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('http://127.0.0.1:8765/'+(process.env.PAGE||'overlay.html')+'');
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  const frames = listArg ? listArg.split(',').map(Number) : [...Array(+endF - +startF).keys()].map(i => i + +startF);
  for (const f of frames) {
    await p.evaluate(t => window.setT(t), f / 30);
    await p.screenshot({ path: `${outDir}/o${String(f).padStart(4, '0')}.png`, omitBackground: true });
  }
  await b.close();
})();
