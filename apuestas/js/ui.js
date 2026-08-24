/* ===========================================================
   ui.js — set de iconos SVG en línea y piezas visuales
   Nada de CDNs: la página tiene que funcionar sin red.
   =========================================================== */
K.ICONOS = {
  rayo: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>',
  futbol: '<circle cx="12" cy="12" r="9"/><path d="m12 8.2 3.4 2.5-1.3 4h-4.2l-1.3-4z"/><path d="M12 3v5.2M4.2 10.3l4.4.4M19.8 10.3l-4.4.4M7.4 19.6l2.5-4.9M16.6 19.6l-2.5-4.9"/>',
  basket: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6c3.5 3.5 3.5 9.3 0 12.8M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8"/>',
  tenis: '<ellipse cx="13" cy="8.6" rx="6.2" ry="6.6"/><path d="M8.8 13.4 4.6 19.6M9.2 5.2 16.8 12M16.8 5.2 9.2 12"/>',
  esports: '<rect x="2" y="7" width="20" height="11" rx="4"/><path d="M7 11v3M5.5 12.5h3M15.5 12h.01M18 14h.01"/>',
  volley: '<circle cx="12" cy="12" r="9"/><path d="M12 3c-3.4 3.2-4.4 8.4-2.6 12.8M21 12c-4.4-1.4-9.6-.2-12.8 3.2M3.4 9.6c4.5 0 9 2.6 11.2 6.6"/>',
  trofeo: '<path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M9 20h6M12 14v6"/>',
  globo: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/>',
  escudo: '<path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z"/>',
  estrella: '<path d="m12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8L12 4Z"/>',
  boleto: '<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z"/><path d="M10 6v2M10 12v2"/>',
  recibo: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/>',
  casino: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.4"/><circle cx="15.5" cy="15.5" r="1.4"/><circle cx="12" cy="12" r="1.4"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  formula: '<path d="M4 5h16M4 12h9M4 19h16"/><path d="m16 15 4 4M20 15l-4 4"/>',
  fuego: '<path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s.5 2 2 2c0-3 2-5 2-8Z"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  candado: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  equis: '<path d="M6 6 18 18M18 6 6 18"/>',
  cerrar: '<path d="M6 6 18 18M18 6 6 18"/>',
  billetera: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 14h2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  arribaFlecha: '<path d="m12 19V5M6 11l6-6 6 6"/>',
  abajoFlecha: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  grafico: '<path d="M4 20V4M4 20h16"/><path d="m7 15 3-4 3 3 5-7"/>',
  escudoCheck: '<path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  pausa: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  refresco: '<path d="M4 12a8 8 0 0 1 13.7-5.7L20 8"/><path d="M20 4v4h-4"/><path d="M20 12a8 8 0 0 1-13.7 5.7L4 16"/><path d="M4 20v-4h4"/>'
};

/* Devuelve el SVG como string, listo para innerHTML. */
K.ic = (nombre, clase = '') => {
  const p = K.ICONOS[nombre];
  if (!p) return '';
  return `<svg class="ic ${clase}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
};

/* Versión nodo, para cuando hace falta insertarlo con appendChild. */
K.icNodo = (nombre, clase = '') => {
  const cont = document.createElement('span');
  cont.className = 'ic-wrap';
  cont.innerHTML = K.ic(nombre, clase);
  return cont.firstElementChild || cont;
};

/* Icono por deporte, para no repetir el mapeo en cada vista. */
K.icDeporte = dep => ({
  futbol: 'futbol', basket: 'basket', tenis: 'tenis', esports: 'esports', volley: 'volley'
}[dep] || 'trofeo');
