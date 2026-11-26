#!/usr/bin/env bash
# One command: new person video in -> locked Orange Kinetic reel out.
#   bash make_reel.sh /path/to/my_video.mp4 [/path/to/output.mp4] [--exact] [--no-subject]
# Optional env: CHROME=/path/to/chromium   WHISPER_MODEL=small.en
set -euo pipefail
SK="$(cd "$(dirname "$0")/.." && pwd)"
IN="$(realpath "$1")"; shift
OUT="${1:-$PWD/locked_reel.mp4}"; [[ "${1:-}" == --* ]] && OUT="$PWD/locked_reel.mp4" || { [[ $# -gt 0 ]] && shift; }
EXACT=0; NOSUB=0
for a in "$@"; do [[ $a == --exact ]] && EXACT=1; [[ $a == --no-subject ]] && NOSUB=1; done
T="$SK/template"
WORK="$(mktemp -d)"

echo "== 0. lock check (before)"; python3 "$SK/scripts/verify_lock.py"

echo "== 1. footage"
# normalise to 9:16 1080x1920 cover-crop, keep audio
ffmpeg -v error -y -i "$IN" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30" \
  -c:v libx264 -crf 16 -preset fast -c:a aac -b:a 192k "$T/public/input.mp4"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$T/public/input.mp4")

echo "== 2. person cut-out (text behind head)"
if [[ $NOSUB == 0 ]]; then
  python3 "$T/scripts/make_matte.py" "$T/public/input.mp4" "$T/public/subject.webm" 2>&1 | grep -E "done|frames|Error" || NOSUB=1
  [[ -s "$T/public/subject.webm" ]] || NOSUB=1
fi

echo "== 3. timing (text stays locked, only times move)"
NS=""; [[ $NOSUB == 1 ]] && NS="--no-subject"
if [[ $EXACT == 0 ]] && python3 "$SK/scripts/transcribe_words.py" "$T/public/input.mp4" "$WORK/words.json"; then
  python3 "$SK/scripts/retime.py" --words "$WORK/words.json" --duration "$DUR" --out "$T/src/edit.json" $NS
else
  echo "   (exact mode / transcription unavailable: using original timings)"
  python3 "$SK/scripts/retime.py" --exact --duration "$DUR" --out "$T/src/edit.json" $NS
fi

echo "== 4. lock check (after)"; python3 "$SK/scripts/verify_lock.py"

echo "== 5. render"
cd "$T"; [[ -d node_modules ]] || npm install --no-audit --no-fund
BX=""; [[ -n "${CHROME:-}" ]] && BX="--browser-executable=$CHROME"
npx remotion render Reel "$OUT" --concurrency=3 --crf=18 $BX
echo "DONE -> $OUT"
