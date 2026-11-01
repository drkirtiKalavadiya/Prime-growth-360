// Shared helpers for the reel scripts.
const fs = require('fs');
const path = require('path');
const { buildTimeline } = require('../engine/timeline');

const ROOT = path.resolve(__dirname, '..');
const ENGINE = path.join(ROOT, 'engine', 'reel.html');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) args[key] = true;
      else { args[key] = next; i++; }
    } else args._.push(a);
  }
  return args;
}

function loadReel(file) {
  if (!file) throw new Error('Pass a reel spec, e.g. reels/claude-code-6-steps.json');
  const abs = path.resolve(file);
  const reel = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const name = reel.name || path.basename(abs, '.json');
  const outDir = path.join(ROOT, 'out', name);
  fs.mkdirSync(outDir, { recursive: true });
  return { reel, name, outDir };
}

function loadVoice(outDir, disabled) {
  if (disabled) return null;
  const f = path.join(outDir, 'voice', 'timings.json');
  if (!fs.existsSync(f)) return null;
  const v = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const k of Object.keys(v.lines)) v.lines[k].file = path.join(outDir, 'voice', v.lines[k].file);
  return v;
}

function timelineFor(file, opts = {}) {
  const { reel, name, outDir } = loadReel(file);
  const voice = loadVoice(outDir, opts.noVoice);
  const tl = buildTimeline(reel, voice);
  if (opts.fps) tl.fps = Number(opts.fps);
  return { reel, name, outDir, tl, voice };
}

async function openEngine({ scale = 2 } = {}) {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    throw new Error('Playwright is missing. Run `npm install` then `npx playwright install chromium`.');
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: scale });
  await page.addInitScript(() => { window.__RENDER__ = true; });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  await page.goto('file://' + ENGINE);
  return { browser, page };
}

function fmt(sec) {
  const m = Math.floor(sec / 60);
  return `${m}:${(sec % 60).toFixed(1).padStart(4, '0')}`;
}

module.exports = { ROOT, ENGINE, parseArgs, loadReel, timelineFor, openEngine, fmt };
