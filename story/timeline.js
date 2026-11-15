/* Single source of truth for timing: used by the page (story.js) and by the
 * soundtrack builder (build-audio.mjs). All times are seconds in the voice-over.
 */
(function (root) {
  'use strict';

  const TOTAL = 129.96;

  // Scene start times + where the "camera" frames close-ups (focus, % of the 9:16 frame).
  const SCENES = [
    { id: 'truck', at: 0, focus: [45, 72], focus2: [30, 80] },
    { id: 'spill', at: 4.39, focus: [35, 70] },
    { id: 'driveoff', at: 8.80, focus: [60, 70], focus2: [20, 82] },
    { id: 'sparrow', at: 14.71, focus: [47, 78] },
    { id: 'crow', at: 19.17, focus: [49, 78] },
    { id: 'pigeon', at: 23.15, focus: [52, 78] },
    { id: 'allbirds', at: 26.26, focus: [50, 80], focus2: [22, 76] },
    { id: 'grab', at: 33.48, focus: [58, 62], focus2: [40, 80] },
    { id: 'think', at: 40.72, focus: [50, 84], focus2: [50, 30] },
    { id: 'worry', at: 47.99, focus: [53, 70], focus2: [22, 26] },
    { id: 'hoard', at: 57.87, focus: [50, 80], focus2: [30, 88] },
    { id: 'kafan', at: 68.81, focus: [50, 52], pattern: [1, 1.3, 1.12, 1.38] },
    { id: 'plan', at: 76.33, focus: [55, 60], focus2: [30, 85] },
    { id: 'journey', at: 84.89, focus: [50, 55], focus2: [80, 92] },
    { id: 'family', at: 92.43, focus: [50, 72], focus2: [88, 94] },
    { id: 'quote', at: 101.01, focus: [50, 48], pattern: [1, 1.1] },
    { id: 'creator', at: 105.36, focus: [50, 42], pattern: [1, 1.2, 1.08, 1.28] },
  ];
  SCENES.forEach((s, i) => { s.end = i + 1 < SCENES.length ? SCENES[i + 1].at : TOTAL; });
  const S = Object.fromEntries(SCENES.map((s) => [s.id, s.at]));

  /** Fast cuts: every 1.5–2.5 s the camera jumps between wide / close / medium framings. */
  SCENES.forEach((sc, idx) => {
    const pattern = sc.pattern || [1, 1.34, 1.14, 1.26];
    const dur = sc.end - sc.at;
    const shots = [];
    let t = 0, n = 0;
    while (t < dur - .9) {
      const f = n % pattern.length === 3 && sc.focus2 ? sc.focus2 : sc.focus;
      shots.push({ t: Math.round(t * 100) / 100, s: pattern[n % pattern.length], fx: f[0], fy: f[1] });
      t += 1.5 + ((n * 7 + idx * 3) % 5) * .25;
      n++;
    }
    sc.shots = shots;
  });

  // Sound effects: [time, type, gain(0-1), pan(-1..1)]
  const SFX = [];
  const add = (t, type, gain = 1, pan = 0) => SFX.push([Math.round(t * 1000) / 1000, type, gain, pan]);

  SCENES.forEach((s) => { if (s.at > 0) add(s.at - .18, 'whoosh', .35, 0); });

  add(0, 'crickets', .5); add(0, 'engine', .9, 0);
  add(S.truck + 2.88, 'thud', 1, -.2); add(S.truck + 3.34, 'thud', .35, -.1);
  add(S.spill + .2, 'grains', .9, -.2); add(S.spill + 1.0, 'grains', .7, -.3); add(S.spill + 1.8, 'grains', .55, -.4);
  add(S.driveoff, 'engineAway', .8, .3); add(S.driveoff + .5, 'whistle', .45, .4); add(S.driveoff, 'crickets', .4);

  [.4, 1.1, 2.1].forEach((d) => add(S.sparrow + d, 'chirp', .8, .1)); add(S.sparrow + 3.4, 'flap', .8, .3);
  add(S.crow + .1, 'flap', .6, -.3); add(S.crow + .9, 'caw', .8, 0); add(S.crow + 2.1, 'caw', .6, 0); add(S.crow + 3.0, 'flap', .8, -.3);
  add(S.pigeon + .3, 'coo', .9, .1); add(S.pigeon + 1.3, 'coo', .7, .1); add(S.pigeon + 2.3, 'flap', .8, .3);
  add(S.allbirds + .4, 'chirp', .6, -.5); add(S.allbirds + 1.3, 'coo', .6, .5); add(S.allbirds + 2.3, 'chirp', .5, -.5); add(S.allbirds + 3.1, 'caw', .45, 0);
  add(S.allbirds + 4.6, 'flap', .6, -.5); add(S.allbirds + 5.2, 'flap', .6, 0); add(S.allbirds + 5.8, 'flap', .6, .5);

  for (let i = 0; i < 6; i++) add(S.grab + .05 + i * .38, 'step', .7 - i * .03, .4 - i * .07);
  add(S.grab + 2.2, 'flap', 1, -.4); add(S.grab + 2.35, 'chirp', .7, -.4); add(S.grab + 2.4, 'flap', 1, .4); add(S.grab + 2.55, 'caw', .9, 0); add(S.grab + 2.6, 'flap', 1, 0);
  add(S.grab + 4.25, 'rustle', .9, 0);

  add(S.think + .4, 'ding', .6, 0); [.9, 1.4, 1.9].forEach((d, i) => add(S.think + d, ['chirp', 'caw', 'coo'][i], .35, [-.6, 0, .6][i]));

  for (let t = .3; t < S.hoard - S.worry; t += .5) add(S.worry + t, 'tick', .5, .5);
  for (let j = 0; j < 9; j++) add(S.worry + 1.9 + j * .55, 'page', .7, -.5);
  add(S.worry + 5.3, 'swell', .6, .3);

  for (let i = 0; i < 14; i++) add(S.hoard + .5 + i * .5, 'clink', .7, ((i % 5) - 2) * .3);
  for (let i = 0; i < 30; i++) add(S.hoard + .4 + ((i * 37) % 85) / 10 + .85, 'clink', .45, ((i * 13) % 9 - 4) / 5);
  add(S.hoard + 7.4, 'riser', .7, 0);

  add(S.kafan, 'boom', .5, 0);
  for (let t = .4; t < S.plan - S.kafan - .3; t += 1.05) add(S.kafan + t, 'heart', .9, 0);
  add(S.kafan + 2.35, 'boom', 1, 0);

  [1, 1.6, 2.2, 2.8].forEach((d, i) => add(S.plan + d + .3, 'sparkle', .5, (i - 1.5) * .4));
  add(S.plan + 5.8, 'whoosh', .6, 0);

  add(S.journey + .4, 'creak', .8, 0);
  for (let i = 0; i < 12; i++) add(S.journey + 1.5 + i * .45, 'step', .55 * (1 - i / 13), 0);
  add(S.journey + 2, 'birds', .5, 0);

  add(S.family, 'birds', .8, 0); add(S.family + 4, 'birds', .7, 0);
  add(S.quote + .3, 'chime', .8, 0); add(S.quote + 2, 'sparkle', .6, 0);

  add(S.creator - 2, 'riser', .8, 0); add(S.creator, 'impact', 1, 0);
  for (let t = .8; t < 24; t += .13 + (Math.round(t * 100) % 7) * .03) if (Math.floor(t) % 4 !== 3) add(S.creator + t, 'key', .25, .3);
  [5.2, 8.7, 17.2, 23.4].forEach((d) => add(S.creator + d, 'pop', .8, 0));
  add(128.78, 'impact', .9, 0);

  // Background music sections (bpm, chords, style, level)
  const MUSIC = [
    { from: 0, to: S.grab, bpm: 80, chords: ['Am', 'F', 'C', 'G'], style: 'calm', level: .55 },
    { from: S.grab, to: S.kafan, bpm: 80, chords: ['Am', 'Dm', 'E', 'Am'], style: 'tense', level: .6 },
    { from: S.kafan, to: S.plan, bpm: 70, chords: ['Am', 'F', 'Dm', 'E'], style: 'sparse', level: .45 },
    { from: S.plan, to: S.journey, bpm: 84, chords: ['F', 'C', 'Am', 'G'], style: 'hope', level: .55 },
    { from: S.journey, to: S.creator, bpm: 84, chords: ['C', 'G', 'Am', 'F'], style: 'uplift', level: .65 },
    { from: S.creator, to: TOTAL, bpm: 100, chords: ['Am', 'F', 'C', 'G'], style: 'promo', level: .75 },
  ];

  const TIMELINE = { TOTAL, SCENES, SFX, MUSIC };
  if (typeof module !== 'undefined' && module.exports) module.exports = TIMELINE;
  else root.TIMELINE = TIMELINE;
})(typeof window !== 'undefined' ? window : globalThis);
