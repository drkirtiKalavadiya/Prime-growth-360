#!/usr/bin/env node
/*
 * Motion + layout check — the reel reviews itself before you post it.
 *
 *   node scripts/check.js reels/claude-code-6-steps.json
 *
 * - every caption line is shown fully revealed and audited for overflow/overlap
 * - frames are sampled every 0.5s to catch "dead air" (nothing moves for too long)
 * - writes out/<name>/contact.jpg — a contact sheet of every caption beat to eyeball
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { parseArgs, timelineFor, openEngine, fmt } = require('./lib');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { outDir, tl } = timelineFor(args._[0], { noVoice: args['no-voice'] });
  const problems = [];
  const warn = (t, msg) => problems.push(`${fmt(t).padStart(6)}  ${msg}`);

  if (tl.duration > 90) warn(tl.duration, `reel is ${tl.duration.toFixed(0)}s — Reels over 90s lose reach`);
  if (tl.duration < 7) warn(0, 'reel is under 7s');

  const { browser, page } = await openEngine({ scale: 1 });
  const sheetDir = path.join(outDir, 'contact');
  fs.rmSync(sheetDir, { recursive: true, force: true });
  fs.mkdirSync(sheetDir, { recursive: true });
  try {
    await page.evaluate((t) => window.Reel.init(t), tl);

    // 1) layout audit at the end of every caption line
    let shot = 0;
    for (const s of tl.scenes) {
      if (!s.visuals.length && !s.label) warn(s.start, `scene ${s.index + 1} has no visual — just text on paper`);
      const beats = s.lines.length ? s.lines.map((L) => s.start + L.end - 0.02) : [s.start + s.duration / 2];
      for (const t of beats) {
        await page.evaluate((x) => window.Reel.seek(x), t);
        const issues = await page.evaluate(() => window.Reel.audit());
        issues.forEach((i) => warn(t, `scene ${s.index + 1}: ${i}`));
        await page.screenshot({ path: path.join(sheetDir, `${String(shot++).padStart(3, '0')}.jpg`), type: 'jpeg', quality: 70 });
      }
      if (s.duration > 9) warn(s.start, `scene ${s.index + 1} runs ${s.duration.toFixed(1)}s — consider splitting it`);
    }

    // 2) dead-air detection: identical frames for > 2s
    let last = null, still = 0, stillStart = 0;
    for (let t = 0; t < tl.duration; t += 0.5) {
      await page.evaluate((x) => window.Reel.seek(x), t);
      const buf = await page.screenshot({ type: 'jpeg', quality: 40 });
      if (last && buf.equals(last)) {
        if (!still) stillStart = t - 0.5;
        still += 0.5;
      } else {
        if (still > 2) warn(stillStart, `nothing moves for ${still.toFixed(1)}s`);
        still = 0;
      }
      last = buf;
    }
    if (still > 2) warn(stillStart, `nothing moves for ${still.toFixed(1)}s`);

    // 3) contact sheet
    const cols = 6;
    const rows = Math.ceil(shot / cols);
    const sheet = path.join(outDir, 'contact.jpg');
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', path.join(sheetDir, '%03d.jpg'),
      '-vf', `scale=270:-1,tile=${cols}x${rows}:padding=6:color=0x222222`, '-frames:v', '1', '-q:v', '3', sheet]);
    console.log(`Contact sheet: ${path.relative(process.cwd(), sheet)} (${shot} beats)`);
  } finally {
    await browser.close();
  }

  console.log(`\nMotion check — "${tl.title}" · ${tl.scenes.length} scenes · ${fmt(tl.duration)}`);
  if (!problems.length) console.log('  ✓ no layout overflow, no dead air, captions fit\n');
  else { problems.forEach((p) => console.log('  ! ' + p)); console.log(''); }
  process.exit(problems.length && args.strict ? 1 : 0);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
