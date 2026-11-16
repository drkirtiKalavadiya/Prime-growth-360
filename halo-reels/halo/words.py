#!/usr/bin/env python3
"""Word timings with faster-whisper.  usage: python3 words.py CLIP OUT.json [--lang gu] [--model small]
Check the words and fix any spelling by hand in OUT.json (keep the times). Names and brands are the usual mistakes."""
import json, sys

a = sys.argv[1:]
clip, out = a[0], a[1]
lang = a[a.index('--lang') + 1] if '--lang' in a else 'en'
size = a[a.index('--model') + 1] if '--model' in a else 'small'
from faster_whisper import WhisperModel
model = WhisperModel(size, device='cpu', compute_type='int8')
segs, _ = model.transcribe(clip, language=lang, word_timestamps=True, vad_filter=True)
words = [dict(w=w.word.strip(), s=round(w.start, 3), e=round(w.end, 3)) for s in segs for w in (s.words or []) if w.word.strip()]
json.dump(words, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(f'{len(words)} words -> {out}')
