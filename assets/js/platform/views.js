/* NEXO ARCADE — platform/views.js : vistas de la plataforma (sin el reproductor). */
(function (global) {
  'use strict';
  const NX = (global.NX = global.NX || {});
  const D = NX.DOM, h = D.h, icon = D.icon;
  const CAT = NX.CATALOG, S = NX.Store;
  const M = NX.M;

  const Views = {};
  NX.Views = Views;

  /* Baraja estable por día: la portada de inicio cambia cada jornada. */
  function dailyShuffle(list) {
    const d = new Date();
    const seed = d.getFullYear() * 1000 + d.getMonth() * 40 + d.getDate();
    const rng = new M.RNG(seed);
    return rng.shuffle(list.slice());
  }

  function popular() {
    const plays = S.data.plays;
    return CAT.GAMES.slice().sort((a, b) => {
      const pb = (plays[b.id] || 0) * 3 + (b.hot ? 6 : 0) + (b.featured ? 4 : 0);
      const pa = (plays[a.id] || 0) * 3 + (a.hot ? 6 : 0) + (a.featured ? 4 : 0);
      return pb - pa;
    });
  }

  function recents() {
    return S.data.recents.map((id) => CAT.byId[id]).filter(Boolean);
  }

  /* ---------------------------------------------------------------- héroe */
  function hero() {
    const picks = CAT.GAMES.filter((g) => g.hot || g.featured).slice(0, 5);
    if (!picks.length) picks.push(CAT.GAMES[0]);
    let i = 0, timer = 0;

    const art = h('div.hero-art');
    const bg = h('div.hero-bg');
    const copy = h('div.hero-copy');
    const dots = h('div.hero-dots');
    const el = h('section.hero', bg, copy, art, dots);

    function render(idx, dir) {
      i = (idx + picks.length) % picks.length;
      const g = picks[i];
      const cat = CAT.cat(g.cat);
      D.clear(art).appendChild(D.cover(g, { animate: true, now: true }));
      D.clear(bg).appendChild(D.cover(g, { now: true }));
      D.clear(copy);
      copy.appendChild(h('div.hero-eyebrow', { text: 'Destacado · ' + cat.name }));
      copy.appendChild(h('h1', { text: g.t }));
      copy.appendChild(h('p', { text: g.d }));
      const actions = h('div.hero-actions',
        h('a.btn.primary.big', { href: '#/juego/' + g.id, html: icon('play', 18) + '<span>Jugar ahora</span>' }),
        h('button.btn.big.ghost', {
          html: icon('dice', 18) + '<span>Sorpréndeme</span>',
          onclick: () => Views.randomGame(),
        }));
      copy.appendChild(actions);
      D.clear(dots);
      picks.forEach((_, k) => dots.appendChild(h('button', {
        class: k === i ? 'on' : '', 'aria-label': 'Destacado ' + (k + 1),
        onclick: () => { render(k); restart(); },
      })));
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = 'fade-in .4s';
    }
    function restart() { clearInterval(timer); timer = setInterval(() => render(i + 1), 8000); }
    render(0);
    restart();
    el._cleanup = () => clearInterval(timer);
    return el;
  }

  /* --------------------------------------------------------------- inicio */
  Views.home = function () {
    const page = h('div.page');
    page.appendChild(hero());

    const rec = recents();
    if (rec.length) {
      page.appendChild(D.section('Continuar jugando', '⏱️', D.rail(rec.slice(0, 12)),
        rec.length > 12 ? { href: '#/recientes' } : null));
    }

    page.appendChild(D.section('Lo más jugado', '🔥', D.rail(popular().slice(0, 14)), { href: '#/juegos' }));

    const fresh = dailyShuffle(CAT.GAMES).slice(0, 14);
    page.appendChild(D.section('Descubre algo nuevo', '✨', D.rail(fresh), { href: '#/juegos' }));

    const favs = S.data.favs.map((id) => CAT.byId[id]).filter(Boolean);
    if (favs.length) page.appendChild(D.section('Tus favoritos', '❤️', D.rail(favs.slice(0, 12)), { href: '#/favoritos' }));

    CAT.CATS.forEach((c) => {
      const list = CAT.byCat(c.id);
      if (!list.length) return;
      page.appendChild(D.section(c.name, c.icon, D.rail(dailyShuffle(list).slice(0, 12)),
        { href: '#/cat/' + c.id }));
    });

    page.appendChild(h('section.section',
      h('div.section-head', h('h2', h('span.ico', { text: '🎯' }), h('span', { text: 'Explora por categoría' }))),
      h('div.chip-row', CAT.CATS.map((c) => h('a.chip', { href: '#/cat/' + c.id },
        h('span', { text: c.icon }), h('span', { text: c.name }),
        h('span', { class: 'mono', style: { opacity: .6 }, text: CAT.byCat(c.id).length }))))));

    return page;
  };

  /* --------------------------------------------------- rejilla con filtros */
  function gridPage(opts) {
    const page = h('div.page');
    const state = { cat: opts.cat || 'all', sort: 'rel', q: '' };
    const grid = h('div.grid');

    const head = h('div.page-head',
      h('div', h('h1', opts.ico ? h('span', { text: opts.ico }) : null, h('span', { text: opts.title })),
        opts.sub ? h('p', { text: opts.sub }) : null));
    page.appendChild(head);

    const sortSel = h('select.chip', { style: { height: '32px', paddingInline: '10px' } },
      h('option', { value: 'rel', text: 'Recomendado' }),
      h('option', { value: 'az', text: 'A → Z' }),
      h('option', { value: 'diff', text: 'Dificultad' }),
      h('option', { value: 'plays', text: 'Más jugados' }));
    sortSel.onchange = () => { state.sort = sortSel.value; render(); };

    if (opts.filters !== false) {
      const chips = h('div.chip-row', { style: { marginBottom: '18px' } });
      const mk = (id, label, ico) => {
        const b = h('button.chip', { class: state.cat === id ? 'on' : '' },
          ico ? h('span', { text: ico }) : null, h('span', { text: label }));
        b.onclick = () => {
          state.cat = id;
          chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
          b.classList.add('on');
          render();
        };
        return b;
      };
      chips.appendChild(mk('all', 'Todos', '🎲'));
      CAT.CATS.forEach((c) => chips.appendChild(mk(c.id, c.name, c.icon)));
      page.appendChild(chips);
      head.appendChild(h('div', { style: { marginLeft: 'auto' } }, sortSel));
    }

    const countEl = h('p', { style: { color: 'var(--text-dim)', marginBottom: '14px', fontSize: '14px' } });
    page.appendChild(countEl);
    page.appendChild(grid);

    function render() {
      let list = opts.list ? opts.list() : CAT.GAMES.slice();
      if (state.cat !== 'all') list = list.filter((g) => g.cat === state.cat);
      if (state.sort === 'az') list.sort((a, b) => a.t.localeCompare(b.t, 'es'));
      else if (state.sort === 'diff') list.sort((a, b) => a.diff - b.diff || a.t.localeCompare(b.t, 'es'));
      else if (state.sort === 'plays') list.sort((a, b) => S.plays(b.id) - S.plays(a.id));
      else if (!opts.keepOrder) list = popular().filter((g) => list.indexOf(g) >= 0);

      D.clear(grid);
      countEl.textContent = list.length + (list.length === 1 ? ' juego' : ' juegos');
      if (!list.length) {
        grid.appendChild(h('div.empty', { style: { gridColumn: '1/-1' } },
          h('div.big', { text: opts.emptyIco || '🫙' }),
          h('h3', { text: opts.emptyTitle || 'Nada por aquí' }),
          h('p', { text: opts.emptyText || 'Prueba con otra categoría.' })));
        return;
      }
      list.forEach((g, i) => {
        const c = D.card(g);
        c.style.animation = 'fade-up .3s var(--ease-out) both';
        c.style.animationDelay = Math.min(i, 18) * 18 + 'ms';
        grid.appendChild(c);
      });
    }
    render();
    return page;
  }

  Views.all = () => gridPage({
    title: 'Todos los juegos', ico: '🎮',
    sub: CAT.count + ' juegos originales, ninguno de pago, ninguno con anuncios.',
  });

  Views.category = function (id) {
    const c = CAT.cat(id);
    if (!c) return Views.notFound();
    return gridPage({
      title: c.name, ico: c.icon, cat: id, filters: false,
      sub: CAT.byCat(id).length + ' juegos en esta categoría',
      list: () => CAT.byCat(id),
    });
  };

  Views.favorites = () => gridPage({
    title: 'Favoritos', ico: '❤️', filters: false, keepOrder: true,
    sub: 'Los juegos que has marcado con el corazón.',
    list: () => S.data.favs.map((id) => CAT.byId[id]).filter(Boolean),
    emptyIco: '🤍', emptyTitle: 'Aún no tienes favoritos',
    emptyText: 'Pulsa el corazón de cualquier tarjeta para guardarlo aquí.',
  });

  Views.recents = () => gridPage({
    title: 'Jugados hace poco', ico: '⏱️', filters: false, keepOrder: true,
    sub: 'Tu historial en este navegador.',
    list: recents,
    emptyIco: '🕹️', emptyTitle: 'Todavía no has jugado a nada',
    emptyText: 'Elige un juego cualquiera y empieza.',
  });

  Views.search = function (q) {
    const res = NX.searchGames(q);
    const page = h('div.page');
    page.appendChild(h('div.page-head',
      h('div', h('h1', h('span', { text: '🔎' }), h('span', { text: 'Resultados' })),
        h('p', { text: res.length + ' coincidencias para «' + q + '»' }))));
    if (!res.length) {
      page.appendChild(h('div.empty',
        h('div.big', { text: '🧐' }),
        h('h3', { text: 'Sin resultados' }),
        h('p', { text: 'Prueba con otra palabra, o mira el catálogo completo.' }),
        h('div', { style: { marginTop: '18px' } },
          h('a.btn.primary', { href: '#/juegos', text: 'Ver todos los juegos' }))));
      return page;
    }
    const grid = h('div.grid');
    res.forEach((g) => grid.appendChild(D.card(g)));
    page.appendChild(grid);
    return page;
  };

  /* --------------------------------------------------------------- perfil */
  Views.profile = function () {
    const page = h('div.page');
    const p = S.levelProgress();
    const st = S.stats();

    page.appendChild(h('div.page-head', h('div',
      h('h1', h('span', { text: '👤' }), h('span', { text: 'Tu perfil' })),
      h('p', { text: 'Todo se guarda solo en este navegador. Nada sale de tu equipo.' }))));

    /* tarjeta de nivel */
    page.appendChild(h('section.section',
      h('div', { style: {
        padding: '22px', borderRadius: 'var(--r-lg)', background: 'var(--surface)',
        border: '1px solid var(--line)',
      } },
        h('div.row.gap-m', { style: { marginBottom: '16px' } },
          h('div', { style: {
            width: '62px', height: '62px', borderRadius: '50%', background: 'var(--grad-brand)',
            display: 'grid', placeItems: 'center', fontSize: '24px', fontWeight: 900, color: '#fff',
            flex: 'none',
          }, text: String(p.level) }),
          h('div.grow',
            h('div', { style: { fontSize: '20px', fontWeight: 800 }, text: 'Nivel ' + p.level }),
            h('div', { style: { color: 'var(--text-dim)', fontSize: '13.5px' },
              text: M.fmtScore(p.xp) + ' XP · faltan ' + M.fmtScore(Math.max(0, p.to - p.xp)) + ' para el nivel ' + (p.level + 1) })),
          h('div', { style: { textAlign: 'right' } },
            h('div', { style: { fontSize: '22px', fontWeight: 900 }, text: '🔥 ' + S.data.streak.days }),
            h('div', { style: { fontSize: '12px', color: 'var(--text-mute)' },
              text: S.data.streak.days === 1 ? 'día seguido' : 'días seguidos' }))),
        h('div.pbar', h('i', { style: { width: (p.pct * 100).toFixed(1) + '%' } })))));

    /* métricas */
    const stats = [
      ['Partidas jugadas', M.fmtScore(st.totalPlays)],
      ['Juegos probados', st.distinct + ' / ' + st.total],
      ['Récords batidos', M.fmtScore(st.records)],
      ['Favoritos', String(st.favs)],
      ['Mejor marca', M.fmtScore(st.maxScore)],
      ['Mejor racha', S.data.streak.best + (S.data.streak.best === 1 ? ' día' : ' días')],
    ];
    page.appendChild(D.section('Tus números', '📊',
      h('div.stats', stats.map((s) => h('div.stat', h('div', { class: 'k', text: s[0] }), h('div', { class: 'v', text: s[1] }))))));

    /* juegos más jugados */
    const top = Object.keys(S.data.plays)
      .map((id) => CAT.byId[id]).filter(Boolean)
      .sort((a, b) => S.plays(b.id) - S.plays(a.id)).slice(0, 12);
    if (top.length) page.appendChild(D.section('Tus más jugados', '🏅', D.rail(top)));

    /* logros */
    const list = S.ACHIEVEMENTS.slice().sort((a, b) => (S.hasAchievement(b.id) ? 1 : 0) - (S.hasAchievement(a.id) ? 1 : 0));
    const done = list.filter((a) => S.hasAchievement(a.id)).length;
    page.appendChild(D.section('Logros (' + done + '/' + list.length + ')', '🏆',
      h('div.grid', { style: { gridTemplateColumns: 'repeat(auto-fill,minmax(268px,1fr))' } },
        list.map((a) => h('div.ach', { class: S.hasAchievement(a.id) ? 'done' : 'locked' },
          h('div.ico', { text: S.hasAchievement(a.id) ? a.ico : '🔒' }),
          h('div', h('b', { text: a.t }), h('p', { text: a.d })))))));

    /* datos */
    page.appendChild(D.section('Tus datos', '💾',
      h('div.chip-row',
        h('button.btn', {
          html: icon('share', 16) + '<span>Exportar progreso</span>',
          onclick: () => {
            const blob = new Blob([S.exportJSON()], { type: 'application/json' });
            const a = h('a', { href: URL.createObjectURL(blob), download: 'nexo-arcade-progreso.json' });
            document.body.appendChild(a); a.click(); a.remove();
            NX.toast('Progreso descargado', '💾');
          },
        }),
        h('button.btn', {
          html: icon('plus', 16) + '<span>Importar</span>',
          onclick: () => {
            const inp = h('input', { type: 'file', accept: 'application/json' });
            inp.onchange = () => {
              const f = inp.files[0];
              if (!f) return;
              const r = new FileReader();
              r.onload = () => {
                try { S.importJSON(r.result); NX.toast('Progreso restaurado', '✅'); NX.Router.reload(); }
                catch (e) { NX.toast('El archivo no es válido', '⚠️'); }
              };
              r.readAsText(f);
            };
            inp.click();
          },
        }),
        h('button.btn', {
          html: icon('trash', 16) + '<span>Borrar todo</span>',
          onclick: () => {
            const m = D.modal('¿Borrar todo el progreso?',
              'Se eliminarán favoritos, récords, logros y nivel. No se puede deshacer.',
              h('div'),
              [h('button.btn', { text: 'Cancelar', onclick: () => m._close() }),
               h('button.btn.primary', {
                 text: 'Sí, borrar', style: { background: 'var(--bad)' },
                 onclick: () => { S.reset(); m._close(); NX.toast('Progreso borrado', '🧹'); NX.Router.reload(); },
               })]);
          },
        }))));

    return page;
  };

  Views.notFound = function () {
    return h('div.page', h('div.empty',
      h('div.big', { text: '🛸' }),
      h('h3', { text: 'Esta página no existe' }),
      h('p', { text: 'El enlace es incorrecto o el juego ya no está disponible.' }),
      h('div', { style: { marginTop: '18px' } },
        h('a.btn.primary', { href: '#/', text: 'Volver al inicio' }))));
  };

  Views.randomGame = function () {
    const g = M.pick(CAT.GAMES);
    location.hash = '#/juego/' + g.id;
  };

  /* ------------------------------------------------------------- búsqueda */
  function norm(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  NX.searchGames = function (q, limit) {
    const nq = norm(q || '').trim();
    if (!nq) return [];
    const words = nq.split(/\s+/);
    const out = [];
    CAT.GAMES.forEach((g) => {
      const hay = norm(g.t + ' ' + g.d + ' ' + g.tags.join(' ') + ' ' + CAT.catName(g.cat));
      const title = norm(g.t);
      let score = 0;
      words.forEach((w) => {
        if (title.startsWith(w)) score += 12;
        else if (title.indexOf(w) >= 0) score += 8;
        else if (norm(g.tags.join(' ')).indexOf(w) >= 0) score += 5;
        else if (hay.indexOf(w) >= 0) score += 2;
        else score -= 6;
      });
      if (score > 0) out.push({ g, score });
    });
    out.sort((a, b) => b.score - a.score || a.g.t.localeCompare(b.g.t, 'es'));
    const res = out.map((o) => o.g);
    return limit ? res.slice(0, limit) : res;
  };
})(typeof window !== 'undefined' ? window : globalThis);
