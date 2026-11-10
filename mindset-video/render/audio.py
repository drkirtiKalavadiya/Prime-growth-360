"""Original sound design for the 5 Mindset Rules video (all synthesized, no samples).
   Usage: python3 render/audio.py OUT_DIR [duration]
   Writes OUT_DIR/music.wav (cinematic bed) and OUT_DIR/sfx.wav:
     - one sound effect on every 2-second beat (type depends on the scene)
     - accents locked to story moments (rule numbers, shatter, cross-out, tap...)"""
import sys, os, wave, numpy as np
OUT = sys.argv[1] if len(sys.argv) > 1 else 'output'
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 66.0
SR = 44100; N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(7)
R = dict(R1=9.76, R2=19.68, R3=27.89, R4=37.17, R5=46.93, REMEMBER=55.0, SUB=61.2)
f = lambda m: 440 * 2 ** ((m - 69) / 12)

def put(buf, at, sig, gain=1.0):
    i0 = int(at * SR)
    if i0 >= N: return
    L = min(len(sig), N - i0); buf[i0:i0 + L] += gain * sig[:L]
def seg(d): return np.arange(int(d * SR)) / SR
def adsr(d, a=0.005, rel=0.3):
    x = seg(d); return np.minimum(1, x / max(a, 1e-4)) * np.exp(-np.maximum(0, x - a) / rel)
def noise(d): return rng.standard_normal(int(d * SR))
def bandpass(x, lo, hi):
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    X[(fr < lo) | (fr > hi)] = 0; return np.fft.irfft(X, len(x))

# ---------------- music: pad + plucked arpeggio + low pulse ----------------
music = np.zeros(N)
prog = [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]]  # Am F C G
bar = 60 / 84 * 4
k = 0; st = 0.0
while st < DUR:
    ch = prog[k % 4]
    for m in ch:
        for det in (-0.1, 0.1):
            x = seg(bar + 1.5); fr = f(m) * 2 ** (det / 12)
            tone = sum(np.sin(2 * np.pi * fr * h * x) / h ** 1.5 for h in (1, 2, 3))
            env = np.minimum(1, x / 0.8) * np.minimum(1, np.maximum(0, (bar + 1.5 - x)) / 1.0)
            put(music, st, tone * env, 0.012)
    x = seg(bar); put(music, st, np.sin(2 * np.pi * f(ch[0] - 24) * x) * np.minimum(1, x / 0.5) * np.minimum(1, (bar - x) / 0.4), 0.06)
    if st > 9:  # arpeggio enters with Rule 1
        notes = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12] * 2
        for j, m in enumerate(notes):
            x = seg(0.9); pl = (np.sin(2 * np.pi * f(m) * x) + 0.3 * np.sin(4 * np.pi * f(m) * x)) * np.exp(-x / 0.25)
            put(music, st + j * bar / 8, pl, 0.03)
    for b in range(4):  # soft kick-like pulse on each beat
        x = seg(0.3); put(music, st + b * bar / 4, np.sin(2 * np.pi * (50 + 60 * np.exp(-x * 30)) * x) * np.exp(-x / 0.08), 0.10)
    st += bar; k += 1
music *= np.minimum(1, t / 1.5) * np.clip((DUR - t) / 2.0, 0, 1)

# ---------------- sound effects library ----------------
def whoosh(d=0.7):
    x = seg(d); n = noise(d); sw = bandpass(n, 300, 5000) * np.sin(np.pi * x / d) ** 2
    return sw * 0.9
def pen(d=0.55):
    x = seg(d); n = bandpass(noise(d), 2500, 7000)
    am = 0.55 + 0.45 * np.sign(np.sin(2 * np.pi * 22 * x + 3 * np.sin(2 * np.pi * 3 * x)))
    return n * am * np.minimum(1, x / 0.03) * np.minimum(1, (d - x) / 0.08) * 0.8
def paper(d=0.45):
    x = seg(d); n = bandpass(noise(d), 1200, 9000)
    crack = (rng.random(len(x)) > 0.985) * rng.standard_normal(len(x)) * 4
    return (n * 0.4 + crack) * np.exp(-x / 0.18)
def boom(d=2.2):
    x = seg(d); body = np.sin(2 * np.pi * np.cumsum(42 + 90 * np.exp(-x * 7)) / SR) * np.exp(-x / 0.6)
    return body + bandpass(noise(d), 60, 2000) * np.exp(-x / 0.05) * 0.5
def thunder(d=2.0):
    x = seg(d); return bandpass(noise(d), 30, 400) * (np.minimum(1, x / 0.05) * np.exp(-x / 0.7)) * 1.6
def sparkle(d=1.2):
    s = np.zeros(int(d * SR))
    for i, m in enumerate([84, 88, 91, 96]):
        x = seg(d - i * 0.06); s[int(i * 0.06 * SR):int(i * 0.06 * SR) + len(x)] += np.sin(2 * np.pi * f(m) * x) * np.exp(-x / 0.35)
    return s * 0.45
def glass(d=1.2):
    x = seg(d); s = bandpass(noise(d), 3000, 12000) * np.exp(-x / 0.12) * 1.2
    for _ in range(14):
        fr = 2500 + rng.random() * 5000; o = rng.random() * 0.25; y = seg(0.5)
        i = int(o * SR); L = min(len(y), len(s) - i); s[i:i + L] += (np.sin(2 * np.pi * fr * y) * np.exp(-y / 0.08) * 0.35)[:L]
    return s
def click(d=0.12):
    x = seg(d); return (np.sin(2 * np.pi * 1800 * x) + bandpass(noise(d), 2000, 8000)) * np.exp(-x / 0.015)
def stamp(d=0.4):
    x = seg(d); return np.sin(2 * np.pi * (70 + 120 * np.exp(-x * 40)) * x) * np.exp(-x / 0.08) + bandpass(noise(d), 200, 3000) * np.exp(-x / 0.03) * 0.6
def riser(d=1.6):
    x = seg(d); return bandpass(noise(d), 500, 8000) * (x / d) ** 2 * 0.7

sfx = np.zeros(N)
# --- one effect on every 2-second beat, chosen by what is on screen
def beat_type(at):
    if at < 4.7 or 25.4 <= at < R['R3']: return thunder, 0.35
    if 4.7 <= at < R['R1']: return paper, 0.5
    if at >= R['REMEMBER']: return sparkle, 0.35
    if 40.1 <= at < 45.2: return whoosh, 0.3
    return (pen, 0.4) if int(at / 2) % 2 == 0 else (paper, 0.45)
for at in np.arange(0, DUR - 1, 2.0):
    fn, g = beat_type(at); put(sfx, at, fn(), g)
# --- accents locked to the story
for key in ('R1', 'R2', 'R3', 'R4', 'R5'): put(sfx, R[key], boom(), 0.55); put(sfx, R[key] - 0.35, whoosh(0.6), 0.35)
put(sfx, 0.0, boom(), 0.5); put(sfx, 2.85, whoosh(0.8), 0.45)
put(sfx, 6.4, sparkle(), 0.35); put(sfx, 7.55, whoosh(0.5), 0.3); put(sfx, 9.0, boom(), 0.35); put(sfx, 9.05, sparkle(), 0.4)
for at in (10.7, 20.5, 28.75, 37.85, 47.5): put(sfx, at, pen(0.9), 0.35)          # each portrait being inked
put(sfx, 16.85, paper(), 0.5); put(sfx, 17.55, pen(0.5), 0.6); put(sfx, 17.85, stamp(), 0.5)  # certificate crossed out
put(sfx, 24.1, click(), 0.5)                                                      # chess piece placed
put(sfx, 31.6, glass(0.6), 0.25); put(sfx, 33.0, glass(), 0.7)                     # cracks, shatter
put(sfx, 39.2, whoosh(0.4), 0.5); put(sfx, 41.3, sparkle(), 0.4)                    # katana glint, laser path
put(sfx, 49.2, thunder(), 0.4)                                                    # dark self
for i in range(7): put(sfx, 52.0 + i * 0.12 + 0.3, click(), 0.35)                    # arrows bouncing off the aura
put(sfx, R['REMEMBER'] - 1.4, riser(), 0.5)
for i in range(12): put(sfx, R['REMEMBER'] + 0.6 + i * 0.08, stamp(), 0.18)
put(sfx, R['SUB'], sparkle(), 0.4); put(sfx, 62.5, click(), 0.7); put(sfx, 62.6, boom(), 0.35); put(sfx, 62.6, sparkle(1.6), 0.55)
sfx *= np.clip((DUR - t) / 1.5, 0, 1)

def write(path, x, peak=0.8):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes())
os.makedirs(OUT, exist_ok=True)
write(os.path.join(OUT, 'music.wav'), music); write(os.path.join(OUT, 'sfx.wav'), sfx)
print('ok')
