#!/usr/bin/env bash
# Mix: voice-over sped to 1.3x (loudness-normalised), music ducked under the voice, SFX track.
# Usage: render/mix.sh VOICE.mp3 OUT.wav [duration]
set -euo pipefail
cd "$(dirname "$0")/.."
VOICE="$1"; OUT="$2"; DUR="${3:-66}"
python3 render/audio.py output "$DUR"
ffmpeg -v error -y -i "$VOICE" -i output/music.wav -i output/sfx.wav -filter_complex "\
[0:a]atempo=1.3,aresample=44100,loudnorm=I=-16:TP=-1.5:LRA=11,apad=whole_dur=$DUR,asplit=2[v][vsc];\
[1:a]volume=0.30[m];[m][vsc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[md];\
[2:a]volume=0.85[s];\
[v][md][s]amix=inputs=3:normalize=0:duration=longest,alimiter=limit=0.95,atrim=0:$DUR[out]" -map "[out]" -ac 2 -ar 44100 "$OUT"
