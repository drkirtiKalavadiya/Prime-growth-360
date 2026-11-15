/* ભેગું કરવું કે જીવવું? — animated Gujarati moral story (9:16), synced to the voice-over.
 * All artwork is inline SVG drawn below; motion lives in story.css.
 * The clock is the voice-over (audio/voiceover.mp3): every frame, scene and caption
 * animations are set to the current audio time, so pausing and seeking stay in sync.
 *
 * URL options
 *   ?scene=N   start at scene N           ?record  hide controls (for screen recording)
 *   ?clean     empty logo area in ending  ?render  frame-by-frame mode used by render.mjs
 */
(() => {
  'use strict';

  // ---------- palette (kept identical in every scene) ----------
  const C = {
    skin: '#b97a52', skinShade: '#94603f', hair: '#1c1a1d',
    shirt: '#7e3f22', shirtShade: '#5f2d17', pants: '#3f4530', shoe: '#2a1f18',
    burlap: '#b8945e', burlapDark: '#86683d', burlapLight: '#d2b57f',
    grain: '#e8b65a', grainDark: '#c98e33', gold: '#e9b949', goldDark: '#b5832a',
  };

  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  const f = (n) => Math.round(n * 10) / 10;

  /** Place `inner` at (x,y) with scale s; animation classes go on the inner group. */
  function at(x, y, s, inner, cls = '', style = '') {
    const sc = Array.isArray(s) ? `${s[0]} ${s[1]}` : s;
    return `<g transform="translate(${x} ${y}) scale(${sc})"><g class="${cls}" style="${style}">${inner}</g></g>`;
  }

  // ---------- props ----------
  function grains(n, cx, cy, rx, ry, seed, cls = '', style = '') {
    const r = rng(seed);
    let out = '';
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r());
      const x = f(cx + Math.cos(a) * rx * d), y = f(cy + Math.sin(a) * ry * d);
      out += `<ellipse cx="${x}" cy="${y}" rx="3.3" ry="1.8" fill="${r() > .7 ? C.grainDark : C.grain}" transform="rotate(${Math.round(r() * 180)} ${x} ${y})"/>`;
    }
    return `<g class="${cls}" style="${style}">${out}</g>`;
  }

  const SACK = 'M-38 0 Q-46 -38 -27 -58 Q-31 -66 -18 -68 Q0 -61 18 -68 Q31 -66 27 -58 Q46 -38 38 0 Q0 7 -38 0Z';
  function sack(open = false, grow = '') { // standing jute sack, origin bottom centre
    return `<g class="${grow}">
      <path d="${SACK}" fill="${C.burlap}"/><path d="${SACK}" fill="url(#burlapTex)"/>
      <path d="M-30 -8 Q-36 -34 -22 -52" stroke="${C.burlapDark}" stroke-width="2" fill="none" opacity=".6"/>
      <path d="M20 -30 l5 4 l-3 5 l5 4" stroke="${C.burlapDark}" stroke-width="1.6" fill="none"/>
      <path d="M-27 -58 Q0 -50 27 -58" stroke="${C.burlapDark}" stroke-width="3" fill="none"/>
      ${open ? `<ellipse cx="0" cy="-64" rx="19" ry="5.5" fill="${C.grain}"/>${grains(10, 0, -65, 15, 3.5, 7)}` : ''}</g>`;
  }
  const SPILL = 'M-50 0 Q-58 -30 -40 -48 Q-10 -58 30 -50 Q56 -44 58 -20 Q60 0 40 4 Q0 8 -50 0Z';
  function sackSpilled() { // torn sack on its side, mouth to the left
    return `<path d="${SPILL}" fill="${C.burlap}"/><path d="${SPILL}" fill="url(#burlapTex)"/>
      <path d="M10 -52 Q40 -46 52 -24" stroke="${C.burlapLight}" stroke-width="3" fill="none" opacity=".6"/>
      <path d="M-6 -6 l6 -8 l5 6 l6 -9 l5 7" stroke="${C.burlapDark}" stroke-width="2" fill="none"/>
      <ellipse cx="-46" cy="-24" rx="11" ry="23" fill="${C.burlapDark}"/>
      <ellipse cx="-44" cy="-21" rx="8" ry="18" fill="${C.grain}"/>${grains(14, -45, -20, 6, 15, 3)}`;
  }

  function coin(x, y, r = 6) {
    return `<g transform="translate(${x} ${y})"><ellipse cy="1.6" rx="${r}" ry="${f(r * .45)}" fill="${C.goldDark}"/><ellipse rx="${r}" ry="${f(r * .45)}" fill="${C.gold}"/><ellipse rx="${f(r * .55)}" ry="${f(r * .22)}" fill="none" stroke="${C.goldDark}" stroke-width=".8"/></g>`;
  }
  const coinFace = (r = 7) => `<circle r="${r}" fill="${C.gold}" stroke="${C.goldDark}" stroke-width="1.4"/><circle r="${f(r * .6)}" fill="none" stroke="${C.goldDark}" stroke-width=".9"/>`;
  function coinStack(n) { let s = ''; for (let i = 0; i < n; i++) s += coin(0, -i * 3.2, 9); return s; }
  function house() {
    return `<rect x="-14" y="-20" width="28" height="20" fill="#efe4cf"/><rect x="-14" y="-20" width="28" height="20" fill="none" stroke="#b8a888"/>
      <path d="M-19 -18 L0 -35 L19 -18 L15 -18 L0 -30 L-15 -18Z" fill="#b44b34"/><path d="M-15 -18 L0 -30 L15 -18Z" fill="#d06a4c"/>
      <rect x="-4" y="-11" width="8" height="11" fill="#7a4b2c"/><rect x="5" y="-16" width="6" height="5" fill="#8fb3d6"/><rect x="7" y="-33" width="5" height="9" fill="#9c3f2b"/>`;
  }
  const key = (rot = 0) => `<g transform="rotate(${rot})"><circle r="5.5" fill="none" stroke="#c9a24a" stroke-width="2.6"/><path d="M5.5 0 H24 M17 0 V5 M21 0 V4" stroke="#c9a24a" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>`;
  function box(w = 34, h = 24) {
    return `<rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" fill="#a37a4c"/><path d="M${-w / 2} ${-h} L${-w / 2 + 6} ${-h - 7} L${w / 2 + 6} ${-h - 7} L${w / 2} ${-h}Z" fill="#c09566"/>
      <path d="M${w / 2} ${-h} L${w / 2 + 6} ${-h - 7} V-7 L${w / 2} 0Z" fill="#83603a"/><rect x="-3" y="${-h}" width="6" height="${h}" fill="#c9a46e" opacity=".8"/>`;
  }
  const cup = () => `<path d="M-10 -20 H10 L8 0 H-8Z" fill="#9db7b0"/><path d="M10 -16 Q18 -14 9 -6" stroke="#9db7b0" stroke-width="3" fill="none"/><ellipse cy="-20" rx="10" ry="3" fill="#7d9890"/>`;
  const watch = () => `<rect x="-4" y="-24" width="8" height="30" rx="2" fill="#6b4a2e"/><circle cy="-9" r="8" fill="#e8dcc0" stroke="${C.goldDark}" stroke-width="2"/><path d="M0 -9 V-14 M0 -9 H4" stroke="#333" stroke-width="1.2"/>`;
  const heart = (fill = '#d9634a') => `<path d="M0 8 C-14 -2 -12 -14 -5 -14 C-2 -14 0 -11 0 -9 C0 -11 2 -14 5 -14 C12 -14 14 -2 0 8Z" fill="${fill}"/>`;
  const book = () => `<path d="M-14 -8 Q-7 -12 0 -8 Q7 -12 14 -8 V8 Q7 4 0 8 Q-7 4 -14 8Z" fill="#f4ecd8" stroke="#6b5636" stroke-width="1.6"/><path d="M0 -8 V8" stroke="#6b5636" stroke-width="1.4"/>`;
  const sapling = () => `<path d="M0 10 V-6" stroke="#4d7a3a" stroke-width="2.4"/><path d="M0 -2 Q-12 -6 -10 -14 Q-2 -12 0 -2Z" fill="#6fa34f"/><path d="M0 -6 Q12 -10 10 -18 Q2 -16 0 -6Z" fill="#6fa34f"/><ellipse cy="10" rx="10" ry="3" fill="#6b4a2e"/>`;
  const note = (c = '#ffe9a8') => `<path d="M0 0 V-14 L9 -16 V-2" stroke="${c}" stroke-width="1.6" fill="none"/><ellipse cx="-2.4" cy="0" rx="3" ry="2.2" fill="${c}"/><ellipse cx="6.6" cy="-2" rx="3" ry="2.2" fill="${c}"/>`;
  const vbird = (c = '#7a5a3a') => `<path d="M-6 0 Q-3 -4 0 0 Q3 -4 6 0" stroke="${c}" stroke-width="1.5" fill="none"/>`;
  const qmark = (fill = '#f2cf86') => `<text x="0" y="0" text-anchor="middle" font-size="64" font-weight="700" fill="${fill}" font-family="Georgia, serif">?</text>`;
  function glowIcon(inner, x, y, fx, fy, d) {
    return `<g transform="translate(${x} ${y})"><g class="emerge" style="--fx:${fx}px;--fy:${fy}px;--d:${d}s"><circle r="24" fill="url(#iconGlow)" class="pulse"/>${inner}</g></g>`;
  }
  function tree(x, y, s, dark = false) {
    const c1 = dark ? '#0e161d' : '#6f8f45', c2 = dark ? '#0b1015' : '#83a352', tr = dark ? '#0b1015' : '#6b4a2e';
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-4 0 L-3 -46 L3 -46 L4 0Z" fill="${tr}"/><circle cy="-60" r="26" fill="${c1}"/><circle cx="-18" cy="-46" r="17" fill="${c1}"/><circle cx="18" cy="-48" r="18" fill="${c1}"/><circle cx="-6" cy="-68" r="14" fill="${c2}" opacity=".6"/></g>`;
  }

  // ---------- birds (origin: body centre, facing right) ----------
  const BIRDS = {
    sparrow: { body: '#a8794a', belly: '#efe3cf', head: '#7b4a2a', wing: '#6e4628', beak: '#3a3330', eye: '#1a1a1a' },
    crow: { body: '#2c2e35', belly: '#3b3e47', head: '#24262c', wing: '#1d1f24', beak: '#17181b', eye: '#d8d8d8' },
    pigeon: { body: '#a3abb4', belly: '#e4e8ec', head: '#8a939e', wing: '#cfd5db', beak: '#d9d2c4', eye: '#e07a2e' },
  };
  function bird(kind, headCls = '', style = '') {
    const b = BIRDS[kind], big = kind === 'crow';
    const beak = big ? 'M26 -13 L40 -9 L26 -5 Z' : 'M26 -12 L34 -9.5 L26 -7 Z';
    const extra = kind === 'sparrow'
      ? `<path d="M14 -6 Q19 -2 24 -6 Q20 -11 14 -6Z" fill="#f3ece0"/><path d="M20 -6 Q22 -2 25 -4" stroke="#222" stroke-width="2" fill="none"/>`
      : kind === 'pigeon' ? `<path d="M10 -6 Q16 2 22 -4 Q18 -10 12 -10Z" fill="#4f8a74" opacity=".9"/><path d="M12 -4 Q16 0 20 -3" stroke="#7a5a8a" stroke-width="2" fill="none"/>` : '';
    const stripes = kind === 'pigeon'
      ? '<path d="M-8 -2 Q0 -6 6 -1 M-12 2 Q-2 -2 4 3" stroke="#59606a" stroke-width="2.2" fill="none"/>'
      : kind === 'sparrow' ? '<path d="M-10 -3 Q-2 -7 6 -2 M-12 1 Q-4 -2 3 2" stroke="#3e2716" stroke-width="1.6" fill="none"/>' : '';
    return `<g class="bird" style="${style}">
      <path d="M-20 0 L-40 -7 L-38 6 Z" fill="${kind === 'pigeon' ? '#59606a' : b.wing}"/>
      <path d="M-2 11 L-4 22 M6 11 L6 22 M-8 22 H0 M2 22 H10" stroke="#c0705a" stroke-width="1.8" stroke-linecap="round"/>
      <g class="${headCls ? 'bob' : ''}">
        <ellipse rx="${big ? 24 : 22}" ry="${big ? 15 : 14}" fill="${b.body}"/>
        <ellipse cx="4" cy="5" rx="15" ry="8" fill="${b.belly}"/>
        <g class="wing"><path d="M-16 -6 Q2 -13 13 -2 Q0 9 -20 4 Z" fill="${b.wing}"/>${stripes}</g>
      </g>
      <g class="${headCls}">
        <circle cx="18" cy="-10" r="${big ? 11 : 10}" fill="${b.head}"/>${extra}
        <path d="${beak}" fill="${b.beak}"/>
        <circle cx="21" cy="-12.5" r="2" fill="${b.eye}"/><circle cx="21.7" cy="-13.2" r=".7" fill="#fff"/>
      </g></g>`;
  }
  /** A bird that arrives (`enter`: hopin|landin|''), pecks, and optionally flies away at `away` seconds. */
  function birdActor(kind, x, y, s, { enter = '', enterStyle = '', peck = 0, away = null, fx = -160 } = {}) {
    let inner = bird(kind, 'peck', `--p:${peck}s`);
    if (away !== null) inner = `<g class="flyaway" style="--d:${away}s;--fx:${fx}px">${inner}</g>`;
    return at(x, y, s, inner, enter, enterStyle);
  }

  // ---------- people (origin: between the feet) ----------
  function arm(s, e, h, hand = true, sleeve = C.shirt) {
    const [hx, hy] = h.split(' ');
    return `<path d="M${s} L${e} L${h}" fill="none" stroke="${C.skin}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M${s} L${e}" fill="none" stroke="${sleeve}" stroke-width="13" stroke-linecap="round"/>
      ${hand ? `<circle cx="${hx}" cy="${hy}" r="5.6" fill="${C.skin}"/>` : ''}`;
  }
  function face(mood, look = [0, 0]) {
    const brows = {
      neutral: ['M-10 -194 L-3 -194', 'M3 -194 L10 -194'],
      sad: ['M-10 -192 L-3 -195.5', 'M3 -195.5 L10 -192'],
      worried: ['M-10 -193 L-3 -196', 'M3 -196 L10 -193'],
      happy: ['M-10 -195 Q-6.5 -197.5 -3 -195', 'M3 -195 Q6.5 -197.5 10 -195'],
    }[mood];
    const mouth = { neutral: 'M-4 -175 L4 -175', sad: 'M-5 -173.5 Q0 -177 5 -173.5', worried: 'M-4 -174.5 Q0 -176.5 4 -174.5', happy: 'M-6 -177 Q0 -170 6 -177' }[mood];
    const [dx, dy] = look, ry = mood === 'happy' ? 2.2 : 2.7;
    return `<ellipse cx="-6" cy="-187" rx="3.4" ry="${ry}" fill="#fff"/><ellipse cx="6" cy="-187" rx="3.4" ry="${ry}" fill="#fff"/>
      <circle cx="${-6 + dx}" cy="${-187 + dy}" r="1.8" fill="#1a1414"/><circle cx="${6 + dx}" cy="${-187 + dy}" r="1.8" fill="#1a1414"/>
      <path d="${brows[0]}" stroke="${C.hair}" stroke-width="1.8" stroke-linecap="round"/><path d="${brows[1]}" stroke="${C.hair}" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M0 -186 Q-2.6 -180 1 -179.6" stroke="${C.skinShade}" stroke-width="1.3" fill="none"/>
      <path d="${mouth}" stroke="#5a2a1a" stroke-width="1.7" fill="none" stroke-linecap="round"/>
      <path d="M-11 -177 Q-9 -172 -6 -171 M11 -177 Q9 -172 6 -171" stroke="${C.skinShade}" stroke-width=".7" fill="none" opacity=".5"/>
      ${mood === 'sad' || mood === 'worried' ? `<path d="M-9 -183 Q-6 -181.5 -3 -183 M3 -183 Q6 -181.5 9 -183" stroke="${C.skinShade}" stroke-width=".8" fill="none" opacity=".7"/>` : ''}`;
  }
  /** The main character: ~35-year-old man, short black hair, brown long-sleeved shirt, dark olive trousers. */
  function man(o = {}) {
    const { mood = 'neutral', pose = 'stand', look = [0, 0], back = false, walk = false, sit = false, grow = false } = o;
    const legs = sit
      ? `<path d="M-46 -6 Q-50 -30 -16 -36 L16 -36 Q50 -30 46 -6 Q24 2 0 -14 Q-24 2 -46 -6Z" fill="${C.pants}"/>
         <path d="M-30 -10 Q-12 -22 0 -14 Q12 -22 30 -10" stroke="#2f3427" stroke-width="1.5" fill="none"/>
         <ellipse cx="-42" cy="-6" rx="9" ry="5" fill="${C.shoe}"/><ellipse cx="42" cy="-6" rx="9" ry="5" fill="${C.shoe}"/>`
      : `<g class="${walk ? 'legL' : ''}"><rect x="-16" y="-98" width="14" height="92" rx="5" fill="${C.pants}"/><ellipse cx="-10" cy="-4" rx="9.5" ry="4.6" fill="${C.shoe}"/></g>
         <g class="${walk ? 'legR' : ''}"><rect x="2" y="-98" width="14" height="92" rx="5" fill="${C.pants}"/><ellipse cx="10" cy="-4" rx="9.5" ry="4.6" fill="${C.shoe}"/></g>`;
    const torso = `<path d="M-19 -106 L19 -106 L18 -88 L-18 -88Z" fill="${C.pants}"/>
      <path d="M-23 -162 Q0 -170 23 -162 Q28 -130 26 -98 Q0 -95 -26 -98 Q-28 -130 -23 -162Z" fill="${C.shirt}"/>
      ${back
        ? `<path d="M-22 -150 Q0 -146 22 -150" stroke="${C.shirtShade}" stroke-width="1.4" fill="none"/><path d="M0 -150 V-100" stroke="${C.shirtShade}" stroke-width=".8" opacity=".6"/>`
        : `<path d="M-8 -165 L0 -153 L8 -165 L4 -167 L0 -160 L-4 -167Z" fill="${C.shirtShade}"/><path d="M0 -153 V-100" stroke="${C.shirtShade}" stroke-width="1.2"/>
           <circle cx="0" cy="-145" r="1" fill="${C.shirtShade}"/><circle cx="0" cy="-132" r="1" fill="${C.shirtShade}"/><circle cx="0" cy="-119" r="1" fill="${C.shirtShade}"/>
           <path d="M-17 -146 H-8 V-137 H-17Z" fill="none" stroke="${C.shirtShade}" stroke-width="1"/>`}
      <rect x="-5" y="-173" width="10" height="12" fill="${C.skinShade}"/>`;
    const ears = `<ellipse cx="-15" cy="-185" rx="3.5" ry="5" fill="${C.skin}"/><ellipse cx="15" cy="-185" rx="3.5" ry="5" fill="${C.skin}"/><ellipse cx="0" cy="-186" rx="15" ry="18" fill="${C.skin}"/>`;
    const head = back
      ? `${ears}<path d="M-16 -183 Q-19 -209 0 -208 Q19 -209 16 -183 Q12 -174 0 -173 Q-12 -174 -16 -183Z" fill="${C.hair}"/>`
      : `${ears}<path d="M-16 -186 Q-19 -207 -2 -208 Q18 -209 17 -187 Q14 -198 6 -199 Q-2 -195 -9 -200 Q-13 -195 -16 -186Z" fill="${C.hair}"/>${face(mood, look)}`;
    const L = '-22 -157', R = '22 -157';
    let arms = '', front = '';
    if (pose === 'palms') {
      arms = arm(L, '-30 -128', '-24 -112', false) + arm(R, '30 -128', '24 -112', false);
      front = [-1, 1].map((sx) => `<g transform="translate(${sx * 22} -111)"><ellipse rx="11" ry="6" fill="${C.skin}" stroke="${C.skinShade}" stroke-width=".9"/>
        <path d="M-6 -1 Q0 2 6 -1" stroke="${C.skinShade}" stroke-width=".9" fill="none"/>
        <path d="M${sx * -9} -3 L${sx * -13} -7 M${sx * -10} 0 L${sx * -15} -2 M${sx * -9} 3 L${sx * -14} 3" stroke="${C.skin}" stroke-width="3.2" stroke-linecap="round"/></g>`).join('');
    } else if (pose === 'hug') {
      front = `<g transform="translate(0 -92) scale(.78)">${sack(true, grow ? 'grow' : '')}</g>` + arm(L, '-31 -124', '6 -121') + arm(R, '31 -110', '-8 -106');
    } else if (pose === 'paper') {
      arms = arm(R, '30 -132', '38 -146');
      front = `<g transform="translate(28 -194) rotate(-4)"><rect width="50" height="60" rx="2" fill="#f4ecd8" stroke="#c9b58f"/>
          <g transform="translate(14 22) scale(.45)">${house()}</g><g transform="translate(36 18) scale(.45)">${book()}</g>
          <path d="M8 52 Q20 36 30 46 Q40 54 44 40" stroke="#6b5636" stroke-width="1.6" fill="none" stroke-dasharray="3 2"/>
          <g transform="translate(40 34) scale(.4)">${heart()}</g></g>` + arm(L, '-27 -132', '24 -150');
    } else if (pose === 'open') { // arms opened wide, relaxed and happy
      arms = arm(L, '-36 -140', '-50 -158') + arm(R, '36 -140', '50 -158');
    } else {
      arms = arm(L, '-27 -130', '-28 -104') + arm(R, '27 -130', '28 -104');
    }
    const upper = `${torso}${arms}${head}${front}`;
    return sit ? `${legs}<g transform="translate(0 64)">${upper}</g>` : `${legs}<g class="${walk ? 'walkbob' : ''}">${upper}</g>`;
  }
  function child({ dress = '#d9d2bd', girl = false } = {}) {
    return `<rect x="-9" y="-40" width="7" height="36" rx="3" fill="#e6dfcd"/><rect x="2" y="-40" width="7" height="36" rx="3" fill="#e6dfcd"/>
      <ellipse cx="-6" cy="-3" rx="6" ry="3" fill="#6b4a2e"/><ellipse cx="6" cy="-3" rx="6" ry="3" fill="#6b4a2e"/>
      <path d="M-15 -78 Q0 -84 15 -78 L19 -34 L-19 -34Z" fill="${dress}"/>
      <path d="M-13 -74 L-17 -46 M13 -74 L17 -46" stroke="${C.skin}" stroke-width="6" stroke-linecap="round"/>
      <path d="M-13 -74 L-15 -62 M13 -74 L15 -62" stroke="${dress}" stroke-width="8" stroke-linecap="round"/>
      <rect x="-3.5" y="-84" width="7" height="8" fill="${C.skinShade}"/><ellipse cx="0" cy="-94" rx="12" ry="13" fill="${C.skin}"/>
      ${girl
        ? `<path d="M-13 -92 Q-14 -110 0 -109 Q14 -110 13 -92 Q10 -101 0 -102 Q-10 -101 -13 -92Z" fill="${C.hair}"/><path d="M11 -98 Q22 -92 16 -76 Q14 -86 9 -92Z" fill="${C.hair}"/>`
        : `<path d="M-13 -93 Q-14 -109 0 -108 Q14 -109 13 -93 Q9 -101 0 -101 Q-8 -100 -13 -93Z" fill="${C.hair}"/>`}
      <circle cx="-4.5" cy="-96" r="1.6" fill="#1a1414"/><circle cx="4.5" cy="-96" r="1.6" fill="#1a1414"/>
      <path d="M-3.5 -88 Q0 -85 3.5 -88" stroke="#5a2a1a" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  }

  // ---------- backdrops ----------
  /** Dark rural road at night with a warm golden spotlight. */
  function roadSpot(seed = 1) {
    return `<rect width="360" height="640" fill="#0d1014"/>
      <path d="M0 395 L360 375" stroke="#1d2129" stroke-width="2"/>
      <path d="M40 640 L150 400 M320 640 L215 400" stroke="#1a1d22" stroke-width="3"/>
      <path d="M180 640 L182 400" stroke="#26292c" stroke-width="4" stroke-dasharray="26 22"/>
      <path class="beam" d="M140 0 L220 0 L330 640 L30 640Z" fill="url(#beam)"/>
      <ellipse cx="180" cy="505" rx="185" ry="88" fill="url(#floorGlow)"/>
      ${grains(14, 180, 520, 160, 70, seed + 99).replace(/fill="#(e8b65a|c98e33)"/g, 'fill="#3a3326"')}`;
  }
  const vignette = '<rect width="360" height="640" fill="url(#vignette)" pointer-events="none"/>';
  function nightSky(seed) {
    const r = rng(seed);
    let stars = '';
    for (let i = 0; i < 45; i++) stars += `<circle class="twinkle" style="--d:${f(r() * 2.4)}s" cx="${f(r() * 360)}" cy="${f(r() * 300)}" r="${f(.5 + r() * 1.1)}" fill="#e9e4d2"/>`;
    return `<rect width="360" height="640" fill="url(#nightSky)"/>${stars}
      <circle cx="285" cy="95" r="60" fill="url(#moonGlow)"/><circle cx="285" cy="95" r="22" fill="#f1e7c6"/>
      <circle cx="279" cy="90" r="4" fill="#ddd1ae"/><circle cx="292" cy="101" r="3" fill="#ddd1ae"/>
      <path d="M0 360 Q60 318 130 345 Q200 300 270 340 Q320 324 360 345 V420 H0Z" fill="#121a22"/>
      ${tree(40, 400, 1, true)}${tree(250, 400, .8, true)}${tree(320, 400, 1.1, true)}
      <rect y="400" width="360" height="32" fill="#141c1a"/>`;
  }
  function roadSide(seed) {
    const r = rng(seed);
    let grass = '';
    for (let i = 0; i < 40; i++) {
      const x = f(r() * 360), y = f(550 + r() * 90);
      grass += `<path d="M${x} ${y} l-3 -9 M${x} ${y} l1 -11 M${x} ${y} l4 -8" stroke="#2a3a2a" stroke-width="1.4"/>`;
    }
    return `<rect y="430" width="360" height="112" fill="#2b2924"/><rect y="430" width="360" height="112" fill="url(#dust)"/>
      <path d="M0 431 H360 M0 541 H360" stroke="#3d3a33" stroke-width="2"/>
      <rect y="542" width="360" height="98" fill="#1a1f1b"/>${grass}`;
  }
  function truck(driver = false) {
    return `<path d="M196 64 L330 40 L330 104 L196 76Z" fill="url(#headBeam)"/>
      <path d="M0 40 L0 8 Q65 -6 130 8 L130 40 Z" fill="#cbbf9a"/><path d="M30 2 V40 M65 -1 V40 M100 2 V40" stroke="#a89c78" stroke-width="2"/>
      <rect x="0" y="40" width="130" height="50" fill="#6b4a2e"/><path d="M0 56 H130 M0 72 H130" stroke="#523621" stroke-width="2"/>
      <g transform="translate(22 44) scale(.45)">${sack(true)}</g>
      <path d="M132 30 L170 30 Q180 30 185 44 L196 62 L196 92 L132 92 Z" fill="#7a5a3a"/>
      <path d="M140 36 L168 36 L178 58 L140 58 Z" fill="#26313b"/>
      <g class="${driver ? 'headbob' : ''}"><circle cx="156" cy="47" r="6" fill="#141a20"/><rect x="149" y="52" width="14" height="8" fill="#141a20"/></g>
      <circle cx="193" cy="70" r="5" fill="#ffe9a8"/><rect x="0" y="90" width="198" height="8" fill="#2a221a"/>
      ${[35, 160].map((x) => `<g transform="translate(${x} 100)"><g class="spin"><circle r="16" fill="#1a1a1a"/><circle r="7" fill="#6f6f6f"/><path d="M-12 0 H12 M0 -12 V12" stroke="#444" stroke-width="3"/></g></g>`).join('')}`;
  }
  function dawnLand() {
    return `<rect width="360" height="640" fill="url(#dawnSky)"/>
      <g class="sunrise"><circle cx="240" cy="300" r="110" fill="url(#sunGlow)"/><circle cx="240" cy="300" r="40" fill="#fff4d6"/></g>
      <path d="M0 360 Q80 320 160 350 Q240 315 360 345 V460 H0Z" fill="#d7b878"/>
      <path d="M0 400 Q100 375 200 395 Q290 380 360 392 V470 H0Z" fill="#c6a868"/>
      <rect y="440" width="360" height="200" fill="#d9bf86"/>
      <path d="M140 640 Q200 560 172 500 Q150 462 205 440 L222 440 Q182 466 205 500 Q240 570 236 640Z" fill="#ecd9a8"/>
      ${grains(30, 180, 560, 170, 70, 5).replace(/fill="#(e8b65a|c98e33)"/g, 'fill="#b49a62"')}`;
  }

  // ---------- scenes ----------
  // `at` = start time in the voice-over (seconds). Scenes cross-fade into each other.
  function sceneTruck() { // 0.00 – truck drives, a sack falls
    return `${nightSky(11)}${roadSide(3)}
      ${at(-10, 400, 1, truck(), 'drive', '--dd:4.4s;--d:0s')}
      ${at(150, 528, .8, sack(), 'drop', '--d:2.35s')}
      ${vignette}`;
  }
  function sceneSpill() { // 4.39 – the sack tears, grain spreads on the road
    return `<rect width="360" height="640" fill="#141516"/><rect width="360" height="640" fill="url(#dust)"/>
      <path d="M0 470 L360 430" stroke="#5d5a4e" stroke-width="5" stroke-dasharray="40 30" opacity=".5"/>
      <ellipse cx="180" cy="430" rx="200" ry="150" fill="url(#floorGlow)" opacity=".7"/>
      <g class="kb" style="--kt:4.4s;--s:1.12;--oy:420px">
        ${at(250, 430, 2.5, sackSpilled())}
        <g class="spread" style="--d:.2s">${grains(70, 120, 440, 80, 45, 12)}</g>
        <g class="spread" style="--d:1s">${grains(70, 90, 460, 110, 70, 13)}</g>
        <g class="spread" style="--d:1.8s">${grains(60, 70, 470, 120, 90, 14)}</g>
      </g>${vignette}`;
  }
  function sceneDriveOff() { // 8.80 – the driver, carefree, drives on
    const notes = [0, .6, 1.2, 1.8].map((d, i) => `<g transform="translate(${170 + i * 6} ${430})"><g class="note" style="--d:${d}s">${note()}</g></g>`).join('');
    return `${nightSky(12)}${roadSide(4)}
      ${at(70, 525, 1.2, sackSpilled())}${grains(40, 30, 528, 40, 9, 31)}
      <g class="driveoff" style="--d:.4s">${at(140, 400, 1, truck(true))}${notes}</g>
      ${vignette}`;
  }
  function sceneBirdSolo(kind, opts) { // sparrow / crow / pigeon each take a little and leave
    return `${roadSpot(kind.length)}
      ${at(280, 470, 1.3, sackSpilled())}${grains(120, 170, 505, 120, 40, 5)}
      ${birdActor(kind, opts.x, 500, opts.s, opts)}
      ${vignette}`;
  }
  function sceneAllBirds() { // 26.26 – each bird takes only what it needs
    return `${roadSpot(6)}
      ${at(280, 470, 1.3, sackSpilled())}${grains(140, 170, 505, 125, 42, 5)}
      ${birdActor('sparrow', 80, 485, 1.2, { peck: .2, away: 4.6, fx: -150 })}
      ${birdActor('crow', 175, 550, 1.35, { peck: .9, away: 5.2, fx: -170 })}
      ${birdActor('pigeon', 280, 515, [-1.2, 1.2], { peck: .5, away: 5.8, fx: -150 })}
      ${vignette}`;
  }
  function sceneGrab() { // 33.48 – a man comes, chases the birds, takes the whole sack
    return `${roadSpot(3)}
      <g class="kb" style="--kt:7.2s;--s:1.2;--ox:200px;--oy:380px">
        ${grains(150, 165, 500, 115, 42, 5)}
        <g class="fadeout" style="--d:4.3s;--t:.6s">${at(238, 470, 1.5, sackSpilled())}</g>
        ${birdActor('sparrow', 80, 480, 1, { peck: .2, away: 2.2, fx: -160 })}
        ${birdActor('pigeon', 275, 520, [-1.15, 1.15], { peck: .6, away: 2.4, fx: -150 })}
        ${birdActor('crow', 165, 545, 1.25, { peck: 1, away: 2.6, fx: -170 })}
        <g class="fadeout" style="--d:4.2s;--t:.4s">${at(215, 585, 1.5, man({ mood: 'worried', walk: true, look: [-1.5, .5] }), 'walkin', '--from:200px;--dur:2s;--n:5')}</g>
        <g class="fadein" style="--d:4.3s;--t:.5s">${at(215, 585, 1.5, man({ mood: 'worried', pose: 'hug', look: [1.5, 0] }))}</g>
      </g>${vignette}`;
  }
  function sceneThink() { // 40.72 – what were the birds doing? Only what they needed.
    const pile = (x, seed) => grains(5, x, 548, 10, 3, seed);
    return `<rect width="360" height="640" fill="#0d1014"/>
      <path class="beam" d="M60 0 L120 0 L150 640 L10 640Z" fill="url(#beam)"/>
      <path class="beam" d="M150 0 L210 0 L260 640 L100 640Z" fill="url(#beam)"/>
      <path class="beam" d="M240 0 L300 0 L350 640 L210 640Z" fill="url(#beam)"/>
      <g opacity=".45">${at(180, 430, 1.6, sack(true))}${grains(60, 180, 440, 90, 14, 61)}</g>
      ${at(180, 160, 1, qmark(), 'pop', '--d:.4s')}
      ${[['sparrow', 75, 1.1], ['crow', 180, 1.2], ['pigeon', 290, 1.1]].map(([k, x, s], i) => `
        <ellipse cx="${x}" cy="555" rx="48" ry="14" fill="url(#floorGlow)"/>${pile(x + 12, 70 + i)}
        ${at(x, 530, k === 'pigeon' ? [-s, s] : s, bird(k, 'peck', `--p:${i * .5}s`), 'fadein', `--d:${.8 + i * .5}s`)}`).join('')}
      ${vignette}`;
  }
  function sceneWorry() { // 47.99 – the man hoards out of fear of tomorrow
    let pages = '';
    for (let k = 0; k < 10; k++) {
      const label = k === 0 ? '૩૦' : '૧૨૩૪૫૬૭૮૯'.charAt(k % 9);
      pages += `<g class="${k === 0 ? '' : 'flip'}" style="--d:${f((9 - k) * .55 + 1.9)}s"><rect x="0" y="18" width="72" height="66" fill="${k % 2 ? '#f3ede0' : '#ece4d3'}"/>
        <text x="36" y="66" text-anchor="middle" font-size="30" font-weight="700" fill="#6b3a2a" font-family="Noto Sans Gujarati, sans-serif">${label}</text></g>`;
    }
    const calendar = `<rect x="-4" y="0" width="80" height="88" rx="4" fill="#5a4636"/><rect x="0" y="4" width="72" height="16" fill="#b44b34"/>${pages}<circle cx="18" cy="6" r="3" fill="#2a2420"/><circle cx="54" cy="6" r="3" fill="#2a2420"/>`;
    return `<rect width="360" height="640" fill="#15181d"/><rect width="360" height="440" fill="url(#wall)"/>
      <rect x="250" y="120" width="70" height="90" class="daycycle" fill="#0f1a2e"/>
      <path d="M250 120 h70 v90 h-70Z M285 120 V210 M250 165 H320" stroke="#3a3128" stroke-width="5" fill="none"/>
      ${at(285, 186, .8, qmark('#ffe2a0'), 'pop', '--d:5.3s')}
      <rect y="440" width="360" height="200" fill="#121417"/>
      <path class="beam" d="M150 0 L220 0 L300 640 L60 640Z" fill="url(#beam)"/>
      <ellipse cx="190" cy="555" rx="150" ry="55" fill="url(#floorGlow)"/>
      ${at(50, 130, 1, calendar)}
      ${at(190, 590, 1.45, man({ mood: 'worried', pose: 'hug', sit: true, grow: true, look: [-1.6, -.8] }), 'breathe')}
      ${vignette}`;
  }
  function sceneHoard() { // 57.87 – more money, more things, more property…
    const r = rng(41);
    const kinds = [() => coinStack(3 + Math.floor(r() * 4)), house, () => box(30 + r() * 12, 20 + r() * 10), () => key(r() * 60 - 30), cup, watch, () => coin(0, 0, 8)];
    const spots = [[70, 560], [100, 612], [290, 565], [262, 612], [55, 615], [312, 612], [85, 515], [280, 512], [140, 632], [220, 634], [45, 520], [320, 525], [30, 575], [335, 575]];
    let items = '';
    spots.forEach(([x, y], i) => { items += at(x, y, 1.15 + r() * .35, kinds[i % kinds.length](), 'pop', `--d:${f(.5 + i * .5)}s`); });
    let rain = '';
    for (let i = 0; i < 30; i++) rain += `<g transform="translate(${f(30 + r() * 300)} ${f(515 + r() * 115)})"><g class="rain" style="--d:${f(.4 + r() * 8.5)}s">${coinFace(5 + r() * 3)}</g></g>`;
    return `<rect width="360" height="640" fill="#0d1014"/>
      <path class="beam" d="M130 0 L230 0 L350 640 L10 640Z" fill="url(#beam)"/>
      <g transform="translate(180 575)"><ellipse class="widen" rx="185" ry="90" fill="url(#floorGlow)"/></g>
      <g class="kb" style="--kt:11s;--s:1.06;--oy:560px">
        ${at(180, 600, 1.35, man({ mood: 'worried', pose: 'hug', sit: true, look: [1.8, .3] }), 'breathe')}${items}${rain}
      </g>${vignette}`;
  }
  function sceneKafan() { // 68.81 – a shroud has no pockets: empty hands
    const pile = [house(), box(40, 28), coinStack(6), house(), box(30, 22), coinStack(4), house()].map((s, i) => at(20 + i * 52, 640 - (i % 2) * 14, 1.6, s)).join('');
    const falling = [[-22, .2], [22, .9], [-20, 1.4], [24, .5], [-24, 1.1]].map(([x, d], i) =>
      `<g transform="translate(${180 + x * 2.5} ${470 + (i % 2) * 6})"><g class="gfall" style="--d:${d}s"><ellipse rx="4" ry="2.2" fill="${C.grain}"/></g></g>`).join('');
    return `<rect width="360" height="640" fill="#0a0c0f"/>
      <path class="beam" d="M150 0 L210 0 L300 640 L60 640Z" fill="url(#beam)" opacity=".8"/>
      <g class="fadein" style="--d:2.3s;--t:1s"><path d="M120 0 L240 0 L330 640 L30 640Z" fill="url(#beam)"/></g>
      <g opacity=".35" filter="url(#soft)">${pile}</g>
      <g class="kb" style="--kt:7.5s;--s:1.12;--oy:300px">${at(180, 760, 2.5, man({ mood: 'sad', pose: 'palms', look: [0, 1.4] }), 'breathe')}${falling}</g>
      ${vignette}`;
  }
  function scenePlan() { // 76.33 – plans for the children… and the illusion of control
    const icons = [
      [house(), 70, 175, 192, 160, 1], [book(), 140, 120, 122, 215, 1.6], [heart(), 220, 120, 42, 215, 2.2], [sapling(), 290, 175, -28, 160, 2.8],
    ].map(([g, x, y, fx, fy, d], i) => `<g class="drift" style="--d:${5.8 + i * .2}s;--dx:${(i - 1.5) * 60}px">${glowIcon(g, x, y, fx, fy, d)}</g>`).join('');
    return `${roadSpot(7)}<rect width="360" height="640" fill="#f2cf86" opacity=".05"/>
      ${at(80, 590, 1.3, child({ dress: '#d9d2bd' }), 'fadein', '--d:.3s')}
      ${at(290, 592, [-1.25, 1.25], child({ dress: '#a7b59a', girl: true }), 'fadein', '--d:.6s')}
      ${at(180, 585, 1.55, man({ mood: 'happy', pose: 'paper', look: [1.6, -.4] }), 'breathe')}
      ${icons}${vignette}`;
  }
  function sceneJourney() { // 84.89 – life is a journey, a beautiful journey
    const pile = [at(40, 560, 1.4, box(40, 26)), at(85, 572, 1.3, house()), at(30, 600, 1.4, coinStack(6)), at(70, 610, 1.2, key(20)),
      at(110, 600, 1.2, coinStack(4)), at(20, 545, 1.2, house()), at(60, 535, 1.1, cup()), at(100, 545, 1.1, watch())].join('')
      + [[20, 620], [55, 630], [95, 625], [130, 615], [45, 585]].map(([x, y]) => coin(x, y, 7)).join('');
    const vb = [0, 1, 2].map((i) => `<g transform="translate(${140 + i * 18} ${250 + i * 10})"><g class="flyacross" style="--d:${-i * 2}s;--ft:${8 + i}s">${vbird()}</g></g>`).join('');
    const door = (x, cls, hx) => `<g class="${cls}" style="--d:.4s"><rect x="${x}" y="200" width="60" height="270" fill="#4a3a2c"/><path d="M${x + 8} 210 h44 v110 h-44Z M${x + 8} 335 h44 v125 h-44Z" stroke="#3a2d22" stroke-width="3" fill="none"/><rect x="${hx}" y="330" width="4" height="18" rx="2" fill="#b8955a"/></g>`;
    return `<rect width="360" height="640" fill="#101215"/><rect width="360" height="470" fill="#16191e"/>
      <clipPath id="doorway"><rect x="120" y="200" width="120" height="270"/></clipPath>
      <g clip-path="url(#doorway)">
        <rect x="120" y="200" width="120" height="270" fill="url(#dawn)"/>
        <g class="sunrise"><circle cx="180" cy="370" r="70" fill="url(#sunGlow)"/><circle cx="180" cy="370" r="32" fill="#fff4d6"/></g>
        <path d="M120 400 Q160 380 200 395 Q225 385 240 392 V470 H120Z" fill="#c9b07a"/><path d="M120 420 Q170 405 240 418 V470 H120Z" fill="#b3a06a"/>
        <path d="M172 470 L178 400 L182 400 L198 470Z" fill="#ead7a6"/>${vb}
      </g>
      <rect x="114" y="194" width="132" height="6" fill="#2b2620"/><rect x="114" y="194" width="6" height="280" fill="#2b2620"/><rect x="240" y="194" width="6" height="280" fill="#2b2620"/>
      ${door(120, 'doorL', 170)}${door(180, 'doorR', 186)}
      <g class="fadein" style="--d:1.2s;--t:2s"><path d="M120 470 L240 470 L340 640 L20 640Z" fill="url(#doorLight)"/></g>
      <g opacity=".85">${pile}</g>
      ${at(305, 600, [-1.1, 1.1], sack(true))}${grains(30, 295, 612, 38, 9, 81)}
      ${at(268, 612, .85, bird('sparrow', 'peck', '--p:.3s'))}${at(335, 628, [-.95, .95], bird('pigeon', 'peck', '--p:1.1s'))}
      ${at(180, 640, 1.45, man({ back: true, walk: true }), 'walkaway', '--d:1.4s;--ld:1.4s')}
      <g opacity=".22"><rect class="fadein" style="--d:4s;--t:3s" width="360" height="640" fill="#f7d9a0"/></g>
      ${vignette}`;
  }
  function sceneFamily() { // 92.43 – be happy, spend time with family
    const vb = [0, 1, 2, 3].map((i) => `<g transform="translate(${60 + i * 22} ${150 + (i % 2) * 14})"><g class="flyacross" style="--d:${-i * 1.5}s;--ft:${9 + i}s">${vbird('#8a6a44')}</g></g>`).join('');
    return `${dawnLand()}${vb}
      ${tree(62, 470, 1.6)}${tree(318, 455, 1.1)}
      <g class="kb" style="--kt:8.6s;--s:1.08;--oy:520px">
        ${at(325, 600, [-1, 1], sack(true))}${grains(30, 300, 612, 40, 9, 82)}
        ${at(290, 612, .8, bird('sparrow', 'peck', '--p:.3s'))}${at(345, 630, [-.9, .9], bird('pigeon', 'peck', '--p:1s'))}
        ${at(180, 600, 1.5, man({ mood: 'happy', pose: 'open', look: [0, -.6] }), 'breathe')}
        ${at(108, 610, 1.3, child({ dress: '#d9d2bd' }), 'hopy', '--d:.4s')}
        ${at(250, 612, [-1.3, 1.3], child({ dress: '#a7b59a', girl: true }), 'hopy', '--d:.9s')}
      </g>`;
  }
  function sceneQuote() { // 101.01 – life is for living, not just for collecting
    let rays = '';
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * 6.283;
      rays += `<path d="M0 0 L${f(Math.cos(a - .08) * 420)} ${f(Math.sin(a - .08) * 420)} L${f(Math.cos(a + .08) * 420)} ${f(Math.sin(a + .08) * 420)}Z" fill="#fff6dc" opacity=".25"/>`;
    }
    const hands = `<path d="M-70 0 Q-58 38 0 42 Q58 38 70 0 Q36 16 0 14 Q-36 16 -70 0Z" fill="${C.skin}"/>
      <path d="M-70 0 Q-62 -6 -54 2 M70 0 Q62 -6 54 2" stroke="${C.skin}" stroke-width="8" stroke-linecap="round"/>
      <path d="M-40 24 Q-20 32 0 30 M40 24 Q20 32 0 30" stroke="${C.skinShade}" stroke-width="1.2" fill="none"/>
      <rect x="-26" y="38" width="20" height="40" fill="${C.shirt}"/><rect x="6" y="38" width="20" height="40" fill="${C.shirt}"/>${grains(26, 0, 6, 44, 6, 99)}`;
    const text = (y, s, d) => `<text class="rise" style="--d:${d}s" x="180" y="${y}" text-anchor="middle" font-size="21" font-weight="700" fill="#3b2a17" font-family="Noto Sans Gujarati, sans-serif">${s}</text>`;
    return `<rect width="360" height="640" fill="url(#endBg)"/>
      <g transform="translate(180 300)"><g class="rays">${rays}</g></g><circle cx="180" cy="300" r="120" fill="url(#sunGlow)"/>
      ${text(185, 'જીવન જીવવા માટે છે,', .3)}${text(218, 'માત્ર ભેગું કરવા માટે નહીં!', 1.2)}
      ${at(180, 262, 1.3, heart(), 'pop', '--d:2s')}
      ${at(180, 420, 1.3, hands, 'rise', '--d:.2s')}
      ${at(205, 414, .9, bird('sparrow', 'peck', '--p:1.4s'), 'landin', '--d:.6s')}`;
  }
  function sceneCreator() { // 105.36 – ending: a young creator making AI story videos
    const r = rng(77);
    let bokeh = '';
    for (let i = 0; i < 22; i++) {
      const gold = r() > .55;
      bokeh += `<circle class="twinkle" style="--d:${f(r() * 3)}s" cx="${f(r() * 360)}" cy="${f(r() * 420)}" r="${f(4 + r() * 14)}" fill="${gold ? '#e9b949' : '#9a6bff'}" opacity="${f(.06 + r() * .12)}"/>`;
    }
    const mini = `<rect x="48" y="188" width="264" height="159" fill="url(#dawnSky)"/>
      <g class="sunrise"><circle cx="230" cy="290" r="50" fill="url(#sunGlow)"/><circle cx="230" cy="290" r="20" fill="#fff4d6"/></g>
      <path d="M48 300 Q120 280 180 296 Q250 276 312 292 V347 H48Z" fill="#d7b878"/><path d="M48 322 Q150 306 312 318 V347 H48Z" fill="#c6a868"/>
      <path d="M172 347 L178 300 L184 300 L196 347Z" fill="#ecd9a8"/>
      ${at(181, 338, .17, man({ back: true, walk: true }))}
      ${[0, 1, 2].map((i) => `<g transform="translate(${90 + i * 16} ${220 + i * 6})"><g class="flyacross" style="--d:${-i * 2}s;--ft:7s">${vbird('#7a5a3a')}</g></g>`).join('')}
      ${tree(80, 318, .6)}${at(250, 330, .5, bird('sparrow', 'peck', '--p:.4s'))}`;
    const laptopBars = [['#9a6bff', 0, 34], ['#e9b949', 38, 26], ['#4fd1c5', 68, 30], ['#ff7aa8', 4, 24], ['#9a6bff', 32, 40]]
      .map(([c, x, w], i) => `<rect x="${238 + x * .9}" y="${374 + (i > 2 ? 9 : 0)}" width="${w * .9}" height="5" rx="2" fill="${c}"/>`).join('');
    const creator = `<path d="M-46 0 Q-48 -70 -36 -96 Q0 -116 36 -96 Q48 -70 46 0Z" fill="#1f1830"/>
      <path d="M-40 -6 Q-44 -60 -30 -84 Q0 -98 30 -84 Q44 -60 40 -6Z" fill="#4a2f7a"/>
      <path d="M-30 -84 Q0 -96 30 -84 Q20 -74 0 -72 Q-20 -74 -30 -84Z" fill="#3a2563"/>
      <path d="M34 -70 Q60 -66 76 -84" stroke="#4a2f7a" stroke-width="13" stroke-linecap="round" fill="none"/><circle cx="78" cy="-86" r="6" fill="${C.skin}"/>
      <rect x="-6" y="-102" width="12" height="12" fill="${C.skinShade}"/>
      <ellipse cx="0" cy="-118" rx="17" ry="19" fill="${C.skin}"/>
      <path d="M-18 -114 Q-20 -142 0 -142 Q20 -142 18 -114 Q12 -108 0 -106 Q-12 -108 -18 -114Z" fill="${C.hair}"/>
      <path d="M-20 -118 Q-22 -146 0 -146 Q22 -146 20 -118" stroke="#121212" stroke-width="4" fill="none"/>
      <rect x="-25" y="-126" width="9" height="16" rx="4" fill="#121212"/><rect x="16" y="-126" width="9" height="16" rx="4" fill="#9a6bff"/>`;
    return `<rect width="360" height="640" fill="url(#studioBg)"/>${bokeh}
      <path d="M0 0 L60 0 L200 460 L80 460Z" fill="url(#goldBeam)" opacity=".7"/><path d="M360 0 L300 0 L160 460 L280 460Z" fill="url(#purpleBeam)" opacity=".7"/>
      <g class="kb" style="--kt:24.6s;--s:1.6;--ox:180px;--oy:268px">
        <ellipse cx="180" cy="268" rx="190" ry="120" fill="url(#screenGlow)"/>
        <rect x="172" y="355" width="16" height="50" fill="#1b1626"/><ellipse cx="180" cy="405" rx="44" ry="7" fill="#1b1626"/>
        <rect x="38" y="178" width="284" height="179" rx="9" fill="#0b0912" stroke="#3a2d5c" stroke-width="2"/>
        <clipPath id="screen"><rect x="48" y="188" width="264" height="159"/></clipPath>
        <g clip-path="url(#screen)">${mini}<rect x="48" y="188" width="264" height="159" fill="url(#screenSheen)"/></g>
        <rect y="405" width="360" height="40" fill="#2a1d16"/><rect y="405" width="360" height="4" fill="#4a3426"/><rect y="445" width="360" height="195" fill="#150f1c"/>
        <path d="M120 400 L240 400 L246 410 L114 410Z" fill="#2c2540"/>
        <path d="M230 405 L322 405 L330 412 L222 412Z" fill="#3a3350"/><path d="M234 404 L318 404 L312 362 L240 362Z" fill="#0f0c18" stroke="#4d4270" stroke-width="1.5"/>
        <rect x="240" y="366" width="72" height="20" fill="#1c1630"/>${laptopBars}
        <rect class="playhead" x="240" y="364" width="1.6" height="26" fill="#fff"/>
        <path d="M30 405 L42 340 L70 330" stroke="#3a3350" stroke-width="4" fill="none"/><path d="M60 322 L92 334 L76 348Z" fill="#e9b949"/><circle cx="82" cy="345" r="26" fill="url(#lampGlow)"/>
        <rect x="300" y="380" width="14" height="25" rx="3" fill="#e9b949"/><path d="M314 386 q8 2 0 12" stroke="#e9b949" stroke-width="2.5" fill="none"/>
        ${at(150, 640, 1.25, creator)}
      </g>
      <g class="fadein" style="--d:3.5s;--t:1.2s">
        <rect x="58" y="200" width="244" height="150" rx="18" fill="#0d0818" opacity=".72" stroke="#e9b949" stroke-opacity=".5"/>
        <g class="promo">
          <text class="rise" style="--d:5.2s" x="180" y="248" text-anchor="middle" font-size="20" font-weight="800" fill="#f2cf86" font-family="Poppins, Noto Sans Gujarati, sans-serif" letter-spacing=".5">PRIME GROWTH 360</text>
          <g class="rise" style="--d:8.7s"><rect x="78" y="262" width="204" height="26" rx="13" fill="#5b34b4"/><text x="180" y="280" text-anchor="middle" font-size="12.5" font-weight="700" fill="#fff" font-family="Poppins, sans-serif" letter-spacing=".8">AI VIDEO CREATION COURSE</text></g>
          <g class="rise" style="--d:17.2s"><g class="pulse2"><rect x="112" y="298" width="136" height="26" rx="13" fill="#e9b949"/><text x="180" y="316" text-anchor="middle" font-size="12.5" font-weight="800" fill="#24160a" font-family="Noto Sans Gujarati, sans-serif">આજે જ ENROLL કરો</text></g></g>
          <text class="rise" style="--d:23.4s" x="180" y="340" text-anchor="middle" font-size="11" font-weight="600" fill="#d8c9ff" font-family="Poppins, sans-serif" letter-spacing="2">LEARN · CREATE · GROW</text>
        </g>
      </g>
      ${vignette}`;
  }

  const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070b16"/><stop offset=".6" stop-color="#18223a"/><stop offset="1" stop-color="#202a3a"/></linearGradient>
    <radialGradient id="moonGlow"><stop offset="0" stop-color="#f1e7c6" stop-opacity=".45"/><stop offset="1" stop-color="#f1e7c6" stop-opacity="0"/></radialGradient>
    <linearGradient id="headBeam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".55"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></linearGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2a0" stop-opacity=".28"/><stop offset=".75" stop-color="#ffe2a0" stop-opacity=".08"/><stop offset="1" stop-color="#ffe2a0" stop-opacity="0"/></linearGradient>
    <radialGradient id="floorGlow"><stop offset="0" stop-color="#f2cf86" stop-opacity=".55"/><stop offset=".6" stop-color="#c49a5e" stop-opacity=".2"/><stop offset="1" stop-color="#c49a5e" stop-opacity="0"/></radialGradient>
    <radialGradient id="vignette" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1f26"/><stop offset="1" stop-color="#14171c"/></linearGradient>
    <linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3c77e"/><stop offset=".7" stop-color="#fbe6b8"/><stop offset="1" stop-color="#fdf0d2"/></linearGradient>
    <linearGradient id="dawnSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0b86a"/><stop offset=".55" stop-color="#f8dca4"/><stop offset="1" stop-color="#fdf0d2"/></linearGradient>
    <radialGradient id="sunGlow"><stop offset="0" stop-color="#fff4d6" stop-opacity=".9"/><stop offset="1" stop-color="#fff4d6" stop-opacity="0"/></radialGradient>
    <linearGradient id="doorLight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7d9a0" stop-opacity=".55"/><stop offset="1" stop-color="#f7d9a0" stop-opacity=".05"/></linearGradient>
    <radialGradient id="iconGlow"><stop offset="0" stop-color="#ffe9b0" stop-opacity=".8"/><stop offset="1" stop-color="#ffe9b0" stop-opacity="0"/></radialGradient>
    <linearGradient id="endBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dfae"/><stop offset="1" stop-color="#e5b96e"/></linearGradient>
    <linearGradient id="studioBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f0820"/><stop offset=".6" stop-color="#25123f"/><stop offset="1" stop-color="#140b22"/></linearGradient>
    <linearGradient id="goldBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9b949" stop-opacity=".35"/><stop offset="1" stop-color="#e9b949" stop-opacity="0"/></linearGradient>
    <linearGradient id="purpleBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a6bff" stop-opacity=".35"/><stop offset="1" stop-color="#9a6bff" stop-opacity="0"/></linearGradient>
    <radialGradient id="screenGlow"><stop offset="0" stop-color="#f2cf86" stop-opacity=".35"/><stop offset=".6" stop-color="#7a4ad8" stop-opacity=".15"/><stop offset="1" stop-color="#7a4ad8" stop-opacity="0"/></radialGradient>
    <linearGradient id="screenSheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="lampGlow"><stop offset="0" stop-color="#ffd97a" stop-opacity=".6"/><stop offset="1" stop-color="#ffd97a" stop-opacity="0"/></radialGradient>
    <pattern id="burlapTex" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 0 L6 6 M6 0 L0 6" stroke="#000" stroke-opacity=".1" stroke-width="1"/></pattern>
    <pattern id="dust" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".9" fill="#fff" fill-opacity=".05"/><circle cx="10" cy="11" r="1.2" fill="#000" fill-opacity=".12"/></pattern>
    <filter id="soft"><feGaussianBlur stdDeviation="2.5"/></filter>
  </defs></svg>`;

  // ---------- timeline (seconds in the voice-over) ----------
  const CH = {
    Am: [110, 220, 261.63, 329.63], F: [87.31, 174.61, 220, 261.63], C: [65.41, 130.81, 164.81, 196],
    Dm: [73.42, 146.83, 174.61, 220], E: [82.41, 164.81, 207.65, 246.94], G: [98, 196, 246.94, 293.66],
  };
  const SCENES = [
    { at: 0, svg: sceneTruck, chord: CH.Am },
    { at: 4.39, svg: sceneSpill, chord: CH.Am },
    { at: 8.80, svg: sceneDriveOff, chord: CH.F },
    { at: 14.71, svg: () => sceneBirdSolo('sparrow', { x: 170, s: 2.1, enter: 'hopin', enterStyle: '--from:-110px;--d:.1s', peck: 1.4, away: 3.4, fx: 130 }), chord: CH.C },
    { at: 19.17, svg: () => sceneBirdSolo('crow', { x: 175, s: 2, enter: 'landin', enterStyle: '--d:0s', peck: 1.5, away: 3.0, fx: -150 }), chord: CH.F },
    { at: 23.15, svg: () => sceneBirdSolo('pigeon', { x: 190, s: [-2, 2], enter: 'hopin', enterStyle: '--from:-100px;--d:0s', peck: 1, away: 2.3, fx: -140 }), chord: CH.C },
    { at: 26.26, svg: sceneAllBirds, chord: CH.F },
    { at: 33.48, svg: sceneGrab, chord: CH.Dm },
    { at: 40.72, svg: sceneThink, chord: CH.Am },
    { at: 47.99, svg: sceneWorry, chord: CH.Dm },
    { at: 57.87, svg: sceneHoard, chord: CH.E },
    { at: 68.81, svg: sceneKafan, chord: CH.Am },
    { at: 76.33, svg: scenePlan, chord: CH.F },
    { at: 84.89, svg: sceneJourney, chord: CH.C },
    { at: 92.43, svg: sceneFamily, chord: CH.G },
    { at: 101.01, svg: sceneQuote, chord: CH.C },
    { at: 105.36, svg: sceneCreator, chord: CH.F },
  ];
  const CUES = [
    [0, 'એક દિવસ એક ટ્રકમાંથી અનાજની એક ગૂણ રસ્તા પર પડી ગઈ.'],
    [4.39, 'ગૂણ ફાટી ગઈ અને આખું અનાજ રસ્તા પર વેરાઈ ગયું.'],
    [8.80, 'પરંતુ ટ્રક ડ્રાઈવરને ખબર જ ન પડી અને તે પોતાની મસ્તીમાં આગળ ચાલતો રહ્યો.'],
    [14.71, 'થોડી વાર પછી એક ચકલી આવી. તેણે થોડા દાણા ચણ્યા અને ઊડી ગઈ.'],
    [19.17, 'પછી એક કાગડો આવ્યો. તેણે પણ થોડા દાણા લીધા અને ઊડી ગયો.'],
    [23.15, 'ત્યારબાદ એક કબૂતર આવ્યું. તેણે પણ એવું જ કર્યું.'],
    [26.26, 'દરેક પક્ષી પોતાની જરૂરિયાત પ્રમાણે જ દાણા લેતું હતું.'],
    [29.63, 'જેટલી જરૂર એટલું જ લેતું અને શાંતિથી ઊડી જતું.'],
    [33.48, 'પણ પછી એક માણસ આવ્યો.'],
    [35.50, 'તેણે બધા પક્ષીઓને ભગાડી દીધા અને આખી ગૂણનું અનાજ પોતાના માટે ભેગું કરી લીધું.'],
    [40.72, 'પણ જરા વિચારો... એ પક્ષીઓ શું કરી રહ્યાં હતાં?'],
    [44.11, 'તેઓ માત્ર એટલું જ લઈ રહ્યાં હતાં, જેટલી તેમને અત્યારે જરૂર હતી.'],
    [47.99, 'પરંતુ માણસ શું કરી રહ્યો હતો?'],
    [49.91, 'તે આવતીકાલની ચિંતામાં બધું જ ભેગું કરી રહ્યો હતો.'],
    [53.26, 'જ્યારે તેને એ પણ ખબર નહોતી કે આવતીકાલ આવશે પણ કે નહીં!'],
    [57.87, 'આપણે માણસો આટલું બધું ભેગું કરવામાં કેમ લાગ્યા રહીએ છીએ?'],
    [61.51, 'આખી જિંદગી બસ ભેગું જ કરતા રહીએ છીએ.'],
    [63.99, 'વધુ પૈસા, વધુ સામાન, વધુ પ્રોપર્ટી અને વધુ ને વધુ...'],
    [68.81, 'પણ એક વાત હંમેશાં યાદ રાખજો...'],
    [71.16, 'કફનમાં કોઈ ખિસ્સું હોતું નથી!', true],
    [73.55, 'તો પછી આ બધું સાથે શું લઈ જવાના છીએ?'],
    [76.33, 'તમે વિચારો છો કે તમે તમારા બાળકો માટે જે પ્લાનિંગ કર્યું છે, તેઓ બરાબર એ જ રીતે જીવન જીવશે.'],
    [82.02, 'તમને લાગે છે કે બધું જ તમારા કંટ્રોલમાં છે.'],
    [84.89, 'પણ ભાઈબંધ, આ તો એક સફર છે... એક સુંદર સફર!'],
    [90.17, 'તો આ સફરને જીવો. તેનો આનંદ માણો.'],
    [92.43, 'ખુશ રહો, પરિવાર સાથે સમય વિતાવો અને પોતાની આખી જિંદગી એવી વસ્તુઓ ભેગી કરવામાં ન કાઢી નાખો, જે તમે તમારી સાથે લઈ પણ નથી જઈ શકવાના.'],
    [101.01, 'કારણ કે જીવન જીવવા માટે છે, માત્ર ભેગું કરવા માટે નહીં! ❤️', true],
    [105.36, 'અને હા, આવી જ Meaningful Storytelling અને Cinematic AI Videos બનાવતાં શીખવા માંગો છો?'],
    [110.57, 'તો આજે જ PRIME GROWTH 360 પેજને FOLLOW કરો.'],
    [114.04, 'અમે ખાસ તમારા માટે AI VIDEO CREATION COURSE લોન્ચ કર્યો છે.'],
    [117.77, 'જેમાં તમે AI ની મદદથી આવી Creative અને Engaging Videos બનાવતાં શીખી શકશો.'],
    [122.63, '🚀 આજે જ અમારા AI Video Course માં ENROLL કરો.'],
    [125.41, 'તમારી કલ્પનાને AI ની મદદથી હકીકતમાં ફેરવો!', true],
    [128.78, 'PRIME GROWTH 360 – Learn. Create. Grow.', true],
  ];
  const FADE = .6;

  // ---------- ambient pad (quiet, under the voice) ----------
  const Pad = {
    ctx: null, master: null, voices: [], on: false, muted: false,
    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        const ctx = new AC();
        const master = ctx.createGain(); master.gain.value = 0;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800;
        master.connect(lp).connect(ctx.destination);
        this.voices = ['sine', 'triangle', 'sine', 'sine'].map((type, i) => {
          const osc = ctx.createOscillator(); osc.type = type; osc.frequency.value = CH.Am[i]; osc.detune.value = (i - 1.5) * 4;
          const g = ctx.createGain(); g.gain.value = i === 0 ? .35 : .2;
          osc.connect(g).connect(master); osc.start();
          return osc;
        });
        this.ctx = ctx; this.master = master;
      } catch (e) { this.ctx = null; }
    },
    chord(fr) { if (this.ctx) this.voices.forEach((o, i) => o.frequency.setTargetAtTime(fr[i], this.ctx.currentTime, .6)); },
    set(on) {
      this.on = on;
      if (!this.ctx) return;
      if (on && this.ctx.state === 'suspended') this.ctx.resume();
      this.master.gain.setTargetAtTime(on && !this.muted ? .025 : 0, this.ctx.currentTime, .4);
    },
  };

  // ---------- player ----------
  const $ = (s) => document.querySelector(s);
  const stage = $('#stage'), scenesEl = $('#scenes'), capEl = $('#caption'), bar = $('#bar');
  const dotsEl = $('#dots'), overlay = $('#overlay'), playBtn = $('#play'), muteBtn = $('#mute');
  const params = new URLSearchParams(location.search);
  const RENDER = params.has('render');
  if (params.has('record') || RENDER) document.body.classList.add('record');
  if (params.has('clean')) document.body.classList.add('clean');

  document.body.insertAdjacentHTML('afterbegin', DEFS);
  scenesEl.innerHTML = SCENES.map((s, i) => `<svg class="scene" data-i="${i}" viewBox="0 0 360 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${s.svg()}</svg>`).join('');
  const svgs = [...scenesEl.children];
  dotsEl.innerHTML = SCENES.map((_, i) => `<button type="button" role="tab" aria-label="દ્રશ્ય ${i + 1}" data-i="${i}"></button>`).join('');

  const audio = new Audio('audio/voiceover.mp3');
  audio.preload = 'auto';
  let TOTAL = 129.96;
  audio.addEventListener('loadedmetadata', () => { if (isFinite(audio.duration)) TOTAL = audio.duration; });
  let audioOk = true;
  audio.addEventListener('error', () => { audioOk = false; });

  const animCache = new Map();
  function setOn(el, on) {
    if (on === el.classList.contains('on')) return;
    if (on) { el.classList.add('on'); animCache.set(el, el.getAnimations({ subtree: true })); }
    else { el.classList.remove('on'); animCache.delete(el); }
  }
  const sceneAt = (t) => { let i = 0; while (i + 1 < SCENES.length && t >= SCENES[i + 1].at) i++; return i; };
  const cueAt = (t) => { let i = 0; while (i + 1 < CUES.length && t >= CUES[i + 1][0]) i++; return i; };

  let shownScene = -1, shownCue = -1, capAnims = [];
  /** Draw the frame for time t (seconds). Pure function of t, so preview and export match. */
  function renderAt(t) {
    const i = sceneAt(t), into = t - SCENES[i].at;
    svgs.forEach((el, k) => {
      const visible = k === i || (k === i - 1 && into < FADE);
      setOn(el, visible);
      el.style.opacity = k === i ? (k === 0 ? 1 : Math.min(1, into / FADE)) : visible ? 1 : 0;
      if (visible) for (const a of animCache.get(el)) a.currentTime = Math.max(0, t - SCENES[k].at) * 1000;
    });
    if (i !== shownScene) {
      shownScene = i;
      [...dotsEl.children].forEach((d, k) => d.setAttribute('aria-selected', String(k === i)));
      Pad.chord(SCENES[i].chord);
    }
    const c = cueAt(t);
    if (c !== shownCue) {
      shownCue = c;
      const [, text, em] = CUES[c];
      capEl.classList.toggle('em', !!em);
      capEl.innerHTML = text.split(/\s+/).map((w, n) => `<span class="w" style="--i:${n}">${w}</span>`).join('');
      capAnims = capEl.getAnimations({ subtree: true });
    }
    for (const a of capAnims) a.currentTime = Math.max(0, t - CUES[c][0]) * 1000;
    bar.style.width = `${Math.min(100, (t / TOTAL) * 100)}%`;
  }

  let t = 0, playing = false, ended = false, last = 0;
  function seek(to) {
    t = Math.max(0, Math.min(TOTAL - .05, to));
    ended = false;
    if (audioOk) { try { audio.currentTime = t; } catch (e) { /* not loaded yet */ } }
    renderAt(t);
  }
  function play(fromUser) {
    if (ended) seek(0);
    playing = true;
    overlay.hidden = true;
    playBtn.textContent = '⏸';
    if (audioOk) {
      try { audio.currentTime = t; } catch (e) { /* ignore */ }
      audio.play().catch(() => { /* autoplay blocked: keep running silently */ });
    }
    if (fromUser) Pad.init();
    Pad.set(true);
  }
  function pause() {
    playing = false;
    audio.pause();
    playBtn.textContent = '▶';
    Pad.set(false);
  }
  function finish() {
    pause(); ended = true;
    playBtn.textContent = '↺';
    $('#overlay-sub').textContent = 'વાર્તા પૂરી થઈ. ફરી જોવી છે?';
    $('#start').textContent = '↺ ફરી જુઓ';
    if (!document.body.classList.contains('record')) overlay.hidden = false;
  }
  function tick(now) {
    const dt = last ? Math.min(.1, (now - last) / 1000) : 0;
    last = now;
    if (playing) {
      t += dt;
      // follow the voice-over; correct drift instead of jumping every frame
      if (audioOk && !audio.paused && Math.abs(audio.currentTime - t) > .12) t = audio.currentTime;
      if (t >= TOTAL) { t = TOTAL; finish(); }
      renderAt(t);
    }
    requestAnimationFrame(tick);
  }

  const toggle = () => (playing ? pause() : play(true));
  const jump = (i) => { seek(SCENES[Math.max(0, Math.min(SCENES.length - 1, i))].at); if (!playing) play(true); };
  $('#start').addEventListener('click', (e) => { e.stopPropagation(); play(true); });
  playBtn.addEventListener('click', toggle);
  $('#prev').addEventListener('click', () => jump(sceneAt(t) - (t - SCENES[sceneAt(t)].at < 1.5 ? 1 : 0)));
  $('#next').addEventListener('click', () => jump(sceneAt(t) + 1));
  $('#restart').addEventListener('click', () => jump(0));
  muteBtn.addEventListener('click', () => {
    const m = !audio.muted;
    audio.muted = m; Pad.muted = m;
    muteBtn.setAttribute('aria-pressed', String(m));
    Pad.set(playing);
  });
  dotsEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) jump(+b.dataset.i); });
  stage.addEventListener('click', () => { if (overlay.hidden) toggle(); });
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
    if (e.key === ' ') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight') jump(sceneAt(t) + 1);
    else if (e.key === 'ArrowLeft') jump(sceneAt(t) - 1);
    else if (e.key === 'r' || e.key === 'R') jump(0);
    else if (e.key === 'm' || e.key === 'M') muteBtn.click();
  });

  const startScene = Math.max(1, Math.min(SCENES.length, parseInt(params.get('scene'), 10) || 1)) - 1;
  seek(SCENES[startScene].at);
  if (RENDER) {
    overlay.hidden = true;
    audioOk = false;
    window.__duration = TOTAL;
    window.__seek = (time) => renderAt(time);
    window.__ready = document.fonts ? document.fonts.ready.then(() => true) : Promise.resolve(true);
  } else {
    requestAnimationFrame(tick);
  }
})();
