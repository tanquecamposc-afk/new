/* Nexo Defensa — defensa de torres compacta: seis torres, veinte oleadas y un jefe. */
NX.game('nexo-defensa', {
  w: 900, h: 640, pal: 'forest',
  music: { root: 43, scale: 'dorian', bpm: 104, mood: 'tense' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const CELL = 60;

  const PATH = [[-40, 140], [300, 140], [300, 320], [120, 320], [120, 500], [560, 500],
                [560, 240], [760, 240], [760, 580], [940, 580]];

  const TOWERS = [
    { id: 'arq', n: 'Arquero', cost: 90, dmg: 9, rate: 0.55, range: 130, col: '#4ade80', ico: '🏹' },
    { id: 'can', n: 'Cañón', cost: 170, dmg: 26, rate: 1.5, range: 120, col: '#ff8a3d', ico: '💣', splash: 44 },
    { id: 'hie', n: 'Hielo', cost: 140, dmg: 4, rate: 0.9, range: 115, col: '#7dd3fc', ico: '❄️', slow: 0.45 },
    { id: 'ray', n: 'Tesla', cost: 240, dmg: 16, rate: 0.75, range: 145, col: '#c084fc', ico: '⚡', chain: 3 },
    { id: 'fra', n: 'Francotirador', cost: 300, dmg: 70, rate: 2.2, range: 300, col: '#22e0ff', ico: '🎯' },
    { id: 'oro', n: 'Mina', cost: 200, dmg: 0, rate: 0, range: 0, col: '#ffd45e', ico: '⛏️', income: 26 },
  ];

  let towers, foes, shots, money, lives, wave, waveT, spawning, spawnQ, alive, sel, hoverCell, msg, msgT, speed, t;

  function pathLen() {
    let L = 0;
    for (let i = 1; i < PATH.length; i++) L += M.dist(PATH[i - 1][0], PATH[i - 1][1], PATH[i][0], PATH[i][1]);
    return L;
  }
  const TOTAL = pathLen();

  function posAt(d) {
    let acc = 0;
    for (let i = 1; i < PATH.length; i++) {
      const a = PATH[i - 1], b = PATH[i];
      const seg = M.dist(a[0], a[1], b[0], b[1]);
      if (acc + seg >= d) {
        const k = (d - acc) / seg;
        return { x: M.lerp(a[0], b[0], k), y: M.lerp(a[1], b[1], k) };
      }
      acc += seg;
    }
    return { x: PATH[PATH.length - 1][0], y: PATH[PATH.length - 1][1] };
  }

  function onPath(x, y) {
    for (let i = 1; i < PATH.length; i++) {
      if (M.distToSeg(x, y, PATH[i - 1][0], PATH[i - 1][1], PATH[i][0], PATH[i][1]) < 40) return true;
    }
    return false;
  }

  function reset() {
    towers = []; foes = []; shots = [];
    money = 260; lives = 20; wave = 0; waveT = 3; spawning = false; spawnQ = [];
    alive = true; sel = null; hoverCell = null; msg = ''; msgT = 0; speed = 1; t = 0;
    hud();
  }
  function hud() { E.api.hud({ Oro: '$' + money, Vidas: lives, Oleada: wave + '/20' }); }

  function startWave() {
    wave++;
    spawnQ = [];
    const n = 6 + wave * 2;
    for (let i = 0; i < n; i++) {
      let kind = 0;
      if (wave > 3 && i % 4 === 0) kind = 1;
      if (wave > 7 && i % 6 === 0) kind = 2;
      spawnQ.push({ kind, delay: i * Math.max(0.24, 0.7 - wave * 0.02) });
    }
    if (wave % 5 === 0) spawnQ.push({ kind: 3, delay: n * 0.5 + 1 });
    if (wave === 20) spawnQ.push({ kind: 4, delay: n * 0.5 + 2 });
    spawning = true;
    E.sfx('alarm');
    hud();
  }

  function spawnFoe(kind) {
    const stats = [
      { hp: 26 + wave * 13, sp: 52, r: 13, col: '#ff6b8a', gold: 12 },
      { hp: 18 + wave * 9, sp: 105, r: 10, col: '#ffd45e', gold: 14 },
      { hp: 90 + wave * 34, sp: 34, r: 19, col: '#94a3b8', gold: 26, armor: 0.4 },
      { hp: 340 + wave * 90, sp: 38, r: 26, col: '#c084fc', gold: 120, boss: true },
      { hp: 3200, sp: 26, r: 36, col: '#ff4d6d', gold: 600, boss: true },
    ][kind];
    foes.push(Object.assign({ d: 0, slow: 0, kind }, stats, { max: stats.hp }));
  }

  function place(x, y) {
    if (!sel) return;
    const T = TOWERS[sel];
    if (money < T.cost) { E.sfx('error'); msg = 'No tienes oro suficiente'; msgT = 1.4; return; }
    const cx = Math.floor(x / CELL) * CELL + CELL / 2;
    const cy = Math.floor(y / CELL) * CELL + CELL / 2;
    if (onPath(cx, cy)) { E.sfx('error'); msg = 'No puedes construir en el camino'; msgT = 1.4; return; }
    if (towers.some((tw) => tw.x === cx && tw.y === cy)) { E.sfx('error'); return; }
    towers.push(Object.assign({}, T, { x: cx, y: cy, cool: 0, lvl: 1, a: 0, kills: 0 }));
    money -= T.cost;
    E.sfx('place');
    hud();
  }

  function damage(f, dmg, from) {
    f.hp -= dmg * (1 - (f.armor || 0));
    if (f.hp <= 0) {
      money += f.gold;
      if (from) from.kills++;
      E.particles.burst(posAt(f.d).x, posAt(f.d).y, 10, { col: [f.col], speed1: 180, add: true });
      E.sfx('hit');
      foes.splice(foes.indexOf(f), 1);
      hud();
    }
  }

  reset();

  return {
    update(dtRaw) {
      const dt = dtRaw * speed;
      t += dt;
      if (msgT > 0) msgT -= dtRaw;
      if (!alive) return;

      const p = E.input.pointer;
      hoverCell = p.inside ? { x: Math.floor(p.x / CELL) * CELL + CELL / 2, y: Math.floor(p.y / CELL) * CELL + CELL / 2 } : null;
      if (p.pressed) {
        if (p.y > H - 80) {
          const i = Math.floor((p.x - 20) / 130);
          if (i >= 0 && i < TOWERS.length) { sel = sel === i ? null : i; E.sfx('tap'); }
          else if (p.x > W - 110) { speed = speed === 1 ? 2 : 1; E.sfx('tick'); }
        } else if (sel != null) place(p.x, p.y);
      }
      if (E.input.pressed('space') && !spawning && waveT > 0.4) { waveT = 0.3; }
      for (let i = 1; i <= 6; i++) if (E.input.pressed(String(i))) sel = i - 1;

      if (!spawning) {
        waveT -= dt;
        if (waveT <= 0 && wave < 20) startWave();
      } else {
        for (let i = spawnQ.length - 1; i >= 0; i--) {
          spawnQ[i].delay -= dt;
          if (spawnQ[i].delay <= 0) { spawnFoe(spawnQ[i].kind); spawnQ.splice(i, 1); }
        }
        if (!spawnQ.length && !foes.length) {
          spawning = false;
          waveT = 6;
          money += 40 + wave * 6;
          towers.filter((tw) => tw.income).forEach((tw) => { money += tw.income; });
          E.sfx('levelup');
          hud();
          if (wave >= 20) {
            alive = false;
            setTimeout(() => E.api.win({
              score: money + lives * 500 + wave * 300,
              title: '¡Nexo defendido!',
              msg: 'Sobreviviste las 20 oleadas con ' + lives + ' vidas',
              stats: { Vidas: lives, Oro: money },
            }), 600);
          }
        }
      }

      foes.forEach((f) => {
        const sp = f.sp * (f.slow > 0 ? 0.5 : 1);
        if (f.slow > 0) f.slow -= dt;
        f.d += sp * dt;
        if (f.d >= TOTAL) {
          lives -= f.boss ? 5 : 1;
          E.sfx('hurt'); E.camera.kick(8); E.camera.flash('#ff4d6d', 0.25);
          foes.splice(foes.indexOf(f), 1);
          hud();
          if (lives <= 0) {
            alive = false;
            E.sfx('lose');
            setTimeout(() => E.api.over({
              score: wave * 400 + money, msg: 'Cayeron en la oleada ' + wave,
              stats: { Oleada: wave },
            }), 500);
          }
        }
      });

      towers.forEach((tw) => {
        if (!tw.range) return;
        tw.cool -= dt;
        let best = null, bd = -1;
        foes.forEach((f) => {
          const pp = posAt(f.d);
          if (M.dist(pp.x, pp.y, tw.x, tw.y) <= tw.range && f.d > bd) { bd = f.d; best = f; }
        });
        if (best) {
          const pp = posAt(best.d);
          tw.a = M.dampAngle(tw.a, Math.atan2(pp.y - tw.y, pp.x - tw.x), 12, dt);
          if (tw.cool <= 0) {
            tw.cool = tw.rate;
            shots.push({ x: tw.x, y: tw.y, target: best, from: tw, t: 0, col: tw.col });
            E.sfx(tw.id === 'can' ? 'shoot' : tw.id === 'ray' ? 'zap' : 'tap');
          }
        }
      });

      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.t += dt * 5;
        if (foes.indexOf(s.target) < 0) { shots.splice(i, 1); continue; }
        if (s.t >= 1) {
          const pp = posAt(s.target.d);
          if (s.from.splash) {
            foes.slice().forEach((f) => {
              const q = posAt(f.d);
              if (M.dist(q.x, q.y, pp.x, pp.y) < s.from.splash) damage(f, s.from.dmg, s.from);
            });
            E.particles.burst(pp.x, pp.y, 12, { col: [s.col], speed1: 200, add: true });
          } else if (s.from.chain) {
            let cur = s.target, hit = [];
            for (let k = 0; k < s.from.chain; k++) {
              if (!cur) break;
              hit.push(posAt(cur.d));
              damage(cur, s.from.dmg, s.from);
              const cp = hit[hit.length - 1];
              cur = foes.find((f) => hit.indexOf(f) < 0 && M.dist(posAt(f.d).x, posAt(f.d).y, cp.x, cp.y) < 90);
            }
          } else {
            if (s.from.slow) s.target.slow = 1.2;
            damage(s.target, s.from.dmg, s.from);
          }
          shots.splice(i, 1);
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix('#173a22', P.deep, 0.4), P.deep);
      g.bgGrid(CELL, alpha(P.a, 0.05), 1, 0, 0);

      /* camino */
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      c.strokeStyle = mix('#7a5a34', P.deep, 0.25); c.lineWidth = 46;
      c.beginPath();
      PATH.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])));
      c.stroke();
      c.strokeStyle = alpha('#d8c090', 0.25); c.lineWidth = 2; c.setLineDash([12, 16]);
      c.stroke(); c.setLineDash([]);
      c.restore();

      /* nexo */
      const end = PATH[PATH.length - 1];
      g.bloom(end[0] - 40, end[1], 60, P.c, 0.4);
      g.ngon(end[0] - 40, end[1], 24, 6, t, P.c);

      /* previsualización */
      if (sel != null && hoverCell) {
        const T = TOWERS[sel];
        const bad = onPath(hoverCell.x, hoverCell.y) || towers.some((tw) => tw.x === hoverCell.x && tw.y === hoverCell.y);
        c.save(); c.globalAlpha = 0.25;
        if (T.range) g.circle(hoverCell.x, hoverCell.y, T.range, bad ? '#ff4d6d' : T.col);
        c.restore();
        g.rrectStroke(hoverCell.x - CELL / 2 + 4, hoverCell.y - CELL / 2 + 4, CELL - 8, CELL - 8, 8,
          bad ? '#ff4d6d' : T.col, 2);
      }

      towers.forEach((tw) => {
        g.rrect(tw.x - 21, tw.y - 21, 42, 42, 10, mix(tw.col, P.deep, 0.35));
        g.rrect(tw.x - 21, tw.y - 21, 42, 14, 10, alpha('#ffffff', 0.12));
        if (tw.range) {
          g.push(tw.x, tw.y, tw.a);
          g.rect(2, -4, 22, 8, tw.col);
          g.pop();
        }
        g.circle(tw.x, tw.y, 11, tw.col);
        g.text(tw.ico, tw.x, tw.y + 5, { size: 14, align: 'center' });
      });

      foes.forEach((f) => {
        const pp = posAt(f.d);
        if (f.slow > 0) g.ring(pp.x, pp.y, f.r + 5, 2, alpha('#7dd3fc', 0.7));
        G.Sprites.blob(g, pp.x, pp.y, f.r, f.col, t + f.d * 0.02);
        g.rrect(pp.x - f.r, pp.y - f.r - 10, f.r * 2, 4, 2, 'rgba(0,0,0,.5)');
        g.rrect(pp.x - f.r, pp.y - f.r - 10, f.r * 2 * M.clamp01(f.hp / f.max), 4, 2,
          f.hp / f.max > 0.5 ? '#4ade80' : '#ff4d6d');
      });

      c.save(); c.globalCompositeOperation = 'lighter';
      shots.forEach((s) => {
        if (foes.indexOf(s.target) < 0) return;
        const pp = posAt(s.target.d);
        const x = M.lerp(s.x, pp.x, s.t), y = M.lerp(s.y, pp.y, s.t);
        if (s.from.chain) g.line(s.x, s.y, x, y, s.col, 3);
        else g.circle(x, y, 5, s.col);
      });
      c.restore();

      E.particles.draw(g);

      /* barra de construcción */
      g.rect(0, H - 80, W, 80, alpha(P.deep, 0.88));
      TOWERS.forEach((T, i) => {
        const x = 20 + i * 130;
        const on = sel === i;
        const afford = money >= T.cost;
        g.rrect(x, H - 70, 120, 60, 12, on ? alpha(T.col, 0.35) : 'rgba(255,255,255,.05)');
        g.rrectStroke(x, H - 70, 120, 60, 12, on ? T.col : alpha(P.ink, 0.12), on ? 2 : 1);
        g.text(T.ico, x + 22, H - 36, { size: 22, align: 'center' });
        g.text(T.n, x + 44, H - 44, { size: 12.5, weight: 800, color: afford ? P.ink : alpha(P.ink, 0.4) });
        g.text('$' + T.cost, x + 44, H - 26, { size: 12, weight: 800, color: afford ? P.c : '#ff4d6d' });
        g.text('[' + (i + 1) + ']', x + 108, H - 58, { size: 10, align: 'right', color: P.dim, weight: 800 });
      });
      const hovSp = E.input.pointer.y > H - 80 && E.input.pointer.x > W - 110;
      g.rrect(W - 100, H - 70, 82, 60, 12, hovSp ? alpha(P.a, 0.3) : 'rgba(255,255,255,.05)');
      g.text(speed === 1 ? '▶ x1' : '▶▶ x2', W - 59, H - 34, { size: 15, align: 'center', weight: 800, color: P.ink });

      if (!spawning && wave < 20) {
        g.text('Oleada ' + (wave + 1) + ' en ' + Math.ceil(waveT) + ' s · Espacio para adelantar',
          W / 2, 30, { size: 14, align: 'center', color: P.dim, weight: 700 });
      }
      if (msgT > 0) E.ui.title(msg, W / 2, 80, { size: 22 });
    },
  };
});
