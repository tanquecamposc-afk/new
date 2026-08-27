/* NEXO ARCADE — engine/gfx.js
   Capa de dibujo: primitivas, partículas, cámara, fondos y post-proceso. */
(function (global) {
  'use strict';
  const NX = (global.NX = global.NX || {});
  const M = NX.M;
  const { TAU, clamp, clamp01, lerp, rand, randInt } = M;

  const FONT = '"Outfit","Space Grotesk","Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif';
  const MONO = '"JetBrains Mono","SF Mono",ui-monospace,Consolas,monospace';

  /* ------------------------------------------------------------- paletas */
  const PALETTES = {
    neon:    { bg:'#080b18', deep:'#05070f', a:'#22e0ff', b:'#ff3ea5', c:'#ffd45e', d:'#7c5cff', ink:'#eaf2ff', dim:'#8ea2c8' },
    sunset:  { bg:'#1a0b1e', deep:'#0d0511', a:'#ff8a3d', b:'#ff3d7f', c:'#ffd66b', d:'#7a4dff', ink:'#fff2e8', dim:'#c39ab5' },
    forest:  { bg:'#08140f', deep:'#040b08', a:'#4ade80', b:'#22d3ee', c:'#fde047', d:'#16a34a', ink:'#eafff3', dim:'#8fc0a9' },
    ocean:   { bg:'#04121f', deep:'#020a13', a:'#38bdf8', b:'#a78bfa', c:'#5eead4', d:'#0ea5e9', ink:'#e6f6ff', dim:'#7ea6c4' },
    ember:   { bg:'#180a08', deep:'#0c0504', a:'#ff6b35', b:'#ffd166', c:'#ef476f', d:'#c1121f', ink:'#fff0e6', dim:'#c2907f' },
    candy:   { bg:'#1b1030', deep:'#0e0819', a:'#ff7ab6', b:'#7dd3fc', c:'#fde68a', d:'#c084fc', ink:'#fff0fa', dim:'#b79fd0' },
    mono:    { bg:'#0c0f14', deep:'#06080b', a:'#e2e8f0', b:'#94a3b8', c:'#facc15', d:'#64748b', ink:'#f8fafc', dim:'#94a3b8' },
    toxic:   { bg:'#0a1408', deep:'#050a04', a:'#a3e635', b:'#22d3ee', c:'#fb923c', d:'#65a30d', ink:'#f3ffe0', dim:'#9fbf82' },
    royal:   { bg:'#0b0a20', deep:'#050512', a:'#818cf8', b:'#f0abfc', c:'#fcd34d', d:'#4f46e5', ink:'#f0f0ff', dim:'#9d9dc8' },
    ice:     { bg:'#081420', deep:'#040a11', a:'#a5f3fc', b:'#c7d2fe', c:'#fef08a', d:'#38bdf8', ink:'#f0fbff', dim:'#8fb0c4' },
  };
  const paletteNames = Object.keys(PALETTES);

  /* Mezcla dos colores hex. */
  function mix(c1, c2, t) {
    const a = hex2rgb(c1), b = hex2rgb(c2);
    return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
  }
  function hex2rgb(h) {
    if (h[0] !== '#') { const m = h.match(/[\d.]+/g); return m ? [+m[0], +m[1], +m[2]] : [255, 255, 255]; }
    h = h.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function alpha(c, a) {
    const [r, g, b] = hex2rgb(c);
    return `rgba(${r},${g},${b},${a})`;
  }
  function shade(c, amt) {
    const [r, g, b] = hex2rgb(c);
    const f = amt < 0 ? 0 : 255, p = Math.abs(amt);
    return `rgb(${Math.round(lerp(r, f, p))},${Math.round(lerp(g, f, p))},${Math.round(lerp(b, f, p))})`;
  }
  function hsl(h, s, l, a) {
    return a == null ? `hsl(${h},${s}%,${l}%)` : `hsla(${h},${s}%,${l}%,${a})`;
  }

  /* ------------------------------------------------------------------- G */
  /* Envoltorio del contexto 2D con primitivas de alto nivel y encadenables. */
  function G(ctx) {
    this.ctx = ctx;
    this.W = 0; this.H = 0;
    this.pal = PALETTES.neon;
  }
  const P = G.prototype;

  P.size = function (w, h) { this.W = w; this.H = h; return this; };
  P.save = function () { this.ctx.save(); return this; };
  P.restore = function () { this.ctx.restore(); return this; };
  P.push = function (x, y, rot, sx, sy) {
    const c = this.ctx;
    c.save();
    if (x || y) c.translate(x || 0, y || 0);
    if (rot) c.rotate(rot);
    if (sx != null) c.scale(sx, sy == null ? sx : sy);
    return this;
  };
  P.pop = function () { this.ctx.restore(); return this; };
  P.alpha = function (a) { this.ctx.globalAlpha = a; return this; };
  P.blend = function (m) { this.ctx.globalCompositeOperation = m || 'source-over'; return this; };
  P.clip = function () { this.ctx.clip(); return this; };

  P.clear = function (color) {
    const c = this.ctx;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (color) { c.fillStyle = color; c.fillRect(0, 0, this.W, this.H); }
    else c.clearRect(0, 0, this.W, this.H);
    c.restore();
    return this;
  };

  P.glow = function (color, blur) {
    this.ctx.shadowColor = color || this.pal.a;
    this.ctx.shadowBlur = blur == null ? 18 : blur;
    return this;
  };
  P.noGlow = function () { this.ctx.shadowBlur = 0; this.ctx.shadowColor = 'transparent'; return this; };

  /* --- primitivas --- */
  P.rect = function (x, y, w, h, color) {
    const c = this.ctx;
    if (color) c.fillStyle = color;
    c.fillRect(x, y, w, h);
    return this;
  };
  P.strokeRect = function (x, y, w, h, color, lw) {
    const c = this.ctx;
    if (color) c.strokeStyle = color;
    c.lineWidth = lw || 2;
    c.strokeRect(x, y, w, h);
    return this;
  };
  P.rrectPath = function (x, y, w, h, r) {
    const c = this.ctx;
    const rr = Math.min(r == null ? 8 : r, Math.abs(w) / 2, Math.abs(h) / 2);
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, rr);
    else {
      c.moveTo(x + rr, y);
      c.arcTo(x + w, y, x + w, y + h, rr);
      c.arcTo(x + w, y + h, x, y + h, rr);
      c.arcTo(x, y + h, x, y, rr);
      c.arcTo(x, y, x + w, y, rr);
      c.closePath();
    }
    return this;
  };
  P.rrect = function (x, y, w, h, r, color) {
    if (color) this.ctx.fillStyle = color;
    this.rrectPath(x, y, w, h, r); this.ctx.fill();
    return this;
  };
  P.rrectStroke = function (x, y, w, h, r, color, lw) {
    const c = this.ctx;
    if (color) c.strokeStyle = color;
    c.lineWidth = lw || 2;
    this.rrectPath(x, y, w, h, r); c.stroke();
    return this;
  };
  P.circle = function (x, y, r, color) {
    const c = this.ctx;
    if (color) c.fillStyle = color;
    c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.fill();
    return this;
  };
  P.ring = function (x, y, r, lw, color, from, to) {
    const c = this.ctx;
    if (color) c.strokeStyle = color;
    c.lineWidth = lw;
    c.beginPath(); c.arc(x, y, Math.max(0, r), from || 0, to == null ? TAU : to); c.stroke();
    return this;
  };
  P.arcFill = function (x, y, r, from, to, color) {
    const c = this.ctx;
    if (color) c.fillStyle = color;
    c.beginPath(); c.moveTo(x, y); c.arc(x, y, r, from, to); c.closePath(); c.fill();
    return this;
  };
  P.line = function (x1, y1, x2, y2, color, lw) {
    const c = this.ctx;
    if (color) c.strokeStyle = color;
    c.lineWidth = lw || 2;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    return this;
  };
  P.poly = function (pts, color, close) {
    const c = this.ctx;
    if (color) c.fillStyle = color;
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    if (close !== false) c.closePath();
    c.fill();
    return this;
  };
  P.polyStroke = function (pts, color, lw, close) {
    const c = this.ctx;
    if (color) c.strokeStyle = color;
    c.lineWidth = lw || 2;
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    if (close) c.closePath();
    c.stroke();
    return this;
  };
  P.ngon = function (x, y, r, n, rot, color) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (rot || 0);
      pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    return this.poly(pts, color);
  };
  P.star = function (x, y, r1, r2, n, rot, color) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * TAU + (rot || 0);
      const r = i % 2 ? r2 : r1;
      pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    return this.poly(pts, color);
  };
  P.tri = function (x, y, r, rot, color) { return this.ngon(x, y, r, 3, (rot || 0) - Math.PI / 2, color); };
  P.capsule = function (x1, y1, x2, y2, r, color) {
    const c = this.ctx;
    if (color) c.strokeStyle = color;
    c.lineCap = 'round'; c.lineWidth = r * 2;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.lineCap = 'butt';
    return this;
  };
  P.diamond = function (x, y, w, h, color) {
    return this.poly([x, y - h, x + w, y, x, y + h, x - w, y], color);
  };
  /* Curva suave por puntos (Catmull-Rom aproximada con cuadráticas). */
  P.curve = function (pts, color, lw) {
    const c = this.ctx;
    if (pts.length < 4) return this;
    if (color) c.strokeStyle = color;
    c.lineWidth = lw || 2; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length - 2; i += 2) {
      const xc = (pts[i] + pts[i + 2]) / 2, yc = (pts[i + 1] + pts[i + 3]) / 2;
      c.quadraticCurveTo(pts[i], pts[i + 1], xc, yc);
    }
    c.lineTo(pts[pts.length - 2], pts[pts.length - 1]);
    c.stroke();
    return this;
  };

  /* --- degradados --- */
  P.linGrad = function (x1, y1, x2, y2, stops) {
    const g = this.ctx.createLinearGradient(x1, y1, x2, y2);
    for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  };
  P.radGrad = function (x, y, r0, r1, stops, x1, y1) {
    const g = this.ctx.createRadialGradient(x, y, r0, x1 == null ? x : x1, y1 == null ? y : y1, r1);
    for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  };
  /* Resplandor radial suave (aditivo). */
  P.bloom = function (x, y, r, color, intensity) {
    const c = this.ctx;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = intensity == null ? 0.5 : intensity;
    c.fillStyle = this.radGrad(x, y, 0, r, [[0, alpha(color, 0.9)], [0.45, alpha(color, 0.28)], [1, alpha(color, 0)]]);
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.restore();
    return this;
  };

  /* --- texto --- */
  P.font = function (size, weight, family) {
    this.ctx.font = `${weight || 700} ${size}px ${family || FONT}`;
    return this;
  };
  P.text = function (str, x, y, opt) {
    opt = opt || {};
    const c = this.ctx;
    c.save();
    c.font = `${opt.weight || 700} ${opt.size || 20}px ${opt.mono ? MONO : (opt.family || FONT)}`;
    c.textAlign = opt.align || 'left';
    c.textBaseline = opt.baseline || 'alphabetic';
    if (opt.letterSpacing != null && 'letterSpacing' in c) c.letterSpacing = opt.letterSpacing + 'px';
    if (opt.shadow) { c.shadowColor = opt.shadow; c.shadowBlur = opt.shadowBlur == null ? 12 : opt.shadowBlur; c.shadowOffsetY = opt.shadowY || 0; }
    if (opt.stroke) {
      c.lineWidth = opt.strokeWidth || 4; c.strokeStyle = opt.stroke;
      c.lineJoin = 'round'; c.miterLimit = 2;
      c.strokeText(str, x, y);
    }
    c.fillStyle = opt.color || this.pal.ink;
    c.fillText(str, x, y);
    c.restore();
    return this;
  };
  P.textW = function (str, size, weight, family) {
    const c = this.ctx;
    c.save();
    c.font = `${weight || 700} ${size || 20}px ${family || FONT}`;
    const w = c.measureText(str).width;
    c.restore();
    return w;
  };
  /* Texto ajustado a un ancho, devuelve nº de líneas dibujadas. */
  P.wrapText = function (str, x, y, maxW, lineH, opt) {
    const words = String(str).split(/\s+/);
    let line = '', n = 0;
    const size = (opt && opt.size) || 16;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (this.textW(test, size, (opt && opt.weight) || 600) > maxW && line) {
        this.text(line, x, y + n * lineH, opt); line = words[i]; n++;
      } else line = test;
    }
    if (line) { this.text(line, x, y + n * lineH, opt); n++; }
    return n;
  };

  /* --- fondos --- */
  P.bgGradient = function (top, bottom) {
    const c = this.ctx;
    c.fillStyle = this.linGrad(0, 0, 0, this.H, [[0, top], [1, bottom]]);
    c.fillRect(0, 0, this.W, this.H);
    return this;
  };
  P.bgVignette = function (strength) {
    const c = this.ctx;
    const r = Math.hypot(this.W, this.H) * 0.62;
    c.fillStyle = this.radGrad(this.W / 2, this.H / 2, r * 0.42, r,
      [[0, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${strength == null ? 0.55 : strength})`]]);
    c.fillRect(0, 0, this.W, this.H);
    return this;
  };
  P.bgGrid = function (cell, color, lw, ox, oy) {
    const c = this.ctx;
    c.save();
    c.strokeStyle = color; c.lineWidth = lw || 1;
    c.beginPath();
    const sx = ((ox || 0) % cell + cell) % cell, sy = ((oy || 0) % cell + cell) % cell;
    for (let x = sx - cell; x <= this.W + cell; x += cell) { c.moveTo(x, 0); c.lineTo(x, this.H); }
    for (let y = sy - cell; y <= this.H + cell; y += cell) { c.moveTo(0, y); c.lineTo(this.W, y); }
    c.stroke(); c.restore();
    return this;
  };
  /* Horizonte con perspectiva estilo retrowave. */
  P.bgHorizon = function (t, colA, colB, hy) {
    const c = this.ctx, H = this.H, W = this.W;
    const horizon = hy == null ? H * 0.55 : hy;
    c.save();
    c.fillStyle = this.linGrad(0, 0, 0, horizon, [[0, colA], [1, colB]]);
    c.fillRect(0, 0, W, horizon);
    c.strokeStyle = alpha(colB, 0.5); c.lineWidth = 1.5;
    c.beginPath();
    for (let i = -14; i <= 14; i++) {
      c.moveTo(W / 2 + i * W * 0.09, horizon);
      c.lineTo(W / 2 + i * W * 0.85, H);
    }
    for (let i = 0; i < 16; i++) {
      const p = ((i / 16) + ((t || 0) * 0.12) % (1 / 16)) % 1;
      const y = horizon + Math.pow(p, 2.4) * (H - horizon);
      c.moveTo(0, y); c.lineTo(W, y);
    }
    c.stroke();
    c.restore();
    return this;
  };
  P.scanlines = function (a, gap) {
    const c = this.ctx;
    c.save();
    c.fillStyle = `rgba(0,0,0,${a == null ? 0.12 : a})`;
    for (let y = 0; y < this.H; y += (gap || 3)) c.fillRect(0, y, this.W, 1);
    c.restore();
    return this;
  };

  /* ---------------------------------------------------------- Starfield */
  function Starfield(w, h, n, opt) {
    opt = opt || {};
    this.w = w; this.h = h;
    this.layers = opt.layers || 3;
    this.color = opt.color || '#ffffff';
    this.dir = opt.dir || 'down';
    this.stars = [];
    for (let i = 0; i < (n || 90); i++) {
      const L = i % this.layers;
      this.stars.push({ x: rand(0, w), y: rand(0, h), l: L, r: 0.6 + L * 0.55, s: 12 + L * 26, p: rand(0, TAU) });
    }
  }
  Starfield.prototype.resize = function (w, h) { this.w = w; this.h = h; };
  Starfield.prototype.update = function (dt, speed) {
    const sp = speed == null ? 1 : speed;
    for (const s of this.stars) {
      if (this.dir === 'down') { s.y += s.s * sp * dt; if (s.y > this.h) { s.y = -2; s.x = rand(0, this.w); } }
      else if (this.dir === 'up') { s.y -= s.s * sp * dt; if (s.y < -2) { s.y = this.h; s.x = rand(0, this.w); } }
      else { s.x -= s.s * sp * dt; if (s.x < -2) { s.x = this.w; s.y = rand(0, this.h); } }
      s.p += dt * 2;
    }
  };
  Starfield.prototype.draw = function (g) {
    const c = g.ctx;
    c.save();
    for (const s of this.stars) {
      c.globalAlpha = 0.25 + 0.55 * (s.l / Math.max(1, this.layers - 1)) + Math.sin(s.p) * 0.12;
      c.fillStyle = this.color;
      c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill();
    }
    c.restore();
  };

  /* --------------------------------------------------------- Partículas */
  /* Pool fijo: sin asignaciones durante el juego. */
  function Particles(max) {
    this.max = max || 600;
    this.p = new Array(this.max);
    for (let i = 0; i < this.max; i++) {
      this.p[i] = { on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, r: 2, r2: 0, col: '#fff',
                    grav: 0, drag: 0, rot: 0, vr: 0, shape: 0, add: false, fade: 1 };
    }
    this.i = 0;
  }
  Particles.prototype.spawn = function (o) {
    let tries = 0, p = null;
    while (tries++ < this.max) {
      const q = this.p[this.i]; this.i = (this.i + 1) % this.max;
      if (!q.on) { p = q; break; }
    }
    if (!p) { p = this.p[this.i]; this.i = (this.i + 1) % this.max; }
    p.on = true;
    p.x = o.x; p.y = o.y;
    p.vx = o.vx || 0; p.vy = o.vy || 0;
    p.max = p.life = o.life == null ? 0.6 : o.life;
    p.r = o.r == null ? 3 : o.r;
    p.r2 = o.r2 == null ? 0 : o.r2;
    p.col = o.col || '#fff';
    p.grav = o.grav || 0;
    p.drag = o.drag == null ? 0.6 : o.drag;
    p.rot = o.rot || 0; p.vr = o.vr || 0;
    p.shape = o.shape || 0;      /* 0 círculo, 1 cuadro, 2 chispa, 3 estrella */
    p.add = !!o.add;
    p.fade = o.fade == null ? 1 : o.fade;
    return p;
  };
  /* Explosión radial. */
  Particles.prototype.burst = function (x, y, n, o) {
    o = o || {};
    for (let i = 0; i < n; i++) {
      const a = o.angle == null ? rand(0, TAU) : o.angle + rand(-1, 1) * (o.spread == null ? Math.PI : o.spread);
      const sp = rand(o.speed0 == null ? 40 : o.speed0, o.speed1 == null ? 220 : o.speed1);
      this.spawn({
        x: x + (o.jitter ? rand(-o.jitter, o.jitter) : 0),
        y: y + (o.jitter ? rand(-o.jitter, o.jitter) : 0),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(o.life0 == null ? 0.3 : o.life0, o.life1 == null ? 0.8 : o.life1),
        r: rand(o.r0 == null ? 1.5 : o.r0, o.r1 == null ? 4 : o.r1),
        col: Array.isArray(o.col) ? o.col[randInt(0, o.col.length)] : (o.col || '#fff'),
        grav: o.grav || 0, drag: o.drag, shape: o.shape, add: o.add, vr: o.vr == null ? rand(-8, 8) : o.vr,
      });
    }
    return this;
  };
  Particles.prototype.trail = function (x, y, o) {
    o = o || {};
    this.spawn({
      x: x + rand(-2, 2), y: y + rand(-2, 2),
      vx: (o.vx || 0) + rand(-16, 16), vy: (o.vy || 0) + rand(-16, 16),
      life: o.life == null ? 0.35 : o.life, r: o.r == null ? 3 : o.r,
      col: Array.isArray(o.col) ? o.col[randInt(0, o.col.length)] : (o.col || '#fff'),
      drag: 0.9, add: o.add !== false,
    });
    return this;
  };
  Particles.prototype.update = function (dt) {
    for (let i = 0; i < this.max; i++) {
      const p = this.p[i];
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      p.vy += p.grav * dt;
      if (p.drag) { const d = Math.pow(p.drag, dt * 60 / 60); const k = Math.exp(-(1 - p.drag) * 8 * dt); p.vx *= k; p.vy *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
  };
  Particles.prototype.draw = function (g) {
    const c = g.ctx;
    c.save();
    let addMode = false;
    for (let i = 0; i < this.max; i++) {
      const p = this.p[i];
      if (!p.on) continue;
      const t = clamp01(p.life / p.max);
      if (p.add !== addMode) { c.globalCompositeOperation = p.add ? 'lighter' : 'source-over'; addMode = p.add; }
      c.globalAlpha = p.fade === 1 ? t : Math.min(1, t * p.fade + (1 - p.fade));
      c.fillStyle = p.col;
      const r = lerp(p.r2, p.r, t);
      if (p.shape === 1) {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.fillRect(-r, -r, r * 2, r * 2); c.restore();
      } else if (p.shape === 2) {
        c.strokeStyle = p.col; c.lineWidth = Math.max(1, r * 0.7); c.lineCap = 'round';
        const l = Math.hypot(p.vx, p.vy) * 0.03 + r;
        const a = Math.atan2(p.vy, p.vx);
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - Math.cos(a) * l, p.y - Math.sin(a) * l); c.stroke();
      } else if (p.shape === 3) {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * TAU, rr = k % 2 ? r * 0.42 : r;
          k ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        c.closePath(); c.fill(); c.restore();
      } else {
        c.beginPath(); c.arc(p.x, p.y, Math.max(0.2, r), 0, TAU); c.fill();
      }
    }
    c.restore();
  };
  Particles.prototype.clear = function () { for (const p of this.p) p.on = false; };

  /* ------------------------------------------------------------- Cámara */
  function Camera(w, h) {
    this.x = 0; this.y = 0; this.zoom = 1; this.rot = 0;
    this.w = w; this.h = h;
    this.shake = 0; this.shakeT = 0; this.ox = 0; this.oy = 0;
    this.flashA = 0; this.flashCol = '#fff';
  }
  Camera.prototype.resize = function (w, h) { this.w = w; this.h = h; };
  Camera.prototype.kick = function (amt) { this.shake = Math.max(this.shake, amt); };
  Camera.prototype.flash = function (col, a) { this.flashCol = col || '#fff'; this.flashA = a == null ? 0.5 : a; };
  Camera.prototype.follow = function (tx, ty, lambda, dt) {
    this.x = M.damp(this.x, tx, lambda || 6, dt);
    this.y = M.damp(this.y, ty, lambda || 6, dt);
  };
  Camera.prototype.update = function (dt) {
    this.shakeT += dt * 34;
    this.shake = Math.max(0, this.shake - dt * (18 + this.shake * 3));
    this.ox = Math.sin(this.shakeT * 1.7) * this.shake + Math.sin(this.shakeT * 3.1) * this.shake * 0.4;
    this.oy = Math.cos(this.shakeT * 2.3) * this.shake + Math.cos(this.shakeT * 4.7) * this.shake * 0.3;
    this.flashA = Math.max(0, this.flashA - dt * 2.6);
  };
  Camera.prototype.apply = function (g) {
    const c = g.ctx;
    c.save();
    c.translate(this.w / 2 + this.ox, this.h / 2 + this.oy);
    if (this.rot) c.rotate(this.rot);
    if (this.zoom !== 1) c.scale(this.zoom, this.zoom);
    c.translate(-this.x, -this.y);
  };
  Camera.prototype.done = function (g) { g.ctx.restore(); };
  Camera.prototype.drawFlash = function (g) {
    if (this.flashA <= 0.002) return;
    const c = g.ctx;
    c.save(); c.globalAlpha = this.flashA; c.fillStyle = this.flashCol;
    c.fillRect(0, 0, g.W, g.H); c.restore();
  };
  Camera.prototype.toWorld = function (sx, sy) {
    return { x: (sx - this.w / 2 - this.ox) / this.zoom + this.x, y: (sy - this.h / 2 - this.oy) / this.zoom + this.y };
  };

  /* --------------------------------------------------- Textos flotantes */
  function Floaters() { this.list = []; }
  Floaters.prototype.add = function (x, y, txt, o) {
    o = o || {};
    this.list.push({ x, y, txt, t: 0, life: o.life || 0.9, col: o.col || '#fff',
      size: o.size || 20, vy: o.vy == null ? -46 : o.vy, vx: o.vx || 0, stroke: o.stroke });
  };
  Floaters.prototype.update = function (dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      f.t += dt; f.y += f.vy * dt; f.x += f.vx * dt; f.vy *= Math.exp(-2.4 * dt);
      if (f.t >= f.life) this.list.splice(i, 1);
    }
  };
  Floaters.prototype.draw = function (g) {
    for (const f of this.list) {
      const k = 1 - f.t / f.life;
      const pop = f.t < 0.12 ? M.ease.outBack(f.t / 0.12) : 1;
      g.ctx.save(); g.ctx.globalAlpha = clamp01(k * 1.6);
      g.text(f.txt, f.x, f.y, { size: f.size * pop, align: 'center', color: f.col,
        stroke: f.stroke || 'rgba(0,0,0,.6)', strokeWidth: 4, weight: 800 });
      g.ctx.restore();
    }
  };
  Floaters.prototype.clear = function () { this.list.length = 0; };

  /* ------------------------------------------------------------- Tweens */
  function Tweens() { this.list = []; }
  Tweens.prototype.to = function (obj, props, dur, opt) {
    opt = opt || {};
    const from = {};
    for (const k in props) from[k] = obj[k];
    const tw = { obj, props, from, dur, t: 0, ease: opt.ease || M.ease.outCubic,
      delay: opt.delay || 0, onDone: opt.onDone, onUpdate: opt.onUpdate };
    this.list.push(tw);
    return tw;
  };
  Tweens.prototype.update = function (dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      if (tw.delay > 0) { tw.delay -= dt; continue; }
      tw.t += dt;
      const k = tw.dur <= 0 ? 1 : clamp01(tw.t / tw.dur);
      const e = tw.ease(k);
      for (const p in tw.props) tw.obj[p] = lerp(tw.from[p], tw.props[p], e);
      if (tw.onUpdate) tw.onUpdate(e);
      if (k >= 1) { this.list.splice(i, 1); if (tw.onDone) tw.onDone(); }
    }
  };
  Tweens.prototype.clear = function () { this.list.length = 0; };

  /* ------------------------------------------- Sprites vectoriales base */
  /* Personajes/props dibujados por código: cero assets externos. */
  const Sprites = {
    /* Nave triangular con motor. */
    ship(g, x, y, r, ang, colA, colB, thrust) {
      g.push(x, y, ang + Math.PI / 2);
      if (thrust) {
        g.ctx.globalCompositeOperation = 'lighter';
        g.poly([0, r * 0.9, -r * 0.35, r * (1.1 + thrust * 0.9), 0, r * (1.5 + thrust * 1.6), r * 0.35, r * (1.1 + thrust * 0.9)], alpha(colB, 0.85));
        g.ctx.globalCompositeOperation = 'source-over';
      }
      g.poly([0, -r * 1.25, r * 0.85, r * 0.85, 0, r * 0.45, -r * 0.85, r * 0.85], colA);
      g.poly([0, -r * 0.75, r * 0.3, r * 0.3, -r * 0.3, r * 0.3], colB);
      g.pop();
    },
    /* Criatura tipo "blob" con ojos: base de muchos enemigos. */
    blob(g, x, y, r, col, t, eyes) {
      const sq = 1 + Math.sin((t || 0) * 6) * 0.06;
      g.push(x, y, 0, 1 / sq, sq);
      g.circle(0, 0, r, col);
      g.ctx.globalAlpha = 0.25;
      g.circle(-r * 0.3, -r * 0.35, r * 0.42, '#fff');
      g.ctx.globalAlpha = 1;
      if (eyes !== false) {
        g.circle(-r * 0.32, -r * 0.1, r * 0.24, '#fff');
        g.circle(r * 0.32, -r * 0.1, r * 0.24, '#fff');
        g.circle(-r * 0.3, -r * 0.06, r * 0.12, '#101322');
        g.circle(r * 0.34, -r * 0.06, r * 0.12, '#101322');
      }
      g.pop();
    },
    /* Robot cuadrado con antena. */
    bot(g, x, y, s, colA, colB, t) {
      const b = Math.sin((t || 0) * 4) * s * 0.06;
      g.push(x, y + b);
      g.line(0, -s * 0.6, 0, -s * 0.95, colB, s * 0.1);
      g.circle(0, -s * 1.02, s * 0.12, colB);
      g.rrect(-s * 0.6, -s * 0.62, s * 1.2, s * 1.2, s * 0.26, colA);
      g.rrect(-s * 0.42, -s * 0.4, s * 0.84, s * 0.5, s * 0.16, '#0b0f1a');
      g.circle(-s * 0.18, -s * 0.15, s * 0.1, colB);
      g.circle(s * 0.18, -s * 0.15, s * 0.1, colB);
      g.pop();
    },
    /* Moneda giratoria. */
    coin(g, x, y, r, t, col, col2) {
      const w = Math.abs(Math.cos((t || 0) * 3.2));
      g.push(x, y, 0, Math.max(0.12, w), 1);
      g.circle(0, 0, r, col || '#ffd45e');
      g.circle(0, 0, r * 0.68, col2 || '#ffb02e');
      g.pop();
    },
    /* Corazón (vidas). */
    heart(g, x, y, s, col) {
      const c = g.ctx;
      c.save(); c.translate(x, y); c.scale(s / 16, s / 16);
      c.fillStyle = col || '#ff4d6d';
      c.beginPath();
      c.moveTo(0, 5);
      c.bezierCurveTo(-2, 1, -9, 1, -9, -4);
      c.bezierCurveTo(-9, -9, -3, -10, 0, -5);
      c.bezierCurveTo(3, -10, 9, -9, 9, -4);
      c.bezierCurveTo(9, 1, 2, 1, 0, 5);
      c.closePath(); c.fill(); c.restore();
    },
    /* Llave / cerradura simple. */
    key(g, x, y, s, col) {
      g.ring(x - s * 0.35, y, s * 0.34, s * 0.22, col);
      g.rect(x - s * 0.1, y - s * 0.1, s * 0.9, s * 0.2, col);
      g.rect(x + s * 0.5, y + s * 0.05, s * 0.14, s * 0.32, col);
      g.rect(x + s * 0.72, y + s * 0.05, s * 0.14, s * 0.24, col);
    },
    /* Árbol estilizado. */
    tree(g, x, y, s, colA, colB) {
      g.rect(x - s * 0.09, y - s * 0.5, s * 0.18, s * 0.5, colB || '#6b4b2a');
      g.tri(x, y - s * 0.72, s * 0.42, 0, colA || '#3fb96a');
      g.tri(x, y - s * 1.02, s * 0.34, 0, colA || '#3fb96a');
    },
    /* Nube. */
    cloud(g, x, y, s, col) {
      g.circle(x, y, s * 0.5, col);
      g.circle(x - s * 0.45, y + s * 0.12, s * 0.34, col);
      g.circle(x + s * 0.45, y + s * 0.1, s * 0.38, col);
      g.rect(x - s * 0.5, y + s * 0.1, s, s * 0.34, col);
    },
    /* Flecha. */
    arrow(g, x, y, len, ang, col, lw) {
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      g.line(x, y, x2, y2, col, lw || 3);
      g.push(x2, y2, ang);
      g.poly([0, 0, -(lw || 3) * 2.6, -(lw || 3) * 1.7, -(lw || 3) * 2.6, (lw || 3) * 1.7], col);
      g.pop();
    },
  };

  NX.GFX = {
    G, Particles, Camera, Starfield, Floaters, Tweens, Sprites,
    PALETTES, paletteNames, FONT, MONO,
    mix, alpha, shade, hsl, hex2rgb,
  };
})(typeof window !== 'undefined' ? window : globalThis);
