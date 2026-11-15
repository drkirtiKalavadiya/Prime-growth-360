/* =====================================================================
 * cta.js: the closing call-to-action scene.
 *   1. Brand badge slams in over light rays and particles
 *   2. "Follow the Prime Growth 360 page" + an animated Follow-button tap
 *   3. "AI Video Paid Course" card + a pulsing "Enrol" button with a shine
 * drawCTA(ctx, s, C) takes the local time s (seconds since the scene began)
 * and the CTA config from scene.js.
 * ===================================================================== */
(function (G) {
  'use strict';
  const { clamp, prog, Ease } = G.FX;
  const TAU = Math.PI * 2;
  const LATIN = '"Inter Display", Inter, "Helvetica Neue", Arial, sans-serif';
  const GU = '"Noto Sans Gujarati", ' + LATIN;
  const GOLD = ['#FFE39A', '#FFC93C', '#F59E0B'];
  const BLUE = ['#5AA9FF', '#1D6BFF', '#0B3FD1'];

  const outBack = (k, s = 1.9) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
  const popIn = (s, t0, d = 0.45) => (s < t0 ? 0 : outBack(clamp((s - t0) / d)));

  function grad(ctx, x0, y0, x1, y1, cols) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c));
    return g;
  }

  /* ---------- background: rays, glow and rising particles ---------- */
  function background(ctx, s) {
    const W = 1080, H = 1920;
    const bg = ctx.createRadialGradient(540, 700, 50, 540, 900, 1300);
    bg.addColorStop(0, '#13244d'); bg.addColorStop(0.45, '#070d1f'); bg.addColorStop(1, '#000');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(540, 430);
    ctx.rotate(s * 0.18);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) {
      ctx.rotate(TAU / 18);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-60, -1400); ctx.lineTo(60, -1400); ctx.closePath();
      ctx.fillStyle = i % 2 ? 'rgba(255,201,60,0.035)' : 'rgba(90,169,255,0.035)';
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
      const seed = Math.sin(i * 91.7) * 43758.5453;
      const r = seed - Math.floor(seed);
      const x = (i * 197 + 60) % W + Math.sin(s * 1.3 + i) * 18;
      const y = H - ((s * (60 + r * 120) + r * H * 1.3) % (H + 100));
      const size = 1.5 + r * 3.5;
      ctx.globalAlpha = 0.25 + 0.5 * r;
      ctx.fillStyle = i % 3 ? '#9cc8ff' : '#ffd66b';
      ctx.beginPath(); ctx.arc(x, y, size, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- 1. brand badge ---------- */
  function badge(ctx, s) {
    const k = popIn(s, 0.05, 0.55);
    if (k <= 0) return;
    ctx.save();
    ctx.translate(540, 400);
    ctx.scale(k, k);
    // shockwave ring
    const sw = prog(s, 0.05, 0.9);
    if (sw < 1) {
      ctx.beginPath(); ctx.arc(0, 0, 120 + sw * 380, 0, TAU);
      ctx.lineWidth = 10 * (1 - sw); ctx.strokeStyle = `rgba(255,214,107,${0.8 * (1 - sw)})`; ctx.stroke();
    }
    // rotating gradient ring
    ctx.save();
    ctx.rotate(s * 1.2);
    ctx.beginPath(); ctx.arc(0, 0, 128, 0, TAU);
    ctx.lineWidth = 14; ctx.strokeStyle = grad(ctx, -128, -128, 128, 128, [GOLD[1], BLUE[1], GOLD[0], BLUE[0]]);
    ctx.shadowColor = 'rgba(255,201,60,0.7)'; ctx.shadowBlur = 40;
    ctx.stroke();
    ctx.restore();
    // disc
    ctx.beginPath(); ctx.arc(0, 0, 114, 0, TAU);
    ctx.fillStyle = grad(ctx, 0, -114, 0, 114, ['#1b2f63', '#060b18']); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 92px ${LATIN}`;
    ctx.fillStyle = grad(ctx, 0, -50, 0, 40, [GOLD[0], GOLD[2]]);
    ctx.fillText('PG', 0, -12);
    ctx.font = `800 34px ${LATIN}`; ctx.letterSpacing = '6px';
    ctx.fillStyle = '#fff'; ctx.fillText('360', 4, 52);
    ctx.restore();

    // brand name
    const n = Ease.outCubic(prog(s, 0.35, 0.8));
    if (n > 0) {
      ctx.save();
      ctx.globalAlpha = n;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `900 64px ${LATIN}`; ctx.letterSpacing = '8px';
      ctx.shadowColor = 'rgba(90,169,255,0.6)'; ctx.shadowBlur = 24;
      ctx.fillStyle = '#fff';
      ctx.fillText('PRIME GROWTH 360', 544, 610 + (1 - n) * 40);
      ctx.restore();
    }
  }

  /* ---------- 2. follow button + hand tap ---------- */
  function pill(ctx, x, y, w, h) { ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); }

  function check(ctx, x, y, sz, color) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = sz * 0.22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - sz * 0.45, y); ctx.lineTo(x - sz * 0.1, y + sz * 0.35); ctx.lineTo(x + sz * 0.5, y - sz * 0.35); ctx.stroke();
    ctx.restore();
  }

  function hand(ctx, x, y, press) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(-0.38); ctx.scale(1 - press * 0.08, 1 - press * 0.08);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#0d0d0d'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
    const parts = [[-16, 0, 32, 96, 16], [-36, 66, 108, 112, 30], [18, 54, 26, 50, 13], [46, 62, 26, 46, 13], [-58, 96, 34, 60, 17]];
    parts.forEach(([a, b, w, h, r]) => { ctx.beginPath(); ctx.roundRect(a, b, w, h, r); ctx.fill(); });
    ctx.shadowColor = 'transparent';
    parts.forEach(([a, b, w, h, r]) => { ctx.beginPath(); ctx.roundRect(a, b, w, h, r); ctx.stroke(); });
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(-33, 69, 102, 106, 27); ctx.fill();
    ctx.restore();
  }

  function burst(ctx, x, y, s) {
    if (s <= 0 || s > 1.4) return;
    ctx.save();
    for (let i = 0; i < 34; i++) {
      const r = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      const a = (i / 34) * TAU + r * 0.4;
      const v = 520 + r * 520;
      const px = x + Math.cos(a) * v * s;
      const py = y + Math.sin(a) * v * s + 700 * s * s;
      ctx.globalAlpha = clamp(1 - s / 1.4);
      ctx.fillStyle = ['#FFC93C', '#5AA9FF', '#ffffff', '#FF6B6B'][i % 4];
      ctx.save(); ctx.translate(px, py); ctx.rotate(a + s * 10 * (r - 0.5));
      ctx.fillRect(-7, -4, 14, 8); ctx.restore();
    }
    ctx.restore();
  }

  function followBlock(ctx, s, C) {
    G.FX.wordCaption(ctx, C.follow.text, 540, 790, {
      size: 58, maxWidth: 960, t: s, start: C.follow.in, end: C.follow.out, lineHeight: 1.4, highlight: 'Follow',
    });

    const k = popIn(s, C.tapAt - 1.0, 0.45);
    if (k <= 0) return;
    const tapped = s >= C.tapAt;
    const press = clamp(1 - Math.abs(s - C.tapAt) / 0.12);
    const bx = 540, by = 990, w = tapped ? 470 : 400, h = 112;
    ctx.save();
    ctx.translate(bx, by); ctx.scale(k * (1 - press * 0.08), k * (1 - press * 0.08)); ctx.translate(-bx, -by);
    // glow pulse before the tap
    if (!tapped) { ctx.shadowColor = 'rgba(29,107,255,0.9)'; ctx.shadowBlur = 30 + 20 * Math.sin(s * 9); }
    pill(ctx, bx, by, w, h);
    ctx.fillStyle = tapped ? '#22262f' : grad(ctx, 0, by - h / 2, 0, by + h / 2, [BLUE[0], BLUE[1], BLUE[2]]);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3; ctx.strokeStyle = tapped ? '#5b6170' : 'rgba(255,255,255,0.5)'; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    ctx.font = `800 50px ${LATIN}`;
    if (tapped) { ctx.fillText('Following', bx + 24, by + 2); check(ctx, bx - 160, by, 40, '#4ade80'); }
    else {
      ctx.fillText('Follow', bx + 22, by + 2);
      ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.strokeStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(bx - 120, by); ctx.lineTo(bx - 84, by); ctx.moveTo(bx - 102, by - 18); ctx.lineTo(bx - 102, by + 18); ctx.stroke();
    }
    ctx.restore();

    // ripple + confetti on tap
    const rs = s - C.tapAt;
    if (rs > 0 && rs < 0.6) {
      ctx.save(); ctx.beginPath(); ctx.arc(bx + 60, by + 10, 30 + rs * 420, 0, TAU);
      ctx.lineWidth = 8 * (1 - rs / 0.6); ctx.strokeStyle = `rgba(255,255,255,${1 - rs / 0.6})`; ctx.stroke(); ctx.restore();
    }
    burst(ctx, bx, by, rs);

    // the hand slides in, taps, slides out
    const inK = Ease.outCubic(prog(s, C.tapAt - 0.6, C.tapAt - 0.08));
    const outK = Ease.inOutQuad(prog(s, C.tapAt + 0.35, C.tapAt + 0.85));
    if (inK > 0 && outK < 1) {
      const hx = 600 + (1 - inK) * 420 + outK * 520;
      const hy = 1005 + (1 - inK) * 520 + outK * 600;
      hand(ctx, hx, hy, press);
    }
  }

  /* ---------- 3. course card + enrol button ---------- */
  function courseBlock(ctx, s, C) {
    const k = Ease.outCubic(prog(s, C.cardAt, C.cardAt + 0.55));
    if (k <= 0) return;
    const cx = 540, top = 1150 + (1 - k) * 260, w = 940, h = 360;
    ctx.save();
    ctx.globalAlpha = k;
    // card
    ctx.beginPath(); ctx.roundRect(cx - w / 2, top, w, h, 36);
    ctx.fillStyle = 'rgba(14,20,40,0.88)'; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = grad(ctx, cx - w / 2, top, cx + w / 2, top + h, [GOLD[0], GOLD[2], BLUE[0], GOLD[1]]);
    ctx.shadowColor = 'rgba(255,201,60,0.5)'; ctx.shadowBlur = 40; ctx.stroke(); ctx.shadowBlur = 0;
    // NEW tag
    const tg = popIn(s, C.cardAt + 0.35, 0.4);
    ctx.save(); ctx.translate(cx + w / 2 - 70, top + 4); ctx.rotate(0.12); ctx.scale(tg, tg);
    pill(ctx, 0, 0, 150, 60); ctx.fillStyle = grad(ctx, -75, 0, 75, 0, ['#FF5A5A', '#FF8A3D']); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 32px ${LATIN}`; ctx.letterSpacing = '3px'; ctx.fillText('NEW', 2, 2);
    ctx.restore();
    // title
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 92px ${LATIN}`; ctx.letterSpacing = '2px';
    ctx.fillStyle = grad(ctx, 0, top + 40, 0, top + 140, [GOLD[0], GOLD[1], GOLD[2]]);
    ctx.shadowColor = 'rgba(255,201,60,0.55)'; ctx.shadowBlur = 26;
    ctx.fillText('AI VIDEO', cx, top + 92);
    ctx.shadowBlur = 0;
    ctx.font = `800 40px ${LATIN}`; ctx.letterSpacing = '14px'; ctx.fillStyle = '#ffffff';
    ctx.fillText('PAID COURSE', cx + 7, top + 168);
    ctx.letterSpacing = '0px';
    ctx.restore();
    if (k > 0.5) {
      G.FX.wordCaption(ctx, C.course.text, cx, top + 262, {
        size: 50, maxWidth: 880, t: s, start: C.course.in, end: C.course.out, lineHeight: 1.35, highlight: 'Course',
      });
    }

    // enrol button
    const e = popIn(s, C.enrolAt, 0.5);
    if (e <= 0) return;
    const by = 1665, bw = 700, bh = 136;
    const pulse = 1 + 0.035 * Math.sin((s - C.enrolAt) * 7);
    ctx.save();
    ctx.translate(cx, by); ctx.scale(e * pulse, e * pulse); ctx.translate(-cx, -by);
    // halo rings
    for (let i = 0; i < 2; i++) {
      const p = ((s - C.enrolAt) * 0.9 + i * 0.5) % 1;
      ctx.save(); pill(ctx, cx, by, bw + p * 120, bh + p * 120);
      ctx.lineWidth = 4; ctx.strokeStyle = `rgba(255,201,60,${0.5 * (1 - p)})`; ctx.stroke(); ctx.restore();
    }
    pill(ctx, cx, by, bw, bh);
    ctx.shadowColor = 'rgba(255,170,30,0.85)'; ctx.shadowBlur = 50;
    ctx.fillStyle = grad(ctx, 0, by - bh / 2, 0, by + bh / 2, [GOLD[0], GOLD[1], GOLD[2]]);
    ctx.fill(); ctx.shadowBlur = 0;
    // shine sweep
    ctx.save(); pill(ctx, cx, by, bw, bh); ctx.clip();
    const sx = cx - bw + (((s - C.enrolAt) % 1.6) / 1.6) * bw * 2.4;
    const sg = ctx.createLinearGradient(sx - 90, 0, sx + 90, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.75)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.save(); ctx.translate(sx, by); ctx.transform(1, 0, -0.4, 1, 0, 0); ctx.fillRect(-90, -bh, 180, bh * 2); ctx.restore();
    ctx.restore();
    // label + arrow
    ctx.fillStyle = '#1a1200'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 60px ${GU}`;
    ctx.fillText(C.enrolLabel, cx - 34, by + 4);
    const ax = cx + 262 + Math.sin((s - C.enrolAt) * 7) * 8;
    ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1a1200';
    ctx.beginPath(); ctx.moveTo(ax - 34, by); ctx.lineTo(ax + 22, by); ctx.moveTo(ax, by - 24); ctx.lineTo(ax + 24, by); ctx.lineTo(ax, by + 24); ctx.stroke();
    ctx.restore();
  }

  function drawCTA(ctx, s, C) {
    background(ctx, s);
    badge(ctx, s);
    followBlock(ctx, s, C);
    courseBlock(ctx, s, C);
  }

  G.CTA = { drawCTA };
})(window);
