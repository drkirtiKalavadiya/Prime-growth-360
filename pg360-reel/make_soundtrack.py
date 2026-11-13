"""Synthesises the 47 s soundtrack for the reel (no samples, numpy only).

Dark sub drone, a 100 bpm pulse, whooshes on every cut, impacts on the big moments,
a riser into the logo and small UI clicks. Writes soundtrack.wav next to this file.
Usage: python3 make_soundtrack.py   (then: ffmpeg -i soundtrack.wav -b:a 192k soundtrack.mp3)
"""
import os
import wave

import numpy as np

SR = 44100
DUR = 47.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
t = np.arange(N) / SR
mix = np.zeros((N, 2))

# scene cuts (must match reel.js)
CUTS = [2.85, 5.0, 12.6, 16.5, 20.3, 24.5, 26.9, 28.3, 34.4, 35.8, 37.2, 39.0, 40.0, 41.9, 46.0]
IMPACTS = [2.85, 34.4, 39.0, 42.5]


def band(x, lo, hi):
    """Band-pass x between lo and hi Hz via FFT."""
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    X[(fr < lo) | (fr > hi)] = 0
    return np.fft.irfft(X, len(x))


def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    mix[i:i + len(sig), 0] += sig * gain * (1 - max(0, pan))
    mix[i:i + len(sig), 1] += sig * gain * (1 + min(0, pan))


def env(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e


# --- drone: detuned low A + fifth, slow swell, louder in the second half
drone = sum(np.sin(2 * np.pi * f * t + p) for f, p in [(55, 0), (55.4, 1), (82.4, 2), (110.2, .5)])
drone += .3 * np.sign(np.sin(2 * np.pi * 55 * t)) * .2
drone = band(drone, 30, 400)
swell = .55 + .25 * np.sin(2 * np.pi * t / 9) + .2 * np.clip((t - 28) / 10, 0, 1)
drone *= swell * np.clip(t / 1.5, 0, 1) * np.clip((DUR - t) / 1.2, 0, 1)
mix[:, 0] += drone * .16
mix[:, 1] += drone * .16

# --- pulse: kick + soft hat at 100 bpm between 5.0 and 34.4 s, again under the CTA
def kick():
    n = int(.35 * SR)
    tt = np.arange(n) / SR
    f = 120 * np.exp(-tt * 18) + 42
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)


def hat():
    n = int(.06 * SR)
    return band(rng.standard_normal(n), 6000, 15000) * np.exp(-np.arange(n) / SR * 70)


beat = 60 / 100
for a, b in [(5.0, 34.3), (40.0, 46.0)]:
    x = a
    k = 0
    while x < b:
        add(kick(), x, .55)
        add(hat(), x + beat / 2, .12, pan=.3 if k % 2 else -.3)
        x += beat
        k += 1

# --- whoosh on every cut
def whoosh(d=.45):
    n = int(d * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    seg = n // 6
    for s in range(6):  # rising band = sweep
        lo = 300 + s * 900
        piece = band(x[s * seg:(s + 1) * seg + seg], lo, lo * 3)[:seg]
        out[s * seg:s * seg + len(piece)] = piece
    return out * np.sin(np.linspace(0, np.pi, n)) ** 1.5


for c in CUTS:
    add(whoosh(), c - .25, .22, pan=rng.uniform(-.4, .4))

# --- impacts: sub boom + noise crack + tail
def impact():
    n = int(1.8 * SR)
    tt = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (48 * tt + 30 * (1 - np.exp(-tt * 12)) / 12)) * np.exp(-tt * 2.6)
    crack = band(rng.standard_normal(n), 800, 9000) * np.exp(-tt * 22)
    tail = band(rng.standard_normal(n), 200, 2500) * np.exp(-tt * 2.2) * .25
    return boom * .9 + crack * .45 + tail


for c in IMPACTS:
    add(impact(), c, .7)

# --- riser into the logo (37.2 -> 39.0)
n = int(1.8 * SR)
tt = np.arange(n) / SR
riser = np.sin(2 * np.pi * np.cumsum(200 + 900 * (tt / 1.8) ** 2) / SR) * (tt / 1.8) ** 2
riser += band(rng.standard_normal(n), 2000, 10000) * (tt / 1.8) ** 3 * .6
add(riser, 37.2, .22)

# --- UI clicks: typing the edit, comment pop, heart, reply
def click(f=2400, d=.03):
    n = int(d * SR)
    tt = np.arange(n) / SR
    return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 120)


for x in np.arange(30.95, 31.3, .1):
    add(click(1800), x, .25)
for x in np.arange(31.4, 31.8, .11):
    add(click(2600), x, .25)
for x, f in [(43.0, 1400), (43.6, 2200), (44.0, 1600), (44.5, 1900), (24.6, 3000), (24.95, 3000), (25.3, 3000), (25.65, 3000)]:
    add(click(f, .08), x, .35)

# --- master: gentle limiter
mix *= .9 / max(1e-9, np.percentile(np.abs(mix), 99.9))
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
fade = int(.4 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'soundtrack.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32000).astype('<i2').tobytes())
print('wrote', out)
