/*
 * Reel engine — builds every scene from a timeline and renders any moment with seek(t).
 *
 * Everything is a pure function of time: no CSS animations, no timers. That makes
 * frame-by-frame rendering deterministic (scripts/render.js screenshots seek(t) for
 * each frame) and lets the preview player scrub freely.
 */
(function () {
  'use strict';

  // ---------- easing + helpers ----------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const E = {
    out: (p) => 1 - Math.pow(1 - p, 3),
    inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    back: (p) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
  };
  const h = (tag, cls, html) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    return el;
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /** "GET *CLAUDE CODE*" -> GET <em>CLAUDE CODE</em> */
  const rich = (s) => esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>');
  const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const chars = (s) => (seg ? [...seg.segment(s)].map((x) => x.segment) : [...s]);
  /** first n user-visible characters — keeps Gujarati conjuncts and matras together */
  const typedSlice = (s, n) => chars(s).slice(0, n).join('');
  // deterministic pseudo-random
  const rand = (seed) => { let x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };

  /*
   * Entrance animations. Each returns the style for progress p (0..1).
   * Before `at` an element is hidden; after `at+dur` it rests at its final state.
   */
  const KINDS = {
    fade: (p) => ({ o: p }),
    rise: (p) => ({ o: E.out(p), y: (1 - E.out(p)) * 26 }),
    drop: (p) => ({ o: clamp(p * 3), y: (1 - E.back(p)) * -70 }),
    pop: (p) => ({ o: clamp(p * 2.5), s: 0.55 + 0.45 * E.back(p) }),
    stamp: (p) => ({ o: clamp(p * 4), s: 2.1 - 1.1 * E.out(p), r: -10 + 7 * E.out(p) }),
    slideL: (p) => ({ o: E.out(p), x: (1 - E.out(p)) * -60 }),
    slideR: (p) => ({ o: E.out(p), x: (1 - E.out(p)) * 60 }),
    word: (p) => ({ o: E.out(p), y: (1 - E.out(p)) * 10 }),
  };

  function makeScene(sc) {
    const root = h('div', `scene ${sc.world ? 'cinema text-' + sc.textStyle : sc.theme + ' text-' + sc.textStyle}`);
    if (sc.world) {
      const pal = (window.World3D && window.World3D.PALETTES[sc.world.palette]) || { accent: '#ffcf3f', dark: true };
      root.style.setProperty('--accent', sc.world.textAccent || pal.accent);
      if (pal.dark === false) root.classList.add('lightpal');
      root.appendChild(h('div', 'scrim'));
    }
    const anims = []; // {el, at, kind, dur, base}
    const updaters = []; // fn(localTime)
    const A = (el, at, kind = 'rise', dur = 0.45, base = '') => { anims.push({ el, at: at || 0, kind, dur, base }); return el; };
    const U = (fn) => updaters.push(fn);

    if (sc.kicker) root.appendChild(h('div', 'kicker', esc(sc.kicker)));

    // caption: one line visible at a time, words revealed as they're spoken
    const cap = h('div', 'caption');
    root.appendChild(cap);
    const lineEls = sc.lines.map((L) => {
      const wrap = h('div', 'line');
      wrap.style.display = 'none';
      L.words.forEach((w) => {
        const span = h('span', w.emph ? 'w e' : 'w', esc(w.text));
        wrap.appendChild(span);
        if (sc.textStyle === 'pop') A(span, L.start, 'pop', 0.22);
        else A(span, w.start, sc.textStyle === 'impact' ? 'pop' : 'word', sc.textStyle === 'impact' ? 0.3 : 0.18);
      });
      cap.appendChild(wrap);
      return wrap;
    });
    U((t) => {
      let cur = 0;
      sc.lines.forEach((L, i) => { if (t >= L.start - 0.001) cur = i; });
      lineEls.forEach((el, i) => { el.style.display = i === cur ? 'block' : 'none'; });
      if (sc.textStyle === 'pop' && sc.lines[cur]) { // karaoke highlight on the word being spoken
        const ws = sc.lines[cur].words;
        lineEls[cur].querySelectorAll('.w').forEach((el, k) => el.classList.toggle('act', t >= ws[k].start && (k === ws.length - 1 || t < ws[k + 1].start)));
      }
    });

    if (sc.label) {
      const lab = h('div', 'label' + (sc.badge ? '' : ' center'));
      lab.appendChild(A(h('div', 'txt', rich(sc.label.text)), sc.label.at, 'slideL', 0.5));
      if (sc.badge) lab.appendChild(A(badge(sc.badge.n, sc.badge.of), sc.badge.at + 0.15, 'pop', 0.5, 'rotate(4deg)'));
      root.appendChild(lab);
    }

    const vis = h('div', 'visuals' + (sc.visuals.some((v) => v.alignTop) ? ' top' : ''));
    if (!sc.label) vis.style.top = '170px';
    sc.visuals.forEach((v) => {
      const build = VISUALS[v.type];
      if (!build) { console.warn('unknown visual', v.type); return; }
      const el = build(v, { A, U, root });
      if (el) {
        el.classList.add('v');
        if (v.dy) el.style.marginTop = v.dy + 'px';
        vis.appendChild(el);
      }
    });
    root.appendChild(vis);

    sc.fx.forEach((f) => FX[f.type] && FX[f.type](f, { A, U, root }));

    return { root, anims, updaters, sc };
  }

  function badge(n, of) {
    const b = h('div', 'badge', String(n));
    const dots = h('div', 'dots');
    for (let i = 1; i <= of; i++) dots.appendChild(h('i', i < n ? 'on' : i === n ? 'cur' : ''));
    b.appendChild(dots);
    return b;
  }

  // ---------- visuals ----------
  const VISUALS = {
    /* Corkboard of pinned polaroids + sticky note, with an optional stamped card on top. */
    board(v, { A, U }) {
      const el = h('div', 'board');
      const spots = [[14, 10, -6], [130, -6, 3], [250, 14, 8], [18, 190, -3], [262, 170, 5], [22, 380, 4], [256, 370, -5]];
      const tints = ['#8fa3b8', '#2a2a2a', '#5f7d9c', '#3d2f1e', '#ddd8cf', '#1d2b4a', '#7c8f6e'];
      (v.cards || []).forEach((c, i) => {
        const [x, y, r] = spots[i % spots.length];
        const p = h('div', 'polaroid', `<div class="ph" style="background:linear-gradient(150deg, ${tints[i % tints.length]}, #111)"></div><div class="cap">${esc(c)}</div><div class="pin"></div>`);
        p.style.left = x + 'px'; p.style.top = y + 'px';
        el.appendChild(A(p, (v.at || 0) + i * 0.12, 'drop', 0.5, `rotate(${r}deg)`));
      });
      if (v.note) {
        const s = h('div', 'sticky', esc(v.note));
        s.style.left = '160px'; s.style.top = '160px';
        el.appendChild(A(s, (v.at || 0) + 0.5, 'pop', 0.5, 'rotate(-5deg)'));
      }
      if (v.stamp) {
        const st = h('div', 'stamp' + (chars(v.stamp.big).length > 4 ? ' long' : ''), `<div class="no">Nº ${esc(v.stamp.no || '001')}</div><div class="top">${esc(v.stamp.top)}</div><div class="big">${esc(v.stamp.big)}</div><div class="rule"></div><div class="pin" style="left:30%"></div>`);
        el.appendChild(A(st, v.stamp.at, 'stamp', 0.4, 'rotate(-3deg)'));
      }
      // slow push-in on the whole board
      U((t) => { el.style.transform = `scale(${1 + Math.min(t, 6) * 0.004})`; });
      return el;
    },

    /* The "6 STEPS" roadmap grid. `hot` = highlighted step, `sweep` lights them in order. */
    steps(v, { A, U }) {
      const el = h('div', 'steps');
      if (v.title !== false) el.appendChild(A(h('div', 'title', rich(v.title || `*${v.items.length}* STEPS`)), v.at, 'pop', 0.5));
      const grid = h('div', 'grid');
      grid.appendChild(h('div', 'track'));
      const cards = v.items.map((it, i) => {
        const c = h('div', 'step', `<div class="n">${i + 1}</div><div><div class="t">${esc(it.title)}</div><div class="s">// ${esc(it.sub || '')}</div></div>`);
        grid.appendChild(A(c, (v.at || 0) + 0.25 + i * 0.13, 'pop', 0.45));
        return c;
      });
      el.appendChild(grid);
      U((t) => {
        cards.forEach((c, i) => {
          let hot = v.hot === i + 1 && t >= (v.at || 0) + 1;
          if (v.sweep) {
            const per = (v.until - v.at - 0.4) / cards.length;
            const k = Math.floor((t - v.at - 0.4) / per);
            hot = k === i;
          }
          c.classList.toggle('hot', hot);
        });
      });
      return el;
    },

    /* Rounded app icon with a starburst. */
    appIcon(v, { A, U }) {
      const el = h('div', 'appicon');
      const icon = h('div', 'icon', `<svg viewBox="-50 -50 100 100" width="104" height="104">${starburst()}</svg>`);
      const rays = h('div', 'rays');
      for (let i = 0; i < 8; i++) {
        const r = h('i');
        r.style.transform = `rotate(${i * 45 + 22}deg) translateY(126px)`;
        rays.appendChild(r);
      }
      icon.appendChild(rays);
      el.appendChild(A(icon, v.at, 'pop', 0.6));
      el.appendChild(A(h('div', 'name', rich(v.name || 'Claude *Code*')), (v.at || 0) + 0.3, 'rise', 0.5));
      U((t) => {
        const lt = t - (v.at || 0);
        rays.style.opacity = clamp((lt - 0.4) * 3) * (0.6 + 0.4 * Math.sin(lt * 5));
        icon.querySelector('svg').style.transform = `rotate(${lt * 18}deg)`;
      });
      return el;
    },

    /* Browser (crossed out) vs desktop app (ticked). */
    versus(v, { A }) {
      const el = h('div', 'versus');
      const bad = h('div', 'vcard bad shadow', `<div class="screen">${esc(v.badIcon || '⌂')}</div><div class="lbl">${esc(v.bad)}</div><div class="x"></div><div class="mark">✕</div>`);
      const good = h('div', 'vcard good shadow', `<div class="screen">${esc(v.goodIcon || '✳')}</div><div class="lbl">${esc(v.good)}</div><div class="mark">✓</div>`);
      el.appendChild(A(bad, v.at, 'slideL', 0.5, 'rotate(-4deg)'));
      el.appendChild(A(good, v.goodAt ?? (v.at || 0) + 0.6, 'pop', 0.5, 'rotate(3deg)'));
      A(bad.querySelector('.x'), (v.at || 0) + 0.45, 'pop', 0.35);
      A(bad.querySelector('.mark'), (v.at || 0) + 0.5, 'pop', 0.35);
      A(good.querySelector('.mark'), (v.goodAt ?? (v.at || 0) + 0.6) + 0.35, 'pop', 0.4);
      return el;
    },

    /* Desktop folder window where a new folder gets named, letter by letter. */
    finder(v, { A, U }) {
      const el = h('div', 'finder shadow');
      el.innerHTML = `
        <div class="top"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><b>Desktop</b></div>
        <div class="main">
          <div class="side"><div class="h">Favorites</div><div>AirDrop</div><div>Recents</div><div>Applications</div><div class="sel">Desktop</div><div>Documents</div><div>Downloads</div></div>
          <div class="grid">
            <div class="doc" style="left:24px;top:14px"><div class="pg"></div>notes.txt</div>
            <div class="doc" style="left:106px;top:14px"><div class="pg"></div>Screenshot.png</div>
            <div class="doc" style="left:188px;top:14px"><div class="pg"></div>invoice.pdf</div>
            <div class="newf"><div class="folder-ic"></div><span class="name"></span></div>
          </div>
        </div>`;
      A(el, v.at, 'rise', 0.5);
      const nf = el.querySelector('.newf');
      const name = el.querySelector('.name');
      const typeAt = (v.at || 0) + 0.6;
      A(nf, typeAt - 0.3, 'pop', 0.4);
      U((t) => {
        const total = chars(v.folder).length;
        const n = clamp(Math.floor((t - typeAt) * 16), 0, total);
        name.textContent = typedSlice(v.folder, n) + (n < total && Math.floor(t * 3) % 2 ? '|' : '');
      });
      if (v.hint) {
        const hint = h('div', 'tag', esc(v.hint));
        hint.style.cssText = 'position:absolute;left:-14px;bottom:-22px;transform:rotate(-4deg)';
        el.appendChild(A(hint, typeAt + 0.4, 'pop', 0.4, 'rotate(-4deg)'));
      }
      return el;
    },

    /* Big blue folder with files sliding in. */
    folder(v, { A, U }) {
      const el = h('div', 'bigfolder');
      el.appendChild(h('div', 'back'));
      const files = v.files || [];
      const papers = files.map((f, i) => {
        const p = h('div', 'paper' + (/\.mp4$/.test(f) ? ' red' : ''), esc(f));
        p.style.left = 40 + i * ((300 - 92) / Math.max(1, files.length - 1)) + 'px';
        el.appendChild(A(p, (v.at || 0) + 0.4 + i * 0.22, 'drop', 0.55, `rotate(${(i - files.length / 2) * 5}deg)`));
        return p;
      });
      const front = h('div', 'front', `<span class="tag">📁 ${esc(v.name)}</span>`);
      if (v.count) front.appendChild(h('div', 'count', esc(v.count)));
      el.appendChild(A(front, v.at, 'pop', 0.5));
      U((t) => papers.forEach((p, i) => { p.style.marginBottom = Math.sin(t * 2 + i) * 3 + 'px'; }));
      return el;
    },

    /* Claude Code–style app window: title bar, rows (check / progress / spinner), menu, input. */
    window(v, { A, U }) {
      const el = h('div', 'window');
      el.appendChild(h('div', 'bar', `<i></i><i></i><i></i><b>${esc(v.title || 'New session')}</b>`));
      const body = h('div', 'body');
      if (v.sub) body.appendChild(h('div', 'sub', esc(v.sub)));
      if (!v.rows || !v.rows.length) {
        body.appendChild(h('div', 'empty', `<div><span class="spark">✳</span>${esc(v.placeholder || 'What should we build?')}</div>`));
      }
      (v.rows || []).forEach((r, i) => {
        const at = r.at ?? (v.at || 0) + 0.3 + i * 0.3;
        const row = h('div', 'row' + (r.hl ? ' hl' : ''));
        const ic = h('span', 'ic');
        row.appendChild(ic);
        if (r.kind === 'file') {
          row.innerHTML = `<span class="file"></span><span class="stack"><b>${esc(r.text)}</b><small>${esc(r.meta || '')}</small></span>`;
        } else {
          row.appendChild(h('span', '', rich(r.text).replace(/<em>/g, '<b>').replace(/<\/em>/g, '</b>')));
          if (r.pill) row.appendChild(h('span', 'pill', esc(r.pill)));
          if (r.kind === 'progress') row.appendChild(h('span', 'bar2', '<span></span>'));
          if (r.meta) row.appendChild(h('span', 'meta', esc(r.meta)));
        }
        body.appendChild(A(row, at, 'slideR', 0.4));
        const done = r.doneAt ?? (r.kind === 'check' ? at + 0.5 : Infinity);
        U((t) => {
          if (r.kind === 'text' || r.kind === 'file') { ic.className = 'ic dot'; ic.textContent = ''; return; }
          const fin = t >= done;
          ic.className = 'ic ' + (fin ? 'ok' : 'spin');
          ic.textContent = fin ? '✓' : '';
          if (!fin) ic.style.transform = `rotate(${t * 540}deg)`; else ic.style.transform = '';
          if (r.kind === 'progress') {
            const p = clamp((t - at) / (done - at));
            row.querySelector('.bar2 span').style.width = (p * 100).toFixed(1) + '%';
            const m = row.querySelector('.meta');
            if (m && !fin) m.textContent = Math.round(p * 100) + '%';
            else if (m) m.textContent = r.meta;
          }
        });
      });
      el.appendChild(body);

      if (v.menu) {
        const menu = h('div', 'menu');
        menu.appendChild(h('div', 'mi', `<small>RUN ON</small>`));
        const items = v.menu.items.map((m) => {
          const mi = h('div', 'mi', `${esc(m.title)}<small>${esc(m.sub || '')}</small>`);
          menu.appendChild(mi);
          return mi;
        });
        el.appendChild(A(menu, v.menu.at, 'pop', 0.35));
        U((t) => items.forEach((mi, i) => mi.classList.toggle('sel', i === v.menu.select && t >= v.menu.at + 0.6)));
        U((t) => { menu.style.display = t > (v.menu.until ?? Infinity) ? 'none' : ''; });
      }
      if (v.chips) {
        const chips = h('div', 'chips');
        v.chips.forEach((c) => {
          const s = h('span', '', esc(c.text));
          chips.appendChild(A(s, c.at, 'pop', 0.35));
          U((t) => s.classList.toggle('hot', c.hotAt != null && t >= c.hotAt));
        });
        el.appendChild(chips);
      }

      const input = h('div', 'input' + (v.prompt ? ' big' : ''));
      const typed = h('span', 'typed');
      input.appendChild(h('span', '', '+'));
      input.appendChild(typed);
      el.appendChild(input);
      const ph = v.inputPlaceholder || '↵ to send, ⌘↵ to queue for later';
      U((t) => {
        if (!v.prompt || t < v.prompt.at) { typed.style.color = 'var(--win-dim)'; typed.style.fontSize = '10.5px'; typed.textContent = ph; return; }
        typed.style.color = ''; typed.style.fontSize = '';
        const cps = v.prompt.cps || 18;
        const total = chars(v.prompt.text).length;
        const n = clamp(Math.floor((t - v.prompt.at) * cps), 0, total);
        typed.innerHTML = esc(typedSlice(v.prompt.text, n)) + (Math.floor(t * 3) % 2 || n < total ? '<span class="caret"></span>' : '');
      });
      el.appendChild(h('div', 'foot', `<span>Auto</span><span>${esc(v.model || 'Opus 5.5 · Medium')}</span>`));
      A(el, v.at, v.enter || 'rise', 0.5, v.tilt ? `rotate(${v.tilt}deg)` : '');
      return el;
    },

    /* Huge black number tile with progress dots — "step 3 of 6". */
    number(v, { A, U }) {
      const el = h('div', 'numtile', `<div class="d">${v.n}</div>`);
      const ring = h('div', 'ring', `<svg viewBox="0 0 100 100" width="140" height="140"><circle cx="50" cy="50" r="46" fill="none" stroke="#e1251b" stroke-width="2.5" stroke-dasharray="290" stroke-dashoffset="290" transform="rotate(-90 50 50)"/></svg>`);
      el.appendChild(ring);
      const dots = h('div', 'dots');
      for (let i = 1; i <= (v.of || 6); i++) dots.appendChild(h('i', i < v.n ? 'on' : i === v.n ? 'cur' : ''));
      el.appendChild(dots);
      A(el, v.at, 'pop', 0.6, 'rotate(-4deg)');
      const c = ring.querySelector('circle');
      U((t) => { c.setAttribute('stroke-dashoffset', 290 * (1 - E.inOut(clamp((t - (v.at || 0) - 0.4) / 0.6)))); });
      return el;
    },

    /* Phone that "builds" the reel + checklist panel ticking through the pipeline. */
    phone(v, { A, U }) {
      const wrap = h('div', 'build');
      const ph = h('div', 'phone');
      const scr = h('div', 'scr');
      scr.appendChild(h('div', 'notch'));
      scr.appendChild(h('div', 'ph-title', rich(v.title)));
      const art = h('div', 'ph-art');
      scr.appendChild(art);
      const capEl = h('div', 'ph-cap', '<span></span>');
      scr.appendChild(capEl);
      const wave = h('div', 'ph-wave');
      const bars = [];
      for (let i = 0; i < 26; i++) { const b = h('i'); wave.appendChild(b); bars.push(b); }
      scr.appendChild(wave);
      ph.appendChild(scr);
      wrap.appendChild(A(ph, v.at, 'rise', 0.55, 'rotate(-2deg)'));

      const steps = v.steps || [];
      const panel = h('div', 'panel');
      panel.appendChild(h('div', 'ttl', esc(v.panelTitle || 'Building your reel')));
      const rows = steps.map((s) => {
        const r = h('div', 'row dim', `<span class="ic"></span><span>${esc(s.text)}</span>`);
        panel.appendChild(r);
        return r;
      });
      wrap.appendChild(A(panel, (v.at || 0) + 0.25, 'slideR', 0.5, 'rotate(2deg)'));

      const words = v.captions || [];
      U((t) => {
        steps.forEach((s, i) => {
          const r = rows[i], ic = r.querySelector('.ic');
          const active = t >= s.at, done = t >= (steps[i + 1] ? steps[i + 1].at : v.until ?? Infinity);
          r.classList.toggle('dim', !active);
          r.classList.toggle('hl', active && !done);
          ic.className = 'ic ' + (done ? 'ok' : active ? 'spin' : '');
          ic.textContent = done ? '✓' : '';
          ic.style.transform = active && !done ? `rotate(${t * 540}deg)` : '';
        });
        // scene art cycles through a few looks once "Animate scenes" starts
        const animStep = steps.findIndex((s) => s.role === 'anim' || /anim/i.test(s.text));
        const live = animStep < 0 || t >= steps[animStep].at;
        const k = Math.floor(t * 1.4) % 3;
        art.style.background = !live ? '#eef0f3' : [
          'repeating-linear-gradient(90deg,#1f3d7a 0 26px,#2b55a8 26px 30px), linear-gradient(#cfd8e8,#cfd8e8)',
          'radial-gradient(circle at 50% 60%, #c9893f 0 32%, #8a5320 33% 40%, #f3efe6 41%)',
          'linear-gradient(#bfe0f7, #fff 70%), linear-gradient(#ddd,#ddd)',
        ][k];
        art.style.transform = live ? `scale(${1 + ((t * 0.7) % 1) * 0.06})` : '';
        // waveform + synced caption chip
        const voiced = steps.findIndex((s) => s.role === 'voice' || /voice/i.test(s.text));
        const amp = voiced < 0 || t >= steps[voiced].at ? 1 : 0.15;
        bars.forEach((b, i) => { b.style.height = (4 + amp * 30 * Math.abs(Math.sin(t * 7 + i * 0.9) * Math.sin(t * 3.1 + i * 0.37))).toFixed(1) + 'px'; });
        const capStep = steps.findIndex((s) => s.role === 'caption' || /caption/i.test(s.text));
        const showCap = words.length && (capStep < 0 || t >= steps[capStep].at);
        capEl.style.display = showCap ? '' : 'none';
        if (showCap) capEl.firstChild.textContent = words[Math.floor(t * 2.5) % words.length];
      });
      return wrap;
    },

    /* Finished reel + "Describe a change" chat, used for the feedback step. */
    feedback(v, { A, U }) {
      const wrap = h('div', 'feedback');
      const win = VISUALS.window({
        title: v.title || 'AI Video Editor', sub: 'Local · ' + (v.title || 'AI Video Editor'), at: v.at,
        rows: [
          { kind: 'text', text: 'Your reel is ready.', at: (v.at || 0) + 0.2 },
          { kind: 'file', text: v.file || 'reel.mp4', meta: '1080 × 1920 · 9:16', at: (v.at || 0) + 0.4 },
          ...(v.checks || []).map((c, i) => ({ kind: 'check', text: c, at: (v.at || 0) + 0.6 + i * 0.25, doneAt: (v.at || 0) + 0.6 + i * 0.25 })),
        ],
        prompt: v.ask ? { text: v.ask.text, at: v.ask.at, cps: 20 } : null,
        inputPlaceholder: 'Describe a change…',
      }, { A, U });
      wrap.appendChild(win);
      const ph = h('div', 'phone');
      const scr = h('div', 'scr');
      scr.appendChild(h('div', 'notch'));
      const t1 = h('div', 'ph-title', rich(v.phoneTitle || ''));
      t1.style.fontSize = '13px';
      scr.appendChild(t1);
      const art = h('div', 'ph-art', '');
      art.style.background = 'radial-gradient(circle at 50% 60%, #c9893f 0 30%, #8a5320 31% 38%, #f3efe6 39%)';
      art.style.top = '96px'; art.style.height = '200px';
      scr.appendChild(art);
      const fix = h('div', 'ph-cap', `<span>${esc(v.fix || 'EXTRA SALT.')}</span>`);
      fix.style.bottom = '40px';
      scr.appendChild(fix);
      ph.appendChild(scr);
      const before = h('div', 'before', 'BEFORE');
      ph.appendChild(before);
      wrap.appendChild(A(ph, (v.at || 0) + 0.3, 'slideR', 0.5, 'rotate(3deg)'));
      const fixAt = v.fixedAt ?? Infinity;
      A(fix, fixAt, 'stamp', 0.35, 'rotate(-4deg)');
      U((t) => { before.textContent = t >= fixAt ? 'AFTER' : 'BEFORE'; before.style.background = t >= fixAt ? '#e1251b' : '#fff'; before.style.color = t >= fixAt ? '#fff' : ''; });
      return wrap;
    },

    /* Chat app on a phone: messages pop in at their `at`, outgoing ones preceded by a typing indicator. */
    chat(v, { A, U }) {
      const ph = h('div', 'phone chatphone');
      const scr = h('div', 'scr');
      scr.appendChild(h('div', 'notch'));
      scr.appendChild(h('div', 'chat-head', `<span class="back">‹</span><span class="av">${esc((v.name || 'B')[0])}</span><span class="who"><b>${esc(v.name || 'Business')}${v.verified ? ' <i class="tick">✓</i>' : ''}</b><small>${esc(v.status || 'online')}</small></span>`));
      const log = h('div', 'chat-log');
      scr.appendChild(log);
      const typing = h('div', 'bubble out typing', '<i></i><i></i><i></i>');
      const items = (v.messages || []).map((m, i) => {
        const b = h('div', `bubble ${m.from === 'me' ? 'out' : 'in'}`);
        b.innerHTML = `<div class="txt">${rich(m.text).replace(/<em>/g, '<b>').replace(/<\/em>/g, '</b>')}</div><div class="meta">${esc(m.time || '10:0' + i)}${m.from === 'me' ? ' <span class="ticks">✓✓</span>' : ''}</div>`;
        if (m.buttons) {
          const bt = h('div', 'btns');
          m.buttons.forEach((x) => bt.appendChild(h('span', '', esc(x))));
          b.appendChild(bt);
        }
        log.appendChild(b);
        A(b, m.at, m.from === 'me' ? 'slideR' : 'slideL', 0.35);
        return { b, m };
      });
      log.appendChild(typing);
      scr.appendChild(h('div', 'chat-input', '<span>Message</span><i>➤</i>'));
      ph.appendChild(scr);
      A(ph, v.at, 'rise', 0.5, v.tilt ? `rotate(${v.tilt}deg)` : '');
      U((t) => {
        // typing dots for 0.7s before each outgoing message
        const pending = items.find(({ m }) => m.from === 'me' && t >= m.at - 0.7 && t < m.at);
        typing.style.display = pending ? '' : 'none';
        if (pending) {
          log.appendChild(typing);
          typing.querySelectorAll('i').forEach((d, i) => { d.style.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(t * 9 - i)); });
        }
        items.forEach(({ b, m }) => { b.style.display = t >= m.at - 0.001 ? '' : 'none'; });
        // read ticks turn blue a moment after sending
        items.forEach(({ b, m }) => { const tk = b.querySelector('.ticks'); if (tk) tk.classList.toggle('read', t >= m.at + 0.8); });
        log.scrollTop = 0;
        log.style.justifyContent = 'flex-end';
      });
      return ph;
    },

    /* One big number + what it means, with a grid of dots filling up. */
    stat(v, { A, U }) {
      const el = h('div', 'stat');
      el.appendChild(A(h('div', 'num', rich(v.value)), v.at, 'stamp', 0.45, 'rotate(-2deg)'));
      el.appendChild(A(h('div', 'what', rich(v.label || '')), (v.at || 0) + 0.3, 'rise', 0.45));
      const grid = h('div', 'dotgrid');
      const n = 60, fill = Math.round(n * (v.fill ?? 0.85));
      const dots = [];
      for (let i = 0; i < n; i++) { const d = h('i'); grid.appendChild(d); dots.push(d); }
      el.appendChild(A(grid, (v.at || 0) + 0.4, 'fade', 0.3));
      U((t) => {
        const k = Math.floor(clamp((t - (v.at || 0) - 0.5) / 1.2) * fill);
        dots.forEach((d, i) => d.classList.toggle('on', i < k));
      });
      if (v.note) el.appendChild(A(h('div', 'note', esc(v.note)), (v.at || 0) + 0.8, 'fade', 0.4));
      return el;
    },

    /* Before / after bars per metric. Values are relative (0..1), illustrative, not data. */
    bars(v, { A, U }) {
      const el = h('div', 'bars');
      const legend = h('div', 'legend', `<span><i class="b0"></i>${esc(v.before || 'Before')}</span><span><i class="b1"></i>${esc(v.after || 'After')}</span>`);
      el.appendChild(A(legend, v.at, 'fade', 0.3));
      const cols = h('div', 'cols');
      const fills = [];
      (v.items || []).forEach((it, i) => {
        const c = h('div', 'col', `<div class="pair"><div class="bar b0"><span></span></div><div class="bar b1"><span></span><em>↑</em></div></div><div class="lbl">${esc(it.label)}</div>`);
        cols.appendChild(A(c, (v.at || 0) + 0.15 + i * 0.2, 'rise', 0.4));
        const [b0, b1] = c.querySelectorAll('.bar span');
        fills.push({ b0, b1, arrow: c.querySelector('em'), it, start: (v.at || 0) + 0.3 + i * 0.25 });
      });
      el.appendChild(cols);
      U((t) => fills.forEach((f) => {
        const p0 = E.out(clamp((t - f.start) / 0.5));
        const p1 = E.back(clamp((t - f.start - 0.4) / 0.7));
        f.b0.style.height = (f.it.before * 100 * p0).toFixed(1) + '%';
        f.b1.style.height = (f.it.after * 100 * p1).toFixed(1) + '%';
        f.arrow.style.opacity = clamp((t - f.start - 1.0) * 4);
        f.arrow.style.bottom = `calc(${(f.it.after * 100 * p1).toFixed(1)}% + 4px)`;
      }));
      return el;
    },


    /* Ads Manager style screen, one step at a time, with an animated cursor that clicks the right control.
       Generic mock for teaching: labels match the real flow, no logos. */
    adsmanager(v, { A, U }) {
      const el = h('div', 'ads shadow');
      const at = v.at || 0, click = v.clickAt ?? at + 1.2;
      el.innerHTML = `<div class="ads-top"><b>☰ Ads Manager</b><span class="acct">${esc(v.account || 'Prime Growth 360')} ▾</span></div>
        <div class="ads-tabs"><span class="on">Campaigns</span><span>Ad sets</span><span>Ads</span></div><div class="ads-body"></div>`;
      const body = el.querySelector('.ads-body');
      const S = v.step || 'create';
      const tgt = (html, cls = '') => `<span class="tgt ${cls}">${html}</span>`;
      const steps = {
        create: `<div class="ads-bar">${tgt('＋ Create', 'btn green')}<span class="btn ghost">Duplicate</span><span class="btn ghost">Edit</span></div>
          <div class="ads-row head"><span>Campaign</span><span>Results</span><span>Spent</span></div>
          <div class="ads-row"><span>Diwali Offer</span><span>—</span><span>₹0</span></div><div class="ads-row"><span>New Leads</span><span>—</span><span>₹0</span></div>`,
        objective: `<div class="modal"><div class="mt">Choose a campaign objective</div>${['Awareness', 'Traffic', 'Engagement', 'Leads', 'App promotion', 'Sales'].map((o) => o === (v.pick || 'Leads') ? tgt(`<i class="rad"></i>${o}`, 'opt') : `<span class="opt"><i class="rad"></i>${o}</span>`).join('')}
          <div class="mfoot"><span class="btn ghost">Cancel</span><span class="btn blue">Continue</span></div></div>`,
        budget: `<div class="panel2"><div class="pt">Budget &amp; schedule</div><div class="fld"><label>Daily budget</label>${tgt('<span class="typed" data-text="' + esc(v.amount || '₹500') + '"></span>', 'input')}</div>
          <div class="fld"><label>Start date</label><span class="input">Today</span></div><div class="hint">💡 ${esc(v.hint || 'નાના budget થી શરૂ કરો, પછી વધારો')}</div></div>`,
        audience: `<div class="panel2"><div class="pt">Audience</div><div class="fld"><label>Locations</label><span class="chips2"><i>${esc(v.location || 'Gujarat, India')}</i></span></div>
          <div class="fld"><label>Age</label><span class="range"><span style="left:${((25 - 18) / 47) * 100}%;right:${100 - ((45 - 18) / 47) * 100}%"></span></span><small>25 – 45</small></div>
          <div class="fld"><label>Detailed targeting</label><span class="chips2">${(v.interests || ['Small business']).map((x) => `<i>${esc(x)}</i>`).join('')}${tgt('＋ ' + esc(v.add || 'Entrepreneurship'), 'chipadd')}</span></div></div>`,
        placements: `<div class="panel2"><div class="pt">Placements</div>${tgt('<i class="rad on"></i><b>Advantage+ placements</b> <small>(Recommended)</small>', 'opt wide')}<span class="opt wide"><i class="rad"></i>Manual placements</span>
          <div class="plc"><span>📱 Feeds</span><span>🎬 Reels</span><span>⭕ Stories</span><span>🔎 Explore</span></div></div>`,
        creative: `<div class="panel2"><div class="pt">Ad setup</div><div class="media">▶ video.mp4</div>
          <div class="fld"><label>Primary text</label><span class="input typedwrap"><span class="typed" data-text="${esc(v.text || 'Diwali Offer 🎉 30% OFF')}"></span></span></div>
          <div class="fld"><label>Call to action</label>${tgt(esc(v.cta || 'Send WhatsApp message') + ' ▾', 'input')}</div></div>`,
        publish: `<div class="panel2"><div class="pt">Review</div><div class="ads-row"><span>Objective</span><span>${esc(v.pick || 'Leads')}</span></div><div class="ads-row"><span>Budget</span><span>${esc(v.amount || '₹500')}/day</span></div><div class="ads-row"><span>Audience</span><span>${esc(v.location || 'Gujarat')} · 25–45</span></div></div>
          <div class="ads-foot"><span class="btn ghost">Back</span>${tgt('Publish', 'btn green')}</div><div class="toast">✓ In review: usually within 24 hours</div>`,
        results: `<div class="ads-row head"><span>Campaign</span><span>Results</span><span>CTR</span><span>Cost/result</span></div>
          ${(v.rows || [['Diwali Offer', 128, '2.4%', '₹18'], ['New Leads', 64, '1.9%', '₹26']]).map((r, i) => `<div class="ads-row${i === 0 ? ' hl' : ''}"><span>${esc(r[0])}</span><span class="cnt" data-to="${r[1]}">0</span><span>${esc(r[2])}</span><span>${esc(r[3])}</span></div>`).join('')}
          <div class="hint">${esc(v.note || 'ઉદાહરણ આંકડા')}</div>`,
      };
      body.innerHTML = steps[S] || steps.create;
      const cursor = h('div', 'cursor', '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M3 2l7 19 2.6-7.6L20 11z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>');
      const ripple = h('div', 'ripple');
      el.appendChild(ripple); el.appendChild(cursor);
      A(el, at, 'pop', 0.45);
      const modal = el.querySelector('.modal');
      if (modal) A(modal, at + 0.2, 'pop', 0.4);
      const toast = el.querySelector('.toast');
      let geo = null;
      U((t) => {
        const target = el.querySelector('.tgt');
        if (!geo && target && el.offsetWidth) {
          let x = 0, y = 0, n = target;
          while (n && n !== el) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
          geo = { x: x + target.offsetWidth * 0.55, y: y + target.offsetHeight * 0.55 };
        }
        const g = geo || { x: 300, y: 200 };
        const p = E.inOut(clamp((t - at - 0.3) / Math.max(0.3, click - at - 0.45)));
        const x0 = el.offsetWidth * 0.85, y0 = el.offsetHeight * 0.95;
        const press = t >= click && t < click + 0.15 ? 0.85 : 1;
        cursor.style.transform = `translate(${x0 + (g.x - x0) * p}px, ${y0 + (g.y - y0) * p}px) scale(${press})`;
        cursor.style.opacity = t >= at + 0.2 ? 1 : 0;
        const rp = clamp((t - click) / 0.45);
        ripple.style.transform = `translate(${g.x}px, ${g.y}px) scale(${0.2 + rp * 1.6})`;
        ripple.style.opacity = t >= click && rp < 1 ? (1 - rp).toFixed(2) : 0;
        if (target) target.classList.toggle('hit', t >= click);
        if (target) target.classList.toggle('hover', t >= click - 0.35);
        el.querySelectorAll('.typed').forEach((ty) => {
          const txt = ty.dataset.text, start = click + 0.1, total = chars(txt).length;
          const n2 = clamp(Math.floor((t - start) * 14), 0, total);
          ty.textContent = t < start ? '' : typedSlice(txt, n2) + (n2 < total ? '|' : '');
        });
        el.querySelectorAll('.cnt').forEach((c) => { c.textContent = Math.round(Number(c.dataset.to) * E.out(clamp((t - at - 0.4) / 1.4))); });
        if (toast) { toast.style.opacity = clamp((t - click - 0.2) * 4); toast.style.transform = `translateY(${(1 - clamp((t - click - 0.2) * 4)) * 14}px)`; }
      });
      return el;
    },

    /* Big tappable button with a finger tap (SHARE / FOLLOW / COMMENT). */
    button(v, { A, U }) {
      const el = h('div', 'bigbtn ' + (v.style || 'red'), `<span class="ic">${esc(v.icon || '👆')}</span><span>${rich(v.text)}</span>`);
      A(el, v.at, 'pop', 0.4);
      const tap = v.tapAt ?? (v.at || 0) + 0.8;
      U((t) => {
        const k = t >= tap && t < tap + 0.18 ? 0.9 : 1;
        el.style.scale = String(k);
        el.classList.toggle('done', t >= tap);
      });
      return el;
    },

    /* Icon that gets a red ✕ stamped over it ("Personal ATM" etc). */
    iconx(v, { A }) {
      const el = h('div', 'iconx', `<div class="ico">${esc(v.icon)}</div><div class="lbl">${rich(v.label || '')}</div><div class="xx"></div>`);
      A(el, v.at, 'pop', 0.4);
      A(el.querySelector('.xx'), v.crossAt ?? (v.at || 0) + 0.7, 'stamp', 0.35);
      return el;
    },

    /* Closing call to action. */
    cta(v, { A }) {
      const el = h('div', 'cta');
      el.appendChild(A(h('div', 'sub', esc(v.pre || 'COMMENT')), v.at, 'rise', 0.4));
      el.appendChild(A(h('div', 'word', esc(v.word)), (v.at || 0) + 0.25, 'stamp', 0.45, 'rotate(-3deg)'));
      if (v.bubble) el.appendChild(A(h('div', 'bubble shadow', rich(v.bubble).replace(/<em>/g, '<b>').replace(/<\/em>/g, '</b>')), (v.at || 0) + 0.7, 'pop', 0.45));
      return el;
    },
  };

  function starburst() {
    let d = '';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const L = i % 2 ? 30 : 44;
      d += `<path d="M0 0 L${(Math.cos(a - 0.09) * 8).toFixed(2)} ${(Math.sin(a - 0.09) * 8).toFixed(2)} L${(Math.cos(a) * L).toFixed(2)} ${(Math.sin(a) * L).toFixed(2)} L${(Math.cos(a + 0.09) * 8).toFixed(2)} ${(Math.sin(a + 0.09) * 8).toFixed(2)}Z" fill="#fff"/>`;
    }
    return d;
  }

  // ---------- overlay effects ----------
  const FX = {

    // emoji / word sticker that pops in with a wobble
    sticker(f, { U, root }) {
      const el = h('div', 'sticker', `${f.emoji ? `<span class="em">${esc(f.emoji)}</span>` : ''}${f.text ? `<span class="tx">${rich(f.text)}</span>` : ''}`);
      el.style.left = (f.x ?? 360) + 'px'; el.style.top = (f.y ?? 420) + 'px';
      root.appendChild(el);
      U((t) => {
        const lt = t - f.at, end = f.until ?? Infinity;
        el.style.display = lt < 0 || t > end ? 'none' : '';
        if (lt < 0) return;
        const p = clamp(lt / 0.35);
        el.style.transform = `translate(-50%,-50%) scale(${(0.3 + 0.7 * E.back(p)).toFixed(3)}) rotate(${((f.rotate ?? -6) + Math.sin(lt * 5) * 3 * (1 - clamp(lt / 1.2))).toFixed(2)}deg)`;
      });
    },
    // name / topic lower third that slides in and out
    lowerthird(f, { U, root }) {
      const el = h('div', 'lthird', `<b>${rich(f.title)}</b>${f.sub ? `<small>${esc(f.sub)}</small>` : ''}`);
      if (f.y) el.style.top = f.y + 'px';
      root.appendChild(el);
      U((t) => {
        const a = clamp((t - f.at) / 0.4), b = f.until ? clamp((t - f.until) / 0.3) : 0;
        el.style.opacity = (E.out(a) * (1 - b)).toFixed(3);
        el.style.transform = `translateX(${((1 - E.out(a)) * -60 + b * -40).toFixed(1)}px)`;
      });
    },
    // progress pills: "ભૂલ 1 / 2 / 3"
    tracker(f, { U, root }) {
      const el = h('div', 'tracker');
      const pills = Array.from({ length: f.total || 3 }, (_, i) => { const p = h('span', '', `${esc(f.label || '')} ${i + 1}`); el.appendChild(p); return p; });
      root.appendChild(el);
      U((t) => { pills.forEach((p, i) => { p.classList.toggle('on', i + 1 < f.current || (i + 1 === f.current && t >= f.at)); p.classList.toggle('cur', i + 1 === f.current && t >= f.at); }); el.style.opacity = clamp((t - (f.showAt ?? 0)) * 4); });
    },
    confetti(f, { U, root }) {
      const layer = h('div', 'fx confetti');
      const colors = ['#e1251b', '#141414', '#f4dc4b', '#ffffff', '#e1251b'];
      const parts = [];
      for (let i = 0; i < 70; i++) {
        const p = h('i');
        p.style.background = colors[i % colors.length];
        layer.appendChild(p);
        parts.push({ el: p, vx: (rand(i) - 0.3) * 380, vy: -420 - rand(i + 99) * 520, spin: (rand(i + 7) - 0.5) * 1400 });
      }
      root.appendChild(layer);
      const ox = f.x ?? 120, oy = f.y ?? 760;
      U((t) => {
        const lt = t - f.at;
        layer.style.display = lt < 0 || lt > 3 ? 'none' : '';
        if (lt < 0) return;
        parts.forEach((p) => {
          const x = ox + p.vx * lt, y = oy + p.vy * lt + 0.5 * 900 * lt * lt;
          p.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(p.spin * lt).toFixed(0)}deg) scaleY(${Math.cos(lt * 9 + p.vx).toFixed(2)})`;
        });
      });
    },
    // pulsing red ring to draw the eye to a point on the stage
    ring(f, { U, root }) {
      const r = h('div', 'fx');
      r.innerHTML = `<svg width="540" height="960"><ellipse cx="${f.x}" cy="${f.y}" rx="${f.rx || 60}" ry="${f.ry || 26}" fill="none" stroke="#e1251b" stroke-width="3" stroke-dasharray="400" stroke-dashoffset="400"/></svg>`;
      root.appendChild(r);
      const e = r.querySelector('ellipse');
      U((t) => e.setAttribute('stroke-dashoffset', 400 * (1 - E.inOut(clamp((t - f.at) / 0.5)))));
    },
  };


  /*
   * Talking presenter avatar (original character, pure SVG).
   * Mouth follows the caption words, eyes blink, head bobs, and the gesture changes every ~2s
   * (or per scene via scene.avatar.pose). With a real voiceover the words carry real timings,
   * so the lips sync to the speech.
   */
  function makeAvatar(cfg) {
    const c = { skin: '#e0a47c', skin2: '#c98a62', hair: '#1d1a1a', shirt: '#141414', accent: '#e1251b', beard: true, glasses: true, brand: 'PG360', side: 'right', ...cfg };
    const el = h('div', 'avatar ' + c.side);
    el.innerHTML = `<svg viewBox="0 0 260 320" width="260" height="320">
      <defs><linearGradient id="avs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.shirt}"/><stop offset="1" stop-color="#000"/></linearGradient></defs>
      <g class="av-body"><path d="M28 320 C34 250 70 226 130 222 C190 226 226 250 232 320Z" fill="url(#avs)"/>
        <path d="M104 224 L130 262 L156 224" fill="none" stroke="${c.accent}" stroke-width="5" stroke-linecap="round"/>
        <text x="130" y="300" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="22" fill="${c.accent}">${esc(c.brand)}</text></g>
      <rect x="114" y="190" width="32" height="40" rx="10" fill="${c.skin2}"/>
      <g class="av-head">
        <ellipse cx="72" cy="128" rx="11" ry="16" fill="${c.skin2}"/><ellipse cx="188" cy="128" rx="11" ry="16" fill="${c.skin2}"/>
        <ellipse cx="130" cy="122" rx="58" ry="70" fill="${c.skin}"/>
        <path d="M70 108 C64 50 104 38 132 40 C176 40 198 66 190 112 C180 84 160 72 132 74 C104 74 82 84 70 108Z" fill="${c.hair}"/>
        ${c.beard ? `<path d="M74 132 C76 186 104 204 130 204 C156 204 184 186 186 132 C178 162 160 172 130 172 C100 172 82 162 74 132Z" fill="${c.hair}" opacity=".92"/>` : ''}
        <path class="br l" d="M92 98 Q106 90 120 97" stroke="${c.hair}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path class="br r" d="M140 97 Q154 90 168 98" stroke="${c.hair}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <g class="eye l"><ellipse cx="106" cy="116" rx="9" ry="10" fill="#fff"/><circle class="pu" cx="107" cy="117" r="5" fill="#1b1310"/><rect class="lid" x="95" y="104" width="22" height="0" fill="${c.skin}"/></g>
        <g class="eye r"><ellipse cx="154" cy="116" rx="9" ry="10" fill="#fff"/><circle class="pu" cx="155" cy="117" r="5" fill="#1b1310"/><rect class="lid" x="143" y="104" width="22" height="0" fill="${c.skin}"/></g>
        ${c.glasses ? `<g fill="none" stroke="#111" stroke-width="3.2"><circle cx="106" cy="117" r="17"/><circle cx="154" cy="117" r="17"/><path d="M123 116 Q130 111 137 116"/></g>` : ''}
        <path d="M130 124 Q124 142 130 146 Q136 146 138 142" fill="none" stroke="${c.skin2}" stroke-width="3" stroke-linecap="round"/>
        <g class="mouth" transform="translate(130 163)"><ellipse class="mo" rx="14" ry="3" fill="#3a1010"/><rect class="teeth" x="-10" y="-3" width="20" height="4" rx="2" fill="#fff"/><ellipse class="tongue" cx="0" cy="4" rx="8" ry="2" fill="#d4555c"/></g>
      </g>
      <g class="av-arm"><path d="M210 250 C226 220 232 196 236 170" stroke="${c.shirt}" stroke-width="30" stroke-linecap="round" fill="none"/>
        <g class="hand" transform="translate(236 160)"><circle r="17" fill="${c.skin}"/><rect class="finger" x="-5" y="-40" width="10" height="28" rx="5" fill="${c.skin}"/><rect class="thumb" x="8" y="-22" width="9" height="20" rx="4.5" fill="${c.skin}" transform="rotate(30)"/></g></g>
    </svg>`;
    const q = (s) => el.querySelector(s);
    const head = q('.av-head'), arm = q('.av-arm'), mo = q('.mo'), teeth = q('.teeth'), tongue = q('.tongue'), finger = q('.finger'), thumb = q('.thumb');
    const lids = el.querySelectorAll('.lid'), pupils = el.querySelectorAll('.pu'), brows = el.querySelectorAll('.br');
    const POSES = { point: [-18, 1, 0], up: [-4, 1, 0], open: [24, 0, 0], thumb: [8, 0, 1], think: [40, 1, 0], wave: [-10, 0, 0] };
    return {
      el,
      update(sc, lt, t) {
        // mouth: open on each spoken word (from caption timings)
        let open = 0;
        for (const L of sc.lines) for (let i = 0; i < L.words.length; i++) {
          const w = L.words[i], nx = L.words[i + 1] ? L.words[i + 1].start : L.end;
          if (lt >= w.start && lt < nx) { const d = Math.min(0.32, nx - w.start); const u = (lt - w.start) / d; if (u < 1) open = Math.sin(u * Math.PI) * (0.55 + 0.45 * rand(i + L.start * 10)); }
        }
        const ry = 2.5 + open * 11;
        mo.setAttribute('ry', ry.toFixed(2)); mo.setAttribute('rx', (14 - open * 3).toFixed(2));
        teeth.setAttribute('opacity', open > 0.25 ? 1 : 0); tongue.setAttribute('ry', (1 + open * 4).toFixed(2)); tongue.setAttribute('cy', (2 + open * 5).toFixed(2));
        // blink every ~3.2s
        const bp = (t % 3.2) / 3.2, blink = bp > 0.96 ? Math.sin(((bp - 0.96) / 0.04) * Math.PI) : 0;
        lids.forEach((l) => l.setAttribute('height', (blink * 24).toFixed(1)));
        pupils.forEach((p) => p.setAttribute('transform', `translate(${(Math.sin(t * 0.7) * 1.5).toFixed(2)} 0)`));
        brows.forEach((b) => b.setAttribute('transform', `translate(0 ${(-open * 3).toFixed(2)})`));
        // head bob while talking
        head.setAttribute('transform', `rotate(${(Math.sin(t * 2.1) * 2.2 + open * 1.5).toFixed(2)} 130 190) translate(0 ${(-open * 1.5).toFixed(2)})`);
        // gesture: scene pose, else cycle every 2s
        const cycle = ['point', 'open', 'thumb', 'up', 'think', 'wave'];
        const pose = (sc.avatar && sc.avatar.pose) || cycle[(Math.floor(lt / 2) + sc.index) % cycle.length];
        const [ang, fing, th] = POSES[pose] || POSES.point;
        const k = clamp(((lt % 2) / 0.25));
        const wobble = pose === 'wave' ? Math.sin(t * 9) * 12 : Math.sin(t * 3) * 2;
        arm.setAttribute('transform', `rotate(${((ang + wobble) * E.out(k) + (1 - E.out(k)) * 10).toFixed(2)} 210 250)`);
        finger.setAttribute('opacity', fing); thumb.setAttribute('opacity', th ? 1 : 0.35);
        el.style.transform = `translateY(${(Math.sin(t * 1.6) * 2).toFixed(2)}px)`;
      },
    };
  }

  // ---------- player ----------
  let TL, built = [], halftone, current = -1, world = null, cineFx, dip, avatar = null;

  function apply(a, lt) {
    const p = (lt - a.at) / a.dur;
    if (p <= 0) { a.el.style.opacity = '0'; a.el.style.transform = a.base; return; }
    if (p >= 1) { a.el.style.opacity = ''; a.el.style.transform = a.base; return; }
    const s = KINDS[a.kind](p);
    a.el.style.opacity = s.o ?? 1;
    a.el.style.transform = `${a.base} translate(${(s.x || 0).toFixed(2)}px, ${(s.y || 0).toFixed(2)}px) scale(${(s.s ?? 1).toFixed(4)}) rotate(${(s.r || 0).toFixed(2)}deg)`;
  }

  function seek(t) {
    t = clamp(t, 0, TL.duration - 1e-6);
    let idx = TL.scenes.findIndex((s) => t >= s.start && t < s.end);
    if (idx < 0) idx = TL.scenes.length - 1;
    if (idx !== current) {
      built.forEach((b, i) => b.root.classList.toggle('on', i === idx));
      current = idx;
    }
    const b = built[idx];
    const lt = t - b.sc.start;
    // gentle camera drift keeps static scenes alive
    if (TL.energy && !b.sc.world) {
      // energetic slideshow: zoom-out settle on every cut + a punch-in on every caption line
      let z = 1 + 0.09 * (1 - E.out(clamp(lt / 0.45)));
      b.sc.lines.forEach((L, i) => { if (i && lt >= L.start) z += 0.035 * Math.max(0, 1 - (lt - L.start) / 0.3); });
      z += Math.min(lt, 6) * 0.004;
      b.root.style.transform = `scale(${z.toFixed(4)})`;
    } else b.root.style.transform = b.sc.world ? '' : `scale(${1 + Math.min(lt, 6) * 0.004})`;
    b.anims.forEach((a) => apply(a, lt));
    b.updaters.forEach((fn) => fn(lt));

    if (world) world.render(idx, lt, t);
    if (avatar) avatar.update(b.sc, lt, t);
    cineFx.style.display = b.sc.world ? 'block' : 'none';
    if (b.sc.world) { // film grain moves every frame (deterministic)
      cineFx.style.setProperty('--gx', `${Math.round(rand(Math.floor(t * 24)) * 40 - 20)}px`);
      cineFx.style.setProperty('--gy', `${Math.round(rand(Math.floor(t * 24) + 7) * 40 - 20)}px`);
    }
    // dip-to-black / flash-to-white / warm light-leak between 3D shots
    let dv = 0, dkind = null;
    TL.scenes.forEach((s) => {
      if (!/^(dip|flash|leak)$/.test(s.transition) || s.start === 0) return;
      const d = t - s.start;
      const half = s.transition === 'flash' ? 0.12 : 0.22;
      if (d > -half && d < half * 1.4) { dv = d < 0 ? (d + half) / half : 1 - d / (half * 1.4); dkind = s.transition; }
    });
    dip.style.display = dv > 0.01 ? 'block' : 'none';
    if (dv > 0.01) {
      dip.style.background = dkind === 'flash' ? '#fff' : dkind === 'leak'
        ? 'radial-gradient(90% 70% at 20% 30%, rgba(255,190,110,.95), rgba(255,90,40,.6) 45%, rgba(0,0,0,0) 75%)' : '#000';
      dip.style.opacity = E.inOut(clamp(dv)).toFixed(3);
    }

    // halftone wipe across boundaries into scenes that ask for it
    let ht = 0;
    TL.scenes.forEach((s) => {
      if (s.transition !== 'halftone' || s.start === 0) return;
      const d = t - s.start; // -0.25 .. +0.3
      if (d > -0.25 && d < 0.3) ht = d < 0 ? (d + 0.25) / 0.25 : 1 - d / 0.3;
    });
    halftone.style.display = ht > 0.01 ? 'block' : 'none';
    halftone.style.backgroundSize = `${22}px ${22}px`;
    halftone.style.transform = `scale(${(0.02 + ht * 1.6).toFixed(3)})`;
    halftone.style.opacity = Math.min(1, ht * 1.4).toFixed(3);
    return { scene: idx, t };
  }

  async function init(timeline) {
    TL = timeline;
    const stage = document.getElementById('stage');
    stage.innerHTML = '';
    const lang = TL.lang || 'en';
    document.documentElement.lang = lang;
    stage.classList.toggle('indic', /^(gu|hi|bn|ta|te|mr|kn|ml|pa|or)\b/i.test(lang));
    world = null;
    if (TL.scenes.some((s) => s.world)) {
      if (!window.World3D) {
        await new Promise((res, rej) => {
          const to = setTimeout(() => rej(new Error('3D engine (world3d.js / three) failed to load')), 20000);
          window.addEventListener('world3d-ready', () => { clearTimeout(to); res(); }, { once: true });
        });
      }
      const canvas = document.createElement('canvas');
      canvas.id = 'world';
      stage.appendChild(canvas);
      world = window.World3D.create(canvas, TL, { scale: window.__GL_SCALE__ || 1.5 });
    }
    built = TL.scenes.map(makeScene);
    built.forEach((b) => stage.appendChild(b.root));
    avatar = TL.avatar ? makeAvatar(TL.avatar) : null;
    if (avatar) stage.appendChild(avatar.el);
    stage.classList.toggle('has-avatar', !!avatar);
    if (TL.transparent) { stage.classList.add('transparent'); document.documentElement.classList.add('transparent'); }
    cineFx = h('div', 'cine-fx');
    stage.appendChild(cineFx);
    dip = h('div', 'dip');
    stage.appendChild(dip);
    halftone = h('div', 'halftone');
    halftone.style.backgroundImage = 'radial-gradient(circle, #141414 0 45%, transparent 47%)';
    stage.appendChild(halftone);
    current = -1;
    if (document.fonts && document.fonts.load) {
      // hidden scenes don't trigger webfont loads, so load every face (incl. Gujarati subsets) up front
      const sample = 'Aa ગુજરાતી';
      const faces = ['500 28px "Space Grotesk"', '700 28px "Space Grotesk"', 'italic 400 31px "Instrument Serif"', '40px Anton', '9px "JetBrains Mono"', '600 15px Caveat',
        '500 28px "Hind Vadodara"', '700 28px "Hind Vadodara"', '600 28px "Noto Serif Gujarati"', '800 36px "Baloo Bhai 2"'];
      await Promise.race([Promise.all(faces.map((f) => document.fonts.load(f, sample).catch(() => null))), new Promise((r) => setTimeout(r, 6000))]);
    }
    if (document.fonts && document.fonts.ready) {
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))]);
    }
    seek(0);
    return { duration: TL.duration, scenes: TL.scenes.length };
  }

  /* Layout check used by scripts/check.js: anything spilling off-stage or overlapping the caption? */
  function audit() {
    const issues = [];
    const b = built[current];
    if (!b) return issues;
    const stage = document.getElementById('stage').getBoundingClientRect();
    const cap = b.root.querySelector('.caption .line[style*="block"]');
    if (cap) {
      const lh = parseFloat(getComputedStyle(b.root.querySelector('.caption')).lineHeight) || 30;
      const lines = Math.round(cap.getBoundingClientRect().height / lh);
      if (lines > 3) issues.push(`caption wraps to ${lines} lines — shorten it`);
    }
    b.root.querySelectorAll('.v, .label .txt, .badge, .caption .line').forEach((el) => {
      if (getComputedStyle(el).opacity === '0') return;
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const tol = 6;
      if (r.left < stage.left - tol || r.right > stage.right + tol || r.bottom > stage.bottom + tol || r.top < stage.top - tol) {
        issues.push(`${el.className.split(' ')[0]} spills off-stage (${Math.round(r.left - stage.left)},${Math.round(r.top - stage.top)} ${Math.round(r.width)}×${Math.round(r.height)})`);
      }
    });
    // Instagram Reels safe zone (540×960 units): top 44px, bottom 190px, right-hand action rail low down
    b.root.querySelectorAll('.caption .line, .label .txt').forEach((el) => {
      if (el.offsetParent === null) return;
      const r = el.getBoundingClientRect(), y0 = r.top - stage.top, y1 = r.bottom - stage.top, x1 = r.right - stage.left;
      if (!r.width) return;
      if (y0 < 44) issues.push(`text enters the top UI band (y=${Math.round(y0)})`);
      if (y1 > 770) issues.push(`text enters the bottom UI band (y=${Math.round(y1)})`);
      if (y1 > 560 && x1 > 476) issues.push('text runs under the like/comment rail');
    });
    const capBox = b.root.querySelector('.caption').getBoundingClientRect();
    const labBox = b.root.querySelector('.label');
    const vis = b.root.querySelector('.visuals');
    const firstV = vis && vis.firstElementChild;
    if (labBox && labBox.getBoundingClientRect().top < capBox.top + (cap ? cap.getBoundingClientRect().height : 0) - 4) {
      issues.push('caption runs into the display label');
    }
    if (firstV && cap) {
      const vr = firstV.getBoundingClientRect();
      if (vr.top < capBox.top + cap.getBoundingClientRect().height - 4 && !labBox) issues.push('caption overlaps the visual');
    }
    return issues;
  }

  window.Reel = { init, seek, audit };

  // ---------- standalone preview (open out/<name>.html in a browser) ----------
  window.addEventListener('DOMContentLoaded', async () => {
    if (window.__RENDER__) { document.body.classList.add('render'); return; }
    const data = window.__TIMELINE__;
    if (!data) return;
    const { duration } = await init(data);
    const player = document.getElementById('player');
    player.hidden = false;
    const btn = document.getElementById('play'), scrub = document.getElementById('scrub'), clock = document.getElementById('clock');
    let playing = false, t0 = 0, base = 0, now = 0;
    const audio = window.__AUDIO__ ? new Audio(window.__AUDIO__) : null;
    const tick = (ts) => {
      if (!playing) return;
      now = audio ? audio.currentTime : base + (ts - t0) / 1000;
      if (now >= duration) { playing = false; btn.textContent = 'Play'; now = 0; }
      seek(now);
      scrub.value = String(Math.round((now / duration) * 1000));
      clock.textContent = now.toFixed(1) + 's';
      requestAnimationFrame(tick);
    };
    btn.onclick = () => {
      playing = !playing;
      btn.textContent = playing ? 'Pause' : 'Play';
      if (playing) { base = now; t0 = performance.now(); if (audio) { audio.currentTime = now; audio.play(); } requestAnimationFrame(tick); }
      else if (audio) audio.pause();
    };
    scrub.oninput = () => { now = (scrub.value / 1000) * duration; if (audio) audio.currentTime = now; base = now; t0 = performance.now(); seek(now); clock.textContent = now.toFixed(1) + 's'; };
  });
})();
