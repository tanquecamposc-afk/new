/* NEXO ARCADE — platform/dom.js
   Utilidades de DOM, iconos, tarjetas de juego y avisos. */
(function (global) {
  'use strict';
  const NX = (global.NX = global.NX || {});

  /* --------------------------------------------------------- hiperscript */
  function h(tag, props) {
    let el;
    const parts = tag.split(/([.#])/);
    el = document.createElement(parts[0] || 'div');
    for (let i = 1; i < parts.length; i += 2) {
      if (parts[i] === '.') el.classList.add(parts[i + 1]);
      else el.id = parts[i + 1];
    }
    let first = 1;
    if (isProps(props)) {
      first = 2;
      for (const k in props) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className += (el.className ? ' ' : '') + v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k in el && k !== 'list' && typeof v !== 'object') { try { el[k] = v; } catch (e) { el.setAttribute(k, v); } }
        else el.setAttribute(k, v);
      }
    }
    for (let i = first; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  /* Solo un objeto plano (sin nodeType) cuenta como mapa de atributos. */
  function isProps(p) {
    return p != null && typeof p === 'object' && !Array.isArray(p) && p.nodeType === undefined;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach((x) => add(el, x)); return; }
    el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
  const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  /* -------------------------------------------------------------- iconos */
  const P = (d, extra) => '<path d="' + d + '"' + (extra || '') + '/>';
  const ICONS = {
    search: P('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5.6 12.2L21 20.6'),
    play: '<path d="M7 4.5v15l13-7.5Z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8 5h3.2v14H8zM12.8 5H16v14h-3.2z" fill="currentColor" stroke="none"/>',
    restart: P('M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5'),
    heart: P('M12 20.3 4.7 13a4.6 4.6 0 0 1 6.5-6.5l.8.8.8-.8A4.6 4.6 0 1 1 19.3 13Z'),
    heartFill: '<path d="M12 20.3 4.7 13a4.6 4.6 0 0 1 6.5-6.5l.8.8.8-.8A4.6 4.6 0 1 1 19.3 13Z" fill="currentColor"/>',
    sound: P('M11 5 6.5 9H3v6h3.5L11 19zM15.5 9.2a4 4 0 0 1 0 5.6M18.4 6.6a8 8 0 0 1 0 10.8'),
    mute: P('M11 5 6.5 9H3v6h3.5L11 19zM16 10l4 4M20 10l-4 4'),
    music: P('M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm10-2a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z'),
    full: P('M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'),
    exitFull: P('M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5'),
    star: P('m12 4 2.5 5.2 5.5.8-4 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4-3.9 5.5-.8Z'),
    fire: P('M12 3s5 4.2 5 9a5 5 0 0 1-10 0c0-1.6.7-2.9 1.4-3.8.3 1 1 1.8 1.8 1.8C12 10 10.8 6.6 12 3Z'),
    grid: P('M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'),
    clock: P('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.2 2'),
    dice: P('M4 8.5 12 4l8 4.5v7L12 20l-8-4.5zM12 12v8M4 8.5 12 12l8-3.5'),
    user: P('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20c0-3.4 3.1-5.5 7-5.5s7 2.1 7 5.5'),
    gear: P('M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z') +
          P('M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3.4a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.7 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.1Z'),
    sun: P('M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4'),
    moon: P('M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z'),
    menu: P('M4 7h16M4 12h16M4 17h16'),
    close: P('M6 6l12 12M18 6 6 18'),
    chevL: P('M14.5 6 8.5 12l6 6'),
    chevR: P('M9.5 6l6 6-6 6'),
    back: P('M19 12H5M11 6l-6 6 6 6'),
    trophy: P('M8 4h8v5a4 4 0 0 1-8 0ZM8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3M10 20h4M12 13v7'),
    bolt: P('M13 3 5 13.5h5.5L11 21l8-10.5h-5.5Z'),
    check: P('M5 12.5 10 17.5 19 7'),
    plus: P('M12 5v14M5 12h14'),
    share: P('M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 15V3M8 7l4-4 4 4'),
    keyboard: P('M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M17 10h.01M7 14h10'),
    trash: P('M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13'),
    info: P('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v6M12 7.5h.01'),
  };

  function icon(name, size) {
    const s = size || 24;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" ' +
      'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[name] || '') + '</svg>';
  }
  function iconEl(name, size) {
    const span = document.createElement('span');
    span.style.display = 'contents';
    span.innerHTML = icon(name, size);
    return span.firstChild;
  }

  /* ------------------------------------------------------------ portadas */
  /* Pinta las portadas cuando entran en pantalla y solo anima la que tiene
     el cursor encima: así 95 lienzos no cuestan nada. */
  let io = null;
  const animating = new Set();
  let rafId = 0;

  function tickAnims() {
    rafId = 0;
    if (!animating.size) return;
    const t = performance.now() / 1000;
    animating.forEach((cv) => {
      if (!cv.isConnected) { animating.delete(cv); return; }
      paint(cv, t - cv._t0);
    });
    if (animating.size) rafId = requestAnimationFrame(tickAnims);
  }
  function startAnim(cv) {
    if (animating.has(cv)) return;
    cv._t0 = performance.now() / 1000;
    animating.add(cv);
    if (!rafId) rafId = requestAnimationFrame(tickAnims);
  }
  function stopAnim(cv) {
    animating.delete(cv);
    paint(cv, 0);
  }

  function paint(cv, t) {
    const g = cv.getContext('2d');
    const w = cv.width, hh = cv.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, hh);
    NX.Cover.paint(g, cv._game, t || 0, w, hh);
    cv._painted = true;
  }

  function sizeCanvas(cv, cssW, cssH) {
    const dpr = Math.min(2, global.devicePixelRatio || 1);
    const w = Math.max(64, Math.round((cssW || cv.clientWidth || 320) * dpr));
    const hh = Math.max(40, Math.round((cssH || cv.clientHeight || 200) * dpr));
    if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; cv._painted = false; }
  }

  function observe(cv) {
    if (!global.IntersectionObserver) { sizeCanvas(cv); paint(cv, 0); return; }
    if (!io) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const c = e.target;
          io.unobserve(c);
          sizeCanvas(c);
          paint(c, 0);
        });
      }, { rootMargin: '260px' });
    }
    io.observe(cv);
  }

  /* Crea un lienzo de portada para un juego. */
  function cover(game, opts) {
    opts = opts || {};
    const cv = h('canvas', { width: 8, height: 5, 'aria-hidden': 'true' });
    cv._game = game;
    if (opts.w) { cv.style.width = opts.w + 'px'; cv.style.height = opts.h + 'px'; }
    if (opts.now) {
      requestAnimationFrame(() => { sizeCanvas(cv, opts.w, opts.h); paint(cv, 0); });
    } else observe(cv);
    if (opts.animate) {
      requestAnimationFrame(() => { sizeCanvas(cv, opts.w, opts.h); startAnim(cv); });
    }
    return cv;
  }

  /* ------------------------------------------------------------- tarjeta */
  const DIFF_LABEL = ['', 'Muy fácil', 'Fácil', 'Media', 'Difícil', 'Extrema'];

  function diffDots(n) {
    const w = h('span.diff', { title: DIFF_LABEL[n] || '' });
    for (let i = 1; i <= 4; i++) w.appendChild(h('i', { class: i <= n ? 'on' : '' }));
    return w;
  }

  function card(game, opts) {
    opts = opts || {};
    const S = NX.Store;
    const cat = NX.CATALOG.cat(game.cat);
    const cv = cover(game);
    const fav = S.isFav(game.id);
    const best = S.best(game.id);

    const favBtn = h('button.card-fav', {
      class: fav ? 'on' : '',
      'aria-label': fav ? 'Quitar de favoritos' : 'Añadir a favoritos',
      html: icon(fav ? 'heartFill' : 'heart', 16),
      onclick: (e) => {
        e.preventDefault(); e.stopPropagation();
        const on = S.toggleFav(game.id);
        favBtn.classList.toggle('on', on);
        favBtn.innerHTML = icon(on ? 'heartFill' : 'heart', 16);
        favBtn.setAttribute('aria-label', on ? 'Quitar de favoritos' : 'Añadir a favoritos');
        NX.toast(on ? 'Añadido a favoritos' : 'Quitado de favoritos', on ? '❤️' : '🤍');
      },
    });

    const badges = h('div.card-badges');
    if (game.hot) badges.appendChild(h('span.badge.hot', { text: 'Top' }));
    if (game.nuevo) badges.appendChild(h('span.badge.new', { text: 'Nuevo' }));
    if (best > 0 && !opts.noBest) badges.appendChild(h('span.badge.best', { text: '★ ' + NX.M.fmtScore(best) }));

    const el = h('a.card', {
      href: '#/juego/' + game.id,
      'aria-label': game.t + ' — ' + cat.name,
    },
      h('div.card-art', cv, badges, favBtn,
        h('div.card-play', h('span', { html: icon('play', 20) }))),
      h('div.card-body',
        h('div.card-title', { text: game.t }),
        h('div.card-meta',
          h('span', { text: cat.icon + ' ' + cat.name }),
          h('span.dot'),
          diffDots(game.diff)))
    );

    el.addEventListener('pointerenter', () => { sizeCanvas(cv); startAnim(cv); });
    el.addEventListener('pointerleave', () => stopAnim(cv));
    el.addEventListener('focus', () => { sizeCanvas(cv); startAnim(cv); });
    el.addEventListener('blur', () => stopAnim(cv));
    return el;
  }

  /* Fila con desplazamiento y flechas. */
  function rail(games, opts) {
    opts = opts || {};
    const track = h('div.rail');
    games.forEach((g) => track.appendChild(card(g, opts)));
    const prev = h('button.rail-btn.prev', { html: icon('chevL', 20), 'aria-label': 'Anterior' });
    const next = h('button.rail-btn.next', { html: icon('chevR', 20), 'aria-label': 'Siguiente' });
    const wrap = h('div.rail-wrap', track, prev, next);
    const step = () => Math.max(240, track.clientWidth * 0.78);
    prev.onclick = () => track.scrollBy({ left: -step(), behavior: 'smooth' });
    next.onclick = () => track.scrollBy({ left: step(), behavior: 'smooth' });
    const upd = () => {
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
    };
    track.addEventListener('scroll', upd, { passive: true });
    requestAnimationFrame(upd);
    return wrap;
  }

  function section(title, ico, content, more) {
    const head = h('div.section-head', h('h2', ico ? h('span.ico', { text: ico }) : null, h('span', { text: title })));
    if (more) {
      head.appendChild(h('a.section-more', { href: more.href },
        h('span', { text: more.text || 'Ver todo' }), h('span', { html: icon('chevR', 15) })));
    }
    return h('section.section', head, content);
  }

  /* --------------------------------------------------------------- aviso */
  let toastWrap = null;
  function toast(msg, ico, ms) {
    if (!toastWrap) { toastWrap = h('div.toast-wrap'); document.body.appendChild(toastWrap); }
    const el = h('div.toast', ico ? h('span.ico', { text: ico }) : null, h('span', { text: msg }));
    toastWrap.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 260);
    }, ms || 2200);
  }

  /* ------------------------------------------------------------- diálogo */
  function modal(title, sub, body, actions) {
    const back = h('div.modal-back', { onclick: (e) => { if (e.target === back) close(); } });
    const box = h('div.modal', { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('h2', { text: title }),
      sub ? h('p.sub', { text: sub }) : null,
      body);
    if (actions) box.appendChild(h('div.modal-foot', actions));
    back.appendChild(box);
    document.body.appendChild(back);
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    function close() { document.removeEventListener('keydown', onKey); back.remove(); }
    back._close = close;
    return back;
  }

  function toggle(label, desc, val, onChange) {
    const sw = h('button.sw', { class: val ? 'on' : '', role: 'switch', 'aria-checked': String(!!val) });
    sw.onclick = () => {
      const on = !sw.classList.contains('on');
      sw.classList.toggle('on', on);
      sw.setAttribute('aria-checked', String(on));
      onChange(on);
    };
    return h('div.modal-row', h('div.lbl', h('b', { text: label }), desc ? h('span', { text: desc }) : null), sw);
  }

  NX.DOM = { h, $, $$, clear, icon, iconEl, ICONS, cover, card, rail, section, modal, toggle, diffDots, DIFF_LABEL, paintCover: paint, sizeCanvas, startAnim, stopAnim };
  NX.toast = toast;
})(typeof window !== 'undefined' ? window : globalThis);
