# 🕹 ARCADE NEXO

Seis juegos hechos a mano en **HTML5 + Canvas + JavaScript puro**. Sin dependencias, sin librerías, sin assets externos y sin conexión a internet: todos los gráficos se dibujan por código y todo el sonido se genera en tiempo real con WebAudio.

## ▶ Cómo jugar

Abre `index.html` en cualquier navegador moderno y elige un juego. No necesita servidor ni instalación.

Cada juego tiene su botón **🕹 Arcade** arriba a la izquierda para volver a la portada.

### 📦 Versión de un solo archivo

`arcade.html` es el arcade **entero** (portada y los seis juegos) empaquetado en un único archivo, sin CSS ni JS externos. Sirve para cuando solo puedes usar una página suelta: mandarlo por correo, subirlo a cualquier sitio o abrirlo desde una memoria USB.

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

Versión arcade de las minas de los casinos, **con fichas ficticias**: no hay dinero real ni forma de depositar o retirar nada.

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
```
