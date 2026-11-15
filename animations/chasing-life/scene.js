/* =====================================================================
 * scene.js: the timeline and the director.
 *
 * render(ctx, t) is a pure function of time t (in seconds). The same t
 * always draws the same frame, so the browser preview and the MP4
 * renderer produce identical images.
 *
 * Edit TIMELINE to change the captions, timings or positions.
 * ===================================================================== */
(function (G) {
  'use strict';
  const { clamp, lerp, prog, Ease, settle } = G.FX;
  const A = G.Art;

  const TIMELINE = {
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 24.8,   // voice-over is 23.2s, plus a hold on the end card

    lightX: 822,
    lightGround: 1104,
    // traffic light: red until amberAt, amber until greenAt, then green
    amberAt: 11.2,
    greenAt: 11.95,

    // vehicles: arrive (t0→t1) from fromX to rear-bumper x, leave at `leave`
    supercar: { ground: 1112, from: -200, x: 304, t0: -0.4, t1: 0.9,  leave: 12.35 },
    suv:      { ground: 1168, from: -620, x: 222, t0: 2.9,  t1: 4.25, leave: 12.65 },
    sedan:    { ground: 1210, from: -560, x: 204, t0: 6.9,  t1: 8.2,  leave: 12.9 },
    departAccel: 1150, // px/s²

    heli: { t0: -0.2, t1: 3.2, y: 520, fromX: -330, toX: 1420, mirrorGround: 985 },

    walker: { ground: 1306, t0: 10.3, x0: -60, speed: 112, scale: 1 },

    sceneCut: 15.9,    // street → wheelchair
    endCut: 19.55,     // wheelchair → end card
    fade: 0.3,

    wheelchair: { x: 540, ground: 1082, scale: 1.0 },

    /* Captions are synced to the voice-over (audio/voiceover-gu.mp3).
     * in/out = when that line is spoken. Words appear one by one across that span. */
    captionStyle: { x: 540, y: 600, size: 62, maxWidth: 960 },
    captions: [
      { text: 'કાશ મારી પાસે હેલિકોપ્ટર હોત',            in: 0.0,   out: 2.8,   y: 720 },
      { text: 'યાર, કાશ મારી પાસે લેમ્બોર્ગિની હોત',      in: 4.35,  out: 6.89 },
      { text: 'કાશ મારી પાસે જી-વેગન હોત',               in: 8.35,  out: 10.71 },
      { text: 'કાશ મારે ચાલવું ન પડત',                   in: 11.98, out: 14.71 },
      { text: 'કાશ હું ફરીથી ચાલી શકત',                  in: 17.05, out: 18.82, y: 640 },
    ],
    endCard: {
      text: 'બીજાની જિંદગી પાછળ દોડવામાં, તમે તમારી પોતાની જિંદગીની સુંદરતા ભૂલી જાઓ છો',
      in: 19.98, out: 23.17, y: 900, size: 62,
    },
    watermark: { x: 540, y: 1746 },
  };

  /* ---------- vehicle kinematics ---------- */
  function vehicleState(v, t, r) {
    let x, pitch = 0;
    if (t < v.t1) {
      const k = Ease.outCubic(prog(t, v.t0, v.t1));
      x = lerp(v.from, v.x, k);
      pitch = 0.012 * k * (1 - k) * 4;              // nose dips while braking
    } else if (t < v.leave) {
      x = v.x;
      pitch = settle(t - v.t1, 0.022, 13, 5.5);      // suspension settles
    } else {
      const s = t - v.leave;
      x = v.x + 0.5 * TIMELINE.departAccel * s * s;
      pitch = -0.02 * (1 - Math.exp(-7 * s)) * Math.exp(-1.6 * s); // squat on take-off
    }
    // rolling: angle = distance / radius
    return { x, pitch, wheelAngle: (x - v.from) / r };
  }

  function placed(state, ground, length, drawFn) {
    return {
      ground,
      draw(ctx) {
        ctx.save();
        ctx.translate(state.x, ground);
        // pivot around the rear axle so the nose dips and lifts
        ctx.translate(length * 0.2, 0);
        ctx.rotate(state.pitch);
        ctx.translate(-length * 0.2, 0);
        drawFn(ctx, state);
        ctx.restore();
      },
    };
  }

  /* ---------- scene 1: the traffic light ---------- */
  function streetObjects(t) {
    const T = TIMELINE;
    const objs = [];

    // helicopter (mirrored around a higher imaginary horizon)
    if (t > T.heli.t0 && t < T.heli.t1) {
      const k = prog(t, T.heli.t0, T.heli.t1);
      const hx = lerp(T.heli.fromX, T.heli.toX, Ease.inOutQuad(k * 0.9 + 0.05));
      const hy = T.heli.y + Math.sin(t * 2.4) * 8;
      objs.push({
        ground: T.heli.mirrorGround,
        draw(ctx) {
          ctx.save(); ctx.translate(hx, hy); ctx.rotate(0.06); ctx.scale(0.95, 0.95);
          A.drawHelicopter(ctx, { time: t }); ctx.restore();
        },
      });
    }

    // traffic light
    const state = t < T.amberAt ? 'red' : t < T.greenAt ? 'amber' : 'green';
    const since = t < T.amberAt ? t : t < T.greenAt ? t - T.amberAt : t - T.greenAt;
    const glow = 0.85 + 0.15 * Math.sin(t * 3) * 0.5 + 0.15 * Ease.outCubic(clamp(since / 0.25));
    objs.push({
      ground: T.lightGround,
      draw(ctx) { ctx.save(); ctx.translate(T.lightX, T.lightGround); A.drawTrafficLight(ctx, state, glow); ctx.restore(); },
    });

    // cars: back-to-front, so nearer cars overlap the ones further away
    const cars = [
      [T.supercar, A.SUPERCAR, A.drawSupercar],
      [T.suv, A.SUV, A.drawSUV],
      [T.sedan, A.SEDAN, A.drawSedan],
    ];
    cars.forEach(([cfg, spec, fn]) => {
      if (t < cfg.t0) return;
      const s = vehicleState(cfg, t, spec.wheelR);
      if (s.x > T.width + 120) return;
      objs.push(placed(s, cfg.ground, spec.length, fn));
    });

    // walker
    if (t > T.walker.t0) {
      const wx = T.walker.x0 + (t - T.walker.t0) * T.walker.speed;
      const phase = (wx - T.walker.x0) / 34;
      objs.push({
        ground: T.walker.ground,
        draw(ctx) { ctx.save(); ctx.translate(wx, T.walker.ground); A.drawWalker(ctx, phase, T.walker.scale); ctx.restore(); },
      });
    }
    return objs;
  }

  /* ---------- scene 2: the wheelchair ---------- */
  function wheelchairObjects(t) {
    const W = TIMELINE.wheelchair;
    return [{
      ground: W.ground,
      draw(ctx) {
        ctx.save(); ctx.translate(W.x, W.ground); ctx.scale(W.scale, W.scale);
        A.drawWheelchair(ctx, { time: t }); ctx.restore();
      },
    }];
  }

  /* ---------- director ---------- */
  function render(ctx, t) {
    const T = TIMELINE;
    const frame = Math.round(t * T.fps);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, T.width, T.height);

    let objs = null, camScale = 1, camX = 0, camY = 0, pivot = [540, 1000];
    if (t < T.sceneCut) {
      objs = streetObjects(t);
      camScale = 1 + 0.035 * Ease.inOutQuad(prog(t, 0, T.sceneCut)); // slow dolly-in
      camX = Math.sin(t * 0.35) * 6;
      camY = Math.cos(t * 0.27) * 4;
    } else if (t < T.endCut) {
      objs = wheelchairObjects(t);
      pivot = [540, 960];
      camScale = 1.0 + 0.06 * Ease.outCubic(prog(t, T.sceneCut, T.endCut));
    }

    if (objs) {
      ctx.save();
      ctx.translate(pivot[0] + camX, pivot[1] + camY);
      ctx.scale(camScale, camScale);
      ctx.translate(-pivot[0], -pivot[1]);
      G.FX.reflection(ctx, objs, t < T.sceneCut ? {} : { top: 1080, bottom: 1300 });
      objs.forEach((o) => o.draw(ctx));
      ctx.restore();
    }

    // typography (screen space, not affected by the camera)
    const S = T.captionStyle;
    T.captions.forEach((c) => {
      if (t < c.in - 0.1 || t > c.out + 0.95) return;
      G.FX.wordCaption(ctx, c.text, S.x, c.y ?? S.y, {
        size: S.size, maxWidth: S.maxWidth, t, start: c.in, end: c.out,
        alpha: 1 - Ease.inOutQuad(prog(t, c.out + 0.55, c.out + 0.95)),
      });
    });
    if (t >= T.endCut) {
      const E = T.endCard;
      G.FX.wordCaption(ctx, E.text, S.x, E.y, {
        size: E.size, maxWidth: 900, t, start: E.in, end: E.out, alpha: 1, lineHeight: 1.45, highlight: 'સુંદરતા',
      });
    }

    A.drawWatermark(ctx, T.watermark.x, T.watermark.y);
    G.FX.vignette(ctx, 0.7);
    G.FX.grain(ctx, frame, 0.04);

    // dips to black at each cut
    const f = T.fade;
    const dip = (cut) => Math.max(prog(t, cut - f, cut) * (t < cut ? 1 : 0), (1 - prog(t, cut, cut + f)) * (t >= cut ? 1 : 0));
    G.FX.blackout(ctx, Math.max(dip(T.sceneCut), dip(T.endCut), 1 - prog(t, 0, 0.25)));
  }

  G.Reel = { TIMELINE, render };
})(window);
