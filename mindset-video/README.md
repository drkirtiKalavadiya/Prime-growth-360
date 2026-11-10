# 5 Mindset Rules — coded animation

A 66-second vertical short (1080×1920, 30 fps) synced to a Gujarati voice-over, in a hand-drawn **ink sketch + watercolor on paper** style, built entirely in code (SVG + JavaScript). No image or video assets: every character, prop, wash and effect is drawn by `js/art.js`.

| Path | What it is |
| --- | --- |
| `index.html` | Open in a browser to preview. Play button + scrubber. |
| `js/engine.js` | Timeline engine. Each frame is a pure function of time: `MV.renderAt(t)`. Tweens: opacity, move, scale, rotate, **stroke draw-on**, **watercolor wash-in**, wipe reveals, blur/brightness. |
| `js/art.js` | Art library: paper/wood textures, watercolor & rough-ink filters, glows, the blue ballpoint pen, faces, busts, helmets, hair, figures, mountain, stairs, hourglass, chessboard, scrolls, padlock, trophy, mask, arrows… |
| `js/scenes.js` | The timeline: 6 sequences / 30 shots, timed to the voice-over (rule starts 9.76 · 19.68 · 27.89 · 37.17 · 46.93s). |
| `render/render.js` | Frame-exact export (Playwright → ffmpeg). `SCALE=1.5` renders 1080×1920. |
| `render/render_parallel.sh` | Splits the render across N workers and joins the parts. |
| `render/mix.sh` | Voice sped to 1.3× and loudness-normalised (-16 LUFS), music ducked under the voice, SFX track. |
| `render/audio.py` | Synthesized music bed and SFX: one effect on every 2-second beat (thunder, paper, pen, whoosh or shimmer depending on the scene) plus accents on story moments. |
| `render/build.sh` | Builds everything: video, soundtrack, final MP4, storyboard. |
| `storyboard/` | `storyboard.html` (shot cards), `storyboard.png`, `shots.json` (the shot list). |
| `output/5_mindset_rules_1080x1920.mp4` | The final video with voice, music and SFX. |
| `output/voiceover_original.mp3` | The source voice-over (normal speed). |

## Style rules (shared by every scene)
- **Paper:** warm off-white with grain + fibre noise; wooden desk and paper stack for the intro, full sheet afterwards; soft vignette.
- **Titles:** handwritten small caps (Patrick Hand SC) with a hand-drawn underline, written on left to right.
- **Ink:** dark indigo-black outlines, round caps, a slight wobble filter on everything, hatching for shadows.
- **Watercolor:** indigo / slate / lavender / ochre blobs with displaced edges and pigment granulation, blooming in after the lines.
- **Accents:** electric-blue glows for rule numbers and focus moments, gold for fire, trophy and subscribe.
- **Pen:** a blue ballpoint always rests in the bottom-right corner.

## Timeline (voice-over at 1.3×)
| Time | Sequence | Voice-over |
| --- | --- | --- |
| 0.00 | Hook: kneeling warrior rises; five scrolls; fire padlock "5" | ઇતિહાસના 5 સૌથી શક્તિશાળી… |
| 9.76 | Rule 1: Daily Steps — Alexander the Great | નિયમ 1: એલેક્ઝાન્ડર ધ ગ્રેટ |
| 19.68 | Rule 2: Patience Wins — Napoleon Bonaparte | નિયમ 2: નેપોલિયન બોનાપાર્ટ |
| 27.89 | Rule 3: Kill the Fear — Julius Caesar | નિયમ 3: જુલિયસ સીઝર |
| 37.17 | Rule 4: Laser Focus — Miyamoto Musashi | નિયમ 4: મિયામોટો મુસાશી |
| 46.93 | Rule 5: Master Your Mind — Marcus Aurelius → UNDEFEATABLE → Subscribe | નિયમ 5: માર્કસ ઓરેલિયસ |

## Build
Needs Node with Playwright (Chromium), Python 3 with NumPy, and ffmpeg.
```bash
./render/build.sh                 # uses output/voiceover_original.mp3
./render/build.sh my_voice.mp3    # or another voice file
```
If you change the voice-over, update the rule start times at the top of `js/scenes.js` (and in `render/audio.py`).
