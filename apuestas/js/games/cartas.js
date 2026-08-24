/* ===========================================================
   games/cartas.js — blackjack, baccarat y video póker
   Comparten baraja, render de cartas y lógica de manos.
   =========================================================== */
K.Juegos = K.Juegos || {};

K.Baraja = (() => {
  const PALOS = [['♠', 0], ['♥', 1], ['♦', 1], ['♣', 0]];
  const VALORES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const nueva = (mazos = 6) => {
    const c = [];
    for (let m = 0; m < mazos; m++)
      for (const [palo, rojo] of PALOS)
        for (const v of VALORES) c.push({ v, palo, rojo: !!rojo });
    return K.mezcla(c);
  };
  const sacar = mazo => { if (mazo.length < 15) mazo.push(...nueva(1)); return mazo.pop(); };
  const nodo = (carta, extra = '') => carta
    ? K.el('div', { class: 'carta ' + (carta.rojo ? 'roja ' : '') + extra }, [
        K.el('span', { text: carta.v }), K.el('small', { text: carta.palo })])
    : K.el('div', { class: 'carta dorso', text: '◆◆' });
  return { nueva, sacar, nodo, VALORES };
})();

/* =========================================================
   BLACKJACK
   ========================================================= */
K.Juegos.blackjack = function (root, juego) {
  const MANOS = (juego.cfg && juego.cfg.manos) || 1;
  let mazo = K.Baraja.nueva(6);
  let manos = [], crupier = [], idx = 0, activo = false, apuestaBase = 0;

  const puntos = cartas => {
    let t = 0, ases = 0;
    for (const c of cartas) {
      if (c.v === 'A') { ases++; t += 11; }
      else if (['J', 'Q', 'K'].includes(c.v)) t += 10;
      else t += Number(c.v);
    }
    while (t > 21 && ases > 0) { t -= 10; ases--; }
    return t;
  };
  const esBJ = c => c.length === 2 && puntos(c) === 21;

  const monto = K.G.inputMonto(10);
  const selManos = K.el('select');
  for (let i = 1; i <= MANOS; i++) selManos.appendChild(K.el('option', { value: i, text: i + (i === 1 ? ' mano' : ' manos') }));
  const sTotal = K.G.stat('Total en juego', K.sol(0));
  const sCrupier = K.G.stat('Crupier', '—');
  const sMazo = K.G.stat('Cartas en el zapato', String(mazo.length));

  const btnRepartir = K.el('button', { class: 'btn', text: 'Repartir' });
  const bPedir = K.el('button', { class: 'btn sec', text: 'Pedir' });
  const bPlantar = K.el('button', { class: 'btn sec', text: 'Plantarse' });
  const bDoblar = K.el('button', { class: 'btn sec', text: 'Doblar' });
  [bPedir, bPlantar, bDoblar].forEach(b => b.disabled = true);

  const panel = K.el('div', { class: 'panel-apuesta' }, [
    monto.wrap,
    MANOS > 1 ? K.el('div', { class: 'campo' }, [K.el('label', { text: 'Manos simultáneas' }), selManos]) : null,
    btnRepartir,
    K.el('div', { style: 'height:1px;background:var(--linea);margin:2px 0' }),
    sTotal.fila, sCrupier.fila, sMazo.fila
  ].filter(Boolean));

  const mesa = K.el('div', { class: 'mesa' });
  const acciones = K.el('div', { class: 'acciones' }, [bPedir, bPlantar, bDoblar]);
  const resultado = K.el('div', { class: 'resultado' });
  const zona = K.el('div', { class: 'zona-juego' }, [mesa, acciones, resultado]);

  function pintar(revelar = false) {
    mesa.innerHTML = '';
    const cc = K.el('div', { class: 'cartas' });
    crupier.forEach((c, i) => cc.appendChild(K.Baraja.nodo(i === 1 && !revelar ? null : c)));
    mesa.appendChild(K.el('div', { class: 'mano' }, [
      K.el('div', { class: 'et', text: 'Crupier · ' + (revelar ? puntos(crupier) : puntos(crupier.slice(0, 1)) + '+') }), cc
    ]));
    manos.forEach((m, i) => {
      const cont = K.el('div', { class: 'cartas' });
      m.cartas.forEach(c => cont.appendChild(K.Baraja.nodo(c)));
      const et = `Tu mano ${manos.length > 1 ? (i + 1) : ''} · ${puntos(m.cartas)} · ${K.sol(m.apuesta)}` +
        (m.estado !== 'jugando' ? ' · ' + m.estado : (activo && i === idx ? ' · te toca' : ''));
      mesa.appendChild(K.el('div', {
        class: 'mano', style: activo && i === idx ? 'outline:1px dashed var(--linea);padding:6px;border-radius:9px' : ''
      }, [K.el('div', { class: 'et', text: et }), cont]));
    });
    sCrupier.set(revelar ? String(puntos(crupier)) : puntos(crupier.slice(0, 1)) + ' + carta tapada');
    sMazo.set(String(mazo.length));
  }

  function repartir() {
    const n = Number(selManos.value) || 1;
    apuestaBase = monto.get();
    const total = K.round2(apuestaBase * n);
    if (!K.G.apostar(total)) return;
    sTotal.set(K.sol(total));
    manos = []; crupier = []; idx = 0; activo = true;
    resultado.textContent = '';
    for (let i = 0; i < n; i++) manos.push({ cartas: [K.Baraja.sacar(mazo), K.Baraja.sacar(mazo)], apuesta: apuestaBase, estado: 'jugando' });
    crupier = [K.Baraja.sacar(mazo), K.Baraja.sacar(mazo)];
    btnRepartir.disabled = true;
    [bPedir, bPlantar, bDoblar].forEach(b => b.disabled = false);
    manos.forEach(m => { if (esBJ(m.cartas)) m.estado = 'blackjack'; });
    pintar();
    siguienteMano();
  }

  function siguienteMano() {
    while (idx < manos.length && manos[idx].estado !== 'jugando') idx++;
    if (idx >= manos.length) { turnoCrupier(); return; }
    bDoblar.disabled = manos[idx].cartas.length !== 2;
    pintar();
  }

  function pedir() {
    const m = manos[idx];
    m.cartas.push(K.Baraja.sacar(mazo));
    if (puntos(m.cartas) > 21) { m.estado = 'pasado'; idx++; siguienteMano(); }
    else { bDoblar.disabled = true; pintar(); }
  }
  function plantar() { manos[idx].estado = 'plantado'; idx++; siguienteMano(); }
  function doblar() {
    const m = manos[idx];
    if (!K.G.apostar(m.apuesta)) return;
    m.apuesta = K.round2(m.apuesta * 2);
    m.cartas.push(K.Baraja.sacar(mazo));
    m.estado = puntos(m.cartas) > 21 ? 'pasado' : 'plantado';
    idx++; siguienteMano();
  }

  async function turnoCrupier() {
    [bPedir, bPlantar, bDoblar].forEach(b => b.disabled = true);
    pintar(true);
    const hayVivas = manos.some(m => m.estado === 'plantado' || m.estado === 'blackjack');
    while (hayVivas && puntos(crupier) < 17) {
      await K.enEspera(520);
      crupier.push(K.Baraja.sacar(mazo));
      pintar(true);
    }
    liquidar();
  }

  function liquidar() {
    const pc = puntos(crupier);
    const crupierBJ = esBJ(crupier);
    let pagado = 0;
    const detalles = [];
    manos.forEach((m, i) => {
      const pm = puntos(m.cartas);
      let premio = 0, texto;
      if (m.estado === 'pasado') texto = 'te pasaste';
      else if (m.estado === 'blackjack' && !crupierBJ) { premio = m.apuesta * 2.5; texto = 'blackjack (3:2)'; }
      else if (m.estado === 'blackjack' && crupierBJ) { premio = m.apuesta; texto = 'empate de blackjacks'; }
      else if (crupierBJ) texto = 'el crupier tenía blackjack';
      else if (pc > 21) { premio = m.apuesta * 2; texto = 'el crupier se pasó'; }
      else if (pm > pc) { premio = m.apuesta * 2; texto = `${pm} contra ${pc}`; }
      else if (pm === pc) { premio = m.apuesta; texto = 'empate, va devuelta'; }
      else texto = `${pm} contra ${pc}`;
      premio = K.round2(premio);
      pagado += premio;
      detalles.push(`Mano ${i + 1}: ${texto}${premio > 0 ? ' → ' + K.sol(premio) : ''}`);
      m.estado = premio > m.apuesta ? 'ganada' : premio === m.apuesta && premio > 0 ? 'empate' : 'perdida';
    });
    if (pagado > 0) K.G.pagar(pagado, juego.nom);
    activo = false;
    btnRepartir.disabled = false;
    pintar(true);
    resultado.innerHTML = detalles.join('<br>') +
      `<div style="margin-top:6px;color:${pagado > 0 ? 'var(--acento)' : 'var(--tenue)'}">Cobras ${K.sol(pagado)}</div>`;
  }

  btnRepartir.onclick = repartir;
  bPedir.onclick = pedir; bPlantar.onclick = plantar; bDoblar.onclick = doblar;

  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.G.nota(`<h4>Reglas de la mesa</h4>
    Seis mazos, el crupier se planta en 17 (incluido el 17 suave), el blackjack natural paga <b>3:2</b>
    y el empate devuelve la apuesta. Puedes doblar solo con dos cartas. Con estas reglas y estrategia
    básica la ventaja de la casa queda cerca del <b>0.5%</b>, la más baja del casino; lo que la sube en
    la práctica son las decisiones malas, no el reparto.`));
};

/* =========================================================
   BACCARAT
   ========================================================= */
K.Juegos.baccarat = function (root, juego) {
  let mazo = K.Baraja.nueva(8);
  const valor = c => c.v === 'A' ? 1 : ['10', 'J', 'Q', 'K'].includes(c.v) ? 0 : Number(c.v);
  const total = cs => cs.reduce((a, c) => a + valor(c), 0) % 10;

  const OPC = [
    { id: 'jugador', l: 'Jugador', pago: 2 },
    { id: 'banca', l: 'Banca', pago: 1.95 },
    { id: 'empate', l: 'Empate', pago: 9 }
  ];
  let sel = 'banca';

  const monto = K.G.inputMonto(10);
  const sPago = K.G.stat('Pago', '1.95×');
  const sHist = K.G.stat('Últimas manos', '—');
  const btn = K.el('button', { class: 'btn', text: 'Repartir' });
  const panel = K.el('div', { class: 'panel-apuesta' }, [monto.wrap, btn,
    K.el('div', { style: 'height:1px;background:var(--linea);margin:2px 0' }), sPago.fila, sHist.fila]);

  const opciones = K.el('div', { class: 'opciones' });
  const botones = OPC.map(o => {
    const b = K.el('button', { class: o.id === sel ? 'on' : '', onclick: () => { sel = o.id; botones.forEach((x, i) => x.classList.toggle('on', OPC[i].id === o.id)); sPago.set(K.dec(o.pago) + '×'); } },
      [K.el('span', { text: o.l }), K.el('i', { text: o.pago + '×' })]);
    opciones.appendChild(b);
    return b;
  });

  const mesa = K.el('div', { class: 'mesa' });
  const resultado = K.el('div', { class: 'resultado' });
  const zona = K.el('div', { class: 'zona-juego' }, [mesa, resultado, opciones]);
  const historia = [];

  function pintar(j, b) {
    mesa.innerHTML = '';
    [['Jugador', j], ['Banca', b]].forEach(([et, cs]) => {
      const c = K.el('div', { class: 'cartas' });
      cs.forEach(x => c.appendChild(K.Baraja.nodo(x)));
      mesa.appendChild(K.el('div', { class: 'mano' }, [
        K.el('div', { class: 'et', text: et + ' · ' + total(cs) }), c]));
    });
  }

  async function repartir() {
    const apuesta = monto.get();
    if (!K.G.apostar(apuesta)) return;
    btn.disabled = true;
    if (mazo.length < 30) mazo = K.Baraja.nueva(8);
    const j = [K.Baraja.sacar(mazo), K.Baraja.sacar(mazo)];
    const b = [K.Baraja.sacar(mazo), K.Baraja.sacar(mazo)];
    pintar(j, b);
    await K.enEspera(500);

    /* Reglas de tercera carta del baccarat punto banco. */
    const natural = total(j) >= 8 || total(b) >= 8;
    let terceraJ = null;
    if (!natural) {
      if (total(j) <= 5) { terceraJ = K.Baraja.sacar(mazo); j.push(terceraJ); pintar(j, b); await K.enEspera(450); }
      const tb = total(b);
      let pide = false;
      if (terceraJ === null) pide = tb <= 5;
      else {
        const v = valor(terceraJ);
        if (tb <= 2) pide = true;
        else if (tb === 3) pide = v !== 8;
        else if (tb === 4) pide = v >= 2 && v <= 7;
        else if (tb === 5) pide = v >= 4 && v <= 7;
        else if (tb === 6) pide = v === 6 || v === 7;
      }
      if (pide) { b.push(K.Baraja.sacar(mazo)); pintar(j, b); await K.enEspera(450); }
    }

    const tj = total(j), tb = total(b);
    const ganador = tj > tb ? 'jugador' : tb > tj ? 'banca' : 'empate';
    historia.unshift(ganador === 'jugador' ? 'J' : ganador === 'banca' ? 'B' : 'E');
    if (historia.length > 12) historia.length = 12;
    sHist.set(historia.join(' '));

    let premio = 0;
    if (ganador === sel) {
      premio = K.round2(apuesta * OPC.find(o => o.id === sel).pago);
      K.G.pagar(premio, 'Baccarat · ' + sel);
    } else if (ganador === 'empate' && sel !== 'empate') {
      premio = apuesta;                       // el empate devuelve las apuestas simples
      K.G.pagar(premio, 'Baccarat · empate, devolución');
    }
    resultado.innerHTML = `Jugador ${tj} · Banca ${tb} → <b>${ganador}</b>` +
      (premio > 0 ? ` · <span style="color:var(--acento)">${K.sol(premio)}</span>` : '');
    btn.disabled = false;
  }

  btn.onclick = repartir;
  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.G.nota(`<h4>Por qué la banca paga menos</h4>
    Las reglas de la tercera carta favorecen a la banca: gana el <b>45.9%</b> de las manos contra
    <b>44.6%</b> del jugador. Para compensar, la banca paga 0.95 a 1 (una comisión del 5%). Ventaja de
    la casa: 1.06% a la banca, 1.24% al jugador y un feo <b>14.4%</b> al empate, que es la peor apuesta
    de la mesa por más que pague 8 a 1.`));
};

/* =========================================================
   VIDEO PÓKER — Jacks or Better 9/6
   ========================================================= */
K.Juegos.videopoker = function (root, juego) {
  const PAGOS = [
    ['Escalera real', 800, m => m.escalera && m.color && m.altas],
    ['Escalera de color', 50, m => m.escalera && m.color],
    ['Póker', 25, m => m.grupos[0] === 4],
    ['Full', 9, m => m.grupos[0] === 3 && m.grupos[1] === 2],
    ['Color', 6, m => m.color],
    ['Escalera', 4, m => m.escalera],
    ['Trío', 3, m => m.grupos[0] === 3],
    ['Doble par', 2, m => m.grupos[0] === 2 && m.grupos[1] === 2],
    ['Par de jotas o mejor', 1, m => m.parAlto]
  ];
  const ORDEN = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  let mazo = K.Baraja.nueva(1), mano = [], holds = [false, false, false, false, false], fase = 'apostar';

  function evaluar(cs) {
    const idx = cs.map(c => ORDEN.indexOf(c.v)).sort((a, b) => a - b);
    const cuenta = {};
    cs.forEach(c => cuenta[c.v] = (cuenta[c.v] || 0) + 1);
    const grupos = Object.values(cuenta).sort((a, b) => b - a);
    const color = cs.every(c => c.palo === cs[0].palo);
    let escalera = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
    // As bajo: A 2 3 4 5
    if (!escalera && idx.join() === '0,1,2,3,12') escalera = true;
    const altas = idx.join() === '8,9,10,11,12';
    const parAlto = Object.entries(cuenta).some(([v, n]) => n >= 2 && ORDEN.indexOf(v) >= 9);
    return { grupos, color, escalera, altas, parAlto };
  }
  const premio = cs => {
    const m = evaluar(cs);
    for (const [nom, pago, test] of PAGOS) if (test(m)) return { nom, pago };
    return null;
  };

  const monto = K.G.inputMonto(2);
  const sMano = K.G.stat('Mano', '—');
  const btn = K.el('button', { class: 'btn', text: 'Repartir' });
  const tabla = K.el('table', { class: 'tabla-pagos' });
  tabla.innerHTML = PAGOS.map(([n, p]) => `<tr data-n="${n}"><td>${n}</td><td>${p}×</td></tr>`).join('');

  const panel = K.el('div', { class: 'panel-apuesta' }, [monto.wrap, btn,
    K.el('div', { style: 'height:1px;background:var(--linea);margin:2px 0' }), sMano.fila, tabla]);

  const cartas = K.el('div', { class: 'cartas', style: 'justify-content:center' });
  const pista = K.el('div', { class: 'resultado', text: 'Reparte y elige qué cartas conservar.' });
  const zona = K.el('div', { class: 'zona-juego' }, [
    K.el('div', { style: 'flex:1;display:grid;place-content:center;gap:14px' }, [cartas, pista])
  ]);

  function pintar() {
    cartas.innerHTML = '';
    mano.forEach((c, i) => {
      const n = K.Baraja.nodo(c, holds[i] ? 'hold' : '');
      n.style.cursor = fase === 'descartar' ? 'pointer' : 'default';
      n.onclick = () => { if (fase !== 'descartar') return; holds[i] = !holds[i]; pintar(); };
      cartas.appendChild(n);
    });
  }
  const marcar = nom => K.$$('tr', tabla).forEach(t => t.classList.toggle('gana', t.dataset.n === nom));

  function repartir() {
    if (!K.G.apostar(monto.get())) return;
    mazo = K.Baraja.nueva(1);
    mano = [0, 0, 0, 0, 0].map(() => K.Baraja.sacar(mazo));
    holds = [false, false, false, false, false];
    fase = 'descartar';
    btn.textContent = 'Cambiar cartas';
    pista.textContent = 'Toca las cartas que quieres conservar y pulsa cambiar.';
    marcar(null);
    sMano.set('—');
    pintar();
  }

  function cambiar() {
    mano = mano.map((c, i) => holds[i] ? c : K.Baraja.sacar(mazo));
    fase = 'apostar';
    btn.textContent = 'Repartir';
    pintar();
    const p = premio(mano);
    if (p) {
      const pago = K.round2(monto.get() * p.pago);
      K.G.pagar(pago, 'Video póker · ' + p.nom);
      pista.innerHTML = `<span style="color:var(--acento)">${p.nom} · ${K.sol(pago)}</span>`;
      sMano.set(p.nom);
      marcar(p.nom);
    } else {
      pista.textContent = 'Sin premio esta vez.';
      sMano.set('sin premio');
      marcar(null);
    }
  }

  btn.onclick = () => fase === 'apostar' ? repartir() : cambiar();
  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.G.nota(`<h4>La tabla 9/6</h4>
    El nombre viene de lo que paga el full (9×) y el color (6×). Con esa tabla y juego perfecto el
    retorno llega al <b>99.5%</b>, uno de los más altos del casino. Las versiones 8/5 o 7/5, que se ven
    mucho, bajan el retorno a 97% o menos: la diferencia entera está en esas dos líneas.`));
};
