/* Reel engine: draws a 9:16 story reel on a <canvas>.
 * Every frame is a pure function of time t (seconds), so the same code
 * drives live preview, scrubbing, in-browser recording and headless rendering.
 */
(function (global) {
  'use strict';

  // ---------- maths & easing ----------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const ease = {
    linear: p => p,
    outCubic: p => 1 - Math.pow(1 - p, 3),
    inCubic: p => p * p * p,
    inOutCubic: p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    inOutSine: p => -(Math.cos(Math.PI * p) - 1) / 2,
    outBack: p => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    outBounce: p => {
      const n = 7.5625, d = 2.75;
      if (p < 1 / d) return n * p * p;
      if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
      if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
      return n * (p -= 2.625 / d) * p + 0.984375;
    }
  };
  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const prog = (lt, t0, dur) => clamp((lt - t0) / dur);

  const FONT = '"Poppins", "Montserrat", "Arial Black", "Helvetica Neue", Arial, sans-serif';
  const font = (px, w = 800) => `${w} ${Math.round(px)}px ${FONT}`;

  // ---------- text styles (match the reel: lime gradient, neon green, white, cyan) ----------
  const STYLES = {
    lime:   { stops: ['#f6ff7a', '#d9ff2e', '#a8e000'], stroke: null, shadow: 'rgba(0,0,0,.55)' },
    neon:   { stops: ['#7dff5a', '#39ff14', '#1fd400'], stroke: '#0b5d00', shadow: 'rgba(0,40,0,.6)', glow: 'rgba(80,255,40,.55)' },
    white:  { stops: ['#ffffff', '#f2f2f2', '#d7d7d7'], stroke: null, shadow: 'rgba(0,0,0,.6)' },
    silver: { stops: ['#e9f6ff', '#cfe8ff', '#9fc8ea'], stroke: null, shadow: 'rgba(0,0,0,.6)' },
    cyan:   { stops: ['#5ff0ff', '#22c7e0', '#0aa3c2'], stroke: null, shadow: 'rgba(0,0,0,.45)' },
    yellow: { stops: ['#fff36b', '#ffd400', '#f5b800'], stroke: null, shadow: 'rgba(0,0,0,.5)' },
    dark:   { stops: ['#151515', '#151515', '#151515'], stroke: null, shadow: null }
  };

  function textFill(ctx, style, top, bottom) {
    const s = STYLES[style] || STYLES.lime;
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    s.stops.forEach((c, i) => g.addColorStop(i / (s.stops.length - 1), c));
    return g;
  }

  /** Draw one glyph run with the house style (shadow, optional stroke and glow). */
  function styledText(ctx, str, x, y, size, style) {
    const s = STYLES[style] || STYLES.lime;
    ctx.font = font(size);
    ctx.textBaseline = 'alphabetic';
    const top = y - size * 0.78, bottom = y + size * 0.05;
    ctx.lineJoin = 'round';
    if (s.glow) {
      ctx.save();
      ctx.shadowColor = s.glow; ctx.shadowBlur = size * 0.45;
      ctx.fillStyle = s.glow; ctx.fillText(str, x, y);
      ctx.restore();
    }
    if (s.shadow) {
      ctx.save();
      ctx.shadowColor = s.shadow; ctx.shadowBlur = size * 0.18; ctx.shadowOffsetY = size * 0.06;
      ctx.fillStyle = s.shadow; ctx.fillText(str, x, y);
      ctx.restore();
    }
    if (s.stroke) {
      ctx.strokeStyle = s.stroke; ctx.lineWidth = size * 0.13; ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = textFill(ctx, style, top, bottom);
    ctx.fillText(str, x, y);
  }

  /** Text that appears character by character, each glyph popping up (the "2 0 1 5" look). */
  function typedText(ctx, str, cx, y, size, style, lt, o) {
    ctx.font = font(size);
    const chars = Array.from(str);
    const widths = chars.map(c => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0);
    let x = o.align === 'left' ? cx : o.align === 'right' ? cx - total : cx - total / 2;
    const cps = o.cps || 14, cdur = 0.28;
    chars.forEach((c, i) => {
      const p = prog(lt, o.t + i / cps, cdur);
      if (p > 0 && c !== ' ') {
        const sc = lerp(0.35, 1, ease.outBack(p));
        const dy = (1 - ease.outCubic(p)) * size * 0.45;
        ctx.save();
        ctx.globalAlpha *= clamp(p * 2.2);
        ctx.translate(x + widths[i] / 2, y + dy);
        ctx.scale(sc, sc);
        ctx.textAlign = 'center';
        styledText(ctx, c, 0, 0, size, style);
        ctx.restore();
      }
      x += widths[i];
    });
    return total;
  }

  // ---------- shared caches ----------
  const cache = {};
  function offscreen(w, h) {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  }

  // ---------- procedural fallback backgrounds (used until real images are added) ----------
  const BG = {
    wood(W, H) {
      const c = offscreen(W, H), g = c.getContext('2d'), r = rng(7);
      const base = g.createLinearGradient(0, 0, 0, H);
      base.addColorStop(0, '#4a2510'); base.addColorStop(0.5, '#6b3516'); base.addColorStop(1, '#3a1c0b');
      g.fillStyle = base; g.fillRect(0, 0, W, H);
      // planks
      const planks = 4;
      for (let p = 0; p < planks; p++) {
        const x0 = (p / planks) * W;
        g.fillStyle = `rgba(${90 + r() * 40},${40 + r() * 20},${15 + r() * 10},.35)`;
        g.fillRect(x0, 0, W / planks, H);
        g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x0 - 1.5, 0, 3, H);
      }
      // grain: long, gently wavy lines running the full height of each plank
      for (let i = 0; i < 260; i++) {
        const x = r() * W, amp = 3 + r() * 10, freq = 1 + r() * 3, ph = r() * 6.28;
        g.strokeStyle = r() < 0.55 ? `rgba(30,12,4,${0.06 + r() * 0.14})` : `rgba(170,95,45,${0.04 + r() * 0.1})`;
        g.lineWidth = 0.6 + r() * 1.6;
        g.beginPath();
        for (let y = 0; y <= H; y += 16) {
          const xx = x + Math.sin((y / H) * freq * 6.28 + ph) * amp;
          if (y === 0) g.moveTo(xx, y); else g.lineTo(xx, y);
        }
        g.stroke();
      }
      // knots
      for (let i = 0; i < 5; i++) {
        const x = r() * W, y = r() * H, rr = 6 + r() * 14;
        for (let k = 4; k > 0; k--) {
          g.strokeStyle = `rgba(30,10,2,${0.12 * k})`; g.lineWidth = 1.2;
          g.beginPath(); g.ellipse(x, y, rr * k * 0.5, rr * k * 1.4, 0, 0, Math.PI * 2); g.stroke();
        }
      }
      // warm window light from top-right, diagonal rays
      g.save();
      g.globalCompositeOperation = 'screen';
      try { g.filter = `blur(${Math.round(W * 0.03)}px)`; } catch (e) { /* no filter support */ }
      for (let i = 0; i < 5; i++) {
        const off = i * W * 0.2, bw = W * (0.07 + r() * 0.06);
        const grad = g.createLinearGradient(W, 0, 0, H * 0.75);
        grad.addColorStop(0, 'rgba(255,195,120,.5)'); grad.addColorStop(0.6, 'rgba(255,160,70,.18)'); grad.addColorStop(1, 'rgba(255,150,60,0)');
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(W * 0.4 + off, -40); g.lineTo(W * 0.4 + off + bw, -40);
        g.lineTo(-W * 0.3 + off + bw * 1.6, H * 0.8); g.lineTo(-W * 0.3 + off, H * 0.8); g.closePath();
        g.fill();
      }
      g.restore();
      const v = g.createRadialGradient(W / 2, H * 0.45, W * 0.2, W / 2, H / 2, H * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)');
      g.fillStyle = v; g.fillRect(0, 0, W, H);
      return c;
    },
    sky(W, H, o) {
      const c = offscreen(W, H), g = c.getContext('2d'), r = rng(11);
      const s = g.createLinearGradient(0, 0, 0, H * 0.6);
      s.addColorStop(0, '#1d6fd6'); s.addColorStop(1, '#8cc7ff');
      g.fillStyle = s; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) {
        const x = r() * W, y = r() * H * 0.35, rr = W * (0.06 + r() * 0.1);
        g.fillStyle = 'rgba(255,255,255,.85)';
        for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + k * rr * 0.6, y + (r() - 0.5) * rr * 0.4, rr * (0.6 + r() * 0.5), 0, 7); g.fill(); }
      }
      // glass tower
      const bx = W * 0.18, bw = W * 0.64, by = H * 0.18;
      const glass = g.createLinearGradient(bx, 0, bx + bw, 0);
      glass.addColorStop(0, '#1f4f7a'); glass.addColorStop(0.5, '#6fa6d6'); glass.addColorStop(1, '#244e75');
      g.fillStyle = glass; g.fillRect(bx, by, bw, H * 0.62);
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2;
      for (let x = bx; x < bx + bw; x += bw / 10) { g.beginPath(); g.moveTo(x, by); g.lineTo(x, by + H * 0.62); g.stroke(); }
      for (let y = by; y < by + H * 0.62; y += H * 0.03) { g.beginPath(); g.moveTo(bx, y); g.lineTo(bx + bw, y); g.stroke(); }
      if (o && o.sign) {
        g.fillStyle = '#fff'; g.fillRect(W * 0.32, by + H * 0.05, W * 0.36, W * 0.3);
        g.fillStyle = o.signColor || '#1b8f3a';
        g.font = font(W * 0.05); g.textAlign = 'center';
        g.fillText(o.sign, W / 2, by + H * 0.05 + W * 0.2);
      }
      g.fillStyle = '#9a9a92'; g.fillRect(0, H * 0.8, W, H * 0.2);
      g.fillStyle = '#2f6b2a'; for (let x = 0; x < W; x += W / 9) { g.beginPath(); g.arc(x, H * 0.8, W * 0.06, Math.PI, 0); g.fill(); }
      return c;
    },
    office(W, H) {
      const c = offscreen(W, H), g = c.getContext('2d');
      const b = g.createLinearGradient(0, 0, W, H);
      b.addColorStop(0, '#3b2414'); b.addColorStop(0.6, '#6a4326'); b.addColorStop(1, '#24150b');
      g.fillStyle = b; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(190,225,255,.35)';
      for (let i = 0; i < 3; i++) g.fillRect(W * (0.05 + i * 0.12), H * 0.1, W * 0.1, H * 0.45);
      g.fillStyle = '#d8c6a6'; g.fillRect(W * 0.45, H * 0.06, W * 0.5, H * 0.5);
      g.fillStyle = '#4b2a14'; g.fillRect(0, H * 0.62, W, H * 0.05);
      const desk = g.createLinearGradient(0, H * 0.67, 0, H);
      desk.addColorStop(0, '#5a2e12'); desk.addColorStop(1, '#1d0d04');
      g.fillStyle = desk; g.fillRect(0, H * 0.67, W, H * 0.33);
      return c;
    },
    logo(W, H, o) {
      const c = offscreen(W, H), g = c.getContext('2d');
      const b = g.createLinearGradient(0, 0, W, H);
      b.addColorStop(0, '#eee7da'); b.addColorStop(1, '#bfb29a');
      g.fillStyle = b; g.fillRect(0, 0, W, H);
      g.fillStyle = (o && o.signColor) || '#1b8f3a';
      g.beginPath(); g.arc(W / 2, H * 0.42, W * 0.26, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.font = font(W * 0.3); g.textAlign = 'center';
      g.fillText((o && o.initial) || 'S', W / 2, H * 0.42 + W * 0.11);
      g.fillStyle = '#2b2b2b'; g.font = font(W * 0.07);
      g.fillText((o && o.sign) || 'BRAND', W / 2, H * 0.24);
      return c;
    },
    shop(W, H) {
      const c = offscreen(W, H), g = c.getContext('2d'), r = rng(23);
      g.fillStyle = '#3a2412'; g.fillRect(0, 0, W, H);
      const cols = ['#7bd84a', '#e8452c', '#f3c21b', '#3b8ee8', '#ff8a1c', '#a4e23a'];
      for (let row = 0; row < 7; row++) {
        const y = H * (0.04 + row * 0.12);
        g.fillStyle = '#5a3a1e'; g.fillRect(0, y + H * 0.1, W, H * 0.015);
        for (let x = W * 0.03; x < W; x += W * 0.105) {
          g.fillStyle = cols[Math.floor(r() * cols.length)];
          g.globalAlpha = 0.85; g.fillRect(x, y + H * 0.02, W * 0.085, H * 0.08); g.globalAlpha = 1;
          g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 3, y + H * 0.025, W * 0.02, H * 0.06);
        }
      }
      g.fillStyle = '#8a8170'; g.fillRect(0, H * 0.88, W, H * 0.12);
      return c;
    },
    kitchen(W, H) {
      const c = offscreen(W, H), g = c.getContext('2d');
      const b = g.createLinearGradient(0, 0, 0, H);
      b.addColorStop(0, '#5b4630'); b.addColorStop(0.55, '#b59b74'); b.addColorStop(1, '#3a2716');
      g.fillStyle = b; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#c9c9c9'; g.lineWidth = W * 0.012;
      for (let i = 0; i < 6; i++) { const x = W * (0.3 + i * 0.08); g.beginPath(); g.moveTo(x, H * 0.12); g.lineTo(x, H * 0.3); g.stroke(); g.beginPath(); g.arc(x, H * 0.32, W * 0.025, 0, 7); g.stroke(); }
      g.fillStyle = '#d9d2c3'; g.beginPath(); g.ellipse(W * 0.55, H * 0.8, W * 0.42, H * 0.1, 0, 0, 7); g.fill();
      g.fillStyle = '#c99a3c'; g.beginPath(); g.ellipse(W * 0.55, H * 0.78, W * 0.34, H * 0.07, 0, 0, 7); g.fill();
      return c;
    },
    board(W, H, o) {
      const c = offscreen(W, H), g = c.getContext('2d');
      g.fillStyle = '#d4d4d0'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#fbfbf8'; g.fillRect(W * 0.04, H * 0.03, W * 0.92, H * 0.94);
      g.strokeStyle = '#9a9a9a'; g.lineWidth = 6; g.strokeRect(W * 0.04, H * 0.03, W * 0.92, H * 0.94);
      const b = (o && o.board) || {};
      g.fillStyle = '#2b2b2b'; g.textAlign = 'center';
      g.font = font(W * 0.052, 500); g.fillText(b.title || 'First Release', W / 2, H * 0.12);
      g.font = font(W * 0.045, 500); g.fillText(b.subtitle || '', W / 2, H * 0.17);
      g.fillText(b.highlight || '', W / 2, H * 0.215);
      const steps = b.steps || [];
      g.lineWidth = 3; g.strokeStyle = '#333'; g.font = font(W * 0.032, 600);
      steps.forEach((s, i) => {
        const y = H * (0.3 + i * 0.12);
        g.strokeRect(W * 0.25, y - H * 0.035, W * 0.5, H * 0.06);
        g.fillText(s, W / 2, y + W * 0.01);
        if (i < steps.length - 1) { g.beginPath(); g.moveTo(W / 2, y + H * 0.025); g.lineTo(W / 2, y + H * 0.085); g.stroke(); }
      });
      return c;
    },
    green(W, H) {
      const c = offscreen(W, H), g = c.getContext('2d');
      const b = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * 0.7);
      b.addColorStop(0, '#2f8f2a'); b.addColorStop(0.5, '#123d12'); b.addColorStop(1, '#041204');
      g.fillStyle = b; g.fillRect(0, 0, W, H);
      return c;
    }
  };

  // ---------- procedural sprites ----------
  const SPRITES = {
    candy(o) { // green pillow-pack candy
      const w = 600, h = 340, c = offscreen(w, h), g = c.getContext('2d');
      const zig = (x, dir) => { const pts = []; for (let i = 0; i <= 12; i++) pts.push([x + (i % 2 ? dir * 22 : 0), 40 + i * (h - 80) / 12]); return pts; };
      g.beginPath();
      g.moveTo(60, 40);
      g.quadraticCurveTo(w / 2, 10, w - 60, 40);
      zig(w - 60, 1).forEach(p => g.lineTo(p[0], p[1]));
      g.quadraticCurveTo(w / 2, h - 10, 60, h - 40);
      zig(60, -1).reverse().forEach(p => g.lineTo(p[0], p[1]));
      g.closePath();
      const body = g.createLinearGradient(0, 0, w, h);
      body.addColorStop(0, '#0f4d12'); body.addColorStop(0.45, '#2fa21f'); body.addColorStop(1, '#0a3a0c');
      g.fillStyle = body; g.fill();
      g.save(); g.clip();
      const sh = g.createLinearGradient(0, 0, 0, h);
      sh.addColorStop(0, 'rgba(255,255,255,.35)'); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.35)');
      g.fillStyle = sh; g.fillRect(0, 0, w, h);
      // mango
      g.fillStyle = '#9ad23a'; g.beginPath(); g.ellipse(w * 0.76, h * 0.72, 70, 52, -0.4, 0, 7); g.fill();
      g.fillStyle = '#f5d24a'; g.beginPath(); g.ellipse(w * 0.79, h * 0.7, 40, 30, -0.4, 0, 7); g.fill();
      g.restore();
      g.save(); g.translate(w * 0.47, h * 0.5); g.rotate(-0.06);
      g.font = font(132, 900); g.textAlign = 'center'; g.lineJoin = 'round';
      g.strokeStyle = '#062b06'; g.lineWidth = 22; g.strokeText((o && o.label) || 'PULSE', 0, 30);
      const tf = g.createLinearGradient(0, -70, 0, 40);
      tf.addColorStop(0, '#f4ff7c'); tf.addColorStop(1, '#a6e000');
      g.fillStyle = tf; g.fillText((o && o.label) || 'PULSE', 0, 30);
      g.restore();
      g.fillStyle = 'rgba(255,255,255,.9)'; g.font = font(26, 700); g.textAlign = 'left';
      g.fillText((o && o.tag) || 'Kachcha Aam', w * 0.12, h * 0.85);
      return c;
    },
    toffee(o) { // yellow twist-wrap toffee
      const w = 420, h = 420, c = offscreen(w, h), g = c.getContext('2d');
      g.fillStyle = '#c99700';
      g.beginPath(); g.moveTo(w * 0.5, h * 0.3); g.lineTo(w * 0.32, h * 0.02); g.lineTo(w * 0.68, h * 0.02); g.closePath(); g.fill();
      g.fillStyle = '#2a9a3a';
      g.beginPath(); g.moveTo(w * 0.5, h * 0.32); g.lineTo(w * 0.36, h * 0.08); g.lineTo(w * 0.64, h * 0.08); g.closePath(); g.fill();
      const b = g.createRadialGradient(w * 0.42, h * 0.5, 10, w / 2, h * 0.62, w * 0.4);
      b.addColorStop(0, '#fff27a'); b.addColorStop(0.6, '#ffd21a'); b.addColorStop(1, '#d99a00');
      g.fillStyle = b; g.beginPath(); g.ellipse(w / 2, h * 0.64, w * 0.4, h * 0.33, 0, 0, 7); g.fill();
      g.fillStyle = '#e4262c'; g.beginPath(); g.ellipse(w / 2, h * 0.48, w * 0.2, h * 0.05, 0, 0, 7); g.fill();
      g.font = font(64, 900); g.textAlign = 'center'; g.fillStyle = '#e4262c';
      g.fillText((o && o.label) || 'mango', w / 2, h * 0.68);
      g.font = font(52, 900); g.fillText((o && o.sub) || 'bite', w / 2, h * 0.8);
      return c;
    }
  };

  // ---------- engine ----------
  function Reel(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = canvas.width; this.H = canvas.height;
    this.images = {};
    this.showHints = true;
    this.setConfig(config);
    this.bufA = offscreen(this.W, this.H);
    this.bufB = offscreen(this.W, this.H);
  }

  Reel.prototype.setConfig = function (config) {
    this.config = config;
    let t = 0;
    this.scenes = config.scenes.map((s, i) => { const sc = Object.assign({ index: i }, s, { start: t }); t += s.dur; return sc; });
    this.duration = t;
    for (const k in cache) delete cache[k];
  };

  Reel.prototype.sceneAt = function (t) {
    const s = this.scenes;
    for (let i = 0; i < s.length; i++) if (t < s[i].start + s[i].dur) return i;
    return s.length - 1;
  };

  Reel.prototype.background = function (scene) {
    const bg = scene.bg || {};
    if (bg.img && this.images[bg.img]) return this.images[bg.img];
    const name = bg.fallback || 'office';
    const key = name + '|' + this.W + '|' + JSON.stringify(scene.bgOptions || {});
    if (!cache[key]) cache[key] = (BG[name] || BG.office)(this.W, this.H, Object.assign({}, this.config.brand, scene.bgOptions));
    return cache[key];
  };

  Reel.prototype.sprite = function (name) {
    if (this.images[name]) return this.images[name];
    const key = 'sprite|' + name;
    if (!cache[key]) cache[key] = (SPRITES[name] || SPRITES.candy)(this.config.brand && this.config.brand[name]);
    return cache[key];
  };

  /** Camera transform for a scene's background (Ken Burns from -> to). */
  Reel.prototype.camera = function (scene, lt) {
    const bg = scene.bg || {};
    const f = Object.assign({ s: 1.04, x: 0, y: 0, r: 0 }, bg.from);
    const to = Object.assign({ s: 1.12, x: 0, y: 0, r: 0 }, bg.to);
    const p = (ease[bg.ease] || ease.inOutSine)(clamp(lt / scene.dur, 0, 1.15));
    return { s: lerp(f.s, to.s, p), x: lerp(f.x, to.x, p), y: lerp(f.y, to.y, p), r: lerp(f.r, to.r, p) };
  };

  Reel.prototype.applyCamera = function (ctx, cam) {
    const W = this.W, H = this.H;
    ctx.translate(W / 2 + cam.x * W, H / 2 + cam.y * H);
    ctx.rotate(cam.r * Math.PI / 180);
    ctx.scale(cam.s, cam.s);
    ctx.translate(-W / 2, -H / 2);
  };

  Reel.prototype.drawCover = function (ctx, img) {
    const W = this.W, H = this.H;
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const sc = Math.max(W / iw, H / ih);
    const dw = iw * sc, dh = ih * sc;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  };

  Reel.prototype.renderScene = function (ctx, scene, lt) {
    const W = this.W, H = this.H;
    ctx.save();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const cam = this.camera(scene, lt);
    ctx.save();
    this.applyCamera(ctx, cam);
    this.drawCover(ctx, this.background(scene));
    (scene.fx || []).forEach(fx => { if (fx.onImage) this.drawFx(ctx, fx, lt, scene); });
    ctx.restore();
    if (this.showHints && scene.bg && scene.bg.img && !scene.bg.optional && !this.images[scene.bg.img]) {
      ctx.save();
      ctx.font = font(W * 0.026, 600); ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      const label = `add image: assets/${scene.bg.img}.jpg`;
      const tw = ctx.measureText(label).width + W * 0.05;
      ctx.fillRect((W - tw) / 2, H * 0.955, tw, W * 0.045);
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillText(label, W / 2, H * 0.955 + W * 0.032);
      ctx.restore();
    }
    (scene.fx || []).forEach(fx => { if (!fx.onImage) this.drawFx(ctx, fx, lt, scene); });
    ctx.restore();
  };

  // ---------- effects ----------
  Reel.prototype.drawFx = function (ctx, fx, lt, scene) {
    const W = this.W, H = this.H;
    const t0 = fx.t || 0;
    if (lt < t0 - 0.001 && fx.type !== 'dust') return;
    let alpha = 1;
    if (fx.out != null) alpha = 1 - prog(lt, fx.out, 0.25);
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    const fn = FX[fx.type];
    if (fn) fn.call(this, ctx, fx, lt, W, H, scene);
    ctx.restore();
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function popScale(lt, t0, d = 0.38) { const p = prog(lt, t0, d); return p <= 0 ? 0 : ease.outBack(p); }

  function accentBar(ctx, x, y, size) {
    ctx.save();
    ctx.fillStyle = '#ff3b1f';
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = size * 0.15;
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.18); ctx.lineTo(x + size * 0.55, y - size * 0.24);
    ctx.lineTo(x + size * 0.5, y - size * 0.02); ctx.lineTo(x - size * 0.06, y + size * 0.02); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function formatNum(v, fmt) {
    if (fmt === 'dec2') return v.toFixed(2);
    if (fmt === 'dec1') return v.toFixed(1);
    const n = Math.round(v);
    return fmt === 'indian' ? n.toLocaleString('en-IN') : String(n);
  }

  // Shared block layout for text / counter: main line + optional "sub" line, with pop or type animation.
  function textBlock(ctx, fx, lt, W, H, str) {
    const size = (fx.size || 0.08) * W;
    const x = (fx.x != null ? fx.x : 0.5) * W, y = (fx.y != null ? fx.y : 0.5) * H;
    const style = fx.style || 'lime';
    const anim = fx.anim || 'pop';
    ctx.save();
    ctx.translate(x, y);
    if (fx.rot) ctx.rotate(fx.rot * Math.PI / 180);
    if (fx.wobble) { ctx.rotate(Math.sin((lt - fx.t) * 3.2) * 0.06); ctx.translate(0, Math.sin((lt - fx.t) * 2.1) * size * 0.05); }
    if (fx.grow) ctx.scale(lerp(1, fx.grow.to, ease.outBack(prog(lt, fx.grow.t, 0.4))), lerp(1, fx.grow.to, ease.outBack(prog(lt, fx.grow.t, 0.4))));
    if (anim === 'pop') { const s = popScale(lt, fx.t, fx.popDur || 0.4); if (s <= 0) { ctx.restore(); return; } ctx.scale(s, s); }
    if (anim === 'rise') { const p = ease.outCubic(prog(lt, fx.t, 0.45)); ctx.globalAlpha *= p; ctx.translate(0, (1 - p) * size * 0.8); }

    ctx.font = font(size);
    const mainW = ctx.measureText(str).width;
    if (fx.pill) {
      const pw = mainW + size * 0.7, ph = size * 1.15;
      ctx.save();
      ctx.fillStyle = fx.pillColor || 'rgba(25,25,25,.62)';
      ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = size * 0.3;
      roundRect(ctx, -pw / 2, -size * 0.92, pw, ph, ph / 2); ctx.fill();
      ctx.restore();
    }
    if (fx.accent) accentBar(ctx, -mainW / 2 - size * 0.62, 0, size);
    if (anim === 'type') typedText(ctx, str, 0, 0, size, style, lt, fx);
    else { ctx.textAlign = 'center'; styledText(ctx, str, 0, 0, size, style); }

    if (fx.sub) {
      const ss = (fx.subSize || fx.size * 0.72) * W;
      const sy = ss * 0.95;
      if (anim === 'type') typedText(ctx, fx.sub, fx.subDx ? fx.subDx * W : 0, sy, ss, fx.subStyle || style, lt, Object.assign({}, fx, { t: fx.t + 0.25 }));
      else { ctx.textAlign = 'center'; styledText(ctx, fx.sub, fx.subDx ? fx.subDx * W : 0, sy, ss, fx.subStyle || style); }
    }
    ctx.restore();
  }

  const FX = {
    text(ctx, fx, lt, W, H) { textBlock(ctx, fx, lt, W, H, fx.text); },

    counter(ctx, fx, lt, W, H) {
      const p = (ease[fx.ease] || ease.outCubic)(prog(lt, fx.t + (fx.delay || 0), fx.dur || 1.2));
      const v = lerp(fx.from, fx.to, p);
      const str = (fx.prefix || '') + formatNum(v, fx.fmt) + (p >= 1 && fx.endSuffix != null ? fx.endSuffix : (fx.suffix || ''));
      textBlock(ctx, Object.assign({}, fx, { anim: fx.anim === 'type' ? 'pop' : fx.anim }), lt, W, H, str);
    },

    pill(ctx, fx, lt, W, H) {
      const size = (fx.size || 0.045) * W;
      const x = (fx.x != null ? fx.x : 0.5) * W, y = (fx.y || 0.6) * H;
      ctx.font = font(size);
      const tw = ctx.measureText(fx.text).width;
      const pw = tw + size * 1.2, ph = size * 1.45;
      const p = ease.outCubic(prog(lt, fx.t, 0.45));
      if (p <= 0) return;
      const left = x - pw / 2;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = size * 0.4; ctx.shadowOffsetY = size * 0.08;
      ctx.fillStyle = fx.bg || '#ffd400';
      roundRect(ctx, left, y - ph / 2, Math.max(ph, pw * p), ph, ph / 2); ctx.fill();
      ctx.restore();
      ctx.save();
      roundRect(ctx, left, y - ph / 2, Math.max(ph, pw * p), ph, ph / 2); ctx.clip();
      ctx.font = font(size); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const slide = (1 - p) * -pw * 0.6;
      if (fx.textStyle) { ctx.textBaseline = 'alphabetic'; styledText(ctx, fx.text, x + slide, y + size * 0.36, size, fx.textStyle); }
      else { ctx.fillStyle = fx.color || '#141414'; ctx.fillText(fx.text, x + slide, y + size * 0.04); }
      ctx.restore();
    },

    sprite(ctx, fx, lt, W, H) {
      const img = this.sprite(fx.name || 'candy');
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      const w = (fx.w || 0.3) * W, h = w * ih / iw;
      let x = (fx.x != null ? fx.x : 0.5) * W, y = (fx.y != null ? fx.y : 0.5) * H;
      let rot = (fx.rot || 0) * Math.PI / 180, s = 1, a = 1;
      const anim = fx.anim || 'pop';
      if (anim === 'drop') { // falls in spinning, bounces to rest
        const p = prog(lt, fx.t, fx.dur || 0.9);
        const fromY = (fx.fromY != null ? fx.fromY : 1.15) * H, fromX = (fx.fromX != null ? fx.fromX : fx.x + 0.25) * W;
        y = lerp(fromY, y, ease.outBounce(p)); x = lerp(fromX, x, ease.outCubic(p));
        rot += (1 - ease.outCubic(p)) * (fx.spin != null ? fx.spin : -2.4);
        s = lerp(fx.fromScale || 1.6, 1, ease.outCubic(p));
      } else if (anim === 'pop') {
        s = popScale(lt, fx.t, 0.45); if (s <= 0) return;
      } else if (anim === 'fade') {
        a = prog(lt, fx.t, 0.4);
      }
      if (fx.float) { y += Math.sin((lt - fx.t) * 2.2) * H * 0.006; rot += Math.sin((lt - fx.t) * 1.6) * 0.04; }
      if (fx.grow) s *= lerp(1, fx.grow.to, ease.outBack(prog(lt, fx.grow.t, 0.4)));
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
      ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = w * 0.1; ctx.shadowOffsetY = w * 0.05;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    },

    box(ctx, fx, lt, W, H) { // neon rectangle drawn around its perimeter
      const x = fx.x * W, y = fx.y * H, w = fx.w * W, h = fx.h * H;
      const p = ease.inOutCubic(prog(lt, fx.t, fx.dur || 0.8));
      if (p <= 0) return;
      const per = 2 * (w + h), len = per * p;
      const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
      ctx.save();
      const pulse = 0.75 + 0.25 * Math.sin((lt - fx.t) * 6);
      ctx.strokeStyle = fx.color || '#b6ff1a';
      ctx.lineWidth = W * 0.008; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.shadowColor = fx.color || '#b6ff1a'; ctx.shadowBlur = W * 0.03 * pulse;
      ctx.beginPath(); ctx.moveTo(x, y);
      let left = len;
      for (let i = 1; i < pts.length && left > 0; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        const seg = Math.hypot(bx - ax, by - ay), q = Math.min(1, left / seg);
        ctx.lineTo(lerp(ax, bx, q), lerp(ay, by, q)); left -= seg;
      }
      ctx.stroke(); ctx.stroke();
      if (p >= 1) { ctx.globalAlpha *= 0.12 * pulse; ctx.fillStyle = fx.color || '#b6ff1a'; ctx.fillRect(x, y, w, h); }
      ctx.restore();
    },

    marker(ctx, fx, lt, W, H) { // highlighter sweep
      const p = ease.inOutCubic(prog(lt, fx.t, fx.dur || 0.8));
      if (p <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = fx.color || 'rgba(215,255,0,.75)';
      const x = fx.x * W, y = fx.y * H, w = fx.w * W, h = fx.h * H;
      ctx.beginPath();
      ctx.moveTo(x, y + h * 0.1); ctx.lineTo(x + w * p, y); ctx.lineTo(x + w * p, y + h); ctx.lineTo(x, y + h * 0.95); ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    burst(ctx, fx, lt, W, H) { // green glow explosion with shards
      const p = prog(lt, fx.t, fx.dur || 2.2);
      if (p <= 0) return;
      const cx = (fx.x || 0.5) * W, cy = (fx.y || 0.48) * H, r = rng(fx.seed || 99);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const core = W * (0.08 + 0.35 * ease.outCubic(Math.min(1, p * 2.2))) * (1 + 0.05 * Math.sin(lt * 25));
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, core * 2.2);
      g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.18, 'rgba(210,255,170,.95)');
      g.addColorStop(0.45, 'rgba(90,230,60,.55)'); g.addColorStop(1, 'rgba(20,120,20,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const n = fx.count || 70;
      for (let i = 0; i < n; i++) {
        const ang = r() * Math.PI * 2, sp = 0.25 + r() * 0.9, delay = r() * 0.25;
        const q = clamp((p - delay) / (1 - delay));
        if (q <= 0) continue;
        const d = ease.outCubic(q) * sp * H * 0.6;
        const px = cx + Math.cos(ang) * d, py = cy + Math.sin(ang) * d;
        const sz = W * (0.006 + r() * 0.03) * (1 - q * 0.5);
        ctx.globalAlpha = (1 - q) * 0.95;
        ctx.save(); ctx.translate(px, py); ctx.rotate(ang + q * 6 * (r() - 0.5));
        ctx.fillStyle = r() < 0.3 ? '#f4ffb0' : r() < 0.6 ? '#6dff3a' : '#c8b040';
        ctx.beginPath(); ctx.moveTo(-sz, 0); ctx.lineTo(0, -sz * 0.45); ctx.lineTo(sz * 1.6, 0); ctx.lineTo(0, sz * 0.45); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      // streak rays
      ctx.globalAlpha = (1 - p) * 0.5;
      for (let i = 0; i < 18; i++) {
        const ang = r() * Math.PI * 2, len = H * (0.2 + r() * 0.5) * ease.outCubic(Math.min(1, p * 1.5));
        ctx.strokeStyle = 'rgba(200,255,140,.8)'; ctx.lineWidth = W * 0.004;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len); ctx.stroke();
      }
      ctx.restore();
    },

    flash(ctx, fx, lt, W, H) {
      const d = fx.dur || 0.4, p = prog(lt, fx.t, d);
      if (p <= 0 || p >= 1) return;
      ctx.globalAlpha *= Math.sin(p * Math.PI);
      ctx.fillStyle = fx.color || '#fff'; ctx.fillRect(0, 0, W, H);
    },

    dust(ctx, fx, lt, W, H) { // floating light motes in the sun rays
      const r = rng(fx.seed || 5);
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < (fx.count || 40); i++) {
        const bx = r() * W, by = r() * H, sp = 0.01 + r() * 0.03, ph = r() * 6.28, sz = W * (0.002 + r() * 0.004);
        const x = (bx + Math.sin(lt * 0.6 + ph) * W * 0.02) % W;
        const y = (by - lt * sp * H + H * 10) % H;
        ctx.globalAlpha = 0.25 + 0.35 * Math.sin(lt * 1.3 + ph) ** 2;
        ctx.fillStyle = '#ffd9a0';
        ctx.beginPath(); ctx.arc(x, y, sz, 0, 7); ctx.fill();
      }
      ctx.restore();
    },

    subscribe(ctx, fx, lt, W, H) { // like / subscribe / bell bar with an animated cursor
      const t0 = fx.t, p = ease.outBack(prog(lt, t0, 0.5));
      if (p <= 0) return;
      const bw = W * 0.5, bh = W * 0.075, cx = (fx.x || 0.5) * W, cy = (fx.y || 0.62) * H;
      const x0 = cx - bw / 2, y0 = cy - bh / 2;
      const liked = lt > t0 + 1.0, subbed = lt > t0 + 1.8, belled = lt > t0 + 2.5;
      ctx.save();
      ctx.translate(cx, cy + (1 - p) * H * 0.08); ctx.scale(lerp(0.6, 1, p), lerp(0.6, 1, p)); ctx.translate(-cx, -cy);
      ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = W * 0.03; ctx.shadowOffsetY = W * 0.006;
      ctx.fillStyle = '#fafafa'; roundRect(ctx, x0, y0, bw, bh, bh * 0.28); ctx.fill();
      ctx.shadowColor = 'transparent';
      const ic = bh * 0.5;
      const thumb = new Path2D('M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z');
      const bell = new Path2D('M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z');
      const icon = (path, x, y, color, flip, pop) => {
        ctx.save(); ctx.translate(x, y);
        const k = (ic / 24) * (pop || 1); ctx.scale(k, flip ? -k : k); ctx.translate(-12, -12);
        ctx.fillStyle = color; ctx.fill(path); ctx.restore();
      };
      const likePop = 1 + 0.35 * Math.sin(clamp((lt - t0 - 1.0) / 0.3) * Math.PI);
      const ix = x0 + bh * 0.55;
      icon(thumb, ix, cy, liked ? '#1e6fff' : '#555', false, likePop);
      icon(thumb, ix + ic * 1.35, cy + ic * 0.08, '#555', true);
      ctx.fillStyle = '#ddd'; ctx.fillRect(ix + ic * 2.15, cy - ic * 0.4, 2, ic * 0.8);
      // subscribe button
      const sbw = bw * 0.38, sbh = bh * 0.52, sbx = x0 + bw * 0.44, sby = cy - sbh / 2;
      ctx.fillStyle = subbed ? '#8a8a8a' : '#e3002b'; roundRect(ctx, sbx, sby, sbw, sbh, sbh * 0.25); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = font(sbh * 0.48, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(subbed ? 'Subscribed' : 'Subscribe', sbx + sbw / 2, cy + 1);
      const bellPop = belled ? 1 + 0.25 * Math.sin(clamp((lt - t0 - 2.5) / 0.3) * Math.PI) : 1;
      ctx.save();
      const bx = x0 + bw - bh * 0.55;
      ctx.translate(bx, cy); if (belled) ctx.rotate(Math.sin((lt - t0) * 18) * 0.25 * Math.max(0, 1 - (lt - t0 - 2.5))); ctx.translate(-bx, -cy);
      icon(bell, bx, cy, belled ? '#111' : '#555', false, bellPop);
      ctx.restore();
      // cursor path: off-screen -> like -> subscribe -> bell
      const keys = [[t0 + 0.3, cx + bw * 0.4, cy + bh * 2.2], [t0 + 0.95, ix + ic * 0.2, cy + ic * 0.3], [t0 + 1.75, sbx + sbw * 0.6, cy + sbh * 0.3], [t0 + 2.45, bx + ic * 0.15, cy + ic * 0.3], [t0 + 9, bx + ic * 0.15, cy + ic * 0.3]];
      if (lt > keys[0][0]) {
        let k = 0; while (k < keys.length - 2 && lt > keys[k + 1][0]) k++;
        const [ta, xa, ya] = keys[k], [tb, xb, yb] = keys[k + 1];
        const q = ease.inOutCubic(clamp((lt - ta) / (tb - ta)));
        const mx = lerp(xa, xb, q), my = lerp(ya, yb, q);
        const click = [1.0, 1.8, 2.5].some(c => lt > t0 + c && lt < t0 + c + 0.12);
        ctx.save(); ctx.translate(mx, my); const cs = (W / 520) * (click ? 0.85 : 1); ctx.scale(cs, cs);
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.4;
        const cur = new Path2D('M0 0 L0 17 L4.5 13 L7.5 20 L10.2 18.8 L7.3 12 L13 12 Z');
        ctx.fill(cur); ctx.stroke(cur); ctx.restore();
      }
      ctx.restore();
    }
  };

  // ---------- transitions ----------
  const TRANSITIONS = {
    cut(ctx, A, B) { ctx.drawImage(B, 0, 0); },
    zoom(ctx, A, B, p, W, H) { // punch-in: old frame blows up & blurs out, new settles from 1.2x
      const q = ease.inOutCubic(p);
      ctx.save();
      ctx.translate(W / 2, H / 2); const sb = lerp(1.25, 1, ease.outCubic(p)); ctx.scale(sb, sb); ctx.translate(-W / 2, -H / 2);
      ctx.drawImage(B, 0, 0); ctx.restore();
      ctx.save(); ctx.globalAlpha = 1 - q;
      try { ctx.filter = `blur(${Math.round(q * 14)}px)`; } catch (e) { /* no filter support */ }
      ctx.translate(W / 2, H / 2); const sa = lerp(1, 1.7, q); ctx.scale(sa, sa); ctx.translate(-W / 2, -H / 2);
      ctx.drawImage(A, 0, 0); ctx.restore();
    },
    whip(ctx, A, B, p, W) { // fast horizontal whip-pan with motion smear
      const q = ease.inOutCubic(p), dx = q * W;
      const smear = Math.sin(p * Math.PI);
      for (let k = 0; k < 4; k++) {
        const o = k * smear * W * 0.035;
        ctx.globalAlpha = k === 0 ? 1 : 0.28;
        ctx.drawImage(A, -dx - o, 0);
        ctx.drawImage(B, W - dx - o, 0);
      }
      ctx.globalAlpha = 1;
    },
    pillar(ctx, A, B, p, W, H) { // dark foreground pillar sweeps across and reveals the next shot
      const q = ease.inOutCubic(p);
      ctx.drawImage(q < 0.5 ? A : B, 0, 0);
      const pw = W * 0.9, px = lerp(-pw, W, q);
      const g = ctx.createLinearGradient(px, 0, px + pw, 0);
      g.addColorStop(0, 'rgba(20,12,6,0)'); g.addColorStop(0.18, 'rgba(38,24,14,.96)');
      g.addColorStop(0.5, 'rgba(70,48,30,1)'); g.addColorStop(0.82, 'rgba(30,18,10,.96)'); g.addColorStop(1, 'rgba(20,12,6,0)');
      ctx.fillStyle = g; ctx.fillRect(px, 0, pw, H);
    },
    shatter(ctx, A, B, p, W, H) { // previous frame breaks into shards that fly away
      ctx.drawImage(B, 0, 0);
      const cols = 6, rows = 10, tw = W / cols, th = H / rows, r = rng(3);
      const q = ease.inCubic(p);
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const vx = (i - cols / 2 + 0.5 + (r() - 0.5)) * W * 0.25, vy = (j - rows / 2 + (r() - 0.5)) * H * 0.08 + H * 0.5 * r();
        const rot = (r() - 0.5) * 3, delay = r() * 0.3;
        const k = clamp((q - delay) / (1 - delay));
        if (k >= 1) continue;
        ctx.save();
        ctx.globalAlpha = 1 - k;
        ctx.translate(i * tw + tw / 2 + vx * k, j * th + th / 2 + vy * k);
        ctx.rotate(rot * k); ctx.scale(1 - k * 0.4, 1 - k * 0.4);
        ctx.beginPath(); ctx.rect(-tw / 2 - 0.5, -th / 2 - 0.5, tw + 1, th + 1); ctx.clip();
        ctx.drawImage(A, -(i * tw + tw / 2), -(j * th + th / 2));
        if (k > 0) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.strokeRect(-tw / 2, -th / 2, tw, th); }
        ctx.restore();
      }
    },
    flash(ctx, A, B, p, W, H, opt) { // bright flash cut (optionally coloured)
      ctx.drawImage(p < 0.45 ? A : B, 0, 0);
      ctx.globalAlpha = Math.sin(clamp(p) * Math.PI);
      ctx.fillStyle = (opt && opt.color) || '#fff8e0'; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    },
    slideUp(ctx, A, B, p, W, H) {
      const q = ease.inOutCubic(p);
      ctx.drawImage(A, 0, -q * H); ctx.drawImage(B, 0, H - q * H);
    },
    glow(ctx, A, B, p, W, H) { // green glow bloom into the next shot
      ctx.drawImage(p < 0.5 ? A : B, 0, 0);
      const a = Math.sin(p * Math.PI);
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * 0.8);
      g.addColorStop(0, `rgba(230,255,200,${a})`); g.addColorStop(0.5, `rgba(80,220,60,${a * 0.8})`); g.addColorStop(1, `rgba(10,60,10,${a * 0.6})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  };

  /** Render the full composited frame at time t. */
  Reel.prototype.render = function (t) {
    const ctx = this.ctx, W = this.W, H = this.H;
    t = clamp(t, 0, this.duration - 1e-3);
    const i = this.sceneAt(t), sc = this.scenes[i], lt = t - sc.start;
    const enter = sc.enter && i > 0 ? (typeof sc.enter === 'string' ? { type: sc.enter } : sc.enter) : null;
    const tdur = enter ? (enter.dur || 0.45) : 0;
    ctx.save();
    if (enter && enter.type !== 'cut' && lt < tdur) {
      const prev = this.scenes[i - 1];
      const a = this.bufA.getContext('2d'), b = this.bufB.getContext('2d');
      this.renderScene(a, prev, prev.dur + lt);
      this.renderScene(b, sc, lt);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      (TRANSITIONS[enter.type] || TRANSITIONS.cut)(ctx, this.bufA, this.bufB, lt / tdur, W, H, enter);
    } else {
      this.renderScene(ctx, sc, lt);
    }
    // global vignette for the cinematic look
    const v = cache.vignette || (cache.vignette = (() => {
      const c = offscreen(W, H), g = c.getContext('2d');
      const gr = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.72);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.38)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H); return c;
    })());
    ctx.drawImage(v, 0, 0);
    ctx.restore();
    return i;
  };

  Reel.FX = FX; Reel.TRANSITIONS = TRANSITIONS; Reel.BG = BG; Reel.SPRITES = SPRITES; Reel.STYLES = STYLES; Reel.ease = ease;
  global.Reel = Reel;
  if (typeof module !== 'undefined') module.exports = Reel;
})(typeof window !== 'undefined' ? window : globalThis);
