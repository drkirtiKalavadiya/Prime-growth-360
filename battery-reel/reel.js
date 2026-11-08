/* Battery Myth Reel — 90 s vertical explainer.
 * Everything is drawn with SVG / HTML / CSS; no external images or video.
 * Timeline: SCRIPT (captions), SCENES (visual panel), POSES (presenter).
 * URL options: ?t=12.5 jumps to that second and pauses (handy for screenshots).
 */
(() => {
'use strict';

const DUR = 90;

/* ------------------------------------------------------------------ */
/* helpers                                                              */
/* ------------------------------------------------------------------ */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const prog = (t, a, b) => clamp((t - a) / (b - a));
function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let r = Math.imul(seed ^ seed >>> 15, 1 | seed);
    r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r;
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}
const f1 = n => Math.round(n * 10) / 10;
const svg = (inner, vb = '0 0 720 660') =>
  `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">${inner}</svg>`;
const $ = (root, sel) => root.querySelector(sel);
const $$ = (root, sel) => [...root.querySelectorAll(sel)];

/* ------------------------------------------------------------------ */
/* shared SVG defs (gradients, patterns, filters)                       */
/* ------------------------------------------------------------------ */
function grad(type, id, stops, attrs = '') {
  const s = stops.map((c, i) => {
    const [col, op] = Array.isArray(c) ? c : [c, 1];
    return `<stop offset="${(i / (stops.length - 1)).toFixed(3)}" stop-color="${col}" stop-opacity="${op}"/>`;
  }).join('');
  return `<${type}Gradient id="${id}" ${attrs}>${s}</${type}Gradient>`;
}
const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
${grad('linear', 'copper', ['#6e3416', '#e7a274', '#c27447', '#5c2a10'], 'x1="0" x2="1"')}
${grad('linear', 'silver', ['#6f747a', '#f1f3f6', '#a9aeb4', '#5a5f65'], 'x1="0" x2="1"')}
${grad('radial', 'goldBall', ['#fff6c4', '#f5b92e', '#7a4c05'], 'cx=".35" cy=".35" r=".75"')}
${grad('radial', 'greyBall', ['#dadada', '#5c5c5c', '#0e0e0e'], 'cx=".35" cy=".35" r=".75"')}
${grad('radial', 'whiteBall', ['#ffffff', '#cfd3d8', '#7d838a'], 'cx=".35" cy=".35" r=".75"')}
${grad('linear', 'flake', ['#f7d27a', '#c8902c', '#7d5612'], 'x1="0" y1="0" x2="1" y2="1"')}
${grad('linear', 'wall', ['#fbd9a0', '#ef9c57', '#c4521f', '#7d2a10'], 'x1="0" y1="0" x2="0" y2="1"')}
${grad('linear', 'alu', ['#eceef1', '#b3b7bc'], 'x1="0" y1="0" x2="0" y2="1"')}
${grad('linear', 'silverTop', ['#fdfdfe', '#dfe1e4', '#b8bbc0'], 'x1="0" y1="0" x2="1" y2="1"')}
${grad('linear', 'darkMetal', ['#4a4845', '#2a2927', '#171615'], 'x1="0" y1="0" x2="0" y2="1"')}
${grad('linear', 'rod', ['#6b4206', '#e9ae2c', '#ffe7a1', '#d89b1f', '#5e3905'], 'x1="0" y1="0" x2="0" y2="1"')}
${grad('linear', 'sunset', ['#f8b56a', '#e9823e', '#a8461c'], 'x1="0" y1="0" x2="0" y2="1"')}
${grad('linear', 'room', ['#3a2416', '#1a0f08'], 'x1="0" y1="0" x2="0" y2="1"')}
${grad('linear', 'deskTop', ['#6a442a', '#3a2414', '#1c1009'], 'x1="0" y1="0" x2="0" y2="1"')}
${grad('linear', 'heatbar', ['#fffbe0', '#ffd23a', '#ff7a00', '#c21d00', '#1a0000'], 'x1="0" y1="0" x2="0" y2="1"')}
${grad('radial', 'hot', [['#fff7b0', 1], ['#ffc400', .95], ['#ff6a00', .6], ['#ff3d00', 0]])}
${grad('radial', 'warmGlow', [['#ffcf8a', .55], ['#ff9a3c', .18], ['#ff9a3c', 0]])}
${grad('radial', 'redBlob', [['#e1261b', .9], ['#a8100a', .5], ['#7a0d0d', 0]])}
${grad('radial', 'quilt', ['#ffffff', '#f3f3f3', '#d4d4d4'], 'cx=".5" cy=".45" r=".7"')}
${grad('radial', 'vignette', [['#000', 0], ['#000', 0], ['#000', .55]], 'r=".75"')}
${grad('linear', 'wood', ['#c99a5e', '#a8763f', '#c08f55'], 'x1="0" y1="0" x2="1" y2="1"')}
${grad('linear', 'cable', ['#f2f0ec', '#c9c4bb', '#8f8a82'], 'x1="0" y1="0" x2="0" y2="1"')}
<pattern id="speckle" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#c99a2a"/><circle cx="3" cy="4" r="1.6" fill="#fff0a8"/><circle cx="10" cy="9" r="1.3" fill="#7a5a10"/><circle cx="7" cy="2" r="1" fill="#ffe27a"/><circle cx="12" cy="3" r="1.1" fill="#a57a16"/><circle cx="4" cy="11" r="1.2" fill="#ffe9a0"/></pattern>
<pattern id="speckleDark" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#2a2a2a"/><circle cx="3" cy="3" r="1.3" fill="#777"/><circle cx="9" cy="8" r="1.1" fill="#111"/><circle cx="6" cy="10" r="1" fill="#999"/></pattern>
<pattern id="stripes" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="2.2" height="7" fill="rgba(90,55,0,.35)"/></pattern>
<pattern id="braid" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#c88a4c"/><rect width="4" height="10" fill="#8d5526"/></pattern>
<filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="bigGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="blur3"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="blur8" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="blur24" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="24"/></filter>
<filter id="noise" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" seed="4"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0" intercept="1"/><feFuncR type="linear" slope="1.4" intercept="-.15"/><feFuncG type="linear" slope="1.4" intercept="-.15"/><feFuncB type="linear" slope="1.4" intercept="-.15"/></feComponentTransfer></filter>
<filter id="shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#000" flood-opacity=".3"/></filter>
</defs></svg>`;
document.body.insertAdjacentHTML('afterbegin', DEFS);

/* ------------------------------------------------------------------ */
/* reusable drawings                                                    */
/* ------------------------------------------------------------------ */
function wallpaper(x, y, w, h, flower) {
  const k = `translate(${x} ${y}) scale(${w / 100} ${h / 62})`;
  if (flower) {
    let petals = '';
    for (let i = 0; i < 10; i++) petals += `<ellipse cx="50" cy="18" rx="7" ry="15" fill="${i % 2 ? '#f07a3a' : '#ffa25a'}" transform="rotate(${i * 36} 50 33)"/>`;
    return `<g transform="${k}"><rect width="100" height="62" fill="#3a1208"/>${petals}<circle cx="50" cy="33" r="6" fill="#ffd38a"/></g>`;
  }
  return `<g transform="${k}"><rect width="100" height="62" fill="url(#wall)"/>
    <path d="M0 26 C18 16 36 36 58 25 S88 18 100 26 V62 H0Z" fill="#d8692c" opacity=".75"/>
    <path d="M0 40 C24 30 44 48 68 38 S94 34 100 40 V62 H0Z" fill="#8f3214" opacity=".85"/>
    <path d="M0 52 C30 44 60 58 100 50 V62 H0Z" fill="#5d1d0a" opacity=".9"/></g>`;
}
/* open laptop seen from the front. o: {pct, flower, off, base:'slim'|'keys'|'none'} */
function laptop(x, y, w, o = {}) {
  const h = w * .63, b = w * .03;
  const sx = x + b, sy = y + b, sw = w - 2 * b, sh = h - 2 * b;
  const mb = Math.max(w * .042, 6);
  const pct = o.pct ?? 100;
  let base = '';
  if (o.base !== 'none') {
    if (o.base === 'keys') {
      const bx = x - w * .06, bw = w * 1.12, by = y + h, bh = w * .3;
      let keys = '';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++)
        keys += `<rect x="${f1(bx + bw * .14 + c * bw * .061 + r * 2)}" y="${f1(by + bh * .1 + r * bh * .13)}" width="${f1(bw * .05)}" height="${f1(bh * .1)}" rx="2" fill="#2b2b2e"/>`;
      base = `<path d="M${x} ${by} H${x + w} L${bx + bw} ${by + bh} H${bx} Z" fill="url(#alu)"/>${keys}
        <rect x="${f1(x + w * .36)}" y="${f1(by + bh * .66)}" width="${f1(w * .28)}" height="${f1(bh * .26)}" rx="4" fill="#c4c7cb"/>`;
    } else {
      base = `<path d="M${f1(x - w * .05)} ${f1(y + h)} H${f1(x + w * 1.05)} l${f1(-w * .035)} ${f1(w * .032)} H${f1(x - w * .015)} Z" fill="url(#alu)"/>`;
    }
  }
  return `<g class="laptop">
    <rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(w * .035)}" fill="#141414" stroke="#3a3a3a" stroke-width="1.5"/>
    ${wallpaper(sx, sy, sw, sh, o.flower)}
    <rect x="${f1(sx)}" y="${f1(sy)}" width="${f1(sw)}" height="${f1(mb)}" fill="rgba(255,255,255,.55)"/>
    <text x="${f1(sx + mb * 1.4)}" y="${f1(sy + mb * .75)}" font-size="${f1(mb * .62)}" fill="#222" font-family="Figtree,sans-serif">●  Finder  File  Edit  View</text>
    <text class="pct" x="${f1(sx + sw - mb * 2.6)}" y="${f1(sy + mb * .76)}" font-size="${f1(mb * .66)}" font-weight="700" text-anchor="end" fill="#222" font-family="Figtree,sans-serif">${pct}%</text>
    <rect x="${f1(sx + sw - mb * 2.4)}" y="${f1(sy + mb * .22)}" width="${f1(mb * 1.6)}" height="${f1(mb * .56)}" rx="1.5" fill="none" stroke="#222" stroke-width="1"/>
    <rect class="bfill" data-w="${f1(mb * 1.4)}" x="${f1(sx + sw - mb * 2.3)}" y="${f1(sy + mb * .31)}" width="${f1(mb * 1.4 * pct / 100)}" height="${f1(mb * .38)}" fill="#222"/>
    <rect class="scr-off fade-el" x="${f1(sx)}" y="${f1(sy)}" width="${f1(sw)}" height="${f1(sh)}" fill="#050505" opacity="${o.off ? 1 : 0}"/>
    ${base}</g>`;
}
function setPct(root, p) {
  p = Math.round(p);
  $$(root, '.pct').forEach(e => { e.textContent = p + '%'; });
  $$(root, '.bfill').forEach(e => {
    e.setAttribute('width', (+e.dataset.w * clamp(p / 100)).toFixed(1));
    e.setAttribute('fill', p <= 10 ? '#e0342a' : '#222');
  });
}
/* warm evening desk scene (used by several shots) */
function desk(o = {}) {
  const r = rng(31);
  let city = '';
  for (let i = 0; i < 16; i++) {
    const w = 25 + r() * 30, h = 40 + r() * 110, x = 40 + i * 42;
    city += `<rect x="${f1(x)}" y="${f1(300 - h)}" width="${f1(w)}" height="${f1(h)}" fill="#7d3416" opacity=".55"/>`;
  }
  let leaves = '';
  for (let i = 0; i < 9; i++) leaves += `<ellipse cx="0" cy="-48" rx="15" ry="50" fill="${i % 2 ? '#2d4a22' : '#3f6a2c'}" transform="translate(88 455) rotate(${-70 + i * 17})"/>`;
  return `
  <rect width="720" height="660" fill="url(#room)"/>
  <rect x="30" y="0" width="660" height="310" fill="url(#sunset)"/>${city}
  <g stroke="#160c06" stroke-width="12"><line x1="30" y1="150" x2="690" y2="150"/><line x1="250" y1="0" x2="250" y2="310"/><line x1="470" y1="0" x2="470" y2="310"/><rect x="30" y="0" width="660" height="310" fill="none"/></g>
  <circle cx="610" cy="120" r="170" fill="url(#warmGlow)"/>
  <path d="M0 380 H720 V660 H0Z" fill="url(#deskTop)"/>
  <path d="M0 380 H720" stroke="#8a5a36" stroke-width="3"/>
  <rect x="62" y="455" width="52" height="58" rx="6" fill="#5a3a26"/>${leaves}
  <g transform="translate(575 470)"><rect width="56" height="62" rx="9" fill="#efece5"/><path d="M56 16 q22 4 0 32" stroke="#efece5" stroke-width="9" fill="none"/><ellipse cx="28" cy="2" rx="28" ry="7" fill="#3a2414"/>
    <path class="steam" d="M18 -8 q-8 -14 0 -28 q8 -14 0 -28" stroke="#fff" stroke-width="3" fill="none" opacity=".4"/>
    <path class="steam" style="animation-delay:-1.2s" d="M36 -8 q-8 -14 0 -28 q8 -14 0 -28" stroke="#fff" stroke-width="3" fill="none" opacity=".4"/></g>
  <g transform="translate(60 585)"><rect width="170" height="34" rx="8" fill="#dcdcdc"/><rect x="10" y="10" width="16" height="14" rx="3" fill="#d22"/>
    <circle cx="55" cy="17" r="8" fill="#9a9a9a"/><circle cx="90" cy="17" r="8" fill="#9a9a9a"/><circle cx="125" cy="17" r="8" fill="#9a9a9a"/></g>
  <path d="M205 330 C150 360 160 540 145 595" stroke="#f4f4f4" stroke-width="5" fill="none"/>
  <g class="side-l fade-el" opacity="${o.multi ? 1 : 0}">${laptop(14, 210, 180, { pct: 100, flower: true, base: 'keys' })}</g>
  <g class="side-r fade-el" opacity="${o.multi ? 1 : 0}">${laptop(526, 210, 180, { pct: 100, flower: true, base: 'keys' })}</g>
  <g class="main-lap">${laptop(205, 130, 310, { pct: o.pct ?? 100, base: 'keys' })}</g>
  <g class="damage fade-el" opacity="0">
    <path d="M205 325 H515 L533 418 H187 Z" fill="url(#speckle)"/>
    <path d="M370 325 H515 L533 418 H360 Z" fill="url(#speckleDark)"/>
    <path d="M370 325 l-8 20 l10 18 l-12 22 l9 18 l-9 15" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>
  </g>`;
}
/* closed laptop seen from the top */
function closedLaptop(cx, cy, w, rot = 0, dark = false) {
  const h = w * .66;
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})">
    <ellipse cx="8" cy="${h * .55}" rx="${w * .55}" ry="${h * .16}" fill="#000" opacity=".25" filter="url(#blur8)"/>
    <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${w * .06}" fill="${dark ? '#202024' : 'url(#silverTop)'}" stroke="${dark ? '#000' : '#a9acb1'}" stroke-width="1.5"/>
    <rect x="${-w / 2 + 6}" y="${h / 2 - 9}" width="${w - 12}" height="4" rx="2" fill="${dark ? '#111' : '#c8cacd'}"/>
    ${dark ? '' : `<circle r="${w * .05}" fill="#d9dbde" stroke="#b9bcc0" stroke-width="1.5"/>`}
  </g>`;
}

/* ------------------------------------------------------------------ */
/* visuals — each builder fills `el` and returns update(t)             */
/* ------------------------------------------------------------------ */
const V = {};

V.charger = el => {
  el.innerHTML = svg(`
    <rect width="720" height="660" fill="#0b0b0b"/>
    <circle cx="470" cy="300" r="260" fill="url(#warmGlow)" opacity=".35"/>
    <g class="drift">
      <rect x="330" y="225" width="520" height="150" rx="40" fill="url(#darkMetal)"/>
      <rect x="340" y="232" width="500" height="6" rx="3" fill="#6d6a65" opacity=".7"/>
      <rect x="410" y="286" width="86" height="32" rx="16" fill="#050505" stroke="#5c5a56" stroke-width="3"/>
      <rect x="540" y="286" width="86" height="32" rx="16" fill="#050505" stroke="#5c5a56" stroke-width="3"/>
      <g class="led fade-el" opacity="0"><circle class="pulse" cx="660" cy="302" r="6" fill="#ffb347" filter="url(#glow)"/></g>
      <g class="plug slow-move" style="transform:translateX(-330px)">
        <rect x="-320" y="278" width="560" height="48" fill="url(#cable)"/>
        <rect x="200" y="266" width="150" height="72" rx="20" fill="url(#cable)" stroke="#8d877e" stroke-width="1.5"/>
        <rect x="350" y="288" width="78" height="28" rx="13" fill="url(#silver)"/>
        <g fill="#f2c14e">${[0, 1, 2, 3, 4].map(i => `<rect x="${362 + i * 12}" y="297" width="7" height="10" rx="1.5"/>`).join('')}</g>
      </g>
    </g>`);
  const plug = $(el, '.plug'), led = $(el, '.led');
  return t => {
    plug.style.transform = t > .15 ? 'translateX(0)' : 'translateX(-330px)';
    led.setAttribute('opacity', t > 1.3 ? 1 : 0);
  };
};

V.shatter = el => {
  const r = rng(5);
  let shards = '', sparks = '', grid = '';
  const cols = 6, rows = 5, x0 = 190, y0 = 160, cw = 56, ch = 64;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = x0 + i * cw, y = y0 + j * ch;
    const pts = [[x + r() * 8, y + r() * 8], [x + cw - r() * 8, y + r() * 6], [x + cw - r() * 6, y + ch - r() * 8], [x + r() * 6, y + ch - r() * 6]];
    const dx = (x + cw / 2 - 360) * (1.6 + r() * 1.6), dy = (y + ch / 2 - 320) * (1.6 + r() * 1.6) - 60 * r();
    shards += `<polygon class="shard" data-d="${f1(dx)},${f1(dy)},${f1((r() - .5) * 220)}" points="${pts.map(p => p.map(f1).join(',')).join(' ')}"
      fill="${r() > .5 ? '#d6c3b0' : '#b9a189'}" stroke="#7a5e46" stroke-width="1.5" style="transform-box:fill-box;transform-origin:center;transition:transform 1.3s cubic-bezier(.15,.7,.3,1)"/>`;
  }
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = 120 + r() * 300;
    sparks += `<circle class="spark" data-d="${f1(Math.cos(a) * d)},${f1(Math.sin(a) * d)}" cx="360" cy="320" r="${f1(1.5 + r() * 3)}" fill="${r() > .5 ? '#ffb347' : '#ff7a1a'}" filter="url(#glow)" style="transition:transform 1.1s cubic-bezier(.1,.8,.3,1), opacity 1.2s;opacity:0"/>`;
  }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    grid += `<rect x="${215 + i * 100}" y="${185 + j * 100}" width="80" height="80" rx="6" fill="none" stroke="#ff8a2a" stroke-width="4" filter="url(#glow)"/><circle cx="${255 + i * 100}" cy="${225 + j * 100}" r="18" fill="url(#hot)" filter="url(#bigGlow)"/>`;
  el.innerHTML = svg(`<rect width="720" height="660" fill="#0b0b0b"/>
    <g class="drift" transform="rotate(-8 360 320)">
      <rect x="190" y="160" width="336" height="320" rx="18" fill="#1b0d05"/>${grid}
      <circle cx="360" cy="320" r="200" fill="url(#hot)" opacity=".45" filter="url(#blur24)"/>
      ${shards}${sparks}
    </g>`);
  let fired = false;
  const go = () => {
    $$(el, '.shard').forEach(s => { const [x, y, a] = s.dataset.d.split(','); s.style.transform = `translate(${x}px,${y}px) rotate(${a}deg)`; });
    $$(el, '.spark').forEach(s => { const [x, y] = s.dataset.d.split(','); s.style.opacity = 1; s.style.transform = `translate(${x}px,${y}px)`; });
  };
  return t => { if (!fired && t > 2.25) { fired = true; requestAnimationFrame(go); } };
};

V.slab = el => {
  el.innerHTML = svg(`
    <g class="drift">
      <ellipse cx="380" cy="470" rx="250" ry="40" fill="#000" opacity=".18" filter="url(#blur24)"/>
      <g transform="translate(360 320) rotate(14) skewX(-10)">
        <rect x="-230" y="-150" width="460" height="300" rx="22" fill="url(#silverTop)" stroke="#9a9ea4" stroke-width="2"/>
        <rect x="-222" y="-142" width="444" height="284" rx="18" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>
        ${[[-170, -105], [150, -105], [-170, 105], [150, 105], [-20, -105], [-20, 105]].map(([x, y]) => `<rect x="${x}" y="${y}" width="22" height="9" rx="4.5" fill="#55595e"/>`).join('')}
      </g>
      <path d="M150 395 q-40 25 -70 10" stroke="#5ac46a" stroke-width="5" fill="none"/>
      <rect x="128" y="380" width="30" height="20" rx="4" fill="#e9eaec" stroke="#9aa" />
    </g>`);
};

V.packs = el => {
  const pack = (x, y, rot, op, blur) => `<g transform="translate(${x} ${y}) rotate(${rot})" opacity="${op}" ${blur ? 'filter="url(#blur8)"' : ''}>
      <rect x="-130" y="-190" width="260" height="380" rx="16" fill="#151515" stroke="#3a3a3a" stroke-width="3"/>
      <rect x="-118" y="-178" width="236" height="356" rx="10" fill="#0c0c0c"/>
      <path d="M-118 -178 L60 -178 L-118 60Z" fill="#fff" opacity=".05"/></g>`;
  el.innerHTML = svg(`<g class="drift">
      ${pack(250, 320, -14, .9, true)}${pack(470, 320, 10, .9, true)}
      <rect x="140" y="250" width="60" height="70" rx="6" fill="#1f1f1f"/><rect x="160" y="262" width="14" height="10" fill="#3fbf5a"/>
      ${pack(360, 320, 0, 1, false)}
      <ellipse cx="360" cy="545" rx="200" ry="20" fill="#000" opacity=".15" filter="url(#blur8)"/></g>`);
};

/* battery cell cross-section + circuit */
V.cell = el => {
  const r = rng(7);
  let flakes = '', balls = '', zig = '', sparkle = '';
  for (let i = 0; i < 320; i++) {
    const x = 66 + r() * 230, y = 66 + r() * 515, rx = 5 + r() * 8, ry = 3 + r() * 4;
    flakes += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" transform="rotate(${Math.round(r() * 180)} ${f1(x)} ${f1(y)})" fill="url(#flake)" stroke="#4f360a" stroke-width=".8"/>`;
  }
  for (let i = 0; i < 380; i++) balls += `<circle cx="${f1(356 + r() * 282)}" cy="${f1(66 + r() * 515)}" r="${f1(6 + r() * 8)}" fill="url(#greyBall)"/>`;
  for (let y = 64; y < 584; y += 17) zig += `M302 ${y} l12 9 l12 -9 l12 9 l12 -9`;
  for (let i = 0; i < 70; i++) sparkle += `<circle class="twinkle" style="animation-delay:${f1(-r() * 2)}s" cx="${f1(22 + r() * 36)}" cy="${f1(64 + r() * 516)}" r="${f1(1 + r() * 2.2)}" fill="#fff" filter="url(#glow)"/>`;
  const ions = [];
  let ionsSvg = '';
  for (let i = 0; i < 18; i++) {
    const io = { sx: 90 + r() * 190, sy: 90 + r() * 470, ex: 380 + r() * 240, ey: 90 + r() * 470, ph: r() };
    ions.push(io);
    ionsSvg += `<circle class="ion" r="7" fill="#ffd45a" filter="url(#bigGlow)"/>`;
  }
  const wire = 'M142 262 C120 110 200 100 236 186 L484 186 C520 100 600 110 578 262';
  let electrons = '';
  for (let i = 0; i < 12; i++) electrons += `<circle r="5" fill="#fff" filter="url(#bigGlow)"><animateMotion dur="3.2s" begin="${-i * .27}s" repeatCount="indefinite" path="${wire}"/></circle>`;
  el.innerHTML = svg(`
    <g class="circuit fade-el" opacity="0">
      <path class="wire" d="${wire}" stroke="#d8dee6" stroke-width="5" fill="none"/>
      <path class="wire-glow fade-el" d="${wire}" stroke="#bfe3ff" stroke-width="9" fill="none" filter="url(#bigGlow)" opacity="0"/>
      ${laptop(230, 26, 260, { pct: 100 })}
      ${electrons}
    </g>
    <g class="cellG move-el">
      <rect x="20" y="60" width="40" height="525" rx="10" fill="url(#copper)"/>
      <rect x="34" y="30" width="12" height="34" fill="#c27447"/><text x="40" y="22" fill="#fff" font-size="26" text-anchor="middle" font-weight="700">−</text>
      <g class="sparkle fade-el" opacity="0">${sparkle}</g>
      <g>${flakes}</g>
      <rect x="300" y="60" width="50" height="525" fill="#e9e9e9"/>
      <path d="${zig}" stroke="#4a4a4a" stroke-width="3" fill="none"/>
      <g>${balls}</g>
      <rect x="640" y="60" width="40" height="525" rx="10" fill="url(#silver)"/>
      <rect x="654" y="30" width="12" height="34" fill="#a9aeb4"/><text x="660" y="24" fill="#fff" font-size="26" text-anchor="middle" font-weight="700">+</text>
      <g class="ions">${ionsSvg}</g>
      <text class="ionlbl fade-el" x="120" y="150" font-size="20" fill="#fff" opacity="0">lithium ion</text>
      <text class="elbl fade-el" x="26" y="52" font-size="20" fill="#fff" opacity="0">electron</text>
      <g class="block fade-el" opacity="0"><circle cx="325" cy="320" r="34" fill="#e0342a"/><path d="M310 305 l30 30 M340 305 l-30 30" stroke="#fff" stroke-width="7" stroke-linecap="round"/></g>
      <line x1="10" y1="595" x2="690" y2="595" stroke="#fff" stroke-width="3"/>
      <text x="350" y="635" fill="#fff" font-size="32" font-weight="700" text-anchor="middle">Battery</text>
      <text class="lbl-a fade-el" x="40" y="628" fill="#fff" font-size="19" font-weight="600" text-anchor="middle" opacity="0">anode</text>
      <text class="lbl-c fade-el" x="660" y="628" fill="#fff" font-size="19" font-weight="600" text-anchor="middle" opacity="0">cathode</text>
    </g>`);
  const cellG = $(el, '.cellG'), ionEls = $$(el, '.ion');
  const show = (sel, on) => $(el, sel).setAttribute('opacity', on ? 1 : 0);
  return t => {
    show('.ionlbl', t > 9 && t < 10.6);
    show('.lbl-a', t >= 11);
    show('.lbl-c', t >= 12.6);
    show('.sparkle', t >= 13.5);
    show('.elbl', t >= 13.5 && t < 15);
    show('.block', t >= 14.4 && t < 15.1);
    show('.circuit', t >= 15.1);
    show('.wire-glow', t >= 18.4);
    cellG.style.transform = t >= 15.1 ? 'translate(115px,235px) scale(.68)' : 'none';
    const p = prog(t, 10, 13.2);
    ionEls.forEach((c, i) => {
      const io = ions[i];
      let k;
      if (t < 15.1) k = ease(clamp(p * 1.5 - i * .028));
      else k = ((t - 15.1) / 3.5 + io.ph) % 1;
      const x = lerp(io.sx, io.ex, k), y = lerp(io.sy, io.ey, k) + Math.sin(t * 2.4 + i) * 5;
      c.setAttribute('cx', f1(x)); c.setAttribute('cy', f1(y));
    });
  };
};

/* laptop + see-through cell with particles */
V.labcell = (el, o) => {
  const r = rng(o.fewer ? 12 : 11);
  const N = 460, parts = [];
  let ps = '';
  for (let i = 0; i < N; i++) {
    const x = 98 + r() * 524;
    parts.push({ x, top: 290 + Math.pow(r(), 1.6) * 60, bot: 530 - Math.pow(r(), 1.6) * 55, d: r() * .3, lock: o.fewer && r() < .42, jx: (r() - .5) * 30 });
    ps += `<circle r="${f1(1.8 + r() * 1.8)}"/>`;
  }
  el.innerHTML = svg(`
    ${o.fewer ? '' : '<rect width="720" height="660" fill="#eef0f2"/>'}
    <g class="drift">
      <path d="M120 262 C100 170 170 120 252 128" stroke="url(#braid)" stroke-width="9" fill="none"/>
      <path d="M600 262 C620 170 550 120 468 128" stroke="url(#braid)" stroke-width="9" fill="none"/>
      ${laptop(250, 10, 220, { pct: o.fewer ? 73 : 64 })}
      <rect x="66" y="256" width="588" height="310" rx="28" fill="url(#silver)" stroke="#7a7f85" stroke-width="2"/>
      <rect x="90" y="280" width="540" height="262" rx="10" fill="#151515"/>
      <g class="parts">${ps}</g>
      ${[[84, 274], [636, 274], [84, 548], [636, 548]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#8d9298" stroke="#555"/>`).join('')}
      <rect x="110" y="236" width="26" height="24" fill="#c27447"/><rect x="584" y="236" width="26" height="24" fill="#a9aeb4"/>
      <g class="plug move-el" style="transform:translateX(-260px)">
        <rect x="-300" y="404" width="330" height="20" fill="url(#cable)"/>
        <rect x="20" y="394" width="44" height="40" rx="8" fill="#e6e3de" stroke="#8d877e"/>
        <rect x="64" y="404" width="14" height="20" rx="3" fill="url(#silver)"/>
        <circle cx="54" cy="414" r="4" fill="#ffb347" class="pulse"/>
      </g>
    </g>`);
  const circles = $$(el, '.parts circle');
  const scrOff = $(el, '.scr-off'), plug = $(el, '.plug');
  return t => {
    let s, pct;
    if (o.fewer) { s = .45 + Math.sin(t * 1.3) * .08; pct = 73; }
    else if (t < 22.5) { s = lerp(.1, 1, ease(prog(t, 19.6, 22.2))); pct = lerp(64, 0, prog(t, 19.6, 22.2)); }
    else { s = lerp(1, .12, ease(prog(t, 23, 24.6))); pct = 0; }
    setPct(el, pct);
    if (scrOff) scrOff.setAttribute('opacity', !o.fewer && pct <= 0 ? 1 : 0);
    if (plug) plug.style.transform = !o.fewer && t >= 22.6 ? 'none' : 'translateX(-260px)';
    circles.forEach((c, i) => {
      const p = parts[i];
      let y, fill;
      if (p.lock) { y = p.bot; fill = '#5a5a5a'; }
      else {
        const k = ease(clamp((s - p.d) / .7));
        y = lerp(p.top, p.bot, k) + Math.sin(t * 3 + i) * 1.5;
        fill = y < 360 ? '#d8342a' : y < 455 ? '#f0a020' : '#f6edd0';
      }
      c.setAttribute('cx', f1(p.x + (p.lock ? 0 : p.jx * Math.sin(s * 3 + i) * .3)));
      c.setAttribute('cy', f1(y));
      c.setAttribute('fill', fill);
    });
  };
};

/* graphite layers + side reactions */
V.graphite = el => {
  const r = rng(21);
  let layers = '', balls = '', mols = '', halos = '';
  const cand = [];
  for (let L = 0; L < 9; L++) {
    const y = 40 + L * 66;
    let pts = '';
    for (let x = 0; x <= 380; x += 13) pts += `${x},${y + ((x / 13) % 2 ? 4 : -4)} `;
    layers += `<polyline points="${pts}" fill="none" stroke="#6a6a6a" stroke-width="2"/>`;
    for (let x = 0; x <= 380; x += 13) layers += `<circle cx="${x}" cy="${y + ((x / 13) % 2 ? 4 : -4)}" r="2.6" fill="#9a9a9a"/>`;
    if (L < 8) for (let j = 0; j < 10; j++) {
      const bx = 18 + j * 36 + (L % 2) * 10, by = y + 33;
      const id = `b${L}_${j}`;
      balls += `<circle id="${id}" cx="${bx}" cy="${by}" r="11" fill="url(#goldBall)"/>`;
      if (j >= 8) {
        cand.push(id);
        halos += `<g class="halo fade-el" data-for="${id}" opacity="0"><circle cx="${bx}" cy="${by}" r="17" fill="none" stroke="#f1c9c9" stroke-width="2.5" filter="url(#glow)"/>
          <polygon points="${hexPts(bx + 26, by - 12, 10)}" fill="none" stroke="#d6a7a5" stroke-width="2.5"/><circle cx="${bx + 18}" cy="${by + 12}" r="4" fill="#f3d6d6"/></g>`;
      }
    }
  }
  for (let i = 0; i < 30; i++) {
    const x = 420 + r() * 290, y = 20 + r() * 600, s = 8 + r() * 6;
    mols += `<g class="float" style="animation-delay:${f1(-r() * 4)}s;animation-duration:${f1(3 + r() * 3)}s"><polygon points="${hexPts(x, y, s)}" fill="none" stroke="#b98f8d" stroke-width="2.2"/>
      <circle cx="${f1(x + s)}" cy="${f1(y)}" r="3.5" fill="#f2d0d0"/><circle cx="${f1(x - s * 1.6)}" cy="${f1(y + s)}" r="3" fill="#f2d0d0"/>
      <line x1="${f1(x - s)}" y1="${f1(y)}" x2="${f1(x - s * 1.6)}" y2="${f1(y + s)}" stroke="#b98f8d" stroke-width="2"/></g>`;
  }
  const streaks = [1, 4, 6].map((L, i) => `<rect class="streak fade-el" style="animation-delay:${i * .5}s" x="300" y="${40 + L * 66 + 31}" width="70" height="3" rx="1.5" fill="#fff" filter="url(#glow)" opacity="0"/>`).join('');
  el.innerHTML = svg(`<rect width="720" height="660" fill="#0d0b09"/><circle cx="520" cy="320" r="300" fill="url(#warmGlow)" opacity=".15"/>
    <g class="drift">${layers}${balls}${halos}${mols}${streaks}</g>`);
  return t => {
    const n = Math.floor(prog(t, 27.4, 30.6) * cand.length);
    cand.forEach((id, i) => {
      const on = i < n;
      $(el, `[data-for="${id}"]`).setAttribute('opacity', on ? 1 : 0);
      $(el, '#' + id).setAttribute('fill', on ? '#8a7766' : 'url(#goldBall)');
    });
    $$(el, '.streak').forEach(s => s.setAttribute('opacity', t > 26.2 && t < 29 ? 1 : 0));
  };
};
function hexPts(cx, cy, s) {
  return [0, 1, 2, 3, 4, 5].map(i => `${f1(cx + s * Math.cos(i * Math.PI / 3))},${f1(cy + s * Math.sin(i * Math.PI / 3))}`).join(' ');
}

V.rods = el => {
  const r = rng(3);
  let rods = '', dots = '';
  for (let i = 0; i < 9; i++) {
    const x = (i % 3) * 250 - 30 + r() * 60, y = Math.floor(i / 3) * 210 + 40 + r() * 40, a = -28 + r() * 22, w = 230 + r() * 80;
    rods += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)})"><rect width="${f1(w)}" height="74" rx="37" fill="url(#rod)"/><rect width="${f1(w)}" height="74" rx="37" fill="url(#stripes)"/>
      <ellipse cx="${f1(w - 30)}" cy="37" rx="22" ry="34" fill="#ffd25a" opacity=".5"/></g>`;
  }
  for (let i = 0; i < 40; i++) dots += `<circle class="${i % 3 ? '' : 'twinkle'}" cx="${f1(r() * 720)}" cy="${f1(r() * 660)}" r="${f1(3 + r() * 4)}" fill="${i % 2 ? '#ffe066' : '#5fb7a0'}" ${i % 2 ? 'filter="url(#glow)"' : ''}/>`;
  el.innerHTML = svg(`<rect width="720" height="660" fill="#3a2a0d"/><g class="drift">${rods}${dots}</g>`);
};

/* crust (SEI) growing on the anode */
V.sei = el => {
  const r = rng(9);
  let stri = '', cob = '', ions = '';
  for (let y = 0; y < 660; y += 7) stri += `<line x1="0" y1="${y}" x2="${230 + r() * 14}" y2="${y}" stroke="${(y / 7) % 2 ? '#7b7b7b' : '#b5b5b5'}" stroke-width="3"/>`;
  for (let c = 0; c < 5; c++) {
    let g = '';
    for (let y = 0; y < 660; y += 22) {
      const cx = 248 + c * 24 + r() * 8, cy = y + r() * 10, rr = 10 + r() * 7;
      g += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(rr)}" fill="#8f8f8f" stroke="#dcdcdc" stroke-width="2"/>`;
    }
    cob += `<g class="cob fade-el" opacity="0">${g}</g>`;
  }
  const ionData = [];
  for (let i = 0; i < 90; i++) { ionData.push({ y: r() * 640 + 10, off: r() * 440, sp: .7 + r() * .6 }); ions += `<circle r="5" fill="#ffc42a" filter="url(#glow)"/>`; }
  el.innerHTML = svg(`<rect width="720" height="660" fill="#666" filter="url(#noise)"/>
    <rect width="720" height="660" fill="#2a2a2a" opacity=".35"/>
    <g class="drift">${stri}${cob}<g class="sion">${ions}</g>
    <g class="bar fade-el" opacity="0"><rect x="250" y="610" width="90" height="6" fill="#fff"/><text x="295" y="640" text-anchor="middle" font-size="20" fill="#fff">20 nm</text></g></g>`);
  const cobs = $$(el, '.cob'), ionEls = $$(el, '.sion circle'), bar = $(el, '.bar');
  return t => {
    const w = prog(t, 36.6, 39.8);
    const nc = Math.ceil(w * cobs.length);
    cobs.forEach((c, i) => c.setAttribute('opacity', i < nc ? 1 : 0));
    bar.setAttribute('opacity', t > 37 ? 1 : 0);
    const edge = 245 + w * 125;
    const slow = 1 - w * .75;
    ionEls.forEach((c, i) => {
      const d = ionData[i];
      const range = 720 - edge;
      const x = edge + ((d.off - t * 40 * d.sp * slow) % range + range) % range;
      c.setAttribute('cx', f1(x)); c.setAttribute('cy', f1(d.y + Math.sin(t * 2 + i) * 4));
    });
  };
};

V.thermal = el => {
  el.innerHTML = svg(`<rect width="720" height="660" fill="#0b0b0b"/>
    <g class="drift">
      <g filter="url(#blur8)">
        <rect x="30" y="40" width="600" height="560" rx="30" fill="#d24a08"/>
        <rect x="70" y="80" width="520" height="140" rx="10" fill="#b23305"/>
        <rect x="80" y="270" width="140" height="280" rx="10" fill="#ff7a12"/>
        <rect x="250" y="270" width="160" height="150" rx="10" fill="#ff8f1f"/>
        <rect x="250" y="440" width="160" height="110" rx="10" fill="#8f2404"/>
        <rect x="440" y="270" width="160" height="280" rx="10" fill="#ff8016"/>
        <circle class="core" cx="330" cy="345" r="120" fill="url(#hot)" opacity=".6"/>
      </g>
      <circle cx="70" cy="560" r="10" fill="#3a0d00"/><circle cx="600" cy="560" r="10" fill="#3a0d00"/>
      <g stroke="#ffd35a" stroke-width="2" fill="none"><circle cx="330" cy="345" r="16"/><line x1="330" y1="318" x2="330" y2="372"/><line x1="303" y1="345" x2="357" y2="345"/></g>
      <text class="temp" x="230" y="335" fill="#111" font-size="30" font-weight="800">35.0 °C</text>
      <rect x="660" y="60" width="16" height="500" rx="4" fill="url(#heatbar)"/>
      <path class="mark" d="M690 300 l12 -8 v16z" fill="#fff"/>
    </g>`);
  const temp = $(el, '.temp'), core = $(el, '.core'), mark = $(el, '.mark');
  return t => {
    const k = prog(t, 40.3, 43);
    temp.textContent = (35 + k * 13).toFixed(1) + ' °C';
    core.setAttribute('opacity', f1(.5 + k * .5));
    mark.setAttribute('transform', `translate(0 ${f1(-k * 160)})`);
  };
};

V.table = el => {
  const r = rng(4);
  let bokeh = '', slats = '';
  for (let i = 0; i < 26; i++) bokeh += `<circle cx="${f1(r() * 720)}" cy="${f1(r() * 200)}" r="${f1(8 + r() * 22)}" fill="${i % 3 ? '#cfe7a0' : '#fff6c8'}" opacity=".35" filter="url(#blur3)"/>`;
  for (let y = 70; y < 620; y += 34) slats += `<line x1="0" y1="${y}" x2="720" y2="${y - 18}" stroke="#7b5427" stroke-width="4"/>`;
  el.innerHTML = svg(`<rect width="720" height="660" fill="#355e27"/>${bokeh}
    <clipPath id="tclip"><ellipse cx="360" cy="360" rx="350" ry="270"/></clipPath>
    <g class="drift"><ellipse cx="360" cy="372" rx="352" ry="272" fill="#5b3d1d"/>
      <g clip-path="url(#tclip)"><rect width="720" height="660" fill="url(#wood)"/>${slats}</g>
      ${closedLaptop(370, 330, 320, -8)}
      <circle cx="140" cy="90" r="260" fill="#fffbe0" opacity=".25" filter="url(#blur24)" class="pulse"/></g>`);
};

V.car = el => {
  const r = rng(8);
  let trees = '';
  for (let i = 0; i < 18; i++) trees += `<circle cx="${f1(220 + r() * 480)}" cy="${f1(r() * 160)}" r="${f1(20 + r() * 40)}" fill="${i % 2 ? '#7fb36a' : '#a9d18e'}" filter="url(#blur8)"/>`;
  el.innerHTML = svg(`<rect width="720" height="660" fill="#e7f0dc"/>${trees}
    <g class="drift">
      <path d="M0 0 H200 L260 200 H720 V660 H0Z" fill="#2c2c2f"/>
      <path d="M160 190 H720 V240 H170Z" fill="#3b3b3f"/>
      <rect x="60" y="250" width="110" height="34" rx="12" fill="#151517"/>${[0, 1, 2, 3].map(i => `<rect x="${72 + i * 24}" y="258" width="16" height="18" rx="4" fill="#3a3a3e"/>`).join('')}
      <rect x="440" y="262" width="170" height="20" rx="10" fill="#d9d9dd"/>
      <circle cx="40" cy="330" r="24" fill="#111" stroke="#444" stroke-width="4"/>
      <path d="M90 360 H660 L700 620 H60Z" fill="#232325"/>
      <path d="M140 380 H620 L640 600 H120Z" fill="#c9b08a"/>
      <path d="M140 380 H330 L300 600 H120Z" fill="#b39a74" opacity=".6"/>
      ${closedLaptop(300, 470, 230, -6)}
      <rect x="650" y="420" width="26" height="40" rx="6" fill="#eee"/>
      <circle cx="560" cy="60" r="220" fill="#fff8d8" opacity=".55" filter="url(#blur24)" class="pulse"/>
    </g>`);
};

V.duvet = el => {
  let q = '';
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) q += `<rect x="${i * 130 - 30}" y="${j * 120 - 20}" width="130" height="120" fill="url(#quilt)" stroke="#d0d0d0" stroke-width="2"/>`;
  const fan = (cx, cy) => {
    let blades = '';
    for (let i = 0; i < 9; i++) blades += `<path d="M0 0 C10 -20 30 -40 18 -62 L4 -62 C10 -40 0 -20 0 0Z" fill="#4a4a4e" transform="rotate(${i * 40})"/>`;
    return `<circle cx="${cx}" cy="${cy}" r="76" fill="#0b0b0c" stroke="#333" stroke-width="3"/>
      <g transform="translate(${cx} ${cy})"><g class="fan spin">${blades}<circle r="16" fill="#2a2a2d"/></g></g>
      <circle cx="${cx}" cy="${cy}" r="76" fill="none" stroke="#1a1a1a" stroke-width="10" stroke-dasharray="3 6"/>`;
  };
  el.innerHTML = svg(`${q}<g class="drift">
      <ellipse cx="360" cy="520" rx="260" ry="40" fill="#000" opacity=".2" filter="url(#blur24)"/>
      <rect x="120" y="180" width="480" height="320" rx="60" fill="#1c1c1f" stroke="#000" stroke-width="3"/>
      <rect x="140" y="200" width="440" height="280" rx="46" fill="#232327"/>
      ${fan(252, 320)}${fan(468, 320)}
      <rect x="335" y="256" width="50" height="128" rx="6" fill="#6b3a1c"/><rect x="335" y="256" width="50" height="128" rx="6" fill="url(#stripes)"/>
      ${[[170, 220], [550, 220], [170, 460], [550, 460]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="#0e0e10"/>`).join('')}
      <path class="fold move-el" style="transform:translateY(-560px)" d="M60 120 C200 60 420 150 660 90 L700 430 C560 380 470 460 360 420 C250 380 150 470 40 420Z" fill="url(#quilt)" stroke="#d0d0d0" stroke-width="3"/>
    </g>`);
  const fold = $(el, '.fold');
  return t => {
    fold.style.transform = t >= 47.2 ? 'translateY(0)' : 'translateY(-560px)';
    $$(el, '.fan').forEach(f => f.classList.toggle('slow', t >= 47.2));
  };
};

V.heatcell = el => {
  const r = rng(15);
  let blobs = '', dots = '', mols = '';
  for (let i = 0; i < 9; i++) blobs += `<circle cx="${f1(r() * 720)}" cy="${f1(r() * 660)}" r="${f1(80 + r() * 90)}" fill="url(#redBlob)"/>`;
  for (let x = 250; x < 480; x += 16) for (let y = 220; y < 440; y += 14) dots += `<circle cx="${x + ((y / 14) % 2) * 8}" cy="${y}" r="4.5" fill="#ffe46a"/>`;
  for (let i = 0; i < 26; i++) {
    const x = r() * 720, y = r() * 660;
    if (Math.hypot(x - 360, y - 330) < 190) continue;
    mols += `<g class="float" style="animation-delay:${f1(-r() * 4)}s"><polygon points="${hexPts(x, y, 8)}" fill="none" stroke="#ff5a4a" stroke-width="2.4"/><circle cx="${f1(x + 14)}" cy="${f1(y + 6)}" r="3" fill="#ff8a7a"/></g>`;
  }
  el.innerHTML = svg(`<rect width="720" height="660" fill="#6a0909"/>${blobs}
    <clipPath id="hclip"><path d="M250 230 C300 170 440 180 480 240 C520 300 500 420 430 450 C360 480 260 460 230 390 C210 340 220 270 250 230Z"/></clipPath>
    <g class="drift">
      <path d="M250 230 C300 170 440 180 480 240 C520 300 500 420 430 450 C360 480 260 460 230 390 C210 340 220 270 250 230Z" fill="#ff9a1a" stroke="#ffb64a" stroke-width="22" filter="url(#bigGlow)"/>
      <g clip-path="url(#hclip)">${dots}</g>
      <circle cx="360" cy="330" r="200" fill="none" stroke="#ff5a2a" stroke-width="3" stroke-dasharray="4 10" class="spin slow"/>
      ${mols}
      <rect x="670" y="80" width="16" height="420" rx="8" fill="#3a0000" stroke="#ff9a7a"/>
      <rect class="merc" x="672" y="300" width="12" height="198" rx="6" fill="url(#heatbar)"/>
      <text class="deg" x="660" y="70" font-size="20" fill="#ffd0b0" text-anchor="end">35°C</text>
    </g>`);
  const merc = $(el, '.merc'), deg = $(el, '.deg');
  return t => {
    const k = prog(t, 48, 50);
    const h = 198 + k * 200;
    merc.setAttribute('y', f1(498 - h)); merc.setAttribute('height', f1(h));
    deg.textContent = Math.round(35 + k * 25) + '°C';
  };
};

/* isometric anode / cathode lattices with lithium balls */
V.lattice = el => {
  const r = rng(17);
  const s = 24, cs = .866 * s, sn = .5 * s;
  const P = (ox, oy, i, j, k) => [ox + (i - j) * cs, oy + (i + j) * sn - k * s];
  const blocks = [{ ox: 200, oy: 300, node: '#5c5c5c', line: '#8c8c8c' }, { ox: 528, oy: 300, node: '#a7a7a7', line: '#c4c4c4' }];
  let lat = '';
  const slots = [[], []];
  blocks.forEach((b, bi) => {
    // end plate
    const plate = bi === 0
      ? [P(b.ox, b.oy, -.8, -.6, -.6), P(b.ox, b.oy, -.8, 4.6, -.6), P(b.ox, b.oy, -.8, 4.6, 4.8), P(b.ox, b.oy, -.8, -.6, 4.8)]
      : [P(b.ox, b.oy, 4.8, -.6, -.6), P(b.ox, b.oy, 4.8, 4.6, -.6), P(b.ox, b.oy, 4.8, 4.6, 4.8), P(b.ox, b.oy, 4.8, -.6, 4.8)];
    lat += `<polygon points="${plate.map(p => p.map(f1).join(',')).join(' ')}" fill="${bi === 0 ? 'url(#copper)' : 'url(#silver)'}" opacity=".95"/>`;
    let g = '';
    for (let k = 0; k <= 4; k++) for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
      const [x, y] = P(b.ox, b.oy, i, j, k);
      if (i < 4) { const [x2, y2] = P(b.ox, b.oy, i + 1, j, k); g += `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x2)}" y2="${f1(y2)}"/>`; }
      if (j < 4) { const [x2, y2] = P(b.ox, b.oy, i, j + 1, k); g += `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x2)}" y2="${f1(y2)}"/>`; }
    }
    let nodes = '';
    for (let k = 0; k <= 4; k++) for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
      const [x, y] = P(b.ox, b.oy, i, j, k);
      nodes += `<circle cx="${f1(x)}" cy="${f1(y)}" r="3.4"/>`;
    }
    lat += `<g class="blk${bi}"><g stroke="${b.line}" stroke-width="1.4">${g}</g><g fill="${b.node}">${nodes}</g>
      <polygon class="hot${bi} fade-el" opacity="0" points="${[P(b.ox, b.oy, 0, 0, 4), P(b.ox, b.oy, 4, 0, 4), P(b.ox, b.oy, 4, 4, 0), P(b.ox, b.oy, 0, 4, 0)].map(p => p.map(f1).join(',')).join(' ')}" fill="#ff3b2f" opacity=".0"/></g>`;
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) slots[bi].push(P(b.ox, b.oy, i + .5, j + .5, k + .5));
    slots[bi].sort(() => r() - .5);
  });
  let sep = '';
  for (let i = 0; i < 4; i++) sep += `<path d="M${352 + i * 7} 190 c-14 30 14 60 0 90 c-14 30 14 60 0 90 c-14 30 14 60 0 90" stroke="#8fa08b" stroke-width="5" fill="none" opacity=".85"/>`;
  const N = 48;
  let balls = '';
  for (let n = 0; n < N; n++) balls += `<circle class="li move-el" r="8.5" fill="url(#goldBall)" style="transition-delay:${n * 9}ms"/>`;
  el.innerHTML = svg(`<g class="drift">
      <path d="M258 116 H40 V230 M462 116 H680 V230" stroke="#2a2a2a" stroke-width="3" fill="none"/>
      ${laptop(258, 0, 204, { pct: 43 })}
      ${lat}${sep}<g class="balls">${balls}</g>
    </g>`);
  const ballEls = $$(el, '.li');
  const sched = [[50, 43], [52.2, 3], [53.1, 100], [54.8, 92], [55.8, 100], [58.5, 26], [59.2, 20], [59.8, 80], [60.2, 55]];
  let lastP = -1;
  return t => {
    let p = sched[0][1];
    for (const [ts, v] of sched) if (t >= ts) p = v;
    setPct(el, p);
    if (p !== lastP) {
      lastP = p;
      const L = Math.round(N * p / 100);
      ballEls.forEach((c, n) => {
        const [x, y] = n < L ? slots[0][n] : slots[1][N - 1 - n];
        c.style.transform = `translate(${f1(x)}px,${f1(y)}px)`;
      });
    }
    const stress = t >= 56.4 && t < 58.5;
    $(el, '.hot0').setAttribute('opacity', stress ? .35 : 0);
    $(el, '.balls').classList.toggle('shake', stress);
  };
};

V.desk = (el, o) => {
  el.innerHTML = svg(`<g class="drift">${desk({ pct: 100 })}</g>`);
  return t => {
    $(el, '.damage').setAttribute('opacity', t >= 64.6 && t < 65.6 ? 1 : 0);
    const multi = t >= 65.6;
    $(el, '.side-l').setAttribute('opacity', multi ? 1 : 0);
    $(el, '.side-r').setAttribute('opacity', multi ? 1 : 0);
  };
};

V.chart = el => {
  const n = 64;
  let bars = '';
  for (let i = 0; i < n; i++) {
    const v = i < 34 ? 100 - (i % 5 === 0 ? 2 : 0) : 80;
    const h = v * 3.2;
    bars += `<rect class="bar" x="${30 + i * 8.7}" y="${440 - h}" width="5.6" height="${h}" rx="1.5" fill="#43c76a" opacity="0"/>`;
  }
  let bolts = '';
  for (let i = 0; i < 6; i++) bolts += `<circle cx="${60 + i * 92}" cy="472" r="11" fill="#43c76a"/><path d="M${62 + i * 92} 464 l-6 9 h5 l-3 8 l8 -10 h-5 l3 -7z" fill="#fff"/>`;
  el.innerHTML = svg(`<rect width="720" height="660" fill="#f4f4f5"/>
    <g class="drift">
      <rect x="0" y="80" width="720" height="440" fill="#fff"/>
      <g stroke="#e6e6e6"><line x1="20" y1="120" x2="590" y2="120"/><line x1="20" y1="280" x2="590" y2="280"/><line x1="20" y1="440" x2="590" y2="440"/></g>
      <g font-size="22" fill="#666"><text x="606" y="128">100%</text><text x="606" y="288">50%</text><text x="606" y="448">0%</text></g>
      ${bars}
      <rect x="20" y="464" width="560" height="16" rx="8" fill="#bfe9c9"/>${bolts}
      <g class="lim fade-el" opacity="0"><line x1="20" y1="184" x2="590" y2="184" stroke="#43c76a" stroke-width="2" stroke-dasharray="6 6"/><text x="606" y="192" font-size="22" font-weight="800" fill="#2e9e50">80%</text></g>
      <circle class="tip" r="9" fill="#9ff0b4" filter="url(#bigGlow)"/>
    </g>`);
  const barEls = $$(el, '.bar'), tip = $(el, '.tip'), lim = $(el, '.lim');
  return t => {
    const c = Math.floor(prog(t, 67.4, 70) * n);
    barEls.forEach((b, i) => b.setAttribute('opacity', i < c ? 1 : 0));
    const last = barEls[Math.max(0, c - 1)];
    tip.setAttribute('cx', +last.getAttribute('x') + 3); tip.setAttribute('cy', last.getAttribute('y'));
    lim.setAttribute('opacity', c > 36 ? 1 : 0);
  };
};

V.board = el => {
  const r = rng(27);
  let traces = '', comps = '';
  for (let i = 0; i < 46; i++) {
    const y = 70 + r() * 200, x = r() * 720, l = 40 + r() * 160;
    traces += `<path d="M${f1(x)} ${f1(y)} h${f1(l)} l14 14 h${f1(l / 2)}" stroke="#4b524d" stroke-width="2" fill="none"/>`;
  }
  for (let i = 0; i < 30; i++) comps += `<rect x="${f1(r() * 700)}" y="${f1(60 + r() * 220)}" width="${f1(8 + r() * 14)}" height="${f1(5 + r() * 8)}" fill="${i % 3 ? '#8f8f8f' : '#c9a14a'}"/>`;
  el.innerHTML = svg(`<rect width="720" height="660" fill="#f4f4f5"/>
    <g class="drift">
      <rect x="-10" y="40" width="740" height="260" fill="#111513"/>${traces}${comps}
      <rect x="250" y="110" width="130" height="90" rx="6" fill="#1d1d1f" stroke="#555"/><text x="315" y="162" text-anchor="middle" font-size="17" fill="#8a8a8a" font-weight="700">M-CHIP</text>
      <rect x="430" y="120" width="90" height="70" rx="5" fill="#1d1d1f" stroke="#555"/>
      <rect x="40" y="100" width="150" height="40" rx="4" fill="#e8e8e8"/><rect x="560" y="100" width="130" height="40" rx="4" fill="#e8e8e8"/>
      <path class="flow fade-el" d="M730 230 H560 L520 190 H380 L330 160" stroke="#ffe8a0" stroke-width="5" fill="none" stroke-dasharray="40 260" filter="url(#bigGlow)" opacity="0"><animate attributeName="stroke-dashoffset" from="300" to="0" dur="1s" repeatCount="indefinite"/></path>
      <rect x="0" y="330" width="720" height="250" rx="20" fill="#202020" stroke="#c9ccd0" stroke-width="6"/>
      <rect class="fill" x="6" y="336" width="400" height="238" fill="url(#speckle)"/>
      <rect class="edge" x="396" y="336" width="20" height="238" fill="#ffb347" opacity=".7" filter="url(#blur3)"/>
      <rect x="40" y="290" width="22" height="90" rx="11" fill="url(#silver)"/><rect x="80" y="290" width="22" height="90" rx="11" fill="url(#silver)"/>
    </g>`);
  const fill = $(el, '.fill'), edge = $(el, '.edge'), flow = $(el, '.flow');
  return t => {
    const k = lerp(.55, .8, ease(prog(t, 69.8, 71)));
    const w = 708 * k;
    fill.setAttribute('width', f1(w)); edge.setAttribute('x', f1(w - 4));
    flow.setAttribute('opacity', t >= 72.6 ? 1 : 0);
  };
};

/* ---- HTML UI mock-ups ---- */
const CURSOR = `<svg class="cursor" viewBox="0 0 22 30"><path d="M2 2 L2 24 L8 18 L12 28 L16 26 L12 17 L20 17Z" fill="#111" stroke="#fff" stroke-width="2"/></svg>`;
const toggle = (on, cls = '') => `<span class="tg ${cls}" style="display:inline-block;width:46px;height:26px;border-radius:13px;background:${on ? '#34c759' : '#c7c7cc'};position:relative;transition:background .3s;vertical-align:middle">
  <span style="position:absolute;top:3px;left:${on ? 23 : 3}px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:left .3s"></span></span>`;
function setToggle(t, on) {
  t.style.background = on ? '#34c759' : '#c7c7cc';
  t.firstElementChild.style.left = (on ? 23 : 3) + 'px';
}
const darkBlur = `<div style="position:absolute;inset:0;background:#111;filter:blur(2px)">
  ${[0, 1, 2, 3].map(i => `<div style="position:absolute;left:${30 + i * 170}px;top:${20 + (i % 2) * 30}px;width:150px;height:14px;border-radius:7px;background:#2a2a2a"></div>`).join('')}
  ${[...Array(14)].map((_, i) => `<div style="position:absolute;left:${420 + i * 20}px;bottom:30px;width:12px;height:${20 + (i * 37 % 80)}px;background:#3a3a3a"></div>`).join('')}</div>`;

V.macset = el => {
  let bars = '';
  for (let i = 0; i < 48; i++) {
    const h = i < 8 ? 70 - i * 6 : i < 10 ? 25 : 80;
    bars += `<div style="flex:1;margin:0 1px;height:${h}%;background:${i === 8 || i === 9 ? '#ff3b30' : '#34c759'};border-radius:1px"></div>`;
  }
  el.innerHTML = `<div class="ui" style="left:36px;top:30px;width:648px;height:590px;border-radius:22px;background:#f5f5f7;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)">
    <div style="height:36px;background:#1d1d1f;color:#fff;font-size:15px;display:flex;justify-content:flex-end;align-items:center;gap:14px;padding:0 18px;font-weight:600">
      <span>80%</span><span style="display:inline-block;width:26px;height:12px;border:1.5px solid #fff;border-radius:3px;position:relative"><span style="position:absolute;inset:1px;right:5px;background:#fff"></span></span><span>Sun Oct 11  9:41 AM</span></div>
    <div style="padding:18px 22px">
      <div style="display:flex;align-items:center;gap:12px"><span style="color:#888;font-size:22px">‹ ›</span><div><div style="font-weight:700;font-size:20px">Battery</div><div style="font-size:13px;color:#777">🔋 Battery Level: 80%</div></div></div>
      <div style="margin-top:18px;background:#fff;border-radius:12px;font-size:16px">
        <div style="display:flex;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #eee"><span>Low Power Mode</span><span style="color:#777">Never ⌃⌄</span></div>
        <div style="display:flex;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #eee"><span>Battery Health</span><span style="color:#777">Normal ⓘ</span></div>
        <div style="display:flex;justify-content:space-between;padding:14px 16px"><span>Charging</span><span class="info" style="color:#777;border-radius:50%;padding:0 4px;transition:background .3s">ⓘ</span></div>
      </div>
      <div style="margin-top:18px;display:flex;background:#e5e5ea;border-radius:9px;padding:3px;font-size:14px;font-weight:600">
        <div style="flex:1;text-align:center;background:#fff;border-radius:7px;padding:6px">Last 24 Hours</div><div style="flex:1;text-align:center;padding:6px;color:#555">Last 10 Days</div></div>
      <div style="margin-top:22px;font-weight:700;font-size:16px">Battery Level</div>
      <div style="display:flex;align-items:flex-end;height:150px;margin-top:10px;border-bottom:1px solid #ddd;padding-right:44px;position:relative">${bars}
        <div style="position:absolute;right:0;top:-6px;font-size:12px;color:#888;line-height:72px">100%<br>50%</div></div>
    </div>${CURSOR}</div>`;
  const cur = $(el, '.cursor'), info = $(el, '.info');
  return t => {
    const at = t >= 75.2;
    cur.style.left = at ? '590px' : '420px'; cur.style.top = at ? '284px' : '420px';
    info.style.background = at ? '#d0d0d5' : 'transparent';
  };
};

V.limit = el => {
  const ticks = ['80%', '85%', '90%', '95%', '100%'];
  el.innerHTML = `<div class="ui" style="inset:0">${darkBlur}</div>
    <div class="ui" style="left:24px;top:110px;width:672px;border-radius:20px;background:#f7f7f9;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.6)">
      <div style="color:#8e8e93;font-size:15px;margin-bottom:10px">Charging</div>
      <div style="background:#fff;border-radius:14px;padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px">
          <div><div style="font-weight:700;font-size:19px">Charge Limit</div><div class="lt" style="font-size:14px;color:#777;margin-top:4px">Your Mac will charge to 100% limit.</div></div>
          <div style="width:330px"><div style="position:relative;height:28px"><div style="position:absolute;top:12px;left:0;right:0;height:5px;border-radius:3px;background:#d1d1d6"></div>
            <div class="knob" style="position:absolute;top:2px;left:304px;width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.35);transition:left 1s cubic-bezier(.45,.05,.25,1)"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:#8e8e93;margin-top:4px">${ticks.map(x => `<span>${x}</span>`).join('')}</div></div>
        </div>
      </div>
      <div class="opt" style="margin-top:14px;border-radius:14px;padding:16px;background:#fff;border:2px solid transparent;transition:all .4s">
        <div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:700;font-size:18px">Optimized Battery Charging</div>${toggle(true)}</div>
        <div style="font-size:14px;color:#666;margin-top:6px;line-height:1.4">To reduce battery aging, your Mac learns from your daily charging routine so it can wait to finish charging past 80% until you need to use it on battery.</div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:20px"><span style="background:#e5e5ea;border-radius:8px;padding:8px 14px;font-size:15px">Learn More…</span><span style="background:#34c759;color:#fff;border-radius:8px;padding:8px 22px;font-weight:700;font-size:15px">Done</span></div>
      ${CURSOR}</div>`;
  const knob = $(el, '.knob'), lt = $(el, '.lt'), opt = $(el, '.opt'), cur = $(el, '.cursor');
  return t => {
    const set = t >= 78.6;
    knob.style.left = set ? '0px' : '304px';
    lt.textContent = `Your Mac will charge to ${set ? 80 : 100}% limit.`;
    const hl = t < 77.5;
    opt.style.background = hl ? '#eaf8ee' : '#fff'; opt.style.borderColor = hl ? '#34c759' : 'transparent';
    cur.style.left = set ? '372px' : (hl ? '600px' : '680px'); cur.style.top = set ? '70px' : (hl ? '230px' : '70px');
  };
};

V.pcapps = el => {
  const winbar = (title, dark) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;font-size:12px;color:${dark ? '#ccc' : '#333'};border-bottom:1px solid ${dark ? '#333' : '#e5e5e5'}"><span>▣ ${title}</span><span>—  ☐  ✕</span></div>`;
  const taskbar = `<div style="position:absolute;left:0;right:0;bottom:0;height:34px;background:#1b1b1b;display:flex;justify-content:center;align-items:center;gap:16px;color:#bbb;font-size:15px">⊞ ⌕ ▭</div>`;
  el.innerHTML = `<div class="ui" style="inset:0;background:#0d0d0d"></div>
    <div class="ui" style="left:8px;top:60px;width:346px;height:520px;background:#202020;color:#fff;border-radius:10px;overflow:hidden">
      ${winbar('Battery Manager', true)}
      <div style="padding:16px"><div style="font-size:19px;font-weight:600">Device settings</div>
        <div style="margin-top:16px;background:#2c2c2c;border-radius:6px;padding:12px;font-weight:600">Charging</div>
        <div style="margin-top:12px;background:#2c2c2c;border-radius:6px;padding:12px"><div style="display:flex;justify-content:space-between;align-items:center"><b>Conservation mode</b>${toggle(false, 'tA')}</div>
          <div style="font-size:12px;color:#aaa;margin-top:6px;line-height:1.4">Enable this setting to help increase the lifespan of your battery. Charging stops at about 80%.</div></div>
        <div style="margin-top:12px;background:#2c2c2c;border-radius:6px;padding:12px"><div style="display:flex;justify-content:space-between;align-items:center"><b>Rapid charge</b>${toggle(false)}</div>
          <div style="font-size:12px;color:#aaa;margin-top:6px;line-height:1.4">Charges faster than normal, depending on your power adapter.</div></div>
      </div>${taskbar}</div>
    <div class="ui" style="left:366px;top:60px;width:346px;height:520px;background:#fafafa;border-radius:10px;overflow:hidden">
      ${winbar('PowerCenter', false)}
      <div style="padding:16px"><div style="font-size:19px;font-weight:600">Device Settings</div><div style="font-size:13px;color:#555;margin-top:4px">General</div>
        <div style="display:flex;gap:10px;font-size:11px;color:#777;margin-top:10px;border-bottom:1px solid #e5e5e5;padding-bottom:6px"><b style="color:#111">Power &amp; Performance</b><span>Audio &amp; Visual</span><span>Connectivity</span></div>
        <div style="margin-top:14px;background:#fff;border:1px solid #eee;border-radius:8px;padding:12px;display:flex;gap:10px"><span style="font-size:26px">🔋</span><div><b>Battery Care Mode</b><div style="font-size:12px;color:#777;margin-top:4px">Keeps your battery healthy even when it's always connected to an AC adapter.</div></div></div>
        <div style="margin-top:12px;background:#fff;border:1px solid #eee;border-radius:8px;padding:12px"><b>Battery Care Mode</b><div style="font-size:12px;color:#777;margin:4px 0 10px">Limit battery charging to 80% of full capacity, which improves the battery's lifespan.</div>${toggle(false, 'tB')} <span class="tBl" style="font-size:13px;margin-left:6px">Off</span></div>
        <div style="margin-top:12px;font-size:13px;color:#999">Instant Full-Charge Mode</div>
      </div>${taskbar}</div>
    ${CURSOR}`;
  const cur = $(el, '.cursor');
  return t => {
    const right = t >= 82;
    cur.style.left = right ? '420px' : '300px'; cur.style.top = right ? '470px' : '255px';
  };
};

V.notify = el => {
  let rings = '';
  for (let i = 0; i < 9; i++) rings += `<circle cx="180" cy="520" r="${700 - i * 70}" fill="${['#ffb067', '#f8913d', '#ef7a2a', '#e4651f', '#d65316', '#c84711', '#b83b0c', '#a8320a', '#962a08'][i]}"/>`;
  el.innerHTML = `
    <div class="ui card1" style="left:110px;top:200px;width:500px;background:#fff;border-radius:18px;padding:26px;box-shadow:0 20px 50px rgba(0,0,0,.18);transition:opacity .4s">
      <div style="display:flex;align-items:center;gap:14px"><span style="font-size:34px">🔋</span><div style="flex:1"><div style="font-weight:800;font-size:22px">Battery Care Mode</div><div style="color:#777;font-size:15px;margin-top:4px">Stop charging at 80%</div></div>${toggle(false, 'tg1')}</div>
      ${CURSOR}</div>
    <div class="ui screen" style="left:20px;top:40px;width:680px;height:560px;border-radius:18px;overflow:hidden;opacity:0;transition:opacity .4s;background:#111">
      <svg viewBox="0 0 680 560" style="width:100%;height:100%">${rings}</svg>
      <div style="position:absolute;right:18px;bottom:70px;background:rgba(40,40,40,.92);color:#fff;border-radius:10px;padding:14px 18px;font-size:18px;font-weight:600;transform:translateY(20px);transition:transform .4s" class="toast">Smart charging · held at 80%</div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:52px;background:rgba(20,20,20,.85);color:#ddd;display:flex;justify-content:flex-end;align-items:center;gap:16px;padding:0 18px;font-size:15px">⌃ 📶 🔊 🔌 <span style="text-align:right;line-height:1.2">10:24 AM<br>10/12/2026</span></div>
    </div>`;
  const tg = $(el, '.tg1'), card = $(el, '.card1'), scr = $(el, '.screen'), toast = $(el, '.toast'), cur = $(el, '.cursor');
  cur.style.left = '300px'; cur.style.top = '120px';
  return t => {
    const clicked = t >= 84.1;
    cur.style.left = clicked || t > 83.9 ? '440px' : '300px'; cur.style.top = clicked || t > 83.9 ? '40px' : '120px';
    setToggle(tg, clicked);
    const s2 = t >= 84.6;
    card.style.opacity = s2 ? 0 : 1; scr.style.opacity = s2 ? 1 : 0;
    toast.style.transform = t >= 85 ? 'none' : 'translateY(20px)';
  };
};

V.share = el => {
  const people = [['Sofia', '#e2a07a', 'S'], ['Daniel', '#7a8fb8', 'D'], ['Mei', '#c98aa8', 'M'], ['Lucas', '#6aa58a', 'L']];
  el.innerHTML = `<div class="ui" style="inset:0;overflow:hidden">${svg(`<g opacity=".95">${desk({ multi: true })}</g>`)}</div>
    <div class="ui" style="left:90px;top:250px;width:540px;background:#fff;border-radius:20px;padding:18px 20px 22px;box-shadow:0 20px 60px rgba(0,0,0,.4)">
      <div style="width:44px;height:5px;border-radius:3px;background:#ddd;margin:0 auto 14px"></div>
      <div style="display:flex;align-items:center;gap:8px;background:#f0f0f2;border-radius:10px;padding:10px 12px;color:#888;font-size:16px">⌕ Search<span style="margin-left:auto">👤+</span></div>
      <div style="display:flex;justify-content:space-around;margin-top:20px">${people.map(([n, c, i], k) => `<div style="text-align:center;font-size:15px;font-weight:${k === 3 ? 700 : 500}">
        <div class="av${k}" style="width:76px;height:76px;border-radius:50%;background:${c};color:#fff;font-size:30px;font-weight:800;display:flex;align-items:center;justify-content:center;position:relative;border:3px solid transparent;transition:border-color .3s">${i}
        ${k === 3 ? '<span class="chk" style="position:absolute;right:-4px;bottom:-4px;width:26px;height:26px;border-radius:50%;background:#111;color:#fff;font-size:15px;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s">✓</span>' : ''}</div>
        <div style="margin-top:8px">${n}</div></div>`).join('')}</div>
      <div class="acts" style="display:flex;justify-content:space-around;margin-top:22px;font-size:14px;color:#333;text-align:center">
        <div><div style="font-size:22px">⊕</div>Add to story</div><div><div style="font-size:22px">🔗</div>Copy link</div><div><div style="font-size:22px">⇪</div>Share</div></div>
      <div class="msg" style="display:none;margin-top:18px"><div style="color:#999;font-size:16px;padding:6px 2px">Write a message…</div>
        <div class="sendbtn" style="margin-top:10px;background:#3478f6;color:#fff;text-align:center;border-radius:10px;padding:12px;font-weight:700;font-size:17px;transition:background .3s">Send</div></div>
      ${CURSOR}</div>`;
  const cur = $(el, '.cursor'), av = $(el, '.av3'), chk = $(el, '.chk'), acts = $(el, '.acts'), msg = $(el, '.msg'), btn = $(el, '.sendbtn');
  return t => {
    const sel = t >= 87.4, sent = t >= 88.7;
    av.style.borderColor = sel ? '#111' : 'transparent'; chk.style.opacity = sel ? 1 : 0;
    acts.style.display = sel ? 'none' : 'flex'; msg.style.display = sel ? 'block' : 'none';
    btn.textContent = sent ? '✓ Sent' : 'Send'; btn.style.background = sent ? '#c7c7cc' : '#3478f6';
    if (t < 87.2) { cur.style.left = '300px'; cur.style.top = '260px'; }
    else if (t < 88.4) { cur.style.left = '470px'; cur.style.top = '140px'; }
    else { cur.style.left = '300px'; cur.style.top = '280px'; }
  };
};

/* ------------------------------------------------------------------ */
/* timeline                                                             */
/* ------------------------------------------------------------------ */
// [time, text]  — [word] marks the highlighted key word
const SCRIPT = [
  [0, '[Stop] keeping your laptop'], [1, 'on the [charger]'], [2, "you're [destroying]"], [2.6, 'its battery.'],
  [3.4, 'Nope,'], [4, "that's completely [outdated.]"], [5.5, 'To know what [wears] a battery out,'], [7.4, 'you need to know how it [works.]'],
  [8.5, 'Inside, [lithium] ions'], [10, 'travel from one side,'], [11, 'the [anode,]'], [12, 'to the other,'], [12.6, 'the [cathode.]'],
  [13.5, "Their [electrons] can't go"], [14.5, 'through the inside,'], [15.1, 'so they take a [detour]'], [16.3, 'through your [laptop.]'],
  [17.4, 'That detour is the'], [18.4, 'electric [current.]'],
  [19.5, 'Once nearly every ion'], [20.6, 'has made the trip,'], [21.8, 'the battery is [empty.]'], [22.6, '[Plug] it in, and they all head back.'],
  [24.5, "In practice, it's [messier.]"], [26.2, 'Small [side] reactions'], [27.6, 'grab some of the [lithium]'], [28.6, 'on the anode side'], [29.6, 'and [lock] it there for good.'],
  [31, 'Less lithium that can move'], [32.1, 'means [fewer] ions,'], [33.2, 'and a [smaller] battery.'],
  [34.5, 'On top of that,'], [35.5, 'those reactions build'], [36.6, 'a thin [crust]'], [37.5, 'that grows over time,'], [38.6, 'and [slows] the ions down.'],
  [40, 'And the [hotter] it gets,'], [41.1, 'the more'], [41.6, 'those reactions [happen.]'],
  [43, 'A laptop'], [43.8, 'in the [sun,]'], [44.6, 'sitting in a [hot] car'], [45.6, 'all summer,'], [46.2, 'or on a [duvet]'], [47, 'with its fans covered,'],
  [48, "that's how you cook"], [49, 'a battery [fast.]'],
  [50, 'The second thing that hurts'], [51.2, 'is the [extremes,]'], [52.2, '[zero] percent,'], [53.1, 'or a [hundred.]'],
  [54, 'At either end,'], [54.8, 'nearly all the ions'], [55.8, 'are [crammed] on one side'], [57, 'and the damage [speeds] up.'],
  [58.5, 'Somewhere around'], [59.2, '20 to 80%'], [60.2, "is where it's [happiest.]"],
  [61.5, "So if it's always on the charger,"], [63, 'it sits at [100%] all day'], [64.6, "and I'm [wrecking] it?"], [65.6, '[Not] on most recent laptops.'],
  [67.5, "Once it notices it's"], [68.2, 'always [plugged] in,'], [69.2, 'it stops around'], [69.8, '[80%] by itself.'],
  [71.3, 'After that, it [stays] there'], [72.6, 'and runs'], [73.4, 'off the [cable.]'],
  [74.6, 'On a [Mac,]'], [75.2, "that's [Optimized] Battery Charging,"], [76.9, 'already on,'], [77.5, 'or set the Charge Limit'], [78.6, 'to [80%.]'],
  [80.4, 'On a [PC,]'], [81, 'open your battery [app,]'], [82.4, 'some ship with it off.'],
  [83.8, 'Switch it [on,]'], [84.5, 'and keep it plugged in,'], [85.4, 'no [stress.]'],
  [86.2, '[Send] this to the friend'], [87.5, 'who unplugs at [100%]'], [88.6, 'every [time.]'],
  [90, '']
];

const SCENES = [
  [0, 'charger', 'dark'], [2, 'shatter', 'dark'], [3.4, 'slab', 'light'], [5.5, 'packs', 'light'],
  [8.5, 'cell', 'dark'], [19.5, 'labcell', 'light'], [24.5, 'graphite', 'dark'], [31, 'rods', 'dark'],
  [32.1, 'labcell', 'dark', { fewer: true }], [34.5, 'sei', 'light'], [40, 'thermal', 'dark'], [43, 'table', 'dark'],
  [44.6, 'car', 'dark'], [46.2, 'duvet', 'dark'], [48, 'heatcell', 'dark'], [50, 'lattice', 'light'],
  [61.5, 'desk', 'dark'], [67.5, 'chart', 'light'], [69.8, 'board', 'light'], [74.6, 'macset', 'dark'],
  [76.9, 'limit', 'dark'], [80.4, 'pcapps', 'dark'], [83.8, 'notify', 'light'], [86.2, 'share', 'light']
];

const POSES = [
  [0, 'idle'], [3.4, 'stop'], [5.5, 'point'], [8.5, 'idle'], [10, 'point'], [12.6, 'pointBoth'], [14.5, 'shrug'], [16.3, 'pointBoth'], [18.4, 'idle'],
  [19.5, 'shrug'], [22.6, 'plug'], [24.5, 'idle'], [26.2, 'point'], [29.6, 'together'], [31, 'idle'], [32.1, 'chin'], [34.5, 'point'], [36.6, 'pointBoth'], [38.6, 'cross'],
  [40, 'thermo'], [43, 'cross'], [44.6, 'idle'], [46.2, 'salute'], [48, 'heads'], [50, 'peace'], [52.2, 'thumbs'], [54.8, 'point'], [55.8, 'thumbs'], [57, 'idle'],
  [60.2, 'fist'], [61.5, 'chin'], [64.6, 'chest'], [65.6, 'together'], [67.5, 'idle'], [69.8, 'palm'], [71.3, 'stop'], [74.6, 'idle'], [76.9, 'point'], [78.6, 'idle'],
  [80.4, 'point'], [82.4, 'shrug'], [83.8, 'plug'], [86.2, 'pointBoth'], [88.6, 'wave']
];
// [leftShoulder, leftElbow, rightShoulder, rightElbow] in degrees (CSS rotate)
const POSE_ANGLES = {
  idle: [10, 0, -10, 0], point: [10, 0, -45, -125], pointBoth: [45, 125, -45, -125], stop: [-15, -160, -10, 0],
  shrug: [62, 58, -62, -58], chin: [10, 0, 48, 132], heads: [128, 62, -128, -62], cross: [-40, -70, 40, 70],
  thumbs: [38, 105, -38, -105], fist: [10, 0, -70, -95], together: [5, -112, -5, 112], chest: [10, 0, 30, 120],
  wave: [10, 0, -150, -20], peace: [10, 0, -60, -110], palm: [-10, -92, -10, 0], salute: [10, 0, -95, -120],
  thermo: [10, 0, -35, -118], plug: [10, 0, -35, -110]
};

/* ------------------------------------------------------------------ */
/* presenter (original cartoon host)                                    */
/* ------------------------------------------------------------------ */
function armSVG(side) {
  const sx = side === 'L' ? 92 : 208;
  const props = side === 'R' ? `
    <g class="prop-thermo fade-el" opacity="0"><rect x="${sx - 6}" y="300" width="12" height="62" rx="6" fill="#fff" stroke="#999"/><rect x="${sx - 3}" y="322" width="6" height="34" fill="#e0342a"/><circle cx="${sx}" cy="362" r="9" fill="#e0342a"/></g>
    <g class="prop-plug fade-el" opacity="0"><rect x="${sx - 10}" y="336" width="20" height="34" rx="5" fill="#eee" stroke="#999"/><rect x="${sx - 5}" y="322" width="10" height="14" fill="url(#silver)"/></g>` : '';
  return `<g class="arm" id="arm${side}" style="transform-origin:${sx}px 215px">
      <rect x="${sx - 15}" y="218" width="30" height="74" rx="15" fill="var(--skin)"/>
      <rect x="${sx - 19}" y="206" width="38" height="44" rx="17" fill="var(--shirt)"/>
      <g class="fore" id="fore${side}" style="transform-origin:${sx}px 286px">
        <rect x="${sx - 12}" y="280" width="24" height="64" rx="12" fill="var(--skin)"/>
        <circle cx="${sx}" cy="346" r="17" fill="var(--skin)"/>
        <rect x="${sx - 5}" y="352" width="10" height="24" rx="5" fill="var(--skin)"/>
        <rect x="${side === 'L' ? sx + 10 : sx - 20}" y="336" width="10" height="16" rx="5" fill="#e9b48b"/>
        ${props}
      </g></g>`;
}
document.getElementById('presenter').innerHTML = `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
  <g id="char-body">
    <path d="M36 320 C40 240 78 206 122 198 L178 198 C222 206 260 240 264 320 Z" fill="var(--shirt)"/>
    <path d="M128 198 Q150 222 172 198" fill="#b5161c"/>
    <rect x="134" y="158" width="32" height="44" rx="12" fill="#e8b085"/>
    <g id="char-head">
      <circle cx="99" cy="122" r="13" fill="var(--skin)"/><circle cx="201" cy="122" r="13" fill="var(--skin)"/>
      <ellipse cx="150" cy="116" rx="51" ry="57" fill="var(--skin)"/>
      <path d="M97 112 C88 58 126 36 160 42 C200 46 214 78 203 114 C198 88 184 76 158 80 C136 70 112 84 97 112Z" fill="#6b3d1e"/>
      <path d="M120 52 C140 22 186 26 196 54 C176 40 150 44 120 52Z" fill="#7d4a25"/>
      <path d="M118 92 q12 -7 24 0 M158 92 q12 -7 24 0" stroke="#5a3418" stroke-width="5" fill="none" stroke-linecap="round"/>
      <g stroke="#1a1a1a" stroke-width="4"><circle cx="128" cy="113" r="16" fill="#1f3448"/><circle cx="172" cy="113" r="16" fill="#1f3448"/><path d="M144 112 h12" fill="none"/></g>
      <path d="M118 106 l8 -6 M162 106 l8 -6" stroke="#fff" stroke-width="3" opacity=".6" stroke-linecap="round"/>
      <path d="M150 120 q-5 12 2 14" stroke="#d99a72" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path id="smile" d="M134 148 Q150 160 166 148" stroke="#8a3b2a" stroke-width="4" fill="none" stroke-linecap="round"/>
      <ellipse id="mouth" cx="150" cy="151" rx="11" ry="7" fill="#6b1f1a" style="transform-origin:150px 147px;transform-box:view-box"/>
    </g>
    ${armSVG('L')}${armSVG('R')}
  </g></svg>`;
const armL = document.getElementById('armL'), armR = document.getElementById('armR');
const foreL = document.getElementById('foreL'), foreR = document.getElementById('foreR');
const mouth = document.getElementById('mouth'), smile = document.getElementById('smile'), head = document.getElementById('char-head');
let curPose = '';
function setPose(name) {
  if (name === curPose) return;
  curPose = name;
  const [a, b, c, d] = POSE_ANGLES[name] || POSE_ANGLES.idle;
  armL.style.transform = `rotate(${a}deg)`; foreL.style.transform = `rotate(${b}deg)`;
  armR.style.transform = `rotate(${c}deg)`; foreR.style.transform = `rotate(${d}deg)`;
  document.querySelector('.prop-thermo').setAttribute('opacity', name === 'thermo' ? 1 : 0);
  document.querySelector('.prop-plug').setAttribute('opacity', name === 'plug' ? 1 : 0);
}

/* ------------------------------------------------------------------ */
/* captions                                                             */
/* ------------------------------------------------------------------ */
const capEl = document.getElementById('caption');
const phrases = SCRIPT.slice(0, -1).map(([ts, text], i) => {
  const te = SCRIPT[i + 1][0];
  const words = text.split(' ').map(w => {
    const key = /^\[.*\]$/.test(w);
    return { text: key ? w.slice(1, -1) : w, key };
  });
  const span = Math.min(te - ts, .2 + words.length * .3) * .92;
  words.forEach((w, k) => { w.t = ts + (k / words.length) * span; });
  return { ts, te, words, talkEnd: ts + span + .15 };
});
let curPhrase = -1;
function renderCaption(i) {
  const p = phrases[i];
  capEl.innerHTML = p ? p.words.map(w => w.key
    ? `<span class="w key">${w.text}<span class="box"><i></i><i></i></span></span>`
    : `<span class="w">${w.text}</span>`).join('') : '';
}

/* ------------------------------------------------------------------ */
/* engine                                                               */
/* ------------------------------------------------------------------ */
const stage = document.getElementById('stage');
const visual = document.getElementById('visual');
const flash = document.getElementById('flash');
let curScene = -1, sceneUpdate = null;

function findIdx(list, t) { let k = 0; for (let i = 0; i < list.length; i++) if (t >= list[i][0]) k = i; return k; }

function showScene(i) {
  const [, name, theme, opts] = SCENES[i];
  $$(visual, '.scene').forEach(old => { old.classList.add('out'); setTimeout(() => old.remove(), 320); });
  const el = document.createElement('div');
  el.className = 'scene';
  visual.appendChild(el);
  sceneUpdate = V[name](el, opts || {}) || null;
  const was = stage.classList.contains('light');
  stage.classList.toggle('light', theme === 'light');
  stage.classList.toggle('dark', theme !== 'light');
  if (was !== (theme === 'light')) { flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); }
}

function render(t) {
  const si = findIdx(SCENES, t);
  if (si !== curScene) { curScene = si; showScene(si); }
  if (sceneUpdate) sceneUpdate(t);

  let pi = -1;
  for (let i = 0; i < phrases.length; i++) if (t >= phrases[i].ts && t < phrases[i].te) pi = i;
  if (pi !== curPhrase) { curPhrase = pi; renderCaption(pi); }
  if (pi >= 0) {
    const p = phrases[pi], spans = capEl.children;
    let cur = -1;
    p.words.forEach((w, k) => { const on = t >= w.t; spans[k].classList.toggle('on', on); if (on) cur = k; });
    for (let k = 0; k < spans.length; k++) spans[k].classList.toggle('cur', k === cur);
    const talking = t < p.talkEnd;
    mouth.style.transform = `scaleY(${talking ? f1(.25 + .75 * Math.abs(Math.sin(t * 17))) : .01})`;
    smile.style.opacity = talking ? 0 : 1;
  } else { mouth.style.transform = 'scaleY(.01)'; smile.style.opacity = 1; }

  setPose(POSES[findIdx(POSES, t)][1]);
  head.style.transform = `rotate(${f1(Math.sin(t * 1.7) * 2.5)}deg)`;
  if (curPose === 'wave') armR.style.transform = `rotate(${f1(-150 + Math.sin(t * 10) * 12)}deg)`;
}

/* ---- clock / controls ---- */
const audio = document.getElementById('audio');
const btnPlay = document.getElementById('btn-play');
const scrub = document.getElementById('scrub');
const clock = document.getElementById('clock');
let playing = false, t0 = 0, base = 0, hasAudio = false;
const now = () => performance.now() / 1000;
function time() {
  if (hasAudio) return audio.currentTime;
  return playing ? base + (now() - t0) : base;
}
function seek(t) {
  t = clamp(t, 0, DUR);
  base = t; t0 = now();
  if (hasAudio) audio.currentTime = t;
  curScene = -1; curPose = '';
  // rebuild immediately so time-based state is exact
  render(t);
}
function play() {
  if (time() >= DUR - .05) seek(0);
  playing = true; t0 = now();
  if (hasAudio) audio.play();
  btnPlay.textContent = '❚❚';
}
function pause() {
  base = time(); playing = false;
  if (hasAudio) audio.pause();
  btnPlay.textContent = '▶';
}
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function loop() {
  let t = time();
  if (t >= DUR) { t = DUR - .001; if (playing) pause(); }
  render(t);
  scrub.value = t;
  clock.textContent = `${fmt(t)} / ${fmt(DUR)}`;
  requestAnimationFrame(loop);
}
btnPlay.onclick = () => (playing ? pause() : play());
document.getElementById('btn-restart').onclick = () => { seek(0); play(); };
scrub.oninput = () => seek(+scrub.value);
document.getElementById('btn-full').onclick = () => {
  const d = document.documentElement;
  if (!document.fullscreenElement) d.requestFullscreen?.(); else document.exitFullscreen?.();
};
document.getElementById('voice').onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  audio.src = URL.createObjectURL(f);
  hasAudio = true;
  audio.currentTime = base;
};
audio.onended = () => pause();
addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
  if (e.key === 'r') { seek(0); play(); }
  if (e.key === 'f') document.getElementById('btn-full').click();
  if (e.key === 'ArrowRight') seek(time() + 2);
  if (e.key === 'ArrowLeft') seek(time() - 2);
});

/* scale the 720x1280 stage to fit the window */
function fit() {
  const vp = document.getElementById('viewport');
  const k = Math.min(vp.clientWidth / 720, vp.clientHeight / 1280);
  stage.style.transform = `scale(${k})`;
}
addEventListener('resize', fit); fit();

/* optional: voiceover.mp3 next to this file is picked up automatically */
if (location.protocol !== 'file:') fetch('voiceover.mp3', { method: 'HEAD' }).then(r => {
  if (r.ok) { audio.src = 'voiceover.mp3'; hasAudio = true; }
}).catch(() => {});

const params = new URLSearchParams(location.search);
if (params.has('record')) document.body.classList.add('record'), fit();
if (params.has('t')) { seek(+params.get('t')); }
else { seek(0); setTimeout(play, 400); }
requestAnimationFrame(loop);

window.REEL = { seek, play, pause, time, DUR };
})();
