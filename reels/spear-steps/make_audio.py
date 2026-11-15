"""Builds soundtrack.m4a = voiceover.mp3 + loud 128 BPM background music + SFX.

All timings come from events.json (exported from index.html's window.EVENTS), so
the sound effects land exactly on the animation. Needs numpy + ffmpeg.
    python3 make_audio.py
"""
import json, subprocess, wave
import numpy as np

EV = json.load(open('events.json'))
SR, DUR = 44100, EV['duration']
N = int(SR * DUR); T = np.arange(N) / SR
rng = np.random.default_rng(3)
MUS = np.zeros((N, 2)); SFX = np.zeros((N, 2))

def add(buf, sig, start, gain=1.0, pan=0.0):
    i = int(start * SR); j = min(N, i + len(sig))
    if i >= N or j <= max(i, 0): return
    s = sig[: j - i] * gain
    buf[i:j, 0] += s * (1 - max(0, pan)); buf[i:j, 1] += s * (1 + min(0, pan))

def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0; return np.fft.irfft(X, len(x))

midi = lambda m: 440 * 2 ** ((m - 69) / 12)
def tone(f, dur, harm=(1, .5, .33, .25), a=.01, d=None, rel=.05):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(h * np.sin(2 * np.pi * f * (k + 1) * t + k) for k, h in enumerate(harm))
    e = np.minimum(1, t / a) * np.clip((dur - t) / rel, 0, 1)
    if d: e *= np.exp(-t / d)
    return s * e

# ---------------- music: 128 BPM, A minor ----------------
BEAT = 60 / EV['bpm']; BAR = BEAT * 4
HP, BREAK = EV['headphones'], EV['headphones'] - .5      # music drops out on "પણ ભાઈબંધ", slams back with the headphones
CHORDS = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]   # Am F C G
def in_break(x): return BREAK <= x < HP

def kick():
    n = int(.4 * SR); t = np.arange(n) / SR
    return np.tanh(2.2 * np.sin(2 * np.pi * np.cumsum(42 + 110 * np.exp(-t * 28)) / SR) * np.exp(-t * 6))
def clap():
    n = int(.25 * SR); t = np.arange(n) / SR
    return band(rng.standard_normal(n), 900, 5000) * (np.exp(-t * 30) + .5 * np.exp(-((t - .012) ** 2) / 1e-5)) * 2.2
def hat(open_=False):
    n = int((.16 if open_ else .05) * SR); t = np.arange(n) / SR
    return band(rng.standard_normal(n), 7000, 16000) * np.exp(-t * (18 if open_ else 70))
def sub808(f, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.tanh(1.8 * np.sin(2 * np.pi * f * t) * np.exp(-t * 1.6))

x, b = 0.0, 0
while x < DUR - .2:
    if not in_break(x):
        drop = x >= HP
        ch = CHORDS[int(x / (BAR * 2)) % 4]
        add(MUS, kick(), x, .9)
        if b % 4 in (1, 3): add(MUS, clap(), x, .45 if drop else .35)
        for q in range(4 if drop else 2):                                  # 16ths after the drop
            add(MUS, hat(q == 2 and drop), x + q * BEAT / (4 if drop else 2), .16, .35)
        root = ch[0] - 24
        for q in range(2):                                                 # driving 8th-note bass
            add(MUS, tone(midi(root), BEAT / 2 * .9, (1, .6, .4, .3, .2), .005, .25), x + q * BEAT / 2, .30)
        if drop and b % 8 == 0: add(MUS, sub808(midi(root - 12) * 2, BAR * 2), x, .55)
        arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12]
        for q in range(2):                                                 # pluck arpeggio lead
            m = arp[(b * 2 + q) % 4]
            add(MUS, tone(midi(m), .2, (1, .3, .15), .003, .09), x + q * BEAT / 2, .12 if drop else .09, .3 if q else -.3)
        if b % 8 == 0:                                                     # sustained pad
            for m in ch: add(MUS, tone(midi(m), BAR * 2, (1, .4, .2), .15, None, .3), x, .05, .25 * ((m % 3) - 1))
    x += BEAT; b += 1

# ---------------- SFX ----------------
def whoosh(d=.5, lo=300, hi=3500):
    n = int(d * SR); s = rng.standard_normal(n); out = np.zeros(n); seg = n // 8
    for q in range(8):
        a, c = q * seg, (q + 1) * seg
        out[a:c] = band(s, lo + q * (hi - lo) / 8, lo + (q + 2) * (hi - lo) / 8)[a:c]
    return out * np.sin(np.pi * np.arange(n) / n) ** 2 * 3
def thunk():
    n = int(.9 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (70 + 60 * np.exp(-t * 30)) * t) * np.exp(-t * 9)
            + band(rng.standard_normal(n), 1500, 6000) * np.exp(-t * 60) * 2
            + np.sin(2 * np.pi * 190 * t + 3 * np.sin(2 * np.pi * 22 * t)) * np.exp(-t * 4) * .35)
def boom():
    n = int(1.6 * SR); t = np.arange(n) / SR
    return np.tanh(2 * np.sin(2 * np.pi * np.cumsum(30 + 70 * np.exp(-t * 6)) / SR) * np.exp(-t * 2.2)) + band(rng.standard_normal(n), 40, 400) * np.exp(-t * 5) * 2
def thud():
    n = int(.4 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (55 + 40 * np.exp(-t * 20)) * t) * np.exp(-t * 12) + band(rng.standard_normal(n), 100, 900) * np.exp(-t * 25)
def thunder():
    n = int(3 * SR); t = np.arange(n) / SR
    return band(rng.standard_normal(n), 800, 9000) * np.exp(-t * 14) * 2 + band(rng.standard_normal(n), 30, 180) * np.minimum(1, t / .08) * np.exp(-t * 1.2) * 5
def riser(d):
    n = int(d * SR); t = np.arange(n) / SR; s = rng.standard_normal(n); out = np.zeros(n); seg = n // 10
    for q in range(10):
        a, c = q * seg, (q + 1) * seg; out[a:c] = band(s, 400 + q * 900, 1500 + q * 1400)[a:c]
    return out * (t / d) ** 2 * 2.5
def pop():
    n = int(.12 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (300 + 900 * t / .12) * t) * np.exp(-t * 30)

for x in EV['throws']: add(SFX, whoosh(), x, .55, .3)
for x in EV['impacts']: add(SFX, thunk(), x, 1.0, -.3); add(SFX, boom(), x, .35)
for x in EV['jumps']: add(SFX, whoosh(.3, 200, 1500), x, .3)
for x in EV['lands']: add(SFX, thud(), x, .6)
for x in EV['cuts']: add(SFX, whoosh(.16, 2000, 9000), x - .08, .22, rng.uniform(-.5, .5))   # fast-cut swish
add(SFX, riser(BREAK - 11.4), 11.4, .25)                               # build into the break
add(SFX, pop(), HP, .5); add(SFX, boom(), HP, .7)                        # headphones on -> DROP
add(SFX, riser(1.1), EV['impacts'][3] - 1.1, .35)                       # riser into "સફળતા"
add(SFX, whoosh(.5, 200, 1800), EV['finalJump'], .4)
add(SFX, boom(), EV['land'], .9)
for x in EV['thunder']: add(SFX, thunder(), x, .55)
# closing CTA: card whoosh, Follow tap click, Enrol sparkle
def ding(f):
    n = int(1.2 * SR); t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * m * t) / m for m in (1, 2, 3)) * np.exp(-t * 3.5)
add(SFX, whoosh(.45, 300, 4000), EV['cta'] - .2, .5)
add(SFX, pop(), EV['ctaTap'], .9); add(SFX, ding(midi(84)), EV['ctaTap'] + .02, .25)
add(SFX, ding(midi(88)), EV['ctaEnrol'], .3); add(SFX, ding(midi(91)), EV['ctaEnrol'] + .12, .25)
crowd = band(rng.standard_normal(N), 250, 1400) * (1 + .6 * np.sin(2 * np.pi * 1.3 * T) * np.sin(2 * np.pi * .37 * T))
cv = np.clip(T / .5, 0, 1) * np.where(T < HP, 1, .25) * np.clip((EV['land'] + .5 - T) / .5, 0, 1) * .07   # jeers muffled after headphones
cheer = band(rng.standard_normal(N), 600, 4000) * np.clip((T - EV['land'] - .8) / .5, 0, 1) * .09
SFX[:, 0] += crowd * cv + cheer; SFX[:, 1] += np.roll(crowd, 900) * cv + np.roll(cheer, 500)
for q in range(50):                                                     # golden shimmer
    m = int(.5 * SR); tt = np.arange(m) / SR
    add(SFX, np.sin(2 * np.pi * midi(rng.choice([84, 88, 91, 96])) * tt) * np.exp(-tt * 6), EV['land'] + rng.random() * (DUR - EV['land'] - .5), .05, rng.uniform(-.6, .6))

# ---------------- voice + mix ----------------
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'voiceover.mp3', '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
voice = np.zeros(N); v = np.frombuffer(raw, '<i2') / 32768.0; voice[: min(N, len(v))] = v[:N]
voice /= np.abs(voice).max()
venv = np.convolve(np.abs(voice), np.ones(2205) / 2205, 'same'); venv = np.clip(venv / (venv.max() * .35), 0, 1)
duck = 1 - .3 * venv                                                    # light ducking: music stays loud
MUS /= np.abs(MUS).max(); SFX /= np.abs(SFX).max()
mix = MUS * .55 * duck[:, None] + SFX * .55 + voice[:, None] * .95
mix *= (np.clip(T / .05, 0, 1) * np.clip((DUR - T) / 1.2, 0, 1))[:, None]
mix = np.tanh(mix / np.abs(mix).max() * 1.5) * .95
with wave.open('_mix.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', '_mix.wav', '-af', 'loudnorm=I=-11:TP=-1:LRA=9', '-ar', str(SR),
                '-c:a', 'aac', '-b:a', '192k', 'soundtrack.m4a'], check=True)
import os; os.remove('_mix.wav'); print('soundtrack.m4a', DUR, 's')
