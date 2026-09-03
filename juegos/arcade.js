/* ==========================================================
   Utilidades compartidas del ARCADE NEXO
   Sin dependencias externas: audio WebAudio, records y bucle.
   ========================================================== */

// ---------- Matemáticas ----------
function limitar(v, min, max){ return v < min ? min : (v > max ? max : v); }
function azar(a, b){ return a + Math.random() * (b - a); }
function azarEntero(a, b){ return Math.floor(azar(a, b + 1)); }
function elegir(lista){ return lista[Math.floor(Math.random() * lista.length)]; }
function mezclar(lista){
  for (let i = lista.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

// ---------- Audio: efectos generados en tiempo real ----------
const Sonido = {
  // `volumen` multiplica todo lo que suena: 0 es mudo, 1 el nivel de siempre.
  ctx: null, silencio: false, volumen: 1, ultimo: {},
  activar(){
    if (!this.ctx){
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tono(f1, f2, dur, tipo, vol, retraso = 0){
    if (this.silencio || !this.ctx) return;
    vol *= this.volumen;
    if (vol <= 0) return;
    const c = this.ctx, t = c.currentTime + retraso;
    const o = c.createOscillator(), g = c.createGain();
    o.type = tipo || 'square';
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  },
  ruido(dur, filtro, vol, retraso = 0){
    if (this.silencio || !this.ctx) return;
    vol *= this.volumen;
    if (vol <= 0) return;
    const c = this.ctx, t = c.currentTime + retraso;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filtro;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t);
  },
  melodia(notas, dur, tipo, vol){
    notas.forEach((f, i) => this.tono(f, f, dur, tipo || 'triangle', vol || 0.07, i * dur * 0.85));
  },
  fx(nombre){
    if (this.silencio || !this.ctx) return;
    const ahora = performance.now();
    const min = {
      come:55, paso:60, disparo:60, golpe:50, giro:70,
      bola:26, banda:45, choquePj:45, guisante:70, mordisco:90
    }[nombre] || 0;
    if (min && this.ultimo[nombre] && ahora - this.ultimo[nombre] < min) return;
    this.ultimo[nombre] = ahora;
    switch (nombre){
      case 'come':      this.tono(520, 720, 0.05, 'square', 0.035); break;
      case 'come2':     this.tono(720, 520, 0.05, 'square', 0.035); break;
      case 'poder':     this.tono(180, 420, 0.28, 'sawtooth', 0.06); break;
      case 'fantasma':  this.melodia([440, 660, 880, 1200], 0.07, 'square', 0.06); break;
      case 'fruta':     this.melodia([660, 880, 1320], 0.08, 'triangle', 0.07); break;
      case 'disparo':   this.tono(760, 240, 0.07, 'square', 0.04); break;
      case 'guisante':  this.tono(880, 420, 0.06, 'triangle', 0.035); break;
      case 'plantar':   this.tono(300, 520, 0.1, 'triangle', 0.06); break;
      case 'sol':       this.melodia([880, 1180], 0.07, 'sine', 0.06); break;
      case 'mordisco':  this.ruido(0.1, 900, 0.06); this.tono(180, 90, 0.12, 'sawtooth', 0.05); break;
      case 'golpe':     this.tono(200, 80, 0.09, 'square', 0.05); break;
      case 'explosion': this.ruido(0.45, 800, 0.18); this.tono(130, 40, 0.4, 'sine', 0.12); break;
      case 'hielo':     this.tono(620, 980, 0.12, 'sine', 0.045); break;
      case 'cortacesped':this.ruido(0.5, 1400, 0.1); this.tono(150, 220, 0.5, 'sawtooth', 0.05); break;
      case 'colocar':   this.tono(420, 640, 0.09, 'triangle', 0.07); break;
      case 'linea':     this.melodia([523, 659, 784, 1047], 0.07, 'triangle', 0.07); break;
      case 'combo':     this.melodia([784, 988, 1319], 0.08, 'square', 0.055); break;
      case 'giro':      this.tono(300, 500, 0.05, 'triangle', 0.04); break;
      case 'gema':      this.tono(880, 1320, 0.1, 'triangle', 0.06); break;
      case 'mina':      this.ruido(0.4, 700, 0.16); this.tono(160, 45, 0.35, 'sawtooth', 0.1); break;
      case 'ficha':     this.melodia([1046, 1318, 1568], 0.07, 'sine', 0.055); break;
      case 'moneda':    this.tono(980, 1300, 0.08, 'triangle', 0.05); break;
      case 'nivel':     this.melodia([523, 659, 784, 1047, 1319], 0.09, 'square', 0.06); break;
      case 'derrota':   [392, 330, 262, 196].forEach((f, i) => this.tono(f, f * 0.97, 0.28, 'triangle', 0.09, i * 0.22)); break;
      case 'victoria':  [523, 659, 784, 1047, 1319].forEach((f, i) => this.tono(f, f, 0.22, 'triangle', 0.09, i * 0.15)); break;
      case 'error':     this.tono(200, 120, 0.16, 'sawtooth', 0.05); break;
      case 'paso':      this.tono(120, 90, 0.05, 'square', 0.02); break;
      // --- Aviator ---
      case 'despegue':  this.ruido(0.6, 900, 0.07); this.tono(90, 300, 0.7, 'sawtooth', 0.05); break;
      case 'estrella':  this.melodia([784, 1046, 1318, 1568], 0.06, 'sine', 0.05); break;
      case 'choque':    this.ruido(0.7, 600, 0.2); this.tono(200, 35, 0.6, 'sawtooth', 0.13); break;
      case 'cuenta':    this.tono(660, 660, 0.06, 'square', 0.03); break;
      // --- Billar ---
      case 'taco':      this.ruido(0.05, 5000, 0.09); this.tono(1400, 700, 0.05, 'triangle', 0.06); break;
      case 'bola':      this.ruido(0.035, 6000, 0.05); this.tono(1800, 1100, 0.035, 'triangle', 0.04); break;
      case 'banda':     this.ruido(0.06, 1400, 0.05); this.tono(320, 190, 0.07, 'sine', 0.05); break;
      case 'tronera':   this.tono(420, 130, 0.22, 'sine', 0.08); this.ruido(0.18, 700, 0.06); break;
      // --- Rumble ---
      case 'patada':    this.ruido(0.07, 2200, 0.09); this.tono(240, 110, 0.1, 'square', 0.07); break;
      case 'choquePj':  this.ruido(0.08, 1200, 0.06); this.tono(160, 90, 0.09, 'sine', 0.05); break;
      case 'silbato':   this.tono(2100, 2400, 0.16, 'square', 0.05); this.tono(2400, 2100, 0.16, 'square', 0.05, 0.16); break;
      case 'gol':       [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tono(f, f, 0.18, 'square', 0.07, i * 0.09));
                        this.ruido(0.9, 1200, 0.05); break;
      case 'desplegar': this.tono(300, 620, 0.11, 'triangle', 0.06); break;
      // --- Spartahoppers ---
      case 'acierto':   this.melodia([660, 880], 0.07, 'triangle', 0.05); break;
      case 'clic':      this.tono(520, 520, 0.03, 'sine', 0.03); break;
      // --- Money Market ---
      case 'orden':     this.tono(880, 1240, 0.07, 'square', 0.045); break;
      case 'caja':      this.melodia([1046, 1318, 1568, 2093], 0.06, 'sine', 0.05); break;
      case 'alarma':    this.tono(880, 440, 0.18, 'sawtooth', 0.06);
                        this.tono(880, 440, 0.18, 'sawtooth', 0.06, 0.2); break;
      // --- Moto X3M ---
      case 'salto':     this.tono(300, 700, 0.14, 'triangle', 0.05); break;
      case 'aterrizar': this.ruido(0.14, 900, 0.09); this.tono(150, 90, 0.12, 'sine', 0.05); break;
      case 'nitro':     this.ruido(0.3, 3000, 0.06); break;
      case 'meta':      [784, 988, 1319, 1568, 2093].forEach((f, i) => this.tono(f, f, 0.2, 'square', 0.07, i * 0.11)); break;
    }
  },

  /**
   * Motor continuo (Aviator): un oscilador que sube de tono mientras vuela.
   * `agudeza` va de 0 a 1; con `null` se apaga.
   */
  motor(agudeza){
    if (!this.ctx || this.silencio){ this.pararMotor(); return; }
    if (agudeza === null){ this.pararMotor(); return; }
    if (!this._motor){
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 900;
      o.type = 'sawtooth'; o.frequency.value = 70;
      g.gain.value = 0.0001;
      o.connect(f); f.connect(g); g.connect(this.ctx.destination);
      o.start();
      this._motor = { o, g, f };
    }
    const t = this.ctx.currentTime;
    this._motor.o.frequency.setTargetAtTime(70 + agudeza * 150, t, 0.15);
    this._motor.f.frequency.setTargetAtTime(700 + agudeza * 1400, t, 0.15);
    this._motor.g.gain.setTargetAtTime(0.022 * this.volumen, t, 0.1);
  },
  pararMotor(){
    if (!this._motor) return;
    const { o, g } = this._motor;
    try {
      g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
      o.stop(this.ctx.currentTime + 0.3);
    } catch(e){}
    this._motor = null;
  }
};

// ---------- Records en el navegador ----------
// El almacenamiento puede estar bloqueado (modo privado, sandbox...), así que
// siempre se accede con red de seguridad y se cae a una copia en memoria.
// Va dentro de una función para no dejar nombres sueltos en el ámbito global:
// un juego que declarase su propio `guardar` pisaría este y lo rompería.
const Almacen = (() => {
  const memoria = {};
  let permitido = null;
  // Una copia abierta en about:blank no tiene localStorage propio, así que el
  // botón de pestaña limpia deja aquí el progreso para que arranque igual.
  try {
    const semilla = window.__ARCADE_SEMILLA;
    if (semilla && typeof semilla === 'object')
      for (const k of Object.keys(semilla)) memoria[k] = String(semilla[k]);
  } catch(e){}
  return {
    // ¿Sobrevive lo guardado a recargar la página? (falso en modo privado o sandbox)
    disponible(){
      if (permitido === null){
        try {
          localStorage.setItem('arcade_prueba', '1');
          localStorage.removeItem('arcade_prueba');
          permitido = true;
        } catch(e){ permitido = false; }
      }
      return permitido;
    },
    leer(clave){
      try {
        const v = localStorage.getItem(clave);
        return v === null ? (clave in memoria ? memoria[clave] : null) : v;
      } catch(e){ return clave in memoria ? memoria[clave] : null; }
    },
    escribir(clave, valor){
      memoria[clave] = String(valor);
      try { localStorage.setItem(clave, String(valor)); } catch(e){}
    },
    borrar(clave){
      delete memoria[clave];
      try { localStorage.removeItem(clave); } catch(e){}
    }
  };
})();

/**
 * Guardado automático. Cada juego apunta aquí su función de guardar y el
 * arcade la dispara cuando se cierra la pestaña, cuando pasa a segundo plano
 * y cuando se cambia de pantalla: así no hace falta acordarse de guardar en
 * cada rincón del código y no se pierde nada por salir de golpe.
 */
const Guardado = {
  tareas: [],
  registrar(fn){ if (typeof fn === 'function') this.tareas.push(fn); },
  ahora(){ this.tareas.forEach(f => { try { f(); } catch(e){} }); }
};

/**
 * Cosas que hay que apagar al dejar una pantalla: música propia de un juego,
 * temporizadores, bucles de audio… El enrutador lo dispara antes de cambiar,
 * y también al ocultar la pestaña, para no dejar nada sonando de fondo.
 */
const AlSalir = {
  tareas: [],
  registrar(fn){ if (typeof fn === 'function') this.tareas.push(fn); },
  ahora(){ this.tareas.forEach(f => { try { f(); } catch(e){} }); }
};
document.addEventListener('visibilitychange', () => { if (document.hidden) AlSalir.ahora(); });
addEventListener('beforeunload', () => Guardado.ahora());
addEventListener('pagehide', () => Guardado.ahora());
document.addEventListener('visibilitychange', () => { if (document.hidden) Guardado.ahora(); });

const Arcade = {
  record(clave){ return parseFloat(Almacen.leer('arcade_' + clave) || '0') || 0; },
  guardarRecord(clave, valor){
    if (valor > this.record(clave)){ Almacen.escribir('arcade_' + clave, valor); return true; }
    return false;
  },
  leer(clave, porDefecto){
    const v = Almacen.leer('arcade_' + clave);
    return v === null ? porDefecto : parseFloat(v);
  },
  escribir(clave, valor){ Almacen.escribir('arcade_' + clave, valor); },
  // Igual que leer, pero sin convertir a número (para partidas guardadas en JSON)
  leerTexto(clave, porDefecto){
    const v = Almacen.leer('arcade_' + clave);
    return v === null ? porDefecto : v;
  },
  borrar(clave){ Almacen.borrar('arcade_' + clave); },

  // Bucle de animación con dt acotado (en segundos)
  /** Multiplicador del paso del tiempo. Lo toca el comando "ritmo". */
  ritmo: 1,

  /** Bucles dormidos, a la espera de que su pantalla vuelva a abrirse. */
  _bucles: [],

  /**
   * Bucle de animación con dt acotado (en segundos).
   *
   * `opciones.activa` es una función que dice si la pantalla del juego está a
   * la vista. Cuando deja de estarlo el bucle se duerme de verdad: deja de
   * pedir cuadros en vez de pedirlos para no hacer nada. Sin esto, cada juego
   * que hubieras abierto seguía despertando en cada fotograma para siempre, y
   * el arcade se iba volviendo más lento cuanto más jugabas.
   */
  bucle(fn, opciones){
    const activa = (opciones && opciones.activa) || null;
    let previo = performance.now();
    let pedido = 0;
    const paso = (t) => {
      pedido = 0;
      if (activa && !activa()) return;   // dormido; lo despierta el enrutador
      const dt = Math.min(0.05, (t - previo) / 1000) * Arcade.ritmo;
      previo = t;
      // En pausa se sigue pidiendo cuadros pero no se avanza nada: al reanudar
      // no hay un salto de golpe con todo el tiempo que estuvo parado.
      if (!Arcade.experiencia.parado) fn(dt);
      pedido = requestAnimationFrame(paso);
    };
    const despertar = () => {
      if (pedido || (activa && !activa())) return;
      previo = performance.now();        // al volver, sin salto de tiempo
      pedido = requestAnimationFrame(paso);
    };
    if (activa) this._bucles.push(despertar);
    despertar();
    return {
      despertar,
      parar(){ if (pedido) cancelAnimationFrame(pedido); pedido = 0; }
    };
  },

  /** El enrutador llama a esto al abrir una pantalla: revive sus bucles. */
  despertarBucles(){ this._bucles.forEach(f => { try { f(); } catch(e){} }); },

  /**
   * Abre una copia del arcade en una pestaña about:blank.
   *
   * La copia no tiene almacenamiento propio (about:blank no tiene origen), así
   * que se le pasa el progreso incrustado y ella lo carga en memoria: puedes
   * seguir donde ibas, pero lo que juegues allí no se guarda al cerrar.
   *
   * Devuelve null si todo fue bien, o un texto explicando qué falló.
   */
  pestanaLimpia(){
    let ventana;
    try { ventana = window.open('about:blank', '_blank'); }
    catch(e){ return 'El navegador no ha dejado abrir la pestaña.'; }
    if (!ventana) return 'El navegador ha bloqueado la ventana emergente. Permite los pop-ups de esta página.';

    Guardado.ahora();               // lo que estés jugando se guarda antes de copiar

    // El progreso viaja incrustado, porque la copia no podrá leer localStorage.
    const semilla = {};
    try {
      for (let i = 0; i < localStorage.length; i++){
        const k = localStorage.key(i);
        semilla[k] = localStorage.getItem(k);
      }
    } catch(e){}
    const inyeccion = '<scr' + 'ipt>window.__ARCADE_SEMILLA=' +
      JSON.stringify(semilla).replace(/</g, '\\u003c') + ';</scr' + 'ipt>';

    let html = document.documentElement.outerHTML;
    // Delante del primer script, para que el progreso ya esté puesto al arrancar.
    html = html.indexOf('<script') >= 0
      ? html.replace('<script', inyeccion + '<script')
      : html + inyeccion;

    try {
      ventana.document.open();
      ventana.document.write(html);
      ventana.document.close();
    } catch(e){
      try { ventana.close(); } catch(e2){}
      return 'Esta página no deja copiarse a otra pestaña (' + e.message + ').';
    }
    return null;
  },

  // Aviso flotante dentro de un contenedor .avisos
  aviso(contenedor, texto, importante, ms = 2200){
    if (!contenedor) return;
    const d = document.createElement('div');
    d.className = 'aviso' + (importante ? ' importante' : '');
    d.textContent = texto;
    contenedor.appendChild(d);
    setTimeout(() => {
      d.style.transition = 'opacity .4s';
      d.style.opacity = '0';
      setTimeout(() => d.remove(), 420);
    }, ms);
  },

  // Botón de sonido estándar: alterna el silencio y actualiza el icono
  conectarSonido(boton){
    if (!boton) return;
    boton.onclick = () => {
      Sonido.activar();
      Sonido.silencio = !Sonido.silencio;
      boton.textContent = Sonido.silencio ? '🔇' : '🔊';
    };
  },

  /**
   * Nitidez en pantallas HiDPI: agranda el búfer real del canvas según la
   * densidad de píxeles y escala el contexto, de modo que el juego sigue
   * dibujando en sus coordenadas de siempre pero sin verse borroso.
   * `canvas.width/height` siguen devolviendo el tamaño lógico.
   */
  nitido(canvas){
    const w = canvas.width, h = canvas.height;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const ctx = canvas.getContext('2d');
    if (dpr !== 1){
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      Object.defineProperty(canvas, 'width',  { get: () => w, configurable: true });
      Object.defineProperty(canvas, 'height', { get: () => h, configurable: true });
    }
    return ctx;
  },

  // Igual, pero para lienzos fuera de pantalla creados a mano
  lienzoOculto(w, h){
    const c = document.createElement('canvas');
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.anchoLogico = w; c.altoLogico = h;
    return { lienzo: c, ctx };
  },

  // Cartera de fichas ficticias compartida por los juegos de casino
  fichas: {
    INICIAL: 50000,              // saldo con el que arranca una partida nueva
    saldo(){
      const v = Almacen.leer('arcade_fichas');
      if (v !== null) return parseFloat(v) || 0;
      // Compatibilidad con el saldo que Minas guardaba por su cuenta
      const viejo = Almacen.leer('arcade_minas_saldo');
      return viejo !== null ? (parseFloat(viejo) || 0) : this.INICIAL;
    },
    fijar(n){ Almacen.escribir('arcade_fichas', Math.max(0, Math.round(n))); },
    ajustar(n){ const s = this.saldo() + n; this.fijar(s); return this.saldo(); },
    reiniciar(){ this.fijar(this.INICIAL); return this.saldo(); }
  },

  /**
   * Códigos promocionales: del 1 al 20, cada uno regala fichas una sola vez.
   * Se admite el número suelto ("7") o con el prefijo de la marca ("NEXO-7"),
   * porque es como aparecen impresos en la portada.
   */
  codigos: {
    TOTAL: 20,
    PREMIO: 1000,
    normalizar(txt){
      const limpio = String(txt || '').trim().toUpperCase().replace(/[\s_]/g, '');
      const m = limpio.match(/^(?:NEXO-?)?0*(\d{1,2})$/);   // "007" vale tanto como "7"
      if (!m) return null;
      const n = parseInt(m[1], 10);
      return (n >= 1 && n <= this.TOTAL) ? n : null;
    },
    usados(){
      const v = Almacen.leer('arcade_codigos');
      if (!v) return [];
      return v.split(',').map(Number).filter(n => n >= 1 && n <= this.TOTAL);
    },
    /**
     * Códigos fuera de serie: no salen en la lista de la portada, no cuentan
     * en el marcador de canjeados y cada uno lleva su propio registro. Se
     * canjean una sola vez. La clave es el número tal cual se escribe.
     */
    /** El código del creador. No paga nada: abre la consola. */
    ADMIN: 2808,

    EXTRA: {
      99: 1000000,
      1202: 100000000,
      6767: 981000000,
      SUERTE: 100000000000
    },
    claveExtra(n){ return 'arcade_codigo_x' + n; },
    extraUsado(n){
      // El 99 se guardaba antes en otra clave: si no se mirase, quien ya lo
      // hubiera canjeado podría cobrarlo una segunda vez.
      if (+n === 99 && Almacen.leer('arcade_codigo_secreto') === '1') return true;
      return Almacen.leer(this.claveExtra(n)) === '1';
    },

    /**
     * Deja el texto en la forma con la que se busca en la tabla: sin espacios,
     * sin guiones, sin el prefijo de la marca, sin tildes y en mayúsculas.
     * Así "nexo suerte", "Suerte" y "SUÉRTE" son el mismo código.
     */
    normalizarExtra(txt){
      return String(txt || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // fuera tildes
        .trim().toUpperCase()
        .replace(/[\s_-]/g, '')
        .replace(/^NEXO/, '');
    },

    /** Devuelve la clave fuera de serie que coincide con `txt`, o null. */
    reconocerExtra(txt){
      const limpio = this.normalizarExtra(txt);
      if (!limpio) return null;
      if (/^\d{1,9}$/.test(limpio)){
        const n = parseInt(limpio, 10);
        return (n in this.EXTRA) ? n : null;
      }
      return (limpio in this.EXTRA) ? limpio : null;
    },

    // -> { ok, motivo: 'canjeado' | 'invalido' | 'repetido', numero, premio, saldo }
    canjear(txt){
      // Se miran antes que la serie: se salen del rango 1-20 y normalizar()
      // los rechazaría como si fueran números inventados.
      // El código del creador no paga: enciende el modo administrador.
      if (this.normalizarExtra(txt).replace(/^0+/, '') === String(this.ADMIN)){
        const yaEstaba = Arcade.admin.activo();
        Arcade.admin.activar();
        return { ok:true, motivo:'admin', numero:this.ADMIN, secreto:true, premio:0,
                 repetido: yaEstaba, saldo:Arcade.fichas.saldo() };
      }
      const extra = this.reconocerExtra(txt);
      if (extra !== null){
        const premio = this.EXTRA[extra];
        if (this.extraUsado(extra))
          return { ok:false, motivo:'repetido', numero:extra, secreto:true,
                   saldo:Arcade.fichas.saldo() };
        Almacen.escribir(this.claveExtra(extra), '1');
        return { ok:true, motivo:'canjeado', numero:extra, secreto:true, premio,
                 saldo:Arcade.fichas.ajustar(premio) };
      }
      const n = this.normalizar(txt);
      if (n === null) return { ok:false, motivo:'invalido', saldo:Arcade.fichas.saldo() };
      const ya = this.usados();
      if (ya.includes(n)) return { ok:false, motivo:'repetido', numero:n, saldo:Arcade.fichas.saldo() };
      ya.push(n);
      Almacen.escribir('arcade_codigos', ya.sort((a, b) => a - b).join(','));
      return { ok:true, motivo:'canjeado', numero:n, premio:this.PREMIO,
               saldo:Arcade.fichas.ajustar(this.PREMIO) };
    },
    // Deja los 20 de la serie sin canjear. Los de fuera de serie no se tocan:
    // si entraran aquí, cada reparto de temporada regalaría otro millón.
    olvidar(){ Almacen.borrar('arcade_codigos'); },
    olvidarSecreto(){
      Object.keys(this.EXTRA).forEach(n => Almacen.borrar(this.claveExtra(n)));
      Almacen.borrar('arcade_codigo_secreto');      // clave de la versión anterior
    }
  },

  /**
   * Temporada: el repartidor de mano nueva. Al abrir el arcade, si la temporada
   * guardada no es la de ahora, los códigos vuelven a estar sin canjear y la
   * cartera sube al saldo inicial. Sube nunca baja: si ya llevabas más de lo
   * inicial, ese saldo se respeta, porque te lo ganaste jugando. Lo demás
   * —récords, partidas guardadas y estadísticas— no se toca.
   *
   * Para repartir otra vez basta con subir ACTUAL en una unidad.
   */
  temporada: {
    ACTUAL: 3,
    resultado: null,             // lo rellena aplicar() al cargar la página
    aplicar(){
      const guardada = parseInt(Almacen.leer('arcade_temporada'), 10);
      if (guardada === this.ACTUAL) return null;
      const codigosAntes = Arcade.codigos.usados().length;
      const saldoAntes = Arcade.fichas.saldo();
      Arcade.codigos.olvidar();
      if (saldoAntes < Arcade.fichas.INICIAL) Arcade.fichas.fijar(Arcade.fichas.INICIAL);
      Almacen.escribir('arcade_temporada', this.ACTUAL);
      return (this.resultado = {
        estrena: !Number.isFinite(guardada),      // no había nada guardado: jugador nuevo
        codigosAntes, saldoAntes, saldo: Arcade.fichas.saldo()
      });
    }
  },

  /**
   * Perfil del jugador: todo lo jugado y todo lo ganado, en un solo sitio.
   * Cada juego cierra sus partidas con Arcade.perfil.partida(id, resultado) y
   * de ahí salen el récord, las estadísticas de la portada y el abono de fichas.
   */
  perfil: {
    CLAVE: 'perfil',
    cache: null,
    datos(){
      if (!this.cache){
        let d = null;
        try { d = JSON.parse(Arcade.leerTexto(this.CLAVE, 'null')); } catch(e){}
        if (!d || typeof d !== 'object') d = {};
        if (!d.juegos || typeof d.juegos !== 'object') d.juegos = {};
        if (typeof d.partidas !== 'number') d.partidas = 0;
        if (typeof d.ganado !== 'number') d.ganado = 0;
        this.cache = d;
      }
      return this.cache;
    },
    juego(id){
      const j = this.datos().juegos;
      if (!j[id]) j[id] = { partidas:0, victorias:0, mejor:0, puntos:0, ganado:0, segundos:0 };
      return j[id];
    },
    guardar(){ Arcade.escribir(this.CLAVE, JSON.stringify(this.datos())); },

    /**
     * Cierra una partida y devuelve las fichas abonadas.
     * res = { puntos, victoria, premio, segundos }
     *   puntos  -> se acumulan y actualizan el mejor resultado del juego
     *   premio  -> NEXO-COINS que se suman a la cartera (0 en Minas y Aviator,
     *              que ya mueven las fichas por su cuenta con las apuestas)
     */
    partida(id, res = {}){
      const d = this.datos(), j = this.juego(id);
      const puntos = Math.max(0, Math.round(res.puntos || 0));
      const premio = Math.max(0, Math.round(res.premio || 0));
      d.partidas++;
      j.partidas++;
      j.puntos += puntos;
      if (puntos > j.mejor) j.mejor = puntos;
      if (res.victoria) j.victorias++;
      if (res.segundos > 0) j.segundos += Math.round(res.segundos);
      if (premio > 0){
        j.ganado += premio;
        d.ganado += premio;
        Arcade.fichas.ajustar(premio);
      }
      d.visto = Date.now();
      this.guardar();
      return premio;
    },
    olvidar(){ this.cache = null; Arcade.borrar(this.CLAVE); }
  },

  /**
   * Partida a medias: se guarda al salir y se recupera al volver, para que
   * cerrar la pestaña en mitad de un juego no cueste el progreso.
   */
  estado: {
    guardar(id, obj){
      if (obj === null || obj === undefined) return this.olvidar(id);
      try { Arcade.escribir('estado_' + id, JSON.stringify(obj)); } catch(e){}
    },
    cargar(id){
      const v = Arcade.leerTexto('estado_' + id, null);
      if (v === null) return null;
      try { return JSON.parse(v); } catch(e){ return null; }
    },
    olvidar(id){ Arcade.borrar('estado_' + id); }
  },

  // Coordenadas de ratón/tacto relativas al canvas, en píxeles del canvas
  puntero(canvas, ev){
    const r = canvas.getBoundingClientRect();
    const p = (ev.touches && ev.touches[0]) || (ev.changedTouches && ev.changedTouches[0]) || ev;
    return {
      x: (p.clientX - r.left) * (canvas.width / r.width),
      y: (p.clientY - r.top) * (canvas.height / r.height)
    };
  }
};

// Serie 110-120: once códigos de 100 millones cada uno. Se generan aquí en vez
// de escribirlos uno a uno para que ampliar el tramo sea cambiar dos números.
// No chocan con la serie del 1 al 20: normalizar() solo acepta dos cifras.
//
// Van en PUBLICOS, así que la portada los enseña como una segunda serie a la
// vista de cualquiera. Los que no están en esta lista siguen siendo secretos:
// se canjean igual, pero no se anuncian en ningún sitio.
Arcade.codigos.PUBLICO_DESDE = 110;
Arcade.codigos.PUBLICO_HASTA = 120;
Arcade.codigos.PREMIO_PUBLICO = 100000000;
Arcade.codigos.PUBLICOS = [];
for (let n = Arcade.codigos.PUBLICO_DESDE; n <= Arcade.codigos.PUBLICO_HASTA; n++){
  Arcade.codigos.EXTRA[n] = Arcade.codigos.PREMIO_PUBLICO;
  Arcade.codigos.PUBLICOS.push(n);
}

// Se aplica al cargar cualquier página: da igual si entras por la portada o
// directamente a un juego, la mano nueva ya está repartida cuando empiezas.
Arcade.temporada.aplicar();

/* ==========================================================
   Modo administrador — la consola del creador
   Se enciende con un código y desde ese momento vive en cualquier pantalla:
   una tecla abre la consola y desde ahí se toca lo que haga falta.
   ========================================================== */
Arcade.admin = {
  CLAVE: 'arcade_admin',

  activo(){ return Almacen.leer(this.CLAVE) === '1'; },
  activar(){ Almacen.escribir(this.CLAVE, '1'); this.montar(); },
  desactivar(){
    Almacen.borrar(this.CLAVE);
    document.querySelectorAll('.capaAdmin').forEach(c => c.remove());
    // Por si quedan botones de una versión anterior: el modo no deja rastro
    document.querySelectorAll('.btnAdmin').forEach(b => b.remove());
  },

  /**
   * Registro de trucos por juego. Cada juego se apunta desde su propio script,
   * que es el único sitio donde su estado está a mano: en el arcade empaquetado
   * las variables de cada juego viven dentro de su función y no se ven desde
   * aquí. La consola solo necesita saber qué pantalla está activa.
   */
  juegos: {},
  registrar(id, nombre, trucos){
    this.juegos[id] = { id, nombre, trucos };
  },
  /** El juego de la pantalla que se está viendo, o null si estás en la portada. */
  juegoActivo(){
    const raiz = Arcade.experiencia.activa();
    if (raiz && raiz.id && raiz.id.indexOf('pantalla-') === 0)
      return this.juegos[raiz.id.slice(9)] || null;
    // Página suelta: solo hay un juego cargado, así que es ese.
    const ids = Object.keys(this.juegos);
    return ids.length === 1 ? this.juegos[ids[0]] : null;
  },


  /** Una línea por comando para la ayuda. La primera es la que sale en la lista. */
  DESCRIPCIONES: {
    ayuda:     'Lista los comandos. "ayuda <comando>" cuenta uno en detalle.',
    monedas:   'monedas <n> — deja la cartera exactamente en esa cantidad.',
    dar:       'dar <n> — suma a la cartera. Admite negativos para quitar.',
    codigos:   'codigos — cuáles llevas gastados. "codigos reset" los libera todos.',
    record:    'record <juego> [valor] — consulta o fija el récord de un juego.',
    records:   'records — todos los récords guardados, de mayor a menor.',
    mina:      'mina — estado de Mining Tycoon. abrir · dinero <n> · borrar.',
    perfil:    'perfil — partidas y ganancias. "perfil reset" las borra.',
    ir:        'ir <juego> — entra en un juego por su id.',
    buscar:    'buscar <texto> — busca por nombre y entra si solo hay uno.',
    pantalla:  'pantalla — dice qué hay abierto y lista los juegos.',
    tienda:    'tienda — la tienda del juego actual. <artículo> compra uno, "todo" compra lo que quepa.',
    juego:     'juego — trucos del juego que tengas delante. "juego <truco>" lo ejecuta.',
    trucos:    'trucos — qué juegos tienen trucos propios y cuáles.',
    sonido:    'sonido <0-100> — volumen general. Sin número, lo dice.',
    ritmo:     'ritmo <0.1-5> — cámara lenta o acelerada. 1 es lo normal.',
    fps:       'fps — enciende o apaga el contador de cuadros por segundo.',
    temporada: 'temporada — reparte temporada nueva: códigos libres y cartera repuesta.',
    almacen:   'almacen — qué hay guardado en este navegador y cuánto ocupa.',
    exportar:  'exportar — copia de seguridad de todo el progreso, al portapapeles.',
    importar:  'importar <texto> — restaura una copia hecha con exportar.',
    todo:      'todo — cartera a tope, códigos libres y los mundos de la mina abiertos.',
    dios:      'dios — como todo, y además compra las tiendas de todos los juegos que abras.',
    limpiar:   'limpiar — vacía lo escrito en la consola.',
    reiniciar: 'reiniciar si — borra TODO el progreso. No tiene vuelta atrás.',
    salir:     'salir — apaga el modo administrador.'
  },

  /** Comandos disponibles. Cada uno devuelve el texto que se imprime. */
  COMANDOS: {
    ayuda(que){
      const D = Arcade.admin.DESCRIPCIONES;
      if (que){
        const n = String(que).toLowerCase();
        return D[n] ? n + '\n  ' + D[n] : 'No conozco "' + que + '". Escribe ayuda a secas.';
      }
      const nombres = Object.keys(Arcade.admin.COMANDOS).sort();
      const ancho = Math.max(...nombres.map(n => n.length));
      return 'COMANDOS (escribe "ayuda <comando>" para el detalle)\n' +
        nombres.map(n => '  ' + n.padEnd(ancho + 2) +
                         (D[n] || '').split('\n')[0]).join('\n') +
        '\n\nDentro de un juego, "juego" lista sus trucos y "juego <truco>" lo ejecuta.\n' +
        'Tab autocompleta · ↑ ↓ recorren el historial · Esc cierra.';
    },
    monedas(n){
      const v = Math.max(0, Math.floor(+n));
      if (!isFinite(v)) return 'Uso: monedas <cantidad>';
      Arcade.fichas.fijar(v);
      Arcade.admin.avisarCambio();
      return 'Cartera fijada en ' + v.toLocaleString('es-ES') + ' NEXO-COINS.';
    },
    dar(n){
      const v = Math.floor(+n);
      if (!isFinite(v)) return 'Uso: dar <cantidad>  (admite negativos)';
      const s = Arcade.fichas.ajustar(v);
      Arcade.admin.avisarCambio();
      return (v >= 0 ? '+' : '') + v.toLocaleString('es-ES') +
             '. Cartera: ' + s.toLocaleString('es-ES') + '.';
    },
    codigos(que){
      if (que === 'reset'){
        Arcade.codigos.olvidar();
        Arcade.codigos.olvidarSecreto();
        Arcade.admin.avisarCambio();
        return 'Todos los códigos vuelven a estar sin canjear.';
      }
      const usados = Arcade.codigos.usados();
      return 'Canjeados ' + usados.length + ' de ' + Arcade.codigos.TOTAL +
             (usados.length ? ': ' + usados.join(', ') : '') +
             '\nFuera de serie: ' + Object.keys(Arcade.codigos.EXTRA)
               .map(n => n + (Arcade.codigos.extraUsado(n) ? ' (usado)' : ' (libre)')).join(', ') +
             '\nUso: codigos reset';
    },
    record(juego, valor){
      if (!juego) return 'Uso: record <juego> <valor>   ·   record <juego>';
      if (valor === undefined) return (Arcade.record(juego) || 0).toLocaleString('es-ES');
      Arcade.guardarRecord(juego, Math.floor(+valor) || 0);
      Arcade.admin.avisarCambio();
      return 'Récord de ' + juego + ' fijado en ' + (+valor).toLocaleString('es-ES') + '.';
    },
    mina(accion, cuanto){
      // El estado de Mining Tycoon vive en su propia clave de almacenamiento.
      let g;
      try { g = JSON.parse(Arcade.leerTexto('mina', 'null')); } catch(e){ g = null; }
      if (!g || !g.mundos) return 'Todavía no hay partida guardada de Mining Tycoon.';
      if (accion === 'abrir'){
        g.abiertos = g.mundos.length;
        for (let i = 0; i < g.mundos.length; i++) if (!g.mundos[i]) g.mundos[i] = null;
        Arcade.escribir('mina', JSON.stringify(g));
        return 'Abiertos los ' + g.abiertos + ' mundos. Vuelve a entrar en la mina.';
      }
      if (accion === 'dinero'){
        const v = Math.max(0, Math.floor(+cuanto));
        if (!isFinite(v)) return 'Uso: mina dinero <cantidad>';
        g.mundos.forEach(m => { if (m) m.dinero = v; });
        Arcade.escribir('mina', JSON.stringify(g));
        return 'Cada mundo abierto tiene ahora ' + v.toLocaleString('es-ES') + '.';
      }
      if (accion === 'borrar'){
        Arcade.borrar('mina');
        return 'Partida de Mining Tycoon borrada.';
      }
      return 'Mundos abiertos: ' + g.abiertos + ' de ' + g.mundos.length +
             '\nCajas: ' + g.mundos.map((m, i) => i + ':' + (m ? Math.floor(m.dinero) : '—')).join('  ') +
             '\nUso: mina abrir | mina dinero <n> | mina borrar';
    },
    ir(id){
      const tarjeta = document.querySelector('[data-juego="' + id + '"]');
      if (tarjeta){ tarjeta.click(); return 'Entrando en ' + id + '…'; }
      const juegos = [...document.querySelectorAll('[data-juego]')].map(e => e.dataset.juego);
      return juegos.length
        ? 'No existe "' + id + '". Hay: ' + juegos.join(', ')
        : 'Esto solo funciona desde el arcade completo (arcade.html).';
    },
    perfil(que){
      if (que === 'reset'){
        Arcade.perfil.olvidar();
        Arcade.admin.avisarCambio();
        return 'Perfil y estadísticas borrados.';
      }
      const d = Arcade.perfil.datos();
      return 'Partidas: ' + (d.partidas || 0) + ' · Ganado: ' +
             (d.ganado || 0).toLocaleString('es-ES') + '\nUso: perfil reset';
    },
    todo(){
      Arcade.fichas.fijar(999999999);
      Arcade.codigos.olvidar();
      Arcade.codigos.olvidarSecreto();
      Arcade.admin.COMANDOS.mina('abrir');
      Arcade.admin.COMANDOS.mina('dinero', 999999999);
      Arcade.admin.avisarCambio();
      return 'Modo dios: cartera a tope, códigos libres y los mundos de la mina abiertos.';
    },

    /** Todos los récords guardados, de mayor a menor. */
    records(){
      const juegos = Arcade.perfil.datos().juegos || {};
      const filas = Object.keys(juegos)
        .map(id => [id, Arcade.record(id) || juegos[id].mejor || 0])
        .filter(f => f[1] > 0)
        .sort((a, b) => b[1] - a[1]);
      if (!filas.length) return 'Todavía no hay ningún récord guardado.';
      const ancho = Math.max(...filas.map(f => f[0].length));
      return filas.map(([id, v]) =>
        '  ' + id.padEnd(ancho + 2) + v.toLocaleString('es-ES')).join('\n');
    },

    /** La tienda del juego que tengas delante: ver, comprar uno o comprarlo todo. */
    tienda(que){
      const raiz = Arcade.experiencia.activa();
      const id = raiz && raiz.id && raiz.id.indexOf('pantalla-') === 0
        ? raiz.id.slice(9)
        : Object.keys(Arcade.tienda.juegos)[0];
      const t = id && Arcade.tienda.juegos[id];
      if (!t) return 'Entra en un juego para ver su tienda.';

      if (que === 'todo'){
        let n = 0, gasto = 0;
        // Se compra en rondas: cada compra encarece la siguiente, así que hay
        // que volver a mirar los precios hasta que no quepa nada más.
        for (let vuelta = 0; vuelta < 60; vuelta++){
          let algo = false;
          for (const art of t.articulos){
            if (art.tipo === 'accion') continue;
            const r = Arcade.tienda.comprar(id, art.id);
            if (r.ok){ n++; gasto += r.coste; algo = true; }
          }
          if (!algo) break;
        }
        Arcade.admin.avisarCambio();
        return n ? 'Compradas ' + n + ' mejoras en ' + t.nombre + ' por ' +
                   gasto.toLocaleString('es-ES') + ' NEXO-COINS.'
                 : 'No se pudo comprar nada: o está todo al máximo o no llega la cartera.';
      }

      if (que){
        const r = Arcade.tienda.comprar(id, que);
        Arcade.admin.avisarCambio();
        return r.ok ? '✅ ' + r.art.nombre + ' · -' + r.coste.toLocaleString('es-ES')
                    : r.motivo;
      }

      return t.nombre + '\n' + t.articulos.filter(a => a.tipo !== 'accion').map(a => {
        const n = Arcade.tienda.nivelDe(id, a);
        const max = a.max || 1;
        return '  ' + a.id.padEnd(12) + (n >= max ? 'al máximo' :
               Arcade.tienda.precio(a, n).toLocaleString('es-ES') + ' 💎').padEnd(14) +
               a.nombre;
      }).join('\n') + '\n\nUso: tienda <artículo>  ·  tienda todo';
    },

    /** Volumen general, de 0 a 100. Sin argumento, lo dice. */
    sonido(n){
      if (n === undefined)
        return Sonido.silencio ? 'En silencio.'
             : 'Volumen al ' + Math.round(Sonido.volumen * 100) + ' %.';
      const v = Math.max(0, Math.min(100, parseInt(n, 10)));
      if (!isFinite(v)) return 'Uso: sonido <0-100>';
      Sonido.volumen = v / 100;
      Sonido.silencio = v === 0;
      Arcade.experiencia.guardarSonido();
      return v ? 'Volumen al ' + v + ' %.' : 'Silencio.';
    },

    /** Cámara lenta o acelerada: multiplica el paso del tiempo de todos los juegos. */
    ritmo(x){
      if (x === undefined) return 'El tiempo va a x' + Arcade.ritmo + '. Uso: ritmo <0.1-5>';
      const v = Math.max(0.05, Math.min(5, parseFloat(x)));
      if (!isFinite(v)) return 'Uso: ritmo <0.1-5>   (1 es lo normal)';
      Arcade.ritmo = v;
      return v < 1 ? 'Cámara lenta a x' + v + '.'
           : v > 1 ? 'Todo acelerado a x' + v + '.' : 'Ritmo normal.';
    },

    /** Qué pantalla está abierta y cuáles hay. */
    pantalla(){
      const raiz = Arcade.experiencia.activa();
      const juegos = [...document.querySelectorAll('[data-juego]')].map(e => e.dataset.juego);
      return 'Ahora mismo: ' + (raiz && raiz.id ? raiz.id : 'la portada') +
        (juegos.length ? '\nHay ' + juegos.length + ' juegos: ' + juegos.join(', ') : '');
    },

    /** Busca juegos por nombre y, si solo hay uno, entra. */
    buscar(...palabras){
      const q = palabras.join(' ').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (!q) return 'Uso: buscar <texto>';
      const cartas = [...document.querySelectorAll('[data-juego]')];
      const hallados = cartas.filter(c => (c.dataset.busca || c.dataset.juego).includes(q));
      if (!hallados.length) return 'Nada que encaje con "' + q + '".';
      if (hallados.length === 1){
        hallados[0].click();
        return 'Entrando en ' + hallados[0].dataset.juego + '…';
      }
      return hallados.map(c => '  ' + c.dataset.juego).join('\n') +
             '\nAfina la búsqueda o usa "ir <juego>".';
    },

    /** Sube de temporada: libera los códigos y repone la cartera. */
    temporada(){
      Almacen.borrar('arcade_temporada');
      const r = Arcade.temporada.aplicar();
      Arcade.admin.avisarCambio();
      return r ? 'Temporada ' + Arcade.temporada.ACTUAL + ' repartida: códigos libres y ' +
                 'cartera en ' + Arcade.fichas.saldo().toLocaleString('es-ES') + '.'
               : 'Ya estabas al día.';
    },

    /** Qué hay guardado en este navegador. */
    almacen(){
      let claves = [];
      try {
        for (let i = 0; i < localStorage.length; i++){
          const k = localStorage.key(i);
          if (k && k.indexOf('arcade_') === 0)
            claves.push([k.slice(7), (localStorage.getItem(k) || '').length]);
        }
      } catch(e){ return 'Este navegador no deja leer lo guardado.'; }
      if (!claves.length) return 'No hay nada guardado todavía.';
      claves.sort((a, b) => b[1] - a[1]);
      const total = claves.reduce((s, c) => s + c[1], 0);
      const ancho = Math.max(...claves.map(c => c[0].length));
      return claves.slice(0, 24).map(([k, n]) =>
        '  ' + k.padEnd(ancho + 2) + n + ' car.').join('\n') +
        '\n' + claves.length + ' claves · ' + (total / 1024).toFixed(1) + ' KB en total';
    },

    /** Copia de seguridad de todo el progreso, en una línea. */
    exportar(){
      const copia = {};
      try {
        for (let i = 0; i < localStorage.length; i++){
          const k = localStorage.key(i);
          if (k && k.indexOf('arcade_') === 0) copia[k] = localStorage.getItem(k);
        }
      } catch(e){ return 'Este navegador no deja leer lo guardado.'; }
      const txt = JSON.stringify(copia);
      // Se deja también en el portapapeles si el navegador lo permite
      try { navigator.clipboard && navigator.clipboard.writeText(txt); } catch(e){}
      return 'Copia de ' + Object.keys(copia).length + ' claves (ya está en el portapapeles):\n' + txt;
    },

    /** Restaura una copia hecha con exportar. */
    importar(...trozos){
      const txt = trozos.join(' ').trim();
      if (!txt) return 'Uso: importar <el texto que dio exportar>';
      let datos;
      try { datos = JSON.parse(txt); } catch(e){ return 'Eso no es una copia válida.'; }
      let n = 0;
      Object.keys(datos).forEach(k => {
        if (k.indexOf('arcade_') !== 0) return;
        Almacen.escribir(k, datos[k]); n++;
      });
      Arcade.perfil.cache = null;
      Arcade.admin.avisarCambio();
      return 'Restauradas ' + n + ' claves. Recarga la página para verlo todo.';
    },

    /** Contador de cuadros por segundo, en una esquina. */
    fps(){
      const viejo = document.getElementById('fpsAdmin');
      if (viejo){ viejo.remove(); return 'Contador de FPS apagado.'; }
      const d = document.createElement('div');
      d.id = 'fpsAdmin';
      d.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:200;' +
        'font:700 12px "Courier New",monospace;color:#7dffb0;background:rgba(0,0,0,.65);' +
        'border:1px solid rgba(0,255,102,.3);border-radius:8px;padding:5px 10px;' +
        'pointer-events:none';
      document.body.appendChild(d);
      let n = 0, t0 = performance.now();
      const tic = () => {
        if (!document.getElementById('fpsAdmin')) return;
        n++;
        const ahora = performance.now();
        if (ahora - t0 >= 500){
          d.textContent = Math.round(n * 1000 / (ahora - t0)) + ' FPS · x' + Arcade.ritmo;
          n = 0; t0 = ahora;
        }
        requestAnimationFrame(tic);
      };
      requestAnimationFrame(tic);
      return 'Contador de FPS encendido. Vuelve a escribir fps para quitarlo.';
    },

    /** Vacía lo escrito en la consola. */
    limpiar(){
      const s = document.querySelector('.capaAdmin .salidaAdmin');
      if (s) s.textContent = '';
      return 'Consola limpia.';
    },

    /** Borra TODO el progreso. Pide confirmación a propósito. */
    reiniciar(seguro){
      if (seguro !== 'si')
        return '⚠️ Esto borra partidas, récords, fichas, códigos y tiendas.\n' +
               'Si de verdad quieres: reiniciar si';
      let n = 0;
      try {
        const claves = [];
        for (let i = 0; i < localStorage.length; i++){
          const k = localStorage.key(i);
          if (k && k.indexOf('arcade_') === 0) claves.push(k);
        }
        claves.forEach(k => { Almacen.borrar(k); n++; });
      } catch(e){}
      Arcade.perfil.cache = null;
      Arcade.admin.avisarCambio();
      return 'Borradas ' + n + ' claves. Recarga la página.';
    },

    /** Como "todo", pero además vacía la tienda del juego que tengas abierto. */
    dios(){
      const partes = [Arcade.admin.COMANDOS.todo()];
      const compras = Arcade.admin.COMANDOS.tienda('todo');
      if (compras.indexOf('Compradas') === 0) partes.push(compras);
      Sonido.fx('victoria');
      return partes.join('\n');
    },

    /** Trucos del juego que tengas delante. Sin argumentos, los lista. */
    juego(truco, ...args){
      const j = Arcade.admin.juegoActivo();
      if (!j){
        const n = Object.keys(Arcade.admin.juegos).length;
        return 'Esto se usa dentro de un juego. Entra en uno y vuelve a probar.' +
               (n ? '\nJuegos con trucos registrados: ' + n + '.' : '');
      }
      const nombres = Object.keys(j.trucos);
      if (!truco){
        return j.nombre + ' — trucos disponibles:\n' +
               nombres.map(n => '  juego ' + n + '   ' + (j.trucos[n].que || '')).join('\n');
      }
      const t = j.trucos[truco.toLowerCase()];
      if (!t) return 'En ' + j.nombre + ' no existe "' + truco + '". Hay: ' + nombres.join(', ');
      try { return t.fn.apply(null, args) || 'Hecho.'; }
      catch(e){ return 'Ha fallado: ' + e.message; }
    },

    /** Atajo: lista los juegos que tienen trucos registrados. */
    trucos(){
      const j = Arcade.admin.juegos;
      const ids = Object.keys(j).sort();
      if (!ids.length)
        return 'Todavía no hay ninguno: cada juego apunta sus trucos al entrar en él,\n' +
               'no al cargar el arcade. Entra en un juego y vuelve a escribir trucos.';
      return ids.map(id => '  ' + id.padEnd(12) + j[id].nombre + '  (' +
                           Object.keys(j[id].trucos).join(', ') + ')').join('\n');
    },

    salir(){
      Arcade.admin.desactivar();
      return 'Modo administrador apagado. Teclea el código otra vez para encenderlo.';
    }
  },

  /** Repinta la portada si está a la vista, para que se note el cambio. */
  avisarCambio(){
    if (typeof window.refrescarPortada === 'function'){
      try { window.refrescarPortada(); } catch(e){}
    }
  },

  /**
   * Cuánto se parecen dos palabras, de 0 a 1. Es la distancia de edición
   * normalizada: sirve para adivinar qué quiso escribir quien se equivoca.
   */
  parecido(a, b){
    if (a === b) return 1;
    const m = a.length, n = b.length;
    if (!m || !n) return 0;
    let fila = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++){
      let anterior = fila[0];
      fila[0] = i;
      for (let j = 1; j <= n; j++){
        const tmp = fila[j];
        fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1,
                           anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
        anterior = tmp;
      }
    }
    return 1 - fila[n] / Math.max(m, n);
  },

  /** Los nombres que valen ahora mismo, para el autocompletado con Tab. */
  sugerencias(linea){
    const partes = linea.split(/\s+/);
    if (partes.length <= 1)
      return Object.keys(this.COMANDOS).filter(n => n.indexOf(partes[0].toLowerCase()) === 0);
    if (partes[0].toLowerCase() === 'juego'){
      const j = this.juegoActivo();
      if (!j) return [];
      return Object.keys(j.trucos)
        .filter(n => n.indexOf(partes[1].toLowerCase()) === 0)
        .map(n => 'juego ' + n);
    }
    if (partes[0].toLowerCase() === 'ayuda')
      return Object.keys(this.COMANDOS)
        .filter(n => n.indexOf(partes[1].toLowerCase()) === 0)
        .map(n => 'ayuda ' + n);
    if (partes[0].toLowerCase() === 'ir')
      return [...document.querySelectorAll('[data-juego]')]
        .map(e => e.dataset.juego)
        .filter(n => n.indexOf(partes[1].toLowerCase()) === 0)
        .map(n => 'ir ' + n);
    return [];
  },

  ejecutar(linea){
    const partes = String(linea || '').trim().split(/\s+/);
    const nombre = (partes.shift() || '').toLowerCase();
    if (!nombre) return '';
    const cmd = this.COMANDOS[nombre];
    if (!cmd){
      // Se busca el comando más parecido para no dejar al jugador a ciegas
      const parecido = Object.keys(this.COMANDOS)
        .map(n => [n, this.parecido(n, nombre)])
        .filter(x => x[1] > 0.45)
        .sort((a, b) => b[1] - a[1])[0];
      return 'No conozco "' + nombre + '".' +
             (parecido ? ' ¿Querías decir "' + parecido[0] + '"?' : '') +
             '\nEscribe ayuda para ver la lista.';
    }
    try { return cmd.apply(null, partes) || 'Hecho.'; }
    catch(e){ return 'Ha fallado: ' + e.message; }
  },

  montar(){
    if (!this.activo() || document.querySelector('.capaAdmin')) return;
    const capa = document.createElement('div');
    capa.className = 'capaAdmin';
    capa.innerHTML =
      '<div class="cajaAdmin" role="dialog" aria-label="Consola de administración">' +
        '<h2>👑 CONSOLA DEL CREADOR</h2>' +
        '<pre class="salidaAdmin"></pre>' +
        '<div class="filaAdmin">' +
          '<span class="promptAdmin">&gt;</span>' +
          '<input class="entradaAdmin" autocomplete="off" spellcheck="false" ' +
                 'aria-label="Comando" placeholder="ayuda">' +
        '</div>' +
        '<div class="pieAdmin">Tab autocompleta · ↑ ↓ historial · Esc cierra · ' +
          'para volver a abrirla, teclea el código en cualquier pantalla</div>' +
      '</div>';
    document.body.appendChild(capa);

    const salida = capa.querySelector('.salidaAdmin');
    const entrada = capa.querySelector('.entradaAdmin');
    const historial = [];
    let cursor = 0;

    const imprimir = txt => {
      salida.textContent += (salida.textContent ? '\n' : '') + txt;
      salida.scrollTop = salida.scrollHeight;
    };
    imprimir('Modo administrador activo. Escribe ayuda para ver los comandos.');

    entrada.addEventListener('keydown', ev => {
      ev.stopPropagation();
      if (ev.key === 'Enter'){
        const linea = entrada.value;
        if (!linea.trim()) return;
        historial.push(linea); cursor = historial.length;
        imprimir('> ' + linea);
        imprimir(this.ejecutar(linea));
        entrada.value = '';
      } else if (ev.key === 'ArrowUp'){
        ev.preventDefault();
        if (cursor > 0) entrada.value = historial[--cursor] || '';
      } else if (ev.key === 'ArrowDown'){
        ev.preventDefault();
        cursor = Math.min(historial.length, cursor + 1);
        entrada.value = historial[cursor] || '';
      } else if (ev.key === 'Tab'){
        ev.preventDefault();
        const opciones = this.sugerencias(entrada.value);
        if (!opciones.length) return;
        if (opciones.length === 1){
          entrada.value = opciones[0] + ' ';
        } else {
          // Se completa hasta donde todas coinciden y se enseñan las opciones
          let comun = opciones[0];
          for (const o of opciones)
            while (o.indexOf(comun) !== 0) comun = comun.slice(0, -1);
          if (comun.length > entrada.value.length) entrada.value = comun;
          imprimir(opciones.map(o => '  ' + o).join('\n'));
        }
      } else if (ev.key === 'Escape'){
        this.cerrar();
      }
    });
    capa.addEventListener('click', ev => { if (ev.target === capa) this.cerrar(); });
    this._entrada = entrada;
  },

  /**
   * La puerta de verdad: teclear el código en cualquier pantalla enciende el
   * modo y abre la consola. No hay ningún botón ni pista a la vista, que es
   * justo lo que se le pide a un modo secreto: si se ve, ya no lo es.
   */
  _tecleado: '',
  escuchaSecreta(ev){
    // No se escucha mientras se escribe en una casilla: ahí el código se canjea
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName || '')) return;
    if (!/^[0-9]$/.test(ev.key)) return;
    this._tecleado = (this._tecleado + ev.key).slice(-8);
    if (this._tecleado.indexOf(String(Arcade.codigos.ADMIN)) === -1) return;
    this._tecleado = '';
    if (!this.activo()) this.activar();
    this.abrir();
  },

  abrir(){
    if (!this.activo()) return;
    this.montar();
    const capa = document.querySelector('.capaAdmin');
    if (!capa) return;
    capa.classList.add('visible');
    setTimeout(() => this._entrada && this._entrada.focus(), 30);
  },
  cerrar(){
    const capa = document.querySelector('.capaAdmin');
    if (capa) capa.classList.remove('visible');
  },
  alternar(){
    const capa = document.querySelector('.capaAdmin');
    capa && capa.classList.contains('visible') ? this.cerrar() : this.abrir();
  }
};

addEventListener('keydown', ev => {
  // Atajos invisibles para quien ya sabe que existe el modo: F9, y
  // Ctrl/Cmd+Shift+A para los teclados sin tecla de función.
  if (ev.key === 'F9' ||
      ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && (ev.key === 'A' || ev.key === 'a'))){
    ev.preventDefault();
    Arcade.admin.alternar();
  }
  Arcade.admin.escuchaSecreta(ev);
});

/* ==========================================================
   Experiencia común a los 25 juegos
   Tres cosas que antes faltaban en todos: poder volver a leer
   las instrucciones sin reiniciar, bajar el volumen sin quedarte
   mudo del todo, y poder pausar sin perder la partida.
   ========================================================== */
Arcade.experiencia = {
  MARCA: 'arcade_sonido',

  /** El silencio y el volumen se recuerdan entre juegos y entre visitas. */
  cargarSonido(){
    const g = Arcade.leerTexto(this.MARCA.replace('arcade_', ''), null);
    if (!g) return;
    try {
      const o = JSON.parse(g);
      Sonido.silencio = !!o.silencio;
      Sonido.volumen = limitar(typeof o.volumen === 'number' ? o.volumen : 1, 0, 1);
    } catch(e){}
  },
  guardarSonido(){
    Arcade.escribir('sonido', JSON.stringify({
      silencio: Sonido.silencio, volumen: Sonido.volumen
    }));
  },

  // ---- Pausa ----
  parado: false,
  /** El juego visible en este momento, o null si no hay ninguno. */
  activa(){
    const pantallas = document.querySelectorAll('.pantalla');
    if (!pantallas.length) return document.body;
    for (const p of pantallas)
      if (p.classList.contains('activa') && p.id !== 'pantalla-portada') return p;
    return null;
  },
  /** ¿Es un juego de acción, de los que no perdonan que mires a otro lado? */
  esDeAccion(raiz){
    return !!(raiz && raiz.querySelector('[data-ritmo="accion"]'));
  },
  pausar(motivo){
    const raiz = this.activa();
    // Solo se pausan los juegos de acción. En los de apuesta sería una trampa:
    // congelar el Aviator a 40x y cobrar con calma no es pausar, es hacer caja.
    if (!raiz || this.parado || !this.esDeAccion(raiz)) return;
    this.parado = true;
    Sonido.pararMotor();
    let capa = raiz.querySelector('.capaPausa');
    if (!capa){
      capa = document.createElement('div');
      capa.className = 'capaPausa';
      capa.innerHTML = '<div class="cajaPausa"><div class="icono">⏸</div>' +
        '<div class="tit">En pausa</div><div class="pie"></div>' +
        '<button class="primario">▶ Seguir jugando</button></div>';
      capa.addEventListener('click', () => this.reanudar());
      raiz.appendChild(capa);
    }
    capa.querySelector('.pie').textContent = motivo || 'Pulsa en cualquier sitio o Esc para seguir.';
    capa.classList.add('visible');
  },
  reanudar(){
    if (!this.parado) return;
    this.parado = false;
    document.querySelectorAll('.capaPausa.visible').forEach(c => c.classList.remove('visible'));
  },
  alternarPausa(){ this.parado ? this.reanudar() : this.pausar(); },

  // ---- Panel de ayuda y ajustes ----
  /** Monta el botón ❓ y el panel en todas las barras que encuentre. */
  montar(){
    this.cargarSonido();
    document.querySelectorAll('.barra, #barraSuperior, [id^="barraSuperior"]').forEach(barra => {
      if (barra.dataset.montada) return;
      barra.dataset.montada = '1';
      const raiz = barra.closest('.pantalla') || document.body;

      const b = document.createElement('button');
      b.className = 'btnAyuda';
      b.type = 'button';
      b.title = 'Ayuda y ajustes';
      b.setAttribute('aria-label', 'Ayuda y ajustes');
      b.textContent = '❓';
      b.onclick = () => this.abrirPanel(raiz);
      const son = barra.querySelector('button[id^="btnSonido"], button[title="Sonido"]');
      son ? barra.insertBefore(b, son) : barra.appendChild(b);
    });
    // El botón de sonido de cada juego también guarda la preferencia
    document.addEventListener('click', ev => {
      if (ev.target.closest('button[title="Sonido"]')) setTimeout(() => this.guardarSonido(), 0);
    });
  },

  abrirPanel(raiz){
    Sonido.activar();
    let capa = raiz.querySelector('.capaAyuda');
    if (!capa){
      capa = document.createElement('div');
      capa.className = 'capaAyuda';
      const inst = raiz.querySelector('.instrucciones');
      capa.innerHTML =
        '<div class="cajaAyuda" role="dialog" aria-label="Ayuda y ajustes">' +
          '<h2>❓ Ayuda y ajustes</h2>' +
          '<div class="cuerpoAyuda"></div>' +
          '<div class="ajustes">' +
            '<label for="volArcade">🔊 Volumen</label>' +
            '<input type="range" id="volArcade" min="0" max="100" step="5">' +
            '<b class="volTxt"></b>' +
          '</div>' +
          '<div class="atajos">Atajos: <kbd>Esc</kbd> o <kbd>P</kbd> pausan · ' +
          '<kbd>?</kbd> abre esta ayuda</div>' +
          '<button class="primario cerrarAyuda">Volver al juego</button>' +
        '</div>';
      const cuerpo = capa.querySelector('.cuerpoAyuda');
      if (inst) cuerpo.appendChild(inst.cloneNode(true));
      else cuerpo.innerHTML = '<p class="sinInstrucciones">Este juego se explica solo: ' +
                              'mira los rótulos de la pantalla y prueba.</p>';

      const rango = capa.querySelector('#volArcade');
      const txt = capa.querySelector('.volTxt');
      const pinta = () => {
        rango.value = Math.round(Sonido.volumen * 100);
        txt.textContent = Sonido.silencio ? 'silencio' : Math.round(Sonido.volumen * 100) + ' %';
      };
      rango.addEventListener('input', () => {
        Sonido.volumen = rango.value / 100;
        if (Sonido.volumen > 0) Sonido.silencio = false;
        pinta();
        this.guardarSonido();
      });
      rango.addEventListener('change', () => Sonido.fx('clic'));
      capa._pinta = pinta;
      capa.addEventListener('click', ev => {
        if (ev.target === capa || ev.target.closest('.cerrarAyuda')) this.cerrarPanel(raiz);
      });
      raiz.appendChild(capa);
    }
    capa._pinta();
    capa.classList.add('visible');
  },
  cerrarPanel(raiz){
    const capa = raiz.querySelector('.capaAyuda');
    if (capa) capa.classList.remove('visible');
  }
};

/* ==========================================================
   TIENDA — gastar NEXO-COINS dentro de cada juego
   Cada juego declara sus artículos desde su propio script, igual que los
   trucos de administración: es el único sitio donde su estado está a mano.
   Lo comprado se guarda por juego y se lee con Arcade.tienda.nivel().
   ========================================================== */
Arcade.tienda = {
  juegos: {},

  /**
   * @param id        el mismo id que usa la tarjeta de la portada
   * @param nombre    cómo se llama la tienda ("Bazar de la mina")
   * @param articulos lista de { id, icono, nombre, desc, precio, max, factor,
   *                             etiqueta(nivel), bloqueado() }
   * @param alCambiar se llama tras cada compra, para repintar el juego
   */
  registrar(id, nombre, articulos, alCambiar){
    this.juegos[id] = { id, nombre, articulos, alCambiar };
    this.montarBoton(id);
  },

  clave(id){ return 'tienda_' + id; },
  compras(id){
    try { return JSON.parse(Arcade.leerTexto(this.clave(id), '{}')) || {}; }
    catch(e){ return {}; }
  },
  /**
   * Cuántas veces se ha comprado un artículo. 0 = ninguna.
   * Un artículo puede declarar `bolsa` para guardarse en un cajón compartido:
   * el paño de la mesa lo compras una vez y lo ves en las seis mesas.
   */
  nivel(idJuego, idArt){ return this.compras(idJuego)[idArt] || 0; },
  nivelDe(idJuego, art){ return this.nivel(art.bolsa || idJuego, art.id); },
  /** ¿Está comprado? Para los artículos de una sola vez. */
  tiene(idJuego, idArt){ return this.nivel(idJuego, idArt) > 0; },

  /**
   * Precio del siguiente nivel. Cada compra encarece la siguiente por su
   * factor: sin eso, el primer millón de NEXO-COINS compraría la partida
   * entera y el juego se acabaría ahí.
   */
  precio(art, nivel){
    return Math.ceil(art.precio * Math.pow(art.factor || 1, nivel || 0));
  },
  agotado(idJuego, art){
    return this.nivelDe(idJuego, art) >= (art.max || 1);
  },

  comprar(idJuego, idArt){
    const j = this.juegos[idJuego];
    if (!j) return { ok:false, motivo:'Esa tienda no existe.' };
    const art = j.articulos.find(a => a.id === idArt);
    if (!art) return { ok:false, motivo:'Ese artículo no existe.' };
    const bolsa = art.bolsa || idJuego;
    const n = this.nivel(bolsa, idArt);
    if (n >= (art.max || 1)) return { ok:false, motivo:'Ya lo tienes al máximo.' };
    if (art.bloqueado){
      const razon = art.bloqueado(n);
      if (razon) return { ok:false, motivo: razon };
    }
    const coste = this.precio(art, n);
    if (Arcade.fichas.saldo() < coste)
      return { ok:false, motivo:'Te faltan ' +
        (coste - Arcade.fichas.saldo()).toLocaleString('es-ES') + ' NEXO-COINS.' };

    Arcade.fichas.ajustar(-coste);
    const compras = this.compras(bolsa);
    compras[idArt] = n + 1;
    Arcade.escribir(this.clave(bolsa), JSON.stringify(compras));
    if (j.alCambiar) { try { j.alCambiar(idArt, n + 1); } catch(e){} }
    return { ok:true, coste, nivel: n + 1, art };
  },

  /**
   * Seguro de apuesta: devuelve parte de lo perdido en una ronda. No toca el
   * sorteo ni la ventaja de la casa —la matemática del juego sigue siendo la
   * misma—, solo amortigua la caída de quien se lo ha pagado.
   */
  cobrarSeguro(idJuego, apostado){
    const p = this.nivel(idJuego, 'seguro') * 0.12;
    if (!(p > 0) || !(apostado > 0)) return 0;
    const devuelto = Math.floor(apostado * p);
    if (devuelto > 0) Arcade.fichas.ajustar(devuelto);
    return devuelto;
  },
  /** Artículo de seguro listo para meter en la lista de cualquier juego de apuesta. */
  ARTICULO_SEGURO: {
    id:'seguro', icono:'🛟', nombre:'Seguro de apuesta', precio:4000, max:5, factor:2.2,
    etiqueta: n => n ? 'Te devuelven el ' + (n * 12) + ' % de lo que pierdas' : 'Sin comprar',
    desc:'Cuando pierdas una ronda recuperas parte de la apuesta. No cambia las ' +
         'probabilidades del juego: solo hace la caída más blanda.'
  },

  /**
   * Artículos que comparten las mesas de casino. Se compran una vez y se ven
   * en las seis: el paño es de la sala, no de un juego. Es un getter porque
   * Mesa se define más abajo en este mismo archivo.
   */
  get MESA(){
    return [
      { id:'pano', bolsa:'casino', icono:'🎴', nombre:'Paño de la sala',
        precio:3000, max:4, factor:2,
        etiqueta: n => 'Desbloqueados: ' +
          Mesa.PIELES.slice(0, n + 1).map(p => p.nombre).join(', '),
        desc:'Otro color para el tapete. Vale para todas las mesas del casino: ' +
             'blackjack, póker, bacarrá, ruleta, dados y billar.' },
      { id:'panoCambiar', tipo:'accion', icono:'🔁', nombre:'Cambiar de paño',
        boton:'Siguiente',
        etiqueta: () => 'Ahora: ' + Mesa.PIELES[Mesa.panoElegido()].nombre,
        bloqueado: () => Mesa.panosDesbloqueados() > 1 ? '' : 'Compra un paño primero',
        desc:'Va pasando por los paños que tengas desbloqueados.',
        accion(){
          Mesa.elegirPano(Mesa.panoElegido() + 1);
          return '🎴 Paño: ' + Mesa.PIELES[Mesa.panoElegido()].nombre;
        } }
    ];
  },

  // ---------- Botón y panel ----------
  /** La barra del juego, tanto en página suelta como dentro de arcade.html. */
  barraDe(id){
    return document.querySelector('#pantalla-' + id + ' .barra') ||
           document.querySelector('#pantalla-' + id + ' [id^="barraSuperior"]') ||
           document.querySelector('.barra') ||
           document.querySelector('[id^="barraSuperior"]');
  },
  montarBoton(id){
    const barra = this.barraDe(id);
    if (!barra || barra.querySelector('.btnTienda')) return;
    const b = document.createElement('button');
    b.className = 'btnTienda';
    b.type = 'button';
    b.title = 'Tienda';
    b.setAttribute('aria-label', 'Tienda del juego');
    b.textContent = '🛒';
    b.onclick = () => this.abrir(id);
    const ayuda = barra.querySelector('.btnAyuda');
    ayuda ? barra.insertBefore(b, ayuda) : barra.appendChild(b);
  },

  abrir(id){
    const j = this.juegos[id];
    if (!j) return;
    Sonido.activar();
    const raiz = document.getElementById('pantalla-' + id) ||
                 Arcade.experiencia.activa() || document.body;
    let capa = raiz.querySelector('.capaTienda');
    if (!capa){
      capa = document.createElement('div');
      capa.className = 'capaTienda';
      capa.innerHTML =
        '<div class="cajaTienda" role="dialog" aria-label="Tienda">' +
          '<h2>🛒 <span class="tituloTienda"></span></h2>' +
          '<div class="carteraTienda">Tienes <b>0</b> NEXO-COINS</div>' +
          '<div class="avisoTienda" role="status"></div>' +
          '<div class="rejillaTienda"></div>' +
          '<button class="primario cerrarTienda">Volver al juego</button>' +
        '</div>';
      capa.addEventListener('click', ev => {
        if (ev.target === capa || ev.target.closest('.cerrarTienda')) this.cerrar(raiz);
      });
      raiz.appendChild(capa);
    }
    capa.querySelector('.tituloTienda').textContent = j.nombre;
    capa.dataset.juego = id;
    this.pintar(capa, id);
    capa.classList.add('visible');
  },
  cerrar(raiz){
    const capa = raiz.querySelector('.capaTienda');
    if (capa) capa.classList.remove('visible');
  },

  avisar(capa, txt, bien){
    const a = capa.querySelector('.avisoTienda');
    a.textContent = txt;
    a.className = 'avisoTienda ' + (bien ? 'bien' : 'mal') + ' visible';
    clearTimeout(a._t);
    a._t = setTimeout(() => a.classList.remove('visible'), 2600);
  },

  pintar(capa, id){
    const j = this.juegos[id];
    const saldo = Arcade.fichas.saldo();
    capa.querySelector('.carteraTienda b').textContent = saldo.toLocaleString('es-ES');
    const rejilla = capa.querySelector('.rejillaTienda');
    rejilla.innerHTML = j.articulos.map(art => {
      // Los artículos de acción no se venden: son un botón que hace algo con
      // lo que ya tienes, como cambiar entre los paños desbloqueados.
      if (art.tipo === 'accion'){
        const razon = art.bloqueado ? art.bloqueado(0) : '';
        return '<article class="articulo accion">' +
          '<div class="icoArt">' + (art.icono || '🔁') + '</div>' +
          '<div class="datosArt"><b>' + art.nombre + '</b>' +
            (art.etiqueta ? '<span class="nivelArt">' + art.etiqueta(0) + '</span>' : '') +
            '<p>' + art.desc + '</p></div>' +
          '<div class="accionArt">' + (razon
            ? '<span class="bloqueado">' + razon + '</span>'
            : '<button class="hacer" data-art="' + art.id + '">' + (art.boton || 'Cambiar') + '</button>') +
          '</div></article>';
      }
      const n = this.nivelDe(id, art);
      const max = art.max || 1;
      const lleno = n >= max;
      const coste = this.precio(art, n);
      const razon = !lleno && art.bloqueado ? art.bloqueado(n) : '';
      const puedo = !lleno && !razon && saldo >= coste;
      const estado = lleno
        ? '<span class="tenido">' + (max > 1 ? 'Al máximo · ' + n + '/' + max : 'Comprado') + '</span>'
        : razon
          ? '<span class="bloqueado">' + razon + '</span>'
          : '<button class="comprar' + (puedo ? '' : ' sinFondos') + '" data-art="' + art.id + '">' +
            '💎 ' + coste.toLocaleString('es-ES') + '</button>';
      return '<article class="articulo' + (lleno ? ' completo' : '') + '">' +
        '<div class="icoArt">' + (art.icono || '🎁') + '</div>' +
        '<div class="datosArt">' +
          '<b>' + art.nombre + '</b>' +
          (max > 1 ? '<span class="nivelArt">' +
            (art.etiqueta ? art.etiqueta(n) : n + ' / ' + max) + '</span>' : '') +
          '<p>' + art.desc + '</p>' +
        '</div>' +
        '<div class="accionArt">' + estado + '</div>' +
      '</article>';
    }).join('');

    rejilla.querySelectorAll('.hacer').forEach(b => {
      b.onclick = () => {
        const art = j.articulos.find(a => a.id === b.dataset.art);
        let txt = '';
        try { txt = art.accion(); } catch(e){ txt = 'Ha fallado: ' + e.message; }
        Sonido.fx('clic');
        if (txt) this.avisar(capa, txt, true);
        this.pintar(capa, id);
      };
    });
    rejilla.querySelectorAll('.comprar').forEach(b => {
      b.onclick = () => {
        const r = this.comprar(id, b.dataset.art);
        if (!r.ok){ Sonido.fx('error'); this.avisar(capa, r.motivo, false); return; }
        Sonido.fx('moneda');
        this.avisar(capa, '✅ ' + r.art.nombre + ' · -' +
                    r.coste.toLocaleString('es-ES') + ' NEXO-COINS', true);
        this.pintar(capa, id);
        if (typeof window.refrescarPortada === 'function'){
          try { window.refrescarPortada(); } catch(e){}
        }
      };
    });
  }
};

// Teclas y foco: valen igual en una página suelta que dentro de arcade.html
addEventListener('keydown', ev => {
  const escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test((ev.target.tagName || ''));
  if (escribiendo) return;
  const raiz = Arcade.experiencia.activa();
  const ayudaAbierta = raiz && raiz.querySelector('.capaAyuda.visible');
  if (ev.key === '?' || (ev.key === 'h' && !ev.ctrlKey && !ev.metaKey)){
    ev.preventDefault();
    ayudaAbierta ? Arcade.experiencia.cerrarPanel(raiz) : raiz && Arcade.experiencia.abrirPanel(raiz);
    return;
  }
  if (ev.key === 'Escape' || ev.key === 'p' || ev.key === 'P'){
    if (ayudaAbierta){ Arcade.experiencia.cerrarPanel(raiz); return; }
    ev.preventDefault();
    Arcade.experiencia.alternarPausa();
  }
});

// Solo los juegos de acción se pausan solos al mirar a otro lado: un idle
// tiene que seguir produciendo, para eso está.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  const raiz = Arcade.experiencia.activa();
  if (Arcade.experiencia.esDeAccion(raiz))
    Arcade.experiencia.pausar('Saliste de la pestaña. Pulsa para seguir donde lo dejaste.');
});

const arrancarComun = () => { Arcade.experiencia.montar(); Arcade.admin.montar(); };
if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', arrancarComun);
else arrancarComun();

// ---------- Ayudas de dibujo ----------
const suavizar = (a, b, t) => a + (b - a) * t;
const facilSalida = t => 1 - Math.pow(1 - t, 3);
const facilEntrada = t => t * t * t;

// Sistema de partículas reutilizable
class Particulas {
  constructor(maximo = 400){ this.lista = []; this.maximo = maximo; }
  emitir(n, cfg){
    for (let i = 0; i < n && this.lista.length < this.maximo; i++){
      const ang = cfg.ang !== undefined ? cfg.ang + azar(-1, 1) * (cfg.abanico || Math.PI) : azar(0, 6.283);
      const v = azar(cfg.velMin || 40, cfg.velMax || 200);
      this.lista.push({
        x: cfg.x + azar(-(cfg.disp || 0), cfg.disp || 0),
        y: cfg.y + azar(-(cfg.disp || 0), cfg.disp || 0),
        vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
        vida: azar(cfg.vidaMin || 0.3, cfg.vidaMax || 0.8), inicial: 1,
        r: azar(cfg.rMin || 2, cfg.rMax || 5),
        color: Array.isArray(cfg.color) ? elegir(cfg.color) : cfg.color,
        gravedad: cfg.gravedad === undefined ? 400 : cfg.gravedad,
        roce: cfg.roce === undefined ? 0.99 : cfg.roce,
        brillo: !!cfg.brillo, estela: !!cfg.estela
      });
      const p = this.lista[this.lista.length - 1];
      p.inicial = p.vida;
    }
  }
  actualizar(dt){
    for (let i = this.lista.length - 1; i >= 0; i--){
      const p = this.lista[i];
      p.vida -= dt;
      if (p.vida <= 0){ this.lista.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += p.gravedad * dt;
      p.vx *= p.roce; p.vy *= p.roce;
    }
  }
  dibujar(ctx){
    for (const p of this.lista){
      const a = limitar(p.vida / p.inicial, 0, 1);
      ctx.globalAlpha = a;
      if (p.brillo){ ctx.shadowColor = p.color; ctx.shadowBlur = 12; }
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.35 + a * 0.65), 0, 6.283); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }
  get largo(){ return this.lista.length; }
}

// Sacudida de cámara
class Sacudida {
  constructor(){ this.fuerza = 0; }
  golpe(f){ this.fuerza = Math.max(this.fuerza, f); }
  actualizar(dt){ this.fuerza = Math.max(0, this.fuerza - dt * this.fuerza * 6 - dt * 2); }
  aplicar(ctx){
    if (this.fuerza <= 0) return;
    ctx.translate(azar(-1, 1) * this.fuerza, azar(-1, 1) * this.fuerza);
  }
}

/* ==========================================================
   Baraja francesa compartida por Blackjack, Bacarrá y Póker
   Una carta es un número de 0 a 51: palo = n >> 4, valor = n & 15.
   ========================================================== */
const Cartas = {
  PALOS: ['♠', '♥', '♦', '♣'],
  NOMBRES: ['2','3','4','5','6','7','8','9','10','J','Q','K','A'],

  crear(palo, indice){ return palo * 16 + indice; },
  palo(c){ return c >> 4; },
  indice(c){ return c & 15; },                       // 0 = dos … 12 = as
  roja(c){ const p = this.palo(c); return p === 1 || p === 2; },
  nombre(c){ return this.NOMBRES[this.indice(c)]; },
  texto(c){ return this.nombre(c) + this.PALOS[this.palo(c)]; },

  // Baraja de `mazos` barajas, ya mezclada
  baraja(mazos = 1){
    const b = [];
    for (let m = 0; m < mazos; m++)
      for (let p = 0; p < 4; p++)
        for (let i = 0; i < 13; i++) b.push(this.crear(p, i));
    return mezclar(b);
  },

  // ---------- Dibujo ----------
  // Colocación de los símbolos en las cartas numéricas, en coordenadas
  // relativas (0..1). Es la disposición clásica de la baraja francesa.
  PIPS: {
    0:  [[.5,.28],[.5,.72]],
    1:  [[.5,.22],[.5,.5],[.5,.78]],
    2:  [[.3,.25],[.7,.25],[.3,.75],[.7,.75]],
    3:  [[.3,.25],[.7,.25],[.5,.5],[.3,.75],[.7,.75]],
    4:  [[.3,.22],[.7,.22],[.3,.5],[.7,.5],[.3,.78],[.7,.78]],
    5:  [[.3,.22],[.7,.22],[.3,.5],[.7,.5],[.3,.78],[.7,.78],[.5,.36]],
    6:  [[.3,.2],[.7,.2],[.3,.42],[.7,.42],[.3,.64],[.7,.64],[.3,.86],[.7,.86]],
    7:  [[.3,.2],[.7,.2],[.3,.42],[.7,.42],[.3,.64],[.7,.64],[.3,.86],[.7,.86],[.5,.31]],
    8:  [[.3,.18],[.7,.18],[.3,.37],[.7,.37],[.5,.5],[.3,.63],[.7,.63],[.3,.82],[.7,.82]]
  },

  // Retrato esquemático para J, Q y K: sencillo pero reconocible
  _figura(ctx, indice, x, y, an, al, color){
    const cx = x + an / 2, cy = y + al / 2;
    const u = an * 0.01;
    ctx.save();
    ctx.translate(cx, cy);

    // marco interior
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(1, u * 1.2);
    ctx.beginPath();
    ctx.roundRect(-an * 0.29, -al * 0.30, an * 0.58, al * 0.60, an * 0.05);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // cabeza y hombros
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, -al * 0.07, an * 0.115, 0, 6.2832); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-an * 0.21, al * 0.26);
    ctx.quadraticCurveTo(0, al * 0.02, an * 0.21, al * 0.26);
    ctx.closePath(); ctx.fill();

    // tocado propio de cada figura
    if (indice === 11){               // K: corona de tres puntas
      ctx.beginPath();
      ctx.moveTo(-an * 0.16, -al * 0.16);
      ctx.lineTo(-an * 0.11, -al * 0.28);
      ctx.lineTo(-an * 0.05, -al * 0.19);
      ctx.lineTo(0, -al * 0.31);
      ctx.lineTo(an * 0.05, -al * 0.19);
      ctx.lineTo(an * 0.11, -al * 0.28);
      ctx.lineTo(an * 0.16, -al * 0.16);
      ctx.closePath(); ctx.fill();
    } else if (indice === 10){        // Q: diadema redondeada
      ctx.beginPath();
      ctx.ellipse(0, -al * 0.19, an * 0.16, an * 0.055, 0, Math.PI, 0);
      ctx.fill();
      ctx.beginPath(); ctx.arc(0, -al * 0.235, an * 0.035, 0, 6.2832); ctx.fill();
    } else {                          // J: gorro ladeado
      ctx.beginPath();
      ctx.moveTo(-an * 0.17, -al * 0.15);
      ctx.quadraticCurveTo(-an * 0.02, -al * 0.30, an * 0.19, -al * 0.20);
      ctx.lineTo(an * 0.13, -al * 0.13);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },

  /**
   * Dibuja una carta. `carta` a null pinta el dorso.
   * Las medidas van en píxeles del lienzo; los detalles escalan con el ancho,
   * así que la misma función sirve para una carta grande o para una miniatura.
   */
  dibujar(ctx, carta, x, y, an, al, opciones = {}){
    const r = Math.max(3, an * 0.085);
    const tapada = carta === null || carta === undefined;

    ctx.save();
    // sombra proyectada
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = an * 0.18;
    ctx.shadowOffsetY = an * 0.06;
    ctx.beginPath(); ctx.roundRect(x, y, an, al, r);
    ctx.fillStyle = tapada ? '#12224a' : '#fbfcfe';
    ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // recorte a la forma de la carta para todo lo que viene
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x, y, an, al, r);
    ctx.clip();

    if (tapada){
      // dorso: trama de rombos y filete
      const g = ctx.createLinearGradient(x, y, x + an, y + al);
      g.addColorStop(0, '#1b3570'); g.addColorStop(0.5, '#122349'); g.addColorStop(1, '#0c1832');
      ctx.fillStyle = g; ctx.fillRect(x, y, an, al);

      const paso = an * 0.2;
      ctx.strokeStyle = 'rgba(0,240,255,.22)';
      ctx.lineWidth = Math.max(0.6, an * 0.012);
      for (let k = -al; k < an + al; k += paso){
        ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x + k + al, y + al); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + k, y + al); ctx.lineTo(x + k + al, y); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(0,240,255,.5)';
      ctx.lineWidth = Math.max(1, an * 0.028);
      ctx.beginPath();
      ctx.roundRect(x + an * 0.07, y + an * 0.07, an * 0.86, al - an * 0.14, r * 0.7);
      ctx.stroke();
      // rombo central
      ctx.fillStyle = 'rgba(0,240,255,.30)';
      ctx.beginPath();
      ctx.moveTo(x + an / 2, y + al / 2 - an * 0.22);
      ctx.lineTo(x + an / 2 + an * 0.17, y + al / 2);
      ctx.lineTo(x + an / 2, y + al / 2 + an * 0.22);
      ctx.lineTo(x + an / 2 - an * 0.17, y + al / 2);
      ctx.closePath(); ctx.fill();
    } else {
      // cara: papel con un leve degradado y brillo diagonal
      const g = ctx.createLinearGradient(x, y, x, y + al);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e9edf5');
      ctx.fillStyle = g; ctx.fillRect(x, y, an, al);

      const rojo = this.roja(carta);
      const color = opciones.apagada ? '#9aa3b2' : (rojo ? '#d31f3c' : '#14181f');
      const indice = this.indice(carta);
      const nom = this.NOMBRES[indice];
      const pal = this.PALOS[this.palo(carta)];

      // esquinas
      const esquina = (ex, ey, giro) => {
        ctx.save();
        ctx.translate(ex, ey);
        if (giro) ctx.rotate(Math.PI);
        ctx.fillStyle = color;
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.font = '800 ' + (an * 0.235).toFixed(1) + 'px "Segoe UI", system-ui, sans-serif';
        ctx.fillText(nom, 0, 0);
        ctx.font = (an * 0.19).toFixed(1) + 'px serif';
        ctx.fillText(pal, 0, an * 0.21);
        ctx.restore();
      };
      esquina(x + an * 0.145, y + al * 0.155, false);
      esquina(x + an - an * 0.145, y + al - al * 0.155, true);

      if (indice >= 9 && indice <= 11){
        this._figura(ctx, indice, x, y, an, al, color);
      } else if (indice === 12){
        // as: palo grande con una orla
        ctx.strokeStyle = color; ctx.globalAlpha = 0.25;
        ctx.lineWidth = Math.max(1, an * 0.015);
        ctx.beginPath(); ctx.arc(x + an / 2, y + al / 2, an * 0.33, 0, 6.2832); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = (an * 0.56).toFixed(1) + 'px serif';
        ctx.fillText(pal, x + an / 2, y + al / 2 + an * 0.02);
      } else {
        // numéricas: los símbolos en su disposición de siempre,
        // con los de la mitad de abajo del revés, como en la baraja real
        const pips = this.PIPS[indice] || [];
        ctx.fillStyle = color;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = (an * 0.24).toFixed(1) + 'px serif';
        const zonaY = y + al * 0.12, zonaAl = al * 0.76;
        pips.forEach(([px, py]) => {
          const sx = x + an * 0.5 + (px - 0.5) * an * 0.62;
          const sy = zonaY + py * zonaAl;
          if (py > 0.53){
            ctx.save();
            ctx.translate(sx, sy); ctx.rotate(Math.PI);
            ctx.fillText(pal, 0, 0);
            ctx.restore();
          } else ctx.fillText(pal, sx, sy);
        });
      }
    }

    // brillo diagonal del plástico
    const brillo = ctx.createLinearGradient(x, y, x + an * 0.8, y + al);
    brillo.addColorStop(0, 'rgba(255,255,255,.16)');
    brillo.addColorStop(0.42, 'rgba(255,255,255,.03)');
    brillo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = brillo;
    ctx.fillRect(x, y, an, al);
    ctx.restore();      // fin del recorte

    // filo
    ctx.strokeStyle = tapada ? 'rgba(0,240,255,.35)' : 'rgba(0,0,0,.22)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x + .5, y + .5, an - 1, al - 1, r);
    ctx.stroke();

    if (opciones.apagada){
      ctx.fillStyle = 'rgba(10,14,24,.42)';
      ctx.beginPath(); ctx.roundRect(x, y, an, al, r); ctx.fill();
    }
    if (opciones.marcada){
      ctx.strokeStyle = '#f3e600'; ctx.lineWidth = Math.max(2, an * 0.045);
      ctx.shadowColor = 'rgba(243,230,0,.8)'; ctx.shadowBlur = an * 0.2;
      ctx.beginPath(); ctx.roundRect(x - 2, y - 2, an + 4, al + 4, r + 2); ctx.stroke();
    }
    ctx.restore();
  }
};

/* ==========================================================
   Mesa de casino: paño con textura, barandilla y foco.
   La usan Póker y Blackjack para no repetir el fondo.
   ========================================================== */
const Mesa = {
  _ruido: null,

  /**
   * Paños que se compran en la tienda de cualquier mesa. Se guardan en una
   * clave común: el paño es de la sala, no de un juego, así que comprarlo en
   * el Blackjack también se ve en el Póker y en la Ruleta.
   */
  PIELES: [
    { id:0, nombre:'Verde clásico', tono:['#1c6b45', '#0c3a26'], acento:'rgba(243,230,0,.5)' },
    { id:1, nombre:'Granate real',  tono:['#7a1f33', '#390d18'], acento:'rgba(255,209,102,.55)' },
    { id:2, nombre:'Azul medianoche', tono:['#1b3a72', '#0a1936'], acento:'rgba(0,240,255,.5)' },
    { id:3, nombre:'Púrpura neón',  tono:['#4a1d70', '#200a35'], acento:'rgba(255,110,230,.55)' },
    { id:4, nombre:'Obsidiana',     tono:['#26292f', '#0d0e11'], acento:'rgba(200,210,225,.45)' }
  ],
  /** Cuántos paños hay desbloqueados, contando el de casa. */
  panosDesbloqueados(){
    return 1 + ((typeof Arcade !== 'undefined' && Arcade.tienda)
      ? Arcade.tienda.nivel('casino', 'pano') : 0);
  },
  panoElegido(){
    const n = parseInt(Almacen.leer('arcade_pano') || '0', 10) || 0;
    return Math.min(Math.max(0, n), this.panosDesbloqueados() - 1);
  },
  elegirPano(n){
    Almacen.escribir('arcade_pano', String(Math.max(0, n) % this.panosDesbloqueados()));
  },
  /** El paño activo, o null si es el de siempre (para no pisar el de cada juego). */
  pielComprada(){
    const i = this.panoElegido();
    return i > 0 ? this.PIELES[i] : null;
  },
  // Textura de paño: se genera una vez y se repite como patrón
  textura(ctx){
    if (this._ruido) return this._ruido;
    const t = document.createElement('canvas');
    t.width = t.height = 64;
    const c = t.getContext('2d');
    const img = c.createImageData(64, 64);
    for (let i = 0; i < img.data.length; i += 4){
      const v = 128 + (Math.random() - 0.5) * 26;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 26;
    }
    c.putImageData(img, 0, 0);
    this._ruido = ctx.createPattern(t, 'repeat');
    return this._ruido;
  },

  /**
   * Pinta el fondo completo: penumbra, foco cenital y el óvalo de la mesa
   * con barandilla de cuero y filete. `tono` es el color del paño.
   */
  pintar(ctx, an, al, opciones = {}){
    const cx = opciones.cx !== undefined ? opciones.cx : an / 2;
    const cy = opciones.cy !== undefined ? opciones.cy : al / 2;
    const rx = opciones.rx || an * 0.42;
    const ry = opciones.ry || al * 0.36;
    // El paño lo puede cambiar la tienda: es un adorno compartido por todas
    // las mesas, así que se compra una vez y se ve en Póker, Blackjack y compañía.
    const piel = Mesa.pielComprada();
    const tono = piel ? piel.tono : (opciones.tono || ['#1c6b45', '#0c3a26']);
    const acento = piel ? piel.acento : (opciones.acento || 'rgba(243,230,0,.5)');

    // penumbra de la sala
    const fondo = ctx.createRadialGradient(cx, cy - al * 0.1, 20, cx, cy, an * 0.85);
    fondo.addColorStop(0, '#1a2036');
    fondo.addColorStop(0.55, '#0b0f1c');
    fondo.addColorStop(1, '#04060d');
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, an, al);

    // haz del foco cenital
    const haz = ctx.createRadialGradient(cx, cy - al * 0.18, 10, cx, cy, Math.max(rx, ry) * 1.5);
    haz.addColorStop(0, 'rgba(255,246,214,.13)');
    haz.addColorStop(1, 'rgba(255,246,214,0)');
    ctx.fillStyle = haz;
    ctx.fillRect(0, 0, an, al);

    // barandilla de cuero
    const cuero = ctx.createLinearGradient(cx, cy - ry - 26, cx, cy + ry + 26);
    cuero.addColorStop(0, '#4a2f22');
    cuero.addColorStop(0.5, '#2f1d14');
    cuero.addColorStop(1, '#1a100b');
    ctx.fillStyle = cuero;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx + 26, ry + 22, 0, 0, 6.2832); ctx.fill();
    // costura
    ctx.strokeStyle = 'rgba(255,220,160,.18)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 7]);
    ctx.beginPath(); ctx.ellipse(cx, cy, rx + 13, ry + 11, 0, 0, 6.2832); ctx.stroke();
    ctx.setLineDash([]);

    // paño
    const pano = ctx.createRadialGradient(cx, cy - ry * 0.4, 10, cx, cy, Math.max(rx, ry) * 1.15);
    pano.addColorStop(0, tono[0]);
    pano.addColorStop(1, tono[1]);
    ctx.fillStyle = pano;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.2832); ctx.fill();

    // grano del paño
    ctx.save();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.2832); ctx.clip();
    ctx.fillStyle = this.textura(ctx);
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    ctx.restore();

    // filete interior
    ctx.strokeStyle = acento;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx - 10, ry - 9, 0, 0, 6.2832); ctx.stroke();

    // viñeta de los bordes de la pantalla
    const vin = ctx.createRadialGradient(cx, cy, Math.max(rx, ry) * 0.7, cx, cy, an * 0.78);
    vin.addColorStop(0, 'rgba(0,0,0,0)');
    vin.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = vin;
    ctx.fillRect(0, 0, an, al);
  },

  /**
   * Montón de fichas de casino. `valor` decide el color y cuántas se apilan.
   */
  fichas(ctx, valor, x, y, escala = 1){
    if (valor <= 0) return;
    // Colores de casino, pero con el canto claro para que se lean sobre el paño
    const COLORES = [
      [1000, '#e0a416', '#fff0b8'], [500, '#7b3fb0', '#d6a8ff'],
      [100, '#2c3140', '#c3ccdd'], [25,  '#1f8f47', '#89f0b0'],
      [5,   '#c8283a', '#ffa8b4'], [1,   '#d8dce4', '#ffffff']
    ];
    let resto = valor, capas = [];
    for (const [v, base, borde] of COLORES){
      const n = Math.min(6, Math.floor(resto / v));
      for (let k = 0; k < n; k++) capas.push([base, borde]);
      resto -= n * v;
      if (capas.length >= 9) break;
    }
    if (!capas.length) capas.push([COLORES[5][1], COLORES[5][2]]);
    capas = capas.slice(0, 9).reverse();

    const rx = 17 * escala, ry = 6.6 * escala, gr = 4.8 * escala;
    capas.forEach(([base, borde], k) => {
      const cy = y - k * gr;
      // canto
      ctx.fillStyle = base;
      ctx.beginPath(); ctx.ellipse(x, cy + gr * 0.5, rx, ry, 0, 0, 6.2832); ctx.fill();
      // cara
      const g = ctx.createLinearGradient(x - rx, cy - ry, x + rx, cy + ry);
      g.addColorStop(0, borde); g.addColorStop(0.45, base); g.addColorStop(1, borde);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.lineWidth = Math.max(0.9, escala * 1.1);
      ctx.beginPath(); ctx.ellipse(x, cy, rx * 0.62, ry * 0.62, 0, 0, 6.2832); ctx.stroke();
      // muescas del canto, que es lo que hace que una ficha parezca una ficha
      ctx.strokeStyle = 'rgba(255,255,255,.4)';
      ctx.lineWidth = Math.max(1.4, escala * 2);
      for (let a = 0; a < 6; a++){
        const ang = a * Math.PI / 3 + k * 0.2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * rx * 0.74, cy + Math.sin(ang) * ry * 0.74);
        ctx.lineTo(x + Math.cos(ang) * rx * 0.98, cy + Math.sin(ang) * ry * 0.98);
        ctx.stroke();
      }
    });
  }
};


// Respaldo para navegadores sin roundRect
if (!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){
    const k = Math.min(typeof r === 'number' ? r : 0, Math.abs(w) / 2, Math.abs(h) / 2);
    this.moveTo(x + k, y);
    this.arcTo(x + w, y, x + w, y + h, k);
    this.arcTo(x + w, y + h, x, y + h, k);
    this.arcTo(x, y + h, x, y, k);
    this.arcTo(x, y, x + w, y, k);
    this.closePath();
    return this;
  };
}

// El primer gesto del usuario desbloquea el audio del navegador
['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
  window.addEventListener(ev, () => Sonido.activar(), { once: true })
);
