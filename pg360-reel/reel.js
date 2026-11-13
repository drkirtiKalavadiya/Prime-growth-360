/* Prime Growth 360 — motion-design reel (Gujarati voice-over at 1.3x, ~67 s, 1080x1920).
 * Every frame is a pure function of time t, so the same t always draws the same frame.
 * That makes frame-exact MP4 rendering possible (see render.js).
 * URL options: ?t=12.3 opens paused at that second; ?record=1 hides the controls.
 */
(() => {
'use strict';
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const pr = (t, a, b) => cl((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const eo = k => 1 - Math.pow(1 - k, 3);
const eio = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const back = k => { const c = 1.9, x = k - 1; return 1 + (c + 1) * x * x * x + c * x * x; };
const f = n => Math.round(n * 100) / 100;
const $ = (r, s) => r.querySelector(s);
const $$ = (r, s) => [...r.querySelectorAll(s)];

/* ------------------------------------------------------------------ */
/* building blocks                                                      */
/* ------------------------------------------------------------------ */
const A = 'assets/';
const PIN_SVG = '<svg width="11" height="13" viewBox="0 0 11 13" style="vertical-align:-1px"><path d="M5.5 0C2.5 0 0 2.4 0 5.3 0 9 5.5 13 5.5 13S11 9 11 5.3C11 2.4 8.5 0 5.5 0z" fill="#e0342a"/><circle cx="5.5" cy="5.2" r="2" fill="#fff"/></svg>';
function igHTML() {
  const posts = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `<img src="${A}post${i}.jpg">`).join('');
  return `<div class="ig">
    <div class="sb"><span>9:41</span><span style="letter-spacing:2px">▂▄▆ 5G ▮</span></div>
    <div class="top"><span>＋</span><span class="name">primegrowth360 <span class="tick"></span> <span style="font-size:14px">⌄</span> <span style="color:#ff3040;font-size:13px">●</span></span><span style="font-size:20px">@</span><span>≡</span></div>
    <div class="row"><div class="av"><img src="${A}avatar.jpg"></div>
      <div><div class="ttl">Business Coach| Gujarat MSME<br>Business Consultant | Gujarat</div>
        <div class="stats"><div><b class="n-posts">1,095</b>posts</div><div><b class="n-fol">177K</b>followers</div><div><b>152</b>following</div></div></div></div>
    <div class="bio"><span class="g">Business Consultant</span><br>MSME Business Coach ${PIN_SVG} Gujarat<br>2000+ Business Owners Trained | 10+ Years Experience<br>↗ Business Growth • SOP • AI • Branding<br>☎ 8460372867</div>
    <div class="chips"><span class="chip">◌ Business Learning D…</span><span class="chip">ⓕ prime growth 360</span></div>
    <div class="dash"><b>Your dashboard</b><div>3.2Cr views in the last 30 days.</div></div>
    <div class="btns"><span class="btn">Edit profile</span><span class="btn">Share profile</span><span class="btn">Subscription</span><span class="btn sm">⌄</span></div>
    <div class="hls"><div class="hl"><i class="new">＋</i>New</div><div class="hl"><i><img src="${A}hl1.jpg"></i>100k In 180Da…</div><div class="hl"><i><img src="${A}hl2.jpg"></i>1.5 Cr Revenue</div><div class="hl"><i><img src="${A}hl3.jpg"></i>Meta Ads Res…</div></div>
    <div class="tabs"><span>▦</span><span>♛</span><span>▶</span><span>⟲</span><span>◉</span></div>
    <div class="grid">${posts}</div>
    <div class="nav"><span>⌂</span><span>⌕</span><span>⊕</span><span>▶</span><img src="${A}avatar.jpg"></div>
  </div>`;
}
/* 3D phone. Screen = live HTML profile, scaled into the screen. */
function phoneHTML(opts = {}) {
  let slices = '';
  for (let k = 1; k <= 13; k++) slices += `<div class="slice" style="transform:translateZ(${-k * 2.3}px)"></div>`;
  const pins = opts.pins ? [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], i) =>
    `<div class="pin p${i}" style="left:${15 + x * 400}px;top:${15 + y * 874}px;opacity:0"></div>`).join('') : '';
  return `<div class="cam"><div class="phone">
    ${slices}
    <div class="face back" style="transform:translateZ(-32px) rotateY(180deg)">
      <div class="bump"><div class="lens" style="left:16px;top:16px"></div><div class="lens" style="left:16px;top:106px"></div><div class="lens" style="left:98px;top:62px"></div>
        <div style="position:absolute;left:118px;top:20px;width:20px;height:20px;border-radius:50%;background:#e9e4d6"></div></div>
      <div class="shine"></div></div>
    <div class="face front"><div class="screen">${igHTML()}<div class="island"></div>
      <div class="off" style="position:absolute;inset:0;background:#000;opacity:0"></div>
      <div class="edge" style="position:absolute;inset:0;border-radius:62px;box-shadow:inset 0 0 0 3px #ff2d1a;opacity:0"></div></div>
      ${pins}<div class="shine"></div></div>
  </div></div>`;
}
function fitIG(root) { $$(root, '.ig').forEach(ig => { ig.style.transform = `scale(${400 / 390})`; }); }
function setPhone(root, p) {
  const ph = $(root, '.phone'), cam = $(root, '.cam');
  ph.style.transform = `translate3d(${f(p.x || 0)}px,${f(p.y || 0)}px,${f(p.z || 0)}px) rotateX(${f(p.rx || 0)}deg) rotateY(${f(p.ry || 0)}deg) rotateZ(${f(p.rz || 0)}deg) scale(${f(p.s || 1)})`;
  cam.style.perspective = (p.persp || 2600) + 'px';
  cam.style.perspectiveOrigin = p.po || '50% 45%';
  const fl = [];
  if (p.blur) fl.push(`blur(${f(p.blur)}px)`);
  cam.style.filter = fl.length ? fl.join(' ') : 'none';
  // red rim glow on the frame itself (a filter here would soften the 3D phone)
  $(root, '.front').style.boxShadow = p.glow ? `0 ${f(p.glowY ?? 30)}px ${f(p.glowR ?? 60)}px rgba(255,45,26,${f(p.glow)})` : 'none';
  $(root, '.back').style.boxShadow = p.glow ? `0 0 ${f(p.glowR ?? 60)}px rgba(255,45,26,${f(p.glow)})` : 'none';
  cam.style.opacity = p.op ?? 1;
  // light sweep on the titanium back and the glass
  const ry = ((p.ry || 0) % 360 + 360) % 360;
  $(root, '.back').style.backgroundPosition = `${f(50 + Math.sin(ry * Math.PI / 180) * 45)}% 50%`;
  $$(root, '.shine').forEach(s => { s.style.opacity = f(p.shine ?? .6); });
}
function glass(x, y, w, h, inner, cls = '') {
  return `<div class="glass ${cls}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${inner}</div>`;
}

/* code shown in the "Claude is writing the scene" panel */
const CODE = [
  ['c', '// phone_scene.js — the whole 3D scene, written as code'],
  ['', '<k>import</k> { phone, light, camera } <k>from</k> <s>"./scene"</s>;'],
  ['', '<k>import</k> profile <k>from</k> <s>"./ProfileIG"</s>;'],
  ['', ''],
  ['', '<k>const</k> W = <n>78.0</n>, H = <n>163.4</n>, T = <n>8.75</n>;'],
  ['', '<k>const</k> TITANIUM = rgb(<s>"#DEDCD8"</s>);'],
  ['', '<k>const</k> FPS = <n>30</n>, FRAMES = <n>1410</n>;'],
  ['', ''],
  ['', '<k>function</k> frame(t) {'],
  ['', '  camera.dolly(ease(t, <n>0</n>, <n>2.8</n>), <n>-0.35</n>);'],
  ['', '  phone.rotate(<n>18</n>, spin(t), <n>-12</n>);'],
  ['', '  phone.metal(TITANIUM, { rough: <n>0.2</n> });'],
  ['', '  light.key({ x: <n>-2</n>, y: <n>4</n>, power: <n>1200</n> });'],
  ['', '  light.rim(<s>"#FF2D1A"</s>, <n>0.8</n>);'],
  ['', '  phone.screen = profile.render(t);'],
  ['', '  motionBlur(shutter = <n>1.0</n>);'],
  ['', '  captions.sync(t, <s>"script.json"</s>);'],
  ['', '}'],
  ['', ''],
  ['', '<k>for</k> (<k>let</k> f = <n>0</n>; f < FRAMES; f++) {'],
  ['', '  <k>const</k> t = f / FPS;'],
  ['', '  frame(t);'],
  ['', '  <k>await</k> capture(<s>`out/f${f}.jpg`</s>);'],
  ['', '}'],
  ['c', '// done — the reel re-renders from this file'],
];
function codeLines(start, n, hiIdx = -1, src = CODE) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const [cls, txt] = src[(start + i) % src.length];
    const html = txt.replace(/<k>/g, '<span class="k">').replace(/<s>/g, '<span class="s">').replace(/<n>/g, '<span class="n">').replace(/<\/[ksn]>/g, '</span>');
    const line = `<span class="ln">${start + i}</span>${cls === 'c' ? `<span class="c">${html}</span>` : html}`;
    s += i === hiIdx ? `<span class="hi">${line}</span>` : line + '\n';
  }
  return s;
}

/* kinetic "lyric" slides inside the small phone */
const SLIDES = [
  // white cards for the first beats, then black — switching about every half second like the reference
  [5.4, '#f2f2f2', '<span style="color:#111;font-size:120px;transform:rotate(-12deg);display:inline-block">Grow</span>'],
  [5.75, '#f2f2f2', '<div style="color:#111;font-size:96px">Grow<br><span style="background:#111;color:#fff;padding:0 16px;font-size:76px">your</span></div>'],
  [6.3, '#f2f2f2', '<div style="font-size:84px;white-space:nowrap"><span style="background:#111;color:#e0281c;padding:0 14px">Business</span><br><span style="color:#111">Growth</span></div>'],
  [6.9, '#000', '<span style="background:#ececec;color:#111;border-radius:120px;padding:14px 46px;font-size:120px;white-space:nowrap">SOP System</span>'],
  [7.5, '#f2f2f2', '<div style="color:#111;font-size:96px;white-space:nowrap">2000+<br><span style="font-size:70px">Owners</span></div>'],
  [8.0, '#000', '<span style="color:#ff2d1a;font-size:190px;text-shadow:0 0 40px #ff2d1a">AI</span>'],
  [8.5, '#000', '<div style="transform:rotate(-6deg);color:#ffd02a;font-size:90px;text-shadow:0 0 24px rgba(255,208,42,.7)">10+</div>'],
  [8.9, '#000', '<div style="transform:rotate(-6deg)"><span style="color:#ffd02a;font-size:90px;text-shadow:0 0 24px rgba(255,208,42,.7)">10+ Years</span><br><span style="color:#ff2d1a;font-size:64px">Experience</span></div>'],
  [10.0, '#000', '<div style="transform:rotate(-6deg)"><span style="color:#ffd02a;font-size:90px;text-shadow:0 0 24px rgba(255,208,42,.7)">10+ Years</span><br><span style="color:#ff2d1a;font-size:64px">Experience</span><br><span style="font-size:48px">of growth</span></div>'],
  [10.4, '#000', '<div style="position:relative"><span style="color:#e3241a;font-size:80px;letter-spacing:-3px;white-space:nowrap">BRANDING</span>' +
    [40, 120, 210, 300].map((x, i) => `<i style="position:absolute;left:${x}px;top:76px;width:${10 + i % 2 * 6}px;height:${60 + i * 22}px;border-radius:0 0 10px 10px;background:#c81d14"></i>`).join('') + '</div>'],
  [11.9, '#000', '<span style="color:#b9150c;font-size:80px;white-space:nowrap">growth is</span>'],
  [12.3, '#000', '<div class="bars" style="position:absolute;inset:0">' + '<i></i>'.repeat(6) + '</div><span style="position:relative;color:#ff2d1a;font-size:70px;white-space:nowrap;text-shadow:0 0 24px #ff2d1a">growth is AI</span>'],
];
const FAST = ['Grow', 'SOP', 'AI', '2000+', 'Branding', '177K of you'];

/* ------------------------------------------------------------------ */
/* scenes: [start, end, build(el) -> update(t)]                        */
/* ------------------------------------------------------------------ */
const S = [];

/* 1. intro — fast montage of 3D close-ups (11 cuts in 2.85 s) + headline */
// wide-angle "laid back" pose, also used for the outro
const WIDE = { persp: 1100, po: '34% 30%', rx: 44, rz: -8, s: 1.2, glow: .55 };
S.push([0, 2.85, el => {
  const words = ['આ', 'આખી', 'Reel', '<br>એક', '<span style="color:#ff2d1a;text-shadow:0 0 30px rgba(255,45,26,.8)">Secret LLM</span>', 'ની', '<br>મદદથી', 'બનાવી છે.'];
  let rings = '';
  for (let i = 0; i < 7; i++) rings += `<i style="position:absolute;left:0;top:${70 - i * 13}px;width:340px;height:120px;border-radius:50%;border:5px solid rgba(255,70,40,${f(.95 - i * .1)});box-shadow:0 0 26px rgba(255,45,26,.8),inset 0 0 20px rgba(255,45,26,.5)"></i>`;
  el.innerHTML = phoneHTML() +
    `<div class="iconStack" style="position:absolute;left:370px;top:620px;width:340px;height:260px;opacity:0;transform-origin:50% 40%">
       <div style="position:absolute;left:0;top:30px;width:340px;height:160px;border-radius:50%;background:radial-gradient(ellipse at 50% 50%,rgba(255,60,30,.9),rgba(255,45,26,0) 70%);filter:blur(10px)"></div>${rings}
       <div class="tile" style="position:absolute;left:90px;top:-120px;width:160px;height:160px;border-radius:40px;overflow:hidden;background:#fff;box-shadow:0 0 40px rgba(255,255,255,.55),0 20px 40px rgba(0,0,0,.5)"><img src="${A}avatar.jpg" style="width:100%;height:100%;display:block"></div>
       <b style="position:absolute;left:330px;top:150px;font:300 60px Inter;color:#fff">+</b></div>
     <div class="snapNo layer" style="opacity:0;background:radial-gradient(ellipse 70% 55% at 50% 48%,#8a1508 0%,#3a0904 55%,#000 100%)"></div><div class="snapBars layer" style="opacity:0;background:#000"></div>
     <div class="hd1" style="position:absolute;left:0;right:0;top:150px;text-align:center;font:800 86px/1.25 Inter, 'Anek Gujarati';letter-spacing:-1px;z-index:5">${words.map((w, i) => `${w.startsWith('<br>') ? '<br>' : ''}<span class="w${i}" style="display:inline-block">${w.replace('<br>', '')}</span> `).join('')}</div>`;
  fitIG(el);
  const av = $(el, '.ig .av'), icon = $(el, '.iconStack'), tile = $(el, '.tile');
  const snapNo = $(el, '.snapNo'), snapBars = $(el, '.snapBars');
  let builtSnaps = false;
  const WT = [0.05, 0.25, 0.6, 0.95, 1.15, 1.6, 1.95, 2.5].map(v => v * .8);
  const ws = WT.map((t0, i) => [t0, $(el, '.w' + i)]);
  // [start, shot]
  const SHOTS = [[0, 'wide'], [.25, 'posts'], [.375, 'header'], [.75, 'icon'], [1.25, 'hlblur'], [1.5, 'hl'], [1.625, 'no'], [1.75, 'bars'], [1.875, 'hl2'], [2.125, 'avatar'], [2.625, 'full']];
  return t => {
    if (!builtSnaps) { // flash-forwards of later shots
      builtSnaps = true;
      S[1][2](snapNo)(3.6); $(snapNo, '.no').style.display = 'none'; $(snapNo, '.l2').style.display = 'none';
      S[11][2](snapBars)(38.3);
    }
    let k = 0; SHOTS.forEach((s, i) => { if (t >= s[0]) k = i; });
    const [s0, shot] = SHOTS[k];
    const s1 = k + 1 < SHOTS.length ? SHOTS[k + 1][0] : 2.85;
    const lt = pr(t, s0, s1);
    icon.style.opacity = shot === 'icon' ? 1 : 0;
    snapNo.style.opacity = shot === 'no' ? 1 : 0;
    snapBars.style.opacity = shot === 'bars' ? 1 : 0;
    av.style.boxShadow = shot === 'avatar' ? `0 0 0 ${f(4 + lt * 8)}px #ff2d1a, 0 0 ${f(40 + lt * 60)}px #ff2d1a` : 'none';
    let p;
    switch (shot) {
      case 'wide': p = { ...WIDE, y: lerp(-150, -190, lt), x: -10 }; break;
      case 'posts': p = { persp: 1300, rx: 32, rz: -12, s: 3.4, x: lerp(320, -260, lt), y: -760, blur: 9 }; break;
      case 'header': p = { persp: 1300, rx: 34, rz: -20, s: 2.9, x: lerp(330, 190, eo(lt)), y: 800, blur: lerp(7, .5, eo(pr(lt, 0, .6))) }; break;
      case 'icon': p = { persp: 1100, rx: 48, rz: 160, s: 3.0, x: -60, y: -80, blur: 7 }; break;
      case 'hlblur': p = { persp: 1200, rx: 44, rz: -26, s: 3.0, x: lerp(380, 0, lt), y: -150, blur: 11 }; break;
      case 'hl': p = { persp: 1200, rx: 44, rz: -26, s: 3.0, x: lerp(0, -40, lt), y: -150, blur: 1 }; break;
      case 'hl2': p = { persp: 1200, rx: 46, rz: -24, s: 2.6, x: lerp(120, 60, lt), y: -40, blur: 1 }; break;
      case 'avatar': p = { persp: 1000, rx: 40, rz: 172, s: lerp(2.6, 2.9, lt), x: lerp(-480, -520, lt), y: lerp(-470, -505, lt), blur: lerp(6, 1.5, eo(lt)) }; break;
      case 'full': { const a = eo(pr(t, 2.625, 2.8)); p = { rx: 6, ry: -12, rz: 4, s: lerp(.8, .86, lt), y: lerp(140, 80, a), blur: (1 - a) * 6, glow: .35 }; break; }
      default: p = { s: 1, op: 0 };
    }
    if (shot === 'no' || shot === 'bars') p.op = 0;
    setPhone(el, { shine: .35, ...p });
    // the extruded app icon floats and spins slowly
    tile.style.transform = `translateY(${f(Math.sin(t * 6) * 8 - lt * 20)}px) rotate(${f(lerp(-6, 6, lt))}deg)`;
    icon.style.transform = `scale(${f(lerp(1.75, 1.95, lt))})`;
    ws.forEach(([t0, w]) => {
      const a = pr(t, t0, t0 + .14);
      w.style.opacity = a; w.style.filter = `blur(${f((1 - a) * 12)}px)`;
      w.style.transform = `translateX(${f((1 - eo(a)) * 40)}px)`;
    });
  };
}]);

/* 2. "No After Effects. No keyframes." */
S.push([2.85, 5.4, el => {
  let rows = '';
  for (let i = 0; i < 8; i++) rows += `<div class="outline" style="top:${i * 270 - 40}px">GROW GROW GROW</div>`;
  el.innerHTML = `<div class="rows">${rows}</div>
    <div class="no" style="position:absolute;left:0;right:0;top:300px;text-align:center;font:900 360px/1 Inter;letter-spacing:-14px;color:#ff3b20;text-shadow:0 0 60px rgba(255,50,20,.75)">No</div>
    <div class="l2" style="position:absolute;left:0;right:0;top:650px;text-align:center;font:800 78px Inter;letter-spacing:-2px">
      <span class="tx" style="position:relative;display:inline-block">After Effects.<i class="st" style="position:absolute;left:-10px;top:50%;height:8px;width:0;background:#ff2d1a;box-shadow:0 0 16px #ff2d1a"></i></span></div>
    <div class="icon" style="position:absolute;left:430px;top:820px;width:220px;height:220px;border-radius:56px;overflow:hidden;
      box-shadow:0 0 0 6px rgba(255,255,255,.12),0 0 90px rgba(255,45,26,.9),0 30px 60px rgba(0,0,0,.6)"><img src="${A}avatar.jpg" style="width:100%;height:100%;display:block"></div>`;
  const no = $(el, '.no'), tx = $(el, '.tx'), st = $(el, '.st'), icon = $(el, '.icon'), rowsEl = $(el, '.rows');
  return t => {
    const a = pr(t, 2.85, 3.15);
    no.style.transform = `translateY(${f((1 - eo(a)) * -120)}px) scale(${f(lerp(1.5, 1, eo(a)))})`; no.style.opacity = a;
    const second = t >= 4.0;
    tx.firstChild.textContent = second ? 'Keyframes.' : 'After Effects.';
    const t0 = second ? 4.0 : 3.25;
    const b = pr(t, t0, t0 + .25);
    tx.style.opacity = b; tx.style.filter = `blur(${f((1 - b) * 10)}px)`;
    st.style.width = `calc(${f(eo(pr(t, t0 + .35, t0 + .7)) * 100)}% + 20px)`;
    const c = pr(t, 3.0, 3.5);
    icon.style.transform = `perspective(900px) translateY(${f((1 - eo(c)) * 200 + Math.sin(t * 3) * 10)}px) rotateY(${f(Math.sin(t * 2) * 22)}deg) rotateX(12deg) scale(${f(eo(c))})`;
    rowsEl.style.transform = `translateX(${f(-(t - 2.85) * 90)}px)`;
  };
}]);

/* 3. rhythm — small phone with kinetic text + timeline panel */
S.push([5.4, 12.6, el => {
  let blocks = '';
  const r = [[30, 120, 0], [150, 90, 1], [260, 160, 0], [300, 70, 2], [440, 120, 1], [560, 90, 0], [600, 150, 2], [700, 60, 1]];
  r.forEach(([x, w, row]) => { blocks += `<i style="position:absolute;left:${x}px;top:${row * 22}px;width:${w}px;height:16px;border-radius:4px;background:rgba(255,45,26,.${row ? 35 : 6})"></i>`; });
  let dense = '';
  for (let i = 0; i < 46; i++) dense += `<i style="position:absolute;left:${i * 16}px;top:${(i * 7) % 40}px;width:12px;height:${18 + (i * 13) % 26}px;background:rgba(255,45,26,.${3 + i % 5})"></i>`;
  el.innerHTML = `<div class="mini"><div class="slide kin"></div></div>` +
    glass(160, 1040, 760, 190, `<div class="hd"><span>▢ <b class="fn">script.json</b> &nbsp;4 cuts · 21 slots</span><span>frame <b class="fr">452</b></span></div>
      <div class="ruler" style="display:flex;justify-content:space-between;padding:8px 26px 0;font-size:17px;color:#9a8580">${[0, 120, 240, 360, 480, 600, 720, 840].map(n => `<span>${n}</span>`).join('')}</div>
      <div style="position:relative;margin:10px 26px;height:70px">
        <div class="tl">${blocks}</div><div class="tl2" style="opacity:0">${dense}</div>
        <i class="ph" style="position:absolute;top:-14px;width:3px;height:90px;background:#fff;box-shadow:0 0 10px #fff"></i>
        <b class="pn" style="position:absolute;top:28px;font-size:16px;color:#111;background:#fff;border-radius:4px;padding:0 4px">19</b></div>`);
  const mini = $(el, '.mini'), slide = $(el, '.slide'), fr = $(el, '.fr'), ph = $(el, '.ph'), pn = $(el, '.pn'), fn = $(el, '.fn');
  let cur = -1;
  return t => {
    const a = eo(pr(t, 5.4, 5.8));
    mini.style.transform = `scale(${f(lerp(2.2, 1, a))}) translateY(${f((1 - a) * 220)}px)`;
    let i = 0; SLIDES.forEach((s, k) => { if (t >= s[0]) i = k; });
    if (i !== cur) { cur = i; slide.innerHTML = SLIDES[i][2]; mini.style.background = SLIDES[i][1]; }
    const lt = t - SLIDES[i][0];
    const sx = (i === 1 || i === 4) ? lerp(160, -40, pr(lt, 0, .8)) : 0;
    const enter = pr(lt, 0, .18);
    slide.style.transform = `translateX(${f(sx)}px) scale(${f(lerp(1.25, 1, eo(enter)))})`;
    slide.style.filter = `blur(${f((1 - enter) * 10)}px)`;
    const frame = 452 + Math.round((t - 5.4) * 34);
    fr.textContent = frame;
    const px = ((frame - 300) % 700) / 700 * 690;
    ph.style.left = f(px) + 'px'; pn.style.left = f(px + 8) + 'px';
    const dense = t >= 10.6;
    $(el, '.tl').style.opacity = dense ? 0 : 1; $(el, '.tl2').style.opacity = dense ? 1 : 0;
    fn.textContent = dense ? '"id": "19", "start": 712' : 'script.json';
  };
}]);

/* 4. Claude writes the 3D scene — scrolling code */
S.push([12.6, 16.5, el => {
  el.innerHTML = glass(130, 230, 820, 160, `<div class="hd"><span><b>Claude</b> <span class="dot">●</span> Writing the 3D scene</span><span></span></div>
    <div class="hd" style="padding-top:6px"><span>phone_scene.js</span><span>line <b class="ln2">25</b> / 1,063</span></div>
    <div class="code cd"></div>`);
  const g = $(el, '.glass'), cd = $(el, '.cd'), ln = $(el, '.ln2');
  return t => {
    const a = eo(pr(t, 12.85, 13.1));
    g.style.transform = `scale(${f(lerp(.9, 1, a))})`; g.style.opacity = a;
    // phase 1: Claude types the file line by line and the panel grows; phase 2: fast scroll
    const typed = Math.floor(pr(t, 12.9, 14.3) * 14) + 2;
    g.style.height = f(Math.min(640, 130 + typed * 34)) + 'px';
    let line, html;
    if (t < 14.3) { line = 20 + typed; html = codeLines(20, typed, typed - 1, CODE.slice(0)); }
    else {
      line = Math.round(t < 15.4 ? lerp(37, 276, eio(pr(t, 14.3, 15.4))) : lerp(276, 1058, eio(pr(t, 15.4, 16.1))));
      html = codeLines(line, 14, 8);
    }
    ln.textContent = line.toLocaleString('en-US');
    const speed = t > 14.4 && t < 16.0 ? Math.sin(pr(t, 14.4, 16.0) * Math.PI) : 0;
    cd.innerHTML = html;
    cd.style.filter = `blur(${f(speed * 6)}px)`;
    cd.style.transform = `translateY(${f(-speed * 30)}px)`;
  };
}]);

/* 5. the phone, the titanium, the light, the motion blur */
const MATS = {
  white: 'linear-gradient(135deg,#fbfbfa 0%,#efefed 45%,#e2e2df 100%)',
  titanium: 'linear-gradient(135deg,#7f8185 0%,#d2d3d5 22%,#64666a 46%,#aeb0b3 70%,#55575b 100%)',
  light: 'linear-gradient(135deg,#ffffff 0%,#f4f4f4 30%,#d4d4d6 48%,#ffffff 62%,#cfd0d2 100%)'
};
S.push([16.5, 20.3, el => {
  el.innerHTML = phoneHTML() + glass(60, 110, 960, 140, `<div class="hd"><span class="fn2">phone.js · line 5</span><span></span></div><div class="code ln3" style="padding-top:8px;font-size:25px"></div>`);
  fitIG(el);
  const off = $(el, '.off'), back = $(el, '.back'), fn = $(el, '.fn2'), ln = $(el, '.ln3'), bump = $(el, '.bump');
  off.style.opacity = 1;
  back.style.backgroundSize = '300% 300%';
  const TXT = [[16.5, 'phone.js · line 5', 'W, H, T = <span class="n">78.0</span>, <span class="n">163.4</span>, <span class="n">8.75</span>'],
    [17.25, 'phone.js · line 68', 'TITANIUM = rgb(<span class="s">"#DEDCD8"</span>), metal <span class="n">1.0</span>, rough <span class="n">0.2</span>'],
    [18.25, 'scene.js · line 1843', 'light.key({ x: <span class="n">-2</span>, y: <span class="n">4</span>, power: <span class="n">1200</span> })'],
    [19.0, 'scene.js · line 1843', 'motionBlur.shutter = arg(<span class="s">"--shutter"</span>, <span class="n">1.0</span>)']];
  let cur = -1;
  return t => {
    let i = 0; TXT.forEach((x, k) => { if (t >= x[0]) i = k; });
    if (i !== cur) { cur = i; fn.textContent = TXT[i][1]; ln.innerHTML = TXT[i][2]; }
    const mat = t < 17.4 ? 'white' : t < 18.5 ? 'titanium' : 'light';
    back.style.background = MATS[mat]; back.style.backgroundSize = '300% 300%';
    bump.style.background = mat === 'titanium' ? 'linear-gradient(135deg,#9a9ca0,#5f6165)' : 'linear-gradient(135deg,#f4f4f3,#d6d6d4)';
    const spin = eio(pr(t, 19.1, 19.55));
    const ry = lerp(196, 186, pr(t, 16.6, 19.0)) + spin * (360 - 186 + 8);
    const blur = Math.sin(spin * Math.PI) * 18;
    const a = eo(pr(t, 16.6, 16.85));
    const lightOn = mat === 'light' ? 1 : 0;
    setPhone(el, { x: 0, y: -150 + Math.sin(t * 1.3) * 6, rx: 6, ry, rz: 11, s: lerp(.9, 1.0, a), op: a, blur,
      shine: mat === 'light' ? 1 : mat === 'titanium' ? .55 : .2, glow: lightOn * .45 + .15, glowY: 0, glowR: 40 });
  };
}]);

/* 6. the screen isn't a picture, it's real code */
const PCODE = [
  ['', '<k>&lt;div</k> className=<s>"ig"</s>&gt;'],
  ['', '  <k>&lt;Name</k>&gt;primegrowth360<k>&lt;/Name&gt;</k>'],
  ['', '  <k>&lt;Count</k> n=<s>"1,095"</s> label=<s>"posts"</s> /&gt;'],
  ['', '  <k>&lt;Count</k> n=<s>"177K"</s> label=<s>"followers"</s> /&gt;'],
  ['', '  <k>&lt;Count</k> n=<s>"152"</s> label=<s>"following"</s> /&gt;'],
  ['', '  <k>&lt;Bio</k>&gt;MSME Business Coach · Gujarat<k>&lt;/Bio&gt;</k>'],
  ['', '  <k>&lt;Grid</k> posts={posts} cols={<n>3</n>} /&gt;'],
];
S.push([20.3, 24.0, el => {
  el.innerHTML = phoneHTML() + glass(110, 560, 860, 360, `<div class="hd"><span><b>ProfileIG.jsx</b> &nbsp;the screen, as code</span><span></span></div><div class="code pc"></div>`, 'pg');
  fitIG(el);
  const off = $(el, '.off'), pg = $(el, '.pg'), pc = $(el, '.pc');
  return t => {
    // screen: off -> on (20.75) -> off (21.6) -> ghost phone behind the code -> on again (24.0)
    off.style.opacity = t < 20.6 ? 1 : t < 21.5 ? 0 : t < 23.45 ? 1 : 1 - pr(t, 23.45, 23.6);
    const ghost = t >= 22.45 && t < 23.45 ? 1 : 0;
    setPhone(el, { y: -90 + Math.sin(t * 1.2) * 6, rx: 4, ry: lerp(-10, 6, pr(t, 20.3, 24.5)), rz: 3, s: .98, shine: .5, op: ghost ? .32 : 1 });
    const b = eo(pr(t, 22.45, 22.7));
    pg.style.opacity = t < 23.4 ? b : 1 - pr(t, 23.4, 23.6);
    pg.style.transform = `translateY(${f((1 - b) * 40)}px) scale(${f(lerp(.94, 1, b))})`;
    const hi = Math.min(6, Math.floor(pr(t, 22.5, 23.5) * 7));
    pc.innerHTML = codeLines(136, 7, hi, PCODE);
    pc.style.opacity = 1 - pr(t, 23.0, 23.2);
  };
}]);

/* 7. pinned to the four corners */
S.push([24.0, 25.9, el => {
  el.innerHTML = phoneHTML({ pins: true });
  fitIG(el);
  const pins = $$(el, '.pin'), edge = $(el, '.edge');
  return t => {
    setPhone(el, { rx: 6 + Math.sin(t * 1.1) * 4, ry: Math.sin((t - 24.0) * 2.2) * 24, rz: Math.sin((t - 24.0) * 1.6) * 5, s: 1.0, shine: .5 });
    pins.forEach((p, i) => { const a = pr(t, 24.0 + i * .06, 24.2 + i * .06); p.style.opacity = a; p.style.transform = `scale(${f(back(a))})`; });
    edge.style.opacity = pr(t, 24.05, 24.3);
  };
}]);

/* 8. "so it stays razor sharp" — one continuous dolly zoom ×1.0 -> ×7.7 into the live profile */
S.push([25.9, 28.0, el => {
  el.innerHTML = phoneHTML() + `<div class="zb" style="position:absolute;left:0;right:0;top:110px;text-align:center"><span style="font:600 24px 'JetBrains Mono';color:#ddd;background:rgba(255,255,255,.08);border-radius:20px;padding:6px 16px">×1.0</span></div>`;
  fitIG(el);
  const zb = $(el, '.zb span');
  return t => {
    const k = Math.pow(pr(t, 26.0, 27.15), 2.2);
    const s = Math.pow(7.7, k) * lerp(1, 1.04, pr(t, 27.15, 28.0));
    // keep the followers count / name area in frame while zooming
    const fx = 5, fy = -314;
    setPhone(el, { x: -fx * (s - 1) + lerp(0, -105, k), y: -fy * (s - 1) + lerp(0, 152, k), rx: lerp(6, 2, k), ry: lerp(-14, -4, k) + Math.sin(t) * 1.5, rz: lerp(2, 4, k), s, shine: lerp(.5, .1, k) });
    zb.textContent = '×' + s.toFixed(1);
  };
}]);

/* 9. type driven by one file — change a word, the sequence re-renders */
S.push([28.0, 35.0, el => {
  el.innerHTML = `<div class="mini" style="background:#000"><div class="bars" style="opacity:0">${'<i></i>'.repeat(6)}</div>
      <div class="multi kin" style="transform:rotate(-6deg)"><span style="color:#ffd02a;font-size:70px;text-shadow:0 0 20px rgba(255,208,42,.7)">one line</span><span style="color:#ff2d1a;font-size:50px">no keyframes</span><span style="font-size:46px">just type</span><span style="color:#ff2d1a;font-size:72px;margin-top:10px;text-shadow:0 0 20px #ff2d1a">GROWTH</span></div>
      <div class="kt kin" style="color:#ff2d1a;font-size:64px;text-shadow:0 0 26px rgba(255,45,26,.9);white-space:nowrap;opacity:0">1,095 of you</div>
      <div class="tl kin" style="opacity:0"></div>
      <div class="rbar" style="position:absolute;left:24px;right:24px;bottom:22px;height:44px;border-radius:22px;background:rgba(40,12,10,.8);border:2px solid rgba(255,255,255,.2);font:500 18px 'JetBrains Mono';color:#ddd;display:flex;align-items:center;padding:0 16px;gap:8px;opacity:0;overflow:hidden">
        <i class="rp" style="position:absolute;left:0;top:0;bottom:0;background:rgba(255,45,26,.35)"></i><span style="color:#ff2d1a;position:relative">●</span><span class="rt" style="position:relative">Rendering 71 / 936 · time-lapse</span></div></div>` +
    glass(160, 1040, 760, 210, `<div class="hd"><span><b>script.json</b> <span class="ed"></span></span><span></span></div><div class="code jc" style="font-size:24px"></div>`, 'jp');
  const mini = $(el, '.mini'), multi = $(el, '.multi'), kt = $(el, '.kt'), tl = $(el, '.tl'), jc = $(el, '.jc'), ed = $(el, '.ed'), jp = $(el, '.jp'),
    rbar = $(el, '.rbar'), rp = $(el, '.rp'), rt = $(el, '.rt'), bars = $(el, '.bars');
  // time-lapse frames of the re-render (one every half second, like the reference)
  const TL = [
    [31.5, '#000', `<img src="${A}avatar.jpg" style="width:200px;border-radius:50px;filter:blur(10px)">`],
    [32.0, '#000', '<span style="color:#ff2d1a;font-size:64px;white-space:nowrap">177K <span style="opacity:.4">of</span></span>'],
    [32.5, '#000', `<div style="position:relative;width:260px;height:260px">${[0, 1, 2, 3, 4].map(i => `<i style="position:absolute;left:0;top:${150 - i * 14}px;width:260px;height:90px;border-radius:50%;border:4px solid rgba(255,70,40,${f(.9 - i * .15)});box-shadow:0 0 20px #ff2d1a"></i>`).join('')}<img src="${A}avatar.jpg" style="position:absolute;left:70px;top:20px;width:120px;border-radius:30px;background:#fff;box-shadow:0 0 30px rgba(255,255,255,.5)"></div>`],
    [33.0, '#e9e9e9', '<div style="color:#111;font-size:78px;line-height:1">Watch<br><span style="font-size:60px">it grow</span></div>'],
    [33.5, '#000', `<div style="display:flex;align-items:center;gap:12px"><img src="${A}avatar.jpg" style="width:70px;border-radius:18px"><span style="font-size:46px;letter-spacing:-1px">primegrowth360</span></div>`],
    [34.0, '#000', '<span style="color:#ff2d1a;font-size:64px;white-space:nowrap;text-shadow:0 0 26px #ff2d1a">177K <span style="opacity:.5">of</span></span>'],
    [34.3, '#000', '<span style="color:#ff2d1a;font-size:64px;white-space:nowrap;text-shadow:0 0 26px #ff2d1a">177K of you</span>'],
  ];
  let tlCur = -1;
  return t => {
    const a = eo(pr(t, 28.0, 28.35));
    mini.style.transform = `scale(${f(lerp(1.15, 1, a))})`;
    // 28.0 multi-line type, 29.4 "1,095 of you", 30.0 bars behind it
    multi.style.opacity = t < 28.45 ? 1 : 0;
    multi.style.filter = `blur(${f((1 - pr(t, 28.0, 28.25)) * 10)}px)`;
    const showKt = t >= 28.45 && t < 31.5;
    kt.style.opacity = showKt ? 1 : 0;
    bars.style.opacity = t >= 28.95 && t < 31.5 ? 1 : 0;
    bars.style.transform = `translateX(${f(Math.sin(t * 1.7) * 40)}px)`;
    kt.style.transform = `translateX(${f(Math.sin(t * 2.3) * 30)}px)`;
    // the edit in script.json: "1,095" -> "177K"
    let val = '1,095';
    if (t >= 31.0) {
      const d = pr(t, 31.0, 31.25), ty = pr(t, 31.3, 31.6);
      val = ty > 0 ? '177K'.slice(0, Math.ceil(ty * 4)) : '1,095'.slice(0, Math.round((1 - d) * 5));
    }
    const caret = t >= 31.0 && t < 32.0 && Math.floor(t * 4) % 2 ? '|' : '';
    jc.innerHTML = `<span class="ln">445</span>"id": <span class="s">"19"</span>,\n<span class="ln">446</span>"start": <span class="n">712</span>,\n<span class="hi"><span class="ln">456</span>"text": <span class="s">"${val}${caret}"</span>,</span>`;
    ed.textContent = t >= 31.0 ? '· edited' : '';
    jp.style.opacity = t < 32.0 ? 1 : 1 - pr(t, 32.0, 32.4);
    // re-render time-lapse
    let k = -1; TL.forEach((x, i) => { if (t >= x[0]) k = i; });
    tl.style.opacity = k >= 0 ? 1 : 0;
    if (k !== tlCur) { tlCur = k; if (k >= 0) { tl.innerHTML = TL[k][2]; mini.style.background = TL[k][1]; } else mini.style.background = '#000'; }
    const tp = k >= 0 ? pr(t, TL[k][0], TL[k][0] + .15) : 1;
    tl.style.filter = `blur(${f((1 - tp) * 8)}px)`;
    rbar.style.opacity = t >= 32.5 ? 1 : 0;
    const n = Math.round(lerp(71, 936, eio(pr(t, 32.5, 34.3))));
    rp.style.width = f(n / 936 * 100) + '%';
    rt.textContent = `Rendering ${n} / 936 · time-lapse`;
  };
}]);

/* 10. 177K of you — the small phone grows to fill the frame */
S.push([35.0, 35.6, el => {
  el.innerHTML = `<div class="gr" style="position:absolute;background:#000;border-radius:44px;overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.6)">
    <div class="big kin" style="color:#ff2d1a;white-space:nowrap;text-shadow:0 0 50px rgba(255,45,26,.9),0 0 120px rgba(255,45,26,.5)">177K of you</div></div>`;
  const gr = $(el, '.gr'), b = $(el, '.big');
  return t => {
    const k = eio(pr(t, 35.0, 35.3));
    const w = lerp(430, 1080, k), h = lerp(765, 1920, k);
    Object.assign(gr.style, { left: f(540 - w / 2) + 'px', top: f(lerp(630, 960, k) - h / 2) + 'px', width: f(w) + 'px', height: f(h) + 'px', borderRadius: f(lerp(44, 0, k)) + 'px' });
    b.style.fontSize = f(lerp(64, 150, k)) + 'px';
    b.style.filter = `blur(${f(Math.sin(t * 40) > .92 ? 3 : 0)}px)`;
  };
}]);

/* 11. Zero keyframes. Just type. */
S.push([35.6, 37.0, el => {
  el.innerHTML = `<div class="kin" style="transform:rotate(-7deg)">
    <div class="z1" style="color:#ffd02a;font-size:210px;text-shadow:0 0 50px rgba(255,208,42,.8)">Zero</div>
    <div class="z2" style="color:#ff2d1a;font-size:130px;text-shadow:0 0 30px rgba(255,45,26,.8)">keyframes</div>
    <div class="z3" style="color:#fff;font-size:90px;margin-top:10px">just type</div></div>`;
  const z = ['.z1', '.z2', '.z3'].map(s => $(el, s));
  return t => {
    z.forEach((e, i) => {
      const a = pr(t, 35.65 + i * .22, 35.95 + i * .22);
      e.style.transform = `translateX(${f((1 - eo(a)) * -500)}px)`;
      e.style.filter = `blur(${f((1 - a) * 18 + pr(t, 36.75, 37.0) * 14)}px)`;
      e.style.opacity = a;
    });
  };
}]);

/* 12. Just direction. */
S.push([37.0, 38.5, el => {
  el.innerHTML = `<div class="drip kin" style="transform:rotate(-5deg)"><div style="position:relative"><span style="color:#e3241a;font-size:170px;letter-spacing:-6px;text-shadow:0 0 30px rgba(255,45,26,.6)">BRANDING</span>` + [90, 260, 470, 640].map((x, i) => `<i style="position:absolute;left:${x}px;top:150px;width:${16 + i % 2 * 10}px;height:${90 + i * 40}px;border-radius:0 0 14px 14px;background:#c81d14"></i>`).join('') + `</div></div><div class="bars" style="filter:blur(5px)">${'<i></i>'.repeat(6)}</div>
    <div class="dt kin" style="color:#ff2d1a;font-size:150px;white-space:nowrap;text-shadow:0 0 40px #ff2d1a">grow with AI</div>`;
  const bars = $(el, '.bars'), dt = $(el, '.dt');
  return t => {
    const k = pr(t, 37.45, 38.5), on = t >= 37.45;
    $(el, '.drip').style.opacity = on ? 0 : 1;
    bars.style.transform = `translateX(${f(lerp(-120, 120, k))}px) scale(1.2)`;
    bars.style.opacity = t >= 37.9 ? .8 * pr(t, 37.9, 38.1) : 0;
    dt.style.filter = `blur(${f(lerp(14, 3, eo(pr(t, 37.45, 38.2))))}px)`;
    dt.style.opacity = on ? pr(t, 37.5, 37.9) : 0;
  };
}]);

/* 13. logo card */
S.push([38.5, 40.0, el => {
  el.innerHTML = `<div class="lg" style="position:absolute;left:0;right:0;top:760px;display:flex;align-items:center;justify-content:center;gap:28px">
      <img src="${A}avatar.jpg" style="width:150px;height:150px;border-radius:38px;box-shadow:0 0 50px rgba(255,45,26,.6)">
      <span style="font:800 104px Inter;letter-spacing:-4px">primegrowth360</span></div>
    <div class="tg" style="position:absolute;left:0;right:0;top:960px;text-align:center;font:500 44px Inter;color:#d9d0ce">Grow with AI.</div>`;
  const lg = $(el, '.lg'), tg = $(el, '.tg');
  return t => {
    const a = eo(pr(t, 38.5, 38.85));
    lg.style.transform = `scale(${f(lerp(.6, 1, a))})`; lg.style.opacity = a; lg.style.filter = `blur(${f((1 - a) * 12)}px)`;
    tg.style.opacity = pr(t, 38.8, 39.1);
  };
}]);

/* 14. full method — lock */
S.push([40.0, 42.4, el => {
  el.innerHTML = `<svg class="lock" viewBox="0 0 60 80" style="position:absolute;left:495px;top:380px;width:90px">
      <path class="sh" d="M14 34 V22 a16 16 0 0 1 32 0 V34" fill="none" stroke="#ff2d1a" stroke-width="7" stroke-linecap="round"/>
      <rect x="6" y="34" width="48" height="40" rx="9" fill="#ff2d1a"/><circle cx="30" cy="52" r="5" fill="#3a0b06"/><rect x="28" y="54" width="4" height="10" fill="#3a0b06"/></svg>
    <div style="position:absolute;left:0;right:0;top:530px;text-align:center;font:800 70px/1.3 Inter, 'Anek Gujarati';letter-spacing:-1px"><span style="color:#ff2d1a">Premium 3D AI Videos</span><br><span style="font-size:62px">બનાવતાં શીખવું છે?</span></div>`;
  const sh = $(el, '.sh');
  return t => {
    const open = t < 40.3 ? 1 : 1 - eo(pr(t, 40.3, 40.5));
    sh.setAttribute('transform', `translate(${f(open * 16)} ${f(-open * 8)}) rotate(${f(open * 28)} 46 34)`);
  };
}]);

/* 15. Comment AI */
S.push([42.4, 46.0, el => {
  el.innerHTML = `<div class="c1" style="position:absolute;left:0;right:0;top:230px;text-align:center;font:800 92px Inter;letter-spacing:-2px">Comment</div>
    <div class="c2" style="position:absolute;left:0;right:0;top:345px;text-align:center;font:900 250px/1.2 Inter;letter-spacing:-8px;color:#ff2d1a;text-shadow:0 0 60px rgba(255,45,26,.7)">LEARN</div>` +
    glass(40, 840, 1000, 450, `<div style="text-align:center;font:700 26px Inter;color:#fff;padding-top:20px">Comments</div>
      <div class="empty" style="text-align:center;font-family:Inter;padding-top:80px"><div style="font-weight:700;font-size:28px;color:#fff">No comments yet</div><div style="font-size:21px;color:#aaa;margin-top:6px">Start the conversation.</div></div>
      <div class="cm" style="font-family:Inter;padding:22px 30px;display:none">
        <div style="display:flex;gap:16px"><div style="width:54px;height:54px;border-radius:50%;background:#555;flex:none"></div>
          <div style="flex:1"><div style="font-size:19px;color:#aaa">you <span style="color:#777">now</span></div><div style="font-weight:800;font-size:44px;color:#fff">LEARN</div>
            <div class="rep" style="opacity:0;margin-top:8px">
              <div style="display:flex;align-items:center;gap:10px"><img src="${A}avatar.jpg" style="width:40px;height:40px;border-radius:50%"><span style="font-weight:700;font-size:21px;color:#fff">primegrowth360</span><span style="font-size:15px;background:#3a3a3a;color:#ccc;border-radius:6px;padding:2px 8px">Author</span></div>
              <div style="font-size:28px;color:#fff;margin:4px 0 0 50px;font-family:'Anek Gujarati',Inter">Details મોકલી દીધી છે ✓</div>
              <div class="card" style="opacity:0;margin:12px 0 0 50px;display:flex;gap:14px;align-items:center;background:rgba(0,0,0,.35);border-radius:14px;padding:12px">
                <img src="${A}post7.jpg" style="width:60px;height:80px;border-radius:8px;object-fit:cover"><div><div style="font-weight:700;font-size:24px;color:#fff">AI Video Training Batch</div><div style="font-size:20px;color:#aaa;font-family:'Anek Gujarati',Inter">1 ડિસેમ્બરથી શરૂ</div></div></div></div></div>
          <div class="heart" style="font-size:34px;color:#888">♡</div></div></div>
      <div style="position:absolute;left:24px;right:24px;bottom:20px;height:60px;border-radius:30px;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;padding:0 10px 0 26px;font:21px Inter;color:#999"><span class="inp" style="font-weight:600">Add a comment…</span><span class="send" style="width:44px;height:44px;border-radius:50%;background:#fff;color:#111;display:flex;align-items:center;justify-content:center;font-size:24px">↑</span></div>`, 'cp');
  const c1 = $(el, '.c1'), c2 = $(el, '.c2'), empty = $(el, '.empty'), cm = $(el, '.cm'), rep = $(el, '.rep'), card = $(el, '.card'), heart = $(el, '.heart'), cp = $(el, '.cp'), inp = $(el, '.inp'), send = $(el, '.send');
  return t => {
    const a = eo(pr(t, 42.4, 42.6));
    c1.style.opacity = a; c1.style.transform = `translateY(${f((1 - a) * 40)}px)`;
    const b = pr(t, 42.45, 42.7);
    c2.style.opacity = b; c2.style.transform = `translateY(${f((1 - eo(b)) * -80)}px) scale(${f(lerp(1.6, 1, eo(b)))})`;
    cp.style.opacity = eo(pr(t, 42.45, 42.75));
    const has = t >= 43.4;
    const typed = 'LEARN'.slice(0, Math.ceil(pr(t, 42.85, 43.25) * 5));
    inp.textContent = t >= 43.4 || !typed ? 'Add a comment…' : typed;
    inp.style.color = typed && t < 43.4 ? '#fff' : '#999';
    send.style.background = typed && t < 43.4 ? '#ff2d1a' : '#fff'; send.style.color = typed && t < 43.4 ? '#fff' : '#111';
    empty.style.display = has ? 'none' : 'block'; cm.style.display = has ? 'block' : 'none';
    heart.textContent = t >= 43.9 ? '♥' : '♡'; heart.style.color = t >= 43.9 ? '#ff2d1a' : '#888';
    heart.style.transform = `scale(${f(t >= 43.9 ? back(pr(t, 43.9, 44.15)) : 1)})`;
    rep.style.opacity = pr(t, 44.0, 44.25); card.style.opacity = pr(t, 44.4, 44.65);
  };
}]);

/* 16. outro — the phone pops out of the comment panel in a black card, wide-angle pose */
S.push([45.95, 47, el => {
  el.innerHTML = `<div class="snapC layer"></div><div class="card" style="position:absolute;border-radius:34px;background:#040404;box-shadow:0 30px 90px rgba(0,0,0,.7)"></div>` + phoneHTML();
  fitIG(el);
  const snap = $(el, '.snapC'), card = $(el, '.card');
  return t => {
    const g = eo(pr(t, 45.95, 46.4));
    snap.style.opacity = 1 - pr(t, 46.0, 46.35);
    // card grows from the comment panel to a tall frame, then dissolves into the background
    const w = lerp(150, 760, g), h = lerp(270, 1620, g), cx = lerp(470, 540, g), cy = lerp(1120, 930, g);
    Object.assign(card.style, { left: f(cx - w / 2) + 'px', top: f(cy - h / 2) + 'px', width: f(w) + 'px', height: f(h) + 'px', opacity: f(1 - pr(t, 46.45, 46.9) * .85) });
    setPhone(el, { ...WIDE, x: lerp(-70, 0, g), y: lerp(200, -150, g) + Math.sin(t * 2) * 6, s: lerp(.25, 1.2, g) + pr(t, 46.4, 47) * .05, rz: lerp(-8, -6, pr(t, 46.4, 47)) });
  };
}]);

/* ---- extra CTA shots for the Gujarati voice-over (their time = voice time) ---- */
const GJ = `'Anek Gujarati', Inter, sans-serif`;
/* 17. ખાસ તમારા માટે — નવી Training Batch — 1 ડિસેમ્બર */
S.push([62.6, 67.4, el => {
  el.innerHTML = `<div class="l1" style="position:absolute;left:0;right:0;top:360px;text-align:center;font:800 96px/1.15 ${GJ};text-shadow:0 0 40px rgba(255,45,26,.5)">ખાસ તમારા માટે</div>
    <div class="l2" style="position:absolute;left:0;right:0;top:360px;text-align:center;font:800 78px/1.15 ${GJ};opacity:0">નવી <span style="color:#ff2d1a">Training Batch</span></div>
    <div class="cal glass" style="left:330px;top:560px;width:420px;height:470px;opacity:0;text-align:center;font-family:Inter">
      <div style="background:#ff2d1a;color:#fff;font:800 58px Inter;letter-spacing:6px;padding:18px 0;box-shadow:0 0 40px rgba(255,45,26,.6)">DEC</div>
      <div style="font:900 270px/1.15 Inter;color:#fff;letter-spacing:-10px">1</div></div>
    <div class="l3" style="position:absolute;left:0;right:0;top:1080px;text-align:center;font:800 92px ${GJ};color:#ff2d1a;text-shadow:0 0 40px rgba(255,45,26,.7);opacity:0">થી શરૂ!</div>`;
  const l1 = $(el, '.l1'), l2 = $(el, '.l2'), cal = $(el, '.cal'), l3 = $(el, '.l3');
  return t => {
    const a = eo(pr(t, 62.7, 63.0));
    l1.style.opacity = t < 63.9 ? a : 1 - pr(t, 63.9, 64.1);
    l1.style.transform = `scale(${f(lerp(1.3, 1, a))})`; l1.style.filter = `blur(${f((1 - a) * 12)}px)`;
    const b = eo(pr(t, 64.0, 64.3));
    l2.style.opacity = b; l2.style.transform = `translateY(${f((1 - b) * 40)}px)`;
    const c = pr(t, 65.45, 65.8);
    cal.style.opacity = c; cal.style.transform = `perspective(900px) rotateX(${f((1 - eo(c)) * 50)}deg) translateY(${f((1 - eo(c)) * -120 + Math.sin(t * 2) * 6)}px) scale(${f(back(c))})`;
    const d = pr(t, 66.1, 66.35);
    l3.style.opacity = d; l3.style.transform = `scale(${f(lerp(1.4, 1, eo(d)))})`;
  };
}]);

/* 18. આમાં તમે શીખી શકશો — 4 modules checklist */
S.push([67.4, 74.0, el => {
  const items = [['AI Tools', 67.9], ['3D Animation', 69.2], ['Cinematic Editing', 70.5], ['Advanced Video Creation', 72.1]];
  el.innerHTML = `<div class="ttl" style="position:absolute;left:0;right:0;top:330px;text-align:center;font:800 80px ${GJ}">આમાં તમે <span style="color:#ff2d1a">શીખશો</span></div>` +
    items.map(([txt], i) => glass(110, 540 + i * 175, 860, 140, `<div style="display:flex;align-items:center;gap:28px;height:100%;padding:0 34px;font:800 54px Inter;color:#fff;letter-spacing:-1px">
      <span style="flex:none;width:76px;height:76px;border-radius:50%;background:#ff2d1a;display:flex;align-items:center;justify-content:center;font-size:44px;box-shadow:0 0 30px rgba(255,45,26,.7)">✓</span>${txt}</div>`, 'it it' + i)).join('');
  const rows = items.map((_, i) => $(el, '.it' + i)), ttl = $(el, '.ttl');
  return t => {
    const a = eo(pr(t, 67.45, 67.8));
    ttl.style.opacity = a; ttl.style.transform = `translateY(${f((1 - a) * 30)}px)`;
    rows.forEach((r, i) => {
      const k = pr(t, items[i][1], items[i][1] + .3);
      r.style.opacity = k; r.style.transform = `translateX(${f((1 - eo(k)) * 300)}px)`;
      r.style.borderColor = t >= items[i][1] && t < items[i][1] + 1.0 ? 'rgba(255,45,26,.9)' : 'rgba(255,255,255,.16)';
    });
  };
}]);

/* 19. શીખવા માટે તૈયાર છો? */
S.push([74.0, 75.6, el => {
  el.innerHTML = `<div class="kin" style="font-family:${GJ}"><div class="r1" style="font-size:110px;font-weight:800">શીખવા માટે</div>
    <div class="r2" style="font-size:160px;font-weight:800;color:#ff2d1a;text-shadow:0 0 50px rgba(255,45,26,.8)">તૈયાર છો?</div></div>`;
  const r1 = $(el, '.r1'), r2 = $(el, '.r2');
  return t => {
    const a = eo(pr(t, 74.1, 74.35)), b = pr(t, 74.6, 74.9);
    r1.style.opacity = a; r1.style.transform = `translateY(${f((1 - a) * 40)}px)`;
    r2.style.opacity = b; r2.style.transform = `scale(${f(lerp(1.5, 1, eo(b)))})`; r2.style.filter = `blur(${f((1 - b) * 12)}px)`;
  };
}]);

/* 20. WhatsApp number — digits typed with the voice */
S.push([78.2, 82.6, el => {
  el.innerHTML = glass(90, 560, 900, 560, `<div style="text-align:center;font-family:${GJ};padding-top:56px">
      <div style="width:150px;height:150px;margin:0 auto;border-radius:50%;background:#25d366;display:flex;align-items:center;justify-content:center;box-shadow:0 0 50px rgba(37,211,102,.55)">
        <svg viewBox="0 0 24 24" width="80" height="80"><path fill="#fff" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z"/></svg></div>
      <div style="font-size:64px;font-weight:800;color:#fff;margin-top:34px">WhatsApp કરો</div>
      <div class="num" style="font:800 116px Inter;letter-spacing:2px;color:#fff;margin-top:26px;text-shadow:0 0 30px rgba(255,45,26,.6)"></div>
      <div style="font:600 34px Inter;color:#cdbbb5;margin-top:10px">primegrowth360</div></div>`, 'wa');
  const num = $(el, '.num'), wa = $(el, '.wa');
  const D1 = '84603', D2 = '72867';
  return t => {
    const a = eo(pr(t, 78.2, 78.5));
    wa.style.opacity = a; wa.style.transform = `scale(${f(lerp(.9, 1, a))})`;
    const n1 = Math.round(pr(t, 78.45, 80.1) * 5), n2 = Math.round(pr(t, 80.5, 82.3) * 5);
    const caret = Math.floor(t * 3) % 2 ? '<span style="color:#ff2d1a">|</span>' : '<span style="opacity:0">|</span>';
    num.innerHTML = D1.slice(0, n1) + (n1 === 5 ? ' ' : '') + D2.slice(0, n2) + (n2 < 5 ? caret : '');
  };
}]);

/* ------------------------------------------------------------------ */
/* timeline — voice-over times (1x seconds); playback runs SPEED x faster */
/* ------------------------------------------------------------------ */
const SPEED = 1.3;
// [voice start, scene index in S, warp [[voiceTime, sceneTime], ...], caption top]
const SCN = [
  [0, 0, [[0, 0], [3.56, 2.85]], 0],
  [3.56, 1, [[3.56, 2.85], [4.2, 3.25], [6.3, 4.0], [8.6, 5.38]], 1350],
  [8.6, 2, [[8.6, 5.4], [10.85, 6.4], [16.9, 12.55]], 1350],
  [16.9, 3, [[16.9, 12.6], [19.8, 14.3], [23.9, 16.45]], 1350],
  [23.9, 4, [[23.9, 16.5], [25.2, 17.4], [26.0, 18.5], [26.9, 19.1], [27.6, 19.6], [29.1, 20.25]], 1470],
  [29.1, 5, [[29.1, 20.3], [29.6, 20.65], [31.9, 21.5], [33.4, 22.45], [34.3, 23.3], [34.8, 23.95]], 1470],
  [34.8, 6, [[34.8, 24.0], [38.5, 25.89]], 1470],
  [38.5, 7, [[38.5, 25.9], [38.6, 26.0], [40.1, 27.15], [41.5, 27.99]], 1470],
  [41.5, 8, [[41.5, 28.0], [43.4, 28.45], [44.5, 28.95], [47.6, 30.95], [48.9, 31.7], [49.1, 32.0], [51.4, 34.5], [51.9, 34.99]], 1350],
  [51.9, 9, [[51.9, 35.0], [52.4, 35.59]], 1350],
  [52.4, 10, [[52.4, 35.6], [54.9, 36.99]], 1470],
  [54.9, 11, [[54.9, 37.0], [55.4, 37.45], [56.6, 37.9], [58.1, 38.49]], 1470],
  [58.1, 12, [[58.1, 38.5], [59.4, 39.99]], 1350],
  [59.4, 13, [[59.4, 40.0], [59.9, 40.3], [62.6, 42.39]], 1180],
  [62.6, 16, [[0, 0], [100, 100]], 1450],
  [67.4, 17, [[0, 0], [100, 100]], 1500],
  [74.0, 18, [[0, 0], [100, 100]], 1400],
  [75.6, 14, [[75.6, 42.4], [76.25, 42.85], [76.9, 43.4], [77.3, 43.9], [77.5, 44.0], [77.8, 44.4], [78.2, 44.9]], 1380],
  [78.2, 19, [[0, 0], [100, 100]], 1450],
  [82.6, 15, [[82.6, 45.95], [83.4, 46.4], [86.4, 47.0]], 1600],
];
const A_END = 86.36, A_HOLD = A_END + .6;
const DUR = A_HOLD / SPEED;

/* captions: spoken lines [voice start, voice end, text] — words appear as spoken, the latest one sits in the red pill */
const LINES = [
  [3.93, 5.92, 'તેમાં After Effects નથી,'], [6.12, 8.27, 'Manual Keyframes બનાવવાની પણ જરૂર નથી!'],
  [8.92, 10.28, 'સૌથી પહેલાં Rhythm'],
  [10.85, 16.80, 'Secret LLM દરેક Cut અને દરેક શબ્દને Music ના Beat સાથે Frame-by-Frame Match કરે છે.'],
  [17.40, 19.29, 'ત્યારબાદ 3D Animation'],
  [19.81, 23.64, 'Secret LLM આખું Blender Scene તૈયાર કરવા માટે Code લખે છે.'],
  [24.10, 28.77, 'તેમાં Foam, Titanium, Lighting અને Motion Blur જેવી દરેક વસ્તુ સામેલ છે.'],
  [29.33, 30.31, 'Screen Animation'],
  [30.84, 32.91, 'સ્ક્રીન માત્ર એક સામાન્ય Picture નથી.'], [33.45, 34.43, 'તે Real Code છે,'],
  [34.83, 38.25, 'જે ફોનના ચારેય ખૂણા સાથે ચોક્કસ રીતે જોડાયેલો રહે છે,'], [38.60, 40.98, 'જેથી સ્ક્રીન હંમેશાં Sharp દેખાય છે.'],
  [41.52, 42.87, 'ત્યારબાદ Typography'],
  [43.43, 46.97, 'આખા Text Animation ને એક જ File દ્વારા Control કરવામાં આવે છે.'],
  [47.44, 48.88, 'તમે માત્ર એક શબ્દ બદલો'], [49.05, 51.40, 'અને આખી Sequence ફરીથી Render થઈ જાય છે.'],
  [51.99, 54.84, 'ન After Effects, ન Manual Keyframes.'], [55.04, 56.60, 'માત્ર તમારી Direction'], [56.77, 58.05, 'અને AI ની Power!'],
  [58.64, 62.23, 'તમારે પણ આ પ્રકારના Premium 3D AI Videos બનાવતાં શીખવું છે?'],
  [62.71, 65.33, 'તો ખાસ તમારા માટે અમારી નવી Training Batch'], [65.49, 67.06, '1 ડિસેમ્બરથી શરૂ થઈ રહી છે!'],
  [67.50, 69.00, 'આમાં તમે AI Tools,'], [69.17, 70.28, '3D Animation,'], [70.43, 73.66, 'Cinematic Editing અને Advanced Video Creation શીખી શકશો.'],
  [74.13, 75.27, 'શીખવા માટે તૈયાર છો?'], [75.68, 76.95, 'કોમેન્ટમાં LEARN લખો'], [77.18, 78.04, 'અથવા WhatsApp કરો:'],
  [78.41, 80.19, '84603'], [80.47, 82.39, '72867'],
  [82.84, 86.12, 'તમારી Editing ને Next Level પર લઈ જવાનો સમય આવી ગયો છે!'],
];
// split each line into short chunks (max 3 words / 22 chars); word times follow character count
const CH = [];
LINES.forEach(([s, e, text]) => {
  const words = text.split(' ');
  const total = words.reduce((n, w) => n + w.length + 1, 0);
  let acc = 0, cur = [];
  const flush = () => { if (cur.length) { CH.push(cur); cur = []; } };
  words.forEach(w => {
    const len = cur.reduce((n, x) => n + x.w.length + 1, 0);
    if (cur.length && (cur.length >= 3 || len + w.length > 22)) flush();
    cur.push({ w, t: s + (e - s) * acc / total }); acc += w.length + 1;
  });
  flush();
  CH[CH.length - 1].end = e;
});
CH.forEach((c, i) => { c.ts = c[0].t; c.te = i + 1 < CH.length ? Math.min(CH[i + 1][0].t, (c.end ?? CH[i + 1][0].t) + .5) : A_HOLD; });

const capEl = document.getElementById('cap');
let capCur = -1, capN = -1;
function renderCap(a, top) {
  let i = -1; CH.forEach((c, k) => { if (a >= c.ts && a < c.te) i = k; });
  if (i < 0) { capEl.innerHTML = ''; capCur = -1; return; }
  const c = CH[i];
  let n = 0; c.forEach((w, k) => { if (a >= w.t) n = k + 1; });
  if (i !== capCur || n !== capN) {
    capCur = i; capN = n;
    capEl.innerHTML = c.slice(0, n).map((w, k) => `<span class="w${k === n - 1 ? ' hl' : ''}">${w.w}</span>`).join('');
  }
  const lt = a - c[n - 1].t;
  const k = pr(lt, 0, .12);
  capEl.style.transform = `scale(${f(lerp(.9, 1, back(k)))})`;
  capEl.style.opacity = 1;
  capEl.style.top = top + 'px';
}

/* ------------------------------------------------------------------ */
/* engine                                                               */
/* ------------------------------------------------------------------ */
const sceneEl = document.getElementById('scene');
const bgEl = document.getElementById('bg');
const flash = document.getElementById('flash');
let cur = -1, upd = null;
function warp(keys, a) {
  if (a <= keys[0][0]) return keys[0][1] + (a - keys[0][0]);
  for (let i = 1; i < keys.length; i++) {
    const [a0, v0] = keys[i - 1], [a1, v1] = keys[i];
    if (a <= a1) return v0 + (v1 - v0) * (a - a0) / (a1 - a0);
  }
  const [a0, v0] = keys[keys.length - 2], [a1, v1] = keys[keys.length - 1];
  return v1 + (a - a1) * Math.min(1, (v1 - v0) / (a1 - a0));
}
function bg(vt, a) {
  // red radial glow; stronger on the "No" and CTA shots, near-black on the close-ups
  let inner = '#3d0c07', mid = '#1c0503', glowY = 48;
  if (a >= 59.4) { inner = '#5a1209'; mid = '#240604'; glowY = 40; }
  else if (vt >= 2.85 && vt < 5.4) { inner = '#8a1508'; mid = '#3a0904'; }
  else if (vt < 2.85 || (vt >= 26.4 && vt < 28.0) || (vt >= 35.0 && vt < 38.5)) { inner = '#140404'; mid = '#070101'; }
  bgEl.style.background = `radial-gradient(ellipse 70% 55% at 50% ${glowY}%, ${inner} 0%, ${mid} 55%, #000 100%)`;
}
function render(T) {
  const a = T * SPEED;                       // position in the 1x voice-over
  let i = 0; SCN.forEach((s, k) => { if (a >= s[0]) i = k; });
  const [a0, si, keys, top] = SCN[i];
  if (i !== cur) {
    cur = i;
    sceneEl.innerHTML = '<div class="layer"></div>';
    upd = S[si][2](sceneEl.firstChild) || null;
  }
  const vt = warp(keys, a);
  if (upd) upd(vt);
  // cut transition: quick zoom-blur into every new shot
  const w = i === 0 ? 1 : pr(a - a0, 0, .28);
  sceneEl.style.transform = `scale(${f(lerp(1.08, 1, eo(w)))})`;
  sceneEl.style.filter = w < 1 ? `blur(${f((1 - w) * 14)}px)` : 'none';
  flash.style.opacity = (a >= 8.5 && a < 8.9) ? f((1 - pr(a, 8.5, 8.9)) * .9) : (a >= 58.0 && a < 58.3) ? f((1 - pr(a, 58.0, 58.3)) * .5) : 0;
  bg(vt, a);
  if (top) renderCap(a, top); else capEl.innerHTML = '';
}

/* ---- clock & controls ---- */
const params = new URLSearchParams(location.search);
const audio = document.getElementById('audio');
const playBtn = document.getElementById('play'), scrub = document.getElementById('scrub'), clock = document.getElementById('clock');
let playing = false, base = 0, t0 = 0;
const now = () => performance.now() / 1000;
const time = () => playing ? Math.min(DUR, base + now() - t0) : base;
function seek(t) { base = cl(t, 0, DUR); t0 = now(); if (playing) { try { audio.currentTime = base; } catch (e) {} } render(base); }
function play() {
  if (base >= DUR - .05) base = 0;
  playing = true; t0 = now();
  if (!params.has('record')) { try { audio.currentTime = base; audio.play().catch(() => {}); } catch (e) {} }
  playBtn.textContent = '❚❚'; document.getElementById('start')?.remove();
}
function pause() { base = time(); playing = false; audio.pause(); playBtn.textContent = '▶'; }
playBtn.onclick = () => playing ? pause() : play();
scrub.max = DUR.toFixed(2);
scrub.oninput = () => seek(+scrub.value);
document.getElementById('full').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
  if (e.key === 'f') document.getElementById('full').click();
  if (e.key === 'ArrowRight') seek(time() + 1); if (e.key === 'ArrowLeft') seek(time() - 1);
});
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function loop() {
  if (playing) { const t = time(); render(t); if (t >= DUR) pause(); }
  scrub.value = time(); clock.textContent = `${fmt(time())} / ${fmt(DUR)}`;
  requestAnimationFrame(loop);
}
function fit() {
  const vp = document.getElementById('viewport');
  document.getElementById('stage').style.transform = `scale(${Math.min(vp.clientWidth / 1080, vp.clientHeight / 1920)})`;
}
addEventListener('resize', fit);
if (params.has('record')) document.body.classList.add('record');
fit();
seek(+(params.get('t') || 0));
if (!params.has('t') && !params.has('record')) {
  document.getElementById('stage').insertAdjacentHTML('beforeend', '<button id="start">▶</button>');
  document.getElementById('start').onclick = play;
}
requestAnimationFrame(loop);
window.REEL = { seek, play, pause, DUR, render, SPEED };
})();
