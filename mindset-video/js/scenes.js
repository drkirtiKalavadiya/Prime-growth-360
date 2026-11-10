/* =========================================================================
   5 MINDSET RULES — v2 timeline, synced to the Gujarati voice-over (1.3x)
   Canvas 720x1280 (exported at 1080x1920) · 30fps · 66.0s
   Narration timings (seconds, voice at 1.3x):
     0.00 hook · 4.70 "5th rule will change…" · 9.76 Rule 1 Alexander
    19.68 Rule 2 Napoleon · 27.89 Rule 3 Caesar · 35.43 "real secret ahead"
    37.17 Rule 4 Musashi · 46.93 Rule 5 Marcus Aurelius · 55.00 "remember…"
    61.20 follow + subscribe · 64.29 voice ends
   ========================================================================= */
(function () {
  'use strict';
  const { scene, anim, fx, rng, clamp, lerp, Ease } = MV;
  const A = ART, C = ART.C;
  const R1 = 9.76, R2 = 19.68, R3 = 27.89, R4 = 37.17, R5 = 46.93, REMEMBER = 55.0, SUBSCRIBE = 61.2;
  const DURATION = 66.0;
  window.DURATION = DURATION;
  window.TIMING = { R1, R2, R3, R4, R5, REMEMBER, SUBSCRIBE, DURATION };

  const svg = document.getElementById('film');
  MV.init(svg);
  document.getElementById('defsHost').outerHTML = A.defs;
  document.getElementById('bgHost').innerHTML = A.background();
  document.getElementById('fgHost').innerHTML = A.pen() + A.vignette() +
    `<rect id="flash" width="720" height="1280" fill="#fff" style="opacity:0"/>` +
    `<rect id="flashBlue" width="720" height="1280" fill="#cfe2ff" style="opacity:0"/>` +
    `<rect id="flashGold" width="720" height="1280" fill="#fff1c9" style="opacity:0"/>`;

  /* ---------- authoring helpers ---------- */
  const place = (id, x, y, s, inner, r = 0, extra = '') =>
    `<g transform="translate(${x},${y}) rotate(${r}) scale(${s})"><g id="${id}" ${extra}>${inner}</g></g>`;
  const show = (sel, t0, t1, fin = 0.3, fout = 0.3) => {
    anim(sel, t0, fin, { o: [0, 1] }, 'out');
    if (t1 != null) anim(sel, t1 - fout, fout, { o: [1, 0] }, 'in');
  };
  const drawIn = (sel, t0, dur, washAt = 0.55, washDur = 0.7) => {
    anim(sel, t0, dur, { draw: [0, 1] }, 'inOut');
    anim(sel, t0 + dur * washAt, washDur, { wash: [0, 1] }, 'out');
  };
  const instant = (sel, t0) => anim(sel, t0, 0.01, { draw: [1, 1], wash: [1, 1] });
  const bloom = (sel, t0, dur = 0.8, s0 = 0.75) => anim(sel, t0, dur, { o: [0, 1], s: [s0, 1] }, 'out');
  const pop = (sel, t0, dur = 0.5, s0 = 0.2) => {
    anim(sel, t0, dur * 0.6, { o: [0, 1] }, 'out');
    anim(sel, t0, dur, { s: [s0, 1] }, 'back');
  };
  const hidden = sel => anim(sel, 0, 0.01, { o: [0, 0] });
  const capIn = (id, t0, t1) => { show('#' + id, t0, t1, 0.2, 0.25); anim(`#${id} text`, t0, 0.6, { reveal: [0, 1] }); anim(`#${id} path`, t0 + 0.4, 0.4, { draw: [0, 1] }); };
  const $ = id => document.getElementById(id);

  /* ---------- global: paper switch, pen idle, flashes ---------- */
  anim('#paperStack', R1 - 0.2, 0.3, { o: [1, 0] });
  anim('#paperFull', R1 - 0.2, 0.3, { o: [0, 1] });
  fx(0, DURATION, t => {
    $('pen').setAttribute('transform', `translate(${(Math.sin(t * 1.7) * 2).toFixed(2)},${(Math.sin(t * 2.3) * 1.5).toFixed(2)}) rotate(${(Math.sin(t * 1.1) * 0.6).toFixed(2)} 180 0)`);
  });
  const flashAt = (id, t, up = 0.08, down = 0.35, peak = 1) => {
    anim('#' + id, t, up, { o: [0, peak] }, 'out');
    anim('#' + id, t + up, down, { o: [peak, 0] }, 'in');
  };
  flashAt('flash', 9.35, 0.2, 0.3, 0.9);
  flashAt('flashBlue', R4, 0.06, 0.35, 0.5);
  flashAt('flashGold', REMEMBER + 0.15, 0.15, 0.6, 0.55);
  flashAt('flashGold', 62.6, 0.06, 0.45, 0.5);

  function rainLayer(id, n, seed, area = [40, 240, 680, 980]) {
    const r = rng(seed);
    let s = `<g id="${id}" opacity="0.55">`;
    for (let i = 0; i < n; i++) {
      const x = area[0] + r() * (area[2] - area[0]), y = area[1] + r() * (area[3] - area[1]), l = 14 + r() * 26;
      s += `<line data-x="${x.toFixed(1)}" data-y="${y.toFixed(1)}" x1="0" y1="0" x2="-4" y2="${l.toFixed(1)}" stroke="#4d5578" stroke-width="1.4"/>`;
    }
    return s + '</g>';
  }
  function animateRain(id, t0, t1, area = [40, 240, 680, 980]) {
    fx(t0, t1, (t) => {
      const g = $(id); if (!g) return;
      const h = area[3] - area[1];
      g.querySelectorAll('line').forEach((ln, i) => {
        const x = +ln.dataset.x, y = +ln.dataset.y;
        const yy = area[1] + ((y - area[1] + t * (520 + (i % 5) * 60)) % h);
        ln.setAttribute('transform', `translate(${(x - (yy - y) * 0.08).toFixed(1)},${yy.toFixed(1)})`);
      });
    });
  }

  /* =====================================================================
     SCENE 1–2 · HOOK + FIVE SCROLLS (0 – 9.76)
     ===================================================================== */
  {
    const titleBlock = A.title('t0', '5 MINDSET RULES', 112, 58, false) + A.flourish('t0-fl', 360, 152);
    const storm = A.wash([[360, 560, 290, 270, C.slate, 0.55], [250, 470, 170, 150, C.storm, 0.55], [480, 520, 170, 160, C.storm, 0.5],
      [360, 820, 300, 100, C.lav, 0.5], [360, 420, 230, 120, '#7d86a8', 0.4]], 3);
    let field = '';
    const r = rng(9);
    for (let i = 0; i < 14; i++) {
      const x = 90 + r() * 540, y = 700 + r() * 140, h = 80 + r() * 120, a = -12 + r() * 24;
      field += `<path class="ink2 thin" d="M${x},${y} l${(Math.sin(a * Math.PI / 180) * h).toFixed(1)},${-h}" stroke="#4a5070" opacity="0.6"/>`;
    }
    const mist = A.wash([[360, 900, 330, 70, '#8c93b4', 0.65], [200, 880, 150, 50, C.slate, 0.5], [540, 890, 150, 55, C.slate, 0.5]], 61);
    const kneelArmL = 'M-82,-450 C-100,-420 -80,-384 -26,-372 L-22,-350 C-84,-352 -112,-392 -70,-430';
    const warriorKneel =
      `<g transform="translate(0,-330) rotate(180)">${A.sword(300)}</g>` +
      A.figure('warrior', { helmet: 'spike', armL: kneelArmL, armR: A.mirror(kneelArmL), handL: [-14, -360], handR: [14, -360], headId: 'wkHead', eyes: 'closed', cape: '#3d4466' });
    const warriorStand = A.figure('warrior', { helmet: 'spike', cape: '#3d4466', eyes: 'stern' }) + `<g transform="translate(112,-290) rotate(200)">${A.sword(300)}</g>`;
    const splash = A.splatter(360, 860, 260, 70, 4, C.storm, 7);

    let scrolls = '';
    [300, 425, 550, 675, 800].forEach((y, i) => { scrolls += place('scroll' + i, 360, y, 1, A.scroll(330)); });
    const scrollGlow = A.wash([[360, 520, 260, 330, '#8f8ce0', 0.45], [300, 700, 140, 120, '#b6b4ff', 0.4]], 71, 'wc2');
    const fifthGlow = `<rect x="-200" y="-40" width="400" height="80" rx="30" fill="#ffd27a" opacity="0.55" filter="url(#glowGold)"/>`;

    let flames = '';
    const fr = rng(5);
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI / 2 + (fr() - 0.5) * 2.6, l = 90 + fr() * 120;
      const x = Math.cos(a) * 40, y = Math.sin(a) * 40;
      flames += `<path class="flame" d="M${(x - 12).toFixed(1)},${y.toFixed(1)} Q${(x + Math.cos(a) * l * 0.5).toFixed(1)},${(y + Math.sin(a) * l * 0.5 - 20).toFixed(1)} ${(x + Math.cos(a) * l).toFixed(1)},${(y + Math.sin(a) * l).toFixed(1)} Q${(x + Math.cos(a) * l * 0.4 + 10).toFixed(1)},${(y + Math.sin(a) * l * 0.4).toFixed(1)} ${(x + 12).toFixed(1)},${y.toFixed(1)}Z" fill="${i % 2 ? '#ffb020' : '#ff7a00'}" opacity="0.85"/>`;
    }
    let sparks = '';
    for (let i = 0; i < 40; i++) sparks += `<circle class="spark" data-a="${(fr() * 6.283).toFixed(3)}" data-v="${(120 + fr() * 260).toFixed(0)}" r="${(2 + fr() * 3).toFixed(1)}" fill="#ffd34d" opacity="0"/>`;
    const lock = `<g filter="url(#glowGold)">${flames}</g>${A.padlock()}<text x="0" y="66" class="bang" font-size="64" text-anchor="middle" fill="#fff6d0" stroke="#8a5a12" stroke-width="2" filter="url(#glowGold)">5</text><g id="lockSparks">${sparks}</g>`;

    scene('s0', 0, R1 - 0.3,
      place('t0wrap', 0, 0, 1, titleBlock) +
      `<g id="introArt">` +
      place('storm0', 0, 0, 1, storm) + place('field0', 0, 0, 1, field) + rainLayer('rain0', 80, 3) +
      `<g transform="translate(360,1090) scale(1.05)">` +
      `<g id="wKneelWrap" transform="translate(0,170)"><g id="wKneel">${warriorKneel}</g></g>` +
      `<g id="wStandWrap"><g id="wStand">${warriorStand}</g></g></g>` +
      place('mist0', 0, 0, 1, mist) + place('splash0', 0, 0, 1, splash) +
      `</g>` +
      place('scrollGlow', 0, 0, 1, scrollGlow) +
      place('fifthGlow', 360, 800, 1, fifthGlow) +
      `<g id="scrolls">${scrolls}</g>` +
      `<g transform="translate(360,770)"><g id="lock">${lock}</g></g>`,
      { fadeIn: 0.01, fadeOut: 0.05 });

    anim('#t0-t', 0.0, 0.9, { reveal: [0, 1] }, 'inOut');
    anim('#t0-fl', 0.6, 0.7, { draw: [0, 1] });
    anim('#t0wrap', 9.3, 0.3, { o: [1, 0] });
    bloom('#storm0', 0.0, 0.9, 0.85);
    show('#field0', 0.2, null, 0.6);
    show('#rain0', 0.0, null, 0.4);
    animateRain('rain0', 0, 4.8);
    drawIn('#wKneel', 0.0, 1.3, 0.4, 0.6);
    anim('#wkHead', 0, 0.01, { r: [14, 14], y: [10, 10] });
    anim('#wkHead', 2.2, 0.5, { r: [14, 0], y: [10, 0] });
    anim('#wKneelWrap', 2.9, 0.25, { o: [1, 0] });
    instant('#wStand', 2.85);
    hidden('#wStandWrap');
    anim('#wStandWrap', 2.9, 0.2, { o: [0, 1] });
    anim('#wStand', 2.9, 0.7, { y: [120, 0], s: [0.96, 1] }, 'out');
    anim('#wStand', 3.6, 1.1, { s: [1, 1.03] }, 'linear');
    show('#mist0', 0.1, null, 0.6);
    hidden('#splash0');
    anim('#splash0', 2.95, 0.5, { o: [0, 1], s: [0.6, 1.05] }, 'out');
    anim('#introArt', 4.5, 0.35, { o: [1, 0] });
    // scrolls (4.7) — "the fifth rule will change…" highlights the 5th scroll
    [0, 1, 2, 3, 4].forEach(i => {
      hidden('#scroll' + i);
      anim('#scroll' + i, 4.65 + i * 0.3, 0.25, { o: [0, 1] });
      drawIn('#scroll' + i, 4.65 + i * 0.3, 0.6, 0.5, 0.4);
      anim('#scroll' + i, 4.65 + i * 0.3, 0.5, { sx: [0.3, 1] }, 'out');
    });
    hidden('#scrollGlow');
    anim('#scrollGlow', 6.3, 0.6, { o: [0, 1], s: [0.7, 1] }, 'out');
    hidden('#fifthGlow');
    anim('#fifthGlow', 6.4, 0.4, { o: [0, 1] });
    fx(6.4, 9.6, (t, p, lt) => { $('fifthGlow').firstElementChild.setAttribute('opacity', (0.4 + 0.25 * Math.sin(lt * 6)).toFixed(2)); });
    anim('#scrolls', 7.6, 0.5, { o: [1, 0.55] });
    hidden('#lock');
    pop('#lock', 7.55, 0.45, 0.3);
    fx(7.55, 9.76, (t, p, lt) => {
      $('lock').querySelectorAll('.flame').forEach((f, i) => {
        f.setAttribute('transform', `scale(${(0.75 + 0.35 * Math.sin(lt * 18 + i * 1.7)).toFixed(3)})`);
        f.style.transformOrigin = '0 0';
      });
      const burst = clamp((t - 9.0) / 0.6);
      $('lockSparks').querySelectorAll('.spark').forEach(sp => {
        const a = +sp.dataset.a, v = +sp.dataset.v;
        sp.setAttribute('cx', (Math.cos(a) * v * burst * 1.6).toFixed(1));
        sp.setAttribute('cy', (Math.sin(a) * v * burst * 1.6 + 200 * burst * burst).toFixed(1));
        sp.setAttribute('opacity', (burst > 0 ? 1 - burst : 0).toFixed(2));
      });
    });
    anim('#lock', 9.0, 0.5, { s: [1, 1.5] }, 'in');
  }

  /* =====================================================================
     SCENE 3–4 · RULE 1 — DAILY STEPS · Alexander the Great (9.76 – 19.68)
     ===================================================================== */
  {
    const T = R1;
    let bflames = '';
    const r = rng(41);
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.2, l = 70 + r() * 90;
      bflames += `<path class="bflame" d="M-14,0 Q${(Math.cos(a) * l * 0.5).toFixed(1)},${(Math.sin(a) * l * 0.5 - 10).toFixed(1)} ${(Math.cos(a) * l).toFixed(1)},${(Math.sin(a) * l).toFixed(1)} Q${(Math.cos(a) * l * 0.3 + 8).toFixed(1)},${(Math.sin(a) * l * 0.3).toFixed(1)} 14,0Z" fill="#5d9bff" opacity="0.7"/>`;
    }
    const one = `<g filter="url(#glowBlue)">${bflames}</g><text x="0" y="80" class="bang" font-size="230" text-anchor="middle" fill="#d9ecff" stroke="#3b6dff" stroke-width="4" filter="url(#glowBlue)">1</text>`;
    const alex = A.wash([[0, 40, 230, 240, C.lav, 0.4], [80, -60, 120, 120, C.indigo, 0.3], [-120, 120, 90, 90, C.ochre, 0.35]], 44) + A.bust({ helmet: 'crest', cloth: 'armor', eyes: 'stern' });
    const youngMan = A.bust({ hair: 'messy', cloth: 'tunic', eyes: 'open', stubble: true });
    const mtn = A.mountain();
    const walker = A.figure('traveller', { hair: 'messy', eyes: 'open' });
    const cert = `<g transform="rotate(-5)">
        <rect x="-200" y="-140" width="400" height="280" rx="6" fill="#f3ead6" stroke="${C.ink}" stroke-width="3"/>
        <rect x="-184" y="-124" width="368" height="248" rx="4" fill="none" stroke="${C.ochre}" stroke-width="3"/>
        <rect x="-176" y="-116" width="352" height="232" rx="3" fill="none" stroke="${C.ochre}" stroke-width="1" stroke-dasharray="3 4"/>
        <text x="0" y="-74" class="title" font-size="26" text-anchor="middle" fill="${C.ink2}">Certificate of</text>
        <text x="0" y="-8" class="bang" font-size="62" text-anchor="middle" fill="${C.ink}">OVERNIGHT</text>
        <text x="0" y="56" class="bang" font-size="62" text-anchor="middle" fill="${C.ink}">SUCCESS</text>
        <path class="ink2 thin" d="M-120,96 L-30,96 M30,96 L120,96"/>
        <circle cx="140" cy="88" r="28" fill="url(#goldG)" stroke="${C.ink}" stroke-width="2"/><path d="M128,112 L122,138 L140,128 L158,138 L152,112" fill="#a8613f"/></g>`;
    const cross = `<g id="crossX"><path class="ink" stroke="#9b2f22" stroke-width="16" d="M-210,-150 C-80,-40 60,60 210,150"/><path class="ink" stroke="#9b2f22" stroke-width="16" d="M210,-150 C80,-50 -60,50 -210,150"/></g>`;
    const brick = A.stairs(9, 76, 46, true);
    const tiny = A.figure('traveller', { hair: 'messy', eyes: 'open' });

    scene('s2', T, R2,
      place('r1title', 0, 0, 1, A.title('r1t', 'RULE 1: DAILY STEPS', 78, 40)) +
      place('one', 360, 600, 1, one) +
      place('alex', 360, 560, 1.22, alex) + A.caption('capAlex', 'Alexander the Great', 300, 1010) +
      `<g id="climb">` +
      place('mtn1', 500, 430, 1.05, mtn) +
      place('steps1', 250, 1000, 1, A.stairs(7, 68, 40)) +
      place('man1', 230, 760, 1.25, youngMan) +
      `<g id="walkerWrap" transform="translate(310,1000) scale(0.36)"><g id="walker">${walker}</g></g>` +
      `</g>` +
      `<g transform="translate(360,600)"><g id="cert">${A.splatter(0, 0, 280, 60, 12, C.indigo, 10)}${cert}${cross}</g></g>` +
      `<g id="summit">` +
      place('sky1', 0, 0, 1, A.wash([[400, 300, 300, 160, '#a9c4e0', 0.5], [200, 260, 140, 80, '#c6d6ea', 0.5]], 81)) +
      A.cloud(180, 300, 0.9, 3) + A.cloud(560, 260, 0.7, 5) +
      place('mtn2', 430, 470, 0.85, mtn) +
      place('brick', 70, 1040, 1.0, brick) +
      `<g transform="translate(445,300) scale(0.16)">${tiny}</g>` +
      `<path class="ink thin" d="M560,200 q8,-8 16,0 q8,-8 16,0 M610,230 q6,-6 12,0 q6,-6 12,0"/>` +
      `</g>`,
      { fadeIn: 0.1, fadeOut: 0.3 });

    anim('#r1t-t', T + 0.05, 0.7, { reveal: [0, 1] });
    anim('#r1t-u', T + 0.5, 0.5, { draw: [0, 1] });
    hidden('#one');
    pop('#one', T + 0.1, 0.5, 0.4);
    fx(T + 0.1, T + 1.3, (t, p, lt) => { $('one').querySelectorAll('.bflame').forEach((f, i) => f.setAttribute('transform', `scale(${(0.8 + 0.3 * Math.sin(lt * 16 + i)).toFixed(3)})`)); });
    anim('#one', T + 0.95, 0.3, { o: [1, 0], s: [1, 0.6] }, 'in');
    // Alexander (name) 10.7 – 12.9
    show('#alex', 10.7, 12.9, 0.15, 0.3);
    drawIn('#alex', 10.7, 0.9);
    anim('#alex', 10.7, 2.2, { s: [0.97, 1.03] }, 'linear');
    capIn('capAlex', 11.2, 12.9);
    // "dream big… daily small steps" — mountain, man, stairs, climb
    show('#climb', 12.6, 17.0, 0.3, 0.3);
    drawIn('#mtn1', 12.6, 0.9, 0.3);
    drawIn('#man1', 12.7, 0.9, 0.5);
    anim('#man1', 12.7, 2.0, { x: [0, 10] }, 'linear');
    drawIn('#steps1', 13.5, 0.9, 0.5);
    anim('#man1', 14.6, 0.4, { o: [1, 0] });
    hidden('#walker'); show('#walker', 14.6, null, 0.3);
    instant('#walker', 14.6);
    fx(14.6, 17.0, (t, p, lt) => {
      const k = clamp(lt / 2.2), si = Math.min(6, k * 6.5);
      const bob = Math.abs(Math.sin(lt * 9)) * 6;
      $('walkerWrap').setAttribute('transform', `translate(${(310 + si * 68 * 0.7).toFixed(1)},${(1000 - si * 40 - bob).toFixed(1)}) scale(0.36)`);
    });
    // "overnight success is an illusion" — certificate crossed out
    hidden('#cert');
    pop('#cert', 16.85, 0.45, 0.3);
    hidden('#crossX');
    anim('#crossX', 17.55, 0.05, { o: [0, 1] });
    anim('#crossX', 17.55, 0.55, { draw: [0, 1] }, 'out');
    fx(18.1, 18.4, (t, p, lt) => $('cert').setAttribute('transform', `translate(${(Math.sin(lt * 80) * 4).toFixed(1)},0)`));
    anim('#cert', 18.35, 0.3, { o: [1, 0], s: [1, 0.85] });
    // summit
    hidden('#summit'); show('#summit', 18.4, null, 0.3);
    drawIn('#brick', 18.4, 0.9, 0.2, 0.5);
    drawIn('#mtn2', 18.4, 0.7, 0.3);
    anim('#summit', 18.4, 1.3, { s: [1.06, 1] }, 'out');
  }

  /* =====================================================================
     SCENE 5–6 · RULE 2 — PATIENCE WINS · Napoleon (19.68 – 27.89)
     ===================================================================== */
  {
    const T = R2;
    const two = `<text x="0" y="110" class="bang" font-size="320" text-anchor="middle" fill="none" stroke="#bcdcff" stroke-width="7" filter="url(#glowBlue)">2</text>`;
    let zaps = '';
    for (let i = 0; i < 5; i++) zaps += A.lightning(-90 + i * 45, -150, 260, 100 + i);
    const general = A.wash([[-20, 60, 200, 230, C.ochre, 0.3], [-120, -60, 120, 120, C.lav, 0.35]], 52) + A.bust({ helmet: 'bicorne', hair: 'neat', cloth: 'uniform', eyes: 'stern' });
    const board = A.chessboard();
    const pieceAt = (u, v, type, white, id) => { const [x, y] = board.pt(u, v); const sc = 0.8 + v * 0.6; return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${sc.toFixed(2)})"><g ${id ? `id="${id}"` : ''}>${A.chessPiece(type, white)}</g></g>`; };
    let pieces = '';
    [[0.19, 0.2, 'pawn'], [0.31, 0.2, 'pawn'], [0.56, 0.2, 'rook'], [0.69, 0.32, 'pawn'], [0.81, 0.2, 'king']].forEach(p => pieces += pieceAt(p[0], p[1], p[2], false));
    [[0.19, 0.7, 'pawn', true], [0.44, 0.82, 'king', true], [0.81, 0.7, 'pawn', true], [0.69, 0.82, 'rook', true]].forEach(p => pieces += pieceAt(p[0], p[1], p[2], p[3]));
    const movingKnight = pieceAt(0.44, 0.58, 'knight', false, 'knightPiece');
    const arcs = `<path class="ink" stroke="#7fb0ff" stroke-width="3" filter="url(#glowBlue)" d="M-200,120 C-160,40 -80,40 -40,110"/>` +
      `<path class="ink" stroke="#7fb0ff" stroke-width="3" filter="url(#glowBlue)" d="M-60,170 C-20,80 60,80 100,150"/>` +
      `<path class="ink" stroke="#7fb0ff" stroke-width="3" filter="url(#glowBlue)" d="M120,190 C160,110 220,110 250,170"/>`;
    const stormSky = A.wash([[360, 300, 340, 160, '#4b4f6c', 0.75], [180, 260, 180, 120, '#3a3d55', 0.7], [560, 280, 160, 110, '#5a5f80', 0.65]], 63);
    let enemies = '';
    [[150, 640, 0.32, -6], [230, 610, 0.27, 4], [90, 600, 0.24, 8]].forEach((e, i) => enemies += `<g transform="translate(${e[0]},${e[1]}) scale(${e[2]}) rotate(${e[3]})" opacity="${0.55 + i * 0.1}">${A.figure(i ? 'warrior' : 'knight', { helmet: i ? 'spike' : undefined, hair: 'neat' })}</g>`);
    const knight = A.figure('knight', { helmet: 'spike', cape: C.indigo, eyes: 'stern' }) +
      `<g transform="translate(110,-290) rotate(205)">${A.sword(240)}</g>` + `<g transform="translate(-70,-330) scale(1.15)">${A.shield()}</g>`;

    scene('s3', T, R3,
      place('r2title', 0, 0, 1, `<text id="r2a" x="360" y="80" class="title" font-size="50" text-anchor="middle">RULE 2:</text><text id="r2b" x="360" y="140" class="title" font-size="50" text-anchor="middle">PATIENCE WINS</text>`) +
      `<g transform="translate(360,620)"><g id="two">${two}<g id="zaps">${zaps}</g></g></g>` +
      place('stormSky', 0, 0, 1, stormSky) +
      `<g id="bolts">${A.lightning(160, 190, 260, 7)}${A.lightning(250, 220, 200, 8)}</g>` +
      place('enemies', 0, 0, 1, enemies) +
      place('general', 230, 600, 1.05, general) + A.caption('capNap', 'Napoleon Bonaparte', 250, 960) +
      place('hglass', 580, 590, 1.05, A.hourglass()) +
      `<g transform="translate(360,960)"><g id="board">${board.svg}${pieces}${movingKnight}<g id="arcs">${arcs}</g></g></g>` +
      `<g transform="translate(470,1010)"><g id="hand">${A.hand()}</g></g>` +
      `<g transform="translate(400,960) scale(0.88)"><g id="knight">${knight}</g></g>`,
      { fadeIn: 0.1, fadeOut: 0.3 });

    anim('#r2a', T, 0.5, { reveal: [0, 1] });
    anim('#r2b', T + 0.35, 0.7, { reveal: [0, 1] });
    hidden('#two');
    pop('#two', T + 0.05, 0.45, 0.5);
    fx(T, T + 1.1, (t, p, lt) => {
      $('zaps').style.opacity = (Math.sin(lt * 50) > 0.2 ? 0.9 : 0.15).toFixed(2);
      $('two').firstElementChild.style.opacity = (0.75 + 0.25 * Math.sin(lt * 40)).toFixed(2);
    });
    anim('#two', T + 0.8, 0.3, { o: [1, 0] });
    // Napoleon + hourglass + board
    hidden('#general'); show('#general', 20.5, 25.6, 0.2, 0.35);
    drawIn('#general', 20.5, 1.0, 0.45);
    capIn('capNap', 21.0, 22.4);
    hidden('#hglass'); show('#hglass', 21.0, null, 0.2);
    drawIn('#hglass', 21.0, 0.8, 0.6, 0.5);
    fx(21.8, R3, (t, p) => {
      const top = $('hglass').querySelector('.sandTop'), bot = $('hglass').querySelector('.sandBot');
      top.style.transformBox = 'fill-box'; top.style.transformOrigin = 'center bottom'; top.style.transform = `scaleY(${(1 - p * 0.8).toFixed(3)})`;
      bot.style.transformBox = 'fill-box'; bot.style.transformOrigin = 'center bottom'; bot.style.transform = `scaleY(${(0.35 + p * 0.65).toFixed(3)})`;
      $('hglass').querySelector('.sandStream').style.opacity = (0.5 + 0.5 * Math.sin(t * 30)).toFixed(2);
    });
    hidden('#board'); show('#board', 22.0, null, 0.2);
    drawIn('#board', 22.0, 1.0, 0.4);
    // "victory goes to the most patient" — the patient move
    hidden('#hand');
    anim('#hand', 23.4, 0.5, { o: [0, 1], x: [220, 0] }, 'out');
    anim('#hand', 24.1, 0.6, { x: [0, -60], y: [0, -30] }, 'inOut');
    anim('#knightPiece', 24.1, 0.6, { x: [0, -60], y: [0, -30] }, 'inOut');
    anim('#hand', 24.8, 0.4, { o: [1, 0], x: [-60, 200] }, 'in');
    // "prepared for bad times" — storm + calm shield warrior
    hidden('#stormSky'); show('#stormSky', 25.4, null, 0.5);
    hidden('#enemies'); show('#enemies', 25.6, null, 0.5);
    anim('#enemies', 25.6, 2.3, { x: [-40, 10] }, 'linear');
    hidden('#bolts');
    fx(25.6, R3, (t, p, lt) => { $('bolts').style.opacity = ((Math.sin(lt * 7) > 0.85 || Math.sin(lt * 3.3 + 1) > 0.95) ? 1 : 0.08).toFixed(2); });
    hidden('#knight'); show('#knight', 25.45, null, 0.2);
    drawIn('#knight', 25.45, 1.1, 0.5);
    hidden('#arcs');
    anim('#arcs', 26.4, 0.1, { o: [0, 1] });
    anim('#arcs', 26.4, 0.8, { draw: [0, 1] });
    anim('#board', 25.4, 0.6, { y: [0, 40] });
  }

  /* =====================================================================
     SCENE 7–8 · RULE 3 — KILL THE FEAR · Julius Caesar (27.89 – 37.17)
     ===================================================================== */
  {
    const T = R3;
    const three = `<circle class="ink2 thin" cx="0" cy="-60" r="70" stroke-dasharray="4 5"/><circle class="ink2 thin" cx="0" cy="70" r="80" stroke-dasharray="4 5"/>` +
      `<path class="ink2 thin" d="M-150,-140 L150,-140 M-150,160 L150,160 M-150,0 L150,0 M0,-200 L0,220"/>` +
      `<text id="threeT" x="0" y="150" font-family="Georgia, serif" font-size="400" text-anchor="middle" fill="url(#hatch)" stroke="${C.indigo}" stroke-width="5">3</text>`;
    const caesar = A.wash([[30, 20, 220, 220, C.lav, 0.45], [120, 80, 120, 120, C.ochre, 0.45], [-120, -40, 80, 80, C.indigo, 0.4]], 91) +
      A.bust({ statue: true, laurel: true, hair: 'neat', color: '#9a96a2', cloth: 'toga', eyes: 'stern' });
    const headD = 'M-150,200 C-170,120 -190,40 -170,-40 C-150,-150 -60,-200 30,-190 C120,-180 170,-110 160,-30 C170,-10 190,20 186,34 C176,42 168,44 164,48 C170,60 168,74 160,80 C164,92 160,104 150,110 C150,140 120,160 80,160 L60,200Z';
    let shards = '';
    const sr = rng(55);
    for (let gx = -180; gx < 190; gx += 40) for (let gy = -200; gy < 200; gy += 40) {
      const pts = [[gx + sr() * 40, gy + sr() * 16], [gx + 40 * sr(), gy + 22 + sr() * 24], [gx + sr() * 40, gy + 42]];
      shards += `<path class="shard" data-cx="${gx + 20}" data-cy="${gy + 20}" data-r="${(sr() * 2 - 1).toFixed(3)}" d="M${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' L')}Z" fill="${C.dark}"/>`;
    }
    let cracks = '';
    const cr0 = rng(77);
    for (let i = 0; i < 9; i++) { let x = -20 + cr0() * 40, y = -20 + cr0() * 40, d = `M${x.toFixed(0)},${y.toFixed(0)}`; const a = cr0() * 6.28; for (let k = 0; k < 5; k++) { x += Math.cos(a + (cr0() - 0.5)) * 40; y += Math.sin(a + (cr0() - 0.5)) * 40; d += ` L${x.toFixed(0)},${y.toFixed(0)}`; } cracks += `<path class="ink" stroke="#e9e3d6" stroke-width="2" d="${d}"/>`; }
    const fear = `<g id="fearHead">${A.wash([[0, 0, 220, 230, '#4b5070', 0.6]], 33)}<path d="${headD}" fill="${C.dark}"/>` +
      `<path d="M40,-170 C100,-150 140,-90 140,-30" stroke="#8b8ea8" stroke-width="5" fill="none" opacity="0.6"/>` +
      `<text x="-6" y="-50" class="bang" font-size="62" text-anchor="middle" fill="#e9e3d6">FEAR</text><text x="-6" y="0" class="hand" font-size="40" text-anchor="middle" fill="#e9e3d6">of</text><text x="-6" y="60" class="bang" font-size="56" text-anchor="middle" fill="#e9e3d6">FAILURE</text>` +
      `<g id="cracks">${cracks}</g></g>` +
      `<g id="shards">${shards}</g>`;
    const glArmL = 'M-82,-450 C-120,-470 -150,-520 -150,-566 L-126,-570 C-124,-530 -100,-490 -70,-430';
    const glad = A.figure('gladiator', { hair: 'neat', armL: glArmL, handL: [-138, -575], eyes: 'stern' }) +
      `<g transform="translate(-138,-660) scale(1.2)"><circle cx="0" cy="-40" r="60" fill="url(#rgGold)" opacity="0.6"/>${A.trophy()}</g>` +
      `<g transform="translate(112,-290) rotate(160)">${A.sword(220)}</g>` +
      `<g transform="translate(0,-548) scale(0.42)" filter="url(#glowWhite)"><ellipse cx="-28" cy="-21" rx="9" ry="5" fill="#fff"/><ellipse cx="28" cy="-21" rx="9" ry="5" fill="#fff"/></g>`;
    let crowd = '';
    const cr = rng(66);
    for (let i = 0; i < 26; i++) { const x = 20 + i * 27 + cr() * 10, y = 760 + cr() * 30; crowd += `<circle cx="${x}" cy="${y}" r="10" fill="#4a4a5a"/><path d="M${x - 14},${y + 70} L${x - 12},${y + 14} L${x + 12},${y + 14} L${x + 14},${y + 70}Z" fill="#4a4a5a"/>`; if (i % 6 === 2) crowd += `<path d="M${x},${y + 20} L${x},${y - 90} L${x + 34},${y - 80} L${x},${y - 66}" fill="#6b4a3a" stroke="#4a4a5a" stroke-width="3"/>`; }
    let dust = '';
    for (let i = 0; i < 30; i++) dust += `<circle class="dust" data-x="${(cr() * 720).toFixed(0)}" data-y="${(900 + cr() * 300).toFixed(0)}" data-v="${(20 + cr() * 60).toFixed(0)}" r="${(1.5 + cr() * 3).toFixed(1)}" fill="#6b5a48"/>`;

    scene('s4', T, R4,
      place('r3title', 0, 0, 1, A.title('r3t', 'RULE 3: KILL THE FEAR', 70, 36)) +
      place('three', 360, 600, 1, three) +
      place('caesar', 360, 560, 1.18, caesar) + A.caption('capCaesar', 'Julius Caesar', 300, 1010) +
      place('fear', 360, 640, 1.1, fear) +
      `<g id="arena">` +
      place('arenaSky', 0, 0, 1, A.wash([[360, 330, 360, 200, '#5d6078', 0.6], [160, 300, 200, 140, '#4a4d63', 0.55], [600, 380, 170, 130, '#6f7390', 0.5], [360, 980, 380, 160, C.ochre, 0.4]], 88)) +
      `<g filter="url(#soft)" opacity="0.55">${crowd}</g>` +
      `<g transform="translate(360,1120) scale(0.88)"><g id="glad">${glad}</g></g>` +
      `<g id="dust">${dust}</g>` +
      `</g>`,
      { fadeIn: 0.1, fadeOut: 0.05 });

    { const headPath = $('fearHead').querySelector(':scope > path');
      $('shards').querySelectorAll('.shard').forEach(sh => { if (!headPath.isPointInFill(new DOMPoint(+sh.dataset.cx, +sh.dataset.cy))) sh.remove(); }); }

    anim('#r3t-t', T, 0.7, { reveal: [0, 1] });
    anim('#r3t-u', T + 0.5, 0.4, { draw: [0, 1] });
    show('#three', T, T + 1.05, 0.1, 0.25);
    anim('#three', T, 0.5, { draw: [0, 1] });
    anim('#threeT', T + 0.2, 0.7, { revealY: [0, 1] });
    // Caesar (name) 28.75 – 30.2
    show('#caesar', 28.75, 30.2, 0.15, 0.25);
    drawIn('#caesar', 28.75, 0.75, 0.5, 0.5);
    anim('#caesar', 28.75, 1.45, { s: [0.97, 1.03] }, 'linear');
    capIn('capCaesar', 29.0, 30.2);
    // "remove the fear of losing completely" — glass head cracks, then shatters
    show('#fear', 30.05, 33.6, 0.2, 0.2);
    anim('#fear', 30.05, 2.9, { s: [0.96, 1.04] }, 'linear');
    hidden('#cracks');
    anim('#cracks', 31.6, 0.05, { o: [0, 1] });
    anim('#cracks', 31.6, 1.2, { draw: [0, 1] }, 'out');
    fx(32.4, 33.0, (t, p, lt) => $('fearHead').setAttribute('transform', `translate(${(Math.sin(lt * 70) * 3 * p).toFixed(1)},0)`));
    anim('#fearHead', 33.0, 0.05, { o: [1, 0] });
    hidden('#shards');
    anim('#shards', 33.0, 0.01, { o: [0, 1] });
    fx(33.0, 33.6, (t, p, lt) => {
      $('shards').querySelectorAll('.shard').forEach(s => {
        const cx = +s.dataset.cx, cy = +s.dataset.cy, rr = +s.dataset.r;
        const k = Ease.out(clamp(lt / 0.55));
        s.setAttribute('transform', `translate(${(cx * k * 1.7).toFixed(1)},${(cy * k * 1.5 + 80 * k * k).toFixed(1)}) rotate(${(rr * 180 * k).toFixed(1)} ${cx} ${cy})`);
      });
    });
    // "half the war is won" + "the real secret is ahead" — victorious warrior with trophy
    hidden('#arena'); show('#arena', 33.4, null, 0.25);
    instant('#glad', 33.4);
    anim('#glad', 33.4, 3.77, { s: [0.92, 1.05], y: [12, 0] }, 'linear');
    fx(33.4, R4, (t, p, lt) => {
      $('dust').querySelectorAll('.dust').forEach((d, i) => {
        d.setAttribute('cx', (+d.dataset.x + Math.sin(lt * 2 + i) * 20 + lt * d.dataset.v * 0.5).toFixed(1));
        d.setAttribute('cy', (+d.dataset.y - lt * d.dataset.v).toFixed(1));
        d.setAttribute('opacity', (0.6 * (1 - lt / 4)).toFixed(2));
      });
    });
  }

  /* =====================================================================
     SCENE 9–10 · RULE 4 — LASER FOCUS · Miyamoto Musashi (37.17 – 46.93)
     ===================================================================== */
  {
    const T = R4;
    const slash = `<ellipse cx="0" cy="0" rx="10" ry="70" fill="#d8ebff" filter="url(#glowBlue)" transform="rotate(30)"/>`;
    const samurai = A.wash([[0, 80, 240, 230, C.lav, 0.4], [-140, -40, 90, 90, C.indigo, 0.35]], 101) +
      A.bust({ hair: 'topknot', cloth: 'gi', eyes: 'stern', stubble: true }) +
      `<g transform="translate(-150,230) rotate(-28)"><g id="katana">${A.katana(420)}</g></g>` +
      `<g id="kGlint" filter="url(#glowBlue)"><path d="M-160,236 C-30,180 120,120 230,40" stroke="#bfe0ff" stroke-width="7" fill="none" stroke-linecap="round"/></g>` +
      `<path id="kArc" class="ink2 thin" d="M-260,-120 C-140,-240 100,-260 240,-160" stroke-dasharray="6 8"/>`;
    const rr = rng(123);
    let roads = '';
    for (let i = 0; i < 11; i++) {
      const x0 = 160 + rr() * 560, y0 = 280 + rr() * 200;
      let d = `M${x0.toFixed(0)},${y0.toFixed(0)}`, x = x0, y = y0;
      for (let k = 0; k < 3; k++) {
        const nx = 140 + rr() * 600, ny = y + 160 + rr() * 140;
        d += ` C${(x + (rr() - 0.5) * 500).toFixed(0)},${(y + 60).toFixed(0)} ${(nx + (rr() - 0.5) * 500).toFixed(0)},${(ny - 60).toFixed(0)} ${nx.toFixed(0)},${ny.toFixed(0)}`;
        x = nx; y = ny;
      }
      roads += `<path class="ink" d="${d}" stroke="#3a3946" stroke-width="30"/><path class="ink" d="${d}" stroke="#77768a" stroke-width="22"/><path class="ink2" d="${d}" stroke="#f1ecdf" stroke-width="2" stroke-dasharray="10 12"/>`;
    }
    const beam = `<polygon points="330,1120 430,1120 382,470" fill="url(#beam)" opacity="0.95" filter="url(#glowSoft)"/>` +
      `<circle cx="382" cy="470" r="70" fill="url(#rgGlow)"/><path d="M262,470 L502,470" stroke="#fff" stroke-width="3" filter="url(#glowWhite)"/>`;
    // samurai in profile = profile face + topknot
    const prof = A.profile() + `<ellipse class="fillwash" cx="-46" cy="-122" rx="16" ry="13" fill="${C.ink}"/><ellipse class="ink" cx="-46" cy="-122" rx="16" ry="13"/>`;
    const doodles = `<g class="doodle"><text x="60" y="500" class="hand" font-size="64" fill="${C.ink}">#!?</text></g>` +
      `<g class="doodle"><text x="200" y="690" class="hand" font-size="54" fill="${C.ink}">#!?!</text></g>` +
      `<g class="doodle"><path class="ink" d="M90,640 c20,-20 40,20 20,30 c-30,10 -40,-40 0,-50 c40,-8 60,40 30,60" /></g>` +
      `<g class="doodle"><path class="ink" d="M40,800 l30,-40 l10,30 l30,-50 l10,40 l30,-30 l-10,60 l30,10 l-50,20 l10,30 l-40,-20 l-30,30 l0,-40 l-40,0 l30,-20Z" fill="#f4efe6"/><text x="70" y="830" class="bang" font-size="28" fill="${C.ink}">!!</text></g>` +
      `<g class="doodle"><path class="ink" d="M230,420 c30,-30 60,10 30,30 c-40,20 -50,-40 0,-40 c50,0 40,60 0,60"/></g>` +
      `<g class="doodle"><text x="40" y="960" class="hand" font-size="46" fill="${C.ink}">*&amp;%!</text></g>` +
      `<g class="doodle"><path class="ink" d="M220,900 C260,860 300,940 250,950 C200,960 210,880 270,890 C320,900 300,980 240,980"/></g>`;
    const fogL = A.wash([[110, 640, 210, 420, '#8d8e98', 0.8], [620, 640, 160, 420, '#9a9ba5', 0.7], [360, 300, 360, 140, '#a2a3ad', 0.6]], 141, 'fog');
    const closeSam = A.wash([[0, 0, 300, 360, C.lav, 0.35], [140, -120, 140, 140, C.indigo, 0.3]], 151) +
      A.face({ eyes: 'stern', stubble: true }) + A.hair('topknot') + A.clothes('gi') +
      `<g id="samEyes" filter="url(#glowBlue)"><circle cx="-28" cy="-21" r="4" fill="#cfe6ff"/><circle cx="28" cy="-21" r="4" fill="#cfe6ff"/><path d="M-90,-21 L-40,-21 M40,-21 L90,-21" stroke="#bcdcff" stroke-width="2"/></g>`;

    scene('s5', T, R5,
      place('r4title', 0, 0, 1, A.title('r4t', 'RULE 4: LASER FOCUS', 70, 38)) +
      place('slash', 360, 470, 1, slash) +
      place('samurai', 360, 560, 1.2, samurai) + A.caption('capMusashi', 'Miyamoto Musashi', 300, 1010) +
      `<g id="maze">` +
      place('roads', 0, 0, 1, `<g opacity="0.95">${roads}</g>`) +
      place('beam', 0, 0, 1, beam) +
      place('prof', 110, 600, 1.7, prof) +
      `<g id="doodles">${doodles}</g>` +
      place('fog', 0, 0, 1, fogL) +
      `</g>` +
      place('closeSam', 360, 640, 2.3, closeSam),
      { fadeIn: 0.1, fadeOut: 0.3 });

    anim('#r4t-t', T + 0.05, 0.7, { reveal: [0, 1] });
    anim('#r4t-u', T + 0.5, 0.4, { draw: [0, 1] });
    hidden('#slash');
    anim('#slash', T + 0.05, 0.4, { o: [0, 1], s: [0.1, 1] }, 'out');
    anim('#slash', T + 0.6, 0.2, { o: [1, 0] });
    // Musashi (name) 37.85 – 40.25
    show('#samurai', 37.85, 40.25, 0.15, 0.3);
    drawIn('#samurai', 37.85, 0.9, 0.45);
    capIn('capMusashi', 38.3, 40.2);
    hidden('#kGlint');
    anim('#kGlint', 39.2, 0.2, { o: [0, 1] });
    anim('#kGlint', 39.35, 0.5, { draw: [0, 1] }, 'out');
    anim('#kGlint', 39.9, 0.3, { o: [1, 0.5] });
    anim('#katana', 39.15, 0.45, { r: [0, -16], x: [0, 40] }, 'back');
    anim('#kArc', 39.25, 0.4, { draw: [0, 1] });
    // "once you understand your path…" — tangled roads, one blue path
    hidden('#maze'); show('#maze', 40.1, 45.4, 0.25, 0.3);
    anim('#roads', 40.1, 0.9, { draw: [0, 1] }, 'out');
    drawIn('#prof', 40.15, 0.8, 0.4);
    hidden('#beam');
    anim('#beam', 41.3, 0.5, { o: [0, 1] }, 'out');
    anim('#beam', 41.3, 0.7, { revealY: [0, 1] }, 'out');
    anim('#roads', 41.5, 2.2, { s: [1, 1.05] }, 'linear');
    anim('#prof', 42.4, 0.6, { x: [0, 60], y: [0, -40], s: [1, 1.12] }, 'inOut');
    // "your focus must never waver" — distractions, then fog clears them
    document.querySelectorAll('#doodles .doodle').forEach((d, i) => {
      anim(d, 0, 0.01, { o: [0, 0] });
      anim(d, 43.5 + i * 0.1, 0.3, { o: [0, 1], s: [0.3, 1] }, 'back');
      anim(d, 44.6, 0.4, { o: [1, 0] });
    });
    fx(43.5, 44.7, (t, p, lt) => $('doodles').setAttribute('transform', `translate(${(Math.sin(lt * 50) * 3).toFixed(1)},${(Math.cos(lt * 43) * 2).toFixed(1)})`));
    hidden('#fog');
    anim('#fog', 44.4, 0.4, { o: [0, 1] });
    anim('#fog', 45.0, 0.6, { o: [1, 0], s: [1, 1.2] });
    // close-up samurai, intense eyes
    hidden('#closeSam'); show('#closeSam', 45.2, null, 0.35);
    instant('#closeSam', 45.2);
    anim('#closeSam', 45.2, 1.73, { s: [1.0, 1.08] }, 'linear');
    hidden('#samEyes');
    anim('#samEyes', 45.9, 0.25, { o: [0, 1] }, 'out');
  }

  /* =====================================================================
     SCENE 11–13 · RULE 5 — MASTER YOUR MIND · Marcus Aurelius (46.93 – 66.0)
     ===================================================================== */
  {
    const T = R5;
    const stroke = `<path class="ink" d="M-40,-20 L-58,60 M-40,-20 L90,-40" stroke="${C.blue}" stroke-width="10" fill="none" filter="url(#rough)"/>`;
    const auraWash = A.wash([[0, 60, 260, 270, '#6e62b8', 0.42], [150, -30, 120, 150, '#8fa4ff', 0.45], [-170, 60, 100, 150, '#9d7fd0', 0.42], [0, 300, 240, 80, C.indigo, 0.35]], 171);
    const philBase = o => A.bust(Object.assign({ hair: 'curly', beard: true, cloth: 'robe', skin: '#d9b896' }, o)) + `<g transform="translate(0,262)">${A.statuette()}</g>`;
    const philOpen = philBase({ eyes: 'stern' });
    const philDark = philBase({ angry: true, dark: true });
    const philCalm = philBase({ eyes: 'closed', smile: true });
    const aura = `<ellipse cx="0" cy="60" rx="230" ry="270" fill="none" stroke="#a9b8ff" stroke-width="8" filter="url(#glowSoft)"/><ellipse cx="0" cy="60" rx="220" ry="262" fill="#b2a8ff" opacity="0.12"/>`;
    const arrowsDef = [[-1, -0.6], [1, -0.4], [-1, 0.5], [1, 0.6], [-0.3, -1], [0.4, -1], [0.95, 0.1]];
    const arrows = arrowsDef.map((d, i) => `<g class="arrow" data-i="${i}" opacity="0">${A.arrow(130)}</g>`).join('');
    const storms = `<g id="storms"><text x="110" y="420" class="hand" font-size="44" fill="#7a2a22">anger</text><text x="500" y="470" class="hand" font-size="44" fill="#3b3d5a">fear</text><text x="80" y="760" class="hand" font-size="40" fill="#3b3d5a">doubt</text>` +
      `<path class="ink" stroke="#7a2a22" d="M520,700 c30,-30 60,10 30,30 c-40,20 -50,-40 0,-40 c50,0 40,60 0,60"/><path class="ink" d="M160,560 c20,-20 40,20 20,30 c-30,10 -40,-40 0,-50 c40,-8 60,40 30,60"/></g>`;
    const golden = `<circle cx="0" cy="0" r="420" fill="url(#rgGold)" opacity="0.8"/>`;
    const word = 'UNDEFEATABLE';
    let letters = '';
    const lw = 52, startX = 360 - (word.length - 1) * lw / 2;
    for (let i = 0; i < word.length; i++) letters += `<g transform="translate(${startX + i * lw},0)"><text class="bang letter" x="0" y="0" font-size="96" text-anchor="middle" fill="${C.dark}" stroke="#3a2a0a" stroke-width="2" transform="rotate(${((i % 3) - 1) * 2})">${word[i]}</text></g>`;
    let motes = '';
    const mr = rng(301);
    for (let i = 0; i < 40; i++) motes += `<circle class="mote" data-x="${(80 + mr() * 560).toFixed(0)}" data-y="${(300 + mr() * 700).toFixed(0)}" data-v="${(20 + mr() * 50).toFixed(0)}" r="${(1.5 + mr() * 3.5).toFixed(1)}" fill="#ffd979" opacity="0"/>`;
    let rays = '';
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; rays += `<line x1="${(Math.cos(a) * 120).toFixed(1)}" y1="${(Math.sin(a) * 60).toFixed(1)}" x2="${(Math.cos(a) * 290).toFixed(1)}" y2="${(Math.sin(a) * 200).toFixed(1)}" stroke="${i % 2 ? '#ffd24a' : '#ff9d2a'}" stroke-width="${i % 3 ? 4 : 7}" stroke-linecap="round"/>`; }
    let sparks = '';
    const sk = rng(401);
    for (let i = 0; i < 46; i++) sparks += `<path class="sk" data-a="${(sk() * 6.283).toFixed(3)}" data-v="${(140 + sk() * 300).toFixed(0)}" data-d="${(sk() * 0.5).toFixed(2)}" d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2Z" fill="${sk() > 0.5 ? '#fff3b0' : '#ffc23a'}" opacity="0"/>`;
    const button = `<g id="btnRays" filter="url(#glowGold)">${rays}</g>` +
      `<g id="btn" filter="url(#glowGold)"><rect x="-150" y="-44" width="300" height="88" rx="26" fill="url(#goldG)" stroke="#6a440c" stroke-width="3"/>` +
      `<rect x="-138" y="-36" width="276" height="24" rx="12" fill="#fff" opacity="0.35"/>` +
      `<text x="0" y="19" class="bang" font-size="54" text-anchor="middle" fill="#3b2508">SUBSCRIBE</text></g>` +
      `<g id="sparks">${sparks}</g>` +
      `<g transform="translate(46,58)"><g id="cursor"><path d="M0,0 L0,-46 C0,-58 16,-58 16,-46 L16,-6 L18,-24 C18,-34 32,-34 32,-24 L32,-4 L34,-18 C34,-28 48,-28 48,-18 L48,0 L50,-10 C50,-20 64,-20 64,-10 L64,30 C64,60 44,74 22,74 C2,74 -10,62 -18,46 L-34,16 C-40,6 -28,-2 -20,6Z" fill="#fff" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/></g></g>`;

    scene('s6', T, DURATION + 1,
      place('r5title', 0, 0, 1, A.title('r5t', 'RULE 5: MASTER YOUR MIND', 66, 34)) +
      place('stroke5', 360, 520, 2.2, stroke) +
      place('golden', 360, 600, 1, golden) +
      place('auraWash', 360, 580, 1.1, auraWash) +
      place('aura', 360, 580, 1.15, aura) +
      place('philOpen', 360, 540, 1.1, philOpen) +
      place('philDark', 360, 540, 1.1, philDark) +
      place('philCalm', 360, 540, 1.1, philCalm) +
      A.caption('capMarcus', 'Marcus Aurelius', 300, 1050) +
      storms +
      `<g id="arrows">${arrows}</g>` +
      `<g id="motes">${motes}</g>` +
      `<g transform="translate(0,225)"><g id="word" filter="url(#glowGold)">${letters}</g></g>` +
      `<g transform="translate(360,1010)"><g id="sub">${button}</g></g>`,
      { fadeIn: 0.1, fadeOut: 0.01 });

    anim('#r5t-t', T + 0.05, 0.8, { reveal: [0, 1] });
    anim('#r5t-u', T + 0.5, 0.5, { draw: [0, 1] });
    show('#stroke5', T + 0.05, T + 0.7, 0.05, 0.2);
    anim('#stroke5', T + 0.05, 0.45, { draw: [0, 1] });
    // Marcus Aurelius (name) holding a classical sculpture, purple/blue watercolor aura
    hidden('#auraWash'); anim('#auraWash', 47.5, 0.9, { o: [0, 1], s: [0.7, 1] }, 'out');
    show('#philOpen', 47.5, 49.4, 0.15, 0.3);
    drawIn('#philOpen', 47.5, 1.0, 0.45);
    capIn('capMarcus', 48.0, 49.3);
    // "who controls anger, fear and wandering thoughts…" — the dark self
    hidden('#philDark');
    show('#philDark', 49.2, 51.4, 0.25, 0.3);
    instant('#philDark', 49.2);
    anim('#philDark', 49.2, 0.5, { bright: [1, 0.45] }, 'out');
    fx(49.4, 51.2, (t, p, lt) => $('philDark').setAttribute('transform', `translate(${(Math.sin(lt * 60) * 2).toFixed(1)},0)`));
    hidden('#storms');
    anim('#storms', 49.5, 0.4, { o: [0, 1], s: [0.6, 1] }, 'back');
    fx(49.5, 51.6, (t, p, lt) => $('storms').setAttribute('transform', `rotate(${(Math.sin(lt * 3) * 3).toFixed(2)} 360 600)`));
    anim('#storms', 51.3, 0.4, { o: [1, 0], s: [1, 1.3] });
    // "…hard for the world to defeat" — calm self, aura deflects arrows
    hidden('#philCalm');
    anim('#philCalm', 51.2, 0.35, { o: [0, 1] });
    instant('#philCalm', 51.2);
    hidden('#aura');
    anim('#aura', 51.4, 0.4, { o: [0, 1], s: [0.85, 1] }, 'out');
    fx(51.4, REMEMBER, (t, p, lt) => $('aura').firstElementChild.setAttribute('stroke-width', (7 + Math.sin(lt * 12) * 2.5).toFixed(2)));
    anim('#aura', REMEMBER, 0.5, { o: [1, 0.25] });
    const cxA = 360, cyA = 640;
    fx(52.0, 54.6, (t, p, lt) => {
      document.querySelectorAll('#arrows .arrow').forEach((a, i) => {
        const d = arrowsDef[i], len = Math.hypot(d[0], d[1]), ux = d[0] / len, uy = d[1] / len;
        const k = lt - i * 0.12;
        if (k < 0) { a.setAttribute('opacity', 0); return; }
        const R0 = 640, Rhit = 300, ang = Math.atan2(-uy, -ux) * 180 / Math.PI;
        let x, y, rot = ang, op = 1;
        if (k < 0.3) { const r = lerp(R0, Rhit, Ease.in(k / 0.3)); x = cxA + ux * r; y = cyA + uy * r; }
        else { const q = k - 0.3; const r = Rhit + q * 260; x = cxA + ux * r + q * 40; y = cyA + uy * r + q * q * 900; rot = ang + q * 520 * (i % 2 ? 1 : -1); op = clamp(1 - q / 0.9); }
        a.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)}) translate(-130,0)`);
        a.setAttribute('opacity', op.toFixed(2));
      });
    });
    anim('#arrows', 54.4, 0.3, { o: [1, 0] });
    // "remember: the greatest victory is over your own mind" — eyes closed, golden light, UNDEFEATABLE
    hidden('#golden');
    anim('#golden', REMEMBER + 0.1, 1.2, { o: [0, 1], s: [0.5, 1] }, 'out');
    anim('#philCalm', REMEMBER, 6, { s: [1, 1.05] }, 'linear');
    document.querySelectorAll('#word .letter').forEach((l, i) => {
      anim(l, 0, 0.01, { o: [0, 0] });
      anim(l, REMEMBER + 0.6 + i * 0.08, 0.25, { o: [0, 1], s: [2.2, 1] }, 'out');
    });
    fx(REMEMBER + 0.2, DURATION, (t, p, lt) => {
      $('motes').querySelectorAll('.mote').forEach((m, i) => {
        const y = +m.dataset.y - ((lt * m.dataset.v) % 400);
        m.setAttribute('cx', (+m.dataset.x + Math.sin(lt * 1.5 + i) * 14).toFixed(1));
        m.setAttribute('cy', y.toFixed(1));
        m.setAttribute('opacity', (clamp(lt / 1.2) * (0.35 + 0.35 * Math.sin(lt * 4 + i))).toFixed(2));
      });
    });
    // "follow and subscribe" — golden button, tap, sparks
    hidden('#sub');
    pop('#sub', SUBSCRIBE, 0.5, 0.3);
    hidden('#cursor');
    anim('#cursor', 61.9, 0.4, { o: [0, 1], x: [90, 0], y: [90, 0] }, 'out');
    anim('#cursor', 62.5, 0.12, { s: [1, 0.85] }, 'out');
    anim('#cursor', 62.62, 0.18, { s: [0.85, 1] }, 'out');
    anim('#btn', 62.5, 0.12, { s: [1, 0.92] }, 'out');
    anim('#btn', 62.62, 0.25, { s: [0.92, 1.06] }, 'back');
    hidden('#btnRays');
    anim('#btnRays', 62.6, 0.35, { o: [0, 1], s: [0.4, 1.05] }, 'out');
    fx(62.6, DURATION, (t, p, lt) => { $('btnRays').setAttribute('transform', `rotate(${(lt * 25).toFixed(1)})`); $('btnRays').style.opacity = (0.75 + 0.25 * Math.sin(lt * 14)).toFixed(2); });
    fx(62.6, DURATION, (t, p, lt) => {
      $('sparks').querySelectorAll('.sk').forEach(s => {
        if (lt < +s.dataset.d) { s.setAttribute('opacity', 0); return; }
        const k = ((lt - +s.dataset.d) % 1.4) / 1.4;
        const a = +s.dataset.a, v = +s.dataset.v;
        s.setAttribute('transform', `translate(${(Math.cos(a) * v * k).toFixed(1)},${(Math.sin(a) * v * k * 0.7 + 60 * k * k).toFixed(1)}) rotate(${(k * 200).toFixed(0)}) scale(${(1.4 - k).toFixed(2)})`);
        s.setAttribute('opacity', (1 - k).toFixed(2));
      });
    });
  }

  MV.renderAt(0);
})();
