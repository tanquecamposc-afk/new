# Guion del video · KRONOS BET

Recorrido guiado de tres minutos y medio. Abre con una portada de siete segundos y cierra
con otra. Los tiempos son una guía: el video tiene los rótulos
quemados en pantalla, así que si grabas voz encima puedes ajustar el ritmo a tu gusto.

---

### 0:03 — Apertura

> Esto es Kronos Bet. Por fuera parece una casa de apuestas cualquiera; por dentro es un simulador
> hecho para enseñar exactamente cómo funciona una. Las fichas no valen nada y no hay pagos de ningún
> tipo: lo único real acá es la matemática.

### 0:10 — El libro deportivo

> Arranquemos por lo deportivo. Hay 231 partidos repartidos en 51 competiciones: la Liga 1, el
> Brasileirão, la Champions, seis torneos de tenis, NBA, eSports, vóley. Ninguno está escrito a mano.
> Cada liga tiene su plantel con un rating por equipo, y de ahí salen los emparejamientos y los
> números que come el motor.

### 0:17 — En vivo

> Los partidos se juegan solos, con el reloj corriendo a treinta veces la velocidad real. Cuando cae
> un gol, el mercado se suspende unos segundos, el modelo se recalcula con el marcador nuevo y las
> cuotas reaparecen movidas. Esas flechitas verdes y rojas son eso.

### 0:24 — De la probabilidad a la cuota

> Cada cuota sale de un modelo de verdad. Para fútbol, una Poisson con los goles esperados de cada
> equipo: se arma la matriz de todos los marcadores posibles y de ahí sale la probabilidad de cada
> mercado. Básquet usa una normal sobre el margen y el total; tenis, un modelo de sets.

### 0:30 — El margen de la casa

> Cuando tocas una cuota, el boleto no solo te dice cuánto cobras. Te dice la probabilidad implícita
> —uno dividido la cuota— y el margen que se está llevando la casa en ese mercado.

### 0:37 — Overround

> Y ahí está el truco de todo el negocio: la suma de las probabilidades de un mercado siempre pasa
> del cien por ciento. Un partido parejo se paga 1.90 y 1.90 en vez de 2.00 y 2.00. Ese cinco por
> ciento extra es la ganancia garantizada, gane quien gane.

### 0:44 — El retardo de aceptación

> Fíjate en esto: al apostar en vivo, la apuesta tarda entre tres y ocho segundos en aceptarse. No es
> que vaya lenta. Es el freno contra el courtsiding, que es apostar desde el estadio con información
> que todavía no llegó a la transmisión. Y si en ese lapso cae un gol, la apuesta se rechaza.

### 0:53 — Cashout

> El cashout tampoco es lo que parece. No cancela nada: es vender tu apuesta al precio que tiene el
> mercado en ese momento, menos una comisión del cinco por ciento. La fórmula está escrita en la
> sección de matemática.

### 1:01 — La ficha del partido

> Cada partido se abre con su marcador, sus estadísticas y una gráfica de cómo se movió la cuota desde
> que arrancó.

### 1:10 — Mercados

> Hasta siete mercados por partido. Y algo que casi ninguna demo hace: cuando un resultado ya está
> decidido, el mercado se cierra en vez de ofrecerte una cuota absurda.

### 1:17 — El casino

> Del otro lado está el casino: cuarenta juegos, todos jugables, todos sobre motores propios. Y todos
> con su matemática a la vista.

### 1:25 — Mines

> Mines, por ejemplo. El multiplicador no está inventado: es el pago justo según cuántas casillas
> abriste, multiplicado por 0.97. Ese tres por ciento que falta es la casa. Está escrito debajo del
> tablero, con la fórmula.

### 1:34 — La ruleta

> La ruleta tiene el orden real de las 37 casillas, y la bola gira en sentido contrario al plato,
> desacelera, rebota y cae donde tiene que caer.

### 1:39 — El cero

> Hay 37 casillas, pero el rojo paga como si hubiera 36. Ganas 18 veces de cada 37 y cobras el doble:
> 97.3 por ciento de retorno. Ese 2.7 que falta es toda la ventaja de la casa, y sale entero del cero.

### 1:50 — Aviator

> En el crash, el punto de caída se sortea antes de que el avión despegue. El número que ves subir es
> la animación de algo que ya estaba decidido. Aguantar más no empuja nada, y ninguna racha anterior
> cambia la siguiente.

### 2:03 — Carreras virtuales

> Los virtuales son el caso extremo. Una carrera cada minuto, el resultado sorteado antes de la
> animación, y un margen del catorce por ciento: casi el triple que en fútbol.

### 2:12 — Por qué existen

> No existen para que veas una carrera. Existen para que no tengas que esperar a que se juegue un
> partido.

### 2:19 — Recompensas

> Y después está toda la capa de enganche: niveles, misiones diarias, torneo semanal, cashback,
> jackpot progresivo y dieciocho logros.

### 2:27 — La letra chica

> Con una diferencia. Acá cada mecánica dice para qué sirve de verdad: la racha existe porque cortarla
> duele más que el premio, el nivel sube aunque estés perdiendo, el jackpot hace que cada giro parezca
> el bueno. Ninguna de esas cosas cambia el retorno.

### 2:36 — Cómo funciona

> Hay una sección entera dedicada a la matemática: el margen, la gestión de riesgo del libro, la
> latencia de los datos en vivo, la fórmula del cashout y el RTP de cada juego.

### 2:44 — Todo a la vista

> Ninguna casa real te explica esto. Acá está escrito al lado de cada juego.

### 2:51 — Cierre

> Kronos Bet no acepta dinero, no procesa pagos y no está afiliado a ninguna casa de apuestas. Si
> alguna vez juegas de verdad: hazlo siendo mayor de edad, con un límite puesto antes de empezar, y
> sabiendo que el retorno siempre es menor que cien. Está hecho en HTML, CSS y JavaScript, sin una
> sola dependencia.

---

## Notas para grabar

- El video sale en **WebM** (así lo graba el navegador). Se ve en cualquier navegador y en Android;
  para editarlo en CapCut o Premiere conviene convertirlo antes a MP4.
- Para regrabarlo con otros textos o más lento: `node video/tour.js` desde la carpeta `apuestas/`.
  Los rótulos y los tiempos están en ese archivo, en la lista de bloques.
- La primera vez, `tour.js` deja las tipografías en `video/.fuentes/` con `node video/fuentes.js`.
  Sin ese caché el navegador tarda unos doce segundos en resolver Google Fonts y esa espera se
  colaba al principio de la grabación.
