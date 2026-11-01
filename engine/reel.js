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
    const root = h('div', `scene ${sc.theme}`);
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
        A(span, w.start, 'word', 0.18);
      });
      cap.appendChild(wrap);
      return wrap;
    });
    U((t) => {
      let cur = 0;
      sc.lines.forEach((L, i) => { if (t >= L.start - 0.001) cur = i; });
      lineEls.forEach((el, i) => { el.style.display = i === cur ? 'block' : 'none'; });
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
        const st = h('div', 'stamp', `<div class="no">Nº ${esc(v.stamp.no || '001')}</div><div class="top">${esc(v.stamp.top)}</div><div class="big">${esc(v.stamp.big)}</div><div class="rule"></div><div class="pin" style="left:30%"></div>`);
        el.appendChild(A(st, v.stamp.at, 'stamp', 0.4, 'rotate(-3deg)'));
      }
      // slow push-in on the whole board
      U((t) => { el.style.transform = `scale(${1 + Math.min(t, 6) * 0.006})`; });
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
      const good = h('div', 'vcard good shadow', `<div class="screen">✳</div><div class="lbl">${esc(v.good)}</div><div class="mark">✓</div>`);
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
        const n = clamp(Math.floor((t - typeAt) * 16), 0, v.folder.length);
        name.textContent = v.folder.slice(0, n) + (n < v.folder.length && Math.floor(t * 3) % 2 ? '|' : '');
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
        const n = clamp(Math.floor((t - v.prompt.at) * cps), 0, v.prompt.text.length);
        typed.innerHTML = esc(v.prompt.text.slice(0, n)) + (Math.floor(t * 3) % 2 || n < v.prompt.text.length ? '<span class="caret"></span>' : '');
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
        const animStep = steps.findIndex((s) => /anim/i.test(s.text));
        const live = animStep < 0 || t >= steps[animStep].at;
        const k = Math.floor(t * 1.4) % 3;
        art.style.background = !live ? '#eef0f3' : [
          'repeating-linear-gradient(90deg,#1f3d7a 0 26px,#2b55a8 26px 30px), linear-gradient(#cfd8e8,#cfd8e8)',
          'radial-gradient(circle at 50% 60%, #c9893f 0 32%, #8a5320 33% 40%, #f3efe6 41%)',
          'linear-gradient(#bfe0f7, #fff 70%), linear-gradient(#ddd,#ddd)',
        ][k];
        art.style.transform = live ? `scale(${1 + ((t * 0.7) % 1) * 0.06})` : '';
        // waveform + synced caption chip
        const voiced = steps.findIndex((s) => /voice/i.test(s.text));
        const amp = voiced < 0 || t >= steps[voiced].at ? 1 : 0.15;
        bars.forEach((b, i) => { b.style.height = (4 + amp * 30 * Math.abs(Math.sin(t * 7 + i * 0.9) * Math.sin(t * 3.1 + i * 0.37))).toFixed(1) + 'px'; });
        const capStep = steps.findIndex((s) => /caption/i.test(s.text));
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

  // ---------- player ----------
  let TL, built = [], halftone, current = -1;

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
    b.root.style.transform = `scale(${1 + Math.min(lt, 6) * 0.004})`;
    b.anims.forEach((a) => apply(a, lt));
    b.updaters.forEach((fn) => fn(lt));

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
    built = TL.scenes.map(makeScene);
    built.forEach((b) => stage.appendChild(b.root));
    halftone = h('div', 'halftone');
    halftone.style.backgroundImage = 'radial-gradient(circle, #141414 0 45%, transparent 47%)';
    stage.appendChild(halftone);
    current = -1;
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
