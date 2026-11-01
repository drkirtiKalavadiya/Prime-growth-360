#!/usr/bin/env node
/*
 * Render a reel spec to a 1080×1920 MP4.
 *
 *   node scripts/render.js reels/claude-code-6-steps.json
 *     --fps 30          frame rate (default from spec, else 30)
 *     --scale 2         device pixel ratio; 2 = 1080×1920, 1 = fast 540×960 draft
 *     --from 0 --to 10  render only part of the timeline (seconds)
 *     --no-voice        ignore out/<name>/voice even if it exists (captions-only reel)
 *     --no-music        no background music      (spec: "music": false)
 *     --no-sfx          no pop/whoosh effects     (spec: "sfx": false)
 *     --silent          no audio at all
 *     --preview         only write out/<name>/preview.html (scrubbable, no video)
 *
 * Each frame is page.seek(t) + screenshot, piped straight into ffmpeg.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { parseArgs, timelineFor, openEngine, fmt, ROOT } = require('./lib');
const { buildSoundtrack } = require('./soundtrack');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { reel, name, outDir, tl } = timelineFor(args._[0], { fps: args.fps, noVoice: args['no-voice'] });

  const voiceTrack = tl.audio.length ? mixVoice(tl, outDir) : null;
  const silent = !!args.silent;
  const music = !silent && !args['no-music'] && reel.music !== false;
  const sfx = !silent && !args['no-sfx'] && reel.sfx !== false;
  const audioTrack = silent ? null : buildSoundtrack(tl, outDir, { voiceTrack, music, sfx });
  writePreview(outDir, tl, audioTrack);
  if (args.preview) {
    console.log(`Preview: ${path.relative(ROOT, path.join(outDir, 'preview.html'))}`);
    return;
  }

  const scale = Number(args.scale || 2);
  const fps = tl.fps;
  const from = Number(args.from || 0);
  const to = Math.min(tl.duration, Number(args.to || tl.duration));
  const frames = Math.max(1, Math.round((to - from) * fps));
  const out = path.resolve(args.out || path.join(outDir, `${name}.mp4`));

  console.log(`Rendering "${tl.title}" — ${tl.scenes.length} scenes, ${fmt(to - from)}, ${frames} frames @ ${fps}fps, ${540 * scale}×${960 * scale}`);
  const parts = [voiceTrack && `voiceover (${tl.audio.length} lines)`, music && 'music', sfx && 'sfx'].filter(Boolean);
  console.log(`Audio: ${parts.length ? parts.join(' + ') : 'silent'}${voiceTrack ? '' : ' — no voice, captions carry the story'}`);

  const ff = ffmpegArgs({ fps, out, audioTrack, from, duration: to - from });
  const proc = spawn('ffmpeg', ff, { stdio: ['pipe', 'ignore', 'pipe'] });
  let ffErr = '';
  proc.stderr.on('data', (d) => { ffErr += d; if (ffErr.length > 20000) ffErr = ffErr.slice(-10000); });
  const done = new Promise((res, rej) => proc.on('close', (code) => (code === 0 ? res() : rej(new Error('ffmpeg failed:\n' + ffErr.slice(-3000))))));

  const { browser, page } = await openEngine({ scale });
  try {
    await page.evaluate((t) => window.Reel.init(t), tl);
    const started = Date.now();
    for (let i = 0; i < frames; i++) {
      const t = from + i / fps;
      await page.evaluate((x) => window.Reel.seek(x), t);
      const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!proc.stdin.write(buf)) await new Promise((r) => proc.stdin.once('drain', r));
      if (i % fps === 0 || i === frames - 1) {
        const pct = ((i + 1) / frames) * 100;
        const eta = ((Date.now() - started) / (i + 1)) * (frames - i - 1) / 1000;
        process.stdout.write(`\r  frame ${i + 1}/${frames} (${pct.toFixed(0)}%) — eta ${eta.toFixed(0)}s   `);
      }
    }
    process.stdout.write('\n');
  } finally {
    proc.stdin.end();
    await browser.close();
  }
  await done;
  console.log(`Done → ${path.relative(process.cwd(), out)}`);
}

function ffmpegArgs({ fps, out, audioTrack, from, duration }) {
  const a = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-'];
  if (audioTrack) a.push('-ss', String(from), '-i', audioTrack);
  else a.push('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo');
  a.push(
    '-map', '0:v', '-map', '1:a',
    '-vf', 'scale=1080:1920:flags=lanczos,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '192k',
    '-t', duration.toFixed(3),
    '-movflags', '+faststart',
    out,
  );
  return a;
}

/* Place every voice line at its timeline position and mix to one track. */
function mixVoice(tl, outDir) {
  const out = path.join(outDir, 'voice', 'voiceover.m4a');
  const inputs = [];
  const filters = [];
  tl.audio.forEach((a, i) => {
    inputs.push('-i', a.file);
    const ms = Math.round(a.at * 1000);
    filters.push(`[${i}:a]aresample=44100,adelay=${ms}|${ms}[a${i}]`);
  });
  const mix = tl.audio.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${tl.audio.length}:normalize=0,apad=whole_dur=${tl.duration.toFixed(3)}[out]`;
  const res = require('child_process').spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', [...filters, mix].join(';'), '-map', '[out]', '-ac', '2', '-c:a', 'aac', '-b:a', '192k', out]);
  if (res.status !== 0) throw new Error('Voice mix failed:\n' + res.stderr);
  return out;
}

/* Self-contained scrubbable preview: engine + timeline + (optional) audio, in one HTML file. */
function writePreview(outDir, tl, audioTrack) {
  const eng = path.join(ROOT, 'engine');
  let html = fs.readFileSync(path.join(eng, 'reel.html'), 'utf8');
  const css = fs.readFileSync(path.join(eng, 'reel.css'), 'utf8');
  const tlJs = fs.readFileSync(path.join(eng, 'timeline.js'), 'utf8');
  const js = fs.readFileSync(path.join(eng, 'reel.js'), 'utf8');
  const audioRef = audioTrack ? path.relative(outDir, audioTrack).split(path.sep).join('/') : null;
  const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
  html = html
    .replace('<link rel="stylesheet" href="reel.css">', () => `<style>${css}</style>`)
    .replace('<script src="timeline.js"></script>', () => `<script>${safe(tlJs)}</script>`)
    .replace('<script src="reel.js"></script>', () => `<script>window.__TIMELINE__=${safe(JSON.stringify(tl))};window.__AUDIO__=${JSON.stringify(audioRef)};</script><script>${safe(js)}</script>`);
  fs.writeFileSync(path.join(outDir, 'preview.html'), html);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
