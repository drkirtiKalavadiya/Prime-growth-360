# Chasing Someone Else's Life: a motion-graphics reel in code

A 27-second vertical reel (1080×1920, 30 fps) about envy:

> a supercar driver envies a helicopter → an SUV driver envies the supercar → a sedan driver envies the SUV → a walker envies them all → a wheelchair user just wishes they could walk.
> **"Chasing someone else's life blinds you to the beauty of your own."**

Every visual is drawn in code with the HTML5 Canvas 2D API: the vehicles, the traffic light, the characters, the reflections, the glow and the typography. There are no image files, no stock footage and no samples. The soundtrack is synthesised with ffmpeg.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Browser preview with play/pause, a scrubber, loop, and Space / ← / → keys |
| `art.js` | All vector artwork: supercar, SUV, sedan, helicopter, traffic light, walker (procedural walk cycle), wheelchair, watermark |
| `effects.js` | Easing, spring settle, the mirrored floor reflection, kinetic typography, vignette, film grain, dip-to-black |
| `scene.js` | The `TIMELINE` config and the director `render(ctx, t)`. Every frame is a pure function of time |
| `render.js` | Headless Chromium (Playwright) renders each frame and pipes it to ffmpeg (H.264) |
| `audio.sh` | Generates an ambient pad plus SFX (light-change clicks, rotor flutter, end chime) and muxes it in |
| `out/chasing-life.mp4` | The finished video |

## Preview

Open `index.html` in any modern browser by double-clicking it. Add `?t=12` to jump to a time.

## Render the MP4

```bash
node animations/chasing-life/render.js     # → out/chasing-life-silent.mp4 (about 75s)
bash animations/chasing-life/audio.sh      # → out/chasing-life.mp4 (adds the soundtrack)

# use your own licensed music instead of the synth pad:
bash animations/chasing-life/audio.sh out/chasing-life-silent.mp4 out/final.mp4 my-music.mp3
```

Requirements: Node 18+, `playwright` with Chromium, and `ffmpeg`.

## Customise

Everything is in the `TIMELINE` object at the top of `scene.js`:

- **Captions:** `captions[]`. Change the `text`, the `in` time (when typing starts) and the `out` time (when it fades out).
- **End card:** `endCard.lines`.
- **Car timing:** `supercar` / `suv` / `sedan`. `t0`→`t1` is the arrival, `x` is where the car stops and `leave` is when it pulls away on green.
- **Traffic light:** `amberAt`, `greenAt`.
- **Scene cuts:** `sceneCut` (street → wheelchair) and `endCut` (→ end card).
- **Watermark:** `drawWatermark()` in `art.js`.

To make a different story, add a new draw function to `art.js` and push it into the object list in `scene.js`. Reflection, glow, camera and grain are applied automatically.
