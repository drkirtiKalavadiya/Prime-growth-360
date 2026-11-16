/* Rang Reels stage: builds every element of a plan once (setup), then poses them for any time t (frame).
   All times are reel seconds; the Python side has already resolved word references to numbers.
   The page is deterministic: the same t always gives the same picture, so frames can be rendered in any order. */
'use strict';
const W = 1080, H = 1920;
const COL = { maroon: '#5A0F1E', deep: '#24060D', saffron: '#FF9933', kesar: '#F57C00', gold: '#F6C35B', cream: '#FFF4E0' };
const NS = 'http://www.w3.org/2000/svg';

/* ---------- easing ---------- */
function bezier(x1, y1, x2, y2) {
  return t => {
    if (t <= 0) return 0; if (t >= 1) return 1;
    let lo = 0, hi = 1, u = t;
    for (let i = 0; i < 28; i++) {
      u = (lo + hi) / 2;
      const x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3;
      if (x < t) lo = u; else hi = u;
    }
    return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3;
  };
}
const easeOut = bezier(.22, 1, .36, 1);
const easeInOut = bezier(.65, 0, .35, 1);
const clamp01 = v => Math.min(Math.max(v, 0), 1);
const prog = (t, t0, d) => clamp01((t - t0) / d);
const backOut = p => { p = clamp01(p); const c = 1.9; return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2; };
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/* ---------- DOM helpers ---------- */
function el(tag, cls, parent, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  if (parent) parent.appendChild(n);
  return n;
}
function svg(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
/* "તમારો *બિઝનેસ*" -> nodes with the *accent* wrapped in <em> */
function richText(parent, s) {
  String(s).split(/(\*[^*]+\*)/).forEach(part => {
    if (!part) return;
    if (part.startsWith('*') && part.endsWith('*')) el('em', '', parent, part.slice(1, -1));
    else parent.appendChild(document.createTextNode(part));
  });
}

let PLAN = null, HEAD = null, ITEMS = [];

/* ---------- elements ---------- */
// Every builder returns {node, update(t, local)} where local = t inside the element's life.

function buildTextBlock(spec, layer, kind) {
  const isHead = kind === 'headword';
  const root = el('div', 'el tblock shadow', layer);
  const small = spec.small_size || (isHead ? 64 : 54);
  let accSize = spec.accent_size || (isHead ? 210 : 150);
  const words = [];
  const addLine = (list, dir) => {
    if (!list || !list.length) return null;
    const line = el('div', 'tb-line tb-small', root);
    line.style.fontSize = small + 'px';
    list.forEach(([w, t]) => { const s = el('span', 'w', line, w); words.push({ n: s, t, dir }); });
    return line;
  };
  addLine(spec.top, 'left');
  let acc = null, under = null, accT = null;
  if (spec.accent) {
    const lineA = el('div', 'tb-line', root);
    const wrap = el('span', 'tb-acc-wrap w', lineA);
    acc = el('span', 'tb-acc', wrap, spec.accent[0]);
    wrap.style.fontSize = accSize + 'px';
    accT = spec.accent[1];
    const u = svg('svg', { class: 'tb-under', viewBox: '0 0 100 20', preserveAspectRatio: 'none' }, wrap);
    under = svg('path', { d: 'M2 14 C 25 4, 55 4, 98 10', fill: 'none', stroke: COL.saffron, 'stroke-width': 3.2, 'stroke-linecap': 'round', pathLength: 100 }, u);
    under.style.strokeDasharray = '100'; under.style.strokeDashoffset = '100';
    words.push({ n: wrap, t: accT, dir: 'rise', big: true });
  }
  if (isHead && spec.bottom) throw new Error('headword: top words + accent only (the head would hide a bottom line); put the rest in a caption');
  const botLine = addLine(spec.bottom, 'rise');
  const fit = () => {                                    // keep the accent inside the safe zone (x 90..990)
    if (!acc) return;
    const maxW = spec.max_width || 880;
    const w = acc.getBoundingClientRect().width;
    if (w > maxW) { accSize = Math.floor(accSize * maxW / w); acc.parentNode.style.fontSize = accSize + 'px'; }
    if (botLine) botLine.style.marginTop = Math.round(accSize * 0.2) + 'px';
  };
  const place = () => {
    const r = root.getBoundingClientRect();
    let y;
    if (isHead) {
      // the head covers about a third of the big word: accent bottom sits ~0.38 x its size below the head top
      const accR = acc ? acc.getBoundingClientRect() : r;
      const accBottomInBlock = (accR.bottom - r.top);
      y = HEAD.top + accSize * 0.38 - accBottomInBlock + (spec.dy || 0);
    } else {
      y = (spec.y || 1330) - r.height / 2;
    }
    const cx = isHead ? HEAD.x : (spec.x || 540);
    root.dataset.y = y; root.dataset.x = cx - 540;
  };
  return {
    node: root, fit, place,
    update(t) {
      const by = +root.dataset.y, bx = +root.dataset.x;
      root.style.transform = `translate(${bx}px, ${by}px)`;
      words.forEach(w => {
        const p = easeOut(prog(t, w.t, w.big ? 0.85 : 0.62));
        const o = prog(t, w.t, w.big ? 0.55 : 0.42);
        let tr;
        if (w.dir === 'left') tr = `translateX(${(1 - p) * -86}px)`;
        else tr = `translateY(${(1 - p) * (w.big ? 100 : 56)}px)` + (w.big ? ` scale(${1.06 - 0.06 * p})` : '');
        w.n.style.transform = tr; w.n.style.opacity = o;
      });
      if (under) under.style.strokeDashoffset = String(100 - 100 * easeOut(prog(t, accT + 0.28, 0.55)));
    }
  };
}

function buildCard(spec, layer) {
  const root = el('div', 'el card', layer);
  const title = el('div', 'card-title', root); richText(title, spec.title || '');
  const rows = (spec.rows || []).map(([label, t]) => {
    const r = el('div', 'row', root);
    const tk = svg('svg', { class: 'tick', viewBox: '0 0 50 50' }, r);
    const ring = svg('circle', { cx: 25, cy: 25, r: 21, fill: 'none', stroke: COL.kesar, 'stroke-width': 3.5 }, tk);
    const fill = svg('circle', { cx: 25, cy: 25, r: 21, fill: COL.kesar }, tk);
    const chk = svg('path', { d: 'M14 26 L22 33 L36 18', fill: 'none', stroke: '#fff', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 100 }, tk);
    chk.style.strokeDasharray = '100';
    el('span', 'lbl', r, label);
    return { r, fill, chk, ring, t };
  });
  const place = () => {
    const h = root.getBoundingClientRect().height;
    const x = spec.x !== undefined ? spec.x : 70;
    const y = spec.y !== undefined ? spec.y : Math.max(170, HEAD.top - h * 0.72);
    root.dataset.x = x; root.dataset.y = y;
  };
  return {
    node: root, place,
    update(t, life) {
      const p = easeOut(prog(t, life.t0, 0.75));
      root.style.transform = `translate(${+root.dataset.x}px, ${+root.dataset.y + (1 - p) * 60}px) scale(${0.94 + 0.06 * p}) rotate(${(1 - p) * -3}deg)`;
      root.style.opacity = prog(t, life.t0, 0.45);
      rows.forEach(r => {
        const q = backOut(prog(t, r.t, 0.32));
        r.fill.setAttribute('r', String(21 * clamp01(q)));
        r.chk.style.strokeDashoffset = String(100 - 100 * easeOut(prog(t, r.t + 0.12, 0.3)));
        r.r.style.opacity = 0.45 + 0.55 * prog(t, r.t, 0.25);
      });
    }
  };
}

function buildRing(spec, layer) {
  // bandhani mandala behind the head: rings of dots, alternating spin
  const s = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'el' }, layer);
  const g = svg('g', {}, s);
  const R0 = (spec.radius || HEAD.w * 1.55);
  const rings = [];
  const glowG = svg('g', { style: `filter: drop-shadow(0 0 14px rgba(255,153,51,.75))` }, g);
  [[1.0, 26, 7, COL.gold], [1.22, 32, 5, COL.saffron], [1.46, 40, 6, COL.cream], [1.72, 46, 4, COL.gold]].forEach(([k, gap, dr, col], i) => {
    const r = R0 * k, n = Math.max(12, Math.round(2 * Math.PI * r / gap));
    const rg = svg('g', {}, glowG);
    svg('circle', { cx: 0, cy: 0, r: r, fill: 'none', stroke: col, 'stroke-opacity': .28, 'stroke-width': 2 }, rg);
    for (let j = 0; j < n; j++) {
      const a = j / n * Math.PI * 2;
      const cx = Math.cos(a) * r, cy = Math.sin(a) * r;
      if (i === 2 && j % 2 === 0) {                       // bandhani cluster: centre dot + four around it
        svg('circle', { cx, cy, r: dr * 0.7, fill: col }, rg);
        for (let q = 0; q < 4; q++) svg('circle', { cx: cx + Math.cos(q * Math.PI / 2 + a) * dr * 1.6, cy: cy + Math.sin(q * Math.PI / 2 + a) * dr * 1.6, r: dr * 0.45, fill: COL.saffron }, rg);
      } else svg('circle', { cx, cy, r: dr * (j % 3 === 0 ? 1 : 0.65), fill: col }, rg);
    }
    rings.push({ rg, dir: i % 2 ? -1 : 1, speed: 5 + i * 2 });
  });
  const cy = HEAD.top + HEAD.w * 0.62;
  return {
    node: s,
    update(t, life) {
      const p = easeOut(prog(t, life.t0, 1.0));
      g.setAttribute('transform', `translate(${HEAD.x} ${cy}) scale(${0.72 + 0.28 * p})`);
      s.style.opacity = prog(t, life.t0, 0.6) * (spec.opacity || 0.95);
      rings.forEach(r => r.rg.setAttribute('transform', `rotate(${r.dir * r.speed * (t - life.t0)})`));
    }
  };
}

function buildGlow(spec, layer) {
  const d = el('div', 'el', layer);
  const R = spec.radius || 760;
  Object.assign(d.style, { width: R * 2 + 'px', height: R * 2 + 'px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,153,51,.42) 0%, rgba(245,124,0,.22) 35%, rgba(90,15,30,0) 70%)' });
  const cy = HEAD.top + HEAD.w * 0.7;
  return { node: d, update(t, life) {
    const pulse = 1 + 0.025 * Math.sin((t - life.t0) * 2.2);
    d.style.transform = `translate(${HEAD.x - R}px, ${cy - R}px) scale(${pulse})`;
    d.style.opacity = prog(t, life.t0, 0.5);
  } };
}

function buildStamp(spec, layer) {
  const root = el('div', 'el stamp', layer);
  const s = svg('svg', { width: 300, height: 300, viewBox: '0 0 300 300', style: 'position:absolute;inset:0' }, root);
  const red = '#C62828';
  svg('circle', { cx: 150, cy: 150, r: 138, fill: 'rgba(255,244,224,.92)', stroke: red, 'stroke-width': 10 }, s);
  svg('circle', { cx: 150, cy: 150, r: 116, fill: 'none', stroke: red, 'stroke-width': 3, 'stroke-dasharray': '2 9', 'stroke-linecap': 'round' }, s);
  for (let i = 0; i < 4; i++) {                            // small diamonds at the compass points
    const a = i * Math.PI / 2 + Math.PI / 4, x = 150 + Math.cos(a) * 127, y = 150 + Math.sin(a) * 127;
    svg('rect', { x: x - 6, y: y - 6, width: 12, height: 12, fill: red, transform: `rotate(45 ${x} ${y})` }, s);
  }
  const txt = el('div', 'stamp-txt', root, spec.text || '');
  if (spec.size) txt.style.fontSize = spec.size + 'px';
  const x = (spec.x !== undefined ? spec.x : 800) - 150, y = (spec.y !== undefined ? spec.y : 980) - 150;
  const rot = spec.rotate !== undefined ? spec.rotate : -10;
  return { node: root, update(t, life) {
    const p = prog(t, life.t0, 0.26);
    const land = easeOut(p);
    const settle = Math.exp(-9 * Math.max(0, t - life.t0 - 0.26)) * Math.sin(Math.max(0, t - life.t0 - 0.26) * 45) * 0.03;
    const sc = 1.9 - 0.9 * land + settle;
    root.style.transform = `translate(${x}px, ${y}px) rotate(${rot - 18 * (1 - land)}deg) scale(${sc})`;
    root.style.opacity = Math.min(1, p * 2) * 0.96;
  } };
}

function buildChips(spec, layer) {
  const root = el('div', 'el chips', layer);
  const items = (spec.items || []).map(([label, t]) => { const c = el('span', 'chip', root); el('i', '', c); el('span', '', c, label); return { c, t }; });
  const place = () => { const h = root.getBoundingClientRect().height; root.dataset.y = (spec.y || 1610) - h / 2; };
  return { node: root, place, update(t) {
    root.style.transform = `translateY(${+root.dataset.y}px)`;
    items.forEach(i => { const q = backOut(prog(t, i.t, 0.38)); i.c.style.transform = `scale(${0.4 + 0.6 * q})`; i.c.style.opacity = prog(t, i.t, 0.2); });
  } };
}

function buildBandhani(spec, layer) {
  // full-frame abstract background: maroon depth + drifting bandhani dot clusters + soft saffron light
  const c = el('canvas', 'el', layer); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const r = rng(spec.seed || 7);
  const clusters = [];
  for (let y = -120; y < H + 240; y += 96) for (let x = -40; x < W + 80; x += 104) {
    clusters.push({ x: x + ((y / 96) % 2 ? 52 : 0) + (r() - .5) * 14, y: y + (r() - .5) * 14, k: 0.6 + r() * 0.7, ph: r() * 6.28, gold: r() < 0.16 });
  }
  return { node: c, update(t, life) {
    const lt = t - life.t0;
    const g = ctx.createRadialGradient(540, 760, 60, 540, 900, 1300);
    g.addColorStop(0, '#8E1B2E'); g.addColorStop(0.45, COL.maroon); g.addColorStop(1, COL.deep);
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const drift = (lt * 14) % 192;
    for (const q of clusters) {
      const x = q.x, y = q.y - drift;
      const tw = 0.55 + 0.45 * Math.sin(lt * 1.6 + q.ph);
      ctx.globalAlpha = (q.gold ? 0.5 : 0.2) * tw;
      ctx.fillStyle = q.gold ? COL.gold : '#FFD9B0';
      const rr = 3.2 * q.k;
      ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.283); ctx.fill();
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 11 * q.k, y + Math.sin(a) * 11 * q.k, rr * 0.62, 0, 6.283); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    const sweep = ctx.createRadialGradient(540, 820, 0, 540, 820, 720);
    sweep.addColorStop(0, `rgba(255,153,51,${0.30 + 0.06 * Math.sin(lt * 1.3)})`); sweep.addColorStop(1, 'rgba(255,153,51,0)');
    ctx.fillStyle = sweep; ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(540, 960, 500, 540, 960, 1250);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,0,3,.7)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    c.style.opacity = 1;
  } };
}

function buildToran(spec, layer) {
  // a festive door hanging: a gold rope draws across, tiles drop in and swing to rest on their words
  const root = el('div', 'el', layer);
  root.style.width = W + 'px'; root.style.height = H + 'px';
  const y0 = spec.y || 430;
  const s = svg('svg', { width: W, height: H, style: 'position:absolute;left:0;top:0' }, root);
  const rope = svg('path', { d: `M-20 ${y0 - 40} Q 540 ${y0 + 70} 1100 ${y0 - 40}`, fill: 'none', stroke: COL.gold, 'stroke-width': 9, 'stroke-linecap': 'round', pathLength: 100 }, s);
  rope.style.strokeDasharray = '100';
  const items = spec.items || [];
  const n = items.length;
  const tiles = items.map(([label, t], i) => {
    const x = n === 1 ? 540 : 150 + i * (780 / (n - 1));
    const yy = y0 - 40 + 110 * (1 - Math.pow((x - 540) / 560, 2)) * 0.98;   // on the rope curve
    const tile = el('div', 'el tile', root);
    el('div', 'tile-body', tile); el('div', 'tile-in', tile); el('div', 'tile-lbl', tile, label); el('div', 'tassel', tile);
    return { tile, x: x - 105, y: yy, t, seed: i };
  });
  return { node: root, update(t, life) {
    rope.style.strokeDashoffset = String(100 - 100 * easeInOut(prog(t, life.t0, 0.6)));
    tiles.forEach(q => {
      const lt = t - q.t;
      const drop = easeOut(prog(t, q.t, 0.45));
      const ang = lt > 0 ? 38 * Math.exp(-3.2 * lt) * Math.cos(lt * 7.5 + q.seed) : 38;
      q.tile.style.transform = `translate(${q.x}px, ${q.y - (1 - drop) * 260}px) rotate(${ang}deg)`;
      q.tile.style.opacity = prog(t, q.t, 0.2);
    });
  } };
}

const BUILDERS = { caption: buildTextBlock, headword: buildTextBlock, card: buildCard, ring: buildRing, glow: buildGlow,
  stamp: buildStamp, chips: buildChips, bandhani: buildBandhani, toran: buildToran };
const BACK_KINDS = new Set(['headword', 'card', 'ring', 'glow', 'bandhani', 'toran']);
const Z = { bandhani: 0, glow: 1, ring: 2, toran: 3, card: 4, headword: 5, caption: 10, chips: 11, stamp: 12 };

/* ---------- setup / frame ---------- */
window.setup = async function (plan, head) {
  PLAN = plan; HEAD = head;
  await document.fonts.load('800 100px "Baloo Bhai 2"', 'ગુજરાતી');
  await document.fonts.load('600 100px "Noto Sans Gujarati"', 'ગુજરાતી');
  await document.fonts.ready;
  const back = document.getElementById('back'), front = document.getElementById('front');
  ITEMS = [];
  for (const seg of plan.segments) {
    const specs = [];
    if (seg.kind === 'speaker') {
      if (seg.glow !== false) specs.push({ el: 'glow', t: seg.from });
      if (seg.ring !== false) specs.push({ el: 'ring', t: seg.from });
    } else {
      specs.push({ el: 'bandhani', t: seg.from, seed: 7 + plan.segments.indexOf(seg) });
    }
    specs.push(...(seg.elements || []));
    for (const spec of specs) {
      const b = BUILDERS[spec.el];
      if (!b) throw new Error('unknown element: ' + spec.el);
      const layer = BACK_KINDS.has(spec.el) ? back : front;
      const it = b(spec, layer, spec.el);
      it.node.style.zIndex = Z[spec.el];
      it.node.style.display = 'none';
      const t0 = spec.t !== undefined ? spec.t : firstTime(spec, seg.from);
      ITEMS.push({ it, spec, seg, life: { t0, out: spec.out, end: seg.to } });
    }
  }
  // measure after fonts: fit then place (needs display)
  for (const x of ITEMS) {
    x.it.node.style.display = ''; x.it.node.style.visibility = 'hidden';
    if (x.it.fit) x.it.fit();
    if (x.it.place) x.it.place();
    x.it.node.style.display = 'none'; x.it.node.style.visibility = '';
  }
  return ITEMS.length;
};

function firstTime(spec, fallback) {
  const ts = [];
  ['top', 'bottom', 'rows', 'items'].forEach(k => (spec[k] || []).forEach(p => ts.push(p[1])));
  if (spec.accent) ts.push(spec.accent[1]);
  return ts.length ? Math.min(...ts) : fallback;
}

window.frame = function (t) {
  for (const x of ITEMS) {
    const { life } = x;
    const alive = t >= x.seg.from && t < x.seg.to && t >= life.t0 - 1e-6 && (life.out === undefined || t < life.out + 0.32);
    if (!alive) { x.it.node.style.display = 'none'; continue; }
    x.it.node.style.display = '';
    x.it.update(t, life);
    if (life.out !== undefined && t >= life.out) {           // exit: fade and drift up
      const q = easeInOut(prog(t, life.out, 0.3));
      x.it.node.style.opacity = String((+x.it.node.style.opacity || 1) * (1 - q));
      x.it.node.style.translate = `0 ${-40 * q}px`;
    } else x.it.node.style.translate = '';
  }
  return true;
};
