/* NEXO ARCADE — engine/ui.js
   Widgets dibujados en el lienzo, rejillas para juegos de tablero y baraja. */
(function (global) {
  'use strict';
  const NX = (global.NX = global.NX || {});
  const M = NX.M, GFX = NX.GFX;
  const { alpha, mix } = GFX;
  const { clamp, clamp01, lerp, TAU } = M;

  function UI(E) { this.E = E; this._hot = null; }
  const U = UI.prototype;

  U.panel = function (x, y, w, h, o) {
    o = o || {};
    const g = this.E.g, pal = this.E.pal;
    const c = g.ctx;
    c.save();
    if (o.shadow !== false) { c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 24; c.shadowOffsetY = 8; }
    g.rrect(x, y, w, h, o.r == null ? 18 : o.r, o.fill || 'rgba(14,20,36,.86)');
    c.restore();
    g.rrectStroke(x, y, w, h, o.r == null ? 18 : o.r, o.stroke || alpha(pal.a, 0.22), o.lw || 1.5);
    if (o.title) {
      g.text(o.title, x + (o.pad || 18), y + 30, { size: o.titleSize || 20, color: pal.ink, weight: 800 });
    }
    return this;
  };

  U.button = function (x, y, w, h, label, o) {
    o = o || {};
    const E = this.E, g = E.g, pal = E.pal;
    const p = E.input.pointer;
    const hover = p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
    const active = hover && p.down;
    const clicked = hover && p.released && !o.disabled;
    const base = o.color || pal.a;
    const c = g.ctx;
    c.save();
    if (o.disabled) c.globalAlpha = 0.4;
    if (hover && !o.disabled) { c.shadowColor = alpha(base, 0.5); c.shadowBlur = 22; }
    const fill = o.ghost
      ? (hover ? alpha(base, 0.16) : 'rgba(255,255,255,.04)')
      : g.linGrad(x, y, x, y + h, [[0, mix(base, '#ffffff', hover ? 0.28 : 0.12)], [1, mix(base, '#000000', active ? 0.34 : 0.18)]]);
    g.rrect(x, y + (active ? 2 : 0), w, h, o.r == null ? 14 : o.r, fill);
    c.restore();
    g.rrectStroke(x, y + (active ? 2 : 0), w, h, o.r == null ? 14 : o.r,
      o.ghost ? alpha(base, hover ? 0.75 : 0.35) : alpha('#ffffff', 0.22), 1.5);
    g.text(label, x + w / 2, y + h / 2 + (o.size || 18) * 0.35 + (active ? 2 : 0), {
      size: o.size || 18, align: 'center', weight: 800,
      color: o.ghost ? (hover ? pal.ink : pal.dim) : '#0b0f1a',
    });
    if (hover && !o.disabled) E.canvas.style.cursor = 'pointer';
    return { hover, clicked, active };
  };

  U.bar = function (x, y, w, h, pct, o) {
    o = o || {};
    const g = this.E.g, pal = this.E.pal;
    g.rrect(x, y, w, h, h / 2, o.bg || 'rgba(255,255,255,.10)');
    const p = clamp01(pct);
    if (p > 0) {
      const col = o.col || pal.a;
      const grad = g.linGrad(x, y, x + w, y, [[0, col], [1, o.col2 || mix(col, '#ffffff', 0.35)]]);
      g.rrect(x, y, Math.max(h, w * p), h, h / 2, grad);
    }
    if (o.stroke) g.rrectStroke(x, y, w, h, h / 2, o.stroke, 1);
    if (o.label) g.text(o.label, x + w / 2, y + h / 2 + 4, { size: h * 0.72, align: 'center', color: '#fff', weight: 800 });
    return this;
  };

  U.ring = function (x, y, r, pct, o) {
    o = o || {};
    const g = this.E.g, pal = this.E.pal;
    g.ring(x, y, r, o.lw || 8, o.bg || 'rgba(255,255,255,.10)');
    const c = g.ctx;
    c.lineCap = 'round';
    g.ring(x, y, r, o.lw || 8, o.col || pal.a, -Math.PI / 2, -Math.PI / 2 + TAU * clamp01(pct));
    c.lineCap = 'butt';
    return this;
  };

  /* Título grande con degradado y sombra. */
  U.title = function (txt, x, y, o) {
    o = o || {};
    const g = this.E.g, pal = this.E.pal;
    const size = o.size || 54;
    const grad = g.linGrad(x - 200, y - size, x + 200, y, [[0, o.c1 || pal.a], [1, o.c2 || pal.b]]);
    g.text(txt, x, y, {
      size, align: o.align || 'center', weight: 900, color: grad,
      stroke: o.stroke || 'rgba(0,0,0,.55)', strokeWidth: o.strokeWidth || 8,
      shadow: alpha(o.c1 || pal.a, 0.5), shadowBlur: 26, letterSpacing: o.letterSpacing,
    });
    return this;
  };

  /* Cartel inferior con la pista de controles. */
  U.hint = function (txt, o) {
    o = o || {};
    const E = this.E, g = E.g;
    const w = g.textW(txt, 15, 600) + 34;
    const x = E.W / 2 - w / 2, y = E.H - (o.bottom || 34);
    g.ctx.save(); g.ctx.globalAlpha = o.alpha == null ? 0.82 : o.alpha;
    g.rrect(x, y - 15, w, 30, 15, 'rgba(8,12,22,.7)');
    g.text(txt, E.W / 2, y + 5, { size: 15, align: 'center', color: E.pal.dim, weight: 600 });
    g.ctx.restore();
    return this;
  };

  /* Capa oscura para menús dentro del lienzo. */
  U.scrim = function (a) {
    const g = this.E.g;
    g.rect(0, 0, this.E.W, this.E.H, 'rgba(4,7,14,' + (a == null ? 0.72 : a) + ')');
    return this;
  };

  /* Marcador tipo arcade en una esquina. */
  U.stat = function (x, y, label, value, o) {
    o = o || {};
    const g = this.E.g, pal = this.E.pal;
    const al = o.align || 'left';
    g.text(label.toUpperCase(), x, y, { size: 12, color: pal.dim, weight: 800, align: al, letterSpacing: 1.5 });
    g.text(String(value), x, y + (o.gap || 26), {
      size: o.size || 30, color: o.color || pal.ink, weight: 900, align: al,
      shadow: alpha(o.color || pal.a, 0.35), shadowBlur: 14,
    });
    return this;
  };

  /* ------------------------------------------------------------- Grid */
  /* Rejilla reutilizable por los juegos de tablero. */
  function Grid(cols, rows, cw, ch, ox, oy) {
    this.cols = cols; this.rows = rows;
    this.cw = cw; this.ch = ch == null ? cw : ch;
    this.ox = ox || 0; this.oy = oy || 0;
  }
  Grid.prototype.fit = function (W, H, pad, cols, rows) {
    cols = cols || this.cols; rows = rows || this.rows;
    const s = Math.floor(Math.min((W - pad * 2) / cols, (H - pad * 2) / rows));
    this.cw = this.ch = s;
    this.ox = Math.round((W - s * cols) / 2);
    this.oy = Math.round((H - s * rows) / 2);
    return this;
  };
  Grid.prototype.x = function (c) { return this.ox + c * this.cw; };
  Grid.prototype.y = function (r) { return this.oy + r * this.ch; };
  Grid.prototype.cx = function (c) { return this.ox + c * this.cw + this.cw / 2; };
  Grid.prototype.cy = function (r) { return this.oy + r * this.ch + this.ch / 2; };
  Grid.prototype.at = function (px, py) {
    const c = Math.floor((px - this.ox) / this.cw), r = Math.floor((py - this.oy) / this.ch);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return null;
    return { c, r, i: r * this.cols + c };
  };
  Grid.prototype.inside = function (c, r) { return c >= 0 && r >= 0 && c < this.cols && r < this.rows; };
  Grid.prototype.each = function (fn) {
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) fn(c, r, r * this.cols + c);
  };
  Grid.prototype.w = function () { return this.cols * this.cw; };
  Grid.prototype.h = function () { return this.rows * this.ch; };
  /* Dibuja el tablero base con líneas suaves. */
  Grid.prototype.draw = function (g, o) {
    o = o || {};
    const W = this.w(), H = this.h();
    if (o.fill) g.rrect(this.ox, this.oy, W, H, o.r == null ? 12 : o.r, o.fill);
    if (o.line) {
      const c = g.ctx;
      c.save(); c.strokeStyle = o.line; c.lineWidth = o.lw || 1;
      c.beginPath();
      for (let i = 0; i <= this.cols; i++) { c.moveTo(this.x(i), this.oy); c.lineTo(this.x(i), this.oy + H); }
      for (let j = 0; j <= this.rows; j++) { c.moveTo(this.ox, this.y(j)); c.lineTo(this.ox + W, this.y(j)); }
      c.stroke(); c.restore();
    }
    if (o.stroke) g.rrectStroke(this.ox, this.oy, W, H, o.r == null ? 12 : o.r, o.stroke, o.slw || 2);
    return this;
  };

  /* ------------------------------------------------------------ Cartas */
  const SUITS = [
    { s: '♠', name: 'picas', red: false },
    { s: '♥', name: 'corazones', red: true },
    { s: '♦', name: 'diamantes', red: true },
    { s: '♣', name: 'tréboles', red: false },
  ];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const Cards = {
    SUITS, RANKS,
    deck(rng) {
      const d = [];
      for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) d.push({ s, r, up: false });
      return rng ? rng.shuffle(d) : d;
    },
    /* Dibuja una carta con caras vectoriales. */
    draw(g, card, x, y, w, h, o) {
      o = o || {};
      const r = Math.min(10, w * 0.11);
      const c = g.ctx;
      c.save();
      c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = o.lift ? 18 : 8; c.shadowOffsetY = o.lift ? 8 : 3;
      if (!card || card.up === false) {
        g.rrect(x, y, w, h, r, '#1a2f5e');
        c.shadowBlur = 0;
        g.rrectStroke(x + 4, y + 4, w - 8, h - 8, r * 0.7, 'rgba(120,180,255,.45)', 1.5);
        for (let i = 0; i < 5; i++) {
          g.circle(x + w / 2, y + h * (0.22 + i * 0.14), w * 0.07, 'rgba(120,180,255,.28)');
        }
        c.restore();
        return;
      }
      g.rrect(x, y, w, h, r, o.face || '#f7f9ff');
      c.shadowBlur = 0;
      g.rrectStroke(x, y, w, h, r, o.sel ? '#ffd45e' : 'rgba(0,0,0,.18)', o.sel ? 3 : 1);
      const su = SUITS[card.s], col = su.red ? '#e03b52' : '#1b2437';
      const fs = Math.max(10, w * 0.3);
      g.text(RANKS[card.r], x + w * 0.11, y + fs * 1.05, { size: fs, color: col, weight: 800 });
      g.text(su.s, x + w * 0.11, y + fs * 1.95, { size: fs * 0.8, color: col, weight: 700 });
      g.text(su.s, x + w * 0.62, y + h * 0.92, { size: w * 0.44, color: col, weight: 700 });
      c.restore();
    },
  };

  NX.UI = UI;
  NX.Grid = Grid;
  NX.Cards = Cards;
})(typeof window !== 'undefined' ? window : globalThis);
