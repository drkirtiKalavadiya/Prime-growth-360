#!/usr/bin/env bash
# Usage: render/render_parallel.sh OUT.mp4 [workers] [scale]   (scale 1.5 => 1080x1920)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="$1"; W="${2:-4}"; SCALE="${3:-1.5}"
DUR=$(node -e "const s=require('fs').readFileSync('js/scenes.js','utf8');console.log(s.match(/const DURATION = ([\d.]+)/)[1])")
mkdir -p output/parts; rm -f output/parts/*
step=$(python3 -c "print($DUR/$W)")
for i in $(seq 0 $((W-1))); do
  a=$(python3 -c "print(round($i*$step*30)/30)"); b=$(python3 -c "print(round(($i+1)*$step*30)/30)")
  SCALE=$SCALE node render/render.js output/parts/p$i.mp4 30 $a $b > output/parts/log$i.txt 2>&1 &
done
wait
for i in $(seq 0 $((W-1))); do echo "file 'p$i.mp4'"; done > output/parts/list.txt
ffmpeg -v error -y -f concat -safe 0 -i output/parts/list.txt -c copy "$OUT"
echo "wrote $OUT"
