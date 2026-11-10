# 5 Mindset Rules — coded animation

A 54-second vertical short (720×1280, 30 fps) in a hand-drawn **ink sketch + watercolor on paper** style, built entirely in code (SVG + JavaScript). No image or video assets: every character, prop, wash and effect is drawn by `js/art.js`.

| Path | What it is |
| --- | --- |
| `index.html` | Open in a browser to preview. Play button + scrubber. |
| `js/engine.js` | Timeline engine. Each frame is a pure function of time: `MV.renderAt(t)`. Tweens: opacity, move, scale, rotate, **stroke draw-on**, **watercolor wash-in**, wipe reveals, blur/brightness. |
| `js/art.js` | Art library: paper/wood textures, watercolor & rough-ink filters, glows, the blue ballpoint pen, faces, busts, helmets, hair, figures, mountain, stairs, hourglass, chessboard, scrolls, padlock, trophy, mask, arrows… |
| `js/scenes.js` | The timeline: all 7 sequences / 32 shots with exact timings. |
| `render/render.js` | Frame-exact export (Playwright → ffmpeg). |
| `render/audio.py` | Synthesized original soundtrack (pad, impacts, whooshes, sparkles). |
| `render/build.sh` | Builds everything: video, soundtrack, final MP4, storyboard. |
| `storyboard/` | `storyboard.html` (shot cards), `storyboard.png`, `shots.json` (the shot list). |
| `output/5_mindset_rules.mp4` | The rendered video. |

## Style rules (shared by every scene)
- **Paper:** warm off-white with grain + fibre noise; wooden desk and paper stack for the intro, full sheet afterwards; soft vignette.
- **Titles:** handwritten small caps (Patrick Hand SC) with a hand-drawn underline, written on left to right.
- **Ink:** dark indigo-black outlines, round caps, a slight wobble filter on everything, hatching for shadows.
- **Watercolor:** indigo / slate / lavender / ochre blobs with displaced edges and pigment granulation, blooming in after the lines.
- **Accents:** electric-blue glows for rule numbers and focus moments, gold for fire, trophy and subscribe.
- **Pen:** a blue ballpoint always rests in the bottom-right corner.

## Timeline
| Time | Sequence |
| --- | --- |
| 0.00 | Intro: title, warrior kneels in rain then rises; five scrolls; fire padlock "5" |
| 7.30 | Eyes close-up |
| 9.10 | Rule 1: Daily steps |
| 17.93 | Rule 2: Patience Wins |
| 27.00 | Rule 3: Kill the fear |
| 35.90 | Rule 4: Laser Focus |
| 45.10 | Rule 5: Master Your Mind → UNDEFEATABLE → Subscribe |

## Build
Needs Node with Playwright (Chromium), Python 3 with NumPy, and ffmpeg.
```bash
./render/build.sh
```
To add a voice-over, mix it over `output/soundtrack.wav` before the final mux, or replace the soundtrack entirely.
