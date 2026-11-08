// Renders the reel to an MP4 (720x1280, 30 fps) with the 1.5x voice-over.
// Needs Node with Playwright (Chromium) and ffmpeg.   Usage: node render-mp4.js [out.mp4]
// The page plays in real time while it is recorded. A one-off red frame marks the moment
// playback starts, so the audio can be lined up to the exact video frame.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

(async () => {
  const out = path.resolve(process.argv[2] || 'laptop-battery-reel-gujarati.mp4');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-'));
  const page = 'file://' + path.join(__dirname, 'index.html') + '?record=1';

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 720, height: 1280 }, recordVideo: { dir: tmp, size: { width: 720, height: 1280 } } });
  const p = await ctx.newPage();
  await p.goto(page);
  await p.waitForTimeout(3000);                       // fonts + first scene
  const dur = await p.evaluate(() => REEL.DUR);
  await p.evaluate(() => new Promise(res => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:#f00;z-index:99';
    document.body.appendChild(d);
    setTimeout(() => { d.remove(); REEL.play(); res(); }, 400);
  }));
  await p.waitForTimeout(dur * 1000 + 800);
  await ctx.close(); await browser.close();
  const webm = path.join(tmp, fs.readdirSync(tmp).find(f => f.endsWith('.webm')));

  // find the last red marker frame (25 fps recording)
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-nostdin', '-i', webm, '-t', '15', '-vf', 'crop=20:20:350:20,scale=1:1,format=rgb24', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 24 });
  let last = -1;
  for (let i = 0; i + 2 < raw.length; i += 3) if (raw[i] > 200 && raw[i + 1] < 60 && raw[i + 2] < 60) last = i / 3;
  if (last < 0) throw new Error('start marker not found');
  const start = ((last + 1) / 25).toFixed(2);

  execFileSync('ffmpeg', ['-v', 'error', '-nostdin', '-y', '-ss', start, '-i', webm, '-i', path.join(__dirname, 'voiceover.mp3'),
    '-t', dur.toFixed(2), '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'aac', '-b:a', '192k', '-af', 'apad', '-movflags', '+faststart', out], { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('Saved', out);
})();
