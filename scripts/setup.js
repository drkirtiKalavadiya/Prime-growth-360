#!/usr/bin/env node
/*
 * Step 4 — "check my setup". Verifies every tool the pipeline needs and says how to fix what's missing.
 *   node scripts/setup.js
 */
const { spawnSync } = require('child_process');

const checks = [];
const ok = (name, detail) => checks.push({ name, ok: true, detail });
const bad = (name, detail, fix, optional = false) => checks.push({ name, ok: false, detail, fix, optional });

// Node.js (animate)
const major = Number(process.versions.node.split('.')[0]);
if (major >= 18) ok('Node.js', `v${process.versions.node}`);
else bad('Node.js', `v${process.versions.node}`, 'Install Node 18+ from https://nodejs.org');

// ffmpeg (render)
const ff = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
if (ff.status === 0) ok('ffmpeg', ff.stdout.split('\n')[0].replace('ffmpeg version ', '').split(' ')[0]);
else bad('ffmpeg', 'not found', 'macOS: `brew install ffmpeg` · Ubuntu: `sudo apt install ffmpeg` · Windows: `winget install ffmpeg`');

// Playwright + Chromium (frame capture)
async function browserCheck() {
  let pw;
  try { pw = require('playwright'); } catch {
    bad('Playwright', 'not installed', 'Run `npm install`');
    return;
  }
  try {
    const b = await require('./lib').launchBrowser();
    const p = await b.newPage();
    const gl = await p.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
    ok('Chromium', b.version());
    if (gl) ok('WebGL 2', 'available (3D worlds)'); else bad('WebGL 2', 'unavailable', 'Update Chrome/GPU drivers; 3D scenes need WebGL 2');
    await b.close();
  } catch (e) {
    bad('Chromium', 'cannot launch', 'Run `npx playwright install chromium`');
  }
  try { require.resolve('three'); ok('three.js', require('three/package.json').version); } catch { bad('three.js', 'not installed', 'Run `npm install`'); }
}

(async () => {
  await browserCheck();
  // Voice key (optional — reels render silent without it)
  if (process.env.ELEVENLABS_API_KEY) ok('Voice key', 'ELEVENLABS_API_KEY set');
  else bad('Voice key', 'ELEVENLABS_API_KEY not set', 'Create a key at https://elevenlabs.io → Profile → API keys, then `export ELEVENLABS_API_KEY=...`', true);

  console.log('\nChecking your setup\n');
  for (const c of checks) {
    const mark = c.ok ? '✓' : c.optional ? '○' : '✗';
    console.log(`  ${mark} ${c.name.padEnd(11)} ${c.detail}`);
    if (!c.ok) console.log(`      → ${c.fix}`);
  }
  const blocking = checks.filter((c) => !c.ok && !c.optional);
  console.log(blocking.length ? `\n${blocking.length} thing(s) to fix before rendering.\n` : '\nReady to make reels.\n');
  process.exit(blocking.length ? 1 : 0);
})();
