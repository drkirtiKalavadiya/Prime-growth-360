/* Studio UI: preview, scrubbing, image/audio loading and video export. */
(function () {
  'use strict';
  const cfg = window.REEL_CONFIG;
  const params = new URLSearchParams(location.search);
  const $ = id => document.getElementById(id);

  // Output size: ?w=1080 renders a 1080x1920 reel, default is the config size (720x1280).
  const W = parseInt(params.get('w'), 10) || cfg.width;
  const H = Math.round(W * cfg.height / cfg.width);
  const canvas = $('reel');
  canvas.width = W; canvas.height = H;

  const reel = new window.Reel(canvas, cfg);
  const fps = cfg.fps || 30;
  let t = 0, playing = false, last = 0, recorder = null;

  // ---------- assets ----------
  const names = new Set(['candy', 'toffee']);
  cfg.scenes.forEach(s => { if (s.bg && s.bg.img) names.add(s.bg.img); });

  function loadImage(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }
  async function loadFolderAssets() {
    const exts = ['jpg', 'png', 'webp', 'jpeg'];
    await Promise.all([...names].map(async n => {
      for (const e of exts) {
        const img = await loadImage(`assets/${n}.${e}`);
        if (img) { reel.images[n] = img; return; }
      }
    }));
  }
  async function loadFonts() {
    if (!document.fonts) return;
    const wait = Promise.all(['500', '600', '700', '800', '900'].map(w => document.fonts.load(`${w} 40px Poppins`, '₹0123456789 Months')));
    await Promise.race([wait, new Promise(r => setTimeout(r, 2500))]).catch(() => {});
  }

  $('images').addEventListener('change', async e => {
    let n = 0;
    for (const f of e.target.files) {
      const key = f.name.replace(/\.[^.]+$/, '');
      const img = await loadImage(URL.createObjectURL(f));
      if (img) { reel.images[key] = img; n++; }
    }
    status(`${n} image${n === 1 ? '' : 's'} added.`);
    buildSceneList(); draw();
  });

  const audio = $('track');
  $('audio').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    audio.src = URL.createObjectURL(f);
    status(`Audio: ${f.name}`);
  });

  // ---------- UI ----------
  $('reel-title').textContent = `${cfg.title} · ${reel.scenes.length} scenes · ${fmt(reel.duration)}`;
  const fx = s => (s.fx || []).map(f => f.text || (f.type === 'counter' ? `${f.prefix || ''}${f.to}${f.endSuffix || f.suffix || ''}` : '')).filter(Boolean).join(' · ');
  function buildSceneList() {
    const ol = $('scenes');
    ol.innerHTML = '';
    reel.scenes.forEach((s, i) => {
      const li = document.createElement('li');
      const img = s.bg && s.bg.img;
      const label = fx(s) || (img ? `image ${img}` : s.bg.fallback);
      li.innerHTML = `<span></span><span class="${img && reel.images[img] ? 'ok' : ''}">${img && reel.images[img] ? '●' : '○'} ${s.dur.toFixed(1)}s</span>`;
      li.firstChild.textContent = label;
      li.title = `${img ? 'assets/' + img + '.jpg' : 'procedural'} · enters with ${typeof s.enter === 'object' ? s.enter.type : s.enter || 'cut'}`;
      li.onclick = () => { t = s.start + 0.01; sync(); draw(); };
      ol.appendChild(li);
    });
  }
  function fmt(x) { const m = Math.floor(x / 60), s = Math.floor(x % 60); return `${m}:${String(s).padStart(2, '0')}`; }
  function status(msg) { $('status').textContent = msg; }

  let lastScene = -1;
  function draw() {
    const i = reel.render(t);
    $('scrub').value = Math.round((t / reel.duration) * 1000);
    $('clock').textContent = `${fmt(t)} / ${fmt(reel.duration)}`;
    if (i !== lastScene) {
      [...$('scenes').children].forEach((li, k) => li.classList.toggle('on', k === i));
      lastScene = i;
    }
  }
  function sync() { if (audio.src) { audio.currentTime = Math.min(t, audio.duration || t); } }
  function setPlaying(on) {
    playing = on;
    $('play').textContent = on ? '❚❚' : '▶';
    if (audio.src) { if (on) { sync(); audio.play().catch(() => {}); } else audio.pause(); }
    last = performance.now();
    if (on) requestAnimationFrame(tick);
  }
  function tick(now) {
    if (!playing) return;
    t += (now - last) / 1000; last = now;
    if (t >= reel.duration) {
      if (recorder) { t = reel.duration - 0.001; draw(); stopRecording(); return; }
      if ($('loop').checked) { t = 0; sync(); } else { t = reel.duration - 0.001; draw(); setPlaying(false); return; }
    }
    draw();
    requestAnimationFrame(tick);
  }

  $('play').onclick = () => setPlaying(!playing);
  $('scrub').oninput = e => { t = (e.target.value / 1000) * reel.duration; sync(); draw(); };
  $('hints').onchange = e => { reel.showHints = e.target.checked; draw(); };
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
    if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
    if (e.code === 'ArrowRight') { t = Math.min(reel.duration - 0.01, t + 1); sync(); draw(); }
    if (e.code === 'ArrowLeft') { t = Math.max(0, t - 1); sync(); draw(); }
  });

  // ---------- realtime recording (MediaRecorder) ----------
  let audioCtx, audioSrc;
  function pickMime() {
    const list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return list.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  }
  function startRecording() {
    try { canvas.toDataURL(); } catch (e) {
      status('This browser blocks exporting images opened from disk. Run a local server (see README) or add the images with the "Add scene images" button.');
      return;
    }
    if (!window.MediaRecorder || !canvas.captureStream) { status('Recording needs a recent Chrome, Edge or Firefox.'); return; }
    const stream = canvas.captureStream(fps);
    if (audio.src) {
      audioCtx = audioCtx || new AudioContext();
      if (!audioSrc) { audioSrc = audioCtx.createMediaElementSource(audio); audioSrc.connect(audioCtx.destination); }
      const dest = audioCtx.createMediaStreamDestination();
      audioSrc.connect(dest);
      dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
    }
    const mime = pickMime();
    const chunks = [];
    recorder = new MediaRecorder(stream, { mimeType: mime || undefined, videoBitsPerSecond: 10_000_000 });
    recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      const type = recorder.mimeType || 'video/webm';
      const blob = new Blob(chunks, { type });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `reel.${type.includes('mp4') ? 'mp4' : 'webm'}`;
      a.click();
      status(`Saved ${a.download} (${(blob.size / 1e6).toFixed(1)} MB).`);
      recorder = null;
      $('record').classList.remove('rec'); $('record').textContent = '⏺ Record video';
    };
    reel.showHints = false;
    t = 0; sync(); draw();
    recorder.start(250);
    $('record').classList.add('rec'); $('record').textContent = '■ Stop recording';
    status('Recording in real time… keep this tab visible.');
    setPlaying(true);
  }
  function stopRecording() {
    setPlaying(false);
    reel.showHints = $('hints').checked;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }
  $('record').onclick = () => (recorder ? stopRecording() : startRecording());

  // ---------- boot + headless API (used by tools/render.mjs) ----------
  const ready = (async () => {
    await Promise.all([loadFonts(), loadFolderAssets()]);
    if (params.has('render')) reel.showHints = false;
    buildSceneList();
    draw();
    return { duration: reel.duration, fps, width: W, height: H };
  })();

  window.ReelApp = {
    reel, ready,
    frame(time, quality = 0.92) { t = time; reel.render(time); return canvas.toDataURL('image/jpeg', quality); }
  };
})();
