# KRONOS BET — simulador de casa de apuestas y casino

Sitio completo de apuestas deportivas con zona de casino, hecho en **HTML, CSS y JavaScript puro**,
sin dependencias ni backend. Todo el estado (saldo, apuestas, historial) vive en `localStorage`.
Los iconos son SVG en línea y la única carga externa es la tipografía de Google Fonts, con su
fallback correspondiente: sin red, el sitio funciona igual.

> ⚠️ Es un **simulador educativo**. Las fichas no tienen valor, no hay pagos, no hay licencia y no está
> afiliado a ninguna casa de apuestas real. La idea es mostrar cómo funciona el motor por dentro:
> cuotas, margen, riesgo, liquidación y la matemática de cada juego.

## Cómo abrirlo

```bash
# opción 1: abrir el archivo directamente
xdg-open index.html

# opción 2: servidor local
npx http-server . -p 8080

# opción 3: generar un único archivo autocontenido
node tools/build.js          # → dist/kronosbet.html
```

## Lado deportivo

| Pieza | Qué hace |
|---|---|
| Motor de cuotas | Poisson para fútbol (matriz de marcadores), normal para básquet, modelo de sets para tenis, binomial para series de eSports y vóley |
| Margen | `Cuota = 1 / (P × M)` con M entre 1.035 y 1.07 según liga, +2.5 puntos en vivo |
| Riesgo | Cada apuesta carga la responsabilidad del libro y mueve la cuota de ese lado hacia abajo |
| Cierre de mercados | Un mercado ya decidido (o sin margen tras el recorte de cuotas) se cierra en vez de ofrecer precios absurdos, y el boleto rechaza una selección si su mercado se cerró mientras validaba |
| En vivo | Reloj a 30×, goles y canastas simulados, suspensión de mercado al caer un gol y recálculo del modelo |
| Bet delay | 3 a 8 segundos de validación en las apuestas en vivo; si el mercado se suspende en ese lapso, la apuesta se rechaza |
| Boleto | Simples y combinadas, aviso de cambio de cuota, retorno potencial y margen real del mercado |
| SuperCuota | Promo diaria (+2.5 goles y ambos anotan) vendida por encima del precio justo, con margen negativo de verdad |
| Cashout | `Apuesta × Cuota bloqueada / Cuota actual × (1 − 5%)`, solo con el partido en curso |
| Liquidación | Resolución automática por mercado, incluidas devoluciones por push |
| Perfilado | Mide el CLV contra la línea de cierre y recorta el límite si detecta un jugador *sharp* |

Deportes: fútbol, básquet, tenis, eSports y vóley. Los partidos no están escritos a mano: cada liga
define su plantel con un rating por equipo y de ahí salen los emparejamientos, los horarios y los
parámetros del modelo. En total, **unos 230 eventos en 51 competiciones** —Liga 1, Liga Profesional
argentina, Brasileirão, LaLiga, Premier, Serie A, Bundesliga, Ligue 1, Champions, Libertadores,
Sudamericana, Liga MX, MLS, Eredivisie, Liga Portugal, Süper Lig, Championship, Chile, Colombia,
Ecuador, Uruguay, Saudi Pro League, Copa del Rey, Eliminatorias, nueve torneos de tenis ATP y WTA,
NBA, EuroLeague, ACB, ligas de Argentina y Brasil, CS2, LoL, Dota, Valorant, Rainbow Six, Rocket
League y cinco ligas de vóley— con hasta 7 mercados por partido, teletipo de marcadores en vivo,
buscador por equipo y ficha de partido con estadísticas y la gráfica de cómo se movió la cuota.

### Progresión y enganche

El sitio incluye la capa de retención completa de una casa real, con su explicación al lado:

| Sistema | Cómo funciona |
|---|---|
| Niveles y XP | 1 XP por cada S/ 5 apostados; cada nivel paga fichas y cada tres niveles suma 5 giros gratis |
| Misiones diarias | Tres objetivos que se renuevan a medianoche (giros, apuestas, deportes distintos, crash a 2×…) con premio y XP |
| Torneo semanal | Ranking por volumen apostado contra nueve rivales simulados, con premios al podio |
| Cashback semanal | Devuelve el 5% de las pérdidas netas de la semana |
| Jackpot progresivo | Crece con el 0.5% de cada apuesta del casino y puede caer en cualquier giro de tragamonedas |
| Logros | 18 insignias con premio: primera apuesta, crash en 50×, coronar la torre, reventar el bote… |

La pestaña **Recompensas** cierra con una tabla que dice qué palanca activa cada mecánica —miedo a
cortar la racha, progreso visible mientras pierdes, premio improbable, pérdida convertida en
recompensa— y recuerda que ninguna de ellas cambia el RTP.

### Ruleta diaria

Un giro gratis cada 20 horas con premios de S/ 25 a S/ 1.500 (valor esperado de unos S/ 138) y un
bonus del 10% por cada día seguido que vuelvas, hasta +50%. Es el mismo mecanismo de retención que
usan las casas reales, con los números a la vista en la sección *Cómo funciona*.

## Carreras virtuales

Una carrera nueva cada minuto sin parar: 40 segundos de apuestas, 18 de carrera animada en canvas y 9
de resultado. Tres disciplinas que rotan (hipódromo, canódromo y circuito de motos), seis corredores
con su forma y su probabilidad, mercados de ganador y top 2, y el orden de llegada sorteado con un
modelo Plackett-Luce antes de que arranque la animación. El motor corre aunque estés en otra pestaña y
las apuestas se liquidan solas. Margen del 14%, casi el triple que en fútbol: se paga la inmediatez.

## Casino — 40 juegos, 16 motores

- **Tragamonedas (12)** — cuadrícula 6×5 tipo *pay anywhere*, con carretes que se frenan uno por uno. La
  tabla de pagos se **calcula al abrir el juego** repartiendo el RTP declarado entre los símbolos según
  la probabilidad de que cada uno aparezca 8 o más veces. Volatilidad configurable por título.
- **Mines** — con escalera de multiplicadores paso a paso y apertura al azar.
- **Crash e instantáneos (7)** — Aviator, Spaceman (cobro del 50%), Balloon y Maverick corren por rondas:
  5 segundos de apuestas, vuelo con gráfico de ejes autoescalados, caída con explosión y vuelta a
  empezar. Más Mines, Plinko con caída física sobre 16 filas de clavijas, y Limbo.
- **Ruleta** — rueda dibujada con el orden real de las 37 casillas, bola que gira en sentido contrario,
  desacelera, rebota y cae en su casilla; paño completo con fichas de 1, 5, 25 y 100 para plenos,
  docenas, columnas y apuestas exteriores, todas a la vez, con deshacer y repetir. La variante Lightning
  sortea sus multiplicadores antes de cada giro y los marca en el paño y en la rueda.
- **Game shows (4)** — Crazy Time, Monopoly Live, Mega Wheel y Candyland sobre una rueda de 50+ casillas
  repartidas sin dos iguales pegadas, con flapper que se dobla al pasar cada casilla. Se puede cubrir
  varios resultados a la vez.
- **Rápidos y originales (6)** — Keno de 40 bolas con tabla calculada por distribución hipergeométrica
  y tope de 5.000×; Dados con objetivo móvil y RTP del 99%; Cara o Cruz de doblar o nada; Hi-Lo con
  multiplicador acumulado; Torres de ocho pisos con tres dificultades; y Raspadita Dorada, donde el
  premio se sortea al comprar el cartón.
- **Mesa y cartas (5)** — Blackjack VIP, First Person Blackjack y Multihand (hasta 3 manos) con
  doblar y dividir hasta cuatro manos, Speed Baccarat con reglas de tercera carta y su camino de
  resultados, y Jacks or Better 9/6.

Cada juego muestra su RTP teórico y una nota explicando de dónde sale la ventaja de la casa. Cerrar la
ventana nunca te cuesta dinero: una partida abierta de Mines, Torres, Hi-Lo o Cara o Cruz se cobra al
valor que tenga en ese momento, las bolas de Plinko que quedan en el aire se liquidan igual y una ronda
de crash en pleno vuelo se anula y devuelve la apuesta.

## Juego responsable

Saldo de bienvenida de S/ 5.000 en fichas demo, límite de depósito diario (S/ 10.000), apuesta máxima
(S/ 2.500), pausas de 15 minutos y 1 hora, recordatorio de sesión cada 30 minutos, rollover 1× antes de
retirar y un trámite de KYC simulado que **no pide ni guarda ningún dato personal**. Las cuentas
guardadas de la versión anterior se migran solas al abrir el sitio.

## Estructura

```
index.html
css/styles.css
js/core.js          utilidades, formato, azar, persistencia
js/ui.js            set de iconos SVG en línea
js/diaria.js        ruleta diaria de recompensas
js/progreso.js      niveles, misiones, logros, torneo, cashback y jackpot
js/virtuales.js     motor y vista de las carreras virtuales
js/odds.js          modelos de probabilidad, margen, cashout
js/wallet.js        saldo, libro mayor, límites, perfilado
js/data-sports.js   catálogo de eventos
js/data-casino.js   catálogo de 31 juegos
js/sportsbook.js    mercados, boleto, liquidación, motor en vivo
js/casino.js        lobby y lanzador
js/games/           base, mines, limbo, aviator, plinko, slot, rueda, ruleta, cartas,
                    keno, extras (dados, moneda, hi-lo, torres, raspadita)
                    (rueda = game shows, ruleta = europea, cartas = blackjack,
                     baccarat y video póker)
js/app.js           navegación, cuenta, modales
tools/build.js      empaquetador a un solo archivo
```
