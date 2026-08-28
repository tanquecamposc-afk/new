/* Serpiente Neón — la serpiente clásica con estela luminosa, portales y frutas especiales. */
NX.game('serpiente-neon', {
  w: 900, h: 640, pal: 'neon',
  controls: { dpad: true },
  music: { root: 45, scale: 'dorian', bpm: 104, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;

  const COLS = 24, ROWS = 16;
  const PAD = 30, FOOT = 44;              /* hueco inferior para la pista */
  const CELL = Math.floor(Math.min((E.opts.w - PAD * 2) / COLS, (E.opts.h - PAD * 2 - FOOT) / ROWS));
  const OX = Math.round((E.opts.w - CELL * COLS) / 2);
  const OY = PAD;

  let snake, dir, nextDir, food, bonus, walls, grow, step, timer, alive, score, combo, comboT, level, eaten;
  let shake = 0, portalPhase = 0;

  function reset() {
    snake = [];
    const cx = 6, cy = ROWS >> 1;
    for (let i = 3; i >= 0; i--) snake.push({ x: cx - i, y: cy });
    snake.reverse();
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    walls = [];
    grow = 0; step = 0.135; timer = 0; alive = true;
    score = 0; combo = 0; comboT = 0; level = 1; eaten = 0;
    bonus = null;
    placeFood();
    hud();
  }

  const occupied = (x, y) =>
    snake.some((s) => s.x === x && s.y === y) || walls.some((w) => w.x === x && w.y === y);

  function freeCell() {
    let x, y, guard = 0;
    do { x = E.rng.int(COLS); y = E.rng.int(ROWS); } while (occupied(x, y) && guard++ < 400);
    return { x, y };
  }

  function placeFood() {
    const c = freeCell();
    food = { x: c.x, y: c.y, t: 0 };
  }

  function spawnBonus() {
    const c = freeCell();
    bonus = { x: c.x, y: c.y, life: 6.5, t: 0 };
  }

  function hud() {
    E.api.hud({
      Puntos: M.fmtScore(score),
      Largo: snake.length,
      Nivel: level,
      Récord: M.fmtScore(Math.max(E.api.best, score)),
    });
  }

  function die() {
    if (!alive) return;
    alive = false;
    E.sfx('explode');
    E.camera.kick(16);
    E.camera.flash('#ff4d6d', 0.4);
    const head = snake[0];
    E.particles.burst(cx(head.x), cy(head.y), 34, {
      col: [P.a, P.b, P.c], speed0: 60, speed1: 340, life0: 0.4, life1: 1.1, r0: 2, r1: 5, add: true,
    });
    setTimeout(() => E.api.over({
      score,
      msg: 'Longitud final: ' + snake.length + ' · Nivel ' + level,
      stats: { Frutas: eaten, Nivel: level },
    }), 620);
  }

  const cx = (gx) => OX + gx * CELL + CELL / 2;
  const cy = (gy) => OY + gy * CELL + CELL / 2;

  function eat(golden) {
    eaten++;
    comboT = 2.2;
    combo = Math.min(9, combo + 1);
    const pts = (golden ? 50 : 10) * combo;
    score += pts;
    grow += golden ? 3 : 1;
    E.sfx(golden ? 'gem' : 'coin');
    E.camera.kick(golden ? 7 : 3);
    const h = snake[0];
    E.floaters.add(cx(h.x), cy(h.y) - 12, '+' + pts, {
      col: golden ? P.c : P.a, size: golden ? 26 : 20,
    });
    E.particles.burst(cx(h.x), cy(h.y), golden ? 22 : 12, {
      col: golden ? [P.c, '#fff'] : [P.a, P.b], speed0: 40, speed1: 190,
      life0: 0.25, life1: 0.6, r0: 1.5, r1: 4, add: true,
    });
    if (!golden) placeFood();
    /* cada 5 frutas: más velocidad y un muro nuevo */
    if (eaten % 5 === 0) {
      level++;
      step = Math.max(0.055, step * 0.9);
      E.sfx('levelup');
      for (let i = 0; i < 2; i++) {
        const c = freeCell();
        const far = Math.abs(c.x - snake[0].x) + Math.abs(c.y - snake[0].y);
        if (far > 4) walls.push(c);
      }
    }
    if (eaten % 7 === 0 && !bonus) spawnBonus();
    hud();
  }

  function advance() {
    dir = nextDir;
    const head = snake[0];
    let nx = head.x + dir.x, ny = head.y + dir.y;
    /* bordes que teletransportan */
    let ported = false;
    if (nx < 0) { nx = COLS - 1; ported = true; }
    if (nx >= COLS) { nx = 0; ported = true; }
    if (ny < 0) { ny = ROWS - 1; ported = true; }
    if (ny >= ROWS) { ny = 0; ported = true; }
    if (ported) {
      E.sfx('swoosh');
      E.particles.burst(cx(nx), cy(ny), 10, { col: [P.d, P.a], speed1: 120, life1: 0.4, add: true });
    }

    if (snake.some((s, i) => i < snake.length - 1 && s.x === nx && s.y === ny)) return die();
    if (walls.some((w) => w.x === nx && w.y === ny)) return die();

    snake.unshift({ x: nx, y: ny });
    if (grow > 0) grow--;
    else snake.pop();

    if (nx === food.x && ny === food.y) eat(false);
    else if (bonus && nx === bonus.x && ny === bonus.y) { eat(true); bonus = null; }
  }

  function turn(x, y) {
    if (dir.x === -x && dir.y === -y) return;      /* no se puede ir marcha atrás */
    nextDir = { x, y };
  }

  reset();

  return {
    update(dt) {
      portalPhase += dt;
      if (!alive) return;
      food.t += dt;
      if (bonus) { bonus.t += dt; bonus.life -= dt; if (bonus.life <= 0) bonus = null; }
      if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }

      const ax = E.input.axis();
      if (E.input.pressed('left') || ax.x < -0.6) turn(-1, 0);
      else if (E.input.pressed('right') || ax.x > 0.6) turn(1, 0);
      else if (E.input.pressed('up') || ax.y < -0.6) turn(0, -1);
      else if (E.input.pressed('down') || ax.y > 0.6) turn(0, 1);

      timer += dt;
      while (timer >= step) { timer -= step; if (alive) advance(); }
    },

    swipe(s) {
      if (s.dir === 'left') turn(-1, 0);
      else if (s.dir === 'right') turn(1, 0);
      else if (s.dir === 'up') turn(0, -1);
      else turn(0, 1);
    },

    draw(g) {
      const c = g.ctx;
      /* sala de fondo: sin esto el tablero flotaba sobre un negro plano */
      g.bgArena(E.t, 1);
      /* fondo del tablero */
      g.rrect(OX - 10, OY - 10, CELL * COLS + 20, CELL * ROWS + 20, 18, alpha(P.deep, 0.82));
      c.save();
      g.rrectPath(OX, OY, CELL * COLS, CELL * ROWS, 6); c.clip();
      g.bgGrid(CELL, alpha(P.a, 0.08), 1, OX, OY);
      c.restore();
      g.rrectStroke(OX - 10, OY - 10, CELL * COLS + 20, CELL * ROWS + 20, 18, alpha(P.a, 0.25), 2);

      /* portales en los bordes */
      const pulse = 0.35 + Math.sin(portalPhase * 2.4) * 0.15;
      c.save(); c.globalAlpha = pulse;
      g.rect(OX - 10, OY - 10, 4, CELL * ROWS + 20, P.d);
      g.rect(OX + CELL * COLS + 6, OY - 10, 4, CELL * ROWS + 20, P.d);
      g.rect(OX - 10, OY - 10, CELL * COLS + 20, 4, P.d);
      g.rect(OX - 10, OY + CELL * ROWS + 6, CELL * COLS + 20, 4, P.d);
      c.restore();

      /* muros */
      walls.forEach((w) => {
        g.rrect(OX + w.x * CELL + 3, OY + w.y * CELL + 3, CELL - 6, CELL - 6, 5, mix(P.dim, P.deep, 0.4));
        g.rrectStroke(OX + w.x * CELL + 3, OY + w.y * CELL + 3, CELL - 6, CELL - 6, 5, alpha(P.b, 0.4), 1.5);
      });

      /* comida */
      const fs = CELL * 0.3 + Math.sin(food.t * 5) * CELL * 0.04;
      g.bloom(cx(food.x), cy(food.y), CELL * 1.1, P.c, 0.55);
      g.circle(cx(food.x), cy(food.y), fs, P.c);
      g.circle(cx(food.x) - fs * 0.3, cy(food.y) - fs * 0.3, fs * 0.3, '#fff');

      /* fruta dorada temporal */
      if (bonus) {
        const k = M.clamp01(bonus.life / 6.5);
        g.bloom(cx(bonus.x), cy(bonus.y), CELL * 1.4, P.b, 0.6);
        g.star(cx(bonus.x), cy(bonus.y), CELL * 0.38, CELL * 0.17, 5, bonus.t * 2, P.b);
        g.ring(cx(bonus.x), cy(bonus.y), CELL * 0.52, 2.5, alpha(P.b, 0.8),
          -Math.PI / 2, -Math.PI / 2 + M.TAU * k);
      }

      /* serpiente: brillo aditivo + cuerpo */
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.22;
      for (let i = 0; i < snake.length; i++) {
        const s = snake[i];
        g.circle(cx(s.x), cy(s.y), CELL * 0.62, mix(P.a, P.b, i / Math.max(1, snake.length)));
      }
      c.restore();

      for (let i = snake.length - 1; i >= 0; i--) {
        const s = snake[i];
        const k = i / Math.max(1, snake.length - 1);
        const r = CELL * (0.44 - k * 0.09);
        g.rrect(cx(s.x) - r, cy(s.y) - r, r * 2, r * 2, r * 0.55, mix(P.a, P.d, k));
      }

      /* cabeza con ojos */
      const hd = snake[0];
      const hr = CELL * 0.46;
      g.rrect(cx(hd.x) - hr, cy(hd.y) - hr, hr * 2, hr * 2, hr * 0.5, alive ? P.ink : '#ff4d6d');
      const ex = dir.x * hr * 0.3, ey = dir.y * hr * 0.3;
      const px = -dir.y * hr * 0.32, py = dir.x * hr * 0.32;
      g.circle(cx(hd.x) + ex + px, cy(hd.y) + ey + py, hr * 0.19, P.deep);
      g.circle(cx(hd.x) + ex - px, cy(hd.y) + ey - py, hr * 0.19, P.deep);

      E.particles.draw(g);
      E.floaters.draw(g);

      /* combo */
      if (combo > 1 && comboT > 0) {
        g.text('COMBO ×' + combo, E.W / 2, OY - 22, {
          size: 20, align: 'center', weight: 900, color: P.c,
          shadow: P.c, shadowBlur: 16,
        });
      }
      E.ui.hint('Flechas o WASD · los bordes teletransportan', { bottom: 22 });
    },
  };
});
