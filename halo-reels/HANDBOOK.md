# Halo Reels — Handbook

For Claude: find the symptom, apply the fix, re-render **one still**, compare, then go on.
For the creator: copy the line in quotes and send it to Claude as it is.

## 1. Which clips work
| Clip | Works | What Claude does |
|---|---|---|
| Vertical, tripod, seated or standing, chest-up | Best | Everything |
| Waist-up / wider | Yes | Card and headword sit higher; everything else the same |
| Face fills the frame | Partly | No room above the head: no headword; card goes to the side (`x`, `y`) |
| Horizontal 16:9 | Partly | Cropped to 9:16 around the face if the person stays at least half the frame height |
| Walking / handheld | Speaker scenes: no | Use those seconds for abstract scenes |
| Two people | Partly | One speaker per scene; the cut-out keeps the person in the centre |
| Light clothes on a light wall, backlight | Weak | The cut-out frays. Re-shoot, or export a matte from CapCut / another tool (`matte_video`) |

Filming: 1080×1920 or 4K, 24–60 fps, tripod, soft front light, plain calm background 1–2 m behind,
the top of the head about a third down the frame (the space above is where the card and headline live),
short clear phrases, a lav or close mic.

## 2. Text
Rules: one accent word per block · 1–3 small words above · the rest below · only the speaker's words · on the word ·
nothing on the face · inside x 90–990, y 170–1750.
- "The accent word is too big / too small." → `accent_size` on that block (caption 148, headword 196).
- "Use the italic serif accent." → plan `"accent_style": "italic"` (or `"italic": true` on one block).
- "The text sits too high / low." → caption `y` (centre of the block); headword `dy` (negative = higher).
- "Fewer words in front, she talks fast." → only the accent + one small line per block.
- "The headline behind my head is hidden." → shorter accent word, or `dy: -40`.

## 3. Motion
Approved: small words rise out of a line mask with blur → sharp (0.7 s); the accent arrives with a feathered
left-to-right wipe, blur → sharp and a small scale-down (1.0 s), then light runs across it; the hairline grows from
the centre. Exits blur and fade (0.3 s). Every element keeps a slow idle movement.
- "Everything feels slow." → set the word times a little earlier (`"@word-0.1"`).
- "Make the exit earlier." → `out` on that element.

## 4. Camera and transitions
Approved: first frame close (`open_zoom` 1.14) easing out over 1.1 s, a slow push through every scene (`push` 0.035),
one key zoom on the identity line (`key`: +8 % in about 1 s, hold, out before the next scene), zoom-blur and a
light flash on every cut.
- "Remove the key zoom." → delete `camera.key`.
- "Calmer." → `push: 0`, `open_zoom: 1.06`.

## 5. Themes and colour
`theme`: `noir` (black and champagne gold), `arctic` (night blue and ice), `ember` (warm coral).
`"accent": "#RRGGBB"` turns any theme into the creator's brand colour (glow, rim light and light leaks follow).
`grade.room` (0.3–0.6) sets how dark the room gets; `grade.room_blur` (0–4) how soft.
- "My room is too dark." → `grade.room: 0.5`.
- "Same reel in my brand colour #4F7BFF." → `accent`.

## 6. Elements
| Code | Element | Notes |
|---|---|---|
| CAP | caption | in front; `top`, `accent`, `bottom`, `y` |
| HED | headword | behind the head; `top` + `accent` only |
| CRD | glass card | behind the head; `kicker`, `title` with one `*accent*`, 2–3 `rows` that tick on their words |
| PIL | pills | glass pills one per word, under a caption (`y` ≥ 1600) |
| PNL | glass panels | abstract scenes; 2–3 items, numbered 01–03 |
| CNT | counter | abstract scenes; `to`, `prefix`, `suffix`, `decimals`, `label`, `dur`; only numbers the speaker says |
| BDG | badge | gold seal; `text` (1–2 words), `ring` text round it |
| NTF | notification | once per reel; `app`, `title`, `text`, `icon` |
| ORB | orbit lines | automatic behind the head in speaker scenes; `"ring": false` on a scene removes it |

## 7. Sound
Every sound is synthesised by the skill (no licences to worry about): rise at the start, whoosh into each cut,
a shimmer on each accent, glass taps on rows and pills, a deep hit on the badge, a rise and tap on the counter.
The mix is normalised to −14 LUFS with the voice on top. `"sfx": "off"` for none.

## 8. When it breaks
| You see | Fix |
|---|---|
| Hair or shoulder cut, a hole in the person | Check the matte at 100 %: `plan_work/matte/`. Export a matte from CapCut ("Remove background", white on black) and set `matte_video` |
| Wrong word on screen | Fix it in `plan_work/words.json` (keep the times) |
| "word not in words.json" | The `@word` is spelled differently in the transcript; copy it from `prep` output |
| Black screen / nothing renders | Run `python3 setup_check.py` |
| Render killed, computer freezes | Close other apps; `motion_blur: 1` for drafts |
| Slow | Normal: 6–10 min for 10 s at `motion_blur: 3`. Stills first, one full render at the end |

## 9. Before showing anything (Claude ticks every box on every still)
☐ only the speaker's words, on the word ☐ one accent per block ☐ nothing on the face ☐ inside the safe zone
☐ cut-out clean (hair, ears, shoulders) ☐ glass shows the room through it ☐ the card sits behind the head, the text in
front ☐ no element repeated twice in a scene ☐ a still for every scene, compared with the Library pictures.
