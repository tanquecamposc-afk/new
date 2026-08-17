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
  ctx: null, silencio: false, ultimo: {},
  activar(){
    if (!this.ctx){
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tono(f1, f2, dur, tipo, vol, retraso = 0){
    if (this.silencio || !this.ctx) return;
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
    this._motor.g.gain.setTargetAtTime(0.022, t, 0.1);
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
  bucle(fn){
    let previo = performance.now();
    const paso = (t) => {
      const dt = Math.min(0.05, (t - previo) / 1000);
      previo = t;
      fn(dt);
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
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
    INICIAL: 5000,               // saldo con el que arranca una partida nueva
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
    // -> { ok, motivo: 'canjeado' | 'invalido' | 'repetido', numero, premio, saldo }
    canjear(txt){
      const n = this.normalizar(txt);
      if (n === null) return { ok:false, motivo:'invalido', saldo:Arcade.fichas.saldo() };
      const ya = this.usados();
      if (ya.includes(n)) return { ok:false, motivo:'repetido', numero:n, saldo:Arcade.fichas.saldo() };
      ya.push(n);
      Almacen.escribir('arcade_codigos', ya.sort((a, b) => a - b).join(','));
      return { ok:true, motivo:'canjeado', numero:n, premio:this.PREMIO,
               saldo:Arcade.fichas.ajustar(this.PREMIO) };
    },
    olvidar(){ Almacen.borrar('arcade_codigos'); }
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
