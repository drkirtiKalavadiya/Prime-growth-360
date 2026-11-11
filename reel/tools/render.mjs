#!/usr/bin/env node
// Frame-exact MP4 render of the reel, using headless Chromium (Playwright) + ffmpeg.
//
//   node reel/tools/render.mjs [--out reel.mp4] [--width 1080] [--audio voice.mp3] [--from 0] [--to 68]
//
// Needs: Node 18+, `npm i playwright` (or a global install) and ffmpeg on PATH.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));
const out = path.resolve(args.out || 'reel.mp4');
const width = parseInt(args.width || '1080', 10);

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire(import.meta.url)('playwright')); }

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto(`http://127.0.0.1:${port}/index.html?render=1&w=${width}`);
const info = await page.evaluate(() => window.ReelApp.ready);
const from = parseFloat(args.from || '0'), to = Math.min(parseFloat(args.to || info.duration), info.duration);
const frames = Math.round((to - from) * info.fps);
console.log(`Rendering ${frames} frames at ${info.width}x${info.height}, ${info.fps} fps -> ${out}`);

const ff = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(info.fps), '-c:v', 'mjpeg', '-i', '-'];
if (args.audio) ff.push('-ss', String(from), '-i', path.resolve(args.audio), '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest');
ff.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', out);
const enc = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] });

for (let f = 0; f < frames; f++) {
  const url = await page.evaluate(tt => window.ReelApp.frame(tt, 0.93), from + f / info.fps);
  const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once('drain', r));
  if (f % info.fps === 0) process.stdout.write(`\r  ${Math.round((f / frames) * 100)}%`);
}
enc.stdin.end();
await new Promise((r, j) => enc.on('close', c => (c === 0 ? r() : j(new Error('ffmpeg exited ' + c)))));
process.stdout.write('\r  100%\n');
await browser.close();
server.close();
console.log('Done:', out);
