# Architecture: the 3D creative reel engine

**One script → one creative direction → one cinematic reel.**

```
stories/<script>.txt
      │  scripts/direct.js           ① analyse (language, themes, sentences)
      ▼                              ② direct  (palette, lighting family, typography rhythm, music bpm/key)
reels/<slug>.json                    ③ map     (each sentence → visual concept → 3D world, hero, camera, light)
      │  Claude reviews concepts     ④ vary    (seeded by the script; no repeated composition)
      ▼
scripts/check.js                     layout, Instagram safe zones, caption length, variety, engine errors
      │  scripts/make.js             auto-fix loop (text position, line splits, camera moves)
      ▼
scripts/storyboard.js                one frame per scene + concept + world + camera + transition
      ▼
scripts/render.js                    Playwright: Reel.seek(t) → screenshot → ffmpeg (H.264 1080×1920)
                                     + soundtrack.js (music in the direction's tempo/key, sfx on cuts)
```

## Layers inside a frame

| z | layer | file |
|---|---|---|
| 0 | **3D world** (WebGL canvas, rendered at `--gl-scale` × 540×960) | `engine/world3d.js` |
| 1 | scene DOM: scrim, kicker, caption, label, optional 2D visuals (chat, stat, bars…) | `engine/reel.js`, `reel.css` |
| 25 | vignette + film grain (cinema scenes) | `reel.css .cine-fx` |
| 30+ | transitions: dip / flash / light-leak / halftone | `reel.js seek()` |

Everything is a pure function of time, so every frame is deterministic and any moment can be scrubbed.

## 3D worlds (`world.env`)

| env | idea it expresses | hero / props |
|---|---|---|
| `city` | business, brand, corporate | lit towers, glass HQ, traffic light trails · `props.sign` |
| `vault` | wealth, earning | gold vault door, spiralling coins, bullion |
| `flow` | managing money, many inputs → one result | channels with particles into a secure core · `props.sources` |
| `staircase` | discipline, habits, step by step | stairs to a portal, a figure climbing |
| `mountains` | goals, success, ambition | multi-peak range, snow caps, summit flag |
| `cosmos` | spirituality, vision, dreams | stars, nebula, planet · `props.temple` |
| `grid` | technology, AI, automation | neon grid, AI core, holo panels · `props.words` |
| `molecule` | health, body, science | DNA helix, molecules, cells |
| `network` | communication, customers, community | globe of nodes, message pulses, phones · `props.messages` |
| `stage` | a single symbol, proof, CTA | `props.hero`: trophy, gift, chart, rocket, shield, lock, bulb, key |

Plus: 10 palettes (`gold`, `midnight`, `dawn`, `emerald`, `neon`, `cosmic`, `crimson`, `ocean`, `clinical`, `ivory`),
7 lighting presets (`studio`, `golden`, `dramatic`, `neon`, `night`, `cosmic`, `soft`),
11 camera moves (`dolly-in/out`, `orbit-left/right`, `crane-up/down`, `pan-left/right`, `push-tilt`, `fly-over`, `spiral`),
fx layers (`dust`, `bokeh` foreground depth, `sparks`).

## Adding a new world
Add a function to `ENVS` in `engine/world3d.js` returning `{ focus, R, az, el, moves, update(t, lt) }`,
add a concept rule in `scripts/direct.js` `RULES`, done. All geometry is procedural, so there are no assets to manage.

## Performance
- One shadow-casting light, instanced meshes for repeated objects, small canvas textures.
- Only the current and neighbouring scenes are kept in GPU memory.
- On a desktop GPU set `REEL_GPU=1` for hardware WebGL. In headless/cloud (SwiftShader), expect around 1 s per 1080p frame.

## Edit mode (talking-head videos): `scripts/edit.js`
```
media/video.mp4 ──ffmpeg: crop → scale → zoompan(z(t) per segment) → colour pop──┐
reels/edit-*.json ─timeline (segments→scenes)─► engine page, transparent PNG frames ─┴─overlay─► H.264
voice (cleaned) + music (sidechain-ducked by voice) + sfx plan (≤3s gaps) ──────────────────────► AAC
```
`soundtrack.sfxEvents()` plans effects from the timeline: whoosh into B-roll, pop on cuts and stickers, click on UI
taps, ding on confetti, tick on caption beats (energy reels), then fills any gap longer than 3 s.

## Presenter avatar
`makeAvatar()` in `engine/reel.js` is an original SVG character. Mouth openness comes from the active caption word,
plus blinks, a head bob and six gestures (point, up, open, thumb, think, wave) cycling every 2 s or set per scene.
With a recorded voiceover the word times come from the TTS alignment, so the lips follow the real speech.
