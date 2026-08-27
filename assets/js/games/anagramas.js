/* Anagramas — con siete letras, encuentra todas las palabras que puedas. */
NX.game('anagramas', {
  w: 700, h: 660, pal: 'candy',
  music: null,
}, function (E) {
  'use strict';
  const M = E.M, G = E.GFX, P = E.pal;
  const { alpha, mix } = G;
  const W = E.opts.w, H = E.opts.h;

  let letters, cur, found, possible, score, timeLeft, alive, msg, msgT, ronda;

  function canForm(word, pool) {
    const p = pool.slice();
    for (const ch of word) {
      const i = p.indexOf(ch);
      if (i < 0) return false;
      p.splice(i, 1);
    }
    return true;
  }

  function newRound() {
    /* elige una palabra base de 6-7 letras y baraja sus letras */
    let base = null;
    for (let i = 0; i < 200; i++) {
      const w = E.rng.pick(NX.LEX.W5);
      const extra = 'aeiouslrnt'[E.rng.int(10)] + 'aeiouslrnmc'[E.rng.int(11)];
      base = (w + extra).toUpperCase();
      break;
    }
    letters = E.rng.shuffle(base.split(''));
    possible = NX.LEX.W5.map((w) => w.toUpperCase()).filter((w) => w.length >= 4 && canForm(w, letters));
    /* palabras cortas válidas del banco */
    NX.LEX.RAPIDAS.forEach((w) => {
      const up = w.toUpperCase();
      if (up.length >= 4 && canForm(up, letters) && possible.indexOf(up) < 0) possible.push(up);
    });
    cur = '';
    ronda = (ronda || 0) + 1;
    hud();
  }

  function reset() {
    found = []; score = 0; timeLeft = 120; alive = true; msg = ''; msgT = 0; ronda = 0;
    newRound();
  }
  function hud() {
    E.api.hud({ Puntos: M.fmtScore(score), Halladas: found.length + '/' + possible.length, Tiempo: Math.ceil(timeLeft) });
  }

  function submit() {
    const w = cur;
    cur = '';
    if (w.length < 4) { msg = 'Mínimo 4 letras'; msgT = 1.4; E.sfx('error'); return; }
    if (found.indexOf(w) >= 0) { msg = 'Ya la tenías'; msgT = 1.4; E.sfx('error'); return; }
    if (possible.indexOf(w) < 0) { msg = 'No vale'; msgT = 1.4; E.sfx('error'); E.camera.kick(3); return; }
    found.push(w);
    const pts = w.length * w.length * 12;
    score += pts;
    timeLeft += 4;
    E.sfx('coin');
    E.floaters.add(W / 2, 250, '+' + pts, { col: P.c, size: 22 });
    msg = '¡' + w + '!'; msgT = 1.2;
    hud();
    if (found.length === possible.length) { msg = '¡Todas!'; msgT = 2; newRound(); found = []; E.sfx('win'); }
  }

  reset();

  return {
    update(dt) {
      if (msgT > 0) msgT -= dt;
      if (!alive) return;
      timeLeft -= dt;
      if (Math.ceil(timeLeft) !== Math.ceil(timeLeft + dt)) hud();
      if (timeLeft <= 0) {
        alive = false;
        E.sfx('lose');
        setTimeout(() => E.api.over({
          score, msg: found.length + ' palabras encontradas',
          stats: { Palabras: found.length, Ronda: ronda },
        }), 500);
        return;
      }

      E.input.chars().forEach((ch) => {
        if (ch === '\n') submit();
        else if (ch === '\b') cur = cur.slice(0, -1);
        else if (/[a-zA-ZñÑ]/.test(ch)) {
          const up = ch.toUpperCase();
          const pool = letters.slice();
          cur.split('').forEach((k) => { const i = pool.indexOf(k); if (i >= 0) pool.splice(i, 1); });
          if (pool.indexOf(up) >= 0) { cur += up; E.sfx('tick'); }
        }
      });
      if (E.input.pressed('space')) { letters = E.rng.shuffle(letters); E.sfx('swoosh'); }

      const p = E.input.pointer;
      if (p.pressed) {
        const R = 96, cx = W / 2, cy = 400;
        letters.forEach((ch, i) => {
          const a = (i / letters.length) * M.TAU - Math.PI / 2;
          const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
          if (M.dist(p.x, p.y, x, y) < 30) {
            const pool = letters.slice();
            cur.split('').forEach((k) => { const j = pool.indexOf(k); if (j >= 0) pool.splice(j, 1); });
            if (pool.indexOf(ch) >= 0) { cur += ch; E.sfx('tick'); }
          }
        });
        if (p.y > 520 && p.y < 566) {
          if (p.x > W / 2 - 160 && p.x < W / 2 - 10) { cur = ''; E.sfx('tap'); }
          else if (p.x > W / 2 + 10 && p.x < W / 2 + 160) submit();
        }
      }
    },

    draw(g) {
      const c = g.ctx;
      g.bgGradient(mix(P.bg, P.d, 0.3), P.deep);
      g.text('ANAGRAMAS', W / 2, 44, { size: 22, align: 'center', weight: 900, color: P.ink, letterSpacing: 3 });
      g.text('Forma palabras de 4 letras o más', W / 2, 70, { size: 13, align: 'center', color: P.dim, weight: 600 });

      /* palabra en curso */
      g.rrect(W / 2 - 190, 210, 380, 62, 14, alpha(P.deep, 0.75));
      g.text(cur || '…', W / 2, 254, {
        size: 34, align: 'center', weight: 900, color: cur ? P.c : alpha(P.dim, 0.5), letterSpacing: 4,
      });

      /* rueda de letras */
      const R = 96, cx = W / 2, cy = 400;
      g.ring(cx, cy, R, 1.5, alpha(P.a, 0.2));
      const pool = letters.slice();
      cur.split('').forEach((k) => { const i = pool.indexOf(k); if (i >= 0) pool.splice(i, 1); });
      letters.forEach((ch, i) => {
        const a = (i / letters.length) * M.TAU - Math.PI / 2;
        const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
        const avail = pool.indexOf(ch) >= 0;
        if (avail) pool.splice(pool.indexOf(ch), 1);
        g.circle(x, y, 26, avail ? mix(P.a, P.b, i / letters.length) : 'rgba(255,255,255,.06)');
        g.text(ch, x, y + 9, { size: 24, align: 'center', weight: 900, color: avail ? '#0d1220' : alpha(P.ink, 0.25) });
      });
      g.text('↻', cx, cy + 10, { size: 26, align: 'center', color: alpha(P.ink, 0.35) });

      /* botones */
      g.rrect(W / 2 - 160, 520, 150, 46, 11, 'rgba(255,255,255,.08)');
      g.text('Borrar', W / 2 - 85, 550, { size: 15, align: 'center', weight: 800, color: P.ink });
      g.rrect(W / 2 + 10, 520, 150, 46, 11, P.a);
      g.text('Enviar', W / 2 + 85, 550, { size: 15, align: 'center', weight: 800, color: '#0d1220' });

      /* lista */
      const cols = 4;
      found.slice(-16).forEach((w, i) => {
        g.text(w, 40 + (i % cols) * 160, 600 + Math.floor(i / cols) * 22, { size: 13, color: P.c, weight: 700 });
      });

      g.rrect(W / 2 - 150, 96, 300, 10, 5, 'rgba(255,255,255,.12)');
      g.rrect(W / 2 - 150, 96, 300 * M.clamp01(timeLeft / 120), 10, 5, timeLeft > 25 ? P.a : '#ff4d6d');

      if (msgT > 0) g.text(msg, W / 2, 180, { size: 18, align: 'center', weight: 800, color: P.c });
      E.floaters.draw(g);
      E.ui.hint('Escribe o pulsa las letras · Espacio para barajar', { bottom: 12 });
    },
  };
});
