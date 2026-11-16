#!/usr/bin/env python3
"""Synthesise an original score for the Dwarka film (no samples, nothing to license).

Layers, all from numpy: a tanpura-style drone on D (Pa-Sa-Sa-Sa' plucks), soft string pads that change
with each section, a low pulse under the fall and the search, and a bansuri-like line in a
pentatonic (Bhupali-like) scale over the legend and the close. Section times come from
audio/timing.json, so the music follows the film's timing.

  python3 make_score.py            # writes audio/score.wav
"""
import json
import pathlib
import wave

import numpy as np

SR = 48000
HERE = pathlib.Path(__file__).resolve().parent
rng = np.random.default_rng(7)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def env_adsr(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na) ** 2
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e


def add(buf, t0, sig):
    i = int(t0 * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i]


def tanpura_pluck(f, dur=3.2):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.zeros(n)
    for h in range(1, 14):                         # rich, buzzy harmonics (jawari): high ones swell then fade
        amp = (1 / h ** 0.9) * (1 + 0.6 * np.sin(np.pi * np.clip(t / (0.4 + 0.08 * h), 0, 1)))
        s += amp * np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * rng.standard_normal()))
    return s * np.exp(-t / 1.6) * env_adsr(n, 0.004, 0.4)


def pad(freqs, dur, a=2.5, r=2.5):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for d in (-0.12, 0.0, 0.11):               # three detuned voices per note: a soft string section
            ph = rng.uniform(0, 2 * np.pi)
            s += np.sin(2 * np.pi * (f + d) * t + ph) + 0.35 * np.sin(2 * np.pi * 2 * (f + d) * t + ph) \
                 + 0.12 * np.sin(2 * np.pi * 3 * (f + d) * t)
    s *= 1 + 0.15 * np.sin(2 * np.pi * 0.18 * t)
    return s / (3 * len(freqs)) * env_adsr(n, a, r)


def flute(f, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.clip(t / 0.35, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    s = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)
    breath = np.convolve(rng.standard_normal(n), np.ones(40) / 40, "same") * 0.08
    return (s + breath) * env_adsr(n, 0.12, min(0.5, dur * 0.4))


def pulse(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 55 * np.exp(-t * 6) + 38
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)


def lowpass(x, k=12):
    return np.convolve(x, np.ones(k) / k, "same")


def main():
    timing = json.loads((HERE / "audio" / "timing.json").read_text())
    script = json.loads((HERE / "script.json").read_text())
    seg = {s["id"]: s for s in timing["segments"]}
    take_start = {t["take"]: seg[t["lines"][0]["id"]]["start"] for t in script["takes"]}
    T = timing["total_duration"] + 2.5
    n = int(T * SR)
    drone, pads, mel, low = (np.zeros(n) for _ in range(4))

    s_legend, s_fall = take_start["T02_legend"], take_start["T03_fall"]
    s_search, s_why, s_close = take_start["T04_search"], take_start["T05_why"], take_start["T06_close"]

    # tanpura: Pa Sa' Sa' Sa, one cycle about every 4.4 s, the whole film
    D = 50                                           # D3
    cyc = [hz(D - 5), hz(D), hz(D), hz(D - 12)]
    t = 0.4
    while t < T - 3:
        for k, f in enumerate(cyc):
            add(drone, t + k * 1.1, tanpura_pluck(f) * (0.9 if k else 0.7))
        t += 4.4

    # pads per section: (start, end, chord as midi notes)
    D2 = 38
    sections = [
        (0.0, s_legend, [D2, D2 + 7, D2 + 15, D2 + 19]),                 # mystery: Dm add9
        (s_legend, s_fall, [D2, D2 + 7, D2 + 16, D2 + 19]),              # legend: D major, warm
        (s_fall, s_search, [D2 - 4, D2 + 6, D2 + 13, D2 + 17]),          # the fall: Bb, dark
        (s_search, s_why, [D2, D2 + 7, D2 + 12, D2 + 22]),               # search: open fifths, cold
        (s_why, s_close, [D2 + 3, D2 + 10, D2 + 15, D2 + 19]),           # why: tension
        (s_close, T, [D2, D2 + 7, D2 + 16, D2 + 19, D2 + 24]),           # close: D major, full
    ]
    for a, b, chord in sections:
        add(pads, max(0, a - 0.6), pad([hz(m) for m in chord], b - a + 2.2))

    # low pulse, one beat a second, under the fall and the search
    for a, b, g in ((s_fall, s_search, 1.0), (s_search, s_why, 0.6), (s_why, s_close, 0.8)):
        t = a
        while t < b - 0.3:
            add(low, t, pulse(0.9) * g)
            t += 1.0

    # bansuri line, Bhupali-like (Sa Re Ga Pa Dha) on D, over the legend and the close
    S = 62                                           # D4
    sc = {"S": S, "R": S + 2, "G": S + 4, "P": S + 7, "D": S + 9, "S'": S + 12, "R'": S + 14}
    phrase = [("G", 0.6), ("P", 0.6), ("D", 1.2), ("P", 0.6), ("G", 0.6), ("R", 0.8), ("S", 2.0),
              ("R", 0.6), ("G", 0.6), ("P", 1.6), ("D", 0.6), ("S'", 2.4)]
    for start, gain in ((s_legend + 0.6, 0.9), (s_close + 0.4, 1.0)):
        t = start
        for note, d in phrase:
            add(mel, t, flute(hz(sc[note]), d + 0.25) * gain)
            t += d
    # a quiet three-note call before the title
    t = take_start["T01_cold_open"] + 9.0
    for note, d in (("P", 0.8), ("S'", 0.8), ("D", 2.2)):
        add(mel, t, flute(hz(sc[note]), d + 0.2) * 0.6); t += d

    mix = 0.30 * drone + 0.55 * pads + 0.30 * mel + 0.55 * lowpass(low)
    fade = np.ones(n); fo = int(3.0 * SR); fade[-fo:] = np.linspace(1, 0, fo) ** 2
    fade[: int(1.0 * SR)] = np.linspace(0, 1, int(1.0 * SR))
    mix *= fade
    mix /= np.max(np.abs(mix)) + 1e-9
    stereo = np.stack([mix, np.roll(mix, int(0.012 * SR))], 1) * 0.89
    out = HERE / "audio" / "score.wav"
    with wave.open(str(out), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((stereo * 32767).astype(np.int16).tobytes())
    print(f"score: {out}  ({T:.1f}s)")


if __name__ == "__main__":
    main()
