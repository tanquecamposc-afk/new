/* Minero Profundo — cava hacia abajo, vende minerales y mejora el taladro. */
NX.game('minero-profundo', {
  w: 780, h: 620, pal: 'ember',
  controls: { dpad: true },
  music: { root: 40, scale: 'dorian', bpm: 92, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const CELL = 44, COLS = Math.floor(W / CELL);

  const ORES = [
    { id: 0, name: 'roca', col: '#5b6479', val: 0, hard: 1 },
    { id: 1, name: 'carbón', col: '#2f3542', val: 5, hard: 1 },
    { id: 2, name: 'hierro', col: '#b0774a', val: 14, hard: 2 },
    { id: 3, name: 'plata', col: '#cfd8e6', val: 32, hard: 3 },
    { id: 4, name: 'oro', col: '#ffd45e', val: 70, hard: 4 },
    { id: 5, name: 'rubí', col: '#ff4d6d', val: 150, hard: 5 },
    { id: 6, name: 'diamante', col: '#7dd3fc', val: 320, hard: 6 },
  ];

  let grid, hero, camY, money, fuel, maxFuel, drill, bag, bagMax, depth, alive, digT, digTarget, msgT, msg;

  function cellAt(c, r) {
    if (r < 0 || c < 0 || c >= COLS) return null;
    if (!grid[r]) genRow(r);
    return grid[r][c];
  }
  function genRow(r) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      if (r < 2) { grid[r][c] = { t: -1 }; continue; }
      const depthK = r / 60;
      let t = 0;
      const roll = E.rng.float(0, 1);
      if (roll < 0.1) t = 1;
      else if (roll < 0.1 + depthK * 0.1) t = 2;
      else if (roll < 0.13 + depthK * 0.09) t = 3;
      else if (roll < 0.15 + depthK * 0.07) t = 4;
      else if (roll < 0.16 + depthK * 0.05) t = 5;
      else if (roll < 0.165 + depthK * 0.04) t = 6;
      grid[r][c] = { t };
      if (E.rng.bool(0.03) && r > 6) grid[r][c] = { t: -1 };   /* cueva */
    }
  }

  function reset() {
    grid = [];
    hero = { c: Math.floor(COLS / 2), r: 1, x: 0, y: 0, tx: 0, ty: 0, face: 1 };
    hero.x = hero.tx = hero.c * CELL + CELL / 2;
    hero.y = hero.ty = hero.r * CELL + CELL / 2;
    camY = 0; money = 0; maxFuel = 100; fuel = maxFuel; drill = 1; bag = []; bagMax = 12;
    depth = 0; alive = true; digT = 0; digTarget = null; msgT = 0; msg = '';
    hud();
  }
  function hud() {
    E.api.hud({ Dinero: '$' + M.fmtScore(money), Combustible: Math.round(fuel) + '%', Mochila: bag.length + '/' + bagMax, Profundidad: depth + ' m' });
  }

  function tryMove(dc, dr) {
    if (digTarget) return;
    const c = hero.c + dc, r = hero.r + dr;
    if (c < 0 || c >= COLS || r < 0) return;
    const cell = cellAt(c, r);
    if (!cell) return;
    if (cell.t === -1) { hero.c = c; hero.r = r; hero.tx = c * CELL + CELL / 2; hero.ty = r * CELL + CELL / 2; E.sfx('step'); }
    else {
      const ore = ORES[cell.t];
      if (ore.hard > drill + 1) { msg = 'Necesitas un taladro mejor'; msgT = 1.6; E.sfx('error'); return; }
      digTarget = { c, r, cell, need: ore.hard * 0.28 / drill };
      digT = 0;
    }
    if (dc) hero.face = dc;
  }

  function finishDig() {
    const { c, r, cell } = digTarget;
    const ore = ORES[cell.t];
    cell.t = -1;
    if (ore.val > 0 && bag.length < bagMax) {
      bag.push(ore.id);
      E.floaters.add(hero.x, hero.y - camY - 26, ore.name, { col: ore.col, size: 15 });
    } else if (ore.val > 0) { msg = 'Mochila llena'; msgT = 1.4; }
    E.sfx('hit');
    E.particles.burst(c * CELL + CELL / 2, r * CELL + CELL / 2 - camY, 8, { col: [ore.col], speed1: 130, grav: 300 });
    hero.c = c; hero.r = r;
    hero.tx = c * CELL + CELL / 2; hero.ty = r * CELL + CELL / 2;
    digTarget = null;
    depth = Math.max(depth, (hero.r - 1) * 2);
    hud();
  }

  function sellAll() {
    let total = 0;
    bag.forEach((id) => { total += ORES[id].val; });
    if (total) {
      money += total; bag = [];
      E.sfx('coin');
      msg = 'Vendido por $' + total; msgT = 2;
      E.floaters.add(hero.x, hero.y - camY - 30, '+$' + total, { col: P.c, size: 22 });
      hud();
    }
    fuel = maxFuel;
  }

  function buy(what) {
    const costs = { drill: drill * 120, bag: bagMax * 14, fuel: maxFuel * 3 };
    if (money < costs[what]) { E.sfx('error'); msg = 'No te alcanza'; msgT = 1.4; return; }
    money -= costs[what];
    if (what === 'drill') drill++;
    else if (what === 'bag') bagMax += 6;
    else { maxFuel += 40; fuel = maxFuel; }
    E.sfx('power');
    msg = 'Mejora comprada'; msgT = 1.6;
    hud();
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      if (msgT > 0) msgT -= dt;

      if (digTarget) {
        digT += dt;
        fuel -= dt * 3;
        if (digT >= digTarget.need) finishDig();
      } else {
        if (E.input.pressed('left')) tryMove(-1, 0);
        else if (E.input.pressed('right')) tryMove(1, 0);
        else if (E.input.pressed('down')) tryMove(0, 1);
        else if (E.input.pressed('up')) tryMove(0, -1);
        const sw = E.input.swipe;
        if (sw) {
          if (sw.dir === 'left') tryMove(-1, 0);
          else if (sw.dir === 'right') tryMove(1, 0);
          else if (sw.dir === 'down') tryMove(0, 1);
          else tryMove(0, -1);
        }
      }

      hero.x = M.damp(hero.x, hero.tx, 16, dt);
      hero.y = M.damp(hero.y, hero.ty, 16, dt);
      camY = M.damp(camY, Math.max(0, hero.y - H * 0.5), 6, dt);

      fuel -= dt * 1.4;
      if (hero.r <= 1) {
        /* superficie: vender y comprar */
        if (bag.length) sellAll();
        if (E.input.pressed('1')) buy('drill');
        if (E.input.pressed('2')) buy('bag');
        if (E.input.pressed('3')) buy('fuel');
      }
      if (fuel <= 0) {
        alive = false;
        E.sfx('lose');
        setTimeout(() => E.api.over({
          score: money, label: 'Dinero', msg: 'Te quedaste sin combustible a ' + depth + ' m',
          stats: { Profundidad: depth + ' m', Taladro: drill },
        }), 500);
      }
      if (Math.floor(fuel) !== Math.floor(fuel + dt * 2)) hud();
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient('#1a1410', '#0a0806');
      c.save(); c.translate(0, -camY);

      /* cielo y base */
      g.rect(0, -200, W, 200 + CELL * 2, mix(P.b, P.deep, 0.55));
      g.rect(0, CELL * 1.4, W, CELL * 0.6, mix('#7a5a34', P.deep, 0.2));
      g.rrect(40, CELL * 0.2, 120, CELL * 1.2, 8, mix(P.c, P.deep, 0.15));
      g.text('TIENDA', 100, CELL * 0.95, { size: 14, align: 'center', weight: 900, color: '#0d1220' });

      const r0 = Math.max(0, Math.floor(camY / CELL) - 1);
      const r1 = Math.floor((camY + H) / CELL) + 1;
      for (let r = r0; r <= r1; r++) {
        for (let cc = 0; cc < COLS; cc++) {
          const cell = cellAt(cc, r);
          if (!cell || cell.t === -1) continue;
          const x = cc * CELL, y = r * CELL;
          const ore = ORES[cell.t];
          const base = mix('#4a3a2c', '#20170f', Math.min(1, r / 70));
          g.rect(x, y, CELL - 1, CELL - 1, base);
          if (cell.t > 0) {
            for (let k = 0; k < 3; k++) {
              const px = x + 10 + ((cc * 7 + r * 3 + k * 11) % (CELL - 22));
              const py = y + 10 + ((cc * 5 + r * 11 + k * 7) % (CELL - 22));
              g.circle(px, py, 5, ore.col);
              g.circle(px - 1.5, py - 1.5, 2, alpha('#fff', 0.35));
            }
          }
          g.rect(x, y, CELL - 1, 2, alpha('#000', 0.2));
        }
      }

      if (digTarget) {
        const x = digTarget.c * CELL, y = digTarget.r * CELL;
        g.rrectStroke(x + 2, y + 2, CELL - 5, CELL - 5, 4, P.c, 2);
        g.rrect(x + 4, y + CELL - 10, (CELL - 9) * M.clamp01(digT / digTarget.need), 4, 2, P.c);
      }

      g.push(hero.x, hero.y, 0, hero.face, 1);
      g.rrect(-14, -16, 28, 32, 8, P.a);
      g.rect(-8, -8, 16, 7, P.deep);
      g.circle(0, -20, 8, P.c);
      g.rect(8, -4, 16, 5, mix(P.dim, P.deep, 0.2));
      g.pop();
      c.restore();

      /* interfaz */
      g.rrect(W - 200, 14, 186, 12, 6, 'rgba(255,255,255,.12)');
      g.rrect(W - 200, 14, 186 * M.clamp01(fuel / maxFuel), 12, 6, fuel > maxFuel * 0.25 ? P.c : '#ff4d6d');
      g.text('COMBUSTIBLE', W - 200, 8, { size: 9.5, color: P.dim, weight: 800, letterSpacing: 1.2 });

      if (hero.r <= 1) {
        g.rrect(W / 2 - 210, H - 92, 420, 74, 12, alpha(P.deep, 0.85));
        g.text('TIENDA — pulsa el número para comprar', W / 2, H - 70, { size: 14, align: 'center', color: P.ink, weight: 800 });
        const items = [
          ['1', 'Taladro nv.' + (drill + 1), drill * 120],
          ['2', 'Mochila +6', bagMax * 14],
          ['3', 'Depósito +40', maxFuel * 3],
        ];
        items.forEach((it, i) => {
          const x = W / 2 - 190 + i * 133;
          g.text('[' + it[0] + '] ' + it[1], x, H - 48, { size: 13, color: P.a, weight: 700 });
          g.text('$' + it[2], x, H - 30, { size: 13, color: money >= it[2] ? P.c : P.dim, weight: 800 });
        });
      }

      E.particles.draw(g);
      E.floaters.draw(g);
      if (msgT > 0) E.ui.title(msg, W / 2, 90, { size: 26 });
      E.ui.hint('Flechas para moverte y cavar · vuelve arriba para vender', { bottom: hero.r <= 1 ? 118 : 14 });
    },
  };
});
