# Laptop Battery Reel (Gujarati, 9:16)

A 1 minute 47 second vertical reel in Gujarati: does keeping your laptop plugged in wear out the battery?
It is built only with HTML, CSS and SVG, synced to the voice-over played at 1.5× speed, with your own character as the presenter.

- **Ready video:** `laptop-battery-reel-gujarati.mp4` (720×1280, 30 fps, with audio). Post it directly to Reels / Shorts.
- **Live version:** open `index.html` in a browser and tap ▶ (browsers only allow sound after a tap).

## Files
| File | What it is |
| --- | --- |
| `index.html`, `reel.css`, `reel.js` | The animated reel |
| `voiceover.mp3` | Your voice-over, sped up to 1.5× (pitch kept the same) |
| `assets/presenter.png` | Your character with the white background removed |
| `render-mp4.js` | Re-renders the MP4 after you edit anything (`node render-mp4.js`; needs Playwright and ffmpeg) |

## How it is synced
All times in `reel.js` are in seconds of the **original (1×) voice-over**. Playback runs 1.5× faster, so a line at 30 s in the voice-over appears at 20 s in the reel.
- `LINES`: each spoken sentence with its start and end time, measured from the audio. Put a word in `[brackets]` to give it the blue highlight box. Lines are split automatically into short on-screen chunks.
- `SCENES`: which visual shows when, dark or light, and a small time map that lines the animation up with the words.
- The presenter bounces with the loudness of the voice (`ENV`) and pops on each highlighted word.

## Note about the voice-over
The recording does not include these five script lines, so they are not in the captions either:
1. જવાબ છે — આજકાલનાં મોટાભાગનાં નવા લેપટોપમાં એવું જરૂરી નથી.
2. જ્યારે લેપટોપને ખબર પડે છે … લગભગ 80% પર ચાર્જિંગ રોકી દે છે.
3. ત્યારબાદ લેપટોપ બેટરીને બદલે સીધું ચાર્જરથી મળતી વીજળી પર ચાલે છે.
4. જો તમારી પાસે MacBook છે … Charge Limit ને 80% પર સેટ કરી શકો છો.
5. જો તમારી પાસે Windows Laptop છે … Battery Management App ખોલો.

If you re-record with these lines, add them to `LINES` and re-add the Mac and PC settings scenes (`macset`, `limit`).

## Controls (browser)
- Space: play / pause
- R: restart
- ← / →: jump 2 s
- F: fullscreen
- `?t=20` opens paused at 20 s
- `?record=1` hides the controls
- `?mute=1` plays without sound
