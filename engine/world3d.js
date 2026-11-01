/*
 * World3D — cinematic, procedural 3D environments behind the reel's text layer.
 *
 * Every scene with a `world` block gets its own THREE.Scene:
 *   world: { env, palette, light, camera: { move, az, el }, props, fx: [...], exposure }
 *
 * Design rules
 *   - Everything is procedural (no model/texture downloads) and a pure function of time,
 *     so Playwright can render any frame deterministically.
 *   - Depth: foreground bokeh (attached to the camera) → hero (middle) → environment + sky + fog.
 *   - The camera frames the hero away from the text band (top / lower) via a view offset.
 *   - Kept light: one shadow-casting light, instancing for repeated objects, small textures.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeIO = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const C = (c) => new THREE.Color(c);
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ---------- palettes (sky top/bottom, fog, key light, accents, ground, hero, text mode) ----------
export const PALETTES = {
  midnight: { sky: ['#03060d', '#16243c'], fog: '#0a1322', key: '#d6e6ff', accent: '#4cc9ff', accent2: '#ffffff', ground: '#0b1320', hero: '#dfe8f6', dark: true, exposure: 1.05 },
  gold: { sky: ['#0d0702', '#3a2309'], fog: '#1b1106', key: '#ffdcaa', accent: '#ffb52e', accent2: '#fff0c4', ground: '#150d05', hero: '#e9b23c', dark: true, exposure: 1.1 },
  dawn: { sky: ['#20183a', '#f3a06c'], fog: '#7a5262', key: '#ffd6ae', accent: '#ff7a45', accent2: '#ffe8c8', ground: '#2a2033', hero: '#f4e7da', dark: true, exposure: 1.0 },
  emerald: { sky: ['#020f0c', '#0c3d31'], fog: '#06201a', key: '#dbfff3', accent: '#25d18b', accent2: '#b8ffe1', ground: '#04130f', hero: '#e0f7ee', dark: true, exposure: 1.05 },
  neon: { sky: ['#04010c', '#1d0c3c'], fog: '#0c0520', key: '#c2b4ff', accent: '#00e5ff', accent2: '#ff3df2', ground: '#06021a', hero: '#e8edff', dark: true, exposure: 1.1 },
  cosmic: { sky: ['#010007', '#170c38'], fog: '#06031a', key: '#cdbdff', accent: '#9d7bff', accent2: '#ffd27a', ground: '#05030f', hero: '#f3eaff', dark: true, exposure: 1.1 },
  crimson: { sky: ['#0b0303', '#3d0d0d'], fog: '#1c0606', key: '#ffd3c4', accent: '#ff3b30', accent2: '#ffd27a', ground: '#130505', hero: '#f2e5dd', dark: true, exposure: 1.05 },
  ocean: { sky: ['#021018', '#0f4a63'], fog: '#06263a', key: '#d8f4ff', accent: '#2fd0ff', accent2: '#ffe08a', ground: '#041722', hero: '#e6f6ff', dark: true, exposure: 1.05 },
  clinical: { sky: ['#cfe1ec', '#f4f8fb'], fog: '#dbe8f0', key: '#ffffff', accent: '#ff4d64', accent2: '#2b9bd6', ground: '#e7eff4', hero: '#ffffff', dark: false, exposure: 0.95 },
  ivory: { sky: ['#d8cbb5', '#f6f0e6'], fog: '#e9dfcf', key: '#fff6e8', accent: '#c8102e', accent2: '#b8860b', ground: '#efe6d8', hero: '#fffaf1', dark: false, exposure: 0.95 },
};

// ---------- shared helpers ----------
const std = (color, o = {}) => new THREE.MeshStandardMaterial({
  color: C(color), metalness: o.metal ?? 0.1, roughness: o.rough ?? 0.6,
  emissive: C(o.emissive || '#000000'), emissiveIntensity: o.ei ?? 1,
  transparent: o.opacity != null, opacity: o.opacity ?? 1, flatShading: !!o.flat, side: o.side ?? THREE.FrontSide,
  depthWrite: o.depthWrite ?? true,
});
const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial({
  color: C(color), metalness: o.metal ?? 0, roughness: o.rough ?? 0.25, clearcoat: o.clearcoat ?? 0.8, clearcoatRoughness: 0.2,
  emissive: C(o.emissive || '#000000'), emissiveIntensity: o.ei ?? 1, transparent: o.opacity != null, opacity: o.opacity ?? 1,
});
const glowMat = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color: C(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

let _glowTex;
function glowTexture() {
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  _glowTex = new THREE.CanvasTexture(c);
  _glowTex.colorSpace = THREE.SRGBColorSpace;
  return _glowTex;
}
function glow(color, size, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: C(color), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity }));
  s.scale.set(size, size, 1);
  return s;
}
/* Text on a texture — Gujarati works because the page's webfonts are already loaded. */
function textTexture(text, { w = 512, h = 128, size = 60, color = '#ffffff', bg = null, weight = 700, radius = 26 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; roundRect(g, 4, 4, w - 8, h - 8, radius); g.fill(); }
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = size;
  do { g.font = `${weight} ${fs}px "Hind Vadodara","Space Grotesk","Noto Sans Gujarati",sans-serif`; fs -= 2; } while (g.measureText(text).width > w - 40 && fs > 14);
  g.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function label(text, pal, scale = 3, o = {}) {
  const tex = textTexture(text, { bg: o.bg ?? 'rgba(10,12,18,.72)', color: o.color ?? '#fff', ...o });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(scale, scale / 4, 1);
  return s;
}
function skyDome(pal) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: C(pal.sky[0]) }, bottom: { value: C(pal.sky[1]) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vP;
      void main(){ float h = vP.y * 0.5 + 0.5; vec3 c = mix(bottom, top, smoothstep(0.42, 0.95, h)); gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  const s = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), m);
  s.renderOrder = -10;
  return s;
}
function points(n, fill, { size = 0.08, color = '#ffffff', opacity = 0.9 } = {}) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) fill(i, pos);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ size, color: C(color), transparent: true, opacity, map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false });
  return new THREE.Points(g, m);
}
// smooth value noise for terrain
function noise2(seed) {
  const r = mulberry(seed); const P = new Float32Array(512); for (let i = 0; i < 512; i++) P[i] = r();
  const at = (x, y) => P[((x * 73856093) ^ (y * 19349663)) & 511];
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}

// ---------- lighting presets ----------
function addLights(scene, pal, preset, R) {
  const L = { studio: [0.75, 2.4, [0.8, 1.4, 0.9]], golden: [0.55, 2.8, [1.2, 0.45, 0.5]], dramatic: [0.22, 3.4, [-0.6, 1.5, 0.25]],
    neon: [0.35, 1.0, [0.2, 1.2, 0.6]], night: [0.35, 1.3, [-0.8, 1.2, 0.4]], cosmic: [0.3, 0.9, [0.5, 1.0, 0.8]], soft: [1.1, 1.6, [0.4, 1.5, 1.0]] }[preset] || [0.7, 2.2, [0.8, 1.4, 0.9]];
  scene.add(new THREE.HemisphereLight(C(pal.key), C(pal.ground), L[0] * 1.6));
  const key = new THREE.DirectionalLight(C(pal.key), L[1]);
  key.position.set(L[2][0] * R, L[2][1] * R, L[2][2] * R);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const sc = key.shadow.camera; sc.left = sc.bottom = -R * 1.1; sc.right = sc.top = R * 1.1; sc.near = 0.5; sc.far = R * 5;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new THREE.DirectionalLight(C(pal.accent), preset === 'neon' ? 2.2 : 0.9);
  rim.position.set(-R, R * 0.5, -R);
  scene.add(rim);
  if (preset === 'neon' || preset === 'cosmic') {
    const a = new THREE.PointLight(C(pal.accent), 4, 0, 0); a.position.set(R * 0.6, R * 0.2, R * 0.2); scene.add(a);
    const b = new THREE.PointLight(C(pal.accent2), 2.5, 0, 0); b.position.set(-R * 0.6, R * 0.1, R * 0.3); scene.add(b);
  }
}

// ---------- environments ----------
// Each returns { focus, R, az, el, moves, update(t, lt) }. `t` = reel time, `lt` = scene time.
const ENVS = {
  /* Premium city: avenue of lit towers converging on a glass hero tower. */
  city({ scene, pal, rng, props }) {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), std(pal.ground, { rough: 0.25, metal: 0.6 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const wc = document.createElement('canvas'); wc.width = 64; wc.height = 128;
    const g = wc.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 64, 128);
    for (let y = 4; y < 128; y += 8) for (let x = 4; x < 64; x += 8) {
      const r = rng(); if (r < 0.55) { g.fillStyle = r < 0.12 ? pal.accent : r < 0.4 ? '#ffe2b0' : '#9fb7d8'; g.fillRect(x, y, 4, 5); }
    }
    const winTex = new THREE.CanvasTexture(wc); winTex.colorSpace = THREE.SRGBColorSpace; winTex.magFilter = THREE.NearestFilter;
    const mat = new THREE.MeshStandardMaterial({ color: C(pal.hero).multiplyScalar(0.18), metalness: 0.7, roughness: 0.32, emissive: C('#ffffff'), emissiveMap: winTex, emissiveIntensity: 0.85 });
    const N = 220; const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, N);
    im.castShadow = true; im.receiveShadow = true;
    const o = new THREE.Object3D(); let k = 0;
    for (let z = -16; z <= 3 && k < N; z++) for (let x = -7; x <= 7 && k < N; x++) {
      if (Math.abs(x) < 1) continue; // the avenue
      const far = clamp((-z) / 16);
      const h = 5 + Math.pow(rng(), 1.6) * (14 + far * 42);
      o.position.set(x * 6 + (rng() - 0.5), h / 2, z * 6 + (rng() - 0.5));
      o.scale.set(3.2 + rng() * 1.6, h, 3.2 + rng() * 1.6); o.updateMatrix(); im.setMatrixAt(k++, o.matrix);
    }
    im.count = k; scene.add(im);
    const hero = new THREE.Mesh(new THREE.BoxGeometry(7, 70, 7), phys(pal.hero, { metal: 0.9, rough: 0.12, clearcoat: 1 }));
    hero.position.set(0, 35, -110); hero.castShadow = true; scene.add(hero);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(hero.geometry), new THREE.LineBasicMaterial({ color: C(pal.accent) }));
    edges.position.copy(hero.position); scene.add(edges);
    const beacon = glow(pal.accent, 14); beacon.position.set(0, 72, -110); scene.add(beacon);
    const cars = points(260, (i, p) => { p[i * 3] = (i % 2 ? 1.4 : -1.4); p[i * 3 + 1] = 0.3; p[i * 3 + 2] = 0; }, { size: 0.9, color: pal.accent2 });
    scene.add(cars);
    const carPhase = Array.from({ length: 260 }, () => rng());
    if (props.sign) { const s = label(props.sign, pal, 16); s.position.set(0, 52, -102); scene.add(s); }
    return {
      focus: new THREE.Vector3(0, 14, -45), R: 52, az: 0.12, el: 0.26, moves: ['crane-up', 'dolly-in', 'fly-over', 'push-tilt'],
      update(t) {
        beacon.material.opacity = 0.6 + 0.4 * Math.sin(t * 3);
        const p = cars.geometry.attributes.position;
        for (let i = 0; i < 260; i++) { const dir = i % 2 ? 1 : -1; p.array[i * 3 + 2] = -110 + ((carPhase[i] * 130 + t * 14 * dir) % 130 + 130) % 130; }
        p.needsUpdate = true;
      },
    };
  },

  /* Wealth: a gold vault door with coins spiralling into it, bullion stacks either side. */
  vault({ scene, pal, rng }) {
    const gold = phys(pal.hero === '#e9b23c' ? pal.hero : '#e2ad3a', { metal: 1, rough: 0.28, clearcoat: 0.6 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), std(pal.ground, { metal: 0.6, rough: 0.3 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    for (let i = 0; i < 3; i++) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(7 - i * 1.2, 7.3 - i * 1.2, 0.4, 64), std(pal.ground, { metal: 0.7, rough: 0.35 }));
      st.position.y = 0.2 + i * 0.4; st.receiveShadow = st.castShadow = true; scene.add(st);
    }
    const door = new THREE.Group(); door.position.set(0, 4.6, -3); scene.add(door);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.7, 64), gold); disc.rotation.x = Math.PI / 2; disc.castShadow = true; door.add(disc);
    [3.0, 2.2].forEach((r) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.12, 12, 64), gold); t.position.z = 0.42; door.add(t); });
    const wheel = new THREE.Group(); wheel.position.z = 0.6; door.add(wheel);
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.6, 0.16), gold); s.rotation.z = (i / 6) * Math.PI; wheel.add(s); }
    wheel.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), gold));
    const halo = glow(pal.accent, 16, 0.5); halo.position.set(0, 4.6, -3.6); scene.add(halo);
    const N = 150; const coins = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.36, 0.36, 0.07, 28), gold, N); coins.castShadow = true; scene.add(coins);
    const ph = Array.from({ length: N }, () => rng());
    const bar = new THREE.BoxGeometry(1.3, 0.45, 0.62);
    [-5.2, 5.2].forEach((x) => {
      for (let row = 0; row < 4; row++) for (let i = 0; i < 4 - row; i++) {
        const b = new THREE.Mesh(bar, gold); b.position.set(x + (i - (3 - row) / 2) * 1.35, 1.45 + row * 0.46, 0.8); b.castShadow = true; scene.add(b);
      }
    });
    const o = new THREE.Object3D();
    return {
      focus: new THREE.Vector3(0, 3.6, -1), R: 21, az: 0.2, el: 0.16, moves: ['dolly-in', 'orbit-left', 'push-tilt', 'crane-down'],
      update(t) {
        wheel.rotation.z = t * 0.5;
        for (let i = 0; i < N; i++) {
          const u = (ph[i] + t * 0.12) % 1;
          const a = ph[i] * TAU + u * 7;
          const r = 7 * (1 - u) + 0.4;
          o.position.set(Math.cos(a) * r, 4.6 + (1 - u) * 9 * (0.6 + ph[i] * 0.6), -3 + Math.sin(a) * r * 0.6 + 0.6);
          o.rotation.set(t * 3 + ph[i] * 9, t * 2, ph[i] * 6);
          const s = u > 0.94 ? (1 - u) / 0.06 : 1; o.scale.setScalar(s);
          o.updateMatrix(); coins.setMatrixAt(i, o.matrix);
        }
        coins.instanceMatrix.needsUpdate = true;
        halo.material.opacity = 0.45 + 0.15 * Math.sin(t * 2);
      },
    };
  },

  /* Money management: income channels flowing as glowing particles into one secure core. */
  flow({ scene, pal, rng, props }) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), std(pal.ground, { metal: 0.5, rough: 0.4 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const core = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 3.2), phys(pal.ground, { metal: 0.9, rough: 0.2 }));
    core.position.y = 1.6; core.castShadow = true; scene.add(core);
    const cEdges = new THREE.LineSegments(new THREE.EdgesGeometry(core.geometry), new THREE.LineBasicMaterial({ color: C(pal.accent) }));
    cEdges.position.copy(core.position); scene.add(cEdges);
    const lock = glow(pal.accent, 7, 0.8); lock.position.set(0, 1.8, 1.8); scene.add(lock);
    const names = props.sources || ['Income', 'Savings', 'Invest', 'Business', 'Salary'];
    const curves = names.map((n, i) => {
      const a = -1.1 + (i / Math.max(1, names.length - 1)) * 2.2;
      const start = new THREE.Vector3(Math.sin(a) * 15, 3 + rng() * 5, -Math.cos(a) * 15 + 2);
      const mid = start.clone().multiplyScalar(0.5); mid.y += 4;
      const curve = new THREE.CatmullRomCurve3([start, mid, new THREE.Vector3(0, 1.8, 0)]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.22, 10), std(pal.accent, { emissive: pal.accent, ei: 0.25, opacity: 0.28, depthWrite: false }));
      scene.add(tube);
      const src = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, start.y, 24), std(pal.hero, { metal: 0.4, rough: 0.4 }));
      src.position.set(start.x, start.y / 2, start.z); src.castShadow = true; scene.add(src);
      const lb = label(n, pal, 4.4); lb.position.set(start.x, start.y + 1.3, start.z); scene.add(lb);
      return curve;
    });
    const per = 26; const N = per * curves.length;
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 12, 8), glowMat(pal.accent2), N); scene.add(dots);
    const o = new THREE.Object3D();
    return {
      focus: new THREE.Vector3(0, 3, -3), R: 22, az: 0, el: 0.32, moves: ['orbit-right', 'crane-up', 'dolly-out', 'pan-left'],
      update(t) {
        let k = 0;
        curves.forEach((c, ci) => { for (let j = 0; j < per; j++) { const u = (j / per + t * 0.22 + ci * 0.07) % 1; o.position.copy(c.getPointAt(u)); o.scale.setScalar(0.6 + u * 0.8); o.updateMatrix(); dots.setMatrixAt(k++, o.matrix); } });
        dots.instanceMatrix.needsUpdate = true;
        lock.material.opacity = 0.6 + 0.3 * Math.sin(t * 4);
      },
    };
  },

  /* Discipline: endless stairs to a glowing portal, a figure climbing one step at a time. */
  staircase({ scene, pal }) {
    const N = 30, H = 0.55, D = 1.25;
    const stepMat = std(pal.hero, { rough: 0.5, metal: 0.1 });
    const stripMat = glowMat(pal.accent, 0.9);
    for (let i = 0; i < N; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(4, H, D), stepMat); s.position.set(0, i * H + H / 2, -i * D);
      s.castShadow = s.receiveShadow = true; scene.add(s);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(4, 0.035, 0.035), stripMat); strip.position.set(0, i * H + H, -i * D + D / 2); scene.add(strip);
    }
    const under = new THREE.Mesh(new THREE.BoxGeometry(4, N * H, N * D), std(pal.ground, { rough: 0.8 }));
    under.position.set(0, -N * H / 2 + 0.01, -N * D / 2); scene.add(under);
    const top = new THREE.Vector3(0, N * H + 2.4, -N * D - 1);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.1, 16, 96), glowMat(pal.accent2)); ring.position.copy(top); scene.add(ring);
    const portal = glow(pal.accent2, 13, 0.95); portal.position.copy(top); scene.add(portal);
    const shaft = new THREE.Mesh(new THREE.ConeGeometry(6, 26, 48, 1, true), new THREE.MeshBasicMaterial({ color: C(pal.accent2), transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    shaft.position.set(0, top.y - 8, top.z + 4); shaft.rotation.x = -0.5; scene.add(shaft);
    for (let i = 0; i < 10; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 30, 1.2), std(pal.ground, { rough: 0.7 }));
      p.position.set(i % 2 ? 9 : -9, 8, -i * 4 - 2); p.castShadow = true; scene.add(p);
    }
    const fig = new THREE.Group(); scene.add(fig);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.55, 6, 12), std(pal.accent, { rough: 0.4 })); body.position.y = 0.55; body.castShadow = true; fig.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), std(pal.hero, { rough: 0.5 })); head.position.y = 1.08; head.castShadow = true; fig.add(head);
    const aura = glow(pal.accent, 1.6, 0.5); aura.position.y = 0.7; fig.add(aura);
    return {
      focus: new THREE.Vector3(0, 6, -10), R: 17, az: 0.55, el: 0.2, moves: ['crane-up', 'push-tilt', 'orbit-left', 'dolly-in'],
      update(t, lt) {
        const sp = 2.2; const k = lt * sp; const i = Math.floor(k) + 3; const f = k - Math.floor(k);
        const hop = Math.sin(clamp(f / 0.6) * Math.PI) * 0.35;
        const s = Math.min(i + clamp(f / 0.6), N - 1);
        fig.position.set(0, s * H + H + hop, -s * D);
        ring.rotation.z = t * 0.4; portal.material.opacity = 0.8 + 0.2 * Math.sin(t * 2.5);
      },
    };
  },

  /* Ambition: stylised mountain range at golden hour, a flag on the summit. */
  mountains({ scene, pal, rng }) {
    const n = noise2(Math.floor(rng() * 1e6));
    const geo = new THREE.PlaneGeometry(320, 320, 150, 150); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position; const cols = new Float32Array(pos.count * 3);
    const low = C(pal.ground), rock = C('#5a5560').lerp(C(pal.sky[1]), 0.25), snow = C('#f4f6fa');
    let peakY = 0, maxY = 0;
    const peaks = [[0, -70, 46, 900, 1400], [-62, -120, 34, 700, 900], [70, -130, 38, 800, 1000], [-110, -60, 18, 600, 600], [120, -70, 22, 700, 600]];
    const hs = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      let h = 0, amp = 1, fr = 0.018;
      for (let o = 0; o < 5; o++) { h += (n(x * fr + 50, z * fr + 50) - 0.5) * amp; amp *= 0.5; fr *= 2.1; }
      let peak = 0; for (const [px, pz, ph, sx, sz] of peaks) peak = Math.max(peak, ph * Math.exp(-(((x - px) * (x - px)) / sx + ((z - pz) * (z - pz)) / sz)));
      const valley = Math.max(0, 1 - Math.abs(x) / 30) * Math.max(0, (z + 20) / 140);
      const near = clamp((60 - z) / 90); // flatten the foreground so it never walls off the camera
      const y = (h * 22 + peak - valley * 10 + Math.max(0, -z - 20) * 0.1) * (0.25 + 0.75 * near);
      hs[i] = y; pos.setY(i, y); maxY = Math.max(maxY, y);
      if (Math.abs(x) < 3 && Math.abs(z + 70) < 3) peakY = Math.max(peakY, y);
    }
    const grass = C(pal.ground).lerp(C('#3b3a2c'), 0.5);
    for (let i = 0; i < pos.count; i++) {
      const u = hs[i] / maxY; // 0 valley … 1 highest summit
      const c = u > 0.72 ? rock.clone().lerp(snow, clamp((u - 0.72) / 0.12)) : u > 0.3 ? grass.clone().lerp(rock, (u - 0.3) / 0.42) : low.clone().lerp(grass, clamp(u / 0.3));
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }));
    land.receiveShadow = land.castShadow = true; scene.add(land);
    const sun = glow(pal.accent2, 90, 0.9); sun.position.set(-40, 50, -260); scene.add(sun);
    const sun2 = glow(pal.accent, 160, 0.35); sun2.position.copy(sun.position); scene.add(sun2);
    const clouds = Array.from({ length: 14 }, (_, i) => { const c = glow(i % 3 ? '#ffffff' : pal.accent2, 30 + rng() * 40, 0.12); c.position.set((rng() - 0.5) * 220, 18 + rng() * 26, -40 - rng() * 160); scene.add(c); return c; });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 8), std('#dddddd')); pole.position.set(0, peakY + 2, -70); scene.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4, 8, 2), std(pal.accent, { side: THREE.DoubleSide, emissive: pal.accent, ei: 0.3 })); flag.position.set(1.2, peakY + 3.2, -70); scene.add(flag);
    const fpos = flag.geometry.attributes.position; const base = fpos.array.slice();
    return {
      focus: new THREE.Vector3(0, peakY * 0.6, -60), R: 120, az: 0, el: 0.2, moves: ['fly-over', 'crane-up', 'dolly-in', 'orbit-right'],
      update(t) {
        clouds.forEach((c, i) => { c.position.x += 0; c.position.x = ((c.position.x + 110 + t * (1 + i % 3)) % 220) - 110; });
        for (let i = 0; i < fpos.count; i++) { const x = base[i * 3]; fpos.setZ(i, Math.sin(t * 6 + x * 2.5) * 0.18 * (x + 1.2) / 2.4); }
        fpos.needsUpdate = true;
      },
    };
  },

  /* Spiritual / vision: starfield, nebula, glowing planet and a floating temple. */
  cosmos({ scene, pal, rng, props }) {
    scene.add(points(2600, (i, p) => { const v = new THREE.Vector3().randomDirection().multiplyScalar(140 + rng() * 200); p.set([v.x, v.y, v.z], i * 3); }, { size: 1.1, color: '#ffffff', opacity: 0.85 }));
    for (let i = 0; i < 7; i++) { const s = glow(i % 2 ? pal.accent : pal.accent2, 60 + rng() * 70, 0.12 + rng() * 0.1); s.position.set((rng() - 0.5) * 160, (rng() - 0.2) * 70, -90 - rng() * 80); scene.add(s); }
    const planet = new THREE.Mesh(new THREE.SphereGeometry(9, 64, 32), std(pal.accent, { rough: 0.8, emissive: pal.accent, ei: 0.12 }));
    planet.position.set(14, 6, -40); scene.add(planet);
    const atm = glow(pal.accent, 30, 0.45); atm.position.copy(planet.position); scene.add(atm);
    const ring = new THREE.Mesh(new THREE.RingGeometry(12, 16, 96), new THREE.MeshBasicMaterial({ color: C(pal.accent2), transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
    ring.position.copy(planet.position); ring.rotation.x = 1.25; scene.add(ring);
    const temple = new THREE.Group(); scene.add(temple);
    const stone = std(pal.hero, { rough: 0.55, metal: 0.15 }), trim = glowMat(pal.accent2, 0.9);
    [[4.2, 0.5], [3.5, 0.45], [2.9, 0.4]].forEach(([r, h], i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.15, h, 48), stone); m.position.y = -1.6 + i * 0.45; m.castShadow = m.receiveShadow = true; temple.add(m); });
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 2.8, 12), stone); c.position.set(Math.cos(a) * 2.3, 0.4, Math.sin(a) * 2.3); c.castShadow = true; temple.add(c); }
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.3, 48), stone); roof.position.y = 1.95; temple.add(roof);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2, 48, 24, 0, TAU, 0, Math.PI / 2), stone); dome.position.y = 2.1; dome.castShadow = true; temple.add(dome);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.6, 16), trim); spire.position.y = 4.8; temple.add(spire);
    const band = new THREE.Mesh(new THREE.TorusGeometry(2.85, 0.05, 8, 96), trim); band.rotation.x = Math.PI / 2; band.position.y = 2.1; temple.add(band);
    const inner = glow(pal.accent2, 5, 0.9); inner.position.y = 0.4; temple.add(inner);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.6, 40, 32, 1, true), new THREE.MeshBasicMaterial({ color: C(pal.accent2), transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 22; temple.add(beam);
    temple.visible = props.temple !== false;
    let wishes = null;
    if (!temple.visible) {
      planet.scale.setScalar(0.6); planet.position.set(7, 7, -30); atm.position.copy(planet.position); atm.scale.setScalar(18); ring.position.copy(planet.position); ring.scale.setScalar(0.6);
      wishes = Array.from({ length: 26 }, (_, i) => { const g = glow(i % 3 ? pal.accent2 : pal.accent, 0.6 + rng() * 1.2, 0.85); scene.add(g); return { g, x: (rng() - 0.5) * 9, z: (rng() - 0.5) * 6, ph: rng() }; });
      const path = new THREE.Mesh(new THREE.PlaneGeometry(3, 60), new THREE.MeshBasicMaterial({ color: C(pal.accent2), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
      path.rotation.x = -Math.PI / 2 + 0.25; path.position.set(0, -2, -22); scene.add(path);
    }
    const orbit = points(220, (i, p) => { const a = (i / 220) * TAU; p.set([Math.cos(a) * 6, Math.sin(a * 3) * 0.4, Math.sin(a) * 6], i * 3); }, { size: 0.22, color: pal.accent2 });
    scene.add(orbit);
    return {
      focus: new THREE.Vector3(0, 1.2, 0), R: 21, az: -0.3, el: 0.14, moves: ['orbit-left', 'dolly-in', 'crane-up', 'spiral'],
      update(t) {
        temple.position.y = Math.sin(t * 0.8) * 0.3; temple.rotation.y = t * 0.08;
        orbit.rotation.y = -t * 0.25; orbit.position.y = temple.position.y + 0.5;
        planet.rotation.y = t * 0.05; inner.material.opacity = 0.75 + 0.25 * Math.sin(t * 2);
        if (wishes) wishes.forEach((w) => { const u = (w.ph + t * 0.08) % 1; w.g.position.set(w.x * (1 - u * 0.5), -3 + u * 12, w.z - u * 10); w.g.material.opacity = Math.sin(u * Math.PI) * 0.9; });
      },
    };
  },

  /* Technology: neon grid, a wireframe AI core and floating holographic panels. */
  grid({ scene, pal, rng, props }) {
    const gm = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { col: { value: C(pal.accent) }, time: { value: 0 } },
      vertexShader: 'varying vec2 vU; varying float vD; void main(){ vU = position.xy; vec4 mv = modelViewMatrix * vec4(position,1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: `uniform vec3 col; uniform float time; varying vec2 vU; varying float vD;
        void main(){ vec2 g = abs(fract((vU + vec2(0.0, time)) / 2.0 - 0.5) - 0.5) / fwidth(vU / 2.0);
          float l = 1.0 - min(min(g.x, g.y), 1.0); float fade = exp(-vD * 0.022);
          gl_FragColor = vec4(col * (0.35 + l * 1.4), (l * 0.85 + 0.04) * fade);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), gm); floor.rotation.x = -Math.PI / 2; scene.add(floor);
    const base = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), std(pal.ground, { metal: 0.6, rough: 0.35 })); base.rotation.x = -Math.PI / 2; base.position.y = -0.02; base.receiveShadow = true; scene.add(base);
    const core = new THREE.Group(); core.position.y = 3; scene.add(core);
    core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 1), new THREE.MeshBasicMaterial({ color: C(pal.accent), wireframe: true })));
    const innerS = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 3), phys(pal.accent2, { emissive: pal.accent2, ei: 0.8 })); core.add(innerS);
    const cg = glow(pal.accent, 9, 0.7); core.add(cg);
    const rings = [0, 1, 2].map((i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(2.7 + i * 0.5, 0.03, 8, 128), glowMat(i === 1 ? pal.accent2 : pal.accent, 0.9)); core.add(r); return r; });
    const words = props.words || ['AI', 'DATA', 'AUTO', 'API', '24×7', 'CLOUD'];
    const panels = words.slice(0, 6).map((w, i) => {
      const c = document.createElement('canvas'); c.width = 384; c.height = 256; const g = c.getContext('2d');
      g.fillStyle = 'rgba(10,20,40,0.55)'; roundRect(g, 4, 4, 376, 248, 22); g.fill(); g.strokeStyle = pal.accent; g.lineWidth = 4; g.stroke();
      g.fillStyle = pal.accent; for (let b = 0; b < 7; b++) { const h = 30 + rng() * 110; g.fillRect(26 + b * 22, 220 - h, 14, h); }
      g.strokeStyle = pal.accent2; g.lineWidth = 4; g.beginPath(); for (let x = 0; x < 8; x++) g.lineTo(196 + x * 24, 190 - rng() * 120); g.stroke();
      g.fillStyle = '#fff'; g.font = '700 46px "Hind Vadodara","Space Grotesk",sans-serif'; g.fillText(w, 26, 62);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      const a = -1.2 + (i / 5) * 2.4; m.position.set(Math.sin(a) * 6.5, 2.2 + (i % 2) * 2.3, -Math.cos(a) * 6.5 + 1.5); m.lookAt(0, m.position.y, 6);
      scene.add(m); return { m, y: m.position.y, ph: rng() * TAU };
    });
    const rain = points(500, (i, p) => p.set([(rng() - 0.5) * 50, rng() * 20, -rng() * 50], i * 3), { size: 0.18, color: pal.accent, opacity: 0.7 });
    scene.add(rain); const rph = Array.from({ length: 500 }, () => rng());
    return {
      focus: new THREE.Vector3(0, 3.2, 0), R: 14, az: 0, el: 0.14, moves: ['orbit-right', 'dolly-in', 'pan-left', 'spiral'],
      update(t) {
        gm.uniforms.time.value = t * 1.5;
        core.rotation.y = t * 0.4; innerS.rotation.x = t * 0.7;
        rings.forEach((r, i) => { r.rotation.x = t * (0.3 + i * 0.2) + i; r.rotation.y = t * (0.2 + i * 0.15); });
        panels.forEach((p) => { p.m.position.y = p.y + Math.sin(t * 1.2 + p.ph) * 0.25; });
        const pa = rain.geometry.attributes.position; for (let i = 0; i < 500; i++) pa.array[i * 3 + 1] = (rph[i] * 20 + t * 2.2 * (0.5 + rph[i])) % 20; pa.needsUpdate = true;
      },
    };
  },

  /* Health: DNA helix, molecules and drifting cells in soft clinical light. */
  molecule({ scene, pal, rng }) {
    const helix = new THREE.Group(); helix.position.set(-2.6, 0, -1); scene.add(helix);
    const a1 = phys(pal.accent, { clearcoat: 1 }), a2 = phys(pal.accent2, { clearcoat: 1 }), bond = std(pal.hero, { rough: 0.3 });
    for (let i = 0; i < 36; i++) {
      const y = (i - 18) * 0.42, a = i * 0.48;
      const p1 = new THREE.Vector3(Math.cos(a) * 1.3, y, Math.sin(a) * 1.3), p2 = p1.clone().multiply(new THREE.Vector3(-1, 1, -1));
      const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), a1); s1.position.copy(p1); s1.castShadow = true; helix.add(s1);
      const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), a2); s2.position.copy(p2); s2.castShadow = true; helix.add(s2);
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.6, 8), bond); r.position.y = y; r.rotation.set(0, -a, Math.PI / 2); helix.add(r);
    }
    const mols = [];
    for (let m = 0; m < 3; m++) {
      const g = new THREE.Group(); g.position.set(2.2 + m * 1.4, (m - 1) * 3, -m * 3); scene.add(g);
      const atoms = [new THREE.Vector3()];
      for (let i = 1; i < 6; i++) atoms.push(atoms[Math.floor(rng() * i)].clone().add(new THREE.Vector3().randomDirection().multiplyScalar(1)));
      atoms.forEach((p, i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(i ? 0.32 : 0.48, 24, 16), i % 2 ? a2 : a1); s.position.copy(p); s.castShadow = true; g.add(s); });
      for (let i = 1; i < atoms.length; i++) {
        let j = 0, best = 1e9; for (let k = 0; k < i; k++) { const d = atoms[i].distanceTo(atoms[k]); if (d < best) { best = d; j = k; } }
        const mid = atoms[i].clone().add(atoms[j]).multiplyScalar(0.5);
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, best, 8), bond); c.position.copy(mid);
        c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), atoms[i].clone().sub(atoms[j]).normalize()); g.add(c);
      }
      mols.push({ g, ph: rng() * TAU });
    }
    const cells = Array.from({ length: 12 }, () => {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.6 + rng() * 1.2, 32, 16), phys(pal.accent, { opacity: 0.22, clearcoat: 1, rough: 0.1 }));
      c.add(new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), std(pal.accent, { emissive: pal.accent, ei: 0.4 })));
      c.position.set((rng() - 0.5) * 26, (rng() - 0.5) * 14, -8 - rng() * 14); scene.add(c); return { c, ph: rng() * TAU };
    });
    return {
      focus: new THREE.Vector3(0, 0, -1), R: 12, az: 0.2, el: 0.08, moves: ['orbit-left', 'dolly-in', 'crane-down', 'pan-right'],
      update(t) {
        helix.rotation.y = t * 0.5;
        mols.forEach((m) => { m.g.rotation.set(t * 0.3 + m.ph, t * 0.4, 0); m.g.position.y += Math.sin(t + m.ph) * 0.004; });
        cells.forEach((c) => { c.c.position.y += Math.sin(t * 0.6 + c.ph) * 0.006; c.c.rotation.y = t * 0.2; });
      },
    };
  },

  /* Communication: a dotted globe, glowing people-nodes, message pulses and floating phones. */
  network({ scene, pal, rng, props }) {
    const globe = new THREE.Group(); scene.add(globe);
    globe.add(new THREE.Mesh(new THREE.SphereGeometry(3.9, 48, 32), std(pal.ground, { rough: 0.5, metal: 0.4, emissive: pal.accent, ei: 0.06 })));
    const halo = glow(pal.accent, 13, 0.35); globe.add(halo);
    const N = 900; const pts = points(N, (i, p) => { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996; p.set([Math.cos(a) * r * 4, y * 4, Math.sin(a) * r * 4], i * 3); }, { size: 0.09, color: pal.accent, opacity: 0.8 });
    globe.add(pts);
    const nodes = Array.from({ length: 14 }, () => { const v = new THREE.Vector3().randomDirection().multiplyScalar(4.05); const g = glow(pal.accent2, 0.9); g.position.copy(v); globe.add(g); return v; });
    const arcs = Array.from({ length: 12 }, (_, i) => {
      const a = nodes[i], b = nodes[(i * 5 + 3) % nodes.length];
      const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(4 + a.distanceTo(b) * 0.55);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)), new THREE.LineBasicMaterial({ color: C(pal.accent), transparent: true, opacity: 0.55 }));
      globe.add(line);
      const pulse = glow(pal.accent2, 0.7); globe.add(pulse);
      return { curve, pulse, ph: rng() };
    });
    const msgs = props.messages || ['Hi 👋', 'Order confirmed ✅', 'Offer 🎁'];
    const shape = new THREE.Shape(); const w = 1.6, h = 3.2, r = 0.28;
    shape.moveTo(-w / 2 + r, -h / 2); shape.lineTo(w / 2 - r, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); shape.lineTo(w / 2, h / 2 - r); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2); shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); shape.lineTo(-w / 2, -h / 2 + r); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3 });
    const phones = [0, 1, 2].map((i) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, phys('#111216', { metal: 0.6, rough: 0.3 })); body.castShadow = true; g.add(body);
      const c = document.createElement('canvas'); c.width = 256; c.height = 512; const x = c.getContext('2d');
      x.fillStyle = '#ece5dc'; x.fillRect(0, 0, 256, 512); x.fillStyle = '#0f6e5f'; x.fillRect(0, 0, 256, 70);
      x.fillStyle = '#fff'; x.font = '600 24px "Hind Vadodara","Space Grotesk",sans-serif'; x.fillText(props.name || 'Business', 20, 46);
      [msgs[i % msgs.length], msgs[(i + 1) % msgs.length]].forEach((m, k) => {
        const out = k % 2 === 1; x.fillStyle = out ? '#d6f8cc' : '#ffffff';
        const bw = 200, by = 120 + k * 110; roundRect(x, out ? 46 : 10, by, bw, 74, 16); x.fill();
        x.fillStyle = '#141414'; x.font = '600 26px "Hind Vadodara","Space Grotesk",sans-serif'; x.fillText(m, (out ? 46 : 10) + 16, by + 46, bw - 30);
      });
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 2.95), new THREE.MeshBasicMaterial({ map: tex })); scr.position.z = 0.215; g.add(scr);
      const a = -1.25 + i * 1.25; g.position.set(Math.sin(a) * 6.6, -0.8 + i * 1.3, Math.cos(a) * 2.2 + 1.5); g.scale.setScalar(0.85);
      scene.add(g); return { g, a, ph: rng() * TAU };
    });
    return {
      focus: new THREE.Vector3(0, 0.3, 0), R: 14, az: 0, el: 0.1, moves: ['orbit-right', 'dolly-in', 'spiral', 'crane-up'],
      update(t) {
        globe.rotation.y = t * 0.12;
        arcs.forEach((a) => { a.pulse.position.copy(a.curve.getPoint((a.ph + t * 0.35) % 1)); });
        phones.forEach((p) => { p.g.position.y = -0.8 + phones.indexOf(p) * 1.3 + Math.sin(t + p.ph) * 0.25; p.g.rotation.set(Math.sin(t * 0.7 + p.ph) * 0.08, -p.a * 0.5 + Math.sin(t * 0.5) * 0.1, 0); });
      },
    };
  },

  /* Hero on a podium under spotlights: trophy, gift, chart, rocket, shield, lock, bulb, key. */
  stage({ scene, pal, rng, props }) {
    const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), std(pal.ground, { metal: 0.65, rough: 0.22 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.8, 64), phys(C(pal.ground).lerp(C('#2a2a30'), 0.5).getStyle(), { metal: 0.6, rough: 0.28 }));
    pod.position.y = 0.4; pod.castShadow = pod.receiveShadow = true; scene.add(pod);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.72, 0.04, 8, 128), glowMat(pal.accent)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.8; scene.add(rim);
    for (let i = 0; i < 22; i++) {
      const a = -1.3 + (i / 21) * 2.6; const h = 6 + rng() * 10;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, h, 0.18), glowMat(i % 4 ? pal.accent : pal.accent2, 0.25 + rng() * 0.4));
      b.position.set(Math.sin(a) * 16, h / 2, -Math.cos(a) * 16); scene.add(b);
    }
    [-3, 3].forEach((x) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6, 12, 40, 1, true), new THREE.MeshBasicMaterial({ color: C(pal.key), transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      cone.position.set(x * 0.5, 6.5, 0); cone.rotation.z = x > 0 ? 0.25 : -0.25; scene.add(cone);
    });
    const hero = HEROES[props.hero] ? HEROES[props.hero](pal) : HEROES.trophy(pal);
    hero.position.y = 0.8; hero.traverse((m) => { if (m.isMesh) m.castShadow = true; }); scene.add(hero);
    const sparkle = points(160, (i, p) => p.set([(rng() - 0.5) * 7, rng() * 6, (rng() - 0.5) * 7], i * 3), { size: 0.12, color: pal.accent2 });
    scene.add(sparkle); const sph = Array.from({ length: 160 }, () => rng());
    return {
      focus: new THREE.Vector3(0, 2.4, 0), R: 9.5, az: 0.35, el: 0.14, moves: ['orbit-left', 'push-tilt', 'dolly-in', 'crane-down'],
      update(t, lt) {
        hero.rotation.y = t * 0.45; hero.position.y = 0.85 + Math.sin(t * 1.4) * 0.08;
        if (hero.userData.update) hero.userData.update(t, lt);
        const pa = sparkle.geometry.attributes.position; for (let i = 0; i < 160; i++) pa.array[i * 3 + 1] = (sph[i] * 6 + t * 0.6) % 6; pa.needsUpdate = true;
      },
    };
  },
};

const HEROES = {
  trophy(pal) {
    const g = new THREE.Group(); const gold = phys('#e3b341', { metal: 1, rough: 0.22 });
    const prof = [[0, 0], [0.9, 0], [0.9, 0.25], [0.35, 0.35], [0.22, 1.2], [0.5, 1.45], [1.05, 2.0], [1.15, 2.9], [1.05, 2.95], [0.9, 2.2], [0, 2.0]].map(([x, y]) => new THREE.Vector2(x, y));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 64), gold));
    [-1, 1].forEach((s) => { const h = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 12, 32, Math.PI), gold); h.position.set(s * 1.15, 2.35, 0); h.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(h); });
    const star = glow(pal.accent2, 2.4, 0.8); star.position.y = 3.4; g.add(star);
    return g;
  },
  gift(pal) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 2.2), phys(pal.accent, { rough: 0.35 })); box.position.y = 0.9; g.add(box);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 2.4), phys(pal.accent, { rough: 0.35 })); lid.position.y = 2.0; g.add(lid);
    const rib = phys(pal.accent2, { metal: 0.6, rough: 0.3 });
    [[0.35, 2.3, 2.45], [2.45, 2.3, 0.35]].forEach(([x, y, z]) => { const r = new THREE.Mesh(new THREE.BoxGeometry(x, y, z), rib); r.position.y = 1.1; g.add(r); });
    [-1, 1].forEach((s) => { const b = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 12, 32), rib); b.position.set(s * 0.42, 2.55, 0); b.rotation.y = Math.PI / 2; b.rotation.x = s * 0.5; g.add(b); });
    g.userData.update = (t) => { lid.position.y = 2.0 + Math.max(0, Math.sin(t * 1.3)) * 0.35; };
    return g;
  },
  chart(pal) {
    const g = new THREE.Group(); const vals = [0.35, 0.5, 0.45, 0.7, 0.85, 1];
    const bars = vals.map((v, i) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1, 0.45), phys(i === vals.length - 1 ? pal.accent : pal.hero, { rough: 0.3 })); b.position.x = (i - 2.5) * 0.62; g.add(b); return { b, v }; });
    const pts = vals.map((v, i) => new THREE.Vector3((i - 2.5) * 0.62, v * 3.2 + 0.4, 0.4));
    const curve = new THREE.CatmullRomCurve3(pts); const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.06, 8), glowMat(pal.accent)); g.add(tube);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 16), glowMat(pal.accent)); head.position.copy(pts[pts.length - 1]).add(new THREE.Vector3(0.12, 0.2, 0)); head.rotation.z = -0.6; g.add(head);
    g.userData.update = (t, lt) => { const p = easeIO(clamp(lt / 1.6)); bars.forEach(({ b, v }) => { b.scale.y = Math.max(0.01, v * 3.2 * p); b.position.y = (v * 3.2 * p) / 2; }); tube.scale.y = p; head.visible = p > 0.95; };
    return g;
  },
  rocket(pal) {
    const g = new THREE.Group();
    const prof = [[0, 0], [0.55, 0.1], [0.65, 1.6], [0.5, 2.5], [0.25, 3.0], [0, 3.2]].map(([x, y]) => new THREE.Vector2(x, y));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), phys(pal.hero, { metal: 0.5, rough: 0.25 })));
    const win = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), phys(pal.accent2, { emissive: pal.accent2, ei: 0.5 })); win.position.set(0, 2.0, 0.55); g.add(win);
    for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.6), phys(pal.accent)); const a = (i / 3) * TAU; f.position.set(Math.cos(a) * 0.62, 0.4, Math.sin(a) * 0.62); f.rotation.y = -a; g.add(f); }
    const flame = glow(pal.accent, 2.2, 0.9); flame.position.y = -0.4; g.add(flame);
    g.userData.update = (t) => { flame.scale.setScalar(1.8 + Math.sin(t * 25) * 0.4); g.position.y = 0.85 + Math.sin(t * 2) * 0.2; };
    return g;
  },
  shield(pal) {
    const g = new THREE.Group(); const s = new THREE.Shape();
    s.moveTo(0, 2.6); s.quadraticCurveTo(1.0, 2.2, 1.6, 2.3); s.quadraticCurveTo(1.6, 0.6, 0, -0.2); s.quadraticCurveTo(-1.6, 0.6, -1.6, 2.3); s.quadraticCurveTo(-1.0, 2.2, 0, 2.6);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 4 }), phys(pal.accent, { metal: 0.4, rough: 0.25 }));
    m.position.set(0, 0.4, -0.2); g.add(m);
    const ck = new THREE.Shape(); ck.moveTo(-0.7, 1.3); ck.lineTo(-0.2, 0.8); ck.lineTo(0.75, 1.9); ck.lineTo(0.55, 2.05); ck.lineTo(-0.2, 1.15); ck.lineTo(-0.52, 1.45);
    const c = new THREE.Mesh(new THREE.ExtrudeGeometry(ck, { depth: 0.18, bevelEnabled: false }), phys('#ffffff', { emissive: '#ffffff', ei: 0.4 })); c.position.set(0, 0.35, 0.32); g.add(c);
    const h = glow(pal.accent, 6, 0.4); h.position.set(0, 1.6, -0.6); g.add(h);
    return g;
  },
  lock(pal) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 0.8), phys(pal.accent2 === '#ffffff' ? '#e3b341' : pal.accent2, { metal: 0.9, rough: 0.25 })); body.position.y = 0.9; g.add(body);
    const sh = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.14, 16, 48, Math.PI), phys('#cfd3da', { metal: 1, rough: 0.2 })); sh.position.y = 1.7; g.add(sh);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 16), std('#111')); hole.rotation.x = Math.PI / 2; hole.position.set(0, 0.95, 0.42); g.add(hole);
    g.userData.update = (t, lt) => { sh.position.y = 1.7 + Math.max(0, 0.45 - lt * 0.5); };
    return g;
  },
  bulb(pal) {
    const g = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.SphereGeometry(1.1, 48, 32), phys('#ffffff', { opacity: 0.35, rough: 0.05, clearcoat: 1 })); glass.position.y = 2.2; g.add(glass);
    const fil = new THREE.Mesh(new THREE.TorusKnotGeometry(0.3, 0.04, 64, 8, 2, 5), glowMat(pal.accent2)); fil.position.y = 2.2; g.add(fil);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 0.9, 32), phys('#9aa0a8', { metal: 1, rough: 0.3 })); base.position.y = 0.85; g.add(base);
    const halo = glow(pal.accent2, 5, 0.7); halo.position.y = 2.2; g.add(halo);
    g.userData.update = (t) => { halo.material.opacity = 0.55 + 0.35 * Math.abs(Math.sin(t * 2)); };
    return g;
  },
  key(pal) {
    const g = new THREE.Group(); const m = phys('#e3b341', { metal: 1, rough: 0.22 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.18, 16, 48), m); ring.position.y = 3; g.add(ring);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 2.4, 16), m); shaft.position.y = 1.2; g.add(shaft);
    [0.3, 0.75].forEach((y) => { const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.18), m); tooth.position.set(0.3, y, 0); g.add(tooth); });
    return g;
  },
};

// ---------- camera moves ----------
const MOVES = ['dolly-in', 'dolly-out', 'orbit-left', 'orbit-right', 'crane-up', 'crane-down', 'pan-left', 'pan-right', 'push-tilt', 'fly-over', 'spiral'];
function cameraPose(env, cam, p) {
  const { focus, R } = env;
  let dist = R, a = cam.az ?? env.az, e = cam.el ?? env.el, side = 0;
  const f = focus.clone();
  switch (cam.move) {
    case 'dolly-in': dist = R * (1.28 - 0.38 * p); break;
    case 'dolly-out': dist = R * (0.9 + 0.38 * p); break;
    case 'orbit-left': a += -0.38 + 0.76 * p; break;
    case 'orbit-right': a += 0.38 - 0.76 * p; break;
    case 'crane-up': e += -0.1 + 0.3 * p; f.y += R * 0.04 * p; break;
    case 'crane-down': e += 0.28 - 0.3 * p; break;
    case 'pan-left': side = R * (0.22 - 0.44 * p); break;
    case 'pan-right': side = R * (-0.22 + 0.44 * p); break;
    case 'push-tilt': dist = R * (1.25 - 0.33 * p); e += 0.22 - 0.28 * p; break;
    case 'fly-over': dist = R * (1.45 - 0.55 * p); e += 0.3 - 0.18 * p; a += 0.15 * p; break;
    case 'spiral': a += -0.55 + 1.1 * p; dist = R * (1.22 - 0.3 * p); e += 0.08 * Math.sin(p * Math.PI); break;
    default: break;
  }
  const pos = new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)).multiplyScalar(dist).add(f);
  if (side) {
    const right = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)).multiplyScalar(side);
    pos.add(right); f.add(right);
  }
  return { pos, look: f };
}

// ---------- foreground / atmosphere fx ----------
function addFx(scene, camera, env, pal, fx, rng) {
  const ups = [];
  if (fx.includes('dust')) {
    const R = env.R * 0.6; const n = 380;
    const d = points(n, (i, p) => p.set([(rng() - 0.5) * R * 2, rng() * R, (rng() - 0.5) * R * 2], i * 3), { size: env.R * 0.006, color: pal.key, opacity: 0.55 });
    d.position.copy(env.focus).add(new THREE.Vector3(0, -R * 0.4, 0)); scene.add(d);
    const base = d.geometry.attributes.position.array.slice();
    ups.push((t) => { const a = d.geometry.attributes.position; for (let i = 0; i < n; i++) { a.array[i * 3] = base[i * 3] + Math.sin(t * 0.3 + i) * R * 0.03; a.array[i * 3 + 1] = (base[i * 3 + 1] + t * R * 0.01) % R; } a.needsUpdate = true; });
  }
  if (fx.includes('bokeh')) {
    // big soft out-of-focus lights very close to the lens = instant foreground depth
    for (let i = 0; i < 7; i++) {
      const s = glow(i % 2 ? pal.accent : pal.accent2, 0.5 + rng() * 0.7, 0.18 + rng() * 0.15);
      s.position.set((rng() < 0.5 ? -1 : 1) * (0.35 + rng() * 0.45), -0.9 + rng() * 0.6, -1.4 - rng() * 1.2);
      camera.add(s); const ph = rng() * TAU; ups.push((t) => { s.position.x += Math.sin(t * 0.5 + ph) * 0.0006; });
    }
  }
  if (fx.includes('sparks')) {
    const n = 140; const R = env.R * 0.3;
    const s = points(n, (i, p) => p.set([(rng() - 0.5) * R, rng() * R, (rng() - 0.5) * R], i * 3), { size: env.R * 0.01, color: pal.accent, opacity: 0.9 });
    s.position.copy(env.focus).add(new THREE.Vector3(0, -R * 0.5, 0)); scene.add(s);
    const ph = Array.from({ length: n }, () => rng());
    ups.push((t) => { const a = s.geometry.attributes.position; for (let i = 0; i < n; i++) a.array[i * 3 + 1] = (ph[i] * R + t * R * 0.25 * (0.5 + ph[i])) % R; a.needsUpdate = true; });
  }
  return (t) => ups.forEach((u) => u(t));
}

// ---------- world manager ----------
export function create(canvas, TL, { scale = 1.5 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(scale);
  renderer.setSize(540, 960, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const cache = new Map();
  // studio reflections so metals / glass read as real materials instead of black
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  function build(i) {
    const sc = TL.scenes[i]; const w = sc.world;
    const pal = { ...(PALETTES[w.palette] || PALETTES.midnight), ...(w.colors || {}) };
    const seed = hashStr(`${TL.title}|${i}|${w.env}|${w.seed ?? ''}`);
    const rng = mulberry(seed);
    const scene = new THREE.Scene();
    scene.background = C(pal.sky[1]);
    const fog = new THREE.FogExp2(C(pal.fog), 0.012);
    scene.fog = fog;
    scene.add(skyDome(pal));
    scene.environment = envTex;
    scene.environmentIntensity = w.envIntensity ?? (pal.dark === false ? 0.9 : 0.55);
    const factory = ENVS[w.env] || ENVS.stage;
    const env = factory({ scene, pal, rng, props: w.props || {} });
    fog.density = (w.fog ?? 1) * 0.16 / env.R; // atmosphere scales with the size of the world
    addLights(scene, pal, w.light || 'studio', env.R);
    const camera = new THREE.PerspectiveCamera(w.fov || 40, 540 / 960, 0.1, 1500);
    scene.add(camera);
    const cam = { move: env.moves[0], ...(w.camera || {}) };
    const fxUpdate = addFx(scene, camera, env, pal, w.fx || ['dust'], rng);
    // keep the hero out of the text band: text on top → push subject down, text low → push it up
    const shift = { top: -0.1, impact: -0.12, lower: 0.12, center: 0 }[sc.textStyle || 'top'] ?? -0.1;
    camera.setViewOffset(540, 960, 0, shift * 960, 540, 960);
    return { scene, camera, env, cam, fxUpdate, exposure: (w.exposure ?? 1) * (pal.exposure ?? 1) };
  }

  function dispose(entry) {
    entry.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map && m.map !== _glowTex) m.map.dispose(); if (m.emissiveMap) m.emissiveMap.dispose(); m.dispose(); });
    });
  }

  return {
    render(i, lt, t) {
      const sc = TL.scenes[i];
      if (!sc || !sc.world) { canvas.style.visibility = 'hidden'; return; }
      canvas.style.visibility = 'visible';
      if (!cache.has(i)) cache.set(i, build(i));
      for (const k of [...cache.keys()]) if (Math.abs(k - i) > 1) { dispose(cache.get(k)); cache.delete(k); }
      const e = cache.get(i);
      const p = clamp(lt / sc.duration);
      const pe = 0.35 * p + 0.65 * easeIO(p); // keep moving through the whole shot
      const { pos, look } = cameraPose(e.env, e.cam, pe);
      // a breath of handheld drift
      pos.x += Math.sin(t * 0.9) * e.env.R * 0.003; pos.y += Math.sin(t * 1.3) * e.env.R * 0.002;
      e.camera.position.copy(pos); e.camera.lookAt(look);
      e.env.update(t, lt);
      e.fxUpdate(t);
      renderer.toneMappingExposure = e.exposure;
      renderer.render(e.scene, e.camera);
    },
    palette: (name) => PALETTES[name] || PALETTES.midnight,
  };
}

export const ENV_NAMES = Object.keys(ENVS);
export const HERO_NAMES = Object.keys(HEROES);
export { MOVES };
window.World3D = { create, PALETTES, ENV_NAMES, HERO_NAMES, MOVES };
window.dispatchEvent(new Event('world3d-ready'));
