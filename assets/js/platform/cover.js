/* NEXO ARCADE — platform/cover.js
   Portadas generadas por código: cero imágenes externas, animación al pasar el cursor. */
(function (global) {
  'use strict';
  const NX = (global.NX = global.NX || {});
  const M = NX.M, GFX = NX.GFX;
  const { alpha, mix, shade, PALETTES } = GFX;
  const { TAU, clamp, clamp01, lerp } = M;

  /* Lienzo lógico de las portadas (relación 8:5). */
  const CW = 400, CH = 250;

  const motifs = Object.create(null);
  NX.Cover = { CW, CH, motifs };

  /* Registra uno o varios motivos. */
  NX.Cover.add = function (map) { Object.assign(motifs, map); };

  /* ------------------------------------------------------------- fondos */
  const BACKDROPS = ['glow', 'rays', 'grid', 'waves', 'hex', 'blobs', 'bars', 'orbit'];

  function backdrop(g, P, rng, t, kind) {
    const c = g.ctx;
    /* base vertical */
    c.fillStyle = g.linGrad(0, 0, CW * 0.3, CH, [
      [0, mix(P.bg, P.d, 0.35)], [0.55, P.bg], [1, mix(P.deep, '#000000', 0.15)],
    ]);
    c.fillRect(0, 0, CW, CH);

    c.save();
    switch (kind) {
      case 'rays': {
        c.globalCompositeOperation = 'lighter';
        const cx = CW * 0.5, cy = CH * 1.25;
        for (let i = 0; i < 11; i++) {
          const a = -Math.PI / 2 + (i - 5) * 0.18 + Math.sin(t * 0.25 + i) * 0.02;
          c.globalAlpha = 0.05 + (i % 2) * 0.035;
          c.fillStyle = i % 2 ? P.a : P.b;
          c.beginPath(); c.moveTo(cx, cy);
          c.lineTo(cx + Math.cos(a - 0.08) * 500, cy + Math.sin(a - 0.08) * 500);
          c.lineTo(cx + Math.cos(a + 0.08) * 500, cy + Math.sin(a + 0.08) * 500);
          c.closePath(); c.fill();
        }
        break;
      }
      case 'grid': {
        c.strokeStyle = alpha(P.a, 0.13); c.lineWidth = 1;
        c.beginPath();
        const off = (t * 12) % 32;
        for (let x = -32 + off; x < CW + 32; x += 32) { c.moveTo(x, 0); c.lineTo(x, CH); }
        for (let y = -32 + off; y < CH + 32; y += 32) { c.moveTo(0, y); c.lineTo(CW, y); }
        c.stroke();
        break;
      }
      case 'waves': {
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) {
          c.globalAlpha = 0.09 - i * 0.015;
          c.strokeStyle = i % 2 ? P.a : P.b; c.lineWidth = 22 - i * 3;
          c.beginPath();
          for (let x = -10; x <= CW + 10; x += 12) {
            const y = CH * (0.28 + i * 0.17) + Math.sin(x * 0.017 + t * 0.6 + i) * (12 + i * 5);
            x === -10 ? c.moveTo(x, y) : c.lineTo(x, y);
          }
          c.stroke();
        }
        break;
      }
      case 'hex': {
        c.strokeStyle = alpha(P.a, 0.12); c.lineWidth = 1.2;
        const r = 24, hs = r * Math.sqrt(3);
        for (let row = -1; row * r * 1.5 < CH + r; row++) {
          for (let col = -1; col * hs < CW + hs; col++) {
            const x = col * hs + (row % 2 ? hs / 2 : 0), y = row * r * 1.5;
            c.beginPath();
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * TAU + Math.PI / 6;
              const px = x + Math.cos(a) * r * 0.92, py = y + Math.sin(a) * r * 0.92;
              i ? c.lineTo(px, py) : c.moveTo(px, py);
            }
            c.closePath(); c.stroke();
          }
        }
        break;
      }
      case 'blobs': {
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) {
          const x = rng.float(0, CW), y = rng.float(0, CH), r = rng.float(70, 150);
          const col = [P.a, P.b, P.c, P.d][i % 4];
          c.globalAlpha = 0.16;
          c.fillStyle = g.radGrad(x + Math.sin(t * 0.4 + i) * 14, y + Math.cos(t * 0.33 + i) * 12, 0, r,
            [[0, col], [1, alpha(col, 0)]]);
          c.fillRect(0, 0, CW, CH);
        }
        break;
      }
      case 'bars': {
        for (let i = 0; i < 16; i++) {
          c.globalAlpha = 0.05 + (i % 3) * 0.02;
          c.fillStyle = i % 2 ? P.a : P.d;
          const w = CW / 16;
          c.fillRect(i * w, 0, w * 0.6, CH);
        }
        break;
      }
      case 'orbit': {
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = alpha(P.a, 0.16); c.lineWidth = 1.5;
        for (let i = 1; i <= 4; i++) {
          c.save(); c.translate(CW * 0.5, CH * 0.55);
          c.rotate(t * 0.12 * (i % 2 ? 1 : -1));
          c.scale(1, 0.42);
          c.beginPath(); c.arc(0, 0, 44 * i, 0, TAU); c.stroke();
          c.restore();
        }
        break;
      }
      default: {
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.55;
        c.fillStyle = g.radGrad(CW * 0.5, CH * 0.72, 0, CH * 0.95, [[0, alpha(P.a, 0.35)], [1, alpha(P.a, 0)]]);
        c.fillRect(0, 0, CW, CH);
        c.fillStyle = g.radGrad(CW * 0.16, CH * 0.16, 0, CH * 0.8, [[0, alpha(P.b, 0.3)], [1, alpha(P.b, 0)]]);
        c.fillRect(0, 0, CW, CH);
      }
    }
    c.restore();
  }

  /* Grano fino + viñeta: unifica el acabado de todas las portadas. */
  let grainPat = null;
  function grain(g) {
    const c = g.ctx;
    if (!grainPat) {
      const s = 64;
      const oc = document.createElement('canvas');
      oc.width = oc.height = s;
      const octx = oc.getContext('2d');
      const img = octx.createImageData(s, s);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 118 + Math.random() * 26;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      octx.putImageData(img, 0, 0);
      grainPat = c.createPattern(oc, 'repeat');
    }
    c.save();
    c.globalCompositeOperation = 'overlay';
    c.globalAlpha = 0.09;
    c.fillStyle = grainPat;
    c.fillRect(0, 0, CW, CH);
    c.restore();
  }

  function finish(g, P) {
    const c = g.ctx;
    /* viñeta */
    c.save();
    c.fillStyle = g.radGrad(CW / 2, CH / 2, CH * 0.34, CH * 0.95,
      [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.55)']]);
    c.fillRect(0, 0, CW, CH);
    /* velo inferior para que el título del card se lea siempre */
    c.fillStyle = g.linGrad(0, CH * 0.45, 0, CH,
      [[0, 'rgba(0,0,0,0)'], [1, alpha(shade(P.deep, -0.25), 0.82)]]);
    c.fillRect(0, CH * 0.45, CW, CH * 0.55);
    /* brillo superior */
    c.globalCompositeOperation = 'overlay';
    c.fillStyle = g.linGrad(0, 0, 0, CH * 0.5, [[0, 'rgba(255,255,255,.10)'], [1, 'rgba(255,255,255,0)']]);
    c.fillRect(0, 0, CW, CH * 0.5);
    c.restore();
    grain(g);
  }

  /* ------------------------------------------------------------ pintado */
  const cacheG = new WeakMap();

  /* Dibuja la portada del juego `game` en el contexto `ctx` (tamaño CW×CH lógico). */
  NX.Cover.paint = function (ctx, game, t, w, h) {
    let g = cacheG.get(ctx);
    if (!g) { g = new GFX.G(ctx); cacheG.set(ctx, g); }
    g.size(CW, CH);
    const P = PALETTES[game.pal] || PALETTES.neon;
    g.pal = P;
    const rng = new M.RNG(game.id);
    const bk = BACKDROPS[Math.abs(hash(game.id)) % BACKDROPS.length];

    ctx.save();
    if (w && h) ctx.scale(w / CW, h / CH);
    ctx.beginPath(); ctx.rect(0, 0, CW, CH); ctx.clip();
    backdrop(g, P, rng, t, bk);
    const fn = motifs[game.art] || motifs._default;
    if (fn) {
      ctx.save();
      try { fn(g, CW, CH, P, new M.RNG(game.id + ':m'), t); } catch (e) { /* nunca romper la parrilla */ }
      ctx.restore();
    }
    finish(g, P);
    ctx.restore();
  };

  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h | 0;
  }
  NX.Cover.hash = hash;

  /* Motivo de reserva. */
  motifs._default = function (g, W, H, P, rng, t) {
    for (let i = 0; i < 5; i++) {
      const a = t * 0.6 + i * (TAU / 5);
      g.circle(W / 2 + Math.cos(a) * 70, H * 0.5 + Math.sin(a) * 44, 16, [P.a, P.b, P.c, P.d, P.a][i]);
    }
    g.ring(W / 2, H * 0.5, 74, 2, alpha(P.a, 0.35));
  };
})(typeof window !== 'undefined' ? window : globalThis);
