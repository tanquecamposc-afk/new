/* NEXO ARCADE — platform/player.js : ficha de juego y reproductor. */
(function (global) {
  'use strict';
  const NX = (global.NX = global.NX || {});
  const D = NX.DOM, h = D.h, icon = D.icon;
  const CAT = NX.CATALOG, S = NX.Store, M = NX.M;

  const isTouch = () => matchMedia('(hover: none) and (pointer: coarse)').matches;

  NX.Views.game = function (id) {
    const game = CAT.byId[id];
    if (!game) return NX.Views.notFound();

    const cat = CAT.cat(game.cat);
    let engine = null, iframe = null, started = false, paused = false, over = false;
    let sessionStart = 0;

    /* ---------------------------------------------------------- estructura */
    const hud = h('div.hud');
    const stage = h('div.stage');
    const top = h('div.player-top',
      h('div.pt-title',
        h('span.pt-mark', { text: cat.icon }),
        h('b', { text: game.t })),
      hud);

    const bar = h('div.player-bar');
    const player = h('div.player', top, stage, bar);

    /* ------------------------------------------------------------- capas */
    const ovLoad = h('div.ov.ov-load',
      h('div', h('div.spinner'), h('p', { style: { marginTop: '12px', color: 'var(--text-dim)' }, text: 'Cargando juego…' })));

    const nivStart = CAT.nivel(game);
    const ovStart = h('div.ov.start.hide',
      h('div.ov-inner',
        h('div.play-ring', { html: icon('play', 34) }),
        h('h2', { text: game.t }),
        h('div.ov-tags',
          h('span.ov-cat', { text: cat.icon + ' ' + cat.name }),
          h('span.ov-niv', { style: { color: nivStart.col, borderColor: nivStart.col + '55' },
            text: nivStart.ico + ' ' + nivStart.n }),
          h('span.ov-dif', { text: D.DIFF_LABEL[game.diff] })),
        h('p.ov-sub', { text: 'Pulsa para empezar' }),
        h('div.ov-controls', { html: '<span>' + game.ctl + '</span>' })));
    ovStart.onclick = () => start();

    const ovPause = h('div.ov.hide',
      h('div.ov-inner',
        h('h2', { text: 'Pausa' }),
        h('p.ov-sub', { text: 'Tómate el tiempo que necesites.' }),
        h('div.ov-actions',
          h('button.btn.primary', { html: icon('play', 17) + '<span>Continuar</span>', onclick: () => setPause(false) }),
          h('button.btn', { html: icon('restart', 17) + '<span>Reiniciar</span>', onclick: () => restart() }),
          h('a.btn.ghost', { href: '#/juegos', html: icon('grid', 17) + '<span>Más juegos</span>' }))));

    const ovOver = h('div.ov.hide');

    stage.append(ovLoad, ovStart, ovPause, ovOver);

    /* --------------------------------------------------------- mandos táctiles */
    const vpad = h('div.vpad');
    stage.appendChild(vpad);

    /* Dentro de un iframe el teclado no llega hasta que el juego tiene el foco.
       Si no lo tiene, se avisa en vez de dejar que parezca que está roto. */
    const kbNotice = h('button.kb-notice.hide', {
      html: icon('keyboard', 16) + '<span>Haz clic en el juego para usar el teclado</span>',
      onclick: () => { if (engine) engine.canvas.focus(); },
    });
    stage.appendChild(kbNotice);
    let kbTimer = 0;
    function syncFocus() {
      if (!started || over) { kbNotice.classList.add('hide'); return; }
      const ok = document.hasFocus() &&
        (document.activeElement === (engine && engine.canvas) || stage.contains(document.activeElement));
      kbNotice.classList.toggle('hide', ok);
    }
    kbTimer = setInterval(syncFocus, 500);
    window.addEventListener('focus', syncFocus);
    window.addEventListener('blur', syncFocus);

    function buildVpad(controls) {
      D.clear(vpad);
      if (!controls) { vpad.classList.remove('on'); return; }
      const want = S.get('vpad');
      if (want === 'off' || (want === 'auto' && !isTouch())) { vpad.classList.remove('on'); return; }
      vpad.classList.add('on');

      const press = (key, on, el) => {
        if (!engine) return;
        engine.input.setVirtual(key, on);
        el.classList.toggle('down', on);
      };
      const bind = (el, key) => {
        el.addEventListener('pointerdown', (e) => { e.preventDefault(); press(key, true, el); el.setPointerCapture(e.pointerId); });
        el.addEventListener('pointerup', (e) => { e.preventDefault(); press(key, false, el); });
        el.addEventListener('pointercancel', () => press(key, false, el));
        el.addEventListener('pointerleave', () => press(key, false, el));
        el.addEventListener('contextmenu', (e) => e.preventDefault());
      };

      if (controls.stick) {
        const stick = h('div.vstick', h('i'));
        const knob = stick.querySelector('i');
        let active = null;
        stick.addEventListener('pointerdown', (e) => {
          active = e.pointerId; stick.setPointerCapture(e.pointerId); move(e);
        });
        stick.addEventListener('pointermove', (e) => { if (active === e.pointerId) move(e); });
        const end = () => {
          active = null; knob.style.transform = '';
          ['left', 'right', 'up', 'down'].forEach((k) => engine && engine.input.setVirtual(k, false));
        };
        stick.addEventListener('pointerup', end);
        stick.addEventListener('pointercancel', end);
        function move(e) {
          const r = stick.getBoundingClientRect();
          let dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
          const d = Math.hypot(dx, dy), max = r.width / 2 - 18;
          if (d > max) { dx = dx / d * max; dy = dy / d * max; }
          knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
          if (!engine) return;
          const t = 0.28 * max;
          engine.input.setVirtual('left', dx < -t);
          engine.input.setVirtual('right', dx > t);
          engine.input.setVirtual('up', dy < -t);
          engine.input.setVirtual('down', dy > t);
        }
        vpad.appendChild(stick);
      } else if (controls.dpad) {
        const pad = h('div.vpad-dpad');
        const keys = controls.dpad === 'lr' ? [['left', '←'], ['right', '→']]
          : [['up', '▲'], ['left', '◀'], ['right', '▶'], ['down', '▼']];
        keys.forEach((k) => {
          const b = h('button.vkey', { class: 'k-' + k[0], text: k[1], 'aria-label': k[0] });
          bind(b, k[0]);
          pad.appendChild(b);
        });
        vpad.appendChild(pad);
      } else vpad.appendChild(h('div'));

      const btns = h('div.vpad-btns');
      (controls.buttons || []).forEach((b, i) => {
        const el = h('button.vbtn', { class: i > 0 ? 'sm' : '', text: b.label || 'A', 'aria-label': b.label || b.k });
        bind(el, b.k);
        btns.appendChild(el);
      });
      vpad.appendChild(btns);
    }

    /* ------------------------------------------------------- barra inferior */
    const btnPause = h('button.pbtn', { html: icon('pause', 17) + '<span class="lbl">Pausa</span>',
      onclick: () => setPause(!paused) });
    const btnRestart = h('button.pbtn', { html: icon('restart', 17) + '<span class="lbl">Reiniciar</span>',
      onclick: () => restart() });
    const btnSound = h('button.pbtn.icon', { 'aria-label': 'Sonido' });
    const btnMusic = h('button.pbtn.icon', { 'aria-label': 'Música' });
    const btnFull = h('button.pbtn.icon', { html: icon('full', 17), 'aria-label': 'Pantalla completa' });
    const btnFav = h('button.pbtn', { 'aria-label': 'Favorito' });

    function syncSound() {
      const on = S.get('sound');
      btnSound.innerHTML = icon(on ? 'sound' : 'mute', 17);
      btnSound.classList.toggle('on', on);
      const m = S.get('music');
      btnMusic.innerHTML = icon('music', 17);
      btnMusic.classList.toggle('on', m);
      btnMusic.style.opacity = m ? 1 : .45;
    }
    btnSound.onclick = () => { S.set('sound', !S.get('sound')); NX.Audio.setMuted(!S.get('sound')); syncSound(); };
    btnMusic.onclick = () => { S.set('music', !S.get('music')); NX.Audio.setMusic(S.get('music')); syncSound(); };
    syncSound();

    function syncFav() {
      const on = S.isFav(game.id);
      btnFav.innerHTML = icon(on ? 'heartFill' : 'heart', 17) + '<span class="lbl">' + (on ? 'Guardado' : 'Guardar') + '</span>';
      btnFav.classList.toggle('on', on);
    }
    btnFav.onclick = () => { S.toggleFav(game.id); syncFav(); };
    syncFav();

    btnFull.onclick = () => {
      const d = document;
      if (d.fullscreenElement || d.webkitFullscreenElement) {
        (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      } else if (player.requestFullscreen) player.requestFullscreen().catch(() => player.classList.toggle('fs'));
      else if (player.webkitRequestFullscreen) player.webkitRequestFullscreen();
      else player.classList.toggle('fs');
    };
    const onFsChange = () => {
      const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
      player.classList.toggle('fs', on);
      btnFull.innerHTML = icon(on ? 'exitFull' : 'full', 17);
      if (engine) setTimeout(() => engine.resize(), 60);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);

    bar.append(btnPause, btnRestart, h('div.sp'), btnFav, btnSound, btnMusic, btnFull);

    /* --------------------------------------------------------------- API */
    let hudKeys = {};
    function setHud(obj) {
      const keys = Object.keys(obj);
      const same = keys.length === Object.keys(hudKeys).length && keys.every((k) => k in hudKeys);
      if (!same) {
        D.clear(hud);
        hudKeys = {};
        keys.forEach((k) => {
          const v = h('span.v', { text: String(obj[k]) });
          const item = h('div.hud-item', h('span.k', { text: k }), v);
          hudKeys[k] = { item, v, last: obj[k] };
          hud.appendChild(item);
        });
        return;
      }
      keys.forEach((k) => {
        const rec = hudKeys[k];
        if (rec.last === obj[k]) return;
        rec.last = obj[k];
        rec.v.textContent = String(obj[k]);
        rec.item.classList.remove('flash');
        void rec.item.offsetWidth;
        rec.item.classList.add('flash');
      });
    }

    function showOver(o, won) {
      over = true;
      const score = o.score == null ? null : o.score;
      const lower = !!o.lower;
      let record = false;
      if (score != null && isFinite(score)) record = S.setBest(game.id, score, lower);
      const best = S.best(game.id);
      const fmt = o.fmt || ((v) => M.fmtScore(v));

      const inner = h('div.ov-inner');
      if (record) inner.appendChild(h('div.ov-record', { text: '★ Nuevo récord' }));
      inner.appendChild(h('h2', { text: o.title || (won ? '¡Nivel superado!' : 'Fin de la partida') }));
      if (o.msg) inner.appendChild(h('p.ov-sub', { text: o.msg }));
      if (score != null) {
        inner.appendChild(h('div.ov-scores',
          h('div.ov-score', h('div.k', { text: o.label || 'Puntos' }), h('div.v', { text: fmt(score) })),
          h('div.ov-score', { class: record ? 'gold' : '' },
            h('div.k', { text: 'Tu récord' }), h('div.v', { text: fmt(best) }))));
      }
      if (o.stats) {
        inner.appendChild(h('div.ov-scores', Object.keys(o.stats).map((k) =>
          h('div.ov-score', h('div.k', { text: k }), h('div.v', { text: String(o.stats[k]) })))));
      }
      inner.appendChild(h('div.ov-actions',
        h('button.btn.primary.big', { html: icon('restart', 18) + '<span>Jugar otra vez</span>', onclick: () => restart() }),
        h('button.btn.big.ghost', { html: icon('dice', 18) + '<span>Otro juego</span>', onclick: () => NX.Views.randomGame() })));

      D.clear(ovOver).appendChild(inner);
      ovOver.classList.remove('hide');

      const secs = (performance.now() - sessionStart) / 1000;
      S.data.totalTime += secs;
      let xp = 8 + (record ? 16 : 0) + (won ? 10 : 0);
      xp += Math.min(20, Math.floor(secs / 30) * 2);
      S.addXp(xp);
      S.checkAchievements();
      NX.Audio.sfx(won ? 'win' : 'lose');
    }

    const api = {
      slug: game.id,
      get best() { return S.best(game.id); },
      hud: setHud,
      status(t) { /* reservado para mensajes breves */ if (t) NX.toast(t); },
      toast(msg, ico) { NX.toast(msg, ico); },
      over(o) { showOver(o || {}, false); },
      win(o) { showOver(o || {}, true); },
      save(k, v) { S.gameSave(game.id, k, v); },
      load(k, d) { return S.gameLoad(game.id, k, d); },
      achievement(idA, label) { NX.toast('Logro: ' + (label || idA), '🏆'); },
      vibrate(ms) { if (navigator.vibrate && S.get('sound')) try { navigator.vibrate(ms); } catch (e) {} },
      pause() { setPause(true); },
      setAspect(w, hh) { stage.style.aspectRatio = w + ' / ' + hh; if (engine) engine.resize(); },
    };

    /* ------------------------------------------------------------ control */
    function setPause(p) {
      if (!started || over) return;
      paused = p;
      if (engine) engine.setPaused(p);
      ovPause.classList.toggle('hide', !p);
      btnPause.innerHTML = icon(p ? 'play' : 'pause', 17) + '<span class="lbl">' + (p ? 'Seguir' : 'Pausa') + '</span>';
    }

    function restart() {
      over = false; paused = false;
      ovOver.classList.add('hide');
      ovPause.classList.add('hide');
      hudKeys = {}; D.clear(hud);
      sessionStart = performance.now();
      if (iframe) { iframe.contentWindow.location.reload(); return; }
      if (engine) { engine.restart(); engine.start(); }
      S.addRecent(game.id);
      btnPause.innerHTML = icon('pause', 17) + '<span class="lbl">Pausa</span>';
    }

    function start() {
      if (started) return;
      started = true;
      ovStart.classList.add('hide');
      NX.Audio.unlock();
      NX.Audio.setMuted(!S.get('sound'));
      NX.Audio.setMusic(S.get('music'));
      NX.Audio.setVolume(S.get('volume'));
      sessionStart = performance.now();
      S.addRecent(game.id);
      S.checkAchievements();
      if (engine) { engine.start(); try { engine.canvas.focus({ preventScroll: true }); } catch (e) { engine.canvas.focus(); } }
      if (iframe) iframe.focus();
      setTimeout(syncFocus, 200);
    }

    const onKey = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) return;
      if (e.key === 'Escape') { if (started && !over) setPause(!paused); }
      else if (e.key === 'p' || e.key === 'P') { if (started && !over) setPause(!paused); }
      else if (e.key === 'r' || e.key === 'R') { if (started) restart(); }
      else if ((e.key === ' ' || e.key === 'Enter') && !started) { e.preventDefault(); start(); }
    };
    document.addEventListener('keydown', onKey);

    /* ------------------------------------------------------------- montaje */
    if (game.iframe) {
      iframe = h('iframe', { src: game.iframe, title: game.t, allow: 'fullscreen; autoplay',
        loading: 'lazy', frameborder: '0' });
      stage.insertBefore(iframe, ovLoad);
      stage.style.aspectRatio = '16 / 10';
      ovLoad.classList.add('hide');
      ovStart.classList.remove('hide');
      btnPause.style.display = 'none';
    } else {
      NX.load(game.id).then((def) => {
        ovLoad.classList.add('hide');
        ovStart.classList.remove('hide');
        const o = def.opts || {};
        if (o.w && o.h && o.fit !== 'fill') stage.style.aspectRatio = o.w + ' / ' + o.h;
        engine = new NX.Engine(def, stage, api);
        if (engine.fx && S.get('reduceFx')) engine.fx.enabled = false;
        engine.setPaused(false);
        buildVpad(o.controls);
        stage.insertBefore(engine.canvas, ovLoad);
      }).catch((err) => {
        D.clear(ovLoad).appendChild(h('div.ov-inner',
          h('h2', { text: 'No se pudo cargar' }),
          h('p.ov-sub', { text: 'Este juego no está disponible ahora mismo.' }),
          h('div.ov-actions', h('a.btn.primary', { href: '#/juegos', text: 'Ver otros juegos' }))));
        console.error(err);
      });
    }

    /* ------------------------------------------------------------- página */
    const relacionados = CAT.byCat(game.cat).filter((g) => g.id !== game.id).slice(0, 6);
    const masJugados = NX.Views.popularList ? NX.Views.popularList() : CAT.GAMES;

    /* ------------------------------------------- valoración y reporte */
    const niv = CAT.nivel(game);

    const estrellas = h('div.estrellas', { role: 'radiogroup', 'aria-label': 'Tu valoración' });
    const estrellaTxt = h('span.estrellas-txt');
    function pintaEstrellas(hover) {
      const mia = S.rating(game.id);
      const n = hover || mia;
      Array.prototype.forEach.call(estrellas.children, (b, i) => {
        b.classList.toggle('on', i < n);
        b.classList.toggle('preview', !!hover && i < hover && i >= mia);
      });
      estrellaTxt.textContent = mia
        ? ['', 'No la vuelvo a abrir', 'Regulera', 'Está bien', 'Muy buena', 'De las mejores'][mia]
        : 'Ponle nota';
    }
    for (let i = 1; i <= 5; i++) {
      const b = h('button.estrella', { type: 'button', text: '★',
        'aria-label': i + ' de 5', title: i + ' de 5' });
      b.onmouseenter = () => pintaEstrellas(i);
      b.onfocus = () => pintaEstrellas(i);
      b.onclick = () => {
        const actual = S.rating(game.id);
        const n = S.setRating(game.id, actual === i ? 0 : i);
        pintaEstrellas(0);
        NX.toast(n ? 'Guardado: ' + n + ' de 5' : 'Valoración borrada', n ? '⭐' : '↩️');
        if (NX.Audio) NX.Audio.sfx(n ? 'coin' : 'click');
      };
      estrellas.appendChild(b);
    }
    estrellas.onmouseleave = () => pintaEstrellas(0);

    const MOTIVOS = [
      { id: 'roto', t: 'No funciona' },
      { id: 'calidad', t: 'Calidad baja' },
      { id: 'aburrido', t: 'Aburrido' },
    ];
    const reporteBox = h('div.reporte');
    function pintaReporte() {
      D.clear(reporteBox);
      const f = S.flagOf(game.id);
      if (f) {
        const m = MOTIVOS.find((x) => x.id === f.motivo);
        reporteBox.appendChild(h('div.reporte-hecho',
          h('span', { text: '⚑ Lo marcaste como “' + (m ? m.t.toLowerCase() : f.motivo) + '”' }),
          h('button.btn.xs.ghost', { text: 'Deshacer', onclick: () => {
            S.unflag(game.id); pintaReporte(); NX.toast('Marca retirada', '↩️');
          } })));
        return;
      }
      reporteBox.appendChild(h('span.reporte-lbl', { text: '¿Algo va mal?' }));
      MOTIVOS.forEach((m) => reporteBox.appendChild(h('button.btn.xs.ghost', {
        text: m.t,
        onclick: () => {
          S.flag(game.id, m.id);
          pintaReporte();
          NX.toast('Anotado. Baja en tu lista y sale de “los mejores”.', '⚑');
        },
      })));
    }
    pintaReporte();

    const valoracion = h('div.gp-valora',
      h('div.gp-valora-nota',
        h('span.nivel-chip', { style: { color: niv.col, borderColor: niv.col + '55' },
          text: niv.ico + ' ' + niv.n }),
        h('span.nivel-exp', { text: game.q <= 2
          ? 'Es un experimento corto. Está aquí por si te pica la curiosidad, no como plato fuerte.'
          : game.q >= 5 ? 'De los que mejor aguantan una tarde entera.'
          : 'Probado y funcionando. Da para un buen rato.' })),
      h('div.gp-valora-tuya', estrellas, estrellaTxt),
      reporteBox);
    pintaEstrellas(0);

    const info = h('div.gp-info',
      h('div.gp-title',
        h('div',
          h('h1', { text: game.t }),
          h('div.card-meta', { style: { marginTop: '6px', fontSize: '13px' } },
            h('a', { href: '#/cat/' + game.cat, text: cat.icon + ' ' + cat.name }),
            h('span.dot'),
            h('span', { text: D.DIFF_LABEL[game.diff] }),
            h('span.dot'),
            h('span', { text: S.plays(game.id) + ' partidas tuyas' }))),
        h('div.gp-actions',
          h('a.btn.sm', { href: '#/cat/' + game.cat, html: icon('grid', 15) + '<span>' + cat.name + '</span>' }))),
      h('p.gp-desc', { text: game.d }),
      h('div.kv',
        h('div.kv-item', h('div.k', { text: 'Controles' }), h('div.v', { text: game.ctl })),
        h('div.kv-item', h('div.k', { text: 'Tu récord' }),
          h('div.v', { text: S.best(game.id) ? M.fmtScore(S.best(game.id)) : '—' })),
        h('div.kv-item', h('div.k', { text: 'Etiquetas' }), h('div.v', { text: game.tags.join(' · ') }))),
      valoracion);

    const side = h('div.gp-side',
      h('div.side-card',
        h('h3', { text: 'Más de ' + cat.name }),
        h('div.mini-list', relacionados.map((g) => h('a.mini', { href: '#/juego/' + g.id },
          D.cover(g, { w: 68, h: 43 }),
          h('div', h('b', { text: g.t }), h('span', { text: D.DIFF_LABEL[g.diff] })))))),
      h('div.side-card',
        h('h3', { text: 'Atajos de teclado' }),
        h('div', { style: { fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.9 },
          html: '<b>Esc</b> o <b>P</b> — pausa<br><b>R</b> — reiniciar<br><b>F</b> — pantalla completa<br><b>/</b> — buscar' })));

    const page = h('div.page',
      h('a.btn.sm.ghost', { href: '#/', style: { marginBottom: '14px' },
        html: icon('back', 15) + '<span>Volver</span>' }),
      h('div.gp', h('div', player, info), side));

    page._cleanup = () => {
      clearInterval(kbTimer);
      window.removeEventListener('focus', syncFocus);
      window.removeEventListener('blur', syncFocus);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      if (engine) engine.destroy();
      NX.Audio.music.stop();
    };
    return page;
  };
})(typeof window !== 'undefined' ? window : globalThis);
