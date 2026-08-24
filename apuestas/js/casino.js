/* ===========================================================
   casino.js — lobby, buscador y lanzador de juegos
   =========================================================== */
K.Casino = (() => {
  let cat = 'todos', texto = '';

  function tarjeta(j) {
    const jugable = !!K.Juegos[j.motor];
    const card = K.el('button', { class: 'juego', onclick: () => abrir(j.id) });
    const arte = K.el('div', { class: 'arte', style: 'background:' + j.grad });
    arte.appendChild(K.el('span', { text: j.ic }));
    arte.appendChild(K.el('span', { class: 'n', text: '#' + j.n }));
    arte.appendChild(K.el('span', { class: jugable ? 'jugable' : 'info-only', text: jugable ? 'JUGAR' : 'FICHA' }));
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
    hero.innerHTML = `<div class="brillo b1"></div><div class="brillo b2"></div>
      <h2>Casino Kronos</h2>
      <p>Treinta títulos del catálogo repartidos en cuatro categorías, todos corriendo sobre motores
      propios con la matemática a la vista: cada juego te muestra su RTP, su tabla de pagos y de dónde
      sale la ventaja de la casa. Fichas de demostración, cero dinero real.</p>`;
    root.appendChild(hero);

    const buscador = K.el('div', { class: 'buscador' });
    const inp = K.el('input', { type: 'search', placeholder: 'Buscar juego o proveedor…', value: texto });
    inp.oninput = () => { texto = inp.value; pintarGrid(); };
    buscador.appendChild(inp);
    root.appendChild(buscador);

    const chips = K.el('div', { class: 'chips' });
    K.CATEGORIAS.forEach(c => chips.appendChild(K.el('button', {
      class: 'chip' + (cat === c.id ? ' on' : ''), html: c.ic + ' ' + c.nom,
      onclick: () => { cat = c.id; K.$$('.chip', chips).forEach((b, i) => b.classList.toggle('on', K.CATEGORIAS[i].id === cat)); pintarGrid(); }
    })));
    root.appendChild(chips);

    const grid = K.el('div', { class: 'grid-juegos', id: 'grid-juegos' });
    root.appendChild(grid);

    function pintarGrid() {
      const t = texto.trim().toLowerCase();
      const lista = K.JUEGOS.filter(j =>
        (cat === 'todos' || j.cat === cat) &&
        (!t || j.nom.toLowerCase().includes(t) || j.prov.toLowerCase().includes(t) || j.desc.toLowerCase().includes(t)));
      grid.innerHTML = '';
      if (!lista.length) {
        grid.appendChild(K.el('div', { class: 'vacio', html: '<span class="ic">🔍</span>Ningún juego coincide con esa búsqueda.' }));
        return;
      }
      lista.forEach(j => grid.appendChild(tarjeta(j)));
    }
    pintarGrid();
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

  return { vista, abrir };
})();
