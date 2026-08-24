/* ===========================================================
   data-casino.js — lobby del casino
   motor: mines | aviator | limbo | plinko | slot | info
   Los títulos y proveedores son referencias del catálogo real;
   acá todos corren sobre motores propios de demostración.
   =========================================================== */
K.CATEGORIAS = [
  { id: 'todos', nom: 'Todos', ic: '🎰' },
  { id: 'slots', nom: 'Tragamonedas', ic: '🍒' },
  { id: 'crash', nom: 'Crash e instantáneos', ic: '🚀' },
  { id: 'vivo', nom: 'En vivo y game shows', ic: '🎥' },
  { id: 'mesa', nom: 'Mesa RNG y video póker', ic: '🃏' }
];

/* Paletas para la portada de cada juego */
const G = {
  zeus: 'linear-gradient(140deg,#3b2a6b,#1b2a5e)',
  dulce: 'linear-gradient(140deg,#7b2a5e,#3a1a4e)',
  egipto: 'linear-gradient(140deg,#6b5320,#2e2410)',
  pesca: 'linear-gradient(140deg,#14506b,#0a2a3c)',
  fruta: 'linear-gradient(140deg,#6b2020,#3a1010)',
  oro: 'linear-gradient(140deg,#6b5010,#2f2408)',
  jungla: 'linear-gradient(140deg,#1d5b3a,#0d2a1c)',
  espacio: 'linear-gradient(140deg,#1b2f6b,#0a1230)',
  neon: 'linear-gradient(140deg,#5b1d6b,#180a30)',
  vivo: 'linear-gradient(140deg,#6b1d2a,#2a0a12)',
  mesa: 'linear-gradient(140deg,#14452e,#072014)',
  chili: 'linear-gradient(140deg,#7a2a12,#3a1206)'
};

K.JUEGOS = [
  /* ---------------- TRAGAMONEDAS (1-12) ---------------- */
  { n: 1, id: 'gates', nom: 'Gates of Olympus', prov: 'Pragmatic Play', cat: 'slots', ic: '⚡', grad: G.zeus,
    desc: 'Pagos en cascada y multiplicadores de Zeus hasta x500 con giros gratis.',
    motor: 'slot', cfg: { simbolos: ['⚡', '👑', '💍', '🏺', '💎', '🔴', '🟣', '🟢'], vol: 'alta', rtp: 96.5, mult: [0, 0, 0, 2, 5, 12, 40, 120] } },
  { n: 2, id: 'sweet', nom: 'Sweet Bonanza', prov: 'Pragmatic Play', cat: 'slots', ic: '🍭', grad: G.dulce,
    desc: 'Mecánica Pay Anywhere: pagan 8 símbolos iguales caigan donde caigan.',
    motor: 'slot', cfg: { simbolos: ['🍭', '🍬', '🍉', '🍇', '🍎', '🫐', '🍌', '💜'], vol: 'alta', rtp: 96.5, mult: [0, 0, 0, 2, 4, 10, 35, 100] } },
  { n: 3, id: 'bookdead', nom: 'Book of Dead', prov: "Play'n GO", cat: 'slots', ic: '📖', grad: G.egipto,
    desc: 'Aventura egipcia con símbolo expansivo durante la ronda de bonificación.',
    motor: 'slot', cfg: { simbolos: ['📖', '🧙', '🦅', '🐍', '🪲', '🅰️', '🇰', '🇶'], vol: 'alta', rtp: 96.2, mult: [0, 0, 0, 3, 6, 15, 45, 150] } },
  { n: 4, id: 'bigbass', nom: 'Big Bass Bonanza', prov: 'Pragmatic Play', cat: 'slots', ic: '🐟', grad: G.pesca,
    desc: 'Pesca interactiva: el pescador recolecta los símbolos de dinero.',
    motor: 'slot', cfg: { simbolos: ['🐟', '🎣', '🪝', '🛶', '🐠', '🅰️', '🇰', '🇶'], vol: 'media', rtp: 96.7, mult: [0, 0, 0, 2, 4, 9, 25, 80] } },
  { n: 5, id: 'sugar', nom: 'Sugar Rush 1000', prov: 'Pragmatic Play', cat: 'slots', ic: '🧁', grad: G.dulce,
    desc: 'Cuadrícula con posiciones multiplicadoras que se duplican al repetir premio.',
    motor: 'slot', cfg: { simbolos: ['🧁', '🍫', '🍩', '🍪', '🍓', '🟦', '🟨', '🟩'], vol: 'alta', rtp: 96.5, mult: [0, 0, 0, 2, 5, 14, 50, 140] } },
  { n: 6, id: 'chilli', nom: 'Extra Chilli Megaways', prov: 'Big Time Gaming', cat: 'slots', ic: '🌶️', grad: G.chili,
    desc: 'Megaways con hasta 117.649 formas de ganar y carretes en cascada.',
    motor: 'slot', cfg: { simbolos: ['🌶️', '🌽', '🥑', '🫘', '🍅', '🇰', '🇶', '🇯'], vol: 'alta', rtp: 96.8, mult: [0, 0, 0, 3, 7, 18, 60, 180] } },
  { n: 7, id: 'sizzling', nom: 'Sizzling Hot Deluxe', prov: 'Novomatic / Greentube', cat: 'slots', ic: '🍒', grad: G.fruta,
    desc: 'La tragamonedas de frutas clásica, cinco carretes sin adornos.',
    motor: 'slot', cfg: { simbolos: ['🍒', '🍋', '🍊', '🍉', '🍇', '⭐', '7️⃣', '🔔'], vol: 'media', rtp: 95.7, mult: [0, 0, 0, 2, 4, 8, 20, 60] } },
  { n: 8, id: 'wolf', nom: 'Wolf Gold', prov: 'Pragmatic Play', cat: 'slots', ic: '🐺', grad: G.oro,
    desc: 'Jackpots fijos, giros gratis con mega-símbolo y función Money Respin.',
    motor: 'slot', cfg: { simbolos: ['🐺', '🦅', '🐎', '🐃', '🌵', '🅰️', '🇰', '🇶'], vol: 'media', rtp: 96.0, mult: [0, 0, 0, 2, 5, 11, 30, 90] } },
  { n: 9, id: 'gonzo', nom: "Gonzo's Quest Megaways", prov: 'Red Tiger', cat: 'slots', ic: '🗿', grad: G.jungla,
    desc: 'Avalanchas de símbolos con multiplicador progresivo tras cada caída.',
    motor: 'slot', cfg: { simbolos: ['🗿', '🐍', '🦜', '🟦', '🟩', '🟨', '🟪', '🟥'], vol: 'alta', rtp: 96.0, mult: [0, 0, 0, 3, 6, 16, 48, 130] } },
  { n: 10, id: 'bookra', nom: 'Book of Ra Deluxe', prov: 'Novomatic', cat: 'slots', ic: '🏺', grad: G.egipto,
    desc: 'Referente de la temática de tesoros y arqueología antigua.',
    motor: 'slot', cfg: { simbolos: ['🏺', '👳', '🐦', '🐞', '📕', '🅰️', '🇰', '🇶'], vol: 'alta', rtp: 95.1, mult: [0, 0, 0, 3, 6, 15, 45, 150] } },
  { n: 11, id: 'starburst', nom: 'Starburst', prov: 'NetEnt', cat: 'slots', ic: '💎', grad: G.neon,
    desc: 'Volatilidad baja y comodines expansivos que regalan re-spins.',
    motor: 'slot', cfg: { simbolos: ['💎', '🔷', '🟨', '🟩', '🟧', '7️⃣', '🔔', '⭐'], vol: 'baja', rtp: 96.1, mult: [0, 0, 0, 1.5, 3, 6, 15, 45] } },
  { n: 12, id: 'biggerbass', nom: 'Bigger Bass Bonanza', prov: 'Pragmatic Play', cat: 'slots', ic: '🎣', grad: G.pesca,
    desc: 'Versión ampliada de la saga, con más potencial de multiplicadores.',
    motor: 'slot', cfg: { simbolos: ['🎣', '🐟', '🐠', '🦈', '🛶', '🅰️', '🇰', '🇶'], vol: 'alta', rtp: 96.7, mult: [0, 0, 0, 2, 5, 12, 38, 110] } },

  /* ---------------- CRASH E INSTANTÁNEOS (13-18 + Limbo) ---------------- */
  { n: 13, id: 'aviator', nom: 'Aviator', prov: 'Spribe', cat: 'crash', ic: '✈️', grad: G.espacio,
    desc: 'El crash del avión: cobra antes de que se vaya. Con auto-cashout.', motor: 'aviator', destacado: true },
  { n: 14, id: 'spaceman', nom: 'Spaceman', prov: 'Pragmatic Play', cat: 'crash', ic: '🧑‍🚀', grad: G.espacio,
    desc: 'Variante espacial del crash, con opción de cobrar la mitad de la apuesta.', motor: 'aviator', cfg: { tema: 'space', mitad: true } },
  { n: 15, id: 'plinko', nom: 'Plinko', prov: 'BGaming / Spribe', cat: 'crash', ic: '🔻', grad: G.neon,
    desc: 'Suelta la bola por la pirámide de clavijas eligiendo el nivel de riesgo.', motor: 'plinko' },
  { n: 16, id: 'mines', nom: 'Mines', prov: 'Spribe', cat: 'crash', ic: '💣', grad: G.jungla,
    desc: 'Busca estrellas esquivando minas: cada acierto sube el multiplicador.', motor: 'mines', destacado: true },
  { n: 17, id: 'balloon', nom: 'Balloon', prov: 'SmartSoft Gaming', cat: 'crash', ic: '🎈', grad: G.dulce,
    desc: 'Infla el globo para multiplicar la apuesta antes de que reviente.', motor: 'aviator', cfg: { tema: 'globo' } },
  { n: 18, id: 'maverick', nom: 'Maverick', prov: '1x2 Network', cat: 'crash', ic: '🛩️', grad: G.espacio,
    desc: 'Crash rápido con despegue de avioneta y rondas muy cortas.', motor: 'aviator', cfg: { tema: 'rapido', veloz: true } },
  { n: 31, id: 'limbo', nom: 'Limbo', prov: 'Kronos Originals', cat: 'crash', ic: '🎯', grad: G.neon,
    desc: 'Eliges el multiplicador objetivo y el juego sortea uno: si lo supera, cobras.', motor: 'limbo', destacado: true },

  /* ---------------- EN VIVO Y GAME SHOWS (19-26) ---------------- */
  { n: 19, id: 'crazytime', nom: 'Crazy Time', prov: 'Evolution', cat: 'vivo', ic: '🎡', grad: G.vivo,
    desc: 'Rueda con cuatro minijuegos: Pachinko, Cash Hunt, Coin Flip y Crazy Time.', motor: 'rueda',
    cfg: { segmentos: [{ l: '1', m: 2, p: 21 }, { l: '2', m: 3, p: 13 }, { l: '5', m: 6, p: 7 }, { l: '10', m: 11, p: 4 }, { l: 'Coin Flip', m: 25, p: 4 }, { l: 'Pachinko', m: 60, p: 2 }, { l: 'Cash Hunt', m: 90, p: 2 }, { l: 'Crazy Time', m: 200, p: 1 }] } },
  { n: 20, id: 'lightning', nom: 'Lightning Roulette', prov: 'Evolution', cat: 'vivo', ic: '⚡', grad: G.vivo,
    desc: 'Ruleta europea donde los rayos añaden multiplicadores de hasta x500.', motor: 'ruleta', cfg: { rayos: true } },
  { n: 21, id: 'monopoly', nom: 'Monopoly Live', prov: 'Evolution', cat: 'vivo', ic: '🎩', grad: G.vivo,
    desc: 'Rueda combinada con un tablero 3D del clásico juego de mesa.', motor: 'rueda',
    cfg: { segmentos: [{ l: '1', m: 2, p: 22 }, { l: '2', m: 3, p: 15 }, { l: '5', m: 6, p: 7 }, { l: '10', m: 11, p: 3 }, { l: '2 Rolls', m: 30, p: 3 }, { l: '4 Rolls', m: 90, p: 1 }] } },
  { n: 22, id: 'megawheel', nom: 'Mega Wheel', prov: 'Pragmatic Play Live', cat: 'vivo', ic: '🎯', grad: G.vivo,
    desc: 'Rueda gigante de la suerte conducida por un presentador en directo.', motor: 'rueda',
    cfg: { segmentos: [{ l: 'x1', m: 2, p: 24 }, { l: 'x2', m: 3, p: 14 }, { l: 'x5', m: 6, p: 6 }, { l: 'x10', m: 11, p: 4 }, { l: 'x20', m: 21, p: 2 }, { l: 'x40', m: 41, p: 1 }] } },
  { n: 23, id: 'candyland', nom: 'Sweet Bonanza Candyland', prov: 'Pragmatic Play Live', cat: 'vivo', ic: '🍬', grad: G.dulce,
    desc: 'Game show que lleva la temática del slot a un estudio real.', motor: 'rueda',
    cfg: { segmentos: [{ l: '1', m: 2, p: 24 }, { l: '2', m: 3, p: 14 }, { l: '5', m: 6, p: 6 }, { l: 'Candy Drop', m: 25, p: 4 }, { l: 'Sweet Spins', m: 60, p: 2 }] } },
  { n: 24, id: 'bjvip', nom: 'Live Blackjack VIP', prov: 'Evolution / Pragmatic', cat: 'vivo', ic: '🂡', grad: G.mesa,
    desc: 'Mesas de 21 con crupier real y apuestas secundarias (Pairs, 21+3).', motor: 'blackjack' },
  { n: 25, id: 'fireblaze', nom: 'Mega Fire Blaze Roulette', prov: 'Playtech', cat: 'vivo', ic: '🔥', grad: G.vivo,
    desc: 'Ruleta en vivo con rondas de bonificación acumulativas.', motor: 'ruleta', cfg: { rayos: true } },
  { n: 26, id: 'speedbac', nom: 'Speed Baccarat', prov: 'Evolution', cat: 'vivo', ic: '🀄', grad: G.mesa,
    desc: 'Baccarat exprés: cada ronda se resuelve en menos de 30 segundos.', motor: 'baccarat' },

  /* ---------------- MESA RNG Y VIDEO PÓKER (27-30) ---------------- */
  { n: 27, id: 'fproulette', nom: 'First Person Roulette', prov: 'Evolution', cat: 'mesa', ic: '🎲', grad: G.mesa,
    desc: 'Ruleta 3D con botón directo para saltar a la mesa en vivo.', motor: 'ruleta' },
  { n: 28, id: 'fpblackjack', nom: 'First Person Blackjack', prov: 'Evolution', cat: 'mesa', ic: '♠️', grad: G.mesa,
    desc: 'Experiencia individual de 21 con animaciones realistas.', motor: 'blackjack' },
  { n: 29, id: 'jacks', nom: 'Jacks or Better', prov: 'Playtech / NetEnt', cat: 'mesa', ic: '🃏', grad: G.mesa,
    desc: 'El formato clásico de video póker: pagan jotas o mejor.', motor: 'videopoker' },
  { n: 30, id: 'multihand', nom: 'Multihand Blackjack', prov: 'Pragmatic Play', cat: 'mesa', ic: '♣️', grad: G.mesa,
    desc: 'Blackjack digital con opción de jugar hasta 3 manos a la vez.', motor: 'blackjack', cfg: { manos: 3 } }
];

K.juego = id => K.JUEGOS.find(j => j.id === id);
