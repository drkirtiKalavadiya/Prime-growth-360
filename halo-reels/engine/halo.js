/* Halo Reels — premium builders (themes: noir, arctic, ember, or any accent colour). Uses the helpers of stage.js (el, svg, prog, easeOut, easeInOut, backOut, rng, HEAD).
   Premium rules: nothing pops; everything arrives with depth (blur -> sharp, scale, perspective) on a soft curve,
   light travels over gold and glass, and every element keeps a slow idle life so no frame is ever frozen. */
'use strict';
(function () {
  /* palettes: accent, highlight, deep accent, and rgb triplets for glow / light blobs / dust */
  const PALETTES = {
    noir:   { accent: '#E6C27A', hi: '#FFF3D4', deep: '#A87A34', glow: '255,214,150', blob1: '150,104,48', blob2: '90,62,140', dust: '255,236,196', text: '#FBF7EF' },
    arctic: { accent: '#9FD8FF', hi: '#F1FAFF', deep: '#3D7FC0', glow: '170,215,255', blob1: '40,95,160', blob2: '110,80,200', dust: '220,240,255', text: '#F6FAFF' },
    ember:  { accent: '#FF9D7E', hi: '#FFE9DF', deep: '#C8462C', glow: '255,170,130', blob1: '160,62,40', blob2: '120,40,95', dust: '255,222,205', text: '#FFF8F4' },
  };
  const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const toHex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  let P = PALETTES.noir;
  window.applyPalette = function (theme, accent) {
    P = Object.assign({}, PALETTES[theme] || PALETTES.noir);
    if (accent) {                                            // any brand colour: derive the rest from it
      const c = hex(accent);
      P.accent = toHex(c); P.hi = toHex(mix(c, [255, 255, 255], 0.78)); P.deep = toHex(mix(c, [0, 0, 0], 0.4));
      P.glow = mix(c, [255, 255, 255], 0.35).join(','); P.blob1 = mix(c, [0, 0, 0], 0.45).join(','); P.dust = mix(c, [255, 255, 255], 0.7).join(',');
    }
    const r = document.documentElement.style;
    r.setProperty('--accent', P.accent); r.setProperty('--accent-hi', P.hi); r.setProperty('--accent-deep', P.deep);
    r.setProperty('--glow', P.glow); r.setProperty('--text', P.text);
  };
  const smooth = bezier(.16, 1, .3, 1);           // expo-like ease out: fast start, long soft landing
  const soft = bezier(.45, 0, .2, 1);

  /* ---------- kinetic text: line-mask reveals for small words, gold serif accent with a feathered wipe ---------- */
  function hlText(spec, layer, kind) {
    const isHead = kind === 'headword';
    const root = el('div', 'el hl-block', layer);
    const small = spec.small_size || (isHead ? 62 : 52);
    let accSize = spec.accent_size || (isHead ? 196 : 148);
    const words = [];
    const addLine = (list, dir, cls) => {
      if (!list || !list.length) return null;
      const line = el('div', 'hl-line hl-small ' + (cls || ''), root);
      line.style.fontSize = small + 'px';
      list.forEach(([w, t]) => { const m = el('span', 'hl-mask', line); const s = el('span', 'hl-word', m, w); words.push({ n: s, t, dir }); });
      return line;
    };
    if (isHead && spec.bottom) throw new Error('headword: top words + accent only (the head would hide a bottom line); put the rest in a caption');
    addLine(spec.top, 'up');
    let wrap = null, acc = null, hair = null, dl = null, dr = null, accT = null;
    if (spec.accent) {
      const line = el('div', 'hl-line', root);
      wrap = el('span', 'hl-acc-wrap', line);
      wrap.style.fontSize = accSize + 'px';
      el('span', 'hl-acc-shadow', wrap, spec.accent[0]);
      acc = el('span', 'hl-acc', wrap, spec.accent[0]);
      if (spec.italic || (spec.italic === undefined && PLAN.accent_style === 'italic')) { acc.classList.add('it'); wrap.firstChild.classList.add('it'); }
      hair = el('span', 'hl-hair', wrap); dl = el('span', 'hl-diamond', wrap); dr = el('span', 'hl-diamond', wrap);
      accT = spec.accent[1];
    }
    const bot = addLine(spec.bottom, 'up', 'hl-dim');
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
        y = HEAD.top + accSize * 0.2 - (a.bottom - r.top) + (spec.dy || 0);
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
  function hlCard(spec, layer) {
    const root = el('div', 'el hl-glass hl-card', layer);
    if (spec.kicker) el('div', 'hl-card-kicker', root, spec.kicker);
    const title = el('div', 'hl-card-title', root); richText(title, spec.title || '');
    const rows = (spec.rows || []).map(([label, t]) => {
      const r = el('div', 'hl-row', root);
      const tk = svg('svg', { class: 'hl-tick', viewBox: '0 0 48 48' }, r);
      svg('circle', { cx: 24, cy: 24, r: 21, fill: 'rgba(255,255,255,.06)', stroke: `rgba(${hex(P.accent)},.55)`, 'stroke-width': 2 }, tk);
      const fill = svg('circle', { cx: 24, cy: 24, r: 21, fill: P.accent }, tk);
      const chk = svg('path', { d: 'M14 25 L21 32 L34 17', fill: 'none', stroke: '#1A1408', 'stroke-width': 4.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 100 }, tk);
      chk.style.strokeDasharray = '100';
      const lbl = el('span', 'lbl', r, label);
      return { r, fill, chk, lbl, t };
    });
    const sweep = el('div', 'hl-sweep', root);
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
  function hlOrbit(spec, layer) {
    const s = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'el' }, layer);
    const defs = svg('defs', {}, s);
    const f = svg('filter', { id: 'hlglow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    svg('feGaussianBlur', { stdDeviation: 6, result: 'b' }, f);
    const mg = svg('feMerge', {}, f); svg('feMergeNode', { in: 'b' }, mg); svg('feMergeNode', { in: 'SourceGraphic' }, mg);
    const R = spec.radius || HEAD.w * 1.9;
    const cx = HEAD.x, cy = HEAD.top + HEAD.w * 0.72;
    const orbits = [[1.0, 0.30, -16, 0.55], [1.3, 0.26, 12, -0.4], [1.62, 0.22, -6, 0.3]].map(([k, sq, tilt, spd], i) => {
      const rx = R * k, ry = rx * sq;
      const gid = 'hlg' + i;
      const lg = svg('linearGradient', { id: gid, x1: '0', y1: '0', x2: '1', y2: '0' }, defs);
      svg('stop', { offset: '0', 'stop-color': P.accent, 'stop-opacity': 0.05 }, lg);
      svg('stop', { offset: '0.5', 'stop-color': P.hi, 'stop-opacity': 0.9 }, lg);
      svg('stop', { offset: '1', 'stop-color': P.accent, 'stop-opacity': 0.05 }, lg);
      const g = svg('g', {}, s);
      const e = svg('ellipse', { cx: 0, cy: 0, rx, ry, fill: 'none', stroke: `url(#${gid})`, 'stroke-width': 2.4, pathLength: 100, filter: 'url(#hlglow)' }, g);
      e.style.strokeDasharray = '100';
      const comets = [0, 1].map(j => svg('circle', { r: j ? 3.2 : 6, fill: P.hi, filter: 'url(#hlglow)' }, g));
      const trail = Array.from({ length: 6 }, (_, j) => svg('circle', { r: 4.5 - j * 0.6, fill: P.accent, opacity: 0.5 - j * 0.07 }, g));
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
  function hlGlow(spec, layer) {
    const d = el('div', 'el', layer);
    d.style.width = W + 'px'; d.style.height = H + 'px';
    const g = el('div', '', d), beam = el('div', '', d);
    const R = spec.radius || 720, cy = HEAD.top + HEAD.w * 0.75;
    Object.assign(g.style, { position: 'absolute', width: R * 2 + 'px', height: R * 2 + 'px', borderRadius: '50%',
      background: `radial-gradient(circle, rgba(${P.glow},.34) 0%, rgba(${P.glow},.14) 32%, rgba(0,0,0,0) 68%)` });
    Object.assign(beam.style, { position: 'absolute', left: '-300px', top: '-500px', width: '1700px', height: '2400px',
      background: `conic-gradient(from 200deg at 30% 15%, rgba(${P.glow},0) 0deg, rgba(${P.glow},.11) 8deg, rgba(${P.glow},0) 20deg, rgba(${P.glow},0) 360deg)`,
      mixBlendMode: 'screen' });
    return { node: d, update(t, life) {
      const lt = t - life.t0;
      g.style.transform = `translate(${HEAD.x - R}px, ${cy - R}px) scale(${1 + 0.03 * Math.sin(lt * 1.5)})`;
      beam.style.transform = `rotate(${Math.sin(lt * 0.35) * 4}deg)`;
      d.style.opacity = prog(t, life.t0, 0.6);
    } };
  }

  /* ---------- dust: gold bokeh at three depths ---------- */
  function hlDust(spec, layer) {
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
        g.addColorStop(0, `rgba(${P.dust},${a})`); g.addColorStop(q.z > 0.75 ? 0.55 : 0.25, `rgba(${P.glow},${a * 0.6})`); g.addColorStop(1, `rgba(${P.glow},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, q.s, 0, 6.283); ctx.fill();
      }
    } };
  }

  /* ---------- abstract background: night gradient, moving light blobs, thin light streaks ---------- */
  function hlBackground(spec, layer) {
    const c = el('canvas', 'el', layer); c.width = W; c.height = H;
    const ctx = c.getContext('2d'), r = rng(spec.seed || 7);
    const streaks = Array.from({ length: 26 }, () => [r() * W, r() * H, r()]);
    return { node: c, update(t, life) {
      const lt = t - life.t0;
      ctx.fillStyle = '#07070A'; ctx.fillRect(0, 0, W, H);
      const blob = (x, y, rad, col) => { const g = ctx.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
      blob(540 + Math.sin(lt * 0.5) * 220, 700 + Math.cos(lt * 0.4) * 160, 900, `rgba(${P.blob1},.42)`);
      blob(240 + Math.cos(lt * 0.35) * 160, 1500 + Math.sin(lt * 0.45) * 120, 700, `rgba(${P.blob2},.22)`);
      blob(900, 260 + Math.sin(lt * 0.6) * 80, 520, `rgba(${P.glow},.16)`);
      ctx.globalCompositeOperation = 'lighter';
      for (const [x, y, k] of streaks) {                      // thin light streaks drifting slowly: depth without noise
        const yy = ((y + lt * (20 + k * 40)) % (H + 400)) - 200;
        const g = ctx.createLinearGradient(x, yy - 160, x, yy + 160);
        g.addColorStop(0, `rgba(${P.dust},0)`); g.addColorStop(0.5, `rgba(${P.dust},${0.05 + k * 0.08})`); g.addColorStop(1, `rgba(${P.dust},0)`);
        ctx.fillStyle = g; ctx.fillRect(x, yy - 160, 1.2 + k * 1.6, 320);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      const vg = ctx.createRadialGradient(540, 900, 420, 540, 960, 1250);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.75)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    } };
  }

  /* ---------- glass panels (abstract): a layered stack that flies in from depth ---------- */
  function hlPanels(spec, layer) {
    const root = el('div', 'el', layer);
    root.style.width = W + 'px'; root.style.height = H + 'px'; root.style.perspective = '1800px';
    const items = spec.items || [];
    const y0 = spec.y || 360, gap = spec.gap || 235;
    const panels = items.map(([label, t], i) => {
      const p = el('div', 'el hl-glass hl-panel', root);
      el('span', 'num', p, String(i + 1).padStart(2, '0'));
      el('span', 'lbl', p, label);
      const bar = el('div', 'bar', p);
      const sweep = el('div', 'hl-sweep', p);
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
  function hlPills(spec, layer) {
    const root = el('div', 'el hl-pills', layer);
    const items = (spec.items || []).map(([label, t]) => { const c = el('span', 'hl-pill', root); el('i', '', c); el('span', '', c, label); return { c, t }; });
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
  function hlBadge(spec, layer) {
    const root = el('div', 'el hl-badge', layer);
    const s = svg('svg', { width: 320, height: 320, viewBox: '0 0 320 320', style: 'position:absolute;inset:0;overflow:visible' }, root);
    const wave = svg('circle', { cx: 160, cy: 160, r: 120, fill: 'none', stroke: P.accent, 'stroke-width': 3 }, s);
    const ringG = svg('g', {}, s);
    svg('path', { id: 'hlbadgepath' + (spec.t || 0), d: 'M160 160 m -138 0 a 138 138 0 1 1 276 0 a 138 138 0 1 1 -276 0', fill: 'none' }, ringG);
    const tx = svg('text', { fill: P.accent, 'font-family': 'Manrope Variable', 'font-weight': 700, 'letter-spacing': '3', 'font-size': 29 }, ringG);
    const tp = svg('textPath', { href: '#hlbadgepath' + (spec.t || 0) }, tx);
    const unit = spec.ring || ('  ✦  ' + (spec.text || ''));
    tp.textContent = unit;
    const fit = () => {                                      // whole repeats that close the circle exactly, no overlap
      const C = 2 * Math.PI * 138, one = tx.getComputedTextLength() || 1;
      const reps = Math.max(1, Math.floor(C / one));
      tp.textContent = unit.repeat(reps);
      tx.setAttribute('font-size', String(29 * C / (one * reps) * 0.985));
    };
    svg('circle', { cx: 160, cy: 160, r: 152, fill: 'none', stroke: `rgba(${hex(P.accent)},.35)`, 'stroke-width': 1.5 }, s);
    const core = el('div', 'hl-badge-core', root);
    const txt = el('div', 'hl-badge-txt', core, spec.text || '');
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


  /* ---------- counter: a number that counts up on its word, with an arc that fills ---------- */
  function hlCounter(spec, layer) {
    const root = el('div', 'el hl-counter', layer);
    const ring = svg('svg', { width: 520, height: 520, viewBox: '0 0 520 520', class: 'hl-counter-ring' }, root);
    svg('circle', { cx: 260, cy: 260, r: 228, fill: 'none', stroke: 'rgba(255,255,255,.12)', 'stroke-width': 3 }, ring);
    const arc = svg('circle', { cx: 260, cy: 260, r: 228, fill: 'none', stroke: P.accent, 'stroke-width': 6, 'stroke-linecap': 'round',
      pathLength: 100, transform: 'rotate(-90 260 260)', style: `filter: drop-shadow(0 0 10px rgba(${P.glow},.8))` }, ring);
    arc.style.strokeDasharray = '100';
    const head = svg('circle', { r: 9, fill: P.hi, style: `filter: drop-shadow(0 0 12px rgba(${P.glow},1))` }, ring);
    const num = el('div', 'hl-counter-num', root);
    el('div', 'hl-counter-lbl', root, spec.label || '');
    if (spec.size) num.style.fontSize = spec.size + 'px';
    const from = +(spec.from || 0), to = +spec.to, dec = spec.decimals || 0, fill = spec.fill !== undefined ? spec.fill : 1;
    const fmt = v => (spec.prefix || '') + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (spec.suffix || '');
    const x = (spec.x !== undefined ? spec.x : 540) - 260, y = (spec.y !== undefined ? spec.y : 700) - 260;
    const fit = () => {                                       // the final number must fit inside the ring
      num.textContent = fmt(to);
      const w = num.scrollWidth, max = spec.max_width || 400;
      if (w > max) num.style.fontSize = Math.floor(parseFloat(getComputedStyle(num).fontSize) * max / w) + 'px';
      const fs = parseFloat(getComputedStyle(num).fontSize);
      num.style.top = (232 - fs * 0.55) + 'px';
    };
    return { node: root, fit, update(t, life) {
      const p = smooth(prog(t, life.t0, 0.7));
      const c = soft(prog(t, life.t0 + 0.1, spec.dur || 1.5));
      root.style.transform = `translate(${x}px, ${y + (1 - p) * 40}px) scale(${0.9 + 0.1 * p})`;
      root.style.opacity = prog(t, life.t0, 0.35);
      root.style.filter = p < 0.995 ? `blur(${(1 - p) * 12}px)` : '';
      const cc = soft(prog(window.TC, life.t0 + 0.1, spec.dur || 1.5));
      num.textContent = fmt(from + (to - from) * cc);
      arc.style.strokeDashoffset = String(100 - 100 * c * fill);
      const a = (-90 + 360 * c * fill) * Math.PI / 180;
      head.setAttribute('cx', 260 + Math.cos(a) * 228); head.setAttribute('cy', 260 + Math.sin(a) * 228); head.style.opacity = c > 0.01 ? 1 : 0;
    } };
  }

  /* ---------- notification: a glass alert that drops in from the top with a spring ---------- */
  function hlNotify(spec, layer) {
    const root = el('div', 'el hl-glass hl-notify', layer);
    el('div', 'hl-notify-icon', root, spec.icon || (spec.app || 'A').slice(0, 1));
    const body = el('div', 'hl-notify-body', root);
    const top = el('div', 'hl-notify-top', body); el('span', '', top, spec.app || ''); el('span', '', top, spec.when || 'now');
    el('div', 'hl-notify-title', body, spec.title || '');
    if (spec.text) el('div', 'hl-notify-text', body, spec.text);
    const x = spec.x !== undefined ? spec.x : 90, y = spec.y !== undefined ? spec.y : 170;
    return { node: root, update(t, life) {
      const lt = t - life.t0;
      const p = prog(t, life.t0, 0.55);
      const spring = lt > 0 ? 1 - Math.exp(-7 * lt) * Math.cos(lt * 11) : 0;
      root.style.transform = `translate(${x}px, ${y + (1 - spring) * -280}px) scale(${0.94 + 0.06 * smooth(p)})`;
      root.style.opacity = Math.min(1, p * 2.5);
      root.style.filter = p < 0.6 ? `blur(${(1 - p / 0.6) * 10}px)` : '';
    } };
  }

  window.THEMES.halo = { caption: hlText, headword: hlText, card: hlCard, ring: hlOrbit, glow: hlGlow, dust: hlDust,
    background: hlBackground, panels: hlPanels, chips: hlPills, badge: hlBadge, counter: hlCounter, notify: hlNotify };
})();
