/* Conquista Hexagonal — mapa por turnos: reparte tropas y domina el continente. */
NX.game('conquista-hexagonal', {
  w: 880, h: 660, pal: 'ember',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const R = 34, HS = R * Math.sqrt(3);
  const COLS = 9, ROWS = 7;
  const COLORS = ['#8f9dbd', '#22e0ff', '#ff4d6d', '#4ade80'];

  let cells, turn, sel, phase, reinf, over, msg, msgT, thinking, round, dice;

  function hx(c, r) { return 90 + c * HS + (r % 2 ? HS / 2 : 0); }
  function hy(c, r) { return 120 + r * R * 1.5; }

  function neighbors(c, r) {
    const odd = r % 2;
    return [[c - 1, r], [c + 1, r],
            [c - 1 + odd, r - 1], [c + odd, r - 1],
            [c - 1 + odd, r + 1], [c + odd, r + 1]]
      .filter(([cc, rr]) => cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS);
  }

  function reset() {
    cells = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const owner = E.rng.weighted([[1, 4], [2, 4], [0, 2]]);
        cells.push({ c, r, owner, troops: owner ? E.rng.range(1, 4) : 0 });
      }
    }
    turn = 1; sel = null; phase = 'reinforce'; reinf = 5; over = false;
    msg = 'Refuerza tus territorios'; msgT = 2; thinking = 0; round = 1; dice = null;
    hud();
  }
  function at(c, r) { return cells[r * COLS + c]; }
  function hud() {
    const mine = cells.filter((x) => x.owner === 1).length;
    const ai = cells.filter((x) => x.owner === 2).length;
    E.api.hud({ Tuyos: mine, Rival: ai, Fase: phase === 'reinforce' ? 'Refuerzos (' + reinf + ')' : 'Ataque', Ronda: round });
  }

  function endTurn() {
    sel = null;
    if (turn === 1) {
      turn = 2; phase = 'ai'; thinking = 0.7;
      hud();
    } else {
      turn = 1; round++;
      const mine = cells.filter((x) => x.owner === 1).length;
      reinf = Math.max(3, Math.floor(mine / 2));
      phase = 'reinforce';
      msg = 'Coloca ' + reinf + ' tropas'; msgT = 1.8;
      hud();
    }
    checkEnd();
  }

  function checkEnd() {
    const mine = cells.filter((x) => x.owner === 1).length;
    const ai = cells.filter((x) => x.owner === 2).length;
    if (mine === 0 || ai === 0) {
      over = true;
      E.sfx(mine ? 'win' : 'lose');
      setTimeout(() => {
        const o = { score: mine * 300 + round * 100, label: 'Puntos',
          title: mine ? '¡Continente conquistado!' : 'Has sido derrotado',
          msg: round + ' rondas', stats: { Territorios: mine, Rondas: round } };
        mine ? E.api.win(o) : E.api.over(o);
      }, 900);
    }
  }

  function battle(from, to) {
    const att = Math.min(3, from.troops - 1);
    const def = Math.min(2, to.troops);
    if (att < 1) return;
    const ad = []; const dd = [];
    for (let i = 0; i < att; i++) ad.push(E.rng.range(1, 6));
    for (let i = 0; i < def; i++) dd.push(E.rng.range(1, 6));
    ad.sort((a, b) => b - a); dd.sort((a, b) => b - a);
    dice = { ad, dd, t: 1.4 };
    let lossA = 0, lossD = 0;
    for (let i = 0; i < Math.min(ad.length, dd.length); i++) {
      if (ad[i] > dd[i]) lossD++; else lossA++;
    }
    from.troops -= lossA;
    to.troops -= lossD;
    E.sfx('dice');
    E.camera.kick(4);
    if (to.troops <= 0) {
      to.owner = from.owner;
      to.troops = Math.max(1, from.troops - 1);
      from.troops = 1;
      E.sfx('win');
      E.particles.burst(hx(to.c, to.r), hy(to.c, to.r), 12, { col: [COLORS[to.owner]], speed1: 180, add: true });
    }
    hud();
    checkEnd();
  }

  function aiTurn() {
    const mine = cells.filter((x) => x.owner === 2);
    let re = Math.max(3, Math.floor(mine.length / 2));
    /* refuerza fronteras */
    const border = mine.filter((x) => neighbors(x.c, x.r).some(([c, r]) => at(c, r).owner !== 2));
    while (re > 0 && border.length) {
      const t2 = E.rng.pick(border);
      t2.troops++; re--;
    }
    /* ataca donde tenga ventaja */
    let attacks = 0;
    for (let k = 0; k < 24 && attacks < 5; k++) {
      const from = E.rng.pick(mine.filter((x) => x.troops > 2));
      if (!from) break;
      const targets = neighbors(from.c, from.r).map(([c, r]) => at(c, r)).filter((x) => x.owner !== 2);
      if (!targets.length) continue;
      targets.sort((a, b) => a.troops - b.troops);
      const to = targets[0];
      if (from.troops > to.troops + 1) { battle(from, to); attacks++; }
    }
    turn = 1; round++;
    const m2 = cells.filter((x) => x.owner === 1).length;
    reinf = Math.max(3, Math.floor(m2 / 2));
    phase = 'reinforce';
    msg = 'Coloca ' + reinf + ' tropas'; msgT = 1.8;
    hud();
    checkEnd();
  }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (dice) { dice.t -= dt; if (dice.t <= 0) dice = null; }
      if (thinking > 0) { thinking -= dt; if (thinking <= 0) aiTurn(); return; }
      if (over || turn !== 1) return;

      const p = E.input.pointer;
      if (!p.pressed) return;
      if (p.y > H - 56 && Math.abs(p.x - W / 2) < 90 && phase === 'attack') { endTurn(); E.sfx('tap'); return; }

      let hitC = null;
      cells.forEach((x) => {
        if (M.dist(p.x, p.y, hx(x.c, x.r), hy(x.c, x.r)) < R * 0.9) hitC = x;
      });
      if (!hitC) return;

      if (phase === 'reinforce') {
        if (hitC.owner !== 1) { E.sfx('error'); return; }
        hitC.troops++; reinf--;
        E.sfx('place');
        if (reinf <= 0) { phase = 'attack'; msg = 'Ataca o pasa turno'; msgT = 1.6; }
        hud();
        return;
      }
      if (phase === 'attack') {
        if (!sel) {
          if (hitC.owner === 1 && hitC.troops > 1) { sel = hitC; E.sfx('tap'); }
          else E.sfx('error');
          return;
        }
        if (hitC === sel) { sel = null; return; }
        const adj = neighbors(sel.c, sel.r).some(([c, r]) => at(c, r) === hitC);
        if (adj && hitC.owner !== 1) { battle(sel, hitC); if (sel.troops <= 1) sel = null; }
        else if (hitC.owner === 1 && hitC.troops > 1) sel = hitC;
        else E.sfx('error');
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.text('CONQUISTA HEXAGONAL', W / 2, 44, { size: 21, align: 'center', weight: 900, color: P.ink, letterSpacing: 2 });
      g.text(phase === 'reinforce' ? 'Refuerzos: ' + reinf : phase === 'ai' ? 'Turno del rival' : 'Elige origen y destino',
        W / 2, 74, { size: 14, align: 'center', color: P.dim, weight: 700 });

      cells.forEach((x) => {
        const px = hx(x.c, x.r), py = hy(x.c, x.r);
        const col = COLORS[x.owner];
        const isSel = sel === x;
        const canAtk = sel && neighbors(sel.c, sel.r).some(([cc, rr]) => at(cc, rr) === x) && x.owner !== 1;
        if (isSel) g.bloom(px, py, R * 2, P.c, 0.4);
        g.ngon(px, py, R * 0.94, 6, Math.PI / 6, x.owner ? alpha(col, 0.88) : alpha(col, 0.3));
        c.save();
        c.strokeStyle = isSel ? P.c : canAtk ? alpha('#ffffff', 0.8) : alpha('#000', 0.3);
        c.lineWidth = isSel || canAtk ? 3 : 1.5;
        c.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * M.TAU + Math.PI / 6;
          const qx = px + Math.cos(a) * R * 0.94, qy = py + Math.sin(a) * R * 0.94;
          i ? c.lineTo(qx, qy) : c.moveTo(qx, qy);
        }
        c.closePath(); c.stroke(); c.restore();
        if (x.owner) {
          g.text(String(x.troops), px, py + 7, {
            size: 19, align: 'center', weight: 900, color: '#0d1220' });
        }
      });

      if (dice) {
        g.rrect(W / 2 - 150, H - 150, 300, 74, 14, alpha(P.deep, 0.9));
        g.text('ATAQUE', W / 2 - 90, H - 126, { size: 11, align: 'center', color: P.c, weight: 800, letterSpacing: 1.5 });
        g.text('DEFENSA', W / 2 + 90, H - 126, { size: 11, align: 'center', color: P.b, weight: 800, letterSpacing: 1.5 });
        dice.ad.forEach((d, i) => {
          g.rrect(W / 2 - 130 + i * 34, H - 116, 28, 28, 6, P.c);
          g.text(String(d), W / 2 - 116 + i * 34, H - 96, { size: 16, align: 'center', weight: 900, color: '#0d1220' });
        });
        dice.dd.forEach((d, i) => {
          g.rrect(W / 2 + 50 + i * 34, H - 116, 28, 28, 6, P.b);
          g.text(String(d), W / 2 + 64 + i * 34, H - 96, { size: 16, align: 'center', weight: 900, color: '#0d1220' });
        });
      }

      if (phase === 'attack') {
        const hov = E.input.pointer.y > H - 56 && Math.abs(E.input.pointer.x - W / 2) < 90;
        g.rrect(W / 2 - 90, H - 52, 180, 40, 11, hov ? alpha(P.a, 0.4) : 'rgba(255,255,255,.08)');
        g.text('Pasar turno', W / 2, H - 26, { size: 15, align: 'center', weight: 800, color: P.ink });
      }
      if (msgT > 0) E.ui.title(msg, W / 2, 108, { size: 24 });
      E.particles.draw(g);
    },
  };
});
