# KRONOS BET — simulador de casa de apuestas y casino

Sitio completo de apuestas deportivas con zona de casino, hecho en **HTML, CSS y JavaScript puro**,
sin dependencias ni backend. Todo el estado (saldo, apuestas, historial) vive en `localStorage`.

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
| En vivo | Reloj a 30×, goles y canastas simulados, suspensión de mercado al caer un gol y recálculo del modelo |
| Bet delay | 3 a 8 segundos de validación en las apuestas en vivo; si el mercado se suspende en ese lapso, la apuesta se rechaza |
| Boleto | Simples y combinadas, aviso de cambio de cuota, retorno potencial y margen visible |
| Cashout | `Apuesta × Cuota bloqueada / Cuota actual × (1 − 5%)`, solo con el partido en curso |
| Liquidación | Resolución automática por mercado, incluidas devoluciones por push |
| Perfilado | Mide el CLV contra la línea de cierre y recorta el límite si detecta un jugador *sharp* |

Deportes: fútbol, básquet, tenis, eSports y vóley. 29 eventos entre prepartido y en vivo, con hasta
7 mercados por partido.

## Casino — 31 juegos, 10 motores

- **Tragamonedas (12)** — cuadrícula 6×5 tipo *pay anywhere*. La tabla de pagos se **calcula al abrir el
  juego** repartiendo el RTP declarado entre los símbolos según la probabilidad de que cada uno aparezca
  8 o más veces. Volatilidad configurable por título.
- **Crash e instantáneos (7)** — Aviator, Spaceman (cobro del 50%), Balloon, Maverick, Mines, Plinko y Limbo.
- **En vivo y game shows (8)** — Crazy Time, Monopoly Live, Mega Wheel y Candyland sobre un motor de rueda
  con pagos derivados de la frecuencia real de cada casilla; Lightning Roulette y Mega Fire Blaze con
  multiplicadores; Blackjack VIP y Speed Baccarat.
- **Mesa RNG y video póker (4)** — First Person Roulette y Blackjack, Multihand Blackjack (hasta 3 manos)
  y Jacks or Better 9/6.

Cada juego muestra su RTP teórico y una nota explicando de dónde sale la ventaja de la casa.

## Juego responsable

Límite de depósito diario, apuesta máxima, pausas de 15 minutos y 1 hora, recordatorio de sesión cada
30 minutos, rollover 1× antes de retirar y un trámite de KYC simulado que **no pide ni guarda ningún
dato personal**.

## Estructura

```
index.html
css/styles.css
js/core.js          utilidades, formato, azar, persistencia
js/odds.js          modelos de probabilidad, margen, cashout
js/wallet.js        saldo, libro mayor, límites, perfilado
js/data-sports.js   catálogo de eventos
js/data-casino.js   catálogo de 31 juegos
js/sportsbook.js    mercados, boleto, liquidación, motor en vivo
js/casino.js        lobby y lanzador
js/games/           base, mines, limbo, aviator, plinko, slot, rueda, ruleta, cartas
js/app.js           navegación, cuenta, modales
tools/build.js      empaquetador a un solo archivo
```
