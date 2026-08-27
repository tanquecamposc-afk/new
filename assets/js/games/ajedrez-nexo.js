/* Ajedrez Nexo — reglas completas (enroque, al paso, coronación) e IA con alfa-beta. */
NX.game('ajedrez-nexo', {
  w: 700, h: 760, pal: 'mono',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const CELL = Math.floor(Math.min((W - 60) / 8, (H - 240) / 8));
  const OX = Math.round((W - CELL * 8) / 2), OY = 130;
  const LEVELS = [['Principiante', 2], ['Aficionado', 3], ['Club', 4]];
  const GLYPH = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', PW: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

  /* Tablas de posición (desde la perspectiva de las blancas). */
  const PST = {
    p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10,
        5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5,
        5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
    n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30,
        -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30,
        -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
    b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10,
        -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10,
        -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
    r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
        -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
    q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10,
        -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10,
        -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
    k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10,
        20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
  };

  let b, turn, sel, legalCache, over, lvl, thinking, hist, msg, msgT, lastMove, checkSq, promo;

  const isWhite = (p) => p && p === p.toUpperCase();
  const kind = (p) => p ? p.toLowerCase() : null;

  function reset(l) {
    lvl = l == null ? (lvl == null ? 1 : lvl) : l;
    b = {
      sq: 'rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR'.split(''),
      wk: true, wq: true, bk: true, bq: true, ep: -1, half: 0,
    };
    for (let i = 0; i < 64; i++) if (b.sq[i] === '.') b.sq[i] = '';
    turn = 'w'; sel = null; over = false; thinking = 0; hist = []; msg = ''; msgT = 0;
    lastMove = null; checkSq = -1; promo = null;
    legalCache = null;
    hud();
  }
  function hud() {
    E.api.hud({ Turno: over ? '—' : (turn === 'w' ? 'Blancas (tú)' : 'Negras'), Jugadas: hist.length, Nivel: LEVELS[lvl][0] });
  }

  /* ------------------------------------------------ generación de jugadas */
  const OFF = { n: [-17, -15, -10, -6, 6, 10, 15, 17], b: [-9, -7, 7, 9], r: [-8, -1, 1, 8], q: [-9, -8, -7, -1, 1, 7, 8, 9], k: [-9, -8, -7, -1, 1, 7, 8, 9] };
  const file = (i) => i % 8, rank = (i) => Math.floor(i / 8);

  function gen(st, side, onlyCaps) {
    const out = [];
    for (let i = 0; i < 64; i++) {
      const p = st.sq[i];
      if (!p) continue;
      if ((side === 'w') !== isWhite(p)) continue;
      const k = kind(p);
      if (k === 'p') {
        const dir = side === 'w' ? -8 : 8;
        const start = side === 'w' ? 6 : 1;
        const last = side === 'w' ? 0 : 7;
        const one = i + dir;
        if (one >= 0 && one < 64 && !st.sq[one] && !onlyCaps) {
          if (rank(one) === last) ['q', 'r', 'b', 'n'].forEach((pr) => out.push({ f: i, t: one, promo: pr }));
          else {
            out.push({ f: i, t: one });
            const two = i + dir * 2;
            if (rank(i) === start && !st.sq[two]) out.push({ f: i, t: two, dbl: true });
          }
        }
        [-1, 1].forEach((dx) => {
          const t = i + dir + dx;
          if (t < 0 || t > 63 || Math.abs(file(t) - file(i)) !== 1) return;
          if (st.sq[t] && isWhite(st.sq[t]) !== (side === 'w')) {
            if (rank(t) === last) ['q', 'r', 'b', 'n'].forEach((pr) => out.push({ f: i, t, promo: pr, cap: true }));
            else out.push({ f: i, t, cap: true });
          } else if (t === st.ep) out.push({ f: i, t, ep: true, cap: true });
        });
      } else if (k === 'n' || k === 'k') {
        OFF[k].forEach((o) => {
          const t = i + o;
          if (t < 0 || t > 63) return;
          const df = Math.abs(file(t) - file(i));
          if (k === 'n' ? df > 2 : df > 1) return;
          const q = st.sq[t];
          if (q && isWhite(q) === (side === 'w')) return;
          if (onlyCaps && !q) return;
          out.push({ f: i, t, cap: !!q });
        });
      } else {
        OFF[k].forEach((o) => {
          let t = i;
          while (true) {
            const prev = t;
            t += o;
            if (t < 0 || t > 63) break;
            if (Math.abs(file(t) - file(prev)) > 1) break;
            const q = st.sq[t];
            if (q && isWhite(q) === (side === 'w')) break;
            if (!onlyCaps || q) out.push({ f: i, t, cap: !!q });
            if (q) break;
          }
        });
      }
    }
    /* enroque */
    if (!onlyCaps) {
      if (side === 'w' && !attacked(st, 60, 'b')) {
        if (st.wk && !st.sq[61] && !st.sq[62] && st.sq[63] === 'R' &&
            !attacked(st, 61, 'b') && !attacked(st, 62, 'b')) out.push({ f: 60, t: 62, castle: 'wk' });
        if (st.wq && !st.sq[59] && !st.sq[58] && !st.sq[57] && st.sq[56] === 'R' &&
            !attacked(st, 59, 'b') && !attacked(st, 58, 'b')) out.push({ f: 60, t: 58, castle: 'wq' });
      }
      if (side === 'b' && !attacked(st, 4, 'w')) {
        if (st.bk && !st.sq[5] && !st.sq[6] && st.sq[7] === 'r' &&
            !attacked(st, 5, 'w') && !attacked(st, 6, 'w')) out.push({ f: 4, t: 6, castle: 'bk' });
        if (st.bq && !st.sq[3] && !st.sq[2] && !st.sq[1] && st.sq[0] === 'r' &&
            !attacked(st, 3, 'w') && !attacked(st, 2, 'w')) out.push({ f: 4, t: 2, castle: 'bq' });
      }
    }
    return out;
  }

  function attacked(st, sq, by) {
    const w = by === 'w';
    /* peones */
    const pd = w ? 1 : -1;
    [-1, 1].forEach(() => {});
    for (const dx of [-1, 1]) {
      const t = sq + pd * 8 + dx;
      if (t >= 0 && t < 64 && Math.abs(file(t) - file(sq)) === 1) {
        const p = st.sq[t];
        if (p && kind(p) === 'p' && isWhite(p) === w) return true;
      }
    }
    for (const o of OFF.n) {
      const t = sq + o;
      if (t < 0 || t > 63 || Math.abs(file(t) - file(sq)) > 2) continue;
      const p = st.sq[t];
      if (p && kind(p) === 'n' && isWhite(p) === w) return true;
    }
    for (const o of OFF.k) {
      const t = sq + o;
      if (t < 0 || t > 63 || Math.abs(file(t) - file(sq)) > 1) continue;
      const p = st.sq[t];
      if (p && kind(p) === 'k' && isWhite(p) === w) return true;
    }
    for (const o of OFF.b) {
      let t = sq;
      while (true) {
        const prev = t; t += o;
        if (t < 0 || t > 63 || Math.abs(file(t) - file(prev)) > 1) break;
        const p = st.sq[t];
        if (p) { if (isWhite(p) === w && (kind(p) === 'b' || kind(p) === 'q')) return true; break; }
      }
    }
    for (const o of OFF.r) {
      let t = sq;
      while (true) {
        const prev = t; t += o;
        if (t < 0 || t > 63 || Math.abs(file(t) - file(prev)) > 1) break;
        const p = st.sq[t];
        if (p) { if (isWhite(p) === w && (kind(p) === 'r' || kind(p) === 'q')) return true; break; }
      }
    }
    return false;
  }

  function kingSq(st, side) {
    const K = side === 'w' ? 'K' : 'k';
    for (let i = 0; i < 64; i++) if (st.sq[i] === K) return i;
    return -1;
  }

  function make(st, m) {
    const ns = { sq: st.sq.slice(), wk: st.wk, wq: st.wq, bk: st.bk, bq: st.bq, ep: -1, half: st.half + 1 };
    const p = ns.sq[m.f];
    if (kind(p) === 'p' || m.cap) ns.half = 0;
    ns.sq[m.t] = m.promo ? (isWhite(p) ? m.promo.toUpperCase() : m.promo) : p;
    ns.sq[m.f] = '';
    if (m.ep) ns.sq[m.t + (isWhite(p) ? 8 : -8)] = '';
    if (m.dbl) ns.ep = m.f + (isWhite(p) ? -8 : 8);
    if (m.castle === 'wk') { ns.sq[61] = 'R'; ns.sq[63] = ''; }
    if (m.castle === 'wq') { ns.sq[59] = 'R'; ns.sq[56] = ''; }
    if (m.castle === 'bk') { ns.sq[5] = 'r'; ns.sq[7] = ''; }
    if (m.castle === 'bq') { ns.sq[3] = 'r'; ns.sq[0] = ''; }
    if (p === 'K') { ns.wk = ns.wq = false; }
    if (p === 'k') { ns.bk = ns.bq = false; }
    if (m.f === 56 || m.t === 56) ns.wq = false;
    if (m.f === 63 || m.t === 63) ns.wk = false;
    if (m.f === 0 || m.t === 0) ns.bq = false;
    if (m.f === 7 || m.t === 7) ns.bk = false;
    return ns;
  }

  function legal(st, side) {
    return gen(st, side).filter((m) => {
      const ns = make(st, m);
      return !attacked(ns, kingSq(ns, side), side === 'w' ? 'b' : 'w');
    });
  }

  function evaluate(st) {
    let s = 0;
    for (let i = 0; i < 64; i++) {
      const p = st.sq[i];
      if (!p) continue;
      const k = kind(p);
      const w = isWhite(p);
      const pst = PST[k][w ? i : 63 - i];
      s += (w ? 1 : -1) * (VAL[k] + pst);
    }
    return s;
  }

  function quiesce(st, a, bb, side) {
    let stand = evaluate(st) * (side === 'w' ? 1 : -1);
    if (stand >= bb) return bb;
    if (a < stand) a = stand;
    const caps = gen(st, side, true);
    for (const m of caps) {
      const ns = make(st, m);
      if (attacked(ns, kingSq(ns, side), side === 'w' ? 'b' : 'w')) continue;
      const sc = -quiesce(ns, -bb, -a, side === 'w' ? 'b' : 'w');
      if (sc >= bb) return bb;
      if (sc > a) a = sc;
    }
    return a;
  }

  function negamax(st, depth, a, bb, side) {
    if (depth === 0) return { s: quiesce(st, a, bb, side) };
    const mv = legal(st, side);
    if (!mv.length) {
      const inCheck = attacked(st, kingSq(st, side), side === 'w' ? 'b' : 'w');
      return { s: inCheck ? -30000 + (4 - depth) : 0 };
    }
    mv.sort((x, y) => (y.cap ? 1 : 0) - (x.cap ? 1 : 0));
    let best = { s: -Infinity, m: mv[0] };
    for (const m of mv) {
      const ns = make(st, m);
      const sc = -negamax(ns, depth - 1, -bb, -a, side === 'w' ? 'b' : 'w').s;
      if (sc > best.s) best = { s: sc, m };
      if (sc > a) a = sc;
      if (a >= bb) break;
    }
    return best;
  }

  function afterMove() {
    const side = turn;
    checkSq = attacked(b, kingSq(b, side), side === 'w' ? 'b' : 'w') ? kingSq(b, side) : -1;
    const mv = legal(b, side);
    if (!mv.length) {
      over = true;
      const mate = checkSq >= 0;
      E.sfx(side === 'b' && mate ? 'win' : 'lose');
      setTimeout(() => {
        const won = mate && side === 'b';
        const o = { score: won ? 5000 - hist.length * 20 : 0,
          title: mate ? (won ? '¡Jaque mate!' : 'Jaque mate') : 'Tablas por ahogado',
          msg: hist.length + ' jugadas · ' + LEVELS[lvl][0], stats: { Jugadas: hist.length } };
        won ? E.api.win(o) : E.api.over(o);
      }, 900);
      return;
    }
    if (checkSq >= 0) { msg = '¡Jaque!'; msgT = 1.4; E.sfx('alarm'); }
    hud();
    if (side === 'b') thinking = 0.4;
  }

  function applyMove(m) {
    b = make(b, m);
    hist.push(m);
    lastMove = m;
    E.sfx(m.cap ? 'hit' : 'place');
    if (m.cap) E.particles.burst(OX + (m.t % 8) * CELL + CELL / 2, OY + Math.floor(m.t / 8) * CELL + CELL / 2,
      8, { col: [P.c], speed1: 150, add: true });
    turn = turn === 'w' ? 'b' : 'w';
    sel = null;
    afterMove();
  }

  function aiMove() {
    const res = negamax(b, LEVELS[lvl][1], -Infinity, Infinity, 'b');
    const mv = legal(b, 'b');
    applyMove(res.m || E.rng.pick(mv));
  }

  reset(1);

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (thinking > 0) { thinking -= dt; if (thinking <= 0) aiMove(); return; }
      if (over || turn !== 'w') return;

      const p = E.input.pointer;
      if (!p.pressed) return;
      if (p.y > 66 && p.y < 100) {
        for (let i = 0; i < LEVELS.length; i++) {
          const x = W / 2 - 230 + i * 156;
          if (p.x > x && p.x < x + 148) { reset(i); E.sfx('select'); return; }
        }
      }
      const c = Math.floor((p.x - OX) / CELL), r = Math.floor((p.y - OY) / CELL);
      if (c < 0 || c > 7 || r < 0 || r > 7) return;
      const i = r * 8 + c;
      const mv = legal(b, 'w');
      if (sel == null) {
        if (b.sq[i] && isWhite(b.sq[i]) && mv.some((m) => m.f === i)) { sel = i; E.sfx('tap'); }
        return;
      }
      if (i === sel) { sel = null; return; }
      const cands = mv.filter((m) => m.f === sel && m.t === i);
      if (!cands.length) {
        if (b.sq[i] && isWhite(b.sq[i]) && mv.some((m) => m.f === i)) { sel = i; E.sfx('tap'); }
        else E.sfx('error');
        return;
      }
      const q = cands.find((m) => m.promo === 'q') || cands[0];
      applyMove(q);
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.22), P.deep);
      g.text('AJEDREZ NEXO', W / 2, 42, { size: 22, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });
      LEVELS.forEach((L, i) => {
        const x = W / 2 - 230 + i * 156;
        const on = i === lvl;
        g.rrect(x, 66, 148, 32, 9, on ? P.a : 'rgba(255,255,255,.06)');
        g.text(L[0], x + 74, 87, { size: 13, align: 'center', weight: 800, color: on ? '#0d1220' : P.dim });
      });

      for (let r = 0; r < 8; r++) for (let cc = 0; cc < 8; cc++) {
        const x = OX + cc * CELL, y = OY + r * CELL;
        g.rect(x, y, CELL, CELL, (r + cc) % 2 ? mix('#6b7a99', P.deep, 0.35) : mix('#e6ecf7', P.deep, 0.08));
      }
      if (lastMove) {
        [lastMove.f, lastMove.t].forEach((i) => {
          g.rect(OX + (i % 8) * CELL, OY + Math.floor(i / 8) * CELL, CELL, CELL, alpha(P.c, 0.22));
        });
      }
      if (checkSq >= 0) {
        g.rect(OX + (checkSq % 8) * CELL, OY + Math.floor(checkSq / 8) * CELL, CELL, CELL, alpha('#ff4d6d', 0.4));
      }
      if (sel != null) {
        g.rect(OX + (sel % 8) * CELL, OY + Math.floor(sel / 8) * CELL, CELL, CELL, alpha(P.a, 0.35));
        legal(b, 'w').filter((m) => m.f === sel).forEach((m) => {
          const x = OX + (m.t % 8) * CELL + CELL / 2, y = OY + Math.floor(m.t / 8) * CELL + CELL / 2;
          if (b.sq[m.t] || m.ep) g.ring(x, y, CELL * 0.4, 3, alpha(P.c, 0.8));
          else g.circle(x, y, CELL * 0.14, alpha(P.c, 0.6));
        });
      }

      for (let i = 0; i < 64; i++) {
        const p = b.sq[i];
        if (!p) continue;
        const x = OX + (i % 8) * CELL + CELL / 2, y = OY + Math.floor(i / 8) * CELL;
        const white = isWhite(p);
        const gl = white ? GLYPH[p === 'P' ? 'PW' : p] : GLYPH[p];
        g.text(gl, x, y + CELL * 0.78, {
          size: CELL * 0.86, align: 'center',
          color: white ? '#f8fafc' : '#0f172a',
          stroke: white ? alpha('#000', 0.5) : alpha('#fff', 0.3), strokeWidth: 1.6,
        });
      }

      /* coordenadas */
      for (let i = 0; i < 8; i++) {
        g.text('abcdefgh'[i], OX + i * CELL + CELL / 2, OY + CELL * 8 + 18,
          { size: 12, align: 'center', color: P.dim, weight: 700 });
        g.text(String(8 - i), OX - 12, OY + i * CELL + CELL / 2 + 5,
          { size: 12, align: 'center', color: P.dim, weight: 700 });
      }

      if (thinking > 0) g.text('La máquina piensa…', W / 2, OY + CELL * 8 + 46,
        { size: 14, align: 'center', color: P.c, weight: 800 });
      if (msgT > 0) E.ui.title(msg, W / 2, 118, { size: 26 });
      E.particles.draw(g);
      E.ui.hint('Toca una pieza y luego su destino · los peones coronan en dama', { bottom: 16 });
    },
  };
});
