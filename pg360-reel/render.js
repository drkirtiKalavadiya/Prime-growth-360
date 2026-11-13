// Frame-exact MP4 render: 1080x1920, 30 fps, with soundtrack.mp3 (voice-over + music + SFX).
// Every frame is drawn at its exact time (REEL.seek), so nothing depends on machine speed.
// Needs Node with Playwright (Chromium) and ffmpeg.   Usage: node render.js [out.mp4] [parts=3]
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const FPS = 30;
(async () => {
  const out = path.resolve(process.argv[2] || 'primegrowth360-reel.mp4');
  const parts = +(process.argv[3] || 3);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pg360-'));
  const url = 'file://' + path.join(__dirname, 'index.html') + '?record=1';
  const browser = await chromium.launch();
  let done = 0;
  const probe = await browser.newPage();
  await probe.goto(url);
  const dur = await probe.evaluate(() => REEL.DUR);
  await probe.close();
  const total = Math.round(dur * FPS), per = Math.ceil(total / parts);
  await Promise.all([...Array(parts)].map(async (_, k) => {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    for (let i = k * per; i < Math.min(total, (k + 1) * per); i++) {
      await page.evaluate(t => REEL.seek(t), i / FPS);
      await page.evaluate(() => Promise.all([...document.images].map(im => im.decode().catch(() => {}))));
      await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 93 });
      if (++done % 100 === 0) process.stdout.write(`\r${done}/${total} frames`);
    }
    await page.close();
  }));
  await browser.close();
  console.log(`\r${total}/${total} frames — encoding`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(tmp, 'f%05d.jpg'),
    '-i', path.join(__dirname, 'soundtrack.mp3'), '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('Saved', out);
})();
