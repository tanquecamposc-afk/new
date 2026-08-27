/* Almacén Sokoban — empuja cada caja hasta su marca. Con deshacer ilimitado. */
NX.game('almacen-sokoban', {
  w: 700, h: 640, pal: 'sunset',
  controls: { dpad: true },
  music: { root: 45, scale: 'dorian', bpm: 74, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  /* # muro, . meta, $ caja, * caja en meta, @ jugador, + jugador en meta */
  const LEVELS = [
    ['#######', '#     #', '# $.$ #', '#  @  #', '# $.$ #', '#  .  #', '#######'],
    ['########', '#      #', '# $##$ #', '# .@ . #', '# $##$ #', '#  ..  #', '########'],
    ['  #####', '###   #', '#.@$  #', '### $.#', '#.##$ #', '# # . ##', '#$ *$$.#', '#   .  #', '########'],
    ['#########', '#   #   #', '# $ $ $ #', '# .@. . #', '#   #   #', '#########'],
    ['#######', '#. #  #', '#  $  #', '# $#$ #', '#.@ . #', '#######'],
    ['##########', '#        #', '# $$$$   #', '# .... @ #', '#        #', '##########'],
    ['#######', '#     #', '# .$. #', '# $@$ #', '# .$. #', '#     #', '#######'],
    ['########', '#  .   #', '# $#$# #', '# @  . #', '# .#$# #', '#   .  #', '########'],
    ['#########', '#.$   $.#', '#  ###  #', '# $ @ $ #', '#  ###  #', '#.$   $.#', '#########'],
    ['##########', '#   ##   #', '# $ .. $ #', '#  $@$   #', '# . .. . #', '#   ##   #', '##########'],
  ];

  let lvl, grid, goals, boxes, hero, moves, pushes, hist, done, cell, OX, OY, t;

  function parse(i) {
    const L = LEVELS[i % LEVELS.length];
    const rows = L.length, cols = Math.max(...L.map((s) => s.length));
    grid = []; goals = []; boxes = [];
    for (let r = 0; r < rows; r++) {
      grid.push([]);
      for (let c = 0; c < cols; c++) {
        const ch = L[r][c] || ' ';
        grid[r][c] = ch === '#' ? 1 : 0;
        if (ch === '.' || ch === '*' || ch === '+') goals.push([r, c]);
        if (ch === '$' || ch === '*') boxes.push({ r, c, x: c, y: r });
        if (ch === '@' || ch === '+') hero = { r, c, x: c, y: r, face: 1 };
      }
    }
    const s = Math.min((W - 80) / cols, (H - 200) / rows);
    cell = Math.floor(s);
    OX = Math.round((W - cell * cols) / 2);
    OY = 120;
  }

  function reset(i) {
    lvl = i == null ? (lvl || 0) : i;
    parse(lvl);
    moves = 0; pushes = 0; hist = []; done = false; t = 0;
    hud();
  }
  function hud() {
    const onGoal = boxes.filter((b) => goals.some((g2) => g2[0] === b.r && g2[1] === b.c)).length;
    E.api.hud({ Nivel: (lvl % LEVELS.length) + 1 + '/' + LEVELS.length, Cajas: onGoal + '/' + boxes.length, Pasos: moves });
  }

  const boxAt = (r, c) => boxes.find((b) => b.r === r && b.c === c);
  const wall = (r, c) => !grid[r] || grid[r][c] === undefined || grid[r][c] === 1;

  function move(dr, dc) {
    if (done) return;
    const nr = hero.r + dr, nc = hero.c + dc;
    if (wall(nr, nc)) { E.sfx('error'); return; }
    const b = boxAt(nr, nc);
    if (b) {
      const br = nr + dr, bc = nc + dc;
      if (wall(br, bc) || boxAt(br, bc)) { E.sfx('error'); return; }
      hist.push({ hr: hero.r, hc: hero.c, b, br: b.r, bc: b.c });
      b.r = br; b.c = bc;
      pushes++;
      E.sfx('place');
    } else {
      hist.push({ hr: hero.r, hc: hero.c });
      E.sfx('step');
    }
    hero.r = nr; hero.c = nc;
    if (dc) hero.face = dc;
    moves++;
    hud();
    checkWin();
  }

  function undo() {
    if (!hist.length || done) return;
    const h = hist.pop();
    hero.r = h.hr; hero.c = h.hc;
    if (h.b) { h.b.r = h.br; h.b.c = h.bc; pushes--; }
    moves--;
    E.sfx('close');
    hud();
  }

  function checkWin() {
    const all = boxes.every((b) => goals.some((g2) => g2[0] === b.r && g2[1] === b.c));
    if (!all) return;
    done = true;
    E.sfx('win'); E.camera.kick(5);
    goals.forEach((g2) => E.particles.burst(OX + g2[1] * cell + cell / 2, OY + g2[0] * cell + cell / 2, 10,
      { col: [P.c, '#fff'], speed1: 160, add: true }));
    setTimeout(() => {
      lvl++;
      E.api.win({
        score: Math.max(0, (lvl) * 800 - moves * 5),
        title: 'Almacén ordenado',
        msg: 'Nivel ' + ((lvl - 1) % LEVELS.length + 1) + ' en ' + moves + ' pasos',
        stats: { Pasos: moves, Empujes: pushes },
      });
    }, 700);
  }

  reset(0);

  return {
    update(dt) {
      t += dt;
      hero.x = M.damp(hero.x, hero.c, 20, dt);
      hero.y = M.damp(hero.y, hero.r, 20, dt);
      boxes.forEach((b) => { b.x = M.damp(b.x, b.c, 20, dt); b.y = M.damp(b.y, b.r, 20, dt); });

      if (E.input.pressed('left')) move(0, -1);
      else if (E.input.pressed('right')) move(0, 1);
      else if (E.input.pressed('up')) move(-1, 0);
      else if (E.input.pressed('down')) move(1, 0);
      else if (E.input.pressed('z')) undo();
      else if (E.input.pressed('r')) reset(lvl);
      const sw = E.input.swipe;
      if (sw) {
        if (sw.dir === 'left') move(0, -1);
        else if (sw.dir === 'right') move(0, 1);
        else if (sw.dir === 'up') move(-1, 0);
        else move(1, 0);
      }
      const p = E.input.pointer;
      if (p.pressed) {
        if (p.y > H - 70 && p.y < H - 26) {
          if (Math.abs(p.x - (W / 2 - 80)) < 66) undo();
          else if (Math.abs(p.x - (W / 2 + 80)) < 66) reset(lvl);
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.text('ALMACÉN', W / 2, 48, { size: 24, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });
      g.text('Empuja cada caja hasta su marca', W / 2, 76, { size: 13, align: 'center', color: P.dim, weight: 600 });

      for (let r = 0; r < grid.length; r++) for (let cc = 0; cc < grid[r].length; cc++) {
        const x = OX + cc * cell, y = OY + r * cell;
        if (grid[r][cc] === 1) {
          g.rrect(x, y, cell, cell, 3, mix(P.dim, P.deep, 0.4));
          g.rect(x, y, cell, 3, alpha('#000', 0.25));
        } else {
          g.rect(x, y, cell, cell, (r + cc) % 2 ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.015)');
        }
      }
      goals.forEach((g2) => {
        const x = OX + g2[1] * cell + cell / 2, y = OY + g2[0] * cell + cell / 2;
        const on = boxAt(g2[0], g2[1]);
        g.ring(x, y, cell * 0.26, 3, on ? P.c : alpha(P.c, 0.5));
        if (!on) g.circle(x, y, cell * 0.09, alpha(P.c, 0.6));
      });

      boxes.forEach((b) => {
        const x = OX + b.x * cell, y = OY + b.y * cell;
        const on = goals.some((g2) => g2[0] === b.r && g2[1] === b.c);
        const col = on ? P.c : mix('#b98a4a', P.deep, 0.1);
        g.rrect(x + cell * 0.1, y + cell * 0.1, cell * 0.8, cell * 0.8, 5, col);
        g.line(x + cell * 0.18, y + cell * 0.18, x + cell * 0.82, y + cell * 0.82, alpha('#000', 0.22), 2);
        g.line(x + cell * 0.82, y + cell * 0.18, x + cell * 0.18, y + cell * 0.82, alpha('#000', 0.22), 2);
        if (on) g.rrectStroke(x + cell * 0.1, y + cell * 0.1, cell * 0.8, cell * 0.8, 5, '#fff', 1.5);
      });

      const hx = OX + hero.x * cell + cell / 2, hy = OY + hero.y * cell + cell / 2;
      G.Sprites.blob(g, hx, hy, cell * 0.3, P.a, t);

      const btn = (x, label, hov) => {
        g.rrect(x - 66, H - 70, 132, 42, 11, hov ? alpha(P.a, 0.3) : 'rgba(255,255,255,.06)');
        g.text(label, x, H - 43, { size: 15, align: 'center', weight: 800, color: P.ink });
      };
      const p = E.input.pointer;
      btn(W / 2 - 80, '↶ Deshacer', p.y > H - 70 && p.y < H - 26 && Math.abs(p.x - (W / 2 - 80)) < 66);
      btn(W / 2 + 80, '↺ Reiniciar', p.y > H - 70 && p.y < H - 26 && Math.abs(p.x - (W / 2 + 80)) < 66);

      E.particles.draw(g);
    },
  };
});
