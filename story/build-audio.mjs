#!/usr/bin/env node
/**
 * Builds the reel soundtrack: original background music + sound effects, synthesised
 * from code (royalty-free), timed from timeline.js, then mixed under the voice-over
 * with automatic ducking and loudness-normalised for Instagram (-14 LUFS).
 *
 *   node story/build-audio.mjs        ->  story/audio/mix.mp3 (+ music.wav, sfx.wav)
 *
 * Needs Node 18+ and ffmpeg on PATH.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const TL = require('./timeline.js');

const SR = 44100;
const N = Math.ceil((TL.TOTAL + 2) * SR);
const bus = () => [new Float32Array(N), new Float32Array(N)];
const MUSIC = bus(), SFX = bus();
const TAU = Math.PI * 2;

let seed = 20261115;
const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const noise = () => rand() * 2 - 1;

/** Biquad filter whose cutoff can move while running. */
function filt(type, freq, q = .707) {
  let b0, b1, b2, a1, a2, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const set = (f) => {
    const w = TAU * Math.min(f, SR * .45) / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q), a0 = 1 + a;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
    else { b0 = a; b1 = 0; b2 = -a; }
    b0 /= a0; b1 /= a0; b2 /= a0; a1 = -2 * c / a0; a2 = (1 - a) / a0;
  };
  set(freq);
  const run = (x) => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  return { run, set };
}

/** Mix a generator into a bus. gen(t) returns a mono sample or [l, r]. */
function put(b, t0, len, gen, gain = 1, pan = 0) {
  const s0 = Math.round(t0 * SR), n = Math.round(len * SR);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) {
    const k = s0 + i;
    if (k < 0 || k >= N) continue;
    const v = gen(i / SR);
    if (typeof v === 'number') { b[0][k] += v * gl; b[1][k] += v * gr; }
    else { b[0][k] += v[0] * gain; b[1][k] += v[1] * gain; }
  }
}
const expd = (t, d) => Math.exp(-t / d);
const bell = (t, len) => Math.sin(Math.PI * Math.min(1, Math.max(0, t / len))) ** 2;

// ---------------------------------------------------------------- sound effects
const FX = {
  whoosh: () => { const f = filt('bp', 400, 1.2); return [.55, (t) => { f.set(300 + 2400 * Math.sin(Math.PI * t / .55)); return f.run(noise()) * bell(t, .55) * 1.6; }]; },
  crickets: () => [8.9, (t) => {
    const g1 = (t * 1.4) % 1 < .12 && Math.sin(TAU * 28 * t) > 0 ? 1 : 0;
    const g2 = ((t + .4) * 1.1) % 1 < .1 && Math.sin(TAU * 31 * t) > 0 ? 1 : 0;
    return (.05 * g1 * Math.sin(TAU * 4600 * t) + .035 * g2 * Math.sin(TAU * 5300 * t)) * Math.min(1, t * 2, (8.9 - t) * 2);
  }],
  engine: () => {
    const lp = filt('lp', 420), nf = filt('lp', 180);
    let ph = 0;
    return [4.7, (t) => {
      const fr = 40 * (1 + .07 * Math.tanh((2.2 - t) * 2));
      ph += fr / SR;
      let v = 0; for (let h = 1; h <= 8; h++) v += Math.sin(TAU * ph * h) / h;
      v *= .6 + .4 * Math.sin(TAU * ph * .5);
      const amp = .25 + 1 / (1 + ((t - 2.2) / .9) ** 2);
      const s = (lp.run(v) * .5 + nf.run(noise()) * .6) * amp * Math.min(1, t * 3, (4.7 - t) * 3);
      const p = Math.max(-1, Math.min(1, (t - 2.2) / 1.6));
      return [s * Math.cos((p + 1) * Math.PI / 4), s * Math.sin((p + 1) * Math.PI / 4)];
    }];
  },
  engineAway: () => {
    const lp = filt('lp', 380), nf = filt('lp', 160); let ph = 0;
    return [6, (t) => { ph += 36 * (1 - .05 * t / 6) / SR; let v = 0; for (let h = 1; h <= 7; h++) v += Math.sin(TAU * ph * h) / h; return (lp.run(v) * .5 + nf.run(noise()) * .5) * expd(t, 1.8) * Math.min(1, t * 4); }];
  },
  whistle: () => {
    const tune = [[0, 784], [.38, 880], [.76, 988], [1.14, 880], [1.52, 784], [2.1, 659], [2.48, 784], [2.86, 988], [3.24, 784]];
    let ph = 0;
    return [3.8, (t) => {
      let cur = tune[0];
      for (const n of tune) if (t >= n[0]) cur = n;
      const local = t - cur[0], fr = cur[1] * (1 + .015 * Math.sin(TAU * 5.5 * t));
      ph += fr / SR;
      return (Math.sin(TAU * ph) * .6 + noise() * .03) * Math.min(1, local / .03) * (local < .34 ? 1 : expd(local - .34, .05));
    }];
  },
  thud: () => { const nf = filt('lp', 320); let ph = 0; return [.6, (t) => { ph += (38 + 40 * expd(t, .04)) / SR; return Math.sin(TAU * ph) * expd(t, .13) * 1.2 + nf.run(noise()) * expd(t, .05) * 1.5; }]; },
  grains: () => {
    const f = filt('bp', 3600, 6), hiss = filt('hp', 2500);
    return [2.2, (t) => { const dens = 900 * expd(t, .5) + 40; const imp = rand() < dens / SR ? noise() * 8 : 0; return f.run(imp) + hiss.run(noise()) * .05 * expd(t, .5); }];
  },
  chirp: () => [.4, (t) => {
    let v = 0;
    for (const o of [0, .1, .2]) { const l = t - o; if (l >= 0 && l < .06) v += Math.sin(TAU * (3800 * l + 12000 * l * l)) * Math.sin(Math.PI * l / .06); }
    return v * .7;
  }],
  caw: () => { const f = filt('bp', 1300, 2.5); let ph = 0; return [.5, (t) => { ph += (540 - 140 * t) / SR; let v = 0; for (let h = 1; h <= 12; h++) v += Math.sin(TAU * ph * h) / h; return f.run(v) * (1 + .6 * Math.sin(TAU * 34 * t)) * Math.min(1, t / .02) * (t < .25 ? 1 : expd(t - .25, .07)) * 2.2; }]; },
  coo: () => { let ph = 0; return [.95, (t) => {
    const a = t < .26 ? bell(t, .26) : t > .32 ? bell(t - .32, .58) : 0;
    const fr = t < .3 ? 340 : 310 - 60 * (t - .32) + 8 * Math.sin(TAU * 8 * t);
    ph += fr / SR; return (Math.sin(TAU * ph) + .25 * Math.sin(TAU * 2 * ph)) * a * .7;
  }]; },
  flap: () => { const f = filt('lp', 1400); return [.8, (t) => { const ph = (t * 11) % 1; return f.run(noise()) * expd(ph, .03) * expd(t, .45) * 2.4; }]; },
  step: () => { const f = filt('lp', 600), g = filt('bp', 2200, 1.5); let ph = 0; return [.22, (t) => { ph += 80 / SR; return f.run(noise()) * expd(t, .03) * 1.6 + Math.sin(TAU * ph) * expd(t, .05) * .6 + g.run(noise()) * expd(t, .02) * .4; }]; },
  rustle: () => { const f = filt('bp', 2000, .8), m = filt('lp', 18); return [.8, (t) => f.run(noise()) * Math.min(1, Math.abs(m.run(noise())) * 25) * bell(t, .8) * 1.2]; },
  ding: () => [2.2, (t) => [1, 2, 3.01, 4.2].reduce((v, p, i) => v + Math.sin(TAU * 988 * p * t) * expd(t, .9 / (i + 1)) / (i + 1), 0) * .4],
  chime: () => [3, (t) => { let v = 0; for (const [o, fr] of [[0, 659.25], [.28, 987.77], [.56, 1318.5]]) { const l = t - o; if (l > 0) v += [1, 2.76, 5.4].reduce((s, p, i) => s + Math.sin(TAU * fr * p * l) * expd(l, 1.2 / (i + 1)) / (i + 1.5), 0); } return v * .35; }],
  tick: () => { const f = filt('bp', 2600, 4); return [.06, (t) => f.run(t < .002 ? noise() * 6 : 0) + Math.sin(TAU * 1800 * t) * expd(t, .008) * .3]; },
  page: () => { const f = filt('bp', 1500, 1.2); return [.28, (t) => { f.set(1500 + 3000 * t / .28); return f.run(noise()) * bell(t, .28) * 1.3; }]; },
  swell: () => { const f = filt('lp', 300); return [2.2, (t) => (Math.sin(TAU * 110 * t) * .5 + Math.sin(TAU * 164.8 * t) * .3 + f.run(noise()) * .5) * Math.min(1, t / 1.6) * (t > 1.9 ? expd(t - 1.9, .08) : 1) * .6]; },
  clink: () => { const fr = 2200 + rand() * 1100; return [.35, (t) => [1, 1.47, 2.09, 2.76].reduce((v, p, i) => v + Math.sin(TAU * fr * p * t) * expd(t, .16 / (i + 1)), 0) * .35]; },
  riser: () => { const f = filt('hp', 500); let ph = 0; return [2.4, (t) => { f.set(500 + 5500 * (t / 2.4) ** 2); ph += (200 + 900 * t / 2.4) / SR; return (f.run(noise()) * .7 + Math.sin(TAU * ph) * .25) * (t / 2.4) ** 2; }]; },
  boom: () => { const f = filt('lp', 150); return [2.6, (t) => Math.sin(TAU * 46 * t) * expd(t, .7) + Math.sin(TAU * 92 * t) * expd(t, .3) * .3 + f.run(noise()) * expd(t, .25) * 1.2]; },
  impact: () => { const f = filt('lp', 140), h = filt('hp', 2500); return [3, (t) => Math.sin(TAU * (44 + 30 * expd(t, .05)) * t) * expd(t, .8) + f.run(noise()) * expd(t, .3) + h.run(noise()) * expd(t, .5) * .35]; },
  heart: () => { const f = filt('lp', 140); return [.55, (t) => { const lub = t < .16 ? Math.sin(TAU * 54 * t) * expd(t, .05) : 0; const l2 = t - .24; const dub = l2 > 0 && l2 < .14 ? Math.sin(TAU * 47 * l2) * expd(l2, .045) * .8 : 0; return f.run(lub + dub) * 2.2; }]; },
  sparkle: () => [1.3, (t) => { let v = 0; for (let i = 0; i < 6; i++) { const l = t - i * .08; if (l > 0) v += Math.sin(TAU * (1800 + i * 450) * l) * expd(l, .22); } return v * .22; }],
  creak: () => { const f = filt('bp', 900, 4), g = filt('bp', 2400, 5); let ph = 0; return [2.4, (t) => { ph += (90 + 50 * Math.sin(TAU * .7 * t) + 15 * noise()) / SR; const pulse = (ph % 1) < .08 ? 1 : 0; return (f.run(pulse) * 3 + g.run(pulse) * 1.5) * bell(t, 2.4); }]; },
  birds: () => {
    const calls = []; for (let k = 0; k < 18; k++) calls.push([rand() * 5.5, 2800 + rand() * 3200, rand() * 1.6 - .8, .4 + rand() * .6]);
    return [6, (t) => {
      let l = 0, r = 0;
      for (const [o, fr, p, g] of calls) {
        const x = t - o;
        if (x > 0 && x < .22) {
          const v = Math.sin(TAU * fr * x * (1 + 1.5 * x)) * Math.sin(Math.PI * ((x * 14) % 1)) * bell(x, .22) * g * .25;
          l += v * Math.cos((p + 1) * Math.PI / 4); r += v * Math.sin((p + 1) * Math.PI / 4);
        }
      }
      return [l, r];
    }];
  },
  key: () => { const f = filt('bp', 3800 + rand() * 1500, 3); const g = .6 + rand() * .6; return [.05, (t) => f.run(t < .0015 ? noise() * 8 * g : 0)]; },
  pop: () => { let ph = 0; return [.25, (t) => { ph += (500 + 900 * Math.min(1, t / .06)) / SR; return Math.sin(TAU * ph) * expd(t, .07) * .8; }]; },
};

for (const [t, type, gain, pan] of TL.SFX) {
  const [len, gen] = FX[type]();
  put(SFX, t, len, gen, gain, pan);
}

// ---------------------------------------------------------------- music
const CHORDS = {
  Am: { bass: 55, notes: [220, 261.63, 329.63, 440] },
  F: { bass: 43.65, notes: [174.61, 220, 261.63, 349.23] },
  C: { bass: 65.41, notes: [196, 261.63, 329.63, 392] },
  G: { bass: 49, notes: [196, 246.94, 293.66, 392] },
  Dm: { bass: 73.42, notes: [174.61, 220, 293.66, 349.23] },
  E: { bass: 41.2, notes: [164.81, 207.65, 246.94, 329.63] },
};

function pad(t0, len, freqs, gain, bright) {
  const f = filt('lp', bright);
  const g = filt('lp', bright);
  const phs = freqs.map(() => [rand(), rand()]);
  put(MUSIC, t0, len + 1, (t) => {
    let l = 0, r = 0;
    freqs.forEach((fr, i) => {
      for (let h = 1; h <= 5; h++) {
        l += Math.sin(TAU * (fr * .9975 * h * t + phs[i][0])) / h ** 1.6;
        r += Math.sin(TAU * (fr * 1.0025 * h * t + phs[i][1])) / h ** 1.6;
      }
    });
    const e = Math.min(1, t / .7) * (t > len ? expd(t - len, .35) : 1);
    return [f.run(l) * e, g.run(r) * e];
  }, gain / freqs.length);
}
function pluck(t0, fr, gain, pan = 0, decay = 1) {
  put(MUSIC, t0, 1.8 * decay, (t) => {
    let v = 0;
    for (let n = 1; n <= 6; n++) v += Math.sin(TAU * fr * n * t * (1 + .0004 * n * n)) * expd(t, decay / (1 + n * .9)) / n;
    return v * Math.min(1, t / .004);
  }, gain, pan);
}
function bassNote(t0, fr, len, gain) {
  put(MUSIC, t0, len + .2, (t) => (Math.sin(TAU * fr * t) + .3 * Math.sin(TAU * fr * 2 * t)) * Math.min(1, t / .01) * (t > len ? expd(t - len, .05) : 1) * expd(t, len * 1.5), gain);
}
const kick = (t0, g) => { let ph = 0; put(MUSIC, t0, .35, (t) => { ph += (45 + 90 * expd(t, .035)) / SR; return Math.sin(TAU * ph) * expd(t, .16); }, g); };
const snare = (t0, g) => { const f = filt('hp', 1200); put(MUSIC, t0, .25, (t) => f.run(noise()) * expd(t, .07) + Math.sin(TAU * 185 * t) * expd(t, .04) * .5, g); };
const hat = (t0, g, open = false) => { const f = filt('hp', 7000); put(MUSIC, t0, open ? .3 : .06, (t) => f.run(noise()) * expd(t, open ? .09 : .018), g, .2); };

for (const sec of TL.MUSIC) {
  const beat = 60 / sec.bpm, bar = beat * 4, L = sec.level;
  for (let b = 0, t0 = sec.from; t0 < sec.to - .05; b++, t0 += bar) {
    const ch = CHORDS[sec.chords[b % sec.chords.length]];
    const barLen = Math.min(bar, sec.to - t0);
    const bright = { calm: 900, tense: 650, sparse: 600, hope: 1400, uplift: 1800, promo: 2200 }[sec.style];
    pad(t0, barLen, ch.notes.slice(0, 3), { calm: .1, tense: .09, sparse: .06, hope: .1, uplift: .11, promo: .07 }[sec.style] * L * 2, bright);
    for (let q = 0; q < 8; q++) {
      const tq = t0 + q * beat / 2;
      if (tq >= sec.to) break;
      const n = ch.notes[q % 4];
      switch (sec.style) {
        case 'calm': if (q % 4 === 0) pluck(tq, n * 2, .09 * L, (q % 8 ? .3 : -.3), 1.4); break;
        case 'tense':
          if (q % 2 === 0) bassNote(tq, ch.bass * 2, beat * .4, .22 * L);
          if (q === 0) pluck(tq, ch.notes[3] * 2, .07 * L, .2, 1.6);
          break;
        case 'sparse': if (q === 0) pluck(tq, ch.notes[(b * 2) % 4] * 2, .1 * L, 0, 2.2); break;
        case 'hope': pluck(tq, n * 2, .06 * L, (q % 2 ? .35 : -.35), 1); if (q === 0) bassNote(tq, ch.bass * 2, bar * .9, .15 * L); break;
        case 'uplift':
          pluck(tq, n * 2, .065 * L, (q % 2 ? .35 : -.35), 1);
          if (q % 4 === 0) { bassNote(tq, ch.bass * 2, beat * 1.8, .2 * L); kick(tq, .35 * L); }
          if (q % 2 === 1) hat(tq, .06 * L);
          break;
        case 'promo':
          pluck(tq, n * 4, .05 * L, (q % 2 ? .4 : -.4), .7);
          bassNote(tq, ch.bass * 2, beat * .4, .2 * L);
          if (q % 2 === 0) kick(tq, .5 * L);
          if (q === 2 || q === 6) snare(tq, .22 * L);
          hat(tq, (q % 2 ? .1 : .05) * L, q % 2 === 1 && q % 4 === 3);
          break;
        default:
      }
    }
  }
}

// ---------------------------------------------------------------- reverb + output
function reverb(b, wet, size = 1) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => Math.round(d * size));
  for (const ch of [0, 1]) {
    const src = b[ch], out = new Float32Array(N);
    for (const [ci, d0] of combs.entries()) {
      const d = d0 + ch * 23 + ci, buf = new Float32Array(d);
      let idx = 0, lp = 0;
      for (let i = 0; i < N; i++) { const y = buf[idx]; lp = y * .7 + lp * .3; buf[idx] = src[i] + lp * .82; idx = (idx + 1) % d; out[i] += y / combs.length; }
    }
    for (const d of [556 + ch * 7, 441 + ch * 5, 341]) {
      const buf = new Float32Array(d); let idx = 0;
      for (let i = 0; i < N; i++) { const bo = buf[idx], y = -out[i] + bo; buf[idx] = out[i] + bo * .5; out[i] = y; idx = (idx + 1) % d; }
    }
    for (let i = 0; i < N; i++) src[i] += out[i] * wet;
  }
}
reverb(MUSIC, .35);
reverb(SFX, .12, .8);

function writeWav(file, b, peak) {
  let max = 1e-9;
  for (const c of b) for (let i = 0; i < N; i++) max = Math.max(max, Math.abs(c[i]));
  const g = peak / max, data = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) for (const c of [0, 1]) data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(b[c][i] * g * 32767))), (i * 2 + c) * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}
const dir = path.join(here, 'audio');
writeWav(path.join(dir, 'music.wav'), MUSIC, .9);
writeWav(path.join(dir, 'sfx.wav'), SFX, .9);

// Mix: music ducks under the voice (sidechain), then loudness-normalise for reels.
const MUSIC_DB = process.env.MUSIC_DB || '-17';
const SFX_DB = process.env.SFX_DB || '-9';
execFileSync('ffmpeg', ['-y', '-loglevel', 'error',
  '-i', path.join(dir, 'voiceover.mp3'), '-i', path.join(dir, 'music.wav'), '-i', path.join(dir, 'sfx.wav'),
  '-filter_complex',
  `[0:a]aresample=${SR},aformat=channel_layouts=stereo,asplit=2[v][key];`
  + `[1:a]volume=${MUSIC_DB}dB[m0];[m0][key]sidechaincompress=threshold=0.02:ratio=6:attack=20:release=450[m];`
  + `[2:a]volume=${SFX_DB}dB[s];`
  + '[v][m][s]amix=inputs=3:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[out]',
  '-map', '[out]', '-c:a', 'libmp3lame', '-b:a', '192k', path.join(dir, 'mix.mp3')]);
console.log('wrote story/audio/mix.mp3 (voice + music + sfx)');
