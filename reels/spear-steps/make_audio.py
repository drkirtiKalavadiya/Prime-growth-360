"""Generates soundtrack.wav: background music + SFX synced to index.html's timeline.
Run: python3 make_audio.py  (needs numpy). Timings mirror T0/SD/impactT in index.html."""
import numpy as np, wave
SR, DUR = 44100, 35.7
N = int(SR * DUR); t_all = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(3)

def add(sig, start, gain=1.0, pan=0.0):
    i = int(start * SR); j = min(N, i + len(sig))
    if i >= N or j <= i: return
    s = sig[: j - i] * gain
    L[i:j] += s * (1 - max(0, pan)); R[i:j] += s * (1 + min(0, pan))

def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0; return np.fft.irfft(X, len(x))

def env(n, a, d):  # attack / exponential decay (seconds)
    t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)

def note(f, dur, harm=(1, .5, .33, .25), a=.4, rel=.8):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(h * np.sin(2 * np.pi * f * (k + 1) * t + k) for k, h in enumerate(harm))
    s += .3 * np.sin(2 * np.pi * f * 1.003 * t)                      # slight chorus
    e = np.minimum(1, t / a) * np.minimum(1, (dur - t) / rel).clip(0); return s * e

midi = lambda m: 440 * 2 ** ((m - 69) / 12)

# ---------------- music ----------------
BPM = 100; beat = 60 / BPM; bar = beat * 4
chords = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]   # Am F C G
c = 0.0; k = 0
while c < DUR - .5:
    ch = chords[k % 4]; dur = bar * 2
    for m in ch: add(note(midi(m), dur + .6), c, .045 if c < 26.8 else .03, pan=.3 * ((m % 3) - 1))
    root = ch[0] - 24
    for b in range(8):                                               # bass pulse
        if c + b * beat < DUR: add(note(midi(root), beat * .9, (1, .3), .01, .2), c + b * beat, .10)
    c += dur; k += 1

def kick():
    n = int(.45 * SR); t = np.arange(n) / SR
    f = 45 + 90 * np.exp(-t * 25); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
def taiko():
    n = int(.6 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 75 * t) + .4 * band(rng.standard_normal(n), 60, 400) * 3) * np.exp(-t * 6)
def hat():
    n = int(.06 * SR); return band(rng.standard_normal(n), 7000, 16000) * env(n, .001, .015)

b = 0; x = 0.0
while x < DUR - 1:
    if x >= 1.2:
        intense = x > 21
        if b % 2 == 0 or intense: add(kick(), x, .55)
        if x > 3 and b % 4 == 3: add(taiko(), x + beat / 2, .35, -.2)
        if x > 3: add(hat(), x, .12, .4); add(hat(), x + beat / 2, .08, .4)
    x += beat; b += 1

# ---------------- SFX ----------------
T0, SD = 3.0, 4.6
def whoosh(d=.55, lo=300, hi=3000):
    n = int(d * SR); s = rng.standard_normal(n); out = np.zeros(n); seg = n // 8
    for q in range(8):                                               # rising band sweep
        a, bnd = q * seg, (q + 1) * seg
        out[a:bnd] = band(s, lo + q * (hi - lo) / 8, lo + (q + 2) * (hi - lo) / 8)[a:bnd]
    w = np.sin(np.pi * np.arange(n) / n) ** 2; return out * w * 3
def thunk():
    n = int(.9 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (70 + 60 * np.exp(-t * 30)) * t) * np.exp(-t * 9)
    click = band(rng.standard_normal(n), 1500, 6000) * np.exp(-t * 60) * 2
    twang = np.sin(2 * np.pi * 190 * t + 3 * np.sin(2 * np.pi * 22 * t)) * np.exp(-t * 4) * .35
    return body + click + twang
def thud():
    n = int(.4 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (55 + 40 * np.exp(-t * 20)) * t) * np.exp(-t * 12) + band(rng.standard_normal(n), 100, 900) * np.exp(-t * 25)
def thunder():
    n = int(3.5 * SR); t = np.arange(n) / SR
    crack = band(rng.standard_normal(n), 800, 9000) * np.exp(-t * 14) * 2
    rumble = band(rng.standard_normal(n), 30, 180) * np.minimum(1, t / .08) * np.exp(-t * 1.1) * 5
    return crack + rumble

for i in range(4):
    s = T0 + SD * i
    add(whoosh(), s + .4, .5, .3)            # spear thrown
    add(thunk(), s + 1.5, .9, -.3)           # spear hits rock (with flash)
    add(whoosh(.35, 200, 1500), s + 2.45, .3)  # jump
    add(thud(), s + 3.95, .55)               # lands on the spear
add(whoosh(.5, 200, 1800), 21.75, .35); add(thud(), 22.45, .8)
for x in (26.8, 27.25): add(thunder(), x, .6)
# crowd: jeering murmur, then cheer
n = N; crowd = band(rng.standard_normal(n), 250, 1400)
crowd *= (1 + .6 * np.sin(2 * np.pi * 1.3 * t_all) * np.sin(2 * np.pi * .37 * t_all))
cv = np.clip(t_all / 1.0, 0, 1) * np.clip((27.5 - t_all) / 1.0, 0, 1) * .10
cheer = band(rng.standard_normal(n), 600, 4000) * np.clip((t_all - 27.8) / .6, 0, 1) * np.clip((34 - t_all) / 2, 0, 1) * .12
L += crowd * cv + cheer; R += np.roll(crowd, 900) * cv + np.roll(cheer, 500)
# golden shimmer while the beam shines
for q in range(60):
    x = 26.9 + rng.random() * 7.5; f = midi(rng.choice([84, 88, 91, 96]))
    m = int(.5 * SR); tt = np.arange(m) / SR
    add(np.sin(2 * np.pi * f * tt) * np.exp(-tt * 6), x, .05, rng.uniform(-.6, .6))

# master: fade in/out, normalize
fade = np.clip(t_all / .4, 0, 1) * np.clip((DUR - t_all) / 1.4, 0, 1)
mix = np.stack([L, R], 1) * fade[:, None]
mix = np.tanh(mix / np.abs(mix).max() * 1.4) * .89
with wave.open('soundtrack.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok', DUR)
