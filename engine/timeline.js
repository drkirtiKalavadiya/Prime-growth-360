/*
 * Timeline builder — shared by the Node scripts and the browser engine.
 *
 * Turns a reel spec (reels/*.json) into absolute timings:
 *   reel.scenes[i].say[j]  -> caption line with per-word start times
 *   visual `at` values     -> seconds (scene-local)
 *
 * Word timings come from ElevenLabs alignment when a voiceover exists,
 * otherwise from a reading-speed estimate so the reel still works silent.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ReelTimeline = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const WORD_SEC = 0.22; // silent reading pace per word
  const PAUSE = { ',': 0.1, ':': 0.15, ';': 0.15, '.': 0.22, '?': 0.22, '!': 0.22 };
  const LINE_GAP = 0.12; // breath between caption lines
  const SCENE_TAIL = 0.35; // hold after a scene's last word
  const READ_HOLD = 0.3; // silent reels: extra reading time once a line is fully shown

  /** "every *step* you need" -> [{text:'every',emph:false}, {text:'step',emph:true}, ...] */
  function parseWords(line) {
    const out = [];
    let emph = false;
    for (const raw of line.split(/\s+/).filter(Boolean)) {
      let w = raw;
      const opens = w.startsWith('*');
      if (opens) { emph = true; w = w.slice(1); }
      let closes = false;
      // closing star may sit before trailing punctuation: *files.* or *files*.
      const m = w.match(/^(.*?)\*([.,!?:;]*)$/);
      if (m) { closes = true; w = m[1] + m[2]; }
      out.push({ text: w, emph });
      if (closes) emph = false;
    }
    return out;
  }

  function plain(line) {
    return line.replace(/\*/g, '');
  }

  function estimateWordStarts(words) {
    let t = 0;
    const indic = words.some((w) => /[\u0900-\u0DFF]/.test(w.text));
    const starts = [];
    for (const w of words) {
      starts.push(t);
      const last = w.text.slice(-1);
      t += (indic ? WORD_SEC * 1.0 : WORD_SEC) + Math.min(0.12, w.text.length * 0.012) + (PAUSE[last] || PAUSE[last === '।' ? '.' : ''] || 0);
    }
    return { starts, duration: t };
  }

  /**
   * @param {object} reel   parsed reel JSON
   * @param {object} [voice] voice/timings.json ({lines: {[plainText]: {file, duration, words:[start]}}})
   */
  function buildTimeline(reel, voice) {
    const fps = reel.fps || 30;
    const scenes = [];
    const audio = [];
    let clock = 0;

    reel.scenes.forEach((scene, si) => {
      const start = clock;
      const lines = [];
      let local = 0;
      (scene.say || []).forEach((text) => {
        const words = parseWords(text);
        const v = voice && voice.lines && voice.lines[plain(text)];
        let starts, duration;
        if (v && v.words && v.words.length === words.length) {
          starts = v.words;
          duration = v.duration;
          audio.push({ file: v.file, at: start + local });
        } else {
          // no voice: captions carry the story, so hold each finished line long enough to read
          ({ starts, duration } = estimateWordStarts(words));
          duration += READ_HOLD;
        }
        lines.push({
          start: local,
          end: local + duration,
          words: words.map((w, i) => ({ ...w, start: local + starts[i] })),
        });
        local += duration + LINE_GAP;
      });
      const length = Math.max(scene.minDuration || 0, (lines.length ? local - LINE_GAP : 1.5) + (scene.hold ?? SCENE_TAIL));

      // `at` can be a number (caption line index, fractional allowed) or {sec: n}
      const resolveAt = (at) => {
        if (at == null) return 0.15;
        if (typeof at === 'object' && at.sec != null) return at.sec;
        if (!lines.length) return at;
        const i = Math.min(Math.floor(at), lines.length - 1);
        const frac = at - Math.floor(at);
        const L = lines[i];
        return L.start + frac * (L.end - L.start);
      };

      scenes.push({
        index: si,
        start,
        end: start + length,
        duration: length,
        theme: scene.theme || 'light',
        kicker: scene.kicker || '',
        label: scene.label ? { text: scene.label, at: resolveAt(scene.labelAt ?? 0) } : null,
        badge: scene.badge ? { n: scene.badge, of: scene.badgeOf || reel.steps || 6, at: resolveAt(scene.labelAt ?? 0) } : null,
        transition: scene.transition || 'cut',
        lines,
        visuals: resolveVisuals(scene.visual, resolveAt),
        fx: (scene.fx || []).map((f) => ({ ...f, at: resolveAt(f.at) })),
      });
      clock += length;
    });

    return {
      title: reel.title || 'reel',
      lang: reel.lang || 'en',
      fps,
      width: 1080,
      height: 1920,
      duration: clock,
      scenes,
      audio,
    };
  }

  // deep-copy visuals, converting every `at` / `doneAt` / `until` to seconds
  function resolveVisuals(visual, resolveAt) {
    if (!visual) return [];
    const list = Array.isArray(visual) ? visual : [visual];
    const walk = (v) => {
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object') {
        const o = {};
        for (const [k, val] of Object.entries(v)) {
          o[k] = /^(at|doneAt|until|hotAt|goodAt|fixedAt)$/.test(k) ? resolveAt(val) : walk(val);
        }
        if (!('at' in o) && 'type' in o) o.at = resolveAt(null);
        return o;
      }
      return v;
    };
    return list.map(walk);
  }

  return { buildTimeline, parseWords, plain };
});
