/* ===========================================================
   data-sports.js — catálogo de competiciones y generador de
   partidos.
   En vez de escribir evento por evento, se define el plantel de
   cada liga con su rating y de ahí salen los emparejamientos,
   los horarios y los parámetros que come el motor de cuotas:
     fútbol  -> lh / la  (goles esperados de cada lado)
     básquet -> spread / total
     tenis   -> p1 (prob. de que gane el primero)
     series  -> q (prob. por mapa/set) y bo (al mejor de)
   =========================================================== */
K.DEPORTES = [
  { id: 'futbol', nom: 'Fútbol' },
  { id: 'basket', nom: 'Básquet' },
  { id: 'tenis', nom: 'Tenis' },
  { id: 'esports', nom: 'eSports' },
  { id: 'volley', nom: 'Vóley' }
];

/* ---------------- fútbol ---------------- */
K.LIGAS_FUTBOL = [
  { nom: 'Liga 1 · Perú', pais: '🇵🇪', goles: 2.5, margen: 1.06, equipos: [
    ['Alianza Lima', '🔵', 79], ['Universitario', '🟡', 81], ['Sporting Cristal', '🔷', 80],
    ['Melgar', '🔴', 74], ['Cienciano', '🔴', 70], ['Cusco FC', '⚫', 71],
    ['Sport Huancayo', '🔴', 68], ['ADT', '🟡', 65], ['Alianza Atlético', '🔵', 66],
    ['Atlético Grau', '⚪', 67], ['Sport Boys', '🌹', 64], ['UTC', '🟢', 62],
    ['Los Chankas', '🔵', 61], ['Comerciantes Unidos', '🟠', 60], ['Juan Pablo II', '🟣', 59],
    ['Deportivo Garcilaso', '🔵', 69]
  ]},
  { nom: 'Liga Profesional · Argentina', pais: '🇦🇷', goles: 2.4, margen: 1.055, equipos: [
    ['River Plate', '⚪', 85], ['Boca Juniors', '🔵', 83], ['Racing', '🔵', 80],
    ['Independiente', '🔴', 77], ['San Lorenzo', '🔵', 76], ['Vélez', '🔵', 78],
    ['Estudiantes', '🔴', 77], ['Talleres', '🔵', 76], ['Lanús', '🔴', 74],
    ['Rosario Central', '🔵', 75], ['Newell\'s', '🔴', 73], ['Huracán', '🎈', 72],
    ['Argentinos Jrs', '🔴', 73], ['Defensa y Justicia', '🟢', 71]
  ]},
  { nom: 'Brasileirão', pais: '🇧🇷', goles: 2.6, margen: 1.05, equipos: [
    ['Flamengo', '🔴', 87], ['Palmeiras', '🟢', 86], ['Botafogo', '⚫', 82],
    ['São Paulo', '🔴', 81], ['Fluminense', '🟢', 78], ['Corinthians', '⚫', 79],
    ['Grêmio', '🔵', 78], ['Internacional', '🔴', 79], ['Atlético Mineiro', '⚫', 81],
    ['Cruzeiro', '🔵', 77], ['Vasco da Gama', '⚫', 74], ['Bahia', '🔵', 75],
    ['Fortaleza', '🔵', 76], ['Athletico Paranaense', '🔴', 75]
  ]},
  { nom: 'LaLiga', pais: '🇪🇸', goles: 2.5, margen: 1.04, equipos: [
    ['Real Madrid', '⚪', 94], ['Barcelona', '🔵', 92], ['Atlético de Madrid', '🔴', 88],
    ['Athletic Club', '🔴', 83], ['Real Sociedad', '🔵', 81], ['Villarreal', '🟡', 82],
    ['Betis', '🟢', 80], ['Sevilla', '⚪', 78], ['Valencia', '🦇', 76],
    ['Girona', '🔴', 79], ['Celta de Vigo', '🔵', 75], ['Osasuna', '🔴', 74],
    ['Rayo Vallecano', '⚡', 73], ['Mallorca', '🔴', 72], ['Getafe', '🔵', 73],
    ['Alavés', '🔵', 71]
  ]},
  { nom: 'Premier League', pais: '🏴', goles: 2.8, margen: 1.038, equipos: [
    ['Manchester City', '🔵', 94], ['Arsenal', '🔴', 91], ['Liverpool', '🟥', 91],
    ['Chelsea', '🔵', 85], ['Tottenham', '⚪', 84], ['Manchester United', '🔴', 83],
    ['Newcastle', '⚫', 82], ['Aston Villa', '🟣', 82], ['Brighton', '🔵', 79],
    ['West Ham', '⚒️', 77], ['Brentford', '🐝', 76], ['Crystal Palace', '🦅', 76],
    ['Fulham', '⚪', 75], ['Everton', '🔵', 73], ['Wolves', '🐺', 73],
    ['Nottingham Forest', '🌳', 74]
  ]},
  { nom: 'Serie A', pais: '🇮🇹', goles: 2.6, margen: 1.042, equipos: [
    ['Inter', '🔵', 90], ['Juventus', '⚫', 87], ['Milan', '🔴', 86],
    ['Napoli', '🔷', 86], ['Atalanta', '🔵', 85], ['Roma', '🟡', 82],
    ['Lazio', '🔷', 81], ['Fiorentina', '🟣', 80], ['Bologna', '🔴', 79],
    ['Torino', '🐂', 75], ['Udinese', '⚫', 73], ['Genoa', '🔴', 72],
    ['Como', '🔵', 71], ['Cagliari', '🔴', 70]
  ]},
  { nom: 'Bundesliga', pais: '🇩🇪', goles: 3.1, margen: 1.042, equipos: [
    ['Bayern München', '🔴', 93], ['Bayer Leverkusen', '⚫', 89], ['Borussia Dortmund', '🟡', 85],
    ['RB Leipzig', '🐂', 84], ['Stuttgart', '⚪', 81], ['Eintracht Frankfurt', '🦅', 80],
    ['Wolfsburgo', '🐺', 77], ['Freiburg', '🔴', 76], ['Hoffenheim', '🔵', 74],
    ['Werder Bremen', '🟢', 74], ['Mainz', '🔴', 73], ['Union Berlin', '🔴', 72]
  ]},
  { nom: 'Ligue 1', pais: '🇫🇷', goles: 2.7, margen: 1.045, equipos: [
    ['PSG', '🔵', 92], ['Mónaco', '🔴', 83], ['Marsella', '🔵', 82],
    ['Lille', '🔴', 80], ['Lyon', '🔴', 79], ['Niza', '🦅', 78],
    ['Lens', '🟡', 77], ['Rennes', '🔴', 76], ['Nantes', '🟡', 72],
    ['Estrasburgo', '🔵', 73], ['Toulouse', '🟣', 72], ['Brest', '🔴', 74]
  ]},
  { nom: 'Champions League', pais: '🏆', goles: 2.8, margen: 1.035, equipos: [
    ['Real Madrid', '⚪', 94], ['Manchester City', '🔵', 94], ['Bayern München', '🔴', 93],
    ['PSG', '🔵', 92], ['Barcelona', '🔵', 92], ['Liverpool', '🟥', 91],
    ['Inter', '🔵', 90], ['Arsenal', '🔴', 91], ['Bayer Leverkusen', '⚫', 89],
    ['Atlético de Madrid', '🔴', 88], ['Borussia Dortmund', '🟡', 85], ['Milan', '🔴', 86]
  ]},
  { nom: 'Copa Libertadores', pais: '🏆', goles: 2.4, margen: 1.045, equipos: [
    ['Flamengo', '🔴', 87], ['Palmeiras', '🟢', 86], ['River Plate', '⚪', 85],
    ['Boca Juniors', '🔵', 83], ['Universitario', '🟡', 81], ['Alianza Lima', '🔵', 79],
    ['Sporting Cristal', '🔷', 80], ['Nacional', '⚪', 78], ['Peñarol', '🟡', 78],
    ['Colo-Colo', '⚪', 79], ['Olimpia', '⚪', 77], ['Atlético Nacional', '🟢', 78],
    ['LDU Quito', '⚪', 76], ['Bolívar', '🔵', 75]
  ]},
  { nom: 'Copa Sudamericana', pais: '🏆', goles: 2.3, margen: 1.05, equipos: [
    ['Lanús', '🔴', 74], ['Racing', '🔵', 80], ['Cruzeiro', '🔵', 77],
    ['Independiente del Valle', '🟣', 78], ['Cienciano', '🔴', 70], ['Melgar', '🔴', 74],
    ['Fortaleza', '🔵', 76], ['Corinthians', '⚫', 79], ['Always Ready', '🔴', 68],
    ['Universidad Católica', '🔵', 73]
  ]},
  { nom: 'Liga MX', pais: '🇲🇽', goles: 2.7, margen: 1.05, equipos: [
    ['América', '🦅', 84], ['Tigres', '🐯', 82], ['Monterrey', '🔵', 81],
    ['Cruz Azul', '🔵', 80], ['Chivas', '🐐', 78], ['Pumas', '🐆', 76],
    ['Toluca', '🔴', 78], ['León', '🟢', 75], ['Pachuca', '🔵', 76],
    ['Santos Laguna', '🟢', 72]
  ]},
  { nom: 'MLS', pais: '🇺🇸', goles: 2.9, margen: 1.055, equipos: [
    ['Inter Miami', '🩷', 82], ['LAFC', '⚫', 80], ['Columbus Crew', '🟡', 79],
    ['Seattle Sounders', '🟢', 77], ['LA Galaxy', '⚪', 78], ['Atlanta United', '🔴', 74],
    ['Philadelphia Union', '🔵', 75], ['Cincinnati', '🟠', 76]
  ]},
  { nom: 'Eliminatorias CONMEBOL', pais: '🌎', goles: 2.3, margen: 1.05, equipos: [
    ['Argentina', '🇦🇷', 93], ['Brasil', '🇧🇷', 89], ['Uruguay', '🇺🇾', 86],
    ['Colombia', '🇨🇴', 85], ['Ecuador', '🇪🇨', 82], ['Perú', '🇵🇪', 76],
    ['Paraguay', '🇵🇾', 78], ['Chile', '🇨🇱', 77], ['Venezuela', '🇻🇪', 74],
    ['Bolivia', '🇧🇴', 70]
  ]}
];

/* ---------------- tenis ---------------- */
K.TORNEOS_TENIS = [
  { nom: 'ATP Masters 1000 · Miami', margen: 1.045, jugadores: [
    ['J. Sinner', '🇮🇹', 96], ['C. Alcaraz', '🇪🇸', 95], ['N. Djokovic', '🇷🇸', 92],
    ['A. Zverev', '🇩🇪', 90], ['D. Medvedev', '🇷🇺', 89], ['A. Rublev', '🇷🇺', 86],
    ['C. Ruud', '🇳🇴', 86], ['H. Rune', '🇩🇰', 85], ['T. Fritz', '🇺🇸', 87],
    ['G. Dimitrov', '🇧🇬', 84], ['S. Tsitsipas', '🇬🇷', 85], ['A. de Miñaur', '🇦🇺', 86],
    ['B. Shelton', '🇺🇸', 84], ['U. Humbert', '🇫🇷', 82], ['T. Paul', '🇺🇸', 84],
    ['K. Khachanov', '🇷🇺', 82]
  ]},
  { nom: 'ATP 500 · Río de Janeiro', margen: 1.05, jugadores: [
    ['S. Báez', '🇦🇷', 82], ['F. Cerúndolo', '🇦🇷', 83], ['A. Tabilo', '🇨🇱', 80],
    ['N. Jarry', '🇨🇱', 80], ['T. Etcheverry', '🇦🇷', 79], ['F. Díaz Acosta', '🇦🇷', 76],
    ['T. Seyboth Wild', '🇧🇷', 75], ['M. Navone', '🇦🇷', 77], ['J. Munar', '🇪🇸', 76],
    ['P. Martínez', '🇪🇸', 75]
  ]},
  { nom: 'ATP Challenger · Lima', margen: 1.07, jugadores: [
    ['I. Buse', '🇵🇪', 72], ['G. Ugo Carabelli', '🇦🇷', 74], ['C. Taberner', '🇪🇸', 73],
    ['J. Bautista', '🇵🇪', 68], ['B. Zapata Miralles', '🇪🇸', 72], ['D. Elahi Galán', '🇨🇴', 73],
    ['F. Coria', '🇦🇷', 74], ['A. Barrientos', '🇨🇴', 69]
  ]},
  { nom: 'WTA 1000 · Indian Wells', margen: 1.05, jugadores: [
    ['A. Sabalenka', '🇧🇾', 94], ['I. Świątek', '🇵🇱', 95], ['C. Gauff', '🇺🇸', 92],
    ['E. Rybakina', '🇰🇿', 91], ['J. Pegula', '🇺🇸', 88], ['Q. Zheng', '🇨🇳', 88],
    ['J. Paolini', '🇮🇹', 87], ['E. Navarro', '🇺🇸', 86], ['B. Krejčíková', '🇨🇿', 85],
    ['D. Kasatkina', '🇷🇺', 85], ['M. Keys', '🇺🇸', 86], ['M. Andreeva', '🇷🇺', 87]
  ]},
  { nom: 'WTA 250 · Bogotá', margen: 1.065, jugadores: [
    ['C. Osorio', '🇨🇴', 76], ['M. Bouzková', '🇨🇿', 78], ['S. Sorribes Tormo', '🇪🇸', 79],
    ['N. Podoroska', '🇦🇷', 75], ['J. Cristian', '🇷🇴', 76], ['L. Bronzetti', '🇮🇹', 77],
    ['R. Zarazúa', '🇲🇽', 74], ['F. Jorge', '🇵🇪', 70]
  ]},
  { nom: 'ATP 250 · Buenos Aires', margen: 1.055, jugadores: [
    ['C. Alcaraz', '🇪🇸', 95], ['N. Jarry', '🇨🇱', 80], ['F. Cerúndolo', '🇦🇷', 83],
    ['S. Báez', '🇦🇷', 82], ['L. Darderi', '🇮🇹', 78], ['C. Ugo Carabelli', '🇦🇷', 74],
    ['M. Navone', '🇦🇷', 77], ['T. Etcheverry', '🇦🇷', 79]
  ]}
];

/* ---------------- básquet ---------------- */
K.LIGAS_BASKET = [
  { nom: 'NBA', margen: 1.04, total: 228, equipos: [
    ['Celtics', '🟩', 92], ['Nuggets', '🟡', 89], ['Thunder', '🟦', 90],
    ['Timberwolves', '🐺', 87], ['Bucks', '🦌', 86], ['Suns', '🟠', 84],
    ['Lakers', '🟣', 85], ['Warriors', '🔵', 84], ['Knicks', '🗽', 86],
    ['76ers', '🔵', 85], ['Mavericks', '🐴', 87], ['Heat', '🔥', 83],
    ['Clippers', '🔴', 83], ['Kings', '👑', 82], ['Pelicans', '🦆', 82],
    ['Cavaliers', '🍷', 84]
  ]},
  { nom: 'Liga ACB · España', margen: 1.05, total: 162, equipos: [
    ['Real Madrid B.', '⚪', 90], ['Barça Bàsquet', '🔵', 88], ['Unicaja', '🟢', 84],
    ['Valencia Basket', '🟠', 85], ['Baskonia', '🔵', 83], ['Gran Canaria', '🟡', 80],
    ['Joventut', '🟢', 79], ['Tenerife', '🔵', 82]
  ]},
  { nom: 'Basketball Champions League', margen: 1.055, total: 158, equipos: [
    ['Unicaja', '🟢', 84], ['Tenerife', '🔵', 82], ['Hapoel Jerusalem', '🔴', 79],
    ['Bàsquet Girona', '🔴', 77], ['Peristeri', '🔵', 76], ['Galatasaray', '🟡', 78]
  ]}
];

/* ---------------- eSports ---------------- */
K.LIGAS_ESPORTS = [
  { nom: 'CS2 · BLAST Premier', margen: 1.06, bo: 3, equipos: [
    ['NAVI', '🟨', 90], ['FaZe', '🟥', 89], ['Vitality', '🐝', 91],
    ['G2', '⬛', 88], ['Spirit', '⚪', 89], ['MOUZ', '🔴', 87],
    ['Astralis', '🔴', 84], ['Heroic', '⚫', 83], ['Furia', '🐆', 84],
    ['Complexity', '🔵', 82]
  ]},
  { nom: 'LoL · LTA Sur', margen: 1.065, bo: 3, equipos: [
    ['Leviatán', '🟪', 84], ['Estral', '🟧', 82], ['Isurus', '🦈', 83],
    ['Furia LoL', '🐆', 81], ['LOUD', '🟢', 85], ['paiN Gaming', '🔴', 84]
  ]},
  { nom: 'Dota 2 · ESL Pro Tour', margen: 1.06, bo: 3, equipos: [
    ['Team Spirit', '⬛', 92], ['Gaimin Gladiators', '🔵', 88], ['Falcons', '🦅', 89],
    ['Liquid', '🔵', 88], ['Tundra', '🟣', 85], ['BetBoom', '🟡', 86]
  ]},
  { nom: 'Valorant · VCT Américas', margen: 1.065, bo: 3, equipos: [
    ['Sentinels', '🔴', 86], ['LOUD', '🟢', 87], ['NRG', '⚫', 85],
    ['Leviatán', '🟪', 86], ['MIBR', '🔵', 83], ['KRÜ', '🟡', 84]
  ]}
];

/* ---------------- vóley ---------------- */
K.LIGAS_VOLLEY = [
  { nom: 'Liga Nacional · Perú', margen: 1.07, bo: 5, equipos: [
    ['Alianza Lima', '🔵', 84], ['Regatas', '⚪', 82], ['Géminis', '🟣', 80],
    ['San Martín', '🔷', 79], ['Circolo Sportivo', '🔴', 76], ['Deportivo Soan', '🟡', 74]
  ]},
  { nom: 'VNL Femenina', margen: 1.06, bo: 5, equipos: [
    ['Brasil', '🇧🇷', 90], ['Italia', '🇮🇹', 91], ['Polonia', '🇵🇱', 89],
    ['Turquía', '🇹🇷', 90], ['EE. UU.', '🇺🇸', 88], ['China', '🇨🇳', 86],
    ['Japón', '🇯🇵', 85], ['Serbia', '🇷🇸', 84]
  ]},
  { nom: 'Superliga · Brasil', margen: 1.065, bo: 5, equipos: [
    ['Sesc RJ', '🟥', 86], ['Praia Clube', '🟨', 85], ['Minas', '⚪', 84],
    ['Osasco', '🔵', 83], ['Barueri', '🟢', 80], ['Pinheiros', '🔴', 79]
  ]}
];

/* ===========================================================
   Generador de partidos
   =========================================================== */
(() => {
  let n = 0;
  const id = () => 'e' + (++n).toString(36);
  const min = m => Date.now() + m * 60000;

  /* Empareja los equipos de una liga sin repetir a nadie en la jornada. */
  function jornada(equipos, cuantos) {
    const orden = K.mezcla(equipos.slice());
    const partidos = [];
    for (let i = 0; i + 1 < orden.length && partidos.length < cuantos; i += 2) {
      partidos.push([orden[i], orden[i + 1]]);
    }
    return partidos;
  }

  /* Reparte los horarios: unos ya empezados (en vivo) y el resto por venir. */
  function horario(i, total, vivos) {
    if (i < vivos) return -K.entero(8, 70);            // minutos jugados
    const paso = 25 + (i - vivos) * K.entero(18, 40);
    return paso;
  }

  const eventos = [];

  /* ---- fútbol ---- */
  K.LIGAS_FUTBOL.forEach((liga, li) => {
    const vivos = li < 5 ? K.entero(1, 2) : 0;
    const partidos = jornada(liga.equipos, li < 6 ? 7 : 5);
    partidos.forEach(([l, v], i) => {
      const t = horario(i, partidos.length, vivos);
      const dif = (l[2] - v[2]) / 100;
      const lh = liga.goles / 2 * Math.exp(0.95 * dif + 0.16);
      const la = liga.goles / 2 * Math.exp(-0.95 * dif - 0.02);
      const vivo = t < 0;
      const minuto = vivo ? -t : 0;
      const ev = {
        id: id(), deporte: 'futbol', liga: liga.nom, pais: liga.pais,
        local: l[0], visita: v[0], escL: l[1], escV: v[1],
        ratL: l[2], ratV: v[2],
        inicio: min(t), vivo, minuto,
        marcador: { l: 0, v: 0 },
        modelo: { lh: K.round2(lh), la: K.round2(la) },
        margen: liga.margen
      };
      if (vivo) {                                       // marcador acorde a los minutos jugados
        const jug = minuto / 90;
        ev.marcador.l = Math.min(4, Math.round(K.poissonMuestra(lh * jug)));
        ev.marcador.v = Math.min(4, Math.round(K.poissonMuestra(la * jug)));
      }
      eventos.push(ev);
    });
  });

  /* ---- tenis ---- */
  K.TORNEOS_TENIS.forEach((torneo, ti) => {
    const vivos = ti < 3 ? K.entero(1, 2) : 0;
    const partidos = jornada(torneo.jugadores, 6);
    partidos.forEach(([a, b], i) => {
      const t = horario(i, partidos.length, vivos);
      const p1 = K.clamp(1 / (1 + Math.pow(10, (b[2] - a[2]) / 17)), 0.06, 0.94);
      const vivo = t < 0;
      const ev = {
        id: id(), deporte: 'tenis', liga: torneo.nom, pais: '🎾',
        local: a[0], visita: b[0], escL: a[1], escV: b[1],
        ratL: a[2], ratV: b[2],
        inicio: min(t), vivo, minuto: vivo ? -t : 0,
        marcador: { l: 0, v: 0 },
        modelo: { p1: K.round2(p1) },
        margen: torneo.margen
      };
      if (vivo && ev.minuto > 45) ev.marcador[Math.random() < p1 ? 'l' : 'v'] = 1;
      eventos.push(ev);
    });
  });

  /* ---- básquet ---- */
  K.LIGAS_BASKET.forEach((liga, li) => {
    const vivos = li < 2 ? 1 : 0;
    const partidos = jornada(liga.equipos, 6);
    partidos.forEach(([l, v], i) => {
      const t = horario(i, partidos.length, vivos);
      const spread = K.round2((l[2] - v[2]) * 0.62 + 2.4);
      const vivo = t < 0;
      const minuto = vivo ? Math.min(46, -t) : 0;
      const ev = {
        id: id(), deporte: 'basket', liga: liga.nom, pais: '🏀',
        local: l[0], visita: v[0], escL: l[1], escV: v[1],
        ratL: l[2], ratV: v[2],
        inicio: min(t), vivo, minuto,
        marcador: { l: 0, v: 0 },
        modelo: { spread, total: liga.total + K.entero(-6, 6) },
        margen: liga.margen
      };
      if (vivo) {
        const frac = minuto / 48;
        const pts = ev.modelo.total * frac;
        ev.marcador.l = Math.round(pts / 2 + spread * frac / 2 + K.entero(-5, 5));
        ev.marcador.v = Math.round(pts / 2 - spread * frac / 2 + K.entero(-5, 5));
      }
      eventos.push(ev);
    });
  });

  /* ---- series: eSports y vóley ---- */
  const series = (ligas, deporte, icono) => ligas.forEach((liga, li) => {
    const vivos = li < 2 ? 1 : 0;
    const partidos = jornada(liga.equipos, 5);
    partidos.forEach(([l, v], i) => {
      const t = horario(i, partidos.length, vivos);
      const q = K.clamp(1 / (1 + Math.pow(10, (v[2] - l[2]) / 22)), 0.1, 0.9);
      const vivo = t < 0;
      const ev = {
        id: id(), deporte, liga: liga.nom, pais: icono,
        local: l[0], visita: v[0], escL: l[1], escV: v[1],
        ratL: l[2], ratV: v[2],
        inicio: min(t), vivo, minuto: vivo ? -t : 0,
        marcador: { l: 0, v: 0 },
        modelo: { q: K.round2(q), bo: liga.bo },
        margen: liga.margen
      };
      if (vivo && ev.minuto > 30) ev.marcador[Math.random() < q ? 'l' : 'v'] = 1;
      eventos.push(ev);
    });
  });
  series(K.LIGAS_ESPORTS, 'esports', '🎮');
  series(K.LIGAS_VOLLEY, 'volley', '🏐');

  /* Estado común que espera el motor. */
  eventos.forEach(e => {
    e.exposicion = {};
    e.suspendido = false;
    e.terminado = false;
    e.historialCuotas = {};
    e.serie = [];            // histórico de la cuota principal, para la mini gráfica
    e.stats = {
      posesion: K.entero(38, 62),
      tiros: [K.entero(2, 14), K.entero(2, 14)],
      corners: [K.entero(0, 8), K.entero(0, 8)],
      amarillas: [K.entero(0, 4), K.entero(0, 4)]
    };
  });

  K.EVENTOS = eventos;
})();

K.evento = id => K.EVENTOS.find(e => e.id === id);
