#!/usr/bin/env node
/*
 * Record the voiceover: one clip per caption line, with per-word start times.
 *
 *   node scripts/voice.js reels/<name>.json [--provider elevenlabs|google] [--voice ID] [--model ID] [--lang gu-IN] [--force]
 *
 * Settings come from (highest first): CLI flags → the spec's "voice" object → env vars → defaults.
 *
 *   "voice": { "provider": "google", "language": "gu-IN", "name": "gu-IN-Wavenet-B", "rate": 1.05 }
 *
 * Providers
 *   elevenlabs  ELEVENLABS_API_KEY. English default model eleven_multilingual_v2.
 *               For Gujarati and other Indian languages it uses eleven_v3 (70+ languages).
 *               Word times come from the /with-timestamps character alignment.
 *   google      GOOGLE_TTS_API_KEY (Cloud Text-to-Speech API key). Native gu-IN voices.
 *               Standard/Wavenet voices: exact word times via SSML <mark>s.
 *               Chirp3-HD voices (no SSML marks): word times spread across the clip by length.
 *
 * Output: out/<name>/voice/line-XX-<hash>.mp3 + timings.json, picked up by render.js automatically.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { parseArgs, loadReel } = require('./lib');
const { parseWords, plain } = require('../engine/timeline');

const INDIC = /^(gu|hi|bn|ta|te|mr|kn|ml|pa|or|ur)\b/i;

function settings(args, reel) {
  const spec = reel.voice && typeof reel.voice === 'object' ? reel.voice : { name: reel.voice };
  const language = args.lang || spec.language || reel.lang || process.env.VOICE_LANGUAGE || 'en-US';
  const provider = (args.provider || spec.provider || process.env.VOICE_PROVIDER ||
    (process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : process.env.GOOGLE_TTS_API_KEY ? 'google' : 'elevenlabs')).toLowerCase();
  const s = { provider, language, rate: Number(args.rate || spec.rate || 1) };
  if (provider === 'elevenlabs') {
    s.voice = args.voice || spec.name || process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
    s.model = args.model || spec.model || process.env.ELEVENLABS_MODEL || (INDIC.test(language) ? 'eleven_v3' : 'eleven_multilingual_v2');
  } else if (provider === 'google') {
    const lang = language.includes('-') ? language : `${language}-IN`;
    s.language = lang;
    s.voice = args.voice || spec.name || process.env.GOOGLE_TTS_VOICE || `${lang}-Wavenet-B`;
  } else {
    throw new Error(`Unknown voice provider "${provider}" — use elevenlabs or google`);
  }
  return s;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { reel, outDir } = loadReel(args._[0]);
  const s = settings(args, reel);
  const synth = { elevenlabs: elevenLabs, google: googleTTS }[s.provider];
  const keyVar = s.provider === 'google' ? 'GOOGLE_TTS_API_KEY' : 'ELEVENLABS_API_KEY';
  if (!process.env[keyVar]) {
    console.error(`${keyVar} is not set (provider: ${s.provider}). Set it and re-run.\nThe reel still renders without voice — captions fall back to estimated timing.`);
    process.exit(2);
  }
  console.log(`Voice: ${s.provider} · ${s.voice}${s.model ? ' · ' + s.model : ''} · ${s.language}`);

  const dir = path.join(outDir, 'voice');
  fs.mkdirSync(dir, { recursive: true });
  const tPath = path.join(dir, 'timings.json');
  const prev = fs.existsSync(tPath) ? JSON.parse(fs.readFileSync(tPath, 'utf8')) : { lines: {} };
  const timings = { ...s, lines: {} };

  const all = reel.scenes.flatMap((sc) => sc.say || []);
  let n = 0;
  for (const line of all) {
    const text = plain(line);
    const words = parseWords(line).map((w) => w.text);
    const hash = crypto.createHash('sha1').update(JSON.stringify([s, text])).digest('hex').slice(0, 10);
    const file = `line-${String(++n).padStart(2, '0')}-${hash}.mp3`;
    const cached = prev.lines[text];
    if (!args.force && cached && cached.hash === hash && fs.existsSync(path.join(dir, cached.file))) {
      timings.lines[text] = cached;
      console.log(`  ✓ cached  ${text}`);
      continue;
    }
    process.stdout.write(`  … voicing ${text}`);
    const { audio, starts } = await synth(text, words, s);
    const abs = path.join(dir, file);
    fs.writeFileSync(abs, audio);
    const duration = probeDuration(abs);
    let ws = starts;
    if (!ws || ws.length !== words.length) {
      if (ws) console.warn(`\n  ! got ${ws.length} word times for ${words.length} words — spreading by length`);
      ws = spreadByLength(words, duration);
    }
    timings.lines[text] = { file, hash, duration: duration + 0.05, words: ws };
    process.stdout.write('\r  ✓ voiced \n');
  }
  fs.writeFileSync(tPath, JSON.stringify(timings, null, 2));
  console.log(`Voiceover ready: ${path.relative(process.cwd(), dir)} (${all.length} lines)`);
}

// ---------- ElevenLabs ----------
async function elevenLabs(text, words, s) {
  const body = { text, model_id: s.model };
  if (s.model !== 'eleven_v3') body.voice_settings = { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: s.rate };
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${s.voice}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`\nElevenLabs ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const al = data.alignment || data.normalized_alignment;
  return { audio: Buffer.from(data.audio_base64, 'base64'), starts: al ? wordStartsFromChars(al) : null };
}

/* Character alignment -> start time of each whitespace-separated word. */
function wordStartsFromChars(al) {
  const out = [];
  let inWord = false;
  al.characters.forEach((c, i) => {
    const space = /\s/.test(c);
    if (!space && !inWord) out.push(al.character_start_times_seconds[i]);
    inWord = !space;
  });
  return out;
}

// ---------- Google Cloud Text-to-Speech ----------
async function googleTTS(text, words, s) {
  const marks = !/Chirp/i.test(s.voice); // Chirp3-HD voices don't accept SSML
  const esc = (t) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  const input = marks
    ? { ssml: `<speak>${words.map((w, i) => `<mark name="w${i}"/>${esc(w)}`).join(' ')}</speak>` }
    : { text };
  const body = {
    input,
    voice: { languageCode: s.language, name: s.voice },
    audioConfig: { audioEncoding: 'MP3', sampleRateHertz: 44100, ...(s.rate !== 1 && { speakingRate: s.rate }) },
    ...(marks && { enableTimePointing: ['SSML_MARK'] }),
  };
  const res = await fetch(`https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${encodeURIComponent(process.env.GOOGLE_TTS_API_KEY)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`\nGoogle TTS ${res.status}: ${await res.text()}`);
  const data = await res.json();
  let starts = null;
  if (marks && data.timepoints && data.timepoints.length) {
    starts = words.map(() => null);
    data.timepoints.forEach((tp) => { const i = Number(tp.markName.slice(1)); starts[i] = tp.timeSeconds; });
    if (starts.some((x) => x == null)) starts = null;
  }
  return { audio: Buffer.from(data.audioContent, 'base64'), starts };
}

// ---------- shared ----------
function probeDuration(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const d = parseFloat(r.stdout);
  if (!isFinite(d)) throw new Error(`Could not read duration of ${file}`);
  return d;
}

/* No alignment from the provider: hand out the clip's time in proportion to each word's length. */
function spreadByLength(words, duration) {
  const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const len = (w) => (seg ? [...seg.segment(w)].length : [...w].length);
  const weights = words.map((w) => len(w) + 2 + (/[,.!?।]$/.test(w) ? 3 : 0));
  const total = weights.reduce((a, b) => a + b, 0);
  const speech = duration * 0.94; // ignore the tail of silence
  let t = duration * 0.03;
  return weights.map((wt) => { const s = t; t += (wt / total) * speech; return +s.toFixed(3); });
}

if (require.main === module) main().catch((e) => { console.error(e.message || e); process.exit(1); });
module.exports = { spreadByLength, wordStartsFromChars, settings };
