---
name: ai-video-editor
description: Turn a one-line idea into a finished, animated 9:16 reel (1080×1920 MP4) with voiceover and word-synced captions. Use when the user says "make a reel about…", asks to change a reel, or asks to check their video setup.
---

# AI Video Editor

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

## 2. Voice → `npm run voice -- reels/<slug>.json`
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
