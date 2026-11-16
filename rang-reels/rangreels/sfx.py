"""Sound design without any bought or downloaded sound: every effect is synthesised here, so the product owns them.
Cues are placed by rule from the resolved plan, mixed under the voice, and the mix is brought to -14 LUFS on export."""
import os, subprocess, numpy as np

SR = 48000


def _env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(d, 1e-4))


def _noise(n, seed):
    return np.random.default_rng(seed).standard_normal(n)


def _lowpass(x, k):
    """one-pole low-pass, k = 0..1 per sample (array or scalar)"""
    y = np.empty_like(x); acc = 0.0
    k = np.broadcast_to(k, x.shape)
    for i in range(len(x)):
        acc += k[i] * (x[i] - acc); y[i] = acc
    return y


def whoosh(dur=0.45):
    n = int(SR * dur); t = np.arange(n) / n
    sweep = 0.02 + 0.25 * np.sin(np.pi * t) ** 2
    x = _lowpass(_noise(n, 1), sweep) * np.sin(np.pi * t) ** 1.5
    return x / (np.abs(x).max() + 1e-9)


def pop():
    n = int(SR * 0.16); t = np.arange(n) / SR
    f = 520 * np.exp(-t * 18) + 180
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(n, 0.002, 0.045)
    return x / np.abs(x).max()


def tick():
    n = int(SR * 0.06); t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 2400 * t) * 0.6 + _noise(n, 3) * 0.4) * _env(n, 0.0005, 0.012)
    return x / np.abs(x).max()


def thud():
    n = int(SR * 0.35); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (90 * np.exp(-t * 6) + 45) * t) * _env(n, 0.002, 0.11)
    slap = _lowpass(_noise(n, 5), 0.3) * _env(n, 0.0005, 0.02)
    x = body + 0.7 * slap
    return x / np.abs(x).max()


def chime():
    n = int(SR * 1.2); t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in [(1318.5, 1, 3.2), (1975.5, .5, 4.5), (2637, .25, 6)])
    x *= np.minimum(1, t / 0.003)
    return x / np.abs(x).max()


def rise(dur=0.9):
    n = int(SR * dur); t = np.arange(n) / n
    x = _lowpass(_noise(n, 9), 0.01 + 0.2 * t ** 2) * t ** 2 * (1 - t) ** 0.3
    return x / (np.abs(x).max() + 1e-9)


def shimmer():
    """a soft glassy sparkle for a gold accent word"""
    n = int(SR * 1.1); t = np.arange(n) / SR
    rnd = np.random.default_rng(21)
    x = np.zeros(n)
    for k in range(14):
        f = rnd.uniform(2600, 6800); t0 = k * 0.045 + rnd.uniform(0, 0.02)
        e = np.where(t > t0, np.exp(-(t - t0) * 9), 0)
        x += np.sin(2 * np.pi * f * t) * e * (1 - k / 16)
    x *= np.minimum(1, t / 0.01)
    return x / np.abs(x).max()


def sub():
    """a deep cinematic hit for a badge landing"""
    n = int(SR * 1.4); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (48 + 40 * np.exp(-t * 8)) * t) * np.exp(-t * 2.6) + 0.25 * _lowpass(_noise(n, 13), 0.05) * np.exp(-t * 6)
    x *= np.minimum(1, t / 0.004)
    return x / np.abs(x).max()


def glass():
    """a tiny glass tap for rows and pills"""
    n = int(SR * 0.35); t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in [(3150, 1, 22), (4720, .5, 30), (6300, .25, 40)])
    x *= np.minimum(1, t / 0.0015)
    return x / np.abs(x).max()


SOUNDS = dict(shimmer=shimmer, sub=sub, glass=glass, whoosh=whoosh, pop=pop, tick=tick, thud=thud, chime=chime, rise=rise)


def cues(plan):
    """[(time, sound, gain_db)] by rule, per theme"""
    lux = plan.get('theme', 'luxe') != 'kesar'
    out = [(0.0, 'rise', -14)]
    segs = plan['segments']
    for s in segs[1:]:
        out.append((s['from'] - (0.28 if lux else 0.18), 'whoosh', -10 if lux else -11))
    for s in segs:
        for e in s.get('elements', []):
            k = e.get('el')
            if k in ('caption', 'headword') and e.get('accent'):
                out.append((e['accent'][1] + (0.3 if lux else 0.05), 'shimmer' if lux else 'pop', -21 if lux else -13))
            for key in ('rows', 'items'):
                if k in ('card', 'chips') and e.get(key):
                    out += [(r[1], 'glass' if lux else 'tick', -22 if lux else -17) for r in e[key]]
            if k in ('toran', 'panels'):
                out += [(r[1] + 0.1, 'whoosh' if lux else 'chime', -20 if lux else -22) for r in e.get('items', [])]
            if k in ('stamp', 'badge'):
                out.append((e['t'] + (0.05 if lux else 0.22), 'sub' if lux else 'thud', -8 if lux else -9))
    return sorted(out)


def mix(plan, voice_wav, out_wav):
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', voice_wav, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    v = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
    mode = plan.get('sfx', 'auto')
    if mode not in (None, False, 'off'):
        cache = {}
        for t, name, db in cues(plan):
            if name not in cache:
                cache[name] = SOUNDS[name]().astype(np.float32)
            s = cache[name] * (10 ** (db / 20))
            i = int(max(0, t) * SR)
            if i >= len(v):
                continue
            j = min(len(v), i + len(s))
            v[i:j] += s[:j - i, None]
    v = np.tanh(v * 1.1) / np.tanh(1.1)                          # soft safety limiter
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', '-', out_wav],
                   input=v.astype(np.float32).tobytes(), check=True)
    return out_wav
