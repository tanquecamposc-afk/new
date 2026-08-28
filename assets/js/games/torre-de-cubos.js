/* Torre de Cubos — apila bloques en movimiento; lo que sobresale se cae. */
NX.game('torre-de-cubos', {
  w: 640, h: 680, pal: 'ice',
  controls: { buttons: [{ k: 'space', label: 'SOLTAR' }] },
  music: { root: 48, scale: 'penta', bpm: 96, mood: 'calm' },
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const BH = 26;

  let stack, moving, falling, camY, score, perfect, alive, speed, aviso, avisoT;

  function reset() {
    aviso = ''; avisoT = 0;
    stack = [{ x: W / 2 - 90, w: 180, y: H - 90 }];
    falling = []; score = 0; perfect = 0; alive = true; speed = 150;
    newBlock();
    hud();
  }
  function hud() { E.api.hud({ Altura: stack.length - 1, Puntos: M.fmtScore(score), Perfectos: perfect }); }

  function newBlock() {
    const top = stack[stack.length - 1];
    moving = {
      x: E.rng.bool() ? -top.w : W, w: top.w, y: top.y - BH,
      dir: 0, sp: speed, listo: false,
    };
    moving.dir = moving.x < 0 ? 1 : -1;
    camY = 0;
  }

  function drop() {
    /* Mientras el bloque no haya pasado por encima de la torre no se puede
       soltar: si no, tocar nada más entrar era perder en el acto. */
    if (!moving.listo) { aviso = 'Espera a que el bloque llegue encima'; avisoT = 1.2; return; }
    const top = stack[stack.length - 1];
    const left = Math.max(moving.x, top.x);
    const right = Math.min(moving.x + moving.w, top.x + top.w);
    const w = right - left;
    if (w <= 2) {
      alive = false;
      falling.push({ x: moving.x, y: moving.y, w: moving.w, vy: 0, vx: moving.dir * 40, rot: 0, vr: moving.dir });
      E.sfx('lose'); E.camera.kick(12);
      setTimeout(() => E.api.over({
        score, msg: 'Altura ' + (stack.length - 1) + ' · ' + perfect + ' encajes perfectos',
        stats: { Altura: stack.length - 1, Perfectos: perfect },
      }), 800);
      return;
    }
    const off = Math.abs(moving.x - top.x);
    if (off < 5) {
      perfect++;
      const bonus = 50 + perfect * 25;
      score += bonus;
      E.sfx('chime'); E.camera.kick(4);
      E.floaters.add(left + w / 2, moving.y, '¡Perfecto! +' + bonus, { col: P.c, size: 20 });
      E.particles.burst(left + w / 2, moving.y, 16, { col: [P.c, '#fff'], speed1: 200, add: true });
      stack.push({ x: top.x, w: top.w, y: moving.y });
    } else {
      perfect = 0;
      score += 20;
      E.sfx('place');
      /* trozo que se despeña */
      if (moving.x < left) falling.push({ x: moving.x, y: moving.y, w: left - moving.x, vy: 0, vx: -60, rot: 0, vr: -2 });
      if (moving.x + moving.w > right) falling.push({ x: right, y: moving.y, w: moving.x + moving.w - right, vy: 0, vx: 60, rot: 0, vr: 2 });
      stack.push({ x: left, w, y: moving.y });
    }
    speed = Math.min(430, speed + 8);
    hud();
    newBlock();
  }

  reset();

  return {
    update(dt) {
      falling.forEach((f) => { f.vy += 1500 * dt; f.y += f.vy * dt; f.x += f.vx * dt; f.rot += f.vr * dt; });
      for (let i = falling.length - 1; i >= 0; i--) if (falling[i].y > H + 200) falling.splice(i, 1);
      if (!alive) return;

      if (avisoT > 0) avisoT -= dt;
      moving.x += moving.dir * moving.sp * dt;
      if (moving.x < -moving.w * 0.6) { moving.x = -moving.w * 0.6; moving.dir = 1; }
      if (moving.x > W - moving.w * 0.4) { moving.x = W - moving.w * 0.4; moving.dir = -1; }

      /* en cuanto solapa con la cima, el bloque ya cuenta como soltable */
      if (!moving.listo) {
        const t2 = stack[stack.length - 1];
        if (Math.min(moving.x + moving.w, t2.x + t2.w) - Math.max(moving.x, t2.x) > 2) moving.listo = true;
      }

      if (E.input.pressed('space') || E.input.pressed('enter') || E.input.pointer.pressed) drop();
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);

      /* la cámara sigue a la torre */
      const topY = stack[stack.length - 1].y;
      const off = Math.max(0, H * 0.42 - topY);
      c.save(); c.translate(0, off);

      for (let i = 0; i < 30; i++) {
        const x = (i * 113.7) % W, y = (i * 79.3) % (H * 2) - off * 0.4;
        g.circle(x, y, 1.2, alpha('#ffffff', 0.09));
      }

      stack.forEach((b, i) => {
        const col = mix(P.a, P.b, (i % 12) / 12);
        g.rrect(b.x, b.y, b.w, BH, 4, col);
        g.rrect(b.x, b.y, b.w, BH * 0.36, 4, alpha('#ffffff', 0.22));
        g.rrectStroke(b.x, b.y, b.w, BH, 4, alpha('#000', 0.2), 1);
      });

      falling.forEach((f) => {
        c.save(); c.translate(f.x + f.w / 2, f.y + BH / 2); c.rotate(f.rot);
        g.rrect(-f.w / 2, -BH / 2, f.w, BH, 4, alpha(P.dim, 0.85));
        c.restore();
      });

      if (alive) {
        g.bloom(moving.x + moving.w / 2, moving.y + BH / 2, 60, P.c, 0.3);
        g.rrect(moving.x, moving.y, moving.w, BH, 4, P.c);
        g.rrect(moving.x, moving.y, moving.w, BH * 0.36, 4, alpha('#ffffff', 0.28));
        /* guía de alineación */
        const top = stack[stack.length - 1];
        c.save(); c.setLineDash([4, 6]);
        g.line(top.x, moving.y - 10, top.x, top.y, alpha(P.ink, 0.3), 1.5);
        g.line(top.x + top.w, moving.y - 10, top.x + top.w, top.y, alpha(P.ink, 0.3), 1.5);
        c.restore();
      }
      c.restore();

      E.particles.draw(g);
      E.floaters.draw(g);
      g.text(String(stack.length - 1), W / 2, 66, {
        size: 52, align: 'center', weight: 900, color: alpha(P.ink, 0.9), mono: true,
        shadow: alpha(P.a, 0.4), shadowBlur: 20,
      });
      if (avisoT > 0) {
        g.text(aviso, W / 2, 84, { size: 17, align: 'center', weight: 800,
          color: G.alpha(P.c, Math.min(1, avisoT / 0.6)) });
      }
      E.ui.hint('Espacio o toca para soltar el bloque', { bottom: 16 });
    },
  };
});
