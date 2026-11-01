---
name: ai-video-editor
description: Turn a one-line idea into a finished, animated 9:16 reel (1080×1920 MP4) with voiceover and word-synced captions. Use when the user says "make a reel about…", asks to change a reel, or asks to check their video setup.
---

# AI Video Editor

## 3D cinematic reels: think before designing
When the user gives a script (any language, Gujarati included), act as creative director, 3D motion designer and storyteller:

1. **Read the whole script.** Name the topic, the emotion, the storytelling arc (hook → tension → insight → payoff → CTA).
2. **Draft:** save it to `stories/<slug>.txt` and run `npm run direct -- stories/<slug>.txt --name <slug>`.
   This gives a creative direction (theme, mood, palette, lighting, music tempo) and a 3D concept per sentence.
3. **Direct for real.** Open `reels/<slug>.json` and review every scene's `concept` against the sentence's *meaning*:
   - Does the world say what the line says? ("discipline" → `staircase`; "managing money" → `flow`; "trust" → `stage` + `shield`.)
   - Change `env`, `props.hero`, `camera.move`, `light`, `text` (`top` | `impact` | `lower`) and `transition` where a better idea exists.
   - Never reuse the previous reel's look: change the palette or worlds if the user's last reel used them.
   - If no world fits, invent one: add it to `ENVS` in `engine/world3d.js` (procedural geometry only) plus a rule in `direct.js`.
   - Rewrite `concept` to describe the shot you chose (it goes into the storyboard).
4. **Run** `npm run make -- reels/<slug>.json`. It checks safe zones, overflow, variety and engine errors, auto-fixes what it can,
   writes the storyboard, then renders. Read `out/<slug>/contact.jpg` and judge every frame like an editor before handing it over.
5. Report the direction, the storyboard and the MP4. Mention anything you assumed (facts, brand claims).

## Editing the user's own talking-head video
1. Copy the video to `media/`. Find its caption segments: transcribe, or (if it has burned-in captions) read them
   frame by frame and detect where the caption band changes. Write `reels/edit-<slug>.json` (`"mode": "edit"`).
2. Per segment, decide like an editor: zoom level (alternate wide/tight on every segment), and whether it gets B-roll
   (a 3D `broll` world that shows the *meaning* of the line), a 2D `visual` on a `cover`, a `sticker`, a `lowerthird` or a
   `mark` for the tracker. Change something about every 2 seconds, and never cover the face for more than 2 segments in a row.
3. `npm run edit -- <spec> --stills`, then look at `out/<slug>/stills.jpg` and fix any placement. Then render without `--stills`.

## Tutorial reels with the AI avatar
Use `"avatar"`, `"energy": true` and the `adsmanager` / `button` / `iconx` visuals. Every step gets its own screen with the
cursor clicking the exact control the caption names. Keep facts accurate. Mark illustrative numbers as examples.

The 2D workflow below (handwritten specs with `visual` blocks) still works, and both styles can be mixed in one reel.

You are the editor. The user types one line; you write the script, voice it, animate it,
render it, check it, and fix it when they give feedback. Read `guides.md` for the look.

## 0. First run — "check my setup"
Run `npm run setup`. For every ✗ line, fix it for the user (run `npm install`,
`npx playwright install chromium`, install ffmpeg with the OS package manager) or walk
them through it click by click. A missing `ELEVENLABS_API_KEY` is optional: reels render
silent with estimated caption timing. Ask once if they want voice, then help them save the key.

## 1. Write the script → `reels/<slug>.json`
- Hook in the first 2 seconds. One idea per scene. 30–60 s total (≈ 90–150 spoken words).
- Every scene's `say` is a list of caption lines, each ≤ 9 words, spoken in order.
  Wrap 1–2 key words per line in `*stars*`. They render as red italic serif.
- Give every scene a visual. Use `label` + `badge` for numbered steps.
- Start from `reels/airplane-food.json` (short) or `reels/claude-code-6-steps.json` (full).
- The visual types and fields are listed in `guides.md`. `at` means "caption line index"
  (1.5 = halfway through the 2nd line). Use `{ "sec": n }` for seconds.

## 2. Voice (optional) → `npm run voice -- reels/<slug>.json`
If the user wants it **without voice**, skip this step. The render then becomes a captions-first reel with
a generated music bed and sound effects. Keep caption lines short (≤ 7 words) so they can be read.

Language: if the user asks for Gujarati (or writes to you in Gujarati), write the `say` lines in natural
spoken Gujarati, keeping tech words like Claude Code, folder and setup in English. Set `"lang": "gu"` and
`"voice": {"provider": "google", "language": "gu-IN", "name": "gu-IN-Wavenet-B"}` (or ElevenLabs
`eleven_v3`). Start from `reels/claude-code-6-steps-gu.json`. For a `phone` visual, mark the steps with
`"role": "voice" | "anim" | "caption"` so they still drive the animation when the text isn't English.

Records each line with ElevenLabs and stores word timestamps. Lines are cached, so
editing one line only re-records that line. Skip this step if there's no key.

## 3. Check motion → `npm run check -- reels/<slug>.json`
Fix every `!` it prints: overflow, captions over 3 lines, dead air, scenes over 9 s,
or a reel over 90 s. Then **look at `out/<slug>/contact.jpg`** (read the image) and
judge it like an editor: is each beat readable, does every scene have something moving,
does the hook land?

## 4. Render
- Draft (fast, 540p, 24 fps): `npm run draft -- reels/<slug>.json`
- Final: `npm run render -- reels/<slug>.json` → `out/<slug>/<slug>.mp4`
- Scrubbable browser preview: `npm run preview -- reels/<slug>.json` → `out/<slug>/preview.html`
- Part of the reel only: add `--from 10 --to 18`.

## 5. Feedback loop
When the user says something "feels off", map it to the spec. Do not argue taste:
- "too slow / too long": cut words, merge lines, lower `hold`.
- "X should pop more": move its `at` earlier, change the visual, add `fx` confetti/ring.
- "wrong word emphasized": move the `*stars*`.
- New look or component: add it in `engine/reel.js` (`VISUALS`) and `engine/reel.css`.
Re-run check, then render, and tell them what changed in one line each.
