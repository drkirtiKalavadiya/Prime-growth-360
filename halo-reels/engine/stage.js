/* Halo Reels stage: builds every element of a plan once (setup), then poses them for any time t (frame).
   All times are reel seconds; the Python side has already resolved word references to numbers.
   The page is deterministic: the same t always gives the same picture, so frames can be rendered in any order. */
'use strict';
const W = 1080, H = 1920;
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

const THEMES = {};
window.THEMES = THEMES;
const BACK_KINDS = new Set(['headword', 'card', 'ring', 'glow', 'background', 'panels', 'dust']);
const Z = { background: 1, glow: 2, dust: 3, ring: 4, panels: 5, counter: 8, notify: 13, card: 6, headword: 7, caption: 10, chips: 11, badge: 12 };
let ROOM = null, ROOM_SRC = null, BLUR_EXIT = false;

/* ---------- setup / frame ---------- */
window.setup = async function (plan, head) {
  PLAN = plan; HEAD = head;
  const theme = plan.theme || 'noir';
  const B = THEMES.halo;
  document.body.dataset.theme = theme;
  if (window.applyPalette) window.applyPalette(theme, plan.accent);
  BLUR_EXIT = true;
  for (const f of ['400 100px "Instrument Serif"', 'italic 400 100px "Instrument Serif"', '700 100px "Fraunces Variable"', '600 100px "Manrope Variable"']) {
    try { await document.fonts.load(f, 'Ag'); } catch (e) { /* ignore */ }
  }
  await document.fonts.ready;
  const back = document.getElementById('back'), front = document.getElementById('front');
  ROOM = el('img', 'el room', back); ROOM.style.zIndex = 0; ROOM.style.display = 'none';
  ITEMS = [];
  for (const seg of plan.segments) {
    const specs = [];
    if (seg.kind === 'speaker') {
      if (seg.glow !== false) specs.push({ el: 'glow', t: seg.from });
      if (seg.ring !== false) specs.push({ el: 'ring', t: seg.from });
    } else {
      specs.push({ el: 'background', t: seg.from, seed: 7 + plan.segments.indexOf(seg) });
    }
    if (B.dust && seg.dust !== false) specs.push({ el: 'dust', t: seg.from, seed: 3 + plan.segments.indexOf(seg), kind: seg.kind });
    specs.push(...(seg.elements || []));
    for (const spec of specs) {
      const b = B[spec.el];
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

/* room = file URL of the graded room frame (speaker scenes) or null */
window.frame = async function (t, room, tc) {
  window.TC = tc === undefined || tc === null ? t : tc;   // frame-centre time: text that changes (counters) stays sharp under motion blur
  if (room) {
    if (room !== ROOM_SRC) { ROOM.src = room; ROOM_SRC = room; await ROOM.decode(); }
    ROOM.style.display = '';
  } else ROOM.style.display = 'none';
  for (const x of ITEMS) {
    const { life } = x;
    const alive = t >= x.seg.from && t < x.seg.to && t >= life.t0 - 1e-6 && (life.out === undefined || t < life.out + 0.32);
    if (!alive) { x.it.node.style.display = 'none'; continue; }
    x.it.node.style.display = '';
    x.it.update(t, life);
    if (life.out !== undefined && t >= life.out) {           // exit: fade and drift up (and blur, premium themes)
      const q = easeInOut(prog(t, life.out, 0.3));
      x.it.node.style.opacity = String((x.it.node.style.opacity === '' ? 1 : +x.it.node.style.opacity) * (1 - q));
      x.it.node.style.translate = `0 ${-40 * q}px`;
      if (BLUR_EXIT) x.it.node.style.filter = `blur(${12 * q}px)`;
    } else { x.it.node.style.translate = ''; if (BLUR_EXIT && x.it.node.dataset.keepFilter !== '1') x.it.node.style.filter = ''; }
  }
  return true;
};
