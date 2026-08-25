/* ===========================================================
   games/extras.js — juegos rápidos
   Dados, cara o cruz con racha, Hi-Lo, Torres y raspaditas.
   Todos con su retorno teórico calculado, no inventado.
   =========================================================== */
K.Juegos = K.Juegos || {};

/* =========================================================
   DADOS · elige el objetivo, el juego tira entre 0 y 100
   ========================================================= */
K.Juegos.dados = function (root, juego) {
  const VENTAJA = 0.99;
  let objetivo = 50, modo = 'menor', tirando = false, neto = 0;
  const prob = () => (modo === 'menor' ? objetivo : 100 - objetivo) / 100;
  const mult = () => Math.max(1.01, Math.floor(VENTAJA / prob() * 100) / 100);

  const monto = K.G.inputMonto(5);
  const rango = K.el('input', { type: 'range', min: '2', max: '98', step: '1', value: '50' });
  const num = K.el('input', { type: 'number', min: '2', max: '98', value: '50' });
  const sProb = K.G.stat('Probabilidad', '50.00%');
  const sMult = K.G.stat('Pago', '1.98×');
  const sGana = K.G.stat('Ganancia si acierta', K.sol(0));
  const sNeto = K.G.stat('Resultado neto', K.sol(0));

  const btnModo = K.el('button', { class: 'btn sec bloque', text: 'Apostando a MENOR que 50' });
  const btn = K.el('button', { class: 'btn bloque', text: 'Tirar' });
  const btnAuto = K.el('button', { class: 'btn sec bloque', text: 'Auto ×10' });

  const panel = K.el('div', { class: 'panel-apuesta' }, [
    monto.wrap,
    K.el('div', { class: 'campo' }, [K.el('label', { text: 'Objetivo' }), num, rango]),
    btnModo, btn, btnAuto,
    K.el('div', { class: 'separador' }),
    sProb.fila, sMult.fila, sGana.fila, sNeto.fila
  ]);

  const marcador = K.el('div', { class: 'dados-num', text: '—' });
  const barra = K.el('div', { class: 'dados-barra' });
  const aguja = K.el('div', { class: 'dados-aguja' });
  barra.appendChild(aguja);
  const hist = K.el('div', { class: 'historial-mult' });
  const zona = K.el('div', { class: 'zona-juego' }, [
    K.el('div', { style: 'flex:1;display:grid;place-content:center;gap:18px;width:100%' }, [marcador, barra]),
    hist
  ]);

  function refrescar() {
    objetivo = K.clamp(Math.round(Number(num.value) || 50), 2, 98);
    num.value = objetivo; rango.value = objetivo;
    sProb.set(K.pct(prob(), 2));
    sMult.set(K.dec(mult()) + '×');
    sGana.set(K.sol(monto.get() * (mult() - 1)));
    btnModo.textContent = 'Apostando a ' + (modo === 'menor' ? 'MENOR' : 'MAYOR') + ' que ' + objetivo;
    barra.style.background = modo === 'menor'
      ? `linear-gradient(90deg, var(--verde) 0 ${objetivo}%, var(--panel-3) ${objetivo}% 100%)`
      : `linear-gradient(90deg, var(--panel-3) 0 ${objetivo}%, var(--verde) ${objetivo}% 100%)`;
  }
  rango.oninput = () => { num.value = rango.value; refrescar(); };
  num.oninput = refrescar;
  monto.inp.oninput = refrescar;
  btnModo.onclick = () => { modo = modo === 'menor' ? 'mayor' : 'menor'; refrescar(); };

  async function tirar() {
    if (tirando) return;
    const apuesta = monto.get();
    if (!K.G.apostar(apuesta)) return;
    tirando = true; btn.disabled = true;
    neto = K.round2(neto - apuesta); sNeto.set(K.sol(neto));

    const res = K.round2(Math.random() * 100);
    const t0 = performance.now();
    await new Promise(fin => {
      const paso = ahora => {
        const f = (ahora - t0) / 520;
        if (f < 1) {
          const v = K.round2(Math.random() * 100);
          marcador.textContent = v.toFixed(2);
          aguja.style.left = v + '%';
          requestAnimationFrame(paso);
        } else fin();
      };
      requestAnimationFrame(paso);
    });

    marcador.textContent = res.toFixed(2);
    aguja.style.left = res + '%';
    const gano = modo === 'menor' ? res < objetivo : res > objetivo;
    marcador.style.color = gano ? 'var(--verde-2)' : 'var(--rojo)';
    if (gano) {
      const premio = K.round2(apuesta * mult());
      K.G.pagar(premio, juego.nom + ' ' + K.dec(mult()) + '×');
      neto = K.round2(neto + premio); sNeto.set(K.sol(neto));
      if (mult() >= 10) K.confeti(70);
    }
    hist.insertBefore(K.el('span', {
      class: 'pill ' + (gano ? 'alto' : 'bajo'), text: res.toFixed(2)
    }), hist.firstChild);
    while (hist.children.length > 16) hist.lastChild.remove();
    tirando = false; btn.disabled = false;
    return gano;
  }

  btn.onclick = tirar;
  btnAuto.onclick = async () => {
    for (let i = 0; i < 10; i++) {
      if (K.Wallet.est().saldo < monto.get()) break;
      await tirar();
      await K.enEspera(260);
    }
  };

  refrescar();
  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.G.nota(`<h4>La fórmula del pago</h4>
    El resultado es un número entre 0 y 100 con dos decimales, todos igual de probables. Si apuestas a
    menor que 50 aciertas la mitad de las veces, y el pago es <code>0.99 / 0.50 = 1.98×</code>. Muevas
    donde muevas el objetivo, el retorno queda clavado en <b>99%</b>: apuntar a un 2% de probabilidad
    paga 49.5× pero pierdes 49 de cada 50 tiros. Es el juego más transparente del casino y aun así la
    casa gana ese 1% cada vez.`));
};

/* =========================================================
   CARA O CRUZ · doblar o nada
   ========================================================= */
K.Juegos.moneda = function (root, juego) {
  const VENTAJA = 0.99;
  const PASO = VENTAJA * 2;            // 1.98 por acierto
  let racha = 0, apuesta = 0, activo = false, animando = false;

  const monto = K.G.inputMonto(5);
  const sRacha = K.G.stat('Racha actual', '0');
  const sBote = K.G.stat('Bote acumulado', K.sol(0));
  const sProx = K.G.stat('Si aciertas otra', K.sol(0));
  const sMejor = K.G.stat('Mejor racha', '0');

  const bCara = K.el('button', { class: 'btn bloque', text: 'CARA' });
  const bCruz = K.el('button', { class: 'btn sec bloque', text: 'CRUZ' });
  const bCobrar = K.el('button', { class: 'btn verde bloque', text: 'Cobrar' });
  bCobrar.disabled = true;

  const panel = K.el('div', { class: 'panel-apuesta' }, [
    monto.wrap, bCara, bCruz, bCobrar,
    K.el('div', { class: 'separador' }),
    sRacha.fila, sBote.fila, sProx.fila, sMejor.fila
  ]);

  const moneda = K.el('div', { class: 'moneda' }, [
    K.el('div', { class: 'cara', text: 'CARA' }),
    K.el('div', { class: 'cruz', text: 'CRUZ' })
  ]);
  const mensaje = K.el('div', { class: 'resultado', text: 'Elige cara o cruz para empezar la racha.' });
  const hist = K.el('div', { class: 'historial-mult' });
  const zona = K.el('div', { class: 'zona-juego' }, [
    K.el('div', { style: 'flex:1;display:grid;place-content:center' }, [moneda]),
    mensaje, hist
  ]);

  const bote = () => K.round2(apuesta * Math.pow(PASO, racha));

  function refrescar() {
    sRacha.set(String(racha));
    sBote.set(K.sol(activo ? bote() : 0));
    sProx.set(K.sol(activo ? bote() * PASO : monto.get() * PASO));
    bCobrar.disabled = !activo || racha === 0;
    bCara.textContent = activo ? 'CARA · seguir' : 'CARA';
    bCruz.textContent = activo ? 'CRUZ · seguir' : 'CRUZ';
  }

  async function jugar(eleccion) {
    if (animando) return;
    if (!activo) {
      apuesta = monto.get();
      if (!K.G.apostar(apuesta)) return;
      activo = true; racha = 0;
    }
    animando = true;
    const salida = Math.random() < 0.5 ? 'cara' : 'cruz';
    const vueltas = 5 + (salida === 'cruz' ? 0.5 : 0);
    moneda.style.transition = 'transform 1.1s cubic-bezier(.2,.8,.3,1)';
    moneda.style.transform = `rotateY(${vueltas * 360}deg)`;
    await K.enEspera(1150);
    moneda.style.transition = 'none';
    moneda.style.transform = `rotateY(${salida === 'cruz' ? 180 : 0}deg)`;

    hist.insertBefore(K.el('span', {
      class: 'pill ' + (salida === eleccion ? 'alto' : 'bajo'),
      text: salida === 'cara' ? 'C' : 'X'
    }), hist.firstChild);
    while (hist.children.length > 20) hist.lastChild.remove();

    if (salida === eleccion) {
      racha++;
      const w = K.Wallet.est();
      w.casino.historial.monedaMejor = Math.max(w.casino.historial.monedaMejor || 0, racha);
      sMejor.set(String(w.casino.historial.monedaMejor));
      mensaje.innerHTML = `<span style="color:var(--verde-2)">Salió ${salida} · racha de ${racha} · bote ${K.sol(bote())}</span>`;
      if (racha >= 5) K.confeti(80);
      if (K.Progreso) K.Progreso.registrar('crash', { mult: Math.pow(PASO, racha) });
    } else {
      mensaje.innerHTML = `<span style="color:var(--rojo)">Salió ${salida} · se cortó la racha</span>`;
      activo = false; racha = 0;
    }
    animando = false;
    refrescar();
  }

  function cobrar() {
    if (!activo || racha === 0) return;
    const premio = bote();
    K.G.pagar(premio, juego.nom + ' · racha de ' + racha);
    K.aviso('Cobraste ' + K.sol(premio) + ' con ' + racha + ' aciertos seguidos', 'ok');
    activo = false; racha = 0;
    mensaje.innerHTML = `<span style="color:var(--verde-2)">Cobraste ${K.sol(premio)}</span>`;
    refrescar();
  }

  bCara.onclick = () => jugar('cara');
  bCruz.onclick = () => jugar('cruz');
  bCobrar.onclick = cobrar;
  monto.inp.oninput = refrescar;
  refrescar();

  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.G.nota(`<h4>Doblar o nada, con su letra chica</h4>
    Cada tiro paga <b>1.98×</b> en vez de 2× exactos: ahí está el 1% de la casa. Con 10 aciertos
    seguidos el bote llega a <code>1.98^10 = 895×</code> tu apuesta, pero la probabilidad de lograrlo es
    <code>1/1024</code>. La moneda no tiene memoria: después de ocho caras seguidas, la novena sigue
    siendo 50/50. Esa sensación de que "ya toca" tiene nombre, falacia del jugador, y es exactamente
    de lo que vive este juego.`));
};

/* =========================================================
   HI-LO · mayor o menor con la baraja
   ========================================================= */
K.Juegos.hilo = function (root, juego) {
  const VENTAJA = 0.99;
  const ORDEN = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  let carta = null, mult = 1, apuesta = 0, activo = false, animando = false;

  const rango = c => ORDEN.indexOf(c.v);
  const pMayor = c => (13 - rango(c)) / 13;      // mayor o igual
  const pMenor = c => (rango(c) + 1) / 13;       // menor o igual

  const monto = K.G.inputMonto(5);
  const sMult = K.G.stat('Multiplicador', '1.00×');
  const sBote = K.G.stat('Bote', K.sol(0));
  const sMayor = K.G.stat('Pago si mayor', '—');
  const sMenor = K.G.stat('Pago si menor', '—');

  const btnEmpezar = K.el('button', { class: 'btn bloque', text: 'Repartir' });
  const bMayor = K.el('button', { class: 'btn sec bloque', text: '▲ Mayor o igual' });
  const bMenor = K.el('button', { class: 'btn sec bloque', text: '▼ Menor o igual' });
  const bCobrar = K.el('button', { class: 'btn verde bloque', text: 'Cobrar' });
  [bMayor, bMenor, bCobrar].forEach(b => b.disabled = true);

  const panel = K.el('div', { class: 'panel-apuesta' }, [
    monto.wrap, btnEmpezar, bMayor, bMenor, bCobrar,
    K.el('div', { class: 'separador' }),
    sMult.fila, sBote.fila, sMayor.fila, sMenor.fila
  ]);

  const mesa = K.el('div', { class: 'cartas', style: 'justify-content:center' });
  const mensaje = K.el('div', { class: 'resultado' });
  const hist = K.el('div', { class: 'historial-mult' });
  const zona = K.el('div', { class: 'zona-juego' }, [
    K.el('div', { style: 'flex:1;display:grid;place-content:center;gap:14px' }, [mesa, mensaje]), hist
  ]);

  const nuevaCarta = () => {
    const palos = [['♠', 0], ['♥', 1], ['♦', 1], ['♣', 0]];
    const p = K.elige(palos);
    return { v: K.elige(ORDEN), palo: p[0], rojo: !!p[1] };
  };

  function pintar() {
    mesa.innerHTML = '';
    mesa.appendChild(K.Baraja.nodo(carta));
    mesa.appendChild(K.Baraja.nodo(null));
    if (carta) {
      sMayor.set(K.dec(VENTAJA / pMayor(carta)) + '× · ' + K.pct(pMayor(carta), 0));
      sMenor.set(K.dec(VENTAJA / pMenor(carta)) + '× · ' + K.pct(pMenor(carta), 0));
    }
    sMult.set(K.dec(mult) + '×');
    sBote.set(K.sol(activo ? apuesta * mult : 0));
  }

  function empezar() {
    apuesta = monto.get();
    if (!K.G.apostar(apuesta)) return;
    carta = nuevaCarta(); mult = 1; activo = true;
    btnEmpezar.disabled = true;
    [bMayor, bMenor].forEach(b => b.disabled = false);
    bCobrar.disabled = true;
    mensaje.textContent = '¿La siguiente será mayor o menor?';
    pintar();
  }

  async function apostarA(dir) {
    if (!activo || animando) return;
    animando = true;
    const p = dir === 'mayor' ? pMayor(carta) : pMenor(carta);
    const paso = VENTAJA / p;
    const nueva = nuevaCarta();
    await K.enEspera(220);
    const gano = dir === 'mayor' ? rango(nueva) >= rango(carta) : rango(nueva) <= rango(carta);
    hist.insertBefore(K.el('span', {
      class: 'pill ' + (gano ? 'alto' : 'bajo'), text: nueva.v + nueva.palo
    }), hist.firstChild);
    while (hist.children.length > 18) hist.lastChild.remove();

    carta = nueva;
    if (gano) {
      mult = K.round2(mult * paso);
      mensaje.innerHTML = `<span style="color:var(--verde-2)">¡Bien! Bote de ${K.sol(apuesta * mult)}</span>`;
      bCobrar.disabled = false;
      if (mult >= 10) K.confeti(70);
    } else {
      mensaje.innerHTML = `<span style="color:var(--rojo)">Salió ${nueva.v}${nueva.palo} · perdiste el bote</span>`;
      activo = false;
      btnEmpezar.disabled = false;
      [bMayor, bMenor, bCobrar].forEach(b => b.disabled = true);
      mult = 1;
    }
    pintar();
    animando = false;
  }

  function cobrar() {
    if (!activo || mult <= 1) return;
    const premio = K.round2(apuesta * mult);
    K.G.pagar(premio, juego.nom + ' ' + K.dec(mult) + '×');
    K.aviso('Cobraste ' + K.sol(premio) + ' en ' + K.dec(mult) + '×', 'ok');
    activo = false; mult = 1;
    btnEmpezar.disabled = false;
    [bMayor, bMenor, bCobrar].forEach(b => b.disabled = true);
    pintar();
  }

  btnEmpezar.onclick = empezar;
  bMayor.onclick = () => apostarA('mayor');
  bMenor.onclick = () => apostarA('menor');
  bCobrar.onclick = cobrar;
  pintar();

  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.G.nota(`<h4>Los pagos salen de la carta que ves</h4>
    Con un 7 en la mesa, "mayor o igual" cubre 7 rangos de 13 y paga <code>0.99 / (7/13) = 1.84×</code>;
    con un rey, "mayor o igual" es casi seguro y paga 1.07×. El multiplicador se acumula ronda tras
    ronda y podés cobrar cuando quieras: la tensión entre cobrar y seguir es todo el juego, y el 1% de
    la casa se aplica en cada paso, así que cuanto más encadenas, más margen pagas.`));
};

/* =========================================================
   TORRES · sube pisos esquivando la trampa
   ========================================================= */
K.Juegos.torres = function (root, juego) {
  const FILAS = 8;
  const NIVELES = { facil: 4, medio: 3, dificil: 2 };
  let dificultad = 'medio', piso = 0, activo = false, tablero = [], apuesta = 0;

  const cols = () => NIVELES[dificultad];
  const pPaso = () => (cols() - 1) / cols();
  const multPiso = n => n === 0 ? 1 : K.round2(0.99 * Math.pow(1 / pPaso(), n));

  const monto = K.G.inputMonto(5);
  const selDif = K.el('select');
  [['facil', 'Fácil · 1 trampa de 4'], ['medio', 'Medio · 1 de 3'], ['dificil', 'Difícil · 1 de 2']]
    .forEach(([v, t]) => selDif.appendChild(K.el('option', { value: v, text: t })));
  selDif.value = dificultad;

  const sPiso = K.G.stat('Piso actual', '0 de ' + FILAS);
  const sMult = K.G.stat('Multiplicador', '1.00×');
  const sCobro = K.G.stat('Cobro disponible', K.sol(0));
  const sProx = K.G.stat('Si subes uno más', '—');

  const btn = K.el('button', { class: 'btn bloque', text: 'Empezar a subir' });
  const btnCobrar = K.el('button', { class: 'btn verde bloque', text: 'Cobrar' });
  btnCobrar.disabled = true;

  const panel = K.el('div', { class: 'panel-apuesta' }, [
    monto.wrap,
    K.el('div', { class: 'campo' }, [K.el('label', { text: 'Dificultad' }), selDif]),
    btn, btnCobrar,
    K.el('div', { class: 'separador' }),
    sPiso.fila, sMult.fila, sCobro.fila, sProx.fila
  ]);

  const torre = K.el('div', { class: 'torre' });
  const zona = K.el('div', { class: 'zona-juego' }, [torre]);

  function construir() {
    torre.innerHTML = '';
    for (let f = FILAS - 1; f >= 0; f--) {
      const fila = K.el('div', { class: 'torre-fila' + (f === piso && activo ? ' activa' : '') });
      fila.style.gridTemplateColumns = `54px repeat(${cols()},1fr)`;
      fila.appendChild(K.el('span', { class: 'torre-mult', text: multPiso(f + 1) + '×' }));
      for (let c = 0; c < cols(); c++) {
        const b = K.el('button', {
          class: 'torre-celda', text: '',
          onclick: () => elegir(f, c)
        });
        b.disabled = !activo || f !== piso;
        if (tablero[f] && tablero[f].revelado) {
          b.textContent = tablero[f].trampa === c ? '💀' : '💎';
          b.classList.add(tablero[f].trampa === c ? 'mala' : 'buena');
        } else if (tablero.length && f < piso) {
          b.textContent = '·';
        }
        fila.appendChild(b);
      }
      torre.appendChild(fila);
    }
  }

  function refrescar() {
    sPiso.set(piso + ' de ' + FILAS);
    sMult.set(multPiso(piso) + '×');
    sCobro.set(K.sol(activo ? apuesta * multPiso(piso) : 0));
    sProx.set(piso < FILAS ? multPiso(piso + 1) + '× · ' + K.pct(pPaso(), 0) + ' de pasar' : 'cima');
    btnCobrar.disabled = !activo || piso === 0;
    construir();
  }

  function empezar() {
    apuesta = monto.get();
    if (!K.G.apostar(apuesta)) return;
    tablero = [];
    for (let f = 0; f < FILAS; f++) tablero.push({ trampa: K.entero(0, cols() - 1), revelado: false });
    piso = 0; activo = true;
    btn.disabled = true; selDif.disabled = true;
    refrescar();
  }

  function elegir(f, c) {
    if (!activo || f !== piso) return;
    tablero[f].revelado = true;
    if (tablero[f].trampa === c) {
      activo = false;
      K.aviso('Caíste en la trampa del piso ' + (f + 1), 'err');
      tablero.forEach(t => t.revelado = true);
      terminar();
      return;
    }
    piso++;
    if (piso >= FILAS) { cobrar(true); return; }
    refrescar();
  }

  function cobrar(cima = false) {
    if (!activo || piso === 0) return;
    const m = multPiso(piso);
    const premio = K.round2(apuesta * m);
    K.G.pagar(premio, juego.nom + ' piso ' + piso);
    K.aviso((cima ? '¡Llegaste a la cima! ' : 'Cobraste ') + K.sol(premio) + ' con ' + m + '×', 'ok');
    if (cima && K.Progreso) K.Progreso.marcar('torres');
    if (cima || m >= 8) K.confeti(90);
    activo = false;
    terminar();
  }

  function terminar() {
    btn.disabled = false; selDif.disabled = false;
    refrescar();
  }

  btn.onclick = empezar;
  btnCobrar.onclick = () => cobrar(false);
  selDif.onchange = () => { if (!activo) { dificultad = selDif.value; piso = 0; refrescar(); } };
  refrescar();

  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.G.nota(`<h4>Ocho pisos, una trampa por piso</h4>
    En dificultad media aciertas 2 de cada 3 veces por piso, así que el multiplicador de subir n pisos
    es <code>0.99 × (3/2)^n</code>. Llegar a la cima paga <b>${multPiso(FILAS)}×</b> en medio, pero solo
    pasa <code>(2/3)^8 = 3.9%</code> de las partidas. Cada piso que subes vale más, y esa es justamente
    la trampa: cuanto más alto llegas, más te cuesta bajarte.`));
};

/* =========================================================
   RASPADITA · tres símbolos iguales
   ========================================================= */
K.Juegos.rasca = function (root, juego) {
  const RTP = 0.95;
  const PREMIOS = [
    { m: 1, w: 250, s: '🍀' }, { m: 2, w: 120, s: '🔔' }, { m: 5, w: 50, s: '💰' },
    { m: 10, w: 20, s: '💎' }, { m: 25, w: 6, s: '👑' }, { m: 100, w: 1.5, s: '🏆' },
    { m: 1000, w: 0.2, s: '⭐' }
  ];
  const EV_BRUTO = PREMIOS.reduce((a, p) => a + p.w * p.m, 0);
  const ESCALA = RTP / EV_BRUTO;                       // probabilidad real de cada premio
  const OTROS = ['🍋', '🍒', '🍇', '🔶', '🎲', '🃏'];

  let raspando = false, celdas = [], premio = null, reveladas = 0, apuesta = 0;

  const monto = K.G.inputMonto(5);
  const sUlt = K.G.stat('Último cartón', '—');
  const sJugados = K.G.stat('Cartones', '0');
  const sNeto = K.G.stat('Resultado neto', K.sol(0));
  let jugados = 0, neto = 0;

  const btn = K.el('button', { class: 'btn bloque', text: 'Comprar cartón' });
  const btnTodo = K.el('button', { class: 'btn sec bloque', text: 'Raspar todo' });
  btnTodo.disabled = true;

  const panel = K.el('div', { class: 'panel-apuesta' }, [
    monto.wrap, btn, btnTodo,
    K.el('div', { class: 'separador' }),
    sUlt.fila, sJugados.fila, sNeto.fila,
    K.el('div', { class: 'rasca-tabla' }, PREMIOS.map(p => K.el('div', {
      class: 'rasca-premio',
      html: `<span>${p.s}</span><b>${p.m}×</b><i>${(p.w * ESCALA * 100).toFixed(2)}%</i>`
    })))
  ]);

  const carton = K.el('div', { class: 'rasca-carton' });
  const mensaje = K.el('div', { class: 'resultado', text: 'Compra un cartón y raspa las nueve casillas.' });
  const zona = K.el('div', { class: 'zona-juego' }, [
    K.el('div', { style: 'flex:1;display:grid;place-content:center' }, [carton]), mensaje
  ]);

  function sortearPremio() {
    let r = Math.random();
    for (const p of PREMIOS) {
      const prob = p.w * ESCALA;
      if (r < prob) return p;
      r -= prob;
    }
    return null;
  }

  function armarCarton() {
    premio = sortearPremio();
    const simbolos = [];
    if (premio) {
      for (let i = 0; i < 3; i++) simbolos.push(premio.s);
      const resto = K.mezcla(OTROS.concat(PREMIOS.filter(p => p !== premio).map(p => p.s)));
      for (let i = 0; i < 6; i++) simbolos.push(resto[i % resto.length]);
    } else {
      // Sin premio: como mucho dos iguales de cada símbolo
      const pool = K.mezcla(OTROS.concat(PREMIOS.map(p => p.s)));
      const cuenta = {};
      while (simbolos.length < 9) {
        const s = pool[K.entero(0, pool.length - 1)];
        if ((cuenta[s] || 0) >= 2) continue;
        cuenta[s] = (cuenta[s] || 0) + 1;
        simbolos.push(s);
      }
    }
    return K.mezcla(simbolos);
  }

  function comprar() {
    apuesta = monto.get();
    if (!K.G.apostar(apuesta)) return;
    neto = K.round2(neto - apuesta); sNeto.set(K.sol(neto));
    const simbolos = armarCarton();
    reveladas = 0;
    carton.innerHTML = '';
    celdas = simbolos.map((s, i) => {
      const c = K.el('button', { class: 'rasca-celda', 'data-s': s, onclick: () => raspar(i) });
      c.innerHTML = '<span class="tapa"></span><span class="simbolo">' + s + '</span>';
      carton.appendChild(c);
      return c;
    });
    raspando = true;
    btn.disabled = true; btnTodo.disabled = false;
    mensaje.textContent = 'Raspa las nueve casillas.';
    jugados++; sJugados.set(String(jugados));
  }

  function raspar(i) {
    if (!raspando || celdas[i].classList.contains('abierta')) return;
    celdas[i].classList.add('abierta');
    reveladas++;
    if (reveladas === 9) resolver();
  }

  function resolver() {
    raspando = false;
    btn.disabled = false; btnTodo.disabled = true;
    if (premio) {
      const pago = K.round2(apuesta * premio.m);
      K.G.pagar(pago, juego.nom + ' ' + premio.m + '×');
      neto = K.round2(neto + pago); sNeto.set(K.sol(neto));
      sUlt.set(premio.m + '× · ' + K.sol(pago));
      mensaje.innerHTML = `<span style="color:var(--verde-2)">Tres ${premio.s} · ${premio.m}× · ${K.sol(pago)}</span>`;
      celdas.forEach(c => { if (c.dataset.s === premio.s) c.classList.add('ganadora'); });
      if (premio.m >= 25) K.confeti(110);
    } else {
      sUlt.set('sin premio');
      mensaje.innerHTML = '<span style="color:var(--tenue)">Sin tres iguales. Otro cartón, otra oportunidad.</span>';
    }
  }

  btn.onclick = comprar;
  btnTodo.onclick = () => celdas.forEach((c, i) => setTimeout(() => raspar(i), i * 60));

  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.G.nota(`<h4>El cartón ya está decidido cuando lo compras</h4>
    El premio se sortea al comprar, antes de que raspes nada: las casillas solo dibujan un resultado que
    ya existe. Raspar de a poco no cambia nada, solo estira la expectativa, y por eso las raspaditas
    reales se diseñan así. La tabla de la izquierda muestra la probabilidad exacta de cada premio; todas
    juntas suman un retorno del <b>${(RTP * 100).toFixed(0)}%</b>.`));
};
