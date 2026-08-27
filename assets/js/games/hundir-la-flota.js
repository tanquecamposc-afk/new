/* Hundir la Flota — coloca tu flota y caza la del rival; la IA persigue los impactos. */
NX.game('hundir-la-flota', {
  w: 900, h: 640, pal: 'ice',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const N = 8;
  const CELL = Math.floor(Math.min((W / 2 - 70) / N, (H - 230) / N));
  const OX1 = 40, OX2 = W - 40 - CELL * N, OY = 150;
  const SHIPS = [4, 3, 3, 2, 2, 2];

  let mine, theirs, myShots, theirShots, phase, place, turn, over, msg, msgT, aiQ, aiHits, sunkMine, sunkTheirs;

  function emptyGrid() { const a = []; for (let i = 0; i < N * N; i++) a.push(0); return a; }

  function randomFleet() {
    const g2 = emptyGrid();
    const ships = [];
    SHIPS.forEach((len, si) => {
      for (let tryN = 0; tryN < 500; tryN++) {
        const hor = E.rng.bool();
        const c = E.rng.int(hor ? N - len + 1 : N);
        const r = E.rng.int(hor ? N : N - len + 1);
        let ok = true;
        const cells = [];
        for (let k = 0; k < len; k++) {
          const i = (r + (hor ? 0 : k)) * N + c + (hor ? k : 0);
          cells.push(i);
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            const rr = Math.floor(i / N) + dr, cc = (i % N) + dc;
            if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
            if (g2[rr * N + cc]) ok = false;
          }
        }
        if (!ok) continue;
        cells.forEach((i) => { g2[i] = si + 1; });
        ships.push({ cells, hits: 0, len });
        break;
      }
    });
    return { g: g2, ships };
  }

  function reset() {
    theirs = randomFleet();
    mine = { g: emptyGrid(), ships: [] };
    myShots = emptyGrid(); theirShots = emptyGrid();
    phase = 'place'; place = { idx: 0, hor: true };
    turn = 0; over = false; msg = 'Coloca tu flota'; msgT = 2;
    aiQ = []; aiHits = []; sunkMine = 0; sunkTheirs = 0;
    hud();
  }
  function hud() {
    E.api.hud({ Fase: phase === 'place' ? 'Colocación' : (turn === 0 ? 'Tu turno' : 'Rival'),
      Hundidos: sunkTheirs + '/' + SHIPS.length, Perdidos: sunkMine + '/' + SHIPS.length });
  }

  function canPlace(g2, r, c, len, hor) {
    for (let k = 0; k < len; k++) {
      const rr = r + (hor ? 0 : k), cc = c + (hor ? k : 0);
      if (rr < 0 || rr >= N || cc < 0 || cc >= N) return false;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const ar = rr + dr, ac = cc + dc;
        if (ar < 0 || ar >= N || ac < 0 || ac >= N) continue;
        if (g2[ar * N + ac]) return false;
      }
    }
    return true;
  }

  function shipAt(fleet, i) { return fleet.ships.find((s) => s.cells.indexOf(i) >= 0); }

  function fire(i) {
    if (myShots[i]) { E.sfx('error'); return; }
    const hitS = shipAt(theirs, i);
    myShots[i] = hitS ? 2 : 1;
    if (hitS) {
      hitS.hits++;
      E.sfx('explode'); E.camera.kick(6);
      E.particles.burst(OX2 + (i % N) * CELL + CELL / 2, OY + Math.floor(i / N) * CELL + CELL / 2, 12,
        { col: [P.c, '#ff4d6d'], speed1: 200, add: true });
      if (hitS.hits >= hitS.len) {
        sunkTheirs++;
        msg = '¡Hundido!'; msgT = 1.6;
        E.sfx('boom');
      } else { msg = '¡Tocado!'; msgT = 1.2; }
      hud();
      if (sunkTheirs >= SHIPS.length) {
        over = true;
        setTimeout(() => E.api.win({
          score: Math.max(0, 6000 - myShots.filter((v) => v).length * 60),
          title: '¡Flota enemiga hundida!',
          msg: myShots.filter((v) => v).length + ' disparos',
          stats: { Disparos: myShots.filter((v) => v).length },
        }), 800);
      }
      return;
    }
    E.sfx('splash');
    msg = 'Agua'; msgT = 1;
    turn = 1;
    hud();
    setTimeout(aiTurn, 800);
  }

  function aiTurn() {
    if (over) return;
    let i;
    if (aiQ.length) i = aiQ.shift();
    else {
      const opts = [];
      for (let k = 0; k < N * N; k++) {
        if (theirShots[k]) continue;
        if ((Math.floor(k / N) + (k % N)) % 2 === 0) opts.push(k);
      }
      const pool = opts.length ? opts : theirShots.map((v, k) => (v ? -1 : k)).filter((k) => k >= 0);
      i = E.rng.pick(pool);
    }
    if (i == null || theirShots[i]) {
      const pool = theirShots.map((v, k) => (v ? -1 : k)).filter((k) => k >= 0);
      if (!pool.length) return;
      i = E.rng.pick(pool);
    }
    const hitS = shipAt(mine, i);
    theirShots[i] = hitS ? 2 : 1;
    if (hitS) {
      hitS.hits++;
      E.sfx('hurt'); E.camera.kick(7); E.camera.flash('#ff4d6d', 0.22);
      const r = Math.floor(i / N), c = i % N;
      [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([rr, cc]) => {
        if (rr < 0 || rr >= N || cc < 0 || cc >= N) return;
        const k = rr * N + cc;
        if (!theirShots[k] && aiQ.indexOf(k) < 0) aiQ.push(k);
      });
      if (hitS.hits >= hitS.len) {
        sunkMine++;
        aiQ = [];
        msg = 'Te han hundido un barco'; msgT = 1.8;
      }
      hud();
      if (sunkMine >= SHIPS.length) {
        over = true;
        setTimeout(() => E.api.over({ score: sunkTheirs * 400, msg: 'Tu flota ha sido hundida' }), 800);
        return;
      }
      setTimeout(aiTurn, 700);
      return;
    }
    E.sfx('splash');
    turn = 0;
    hud();
  }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      const p = E.input.pointer;

      if (phase === 'place') {
        if (E.input.pressed('r') || E.input.pressed('space')) place.hor = !place.hor;
        if (p.pressed) {
          if (p.y > H - 56 && Math.abs(p.x - W / 2) < 90) {
            const f = randomFleet();
            mine = f; phase = 'play'; msg = 'A disparar'; msgT = 1.5; E.sfx('select'); hud();
            return;
          }
          const c = Math.floor((p.x - OX1) / CELL), r = Math.floor((p.y - OY) / CELL);
          if (c < 0 || c >= N || r < 0 || r >= N) return;
          if (E.input.rightDown) { place.hor = !place.hor; return; }
          const len = SHIPS[place.idx];
          if (!canPlace(mine.g, r, c, len, place.hor)) { E.sfx('error'); return; }
          const cells = [];
          for (let k = 0; k < len; k++) {
            const i = (r + (place.hor ? 0 : k)) * N + c + (place.hor ? k : 0);
            mine.g[i] = place.idx + 1;
            cells.push(i);
          }
          mine.ships.push({ cells, hits: 0, len });
          place.idx++;
          E.sfx('place');
          if (place.idx >= SHIPS.length) { phase = 'play'; msg = 'A disparar'; msgT = 1.5; }
          hud();
        }
        return;
      }

      if (over || turn !== 0) return;
      if (p.pressed) {
        const c = Math.floor((p.x - OX2) / CELL), r = Math.floor((p.y - OY) / CELL);
        if (c >= 0 && c < N && r >= 0 && r < N) fire(r * N + c);
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.text('HUNDIR LA FLOTA', W / 2, 44, { size: 22, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });

      const board = (ox, title, shots, fleet, showShips) => {
        g.text(title, ox + CELL * N / 2, OY - 18, { size: 14, align: 'center', weight: 800, color: P.dim, letterSpacing: 1.5 });
        g.rrect(ox - 6, OY - 6, CELL * N + 12, CELL * N + 12, 10, alpha(P.deep, 0.7));
        for (let r = 0; r < N; r++) for (let cc = 0; cc < N; cc++) {
          const i = r * N + cc;
          const x = ox + cc * CELL, y = OY + r * CELL;
          g.rect(x + 1, y + 1, CELL - 2, CELL - 2, alpha(P.a, 0.07));
          if (showShips && fleet.g[i]) {
            g.rrect(x + 3, y + 3, CELL - 6, CELL - 6, 4, mix(P.dim, P.ink, 0.15));
          }
          if (shots[i] === 1) g.circle(x + CELL / 2, y + CELL / 2, CELL * 0.14, alpha(P.ink, 0.4));
          if (shots[i] === 2) {
            g.line(x + 7, y + 7, x + CELL - 7, y + CELL - 7, '#ff4d6d', 3);
            g.line(x + CELL - 7, y + 7, x + 7, y + CELL - 7, '#ff4d6d', 3);
          }
        }
        c.save(); c.strokeStyle = alpha(P.a, 0.2); c.lineWidth = 1;
        c.beginPath();
        for (let i = 0; i <= N; i++) {
          c.moveTo(ox + i * CELL, OY); c.lineTo(ox + i * CELL, OY + N * CELL);
          c.moveTo(ox, OY + i * CELL); c.lineTo(ox + N * CELL, OY + i * CELL);
        }
        c.stroke(); c.restore();
      };

      board(OX1, 'TU FLOTA', theirShots, mine, true);
      board(OX2, 'FLOTA ENEMIGA', myShots, theirs, over);

      if (phase === 'place') {
        const p = E.input.pointer;
        const cc = Math.floor((p.x - OX1) / CELL), r = Math.floor((p.y - OY) / CELL);
        const len = SHIPS[place.idx];
        if (cc >= 0 && cc < N && r >= 0 && r < N) {
          const ok = canPlace(mine.g, r, cc, len, place.hor);
          for (let k = 0; k < len; k++) {
            const rr = r + (place.hor ? 0 : k), ccc = cc + (place.hor ? k : 0);
            if (rr >= N || ccc >= N) continue;
            g.rrect(OX1 + ccc * CELL + 3, OY + rr * CELL + 3, CELL - 6, CELL - 6, 4,
              alpha(ok ? '#4ade80' : '#ff4d6d', 0.55));
          }
        }
        g.text('Barco de ' + len + ' casillas · pulsa R o clic derecho para rotar',
          W / 2, OY + CELL * N + 34, { size: 14, align: 'center', color: P.ink, weight: 700 });
        const hov = E.input.pointer.y > H - 56 && Math.abs(E.input.pointer.x - W / 2) < 90;
        g.rrect(W / 2 - 90, H - 52, 180, 40, 11, hov ? alpha(P.a, 0.35) : 'rgba(255,255,255,.08)');
        g.text('🎲 Colocar al azar', W / 2, H - 26, { size: 14, align: 'center', weight: 800, color: P.ink });
      } else {
        g.text(turn === 0 ? 'Dispara en el tablero de la derecha' : 'El rival está disparando…',
          W / 2, OY + CELL * N + 34, { size: 14, align: 'center', color: turn === 0 ? P.c : P.dim, weight: 700 });
      }

      if (msgT > 0) E.ui.title(msg, W / 2, 108, { size: 26 });
      E.particles.draw(g);
    },
  };
});
