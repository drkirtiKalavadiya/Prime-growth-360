#!/usr/bin/env bash
# Full build: 1080x1920 video (parallel), audio mix, final MP4, storyboard.
set -euo pipefail
cd "$(dirname "$0")/.."
VOICE="${1:-output/voiceover_original.mp3}"
render/render_parallel.sh output/video_1080.mp4 4 1.5
render/mix.sh "$VOICE" output/final_mix.wav 66
ffmpeg -v error -y -i output/video_1080.mp4 -i output/final_mix.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart output/5_mindset_rules_1080x1920.mp4
TIMES=$(python3 -c "import json;print(' '.join(str(s['thumb']) for s in json.load(open('storyboard/shots.json'))))")
rm -rf storyboard/frames && node render/stills.js storyboard/frames $TIMES
python3 -I storyboard/build.py
echo "Done: output/5_mindset_rules_1080x1920.mp4 and storyboard/storyboard.html"
