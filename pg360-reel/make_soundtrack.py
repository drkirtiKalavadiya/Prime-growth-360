"""Builds the reel soundtrack: your voice-over at 1.3x + synthesised music and SFX (numpy only).

Dark sub drone, a 100 bpm pulse, whooshes on every cut, impacts on the big moments,
a riser into the logo and small UI clicks. Writes soundtrack.wav next to this file.
Usage: python3 make_soundtrack.py   (then: ffmpeg -i soundtrack.wav -b:a 192k soundtrack.mp3)
"""
import os
import wave

import numpy as np

SR = 44100
SPEED = 1.3                      # voice-over is played 1.3x faster
A_END = 86.36 + .6               # end of the voice (1x seconds) + hold
DUR = A_END / SPEED
T = lambda a: a / SPEED          # voice time -> reel time
N = int(SR * DUR)
rng = np.random.default_rng(7)
t = np.arange(N) / SR
mix = np.zeros((N, 2))

# scene cuts in voice time (must match SCN in reel.js)
CUTS = [T(a) for a in [3.56, 8.6, 16.9, 23.9, 29.1, 34.8, 38.5, 41.5, 51.9, 52.4, 54.9, 58.1, 59.4, 62.6, 67.4, 74.0, 75.6, 78.2, 82.6]]
IMPACTS = [T(a) for a in [3.56, 51.9, 58.1, 65.45, 75.6]]

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

# --- pulse: kick + hat + clap, ~109 bpm (as in the reference), from the rhythm shot to the end
def kick():
    n = int(.35 * SR)
    tt = np.arange(n) / SR
    f = 120 * np.exp(-tt * 18) + 42
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)


def hat():
    n = int(.06 * SR)
    return band(rng.standard_normal(n), 6000, 15000) * np.exp(-np.arange(n) / SR * 70)


def clap():
    n = int(.25 * SR)
    tt = np.arange(n) / SR
    return band(rng.standard_normal(n), 900, 6000) * (np.exp(-tt * 30) + .4 * np.exp(-tt * 9))


BEAT = 60 / 109.1
DROPS = [(T(51.6), T(52.5)), (T(57.6), T(58.6))]   # breaks before the big hits
x, k = T(8.6), 0
while x < DUR - .8:
    if not any(a <= x < b for a, b in DROPS):
        add(kick(), x, .55)
        add(hat(), x + BEAT / 2, .1, pan=.3 if k % 2 else -.3)
        if k % 2 == 1:
            add(clap(), x, .15)
    x += BEAT
    k += 1

# intro montage hits
for x in [0.33, 0.87, 1.6, 2.2]:
    add(kick(), x, .6)

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
# extra whooshes on the montage cuts and the zoom
for c in [0.2, 0.3, 0.6, 1.0, 1.3, 1.65, 1.95, 2.25, T(38.6), T(43.4)]:
    add(whoosh(.3), c - .1, .16, pan=rng.uniform(-.5, .5))

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
add(riser, T(56.2), .22)

# --- UI clicks: typing the edit, comment pop, heart, reply
def click(f=2400, d=.03):
    n = int(d * SR)
    tt = np.arange(n) / SR
    return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 120)


# script.json edit (delete + type), pins, checklist rows, comment typing, WhatsApp digits
clicks = [(T(a), 1800) for a in np.arange(47.6, 48.0, .1)] + [(T(a), 2600) for a in np.arange(48.1, 48.8, .17)]
clicks += [(T(a), 3000) for a in [34.8, 34.88, 34.96, 35.04]]
clicks += [(T(a), 1500) for a in [67.9, 69.2, 70.5, 72.1]]
clicks += [(T(a), 2600) for a in np.arange(76.25, 76.7, .09)] + [(T(76.9), 1400), (T(77.3), 2200), (T(77.5), 1600), (T(77.8), 1900)]
clicks += [(T(78.45 + i * .33), 2400) for i in range(5)] + [(T(80.5 + i * .36), 2400) for i in range(5)]
for x, f in clicks:
    add(click(f, .06), x, .3)

# --- master: gentle limiter on the music bed
mix *= .9 / max(1e-9, np.percentile(np.abs(mix), 99.9))
mix = np.tanh(mix * 1.2) / np.tanh(1.2)

# --- voice-over (already sped up to 1.3x by ffmpeg) with the music ducked under it
here = os.path.dirname(os.path.abspath(__file__))
vpath = os.path.join(here, 'voice-1.3x.wav')
if os.path.exists(vpath):
    with wave.open(vpath) as w:
        v = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(float) / 32768
    v = np.pad(v, (0, max(0, N - len(v))))[:N]
    v *= .5 / max(1e-9, np.percentile(np.abs(v), 99.9))
    # envelope follower: fast attack, slow release
    hop = 441
    rms = np.sqrt(np.convolve(v ** 2, np.ones(hop) / hop, 'same'))
    env = np.zeros(N)
    g = 0.0
    for i in range(0, N, hop):
        target = min(1.0, rms[i] / .05)
        g = target if target > g else g * .93
        env[i:i + hop] = g
    duck = 1 - .62 * env
    mix = mix * duck[:, None] * .7 + v[:, None] * 1.0
    mix *= .95 / max(1e-9, np.abs(mix).max())

fade = int(.4 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]

out = os.path.join(here, 'soundtrack.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32000).astype('<i2').tobytes())
print('wrote', out, f'{DUR:.2f}s')
