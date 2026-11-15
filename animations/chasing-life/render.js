#!/usr/bin/env node
/* =====================================================================
 * render.js: renders the reel frame by frame to an MP4.
 *
 *   node animations/chasing-life/render.js [--out file.mp4] [--fps 30] [--from 0] [--to 27]
 *
 * Requires: Node 18+, Playwright (Chromium) and ffmpeg on PATH.
 * Each frame is drawn by the same render(ctx, t) function the browser
 * preview uses, so the output matches the preview frame for frame.
 * ===================================================================== */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]]] : acc), [])
);

(async () => {
  const outDir = path.join(__dirname, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.resolve(args.out || path.join(outDir, 'chasing-life-silent.mp4'));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto('file://' + path.join(__dirname, 'index.html') + '?render=1');
  await page.waitForFunction(() => window.__ready === true);

  const T = await page.evaluate(() => window.Reel.TIMELINE);
  const fps = Number(args.fps || T.fps);
  const from = Number(args.from || 0);
  const to = Number(args.to || T.duration);
  const total = Math.round((to - from) * fps);

  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'animation',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));

  const started = Date.now();
  for (let i = 0; i < total; i++) {
    const t = from + i / fps;
    const dataURL = await page.evaluate((t) => window.frameDataURL(t), t);
    const buf = Buffer.from(dataURL.slice(dataURL.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % fps === 0 || i === total - 1) {
      process.stdout.write(`\rframe ${i + 1}/${total}  (${((Date.now() - started) / 1000).toFixed(1)}s)   `);
    }
  }
  ff.stdin.end();
  await done;
  await browser.close();
  console.log(`\nwrote ${out}`);
})().catch((e) => { console.error(e); process.exit(1); });
