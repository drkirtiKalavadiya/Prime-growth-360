/* =========================================================================
   Mindset Video Engine
   A tiny deterministic timeline engine for SVG "sketch + watercolor" videos.
   Every frame is a pure function of time t (seconds): renderAt(t).
   That makes the same code usable for live preview AND frame-exact export.
   ========================================================================= */
(function () {
  'use strict';

  const W = 720, H = 1280, FPS = 30;
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- easing ---------- */
  const Ease = {
    linear: p => p,
    in: p => p * p * p,
    out: p => 1 - Math.pow(1 - p, 3),
    inOut: p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    back: p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    elastic: p => (p === 0 || p === 1) ? p : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
    pop: p => { const b = Ease.back(p); return b; },
  };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;

  /* ---------- seeded random (deterministic particles) ---------- */
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  /* ---------- state ---------- */
  const scenes = [];      // {id, start, end, fadeIn, fadeOut, g}
  const tracks = new Map(); // element -> {prop -> [tween]}
  const fxList = [];      // {start, end, fn}
  let root, stage;

  /* ---------- scene + tween authoring API ---------- */
  function scene(id, start, end, markup, opts = {}) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('id', id);
    g.setAttribute('class', 'scene');
    g.innerHTML = markup;
    stage.appendChild(g);
    const sc = { id, start, end, fadeIn: opts.fadeIn ?? 0.25, fadeOut: opts.fadeOut ?? 0.25, g, flash: opts.flash };
    scenes.push(sc);
    return sc;
  }

  // anim(selector | element, start, duration, props, ease)
  // props: { o:[a,b], x:[a,b], y:[a,b], s:[a,b], sx, sy, r:[a,b], draw:[a,b], reveal:[a,b],
  //          revealY:[a,b], blur:[a,b], bright:[a,b], gray:[a,b] }
  function anim(target, start, dur, props, ease = 'inOut') {
    const els = typeof target === 'string' ? Array.from(root.querySelectorAll(target)) : [target];
    if (!els.length) console.warn('anim: no element for', target);
    els.forEach(el => {
      if (!tracks.has(el)) tracks.set(el, {});
      const tr = tracks.get(el);
      for (const k in props) {
        (tr[k] = tr[k] || []).push({ start, dur: Math.max(dur, 1e-4), from: props[k][0], to: props[k][1], ease: Ease[ease] || ease });
        tr[k].sort((a, b) => a.start - b.start);
      }
      if (props.draw) prepareDraw(el);
    });
  }

  // per-frame custom effect between start and end: fn(t, p, localT)
  function fx(start, end, fn) { fxList.push({ start, end, fn }); }

  /* ---------- stroke draw-on ---------- */
  function prepareDraw(el) {
    if (el._strokes) return;
    const list = [];
    const nodes = el.matches('path,line,polyline,polygon,circle,ellipse,rect') ? [el] : el.querySelectorAll('path,line,polyline,polygon,circle,ellipse,rect');
    let total = 0;
    nodes.forEach(n => {
      if (n.closest('.nodraw') || (n !== el && !n.classList.contains('ink') && !n.classList.contains('ink2'))) return;
      let len = 0;
      try { len = n.getTotalLength(); } catch (e) { len = 0; }
      if (!len) return;
      n.style.strokeDasharray = len + ' ' + len;
      list.push({ n, len, at: total });
      total += len;
    });
    el._strokes = list; el._total = total;
  }
  function applyDraw(el, p) {
    if (!el._strokes) return;
    const head = p * el._total;
    for (const s of el._strokes) {
      const local = clamp((head - s.at) / s.len);
      s.n.style.strokeDashoffset = (s.len * (1 - local)).toFixed(2);
      s.n.style.visibility = local <= 0 ? 'hidden' : 'visible';
    }
  }

  function applyWash(el, p) {
    if (!el._washes) {
      el._washes = Array.from(el.querySelectorAll('.fillwash')).map(n => ({ n, base: parseFloat(n.getAttribute('opacity') ?? '1') }));
    }
    for (const w of el._washes) w.n.style.opacity = (w.base * p).toFixed(3);
  }

  /* ---------- value lookup ---------- */
  function valueAt(list, t) {
    if (t <= list[0].start) return list[0].from;
    let cur = list[0];
    for (const tw of list) { if (tw.start <= t) cur = tw; else break; }
    const p = clamp((t - cur.start) / cur.dur);
    return lerp(cur.from, cur.to, cur.ease(p));
  }

  function applyTracks(el, tr, t) {
    const v = k => (tr[k] ? valueAt(tr[k], t) : undefined);
    const o = v('o'); if (o !== undefined) el.style.opacity = o.toFixed(3);
    const x = v('x') || 0, y = v('y') || 0, s = v('s'), sx = v('sx'), sy = v('sy'), r = v('r') || 0;
    if (tr.x || tr.y || tr.s || tr.r || tr.sx || tr.sy) {
      const S = s === undefined ? 1 : s;
      if (!el._tb) { el.style.transformBox = 'fill-box'; el.style.transformOrigin = el.getAttribute('data-origin') || 'center'; el._tb = 1; }
      el.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${r.toFixed(2)}deg) scale(${(S * (sx ?? 1)).toFixed(4)},${(S * (sy ?? 1)).toFixed(4)})`;
    }
    const d = v('draw'); if (d !== undefined) applyDraw(el, d);
    const w = v('wash'); if (w !== undefined) applyWash(el, w);
    const rv = v('reveal'); if (rv !== undefined) el.style.clipPath = `inset(-20% ${((1 - rv) * 100).toFixed(2)}% -20% -5%)`;
    const ry = v('revealY'); if (ry !== undefined) el.style.clipPath = `inset(-5% -5% ${((1 - ry) * 100).toFixed(2)}% -5%)`;
    const f = [];
    const bl = v('blur'); if (bl !== undefined && bl > 0.01) f.push(`blur(${bl.toFixed(2)}px)`);
    const br = v('bright'); if (br !== undefined) f.push(`brightness(${br.toFixed(3)})`);
    const gr = v('gray'); if (gr !== undefined) f.push(`grayscale(${gr.toFixed(3)})`);
    if (tr.blur || tr.bright || tr.gray) el.style.filter = f.join(' ');
  }

  /* ---------- render ---------- */
  let lastT = -1;
  function renderAt(t) {
    lastT = t;
    for (const sc of scenes) {
      const active = t >= sc.start - sc.fadeIn && t < sc.end + sc.fadeOut;
      sc.g.style.display = active ? '' : 'none';
      if (!active) continue;
      let o = 1;
      if (t < sc.start) o = clamp((t - (sc.start - sc.fadeIn)) / sc.fadeIn);
      else if (t > sc.end) o = 1 - clamp((t - sc.end) / sc.fadeOut);
      sc.g.style.opacity = o.toFixed(3);
    }
    tracks.forEach((tr, el) => {
      const sc = el.closest('.scene');
      if (sc && sc.style.display === 'none') return;
      applyTracks(el, tr, t);
    });
    for (const f of fxList) {
      if (t >= f.start && t <= f.end) f.fn(t, (t - f.start) / (f.end - f.start), t - f.start);
    }
  }

  function init(rootSvg) {
    root = rootSvg;
    stage = root.querySelector('#stage');
  }

  window.MV = { W, H, FPS, NS, Ease, clamp, lerp, rng, scene, anim, fx, renderAt, init, scenes, get root() { return root; }, get lastT() { return lastT; } };
})();
