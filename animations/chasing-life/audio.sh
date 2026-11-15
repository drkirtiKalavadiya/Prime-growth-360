#!/usr/bin/env bash
# =====================================================================
# audio.sh: builds the soundtrack and muxes it onto the silent render.
#
#   bash animations/chasing-life/audio.sh [video_in] [video_out] [music.mp3]
#
# Layers:
#   1. Voice-over: audio/voiceover-gu.mp3 (Gujarati), at full level
#   2. Music: an original energetic 128 BPM track composed by music.py, or
#      your own licensed track passed as the 3rd argument. It is ducked
#      (sidechain) under the voice.
#   3. SFX from music.py: whooshes, rotor, clicks, impacts, tap pop, sparkles
#
# Set VOICE=none to render without the voice-over.
# The cue times live in CUES in music.py and must match TIMELINE in scene.js.
# =====================================================================
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
IN="${1:-$DIR/out/chasing-life-silent.mp4}"
OUT="${2:-$DIR/out/chasing-life.mp4}"
MUSIC="${3:-}"
VOICE="${VOICE:-$DIR/audio/voiceover-gu.mp3}"
VDUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# 1) Compose music + SFX
python3 "$DIR/music.py" "$TMP" "$VDUR" >/dev/null

# 2) Music bed (generated, or your own track)
if [[ -n "$MUSIC" ]]; then
  ffmpeg -loglevel error -y -i "$MUSIC" -t "$VDUR" -af "afade=t=out:st=$(echo "$VDUR - 2" | bc):d=2" -ar 48000 -ac 2 "$TMP/bed2.wav"
else
  cp "$TMP/bed.wav" "$TMP/bed2.wav"
fi

# 3) Mix: the voice ducks the music, then everything is glued and limited
if [[ "$VOICE" != "none" && -f "$VOICE" ]]; then
  ffmpeg -loglevel error -y -i "$IN" -i "$TMP/bed2.wav" -i "$TMP/sfx.wav" -i "$VOICE" \
    -filter_complex "[3:a]aresample=48000,aformat=channel_layouts=stereo,volume=1.5,apad=whole_dur=$VDUR,asplit=2[v1][v2];\
[1:a]volume=0.55[bed];\
[bed][v1]sidechaincompress=threshold=0.02:ratio=5:attack=15:release=350:makeup=1[duck];\
[duck][2:a][v2]amix=inputs=3:normalize=0:weights='1 0.8 1',acompressor=threshold=0.35:ratio=3:attack=5:release=120,alimiter=limit=0.95[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -t "$VDUR" -movflags +faststart "$OUT"
else
  ffmpeg -loglevel error -y -i "$IN" -i "$TMP/bed2.wav" -i "$TMP/sfx.wav" \
    -filter_complex "[1:a]volume=0.6[bed];[bed][2:a]amix=inputs=2:normalize=0,alimiter=limit=0.95[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -t "$VDUR" -movflags +faststart "$OUT"
fi
echo "wrote $OUT"
