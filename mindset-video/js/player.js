/* Preview player. Add ?capture to the URL for frame-exact export (no UI, no autoplay). */
(function () {
  const capture = location.search.includes('capture');
  if (capture) document.body.classList.add('capture');
  const scrub = document.getElementById('scrub'), btn = document.getElementById('play'), lbl = document.getElementById('time');
  scrub.max = String(window.DURATION);
  let playing = false, t0 = 0, base = 0;
  const show = t => { MV.renderAt(t); scrub.value = t; lbl.textContent = t.toFixed(2) + 's'; };
  function loop(now) {
    if (!playing) return;
    const t = base + (now - t0) / 1000;
    if (t >= window.DURATION) { playing = false; btn.textContent = 'Play'; show(window.DURATION); return; }
    show(t); requestAnimationFrame(loop);
  }
  btn.onclick = () => {
    playing = !playing; btn.textContent = playing ? 'Pause' : 'Play';
    if (playing) { base = parseFloat(scrub.value); if (base >= window.DURATION - 0.05) base = 0; t0 = performance.now(); requestAnimationFrame(loop); }
  };
  scrub.oninput = () => { playing = false; btn.textContent = 'Play'; show(parseFloat(scrub.value)); };
  document.fonts.ready.then(() => { window.READY = true; show(0); });
})();
