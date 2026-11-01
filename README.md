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

## Pro edit for talking-head videos
```bash
npm run edit -- reels/edit-paisa-kem-nathi-bachta.json --stills   # quick look: one frame per segment
npm run edit -- reels/edit-paisa-kem-nathi-bachta.json            # full render
```
Put your raw video in `media/` (git-ignored). The edit spec lists the caption segments (text + timing) and what happens
in each one:
- **Footage:** crop (e.g. to remove old burned-in captions) and zoom punches in/out at every segment.
- **Captions:** auto pop captions, 3 words at a time, with the spoken word highlighted.
- **B-roll:** full-screen 3D worlds or 2D motion graphics as cutaways.
- **Graphics:** stickers, lower-thirds, and a progress tracker (e.g. "ભૂલ 1 · 2 · 3").
- **Audio:** your voice cleaned up, music that ducks when you speak, and sound effects on every cut, at least every 3 seconds.

## AI avatar + energetic tutorial reels
Add `"avatar": {...}` to any reel for a talking presenter. Its mouth follows the caption words (or the real voiceover
timings), it blinks, and it changes gesture every 2 seconds. `"energy": true` adds zoom punches and a sound effect on every
caption line. The `adsmanager` visual walks through Ads Manager (Create → Objective → Budget → Audience → Placements →
Creative → Publish → Results) with an animated cursor. Example: `reels/meta-ads-step-by-step-gu.json`.

## 3D creative reels: one script → one cinematic reel
```bash
npm run make -- stories/paisa-ane-safalta-gu.txt     # direct → check → auto-fix → storyboard → render
```
Under the hood:
- `scripts/direct.js` reads the script, decides a creative direction (theme, mood, palette, lighting, music tempo) and maps
  every sentence to a 3D world: city, vault, money flow, staircase, mountains, cosmos, tech grid, molecules, network, or a
  hero on a stage (trophy, gift, chart, rocket, shield, lock, bulb, key).
- Each scene gets its own camera move, lighting and text position. A seed from the script text means a new script gives a new look.
- Three.js renders the worlds behind the existing caption layer, with Gujarati typography, Instagram safe zones,
  a contrast scrim and cinematic transitions.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Sample: `stories/paisa-ane-safalta-gu.txt` → `reels/paisa-ane-safalta-gu.json`.

## Quick start
```bash
npm install && npx playwright install chromium   # plus ffmpeg on your PATH
npm run setup
npm run check  -- reels/claude-code-6-steps.json   # layout + motion check, contact sheet
npm run render -- reels/claude-code-6-steps.json   # → out/claude-code-6-steps/claude-code-6-steps.mp4
```
**No voice needed.** Without a voiceover the reel is captions-first: every line gets extra reading time,
and the audio is a soft music bed plus pop/whoosh effects on scene cuts. ffmpeg generates all of it,
so there's nothing to download and no licence to clear. Loudness is normalized to -15 LUFS.
Use `--no-music`, `--no-sfx` or `--silent` (or `"music": false` / `"sfx": false` in the spec) to turn these off.

To add a voiceover, set `ELEVENLABS_API_KEY` (and optionally `ELEVENLABS_VOICE_ID`), then run
`npm run voice -- reels/<name>.json` before rendering. The captions then sync to the real spoken words.

## Gujarati voice (ગુજરાતી)
`reels/claude-code-6-steps-gu.json` is the full reel in Gujarati. Set `"lang": "gu"` on any reel to get
Gujarati-ready fonts (Hind Vadodara, Noto Serif Gujarati, Baloo Bhai 2) and taller caption lines.
Its `"voice"` block chooses the speaker:

```jsonc
"voice": { "provider": "google", "language": "gu-IN", "name": "gu-IN-Wavenet-B", "rate": 1.05 }
```

| provider | key | Gujarati voices | caption sync |
|---|---|---|---|
| `google` (recommended for gu) | `GOOGLE_TTS_API_KEY` | `gu-IN-Standard-*`, `gu-IN-Wavenet-*`, `gu-IN-Chirp3-HD-*` | exact per word (SSML marks); Chirp3-HD spreads times by word length |
| `elevenlabs` | `ELEVENLABS_API_KEY` | any voice on the `eleven_v3` model (auto-picked for Indic languages) | exact, from character alignment |

```bash
export GOOGLE_TTS_API_KEY=...        # Cloud console → enable Text-to-Speech API → Credentials → API key
npm run voice  -- reels/claude-code-6-steps-gu.json
npm run render -- reels/claude-code-6-steps-gu.json
```
Override from the command line with `--provider elevenlabs --voice <id>`, `--voice gu-IN-Wavenet-A`, or `--rate 1.1`.

## How it works
- `engine/timeline.js` turns the reel spec into word-level timings. Timings come from ElevenLabs
  alignment when there is a voiceover, and from a reading-pace estimate when there isn't.
- `engine/reel.js` + `reel.css`: every scene is HTML, and every animation is a pure function of
  time (`Reel.seek(t)`), so each frame is deterministic.
- `scripts/render.js` uses Playwright to screenshot each frame and pipes the frames into ffmpeg
  (H.264, 1080×1920, voice mixed in). `--preview` writes a scrubbable HTML player instead.
- `scripts/check.js` audits the layout at every caption beat, flags dead air and writes a contact sheet.

The spec format and the visual types are described in `guides.md`.
