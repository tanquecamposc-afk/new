# 🕹 ARCADE NEXO

Nueve juegos hechos a mano en **HTML5 + Canvas + JavaScript puro**. Sin dependencias, sin librerías, sin assets externos y sin conexión a internet: todos los gráficos se dibujan por código y todo el sonido se genera en tiempo real con WebAudio.

## ▶ Cómo jugar

Abre `index.html` en cualquier navegador moderno y elige un juego. No necesita servidor ni instalación.

Cada juego tiene su botón **🕹 Arcade** arriba a la izquierda para volver a la portada.

### 📦 Versión de un solo archivo

`arcade.html` es el arcade **entero** (portada y los nueve juegos) empaquetado en un único archivo, sin CSS ni JS externos. Sirve para cuando solo puedes usar una página suelta: mandarlo por correo, subirlo a cualquier sitio o abrirlo desde una memoria USB.

Se genera a partir de los archivos de `juegos/`, que siguen siendo la fuente de verdad:

```bash
node construir-arcade.js
```

Cada juego queda aislado en su propia pantalla: su CSS se prefija con el selector de su contenedor y su JS se envuelve en una función donde `document`, `addEventListener` y `Arcade.bucle` están acotados a esa pantalla, así que ni los IDs ni las teclas se pisan entre juegos. **Si tocas un juego, vuelve a lanzar el script** para regenerar `arcade.html`.

## 🎮 Los juegos

| Juego | Género | De qué va |
|---|---|---|
| 🏰 [NEXO Tower Defense](juegos/nexo-tower-defense.html) | Estrategia | 12 torres mejorables, 3 mapas y 40 oleadas hasta el Coloso del Vacío |
| 👻 [Comecocos](juegos/comecocos.html) | Arcade | El laberinto clásico de 244 cocos, con 4 fantasmas de IA propia |
| 🌻 [Plantas vs Zombis](juegos/plantas-vs-zombies.html) | Defensa | 8 plantas, 5 tipos de zombi y 20 oleadas sobre el césped |
| 💣 [Minas](juegos/minas.html) | Casino | Destapa gemas, esquiva minas y retírate a tiempo (fichas ficticias) |
| 🧩 [Block Blast](juegos/block-blast.html) | Puzle | Encaja piezas en un 8x8 y revienta filas y columnas con combos |
| 🐍 [Serpiente Neón](juegos/serpiente.html) | Arcade | Snake con fruta dorada, rocas y modo fantasma |
| ✈ [Aviator](juegos/aviator.html) | Casino | Juego de tipo *crash*: cobra antes de que el avión se vaya volando |
| 🎱 [8 Ball Pool](juegos/8-ball-pool.html) | Deportes | Billar con física real, efecto y rival controlado por la máquina |
| ⚽ [Rumble Stars](juegos/rumble-stars.html) | Arena | Fútbol de arena: lanza bichos al campo y empuja el balón |

---

### 👻 Comecocos

Laberinto de 28x31 con los **244 cocos** del original y túneles laterales que teletransportan.

- **⚪ Coco** 10 pts · **🔵 Coco de poder** 50 pts y los fantasmas huyen.
- Comerte fantasmas asustados encadena **200 → 400 → 800 → 1600** puntos.
- **🍒 Fruta** bajo la casa de los fantasmas a los 70 y 170 cocos; su valor sube cada nivel.
- **Vida extra** a los 10 000 puntos.
- Cada fantasma persigue distinto: 🔴 va directo a ti, 🩷 apunta 4 casillas por delante,
  🩵 te rodea usando la posición del rojo y 🟠 se acobarda cuando te acercas.
  Alternan fases de **dispersión** y **persecución**.
- **Controles:** flechas / `WASD`, deslizar el dedo en móvil, `Espacio` para pausar.

### 🌻 Plantas vs Zombis

Cinco calles, nueve casillas y 20 oleadas. Los **☀️ soles** caen del cielo o los producen los girasoles: haz clic para recogerlos.

| Planta | Coste | Qué hace |
|---|---|---|
| 🌻 Girasol | 50 | Produce 25 soles cada 12 s |
| 🌱 Lanza guisantes | 100 | Dispara sin parar |
| 🧱 Nuez | 50 | Muro con muchísima vida |
| 🥔 Patamina | 25 | Se arma en 12 s y explota al contacto |
| ❄️ Hielo guisante | 175 | Dispara y congela |
| 🌿 Repetidora | 200 | Dos guisantes por disparo |
| 🍒 Cereza bomba | 150 | Explosión enorme en 3x3 |
| 🌶️ Jalapeño | 125 | Quema la fila entera |

Zombis: **normal**, **con cono**, **con cubo**, **corredor** y el **GARGANTÚA** de las oleadas 10 y 20.
Cada fila tiene un **cortacésped** que la arrasa entera… pero solo una vez. Teclas `1`-`8` para elegir planta, **🔨 Pala** para quitarlas.

### 💣 Minas

Versión arcade de las minas de los casinos, **con fichas ficticias**: no hay dinero real ni forma de depositar o retirar nada. Comparte cartera con el Aviator.

- Eliges apuesta y número de minas (1 a 24) en una cuadrícula de 25 casillas.
- Cada 💎 sube el multiplicador; una 💣 y pierdes la apuesta.
- El multiplicador se calcula con la probabilidad real de la jugada: `0,99 × C(25,k) / C(25−minas,k)`, es decir, un 1 % de ventaja de la casa.
- Puedes **retirarte** cuando quieras. El panel te enseña siempre cuánto pagaría la siguiente casilla y con qué probabilidad.
- Si te quedas sin fichas, el botón **🎁 Fichas gratis** te da 500 más.

### 🧩 Block Blast

Tablero de 8x8 y tres piezas que **no rotan**. Arrastra cada una a su sitio; al completar una fila o una columna, estalla.

- Varias líneas a la vez multiplican los puntos (1 → 100, 2 → 300, 3 → 600, 4 → 1000…).
- Jugadas seguidas que revientan líneas suben el **combo**, que suma un 50 % extra por nivel.
- Las tres piezas se reponen solo cuando has usado las tres.
- La partida acaba cuando ninguna pieza cabe ya en el tablero.

### 🐍 Serpiente Neón

- **🍎 Manzana:** creces y aceleras un poco.
- **🍋 Fruta dorada:** aparece unos segundos cada 7 manzanas y vale 75 puntos.
- **👻 Fantasma:** 7 segundos atravesando paredes y tu propio cuerpo.
- **🪨 Rocas:** aparece una nueva cada 5 manzanas.
- **Controles:** flechas / `WASD`, deslizar el dedo en móvil, `Espacio` para pausar.

### ✈ Aviator

Juego de tipo *crash*, también con **fichas ficticias**.

- El avión despega y el multiplicador sube sin parar; en cualquier momento se va volando.
- Puedes **retirarte** cuando quieras: el cobro es inmediato al multiplicador que se vea en pantalla.
- El punto de caída sale de la distribución habitual de estos juegos, `P(caída > x) = 0,99 / x`: la mitad de las rondas se quedan por debajo de 2x, una de cada diez pasa de 10x y un 1 % se estrella nada más despegar.
- **Apuesta automática** para repetir la jugada cada ronda y **retiro automático** para cobrar solo al llegar a tu multiplicador.
- La franja de arriba guarda el historial de las últimas rondas.

### 🎱 8 Ball Pool

Billar contra la máquina con un motor de física propio: subpasos fijos a 300 Hz, rozamiento con el paño, rebote con pérdida en las bandas y transferencia de energía entre bolas.

- **Apuntar:** mueve el ratón o el dedo. Verás la línea de tiro, la **bola fantasma** en el punto de contacto, hacia dónde saldrá la bola objeto y hacia dónde se irá la blanca.
- **Tirar:** mantén pulsado y arrastra hacia atrás; el taco se echa para atrás según la fuerza.
- **Efecto:** arrastra el punto sobre la bola blanca del panel. Arriba corre, abajo retrocede y a los lados aplica efecto lateral, que curva la bola y cambia el rebote en banda.
- **Reglas de 8-ball:** grupos asignados con la primera bola legal, faltas con bola en mano para el rival y la 8 al final. Meterla antes de tiempo, o junto con la blanca, es perder.

### ⚽ Rumble Stars

Fútbol de arena a 90 segundos con seis bichos, cada uno con su masa, su velocidad y su manera de jugar.

| Bicho | Coste | Qué hace |
|---|---|---|
| 🐆 Guepardo | 3 | El más rápido del campo |
| 🦁 León | 4 | Chuta durísimo |
| 🦏 Rinoceronte | 4 | Embiste en línea recta sin corregir |
| 🐘 Elefante | 5 | Pesa tanto que aparta a todos |
| 🐧 Pingüino | 2 | Resbala sin frenar |
| 🐢 Tortuga | 3 | Se queda defendiendo tu portería |

Elige uno del banquillo y **arrastra en tu mitad** hacia donde quieres lanzarlo: cuanto más largo el arrastre, más fuerte entra. La energía se rellena sola y los bichos se cansan y abandonan el campo al cabo de unos segundos.

## 💾 Récords

Cada juego guarda su récord en el `localStorage` de tu navegador, así que son tuyos y no salen de tu equipo. Desde la portada puedes borrarlos todos con **🗑 Borrar todos mis récords**.

## 🗂 Estructura

```
index.html                      portada del arcade
arcade.html                     todo el arcade en un solo archivo (generado)
construir-arcade.js             genera arcade.html a partir de juegos/
juegos/
  arcade.css                    estilos compartidos
  arcade.js                     audio WebAudio, récords y utilidades
  nexo-tower-defense.html       (autocontenido)
  comecocos.html
  plantas-vs-zombies.html
  minas.html
  block-blast.html
  serpiente.html
  aviator.html
  8-ball-pool.html
  rumble-stars.html
```

## 🖥 Rendimiento y nitidez

Todos los juegos ajustan el búfer del canvas a la densidad de píxeles de la pantalla (`Arcade.nitido`), así que en pantallas Retina o 4K se ven nítidos en vez de escalados. Los fondos que no cambian —el laberinto del comecocos, el paño del billar, el campo de Rumble Stars y el mapa del tower defense— se dibujan una sola vez en un lienzo aparte y se reutilizan en cada cuadro.
