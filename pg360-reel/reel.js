/* Prime Growth 360 — motion-design reel (47 s, 1080x1920).
 * Every frame is a pure function of time t, so the same t always draws the same frame.
 * That makes frame-exact MP4 rendering possible (see render.js).
 * URL options: ?t=12.3 opens paused at that second; ?record=1 hides the controls.
 */
(() => {
'use strict';
const DUR = 47;
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
  const ph = $(root, '.phone');
  ph.style.transform = `translate3d(${f(p.x || 0)}px,${f(p.y || 0)}px,${f(p.z || 0)}px) rotateX(${f(p.rx || 0)}deg) rotateY(${f(p.ry || 0)}deg) rotateZ(${f(p.rz || 0)}deg) scale(${f(p.s || 1)})`;
  $(root, '.cam').style.filter = p.blur ? `blur(${f(p.blur)}px)` : 'none';
  // light sweep on the titanium back and the glass
  const ry = ((p.ry || 0) % 360 + 360) % 360;
  $(root, '.back').style.backgroundPosition = `${f(50 + Math.sin(ry * Math.PI / 180) * 45)}% 50%`;
  $$(root, '.shine').forEach(s => { s.style.opacity = f(p.shine ?? .6); s.style.backgroundPosition = '0 0'; });
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
  [5.0, '#f2f2f2', '<div style="color:#111;font-size:92px">Grow<br><span style="background:#111;color:#fff;padding:0 16px;font-size:72px">your</span><br><span style="color:#e0281c;font-size:84px;white-space:nowrap">Business</span></div>'],
  [5.9, '#2a2a2a', '<span style="background:#ececec;color:#111;border-radius:120px;padding:14px 46px;font-size:120px;white-space:nowrap">SOP System</span>'],
  [6.7, '#000', '<span style="color:#ff2d1a;font-size:190px;text-shadow:0 0 40px #ff2d1a">AI</span>'],
  [7.5, '#000', '<div style="transform:rotate(-8deg)"><span style="color:#ffd02a;font-size:110px;text-shadow:0 0 28px rgba(255,200,40,.7)">2000+</span><br><span style="color:#ff2d1a;font-size:58px;white-space:nowrap">Business Owners</span></div>'],
  [8.6, '#000', '<div style="transform:rotate(-6deg)"><span style="font-size:84px">10+ Years</span><br><span style="color:#ff2d1a;font-size:64px">Experience</span><br><span style="font-size:46px">of growth</span></div>'],
  [9.7, '#000', '<div style="position:relative"><span style="color:#e3241a;font-size:74px;letter-spacing:-3px;white-space:nowrap">BRANDING</span>' +
    [40, 120, 210, 300].map((x, i) => `<i style="position:absolute;left:${x}px;top:92px;width:${10 + i % 2 * 6}px;height:${60 + i * 22}px;border-radius:0 0 10px 10px;background:#c81d14"></i>`).join('') + '</div>'],
  [10.6, '#000', '<span style="color:#b9150c;font-size:70px;filter:blur(1px);white-space:nowrap">growth is AI</span>'],
];
const FAST = ['Grow', 'SOP', 'AI', '2000+', 'Branding', '177K of you'];

/* ------------------------------------------------------------------ */
/* scenes: [start, end, build(el) -> update(t)]                        */
/* ------------------------------------------------------------------ */
const S = [];

/* 1. intro — phone close-up + headline */
S.push([0, 2.85, el => {
  el.innerHTML = phoneHTML() + `<div class="hd1" style="position:absolute;left:0;right:0;top:150px;text-align:center;font:800 84px/1.12 Inter;letter-spacing:-2px">
    <div>${['This', 'entire reel'].map((w, i) => `<span class="w${i}">${w}</span>`).join(' ')}</div>
    <div><span class="w2">was made</span></div>
    <div><span class="w3">with</span> <span class="w4" style="color:#ff2d1a;text-shadow:0 0 30px rgba(255,45,26,.8)">Claude.</span></div></div>`;
  fitIG(el);
  const av = $(el, '.ig .av');
  const ws = [0.05, 0.6, 1.4, 1.9, 2.2].map((t0, i) => [t0, $(el, '.w' + i)]);
  return t => {
    const k = eio(pr(t, 0, 2.85)), z = eio(pr(t, 2.0, 2.85));
    setPhone(el, { x: lerp(-60, 60, k) - z * 200, y: lerp(520, 420, k) + z * 520, rx: lerp(55, 48, k), ry: lerp(-14, -6, k), rz: lerp(-30, -24, k), s: lerp(2.5, 2.9, k) + z * 2.2, blur: lerp(7, 3, k) + z * 4, shine: .4 });
    av.style.boxShadow = `0 0 0 ${f(4 + z * 6)}px #ff2d1a, 0 0 ${f(30 + z * 50)}px #ff2d1a`;
    ws.forEach(([t0, w]) => { const a = pr(t, t0, t0 + .3); w.style.opacity = a; w.style.filter = `blur(${f((1 - a) * 12)}px)`; });
  };
}]);

/* 2. "No After Effects. No keyframes." */
S.push([2.85, 5.0, el => {
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
S.push([5.0, 12.6, el => {
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
    const a = eo(pr(t, 5.0, 5.55));
    mini.style.transform = `scale(${f(lerp(2.2, 1, a))}) translateY(${f((1 - a) * 220)}px)`;
    let i = 0; SLIDES.forEach((s, k) => { if (t >= s[0]) i = k; });
    if (i !== cur) { cur = i; slide.innerHTML = SLIDES[i][2]; mini.style.background = SLIDES[i][1]; }
    const lt = t - SLIDES[i][0];
    const sx = (i === 1 || i === 4) ? lerp(160, -40, pr(lt, 0, .8)) : 0;
    const enter = pr(lt, 0, .18);
    slide.style.transform = `translateX(${f(sx)}px) scale(${f(lerp(1.25, 1, eo(enter)))})`;
    slide.style.filter = `blur(${f((1 - enter) * 10)}px)`;
    const frame = 452 + Math.round((t - 5) * 34);
    fr.textContent = frame;
    const px = ((frame - 300) % 700) / 700 * 690;
    ph.style.left = f(px) + 'px'; pn.style.left = f(px + 8) + 'px';
    const dense = t >= 11.0;
    $(el, '.tl').style.opacity = dense ? 0 : 1; $(el, '.tl2').style.opacity = dense ? 1 : 0;
    fn.textContent = dense ? '"id": "19", "start": 712' : 'script.json';
  };
}]);

/* 4. Claude writes the 3D scene — scrolling code */
S.push([12.6, 16.5, el => {
  el.innerHTML = glass(130, 470, 820, 640, `<div class="hd"><span><b>Claude</b> <span class="dot">●</span> Writing the 3D scene</span><span></span></div>
    <div class="hd" style="padding-top:6px"><span>phone_scene.js</span><span>line <b class="ln2">25</b> / 1,063</span></div>
    <div class="code cd"></div>`);
  const g = $(el, '.glass'), cd = $(el, '.cd'), ln = $(el, '.ln2');
  return t => {
    const a = eo(pr(t, 12.6, 13.0));
    g.style.transform = `scale(${f(lerp(.85, 1, a))})`; g.style.opacity = a;
    // fast scroll in the middle, slow at both ends
    const line = Math.round(t < 14 ? lerp(25, 37, pr(t, 12.6, 14)) : t < 15.4 ? lerp(37, 276, eio(pr(t, 14, 15.4))) : lerp(276, 1058, eio(pr(t, 15.4, 16.1))));
    ln.textContent = line.toLocaleString('en-US');
    const speed = t > 14.3 && t < 16.0 ? Math.sin(pr(t, 14.3, 16.0) * Math.PI) : 0;
    cd.innerHTML = codeLines(line, 16, 8);
    cd.style.filter = `blur(${f(speed * 6)}px)`;
    cd.style.transform = `translateY(${f(-speed * 30)}px)`;
  };
}]);

/* 5. the phone, the titanium, the light, the motion blur */
S.push([16.5, 20.3, el => {
  el.innerHTML = phoneHTML() + glass(60, 120, 960, 130, `<div class="hd"><span class="fn2">phone.js · line 5</span><span></span></div><div class="code ln3" style="padding-top:8px;font-size:24px"></div>`);
  fitIG(el);
  $(el, '.off').style.opacity = 1;
  const fn = $(el, '.fn2'), ln = $(el, '.ln3');
  const TXT = [[16.5, 'phone.js · line 5', 'W, H, T = <span class="n">78.0</span>, <span class="n">163.4</span>, <span class="n">8.75</span>'],
    [17.4, 'phone.js · line 68', 'TITANIUM = rgb(<span class="s">"#DEDCD8"</span>), metal <span class="n">1.0</span>, rough <span class="n">0.2</span>'],
    [18.3, 'scene.js · line 1843', 'light.key({ x: <span class="n">-2</span>, y: <span class="n">4</span>, power: <span class="n">1200</span> })'],
    [19.1, 'scene.js · line 1843', 'motionBlur.shutter = arg(<span class="s">"--shutter"</span>, <span class="n">1.0</span>)']];
  let cur = -1;
  return t => {
    let i = 0; TXT.forEach((x, k) => { if (t >= x[0]) i = k; });
    if (i !== cur) { cur = i; fn.textContent = TXT[i][1]; ln.innerHTML = TXT[i][2]; }
    const spin = eio(pr(t, 19.1, 19.95));
    const ry = lerp(205, 165, pr(t, 16.5, 19.1)) + spin * 195;
    const blur = Math.sin(spin * Math.PI) * 16;
    const a = eo(pr(t, 16.5, 16.9));
    setPhone(el, { y: lerp(200, 0, a) + Math.sin(t * 1.4) * 10, rx: 10, ry, rz: lerp(-14, -6, pr(t, 16.5, 20.3)), s: lerp(.82, .92, pr(t, 16.5, 20.3)), blur, shine: t >= 18.3 ? .9 + Math.sin(t * 6) * .1 : .35 });
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
S.push([20.3, 24.5, el => {
  el.innerHTML = phoneHTML() + glass(150, 640, 780, 330, `<div class="hd"><span><b>ProfileIG.jsx</b> &nbsp;the screen, as code</span><span></span></div><div class="code pc"></div>`, 'pg');
  fitIG(el);
  const off = $(el, '.off'), pg = $(el, '.pg'), pc = $(el, '.pc');
  return t => {
    const a = eo(pr(t, 20.3, 20.7));
    off.style.opacity = t < 20.5 ? 1 - pr(t, 20.3, 20.5) : t < 21.3 ? 0 : t < 23.0 ? pr(t, 21.3, 21.5) : 1 - pr(t, 23.0, 23.8);
    setPhone(el, { y: lerp(80, 0, a) + Math.sin(t * 1.2) * 8, rx: 6, ry: lerp(-16, 10, pr(t, 20.3, 24.5)), rz: lerp(4, -3, pr(t, 20.3, 24.5)), s: .95, shine: .5 });
    const b = eo(pr(t, 22.4, 22.75));
    pg.style.opacity = t < 24.1 ? b : 1 - pr(t, 24.1, 24.45);
    pg.style.transform = `translateY(${f((1 - b) * 40)}px) scale(${f(lerp(.94, 1, b))})`;
    const hi = Math.min(6, Math.floor(pr(t, 22.5, 24.0) * 7));
    pc.innerHTML = codeLines(136, 7, hi, PCODE).replace(/<span class="ln">(\d+)<\/span>/g, (m, n) => `<span class="ln">${n}</span>`);
  };
}]);

/* 7. pinned to the four corners */
S.push([24.5, 26.9, el => {
  el.innerHTML = phoneHTML({ pins: true });
  fitIG(el);
  const pins = $$(el, '.pin'), edge = $(el, '.edge');
  return t => {
    const k = pr(t, 24.5, 26.9);
    setPhone(el, { rx: lerp(14, 22, k), ry: lerp(-26, -8, k), rz: lerp(10, 4, k), s: .9 + Math.sin(t * 2) * .01, shine: .5 });
    pins.forEach((p, i) => { const a = pr(t, 24.6 + i * .35, 24.8 + i * .35); p.style.opacity = a; p.style.transform = `scale(${f(back(a))})`; });
    edge.style.opacity = pr(t, 25.2, 25.5);
  };
}]);

/* 8. razor sharp — extreme close-up of the live profile */
S.push([26.9, 28.3, el => {
  el.innerHTML = phoneHTML() + `<div class="zb" style="position:absolute;left:470px;top:120px;font:600 24px 'JetBrains Mono';color:#ddd;background:rgba(255,255,255,.08);border-radius:20px;padding:6px 16px">×7.7</div>`;
  fitIG(el);
  const zb = $(el, '.zb');
  return t => {
    const k = eio(pr(t, 26.9, 28.3));
    const s = lerp(3.6, 4.4, k);
    setPhone(el, { x: -20 * s / 4.5, y: 1242 * s / 4.5 - 140, rx: 4, ry: lerp(-8, -4, k), rz: lerp(5, 3, k), s, shine: .15 });
    zb.textContent = '×' + (s * 1.75).toFixed(1);
  };
}]);

/* 9. type driven by one file — change a word, the sequence re-renders */
S.push([28.3, 34.4, el => {
  el.innerHTML = `<div class="mini" style="background:#000"><div class="bars">${'<i></i>'.repeat(6)}</div>
      <div class="kt kin" style="color:#ff2d1a;font-size:64px;text-shadow:0 0 26px rgba(255,45,26,.9);white-space:nowrap">1,095 of you</div>
      <div class="rprof" style="position:absolute;inset:0;opacity:0;display:flex;align-items:center;justify-content:center"></div>
      <div class="rbar" style="position:absolute;left:24px;right:24px;bottom:22px;height:44px;border-radius:22px;background:rgba(40,12,10,.8);border:2px solid rgba(255,255,255,.2);font:500 18px 'JetBrains Mono';color:#ddd;display:flex;align-items:center;padding:0 16px;gap:8px;opacity:0;overflow:hidden">
        <i class="rp" style="position:absolute;left:0;top:0;bottom:0;background:rgba(255,45,26,.35)"></i><span style="color:#ff2d1a;position:relative">●</span><span class="rt" style="position:relative">Rendering 71 / 936 · time-lapse</span></div></div>` +
    glass(160, 1040, 760, 210, `<div class="hd"><span><b>script.json</b> <span class="ed"></span></span><span></span></div><div class="code jc" style="font-size:24px"></div>`, 'jp');
  const kt = $(el, '.kt'), jc = $(el, '.jc'), ed = $(el, '.ed'), jp = $(el, '.jp'), rbar = $(el, '.rbar'), rp = $(el, '.rp'), rt = $(el, '.rt'), bars = $(el, '.bars'), rprof = $(el, '.rprof');
  rprof.innerHTML = `<div style="width:300px;height:640px;border-radius:40px;overflow:hidden;border:3px solid #888;transform:perspective(800px) rotateY(-18deg) rotateZ(4deg)">${igHTML()}</div>`;
  $(rprof, '.ig').style.transform = 'scale(.77)';
  return t => {
    const a = eo(pr(t, 28.3, 28.7));
    $(el, '.mini').style.transform = `scale(${f(lerp(1.15, 1, a))})`;
    bars.style.transform = `translateX(${f(Math.sin(t * 1.7) * 40)}px)`;
    // typing the edit: "1,095" -> "177K"
    let val = '1,095';
    if (t >= 30.9) {
      const d = pr(t, 30.9, 31.3), ty = pr(t, 31.35, 31.8);
      val = ty > 0 ? '177K'.slice(0, Math.ceil(ty * 4)) : '1,095'.slice(0, Math.round((1 - d) * 5));
    }
    const caret = t >= 30.9 && t < 32.1 && Math.floor(t * 4) % 2 ? '|' : '';
    jc.innerHTML = `<span class="ln">445</span>"id": <span class="s">"19"</span>,\n<span class="ln">446</span>"start": <span class="n">712</span>,\n<span class="hi"><span class="ln">456</span>"text": <span class="s">"${val}${caret}"</span>,</span>`;
    ed.textContent = t >= 30.9 ? '· edited' : '';
    jp.style.opacity = t < 32.1 ? 1 : 1 - pr(t, 32.1, 32.4);
    const label = t < 31.9 ? '1,095 of you' : '177K of you';
    // re-render: time-lapse through the sequence
    const rr = t >= 32.1;
    rbar.style.opacity = rr ? 1 : 0;
    const n = Math.round(lerp(71, 936, eio(pr(t, 32.4, 34.2))));
    rp.style.width = f(n / 936 * 100) + '%';
    rt.textContent = `Rendering ${n} / 936 · time-lapse`;
    if (rr && t < 34.0) {
      const idx = Math.floor((t - 32.1) / .16);
      const showProf = idx % 4 === 1;
      rprof.style.opacity = showProf ? 1 : 0;
      kt.style.opacity = showProf ? 0 : 1;
      kt.textContent = FAST[idx % FAST.length];
      kt.style.color = idx % 3 === 0 ? '#ffd02a' : '#ff2d1a';
    } else {
      rprof.style.opacity = 0; kt.style.opacity = 1; kt.textContent = label; kt.style.color = '#ff2d1a';
    }
    kt.style.transform = `translateX(${f(Math.sin(t * 2.3) * 30)}px)`;
  };
}]);

/* 10. 177K of you — full screen */
S.push([34.4, 35.8, el => {
  el.innerHTML = `<div class="big kin" style="color:#ff2d1a;font-size:150px;white-space:nowrap;text-shadow:0 0 50px rgba(255,45,26,.9),0 0 120px rgba(255,45,26,.5)">177K of you</div>`;
  const b = $(el, '.big');
  return t => {
    const k = pr(t, 34.4, 35.8);
    b.style.transform = `scale(${f(lerp(.8, 1.12, eo(k)))})`;
    b.style.filter = `blur(${f(Math.max(0, 1 - k * 4) * 12 + (Math.sin(t * 40) > .9 ? 3 : 0))}px)`;
  };
}]);

/* 11. Zero keyframes. Just type. */
S.push([35.8, 37.2, el => {
  el.innerHTML = `<div class="kin" style="transform:rotate(-7deg)">
    <div class="z1" style="color:#ffd02a;font-size:210px;text-shadow:0 0 50px rgba(255,208,42,.8)">Zero</div>
    <div class="z2" style="color:#ff2d1a;font-size:130px;text-shadow:0 0 30px rgba(255,45,26,.8)">keyframes</div>
    <div class="z3" style="color:#fff;font-size:90px;margin-top:10px">just type</div></div>`;
  const z = ['.z1', '.z2', '.z3'].map(s => $(el, s));
  return t => {
    z.forEach((e, i) => {
      const a = pr(t, 35.85 + i * .22, 36.15 + i * .22);
      e.style.transform = `translateX(${f((1 - eo(a)) * -500)}px)`;
      e.style.filter = `blur(${f((1 - a) * 18 + pr(t, 36.9, 37.2) * 14)}px)`;
      e.style.opacity = a;
    });
  };
}]);

/* 12. Just direction. */
S.push([37.2, 39.0, el => {
  el.innerHTML = `<div class="bars" style="filter:blur(5px)">${'<i></i>'.repeat(6)}</div>
    <div class="dt kin" style="color:#ff2d1a;font-size:150px;white-space:nowrap;text-shadow:0 0 40px #ff2d1a">grow with AI</div>`;
  const bars = $(el, '.bars'), dt = $(el, '.dt');
  return t => {
    const k = pr(t, 37.2, 39.0);
    bars.style.transform = `translateX(${f(lerp(-120, 120, k))}px) scale(1.2)`;
    bars.style.opacity = .8;
    dt.style.filter = `blur(${f(lerp(14, 3, eo(pr(t, 37.2, 38.2))))}px)`;
    dt.style.opacity = pr(t, 37.3, 37.8);
  };
}]);

/* 13. logo card */
S.push([39.0, 40.0, el => {
  el.innerHTML = `<div class="lg" style="position:absolute;left:0;right:0;top:760px;display:flex;align-items:center;justify-content:center;gap:28px">
      <img src="${A}avatar.jpg" style="width:150px;height:150px;border-radius:38px;box-shadow:0 0 50px rgba(255,45,26,.6)">
      <span style="font:800 104px Inter;letter-spacing:-4px">primegrowth360</span></div>
    <div class="tg" style="position:absolute;left:0;right:0;top:960px;text-align:center;font:500 44px Inter;color:#d9d0ce">Grow with AI.</div>`;
  const lg = $(el, '.lg'), tg = $(el, '.tg');
  return t => {
    const a = eo(pr(t, 39.0, 39.35));
    lg.style.transform = `scale(${f(lerp(.6, 1, a))})`; lg.style.opacity = a; lg.style.filter = `blur(${f((1 - a) * 12)}px)`;
    tg.style.opacity = pr(t, 39.3, 39.6);
  };
}]);

/* 14. full method — lock */
S.push([40.0, 41.9, el => {
  el.innerHTML = `<svg class="lock" viewBox="0 0 60 80" style="position:absolute;left:495px;top:380px;width:90px">
      <path class="sh" d="M14 34 V22 a16 16 0 0 1 32 0 V34" fill="none" stroke="#ff2d1a" stroke-width="7" stroke-linecap="round"/>
      <rect x="6" y="34" width="48" height="40" rx="9" fill="#ff2d1a"/><circle cx="30" cy="52" r="5" fill="#3a0b06"/><rect x="28" y="54" width="4" height="10" fill="#3a0b06"/></svg>
    <div style="position:absolute;left:0;right:0;top:530px;text-align:center;font:800 62px/1.25 Inter;letter-spacing:-1.5px">The full method<br><span style="font-weight:700;font-size:56px">→ inside the <span style="color:#ff2d1a">Prime Growth 360</span> course</span></div>`;
  const sh = $(el, '.sh');
  return t => {
    const open = t < 40.9 ? 1 : 1 - eo(pr(t, 40.9, 41.15));
    sh.setAttribute('transform', `translate(${f(open * 16)} ${f(-open * 8)}) rotate(${f(open * 28)} 46 34)`);
  };
}]);

/* 15. Comment AI */
S.push([41.9, 46.0, el => {
  el.innerHTML = `<div class="c1" style="position:absolute;left:0;right:0;top:230px;text-align:center;font:800 92px Inter;letter-spacing:-2px">Comment</div>
    <div class="c2" style="position:absolute;left:0;right:0;top:345px;text-align:center;font:900 330px/1 Inter;letter-spacing:-10px;color:#ff2d1a;text-shadow:0 0 60px rgba(255,45,26,.7)">AI</div>` +
    glass(40, 840, 1000, 450, `<div style="text-align:center;font:700 26px Inter;color:#fff;padding-top:20px">Comments</div>
      <div class="empty" style="text-align:center;font-family:Inter;padding-top:80px"><div style="font-weight:700;font-size:28px;color:#fff">No comments yet</div><div style="font-size:21px;color:#aaa;margin-top:6px">Start the conversation.</div></div>
      <div class="cm" style="font-family:Inter;padding:22px 30px;display:none">
        <div style="display:flex;gap:16px"><div style="width:54px;height:54px;border-radius:50%;background:#555;flex:none"></div>
          <div style="flex:1"><div style="font-size:19px;color:#aaa">you <span style="color:#777">now</span></div><div style="font-weight:800;font-size:44px;color:#fff">AI</div>
            <div class="rep" style="opacity:0;margin-top:8px">
              <div style="display:flex;align-items:center;gap:10px"><img src="${A}avatar.jpg" style="width:40px;height:40px;border-radius:50%"><span style="font-weight:700;font-size:21px;color:#fff">primegrowth360</span><span style="font-size:15px;background:#3a3a3a;color:#ccc;border-radius:6px;padding:2px 8px">Author</span></div>
              <div style="font-size:27px;color:#fff;margin:4px 0 0 50px">Here's the link.</div>
              <div class="card" style="opacity:0;margin:12px 0 0 50px;display:flex;gap:14px;align-items:center;background:rgba(0,0,0,.35);border-radius:14px;padding:12px">
                <img src="${A}post7.jpg" style="width:60px;height:80px;border-radius:8px;object-fit:cover"><div><div style="font-weight:700;font-size:24px;color:#fff">AI Video Course</div><div style="font-size:19px;color:#aaa">The full method</div></div></div></div></div>
          <div class="heart" style="font-size:34px;color:#888">♡</div></div></div>
      <div style="position:absolute;left:24px;right:24px;bottom:20px;height:60px;border-radius:30px;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;padding:0 10px 0 26px;font:21px Inter;color:#999">Add a comment…<span style="width:44px;height:44px;border-radius:50%;background:#fff;color:#111;display:flex;align-items:center;justify-content:center;font-size:24px">↑</span></div>`, 'cp');
  const c1 = $(el, '.c1'), c2 = $(el, '.c2'), empty = $(el, '.empty'), cm = $(el, '.cm'), rep = $(el, '.rep'), card = $(el, '.card'), heart = $(el, '.heart'), cp = $(el, '.cp');
  return t => {
    const a = eo(pr(t, 41.9, 42.2));
    c1.style.opacity = a; c1.style.transform = `translateY(${f((1 - a) * 40)}px)`;
    const b = pr(t, 42.5, 42.8);
    c2.style.opacity = b; c2.style.transform = `translateY(${f((1 - eo(b)) * -80)}px) scale(${f(lerp(1.6, 1, eo(b)))})`;
    cp.style.opacity = eo(pr(t, 42.0, 42.4));
    const has = t >= 43.0;
    empty.style.display = has ? 'none' : 'block'; cm.style.display = has ? 'block' : 'none';
    heart.textContent = t >= 43.6 ? '♥' : '♡'; heart.style.color = t >= 43.6 ? '#ff2d1a' : '#888';
    heart.style.transform = `scale(${f(t >= 43.6 ? back(pr(t, 43.6, 43.9)) : 1)})`;
    rep.style.opacity = pr(t, 44.0, 44.3); card.style.opacity = pr(t, 44.5, 44.8);
  };
}]);

/* 16. outro — the phone */
S.push([46.0, DUR, el => {
  el.innerHTML = phoneHTML();
  fitIG(el);
  return t => {
    const k = pr(t, 46.0, 47.0), a = eo(pr(t, 46.0, 46.35));
    setPhone(el, { y: lerp(60, 0, a), rx: 40, ry: lerp(-24, -18, k), rz: lerp(30, 26, k), s: lerp(1.05, 1.12, k), blur: (1 - a) * 10, shine: .6 });
  };
}]);

/* ------------------------------------------------------------------ */
/* captions: [start, text]  — [word] goes in the red pill              */
/* ------------------------------------------------------------------ */
const CAPS = [
  [0, ''], [5.0, '[First,]'], [5.9, 'the [rhythm.]'], [7.3, 'Claude [maps]'], [8.2, 'every [cut]'], [8.9, 'and every [word]'],
  [9.8, 'to [the beat,]'], [10.6, 'frame [by]'], [11.4, 'frame by [frame.]'],
  [12.6, 'Then the [3D.]'], [14.0, 'Claude [writes]'], [14.8, 'the [whole]'], [15.6, '3D [scene:]'],
  [16.5, 'the [phone,]'], [17.4, 'the [titanium,]'], [18.3, 'the [light,]'], [19.1, 'the motion [blur.]'],
  [20.3, 'The [screen]'], [21.3, "isn't a [picture.]"], [22.4, "It's real [code,]"],
  [24.5, 'pinned [to]'], [25.2, 'the four [corners]'], [26.0, '[of] the phone'], [26.6, '[so] it stays'], [27.2, 'razor [sharp.]'],
  [28.3, 'And [the type]'], [29.4, 'is [driven]'], [30.1, 'by one [file.]'], [30.9, 'Change [a word]'],
  [32.1, 'and the [whole]'], [32.8, 'sequence [re-renders.]'], [34.4, ''],
  [35.8, 'Zero [keyframes.]'], [37.2, '[Just]'], [37.9, 'Just [direction.]'], [39.0, ''],
  [40.2, 'Want the'], [40.9, 'full [method?]'], [41.9, ''], [43.2, "[and] we'll"], [43.8, 'send [you]'], [44.4, 'the [link.]'], [45.3, '']
];
const capEl = document.getElementById('cap');
let capCur = -1;
function renderCap(t) {
  let i = 0; CAPS.forEach((c, k) => { if (t >= c[0]) i = k; });
  if (i !== capCur) {
    capCur = i;
    capEl.innerHTML = CAPS[i][1].replace(/\[([^\]]+)\]|(\S+)/g, (m, hl, w) => hl ? `<span class="w hl">${hl}</span>` : `<span class="w">${w}</span>`);
  }
  const lt = t - CAPS[i][0];
  const a = pr(lt, 0, .14);
  capEl.style.transform = `scale(${f(lerp(.86, 1, back(a)))})`;
  capEl.style.opacity = a;
  // captions sit lower on the comment screen, higher over the 3D phone shots
  capEl.style.top = (t >= 16.5 && t < 28.3) || (t >= 35.8 && t < 39) ? '1470px' : t >= 40 && t < 42 ? '1080px' : t >= 42 ? '1380px' : '1350px';
}

/* ------------------------------------------------------------------ */
/* engine                                                               */
/* ------------------------------------------------------------------ */
const sceneEl = document.getElementById('scene');
const bgEl = document.getElementById('bg');
const flash = document.getElementById('flash');
let cur = -1, upd = null;
function bg(t) {
  // red radial glow; stronger on the "No" and CTA shots, near-black on the close-ups
  let inner = '#3d0c07', mid = '#1c0503', glowY = 48;
  if (t >= 2.85 && t < 5) { inner = '#8a1508'; mid = '#3a0904'; }
  else if (t < 2.85 || (t >= 26.9 && t < 28.3) || (t >= 34.4 && t < 39)) { inner = '#140404'; mid = '#070101'; }
  else if (t >= 40) { inner = '#5a1209'; mid = '#240604'; glowY = 40; }
  bgEl.style.background = `radial-gradient(ellipse 70% 55% at 50% ${glowY}%, ${inner} 0%, ${mid} 55%, #000 100%)`;
}
function render(t) {
  let i = 0; S.forEach((s, k) => { if (t >= s[0]) i = k; });
  if (i !== cur) {
    cur = i;
    sceneEl.innerHTML = '<div class="layer"></div>';
    upd = S[i][2](sceneEl.firstChild) || null;
  }
  if (upd) upd(t);
  // cut transition: quick zoom-blur into every new shot
  const lt = t - S[i][0];
  const w = i === 0 ? 1 : pr(lt, 0, .22);
  sceneEl.style.transform = `scale(${f(lerp(1.08, 1, eo(w)))})`;
  sceneEl.style.filter = w < 1 ? `blur(${f((1 - w) * 14)}px)` : 'none';
  flash.style.opacity = (t >= 4.95 && t < 5.25) ? f((1 - pr(t, 4.95, 5.25)) * .9) : (t >= 38.95 && t < 39.15) ? f((1 - pr(t, 38.95, 39.15)) * .5) : 0;
  bg(t);
  renderCap(t);
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
scrub.oninput = () => seek(+scrub.value);
document.getElementById('full').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
  if (e.key === 'f') document.getElementById('full').click();
  if (e.key === 'ArrowRight') seek(time() + 1); if (e.key === 'ArrowLeft') seek(time() - 1);
});
function loop() {
  if (playing) { const t = time(); render(t); if (t >= DUR) pause(); }
  scrub.value = time(); clock.textContent = `0:${String(Math.floor(time())).padStart(2, '0')} / 0:47`;
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
window.REEL = { seek, play, pause, DUR, render };
})();
