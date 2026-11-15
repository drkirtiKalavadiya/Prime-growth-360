#!/usr/bin/env bash
# =====================================================================
# audio.sh: synthesises an original ambient soundtrack with ffmpeg
# (no samples, no copyrighted music) and muxes it onto the silent render.
#
#   bash animations/chasing-life/audio.sh [video_in] [video_out] [music.mp3]
#
# If you pass a third argument (your own licensed music track), it is
# mixed underneath the generated sound effects instead of the synth pad.
# =====================================================================
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
IN="${1:-$DIR/out/chasing-life-silent.mp4}"
OUT="${2:-$DIR/out/chasing-life.mp4}"
MUSIC="${3:-}"
DUR=27
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# 1) Ambient pad: A-minor(add9) chord with a slow breathing swell
PAD='0.9*(0.6+0.4*sin(2*PI*0.08*t))*(0.050*sin(2*PI*110*t)+0.030*sin(2*PI*164.81*t)+0.022*sin(2*PI*220.5*t)+0.016*sin(2*PI*261.63*t)+0.012*sin(2*PI*246.94*t+0.7*sin(2*PI*0.3*t)))'
ffmpeg -loglevel error -y -f lavfi -i "aevalsrc=exprs='$PAD':s=48000:d=$DUR" \
  -af "lowpass=f=1800,aecho=0.8:0.85:120|260:0.35|0.22,afade=t=in:d=1.5,afade=t=out:st=$((DUR-2)):d=2" \
  "$TMP/pad.wav"

# 2) Sound effects: relay clicks when the light changes, a soft chime on the end card,
#    and a low rotor flutter while the helicopter passes
SFX='if(gte(t,15),0.30*sin(2*PI*1900*t)*exp(-70*(t-15)),0)'
SFX+='+if(gte(t,16),0.30*sin(2*PI*1900*t)*exp(-70*(t-16)),0)'
SFX+='+if(gte(t,23.45),0.10*(sin(2*PI*880*t)+0.6*sin(2*PI*1318.5*t)+0.35*sin(2*PI*1760*t))*exp(-1.4*(t-23.45)),0)'
SFX+='+0.06*sin(2*PI*55*t)*(0.5+0.5*sin(2*PI*14*t))*exp(-pow((t-3.0)/0.9,2))'
ffmpeg -loglevel error -y -f lavfi -i "aevalsrc=exprs='$SFX':s=48000:d=$DUR" \
  -af "aecho=0.7:0.6:90:0.25" "$TMP/sfx.wav"

# 3) Mix and mux
if [[ -n "$MUSIC" ]]; then
  BED=(-i "$MUSIC")
  BEDF="[1:a]atrim=0:$DUR,afade=t=out:st=$((DUR-2)):d=2,volume=0.8[bed]"
else
  BED=(-i "$TMP/pad.wav")
  BEDF="[1:a]volume=1.0[bed]"
fi
ffmpeg -loglevel error -y -i "$IN" "${BED[@]}" -i "$TMP/sfx.wav" \
  -filter_complex "$BEDF;[bed][2:a]amix=inputs=2:normalize=0,volume=2.4,alimiter=limit=0.9[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
echo "wrote $OUT"
