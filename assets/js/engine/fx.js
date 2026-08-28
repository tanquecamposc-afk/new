/* NEXO ARCADE — engine/fx.js
   Post-proceso compartido: resplandor, viñeta, grano y líneas de barrido.
   Se aplica sobre el fotograma ya dibujado, así que mejora todos los juegos
   sin tocar el código de ninguno. */
(function (global) {
  'use strict';
  const NX = (global.NX = global.NX || {});
  const M = NX.M;

  /* Un lienzo fuera de pantalla reutilizable. */
  function buf(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0);
    return { c, x: c.getContext('2d', { alpha: true }) };
  }

  let grainTile = null;
  function grainPattern(ctx) {
    if (grainTile) return grainTile;
    const s = 128;
    const oc = document.createElement('canvas');
    oc.width = oc.height = s;
    const o = oc.getContext('2d');
    const img = o.createImageData(s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 110 + Math.random() * 36;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    o.putImageData(img, 0, 0);
    grainTile = oc;
    return grainTile;
  }

  function FX(engine) {
    this.E = engine;
    this.opt = {
      bloom: 0.55,        /* intensidad del resplandor (0 lo desactiva) */
      threshold: 2,       /* nº de pasadas de contraste antes de difuminar */
      vignette: 0.42,
      grain: 0.055,
      scanlines: 0,
      warm: 0,            /* velo cálido opcional para escenas de día */
    };
    this.enabled = true;
    this.quality = 6;      /* divisor de resolución del resplandor */
    this.a = null; this.b = null;
    this._w = 0; this._h = 0;
    this._gt = 0;
    this._slow = 0;
  }
  const F = FX.prototype;

  F.configure = function (o) { Object.assign(this.opt, o || {}); return this; };

  F.resize = function (w, h) {
    if (w === this._w && h === this._h) return;
    this._w = w; this._h = h;
    /* El resplandor se calcula a un sexto de resolución: el difuminado sale
       gratis al reducir y ampliar, y el coste baja treinta y seis veces. */
    const d = this.quality;
    this.a = buf(Math.max(4, Math.round(w / d)), Math.max(4, Math.round(h / d)));
    this.b = buf(Math.max(2, Math.round(w / (d * 2.2))), Math.max(2, Math.round(h / (d * 2.2))));
    this._vig = null;
  };

  /* Se llama justo después de que el juego haya dibujado su fotograma. */
  F.apply = function (dt) {
    if (!this.enabled) return;
    const E = this.E;
    const cv = E.canvas, ctx = E.ctx;
    const W = cv.width, H = cv.height;
    if (!W || !H) return;
    this.resize(W, H);
    const o = this.opt;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    /* --- resplandor --- */
    if (o.bloom > 0.01) {
      const a = this.a, b = this.b;
      const aw = a.c.width, ah = a.c.height;
      a.x.globalCompositeOperation = 'copy';
      a.x.globalAlpha = 1;
      a.x.drawImage(cv, 0, 0, aw, ah);
      /* multiplicar la imagen por sí misma deja solo lo verdaderamente brillante */
      a.x.globalCompositeOperation = 'multiply';
      for (let i = 0; i < o.threshold; i++) a.x.drawImage(a.c, 0, 0);
      /* segunda reducción: más difuminado, casi sin coste */
      b.x.globalCompositeOperation = 'copy';
      b.x.drawImage(a.c, 0, 0, b.c.width, b.c.height);

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = o.bloom;
      ctx.drawImage(b.c, 0, 0, W, H);
      ctx.globalAlpha = o.bloom * 0.5;
      ctx.drawImage(a.c, 0, 0, W, H);
    }

    /* --- viñeta --- */
    if (o.vignette > 0.01) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      if (!this._vig || this._vigW !== W) {
        /* se recalcula solo al cambiar el tamaño */
        const r = Math.hypot(W, H) * 0.62;
        const gd = ctx.createRadialGradient(W / 2, H / 2, r * 0.40, W / 2, H / 2, r);
        gd.addColorStop(0, 'rgba(0,0,0,0)');
        gd.addColorStop(0.62, 'rgba(0,0,0,' + (o.vignette * 0.35).toFixed(3) + ')');
        gd.addColorStop(1, 'rgba(0,0,0,' + o.vignette.toFixed(3) + ')');
        this._vig = gd; this._vigW = W;
      }
      ctx.fillStyle = this._vig;
      ctx.fillRect(0, 0, W, H);
    }

    /* --- grano --- */
    if (o.grain > 0.001) {
      this._gt += dt || 0.016;
      const tile = grainPattern(ctx);
      if (!this._pat) this._pat = ctx.createPattern(tile, 'repeat');
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = o.grain;
      const ox = ((this._gt * 613) | 0) % 128, oy = ((this._gt * 971) | 0) % 128;
      ctx.translate(-ox, -oy);
      ctx.fillStyle = this._pat;
      ctx.fillRect(0, 0, W + 128, H + 128);
      ctx.translate(ox, oy);
    }

    /* --- líneas de barrido --- */
    if (o.scanlines > 0.001) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = o.scanlines;
      ctx.fillStyle = '#000';
      const step = Math.max(2, Math.round(H / 320) * 2);
      for (let y = 0; y < H; y += step) ctx.fillRect(0, y, W, 1);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  NX.FX = FX;
})(typeof window !== 'undefined' ? window : globalThis);
