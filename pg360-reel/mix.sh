#!/usr/bin/env bash
# Final audio: voice-over (1.3x) on top of the music + SFX bed.
# Music -17 LUFS, voice -15 LUFS, light sidechain dip under the voice, master -14 LUFS (Instagram).
set -e
cd "$(dirname "$0")"
ffmpeg -v error -y -i voiceover-original.mp3 -af atempo=1.3 -ar 44100 -ac 1 voice-1.3x.wav
python3 make_soundtrack.py
ffmpeg -v error -y -i music.wav -i voice-1.3x.wav -filter_complex \
  "[0]loudnorm=I=-17:TP=-2:LRA=11[m];[1]loudnorm=I=-15:TP=-2:LRA=11,aformat=channel_layouts=stereo,asplit[v][sc];\
   [m][sc]sidechaincompress=threshold=0.04:ratio=2.5:attack=15:release=350:makeup=1[md];\
   [md][v]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1:LRA=11" \
  -ar 44100 -b:a 192k soundtrack.mp3
echo "wrote soundtrack.mp3"
