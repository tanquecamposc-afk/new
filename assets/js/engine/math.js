/* NEXO ARCADE — engine/math.js
   Utilidades matemáticas, RNG determinista, easings, colisiones y ruido. */
(function (global) {
  'use strict';
  const NX = (global.NX = global.NX || {});

  const TAU = Math.PI * 2;
  const PI = Math.PI;
  const DEG = PI / 180;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const unlerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
  const remap = (v, a, b, c, d) => lerp(c, d, clamp01(unlerp(a, b, v)));
  const sign = Math.sign;
  const round = Math.round;

  /* Interpolación exponencial estable frente a dt variable. */
  const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
  /* Avanza `a` hacia `b` como máximo `step`. */
  const approach = (a, b, step) => (a < b ? Math.min(a + step, b) : Math.max(a - step, b));

  const wrap = (v, min, max) => {
    const r = max - min;
    return r <= 0 ? min : ((((v - min) % r) + r) % r) + min;
  };

  const angleDiff = (a, b) => wrap(b - a, -PI, PI);
  const lerpAngle = (a, b, t) => a + angleDiff(a, b) * t;
  const dampAngle = (a, b, lambda, dt) => a + angleDiff(a, b) * (1 - Math.exp(-lambda * dt));

  const dist2 = (ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay;
    return dx * dx + dy * dy;
  };
  const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

  const smoothstep = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
  const smootherstep = (t) => { t = clamp01(t); return t * t * t * (t * (t * 6 - 15) + 10); };

  /* ---------------------------------------------------------------- easings */
  const ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => t * (2 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    inCubic: (t) => t * t * t,
    outCubic: (t) => --t * t * t + 1,
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
    inQuart: (t) => t * t * t * t,
    outQuart: (t) => 1 - --t * t * t * t,
    inExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
    outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOutExpo: (t) => (t === 0 ? 0 : t === 1 ? 1 : t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
    outBack: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    inBack: (t) => { const c = 1.70158; return (c + 1) * t * t * t - c * t * t; },
    outElastic: (t) => (t === 0 || t === 1 ? t
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * PI) / 3)) + 1),
    outBounce: (t) => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
    inOutBounce: (t) => (t < 0.5
      ? (1 - ease.outBounce(1 - 2 * t)) / 2
      : (1 + ease.outBounce(2 * t - 1)) / 2),
  };

  /* ------------------------------------------------------------------- RNG */
  /* mulberry32: rápido, con semilla, suficientemente bueno para juegos. */
  function RNG(seed) {
    if (!(this instanceof RNG)) return new RNG(seed);
    this.seed(seed == null ? (Math.random() * 4294967296) >>> 0 : seed);
  }
  RNG.prototype.seed = function (s) {
    if (typeof s === 'string') {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      s = h >>> 0;
    }
    this._s = s >>> 0;
    return this;
  };
  RNG.prototype.next = function () {
    let t = (this._s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  RNG.prototype.float = function (a, b) {
    if (a === undefined) return this.next();
    if (b === undefined) { b = a; a = 0; }
    return a + this.next() * (b - a);
  };
  RNG.prototype.int = function (a, b) {
    if (b === undefined) { b = a; a = 0; }
    return Math.floor(a + this.next() * (b - a));
  };
  /* Entero inclusivo en [a,b]. */
  RNG.prototype.range = function (a, b) { return a + Math.floor(this.next() * (b - a + 1)); };
  RNG.prototype.bool = function (p) { return this.next() < (p == null ? 0.5 : p); };
  RNG.prototype.sign = function () { return this.next() < 0.5 ? -1 : 1; };
  RNG.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  RNG.prototype.shuffle = function (arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  /* Elige según pesos: weighted([[a,3],[b,1]]) */
  RNG.prototype.weighted = function (pairs) {
    let total = 0;
    for (const p of pairs) total += p[1];
    let r = this.next() * total;
    for (const p of pairs) { r -= p[1]; if (r <= 0) return p[0]; }
    return pairs[pairs.length - 1][0];
  };
  /* Punto aleatorio dentro de un círculo (distribución uniforme). */
  RNG.prototype.inCircle = function (r) {
    const a = this.next() * TAU, d = Math.sqrt(this.next()) * r;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d };
  };
  RNG.prototype.gauss = function (mean, sd) {
    let u = 0, v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    return (mean || 0) + Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v) * (sd == null ? 1 : sd);
  };

  /* RNG global por comodidad. */
  const rng = new RNG();
  const rand = (a, b) => rng.float(a, b);
  const randInt = (a, b) => rng.int(a, b);
  const pick = (a) => rng.pick(a);
  const shuffle = (a) => rng.shuffle(a);
  const chance = (p) => rng.bool(p);

  /* ------------------------------------------------------------ colisiones */
  const aabb = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  const pointInRect = (px, py, x, y, w, h) => px >= x && px <= x + w && py >= y && py <= y + h;
  const pointInCircle = (px, py, cx, cy, r) => dist2(px, py, cx, cy) <= r * r;
  const circleHit = (ax, ay, ar, bx, by, br) => dist2(ax, ay, bx, by) <= (ar + br) * (ar + br);

  const circleRect = (cx, cy, r, x, y, w, h) => {
    const nx = clamp(cx, x, x + w), ny = clamp(cy, y, y + h);
    return dist2(cx, cy, nx, ny) <= r * r;
  };

  function pointInPoly(px, py, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
      const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  /* Intersección de segmentos; devuelve {x,y,t} o null. */
  function segInter(x1, y1, x2, y2, x3, y3, x4, y4) {
    const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(d) < 1e-9) return null;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1), t };
  }

  /* Distancia de un punto al segmento AB. */
  function distToSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : clamp01(((px - ax) * dx + (py - ay) * dy) / len2);
    return dist(px, py, ax + dx * t, ay + dy * t);
  }

  /* ----------------------------------------------------------------- ruido */
  /* Ruido de valor con interpolación suave: barato y estable. */
  function makeNoise(seed) {
    const r = new RNG(seed == null ? 1337 : seed);
    const perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    r.shuffle(p);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const grad = (h, x, y) => {
      const u = (h & 1) ? x : -x, v = (h & 2) ? y : -y;
      return u + v;
    };
    function noise2(x, y) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      const xf = x - Math.floor(x), yf = y - Math.floor(y);
      const u = smootherstep(xf), v = smootherstep(yf);
      const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1];
      const ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
      const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
      const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
      return lerp(x1, x2, v) * 0.5;
    }
    noise2.fbm = function (x, y, oct, gain, lac) {
      oct = oct || 4; gain = gain == null ? 0.5 : gain; lac = lac || 2;
      let sum = 0, amp = 1, freq = 1, norm = 0;
      for (let i = 0; i < oct; i++) {
        sum += noise2(x * freq, y * freq) * amp;
        norm += amp; amp *= gain; freq *= lac;
      }
      return sum / norm;
    };
    return noise2;
  }

  /* ----------------------------------------------------------------- otros */
  /* Recorre una cuadrícula en espiral desde el centro (útil para colocar cosas). */
  function* spiral(n) {
    let x = 0, y = 0, dx = 0, dy = -1;
    for (let i = 0; i < n * n; i++) {
      if (-n / 2 < x && x <= n / 2 && -n / 2 < y && y <= n / 2) yield [x, y];
      if (x === y || (x < 0 && x === -y) || (x > 0 && x === 1 - y)) { const t = dx; dx = -dy; dy = t; }
      x += dx; y += dy;
    }
  }

  const fmtScore = (n) => Math.floor(n).toLocaleString('es-ES');
  const fmtTime = (s) => {
    s = Math.max(0, s);
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + String(r).padStart(2, '0');
  };
  const fmtMs = (s) => {
    s = Math.max(0, s);
    const m = Math.floor(s / 60), r = Math.floor(s % 60), c = Math.floor((s * 100) % 100);
    return m + ':' + String(r).padStart(2, '0') + '.' + String(c).padStart(2, '0');
  };

  NX.M = {
    TAU, PI, DEG, clamp, clamp01, lerp, unlerp, remap, damp, approach, wrap, sign, round,
    angleDiff, lerpAngle, dampAngle, dist, dist2, angleTo, smoothstep, smootherstep, ease,
    RNG, rng, rand, randInt, pick, shuffle, chance,
    aabb, pointInRect, pointInCircle, circleHit, circleRect, pointInPoly, segInter, distToSeg,
    makeNoise, spiral, fmtScore, fmtTime, fmtMs,
  };
})(typeof window !== 'undefined' ? window : globalThis);
