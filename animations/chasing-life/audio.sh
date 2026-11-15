#!/usr/bin/env bash
# =====================================================================
# audio.sh: builds the soundtrack and muxes it onto the silent render.
#
#   bash animations/chasing-life/audio.sh [video_in] [video_out] [music.mp3]
#
# Layers:
#   1. Voice-over: audio/voiceover-gu.mp3 (Gujarati), at full level
#   2. Bed: an original synth pad made with ffmpeg, or your own licensed
#      music passed as the 3rd argument. It is ducked under the voice.
#   3. SFX: relay clicks on the light changes, rotor flutter, end chime
#
# Set VOICE=none to render without the voice-over.
# The SFX times match TIMELINE in scene.js.
# =====================================================================
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
IN="${1:-$DIR/out/chasing-life-silent.mp4}"
OUT="${2:-$DIR/out/chasing-life.mp4}"
MUSIC="${3:-}"
VOICE="${VOICE:-$DIR/audio/voiceover-gu.mp3}"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
DUR=${DUR%.*}; DUR=$((DUR + 1))
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# 1) Ambient pad: A-minor(add9) chord with a slow breathing swell
PAD='0.9*(0.6+0.4*sin(2*PI*0.08*t))*(0.050*sin(2*PI*110*t)+0.030*sin(2*PI*164.81*t)+0.022*sin(2*PI*220.5*t)+0.016*sin(2*PI*261.63*t)+0.012*sin(2*PI*246.94*t+0.7*sin(2*PI*0.3*t)))'
ffmpeg -loglevel error -y -f lavfi -i "aevalsrc=exprs='$PAD':s=48000:d=$DUR" \
  -af "lowpass=f=1800,aecho=0.8:0.85:120|260:0.35|0.22,afade=t=in:d=1.5,afade=t=out:st=$((DUR-2)):d=2" \
  "$TMP/pad.wav"

# 2) Sound effects (times in seconds, matching scene.js)
AMBER=11.2; GREEN=11.95; CHIME=19.6; HELI=1.4
SFX="if(gte(t,$AMBER),0.30*sin(2*PI*1900*t)*exp(-70*(t-$AMBER)),0)"
SFX+="+if(gte(t,$GREEN),0.30*sin(2*PI*1900*t)*exp(-70*(t-$GREEN)),0)"
SFX+="+if(gte(t,$CHIME),0.08*(sin(2*PI*880*t)+0.6*sin(2*PI*1318.5*t)+0.35*sin(2*PI*1760*t))*exp(-1.2*(t-$CHIME)),0)"
SFX+="+0.06*sin(2*PI*55*t)*(0.5+0.5*sin(2*PI*14*t))*exp(-pow((t-$HELI)/0.9,2))"
ffmpeg -loglevel error -y -f lavfi -i "aevalsrc=exprs='$SFX':s=48000:d=$DUR" \
  -af "aecho=0.7:0.6:90:0.25" "$TMP/sfx.wav"

# 3) Bed
if [[ -n "$MUSIC" ]]; then
  ffmpeg -loglevel error -y -i "$MUSIC" -t "$DUR" -af "afade=t=out:st=$((DUR-2)):d=2,volume=0.35" -ar 48000 -ac 2 "$TMP/bed.wav"
else
  ffmpeg -loglevel error -y -i "$TMP/pad.wav" -af "volume=2.0" -ar 48000 -ac 2 "$TMP/bed.wav"
fi

# 4) Mix: the voice ducks the bed (sidechain compression), then everything is limited
if [[ "$VOICE" != "none" && -f "$VOICE" ]]; then
  ffmpeg -loglevel error -y -i "$IN" -i "$TMP/bed.wav" -i "$TMP/sfx.wav" -i "$VOICE" \
    -filter_complex "[3:a]aresample=48000,aformat=channel_layouts=stereo,asplit=2[v1][v2];\
[1:a][v1]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[duck];\
[duck][2:a][v2]amix=inputs=3:normalize=0:weights='1 1.6 1',alimiter=limit=0.95[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")" \
    -movflags +faststart "$OUT"
else
  ffmpeg -loglevel error -y -i "$IN" -i "$TMP/bed.wav" -i "$TMP/sfx.wav" \
    -filter_complex "[1:a][2:a]amix=inputs=2:normalize=0,volume=1.6,alimiter=limit=0.9[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
fi
echo "wrote $OUT"
