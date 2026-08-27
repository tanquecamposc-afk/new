/* Solitario Klondike — arrastre suave, deshacer y reparto siempre jugable. */
NX.game('solitario-klondike', {
  w: 900, h: 660, pal: 'forest',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const C = NX.Cards;
  const W = E.opts.w, H = E.opts.h;
  const CW = 82, CH = 116, GAP = 18, FAN = 26;
  const TOP = 90, TABLE_Y = TOP + CH + 34;

  let stock, waste, found, cols, drag, moves, t, won, hist, score;

  function reset() {
    const deck = C.deck(E.rng);
    cols = [];
    let k = 0;
    for (let i = 0; i < 7; i++) {
      const col = [];
      for (let j = 0; j <= i; j++) {
        const card = deck[k++];
        card.up = j === i;
        col.push(card);
      }
      cols.push(col);
    }
    stock = deck.slice(k);
    stock.forEach((c2) => { c2.up = false; });
    waste = [];
    found = [[], [], [], []];
    drag = null; moves = 0; t = 0; won = false; hist = []; score = 0;
    hud();
  }
  function hud() {
    E.api.hud({ Movimientos: moves, Tiempo: M.fmtTime(t), Fundación: found.reduce((a, f) => a + f.length, 0) + '/52' });
  }

  const colX = (i) => 40 + i * (CW + GAP);
  const foundX = (i) => W - 40 - (4 - i) * (CW + GAP) + GAP;

  function snapshot() {
    hist.push(JSON.stringify({ stock, waste, found, cols }));
    if (hist.length > 40) hist.shift();
  }
  function undo() {
    if (!hist.length) return;
    const s = JSON.parse(hist.pop());
    stock = s.stock; waste = s.waste; found = s.found; cols = s.cols;
    moves = Math.max(0, moves - 1);
    E.sfx('close');
    hud();
  }

  const red = (c2) => c2.s === 1 || c2.s === 2;

  function canStack(card, onto) {
    if (!onto) return card.r === 12;
    return onto.up && red(card) !== red(onto) && card.r === onto.r - 1;
  }
  function canFound(card, pile) {
    if (!pile.length) return card.r === 0;
    const top = pile[pile.length - 1];
    return top.s === card.s && card.r === top.r + 1;
  }

  function tryAutoFound(card, from) {
    for (let i = 0; i < 4; i++) {
      if (canFound(card, found[i])) {
        snapshot();
        from.pop();
        found[i].push(card);
        moves++; score += 15;
        E.sfx('coin');
        flipTops();
        hud(); checkWin();
        return true;
      }
    }
    return false;
  }

  function flipTops() {
    cols.forEach((col) => {
      const top = col[col.length - 1];
      if (top && !top.up) { top.up = true; score += 5; E.sfx('card'); }
    });
  }

  function checkWin() {
    if (found.reduce((a, f) => a + f.length, 0) === 52) {
      won = true;
      E.sfx('win');
      setTimeout(() => E.api.win({
        score: Math.max(0, 12000 - moves * 20 - Math.round(t * 8)),
        title: '¡Solitario resuelto!',
        msg: moves + ' movimientos en ' + M.fmtTime(t),
        stats: { Movimientos: moves, Tiempo: M.fmtTime(t) },
      }), 700);
    }
  }

  function hit(x, y) {
    /* mazo */
    if (x > 40 && x < 40 + CW && y > TOP && y < TOP + CH) return { type: 'stock' };
    if (x > 40 + CW + GAP && x < 40 + CW * 2 + GAP && y > TOP && y < TOP + CH && waste.length) {
      return { type: 'waste' };
    }
    for (let i = 0; i < 4; i++) {
      if (x > foundX(i) && x < foundX(i) + CW && y > TOP && y < TOP + CH) return { type: 'found', i };
    }
    for (let i = 0; i < 7; i++) {
      const cx = colX(i);
      if (x < cx || x > cx + CW) continue;
      const col = cols[i];
      for (let j = col.length - 1; j >= 0; j--) {
        const cy = TABLE_Y + j * FAN;
        if (y > cy && y < cy + (j === col.length - 1 ? CH : FAN)) return { type: 'col', i, j };
      }
      if (!col.length && y > TABLE_Y && y < TABLE_Y + CH) return { type: 'col', i, j: -1 };
    }
    return null;
  }

  reset();

  return {
    update(dt) {
      if (!won) { t += dt; if (Math.floor(t) !== Math.floor(t - dt)) hud(); }
      const p = E.input.pointer;

      if (p.pressed) {
        if (p.y > H - 60) {
          if (Math.abs(p.x - 90) < 60) { undo(); return; }
          if (Math.abs(p.x - 220) < 60) { reset(); E.sfx('select'); return; }
        }
        const h = hit(p.x, p.y);
        if (!h) return;
        if (h.type === 'stock') {
          snapshot();
          if (stock.length) {
            for (let i = 0; i < 3 && stock.length; i++) {
              const c2 = stock.pop(); c2.up = true; waste.push(c2);
            }
            E.sfx('card');
          } else if (waste.length) {
            stock = waste.reverse();
            stock.forEach((c2) => { c2.up = false; });
            waste = [];
            score = Math.max(0, score - 20);
            E.sfx('swoosh');
          }
          moves++; hud();
          return;
        }
        if (h.type === 'waste') {
          const card = waste[waste.length - 1];
          if (p.moved < 4 && tryAutoFound(card, waste)) return;
          drag = { cards: [card], from: { type: 'waste' }, dx: p.x - (40 + CW + GAP), dy: p.y - TOP };
          return;
        }
        if (h.type === 'found') {
          const pile = found[h.i];
          if (!pile.length) return;
          drag = { cards: [pile[pile.length - 1]], from: { type: 'found', i: h.i },
            dx: p.x - foundX(h.i), dy: p.y - TOP };
          return;
        }
        if (h.type === 'col' && h.j >= 0) {
          const col = cols[h.i];
          const card = col[h.j];
          if (!card.up) return;
          if (h.j === col.length - 1 && tryAutoFound(card, col)) return;
          drag = { cards: col.slice(h.j), from: { type: 'col', i: h.i, j: h.j },
            dx: p.x - colX(h.i), dy: p.y - (TABLE_Y + h.j * FAN) };
        }
      }

      if (p.released && drag) {
        const h = hit(p.x - drag.dx + CW / 2, p.y - drag.dy + 20);
        let ok = false;
        if (h && h.type === 'col') {
          const col = cols[h.i];
          const top = col[col.length - 1];
          if (canStack(drag.cards[0], top) || (!col.length && drag.cards[0].r === 12)) {
            snapshot();
            removeDragged();
            cols[h.i] = col.concat(drag.cards);
            ok = true; score += 5;
          }
        } else if (h && h.type === 'found' && drag.cards.length === 1) {
          if (canFound(drag.cards[0], found[h.i])) {
            snapshot();
            removeDragged();
            found[h.i].push(drag.cards[0]);
            ok = true; score += 15;
          }
        }
        if (ok) { moves++; E.sfx('place'); flipTops(); hud(); checkWin(); }
        else E.sfx('error');
        drag = null;
      }

      function removeDragged() {
        const f = drag.from;
        if (f.type === 'waste') waste.pop();
        else if (f.type === 'found') found[f.i].pop();
        else cols[f.i] = cols[f.i].slice(0, f.j);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix('#12603c', P.deep, 0.35), mix('#0b3d26', P.deep, 0.3));
      for (let i = 0; i < 40; i++) g.circle((i * 137) % W, (i * 91) % H, 40, alpha('#ffffff', 0.006));

      /* mazo */
      if (stock.length) C.draw(g, null, 40, TOP, CW, CH, {});
      else {
        g.rrectStroke(40, TOP, CW, CH, 10, alpha('#ffffff', 0.25), 2);
        g.text('↻', 40 + CW / 2, TOP + CH / 2 + 12, { size: 30, align: 'center', color: alpha('#fff', 0.4) });
      }
      g.text(String(stock.length), 40 + CW / 2, TOP - 8, { size: 12, align: 'center', color: alpha('#fff', 0.5), weight: 800 });

      /* descarte */
      waste.slice(-3).forEach((card, i, arr) => {
        if (drag && drag.from.type === 'waste' && i === arr.length - 1) return;
        C.draw(g, card, 40 + CW + GAP + i * 16, TOP, CW, CH, {});
      });

      /* fundaciones */
      for (let i = 0; i < 4; i++) {
        const x = foundX(i);
        g.rrectStroke(x, TOP, CW, CH, 10, alpha('#ffffff', 0.22), 2);
        g.text(C.SUITS[i].s, x + CW / 2, TOP + CH / 2 + 12,
          { size: 34, align: 'center', color: alpha('#ffffff', 0.14) });
        const pile = found[i];
        if (pile.length) {
          const skip = drag && drag.from.type === 'found' && drag.from.i === i;
          const card = pile[pile.length - 1];
          if (!skip) C.draw(g, card, x, TOP, CW, CH, {});
        }
      }

      /* columnas */
      cols.forEach((col, i) => {
        const x = colX(i);
        if (!col.length) g.rrectStroke(x, TABLE_Y, CW, CH, 10, alpha('#ffffff', 0.18), 2);
        col.forEach((card, j) => {
          if (drag && drag.from.type === 'col' && drag.from.i === i && j >= drag.from.j) return;
          C.draw(g, card, x, TABLE_Y + j * FAN, CW, CH, {});
        });
      });

      if (drag) {
        const p = E.input.pointer;
        drag.cards.forEach((card, i) => {
          C.draw(g, card, p.x - drag.dx, p.y - drag.dy + i * FAN, CW, CH, { lift: true });
        });
      }

      const btn = (x, label) => {
        const hov = E.input.pointer.y > H - 60 && Math.abs(E.input.pointer.x - x) < 60;
        g.rrect(x - 60, H - 56, 120, 40, 11, hov ? alpha(P.a, 0.35) : 'rgba(255,255,255,.1)');
        g.text(label, x, H - 30, { size: 14, align: 'center', weight: 800, color: '#fff' });
      };
      btn(90, '↶ Deshacer');
      btn(220, '↺ Nueva');
      g.text('Puntos: ' + score, W - 40, H - 30, { size: 15, align: 'right', weight: 800, color: alpha('#fff', 0.8), mono: true });
    },
  };
});
