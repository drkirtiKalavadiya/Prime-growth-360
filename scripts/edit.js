#!/usr/bin/env node
/*
 * Talking-head editor: turn a raw speaking video into a pro edit.
 *
 *   node scripts/edit.js reels/<edit-spec>.json            full render → out/<name>/<name>.mp4
 *   node scripts/edit.js reels/<edit-spec>.json --stills   one composite frame per segment → out/<name>/stills.jpg
 *   options: --from 0 --to 10 · --gl-scale 1.25 · --no-music · --no-sfx
 *
 * Layers (bottom → top)
 *   1  base video     crop (e.g. remove old burned-in captions) → zoom punches per segment → colour pop
 *   2  overlay        engine page rendered with a transparent background: pop captions, stickers,
 *                     lower thirds, tracker, motion graphics, full-screen 3D/2D B-roll cutaways
 *   3  audio          original voice (cleaned) + music ducked under the voice + sound effects
 *
 * Spec: { mode: "edit", base: { video, crop: {x,y,w,h}, focusY }, captions: { style, maxWords },
 *         segments: [{ start, end, text, zoom, broll, visual, fx, mark, cover, transition }] }
 * Inside a segment, `at` values are fractions of the segment (0 = start, 1 = end).
 */
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { parseArgs, loadReel, openEngine, fmt, ROOT } = require('./lib');
const { buildTimeline } = require('../engine/timeline');
const { buildSoundtrack } = require('./soundtrack');

const W = 1080, H = 1920, PUNCH = 0.18;

function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height', '-of', 'json', file], { encoding: 'utf8' });
  const j = JSON.parse(r.stdout);
  const v = j.streams.find((s) => s.width);
  return { duration: parseFloat(j.format.duration), width: v.width, height: v.height };
}

/* zoom level of the base footage at time t: snap to the segment's zoom, then drift slowly */
function zoomPlan(tl) {
  const segs = tl.scenes.map((s, i) => ({ s: s.start, z: s.zoom || 1, zp: i ? tl.scenes[i - 1].zoom || 1 : s.zoom || 1 }));
  const at = (t) => {
    let k = 0; segs.forEach((g, i) => { if (t >= g.s) k = i; });
    const g = segs[k], u = Math.min(1, (t - g.s) / PUNCH);
    return g.zp + (g.z - g.zp) * (1 - Math.pow(1 - u, 3)) + 0.008 * (t - g.s);
  };
  // the same curve as an ffmpeg expression (cubic ease on the punch, linear drift)
  let expr = '1';
  for (let i = segs.length - 1; i >= 0; i--) {
    const g = segs[i];
    const u = `min(1,(it-${g.s.toFixed(3)})/${PUNCH})`;
    const e = `${g.zp.toFixed(4)}+(${(g.z - g.zp).toFixed(4)})*(1-pow(1-${u},3))+0.008*(it-${g.s.toFixed(3)})`;
    expr = i === segs.length - 1 ? e : `if(lt(it,${segs[i + 1].s.toFixed(3)}),${e},${expr})`;
  }
  return { at, expr: `max(1,${expr})` };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { reel, name, outDir } = loadReel(args._[0]);
  if (reel.mode !== 'edit') throw new Error('Not an edit spec (expected "mode": "edit")');
  const video = path.resolve(ROOT, reel.base.video);
  if (!fs.existsSync(video)) throw new Error(`Base video not found: ${video}`);
  const info = probe(video);
  reel.base.duration = info.duration;
  const tl = buildTimeline(reel);
  const crop = reel.base.crop || { x: 0, y: 0, w: info.width, h: info.height };
  const fy = reel.base.focusY ?? 0.45;
  const zoom = zoomPlan(tl);
  const glScale = Number(args['gl-scale'] || 1.25);
  console.log(`Edit "${tl.title}": ${tl.scenes.length} segments · ${fmt(tl.duration)} · base ${info.width}×${info.height} crop ${crop.w}×${crop.h}+${crop.x}+${crop.y}`);

  if (args.stills) return stills({ tl, outDir, video, crop, fy, zoom, glScale });

  // audio: original speech, cleaned, music ducked underneath, sfx on the beats
  const adir = path.join(outDir, 'audio'); fs.mkdirSync(adir, { recursive: true });
  const voice = path.join(adir, 'voice.wav');
  run(['-y', '-loglevel', 'error', '-i', video, '-vn', '-af', 'highpass=f=80,lowpass=f=12000,acompressor=threshold=-20dB:ratio=3:attack=10:release=200,loudnorm=I=-16:TP=-1.5', '-ac', '2', '-ar', '44100', voice]);
  const audio = buildSoundtrack(tl, outDir, { voiceTrack: voice, duck: true, music: !args['no-music'], sfx: !args['no-sfx'] && { every: 3 } });
  const nSfx = JSON.parse(fs.readFileSync(path.join(adir, 'sfx.json'), 'utf8')).length;
  console.log(`Audio: voice + ${args['no-music'] ? 'no music' : 'ducked music'} + ${nSfx} sound effects`);

  const fps = tl.fps, from = Number(args.from || 0), to = Math.min(tl.duration, Number(args.to || tl.duration));
  const frames = Math.round((to - from) * fps);
  const out = path.resolve(args.out || path.join(outDir, `${name}.mp4`));
  const sW = 1620, sH = Math.round(sW * 16 / 9);
  const vf = [
    `[0:v]trim=start=${from}:end=${to},setpts=PTS-STARTPTS,fps=${fps},crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},scale=${sW}:${sH}:flags=lanczos,setsar=1,`
      + `zoompan=z='${zoom.expr.replace(/it/g, `(it+${from})`)}':x='(iw-iw/zoom)/2':y='min(max(0,ih*${fy}-ih/zoom/2),ih-ih/zoom)':d=1:s=${W}x${H}:fps=${fps},`
      + `eq=contrast=1.06:saturation=1.12:gamma=0.98,unsharp=5:5:0.5[bg]`,
    `[1:v]format=rgba[ov]`,
    `[bg][ov]overlay=0:0:eof_action=pass:format=auto,format=yuv420p[v]`,
  ].join(';');
  const ffArgs = ['-y', '-loglevel', 'error', '-i', video, '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-ss', String(from), '-i', audio, '-filter_complex', vf, '-map', '[v]', '-map', '2:a',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(fps), '-c:a', 'aac', '-b:a', '192k', '-t', (to - from).toFixed(3), '-movflags', '+faststart', out];
  const proc = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = ''; proc.stderr.on('data', (d) => { err += d; });
  const done = new Promise((res, rej) => proc.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg failed:\n' + err.slice(-3000))))));

  const { browser, page } = await openEngine({ scale: 2, glScale });
  try {
    await page.evaluate((t) => window.Reel.init(t), tl);
    if (page.errors.length) throw new Error('Engine failed: ' + page.errors.join('\n'));
    const t0 = Date.now();
    for (let i = 0; i < frames; i++) {
      const t = from + i / fps;
      await page.evaluate((x) => window.Reel.seek(x), t);
      const buf = await page.screenshot({ type: 'png', omitBackground: true });
      if (!proc.stdin.write(buf)) await new Promise((r) => proc.stdin.once('drain', r));
      if (i % fps === 0) process.stdout.write(`\r  frame ${i + 1}/${frames} (${Math.round((i / frames) * 100)}%) eta ${Math.round(((Date.now() - t0) / (i + 1)) * (frames - i) / 1000)}s   `);
    }
    process.stdout.write('\n');
  } finally { proc.stdin.end(); await browser.close(); }
  await done;
  console.log(`Done → ${path.relative(process.cwd(), out)}`);
}

/* Quick look: one composite frame per segment (base + zoom + overlay), tiled into a contact sheet. */
async function stills({ tl, outDir, video, crop, fy, zoom, glScale }) {
  const dir = path.join(outDir, 'stills'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const { browser, page } = await openEngine({ scale: 1, glScale: Math.min(1, glScale) });
  try {
    await page.evaluate((t) => window.Reel.init(t), tl);
    let n = 0;
    for (const s of tl.scenes) {
      const t = s.start + Math.min(s.duration * 0.7, s.duration - 0.05);
      await page.evaluate((x) => window.Reel.seek(x), t);
      const ov = path.join(dir, `ov${n}.png`);
      await page.screenshot({ path: ov, omitBackground: true });
      const z = zoom.at(t), cw = crop.w / z, ch = crop.h / z;
      const cx = crop.x + (crop.w - cw) / 2, cy = crop.y + Math.min(Math.max(0, crop.h * fy - ch / 2), crop.h - ch);
      run(['-y', '-loglevel', 'error', '-ss', t.toFixed(3), '-i', video, '-i', ov, '-filter_complex',
        `[0:v]crop=${cw.toFixed(0)}:${ch.toFixed(0)}:${cx.toFixed(0)}:${cy.toFixed(0)},scale=540:960,eq=contrast=1.06:saturation=1.12[b];[b][1:v]overlay=0:0`, '-frames:v', '1', path.join(dir, `s${String(n).padStart(2, '0')}.jpg`)]);
      n++;
    }
    const cols = 6, rows = Math.ceil(n / cols);
    run(['-y', '-loglevel', 'error', '-framerate', '1', '-i', path.join(dir, 's%02d.jpg'), '-vf', `scale=270:-1,tile=${cols}x${rows}:padding=6:color=0x222222`, '-frames:v', '1', path.join(outDir, 'stills.jpg')]);
    console.log(`Stills: ${path.relative(process.cwd(), path.join(outDir, 'stills.jpg'))} (${n} segments)`);
    if (page.errors.length) console.log('engine errors:', page.errors);
  } finally { await browser.close(); }
}

function run(a) { const r = spawnSync('ffmpeg', a, { encoding: 'utf8' }); if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr.slice(-1500)); }

main().catch((e) => { console.error(e.message || e); process.exit(1); });
