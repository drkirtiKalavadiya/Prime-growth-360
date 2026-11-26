---
name: orange-kinetic-locked
description: Re-create the locked "Orange Kinetic" real-estate reel with a NEW PERSON/FACE while keeping everything else identical (same on-screen text, Poppins font, #FF6600 orange and white colours, sizes, spacing, positions, text-behind-head layering, stretch-blur animations, house-icon slash, black & white moment, punch zooms, whip pan, music bed and sound effects). Use this whenever the user wants "same to same" / "as it is" / "only face change" / "only person change" / "mari face muko" / "replace the person in this reel", uploads a talking-head clip to drop into this reel style, or asks to reuse the orange kinetic, couldn't-sell or six-months-one-year reel. Text, style, animation, SFX and music are locked; only the footage and its timing change.
---

# Orange Kinetic: locked person swap

The user has a finished reel design they love. Your whole job is to **put their footage into it without changing anything else**. Think of the design as a sealed master: the user explicitly asked that text, text style, animation, font, colour, spacing, sound effects and music stay exactly as they are. So resist every urge to "improve", restyle, rewrite captions, rebalance audio or pick new effects. Even good changes break the promise of "same to same".

What *may* change, and only through the scripts:
- the footage (their video → `template/public/input.mp4`)
- the person cut-out (`subject.webm`, generated from their video)
- the **timing** of each locked event, so it lands on the same spoken word in their recording
- the duration

Everything else is sealed by `locked/LOCK.sha256` and checked by `scripts/verify_lock.py`.

## How "only the face changes" works

This is not an AI face-swap onto the original person. The user records **themselves** saying the locked script (`references/script.md`). The skill places their video under the exact same graphics and sound, then shifts each locked event in time to the word it belongs to (`retime.py` aligns their words to the master script). If the user hasn't recorded yet, give them the script from `references/script.md` and the framing tips there before anything else.

## Run it

```bash
SK=<this skill's folder>
bash $SK/scripts/make_reel.sh /path/to/their_video.mp4 /path/to/output/locked_reel.mp4
```

That single command:
0. verifies the lock
1. converts their clip to 1080×1920 / 30 fps (cover-crop, audio kept)
2. cuts the person out with MediaPipe so headlines sit behind their head
3. transcribes word timings and re-times the locked master (falls back to the original timings, `--exact`, if transcription is unavailable)
4. verifies the lock again: the edit may differ from the master only in time values
5. renders with Remotion

Flags: `--exact` keeps the original timings (use when the user deliberately spoke in sync with the original). `--no-subject` puts all text in front (use only if the cut-out cannot run). Env `CHROME=/path/to/chromium` if Remotion can't download its browser (in Claude Code cloud: `CHROME=/opt/pw-browsers/chromium`).

**Requirements:** ffmpeg, Node 18+, Python 3 with `mediapipe opencv-python-headless numpy faster-whisper`. On Linux, MediaPipe also needs `libegl1 libgles2` (apt). Install what's missing, then run. Do not swap in other tools that would change the look.

## Check before you hand it over

- `verify_lock.py` printed **LOCK OK** after retime (the script stops if not).
- `retime.py` reports how many script words matched. Below ~60% means the user didn't follow the script. Tell them which part drifted, and suggest re-recording or `--exact`. Don't edit the text to match what they said, because the text is locked.
- Render 3–4 stills (`npx remotion still Reel out.png --frame=N`) at the big moments (first headline, "couldn't sell", house/B&W, "six months", phone) and look at them. The head should cover the "behind" words, and the captions should sit at chest height. If their framing is very different (head much higher or lower than the original), say so. Recommend re-framing rather than moving graphics, because positions are locked.
- Report: output path, duration, words matched, and anything that looked off.

## When the user asks to change something

Pause, because the lock exists at their request. Confirm they want to break it for this one change. Then:

- **Changing the lock** (e.g. new phone number, new headline word): edit `locked/master_edit.json` (and `locked/master_script.json` if spoken words change), then reseal with `python3 scripts/verify_lock.py --write`. Mention that the reseal makes the new version the locked master.
- Never edit `template/src/edit.json` by hand. `retime.py` regenerates it on every run.

## Files

| Path | Role |
|---|---|
| `locked/master_edit.json` | Sealed design: every text, colour key, size, y-position, layer, zoom, whip, SFX file + volume, music |
| `locked/master_script.json` | Every spoken word with its original time (anchors for re-timing) |
| `locked/LOCK.sha256` | Fingerprints of all locked files |
| `template/` | Remotion project (style.ts = font/colours/animation, components = graphics, public/sfx = sounds + music) |
| `scripts/make_reel.sh` | One-command pipeline |
| `scripts/retime.py` | Moves only time values onto the new recording |
| `scripts/verify_lock.py` | Proves nothing else changed |
| `scripts/transcribe_words.py` | Word timings (faster-whisper) |
| `references/script.md` | The script the user records + where each graphic lands |
