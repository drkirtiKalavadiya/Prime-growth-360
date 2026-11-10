/* =========================================================================
   ART LIBRARY — ink-sketch + watercolor components, all hand-built SVG.
   Every function returns an SVG markup string.
   Classes: .ink (outline strokes, can be "drawn on"), .ink2 (thin detail),
            .wc (watercolor wash), .hatch (shading)
   ========================================================================= */
(function () {
  'use strict';
  const C = {
    ink: '#272534', ink2: '#3f3d52', paper: '#ece5d5',
    indigo: '#4b5296', slate: '#6b7499', lav: '#9497c6', storm: '#565d7e',
    ochre: '#c79a62', rust: '#a8613f', gold: '#d8a134', skin: '#e3bf9b', skinD: '#c99a74',
    blue: '#2f5be0', glow: '#4d8dff', steel: '#8c93a8', dark: '#22212c',
  };

  /* ---------------- defs: filters + patterns ---------------- */
  const defs = `
  <defs>
    <filter id="paperNoise" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.31  0 0 0 0 0.25  0 0 0 0.55 -0.12"/>
    </filter>
    <filter id="paperFiber" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.04" numOctaves="4" seed="11" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0 0.32  0 0 0 0.5 -0.18"/>
    </filter>
    <filter id="woodGrain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.004 0.12" numOctaves="3" seed="4" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.15  0 0 0 0 0.08  0 0 0 0.8 -0.1"/>
    </filter>
    <filter id="wc" x="-35%" y="-35%" width="170%" height="170%">
      <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="3" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="70" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feGaussianBlur in="d" stdDeviation="4" result="b"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="2" seed="9" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.7 1.12" result="ga"/>
      <feComposite in="b" in2="ga" operator="in"/>
    </filter>
    <filter id="wc2" x="-35%" y="-35%" width="170%" height="170%">
      <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" seed="21" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="45" xChannelSelector="R" yChannelSelector="B" result="d"/>
      <feGaussianBlur in="d" stdDeviation="1.5"/>
    </filter>
    <filter id="splat" x="-50%" y="-50%" width="200%" height="200%">
      <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" seed="5" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="18" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="2" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="fog" x="-30%" y="-30%" width="160%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="4" seed="13" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="120" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feGaussianBlur in="d" stdDeviation="14"/>
    </filter>
    ${glowFilter('glowBlue', '#2e6bff', '#a9d3ff', 12, 3)}
    ${glowFilter('glowGold', '#ff8a00', '#ffe08a', 12, 3)}
    ${glowFilter('glowSoft', '#5c86ff', '#cfe3ff', 22, 6)}
    ${glowFilter('glowWhite', '#7aa6ff', '#ffffff', 8, 2)}
    <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
      <line x1="0" y1="0" x2="0" y2="7" stroke="${C.ink}" stroke-width="1.1"/></pattern>
    <pattern id="hatchF" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
      <line x1="0" y1="0" x2="0" y2="5" stroke="${C.ink}" stroke-width="0.9"/></pattern>
    <pattern id="cross" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="7" stroke="${C.ink}" stroke-width="1"/><line x1="0" y1="0" x2="7" y2="0" stroke="${C.ink}" stroke-width="1"/></pattern>
    <pattern id="mail" width="8" height="6" patternUnits="userSpaceOnUse">
      <path d="M0,3 Q2,0 4,3 Q6,6 8,3" fill="none" stroke="${C.ink}" stroke-width="0.9"/></pattern>
    <pattern id="brick" width="44" height="22" patternUnits="userSpaceOnUse">
      <rect width="44" height="22" fill="#d9c3a2"/>
      <path d="M0,0 H44 M0,11 H44 M22,0 V11 M0,11 V22 M44,11 V22" stroke="${C.ink2}" stroke-width="1.4" fill="none"/></pattern>
    <pattern id="check" width="80" height="80" patternUnits="userSpaceOnUse">
      <rect width="80" height="80" fill="#efe8da"/><rect width="40" height="40" fill="url(#cross)"/><rect x="40" y="40" width="40" height="40" fill="url(#cross)"/></pattern>
    <radialGradient id="vignette" cx="50%" cy="48%" r="75%">
      <stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#3a2b18" stop-opacity="0.28"/></radialGradient>
    <radialGradient id="rgGlow"><stop offset="0" stop-color="#ffffff"/><stop offset="0.25" stop-color="#bcd8ff"/><stop offset="0.6" stop-color="#3d6dff" stop-opacity="0.45"/><stop offset="1" stop-color="#3d6dff" stop-opacity="0"/></radialGradient>
    <radialGradient id="rgGold"><stop offset="0" stop-color="#fffbe6"/><stop offset="0.3" stop-color="#ffd25a"/><stop offset="0.7" stop-color="#ff8a00" stop-opacity="0.4"/><stop offset="1" stop-color="#ff8a00" stop-opacity="0"/></radialGradient>
    <linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1f2fa8"/><stop offset="0.7" stop-color="#3a52e0"/><stop offset="1" stop-color="#cfe0ff"/></linearGradient>
    <linearGradient id="goldG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe9a6"/><stop offset="0.45" stop-color="#d8a134"/><stop offset="1" stop-color="#8a5a12"/></linearGradient>
    <linearGradient id="btnG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e48a68"/><stop offset="1" stop-color="#b8543a"/></linearGradient>
    <linearGradient id="barrel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/><stop offset="0.5" stop-color="#cdd6e4" stop-opacity="0.55"/><stop offset="1" stop-color="#8d9ab2" stop-opacity="0.7"/></linearGradient>
    <linearGradient id="grip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f8ff5"/><stop offset="0.5" stop-color="#2649d6"/><stop offset="1" stop-color="#162b8a"/></linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f2f2"/><stop offset="0.5" stop-color="#9a9a9a"/><stop offset="1" stop-color="#555"/></linearGradient>
  </defs>`;

  function glowFilter(id, c1, c2, r1, r2) {
    return `<filter id="${id}" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${r1}" result="b1"/>
      <feFlood flood-color="${c1}"/><feComposite in2="b1" operator="in" result="g1"/>
      <feGaussianBlur in="SourceAlpha" stdDeviation="${r2}" result="b2"/>
      <feFlood flood-color="${c2}"/><feComposite in2="b2" operator="in" result="g2"/>
      <feMerge><feMergeNode in="g1"/><feMergeNode in="g1"/><feMergeNode in="g2"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;
  }

  /* ---------------- helpers ---------------- */
  const P = (d, cls = 'ink', extra = '') => `<path class="${cls}" d="${d}" ${extra}/>`;
  const mirror = d => d.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (m, x, y) => `${-parseFloat(x)},${y}`);
  const g = (inner, attrs = '') => `<g ${attrs}>${inner}</g>`;
  const tr = (x, y, s = 1, r = 0) => `transform="translate(${x},${y}) rotate(${r}) scale(${s})"`;

  // organic watercolor blob: random closed curve around (cx,cy)
  function blobPath(cx, cy, rx, ry, seed = 1, wob = 0.28, n = 9) {
    const r = MV.rng(seed * 7919 + 13);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = 1 - wob / 2 + r() * wob;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    let d = '';
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      if (i === 0) d += `M${p1[0].toFixed(1)},${p1[1].toFixed(1)}`;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d + 'Z';
  }
  // a wash = several layered blobs in a color (pass array of [cx,cy,rx,ry,color,opacity])
  function wash(list, seed = 1, filter = 'wc') {
    return `<g filter="url(#${filter})">` + list.map((b, i) =>
      `<path d="${blobPath(b[0], b[1], b[2], b[3], seed + i, b[6] ?? 0.32)}" fill="${b[4]}" opacity="${b[5] ?? 0.55}"/>`).join('') + '</g>';
  }
  // ink splatter dots
  function splatter(cx, cy, spread, n, seed, color = C.indigo, maxR = 6) {
    const r = MV.rng(seed);
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * spread;
      s += `<circle cx="${(cx + Math.cos(a) * d).toFixed(1)}" cy="${(cy + Math.sin(a) * d * 0.8).toFixed(1)}" r="${(0.8 + r() * maxR * (1 - d / spread * 0.7)).toFixed(1)}" fill="${color}" opacity="${(0.4 + r() * 0.5).toFixed(2)}"/>`;
    }
    return `<g filter="url(#splat)">${s}</g>`;
  }
  // hatch strokes within a rough band (drawable)
  function hatchLines(x1, y1, x2, y2, n, len, ang = 38, cls = 'ink2 thin') {
    let s = '';
    const a = ang * Math.PI / 180;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      s += `<path class="${cls}" d="M${x.toFixed(1)},${y.toFixed(1)} l${(Math.cos(a) * len).toFixed(1)},${(Math.sin(a) * len).toFixed(1)}"/>`;
    }
    return s;
  }

  /* ---------------- background: wood + paper stack + paper ---------------- */
  function background() {
    return `
    <g id="bg">
      <rect width="720" height="1280" fill="#7a5532"/>
      <rect width="720" height="1280" filter="url(#woodGrain)"/>
      <g id="paperStack">
        <rect x="14" y="20" width="700" height="1262" rx="4" fill="#d9d1bf" transform="rotate(0.8 360 640)"/>
        <rect x="8" y="12" width="702" height="1262" rx="4" fill="#e2dac8" transform="rotate(-0.6 360 640)"/>
        <rect x="10" y="6" width="698" height="1264" rx="3" fill="${C.paper}" style="filter:drop-shadow(0 3px 6px rgba(0,0,0,.35))"/>
      </g>
      <g id="paperFull" style="opacity:0">
        <rect width="720" height="1280" fill="${C.paper}"/>
      </g>
      <rect width="720" height="1280" filter="url(#paperNoise)" opacity="0.9"/>
      <rect width="720" height="1280" filter="url(#paperFiber)" opacity="0.45"/>
    </g>`;
  }
  const vignette = () => `<rect width="720" height="1280" fill="url(#vignette)" pointer-events="none"/>`;

  /* ---------------- the blue ballpoint pen (bottom-right) ---------------- */
  function pen() {
    // drawn horizontally: tip at x=0 pointing left, cap end at x=360
    let ridges = '';
    for (let x = 34; x < 112; x += 7) ridges += `<line x1="${x}" y1="-11" x2="${x}" y2="11" stroke="#13207a" stroke-width="2" opacity="0.6"/>`;
    return `
    <g id="penWrap" transform="translate(470,1212) rotate(-50)">
      <g id="pen">
        <ellipse cx="185" cy="26" rx="190" ry="10" fill="#000" opacity="0.16" filter="url(#soft)"/>
        <path d="M0,0 L22,-6 L22,6 Z" fill="url(#metal)" stroke="#444" stroke-width="1"/>
        <circle cx="1" cy="0" r="1.6" fill="#222"/>
        <path d="M22,-8 L34,-12 L34,12 L22,8 Z" fill="#b8c3dc" stroke="#5a6a8c" stroke-width="1"/>
        <rect x="34" y="-12" width="80" height="24" rx="6" fill="url(#grip)" stroke="#0f1d6e" stroke-width="1.2"/>
        ${ridges}
        <path d="M114,-11 L330,-11 L330,11 L114,11 Z" fill="url(#barrel)" stroke="#7d8aa6" stroke-width="1.2"/>
        <line x1="114" y1="0" x2="324" y2="0" stroke="#2a46c8" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
        <line x1="118" y1="-6" x2="326" y2="-6" stroke="#fff" stroke-width="2" opacity="0.8"/>
        <path d="M330,-12 L356,-10 Q362,0 356,10 L330,12 Z" fill="url(#grip)" stroke="#0f1d6e" stroke-width="1.2"/>
      </g>
    </g>`;
  }

  /* ---------------- titles ---------------- */
  // handwritten title with underline. id prefix for animation hooks
  function title(id, text, y = 92, size = 40, underline = true, x = 360) {
    const w = Math.min(640, text.length * size * 0.5 + 30);
    return `<g id="${id}">
      <text id="${id}-t" x="${x}" y="${y}" class="title" font-size="${size}" text-anchor="middle">${text}</text>
      ${underline ? `<path id="${id}-u" class="ink thin" d="M${x - w / 2},${y + 18} C${x - w / 4},${y + 14} ${x + w / 4},${y + 20} ${x + w / 2},${y + 15}"/>` : ''}
    </g>`;
  }
  function flourish(id, x, y) {
    return `<path id="${id}" class="ink thin" d="M${x - 70},${y} C${x - 40},${y - 12} ${x - 20},${y + 10} ${x},${y} C${x + 10},${y - 10} ${x - 8},${y - 16} ${x - 10},${y - 6} C${x - 8},${y + 8} ${x + 30},${y + 8} ${x + 70},${y - 2}"/>`;
  }

  /* =========================================================================
     FACES & BUSTS (front view). Origin = centre of face. Face ~120w x 200h.
     opts: hair, head, beard, cloth, eyes ('open'|'closed'|'glow'|'stern'),
           skin, shade, age, statue (marble), dark (ink-heavy)
     ========================================================================= */
  function face(o = {}) {
    const skin = o.statue ? '#d7d3cc' : (o.skin || C.skin);
    const ink = o.dark ? C.dark : C.ink;
    const outline = 'M-60,-30 C-62,-80 -38,-108 0,-108 C38,-108 62,-80 60,-30 C58,10 50,45 30,72 C18,86 8,92 0,92 C-8,92 -18,86 -30,72 C-50,45 -58,10 -60,-30 Z';
    let s = '';
    // skin wash
    s += `<path class="fillwash" d="${outline}" fill="${skin}" opacity="${o.statue ? 0.7 : 0.75}"/>`;
    s += `<path class="fillwash" d="M20,-90 C50,-70 58,-20 52,20 C46,50 34,70 14,86 C30,40 34,-20 20,-90Z" fill="${o.statue ? '#9a97a6' : C.skinD}" opacity="0.6"/>`;
    // neck
    s += `<path class="fillwash" d="M-30,70 L-36,130 L36,130 L30,70 Z" fill="${skin}" opacity="0.7"/>`;
    s += `<path class="fillwash" d="M-30,72 L-34,108 C-10,98 10,98 34,108 L30,72 C14,90 -14,90 -30,72Z" fill="url(#hatch)" opacity="0.5"/>`;
    // outline + features
    s += P(outline, 'ink');
    s += P('M-60,-22 C-74,-28 -78,-6 -72,8 C-68,18 -62,20 -58,14');
    s += P(mirror('M-60,-22 C-74,-28 -78,-6 -72,8 C-68,18 -62,20 -58,14'));
    const browL = o.eyes === 'stern' || o.angry ? 'M-48,-44 C-36,-42 -22,-36 -10,-30' : 'M-48,-38 C-38,-47 -22,-47 -10,-40';
    s += P(browL, 'ink brow'); s += P(mirror(browL), 'ink brow');
    if (o.eyes === 'closed') {
      s += P('M-44,-19 C-36,-12 -20,-12 -12,-19'); s += P(mirror('M-44,-19 C-36,-12 -20,-12 -12,-19'));
      s += P('M-42,-26 C-34,-31 -22,-31 -14,-26', 'ink2 thin'); s += P(mirror('M-42,-26 C-34,-31 -22,-31 -14,-26'), 'ink2 thin');
    } else {
      const eyeL = 'M-44,-20 C-36,-30 -20,-30 -12,-20 C-20,-14 -36,-14 -44,-20 Z';
      s += `<path class="fillwash" d="${eyeL}" fill="#f6f1e8"/><path class="fillwash" d="${mirror(eyeL)}" fill="#f6f1e8"/>`;
      s += P(eyeL); s += P(mirror(eyeL));
      s += P('M-42,-27 C-34,-34 -20,-34 -14,-27', 'ink2 thin'); s += P(mirror('M-42,-27 C-34,-34 -20,-34 -14,-27'), 'ink2 thin');
      const ic = o.statue ? 'none' : '#5b3b22';
      s += `<g class="iris"><circle class="fillwash" cx="-28" cy="-21" r="6.5" fill="${ic}" stroke="${ink}" stroke-width="1.6"/><circle class="fillwash" cx="28" cy="-21" r="6.5" fill="${ic}" stroke="${ink}" stroke-width="1.6"/>
            <circle class="fillwash" cx="-28" cy="-21" r="3" fill="${o.statue ? 'none' : ink}"/><circle class="fillwash" cx="28" cy="-21" r="3" fill="${o.statue ? 'none' : ink}"/>
            <circle class="fillwash" cx="-26" cy="-23" r="1.4" fill="#fff"/><circle class="fillwash" cx="30" cy="-23" r="1.4" fill="#fff"/></g>`;
    }
    s += P('M-4,-14 C-6,4 -12,16 -13,25 C-9,32 -3,30 0,32 C3,30 9,32 13,25');
    s += P('M6,-10 C8,6 11,16 12,22', 'ink2 thin');
    if (o.angry) {
      s += P('M-22,58 C-8,50 8,50 22,58'); s += P('M-12,64 C-4,61 4,61 12,64', 'ink2 thin');
    } else if (o.smile) {
      s += P('M-22,50 C-10,60 10,60 22,50'); s += P('M-12,64 C-4,67 4,67 12,64', 'ink2 thin');
    } else {
      s += P('M-20,53 C-8,56 8,56 20,53'); s += P('M-12,63 C-4,66 4,66 12,63', 'ink2 thin');
    }
    // cheek shading hatch
    s += hatchLines(34, -6, 44, 40, 7, 14, 100);
    if (o.stubble) s += `<path class="fillwash" d="M-50,20 C-44,60 -20,88 0,90 C20,88 44,60 50,20 C40,46 20,70 0,72 C-20,70 -40,46 -50,20Z" fill="url(#hatchF)" opacity="0.35"/>`;
    return s;
  }

  function hair(type, o = {}) {
    const H = o.color || C.ink;
    switch (type) {
      case 'messy':
        return `<path class="fillwash" d="M-66,-36 C-78,-96 -42,-134 2,-130 C48,-134 80,-98 66,-34 C62,-58 54,-72 42,-80 C34,-64 16,-70 4,-84 C-8,-68 -30,-66 -42,-80 C-52,-68 -60,-54 -66,-36 Z" fill="${H}"/>` +
          P('M-66,-36 C-78,-96 -42,-134 2,-130 C48,-134 80,-98 66,-34') +
          P('M-40,-120 C-20,-110 -10,-96 -6,-82', 'ink2 thin hl') + P('M10,-124 C24,-110 30,-96 40,-80', 'ink2 thin hl') +
          P('M-60,-90 C-50,-84 -46,-76 -42,-62', 'ink2 thin hl') + P('M-6,-82 C-20,-74 -30,-60 -36,-48', 'ink thin');
      case 'neat':
        return `<path class="fillwash" d="M-64,-34 C-70,-96 -36,-122 4,-120 C46,-120 72,-92 64,-34 C60,-62 50,-80 30,-86 C10,-76 -24,-80 -44,-74 C-56,-64 -62,-52 -64,-34Z" fill="${H}"/>` +
          P('M-64,-34 C-70,-96 -36,-122 4,-120 C46,-120 72,-92 64,-34') + P('M-30,-110 C-10,-104 20,-98 40,-84', 'ink2 thin hl');
      case 'topknot':
        return `<path class="fillwash" d="M-62,-40 C-66,-96 -36,-116 0,-116 C36,-116 66,-96 62,-40 C56,-70 30,-92 0,-92 C-30,-92 -56,-70 -62,-40Z" fill="${H}"/>
          <ellipse class="fillwash" cx="0" cy="-130" rx="18" ry="16" fill="${H}"/>` +
          P('M-62,-40 C-66,-96 -36,-116 0,-116 C36,-116 66,-96 62,-40') + `<ellipse class="ink" cx="0" cy="-130" rx="18" ry="16"/>` +
          P('M-10,-116 L10,-116', 'ink thick') + P('M-58,-50 C-66,-30 -70,-6 -64,20', 'ink thin') + P('M58,-50 C66,-30 70,-6 64,20', 'ink thin');
      case 'curly': {
        let s = `<path class="fillwash" d="M-70,-30 C-80,-100 -40,-136 0,-134 C40,-136 80,-100 70,-30 C60,-70 30,-90 0,-90 C-30,-90 -60,-70 -70,-30Z" fill="${o.statue ? '#bdb8b2' : '#4b4038'}" opacity="0.8"/>`;
        const r = MV.rng(77);
        for (let i = 0; i < 26; i++) {
          const a = Math.PI * (1.05 + 0.9 * (i / 25));
          const rr = 92 + r() * 30, x = Math.cos(a) * rr * 0.78, y = -40 + Math.sin(a) * rr * 0.92;
          s += `<path class="ink thin" d="M${(x - 7).toFixed(1)},${y.toFixed(1)} c0,-9 14,-9 14,0 c0,7 -9,8 -9,2"/>`;
        }
        return s;
      }
      default: return '';
    }
  }

  function beard(statue) {
    let s = `<path class="fillwash" d="M-60,-8 C-60,40 -42,96 0,118 C42,96 60,40 60,-8 C52,26 34,44 20,44 C10,38 -10,38 -20,44 C-34,44 -52,26 -60,-8Z" fill="${statue ? '#bdb8b2' : '#4b4038'}" opacity="0.85"/>`;
    s += P('M-60,-8 C-60,40 -42,96 0,118 C42,96 60,40 60,-8');
    s += P('M-26,46 C-14,40 14,40 26,46', 'ink'); // moustache line
    const r = MV.rng(31);
    for (let i = 0; i < 22; i++) {
      const x = -48 + r() * 96, y = 20 + r() * 80 * (1 - Math.abs(x) / 70);
      s += `<path class="ink thin" d="M${(x - 6).toFixed(1)},${y.toFixed(1)} c0,-8 12,-8 12,0 c0,6 -8,7 -8,1"/>`;
    }
    return s;
  }

  function laurel(o = {}) {
    let s = '';
    const col = o.gold ? C.gold : '#6e8a4e';
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 8; i++) {
        const a = Math.PI * (side < 0 ? (1.0 + i * 0.07) : (2.0 - i * 0.07));
        const x = Math.cos(a) * 70, y = -46 + Math.sin(a) * 74;
        const rot = (a * 180 / Math.PI) + (side < 0 ? -60 : 60);
        s += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)})"><path class="ink" d="M0,0 C6,-8 18,-8 24,0 C18,8 6,8 0,0Z" fill="${col}" fill-opacity="0.55"/><path class="ink2 thin" d="M2,0 L20,0"/></g>`;
      }
    }
    return s;
  }

  function helmet(type) {
    switch (type) {
      case 'crest': // Greek/Roman galea with crest + cheek guards
        return `<path class="fillwash" d="M-70,-28 C-74,-104 -40,-136 0,-136 C40,-136 74,-104 70,-28 L70,30 C62,40 52,44 44,40 L42,-20 C30,-30 -30,-30 -42,-20 L-44,40 C-52,44 -62,40 -70,30Z" fill="${C.steel}" opacity="0.55"/>` +
          P('M-70,-28 C-74,-104 -40,-136 0,-136 C40,-136 74,-104 70,-28 L70,30 C62,40 52,44 44,40 L42,-20 C30,-30 -30,-30 -42,-20 L-44,40 C-52,44 -62,40 -70,30Z') +
          P('M-72,-36 C-30,-52 30,-52 72,-36', 'ink') + P('M-60,-90 C-30,-110 30,-110 60,-90', 'ink2 thin') +
          `<path class="fillwash" d="M-58,-120 C-40,-200 40,-200 70,-118 C40,-150 -30,-150 -58,-120Z" fill="${C.storm}" opacity="0.8"/>` +
          P('M-58,-120 C-40,-200 40,-200 70,-118') + hatchLines(-46, -140, 56, -140, 16, 34, -80, 'ink thin') +
          hatchLines(46, -90, 62, 20, 8, 14, 110);
      case 'spike': // conical with spike + nasal + mail aventail
        return `<path class="fillwash" d="M-66,-30 C-66,-90 -36,-122 0,-130 C36,-122 66,-90 66,-30 Z" fill="${C.steel}" opacity="0.6"/>` +
          P('M-66,-30 C-66,-90 -36,-122 0,-130 C36,-122 66,-90 66,-30 Z') + P('M0,-130 L0,-168', 'ink thick') +
          P('M-4,-30 L-4,8 L4,8 L4,-30', 'ink') +
          `<path class="fillwash" d="M-66,-30 L-72,70 C-40,96 40,96 72,70 L66,-30 L52,-30 L50,40 C30,60 -30,60 -50,40 L-52,-30Z" fill="url(#mail)" opacity="0.9"/>` +
          P('M-66,-30 L-72,70 C-40,96 40,96 72,70 L66,-30') + hatchLines(30, -110, 60, -40, 8, 26, 100);
      case 'bicorne':
        return `<path class="fillwash" d="M-130,-66 C-96,-90 -50,-160 0,-160 C50,-160 96,-90 130,-66 C70,-96 -70,-96 -130,-66Z" fill="${C.dark}"/>` +
          P('M-130,-66 C-96,-90 -50,-160 0,-160 C50,-160 96,-90 130,-66 C70,-96 -70,-96 -130,-66Z') +
          `<circle cx="-62" cy="-100" r="11" fill="${C.storm}" stroke="${C.ink}" stroke-width="2"/>` +
          P('M-110,-74 C-70,-100 70,-100 110,-74', 'ink2 thin hl');
      default: return '';
    }
  }

  function clothes(type, o = {}) {
    const shoulders = 'M-36,126 C-80,138 -150,148 -176,192 C-190,216 -196,262 -200,320';
    let s = '';
    const body = `M-36,126 C-80,138 -150,148 -176,192 C-190,216 -196,262 -200,320 L200,320 C196,262 190,216 176,192 C150,148 80,138 36,126 Z`;
    switch (type) {
      case 'tunic':
        s += `<path class="fillwash" d="${body}" fill="#e8e3da" opacity="0.9"/>`;
        s += `<path class="fillwash" d="M60,140 C100,150 160,170 190,240 L200,320 L120,320 C120,260 100,190 60,140Z" fill="${C.lav}" opacity="0.45"/>`;
        s += P(shoulders) + P(mirror(shoulders)) + P('M-40,128 L0,190 L40,128', 'ink') +
          P('M-12,150 L12,158 M-14,166 L14,172 M-12,180 L8,184', 'ink thin') +
          `<path class="fillwash" d="M-120,150 L-96,140 L150,320 L118,320Z" fill="${C.rust}" opacity="0.75"/>` + P('M-120,150 L118,320 M-96,140 L150,320') +
          P('M-150,240 C-140,270 -150,300 -146,320', 'ink2 thin') + P('M120,210 C130,250 128,290 132,320', 'ink2 thin');
        break;
      case 'uniform':
        s += `<path class="fillwash" d="${body}" fill="#3d4258"/>`;
        s += P(shoulders) + P(mirror(shoulders)) +
          `<path class="fillwash" d="M-36,112 L-40,150 L0,170 L40,150 L36,112Z" fill="#2c2f40"/>` + P('M-36,112 L-40,150 L0,170 L40,150 L36,112') +
          `<path class="fillwash" d="M-170,180 C-150,150 -110,146 -96,160 L-120,200 Z" fill="${C.gold}" opacity="0.8"/><path class="fillwash" d="${mirror('M-170,180 C-150,150 -110,146 -96,160 L-120,200 Z')}" fill="${C.gold}" opacity="0.8"/>` +
          P('M-170,180 C-150,150 -110,146 -96,160') + P(mirror('M-170,180 C-150,150 -110,146 -96,160')) +
          P('M0,170 L-50,320 M0,170 L50,320', 'ink') +
          [190, 220, 250, 280].map(y => `<circle cx="${-14 - (y - 170) * 0.25}" cy="${y}" r="4" fill="${C.gold}" stroke="${C.ink}"/><circle cx="${14 + (y - 170) * 0.25}" cy="${y}" r="4" fill="${C.gold}" stroke="${C.ink}"/>`).join('') +
          hatchLines(-180, 200, -60, 320, 18, 30, 60);
        break;
      case 'armor':
        s += `<path class="fillwash" d="${body}" fill="${C.steel}" opacity="0.6"/>`;
        s += P(shoulders) + P(mirror(shoulders)) +
          `<path class="fillwash" d="M-190,210 C-180,160 -120,140 -80,160 C-100,190 -120,220 -130,250 C-150,240 -170,232 -190,210Z" fill="${C.storm}" opacity="0.7"/><path class="fillwash" d="${mirror('M-190,210 C-180,160 -120,140 -80,160 C-100,190 -120,220 -130,250 C-150,240 -170,232 -190,210Z')}" fill="${C.storm}" opacity="0.7"/>` +
          P('M-190,210 C-180,160 -120,140 -80,160 C-100,190 -120,220 -130,250') + P(mirror('M-190,210 C-180,160 -120,140 -80,160 C-100,190 -120,220 -130,250')) +
          P('M-60,180 C-30,200 30,200 60,180 M-70,230 C-30,250 30,250 70,230 M-74,280 C-30,300 30,300 74,280', 'ink') +
          P('M0,170 L0,320', 'ink2 thin') + hatchLines(-200, 260, -90, 320, 14, 30, 60);
        break;
      case 'toga':
        s += `<path class="fillwash" d="${body}" fill="#dcd7cf" opacity="0.9"/>`;
        s += P(shoulders) + P(mirror(shoulders)) +
          P('M-176,192 C-100,200 -20,240 40,320', 'ink') + P('M-150,170 C-80,190 0,220 70,300', 'ink2 thin') +
          P('M-120,160 C-60,170 10,200 100,270', 'ink2 thin') + P('M40,130 C80,180 110,220 150,320', 'ink') +
          hatchLines(60, 200, 170, 300, 14, 26, 70);
        break;
      case 'gi':
        s += `<path class="fillwash" d="${body}" fill="#4a5486" opacity="0.8"/>`;
        s += P(shoulders) + P(mirror(shoulders)) + P('M-40,126 L30,320 M40,126 L-10,250', 'ink') +
          P('M-56,132 L10,320', 'ink2 thin') + hatchLines(-190, 230, -60, 320, 14, 30, 60);
        break;
      case 'tee':
        s += `<path class="fillwash" d="${body}" fill="#7e6d5c" opacity="0.65"/>`;
        s += P(shoulders) + P(mirror(shoulders)) + P('M-40,126 C-20,150 20,150 40,126', 'ink') + hatchLines(-190, 230, -70, 320, 12, 30, 60);
        break;
      case 'robe':
        s += `<path class="fillwash" d="${body}" fill="#2b2a3a"/>`;
        s += `<path class="fillwash" d="M-176,192 C-100,200 -20,240 40,320 L-200,320 C-196,262 -190,216 -176,192Z" fill="#3d3a52" opacity="0.9"/>`;
        s += P(shoulders) + P(mirror(shoulders)) +
          P('M-176,192 C-100,200 -20,240 40,320', 'ink2 thin hl') + P('M-150,170 C-80,190 0,220 70,300', 'ink2 thin hl') +
          P('M40,130 C80,180 110,220 150,320', 'ink2 thin hl') + P('M-40,128 C-20,146 20,146 40,128', 'ink2 thin hl') +
          `<path class="fillwash" d="M-36,126 C-20,140 20,140 36,126 L40,134 C20,150 -20,150 -40,134Z" fill="${C.gold}" opacity="0.8"/>`;
        break;
      case 'bandhgala':
        s += `<path class="fillwash" d="${body}" fill="#1f1f2a"/>`;
        s += `<path class="fillwash" d="${body}" fill="url(#cross)" opacity="0.35"/>`;
        s += P(shoulders) + P(mirror(shoulders)) +
          `<path class="fillwash" d="M-38,108 L-40,136 C-14,146 14,146 40,136 L38,108 C14,118 -14,118 -38,108Z" fill="#14141c"/>` +
          P('M-40,136 C-14,146 14,146 40,136', 'ink2 thin hl') + P('M0,144 L0,320', 'ink2 thin hl') +
          [170, 205, 240, 275, 310].map(y => `<circle cx="0" cy="${y}" r="5" fill="#3b3b4a" stroke="#888" stroke-width="1"/>`).join('') +
          P('M60,240 L120,236', 'ink2 thin hl');
        break;
    }
    return s;
  }

  // full bust = clothes + face + hair/helmet + beard
  function bust(o = {}) {
    let s = '';
    s += clothes(o.cloth || 'tunic', o);
    s += face(o);
    if (o.beard) s += beard(o.statue);
    if (o.hair) s += hair(o.hair, o);
    if (o.laurel) s += laurel(o);
    if (o.helmet) s += helmet(o.helmet);
    if (o.statue) s += `<path class="fillwash" d="M-200,320 L200,320 L200,300 L-200,300Z" fill="none"/>`;
    return s;
  }

  /* ---------------- profile face (facing right) ---------------- */
  function profile(o = {}) {
    const out = 'M-40,-110 C10,-120 50,-100 58,-50 C60,-36 62,-26 70,-6 C74,2 72,6 62,8 C64,18 62,26 56,30 C60,36 58,44 50,48 C50,62 40,80 18,84 C0,86 -20,82 -34,72';
    let s = `<path class="fillwash" d="${out} L-60,60 L-70,-80 Z" fill="${C.skin}" opacity="0.75"/>`;
    s += `<path class="fillwash" d="M-80,-60 C-110,-130 -10,-150 40,-110 C54,-96 56,-80 54,-66 C40,-92 20,-98 0,-96 C-20,-84 -30,-64 -36,-44 L-60,-30 C-74,-20 -86,-30 -80,-60Z" fill="${C.ink}"/>`;
    s += P(out) + P('M-34,72 L-30,140') + P('M30,82 L36,140');
    s += P('M14,-38 C24,-44 36,-44 44,-38', 'ink brow');
    s += `<path class="fillwash" d="M24,-24 C30,-30 40,-30 46,-22 C40,-18 30,-18 24,-24Z" fill="#f6f1e8"/>` + P('M24,-24 C30,-30 40,-30 46,-22 C40,-18 30,-18 24,-24Z');
    s += `<circle class="iris fillwash" cx="38" cy="-24" r="4" fill="#4a3a7a" stroke="${C.ink}"/>`;
    s += P('M-30,-40 C-40,-20 -40,0 -32,14 C-24,22 -16,10 -20,-6', 'ink') + P('M40,22 C48,26 54,26 58,28', 'ink2 thin');
    s += hatchLines(-20, 0, 10, 60, 8, 16, 120);
    return s;
  }

  /* =========================================================================
     FULL-BODY FIGURES — stylised standing figure, origin at feet centre.
     Height ~ 560 at scale 1. kind: 'warrior' | 'knight' | 'gladiator' | 'samurai' | 'traveller'
     ========================================================================= */
  function figure(kind, o = {}) {
    let s = '';
    const armorFill = kind === 'gladiator' ? '#a86a3c' : (kind === 'samurai' ? '#4a5486' : (kind === 'traveller' ? '#e3ddd2' : C.steel));
    // legs
    const legL = 'M-40,-250 L-52,-120 L-56,-10 L-20,-10 L-18,-120 L-6,-240';
    const legR = 'M6,-240 L18,-120 L22,-10 L58,-10 L52,-120 L40,-250';
    const legFill = kind === 'gladiator' ? C.skin : (kind === 'traveller' ? '#cfc6b6' : '#4a4f66');
    s += `<path class="fillwash" d="${legL}Z" fill="${legFill}" opacity="0.8"/><path class="fillwash" d="${legR}Z" fill="${legFill}" opacity="0.8"/>`;
    s += P(legL) + P(legR);
    // boots
    const bootFill = kind === 'traveller' ? '#7a5534' : '#3d3328';
    s += `<path class="fillwash" d="M-60,-80 L-56,-10 L-62,0 L-14,0 L-18,-80Z" fill="${bootFill}"/><path class="fillwash" d="M18,-80 L22,-10 L18,0 L66,0 L56,-80Z" fill="${bootFill}"/>`;
    s += P('M-60,-80 L-56,-10 L-62,0 L-14,0 L-18,-80') + P('M18,-80 L22,-10 L18,0 L66,0 L56,-80');
    if (kind === 'gladiator') s += hatchLines(-56, -76, -20, -76, 5, 70, 90, 'ink thin') + hatchLines(20, -76, 54, -76, 5, 70, 90, 'ink thin');
    // skirt / tasset
    const skirt = 'M-70,-300 L-84,-200 L86,-200 L70,-300Z';
    s += `<path class="fillwash" d="${skirt}" fill="${armorFill}" opacity="0.75"/>` + P(skirt);
    for (let x = -60; x <= 60; x += 24) s += P(`M${x},-298 L${x * 1.2},-202`, 'ink2 thin');
    // torso
    const torso = 'M-78,-470 C-90,-420 -84,-350 -70,-300 L70,-300 C84,-350 90,-420 78,-470 C40,-486 -40,-486 -78,-470Z';
    s += `<path class="fillwash" d="${torso}" fill="${armorFill}" opacity="0.85"/>` + P(torso);
    if (kind === 'gladiator') s += P('M-50,-430 C-30,-410 -10,-410 0,-420 C10,-410 30,-410 50,-430 M-40,-380 C-20,-370 20,-370 40,-380 M-36,-340 C-20,-332 20,-332 36,-340 M0,-420 L0,-310', 'ink');
    else if (kind === 'knight' || kind === 'warrior') s += `<path class="fillwash" d="${torso}" fill="url(#mail)" opacity="0.5"/>` + P('M-60,-420 C-20,-400 20,-400 60,-420 M-66,-360 C-20,-344 20,-344 66,-360', 'ink');
    else if (kind === 'samurai') s += P('M-40,-476 L30,-300 M40,-476 L-10,-380', 'ink') + `<path class="fillwash" d="M-74,-330 L74,-330 L72,-306 L-72,-306Z" fill="${C.dark}"/>`;
    else s += P('M-30,-476 L0,-430 L30,-476', 'ink') + `<path class="fillwash" d="M-70,-470 L-50,-476 L74,-310 L52,-306Z" fill="${C.rust}" opacity="0.8"/>`;
    s += hatchLines(40, -460, 70, -320, 10, 24, 100);
    // belt
    s += `<path class="fillwash" d="M-72,-312 L72,-312 L70,-292 L-70,-292Z" fill="#5b3f26"/>` + P('M-72,-312 L72,-312 M-70,-292 L70,-292');
    // pauldrons
    if (kind !== 'traveller' && kind !== 'samurai') {
      const pl = 'M-78,-470 C-120,-470 -130,-430 -124,-400 C-104,-410 -88,-420 -76,-440Z';
      s += `<path class="fillwash" d="${pl}" fill="${armorFill}"/><path class="fillwash" d="${mirror(pl)}" fill="${armorFill}"/>` + P(pl) + P(mirror(pl));
    }
    // arms (down, slightly out)
    const armL = o.armL || 'M-82,-450 C-110,-420 -118,-360 -120,-300 L-96,-296 C-92,-350 -86,-400 -70,-430';
    const armR = o.armR || mirror('M-82,-450 C-110,-420 -118,-360 -120,-300 L-96,-296 C-92,-350 -86,-400 -70,-430');
    const armFill = kind === 'gladiator' ? C.skin : armorFill;
    s += `<path class="fillwash" d="${armL}Z" fill="${armFill}" opacity="0.8"/><path class="fillwash" d="${armR}Z" fill="${armFill}" opacity="0.8"/>`;
    s += P(armL) + P(armR);
    s += `<circle class="fillwash" cx="${o.handL ? o.handL[0] : -108}" cy="${o.handL ? o.handL[1] : -290}" r="14" fill="${C.skin}"/>` + `<circle class="ink" cx="${o.handL ? o.handL[0] : -108}" cy="${o.handL ? o.handL[1] : -290}" r="14"/>`;
    s += `<circle class="fillwash" cx="${o.handR ? o.handR[0] : 108}" cy="${o.handR ? o.handR[1] : -290}" r="14" fill="${C.skin}"/>` + `<circle class="ink" cx="${o.handR ? o.handR[0] : 108}" cy="${o.handR ? o.handR[1] : -290}" r="14"/>`;
    // cape
    if (o.cape) s = `<path class="fillwash" d="M-80,-470 C-140,-350 -150,-200 -130,-60 L-60,-120 L60,-120 L130,-60 C150,-200 140,-350 80,-470Z" fill="${o.cape}" opacity="0.7"/>` + s;
    // neck + head
    s += `<path class="fillwash" d="M-18,-500 L-20,-472 L20,-472 L18,-500Z" fill="${C.skin}"/>`;
    s += `<g transform="translate(0,-548) scale(0.42)"><g ${o.headId ? `id="${o.headId}" data-origin="center bottom"` : ''}>${face({ eyes: o.eyes || 'stern', skin: o.skin })}${o.hair ? hair(o.hair) : ''}${o.helmet ? helmet(o.helmet) : ''}</g></g>`;
    return s;
  }

  /* ---------------- props ---------------- */
  function sword(len = 300) {
    return `<path class="fillwash" d="M-7,0 L-7,-${len} L0,-${len + 26} L7,-${len} L7,0Z" fill="#cfd3dc"/>` +
      P(`M-7,0 L-7,-${len} L0,-${len + 26} L7,-${len} L7,0`) + P(`M0,-10 L0,-${len}`, 'ink2 thin') +
      `<path class="fillwash" d="M-40,0 L40,0 L40,12 L-40,12Z" fill="#6b5034"/>` + P('M-40,0 L40,0 L40,12 L-40,12Z') +
      `<path class="fillwash" d="M-6,12 L6,12 L6,70 L-6,70Z" fill="#4a3424"/>` + P('M-6,12 L6,12 L6,70 L-6,70Z') + `<circle class="ink" cx="0" cy="78" r="9" fill="${C.gold}"/>`;
  }
  function katana(len = 380) {
    return `<path class="fillwash" d="M0,0 C${len * 0.3},-14 ${len * 0.7},-26 ${len},-46 C${len * 0.7},-18 ${len * 0.3},-4 0,8Z" fill="#e6ebf5"/>` +
      P(`M0,0 C${len * 0.3},-14 ${len * 0.7},-26 ${len},-46 C${len * 0.7},-18 ${len * 0.3},-4 0,8`) +
      `<ellipse class="ink" cx="-4" cy="4" rx="6" ry="20" fill="${C.gold}"/>` + `<path class="fillwash" d="M-8,0 L-110,10 L-110,24 L-8,10Z" fill="${C.dark}"/>` + P('M-8,0 L-110,10 L-110,24 L-8,10');
  }
  function shield() {
    const d = 'M-80,-110 L80,-110 C82,-20 60,60 0,110 C-60,60 -82,-20 -80,-110Z';
    return `<path class="fillwash" d="${d}" fill="#b9bfcd"/>` + `<path class="fillwash" d="M-60,-90 L60,-90 C60,-20 44,40 0,84 C-44,40 -60,-20 -60,-90Z" fill="${C.indigo}" opacity="0.55"/>` +
      P(d) + P('M-60,-90 L60,-90 C60,-20 44,40 0,84 C-44,40 -60,-20 -60,-90Z', 'ink2 thin') +
      P('M0,-90 L0,84 M-60,-20 L60,-20', 'ink') + `<circle class="ink" cx="0" cy="-20" r="20" fill="${C.gold}" fill-opacity="0.7"/>` +
      hatchLines(20, -100, 60, 40, 10, 30, 110);
  }
  function hourglass(fillTop = 0.6, fillBot = 0.4) {
    return `<g class="hourglass">
      <path class="fillwash" d="M-50,-110 L50,-110 L50,-100 L-50,-100Z M-50,100 L50,100 L50,110 L-50,110Z" fill="#6b5034"/>
      <path class="fillwash" d="M-40,-100 C-40,-30 -6,-14 -6,0 C-6,14 -40,30 -40,100 L40,100 C40,30 6,14 6,0 C6,-14 40,-30 40,-100Z" fill="#eef1f6" opacity="0.6"/>
      <path class="sandTop fillwash" d="M-30,-60 C-28,-30 -6,-14 0,-4 C6,-14 28,-30 30,-60Z" fill="${C.indigo}"/>
      <path class="sandBot fillwash" d="M-38,98 C-30,70 -10,54 0,52 C10,54 30,70 38,98Z" fill="${C.indigo}"/>
      <line class="sandStream" x1="0" y1="-2" x2="0" y2="96" stroke="${C.indigo}" stroke-width="2"/>
      ${P('M-50,-110 L50,-110 L50,-100 L-50,-100Z M-50,100 L50,100 L50,110 L-50,110Z')}
      ${P('M-40,-100 C-40,-30 -6,-14 -6,0 C-6,14 -40,30 -40,100 M40,-100 C40,-30 6,-14 6,0 C6,14 40,30 40,100')}
      ${P('M-46,-100 L-46,100 M46,-100 L46,100', 'ink thick')}
    </g>`;
  }
  function chessPiece(type, white = false) {
    const fill = white ? '#efe9dc' : C.dark;
    const base = `<path class="fillwash" d="M-16,0 L16,0 L14,-8 L-14,-8Z" fill="${fill}"/>` + P('M-16,0 L16,0 L14,-8 L-14,-8Z');
    let body = '';
    if (type === 'pawn') body = `<path class="fillwash" d="M-10,-8 C-8,-20 -4,-26 -6,-32 L6,-32 C4,-26 8,-20 10,-8Z" fill="${fill}"/><circle class="ink" cx="0" cy="-38" r="8" fill="${fill}"/>` + P('M-10,-8 C-8,-20 -4,-26 -6,-32 L6,-32 C4,-26 8,-20 10,-8');
    if (type === 'knight') body = `<path class="fillwash" d="M-12,-8 C-12,-30 -16,-44 -6,-58 C4,-66 16,-56 18,-44 L8,-42 C10,-30 12,-20 12,-8Z" fill="${fill}"/>` + P('M-12,-8 C-12,-30 -16,-44 -6,-58 C4,-66 16,-56 18,-44 L8,-42 C10,-30 12,-20 12,-8');
    if (type === 'king') body = `<path class="fillwash" d="M-11,-8 C-9,-30 -6,-46 -9,-56 L9,-56 C6,-46 9,-30 11,-8Z" fill="${fill}"/>` + P('M-11,-8 C-9,-30 -6,-46 -9,-56 L9,-56 C6,-46 9,-30 11,-8 M0,-56 L0,-72 M-6,-66 L6,-66');
    if (type === 'rook') body = `<path class="fillwash" d="M-11,-8 L-9,-40 L-13,-40 L-13,-52 L13,-52 L13,-40 L9,-40 L11,-8Z" fill="${fill}"/>` + P('M-11,-8 L-9,-40 L-13,-40 L-13,-52 L13,-52 L13,-40 L9,-40 L11,-8');
    return base + body;
  }
  function chessboard() {
    // perspective board: 8x8, near edge wide
    let s = '';
    const top = 0, bot = 230, wTop = 420, wBot = 760;
    const pt = (u, v) => { const w = wTop + (wBot - wTop) * v; return [(u - 0.5) * w, top + (bot - top) * (v * (1 + 0.15 * (1 - v)) / 1.0)]; };
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      if ((i + j) % 2) continue;
      const a = pt(i / 8, j / 8), b = pt((i + 1) / 8, j / 8), c = pt((i + 1) / 8, (j + 1) / 8), d = pt(i / 8, (j + 1) / 8);
      s += `<path class="fillwash" d="M${a} L${b} L${c} L${d}Z" fill="url(#cross)" opacity="0.95"/>`;
    }
    for (let i = 0; i <= 8; i++) { const a = pt(i / 8, 0), b = pt(i / 8, 1); s += `<path class="ink thin" d="M${a} L${b}"/>`; }
    for (let j = 0; j <= 8; j++) { const a = pt(0, j / 8), b = pt(1, j / 8); s += `<path class="ink thin" d="M${a} L${b}"/>`; }
    return { svg: s, pt };
  }
  function scroll(w = 330) {
    const h = 56;
    return `<path class="fillwash" d="M${-w / 2},${-h / 2} L${w / 2},${-h / 2} L${w / 2},${h / 2} L${-w / 2},${h / 2}Z" fill="#efeae0"/>` +
      `<path class="fillwash" d="M${-w / 2},${-h / 2} L${w / 2},${-h / 2} L${w / 2},${-h / 2 + 12} L${-w / 2},${-h / 2 + 12}Z" fill="${C.lav}" opacity="0.4"/>` +
      P(`M${-w / 2},${-h / 2} L${w / 2},${-h / 2} M${-w / 2},${h / 2} L${w / 2},${h / 2}`) +
      [-1, 1].map(sd => `<ellipse class="ink" cx="${sd * w / 2}" cy="0" rx="14" ry="${h / 2 + 4}" fill="#e2dccf"/><path class="ink" d="M${sd * (w / 2 + 12)},-6 L${sd * (w / 2 + 40)},-6 L${sd * (w / 2 + 40)},6 L${sd * (w / 2 + 12)},6"/><circle class="ink" cx="${sd * (w / 2 + 50)}" cy="0" r="11" fill="#9aa0b3"/>`).join('') +
      hatchLines(-w / 2 + 20, -h / 2 + 4, w / 2 - 40, -h / 2 + 4, 14, 10, 80, 'ink2 thin');
  }
  function padlock() {
    return `<path class="ink thick" d="M-40,-20 L-40,-60 C-40,-110 40,-110 40,-60 L40,-20" fill="none" stroke="url(#goldG)" stroke-width="16"/>` +
      `<rect x="-62" y="-24" width="124" height="104" rx="14" fill="url(#goldG)" stroke="#6a440c" stroke-width="3"/>` +
      `<circle cx="0" cy="20" r="14" fill="#5a3a0a"/><path d="M-6,24 L6,24 L4,52 L-4,52Z" fill="#5a3a0a"/>`;
  }
  function trophy() {
    return `<path class="fillwash" d="M-50,-90 L50,-90 C50,-30 30,0 0,8 C-30,0 -50,-30 -50,-90Z" fill="url(#goldG)"/>` +
      P('M-50,-90 L50,-90 C50,-30 30,0 0,8 C-30,0 -50,-30 -50,-90Z') +
      P('M-50,-74 C-80,-74 -80,-30 -40,-24 M50,-74 C80,-74 80,-30 40,-24', 'ink thick') +
      `<path class="fillwash" d="M-8,8 L8,8 L12,40 L-12,40Z M-30,40 L30,40 L34,62 L-34,62Z" fill="url(#goldG)"/>` + P('M-8,8 L8,8 L12,40 L-12,40Z M-30,40 L30,40 L34,62 L-34,62Z') +
      P('M-30,-80 C-30,-50 -20,-30 -10,-20', 'ink2 thin hl');
  }
  function mask() {
    return `<path class="fillwash" d="M-60,-80 C-20,-96 20,-96 60,-80 C66,-20 50,50 0,80 C-50,50 -66,-20 -60,-80Z" fill="${C.dark}"/>` +
      P('M-60,-80 C-20,-96 20,-96 60,-80 C66,-20 50,50 0,80 C-50,50 -66,-20 -60,-80Z') +
      `<path d="M-42,-34 L-14,-22 L-16,-12 L-44,-20Z M42,-34 L14,-22 L16,-12 L44,-20Z" fill="#f2efe8"/>` +
      `<path d="M-26,40 C-10,24 10,24 26,40 C10,34 -10,34 -26,40Z" fill="#f2efe8"/>` +
      P('M-46,-52 L-10,-36 M46,-52 L10,-36', 'ink2 thin hl');
  }
  function arrow(len = 150) {
    return `<path class="ink" d="M0,0 L${len},0" stroke-width="4"/><path d="M${len},0 L${len - 22},-9 L${len - 18},0 L${len - 22},9Z" fill="${C.ink}"/>` +
      `<path d="M0,0 L-14,-10 L6,0 L-14,10Z" fill="${C.ink2}"/>`;
  }
  function mountain() {
    const d = 'M-260,200 L-150,40 L-110,70 L-30,-160 L0,-210 L30,-150 L80,-60 L120,-80 L260,200Z';
    let s = wash([[0, 40, 230, 170, C.lav, 0.55], [60, -40, 120, 140, C.indigo, 0.45], [-120, 120, 140, 80, C.slate, 0.4]], 40);
    s += `<path class="fillwash" d="${d}" fill="#d9d8e8" opacity="0.6"/>`;
    s += P(d) + P('M0,-210 L-20,-100 L-60,10 L-80,120 M0,-210 L30,-80 L20,40 L60,160', 'ink') +
      P('M-30,-160 L-60,-60 M30,-150 L50,-90 M-150,40 L-170,140', 'ink2 thin');
    s += hatchLines(10, -180, 120, 120, 26, 60, 120);
    s += hatchLines(-100, 80, -40, -100, 12, 50, 70, 'ink2 thin');
    return s;
  }
  function stairs(n = 7, w = 70, h = 36, brick = false) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = i * w * 0.7, y = -i * h;
      s += `<path class="fillwash" d="M${x},${y} L${x + w * 1.6},${y} L${x + w * 1.6},${y + h} L${x},${y + h}Z" fill="${brick ? 'url(#brick)' : '#e9e4da'}"/>`;
      s += `<path class="ink" d="M${x},${y} L${x + w * 1.6},${y} L${x + w * 1.6},${y + h} L${x},${y + h}Z"/>`;
      s += `<path class="ink2 thin" d="M${x},${y} L${x + 20},${y - 16} L${x + w * 1.6 + 20},${y - 16} L${x + w * 1.6},${y}"/>`;
    }
    return s;
  }
  function cloud(cx, cy, s = 1, seed = 1) {
    return `<g transform="translate(${cx},${cy}) scale(${s})">${wash([[0, 0, 90, 34, C.lav, 0.5]], seed, 'wc2')}<path class="ink thin" d="M-80,10 C-90,-14 -60,-30 -40,-20 C-30,-44 10,-44 20,-24 C40,-36 76,-20 70,6"/></g>`;
  }
  function lightning(x, y, len = 220, seed = 1) {
    const r = MV.rng(seed);
    let d = `M${x},${y}`, cx = x, cy = y;
    const steps = 7;
    for (let i = 0; i < steps; i++) { cx += (r() - 0.5) * 50; cy += len / steps; d += ` L${cx.toFixed(1)},${cy.toFixed(1)}`; }
    return `<path d="${d}" fill="none" stroke="#e8f0ff" stroke-width="3" filter="url(#glowBlue)" class="bolt"/>`;
  }
  function hand() {
    // hand reaching from the right, pinching
    const d = 'M200,40 L90,30 C70,28 50,20 34,10 C20,2 6,-4 -6,-2 C-12,0 -12,8 -4,10 C10,12 22,16 30,22 C18,22 4,24 -6,28 C-14,32 -10,40 0,38 C14,36 28,36 40,40 C46,52 60,62 90,66 L200,74Z';
    return `<path class="fillwash" d="${d}" fill="#f2ece2"/>` + P(d) + `<path class="fillwash" d="M200,30 L120,26 L120,80 L200,84Z" fill="#e8e3da"/>` + P('M120,26 L120,80', 'ink') +
      hatchLines(130, 34, 190, 34, 8, 40, 90, 'ink2 thin');
  }

  // name caption, handwritten, with small flourish (centred on x)
  function caption(id, text, x, y, size = 34) {
    const w = text.length * size * 0.42;
    return `<g id="${id}"><text x="${x}" y="${y}" class="hand" font-size="${size}" text-anchor="middle" fill="${C.ink2}">${text}</text>` +
      `<path class="ink thin" d="M${x - w / 2},${y + 12} C${x - w / 6},${y + 6} ${x + w / 6},${y + 16} ${x + w / 2},${y + 9}"/></g>`;
  }
  // small marble statue on a plinth held by two hands (origin = plinth centre)
  function statuette() {
    return `<g transform="translate(0,-92) scale(0.3)">${bust({ statue: true, laurel: true, hair: 'neat', color: '#9a96a2', cloth: 'toga', eyes: 'stern' })}</g>` +
      `<path class="fillwash" d="M-66,0 L66,0 L58,40 L-58,40Z" fill="#d6d2ca"/>` + P('M-66,0 L66,0 L58,40 L-58,40Z') + P('M-60,12 L60,12', 'ink2 thin') +
      [-1, 1].map(sd => `<path class="fillwash" d="M${sd * 52},14 C${sd * 80},10 ${sd * 96},30 ${sd * 92},52 C${sd * 80},62 ${sd * 60},58 ${sd * 48},44Z" fill="${C.skin}"/>` +
        P(`M${sd * 52},14 C${sd * 80},10 ${sd * 96},30 ${sd * 92},52 C${sd * 80},62 ${sd * 60},58 ${sd * 48},44`) +
        P(`M${sd * 60},24 C${sd * 70},26 ${sd * 76},32 ${sd * 78},40 M${sd * 58},34 C${sd * 66},36 ${sd * 70},42 ${sd * 72},48`, 'ink2 thin')).join('');
  }

  window.ART = { C, caption, statuette, defs, background, vignette, pen, title, flourish, face, hair, beard, laurel, helmet, clothes, bust, profile, figure,
    sword, katana, shield, hourglass, chessPiece, chessboard, scroll, padlock, trophy, mask, arrow, mountain, stairs, cloud, lightning, hand,
    wash, blobPath, splatter, hatchLines, P, g, tr, mirror };
})();
