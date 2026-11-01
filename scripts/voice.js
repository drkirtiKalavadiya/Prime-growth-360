#!/usr/bin/env node
/*
 * Record the voiceover with ElevenLabs — one clip per caption line, with word timings.
 *
 *   ELEVENLABS_API_KEY=... node scripts/voice.js reels/claude-code-6-steps.json
 *     --voice <voice_id>   (or ELEVENLABS_VOICE_ID; spec "voice" field also works)
 *     --model <model_id>   default eleven_multilingual_v2
 *     --force              re-record lines that are already cached
 *
 * Output: out/<name>/voice/line-XX.mp3 + timings.json. render.js picks these up
 * automatically and syncs captions to the real spoken word times.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseArgs, loadReel } = require('./lib');
const { parseWords, plain } = require('../engine/timeline');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { reel, outDir } = loadReel(args._[0]);
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    console.error('ELEVENLABS_API_KEY is not set. Add it to your environment (or a .env you source) and re-run.\nThe reel still renders without voice — captions fall back to estimated timing.');
    process.exit(2);
  }
  const voiceId = args.voice || process.env.ELEVENLABS_VOICE_ID || reel.voice || 'JBFqnCBsd6RMkjVDRZzb';
  const model = args.model || process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
  const dir = path.join(outDir, 'voice');
  fs.mkdirSync(dir, { recursive: true });
  const tPath = path.join(dir, 'timings.json');
  const prev = fs.existsSync(tPath) ? JSON.parse(fs.readFileSync(tPath, 'utf8')) : { lines: {} };
  const timings = { voice: voiceId, model, lines: {} };

  const all = reel.scenes.flatMap((s) => s.say || []);
  let n = 0;
  for (const line of all) {
    const text = plain(line);
    const hash = crypto.createHash('sha1').update(`${voiceId}|${model}|${text}`).digest('hex').slice(0, 10);
    const file = `line-${String(++n).padStart(2, '0')}-${hash}.mp3`;
    const cached = prev.lines[text];
    if (!args.force && cached && cached.hash === hash && fs.existsSync(path.join(dir, cached.file))) {
      timings.lines[text] = cached;
      console.log(`  ✓ cached  ${text}`);
      continue;
    }
    process.stdout.write(`  … voicing ${text}`);
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
      }),
    });
    if (!res.ok) throw new Error(`\nElevenLabs ${res.status}: ${await res.text()}`);
    const data = await res.json();
    fs.writeFileSync(path.join(dir, file), Buffer.from(data.audio_base64, 'base64'));
    const words = wordStarts(data.alignment, parseWords(line).length);
    const ends = data.alignment.character_end_times_seconds;
    timings.lines[text] = { file, hash, duration: ends[ends.length - 1] + 0.05, words };
    process.stdout.write('\r  ✓ voiced \n');
  }
  fs.writeFileSync(tPath, JSON.stringify(timings, null, 2));
  console.log(`Voiceover ready: ${path.relative(process.cwd(), dir)} (${all.length} lines)`);
}

/* Character alignment -> start time of each whitespace-separated word. */
function wordStarts(al, expected) {
  const out = [];
  let inWord = false;
  al.characters.forEach((c, i) => {
    const space = /\s/.test(c);
    if (!space && !inWord) out.push(al.character_start_times_seconds[i]);
    inWord = !space;
  });
  if (out.length !== expected) console.warn(`\n  ! word count mismatch (${out.length} vs ${expected}) — captions use estimated timing for this line`);
  return out;
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
