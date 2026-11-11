# Story Reel Studio

An animated 9:16 "business success story" reel, about 67 seconds long, built in plain HTML, CSS and JavaScript with no build step.
It recreates the style of the *₹1 candy that crushed Coke's record* reel:

| Effect | Where it is used |
| --- | --- |
| Ken Burns camera (slow push-in, pull-back, tilt-up, pan, rotate) | every photo scene |
| Letter-by-letter "typing" text with pop-up glyphs, yellow-lime gradient | `2015`, `20 Million Candies` |
| Number counters | `2 → 8 Months`, `66 → 86%`, `+28 → +35 Lakhs`, `₹9,805 → ₹10,000+ Crore` |
| Neon green outlined money text | `₹100 Crore`, `₹10,000+ Crore`, `₹0.50` |
| Yellow name tag sliding open | `RAJIV KUMAR` |
| Bouncing cyan question mark | the Coke executive |
| Product drop with spin and bounce | the candy on the table and on the scale |
| Neon box drawn around the shelf, highlighter sweep on the whiteboard | shop shelf, whiteboard |
| Green flavour explosion (glow core, shards, light streaks) | the "taste" moment |
| Warm wooden table with sun rays and floating dust | opening, 66% and closing scenes |
| Transitions: punch zoom, whip pan, foreground pillar wipe, glass shatter, flash, slide, glow | between scenes |
| Like / Subscribe / bell bar with an animated cursor | outro |

## Run it

The page has to be served over `http://`: browsers block video export for images opened straight from disk.

```bash
cd reel
python3 -m http.server 8000      # or: npx serve
# open http://localhost:8000
```

- **Space** plays or pauses. **← / →** jump one second. Click a scene in the list to jump to it.
- **Add scene images** lets you pick photos from your computer (they are not uploaded anywhere).
- **Add voice-over / music** plays an audio file in sync and records it into the video. An `.mp4` works too: its soundtrack is used.
- **Record video** records in real time and downloads `reel.mp4` (Chrome or Edge) or `reel.webm` (Firefox).

## Images

Each scene loads `assets/<name>.jpg` (or `.png`, `.webp`, `.jpeg`); the names are listed in [`assets/README.md`](assets/README.md).
Scenes without an image fall back to a built-in drawn background (wood, sky and tower, office, shop shelves, kitchen, whiteboard, logo wall), so the reel always plays.
Transparent `candy.png` and `toffee.png` replace the drawn product packs.

To use stills from the original video:

```bash
reel/tools/extract-frames.sh path/to/original-reel.mp4    # writes assets/02.jpg … assets/24.jpg
```

Frames taken from a finished reel already contain that reel's burned-in text, so some captions will show twice.
Use clean source photos where you have them, or remove the matching overlay from `js/scenes.js`.
Only use photos, logos and footage you have the rights to.

## Render a frame-exact MP4 (optional)

Real-time recording depends on the browser keeping up. For a frame-exact 1080×1920 file, render it headlessly:

```bash
npm i -D playwright        # once; ffmpeg must be installed
node reel/tools/render.mjs --out reel.mp4 --width 1080 --audio voiceover.mp3
```

`--from` and `--to` (in seconds) render only part of the reel.

## Make your own story

Everything is defined in [`js/scenes.js`](js/scenes.js): durations, transitions, camera moves, captions and numbers.
For example, this is the `₹100 Crore` scene:

```js
{
  dur: 2.4, enter: 'zoom',
  bg: { img: '20', fallback: 'office', from: { s: 1.06 }, to: { s: 1.0 } },
  fx: [{ type: 'text', text: '₹100', sub: 'Crore', t: 0.2, x: 0.69, y: 0.63, size: 0.11, style: 'neon', anim: 'pop' }]
}
```

- Positions `x` and `y` are fractions of the frame (0 to 1). `size` is a fraction of the frame width. `t` is seconds from the start of the scene.
- **Overlay types:** `text`, `counter`, `pill`, `sprite`, `box`, `marker`, `burst`, `flash`, `dust`, `subscribe`.
- **Text styles:** `lime`, `neon`, `white`, `silver`, `cyan`, `yellow`. **Animations:** `type`, `pop`, `rise`.
- **Transitions (`enter`):** `cut`, `zoom`, `whip`, `pillar`, `shatter`, `flash` (with an optional `color`), `slideUp`, `glow`.
- `brand` at the top of the file sets the label on the drawn candy pack and the logo-wall text.

## Files

```
reel/index.html          Studio page (preview, timeline, export)
reel/reel.css            Studio styles
reel/js/engine.js        Canvas renderer: camera, text styles, overlays, transitions
reel/js/scenes.js        The storyboard
reel/js/app.js           Player UI, image/audio loading, MediaRecorder export, headless hooks
reel/tools/render.mjs    Frame-exact MP4 render (Playwright + ffmpeg)
reel/tools/extract-frames.sh   Pull one still per scene from a source video
reel/assets/             Your scene images
```
