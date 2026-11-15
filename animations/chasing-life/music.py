#!/usr/bin/env python3
"""
music.py: composes an original, energetic 128 BPM soundtrack and the sound
effects for the reel, from scratch with numpy. No samples, no copyrighted music.

    python3 music.py <out_dir> [duration]
      -> <out_dir>/bed.wav  (music)
      -> <out_dir>/sfx.wav  (sound effects)

The arrangement follows the cue times in scene.js (CUES below):
  groove → light turns green: impact and full energy → wheelchair: emotional
  breakdown → build-up → DROP on the moral → riser → BIG DROP on the CTA →
  final hit.
"""
import sys
import wave
import numpy as np

SR = 48000
BPM = 128
BEAT = 60 / BPM
RNG = np.random.default_rng(360)

# ---- cue times (seconds), keep in sync with TIMELINE in scene.js ----
CUES = dict(
    supercar=-0.4, suv=2.9, sedan=6.9, heli=(0.0, 3.2),
    amber=11.2, green=11.95, depart=(12.35, 12.65, 12.9),
    scene_cut=15.9, end_cut=23.6, cta=27.4,
    captions=(0.0, 4.35, 8.35, 11.98, 17.05, 19.98),
    tap=27.4 + 3.0, card=27.4 + 4.0, enrol=27.4 + 5.6,
)

# chord progression Am - F - C - G (one chord per bar)
ROOTS = [110.00, 87.31, 130.81, 98.00]
CHORDS = [
    [440.00, 523.25, 659.25, 880.00],
    [349.23, 440.00, 523.25, 698.46],
    [523.25, 659.25, 783.99, 1046.50],
    [392.00, 493.88, 587.33, 783.99],
]


# ---------------------------------------------------------------- helpers
def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def fft_filter(x, lo=None, hi=None):
    """Brick-wall-ish band filter with soft edges, done in the frequency domain."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo:
        m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi:
        m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def saw(freq, t):
    # band-limited-ish saw: first 12 harmonics
    out = np.zeros_like(t)
    for k in range(1, 13):
        if freq * k > SR / 2.2:
            break
        out += np.sin(2 * np.pi * freq * k * t) / k
    return out * 0.6


def add(buf, sig, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i < 0:
        sig = sig[-i:]
        i = 0
    n = min(len(sig), buf.shape[1] - i)
    if n <= 0:
        return
    l, r = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
    buf[0, i:i + n] += sig[:n] * gain * l * 1.414
    buf[1, i:i + n] += sig[:n] * gain * r * 1.414


def reverb(x, mix=0.25):
    out = x.copy()
    for d, g in [(0.029, .5), (0.037, .45), (0.053, .4), (0.071, .35), (0.097, .3), (0.131, .25), (0.173, .2), (0.229, .15)]:
        k = int(d * SR)
        y = np.zeros_like(x)
        y[k:] = x[:-k] * g
        y[2 * k:] += x[:-2 * k] * g * g
        out += y * mix
    return out


def echo(x, delay, fb=0.4, n=4):
    out = x.copy()
    k = int(delay * SR)
    for j in range(1, n + 1):
        if j * k >= len(x):
            break
        out[j * k:] += x[:-j * k] * (fb ** j)
    return out


# ---------------------------------------------------------------- instruments
def kick(punch=1.0):
    t = t_axis(0.45)
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7.5)
    s[:240] += RNG.uniform(-1, 1, 240) * np.linspace(0.5, 0, 240)   # beater click
    return np.tanh(s * 1.6 * punch)


def clap():
    t = t_axis(0.3)
    n = fft_filter(RNG.uniform(-1, 1, len(t)), 900, 6000)
    env = np.exp(-t * 22)
    for d in (0.0, 0.011, 0.022):            # three quick slaps
        env += np.exp(-np.maximum(t - d, 0) * 120) * (t >= d) * 0.7
    return n * env * 0.9


def hat(open_=False):
    t = t_axis(0.25 if open_ else 0.06)
    n = fft_filter(RNG.uniform(-1, 1, len(t)), 7000, None)
    return n * np.exp(-t * (14 if open_ else 70)) * 0.5


def bass(freq, dur):
    t = t_axis(dur)
    s = fft_filter(saw(freq, t) + 0.6 * np.sin(2 * np.pi * freq / 2 * t), None, 700)
    env = np.minimum(1, t / 0.005) * np.exp(-t * 5)
    return np.tanh(s * env * 2.2) * 0.8


def pluck(freq, dur=0.22):
    t = t_axis(dur)
    s = saw(freq, t) * 0.6 + np.sign(np.sin(2 * np.pi * freq * t)) * 0.15
    return fft_filter(s * np.exp(-t * 16), None, 4200)


def supersaw(freqs, dur, bright=5000):
    t = t_axis(dur)
    s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.012, -0.005, 0.0, 0.006, 0.013):
            s += saw(f * (1 + det), t + RNG.uniform(0, 0.01))
    s /= len(freqs) * 5
    return fft_filter(s, 120, bright)


def pad(freqs, dur):
    t = t_axis(dur)
    s = supersaw(freqs, dur, 1800)
    env = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.6)
    return s * env


def riser(dur):
    t = t_axis(dur)
    k = t / dur
    n = RNG.uniform(-1, 1, len(t))
    # sweep the noise upward in four filtered slices
    out = np.zeros_like(t)
    q = len(t) // 4
    for i in range(4):
        sl = slice(i * q, len(t) if i == 3 else (i + 1) * q)
        out[sl] = fft_filter(n[sl], 400 * (2 ** i), 2500 * (2 ** i))
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1800 * k ** 2) / SR) * 0.25
    return (out * 0.7 + sweep) * k ** 2.2


def impact(big=1.0):
    t = t_axis(2.4)
    f = 28 + 60 * np.exp(-t * 6)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.8)
    crash = fft_filter(RNG.uniform(-1, 1, len(t)), 3000, None) * np.exp(-t * 2.5) * 0.35
    thud = fft_filter(RNG.uniform(-1, 1, len(t)), None, 400) * np.exp(-t * 14) * 0.8
    return np.tanh((boom * 1.4 + crash + thud) * big)


def reverse_swell(dur=0.9):
    t = t_axis(dur)
    n = fft_filter(RNG.uniform(-1, 1, len(t)), 2000, None)
    return n * (t / dur) ** 3 * 0.6


def whoosh(dur=0.7, lo=300, hi=3000):
    t = t_axis(dur)
    n = fft_filter(RNG.uniform(-1, 1, len(t)), lo, hi)
    env = np.sin(np.pi * t / dur) ** 2
    return n * env


def snare_roll(dur):
    out = np.zeros(int(dur * SR))
    tt = 0.0
    while tt < dur - 0.02:
        k = tt / dur
        c = clap()[: int(0.08 * SR)] * (0.25 + 0.75 * k)
        i = int(tt * SR)
        n = min(len(c), len(out) - i)
        out[i:i + n] += c[:n]
        tt += BEAT / (2 if k < 0.5 else 4 if k < 0.8 else 8)
    return out


# ---------------------------------------------------------------- arrangement
def groove(buf, start, end, level=1.0, stabs=False, arp=True, drums=True):
    """Four-on-the-floor groove from start to end on its own beat grid."""
    nbeats = int((end - start) / BEAT)
    for b in range(nbeats):
        t0 = start + b * BEAT
        bar = (b // 4) % 4
        if drums:
            add(buf, kick(), t0, 0.95 * level)
            if b % 2 == 1:
                add(buf, clap(), t0, 0.5 * level, 0.05)
            add(buf, hat(True), t0 + BEAT / 2, 0.22 * level, 0.3)
            for s16 in (0.25, 0.75):
                add(buf, hat(), t0 + BEAT * s16, 0.16 * level, -0.3)
        # offbeat bass, with a pickup 16th
        add(buf, bass(ROOTS[bar], BEAT * 0.45), t0 + BEAT / 2, 0.55 * level)
        if b % 4 == 3:
            add(buf, bass(ROOTS[bar] * 2, BEAT * 0.2), t0 + BEAT * 0.75, 0.35 * level)
        if arp:
            notes = CHORDS[bar]
            for s16 in range(4):
                n = notes[(b * 4 + s16) % 4] * (2 if (b % 8) >= 4 and s16 == 3 else 1)
                add(buf, echo(pluck(n), BEAT * 0.75, 0.35, 3), t0 + s16 * BEAT / 4, 0.1 * level, 0.35 if s16 % 2 else -0.35)
        if stabs:
            add(buf, supersaw(CHORDS[bar][:3], BEAT * 0.35), t0 + BEAT / 2, 0.42 * level)


def build_bed(dur):
    buf = np.zeros((2, int(dur * SR)))
    C = CUES
    # A: groove from the top (lighter at first)
    groove(buf, 0.0, 1.875, level=0.55, drums=False)
    groove(buf, 1.875, C['amber'], level=0.85)
    # build into green: snare roll + riser, then impact
    add(buf, snare_roll(C['green'] - C['amber']), C['amber'], 0.45)
    add(buf, riser(C['green'] - C['amber'] + 0.2), C['amber'] - 0.2, 0.35)
    add(buf, impact(0.9), C['green'], 0.7)
    groove(buf, C['green'], C['scene_cut'] - 0.25, level=1.0, stabs=True)
    # breakdown: emotional pads, heartbeat kick
    add(buf, reverse_swell(0.6), C['scene_cut'] - 0.6, 0.5)
    add(buf, impact(1.0), C['scene_cut'], 0.65)
    bd_start, bd_end = C['scene_cut'], C['end_cut']
    bar_len = BEAT * 4
    k = 0
    tt = bd_start
    while tt < bd_end - 0.1:
        chord = CHORDS[k % 4]
        d = min(bar_len, bd_end - tt)
        p = pad([chord[0] / 2, chord[1] / 2, chord[2] / 2], d + 0.4)
        add(buf, reverb(p, 0.4), tt, 0.32)
        for b in range(4):
            if tt + b * BEAT < bd_end - 2.0:
                add(buf, kick(0.6), tt + b * BEAT, 0.35 if b % 2 == 0 else 0.0)
            for s8 in range(2):
                n = chord[(b * 2 + s8) % 4] * 2
                add(buf, echo(pluck(n, 0.3), BEAT * 0.75, 0.45, 4), tt + b * BEAT + s8 * BEAT / 2, 0.06, 0.4 if s8 else -0.4)
        tt += bar_len
        k += 1
    # build-up into the moral drop
    add(buf, snare_roll(2.0), C['end_cut'] - 2.0, 0.5)
    add(buf, riser(2.2), C['end_cut'] - 2.2, 0.5)
    add(buf, impact(1.2), C['end_cut'], 0.9)
    groove(buf, C['end_cut'], C['cta'] - 0.35, level=1.0, stabs=True)
    # riser into the CTA, BIG drop
    add(buf, riser(1.2), C['cta'] - 1.2, 0.5)
    add(buf, reverse_swell(0.8), C['cta'] - 0.8, 0.5)
    add(buf, impact(1.4), C['cta'], 1.0)
    groove(buf, C['cta'], dur - 1.2, level=1.1, stabs=True)
    # final hit
    add(buf, impact(1.3), dur - 1.2, 0.9)
    add(buf, reverb(supersaw(CHORDS[0], 1.2), 0.5), dur - 1.2, 0.35)
    return buf


def build_sfx(dur):
    buf = np.zeros((2, int(dur * SR)))
    C = CUES
    # helicopter: chopping rotor panned left → right
    h0, h1 = C['heli']
    t = t_axis(h1 - h0)
    chop = fft_filter(RNG.uniform(-1, 1, len(t)), 60, 900) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 13 * t)))
    chop *= np.sin(np.pi * t / (h1 - h0)) ** 1.5
    for i, pan in enumerate(np.linspace(-0.9, 0.9, 6)):
        seg = slice(i * len(t) // 6, (i + 1) * len(t) // 6)
        add(buf, chop[seg], h0 + i * (h1 - h0) / 6, 0.35, pan)
    # cars arriving (whoosh + low engine), leaving on green
    for at in (C['supercar'] + 0.1, C['suv'], C['sedan']):
        add(buf, whoosh(1.1, 150, 1500), at, 0.55, -0.6)
    for at in C['depart']:
        add(buf, whoosh(1.0, 200, 2500), at, 0.5, 0.6)
    # relay clicks on the light changes
    for at in (C['amber'], C['green']):
        add(buf, fft_filter(RNG.uniform(-1, 1, 1200), 2000, 9000) * np.exp(-np.arange(1200) / 120), at, 0.5, 0.5)
    # swish when each caption starts
    for at in C['captions']:
        add(buf, whoosh(0.35, 2000, 9000), at - 0.08, 0.12)
    # CTA: tap pop + sparkle, card whoosh, enrol shimmer
    tt = t_axis(0.15)
    pop = np.sin(2 * np.pi * (900 - 2500 * tt) * tt) * np.exp(-tt * 40)
    add(buf, pop, C['tap'], 0.6)
    for i in range(14):
        f = 2400 + 180 * i
        tg = t_axis(0.25)
        add(buf, np.sin(2 * np.pi * f * tg) * np.exp(-tg * 18), C['tap'] + 0.04 * i, 0.06, (i % 5 - 2) / 2.5)
    add(buf, whoosh(0.6, 300, 4000), C['card'] - 0.1, 0.5)
    for i, f in enumerate((1318.5, 1567.98, 2093.0, 2637.0)):
        tg = t_axis(0.9)
        add(buf, echo(np.sin(2 * np.pi * f * tg) * np.exp(-tg * 4), 0.12, 0.4, 3), C['enrol'] + 0.07 * i, 0.12, 0.3 * (i - 1.5))
    return buf


def write_wav(path, buf, peak=0.92):
    buf = buf / max(1e-9, np.max(np.abs(buf))) * peak
    pcm = (np.clip(buf.T, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    dur = float(sys.argv[2]) if len(sys.argv) > 2 else 36.5
    bed = build_bed(dur)
    fade = int(0.6 * SR)
    bed[:, -fade:] *= np.linspace(1, 0, fade) ** 2
    write_wav(f'{out}/bed.wav', bed)
    write_wav(f'{out}/sfx.wav', build_sfx(dur), 0.8)
    print('wrote', f'{out}/bed.wav', f'{out}/sfx.wav')
