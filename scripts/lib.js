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

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];

/* Launch Chromium. Falls back to a system Chromium when the npm Playwright's own browser isn't downloaded. */
async function launchBrowser() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    throw new Error('Playwright is missing. Run `npm install` then `npx playwright install chromium`.');
  }
  const gpu = process.env.REEL_GPU === '1' ? [] : GL_ARGS; // REEL_GPU=1 → use the real GPU (much faster on a desktop)
  try {
    return await chromium.launch({ args: gpu });
  } catch (e) {
    const candidates = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].filter(Boolean);
    for (const p of candidates) if (fs.existsSync(p)) return chromium.launch({ executablePath: p, args: gpu });
    throw new Error(e.message.split('\n')[0] + '\n→ run `npx playwright install chromium` (or set CHROMIUM_PATH)');
  }
}

/*
 * Open the engine page. Files are served from a virtual http origin (not file://) so ES modules
 * and the three.js import map work exactly as they would on a web server.
 */
async function openEngine({ scale = 2, glScale = 1.5 } = {}) {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: scale });
  await page.addInitScript((g) => { window.__RENDER__ = true; window.__GL_SCALE__ = g; }, glScale);
  await page.route('http://reel.local/**', (route) => {
    const rel = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
    route.fulfill({ path: file, contentType: MIME[path.extname(file)] || 'application/octet-stream' });
  });
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.error('[page error]', e.message); });
  page.errors = errors;
  await page.goto('http://reel.local/engine/reel.html');
  return { browser, page };
}

function fmt(sec) {
  const m = Math.floor(sec / 60);
  return `${m}:${(sec % 60).toFixed(1).padStart(4, '0')}`;
}

module.exports = { ROOT, ENGINE, parseArgs, loadReel, timelineFor, openEngine, launchBrowser, fmt };
