# Orange Kinetic reel template (Remotion)

Re-creates the reference reel's exact look: Poppins captions, orange (#FF6600) and white kinetic headlines **behind the speaker's head**, house-icon strike, black & white moment, punch zooms, whip pan, music bed and SFX.
**Swap the video and the words. Everything else stays the same.**

See **BREAKDOWN.md** for the frame-by-frame analysis.

## One-time setup

```bash
cd reel-template
npm install
pip install mediapipe opencv-python-headless numpy   # for the person cut-out
python3 scripts/make_sfx.py                           # builds public/sfx/*.wav (already included)
```
You need `ffmpeg` installed.

## Make a new reel (new face, same style)

1. **Put your video** at `public/input.mp4` (9:16 talking head).
2. **Cut out the speaker** (text goes behind the head):
   `npm run matte` → writes `public/subject.webm` (transparent background).
3. **Auto captions:** `npm run transcribe` → fills `captions` and `durationSec` in `src/edit.json`.
4. **Place the big moments** in `src/edit.json`, using the times printed by step 3:
   - `headlines`: pick 4–5 key phrases. Give each a start/end and lines (`color` orange for the key word, `behind: true` for words that should go behind the head). **Delete caption words that fall inside a headline's time.**
   - `phone`: your number/handle and when it shows.
   - `houseStrike`: the "doesn't sell / wrong" moment (draw → slash → B&W). Remove the block if you don't need it, or swap the icon path in `HouseStrike.tsx`.
   - `zooms` (punch in/out every 3–6 s), `whips` (angle changes), `sfx` (keep a boom on every zoom and headline).
5. **Preview:** `npm run studio` (scrub and tweak live).
6. **Render:** `npm run render` → `out/reel.mp4` (1080×1920, 30 fps).

No cut-out? Set `"subject": ""` and all text renders in front.

## Where things live

| File | What |
|---|---|
| `src/style.ts` | Font, colours, caption size/position, text animation timings, colour grade |
| `src/edit.json` | Per-video timeline (the only file you change per video) |
| `src/components/Headlines.tsx` | Stacked kinetic words (stretch-blur in, drift-up out) |
| `src/components/Captions.tsx` | One-word pop captions |
| `src/components/HouseStrike.tsx` | House draw-on + diagonal slash + B&W |
| `src/components/Phone.tsx` | Orange CTA with light sweep |
| `src/components/camera.ts` | Punch zooms + whip pan |
| `scripts/make_sfx.py` | Synth SFX + music pad (replace any wav with your licensed sound, same name) |
| `scripts/make_matte.py` | MediaPipe person cut-out → `subject.webm` |
| `scripts/transcribe.mjs` | whisper.cpp word timings → `edit.json` |
