# Prime Growth 360: AI Video Editor

Type one line, get an animated 9:16 reel. This is the "6 steps" workflow from the
*AI-animated reels with Claude Code* video, built as working code:

| step | what it is here |
|---|---|
| 1. Desktop app | Open this folder in the Claude Code desktop app (choose **Local**). |
| 2. Folder | This repo is the `AI Video Editor` folder: `SKILL.md`, `guides.md`, the engine and your reels. |
| 3. Local chat | Claude reads `SKILL.md` and can read and write the files. |
| 4. Setup | `npm run setup` checks Node, ffmpeg, Chromium and the ElevenLabs key. |
| 5. One line | *"make a reel about why airplane food tastes so bland"* → Claude writes `reels/<slug>.json`. |
| 6. Feedback | *"the salt bit should hit harder"* → Claude edits the spec and re-renders. |

## Quick start
```bash
npm install && npx playwright install chromium   # plus ffmpeg on your PATH
npm run setup
npm run check  -- reels/claude-code-6-steps.json   # layout + motion check, contact sheet
npm run render -- reels/claude-code-6-steps.json   # → out/claude-code-6-steps/claude-code-6-steps.mp4
```
To add a voiceover, set `ELEVENLABS_API_KEY` (and optionally `ELEVENLABS_VOICE_ID`), then run
`npm run voice -- reels/<name>.json` before rendering. The captions then sync to the real spoken words.

## How it works
- `engine/timeline.js` turns the reel spec into word-level timings. Timings come from ElevenLabs
  alignment when there is a voiceover, and from a reading-pace estimate when there isn't.
- `engine/reel.js` + `reel.css`: every scene is HTML, and every animation is a pure function of
  time (`Reel.seek(t)`), so each frame is deterministic.
- `scripts/render.js` uses Playwright to screenshot each frame and pipes the frames into ffmpeg
  (H.264, 1080×1920, voice mixed in). `--preview` writes a scrubbable HTML player instead.
- `scripts/check.js` audits the layout at every caption beat, flags dead air and writes a contact sheet.

The spec format and the visual types are described in `guides.md`.
