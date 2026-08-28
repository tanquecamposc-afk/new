/* NEXO ARCADE — platform/app.js : navegación, ajustes y arranque. */
(function (global) {
  'use strict';
  const NX = (global.NX = global.NX || {});
  const D = NX.DOM, h = D.h, icon = D.icon;
  const CAT = NX.CATALOG, S = NX.Store, V = NX.Views;

  /* ------------------------------------------------------------- rutas */
  const Router = {
    current: null,
    outlet: null,
    routes: [
      [/^\/?$/, () => V.home()],
      [/^\/juegos$/, () => V.all()],
      [/^\/mejores$/, () => V.mejores()],
      [/^\/cat\/([\w-]+)$/, (m) => V.category(m[1])],
      [/^\/juego\/([\w-]+)$/, (m) => V.game(m[1])],
      [/^\/buscar\/(.*)$/, (m) => V.search(decodeURIComponent(m[1]))],
      [/^\/favoritos$/, () => V.favorites()],
      [/^\/recientes$/, () => V.recents()],
      [/^\/perfil$/, () => V.profile()],
    ],
    path() {
      const raw = location.hash.replace(/^#/, '');
      return raw || '/';
    },
    render() {
      const p = this.path();
      if (this.current && this.current._cleanup) { try { this.current._cleanup(); } catch (e) {} }
      let view = null;
      for (const [re, fn] of this.routes) {
        const m = p.match(re);
        if (m) { view = fn(m); break; }
      }
      if (!view) view = V.notFound();
      this.current = view;
      D.clear(this.outlet).appendChild(view);
      document.title = titleFor(p);
      this.outlet.scrollTop = 0;
      global.scrollTo({ top: 0, behavior: 'instant' in global ? 'instant' : 'auto' });
      syncNav(p);
      document.body.classList.remove('side-open');
    },
    go(p) { location.hash = p; },
    reload() { this.render(); },
  };
  NX.Router = Router;

  function titleFor(p) {
    const base = 'NEXO Arcade';
    let m = p.match(/^\/juego\/([\w-]+)$/);
    if (m && CAT.byId[m[1]]) return CAT.byId[m[1]].t + ' · ' + base;
    m = p.match(/^\/cat\/([\w-]+)$/);
    if (m && CAT.cat(m[1])) return CAT.cat(m[1]).name + ' · ' + base;
    if (p === '/perfil') return 'Tu perfil · ' + base;
    if (p === '/favoritos') return 'Favoritos · ' + base;
    if (p === '/juegos') return 'Todos los juegos · ' + base;
    if (p === '/mejores') return 'Lo mejor del catálogo · ' + base;
    return base + ' · ' + CAT.count + ' juegos gratis';
  }

  /* ------------------------------------------------------------ cabecera */
  function buildNav() {
    const burger = h('button.nav-burger', { html: icon('menu', 21), 'aria-label': 'Menú',
      onclick: () => document.body.classList.toggle('side-open') });

    const logo = h('a.logo', { href: '#/', 'aria-label': 'NEXO Arcade, inicio' },
      h('span.logo-mark', { html: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 8v8M7 8l10 8M17 8v8"/></svg>' }),
      h('span.logo-text', h('span', { text: 'NEXO' }), h('small', { text: 'ARCADE' })));

    const input = h('input', { type: 'search', placeholder: 'Buscar entre ' + CAT.count + ' juegos…',
      'aria-label': 'Buscar juegos', autocomplete: 'off', spellcheck: 'false' });
    const clearBtn = h('button.search-clear', { html: icon('close', 15), 'aria-label': 'Limpiar',
      onclick: () => { input.value = ''; input.dispatchEvent(new Event('input')); input.focus(); } });
    const box = h('div.search-box', { html: icon('search', 17) });
    box.append(input, clearBtn, h('kbd.search-kbd', { text: '/' }));
    const suggest = h('div.suggest', { role: 'listbox' });
    const search = h('div.search', { role: 'search' }, box, suggest);

    let sel = -1, results = [];
    function renderSuggest() {
      D.clear(suggest);
      sel = -1;
      const q = input.value.trim();
      box.classList.toggle('filled', !!q);
      if (!q) return;
      results = NX.searchGames(q, 6);
      if (!results.length) {
        suggest.appendChild(h('div.suggest-empty', { text: 'Nada coincide con «' + q + '»' }));
        return;
      }
      results.forEach((g, i) => {
        const item = h('a.suggest-item', { href: '#/juego/' + g.id, role: 'option', dataset: { i } },
          D.cover(g, { w: 60, h: 38, now: true }),
          h('div', h('b', { text: g.t }), h('span', { text: CAT.catName(g.cat) + ' · ' + g.tags[0] })),
          h('span.suggest-nivel', { style: { color: CAT.nivel(g).col },
            title: 'Calidad: ' + CAT.nivel(g).n, text: CAT.nivel(g).ico }));
        item.onclick = () => { input.value = ''; renderSuggest(); input.blur(); };
        suggest.appendChild(item);
      });
    }
    input.addEventListener('input', renderSuggest);
    input.addEventListener('focus', renderSuggest);
    input.addEventListener('blur', () => setTimeout(() => D.clear(suggest), 160));
    input.addEventListener('keydown', (e) => {
      const items = D.$$('.suggest-item', suggest);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!items.length) return;
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((it, i) => it.setAttribute('aria-selected', String(i === sel)));
      } else if (e.key === 'Enter') {
        const q = input.value.trim();
        if (sel >= 0 && items[sel]) { items[sel].click(); location.hash = items[sel].getAttribute('href').slice(1); }
        else if (q) Router.go('#/buscar/' + encodeURIComponent(q));
        input.blur();
      } else if (e.key === 'Escape') { input.value = ''; renderSuggest(); input.blur(); }
    });

    const themeBtn = h('button.icon-btn.opt-hide', { 'aria-label': 'Cambiar tema', onclick: toggleTheme });
    const randomBtn = h('button.icon-btn.opt-hide', { html: icon('dice', 19), 'aria-label': 'Juego aleatorio',
      title: 'Juego al azar', onclick: () => V.randomGame() });
    const setBtn = h('button.icon-btn', { html: icon('gear', 19), 'aria-label': 'Ajustes', onclick: openSettings });

    const levelBtn = h('a.nav-level', { href: '#/perfil', 'aria-label': 'Tu perfil' });
    function syncLevel() {
      const p = S.levelProgress();
      D.clear(levelBtn);
      levelBtn.append(
        h('span.av', { text: String(p.level) }),
        h('span.lv', h('span', { text: 'Nivel' }), document.createTextNode(String(p.level))));
    }
    syncLevel();
    S.on('xp', syncLevel);
    S.on('reset', syncLevel);

    function syncTheme() {
      const dark = document.documentElement.dataset.theme !== 'light';
      themeBtn.innerHTML = icon(dark ? 'sun' : 'moon', 19);
    }
    function toggleTheme() {
      const dark = document.documentElement.dataset.theme !== 'light';
      document.documentElement.dataset.theme = dark ? 'light' : 'dark';
      S.set('theme', dark ? 'light' : 'dark');
      syncTheme();
    }
    syncTheme();

    NX._focusSearch = () => { input.focus(); input.select(); };

    return h('header.nav', burger, logo, search,
      h('div.nav-actions', randomBtn, themeBtn, setBtn, levelBtn));
  }

  /* ------------------------------------------------------- barra lateral */
  let sideEl = null;
  function buildSide() {
    const link = (href, ico, label, count, col) => h('a.side-link', {
      href, dataset: { href }, style: col ? { '--cat': col } : null,
    },
      h('span.ico', { text: ico }), h('span', { text: label }),
      count != null ? h('span.count', { text: String(count) }) : null);

    sideEl = h('nav.side', { 'aria-label': 'Navegación principal' },
      h('div.side-group',
        link('#/', '🏠', 'Inicio'),
        link('#/juegos', '🎮', 'Todos', CAT.count),
        link('#/mejores', '★', 'Lo mejor', CAT.top(5).length),
        link('#/favoritos', '❤️', 'Favoritos'),
        link('#/recientes', '⏱️', 'Recientes'),
        link('#/perfil', '👤', 'Perfil')),
      h('div.side-group',
        h('div.side-title', { text: 'Categorías' }),
        CAT.CATS.map((c) => link('#/cat/' + c.id, c.icon, c.name, CAT.byCat(c.id).length, c.color))),
      h('div.side-foot',
        h('div', { text: 'NEXO Arcade' }),
        h('div', { text: CAT.count + ' juegos · sin anuncios · sin cuentas' }),
        h('div', { style: { marginTop: '6px' } },
          h('a', { href: '#/perfil', text: 'Tu progreso se guarda aquí mismo' }))));
    return sideEl;
  }

  function syncNav(p) {
    if (!sideEl) return;
    D.$$('.side-link', sideEl).forEach((a) => {
      const href = a.dataset.href.slice(1);
      const active = href === p || (href !== '/' && p.indexOf(href) === 0);
      a.classList.toggle('active', active);
    });
    /* la ficha de un juego resalta su categoría */
    const m = p.match(/^\/juego\/([\w-]+)$/);
    if (m && CAT.byId[m[1]]) {
      const cid = '#/cat/' + CAT.byId[m[1]].cat;
      D.$$('.side-link', sideEl).forEach((a) => a.classList.toggle('active', a.dataset.href === cid));
    }
  }

  /* --------------------------------------------------------------- ajustes */
  function openSettings() {
    const body = h('div');
    body.appendChild(D.toggle('Efectos de sonido', 'Sonidos generados en tiempo real', S.get('sound'),
      (on) => { S.set('sound', on); NX.Audio.setMuted(!on); }));
    body.appendChild(D.toggle('Música de fondo', 'Melodías suaves dentro de los juegos', S.get('music'),
      (on) => { S.set('music', on); NX.Audio.setMusic(on); }));

    const vol = h('input.slider', { type: 'range', min: 0, max: 100, value: Math.round(S.get('volume') * 100) });
    vol.oninput = () => { S.set('volume', vol.value / 100); NX.Audio.setVolume(vol.value / 100); };
    body.appendChild(h('div.modal-row',
      h('div.lbl', h('b', { text: 'Volumen' }), h('span', { text: 'Nivel general' })), vol));

    body.appendChild(D.toggle('Tema claro', 'Cambia el aspecto de la web', document.documentElement.dataset.theme === 'light',
      (on) => { document.documentElement.dataset.theme = on ? 'light' : 'dark'; S.set('theme', on ? 'light' : 'dark'); }));

    const padSel = h('select.chip', { style: { height: '32px' } },
      h('option', { value: 'auto', text: 'Automático' }),
      h('option', { value: 'on', text: 'Siempre' }),
      h('option', { value: 'off', text: 'Nunca' }));
    padSel.value = S.get('vpad');
    padSel.onchange = () => S.set('vpad', padSel.value);
    body.appendChild(h('div.modal-row',
      h('div.lbl', h('b', { text: 'Mandos en pantalla' }), h('span', { text: 'Botones táctiles sobre el juego' })), padSel));

    body.appendChild(D.toggle('Efectos visuales', 'Resplandor, viñeta y grano sobre el juego',
      !S.get('reduceFx'), (on) => S.set('reduceFx', !on)));

    body.appendChild(D.toggle('Barra lateral compacta', 'Solo iconos, más espacio para los juegos',
      S.get('side') === 'min', (on) => {
        S.set('side', on ? 'min' : 'full');
        document.querySelector('.app').dataset.side = on ? 'min' : 'full';
      }));

    const m = D.modal('Ajustes', 'Se guardan en este navegador.', body,
      [h('button.btn.primary', { text: 'Listo', onclick: () => m._close() })]);
  }

  /* ------------------------------------------------------------- arranque */
  function boot() {
    S.init();
    const st = S.data.settings;
    document.documentElement.dataset.theme = st.theme === 'light' ? 'light' : 'dark';
    NX.Audio.setVolume(st.volume);
    NX.Audio.setMuted(!st.sound);
    NX.Audio.setMusic(st.music);

    const app = h('div.app', { dataset: { side: st.side } });
    const outlet = h('main.main', { id: 'contenido' });
    app.append(buildNav(), buildSide(), outlet, h('div.side-backdrop', {
      onclick: () => document.body.classList.remove('side-open'),
    }));
    document.body.appendChild(h('a.skip', { href: '#contenido', text: 'Saltar al contenido' }));
    document.body.appendChild(app);
    Router.outlet = outlet;

    global.addEventListener('hashchange', () => Router.render());
    Router.render();

    /* atajos globales */
    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '');
      if (e.key === '/' && !typing) { e.preventDefault(); NX._focusSearch(); }
      else if (e.key === 'g' && !typing && e.shiftKey) V.randomGame();
    });

    /* avisos de logros y niveles */
    S.on('achievement', (a) => NX.toast('Logro desbloqueado: ' + a.t, a.ico, 3400));
    S.on('levelup', (l) => { NX.toast('¡Has subido al nivel ' + l + '!', '⚡', 3400); NX.Audio.sfx('levelup'); });

    /* desbloqueo del audio al primer gesto */
    const unlock = () => { NX.Audio.unlock(); document.removeEventListener('pointerdown', unlock); };
    document.addEventListener('pointerdown', unlock);

    S.checkAchievements();

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      global.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
