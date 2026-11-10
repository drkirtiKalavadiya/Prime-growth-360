// Frame-exact export: node render/render.js out.mp4 [fps] [start] [end]
// Steps MV.renderAt(t) for every frame and pipes PNG screenshots into ffmpeg.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const out = process.argv[2] || 'mindset_silent.mp4';
  const fps = +(process.argv[3] || 30);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: +(process.env.SCALE || 1) });
  page.on('pageerror', e => console.error('pageerror', e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html') + '?capture');
  await page.waitForFunction('window.READY === true');
  const dur = await page.evaluate('window.DURATION');
  const t0 = +(process.argv[4] || 0), t1 = +(process.argv[5] || dur);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((t1 - t0) * fps);
  const film = page.locator('#film');
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => MV.renderAt(t), t0 + i / fps);
    const buf = await film.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${n}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('wrote', out);
})();
