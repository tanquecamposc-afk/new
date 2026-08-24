/* ===========================================================
   casino.js — lobby, buscador y lanzador de juegos
   =========================================================== */
K.Casino = (() => {
  let cat = 'todos', texto = '', grid = null;

  const setCategoria = c => { cat = c; };

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
      K.el('span', { class: 'prov', text: j.prov }),
      K.el('span', { class: 'desc', text: j.desc })
    ]));
    return card;
  }

  function vista(root) {
    root.innerHTML = '';

    const hero = K.el('div', { class: 'casino-hero' });
    const jugables = K.JUEGOS.filter(j => K.Juegos[j.motor]).length;
    hero.innerHTML = `<div class="brillo b1"></div><div class="brillo b2"></div>
      <h2>Casino Kronos</h2>
      <p>${K.JUEGOS.length} títulos repartidos en cuatro categorías, ${jugables} de ellos jugables sobre
      motores propios con la matemática a la vista: cada juego muestra su RTP, su tabla de pagos y de
      dónde sale la ventaja de la casa.</p>
      <div class="tags">
        <span class="tag jackpot-tag">Jackpot: <b id="jackpot-lobby">${K.sol(K.Progreso.jackpot())}</b></span>
        <span class="tag">Crash y multiplicadores</span>
        <span class="tag">Ruleta con rueda real</span>
        <span class="tag">Game shows</span>
        <span class="tag">Blackjack y video póker</span>
      </div>`;
    root.appendChild(hero);

    const buscador = K.el('div', { class: 'buscador' });
    const campo = K.el('div', { class: 'campo-buscar' });
    campo.innerHTML = K.ic('buscar');
    const inp = K.el('input', { type: 'search', placeholder: 'Buscar juego o proveedor…', value: texto });
    inp.oninput = () => { texto = inp.value; pintarGrid(); };
    campo.appendChild(inp);
    buscador.appendChild(campo);
    root.appendChild(buscador);

    const chips = K.el('div', { class: 'chips' });
    K.CATEGORIAS.forEach(c => chips.appendChild(K.el('button', {
      class: 'chip' + (cat === c.id ? ' on' : ''),
      html: K.ic(c.icono) + ' ' + c.nom,
      onclick: () => {
        cat = c.id;
        K.$$('.chip', chips).forEach((b, i) => b.classList.toggle('on', K.CATEGORIAS[i].id === cat));
        pintarGrid();
      }
    })));
    root.appendChild(chips);

    grid = K.el('div', { class: 'grid-juegos' });
    root.appendChild(grid);
    pintarGrid();
  }

  function pintarGrid() {
    if (!grid) return;
    const t = texto.trim().toLowerCase();
    const lista = K.JUEGOS.filter(j =>
      (cat === 'todos' || j.cat === cat) &&
      (!t || j.nom.toLowerCase().includes(t) || j.prov.toLowerCase().includes(t) || j.desc.toLowerCase().includes(t)));
    grid.innerHTML = '';
    if (!lista.length) {
      grid.appendChild(K.el('div', { class: 'vacio', html: K.ic('buscar') + '<div>Ningún juego coincide con esa búsqueda.</div>' }));
      return;
    }
    lista.forEach(j => grid.appendChild(tarjeta(j)));
  }

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
    K.modal(j.nom, cuerpo, j.prov + ' · demo', limpiar);
  }

  return {
    vista, abrir, setCategoria,
    get categoria() { return cat; }
  };
})();
