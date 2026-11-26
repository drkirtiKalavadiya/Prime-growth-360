"""
Word timings for the new recording (used only to re-time locked events, never to change text).

  python3 transcribe_words.py input.mp4 words.json

Uses faster-whisper (pip install faster-whisper). Model downloads from huggingface.co on first run.
If that fails, use template/scripts/transcribe.mjs (whisper.cpp) or run retime.py --exact.
"""
import json, subprocess, sys, tempfile, os
from faster_whisper import WhisperModel

src, dst = sys.argv[1], sys.argv[2]
model_name = os.environ.get("WHISPER_MODEL", "small.en")
wav = os.path.join(tempfile.mkdtemp(), "a.wav")
subprocess.check_call(["ffmpeg", "-v", "error", "-y", "-i", src, "-ac", "1", "-ar", "16000", wav])
segs, _ = WhisperModel(model_name, compute_type="int8").transcribe(wav, word_timestamps=True, language="en")
words = [{"t": round(w.start, 2), "w": w.word.strip()} for s in segs for w in s.words if w.word.strip()]
json.dump(words, open(dst, "w"), indent=0)
print(f"{len(words)} words -> {dst}")
