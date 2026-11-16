/* Rang Reels — "Luxe" theme builders. Uses the helpers of stage.js (el, svg, prog, easeOut, easeInOut, backOut, rng, HEAD).
   Premium rules: nothing pops; everything arrives with depth (blur -> sharp, scale, perspective) on a soft curve,
   light travels over gold and glass, and every element keeps a slow idle life so no frame is ever frozen. */
'use strict';
(function () {
  const GOLD = '#E6C27A', GOLD_HI = '#FFF3D4';
  const smooth = bezier(.16, 1, .3, 1);           // expo-like ease out: fast start, long soft landing
  const soft = bezier(.45, 0, .2, 1);

  /* ---------- kinetic text: line-mask reveals for small words, gold serif accent with a feathered wipe ---------- */
  function lxText(spec, layer, kind) {
    const isHead = kind === 'headword';
    const root = el('div', 'el lx-block', layer);
    const small = spec.small_size || (isHead ? 62 : 52);
    let accSize = spec.accent_size || (isHead ? 196 : 148);
    const words = [];
    const addLine = (list, dir, cls) => {
      if (!list || !list.length) return null;
      const line = el('div', 'lx-line lx-small ' + (cls || ''), root);
      line.style.fontSize = small + 'px';
      list.forEach(([w, t]) => { const m = el('span', 'lx-mask', line); const s = el('span', 'lx-word', m, w); words.push({ n: s, t, dir }); });
      return line;
    };
    if (isHead && spec.bottom) throw new Error('headword: top words + accent only (the head would hide a bottom line); put the rest in a caption');
    addLine(spec.top, 'up');
    let wrap = null, acc = null, hair = null, dl = null, dr = null, accT = null;
    if (spec.accent) {
      const line = el('div', 'lx-line', root);
      wrap = el('span', 'lx-acc-wrap', line);
      wrap.style.fontSize = accSize + 'px';
      el('span', 'lx-acc-shadow', wrap, spec.accent[0]);
      acc = el('span', 'lx-acc', wrap, spec.accent[0]);
      hair = el('span', 'lx-hair', wrap); dl = el('span', 'lx-diamond', wrap); dr = el('span', 'lx-diamond', wrap);
      accT = spec.accent[1];
    }
    const bot = addLine(spec.bottom, 'up', 'lx-dim');
    const fit = () => {
      if (!wrap) return;
      const maxW = spec.max_width || 900;
      const w = wrap.getBoundingClientRect().width;
      if (w > maxW) { accSize = Math.floor(accSize * maxW / w); wrap.style.fontSize = accSize + 'px'; }
      if (bot) bot.style.marginTop = Math.round(accSize * 0.08) + 'px';
      const ww = wrap.getBoundingClientRect().width;
      dl.style.left = (ww * 0.06 - 14) + 'px'; dr.style.left = (ww * 0.94 + 4) + 'px';
    };
    const place = () => {
      const r = root.getBoundingClientRect();
      let y;
      if (isHead) {
        const a = acc.getBoundingClientRect();
        y = HEAD.top + accSize * 0.34 - (a.bottom - r.top) + (spec.dy || 0);
      } else y = (spec.y || 1330) - r.height / 2;
      root.dataset.y = y; root.dataset.x = (isHead ? HEAD.x : (spec.x || 540)) - 540;
    };
    return {
      node: root, fit, place,
      update(t) {
        root.style.transform = `translate(${+root.dataset.x}px, ${+root.dataset.y}px)`;
        words.forEach(w => {
          const p = smooth(prog(t, w.t, 0.7));
          w.n.style.transform = `translateY(${(1 - p) * 110}%)`;
          w.n.style.filter = p < 1 ? `blur(${(1 - p) * 8}px)` : '';
          w.n.style.opacity = prog(t, w.t, 0.35);
        });
        if (acc) {
          const p = smooth(prog(t, accT, 1.0));
          const wipe = prog(t, accT, 0.75) * 135 - 15;           // feathered left-to-right reveal
          const mask = `linear-gradient(90deg, #000 ${wipe}%, rgba(0,0,0,0) ${wipe + 22}%)`;
          wrap.style.webkitMaskImage = mask; wrap.style.maskImage = mask;
          wrap.style.transform = `translateY(${(1 - p) * 34}px) scale(${1.07 - 0.07 * p})`;
          wrap.style.filter = p < 1 ? `blur(${(1 - p) * 14}px)` : '';
          // light runs across the gold once on arrival, then drifts slowly
          const sh = prog(t, accT + 0.35, 1.3);
          const pos = 100 - 100 * soft(sh) + (t - accT) * 2.2;
          acc.style.backgroundPosition = `${pos}% 0`;
          const hp = smooth(prog(t, accT + 0.45, 0.8));
          hair.style.transform = `scaleX(${hp})`; hair.style.opacity = hp;
          const dp = prog(t, accT + 0.95, 0.4);
          dl.style.opacity = dr.style.opacity = dp;
          dl.style.transform = dr.style.transform = `rotate(45deg) scale(${0.3 + 0.7 * backOut(dp)})`;
        }
      }
    };
  }

  /* ---------- glass card with 3D entry and a light sweep ---------- */
  function lxCard(spec, layer) {
    const root = el('div', 'el lx-glass lx-card', layer);
    if (spec.kicker) el('div', 'lx-card-kicker', root, spec.kicker);
    const title = el('div', 'lx-card-title', root); richText(title, spec.title || '');
    const rows = (spec.rows || []).map(([label, t]) => {
      const r = el('div', 'lx-row', root);
      const tk = svg('svg', { class: 'lx-tick', viewBox: '0 0 48 48' }, r);
      svg('circle', { cx: 24, cy: 24, r: 21, fill: 'rgba(255,255,255,.06)', stroke: 'rgba(230,194,122,.55)', 'stroke-width': 2 }, tk);
      const fill = svg('circle', { cx: 24, cy: 24, r: 21, fill: GOLD }, tk);
      const chk = svg('path', { d: 'M14 25 L21 32 L34 17', fill: 'none', stroke: '#1A1408', 'stroke-width': 4.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 100 }, tk);
      chk.style.strokeDasharray = '100';
      const lbl = el('span', 'lbl', r, label);
      return { r, fill, chk, lbl, t };
    });
    const sweep = el('div', 'lx-sweep', root);
    root.style.transformOrigin = '0% 50%';
    const place = () => {
      const h = root.getBoundingClientRect().height;
      root.dataset.x = spec.x !== undefined ? spec.x : 64;
      root.dataset.y = spec.y !== undefined ? spec.y : Math.max(150, HEAD.top - h * 0.7);
    };
    return {
      node: root, place,
      update(t, life) {
        const p = smooth(prog(t, life.t0, 1.0));
        const idle = Math.sin((t - life.t0) * 1.1) * 4;
        root.style.transform = `perspective(1600px) translate(${+root.dataset.x}px, ${+root.dataset.y + (1 - p) * 50 + idle}px) ` +
          `rotateY(${(1 - p) * 34 + Math.sin((t - life.t0) * 0.8) * 2}deg) rotateX(${(1 - p) * 10}deg) scale(${0.9 + 0.1 * p})`;
        root.style.opacity = prog(t, life.t0, 0.5);
        root.style.filter = p < 0.995 ? `blur(${(1 - p) * 12}px)` : '';
        const sw = soft(prog(t, life.t0 + 0.55, 1.1));
        sweep.style.transform = `translateX(${-60 + sw * 380}%) skewX(-12deg)`;
        sweep.style.opacity = sw > 0 && sw < 1 ? 1 : 0;
        rows.forEach(r => {
          const q = prog(t, r.t, 0.45);
          r.fill.setAttribute('r', String(21 * backOut(prog(t, r.t, 0.35))));
          r.fill.style.opacity = Math.min(1, q * 2);
          r.chk.style.strokeDashoffset = String(100 - 100 * smooth(prog(t, r.t + 0.12, 0.4)));
          r.lbl.style.opacity = 0.42 + 0.58 * q;
          r.lbl.style.transform = `translateX(${(1 - smooth(q)) * -10}px)`;
        });
      }
    };
  }

  /* ---------- orbit: tilted hairline ellipses with travelling light, behind the head ---------- */
  function lxOrbit(spec, layer) {
    const s = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'el' }, layer);
    const defs = svg('defs', {}, s);
    const f = svg('filter', { id: 'lxglow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    svg('feGaussianBlur', { stdDeviation: 6, result: 'b' }, f);
    const mg = svg('feMerge', {}, f); svg('feMergeNode', { in: 'b' }, mg); svg('feMergeNode', { in: 'SourceGraphic' }, mg);
    const R = spec.radius || HEAD.w * 1.9;
    const cx = HEAD.x, cy = HEAD.top + HEAD.w * 0.72;
    const orbits = [[1.0, 0.30, -16, 0.55], [1.3, 0.26, 12, -0.4], [1.62, 0.22, -6, 0.3]].map(([k, sq, tilt, spd], i) => {
      const rx = R * k, ry = rx * sq;
      const gid = 'lxg' + i;
      const lg = svg('linearGradient', { id: gid, x1: '0', y1: '0', x2: '1', y2: '0' }, defs);
      svg('stop', { offset: '0', 'stop-color': GOLD, 'stop-opacity': 0.05 }, lg);
      svg('stop', { offset: '0.5', 'stop-color': GOLD_HI, 'stop-opacity': 0.9 }, lg);
      svg('stop', { offset: '1', 'stop-color': GOLD, 'stop-opacity': 0.05 }, lg);
      const g = svg('g', {}, s);
      const e = svg('ellipse', { cx: 0, cy: 0, rx, ry, fill: 'none', stroke: `url(#${gid})`, 'stroke-width': 2.4, pathLength: 100, filter: 'url(#lxglow)' }, g);
      e.style.strokeDasharray = '100';
      const comets = [0, 1].map(j => svg('circle', { r: j ? 3.2 : 6, fill: GOLD_HI, filter: 'url(#lxglow)' }, g));
      const trail = Array.from({ length: 6 }, (_, j) => svg('circle', { r: 4.5 - j * 0.6, fill: GOLD, opacity: 0.5 - j * 0.07 }, g));
      return { g, e, rx, ry, tilt, spd, comets, trail, ph: i * 2.1 };
    });
    return { node: s, update(t, life) {
      const lt = t - life.t0;
      const p = smooth(prog(t, life.t0, 1.2));
      s.style.opacity = prog(t, life.t0, 0.5) * (spec.opacity || 1);
      orbits.forEach((o, i) => {
        o.g.setAttribute('transform', `translate(${cx} ${cy}) rotate(${o.tilt + Math.sin(lt * 0.4 + i) * 2}) scale(${0.86 + 0.14 * p})`);
        o.e.style.strokeDashoffset = String(100 - 100 * smooth(prog(t, life.t0 + i * 0.12, 1.3)));
        const pos = a => [Math.cos(a) * o.rx, Math.sin(a) * o.ry];
        const a0 = o.ph + lt * o.spd * 1.6;
        o.comets.forEach((c, j) => { const [x, y] = pos(a0 + j * Math.PI); c.setAttribute('cx', x); c.setAttribute('cy', y); c.style.opacity = p; });
        o.trail.forEach((c, j) => { const [x, y] = pos(a0 - Math.sign(o.spd) * (j + 1) * 0.07); c.setAttribute('cx', x); c.setAttribute('cy', y); c.style.opacity = p * (0.5 - j * 0.07); });
      });
    } };
  }

  /* ---------- warm key glow + a slow light beam ---------- */
  function lxGlow(spec, layer) {
    const d = el('div', 'el', layer);
    d.style.width = W + 'px'; d.style.height = H + 'px';
    const g = el('div', '', d), beam = el('div', '', d);
    const R = spec.radius || 720, cy = HEAD.top + HEAD.w * 0.75;
    Object.assign(g.style, { position: 'absolute', width: R * 2 + 'px', height: R * 2 + 'px', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(255,214,150,.34) 0%, rgba(214,160,90,.16) 32%, rgba(0,0,0,0) 68%)' });
    Object.assign(beam.style, { position: 'absolute', left: '-300px', top: '-500px', width: '1700px', height: '2400px',
      background: 'conic-gradient(from 200deg at 30% 15%, rgba(255,230,180,0) 0deg, rgba(255,230,180,.10) 8deg, rgba(255,230,180,0) 20deg, rgba(255,230,180,0) 360deg)',
      mixBlendMode: 'screen' });
    return { node: d, update(t, life) {
      const lt = t - life.t0;
      g.style.transform = `translate(${HEAD.x - R}px, ${cy - R}px) scale(${1 + 0.03 * Math.sin(lt * 1.5)})`;
      beam.style.transform = `rotate(${Math.sin(lt * 0.35) * 4}deg)`;
      d.style.opacity = prog(t, life.t0, 0.6);
    } };
  }

  /* ---------- dust: gold bokeh at three depths ---------- */
  function lxDust(spec, layer) {
    const c = el('canvas', 'el', layer); c.width = W; c.height = H;
    const ctx = c.getContext('2d'), r = rng(spec.seed || 3);
    const ps = Array.from({ length: spec.count || 70 }, () => {
      const z = r();                                         // 0 far .. 1 near
      return { x: r() * W, y: r() * H, z, s: 1.2 + z * z * 16, v: 8 + z * 30, ph: r() * 6.28, sw: 10 + r() * 30 };
    });
    return { node: c, update(t, life) {
      const lt = t - life.t0;
      ctx.clearRect(0, 0, W, H);
      for (const q of ps) {
        const y = ((q.y - lt * q.v) % (H + 80) + H + 80) % (H + 80) - 40;
        const x = q.x + Math.sin(lt * 0.6 + q.ph) * q.sw;
        const a = (q.z > 0.75 ? 0.22 : 0.5) * (0.55 + 0.45 * Math.sin(lt * 1.7 + q.ph)) * prog(t, life.t0, 0.8);
        const g = ctx.createRadialGradient(x, y, 0, x, y, q.s);
        g.addColorStop(0, `rgba(255,236,196,${a})`); g.addColorStop(q.z > 0.75 ? 0.55 : 0.25, `rgba(230,194,122,${a * 0.6})`); g.addColorStop(1, 'rgba(230,194,122,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, q.s, 0, 6.283); ctx.fill();
      }
    } };
  }

  /* ---------- abstract background: night gradient, moving light, faint bandhani micro-pattern ---------- */
  function lxBackground(spec, layer) {
    const c = el('canvas', 'el', layer); c.width = W; c.height = H;
    const ctx = c.getContext('2d'), r = rng(spec.seed || 7);
    const dots = [];
    for (let y = 0; y < H + 60; y += 44) for (let x = 0; x < W + 60; x += 44) dots.push([x + ((y / 44) % 2 ? 22 : 0), y, r()]);
    return { node: c, update(t, life) {
      const lt = t - life.t0;
      ctx.fillStyle = '#07070A'; ctx.fillRect(0, 0, W, H);
      const blob = (x, y, rad, col) => { const g = ctx.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
      blob(540 + Math.sin(lt * 0.5) * 220, 700 + Math.cos(lt * 0.4) * 160, 900, 'rgba(150,104,48,.42)');
      blob(240 + Math.cos(lt * 0.35) * 160, 1500 + Math.sin(lt * 0.45) * 120, 700, 'rgba(90,62,140,.22)');
      blob(900, 260 + Math.sin(lt * 0.6) * 80, 520, 'rgba(255,214,150,.16)');
      ctx.fillStyle = 'rgba(255,230,190,1)';
      for (const [x, y, k] of dots) {                         // a whisper of bandhani: tiny dots that breathe
        const a = 0.035 + 0.035 * Math.sin(lt * 1.2 + k * 6.28 + x * 0.004);
        ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y - (lt * 6) % 44, 1.6 + k, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const vg = ctx.createRadialGradient(540, 900, 420, 540, 960, 1250);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.75)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    } };
  }

  /* ---------- glass panels (abstract): a layered stack that flies in from depth ---------- */
  function lxPanels(spec, layer) {
    const root = el('div', 'el', layer);
    root.style.width = W + 'px'; root.style.height = H + 'px'; root.style.perspective = '1800px';
    const items = spec.items || [];
    const y0 = spec.y || 360, gap = spec.gap || 235;
    const panels = items.map(([label, t], i) => {
      const p = el('div', 'el lx-glass lx-panel', root);
      el('span', 'num', p, String(i + 1).padStart(2, '0'));
      el('span', 'lbl', p, label);
      const bar = el('div', 'bar', p);
      const sweep = el('div', 'lx-sweep', p);
      return { p, bar, sweep, t, i, x: 190 + (i % 2 ? 40 : -40), y: y0 + i * gap };
    });
    return { node: root, update(t) {
      panels.forEach(q => {
        const lt = t - q.t;
        const p = smooth(prog(t, q.t, 0.95));
        const dir = q.i % 2 ? 1 : -1;
        const fl = Math.sin(lt * 1.3 + q.i) * 6;
        q.p.style.transform = `translate3d(${q.x + dir * (1 - p) * 160}px, ${q.y + fl}px, ${-700 * (1 - p)}px) ` +
          `rotateY(${dir * (8 + (1 - p) * 40)}deg) rotateX(${(1 - p) * 18}deg)`;
        q.p.style.opacity = prog(t, q.t, 0.4);
        q.p.style.filter = p < 0.995 ? `blur(${(1 - p) * 16}px)` : '';
        q.bar.style.transform = `scaleX(${smooth(prog(t, q.t + 0.4, 0.9))})`;
        const sw = soft(prog(t, q.t + 0.5, 1.0));
        q.sweep.style.transform = `translateX(${-60 + sw * 380}%) skewX(-12deg)`; q.sweep.style.opacity = sw > 0 && sw < 1 ? 1 : 0;
      });
    } };
  }

  /* ---------- glass pills ---------- */
  function lxPills(spec, layer) {
    const root = el('div', 'el lx-pills', layer);
    const items = (spec.items || []).map(([label, t]) => { const c = el('span', 'lx-pill', root); el('i', '', c); el('span', '', c, label); return { c, t }; });
    const place = () => { const h = root.getBoundingClientRect().height; root.dataset.y = (spec.y || 1620) - h / 2; };
    return { node: root, place, update(t) {
      root.style.transform = `translateY(${+root.dataset.y}px)`;
      items.forEach(i => {
        const p = smooth(prog(t, i.t, 0.7));
        i.c.style.transform = `translateY(${(1 - p) * 40}px) scale(${0.86 + 0.14 * p})`;
        i.c.style.opacity = prog(t, i.t, 0.35);
        i.c.style.filter = p < 0.995 ? `blur(${(1 - p) * 10}px)` : '';
      });
    } };
  }

  /* ---------- badge: gold seal with rotating text ring and a shockwave ---------- */
  function lxBadge(spec, layer) {
    const root = el('div', 'el lx-badge', layer);
    const s = svg('svg', { width: 320, height: 320, viewBox: '0 0 320 320', style: 'position:absolute;inset:0;overflow:visible' }, root);
    const wave = svg('circle', { cx: 160, cy: 160, r: 120, fill: 'none', stroke: GOLD, 'stroke-width': 3 }, s);
    const ringG = svg('g', {}, s);
    svg('path', { id: 'lxbadgepath' + (spec.t || 0), d: 'M160 160 m -138 0 a 138 138 0 1 1 276 0 a 138 138 0 1 1 -276 0', fill: 'none' }, ringG);
    const tx = svg('text', { fill: GOLD, 'font-family': 'Hind Vadodara', 'font-weight': 600, 'font-size': 29 }, ringG);
    const tp = svg('textPath', { href: '#lxbadgepath' + (spec.t || 0) }, tx);
    const unit = spec.ring || ('  ✦  ' + (spec.text || ''));
    tp.textContent = unit;
    const fit = () => {                                      // whole repeats that close the circle exactly, no overlap
      const C = 2 * Math.PI * 138, one = tx.getComputedTextLength() || 1;
      const reps = Math.max(1, Math.floor(C / one));
      tp.textContent = unit.repeat(reps);
      tx.setAttribute('font-size', String(29 * C / (one * reps) * 0.985));
    };
    svg('circle', { cx: 160, cy: 160, r: 152, fill: 'none', stroke: 'rgba(230,194,122,.35)', 'stroke-width': 1.5 }, s);
    const core = el('div', 'lx-badge-core', root);
    const txt = el('div', 'lx-badge-txt', core, spec.text || '');
    if (spec.size) txt.style.fontSize = spec.size + 'px';
    const x = (spec.x !== undefined ? spec.x : 800) - 160, y = (spec.y !== undefined ? spec.y : 980) - 160;
    return { node: root, fit, update(t, life) {
      const lt = t - life.t0;
      const p = smooth(prog(t, life.t0, 0.8));
      root.style.transform = `translate(${x}px, ${y}px) rotate(${(1 - p) * -40 + (spec.rotate !== undefined ? spec.rotate : -6)}deg) scale(${(0.55 + 0.45 * p) * (spec.scale || 1.4)})`;
      root.style.opacity = prog(t, life.t0, 0.3);
      root.style.filter = p < 0.995 ? `blur(${(1 - p) * 12}px)` : '';
      ringG.setAttribute('transform', `rotate(${lt * 18} 160 160)`);
      const w = prog(t, life.t0 + 0.25, 0.7);
      wave.setAttribute('r', String(120 + w * 120)); wave.style.opacity = w > 0 ? (1 - w) * 0.8 : 0;
    } };
  }

  window.THEMES.luxe = { caption: lxText, headword: lxText, card: lxCard, ring: lxOrbit, glow: lxGlow, dust: lxDust,
    bandhani: lxBackground, toran: lxPanels, panels: lxPanels, chips: lxPills, stamp: lxBadge, badge: lxBadge };
})();
