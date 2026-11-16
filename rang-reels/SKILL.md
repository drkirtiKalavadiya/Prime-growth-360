---
name: rang-reels
description: Makes a premium Gujarati talking-head reel (9:16) in the "Kesar" look: the speaker's own room darkened and warm, a bandhani dot mandala behind the head, cards and big Gujarati words behind the head, captions that land on the spoken word, toran and stamp abstract scenes, synthesised sounds. Use when a creator gives a vertical talking-head clip and wants a Gujarati (or Hinglish) reel in this style.
---

# Rang Reels: how Claude makes a reel

## 1. First message
Ask, in one short message (Gujarati or Hinglish, as the creator writes):
1. The clip (vertical, tripod, chest-up or seated, 10–15 s) and which part to use.
2. The exact words they say (script), so the text is spelled right. Whisper Gujarati makes mistakes.
3. Which elements they want (codes from `README.md`: K card, H headword, C caption, P chips, S stamp, T toran),
   or "you choose".
Add nothing they did not pick.

## 2. Prepare
`npm install` and `pip install -r requirements.txt` once (Linux: `apt-get install libegl1 libgles2`).
Copy `examples/plan_demo.json` next to the clip, set `clip`, `start`, `end`, `output`, remove `matte_video`.
Run `python3 reel.py PLAN.json prep`. If `faster-whisper` is installed it prints the words with times; correct the
spelling in `PLAN_work/words.json` from the creator's script (keep the times).

## 3. Plan
- 4–5 scenes, speaker / abstract / speaker / abstract / speaker, about 2 s each, touching with no gap.
- Only the speaker's words on screen, on the word (`"@word"` references). One accent word per block, 1–3 small
  words on top. The accent is the word that carries the meaning.
- Headword (behind the head): top words + accent only. Card: a title with one `*accent*` and 2–3 rows.
- Toran: 3 short labels (one word each). Stamp: one or two words, near the end of a scene.
- Captions in front sit low (y 1250–1400); chips under them (y ≥ 1600 when a caption is there).

## 4. Stills, then render
`python3 reel.py PLAN.json stills T1 T2 ...` (one time near the end of each scene). Look at every still:
the face is never covered, Gujarati letters joined correctly, text inside the safe zone, the cut-out clean on the
hair and shoulders. Fix the plan, show the stills, wait for the creator's OK.
Then `python3 reel.py PLAN.json render`. Check a contact sheet of the MP4 (every 0.5 s) before sending it.

## 5. When something is wrong
- Hair or shoulders cut: the creator can export a matte from CapCut / another tool and set `matte_video`.
- Text too big: `accent_size` on that element; long accents shrink automatically to fit.
- Room too dark or too bright: `grade.room` (0.4–0.7).
- No sound effects: `"sfx": "off"`.
