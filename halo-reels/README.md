# Halo Reels

Premium talking-head reels, edited by Claude. One raw vertical clip in, one finished 9:16 MP4 out:

- your own room, graded dark and cinematic, with a soft key glow behind you
- **real frosted glass** cards and panels that blur your room behind them
- a **metallic serif headline** behind your head and captions that land on the exact word you say
- orbit lines of light behind your head, bokeh at three depths, light leaks
- glass panels, a counting number, a gold seal, a notification, glass pills
- motion blur on every frame, zoom-blur light transitions, a slow camera push
- built-in sound design (synthesised, no licences), mixed to −14 LUFS

Three themes (Noir, Arctic, Ember) or your own brand colour.

## Install (once)
1. Install Claude Code (the Claude desktop app → **Code** tab, or the terminal version).
2. Move this `halo-reels` folder to `~/.claude/skills/` (Windows: `%USERPROFILE%\.claude\skills\`).
3. In the folder, install the tools (or ask Claude: «Run the halo-reels setup check and install what is missing»):
   ```bash
   npm install
   npm install playwright && npx playwright install chromium
   python3 -m pip install -r requirements.txt
   python3 -m pip install faster-whisper        # automatic word timings
   python3 setup_check.py
   ```
   You also need ffmpeg (macOS `brew install ffmpeg`, Windows `winget install ffmpeg`).

## Make a reel
New folder, put your clip in it, open Claude Code there and write:
> Make a halo reel from clip.mp4. Theme N1. You choose the elements.

Claude shows you one still per scene, you approve, Claude renders the reel.
Read `guide/GUIDE.pdf` first (5 minutes), then pick elements in `library/LIBRARY.pdf`.

## What is inside
| Path | What |
|---|---|
| `SKILL.md` | how Claude makes a reel (read by Claude every session) |
| `HANDBOOK.md` | fine-tuning every detail, with ready lines to send Claude |
| `library/LIBRARY.pdf` · `LIBRARY.md` | every element with its code and a picture; order form · code → plan map |
| `guide/GUIDE.pdf` | set up, filming, which clips fit, working with Claude, FAQ |
| `reel.py`, `halo/` | the pipeline: prep (frames, cut-out, words), compositing, sound, export |
| `engine/` | the graphics engine (HTML/SVG/canvas rendered in headless Chromium) |
| `examples/` | the reference plan that uses every element |
| `setup_check.py` | tells you in plain words what is missing |

## For the seller
- `tools/build_docs.py [PLAN]` rebuilds both PDFs with pictures rendered by the skill. Record your own demo clip,
  copy `examples/plan_example.json`, point it at the clip and rebuild: the PDFs then show real footage.
- `tools/build_product.py` writes `dist/halo-reels-<version>.zip` (no `node_modules`, no work folders).
- `sales/GUMROAD.md` has the listing copy.
- Review `TERMS.md` before selling.

Licences of third-party parts: `THIRD_PARTY.md`.
