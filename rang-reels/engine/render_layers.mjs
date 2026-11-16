// Renders the graphics layers of a plan with headless Chromium.
// usage: node render_layers.mjs JOB.json
//   JOB = { "plan": {...resolved plan...}, "head": {x, top, w}, "out": "/abs/dir",
//           "shots": [{"name": "0012_1", "t": 0.41, "room": "file:///.../r_0012.jpg" | null}, ...] }
// Writes out/B_<name>.jpg (back layer, opaque: room + graphics behind the person) and
//        out/F_<name>.png (front layer, RGBA: graphics in front of everything).
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

const launch = { args: ['--allow-file-access-from-files'] };
if (process.env.CHROME) launch.executablePath = process.env.CHROME;
const browser = await chromium.launch(launch);
const page = await browser.newPage({ viewport: { width: 2160, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.error('stage error:', e.message); process.exitCode = 2; });
await page.goto('file://' + path.join(here, 'stage.html'));
const n = await page.evaluate(([p, h]) => window.setup(p, h), [job.plan, job.head]);
console.log(`stage ready: ${n} elements, ${job.shots.length} shots`);

const t0 = Date.now();
for (let k = 0; k < job.shots.length; k++) {
  const s = job.shots[k];
  await page.evaluate(([t, r]) => window.frame(t, r), [s.t, s.room]);
  await page.screenshot({ path: path.join(job.out, `B_${s.name}.jpg`), type: 'jpeg', quality: 94, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  await page.screenshot({ path: path.join(job.out, `F_${s.name}.png`), omitBackground: true, clip: { x: 1080, y: 0, width: 1080, height: 1920 } });
  if (k % 60 === 59) console.log(`  layers ${k + 1}/${job.shots.length} (${((Date.now() - t0) / (k + 1)).toFixed(0)} ms/shot)`);
}
await browser.close();
