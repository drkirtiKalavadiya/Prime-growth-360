// Renders the graphics layers of a plan with headless Chromium.
// usage: node render_layers.mjs JOB.json
//   JOB = { "plan": {...resolved plan...}, "head": {x, top, w}, "fps": 30, "frames": [0, 1, 2, ...], "out": "/abs/dir" }
// Writes out/L_0000.png ... (2160x1920 RGBA: left half = back layer, right half = front layer).
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright')); }

const here = path.dirname(fileURLToPath(import.meta.url));
const job = JSON.parse(readFileSync(process.argv[2], 'utf8'));
mkdirSync(job.out, { recursive: true });

const launch = {};
if (process.env.CHROME) launch.executablePath = process.env.CHROME;
const browser = await chromium.launch(launch);
const page = await browser.newPage({ viewport: { width: 2160, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.error('stage error:', e.message); process.exitCode = 2; });
await page.goto('file://' + path.join(here, 'stage.html'));
const n = await page.evaluate(([p, h]) => window.setup(p, h), [job.plan, job.head]);
console.log(`stage ready: ${n} elements, ${job.frames.length} frames`);

const t0 = Date.now();
for (let k = 0; k < job.frames.length; k++) {
  const f = job.frames[k];
  const t = f / job.fps;
  await page.evaluate(tt => window.frame(tt), t);
  await page.screenshot({ path: path.join(job.out, `L_${String(f).padStart(4, '0')}.png`), omitBackground: true });
  if (k % 30 === 29) console.log(`  layers ${k + 1}/${job.frames.length} (${((Date.now() - t0) / (k + 1)).toFixed(0)} ms/frame)`);
}
await browser.close();
