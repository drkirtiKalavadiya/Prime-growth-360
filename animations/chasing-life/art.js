/* =====================================================================
 * art.js: every illustration in the reel, drawn as vector paths with
 * the Canvas 2D API. There are no image files.
 *
 * Convention: each vehicle is drawn in local coordinates. The origin
 * (0,0) is the rear bumper at road level, x points forward (right) and
 * y points up (negative), so a vehicle can be placed by translating to
 * (rearX, groundY).
 * ===================================================================== */
(function (G) {
  'use strict';
  const TAU = Math.PI * 2;

  /* ---------- shared helpers ---------- */
  function vGrad(ctx, y0, y1, stops) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    return g;
  }

  function poly(pts) {
    const p = new Path2D();
    pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    p.closePath();
    return p;
  }

  /** Alloy wheel: tyre, sidewall, 5 split spokes, hub. */
  function wheel(ctx, cx, cy, r, angle, opts = {}) {
    const rimLight = opts.rimLight || '#f4f4f4';
    const rimDark = opts.rimDark || '#7c7c7c';
    ctx.save();
    ctx.translate(cx, cy);
    // tyre
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = '#090909'; ctx.fill();
    ctx.lineWidth = r * 0.05; ctx.strokeStyle = '#4b4b4b'; ctx.stroke();
    // inner barrel
    const rim = r * 0.66;
    ctx.beginPath(); ctx.arc(0, 0, rim, 0, TAU);
    ctx.fillStyle = '#141414'; ctx.fill();
    // spokes
    ctx.rotate(angle);
    const g = ctx.createRadialGradient(-rim * 0.35, -rim * 0.35, rim * 0.05, 0, 0, rim);
    g.addColorStop(0, rimLight); g.addColorStop(1, rimDark);
    ctx.fillStyle = g;
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate((i * TAU) / 5);
      ctx.beginPath();
      ctx.moveTo(-rim * 0.07, -rim * 0.18);
      ctx.lineTo(-rim * 0.26, -rim * 0.96);
      ctx.lineTo(-rim * 0.04, -rim * 0.96);
      ctx.closePath();
      ctx.moveTo(rim * 0.07, -rim * 0.18);
      ctx.lineTo(rim * 0.26, -rim * 0.96);
      ctx.lineTo(rim * 0.04, -rim * 0.96);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // rim lip and hub
    ctx.beginPath(); ctx.arc(0, 0, rim, 0, TAU);
    ctx.lineWidth = r * 0.08; ctx.strokeStyle = g; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, rim * 0.22, 0, TAU);
    ctx.fillStyle = '#d9d9d9'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, rim * 0.09, 0, TAU);
    ctx.fillStyle = '#555'; ctx.fill();
    ctx.restore();
  }

  /** Black arch behind a wheel so it looks set into the body. */
  function arch(ctx, cx, cy, r) {
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.closePath();
    ctx.fillStyle = '#050505'; ctx.fill();
  }

  /** Minimal white character: round head, torso and an arm on the wheel. */
  function person(ctx, x, y, s, look = 1) {
    ctx.save();
    ctx.fillStyle = '#f5f5f5';
    ctx.shadowColor = 'rgba(255,255,255,0.35)';
    ctx.shadowBlur = 6 * s;
    ctx.beginPath(); ctx.ellipse(x - 6 * s, y + 40 * s, 17 * s, 26 * s, -0.15, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 15 * s, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#f5f5f5'; ctx.lineWidth = 7 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - 2 * s, y + 30 * s); ctx.lineTo(x + 22 * s, y + 44 * s); ctx.lineTo(x + 40 * s, y + 30 * s); ctx.stroke();
    // eye
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(x + look * 7 * s, y - 2 * s, 2.3 * s, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* =================================================================
   * SUPERCAR: a low blue wedge (Lamborghini-style silhouette, no badges)
   * Length ≈ 470
   * ================================================================= */
  const SUPERCAR = {
    length: 470,
    wheelR: 34,
    wheels: [[96, -34], [376, -34]],
    body: (() => {
      const p = new Path2D();
      p.moveTo(8, -24);
      p.lineTo(0, -60);
      p.quadraticCurveTo(2, -80, 30, -84);
      p.lineTo(150, -96);
      p.quadraticCurveTo(205, -126, 255, -128);
      p.quadraticCurveTo(292, -128, 314, -116);
      p.lineTo(384, -82);
      p.quadraticCurveTo(444, -68, 466, -52);
      p.quadraticCurveTo(476, -40, 468, -26);
      p.lineTo(444, -14);
      p.lineTo(24, -14);
      p.closePath();
      return p;
    })(),
    glass: (() => {
      const p = new Path2D();
      p.moveTo(172, -98);
      p.quadraticCurveTo(220, -120, 256, -121);
      p.quadraticCurveTo(288, -121, 306, -112);
      p.lineTo(356, -88);
      p.lineTo(184, -92);
      p.closePath();
      return p;
    })(),
  };

  function drawSupercar(ctx, o = {}) {
    const C = SUPERCAR;
    C.wheels.forEach(([x, y]) => arch(ctx, x, y, C.wheelR + 7));
    // body paint
    ctx.fillStyle = vGrad(ctx, -128, -14, [
      [0, '#b9d6ff'], [0.25, '#5e95ff'], [0.55, '#1d5cf0'], [1, '#0b2f8f'],
    ]);
    ctx.fill(C.body);
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(214,230,255,0.9)'; ctx.stroke(C.body);
    // shoulder highlight
    ctx.save(); ctx.clip(C.body);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(30, -78); ctx.quadraticCurveTo(250, -92, 462, -50); ctx.stroke();
    ctx.restore();
    // side intake
    ctx.fillStyle = '#071a52';
    ctx.fill(poly([[148, -72], [214, -64], [202, -42], [158, -46]]));
    // glass + driver
    ctx.fillStyle = vGrad(ctx, -122, -88, [[0, '#2a3f6e'], [1, '#050b1c']]);
    ctx.fill(C.glass);
    ctx.save(); ctx.clip(C.glass);
    person(ctx, 262, -102, 0.72, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fill(poly([[230, -122], [262, -122], [214, -90], [190, -90]]));
    ctx.restore();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(200,220,255,0.8)'; ctx.stroke(C.glass);
    // lights
    ctx.fillStyle = '#ffffff';
    ctx.fill(poly([[436, -62], [464, -52], [450, -47], [430, -55]]));
    ctx.fillStyle = '#ff2a2a';
    ctx.fill(poly([[2, -66], [16, -70], [16, -60], [3, -58]]));
    // wheels
    C.wheels.forEach(([x, y]) => wheel(ctx, x, y, C.wheelR, o.wheelAngle || 0));
  }

  /* =================================================================
   * SUV: a boxy, upright off-roader (G-class-style silhouette, no badges)
   * Length ≈ 490
   * ================================================================= */
  const SUV = { length: 490, wheelR: 44, wheels: [[100, -44], [398, -44]] };

  function drawSUV(ctx, o = {}) {
    const C = SUV;
    // spare wheel on the tailgate
    ctx.save();
    ctx.beginPath(); ctx.arc(-6, -112, 44, 0, TAU);
    ctx.fillStyle = '#0c0c0c'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#6d6d6d'; ctx.stroke();
    ctx.beginPath(); ctx.arc(-6, -112, 28, 0, TAU);
    ctx.fillStyle = '#262626'; ctx.fill(); ctx.strokeStyle = '#9a9a9a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

    C.wheels.forEach(([x, y]) => arch(ctx, x, y, C.wheelR + 9));

    const lower = new Path2D();
    lower.roundRect(2, -152, 488, 124, [6, 10, 14, 8]);
    const cabin = poly([[26, -150], [32, -236], [334, -236], [378, -150]]);
    const paint = vGrad(ctx, -236, -28, [[0, '#4a4a4a'], [0.4, '#262626'], [1, '#111']]);
    ctx.fillStyle = paint;
    ctx.fill(cabin); ctx.fill(lower);
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(190,190,190,0.9)';
    ctx.stroke(cabin); ctx.stroke(lower);

    // windows
    const w1 = poly([[46, -224], [132, -224], [132, -162], [44, -162]]);
    const w2 = poly([[144, -224], [244, -224], [244, -162], [144, -162]]);
    const w3 = poly([[256, -224], [322, -224], [360, -162], [256, -162]]);
    [w1, w2, w3].forEach((w) => {
      ctx.fillStyle = vGrad(ctx, -224, -162, [[0, '#2b2b2b'], [1, '#060606']]);
      ctx.fill(w);
    });
    ctx.save(); ctx.clip(w3); person(ctx, 296, -198, 0.92, 1); ctx.restore();
    ctx.lineWidth = 2; ctx.strokeStyle = '#9b9b9b';
    [w1, w2, w3].forEach((w) => ctx.stroke(w));

    // trims, doors, handles
    ctx.strokeStyle = 'rgba(220,220,220,0.75)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(4, -150); ctx.lineTo(488, -150); ctx.stroke();
    ctx.strokeStyle = 'rgba(160,160,160,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(138, -228); ctx.lineTo(138, -40);
    ctx.moveTo(250, -228); ctx.lineTo(250, -40);
    ctx.moveTo(10, -92); ctx.lineTo(482, -92);
    ctx.stroke();
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(112, -140, 18, 5); ctx.fillRect(224, -140, 18, 5);
    // front: indicator, headlight, bumper
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(480, -128, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff9b2a'; ctx.fillRect(470, -158, 12, 8);
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(466, -74, 28, 30);
    ctx.strokeStyle = '#777'; ctx.strokeRect(466, -74, 28, 30);
    ctx.fillStyle = '#ff2a2a'; ctx.fillRect(2, -146, 8, 26);

    C.wheels.forEach(([x, y]) => wheel(ctx, x, y, C.wheelR, o.wheelAngle || 0, { rimDark: '#6a6a6a' }));
  }

  /* =================================================================
   * SEDAN: an everyday silver saloon
   * Length ≈ 440
   * ================================================================= */
  const SEDAN = {
    length: 440,
    wheelR: 40,
    wheels: [[92, -40], [350, -40]],
    body: poly([
      [6, -30], [0, -70], [10, -92], [96, -100], [152, -142], [276, -144],
      [338, -100], [420, -90], [438, -72], [440, -46], [430, -30],
    ]),
    rear: poly([[112, -100], [160, -134], [222, -136], [222, -100]]),
    front: poly([[232, -100], [232, -136], [272, -136], [320, -100]]),
  };

  function drawSedan(ctx, o = {}) {
    const C = SEDAN;
    C.wheels.forEach(([x, y]) => arch(ctx, x, y, C.wheelR + 8));
    ctx.fillStyle = vGrad(ctx, -144, -30, [
      [0, '#f1f1f1'], [0.35, '#b4b4b4'], [0.7, '#7a7a7a'], [1, '#4a4a4a'],
    ]);
    ctx.fill(C.body);
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(245,245,245,0.85)'; ctx.stroke(C.body);
    ctx.save(); ctx.clip(C.body);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(14, -72); ctx.lineTo(428, -64); ctx.stroke();
    ctx.restore();
    [C.rear, C.front].forEach((w) => {
      ctx.fillStyle = vGrad(ctx, -136, -100, [[0, '#3b3b3b'], [1, '#0d0d0d']]);
      ctx.fill(w);
    });
    ctx.save(); ctx.clip(C.front); person(ctx, 262, -118, 0.82, 1); ctx.restore();
    ctx.lineWidth = 2; ctx.strokeStyle = '#d0d0d0';
    ctx.stroke(C.rear); ctx.stroke(C.front);
    // door seam and handles
    ctx.strokeStyle = 'rgba(70,70,70,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(227, -100); ctx.lineTo(224, -34); ctx.stroke();
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(196, -88, 16, 4); ctx.fillRect(300, -88, 16, 4);
    // lights
    ctx.fillStyle = '#fff'; ctx.fill(poly([[416, -84], [436, -76], [432, -70], [412, -76]]));
    ctx.fillStyle = '#ff2a2a'; ctx.fill(poly([[2, -82], [16, -88], [14, -76], [2, -72]]));
    C.wheels.forEach(([x, y]) => wheel(ctx, x, y, C.wheelR, o.wheelAngle || 0));
  }

  /* =================================================================
   * HELICOPTER: a light twin-blade chopper. Origin = cabin centre.
   * ================================================================= */
  function drawHelicopter(ctx, o = {}) {
    const t = o.time || 0;
    const paint = vGrad(ctx, -70, 60, [[0, '#a8a8a8'], [0.5, '#5c5c5c'], [1, '#262626']]);
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(225,225,225,0.9)'; ctx.lineJoin = 'round';

    // tail boom + fin + stabiliser
    const boom = poly([[-40, -30], [-250, -18], [-252, -2], [-40, 20]]);
    const fin = poly([[-236, -12], [-272, -86], [-250, -88], [-218, -14]]);
    const stab = poly([[-210, 4], [-236, 26], [-222, 28], [-196, 6]]);
    [boom, fin, stab].forEach((p) => { ctx.fillStyle = paint; ctx.fill(p); ctx.stroke(p); });
    // tail rotor blur
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(-262, -50, 24, 0, TAU); ctx.fillStyle = '#9a9a9a'; ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 3;
    const ta = t * 40;
    ctx.beginPath();
    ctx.moveTo(-262 + Math.cos(ta) * 24, -50 + Math.sin(ta) * 24);
    ctx.lineTo(-262 - Math.cos(ta) * 24, -50 - Math.sin(ta) * 24);
    ctx.stroke();

    // skids
    ctx.strokeStyle = '#bdbdbd'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, 48); ctx.lineTo(-22, 74);
    ctx.moveTo(92, 46); ctx.lineTo(104, 74);
    ctx.moveTo(-70, 76); ctx.lineTo(150, 76); ctx.quadraticCurveTo(170, 76, 176, 62);
    ctx.stroke();

    // cabin
    const cabin = new Path2D();
    cabin.moveTo(-70, -30);
    cabin.quadraticCurveTo(-60, -66, 20, -66);
    cabin.quadraticCurveTo(120, -66, 160, -10);
    cabin.quadraticCurveTo(178, 22, 140, 46);
    cabin.lineTo(-40, 50);
    cabin.quadraticCurveTo(-74, 40, -70, -30);
    cabin.closePath();
    ctx.fillStyle = paint; ctx.fill(cabin);
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(230,230,230,0.95)'; ctx.stroke(cabin);
    // windows
    const win = new Path2D();
    win.moveTo(50, -50); win.quadraticCurveTo(120, -48, 150, -6); win.quadraticCurveTo(160, 20, 130, 34); win.lineTo(50, 34); win.closePath();
    ctx.fillStyle = vGrad(ctx, -50, 34, [[0, '#2c2c2c'], [1, '#060606']]);
    ctx.fill(win);
    ctx.save(); ctx.clip(win); person(ctx, 96, -18, 0.8, 1); ctx.restore();
    ctx.lineWidth = 2; ctx.strokeStyle = '#cfcfcf'; ctx.stroke(win);
    ctx.beginPath(); ctx.moveTo(40, -52); ctx.lineTo(40, 40); ctx.stroke();

    // mast + rotor (perspective-squashed spinning blades)
    ctx.fillStyle = '#6b6b6b'; ctx.fillRect(14, -84, 12, 20);
    ctx.save();
    ctx.translate(20, -86);
    ctx.globalAlpha = 0.08;
    ctx.beginPath(); ctx.ellipse(0, 0, 250, 10, 0, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.globalAlpha = 1;
    const a = t * 21;
    ctx.strokeStyle = '#d4d4d4'; ctx.lineWidth = 4;
    for (let i = 0; i < 2; i++) {
      const ang = a + i * Math.PI;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ang) * 250, Math.sin(ang) * 10 - 2); ctx.stroke();
    }
    ctx.fillStyle = '#9a9a9a'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 6, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* =================================================================
   * TRAFFIC LIGHT. state: 'red' | 'amber' | 'green'. Origin = pole foot.
   * ================================================================= */
  const LAMP = { red: '#ff1f1f', amber: '#ffbf1a', green: '#1fff5a' };
  const LAMP_GLOW = { red: '255,30,30', amber: '255,190,30', green: '30,255,90' };

  function drawTrafficLight(ctx, state, glow = 1) {
    const order = ['red', 'amber', 'green'];
    // big atmospheric glow
    const idx = order.indexOf(state);
    const ly = -306 + idx * 46;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, ly, 4, 0, ly, 340);
    g.addColorStop(0, `rgba(${LAMP_GLOW[state]},${0.42 * glow})`);
    g.addColorStop(0.25, `rgba(${LAMP_GLOW[state]},${0.13 * glow})`);
    g.addColorStop(1, `rgba(${LAMP_GLOW[state]},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(-340, ly - 340, 680, 680);
    ctx.restore();

    // pole
    const pg = ctx.createLinearGradient(-6, 0, 6, 0);
    pg.addColorStop(0, '#5a5a5a'); pg.addColorStop(0.5, '#d0d0d0'); pg.addColorStop(1, '#5a5a5a');
    ctx.fillStyle = pg; ctx.fillRect(-5, -200, 10, 200);
    // head
    const hg = ctx.createLinearGradient(-26, 0, 26, 0);
    hg.addColorStop(0, '#3d3d3d'); hg.addColorStop(0.5, '#8e8e8e'); hg.addColorStop(1, '#3d3d3d');
    ctx.beginPath(); ctx.roundRect(-26, -346, 52, 148, 12);
    ctx.fillStyle = hg; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#b5b5b5'; ctx.stroke();
    // lamps
    order.forEach((name, i) => {
      const y = -306 + i * 46;
      ctx.beginPath(); ctx.arc(0, y, 16, 0, TAU);
      if (name === state) {
        ctx.save();
        ctx.shadowColor = LAMP[name]; ctx.shadowBlur = 40 * glow;
        const lg = ctx.createRadialGradient(-4, y - 4, 1, 0, y, 16);
        lg.addColorStop(0, '#fff'); lg.addColorStop(0.35, LAMP[name]); lg.addColorStop(1, LAMP[name]);
        ctx.fillStyle = lg; ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = '#141414'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#2c2c2c'; ctx.stroke();
      }
    });
  }

  /* =================================================================
   * WALKER: glowing stick figure with a procedural walk cycle.
   * Origin = between the feet at ground level. Height ≈ 200.
   * ================================================================= */
  function limbPoint(x, y, ang, len) {
    return [x + Math.sin(ang) * len, y + Math.cos(ang) * len];
  }

  function drawWalker(ctx, phase, s = 1) {
    ctx.save();
    ctx.scale(s, s);
    const bob = 5 * (1 - Math.abs(Math.sin(phase)));
    const hip = [0, -96 - bob];
    const neck = [6, -160 - bob];
    ctx.strokeStyle = '#fafafa'; ctx.fillStyle = '#fafafa';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255,255,255,0.6)'; ctx.shadowBlur = 14;

    const leg = (p, shade) => {
      const thigh = 0.42 * Math.sin(p);
      const knee = limbPoint(hip[0], hip[1], thigh, 48);
      const bend = 0.15 + 0.75 * Math.max(0, Math.sin(p + 1.4)) * (Math.cos(p) < 0 ? 1 : 0.35);
      const shinA = thigh - bend;
      const foot = limbPoint(knee[0], knee[1], shinA, 46);
      ctx.strokeStyle = shade; ctx.lineWidth = 11;
      ctx.beginPath(); ctx.moveTo(...hip); ctx.lineTo(...knee); ctx.lineTo(...foot); ctx.lineTo(foot[0] + 14, foot[1] - 1); ctx.stroke();
    };
    const arm = (p, shade) => {
      const sh = [neck[0] - 2, neck[1] + 10];
      const up = 0.38 * Math.sin(p);
      const elbow = limbPoint(sh[0], sh[1], up, 36);
      const hand = limbPoint(elbow[0], elbow[1], up + 0.35, 32);
      ctx.strokeStyle = shade; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(...sh); ctx.lineTo(...elbow); ctx.lineTo(...hand); ctx.stroke();
    };
    // far limbs slightly dimmer for depth
    leg(phase + Math.PI, '#bdbdbd');
    arm(phase, '#bdbdbd');
    // torso
    ctx.strokeStyle = '#fafafa'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(...hip); ctx.lineTo(...neck); ctx.stroke();
    leg(phase, '#fafafa');
    arm(phase + Math.PI, '#fafafa');
    // head
    ctx.beginPath(); ctx.arc(neck[0] + 4, neck[1] - 22, 18, 0, TAU); ctx.fillStyle = '#fafafa'; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(neck[0] + 13, neck[1] - 25, 2.4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* =================================================================
   * WHEELCHAIR: a seated figure in a hat. Origin = ground under the seat.
   * ================================================================= */
  function drawWheelchair(ctx, o = {}) {
    const t = o.time || 0;
    const breathe = Math.sin(t * 2.2) * 1.5;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const frame = '#9a9a9a';

    // far wheel (offset, dimmer)
    ctx.globalAlpha = 0.45;
    wheelchairWheel(ctx, 4, -60, 58, t);
    ctx.globalAlpha = 1;

    // back frame + push handle
    ctx.strokeStyle = frame; ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-46, -64); ctx.lineTo(-52, -176); ctx.lineTo(-84, -178);
    ctx.moveTo(-50, -84); ctx.lineTo(44, -84);
    ctx.moveTo(40, -84); ctx.lineTo(62, -30); ctx.lineTo(92, -30);
    ctx.moveTo(-44, -124); ctx.lineTo(30, -124); ctx.lineTo(30, -84);
    ctx.stroke();

    // figure
    ctx.fillStyle = '#f7f7f7'; ctx.strokeStyle = '#f7f7f7';
    ctx.shadowColor = 'rgba(255,255,255,0.45)'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.ellipse(-22, -128 + breathe * 0.5, 25, 44, -0.12, 0, TAU); ctx.fill();   // torso
    ctx.lineWidth = 28;
    ctx.beginPath(); ctx.moveTo(-20, -96); ctx.lineTo(50, -96); ctx.stroke();                       // thigh
    ctx.lineWidth = 22;
    ctx.beginPath(); ctx.moveTo(50, -96); ctx.lineTo(68, -44); ctx.stroke();                        // shin
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(62, -38); ctx.lineTo(92, -38); ctx.stroke();                        // foot
    ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(-14, -150 + breathe); ctx.lineTo(12, -118); ctx.lineTo(26, -124); ctx.stroke(); // arm
    ctx.beginPath(); ctx.arc(-10, -196 + breathe, 23, 0, TAU); ctx.fill();                          // head
    ctx.shadowBlur = 0;
    // hat
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath(); ctx.ellipse(-10, -214 + breathe, 30, 6, -0.05, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-28, -236 + breathe, 34, 22, [8, 8, 2, 2]); ctx.fill();
    ctx.fillStyle = '#222'; ctx.fillRect(-28, -220 + breathe, 34, 5);
    // face: a downcast eye and a flat mouth
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(2, -197 + breathe, 2.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-2, -184 + breathe); ctx.lineTo(8, -186 + breathe); ctx.stroke();

    // near wheel, armrest, caster
    wheelchairWheel(ctx, -14, -60, 60, t);
    ctx.strokeStyle = '#bdbdbd'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-40, -126); ctx.lineTo(28, -126); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(66, -30); ctx.lineTo(70, -16); ctx.stroke();
    ctx.beginPath(); ctx.arc(70, -12, 12, 0, TAU);
    ctx.fillStyle = '#111'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#a8a8a8'; ctx.stroke();
    ctx.restore();
  }

  function wheelchairWheel(ctx, cx, cy, r, t) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    ctx.lineWidth = 7; ctx.strokeStyle = '#c4c4c4'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r - 9, 0, TAU);
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#8a8a8a'; ctx.stroke();
    ctx.rotate(t * 0.15);
    ctx.lineWidth = 1.6; ctx.strokeStyle = '#9d9d9d';
    for (let i = 0; i < 12; i++) {
      const a = (i * TAU) / 12;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4)); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fillStyle = '#ddd'; ctx.fill();
    ctx.restore();
  }

  /* ---------- watermark ---------- */
  function drawWatermark(ctx, x, y) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.font = '800 34px "Inter Display", Inter, "Helvetica Neue", Arial, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('PG', x, y);
    ctx.font = '600 13px Inter, "Helvetica Neue", Arial, sans-serif';
    ctx.letterSpacing = '5px';
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillText('PRIME GROWTH 360', x + 2, y + 32);
    ctx.restore();
  }

  G.Art = {
    SUPERCAR, SUV, SEDAN,
    drawSupercar, drawSUV, drawSedan, drawHelicopter,
    drawTrafficLight, drawWalker, drawWheelchair, drawWatermark,
  };
})(window);
