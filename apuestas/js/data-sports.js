/* ===========================================================
   data-sports.js — catálogo de eventos
   Los "modelo" son los parámetros que come el motor de cuotas:
     fútbol  -> lh / la  (goles esperados de cada lado)
     básquet -> spread / total
     tenis   -> p1 (prob. de que gane el primero)
     series  -> q (prob. por mapa/set) y bo (al mejor de)
   =========================================================== */
K.DEPORTES = [
  { id: 'futbol', nom: 'Fútbol', ic: '⚽' },
  { id: 'basket', nom: 'Básquet', ic: '🏀' },
  { id: 'tenis', nom: 'Tenis', ic: '🎾' },
  { id: 'esports', nom: 'eSports', ic: '🎮' },
  { id: 'volley', nom: 'Vóley', ic: '🏐' }
];

const _m = min => Date.now() + min * 60000;

K.EVENTOS = [
  /* ---------------- EN VIVO ---------------- */
  { id: 'e01', deporte: 'futbol', liga: 'Liga 1 · Perú', local: 'Alianza Lima', visita: 'Universitario',
    escL: '🔵', escV: '🟡', inicio: _m(-37), vivo: true, minuto: 37, marcador: { l: 1, v: 0 },
    modelo: { lh: 1.42, la: 1.18 }, margen: 1.055 },
  { id: 'e02', deporte: 'futbol', liga: 'Brasileirão', local: 'Flamengo', visita: 'Palmeiras',
    escL: '🔴', escV: '🟢', inicio: _m(-63), vivo: true, minuto: 63, marcador: { l: 1, v: 1 },
    modelo: { lh: 1.55, la: 1.30 }, margen: 1.05 },
  { id: 'e03', deporte: 'basket', liga: 'NBA', local: 'Lakers', visita: 'Celtics',
    escL: '🟣', escV: '🟩', inicio: _m(-28), vivo: true, minuto: 28, marcador: { l: 74, v: 81 },
    modelo: { spread: -1.5, total: 226 }, margen: 1.045 },
  { id: 'e04', deporte: 'tenis', liga: 'ATP 500 · Río', local: 'C. Alcaraz', visita: 'A. Zverev',
    escL: '🇪🇸', escV: '🇩🇪', inicio: _m(-44), vivo: true, minuto: 44, marcador: { l: 1, v: 0 },
    modelo: { p1: 0.66 }, margen: 1.05 },
  { id: 'e05', deporte: 'esports', liga: 'CS2 · BLAST Premier', local: 'FaZe', visita: 'NAVI',
    escL: '🟥', escV: '🟨', inicio: _m(-22), vivo: true, minuto: 22, marcador: { l: 1, v: 0 },
    modelo: { q: 0.53, bo: 3 }, margen: 1.06 },
  { id: 'e06', deporte: 'volley', liga: 'Liga Nacional · Perú', local: 'Regatas', visita: 'San Martín',
    escL: '⚪', escV: '🔷', inicio: _m(-31), vivo: true, minuto: 31, marcador: { l: 1, v: 1 },
    modelo: { q: 0.55, bo: 5 }, margen: 1.07 },

  /* ---------------- FÚTBOL PREPARTIDO ---------------- */
  { id: 'e10', deporte: 'futbol', liga: 'Liga 1 · Perú', local: 'Sporting Cristal', visita: 'Melgar',
    escL: '🔷', escV: '🔴', inicio: _m(95), modelo: { lh: 1.68, la: 0.94 }, margen: 1.055 },
  { id: 'e11', deporte: 'futbol', liga: 'Liga 1 · Perú', local: 'Cienciano', visita: 'Cusco FC',
    escL: '🔴', escV: '⚫', inicio: _m(180), modelo: { lh: 1.30, la: 1.05 }, margen: 1.06 },
  { id: 'e12', deporte: 'futbol', liga: 'Copa Libertadores', local: 'River Plate', visita: 'Boca Juniors',
    escL: '⚪', escV: '🔵', inicio: _m(240), modelo: { lh: 1.48, la: 1.02 }, margen: 1.045 },
  { id: 'e13', deporte: 'futbol', liga: 'LaLiga', local: 'Real Madrid', visita: 'Girona',
    escL: '⚪', escV: '🔴', inicio: _m(320), modelo: { lh: 2.35, la: 0.85 }, margen: 1.04 },
  { id: 'e14', deporte: 'futbol', liga: 'Premier League', local: 'Arsenal', visita: 'Liverpool',
    escL: '🔴', escV: '🟥', inicio: _m(400), modelo: { lh: 1.62, la: 1.44 }, margen: 1.04 },
  { id: 'e15', deporte: 'futbol', liga: 'Serie A', local: 'Inter', visita: 'Napoli',
    escL: '🔵', escV: '🔷', inicio: _m(470), modelo: { lh: 1.55, la: 1.15 }, margen: 1.045 },
  { id: 'e16', deporte: 'futbol', liga: 'Eliminatorias CONMEBOL', local: 'Perú', visita: 'Chile',
    escL: '🇵🇪', escV: '🇨🇱', inicio: _m(1400), modelo: { lh: 1.22, la: 0.98 }, margen: 1.05 },
  { id: 'e17', deporte: 'futbol', liga: 'Champions League', local: 'Bayern', visita: 'PSG',
    escL: '🔴', escV: '🔵', inicio: _m(1500), modelo: { lh: 1.85, la: 1.35 }, margen: 1.035 },

  /* ---------------- BÁSQUET ---------------- */
  { id: 'e20', deporte: 'basket', liga: 'NBA', local: 'Nuggets', visita: 'Suns',
    escL: '🟡', escV: '🟠', inicio: _m(150), modelo: { spread: 5.5, total: 232 }, margen: 1.04 },
  { id: 'e21', deporte: 'basket', liga: 'NBA', local: 'Warriors', visita: 'Thunder',
    escL: '🔵', escV: '🟦', inicio: _m(260), modelo: { spread: -3.5, total: 228 }, margen: 1.04 },
  { id: 'e22', deporte: 'basket', liga: 'Liga ACB', local: 'Real Madrid B.', visita: 'Barça',
    escL: '⚪', escV: '🔵', inicio: _m(330), modelo: { spread: 2.5, total: 163 }, margen: 1.05 },
  { id: 'e23', deporte: 'basket', liga: 'NBA', local: 'Bucks', visita: 'Heat',
    escL: '🟩', escV: '🔴', inicio: _m(420), modelo: { spread: 7.5, total: 221 }, margen: 1.04 },

  /* ---------------- TENIS ---------------- */
  { id: 'e30', deporte: 'tenis', liga: 'ATP Masters 1000', local: 'J. Sinner', visita: 'D. Medvedev',
    escL: '🇮🇹', escV: '🇷🇺', inicio: _m(120), modelo: { p1: 0.71 }, margen: 1.045 },
  { id: 'e31', deporte: 'tenis', liga: 'WTA 1000', local: 'I. Świątek', visita: 'A. Sabalenka',
    escL: '🇵🇱', escV: '🇧🇾', inicio: _m(200), modelo: { p1: 0.57 }, margen: 1.05 },
  { id: 'e32', deporte: 'tenis', liga: 'ATP Challenger · Lima', local: 'I. Buse', visita: 'F. Coria',
    escL: '🇵🇪', escV: '🇦🇷', inicio: _m(280), modelo: { p1: 0.48 }, margen: 1.065 },
  { id: 'e33', deporte: 'tenis', liga: 'ATP 250', local: 'N. Djokovic', visita: 'H. Rune',
    escL: '🇷🇸', escV: '🇩🇰', inicio: _m(390), modelo: { p1: 0.68 }, margen: 1.05 },

  /* ---------------- ESPORTS ---------------- */
  { id: 'e40', deporte: 'esports', liga: 'LoL · LTA Sur', local: 'Leviatán', visita: 'Estral',
    escL: '🟪', escV: '🟧', inicio: _m(110), modelo: { q: 0.58, bo: 3 }, margen: 1.06 },
  { id: 'e41', deporte: 'esports', liga: 'Dota 2 · ESL', local: 'Team Spirit', visita: 'Gaimin',
    escL: '⬛', escV: '🟦', inicio: _m(210), modelo: { q: 0.62, bo: 3 }, margen: 1.06 },
  { id: 'e42', deporte: 'esports', liga: 'Valorant · VCT', local: 'Sentinels', visita: 'LOUD',
    escL: '🔴', escV: '🟩', inicio: _m(300), modelo: { q: 0.49, bo: 3 }, margen: 1.065 },
  { id: 'e43', deporte: 'esports', liga: 'CS2 · IEM', local: 'Vitality', visita: 'G2',
    escL: '🟨', escV: '⬛', inicio: _m(380), modelo: { q: 0.55, bo: 3 }, margen: 1.06 },

  /* ---------------- VÓLEY ---------------- */
  { id: 'e50', deporte: 'volley', liga: 'Liga Nacional · Perú', local: 'Alianza Lima', visita: 'Géminis',
    escL: '🔵', escV: '🟣', inicio: _m(160), modelo: { q: 0.61, bo: 5 }, margen: 1.07 },
  { id: 'e51', deporte: 'volley', liga: 'VNL Femenina', local: 'Brasil', visita: 'Italia',
    escL: '🇧🇷', escV: '🇮🇹', inicio: _m(250), modelo: { q: 0.52, bo: 5 }, margen: 1.06 },
  { id: 'e52', deporte: 'volley', liga: 'Superliga Brasil', local: 'Sesc RJ', visita: 'Praia Clube',
    escL: '🟥', escV: '🟨', inicio: _m(340), modelo: { q: 0.56, bo: 5 }, margen: 1.065 }
];

/* Cada evento arranca sin exposición: el libro se va llenando con lo que apuesta el usuario. */
K.EVENTOS.forEach(e => {
  e.vivo = !!e.vivo;
  e.minuto = e.minuto || 0;
  e.marcador = e.marcador || { l: 0, v: 0 };
  e.exposicion = {};
  e.suspendido = false;
  e.historialCuotas = {};
});

K.evento = id => K.EVENTOS.find(e => e.id === id);
