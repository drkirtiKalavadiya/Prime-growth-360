/* =====================================================================
 * effects.js: the motion-graphics layer.
 *   - Easing curves and spring helpers
 *   - Mirrored glossy floor reflection with a gradient fade
 *   - Kinetic typography (typewriter captions, letter-by-letter end card)
 *   - Vignette, film grain and fades
 * ===================================================================== */
(function (G) {
  'use strict';

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const prog = (t, t0, t1) => clamp((t - t0) / (t1 - t0));

  const Ease = {
    linear: (k) => k,
    inQuad: (k) => k * k,
    outCubic: (k) => 1 - Math.pow(1 - k, 3),
    outQuart: (k) => 1 - Math.pow(1 - k, 4),
    inOutQuad: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
    inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  };

  /** Damped spring oscillation: starts at amp, settles to 0. */
  const settle = (s, amp, freq = 11, damp = 5) =>
    s <= 0 ? 0 : amp * Math.exp(-damp * s) * Math.sin(freq * s);

  /* ---------- reflection ---------- */
  let reflCanvas = null;
  function reflection(ctx, objects, opts = {}) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    if (!reflCanvas || reflCanvas.width !== W || reflCanvas.height !== H) {
      reflCanvas = document.createElement('canvas');
      reflCanvas.width = W; reflCanvas.height = H;
    }
    const r = reflCanvas.getContext('2d');
    r.setTransform(1, 0, 0, 1, 0, 0);
    r.globalCompositeOperation = 'source-over';
    r.clearRect(0, 0, W, H);
    objects.forEach((o) => {
      r.save();
      r.translate(0, 2 * o.ground);
      r.scale(1, -1);
      o.draw(r);
      r.restore();
    });
    // fade the mirror image out with distance from the floor line
    r.globalCompositeOperation = 'destination-in';
    const top = opts.top ?? 1100, bottom = opts.bottom ?? 1560;
    const g = r.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.35, 'rgba(0,0,0,0.22)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    r.fillStyle = g;
    r.fillRect(0, 0, W, H);
    r.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.filter = `blur(${opts.blur ?? 2.5}px)`;
    ctx.drawImage(reflCanvas, 0, 0);
    ctx.restore();
  }

  /* ---------- typography ---------- */
  const FONT = '"Montserrat", "Inter Display", Inter, "Helvetica Neue", Arial, sans-serif';

  /**
   * Draws centred text one character at a time.
   * reveal = how many characters are visible (fractional = the next one fading in).
   */
  function spacedText(ctx, text, cx, y, o = {}) {
    const size = o.size || 30, spacing = o.spacing ?? size * 0.12;
    const alpha = o.alpha ?? 1, reveal = o.reveal ?? Infinity;
    ctx.save();
    ctx.font = `${o.weight || 600} ${size}px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = o.color || '#fff';
    const chars = [...text];
    const widths = chars.map((c) => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let x = cx - total / 2;
    if (o.glow) { ctx.shadowColor = 'rgba(255,255,255,0.45)'; ctx.shadowBlur = o.glow; }
    chars.forEach((c, i) => {
      const k = clamp(reveal - i);
      if (k > 0) {
        ctx.globalAlpha = alpha * Ease.outCubic(k);
        const rise = (1 - Ease.outCubic(k)) * (o.rise ?? 10);
        ctx.fillText(c, x, y + rise);
      }
      x += widths[i] + spacing;
    });
    ctx.restore();
  }

  /** A caption that types on and later fades out. */
  function caption(ctx, t, c, defaults) {
    if (t < c.in || t > c.out + 0.4) return;
    const cps = c.cps || defaults.cps;
    const reveal = (t - c.in) * cps;
    const alpha = 1 - Ease.inOutQuad(prog(t, c.out, c.out + 0.4));
    spacedText(ctx, c.text, defaults.x, c.y ?? defaults.y, {
      size: c.size || defaults.size, reveal, alpha, weight: 600, spacing: 3.5, glow: 6, rise: 6,
    });
  }

  /* ---------- finishing passes ---------- */
  function vignette(ctx, strength = 0.85) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const g = ctx.createRadialGradient(W / 2, H * 0.52, H * 0.18, W / 2, H * 0.52, H * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${strength})`);
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  // deterministic grain: a few pre-baked noise tiles, picked by frame number
  let grainTiles = null;
  function makeGrain() {
    let seed = 1337;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    grainTiles = [0, 1, 2, 3].map(() => {
      const c = document.createElement('canvas');
      c.width = 270; c.height = 480;
      const x = c.getContext('2d');
      const img = x.createImageData(c.width, c.height);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = rnd() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      return c;
    });
  }
  function grain(ctx, frame, amount = 0.035) {
    if (!grainTiles) makeGrain();
    ctx.save();
    ctx.globalAlpha = amount;
    ctx.globalCompositeOperation = 'overlay';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(grainTiles[frame % 4], 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  function blackout(ctx, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = clamp(a); ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
  }

  G.FX = { clamp, lerp, prog, Ease, settle, reflection, spacedText, caption, vignette, grain, blackout, FONT };
})(window);
