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
  const issues = []; // structured, for automatic fixing (scripts/make.js)
  const warn = (t, msg, scene = null, kind = 'other') => { problems.push(`${fmt(t).padStart(6)}  ${msg}`); issues.push({ t, msg, scene, kind }); };

  if (tl.duration > 90) warn(tl.duration, `reel is ${tl.duration.toFixed(0)}s — Reels over 90s lose reach`);
  if (tl.duration < 7) warn(0, 'reel is under 7s');

  const { browser, page } = await openEngine({ scale: 1, glScale: 1 });
  const sheetDir = path.join(outDir, 'contact');
  fs.rmSync(sheetDir, { recursive: true, force: true });
  fs.mkdirSync(sheetDir, { recursive: true });
  try {
    await page.evaluate((t) => window.Reel.init(t), tl);
    if (page.errors.length) page.errors.forEach((e) => warn(0, `engine error: ${e}`));

    // 0) creative variety: no repeated composition back to back, enough different worlds
    const worlds = tl.scenes.filter((s) => s.world);
    tl.scenes.forEach((s, i) => {
      const p = tl.scenes[i - 1];
      if (!s.world || !p || !p.world) return;
      if (s.world.env === p.world.env && (s.world.camera || {}).move === (p.world.camera || {}).move) warn(s.start, `scene ${i + 1} repeats scene ${i}'s world AND camera move — change one`, i, 'repeat');
      if (s.world.env === p.world.env && s.textStyle === p.textStyle && JSON.stringify(s.world.props) === JSON.stringify(p.world.props)) warn(s.start, `scene ${i + 1} looks like scene ${i} — vary text position or props`, i, 'lookalike');
    });
    const envs = new Set(worlds.map((s) => s.world.env + (s.world.props && s.world.props.hero ? ':' + s.world.props.hero : '')));
    if (worlds.length >= 6 && envs.size < 3) warn(0, `only ${envs.size} distinct 3D worlds across ${worlds.length} scenes`);

    // 1) layout audit at the end of every caption line
    let shot = 0;
    for (const s of tl.scenes) {
      if (!s.visuals.length && !s.label && !s.world) warn(s.start, `scene ${s.index + 1} has no visual — just text on paper`);
      const beats = s.lines.length ? s.lines.map((L) => s.start + L.end - 0.02) : [s.start + s.duration / 2];
      for (const t of beats) {
        await page.evaluate((x) => window.Reel.seek(x), t);
        const found = await page.evaluate(() => window.Reel.audit());
        found.forEach((i) => warn(t, `scene ${s.index + 1}: ${i}`, s.index, /UI band|rail|spills/.test(i) ? 'layout' : /caption wraps/.test(i) ? 'long' : 'other'));
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

  fs.writeFileSync(path.join(outDir, 'check.json'), JSON.stringify({ duration: tl.duration, issues }, null, 2));
  console.log(`\nMotion check — "${tl.title}" · ${tl.scenes.length} scenes · ${fmt(tl.duration)}`);
  if (!problems.length) console.log('  ✓ no layout overflow, no dead air, captions fit\n');
  else { problems.forEach((p) => console.log('  ! ' + p)); console.log(''); }
  process.exit(problems.length && args.strict ? 1 : 0);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
