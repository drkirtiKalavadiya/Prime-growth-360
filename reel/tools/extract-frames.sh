#!/usr/bin/env bash
# Pull one still per scene out of a source video into reel/assets/.
#   usage: reel/tools/extract-frames.sh path/to/video.mp4
# The timestamps match the storyboard in js/scenes.js. Edit them if your video differs.
# Frames taken from a finished reel already contain its burned-in text; use clean source
# photos where you have them for the best result.
set -euo pipefail
src="${1:?usage: $0 video.mp4}"
out="$(cd "$(dirname "$0")/.." && pwd)/assets"
mkdir -p "$out"
while read -r name ts; do
  [ -z "$name" ] && continue
  ffmpeg -nostdin -v error -y -ss "$ts" -i "$src" -frames:v 1 -q:v 2 "$out/$name.jpg"
  echo "assets/$name.jpg  <- ${ts}s"
done <<'LIST'
02 3.2
03 6.2
04 9.6
05 13.2
06 14.2
07 16.5
08 22.9
09 25.3
11 30.0
12 32.0
13 33.3
14 35.3
15 36.5
16 39.0
17 43.3
18 46.5
19 49.0
20 51.7
21 54.0
22 56.4
23 60.3
24 63.0
LIST
