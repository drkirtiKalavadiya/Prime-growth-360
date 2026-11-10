/* =========================================================================
   5 MINDSET RULES — timeline
   720x1280 · 30fps · 54.36s
   Scene map (seconds):
     0.00  Intro      "5 Mindset Rules" · kneeling warrior in rain → rises
     3.80  Scrolls    five scrolls draw in, glow, fire-padlock "5" bursts
     7.30  Eyes       extreme close-up of determined eyes
     9.10  Rule 1     Daily Steps   (glowing 1 · bust · mountain · stairs · overnight-success · summit)
    17.93  Rule 2     Patience Wins (electric 2 · general · hourglass · chess · knight in storm)
    27.00  Rule 3     Kill the Fear (blueprint 3 · laurel bust · fear shatters · glowing eyes · gladiator)
    35.90  Rule 4     Laser Focus   (slash · samurai · tangled roads + beam · distractions · fog clears)
    45.10  Rule 5     Master Your Mind (stroke · stoic bust · dark self · mask · aura vs arrows · UNDEFEATABLE · subscribe)
   ========================================================================= */
(function () {
  'use strict';
  const { scene, anim, fx, rng, clamp, lerp, Ease } = MV;
  const A = ART, C = ART.C, P = ART.P;
  const DURATION = 54.36;
  window.DURATION = DURATION;

  const svg = document.getElementById('film');
  MV.init(svg);
  document.getElementById('defsHost').outerHTML = A.defs;
  document.getElementById('bgHost').innerHTML = A.background();
  document.getElementById('fgHost').innerHTML = A.pen() + A.vignette() +
    `<rect id="flash" width="720" height="1280" fill="#fff" style="opacity:0"/>` +
    `<rect id="flashBlue" width="720" height="1280" fill="#cfe2ff" style="opacity:0"/>`;

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
  const bloom = (sel, t0, dur = 0.8, s0 = 0.75) => {
    anim(sel, t0, dur, { o: [0, 1], s: [s0, 1] }, 'out');
  };
  const pop = (sel, t0, dur = 0.5, s0 = 0.2) => {
    anim(sel, t0, dur * 0.6, { o: [0, 1] }, 'out');
    anim(sel, t0, dur, { s: [s0, 1] }, 'back');
  };
  const $ = id => document.getElementById(id);

  /* ---------- global: paper switch, pen idle, flashes ---------- */
  anim('#paperStack', 9.0, 0.3, { o: [1, 0] });
  anim('#paperFull', 9.0, 0.3, { o: [0, 1] });
  fx(0, DURATION, t => {
    const pen = $('pen');
    pen.setAttribute('transform', `translate(${(Math.sin(t * 1.7) * 2).toFixed(2)},${(Math.sin(t * 2.3) * 1.5).toFixed(2)}) rotate(${(Math.sin(t * 1.1) * 0.6).toFixed(2)} 180 0)`);
  });
  const flashAt = (id, t, up = 0.08, down = 0.35, peak = 1) => {
    anim('#' + id, t, up, { o: [0, peak] }, 'out');
    anim('#' + id, t + up, down, { o: [peak, 0] }, 'in');
  };
  flashAt('flash', 6.95, 0.25, 0.25, 1);
  flashAt('flashBlue', 9.02, 0.06, 0.3, 0.6);
  flashAt('flashBlue', 35.9, 0.06, 0.35, 0.5);
  flashAt('flash', 52.75, 0.06, 0.4, 0.55);

  /* ---------- rain particles helper ---------- */
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
     0. INTRO + SCROLLS (0 – 7.3)
     ===================================================================== */
  {
    const titleBlock = A.title('t0', '5 Mindset Rules', 112, 58, false) + A.flourish('t0-fl', 360, 152);

    // storm wash + rain behind warrior
    const storm = A.wash([[360, 560, 290, 270, C.slate, 0.55], [250, 470, 170, 150, C.storm, 0.55], [480, 520, 170, 160, C.storm, 0.5],
      [360, 820, 300, 100, C.lav, 0.5], [360, 420, 230, 120, '#7d86a8', 0.4]], 3);
    // battlefield silhouettes (spears + broken flags)
    let field = '';
    const r = rng(9);
    for (let i = 0; i < 14; i++) {
      const x = 90 + r() * 540, y = 700 + r() * 140, h = 80 + r() * 120, a = -12 + r() * 24;
      field += `<path class="ink2 thin" d="M${x},${y} l${(Math.sin(a * Math.PI / 180) * h).toFixed(1)},${-h}" stroke="#4a5070" opacity="0.6"/>`;
    }
    const mist = A.wash([[360, 900, 330, 70, '#8c93b4', 0.65], [200, 880, 150, 50, C.slate, 0.5], [540, 890, 150, 55, C.slate, 0.5]], 61);

    const kneelArmL = 'M-82,-450 C-100,-420 -80,-384 -26,-372 L-22,-350 C-84,-352 -112,-392 -70,-430';
    const kneelArmR = A.mirror(kneelArmL);
    const warriorKneel =
      `<g transform="translate(0,-330) rotate(180)">${A.sword(300)}</g>` +
      A.figure('warrior', { helmet: 'spike', armL: kneelArmL, armR: kneelArmR, handL: [-14, -360], handR: [14, -360], headId: 'wkHead', eyes: 'closed', cape: '#3d4466' });
    const warriorStand =
      A.figure('warrior', { helmet: 'spike', cape: '#3d4466', eyes: 'stern' }) +
      `<g transform="translate(112,-290) rotate(200)">${A.sword(300)}</g>`;
    const splash = A.splatter(360, 860, 260, 70, 4, C.storm, 7);

    let scrolls = '';
    [300, 425, 550, 675, 800].forEach((y, i) => { scrolls += place('scroll' + i, 360, y, 1, A.scroll(330)); });
    const scrollGlow = A.wash([[360, 520, 260, 330, '#8f8ce0', 0.45], [300, 700, 140, 120, '#b6b4ff', 0.4]], 71, 'wc2');

    let flames = '';
    const fr = rng(5);
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI / 2 + (fr() - 0.5) * 2.6, l = 90 + fr() * 120;
      const x = Math.cos(a) * 40, y = Math.sin(a) * 40;
      flames += `<path class="flame" data-a="${a.toFixed(3)}" data-l="${l.toFixed(0)}" d="M${(x - 12).toFixed(1)},${y.toFixed(1)} Q${(x + Math.cos(a) * l * 0.5).toFixed(1)},${(y + Math.sin(a) * l * 0.5 - 20).toFixed(1)} ${(x + Math.cos(a) * l).toFixed(1)},${(y + Math.sin(a) * l).toFixed(1)} Q${(x + Math.cos(a) * l * 0.4 + 10).toFixed(1)},${(y + Math.sin(a) * l * 0.4).toFixed(1)} ${(x + 12).toFixed(1)},${y.toFixed(1)}Z" fill="${i % 2 ? '#ffb020' : '#ff7a00'}" opacity="0.85"/>`;
    }
    let sparks = '';
    for (let i = 0; i < 40; i++) sparks += `<circle class="spark" data-a="${(fr() * 6.283).toFixed(3)}" data-v="${(120 + fr() * 260).toFixed(0)}" r="${(2 + fr() * 3).toFixed(1)}" fill="#ffd34d"/>`;
    const lock = `<g filter="url(#glowGold)">${flames}</g>${A.padlock()}<text x="0" y="66" class="bang" font-size="64" text-anchor="middle" fill="#fff6d0" stroke="#8a5a12" stroke-width="2" filter="url(#glowGold)">5</text><g id="lockSparks">${sparks}</g>`;

    scene('s0', 0, 7.3,
      place('t0wrap', 0, 0, 1, titleBlock) +
      `<g id="introArt">` +
      place('storm0', 0, 0, 1, storm) + place('field0', 0, 0, 1, field) + rainLayer('rain0', 80, 3) +
      `<g transform="translate(360,1090) scale(1.05)">` +
      `<g id="wKneelWrap"><g id="wKneel">${warriorKneel}</g></g>` +
      `<g id="wStandWrap"><g id="wStand">${warriorStand}</g></g></g>` +
      place('mist0', 0, 0, 1, mist) + place('splash0', 0, 0, 1, splash) +
      `</g>` +
      place('scrollGlow', 0, 0, 1, scrollGlow) +
      `<g id="scrolls">${scrolls}</g>` +
      `<g transform="translate(360,770)"><g id="lock">${lock}</g></g>`,
      { fadeIn: 0.01, fadeOut: 0.05 });

    // title
    anim('#t0-t', 0.0, 0.9, { reveal: [0, 1] }, 'inOut');
    anim('#t0-fl', 0.6, 0.7, { draw: [0, 1] });
    anim('#t0wrap', 6.9, 0.3, { o: [1, 0] });
    // storm + warrior kneeling
    bloom('#storm0', 0.0, 0.9, 0.85);
    show('#field0', 0.2, null, 0.6);
    show('#rain0', 0.0, null, 0.4);
    animateRain('rain0', 0, 3.8);
    anim('#wKneelWrap', 0, 0.01, { o: [1, 1] });
    $('wKneelWrap').setAttribute('transform', 'translate(0,170)');
    drawIn('#wKneel', 0.0, 1.2, 0.4, 0.6);
    anim('#wkHead', 0, 0.01, { r: [14, 14], y: [10, 10] });
    anim('#wkHead', 1.6, 0.5, { r: [14, 0], y: [10, 0] });
    // rise
    anim('#wKneelWrap', 2.1, 0.25, { o: [1, 0] });
    anim('#wStand', 2.05, 0.01, { draw: [1, 1], wash: [1, 1] });
    anim('#wStandWrap', 0, 0.01, { o: [0, 0] });
    anim('#wStandWrap', 2.1, 0.2, { o: [0, 1] });
    anim('#wStand', 2.1, 0.7, { y: [120, 0], s: [0.96, 1] }, 'out');
    show('#mist0', 0.1, null, 0.6);
    anim('#splash0', 0, 0.01, { o: [0, 0] });
    anim('#splash0', 2.15, 0.5, { o: [0, 1], s: [0.6, 1.05] }, 'out');
    anim('#introArt', 3.6, 0.35, { o: [1, 0] });
    // scrolls
    [0, 1, 2, 3, 4].forEach(i => {
      anim('#scroll' + i, 3.7 + i * 0.28, 0.25, { o: [0, 1] });
      drawIn('#scroll' + i, 3.7 + i * 0.28, 0.6, 0.5, 0.4);
      anim('#scroll' + i, 3.7 + i * 0.28, 0.5, { sx: [0.3, 1] }, 'out');
    });
    anim('#scrollGlow', 0, 0.01, { o: [0, 0] });
    anim('#scrollGlow', 5.4, 0.5, { o: [0, 1], s: [0.7, 1] }, 'out');
    anim('#scrolls', 6.3, 0.5, { o: [1, 0.55] });
    // padlock
    pop('#lock', 6.15, 0.45, 0.3);
    fx(6.15, 7.3, (t, p, lt) => {
      $('lock').querySelectorAll('.flame').forEach((f, i) => {
        const k = 0.75 + 0.35 * Math.sin(lt * 18 + i * 1.7);
        f.setAttribute('transform', `scale(${k.toFixed(3)})`);
        f.style.transformOrigin = '0 0';
      });
      const burst = clamp((t - 6.75) / 0.55);
      $('lockSparks').querySelectorAll('.spark').forEach(sp => {
        const a = +sp.dataset.a, v = +sp.dataset.v;
        sp.setAttribute('cx', (Math.cos(a) * v * burst * 1.6).toFixed(1));
        sp.setAttribute('cy', (Math.sin(a) * v * burst * 1.6 + 200 * burst * burst).toFixed(1));
        sp.setAttribute('opacity', (burst > 0 ? 1 - burst : 0).toFixed(2));
      });
    });
    anim('#lock', 6.75, 0.5, { s: [1, 1.5] }, 'in');
  }

  /* =====================================================================
     1. EYES CLOSE-UP (7.3 – 9.1)
     ===================================================================== */
  {
    const big = A.face({ eyes: 'stern', stubble: true }) + A.hair('messy');
    let scratches = '';
    const r = rng(17);
    for (let i = 0; i < 30; i++) { const x = r() * 720, y = r() * 1280; scratches += `<line x1="${x}" y1="${y}" x2="${x - 6}" y2="${y + 30 + r() * 30}" stroke="#55597a" stroke-width="1.2" opacity="0.5"/>`; }
    scene('s1', 7.3, 9.1,
      place('eyesWash', 0, 0, 1, A.wash([[360, 560, 360, 320, C.skin, 0.4], [200, 400, 200, 200, C.lav, 0.3]], 23)) +
      `<g transform="translate(360,700) scale(5.2)"><g id="eyesFace">${big}</g></g>` +
      `<g id="eyesScratch">${scratches}</g>`,
      { fadeIn: 0.15, fadeOut: 0.1 });
    anim('#eyesFace', 7.3, 0.01, { draw: [1, 1], wash: [1, 1] });
    anim('#eyesFace', 7.3, 1.8, { s: [1.0, 1.12], y: [0, -6] }, 'linear');
    anim('#eyesScratch', 7.3, 1.8, { y: [0, 60] }, 'linear');
  }

  /* =====================================================================
     2. RULE 1 — DAILY STEPS (9.1 – 17.93)
     ===================================================================== */
  {
    const T = 9.1;
    // glowing "1" with blue flames
    let bflames = '';
    const r = rng(41);
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.2, l = 70 + r() * 90;
      bflames += `<path class="bflame" d="M-14,0 Q${(Math.cos(a) * l * 0.5).toFixed(1)},${(Math.sin(a) * l * 0.5 - 10).toFixed(1)} ${(Math.cos(a) * l).toFixed(1)},${(Math.sin(a) * l).toFixed(1)} Q${(Math.cos(a) * l * 0.3 + 8).toFixed(1)},${(Math.sin(a) * l * 0.3).toFixed(1)} 14,0Z" fill="#5d9bff" opacity="0.7"/>`;
    }
    const one = `<g filter="url(#glowBlue)">${bflames}</g>` +
      `<text x="0" y="80" class="bang" font-size="230" text-anchor="middle" fill="#d9ecff" stroke="#3b6dff" stroke-width="4" filter="url(#glowBlue)">1</text>`;

    const bust1 = A.wash([[0, 40, 230, 240, C.lav, 0.4], [80, -60, 120, 120, C.indigo, 0.3]], 44) + A.bust({ helmet: 'crest', cloth: 'armor', eyes: 'stern' });
    const youngMan = A.bust({ hair: 'messy', cloth: 'tunic', eyes: 'open', stubble: true });
    const mtn = A.mountain();
    const steps = A.stairs(7, 68, 40);
    const walker = A.figure('traveller', { hair: 'messy', eyes: 'open' });
    const ticket = `<g transform="rotate(-8)">
        <rect x="-170" y="-110" width="340" height="220" rx="8" fill="#f4eee2" stroke="${C.ink}" stroke-width="3"/>
        <rect x="-150" y="-92" width="300" height="184" rx="4" fill="none" stroke="${C.rust}" stroke-width="2" stroke-dasharray="8 6"/>
        <text x="0" y="-12" class="bang" font-size="64" text-anchor="middle" fill="${C.ink}">OVERNIGHT</text>
        <text x="-20" y="58" class="bang" font-size="64" text-anchor="middle" fill="${C.ink}">SUCCESS</text>
        <circle cx="122" cy="44" r="30" fill="url(#goldG)" stroke="${C.ink}" stroke-width="2.5"/>
        <text x="122" y="58" class="bang" font-size="40" text-anchor="middle" fill="#6a440c">$</text></g>`;
    const ticketL = `<g clip-path="url(#clipL)">${ticket}</g>`, ticketR = `<g clip-path="url(#clipR)">${ticket}</g>`;
    const brick = A.stairs(9, 76, 46, true);
    const tiny = A.figure('traveller', { hair: 'messy', eyes: 'open' });

    scene('s2', T, 17.93,
      `<defs><clipPath id="clipL"><path d="M-260,-200 L10,-200 L-20,-40 L20,40 L-10,200 L-260,200Z"/></clipPath>
             <clipPath id="clipR"><path d="M260,-200 L10,-200 L-20,-40 L20,40 L-10,200 L260,200Z"/></clipPath></defs>` +
      place('r1title', 0, 0, 1, A.title('r1t', 'Rule 1: Daily steps', 78, 40)) +
      place('one', 360, 600, 1, one) +
      place('bust1', 360, 560, 1.22, bust1) +
      `<g id="climb">` +
      place('mtn1', 500, 430, 1.05, mtn) +
      place('steps1', 250, 1000, 1, steps) +
      place('man1', 230, 760, 1.25, youngMan) +
      `<g id="walkerWrap"><g id="walker">${walker}</g></g>` +
      `</g>` +
      `<g transform="translate(360,620)"><g id="ticket">` +
      A.splatter(0, 0, 260, 60, 12, C.indigo, 10) +
      `<g id="tL">${ticketL}</g><g id="tR">${ticketR}</g></g></g>` +
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
    // 1
    pop('#one', T + 0.25, 0.5, 0.4);
    fx(T + 0.25, T + 1.4, (t, p, lt) => {
      $('one').querySelectorAll('.bflame').forEach((f, i) => {
        f.setAttribute('transform', `scale(${(0.8 + 0.3 * Math.sin(lt * 16 + i)).toFixed(3)})`);
      });
    });
    anim('#one', T + 1.1, 0.3, { o: [1, 0], s: [1, 0.6] }, 'in');
    // helmeted bust
    show('#bust1', T + 1.3, T + 2.6, 0.15, 0.3);
    drawIn('#bust1', T + 1.3, 0.9);
    // young man + mountain
    show('#climb', T + 2.4, 15.75 - 0.0, 0.3, 0.3);
    drawIn('#mtn1', T + 2.4, 0.9, 0.3);
    drawIn('#man1', T + 2.5, 0.9, 0.5);
    anim('#man1', T + 2.5, 2.0, { x: [0, 10] }, 'linear');
    drawIn('#steps1', T + 3.4, 0.9, 0.5);
    anim('#man1', T + 4.4, 0.4, { o: [1, 0] });
    // walker climbs stairs
    show('#walker', T + 4.4, 15.2, 0.3, 0.3);
    anim('#walker', T + 4.4, 0.01, { draw: [1, 1], wash: [1, 1] });
    fx(T + 4.4, 15.75, (t, p, lt) => {
      const k = clamp(lt / 1.4);
      const stepIdx = Math.min(6, k * 6.5);
      const x = 250 + 60 + stepIdx * 68 * 0.7, y = 1000 - stepIdx * 40;
      const bob = Math.abs(Math.sin(lt * 9)) * 6;
      $('walkerWrap').setAttribute('transform', `translate(${x.toFixed(1)},${(y - bob).toFixed(1)}) scale(0.36)`);
    });
    // overnight success
    anim('#ticket', 0, 0.01, { o: [0, 0] });
    pop('#ticket', 14.85, 0.45, 0.2);
    fx(14.85, 15.9, (t, p, lt) => {
      const sh = lt < 0.5 ? Math.sin(lt * 70) * 3 * (lt / 0.5) : 0;
      const tear = clamp((lt - 0.5) / 0.4);
      $('tL').setAttribute('transform', `translate(${(-tear * 120 + sh).toFixed(1)},${(tear * 60).toFixed(1)}) rotate(${(-tear * 18).toFixed(1)})`);
      $('tR').setAttribute('transform', `translate(${(tear * 120 + sh).toFixed(1)},${(tear * 80).toFixed(1)}) rotate(${(tear * 22).toFixed(1)})`);
    });
    anim('#ticket', 15.55, 0.25, { o: [1, 0] });
    // summit
    show('#summit', 15.7, null, 0.3);
    drawIn('#brick', 15.7, 1.0, 0.2, 0.6);
    drawIn('#mtn2', 15.7, 0.8, 0.3);
    anim('#summit', 15.7, 2.3, { s: [1.06, 1] }, 'out');
  }

  /* =====================================================================
     3. RULE 2 — PATIENCE WINS (17.93 – 27.0)
     ===================================================================== */
  {
    const T = 17.93;
    const two = `<text x="0" y="110" class="bang" font-size="320" text-anchor="middle" fill="none" stroke="#bcdcff" stroke-width="7" filter="url(#glowBlue)">2</text>`;
    let zaps = '';
    for (let i = 0; i < 5; i++) zaps += A.lightning(-90 + i * 45, -150, 260, 100 + i);
    const general = A.wash([[-20, 60, 200, 230, C.ochre, 0.3], [-120, -60, 120, 120, C.lav, 0.35]], 52) +
      A.bust({ helmet: 'bicorne', hair: 'neat', cloth: 'uniform', eyes: 'stern' });
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
      `<g transform="translate(110,-290) rotate(205)">${A.sword(240)}</g>` +
      `<g transform="translate(-70,-330) scale(1.15)">${A.shield()}</g>`;

    scene('s3', T, 27.0,
      place('r2title', 0, 0, 1, `<text id="r2a" x="360" y="80" class="title" font-size="50" text-anchor="middle">Rule 2:</text><text id="r2b" x="360" y="140" class="title" font-size="50" text-anchor="middle">Patience Wins</text>`) +
      `<g transform="translate(360,620)"><g id="two">${two}<g id="zaps">${zaps}</g></g></g>` +
      place('stormSky', 0, 0, 1, stormSky) +
      `<g id="bolts">${A.lightning(160, 190, 260, 7)}${A.lightning(250, 220, 200, 8)}</g>` +
      place('enemies', 0, 0, 1, enemies) +
      place('general', 230, 600, 1.05, general) +
      place('hglass', 580, 590, 1.05, A.hourglass()) +
      `<g transform="translate(360,960)"><g id="board">${board.svg}${pieces}${movingKnight}<g id="arcs">${arcs}</g></g></g>` +
      `<g transform="translate(470,1010)"><g id="hand">${A.hand()}</g></g>` +
      `<g transform="translate(400,960) scale(0.88)"><g id="knight">${knight}</g></g>`,
      { fadeIn: 0.1, fadeOut: 0.3 });

    anim('#r2a', T, 0.5, { reveal: [0, 1] });
    anim('#r2b', T + 0.35, 0.7, { reveal: [0, 1] });
    // electric 2
    pop('#two', T + 0.05, 0.45, 0.5);
    fx(T, T + 1.3, (t, p, lt) => {
      const zz = $('zaps'); zz.style.opacity = (Math.sin(lt * 50) > 0.2 ? 0.9 : 0.15).toFixed(2);
      $('two').firstElementChild.style.opacity = (0.75 + 0.25 * Math.sin(lt * 40)).toFixed(2);
    });
    anim('#two', T + 1.0, 0.3, { o: [1, 0] });
    // general + hourglass + board
    show('#general', T + 1.15, 23.2, 0.2, 0.35);
    drawIn('#general', T + 1.15, 1.0, 0.45);
    show('#hglass', T + 1.6, null, 0.2);
    drawIn('#hglass', T + 1.6, 0.8, 0.6, 0.5);
    fx(T + 2.4, 27.0, (t, p) => {
      const top = $('hglass').querySelector('.sandTop'), bot = $('hglass').querySelector('.sandBot');
      const k = clamp(p);
      top.setAttribute('transform', `translate(0,${(-60 + 60) * 0 + (1 - (1 - k * 0.8)) * 0}) `);
      top.style.transformBox = 'fill-box'; top.style.transformOrigin = 'center bottom';
      top.style.transform = `scaleY(${(1 - k * 0.8).toFixed(3)})`;
      bot.style.transformBox = 'fill-box'; bot.style.transformOrigin = 'center bottom';
      bot.style.transform = `scaleY(${(0.35 + k * 0.65).toFixed(3)})`;
      $('hglass').querySelector('.sandStream').style.opacity = (0.5 + 0.5 * Math.sin(t * 30)).toFixed(2);
    });
    show('#board', T + 2.5, null, 0.2);
    drawIn('#board', T + 2.5, 1.0, 0.4);
    // hand moves knight piece
    anim('#hand', 0, 0.01, { o: [0, 0] });
    anim('#hand', 21.5, 0.5, { o: [0, 1], x: [220, 0] }, 'out');
    anim('#hand', 22.2, 0.6, { x: [0, -60], y: [0, -30] }, 'inOut');
    anim('#knightPiece', 22.2, 0.6, { x: [0, -60], y: [0, -30] }, 'inOut');
    anim('#hand', 22.9, 0.4, { o: [1, 0], x: [-60, 200] }, 'in');
    // storm + knight
    show('#stormSky', 23.0, null, 0.5);
    show('#enemies', 23.2, null, 0.5);
    anim('#enemies', 23.2, 3.8, { x: [-40, 20] }, 'linear');
    show('#bolts', 23.3, null, 0.1);
    fx(23.3, 27, (t, p, lt) => { $('bolts').style.opacity = ((Math.sin(lt * 7) > 0.85 || Math.sin(lt * 3.3 + 1) > 0.95) ? 1 : 0.08).toFixed(2); });
    show('#knight', 23.15, null, 0.2);
    drawIn('#knight', 23.15, 1.2, 0.5);
    anim('#arcs', 0, 0.01, { o: [0, 0] });
    anim('#arcs', 24.3, 0.1, { o: [0, 1] });
    anim('#arcs', 24.3, 0.8, { draw: [0, 1] });
    anim('#board', 23.2, 0.6, { y: [0, 40] });
  }

  /* =====================================================================
     4. RULE 3 — KILL THE FEAR (27.0 – 35.9)
     ===================================================================== */
  {
    const T = 27.0;
    const three = `<circle class="ink2 thin" cx="0" cy="-60" r="70" stroke-dasharray="4 5"/><circle class="ink2 thin" cx="0" cy="70" r="80" stroke-dasharray="4 5"/>` +
      `<path class="ink2 thin" d="M-150,-140 L150,-140 M-150,160 L150,160 M-150,0 L150,0 M0,-200 L0,220"/>` +
      `<text id="threeT" x="0" y="150" font-family="Georgia, serif" font-size="400" text-anchor="middle" fill="url(#hatch)" stroke="${C.indigo}" stroke-width="5">3</text>`;
    const caesar = A.wash([[30, 20, 220, 220, C.lav, 0.45], [120, 80, 120, 120, C.ochre, 0.45], [-120, -40, 80, 80, C.indigo, 0.4]], 91) +
      A.bust({ statue: true, laurel: true, hair: 'neat', color: '#9a96a2', cloth: 'toga', eyes: 'stern' });
    // fear head silhouette (profile, facing right)
    const headD = 'M-150,200 C-170,120 -190,40 -170,-40 C-150,-150 -60,-200 30,-190 C120,-180 170,-110 160,-30 C170,-10 190,20 186,34 C176,42 168,44 164,48 C170,60 168,74 160,80 C164,92 160,104 150,110 C150,140 120,160 80,160 L60,200Z';
    let shards = '';
    const sr = rng(55);
    for (let gx = -180; gx < 190; gx += 52) for (let gy = -200; gy < 200; gy += 52) {
      const pts = [[gx + sr() * 52, gy + sr() * 20], [gx + 52 * sr(), gy + 30 + sr() * 30], [gx + sr() * 52, gy + 52]];
      shards += `<path class="shard" data-cx="${gx + 26}" data-cy="${gy + 26}" data-r="${(sr() * 2 - 1).toFixed(3)}" d="M${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' L')}Z" fill="${C.dark}"/>`;
    }
    const fear = `<g id="fearHead">${A.wash([[0, 0, 220, 230, '#4b5070', 0.6]], 33)}<path d="${headD}" fill="${C.dark}"/>` +
      `<text x="0" y="-40" class="bang" font-size="62" text-anchor="middle" fill="#e9e3d6">FEAR</text><text x="0" y="10" class="hand" font-size="40" text-anchor="middle" fill="#e9e3d6">of</text><text x="0" y="70" class="bang" font-size="62" text-anchor="middle" fill="#e9e3d6">LOSING</text></g>` +
      `<g id="shards" clip-path="url(#fearClip)">${shards}</g>`;
    const hero = A.wash([[0, 140, 260, 160, '#5a5f80', 0.5], [-160, 40, 100, 160, C.storm, 0.4]], 74) + A.bust({ hair: 'neat', cloth: 'tee', eyes: 'stern' }) +
      `<g id="eyeGlow" filter="url(#glowWhite)"><ellipse cx="-28" cy="-21" rx="10" ry="6" fill="#fff"/><ellipse cx="28" cy="-21" rx="10" ry="6" fill="#fff"/>` +
      `<path d="M-160,-21 L160,-21" stroke="#cfe0ff" stroke-width="3"/><circle cx="-28" cy="-21" r="16" fill="url(#rgGlow)"/><circle cx="28" cy="-21" r="16" fill="url(#rgGlow)"/></g>`;
    // gladiator
    const glArmL = 'M-82,-450 C-120,-470 -150,-520 -150,-566 L-126,-570 C-124,-530 -100,-490 -70,-430';
    const glad = A.figure('gladiator', { hair: 'neat', armL: glArmL, handL: [-138, -575], eyes: 'stern' }) +
      `<g transform="translate(-138,-660) scale(1.2)">${A.trophy()}</g>` +
      `<g transform="translate(112,-290) rotate(160)">${A.sword(220)}</g>` +
      `<g transform="translate(0,-548) scale(0.42)" filter="url(#glowWhite)"><ellipse cx="-28" cy="-21" rx="9" ry="5" fill="#fff"/><ellipse cx="28" cy="-21" rx="9" ry="5" fill="#fff"/></g>`;
    let crowd = '';
    const cr = rng(66);
    for (let i = 0; i < 26; i++) { const x = 20 + i * 27 + cr() * 10, y = 760 + cr() * 30; crowd += `<circle cx="${x}" cy="${y}" r="10" fill="#4a4a5a"/><path d="M${x - 14},${y + 70} L${x - 12},${y + 14} L${x + 12},${y + 14} L${x + 14},${y + 70}Z" fill="#4a4a5a"/>`; if (i % 6 === 2) crowd += `<path d="M${x},${y + 20} L${x},${y - 90} L${x + 34},${y - 80} L${x},${y - 66}" fill="#6b4a3a" stroke="#4a4a5a" stroke-width="3"/>`; }
    let dust = '';
    for (let i = 0; i < 30; i++) dust += `<circle class="dust" data-x="${(cr() * 720).toFixed(0)}" data-y="${(900 + cr() * 300).toFixed(0)}" data-v="${(20 + cr() * 60).toFixed(0)}" r="${(1.5 + cr() * 3).toFixed(1)}" fill="#6b5a48"/>`;

    scene('s4', T, 35.9,
      `<defs><clipPath id="fearClip"><path d="${headD}"/></clipPath></defs>` +
      place('r3title', 0, 0, 1, A.title('r3t', 'Rule 3: kill the fear', 70, 34)) +
      place('three', 360, 600, 1, three) +
      place('caesar', 360, 560, 1.18, caesar) +
      place('fear', 360, 640, 1.1, fear) +
      place('hero', 360, 560, 1.3, hero) +
      `<g id="arena">` +
      place('arenaSky', 0, 0, 1, A.wash([[360, 330, 360, 200, '#5d6078', 0.6], [160, 300, 200, 140, '#4a4d63', 0.55], [600, 380, 170, 130, '#6f7390', 0.5], [360, 980, 380, 160, C.ochre, 0.4]], 88)) +
      `<g filter="url(#soft)" opacity="0.55">${crowd}</g>` +
      `<g transform="translate(360,1120) scale(0.88)"><g id="glad">${glad}</g></g>` +
      `<g id="dust">${dust}</g>` +
      `</g>`,
      { fadeIn: 0.1, fadeOut: 0.05 });

    anim('#r3t-t', T, 0.7, { reveal: [0, 1] });
    anim('#r3t-u', T + 0.5, 0.4, { draw: [0, 1] });
    // blueprint 3
    show('#three', T, T + 1.35, 0.1, 0.25);
    anim('#three', T, 0.6, { draw: [0, 1] });
    anim('#threeT', T + 0.3, 0.8, { revealY: [0, 1] });
    // caesar
    show('#caesar', T + 1.2, 30.05, 0.2, 0.25);
    drawIn('#caesar', T + 1.2, 1.0, 0.5);
    anim('#caesar', T + 1.2, 2.8, { s: [0.96, 1.03] }, 'linear');
    // fear shatters
    show('#fear', 29.95, 31.0, 0.15, 0.2);
    anim('#fearHead', 30.5, 0.05, { o: [1, 0] });
    anim('#shards', 0, 0.01, { o: [0, 0] });
    anim('#shards', 30.5, 0.01, { o: [0, 1] });
    fx(30.5, 31.0, (t, p, lt) => {
      $('shards').querySelectorAll('.shard').forEach(s => {
        const cx = +s.dataset.cx, cy = +s.dataset.cy, rr = +s.dataset.r;
        const k = Ease.out(clamp(lt / 0.5));
        s.setAttribute('transform', `translate(${(cx * k * 1.6).toFixed(1)},${(cy * k * 1.4 + 60 * k * k).toFixed(1)}) rotate(${(rr * 160 * k).toFixed(1)} ${cx} ${cy})`);
      });
    });
    $('shards').removeAttribute('clip-path');
    { const headPath = $('fearHead').querySelector(':scope > path');
      $('shards').querySelectorAll('.shard').forEach(sh => { if (!headPath.isPointInFill(new DOMPoint(+sh.dataset.cx, +sh.dataset.cy))) sh.remove(); }); }
    // hero face, eyes ignite
    show('#hero', 30.75, 32.95, 0.2, 0.15);
    anim('#hero', 30.75, 0.01, { draw: [1, 1], wash: [1, 1] });
    anim('#hero', 30.75, 2.2, { s: [1.0, 1.06] }, 'linear');
    anim('#eyeGlow', 0, 0.01, { o: [0, 0] });
    anim('#eyeGlow', 31.85, 0.25, { o: [0, 1] }, 'out');
    fx(31.85, 32.95, (t, p, lt) => { $('eyeGlow').querySelector('path').setAttribute('stroke-width', (2 + Math.sin(lt * 20) * 1.2).toFixed(2)); });
    // gladiator
    show('#arena', 32.95, null, 0.2);
    anim('#glad', 32.95, 0.01, { draw: [1, 1], wash: [1, 1] });
    anim('#glad', 32.95, 2.95, { s: [0.94, 1.04], y: [10, 0] }, 'linear');
    fx(32.95, 35.9, (t, p, lt) => {
      $('dust').querySelectorAll('.dust').forEach((d, i) => {
        d.setAttribute('cx', (+d.dataset.x + Math.sin(lt * 2 + i) * 20 + lt * d.dataset.v * 0.5).toFixed(1));
        d.setAttribute('cy', (+d.dataset.y - lt * d.dataset.v).toFixed(1));
        d.setAttribute('opacity', (0.6 * (1 - lt / 3)).toFixed(2));
      });
    });
  }

  /* =====================================================================
     5. RULE 4 — LASER FOCUS (35.9 – 45.1)
     ===================================================================== */
  {
    const T = 35.9;
    const slash = `<ellipse cx="0" cy="0" rx="10" ry="70" fill="#d8ebff" filter="url(#glowBlue)" transform="rotate(30)"/>`;
    const samurai = A.wash([[0, 80, 240, 230, C.lav, 0.4], [-140, -40, 90, 90, C.indigo, 0.35]], 101) +
      A.bust({ hair: 'topknot', cloth: 'gi', eyes: 'stern', stubble: true }) +
      `<g transform="translate(-150,230) rotate(-28)"><g id="katana">${A.katana(420)}</g></g>` +
      `<g id="kGlint" filter="url(#glowBlue)"><path d="M-160,236 C-30,180 120,120 230,40" stroke="#bfe0ff" stroke-width="7" fill="none" stroke-linecap="round"/></g>` +
      `<path id="kArc" class="ink2 thin" d="M-260,-120 C-140,-240 100,-260 240,-160" stroke-dasharray="6 8"/>`;
    // tangled roads
    const rr = rng(123);
    let roads = '';
    for (let i = 0; i < 11; i++) {
      const x0 = 160 + rr() * 560, y0 = 280 + rr() * 200;
      let d = `M${x0.toFixed(0)},${y0.toFixed(0)}`;
      let x = x0, y = y0;
      for (let k = 0; k < 3; k++) {
        const nx = 140 + rr() * 600, ny = y + 160 + rr() * 140;
        d += ` C${(x + (rr() - 0.5) * 500).toFixed(0)},${(y + 60).toFixed(0)} ${(nx + (rr() - 0.5) * 500).toFixed(0)},${(ny - 60).toFixed(0)} ${nx.toFixed(0)},${ny.toFixed(0)}`;
        x = nx; y = ny;
      }
      roads += `<path class="ink" d="${d}" stroke="#3a3946" stroke-width="30"/><path class="ink" d="${d}" stroke="#77768a" stroke-width="22"/><path class="ink2" d="${d}" stroke="#f1ecdf" stroke-width="2" stroke-dasharray="10 12"/>`;
    }
    const beam = `<polygon points="330,1120 430,1120 382,470" fill="url(#beam)" opacity="0.95" filter="url(#glowSoft)"/>` +
      `<circle cx="382" cy="470" r="70" fill="url(#rgGlow)"/><path d="M262,470 L502,470" stroke="#fff" stroke-width="3" filter="url(#glowWhite)"/>`;
    const prof = A.profile();
    const doodles = `<g class="doodle"><text x="60" y="500" class="hand" font-size="64" fill="${C.ink}">#!?</text></g>` +
      `<g class="doodle"><text x="200" y="690" class="hand" font-size="54" fill="${C.ink}">#!?!</text></g>` +
      `<g class="doodle"><path class="ink" d="M90,640 c20,-20 40,20 20,30 c-30,10 -40,-40 0,-50 c40,-8 60,40 30,60" /></g>` +
      `<g class="doodle"><path class="ink" d="M40,800 l30,-40 l10,30 l30,-50 l10,40 l30,-30 l-10,60 l30,10 l-50,20 l10,30 l-40,-20 l-30,30 l0,-40 l-40,0 l30,-20Z" fill="#f4efe6"/><text x="70" y="830" class="bang" font-size="28" fill="${C.ink}">!!</text></g>` +
      `<g class="doodle"><path class="ink" d="M230,420 c30,-30 60,10 30,30 c-40,20 -50,-40 0,-40 c50,0 40,60 0,60"/></g>` +
      `<g class="doodle"><text x="40" y="960" class="hand" font-size="46" fill="${C.ink}">*&amp;%!</text></g>` +
      `<g class="doodle"><path class="ink" d="M220,900 C260,860 300,940 250,950 C200,960 210,880 270,890 C320,900 300,980 240,980"/></g>`;
    const fogL = A.wash([[110, 640, 210, 420, '#8d8e98', 0.8], [620, 640, 160, 420, '#9a9ba5', 0.7], [360, 300, 360, 140, '#a2a3ad', 0.6]], 141, 'fog');
    const closeFace = A.wash([[0, 0, 300, 360, C.lav, 0.35]], 151) + A.face({ eyes: 'open', stubble: true }) + A.hair('messy') + A.clothes('tee');

    scene('s5', T, 45.1,
      place('r4title', 0, 0, 1, A.title('r4t', 'Rule 4: Laser Focus', 70, 36)) +
      place('slash', 360, 470, 1, slash) +
      place('samurai', 360, 560, 1.2, samurai) +
      `<g id="maze">` +
      place('roads', 0, 0, 1, `<g opacity="0.95">${roads}</g>`) +
      place('beam', 0, 0, 1, beam) +
      place('prof', 110, 600, 1.7, prof) +
      `<g id="doodles">${doodles}</g>` +
      place('fog', 0, 0, 1, fogL) +
      `</g>` +
      place('closeFace', 360, 620, 2.2, closeFace),
      { fadeIn: 0.1, fadeOut: 0.3 });

    anim('#r4t-t', T + 0.05, 0.7, { reveal: [0, 1] });
    anim('#r4t-u', T + 0.5, 0.4, { draw: [0, 1] });
    // slash
    anim('#slash', T + 0.05, 0.5, { o: [0, 1], s: [0.1, 1] }, 'out');
    anim('#slash', T + 0.7, 0.2, { o: [1, 0] });
    // samurai
    show('#samurai', T + 0.75, 39.0, 0.15, 0.3);
    drawIn('#samurai', T + 0.75, 1.0, 0.45);
    anim('#kGlint', 0, 0.01, { o: [0, 0] });
    anim('#kGlint', 37.85, 0.2, { o: [0, 1] });
    anim('#kGlint', 38.05, 0.5, { draw: [0, 1] }, 'out');
    anim('#kGlint', 38.6, 0.3, { o: [1, 0.5] });
    anim('#katana', 37.8, 0.45, { r: [0, -16], x: [0, 40] }, 'back');
    anim('#kArc', 37.9, 0.4, { draw: [0, 1] });
    // roads maze + profile
    show('#maze', 38.9, 43.9, 0.25, 0.3);
    anim('#roads', 38.9, 0.9, { draw: [0, 1] }, 'out');
    drawIn('#prof', 38.95, 0.8, 0.4);
    anim('#beam', 0, 0.01, { o: [0, 0] });
    anim('#beam', 39.9, 0.5, { o: [0, 1] }, 'out');
    anim('#beam', 39.9, 0.7, { revealY: [0, 1] }, 'out');
    anim('#roads', 40.1, 1.6, { s: [1, 1.05] }, 'linear');
    anim('#prof', 40.9, 0.6, { x: [0, 60], y: [0, -40], s: [1, 1.12] }, 'inOut');
    // distractions pop around, then fog clears them
    root_doodles();
    function root_doodles() {
      document.querySelectorAll('#doodles .doodle').forEach((d, i) => {
        anim(d, 0, 0.01, { o: [0, 0] });
        anim(d, 41.7 + i * 0.1, 0.3, { o: [0, 1], s: [0.3, 1] }, 'back');
        anim(d, 42.9, 0.4, { o: [1, 0] });
      });
    }
    fx(41.7, 42.9, (t, p, lt) => { $('doodles').setAttribute('transform', `translate(${(Math.sin(lt * 50) * 3).toFixed(1)},${(Math.cos(lt * 43) * 2).toFixed(1)})`); });
    anim('#fog', 0, 0.01, { o: [0, 0] });
    anim('#fog', 42.7, 0.4, { o: [0, 1] });
    anim('#fog', 43.3, 0.6, { o: [1, 0], s: [1, 1.2] });
    // close face
    show('#closeFace', 43.75, null, 0.35);
    anim('#closeFace', 43.75, 0.01, { draw: [1, 1], wash: [1, 1] });
    anim('#closeFace', 43.75, 1.35, { s: [1.04, 1] }, 'out');
  }

  /* =====================================================================
     6. RULE 5 — MASTER YOUR MIND (45.1 – 54.36)
     ===================================================================== */
  {
    const T = 45.1;
    const stroke = `<path class="ink" d="M-40,-20 L-58,60 M-40,-20 L90,-40" stroke="${C.blue}" stroke-width="10" fill="none" filter="url(#rough)"/>`;
    const stoicBg = A.wash([[0, 40, 240, 250, C.indigo, 0.45], [140, -20, 120, 160, C.ochre, 0.5], [-160, 80, 90, 120, C.lav, 0.45]], 161);
    const stoic = A.bust({ statue: true, hair: 'curly', beard: true, laurel: false, cloth: 'armor', eyes: 'stern' });
    const dark = A.bust({ statue: true, hair: 'curly', beard: true, cloth: 'armor', angry: true, dark: true });
    const hero = A.bust({ hair: 'neat', cloth: 'bandhgala', eyes: 'closed', smile: true });
    const heroBg = A.wash([[0, 60, 250, 260, C.indigo, 0.42], [160, -30, 110, 150, C.ochre, 0.45], [-170, 40, 90, 140, C.lav, 0.45]], 171);
    const aura = `<ellipse cx="0" cy="60" rx="230" ry="270" fill="none" stroke="#9cc4ff" stroke-width="8" filter="url(#glowSoft)"/>` +
      `<ellipse cx="0" cy="60" rx="220" ry="262" fill="#9fb8ff" opacity="0.12"/>`;
    // arrows from all sides
    const arrowsDef = [[-1, -0.6], [1, -0.4], [-1, 0.5], [1, 0.6], [-0.3, 1], [0.4, -1], [0.95, 0.1]];
    const arrows = arrowsDef.map((d, i) => `<g class="arrow" data-i="${i}" opacity="0">${A.arrow(130)}</g>`).join('');
    const word = 'UNDEFEATABLE';
    let letters = '';
    const lw = 52, startX = 360 - (word.length - 1) * lw / 2;
    for (let i = 0; i < word.length; i++) letters += `<g transform="translate(${startX + i * lw},0)"><text class="bang letter" x="0" y="0" font-size="96" text-anchor="middle" fill="${C.dark}" stroke="${C.dark}" stroke-width="2" transform="rotate(${((i % 3) - 1) * 2})">${word[i]}</text></g>`;
    let debris = '';
    const dr = rng(201);
    for (let i = 0; i < 26; i++) debris += `<path class="deb" opacity="0" data-a="${(dr() * 6.283).toFixed(2)}" data-v="${(80 + dr() * 200).toFixed(0)}" d="M0,0 l${(4 + dr() * 10).toFixed(0)},${(dr() * 6).toFixed(0)} l${(-dr() * 8).toFixed(0)},${(6 + dr() * 8).toFixed(0)}Z" fill="${C.dark}"/>`;
    let rays = '';
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; rays += `<line x1="${(Math.cos(a) * 110).toFixed(1)}" y1="${(Math.sin(a) * 60).toFixed(1)}" x2="${(Math.cos(a) * 270).toFixed(1)}" y2="${(Math.sin(a) * 190).toFixed(1)}" stroke="${i % 2 ? '#ffd24a' : '#ff9d2a'}" stroke-width="${i % 3 ? 4 : 7}" stroke-linecap="round"/>`; }
    const button = `<g id="btnRays" filter="url(#glowGold)">${rays}</g>` +
      `<g id="btn"><rect x="-130" y="-38" width="260" height="76" rx="22" fill="url(#btnG)" stroke="#5a2414" stroke-width="3"/>` +
      `<rect x="-120" y="-32" width="240" height="22" rx="11" fill="#fff" opacity="0.25"/>` +
      `<text x="0" y="17" class="bang" font-size="48" text-anchor="middle" fill="#fff3e8" stroke="#5a2414" stroke-width="1.5">SUBSCRIBE</text></g>` +
      `<g transform="translate(40,50)"><g id="cursor"><path d="M0,0 L0,-46 C0,-58 16,-58 16,-46 L16,-6 L18,-24 C18,-34 32,-34 32,-24 L32,-4 L34,-18 C34,-28 48,-28 48,-18 L48,0 L50,-10 C50,-20 64,-20 64,-10 L64,30 C64,60 44,74 22,74 C2,74 -10,62 -18,46 L-34,16 C-40,6 -28,-2 -20,6Z" fill="#fff" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/></g></g>`;

    scene('s6', T, DURATION + 1,
      place('r5title', 0, 0, 1, A.title('r5t', 'Rule 5: Master Your Mind', 66, 32)) +
      place('stroke5', 360, 520, 2.2, stroke) +
      place('stoicBg', 360, 560, 1.1, stoicBg) +
      place('stoic', 360, 560, 1.15, stoic) +
      place('darkBust', 360, 560, 1.15, dark) +
      place('heroBg', 360, 600, 1.1, heroBg) +
      place('aura', 360, 600, 1.15, aura) +
      place('hero5', 360, 600, 1.15, hero) +
      `<g transform="translate(300,560) scale(1.15)"><g id="mask">${A.mask()}</g></g>` +
      `<g id="arrows">${arrows}</g>` +
      `<g transform="translate(0,215)"><g id="word">${letters}<g transform="translate(360,-30)"><g id="debris">${debris}</g></g></g></g>` +
      `<g transform="translate(360,960)"><g id="sub">${button}</g></g>`,
      { fadeIn: 0.1, fadeOut: 0.01 });

    anim('#r5t-t', T + 0.05, 0.8, { reveal: [0, 1] });
    anim('#r5t-u', T + 0.5, 0.5, { draw: [0, 1] });
    // blue pen stroke
    show('#stroke5', T + 0.05, T + 0.75, 0.05, 0.2);
    anim('#stroke5', T + 0.05, 0.5, { draw: [0, 1] });
    // stoic bust
    show('#stoicBg', T + 0.6, 48.9, 0.2, 0.3);
    anim('#stoicBg', T + 0.6, 0.8, { s: [0.7, 1] }, 'out');
    show('#stoic', T + 0.6, 48.0, 0.15, 0.3);
    drawIn('#stoic', T + 0.6, 1.1, 0.45);
    // dark angry self
    show('#darkBust', 47.75, 48.95, 0.3, 0.2);
    anim('#darkBust', 47.75, 0.01, { draw: [1, 1], wash: [1, 1] });
    anim('#darkBust', 47.75, 0.5, { bright: [1, 0.42] }, 'out');
    anim('#darkBust', 47.75, 1.2, { s: [1, 1.04] }, 'linear');
    fx(47.9, 48.8, (t, p, lt) => { $('darkBust').setAttribute('transform', `translate(${(Math.sin(lt * 60) * 2).toFixed(1)},0)`); });
    // hero with mask
    show('#heroBg', 48.8, null, 0.3);
    show('#hero5', 48.8, null, 0.3);
    anim('#hero5', 48.8, 0.01, { draw: [1, 1], wash: [1, 1] });
    show('#mask', 48.8, null, 0.3);
    anim('#mask', 49.35, 0.55, { x: [0, -160], y: [0, 60], r: [0, -35] }, 'inOut');
    anim('#mask', 49.75, 0.25, { o: [1, 0] });
    // aura + arrows bounce
    anim('#aura', 0, 0.01, { o: [0, 0] });
    anim('#aura', 49.8, 0.4, { o: [0, 1], s: [0.85, 1] }, 'out');
    fx(49.8, DURATION, (t, p, lt) => { $('aura').firstElementChild.setAttribute('stroke-width', (7 + Math.sin(lt * 12) * 2.5).toFixed(2)); });
    const cxA = 360, cyA = 660;
    fx(49.9, 51.6, (t, p, lt) => {
      document.querySelectorAll('#arrows .arrow').forEach((a, i) => {
        const d = arrowsDef[i], len = Math.hypot(d[0], d[1]), ux = d[0] / len, uy = d[1] / len;
        const t0 = i * 0.07, k = lt - t0;
        if (k < 0) { a.setAttribute('opacity', 0); return; }
        const R0 = 620, Rhit = 300;
        const ang = Math.atan2(-uy, -ux) * 180 / Math.PI;
        let x, y, rot = ang, op = 1;
        if (k < 0.3) { const r = lerp(R0, Rhit, Ease.in(k / 0.3)); x = cxA + ux * r; y = cyA + uy * r; }
        else { const q = k - 0.3; const r = Rhit + q * 260; x = cxA + ux * r + q * 40; y = cyA + uy * r + q * q * 900; rot = ang + q * 520 * (i % 2 ? 1 : -1); op = clamp(1 - q / 0.9); }
        // arrow drawn pointing +x with tip at 130 → shift so tip touches position
        a.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)}) translate(-130,0)`);
        a.setAttribute('opacity', op.toFixed(2));
      });
    });
    // UNDEFEATABLE stamps letter by letter
    document.querySelectorAll('#word .letter').forEach((l, i) => {
      anim(l, 0, 0.01, { o: [0, 0] });
      anim(l, 50.85 + i * 0.07, 0.25, { o: [0, 1], s: [2.2, 1] }, 'out');
    });
    fx(50.85, 52.2, (t, p, lt) => {
      $('debris').querySelectorAll('.deb').forEach((d, i) => {
        const k = clamp((lt - (i % 12) * 0.07) / 0.8);
        const a = +d.dataset.a, v = +d.dataset.v;
        d.setAttribute('transform', `translate(${((i % 12) * 52 - 286 + Math.cos(a) * v * k).toFixed(1)},${(Math.sin(a) * v * k * 0.6 + 120 * k * k).toFixed(1)}) rotate(${(k * 300).toFixed(0)})`);
        d.setAttribute('opacity', k > 0 && k < 1 ? (1 - k).toFixed(2) : 0);
      });
    });
    // subscribe
    anim('#sub', 0, 0.01, { o: [0, 0] });
    pop('#sub', 51.75, 0.5, 0.3);
    anim('#cursor', 0, 0.01, { o: [0, 0] });
    anim('#cursor', 52.15, 0.35, { o: [0, 1], x: [80, 0], y: [80, 0] }, 'out');
    anim('#cursor', 52.65, 0.12, { s: [1, 0.85] }, 'out');
    anim('#cursor', 52.77, 0.18, { s: [0.85, 1] }, 'out');
    anim('#btn', 52.65, 0.12, { s: [1, 0.92] }, 'out');
    anim('#btn', 52.77, 0.25, { s: [0.92, 1.06] }, 'back');
    anim('#btnRays', 0, 0.01, { o: [0, 0] });
    anim('#btnRays', 52.75, 0.35, { o: [0, 1], s: [0.4, 1.05] }, 'out');
    fx(52.75, DURATION, (t, p, lt) => { $('btnRays').setAttribute('transform', `rotate(${(lt * 25).toFixed(1)})`); $('btnRays').style.opacity = (0.75 + 0.25 * Math.sin(lt * 14)).toFixed(2); });
  }

  // initial frame
  MV.renderAt(0);
})();
