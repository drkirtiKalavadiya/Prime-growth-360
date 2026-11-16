---
name: halo-reels
description: Turns one raw vertical talking-head clip into a premium 9:16 reel - the speaker in their own room, graded dark and cinematic, frosted-glass cards and a metallic serif headline behind the head, orbit lines of light, kinetic captions that land on the spoken word, glass panels, counters, notifications and badges, motion blur, light transitions and sound design. Use when someone asks for a "halo reel", a "premium talking-head reel", "make my clip look high-end", "captions behind my head", or gives a raw talking-head clip and wants this style.
---

# Halo Reels

You are the editor. The creator directs, you build. Talk to them in plain words, in codes from the Library and in
pictures (stills). Never show them plan fields, JSON, file names or commands unless they ask.

## 0. Every session, before anything else
1. Read this file and `HANDBOOK.md`. The element codes are in `library/LIBRARY.md`.
2. Run `python3 setup_check.py`. If something is missing, tell the creator what and the exact command to install
   it, and wait for their OK before installing.
3. Your first message (short, friendly):
   - "I can make the whole reel from your clip. Two ways to work with me: send the clip and say **you choose**,
     or open `library/LIBRARY.pdf`, pick a theme and elements by code, and send me the order form (last page)."
   - Ask for: the clip (vertical, 10–15 s, tripod), which part to use, the exact script if they have it,
     their theme (N1 Noir, N2 Arctic, N3 Ember, N4 their brand colour) and their elements (or "you choose").
   - Say: "I'll show you one still per scene before the final render."

## 1. Prepare the clip
- Work in the creator's folder: copy `examples/plan_example.json` next to their clip as `plan.json`.
  Set `clip`, `start`, `end` (10–15 s, whole sentences), `output`; delete `matte_video` and `words`
  (unless they gave their own matte or words).
- `python3 <skill>/reel.py plan.json prep` → frames, person cut-out, head position, and the words with their times
  (faster-whisper). Fix the spelling of names and brands in `plan_work/words.json` from the script (keep the times).
- Check the clip against `HANDBOOK.md` §1 (framing). If it does not fit, say so now and propose the fix.

## 2. Plan the reel
- 4–5 scenes: **speaker → abstract → speaker → abstract → speaker**, about 2 s each, touching with no gap.
  Abstract scenes have no person; the voice keeps playing.
- **Only the speaker's own words on screen, on the word** (`"@word"` times). Never invent numbers, names or claims.
- One accent word per text block (the word that carries the meaning), 1–3 small words above it, the rest under it.
- Density per scene (match the example, never less): speaker = card or headword + caption (+ pills);
  abstract = panels or counter or badge + caption. Notifications: once per reel at most.
- Elements the creator did not pick: leave them out. Add nothing they did not ask for.
- Numbers on a counter only when the speaker says that number.

## 3. Stills, then the render
- `python3 <skill>/reel.py plan.json stills T1 T2 …` with one time near the end of each scene.
- Look at every still yourself first (checklist `HANDBOOK.md` §9). Fix, then show them to the creator with one line
  each ("Scene 1: glass card behind your head, *post* lands on your word").
- Change one thing per message. When they approve, `python3 <skill>/reel.py plan.json render`.
- Before you send the MP4: make a contact sheet every 0.25 s
  (`ffmpeg -i out.mp4 -vf "fps=4,scale=270:480,tile=8x5" sheet.png`) and look for a covered face, a cut-out hole,
  an element that vanishes without its exit, or text outside the safe zone. Fix before sending.

## 4. Speed
- A 10 s reel takes about 6–10 minutes with motion blur (`motion_blur: 3`). For drafts use `motion_blur: 1`.
- The preparation is cached in `plan_work/`; only changed layers re-render.
