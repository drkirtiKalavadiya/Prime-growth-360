// Auto-fill word-by-word captions for a NEW video.
//   node scripts/transcribe.mjs public/input.mp4
// 1st run downloads whisper.cpp + the "medium.en" model (~1.5 GB) into ./whisper.cpp.
// Writes captions + durationSec into src/edit.json. Headlines / phone / house / zoom / sfx times
// are NOT changed: move them by hand to the words you want highlighted (see BREAKDOWN.md).
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {downloadWhisperModel, installWhisperCpp, toCaptions, transcribe} from '@remotion/install-whisper-cpp';

const input = process.argv[2] ?? 'public/input.mp4';
const MODEL = process.env.WHISPER_MODEL ?? 'medium.en';
const VERSION = '1.5.5';
const whisperPath = path.resolve('whisper.cpp');
const wav = path.resolve('out/_audio16k.wav');
fs.mkdirSync('out', {recursive: true});

execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', input, '-ar', '16000', '-ac', '1', wav]);
await installWhisperCpp({to: whisperPath, version: VERSION});
await downloadWhisperModel({model: MODEL, folder: whisperPath});

const out = await transcribe({
  inputPath: wav,
  whisperPath,
  whisperCppVersion: VERSION,
  model: MODEL,
  tokenLevelTimestamps: true,
  splitOnWord: true,
});
const {captions} = toCaptions({whisperCppOutput: out});

const words = captions
  .map((c) => ({t: +(c.startMs / 1000).toFixed(2), w: c.text.trim()}))
  .filter((c) => c.w && !/^\[.*\]$/.test(c.w));

const dur = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', input]).toString().trim();

const editPath = 'src/edit.json';
const edit = JSON.parse(fs.readFileSync(editPath, 'utf8'));
edit.captions = words;
edit.durationSec = +dur.toFixed(2);
fs.writeFileSync(editPath, JSON.stringify(edit, null, 1));
console.log(`${words.length} words written to ${editPath}  (duration ${dur.toFixed(2)} s)`);
console.log(words.map((w) => `${w.t}s ${w.w}`).join('\n'));
