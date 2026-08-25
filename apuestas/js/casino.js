/* ===========================================================
   casino.js — lobby por secciones
   Sin búsqueda ni filtro: filas temáticas con carrusel, como
   un casino de verdad. Con búsqueda o categoría: cuadrícula.
   =========================================================== */
K.Casino = (() => {
  let cat = 'todos', texto = '', raiz = null;

  const setCategoria = c => { cat = c; if (raiz) vista(raiz); };

  /* ---------------- ficha de juego ---------------- */
  function tarjeta(j) {
    const jugable = !!K.Juegos[j.motor];
    const card = K.el('button', { class: 'juego', onclick: () => abrir(j.id) });
    const arte = K.el('div', { class: 'arte', style: 'background:' + j.grad });
    arte.innerHTML = `<span>${j.ic}</span>
      <span class="n">#${j.n}</span>
      <span class="badge ${jugable ? 'jugar' : 'info'}">${jugable ? 'JUGAR' : 'FICHA'}</span>`;
    card.appendChild(arte);
    card.appendChild(K.el('div', { class: 'txt' }, [
      K.el('span', { class: 'nom', text: j.nom }),
      K.el('span', { class: 'prov', text: j.prov })
    ]));
    return card;
  }

  /* ---------------- fila con carrusel ---------------- */
  function fila(titulo, icono, juegos, nota) {
    if (!juegos.length) return null;
    const sec = K.el('div', { class: 'seccion' });
    const cab = K.el('div', { class: 'sec-cab' });
    const h = K.el('h2');
    h.innerHTML = K.ic(icono) + '<span>' + K.esc(titulo) + '</span>';
    cab.appendChild(h);
    cab.appendChild(K.el('span', { class: 'cuenta', text: juegos.length }));
    const der = K.el('div', { class: 'der' });
    if (nota) der.appendChild(K.el('span', { class: 'nota', text: nota }));

    const carril = K.el('div', { class: 'fila-juegos' });
    juegos.forEach(j => carril.appendChild(tarjeta(j)));

    if (juegos.length > 4) {
      const nav = K.el('div', { class: 'fila-nav' });
      const mover = d => carril.scrollBy({ left: d * (carril.clientWidth - 80), behavior: 'smooth' });
      const izq = K.el('button', { class: 'izq', 'aria-label': 'Anterior', onclick: () => mover(-1) });
      const der2 = K.el('button', { 'aria-label': 'Siguiente', onclick: () => mover(1) });
      izq.innerHTML = K.ic('chevron');
      der2.innerHTML = K.ic('chevron');
      nav.appendChild(izq); nav.appendChild(der2);
      der.appendChild(nav);
    }
    cab.appendChild(der);
    sec.appendChild(cab);
    sec.appendChild(carril);
    return sec;
  }

  /* ---------------- vista ---------------- */
  function vista(root) {
    raiz = root;
    root.innerHTML = '';

    const jugables = K.JUEGOS.filter(j => K.Juegos[j.motor]).length;
    const hero = K.el('div', { class: 'casino-hero' });
    hero.innerHTML = `<div class="brillo b1"></div><div class="brillo b2"></div>
      <h2>Casino Kronos</h2>
      <p>${K.JUEGOS.length} títulos, ${jugables} jugables sobre motores propios. Cada juego enseña su RTP,
      su tabla de pagos y de dónde sale la ventaja de la casa.</p>
      <div class="tags">
        <span class="tag jackpot-tag">Jackpot: <b id="jackpot-lobby">${K.sol(K.Progreso.jackpot())}</b></span>
        <span class="tag">6 originales Kronos</span>
        <span class="tag">Ruleta con rueda real</span>
        <span class="tag">Game shows en directo</span>
      </div>`;
    root.appendChild(hero);
    root.appendChild(barraHerramientas(root));

    const t = texto.trim().toLowerCase();
    const filtra = lista => lista.filter(j =>
      !t || j.nom.toLowerCase().includes(t) || j.prov.toLowerCase().includes(t) || j.desc.toLowerCase().includes(t));

    /* Modo búsqueda o categoría: una sola cuadrícula con resultados. */
    if (t || cat !== 'todos') {
      const lista = filtra(K.JUEGOS.filter(j => cat === 'todos' || j.cat === cat));
      const nomCat = (K.CATEGORIAS.find(c => c.id === cat) || {}).nom || 'Todos';
      const sec = K.el('div', { class: 'seccion' });
      const cab = K.el('div', { class: 'sec-cab' });
      const h = K.el('h2');
      h.innerHTML = K.ic('casino') + '<span>' + (t ? 'Resultados' : nomCat) + '</span>';
      cab.appendChild(h);
      cab.appendChild(K.el('span', { class: 'cuenta', text: lista.length }));
      const der = K.el('div', { class: 'der' });
      if (t || cat !== 'todos') {
        const limpiar = K.el('button', { class: 'accion' });
        limpiar.innerHTML = K.ic('cerrar') + '<span>Quitar filtros</span>';
        limpiar.onclick = () => { texto = ''; cat = 'todos'; vista(root); };
        der.appendChild(limpiar);
      }
      cab.appendChild(der);
      sec.appendChild(cab);
      if (!lista.length) {
        sec.appendChild(K.el('div', { class: 'vacio', html: K.ic('buscar') + '<div>Ningún juego coincide con esa búsqueda.</div>' }));
      } else {
        const grid = K.el('div', { class: 'grid-juegos' });
        lista.forEach(j => grid.appendChild(tarjeta(j)));
        sec.appendChild(grid);
      }
      root.appendChild(sec);
      return;
    }

    /* Modo lobby: filas temáticas. */
    const recientes = (K.Wallet.est().casino.recientes || []).map(id => K.juego(id)).filter(Boolean);
    const porCat = c => K.JUEGOS.filter(j => j.cat === c);
    const originales = K.JUEGOS.filter(j => j.prov === 'Kronos Originals');
    const destacados = K.JUEGOS.filter(j => j.destacado);

    [
      recientes.length ? fila('Continuar jugando', 'refresco', recientes, 'lo último que abriste') : null,
      fila('Destacados', 'fuego', destacados, 'los que más se juegan'),
      fila('Originales Kronos', 'rayo', originales, 'motores propios, matemática a la vista'),
      fila('Tragamonedas', 'estrella', porCat('slots')),
      fila('Crash e instantáneos', 'objetivo', porCat('crash')),
      fila('En vivo y game shows', 'fuego', porCat('vivo')),
      fila('Mesa y video póker', 'trofeo', porCat('mesa'))
    ].forEach(s => { if (s) root.appendChild(s); });
  }

  function barraHerramientas(root) {
    const barra = K.el('div', { class: 'toolbar' });
    const campo = K.el('div', { class: 'campo-buscar' });
    campo.innerHTML = K.ic('buscar');
    const inp = K.el('input', { type: 'search', placeholder: 'Buscar juego o proveedor…', value: texto });
    let t = null;
    inp.oninput = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const foco = document.activeElement === inp;
        texto = inp.value;
        vista(root);
        if (foco) {
          const n = K.$('.toolbar input', root);
          if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
        }
      }, 250);
    };
    campo.appendChild(inp);
    barra.appendChild(campo);

    const grupo = K.el('div', { class: 'grupo' });
    K.CATEGORIAS.forEach(c => {
      const n = c.id === 'todos' ? K.JUEGOS.length : K.JUEGOS.filter(j => j.cat === c.id).length;
      grupo.appendChild(K.el('button', {
        class: 'chip' + (cat === c.id ? ' on' : ''),
        html: K.ic(c.icono) + ' ' + c.nom + ' <i>' + n + '</i>',
        onclick: () => { cat = c.id; texto = ''; vista(root); }
      }));
    });
    barra.appendChild(grupo);
    return barra;
  }

  /* ---------------- lanzador ---------------- */
  function abrir(id) {
    const j = K.juego(id);
    if (!j) return;
    const motor = K.Juegos[j.motor];
    const cuerpo = K.el('div');
    if (!motor) {
      cuerpo.appendChild(K.el('div', {
        class: 'info-bloque',
        html: `<h4>${K.esc(j.nom)}</h4>${K.esc(j.desc)}
          <p style="margin-top:8px">Este título todavía no tiene motor jugable en la demo.</p>`
      }));
      K.modal(j.nom, cuerpo, j.prov);
      return;
    }
    K.G.setJuego(j);
    const limpiar = motor(cuerpo, j);
    K.modal(j.nom, cuerpo, j.prov + ' · demo', () => {
      if (typeof limpiar === 'function') limpiar();
      if (raiz && K.App && K.App.vistaActual && K.App.vistaActual() === 'casino') vista(raiz);
    });
  }

  return { vista, abrir, setCategoria, get categoria() { return cat; } };
})();
