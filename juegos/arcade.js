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
    const min = {come:55, paso:60, disparo:60, golpe:50, giro:70}[nombre] || 0;
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
    }
  }
};

// ---------- Records en el navegador ----------
const Arcade = {
  record(clave){ return parseFloat(localStorage.getItem('arcade_' + clave) || '0') || 0; },
  guardarRecord(clave, valor){
    if (valor > this.record(clave)){ localStorage.setItem('arcade_' + clave, String(valor)); return true; }
    return false;
  },
  leer(clave, porDefecto){
    const v = localStorage.getItem('arcade_' + clave);
    return v === null ? porDefecto : parseFloat(v);
  },
  escribir(clave, valor){ localStorage.setItem('arcade_' + clave, String(valor)); },

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
