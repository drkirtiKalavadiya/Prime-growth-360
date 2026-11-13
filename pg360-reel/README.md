# Prime Growth 360 — motion-design reel (47 s, 9:16)

A remake of the dark-red "this reel was made with Claude" motion-design style, rebranded for **@primegrowth360**.
It is built only with HTML, CSS and JavaScript. Your Instagram profile on the 3D phone is real code, not a screenshot.

- **Ready video:** `primegrowth360-reel.mp4` (1080×1920, 30 fps, with soundtrack)
- **Live version:** open `index.html` in a browser and tap ▶

## Shots
| Time | Shot |
| --- | --- |
| 0–2.8 s | Close-up of the 3D phone showing your profile; headline "This entire reel was made with Claude." |
| 2.8–5 s | Big red "No": "After Effects." and "Keyframes." get struck through; your logo floats as an app icon |
| 5–12.6 s | Small phone with kinetic text (Grow your Business, SOP, AI, 2000+, 10+ Years, BRANDING) above a glass timeline panel |
| 12.6–16.5 s | Glass code panel: "Claude · Writing the 3D scene", scrolling with motion blur |
| 16.5–20.3 s | Titanium back of the phone turning, then a fast spin with motion blur |
| 20.3–24.5 s | The screen switches off, then is rebuilt from the `ProfileIG.jsx` code |
| 24.5–28.3 s | Red pins on the 4 screen corners, then an extreme close-up (×7.7) of your profile |
| 28.3–34.4 s | `script.json` edit "1,095" → "177K"; the sequence re-renders as a time-lapse |
| 34.4–39 s | "177K of you", "Zero keyframes", "Just direction" |
| 39–47 s | primegrowth360 logo card, lock "The full method", "Comment AI" with an Instagram-style comment reply, final 3D phone |

## Files
| File | What it is |
| --- | --- |
| `index.html`, `reel.css`, `reel.js` | The reel (each frame is a pure function of time) |
| `assets/` | Profile photo, 3 highlights and 9 grid posts, cropped from your screenshots |
| `make_soundtrack.py` | Builds `soundtrack.wav` / `.mp3`: drone, 100 bpm pulse, whooshes on cuts, impacts, riser, UI clicks (no samples) |
| `render.js` | Frame-exact MP4 render: `node render.js` (needs Playwright and ffmpeg) |

## Narration script (to record your own voice-over)
The captions follow this script and timing. Record it, put it in `soundtrack.mp3`, or mix it over the music, and re-render.

| Start | Line |
| --- | --- |
| 0.0 | This entire reel was made with Claude. |
| 2.8 | No After Effects. No keyframes. |
| 5.0 | First, the rhythm. Claude maps every cut and every word to the beat, frame by frame. |
| 12.6 | Then the 3D. Claude writes the whole 3D scene: |
| 16.5 | the phone, the titanium, the light, the motion blur. |
| 20.3 | The screen isn't a picture. It's real code, |
| 24.5 | pinned to the four corners of the phone, so it stays razor sharp. |
| 28.3 | And the type is driven by one file. Change a word, |
| 32.1 | and the whole sequence re-renders. |
| 35.8 | Zero keyframes. Just direction. |
| 40.2 | Want the full method? |
| 41.9 | Comment AI, and we'll send you the link. |

## Editing
In `reel.js`:
- `CAPS`: caption text and times. A `[word]` goes in the red pill.
- `S`: the shots in order.
- `igHTML()`: the profile shown on the phone (name, bio, counts).
- `SLIDES`: the kinetic text.
- To change the comment keyword, replace `AI` in shot 15 and in `CAPS`.
