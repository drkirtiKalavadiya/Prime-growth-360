// Usage: node render/stills.js out_dir t1 t2 ...   → PNG per time (for previews / storyboard)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const [out, ...times] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() !== 'log') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html') + '?capture');
  await page.waitForFunction('window.READY === true');
  for (const t of times) {
    await page.evaluate(t => MV.renderAt(+t), t);
    await page.locator('#film').screenshot({ path: path.join(out, `t_${String(Math.round(t * 1000)).padStart(6, "0")}.png`) });
  }
  if (errs.length) console.log('ERRORS:\n' + [...new Set(errs)].join('\n'));
  await browser.close();
})();
