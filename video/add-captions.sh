#!/usr/bin/env bash
# Burns the "Perfection vs Unperfection" captions onto the video.
# Usage: ./add-captions.sh input.mp4 [output.mp4]
set -euo pipefail
IN="${1:?usage: $0 input.mp4 [output.mp4]}"
OUT="${2:-perfection-vs-unperfection.mp4}"
DIR="$(cd "$(dirname "$0")" && pwd)"
ffmpeg -y -i "$IN" -vf "ass=$DIR/captions.ass" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a copy -movflags +faststart "$OUT"
