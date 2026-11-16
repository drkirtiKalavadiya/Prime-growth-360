# Rang Reels (prototype)

Gujarati-first premium talking-head reels. One raw vertical clip and one plan file in, one finished 9:16 MP4 out:
the speaker in their own room, darkened and warm, with a **bandhani dot mandala** glowing behind the head,
cards and big words behind the head, **Gujarati text that lands on the spoken word**, abstract scenes with a
**toran** and a **stamp**, synthesised sound effects and a −14 LUFS mix.

**Two themes** (`"theme"` in the plan):
- **`luxe`** (default, premium): black glass and champagne gold. Real frosted glass over the speaker's own room,
  gold serif Gujarati (Noto Serif Gujarati) with a travelling light sweep and a feathered reveal, words that rise out
  of a line mask with blur-to-sharp, tilted orbit lines with travelling light behind the head, gold bokeh at three
  depths, 3D glass panels flying in from depth, a gold seal with a rotating text ring, motion blur on every frame,
  zoom-blur + light-flash transitions, a slow camera push, split-tone grade and light leaks. `"accent": "#hex"`
  changes the gold.
- **`kesar`**: festive maroon and saffron with bandhani dots, toran and a rubber stamp.

Everything here is original: the "Kesar" look, the elements, the code and the sounds (synthesised in
`rangreels/sfx.py`, nothing downloaded). Fonts are Baloo Bhai 2 and Noto Sans Gujarati (SIL OFL, via npm).

## Quick start

```bash
cd rang-reels
npm install                                   # Gujarati fonts
pip install -r requirements.txt               # Linux: also apt-get install libegl1 libgles2
python3 tests/make_test_clip.py tests/out     # a synthetic test clip + its matte
python3 reel.py examples/plan_luxe.json stills 1.9 3.9 6.2   # check stills first
python3 reel.py examples/plan_luxe.json render               # -> examples/luxe_reel.mp4 (premium)
python3 reel.py examples/plan_demo.json render               # -> examples/demo_reel.mp4 (kesar)
```

With a real clip: set `"clip"` in the plan and leave `"matte_video"` out (the person cut-out is then made with
MediaPipe). Run `python3 reel.py PLAN.json prep` first: it prepares the clip and prints the words with their times
(when `faster-whisper` is installed).

## How it works

```
clip ─► frames 1080×1920 + audio ─► words.json ─► person matte ─► head position
                                                       │
plan.json ─► word refs resolved ─► stage.html in headless Chromium ─► BACK + FRONT layers (RGBA)
                                                       │
room (dark, warm) ► BACK ► person + kesar rim light ► camera zoom ► shade ► FRONT ► cut shake ► grain ─► MP4
```

| Part | File |
|---|---|
| Plan loading, word references (`"@ગ્રોથ#2.e+0.1"`), rules | `rangreels/plan.py` |
| Frames, audio, words, MediaPipe matte (guided filter + temporal smoothing), head track | `rangreels/prep.py` |
| Graphics engine (DOM + SVG + canvas, deterministic per frame) | `engine/stage.html`, `stage.css`, `stage.js` |
| Layer renderer (Playwright / Chromium, transparent screenshots) | `engine/render_layers.mjs` |
| Compositing, camera, encoding | `rangreels/compose.py` |
| Synthesised sound effects and auto cues | `rangreels/sfx.py` |
| Command line | `reel.py` → `rangreels/cli.py` |

Browser rendering is used because Chromium shapes Gujarati correctly (conjuncts and matras); plain PIL text
breaks them without libraqm.

## The plan

Times are reel seconds (0 = `start` in the clip) or word references from `words.json`:
`"@ગ્રોથ"` start of the word · `"@ગ્રોથ#2"` second occurrence · `"@ગ્રોથ.e"` its end · `"@ગ્રોથ+0.1"` offset.

```json
{ "clip": "raw.mp4", "start": 0, "end": 10, "fps": 30, "output": "reel.mp4",
  "camera": {"open_zoom": 1.12, "open": [0, 0.9], "key": {"zoom": 1.1, "in": [4.4, 5.3], "out": [6.3, 6.6]}},
  "segments": [
    {"kind": "speaker", "from": 0, "to": 2.4, "elements": [ ... ]},
    {"kind": "abstract", "from": 2.4, "to": 4.4, "elements": [ ... ]} ] }
```

Optional keys: `theme` (`luxe` | `kesar`), `accent`, `motion_blur` (sub-frames per frame, luxe default 3; 1 for quick drafts), `camera.push`, `matte_video` (your own matte, white = person), `words`, `language` (default `gu`),
`grade.room` (0.5 = how dark the room gets), `sfx` (`"auto"` or `"off"`), `max_length` (default 15 s).

### Elements (library codes)

| Code | `el` | Where | Fields |
|---|---|---|---|
| **R** | `ring` | speaker, behind the head | automatic; `"ring": false` on the segment turns it off |
| **G** | `glow` | speaker, behind everything | automatic; `"glow": false` turns it off |
| **K** | `card` | speaker, behind the head | `title` (`*accent*`), `rows` [[label, t], ...], `kicker` (luxe), `x`, `y` |
| **H** | `headword` | speaker, behind the head | `top` [[word, t]], `accent` [word, t] (no bottom line: the head would hide it) |
| **C** | `caption` | any, in front | `top`, `accent`, `bottom`, `y` (centre), `accent_size`, `small_size` |
| **P** | `chips` | any, in front | `items` [[label, t], ...], `y` |
| **S** | `stamp` / `badge` | any, in front | `text`, `t`, `x`, `y`, `rotate`, `size`; luxe: `ring` (text round the seal), `scale` |
| **T** | `toran` / `panels` | abstract, background | `items` [[label, t], ...] (3–4), `y`; luxe draws 3D glass panels |
| **B** | `bandhani` | abstract | automatic background of every abstract scene |

Every element also takes `out` (fade out at that time); otherwise it stays until the scene cut.

## Rules every reel keeps
- Only the speaker's own words, on the word. One accent word per block.
- Nothing on the face; everything inside x 90–990, y 170–1750.
- Speaker and abstract scenes touch with no gap; 15 s at most.
- Stills first, then the full render.

## Status
Prototype. Tested end to end on the synthetic clip: kesar 10 s reel in about 4–5 minutes, luxe (3× motion blur)
in about 8 minutes on 2 CPUs; −14 LUFS. Next: test on real Gujarati recordings, tune the matte on hair, more themes, a buyer PDF library.
