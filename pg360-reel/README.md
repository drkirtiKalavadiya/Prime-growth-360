# Prime Growth 360 — motion-design reel (Gujarati voice-over, ~67 s, 9:16)

A remake of the dark-red motion-design reel style for **@primegrowth360**, with your Gujarati ElevenLabs voice-over played at **1.3×**.
It is built only with HTML, CSS and JavaScript. Your Instagram profile on the 3D phone is real code, not a screenshot.

- **Ready video:** `primegrowth360-reel.mp4` (1080×1920, 30 fps, voice + music + sound effects, −14 LUFS)
- **Live version:** open `index.html` in a browser and tap ▶

## Shots (reel time, at 1.3×)
| Time | Voice line | Shot |
| --- | --- | --- |
| 0–2.7 s | આ આખી Reel એક Secret LLM ની મદદથી… | 11-cut 3D montage + Gujarati headline |
| 2.7–6.6 s | After Effects નથી, Manual Keyframes… | Big red "No" + struck-through words |
| 6.6–13 s | સૌથી પહેલાં Rhythm… Frame-by-Frame Match | Small phone with kinetic text + timeline |
| 13–18.4 s | ત્યારબાદ 3D Animation… Blender Scene | Code panel typing, then fast scroll |
| 18.4–22.4 s | Foam, Titanium, Lighting, Motion Blur | Phone back, materials change, spin |
| 22.4–26.8 s | Screen Animation… Real Code છે | Screen off → code → screen on |
| 26.8–31.9 s | ચારેય ખૂણા… હંમેશાં Sharp | Corner pins, then ×1.0 → ×7.7 zoom |
| 31.9–40 s | Typography… એક શબ્દ બદલો… Render | `script.json` edit + re-render time-lapse |
| 40–44.7 s | ન After Effects… Direction… AI ની Power! | "177K of you", "Zero keyframes", "grow with AI" |
| 44.7–48.2 s | Premium 3D AI Videos શીખવું છે? | Logo card, lock card |
| 48.2–51.8 s | નવી Training Batch 1 ડિસેમ્બરથી | Calendar card "DEC 1" |
| 51.8–56.9 s | AI Tools, 3D Animation, Cinematic Editing, Advanced Video Creation | 4-item checklist |
| 56.9–60.2 s | તૈયાર છો? / કોમેન્ટમાં LEARN લખો | "Comment LEARN" + comment typed and answered |
| 60.2–63.5 s | WhatsApp કરો: 84603 72867 | WhatsApp card, number typed with the voice |
| 63.5–67 s | Next Level… | Final 3D phone |

## Files
| File | What it is |
| --- | --- |
| `index.html`, `reel.css`, `reel.js` | The reel (each frame is a pure function of time) |
| `assets/` | Profile photo, 3 highlights and 9 grid posts, cropped from your screenshots |
| `voiceover-original.mp3` | Your ElevenLabs voice-over (1×) |
| `make_soundtrack.py` | Builds `music.wav`: synthesised music (109 bpm beat, drone), whooshes on cuts, impacts, riser, UI clicks |
| `mix.sh` | Builds `soundtrack.mp3`: voice at 1.3× (−15 LUFS) over loud music (−17 LUFS) with a light dip under the voice, master −14 LUFS |
| `render.js` | Frame-exact MP4 render: `node render.js` (needs Playwright and ffmpeg) |

## Rebuild after changes
```
./mix.sh        # voice 1.3x + music + SFX -> soundtrack.mp3
node render.js  # frames + soundtrack -> primegrowth360-reel.mp4
```
Music level: change `I=-17` in `mix.sh` (higher, e.g. -16, = louder music).

## Editing
In `reel.js`:
- `LINES`: every spoken line with its start and end in the 1× voice-over. Captions show the words as they are spoken, and the latest word sits in the red pill.
- `SCN`: which shot plays during which part of the voice, with a time map that lines each animation up with the words.
- `S`: the shots themselves.
- `igHTML()`: the profile on the phone.
- `CAP_TOP`: the subtitle band (y 1450–1550). A dark band behind it keeps subtitles from ever sitting on top of the visuals.
- To change the speed, set `SPEED` in both `reel.js` and `make_soundtrack.py`, and change the `atempo` value.
