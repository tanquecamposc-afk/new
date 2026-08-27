/* Puente de Palos — estira el palo justo lo necesario para cruzar. */
NX.game('puente-de-palos', {
  w: 800, h: 560, pal: 'forest',
  controls: { buttons: [{ k: 'space', label: 'ESTIRAR' }] },
  music: { root: 50, scale: 'major', bpm: 84, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const GY = H - 150, PW = 92;

  let cols, hero, stick, state, camX, score, perfect, alive, cherry, flipT;

  function reset() {
    cols = [{ x: 60, w: PW }];
    addColumn(); addColumn();
    hero = { x: 60 + PW - 26, y: GY, walk: 0 };
    stick = { len: 0, rot: 0 };
    state = 'idle';                 /* idle | grow | fall | walk | drop */
    camX = 0; score = 0; perfect = 0; alive = true; cherry = null; flipT = 0;
    hud();
  }
  function hud() { E.api.hud({ Puentes: score, Perfectos: perfect, Récord: E.api.best }); }

  function addColumn() {
    const last = cols[cols.length - 1];
    const gap = E.rng.float(60, 190);
    const w = E.rng.float(26, 84);
    const x = last.x + last.w + gap;
    cols.push({ x, w });
    if (E.rng.bool(0.45)) cherry = { x: last.x + last.w + gap * E.rng.float(0.3, 0.7), y: GY + 56, got: false };
  }

  reset();

  return {
    update(dt) {
      if (!alive) return;
      const press = E.input.down('space') || E.input.pointer.down;
      const target = cols[cols.length - 2];
      const next = cols[cols.length - 1];

      if (state === 'idle') {
        if (press) { state = 'grow'; }
      } else if (state === 'grow') {
        stick.len += 320 * dt;
        if (Math.floor(stick.len / 20) !== Math.floor((stick.len - 320 * dt) / 20)) E.sfx('tick');
        if (!press) { state = 'fall'; E.sfx('swoosh'); }
      } else if (state === 'fall') {
        stick.rot = M.approach(stick.rot, Math.PI / 2, 7 * dt);
        if (stick.rot >= Math.PI / 2 - 0.001) {
          stick.rot = Math.PI / 2;
          state = 'walk';
          E.sfx('thud');
        }
      } else if (state === 'walk') {
        const startX = target.x + target.w;
        const tipX = startX + stick.len;
        const goal = Math.min(tipX + 26, next.x + next.w - 26);
        hero.x = M.approach(hero.x, goal, 260 * dt);
        hero.walk += dt * 12;
        if (cherry && !cherry.got && Math.abs(hero.x - cherry.x) < 20) {
          cherry.got = true; score += 2; E.sfx('coin');
          E.floaters.add(cherry.x - camX, cherry.y - 40, '+2', { col: '#ff4d6d' });
        }
        if (Math.abs(hero.x - goal) < 1) {
          if (tipX >= next.x && tipX <= next.x + next.w) {
            const center = next.x + next.w / 2;
            const off = Math.abs(tipX - center);
            if (off < 8) {
              perfect++; score += 2;
              E.sfx('chime'); E.camera.kick(4);
              E.floaters.add(next.x + next.w / 2 - camX, GY - 20, '¡Perfecto!', { col: P.c, size: 20 });
            } else { score++; E.sfx('select'); }
            hud();
            state = 'drop';
          } else {
            state = 'dead';
            E.sfx('lose');
          }
        }
      } else if (state === 'drop') {
        camX = M.damp(camX, cols[cols.length - 1].x - 70, 6, dt);
        if (Math.abs(camX - (cols[cols.length - 1].x - 70)) < 2) {
          camX = cols[cols.length - 1].x - 70;
          cols.shift();
          addColumn();
          stick.len = 0; stick.rot = 0;
          state = 'idle';
        }
      } else if (state === 'dead') {
        hero.y += 900 * dt;
        if (hero.y > H + 60 && alive) {
          alive = false;
          setTimeout(() => E.api.over({
            score, label: 'Puentes', msg: perfect + ' encajes perfectos', stats: { Perfectos: perfect },
          }), 300);
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.4), P.deep);
      for (let i = 0; i < 6; i++) {
        G.Sprites.cloud(g, ((i * 190 - camX * 0.25) % (W + 300)) - 60, 70 + (i % 3) * 54, 44, alpha(P.ink, 0.06));
      }
      /* montañas */
      c.fillStyle = alpha(mix(P.d, P.deep, 0.4), 0.7);
      c.beginPath(); c.moveTo(-50, GY + 90);
      for (let i = 0; i < 10; i++) {
        const x = ((i * 240 - camX * 0.4) % (W + 500)) - 200;
        c.lineTo(x, GY + 90); c.lineTo(x + 120, GY - 30); c.lineTo(x + 240, GY + 90);
      }
      c.lineTo(W + 60, H); c.lineTo(-50, H); c.closePath(); c.fill();

      c.save(); c.translate(-camX, 0);

      cols.forEach((col, i) => {
        g.rect(col.x, GY, col.w, H - GY, mix(P.d, P.deep, 0.15));
        g.rect(col.x, GY, col.w, 8, P.a);
        if (i === cols.length - 1) {
          const cx = col.x + col.w / 2;
          g.rect(cx - 4, GY, 8, 8, P.c);
        }
      });

      if (cherry && !cherry.got) {
        g.circle(cherry.x, cherry.y, 9, '#ff4d6d');
        g.line(cherry.x, cherry.y - 8, cherry.x + 5, cherry.y - 18, '#4ade80', 2);
      }

      const target = cols[cols.length - 2];
      if (target && state !== 'dead') {
        const sx = target.x + target.w;
        c.save(); c.translate(sx, GY); c.rotate(stick.rot);
        g.rect(-2.5, -stick.len, 5, stick.len, mix('#7a5a34', P.deep, 0.1));
        c.restore();
      }

      /* héroe */
      const bob = state === 'walk' ? Math.abs(Math.sin(hero.walk)) * 3 : 0;
      g.push(hero.x, hero.y - bob);
      g.rrect(-11, -30, 22, 30, 6, P.c);
      g.circle(0, -36, 9, P.c);
      g.circle(3, -37, 2.6, P.deep);
      if (state === 'walk') {
        g.line(-4, 0, -4 + Math.sin(hero.walk) * 6, 8, P.c, 3);
        g.line(4, 0, 4 - Math.sin(hero.walk) * 6, 8, P.c, 3);
      } else { g.line(-4, 0, -4, 8, P.c, 3); g.line(4, 0, 4, 8, P.c, 3); }
      g.pop();
      c.restore();

      E.floaters.draw(g);
      g.text(String(score), W / 2, 70, {
        size: 54, align: 'center', weight: 900, color: alpha(P.ink, 0.92), mono: true,
        shadow: alpha(P.a, 0.4), shadowBlur: 18,
      });
      if (state === 'idle') E.ui.hint('Mantén pulsado para estirar el palo · suelta para soltarlo', { bottom: 20 });
    },
  };
});
