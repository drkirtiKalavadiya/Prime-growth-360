"""Synthesise an original soundtrack for the 5 Mindset Rules video (no samples).
   Usage: python3 render/audio.py out.wav
   - slow cinematic pad (Am - F - C - G), sub pulse
   - impact 'boom' on every rule number, whoosh on every scene change,
     sparkle on glows, rising riser into the subscribe ending."""
import sys, wave, numpy as np
SR, DUR = 44100, 54.36
N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(7)
mix = np.zeros(N)

def env(start, a, d, length=None):
    e = np.zeros(N); i0 = int(start * SR)
    L = int((length or a + d) * SR); seg = np.arange(L) / SR
    shape = np.where(seg < a, seg / max(a, 1e-4), np.exp(-(seg - a) / max(d, 1e-4)))
    e[i0:i0 + L] = shape[:max(0, min(L, N - i0))]
    return e

# --- pad: one chord every 6.8s, detuned saws softened (sum of sines)
chords = [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]]
f = lambda m: 440 * 2 ** ((m - 69) / 12)
for k in range(9):
    st = k * 6.8
    for m in chords[k % 4]:
        for det in (-0.12, 0.12):
            fr = f(m) * 2 ** (det / 12)
            tone = sum(np.sin(2 * np.pi * fr * h * t) / h for h in (1, 2, 3))
            e = np.clip((t - st) / 2.0, 0, 1) * np.clip((st + 7.6 - t) / 1.5, 0, 1)
            mix += 0.018 * tone * e
    mix += 0.05 * np.sin(2 * np.pi * f(chords[k % 4][0] - 24) * t) * np.clip((t - st) / 1, 0, 1) * np.clip((st + 7 - t) / 1, 0, 1)

# --- heartbeat pulse
for b in np.arange(0.0, DUR - 1, 0.9):
    e = env(b, 0.005, 0.18); mix += 0.10 * np.sin(2 * np.pi * 52 * t) * e

def boom(at, amp=0.55):
    e = env(at, 0.004, 0.9, 2.5)
    sweep = 2 * np.pi * np.cumsum(45 + 70 * np.exp(-(t - at).clip(0) * 6)) / SR
    noise = rng.standard_normal(N) * env(at, 0.002, 0.08, 0.4)
    return amp * (np.sin(sweep) * e) + 0.25 * noise

def whoosh(at, length=0.6, amp=0.22):
    n = rng.standard_normal(N)
    # crude band-pass sweep: moving-average difference
    k1, k2 = 6, 40
    lp1 = np.convolve(n, np.ones(k1) / k1, 'same'); lp2 = np.convolve(n, np.ones(k2) / k2, 'same')
    bp = lp1 - lp2
    seg = np.clip((t - (at - length / 2)) / length, 0, 1)
    e = np.sin(np.pi * seg) ** 2 * (seg > 0) * (seg < 1)
    return amp * bp * e * 3

def sparkle(at, amp=0.12):
    s = np.zeros(N)
    for i, m in enumerate([84, 88, 91, 96]):
        s += np.sin(2 * np.pi * f(m) * t) * env(at + i * 0.06, 0.005, 0.5, 1.2)
    return amp * s

for at in [9.35, 17.98, 27.0, 35.95, 45.15]: mix += boom(at)
for at in [0.05, 2.15, 6.85]: mix += boom(at, 0.45)
for at in [3.8, 7.3, 9.1, 11.5, 13.5, 15.7, 17.93, 19.1, 23.1, 27.0, 28.3, 30.5, 32.95, 35.9, 37.9, 38.9, 43.3, 45.1, 47.8, 48.8, 49.9]: mix += whoosh(at)
for at in [5.4, 6.2, 31.85, 39.9, 49.8, 52.75]: mix += sparkle(at)
# riser into ending + letter stamps
mix += 0.18 * whoosh(51.2, 2.0, 1.0)
for i in range(12): mix += boom(50.85 + i * 0.07, 0.08)
mix += boom(52.7, 0.4)
# fade out
mix *= np.clip((DUR - t) / 1.2, 0, 1)
mix = np.tanh(mix * 1.1) * 0.85
pcm = (mix * 32767).astype('<i2')
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'soundtrack.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok')
