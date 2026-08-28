/* Palabra Oculta — cinco letras, seis intentos y pistas de color. */
NX.game('palabra-oculta', {
  w: 620, h: 760, pal: 'toxic',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;
  const ROWS = 6, LEN = 5;
  const CELL = Math.min(62, (W - 60) / LEN);
  const OX = (W - CELL * LEN) / 2, OY = 96;
  const KEYS = ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'];

  let target, guesses, cur, state, letters, msg, msgT, daily, shake;

  function pickWord() {
    if (daily) {
      const d = new Date();
      const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      return NX.LEX.word5(new M.RNG(seed));
    }
    return NX.LEX.word5(E.rng);
  }

  function reset(dailyMode) {
    daily = dailyMode == null ? (daily || false) : dailyMode;
    target = pickWord();
    guesses = []; cur = ''; state = 'play'; letters = {}; msg = ''; msgT = 0; shake = 0;
    hud();
  }
  function hud() { E.api.hud({ Modo: daily ? 'Diaria' : 'Libre', Intentos: guesses.length + '/' + ROWS }); }

  function score(word) {
    const res = new Array(LEN).fill(0);
    const left = {};
    for (let i = 0; i < LEN; i++) {
      if (word[i] === target[i]) res[i] = 2;
      else left[target[i]] = (left[target[i]] || 0) + 1;
    }
    for (let i = 0; i < LEN; i++) {
      if (res[i] === 2) continue;
      if (left[word[i]]) { res[i] = 1; left[word[i]]--; }
    }
    return res;
  }

  function submit() {
    if (cur.length !== LEN) { msg = 'Faltan letras'; msgT = 1.4; shake = 0.4; E.sfx('error'); return; }
    const norm = cur.toLowerCase();
    if (!NX.LEX.has5(norm) && norm !== target.toLowerCase()) {
      msg = 'No está en el diccionario'; msgT = 1.6; shake = 0.4; E.sfx('error'); return;
    }
    const res = score(cur);
    guesses.push({ w: cur, res, t: 0 });
    res.forEach((v, i) => {
      const ch = cur[i];
      letters[ch] = Math.max(letters[ch] || 0, v);
    });
    E.sfx('select');
    /* Cada letra en su sitio suelta su chispa: se ve el avance sin leer. */
    const fila = guesses.length - 1;
    res.forEach((v, i) => {
      if (!v) return;
      setTimeout(() => E.particles.burst(
        OX + i * (CELL + 6) + CELL / 2, OY + fila * (CELL + 8) + CELL / 2,
        v === 2 ? 12 : 6,
        { col: [v === 2 ? '#4ade80' : '#ffb703', '#ffffff'], speed1: v === 2 ? 150 : 100, life1: 0.45, add: true }
      ), i * 90);
    });
    if (cur === target) {
      state = 'win';
      E.sfx('win'); E.camera.kick(10); E.camera.flash('#4ade80', 0.28);
      for (let i = 0; i < LEN; i++) {
        setTimeout(() => E.particles.burst(OX + i * (CELL + 6) + CELL / 2, OY + fila * (CELL + 8) + CELL / 2, 22,
          { col: ['#4ade80', '#ffffff'], speed1: 260, life1: 0.9, grav: 160, add: true }), i * 70);
      }
      const pts = (ROWS - guesses.length + 1) * 500;
      setTimeout(() => E.api.win({
        score: pts, title: '¡Acertaste!',
        msg: 'La palabra era ' + target + ' · ' + guesses.length + ' intentos',
        stats: { Intentos: guesses.length },
      }), 700);
    } else if (guesses.length >= ROWS) {
      state = 'lose';
      E.sfx('lose');
      setTimeout(() => E.api.over({ score: 0, msg: 'La palabra era ' + target }), 700);
    }
    cur = '';
    hud();
  }

  reset(false);

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (shake > 0) shake -= dt;
      guesses.forEach((g2) => { g2.t = Math.min(1, g2.t + dt * 2.4); });
      if (state !== 'play') return;

      E.input.chars().forEach((ch) => {
        if (ch === '\n') submit();
        else if (ch === '\b') cur = cur.slice(0, -1);
        else if (/[a-zA-ZñÑ]/.test(ch) && cur.length < LEN) cur += ch.toUpperCase();
      });

      const p = E.input.pointer;
      if (p.pressed) {
        if (p.y > 52 && p.y < 84) {
          if (p.x > W / 2 - 130 && p.x < W / 2 - 6) { reset(true); E.sfx('select'); return; }
          if (p.x > W / 2 + 6 && p.x < W / 2 + 130) { reset(false); E.sfx('select'); return; }
        }
        const ky = OY + ROWS * (CELL + 8) + 26;
        KEYS.forEach((row, r) => {
          const kw = Math.min(48, (W - 30) / 10);
          const rowW = row.length * (kw + 4);
          row.split('').forEach((ch, i) => {
            const x = W / 2 - rowW / 2 + i * (kw + 4);
            const y = ky + r * 56;
            if (p.x > x && p.x < x + kw && p.y > y && p.y < y + 50) {
              if (cur.length < LEN) { cur += ch; E.sfx('tick'); }
            }
          });
        });
        const by = ky + 3 * 56;
        if (p.y > by && p.y < by + 46) {
          if (p.x < W / 2) { cur = cur.slice(0, -1); E.sfx('tap'); }
          else submit();
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.28), P.deep);
      g.text('PALABRA OCULTA', W / 2, 36, { size: 21, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });
      [['Diaria', true], ['Libre', false]].forEach((m, i) => {
        const x = W / 2 + (i ? 6 : -130);
        const on = daily === m[1];
        g.rrect(x, 52, 124, 30, 9, on ? P.a : 'rgba(255,255,255,.06)');
        g.text(m[0], x + 62, 72, { size: 13, align: 'center', weight: 800, color: on ? '#0d1220' : P.dim });
      });

      const sh = shake > 0 ? Math.sin(shake * 60) * 6 : 0;
      for (let r = 0; r < ROWS; r++) {
        const gu = guesses[r];
        for (let i = 0; i < LEN; i++) {
          const x = OX + i * (CELL + 6) + (r === guesses.length ? sh : 0);
          const y = OY + r * (CELL + 8);
          let col = 'transparent', txt = '', tcol = P.ink;
          if (gu) {
            const rev = M.clamp01((gu.t - i * 0.12) * 3);
            const flip = Math.abs(Math.cos(rev * Math.PI));
            txt = gu.w[i];
            col = rev > 0.5 ? ['rgba(255,255,255,.10)', '#facc15', '#4ade80'][gu.res[i]] : 'transparent';
            tcol = rev > 0.5 && gu.res[i] > 0 ? '#0d1220' : P.ink;
            c.save();
            c.translate(x + CELL / 2, y + CELL / 2);
            c.scale(1, Math.max(0.05, flip));
            g.rrect(-CELL / 2, -CELL / 2, CELL, CELL, 8, col === 'transparent' ? 'rgba(255,255,255,.05)' : col);
            g.rrectStroke(-CELL / 2, -CELL / 2, CELL, CELL, 8, alpha(P.ink, 0.18), 1.5);
            g.text(txt, 0, CELL * 0.18, { size: CELL * 0.5, align: 'center', weight: 900, color: tcol });
            c.restore();
            continue;
          }
          if (r === guesses.length && i < cur.length) txt = cur[i];
          g.rrect(x, y, CELL, CELL, 8, 'rgba(255,255,255,.05)');
          g.rrectStroke(x, y, CELL, CELL, 8, txt ? alpha(P.a, 0.7) : alpha(P.ink, 0.15), txt ? 2 : 1.5);
          if (txt) g.text(txt, x + CELL / 2, y + CELL * 0.68, { size: CELL * 0.5, align: 'center', weight: 900, color: P.ink });
        }
      }

      /* teclado */
      const ky = OY + ROWS * (CELL + 8) + 26;
      const kw = Math.min(48, (W - 30) / 10);
      KEYS.forEach((row, r) => {
        const rowW = row.length * (kw + 4);
        row.split('').forEach((ch, i) => {
          const x = W / 2 - rowW / 2 + i * (kw + 4);
          const y = ky + r * 56;
          const st = letters[ch];
          const col = st === 2 ? '#4ade80' : st === 1 ? '#facc15' : st === 0 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.1)';
          g.rrect(x, y, kw, 50, 7, col);
          g.text(ch, x + kw / 2, y + 33, {
            size: 17, align: 'center', weight: 800, color: st > 0 ? '#0d1220' : st === 0 ? alpha(P.ink, 0.3) : P.ink });
        });
      });
      const by = ky + 3 * 56;
      g.rrect(W / 2 - 150, by, 140, 46, 9, 'rgba(255,255,255,.1)');
      g.text('⌫ Borrar', W / 2 - 80, by + 30, { size: 15, align: 'center', weight: 800, color: P.ink });
      g.rrect(W / 2 + 10, by, 140, 46, 9, P.a);
      g.text('Enviar', W / 2 + 80, by + 30, { size: 15, align: 'center', weight: 800, color: '#0d1220' });

      if (msgT > 0) {
        g.rrect(W / 2 - 120, OY - 42, 240, 32, 10, alpha(P.deep, 0.9));
        g.text(msg, W / 2, OY - 20, { size: 14, align: 'center', weight: 800, color: '#ff8a3d' });
      }
    },
  };
});
