// Renders every frame of index.html to PNG and writes the sound cue sheet.
// Usage: node export_frames.js <outDir>
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const out = process.argv[2];
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, 'index.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  const { duration, fps } = await page.evaluate(() => window.REEL);
  fs.writeFileSync(path.join(out, 'events.json'), JSON.stringify(await page.evaluate(() => window.getEvents())));
  const frames = Math.round(duration * fps);
  for (let i = 0; i < frames; i++) {
    const data = await page.evaluate((t) => {
      window.renderFrame(t);
      return document.getElementById('reel').toDataURL('image/png');
    }, i / fps);
    fs.writeFileSync(path.join(out, `f${String(i).padStart(4, '0')}.png`), Buffer.from(data.split(',')[1], 'base64'));
    if (i % 60 === 0) process.stdout.write(`frame ${i}/${frames}\r`);
  }
  console.log(`rendered ${frames} frames`);
  await browser.close();
})();
