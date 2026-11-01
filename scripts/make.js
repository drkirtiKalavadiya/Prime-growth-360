#!/usr/bin/env node
/*
 * One script → one finished reel.
 *
 *   node scripts/make.js scripts/my-script.txt [--name slug] [--seed n] [--draft] [--no-render]
 *   node scripts/make.js reels/existing.json            (skip directing, just check → fix → render)
 *
 *   1 analyse + direct      scripts/direct.js       → reels/<slug>.json
 *   2 check                 scripts/check.js        → layout, safe zones, variety, engine errors
 *   3 auto-fix (≤ 3 passes) text position, line length, repeated camera moves
 *   4 storyboard            scripts/storyboard.js   → out/<slug>/storyboard.html
 *   5 render                scripts/render.js       → out/<slug>/<slug>.mp4
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { parseArgs, ROOT } = require('./lib');
const { direct, toLines } = require('./direct');

const MOVES = ['dolly-in', 'orbit-left', 'crane-up', 'orbit-right', 'push-tilt', 'dolly-out', 'spiral', 'pan-left', 'crane-down', 'pan-right', 'fly-over'];
const run = (script, args) => {
  const r = spawnSync(process.execPath, [path.join(__dirname, script), ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${script} failed`);
};

function autoFix(spec, issues) {
  let changed = 0;
  for (const is of issues) {
    const sc = spec.scenes[is.scene];
    if (!sc) continue;
    if (is.kind === 'layout') {
      if (sc.text === 'lower') { sc.text = 'top'; changed++; continue; }
      if (sc.text === 'impact') { sc.text = 'top'; changed++; continue; }
      const plain = sc.say.join(' ');
      const shorter = toLines(plain.replace(/\*/g, ''), 5);
      if (shorter.length > sc.say.length) { sc.say = reEmphasise(sc.say, shorter); changed++; }
    } else if (is.kind === 'long') {
      sc.say = reEmphasise(sc.say, sc.say.flatMap((l) => (l.split(/\s+/).length > 5 ? toLines(l.replace(/\*/g, ''), 5) : [l])));
      changed++;
    } else if ((is.kind === 'repeat' || is.kind === 'lookalike') && sc.world) {
      const prev = spec.scenes[is.scene - 1];
      const cur = sc.world.camera && sc.world.camera.move;
      sc.world.camera = { ...(sc.world.camera || {}), move: MOVES[(MOVES.indexOf(cur) + 3) % MOVES.length] };
      if (is.kind === 'lookalike' && prev) sc.text = prev.text === 'top' ? 'lower' : 'top';
      changed++;
    }
  }
  return changed;
}
// keep *emphasis* on the same words after re-splitting lines
function reEmphasise(oldLines, newLines) {
  const em = new Set((oldLines.join(' ').match(/\*([^*]+)\*/g) || []).flatMap((m) => m.replace(/\*/g, '').split(/\s+/)));
  return newLines.map((l) => l.split(/\s+/).map((w) => { const b = w.replace(/[.,!?।:;]+$/, ''); return em.has(b) ? `*${b}*${w.slice(b.length)}` : w; }).join(' '));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = args._[0];
  if (!input) { console.error('Usage: node scripts/make.js <script.txt | reel.json> [--name slug] [--seed n] [--draft] [--no-render]'); process.exit(1); }
  let specPath;
  if (input.endsWith('.json')) specPath = path.resolve(input);
  else {
    const spec = direct(fs.readFileSync(input, 'utf8'), { seed: args.seed || 0, name: args.name, title: args.title });
    specPath = path.join(ROOT, 'reels', `${spec.name}.json`);
    fs.writeFileSync(specPath, JSON.stringify(spec, null, 2) + '\n');
    console.log(`\n① Direction: ${spec.direction.theme} · ${spec.direction.mood} · ${spec.direction.palette} → ${path.relative(ROOT, specPath)}`);
  }
  const name = JSON.parse(fs.readFileSync(specPath, 'utf8')).name || path.basename(specPath, '.json');
  for (let pass = 1; pass <= 3; pass++) {
    console.log(`\n② Check (pass ${pass})`);
    run('check.js', [specPath]);
    const { issues } = JSON.parse(fs.readFileSync(path.join(ROOT, 'out', name, 'check.json'), 'utf8'));
    const fixable = issues.filter((i) => i.scene != null && i.kind !== 'other');
    if (!fixable.length) break;
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    const n = autoFix(spec, fixable);
    if (!n) break;
    fs.writeFileSync(specPath, JSON.stringify(spec, null, 2) + '\n');
    console.log(`③ Auto-fixed ${n} issue(s), re-checking…`);
  }
  console.log('\n④ Storyboard');
  run('storyboard.js', [specPath]);
  if (args['no-render']) return;
  console.log('\n⑤ Render');
  run('render.js', [specPath, ...(args.draft ? ['--scale', '1', '--fps', '24'] : [])]);
}

try { main(); } catch (e) { console.error(e.message); process.exit(1); }
