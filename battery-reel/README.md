# Battery Myth Reel (9:16 animated explainer)

A 90-second vertical reel built only with HTML, CSS and SVG: no image or video files.
It covers one question: does keeping your laptop plugged in wear out the battery?

Open `battery-reel/index.html` in a browser. It plays automatically.

## Layout (same on every shot)
- **Top:** word-by-word captions. The word being spoken turns bold, earlier words go grey, and the key word gets a blue selection box with corner handles.
- **Middle:** the animated visual. It opens with a blur, scale and push-in, and its top and bottom edges fade out.
- **Bottom:** a cartoon host whose pose changes with the script and who lip-syncs while a caption is on screen.
- The background switches between dark and light (with a grid) to match each section.

## Shots
| Time | Visual |
| --- | --- |
| 0–3.4 s | Charger plugging in, battery shatters |
| 3.4–8.5 s | Battery packs (light) |
| 8.5–19.5 s | Cell cross-section: anode, separator, cathode; lithium ions moving across; electrons going round through the laptop |
| 19.5–24.5 s | See-through cell discharging, then charging when the plug goes in |
| 24.5–34.5 s | Graphite layers, side reactions trapping lithium, smaller battery |
| 34.5–40 s | Crust (SEI) growing and slowing the ions |
| 40–50 s | Heat: thermal camera, sun, hot car, duvet, overheating cell |
| 50–61.5 s | 3D lattices: 0 % vs 100 % extremes, 20–80 % sweet spot |
| 61.5–74.5 s | Desk scene, charging chart that holds at 80 %, circuit board |
| 74.5–83.8 s | Mac and PC battery settings mock-ups |
| 83.8–90 s | Switching the setting on, notification, share sheet |

## Controls
- Space: play / pause
- R: restart
- ← / →: jump 2 s
- F: fullscreen
- The **🎙 Voice-over** button loads your own narration (mp3 / wav), and the animation then follows the audio. If the page is served over http(s), a `voiceover.mp3` file in this folder is picked up automatically.
- `index.html?t=42` opens paused at 42 s.
- `index.html?record=1` hides the controls so you can screen-record a clean 9:16 video.

## Editing
Everything is in `reel.js`:
- `SCRIPT`: caption phrases and their start times. Put a key word in `[brackets]` to highlight it.
- `SCENES`: which visual is shown when, and whether it is dark or light.
- `POSES`: the host's gestures over time.
