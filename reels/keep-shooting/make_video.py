#!/usr/bin/env python3
"""Build keep-shooting.mp4 (1080x1920, 30 fps, 16 s) with music and sound effects.

1. export_frames.js renders every frame of index.html and writes the cue sheet
   (throws, rim hits, bounces, swishes, counter ticks, milestones).
2. This script synthesises an upbeat music bed plus the sound effects from
   that cue sheet (numpy only, no samples needed) -> soundtrack.wav.
3. ffmpeg muxes frames + soundtrack into keep-shooting.mp4.

Requirements: Node + Playwright, Python 3 + numpy, ffmpeg.
"""
import json, os, subprocess, sys, tempfile, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 44100
DUR = 16.0
BPM = 120
BEAT = 60 / BPM
rng = np.random.default_rng(3)


# ---------------- tiny synth toolkit ----------------
def t_axis(sec):
    return np.arange(int(sec * SR)) / SR

def env(n, attack=0.002, decay=0.2):
    t = np.arange(n) / SR
    a = np.clip(t / attack, 0, 1)
    return a * np.exp(-t / decay)

def onepole_lp(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y

def hp(x, cutoff):
    return x - onepole_lp(x, cutoff)

def note(n):  # MIDI -> Hz
    return 440 * 2 ** ((n - 69) / 12)

def place(buf, snd, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= len(buf): return
    snd = snd[: len(buf) - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(snd), 0] += snd * gain * l * 1.414
    buf[i:i + len(snd), 1] += snd * gain * r * 1.414


# ---------------- instruments ----------------
def kick():
    t = t_axis(0.35)
    f = 45 + 95 * np.exp(-t / 0.04)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.001, 0.12)

NOISE = rng.standard_normal(int(SR * 0.6))

def clap():
    n = int(0.22 * SR)
    x = hp(NOISE[:n].copy(), 900)
    e = env(n, 0.001, 0.06)
    for d in (0.008, 0.016):              # clap flams
        k = int(d * SR); e[k:] += 0.6 * env(n - k, 0.001, 0.05)
    return x * e * 0.6

def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    return hp(hp(NOISE[:n].copy(), 6000), 6000) * env(n, 0.001, 0.06 if open_ else 0.015)

def marimba(freq, dur=0.5):
    t = t_axis(dur)
    s = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * freq * 4 * t) * np.exp(-t / 0.03)
    return s * env(len(t), 0.002, 0.16)

def bass(freq, dur):
    t = t_axis(dur)
    tri = 2 * np.abs(2 * ((freq * t) % 1) - 1) - 1
    s = 0.8 * tri + 0.3 * np.sin(2 * np.pi * freq * t)
    e = np.clip(t / 0.005, 0, 1) * np.exp(-t / 0.25)
    return s * e

def pad(freqs, dur):
    t = t_axis(dur)
    s = sum(np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.003 * t) for f in freqs)
    e = np.clip(t / 0.4, 0, 1) * np.clip((dur - t) / 0.6, 0, 1)
    return s * e / len(freqs)

# ---------------- sound effects ----------------
def sfx_bounce(pitch=1.0):
    t = t_axis(0.22)
    f = (70 + 60 * np.exp(-t / 0.02)) * pitch
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.001, 0.07)
    slap = hp(NOISE[:len(t)].copy(), 1500) * env(len(t), 0.0005, 0.008) * 0.35
    return body + slap

def sfx_rim(pitch=1.0):
    t = t_axis(0.6)
    partials = [(520, 1, 0.25), (1236, 0.6, 0.18), (1873, 0.4, 0.12), (2651, 0.3, 0.08), (3410, 0.2, 0.05)]
    s = sum(a * np.sin(2 * np.pi * f * pitch * t) * np.exp(-t / d) for f, a, d in partials)
    hit = hp(NOISE[:len(t)].copy(), 3000) * env(len(t), 0.0005, 0.01) * 0.5
    return (s + hit) * 0.5

def sfx_swish():
    n = int(0.45 * SR)
    x = hp(onepole_lp(rng.standard_normal(n), 7000), 2500)
    t = np.arange(n) / SR
    e = np.sin(np.pi * np.clip(t / 0.4, 0, 1)) ** 2
    rustle = 1 + 0.5 * np.sin(2 * np.pi * 38 * t)          # net texture
    return x * e * rustle * 0.9

def sfx_throw():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    x = hp(onepole_lp(rng.standard_normal(n), 2500), 400)
    return x * np.sin(np.pi * t / 0.25) ** 2 * 0.25

def sfx_tick():
    t = t_axis(0.03)
    return np.sin(2 * np.pi * 2400 * t) * env(len(t), 0.0005, 0.006) * 0.5

def sfx_ding():
    t = t_axis(0.9)
    s = (np.sin(2 * np.pi * 1318.5 * t) + 0.5 * np.sin(2 * np.pi * 2637 * t) * np.exp(-t / 0.1)
         + 0.25 * np.sin(2 * np.pi * 3955 * t) * np.exp(-t / 0.05))
    return s * env(len(t), 0.001, 0.3) * 0.5

def sfx_final():
    out = np.zeros(int(1.8 * SR))
    for k, m in enumerate([72, 76, 79, 84]):               # C E G C chime
        s = marimba(note(m), 1.2) * 0.8
        i = int(k * 0.09 * SR); out[i:i + len(s)] += s[: len(out) - i]
    n = int(1.8 * SR)
    cym = hp(hp(rng.standard_normal(n), 5000), 5000) * env(n, 0.01, 0.5) * 0.25
    return out + cym


# ---------------- music bed ----------------
def music():
    buf = np.zeros((int(DUR * SR), 2))
    chords = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]   # C G Am F
    roots = [36, 31, 33, 29]
    K, C, H, HO = kick(), clap(), hat(), hat(True)
    end_groove = 14.0
    for bar in range(8):
        b0 = bar * 4 * BEAT
        ch, root = chords[bar % 4], roots[bar % 4]
        if b0 < end_groove:
            place(buf, pad([note(m) for m in ch], 4 * BEAT + 0.3), b0, 0.10)
        for beat in range(4):
            t = b0 + beat * BEAT
            if t >= end_groove: break
            groove = bar >= 1                                  # light intro bar
            if groove: place(buf, K, t, 0.75)
            if groove and beat in (1, 3): place(buf, C, t, 0.45, 0.1)
            for e8 in range(2):
                te = t + e8 * BEAT / 2
                place(buf, HO if e8 else H, te, 0.12 if e8 else 0.08, 0.35)
                place(buf, bass(note(root + (12 if e8 else 0)), BEAT / 2), te, 0.32)
                # marimba riff: chord tones up an octave, bouncing pattern
                riff = [0, 2, 1, 2, 0, 1, 2, 1][(beat * 2 + e8) % 8]
                place(buf, marimba(note(ch[riff] + 12)), te, 0.16 if e8 else 0.22, -0.3 + 0.2 * riff)
    # resolve on a held C major chord under "Keep shooting."
    place(buf, pad([note(m) for m in [48, 60, 64, 67, 72]], 2.0), end_groove, 0.18)
    place(buf, kick(), end_groove, 0.8)
    return buf


def sfx_track(events):
    buf = np.zeros((int(DUR * SR), 2))
    bounces = [sfx_bounce(p) for p in (0.9, 1.0, 1.12, 1.25)]
    rims = [sfx_rim(p) for p in (0.97, 1.0, 1.04)]
    swish, throw, tick, ding, final = sfx_swish(), sfx_throw(), sfx_tick(), sfx_ding(), sfx_final()
    times = np.array([e['t'] for e in events])
    for k, e in enumerate(events):
        t, typ = e['t'], e['type']
        density = np.sum(np.abs(times - t) < 0.4)              # duck when things get busy
        busy = 1 / np.sqrt(max(1, density / 3))
        if typ == 'bounce':
            place(buf, bounces[k % 4], t, 0.55 * e.get('v', 1) * busy, rng.uniform(-0.2, 0.5))
        elif typ == 'rim':
            place(buf, rims[k % 3], t, 0.32 * busy, 0.6)
        elif typ == 'swish':
            place(buf, swish, t - 0.1, 0.55, 0.6)
        elif typ == 'throw':
            place(buf, throw, t, 0.5 * e.get('v', 1) * busy, -0.5)
        elif typ == 'tick':
            place(buf, tick, t, 0.12, -0.1)
        elif typ == 'milestone':
            place(buf, ding, t, 0.32, 0)
        elif typ == 'final':
            place(buf, final, t, 0.5, 0)
    return buf


def write_wav(path, x):
    x = np.tanh(x * 1.1)                                       # gentle soft clip / glue
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.89
    fade = int(0.6 * SR); x[-fade:] *= np.linspace(1, 0, fade)[:, None]
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())


def main():
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['node', os.path.join(HERE, 'export_frames.js'), tmp], check=True)
        events = json.load(open(os.path.join(tmp, 'events.json')))
        print(f'{len(events)} sound cues')
        mix = music() * 0.8 + sfx_track(events)
        wav = os.path.join(HERE, 'soundtrack.wav')
        write_wav(wav, mix)
        out = os.path.join(HERE, 'keep-shooting.mp4')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '30', '-i', os.path.join(tmp, 'f%04d.png'),
                        '-i', wav, '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
                        '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], check=True)
        print('wrote', out)


if __name__ == '__main__':
    sys.exit(main())
