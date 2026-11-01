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

const BEAT = 0.6; // 100 bpm

function ff(args, what) {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${what} failed:\n${r.stderr}`);
}

function musicBed(file, duration) {
  const bar = BEAT * 8;
  const c = `floor(mod(t/${bar},4))`;
  const root = `if(eq(${c},0),220,if(eq(${c},1),174.61,if(eq(${c},2),261.63,196)))`;
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
  const pop = path.join(dir, 'pop.wav');
  const whoosh = path.join(dir, 'whoosh.wav');
  if (!fs.existsSync(pop)) {
    ff(['-f', 'lavfi', '-i', `aevalsrc=exprs='0.6*sin(2*PI*(1100-700*t/0.14)*t)*exp(-28*t)':s=44100:d=0.16`, '-ac', '2', pop], 'Pop sfx');
  }
  if (!fs.existsSync(whoosh)) {
    ff(['-f', 'lavfi', '-i', 'anoisesrc=color=pink:amplitude=0.5:d=0.5:r=44100',
      '-af', 'bandpass=f=1400:w=1800,afade=t=in:d=0.3:curve=qsin,afade=t=out:st=0.3:d=0.2,volume=0.9', '-ac', '2', whoosh], 'Whoosh sfx');
  }
  return { pop, whoosh };
}

/**
 * @returns {string|null} path of the final mixed audio track, or null for a silent reel
 */
function buildSoundtrack(tl, outDir, { voiceTrack = null, music = true, sfx = true } = {}) {
  if (!voiceTrack && !music && !sfx) return null;
  const dir = path.join(outDir, 'audio');
  fs.mkdirSync(dir, { recursive: true });
  const inputs = [];
  const chains = [];
  const labels = [];
  const add = (file, filter) => {
    const i = inputs.length / 2;
    inputs.push('-i', file);
    chains.push(`[${i}:a]aresample=44100,aformat=channel_layouts=stereo,${filter}[s${i}]`);
    labels.push(`[s${i}]`);
  };

  if (voiceTrack) add(voiceTrack, 'volume=1.0');
  if (music) {
    const bed = path.join(dir, 'music.wav');
    musicBed(bed, tl.duration);
    add(bed, `volume=${voiceTrack ? 0.18 : 0.55}`);
  }
  if (sfx) {
    const { pop, whoosh } = sfxClips(dir);
    tl.scenes.forEach((s, i) => {
      if (i === 0) return;
      if (s.transition === 'halftone') {
        const ms = Math.max(0, Math.round((s.start - 0.3) * 1000));
        add(whoosh, `adelay=${ms}|${ms},volume=${voiceTrack ? 0.25 : 0.4}`);
      } else {
        const ms = Math.round(s.start * 1000);
        add(pop, `adelay=${ms}|${ms},volume=${voiceTrack ? 0.25 : 0.45}`);
      }
    });
  }

  const out = path.join(dir, `soundtrack${voiceTrack ? '-voice' : ''}.m4a`);
  const mix = `${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest,loudnorm=I=-15:TP=-1.5:LRA=11,aresample=44100,apad=whole_dur=${tl.duration.toFixed(3)},atrim=0:${tl.duration.toFixed(3)}[out]`;
  ff([...inputs, '-filter_complex', [...chains, mix].join(';'), '-map', '[out]', '-c:a', 'aac', '-b:a', '192k', out], 'Soundtrack mix');
  return out;
}

module.exports = { buildSoundtrack };
