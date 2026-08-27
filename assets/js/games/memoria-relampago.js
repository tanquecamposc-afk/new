/* Memoria Relámpago — parejas de símbolos dibujados por código y cronómetro. */
NX.game('memoria-relampago', {
  w: 780, h: 640, pal: 'royal',
  music: { root: 50, scale: 'major', bpm: 78, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const LEVELS = [[3, 2], [4, 3], [5, 4], [6, 5]];
  const COLORS = ['#ff4d6d', '#22e0ff', '#ffd45e', '#4ade80', '#c084fc', '#ff8a3d', '#f0abfc', '#5b8cff',
                  '#5eead4', '#fb7185', '#a3e635', '#818cf8', '#facc15', '#38bdf8', '#e879f9'];

  let lvl, cols, rows, cards, flipped, matched, moves, t, done, cw, ch, OX, OY, lockT;

  function shape(g, kind, x, y, r, col, rot) {
    if (kind === 0) g.circle(x, y, r, col);
    else if (kind === 1) g.ngon(x, y, r, 4, rot, col);
    else if (kind === 2) g.ngon(x, y, r, 3, rot - Math.PI / 2, col);
    else if (kind === 3) g.star(x, y, r, r * 0.45, 5, rot, col);
    else if (kind === 4) { g.rect(x - r * 0.3, y - r, r * 0.6, r * 2, col); g.rect(x - r, y - r * 0.3, r * 2, r * 0.6, col); }
    else if (kind === 5) g.ngon(x, y, r, 6, rot, col);
    else if (kind === 6) { g.ring(x, y, r * 0.8, r * 0.35, col); }
    else if (kind === 7) G.Sprites.heart(g, x, y, r * 2.2, col);
    else if (kind === 8) { g.diamond(x, y, r * 0.8, r, col); }
    else if (kind === 9) { g.ngon(x, y, r, 5, rot - Math.PI / 2, col); }
    else if (kind === 10) { g.circle(x, y, r, col); g.circle(x, y, r * 0.45, alpha('#000', 0.35)); }
    else if (kind === 11) { g.star(x, y, r, r * 0.7, 8, rot, col); }
    else if (kind === 12) { g.rect(x - r, y - r * 0.35, r * 2, r * 0.7, col); g.rect(x - r * 0.35, y - r, r * 0.7, r * 2, col); }
    else if (kind === 13) { g.tri(x, y, r, rot, col); g.tri(x, y, r, rot + Math.PI, col); }
    else { g.ngon(x, y, r, 8, rot, col); }
  }

  function layout() {
    const availW = W - 60, availH = H - 200;
    const s = Math.min(availW / cols, availH / rows);
    cw = Math.floor(s * 0.92); ch = Math.floor(s * 0.92);
    OX = Math.round((W - cols * s) / 2 + (s - cw) / 2);
    OY = 130;
  }

  function reset(l) {
    lvl = l == null ? (lvl == null ? 1 : lvl) : l;
    [cols, rows] = LEVELS[lvl];
    layout();
    const pairs = (cols * rows) / 2;
    const ids = [];
    for (let i = 0; i < pairs; i++) ids.push(i, i);
    E.rng.shuffle(ids);
    cards = ids.map((id, i) => ({ id, up: false, done: false, flip: 0, i }));
    flipped = []; matched = 0; moves = 0; t = 0; done = false; lockT = 0;
    hud();
  }
  function hud() {
    E.api.hud({ Nivel: ['Muy fácil', 'Fácil', 'Media', 'Difícil'][lvl], Parejas: matched + '/' + (cols * rows / 2), Intentos: moves, Tiempo: M.fmtTime(t) });
  }

  reset(1);

  return {
    update(dt) {
      if (!done) { t += dt; if (Math.floor(t) !== Math.floor(t - dt)) hud(); }
      cards.forEach((c2) => { c2.flip = M.damp(c2.flip, (c2.up || c2.done) ? 1 : 0, 16, dt); });

      if (lockT > 0) {
        lockT -= dt;
        if (lockT <= 0) {
          const [a, b] = flipped;
          if (cards[a].id === cards[b].id) {
            cards[a].done = cards[b].done = true;
            matched++;
            E.sfx('select');
            E.particles.burst(OX + (a % cols) * cw * 1.08 + cw / 2, OY + Math.floor(a / cols) * ch * 1.08 + ch / 2, 8,
              { col: [COLORS[cards[a].id % COLORS.length]], speed1: 140, add: true });
            hud();
            if (matched === cols * rows / 2) {
              done = true;
              E.sfx('win');
              setTimeout(() => E.api.win({
                score: Math.max(0, (lvl + 1) * 3000 - moves * 60 - Math.round(t * 20)),
                title: '¡Todas las parejas!',
                msg: moves + ' intentos en ' + M.fmtTime(t),
                stats: { Intentos: moves, Tiempo: M.fmtTime(t) },
              }), 500);
            }
          } else {
            cards[a].up = cards[b].up = false;
            E.sfx('error');
          }
          flipped = [];
        }
        return;
      }

      const p = E.input.pointer;
      if (p.pressed) {
        if (p.y > 62 && p.y < 96) {
          for (let i = 0; i < 4; i++) {
            const x = W / 2 - 200 + i * 102;
            if (p.x > x && p.x < x + 94) { reset(i); E.sfx('select'); return; }
          }
        }
        const sx = cw * 1.08, sy = ch * 1.08;
        const c = Math.floor((p.x - OX) / sx), r = Math.floor((p.y - OY) / sy);
        if (c >= 0 && c < cols && r >= 0 && r < rows) {
          const i = r * cols + c;
          const card = cards[i];
          if (card.done || card.up || flipped.length >= 2) return;
          card.up = true;
          flipped.push(i);
          E.sfx('card');
          if (flipped.length === 2) { moves++; lockT = 0.65; hud(); }
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.text('MEMORIA RELÁMPAGO', W / 2, 44, { size: 22, align: 'center', weight: 900, color: P.ink, letterSpacing: 2 });
      for (let i = 0; i < 4; i++) {
        const x = W / 2 - 200 + i * 102;
        const on = i === lvl;
        g.rrect(x, 64, 94, 30, 9, on ? P.a : 'rgba(255,255,255,.06)');
        g.text(['Muy fácil', 'Fácil', 'Media', 'Difícil'][i], x + 47, 84,
          { size: 12, align: 'center', weight: 800, color: on ? '#0d1220' : P.dim });
      }

      const sx = cw * 1.08, sy = ch * 1.08;
      cards.forEach((card, i) => {
        const cc = i % cols, r = Math.floor(i / cols);
        const x = OX + cc * sx, y = OY + r * sy;
        const f = card.flip;
        const scale = Math.abs(Math.cos(f * Math.PI));
        c.save();
        c.translate(x + cw / 2, y + ch / 2);
        c.scale(Math.max(0.04, f < 0.5 ? Math.cos(f * Math.PI) : -Math.cos(f * Math.PI)), 1);
        if (f < 0.5) {
          g.rrect(-cw / 2, -ch / 2, cw, ch, 12, mix(P.d, P.deep, 0.2));
          g.rrectStroke(-cw / 2 + 6, -ch / 2 + 6, cw - 12, ch - 12, 8, alpha(P.a, 0.4), 1.5);
          g.text('?', 0, ch * 0.14, { size: ch * 0.38, align: 'center', color: alpha(P.a, 0.55), weight: 900 });
        } else {
          const col = COLORS[card.id % COLORS.length];
          g.rrect(-cw / 2, -ch / 2, cw, ch, 12, card.done ? alpha(col, 0.25) : '#f4f7ff');
          g.rrectStroke(-cw / 2, -ch / 2, cw, ch, 12, card.done ? col : alpha('#000', 0.15), card.done ? 2.5 : 1);
          shape(g, card.id % 15, 0, 0, Math.min(cw, ch) * 0.28, col, card.id);
        }
        c.restore();
      });

      E.particles.draw(g);
      E.ui.hint('Encuentra las parejas en el menor número de intentos', { bottom: 22 });
    },
  };
});
