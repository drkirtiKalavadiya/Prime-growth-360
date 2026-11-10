#!/usr/bin/env bash
# Full build: frames -> silent MP4, synthesized soundtrack, mux, storyboard.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p output
node render/render.js output/mindset_silent.mp4 30
python3 render/audio.py output/soundtrack.wav
ffmpeg -y -v error -i output/mindset_silent.mp4 -i output/soundtrack.wav -c:v copy -c:a aac -b:a 160k -shortest output/5_mindset_rules.mp4
TIMES=$(python3 -c "import json;print(' '.join(str(s['thumb']) for s in json.load(open('storyboard/shots.json'))))")
node render/stills.js storyboard/frames $TIMES
python3 -I storyboard/build.py
echo "Done: output/5_mindset_rules.mp4 and storyboard/storyboard.html"
