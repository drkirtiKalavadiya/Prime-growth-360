"""
Synthesise the sound kit used by the template (royalty-free, made from maths).
Each sound copies the *role* and frequency footprint measured in the reference reel:

  boom.wav        sub-bass hit on every zoom punch (30-150 Hz peak in reference)
  whoosh.wav      air swoosh when a headline flies in / out
  whip.wav        fast whip-pan swoosh for the angle-change transition
  downlifter.wav  falling 4 kHz -> 900 Hz sweep after the whip (seen 8.5-10 s)
  shimmer.wav     bright bell "ding" (2.6 kHz + 7.5/9.3 kHz partials) when a headline lands
  pop.wav         short pitched blip for small text / phone number
  slash.wav       sharp swish for the diagonal strike bar
  music_pad.wav   60 s ambient pad bed with the steady ~1.17 kHz (D6) tone heard under the voice

  python3 scripts/make_sfx.py      -> writes into public/sfx/
Swap any file for your own licensed sound with the same name to change it.
"""
import os, wave
import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "sfx")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def t(d):
    return np.arange(int(SR * d)) / SR


def save(name, x, gain=0.9):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def bandpass_sweep(noise, f_start, f_end, q=3.0, block=512):
    """Time-varying band-pass on noise via block FFT."""
    out = np.zeros_like(noise)
    n = len(noise)
    win = np.hanning(block * 2)
    for s in range(0, n - block * 2, block):
        seg = noise[s:s + block * 2] * win
        k = s / max(1, n - block * 2)
        fc = f_start * (f_end / f_start) ** k
        F = np.fft.rfft(seg)
        f = np.fft.rfftfreq(len(seg), 1 / SR)
        resp = np.exp(-0.5 * ((np.log(f + 1) - np.log(fc)) * q) ** 2)
        out[s:s + block * 2] += np.fft.irfft(F * resp, len(seg))
    return out


def env(n, a, d, shape=4.0):
    x = np.linspace(0, 1, n)
    e = np.minimum(x / a, 1) if a > 0 else np.ones(n)
    return e * np.exp(-shape * np.maximum(x - a, 0) / d)


# boom: pitch-dropping sine + click
tt = t(1.4)
f = 62 * np.exp(-tt * 1.2) + 34
boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3.2)
boom += 0.3 * np.tanh(3 * boom)
boom[:200] += rng.normal(0, 0.6, 200) * np.linspace(1, 0, 200)
save("boom.wav", boom, 0.95)

# whoosh: noise swept up then down, swelling envelope
n = int(SR * 0.6)
wh = bandpass_sweep(rng.normal(0, 1, n), 400, 5000, q=2.2)
wh *= np.sin(np.linspace(0, np.pi, n)) ** 2
save("whoosh.wav", wh, 0.7)

# whip: fast and bright
n = int(SR * 0.3)
wp = bandpass_sweep(rng.normal(0, 1, n), 1500, 7000, q=1.8)
wp *= np.sin(np.linspace(0, np.pi, n)) ** 3
save("whip.wav", wp, 0.85)

# downlifter: falling tone + airy noise (matches 4 kHz -> 900 Hz sweep in reference)
tt = t(1.6)
f = 900 + 3100 * np.exp(-tt * 2.5)
dl = 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR)
dl += 0.5 * bandpass_sweep(rng.normal(0, 1, len(tt)), 4000, 900, q=2.5)
dl *= env(len(tt), 0.03, 1.0, 3.0)
save("downlifter.wav", dl, 0.5)

# shimmer: bell partials
tt = t(1.2)
sh = sum(a * np.sin(2 * np.pi * fr * tt) * np.exp(-tt * dk)
         for fr, a, dk in [(2620, 1.0, 4), (5240, 0.4, 6), (7480, 0.35, 7), (9300, 0.5, 8)])
save("shimmer.wav", sh, 0.45)

# pop: short pitched blip
tt = t(0.12)
pp = np.sin(2 * np.pi * np.cumsum(900 * np.exp(-tt * 25) + 300) / SR) * np.exp(-tt * 40)
save("pop.wav", pp, 0.6)

# slash: sharp swish
n = int(SR * 0.18)
sl = bandpass_sweep(rng.normal(0, 1, n), 6000, 2500, q=1.5) * np.exp(-np.linspace(0, 6, n))
save("slash.wav", sl, 0.7)

# music pad: soft D-major pad + steady D6 tone, slow movement, loopable 60 s
tt = t(60)
pad = np.zeros_like(tt)
for fr, a in [(146.83, 0.5), (220.0, 0.35), (293.66, 0.3), (369.99, 0.22), (440.0, 0.15)]:
    for det in (-0.6, 0.0, 0.6):  # detuned voices
        pad += a * np.sin(2 * np.pi * (fr + det) * tt + rng.uniform(0, 6))
pad *= 0.75 + 0.25 * np.sin(2 * np.pi * tt / 8)          # slow breathing
pad += 0.18 * np.sin(2 * np.pi * 1174.66 * tt)           # the constant high tone
fade = np.minimum(np.minimum(tt / 1.5, 1), np.minimum((60 - tt) / 2, 1))
save("music_pad.wav", pad * fade, 0.5)

print("wrote", sorted(os.listdir(OUT)))
