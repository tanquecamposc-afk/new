/* ===========================================================
   core.js — utilidades compartidas
   =========================================================== */
const K = {};

K.CLAVE = 'kronosbet.v1';

/* ---------- números y formato ---------- */
K.sol = n => 'S/ ' + (Math.round(n * 100) / 100).toLocaleString('es-PE', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});
K.dec = (n, d = 2) => Number(n).toFixed(d);
K.pct = (n, d = 1) => (n * 100).toFixed(d) + '%';
K.clamp = (n, a, b) => Math.max(a, Math.min(b, n));
K.round2 = n => Math.round(n * 100) / 100;

/* ---------- azar ---------- */
K.rnd = () => Math.random();
K.entre = (a, b) => a + Math.random() * (b - a);
K.entero = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
K.elige = arr => arr[Math.floor(Math.random() * arr.length)];
K.mezcla = arr => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* Normal estándar por Box-Muller, la usan los modelos de básquet y tenis. */
K.normal = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/* Una muestra de una Poisson (algoritmo de Knuth), para inventar
   marcadores coherentes con los goles esperados de un partido. */
K.poissonMuestra = lam => {
  if (lam <= 0) return 0;
  const L = Math.exp(-lam);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
};

/* Aproximación de la CDF normal (Abramowitz-Stegun 7.1.26). */
K.cdfNormal = z => {
  const s = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + s * y);
};

/* ---------- DOM ---------- */
K.$ = (sel, raiz = document) => raiz.querySelector(sel);
K.$$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
K.el = (tag, props = {}, hijos = []) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) e.setAttribute(k, v);
  }
  for (const h of [].concat(hijos)) if (h) e.appendChild(h);
  return e;
};
K.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- bus de eventos ---------- */
K.bus = (() => {
  const subs = {};
  return {
    on: (ev, fn) => { (subs[ev] ||= []).push(fn); },
    emit: (ev, dato) => { (subs[ev] || []).forEach(fn => fn(dato)); }
  };
})();

/* ---------- avisos ---------- */
K.aviso = (msg, tipo = '') => {
  const cont = K.$('#toasts');
  if (!cont) return;
  const t = K.el('div', { class: 'toast ' + tipo, html: msg });
  cont.appendChild(t);
  while (cont.children.length > 4) cont.firstChild.remove();
  setTimeout(() => {
    t.style.transition = 'opacity .3s, transform .3s';
    t.style.opacity = '0';
    t.style.transform = 'translateX(20px)';
    setTimeout(() => t.remove(), 300);
  }, 3400);
};

/* ---------- persistencia ---------- */
K.guardar = estado => {
  try { localStorage.setItem(K.CLAVE, JSON.stringify(estado)); } catch (e) { /* modo privado */ }
};
K.cargar = () => {
  try {
    const raw = localStorage.getItem(K.CLAVE);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
};

/* ---------- tiempo ---------- */
K.hora = ms => new Date(ms).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
K.fecha = ms => new Date(ms).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
K.fechaHora = ms => K.fecha(ms) + ' ' + K.hora(ms);
K.enEspera = ms => new Promise(r => setTimeout(r, ms));
