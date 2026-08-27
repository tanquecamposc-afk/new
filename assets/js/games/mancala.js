/* Mancala — siembra semillas, roba las del rival y encadena turnos extra. */
NX.game('mancala', {
  w: 860, h: 520, pal: 'sunset',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const PITS = 6;

  let pits, turn, over, anim, lvl, thinking, msg, msgT;
  const LEVELS = ['Fácil', 'Normal', 'Difícil'];

  /* índices 0-5 jugador, 6 su granero, 7-12 máquina, 13 su granero */
  function reset(l) {
    lvl = l == null ? (lvl == null ? 1 : lvl) : l;
    pits = [];
    for (let i = 0; i < 14; i++) pits.push(i === 6 || i === 13 ? 0 : 4);
    turn = 0; over = false; anim = null; thinking = 0; msg = ''; msgT = 0;
    hud();
  }
  function hud() {
    E.api.hud({ Tuyas: pits[6], Rival: pits[13], Turno: over ? '—' : (turn === 0 ? 'Tú' : 'Máquina') });
  }

  function sow(state, idx, player) {
    const p = state.slice();
    let seeds = p[idx];
    if (!seeds) return null;
    p[idx] = 0;
    let i = idx;
    while (seeds > 0) {
      i = (i + 1) % 14;
      if (player === 0 && i === 13) continue;
      if (player === 1 && i === 6) continue;
      p[i]++; seeds--;
    }
    let extra = false, captured = 0;
    if ((player === 0 && i === 6) || (player === 1 && i === 13)) extra = true;
    else {
      const mine = player === 0 ? (i >= 0 && i < 6) : (i >= 7 && i < 13);
      if (mine && p[i] === 1) {
        const opp = 12 - i;
        if (p[opp] > 0) {
          captured = p[opp] + 1;
          p[player === 0 ? 6 : 13] += captured;
          p[opp] = 0; p[i] = 0;
        }
      }
    }
    return { p, extra, last: i, captured };
  }

  function sideEmpty(p, player) {
    const from = player === 0 ? 0 : 7;
    for (let i = from; i < from + 6; i++) if (p[i]) return false;
    return true;
  }

  function finish() {
    over = true;
    for (let i = 0; i < 6; i++) { pits[6] += pits[i]; pits[i] = 0; }
    for (let i = 7; i < 13; i++) { pits[13] += pits[i]; pits[i] = 0; }
    hud();
    E.sfx(pits[6] > pits[13] ? 'win' : 'lose');
    setTimeout(() => {
      const won = pits[6] > pits[13];
      const o = { score: pits[6] * 100, label: 'Semillas',
        title: pits[6] === pits[13] ? 'Empate' : won ? '¡Ganaste!' : 'Gana la máquina',
        msg: pits[6] + ' – ' + pits[13], stats: { Tuyas: pits[6], Rival: pits[13] } };
      won ? E.api.win(o) : E.api.over(o);
    }, 900);
  }

  function play(idx, player) {
    const res = sow(pits, idx, player);
    if (!res) { E.sfx('error'); return; }
    pits = res.p;
    E.sfx(res.captured ? 'coin' : 'place');
    if (res.captured) {
      E.floaters.add(W / 2, H / 2, '+' + res.captured, { col: P.c, size: 24 });
      E.camera.kick(4);
    }
    hud();
    if (sideEmpty(pits, 0) || sideEmpty(pits, 1)) return finish();
    if (res.extra) {
      msg = (player === 0 ? 'Turno extra' : 'La máquina repite'); msgT = 1.4;
      E.sfx('chime');
      if (player === 1) thinking = 0.6;
      return;
    }
    turn = 1 - player;
    hud();
    if (turn === 1) thinking = 0.6;
  }

  function evalState(p, me) {
    const mine = me === 1 ? 13 : 6;
    const his = me === 1 ? 6 : 13;
    let s = (p[mine] - p[his]) * 4;
    const from = me === 1 ? 7 : 0;
    for (let i = from; i < from + 6; i++) s += p[i] * 0.4;
    return s;
  }

  function best(p, player, depth) {
    let bs = -1e9, bi = -1;
    const from = player === 1 ? 7 : 0;
    for (let i = from; i < from + 6; i++) {
      if (!p[i]) continue;
      const res = sow(p, i, player);
      if (!res) continue;
      let s;
      if (depth <= 1) s = evalState(res.p, 1);
      else if (res.extra) s = best(res.p, player, depth - 1).s;
      else s = -best(res.p, 1 - player, depth - 1).s;
      if (s > bs) { bs = s; bi = i; }
    }
    return { s: bs, i: bi };
  }

  reset(1);

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (thinking > 0) {
        thinking -= dt;
        if (thinking <= 0 && !over) {
          const depth = [1, 3, 5][lvl];
          const r = best(pits, 1, depth);
          if (r.i < 0) return finish();
          play(r.i, 1);
        }
        return;
      }
      if (over || turn !== 0) return;
      const p = E.input.pointer;
      if (p.pressed) {
        if (p.y > 52 && p.y < 86) {
          for (let i = 0; i < LEVELS.length; i++) {
            const x = W / 2 - 220 + i * 148;
            if (p.x > x && p.x < x + 140) { reset(i); E.sfx('select'); return; }
          }
        }
        for (let i = 0; i < PITS; i++) {
          const x = 150 + i * 92, y = H * 0.66;
          if (M.dist(p.x, p.y, x, y) < 40 && pits[i] > 0) { play(i, 0); return; }
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.text('MANCALA', W / 2, 36, { size: 22, align: 'center', weight: 900, color: P.ink, letterSpacing: 4 });
      LEVELS.forEach((L, i) => {
        const x = W / 2 - 220 + i * 148;
        const on = i === lvl;
        g.rrect(x, 52, 140, 32, 9, on ? P.a : 'rgba(255,255,255,.06)');
        g.text(L, x + 70, 73, { size: 13, align: 'center', weight: 800, color: on ? '#0d1220' : P.dim });
      });

      g.rrect(60, 130, W - 120, 290, 60, mix('#7a5a34', P.deep, 0.2));

      const seeds = (x, y, n, big) => {
        const R = big ? 34 : 22;
        for (let i = 0; i < Math.min(n, 24); i++) {
          const a = (i / Math.min(n, 24)) * M.TAU + i * 0.7;
          const d = (i % 3) * (R * 0.28) + R * 0.2;
          g.circle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85, big ? 6 : 5.5,
            [P.a, P.c, P.b][i % 3]);
        }
      };

      /* graneros */
      g.rrect(78, 160, 56, 230, 28, alpha(P.deep, 0.72));
      g.rrect(W - 134, 160, 56, 230, 28, alpha(P.deep, 0.72));
      seeds(106, 275, pits[13], true);
      seeds(W - 106, 275, pits[6], true);
      g.text(String(pits[13]), 106, 148, { size: 20, align: 'center', weight: 900, color: P.b, mono: true });
      g.text(String(pits[6]), W - 106, 148, { size: 20, align: 'center', weight: 900, color: P.c, mono: true });
      g.text('MÁQUINA', 106, 408, { size: 10, align: 'center', color: P.dim, weight: 800, letterSpacing: 1.4 });
      g.text('TÚ', W - 106, 408, { size: 10, align: 'center', color: P.dim, weight: 800, letterSpacing: 1.4 });

      /* hoyos */
      for (let i = 0; i < PITS; i++) {
        const xTop = 150 + (PITS - 1 - i) * 92, yTop = H * 0.36;
        g.circle(xTop, yTop, 38, alpha(P.deep, 0.72));
        seeds(xTop, yTop, pits[7 + i]);
        g.text(String(pits[7 + i]), xTop, yTop - 48, { size: 14, align: 'center', color: P.dim, weight: 800, mono: true });

        const x = 150 + i * 92, y = H * 0.66;
        const hov = turn === 0 && !over && M.dist(E.input.pointer.x, E.input.pointer.y, x, y) < 40 && pits[i] > 0;
        if (hov) g.bloom(x, y, 70, P.c, 0.3);
        g.circle(x, y, 38, hov ? alpha(P.c, 0.22) : alpha(P.deep, 0.72));
        if (hov) g.ring(x, y, 38, 2, P.c);
        seeds(x, y, pits[i]);
        g.text(String(pits[i]), x, y + 58, { size: 14, align: 'center', color: P.dim, weight: 800, mono: true });
      }

      if (thinking > 0) g.text('Pensando…', W / 2, H - 30, { size: 14, align: 'center', color: P.c, weight: 800 });
      if (msgT > 0) E.ui.title(msg, W / 2, 112, { size: 24 });
      E.floaters.draw(g);
      E.ui.hint('Toca uno de tus hoyos para sembrar en sentido antihorario', { bottom: 12 });
    },
  };
});
