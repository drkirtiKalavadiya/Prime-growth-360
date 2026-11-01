/*
 * Soundtrack — makes a reel work without a voiceover.
 *
 * Everything is synthesised by ffmpeg (no downloads, no API keys, no licensing):
 *   music  a soft 100 bpm bed: kick + warm pad + plucked arpeggio, Am–F–C–G
 *   sfx    a "pop" on every scene cut, a "whoosh" into every halftone transition
 *
 * Mixed with the voiceover when one exists (music ducks to a low level under it).
 */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');


function ff(args, what) {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${what} failed:\n${r.stderr}`);
}

function musicBed(file, duration, music = {}) {
  // tempo + key come from the creative direction, so each reel gets its own groove
  const BEAT = 60 / (music.bpm || 100);
  const K = music.key || 1;
  const bar = BEAT * 8;
  const c = `floor(mod(t/${bar},4))`;
  const root = `${K}*if(eq(${c},0),220,if(eq(${c},1),174.61,if(eq(${c},2),261.63,196)))`;
  const third = `if(eq(${c},0),1.189,1.26)`;
  const kick = `0.55*sin(2*PI*(48+90*exp(-28*mod(t,${BEAT})))*mod(t,${BEAT}))*exp(-7*mod(t,${BEAT}))`;
  const pad = `0.045*(sin(2*PI*${root}*t)+sin(2*PI*${root}*${third}*t)+sin(2*PI*${root}*1.5*t)+0.5*sin(2*PI*${root}*0.5*t))*(0.75+0.25*sin(2*PI*0.25*t))`;
  const k = `mod(floor(t/${BEAT / 2}),4)`;
  const step = `if(eq(${k},0),1,if(eq(${k},1),${third},if(eq(${k},2),1.5,2)))`;
  const pluck = `0.06*sin(2*PI*${root}*2*${step}*t)*exp(-10*mod(t,${BEAT / 2}))`;
  const expr = `${kick}+${pad}+${pluck}`;
  ff([
    '-f', 'lavfi', '-i', `aevalsrc=exprs='${expr}|${expr}':s=44100:d=${duration.toFixed(3)}`,
    '-af', `lowpass=f=5200,aecho=0.8:0.5:${Math.round(BEAT * 750)}:0.18,afade=t=in:d=1.2,afade=t=out:st=${Math.max(0, duration - 1.8).toFixed(3)}:d=1.8`,
    '-c:a', 'pcm_s16le', file,
  ], 'Music');
}

function sfxClips(dir) {
  const clips = {
    pop: ['-f', 'lavfi', '-i', `aevalsrc=exprs='0.6*sin(2*PI*(1100-700*t/0.14)*t)*exp(-28*t)':s=44100:d=0.16`],
    whoosh: ['-f', 'lavfi', '-i', 'anoisesrc=color=pink:amplitude=0.5:d=0.5:r=44100', '-af', 'bandpass=f=1400:w=1800,afade=t=in:d=0.3:curve=qsin,afade=t=out:st=0.3:d=0.2,volume=0.9'],
    click: ['-f', 'lavfi', '-i', `aevalsrc=exprs='0.7*sin(2*PI*2400*t)*exp(-90*t)+0.3*sin(2*PI*900*t)*exp(-60*t)':s=44100:d=0.06`],
    tick: ['-f', 'lavfi', '-i', `aevalsrc=exprs='0.45*sin(2*PI*(1800-600*t/0.08)*t)*exp(-45*t)':s=44100:d=0.09`],
    ding: ['-f', 'lavfi', '-i', `aevalsrc=exprs='0.35*(sin(2*PI*1320*t)+0.5*sin(2*PI*1980*t))*exp(-6*t)':s=44100:d=0.7`],
    riser: ['-f', 'lavfi', '-i', 'anoisesrc=color=white:amplitude=0.35:d=0.8:r=44100', '-af', 'highpass=f=900,afade=t=in:d=0.75:curve=exp,afade=t=out:st=0.75:d=0.05'],
  };
  const out = {};
  for (const [k, args] of Object.entries(clips)) {
    const f = path.join(dir, `${k}.wav`);
    if (!fs.existsSync(f)) ff([...args, '-ac', '2', f], `${k} sfx`);
    out[k] = f;
  }
  return out;
}

/*
 * Sound-design pass: decide where effects land.
 *   scene changes → whoosh (B-roll / transitions) or pop (plain cut)
 *   UI clicks, button taps, stickers → click / pop
 *   energetic reels → a tick on every caption line
 *   then fill any gap longer than `every` seconds so the edit never goes quiet
 */
function sfxEvents(tl, { every = 3 } = {}) {
  const ev = [];
  tl.scenes.forEach((s, i) => {
    if (i > 0) ev.push({ t: s.transition !== 'cut' || s.world ? Math.max(0, s.start - 0.25) : s.start, kind: s.transition !== 'cut' || s.world ? 'whoosh' : 'pop' });
    (s.visuals || []).forEach((v) => {
      if (v.clickAt != null) ev.push({ t: s.start + v.clickAt, kind: 'click' });
      if (v.tapAt != null) ev.push({ t: s.start + v.tapAt, kind: 'click' });
      if (v.type === 'iconx') ev.push({ t: s.start + (v.crossAt ?? (v.at || 0) + 0.7), kind: 'pop' });
    });
    (s.fx || []).forEach((f) => { if (f.type === 'sticker' || f.type === 'lowerthird') ev.push({ t: s.start + Math.max(0, f.at), kind: f.type === 'sticker' ? 'pop' : 'tick' }); if (f.type === 'confetti') ev.push({ t: s.start + f.at, kind: 'ding' }); });
    if (tl.energy) s.lines.forEach((L, k) => { if (k) ev.push({ t: s.start + L.start, kind: 'tick' }); });
  });
  ev.sort((a, b) => a.t - b.t);
  // fill gaps with ticks on caption beats
  const beats = tl.scenes.flatMap((s) => s.lines.map((L) => s.start + L.start));
  const filled = [...ev];
  let last = 0;
  for (const e of [...ev, { t: tl.duration }]) {
    while (e.t - last > every) {
      const b = beats.find((x) => x > last + 1.2 && x < e.t - 0.6) ?? last + every * 0.9;
      filled.push({ t: b, kind: 'tick' });
      last = b;
    }
    last = Math.max(last, e.t);
  }
  filled.sort((a, b) => a.t - b.t);
  // de-clutter: nothing closer than 0.35s
  return filled.filter((e, i, arr) => e.t >= 0 && e.t < tl.duration && (i === 0 || e.t - arr[i - 1].t > 0.35));
}

/**
 * @returns {string|null} path of the final mixed audio track, or null for a silent reel
 * opts.voiceTrack  narration / original speech; music is ducked under it when opts.duck is set
 */
function buildSoundtrack(tl, outDir, { voiceTrack = null, music = true, sfx = true, duck = false, voiceGain = 1 } = {}) {
  if (!voiceTrack && !music && !sfx) return null;
  const dir = path.join(outDir, 'audio');
  fs.mkdirSync(dir, { recursive: true });
  const inputs = [];
  const chains = [];
  const labels = [];
  const add = (file, filter, label) => {
    const i = inputs.length / 2;
    inputs.push('-i', file);
    const L = label || `s${i}`;
    chains.push(`[${i}:a]aresample=44100,aformat=channel_layouts=stereo,${filter}[${L}]`);
    if (!label) labels.push(`[${L}]`);
    return L;
  };

  if (voiceTrack) {
    if (duck && music) {
      add(voiceTrack, `volume=${voiceGain}`, 'vin');
      chains.push('[vin]asplit=2[vo][vsc]'); // one copy is heard, one drives the music ducking
      labels.push('[vo]');
    } else add(voiceTrack, `volume=${voiceGain}`);
  }
  if (music) {
    const bed = path.join(dir, 'music.wav');
    musicBed(bed, tl.duration, tl.music || {});
    if (voiceTrack && duck) {
      add(bed, 'volume=0.5', 'mraw');
      chains.push('[mraw][vsc]sidechaincompress=threshold=0.015:ratio=12:attack=20:release=400:makeup=1[mduck]');
      labels.push('[mduck]');
    } else add(bed, `volume=${voiceTrack ? 0.18 : 0.55}`);
  }
  let events = [];
  if (sfx) {
    const clips = sfxClips(dir);
    events = sfxEvents(tl, typeof sfx === 'object' ? sfx : {});
    const gain = { pop: 0.45, whoosh: 0.4, click: 0.5, tick: 0.3, ding: 0.35, riser: 0.35 };
    events.forEach((e) => { const ms = Math.round(e.t * 1000); add(clips[e.kind], `adelay=${ms}|${ms},volume=${(gain[e.kind] || 0.4) * (voiceTrack ? 0.7 : 1)}`); });
  }

  const out = path.join(dir, `soundtrack${voiceTrack ? '-voice' : ''}.m4a`);
  const mix = `${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest,loudnorm=I=-15:TP=-1.5:LRA=11,aresample=44100,apad=whole_dur=${tl.duration.toFixed(3)},atrim=0:${tl.duration.toFixed(3)}[out]`;
  ff([...inputs, '-filter_complex', [...chains, mix].join(';'), '-map', '[out]', '-c:a', 'aac', '-b:a', '192k', out], 'Soundtrack mix');
  fs.writeFileSync(path.join(dir, 'sfx.json'), JSON.stringify(events, null, 1));
  return out;
}

module.exports = { buildSoundtrack, sfxEvents };
