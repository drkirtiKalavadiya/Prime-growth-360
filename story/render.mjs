#!/usr/bin/env node
/**
 * Export the story as a 1080×1920 (9:16) MP4 with the voice-over.
 *
 *   node story/render.mjs [out.mp4] [--fps 30] [--scale 3] [--clean] [--from 0] [--to 130]
 *   node story/render.mjs --stills 3,10,40 [--outdir frames]   # PNG stills at given seconds
 *
 * Needs Node 18+, Playwright (with Chromium) and ffmpeg on PATH.
 * Every frame is drawn deterministically by seeking the page clock (?render),
 * so the video is smooth no matter how fast the machine is.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const flag = (name) => args.includes(`--${name}`);
const VALUED = ['--fps', '--scale', '--from', '--to', '--stills', '--outdir'];
const out = args.find((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1])) || path.join(here, 'story.mp4');
const fps = Number(opt('fps', 30));
const scale = Number(opt('scale', 3)); // 360×640 CSS px × 3 = 1080×1920
const stills = opt('stills', null);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: scale });
const url = pathToFileURL(path.join(here, 'index.html'));
url.search = `render${flag('clean') ? '&clean' : ''}`;
await page.goto(url.href);
await page.evaluate(() => window.__ready);
const duration = await page.evaluate(() => window.__duration);
const stage = page.locator('#stage');

if (stills) {
  const dir = opt('outdir', path.join(here, 'frames'));
  fs.mkdirSync(dir, { recursive: true });
  for (const s of stills.split(',').map(Number)) {
    await page.evaluate((t) => window.__seek(t), s);
    await stage.screenshot({ path: path.join(dir, `t${String(s).padStart(6, '0')}.png`) });
  }
  console.log(`stills written to ${dir}`);
  await browser.close();
  process.exit(0);
}

const from = Number(opt('from', 0));
const to = Math.min(Number(opt('to', duration)), duration);
const frames = Math.ceil((to - from) * fps);
const mix = path.join(here, 'audio', 'mix.mp3');
const audio = fs.existsSync(mix) ? mix : path.join(here, 'audio', 'voiceover.mp3');
const ff = spawn('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
  '-ss', String(from), '-t', String(to - from), '-i', audio,
  '-map', '0:v', '-map', '1:a',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps),
  '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out,
], { stdio: ['pipe', 'inherit', 'inherit'] });

const started = Date.now();
for (let n = 0; n < frames; n++) {
  await page.evaluate((t) => window.__seek(t), from + n / fps);
  const png = await stage.screenshot({ type: 'png' });
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
  if (n % (fps * 5) === 0) {
    const pct = ((n / frames) * 100).toFixed(0);
    process.stdout.write(`\rframe ${n}/${frames} (${pct}%) ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log(`\nsaved ${out}`);
